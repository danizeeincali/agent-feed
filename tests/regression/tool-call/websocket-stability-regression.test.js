/**
 * @file WebSocket Stability Regression Tests for Tool Call Feature
 * @description Ensures tool call implementation doesn't regress existing WebSocket stability
 * These tests extend existing regression tests and must all pass
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const WebSocket = require('ws');
const { spawn } = require('child_process');

describe('Tool Call WebSocket Stability Regression', () => {
  let serverProcess;
  let clients = [];

  beforeAll(async () => {
    // Start test server
    serverProcess = spawn('node', ['simple-backend.js'], {
      env: { ...process.env, PORT: 3002, NODE_ENV: 'regression_test' }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(() => {
    clients.forEach(client => {
      if (client && client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  beforeEach(() => {
    clients = [];
  });

  afterEach(() => {
    clients.forEach(client => {
      if (client && client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    clients = [];
  });

  describe('30-Second Drop Prevention Regression', () => {
    test('should maintain connection for 35+ seconds with tool calls', (done) => {
      const client = new WebSocket('ws://localhost:3002');
      clients.push(client);

      let connectionDropped = false;
      let messagesSent = 0;
      const testDuration = 35000; // 35 seconds

      client.on('open', () => {
        // Send periodic tool calls to test stability
        const interval = setInterval(() => {
          if (connectionDropped) {
            clearInterval(interval);
            return;
          }

          const toolCall = {
            type: 'tool_call',
            data: {
              function: {
                name: 'Bash',
                arguments: JSON.stringify({ 
                  command: `echo "stability test ${messagesSent}"`,
                  description: 'Stability test command'
                })
              }
            }
          };

          client.send(JSON.stringify(toolCall));
          messagesSent++;
        }, 1000); // Every second

        // Check after test duration
        setTimeout(() => {
          clearInterval(interval);
          
          expect(connectionDropped).toBe(false);
          expect(client.readyState).toBe(WebSocket.OPEN);
          expect(messagesSent).toBeGreaterThan(30);
          
          done();
        }, testDuration);
      });

      client.on('close', () => {
        connectionDropped = true;
        done(new Error('Connection dropped unexpectedly'));
      });

      client.on('error', (error) => {
        connectionDropped = true;
        done(error);
      });
    }, 40000); // Allow 40 seconds for test

    test('should handle mixed message types during stability test', (done) => {
      const client = new WebSocket('ws://localhost:3002');
      clients.push(client);

      let connectionDropped = false;
      let messagesSent = 0;
      const testDuration = 30000;

      client.on('open', () => {
        const interval = setInterval(() => {
          if (connectionDropped) {
            clearInterval(interval);
            return;
          }

          // Alternate between chat and tool call messages
          const message = messagesSent % 2 === 0 
            ? { type: 'chat', content: `Chat message ${messagesSent}` }
            : {
                type: 'tool_call',
                data: {
                  function: {
                    name: 'Read',
                    arguments: JSON.stringify({ file_path: `/tmp/test${messagesSent}.txt` })
                  }
                }
              };

          client.send(JSON.stringify(message));
          messagesSent++;
        }, 800);

        setTimeout(() => {
          clearInterval(interval);
          
          expect(connectionDropped).toBe(false);
          expect(client.readyState).toBe(WebSocket.OPEN);
          
          done();
        }, testDuration);
      });

      client.on('close', () => {
        connectionDropped = true;
      });

      client.on('error', () => {
        connectionDropped = true;
      });
    }, 35000);
  });

  describe('Connection Lifecycle Regression', () => {
    test('should maintain proper connection states with tool calls', (done) => {
      const client = new WebSocket('ws://localhost:3002');
      clients.push(client);

      const states = [];
      let messagesProcessed = 0;
      const targetMessages = 10;

      client.on('open', () => {
        states.push('OPEN');
        expect(client.readyState).toBe(WebSocket.OPEN);

        // Send tool call messages
        for (let i = 0; i < targetMessages; i++) {
          const toolCall = {
            type: 'tool_call',
            data: {
              function: {
                name: 'Bash',
                arguments: JSON.stringify({ command: `echo "lifecycle test ${i}"` })
              }
            }
          };

          setTimeout(() => {
            client.send(JSON.stringify(toolCall));
          }, i * 100);
        }
      });

      client.on('message', (data) => {
        messagesProcessed++;
        expect(client.readyState).toBe(WebSocket.OPEN);

        if (messagesProcessed === targetMessages) {
          client.close();
        }
      });

      client.on('close', () => {
        states.push('CLOSED');
        expect(client.readyState).toBe(WebSocket.CLOSED);
        
        expect(states).toEqual(['OPEN', 'CLOSED']);
        expect(messagesProcessed).toBe(targetMessages);
        
        done();
      });

      client.on('error', (error) => {
        done(error);
      });
    });

    test('should handle reconnection after tool call processing', (done) => {
      let firstClient = new WebSocket('ws://localhost:3002');
      clients.push(firstClient);

      let reconnectionSuccess = false;

      firstClient.on('open', () => {
        // Send some tool calls
        const toolCall = {
          type: 'tool_call',
          data: {
            function: {
              name: 'Write',
              arguments: JSON.stringify({ 
                file_path: '/tmp/reconnect-test.txt',
                content: 'Reconnection test data'
              })
            }
          }
        };

        firstClient.send(JSON.stringify(toolCall));

        // Close connection after processing
        setTimeout(() => {
          firstClient.close();
        }, 500);
      });

      firstClient.on('close', () => {
        // Attempt reconnection
        setTimeout(() => {
          const secondClient = new WebSocket('ws://localhost:3002');
          clients.push(secondClient);

          secondClient.on('open', () => {
            reconnectionSuccess = true;
            expect(secondClient.readyState).toBe(WebSocket.OPEN);
            
            done();
          });

          secondClient.on('error', (error) => {
            done(error);
          });
        }, 100);
      });
    });
  });

  describe('Multi-Client Regression', () => {
    test('should handle multiple clients with tool calls simultaneously', (done) => {
      const clientCount = 5;
      let clientsConnected = 0;
      let allClientsProcessed = 0;
      const messagesPerClient = 3;

      const connectClient = (clientIndex) => {
        const client = new WebSocket('ws://localhost:3002');
        clients.push(client);

        let messagesReceived = 0;

        client.on('open', () => {
          clientsConnected++;

          // Send tool calls for this client
          for (let i = 0; i < messagesPerClient; i++) {
            const toolCall = {
              type: 'tool_call',
              data: {
                function: {
                  name: 'Bash',
                  arguments: JSON.stringify({ 
                    command: `echo "client ${clientIndex} message ${i}"` 
                  })
                }
              }
            };

            setTimeout(() => {
              client.send(JSON.stringify(toolCall));
            }, i * 200);
          }
        });

        client.on('message', () => {
          messagesReceived++;
          
          if (messagesReceived === messagesPerClient) {
            allClientsProcessed++;
            
            if (allClientsProcessed === clientCount) {
              expect(clientsConnected).toBe(clientCount);
              expect(allClientsProcessed).toBe(clientCount);
              
              done();
            }
          }
        });

        client.on('error', (error) => {
          done(error);
        });
      };

      // Connect multiple clients
      for (let i = 0; i < clientCount; i++) {
        setTimeout(() => connectClient(i), i * 100);
      }
    });
  });

  describe('Performance Regression', () => {
    test('should maintain response times under 100ms per tool call', (done) => {
      const client = new WebSocket('ws://localhost:3002');
      clients.push(client);

      const responseTimes = [];
      let messagesProcessed = 0;
      const totalMessages = 20;

      client.on('open', () => {
        for (let i = 0; i < totalMessages; i++) {
          setTimeout(() => {
            const startTime = Date.now();
            
            const toolCall = {
              type: 'tool_call',
              data: {
                function: {
                  name: 'Bash',
                  arguments: JSON.stringify({ command: `echo "perf test ${i}"` })
                }
              }
            };

            client.send(JSON.stringify(toolCall));

            // Store start time for this message
            client._messageStartTimes = client._messageStartTimes || new Map();
            client._messageStartTimes.set(i, startTime);
          }, i * 50);
        }
      });

      client.on('message', (data) => {
        const endTime = Date.now();
        const messageId = messagesProcessed;
        
        if (client._messageStartTimes && client._messageStartTimes.has(messageId)) {
          const startTime = client._messageStartTimes.get(messageId);
          const responseTime = endTime - startTime;
          responseTimes.push(responseTime);
        }

        messagesProcessed++;

        if (messagesProcessed === totalMessages) {
          const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
          const maxResponseTime = Math.max(...responseTimes);

          expect(avgResponseTime).toBeLessThan(100);
          expect(maxResponseTime).toBeLessThan(200);
          expect(responseTimes.length).toBe(totalMessages);

          done();
        }
      });

      client.on('error', (error) => {
        done(error);
      });
    });

    test('should not degrade memory usage compared to baseline', (done) => {
      const client = new WebSocket('ws://localhost:3002');
      clients.push(client);

      const initialMemory = process.memoryUsage().heapUsed;
      let toolCallsSent = 0;
      const totalToolCalls = 50;

      client.on('open', () => {
        const sendToolCall = () => {
          if (toolCallsSent >= totalToolCalls) {
            // Force garbage collection and check memory
            if (global.gc) {
              global.gc();
            }

            setTimeout(() => {
              const finalMemory = process.memoryUsage().heapUsed;
              const memoryIncrease = finalMemory - initialMemory;

              // Should not increase memory by more than 5MB
              expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
              
              done();
            }, 100);
            
            return;
          }

          const toolCall = {
            type: 'tool_call',
            data: {
              function: {
                name: 'Read',
                arguments: JSON.stringify({ file_path: `/tmp/memory-test-${toolCallsSent}.txt` })
              }
            }
          };

          client.send(JSON.stringify(toolCall));
          toolCallsSent++;

          setTimeout(sendToolCall, 20);
        };

        sendToolCall();
      });

      client.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Error Recovery Regression', () => {
    test('should recover from tool call errors without affecting connection', (done) => {
      const client = new WebSocket('ws://localhost:3002');
      clients.push(client);

      let errorsHandled = 0;
      let successfulCalls = 0;
      let connectionStable = true;

      client.on('open', () => {
        // Send mix of valid and invalid tool calls
        const messages = [
          { // Valid
            type: 'tool_call',
            data: {
              function: {
                name: 'Bash',
                arguments: JSON.stringify({ command: 'echo "valid 1"' })
              }
            }
          },
          { // Invalid - malformed JSON
            type: 'tool_call',
            data: {
              function: {
                name: 'Bash',
                arguments: 'invalid-json'
              }
            }
          },
          { // Valid
            type: 'tool_call',
            data: {
              function: {
                name: 'Bash',
                arguments: JSON.stringify({ command: 'echo "valid 2"' })
              }
            }
          },
          { // Invalid - unknown tool
            type: 'tool_call',
            data: {
              function: {
                name: 'NonexistentTool',
                arguments: JSON.stringify({ param: 'test' })
              }
            }
          },
          { // Valid
            type: 'tool_call',
            data: {
              function: {
                name: 'Bash',
                arguments: JSON.stringify({ command: 'echo "valid 3"' })
              }
            }
          }
        ];

        messages.forEach((msg, index) => {
          setTimeout(() => {
            client.send(JSON.stringify(msg));
          }, index * 200);
        });
      });

      client.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'error') {
          errorsHandled++;
        } else if (message.formatted && message.formatted.includes('● Bash')) {
          successfulCalls++;
        }

        // Check completion
        if (errorsHandled + successfulCalls >= 5) {
          expect(connectionStable).toBe(true);
          expect(client.readyState).toBe(WebSocket.OPEN);
          expect(errorsHandled).toBe(2); // 2 invalid calls
          expect(successfulCalls).toBe(3); // 3 valid calls
          
          done();
        }
      });

      client.on('close', () => {
        connectionStable = false;
      });

      client.on('error', () => {
        connectionStable = false;
      });
    });
  });
});