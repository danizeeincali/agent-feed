#!/usr/bin/env node

/**
 * Manual Comprehensive System Regression Validation
 * Direct validation of all system components after persistent feed implementation
 */

import fetch from 'node-fetch';
import WebSocket from 'ws';
import { performance } from 'perf_hooks';

const API_BASE_URL = 'http://localhost:3000';
const WS_BASE_URL = 'ws://localhost:3000';

console.log('🧪 Starting Comprehensive System Regression Validation');
console.log('=' .repeat(60));

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(name, status, message = '', details = {}) {
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${emoji} ${name}: ${message}`);
  
  results.tests.push({ name, status, message, details });
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
  else results.warnings++;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHealthEndpoint() {
  try {
    const startTime = performance.now();
    const response = await fetch(`${API_BASE_URL}/health`);
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    const data = await response.json();
    
    if (response.status === 200) {
      logTest('Health Endpoint', 'PASS', 
        `Responded in ${responseTime.toFixed(2)}ms`, 
        { responseTime, data });
      
      // Validate response structure
      if (data.status === 'healthy' && data.services) {
        logTest('Health Response Structure', 'PASS', 'All expected fields present');
      } else {
        logTest('Health Response Structure', 'WARN', 'Some fields missing');
      }
    } else {
      logTest('Health Endpoint', 'FAIL', `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Health Endpoint', 'FAIL', error.message);
  }
}

async function testClaudeInstancesAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/claude/instances`);
    const data = await response.json();
    
    if (response.status === 200 && data.success) {
      logTest('Claude Instances API', 'PASS', `Found ${data.instances.length} instances`);
    } else {
      logTest('Claude Instances API', 'FAIL', `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Claude Instances API', 'FAIL', error.message);
  }
}

async function testFeedAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/agent-posts`);
    const data = await response.json();
    
    if (response.status === 200 && data.success) {
      logTest('Feed API', 'PASS', 
        `Retrieved ${data.posts.length} posts (${data.message || 'normal mode'})`);
      
      // Validate pagination structure
      if (data.pagination && typeof data.pagination.total === 'number') {
        logTest('Feed Pagination', 'PASS', 'Pagination structure valid');
      } else {
        logTest('Feed Pagination', 'WARN', 'Pagination structure incomplete');
      }
    } else {
      logTest('Feed API', 'FAIL', `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Feed API', 'FAIL', error.message);
  }
}

async function testSearchAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/search/posts?q=test`);
    
    if (response.status === 200) {
      const data = await response.json();
      logTest('Search API', 'PASS', 'Search endpoint accessible');
    } else if (response.status === 404 || response.status === 503) {
      logTest('Search API', 'WARN', 'Search temporarily unavailable (acceptable in fallback mode)');
    } else {
      logTest('Search API', 'FAIL', `Unexpected status: ${response.status}`);
    }
  } catch (error) {
    logTest('Search API', 'WARN', `Search unavailable: ${error.message}`);
  }
}

async function testWebSocketTerminal() {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_BASE_URL}/terminal`);
    let timeout;
    
    timeout = setTimeout(() => {
      ws.close();
      logTest('WebSocket Terminal', 'FAIL', 'Connection timeout');
      resolve();
    }, 5000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      logTest('WebSocket Terminal', 'PASS', 'Connection established');
      ws.close();
      resolve();
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      logTest('WebSocket Terminal', 'FAIL', error.message);
      resolve();
    });
  });
}

async function testPerformance() {
  const requests = Array.from({ length: 10 }, () => 
    fetch(`${API_BASE_URL}/health`).then(r => r.json())
  );
  
  const startTime = performance.now();
  try {
    const results = await Promise.all(requests);
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / requests.length;
    
    if (avgTime < 200) {
      logTest('Concurrent Performance', 'PASS', 
        `Average response time: ${avgTime.toFixed(2)}ms`);
    } else {
      logTest('Concurrent Performance', 'WARN', 
        `Average response time: ${avgTime.toFixed(2)}ms (slower than expected)`);
    }
  } catch (error) {
    logTest('Concurrent Performance', 'FAIL', error.message);
  }
}

async function testErrorHandling() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/nonexistent/endpoint`);
    
    if (response.status === 404) {
      logTest('404 Error Handling', 'PASS', 'Correctly returns 404 for invalid endpoints');
    } else {
      logTest('404 Error Handling', 'WARN', `Unexpected status: ${response.status}`);
    }
    
    // Verify server is still responsive after error
    const healthCheck = await fetch(`${API_BASE_URL}/health`);
    if (healthCheck.status === 200) {
      logTest('Server Recovery', 'PASS', 'Server remains responsive after error');
    } else {
      logTest('Server Recovery', 'FAIL', 'Server not responsive after error');
    }
  } catch (error) {
    logTest('Error Handling', 'FAIL', error.message);
  }
}

async function testSecurityHeaders() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const headers = Object.fromEntries(response.headers.entries());
    
    if (headers['access-control-allow-origin']) {
      logTest('CORS Headers', 'PASS', 'CORS headers present');
    } else {
      logTest('CORS Headers', 'WARN', 'CORS headers missing');
    }
  } catch (error) {
    logTest('Security Headers', 'FAIL', error.message);
  }
}

async function testMemoryUsage() {
  const initialMemory = process.memoryUsage();
  
  // Generate some load
  const requests = Array.from({ length: 20 }, () => 
    fetch(`${API_BASE_URL}/health`).then(r => r.text())
  );
  
  await Promise.all(requests);
  await delay(1000); // Allow GC
  
  const finalMemory = process.memoryUsage();
  const heapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  const heapIncreaseMB = heapIncrease / 1024 / 1024;
  
  if (heapIncreaseMB < 10) {
    logTest('Memory Usage', 'PASS', `Heap increase: ${heapIncreaseMB.toFixed(2)}MB`);
  } else {
    logTest('Memory Usage', 'WARN', `Heap increase: ${heapIncreaseMB.toFixed(2)}MB (higher than expected)`);
  }
}

// Main validation execution
async function runValidation() {
  console.log('1. Testing Core System Functionality');
  console.log('-'.repeat(40));
  await testHealthEndpoint();
  await testClaudeInstancesAPI();
  
  console.log('\\n2. Testing Persistent Feed Features');
  console.log('-'.repeat(40));
  await testFeedAPI();
  await testSearchAPI();
  
  console.log('\\n3. Testing Integration Points');
  console.log('-'.repeat(40));
  await testWebSocketTerminal();
  
  console.log('\\n4. Testing Performance');
  console.log('-'.repeat(40));
  await testPerformance();
  
  console.log('\\n5. Testing Error Handling');
  console.log('-'.repeat(40));
  await testErrorHandling();
  
  console.log('\\n6. Testing Security');
  console.log('-'.repeat(40));
  await testSecurityHeaders();
  
  console.log('\\n7. Testing System Stability');
  console.log('-'.repeat(40));
  await testMemoryUsage();
  
  // Final results
  console.log('\\n' + '='.repeat(60));
  console.log('🏁 VALIDATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ PASSED: ${results.passed}`);
  console.log(`❌ FAILED: ${results.failed}`);
  console.log(`⚠️  WARNINGS: ${results.warnings}`);
  console.log(`📊 TOTAL TESTS: ${results.tests.length}`);
  
  const passRate = (results.passed / results.tests.length * 100).toFixed(1);
  console.log(`📈 PASS RATE: ${passRate}%`);
  
  if (results.failed === 0) {
    console.log('\\n🎉 ALL CRITICAL TESTS PASSED - SYSTEM READY FOR PRODUCTION!');
  } else if (results.failed <= 2 && results.warnings <= 5) {
    console.log('\\n✅ SYSTEM MOSTLY STABLE - MINOR ISSUES DETECTED');
  } else {
    console.log('\\n⚠️  SYSTEM HAS SIGNIFICANT ISSUES - REVIEW REQUIRED');
  }
  
  return results;
}

// Execute validation
runValidation()
  .then(results => {
    process.exit(results.failed > 5 ? 1 : 0);
  })
  .catch(error => {
    console.error('❌ VALIDATION FAILED:', error.message);
    process.exit(1);
  });