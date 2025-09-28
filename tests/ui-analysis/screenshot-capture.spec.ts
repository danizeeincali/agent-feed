import { test, expect, Page } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = join(__dirname, '../screenshots/ui-analysis');
const VIEWPORT_SIZES = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 }
];

const TEST_ROUTES = [
  { path: '/', name: 'homepage' },
  { path: '/agents', name: 'agents-page' }
];

interface UIAnalysisResult {
  route: string;
  viewport: string;
  cssLoaded: boolean;
  responsiveIssues: string[];
  accessibilityIssues: string[];
  componentIssues: string[];
  performanceIssues: string[];
  screenshotPath: string;
  timestamp: string;
}

class UIAnalyzer {
  private results: UIAnalysisResult[] = [];

  async analyzePage(page: Page, route: string, viewport: string): Promise<UIAnalysisResult> {
    const timestamp = new Date().toISOString();
    const screenshotName = `${route.replace('/', 'root').replace(/[^a-zA-Z0-9]/g, '-')}-${viewport}-${Date.now()}.png`;
    const screenshotPath = join(SCREENSHOT_DIR, screenshotName);

    // Check if CSS is properly loaded
    const cssLoaded = await this.checkCSSLoading(page);

    // Analyze responsive design issues
    const responsiveIssues = await this.checkResponsiveDesign(page);

    // Check accessibility issues
    const accessibilityIssues = await this.checkAccessibility(page);

    // Analyze component rendering issues
    const componentIssues = await this.checkComponentRendering(page);

    // Check performance issues
    const performanceIssues = await this.checkPerformanceIssues(page);

    // Take full page screenshot
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      animations: 'disabled'
    });

    const result: UIAnalysisResult = {
      route,
      viewport,
      cssLoaded,
      responsiveIssues,
      accessibilityIssues,
      componentIssues,
      performanceIssues,
      screenshotPath,
      timestamp
    };

    this.results.push(result);
    return result;
  }

  private async checkCSSLoading(page: Page): Promise<boolean> {
    try {
      // Check if Tailwind classes are applied
      const hasStyles = await page.evaluate(() => {
        const testElement = document.createElement('div');
        testElement.className = 'bg-blue-500 p-4 text-white';
        document.body.appendChild(testElement);

        const computedStyle = window.getComputedStyle(testElement);
        const hasBackground = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                             computedStyle.backgroundColor !== 'transparent';
        const hasPadding = computedStyle.padding !== '0px';
        const hasColor = computedStyle.color !== 'rgba(0, 0, 0, 0)';

        document.body.removeChild(testElement);
        return hasBackground && hasPadding && hasColor;
      });

      // Check for CSS load errors
      const cssErrors = await page.evaluate(() => {
        const styleSheets = Array.from(document.styleSheets);
        return styleSheets.some(sheet => {
          try {
            // Try to access cssRules to check if stylesheet loaded
            return sheet.cssRules === null;
          } catch (e) {
            return true;
          }
        });
      });

      return hasStyles && !cssErrors;
    } catch (error) {
      console.warn('CSS loading check failed:', error);
      return false;
    }
  }

  private async checkResponsiveDesign(page: Page): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Check for horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalOverflow) {
        issues.push('Horizontal overflow detected - content extends beyond viewport width');
      }

      // Check for fixed widths that might break responsive design
      const hasFixedWidths = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let fixedWidthElements = 0;

        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const width = style.width;
          if (width && width.includes('px') && parseInt(width) > 500) {
            fixedWidthElements++;
          }
        });

        return fixedWidthElements > 5;
      });

      if (hasFixedWidths) {
        issues.push('Multiple elements with large fixed pixel widths detected');
      }

      // Check for text that might be too small on mobile
      const viewport = page.viewportSize();
      if (viewport && viewport.width < 768) {
        const smallTextExists = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          let smallTextElements = 0;

          elements.forEach(el => {
            const style = window.getComputedStyle(el);
            const fontSize = parseInt(style.fontSize);
            if (fontSize && fontSize < 14) {
              smallTextElements++;
            }
          });

          return smallTextElements > 10;
        });

        if (smallTextExists) {
          issues.push('Multiple elements with very small font sizes detected on mobile viewport');
        }
      }

    } catch (error) {
      issues.push(`Error checking responsive design: ${error}`);
    }

    return issues;
  }

  private async checkAccessibility(page: Page): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Check for missing alt attributes on images
      const missingAltTags = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        return Array.from(images).filter(img => !img.getAttribute('alt')).length;
      });

      if (missingAltTags > 0) {
        issues.push(`${missingAltTags} images missing alt attributes`);
      }

      // Check for insufficient color contrast (basic check)
      const lowContrastElements = await page.evaluate(() => {
        let lowContrastCount = 0;
        const elements = document.querySelectorAll('*');

        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          const backgroundColor = style.backgroundColor;

          // Basic check for white text on white background or similar
          if (color === 'rgb(255, 255, 255)' &&
              (backgroundColor === 'rgb(255, 255, 255)' ||
               backgroundColor === 'transparent' ||
               backgroundColor === 'rgba(0, 0, 0, 0)')) {
            lowContrastCount++;
          }
        });

        return lowContrastCount;
      });

      if (lowContrastElements > 0) {
        issues.push(`${lowContrastElements} elements with potentially low color contrast`);
      }

      // Check for missing focus indicators
      const elementsWithoutFocus = await page.evaluate(() => {
        const focusableElements = document.querySelectorAll(
          'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
        );
        let noFocusCount = 0;

        focusableElements.forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.outlineStyle === 'none' &&
              style.boxShadow === 'none' &&
              !el.getAttribute('data-focus-visible-added')) {
            noFocusCount++;
          }
        });

        return noFocusCount;
      });

      if (elementsWithoutFocus > 5) {
        issues.push(`${elementsWithoutFocus} focusable elements without visible focus indicators`);
      }

    } catch (error) {
      issues.push(`Error checking accessibility: ${error}`);
    }

    return issues;
  }

  private async checkComponentRendering(page: Page): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Check for React hydration errors
      const reactErrors = await page.evaluate(() => {
        const errors: string[] = [];

        // Check for hydration mismatches
        if (window.console) {
          const originalError = console.error;
          const capturedErrors: string[] = [];

          console.error = (...args) => {
            const message = args.join(' ');
            if (message.includes('hydration') ||
                message.includes('mismatch') ||
                message.includes('render')) {
              capturedErrors.push(message);
            }
            originalError.apply(console, args);
          };

          return capturedErrors;
        }

        return errors;
      });

      issues.push(...reactErrors);

      // Check for empty or broken components
      const emptyComponents = await page.evaluate(() => {
        const suspiciousElements = document.querySelectorAll('[data-testid], [class*="component"], [class*="Component"]');
        let emptyCount = 0;

        suspiciousElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            emptyCount++;
          }
        });

        return emptyCount;
      });

      if (emptyComponents > 0) {
        issues.push(`${emptyComponents} components appear to have zero dimensions`);
      }

      // Check for loading states that never resolve
      const stuckLoadingStates = await page.evaluate(() => {
        const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], [data-loading="true"]');
        return loadingElements.length;
      });

      if (stuckLoadingStates > 3) {
        issues.push(`${stuckLoadingStates} loading indicators detected - possible stuck loading states`);
      }

      // Check for JavaScript errors
      const jsErrors = await page.evaluate(() => {
        // @ts-ignore
        return window.jsErrors || [];
      });

      if (jsErrors.length > 0) {
        issues.push(`${jsErrors.length} JavaScript errors detected`);
      }

    } catch (error) {
      issues.push(`Error checking component rendering: ${error}`);
    }

    return issues;
  }

  private async checkPerformanceIssues(page: Page): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Check for large images
      const largeImages = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        let largeImageCount = 0;

        images.forEach(img => {
          if (img.naturalWidth > 2000 || img.naturalHeight > 2000) {
            largeImageCount++;
          }
        });

        return largeImageCount;
      });

      if (largeImages > 0) {
        issues.push(`${largeImages} large images detected (>2000px) - consider optimization`);
      }

      // Check for excessive DOM nodes
      const domNodeCount = await page.evaluate(() => {
        return document.querySelectorAll('*').length;
      });

      if (domNodeCount > 1500) {
        issues.push(`High DOM node count: ${domNodeCount} elements (recommended <1500)`);
      }

      // Check for layout shifts
      const performanceEntries = await page.evaluate(() => {
        // @ts-ignore
        return performance.getEntriesByType('layout-shift')?.length || 0;
      });

      if (performanceEntries > 5) {
        issues.push(`${performanceEntries} layout shift events detected`);
      }

    } catch (error) {
      issues.push(`Error checking performance: ${error}`);
    }

    return issues;
  }

  getResults(): UIAnalysisResult[] {
    return this.results;
  }

  generateReport(): string {
    const criticalIssues = this.results.filter(result =>
      !result.cssLoaded ||
      result.responsiveIssues.length > 0 ||
      result.componentIssues.length > 2
    );

    let report = '# UI Analysis Report\\n\\n';
    report += `**Analysis Date:** ${new Date().toISOString()}\\n`;
    report += `**Total Pages Analyzed:** ${this.results.length}\\n`;
    report += `**Critical Issues Found:** ${criticalIssues.length}\\n\\n`;

    if (criticalIssues.length > 0) {
      report += '## 🚨 Critical Issues\\n\\n';
      criticalIssues.forEach(result => {
        report += `### ${result.route} (${result.viewport})\\n`;
        if (!result.cssLoaded) {
          report += '- ❌ **CSS Loading Issue**: Styles not properly loaded\\n';
        }
        result.responsiveIssues.forEach(issue => {
          report += `- 📱 **Responsive Issue**: ${issue}\\n`;
        });
        result.componentIssues.forEach(issue => {
          report += `- 🔧 **Component Issue**: ${issue}\\n`;
        });
        report += '\\n';
      });
    }

    report += '## 📊 Detailed Analysis\\n\\n';
    this.results.forEach(result => {
      report += `### ${result.route} - ${result.viewport}\\n`;
      report += `- **CSS Loaded**: ${result.cssLoaded ? '✅' : '❌'}\\n`;
      report += `- **Responsive Issues**: ${result.responsiveIssues.length}\\n`;
      report += `- **Accessibility Issues**: ${result.accessibilityIssues.length}\\n`;
      report += `- **Component Issues**: ${result.componentIssues.length}\\n`;
      report += `- **Performance Issues**: ${result.performanceIssues.length}\\n`;
      report += `- **Screenshot**: ${result.screenshotPath}\\n\\n`;

      if (result.responsiveIssues.length > 0) {
        report += '**Responsive Issues:**\\n';
        result.responsiveIssues.forEach(issue => report += `  - ${issue}\\n`);
        report += '\\n';
      }

      if (result.accessibilityIssues.length > 0) {
        report += '**Accessibility Issues:**\\n';
        result.accessibilityIssues.forEach(issue => report += `  - ${issue}\\n`);
        report += '\\n';
      }

      if (result.componentIssues.length > 0) {
        report += '**Component Issues:**\\n';
        result.componentIssues.forEach(issue => report += `  - ${issue}\\n`);
        report += '\\n';
      }

      if (result.performanceIssues.length > 0) {
        report += '**Performance Issues:**\\n';
        result.performanceIssues.forEach(issue => report += `  - ${issue}\\n`);
        report += '\\n';
      }
    });

    return report;
  }
}

test.describe('UI Analysis and Screenshot Capture', () => {
  let analyzer: UIAnalyzer;

  test.beforeAll(async () => {
    analyzer = new UIAnalyzer();

    // Ensure screenshot directory exists
    const { existsSync, mkdirSync } = await import('fs');
    if (!existsSync(SCREENSHOT_DIR)) {
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Set up error collection
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });

    page.on('pageerror', (error) => {
      console.log('Page error:', error.message);
    });

    // Inject error collection script
    await page.addInitScript(() => {
      // @ts-ignore
      window.jsErrors = [];
      const originalError = console.error;
      console.error = (...args) => {
        // @ts-ignore
        window.jsErrors.push(args.join(' '));
        originalError.apply(console, args);
      };
    });
  });

  for (const route of TEST_ROUTES) {
    for (const viewport of VIEWPORT_SIZES) {
      test(`Analyze ${route.name} at ${viewport.name} resolution`, async ({ page }) => {
        // Set viewport
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // Navigate to the route
        await page.goto(`${BASE_URL}${route.path}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        // Wait for page to be ready
        await page.waitForTimeout(2000);

        // Perform UI analysis
        const result = await analyzer.analyzePage(page, route.path, viewport.name);

        // Log immediate findings
        console.log(`\\n=== Analysis Results for ${route.path} (${viewport.name}) ===`);
        console.log(`CSS Loaded: ${result.cssLoaded}`);
        console.log(`Issues found: ${result.responsiveIssues.length + result.accessibilityIssues.length + result.componentIssues.length + result.performanceIssues.length}`);

        if (!result.cssLoaded) {
          console.log('🚨 CRITICAL: CSS not properly loaded!');
        }

        result.responsiveIssues.forEach(issue => console.log(`📱 Responsive: ${issue}`));
        result.componentIssues.forEach(issue => console.log(`🔧 Component: ${issue}`));

        // Assertions for critical issues
        expect(result.cssLoaded, 'CSS should be properly loaded').toBe(true);

        // Soft assertions for other issues (warnings, not failures)
        if (result.responsiveIssues.length > 0) {
          console.warn(`⚠️  Responsive design issues found on ${route.path} (${viewport.name})`);
        }

        if (result.componentIssues.length > 3) {
          console.warn(`⚠️  Multiple component issues found on ${route.path} (${viewport.name})`);
        }
      });
    }
  }

  test('Generate comprehensive UI analysis report', async () => {
    // This test runs last to generate the final report
    test.setTimeout(60000);

    const report = analyzer.generateReport();
    const reportPath = join(SCREENSHOT_DIR, `ui-analysis-report-${Date.now()}.md`);

    // Write report to file
    const { writeFileSync } = await import('fs');
    writeFileSync(reportPath, report);

    console.log(`\\n📋 UI Analysis Report generated: ${reportPath}`);
    console.log('\\n' + report);

    // Also save results as JSON for programmatic analysis
    const resultsPath = join(SCREENSHOT_DIR, `ui-analysis-results-${Date.now()}.json`);
    writeFileSync(resultsPath, JSON.stringify(analyzer.getResults(), null, 2));

    // Check if there are critical issues
    const results = analyzer.getResults();
    const criticalIssues = results.filter(result => !result.cssLoaded);

    if (criticalIssues.length > 0) {
      console.error(`\\n🚨 CRITICAL ISSUES DETECTED! ${criticalIssues.length} pages have CSS loading problems.`);
      console.error('This likely explains the "UI styling is all off" issue mentioned by the user.');
    } else {
      console.log('\\n✅ No critical CSS loading issues detected.');
    }
  });
});

// Export for external use
export { UIAnalyzer, UIAnalysisResult };