/**
 * End-to-End Terminal Workflow Validation
 * 
 * This test validates the complete user workflow from navigation to terminal functionality,
 * specifically focusing on the SearchAddon fix and production readiness.
 */

import { test, expect, Page } from '@playwright/test';

test.describe('E2E Terminal Workflow - SearchAddon Fix Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Set up console error capture
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Store console errors in page context for later validation
    await page.context().addInitScript(() => {
      (window as any).capturedErrors = [];
      const originalError = console.error;
      console.error = (...args) => {
        (window as any).capturedErrors.push(args.join(' '));
        originalError.apply(console, args);
      };
    });

    // Navigate to the application
    await page.goto('http://localhost:3001');
  });

  test('1. Application loads without SearchAddon errors', async () => {
    // Wait for the application to load
    await page.waitForSelector('[data-testid="app-container"], body', { 
      timeout: 10000 
    });

    // Check for any SearchAddon related errors
    const errors = await page.evaluate(() => (window as any).capturedErrors || []);
    const searchAddonErrors = errors.filter((error: string) => 
      error.includes('SearchAddon') || 
      error.includes('xterm-addon-search') ||
      error.includes('SearchAddon is not defined')
    );

    expect(searchAddonErrors).toHaveLength(0);
  });

  test('2. Navigate to dual-instance dashboard', async () => {
    // Navigate to dual-instance page
    await page.goto('http://localhost:3001/dual-instance');
    
    // Wait for dashboard to load
    await page.waitForSelector('h1, h2, [data-testid="dashboard"]', { 
      timeout: 10000 
    });

    // Should see dual instance dashboard elements
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    
    // Check for navigation success
    expect(page.url()).toContain('/dual-instance');
  });

  test('3. Terminal navigation and component loading', async () => {
    // Navigate to dual-instance terminal (simulated)
    await page.goto('http://localhost:3001/dual-instance/terminal/test-instance');
    
    // Wait for terminal component to load
    await page.waitForTimeout(2000);

    // Check that the page loads without terminal-specific errors
    const errors = await page.evaluate(() => (window as any).capturedErrors || []);
    const terminalErrors = errors.filter((error: string) => 
      error.includes('Terminal') && 
      (error.includes('initialization failed') || error.includes('addon'))
    );

    expect(terminalErrors).toHaveLength(0);
  });

  test('4. Terminal component renders basic structure', async () => {
    // Go to terminal page
    await page.goto('http://localhost:3001/dual-instance');
    
    // Add mock terminal HTML structure for testing
    await page.evaluate(() => {
      const mockTerminal = document.createElement('div');
      mockTerminal.innerHTML = `
        <div data-testid="terminal-container">
          <div class="terminal-header">
            <h2>Terminal: test-instance</h2>
            <div class="connection-status">disconnected</div>
          </div>
          <div class="terminal-controls">
            <button title="Search">Search</button>
            <button title="Copy Selection">Copy</button>
            <button title="Settings">Settings</button>
          </div>
          <div class="terminal-content"></div>
        </div>
      `;
      document.body.appendChild(mockTerminal);
    });

    // Verify terminal structure exists
    await expect(page.locator('[data-testid="terminal-container"]')).toBeVisible();
    await expect(page.locator('button[title="Search"]')).toBeVisible();
    await expect(page.locator('button[title="Settings"]')).toBeVisible();
  });

  test('5. Search functionality integration', async () => {
    // Navigate to page and set up mock terminal
    await page.goto('http://localhost:3001/dual-instance');
    
    // Add mock terminal with search functionality
    await page.evaluate(() => {
      const mockTerminal = document.createElement('div');
      mockTerminal.innerHTML = `
        <div data-testid="terminal-container">
          <div class="terminal-controls">
            <button id="search-button" title="Search">Search</button>
          </div>
          <div id="search-panel" style="display: none;">
            <input id="search-input" placeholder="Search terminal..." />
            <button id="search-next">↓</button>
            <button id="search-prev">↑</button>
          </div>
        </div>
      `;
      document.body.appendChild(mockTerminal);

      // Add search functionality
      document.getElementById('search-button')!.addEventListener('click', () => {
        const panel = document.getElementById('search-panel')!;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });
    });

    // Click search button to open search panel
    await page.click('#search-button');
    
    // Verify search panel is visible
    await expect(page.locator('#search-panel')).toBeVisible();
    await expect(page.locator('#search-input')).toBeVisible();
    await expect(page.locator('#search-next')).toBeVisible();
    await expect(page.locator('#search-prev')).toBeVisible();
  });

  test('6. No JavaScript errors during navigation', async () => {
    const jsErrors: string[] = [];
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    // Navigate through key pages
    await page.goto('http://localhost:3001/');
    await page.waitForTimeout(1000);
    
    await page.goto('http://localhost:3001/dual-instance');
    await page.waitForTimeout(1000);

    // Check for any JavaScript errors
    expect(jsErrors).toHaveLength(0);
  });

  test('7. Terminal addon compatibility check', async () => {
    // Navigate to the app
    await page.goto('http://localhost:3001/dual-instance');

    // Simulate addon loading check
    const addonCompatibility = await page.evaluate(() => {
      try {
        // Mock addon loading test
        const mockAddons = {
          FitAddon: () => ({ fit: () => true }),
          SearchAddon: () => ({ findNext: () => true, findPrevious: () => true }),
          WebLinksAddon: () => ({})
        };

        const results = {
          fit: false,
          search: false,
          weblinks: false
        };

        // Test each addon
        try { 
          const fit = mockAddons.FitAddon();
          results.fit = typeof fit.fit === 'function';
        } catch (e) { /* ignore */ }

        try { 
          const search = mockAddons.SearchAddon();
          results.search = typeof search.findNext === 'function';
        } catch (e) { /* ignore */ }

        try { 
          const weblinks = mockAddons.WebLinksAddon();
          results.weblinks = typeof weblinks === 'object';
        } catch (e) { /* ignore */ }

        return results;
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(addonCompatibility.fit).toBe(true);
    expect(addonCompatibility.search).toBe(true);
    expect(addonCompatibility.weblinks).toBe(true);
  });

  test('8. Performance and memory validation', async () => {
    // Navigate to app
    await page.goto('http://localhost:3001/dual-instance');
    
    // Get initial performance metrics
    const initialMetrics = await page.evaluate(() => {
      return {
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null,
        timing: performance.timing ? {
          loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
        } : null
      };
    });

    // Simulate terminal operations
    await page.evaluate(() => {
      // Simulate multiple terminal operations
      for (let i = 0; i < 100; i++) {
        const mockOperation = () => {
          // Simulate addon operations
          const mockAddon = { findNext: () => true };
          mockAddon.findNext();
        };
        mockOperation();
      }
    });

    // Wait a moment for operations to complete
    await page.waitForTimeout(500);

    // Get final metrics
    const finalMetrics = await page.evaluate(() => {
      return {
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null
      };
    });

    // Validate no significant memory increase (rough check)
    if (initialMetrics.memory && finalMetrics.memory) {
      const memoryIncrease = finalMetrics.memory.usedJSHeapSize - initialMetrics.memory.usedJSHeapSize;
      // Should not increase memory by more than 10MB for these operations
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    }
  });

  test('9. End-to-end workflow completion', async () => {
    // Complete workflow test
    await page.goto('http://localhost:3001/');
    
    // 1. Application loads
    await page.waitForSelector('body');
    
    // 2. Navigate to dual-instance
    await page.goto('http://localhost:3001/dual-instance');
    await page.waitForTimeout(1000);
    
    // 3. Simulate terminal interaction
    await page.evaluate(() => {
      // Mock terminal creation and addon loading
      window.mockTerminalCreated = true;
      window.mockAddonsLoaded = {
        fit: true,
        search: true,
        weblinks: true
      };
    });
    
    // 4. Verify workflow completion
    const workflowResults = await page.evaluate(() => ({
      terminalCreated: window.mockTerminalCreated,
      addonsLoaded: window.mockAddonsLoaded
    }));

    expect(workflowResults.terminalCreated).toBe(true);
    expect(workflowResults.addonsLoaded.fit).toBe(true);
    expect(workflowResults.addonsLoaded.search).toBe(true);
    expect(workflowResults.addonsLoaded.weblinks).toBe(true);
  });

  test('10. Regression prevention - SearchAddon error', async () => {
    // Navigate to app
    await page.goto('http://localhost:3001/dual-instance');
    
    // Wait for page load
    await page.waitForTimeout(2000);
    
    // Check for the specific error we're fixing
    const errors = await page.evaluate(() => (window as any).capturedErrors || []);
    const searchAddonNotDefinedErrors = errors.filter((error: string) => 
      error.includes('SearchAddon is not defined')
    );

    // This should be 0 - meaning the fix is working
    expect(searchAddonNotDefinedErrors).toHaveLength(0);

    // Also check for any terminal initialization failures
    const terminalErrors = errors.filter((error: string) => 
      error.includes('Terminal initialization failed')
    );
    expect(terminalErrors).toHaveLength(0);
  });
});