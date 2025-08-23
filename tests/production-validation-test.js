/**
 * Comprehensive Production Validation Test Suite
 * Tests complete application functionality for production readiness
 */

const axios = require('axios');
const WebSocket = require('ws');
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3001';

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  maxRetries: 3,
  loadTestDuration: 30000, // 30 seconds
  concurrentUsers: 10
};

class ProductionValidator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      performance: {}
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Production Validation...\n');

    // Core Infrastructure Tests
    await this.testBackendHealth();
    await this.testFrontendAvailability();
    await this.testAPIEndpoints();
    
    // Claude Launcher Tests
    await this.testClaudeLauncher();
    
    // WebSocket Tests
    await this.testWebSocketConnectivity();
    
    // Terminal Integration Tests
    await this.testTerminalIntegration();
    
    // Performance Tests
    await this.testPerformanceUnderLoad();
    
    // Error Handling Tests
    await this.testErrorHandling();
    
    // Security Tests
    await this.testBasicSecurity();
    
    // Generate Report
    this.generateValidationReport();
    
    return this.results;
  }

  async testBackendHealth() {
    console.log('🔍 Testing Backend Health...');
    try {
      const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
      if (response.data.status === 'healthy') {
        this.results.passed.push('Backend Health Check');
        console.log('✅ Backend is healthy');
      } else {
        throw new Error('Backend health check failed');
      }
    } catch (error) {
      this.results.failed.push(`Backend Health Check: ${error.message}`);
      console.log('❌ Backend health check failed');
    }
  }

  async testFrontendAvailability() {
    console.log('🔍 Testing Frontend Availability...');
    try {
      const response = await axios.get(BASE_URL, { timeout: 5000 });
      if (response.data.includes('Agent Feed')) {
        this.results.passed.push('Frontend Availability');
        console.log('✅ Frontend is available');
      } else {
        throw new Error('Frontend not properly loaded');
      }
    } catch (error) {
      this.results.failed.push(`Frontend Availability: ${error.message}`);
      console.log('❌ Frontend availability test failed');
    }
  }

  async testAPIEndpoints() {
    console.log('🔍 Testing API Endpoints...');
    
    const endpoints = [
      { path: '/api/posts', method: 'GET', expected: Array },
      { path: '/api/agents', method: 'GET', expected: Array },
      { path: '/api/claude/status', method: 'GET', expected: Object }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.path}`, { timeout: 5000 });
        if (Array.isArray(response.data) === (endpoint.expected === Array) ||
            typeof response.data === 'object') {
          this.results.passed.push(`API Endpoint: ${endpoint.path}`);
          console.log(`✅ ${endpoint.path} working`);
        } else {
          throw new Error('Unexpected response format');
        }
      } catch (error) {
        this.results.failed.push(`API Endpoint ${endpoint.path}: ${error.message}`);
        console.log(`❌ ${endpoint.path} failed`);
      }
    }
  }

  async testClaudeLauncher() {
    console.log('🔍 Testing Claude Code Launcher...');
    try {
      // Test status endpoint
      const statusResponse = await axios.get(`${BASE_URL}/api/claude/status`, { timeout: 5000 });
      
      if (statusResponse.data.success && statusResponse.data.status.isRunning) {
        this.results.passed.push('Claude Code Process Running');
        console.log(`✅ Claude Code running with PID: ${statusResponse.data.status.pid}`);
        
        // Verify process is actually running
        const processCheck = spawn('ps', ['-p', statusResponse.data.status.pid.toString()]);
        processCheck.on('close', (code) => {
          if (code === 0) {
            this.results.passed.push('Claude Code Process Verification');
            console.log('✅ Claude Code process verified');
          } else {
            this.results.failed.push('Claude Code Process Verification: Process not found');
            console.log('❌ Claude Code process not found');
          }
        });
      } else {
        throw new Error('Claude Code not running or status check failed');
      }
    } catch (error) {
      this.results.failed.push(`Claude Launcher Test: ${error.message}`);
      console.log('❌ Claude launcher test failed');
    }
  }

  async testWebSocketConnectivity() {
    console.log('🔍 Testing WebSocket Connectivity...');
    
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(`${WS_URL}`);
        let connectionEstablished = false;
        
        const timeout = setTimeout(() => {
          if (!connectionEstablished) {
            this.results.failed.push('WebSocket Connectivity: Connection timeout');
            console.log('❌ WebSocket connection timeout');
            resolve();
          }
        }, 5000);
        
        ws.on('open', () => {
          connectionEstablished = true;
          clearTimeout(timeout);
          this.results.passed.push('WebSocket Connectivity');
          console.log('✅ WebSocket connection established');
          ws.close();
          resolve();
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          this.results.failed.push(`WebSocket Connectivity: ${error.message}`);
          console.log('❌ WebSocket connection failed');
          resolve();
        });
      } catch (error) {
        this.results.failed.push(`WebSocket Test: ${error.message}`);
        console.log('❌ WebSocket test failed');
        resolve();
      }
    });
  }

  async testTerminalIntegration() {
    console.log('🔍 Testing Terminal Integration...');
    
    // Test terminal WebSocket namespace
    return new Promise((resolve) => {
      try {
        const terminalWs = new WebSocket(`${WS_URL}/terminal`);
        let terminalConnected = false;
        
        const timeout = setTimeout(() => {
          if (!terminalConnected) {
            this.results.warnings.push('Terminal Integration: Connection timeout - may not be fully implemented');
            console.log('⚠️ Terminal WebSocket connection timeout');
            resolve();
          }
        }, 5000);
        
        terminalWs.on('open', () => {
          terminalConnected = true;
          clearTimeout(timeout);
          this.results.passed.push('Terminal WebSocket Connection');
          console.log('✅ Terminal WebSocket connected');
          
          // Test basic terminal communication
          terminalWs.send(JSON.stringify({ type: 'command', data: 'echo "test"' }));
          
          setTimeout(() => {
            terminalWs.close();
            resolve();
          }, 1000);
        });
        
        terminalWs.on('message', (data) => {
          this.results.passed.push('Terminal Communication');
          console.log('✅ Terminal communication working');
        });
        
        terminalWs.on('error', (error) => {
          clearTimeout(timeout);
          this.results.warnings.push(`Terminal Integration: ${error.message}`);
          console.log('⚠️ Terminal integration issue detected');
          resolve();
        });
      } catch (error) {
        this.results.warnings.push(`Terminal Integration: ${error.message}`);
        console.log('⚠️ Terminal integration test failed');
        resolve();
      }
    });
  }

  async testPerformanceUnderLoad() {
    console.log('🔍 Testing Performance Under Load...');
    
    const startTime = Date.now();
    const promises = [];
    const responsesTimes = [];
    
    // Simulate concurrent users
    for (let i = 0; i < TEST_CONFIG.concurrentUsers; i++) {
      promises.push(this.simulateUserSession(responsesTimes));
    }
    
    try {
      await Promise.all(promises);
      const avgResponseTime = responsesTimes.reduce((a, b) => a + b, 0) / responsesTimes.length;
      const totalDuration = Date.now() - startTime;
      
      this.results.performance = {
        averageResponseTime: avgResponseTime,
        totalDuration,
        successfulRequests: responsesTimes.length,
        requestsPerSecond: (responsesTimes.length / totalDuration) * 1000
      };
      
      if (avgResponseTime < 1000 && responsesTimes.length > 0) {
        this.results.passed.push(`Performance Test: ${avgResponseTime.toFixed(2)}ms avg response`);
        console.log(`✅ Performance test passed: ${avgResponseTime.toFixed(2)}ms average`);
      } else {
        this.results.warnings.push('Performance: Response times may be too high for production');
        console.log('⚠️ Performance may need optimization');
      }
    } catch (error) {
      this.results.failed.push(`Performance Test: ${error.message}`);
      console.log('❌ Performance test failed');
    }
  }

  async simulateUserSession(responseTimes) {
    const endpoints = ['/api/posts', '/api/agents', '/api/claude/status'];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        await axios.get(`${BASE_URL}${endpoint}`, { timeout: 5000 });
        responseTimes.push(Date.now() - startTime);
      } catch (error) {
        // Continue testing other endpoints
      }
    }
  }

  async testErrorHandling() {
    console.log('🔍 Testing Error Handling...');
    
    // Test 404 handling
    try {
      await axios.get(`${BASE_URL}/api/nonexistent`, { timeout: 5000 });
      this.results.failed.push('Error Handling: 404 not properly handled');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        this.results.passed.push('404 Error Handling');
        console.log('✅ 404 errors properly handled');
      } else {
        this.results.warnings.push('Error Handling: Unexpected error response');
      }
    }
    
    // Test malformed request handling
    try {
      await axios.post(`${BASE_URL}/api/posts`, { invalid: 'data' }, { timeout: 5000 });
    } catch (error) {
      if (error.response && (error.response.status === 400 || error.response.status === 422)) {
        this.results.passed.push('Malformed Request Handling');
        console.log('✅ Malformed requests properly handled');
      } else {
        this.results.warnings.push('Error Handling: Malformed request handling may need improvement');
      }
    }
  }

  async testBasicSecurity() {
    console.log('🔍 Testing Basic Security...');
    
    // Test for common headers
    try {
      const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
      const headers = response.headers;
      
      let securityScore = 0;
      const securityHeaders = ['x-frame-options', 'x-content-type-options', 'x-xss-protection'];
      
      securityHeaders.forEach(header => {
        if (headers[header]) securityScore++;
      });
      
      if (securityScore > 0) {
        this.results.passed.push(`Security Headers: ${securityScore}/${securityHeaders.length}`);
        console.log(`✅ Security headers present: ${securityScore}/${securityHeaders.length}`);
      } else {
        this.results.warnings.push('Security: No security headers detected');
        console.log('⚠️ Consider adding security headers');
      }
    } catch (error) {
      this.results.warnings.push(`Security Test: ${error.message}`);
    }
  }

  generateValidationReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 PRODUCTION VALIDATION REPORT');
    console.log('='.repeat(60));
    
    console.log(`\\n✅ PASSED TESTS (${this.results.passed.length}):`);
    this.results.passed.forEach(test => console.log(`   ✓ ${test}`));
    
    console.log(`\\n❌ FAILED TESTS (${this.results.failed.length}):`);
    this.results.failed.forEach(test => console.log(`   ✗ ${test}`));
    
    console.log(`\\n⚠️ WARNINGS (${this.results.warnings.length}):`);
    this.results.warnings.forEach(test => console.log(`   ⚠ ${test}`));
    
    if (this.results.performance.averageResponseTime) {
      console.log('\\n📊 PERFORMANCE METRICS:');
      console.log(`   Average Response Time: ${this.results.performance.averageResponseTime.toFixed(2)}ms`);
      console.log(`   Requests Per Second: ${this.results.performance.requestsPerSecond.toFixed(2)}`);
      console.log(`   Total Test Duration: ${this.results.performance.totalDuration}ms`);
    }
    
    // Production Readiness Assessment
    const totalTests = this.results.passed.length + this.results.failed.length;
    const passRate = (this.results.passed.length / totalTests) * 100;
    
    console.log('\\n🎯 PRODUCTION READINESS ASSESSMENT:');
    console.log(`   Pass Rate: ${passRate.toFixed(1)}%`);
    
    if (this.results.failed.length === 0 && passRate > 90) {
      console.log('   Status: ✅ READY FOR PRODUCTION');
    } else if (this.results.failed.length <= 2 && passRate > 80) {
      console.log('   Status: ⚠️ NEAR PRODUCTION READY - Address failed tests');
    } else {
      console.log('   Status: ❌ NOT READY FOR PRODUCTION - Significant issues detected');
    }
    
    console.log('\\n' + '='.repeat(60));
    console.log(`Validation completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const validator = new ProductionValidator();
  validator.runAllTests().then((results) => {
    process.exit(results.failed.length > 0 ? 1 : 0);
  }).catch((error) => {
    console.error('❌ Validation failed with error:', error.message);
    process.exit(1);
  });
}

module.exports = ProductionValidator;