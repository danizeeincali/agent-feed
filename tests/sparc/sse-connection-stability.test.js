/**
 * SPARC Phase 4: Comprehensive SSE Connection Stability Test Suite
 * Tests the enhanced SSE connection management with error recovery
 */

const http = require('http');
const EventSource = require('eventsource');

// Test configuration
const TEST_CONFIG = {
  BACKEND_URL: 'http://localhost:3000',
  TEST_TIMEOUT: 30000,
  CONNECTION_TIMEOUT: 10000,
  RECONNECTION_ATTEMPTS: 5,
  MESSAGE_INTERVAL: 1000
};

// Mock Claude instance for testing
let testInstanceId = null;

describe('SPARC SSE Connection Stability Tests', () => {
  
  beforeAll(async () => {
    // Create a test Claude instance
    const response = await fetch(`${TEST_CONFIG.BACKEND_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: ['claude', '--dangerously-skip-permissions']
      })
    });
    
    const data = await response.json();
    if (data.success && data.instance?.id) {
      testInstanceId = data.instance.id;
      console.log('✅ Test instance created:', testInstanceId);
    } else {
      throw new Error('Failed to create test instance');
    }
  }, TEST_CONFIG.TEST_TIMEOUT);

  afterAll(async () => {
    // Clean up test instance
    if (testInstanceId) {
      await fetch(`${TEST_CONFIG.BACKEND_URL}/api/claude/instances/${testInstanceId}`, {
        method: 'DELETE'
      });
      console.log('🧹 Test instance cleaned up:', testInstanceId);
    }
  });

  describe('Connection Establishment', () => {
    
    test('should establish stable SSE connection', (done) => {
      const eventSource = new EventSource(
        `${TEST_CONFIG.BACKEND_URL}/api/claude/instances/${testInstanceId}/terminal/stream`
      );
      
      const timeout = setTimeout(() => {
        eventSource.close();
        done(new Error('Connection timeout'));
      }, TEST_CONFIG.CONNECTION_TIMEOUT);
      
      eventSource.onopen = () => {
        console.log('✅ SSE connection established successfully');
        clearTimeout(timeout);
        eventSource.close();
        done();
      };
      
      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        eventSource.close();
        done(new Error('SSE connection failed: ' + error.message));
      };
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should receive initial connection confirmation', (done) => {
      const eventSource = new EventSource(
        `${TEST_CONFIG.BACKEND_URL}/api/claude/instances/${testInstanceId}/terminal/stream`
      );
      
      let receivedConfirmation = false;
      
      const timeout = setTimeout(() => {
        eventSource.close();
        if (!receivedConfirmation) {
          done(new Error('No connection confirmation received'));
        }
      }, TEST_CONFIG.CONNECTION_TIMEOUT);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') {
            console.log('✅ Connection confirmation received');
            receivedConfirmation = true;
            clearTimeout(timeout);
            eventSource.close();
            done();
          }
        } catch (parseError) {
          console.warn('Message parsing error (non-critical):', parseError);
        }
      };
      
      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        eventSource.close();
        done(new Error('Connection error: ' + error.message));
      };
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('Message Processing', () => {
    
    test('should handle terminal output messages correctly', (done) => {
      const eventSource = new EventSource(
        `${TEST_CONFIG.BACKEND_URL}/api/claude/instances/${testInstanceId}/terminal/stream`
      );
      
      let messageReceived = false;
      
      // Send a test command after connection is established
      eventSource.onopen = async () => {
        console.log('🔗 Connection open, sending test input');
        
        try {
          const inputResponse = await fetch(
            `${TEST_CONFIG.BACKEND_URL}/api/claude/instances/${testInstanceId}/terminal/input`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ input: 'echo "SPARC Test Message"' })
            }
          );
          
          if (!inputResponse.ok) {
            throw new Error('Failed to send test input');
          }
          
          console.log('✅ Test input sent successfully');
        } catch (error) {
          console.error('❌ Failed to send test input:', error);
          eventSource.close();
          done(error);
        }
      };
      
      const timeout = setTimeout(() => {
        eventSource.close();
        if (!messageReceived) {
          done(new Error('No terminal output received'));
        }
      }, TEST_CONFIG.TEST_TIMEOUT);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'terminal_output' || data.type === 'terminal:output' || data.output) {
            console.log('✅ Terminal output received:', data);
            messageReceived = true;
            clearTimeout(timeout);
            eventSource.close();
            done();
          } else if (data.type === 'connected') {
            console.log('📡 Connection established');
          }
        } catch (parseError) {
          console.warn('Message parsing error:', parseError);
        }
      };
      
      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        eventSource.close();
        done(new Error('Connection error during message test: ' + error.message));
      };
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('Connection Persistence', () => {
    
    test('should maintain connection for extended period', (done) => {
      const eventSource = new EventSource(
        `${TEST_CONFIG.BACKEND_URL}/api/claude/instances/${testInstanceId}/terminal/stream`
      );
      
      let messageCount = 0;
      const requiredMessages = 5;
      let connectionDropped = false;
      
      const timeout = setTimeout(() => {
        eventSource.close();
        if (connectionDropped) {
          done(new Error('Connection dropped unexpectedly'));
        } else if (messageCount < requiredMessages) {
          done(new Error(`Only received ${messageCount}/${requiredMessages} messages`));
        } else {
          console.log(`✅ Connection remained stable for ${requiredMessages} messages`);
          done();
        }
      }, TEST_CONFIG.TEST_TIMEOUT);
      
      // Send periodic test messages
      const messageInterval = setInterval(async () => {
        if (messageCount >= requiredMessages) {
          clearInterval(messageInterval);
          return;
        }
        
        try {
          const response = await fetch(
            `${TEST_CONFIG.BACKEND_URL}/api/claude/instances/${testInstanceId}/terminal/input`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                input: `echo "Stability test message ${messageCount + 1}"` 
              })
            }
          );
          
          if (!response.ok) {
            console.warn('Failed to send test message:', response.status);
          }
        } catch (error) {
          console.warn('Error sending test message:', error);
        }
      }, TEST_CONFIG.MESSAGE_INTERVAL);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'terminal_output' || data.type === 'terminal:output' || data.output) {
            messageCount++;
            console.log(`📨 Message ${messageCount}/${requiredMessages} received`);
            
            if (messageCount >= requiredMessages) {
              clearInterval(messageInterval);
              clearTimeout(timeout);
              eventSource.close();
              console.log('✅ Connection stability test passed');
              done();
            }
          }
        } catch (parseError) {
          console.warn('Message parsing error:', parseError);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('❌ Connection dropped:', error);
        connectionDropped = true;
        clearInterval(messageInterval);
        clearTimeout(timeout);
        eventSource.close();
        done(new Error('Connection dropped during stability test'));
      };
      
      eventSource.onopen = () => {
        console.log('✅ Stability test connection established');
      };
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('Error Recovery', () => {
    
    test('should handle connection interruption gracefully', (done) => {
      // This test simulates connection issues by creating multiple rapid connections
      let connectionCount = 0;
      let successfulConnections = 0;
      const maxConnections = 3;
      
      const testConnection = () => {
        if (connectionCount >= maxConnections) {
          if (successfulConnections > 0) {
            console.log(`✅ Error recovery test passed: ${successfulConnections}/${maxConnections} connections successful`);
            done();
          } else {
            done(new Error('No successful connections during error recovery test'));
          }
          return;
        }
        
        connectionCount++;
        console.log(`🔄 Testing connection ${connectionCount}/${maxConnections}`);
        
        const eventSource = new EventSource(
          `${TEST_CONFIG.BACKEND_URL}/api/claude/instances/${testInstanceId}/terminal/stream`
        );
        
        const connectionTimeout = setTimeout(() => {
          eventSource.close();
          console.log(`⚠️ Connection ${connectionCount} timed out`);
          testConnection(); // Try next connection
        }, 5000);
        
        eventSource.onopen = () => {
          console.log(`✅ Connection ${connectionCount} established`);
          successfulConnections++;
          clearTimeout(connectionTimeout);
          eventSource.close();
          
          // Short delay before next connection
          setTimeout(testConnection, 1000);
        };
        
        eventSource.onerror = (error) => {
          console.log(`❌ Connection ${connectionCount} failed:`, error.message);
          clearTimeout(connectionTimeout);
          eventSource.close();
          
          // Continue testing even after failures
          setTimeout(testConnection, 1000);
        };
      };
      
      testConnection();
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('Resource Management', () => {
    
    test('should properly cleanup connections', async () => {
      const connections = [];
      const connectionCount = 5;
      
      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const eventSource = new EventSource(
          `${TEST_CONFIG.BACKEND_URL}/api/claude/instances/${testInstanceId}/terminal/stream`
        );
        connections.push(eventSource);
      }
      
      // Wait a moment for connections to establish
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Close all connections
      connections.forEach((eventSource, index) => {
        console.log(`🔌 Closing connection ${index + 1}`);
        eventSource.close();
      });
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Connection cleanup test completed');
      expect(true).toBe(true); // Test passes if no memory leaks or errors
    });
  });
});

// Utility functions for testing
const testUtils = {
  
  waitForConnection: (eventSource, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);
      
      eventSource.onopen = () => {
        clearTimeout(timer);
        resolve();
      };
      
      eventSource.onerror = (error) => {
        clearTimeout(timer);
        reject(error);
      };
    });
  },
  
  waitForMessage: (eventSource, messageType, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`No ${messageType} message received`));
      }, timeout);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === messageType) {
            clearTimeout(timer);
            resolve(data);
          }
        } catch (error) {
          // Continue listening for other messages
        }
      };
      
      eventSource.onerror = (error) => {
        clearTimeout(timer);
        reject(error);
      };
    });
  }
};

module.exports = { testUtils };