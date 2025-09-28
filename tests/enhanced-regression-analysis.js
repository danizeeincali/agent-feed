/**
 * Enhanced Regression Analysis
 * Deep dive analysis of API endpoints, mock data patterns, and system integrity
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedRegressionAnalyzer {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.analysis = {
      apiEndpoints: {
        tested: 0,
        working: 0,
        failing: 0,
        details: []
      },
      mockDataAnalysis: {
        endpoints: [],
        suspiciousContent: [],
        validationResults: []
      },
      dataTransformation: {
        verified: [],
        issues: []
      },
      errorHandling: {
        tested: 0,
        properlyHandled: 0,
        details: []
      },
      edgeCases: {
        tested: 0,
        handled: 0,
        vulnerabilities: []
      }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    return logMessage;
  }

  async testEndpoint(endpoint, method = 'GET', body = null, expectedStatus = null) {
    try {
      this.analysis.apiEndpoints.tested++;

      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const responseText = await response.text();

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      const isWorking = response.status >= 200 && response.status < 400;
      if (isWorking) {
        this.analysis.apiEndpoints.working++;
      } else {
        this.analysis.apiEndpoints.failing++;
      }

      const endpointInfo = {
        endpoint,
        method,
        status: response.status,
        working: isWorking,
        responseType: typeof responseData,
        dataStructure: this.analyzeDataStructure(responseData),
        timestamp: new Date().toISOString()
      };

      this.analysis.apiEndpoints.details.push(endpointInfo);

      return {
        success: isWorking,
        status: response.status,
        data: responseData,
        response
      };
    } catch (error) {
      this.analysis.apiEndpoints.failing++;
      this.log(`Error testing ${endpoint}: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  analyzeDataStructure(data) {
    if (!data || typeof data !== 'object') {
      return { type: typeof data, structure: 'primitive' };
    }

    const keys = Object.keys(data);
    const analysis = {
      type: Array.isArray(data) ? 'array' : 'object',
      keyCount: keys.length,
      hasSuccess: keys.includes('success'),
      hasData: keys.includes('data'),
      hasError: keys.includes('error'),
      hasPagination: keys.includes('pagination'),
      hasTimestamp: keys.includes('timestamp')
    };

    if (Array.isArray(data)) {
      analysis.itemCount = data.length;
      analysis.firstItemKeys = data.length > 0 ? Object.keys(data[0] || {}) : [];
    }

    return analysis;
  }

  async analyzeMockDataLeakage(endpoint, data) {
    const mockIndicators = [
      { pattern: /mock/gi, severity: 'high', description: 'Mock indicator' },
      { pattern: /fake/gi, severity: 'high', description: 'Fake data indicator' },
      { pattern: /test.*data/gi, severity: 'medium', description: 'Test data pattern' },
      { pattern: /sample/gi, severity: 'low', description: 'Sample data' },
      { pattern: /dummy/gi, severity: 'high', description: 'Dummy data' },
      { pattern: /placeholder/gi, severity: 'medium', description: 'Placeholder content' },
      { pattern: /lorem ipsum/gi, severity: 'low', description: 'Lorem ipsum text' },
      { pattern: /john doe|jane doe/gi, severity: 'medium', description: 'Generic names' },
      { pattern: /foo|bar|baz/gi, severity: 'low', description: 'Generic variables' },
      { pattern: /example\.com/gi, severity: 'low', description: 'Example domain' },
      { pattern: /test@test\.com/gi, severity: 'medium', description: 'Test email' }
    ];

    const jsonString = JSON.stringify(data);
    const foundPatterns = [];

    for (const indicator of mockIndicators) {
      const matches = jsonString.match(indicator.pattern);
      if (matches) {
        foundPatterns.push({
          pattern: indicator.pattern.source,
          severity: indicator.severity,
          description: indicator.description,
          count: matches.length,
          examples: matches.slice(0, 3) // First 3 examples
        });
      }
    }

    const analysis = {
      endpoint,
      hasMockData: foundPatterns.length > 0,
      mockPatterns: foundPatterns,
      severity: this.calculateMockSeverity(foundPatterns),
      recommendation: this.getMockDataRecommendation(foundPatterns)
    };

    this.analysis.mockDataAnalysis.endpoints.push(analysis);

    return analysis;
  }

  calculateMockSeverity(patterns) {
    if (patterns.length === 0) return 'none';
    if (patterns.some(p => p.severity === 'high')) return 'high';
    if (patterns.some(p => p.severity === 'medium')) return 'medium';
    return 'low';
  }

  getMockDataRecommendation(patterns) {
    if (patterns.length === 0) {
      return 'No mock data detected - system appears to be using real data';
    }

    const highSeverity = patterns.filter(p => p.severity === 'high');
    if (highSeverity.length > 0) {
      return 'CRITICAL: High-confidence mock data detected. Immediate cleanup required.';
    }

    const mediumSeverity = patterns.filter(p => p.severity === 'medium');
    if (mediumSeverity.length > 0) {
      return 'WARNING: Potential mock data detected. Review and verify authenticity.';
    }

    return 'LOW PRIORITY: Minor test artifacts detected. Consider cleanup for production.';
  }

  async testErrorHandling(endpoint, invalidPayloads) {
    const results = [];

    for (const payload of invalidPayloads) {
      try {
        this.analysis.errorHandling.tested++;

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload.data)
        });

        const responseData = await response.text();
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(responseData);
        } catch {
          parsedResponse = responseData;
        }

        const hasProperErrorHandling = (
          response.status >= 400 && response.status < 500 &&
          (parsedResponse.error || parsedResponse.message || responseData.includes('error'))
        );

        if (hasProperErrorHandling) {
          this.analysis.errorHandling.properlyHandled++;
        }

        const result = {
          testName: payload.name,
          payload: payload.data,
          status: response.status,
          hasProperErrorHandling,
          response: parsedResponse,
          recommendation: hasProperErrorHandling ?
            'Good error handling' :
            'Improve error handling - should return 4xx with error message'
        };

        results.push(result);
        this.analysis.errorHandling.details.push(result);

      } catch (error) {
        results.push({
          testName: payload.name,
          payload: payload.data,
          error: error.message,
          hasProperErrorHandling: false,
          recommendation: 'Fix endpoint error - request failed entirely'
        });
      }
    }

    return results;
  }

  async testEdgeCases() {
    const edgeCases = [
      {
        name: 'SQL Injection in Agent Posts',
        endpoint: '/api/v1/agent-posts',
        payload: { title: "'; DROP TABLE agents; --", content: "test" },
        expectedBehavior: 'Should sanitize input and reject malicious SQL'
      },
      {
        name: 'XSS in Agent Posts',
        endpoint: '/api/v1/agent-posts',
        payload: { title: "<script>alert('xss')</script>", content: "test" },
        expectedBehavior: 'Should escape or reject script tags'
      },
      {
        name: 'Large Payload',
        endpoint: '/api/v1/agent-posts',
        payload: { title: "Test", content: "x".repeat(100000) },
        expectedBehavior: 'Should handle or reject oversized payloads'
      },
      {
        name: 'Invalid JSON Structure',
        endpoint: '/api/v1/agent-posts',
        payload: { invalidField: true, missing: "required_fields" },
        expectedBehavior: 'Should validate required fields'
      }
    ];

    const results = [];

    for (const testCase of edgeCases) {
      try {
        this.analysis.edgeCases.tested++;

        const response = await fetch(`${this.baseUrl}${testCase.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testCase.payload)
        });

        const responseData = await response.text();
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(responseData);
        } catch {
          parsedResponse = responseData;
        }

        const isHandledProperly = response.status >= 400 && response.status < 500;
        if (isHandledProperly) {
          this.analysis.edgeCases.handled++;
        }

        const vulnerability = !isHandledProperly && (
          testCase.name.includes('SQL') || testCase.name.includes('XSS')
        );

        if (vulnerability) {
          this.analysis.edgeCases.vulnerabilities.push({
            type: testCase.name,
            severity: 'high',
            description: `Potential ${testCase.name} vulnerability detected`,
            recommendation: 'Implement input validation and sanitization'
          });
        }

        results.push({
          testName: testCase.name,
          endpoint: testCase.endpoint,
          expectedBehavior: testCase.expectedBehavior,
          actualStatus: response.status,
          handledProperly: isHandledProperly,
          vulnerability,
          response: parsedResponse
        });

      } catch (error) {
        results.push({
          testName: testCase.name,
          error: error.message,
          handledProperly: false,
          vulnerability: false
        });
      }
    }

    return results;
  }

  async runComprehensiveAnalysis() {
    this.log('Starting Enhanced Regression Analysis', 'start');

    // 1. Test Core API Endpoints
    this.log('=== Testing Core API Endpoints ===');

    const coreEndpoints = [
      '/health',
      '/api/agents',
      '/api/activities',
      '/api/v1/agent-posts',
      '/api/agent-posts',
      '/api/filter-data',
      '/api/filter-suggestions'
    ];

    for (const endpoint of coreEndpoints) {
      const result = await this.testEndpoint(endpoint);
      if (result.success && result.data) {
        await this.analyzeMockDataLeakage(endpoint, result.data);
      }
    }

    // 2. Test Error Handling
    this.log('=== Testing Error Handling ===');

    const invalidPayloads = [
      { name: 'Empty Object', data: {} },
      { name: 'Invalid Structure', data: { invalid: 'structure' } },
      { name: 'Missing Required Fields', data: { title: 'test' } },
      { name: 'Wrong Data Types', data: { title: 123, content: true } }
    ];

    await this.testErrorHandling('/api/v1/agent-posts', invalidPayloads);

    // 3. Test Edge Cases and Security
    this.log('=== Testing Edge Cases and Security ===');

    await this.testEdgeCases();

    // 4. Generate Report
    this.log('=== Generating Enhanced Analysis Report ===');
    await this.generateEnhancedReport();

    return this.analysis;
  }

  async generateEnhancedReport() {
    const report = {
      executionTimestamp: new Date().toISOString(),
      summary: {
        totalApiEndpoints: this.analysis.apiEndpoints.tested,
        workingEndpoints: this.analysis.apiEndpoints.working,
        failingEndpoints: this.analysis.apiEndpoints.failing,
        endpointHealthScore: ((this.analysis.apiEndpoints.working / this.analysis.apiEndpoints.tested) * 100).toFixed(1) + '%',
        mockDataEndpoints: this.analysis.mockDataAnalysis.endpoints.length,
        endpointsWithMockData: this.analysis.mockDataAnalysis.endpoints.filter(e => e.hasMockData).length,
        errorHandlingTests: this.analysis.errorHandling.tested,
        properErrorHandling: this.analysis.errorHandling.properlyHandled,
        errorHandlingScore: ((this.analysis.errorHandling.properlyHandled / this.analysis.errorHandling.tested) * 100).toFixed(1) + '%',
        edgeCaseTests: this.analysis.edgeCases.tested,
        edgeCasesHandled: this.analysis.edgeCases.handled,
        securityVulnerabilities: this.analysis.edgeCases.vulnerabilities.length
      },
      findings: {
        criticalIssues: this.getCriticalIssues(),
        mockDataFindings: this.analysis.mockDataAnalysis.endpoints,
        securityFindings: this.analysis.edgeCases.vulnerabilities,
        recommendedActions: this.getRecommendedActions()
      },
      detailedAnalysis: this.analysis
    };

    // Save detailed report
    const reportPath = path.join(__dirname, 'enhanced-regression-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate summary
    this.generateSummary(report);

    this.log(`Enhanced analysis report saved to: ${reportPath}`);
    return report;
  }

  getCriticalIssues() {
    const issues = [];

    // Check for high-severity mock data
    const highSeverityMockData = this.analysis.mockDataAnalysis.endpoints.filter(
      e => e.severity === 'high'
    );
    if (highSeverityMockData.length > 0) {
      issues.push({
        type: 'mock_data',
        severity: 'high',
        description: `${highSeverityMockData.length} endpoints contain high-confidence mock data`,
        endpoints: highSeverityMockData.map(e => e.endpoint)
      });
    }

    // Check for security vulnerabilities
    if (this.analysis.edgeCases.vulnerabilities.length > 0) {
      issues.push({
        type: 'security',
        severity: 'high',
        description: `${this.analysis.edgeCases.vulnerabilities.length} potential security vulnerabilities detected`,
        vulnerabilities: this.analysis.edgeCases.vulnerabilities
      });
    }

    // Check for poor error handling
    const errorHandlingRate = this.analysis.errorHandling.properlyHandled / this.analysis.errorHandling.tested;
    if (errorHandlingRate < 0.7) {
      issues.push({
        type: 'error_handling',
        severity: 'medium',
        description: `Poor error handling rate: ${(errorHandlingRate * 100).toFixed(1)}%`,
        recommendation: 'Improve error handling for invalid requests'
      });
    }

    return issues;
  }

  getRecommendedActions() {
    const actions = [];

    // Mock data cleanup
    const mockDataEndpoints = this.analysis.mockDataAnalysis.endpoints.filter(e => e.hasMockData);
    if (mockDataEndpoints.length > 0) {
      actions.push({
        priority: 'high',
        action: 'Clean up mock data',
        description: `Remove mock data patterns from ${mockDataEndpoints.length} endpoints`,
        endpoints: mockDataEndpoints.map(e => e.endpoint)
      });
    }

    // Security improvements
    if (this.analysis.edgeCases.vulnerabilities.length > 0) {
      actions.push({
        priority: 'critical',
        action: 'Fix security vulnerabilities',
        description: 'Implement input validation and sanitization',
        vulnerabilities: this.analysis.edgeCases.vulnerabilities
      });
    }

    // Error handling improvements
    const poorErrorHandling = this.analysis.errorHandling.details.filter(
      d => !d.hasProperErrorHandling
    );
    if (poorErrorHandling.length > 0) {
      actions.push({
        priority: 'medium',
        action: 'Improve error handling',
        description: `Enhance error responses for ${poorErrorHandling.length} test cases`,
        details: poorErrorHandling
      });
    }

    return actions;
  }

  generateSummary(report) {
    this.log('=== ENHANCED REGRESSION ANALYSIS SUMMARY ===');
    this.log(`API Endpoints: ${report.summary.workingEndpoints}/${report.summary.totalApiEndpoints} working (${report.summary.endpointHealthScore})`);
    this.log(`Mock Data: ${report.summary.endpointsWithMockData}/${report.summary.mockDataEndpoints} endpoints affected`);
    this.log(`Error Handling: ${report.summary.properErrorHandling}/${report.summary.errorHandlingTests} properly handled (${report.summary.errorHandlingScore})`);
    this.log(`Security: ${report.summary.securityVulnerabilities} vulnerabilities detected`);

    if (report.findings.criticalIssues.length > 0) {
      this.log('=== CRITICAL ISSUES ===');
      report.findings.criticalIssues.forEach(issue => {
        this.log(`❌ ${issue.type.toUpperCase()}: ${issue.description}`);
      });
    }

    if (report.findings.recommendedActions.length > 0) {
      this.log('=== RECOMMENDED ACTIONS ===');
      report.findings.recommendedActions.forEach(action => {
        this.log(`📋 ${action.priority.toUpperCase()}: ${action.action} - ${action.description}`);
      });
    }
  }
}

// Export for use in other modules
export { EnhancedRegressionAnalyzer };

// Run analysis if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new EnhancedRegressionAnalyzer();

  analyzer.runComprehensiveAnalysis()
    .then(results => {
      console.log('\n=== Enhanced Analysis Complete ===');
      process.exit(0);
    })
    .catch(error => {
      console.error('Enhanced analysis failed:', error);
      process.exit(1);
    });
}