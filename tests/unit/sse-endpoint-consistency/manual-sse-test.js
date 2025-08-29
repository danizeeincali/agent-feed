/**
 * Manual SSE Connection Test
 * Tests actual SSE connection to running server
 */

const EventSource = require('eventsource');
const fetch = require('node-fetch');

async function testSSEConnection() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🚀 Starting Manual SSE Connection Test');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Check server health
    console.log('1️⃣ Checking server health...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Server health:', healthData.status);
    
    // Step 2: Get existing instances (try both endpoints)
    console.log('2️⃣ Fetching existing instances...');
    let instancesResponse, instancesData;
    
    try {
      // Try versioned endpoint first
      instancesResponse = await fetch(`${baseUrl}/api/v1/claude/instances`);
      instancesData = await instancesResponse.json();
    } catch (error) {
      console.log('⚠️ Versioned endpoint failed, trying legacy endpoint...');
      // Fallback to simple backend endpoint
      instancesResponse = await fetch(`${baseUrl}/api/claude/instances`);
      instancesData = await instancesResponse.json();
    }
    console.log('📋 Instances found:', instancesData.instances?.length || 0);
    
    if (instancesData.instances && instancesData.instances.length > 0) {
      const testInstance = instancesData.instances[0];
      console.log('🎯 Testing with instance:', testInstance.id);
      
      // Step 3: Test SSE connection
      console.log('3️⃣ Establishing SSE connection...');
      const sseUrl = `${baseUrl}/api/v1/claude/instances/${testInstance.id}/terminal/stream`;
      console.log('🔗 SSE URL:', sseUrl);
      
      const eventSource = new EventSource(sseUrl);
      
      // Set up event handlers
      eventSource.onopen = (event) => {
        console.log('✅ SSE connection opened');
        console.log('   ReadyState:', eventSource.readyState);
        console.log('   URL:', eventSource.url);
        
        // Close connection after test
        setTimeout(() => {
          console.log('🔚 Closing SSE connection after test');
          eventSource.close();
        }, 2000);
      };
      
      eventSource.onmessage = (event) => {
        console.log('📨 SSE message received:', {
          data: event.data?.substring(0, 100) + (event.data?.length > 100 ? '...' : ''),
          type: event.type,
          lastEventId: event.lastEventId,
          origin: event.origin
        });
      };
      
      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', {
          readyState: eventSource.readyState,
          url: eventSource.url,
          error
        });
        eventSource.close();
      };
      
      // Step 4: Test sending command
      setTimeout(async () => {
        try {
          console.log('4️⃣ Sending test command...');
          const inputResponse = await fetch(`${baseUrl}/api/v1/claude/instances/${testInstance.id}/terminal/input`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: 'help' })
          });
          
          if (inputResponse.ok) {
            console.log('✅ Command sent successfully');
          } else {
            console.log('❌ Command send failed:', inputResponse.status, inputResponse.statusText);
          }
        } catch (error) {
          console.error('❌ Error sending command:', error.message);
        }
      }, 1000);
      
    } else {
      console.log('⚠️ No instances found to test with');
      
      // Try to create an instance for testing
      console.log('3️⃣ Creating test instance...');
      const createResponse = await fetch(`${baseUrl}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: ['claude'] })
      });
      
      const createData = await createResponse.json();
      if (createData.success) {
        console.log('✅ Test instance created:', createData.instanceId);
        
        // Wait a moment for instance to start
        setTimeout(async () => {
          const sseUrl = `${baseUrl}/api/v1/claude/instances/${createData.instanceId}/terminal/stream`;
          console.log('🔗 Testing SSE with new instance:', sseUrl);
          
          const eventSource = new EventSource(sseUrl);
          
          eventSource.onopen = () => {
            console.log('✅ SSE connection opened for new instance');
            setTimeout(() => eventSource.close(), 2000);
          };
          
          eventSource.onerror = (error) => {
            console.error('❌ SSE error for new instance:', error);
            eventSource.close();
          };
        }, 2000);
        
      } else {
        console.log('❌ Failed to create test instance:', createData.error);
      }
    }
    
    // Step 5: Test SSE status endpoint
    setTimeout(async () => {
      if (instancesData.instances && instancesData.instances.length > 0) {
        try {
          const testInstance = instancesData.instances[0];
          console.log('5️⃣ Testing SSE status endpoint...');
          const statusResponse = await fetch(`${baseUrl}/api/v1/claude/instances/${testInstance.id}/sse/status`);
          const statusData = await statusResponse.json();
          console.log('📊 SSE Status:', {
            connections: statusData.connections?.count || 0,
            active: statusData.connections?.active || 0,
            health: statusData.healthStatus
          });
        } catch (error) {
          console.error('❌ Error checking SSE status:', error.message);
        }
      }
      
      // Test complete
      setTimeout(() => {
        console.log('='.repeat(50));
        console.log('🏁 Manual SSE Connection Test Complete');
        process.exit(0);
      }, 1000);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSSEConnection().catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
}

module.exports = { testSSEConnection };