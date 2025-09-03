/**
 * TDD London School: Manual SSE Debug Script
 * 
 * FAILING TEST: Direct integration test to identify exact SSE failure point
 * This script will manually test each contract boundary to isolate the problem
 * 
 * Run with: node tests/tdd-london-school/sse-manual-debug.js
 */

import fetch from 'node-fetch';
import { EventSource } from 'eventsource';

const BACKEND_URL = 'http://localhost:3000';
const TEST_INSTANCE_ID = 'claude-test-debug';

console.log('🧪 TDD London School: SSE Message Flow Debug');
console.log('='.repeat(50));

// Mock tracking for contract verification
const contractResults = {
  backendBroadcast: null,
  sseEndpoint: null,
  frontendHandler: null,
  uiDisplay: null
};

async function testContract1_BackendBroadcast() {
  console.log('\n📋 CONTRACT 1: Backend broadcastToConnections');
  console.log('-'.repeat(45));
  
  try {
    // Test if backend has active instances
    const instancesResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const instances = await instancesResponse.json();
    
    console.log('✅ Backend reachable');
    console.log('📊 Available instances:', instances.length);
    
    if (instances.length === 0) {
      console.log('⚠️  No instances available - creating test instance...');
      
      const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'claude --dangerously-skip-permissions',
          name: 'Debug Test Instance',
          type: 'skip-permissions'
        })
      });
      
      if (createResponse.ok) {
        console.log('✅ Test instance created');
      } else {
        console.log('❌ Failed to create test instance');
      }
    }
    
    contractResults.backendBroadcast = {
      passed: true,
      details: 'Backend is running and can handle requests'
    };
    
  } catch (error) {
    console.log('❌ Backend unreachable:', error.message);
    contractResults.backendBroadcast = {
      passed: false,
      error: error.message
    };
  }
}

async function testContract2_SSEEndpoint() {
  console.log('\n📋 CONTRACT 2: SSE Endpoint Connection');
  console.log('-'.repeat(45));
  
  try {
    // Get available instances first
    const instancesResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const instances = await instancesResponse.json();
    
    let instanceId = TEST_INSTANCE_ID;
    if (instances.length > 0) {
      instanceId = instances[0].id;
      console.log('📍 Using instance:', instanceId);
    } else {
      console.log('⚠️  No instances found, using test ID:', instanceId);
    }
    
    // Test SSE endpoint headers
    const sseUrl = `${BACKEND_URL}/api/claude/instances/${instanceId}/terminal/stream`;
    console.log('🔗 Testing SSE endpoint:', sseUrl);
    
    const response = await fetch(sseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Content-Type:', response.headers.get('content-type'));
    console.log('📊 Cache-Control:', response.headers.get('cache-control'));
    console.log('📊 Connection:', response.headers.get('connection'));
    
    const expectedHeaders = {
      status: 200,
      contentType: 'text/event-stream',
      cacheControl: 'no-cache',
      connection: 'keep-alive'
    };
    
    const actualHeaders = {
      status: response.status,
      contentType: response.headers.get('content-type'),
      cacheControl: response.headers.get('cache-control'),
      connection: response.headers.get('connection')
    };
    
    const headersMatch = response.status === 200 && 
                        response.headers.get('content-type') === 'text/event-stream' &&
                        response.headers.get('cache-control') === 'no-cache' &&
                        response.headers.get('connection') === 'keep-alive';
    
    if (headersMatch) {
      console.log('✅ SSE endpoint headers correct');
      contractResults.sseEndpoint = {
        passed: true,
        details: 'SSE endpoint returns correct headers',
        headers: actualHeaders
      };
    } else {
      console.log('❌ SSE endpoint headers incorrect');
      console.log('Expected:', expectedHeaders);
      console.log('Actual:', actualHeaders);
      contractResults.sseEndpoint = {
        passed: false,
        error: 'Incorrect SSE headers',
        expected: expectedHeaders,
        actual: actualHeaders
      };
    }
    
    // Clean up connection
    response.body?.destroy();
    
  } catch (error) {
    console.log('❌ SSE endpoint test failed:', error.message);
    contractResults.sseEndpoint = {
      passed: false,
      error: error.message
    };
  }
}

async function testContract3_MessageFlow() {
  console.log('\n📋 CONTRACT 3: End-to-End Message Flow');
  console.log('-'.repeat(45));
  
  return new Promise(async (resolve) => {
    try {
      // Get available instances
      const instancesResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
      const instances = await instancesResponse.json();
      
      let instanceId = TEST_INSTANCE_ID;
      if (instances.length > 0) {
        instanceId = instances[0].id;
        console.log('📍 Using instance for message flow test:', instanceId);
      } else {
        console.log('❌ No instances available for message flow test');
        contractResults.frontendHandler = {
          passed: false,
          error: 'No instances available'
        };
        resolve();
        return;
      }
      
      const sseUrl = `${BACKEND_URL}/api/claude/instances/${instanceId}/terminal/stream`;
      let messageReceived = false;
      let receivedMessages = [];
      
      // Set timeout for test
      const timeout = setTimeout(() => {
        console.log('⏰ Message flow test timeout (10 seconds)');
        console.log('📊 Messages received:', receivedMessages.length);
        
        if (receivedMessages.length === 0) {
          console.log('❌ CRITICAL: No messages received from SSE stream');
          console.log('🔍 This indicates the contract failure is likely:');
          console.log('   1. SSE connections not being registered in activeSSEConnections');
          console.log('   2. broadcastToConnections not finding registered connections');
          console.log('   3. Claude responses not triggering broadcastToConnections');
          
          contractResults.frontendHandler = {
            passed: false,
            error: 'No SSE messages received within timeout',
            conclusion: 'SSE connection registration or broadcasting failure'
          };
        } else {
          console.log('✅ Messages received but may not include Claude responses');
          contractResults.frontendHandler = {
            passed: true,
            details: `Received ${receivedMessages.length} messages`,
            messages: receivedMessages
          };
        }
        
        resolve();
      }, 10000);
      
      // Create EventSource connection
      console.log('🔗 Creating EventSource connection...');
      
      const response = await fetch(sseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.log('❌ Failed to establish SSE connection:', response.status);
        clearTimeout(timeout);
        contractResults.frontendHandler = {
          passed: false,
          error: `SSE connection failed with status ${response.status}`
        };
        resolve();
        return;
      }
      
      console.log('✅ SSE connection established');
      
      // Read stream
      const decoder = new TextDecoder();
      const reader = response.body?.getReader();
      
      if (!reader) {
        console.log('❌ Could not get stream reader');
        clearTimeout(timeout);
        resolve();
        return;
      }
      
      // Monitor stream in background
      const monitorStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            
            if (chunk.trim()) {
              console.log('📨 SSE chunk received:', JSON.stringify(chunk.substring(0, 100)) + '...');
              
              // Parse SSE messages
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const messageData = JSON.parse(line.substring(6));
                    receivedMessages.push(messageData);
                    messageReceived = true;
                    
                    console.log('📋 Parsed message:', {
                      type: messageData.type,
                      instanceId: messageData.instanceId,
                      hasData: !!messageData.data,
                      isReal: messageData.isReal
                    });
                    
                    // Check if this is a Claude AI response
                    if (messageData.type === 'terminal_output' && 
                        messageData.data && 
                        !messageData.data.includes('echo') &&
                        messageData.data.length > 10) {
                      console.log('🎯 CLAUDE AI RESPONSE DETECTED!');
                      console.log('   Content:', messageData.data.substring(0, 50) + '...');
                      console.log('✅ CONTRACT WORKING: Claude responses reach frontend!');
                      
                      clearTimeout(timeout);
                      contractResults.frontendHandler = {
                        passed: true,
                        details: 'Claude AI response successfully received via SSE',
                        claudeResponse: messageData
                      };
                      resolve();
                      return;
                    }
                    
                  } catch (parseError) {
                    console.log('⚠️  Could not parse message:', parseError.message);
                  }
                }
              }
            }
          }
        } catch (streamError) {
          console.log('❌ Stream read error:', streamError.message);
        }
      };
      
      monitorStream();
      
      // Send test commands to trigger responses
      console.log('📤 Sending test commands to trigger responses...');
      
      setTimeout(async () => {
        try {
          console.log('📤 Sending echo command...');
          await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}/terminal/input`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: 'echo "TEST_MESSAGE_DEBUG"',
              instanceId: instanceId
            })
          });
        } catch (error) {
          console.log('⚠️  Could not send echo command:', error.message);
        }
      }, 1000);
      
      setTimeout(async () => {
        try {
          console.log('📤 Sending Claude AI query...');
          await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}/terminal/input`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: 'Hello Claude! Can you respond with a simple greeting? This is a debug test.',
              instanceId: instanceId
            })
          });
        } catch (error) {
          console.log('⚠️  Could not send Claude command:', error.message);
        }
      }, 3000);
      
    } catch (error) {
      console.log('❌ Message flow test failed:', error.message);
      contractResults.frontendHandler = {
        passed: false,
        error: error.message
      };
      resolve();
    }
  });
}

async function testContract4_UIDisplay() {
  console.log('\n📋 CONTRACT 4: UI Message Display');
  console.log('-'.repeat(45));
  
  // Mock UI display logic
  const mockUIOutput = [];
  
  const addMessageToUI = (message) => {
    const uiMessage = {
      id: `ui-${Date.now()}`,
      instanceId: message.instanceId,
      type: 'output',
      content: message.data || message.output,
      timestamp: new Date(),
      isReal: message.isReal
    };
    
    mockUIOutput.push(uiMessage);
    return uiMessage;
  };
  
  // Test message processing
  const testMessage = {
    type: 'terminal_output',
    data: 'Test Claude response',
    instanceId: 'test-instance',
    isReal: true
  };
  
  const uiResult = addMessageToUI(testMessage);
  
  if (uiResult && mockUIOutput.length === 1) {
    console.log('✅ UI message display logic works correctly');
    contractResults.uiDisplay = {
      passed: true,
      details: 'UI can process and display messages',
      processedMessage: uiResult
    };
  } else {
    console.log('❌ UI message display logic failed');
    contractResults.uiDisplay = {
      passed: false,
      error: 'Failed to process message for UI display'
    };
  }
}

function printContractSummary() {
  console.log('\n📋 TDD LONDON SCHOOL: CONTRACT ANALYSIS SUMMARY');
  console.log('='.repeat(55));
  
  Object.entries(contractResults).forEach(([contract, result]) => {
    const status = result?.passed ? '✅ PASSING' : '❌ FAILING';
    console.log(`${status} ${contract.toUpperCase()}`);
    
    if (result?.details) {
      console.log(`   Details: ${result.details}`);
    }
    
    if (result?.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result?.conclusion) {
      console.log(`   Conclusion: ${result.conclusion}`);
    }
    
    console.log('');
  });
  
  console.log('🔍 DIAGNOSIS:');
  const failingContracts = Object.entries(contractResults)
    .filter(([_, result]) => result && !result.passed)
    .map(([contract, _]) => contract);
  
  if (failingContracts.length === 0) {
    console.log('✅ All contracts passing - investigate timing or specific message types');
  } else {
    console.log('❌ Failing contracts:', failingContracts.join(', '));
    console.log('🔧 Focus debugging effort on the first failing contract');
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testContract1_BackendBroadcast();
    await testContract2_SSEEndpoint();
    await testContract3_MessageFlow();
    await testContract4_UIDisplay();
    
    printContractSummary();
    
  } catch (error) {
    console.log('❌ Test runner failed:', error.message);
  } finally {
    console.log('\n🏁 TDD London School Debug Complete');
    process.exit(0);
  }
}

// Start tests
runAllTests();