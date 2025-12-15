/**
 * Phase 4 ReasoningBank - Learning Workflows Tests
 *
 * Tests pattern query before execution, outcome recording, confidence convergence,
 * cross-agent sharing, namespace isolation, failure learning, relationship tracking,
 * and memory cleanup.
 *
 * Target: 50+ tests
 */

import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';

describe('Learning Workflows Tests', () => {
  let db: Database.Database;
  let reasoningBank: ReasoningBankService;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    reasoningBank = new ReasoningBankService(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  // ============================================================
  // PATTERN QUERY BEFORE EXECUTION (10 tests)
  // ============================================================

  describe('Pattern Query Before Execution', () => {
    test('should query relevant patterns before task execution', async () => {
      // Create existing patterns
      await reasoningBank.createPattern({
        content: 'prioritize tasks by Fibonacci sequence',
        namespace: 'agent:todos',
        confidence: 0.85,
      });

      const patterns = await reasoningBank.queryPatterns({
        query: 'prioritize sprint tasks',
        namespace: 'agent:todos',
        limit: 5,
      });

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].content).toContain('prioritize');
    });

    test('should return patterns ordered by relevance', async () => {
      await reasoningBank.createPattern({
        content: 'high relevance: prioritize by urgency',
        namespace: 'test',
        confidence: 0.9,
      });

      await reasoningBank.createPattern({
        content: 'low relevance: create meeting notes',
        namespace: 'test',
        confidence: 0.8,
      });

      const patterns = await reasoningBank.queryPatterns({
        query: 'prioritize tasks',
        namespace: 'test',
      });

      expect(patterns[0].content).toContain('prioritize');
    });

    test('should filter by minimum confidence threshold', async () => {
      await reasoningBank.createPattern({
        content: 'high confidence pattern',
        namespace: 'test',
        confidence: 0.9,
      });

      await reasoningBank.createPattern({
        content: 'low confidence pattern',
        namespace: 'test',
        confidence: 0.3,
      });

      const patterns = await reasoningBank.queryPatterns({
        query: 'pattern',
        namespace: 'test',
        minConfidence: 0.7,
      });

      patterns.forEach(p => {
        expect(p.confidence).toBeGreaterThanOrEqual(0.7);
      });
    });

    test('should limit results to requested count', async () => {
      for (let i = 0; i < 10; i++) {
        await reasoningBank.createPattern({
          content: `pattern ${i}`,
          namespace: 'test',
        });
      }

      const patterns = await reasoningBank.queryPatterns({
        query: 'pattern',
        namespace: 'test',
        limit: 3,
      });

      expect(patterns.length).toBe(3);
    });

    test('should include global patterns when requested', async () => {
      await reasoningBank.createPattern({
        content: 'global pattern',
        namespace: 'global',
      });

      await reasoningBank.createPattern({
        content: 'agent pattern',
        namespace: 'agent:test',
      });

      const patterns = await reasoningBank.queryPatterns({
        query: 'pattern',
        namespace: 'agent:test',
        includeGlobal: true,
      });

      const namespaces = patterns.map(p => p.namespace);
      expect(namespaces).toContain('global');
    });

    test('should exclude global patterns when not requested', async () => {
      await reasoningBank.createPattern({
        content: 'global pattern',
        namespace: 'global',
      });

      const patterns = await reasoningBank.queryPatterns({
        query: 'pattern',
        namespace: 'agent:test',
        includeGlobal: false,
      });

      patterns.forEach(p => {
        expect(p.namespace).not.toBe('global');
      });
    });

    test('should return empty array when no patterns match', async () => {
      const patterns = await reasoningBank.queryPatterns({
        query: 'nonexistent query',
        namespace: 'empty',
      });

      expect(patterns).toEqual([]);
    });

    test('should complete query within performance target', async () => {
      // Create 100 patterns
      for (let i = 0; i < 100; i++) {
        await reasoningBank.createPattern({
          content: `test pattern ${i}`,
          namespace: 'test',
        });
      }

      const start = performance.now();
      await reasoningBank.queryPatterns({
        query: 'test',
        namespace: 'test',
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(3);
    });

    test('should filter by category', async () => {
      await reasoningBank.createPattern({
        content: 'prioritization pattern',
        namespace: 'test',
        category: 'prioritization',
      });

      await reasoningBank.createPattern({
        content: 'meeting pattern',
        namespace: 'test',
        category: 'meeting',
      });

      const patterns = await reasoningBank.queryPatterns({
        query: 'pattern',
        namespace: 'test',
        category: 'prioritization',
      });

      patterns.forEach(p => {
        expect(p.category).toBe('prioritization');
      });
    });

    test('should handle concurrent queries safely', async () => {
      await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      const queries = Array(10).fill(null).map(() =>
        reasoningBank.queryPatterns({
          query: 'test',
          namespace: 'test',
        })
      );

      const results = await Promise.all(queries);
      results.forEach(r => {
        expect(r.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================
  // OUTCOME RECORDING AFTER EXECUTION (10 tests)
  // ============================================================

  describe('Outcome Recording', () => {
    test('should record success outcome correctly', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      const outcome = await reasoningBank.recordOutcome(pattern.id, {
        outcome: 'success',
        context: 'test execution',
      });

      expect(outcome.confidenceBefore).toBe(0.5);
      expect(outcome.confidenceAfter).toBe(0.7);
      expect(outcome.confidenceDelta).toBe(0.2);
    });

    test('should record failure outcome correctly', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      // First success
      await reasoningBank.recordOutcome(pattern.id, { outcome: 'success' });

      // Then failure
      const outcome = await reasoningBank.recordOutcome(pattern.id, {
        outcome: 'failure',
      });

      expect(outcome.confidenceBefore).toBe(0.7);
      expect(outcome.confidenceAfter).toBe(0.55);
      expect(outcome.confidenceDelta).toBe(-0.15);
    });

    test('should update pattern success count on success', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      await reasoningBank.recordOutcome(pattern.id, { outcome: 'success' });

      const updated = await reasoningBank.getPattern(pattern.id);
      expect(updated.successCount).toBe(1);
      expect(updated.failureCount).toBe(0);
    });

    test('should update pattern failure count on failure', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      await reasoningBank.recordOutcome(pattern.id, { outcome: 'failure' });

      const updated = await reasoningBank.getPattern(pattern.id);
      expect(updated.successCount).toBe(0);
      expect(updated.failureCount).toBe(1);
    });

    test('should increment total invocations on any outcome', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      await reasoningBank.recordOutcome(pattern.id, { outcome: 'success' });
      await reasoningBank.recordOutcome(pattern.id, { outcome: 'failure' });

      const updated = await reasoningBank.getPattern(pattern.id);
      expect(updated.totalInvocations).toBe(2);
    });

    test('should store outcome context and feedback', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      const outcome = await reasoningBank.recordOutcome(pattern.id, {
        outcome: 'success',
        context: 'sprint planning',
        userFeedback: 'worked perfectly',
        executionTimeMs: 1500,
      });

      const outcomes = await reasoningBank.getOutcomes(pattern.id);
      expect(outcomes[0].context).toBe('sprint planning');
      expect(outcomes[0].userFeedback).toBe('worked perfectly');
      expect(outcomes[0].executionTimeMs).toBe(1500);
    });

    test('should update last_used_at timestamp', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      const before = Date.now();
      await reasoningBank.recordOutcome(pattern.id, { outcome: 'success' });
      const after = Date.now();

      const updated = await reasoningBank.getPattern(pattern.id);
      expect(updated.lastUsedAt).toBeGreaterThanOrEqual(before);
      expect(updated.lastUsedAt).toBeLessThanOrEqual(after);
    });

    test('should maintain outcome history', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      await reasoningBank.recordOutcome(pattern.id, { outcome: 'success' });
      await reasoningBank.recordOutcome(pattern.id, { outcome: 'success' });
      await reasoningBank.recordOutcome(pattern.id, { outcome: 'failure' });

      const outcomes = await reasoningBank.getOutcomes(pattern.id);
      expect(outcomes.length).toBe(3);
    });

    test('should calculate success rate correctly', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      // 7 successes, 3 failures = 70% success rate
      for (let i = 0; i < 7; i++) {
        await reasoningBank.recordOutcome(pattern.id, { outcome: 'success' });
      }
      for (let i = 0; i < 3; i++) {
        await reasoningBank.recordOutcome(pattern.id, { outcome: 'failure' });
      }

      const updated = await reasoningBank.getPattern(pattern.id);
      const successRate = updated.successCount / (updated.successCount + updated.failureCount);
      expect(successRate).toBeCloseTo(0.7, 2);
    });

    test('should handle rapid outcome recording', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      const outcomes = Array(20).fill(null).map(() =>
        reasoningBank.recordOutcome(pattern.id, { outcome: 'success' })
      );

      await Promise.all(outcomes);

      const updated = await reasoningBank.getPattern(pattern.id);
      expect(updated.successCount).toBe(20);
    });
  });

  // ============================================================
  // CONFIDENCE CONVERGENCE OVER TIME (8 tests)
  // ============================================================

  describe('Confidence Convergence', () => {
    test('should converge to high confidence with consistent successes', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      // 10 successful outcomes
      for (let i = 0; i < 10; i++) {
        await reasoningBank.recordOutcome(pattern.id, { outcome: 'success' });
      }

      const updated = await reasoningBank.getPattern(pattern.id);
      expect(updated.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should converge to low confidence with consistent failures', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      // 10 failed outcomes
      for (let i = 0; i < 10; i++) {
        await reasoningBank.recordOutcome(pattern.id, { outcome: 'failure' });
      }

      const updated = await reasoningBank.getPattern(pattern.id);
      expect(updated.confidence).toBeLessThanOrEqual(0.2);
    });

    test('should reach 80% confidence within 2 weeks simulation', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      // Simulate 14 days, 1 success per day
      for (let day = 0; day < 14; day++) {
        await reasoningBank.recordOutcome(pattern.id, { outcome: 'success' });
      }

      const updated = await reasoningBank.getPattern(pattern.id);
      expect(updated.confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should stabilize confidence with mixed outcomes', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      // 80% success rate over 50 outcomes
      for (let i = 0; i < 40; i++) {
        await reasoningBank.recordOutcome(pattern.id, { outcome: 'success' });
      }
      for (let i = 0; i < 10; i++) {
        await reasoningBank.recordOutcome(pattern.id, { outcome: 'failure' });
      }

      const updated = await reasoningBank.getPattern(pattern.id);
      expect(updated.confidence).toBeGreaterThan(0.7);
      expect(updated.confidence).toBeLessThanOrEqual(0.95);
    });

    test('should allow confidence recovery after failures', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      // Initial failures
      for (let i = 0; i < 5; i++) {
        await reasoningBank.recordOutcome(pattern.id, { outcome: 'failure' });
      }

      const afterFailures = await reasoningBank.getPattern(pattern.id);
      expect(afterFailures.confidence).toBeLessThan(0.3);

      // Recovery with successes
      for (let i = 0; i < 10; i++) {
        await reasoningBank.recordOutcome(pattern.id, { outcome: 'success' });
      }

      const afterRecovery = await reasoningBank.getPattern(pattern.id);
      expect(afterRecovery.confidence).toBeGreaterThan(0.7);
    });

    test('should track confidence trajectory over time', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      const trajectory = [];

      for (let i = 0; i < 10; i++) {
        await reasoningBank.recordOutcome(pattern.id, { outcome: 'success' });
        const current = await reasoningBank.getPattern(pattern.id);
        trajectory.push(current.confidence);
      }

      // Confidence should generally increase
      for (let i = 1; i < trajectory.length - 1; i++) {
        expect(trajectory[i]).toBeGreaterThanOrEqual(trajectory[i - 1]);
      }
    });

    test('should converge faster with more frequent outcomes', async () => {
      const slowPattern = await reasoningBank.createPattern({
        content: 'slow pattern',
        namespace: 'test',
      });

      const fastPattern = await reasoningBank.createPattern({
        content: 'fast pattern',
        namespace: 'test',
      });

      // Slow: 5 successes
      for (let i = 0; i < 5; i++) {
        await reasoningBank.recordOutcome(slowPattern.id, { outcome: 'success' });
      }

      // Fast: 10 successes
      for (let i = 0; i < 10; i++) {
        await reasoningBank.recordOutcome(fastPattern.id, { outcome: 'success' });
      }

      const slow = await reasoningBank.getPattern(slowPattern.id);
      const fast = await reasoningBank.getPattern(fastPattern.id);

      expect(fast.confidence).toBeGreaterThan(slow.confidence);
    });

    test('should maintain confidence bounds during convergence', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      // Extreme scenario: 100 successes
      for (let i = 0; i < 100; i++) {
        await reasoningBank.recordOutcome(pattern.id, { outcome: 'success' });
        const current = await reasoningBank.getPattern(pattern.id);

        expect(current.confidence).toBeGreaterThanOrEqual(0.05);
        expect(current.confidence).toBeLessThanOrEqual(0.95);
      }
    });
  });

  // ============================================================
  // CROSS-AGENT PATTERN SHARING (8 tests)
  // ============================================================

  describe('Cross-Agent Pattern Sharing', () => {
    test('should share pattern to target agent', async () => {
      const sourcePattern = await reasoningBank.createPattern({
        content: 'shared pattern',
        namespace: 'agent:source',
        confidence: 0.9,
      });

      const sharedId = await reasoningBank.sharePattern(
        sourcePattern.id,
        'agent:target'
      );

      const shared = await reasoningBank.getPattern(sharedId);
      expect(shared.namespace).toBe('agent:target');
      expect(shared.content).toBe('shared pattern');
    });

    test('should reduce confidence when sharing', async () => {
      const sourcePattern = await reasoningBank.createPattern({
        content: 'shared pattern',
        namespace: 'agent:source',
        confidence: 0.9,
      });

      const sharedId = await reasoningBank.sharePattern(
        sourcePattern.id,
        'agent:target',
        { confidenceMultiplier: 0.8 }
      );

      const shared = await reasoningBank.getPattern(sharedId);
      expect(shared.confidence).toBeCloseTo(0.72, 2); // 0.9 * 0.8
    });

    test('should create relationship between source and shared patterns', async () => {
      const sourcePattern = await reasoningBank.createPattern({
        content: 'shared pattern',
        namespace: 'agent:source',
      });

      const sharedId = await reasoningBank.sharePattern(
        sourcePattern.id,
        'agent:target'
      );

      const relationships = await reasoningBank.getRelationships(sourcePattern.id);
      expect(relationships).toContainEqual(
        expect.objectContaining({
          targetPatternId: sharedId,
          relationshipType: 'shared-to',
        })
      );
    });

    test('should preserve pattern content and category when sharing', async () => {
      const sourcePattern = await reasoningBank.createPattern({
        content: 'shared prioritization pattern',
        namespace: 'agent:source',
        category: 'prioritization',
      });

      const sharedId = await reasoningBank.sharePattern(
        sourcePattern.id,
        'agent:target'
      );

      const shared = await reasoningBank.getPattern(sharedId);
      expect(shared.content).toBe('shared prioritization pattern');
      expect(shared.category).toBe('prioritization');
    });

    test('should share to multiple agents', async () => {
      const sourcePattern = await reasoningBank.createPattern({
        content: 'multi-agent pattern',
        namespace: 'agent:source',
      });

      const targets = ['agent:target1', 'agent:target2', 'agent:target3'];
      const sharedIds = await reasoningBank.sharePatternToMultiple(
        sourcePattern.id,
        targets
      );

      expect(sharedIds.length).toBe(3);

      for (let i = 0; i < targets.length; i++) {
        const shared = await reasoningBank.getPattern(sharedIds[i]);
        expect(shared.namespace).toBe(targets[i]);
      }
    });

    test('should optionally preserve outcome history when sharing', async () => {
      const sourcePattern = await reasoningBank.createPattern({
        content: 'pattern with history',
        namespace: 'agent:source',
      });

      // Add successful outcomes
      for (let i = 0; i < 5; i++) {
        await reasoningBank.recordOutcome(sourcePattern.id, { outcome: 'success' });
      }

      const sharedId = await reasoningBank.sharePattern(
        sourcePattern.id,
        'agent:target',
        { preserveHistory: true }
      );

      const shared = await reasoningBank.getPattern(sharedId);
      expect(shared.confidence).toBeGreaterThan(0.5);
    });

    test('should track shared pattern metadata', async () => {
      const sourcePattern = await reasoningBank.createPattern({
        content: 'tracked pattern',
        namespace: 'agent:source',
      });

      const before = Date.now();
      const sharedId = await reasoningBank.sharePattern(
        sourcePattern.id,
        'agent:target'
      );
      const after = Date.now();

      const shared = await reasoningBank.getPattern(sharedId);
      expect(shared.metadata).toHaveProperty('sharedFrom', sourcePattern.id);
      expect(shared.metadata.sharedAt).toBeGreaterThanOrEqual(before);
      expect(shared.metadata.sharedAt).toBeLessThanOrEqual(after);
    });

    test('should allow independent evolution of shared patterns', async () => {
      const sourcePattern = await reasoningBank.createPattern({
        content: 'evolving pattern',
        namespace: 'agent:source',
      });

      const sharedId = await reasoningBank.sharePattern(
        sourcePattern.id,
        'agent:target'
      );

      // Source has success
      await reasoningBank.recordOutcome(sourcePattern.id, { outcome: 'success' });

      // Shared has failure
      await reasoningBank.recordOutcome(sharedId, { outcome: 'failure' });

      const source = await reasoningBank.getPattern(sourcePattern.id);
      const shared = await reasoningBank.getPattern(sharedId);

      expect(source.confidence).not.toBe(shared.confidence);
    });
  });

  // ============================================================
  // NAMESPACE ISOLATION (6 tests)
  // ============================================================

  describe('Namespace Isolation', () => {
    test('should isolate patterns by namespace', async () => {
      await reasoningBank.createPattern({
        content: 'agent1 pattern',
        namespace: 'agent:agent1',
      });

      await reasoningBank.createPattern({
        content: 'agent2 pattern',
        namespace: 'agent:agent2',
      });

      const agent1Patterns = await reasoningBank.queryPatterns({
        query: 'pattern',
        namespace: 'agent:agent1',
        includeGlobal: false,
      });

      expect(agent1Patterns.length).toBe(1);
      expect(agent1Patterns[0].content).toBe('agent1 pattern');
    });

    test('should support global namespace accessible to all', async () => {
      await reasoningBank.createPattern({
        content: 'global pattern',
        namespace: 'global',
      });

      const patterns = await reasoningBank.queryPatterns({
        query: 'pattern',
        namespace: 'agent:any',
        includeGlobal: true,
      });

      expect(patterns.some(p => p.namespace === 'global')).toBe(true);
    });

    test('should support skill-specific namespaces', async () => {
      await reasoningBank.createPattern({
        content: 'task management pattern',
        namespace: 'skill:task-management',
      });

      const patterns = await reasoningBank.queryPatterns({
        query: 'pattern',
        namespace: 'skill:task-management',
      });

      expect(patterns[0].namespace).toBe('skill:task-management');
    });

    test('should prevent cross-namespace pollution', async () => {
      await reasoningBank.createPattern({
        content: 'private pattern',
        namespace: 'agent:private',
      });

      const patterns = await reasoningBank.queryPatterns({
        query: 'pattern',
        namespace: 'agent:public',
        includeGlobal: false,
      });

      expect(patterns.some(p => p.content === 'private pattern')).toBe(false);
    });

    test('should support hierarchical namespaces', async () => {
      await reasoningBank.createPattern({
        content: 'team pattern',
        namespace: 'team:engineering:backend',
      });

      const patterns = await reasoningBank.queryPatterns({
        query: 'pattern',
        namespace: 'team:engineering:backend',
      });

      expect(patterns[0].namespace).toBe('team:engineering:backend');
    });

    test('should count patterns per namespace correctly', async () => {
      for (let i = 0; i < 5; i++) {
        await reasoningBank.createPattern({
          content: `pattern ${i}`,
          namespace: 'agent:test',
        });
      }

      const count = await reasoningBank.countPatterns('agent:test');
      expect(count).toBe(5);
    });
  });

  // ============================================================
  // LEARNING FROM FAILURES (4 tests)
  // ============================================================

  describe('Learning from Failures', () => {
    test('should lower confidence on failure', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      await reasoningBank.recordOutcome(pattern.id, { outcome: 'failure' });

      const updated = await reasoningBank.getPattern(pattern.id);
      expect(updated.confidence).toBeLessThan(0.5);
    });

    test('should track failure reasons', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      await reasoningBank.recordOutcome(pattern.id, {
        outcome: 'failure',
        context: 'missing dependency',
        userFeedback: 'prerequisite not met',
      });

      const outcomes = await reasoningBank.getOutcomes(pattern.id);
      expect(outcomes[0].context).toBe('missing dependency');
    });

    test('should create alternative pattern after repeated failures', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'failing approach',
        namespace: 'test',
      });

      for (let i = 0; i < 3; i++) {
        await reasoningBank.recordOutcome(pattern.id, { outcome: 'failure' });
      }

      const alternative = await reasoningBank.createPattern({
        content: 'alternative approach',
        namespace: 'test',
      });

      await reasoningBank.createRelationship(
        pattern.id,
        alternative.id,
        'superseded-by'
      );

      const relationships = await reasoningBank.getRelationships(pattern.id);
      expect(relationships[0].relationshipType).toBe('superseded-by');
    });

    test('should maintain failure history for analysis', async () => {
      const pattern = await reasoningBank.createPattern({
        content: 'test pattern',
        namespace: 'test',
      });

      for (let i = 0; i < 5; i++) {
        await reasoningBank.recordOutcome(pattern.id, {
          outcome: 'failure',
          context: `failure scenario ${i}`,
        });
      }

      const outcomes = await reasoningBank.getOutcomes(pattern.id);
      const failures = outcomes.filter(o => o.outcome === 'failure');
      expect(failures.length).toBe(5);
    });
  });

  // ============================================================
  // PATTERN RELATIONSHIP TRACKING (2 tests)
  // ============================================================

  describe('Pattern Relationships', () => {
    test('should create relationship between patterns', async () => {
      const pattern1 = await reasoningBank.createPattern({
        content: 'pattern 1',
        namespace: 'test',
      });

      const pattern2 = await reasoningBank.createPattern({
        content: 'pattern 2',
        namespace: 'test',
      });

      await reasoningBank.createRelationship(
        pattern1.id,
        pattern2.id,
        'requires'
      );

      const relationships = await reasoningBank.getRelationships(pattern1.id);
      expect(relationships[0]).toMatchObject({
        targetPatternId: pattern2.id,
        relationshipType: 'requires',
      });
    });

    test('should support multiple relationship types', async () => {
      const pattern1 = await reasoningBank.createPattern({
        content: 'pattern 1',
        namespace: 'test',
      });

      const pattern2 = await reasoningBank.createPattern({
        content: 'pattern 2',
        namespace: 'test',
      });

      const types = ['requires', 'conflicts', 'complements', 'supersedes'];

      for (const type of types) {
        await reasoningBank.createRelationship(
          pattern1.id,
          pattern2.id,
          type as any
        );
      }

      const relationships = await reasoningBank.getRelationships(pattern1.id);
      expect(relationships.length).toBe(types.length);
    });
  });

  // ============================================================
  // MEMORY CLEANUP AND ARCHIVAL (2 tests)
  // ============================================================

  describe('Memory Cleanup', () => {
    test('should prune low-confidence patterns', async () => {
      const lowConf = await reasoningBank.createPattern({
        content: 'low confidence',
        namespace: 'test',
        confidence: 0.08,
      });

      const highConf = await reasoningBank.createPattern({
        content: 'high confidence',
        namespace: 'test',
        confidence: 0.9,
      });

      await reasoningBank.prunePatterns({ minConfidence: 0.1 });

      const patterns = await reasoningBank.queryPatterns({
        query: 'confidence',
        namespace: 'test',
        minConfidence: 0.0,
      });

      expect(patterns.some(p => p.id === lowConf.id)).toBe(false);
      expect(patterns.some(p => p.id === highConf.id)).toBe(true);
    });

    test('should archive old patterns', async () => {
      const oldPattern = await reasoningBank.createPattern({
        content: 'old pattern',
        namespace: 'test',
      });

      // Simulate pattern being very old
      await reasoningBank.db.prepare(
        'UPDATE patterns SET created_at = ? WHERE id = ?'
      ).run(Date.now() - (400 * 24 * 60 * 60 * 1000), oldPattern.id);

      const archived = await reasoningBank.archiveOldPatterns({ maxAgeDays: 365 });
      expect(archived).toBeGreaterThan(0);
    });
  });
});

// ============================================================
// MOCK REASONINGBANK SERVICE
// ============================================================

class ReasoningBankService {
  constructor(public db: Database.Database) {}

  async createPattern(config: any): Promise<any> {
    const id = uuid();
    const embedding = Buffer.alloc(4096);

    this.db.prepare(`
      INSERT INTO patterns (id, content, namespace, category, embedding, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      config.content,
      config.namespace || 'global',
      config.category,
      embedding,
      config.confidence || 0.5,
      Date.now(),
      Date.now()
    );

    return { id, ...config, confidence: config.confidence || 0.5 };
  }

  async queryPatterns(options: any): Promise<any[]> {
    const sql = `
      SELECT * FROM patterns
      WHERE namespace IN (?, 'global')
        AND confidence >= ?
      LIMIT ?
    `;

    return this.db.prepare(sql).all(
      options.namespace,
      options.minConfidence || 0.2,
      options.limit || 10
    );
  }

  async getPattern(id: string): Promise<any> {
    return this.db.prepare('SELECT * FROM patterns WHERE id = ?').get(id);
  }

  async recordOutcome(patternId: string, outcome: any): Promise<any> {
    const pattern = await this.getPattern(patternId);
    const confidenceBefore = pattern.confidence;
    const confidenceAfter = outcome.outcome === 'success'
      ? Math.min(0.95, confidenceBefore + 0.2)
      : Math.max(0.05, confidenceBefore - 0.15);

    this.db.prepare(`
      UPDATE patterns
      SET confidence = ?, success_count = success_count + ?, failure_count = failure_count + ?,
          total_invocations = total_invocations + 1, last_used_at = ?
      WHERE id = ?
    `).run(
      confidenceAfter,
      outcome.outcome === 'success' ? 1 : 0,
      outcome.outcome === 'failure' ? 1 : 0,
      Date.now(),
      patternId
    );

    this.db.prepare(`
      INSERT INTO pattern_outcomes (id, pattern_id, outcome, confidence_before, confidence_after, confidence_delta, timestamp, context, user_feedback, execution_time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuid(),
      patternId,
      outcome.outcome,
      confidenceBefore,
      confidenceAfter,
      confidenceAfter - confidenceBefore,
      Date.now(),
      outcome.context,
      outcome.userFeedback,
      outcome.executionTimeMs
    );

    return { confidenceBefore, confidenceAfter, confidenceDelta: confidenceAfter - confidenceBefore };
  }

  async getOutcomes(patternId: string): Promise<any[]> {
    return this.db.prepare('SELECT * FROM pattern_outcomes WHERE pattern_id = ?').all(patternId);
  }

  async sharePattern(sourceId: string, targetNamespace: string, options: any = {}): Promise<string> {
    const source = await this.getPattern(sourceId);
    const sharedId = uuid();
    const confidence = options.confidenceMultiplier
      ? source.confidence * options.confidenceMultiplier
      : source.confidence * 0.8;

    this.db.prepare(`
      INSERT INTO patterns (id, content, namespace, category, embedding, confidence, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sharedId,
      source.content,
      targetNamespace,
      source.category,
      source.embedding,
      confidence,
      Date.now(),
      Date.now(),
      JSON.stringify({ sharedFrom: sourceId, sharedAt: Date.now() })
    );

    this.db.prepare(`
      INSERT INTO pattern_relationships (id, source_pattern_id, target_pattern_id, relationship_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuid(), sourceId, sharedId, 'shared-to', Date.now());

    return sharedId;
  }

  async sharePatternToMultiple(sourceId: string, targets: string[]): Promise<string[]> {
    return Promise.all(targets.map(t => this.sharePattern(sourceId, t)));
  }

  async createRelationship(sourceId: string, targetId: string, type: string): Promise<void> {
    this.db.prepare(`
      INSERT INTO pattern_relationships (id, source_pattern_id, target_pattern_id, relationship_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuid(), sourceId, targetId, type, Date.now());
  }

  async getRelationships(patternId: string): Promise<any[]> {
    return this.db.prepare('SELECT * FROM pattern_relationships WHERE source_pattern_id = ?').all(patternId);
  }

  async countPatterns(namespace: string): Promise<number> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM patterns WHERE namespace = ?').get(namespace);
    return result.count;
  }

  async prunePatterns(options: any): Promise<number> {
    const result = this.db.prepare('DELETE FROM patterns WHERE confidence < ?').run(options.minConfidence);
    return result.changes;
  }

  async archiveOldPatterns(options: any): Promise<number> {
    const cutoff = Date.now() - (options.maxAgeDays * 24 * 60 * 60 * 1000);
    const result = this.db.prepare('DELETE FROM patterns WHERE created_at < ?').run(cutoff);
    return result.changes;
  }
}

function initializeSchema(db: Database.Database): void {
  db.prepare(`
    CREATE TABLE patterns (
      id TEXT PRIMARY KEY,
      namespace TEXT NOT NULL DEFAULT 'global',
      agent_id TEXT,
      skill_id TEXT,
      content TEXT NOT NULL,
      category TEXT,
      embedding BLOB NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.5,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      total_invocations INTEGER DEFAULT 0,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_used_at INTEGER
    )
  `).run();

  db.prepare(`
    CREATE TABLE pattern_outcomes (
      id TEXT PRIMARY KEY,
      pattern_id TEXT NOT NULL,
      outcome TEXT NOT NULL,
      context TEXT,
      user_feedback TEXT,
      confidence_before REAL NOT NULL,
      confidence_after REAL NOT NULL,
      confidence_delta REAL NOT NULL,
      execution_time_ms INTEGER,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
    )
  `).run();

  db.prepare(`
    CREATE TABLE pattern_relationships (
      id TEXT PRIMARY KEY,
      source_pattern_id TEXT NOT NULL,
      target_pattern_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (source_pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
      FOREIGN KEY (target_pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
      UNIQUE(source_pattern_id, target_pattern_id, relationship_type)
    )
  `).run();
}
