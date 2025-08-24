/**
 * SPARC:Debug Validation Test Suite
 * Comprehensive browser-based white screen debugging validation
 */

const { test, expect } = require('@playwright/test');
const BrowserDiagnostics = require('../scripts/browser-diagnostics');

test.describe('SPARC:Debug White Screen Analysis', () => {
  let diagnostics;

  test.beforeEach(async () => {
    diagnostics = new BrowserDiagnostics();
  });

  test.afterEach(async () => {
    if (diagnostics) {
      await diagnostics.cleanup();
    }
  });

  test('1. Browser Console Error Detection', async ({ page }) => {
    console.log('🔍 Testing browser console error detection...');
    
    const errors = [];
    const warnings = [];
    
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        errors.push(text);
      } else if (type === 'warning') {
        warnings.push(text);
      }
    });

    page.on('pageerror', error => {
      errors.push(`Page Error: ${error.message}`);
    });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log(`📊 Console Errors: ${errors.length}`);
    console.log(`⚠️  Console Warnings: ${warnings.length}`);
    
    errors.forEach(error => console.log(`❌ ${error}`));
    
    // Critical: Should have no page-breaking errors
    const criticalErrors = errors.filter(error => 
      error.includes('SyntaxError') ||
      error.includes('ReferenceError') ||
      error.includes('TypeError') && error.includes('Cannot read')
    );
    
    expect(criticalErrors.length, `Critical errors detected: ${criticalErrors.join(', ')}`).toBe(0);
  });

  test('2. React Component Mounting Verification', async ({ page }) => {
    console.log('⚛️  Testing React component mounting...');
    
    await page.goto('http://localhost:5173');
    
    // Wait for React to potentially mount
    await page.waitForTimeout(5000);
    
    // Check React root existence and content
    const reactStatus = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        rootExists: !!root,
        hasChildren: root ? root.children.length > 0 : false,
        innerHTML: root ? root.innerHTML : '',
        textContent: root ? root.textContent.trim() : '',
        reactDetected: !!(window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__)
      };
    });

    console.log('📊 React Status:', reactStatus);
    
    expect(reactStatus.rootExists, 'React root element should exist').toBe(true);
    expect(reactStatus.hasChildren, 'React root should have child components').toBe(true);
    expect(reactStatus.innerHTML.length, 'React root should have HTML content').toBeGreaterThan(100);
  });

  test('3. Network Asset Loading Verification', async ({ page }) => {
    console.log('🌐 Testing network asset loading...');
    
    const networkFailures = [];
    const successfulRequests = [];
    
    page.on('requestfailed', request => {
      networkFailures.push({
        url: request.url(),
        method: request.method(),
        error: request.failure()?.errorText
      });
    });

    page.on('response', response => {
      if (response.ok()) {
        successfulRequests.push({
          url: response.url(),
          status: response.status(),
          contentType: response.headers()['content-type']
        });
      }
    });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    console.log(`✅ Successful requests: ${successfulRequests.length}`);
    console.log(`❌ Failed requests: ${networkFailures.length}`);
    
    networkFailures.forEach(failure => {
      console.log(`🚨 Failed: ${failure.method} ${failure.url} - ${failure.error}`);
    });

    // Check for critical asset failures
    const criticalFailures = networkFailures.filter(failure => 
      failure.url.includes('.js') || 
      failure.url.includes('.css') ||
      failure.url.includes('/api/') ||
      failure.url.includes('socket.io')
    );
    
    expect(criticalFailures.length, `Critical asset failures: ${JSON.stringify(criticalFailures)}`).toBe(0);
  });

  test('4. Performance Profiling and Render Blocking Detection', async ({ page }) => {
    console.log('📊 Testing performance and render blocking...');
    
    const startTime = Date.now();
    
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const timing = performance.timing;
      const navigation = performance.navigation;
      
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        resources: performance.getEntriesByType('resource').length,
        redirectCount: navigation.redirectCount,
        memory: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
        } : null
      };
    });

    console.log('⚡ Performance Metrics:', performanceMetrics);
    console.log(`🕒 Total Load Time: ${loadTime}ms`);
    
    // Performance assertions
    expect(loadTime, 'Page load time should be reasonable').toBeLessThan(30000); // 30 seconds max
    expect(performanceMetrics.firstContentfulPaint, 'First contentful paint should occur').toBeGreaterThan(0);
    
    if (performanceMetrics.memory) {
      expect(performanceMetrics.memory.used, 'Memory usage should be reasonable').toBeLessThan(100); // Less than 100MB
    }
  });

  test('5. Source Map and Debugging Capability Verification', async ({ page }) => {
    console.log('🗺️  Testing source map and debugging capabilities...');
    
    await page.goto('http://localhost:5173');
    
    // Check for source maps
    const sourceMapInfo = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      
      return {
        scripts: scripts.map(script => ({
          src: script.src,
          hasSourceMapComment: script.textContent?.includes('sourceMappingURL') || false
        })),
        stylesheets: stylesheets.map(link => ({
          href: link.href
        })),
        devToolsSupport: !!(window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || window.React)
      };
    });

    console.log('🔍 Source Map Info:', sourceMapInfo);
    
    // Check for development build indicators
    const developmentBuild = await page.evaluate(() => {
      return {
        reactDevMode: window.React && window.React.version,
        viteDevMode: !!window.__vite__,
        sourceMapSupport: !!window.sourceMapSupport || document.querySelector('script[src*=".map"]') !== null
      };
    });

    console.log('🛠️  Development Build Status:', developmentBuild);
    
    // Should have debugging capabilities in development
    expect(sourceMapInfo.devToolsSupport || developmentBuild.viteDevMode, 
      'Should have debugging support available').toBe(true);
  });

  test('6. Comprehensive White Screen Detection', async ({ page }) => {
    console.log('🎯 Running comprehensive white screen detection...');
    
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(5000); // Allow full loading
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/white-screen-detection.png', fullPage: true });
    
    // Comprehensive white screen checks
    const whiteScreenAnalysis = await page.evaluate(() => {
      const body = document.body;
      const root = document.getElementById('root');
      
      // Check for visible content
      const getVisibleContent = (element) => {
        if (!element) return { hasContent: false, reason: 'element_not_found' };
        
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        return {
          hasContent: element.children.length > 0,
          isVisible: style.display !== 'none' && style.visibility !== 'hidden',
          hasSize: rect.width > 0 && rect.height > 0,
          textContent: element.textContent.trim().length,
          innerHTML: element.innerHTML.length,
          backgroundColor: style.backgroundColor,
          opacity: style.opacity
        };
      };

      return {
        body: getVisibleContent(body),
        root: getVisibleContent(root),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        documentReady: document.readyState,
        reactMounted: !!(root && root.children.length > 0),
        hasErrors: window.__SPARC_DEBUG_ERRORS?.length > 0 || false
      };
    });

    console.log('🔍 White Screen Analysis:', JSON.stringify(whiteScreenAnalysis, null, 2));
    
    // Critical assertions for white screen detection
    expect(whiteScreenAnalysis.root.hasContent, 'React root should have content').toBe(true);
    expect(whiteScreenAnalysis.root.isVisible, 'React root should be visible').toBe(true);
    expect(whiteScreenAnalysis.root.hasSize, 'React root should have size').toBe(true);
    expect(whiteScreenAnalysis.reactMounted, 'React should be successfully mounted').toBe(true);
    expect(whiteScreenAnalysis.documentReady, 'Document should be ready').toBe('complete');
    
    // If any of these fail, it's a white screen issue
    const isWhiteScreen = !whiteScreenAnalysis.root.hasContent || 
                         !whiteScreenAnalysis.root.isVisible ||
                         !whiteScreenAnalysis.reactMounted;
    
    if (isWhiteScreen) {
      console.log('🚨 WHITE SCREEN DETECTED');
      console.log('💡 Debugging suggestions:');
      console.log('   1. Check browser console for JavaScript errors');
      console.log('   2. Verify React component mounting');
      console.log('   3. Check network tab for failed asset loading');
      console.log('   4. Verify build compilation success');
      console.log('   5. Check for TypeScript compilation errors');
    }
    
    expect(isWhiteScreen, 'White screen should not be present').toBe(false);
  });
});

test.describe('SPARC:Debug Build Validation', () => {
  test('Build Compilation Success', async ({ page }) => {
    console.log('🔨 Testing build compilation...');
    
    // This test verifies the build can complete successfully
    // Since we detected TypeScript errors, this should help validate fixes
    
    await page.goto('http://localhost:5173');
    
    // Check for build-related errors in console
    const buildErrors = [];
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' && (
        text.includes('Cannot resolve') ||
        text.includes('Module not found') ||
        text.includes('Compilation failed') ||
        text.includes('TypeScript')
      )) {
        buildErrors.push(text);
      }
    });
    
    await page.waitForTimeout(3000);
    
    console.log(`🔧 Build-related errors: ${buildErrors.length}`);
    buildErrors.forEach(error => console.log(`❌ ${error}`));
    
    expect(buildErrors.length, `Build compilation errors detected: ${buildErrors.join(', ')}`).toBe(0);
  });
});