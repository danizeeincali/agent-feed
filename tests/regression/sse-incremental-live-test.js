/**
 * Live SSE Incremental Output Test
 * 
 * Test incremental output with actual running backend
 */

const EventSource = require('eventsource');

async function testIncrementalSSE() {
  console.log('🚀 Starting Live SSE Incremental Output Test');

  try {
    // Test instance creation with incremental tracking
    const createResponse = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        instanceType: 'skip-permissions',
        usePty: true 
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Instance creation failed: ${createResponse.status}`);
    }

    const instanceData = await createResponse.json();
    const instanceId = instanceData.instance.id;
    
    console.log(`✅ Created instance: ${instanceId}`);
    
    // Connect to SSE stream
    const sseUrl = `http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`;
    console.log(`📡 Connecting to SSE: ${sseUrl}`);
    
    const eventSource = new EventSource(sseUrl);
    let messageCount = 0;
    const receivedMessages = [];
    let totalBytesReceived = 0;
    
    // Track message positions for deduplication verification
    const positionTracker = new Map();
    let duplicateCount = 0;
    
    eventSource.onopen = () => {
      console.log('✅ SSE connection established');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        messageCount++;
        
        console.log(`📨 Message ${messageCount} (${message.type}):`, 
          message.data ? `${message.data.length} bytes` : 'no data',
          message.position !== undefined ? `pos: ${message.position}` : '',
          message.isIncremental ? 'incremental' : ''
        );
        
        if (message.type === 'output' && message.data) {
          totalBytesReceived += message.data.length;
          
          // Check for incremental position tracking
          if (message.position !== undefined && message.isIncremental) {
            const key = `${message.instanceId}:${message.position}`;
            if (positionTracker.has(key)) {
              duplicateCount++;
              console.warn(`⚠️ Duplicate message detected at position ${message.position}`);
            } else {
              positionTracker.set(key, message.data);
              console.log(`✅ New incremental data at position ${message.position}: ${message.data.length} bytes`);
            }
          }
        }
        
        receivedMessages.push({
          timestamp: Date.now(),
          type: message.type,
          dataLength: message.data ? message.data.length : 0,
          position: message.position,
          isIncremental: message.isIncremental
        });
        
      } catch (error) {
        console.error('❌ Error parsing SSE message:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
    };
    
    // Wait for initial connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Send test commands to generate incremental output
    const testCommands = [
      'help',
      'echo "incremental test 1"',
      'echo "incremental test 2"', 
      'pwd',
      'echo "final test"'
    ];
    
    console.log('⌨️ Sending test commands...');
    
    for (let i = 0; i < testCommands.length; i++) {
      const command = testCommands[i];
      console.log(`📝 Command ${i + 1}: ${command}`);
      
      const inputResponse = await fetch(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: command })
      });
      
      if (inputResponse.ok) {
        console.log(`✅ Command ${i + 1} sent`);
      } else {
        console.warn(`⚠️ Command ${i + 1} failed: ${inputResponse.status}`);
      }
      
      // Wait between commands
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Wait for final output
    console.log('⏳ Waiting for output...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Close SSE connection
    eventSource.close();
    console.log('🔌 SSE connection closed');
    
    // Cleanup instance
    const deleteResponse = await fetch(`http://localhost:3000/api/claude/instances/${instanceId}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.ok) {
      console.log('🗑️ Instance cleaned up');
    }
    
    // Report test results
    console.log('\n📊 Test Results:');
    console.log(`   Messages received: ${messageCount}`);
    console.log(`   Total bytes: ${totalBytesReceived}`);
    console.log(`   Duplicates detected: ${duplicateCount}`);
    console.log(`   Unique positions: ${positionTracker.size}`);
    
    const incrementalMessages = receivedMessages.filter(m => m.isIncremental);
    console.log(`   Incremental messages: ${incrementalMessages.length}`);
    
    if (duplicateCount === 0) {
      console.log('✅ SUCCESS: No duplicate messages detected - incremental output working!');
      return true;
    } else {
      console.log(`❌ FAILURE: ${duplicateCount} duplicate messages detected`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testIncrementalSSE().then(success => {
  console.log(success ? '\n🎉 Incremental SSE test PASSED' : '\n💥 Incremental SSE test FAILED');
  process.exit(success ? 0 : 1);
});