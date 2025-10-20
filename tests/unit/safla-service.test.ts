/**
 * SAFLA Service Unit Tests
 *
 * Comprehensive test suite for the Self-Aware Feedback Loop Algorithm
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SAFLAService, PatternInput, Pattern } from '../../api-server/services/safla-service';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync } from 'fs';

describe('SAFLAService', () => {
  let service: SAFLAService;
  let testDbPath: string;

  beforeEach(() => {
    // Create temporary database for each test
    testDbPath = join(tmpdir(), `safla-test-${Date.now()}.db`);
    service = new SAFLAService(testDbPath);
  });

  afterEach(() => {
    // Clean up
    service.close();
    try {
      rmSync(testDbPath, { force: true });
      rmSync(testDbPath + '-shm', { force: true });
      rmSync(testDbPath + '-wal', { force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // ============================================================
  // EMBEDDING GENERATION TESTS
  // ============================================================

  describe('Embedding Generation', () => {
    test('generates 1024-dimensional embeddings', () => {
      const text = 'Sample task description';
      const embedding = service.generateEmbedding(text);

      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding.length).toBe(1024);
    });

    test('generates deterministic embeddings', () => {
      const text = 'Consistent embedding test';
      const embedding1 = service.generateEmbedding(text);
      const embedding2 = service.generateEmbedding(text);

      expect(embedding1.length).toBe(embedding2.length);
      for (let i = 0; i < embedding1.length; i++) {
        expect(embedding1[i]).toBeCloseTo(embedding2[i], 10);
      }
    });

    test('generates different embeddings for different text', () => {
      const text1 = 'First text sample';
      const text2 = 'Second text sample';

      const embedding1 = service.generateEmbedding(text1);
      const embedding2 = service.generateEmbedding(text2);

      let differenceCount = 0;
      for (let i = 0; i < embedding1.length; i++) {
        if (Math.abs(embedding1[i] - embedding2[i]) > 0.001) {
          differenceCount++;
        }
      }

      expect(differenceCount).toBeGreaterThan(100);
    });

    test('normalizes embeddings to unit vectors', () => {
      const text = 'Normalization test';
      const embedding = service.generateEmbedding(text);

      let magnitude = 0;
      for (let i = 0; i < embedding.length; i++) {
        magnitude += embedding[i] * embedding[i];
      }
      magnitude = Math.sqrt(magnitude);

      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    test('generates embeddings in <1ms', () => {
      const text = 'Performance test sample text';
      const iterations = 100;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        service.generateEmbedding(text);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(1);
    });

    test('handles empty text', () => {
      const embedding = service.generateEmbedding('');
      expect(embedding.length).toBe(1024);
    });

    test('normalizes text consistently', () => {
      const text1 = 'Sample Text';
      const text2 = 'sample   text';
      const text3 = 'SAMPLE TEXT';

      const emb1 = service.generateEmbedding(text1);
      const emb2 = service.generateEmbedding(text2);
      const emb3 = service.generateEmbedding(text3);

      // Should be similar (case-insensitive, whitespace normalized)
      for (let i = 0; i < emb1.length; i++) {
        expect(emb1[i]).toBeCloseTo(emb2[i], 5);
        expect(emb1[i]).toBeCloseTo(emb3[i], 5);
      }
    });
  });

  // ============================================================
  // COSINE SIMILARITY TESTS
  // ============================================================

  describe('Cosine Similarity', () => {
    test('returns 1.0 for identical embeddings', () => {
      const text = 'Identical test';
      const emb1 = service.generateEmbedding(text);
      const emb2 = service.generateEmbedding(text);

      const similarity = service.cosineSimilarity(emb1, emb2);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    test('returns lower value for different embeddings', () => {
      const text1 = 'First sample text';
      const text2 = 'Completely different content';

      const emb1 = service.generateEmbedding(text1);
      const emb2 = service.generateEmbedding(text2);

      const similarity = service.cosineSimilarity(emb1, emb2);
      expect(similarity).toBeLessThan(1.0);
      expect(similarity).toBeGreaterThan(-1.0);
    });

    test('returns higher similarity for related text', () => {
      const text1 = 'Prioritize sprint tasks';
      const text2 = 'Prioritize feature requests';
      const text3 = 'Unrelated random content';

      const emb1 = service.generateEmbedding(text1);
      const emb2 = service.generateEmbedding(text2);
      const emb3 = service.generateEmbedding(text3);

      const sim12 = service.cosineSimilarity(emb1, emb2);
      const sim13 = service.cosineSimilarity(emb1, emb3);

      expect(sim12).toBeGreaterThan(sim13);
    });

    test('calculates similarity in <0.1ms', () => {
      const emb1 = service.generateEmbedding('Performance test 1');
      const emb2 = service.generateEmbedding('Performance test 2');
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        service.cosineSimilarity(emb1, emb2);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(0.1);
    });

    test('throws error for mismatched dimensions', () => {
      const emb1 = new Float32Array(1024);
      const emb2 = new Float32Array(512);

      expect(() => {
        service.cosineSimilarity(emb1, emb2);
      }).toThrow();
    });
  });

  // ============================================================
  // PATTERN STORAGE TESTS
  // ============================================================

  describe('Pattern Storage', () => {
    test('stores pattern with initial confidence 0.5', async () => {
      const input: PatternInput = {
        content: 'Test pattern content',
        namespace: 'test',
      };

      const pattern = await service.storePattern(input);

      expect(pattern.id).toBeDefined();
      expect(pattern.content).toBe(input.content);
      expect(pattern.namespace).toBe('test');
      expect(pattern.confidence).toBe(0.5);
      expect(pattern.successCount).toBe(0);
      expect(pattern.failureCount).toBe(0);
    });

    test('generates embedding automatically', async () => {
      const input: PatternInput = {
        content: 'Automatic embedding generation',
      };

      const pattern = await service.storePattern(input);
      expect(pattern.embedding).toBeDefined();
      expect(pattern.embedding.length).toBe(1024);
    });

    test('stores metadata correctly', async () => {
      const input: PatternInput = {
        content: 'Pattern with metadata',
        namespace: 'test',
        agentId: 'agent-123',
        skillId: 'skill-456',
        category: 'prioritization',
        tags: ['urgent', 'sprint'],
        metadata: { custom: 'data' },
      };

      const pattern = await service.storePattern(input);

      expect(pattern.agentId).toBe('agent-123');
      expect(pattern.skillId).toBe('skill-456');
      expect(pattern.category).toBe('prioritization');
      expect(pattern.tags).toEqual(['urgent', 'sprint']);
      expect(pattern.metadata).toEqual({ custom: 'data' });
    });

    test('retrieves stored pattern by ID', async () => {
      const input: PatternInput = {
        content: 'Retrievable pattern',
        namespace: 'test',
      };

      const stored = await service.storePattern(input);
      const retrieved = service.getPattern(stored.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(stored.id);
      expect(retrieved?.content).toBe(stored.content);
    });

    test('defaults to global namespace', async () => {
      const input: PatternInput = {
        content: 'Default namespace test',
      };

      const pattern = await service.storePattern(input);
      expect(pattern.namespace).toBe('global');
    });
  });

  // ============================================================
  // CONFIDENCE UPDATE TESTS
  // ============================================================

  describe('Confidence Update', () => {
    test('increases confidence on success by 0.20', () => {
      const initial = 0.5;
      const updated = service.updateConfidence(initial, 'success');
      expect(updated).toBeCloseTo(0.7, 10);
    });

    test('decreases confidence on failure by 0.15', () => {
      const initial = 0.7;
      const updated = service.updateConfidence(initial, 'failure');
      expect(updated).toBeCloseTo(0.55, 10);
    });

    test('respects upper bound of 0.95', () => {
      const initial = 0.90;
      const updated = service.updateConfidence(initial, 'success');
      expect(updated).toBe(0.95);
    });

    test('respects lower bound of 0.05', () => {
      const initial = 0.10;
      const updated = service.updateConfidence(initial, 'failure');
      expect(updated).toBe(0.05);
    });

    test('caps at maximum even with multiple successes', () => {
      let confidence = 0.50;
      for (let i = 0; i < 10; i++) {
        confidence = service.updateConfidence(confidence, 'success');
      }
      expect(confidence).toBe(0.95);
    });

    test('caps at minimum even with multiple failures', () => {
      let confidence = 0.50;
      for (let i = 0; i < 10; i++) {
        confidence = service.updateConfidence(confidence, 'failure');
      }
      expect(confidence).toBe(0.05);
    });
  });

  // ============================================================
  // OUTCOME RECORDING TESTS
  // ============================================================

  describe('Outcome Recording', () => {
    test('records successful outcome', async () => {
      const pattern = await service.storePattern({
        content: 'Success test pattern',
        namespace: 'test',
      });

      const updated = await service.recordOutcome(pattern.id, 'success');

      expect(updated.confidence).toBeCloseTo(0.7, 10);
      expect(updated.successCount).toBe(1);
      expect(updated.failureCount).toBe(0);
      expect(updated.totalInvocations).toBe(1);
      expect(updated.lastUsedAt).toBeDefined();
    });

    test('records failure outcome', async () => {
      const pattern = await service.storePattern({
        content: 'Failure test pattern',
        namespace: 'test',
      });

      const updated = await service.recordOutcome(pattern.id, 'failure');

      expect(updated.confidence).toBeCloseTo(0.35, 10);
      expect(updated.successCount).toBe(0);
      expect(updated.failureCount).toBe(1);
      expect(updated.totalInvocations).toBe(1);
    });

    test('accumulates multiple outcomes', async () => {
      const pattern = await service.storePattern({
        content: 'Multiple outcomes test',
        namespace: 'test',
      });

      await service.recordOutcome(pattern.id, 'success');
      await service.recordOutcome(pattern.id, 'success');
      await service.recordOutcome(pattern.id, 'failure');
      const final = await service.recordOutcome(pattern.id, 'success');

      expect(final.successCount).toBe(3);
      expect(final.failureCount).toBe(1);
      expect(final.totalInvocations).toBe(4);
    });

    test('stores outcome record', async () => {
      const pattern = await service.storePattern({
        content: 'Outcome record test',
        namespace: 'test',
      });

      await service.recordOutcome(pattern.id, 'success', {
        context: 'Test context',
        executionTimeMs: 1500,
      });

      const outcomes = service.getPatternOutcomes(pattern.id);
      expect(outcomes.length).toBe(1);
      expect(outcomes[0].outcome).toBe('success');
      expect(outcomes[0].context).toBe('Test context');
      expect(outcomes[0].executionTimeMs).toBe(1500);
    });

    test('throws error for non-existent pattern', async () => {
      await expect(async () => {
        await service.recordOutcome('non-existent-id', 'success');
      }).rejects.toThrow();
    });
  });

  // ============================================================
  // SEMANTIC SEARCH TESTS
  // ============================================================

  describe('Semantic Search', () => {
    test('finds similar patterns', async () => {
      await service.storePattern({
        content: 'Prioritize sprint tasks using Fibonacci',
        namespace: 'test',
      });
      await service.storePattern({
        content: 'Unrelated content about meetings',
        namespace: 'test',
      });

      const query = 'task prioritization';
      const embedding = service.generateEmbedding(query);
      const results = await service.semanticSearch(embedding, 'test', 10);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('Prioritize');
    });

    test('filters by confidence threshold', async () => {
      const lowConf = await service.storePattern({
        content: 'Low confidence pattern',
        namespace: 'test',
      });
      // Set to low confidence
      await service.recordOutcome(lowConf.id, 'failure');
      await service.recordOutcome(lowConf.id, 'failure');

      const highConf = await service.storePattern({
        content: 'High confidence pattern',
        namespace: 'test',
      });
      await service.recordOutcome(highConf.id, 'success');
      await service.recordOutcome(highConf.id, 'success');

      const query = 'pattern';
      const embedding = service.generateEmbedding(query);
      const results = await service.semanticSearch(embedding, 'test', 10);

      // Should prefer high confidence patterns
      expect(results[0].id).toBe(highConf.id);
    });

    test('respects limit parameter', async () => {
      for (let i = 0; i < 20; i++) {
        await service.storePattern({
          content: `Test pattern ${i}`,
          namespace: 'test',
        });
      }

      const query = 'test pattern';
      const embedding = service.generateEmbedding(query);
      const results = await service.semanticSearch(embedding, 'test', 5);

      expect(results.length).toBeLessThanOrEqual(5);
    });

    test('includes global namespace patterns', async () => {
      await service.storePattern({
        content: 'Global pattern',
        namespace: 'global',
      });
      await service.storePattern({
        content: 'Namespace specific pattern',
        namespace: 'specific',
      });

      const query = 'pattern';
      const embedding = service.generateEmbedding(query);
      const results = await service.semanticSearch(embedding, 'specific', 10);

      const globalPattern = results.find(r => r.namespace === 'global');
      expect(globalPattern).toBeDefined();
    });

    test('completes search in <3ms with 100 patterns', async () => {
      // Create 100 patterns
      for (let i = 0; i < 100; i++) {
        await service.storePattern({
          content: `Pattern ${i}: task prioritization and management`,
          namespace: 'test',
        });
      }

      const query = 'task prioritization';
      const embedding = service.generateEmbedding(query);

      const start = performance.now();
      await service.semanticSearch(embedding, 'test', 10);
      const end = performance.now();

      expect(end - start).toBeLessThan(3);
    });
  });

  // ============================================================
  // QUERY PATTERNS TESTS
  // ============================================================

  describe('Query Patterns', () => {
    test('queries patterns by text', async () => {
      await service.storePattern({
        content: 'Fibonacci prioritization for features',
        namespace: 'test',
      });
      await service.storePattern({
        content: 'Severity-based prioritization for bugs',
        namespace: 'test',
      });

      const results = await service.queryPatterns('feature prioritization', 'test', 10);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('Fibonacci');
    });

    test('returns patterns with embeddings', async () => {
      await service.storePattern({
        content: 'Pattern with embedding',
        namespace: 'test',
      });

      const results = await service.queryPatterns('embedding', 'test', 10);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].embedding).toBeDefined();
      expect(results[0].embedding.length).toBe(1024);
    });
  });

  // ============================================================
  // MMR RANKING TESTS
  // ============================================================

  describe('MMR Ranking', () => {
    test('ranks patterns by relevance and diversity', async () => {
      const patterns = await Promise.all([
        service.storePattern({ content: 'Task prioritization strategy A', namespace: 'test' }),
        service.storePattern({ content: 'Task prioritization strategy B', namespace: 'test' }),
        service.storePattern({ content: 'Meeting preparation workflow', namespace: 'test' }),
      ]);

      const ranked = await service.rankPatterns(
        patterns.map(p => service.getPattern(p.id)!).filter(p => p !== null),
        'task prioritization',
        0.7
      );

      expect(ranked.length).toBe(3);
      expect(ranked[0].finalScore).toBeGreaterThanOrEqual(ranked[1].finalScore);
      expect(ranked[1].finalScore).toBeGreaterThanOrEqual(ranked[2].finalScore);
    });

    test('balances similarity and diversity with lambda', async () => {
      const patterns = await Promise.all([
        service.storePattern({ content: 'Prioritize tasks Fibonacci', namespace: 'test' }),
        service.storePattern({ content: 'Prioritize tasks urgency', namespace: 'test' }),
        service.storePattern({ content: 'Unrelated meeting notes', namespace: 'test' }),
      ]);

      const fullPatterns = patterns.map(p => service.getPattern(p.id)!).filter(p => p !== null);

      // High lambda favors similarity
      const highLambda = await service.rankPatterns(fullPatterns, 'task prioritization', 0.9);

      // Low lambda favors diversity
      const lowLambda = await service.rankPatterns(fullPatterns, 'task prioritization', 0.3);

      expect(highLambda.length).toBe(3);
      expect(lowLambda.length).toBe(3);
    });

    test('weights by confidence', async () => {
      const lowConf = await service.storePattern({
        content: 'Low confidence pattern',
        namespace: 'test',
      });
      const highConf = await service.storePattern({
        content: 'High confidence pattern',
        namespace: 'test',
      });

      // Boost high confidence
      await service.recordOutcome(highConf.id, 'success');
      await service.recordOutcome(highConf.id, 'success');

      const patterns = [
        service.getPattern(lowConf.id)!,
        service.getPattern(highConf.id)!,
      ].filter(p => p !== null);

      const ranked = await service.rankPatterns(patterns, 'pattern', 0.7);

      expect(ranked[0].id).toBe(highConf.id);
    });
  });

  // ============================================================
  // NAMESPACE STATS TESTS
  // ============================================================

  describe('Namespace Statistics', () => {
    test('calculates namespace statistics', async () => {
      const p1 = await service.storePattern({ content: 'Pattern 1', namespace: 'test' });
      const p2 = await service.storePattern({ content: 'Pattern 2', namespace: 'test' });

      await service.recordOutcome(p1.id, 'success');
      await service.recordOutcome(p1.id, 'success');
      await service.recordOutcome(p2.id, 'failure');

      const stats = service.getNamespaceStats('test');

      expect(stats.totalPatterns).toBe(2);
      expect(stats.totalSuccesses).toBe(2);
      expect(stats.totalFailures).toBe(1);
      expect(stats.successRate).toBeCloseTo(2 / 3, 5);
    });

    test('returns zeros for empty namespace', () => {
      const stats = service.getNamespaceStats('empty-namespace');

      expect(stats.totalPatterns).toBe(0);
      expect(stats.avgConfidence).toBe(0);
      expect(stats.totalSuccesses).toBe(0);
      expect(stats.totalFailures).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  // ============================================================
  // INTEGRATION TESTS
  // ============================================================

  describe('Integration Tests', () => {
    test('complete learning workflow', async () => {
      // 1. Store pattern
      const pattern = await service.storePattern({
        content: 'Prioritize sprint tasks using Fibonacci',
        namespace: 'agent:personal-todos',
        agentId: 'personal-todos-agent',
        category: 'prioritization',
      });

      expect(pattern.confidence).toBe(0.5);

      // 2. Record success
      const after1 = await service.recordOutcome(pattern.id, 'success');
      expect(after1.confidence).toBeCloseTo(0.7, 10);

      // 3. Record another success
      const after2 = await service.recordOutcome(pattern.id, 'success');
      expect(after2.confidence).toBeCloseTo(0.9, 10);

      // 4. Query similar patterns
      const results = await service.queryPatterns(
        'sprint prioritization',
        'agent:personal-todos',
        5
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe(pattern.id);
      expect(results[0].confidence).toBeCloseTo(0.9, 10);

      // 5. Check outcomes
      const outcomes = service.getPatternOutcomes(pattern.id);
      expect(outcomes.length).toBe(2);
      expect(outcomes[0].outcome).toBe('success');
      expect(outcomes[1].outcome).toBe('success');
    });

    test('cross-namespace pattern retrieval', async () => {
      await service.storePattern({
        content: 'Global best practice',
        namespace: 'global',
      });
      await service.storePattern({
        content: 'Agent-specific pattern',
        namespace: 'agent:test',
      });

      const results = await service.queryPatterns('pattern', 'agent:test', 10);

      expect(results.length).toBe(2);
      expect(results.some(r => r.namespace === 'global')).toBe(true);
      expect(results.some(r => r.namespace === 'agent:test')).toBe(true);
    });
  });
});
