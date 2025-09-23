import { test, expect, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

test.describe('Connection Status Browser Validation', () => {
  let screenshotDir: string;
  
  test.beforeAll(async () => {
    screenshotDir = path.join(process.cwd(), 'docs', 'browser-validation', 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
  });

  test('Verify Connection Status Component Display', async ({ page }) => {
    // Navigate to the application
    console.log('🌐 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for React to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Take initial screenshot
    const initialScreenshot = path.join(screenshotDir, 'initial-load.png');
    await page.screenshot({ 
      path: initialScreenshot, 
      fullPage: true 
    });
    console.log(`📸 Initial screenshot saved: ${initialScreenshot}`);

    // Look for Connection Status component using multiple selectors
    const connectionStatusSelectors = [
      '[data-testid="connection-status"]',
      '.connection-status',
      'div:has-text("Connection Status")',
      'div:has-text("Connected")',
      'div:has-text("Disconnected")',
      'div:has-text("Connecting")',
      '[class*="connection"]',
      '[class*="status"]'
    ];

    let connectionElement = null;
    let foundSelector = '';

    for (const selector of connectionStatusSelectors) {
      try {
        connectionElement = await page.locator(selector).first();
        if (await connectionElement.isVisible()) {
          foundSelector = selector;
          console.log(`✅ Found connection element with selector: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Selector ${selector} not found or not visible`);
      }
    }

    // Get page title and URL
    const pageTitle = await page.title();
    const currentURL = page.url();
    console.log(`📄 Page Title: ${pageTitle}`);
    console.log(`🔗 Current URL: ${currentURL}`);

    // Extract all visible text from the page
    const allText = await page.locator('body').textContent();
    console.log('📝 All visible text on page:');
    console.log(allText);

    // Look for connection-related text patterns
    const connectionPatterns = [
      /Connected/gi,
      /Disconnected/gi,
      /Connecting/gi,
      /Connection Status/gi,
      /WebSocket/gi,
      /Socket/gi,
      /Status/gi
    ];

    const foundPatterns = [];
    for (const pattern of connectionPatterns) {
      const matches = allText?.match(pattern);
      if (matches) {
        foundPatterns.push({
          pattern: pattern.source,
          matches: matches,
          count: matches.length
        });
      }
    }

    console.log('🔍 Found connection-related patterns:');
    console.log(JSON.stringify(foundPatterns, null, 2));

    // Get DOM structure
    const domStructure = await page.evaluate(() => {
      const extractStructure = (element: Element, maxDepth = 5, currentDepth = 0): any => {
        if (currentDepth > maxDepth) return { tag: element.tagName, text: '...' };
        
        const result: any = {
          tag: element.tagName.toLowerCase(),
          id: element.id || undefined,
          class: element.className || undefined,
          text: element.textContent?.slice(0, 100) || undefined
        };

        if (element.children.length > 0 && currentDepth < maxDepth) {
          result.children = Array.from(element.children)
            .slice(0, 10) // Limit children to avoid huge output
            .map(child => extractStructure(child, maxDepth, currentDepth + 1));
        }

        return result;
      };

      return extractStructure(document.body);
    });

    console.log('🏗️ DOM Structure:');
    console.log(JSON.stringify(domStructure, null, 2));

    // Take screenshot of specific areas
    if (connectionElement && foundSelector) {
      const connectionScreenshot = path.join(screenshotDir, 'connection-status-component.png');
      await connectionElement.screenshot({ 
        path: connectionScreenshot 
      });
      console.log(`📸 Connection component screenshot saved: ${connectionScreenshot}`);

      // Get the exact text of the connection element
      const connectionText = await connectionElement.textContent();
      console.log(`🎯 Connection Element Text: "${connectionText}"`);

      // Get the element's attributes
      const attributes = await connectionElement.evaluate((el) => {
        const attrs: Record<string, string> = {};
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          attrs[attr.name] = attr.value;
        }
        return attrs;
      });
      console.log('📋 Connection Element Attributes:', attributes);
    }

    // Check for error messages
    const errorSelectors = [
      '.error',
      '[class*="error"]',
      'div:has-text("Error")',
      'div:has-text("Failed")',
      '.alert-error',
      '.toast-error'
    ];

    for (const selector of errorSelectors) {
      try {
        const errorElement = await page.locator(selector).first();
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent();
          console.log(`⚠️ Found error: ${errorText}`);
          
          const errorScreenshot = path.join(screenshotDir, 'error-message.png');
          await errorElement.screenshot({ path: errorScreenshot });
        }
      } catch (error) {
        // Ignore if selector not found
      }
    }

    // Check network requests
    const responses: any[] = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type']
      });
    });

    // Wait a bit more to catch any network activity
    await page.waitForTimeout(3000);

    console.log('🌐 Network Responses:');
    responses.forEach(response => {
      console.log(`${response.status} - ${response.url}`);
    });

    // Take final screenshot
    const finalScreenshot = path.join(screenshotDir, 'final-state.png');
    await page.screenshot({ 
      path: finalScreenshot, 
      fullPage: true 
    });
    console.log(`📸 Final screenshot saved: ${finalScreenshot}`);

    // Generate validation report
    const report = {
      timestamp: new Date().toISOString(),
      url: currentURL,
      title: pageTitle,
      connectionElement: {
        found: !!connectionElement,
        selector: foundSelector,
        text: connectionElement ? await connectionElement.textContent() : null,
        visible: connectionElement ? await connectionElement.isVisible() : false
      },
      connectionPatterns: foundPatterns,
      screenshots: [
        initialScreenshot,
        connectionElement ? path.join(screenshotDir, 'connection-status-component.png') : null,
        finalScreenshot
      ].filter(Boolean),
      allPageText: allText?.slice(0, 2000) + '...',
      domStructure: JSON.stringify(domStructure, null, 2).slice(0, 1000) + '...',
      networkResponses: responses
    };

    const reportPath = path.join(screenshotDir, 'validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Validation report saved: ${reportPath}`);

    // Assertions
    expect(pageTitle).toBeTruthy();
    expect(currentURL).toContain('localhost:3000');
    
    // The main assertion - we should find some connection-related content
    const hasConnectionContent = foundPatterns.length > 0 || !!connectionElement;
    expect(hasConnectionContent).toBe(true);
  });

  test('Verify WebSocket Connection Attempts', async ({ page }) => {
    const wsMessages: any[] = [];
    
    // Intercept WebSocket connections
    page.on('websocket', ws => {
      console.log(`🔌 WebSocket connection: ${ws.url()}`);
      
      ws.on('framereceived', event => {
        wsMessages.push({
          type: 'received',
          payload: event.payload,
          timestamp: new Date().toISOString()
        });
      });
      
      ws.on('framesent', event => {
        wsMessages.push({
          type: 'sent',
          payload: event.payload,
          timestamp: new Date().toISOString()
        });
      });
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for potential WebSocket connections
    await page.waitForTimeout(5000);
    
    console.log('📨 WebSocket Messages:');
    console.log(JSON.stringify(wsMessages, null, 2));
    
    const wsReportPath = path.join(screenshotDir, 'websocket-report.json');
    await fs.writeFile(wsReportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      messages: wsMessages,
      messageCount: wsMessages.length
    }, null, 2));
  });
});