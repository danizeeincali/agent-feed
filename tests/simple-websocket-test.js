#!/usr/bin/env node

/**
 * Simple WebSocket Test for Quick Launch Functionality
 * This test focuses specifically on WebSocket communication
 */

const { io } = require('socket.io-client');

class SimpleWebSocketTest {
  constructor() {
    this.socket = null;
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    console.log(`[${elapsed}ms] ${timestamp} - ${message}`);
    
    this.testResults.push({
      timestamp,
      elapsed,
      message,
      type
    });
  }

  async connectToServer() {
    return new Promise((resolve, reject) => {
      this.log('🔌 Connecting to WebSocket server at http://localhost:3001');
      
      this.socket = io('http://localhost:3001', {
        timeout: 10000,
        forceNew: true,
        transports: ['polling', 'websocket']
      });

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout after 10 seconds'));
      }, 10000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.log(`✅ Connected successfully! Socket ID: ${this.socket.id}`, 'success');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        this.log(`❌ Connection failed: ${error.message}`, 'error');
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        this.log(`🔌 Disconnected: ${reason}`, 'warning');
      });

      // Listen for process events
      this.socket.on('process:launched', (data) => {
        this.log(`✅ Process launched: PID ${data.pid}, Status: ${data.status}`, 'success');
      });

      this.socket.on('process:killed', (data) => {
        this.log('🔴 Process killed successfully', 'info');
      });

      this.socket.on('process:info:response', (data) => {
        this.log(`ℹ️ Process info: PID ${data.pid || 'N/A'}, Status: ${data.status}`, 'info');
      });

      this.socket.on('error', (error) => {
        this.log(`❌ Socket error: ${error}`, 'error');
      });
    });
  }

  async testProcessLaunch() {
    return new Promise((resolve) => {
      this.log('🚀 Testing process launch...');
      
      // Set up response handler
      const launchTimeout = setTimeout(() => {
        this.log('⏰ Process launch timeout after 10 seconds', 'warning');
        resolve(false);
      }, 10000);

      this.socket.once('process:launched', (data) => {
        clearTimeout(launchTimeout);
        this.log(`✅ Process launch successful!`, 'success');
        this.log(`   PID: ${data.pid}`);
        this.log(`   Name: ${data.name}`);
        this.log(`   Status: ${data.status}`);
        this.log(`   Start Time: ${data.startTime}`);
        resolve(true);
      });

      // Emit launch command
      this.socket.emit('process:launch', {
        config: { test: true }
      });
      
      this.log('📤 Sent process:launch event');
    });
  }

  async testProcessInfo() {
    return new Promise((resolve) => {
      this.log('ℹ️ Testing process info...');
      
      const infoTimeout = setTimeout(() => {
        this.log('⏰ Process info timeout', 'warning');
        resolve(false);
      }, 5000);

      this.socket.once('process:info:response', (data) => {
        clearTimeout(infoTimeout);
        this.log(`✅ Process info received: ${JSON.stringify(data)}`, 'success');
        resolve(true);
      });

      this.socket.emit('process:info');
      this.log('📤 Sent process:info request');
    });
  }

  async testProcessKill() {
    return new Promise((resolve) => {
      this.log('🔴 Testing process kill...');
      
      const killTimeout = setTimeout(() => {
        this.log('⏰ Process kill timeout', 'warning');
        resolve(false);
      }, 5000);

      this.socket.once('process:killed', (data) => {
        clearTimeout(killTimeout);
        this.log('✅ Process kill successful!', 'success');
        resolve(true);
      });

      this.socket.emit('process:kill');
      this.log('📤 Sent process:kill event');
    });
  }

  async runTests() {
    console.log('🧪 Starting WebSocket Quick Launch Tests');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const results = {
      connection: false,
      processLaunch: false,
      processInfo: false,
      processKill: false
    };

    try {
      // Test 1: Connection
      await this.connectToServer();
      results.connection = true;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 2: Process Launch
      results.processLaunch = await this.testProcessLaunch();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 3: Process Info
      results.processInfo = await this.testProcessInfo();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 4: Process Kill (only if launch was successful)
      if (results.processLaunch) {
        results.processKill = await this.testProcessKill();
      } else {
        this.log('⏭️ Skipping process kill test - launch failed', 'warning');
      }

    } catch (error) {
      this.log(`💥 Test suite failed: ${error.message}`, 'error');
    }

    // Generate report
    this.generateReport(results);
    
    return results;
  }

  generateReport(results) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                    TEST REPORT                        ');
    console.log('═══════════════════════════════════════════════════════');
    
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(Boolean).length;
    const passRate = Math.round((passedTests / totalTests) * 100);
    
    console.log(`📊 Overall Result: ${passRate}% (${passedTests}/${totalTests} tests passed)`);
    console.log('');
    
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${status} - ${testName}`);
    });
    
    console.log('\n📝 Detailed Event Log:');
    this.testResults.forEach(result => {
      let icon = '🔵';
      if (result.type === 'success') icon = '✅';
      else if (result.type === 'error') icon = '❌';
      else if (result.type === 'warning') icon = '⚠️';
      
      console.log(`${icon} [${result.elapsed}ms] ${result.message}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════');
    
    // Expected Results Analysis
    console.log('\n🎯 EXPECTED vs ACTUAL RESULTS:');
    
    const expectedResults = {
      connection: true,
      processLaunch: true,
      processInfo: true,
      processKill: true
    };
    
    let allTestsPassed = true;
    Object.entries(expectedResults).forEach(([test, expected]) => {
      const actual = results[test];
      const match = expected === actual;
      if (!match) allTestsPassed = false;
      
      console.log(`  ${test}: Expected ${expected}, Got ${actual} ${match ? '✅' : '❌'}`);
    });
    
    console.log(`\n🏁 Final Status: ${allTestsPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    
    if (allTestsPassed) {
      console.log('🎉 Quick Launch functionality is working correctly!');
      console.log('   - WebSocket connection established');
      console.log('   - Process launch events work');
      console.log('   - Process info retrieval works');  
      console.log('   - Process kill functionality works');
    } else {
      console.log('⚠️ Issues detected with Quick Launch functionality:');
      Object.entries(results).forEach(([test, passed]) => {
        if (!passed) {
          console.log(`   - ${test} test failed`);
        }
      });
    }
  }

  cleanup() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new SimpleWebSocketTest();
  
  tester.runTests()
    .then((results) => {
      const allPassed = Object.values(results).every(Boolean);
      setTimeout(() => {
        tester.cleanup();
        process.exit(allPassed ? 0 : 1);
      }, 1000);
    })
    .catch((error) => {
      console.error('💥 Test runner failed:', error);
      tester.cleanup();
      process.exit(1);
    });
}

module.exports = SimpleWebSocketTest;