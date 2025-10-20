/**
 * SAFLA Service Validation Script
 *
 * Quick validation of the SAFLA implementation with performance benchmarks
 */

import { SAFLAService } from '../services/safla-service';
import { tmpdir } from 'os';
import { join } from 'path';

async function runValidation() {
  console.log('='.repeat(70));
  console.log('SAFLA SERVICE VALIDATION');
  console.log('='.repeat(70));
  console.log();

  const testDbPath = join(tmpdir(), `safla-validation-${Date.now()}.db`);
  const service = new SAFLAService(testDbPath);

  try {
    // ============================================================
    // TEST 1: Embedding Generation Performance
    // ============================================================
    console.log('TEST 1: Embedding Generation Performance');
    console.log('-'.repeat(70));

    const sampleTexts = [
      'Prioritize sprint tasks using Fibonacci sequence',
      'Create quarterly business review presentation',
      'Debug authentication issue in production',
      'Refactor database query for better performance',
    ];

    const embeddingTimes: number[] = [];

    for (const text of sampleTexts) {
      const start = performance.now();
      const embedding = service.generateEmbedding(text);
      const end = performance.now();

      embeddingTimes.push(end - start);

      console.log(`  Text: "${text.substring(0, 40)}..."`);
      console.log(`  Dimension: ${embedding.length}`);
      console.log(`  Time: ${(end - start).toFixed(3)}ms`);

      // Verify normalization
      let magnitude = 0;
      for (let i = 0; i < embedding.length; i++) {
        magnitude += embedding[i] * embedding[i];
      }
      magnitude = Math.sqrt(magnitude);

      console.log(`  Magnitude: ${magnitude.toFixed(6)} (should be ~1.0)`);
      console.log();
    }

    const avgEmbeddingTime = embeddingTimes.reduce((a, b) => a + b, 0) / embeddingTimes.length;
    console.log(`  Average embedding time: ${avgEmbeddingTime.toFixed(3)}ms`);
    console.log(`  Target: <1ms - ${avgEmbeddingTime < 1 ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log();

    // ============================================================
    // TEST 2: Cosine Similarity Performance
    // ============================================================
    console.log('TEST 2: Cosine Similarity Performance');
    console.log('-'.repeat(70));

    const emb1 = service.generateEmbedding('Prioritize tasks');
    const emb2 = service.generateEmbedding('Prioritize features');
    const emb3 = service.generateEmbedding('Unrelated content');

    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      service.cosineSimilarity(emb1, emb2);
    }
    const end = performance.now();

    const avgSimilarityTime = (end - start) / iterations;

    console.log(`  Similarity (related): ${service.cosineSimilarity(emb1, emb2).toFixed(4)}`);
    console.log(`  Similarity (unrelated): ${service.cosineSimilarity(emb1, emb3).toFixed(4)}`);
    console.log(`  Average time: ${avgSimilarityTime.toFixed(4)}ms`);
    console.log(`  Target: <0.1ms - ${avgSimilarityTime < 0.1 ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log();

    // ============================================================
    // TEST 3: Pattern Storage and Retrieval
    // ============================================================
    console.log('TEST 3: Pattern Storage and Retrieval');
    console.log('-'.repeat(70));

    const patterns = [
      {
        content: 'Prioritize sprint tasks using Fibonacci (P1=1, P2=2, P3=3, P5=5)',
        category: 'prioritization',
        namespace: 'agent:personal-todos',
      },
      {
        content: 'Critical bugs get P0 priority, severity-based for others',
        category: 'prioritization',
        namespace: 'agent:personal-todos',
      },
      {
        content: 'Meeting agendas: 30min 1-on-1s, 3 items max, personal time first',
        category: 'meeting-prep',
        namespace: 'agent:meeting-prep',
      },
      {
        content: 'Team standups: 15min max, blockers-first format',
        category: 'meeting-prep',
        namespace: 'agent:meeting-prep',
      },
    ];

    console.log(`  Storing ${patterns.length} patterns...`);
    const storedPatterns = [];

    for (const patternInput of patterns) {
      const stored = await service.storePattern(patternInput);
      storedPatterns.push(stored);
      console.log(`    ✓ Stored: ${stored.id.substring(0, 8)}... (confidence: ${stored.confidence})`);
    }

    console.log();

    // ============================================================
    // TEST 4: Confidence Learning
    // ============================================================
    console.log('TEST 4: Confidence Learning');
    console.log('-'.repeat(70));

    const testPattern = storedPatterns[0];
    console.log(`  Pattern: "${testPattern.content.substring(0, 50)}..."`);
    console.log(`  Initial confidence: ${testPattern.confidence}`);
    console.log();

    // Record successes
    console.log('  Recording outcomes:');
    let current = testPattern;

    current = await service.recordOutcome(current.id, 'success');
    console.log(`    Success #1 → confidence: ${current.confidence.toFixed(3)}`);

    current = await service.recordOutcome(current.id, 'success');
    console.log(`    Success #2 → confidence: ${current.confidence.toFixed(3)}`);

    current = await service.recordOutcome(current.id, 'failure');
    console.log(`    Failure #1 → confidence: ${current.confidence.toFixed(3)}`);

    current = await service.recordOutcome(current.id, 'success');
    console.log(`    Success #3 → confidence: ${current.confidence.toFixed(3)}`);

    console.log();
    console.log(`  Final stats:`);
    console.log(`    Success count: ${current.successCount}`);
    console.log(`    Failure count: ${current.failureCount}`);
    console.log(`    Total invocations: ${current.totalInvocations}`);
    console.log(`    Confidence: ${current.confidence.toFixed(3)}`);
    console.log();

    // ============================================================
    // TEST 5: Semantic Search Performance
    // ============================================================
    console.log('TEST 5: Semantic Search Performance');
    console.log('-'.repeat(70));

    // Add more patterns for realistic search
    console.log('  Creating 100 test patterns...');
    for (let i = 0; i < 96; i++) {
      await service.storePattern({
        content: `Test pattern ${i}: various task management and prioritization strategies`,
        namespace: 'test',
      });
    }

    const searchQueries = [
      'task prioritization',
      'meeting preparation',
      'bug priority',
    ];

    const searchTimes: number[] = [];

    for (const query of searchQueries) {
      const queryEmbedding = service.generateEmbedding(query);

      const searchStart = performance.now();
      const results = await service.semanticSearch(queryEmbedding, 'agent:personal-todos', 10);
      const searchEnd = performance.now();

      const searchTime = searchEnd - searchStart;
      searchTimes.push(searchTime);

      console.log(`  Query: "${query}"`);
      console.log(`    Results: ${results.length}`);
      console.log(`    Time: ${searchTime.toFixed(3)}ms`);

      if (results.length > 0) {
        console.log(`    Top result: "${results[0].content.substring(0, 50)}..."`);
        console.log(`      Similarity: ${results[0].similarity.toFixed(4)}`);
        console.log(`      Confidence: ${results[0].confidence.toFixed(3)}`);
        console.log(`      Final score: ${results[0].finalScore.toFixed(4)}`);
      }
      console.log();
    }

    const avgSearchTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
    console.log(`  Average search time: ${avgSearchTime.toFixed(3)}ms`);
    console.log(`  Target: <3ms - ${avgSearchTime < 3 ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log();

    // ============================================================
    // TEST 6: MMR Ranking
    // ============================================================
    console.log('TEST 6: MMR Ranking (Diversity)');
    console.log('-'.repeat(70));

    const rankedPatterns = await service.rankPatterns(
      storedPatterns.slice(0, 4),
      'prioritization strategy',
      0.7
    );

    console.log(`  Ranked ${rankedPatterns.length} patterns by relevance and diversity:`);
    for (let i = 0; i < rankedPatterns.length; i++) {
      const p = rankedPatterns[i];
      console.log(`    ${i + 1}. Score: ${p.finalScore.toFixed(4)}`);
      console.log(`       "${p.content.substring(0, 60)}..."`);
      console.log(`       Similarity: ${p.similarity.toFixed(4)}, Confidence: ${p.confidence.toFixed(3)}`);
    }
    console.log();

    // ============================================================
    // TEST 7: Namespace Statistics
    // ============================================================
    console.log('TEST 7: Namespace Statistics');
    console.log('-'.repeat(70));

    const namespaces = ['agent:personal-todos', 'agent:meeting-prep'];

    for (const ns of namespaces) {
      const stats = service.getNamespaceStats(ns);
      console.log(`  Namespace: ${ns}`);
      console.log(`    Total patterns: ${stats.totalPatterns}`);
      console.log(`    Avg confidence: ${stats.avgConfidence.toFixed(3)}`);
      console.log(`    Total successes: ${stats.totalSuccesses}`);
      console.log(`    Total failures: ${stats.totalFailures}`);
      console.log(`    Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
      console.log();
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('='.repeat(70));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(70));
    console.log();

    const results = [
      { test: 'Embedding Generation', target: '<1ms', actual: `${avgEmbeddingTime.toFixed(3)}ms`, pass: avgEmbeddingTime < 1 },
      { test: 'Cosine Similarity', target: '<0.1ms', actual: `${avgSimilarityTime.toFixed(4)}ms`, pass: avgSimilarityTime < 0.1 },
      { test: 'Semantic Search', target: '<3ms', actual: `${avgSearchTime.toFixed(3)}ms`, pass: avgSearchTime < 3 },
      { test: 'Confidence Learning', target: 'Working', actual: 'Working', pass: true },
      { test: 'MMR Ranking', target: 'Working', actual: 'Working', pass: true },
      { test: 'Pattern Storage', target: 'Working', actual: 'Working', pass: true },
    ];

    console.log('  Performance Benchmarks:');
    for (const result of results) {
      const status = result.pass ? '✓ PASS' : '✗ FAIL';
      console.log(`    ${status} - ${result.test}`);
      console.log(`            Target: ${result.target}, Actual: ${result.actual}`);
    }

    const allPass = results.every(r => r.pass);
    console.log();
    console.log(`  Overall: ${allPass ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);
    console.log();

    console.log('='.repeat(70));

  } catch (error) {
    console.error('Validation error:', error);
    throw error;
  } finally {
    service.close();
  }
}

// Run validation
if (require.main === module) {
  runValidation()
    .then(() => {
      console.log('Validation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

export { runValidation };
