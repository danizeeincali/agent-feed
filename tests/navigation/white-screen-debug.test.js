const puppeteer = require('puppeteer');

describe('White Screen Navigation Debug', () => {
  let browser, page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: false, devtools: true });
    page = await browser.newPage();
    page.setDefaultTimeout(10000);
    
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  });

  afterAll(async () => {
    await browser?.close();
  });

  const routes = [
    { path: '/', name: 'Home Feed' },
    { path: '/dual-instance', name: 'Dual Instance Dashboard' },
    { path: '/agents', name: 'Agent Manager' },
    { path: '/analytics', name: 'System Analytics' },
    { path: '/claude-code', name: 'Claude Code Panel' },
    { path: '/workflows', name: 'Workflow Visualization' },
    { path: '/activity', name: 'Live Activity Feed' },
    { path: '/settings', name: 'Settings Panel' },
  ];

  routes.forEach(route => {
    test(`${route.name} should load without white screen`, async () => {
      console.log(`\n=== Testing route: ${route.path} ===`);
      
      try {
        await page.goto(`http://localhost:3002${route.path}`, { 
          waitUntil: 'networkidle0',
          timeout: 15000 
        });

        // Wait for React to render
        await page.waitForTimeout(3000);

        // Check if page has meaningful content
        const pageAnalysis = await page.evaluate(() => {
          const body = document.body;
          const textContent = body.textContent?.trim() || '';
          const hasText = textContent.length > 50;
          const hasElements = body.querySelectorAll('div, section, main, article').length > 5;
          const hasNavigation = body.querySelector('nav') !== null;
          const hasLoadingSpinner = body.querySelector('.animate-spin') !== null;
          const hasErrorBoundary = textContent.includes('Something went wrong') || textContent.includes('Error');
          
          return {
            textLength: textContent.length,
            hasText,
            hasElements,
            hasNavigation,
            hasLoadingSpinner,
            hasErrorBoundary,
            title: document.title,
            url: window.location.href
          };
        });

        console.log('Page Analysis:', pageAnalysis);

        // Take screenshot for debugging
        const screenshotPath = `tests/navigation/screenshot-${route.name.replace(/\s+/g, '-').toLowerCase()}.png`;
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });

        // Assertions
        expect(pageAnalysis.hasText).toBe(true);
        expect(pageAnalysis.hasElements).toBe(true);
        expect(pageAnalysis.hasNavigation).toBe(true);
        expect(pageAnalysis.hasErrorBoundary).toBe(false);
        
      } catch (error) {
        console.error(`Error testing route ${route.path}:`, error.message);
        
        // Take error screenshot
        await page.screenshot({ 
          path: `tests/navigation/error-${route.name.replace(/\s+/g, '-').toLowerCase()}.png`,
          fullPage: true 
        });
        
        throw error;
      }
    });
  });

  test('Navigation between routes should be smooth', async () => {
    console.log('\n=== Testing navigation flow ===');
    
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle0' });
    
    for (const route of routes) {
      console.log(`Navigating to: ${route.path}`);
      
      try {
        // Try to find navigation link
        const navLink = await page.$(`a[href="${route.path}"]`);
        
        if (navLink) {
          await navLink.click();
          await page.waitForTimeout(2000);
          
          const url = page.url();
          const expectedUrl = route.path === '/' ? 'http://localhost:3002/' : `http://localhost:3002${route.path}`;
          
          expect(url).toBe(expectedUrl);
          
          // Check for content after navigation
          const hasContent = await page.evaluate(() => {
            const textContent = document.body.textContent?.trim();
            return textContent && textContent.length > 50;
          });
          
          expect(hasContent).toBe(true);
        } else {
          console.warn(`Navigation link not found for ${route.path}`);
          
          // Try direct navigation
          await page.goto(`http://localhost:3002${route.path}`, { waitUntil: 'networkidle0' });
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        console.error(`Navigation error for ${route.path}:`, error.message);
        throw error;
      }
    }
  });
});
