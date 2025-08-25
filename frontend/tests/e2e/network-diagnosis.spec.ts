import { test, expect } from '@playwright/test';

test.describe('Network and Loading Diagnosis', () => {
  test('Compare cURL vs Browser Request', async ({ page, request }) => {
    console.log('\n=== CURL VS BROWSER COMPARISON ===');

    // Make a direct HTTP request (like curl)
    const curlResponse = await request.get('http://localhost:5173/');
    const curlBody = await curlResponse.text();
    const curlHeaders = curlResponse.headers();

    console.log(`\nDirect HTTP Request (like cURL):`);
    console.log(`Status: ${curlResponse.status()}`);
    console.log(`Content-Length: ${curlHeaders['content-length'] || 'not set'}`);
    console.log(`Content-Type: ${curlHeaders['content-type'] || 'not set'}`);
    console.log(`Body Length: ${curlBody.length} characters`);
    console.log(`Body Preview: ${curlBody.substring(0, 200)}...`);

    // Now test with browser
    console.log(`\nBrowser Request:`);
    const response = await page.goto('http://localhost:5173/', { 
      waitUntil: 'domcontentloaded' 
    });
    
    await page.waitForTimeout(1000); // Give time for JS to execute
    
    const browserBody = await page.content();
    const browserTitle = await page.title();

    console.log(`Status: ${response?.status() || 'unknown'}`);
    console.log(`Title: ${browserTitle}`);
    console.log(`Body Length: ${browserBody.length} characters`);
    console.log(`Body Preview: ${browserBody.substring(0, 200)}...`);

    // Check what the browser actually rendered vs what was served
    const visibleText = await page.textContent('body');
    console.log(`Visible Text: "${visibleText?.trim() || 'EMPTY'}"`);

    // Check if HTML contains React app div
    const hasRootDiv = await page.locator('#root').count();
    const rootContent = await page.locator('#root').innerHTML().catch(() => 'ERROR_GETTING_CONTENT');
    
    console.log(`Has #root div: ${hasRootDiv > 0}`);
    console.log(`Root div content: ${rootContent}`);

    // Compare responses
    const bodiesSimilar = Math.abs(curlBody.length - browserBody.length) < 100;
    console.log(`\nBodies similar length: ${bodiesSimilar}`);
    console.log(`Length difference: ${Math.abs(curlBody.length - browserBody.length)} characters`);

    expect(curlResponse.status()).toBe(200);
    expect(response?.status()).toBe(200);
  });

  test('JavaScript Module Loading', async ({ page }) => {
    console.log('\n=== JAVASCRIPT MODULE LOADING TEST ===');

    // Track module loading
    const loadedModules: string[] = [];
    const failedModules: string[] = [];

    page.on('request', request => {
      if (request.resourceType() === 'script') {
        console.log(`Loading JS: ${request.url()}`);
      }
    });

    page.on('requestfinished', request => {
      if (request.resourceType() === 'script') {
        const response = request.response();
        if (response && response.status() === 200) {
          loadedModules.push(request.url());
        } else {
          failedModules.push(`${request.url()} - Status: ${response?.status()}`);
        }
      }
    });

    page.on('requestfailed', request => {
      if (request.resourceType() === 'script') {
        failedModules.push(`${request.url()} - FAILED: ${request.failure()?.errorText}`);
      }
    });

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log(`\nLoaded Modules (${loadedModules.length}):`);
    loadedModules.forEach((module, i) => {
      console.log(`  ${i + 1}. ${module}`);
    });

    if (failedModules.length > 0) {
      console.log(`\nFailed Modules (${failedModules.length}):`);
      failedModules.forEach((module, i) => {
        console.log(`  ${i + 1}. ${module}`);
      });
    }

    // Check if main React bundle is there
    const hasMainBundle = loadedModules.some(url => 
      url.includes('main') || 
      url.includes('index') || 
      url.includes('app.tsx') ||
      url.includes('src/main')
    );

    console.log(`\nHas main React bundle: ${hasMainBundle}`);

    expect(failedModules.length).toBe(0);
    expect(loadedModules.length).toBeGreaterThan(0);
  });

  test('React Application Initialization', async ({ page }) => {
    console.log('\n=== REACT INITIALIZATION TEST ===');

    let reactErrors: string[] = [];
    let reactWarnings: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' && (text.includes('React') || text.includes('react'))) {
        reactErrors.push(text);
      }
      if (msg.type() === 'warning' && (text.includes('React') || text.includes('react'))) {
        reactWarnings.push(text);
      }
    });

    await page.goto('http://localhost:5173/');
    
    // Wait longer for React to potentially initialize
    await page.waitForTimeout(5000);

    // Check various React initialization indicators
    const reactChecks = await page.evaluate(() => {
      const checks = {
        reactDevtools: !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
        reactInstance: !!(window as any).React,
        rootHasChildren: document.getElementById('root')?.children.length || 0,
        rootInnerHTML: document.getElementById('root')?.innerHTML || '',
        fiberNode: !!(document.getElementById('root') as any)?._reactInternalFiber ||
                   !!(document.getElementById('root') as any)?.__reactInternalInstance,
        documentReadyState: document.readyState,
        bodyChildCount: document.body.children.length,
      };

      return checks;
    });

    console.log('\nReact Initialization Checks:');
    console.log(`  React DevTools Hook: ${reactChecks.reactDevtools}`);
    console.log(`  React Global: ${reactChecks.reactInstance}`);
    console.log(`  Root has children: ${reactChecks.rootHasChildren}`);
    console.log(`  Root innerHTML length: ${reactChecks.rootInnerHTML.length}`);
    console.log(`  Fiber node present: ${reactChecks.fiberNode}`);
    console.log(`  Document ready: ${reactChecks.documentReadyState}`);
    console.log(`  Body child count: ${reactChecks.bodyChildCount}`);

    if (reactChecks.rootInnerHTML) {
      console.log(`  Root content preview: ${reactChecks.rootInnerHTML.substring(0, 200)}...`);
    }

    if (reactErrors.length > 0) {
      console.log('\nReact Errors:');
      reactErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    if (reactWarnings.length > 0) {
      console.log('\nReact Warnings:');
      reactWarnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }

    // The key diagnostic question: Is React actually mounting?
    const reactMounted = reactChecks.rootHasChildren > 0 || 
                        reactChecks.rootInnerHTML.length > 50 ||
                        reactChecks.fiberNode;

    console.log(`\n🔍 DIAGNOSIS: React Mounted = ${reactMounted}`);

    // Take screenshot for visual evidence
    await page.screenshot({ path: 'test-results/react-init-screenshot.png', fullPage: true });

    expect.soft(reactChecks.documentReadyState).toBe('complete');
    expect.soft(reactErrors.length).toBe(0);
  });

  test('Vite Development Server Behavior', async ({ page }) => {
    console.log('\n=== VITE DEV SERVER TEST ===');

    // Check if this is a Vite dev server
    const response = await page.goto('http://localhost:5173/');
    const headers = response?.headers() || {};
    
    console.log('Response Headers:');
    Object.entries(headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    const isViteDev = headers['server']?.includes('vite') || 
                     headers['x-powered-by']?.includes('vite');

    console.log(`\nIs Vite Dev Server: ${isViteDev}`);

    // Check for Vite-specific resources
    const viteResources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources.filter(r => 
        r.name.includes('@vite') || 
        r.name.includes('vite') ||
        r.name.includes('?import') ||
        r.name.includes('?t=') // Vite timestamp query
      ).map(r => r.name);
    });

    console.log(`\nVite-specific resources (${viteResources.length}):`);
    viteResources.forEach((resource, i) => {
      console.log(`  ${i + 1}. ${resource}`);
    });

    // Check for HMR (Hot Module Replacement)
    const hmrPresent = await page.evaluate(() => {
      return !!(window as any).__vite_plugin_react_preamble_installed__ ||
             !!(window as any).import?.meta?.hot;
    });

    console.log(`HMR Present: ${hmrPresent}`);

    expect(response?.status()).toBe(200);
  });
});