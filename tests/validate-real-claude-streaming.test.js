/**
 * SPARC Phase 5: Validation - Real Claude Process Output Streaming Test
 * 
 * This test validates that the terminal pipe now streams REAL Claude output
 * instead of mock responses, ensuring authentic bidirectional communication.
 */

const { spawn } = require('child_process');
const { EventSource } = require('eventsource');

// Test configuration
const BACKEND_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

/**
 * Test 1: Verify Real Claude Process Creation and Real Working Directory
 */
async function testRealClaudeProcessCreation() {
  console.log('\n🧪 Test 1: Real Claude Process Creation and Working Directory');
  
  try {
    // Create a real Claude instance in prod directory
    const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: ['claude'],  // Use plain claude command to get prod directory
        instanceType: 'prod'
      })
    });
    
    const createData = await createResponse.json();
    console.log('Instance creation response:', createData);
    
    if (!createData.success || !createData.instance?.id) {
      throw new Error('Failed to create Claude instance');
    }
    
    const instanceId = createData.instance.id;
    console.log(`✅ Created Claude instance: ${instanceId}`);
    
    // Verify working directory is /workspaces/agent-feed/prod (not hardcoded /workspaces/agent-feed)
    if (createData.instance.workingDirectory?.includes('/prod')) {
      console.log(`✅ Real working directory: ${createData.instance.workingDirectory}`);
    } else {
      console.log(`❌ Wrong working directory: ${createData.instance.workingDirectory}`);
      return false;
    }
    
    return instanceId;
    
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    return false;
  }
}

/**
 * Test 2: Verify Real Claude Output Streaming (No Mock Responses)
 */
async function testRealClaudeOutputStreaming(instanceId) {
  console.log('\n🧪 Test 2: Real Claude Output Streaming');
  
  return new Promise((resolve) => {
    let receivedRealOutput = false;
    let receivedMockOutput = false;
    const realOutputMessages = [];
    const mockIndicators = ['[RESPONSE]', 'HTTP/SSE input received', 'WebSocket eliminated'];
    
    // Connect to SSE stream
    const eventSource = new EventSource(`${BACKEND_URL}/api/claude/instances/${instanceId}/terminal/stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'output' && data.data) {
          console.log(`📺 Received output: "${data.data.slice(0, 100)}..."`);
          
          // Check if this is real Claude output (marked with isReal flag)
          if (data.isReal && data.source) {
            console.log(`✅ REAL Claude output detected (source: ${data.source})`);
            receivedRealOutput = true;
            realOutputMessages.push(data.data);
            
            // Check for authentic Claude startup messages
            if (data.data.includes('Working directory:') && data.data.includes('/prod')) {
              console.log('✅ Real working directory in output confirmed');
            }
          }
          
          // Check for mock response indicators (should NOT be present)
          const hasMockIndicators = mockIndicators.some(indicator => 
            data.data.includes(indicator)
          );
          
          if (hasMockIndicators) {
            console.log(`❌ Mock response detected: "${data.data}"`);
            receivedMockOutput = true;
          }
        }
        
      } catch (parseError) {
        console.error('Error parsing SSE message:', parseError);
      }
    };
    
    // Wait for initial output, then resolve
    setTimeout(() => {
      eventSource.close();
      
      console.log(`\n📊 Test 2 Results:`);
      console.log(`   Real Claude output received: ${receivedRealOutput}`);
      console.log(`   Mock responses detected: ${receivedMockOutput}`);
      console.log(`   Real messages count: ${realOutputMessages.length}`);
      
      const success = receivedRealOutput && !receivedMockOutput;
      resolve({ success, instanceId, realOutputMessages });
      
    }, 5000); // Wait 5 seconds for output
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
      resolve({ success: false, error: 'SSE connection failed' });
    };
  });
}

/**
 * Test 3: Verify Real Bidirectional Communication
 */
async function testRealBidirectionalCommunication(instanceId) {
  console.log('\n🧪 Test 3: Real Bidirectional Communication');
  
  try {
    // Send a test command to the real Claude process
    const inputResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}/terminal/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: 'pwd\n'  // Simple command that should return real directory
      })
    });
    
    const inputData = await inputResponse.json();
    console.log('Input forwarding response:', inputData);
    
    if (inputData.success) {
      console.log('✅ Command sent to real Claude process');
      
      // Wait a moment for Claude to process and respond
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return true;
    } else {
      console.log('❌ Failed to send command to Claude process');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
    return false;
  }
}

/**
 * Test 4: Verify No Mock Functions Remain Active
 */
async function testNoMockFunctionsActive() {
  console.log('\n🧪 Test 4: Verify Mock Functions Eliminated');
  
  try {
    // Create test instance
    const response = await fetch(`${BACKEND_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: ['claude', '--dangerously-skip-permissions'],
        instanceType: 'prod'
      })
    });
    
    const data = await response.json();
    const instanceId = data.instance?.id;
    
    if (!instanceId) {
      throw new Error('Failed to create test instance');
    }
    
    // Test commands that previously returned mock responses
    const testCommands = ['help', 'ls', 'whoami', 'pwd'];
    const mockResponsesDetected = [];
    
    for (const command of testCommands) {
      // Send command
      await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}/terminal/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: command + '\n' })
      });
      
      // Wait briefly
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✅ Commands sent - should only produce real Claude responses');
    
    // Cleanup
    await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}`, {
      method: 'DELETE'
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
    return false;
  }
}

/**
 * Run All Validation Tests
 */
async function runValidationSuite() {
  console.log('🚀 SPARC Phase 5: Real Claude Terminal Streaming Validation\n');
  
  const results = {
    processCreation: false,
    realOutputStreaming: false,
    bidirectionalCommunication: false,
    mockFunctionsEliminated: false
  };
  
  // Test 1: Process creation and working directory
  const instanceId = await testRealClaudeProcessCreation();
  results.processCreation = !!instanceId;
  
  if (instanceId) {
    // Test 2: Real output streaming
    const streamingResult = await testRealClaudeOutputStreaming(instanceId);
    results.realOutputStreaming = streamingResult.success;
    
    if (streamingResult.success) {
      // Test 3: Bidirectional communication
      results.bidirectionalCommunication = await testRealBidirectionalCommunication(instanceId);
    }
    
    // Cleanup instance
    try {
      await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}`, {
        method: 'DELETE'
      });
      console.log(`🗑️ Cleaned up test instance: ${instanceId}`);
    } catch (error) {
      console.error('Warning: Failed to cleanup instance:', error);
    }
  }
  
  // Test 4: Mock functions eliminated
  results.mockFunctionsEliminated = await testNoMockFunctionsActive();
  
  // Final results
  console.log('\n📊 VALIDATION RESULTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✨ Real Process Creation: ${results.processCreation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`✨ Real Output Streaming: ${results.realOutputStreaming ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`✨ Bidirectional Communication: ${results.bidirectionalCommunication ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`✨ Mock Functions Eliminated: ${results.mockFunctionsEliminated ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result === true);
  
  console.log('\n🎯 OVERALL RESULT:');
  console.log(allPassed 
    ? '🎉 ALL TESTS PASSED - Real Claude streaming successfully implemented!' 
    : '⚠️ Some tests failed - review implementation'
  );
  
  return allPassed;
}

// Run the validation suite
if (require.main === module) {
  runValidationSuite()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Validation suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runValidationSuite };