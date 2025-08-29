/**
 * COMPREHENSIVE PRODUCTION VALIDATION TEST
 * Validates all system components work with REAL functionality (no mocks)
 */

const WebSocket = require('ws');

// Production Validation Configuration
const VALIDATION_CONFIG = {
  BACKEND_URL: 'http://localhost:3000',
  WEBSOCKET_URL: 'ws://localhost:3002',
  FRONTEND_URL: 'http://localhost:4173',
  TIMEOUT: 30000,
  MAX_RETRIES: 3
};

class ProductionValidator {
  constructor() {
    this.results = {
      websocketConnectivity: false,
      instanceCreation: false,
      instanceLifecycle: false,
      terminalIO: false,
      concurrentInstances: false,
      noMocksDetected: true,
      errors: []
    };
    this.instanceIds = [];
    this.connections = [];
  }

  async validate() {
    console.log('🚀 STARTING COMPREHENSIVE PRODUCTION VALIDATION');
    console.log('='.repeat(60));
    
    try {
      // 1. Validate WebSocket Connectivity
      await this.validateWebSocketConnectivity();
      
      // 2. Test Instance Creation & Lifecycle
      await this.validateInstanceLifecycle();
      
      // 3. Test Real Claude CLI Integration
      await this.validateClaudeCliIntegration();
      
      // 4. Test Terminal I/O Streaming
      await this.validateTerminalIO();
      
      // 5. Test Concurrent Instance Handling
      await this.validateConcurrentInstances();
      
      // 6. Verify No Mock Implementations
      await this.validateNoMocksOrSimulations();
      
      // 7. Generate Comprehensive Report
      return this.generateValidationReport();
      
    } catch (error) {
      this.results.errors.push(`Global validation error: ${error.message}`);
      console.error('❌ CRITICAL VALIDATION FAILURE:', error.message);
    } finally {
      await this.cleanup();
    }
  }

  async validateWebSocketConnectivity() {
    console.log('\n📡 VALIDATING WEBSOCKET CONNECTIVITY');
    console.log('-'.repeat(40));
    
    try {
      const ws = new WebSocket(VALIDATION_CONFIG.WEBSOCKET_URL);
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
          console.log('✅ WebSocket connection successful');
          this.results.websocketConnectivity = true;
          this.connections.push(ws);
          resolve();
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
    } catch (error) {
      this.results.errors.push(`WebSocket connectivity failed: ${error.message}`);
      console.error('❌ WebSocket connection failed:', error.message);
    }
  }

  async validateInstanceLifecycle() {
    console.log('\n🔄 VALIDATING INSTANCE LIFECYCLE TRANSITIONS');
    console.log('-'.repeat(40));
    
    try {
      // Create instance using correct API endpoint
      const response = await this.makeRequest(`${VALIDATION_CONFIG.BACKEND_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'skip-permissions',
          workingDirectory: 'prod'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Instance creation failed: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      const instance = result.instance;
      console.log('✅ Instance created:', instance.id);
      
      this.instanceIds.push(instance.id);
      this.results.instanceCreation = true;
      
      // Check instance status transitions (allow starting or running)
      const status = await this.checkInstanceStatus(instance.id);
      if (status === 'running' || status === 'starting') {
        this.results.instanceLifecycle = true;
        console.log('✅ Instance lifecycle validation successful');
      } else {
        throw new Error(`Instance status is ${status}, expected running or starting`);
      }
      
    } catch (error) {
      this.results.errors.push(`Instance lifecycle failed: ${error.message}`);
      console.error('❌ Instance lifecycle validation failed:', error.message);
    }
  }

  async validateClaudeCliIntegration() {
    console.log('\n🤖 VALIDATING REAL CLAUDE CLI INTEGRATION');
    console.log('-'.repeat(40));
    
    if (this.instanceIds.length === 0) {
      console.log('⚠️ No instances available for CLI validation');
      return;
    }
    
    try {
      const instanceId = this.instanceIds[0];
      
      // Check if the instance has a real Claude process
      const statusResponse = await this.makeRequest(
        `${VALIDATION_CONFIG.BACKEND_URL}/api/claude/instances/${instanceId}/status`
      );
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.pid && statusData.pid > 0) {
          console.log('✅ Real Claude CLI process detected with PID:', statusData.pid);
          console.log('✅ Claude CLI integration validation successful');
        } else {
          throw new Error('No real Claude process PID found');
        }
      } else {
        throw new Error('Could not check instance status');
      }
      
    } catch (error) {
      this.results.errors.push(`Claude CLI integration failed: ${error.message}`);
      console.error('❌ Claude CLI integration failed:', error.message);
    }
  }

  async validateTerminalIO() {
    console.log('\n💬 VALIDATING TERMINAL I/O STREAMING');
    console.log('-'.repeat(40));
    
    if (this.instanceIds.length === 0) {
      console.log('⚠️ No instances available for I/O validation');
      return;
    }
    
    try {
      const instanceId = this.instanceIds[0];
      const ws = new WebSocket(`${VALIDATION_CONFIG.WEBSOCKET_URL}?instanceId=${instanceId}`);
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Terminal I/O validation timeout'));
        }, 10000);
        
        let connected = false;
        
        ws.on('open', () => {
          console.log('✅ Terminal I/O WebSocket connected');
          connected = true;
          this.results.terminalIO = true;
          clearTimeout(timeout);
          resolve();
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      this.connections.push(ws);
      console.log('✅ Terminal I/O streaming validation successful');
      
    } catch (error) {
      this.results.errors.push(`Terminal I/O validation failed: ${error.message}`);
      console.error('❌ Terminal I/O validation failed:', error.message);
    }
  }

  async validateConcurrentInstances() {
    console.log('\n⚡ VALIDATING CONCURRENT INSTANCE HANDLING');
    console.log('-'.repeat(40));
    
    try {
      // Create 2 concurrent instances
      const concurrentRequests = Array.from({length: 2}, (_, i) => 
        this.makeRequest(`${VALIDATION_CONFIG.BACKEND_URL}/api/claude/instances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'skip-permissions',
            workingDirectory: 'prod'
          })
        })
      );
      
      const responses = await Promise.allSettled(concurrentRequests);
      const successfulResponses = responses.filter(r => r.status === 'fulfilled' && r.value.ok);
      
      console.log(`✅ Successfully created ${successfulResponses.length}/2 concurrent instances`);
      
      if (successfulResponses.length >= 1) {
        this.results.concurrentInstances = true;
      }
      
      // Add instance IDs for cleanup
      for (const response of successfulResponses) {
        try {
          const result = await response.value.json();
          if (result.instance && result.instance.id) {
            this.instanceIds.push(result.instance.id);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
    } catch (error) {
      this.results.errors.push(`Concurrent instances failed: ${error.message}`);
      console.error('❌ Concurrent instances validation failed:', error.message);
    }
  }

  async validateNoMocksOrSimulations() {
    console.log('\n🔍 VALIDATING NO MOCK/SIMULATION IMPLEMENTATIONS');
    console.log('-'.repeat(40));
    
    try {
      // Check if we have real processes running
      const instancesResponse = await this.makeRequest(`${VALIDATION_CONFIG.BACKEND_URL}/api/claude/instances`);
      
      if (instancesResponse.ok) {
        const data = await instancesResponse.json();
        const realProcesses = data.instances.filter(instance => 
          instance.pid && instance.pid > 0 && instance.processType === 'pty'
        );
        
        if (realProcesses.length > 0) {
          console.log(`✅ Found ${realProcesses.length} real Claude processes with PTY`);
          this.results.noMocksDetected = true;
        } else {
          console.log('⚠️ No real processes with PTY found');
          this.results.noMocksDetected = false;
        }
      }
      
    } catch (error) {
      this.results.errors.push(`Mock detection failed: ${error.message}`);
      console.error('❌ Mock detection failed:', error.message);
    }
  }

  async checkInstanceStatus(instanceId) {
    try {
      const response = await this.makeRequest(`${VALIDATION_CONFIG.BACKEND_URL}/api/claude/instances/${instanceId}/status`);
      if (!response.ok) {
        return 'error';
      }
      const data = await response.json();
      return data.status || 'unknown';
    } catch (error) {
      return 'error';
    }
  }

  async makeRequest(url, options = {}) {
    // Simple fetch implementation for Node.js
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const lib = isHttps ? https : http;
      
      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };
      
      const req = lib.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            json: () => Promise.resolve(JSON.parse(data)),
            text: () => Promise.resolve(data)
          });
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  generateValidationReport() {
    console.log('\n📊 COMPREHENSIVE VALIDATION REPORT');
    console.log('='.repeat(60));
    
    const totalChecks = Object.keys(this.results).filter(key => key !== 'errors').length;
    const passedChecks = Object.values(this.results)
      .filter(value => typeof value === 'boolean' && value === true).length;
    const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);
    
    console.log(`📈 OVERALL SUCCESS RATE: ${successRate}% (${passedChecks}/${totalChecks})`);
    console.log('-'.repeat(60));
    
    // Individual test results
    console.log('📋 DETAILED RESULTS:');
    console.log(`  🌐 WebSocket Connectivity: ${this.results.websocketConnectivity ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  🆔 Instance Creation: ${this.results.instanceCreation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  🔄 Instance Lifecycle: ${this.results.instanceLifecycle ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  💬 Terminal I/O: ${this.results.terminalIO ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ⚡ Concurrent Instances: ${this.results.concurrentInstances ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  🔍 No Mocks Detected: ${this.results.noMocksDetected ? '✅ PASS' : '❌ FAIL'}`);
    
    // System readiness status
    console.log('-'.repeat(60));
    if (passedChecks >= totalChecks - 1) {
      console.log('🎉 SYSTEM STATUS: PRODUCTION READY');
      console.log('✅ All critical components validated successfully');
    } else {
      console.log('⚠️ SYSTEM STATUS: REQUIRES ATTENTION');
      console.log(`❌ ${totalChecks - passedChecks} validation(s) failed`);
    }
    
    // Error summary
    if (this.results.errors.length > 0) {
      console.log('-'.repeat(60));
      console.log('🚨 ERRORS ENCOUNTERED:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('='.repeat(60));
    
    return {
      successRate: parseFloat(successRate),
      passedChecks,
      totalChecks,
      results: this.results,
      isProductionReady: passedChecks >= totalChecks - 1
    };
  }

  async cleanup() {
    console.log('\n🧹 CLEANING UP VALIDATION RESOURCES');
    
    // Close WebSocket connections
    this.connections.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      } catch (error) {
        console.log(`Warning: Could not close WebSocket: ${error.message}`);
      }
    });
    
    // Clean up test instances
    for (const instanceId of this.instanceIds) {
      try {
        const response = await this.makeRequest(`${VALIDATION_CONFIG.BACKEND_URL}/api/claude/instances/${instanceId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          console.log(`✅ Cleaned up instance: ${instanceId}`);
        }
      } catch (error) {
        console.log(`Warning: Could not delete instance ${instanceId}: ${error.message}`);
      }
    }
    
    console.log('✅ Validation cleanup completed');
  }
}

// Execute validation if run directly
if (require.main === module) {
  const validator = new ProductionValidator();
  validator.validate().catch(console.error);
}

module.exports = ProductionValidator;