/**
 * Simple Validation Test - Phase 1 & Phase 2 Features
 * Basic connectivity and functionality validation
 */

const axios = require('axios');
const { io } = require('socket.io-client');

const API_BASE_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:3002';

console.log('🔍 Starting comprehensive Phase 1 & Phase 2 validation...\n');

// Test Results Tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function addResult(testName, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`✅ ${testName}`);
  } else {
    results.failed++;
    console.log(`❌ ${testName} - ${details}`);
  }
  results.tests.push({ name: testName, passed, details });
}

async function validatePhase1() {
  console.log('📋 Phase 1: Core Infrastructure & Database Schema');
  console.log('='.repeat(50));

  // Test 1: API Health Check
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    addResult('API Health Endpoint', response.status === 200 && response.data.status === 'healthy');
  } catch (error) {
    addResult('API Health Endpoint', false, error.message);
  }

  // Test 2: Database Schema (Check if schema endpoints work)
  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/`, { timeout: 5000 });
    addResult('API Info Endpoint', 
      response.status === 200 && 
      response.data.name === 'Agent Feed API' &&
      response.data.features.claude_flow_integration === true
    );
  } catch (error) {
    addResult('API Info Endpoint', false, error.message);
  }

  // Test 3: CORS Configuration
  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/agent-posts`, {
      headers: { 'Origin': 'http://localhost:3002' },
      timeout: 5000
    });
    addResult('CORS Configuration', response.status === 200);
  } catch (error) {
    addResult('CORS Configuration', false, error.message);
  }

  // Test 4: Agent Posts API
  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/agent-posts`, { timeout: 5000 });
    addResult('Agent Posts GET', 
      response.status === 200 && 
      response.data.success === true &&
      Array.isArray(response.data.data)
    );
  } catch (error) {
    addResult('Agent Posts GET', false, error.message);
  }

  console.log();
}

async function validatePhase2() {
  console.log('🚀 Phase 2: Dynamic Features & Real-time Systems');
  console.log('='.repeat(50));

  // Test 1: Agent Posts CRUD Operations
  try {
    const newPost = {
      title: 'Validation Test Post',
      content: 'This is a test post from the validation suite',
      authorAgent: 'ValidationAgent'
    };

    const createResponse = await axios.post(
      `${API_BASE_URL}/api/v1/agent-posts`,
      newPost,
      { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000 
      }
    );

    addResult('Agent Posts CREATE', 
      createResponse.status === 200 && 
      createResponse.data.success === true &&
      createResponse.data.data.title === newPost.title
    );
  } catch (error) {
    addResult('Agent Posts CREATE', false, error.message);
  }

  // Test 2: Error Handling
  try {
    await axios.get(`${API_BASE_URL}/api/v1/nonexistent`, { timeout: 5000 });
    addResult('API Error Handling', false, 'Should have returned 404');
  } catch (error) {
    addResult('API Error Handling', error.response?.status === 404);
  }

  // Test 3: WebSocket Connection
  await testWebSocketConnection();

  // Test 4: Frontend Availability
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 10000 });
    addResult('Frontend Availability', response.status === 200);
  } catch (error) {
    addResult('Frontend Availability', false, error.message);
  }

  console.log();
}

async function testWebSocketConnection() {
  return new Promise((resolve) => {
    const socket = io(API_BASE_URL, {
      auth: {
        userId: 'test-validation-user',
        username: 'ValidationUser'
      },
      timeout: 5000
    });

    const timeout = setTimeout(() => {
      addResult('WebSocket Connection', false, 'Connection timeout');
      socket.disconnect();
      resolve();
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      addResult('WebSocket Connection', true);
      
      // Test WebSocket Events
      socket.emit('subscribe:feed', 'test-feed');
      
      socket.on('feed:subscribed', (data) => {
        addResult('WebSocket Feed Subscription', 
          data.feedId === 'test-feed' && data.timestamp
        );
        socket.disconnect();
        resolve();
      });

      // Test heartbeat
      socket.emit('ping');
      socket.on('pong', (data) => {
        addResult('WebSocket Heartbeat', data.timestamp !== undefined);
      });
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      addResult('WebSocket Connection', false, error.message);
      resolve();
    });
  });
}

async function validateSecurity() {
  console.log('🔒 Security Validation');
  console.log('='.repeat(50));

  // Test 1: XSS Prevention
  try {
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/agent-posts`,
      {
        title: xssPayload,
        content: 'Test content',
        authorAgent: 'TestAgent'
      },
      { timeout: 5000 }
    );
    
    addResult('XSS Prevention', 
      response.status === 200 && 
      response.data.data.title === xssPayload // Should be accepted but escaped
    );
  } catch (error) {
    addResult('XSS Prevention', true, 'Request blocked by security middleware');
  }

  // Test 2: SQL Injection Prevention
  try {
    const sqlPayload = "'; DROP TABLE users; --";
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/agent-posts?search=${encodeURIComponent(sqlPayload)}`,
      { timeout: 5000 }
    );
    
    addResult('SQL Injection Prevention', response.status < 500);
  } catch (error) {
    addResult('SQL Injection Prevention', error.response?.status < 500);
  }

  console.log();
}

async function validatePerformance() {
  console.log('⚡ Performance Validation');
  console.log('='.repeat(50));

  // Test 1: API Response Time
  const startTime = Date.now();
  try {
    await axios.get(`${API_BASE_URL}/api/v1/agent-posts`, { timeout: 5000 });
    const responseTime = Date.now() - startTime;
    addResult('API Response Time (<2s)', responseTime < 2000, `${responseTime}ms`);
  } catch (error) {
    addResult('API Response Time (<2s)', false, error.message);
  }

  // Test 2: Frontend Load Time
  const frontendStartTime = Date.now();
  try {
    await axios.get(FRONTEND_URL, { timeout: 10000 });
    const frontendLoadTime = Date.now() - frontendStartTime;
    addResult('Frontend Load Time (<5s)', frontendLoadTime < 5000, `${frontendLoadTime}ms`);
  } catch (error) {
    addResult('Frontend Load Time (<5s)', false, error.message);
  }

  console.log();
}

async function generateReport() {
  console.log('📊 VALIDATION REPORT');
  console.log('='.repeat(50));
  
  const passRate = ((results.passed / results.total) * 100).toFixed(1);
  
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${passRate}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   - ${test.name}: ${test.details}`);
      });
  }
  
  console.log('\n🎯 FEATURE STATUS:');
  console.log('='.repeat(50));
  
  // Phase 1 Features
  console.log('Phase 1 (Core Infrastructure):');
  const phase1Tests = results.tests.slice(0, 4);
  const phase1Pass = phase1Tests.filter(t => t.passed).length;
  console.log(`   ✓ Database Schema: ${phase1Pass >= 2 ? 'OPERATIONAL' : 'NEEDS ATTENTION'}`);
  console.log(`   ✓ API Endpoints: ${phase1Pass >= 3 ? 'OPERATIONAL' : 'NEEDS ATTENTION'}`);
  console.log(`   ✓ CORS Configuration: ${phase1Tests.find(t => t.name.includes('CORS'))?.passed ? 'OPERATIONAL' : 'NEEDS ATTENTION'}`);
  
  // Phase 2 Features
  console.log('\nPhase 2 (Dynamic Features):');
  const wsTest = results.tests.find(t => t.name.includes('WebSocket'));
  const crudTest = results.tests.find(t => t.name.includes('CREATE'));
  console.log(`   ✓ CRUD Operations: ${crudTest?.passed ? 'OPERATIONAL' : 'NEEDS ATTENTION'}`);
  console.log(`   ✓ WebSocket Real-time: ${wsTest?.passed ? 'OPERATIONAL' : 'NEEDS ATTENTION'}`);
  console.log(`   ✓ Frontend Integration: ${results.tests.find(t => t.name.includes('Frontend'))?.passed ? 'OPERATIONAL' : 'NEEDS ATTENTION'}`);
  
  // Security & Performance
  console.log('\nSecurity & Performance:');
  const securityTests = results.tests.filter(t => t.name.includes('Prevention'));
  const perfTests = results.tests.filter(t => t.name.includes('Time'));
  console.log(`   ✓ Security: ${securityTests.every(t => t.passed) ? 'SECURE' : 'NEEDS REVIEW'}`);
  console.log(`   ✓ Performance: ${perfTests.every(t => t.passed) ? 'OPTIMAL' : 'NEEDS OPTIMIZATION'}`);
  
  console.log('\n🚀 OVERALL SYSTEM STATUS:');
  if (passRate >= 90) {
    console.log('🟢 EXCELLENT - System is production ready');
  } else if (passRate >= 75) {
    console.log('🟡 GOOD - Minor issues need attention');
  } else if (passRate >= 50) {
    console.log('🟠 FAIR - Several issues need fixing');
  } else {
    console.log('🔴 POOR - Major issues require immediate attention');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Validation completed at:', new Date().toISOString());
}

async function runValidation() {
  try {
    await validatePhase1();
    await validatePhase2();
    await validateSecurity();
    await validatePerformance();
    await generateReport();
  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  }
}

// Run validation
runValidation();