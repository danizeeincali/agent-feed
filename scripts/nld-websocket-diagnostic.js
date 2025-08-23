#!/usr/bin/env node
/**
 * Neural Learning Dynamics (NLD) WebSocket Diagnostic Tool
 * Advanced pattern-based diagnostic system for WebSocket connection issues
 */

const { io } = require('socket.io-client');
const http = require('http');

// NLD Pattern Recognition Engine
class NLDWebSocketDiagnostic {
  constructor() {
    this.patterns = {
      backend_success: {
        environment: 'nodejs',
        security_bypass: true,
        cors_enforcement: false,
        expected_outcome: 'success'
      },
      browser_failure: {
        environment: 'browser',
        security_enforcement: true,
        cors_enforcement: true,
        expected_outcome: 'cors_failure'
      }
    };
    
    this.diagnosticResults = [];
    this.patternMatches = [];
  }

  async runComprehensiveDiagnostic() {
    console.log('🧠 NLD WebSocket Diagnostic System Starting...\n');
    
    // Pattern 1: Server Availability Check
    await this.checkServerAvailability();
    
    // Pattern 2: CORS Configuration Analysis
    await this.analyzeCORSConfiguration();
    
    // Pattern 3: Transport Negotiation Test
    await this.testTransportNegotiation();
    
    // Pattern 4: Environment-Specific Behavior
    await this.analyzeEnvironmentBehavior();
    
    // Generate NLD Report
    this.generateNLDReport();
  }

  async checkServerAvailability() {
    console.log('🔍 Pattern Analysis: Server Availability');
    
    const ports = [3000, 3001, 3002, 3003];
    const results = [];
    
    for (const port of ports) {
      try {
        await this.httpCheck(`http://localhost:${port}`);
        results.push({ port, status: 'listening', pattern: 'available' });
        console.log(`✅ Port ${port}: Server responding`);
      } catch (error) {
        results.push({ port, status: 'unavailable', pattern: 'missing', error: error.message });
        console.log(`❌ Port ${port}: No response - ${error.message}`);
      }
    }
    
    this.diagnosticResults.push({
      test: 'server_availability',
      results,
      pattern_match: results.some(r => r.status === 'listening') ? 'partial_services' : 'no_services'
    });
  }

  async analyzeCORSConfiguration() {
    console.log('\n🔍 Pattern Analysis: CORS Configuration');
    
    const testOrigins = [
      'http://localhost:3001',
      'http://localhost:3000',
      'null' // File protocol or direct access
    ];
    
    for (const origin of testOrigins) {
      try {
        const corsResult = await this.testCORSHeaders('http://localhost:3002', origin);
        console.log(`📋 Origin ${origin}: ${corsResult.pattern}`);
        
        this.diagnosticResults.push({
          test: 'cors_analysis',
          origin,
          ...corsResult
        });
      } catch (error) {
        console.log(`❌ Origin ${origin}: CORS test failed - ${error.message}`);
      }
    }
  }

  async testTransportNegotiation() {
    console.log('\n🔍 Pattern Analysis: Transport Negotiation');
    
    const transports = [
      ['polling'],
      ['websocket'],
      ['polling', 'websocket']
    ];
    
    for (const transportConfig of transports) {
      const result = await this.testSocketConnection('http://localhost:3002', {
        transports: transportConfig,
        timeout: 5000
      });
      
      console.log(`🚀 Transport ${transportConfig.join('+')}: ${result.pattern}`);
      
      this.diagnosticResults.push({
        test: 'transport_negotiation',
        transports: transportConfig,
        ...result
      });
    }
  }

  async analyzeEnvironmentBehavior() {
    console.log('\n🔍 Pattern Analysis: Environment Behavior');
    
    // Simulate browser behavior vs Node.js behavior
    const nodeJsResult = await this.testSocketConnection('http://localhost:3002', {
      transports: ['polling', 'websocket'],
      timeout: 5000,
      simulate_browser: false
    });
    
    console.log(`🖥️  Node.js Environment: ${nodeJsResult.pattern}`);
    
    const browserSimResult = await this.testSocketConnection('http://localhost:3002', {
      transports: ['polling', 'websocket'],
      timeout: 5000,
      simulate_browser: true,
      extraHeaders: {
        'Origin': 'http://localhost:3001',
        'User-Agent': 'Mozilla/5.0 (Browser Simulation)'
      }
    });
    
    console.log(`🌐 Browser Simulation: ${browserSimResult.pattern}`);
    
    // Pattern matching
    if (nodeJsResult.success && !browserSimResult.success) {
      this.patternMatches.push({
        pattern_type: 'environment_security_mismatch',
        confidence: 95,
        description: 'Node.js succeeds, browser fails - CORS issue detected'
      });
    }
  }

  async testSocketConnection(url, options = {}) {
    return new Promise((resolve) => {
      const socket = io(url, {
        autoConnect: false,
        timeout: options.timeout || 5000,
        transports: options.transports || ['polling', 'websocket'],
        forceNew: true,
        extraHeaders: options.extraHeaders || {}
      });

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.disconnect();
          resolve({
            success: false,
            pattern: 'connection_timeout',
            error: 'Timeout after ' + (options.timeout || 5000) + 'ms'
          });
        }
      }, options.timeout || 5000);

      socket.on('connect', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          socket.disconnect();
          resolve({
            success: true,
            pattern: 'connection_success',
            transport: socket.io.engine?.transport?.name || 'unknown'
          });
        }
      });

      socket.on('connect_error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            pattern: this.classifyError(error.message),
            error: error.message
          });
        }
      });

      socket.connect();
    });
  }

  async testCORSHeaders(url, origin) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/socket.io/?EIO=4&transport=polling',
        method: 'GET',
        headers: {
          'Origin': origin,
          'User-Agent': 'NLD-Diagnostic-Tool'
        }
      };

      const req = http.request(options, (res) => {
        const corsHeaders = {
          'access-control-allow-origin': res.headers['access-control-allow-origin'],
          'access-control-allow-credentials': res.headers['access-control-allow-credentials'],
          'access-control-allow-methods': res.headers['access-control-allow-methods']
        };

        if (corsHeaders['access-control-allow-origin']) {
          resolve({
            pattern: 'cors_configured',
            cors_headers: corsHeaders,
            status_code: res.statusCode
          });
        } else {
          resolve({
            pattern: 'cors_missing',
            cors_headers: corsHeaders,
            status_code: res.statusCode
          });
        }
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async httpCheck(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: '/',
        method: 'GET',
        timeout: 3000
      };

      const req = http.request(options, (res) => {
        resolve({ statusCode: res.statusCode });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timeout'));
      });

      req.end();
    });
  }

  classifyError(errorMessage) {
    const errorPatterns = {
      'xhr poll error': 'cors_transport_blocked',
      'timeout': 'connection_timeout',
      'ECONNREFUSED': 'server_unavailable',
      'CORS': 'cors_policy_violation',
      'Network Error': 'network_connectivity'
    };

    for (const [pattern, classification] of Object.entries(errorPatterns)) {
      if (errorMessage.includes(pattern)) {
        return classification;
      }
    }

    return 'unknown_error';
  }

  generateNLDReport() {
    console.log('\n📊 NLD Pattern Recognition Report');
    console.log('==================================');
    
    // Analyze patterns
    const serverAvailable = this.diagnosticResults.some(r => 
      r.test === 'server_availability' && r.results.some(s => s.status === 'listening')
    );
    
    const corsConfigured = this.diagnosticResults.some(r => 
      r.test === 'cors_analysis' && r.pattern === 'cors_configured'
    );
    
    const transportBlocked = this.diagnosticResults.some(r => 
      r.test === 'transport_negotiation' && r.pattern === 'cors_transport_blocked'
    );

    // Pattern classification
    let primaryPattern = 'unknown';
    let confidence = 0;
    let recommendations = [];

    if (!serverAvailable) {
      primaryPattern = 'server_unavailable';
      confidence = 95;
      recommendations.push('Start the WebSocket server on port 3002');
      recommendations.push('Verify server configuration and port availability');
    } else if (!corsConfigured && transportBlocked) {
      primaryPattern = 'cors_configuration_missing';
      confidence = 98;
      recommendations.push('Configure CORS headers for Socket.IO server');
      recommendations.push('Add allowed origins for frontend domains');
      recommendations.push('Enable credentials support for WebSocket connections');
    } else if (this.patternMatches.some(p => p.pattern_type === 'environment_security_mismatch')) {
      primaryPattern = 'environment_security_mismatch';
      confidence = 95;
      recommendations.push('Browser security policies are blocking connections');
      recommendations.push('Node.js tests bypass browser security - not representative');
    }

    console.log(`🎯 Primary Pattern: ${primaryPattern}`);
    console.log(`📈 Confidence Level: ${confidence}%`);
    console.log(`\n💡 NLD Recommendations:`);
    recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));

    console.log(`\n🧬 Pattern Matches Found: ${this.patternMatches.length}`);
    this.patternMatches.forEach((match, i) => {
      console.log(`   ${i + 1}. ${match.pattern_type} (${match.confidence}% confidence)`);
      console.log(`      ${match.description}`);
    });

    // Store results for neural learning
    const nldhResults = {
      timestamp: new Date().toISOString(),
      primary_pattern: primaryPattern,
      confidence,
      recommendations,
      pattern_matches: this.patternMatches,
      diagnostic_results: this.diagnosticResults
    };

    console.log(`\n💾 Results stored for Neural Learning Database`);
    console.log(`📁 Pattern ID: websocket_${Date.now()}`);
    
    return nldhResults;
  }
}

// Run the diagnostic
async function main() {
  const diagnostic = new NLDWebSocketDiagnostic();
  await diagnostic.runComprehensiveDiagnostic();
}

main().catch(console.error);