#!/usr/bin/env node

/**
 * Frontend Status Updates Test - Specifically for SSE Status Display
 */

const { spawn } = require('child_process');
const { EventSource } = require('eventsource');

async function testFrontendStatusUpdates() {
  console.log('🎯 FRONTEND STATUS UPDATES TEST');
  console.log('================================\n');

  const results = {
    instanceCreation: false,
    sseConnection: false,
    statusUpdateReceived: false,
    statusTransition: false
  };

  try {
    // Step 1: Connect to SSE first to monitor status changes
    console.log('1️⃣ Connecting to SSE status stream...');
    const eventSource = new EventSource('http://localhost:3000/api/status/stream');
    
    let instanceId = null;
    let statusUpdates = [];
    
    eventSource.onopen = () => {
      console.log('   ✅ SSE connected');
      results.sseConnection = true;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('   📨 SSE Message:', data.type, data);
        
        if (data.type === 'instance:status') {
          statusUpdates.push(`${data.instanceId}: ${data.status}`);
          console.log(`   📊 Status update: ${data.instanceId} → ${data.status}`);
          results.statusUpdateReceived = true;
          
          if (data.status === 'running' && data.instanceId === instanceId) {
            results.statusTransition = true;
            console.log('   🎉 Instance successfully transitioned to running!');
          }
        }
      } catch (err) {
        console.error('   ❌ Parse error:', err.message);
      }
    };

    // Wait for SSE connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Create instance after SSE is connected
    console.log('\n2️⃣ Creating Claude instance...');
    const createResponse = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceType: 'prod',
        command: ['claude'],
        usePty: true
      })
    });
    
    const instanceData = await createResponse.json();
    instanceId = instanceData.instance.id;
    
    console.log(`   ✅ Instance created: ${instanceId} (PID: ${instanceData.instance.pid})`);
    console.log(`   📊 Initial status: ${instanceData.instance.status}`);
    results.instanceCreation = true;

    // Wait for status transitions
    console.log('\n3️⃣ Waiting for status transitions...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3: Check what status updates were received
    console.log('\n4️⃣ Status updates received:');
    statusUpdates.forEach(update => {
      console.log(`   📨 ${update}`);
    });

    // Cleanup
    eventSource.close();

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }

  // Results summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 FRONTEND STATUS TEST RESULTS');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const label = key.replace(/([A-Z])/g, ' $1').trim();
    console.log(`${status} ${label}: ${value ? 'PASSED' : 'FAILED'}`);
  });

  const allPassed = Object.values(results).every(v => v);
  
  if (allPassed) {
    console.log('\n🎉 FRONTEND SSE STATUS UPDATES WORKING!');
    console.log('✅ Backend properly broadcasts status changes');
    console.log('✅ Frontend SSE receives status updates');
    console.log('✅ Status transitions work correctly');
  } else {
    console.log('\n⚠️  Some status update tests failed');
    console.log('💡 This suggests the frontend React component may not be updating the UI');
  }

  return allPassed;
}

// Run test
testFrontendStatusUpdates().then(success => {
  process.exit(success ? 0 : 1);
});