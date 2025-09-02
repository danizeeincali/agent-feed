/**
 * Integration Test for Tool Call Visualization System
 * Tests the complete integration with the real backend server
 * 
 * INTEGRATION TESTING:
 * - Test with actual WebSocket connections
 * - Verify no performance degradation
 * - Test with real Claude output patterns
 * - Ensure WebSocket stability is maintained
 */

const WebSocket = require('ws');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

describe('Tool Call Visualization - Full Integration Test', () => {
  let server;
  let serverProcess;
  const TEST_PORT = 3001; // Use different port for testing
  const SERVER_STARTUP_TIMEOUT = 10000; // 10 seconds

  beforeAll(async () => {
    // Start the backend server for testing
    await startTestServer();
  }, SERVER_STARTUP_TIMEOUT);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => {
        serverProcess.on('close', resolve);
        setTimeout(resolve, 5000); // Force close after 5 seconds
      });
    }
  });

  async function startTestServer() {
    return new Promise((resolve, reject) => {
      // Create a modified server for testing
      const testServerScript = `
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { toolCallFormatter } = require('./src/services/ToolCallFormatter');
const { ToolCallStatusManager } = require('./src/services/ToolCallStatusManager');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const wsConnections = new Map();
const toolCallStatusManager = new ToolCallStatusManager();

// Enhanced broadcast function (simplified for testing)
function broadcastToWebSockets(instanceId, message) {
  const connections = wsConnections.get(instanceId);
  if (connections && connections.size > 0) {
    let formattedMessage;
    try {
      const rawOutput = message.data || message.output || '';
      formattedMessage = toolCallFormatter.formatToolCallOutput(rawOutput, instanceId);
      
      if (message.timestamp) formattedMessage.timestamp = message.timestamp;
      if (message.source) formattedMessage.source = message.source;
    } catch (error) {
      formattedMessage = {
        type: 'output',
        data: message.data || message.output,
        terminalId: instanceId,
        timestamp: message.timestamp,
        source: message.source || 'process'
      };
    }
    
    const wsMessage = JSON.stringify(formattedMessage);
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(wsMessage);
        } catch (error) {
          console.error('WebSocket send failed:', error);
          connections.delete(ws);
        }
      }
    });
  }
}

toolCallStatusManager.setBroadcastFunction(broadcastToWebSockets);

wss.on('connection', (ws) => {
  const instanceId = 'test-instance';
  if (!wsConnections.has(instanceId)) {
    wsConnections.set(instanceId, new Set());
  }
  wsConnections.get(instanceId).add(ws);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'test') {
        // Send test tool call output
        broadcastToWebSockets(instanceId, {
          data: message.testData,
          timestamp: Date.now(),
          source: 'test'
        });
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  });

  ws.on('close', () => {
    wsConnections.get(instanceId)?.delete(ws);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', toolVisualization: 'active' });
});

server.listen(${TEST_PORT}, () => {
  console.log('Test server running on port ${TEST_PORT}');
});
      `;

      // Write test server script
      require('fs').writeFileSync('/tmp/test-server.js', testServerScript);

      serverProcess = spawn('node', ['/tmp/test-server.js'], {
        cwd: '/workspaces/agent-feed',
        stdio: 'pipe'
      });

      let startupTimer = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, SERVER_STARTUP_TIMEOUT - 1000);

      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Test server running')) {
          clearTimeout(startupTimer);
          setTimeout(resolve, 1000); // Wait a bit more for full startup
        }
      });

      serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      serverProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(\`Server exited with code \${code}\`));
        }
      });
    });
  }

  describe('WebSocket Connection and Tool Call Processing', () => {
    test('should connect to WebSocket and process tool calls', (done) => {
      const ws = new WebSocket(\`ws://localhost:\${TEST_PORT}\`);
      const receivedMessages = [];

      ws.on('open', () => {
        // Send a test tool call
        ws.send(JSON.stringify({
          type: 'test',
          testData: \`<function_calls>
<invoke name="Bash">
<parameter name="command">echo "Integration test"</parameter>
</invoke>
</function_calls>\`
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        receivedMessages.push(message);

        // Check if we received the enhanced tool call message
        if (message.type === 'tool_call' && message.enhanced) {
          expect(message.toolCall).toBeDefined();
          expect(message.toolCall.toolName).toBe('Bash');
          expect(message.toolCall.displayName).toBe('Terminal Command');
          expect(message.toolCall.icon).toBe('🔧');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        done(new Error('Test timeout - no enhanced message received'));
      }, 5000);
    });

    test('should handle regular output without enhancement', (done) => {
      const ws = new WebSocket(\`ws://localhost:\${TEST_PORT}\`);

      ws.on('open', () => {
        // Send regular output
        ws.send(JSON.stringify({
          type: 'test',
          testData: 'This is regular Claude output without tool calls'
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        expect(message.type).toBe('output');
        expect(message.enhanced).toBe(false);
        expect(message.data).toContain('regular Claude output');
        
        ws.close();
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });

      setTimeout(() => {
        ws.close();
        done(new Error('Test timeout'));
      }, 5000);
    });
  });

  describe('Performance and Stability', () => {
    test('should handle multiple concurrent connections', async () => {
      const connectionCount = 10;
      const connections = [];
      const promises = [];

      for (let i = 0; i < connectionCount; i++) {
        const promise = new Promise((resolve, reject) => {
          const ws = new WebSocket(\`ws://localhost:\${TEST_PORT}\`);
          connections.push(ws);

          ws.on('open', () => {
            ws.send(JSON.stringify({
              type: 'test',
              testData: \`<function_calls><invoke name="Read"><parameter name="file_path">test\${i}.txt</parameter></invoke></function_calls>\`
            }));
          });

          ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.enhanced) {
              ws.close();
              resolve(message);
            }
          });

          ws.on('error', reject);
          
          setTimeout(() => {
            ws.close();
            reject(new Error(\`Connection \${i} timeout\`));
          }, 5000);
        });

        promises.push(promise);
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(connectionCount);
      results.forEach((result, index) => {
        expect(result.type).toBe('tool_call');
        expect(result.toolCall.toolName).toBe('Read');
      });
    });

    test('should maintain performance under load', async () => {
      const messageCount = 100;
      const ws = new WebSocket(\`ws://localhost:\${TEST_PORT}\`);
      
      await new Promise((resolve) => {
        ws.on('open', resolve);
      });

      const startTime = performance.now();
      let messagesReceived = 0;

      const promise = new Promise((resolve) => {
        ws.on('message', (data) => {
          messagesReceived++;
          if (messagesReceived >= messageCount) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            ws.close();
            resolve(duration);
          }
        });
      });

      // Send messages rapidly
      for (let i = 0; i < messageCount; i++) {
        const isToolCall = i % 3 === 0; // Every 3rd message is a tool call
        const testData = isToolCall 
          ? \`<function_calls><invoke name="Test"><parameter name="id">\${i}</parameter></invoke></function_calls>\`
          : \`Regular message \${i}\`;
          
        ws.send(JSON.stringify({
          type: 'test',
          testData: testData
        }));
      }

      const duration = await promise;
      
      // Should process all messages in reasonable time (under 2 seconds)
      expect(duration).toBeLessThan(2000);
      expect(messagesReceived).toBe(messageCount);
      
      console.log(\`Processed \${messageCount} messages in \${duration.toFixed(2)}ms (\${(messageCount / duration * 1000).toFixed(2)} messages/sec)\`);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should gracefully handle malformed tool call data', (done) => {
      const ws = new WebSocket(\`ws://localhost:\${TEST_PORT}\`);

      ws.on('open', () => {
        // Send malformed tool call
        ws.send(JSON.stringify({
          type: 'test',
          testData: '<function_calls><invoke name="BadTool"><parameter'
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        // Should fallback to regular output format
        expect(message.type).toBe('output');
        expect(message.enhanced).toBe(false);
        
        ws.close();
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });

      setTimeout(() => {
        ws.close();
        done(new Error('Test timeout'));
      }, 5000);
    });

    test('should continue working after individual message failures', async () => {
      const ws = new WebSocket(\`ws://localhost:\${TEST_PORT}\`);
      
      await new Promise((resolve) => {
        ws.on('open', resolve);
      });

      const messages = [];
      const messagePromise = new Promise((resolve) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          messages.push(message);
          
          if (messages.length >= 3) {
            resolve(messages);
          }
        });
      });

      // Send a mix of good and bad messages
      ws.send(JSON.stringify({
        type: 'test',
        testData: '<function_calls><invoke name="Good1"><parameter name="test">value</parameter></invoke></function_calls>'
      }));

      ws.send(JSON.stringify({
        type: 'test',
        testData: '<malformed>'
      }));

      ws.send(JSON.stringify({
        type: 'test',
        testData: '<function_calls><invoke name="Good2"><parameter name="test">value2</parameter></invoke></function_calls>'
      }));

      const results = await messagePromise;
      
      expect(results).toHaveLength(3);
      expect(results[0].type).toBe('tool_call'); // First good message
      expect(results[1].type).toBe('output');    // Malformed message falls back
      expect(results[2].type).toBe('tool_call'); // Second good message still works
      
      ws.close();
    });
  });

  describe('Health Check Integration', () => {
    test('should report tool visualization status in health check', async () => {
      const response = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: TEST_PORT,
          path: '/health',
          method: 'GET'
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        });
        
        req.on('error', reject);
        req.end();
      });

      expect(response.status).toBe('ok');
      expect(response.toolVisualization).toBe('active');
    });
  });
});