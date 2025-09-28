/**
 * Comprehensive Regression Test Suite
 * Tests all API endpoints, data transformation, mock data leakage, error handling, and edge cases
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ComprehensiveRegressionTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
      details: []
    };
    this.testCategories = {
      apiEndpoints: [],
      dataTransformation: [],
      mockDataLeakage: [],
      errorHandling: [],
      edgeCases: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    return logMessage;
  }

  async runTest(testName, testFunction, category = 'general') {
    try {
      this.results.total++;
      this.log(`Running test: ${testName}`, 'test');

      const result = await testFunction();

      if (result.passed) {
        this.results.passed++;
        this.log(`✅ PASS: ${testName}`, 'pass');
      } else {
        this.results.failed++;
        this.log(`❌ FAIL: ${testName} - ${result.error}`, 'fail');
        this.results.errors.push({ test: testName, error: result.error, category });
      }

      this.results.details.push({
        test: testName,
        category,
        passed: result.passed,
        error: result.error || null,
        details: result.details || null,
        timestamp: new Date().toISOString()
      });

      if (this.testCategories[category]) {
        this.testCategories[category].push({
          name: testName,
          passed: result.passed,
          error: result.error
        });
      }

      return result;
    } catch (error) {
      this.results.total++;
      this.results.failed++;
      this.log(`❌ ERROR: ${testName} - ${error.message}`, 'error');
      this.results.errors.push({ test: testName, error: error.message, category });
      return { passed: false, error: error.message };
    }
  }

  async testApiEndpoint(endpoint, method = 'GET', body = null, expectedStatus = 200) {
    try {
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

      const passed = response.status === expectedStatus;

      return {
        passed,
        error: passed ? null : `Expected status ${expectedStatus}, got ${response.status}`,
        details: {
          status: response.status,
          response: responseData,
          headers: Object.fromEntries(response.headers.entries())
        }
      };
    } catch (error) {
      return {
        passed: false,
        error: `Network error: ${error.message}`,
        details: null
      };
    }
  }

  async checkForMockData(data, endpoint) {
    const mockIndicators = [
      'mock',
      'fake',
      'test',
      'sample',
      'dummy',
      'placeholder',
      'lorem ipsum',
      'john doe',
      'jane doe',
      'foo',
      'bar',
      'baz',
      'example.com',
      'test@test.com'
    ];

    const jsonString = JSON.stringify(data).toLowerCase();
    const foundMocks = mockIndicators.filter(indicator =>
      jsonString.includes(indicator.toLowerCase())
    );

    return {
      passed: foundMocks.length === 0,
      error: foundMocks.length > 0 ? `Mock data indicators found: ${foundMocks.join(', ')}` : null,
      details: {
        endpoint,
        foundMockIndicators: foundMocks,
        dataPreview: JSON.stringify(data).substring(0, 200) + '...'
      }
    };
  }

  async testDataTransformation(sourceEndpoint, transformedEndpoint) {
    try {
      const sourceResponse = await fetch(`${this.baseUrl}${sourceEndpoint}`);
      const transformedResponse = await fetch(`${this.baseUrl}${transformedEndpoint}`);

      const sourceData = await sourceResponse.json();
      const transformedData = await transformedResponse.json();

      // Check if transformation maintains data integrity
      const hasValidStructure = transformedData && typeof transformedData === 'object';
      const hasExpectedFields = Array.isArray(transformedData) ||
                               (transformedData.data && Array.isArray(transformedData.data));

      return {
        passed: hasValidStructure && hasExpectedFields,
        error: !hasValidStructure ? 'Invalid transformed data structure' :
               !hasExpectedFields ? 'Missing expected fields in transformed data' : null,
        details: {
          sourceDataType: typeof sourceData,
          transformedDataType: typeof transformedData,
          sourceKeys: Object.keys(sourceData || {}),
          transformedKeys: Object.keys(transformedData || {})
        }
      };
    } catch (error) {
      return {
        passed: false,
        error: `Transformation test failed: ${error.message}`,
        details: null
      };
    }
  }

  async testErrorHandling(endpoint, invalidData) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      const responseData = await response.text();
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseData);
      } catch {
        parsedResponse = responseData;
      }

      // Good error handling should return 4xx status codes for bad requests
      const hasProperErrorStatus = response.status >= 400 && response.status < 500;
      const hasErrorMessage = parsedResponse &&
                             (parsedResponse.error || parsedResponse.message || parsedResponse.includes('error'));

      return {
        passed: hasProperErrorStatus && hasErrorMessage,
        error: !hasProperErrorStatus ? `Expected 4xx status, got ${response.status}` :
               !hasErrorMessage ? 'No error message in response' : null,
        details: {
          status: response.status,
          response: parsedResponse,
          inputData: invalidData
        }
      };
    } catch (error) {
      return {
        passed: false,
        error: `Error handling test failed: ${error.message}`,
        details: null
      };
    }
  }

  async runAllTests() {
    this.log('Starting Comprehensive Regression Test Suite', 'start');

    // 1. API Endpoints Testing
    this.log('=== Testing API Endpoints ===');

    await this.runTest('Health Check Endpoint', async () => {
      return await this.testApiEndpoint('/health');
    }, 'apiEndpoints');

    await this.runTest('Agents API Endpoint', async () => {
      return await this.testApiEndpoint('/api/agents');
    }, 'apiEndpoints');

    await this.runTest('Activities API Endpoint', async () => {
      return await this.testApiEndpoint('/api/activities');
    }, 'apiEndpoints');

    await this.runTest('Agent Feed API', async () => {
      return await this.testApiEndpoint('/api/agent-feed');
    }, 'apiEndpoints');

    await this.runTest('WebSocket Health Check', async () => {
      return await this.testApiEndpoint('/api/websocket/health');
    }, 'apiEndpoints');

    // 2. Data Transformation Testing
    this.log('=== Testing Data Transformation ===');

    await this.runTest('Agents Data Transformation', async () => {
      return await this.testDataTransformation('/api/agents', '/api/agents');
    }, 'dataTransformation');

    await this.runTest('Activities Data Transformation', async () => {
      return await this.testDataTransformation('/api/activities', '/api/activities');
    }, 'dataTransformation');

    // 3. Mock Data Leakage Testing
    this.log('=== Testing for Mock Data Leakage ===');

    await this.runTest('Agents Mock Data Check', async () => {
      const response = await fetch(`${this.baseUrl}/api/agents`);
      const data = await response.json();
      return await this.checkForMockData(data, '/api/agents');
    }, 'mockDataLeakage');

    await this.runTest('Activities Mock Data Check', async () => {
      const response = await fetch(`${this.baseUrl}/api/activities`);
      const data = await response.json();
      return await this.checkForMockData(data, '/api/activities');
    }, 'mockDataLeakage');

    // 4. Error Handling Testing
    this.log('=== Testing Error Handling ===');

    await this.runTest('Invalid Agent Creation', async () => {
      return await this.testErrorHandling('/api/agents', { invalid: 'data' });
    }, 'errorHandling');

    await this.runTest('Invalid Activity Creation', async () => {
      return await this.testErrorHandling('/api/activities', { malformed: true });
    }, 'errorHandling');

    await this.runTest('Nonexistent Endpoint', async () => {
      return await this.testApiEndpoint('/api/nonexistent', 'GET', null, 404);
    }, 'errorHandling');

    // 5. Edge Cases Testing
    this.log('=== Testing Edge Cases ===');

    await this.runTest('Large Payload Handling', async () => {
      const largePayload = { data: 'x'.repeat(10000) };
      return await this.testApiEndpoint('/api/agents', 'POST', largePayload, 400);
    }, 'edgeCases');

    await this.runTest('Empty Payload Handling', async () => {
      return await this.testApiEndpoint('/api/agents', 'POST', {}, 400);
    }, 'edgeCases');

    await this.runTest('SQL Injection Protection', async () => {
      const maliciousPayload = { name: "'; DROP TABLE agents; --" };
      return await this.testApiEndpoint('/api/agents', 'POST', maliciousPayload, 400);
    }, 'edgeCases');

    await this.runTest('XSS Protection', async () => {
      const xssPayload = { name: "<script>alert('xss')</script>" };
      return await this.testApiEndpoint('/api/agents', 'POST', xssPayload, 400);
    }, 'edgeCases');

    // Generate final report
    await this.generateReport();

    return this.results;
  }

  async generateReport() {
    const report = {
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        passRate: ((this.results.passed / this.results.total) * 100).toFixed(2) + '%',
        timestamp: new Date().toISOString()
      },
      categories: this.testCategories,
      errors: this.results.errors,
      details: this.results.details
    };

    // Save report to file
    const reportPath = path.join(__dirname, 'comprehensive-regression-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log('=== COMPREHENSIVE REGRESSION TEST RESULTS ===');
    this.log(`Total Tests: ${report.summary.total}`);
    this.log(`Passed: ${report.summary.passed}`);
    this.log(`Failed: ${report.summary.failed}`);
    this.log(`Pass Rate: ${report.summary.passRate}`);

    if (this.results.errors.length > 0) {
      this.log('=== FAILED TESTS ===');
      this.results.errors.forEach(error => {
        this.log(`❌ ${error.test}: ${error.error}`);
      });
    }

    this.log(`Full report saved to: ${reportPath}`);

    return report;
  }
}

// Export for use in other modules
export { ComprehensiveRegressionTester };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ComprehensiveRegressionTester();

  tester.runAllTests()
    .then(results => {
      console.log('\n=== Test Execution Complete ===');
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}