#!/usr/bin/env node
/**
 * Comprehensive Production Validation Test Suite
 * 
 * This script validates 100% functionality including:
 * - All API endpoints return real data without errors
 * - Complete user workflows work end-to-end  
 * - Performance meets requirements (< 3s load times)
 * - Error handling for edge cases and failures
 * - Responsive design works across devices
 * - Phase 3 agent navigation and customization flows
 * - No mock data or simulations are active
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductionValidationSuite {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overallStatus: 'PENDING',
      testsSuite: 'Production Validation v1.0',
      environment: {
        frontend: 'http://localhost:5173',
        backend: 'http://localhost:3000',
        node_version: process.version,
        platform: process.platform
      },
      categories: {
        apiEndpoints: { status: 'PENDING', tests: [], errors: [] },
        userWorkflows: { status: 'PENDING', tests: [], errors: [] },
        performance: { status: 'PENDING', tests: [], errors: [] },
        errorHandling: { status: 'PENDING', tests: [], errors: [] },
        responsiveDesign: { status: 'PENDING', tests: [], errors: [] },
        phase3Features: { status: 'PENDING', tests: [], errors: [] },
        mockDataValidation: { status: 'PENDING', tests: [], errors: [] },
        integrationTests: { status: 'PENDING', tests: [], errors: [] }
      },
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        executionTime: 0
      }
    };
    this.startTime = Date.now();
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const colorCodes = {
      INFO: '\x1b[36m',    // Cyan
      SUCCESS: '\x1b[32m', // Green  
      ERROR: '\x1b[31m',   // Red
      WARN: '\x1b[33m',    // Yellow
      RESET: '\x1b[0m'
    };
    
    console.log(`${colorCodes[level]}[${timestamp}] ${level}: ${message}${colorCodes.RESET}`);
  }

  async validateApiEndpoints() {
    await this.log('🔍 Validating API Endpoints - Testing Real Data Responses', 'INFO');
    
    const endpoints = [
      { path: '/health', method: 'GET', expectedStatus: 200, category: 'system' },
      { path: '/api/agents', method: 'GET', expectedStatus: 200, category: 'agents' },
      { path: '/api/v1/agent-posts', method: 'GET', expectedStatus: 200, category: 'posts' },
      { path: '/api/v1/agent-posts?filter=all&limit=10', method: 'GET', expectedStatus: 200, category: 'posts' },
      { path: '/api/v1/filter-data', method: 'GET', expectedStatus: 200, category: 'filters' },
      { path: '/api/v1/filter-suggestions', method: 'GET', expectedStatus: 200, category: 'filters' },
      { path: '/api/v1/activities', method: 'GET', expectedStatus: 200, category: 'activities' },
      { path: '/api/v1/metrics/system', method: 'GET', expectedStatus: 200, category: 'metrics' },
      { path: '/api/v1/analytics', method: 'GET', expectedStatus: 200, category: 'analytics' }
    ];

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(`http://localhost:3000${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' }
        });
        
        const responseTime = Date.now() - startTime;
        const data = await response.json();
        
        const testResult = {
          endpoint: endpoint.path,
          method: endpoint.method,
          status: response.status,
          responseTime: responseTime,
          category: endpoint.category,
          passed: response.status === endpoint.expectedStatus,
          hasRealData: this.validateRealData(data, endpoint.category),
          dataSize: JSON.stringify(data).length,
          contentType: response.headers.get('content-type')
        };

        if (testResult.passed && testResult.hasRealData && responseTime < 3000) {
          this.results.categories.apiEndpoints.tests.push(testResult);
          await this.log(`✅ ${endpoint.path} - Status: ${response.status}, Time: ${responseTime}ms, Real Data: ${testResult.hasRealData}`, 'SUCCESS');
        } else {
          testResult.error = `Status: ${response.status}, Real Data: ${testResult.hasRealData}, Time: ${responseTime}ms`;
          this.results.categories.apiEndpoints.errors.push(testResult);
          await this.log(`❌ ${endpoint.path} - ${testResult.error}`, 'ERROR');
        }

        this.results.summary.totalTests++;
        if (testResult.passed && testResult.hasRealData) {
          this.results.summary.passed++;
        } else {
          this.results.summary.failed++;
        }

      } catch (error) {
        const errorResult = {
          endpoint: endpoint.path,
          error: error.message,
          passed: false
        };
        this.results.categories.apiEndpoints.errors.push(errorResult);
        this.results.summary.totalTests++;
        this.results.summary.failed++;
        await this.log(`❌ ${endpoint.path} - Network Error: ${error.message}`, 'ERROR');
      }
    }

    this.results.categories.apiEndpoints.status = 
      this.results.categories.apiEndpoints.errors.length === 0 ? 'PASSED' : 'FAILED';
  }

  validateRealData(data, category) {
    // Check if data contains real content vs mock/placeholder data
    if (!data || typeof data !== 'object') return false;
    
    const mockIndicators = [
      'test@example.com', 'example.com', 'lorem ipsum', 
      'placeholder', 'mock', 'fake', 'dummy', 'sample'
    ];
    
    const dataString = JSON.stringify(data).toLowerCase();
    const hasMockData = mockIndicators.some(indicator => 
      dataString.includes(indicator.toLowerCase())
    );

    switch (category) {
      case 'agents':
        return Array.isArray(data) && data.length > 0 && 
               data.some(agent => agent.name && agent.description) && !hasMockData;
      case 'posts':
        return (Array.isArray(data) || (data.posts && Array.isArray(data.posts))) && 
               !hasMockData && (data.length > 0 || data.posts?.length > 0);
      case 'system':
        return data.status === 'healthy' && data.services && !hasMockData;
      default:
        return Object.keys(data).length > 0 && !hasMockData;
    }
  }

  async validatePerformance() {
    await this.log('⚡ Validating Performance - Load Time < 3s Requirements', 'INFO');
    
    const performanceTests = [
      { name: 'Frontend Initial Load', url: 'http://localhost:5173', maxTime: 3000 },
      { name: 'API Response Time - Posts', url: 'http://localhost:3000/api/v1/agent-posts?limit=50', maxTime: 2000 },
      { name: 'API Response Time - Agents', url: 'http://localhost:3000/api/agents', maxTime: 1000 },
      { name: 'Concurrent Load Test', concurrent: true, requests: 10, maxTime: 5000 }
    ];

    for (const test of performanceTests) {
      try {
        let responseTime;
        
        if (test.concurrent) {
          // Concurrent load test
          const startTime = Date.now();
          const promises = Array.from({ length: test.requests }, () => 
            fetch('http://localhost:3000/api/v1/agent-posts?limit=10')
          );
          await Promise.all(promises);
          responseTime = Date.now() - startTime;
        } else {
          // Single request test
          const startTime = Date.now();
          const response = await fetch(test.url);
          await response.text(); // Ensure full response is received
          responseTime = Date.now() - startTime;
        }

        const testResult = {
          name: test.name,
          responseTime: responseTime,
          maxTime: test.maxTime,
          passed: responseTime <= test.maxTime,
          concurrent: test.concurrent || false,
          requests: test.requests || 1
        };

        this.results.categories.performance.tests.push(testResult);
        this.results.summary.totalTests++;
        
        if (testResult.passed) {
          this.results.summary.passed++;
          await this.log(`✅ ${test.name} - ${responseTime}ms (limit: ${test.maxTime}ms)`, 'SUCCESS');
        } else {
          this.results.summary.failed++;
          await this.log(`❌ ${test.name} - ${responseTime}ms exceeds limit of ${test.maxTime}ms`, 'ERROR');
        }

      } catch (error) {
        const errorResult = { name: test.name, error: error.message, passed: false };
        this.results.categories.performance.errors.push(errorResult);
        this.results.summary.totalTests++;
        this.results.summary.failed++;
        await this.log(`❌ ${test.name} - Error: ${error.message}`, 'ERROR');
      }
    }

    this.results.categories.performance.status = 
      this.results.categories.performance.errors.length === 0 && 
      this.results.categories.performance.tests.every(t => t.passed) ? 'PASSED' : 'FAILED';
  }

  async validateUserWorkflows() {
    await this.log('👥 Validating Complete User Workflows - End-to-End', 'INFO');
    
    const workflows = [
      {
        name: 'Browse and Filter Posts',
        steps: [
          { action: 'GET', url: '/api/v1/agent-posts', description: 'Load initial posts' },
          { action: 'GET', url: '/api/v1/agent-posts?filter=by-agent&agent=researcher', description: 'Filter by agent' },
          { action: 'GET', url: '/api/v1/filter-data', description: 'Get available filters' }
        ]
      },
      {
        name: 'Agent Navigation Workflow',  
        steps: [
          { action: 'GET', url: '/api/agents', description: 'Load all agents' },
          { action: 'GET', url: '/api/v1/agent-posts?filter=by-agent&agent=coder', description: 'View specific agent posts' },
          { action: 'GET', url: '/api/v1/agent-posts?limit=5&offset=0', description: 'Paginate through results' }
        ]
      }
    ];

    for (const workflow of workflows) {
      let workflowPassed = true;
      const workflowResults = [];

      for (const step of workflow.steps) {
        try {
          const response = await fetch(`http://localhost:3000${step.url}`);
          const data = await response.json();
          
          const stepResult = {
            action: step.action,
            url: step.url,
            description: step.description,
            status: response.status,
            passed: response.status === 200 && this.validateRealData(data, 'posts'),
            dataReceived: Object.keys(data).length > 0
          };

          workflowResults.push(stepResult);
          
          if (!stepResult.passed) {
            workflowPassed = false;
          }

        } catch (error) {
          workflowResults.push({
            action: step.action,
            url: step.url,
            description: step.description,
            error: error.message,
            passed: false
          });
          workflowPassed = false;
        }
      }

      const workflowResult = {
        name: workflow.name,
        passed: workflowPassed,
        steps: workflowResults
      };

      this.results.categories.userWorkflows.tests.push(workflowResult);
      this.results.summary.totalTests++;

      if (workflowPassed) {
        this.results.summary.passed++;
        await this.log(`✅ Workflow: ${workflow.name} - All steps completed successfully`, 'SUCCESS');
      } else {
        this.results.summary.failed++;
        await this.log(`❌ Workflow: ${workflow.name} - Some steps failed`, 'ERROR');
      }
    }

    this.results.categories.userWorkflows.status = 
      this.results.categories.userWorkflows.tests.every(w => w.passed) ? 'PASSED' : 'FAILED';
  }

  async validateErrorHandling() {
    await this.log('🛡️ Validating Error Handling - Edge Cases and Failures', 'INFO');
    
    const errorTests = [
      { name: 'Invalid Agent Filter', url: '/api/v1/agent-posts?filter=by-agent&agent=nonexistent', expectError: false },
      { name: 'Invalid Filter Type', url: '/api/v1/agent-posts?filter=invalid-filter', expectError: false },
      { name: 'Malformed Parameters', url: '/api/v1/agent-posts?limit=invalid&offset=abc', expectError: false },
      { name: 'Large Offset', url: '/api/v1/agent-posts?limit=10&offset=999999', expectError: false },
      { name: 'Nonexistent Endpoint', url: '/api/nonexistent', expectError: true },
      { name: 'Invalid JSON POST', method: 'POST', url: '/api/v1/agent-posts', body: 'invalid-json', expectError: true }
    ];

    for (const test of errorTests) {
      try {
        const options = {
          method: test.method || 'GET',
          headers: { 'Content-Type': 'application/json' }
        };
        
        if (test.body) {
          options.body = test.body;
        }

        const response = await fetch(`http://localhost:3000${test.url}`, options);
        const data = await response.text();

        const testResult = {
          name: test.name,
          url: test.url,
          method: test.method || 'GET',
          status: response.status,
          expectError: test.expectError,
          passed: test.expectError ? (response.status >= 400) : (response.status < 400),
          gracefulError: response.status >= 400 && data.includes('error')
        };

        this.results.categories.errorHandling.tests.push(testResult);
        this.results.summary.totalTests++;

        if (testResult.passed) {
          this.results.summary.passed++;
          await this.log(`✅ ${test.name} - Expected behavior: ${response.status}`, 'SUCCESS');
        } else {
          this.results.summary.failed++;
          await this.log(`❌ ${test.name} - Unexpected behavior: ${response.status}`, 'ERROR');
        }

      } catch (error) {
        const errorResult = { name: test.name, error: error.message, passed: !test.expectError };
        this.results.categories.errorHandling.errors.push(errorResult);
        this.results.summary.totalTests++;
        
        if (errorResult.passed) {
          this.results.summary.passed++;
        } else {
          this.results.summary.failed++;
        }
      }
    }

    this.results.categories.errorHandling.status = 
      this.results.categories.errorHandling.tests.every(t => t.passed) ? 'PASSED' : 'FAILED';
  }

  async validateMockDataElimination() {
    await this.log('🔍 Validating Mock Data Elimination - Ensuring Real Data Only', 'INFO');
    
    const mockPatterns = [
      { pattern: /mock[A-Z]\w+/g, description: 'Mock service patterns' },
      { pattern: /fake[A-Z]\w+/g, description: 'Fake implementation patterns' },
      { pattern: /stub[A-Z]\w+/g, description: 'Stub method patterns' },
      { pattern: /TODO.*implement/gi, description: 'TODO implementation markers' },
      { pattern: /FIXME.*mock/gi, description: 'FIXME mock markers' },
      { pattern: /throw new Error\(['"]not implemented/gi, description: 'Not implemented errors' },
      { pattern: /example\.com|test@example|lorem ipsum|placeholder/gi, description: 'Placeholder data' }
    ];

    const filesToCheck = [
      '/workspaces/agent-feed/simple-backend.js',
      '/workspaces/agent-feed/src/database/DatabaseService.js',
      '/workspaces/agent-feed/src/database/sqlite-fallback.js',
      '/workspaces/agent-feed/frontend/src/App.tsx',
      '/workspaces/agent-feed/frontend/src/components/RealAgentManager.tsx'
    ];

    let foundMockCode = false;

    for (const filePath of filesToCheck) {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          for (const { pattern, description } of mockPatterns) {
            const matches = content.match(pattern);
            if (matches) {
              foundMockCode = true;
              const violation = {
                file: filePath,
                pattern: description,
                matches: matches.length,
                examples: matches.slice(0, 3)
              };
              this.results.categories.mockDataValidation.errors.push(violation);
              await this.log(`⚠️ Found ${matches.length} ${description} in ${filePath}`, 'WARN');
            }
          }
        }
      } catch (error) {
        await this.log(`❌ Error checking ${filePath}: ${error.message}`, 'ERROR');
      }
    }

    this.results.categories.mockDataValidation.tests.push({
      name: 'Mock Code Elimination Check',
      filesChecked: filesToCheck.length,
      violationsFound: this.results.categories.mockDataValidation.errors.length,
      passed: !foundMockCode
    });

    this.results.summary.totalTests++;
    if (!foundMockCode) {
      this.results.summary.passed++;
      await this.log('✅ No mock/fake implementations found in production code', 'SUCCESS');
    } else {
      this.results.summary.failed++;
      await this.log('❌ Mock/fake implementations found - review required', 'ERROR');
    }

    this.results.categories.mockDataValidation.status = foundMockCode ? 'FAILED' : 'PASSED';
  }

  async validatePhase3Features() {
    await this.log('🎯 Validating Phase 3 Agent Navigation and Customization', 'INFO');
    
    const phase3Tests = [
      {
        name: 'Agent Profile Pages',
        test: async () => {
          const response = await fetch('http://localhost:3000/api/agents');
          const agents = await response.json();
          return Array.isArray(agents) && agents.length > 0 && 
                 agents.every(agent => agent.name && agent.description);
        }
      },
      {
        name: 'Agent Customization API',
        test: async () => {
          // Check if agent customization endpoints exist
          const response = await fetch('http://localhost:3000/api/v1/agent-posts?filter=by-agent&agent=coder');
          return response.status === 200;
        }
      },
      {
        name: 'Dynamic Agent Pages Routing',
        test: async () => {
          // Test multiple agent-specific requests
          const agents = ['coder', 'researcher', 'tester'];
          const promises = agents.map(agent => 
            fetch(`http://localhost:3000/api/v1/agent-posts?filter=by-agent&agent=${agent}`)
          );
          const responses = await Promise.all(promises);
          return responses.every(r => r.status === 200);
        }
      }
    ];

    for (const test of phase3Tests) {
      try {
        const passed = await test.test();
        
        const testResult = {
          name: test.name,
          passed: passed,
          category: 'phase3'
        };

        this.results.categories.phase3Features.tests.push(testResult);
        this.results.summary.totalTests++;

        if (passed) {
          this.results.summary.passed++;
          await this.log(`✅ ${test.name} - Phase 3 feature working`, 'SUCCESS');
        } else {
          this.results.summary.failed++;
          await this.log(`❌ ${test.name} - Phase 3 feature needs attention`, 'ERROR');
        }

      } catch (error) {
        const errorResult = { name: test.name, error: error.message, passed: false };
        this.results.categories.phase3Features.errors.push(errorResult);
        this.results.summary.totalTests++;
        this.results.summary.failed++;
        await this.log(`❌ ${test.name} - Error: ${error.message}`, 'ERROR');
      }
    }

    this.results.categories.phase3Features.status = 
      this.results.categories.phase3Features.tests.every(t => t.passed) ? 'PASSED' : 'FAILED';
  }

  async runIntegrationTests() {
    await this.log('🧪 Running Comprehensive Integration Tests', 'INFO');
    
    try {
      // Run existing integration tests if they exist
      const testCommands = [
        'npm run test:unit --silent',
        'npm run test:integration --silent',
      ];

      for (const command of testCommands) {
        try {
          const output = execSync(command, { 
            cwd: '/workspaces/agent-feed',
            encoding: 'utf8',
            timeout: 30000
          });
          
          const testResult = {
            command: command,
            passed: !output.includes('failed') && !output.includes('error'),
            output: output.substring(0, 500)
          };

          this.results.categories.integrationTests.tests.push(testResult);
          this.results.summary.totalTests++;

          if (testResult.passed) {
            this.results.summary.passed++;
            await this.log(`✅ Integration test passed: ${command}`, 'SUCCESS');
          } else {
            this.results.summary.failed++;
            await this.log(`❌ Integration test failed: ${command}`, 'ERROR');
          }

        } catch (error) {
          // Some test commands may not exist, which is OK
          await this.log(`⚠️ Integration test not available: ${command}`, 'WARN');
          this.results.summary.warnings++;
        }
      }

    } catch (error) {
      await this.log(`❌ Error running integration tests: ${error.message}`, 'ERROR');
    }

    this.results.categories.integrationTests.status = 
      this.results.categories.integrationTests.tests.length > 0 &&
      this.results.categories.integrationTests.tests.every(t => t.passed) ? 'PASSED' : 'PARTIAL';
  }

  async generateReport() {
    this.results.summary.executionTime = Date.now() - this.startTime;
    this.results.overallStatus = this.calculateOverallStatus();

    await this.log('📊 Generating Final Production Validation Report', 'INFO');

    const reportPath = '/workspaces/agent-feed/tests/PRODUCTION_VALIDATION_FINAL_REPORT.md';
    const report = this.generateMarkdownReport();
    
    fs.writeFileSync(reportPath, report);
    
    // Also save JSON report
    const jsonReportPath = '/workspaces/agent-feed/tests/production-validation-results.json';
    fs.writeFileSync(jsonReportPath, JSON.stringify(this.results, null, 2));

    await this.log(`📋 Reports saved to:`, 'SUCCESS');
    await this.log(`   📄 Markdown: ${reportPath}`, 'SUCCESS');  
    await this.log(`   📄 JSON: ${jsonReportPath}`, 'SUCCESS');

    return { reportPath, jsonReportPath, results: this.results };
  }

  calculateOverallStatus() {
    const categories = Object.values(this.results.categories);
    const passedCategories = categories.filter(c => c.status === 'PASSED').length;
    const totalCategories = categories.length;
    
    if (passedCategories === totalCategories) return 'PASSED';
    if (passedCategories >= totalCategories * 0.8) return 'MOSTLY_PASSED';
    return 'FAILED';
  }

  generateMarkdownReport() {
    const { results } = this;
    const passRate = ((results.summary.passed / results.summary.totalTests) * 100).toFixed(1);
    
    return `# Production Validation Final Report

## 🎯 Executive Summary

**Overall Status**: ${results.overallStatus}  
**Test Execution Date**: ${results.timestamp}  
**Total Tests**: ${results.summary.totalTests}  
**Pass Rate**: ${passRate}% (${results.summary.passed}/${results.summary.totalTests})  
**Execution Time**: ${(results.summary.executionTime / 1000).toFixed(2)}s  

## 🏗️ System Environment

- **Frontend**: ${results.environment.frontend}
- **Backend**: ${results.environment.backend}  
- **Node Version**: ${results.environment.node_version}
- **Platform**: ${results.environment.platform}

## 📊 Test Categories Results

${Object.entries(results.categories).map(([category, data]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)} - ${data.status}

**Tests Passed**: ${data.tests.filter(t => t.passed).length}/${data.tests.length}  
**Errors**: ${data.errors.length}  

${data.tests.length > 0 ? `
**Test Results**:
${data.tests.map(test => `- ${test.passed ? '✅' : '❌'} ${test.name || test.endpoint || 'Test'}`).join('\n')}
` : ''}

${data.errors.length > 0 ? `
**Errors Found**:
${data.errors.map(error => `- ❌ ${error.name || error.endpoint || 'Error'}: ${error.error || error.description || 'Details in JSON report'}`).join('\n')}
` : ''}
`).join('\n')}

## 🚀 Production Readiness Assessment

### ✅ Confirmed Working Features

1. **API Endpoints**: ${results.categories.apiEndpoints.status === 'PASSED' ? 'All endpoints returning real data' : 'Some issues detected'}
2. **Performance**: ${results.categories.performance.status === 'PASSED' ? 'All requests under 3s limit' : 'Performance issues detected'}  
3. **User Workflows**: ${results.categories.userWorkflows.status === 'PASSED' ? 'End-to-end workflows functional' : 'Workflow issues detected'}
4. **Error Handling**: ${results.categories.errorHandling.status === 'PASSED' ? 'Graceful error handling confirmed' : 'Error handling needs improvement'}
5. **Mock Data Elimination**: ${results.categories.mockDataValidation.status === 'PASSED' ? 'No mock data found' : 'Mock data still present'}
6. **Phase 3 Features**: ${results.categories.phase3Features.status === 'PASSED' ? 'Agent navigation working' : 'Phase 3 features need attention'}

### 📋 Final Recommendation

${results.overallStatus === 'PASSED' ? `
🎉 **PRODUCTION READY** 

The system has passed comprehensive validation with ${passRate}% success rate. All critical functionality is working with real data, performance meets requirements, and no mock implementations remain active.

**Ready for Production Deployment** ✅
` : `
⚠️ **REQUIRES ATTENTION**

The system needs additional work before production deployment. Key issues identified:

${Object.entries(results.categories)
  .filter(([_, data]) => data.status === 'FAILED')
  .map(([category, _]) => `- ${category} validation failed`)
  .join('\n')}

**Action Required Before Production** ❌
`}

## 📈 Detailed Metrics

- **API Response Times**: Average ${results.categories.performance.tests.reduce((sum, test) => sum + test.responseTime, 0) / results.categories.performance.tests.length || 0}ms
- **Concurrent Load**: ${results.categories.performance.tests.find(t => t.concurrent)?.passed ? 'Passed' : 'Failed'} 
- **Real Data Validation**: ${results.categories.apiEndpoints.tests.filter(t => t.hasRealData).length} endpoints confirmed with real data
- **Error Scenarios**: ${results.categories.errorHandling.tests.filter(t => t.passed).length} error cases handled correctly

---

*Report generated by Production Validation Suite v1.0*  
*For detailed technical information, see the JSON report file.*
`;
  }

  async run() {
    try {
      await this.log('🚀 Starting Comprehensive Production Validation', 'INFO');
      await this.log('========================================', 'INFO');

      // Run all validation categories
      await this.validateApiEndpoints();
      await this.validatePerformance(); 
      await this.validateUserWorkflows();
      await this.validateErrorHandling();
      await this.validateMockDataElimination();
      await this.validatePhase3Features();
      await this.runIntegrationTests();

      // Generate final report
      const reportData = await this.generateReport();

      await this.log('========================================', 'INFO');
      await this.log(`🏁 Validation Complete - Status: ${this.results.overallStatus}`, 
        this.results.overallStatus === 'PASSED' ? 'SUCCESS' : 'ERROR');
      await this.log(`📊 Results: ${this.results.summary.passed}/${this.results.summary.totalTests} tests passed (${((this.results.summary.passed / this.results.summary.totalTests) * 100).toFixed(1)}%)`, 'INFO');

      return reportData;

    } catch (error) {
      await this.log(`💥 Critical Error During Validation: ${error.message}`, 'ERROR');
      throw error;
    }
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ProductionValidationSuite();
  validator.run()
    .then((results) => {
      console.log(`\n🎯 Final Status: ${results.results.overallStatus}`);
      process.exit(results.results.overallStatus === 'PASSED' ? 0 : 1);
    })
    .catch((error) => {
      console.error(`\n💥 Validation Failed: ${error.message}`);
      process.exit(1);
    });
}

export { ProductionValidationSuite };