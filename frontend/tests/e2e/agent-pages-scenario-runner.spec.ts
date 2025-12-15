import { test, expect } from '../config/test-setup';
import { AgentPagesScenarios, ScenarioReporter } from '../utils/test-scenarios';
import { BrowserDebugger } from '../utils/debug-helpers';

test.describe('Agent Pages Scenario Runner', () => {
  let reporter: ScenarioReporter;
  let debugger: BrowserDebugger;

  test.beforeAll(async () => {
    reporter = new ScenarioReporter();
  });

  test.beforeEach(async ({ page }) => {
    debugger = new BrowserDebugger();
    await debugger.setupApiInterception(page);
    await debugger.setupComponentTracking(page);
  });

  test.afterAll(async () => {
    const report = reporter.generateReport();
    console.log('\n=== SCENARIO EXECUTION REPORT ===');
    console.log(report);
  });

  test('Execute Main Navigation Flow Scenario', async ({ page }) => {
    const scenario = AgentPagesScenarios.MAIN_NAVIGATION_FLOW;
    const startTime = Date.now();
    
    try {
      console.log(`🎬 Starting scenario: ${scenario.name}`);
      
      await AgentPagesScenarios.executeScenario(page, scenario);
      
      // Additional verification using debugger data
      const apiCalls = debugger.getApiCalls();
      const agentApiCalls = apiCalls.filter(call => call.url.includes('/agents/'));
      const pageApiCalls = apiCalls.filter(call => call.url.includes('/pages/'));
      
      console.log(`📊 API calls made: ${apiCalls.length}`);
      console.log(`🤖 Agent API calls: ${agentApiCalls.length}`);
      console.log(`📄 Page API calls: ${pageApiCalls.length}`);
      
      // Verify critical assertions
      expect(agentApiCalls.length).toBeGreaterThan(0);
      
      // Check for successful API responses
      const failedApiCalls = apiCalls.filter(call => call.status >= 400);
      expect(failedApiCalls.length).toBe(0);
      
      // Verify page content
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('No pages yet');
      expect(bodyText?.length || 0).toBeGreaterThan(100);
      
      const duration = Date.now() - startTime;
      reporter.recordResult(scenario, true, duration);
      
      console.log(`✅ Scenario completed successfully in ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      reporter.recordResult(scenario, false, duration, errorMessage);
      
      console.log(`❌ Scenario failed: ${errorMessage}`);
      
      // Capture debug information on failure
      await page.screenshot({ 
        path: `/workspaces/agent-feed/frontend/tests/screenshots/main-nav-failure-${Date.now()}.png`,
        fullPage: true 
      });
      
      const debugReport = debugger.generateDebugReport();
      console.log('\n=== DEBUG REPORT (FAILURE) ===');
      console.log(debugReport);
      
      throw error;
    }
  });

  test('Execute Direct URL Access Scenario', async ({ page }) => {
    const scenario = AgentPagesScenarios.DIRECT_URL_ACCESS;
    const startTime = Date.now();
    
    try {
      console.log(`🎬 Starting scenario: ${scenario.name}`);
      
      // Capture initial state
      const initialApiCallCount = debugger.getApiCalls().length;
      
      await AgentPagesScenarios.executeScenario(page, scenario);
      
      // Verify API calls were triggered by direct access
      const finalApiCalls = debugger.getApiCalls();
      const newApiCalls = finalApiCalls.slice(initialApiCallCount);
      
      console.log(`📊 New API calls from direct access: ${newApiCalls.length}`);
      
      // Critical assertion: direct access should trigger API calls
      expect(newApiCalls.length).toBeGreaterThan(0);
      
      // Verify page loaded successfully
      const currentUrl = page.url();
      expect(currentUrl).toContain('personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d');
      
      // Check page content
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeDefined();
      expect(pageContent).not.toContain('No pages yet');
      
      const duration = Date.now() - startTime;
      reporter.recordResult(scenario, true, duration);
      
      console.log(`✅ Direct access scenario completed successfully in ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      reporter.recordResult(scenario, false, duration, errorMessage);
      
      console.log(`❌ Direct access scenario failed: ${errorMessage}`);
      
      // Capture failure state
      await page.screenshot({ 
        path: `/workspaces/agent-feed/frontend/tests/screenshots/direct-access-failure-${Date.now()}.png`,
        fullPage: true 
      });
      
      throw error;
    }
  });

  test('Execute API Response Validation Scenario', async ({ page }) => {
    const scenario = AgentPagesScenarios.API_RESPONSE_VALIDATION;
    const startTime = Date.now();
    
    try {
      console.log(`🎬 Starting scenario: ${scenario.name}`);
      
      // Navigate to target page
      await page.goto('http://127.0.0.1:5173/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d');
      await page.waitForLoadState('networkidle');
      
      // Wait for potential delayed API calls
      await page.waitForTimeout(2000);
      
      const apiCalls = debugger.getApiCalls();
      
      console.log(`📊 Total API calls captured: ${apiCalls.length}`);
      
      // Expected API endpoints
      const expectedEndpoints = [
        '/api/agents',
        '/api/pages',
        '/workspace'
      ];
      
      // Check that at least one expected endpoint was called
      const foundEndpoints = expectedEndpoints.filter(endpoint =>
        apiCalls.some(call => call.url.includes(endpoint))
      );
      
      console.log(`✅ Found expected endpoints: ${foundEndpoints.join(', ')}`);
      
      // Verify API response quality
      const successfulCalls = apiCalls.filter(call => call.status >= 200 && call.status < 300);
      const failedCalls = apiCalls.filter(call => call.status >= 400);
      
      console.log(`📊 Successful API calls: ${successfulCalls.length}`);
      console.log(`📊 Failed API calls: ${failedCalls.length}`);
      
      // Log failed calls for debugging
      if (failedCalls.length > 0) {
        console.log('❌ Failed API calls:');
        failedCalls.forEach(call => {
          console.log(`   - ${call.method} ${call.url} → ${call.status}`);
        });
      }
      
      // Assertions
      expect(apiCalls.length).toBeGreaterThan(0);
      expect(foundEndpoints.length).toBeGreaterThan(0);
      
      // Critical errors should not occur
      const criticalErrors = failedCalls.filter(call => call.status >= 500);
      expect(criticalErrors.length).toBe(0);
      
      const duration = Date.now() - startTime;
      reporter.recordResult(scenario, true, duration);
      
      console.log(`✅ API validation scenario completed successfully in ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      reporter.recordResult(scenario, false, duration, errorMessage);
      
      console.log(`❌ API validation scenario failed: ${errorMessage}`);
      
      // Capture API state on failure
      const apiReport = debugger.generateDebugReport();
      console.log('\n=== API DEBUG REPORT (FAILURE) ===');
      console.log(apiReport);
      
      throw error;
    }
  });

  test('Execute All Scenarios in Sequence', async ({ page }) => {
    console.log('🎬 Running all scenarios in sequence for comprehensive analysis');
    
    const scenarios = AgentPagesScenarios.getAllScenarios();
    const results = [];
    
    for (const scenario of scenarios) {
      try {
        const startTime = Date.now();
        
        // Reset debugger for each scenario
        debugger = new BrowserDebugger();
        await debugger.setupApiInterception(page);
        await debugger.setupComponentTracking(page);
        
        await AgentPagesScenarios.executeScenario(page, scenario);
        
        const duration = Date.now() - startTime;
        results.push({ scenario: scenario.name, success: true, duration });
        
        console.log(`✅ ${scenario.name} completed in ${duration}ms`);
        
      } catch (error) {
        const duration = Date.now();
        results.push({ 
          scenario: scenario.name, 
          success: false, 
          duration,
          error: error instanceof Error ? error.message : String(error)
        });
        
        console.log(`❌ ${scenario.name} failed: ${error}`);
        
        // Continue with other scenarios even if one fails
      }
    }
    
    // Summary report
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    console.log('\n📊 SEQUENCE EXECUTION SUMMARY:');
    console.log(`Total Scenarios: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);
    
    // At least one scenario should pass for basic functionality
    expect(successful).toBeGreaterThan(0);
  });
});