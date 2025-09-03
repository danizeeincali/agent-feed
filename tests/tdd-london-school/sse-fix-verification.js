/**
 * TDD London School: SSE Fix Verification
 * 
 * This test verifies that the SSE connection registration fix works correctly
 * Expected behavior: Claude AI responses should now reach frontend via SSE
 */

import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3000';

async function verifySSEfix() {
  console.log('🧪 TDD London School: SSE Fix Verification');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Create a new Claude instance
    console.log('\n📋 STEP 1: Creating Fresh Claude Instance');
    const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'claude --dangerously-skip-permissions',
        name: 'SSE Fix Test Instance',
        type: 'skip-permissions'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create instance: ${createResponse.status}`);
    }
    
    console.log('✅ Instance creation initiated');
    
    // Wait for instance to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Get the new instance ID
    const instancesResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const instancesData = await instancesResponse.json();
    const instances = instancesData.instances || [];
    
    if (instances.length === 0) {
      throw new Error('No instances found after creation');
    }
    
    const testInstance = instances[0];
    console.log('✅ Using instance:', testInstance.id);
    
    // Step 3: Connect to SSE endpoint BEFORE sending commands
    console.log('\n📋 STEP 2: Establishing SSE Connection');
    const sseUrl = `${BACKEND_URL}/api/claude/instances/${testInstance.id}/terminal/stream`;
    
    const sseResponse = await fetch(sseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!sseResponse.ok) {
      throw new Error(`SSE connection failed: ${sseResponse.status}`);
    }
    
    console.log('✅ SSE connection established');
    
    // Step 4: Set up message monitoring
    let messagesReceived = 0;
    let claudeResponseDetected = false;
    let testResult = null;
    
    const timeout = setTimeout(() => {
      testResult = {
        success: false,
        messagesReceived,
        error: 'Test timeout - no Claude response received within 15 seconds'
      };
    }, 15000);
    
    // Step 5: Monitor SSE stream
    console.log('⏰ Monitoring SSE stream for Claude AI responses...');
    
    return new Promise((resolve) => {
      if (sseResponse.body) {
        const decoder = new TextDecoder();
        
        // Create a readable stream from the response body
        const reader = sseResponse.body.getReader();
        
        const monitorStream = async () => {
          try {
            const { done, value } = await reader.read();
            if (done) {
              if (!testResult) {
                testResult = {
                  success: false,
                  messagesReceived,
                  error: 'Stream ended without Claude response'
                };
              }
              clearTimeout(timeout);
              resolve(testResult);
              return;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            
            if (chunk.trim()) {
              messagesReceived++;
              console.log(`📨 SSE Message #${messagesReceived} received`);
              
              // Parse SSE data
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const messageData = JSON.parse(line.substring(6));
                    
                    console.log('📋 Message type:', messageData.type);
                    console.log('📋 Instance ID:', messageData.instanceId);
                    console.log('📋 Has data:', !!messageData.data);
                    
                    if (messageData.type === 'terminal_output' && messageData.data) {
                      console.log('🎯 TERMINAL OUTPUT DETECTED!');
                      console.log('📝 Content preview:', messageData.data.substring(0, 100) + '...');
                      
                      // Check if this looks like a Claude AI response (not just echo)
                      if (messageData.data.length > 10 && 
                          !messageData.data.includes('echo') &&
                          !messageData.data.includes('TEST_COMMAND')) {
                        
                        console.log('🎉 CLAUDE AI RESPONSE DETECTED VIA SSE!');
                        console.log('✅ FIX SUCCESSFUL: SSE connection registration working!');
                        
                        claudeResponseDetected = true;
                        testResult = {
                          success: true,
                          messagesReceived,
                          claudeResponse: messageData.data,
                          instanceId: messageData.instanceId,
                          conclusion: 'SSE connection registration fix is working correctly'
                        };
                        
                        clearTimeout(timeout);
                        resolve(testResult);
                        return;
                      }
                    }
                    
                  } catch (parseError) {
                    console.log('⚠️  Parse error:', parseError.message);
                  }
                }
              }
              
              // Continue reading
              monitorStream();
            }
          } catch (streamError) {
            console.log('❌ Stream error:', streamError.message);
            testResult = {
              success: false,
              messagesReceived,
              error: streamError.message
            };
            clearTimeout(timeout);
            resolve(testResult);
          }
        };
        
        monitorStream();
        
        // Step 6: Send a command to trigger Claude AI response
        setTimeout(async () => {
          console.log('📤 Sending Claude AI query to trigger response...');
          try {
            await fetch(`${BACKEND_URL}/api/claude/instances/${testInstance.id}/terminal/input`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                input: 'Hello Claude! Please respond with a brief greeting to verify SSE message flow is working.',
                instanceId: testInstance.id
              })
            });
          } catch (error) {
            console.log('❌ Command send failed:', error.message);
          }
        }, 3000);
      }
    });
    
  } catch (error) {
    console.log('❌ Verification failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run verification
verifySSEfix().then(result => {
  console.log('\n📋 TDD LONDON SCHOOL: SSE FIX VERIFICATION RESULTS');
  console.log('='.repeat(55));
  
  if (result.success) {
    console.log('✅ SUCCESS: SSE message flow is working!');
    console.log('📊 Messages received:', result.messagesReceived);
    console.log('🎯 Claude response detected:', !!result.claudeResponse);
    console.log('📝 Response preview:', result.claudeResponse?.substring(0, 100) + '...');
    console.log('✅ Conclusion:', result.conclusion);
    
    console.log('\n🎉 FIXED: The SSE connection registration issue has been resolved!');
    console.log('🔧 The problem was: SSE connections were only added to sseConnections but not activeSSEConnections');
    console.log('✅ The solution was: Add connections to both maps in createTerminalSSEStream');
    
  } else {
    console.log('❌ FAILURE: SSE message flow is still not working');
    console.log('📊 Messages received:', result.messagesReceived);
    console.log('❌ Error:', result.error);
    
    console.log('\n🔍 FURTHER INVESTIGATION NEEDED:');
    if (result.messagesReceived === 0) {
      console.log('- No SSE messages received at all (connection registration still failing)');
    } else {
      console.log('- SSE messages received but no Claude AI responses (response routing issue)');
    }
  }
  
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.log('❌ Test runner failed:', error.message);
  process.exit(1);
});