#!/usr/bin/env node

/**
 * Comprehensive API Endpoint Validation Test
 * Tests all implemented endpoints for proper responses and UUID data structures
 */

import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3002';
const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

class EndpointValidator {
  constructor() {
    this.results = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  log(message, color = COLORS.RESET) {
    console.log(`${color}${message}${COLORS.RESET}`);
  }

  async testEndpoint(name, method, url, expectedKeys = [], postData = null) {
    this.totalTests++;

    try {
      let command = `curl -s`;

      if (method === 'POST') {
        command += ` -X POST -H "Content-Type: application/json"`;
        if (postData) {
          command += ` -d '${JSON.stringify(postData)}'`;
        }
      }

      command += ` "${BASE_URL}${url}"`;

      const response = execSync(command, { encoding: 'utf8' });
      let data;

      try {
        data = JSON.parse(response);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${response.substring(0, 100)}...`);
      }

      // Check basic structure
      if (!data.success && data.success !== false) {
        throw new Error('Missing "success" field in response');
      }

      // Check expected keys
      const missingKeys = expectedKeys.filter(key => {
        const keys = key.split('.');
        let current = data;
        for (const k of keys) {
          if (current === null || current === undefined || !(k in current)) {
            return true;
          }
          current = current[k];
        }
        return false;
      });

      if (missingKeys.length > 0) {
        throw new Error(`Missing expected keys: ${missingKeys.join(', ')}`);
      }

      // Check for UUID patterns in IDs
      this.validateUUIDs(data);

      this.passedTests++;
      this.log(`✅ ${name}`, COLORS.GREEN);
      this.results.push({ name, status: 'PASSED', url, method });

      return data;
    } catch (error) {
      this.log(`❌ ${name}: ${error.message}`, COLORS.RED);
      this.results.push({ name, status: 'FAILED', url, method, error: error.message });
      return null;
    }
  }

  validateUUIDs(obj, path = '') {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => this.validateUUIDs(item, `${path}[${index}]`));
    } else if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (key === 'id' || key.endsWith('_id') || key === 'agent_id' || key === 'scan_id') {
          if (typeof obj[key] === 'string') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(obj[key])) {
              throw new Error(`Invalid UUID format for ${path}.${key}: ${obj[key]}`);
            }
          }
        } else {
          this.validateUUIDs(obj[key], path ? `${path}.${key}` : key);
        }
      });
    }
  }

  async runAllTests() {
    this.log(`${COLORS.BOLD}${COLORS.BLUE}🔬 Starting Comprehensive API Endpoint Validation${COLORS.RESET}`);
    this.log(`${COLORS.BLUE}Testing against: ${BASE_URL}${COLORS.RESET}`);
    this.log('');

    // Health check
    await this.testEndpoint('Health Check', 'GET', '/health', ['status', 'timestamp']);

    // Agent endpoints
    this.log(`${COLORS.YELLOW}📋 Testing Agent Endpoints...${COLORS.RESET}`);
    const agents = await this.testEndpoint('Get All Agents', 'GET', '/api/agents');

    if (agents && agents.length > 0) {
      const agentId = agents[0].id;
      await this.testEndpoint('Get Agent by ID', 'GET', `/api/agents/${agentId}`, ['id', 'name', 'status']);
      await this.testEndpoint('Get Agent Status', 'GET', `/api/agents/${agentId}/status`, ['data.agent_id', 'data.status']);
      await this.testEndpoint('Get Agent Files', 'GET', `/api/agents/${agentId}/files`, ['success', 'data']);
    }

    await this.testEndpoint('Get All Agent Statuses', 'GET', '/api/agents/status/all', ['success', 'data']);
    await this.testEndpoint('Get Agent Metrics', 'GET', '/api/agents/metrics', ['success', 'data.total_agents']);
    await this.testEndpoint('Get Agent Categories', 'GET', '/api/agents/categories', ['success', 'data']);
    await this.testEndpoint('Agent Search', 'GET', '/api/agents/search?q=Code', ['success', 'data']);
    await this.testEndpoint('Agent Health Check', 'GET', '/api/agents/health', ['success', 'data.status']);
    await this.testEndpoint('Scan Agents', 'POST', '/api/agents/scan', ['success', 'data.scan_id']);

    // Template endpoints
    this.log(`${COLORS.YELLOW}📝 Testing Template Endpoints...${COLORS.RESET}`);
    await this.testEndpoint('Get All Templates', 'GET', '/api/templates', ['success', 'data']);
    await this.testEndpoint('Get Template Categories', 'GET', '/api/templates/categories', ['success', 'data']);

    const newTemplate = await this.testEndpoint('Create Template', 'POST', '/api/templates',
      ['success', 'data.id'],
      { name: 'Test Template', content: 'Test content', category: 'TEST' }
    );

    if (newTemplate && newTemplate.data && newTemplate.data.id) {
      const templateId = newTemplate.data.id;
      await this.testEndpoint('Get Template by ID', 'GET', `/api/templates/${templateId}`, ['success', 'data.id']);
      await this.testEndpoint('Update Template', 'PUT', `/api/templates/${templateId}`,
        ['success', 'data.id'],
        { name: 'Updated Test Template' }
      );
      await this.testEndpoint('Delete Template', 'DELETE', `/api/templates/${templateId}`, ['success', 'data.id']);
    }

    // Streaming Ticker endpoints
    this.log(`${COLORS.YELLOW}📊 Testing Streaming Ticker Endpoints...${COLORS.RESET}`);
    await this.testEndpoint('Post Streaming Message', 'POST', '/api/streaming-ticker/message',
      ['success', 'data.id'],
      { message: 'Test streaming message', type: 'info', source: 'test' }
    );
    await this.testEndpoint('Get Streaming History', 'GET', '/api/streaming-ticker/history', ['success', 'data']);

    // Analytics endpoints
    this.log(`${COLORS.YELLOW}📈 Testing Analytics Endpoints...${COLORS.RESET}`);
    await this.testEndpoint('Get Activities', 'GET', '/api/activities', ['success', 'data']);
    await this.testEndpoint('Get Token Analytics Summary', 'GET', '/api/token-analytics/summary', ['success', 'data']);
    await this.testEndpoint('Get Token Analytics Hourly', 'GET', '/api/token-analytics/hourly', ['success', 'data']);
    await this.testEndpoint('Get Token Analytics Daily', 'GET', '/api/token-analytics/daily', ['success', 'data']);
    await this.testEndpoint('Get Token Analytics Messages', 'GET', '/api/token-analytics/messages', ['success', 'data']);

    // Additional data endpoints
    this.log(`${COLORS.YELLOW}📊 Testing Additional Data Endpoints...${COLORS.RESET}`);
    await this.testEndpoint('Get Agent Posts', 'GET', '/api/agent-posts', ['success', 'data']);
    await this.testEndpoint('Get V1 Agent Posts', 'GET', '/api/v1/agent-posts', ['success', 'data']);
    await this.testEndpoint('Get Filter Data', 'GET', '/api/filter-data', ['success', 'data']);
    await this.testEndpoint('Get Filter Stats', 'GET', '/api/filter-stats', ['success', 'data']);

    this.printSummary();
  }

  printSummary() {
    this.log('');
    this.log(`${COLORS.BOLD}${COLORS.BLUE}📊 Test Summary${COLORS.RESET}`);
    this.log(`Total Tests: ${this.totalTests}`);
    this.log(`Passed: ${COLORS.GREEN}${this.passedTests}${COLORS.RESET}`);
    this.log(`Failed: ${COLORS.RED}${this.totalTests - this.passedTests}${COLORS.RESET}`);
    this.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(2)}%`);

    if (this.passedTests === this.totalTests) {
      this.log(`${COLORS.BOLD}${COLORS.GREEN}🎉 ALL TESTS PASSED! API is fully functional!${COLORS.RESET}`);
    } else {
      this.log(`${COLORS.BOLD}${COLORS.RED}❌ Some tests failed. Check the details above.${COLORS.RESET}`);

      // Show failed tests
      const failedTests = this.results.filter(r => r.status === 'FAILED');
      if (failedTests.length > 0) {
        this.log(`${COLORS.RED}Failed Tests:${COLORS.RESET}`);
        failedTests.forEach(test => {
          this.log(`  - ${test.name}: ${test.error}`);
        });
      }
    }

    this.log('');
    this.log(`${COLORS.BLUE}🔗 API Server running at: ${BASE_URL}${COLORS.RESET}`);
    this.log(`${COLORS.BLUE}📊 SSE Streaming: ${BASE_URL}/api/streaming-ticker/stream${COLORS.RESET}`);
  }
}

// Run the validation
const validator = new EndpointValidator();
validator.runAllTests().catch(error => {
  console.error(`${COLORS.RED}Test runner error:${COLORS.RESET}`, error);
  process.exit(1);
});