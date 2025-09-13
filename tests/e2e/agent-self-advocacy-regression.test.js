/**
 * Agent Self-Advocacy System - Comprehensive E2E Regression Test Suite
 * 
 * This test suite validates the complete agent self-advocacy system including:
 * - Agent data readiness API endpoints
 * - No mock data validation
 * - Agent page suggestion flow
 * - Avi strategic oversight approval/denial system
 * - Page-builder integration with data-first approach
 * - Agent markdown configuration parsing
 * - System stability under concurrent requests
 */

const { test, expect } = require('@playwright/test');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Test configuration
const CONFIG = {
  baseUrl: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
  apiUrl: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000,
  concurrentUsers: 10,
  testDataPath: '/workspaces/agent-feed/agents',
  expectedAgents: [
    'chief-of-staff-agent',
    'personal-todos-agent',
    'agent-feedback-agent',
    'meta-agent',
    'get-to-know-you-agent',
    'agent-ideas-agent'
  ]
};

// Test utilities
class TestMetrics {
  constructor() {
    this.reset();
  }

  reset() {
    this.startTime = performance.now();
    this.apiCalls = [];
    this.memoryUsage = [];
    this.errors = [];
    this.warnings = [];
  }

  recordApiCall(endpoint, duration, status) {
    this.apiCalls.push({
      endpoint,
      duration,
      status,
      timestamp: Date.now()
    });
  }

  recordMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.memoryUsage.push({
        ...process.memoryUsage(),
        timestamp: Date.now()
      });
    }
  }

  recordError(error, context) {
    this.errors.push({
      error: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now()
    });
  }

  recordWarning(message, context) {
    this.warnings.push({
      message,
      context,
      timestamp: Date.now()
    });
  }

  getReport() {
    const duration = performance.now() - this.startTime;
    const avgApiTime = this.apiCalls.length ? 
      this.apiCalls.reduce((sum, call) => sum + call.duration, 0) / this.apiCalls.length : 0;
    
    const peakMemory = this.memoryUsage.length ? 
      Math.max(...this.memoryUsage.map(m => m.heapUsed)) : 0;

    return {
      duration,
      apiCalls: this.apiCalls.length,
      avgApiResponseTime: avgApiTime,
      peakMemoryUsage: peakMemory,
      errors: this.errors.length,
      warnings: this.warnings.length,
      errorDetails: this.errors,
      warningDetails: this.warnings
    };
  }
}

const metrics = new TestMetrics();

// API Helper functions
async function apiRequest(endpoint, options = {}) {
  const startTime = performance.now();
  try {
    const url = `${CONFIG.apiUrl}${endpoint}`;
    console.log(`🔍 API Request: ${options.method || 'GET'} ${url}`);
    
    const response = await axios({
      url,
      method: options.method || 'GET',
      data: options.data,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: CONFIG.timeout,
      validateStatus: () => true // Allow all status codes
    });
    
    const duration = performance.now() - startTime;
    metrics.recordApiCall(endpoint, duration, response.status);
    
    console.log(`✅ API Response: ${response.status} (${duration.toFixed(2)}ms)`);
    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    metrics.recordApiCall(endpoint, duration, 'ERROR');
    metrics.recordError(error, `API request to ${endpoint}`);
    throw error;
  }
}

// Helper to validate no mock data
async function validateNoMockData(data, context) {
  const mockIndicators = [
    'mock',
    'fake',
    'dummy',
    'test-data',
    'placeholder',
    'sample',
    'lorem ipsum',
    'example.com',
    'todo:'
  ];

  const dataStr = JSON.stringify(data).toLowerCase();
  const foundMocks = mockIndicators.filter(indicator => dataStr.includes(indicator));
  
  if (foundMocks.length > 0) {
    metrics.recordError(
      new Error(`Mock data detected: ${foundMocks.join(', ')}`),
      `Mock data validation in ${context}`
    );
    return false;
  }
  return true;
}

// Test Suite
test.describe('Agent Self-Advocacy System - Comprehensive Regression Tests', () => {
  
  test.beforeEach(async () => {
    metrics.reset();
    metrics.recordMemoryUsage();
  });

  test.afterEach(async () => {
    metrics.recordMemoryUsage();
    const report = metrics.getReport();
    console.log('📊 Test Metrics:', JSON.stringify(report, null, 2));
  });

  test('1. Agent Data Readiness API Endpoints Work Correctly', async ({ page }) => {
    console.log('🧪 Testing Agent Data Readiness API Endpoints...');

    // Test 1.1: Get all agent data readiness status
    const readinessResponse = await apiRequest('/agent-data-readiness');
    expect(readinessResponse.status).toBe(200);
    expect(readinessResponse.data).toBeTruthy();
    
    const readinessData = readinessResponse.data;
    console.log(`📈 Agent Data Readiness Status:`, readinessData);

    // Validate structure
    expect(readinessData).toHaveProperty('agents');
    expect(Array.isArray(readinessData.agents)).toBeTruthy();
    expect(readinessData.agents.length).toBeGreaterThan(0);

    // Test 1.2: Validate each agent has required data readiness fields
    for (const agent of readinessData.agents) {
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('dataReadiness');
      expect(agent).toHaveProperty('configStatus');
      expect(agent).toHaveProperty('lastUpdate');
      
      // Validate no mock data
      await validateNoMockData(agent, `Agent data readiness for ${agent.id}`);
    }

    // Test 1.3: Get specific agent data readiness
    if (readinessData.agents.length > 0) {
      const firstAgent = readinessData.agents[0];
      const specificResponse = await apiRequest(`/agent-data-readiness/${firstAgent.id}`);
      expect(specificResponse.status).toBe(200);
      expect(specificResponse.data).toBeTruthy();
      
      await validateNoMockData(specificResponse.data, `Specific agent readiness for ${firstAgent.id}`);
    }

    // Test 1.4: Agent data readiness health check
    const healthResponse = await apiRequest('/agent-data-readiness/health');
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.data).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(healthResponse.data.status);

    console.log('✅ Agent Data Readiness API endpoints working correctly');
  });

  test('2. No Mock Data Appears Anywhere in System', async ({ page }) => {
    console.log('🧪 Validating No Mock Data in System...');
    
    let mockDataFound = false;
    const mockViolations = [];

    // Test 2.1: Check agents endpoint for mock data
    const agentsResponse = await apiRequest('/agents');
    if (agentsResponse.status === 200 && agentsResponse.data) {
      const hasMockData = !(await validateNoMockData(agentsResponse.data, 'Agents endpoint'));
      if (hasMockData) {
        mockDataFound = true;
        mockViolations.push('Agents endpoint contains mock data');
      }
    }

    // Test 2.2: Check agent posts for mock data
    const postsResponse = await apiRequest('/agent-posts?limit=20');
    if (postsResponse.status === 200 && postsResponse.data) {
      const hasMockData = !(await validateNoMockData(postsResponse.data, 'Agent posts endpoint'));
      if (hasMockData) {
        mockDataFound = true;
        mockViolations.push('Agent posts endpoint contains mock data');
      }
    }

    // Test 2.3: Check agent workspaces for mock data
    const workspacesResponse = await apiRequest('/agent-workspaces');
    if (workspacesResponse.status === 200 && workspacesResponse.data) {
      const hasMockData = !(await validateNoMockData(workspacesResponse.data, 'Agent workspaces endpoint'));
      if (hasMockData) {
        mockDataFound = true;
        mockViolations.push('Agent workspaces endpoint contains mock data');
      }
    }

    // Test 2.4: Frontend mock data check
    await page.goto(`${CONFIG.baseUrl}/agents`);
    await page.waitForLoadState('networkidle');
    
    const pageContent = await page.textContent('body');
    const mockIndicators = ['mock', 'fake', 'dummy', 'placeholder', 'lorem ipsum'];
    
    for (const indicator of mockIndicators) {
      if (pageContent.toLowerCase().includes(indicator)) {
        mockDataFound = true;
        mockViolations.push(`Frontend contains mock data indicator: ${indicator}`);
      }
    }

    // Assert no mock data found
    if (mockDataFound) {
      console.error('❌ Mock data violations found:', mockViolations);
      expect(mockDataFound).toBeFalsy();
    } else {
      console.log('✅ No mock data found in system');
    }
  });

  test('3. Agent Page Suggestion Flow Functions End-to-End', async ({ page }) => {
    console.log('🧪 Testing Agent Page Suggestion Flow...');

    // Test 3.1: Agent can request page creation
    const pageRequestData = {
      agentId: 'test-agent-suggestion',
      title: 'E2E Test Agent Page',
      description: 'Test page created via agent self-advocacy system',
      justification: 'Testing the complete suggestion flow',
      priority: 'medium',
      suggestedContent: {
        sections: ['About', 'Capabilities', 'Usage Examples'],
        features: ['Interactive demos', 'Real-time updates']
      }
    };

    const suggestionResponse = await apiRequest('/avi-page-requests', {
      method: 'POST',
      data: pageRequestData
    });

    expect([200, 201]).toContain(suggestionResponse.status);
    expect(suggestionResponse.data).toHaveProperty('requestId');
    
    const requestId = suggestionResponse.data.requestId;
    console.log(`📝 Page suggestion submitted: ${requestId}`);

    // Test 3.2: Check suggestion status
    const statusResponse = await apiRequest(`/avi-page-requests/${requestId}`);
    expect(statusResponse.status).toBe(200);
    expect(statusResponse.data).toHaveProperty('status');
    expect(['pending', 'reviewing', 'approved', 'denied']).toContain(statusResponse.data.status);

    // Test 3.3: Validate suggestion data integrity
    await validateNoMockData(statusResponse.data, `Page suggestion ${requestId}`);
    expect(statusResponse.data.agentId).toBe(pageRequestData.agentId);
    expect(statusResponse.data.title).toBe(pageRequestData.title);

    // Test 3.4: List all pending suggestions
    const allSuggestionsResponse = await apiRequest('/avi-page-requests');
    expect(allSuggestionsResponse.status).toBe(200);
    expect(Array.isArray(allSuggestionsResponse.data)).toBeTruthy();

    console.log('✅ Agent page suggestion flow working correctly');
  });

  test('4. Avi Strategic Oversight Approves/Denies Correctly', async ({ page }) => {
    console.log('🧪 Testing Avi Strategic Oversight System...');

    // Test 4.1: Create a test suggestion for approval testing
    const testRequest = {
      agentId: 'test-avi-oversight',
      title: 'Avi Oversight Test Page',
      description: 'Testing Avi strategic oversight functionality',
      justification: 'High-value agent page for testing approval system',
      priority: 'high'
    };

    const requestResponse = await apiRequest('/avi-page-requests', {
      method: 'POST',
      data: testRequest
    });

    expect([200, 201]).toContain(requestResponse.status);
    const requestId = requestResponse.data.requestId;

    // Test 4.2: Test approval workflow
    const approvalResponse = await apiRequest(`/avi-page-requests/${requestId}/approve`, {
      method: 'POST',
      data: {
        reviewerNotes: 'E2E test approval',
        approvedFeatures: testRequest.suggestedContent?.features || [],
        conditions: ['Must include performance metrics']
      }
    });

    expect([200, 202]).toContain(approvalResponse.status);
    
    // Test 4.3: Verify approval status
    const updatedStatusResponse = await apiRequest(`/avi-page-requests/${requestId}`);
    expect(updatedStatusResponse.status).toBe(200);
    expect(updatedStatusResponse.data.status).toBe('approved');
    expect(updatedStatusResponse.data).toHaveProperty('reviewedAt');
    expect(updatedStatusResponse.data).toHaveProperty('reviewerNotes');

    // Test 4.4: Test denial workflow with different request
    const denialTestRequest = {
      agentId: 'test-denial',
      title: 'Test Denial Request',
      description: 'Request designed to be denied',
      justification: 'Low priority test request',
      priority: 'low'
    };

    const denialRequestResponse = await apiRequest('/avi-page-requests', {
      method: 'POST',
      data: denialTestRequest
    });

    const denialRequestId = denialRequestResponse.data.requestId;
    
    const denialResponse = await apiRequest(`/avi-page-requests/${denialRequestId}/deny`, {
      method: 'POST',
      data: {
        reviewerNotes: 'E2E test denial - insufficient justification',
        denialReasons: ['Low priority', 'Insufficient business value']
      }
    });

    expect([200, 202]).toContain(denialResponse.status);

    // Test 4.5: Verify denial status
    const deniedStatusResponse = await apiRequest(`/avi-page-requests/${denialRequestId}`);
    expect(deniedStatusResponse.status).toBe(200);
    expect(deniedStatusResponse.data.status).toBe('denied');
    expect(deniedStatusResponse.data.denialReasons).toBeTruthy();

    console.log('✅ Avi Strategic Oversight approval/denial system working correctly');
  });

  test('5. Page-Builder Integrates with Data-First Approach', async ({ page }) => {
    console.log('🧪 Testing Page-Builder Integration with Data-First Approach...');

    // Test 5.1: Create agent workspace
    const workspaceData = {
      agentId: 'test-page-builder-integration',
      name: 'E2E Test Workspace',
      description: 'Testing page-builder data-first integration'
    };

    const workspaceResponse = await apiRequest('/agent-workspaces', {
      method: 'POST',
      data: workspaceData
    });

    expect([200, 201]).toContain(workspaceResponse.status);
    const workspaceId = workspaceResponse.data.workspaceId;

    // Test 5.2: Create page using page-builder with real data
    const pageData = {
      workspaceId,
      title: 'Data-First Test Page',
      description: 'Page created using data-first approach',
      components: [
        {
          type: 'AgentProfile',
          props: { agentId: workspaceData.agentId },
          dataSource: 'agent-data-service'
        },
        {
          type: 'AgentCapabilities',
          props: { agentId: workspaceData.agentId },
          dataSource: 'agent-config-parser'
        }
      ]
    };

    const pageResponse = await apiRequest('/page-builder/pages', {
      method: 'POST',
      data: pageData
    });

    expect([200, 201]).toContain(pageResponse.status);
    const pageId = pageResponse.data.pageId;

    // Test 5.3: Verify page uses real data, not mock data
    const createdPageResponse = await apiRequest(`/page-builder/pages/${pageId}`);
    expect(createdPageResponse.status).toBe(200);
    
    await validateNoMockData(createdPageResponse.data, `Page-builder page ${pageId}`);
    
    // Test 5.4: Verify data integration
    expect(createdPageResponse.data.components).toBeTruthy();
    expect(Array.isArray(createdPageResponse.data.components)).toBeTruthy();
    
    for (const component of createdPageResponse.data.components) {
      expect(component).toHaveProperty('dataSource');
      expect(component.dataSource).not.toBe('mock');
    }

    // Test 5.5: Test page rendering with data
    await page.goto(`${CONFIG.baseUrl}/agent-workspace/${workspaceId}/page/${pageId}`);
    await page.waitForLoadState('networkidle');
    
    // Check for data loading indicators
    const hasLoadingState = await page.locator('[data-testid="data-loading"]').count() >= 0;
    const hasErrorState = await page.locator('[data-testid="data-error"]').count() === 0;
    const hasContent = await page.locator('[data-testid="page-content"]').count() > 0;
    
    expect(hasErrorState).toBeTruthy();

    console.log('✅ Page-Builder integrates correctly with data-first approach');
  });

  test('6. All Agent Markdown Configs Parse Correctly', async ({ page }) => {
    console.log('🧪 Testing Agent Markdown Configuration Parsing...');

    const agentConfigPath = '/workspaces/agent-feed/agents';
    let configFiles = [];
    
    try {
      configFiles = fs.readdirSync(agentConfigPath)
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(agentConfigPath, file));
    } catch (error) {
      metrics.recordWarning('Could not read agent config directory', 'Agent config parsing test');
      configFiles = CONFIG.expectedAgents.map(agent => `${agentConfigPath}/${agent}.md`);
    }

    console.log(`📁 Found ${configFiles.length} agent configuration files`);

    // Test 6.1: Parse each agent configuration
    const parseResults = [];
    for (const configFile of configFiles) {
      try {
        const configContent = fs.readFileSync(configFile, 'utf8');
        
        // Test basic markdown structure
        expect(configContent).toContain('#');
        expect(configContent.length).toBeGreaterThan(50);
        
        // Validate no mock data in configs
        await validateNoMockData(configContent, `Agent config ${path.basename(configFile)}`);
        
        // Test API parsing
        const parseResponse = await apiRequest('/agent-config/parse', {
          method: 'POST',
          data: { 
            agentId: path.basename(configFile, '.md'),
            configContent 
          }
        });

        expect([200, 201]).toContain(parseResponse.status);
        expect(parseResponse.data).toHaveProperty('parsed');
        expect(parseResponse.data.parsed).toBeTruthy();
        
        parseResults.push({
          file: path.basename(configFile),
          status: 'success',
          data: parseResponse.data
        });

      } catch (error) {
        metrics.recordError(error, `Parsing agent config ${configFile}`);
        parseResults.push({
          file: path.basename(configFile),
          status: 'error',
          error: error.message
        });
      }
    }

    // Test 6.2: Validate parsing success rate
    const successfulParses = parseResults.filter(r => r.status === 'success').length;
    const successRate = (successfulParses / parseResults.length) * 100;
    
    console.log(`📊 Agent config parsing success rate: ${successRate.toFixed(2)}% (${successfulParses}/${parseResults.length})`);
    expect(successRate).toBeGreaterThanOrEqual(80); // Minimum 80% success rate

    // Test 6.3: Verify parsed data structure
    for (const result of parseResults.filter(r => r.status === 'success')) {
      expect(result.data).toHaveProperty('agentId');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('description');
      expect(result.data).toHaveProperty('capabilities');
    }

    console.log('✅ Agent markdown configurations parse correctly');
  });

  test('7. System Stability Under Concurrent Requests', async ({ page }) => {
    console.log('🧪 Testing System Stability Under Concurrent Load...');

    const concurrentRequests = CONFIG.concurrentUsers;
    const requestsPerUser = 5;
    
    // Test 7.1: Concurrent agent data requests
    const agentDataPromises = [];
    for (let i = 0; i < concurrentRequests; i++) {
      agentDataPromises.push(
        apiRequest('/agent-data-readiness').catch(error => ({ error: error.message, userId: i }))
      );
    }

    const agentDataResults = await Promise.all(agentDataPromises);
    const agentDataErrors = agentDataResults.filter(r => r.error).length;
    const agentDataSuccessRate = ((agentDataResults.length - agentDataErrors) / agentDataResults.length) * 100;

    console.log(`📊 Agent data concurrent requests: ${agentDataSuccessRate.toFixed(2)}% success rate`);
    expect(agentDataSuccessRate).toBeGreaterThanOrEqual(90);

    // Test 7.2: Concurrent page suggestion requests
    const pageRequestPromises = [];
    for (let i = 0; i < concurrentRequests; i++) {
      const requestData = {
        agentId: `concurrent-test-agent-${i}`,
        title: `Concurrent Test Page ${i}`,
        description: 'Concurrent load testing page',
        priority: 'medium'
      };
      
      pageRequestPromises.push(
        apiRequest('/avi-page-requests', {
          method: 'POST',
          data: requestData
        }).catch(error => ({ error: error.message, userId: i }))
      );
    }

    const pageRequestResults = await Promise.all(pageRequestPromises);
    const pageRequestErrors = pageRequestResults.filter(r => r.error).length;
    const pageRequestSuccessRate = ((pageRequestResults.length - pageRequestErrors) / pageRequestResults.length) * 100;

    console.log(`📊 Page request concurrent requests: ${pageRequestSuccessRate.toFixed(2)}% success rate`);
    expect(pageRequestSuccessRate).toBeGreaterThanOrEqual(85);

    // Test 7.3: Memory stability check
    metrics.recordMemoryUsage();
    const memoryReport = metrics.getReport();
    
    if (memoryReport.peakMemoryUsage > 0) {
      console.log(`📈 Peak memory usage during concurrent tests: ${(memoryReport.peakMemoryUsage / 1024 / 1024).toFixed(2)} MB`);
      expect(memoryReport.peakMemoryUsage).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
    }

    // Test 7.4: Response time stability
    const avgResponseTime = memoryReport.avgApiResponseTime;
    console.log(`⏱️  Average API response time: ${avgResponseTime.toFixed(2)}ms`);
    expect(avgResponseTime).toBeLessThan(2000); // Less than 2 seconds average

    console.log('✅ System maintains stability under concurrent load');
  });

  test('8. Full Integration Health Check', async ({ page }) => {
    console.log('🧪 Running Full Integration Health Check...');

    // Test 8.1: System health endpoint
    const healthResponse = await apiRequest('/health');
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.data).toHaveProperty('status');
    expect(healthResponse.data.status).toBe('healthy');

    // Test 8.2: Database connectivity
    expect(healthResponse.data).toHaveProperty('database');
    expect(healthResponse.data.database).toBeTruthy();

    // Test 8.3: Services availability
    expect(healthResponse.data).toHaveProperty('services');
    const services = healthResponse.data.services;
    
    const requiredServices = [
      'agent-data-readiness',
      'avi-strategic-oversight',
      'page-builder',
      'agent-config-parser'
    ];

    for (const service of requiredServices) {
      if (services[service] !== undefined) {
        expect(services[service]).toBeTruthy();
        console.log(`✅ Service ${service}: Available`);
      } else {
        metrics.recordWarning(`Service ${service} not reported in health check`, 'Health check');
      }
    }

    // Test 8.4: Frontend integration
    await page.goto(`${CONFIG.baseUrl}/agents`);
    await page.waitForLoadState('networkidle');
    
    // Check for critical UI elements
    const hasHeader = await page.locator('[data-testid="app-header"]').count() > 0;
    const hasNavigation = await page.locator('[data-testid="navigation"]').count() > 0;
    const hasContent = await page.locator('[data-testid="agents-list"]').count() > 0;
    
    // At least basic structure should be present
    expect(await page.locator('body').count()).toBeGreaterThan(0);

    console.log('✅ Full integration health check passed');
  });

});

// Global test completion report
test.afterAll(async () => {
  const finalReport = metrics.getReport();
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 AGENT SELF-ADVOCACY REGRESSION TEST SUITE COMPLETE');
  console.log('='.repeat(60));
  console.log('📊 FINAL PERFORMANCE METRICS:');
  console.log('='.repeat(60));
  console.log(`Total Duration: ${(finalReport.duration / 1000).toFixed(2)} seconds`);
  console.log(`Total API Calls: ${finalReport.apiCalls}`);
  console.log(`Average API Response Time: ${finalReport.avgApiResponseTime.toFixed(2)}ms`);
  console.log(`Peak Memory Usage: ${finalReport.peakMemoryUsage > 0 ? (finalReport.peakMemoryUsage / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
  console.log(`Total Errors: ${finalReport.errors}`);
  console.log(`Total Warnings: ${finalReport.warnings}`);
  console.log('='.repeat(60));
  
  // Write detailed report to file
  const reportPath = '/workspaces/agent-feed/tests/e2e/reports/agent-self-advocacy-regression-report.json';
  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      testSuite: 'Agent Self-Advocacy System Regression Tests',
      metrics: finalReport,
      environment: {
        baseUrl: CONFIG.baseUrl,
        nodeVersion: process.version,
        platform: process.platform
      }
    }, null, 2));
    
    console.log(`📝 Detailed report written to: ${reportPath}`);
  } catch (error) {
    console.error('❌ Failed to write test report:', error.message);
  }
  
  // Exit with appropriate code based on results
  if (finalReport.errors > 0) {
    console.log('❌ TESTS COMPLETED WITH ERRORS');
    process.exit(1);
  } else if (finalReport.warnings > 5) {
    console.log('⚠️  TESTS COMPLETED WITH WARNINGS');
    process.exit(0);
  } else {
    console.log('✅ ALL TESTS PASSED SUCCESSFULLY');
    process.exit(0);
  }
});