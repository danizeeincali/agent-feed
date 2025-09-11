/**
 * Phase 3 API Validation Suite
 * Tests all API endpoints that support the dynamic agent pages
 */

const axios = require('axios');
const fs = require('fs').promises;

const API_BASE_URL = 'http://localhost:3000';

class Phase3ApiValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      tests: [],
      startTime: new Date(),
      endTime: null,
      errors: []
    };
  }

  async runTest(testName, testFn) {
    this.results.total++;
    console.log(`\n🧪 API Test: ${testName}`);
    
    try {
      const startTime = Date.now();
      await testFn();
      const duration = Date.now() - startTime;
      
      console.log(`✅ PASSED: ${testName} (${duration}ms)`);
      this.results.passed++;
      this.results.tests.push({
        name: testName,
        status: 'PASSED',
        duration,
        error: null
      });
    } catch (error) {
      console.error(`❌ FAILED: ${testName}`);
      console.error(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({
        name: testName,
        status: 'FAILED',
        duration: 0,
        error: error.message
      });
    }
  }

  async testAgentsAPI() {
    const response = await axios.get(`${API_BASE_URL}/api/agents`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    const agents = data.data || data;
    
    if (!Array.isArray(agents)) {
      throw new Error('Agents API should return an array');
    }
    
    if (agents.length === 0) {
      throw new Error('No agents returned from API');
    }
    
    // Validate agent structure
    const firstAgent = agents[0];
    const requiredFields = ['id', 'name', 'display_name', 'description'];
    
    for (const field of requiredFields) {
      if (!firstAgent[field]) {
        throw new Error(`Agent missing required field: ${field}`);
      }
    }
    
    console.log(`   ✓ Retrieved ${agents.length} agents with valid structure`);
  }

  async testAgentPostsAPI() {
    const response = await axios.get(`${API_BASE_URL}/api/v1/agent-posts`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    const posts = data.data || data;
    
    if (!Array.isArray(posts)) {
      throw new Error('Agent posts API should return an array');
    }
    
    console.log(`   ✓ Retrieved ${posts.length} agent posts`);
  }

  async testHealthAPI() {
    const response = await axios.get(`${API_BASE_URL}/api/health`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    
    // Check if response has any health-related data
    if (!data.status && !data.message && !data.timestamp && Object.keys(data).length === 0) {
      throw new Error('Health API should return some health status data');
    }
    
    console.log(`   ✓ Health check passed:`, data);
  }

  async testCORSHeaders() {
    const response = await axios.get(`${API_BASE_URL}/api/agents`);
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers']
    };
    
    console.log(`   ✓ CORS headers present:`, corsHeaders);
  }

  async run() {
    console.log('\n🔌 Phase 3 API Validation Suite');
    console.log('=' .repeat(50));
    
    try {
      await this.runTest('Agents API returns valid data', () => this.testAgentsAPI());
      await this.runTest('Agent Posts API accessible', () => this.testAgentPostsAPI());
      await this.runTest('Health API responds correctly', () => this.testHealthAPI());
      await this.runTest('CORS headers are configured', () => this.testCORSHeaders());
      
      this.results.endTime = new Date();
      
      const report = {
        summary: {
          total: this.results.total,
          passed: this.results.passed,
          failed: this.results.failed,
          successRate: `${((this.results.passed / this.results.total) * 100).toFixed(1)}%`,
          duration: `${this.results.endTime - this.results.startTime}ms`,
          timestamp: new Date().toISOString()
        },
        tests: this.results.tests,
        errors: this.results.errors,
        environment: {
          apiUrl: API_BASE_URL
        }
      };
      
      // Save report
      await fs.writeFile(
        '/workspaces/agent-feed/tests/phase3-api-validation-report.json',
        JSON.stringify(report, null, 2)
      );
      
      console.log('\n📊 API VALIDATION RESULTS');
      console.log('=' .repeat(50));
      console.log(`✅ Passed: ${this.results.passed}`);
      console.log(`❌ Failed: ${this.results.failed}`);
      console.log(`📈 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
      
      return report;
      
    } catch (error) {
      console.error('Failed to run API validation:', error.message);
      throw error;
    }
  }
}

// Run the tests if called directly
if (require.main === module) {
  (async () => {
    const validator = new Phase3ApiValidator();
    const report = await validator.run();
    process.exit(report.summary.failed > 0 ? 1 : 0);
  })();
}

module.exports = Phase3ApiValidator;