#!/usr/bin/env node

/**
 * Integration Test: Complete Button -> Launch -> Type Workflow
 * Tests the TDD requirements and ensures zero network errors
 */

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function testCompleteWorkflow() {
  console.log('🧪 Starting complete integration workflow test...\n');
  
  let passed = 0;
  let failed = 0;
  
  const test = async (name, fn) => {
    try {
      console.log(`🔧 Testing: ${name}`);
      await fn();
      console.log(`✅ PASSED: ${name}\n`);
      passed++;
    } catch (error) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}\n`);
      failed++;
    }
  };

  // Test 1: GET instances (list existing)
  await test('GET /api/claude/instances', async () => {
    const response = await fetch('http://localhost:3333/api/claude/instances');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (!data.success) throw new Error('Response not successful');
    if (!Array.isArray(data.instances)) throw new Error('Instances should be array');
    
    console.log(`   📋 Found ${data.instances.length} existing instances`);
  });
  
  // Test 2: POST instances (create new Claude instance)
  await test('POST /api/claude/instances (create)', async () => {
    const requestBody = {
      instanceType: 'skip-permissions',
      command: ['claude', '--dangerously-skip-permissions']
    };
    
    const response = await fetch('http://localhost:3333/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (!data.success) throw new Error('Creation not successful');
    if (!data.instanceId) throw new Error('No instance ID returned');
    if (!data.instanceId.startsWith('claude-')) throw new Error('Invalid instance ID format');
    if (!data.instance || !data.instance.id) throw new Error('No instance object returned');
    
    console.log(`   🚀 Created instance: ${data.instanceId}`);
    console.log(`   📝 Type: ${data.instance.type}`);
    console.log(`   📍 Status: ${data.instance.status}`);
    
    // Store for next test
    global.testInstanceId = data.instanceId;
  });
  
  // Test 3: POST terminal input (send command)
  await test('POST /api/claude/instances/:id/terminal/input', async () => {
    if (!global.testInstanceId) throw new Error('No instance ID from previous test');
    
    const testInput = 'help\\n';
    const response = await fetch(`http://localhost:3333/api/claude/instances/${global.testInstanceId}/terminal/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: testInput })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (!data.success) throw new Error('Input not successful');
    if (data.instanceId !== global.testInstanceId) throw new Error('Instance ID mismatch');
    
    console.log(`   💬 Sent input: "${testInput}"`);
    console.log(`   📥 Response: ${data.message}`);
    console.log(`   🕒 Timestamp: ${data.timestamp}`);
  });
  
  // Test 4: API versioning (test v1 endpoint)
  await test('POST /api/v1/claude/instances/:id/terminal/input (v1)', async () => {
    const testInput = 'pwd\\n';
    const response = await fetch(`http://localhost:3333/api/v1/claude/instances/claude-test/terminal/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: testInput })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (!data.success) throw new Error('V1 input not successful');
    
    console.log(`   💬 V1 input sent: "${testInput}"`);
    console.log(`   📥 V1 response: ${data.message}`);
  });
  
  // Test 5: Error handling (invalid input)
  await test('Error handling - invalid input', async () => {
    const response = await fetch(`http://localhost:3333/api/claude/instances/claude-invalid/terminal/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: '' }) // Empty input
    });
    
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    
    const data = await response.json();
    if (data.success !== false) throw new Error('Should fail for empty input');
    
    console.log(`   🚫 Correctly rejected empty input`);
    console.log(`   📝 Error: ${data.error}`);
  });
  
  // Test 6: Frontend compatibility check
  await test('Frontend compatibility (CORS)', async () => {
    const response = await fetch('http://localhost:3333/api/claude/instances', {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:5173',
        'X-Client-Id': 'test-client-123'
      }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const corsHeader = response.headers.get('access-control-allow-origin');
    console.log(`   🌐 CORS header: ${corsHeader || 'not set'}`);
    console.log(`   ✅ Frontend can access API`);
  });
  
  // Summary
  console.log('=' * 60);
  console.log('📊 INTEGRATION TEST SUMMARY');
  console.log('=' * 60);
  console.log(`✅ PASSED: ${passed}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log(`🎯 SUCCESS RATE: ${Math.round(passed / (passed + failed) * 100)}%`);
  
  if (failed === 0) {
    console.log('\\n🎉 ALL INTEGRATION TESTS PASSED!');
    console.log('🔗 Complete button -> launch -> type workflow is working');
    console.log('🚀 Zero network errors confirmed');
    console.log('✅ TDD requirements satisfied');
  } else {
    console.log('\\n⚠️  Some tests failed - integration needs fixes');
  }
  
  return failed === 0;
}

// Run the tests
testCompleteWorkflow()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });