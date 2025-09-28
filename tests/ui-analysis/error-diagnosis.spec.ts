import { test } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = join(__dirname, '../screenshots/ui-analysis');

test.describe('Error Diagnosis', () => {
  test('Diagnose loading issues with detailed error capture', async ({ page }) => {
    console.log('🔍 Starting comprehensive error diagnosis...');

    const errors: any[] = [];
    const networkErrors: any[] = [];
    const consoleMessages: any[] = [];

    // Capture all console messages
    page.on('console', (msg) => {
      const message = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      };
      consoleMessages.push(message);
      console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Capture JavaScript errors
    page.on('pageerror', (error) => {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
      errors.push(errorInfo);
      console.log(`[JS ERROR] ${error.message}`);
    });

    // Capture network failures
    page.on('response', (response) => {
      if (!response.ok()) {
        const networkError = {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        };
        networkErrors.push(networkError);
        console.log(`[NETWORK ERROR] ${response.status()} ${response.url()}`);
      }
    });

    // Capture request failures
    page.on('requestfailed', (request) => {
      const requestError = {
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText
      };
      networkErrors.push(requestError);
      console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
    });

    await page.setViewportSize({ width: 1920, height: 1080 });

    try {
      console.log('📄 Navigating to homepage...');
      await page.goto(BASE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      console.log('⏱️  Waiting 10 seconds to capture all errors...');
      await page.waitForTimeout(10000);

      // Check what actually got loaded
      const pageState = await page.evaluate(() => {
        return {
          readyState: document.readyState,
          hasReact: !!(window as any).React,
          hasNextJs: !!(window as any).__NEXT_DATA__,
          nextData: (window as any).__NEXT_DATA__,
          bodyContent: document.body.innerHTML.slice(0, 500),
          scriptTags: Array.from(document.scripts).map(script => ({
            src: script.src,
            loaded: !script.onerror && script.readyState !== 'loading'
          })),
          windowKeys: Object.keys(window).filter(key =>
            key.includes('React') ||
            key.includes('Next') ||
            key.includes('__')
          ).slice(0, 20)
        };
      });

      console.log('\n=== PAGE STATE ANALYSIS ===');
      console.log('📄 Document ready state:', pageState.readyState);
      console.log('⚛️  React available:', pageState.hasReact);
      console.log('🔗 Next.js data available:', pageState.hasNextJs);
      console.log('🪟 Special window keys:', pageState.windowKeys);
      console.log('📜 Script tags loaded:', pageState.scriptTags.filter(s => s.loaded).length, '/', pageState.scriptTags.length);

      if (pageState.nextData) {
        console.log('🔍 Next.js page info:', {
          page: pageState.nextData.page,
          buildId: pageState.nextData.buildId
        });
      }

      // Check for specific React/Next.js loading issues
      const reactDiagnostic = await page.evaluate(() => {
        // Check if React is trying to hydrate
        const rootElement = document.querySelector('#__next');
        const hasContent = rootElement?.children.length || 0;

        // Check for hydration errors in console
        const potentialHydrationError = Array.from(document.querySelectorAll('*')).some(el => {
          return el.textContent?.includes('hydration') ||
                 el.textContent?.includes('mismatch');
        });

        return {
          rootHasContent: hasContent > 0,
          rootContentCount: hasContent,
          potentialHydrationError,
          documentTitle: document.title,
          bodyClasses: document.body.className,
          htmlClasses: document.documentElement.className
        };
      });

      console.log('\n=== REACT/NEXT.JS DIAGNOSIS ===');
      console.log('🆔 Root element has content:', reactDiagnostic.rootHasContent);
      console.log('📊 Root content count:', reactDiagnostic.rootContentCount);
      console.log('🔄 Potential hydration error:', reactDiagnostic.potentialHydrationError);
      console.log('📰 Document title:', `"${reactDiagnostic.documentTitle}"`);

      // Take final screenshot
      const timestamp = Date.now();
      const screenshot = join(SCREENSHOT_DIR, `error-diagnosis-${timestamp}.png`);
      await page.screenshot({
        path: screenshot,
        fullPage: true,
        animations: 'disabled'
      });

      // Generate comprehensive report
      const report = {
        timestamp: new Date().toISOString(),
        url: BASE_URL,
        pageState,
        reactDiagnostic,
        errors,
        networkErrors,
        consoleMessages,
        screenshot,
        analysis: {
          criticalIssues: [],
          recommendations: []
        }
      };

      // Analyze issues
      if (errors.length > 0) {
        report.analysis.criticalIssues.push(`${errors.length} JavaScript errors detected`);
        report.analysis.recommendations.push('Check browser console for detailed error messages');
      }

      if (networkErrors.length > 0) {
        report.analysis.criticalIssues.push(`${networkErrors.length} network errors detected`);
        report.analysis.recommendations.push('Check network tab for failed requests');
      }

      if (!reactDiagnostic.rootHasContent) {
        report.analysis.criticalIssues.push('React app not rendering content');
        report.analysis.recommendations.push('Check React component mounting and hydration');
      }

      if (!pageState.hasReact && pageState.hasNextJs) {
        report.analysis.criticalIssues.push('Next.js detected but React not available');
        report.analysis.recommendations.push('Check React bundle loading');
      }

      if (pageState.scriptTags.some(s => !s.loaded)) {
        report.analysis.criticalIssues.push('Some JavaScript files failed to load');
        report.analysis.recommendations.push('Check script loading order and dependencies');
      }

      // Save detailed report
      const reportPath = join(SCREENSHOT_DIR, `error-diagnosis-${timestamp}.json`);
      const { writeFileSync } = await import('fs');
      writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log('\n=== DIAGNOSIS SUMMARY ===');
      console.log(`📋 Full report saved: ${reportPath}`);
      console.log(`📸 Screenshot saved: ${screenshot}`);
      console.log(`🚨 Critical issues found: ${report.analysis.criticalIssues.length}`);
      console.log(`💡 Recommendations: ${report.analysis.recommendations.length}`);

      if (report.analysis.criticalIssues.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES:');
        report.analysis.criticalIssues.forEach((issue, i) => {
          console.log(`  ${i + 1}. ${issue}`);
        });

        console.log('\n💡 RECOMMENDATIONS:');
        report.analysis.recommendations.forEach((rec, i) => {
          console.log(`  ${i + 1}. ${rec}`);
        });

        console.log('\n🎯 ROOT CAUSE ANALYSIS:');
        console.log('   The "UI styling is all off" issue appears to be caused by:');
        console.log('   - React application not properly hydrating/mounting');
        console.log('   - Application stuck in loading state');
        console.log('   - Potential JavaScript or hydration errors preventing full render');
      } else {
        console.log('\n✅ No critical issues detected in error diagnosis');
      }

    } catch (error) {
      console.error('❌ Diagnosis failed:', error);

      // Emergency screenshot
      try {
        const errorScreenshot = join(SCREENSHOT_DIR, `diagnosis-error-${Date.now()}.png`);
        await page.screenshot({ path: errorScreenshot });
        console.log(`📸 Emergency screenshot: ${errorScreenshot}`);
      } catch (screenshotError) {
        console.error('Failed to take emergency screenshot:', screenshotError);
      }
    }
  });
});