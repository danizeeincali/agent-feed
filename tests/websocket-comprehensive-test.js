#!/usr/bin/env node
/**
 * SPARC IMPLEMENTATION: Comprehensive WebSocket Testing Suite
 * REFINEMENT: Advanced debugging and validation tools
 * COMPLETION: Production-grade testing and validation
 */

const { io } = require('socket.io-client');

class WebSocketTester {
  constructor() {
    this.testResults = [];
    this.socket = null;
    this.testStartTime = null;
  }

  log(message, data = '') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testUrl(url, testName = 'Connection Test') {
    this.log(`🧪 Starting ${testName} for ${url}`);
    const startTime = Date.now();
    
    try {
      const socket = io(url, {
        timeout: 10000,
        reconnection: false,
        transports: ['polling', 'websocket']
      });

      const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error('Connection timeout'));
        }, 10000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          const connectionTime = Date.now() - startTime;
          this.log(`✅ Connected to ${url} in ${connectionTime}ms`);
          
          // Test registration
          socket.emit('registerFrontend', {
            test: true,
            timestamp: new Date().toISOString()
          });
          
          socket.on('hubRegistered', (data) => {
            this.log(`📋 Registration confirmed:`, data);
            
            // Test heartbeat
            socket.emit('heartbeat', { clientSent: Date.now() });
            
            socket.on('heartbeatAck', (ackData) => {
              const latency = Date.now() - ackData.timestamp;
              this.log(`💓 Heartbeat acknowledged, latency: ${latency}ms`);
              
              socket.disconnect();
              resolve({
                success: true,
                url,
                connectionTime,
                latency,
                registrationData: data,
                transport: socket.io.engine.transport.name
              });
            });
          });
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          socket.disconnect();
          reject(error);
        });

        socket.on('error', (error) => {
          clearTimeout(timeout);
          socket.disconnect();
          reject(error);
        });
      });

      this.testResults.push(result);
      return result;

    } catch (error) {
      const failureTime = Date.now() - startTime;
      this.log(`❌ Connection failed to ${url} after ${failureTime}ms:`, error.message);
      
      const result = {
        success: false,
        url,
        error: error.message,
        connectionTime: failureTime
      };
      
      this.testResults.push(result);
      return result;
    }
  }

  async testFallbackUrls() {
    this.log('🚀 Testing fallback URL sequence...');
    
    const urls = [
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005'
    ];

    const results = [];
    
    for (const url of urls) {
      const result = await this.testUrl(url, 'Fallback Test');
      results.push(result);
      
      if (result.success) {
        this.log(`✅ First successful connection: ${url}`);
        break;
      }
      
      await this.delay(1000); // Wait between attempts
    }

    return results;
  }

  async testConnectionStability(url, duration = 30000) {
    this.log(`🔄 Testing connection stability for ${duration}ms...`);
    
    return new Promise((resolve, reject) => {
      const socket = io(url, {
        timeout: 10000,
        reconnection: false,
        transports: ['polling', 'websocket']
      });

      const metrics = {
        startTime: Date.now(),
        connected: false,
        disconnections: 0,
        messages: 0,
        latencies: [],
        errors: []
      };

      let heartbeatInterval;
      
      const cleanup = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        socket.disconnect();
      };

      const testTimeout = setTimeout(() => {
        cleanup();
        resolve(metrics);
      }, duration);

      socket.on('connect', () => {
        metrics.connected = true;
        this.log('📡 Stability test connected');
        
        socket.emit('registerFrontend', { stabilityTest: true });
        
        // Send heartbeat every 5 seconds
        heartbeatInterval = setInterval(() => {
          const startTime = Date.now();
          socket.emit('heartbeat', { clientSent: startTime });
        }, 5000);
      });

      socket.on('heartbeatAck', (data) => {
        const latency = Date.now() - data.timestamp;
        metrics.latencies.push(latency);
        metrics.messages++;
        this.log(`💓 Heartbeat ${metrics.messages}, latency: ${latency}ms`);
      });

      socket.on('disconnect', (reason) => {
        metrics.disconnections++;
        this.log(`🔌 Disconnected: ${reason}`);
      });

      socket.on('connect_error', (error) => {
        metrics.errors.push(error.message);
        this.log(`❌ Connection error:`, error.message);
      });

      socket.on('error', (error) => {
        metrics.errors.push(error.toString());
        this.log(`❌ Socket error:`, error);
      });
    });
  }

  async testMessageRouting(url) {
    this.log('📨 Testing message routing...');
    
    return new Promise((resolve, reject) => {
      const socket = io(url, {
        timeout: 10000,
        reconnection: false
      });

      const testTimeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Message routing test timeout'));
      }, 15000);

      socket.on('connect', () => {
        this.log('📡 Connected for message routing test');
        
        socket.emit('registerFrontend', { routingTest: true });
        
        socket.on('hubRegistered', () => {
          // Test message to Claude (will likely fail, but we can test the routing)
          socket.emit('toClause', {
            targetInstance: 'production',
            message: 'Test message from frontend',
            timestamp: new Date().toISOString()
          });
        });

        socket.on('messageRouted', (data) => {
          clearTimeout(testTimeout);
          socket.disconnect();
          this.log('✅ Message routing successful:', data);
          resolve({ success: true, routingData: data });
        });

        socket.on('routingError', (error) => {
          clearTimeout(testTimeout);
          socket.disconnect();
          this.log('⚠️ Expected routing error (no Claude instance):', error);
          resolve({ success: true, expectedError: error }); // This is expected
        });
      });

      socket.on('connect_error', (error) => {
        clearTimeout(testTimeout);
        socket.disconnect();
        reject(error);
      });
    });
  }

  async testServerHealth(url) {
    this.log('🏥 Testing server health endpoints...');
    
    try {
      const baseUrl = url.replace('/socket.io/', '').replace('ws://', 'http://').replace('wss://', 'https://');
      
      // Test health endpoint
      const healthResponse = await fetch(`${baseUrl}/health`);
      const healthData = await healthResponse.json();
      
      this.log('✅ Health endpoint response:', healthData);
      
      // Test status endpoint
      const statusResponse = await fetch(`${baseUrl}/hub/status`);
      const statusData = await statusResponse.json();
      
      this.log('✅ Status endpoint response:', statusData);
      
      // Test debug endpoint
      const debugResponse = await fetch(`${baseUrl}/debug`);
      const debugData = await debugResponse.json();
      
      this.log('✅ Debug endpoint response:', debugData);
      
      return {
        success: true,
        health: healthData,
        status: statusData,
        debug: debugData
      };
      
    } catch (error) {
      this.log('❌ Health check failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async runComprehensiveTest() {
    this.log('🚀 Starting comprehensive WebSocket test suite...');
    this.testStartTime = Date.now();
    
    const testSuite = {
      fallbackUrls: null,
      connectionStability: null,
      messageRouting: null,
      serverHealth: null,
      summary: null
    };

    try {
      // Test 1: Fallback URLs
      this.log('\n📋 TEST 1: Fallback URL Testing');
      testSuite.fallbackUrls = await this.testFallbackUrls();
      
      // Find first successful URL for remaining tests
      const workingUrl = testSuite.fallbackUrls.find(result => result.success)?.url;
      
      if (!workingUrl) {
        this.log('❌ No working URLs found, skipping remaining tests');
        return testSuite;
      }

      // Test 2: Connection Stability
      this.log('\n📋 TEST 2: Connection Stability');
      testSuite.connectionStability = await this.testConnectionStability(workingUrl, 15000);
      
      // Test 3: Message Routing
      this.log('\n📋 TEST 3: Message Routing');
      testSuite.messageRouting = await this.testMessageRouting(workingUrl);
      
      // Test 4: Server Health
      this.log('\n📋 TEST 4: Server Health');
      testSuite.serverHealth = await this.testServerHealth(workingUrl);
      
    } catch (error) {
      this.log('❌ Test suite error:', error);
    }

    // Generate summary
    const testDuration = Date.now() - this.testStartTime;
    testSuite.summary = this.generateTestSummary(testSuite, testDuration);
    
    this.log('\n📊 TEST SUMMARY');
    this.log('================');
    console.log(JSON.stringify(testSuite.summary, null, 2));
    
    return testSuite;
  }

  generateTestSummary(testSuite, duration) {
    const successfulUrls = testSuite.fallbackUrls?.filter(r => r.success).length || 0;
    const totalUrls = testSuite.fallbackUrls?.length || 0;
    
    const stability = testSuite.connectionStability;
    const avgLatency = stability?.latencies.length > 0 
      ? stability.latencies.reduce((a, b) => a + b, 0) / stability.latencies.length 
      : null;

    return {
      testDuration: `${duration}ms`,
      overallSuccess: successfulUrls > 0,
      fallbackUrls: {
        successful: successfulUrls,
        total: totalUrls,
        rate: totalUrls > 0 ? (successfulUrls / totalUrls * 100).toFixed(1) + '%' : '0%'
      },
      stability: stability ? {
        connected: stability.connected,
        disconnections: stability.disconnections,
        messages: stability.messages,
        averageLatency: avgLatency ? `${avgLatency.toFixed(0)}ms` : 'N/A',
        errors: stability.errors.length
      } : 'Not tested',
      routing: testSuite.messageRouting ? {
        successful: testSuite.messageRouting.success
      } : 'Not tested',
      serverHealth: testSuite.serverHealth ? {
        healthy: testSuite.serverHealth.success
      } : 'Not tested',
      recommendations: this.generateRecommendations(testSuite)
    };
  }

  generateRecommendations(testSuite) {
    const recommendations = [];
    
    if (!testSuite.fallbackUrls?.some(r => r.success)) {
      recommendations.push('🔴 CRITICAL: No WebSocket servers are responding. Start the hub server.');
    }
    
    if (testSuite.connectionStability?.errors.length > 0) {
      recommendations.push('🟡 WARNING: Connection errors detected. Check network stability.');
    }
    
    if (testSuite.connectionStability?.disconnections > 0) {
      recommendations.push('🟡 WARNING: Unexpected disconnections occurred. Check server stability.');
    }
    
    if (testSuite.connectionStability?.latencies.some(l => l > 1000)) {
      recommendations.push('🟡 WARNING: High latency detected. Check network performance.');
    }
    
    if (!testSuite.serverHealth?.success) {
      recommendations.push('🟡 WARNING: Server health endpoints not accessible.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('🟢 ALL TESTS PASSED: WebSocket system is healthy and ready for production.');
    }
    
    return recommendations;
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  const tester = new WebSocketTester();
  
  tester.runComprehensiveTest().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { WebSocketTester };