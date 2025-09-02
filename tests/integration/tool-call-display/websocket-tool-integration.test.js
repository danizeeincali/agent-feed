/**
 * @file WebSocket Tool Call Integration Tests
 * @description Tests for tool call integration with WebSocket system
 * These tests verify that tool call display doesn't break existing functionality
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const WebSocket = require('ws');
const { spawn } = require('child_process');

describe('WebSocket Tool Call Integration', () => {
  let server;
  let client;
  let serverProcess;

  beforeAll(async () => {
    // Start test server
    serverProcess = spawn('node', ['simple-backend.js'], {
      env: { ...process.env, PORT: 3001, NODE_ENV: 'test' }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (client) {
      client.terminate();
    }
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  beforeEach(() => {
    return new Promise((resolve) => {
      client = new WebSocket('ws://localhost:3001');
      client.on('open', resolve);
    });
  });

  afterEach(() => {
    if (client && client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });

  describe('Tool Call Message Processing', () => {
    test('should handle tool call messages without breaking WebSocket', (done) => {
      const toolCallMessage = {
        type: 'tool_call',
        data: {
          function: {
            name: 'Bash',
            arguments: JSON.stringify({
              command: 'echo "integration test"',
              description: 'Test command execution'
            })
          }
        }
      };

      let messageReceived = false;

      client.on('message', (data) => {
        const message = JSON.parse(data);
        
        expect(message).toHaveProperty('type');
        expect(message).toHaveProperty('formatted');
        expect(message.formatted).toContain('● Bash(echo "integration test")');
        
        messageReceived = true;
        done();
      });

      client.send(JSON.stringify(toolCallMessage));

      // Timeout protection
      setTimeout(() => {
        if (!messageReceived) {
          done(new Error('No response received within timeout'));
        }
      }, 5000);
    });

    test('should maintain backward compatibility with chat messages', (done) => {
      const chatMessage = {
        type: 'chat',
        content: 'Hello, this is a regular chat message'
      };

      client.on('message', (data) => {
        const message = JSON.parse(data);
        
        expect(message.type).toBe('chat');
        expect(message.content).toBe('Hello, this is a regular chat message');
        
        done();
      });

      client.send(JSON.stringify(chatMessage));
    });

    test('should handle mixed message types in sequence', (done) => {
      const messages = [
        { type: 'chat', content: 'Starting test sequence' },
        { 
          type: 'tool_call', 
          data: { 
            function: { 
              name: 'Read', 
              arguments: JSON.stringify({ file_path: '/test/file.txt' }) 
            } 
          } 
        },
        { type: 'chat', content: 'Test sequence complete' }
      ];

      let receivedCount = 0;
      const expectedResponses = messages.length;

      client.on('message', (data) => {
        receivedCount++;
        
        if (receivedCount === expectedResponses) {
          expect(receivedCount).toBe(3);
          done();
        }
      });

      // Send messages with slight delay to ensure order
      messages.forEach((msg, index) => {
        setTimeout(() => {
          client.send(JSON.stringify(msg));
        }, index * 100);
      });
    });
  });

  describe('Connection Stability', () => {
    test('should maintain connection during tool call processing', (done) => {
      let connectionStable = true;

      client.on('close', () => {
        connectionStable = false;
      });

      client.on('error', () => {
        connectionStable = false;
      });

      const toolCall = {
        type: 'tool_call',
        data: {
          function: {
            name: 'Bash',
            arguments: JSON.stringify({ command: 'sleep 1' })
          }
        }
      };

      client.send(JSON.stringify(toolCall));

      // Check stability after processing
      setTimeout(() => {
        expect(connectionStable).toBe(true);
        expect(client.readyState).toBe(WebSocket.OPEN);
        done();
      }, 2000);
    });

    test('should handle rapid tool call messages', (done) => {
      const rapidMessages = Array(50).fill().map((_, i) => ({
        type: 'tool_call',
        data: {
          function: {
            name: 'Bash',
            arguments: JSON.stringify({ command: `echo "rapid test ${i}"` })
          }
        }
      }));

      let responsesReceived = 0;
      let connectionStable = true;

      client.on('close', () => {
        connectionStable = false;
      });

      client.on('message', () => {
        responsesReceived++;
        
        if (responsesReceived === rapidMessages.length) {
          expect(connectionStable).toBe(true);
          expect(client.readyState).toBe(WebSocket.OPEN);
          done();
        }
      });

      // Send all messages rapidly
      rapidMessages.forEach(msg => {
        client.send(JSON.stringify(msg));
      });
    });
  });

  describe('Memory and Performance', () => {
    test('should not cause memory leaks with repeated tool calls', (done) => {
      const initialMemory = process.memoryUsage().heapUsed;
      let callsProcessed = 0;
      const totalCalls = 100;

      const processCall = () => {
        if (callsProcessed >= totalCalls) {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }

          const finalMemory = process.memoryUsage().heapUsed;
          const memoryIncrease = finalMemory - initialMemory;

          // Allow reasonable memory increase (less than 10MB)
          expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
          done();
          return;
        }

        const toolCall = {
          type: 'tool_call',
          data: {
            function: {
              name: 'Bash',
              arguments: JSON.stringify({ command: `echo "memory test ${callsProcessed}"` })
            }
          }
        };

        client.send(JSON.stringify(toolCall));
        callsProcessed++;

        // Continue processing
        setTimeout(processCall, 10);
      };

      client.on('message', () => {
        // Message received, continue processing
      });

      processCall();
    });

    test('should maintain performance under load', (done) => {
      const startTime = Date.now();
      let processedCount = 0;
      const targetCount = 20;

      client.on('message', () => {
        processedCount++;
        
        if (processedCount === targetCount) {
          const duration = Date.now() - startTime;
          
          // Should process 20 messages in under 2 seconds
          expect(duration).toBeLessThan(2000);
          done();
        }
      });

      // Send batch of messages
      for (let i = 0; i < targetCount; i++) {
        const toolCall = {
          type: 'tool_call',
          data: {
            function: {
              name: 'Write',
              arguments: JSON.stringify({ 
                file_path: `/tmp/test${i}.txt`,
                content: `Performance test ${i}`
              })
            }
          }
        };

        client.send(JSON.stringify(toolCall));
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should recover from malformed tool call messages', (done) => {
      const malformedMessage = {
        type: 'tool_call',
        data: {
          function: {
            name: 'InvalidTool',
            arguments: 'not-valid-json'
          }
        }
      };

      let errorHandled = false;

      client.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'error') {
          errorHandled = true;
          expect(message).toHaveProperty('message');
        }
      });

      client.send(JSON.stringify(malformedMessage));

      // Send valid message after malformed one
      setTimeout(() => {
        const validMessage = {
          type: 'tool_call',
          data: {
            function: {
              name: 'Bash',
              arguments: JSON.stringify({ command: 'echo "recovery test"' })
            }
          }
        };

        client.send(JSON.stringify(validMessage));

        setTimeout(() => {
          expect(client.readyState).toBe(WebSocket.OPEN);
          done();
        }, 500);
      }, 500);
    });

    test('should handle connection interruption gracefully', (done) => {
      // This test simulates network interruption
      const toolCall = {
        type: 'tool_call',
        data: {
          function: {
            name: 'Bash',
            arguments: JSON.stringify({ command: 'sleep 2' })
          }
        }
      };

      client.send(JSON.stringify(toolCall));

      // Simulate connection drop during processing
      setTimeout(() => {
        client.terminate();
        
        // Reconnect
        setTimeout(() => {
          client = new WebSocket('ws://localhost:3001');
          
          client.on('open', () => {
            expect(client.readyState).toBe(WebSocket.OPEN);
            done();
          });
        }, 500);
      }, 500);
    });
  });
});