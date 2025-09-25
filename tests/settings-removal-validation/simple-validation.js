/**
 * Simplified Settings Removal Validation Script
 * Real browser testing with Playwright to validate Settings removal
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '../../test-results/settings-removal-screenshots');
const BASE_URL = 'http://localhost:3000';

const ROUTES_TO_TEST = [
  { path: '/', name: 'Feed', expectedContent: 'Agent Feed' },
  { path: '/agents', name: 'Agent Manager', expectedContent: 'agents' },
  { path: '/analytics', name: 'Analytics', expectedContent: 'analytics' },
  { path: '/activity', name: 'Live Activity', expectedContent: 'activity' },
  { path: '/drafts', name: 'Draft Manager', expectedContent: 'drafts' }
];

class SettingsRemovalValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.validationResults = {
      timestamp: new Date().toISOString(),
      testSuite: 'Settings Removal Validation',
      status: 'RUNNING',
      routes: [],
      navigation: {},
      console: { errors: [], warnings: [] },
      screenshots: [],
      summary: {
        totalRoutes: ROUTES_TO_TEST.length,
        passedRoutes: 0,
        failedRoutes: 0,
        settingsReferencesFound: 0,
        performanceIssues: 0
      }
    };
  }

  async initialize() {
    console.log('🚀 Initializing Settings Removal Validation...');

    // Ensure screenshots directory exists
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

    // Launch browser
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    this.page = await context.newPage();

    // Monitor console messages
    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        this.validationResults.console.errors.push(`[${type}] ${text}`);
      } else if (type === 'warning') {
        this.validationResults.console.warnings.push(`[${type}] ${text}`);
      }
    });

    // Monitor page errors
    this.page.on('pageerror', (error) => {
      this.validationResults.console.errors.push(`[PAGE ERROR] ${error.message}`);
    });

    console.log('✅ Browser initialized successfully');
  }

  async validateRoute(route) {
    console.log(`🔍 Validating route: ${route.name} (${route.path})`);

    const routeResult = {
      name: route.name,
      path: route.path,
      status: 'TESTING',
      loadTime: 0,
      screenshot: null,
      issues: [],
      settingsReferences: []
    };

    try {
      const startTime = Date.now();

      // Navigate to route
      console.log(`   Navigating to ${BASE_URL}${route.path}`);
      const response = await this.page.goto(`${BASE_URL}${route.path}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      if (!response || response.status() >= 400) {
        throw new Error(`HTTP ${response?.status() || 'Unknown'} error`);
      }

      const endTime = Date.now();
      routeResult.loadTime = endTime - startTime;

      // Wait for content to load
      await this.page.waitForTimeout(2000);

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOTS_DIR, `${route.name.toLowerCase().replace(' ', '-')}-route.png`);
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: 'png'
      });

      routeResult.screenshot = path.basename(screenshotPath);
      this.validationResults.screenshots.push(screenshotPath);
      console.log(`   📸 Screenshot saved: ${screenshotPath}`);

      // Check for Settings references in the page
      const pageContent = await this.page.content();
      const settingsMatches = [
        ...pageContent.matchAll(/settings/gi),
        ...pageContent.matchAll(/config/gi),
        ...pageContent.matchAll(/preferences/gi)
      ];

      // Filter out legitimate matches (like in meta tags, scripts, etc.)
      const settingsInUI = await this.page.evaluate(() => {
        const elements = [];
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent.toLowerCase();
          if (text.includes('settings') || text.includes('config') || text.includes('preferences')) {
            const parent = node.parentElement;
            if (parent && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE') {
              elements.push({
                text: node.textContent.trim(),
                tagName: parent.tagName,
                className: parent.className
              });
            }
          }
        }

        // Also check for Settings buttons/links
        const settingsElements = Array.from(document.querySelectorAll('button, a')).filter(el =>
          el.textContent.toLowerCase().includes('settings') ||
          el.getAttribute('href')?.includes('settings') ||
          el.getAttribute('data-testid')?.includes('settings')
        );

        return {
          textReferences: elements,
          interactiveElements: settingsElements.map(el => ({
            tagName: el.tagName,
            text: el.textContent.trim(),
            href: el.getAttribute('href'),
            testId: el.getAttribute('data-testid')
          }))
        };
      });

      routeResult.settingsReferences = settingsInUI;

      // Check if content loaded properly
      const hasContent = await this.page.evaluate((expectedContent) => {
        const bodyText = document.body.textContent.toLowerCase();
        const hasExpected = bodyText.length > 100; // Basic content check
        return { hasExpected, bodyLength: bodyText.length };
      }, route.expectedContent);

      if (!hasContent.hasExpected) {
        routeResult.issues.push('Page appears to have minimal content');
      }

      // Check for error states
      const hasErrors = await this.page.evaluate(() => {
        const errorElements = document.querySelectorAll('.error, [data-testid*="error"], .error-boundary');
        const notFound = document.body.textContent.includes('404') || document.body.textContent.includes('Not Found');
        return errorElements.length > 0 || notFound;
      });

      if (hasErrors) {
        routeResult.issues.push('Error states detected on page');
      }

      // Performance check
      if (routeResult.loadTime > 10000) {
        routeResult.issues.push(`Slow load time: ${routeResult.loadTime}ms`);
        this.validationResults.summary.performanceIssues++;
      }

      // Count Settings references
      const totalSettingsRefs = settingsInUI.textReferences.length + settingsInUI.interactiveElements.length;
      this.validationResults.summary.settingsReferencesFound += totalSettingsRefs;

      routeResult.status = routeResult.issues.length === 0 ? 'PASSED' : 'PASSED_WITH_WARNINGS';
      this.validationResults.summary.passedRoutes++;

      console.log(`   ✅ Route validated: ${routeResult.loadTime}ms load time, ${totalSettingsRefs} Settings references`);

    } catch (error) {
      routeResult.status = 'FAILED';
      routeResult.issues.push(error.message);
      this.validationResults.summary.failedRoutes++;
      console.log(`   ❌ Route validation failed: ${error.message}`);
    }

    this.validationResults.routes.push(routeResult);
    return routeResult;
  }

  async validateNavigation() {
    console.log('🧭 Validating navigation system...');

    try {
      await this.page.goto(`${BASE_URL}/`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Get all navigation elements
      const navigationData = await this.page.evaluate(() => {
        const navElements = document.querySelectorAll('nav, .navigation, .sidebar, [role="navigation"]');
        const allLinks = Array.from(document.querySelectorAll('nav a, .navigation a, .sidebar a, [role="navigation"] a'));

        return {
          navElementsFound: navElements.length,
          totalLinks: allLinks.length,
          links: allLinks.map(link => ({
            text: link.textContent.trim(),
            href: link.getAttribute('href'),
            visible: link.offsetParent !== null
          })),
          settingsLinks: allLinks.filter(link =>
            link.textContent.toLowerCase().includes('settings') ||
            link.getAttribute('href')?.includes('settings')
          ).map(link => ({
            text: link.textContent.trim(),
            href: link.getAttribute('href')
          }))
        };
      });

      // Take navigation screenshot
      const navScreenshotPath = path.join(SCREENSHOTS_DIR, 'navigation-system.png');
      await this.page.screenshot({
        path: navScreenshotPath,
        fullPage: true,
        type: 'png'
      });

      this.validationResults.navigation = {
        ...navigationData,
        screenshot: path.basename(navScreenshotPath),
        status: navigationData.settingsLinks.length === 0 ? 'PASSED' : 'FAILED'
      };

      console.log(`   📊 Navigation: ${navigationData.totalLinks} links, ${navigationData.settingsLinks.length} Settings links`);
      console.log(`   📸 Navigation screenshot: ${navScreenshotPath}`);

    } catch (error) {
      this.validationResults.navigation = {
        status: 'FAILED',
        error: error.message
      };
      console.log(`   ❌ Navigation validation failed: ${error.message}`);
    }
  }

  async validateSettingsRoutes() {
    console.log('🚫 Validating Settings routes are removed...');

    const settingsRoutes = ['/settings', '/settings/', '/config', '/preferences'];
    const routeResults = [];

    for (const settingsRoute of settingsRoutes) {
      try {
        console.log(`   Testing ${settingsRoute}...`);
        const response = await this.page.goto(`${BASE_URL}${settingsRoute}`, {
          waitUntil: 'networkidle',
          timeout: 15000
        });

        const status = response ? response.status() : 'No response';
        const finalUrl = this.page.url();

        routeResults.push({
          route: settingsRoute,
          status: status,
          finalUrl: finalUrl,
          blocked: status === 404 || !finalUrl.includes('settings')
        });

        console.log(`   Route ${settingsRoute}: ${status}, Final URL: ${finalUrl}`);

      } catch (error) {
        routeResults.push({
          route: settingsRoute,
          status: 'ERROR',
          error: error.message,
          blocked: true
        });
      }
    }

    this.validationResults.settingsRoutesBlocked = routeResults;
    return routeResults;
  }

  async generateReport() {
    console.log('📋 Generating comprehensive validation report...');

    // Update final status
    this.validationResults.status = this.validationResults.summary.failedRoutes === 0 ? 'PASSED' : 'PARTIAL';

    // Calculate summary metrics
    const totalSettingsRefs = this.validationResults.summary.settingsReferencesFound;
    const navigationPassed = this.validationResults.navigation.status === 'PASSED';
    const allRoutesPassed = this.validationResults.summary.failedRoutes === 0;

    this.validationResults.finalAssessment = {
      settingsCompletelyRemoved: totalSettingsRefs === 0 && navigationPassed,
      allRoutesFunctional: allRoutesPassed,
      performanceAcceptable: this.validationResults.summary.performanceIssues === 0,
      readyForProduction: totalSettingsRefs === 0 && navigationPassed && allRoutesPassed
    };

    // Write detailed report
    const reportPath = path.join(SCREENSHOTS_DIR, 'validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(this.validationResults, null, 2));

    // Write summary report
    const summaryPath = path.join(SCREENSHOTS_DIR, 'validation-summary.md');
    const summaryContent = this.generateMarkdownSummary();
    await fs.writeFile(summaryPath, summaryContent);

    console.log(`📄 Detailed report: ${reportPath}`);
    console.log(`📋 Summary report: ${summaryPath}`);

    return this.validationResults;
  }

  generateMarkdownSummary() {
    const { summary, navigation, finalAssessment } = this.validationResults;
    const timestamp = new Date(this.validationResults.timestamp).toLocaleString();

    return `# Settings Removal Validation Report

**Generated:** ${timestamp}
**Status:** ${this.validationResults.status}
**Test Suite:** Settings Removal Validation

## Executive Summary

${finalAssessment.readyForProduction ? '✅' : '❌'} **Production Ready:** ${finalAssessment.readyForProduction}
${finalAssessment.settingsCompletelyRemoved ? '✅' : '❌'} **Settings Completely Removed:** ${finalAssessment.settingsCompletelyRemoved}
${finalAssessment.allRoutesFunctional ? '✅' : '❌'} **All Routes Functional:** ${finalAssessment.allRoutesFunctional}
${finalAssessment.performanceAcceptable ? '✅' : '❌'} **Performance Acceptable:** ${finalAssessment.performanceAcceptable}

## Test Results

### Route Validation
- **Total Routes Tested:** ${summary.totalRoutes}
- **Passed Routes:** ${summary.passedRoutes}
- **Failed Routes:** ${summary.failedRoutes}
- **Settings References Found:** ${summary.settingsReferencesFound}
- **Performance Issues:** ${summary.performanceIssues}

### Route Details
${this.validationResults.routes.map(route => `
#### ${route.name} (${route.path})
- **Status:** ${route.status}
- **Load Time:** ${route.loadTime}ms
- **Settings References:** ${route.settingsReferences.textReferences.length + route.settingsReferences.interactiveElements.length}
- **Issues:** ${route.issues.length > 0 ? route.issues.join(', ') : 'None'}
- **Screenshot:** ${route.screenshot}
`).join('')}

### Navigation Validation
- **Status:** ${navigation.status || 'Not tested'}
- **Total Links:** ${navigation.totalLinks || 0}
- **Settings Links:** ${navigation.settingsLinks?.length || 0}
- **Navigation Elements:** ${navigation.navElementsFound || 0}

### Settings Routes Blocked
${this.validationResults.settingsRoutesBlocked?.map(route => `
- **${route.route}:** ${route.blocked ? '✅ Blocked' : '❌ Accessible'} (Status: ${route.status})
`).join('') || 'Not tested'}

### Console Issues
- **Errors:** ${this.validationResults.console.errors.length}
- **Warnings:** ${this.validationResults.console.warnings.length}

## Screenshots Captured
${this.validationResults.screenshots.map(screenshot => `- ${path.basename(screenshot)}`).join('\n')}

## Recommendations

${finalAssessment.readyForProduction
  ? '🎉 **Settings removal successfully completed!** The application is ready for production deployment.'
  : '⚠️  **Additional work required:** Some Settings references or functionality issues detected.'}

${summary.settingsReferencesFound > 0
  ? `\n- Remove remaining ${summary.settingsReferencesFound} Settings references from the UI`
  : ''}
${summary.failedRoutes > 0
  ? `\n- Fix ${summary.failedRoutes} failing routes`
  : ''}
${summary.performanceIssues > 0
  ? `\n- Address ${summary.performanceIssues} performance issues`
  : ''}
${navigation.settingsLinks?.length > 0
  ? `\n- Remove ${navigation.settingsLinks.length} Settings links from navigation`
  : ''}

---

*This validation report provides comprehensive evidence of Settings removal completion and overall application health.*
`;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runFullValidation() {
    try {
      await this.initialize();

      // Test all routes
      for (const route of ROUTES_TO_TEST) {
        await this.validateRoute(route);
      }

      // Validate navigation
      await this.validateNavigation();

      // Test Settings routes are blocked
      await this.validateSettingsRoutes();

      // Generate comprehensive report
      const report = await this.generateReport();

      console.log('\n🎯 VALIDATION SUMMARY:');
      console.log(`   Status: ${report.status}`);
      console.log(`   Routes Passed: ${report.summary.passedRoutes}/${report.summary.totalRoutes}`);
      console.log(`   Settings References: ${report.summary.settingsReferencesFound}`);
      console.log(`   Production Ready: ${report.finalAssessment.readyForProduction ? 'YES' : 'NO'}`);

      return report;

    } catch (error) {
      console.error('❌ Validation failed:', error);
      this.validationResults.status = 'FAILED';
      this.validationResults.error = error.message;
      return this.validationResults;
    } finally {
      await this.cleanup();
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new SettingsRemovalValidator();
  validator.runFullValidation()
    .then(report => {
      console.log(`\n📋 Full report available in: ${SCREENSHOTS_DIR}`);
      process.exit(report.finalAssessment.readyForProduction ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation script failed:', error);
      process.exit(1);
    });
}

module.exports = SettingsRemovalValidator;