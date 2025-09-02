#!/usr/bin/env node

/**
 * SIMPLIFIED PRODUCTION VALIDATION
 * 
 * Quick validation script to verify core functionality without full test suite
 * Focuses on the most critical validation points
 */

const WebSocket = require('ws');
const axios = require('axios').default;

const CONFIG = {
  BASE_URL: 'http://localhost:3000',
  WS_URL: 'ws://localhost:3000/ws',
  TIMEOUT: 30000,
  QUICK_TEST_DURATION: 60000, // 1 minute
  TEST_MESSAGES: [
    'Hello, can you help me test the connection?',
    'What is 5 + 7?',
    'Write a simple hello world function in JavaScript'
  ]
};

class SimplifiedValidator {
  constructor() {
    this.results = {
      serverRunning: false,
      websocketConnect: false,
      messageFlow: false,
      realResponses: false,
      stability: false,
      noConnectionErrors: false
    };
    this.errors = [];
    this.responses = [];
  }

  log(message, type = 'INFO') {
    const colors = { INFO: '\x1b[36m', SUCCESS: '\x1b[32m', ERROR: '\x1b[31m', RESET: '\x1b[0m' };
    console.log(`${colors[type]}[${type}] ${message}${colors.RESET}`);
  }

  async checkServer() {
    this.log('Checking server status...');
    try {
      const response = await axios.get(CONFIG.BASE_URL, { timeout: 5000 });
      this.results.serverRunning = true;
      this.log('✅ Server is running', 'SUCCESS');
      return true;
    } catch (error) {
      this.errors.push(`Server check failed: ${error.message}`);
      this.log('❌ Server is not running', 'ERROR');
      return false;
    }
  }

  async testWebSocketConnection() {
    this.log('Testing WebSocket connection...');
    
    return new Promise((resolve) => {
      const ws = new WebSocket(CONFIG.WS_URL);
      let connected = false;
      
      const timeout = setTimeout(() => {
        if (!connected) {
          this.errors.push('WebSocket connection timeout');
          this.log('❌ WebSocket connection timeout', 'ERROR');
          resolve(false);
        }
      }, CONFIG.TIMEOUT);
      
      ws.on('open', () => {
        connected = true;
        clearTimeout(timeout);
        this.results.websocketConnect = true;
        this.log('✅ WebSocket connected', 'SUCCESS');
        
        // Test message flow
        this.testMessageFlow(ws).then(success => {
          ws.close();
          resolve(success);
        });
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        const errorMsg = error.message || error.toString();
        this.errors.push(`WebSocket error: ${errorMsg}`);
        
        // Check for the specific error we're tracking
        if (errorMsg.includes('Unknown error')) {
          this.log('🚨 CRITICAL: "Unknown error" detected!', 'ERROR');
        }
        
        this.log(`❌ WebSocket error: ${errorMsg}`, 'ERROR');
        resolve(false);
      });
      
      ws.on('close', (code, reason) => {
        const reasonStr = reason.toString();
        if (reasonStr.includes('Unknown error')) {
          this.errors.push('WebSocket closed with "Unknown error"');
          this.log('🚨 CRITICAL: WebSocket closed with "Unknown error"!', 'ERROR');
        }
      });
    });
  }

  async testMessageFlow(ws) {
    this.log('Testing message flow...');
    
    let messagesCompleted = 0;
    const testPromises = CONFIG.TEST_MESSAGES.map((message, index) => {
      return new Promise((resolve) => {
        const messageData = {
          type: 'claude_request',
          message: message,
          id: `test_${index}`,
          timestamp: Date.now()
        };
        
        const responseHandler = (data) => {
          const response = data.toString();
          this.responses.push(response);
          
          // Check if this is a real Claude response
          const isReal = response.length > 20 && 
                        !response.includes('mock') && 
                        !response.includes('simulation') &&
                        !response.includes('placeholder');
          
          if (isReal) {
            this.results.realResponses = true;
            this.log(`✅ Real response received for message ${index + 1}`, 'SUCCESS');
          } else {
            this.log(`⚠️ Questionable response for message ${index + 1}`, 'ERROR');
          }
          
          messagesCompleted++;
          ws.off('message', responseHandler);
          resolve(true);
        };
        
        ws.on('message', responseHandler);
        
        // Send message
        try {
          ws.send(JSON.stringify(messageData));
          this.log(`Sent test message ${index + 1}: ${message.substring(0, 30)}...`);
          
          // Timeout for this specific message
          setTimeout(() => {
            if (messagesCompleted <= index) {
              this.errors.push(`Message ${index + 1} timeout`);
              ws.off('message', responseHandler);
              resolve(false);
            }
          }, CONFIG.TIMEOUT);
          
        } catch (error) {
          this.errors.push(`Failed to send message ${index + 1}: ${error.message}`);
          resolve(false);
        }
      });
    });
    
    try {
      await Promise.all(testPromises);
      
      if (messagesCompleted >= CONFIG.TEST_MESSAGES.length / 2) {
        this.results.messageFlow = true;
        this.log(`✅ Message flow working (${messagesCompleted}/${CONFIG.TEST_MESSAGES.length})`, 'SUCCESS');
        return true;
      } else {
        this.log(`❌ Message flow insufficient (${messagesCompleted}/${CONFIG.TEST_MESSAGES.length})`, 'ERROR');
        return false;
      }
    } catch (error) {
      this.errors.push(`Message flow test failed: ${error.message}`);
      this.log(`❌ Message flow test failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async testStability() {
    this.log(`Testing connection stability for ${CONFIG.QUICK_TEST_DURATION / 1000} seconds...`);
    
    return new Promise((resolve) => {
      const ws = new WebSocket(CONFIG.WS_URL);
      const startTime = Date.now();
      let connectionDropped = false;
      let stabilityChecks = 0;
      
      ws.on('open', () => {
        this.log('Stability test WebSocket connected');
        
        const stabilityInterval = setInterval(() => {
          if (Date.now() - startTime > CONFIG.QUICK_TEST_DURATION) {
            clearInterval(stabilityInterval);
            
            if (!connectionDropped && ws.readyState === WebSocket.OPEN) {
              this.results.stability = true;
              this.log('✅ Stability test passed', 'SUCCESS');
            } else {
              this.log('❌ Stability test failed', 'ERROR');
            }
            
            ws.close();
            resolve(!connectionDropped);
            return;
          }
          
          stabilityChecks++;
          
          if (ws.readyState !== WebSocket.OPEN) {
            connectionDropped = true;
            this.errors.push('Connection dropped during stability test');
            this.log('❌ Connection dropped during stability test', 'ERROR');
            clearInterval(stabilityInterval);
            resolve(false);
            return;
          }
          
          // Send periodic ping
          if (stabilityChecks % 3 === 0) {
            try {
              ws.send(JSON.stringify({
                type: 'ping',
                message: `Stability ping ${stabilityChecks}`,
                timestamp: Date.now()
              }));
            } catch (error) {
              this.errors.push(`Stability ping failed: ${error.message}`);
            }
          }
        }, 5000); // Check every 5 seconds
      });
      
      ws.on('error', (error) => {
        connectionDropped = true;
        const errorMsg = error.message || error.toString();
        this.errors.push(`Stability test error: ${errorMsg}`);
        
        if (errorMsg.includes('Unknown error')) {
          this.log('🚨 CRITICAL: "Unknown error" during stability test!', 'ERROR');
        }
        
        resolve(false);
      });
      
      ws.on('close', (code, reason) => {
        const reasonStr = reason.toString();
        if (reasonStr.includes('Unknown error')) {
          this.errors.push('Stability test: WebSocket closed with "Unknown error"');
          this.log('🚨 CRITICAL: Stability WebSocket closed with "Unknown error"!', 'ERROR');
        }
        
        if (!connectionDropped && Date.now() - startTime >= CONFIG.QUICK_TEST_DURATION) {
          // Normal close after test completion
          this.results.stability = true;
        }
      });
      
      // Timeout for stability test
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        resolve(!connectionDropped);
      }, CONFIG.QUICK_TEST_DURATION + 5000);
    });
  }

  checkForConnectionErrors() {
    this.log('Checking for connection errors...');
    
    const hasUnknownError = this.errors.some(error => error.includes('Unknown error'));
    const hasConnectionLost = this.errors.some(error => 
      error.toLowerCase().includes('connection lost') || 
      error.toLowerCase().includes('connection error')
    );
    
    if (!hasUnknownError && !hasConnectionLost) {
      this.results.noConnectionErrors = true;
      this.log('✅ No connection errors detected', 'SUCCESS');
    } else {
      this.log('❌ Connection errors detected', 'ERROR');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('           SIMPLIFIED VALIDATION REPORT');
    console.log('='.repeat(60));
    
    const checks = [
      { name: 'Server Running', passed: this.results.serverRunning },
      { name: 'WebSocket Connect', passed: this.results.websocketConnect },
      { name: 'Message Flow', passed: this.results.messageFlow },
      { name: 'Real Claude Responses', passed: this.results.realResponses },
      { name: 'Connection Stability', passed: this.results.stability },
      { name: 'No Connection Errors', passed: this.results.noConnectionErrors }
    ];
    
    let passedCount = 0;
    checks.forEach(check => {
      const status = check.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${check.name}: ${status}`);
      if (check.passed) passedCount++;
    });
    
    const successRate = (passedCount / checks.length * 100).toFixed(1);
    const overallSuccess = passedCount === checks.length;
    
    console.log(`\nRESULTS: ${passedCount}/${checks.length} checks passed (${successRate}%)`);
    console.log(`RESPONSES RECEIVED: ${this.responses.length}`);
    console.log(`ERRORS ENCOUNTERED: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\nERRORS:');
      this.errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
    console.log(`\nOVERALL: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log('='.repeat(60));
    
    // Save simplified report
    const report = {
      timestamp: new Date().toISOString(),
      checks,
      successRate: parseFloat(successRate),
      overallSuccess,
      responsesReceived: this.responses.length,
      errors: this.errors,
      criticalFindings: {
        unknownErrorDetected: this.errors.some(e => e.includes('Unknown error')),
        connectionDropped: this.errors.some(e => e.includes('connection') || e.includes('Connection')),
        noRealResponses: !this.results.realResponses,
        serverNotRunning: !this.results.serverRunning
      }
    };
    
    try {
      const fs = require('fs');
      const reportPath = 'tests/production-validation/simplified-report.json';
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Report saved: ${reportPath}`);
    } catch (error) {
      console.log(`\n❌ Failed to save report: ${error.message}`);
    }
    
    return overallSuccess;
  }

  async run() {
    console.log('🚀 Starting Simplified Production Validation');
    console.log('='.repeat(60));
    
    try {
      // Run tests sequentially
      await this.checkServer();
      
      if (this.results.serverRunning) {
        await this.testWebSocketConnection();
        await this.testStability();
      }
      
      this.checkForConnectionErrors();
      
      // Generate report
      const success = this.generateReport();
      
      return success;
      
    } catch (error) {
      this.log(`Validation failed: ${error.message}`, 'ERROR');
      this.errors.push(`Validation failed: ${error.message}`);
      this.generateReport();
      return false;
    }
  }
}

// Main execution
async function main() {
  const validator = new SimplifiedValidator();
  
  try {
    const success = await validator.run();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(`Simplified validation failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SimplifiedValidator;
