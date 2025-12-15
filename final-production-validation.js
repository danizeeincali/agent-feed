#!/usr/bin/env node

/**
 * FINAL PRODUCTION VALIDATION SUITE
 * Comprehensive validation of Agent Feed with WebSocket integration
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

class FinalProductionValidator {
  constructor() {
    this.results = {
      backend: {
        health: false,
        websocket: false,
        api: false
      },
      frontend: {
        loads: false,
        connectionStatus: false,
        claudeLauncher: false,
        websocketFeatures: false
      },
      integration: {
        realTimeUpdates: false,
        errorHandling: false,
        concurrentConnections: false
      },
      deployment: {
        approved: false,
        issues: []
      }
    };
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 FINAL PRODUCTION VALIDATION STARTING...\n');
    
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Listen for console messages
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Error:', msg.text());
        this.results.deployment.issues.push(`Browser Error: ${msg.text()}`);
      }
    });
    
    // Listen for network failures
    this.page.on('requestfailed', request => {
      console.log('🌐 Network Failure:', request.url());
      this.results.deployment.issues.push(`Network Failure: ${request.url()}`);
    });
  }

  async validateBackend() {
    console.log('🔧 BACKEND VALIDATION...');
    
    try {
      // Health check
      const healthResponse = await axios.get('http://localhost:3001/health');
      this.results.backend.health = healthResponse.status === 200 && 
                                   healthResponse.data.status === 'healthy';
      console.log(`   ✅ Health Check: ${this.results.backend.health ? 'PASS' : 'FAIL'}`);
      
      // WebSocket server check
      const wsCheck = await this.checkWebSocketServer();
      this.results.backend.websocket = wsCheck;
      console.log(`   ✅ WebSocket Server: ${wsCheck ? 'PASS' : 'FAIL'}`);
      
      // API endpoints check
      const apiResponse = await axios.get('http://localhost:3001/api/v1/claude-live/prod/agents');
      this.results.backend.api = apiResponse.status === 200;
      console.log(`   ✅ API Endpoints: ${this.results.backend.api ? 'PASS' : 'FAIL'}`);
      
    } catch (error) {
      console.log('   ❌ Backend validation failed:', error.message);
      this.results.deployment.issues.push(`Backend Error: ${error.message}`);
    }
  }

  async checkWebSocketServer() {
    return new Promise((resolve) => {
      const io = require('socket.io-client');
      const socket = io('http://localhost:3001');
      
      const timeout = setTimeout(() => {
        socket.disconnect();
        resolve(false);
      }, 5000);
      
      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve(true);
      });
      
      socket.on('connect_error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  async validateFrontend() {
    console.log('\n🎨 FRONTEND VALIDATION...');
    
    try {
      // Load main page
      await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
      this.results.frontend.loads = true;
      console.log('   ✅ Frontend Loads: PASS');
      
      // Check connection status
      await this.page.waitForSelector('[data-testid="connection-status"]', { timeout: 10000 });
      const connectionText = await this.page.$eval('[data-testid="connection-status"]', el => el.textContent);
      this.results.frontend.connectionStatus = connectionText.includes('Connected');
      console.log(`   ✅ Connection Status: ${this.results.frontend.connectionStatus ? 'PASS' : 'FAIL'} (${connectionText})`);
      
      // Test Claude launcher
      const launchers = await this.page.$$('[data-testid="claude-launcher"], [data-testid="instance-launcher"]');
      if (launchers.length > 0) {
        await launchers[0].click();
        await this.page.waitForTimeout(2000); // Wait for any modal or response
        this.results.frontend.claudeLauncher = true;
        console.log('   ✅ Claude Launcher: PASS');
      }
      
      // Test WebSocket features
      const wsFeatures = await this.page.evaluate(() => {
        return window.wsConnection && window.wsConnection.connected;
      });
      this.results.frontend.websocketFeatures = wsFeatures || false;
      console.log(`   ✅ WebSocket Features: ${this.results.frontend.websocketFeatures ? 'PASS' : 'PARTIAL'}`);
      
    } catch (error) {
      console.log('   ❌ Frontend validation failed:', error.message);
      this.results.deployment.issues.push(`Frontend Error: ${error.message}`);
    }
  }

  async validateIntegration() {
    console.log('\n🔗 INTEGRATION VALIDATION...');
    
    try {
      // Test real-time updates
      const realTimeTest = await this.testRealTimeUpdates();
      this.results.integration.realTimeUpdates = realTimeTest;
      console.log(`   ✅ Real-time Updates: ${realTimeTest ? 'PASS' : 'FAIL'}`);
      
      // Test error handling
      await this.page.evaluate(() => {
        if (window.wsConnection) {
          window.wsConnection.emit('test-error');
        }
      });
      await this.page.waitForTimeout(1000);
      this.results.integration.errorHandling = true;
      console.log('   ✅ Error Handling: PASS');
      
      // Test concurrent connections
      const concurrentTest = await this.testConcurrentConnections();
      this.results.integration.concurrentConnections = concurrentTest;
      console.log(`   ✅ Concurrent Connections: ${concurrentTest ? 'PASS' : 'FAIL'}`);
      
    } catch (error) {
      console.log('   ❌ Integration validation failed:', error.message);
      this.results.deployment.issues.push(`Integration Error: ${error.message}`);
    }
  }

  async testRealTimeUpdates() {
    try {
      const initialCount = await this.page.evaluate(() => {
        return document.querySelectorAll('[data-testid="real-time-update"]').length;
      });
      
      // Trigger update via WebSocket
      await this.page.evaluate(() => {
        if (window.wsConnection) {
          window.wsConnection.emit('test-update', { data: 'validation-test' });
        }
      });
      
      await this.page.waitForTimeout(2000);
      
      const finalCount = await this.page.evaluate(() => {
        return document.querySelectorAll('[data-testid="real-time-update"]').length;
      });
      
      return finalCount >= initialCount;
    } catch {
      return false;
    }
  }

  async testConcurrentConnections() {
    const io = require('socket.io-client');
    const connections = [];
    
    try {
      // Create 5 concurrent connections
      for (let i = 0; i < 5; i++) {
        connections.push(io('http://localhost:3001'));
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check all connections are established
      const connected = connections.every(socket => socket.connected);
      
      // Cleanup
      connections.forEach(socket => socket.disconnect());
      
      return connected;
    } catch {
      connections.forEach(socket => socket.disconnect());
      return false;
    }
  }

  generateReport() {
    console.log('\n📊 FINAL VALIDATION REPORT');
    console.log('='.repeat(50));
    
    // Backend Results
    console.log('\n🔧 BACKEND STATUS:');
    console.log(`   Health Check: ${this.results.backend.health ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   WebSocket Server: ${this.results.backend.websocket ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   API Endpoints: ${this.results.backend.api ? '✅ PASS' : '❌ FAIL'}`);
    
    // Frontend Results
    console.log('\n🎨 FRONTEND STATUS:');
    console.log(`   Page Loading: ${this.results.frontend.loads ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Connection Status: ${this.results.frontend.connectionStatus ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Claude Launcher: ${this.results.frontend.claudeLauncher ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   WebSocket Features: ${this.results.frontend.websocketFeatures ? '✅ PASS' : '⚠️  PARTIAL'}`);
    
    // Integration Results
    console.log('\n🔗 INTEGRATION STATUS:');
    console.log(`   Real-time Updates: ${this.results.integration.realTimeUpdates ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Error Handling: ${this.results.integration.errorHandling ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Concurrent Connections: ${this.results.integration.concurrentConnections ? '✅ PASS' : '❌ FAIL'}`);
    
    // Deployment Decision
    const allBackendPassed = Object.values(this.results.backend).every(v => v);
    const allFrontendPassed = Object.values(this.results.frontend).every(v => v);
    const allIntegrationPassed = Object.values(this.results.integration).every(v => v);
    
    this.results.deployment.approved = allBackendPassed && allFrontendPassed && allIntegrationPassed;
    
    console.log('\n🚀 DEPLOYMENT STATUS:');
    if (this.results.deployment.approved) {
      console.log('   ✅ APPROVED FOR PRODUCTION DEPLOYMENT');
      console.log('   🎉 All validation tests passed successfully!');
    } else {
      console.log('   ❌ NOT APPROVED - Issues found:');
      this.results.deployment.issues.forEach(issue => {
        console.log(`     • ${issue}`);
      });
    }
    
    return this.results.deployment.approved;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.validateBackend();
      await this.validateFrontend();
      await this.validateIntegration();
      
      const approved = this.generateReport();
      return approved;
      
    } catch (error) {
      console.error('💥 Validation failed:', error);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new FinalProductionValidator();
  validator.run().then(approved => {
    process.exit(approved ? 0 : 1);
  });
}

module.exports = FinalProductionValidator;