/**
 * Load Testing Script for Link Preview Service
 * Can be run independently: node tests/link-preview/performance/load-test.js
 */

import { performance } from 'perf_hooks';
import { linkPreviewService } from '../../../src/services/LinkPreviewService.js';
import { databaseService } from '../../../src/database/DatabaseService.js';

class LoadTestRunner {
  constructor() {
    this.results = [];
    this.errors = [];
    this.startTime = 0;
    this.endTime = 0;
  }

  async initialize() {
    console.log('🚀 Initializing Load Test Environment...');
    await databaseService.initialize();
    console.log('✅ Database initialized');
    
    // Clear cache for clean testing
    await linkPreviewService.clearExpiredCache();
    console.log('✅ Cache cleared');
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    await databaseService.close();
    console.log('✅ Database closed');
  }

  async runSingleRequest(url, requestId) {
    const startTime = performance.now();
    
    try {
      const result = await linkPreviewService.getLinkPreview(url);
      const endTime = performance.now();
      
      return {
        requestId,
        url,
        executionTime: endTime - startTime,
        success: !result.error,
        error: result.error || null,
        title: result.title,
        type: result.type,
        cached: result.cached_at ? true : false
      };
    } catch (error) {
      const endTime = performance.now();
      
      return {
        requestId,
        url,
        executionTime: endTime - startTime,
        success: false,
        error: error.message,
        title: null,
        type: 'error',
        cached: false
      };
    }
  }

  async runConcurrentLoad(urls, concurrency, duration) {
    console.log(`\n📊 Running Concurrent Load Test:`);
    console.log(`   • URLs: ${urls.length}`);
    console.log(`   • Concurrency: ${concurrency}`);
    console.log(`   • Duration: ${duration}ms`);

    const results = [];
    const startTime = performance.now();
    let requestId = 0;
    let activeRequests = 0;

    return new Promise((resolve) => {
      const makeRequest = async () => {
        if (activeRequests >= concurrency) return;
        if (performance.now() - startTime > duration) return;

        activeRequests++;
        const currentRequestId = ++requestId;
        const url = urls[Math.floor(Math.random() * urls.length)];

        try {
          const result = await this.runSingleRequest(url, currentRequestId);
          results.push(result);
        } catch (error) {
          results.push({
            requestId: currentRequestId,
            url,
            executionTime: 0,
            success: false,
            error: error.message,
            cached: false
          });
        }

        activeRequests--;
        
        // Schedule next request if still within duration
        if (performance.now() - startTime < duration) {
          setTimeout(makeRequest, Math.random() * 100); // Random interval 0-100ms
        }
      };

      // Start initial batch of concurrent requests
      for (let i = 0; i < concurrency; i++) {
        setTimeout(makeRequest, i * 10); // Stagger initial requests
      }

      // Check for completion
      const checkComplete = () => {
        if (performance.now() - startTime > duration && activeRequests === 0) {
          resolve(results);
        } else {
          setTimeout(checkComplete, 100);
        }
      };

      setTimeout(checkComplete, duration + 1000);
    });
  }

  async runStepLoad(urls, maxConcurrency, stepDuration) {
    console.log(`\n📈 Running Step Load Test:`);
    console.log(`   • Max Concurrency: ${maxConcurrency}`);
    console.log(`   • Step Duration: ${stepDuration}ms`);

    const stepResults = [];
    
    for (let concurrency = 1; concurrency <= maxConcurrency; concurrency += Math.max(1, Math.floor(maxConcurrency / 10))) {
      console.log(`\n🔄 Step ${concurrency}/${maxConcurrency} concurrent requests...`);
      
      const stepStart = performance.now();
      const results = await this.runConcurrentLoad(urls, concurrency, stepDuration);
      const stepEnd = performance.now();

      const stepStats = this.analyzeResults(results);
      stepStats.concurrency = concurrency;
      stepStats.stepDuration = stepEnd - stepStart;
      
      stepResults.push(stepStats);
      
      console.log(`   ✅ Completed: ${stepStats.successRate}% success, ${stepStats.avgResponseTime}ms avg`);
      
      // Wait between steps
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return stepResults;
  }

  async runSoakTest(urls, concurrency, duration) {
    console.log(`\n🏃‍♂️ Running Soak Test:`);
    console.log(`   • Concurrency: ${concurrency}`);
    console.log(`   • Duration: ${duration}ms (${Math.round(duration / 60000)} minutes)`);

    const soakResults = [];
    const intervalDuration = Math.min(30000, duration / 10); // 30s intervals or 10% of total
    let remainingDuration = duration;

    while (remainingDuration > 0) {
      const currentInterval = Math.min(intervalDuration, remainingDuration);
      const intervalStart = performance.now();
      
      console.log(`   ⏱️  Interval: ${Math.round((duration - remainingDuration) / 1000)}s - ${Math.round((duration - remainingDuration + currentInterval) / 1000)}s`);
      
      const results = await this.runConcurrentLoad(urls, concurrency, currentInterval);
      const intervalStats = this.analyzeResults(results);
      intervalStats.intervalStart = duration - remainingDuration;
      intervalStats.intervalDuration = currentInterval;
      
      soakResults.push(intervalStats);
      
      remainingDuration -= currentInterval;
      
      // Monitor memory usage
      const memUsage = process.memoryUsage();
      console.log(`   💾 Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS`);
    }

    return soakResults;
  }

  analyzeResults(results) {
    if (!results || results.length === 0) {
      return {
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0,
        errorRate: 0
      };
    }

    const totalRequests = results.length;
    const successCount = results.filter(r => r.success).length;
    const failureCount = totalRequests - successCount;
    
    const responseTimes = results.map(r => r.executionTime).sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    return {
      totalRequests,
      successCount,
      failureCount,
      successRate: Math.round((successCount / totalRequests) * 100 * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      minResponseTime: responseTimes[0] || 0,
      maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0,
      throughput: Math.round((successCount / (avgResponseTime / 1000)) * 100) / 100,
      errorRate: Math.round((failureCount / totalRequests) * 100 * 100) / 100
    };
  }

  printResults(results, title) {
    console.log(`\n📋 ${title}`);
    console.log('═'.repeat(80));
    
    if (Array.isArray(results) && results.length > 0 && typeof results[0] === 'object') {
      // Multiple test results
      console.table(results);
    } else {
      // Single test result
      Object.entries(results).forEach(([key, value]) => {
        const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const displayValue = typeof value === 'number' ? 
          (key.includes('Time') ? `${value}ms` : 
           key.includes('Rate') || key.includes('Ratio') ? `${value}%` : 
           value) : value;
        console.log(`${displayKey.padEnd(20)}: ${displayValue}`);
      });
    }
  }
}

// Test configurations
const TEST_URLS = [
  'https://httpbin.org/html',
  'https://httpbin.org/json', 
  'https://httpbin.org/xml',
  'https://httpbin.org/robots.txt',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
];

const TEST_SCENARIOS = {
  smoke: {
    name: 'Smoke Test',
    concurrency: 2,
    duration: 10000, // 10 seconds
  },
  load: {
    name: 'Load Test', 
    concurrency: 10,
    duration: 30000, // 30 seconds
  },
  stress: {
    name: 'Stress Test',
    concurrency: 25,
    duration: 60000, // 1 minute
  },
  spike: {
    name: 'Spike Test',
    maxConcurrency: 50,
    stepDuration: 15000, // 15 seconds per step
  },
  soak: {
    name: 'Soak Test',
    concurrency: 5,
    duration: 300000, // 5 minutes
  }
};

async function main() {
  const runner = new LoadTestRunner();
  
  try {
    await runner.initialize();
    
    // Get test scenario from command line args
    const scenario = process.argv[2] || 'smoke';
    const config = TEST_SCENARIOS[scenario];
    
    if (!config) {
      console.error(`❌ Unknown test scenario: ${scenario}`);
      console.log(`Available scenarios: ${Object.keys(TEST_SCENARIOS).join(', ')}`);
      process.exit(1);
    }

    console.log(`\n🎯 Starting ${config.name}...`);
    console.log(`📅 ${new Date().toISOString()}`);

    let results;
    
    switch (scenario) {
      case 'spike':
        results = await runner.runStepLoad(TEST_URLS, config.maxConcurrency, config.stepDuration);
        runner.printResults(results, `${config.name} Results`);
        break;
        
      case 'soak':
        results = await runner.runSoakTest(TEST_URLS, config.concurrency, config.duration);
        runner.printResults(results, `${config.name} Results`);
        break;
        
      default:
        results = await runner.runConcurrentLoad(TEST_URLS, config.concurrency, config.duration);
        const analysis = runner.analyzeResults(results);
        runner.printResults(analysis, `${config.name} Results`);
        break;
    }

    console.log(`\n✅ ${config.name} completed successfully!`);
    
  } catch (error) {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  } finally {
    await runner.cleanup();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { LoadTestRunner };