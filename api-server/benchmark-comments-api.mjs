#!/usr/bin/env node

/**
 * Comment API Performance Benchmark
 * Tests GET and POST endpoints with comprehensive metrics
 */

import { performance } from 'perf_hooks';

// Test configuration
const API_BASE = 'http://localhost:3001/api';
const TEST_POST_ID = '00efd9c5-f1d3-4cf2-a0b9-13c71b79ad90';
const GET_ITERATIONS = 10;
const POST_ITERATIONS = 5;
const CONCURRENT_REQUESTS = 10;

class PerformanceBenchmark {
  constructor() {
    this.results = {
      get_comments: [],
      post_comment: [],
      concurrent_get: [],
      errors: []
    };
  }

  async makeRequest(method, path, data = null) {
    const startTime = performance.now();
    const url = `${API_BASE}${path}`;

    try {
      const options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const firstByteTime = performance.now();
      const response = await fetch(url, options);
      const responseData = await response.json();
      const endTime = performance.now();

      return {
        statusCode: response.status,
        headers: response.headers,
        data: responseData,
        timing: {
          total: endTime - startTime,
          firstByte: firstByteTime - startTime,
          download: endTime - firstByteTime
        },
        size: JSON.stringify(responseData).length
      };
    } catch (error) {
      const endTime = performance.now();
      throw {
        error: error.message,
        timing: { total: endTime - startTime }
      };
    }
  }

  async benchmarkGetComments() {
    console.log('\n📊 Benchmark 1: GET Comments Endpoint');
    console.log('━'.repeat(60));

    for (let i = 0; i < GET_ITERATIONS; i++) {
      try {
        const result = await this.makeRequest(
          'GET',
          `/agent-posts/${TEST_POST_ID}/comments`
        );

        this.results.get_comments.push({
          iteration: i + 1,
          statusCode: result.statusCode,
          timing: result.timing,
          size: result.size,
          commentCount: result.data?.length || 0,
          success: result.statusCode === 200
        });

        console.log(`  ✓ Iteration ${i + 1}: ${result.timing.total.toFixed(2)}ms (${result.statusCode}) - ${result.data?.length || 0} comments`);
      } catch (error) {
        this.results.errors.push({
          test: 'GET_COMMENTS',
          iteration: i + 1,
          error: error.error || error.message
        });
        console.log(`  ✗ Iteration ${i + 1}: ${error.error || error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async benchmarkPostComment() {
    console.log('\n📝 Benchmark 2: POST Comment Endpoint');
    console.log('━'.repeat(60));

    for (let i = 0; i < POST_ITERATIONS; i++) {
      try {
        const commentData = {
          author: `BenchmarkUser${i + 1}`,
          content: `Performance test comment #${i + 1} - ${new Date().toISOString()}`,
          timestamp: new Date().toISOString()
        };

        const result = await this.makeRequest(
          'POST',
          `/agent-posts/${TEST_POST_ID}/comments`,
          commentData
        );

        this.results.post_comment.push({
          iteration: i + 1,
          statusCode: result.statusCode,
          timing: result.timing,
          size: result.size,
          success: result.statusCode === 201 || result.statusCode === 200
        });

        console.log(`  ✓ Iteration ${i + 1}: ${result.timing.total.toFixed(2)}ms (${result.statusCode})`);
      } catch (error) {
        this.results.errors.push({
          test: 'POST_COMMENT',
          iteration: i + 1,
          error: error.error || error.message
        });
        console.log(`  ✗ Iteration ${i + 1}: ${error.error || error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async benchmarkConcurrentRequests() {
    console.log('\n🚀 Benchmark 3: Concurrent Load Test');
    console.log('━'.repeat(60));
    console.log(`  Simulating ${CONCURRENT_REQUESTS} concurrent GET requests...`);

    const startTime = performance.now();
    const promises = [];

    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      promises.push(
        this.makeRequest('GET', `/agent-posts/${TEST_POST_ID}/comments`)
          .then(result => ({
            iteration: i + 1,
            statusCode: result.statusCode,
            timing: result.timing,
            success: result.statusCode === 200
          }))
          .catch(error => ({
            iteration: i + 1,
            error: error.error || error.message,
            success: false
          }))
      );
    }

    const results = await Promise.all(promises);
    const totalTime = performance.now() - startTime;

    this.results.concurrent_get = results;

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    console.log(`  ✓ Completed ${CONCURRENT_REQUESTS} concurrent requests in ${totalTime.toFixed(2)}ms`);
    console.log(`  Success: ${successCount}/${CONCURRENT_REQUESTS} (${((successCount/CONCURRENT_REQUESTS)*100).toFixed(1)}%)`);
    if (failCount > 0) {
      console.log(`  ✗ Failures: ${failCount}`);
    }
  }

  calculateStats(timings) {
    if (timings.length === 0) return null;

    const sorted = timings.slice().sort((a, b) => a - b);
    const sum = timings.reduce((a, b) => a + b, 0);

    return {
      count: timings.length,
      avg: sum / timings.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  generateReport() {
    console.log('\n📈 PERFORMANCE REPORT');
    console.log('═'.repeat(60));

    const getTimings = this.results.get_comments
      .filter(r => r.success)
      .map(r => r.timing.total);
    const getStats = this.calculateStats(getTimings);
    const getSuccessRate = (this.results.get_comments.filter(r => r.success).length /
                            this.results.get_comments.length) * 100;

    console.log('\n1️⃣  GET /agent-posts/:postId/comments');
    console.log('─'.repeat(60));
    if (getStats) {
      console.log(`   Response Times:`);
      console.log(`   ├─ Average:  ${getStats.avg.toFixed(2)}ms`);
      console.log(`   ├─ Median:   ${getStats.median.toFixed(2)}ms`);
      console.log(`   ├─ Min:      ${getStats.min.toFixed(2)}ms`);
      console.log(`   ├─ Max:      ${getStats.max.toFixed(2)}ms`);
      console.log(`   ├─ P95:      ${getStats.p95.toFixed(2)}ms`);
      console.log(`   └─ P99:      ${getStats.p99.toFixed(2)}ms`);
      console.log(`   Success Rate: ${getSuccessRate.toFixed(1)}% (${this.results.get_comments.filter(r => r.success).length}/${this.results.get_comments.length})`);

      const avgSize = this.results.get_comments
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.size, 0) / this.results.get_comments.filter(r => r.success).length;
      console.log(`   Avg Response Size: ${avgSize.toFixed(0)} bytes`);
    }

    const postTimings = this.results.post_comment
      .filter(r => r.success)
      .map(r => r.timing.total);
    const postStats = this.calculateStats(postTimings);
    const postSuccessRate = (this.results.post_comment.filter(r => r.success).length /
                             this.results.post_comment.length) * 100;

    console.log('\n2️⃣  POST /agent-posts/:postId/comments');
    console.log('─'.repeat(60));
    if (postStats) {
      console.log(`   Response Times:`);
      console.log(`   ├─ Average:  ${postStats.avg.toFixed(2)}ms`);
      console.log(`   ├─ Median:   ${postStats.median.toFixed(2)}ms`);
      console.log(`   ├─ Min:      ${postStats.min.toFixed(2)}ms`);
      console.log(`   ├─ Max:      ${postStats.max.toFixed(2)}ms`);
      console.log(`   ├─ P95:      ${postStats.p95.toFixed(2)}ms`);
      console.log(`   └─ P99:      ${postStats.p99.toFixed(2)}ms`);
      console.log(`   Success Rate: ${postSuccessRate.toFixed(1)}% (${this.results.post_comment.filter(r => r.success).length}/${this.results.post_comment.length})`);
    }

    const concurrentTimings = this.results.concurrent_get
      .filter(r => r.success)
      .map(r => r.timing.total);
    const concurrentStats = this.calculateStats(concurrentTimings);
    const concurrentSuccessRate = (this.results.concurrent_get.filter(r => r.success).length /
                                   this.results.concurrent_get.length) * 100;

    console.log('\n3️⃣  Concurrent Load Test (10 simultaneous requests)');
    console.log('─'.repeat(60));
    if (concurrentStats) {
      console.log(`   Response Times:`);
      console.log(`   ├─ Average:  ${concurrentStats.avg.toFixed(2)}ms`);
      console.log(`   ├─ Median:   ${concurrentStats.median.toFixed(2)}ms`);
      console.log(`   ├─ Min:      ${concurrentStats.min.toFixed(2)}ms`);
      console.log(`   ├─ Max:      ${concurrentStats.max.toFixed(2)}ms`);
      console.log(`   ├─ P95:      ${concurrentStats.p95.toFixed(2)}ms`);
      console.log(`   └─ P99:      ${concurrentStats.p99.toFixed(2)}ms`);
      console.log(`   Success Rate: ${concurrentSuccessRate.toFixed(1)}% (${this.results.concurrent_get.filter(r => r.success).length}/${this.results.concurrent_get.length})`);
    }

    console.log('\n📊 PERFORMANCE ASSESSMENT');
    console.log('─'.repeat(60));

    const assessments = [];

    if (getStats && getStats.avg < 50) {
      assessments.push('✓ GET endpoint: EXCELLENT (<50ms avg)');
    } else if (getStats && getStats.avg < 100) {
      assessments.push('✓ GET endpoint: GOOD (<100ms avg)');
    } else if (getStats) {
      assessments.push('⚠ GET endpoint: NEEDS OPTIMIZATION (>100ms avg)');
    }

    if (postStats && postStats.avg < 100) {
      assessments.push('✓ POST endpoint: EXCELLENT (<100ms avg)');
    } else if (postStats && postStats.avg < 200) {
      assessments.push('✓ POST endpoint: GOOD (<200ms avg)');
    } else if (postStats) {
      assessments.push('⚠ POST endpoint: NEEDS OPTIMIZATION (>200ms avg)');
    }

    if (concurrentSuccessRate === 100) {
      assessments.push('✓ Concurrent load: NO ERRORS (100% success)');
    } else if (concurrentSuccessRate >= 95) {
      assessments.push('⚠ Concurrent load: MINOR ISSUES (>95% success)');
    } else {
      assessments.push('✗ Concurrent load: PERFORMANCE ISSUES (<95% success)');
    }

    assessments.forEach(a => console.log(`   ${a}`));

    console.log('\n💡 RECOMMENDATIONS');
    console.log('─'.repeat(60));

    if (getStats && getStats.p99 > getStats.avg * 2) {
      console.log('   ⚠ High P99 latency variance detected for GET');
      console.log('     → Consider adding database query caching');
      console.log('     → Review database indexes on comments table');
    }

    if (postStats && postStats.avg > 150) {
      console.log('   ⚠ POST comment latency could be improved');
      console.log('     → Consider async processing for non-critical operations');
      console.log('     → Review database write performance');
    }

    if (concurrentSuccessRate < 100) {
      console.log('   ⚠ Concurrent request failures detected');
      console.log('     → Check server connection pool settings');
      console.log('     → Review database connection limits');
    }

    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS DETECTED');
      console.log('─'.repeat(60));
      this.results.errors.forEach(err => {
        console.log(`   ${err.test} (iteration ${err.iteration}): ${err.error}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('Benchmark Complete ✓');
    console.log('═'.repeat(60) + '\n');

    return {
      get_comments: { stats: getStats, successRate: getSuccessRate },
      post_comment: { stats: postStats, successRate: postSuccessRate },
      concurrent_load: { stats: concurrentStats, successRate: concurrentSuccessRate },
      errors: this.results.errors
    };
  }

  async run() {
    console.log('🚀 Comment API Performance Benchmark Suite');
    console.log('═'.repeat(60));
    console.log(`Target: ${API_BASE}`);
    console.log(`Test Post ID: ${TEST_POST_ID}`);
    console.log(`Started: ${new Date().toISOString()}\n`);

    try {
      await this.benchmarkGetComments();
      await this.benchmarkPostComment();
      await this.benchmarkConcurrentRequests();

      return this.generateReport();
    } catch (error) {
      console.error('\n❌ Benchmark failed:', error);
      throw error;
    }
  }
}

const benchmark = new PerformanceBenchmark();
benchmark.run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
