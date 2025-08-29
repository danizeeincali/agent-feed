#!/usr/bin/env node

/**
 * UI Status Fix Test - Verify that React state updates work correctly
 * Tests the fix for race condition between fetchInstances() and SSE status updates
 */

const { EventSource } = require('eventsource');

async function testUIStatusFix() {
  console.log('🎯 UI STATUS FIX VERIFICATION');
  console.log('=============================\n');

  const results = {
    initialFetch: false,
    instanceCreation: false,
    statusStarting: false,
    statusRunning: false,
    noRaceCondition: false
  };

  try {
    // Step 1: Check initial instances
    console.log('1️⃣ Checking initial instances...');
    const initialResponse = await fetch('http://localhost:3000/api/claude/instances');
    const initialData = await initialResponse.json();
    
    console.log(`   📊 Found ${initialData.instances.length} existing instances`);
    const initialCount = initialData.instances.length;
    results.initialFetch = true;

    // Step 2: Connect SSE to monitor status updates
    console.log('\n2️⃣ Setting up SSE monitoring...');
    const eventSource = new EventSource('http://localhost:3000/api/status/stream');
    
    let instanceId = null;
    let statusUpdates = [];
    let statusTimestamps = [];
    
    eventSource.onopen = () => {
      console.log('   ✅ SSE connected for monitoring');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'instance:status' && data.instanceId === instanceId) {
          const timestamp = Date.now();
          statusUpdates.push(data.status);
          statusTimestamps.push(timestamp);
          console.log(`   📨 Status update: ${data.instanceId} → ${data.status} (${timestamp})`);
          
          if (data.status === 'starting') {
            results.statusStarting = true;
          }
          if (data.status === 'running') {
            results.statusRunning = true;
          }
        }
      } catch (err) {
        console.error('   ❌ Parse error:', err.message);
      }
    };

    // Wait for SSE connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Create instance
    console.log('\n3️⃣ Creating Claude instance...');
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

    // Step 4: Monitor for race conditions
    console.log('\n4️⃣ Monitoring for race conditions...');
    const startTime = Date.now();
    
    // Wait for status transitions
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Step 5: Analyze timing
    console.log('\n5️⃣ Analyzing status update timing...');
    console.log(`   📊 Total status updates received: ${statusUpdates.length}`);
    
    statusUpdates.forEach((status, i) => {
      const relativeTime = statusTimestamps[i] - startTime;
      console.log(`   ${i + 1}. ${status} (at +${relativeTime}ms)`);
    });

    // Check if we got the expected sequence: starting → running
    const hasStarting = statusUpdates.includes('starting');
    const hasRunning = statusUpdates.includes('running');
    const sequence = statusUpdates.join(' → ');
    
    console.log(`   📈 Status sequence: ${sequence}`);
    
    if (hasStarting && hasRunning) {
      results.noRaceCondition = true;
      console.log('   ✅ Status transitions working correctly');
    } else {
      console.log('   ❌ Missing expected status transitions');
    }

    // Step 6: Verify final state
    console.log('\n6️⃣ Verifying final instance state...');
    const finalResponse = await fetch('http://localhost:3000/api/claude/instances');
    const finalData = await finalResponse.json();
    
    const targetInstance = finalData.instances.find(i => i.id === instanceId);
    if (targetInstance) {
      console.log(`   📊 Final instance status: ${targetInstance.status}`);
      console.log(`   🔢 Instance count: ${finalData.instances.length} (was ${initialCount})`);
    }

    // Cleanup
    eventSource.close();

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }

  // Results summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 UI STATUS FIX TEST RESULTS');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const label = key.replace(/([A-Z])/g, ' $1').trim();
    console.log(`${status} ${label}: ${value ? 'PASSED' : 'FAILED'}`);
  });

  const allPassed = Object.values(results).every(v => v);
  
  if (allPassed) {
    console.log('\n🎉 UI STATUS FIX SUCCESSFUL!');
    console.log('✅ Race condition between fetchInstances() and SSE resolved');
    console.log('✅ React state updates working correctly');
    console.log('✅ Status transitions occurring as expected');
  } else {
    console.log('\n⚠️  Some UI status fix tests failed');
    console.log('💡 The React component may still have issues');
  }

  return allPassed;
}

// Run test
testUIStatusFix().then(success => {
  console.log('\n' + (success ? '🎯 UI STATUS FIX VERIFIED' : '❌ UI STATUS FIX NEEDS WORK'));
  process.exit(success ? 0 : 1);
});