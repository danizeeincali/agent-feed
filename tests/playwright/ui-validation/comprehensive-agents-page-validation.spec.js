const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

// Configuration for comprehensive UI validation
const CONFIG = {
  BACKEND_URL: 'http://localhost:5173',
  FRONTEND_URL: 'http://localhost:3000',
  SCREENSHOT_DIR: '/workspaces/agent-feed/tests/playwright/ui-validation/screenshots',
  VALIDATION_REPORT_PATH: '/workspaces/agent-feed/tests/playwright/ui-validation/comprehensive-validation-report.md'
};

// Ensure screenshot directory exists
test.beforeAll(async () => {
  try {
    await fs.mkdir(CONFIG.SCREENSHOT_DIR, { recursive: true });
  } catch (error) {
    console.log('Screenshot directory already exists or error creating:', error.message);
  }
});

test.describe('Comprehensive Agents Page UI Validation', () => {
  let validationResults = {
    timestamp: new Date().toISOString(),
    backendStatus: null,
    frontendErrors: [],
    screenshots: [],
    networkLogs: [],
    consoleErrors: [],
    recommendations: []
  };

  test.beforeEach(async ({ page }) => {
    // Capture console errors and network issues
    page.on('console', msg => {
      if (msg.type() === 'error') {
        validationResults.consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
          timestamp: new Date().toISOString()
        });
      }
    });

    page.on('response', response => {
      if (!response.ok()) {
        validationResults.networkLogs.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  test('1. Backend API Validation', async ({ request }) => {
    console.log('🔍 Testing backend API at:', CONFIG.BACKEND_URL);

    try {
      const response = await request.get(`${CONFIG.BACKEND_URL}/api/agents`);
      const data = await response.json();

      validationResults.backendStatus = {
        status: response.status(),
        success: data.success,
        agentCount: data.totalAgents,
        data: data
      };

      expect(response.status()).toBe(200);
      expect(data.success).toBe(true);
      expect(data.totalAgents).toBeGreaterThan(0);

      console.log(`✅ Backend API working: ${data.totalAgents} agents loaded`);
    } catch (error) {
      validationResults.backendStatus = { error: error.message };
      console.error('❌ Backend API failed:', error);
      throw error;
    }
  });

  test('2. Frontend Root Page Error Analysis', async ({ page }) => {
    console.log('🔍 Testing frontend root page at:', CONFIG.FRONTEND_URL);

    try {
      const response = await page.goto(CONFIG.FRONTEND_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      const screenshotPath = path.join(CONFIG.SCREENSHOT_DIR, 'frontend-root-error.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      validationResults.screenshots.push({ name: 'frontend-root-error', path: screenshotPath });

      console.log('📸 Root page screenshot saved:', screenshotPath);

      // Try to get error details from the page
      const pageTitle = await page.title();
      const pageContent = await page.content();

      validationResults.frontendErrors.push({
        url: CONFIG.FRONTEND_URL,
        status: response?.status() || 'unknown',
        title: pageTitle,
        hasErrorBoundary: pageContent.includes('error') || pageContent.includes('Error'),
        contentLength: pageContent.length
      });

    } catch (error) {
      console.error('❌ Frontend root page failed:', error);
      validationResults.frontendErrors.push({
        url: CONFIG.FRONTEND_URL,
        error: error.message
      });
    }
  });

  test('3. Agents Page Direct Access', async ({ page }) => {
    console.log('🔍 Testing agents page at:', `${CONFIG.FRONTEND_URL}/agents`);

    try {
      const response = await page.goto(`${CONFIG.FRONTEND_URL}/agents`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      const screenshotPath = path.join(CONFIG.SCREENSHOT_DIR, 'agents-page-error.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      validationResults.screenshots.push({ name: 'agents-page-error', path: screenshotPath });

      console.log('📸 Agents page screenshot saved:', screenshotPath);

      // Check for specific agent dashboard elements
      const pageTitle = await page.title();
      const pageContent = await page.content();

      // Look for expected agent dashboard elements
      const hasAgentGrid = await page.locator('[data-testid="agent-grid"]').count() > 0;
      const hasAgentCards = await page.locator('.agent-card').count() > 0;
      const hasLoadingSpinner = await page.locator('.loading').count() > 0;

      validationResults.frontendErrors.push({
        url: `${CONFIG.FRONTEND_URL}/agents`,
        status: response?.status() || 'unknown',
        title: pageTitle,
        hasAgentGrid,
        hasAgentCards,
        hasLoadingSpinner,
        contentLength: pageContent.length
      });

    } catch (error) {
      console.error('❌ Agents page failed:', error);
      validationResults.frontendErrors.push({
        url: `${CONFIG.FRONTEND_URL}/agents`,
        error: error.message
      });
    }
  });

  test('4. Network Request Analysis', async ({ page }) => {
    console.log('🔍 Analyzing network requests during page load');

    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });

    const responses = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    });

    try {
      await page.goto(`${CONFIG.FRONTEND_URL}/agents`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Filter for API calls
      const apiRequests = requests.filter(req => req.url.includes('/api/'));
      const failedRequests = responses.filter(res => !res.url.includes('favicon') && res.status >= 400);

      validationResults.networkLogs.push({
        totalRequests: requests.length,
        apiRequests: apiRequests.length,
        failedRequests: failedRequests.length,
        apiCalls: apiRequests,
        failures: failedRequests
      });

      console.log(`📊 Network analysis: ${requests.length} requests, ${failedRequests.length} failures`);

    } catch (error) {
      console.error('❌ Network analysis failed:', error);
    }
  });

  test('5. Browser Console Error Collection', async ({ page }) => {
    console.log('🔍 Collecting browser console errors');

    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    try {
      await page.goto(`${CONFIG.FRONTEND_URL}/agents`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Wait a bit to collect console messages
      await page.waitForTimeout(5000);

      const errors = consoleMessages.filter(msg => msg.type === 'error');
      const warnings = consoleMessages.filter(msg => msg.type === 'warning');

      validationResults.consoleErrors = errors;

      console.log(`📋 Console analysis: ${errors.length} errors, ${warnings.length} warnings`);

    } catch (error) {
      console.error('❌ Console error collection failed:', error);
    }
  });

  test('6. Component Inspection and Debugging', async ({ page }) => {
    console.log('🔍 Inspecting React components and debugging state');

    try {
      await page.goto(`${CONFIG.FRONTEND_URL}/agents`, { timeout: 30000 });

      // Check if React is loaded
      const hasReact = await page.evaluate(() => {
        return typeof window.React !== 'undefined';
      });

      // Check for Next.js
      const hasNextJs = await page.evaluate(() => {
        return typeof window.__NEXT_DATA__ !== 'undefined';
      });

      // Look for error boundaries or crash components
      const errorTexts = await page.locator('text=error').allTextContents();
      const errorBoundaryElements = await page.locator('[data-testid*="error"], .error-boundary').count();

      // Check for hydration issues
      const hydrationErrors = await page.evaluate(() => {
        const logs = [];
        const originalError = console.error;
        console.error = (...args) => {
          const message = args.join(' ');
          if (message.includes('hydration') || message.includes('Hydration')) {
            logs.push(message);
          }
          originalError.apply(console, args);
        };
        return logs;
      });

      validationResults.frontendErrors.push({
        debugInfo: {
          hasReact,
          hasNextJs,
          errorTexts,
          errorBoundaryElements,
          hydrationErrors
        }
      });

      console.log(`🔧 Component inspection: React=${hasReact}, Next.js=${hasNextJs}, Errors=${errorTexts.length}`);

    } catch (error) {
      console.error('❌ Component inspection failed:', error);
    }
  });

  test.afterAll(async () => {
    // Generate comprehensive recommendations
    validationResults.recommendations = generateRecommendations(validationResults);

    // Save validation report
    const report = generateValidationReport(validationResults);
    await fs.writeFile(CONFIG.VALIDATION_REPORT_PATH, report, 'utf8');

    console.log('📋 Comprehensive validation report saved:', CONFIG.VALIDATION_REPORT_PATH);
    console.log('\n🎯 KEY FINDINGS:');
    validationResults.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  });
});

function generateRecommendations(results) {
  const recommendations = [];

  // Backend analysis
  if (results.backendStatus?.success) {
    recommendations.push('✅ Backend API is working correctly with real agent data');
  } else {
    recommendations.push('❌ Backend API issues need to be resolved first');
  }

  // Frontend error analysis
  if (results.frontendErrors.length > 0) {
    recommendations.push('🔍 Frontend is returning 500 errors - check Next.js server logs');
  }

  // Console error analysis
  if (results.consoleErrors.length > 0) {
    recommendations.push(`🐛 ${results.consoleErrors.length} console errors detected - investigate React/Next.js issues`);
  }

  // Network analysis
  const networkIssues = results.networkLogs.filter(log => log.status >= 400);
  if (networkIssues.length > 0) {
    recommendations.push(`🌐 ${networkIssues.length} network failures detected - check API endpoints`);
  }

  // Specific recommendations based on patterns
  recommendations.push('🔧 Check Next.js build process and server startup');
  recommendations.push('📝 Examine frontend/pages/_app.tsx for initialization errors');
  recommendations.push('⚛️ Verify React component hydration and SSR setup');
  recommendations.push('🔍 Check for missing dependencies or build artifacts');

  return recommendations;
}

function generateValidationReport(results) {
  return `# Comprehensive Agents Page UI Validation Report

**Generated:** ${results.timestamp}

## Executive Summary

This report provides a comprehensive analysis of the agents page UI validation, including backend API status, frontend errors, network issues, and specific recommendations for resolution.

## Backend API Status

${results.backendStatus?.success ?
  `✅ **WORKING** - Backend API is functional with ${results.backendStatus.agentCount} agents loaded` :
  `❌ **FAILED** - Backend API issues: ${results.backendStatus?.error || 'Unknown error'}`
}

## Frontend Analysis

### Error Summary
- Total frontend errors detected: ${results.frontendErrors.length}
- Console errors: ${results.consoleErrors.length}
- Network failures: ${results.networkLogs.length}

### Screenshots Captured
${results.screenshots.map(s => `- ${s.name}: ${s.path}`).join('\n')}

### Console Errors
${results.consoleErrors.map(err => `- **${err.timestamp}**: ${err.text} (${err.location?.url || 'unknown'})`).join('\n')}

### Network Issues
${results.networkLogs.map(log => `- **${log.status}** ${log.url}: ${log.statusText}`).join('\n')}

## Recommendations

${results.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

## Next Steps

1. **Immediate**: Check Next.js server logs for specific error details
2. **Priority**: Verify frontend build process and dependencies
3. **Investigation**: Examine React component hydration issues
4. **Testing**: Validate API proxy configuration in Next.js
5. **Monitoring**: Set up error tracking for production readiness

## Technical Details

### Backend Response
\`\`\`json
${JSON.stringify(results.backendStatus, null, 2)}
\`\`\`

### Frontend Errors
\`\`\`json
${JSON.stringify(results.frontendErrors, null, 2)}
\`\`\`

---

*Report generated by Playwright MCP Comprehensive UI Validation Suite*
`;
}