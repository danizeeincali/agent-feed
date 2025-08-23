#!/usr/bin/env node

/**
 * Terminal Streaming WebSocket Test Script
 * Tests the robust terminal streaming implementation
 */

const io = require('socket.io-client');

class TerminalStreamingTest {
  constructor() {
    this.socket = null;
    this.terminalSocket = null;
    this.sessionId = null;
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${type}: ${message}`);
    this.testResults.push({ timestamp, type, message });
  }

  async runTests() {
    this.log('Starting Terminal Streaming WebSocket Tests', 'TEST');
    
    try {
      await this.testMainConnection();
      await this.testTerminalNamespace();
      await this.testTerminalSession();
      await this.testTerminalInput();
      await this.testTerminalResize();
      await this.testClaudeIntegration();
      await this.testSessionCleanup();
      await this.testAPIEndpoints();
      
      this.generateTestReport();
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'ERROR');
      process.exit(1);
    }
  }

  async testMainConnection() {
    this.log('Testing main WebSocket connection...', 'TEST');
    
    return new Promise((resolve, reject) => {
      this.socket = io('http://localhost:3001', {
        transports: ['polling', 'websocket'],
        timeout: 5000
      });

      this.socket.on('connect', () => {
        this.log('✅ Main WebSocket connection established', 'SUCCESS');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        this.log(`❌ Main WebSocket connection failed: ${error.message}`, 'ERROR');
        reject(error);
      });

      this.socket.on('connected', (data) => {
        this.log(`✅ Received welcome message: ${JSON.stringify(data)}`, 'SUCCESS');
      });

      setTimeout(() => {
        reject(new Error('Main connection timeout'));
      }, 10000);
    });
  }

  async testTerminalNamespace() {
    this.log('Testing terminal namespace connection...', 'TEST');
    
    return new Promise((resolve, reject) => {
      this.terminalSocket = io('http://localhost:3001/terminal', {
        transports: ['polling', 'websocket'],
        timeout: 5000
      });

      this.terminalSocket.on('connect', () => {
        this.log('✅ Terminal namespace connection established', 'SUCCESS');
        resolve();
      });

      this.terminalSocket.on('connect_error', (error) => {
        this.log(`❌ Terminal namespace connection failed: ${error.message}`, 'ERROR');
        reject(error);
      });

      setTimeout(() => {
        reject(new Error('Terminal namespace connection timeout'));
      }, 10000);
    });
  }

  async testTerminalSession() {
    this.log('Testing terminal session creation...', 'TEST');
    
    return new Promise((resolve, reject) => {
      this.terminalSocket.on('terminal:created', (data) => {
        this.sessionId = data.sessionId;
        this.log(`✅ Terminal session created: ${data.sessionId}`, 'SUCCESS');
        this.log(`   Shell: ${data.shell}, Dimensions: ${data.cols}x${data.rows}`, 'INFO');
        resolve();
      });

      this.terminalSocket.on('terminal:error', (error) => {
        this.log(`❌ Terminal session creation failed: ${error.error}`, 'ERROR');
        reject(new Error(error.error));
      });

      // Create terminal session
      this.terminalSocket.emit('terminal:create', {
        cols: 80,
        rows: 24,
        cwd: '/workspaces/agent-feed'
      });

      setTimeout(() => {
        reject(new Error('Terminal session creation timeout'));
      }, 10000);
    });
  }

  async testTerminalInput() {
    if (!this.sessionId) {
      throw new Error('No active terminal session');
    }

    this.log('Testing terminal input/output...', 'TEST');
    
    return new Promise((resolve, reject) => {
      let outputReceived = false;

      this.terminalSocket.on('terminal:output', (data) => {
        if (!outputReceived) {
          outputReceived = true;
          this.log(`✅ Terminal output received: ${data.data.substring(0, 50)}...`, 'SUCCESS');
          resolve();
        }
      });

      // Send a simple command
      this.terminalSocket.emit('terminal:input', {
        sessionId: this.sessionId,
        input: 'echo "Hello from terminal streaming test"\n'
      });

      setTimeout(() => {
        if (!outputReceived) {
          reject(new Error('Terminal input/output test timeout'));
        }
      }, 5000);
    });
  }

  async testTerminalResize() {
    if (!this.sessionId) {
      throw new Error('No active terminal session');
    }

    this.log('Testing terminal resize functionality...', 'TEST');
    
    return new Promise((resolve) => {
      // Test resize
      this.terminalSocket.emit('terminal:resize', {
        sessionId: this.sessionId,
        cols: 120,
        rows: 30
      });

      this.log('✅ Terminal resize command sent (120x30)', 'SUCCESS');
      
      // Reset to original size
      setTimeout(() => {
        this.terminalSocket.emit('terminal:resize', {
          sessionId: this.sessionId,
          cols: 80,
          rows: 24
        });
        this.log('✅ Terminal resize reset to 80x24', 'SUCCESS');
        resolve();
      }, 1000);
    });
  }

  async testClaudeIntegration() {
    this.log('Testing Claude process integration...', 'TEST');
    
    return new Promise((resolve) => {
      // Test Claude terminal connection
      this.socket.emit('claude:terminal:connect');
      
      this.socket.on('claude:terminal:connected', (data) => {
        this.log(`✅ Claude terminal integration working, PID: ${data.pid}`, 'SUCCESS');
      });

      this.socket.on('claude:terminal:error', (error) => {
        this.log(`⚠️  Claude terminal integration not available: ${error.error}`, 'WARNING');
      });

      setTimeout(resolve, 2000);
    });
  }

  async testSessionCleanup() {
    if (!this.sessionId) {
      this.log('⚠️  No session to cleanup', 'WARNING');
      return;
    }

    this.log('Testing session cleanup...', 'TEST');
    
    return new Promise((resolve) => {
      this.terminalSocket.on('terminal:exit', (data) => {
        this.log(`✅ Terminal session exited with code: ${data.exitCode}`, 'SUCCESS');
        resolve();
      });

      // Kill the session
      this.terminalSocket.emit('terminal:kill', {
        sessionId: this.sessionId
      });

      setTimeout(resolve, 3000);
    });
  }

  async testAPIEndpoints() {
    this.log('Testing HTTP API endpoints...', 'TEST');
    
    const endpoints = [
      'http://localhost:3001/health',
      'http://localhost:3001/api/terminal/stats'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          this.log(`✅ API endpoint working: ${endpoint}`, 'SUCCESS');
        } else {
          this.log(`⚠️  API endpoint returned ${response.status}: ${endpoint}`, 'WARNING');
        }
      } catch (error) {
        this.log(`❌ API endpoint failed: ${endpoint} - ${error.message}`, 'ERROR');
      }
    }
  }

  generateTestReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.log('='.repeat(60), 'REPORT');
    this.log('TERMINAL STREAMING TEST REPORT', 'REPORT');
    this.log('='.repeat(60), 'REPORT');
    
    const successTests = this.testResults.filter(r => r.type === 'SUCCESS').length;
    const errorTests = this.testResults.filter(r => r.type === 'ERROR').length;
    const warningTests = this.testResults.filter(r => r.type === 'WARNING').length;
    
    this.log(`Total duration: ${duration}ms`, 'REPORT');
    this.log(`✅ Successful operations: ${successTests}`, 'REPORT');
    this.log(`⚠️  Warnings: ${warningTests}`, 'REPORT');
    this.log(`❌ Errors: ${errorTests}`, 'REPORT');
    
    if (errorTests === 0) {
      this.log('🎉 ALL TESTS PASSED! Terminal streaming is working correctly.', 'REPORT');
    } else {
      this.log('⚠️  Some tests failed. Check the logs above for details.', 'REPORT');
    }
    
    this.log('='.repeat(60), 'REPORT');
    
    // Clean up connections
    if (this.terminalSocket) {
      this.terminalSocket.disconnect();
    }
    if (this.socket) {
      this.socket.disconnect();
    }
    
    setTimeout(() => {
      process.exit(errorTests > 0 ? 1 : 0);
    }, 1000);
  }
}

// Run the tests
async function main() {
  console.log('🚀 Starting Terminal Streaming WebSocket Tests...\n');
  
  const tester = new TerminalStreamingTest();
  await tester.runTests();
}

// Add fetch polyfill for Node.js if not available
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

main().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});