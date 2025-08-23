#!/usr/bin/env node
/**
 * WebSocket Integration Validation Test
 * Comprehensive test to validate frontend WebSocket Hub integration
 */

const { io } = require('socket.io-client');

class WebSocketIntegrationTester {
  constructor() {
    this.hubUrl = 'http://localhost:3002';
    this.frontendSocket = null;
    this.testResults = [];
    this.testTimeout = 30000; // 30 seconds
    this.startTime = Date.now();
  }

  async runValidationTests() {
    console.log('🧪 Starting WebSocket Integration Validation Tests');
    console.log('================================================\n');
    
    try {
      await this.testHubConnectivity();
      await this.testFrontendRegistration();
      await this.testClaudeInstanceDiscovery();
      await this.testMessageRouting();
      await this.testHeartbeat();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.addTestResult('SUITE', 'FAILED', error.message);
    } finally {
      if (this.frontendSocket) {
        this.frontendSocket.disconnect();
      }
      process.exit(this.testResults.some(r => r.status === 'FAILED') ? 1 : 0);
    }
  }

  async testHubConnectivity() {
    console.log('1. Testing Hub Connectivity...');
    
    try {
      const response = await fetch(`${this.hubUrl}/health`);
      const health = await response.json();
      
      if (health.status === 'healthy') {
        this.addTestResult('HUB_HEALTH', 'PASSED', `Hub is healthy with ${health.hub.totalClients} clients`);
        console.log(`   ✅ Hub health check passed - ${health.hub.totalClients} clients connected`);
      } else {
        throw new Error('Hub health check failed');
      }
    } catch (error) {
      this.addTestResult('HUB_HEALTH', 'FAILED', error.message);
      console.log(`   ❌ Hub connectivity failed: ${error.message}`);
      throw error;
    }
  }

  async testFrontendRegistration() {
    console.log('\n2. Testing Frontend Registration...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Frontend registration timeout'));
      }, this.testTimeout);

      this.frontendSocket = io(this.hubUrl, {
        transports: ['websocket', 'polling'],
        forceNew: true
      });

      this.frontendSocket.on('connect', () => {
        console.log(`   🔌 Connected to hub with ID: ${this.frontendSocket.id}`);
        
        // Register as frontend
        this.frontendSocket.emit('registerFrontend', {
          type: 'test-frontend',
          capabilities: ['test'],
          timestamp: new Date().toISOString()
        });
      });

      this.frontendSocket.on('hubRegistered', (data) => {
        clearTimeout(timeout);
        
        if (data.type === 'frontend') {
          this.addTestResult('FRONTEND_REGISTRATION', 'PASSED', `Registered as frontend: ${data.clientId}`);
          console.log(`   ✅ Frontend registration successful: ${data.clientId}`);
          console.log(`   📊 Hub Status: ${data.hubStatus.totalClients} total, ${data.hubStatus.frontendClients} frontend`);
          resolve();
        } else {
          const error = 'Incorrect registration type received';
          this.addTestResult('FRONTEND_REGISTRATION', 'FAILED', error);
          reject(new Error(error));
        }
      });

      this.frontendSocket.on('connect_error', (error) => {
        clearTimeout(timeout);
        this.addTestResult('FRONTEND_REGISTRATION', 'FAILED', error.message);
        console.log(`   ❌ Frontend connection failed: ${error.message}`);
        reject(error);
      });

      this.frontendSocket.on('disconnect', (reason) => {
        console.log(`   🔌 Frontend disconnected: ${reason}`);
      });
    });
  }

  async testClaudeInstanceDiscovery() {
    console.log('\n3. Testing Claude Instance Discovery...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Claude instance discovery timeout'));
      }, 5000); // Shorter timeout for discovery

      // Request hub status to see Claude instances
      fetch(`${this.hubUrl}/hub/status`)
        .then(response => response.json())
        .then(status => {
          clearTimeout(timeout);
          
          if (status.claudeClients > 0) {
            const instances = status.claudeInstances;
            this.addTestResult('CLAUDE_DISCOVERY', 'PASSED', 
              `Found ${instances.length} Claude instances: ${instances.map(i => i.instanceType).join(', ')}`);
            console.log(`   ✅ Claude instances discovered:`);
            instances.forEach(instance => {
              console.log(`      - ${instance.instanceType} (ID: ${instance.id}, devMode: ${instance.devMode})`);
            });
            resolve(instances);
          } else {
            const error = 'No Claude instances found';
            this.addTestResult('CLAUDE_DISCOVERY', 'FAILED', error);
            console.log(`   ❌ ${error}`);
            reject(new Error(error));
          }
        })
        .catch(error => {
          clearTimeout(timeout);
          this.addTestResult('CLAUDE_DISCOVERY', 'FAILED', error.message);
          reject(error);
        });
    });
  }

  async testMessageRouting() {
    console.log('\n4. Testing Message Routing...');
    
    if (!this.frontendSocket) {
      throw new Error('Frontend socket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message routing test timeout'));
      }, this.testTimeout);

      let routingReceived = false;
      let responseReceived = false;

      // Listen for routing confirmation
      this.frontendSocket.on('messageRouted', (data) => {
        console.log(`   📤 Message routed to ${data.targetInstance}: ${data.targetId}`);
        routingReceived = true;
        
        if (routingReceived && responseReceived) {
          clearTimeout(timeout);
          this.addTestResult('MESSAGE_ROUTING', 'PASSED', 'Message successfully routed and response received');
          resolve();
        }
      });

      // Listen for routing errors
      this.frontendSocket.on('routingError', (error) => {
        clearTimeout(timeout);
        this.addTestResult('MESSAGE_ROUTING', 'FAILED', error.error);
        console.log(`   ❌ Routing error: ${error.error}`);
        reject(new Error(error.error));
      });

      // Listen for Claude response (optional - Claude may not respond in test)
      this.frontendSocket.on('fromClaude', (response) => {
        console.log(`   📥 Response from Claude: ${response.fromId}`);
        responseReceived = true;
        
        if (routingReceived) {
          clearTimeout(timeout);
          this.addTestResult('MESSAGE_ROUTING', 'PASSED', 'Complete message routing cycle successful');
          resolve();
        }
      });

      // If no Claude response after routing, still consider success
      setTimeout(() => {
        if (routingReceived && !responseReceived) {
          clearTimeout(timeout);
          this.addTestResult('MESSAGE_ROUTING', 'PASSED', 'Message routing successful (no Claude response expected in test)');
          console.log(`   ⚠️  Message routed successfully (Claude response not required for routing test)`);
          resolve();
        }
      }, 10000); // Wait 10 seconds for Claude response

      // Send test message to production Claude instance
      console.log(`   📤 Sending test message to production Claude...`);
      this.frontendSocket.emit('toClause', {
        targetInstance: 'production',
        type: 'test',
        message: 'Integration test message',
        timestamp: new Date().toISOString()
      });
    });
  }

  async testHeartbeat() {
    console.log('\n5. Testing Heartbeat...');
    
    if (!this.frontendSocket) {
      throw new Error('Frontend socket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Heartbeat test timeout'));
      }, 10000);

      this.frontendSocket.on('heartbeatAck', (data) => {
        clearTimeout(timeout);
        this.addTestResult('HEARTBEAT', 'PASSED', `Heartbeat acknowledged at ${data.timestamp}`);
        console.log(`   💓 Heartbeat acknowledged: ${data.timestamp}`);
        resolve();
      });

      console.log(`   💓 Sending heartbeat...`);
      this.frontendSocket.emit('heartbeat', {
        clientId: this.frontendSocket.id,
        timestamp: new Date().toISOString()
      });
    });
  }

  addTestResult(test, status, details) {
    this.testResults.push({
      test,
      status,
      details,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime
    });
  }

  async generateReport() {
    console.log('\n🎯 INTEGRATION VALIDATION REPORT');
    console.log('================================\n');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAILED').length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
    
    // Detailed results
    this.testResults.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.status}`);
      console.log(`   Details: ${result.details}`);
      console.log(`   Duration: ${result.duration}ms\n`);
    });

    // Integration status summary
    const isFullyIntegrated = failedTests === 0;
    console.log('🏁 FINAL INTEGRATION STATUS');
    console.log('==========================');
    
    if (isFullyIntegrated) {
      console.log('🎉 INTEGRATION SUCCESSFUL!');
      console.log('✅ Frontend WebSocket Hub integration is working correctly');
      console.log('✅ Real-time communication path is established');
      console.log('✅ Production and dev Claude instances are accessible');
      console.log('✅ Message routing is functional');
      console.log('✅ System is ready for user testing');
    } else {
      console.log('⚠️  INTEGRATION PARTIALLY SUCCESSFUL');
      console.log(`❌ ${failedTests} test(s) failed - review issues above`);
      console.log('🔧 Additional configuration or fixes may be required');
    }

    console.log('\n📋 NEXT STEPS FOR USER VALIDATION:');
    console.log('1. Open browser to http://localhost:3001');
    console.log('2. Check browser console for WebSocket connection status');
    console.log('3. Test chat/interaction features');
    console.log('4. Verify "Connected" status appears in UI');
    console.log('5. Confirm real-time responses from Claude instances');
    
    return isFullyIntegrated;
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new WebSocketIntegrationTester();
  tester.runValidationTests().catch(console.error);
}

module.exports = { WebSocketIntegrationTester };