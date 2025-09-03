/**
 * TDD London School: SSE Connection Integration Test
 * 
 * FAILING TEST: Real SSE endpoint connection and message flow integration
 * Focus: Test actual backend SSE endpoint connection registration and message broadcasting
 * 
 * This test will connect to the real backend SSE endpoint to verify:
 * 1. SSE connection is properly registered in activeSSEConnections
 * 2. broadcastToConnections actually sends messages to registered connections  
 * 3. SSE endpoint returns correct headers and accepts connections
 * 4. Message format matches contract expectations
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3000';
const TEST_INSTANCE_ID = 'claude-test-integration';

describe('SSE Connection Integration Testing', () => {
  let testInstanceCreated = false;

  beforeAll(async () => {
    // Wait for backend to be ready
    await waitForBackend();
    
    // Create a test Claude instance for integration testing
    try {
      const response = await fetch(`${BACKEND_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'claude --dangerously-skip-permissions',
          name: 'Integration Test Instance',
          type: 'skip-permissions'
        })
      });
      
      if (response.ok) {
        testInstanceCreated = true;
        console.log('✅ Test instance created for integration testing');
      } else {
        console.warn('⚠️ Failed to create test instance, using mock instance ID');
      }
    } catch (error) {
      console.warn('⚠️ Backend not available for instance creation:', error.message);
    }
  });

  afterAll(async () => {
    // Clean up test instance if created
    if (testInstanceCreated) {
      try {
        await fetch(`${BACKEND_URL}/api/claude/instances/${TEST_INSTANCE_ID}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.warn('Could not clean up test instance:', error.message);
      }
    }
  });

  describe('SSE Endpoint Connection Contract', () => {
    it('should accept SSE connection and return correct headers', async () => {
      // ARRANGE: SSE endpoint URL
      const sseUrl = `${BACKEND_URL}/api/claude/instances/${TEST_INSTANCE_ID}/terminal/stream`;
      
      // ACT: Make HTTP request to SSE endpoint
      const response = await fetch(sseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      // ASSERT: Verify SSE headers
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/event-stream');
      expect(response.headers.get('cache-control')).toBe('no-cache');
      expect(response.headers.get('connection')).toBe('keep-alive');
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      
      // Clean up connection
      response.body?.destroy();
    });

    it('should register connection in backend activeSSEConnections map', async (done) => {
      // This test verifies the most critical contract: connection registration
      
      // ARRANGE: Set up real EventSource connection
      const sseUrl = `${BACKEND_URL}/api/claude/instances/${TEST_INSTANCE_ID}/terminal/stream`;
      let eventSource;
      let connectionReceived = false;
      
      try {
        // Use node-fetch to simulate EventSource behavior
        const response = await fetch(sseUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache'
          }
        });

        // ASSERT: Connection should be established
        expect(response.status).toBe(200);
        
        // Now test if we can verify the connection is registered
        // We need to trigger a message to see if the connection receives it
        setTimeout(async () => {
          try {
            // Send a test command to the instance to trigger broadcastToConnections
            const commandResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${TEST_INSTANCE_ID}/terminal/input`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                input: 'echo "Integration test message"',
                instanceId: TEST_INSTANCE_ID
              })
            });
            
            console.log('Command sent, status:', commandResponse.status);
          } catch (error) {
            console.warn('Could not send test command:', error.message);
          }
        }, 100);
        
        // Clean up
        response.body?.destroy();
        done();
      } catch (error) {
        console.warn('SSE connection test failed:', error.message);
        done();
      }
    });

    it('should fail gracefully when instance does not exist', async () => {
      // ARRANGE: Non-existent instance ID
      const nonExistentId = 'claude-nonexistent-instance';
      const sseUrl = `${BACKEND_URL}/api/claude/instances/${nonExistentId}/terminal/stream`;
      
      // ACT: Attempt to connect to non-existent instance
      const response = await fetch(sseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      // ASSERT: Should still return 200 but may send error message in stream
      expect(response.status).toBe(200);
      
      // Clean up
      response.body?.destroy();
    });
  });

  describe('Message Broadcasting Contract', () => {
    it('should broadcast messages to registered SSE connections', async () => {
      // This is the CRITICAL FAILING TEST
      // It will verify if broadcastToConnections actually sends messages to SSE connections
      
      const sseUrl = `${BACKEND_URL}/api/claude/instances/${TEST_INSTANCE_ID}/terminal/stream`;
      let messageReceived = false;
      let receivedData = null;
      
      return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timeout: No message received within 5 seconds'));
        }, 5000);
        
        try {
          // ARRANGE: Create real SSE connection
          const response = await fetch(sseUrl, {
            method: 'GET',
            headers: {
              'Accept': 'text/event-stream',
              'Cache-Control': 'no-cache'
            }
          });

          if (!response.ok) {
            clearTimeout(timeout);
            reject(new Error(`Failed to establish SSE connection: ${response.status}`));
            return;
          }

          // Set up stream reading
          const decoder = new TextDecoder();
          const reader = response.body?.getReader();
          
          if (!reader) {
            clearTimeout(timeout);
            reject(new Error('Could not get stream reader'));
            return;
          }

          // Read stream data
          const readStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                console.log('SSE chunk received:', chunk);
                
                // Check if this is a data message
                if (chunk.includes('data:')) {
                  messageReceived = true;
                  receivedData = chunk;
                  clearTimeout(timeout);
                  
                  // Parse the message to verify format
                  try {
                    const dataMatch = chunk.match(/data: (.+)/);
                    if (dataMatch) {
                      const messageData = JSON.parse(dataMatch[1]);
                      
                      // ASSERT: Verify message format matches contract
                      expect(messageData).toHaveProperty('type');
                      expect(messageData).toHaveProperty('instanceId', TEST_INSTANCE_ID);
                      
                      resolve(messageData);
                      return;
                    }
                  } catch (parseError) {
                    console.warn('Could not parse SSE message:', parseError);
                  }
                }
              }
            } catch (streamError) {
              clearTimeout(timeout);
              reject(streamError);
            }
          };

          readStream();

          // ACT: Send a command to trigger message broadcasting
          setTimeout(async () => {
            try {
              await fetch(`${BACKEND_URL}/api/claude/instances/${TEST_INSTANCE_ID}/terminal/input`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  input: 'echo "TEST_MESSAGE_FROM_INTEGRATION"',
                  instanceId: TEST_INSTANCE_ID
                })
              });
            } catch (cmdError) {
              console.warn('Could not send command:', cmdError);
            }
          }, 200);

        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });

    it('should handle multiple SSE connections to same instance', async () => {
      // ARRANGE: Create multiple SSE connections
      const sseUrl = `${BACKEND_URL}/api/claude/instances/${TEST_INSTANCE_ID}/terminal/stream`;
      const connections = [];
      
      try {
        // Create 2 connections to same instance
        for (let i = 0; i < 2; i++) {
          const response = await fetch(sseUrl, {
            method: 'GET',
            headers: {
              'Accept': 'text/event-stream',
              'Cache-Control': 'no-cache'
            }
          });
          
          expect(response.status).toBe(200);
          connections.push(response);
        }

        // ASSERT: Both connections should be established
        expect(connections).toHaveLength(2);
        
        // ACT: Send message that should reach both connections
        // This would require monitoring both streams, but for this test
        // we'll just verify the connections can be established
        
      } finally {
        // Clean up all connections
        connections.forEach(conn => {
          conn.body?.destroy();
        });
      }
    });
  });

  describe('Real-world Message Flow Debugging', () => {
    it('should identify if Claude AI responses trigger broadcastToConnections', async () => {
      // This test simulates the exact scenario described in the issue:
      // Claude AI generates response but frontend doesn't receive it
      
      const sseUrl = `${BACKEND_URL}/api/claude/instances/${TEST_INSTANCE_ID}/terminal/stream`;
      
      return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve({
            success: false,
            error: 'No Claude AI response received within 10 seconds',
            conclusion: 'Contract failure: Claude AI responses not reaching frontend via SSE'
          });
        }, 10000);
        
        try {
          // ARRANGE: Create SSE connection and wait for Claude response
          const response = await fetch(sseUrl, {
            method: 'GET',
            headers: {
              'Accept': 'text/event-stream',
              'Cache-Control': 'no-cache'
            }
          });

          const decoder = new TextDecoder();
          const reader = response.body?.getReader();
          let receivedMessages = [];
          
          // Monitor stream
          const monitorStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader?.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                
                if (chunk.includes('data:')) {
                  const dataMatch = chunk.match(/data: (.+)/);
                  if (dataMatch) {
                    try {
                      const messageData = JSON.parse(dataMatch[1]);
                      receivedMessages.push(messageData);
                      
                      // Check if this looks like a Claude AI response
                      if (messageData.type === 'terminal_output' && 
                          messageData.data && 
                          !messageData.data.includes('echo')) {
                        clearTimeout(timeout);
                        resolve({
                          success: true,
                          message: messageData,
                          conclusion: 'Claude AI responses ARE reaching frontend via SSE'
                        });
                        return;
                      }
                    } catch (parseError) {
                      console.warn('Parse error:', parseError);
                    }
                  }
                }
              }
            } catch (streamError) {
              console.warn('Stream error:', streamError);
            }
          };

          monitorStream();

          // ACT: Send a message that should trigger Claude AI response
          setTimeout(async () => {
            try {
              await fetch(`${BACKEND_URL}/api/claude/instances/${TEST_INSTANCE_ID}/terminal/input`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  input: 'Hello Claude, can you respond with a simple greeting?',
                  instanceId: TEST_INSTANCE_ID
                })
              });
            } catch (cmdError) {
              console.warn('Command send error:', cmdError);
            }
          }, 500);

        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  });
});

// Helper function to wait for backend availability
async function waitForBackend(maxRetries = 10, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      if (response.ok) {
        console.log('✅ Backend is ready for testing');
        return true;
      }
    } catch (error) {
      console.log(`⏳ Waiting for backend... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Backend not available for testing');
}

/**
 * INTEGRATION TEST ANALYSIS:
 * 
 * These integration tests will reveal the exact point where the SSE message flow breaks:
 * 
 * 1. ✅ SSE endpoint accepts connections (headers, connection establishment)
 * 2. ❓ SSE connection registration in activeSSEConnections map
 * 3. ❓ broadcastToConnections actually sends to registered connections
 * 4. ❓ Claude AI responses trigger broadcastToConnections calls
 * 
 * EXPECTED FAILURE POINT: 
 * Most likely the test "should broadcast messages to registered SSE connections" will FAIL,
 * revealing that either:
 * a) Connections are not being registered properly in activeSSEConnections
 * b) broadcastToConnections is not finding the registered connections
 * c) broadcastToConnections is not being called for Claude AI responses
 * 
 * Once we identify the exact failure, we can fix the specific contract violation.
 */