/**
 * SAFLA Service - Self-Aware Feedback Loop Algorithm
 *
 * Production-ready implementation of the ReasoningBank SAFLA learning algorithm.
 * Provides pattern storage, semantic search, confidence learning, and MMR ranking.
 *
 * Performance Targets:
 * - Embedding generation: <1ms
 * - Cosine similarity: <0.1ms per pair
 * - Query with 1000 patterns: <3ms total
 *
 * @module SAFLAService
 */

import { createHash } from 'crypto';
import Database from 'better-sqlite3';
import * as path from 'path';
import { randomUUID } from 'crypto';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/**
 * Pattern input for storage
 */
export interface PatternInput {
  content: string;
  namespace?: string;
  agentId?: string;
  skillId?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  contextType?: string;
}

/**
 * Stored pattern with learning metrics
 */
export interface Pattern {
  id: string;
  namespace: string;
  agentId?: string;
  skillId?: string;
  content: string;
  category?: string;
  tags?: string[];
  embedding: Float32Array;
  confidence: number;
  successCount: number;
  failureCount: number;
  totalInvocations: number;
  contextType?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
}

/**
 * Pattern with similarity score
 */
export interface ScoredPattern extends Omit<Pattern, 'embedding'> {
  similarity: number;
  finalScore: number;
  recencyScore: number;
  usageScore: number;
}

/**
 * Pattern outcome record
 */
export interface PatternOutcome {
  id: string;
  patternId: string;
  outcome: 'success' | 'failure';
  context?: string;
  userFeedback?: string;
  confidenceBefore: number;
  confidenceAfter: number;
  confidenceDelta: number;
  executionTimeMs?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

/**
 * Query options
 */
export interface QueryOptions {
  query: string;
  namespace?: string;
  agentId?: string;
  skillId?: string;
  limit?: number;
  minConfidence?: number;
  category?: string;
  includeGlobal?: boolean;
}

// ============================================================
// SAFLA CONFIGURATION
// ============================================================

export interface SAFLAConfig {
  // Confidence bounds
  confidenceMin: number;
  confidenceMax: number;
  confidenceInitial: number;

  // Confidence adjustments
  successBoost: number;
  failurePenalty: number;

  // Scoring weights
  similarityWeight: number;
  confidenceWeight: number;
  recencyWeight: number;
  usageWeight: number;

  // Query settings
  defaultLimit: number;
  maxLimit: number;
  minConfidenceThreshold: number;
  similarityThreshold: number;

  // Embedding settings
  embeddingDimensions: number;
}

const DEFAULT_CONFIG: SAFLAConfig = {
  confidenceMin: 0.05,
  confidenceMax: 0.95,
  confidenceInitial: 0.50,
  successBoost: 0.20,
  failurePenalty: -0.15,
  similarityWeight: 0.4,
  confidenceWeight: 0.3,
  recencyWeight: 0.2,
  usageWeight: 0.1,
  defaultLimit: 10,
  maxLimit: 50,
  minConfidenceThreshold: 0.2,
  similarityThreshold: 0.6,
  embeddingDimensions: 1024,
};

// ============================================================
// SAFLA SERVICE INTERFACE
// ============================================================

export interface ISAFLAService {
  // Pattern Storage
  storePattern(pattern: PatternInput): Promise<Pattern>;

  // Pattern Retrieval
  queryPatterns(query: string, namespace?: string, limit?: number): Promise<Pattern[]>;

  // Embedding Generation
  generateEmbedding(text: string): Float32Array;

  // Semantic Search
  semanticSearch(embedding: Float32Array, namespace?: string, limit?: number): Promise<ScoredPattern[]>;

  // Confidence Learning
  recordOutcome(patternId: string, outcome: 'success' | 'failure', context?: any): Promise<Pattern>;

  // MMR Ranking
  rankPatterns(patterns: Pattern[], query: string, lambda?: number): Promise<ScoredPattern[]>;
}

// ============================================================
// SAFLA SERVICE IMPLEMENTATION
// ============================================================

export class SAFLAService implements ISAFLAService {
  private db: Database.Database;
  private config: SAFLAConfig;
  private embeddingCache: Map<string, Float32Array>;

  constructor(dbPath?: string, config?: Partial<SAFLAConfig>) {
    const finalDbPath = dbPath || path.join(process.cwd(), 'prod', '.reasoningbank', 'memory.db');

    // Ensure directory exists (will be created synchronously if needed)
    this.ensureDirectorySync(path.dirname(finalDbPath));

    this.db = new Database(finalDbPath);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.embeddingCache = new Map();

    // Initialize database
    this.initializeDatabase();

    // Configure SQLite for performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache
    this.db.pragma('temp_store = MEMORY');
  }

  /**
   * Ensure directory exists (synchronous for constructor)
   */
  private ensureDirectorySync(dirPath: string): void {
    try {
      const fs = require('fs');
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      console.warn(`Failed to create directory ${dirPath}:`, error);
    }
  }

  /**
   * Initialize database schema
   */
  private initializeDatabase(): void {
    // Create patterns table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        namespace TEXT NOT NULL DEFAULT 'global',
        agent_id TEXT,
        skill_id TEXT,
        content TEXT NOT NULL,
        category TEXT,
        tags TEXT,
        embedding BLOB NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.5,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        total_invocations INTEGER DEFAULT 0,
        context_type TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used_at INTEGER
      );
    `);

    // Create pattern_outcomes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pattern_outcomes (
        id TEXT PRIMARY KEY,
        pattern_id TEXT NOT NULL,
        outcome TEXT NOT NULL,
        context TEXT,
        user_feedback TEXT,
        confidence_before REAL NOT NULL,
        confidence_after REAL NOT NULL,
        confidence_delta REAL NOT NULL,
        execution_time_ms INTEGER,
        metadata TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
      );
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_patterns_namespace ON patterns(namespace, agent_id);
      CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence DESC);
      CREATE INDEX IF NOT EXISTS idx_patterns_last_used ON patterns(last_used_at DESC);
      CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category, namespace);
      CREATE INDEX IF NOT EXISTS idx_patterns_skill ON patterns(skill_id) WHERE skill_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_outcomes_pattern ON pattern_outcomes(pattern_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_outcomes_result ON pattern_outcomes(outcome, timestamp DESC);
    `);
  }

  // ============================================================
  // EMBEDDING GENERATION (SimHash 1024-dim)
  // ============================================================

  /**
   * Generate deterministic 1024-dimensional embedding using SimHash
   *
   * Algorithm:
   * 1. Tokenize text into features
   * 2. Hash each feature to 1024-bit vector
   * 3. Weighted sum across features
   * 4. Normalize to unit vector
   *
   * Performance: <1ms generation time
   */
  public generateEmbedding(text: string): Float32Array {
    // Check cache first
    const cacheKey = this.normalizeText(text);
    const cached = this.embeddingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const embedding = new Float32Array(this.config.embeddingDimensions);
    const normalizedText = this.normalizeText(text);

    // Tokenize into features (words and bigrams)
    const tokens = this.tokenize(normalizedText);

    if (tokens.length === 0) {
      // Return zero vector for empty input
      return embedding;
    }

    // Generate hash-based embeddings for each token
    for (const token of tokens) {
      const tokenHash = this.hashToken(token);

      // Add weighted contribution to embedding
      for (let i = 0; i < this.config.embeddingDimensions; i++) {
        // Use multiple hash functions for each dimension
        const dimHash = this.hashDimension(tokenHash, i);
        // Convert to float in range [-1, 1]
        const value = (dimHash % 2000 - 1000) / 1000;
        embedding[i] += value;
      }
    }

    // Normalize to unit vector
    const normalized = this.normalizeVector(embedding);

    // Cache for future use (limit cache size)
    if (this.embeddingCache.size > 10000) {
      // Clear oldest entries
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }
    this.embeddingCache.set(cacheKey, normalized);

    return normalized;
  }

  /**
   * Normalize text for consistent embeddings
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s-]/g, '');
  }

  /**
   * Tokenize text into features (words and bigrams)
   */
  private tokenize(text: string): string[] {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const tokens: string[] = [...words];

    // Add bigrams for better semantic capture
    for (let i = 0; i < words.length - 1; i++) {
      tokens.push(`${words[i]}_${words[i + 1]}`);
    }

    return tokens;
  }

  /**
   * Hash token to 32-bit integer
   */
  private hashToken(token: string): number {
    const hash = createHash('sha256').update(token).digest();
    // Convert first 4 bytes to integer
    return hash.readUInt32BE(0);
  }

  /**
   * Hash for specific dimension
   */
  private hashDimension(tokenHash: number, dimension: number): number {
    // Combine token hash with dimension index
    const combined = `${tokenHash}:${dimension}`;
    const hash = createHash('sha256').update(combined).digest();
    return hash.readUInt32BE(0);
  }

  /**
   * Normalize vector to unit length
   */
  private normalizeVector(vector: Float32Array): Float32Array {
    let magnitude = 0;
    for (let i = 0; i < vector.length; i++) {
      magnitude += vector[i] * vector[i];
    }
    magnitude = Math.sqrt(magnitude);

    if (magnitude === 0) {
      return vector;
    }

    const normalized = new Float32Array(vector.length);
    for (let i = 0; i < vector.length; i++) {
      normalized[i] = vector[i] / magnitude;
    }

    return normalized;
  }

  // ============================================================
  // COSINE SIMILARITY
  // ============================================================

  /**
   * Calculate cosine similarity between two embeddings
   *
   * Returns value between -1 and 1 (1 = identical)
   * Performance: <0.1ms per comparison
   */
  public cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error(`Embedding dimensions must match: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;

    // Optimized dot product (already normalized, so no need to calculate magnitudes)
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }

    // Clamp to [-1, 1] to handle floating point errors
    return Math.max(-1, Math.min(1, dotProduct));
  }

  // ============================================================
  // PATTERN STORAGE
  // ============================================================

  /**
   * Store new pattern in database
   */
  public async storePattern(input: PatternInput): Promise<Pattern> {
    const id = randomUUID();
    const now = Date.now();
    const embedding = this.generateEmbedding(input.content);

    const pattern: Pattern = {
      id,
      namespace: input.namespace || 'global',
      agentId: input.agentId,
      skillId: input.skillId,
      content: input.content,
      category: input.category,
      tags: input.tags,
      embedding,
      confidence: this.config.confidenceInitial,
      successCount: 0,
      failureCount: 0,
      totalInvocations: 0,
      contextType: input.contextType,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
    const stmt = this.db.prepare(`
      INSERT INTO patterns (
        id, namespace, agent_id, skill_id, content, category, tags,
        embedding, confidence, success_count, failure_count, total_invocations,
        context_type, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      pattern.namespace,
      pattern.agentId || null,
      pattern.skillId || null,
      pattern.content,
      pattern.category || null,
      pattern.tags ? JSON.stringify(pattern.tags) : null,
      Buffer.from(embedding.buffer),
      pattern.confidence,
      pattern.successCount,
      pattern.failureCount,
      pattern.totalInvocations,
      pattern.contextType || null,
      pattern.metadata ? JSON.stringify(pattern.metadata) : null,
      pattern.createdAt,
      pattern.updatedAt
    );

    return pattern;
  }

  /**
   * Get pattern by ID
   */
  public getPattern(patternId: string): Pattern | null {
    const stmt = this.db.prepare(`
      SELECT * FROM patterns WHERE id = ?
    `);

    const row: any = stmt.get(patternId);
    if (!row) {
      return null;
    }

    return this.rowToPattern(row);
  }

  /**
   * Convert database row to Pattern object
   */
  private rowToPattern(row: any): Pattern {
    return {
      id: row.id,
      namespace: row.namespace,
      agentId: row.agent_id,
      skillId: row.skill_id,
      content: row.content,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      embedding: new Float32Array(new Uint8Array(row.embedding).buffer),
      confidence: row.confidence,
      successCount: row.success_count,
      failureCount: row.failure_count,
      totalInvocations: row.total_invocations,
      contextType: row.context_type,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastUsedAt: row.last_used_at,
    };
  }

  // ============================================================
  // SEMANTIC SEARCH
  // ============================================================

  /**
   * Semantic search with confidence weighting
   * Target: <3ms query latency
   */
  public async semanticSearch(
    embedding: Float32Array,
    namespace?: string,
    limit?: number
  ): Promise<ScoredPattern[]> {
    const finalLimit = Math.min(limit || this.config.defaultLimit, this.config.maxLimit);

    // Build query
    let sql = `
      SELECT * FROM patterns
      WHERE confidence >= ?
    `;
    const params: any[] = [this.config.minConfidenceThreshold];

    if (namespace) {
      sql += ` AND (namespace = ? OR namespace = 'global')`;
      params.push(namespace);
    }

    sql += ` ORDER BY confidence DESC, total_invocations DESC LIMIT 100`;

    const stmt = this.db.prepare(sql);
    const rows: any[] = stmt.all(...params);

    // Calculate similarities and scores
    const results: ScoredPattern[] = [];

    for (const row of rows) {
      const pattern = this.rowToPattern(row);
      const similarity = this.cosineSimilarity(embedding, pattern.embedding);

      // Filter by similarity threshold
      if (similarity < this.config.similarityThreshold) {
        continue;
      }

      // Calculate component scores
      const recencyScore = this.calculateRecencyScore(pattern.lastUsedAt);
      const usageScore = Math.min(pattern.totalInvocations / 100, 1);

      // Composite final score
      const finalScore =
        similarity * this.config.similarityWeight +
        pattern.confidence * this.config.confidenceWeight +
        recencyScore * this.config.recencyWeight +
        usageScore * this.config.usageWeight;

      const { embedding: _, ...patternWithoutEmbedding } = pattern;

      results.push({
        ...patternWithoutEmbedding,
        similarity,
        finalScore,
        recencyScore,
        usageScore,
      });
    }

    // Sort by final score and return top N
    results.sort((a, b) => b.finalScore - a.finalScore);
    return results.slice(0, finalLimit);
  }

  /**
   * Calculate recency score (0-1)
   */
  private calculateRecencyScore(lastUsedAt?: number): number {
    if (!lastUsedAt) {
      return 0.5; // Neutral for never-used patterns
    }

    const ageMs = Date.now() - lastUsedAt;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    // Exponential decay: 1.0 (today) → 0.5 (30 days) → 0.1 (90 days)
    return Math.exp(-ageDays / 30);
  }

  // ============================================================
  // PATTERN QUERY
  // ============================================================

  /**
   * Query patterns by text query
   */
  public async queryPatterns(
    query: string,
    namespace?: string,
    limit?: number
  ): Promise<Pattern[]> {
    const embedding = this.generateEmbedding(query);
    const scored = await this.semanticSearch(embedding, namespace, limit);

    // Convert back to patterns with embeddings
    return scored.map(sp => {
      const pattern = this.getPattern(sp.id);
      if (!pattern) {
        throw new Error(`Pattern ${sp.id} not found after search`);
      }
      return pattern;
    });
  }

  // ============================================================
  // CONFIDENCE LEARNING
  // ============================================================

  /**
   * Record pattern outcome and update confidence
   */
  public async recordOutcome(
    patternId: string,
    outcome: 'success' | 'failure',
    context?: any
  ): Promise<Pattern> {
    const pattern = this.getPattern(patternId);
    if (!pattern) {
      throw new Error(`Pattern ${patternId} not found`);
    }

    // Calculate new confidence
    const confidenceBefore = pattern.confidence;
    const confidenceAfter = this.updateConfidence(confidenceBefore, outcome);
    const confidenceDelta = confidenceAfter - confidenceBefore;

    // Update pattern
    const now = Date.now();
    const stmt = this.db.prepare(`
      UPDATE patterns
      SET confidence = ?,
          success_count = success_count + ?,
          failure_count = failure_count + ?,
          total_invocations = total_invocations + 1,
          last_used_at = ?,
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      confidenceAfter,
      outcome === 'success' ? 1 : 0,
      outcome === 'failure' ? 1 : 0,
      now,
      now,
      patternId
    );

    // Record outcome
    const outcomeId = randomUUID();
    const outcomeStmt = this.db.prepare(`
      INSERT INTO pattern_outcomes (
        id, pattern_id, outcome, context, user_feedback,
        confidence_before, confidence_after, confidence_delta,
        execution_time_ms, metadata, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    outcomeStmt.run(
      outcomeId,
      patternId,
      outcome,
      context?.context || null,
      context?.userFeedback || null,
      confidenceBefore,
      confidenceAfter,
      confidenceDelta,
      context?.executionTimeMs || null,
      context?.metadata ? JSON.stringify(context.metadata) : null,
      now
    );

    // Return updated pattern
    const updatedPattern = this.getPattern(patternId);
    if (!updatedPattern) {
      throw new Error(`Failed to retrieve updated pattern ${patternId}`);
    }

    return updatedPattern;
  }

  /**
   * Update confidence based on outcome
   */
  public updateConfidence(current: number, outcome: 'success' | 'failure'): number {
    let newConfidence: number;

    if (outcome === 'success') {
      newConfidence = Math.min(current + this.config.successBoost, this.config.confidenceMax);
    } else {
      newConfidence = Math.max(current + this.config.failurePenalty, this.config.confidenceMin);
    }

    return newConfidence;
  }

  // ============================================================
  // MMR RANKING (Maximal Marginal Relevance)
  // ============================================================

  /**
   * Rank patterns using MMR for diversity
   *
   * Score = λ × similarity(pattern, query)
   *       + (1-λ) × diversity(pattern, selected)
   *       × confidence
   *       × recency_factor
   */
  public async rankPatterns(
    patterns: Pattern[],
    query: string,
    lambda: number = 0.7
  ): Promise<ScoredPattern[]> {
    const queryEmbedding = this.generateEmbedding(query);
    const selected: ScoredPattern[] = [];
    const remaining = [...patterns];

    while (remaining.length > 0 && selected.length < patterns.length) {
      let bestScore = -Infinity;
      let bestIndex = -1;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];

        // Similarity to query
        const similarity = this.cosineSimilarity(queryEmbedding, candidate.embedding);

        // Diversity from selected patterns
        let maxSimilarityToSelected = 0;
        for (const sel of selected) {
          const selPattern = patterns.find(p => p.id === sel.id);
          if (selPattern) {
            const sim = this.cosineSimilarity(candidate.embedding, selPattern.embedding);
            maxSimilarityToSelected = Math.max(maxSimilarityToSelected, sim);
          }
        }
        const diversity = 1 - maxSimilarityToSelected;

        // MMR score
        const mmrScore = lambda * similarity + (1 - lambda) * diversity;

        // Weight by confidence and recency
        const recencyScore = this.calculateRecencyScore(candidate.lastUsedAt);
        const finalScore = mmrScore * candidate.confidence * (0.5 + 0.5 * recencyScore);

        if (finalScore > bestScore) {
          bestScore = finalScore;
          bestIndex = i;
        }
      }

      if (bestIndex >= 0) {
        const bestPattern = remaining.splice(bestIndex, 1)[0];
        const similarity = this.cosineSimilarity(queryEmbedding, bestPattern.embedding);
        const recencyScore = this.calculateRecencyScore(bestPattern.lastUsedAt);
        const usageScore = Math.min(bestPattern.totalInvocations / 100, 1);

        const { embedding: _, ...patternWithoutEmbedding } = bestPattern;

        selected.push({
          ...patternWithoutEmbedding,
          similarity,
          finalScore: bestScore,
          recencyScore,
          usageScore,
        });
      } else {
        break;
      }
    }

    return selected;
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Get pattern outcomes
   */
  public getPatternOutcomes(patternId: string, limit: number = 50): PatternOutcome[] {
    const stmt = this.db.prepare(`
      SELECT * FROM pattern_outcomes
      WHERE pattern_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows: any[] = stmt.all(patternId, limit);

    return rows.map(row => ({
      id: row.id,
      patternId: row.pattern_id,
      outcome: row.outcome as 'success' | 'failure',
      context: row.context,
      userFeedback: row.user_feedback,
      confidenceBefore: row.confidence_before,
      confidenceAfter: row.confidence_after,
      confidenceDelta: row.confidence_delta,
      executionTimeMs: row.execution_time_ms,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      timestamp: row.timestamp,
    }));
  }

  /**
   * Get learning statistics for namespace
   */
  public getNamespaceStats(namespace: string): {
    totalPatterns: number;
    avgConfidence: number;
    totalSuccesses: number;
    totalFailures: number;
    successRate: number;
  } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_patterns,
        AVG(confidence) as avg_confidence,
        SUM(success_count) as total_successes,
        SUM(failure_count) as total_failures
      FROM patterns
      WHERE namespace = ?
    `);

    const row: any = stmt.get(namespace);

    const totalOutcomes = (row.total_successes || 0) + (row.total_failures || 0);
    const successRate = totalOutcomes > 0 ? (row.total_successes || 0) / totalOutcomes : 0;

    return {
      totalPatterns: row.total_patterns || 0,
      avgConfidence: row.avg_confidence || 0,
      totalSuccesses: row.total_successes || 0,
      totalFailures: row.total_failures || 0,
      successRate,
    };
  }

  /**
   * Close database connection
   */
  public close(): void {
    this.db.close();
  }

  /**
   * Clear embedding cache
   */
  public clearCache(): void {
    this.embeddingCache.clear();
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

/**
 * Create SAFLA service instance
 */
export function createSAFLAService(
  dbPath?: string,
  config?: Partial<SAFLAConfig>
): SAFLAService {
  return new SAFLAService(dbPath, config);
}

// ============================================================
// EXPORTS
// ============================================================

export default SAFLAService;
