#!/usr/bin/env node

/**
 * Performance and Stability Validation
 * Load testing and performance benchmarking for the system
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import WebSocket from 'ws';

const API_BASE_URL = 'http://localhost:3000';
const WS_BASE_URL = 'ws://localhost:3000';

console.log('🚀 Starting Performance and Stability Validation');
console.log('=' .repeat(60));

const results = {
  performance: {},
  stability: {},
  memory: {},
  concurrency: {}
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Performance Benchmarking
async function benchmarkResponseTimes() {
  console.log('📊 Benchmarking Response Times...');
  
  const endpoints = [
    { name: 'Health', url: '/health' },
    { name: 'Claude Instances', url: '/api/claude/instances' },
    { name: 'Feed API', url: '/api/v1/agent-posts' }
  ];
  
  for (const endpoint of endpoints) {
    const times = [];
    const iterations = 20;
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint.url}`);
        await response.text();
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        console.log(`⚠️ ${endpoint.name}: Request failed - ${error.message}`);
      }
      
      await delay(10); // Small delay between requests
    }
    
    if (times.length > 0) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
      
      results.performance[endpoint.name] = {
        average: avg,
        min: min,
        max: max,
        p95: p95,
        samples: times.length
      };
      
      console.log(`  ${endpoint.name}: avg=${avg.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
    }
  }
}

// Concurrent Load Testing
async function testConcurrentLoad() {
  console.log('\\n🔄 Testing Concurrent Load...');
  
  const concurrencyLevels = [5, 10, 20, 50];
  
  for (const concurrency of concurrencyLevels) {
    console.log(`  Testing ${concurrency} concurrent requests...`);
    
    const start = performance.now();
    const requests = Array.from({ length: concurrency }, async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return {
          success: response.status === 200,
          status: response.status,
          time: performance.now() - start
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          time: performance.now() - start
        };
      }
    });
    
    const responses = await Promise.all(requests);
    const end = performance.now();
    
    const successful = responses.filter(r => r.success).length;
    const successRate = (successful / concurrency) * 100;
    const totalTime = end - start;
    const avgTime = totalTime / concurrency;
    
    results.concurrency[`${concurrency}_concurrent`] = {
      concurrency,
      successRate,
      totalTime,
      avgTime,
      successful,
      total: concurrency
    };
    
    console.log(`    Success rate: ${successRate.toFixed(1)}%, Total time: ${totalTime.toFixed(2)}ms, Avg: ${avgTime.toFixed(2)}ms`);
    
    await delay(1000); // Cool down between tests
  }
}

// Sustained Load Testing
async function testSustainedLoad() {
  console.log('\\n⏱️ Testing Sustained Load (30 seconds)...');
  
  const duration = 30000; // 30 seconds
  const requestsPerSecond = 10;
  const startTime = Date.now();
  
  let totalRequests = 0;
  let successfulRequests = 0;
  let errors = 0;
  const responseTimes = [];
  
  while (Date.now() - startTime < duration) {
    const batchStart = performance.now();
    const batch = Array.from({ length: requestsPerSecond }, async () => {
      try {
        const requestStart = performance.now();
        const response = await fetch(`${API_BASE_URL}/health`);
        const requestEnd = performance.now();
        
        totalRequests++;
        if (response.status === 200) {
          successfulRequests++;
          responseTimes.push(requestEnd - requestStart);
        }
        return response.status === 200;
      } catch (error) {
        totalRequests++;
        errors++;
        return false;
      }
    });
    
    await Promise.all(batch);
    
    // Wait for next second
    const elapsed = performance.now() - batchStart;
    if (elapsed < 1000) {
      await delay(1000 - elapsed);
    }
  }
  
  const successRate = (successfulRequests / totalRequests) * 100;
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const throughput = totalRequests / (duration / 1000);
  
  results.stability.sustainedLoad = {
    duration: duration / 1000,
    totalRequests,
    successfulRequests,
    errors,
    successRate,
    avgResponseTime,
    throughput
  };
  
  console.log(`  Processed ${totalRequests} requests in ${duration/1000}s`);
  console.log(`  Success rate: ${successRate.toFixed(1)}%`);
  console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`  Throughput: ${throughput.toFixed(1)} requests/second`);
}

// Memory Usage Monitoring
async function monitorMemoryUsage() {
  console.log('\\n🧠 Monitoring Memory Usage...');
  
  const initialMemory = process.memoryUsage();
  console.log(`  Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  
  // Generate load and monitor memory
  const requests = Array.from({ length: 100 }, async (_, i) => {
    await fetch(`${API_BASE_URL}/health?iteration=${i}`).then(r => r.text());
    if (i % 20 === 0) {
      const currentMemory = process.memoryUsage();
      console.log(`  After ${i} requests: ${(currentMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
  });
  
  await Promise.all(requests);
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
    await delay(1000);
  }
  
  const finalMemory = process.memoryUsage();
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
  
  results.memory = {
    initial: initialMemory.heapUsed / 1024 / 1024,
    final: finalMemory.heapUsed / 1024 / 1024,
    increase: memoryIncreaseMB,
    rss: finalMemory.rss / 1024 / 1024
  };
  
  console.log(`  Final memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
  console.log(`  RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)}MB`);
}

// WebSocket Performance Testing
async function testWebSocketPerformance() {
  console.log('\\n🔌 Testing WebSocket Performance...');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_BASE_URL}/terminal`);
    let messagesSent = 0;
    let messagesReceived = 0;
    const startTime = performance.now();
    
    ws.on('open', () => {
      console.log('  WebSocket connected');
      
      // Send test messages
      const testMessages = ['echo "test1"', 'echo "test2"', 'echo "test3"'];
      testMessages.forEach(msg => {
        ws.send(msg);
        messagesSent++;
      });
    });
    
    ws.on('message', (data) => {
      messagesReceived++;
      if (messagesReceived >= 3) {
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        results.performance.websocket = {
          messagesSent,
          messagesReceived,
          totalTime,
          avgTime: totalTime / messagesReceived
        };
        
        console.log(`  Sent: ${messagesSent}, Received: ${messagesReceived}`);
        console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
        
        ws.close();
        resolve();
      }
    });
    
    ws.on('error', (error) => {
      console.log(`  WebSocket error: ${error.message}`);
      resolve();
    });
    
    setTimeout(() => {
      ws.close();
      console.log('  WebSocket test timeout');
      resolve();
    }, 10000);
  });
}

// Main execution
async function runPerformanceValidation() {
  try {
    await benchmarkResponseTimes();
    await testConcurrentLoad();
    await testSustainedLoad();
    await monitorMemoryUsage();
    await testWebSocketPerformance();
    
    console.log('\\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE VALIDATION RESULTS');
    console.log('='.repeat(60));
    
    // Performance Assessment
    console.log('\\n🎯 Performance Metrics:');
    Object.entries(results.performance).forEach(([key, value]) => {
      if (typeof value === 'object' && value.average) {
        const rating = value.average < 100 ? '🟢 Excellent' : 
                      value.average < 200 ? '🟡 Good' : 
                      value.average < 500 ? '🟠 Acceptable' : '🔴 Poor';
        console.log(`  ${key}: ${value.average.toFixed(2)}ms (${rating})`);
      }
    });
    
    // Concurrency Assessment  
    console.log('\\n🔄 Concurrency Results:');
    Object.entries(results.concurrency).forEach(([key, value]) => {
      const rating = value.successRate >= 99 ? '🟢 Excellent' : 
                    value.successRate >= 95 ? '🟡 Good' : 
                    value.successRate >= 90 ? '🟠 Acceptable' : '🔴 Poor';
      console.log(`  ${value.concurrency} concurrent: ${value.successRate.toFixed(1)}% success (${rating})`);
    });
    
    // Stability Assessment
    if (results.stability.sustainedLoad) {
      const load = results.stability.sustainedLoad;
      const rating = load.successRate >= 99 ? '🟢 Excellent' : 
                    load.successRate >= 95 ? '🟡 Good' : 
                    load.successRate >= 90 ? '🟠 Acceptable' : '🔴 Poor';
      console.log(`\\n⏱️ Sustained Load: ${load.successRate.toFixed(1)}% success, ${load.throughput.toFixed(1)} req/s (${rating})`);
    }
    
    // Memory Assessment
    if (results.memory.increase !== undefined) {
      const rating = results.memory.increase < 5 ? '🟢 Excellent' : 
                    results.memory.increase < 10 ? '🟡 Good' : 
                    results.memory.increase < 20 ? '🟠 Acceptable' : '🔴 Poor';
      console.log(`\\n🧠 Memory Usage: +${results.memory.increase.toFixed(2)}MB (${rating})`);
    }
    
    // Overall Assessment
    console.log('\\n🏆 OVERALL PERFORMANCE ASSESSMENT:');
    const hasExcellentMetrics = Object.values(results.performance).some(v => v.average && v.average < 100);
    const hasPoorMetrics = Object.values(results.performance).some(v => v.average && v.average > 500);
    const goodConcurrency = Object.values(results.concurrency).every(v => v.successRate >= 95);
    const lowMemoryUsage = results.memory.increase < 10;
    
    if (hasExcellentMetrics && goodConcurrency && lowMemoryUsage) {
      console.log('🟢 EXCELLENT - System performs exceptionally well under load');
    } else if (!hasPoorMetrics && goodConcurrency) {
      console.log('🟡 GOOD - System performance is acceptable for production');
    } else if (!hasPoorMetrics) {
      console.log('🟠 ACCEPTABLE - Some performance concerns but functional');
    } else {
      console.log('🔴 NEEDS IMPROVEMENT - Performance issues detected');
    }
    
  } catch (error) {
    console.error('❌ Performance validation failed:', error.message);
    process.exit(1);
  }
}

runPerformanceValidation();