#!/usr/bin/env node

/**
 * SPARC VALIDATION: Comprehensive WebSocket Connection Test
 * Tests all WebSocket endpoints for terminal functionality
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');

class WebSocketConnectionTester {
  constructor() {
    this.results = [];
    this.testCount = 0;
    this.passCount = 0;
    this.failCount = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
    
    this.results.push({
      timestamp,
      type,
      message
    });
  }

  async testWebSocketConnection(url, testName, timeout = 10000) {
    this.testCount++;
    
    return new Promise((resolve) => {
      this.log(`Starting test: ${testName} - ${url}`);
      const ws = new WebSocket(url);
      let resolved = false;
      
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.failCount++;
          this.log(`Test FAILED: ${testName} - Connection timeout`, 'error');
          ws.terminate();
          resolve(false);
        }
      }, timeout);

      ws.on('open', () => {
        this.log(`Test PASSED: ${testName} - Connection established`, 'success');
        
        // Test sending initialization message
        ws.send(JSON.stringify({
          type: 'init',
          cols: 80,
          rows: 24
        }));
        
        // Wait for response or timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            this.passCount++;
            ws.close();
            resolve(true);
          }
        }, 2000);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.log(`Test DATA: ${testName} - Received: ${message.type}`, 'success');
          
          if (message.type === 'init_ack' || message.type === 'connect') {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              this.passCount++;
              ws.close();
              resolve(true);
            }
          }
        } catch (error) {
          this.log(`Test DATA: ${testName} - Raw data received: ${data.toString().substring(0, 100)}`, 'success');
        }
      });

      ws.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          this.failCount++;
          this.log(`Test FAILED: ${testName} - ${error.message}`, 'error');
          resolve(false);
        }
      });

      ws.on('close', (code, reason) => {
        this.log(`Test CLOSED: ${testName} - Code: ${code}, Reason: ${reason}`);
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          if (code === 1000) {
            this.passCount++;
            resolve(true);
          } else {
            this.failCount++;
            resolve(false);
          }
        }
      });
    });
  }

  async testPortBinding(port) {
    this.log(`Testing port binding for port ${port}`);
    
    return new Promise((resolve) => {
      const netstat = spawn('netstat', ['-tulpn']);
      let output = '';
      
      netstat.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      netstat.on('close', (code) => {
        const isListening = output.includes(`:${port}`) && output.includes('LISTEN');
        if (isListening) {
          this.log(`Port ${port} is LISTENING ✅`, 'success');
          resolve(true);
        } else {
          this.log(`Port ${port} is NOT LISTENING ❌`, 'error');
          resolve(false);
        }
      });
      
      netstat.on('error', () => {
        this.log(`Could not check port ${port} binding`, 'error');
        resolve(false);
      });
    });
  }

  async runAllTests() {
    this.log('🚀 SPARC WebSocket Connection Test Suite Starting');
    
    // Test 1: Check if port 3002 is listening
    const port3002Listening = await this.testPortBinding(3002);
    
    // Test 2: Check if port 3001 is listening  
    const port3001Listening = await this.testPortBinding(3001);
    
    if (!port3002Listening) {
      this.log('🚨 CRITICAL: Port 3002 WebSocket server is not running!', 'error');
      return this.generateReport();
    }
    
    // Test 3: WebSocket connection to terminal server
    await this.testWebSocketConnection(
      'ws://localhost:3002/terminal',
      'Terminal Server Connection (Port 3002)',
      15000
    );
    
    // Test 4: Multiple concurrent connections
    this.log('Testing concurrent WebSocket connections...');
    const concurrentTests = [];
    for (let i = 0; i < 3; i++) {
      concurrentTests.push(
        this.testWebSocketConnection(
          'ws://localhost:3002/terminal',
          `Concurrent Terminal Connection #${i + 1}`,
          10000
        )
      );
    }
    
    const concurrentResults = await Promise.all(concurrentTests);
    const concurrentSuccess = concurrentResults.filter(r => r).length;
    this.log(`Concurrent connections: ${concurrentSuccess}/3 successful`, 
             concurrentSuccess === 3 ? 'success' : 'error');
    
    // Test 5: Connection resilience (connect, disconnect, reconnect)
    await this.testConnectionResilience();
    
    return this.generateReport();
  }
  
  async testConnectionResilience() {
    this.log('Testing connection resilience...');
    
    return new Promise((resolve) => {
      const ws = new WebSocket('ws://localhost:3002/terminal');
      let phase = 'connecting';
      
      ws.on('open', () => {
        this.log('Resilience test: Connection established', 'success');
        phase = 'connected';
        
        // Send a message
        ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
        
        // Close after 2 seconds
        setTimeout(() => {
          ws.close(1000, 'Testing resilience');
        }, 2000);
      });
      
      ws.on('message', (data) => {
        this.log('Resilience test: Message received during connection', 'success');
      });
      
      ws.on('close', (code, reason) => {
        if (phase === 'connected') {
          this.log('Resilience test: Clean disconnect successful', 'success');
          this.passCount++;
        } else {
          this.log('Resilience test: Unexpected disconnect', 'error');
          this.failCount++;
        }
        this.testCount++;
        resolve();
      });
      
      ws.on('error', (error) => {
        this.log(`Resilience test: Error - ${error.message}`, 'error');
        this.failCount++;
        this.testCount++;
        resolve();
      });
    });
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.testCount,
        passed: this.passCount,
        failed: this.failCount,
        successRate: this.testCount > 0 ? ((this.passCount / this.testCount) * 100).toFixed(2) : 0
      },
      results: this.results,
      status: this.failCount === 0 ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED'
    };
    
    this.log('📊 TEST SUMMARY:');
    this.log(`   Total Tests: ${report.summary.totalTests}`);
    this.log(`   Passed: ${report.summary.passed}`, report.summary.passed > 0 ? 'success' : 'info');
    this.log(`   Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'error' : 'info');
    this.log(`   Success Rate: ${report.summary.successRate}%`, 
             report.summary.successRate >= 100 ? 'success' : 'error');
    
    if (report.status === 'ALL_TESTS_PASSED') {
      this.log('🎉 ALL WEBSOCKET TESTS PASSED! WebSocket connections are stable.', 'success');
    } else {
      this.log('🚨 SOME TESTS FAILED! WebSocket connections need attention.', 'error');
    }
    
    // Save detailed report
    const reportPath = '/workspaces/agent-feed/tests/websocket-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`📝 Detailed report saved to: ${reportPath}`);
    
    return report;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new WebSocketConnectionTester();
  tester.runAllTests().then((report) => {
    process.exit(report.status === 'ALL_TESTS_PASSED' ? 0 : 1);
  }).catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = WebSocketConnectionTester;