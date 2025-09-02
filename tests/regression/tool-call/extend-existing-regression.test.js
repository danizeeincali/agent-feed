/**
 * @file Extended Regression Tests for Tool Call Feature
 * @description Extends existing WebSocket stability tests with tool call specific scenarios
 * Ensures new feature doesn't break existing functionality
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const WebSocket = require('ws');
const { spawn } = require('child_process');

describe('Extended Regression Tests for Tool Call Integration', () => {
  let serverProcess;
  let clients = [];
  const TEST_PORT = 3003;

  beforeAll(async () => {
    // Start test server on different port to avoid conflicts
    serverProcess = spawn('node', ['simple-backend.js'], {
      env: { ...process.env, PORT: TEST_PORT, NODE_ENV: 'extended_regression' }
    });

    // Wait for server to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
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

  describe('Tool Call Extension of Existing 30s Drop Tests', () => {
    test('should maintain 30s+ stability with tool call messages mixed with regular messages', (done) => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
      clients.push(client);

      let connectionDropped = false;
      let messagesSent = 0;
      const testDuration = 32000; // 32 seconds to exceed 30s threshold
      let toolCallsSent = 0;
      let regularMessagesSent = 0;

      client.on('open', () => {
        const interval = setInterval(() => {
          if (connectionDropped) {
            clearInterval(interval);
            return;
          }

          // Alternate between regular messages and tool calls
          const message = messagesSent % 3 === 0 
            ? {
                // Tool call message
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
              }
            : messagesSent % 3 === 1
            ? {
                // Regular chat message  
                type: 'chat',
                content: `Regular message ${messagesSent}`
              }
            : {
                // Status update message
                type: 'status',
                data: { status: 'active', timestamp: Date.now() }
              };

          client.send(JSON.stringify(message));
          messagesSent++;
          
          if (message.type === 'tool_call') {
            toolCallsSent++;
          } else {
            regularMessagesSent++;
          }
        }, 1000); // Every second

        // Complete test after duration
        setTimeout(() => {
          clearInterval(interval);
          
          expect(connectionDropped).toBe(false);
          expect(client.readyState).toBe(WebSocket.OPEN);
          expect(messagesSent).toBeGreaterThan(30);
          expect(toolCallsSent).toBeGreaterThan(10); // Should have sent tool calls
          expect(regularMessagesSent).toBeGreaterThan(15); // Should have sent regular messages
          
          done();
        }, testDuration);
      });

      client.on('close', (code, reason) => {
        connectionDropped = true;
        done(new Error(`Connection dropped after ${messagesSent} messages. Code: ${code}, Reason: ${reason}`));
      });

      client.on('error', (error) => {
        connectionDropped = true;
        done(error);
      });
    }, 35000);

    test('should handle high-frequency tool calls without 30s drop', (done) => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
      clients.push(client);

      let connectionDropped = false;
      let toolCallsSent = 0;
      const testDuration = 31000;

      client.on('open', () => {
        // Send tool calls every 200ms (5 per second)
        const interval = setInterval(() => {
          if (connectionDropped) {
            clearInterval(interval);
            return;
          }

          const toolCall = {
            type: 'tool_call',
            data: {
              function: {
                name: toolCallsSent % 4 === 0 ? 'Bash' :
                       toolCallsSent % 4 === 1 ? 'Read' :
                       toolCallsSent % 4 === 2 ? 'Write' : 'Grep',
                arguments: JSON.stringify({
                  [toolCallsSent % 4 === 0 ? 'command' : 
                   toolCallsSent % 4 === 1 ? 'file_path' :
                   toolCallsSent % 4 === 2 ? 'file_path' : 'pattern']: 
                   `test_${toolCallsSent}`
                })
              }
            }
          };

          client.send(JSON.stringify(toolCall));
          toolCallsSent++;
        }, 200);

        setTimeout(() => {
          clearInterval(interval);
          
          expect(connectionDropped).toBe(false);
          expect(client.readyState).toBe(WebSocket.OPEN);
          expect(toolCallsSent).toBeGreaterThan(150); // ~155 expected at 5/sec for 31s
          
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

  describe('Tool Call Extension of Connection Lifecycle Tests', () => {
    test('should maintain proper connection states during tool call processing lifecycle', (done) => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
      clients.push(client);

      const states = [];
      let toolCallsProcessed = 0;
      const targetToolCalls = 15;

      client.on('open', () => {
        states.push('OPEN');
        expect(client.readyState).toBe(WebSocket.OPEN);

        // Send various tool calls to test lifecycle
        const toolCalls = [
          { name: 'Bash', args: { command: 'echo "lifecycle test"' } },
          { name: 'Read', args: { file_path: '/tmp/test.txt' } },
          { name: 'Write', args: { file_path: '/tmp/output.txt', content: 'test' } },
          { name: 'Edit', args: { file_path: '/tmp/edit.txt', old_string: 'old', new_string: 'new' } },
          { name: 'Grep', args: { pattern: 'test.*pattern', path: '/tmp' } }
        ];

        for (let i = 0; i < targetToolCalls; i++) {
          const toolCallType = toolCalls[i % toolCalls.length];
          const toolCall = {
            type: 'tool_call',
            data: {
              function: {
                name: toolCallType.name,
                arguments: JSON.stringify(toolCallType.args)
              }
            }
          };

          setTimeout(() => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(toolCall));
            }
          }, i * 100);
        }
      });

      client.on('message', (data) => {
        toolCallsProcessed++;
        expect(client.readyState).toBe(WebSocket.OPEN);

        if (toolCallsProcessed === targetToolCalls) {
          // Close connection after processing all tool calls
          client.close();
        }
      });

      client.on('close', () => {
        states.push('CLOSED');
        expect(client.readyState).toBe(WebSocket.CLOSED);
        
        expect(states).toEqual(['OPEN', 'CLOSED']);
        expect(toolCallsProcessed).toBe(targetToolCalls);
        
        done();
      });

      client.on('error', (error) => {
        done(error);
      });
    });

    test('should handle tool call reconnection scenarios properly', (done) => {
      let firstClient = new WebSocket(`ws://localhost:${TEST_PORT}`);
      clients.push(firstClient);

      let reconnectionSuccess = false;
      let toolCallsBeforeDisconnect = 0;
      let toolCallsAfterReconnect = 0;

      firstClient.on('open', () => {
        // Send tool calls before disconnection
        const beforeDisconnectCalls = [
          { type: 'tool_call', data: { function: { name: 'Bash', arguments: JSON.stringify({ command: 'echo "before"' }) } } },
          { type: 'tool_call', data: { function: { name: 'Read', arguments: JSON.stringify({ file_path: '/tmp/before.txt' }) } } }
        ];

        beforeDisconnectCalls.forEach((call, index) => {
          setTimeout(() => {
            firstClient.send(JSON.stringify(call));
          }, index * 100);
        });

        // Close connection after sending
        setTimeout(() => {
          firstClient.close();
        }, 500);
      });

      firstClient.on('message', () => {
        toolCallsBeforeDisconnect++;
      });

      firstClient.on('close', () => {
        // Reconnect and send more tool calls
        setTimeout(() => {
          const secondClient = new WebSocket(`ws://localhost:${TEST_PORT}`);
          clients.push(secondClient);

          secondClient.on('open', () => {
            reconnectionSuccess = true;
            
            // Send tool calls after reconnection
            const afterReconnectCalls = [
              { type: 'tool_call', data: { function: { name: 'Write', arguments: JSON.stringify({ file_path: '/tmp/after.txt', content: 'after' }) } } },
              { type: 'tool_call', data: { function: { name: 'Grep', arguments: JSON.stringify({ pattern: 'after', path: '/tmp' }) } } },
              { type: 'tool_call', data: { function: { name: 'Bash', arguments: JSON.stringify({ command: 'echo "reconnected"' }) } } }
            ];

            afterReconnectCalls.forEach((call, index) => {
              setTimeout(() => {
                secondClient.send(JSON.stringify(call));
              }, index * 100);
            });
          });

          secondClient.on('message', () => {
            toolCallsAfterReconnect++;
            
            if (toolCallsAfterReconnect === 3) {
              expect(reconnectionSuccess).toBe(true);
              expect(secondClient.readyState).toBe(WebSocket.OPEN);
              expect(toolCallsBeforeDisconnect).toBeGreaterThan(0);
              expect(toolCallsAfterReconnect).toBe(3);
              
              done();
            }
          });

          secondClient.on('error', (error) => {
            done(error);
          });
        }, 200);
      });
    });
  });

  describe('Tool Call Extension of Multi-Client Tests', () => {
    test('should handle multiple clients with different tool call patterns', (done) => {
      const clientCount = 6;
      let clientsConnected = 0;
      let allClientsCompleted = 0;

      const clientConfigs = [
        { pattern: 'bash-heavy', toolCalls: 8, primaryTool: 'Bash' },
        { pattern: 'file-ops', toolCalls: 6, primaryTool: 'Read' },
        { pattern: 'mixed', toolCalls: 7, primaryTool: 'mixed' },
        { pattern: 'write-intensive', toolCalls: 5, primaryTool: 'Write' },
        { pattern: 'search-focused', toolCalls: 4, primaryTool: 'Grep' },
        { pattern: 'edit-heavy', toolCalls: 6, primaryTool: 'Edit' }
      ];

      const connectClient = (clientIndex) => {
        const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
        clients.push(client);

        const config = clientConfigs[clientIndex];
        let toolCallsSent = 0;
        let toolCallsReceived = 0;

        client.on('open', () => {
          clientsConnected++;

          // Send tool calls based on client pattern
          const sendToolCall = () => {
            if (toolCallsSent >= config.toolCalls) return;

            let toolName = config.primaryTool;
            if (toolName === 'mixed') {
              const tools = ['Bash', 'Read', 'Write', 'Grep'];
              toolName = tools[toolCallsSent % tools.length];
            }

            const toolCall = {
              type: 'tool_call',
              data: {
                function: {
                  name: toolName,
                  arguments: JSON.stringify({
                    [toolName === 'Bash' ? 'command' : 
                     toolName === 'Read' ? 'file_path' :
                     toolName === 'Write' ? 'file_path' : 'pattern']: 
                     `${config.pattern}_${clientIndex}_${toolCallsSent}`
                  })
                }
              }
            };

            client.send(JSON.stringify(toolCall));
            toolCallsSent++;

            // Continue sending with delay
            if (toolCallsSent < config.toolCalls) {
              setTimeout(sendToolCall, 150);
            }
          };

          sendToolCall();
        });

        client.on('message', () => {
          toolCallsReceived++;
          
          if (toolCallsReceived === config.toolCalls) {
            allClientsCompleted++;
            
            if (allClientsCompleted === clientCount) {
              expect(clientsConnected).toBe(clientCount);
              expect(allClientsCompleted).toBe(clientCount);
              
              done();
            }
          }
        });

        client.on('error', (error) => {
          done(error);
        });
      };

      // Connect all clients with staggered timing
      for (let i = 0; i < clientCount; i++) {
        setTimeout(() => connectClient(i), i * 100);
      }
    }, 15000);
  });

  describe('Tool Call Extension of Performance Regression Tests', () => {
    test('should maintain response times with tool call processing load', (done) => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
      clients.push(client);

      const responseTimes = [];
      let toolCallsProcessed = 0;
      const totalToolCalls = 25;
      const maxAcceptableResponseTime = 150; // ms

      client.on('open', () => {
        // Send various types of tool calls to test performance impact
        const toolCallTypes = [
          { name: 'Bash', args: { command: 'echo "performance test"' } },
          { name: 'Read', args: { file_path: '/tmp/perf-test.txt' } },
          { name: 'Write', args: { file_path: '/tmp/perf-write.txt', content: 'performance test content' } },
          { name: 'Grep', args: { pattern: 'performance.*test', path: '/tmp' } },
          { name: 'Edit', args: { file_path: '/tmp/perf-edit.txt', old_string: 'old', new_string: 'new' } }
        ];

        for (let i = 0; i < totalToolCalls; i++) {
          setTimeout(() => {
            const startTime = Date.now();
            const toolType = toolCallTypes[i % toolCallTypes.length];
            
            const toolCall = {
              type: 'tool_call',
              messageId: i, // For tracking
              data: {
                function: {
                  name: toolType.name,
                  arguments: JSON.stringify(toolType.args)
                }
              }
            };

            client.send(JSON.stringify(toolCall));

            // Store start time for response calculation
            client._startTimes = client._startTimes || new Map();
            client._startTimes.set(i, startTime);
          }, i * 80); // Send every 80ms
        }
      });

      client.on('message', (data) => {
        const endTime = Date.now();
        
        // Calculate response time (simplified - in real implementation would track messageId)
        if (client._startTimes && client._startTimes.size > 0) {
          const startTime = Array.from(client._startTimes.values())[0];
          client._startTimes.delete(Array.from(client._startTimes.keys())[0]);
          
          const responseTime = endTime - startTime;
          responseTimes.push(responseTime);
        }

        toolCallsProcessed++;

        if (toolCallsProcessed === totalToolCalls) {
          const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
          const maxResponseTime = Math.max(...responseTimes);

          expect(avgResponseTime).toBeLessThan(maxAcceptableResponseTime);
          expect(maxResponseTime).toBeLessThan(maxAcceptableResponseTime * 2);
          expect(responseTimes.length).toBe(totalToolCalls);

          done();
        }
      });

      client.on('error', (error) => {
        done(error);
      });
    }, 10000);

    test('should not degrade existing message performance with tool call processing', (done) => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
      clients.push(client);

      let regularMessageTimes = [];
      let toolCallResponseTimes = [];
      let regularMessagesProcessed = 0;
      let toolCallsProcessed = 0;
      const messagesPerType = 10;

      client.on('open', () => {
        // First, send regular messages to establish baseline
        for (let i = 0; i < messagesPerType; i++) {
          setTimeout(() => {
            const startTime = Date.now();
            
            const regularMessage = {
              type: 'chat',
              messageId: `regular_${i}`,
              content: `Regular message ${i}`
            };

            client.send(JSON.stringify(regularMessage));
            client._regularStartTimes = client._regularStartTimes || new Map();
            client._regularStartTimes.set(`regular_${i}`, startTime);
          }, i * 100);
        }

        // Then send tool calls
        setTimeout(() => {
          for (let i = 0; i < messagesPerType; i++) {
            setTimeout(() => {
              const startTime = Date.now();
              
              const toolCall = {
                type: 'tool_call',
                messageId: `tool_${i}`,
                data: {
                  function: {
                    name: 'Bash',
                    arguments: JSON.stringify({ command: `echo "tool call ${i}"` })
                  }
                }
              };

              client.send(JSON.stringify(toolCall));
              client._toolCallStartTimes = client._toolCallStartTimes || new Map();
              client._toolCallStartTimes.set(`tool_${i}`, startTime);
            }, i * 100);
          }
        }, messagesPerType * 100 + 500);
      });

      client.on('message', (data) => {
        const endTime = Date.now();
        const message = JSON.parse(data);

        if (message.type === 'chat' || message.messageId?.startsWith('regular_')) {
          regularMessagesProcessed++;
          // Calculate regular message response time (simplified)
          if (client._regularStartTimes && client._regularStartTimes.size > 0) {
            const startTime = Array.from(client._regularStartTimes.values())[0];
            client._regularStartTimes.delete(Array.from(client._regularStartTimes.keys())[0]);
            regularMessageTimes.push(endTime - startTime);
          }
        } else {
          toolCallsProcessed++;
          // Calculate tool call response time (simplified)
          if (client._toolCallStartTimes && client._toolCallStartTimes.size > 0) {
            const startTime = Array.from(client._toolCallStartTimes.values())[0];
            client._toolCallStartTimes.delete(Array.from(client._toolCallStartTimes.keys())[0]);
            toolCallResponseTimes.push(endTime - startTime);
          }
        }

        // Check completion
        if (regularMessagesProcessed >= messagesPerType && toolCallsProcessed >= messagesPerType) {
          const avgRegularTime = regularMessageTimes.reduce((a, b) => a + b, 0) / regularMessageTimes.length;
          const avgToolCallTime = toolCallResponseTimes.reduce((a, b) => a + b, 0) / toolCallResponseTimes.length;

          // Tool calls should not be more than 50% slower than regular messages
          const performanceRatio = avgToolCallTime / avgRegularTime;
          expect(performanceRatio).toBeLessThan(1.5);

          // Both should be reasonable
          expect(avgRegularTime).toBeLessThan(100);
          expect(avgToolCallTime).toBeLessThan(150);

          done();
        }
      });

      client.on('error', (error) => {
        done(error);
      });
    }, 8000);
  });
});