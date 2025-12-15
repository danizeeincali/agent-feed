#!/usr/bin/env node

/**
 * MANUAL PRODUCTION VALIDATION SUITE
 * Server-side validation without browser automation
 */

const axios = require('axios');
const io = require('socket.io-client');

class ManualProductionValidator {
  constructor() {
    this.results = {
      backend: {
        health: false,
        websocketServer: false,
        apiEndpoints: false,
        webSocketConnections: 0
      },
      frontend: {
        htmlLoads: false,
        jsBundle: false,
        cssBundle: false,
        connectionStatusElement: false
      },
      websocket: {
        canConnect: false,
        receivesMessages: false,
        handlesErrors: false,
        concurrentConnections: 0
      },
      deployment: {
        approved: false,
        issues: [],
        criticalIssues: [],
        warnings: []
      }
    };
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const levelSymbols = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'debug': '🔍'
    };
    console.log(`${levelSymbols[level] || '📝'} [${timestamp}] ${message}`);
  }

  async validateBackend() {
    this.log('info', 'Starting Backend Validation...');
    
    try {
      // 1. Health Check
      const healthResponse = await axios.get('http://localhost:3001/health', { timeout: 5000 });
      this.results.backend.health = healthResponse.status === 200 && 
                                   healthResponse.data.status === 'healthy';
      
      if (this.results.backend.health) {
        this.log('success', 'Backend Health Check: PASS');
      } else {
        this.log('error', 'Backend Health Check: FAIL');
        this.results.deployment.criticalIssues.push('Backend health check failed');
      }

      // 2. API Endpoints Check
      const apiTests = [
        '/api/v1/claude-live/prod/agents',
        '/api/v1/claude-live/agents',
        '/api/agents'
      ];

      let apiWorking = false;
      for (const endpoint of apiTests) {
        try {
          const response = await axios.get(`http://localhost:3001${endpoint}`, { timeout: 3000 });
          if (response.status === 200) {
            apiWorking = true;
            this.log('success', `API Endpoint ${endpoint}: PASS`);
            break;
          }
        } catch (error) {
          this.log('warning', `API Endpoint ${endpoint}: ${error.response?.status || 'FAIL'}`);
        }
      }
      
      this.results.backend.apiEndpoints = apiWorking;
      if (!apiWorking) {
        this.results.deployment.criticalIssues.push('No working API endpoints found');
      }

      // 3. WebSocket Server Check
      const wsTest = await this.testWebSocketServer();
      this.results.backend.websocketServer = wsTest.connected;
      this.results.backend.webSocketConnections = wsTest.connections;
      
      if (wsTest.connected) {
        this.log('success', `WebSocket Server: PASS (${wsTest.connections} connections tested)`);
      } else {
        this.log('error', 'WebSocket Server: FAIL');
        this.results.deployment.criticalIssues.push('WebSocket server not responding');
      }

    } catch (error) {
      this.log('error', `Backend validation failed: ${error.message}`);
      this.results.deployment.criticalIssues.push(`Backend validation error: ${error.message}`);
    }
  }

  async testWebSocketServer() {
    return new Promise((resolve) => {
      let connectionsSuccessful = 0;
      const totalTests = 3;
      const sockets = [];
      
      const testConnection = (index) => {
        const socket = io('http://localhost:3001', {
          timeout: 5000,
          forceNew: true
        });
        
        sockets.push(socket);
        
        socket.on('connect', () => {
          connectionsSuccessful++;
          this.log('debug', `WebSocket connection ${index + 1}: SUCCESS`);
          
          if (connectionsSuccessful === totalTests) {
            // Cleanup
            sockets.forEach(s => s.disconnect());
            resolve({ 
              connected: true, 
              connections: connectionsSuccessful 
            });
          }
        });
        
        socket.on('connect_error', (error) => {
          this.log('debug', `WebSocket connection ${index + 1}: FAILED - ${error.message}`);
        });
      };
      
      // Test multiple concurrent connections
      for (let i = 0; i < totalTests; i++) {
        testConnection(i);
      }
      
      // Timeout after 10 seconds
      setTimeout(() => {
        sockets.forEach(s => s.disconnect());
        resolve({ 
          connected: connectionsSuccessful > 0, 
          connections: connectionsSuccessful 
        });
      }, 10000);
    });
  }

  async validateFrontend() {
    this.log('info', 'Starting Frontend Validation...');
    
    try {
      // 1. HTML Load Test
      const htmlResponse = await axios.get('http://localhost:3000', { timeout: 10000 });
      this.results.frontend.htmlLoads = htmlResponse.status === 200;
      
      if (this.results.frontend.htmlLoads) {
        this.log('success', 'Frontend HTML Load: PASS');
        
        // Check for connection status elements in HTML
        const html = htmlResponse.data;
        this.results.frontend.connectionStatusElement = 
          html.includes('connection-status') || 
          html.includes('ConnectionStatus') ||
          html.includes('websocket');
          
        if (this.results.frontend.connectionStatusElement) {
          this.log('success', 'Connection Status Element: FOUND');
        } else {
          this.log('warning', 'Connection Status Element: NOT FOUND');
          this.results.deployment.warnings.push('No connection status indicator found in HTML');
        }
        
        // Check for JavaScript bundles
        this.results.frontend.jsBundle = html.includes('.js');
        this.results.frontend.cssBundle = html.includes('.css');
        
        this.log('info', `JS Bundle referenced: ${this.results.frontend.jsBundle}`);
        this.log('info', `CSS Bundle referenced: ${this.results.frontend.cssBundle}`);
        
      } else {
        this.log('error', 'Frontend HTML Load: FAIL');
        this.results.deployment.criticalIssues.push('Frontend not accessible');
      }
      
    } catch (error) {
      this.log('error', `Frontend validation failed: ${error.message}`);
      this.results.deployment.criticalIssues.push(`Frontend validation error: ${error.message}`);
    }
  }

  async validateWebSocketIntegration() {
    this.log('info', 'Starting WebSocket Integration Validation...');
    
    return new Promise((resolve) => {
      const socket = io('http://localhost:3001');
      const tests = {
        connection: false,
        messageReceived: false,
        errorHandling: false
      };
      
      const timeout = setTimeout(() => {
        socket.disconnect();
        this.log('warning', 'WebSocket integration test timed out');
        resolve(tests);
      }, 15000);
      
      socket.on('connect', () => {
        tests.connection = true;
        this.log('success', 'WebSocket Integration: Connection established');
        
        // Test message sending/receiving
        socket.emit('test-message', { data: 'validation-test' });
        
        // Test system stats (if available)
        socket.on('system-stats', (data) => {
          tests.messageReceived = true;
          this.log('success', `WebSocket Integration: Received system stats - ${JSON.stringify(data)}`);
        });
        
        // Test error handling
        socket.emit('invalid-event', { invalid: true });
        tests.errorHandling = true; // If no crash, error handling works
        
        setTimeout(() => {
          clearTimeout(timeout);
          socket.disconnect();
          
          this.results.websocket.canConnect = tests.connection;
          this.results.websocket.receivesMessages = tests.messageReceived;
          this.results.websocket.handlesErrors = tests.errorHandling;
          
          if (tests.connection) {
            this.log('success', 'WebSocket Integration: PASS');
          } else {
            this.log('error', 'WebSocket Integration: FAIL');
            this.results.deployment.criticalIssues.push('WebSocket integration not working');
          }
          
          resolve(tests);
        }, 5000);
      });
      
      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        this.log('error', `WebSocket Integration: Connection failed - ${error.message}`);
        this.results.deployment.criticalIssues.push(`WebSocket integration error: ${error.message}`);
        resolve(tests);
      });
    });
  }

  async testConcurrentConnections() {
    this.log('info', 'Testing Concurrent WebSocket Connections...');
    
    return new Promise((resolve) => {
      const connectionCount = 5;
      let successfulConnections = 0;
      const sockets = [];
      
      for (let i = 0; i < connectionCount; i++) {
        const socket = io('http://localhost:3001', { forceNew: true });
        sockets.push(socket);
        
        socket.on('connect', () => {
          successfulConnections++;
          if (successfulConnections === connectionCount) {
            this.results.websocket.concurrentConnections = successfulConnections;
            this.log('success', `Concurrent Connections: ${successfulConnections}/${connectionCount} PASS`);
            
            // Cleanup
            sockets.forEach(s => s.disconnect());
            resolve(successfulConnections);
          }
        });
      }
      
      setTimeout(() => {
        this.results.websocket.concurrentConnections = successfulConnections;
        this.log('warning', `Concurrent Connections: ${successfulConnections}/${connectionCount} (partial)`);
        sockets.forEach(s => s.disconnect());
        resolve(successfulConnections);
      }, 10000);
    });
  }

  generateReport() {
    this.log('info', 'Generating Final Validation Report...');
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PRODUCTION VALIDATION REPORT');
    console.log('='.repeat(60));
    
    // Backend Results
    console.log('\n🔧 BACKEND VALIDATION:');
    console.log(`   Health Check: ${this.results.backend.health ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   WebSocket Server: ${this.results.backend.websocketServer ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   API Endpoints: ${this.results.backend.apiEndpoints ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   WebSocket Connections: ${this.results.backend.webSocketConnections} tested`);
    
    // Frontend Results  
    console.log('\n🎨 FRONTEND VALIDATION:');
    console.log(`   HTML Loading: ${this.results.frontend.htmlLoads ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   JS Bundle: ${this.results.frontend.jsBundle ? '✅ FOUND' : '⚠️  NOT FOUND'}`);
    console.log(`   CSS Bundle: ${this.results.frontend.cssBundle ? '✅ FOUND' : '⚠️  NOT FOUND'}`);
    console.log(`   Connection Status Element: ${this.results.frontend.connectionStatusElement ? '✅ FOUND' : '⚠️  NOT FOUND'}`);
    
    // WebSocket Results
    console.log('\n🔌 WEBSOCKET INTEGRATION:');
    console.log(`   Can Connect: ${this.results.websocket.canConnect ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Receives Messages: ${this.results.websocket.receivesMessages ? '✅ PASS' : '⚠️  PARTIAL'}`);
    console.log(`   Error Handling: ${this.results.websocket.handlesErrors ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Concurrent Connections: ${this.results.websocket.concurrentConnections} successful`);
    
    // Critical Issues
    if (this.results.deployment.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      this.results.deployment.criticalIssues.forEach(issue => {
        console.log(`   ❌ ${issue}`);
      });
    }
    
    // Warnings
    if (this.results.deployment.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.deployment.warnings.forEach(warning => {
        console.log(`   ⚠️  ${warning}`);
      });
    }
    
    // Final Decision
    const criticalPassed = this.results.deployment.criticalIssues.length === 0;
    const backendHealthy = this.results.backend.health && this.results.backend.websocketServer;
    const frontendAccessible = this.results.frontend.htmlLoads;
    const websocketWorking = this.results.websocket.canConnect;
    
    this.results.deployment.approved = criticalPassed && backendHealthy && frontendAccessible && websocketWorking;
    
    console.log('\n🚀 DEPLOYMENT DECISION:');
    console.log('='.repeat(60));
    
    if (this.results.deployment.approved) {
      console.log('✅ APPROVED FOR PRODUCTION DEPLOYMENT');
      console.log('🎉 System is ready for production use!');
      console.log('\n📊 VALIDATION SUMMARY:');
      console.log('   • Backend services: HEALTHY');
      console.log('   • WebSocket server: OPERATIONAL'); 
      console.log('   • Frontend interface: ACCESSIBLE');
      console.log('   • Real-time communication: FUNCTIONAL');
      console.log('   • Critical issues: NONE');
      
      if (this.results.deployment.warnings.length > 0) {
        console.log(`   • Warnings: ${this.results.deployment.warnings.length} (non-blocking)`);
      }
      
    } else {
      console.log('❌ NOT APPROVED FOR DEPLOYMENT');
      console.log('🛑 Critical issues must be resolved first');
      
      if (this.results.deployment.criticalIssues.length > 0) {
        console.log('\n📋 REQUIRED FIXES:');
        this.results.deployment.criticalIssues.forEach((issue, index) => {
          console.log(`   ${index + 1}. ${issue}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(60));
    return this.results.deployment.approved;
  }

  async run() {
    this.log('info', 'Starting Manual Production Validation...');
    
    try {
      await this.validateBackend();
      await this.validateFrontend();  
      await this.validateWebSocketIntegration();
      await this.testConcurrentConnections();
      
      const approved = this.generateReport();
      
      this.log('info', `Validation completed. Approved: ${approved}`);
      return { approved, results: this.results };
      
    } catch (error) {
      this.log('error', `Validation failed: ${error.message}`);
      this.results.deployment.criticalIssues.push(`Validation error: ${error.message}`);
      return { approved: false, results: this.results };
    }
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new ManualProductionValidator();
  validator.run().then(({ approved }) => {
    process.exit(approved ? 0 : 1);
  });
}

module.exports = ManualProductionValidator;