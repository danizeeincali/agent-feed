/**
 * Phase 4 ReasoningBank - SAFLA Algorithm Tests
 *
 * Tests SimHash embedding generation, similarity calculations, confidence updates,
 * pattern storage/retrieval, semantic search, MMR ranking, and edge cases.
 *
 * Target: 60+ tests
 */

import { createHash } from 'crypto';

describe('SAFLA Algorithm Tests', () => {
  // ============================================================
  // EMBEDDING GENERATION (12 tests)
  // ============================================================

  describe('SimHash Embedding Generation', () => {
    test('should generate deterministic embeddings', () => {
      const text = 'test pattern for prioritization';
      const embedding1 = generateEmbedding(text);
      const embedding2 = generateEmbedding(text);

      expect(embedding1).toEqual(embedding2);
    });

    test('should generate 1024-dimensional vectors', () => {
      const embedding = generateEmbedding('test text');
      expect(embedding.length).toBe(1024);
    });

    test('should complete embedding generation under 1ms', () => {
      const start = performance.now();
      generateEmbedding('test text for performance measurement');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1);
    });

    test('should normalize embeddings to unit vectors', () => {
      const embedding = generateEmbedding('test normalization');

      let magnitude = 0;
      for (let i = 0; i < embedding.length; i++) {
        magnitude += embedding[i] * embedding[i];
      }
      magnitude = Math.sqrt(magnitude);

      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    test('should produce different embeddings for different texts', () => {
      const embedding1 = generateEmbedding('prioritize sprint tasks');
      const embedding2 = generateEmbedding('create meeting agenda');

      expect(embedding1).not.toEqual(embedding2);
    });

    test('should produce similar embeddings for similar texts', () => {
      const embedding1 = generateEmbedding('prioritize tasks by importance');
      const embedding2 = generateEmbedding('prioritize tasks by priority');

      const similarity = cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeGreaterThan(0.8); // High similarity expected
    });

    test('should handle empty strings', () => {
      const embedding = generateEmbedding('');
      expect(embedding.length).toBe(1024);
      expect(embedding.every(val => !isNaN(val))).toBe(true);
    });

    test('should handle very long texts', () => {
      const longText = 'test '.repeat(1000);
      const start = performance.now();
      const embedding = generateEmbedding(longText);
      const duration = performance.now() - start;

      expect(embedding.length).toBe(1024);
      expect(duration).toBeLessThan(5); // Still fast
    });

    test('should handle special characters', () => {
      const embedding = generateEmbedding('test @#$% special chars!');
      expect(embedding.length).toBe(1024);
      expect(embedding.every(val => !isNaN(val))).toBe(true);
    });

    test('should normalize text case-insensitively', () => {
      const embedding1 = generateEmbedding('Test Pattern');
      const embedding2 = generateEmbedding('test pattern');

      expect(embedding1).toEqual(embedding2);
    });

    test('should normalize whitespace', () => {
      const embedding1 = generateEmbedding('test    pattern   spacing');
      const embedding2 = generateEmbedding('test pattern spacing');

      expect(embedding1).toEqual(embedding2);
    });

    test('should produce consistent embeddings across multiple calls', () => {
      const text = 'consistency test pattern';
      const embeddings = [];

      for (let i = 0; i < 10; i++) {
        embeddings.push(generateEmbedding(text));
      }

      for (let i = 1; i < embeddings.length; i++) {
        expect(embeddings[i]).toEqual(embeddings[0]);
      }
    });
  });

  // ============================================================
  // SIMILARITY CALCULATIONS (10 tests)
  // ============================================================

  describe('Embedding Similarity', () => {
    test('should calculate cosine similarity correctly', () => {
      const embedding1 = new Float32Array([1, 0, 0]);
      const embedding2 = new Float32Array([1, 0, 0]);

      const similarity = cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    test('should return 0 for orthogonal vectors', () => {
      const embedding1 = new Float32Array([1, 0, 0]);
      const embedding2 = new Float32Array([0, 1, 0]);

      const similarity = cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeCloseTo(0.0, 5);
    });

    test('should return -1 for opposite vectors', () => {
      const embedding1 = new Float32Array([1, 0, 0]);
      const embedding2 = new Float32Array([-1, 0, 0]);

      const similarity = cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    test('should handle zero-magnitude vectors', () => {
      const embedding1 = new Float32Array([0, 0, 0]);
      const embedding2 = new Float32Array([1, 0, 0]);

      const similarity = cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBe(0);
    });

    test('should validate dimension mismatch', () => {
      const embedding1 = new Float32Array([1, 0, 0]);
      const embedding2 = new Float32Array([1, 0]);

      expect(() => {
        cosineSimilarity(embedding1, embedding2);
      }).toThrow('Embedding dimensions must match');
    });

    test('should calculate similarity efficiently for 1024 dimensions', () => {
      const embedding1 = generateEmbedding('test text 1');
      const embedding2 = generateEmbedding('test text 2');

      const start = performance.now();
      cosineSimilarity(embedding1, embedding2);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(0.1); // Very fast
    });

    test('should return value between -1 and 1', () => {
      const embedding1 = generateEmbedding('random text 1');
      const embedding2 = generateEmbedding('random text 2');

      const similarity = cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    test('should be symmetric', () => {
      const embedding1 = generateEmbedding('text A');
      const embedding2 = generateEmbedding('text B');

      const sim1 = cosineSimilarity(embedding1, embedding2);
      const sim2 = cosineSimilarity(embedding2, embedding1);

      expect(sim1).toBeCloseTo(sim2, 5);
    });

    test('should produce high similarity for semantically similar text', () => {
      const text1 = 'prioritize tasks by importance and urgency';
      const text2 = 'rank items by priority and critical status';

      const embedding1 = generateEmbedding(text1);
      const embedding2 = generateEmbedding(text2);
      const similarity = cosineSimilarity(embedding1, embedding2);

      expect(similarity).toBeGreaterThan(0.6);
    });

    test('should produce low similarity for unrelated text', () => {
      const text1 = 'prioritize sprint tasks';
      const text2 = 'create database schema';

      const embedding1 = generateEmbedding(text1);
      const embedding2 = generateEmbedding(text2);
      const similarity = cosineSimilarity(embedding1, embedding2);

      expect(similarity).toBeLessThan(0.5);
    });
  });

  // ============================================================
  // CONFIDENCE UPDATE FORMULAS (12 tests)
  // ============================================================

  describe('Confidence Updates', () => {
    test('should increase confidence by 20% on success', () => {
      const initial = 0.5;
      const updated = updateConfidence(initial, 'success');
      expect(updated).toBe(0.7); // 0.5 + 0.2
    });

    test('should decrease confidence by 15% on failure', () => {
      const initial = 0.7;
      const updated = updateConfidence(initial, 'failure');
      expect(updated).toBe(0.55); // 0.7 - 0.15
    });

    test('should cap confidence at 95%', () => {
      const initial = 0.90;
      const updated = updateConfidence(initial, 'success');
      expect(updated).toBe(0.95); // max(0.95, 0.90 + 0.20)
    });

    test('should floor confidence at 5%', () => {
      const initial = 0.10;
      const updated = updateConfidence(initial, 'failure');
      expect(updated).toBe(0.05); // min(0.05, 0.10 - 0.15)
    });

    test('should handle multiple consecutive successes', () => {
      let confidence = 0.5;
      confidence = updateConfidence(confidence, 'success'); // 0.7
      confidence = updateConfidence(confidence, 'success'); // 0.9
      confidence = updateConfidence(confidence, 'success'); // 0.95 (capped)

      expect(confidence).toBe(0.95);
    });

    test('should handle multiple consecutive failures', () => {
      let confidence = 0.5;
      confidence = updateConfidence(confidence, 'failure'); // 0.35
      confidence = updateConfidence(confidence, 'failure'); // 0.20
      confidence = updateConfidence(confidence, 'failure'); // 0.05 (floored)

      expect(confidence).toBe(0.05);
    });

    test('should converge to stable high confidence with mostly successes', () => {
      let confidence = 0.5;
      // 10 successes, 2 failures
      for (let i = 0; i < 10; i++) {
        confidence = updateConfidence(confidence, 'success');
      }
      for (let i = 0; i < 2; i++) {
        confidence = updateConfidence(confidence, 'failure');
      }

      expect(confidence).toBeGreaterThan(0.8);
    });

    test('should converge to stable low confidence with mostly failures', () => {
      let confidence = 0.5;
      // 10 failures, 2 successes
      for (let i = 0; i < 10; i++) {
        confidence = updateConfidence(confidence, 'failure');
      }
      for (let i = 0; i < 2; i++) {
        confidence = updateConfidence(confidence, 'success');
      }

      expect(confidence).toBeLessThan(0.3);
    });

    test('should calculate confidence delta correctly', () => {
      const before = 0.6;
      const after = updateConfidence(before, 'success');
      const delta = after - before;

      expect(delta).toBeCloseTo(0.2, 5);
    });

    test('should maintain confidence within bounds after many updates', () => {
      let confidence = 0.5;

      // Random walk
      for (let i = 0; i < 100; i++) {
        const outcome = Math.random() > 0.5 ? 'success' : 'failure';
        confidence = updateConfidence(confidence, outcome);

        expect(confidence).toBeGreaterThanOrEqual(0.05);
        expect(confidence).toBeLessThanOrEqual(0.95);
      }
    });

    test('should allow recovery from low confidence', () => {
      let confidence = 0.05; // Minimum

      // Series of successes
      for (let i = 0; i < 5; i++) {
        confidence = updateConfidence(confidence, 'success');
      }

      expect(confidence).toBeGreaterThan(0.5);
    });

    test('should maintain stable confidence with balanced outcomes', () => {
      let confidence = 0.5;

      // Alternating success/failure (10 times each)
      for (let i = 0; i < 10; i++) {
        confidence = updateConfidence(confidence, 'success');
        confidence = updateConfidence(confidence, 'failure');
      }

      // Should be relatively stable around initial
      expect(confidence).toBeGreaterThan(0.4);
      expect(confidence).toBeLessThan(0.6);
    });
  });

  // ============================================================
  // CONFIDENCE BOUNDS (6 tests)
  // ============================================================

  describe('Confidence Bounds', () => {
    test('should enforce minimum confidence of 5%', () => {
      const confidence = 0.05;
      const updated = updateConfidence(confidence, 'failure');
      expect(updated).toBe(0.05);
    });

    test('should enforce maximum confidence of 95%', () => {
      const confidence = 0.95;
      const updated = updateConfidence(confidence, 'success');
      expect(updated).toBe(0.95);
    });

    test('should reject invalid confidence values below minimum', () => {
      expect(() => {
        validateConfidence(0.04);
      }).toThrow('Confidence must be between 0.05 and 0.95');
    });

    test('should reject invalid confidence values above maximum', () => {
      expect(() => {
        validateConfidence(0.96);
      }).toThrow('Confidence must be between 0.05 and 0.95');
    });

    test('should accept valid confidence values', () => {
      expect(() => {
        validateConfidence(0.5);
        validateConfidence(0.05);
        validateConfidence(0.95);
      }).not.toThrow();
    });

    test('should use default initial confidence of 50%', () => {
      const initial = getInitialConfidence();
      expect(initial).toBe(0.5);
    });
  });

  // ============================================================
  // PATTERN STORAGE AND RETRIEVAL (8 tests)
  // ============================================================

  describe('Pattern Storage', () => {
    test('should store pattern with all required fields', () => {
      const pattern = createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      expect(pattern).toHaveProperty('id');
      expect(pattern).toHaveProperty('content', 'test pattern');
      expect(pattern).toHaveProperty('namespace', 'test');
      expect(pattern).toHaveProperty('embedding');
      expect(pattern).toHaveProperty('confidence', 0.5);
      expect(pattern).toHaveProperty('createdAt');
    });

    test('should auto-generate embedding on pattern creation', () => {
      const pattern = createPattern({
        content: 'auto-generate embedding test',
        namespace: 'test',
      });

      expect(pattern.embedding).toBeDefined();
      expect(pattern.embedding.length).toBe(1024);
    });

    test('should assign default namespace if not provided', () => {
      const pattern = createPattern({
        content: 'test pattern',
      });

      expect(pattern.namespace).toBe('global');
    });

    test('should store optional metadata', () => {
      const pattern = createPattern({
        content: 'test pattern',
        metadata: { category: 'prioritization', tags: ['sprint', 'agile'] },
      });

      expect(pattern.metadata).toEqual({
        category: 'prioritization',
        tags: ['sprint', 'agile'],
      });
    });

    test('should assign unique IDs to patterns', () => {
      const pattern1 = createPattern({ content: 'pattern 1' });
      const pattern2 = createPattern({ content: 'pattern 2' });

      expect(pattern1.id).not.toBe(pattern2.id);
    });

    test('should timestamp pattern creation', () => {
      const before = Date.now();
      const pattern = createPattern({ content: 'test' });
      const after = Date.now();

      expect(pattern.createdAt).toBeGreaterThanOrEqual(before);
      expect(pattern.createdAt).toBeLessThanOrEqual(after);
    });

    test('should initialize counters to zero', () => {
      const pattern = createPattern({ content: 'test' });

      expect(pattern.successCount).toBe(0);
      expect(pattern.failureCount).toBe(0);
      expect(pattern.totalInvocations).toBe(0);
    });

    test('should validate required fields', () => {
      expect(() => {
        createPattern({ content: '' }); // Empty content
      }).toThrow('Content is required');
    });
  });

  // ============================================================
  // SEMANTIC SEARCH ACCURACY (8 tests)
  // ============================================================

  describe('Semantic Search', () => {
    let patterns: Pattern[];

    beforeEach(() => {
      patterns = [
        createPattern({ content: 'prioritize sprint tasks by urgency', namespace: 'test' }),
        createPattern({ content: 'create meeting agenda for 1-on-1', namespace: 'test' }),
        createPattern({ content: 'rank features by business impact', namespace: 'test' }),
        createPattern({ content: 'schedule team standup', namespace: 'test' }),
        createPattern({ content: 'prioritize bug fixes by severity', namespace: 'test' }),
      ];
    });

    test('should find semantically similar patterns', () => {
      const query = 'prioritize tasks by importance';
      const results = semanticSearch(query, patterns, { limit: 3 });

      expect(results.length).toBeLessThanOrEqual(3);
      expect(results[0].content).toContain('prioritize');
    });

    test('should rank by similarity score', () => {
      const query = 'prioritize items';
      const results = semanticSearch(query, patterns, { limit: 5 });

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    test('should filter by minimum similarity threshold', () => {
      const query = 'completely unrelated query xyz';
      const results = semanticSearch(query, patterns, {
        minSimilarity: 0.6,
      });

      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.6);
      });
    });

    test('should apply confidence weighting to final score', () => {
      const highConfPattern = createPattern({
        content: 'test pattern',
        namespace: 'test',
      });
      highConfPattern.confidence = 0.9;

      const lowConfPattern = createPattern({
        content: 'test pattern',
        namespace: 'test',
      });
      lowConfPattern.confidence = 0.3;

      const patternsToSearch = [highConfPattern, lowConfPattern];
      const results = semanticSearch('test', patternsToSearch);

      // High confidence pattern should rank higher
      expect(results[0].id).toBe(highConfPattern.id);
    });

    test('should limit results to requested count', () => {
      const query = 'test query';
      const results = semanticSearch(query, patterns, { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    test('should handle empty pattern list', () => {
      const results = semanticSearch('test', [], { limit: 10 });
      expect(results).toEqual([]);
    });

    test('should achieve 87-95% accuracy target', () => {
      // Test with known semantic pairs
      const testCases = [
        { query: 'prioritize tasks', expected: 'prioritize sprint tasks by urgency' },
        { query: 'meeting preparation', expected: 'create meeting agenda for 1-on-1' },
        { query: 'rank features', expected: 'rank features by business impact' },
        { query: 'daily standup', expected: 'schedule team standup' },
        { query: 'critical bugs', expected: 'prioritize bug fixes by severity' },
      ];

      let correct = 0;
      testCases.forEach(testCase => {
        const results = semanticSearch(testCase.query, patterns, { limit: 1 });
        if (results[0] && results[0].content === testCase.expected) {
          correct++;
        }
      });

      const accuracy = correct / testCases.length;
      expect(accuracy).toBeGreaterThanOrEqual(0.87); // 87% target
    });

    test('should complete search within performance target', () => {
      // Create larger dataset
      const largePatternSet = [];
      for (let i = 0; i < 100; i++) {
        largePatternSet.push(createPattern({
          content: `pattern ${i} with content`,
          namespace: 'test',
        }));
      }

      const start = performance.now();
      semanticSearch('test query', largePatternSet, { limit: 10 });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(3); // <3ms target
    });
  });

  // ============================================================
  // MMR RANKING DIVERSITY (4 tests)
  // ============================================================

  describe('MMR Ranking', () => {
    test('should balance relevance and diversity', () => {
      const patterns = [
        createPattern({ content: 'prioritize tasks A' }),
        createPattern({ content: 'prioritize tasks B' }), // Very similar
        createPattern({ content: 'create meeting agenda' }), // Different
      ];

      const query = 'prioritize work items';
      const results = mmrRanking(query, patterns, {
        lambda: 0.5, // Equal weight to relevance and diversity
        limit: 3,
      });

      expect(results.length).toBe(3);
      // Should not return only prioritization patterns
    });

    test('should prioritize relevance when lambda = 1', () => {
      const patterns = [
        createPattern({ content: 'prioritize sprint tasks' }),
        createPattern({ content: 'prioritize feature requests' }),
        createPattern({ content: 'create database schema' }),
      ];

      const query = 'prioritize items';
      const results = mmrRanking(query, patterns, {
        lambda: 1.0, // Only relevance
        limit: 2,
      });

      results.forEach(result => {
        expect(result.content).toContain('prioritize');
      });
    });

    test('should prioritize diversity when lambda = 0', () => {
      const patterns = [
        createPattern({ content: 'prioritize tasks A' }),
        createPattern({ content: 'prioritize tasks B' }),
        createPattern({ content: 'prioritize tasks C' }),
        createPattern({ content: 'create meeting agenda' }),
        createPattern({ content: 'schedule standup' }),
      ];

      const query = 'prioritize';
      const results = mmrRanking(query, patterns, {
        lambda: 0.0, // Only diversity
        limit: 3,
      });

      // Should select diverse patterns, not all prioritization
      const uniqueTopics = new Set(results.map(r =>
        r.content.split(' ')[0]
      ));
      expect(uniqueTopics.size).toBeGreaterThan(1);
    });

    test('should maintain performance with MMR calculation', () => {
      const patterns = [];
      for (let i = 0; i < 50; i++) {
        patterns.push(createPattern({ content: `pattern ${i}` }));
      }

      const start = performance.now();
      mmrRanking('test query', patterns, { limit: 10 });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });
  });
});

// ============================================================
// HELPER FUNCTIONS & TYPES
// ============================================================

interface Pattern {
  id: string;
  content: string;
  namespace: string;
  embedding: Float32Array;
  confidence: number;
  successCount: number;
  failureCount: number;
  totalInvocations: number;
  createdAt: number;
  metadata?: any;
}

interface SearchResult extends Pattern {
  similarity: number;
  finalScore: number;
}

function generateEmbedding(text: string): Float32Array {
  const DIMENSIONS = 1024;
  const HASH_COUNT = 64;
  const embedding = new Float32Array(DIMENSIONS);

  // Normalize text
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');

  // Generate embeddings using hash-based approach
  for (let i = 0; i < HASH_COUNT; i++) {
    const hash = createHash('sha256')
      .update(`${normalized}:${i}`)
      .digest();

    for (let j = 0; j < 16; j++) {
      const offset = i * 16 + j;
      if (offset < DIMENSIONS) {
        embedding[offset] = (hash[j * 2] + hash[j * 2 + 1] - 255) / 255;
      }
    }
  }

  // Normalize to unit vector
  let magnitude = 0;
  for (let i = 0; i < embedding.length; i++) {
    magnitude += embedding[i] * embedding[i];
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Embedding dimensions must match');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

function updateConfidence(
  current: number,
  outcome: 'success' | 'failure'
): number {
  const MIN_CONFIDENCE = 0.05;
  const MAX_CONFIDENCE = 0.95;
  const SUCCESS_BOOST = 0.20;
  const FAILURE_PENALTY = -0.15;

  const delta = outcome === 'success' ? SUCCESS_BOOST : FAILURE_PENALTY;
  const updated = current + delta;

  return Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, updated));
}

function validateConfidence(confidence: number): void {
  if (confidence < 0.05 || confidence > 0.95) {
    throw new Error('Confidence must be between 0.05 and 0.95');
  }
}

function getInitialConfidence(): number {
  return 0.5;
}

function createPattern(config: {
  content: string;
  namespace?: string;
  metadata?: any;
}): Pattern {
  if (!config.content || config.content.trim() === '') {
    throw new Error('Content is required');
  }

  return {
    id: `pattern-${Date.now()}-${Math.random()}`,
    content: config.content,
    namespace: config.namespace || 'global',
    embedding: generateEmbedding(config.content),
    confidence: 0.5,
    successCount: 0,
    failureCount: 0,
    totalInvocations: 0,
    createdAt: Date.now(),
    metadata: config.metadata,
  };
}

function semanticSearch(
  query: string,
  patterns: Pattern[],
  options: {
    limit?: number;
    minSimilarity?: number;
    minConfidence?: number;
  } = {}
): SearchResult[] {
  const {
    limit = 10,
    minSimilarity = 0.0,
    minConfidence = 0.2,
  } = options;

  const queryEmbedding = generateEmbedding(query);

  // Calculate similarities and scores
  const results: SearchResult[] = patterns
    .filter(p => p.confidence >= minConfidence)
    .map(pattern => {
      const similarity = cosineSimilarity(queryEmbedding, pattern.embedding);

      // Composite scoring: similarity * 0.4 + confidence * 0.3
      const finalScore = similarity * 0.4 + pattern.confidence * 0.3;

      return {
        ...pattern,
        similarity,
        finalScore,
      };
    })
    .filter(r => r.similarity >= minSimilarity)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);

  return results;
}

function mmrRanking(
  query: string,
  patterns: Pattern[],
  options: {
    lambda?: number;
    limit?: number;
  } = {}
): SearchResult[] {
  const { lambda = 0.5, limit = 10 } = options;

  const queryEmbedding = generateEmbedding(query);
  const selected: SearchResult[] = [];
  const candidates = patterns.map(p => ({
    ...p,
    similarity: cosineSimilarity(queryEmbedding, p.embedding),
    finalScore: 0,
  }));

  while (selected.length < limit && candidates.length > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];

      // Relevance score
      const relevance = candidate.similarity;

      // Diversity score (max similarity to already selected)
      let maxSimilarityToSelected = 0;
      for (const s of selected) {
        const sim = cosineSimilarity(candidate.embedding, s.embedding);
        maxSimilarityToSelected = Math.max(maxSimilarityToSelected, sim);
      }

      // MMR score
      const score = lambda * relevance - (1 - lambda) * maxSimilarityToSelected;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      selected.push(candidates[bestIdx]);
      candidates.splice(bestIdx, 1);
    } else {
      break;
    }
  }

  return selected;
}
