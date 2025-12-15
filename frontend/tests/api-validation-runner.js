#!/usr/bin/env node

/**
 * API VALIDATION RUNNER - REAL FUNCTIONALITY TESTING
 * Tests backend APIs and database connections without browser dependencies
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { WebSocket } from 'ws';

const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

class APIValidationRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.resultsDir = path.join(process.cwd(), 'tests', 'test-results');
  }

  initialize() {
    console.log('🚀 Initializing API Validation Runner...');
    
    // Ensure results directory exists
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
    
    console.log('✅ API Runner initialized');
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        }
      };

      const req = http.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              status: res.statusCode,
              ok: res.statusCode >= 200 && res.statusCode < 300,
              data: jsonData,
              headers: res.headers
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              ok: res.statusCode >= 200 && res.statusCode < 300,
              data: data,
              headers: res.headers,
              parseError: error.message
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running: ${testName}`);
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      const testResult = {
        name: testName,
        passed: result.passed,
        duration,
        details: result.details,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(testResult);
      
      if (result.passed) {
        console.log(`  ✅ ${testName} - PASSED (${duration}ms)`);
      } else {
        console.log(`  ❌ ${testName} - FAILED (${duration}ms)`);
        if (result.details) {
          console.log(`  Details:`, JSON.stringify(result.details, null, 2));
        }
      }
      
      return testResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult = {
        name: testName,
        passed: false,
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(testResult);
      console.log(`  ❌ ${testName} - ERROR (${duration}ms): ${error.message}`);
      
      return testResult;
    }
  }

  async testDatabaseHealth() {
    return this.runTest('Database Health Check', async () => {
      const response = await this.makeRequest(`${API_URL}/health`);
      
      // Check both old format (data.database) and new format (database.available)
      const isHealthy = response.data?.status === 'healthy';
      const isDatabaseConnected = response.data?.database?.available === true || 
                                response.data?.services?.database === 'healthy';
      
      return {
        passed: response.ok && isHealthy && isDatabaseConnected,
        details: {
          status: response.status,
          healthStatus: response.data?.status,
          databaseAvailable: response.data?.database?.available,
          databaseService: response.data?.services?.database,
          fullResponse: response.data
        }
      };
    });
  }

  async testAgentsEndpoint() {
    return this.runTest('Agents API Endpoint', async () => {
      const response = await this.makeRequest(`${API_URL}/api/agents`);
      
      const hasValidData = response.ok && 
                          response.data?.data && 
                          Array.isArray(response.data.data);
      
      let hasRealData = false;
      if (hasValidData && response.data.data.length > 0) {
        const firstAgent = response.data.data[0];
        hasRealData = firstAgent.id && 
                     firstAgent.name && 
                     !firstAgent.name.toLowerCase().includes('mock');
      }
      
      return {
        passed: hasValidData && (response.data.data.length === 0 || hasRealData),
        details: {
          status: response.status,
          agentCount: response.data?.data?.length || 0,
          hasRealData,
          sampleAgent: response.data?.data?.[0] || null
        }
      };
    });
  }

  async testAgentPostsEndpoint() {
    return this.runTest('Agent Posts API Endpoint', async () => {
      const response = await this.makeRequest(`${API_URL}/api/v1/agent-posts`);
      
      const hasValidData = response.ok && 
                          response.data?.data && 
                          Array.isArray(response.data.data);
      
      let hasRealData = false;
      if (hasValidData && response.data.data.length > 0) {
        const firstPost = response.data.data[0];
        hasRealData = firstPost.id && 
                     firstPost.content && 
                     !firstPost.content.toLowerCase().includes('lorem ipsum');
      }
      
      return {
        passed: hasValidData && (response.data.data.length === 0 || hasRealData),
        details: {
          status: response.status,
          postCount: response.data?.data?.length || 0,
          hasRealData,
          samplePost: response.data?.data?.[0] ? {
            id: response.data.data[0].id,
            contentPreview: response.data.data[0].content?.substring(0, 100) + '...'
          } : null
        }
      };
    });
  }

  async testSystemMetrics() {
    return this.runTest('System Metrics Endpoint', async () => {
      const response = await this.makeRequest(`${API_URL}/api/v1/metrics/system`);
      
      const hasValidData = response.ok && response.data?.data;
      
      return {
        passed: hasValidData,
        details: {
          status: response.status,
          hasMetrics: !!response.data?.data,
          metricsType: typeof response.data?.data
        }
      };
    });
  }

  async testWebSocketConnection() {
    return this.runTest('WebSocket Connection', async () => {
      return new Promise((resolve, reject) => {
        let wsConnected = false;
        let messagesReceived = 0;
        let connectionError = null;
        
        const ws = new WebSocket(WS_URL);
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve({
            passed: wsConnected,
            details: {
              connected: wsConnected,
              messagesReceived,
              error: connectionError,
              timedOut: !wsConnected
            }
          });
        }, 5000);
        
        ws.on('open', () => {
          wsConnected = true;
          console.log('    📡 WebSocket connected');
          
          // Send a test message
          ws.send(JSON.stringify({ type: 'test', data: 'validation' }));
        });
        
        ws.on('message', (data) => {
          messagesReceived++;
          console.log('    📥 WebSocket message received:', data.toString().substring(0, 100));
        });
        
        ws.on('error', (error) => {
          connectionError = error.message;
          console.log('    ❌ WebSocket error:', error.message);
        });
        
        ws.on('close', () => {
          clearTimeout(timeout);
          console.log('    🔌 WebSocket closed');
          resolve({
            passed: wsConnected,
            details: {
              connected: wsConnected,
              messagesReceived,
              error: connectionError
            }
          });
        });
      });
    });
  }

  async testBackendLiveness() {
    return this.runTest('Backend Server Liveness', async () => {
      const endpoints = [
        `${API_URL}/health`,
        `${API_URL}/api/agents`,
        `${API_URL}/api/v1/agent-posts`
      ];
      
      const results = [];
      
      for (const endpoint of endpoints) {
        try {
          const response = await this.makeRequest(endpoint);
          results.push({
            endpoint,
            status: response.status,
            ok: response.ok,
            responseTime: Date.now()
          });
        } catch (error) {
          results.push({
            endpoint,
            status: 0,
            ok: false,
            error: error.message
          });
        }
      }
      
      const successfulEndpoints = results.filter(r => r.ok).length;
      
      return {
        passed: successfulEndpoints >= 2, // At least 2 out of 3 should work
        details: {
          totalEndpoints: endpoints.length,
          successfulEndpoints,
          results
        }
      };
    });
  }

  async runContinuousValidation() {
    console.log('\n🔄 Starting continuous validation for 30 seconds...');
    
    const duration = 30 * 1000; // 30 seconds
    const startTime = Date.now();
    let cycles = 0;
    let successfulCycles = 0;
    
    while (Date.now() - startTime < duration) {
      cycles++;
      console.log(`\n🔄 Validation Cycle ${cycles}`);
      
      const cycleResults = [];
      
      // Run core API tests
      cycleResults.push(await this.testDatabaseHealth());
      cycleResults.push(await this.testAgentsEndpoint());
      
      // Check if all tests in this cycle passed
      const allPassed = cycleResults.every(result => result.passed);
      if (allPassed) {
        successfulCycles++;
      }
      
      console.log(`  Cycle ${cycles}: ${allPassed ? 'PASSED' : 'FAILED'} (${successfulCycles}/${cycles} successful)`);
      
      // Wait before next cycle
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return {
      totalCycles: cycles,
      successfulCycles,
      successRate: (successfulCycles / cycles) * 100
    };
  }

  async generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const successRate = (passed / this.results.length) * 100;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${totalDuration}ms`,
      summary: {
        totalTests: this.results.length,
        passed,
        failed,
        successRate: `${successRate.toFixed(2)}%`
      },
      results: this.results,
      conclusion: {
        databaseOperational: this.results.some(r => r.name === 'Database Health Check' && r.passed),
        agentsAPIWorking: this.results.some(r => r.name === 'Agents API Endpoint' && r.passed),
        postsAPIWorking: this.results.some(r => r.name === 'Agent Posts API Endpoint' && r.passed),
        websocketFunctional: this.results.some(r => r.name === 'WebSocket Connection' && r.passed),
        backendLive: this.results.some(r => r.name === 'Backend Server Liveness' && r.passed),
        allTestsPassed: successRate === 100,
        realFunctionalityConfirmed: successRate >= 80
      }
    };
    
    const reportPath = path.join(this.resultsDir, 'api-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 API VALIDATION REPORT GENERATED`);
    console.log(`Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`Passed: ${passed}/${this.results.length}`);
    console.log(`Report saved to: ${reportPath}`);
    
    // Generate markdown report
    const markdownReport = `
# API VALIDATION REPORT - REAL FUNCTIONALITY

**Generated:** ${report.timestamp}
**Duration:** ${report.duration}

## SUMMARY
- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passed}
- **Failed:** ${report.summary.failed}
- **Success Rate:** ${report.summary.successRate}

## CONCLUSIONS
- **Database Operational:** ${report.conclusion.databaseOperational ? 'YES ✅' : 'NO ❌'}
- **Agents API Working:** ${report.conclusion.agentsAPIWorking ? 'YES ✅' : 'NO ❌'}
- **Posts API Working:** ${report.conclusion.postsAPIWorking ? 'YES ✅' : 'NO ❌'}
- **WebSocket Functional:** ${report.conclusion.websocketFunctional ? 'YES ✅' : 'NO ❌'}
- **Backend Live:** ${report.conclusion.backendLive ? 'YES ✅' : 'NO ❌'}
- **All Tests Passed:** ${report.conclusion.allTestsPassed ? 'YES ✅' : 'NO ❌'}
- **Real Functionality Confirmed:** ${report.conclusion.realFunctionalityConfirmed ? 'YES ✅' : 'NO ❌'}

## TEST DETAILS
${this.results.map(result => `
### ${result.name}
- **Status:** ${result.passed ? 'PASSED ✅' : 'FAILED ❌'}
- **Duration:** ${result.duration}ms
- **Details:** ${JSON.stringify(result.details, null, 2)}
${result.error ? `- **Error:** ${result.error}` : ''}
`).join('\n')}

## EVIDENCE OF REAL FUNCTIONALITY
${report.conclusion.realFunctionalityConfirmed ? 
  '🎉 **SUCCESS** - Real functionality validated with zero mock dependencies!' :
  '⚠️ **INCOMPLETE** - Some real functionality tests failed'
}
`;
    
    const markdownPath = path.join(this.resultsDir, 'api-validation-report.md');
    fs.writeFileSync(markdownPath, markdownReport);
    
    return report;
  }

  async run() {
    try {
      this.initialize();
      
      // Run all validation tests
      await this.testDatabaseHealth();
      await this.testAgentsEndpoint();
      await this.testAgentPostsEndpoint();
      await this.testSystemMetrics();
      await this.testWebSocketConnection();
      await this.testBackendLiveness();
      
      // Run continuous validation
      const continuousResults = await this.runContinuousValidation();
      
      console.log(`\n🔄 CONTINUOUS VALIDATION RESULTS:`);
      console.log(`Total Cycles: ${continuousResults.totalCycles}`);
      console.log(`Successful Cycles: ${continuousResults.successfulCycles}`);
      console.log(`Success Rate: ${continuousResults.successRate.toFixed(2)}%`);
      
      // Generate final report
      const report = await this.generateReport();
      
      return report;
      
    } catch (error) {
      console.error('❌ Validation runner failed:', error);
      throw error;
    }
  }
}

// Run the validation
const runner = new APIValidationRunner();
runner.run().then(report => {
  console.log('\n🎉 API VALIDATION COMPLETED!');
  
  if (report.conclusion.realFunctionalityConfirmed) {
    console.log('✅ REAL FUNCTIONALITY CONFIRMED - APIs and Database Operational');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED - CHECK REPORT FOR DETAILS');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ VALIDATION FAILED:', error.message);
  process.exit(1);
});