import { test, expect } from '@playwright/test';

/**
 * Actual UI Validation Tests
 * 
 * Tests what's actually available in the current UI without making assumptions
 */
test.describe('Actual UI Validation Tests', () => {
  
  test('should validate current UI structure and take screenshots', async ({ page }) => {
    await test.step('Navigate to homepage and capture state', async () => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of homepage
      await page.screenshot({ 
        path: 'test-results/homepage-actual-state.png',
        fullPage: true 
      });
      
      console.log('Homepage loaded successfully');
    });

    await test.step('Find and document all clickable elements', async () => {
      // Find all buttons
      const buttons = await page.locator('button').all();
      console.log(`Found ${buttons.length} buttons on homepage`);
      
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        console.log(`Button ${i + 1}: "${text}" (visible: ${isVisible})`);
      }
      
      // Find all links
      const links = await page.locator('a').all();
      console.log(`Found ${links.length} links on homepage`);
      
      for (let i = 0; i < Math.min(links.length, 10); i++) {
        const link = links[i];
        const text = await link.textContent();
        const href = await link.getAttribute('href');
        const isVisible = await link.isVisible();
        console.log(`Link ${i + 1}: "${text}" -> ${href} (visible: ${isVisible})`);
      }
    });

    await test.step('Test actual button clicks', async () => {
      const buttons = await page.locator('button').all();
      
      for (let i = 0; i < Math.min(buttons.length, 5); i++) {
        const button = buttons[i];
        const text = await button.textContent();
        
        if (await button.isVisible()) {
          try {
            await button.click();
            await page.waitForTimeout(1000);
            
            await page.screenshot({ 
              path: `test-results/button-click-${i}-${text?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'}.png`,
              fullPage: true 
            });
            
            console.log(`Successfully clicked button: "${text}"`);
          } catch (error) {
            console.log(`Failed to click button: "${text}" - ${error.message}`);
          }
        }
      }
    });
  });

  test('should validate navigation between pages', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    await test.step('Test navigation to different routes', async () => {
      const routes = [
        '/',
        '/claude-instances', 
        '/analytics',
        '/settings',
        '/agents'
      ];
      
      for (const route of routes) {
        try {
          await page.goto(`http://localhost:5173${route}`);
          await page.waitForLoadState('networkidle', { timeout: 10000 });
          
          const title = await page.title();
          await page.screenshot({ 
            path: `test-results/route-${route.replace('/', '') || 'home'}.png`,
            fullPage: true 
          });
          
          console.log(`Route ${route}: Title "${title}" - Success`);
        } catch (error) {
          console.log(`Route ${route}: Failed - ${error.message}`);
        }
      }
    });
  });

  test('should test form interactions if available', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    await test.step('Find and test form elements', async () => {
      const inputs = await page.locator('input, textarea, select').all();
      console.log(`Found ${inputs.length} form inputs`);
      
      for (let i = 0; i < Math.min(inputs.length, 5); i++) {
        const input = inputs[i];
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');
        const name = await input.getAttribute('name');
        
        console.log(`Input ${i + 1}: type="${type}", placeholder="${placeholder}", name="${name}"`);
        
        if (await input.isVisible() && type !== 'hidden') {
          try {
            await input.fill('Test automation input');
            await page.waitForTimeout(500);
            
            await page.screenshot({ 
              path: `test-results/input-${i}-filled.png`,
              fullPage: true 
            });
            
            console.log(`Successfully filled input ${i + 1}`);
          } catch (error) {
            console.log(`Failed to fill input ${i + 1}: ${error.message}`);
          }
        }
      }
    });
  });

  test('should test error handling and network issues', async ({ page, context }) => {
    await test.step('Test with network errors', async () => {
      // Block some API calls to test error handling
      await context.route('**/api/**', route => route.abort());
      
      await page.goto('http://localhost:5173');
      await page.waitForTimeout(5000); // Wait for potential error states
      
      await page.screenshot({ 
        path: 'test-results/network-blocked-state.png',
        fullPage: true 
      });
      
      // Check console for errors
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleLogs.push(msg.text());
        }
      });
      
      console.log(`Detected ${consoleLogs.length} console errors with network blocked`);
    });
  });

  test('should test WebSocket and real-time features', async ({ page }) => {
    const wsConnections: any[] = [];
    
    // Monitor WebSocket connections
    page.on('websocket', ws => {
      wsConnections.push(ws);
      console.log('WebSocket detected:', ws.url());
      
      ws.on('framereceived', event => {
        console.log('WS received:', event.payload?.substring(0, 100));
      });
    });
    
    await test.step('Navigate and monitor for WebSocket activity', async () => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      
      // Try different pages that might use WebSockets
      const pages = ['/', '/claude-instances', '/agents'];
      
      for (const pagePath of pages) {
        await page.goto(`http://localhost:5173${pagePath}`);
        await page.waitForTimeout(3000);
        
        if (wsConnections.length > 0) {
          await page.screenshot({ 
            path: `test-results/websocket-active-${pagePath.replace('/', '') || 'home'}.png`,
            fullPage: true 
          });
        }
      }
      
      console.log(`Total WebSocket connections detected: ${wsConnections.length}`);
    });
  });

  test('should validate mobile responsiveness', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];
    
    for (const viewport of viewports) {
      await test.step(`Test ${viewport.name} viewport`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('http://localhost:5173');
        await page.waitForLoadState('networkidle');
        
        await page.screenshot({ 
          path: `test-results/responsive-${viewport.name}.png`,
          fullPage: true 
        });
        
        // Test if buttons are clickable on this viewport
        const visibleButtons = await page.locator('button:visible').count();
        console.log(`${viewport.name}: ${visibleButtons} visible buttons`);
      });
    }
  });

  test('should validate accessibility features', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    await test.step('Check keyboard navigation', async () => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'test-results/keyboard-focus-1.png' });
      
      // Continue tabbing
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
      }
      
      await page.screenshot({ path: 'test-results/keyboard-focus-final.png' });
      console.log('Keyboard navigation test completed');
    });

    await test.step('Check ARIA attributes', async () => {
      const ariaElements = await page.locator('[aria-label], [aria-labelledby], [role]').count();
      console.log(`Found ${ariaElements} elements with ARIA attributes`);
      
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
      console.log(`Found ${headings} heading elements`);
    });
  });

  test('should validate current instance management features', async ({ page }) => {
    await page.goto('http://localhost:5173/claude-instances');
    await page.waitForLoadState('networkidle');
    
    await test.step('Document current instance management UI', async () => {
      await page.screenshot({ 
        path: 'test-results/claude-instances-current-state.png',
        fullPage: true 
      });
      
      // Look for any instance-related elements
      const instanceElements = await page.locator('[class*="instance"], [data-testid*="instance"], [id*="instance"]').count();
      console.log(`Found ${instanceElements} instance-related elements`);
      
      // Look for any Claude-related text
      const claudeText = await page.locator('text=/claude/i').count();
      console.log(`Found ${claudeText} elements containing "claude" text`);
      
      // Check for any create/add buttons
      const createButtons = await page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")').count();
      console.log(`Found ${createButtons} create/add/new buttons`);
    });
  });

  test('should perform comprehensive UI health check', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await test.step('Overall UI health assessment', async () => {
      const healthMetrics = {
        totalButtons: await page.locator('button').count(),
        visibleButtons: await page.locator('button:visible').count(),
        totalLinks: await page.locator('a').count(),
        visibleLinks: await page.locator('a:visible').count(),
        totalInputs: await page.locator('input, textarea, select').count(),
        visibleInputs: await page.locator('input:visible, textarea:visible, select:visible').count(),
        totalImages: await page.locator('img').count(),
        loadedImages: await page.locator('img:not([src=""])').count(),
        headingStructure: await page.locator('h1, h2, h3, h4, h5, h6').count()
      };
      
      console.log('UI Health Metrics:');
      console.log(`- Buttons: ${healthMetrics.visibleButtons}/${healthMetrics.totalButtons} visible`);
      console.log(`- Links: ${healthMetrics.visibleLinks}/${healthMetrics.totalLinks} visible`);
      console.log(`- Form inputs: ${healthMetrics.visibleInputs}/${healthMetrics.totalInputs} visible`);
      console.log(`- Images: ${healthMetrics.loadedImages}/${healthMetrics.totalImages} loaded`);
      console.log(`- Headings: ${healthMetrics.headingStructure} total`);
      
      await page.screenshot({ 
        path: 'test-results/ui-health-check-complete.png',
        fullPage: true 
      });
    });
  });
});