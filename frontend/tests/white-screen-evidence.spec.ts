import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * CRITICAL WHITE SCREEN EVIDENCE COLLECTION
 * 
 * This test suite captures concrete browser evidence of the white screen issue
 * with comprehensive logging, screenshots, and network monitoring
 */

const BASE_URL = 'http://localhost:5173';
const EVIDENCE_DIR = path.join(__dirname, 'evidence');

// Ensure evidence directory exists
test.beforeAll(async () => {
  try {
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
  } catch (error) {
    console.log('Evidence directory already exists or error creating it:', error);
  }
});

test.describe('White Screen Evidence Collection', () => {
  
  test('Capture white screen state with full browser evidence', async ({ page, browserName }) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testId = `white-screen-${browserName}-${timestamp}`;
    const evidenceFile = path.join(EVIDENCE_DIR, `${testId}-evidence.json`);
    
    const evidence: any = {
      testId,
      browserName,
      timestamp,
      url: BASE_URL,
      consoleMessages: [],
      networkRequests: [],
      networkFailures: [],
      domState: {},
      screenshots: [],
      errors: []
    };

    // Capture console messages
    page.on('console', (msg) => {
      evidence.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      });
      console.log(`CONSOLE [${msg.type()}]:`, msg.text());
    });

    // Capture network requests and failures
    page.on('request', (request) => {
      evidence.networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
    });

    page.on('response', (response) => {
      if (!response.ok()) {
        evidence.networkFailures.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        });
        console.log(`NETWORK FAILURE: ${response.status()} ${response.url()}`);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      evidence.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.log('PAGE ERROR:', error);
    });

    console.log(`\n🔍 Starting white screen evidence collection for ${browserName}...`);
    console.log(`📊 Test ID: ${testId}`);
    console.log(`🌐 URL: ${BASE_URL}`);

    try {
      // Navigate to the application
      console.log('\n📍 Step 1: Navigating to application...');
      await page.goto(BASE_URL, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Take initial screenshot
      console.log('📸 Taking initial screenshot...');
      const initialScreenshot = path.join(EVIDENCE_DIR, `${testId}-initial-screen.png`);
      await page.screenshot({ 
        path: initialScreenshot, 
        fullPage: true 
      });
      evidence.screenshots.push({
        name: 'initial-screen',
        path: initialScreenshot,
        timestamp: new Date().toISOString()
      });

      // Wait for potential React mounting
      console.log('\n📍 Step 2: Waiting for React to mount...');
      await page.waitForTimeout(3000);

      // Check if #root exists and has content
      console.log('🔍 Checking DOM state...');
      const domState = await page.evaluate(() => {
        const root = document.getElementById('root');
        const body = document.body;
        
        return {
          rootExists: !!root,
          rootHtml: root?.innerHTML || 'NO ROOT ELEMENT',
          rootChildren: root?.children.length || 0,
          bodyChildren: body.children.length,
          documentTitle: document.title,
          documentReadyState: document.readyState,
          scriptsLoaded: document.scripts.length,
          styleSheetsLoaded: document.styleSheets.length,
          hasReactDevTools: !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
          windowReact: !!(window as any).React,
          windowReactDOM: !!(window as any).ReactDOM,
          bodyInnerText: body.innerText?.substring(0, 200) || 'NO BODY TEXT',
          allElements: document.querySelectorAll('*').length
        };
      });

      evidence.domState = domState;
      console.log('📋 DOM State Analysis:');
      Object.entries(domState).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });

      // Test specific React mounting
      console.log('\n📍 Step 3: Testing React component mounting...');
      const reactState = await page.evaluate(() => {
        const root = document.getElementById('root');
        return {
          hasReactRoot: !!root?.hasAttribute('data-reactroot') || !!root?._reactRootContainer,
          reactFiberNode: !!(root as any)?._reactInternalFiber,
          reactVersion: (window as any).React?.version,
          rootDataAttributes: Array.from(root?.attributes || []).map(attr => `${attr.name}=${attr.value}`)
        };
      });

      evidence.reactState = reactState;
      console.log('⚛️ React State Analysis:');
      Object.entries(reactState).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });

      // Take screenshot after React check
      const reactScreenshot = path.join(EVIDENCE_DIR, `${testId}-react-check.png`);
      await page.screenshot({ 
        path: reactScreenshot, 
        fullPage: true 
      });
      evidence.screenshots.push({
        name: 'react-check',
        path: reactScreenshot,
        timestamp: new Date().toISOString()
      });

      // Check for specific UI elements that should be visible
      console.log('\n📍 Step 4: Checking for expected UI elements...');
      const uiElements = await page.evaluate(() => {
        const checks = {
          hasHeader: !!document.querySelector('header'),
          hasNav: !!document.querySelector('nav'),
          hasMain: !!document.querySelector('main'),
          hasButtons: document.querySelectorAll('button').length,
          hasLinks: document.querySelectorAll('a').length,
          hasDivs: document.querySelectorAll('div').length,
          hasInputs: document.querySelectorAll('input').length,
          hasTabElements: document.querySelectorAll('[role="tab"], .tab').length,
          hasTerminalElements: document.querySelectorAll('.terminal, .xterm').length,
          visibleText: document.body.innerText?.trim()?.substring(0, 500) || 'NO VISIBLE TEXT'
        };
        return checks;
      });

      evidence.uiElements = uiElements;
      console.log('🎨 UI Elements Analysis:');
      Object.entries(uiElements).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });

      // Test JavaScript execution
      console.log('\n📍 Step 5: Testing JavaScript execution...');
      const jsTest = await page.evaluate(() => {
        try {
          // Test basic JS
          const basicTest = 2 + 2 === 4;
          
          // Test DOM manipulation
          const div = document.createElement('div');
          div.id = 'playwright-test';
          div.textContent = 'JS Working';
          document.body.appendChild(div);
          const domTest = !!document.getElementById('playwright-test');
          
          // Test modern JS features
          const modernJs = (() => {
            const arr = [1, 2, 3];
            return arr.map(x => x * 2).includes(4);
          })();

          return {
            basicTest,
            domTest,
            modernJs,
            errorOccurred: false
          };
        } catch (error) {
          return {
            basicTest: false,
            domTest: false,
            modernJs: false,
            errorOccurred: true,
            error: (error as Error).message
          };
        }
      });

      evidence.jsTest = jsTest;
      console.log('⚙️ JavaScript Test Results:');
      Object.entries(jsTest).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });

      // Take final screenshot
      const finalScreenshot = path.join(EVIDENCE_DIR, `${testId}-final-state.png`);
      await page.screenshot({ 
        path: finalScreenshot, 
        fullPage: true 
      });
      evidence.screenshots.push({
        name: 'final-state',
        path: finalScreenshot,
        timestamp: new Date().toISOString()
      });

      // Network validation
      console.log('\n📍 Step 6: Network Analysis...');
      evidence.networkSummary = {
        totalRequests: evidence.networkRequests.length,
        totalFailures: evidence.networkFailures.length,
        failedUrls: evidence.networkFailures.map(f => f.url),
        requestDomains: [...new Set(evidence.networkRequests.map(r => new URL(r.url).hostname))]
      };

      console.log('🌐 Network Summary:');
      Object.entries(evidence.networkSummary).forEach(([key, value]) => {
        console.log(`   ${key}: ${JSON.stringify(value)}`);
      });

      // Save evidence to file
      await fs.writeFile(evidenceFile, JSON.stringify(evidence, null, 2));
      console.log(`\n💾 Evidence saved to: ${evidenceFile}`);

      // Determine if this is actually a white screen
      const isWhiteScreen = domState.rootChildren === 0 || 
                          domState.bodyInnerText === 'NO BODY TEXT' || 
                          domState.allElements < 10;

      evidence.verdict = {
        isWhiteScreen,
        confidence: isWhiteScreen ? 'HIGH' : 'LOW',
        reason: isWhiteScreen ? 
          'No meaningful content detected in DOM' : 
          'Content detected, not a true white screen'
      };

      console.log('\n🎯 VERDICT:');
      console.log(`   White Screen: ${evidence.verdict.isWhiteScreen}`);
      console.log(`   Confidence: ${evidence.verdict.confidence}`);
      console.log(`   Reason: ${evidence.verdict.reason}`);

      // The test should fail if we have a white screen to highlight the issue
      if (isWhiteScreen) {
        throw new Error(`WHITE SCREEN DETECTED: ${evidence.verdict.reason}`);
      }

    } catch (error) {
      evidence.testError = {
        message: (error as Error).message,
        stack: (error as Error).stack,
        timestamp: new Date().toISOString()
      };
      
      // Take error screenshot
      const errorScreenshot = path.join(EVIDENCE_DIR, `${testId}-error-state.png`);
      try {
        await page.screenshot({ 
          path: errorScreenshot, 
          fullPage: true 
        });
        evidence.screenshots.push({
          name: 'error-state',
          path: errorScreenshot,
          timestamp: new Date().toISOString()
        });
      } catch (screenshotError) {
        console.log('Could not take error screenshot:', screenshotError);
      }

      // Save evidence even on error
      await fs.writeFile(evidenceFile, JSON.stringify(evidence, null, 2));
      
      console.log(`\n❌ TEST FAILED: ${(error as Error).message}`);
      throw error;
    }
  });

  test('Test server availability separately', async ({ request }) => {
    console.log('\n🔍 Testing server availability...');
    
    try {
      const response = await request.get(BASE_URL);
      console.log(`✅ Server response: ${response.status()} ${response.statusText()}`);
      
      const headers = response.headers();
      console.log('📋 Response headers:', headers);
      
      const body = await response.text();
      console.log(`📄 Response body length: ${body.length} characters`);
      console.log(`📄 Response body preview: ${body.substring(0, 200)}...`);
      
      expect(response.ok()).toBeTruthy();
    } catch (error) {
      console.log(`❌ Server not available: ${(error as Error).message}`);
      throw error;
    }
  });
});

test.describe('Multi-Browser White Screen Test', () => {
  ['chromium', 'firefox'].forEach((browserName) => {
    test(`White screen evidence collection - ${browserName}`, async ({ browser }) => {
      if (browser.browserType().name() !== browserName) {
        test.skip();
        return;
      }

      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      
      const page = await context.newPage();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const testId = `multi-browser-${browserName}-${timestamp}`;
      
      console.log(`\n🌐 Testing with ${browserName} browser...`);
      
      try {
        await page.goto(BASE_URL, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });

        const screenshot = path.join(EVIDENCE_DIR, `${testId}-screenshot.png`);
        await page.screenshot({ 
          path: screenshot, 
          fullPage: true 
        });

        const pageContent = await page.evaluate(() => {
          return {
            title: document.title,
            bodyText: document.body.innerText?.substring(0, 100),
            elementCount: document.querySelectorAll('*').length,
            rootContent: document.getElementById('root')?.innerHTML?.substring(0, 100)
          };
        });

        console.log(`📊 ${browserName} page content:`, pageContent);
        
        // Test passes if we get any meaningful content
        expect(pageContent.elementCount).toBeGreaterThan(5);
        
      } catch (error) {
        console.log(`❌ ${browserName} test failed:`, error);
        throw error;
      } finally {
        await context.close();
      }
    });
  });
});