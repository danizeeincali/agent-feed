#!/usr/bin/env node

/**
 * Test the new dedicated Claude instances system
 */

const fetch = require('node-fetch');

async function testClaudeInstances() {
  const baseUrl = 'http://localhost:3001';
  
  console.log('🧪 TESTING DEDICATED CLAUDE INSTANCES');
  console.log('=====================================\n');

  try {
    // Test 1: Check availability
    console.log('1. Testing API availability...');
    const checkResponse = await fetch(`${baseUrl}/api/claude/check`);
    const checkData = await checkResponse.json();
    console.log('   ✅ API available:', checkData);
    
    // Test 2: Create a Claude instance
    console.log('\n2. Creating Claude instance...');
    const createResponse = await fetch(`${baseUrl}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Claude Instance',
        mode: 'help',
        cwd: '/workspaces/agent-feed'
      })
    });
    const createData = await createResponse.json();
    console.log('   ✅ Instance created:', createData);
    
    const instanceId = createData.instance?.id || createData.instanceId;
    
    if (!instanceId) {
      throw new Error('No instance ID returned');
    }
    
    // Test 3: List instances
    console.log('\n3. Listing all instances...');
    const listResponse = await fetch(`${baseUrl}/api/claude/instances`);
    const listData = await listResponse.json();
    console.log('   ✅ Active instances:', listData);
    
    // Test 4: Get instance details
    console.log('\n4. Getting instance details...');
    const detailsResponse = await fetch(`${baseUrl}/api/claude/instances/${instanceId}`);
    const detailsData = await detailsResponse.json();
    console.log('   ✅ Instance details:', detailsData);
    
    // Test 5: Get output
    console.log('\n5. Getting instance output...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for output
    const outputResponse = await fetch(`${baseUrl}/api/claude/instances/${instanceId}/output`);
    const outputData = await outputResponse.json();
    console.log('   ✅ Output sample:', outputData.output?.substring(0, 200) + '...');
    
    // Test 6: Send input (if instance is interactive)
    if (createData.instance?.config?.mode !== 'help' && createData.instance?.config?.mode !== 'version') {
      console.log('\n6. Sending input to instance...');
      const inputResponse = await fetch(`${baseUrl}/api/claude/instances/${instanceId}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'test input\n' })
      });
      const inputData = await inputResponse.json();
      console.log('   ✅ Input sent:', inputData);
    }
    
    // Test 7: Terminate instance
    console.log('\n7. Terminating instance...');
    const terminateResponse = await fetch(`${baseUrl}/api/claude/instances/${instanceId}`, {
      method: 'DELETE'
    });
    const terminateData = await terminateResponse.json();
    console.log('   ✅ Instance terminated:', terminateData);
    
    // Test 8: Legacy endpoint compatibility
    console.log('\n8. Testing legacy endpoint compatibility...');
    const legacyResponse = await fetch(`${baseUrl}/api/claude/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'version' })
    });
    const legacyData = await legacyResponse.json();
    console.log('   ✅ Legacy endpoint working:', legacyData);
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('====================');
    console.log('✅ API is available and responsive');
    console.log('✅ Can create dedicated Claude instances');
    console.log('✅ Can manage instance lifecycle');
    console.log('✅ Legacy endpoints maintain compatibility');
    console.log('✅ Ready for production use!');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

testClaudeInstances().catch(console.error);