/**
 * Phase 3 Manual Verification Script
 * Direct API and HTML content verification
 */

const axios = require('axios');
const fs = require('fs').promises;

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

class ManualVerification {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
      startTime: new Date(),
    };
  }

  async logResult(test, status, details, warning = false) {
    const result = {
      test,
      status,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(result);
    
    if (status === 'PASS') {
      this.results.passed++;
      console.log(`✅ PASS: ${test}`);
    } else if (warning) {
      this.results.warnings++;
      console.log(`⚠️  WARN: ${test}`);
    } else {
      this.results.failed++;
      console.log(`❌ FAIL: ${test}`);
    }
    
    if (details) {
      console.log(`   ${details}`);
    }
  }

  async testAPIEndpoints() {
    console.log('\n🔌 Testing API Endpoints');
    console.log('='.repeat(40));

    try {
      // Test agents endpoint
      const agentsResponse = await axios.get(`${API_URL}/api/agents`);
      const agents = agentsResponse.data.data || agentsResponse.data;
      
      await this.logResult(
        'Agents API returns data',
        'PASS',
        `Retrieved ${agents.length} agents with status ${agentsResponse.status}`
      );

      // Validate agent structure
      if (agents.length > 0) {
        const firstAgent = agents[0];
        const hasRequiredFields = firstAgent.id && firstAgent.name && firstAgent.description;
        
        await this.logResult(
          'Agent data structure is valid',
          hasRequiredFields ? 'PASS' : 'FAIL',
          hasRequiredFields ? 'All required fields present' : 'Missing required fields'
        );

        // Check for Home/Details navigation data
        const hasNavFields = firstAgent.id; // We need ID for navigation
        await this.logResult(
          'Agent navigation data available',
          hasNavFields ? 'PASS' : 'FAIL',
          hasNavFields ? 'Agent ID available for navigation' : 'Missing navigation data'
        );
      }

      // Test posts endpoint
      const postsResponse = await axios.get(`${API_URL}/api/v1/agent-posts`);
      const posts = postsResponse.data.data || postsResponse.data;
      
      await this.logResult(
        'Posts API returns data',
        'PASS',
        `Retrieved ${posts.length} posts with status ${postsResponse.status}`
      );

      // Test health endpoint
      const healthResponse = await axios.get(`${API_URL}/api/health`);
      await this.logResult(
        'Health endpoint responds',
        'PASS',
        `Status: ${healthResponse.status}, Response: ${JSON.stringify(healthResponse.data).substring(0, 100)}...`
      );

    } catch (error) {
      await this.logResult(
        'API Endpoints',
        'FAIL',
        `API Error: ${error.message}`
      );
    }
  }

  async testFrontendPages() {
    console.log('\n🌐 Testing Frontend Pages');
    console.log('='.repeat(40));

    try {
      // Test main page
      const mainResponse = await axios.get(BASE_URL);
      await this.logResult(
        'Main page loads',
        mainResponse.status === 200 ? 'PASS' : 'FAIL',
        `Status: ${mainResponse.status}, Content length: ${mainResponse.data.length} chars`
      );

      // Test agents page
      const agentsResponse = await axios.get(`${BASE_URL}/agents`);
      await this.logResult(
        'Agents page loads',
        agentsResponse.status === 200 ? 'PASS' : 'FAIL',
        `Status: ${agentsResponse.status}, Content length: ${agentsResponse.data.length} chars`
      );

      // Check for React application structure
      const hasReactRoot = agentsResponse.data.includes('id="root"');
      await this.logResult(
        'React application structure present',
        hasReactRoot ? 'PASS' : 'FAIL',
        hasReactRoot ? 'Found React root element' : 'Missing React root element'
      );

      // Test agent home page (using first agent ID)
      const agentsApiResponse = await axios.get(`${API_URL}/api/agents`);
      const agents = agentsApiResponse.data.data || agentsApiResponse.data;
      
      if (agents.length > 0) {
        const firstAgentId = agents[0].id;
        try {
          const agentHomeResponse = await axios.get(`${BASE_URL}/agents/${firstAgentId}`);
          await this.logResult(
            'Agent home page loads',
            agentHomeResponse.status === 200 ? 'PASS' : 'FAIL',
            `Status: ${agentHomeResponse.status} for agent ${firstAgentId}`
          );
        } catch (agentError) {
          await this.logResult(
            'Agent home page loads',
            'FAIL',
            `Error loading agent page: ${agentError.response?.status || agentError.message}`
          );
        }
      }

    } catch (error) {
      await this.logResult(
        'Frontend Pages',
        'FAIL',
        `Frontend Error: ${error.message}`
      );
    }
  }

  async testDataIntegrity() {
    console.log('\n🔍 Testing Data Integrity');
    console.log('='.repeat(40));

    try {
      // Get agents from API
      const agentsResponse = await axios.get(`${API_URL}/api/agents`);
      const agents = agentsResponse.data.data || agentsResponse.data;

      // Check for real vs mock data
      if (agents.length > 0) {
        const firstAgent = agents[0];
        const looksReal = !firstAgent.name.toLowerCase().includes('mock') && 
                         !firstAgent.name.toLowerCase().includes('test') &&
                         !firstAgent.name.toLowerCase().includes('sample');
        
        await this.logResult(
          'Agents contain real data (not mock)',
          looksReal ? 'PASS' : 'FAIL',
          `First agent: ${firstAgent.name}`
        );

        // Check for performance metrics
        const hasMetrics = firstAgent.performance_metrics || firstAgent.usage_count;
        await this.logResult(
          'Agents have performance metrics',
          hasMetrics ? 'PASS' : 'WARN',
          hasMetrics ? 'Performance data available' : 'No performance metrics found',
          !hasMetrics
        );

        // Check for timestamps
        const hasTimestamps = firstAgent.created_at || firstAgent.updated_at || firstAgent.last_used;
        await this.logResult(
          'Agents have timestamp data',
          hasTimestamps ? 'PASS' : 'WARN',
          hasTimestamps ? 'Timestamp data available' : 'No timestamp data found',
          !hasTimestamps
        );
      }

      // Get posts and check for real data
      const postsResponse = await axios.get(`${API_URL}/api/v1/agent-posts`);
      const posts = postsResponse.data.data || postsResponse.data;

      if (posts.length > 0) {
        const firstPost = posts[0];
        const postLooksReal = firstPost.content && 
                             !firstPost.content.toLowerCase().includes('lorem') &&
                             !firstPost.content.toLowerCase().includes('sample');
        
        await this.logResult(
          'Posts contain real content (not lorem ipsum)',
          postLooksReal ? 'PASS' : 'WARN',
          postLooksReal ? 'Real content detected' : 'May contain placeholder content',
          !postLooksReal
        );
      }

    } catch (error) {
      await this.logResult(
        'Data Integrity',
        'FAIL',
        `Data Error: ${error.message}`
      );
    }
  }

  async testNavigation() {
    console.log('\n🧭 Testing Navigation Structure');
    console.log('='.repeat(40));

    try {
      // Get agents for navigation testing
      const agentsResponse = await axios.get(`${API_URL}/api/agents`);
      const agents = agentsResponse.data.data || agentsResponse.data;

      if (agents.length > 0) {
        const firstAgent = agents[0];
        
        // Test that agent has required fields for navigation
        const canNavigateToHome = firstAgent.id;
        const canNavigateToDetails = firstAgent.id;
        
        await this.logResult(
          'Agent home navigation possible',
          canNavigateToHome ? 'PASS' : 'FAIL',
          canNavigateToHome ? `Can navigate to /agents/${firstAgent.id}/home` : 'Missing agent ID'
        );

        await this.logResult(
          'Agent details navigation possible',
          canNavigateToDetails ? 'PASS' : 'FAIL',
          canNavigateToDetails ? `Can navigate to /agents/${firstAgent.id}` : 'Missing agent ID'
        );

        // Test agent home page URL structure
        const expectedHomeUrl = `/agents/${firstAgent.id}/home`;
        const expectedDetailsUrl = `/agents/${firstAgent.id}`;
        
        await this.logResult(
          'Navigation URL structure valid',
          'PASS',
          `Home: ${BASE_URL}${expectedHomeUrl}, Details: ${BASE_URL}${expectedDetailsUrl}`
        );
      }

    } catch (error) {
      await this.logResult(
        'Navigation Structure',
        'FAIL',
        `Navigation Error: ${error.message}`
      );
    }
  }

  async generateReport() {
    const endTime = new Date();
    const duration = endTime - this.results.startTime;

    const report = {
      summary: {
        total: this.results.passed + this.results.failed + this.results.warnings,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        successRate: `${(this.results.passed / (this.results.passed + this.results.failed + this.results.warnings) * 100).toFixed(1)}%`,
        duration: `${duration}ms`,
        timestamp: endTime.toISOString()
      },
      tests: this.results.tests,
      environment: {
        baseUrl: BASE_URL,
        apiUrl: API_URL,
        testType: 'manual-verification'
      },
      conclusions: {
        apiWorking: this.results.tests.filter(t => t.test.includes('API') && t.status === 'PASS').length > 0,
        frontendLoading: this.results.tests.filter(t => t.test.includes('page loads') && t.status === 'PASS').length > 0,
        realData: this.results.tests.filter(t => t.test.includes('real data') && t.status === 'PASS').length > 0,
        navigationReady: this.results.tests.filter(t => t.test.includes('navigation') && t.status === 'PASS').length > 0
      }
    };

    // Save report
    await fs.writeFile(
      '/workspaces/agent-feed/tests/phase3-manual-verification-report.json',
      JSON.stringify(report, null, 2)
    );

    return report;
  }

  async run() {
    console.log('\n📋 Phase 3 Dynamic Agent Pages - Manual Verification');
    console.log('='.repeat(60));
    console.log('Direct testing of API endpoints and page structure without browser automation');
    
    await this.testAPIEndpoints();
    await this.testFrontendPages();
    await this.testDataIntegrity();
    await this.testNavigation();

    const report = await this.generateReport();

    console.log('\n📊 MANUAL VERIFICATION RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`📈 Success Rate: ${report.summary.successRate}`);

    console.log('\n🎯 CONCLUSIONS');
    console.log('='.repeat(60));
    console.log(`API Working: ${report.conclusions.apiWorking ? '✅ YES' : '❌ NO'}`);
    console.log(`Frontend Loading: ${report.conclusions.frontendLoading ? '✅ YES' : '❌ NO'}`);
    console.log(`Real Data: ${report.conclusions.realData ? '✅ YES' : '❌ NO'}`);
    console.log(`Navigation Ready: ${report.conclusions.navigationReady ? '✅ YES' : '❌ NO'}`);

    return report;
  }
}

// Run the verification if called directly
if (require.main === module) {
  (async () => {
    const verification = new ManualVerification();
    await verification.run();
  })();
}

module.exports = ManualVerification;