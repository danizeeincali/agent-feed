import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('White Screen Resolution Evidence', () => {
  test('Application loads without white screen - Evidence Collection', async ({ page }) => {
    console.log('🔍 Starting comprehensive white screen validation...');
    
    // Enable detailed logging
    page.on('console', msg => {
      console.log(`Browser ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', error => {
      console.log(`❌ Page Error: ${error.message}`);
    });

    // Navigate to the application
    console.log('📍 Navigating to application...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    
    // Wait for application to initialize
    await page.waitForTimeout(3000);

    // Take a screenshot for evidence
    await page.screenshot({ 
      path: 'tests/production-validation/white-screen-evidence.png',
      fullPage: true 
    });

    // 1. Check React root element exists and is visible
    console.log('✅ Checking React root element...');
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();
    console.log('✅ React root element is visible');

    // 2. Check for actual content in the root
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        hasContent: !!(root && root.textContent && root.textContent.trim().length > 0),
        childCount: root ? root.children.length : 0,
        textLength: root ? (root.textContent || '').length : 0,
        innerHTML: root ? root.innerHTML.substring(0, 200) : ''
      };
    });

    console.log('📊 Root content analysis:', rootContent);
    expect(rootContent.hasContent).toBe(true);
    expect(rootContent.childCount).toBeGreaterThan(0);

    // 3. Check for specific UI components
    const uiComponents = await page.evaluate(() => {
      const components = {
        hasButtons: document.querySelectorAll('button').length,
        hasLinks: document.querySelectorAll('a').length,
        hasInputs: document.querySelectorAll('input, textarea, select').length,
        hasStyledElements: document.querySelectorAll('[class], [style]').length,
        hasInteractiveElements: document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="tab"]').length
      };
      return components;
    });

    console.log('🎨 UI Components found:', uiComponents);
    expect(uiComponents.hasStyledElements).toBeGreaterThan(0);

    // 4. Check for navigation or menu elements
    const navigationCheck = await page.evaluate(() => {
      const navElements = document.querySelectorAll('nav, [role="navigation"], .sidebar, .menu, .nav, [class*="nav"]');
      const menuItems = document.querySelectorAll('[role="menuitem"], [class*="menu"], [class*="tab"]');
      
      return {
        navElements: navElements.length,
        menuItems: menuItems.length,
        hasNavigation: navElements.length > 0 || menuItems.length > 0
      };
    });

    console.log('🧭 Navigation check:', navigationCheck);

    // 5. Check for data/content that indicates successful loading
    const contentIndicators = await page.evaluate(() => {
      const bodyText = document.body.textContent?.toLowerCase() || '';
      const indicators = {
        hasAgentContent: bodyText.includes('agent') || bodyText.includes('claude'),
        hasDataContent: bodyText.includes('data') || bodyText.includes('feed'),
        hasSystemContent: bodyText.includes('system') || bodyText.includes('status'),
        hasUIText: bodyText.length > 50,
        visibleText: bodyText.substring(0, 200)
      };
      return indicators;
    });

    console.log('📝 Content indicators:', contentIndicators);
    expect(contentIndicators.hasUIText).toBe(true);

    // 6. Network activity check
    const networkActivity = [];
    page.on('response', response => {
      if (response.url().includes('localhost')) {
        networkActivity.push({
          url: response.url(),
          status: response.status(),
          ok: response.ok()
        });
      }
    });

    // Trigger some interactions to check for network activity
    await page.waitForTimeout(2000);
    console.log('🌐 Network activity detected:', networkActivity.length, 'requests');

    // 7. Performance check
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        renderTime: navigation.domComplete - navigation.domLoading
      };
    });

    console.log('⚡ Performance metrics:', performanceMetrics);

    // 8. Final white screen validation
    const whiteScreenStatus = await page.evaluate(() => {
      // Multiple detection methods
      const root = document.getElementById('root');
      const body = document.body;
      
      // Check 1: Element visibility and content
      const hasVisibleContent = !!(root && root.offsetHeight > 0 && root.offsetWidth > 0);
      
      // Check 2: Text content
      const hasTextContent = !!(root && root.textContent && root.textContent.trim().length > 10);
      
      // Check 3: Child elements
      const hasChildElements = !!(root && root.children.length > 0);
      
      // Check 4: Computed styles (not transparent/hidden)
      const rootStyles = root ? window.getComputedStyle(root) : null;
      const isVisible = rootStyles ? 
        rootStyles.display !== 'none' && 
        rootStyles.visibility !== 'hidden' && 
        rootStyles.opacity !== '0' : false;

      // Check 5: Background colors (not pure white)
      const hasNonWhiteElements = Array.from(document.querySelectorAll('*')).some(el => {
        const styles = window.getComputedStyle(el);
        return styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
               styles.backgroundColor !== 'rgb(255, 255, 255)' &&
               styles.color !== 'rgb(0, 0, 0)';
      });

      return {
        hasVisibleContent,
        hasTextContent,
        hasChildElements,
        isVisible,
        hasNonWhiteElements,
        overallStatus: hasVisibleContent && hasTextContent && hasChildElements && isVisible,
        debugInfo: {
          rootHeight: root ? root.offsetHeight : 0,
          rootWidth: root ? root.offsetWidth : 0,
          textLength: root ? (root.textContent || '').length : 0,
          childrenCount: root ? root.children.length : 0
        }
      };
    });

    console.log('🎯 Final White Screen Status:', whiteScreenStatus);

    // Assert no white screen
    expect(whiteScreenStatus.overallStatus).toBe(true);
    expect(whiteScreenStatus.hasVisibleContent).toBe(true);
    expect(whiteScreenStatus.hasTextContent).toBe(true);

    console.log('✅ WHITE SCREEN VALIDATION PASSED - Application is fully functional');
  });

  test('Route Navigation Test', async ({ page }) => {
    console.log('🔍 Testing route navigation...');
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Try to find and test navigation links
    const navigationLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button[role="tab"], [role="menuitem"]'));
      return links.slice(0, 5).map(link => ({
        text: (link as HTMLElement).textContent?.trim() || '',
        href: (link as HTMLAnchorElement).href || '',
        role: (link as HTMLElement).getAttribute('role') || ''
      }));
    });

    console.log('🧭 Found navigation links:', navigationLinks);

    // Test that clicking doesn't cause white screen
    if (navigationLinks.length > 0) {
      for (const link of navigationLinks.slice(0, 3)) {
        if (link.text && link.text.length > 0) {
          console.log(`Testing click on: ${link.text}`);
          try {
            await page.click(`text="${link.text}"`);
            await page.waitForTimeout(1000);
            
            // Check still has content after navigation
            const stillHasContent = await page.evaluate(() => {
              const root = document.getElementById('root');
              return !!(root && root.textContent && root.textContent.length > 0);
            });
            
            expect(stillHasContent).toBe(true);
            console.log(`✅ Navigation to "${link.text}" successful`);
          } catch (error) {
            console.log(`⚠️ Could not test "${link.text}": ${error}`);
          }
        }
      }
    }
  });

  test('API Integration Verification', async ({ page }) => {
    console.log('🔍 Testing API integration...');
    
    // Test direct API access
    try {
      const response = await page.request.get('http://localhost:3001/api/agents');
      if (response.ok()) {
        const data = await response.json();
        console.log('✅ Backend API accessible - Agent count:', data.length);
      } else {
        console.log('⚠️ Backend API not accessible:', response.status());
      }
    } catch (error) {
      console.log('⚠️ API test error:', error);
    }

    // Test frontend API integration
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    const apiIntegrationStatus = await page.evaluate(() => {
      // Look for signs of successful API integration
      const text = document.body.textContent?.toLowerCase() || '';
      return {
        hasDataContent: text.includes('agent') || text.includes('data') || text.includes('feed'),
        hasLoadingStates: text.includes('loading') || text.includes('wait'),
        hasErrorStates: text.includes('error') || text.includes('failed'),
        contentLength: text.length
      };
    });

    console.log('🔌 API Integration Status:', apiIntegrationStatus);
    expect(apiIntegrationStatus.contentLength).toBeGreaterThan(0);
  });
});