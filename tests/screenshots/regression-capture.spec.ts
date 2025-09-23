import { test, expect, type Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Configuration for screenshot capture
const baseUrl = 'http://localhost:5173';
const screenshotsDir = '/workspaces/agent-feed/tests/screenshots/baseline';

// Viewport configurations
const viewports = {
  desktop: { width: 1920, height: 1080 },
  mobile: { width: 375, height: 667 }
};

// Pages to capture
const pages = [
  { name: 'home', path: '/', description: 'Home page' },
  { name: 'agents', path: '/agents', description: 'Agents page' },
  { name: 'feed', path: '/feed', description: 'Feed page' }
];

// Component selectors for focused screenshots
const components = {
  navigation: 'nav, header[role="navigation"], .nav, .navbar',
  sidebar: '.sidebar, aside, [role="navigation"]',
  mainContent: 'main, .main-content, .content',
  footer: 'footer, .footer'
};

async function waitForPageLoad(page: Page) {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');

  // Wait for any animations to complete
  await page.waitForTimeout(1000);

  // Wait for images to load
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter(img => !img.complete)
        .map(img => new Promise(resolve => {
          img.onload = img.onerror = resolve;
        }))
    );
  });
}

async function captureScreenshot(page: Page, name: string, viewport: string, options: any = {}) {
  const fileName = `${name}-${viewport}.png`;
  const dirPath = path.join(screenshotsDir, viewport, options.component ? 'components' : 'pages');
  const filePath = path.join(dirPath, fileName);

  // Ensure directory exists
  await fs.mkdir(dirPath, { recursive: true });

  await page.screenshot({
    path: filePath,
    fullPage: options.fullPage !== false,
    ...options
  });

  console.log(`Screenshot captured: ${filePath}`);
  return filePath;
}

async function analyzePageIssues(page: Page): Promise<string[]> {
  const issues: string[] = [];

  try {
    // Check for console errors
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(`Console Error: ${msg.text()}`);
      }
    });

    // Check for failed network requests
    page.on('response', response => {
      if (!response.ok()) {
        logs.push(`Failed Request: ${response.url()} - ${response.status()}`);
      }
    });

    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      const images = Array.from(document.images);
      return images
        .filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => img.src);
    });

    if (brokenImages.length > 0) {
      issues.push(`Broken images: ${brokenImages.join(', ')}`);
    }

    // Check for missing text content
    const emptyElements = await page.evaluate(() => {
      const selectors = ['h1', 'h2', 'h3', '.title', '.heading'];
      return selectors
        .map(selector => {
          const elements = Array.from(document.querySelectorAll(selector));
          return elements.filter(el => !el.textContent?.trim()).length;
        })
        .reduce((sum, count) => sum + count, 0);
    });

    if (emptyElements > 0) {
      issues.push(`${emptyElements} empty heading/title elements found`);
    }

    // Check for layout issues
    const layoutIssues = await page.evaluate(() => {
      const issues: string[] = [];

      // Check for elements overflowing viewport
      const elements = Array.from(document.querySelectorAll('*'));
      const overflowing = elements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.right > window.innerWidth + 10; // 10px tolerance
      });

      if (overflowing.length > 0) {
        issues.push(`${overflowing.length} elements overflow viewport width`);
      }

      return issues;
    });

    issues.push(...layoutIssues);
    issues.push(...logs);

  } catch (error) {
    issues.push(`Analysis error: ${error}`);
  }

  return issues;
}

// Test for each viewport
Object.entries(viewports).forEach(([viewportName, viewport]) => {
  test.describe(`Screenshot Capture - ${viewportName}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(viewport);
    });

    // Capture each page
    pages.forEach(({ name, path: pagePath, description }) => {
      test(`Capture ${description} - ${viewportName}`, async ({ page }) => {
        console.log(`Capturing ${description} at ${viewportName} viewport...`);

        try {
          // Navigate to page
          await page.goto(`${baseUrl}${pagePath}`, {
            waitUntil: 'networkidle',
            timeout: 30000
          });

          // Wait for page to fully load
          await waitForPageLoad(page);

          // Analyze for issues
          const issues = await analyzePageIssues(page);

          // Capture full page screenshot
          await captureScreenshot(page, name, viewportName, {
            fullPage: true
          });

          // Capture viewport screenshot
          await captureScreenshot(page, `${name}-viewport`, viewportName, {
            fullPage: false
          });

          // Report any issues found
          if (issues.length > 0) {
            console.warn(`Issues found on ${description}:`, issues);

            // Save issues to file
            const issuesFile = path.join(screenshotsDir, viewportName, 'pages', `${name}-issues.txt`);
            await fs.writeFile(issuesFile, issues.join('\n'));
          }

          // Verify page loaded correctly
          expect(page.url()).toContain(pagePath === '/' ? baseUrl : pagePath);

        } catch (error) {
          console.error(`Failed to capture ${description}:`, error);
          throw error;
        }
      });
    });

    // Capture navigation components on home page
    test(`Capture Navigation Components - ${viewportName}`, async ({ page }) => {
      console.log(`Capturing navigation components at ${viewportName} viewport...`);

      await page.goto(`${baseUrl}/`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await waitForPageLoad(page);

      // Capture navigation component
      for (const selector of components.navigation.split(', ')) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible()) {
            await captureScreenshot(page, `navigation-${selector.replace(/[^a-zA-Z0-9]/g, '_')}`, viewportName, {
              clip: await element.boundingBox(),
              component: true
            });
            break; // Only capture the first visible navigation
          }
        } catch (error) {
          console.log(`Navigation selector ${selector} not found or not visible`);
        }
      }

      // Capture main content area
      try {
        const mainElement = page.locator(components.mainContent).first();
        if (await mainElement.isVisible()) {
          await captureScreenshot(page, 'main-content', viewportName, {
            clip: await mainElement.boundingBox(),
            component: true
          });
        }
      } catch (error) {
        console.log('Main content area not found');
      }

      // Capture footer if present
      try {
        const footerElement = page.locator(components.footer).first();
        if (await footerElement.isVisible()) {
          await captureScreenshot(page, 'footer', viewportName, {
            clip: await footerElement.boundingBox(),
            component: true
          });
        }
      } catch (error) {
        console.log('Footer not found');
      }
    });
  });
});

// Generate summary report
test('Generate Screenshot Report', async ({ page }) => {
  const reportData = {
    timestamp: new Date().toISOString(),
    baseUrl,
    viewports,
    pages,
    screenshotsDirectory: screenshotsDir
  };

  const reportPath = path.join(screenshotsDir, 'capture-report.json');
  await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));

  console.log(`Screenshot capture report generated: ${reportPath}`);
});