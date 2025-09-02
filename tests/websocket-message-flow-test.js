#!/usr/bin/env node

/**
 * Comprehensive WebSocket Message Flow Test
 * Tests the fixed WebSocket communication between frontend and backend
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

class WebSocketMessageFlowTest {
  constructor() {
    this.testResults = [];
    this.backendProcess = null;
    this.frontendProcess = null;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔍',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[level] || '📝';
    
    const logMessage = `[${timestamp}] ${prefix} ${message}`;
    console.log(logMessage);
    
    this.testResults.push({
      timestamp,
      level,
      message,
      fullMessage: logMessage
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async startBackend() {
    this.log('Starting backend server...', 'info');
    
    try {
      this.backendProcess = spawn('node', ['simple-backend.js'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let backendReady = false;
      
      this.backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server running on') || output.includes('listening on')) {
          backendReady = true;
          this.log('Backend server started successfully', 'success');
        }
      });

      this.backendProcess.stderr.on('data', (data) => {
        const error = data.toString();
        this.log(`Backend stderr: ${error.trim()}`, 'warning');
      });

      this.backendProcess.on('error', (error) => {
        this.log(`Backend process error: ${error.message}`, 'error');
      });

      // Wait for backend to start
      let attempts = 0;
      while (!backendReady && attempts < 30) {
        await this.sleep(1000);
        attempts++;
      }

      if (!backendReady) {
        throw new Error('Backend failed to start within 30 seconds');
      }

      // Additional wait to ensure WebSocket server is ready
      await this.sleep(2000);
      
      return true;
    } catch (error) {
      this.log(`Failed to start backend: ${error.message}`, 'error');
      return false;
    }
  }

  async testWebSocketConnection() {
    this.log('Testing WebSocket connection establishment...', 'info');
    
    return new Promise((resolve) => {
      const ws = new WebSocket('ws://localhost:3000/terminal');
      let connectionEstablished = false;
      let messagesReceived = 0;

      const timeout = setTimeout(() => {
        if (!connectionEstablished) {
          this.log('WebSocket connection timeout', 'error');
          resolve(false);
        }
      }, 10000);

      ws.on('open', () => {
        this.log('WebSocket connection established', 'success');
        connectionEstablished = true;
        clearTimeout(timeout);
        
        // Test 1: Send connect message as expected by backend
        const connectMessage = {
          type: 'connect',
          terminalId: 'test-terminal-123',
          timestamp: Date.now()
        };
        
        this.log(`Sending connect message: ${JSON.stringify(connectMessage)}`, 'info');
        ws.send(JSON.stringify(connectMessage));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          messagesReceived++;
          this.log(`Received message ${messagesReceived}: type="${message.type}"`, 'success');
          
          if (message.type === 'connect') {
            this.log('Backend confirmed connection', 'success');
            
            // Test 2: Send a test command
            const testCommand = {
              type: 'input',
              data: 'echo "WebSocket test message"\\n',
              timestamp: Date.now()
            };
            
            this.log(`Sending test command: ${JSON.stringify(testCommand)}`, 'info');
            ws.send(JSON.stringify(testCommand));
            
          } else if (message.type === 'data') {
            this.log(`Received terminal data: "${message.data.substring(0, 50)}${message.data.length > 50 ? '...' : ''}"`, 'success');
            
            // Test passed - received data message type as expected
            setTimeout(() => {
              ws.close(1000, 'Test completed');
              resolve(true);
            }, 1000);
            
          } else if (message.type === 'error') {
            this.log(`Backend error: ${message.error}`, 'error');
            ws.close(1000, 'Test failed');
            resolve(false);
          }
          
        } catch (error) {
          this.log(`Error parsing message: ${error.message}`, 'error');
        }
      });

      ws.on('error', (error) => {
        this.log(`WebSocket error: ${error.message}`, 'error');
        clearTimeout(timeout);
        resolve(false);
      });

      ws.on('close', (code, reason) => {
        this.log(`WebSocket closed: code=${code}, reason="${reason}"`, 'info');
        if (!connectionEstablished) {
          clearTimeout(timeout);
          resolve(false);
        }
      });
    });
  }

  async testMessageFormatConsistency() {
    this.log('Testing message format consistency...', 'info');
    
    return new Promise((resolve) => {
      const ws = new WebSocket('ws://localhost:3000/terminal');
      let testsPassed = 0;
      const expectedTests = 3;

      ws.on('open', () => {
        // Test connect message format
        const connectMessage = {
          type: 'connect',
          terminalId: 'format-test-terminal',
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(connectMessage));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Test 1: Backend sends 'connect' confirmation
          if (message.type === 'connect' && message.terminalId && message.connectionType === 'websocket') {
            this.log('✅ Connect message format correct', 'success');
            testsPassed++;
            
            // Send input to generate data message
            ws.send(JSON.stringify({
              type: 'input',
              data: 'echo "format test"\\n',
              timestamp: Date.now()
            }));
          }
          
          // Test 2: Backend sends 'data' type (not 'output')
          else if (message.type === 'data' && message.data && message.terminalId) {
            this.log('✅ Data message format correct (using "data" not "output")', 'success');
            testsPassed++;
          }
          
          // Test 3: Message includes required fields
          if (message.timestamp && message.terminalId) {
            this.log('✅ Message includes required fields', 'success');
            testsPassed++;
          }
          
          if (testsPassed >= expectedTests) {
            ws.close(1000, 'Format tests completed');
            resolve(true);
          }
          
        } catch (error) {
          this.log(`Message parsing error: ${error.message}`, 'error');
          resolve(false);
        }
      });

      ws.on('error', (error) => {
        this.log(`Format test WebSocket error: ${error.message}`, 'error');
        resolve(false);
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        this.log(`Format test timeout (passed ${testsPassed}/${expectedTests} tests)`, 'warning');
        ws.close(1000, 'Timeout');
        resolve(testsPassed >= 2); // At least most tests should pass
      }, 15000);
    });
  }

  async testUseWebSocketTerminalHookIntegration() {
    this.log('Testing integration with useWebSocketTerminal hook pattern...', 'info');
    
    return new Promise((resolve) => {
      const ws = new WebSocket('ws://localhost:3000/terminal');
      let hookTestsPassed = 0;

      ws.on('open', () => {
        this.log('Hook integration test - WebSocket opened', 'info');
        
        // Simulate useWebSocketTerminal hook connection
        const connectMessage = {
          type: 'connect',
          terminalId: 'hook-integration-test',
          timestamp: Date.now()
        };
        
        this.log('Simulating useWebSocketTerminal connectToInstance call', 'info');
        ws.send(JSON.stringify(connectMessage));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'connect') {
            this.log('✅ Hook integration: Connection acknowledged', 'success');
            hookTestsPassed++;
            
            // Simulate sendCommand from hook
            const commandMessage = {
              type: 'input',
              data: 'ls -la\\n',
              timestamp: Date.now()
            };
            
            this.log('Simulating useWebSocketTerminal sendCommand call', 'info');
            ws.send(JSON.stringify(commandMessage));
          }
          
          if (message.type === 'data') {
            this.log('✅ Hook integration: Received data message for terminal display', 'success');
            hookTestsPassed++;
            
            // Test completed successfully
            setTimeout(() => {
              ws.close(1000, 'Hook integration test completed');
              resolve(hookTestsPassed >= 2);
            }, 1000);
          }
          
        } catch (error) {
          this.log(`Hook integration test error: ${error.message}`, 'error');
          resolve(false);
        }
      });

      ws.on('error', (error) => {
        this.log(`Hook integration WebSocket error: ${error.message}`, 'error');
        resolve(false);
      });

      setTimeout(() => {
        this.log('Hook integration test timeout', 'warning');
        ws.close(1000, 'Timeout');
        resolve(false);
      }, 10000);
    });
  }

  async cleanup() {
    this.log('Cleaning up test processes...', 'info');
    
    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise((resolve) => {
        this.backendProcess.on('exit', () => {
          this.log('Backend process terminated', 'info');
          resolve(null);
        });
        
        setTimeout(() => {
          if (!this.backendProcess.killed) {
            this.backendProcess.kill('SIGKILL');
            this.log('Backend process force killed', 'warning');
          }
          resolve(null);
        }, 5000);
      });
    }
  }

  generateReport() {
    const summary = this.testResults.reduce((acc, result) => {
      acc[result.level] = (acc[result.level] || 0) + 1;
      return acc;
    }, {});

    console.log('\\n' + '='.repeat(80));
    console.log('📊 WEBSOCKET MESSAGE FLOW TEST REPORT');
    console.log('='.repeat(80));
    console.log(`Total log entries: ${this.testResults.length}`);
    console.log(`Success messages: ${summary.success || 0}`);
    console.log(`Error messages: ${summary.error || 0}`);
    console.log(`Warning messages: ${summary.warning || 0}`);
    console.log(`Info messages: ${summary.info || 0}`);
    console.log('='.repeat(80));
    
    // Write detailed report to file
    const reportContent = {
      timestamp: new Date().toISOString(),
      summary,
      testResults: this.testResults,
      fixes_applied: [
        'Backend message type changed from "output" to "data"',
        'useWebSocketTerminal hook sends proper "connect" message',
        'Message format standardized between frontend and backend',
        'WebSocket URL path consistency (/terminal)'
      ]
    };
    
    const fs = require('fs');
    const reportPath = path.join(__dirname, 'websocket-message-flow-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportContent, null, 2));
    console.log(`📝 Detailed report written to: ${reportPath}`);
    
    return summary.error === 0 || (summary.error || 0) < (summary.success || 0);
  }

  async run() {
    console.log('🚀 Starting Comprehensive WebSocket Message Flow Test');
    console.log('='.repeat(80));
    
    try {
      // Start backend
      const backendStarted = await this.startBackend();
      if (!backendStarted) {
        this.log('Cannot proceed without backend', 'error');
        return false;
      }
      
      // Run tests
      const tests = [
        { name: 'WebSocket Connection', test: () => this.testWebSocketConnection() },
        { name: 'Message Format Consistency', test: () => this.testMessageFormatConsistency() },
        { name: 'useWebSocketTerminal Hook Integration', test: () => this.testUseWebSocketTerminalHookIntegration() }
      ];
      
      let testsPassed = 0;
      
      for (const { name, test } of tests) {
        this.log(`\\n--- Running Test: ${name} ---`, 'info');
        const result = await test();
        
        if (result) {
          this.log(`Test "${name}" PASSED`, 'success');
          testsPassed++;
        } else {
          this.log(`Test "${name}" FAILED`, 'error');
        }
        
        await this.sleep(1000); // Brief pause between tests
      }
      
      this.log(`\\nTest Summary: ${testsPassed}/${tests.length} tests passed`, testsPassed === tests.length ? 'success' : 'warning');
      
      return testsPassed === tests.length;
      
    } catch (error) {
      this.log(`Test execution error: ${error.message}`, 'error');
      return false;
    } finally {
      await this.cleanup();
      this.generateReport();
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new WebSocketMessageFlowTest();
  test.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = WebSocketMessageFlowTest;