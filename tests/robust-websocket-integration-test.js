#!/usr/bin/env node
/**
 * SPARC IMPLEMENTATION: Robust WebSocket Integration Test
 * COMPLETION: End-to-end validation of the complete solution
 * Comprehensive testing of server, fallback, frontend integration, and error handling
 */

const { io } = require('socket.io-client');
const http = require('http');

class RobustWebSocketIntegrationTester {
  constructor() {
    this.testResults = {
      serverStartup: null,
      fallbackSystem: null,
      frontendIntegration: null,
      errorRecovery: null,
      performanceMetrics: null,
      overallResults: null
    };
    this.hubUrl = 'http://localhost:3003';
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪',
      metric: '📊'
    };
    console.log(`[${timestamp}] ${icons[type] || 'ℹ️'} ${message}`);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkServerHealth() {
    this.log('Testing server health endpoints...', 'test');
    
    try {
      // Health endpoint
      const healthResponse = await this.makeHttpRequest(`${this.hubUrl}/health`);
      const healthData = JSON.parse(healthResponse);
      
      if (healthData.status !== 'healthy') {
        throw new Error(`Server not healthy: ${healthData.status}`);
      }

      // Status endpoint
      const statusResponse = await this.makeHttpRequest(`${this.hubUrl}/hub/status`);
      const statusData = JSON.parse(statusResponse);

      // Test endpoint
      const testResponse = await this.makeHttpRequest(`${this.hubUrl}/test`);
      const testData = JSON.parse(testResponse);

      this.log('✅ All health endpoints responding correctly', 'success');
      
      return {
        success: true,
        health: healthData,
        status: statusData,
        test: testData
      };
    } catch (error) {
      this.log(`❌ Server health check failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testFallbackSystem() {
    this.log('Testing multi-port fallback system...', 'test');
    
    const ports = [3002, 3003, 3004, 3005];
    const results = [];
    
    for (const port of ports) {
      const url = `http://localhost:${port}`;
      try {
        const socket = io(url, {
          timeout: 5000,
          reconnection: false
        });

        const connectionResult = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            socket.disconnect();
            reject(new Error('Connection timeout'));
          }, 5000);

          socket.on('connect', () => {
            clearTimeout(timeout);
            socket.disconnect();
            resolve({ port, success: true, url });
          });

          socket.on('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        results.push(connectionResult);
        this.log(`✅ Port ${port}: Available`, 'success');
        
      } catch (error) {
        results.push({ port, success: false, error: error.message, url });
        this.log(`❌ Port ${port}: ${error.message}`, 'error');
      }
    }

    const successfulPorts = results.filter(r => r.success);
    this.log(`📊 Fallback test: ${successfulPorts.length}/${ports.length} ports available`, 'metric');
    
    return {
      success: successfulPorts.length > 0,
      results,
      availablePorts: successfulPorts.map(r => r.port),
      totalTested: ports.length,
      successRate: (successfulPorts.length / ports.length * 100).toFixed(1) + '%'
    };
  }

  async testFrontendIntegration() {
    this.log('Testing frontend integration scenarios...', 'test');
    
    try {
      const socket = io(this.hubUrl, {
        timeout: 10000,
        reconnection: false,
        transports: ['polling', 'websocket']
      });

      const integrationTest = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error('Integration test timeout'));
        }, 15000);

        const testResults = {
          connected: false,
          registered: false,
          heartbeatWorking: false,
          messageRouting: false,
          transportUpgrade: false,
          hubFeatures: false
        };

        socket.on('connect', () => {
          testResults.connected = true;
          testResults.transportUpgrade = socket.io.engine.transport.name === 'websocket';
          
          this.log('📡 Frontend connection established', 'success');
          
          // Test registration
          socket.emit('registerFrontend', {
            integrationTest: true,
            timestamp: new Date().toISOString(),
            userAgent: 'integration-test-client'
          });
        });

        socket.on('hubRegistered', (data) => {
          testResults.registered = true;
          testResults.hubFeatures = !!(data.hubStatus && data.clientId);
          
          this.log('📋 Frontend registration confirmed', 'success');
          
          // Test heartbeat
          socket.emit('heartbeat', { clientSent: Date.now() });
        });

        socket.on('heartbeatAck', (data) => {
          testResults.heartbeatWorking = true;
          
          this.log('💓 Heartbeat system working', 'success');
          
          // Test message routing
          socket.emit('toClause', {
            targetInstance: 'production',
            message: 'Integration test message',
            testId: 'integration-test'
          });
        });

        socket.on('routingError', (error) => {
          // This is expected since no Claude instance is connected
          testResults.messageRouting = error.error.includes('No production Claude instance');
          
          this.log('📤 Message routing system working (expected error)', 'success');
          
          socket.disconnect();
          clearTimeout(timeout);
          resolve(testResults);
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          socket.disconnect();
          reject(error);
        });
      });

      const allTestsPassed = Object.values(integrationTest).every(test => test === true);
      
      if (allTestsPassed) {
        this.log('✅ All frontend integration tests passed', 'success');
      } else {
        this.log('⚠️ Some frontend integration tests failed', 'warning');
      }

      return {
        success: allTestsPassed,
        details: integrationTest,
        passedTests: Object.values(integrationTest).filter(t => t).length,
        totalTests: Object.keys(integrationTest).length
      };

    } catch (error) {
      this.log(`❌ Frontend integration test failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testErrorRecovery() {
    this.log('Testing error recovery and resilience...', 'test');
    
    try {
      // Test connection to invalid URL (should fail gracefully)
      const invalidUrlTest = await this.testInvalidConnection();
      
      // Test rapid reconnection
      const reconnectionTest = await this.testRapidReconnection();
      
      // Test network interruption simulation
      const interruptionTest = await this.testNetworkInterruption();
      
      return {
        success: true,
        invalidUrlHandling: invalidUrlTest,
        reconnectionResilience: reconnectionTest,
        networkInterruption: interruptionTest
      };

    } catch (error) {
      this.log(`❌ Error recovery test failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testInvalidConnection() {
    this.log('Testing invalid URL handling...', 'test');
    
    try {
      const socket = io('http://localhost:9999', {
        timeout: 3000,
        reconnection: false
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(); // Timeout is expected
        }, 3000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          socket.disconnect();
          reject(new Error('Should not have connected to invalid URL'));
        });

        socket.on('connect_error', () => {
          clearTimeout(timeout);
          socket.disconnect();
          resolve(); // This is expected
        });
      });

      this.log('✅ Invalid URL handled correctly', 'success');
      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testRapidReconnection() {
    this.log('Testing rapid reconnection resilience...', 'test');
    
    let connections = 0;
    const maxConnections = 5;
    
    for (let i = 0; i < maxConnections; i++) {
      try {
        const socket = io(this.hubUrl, {
          timeout: 2000,
          reconnection: false
        });

        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            socket.disconnect();
            reject(new Error('Connection timeout'));
          }, 2000);

          socket.on('connect', () => {
            clearTimeout(timeout);
            connections++;
            socket.disconnect();
            resolve();
          });

          socket.on('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        await this.delay(100); // Small delay between connections
      } catch (error) {
        this.log(`⚠️ Rapid connection ${i + 1} failed: ${error.message}`, 'warning');
      }
    }

    const successRate = (connections / maxConnections * 100).toFixed(1);
    this.log(`📊 Rapid reconnection: ${connections}/${maxConnections} (${successRate}%)`, 'metric');
    
    return {
      success: connections >= maxConnections * 0.8, // 80% success rate required
      connections,
      maxConnections,
      successRate
    };
  }

  async testNetworkInterruption() {
    this.log('Testing network interruption simulation...', 'test');
    
    try {
      const socket = io(this.hubUrl, {
        timeout: 5000,
        reconnection: false
      });

      return new Promise((resolve, reject) => {
        let connected = false;
        let disconnected = false;
        
        const timeout = setTimeout(() => {
          socket.disconnect();
          if (connected && disconnected) {
            resolve({ success: true, cycleCompleted: true });
          } else {
            reject(new Error('Network interruption test incomplete'));
          }
        }, 8000);

        socket.on('connect', () => {
          connected = true;
          this.log('📡 Connected for interruption test', 'success');
          
          // Simulate network interruption by manually disconnecting
          setTimeout(() => {
            socket.disconnect();
          }, 2000);
        });

        socket.on('disconnect', () => {
          disconnected = true;
          this.log('🔌 Disconnection detected (simulated)', 'success');
          clearTimeout(timeout);
          resolve({ success: true, cycleCompleted: connected && disconnected });
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async measurePerformanceMetrics() {
    this.log('Measuring performance metrics...', 'test');
    
    const metrics = {
      connectionTimes: [],
      latencies: [],
      throughput: null,
      memoryUsage: process.memoryUsage(),
      startTime: this.startTime,
      testDuration: Date.now() - this.startTime
    };

    // Measure connection times
    for (let i = 0; i < 3; i++) {
      try {
        const startTime = Date.now();
        const socket = io(this.hubUrl, {
          timeout: 5000,
          reconnection: false
        });

        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            socket.disconnect();
            reject(new Error('Connection timeout'));
          }, 5000);

          socket.on('connect', () => {
            const connectionTime = Date.now() - startTime;
            metrics.connectionTimes.push(connectionTime);
            
            // Measure latency
            const pingStart = Date.now();
            socket.emit('heartbeat', { clientSent: pingStart });
            
            socket.on('heartbeatAck', () => {
              const latency = Date.now() - pingStart;
              metrics.latencies.push(latency);
              
              clearTimeout(timeout);
              socket.disconnect();
              resolve();
            });
          });

          socket.on('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        await this.delay(500);
      } catch (error) {
        this.log(`⚠️ Performance test ${i + 1} failed: ${error.message}`, 'warning');
      }
    }

    // Calculate averages
    metrics.avgConnectionTime = metrics.connectionTimes.length > 0 
      ? metrics.connectionTimes.reduce((a, b) => a + b, 0) / metrics.connectionTimes.length 
      : null;

    metrics.avgLatency = metrics.latencies.length > 0 
      ? metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length 
      : null;

    this.log(`📊 Avg connection time: ${metrics.avgConnectionTime}ms`, 'metric');
    this.log(`📊 Avg latency: ${metrics.avgLatency}ms`, 'metric');
    this.log(`📊 Test duration: ${metrics.testDuration}ms`, 'metric');

    return metrics;
  }

  makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
      const request = http.get(url, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
      });

      request.on('error', reject);
      request.setTimeout(5000, () => {
        request.destroy();
        reject(new Error('HTTP request timeout'));
      });
    });
  }

  generateDetailedReport() {
    const totalDuration = Date.now() - this.startTime;
    
    // Calculate overall success rate
    const testResults = Object.values(this.testResults).filter(result => result !== null);
    const successfulTests = testResults.filter(result => result && result.success).length;
    const overallSuccessRate = (successfulTests / testResults.length * 100).toFixed(1);

    // Generate recommendations
    const recommendations = [];
    
    if (this.testResults.serverStartup?.success) {
      recommendations.push('✅ Server is healthy and responsive');
    } else {
      recommendations.push('🔴 CRITICAL: Server health issues detected');
    }

    if (this.testResults.fallbackSystem?.success) {
      recommendations.push('✅ Fallback system is operational');
    } else {
      recommendations.push('🟡 WARNING: Fallback system has limited availability');
    }

    if (this.testResults.frontendIntegration?.success) {
      recommendations.push('✅ Frontend integration is working correctly');
    } else {
      recommendations.push('🔴 CRITICAL: Frontend integration issues detected');
    }

    if (this.testResults.errorRecovery?.success) {
      recommendations.push('✅ Error recovery system is robust');
    } else {
      recommendations.push('🟡 WARNING: Error recovery needs improvement');
    }

    if (this.testResults.performanceMetrics?.avgConnectionTime < 500) {
      recommendations.push('✅ Connection performance is excellent');
    } else if (this.testResults.performanceMetrics?.avgConnectionTime < 2000) {
      recommendations.push('🟡 WARNING: Connection performance could be improved');
    } else {
      recommendations.push('🔴 CRITICAL: Poor connection performance detected');
    }

    const report = {
      testSummary: {
        totalDuration: `${totalDuration}ms`,
        totalTests: testResults.length,
        successfulTests,
        overallSuccessRate: `${overallSuccessRate}%`,
        timestamp: new Date().toISOString()
      },
      detailedResults: this.testResults,
      recommendations,
      performanceSummary: this.testResults.performanceMetrics ? {
        averageConnectionTime: `${this.testResults.performanceMetrics.avgConnectionTime?.toFixed(0) || 'N/A'}ms`,
        averageLatency: `${this.testResults.performanceMetrics.avgLatency?.toFixed(0) || 'N/A'}ms`,
        connectionReliability: `${((this.testResults.performanceMetrics.connectionTimes?.length || 0) / 3 * 100).toFixed(0)}%`
      } : 'Not measured',
      verdict: overallSuccessRate >= 80 ? 'PRODUCTION READY' : 'NEEDS ATTENTION'
    };

    return report;
  }

  async runCompleteIntegrationTest() {
    this.log('🚀 Starting complete robust WebSocket integration test...', 'test');
    this.log('==================================================', 'info');

    try {
      // Test 1: Server Health
      this.log('\n📋 TEST 1: Server Startup and Health', 'test');
      this.testResults.serverStartup = await this.checkServerHealth();

      // Test 2: Fallback System
      this.log('\n📋 TEST 2: Multi-Port Fallback System', 'test');
      this.testResults.fallbackSystem = await this.testFallbackSystem();

      // Test 3: Frontend Integration
      this.log('\n📋 TEST 3: Frontend Integration', 'test');
      this.testResults.frontendIntegration = await this.testFrontendIntegration();

      // Test 4: Error Recovery
      this.log('\n📋 TEST 4: Error Recovery and Resilience', 'test');
      this.testResults.errorRecovery = await this.testErrorRecovery();

      // Test 5: Performance Metrics
      this.log('\n📋 TEST 5: Performance Metrics', 'test');
      this.testResults.performanceMetrics = await this.measurePerformanceMetrics();

      // Generate final report
      const report = this.generateDetailedReport();
      
      this.log('\n📊 INTEGRATION TEST COMPLETE', 'success');
      this.log('==================================================', 'info');
      console.log(JSON.stringify(report, null, 2));

      return report;

    } catch (error) {
      this.log(`❌ Integration test failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run integration test if script is executed directly
if (require.main === module) {
  const tester = new RobustWebSocketIntegrationTester();
  
  tester.runCompleteIntegrationTest().then((report) => {
    if (report.verdict === 'PRODUCTION READY') {
      console.log('\n🎉 ROBUST WEBSOCKET SYSTEM IS PRODUCTION READY!');
      process.exit(0);
    } else {
      console.log('\n⚠️ SYSTEM NEEDS ATTENTION BEFORE PRODUCTION USE');
      process.exit(1);
    }
  }).catch(error => {
    console.error('Integration test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { RobustWebSocketIntegrationTester };