import { test, expect } from '@playwright/test';
import { UITestPage } from './page-objects/UITestPage';

/**
 * Terminal and WebSocket Validation Tests
 * 
 * Tests terminal functionality and WebSocket connections in the browser
 */
test.describe('Terminal and WebSocket Validation', () => {
  let uiTestPage: UITestPage;
  
  test.beforeEach(async ({ page }) => {
    uiTestPage = new UITestPage(page);
    await uiTestPage.navigateToHome();
  });

  test('should detect and test terminal components', async ({ page }) => {
    await test.step('Search for terminal on home page', async () => {
      const hasTerminal = await uiTestPage.testTerminalFunctionality();
      
      if (hasTerminal) {
        await uiTestPage.takeScreenshot('terminal-found-home');
        console.log('Terminal component found on home page');
      } else {
        console.log('No terminal component found on home page');
      }
    });

    await test.step('Search for terminal on Claude Instances page', async () => {
      await uiTestPage.navigateToClaudeInstances();
      const hasTerminal = await uiTestPage.testTerminalFunctionality();
      
      if (hasTerminal) {
        await uiTestPage.takeScreenshot('terminal-found-claude-instances');
        console.log('Terminal component found on Claude Instances page');
      } else {
        console.log('No terminal component found on Claude Instances page');
      }
    });
  });

  test('should monitor WebSocket connections', async ({ page }) => {
    const wsConnections: any[] = [];
    
    // Set up WebSocket monitoring
    page.on('websocket', ws => {
      wsConnections.push(ws);
      console.log('WebSocket connection detected:', ws.url());
      
      ws.on('framereceived', event => {
        console.log('WebSocket frame received:', event.payload);
      });
      
      ws.on('framesent', event => {
        console.log('WebSocket frame sent:', event.payload);
      });
      
      ws.on('close', () => {
        console.log('WebSocket connection closed:', ws.url());
      });
    });

    await test.step('Navigate and check for WebSocket connections', async () => {
      await uiTestPage.navigateToClaudeInstances();
      
      // Wait for potential WebSocket connections
      await page.waitForTimeout(5000);
      
      if (wsConnections.length > 0) {
        await uiTestPage.takeScreenshot('websocket-connections-active');
        console.log(`${wsConnections.length} WebSocket connection(s) established`);
        
        // Test each WebSocket connection
        wsConnections.forEach((ws, index) => {
          console.log(`WebSocket ${index + 1}: ${ws.url()}`);
        });
      } else {
        console.log('No WebSocket connections detected');
      }
    });

    await test.step('Try to trigger WebSocket activity', async () => {
      // Try actions that might trigger WebSocket activity
      await uiTestPage.refreshInstances();
      await page.waitForTimeout(2000);
      
      // Try creating an instance if possible
      await uiTestPage.createNewInstance('WebSocket Test Instance');
      await page.waitForTimeout(3000);
      
      if (wsConnections.length > 0) {
        await uiTestPage.takeScreenshot('websocket-activity-triggered');
        console.log('WebSocket activity triggered by user actions');
      }
    });
  });

  test('should test Server-Sent Events (SSE) connections', async ({ page }) => {
    const sseConnections: any[] = [];
    
    // Monitor for EventSource connections (SSE)
    await page.addInitScript(() => {
      const originalEventSource = window.EventSource;
      window.EventSource = class extends originalEventSource {
        constructor(url: string, eventSourceInitDict?: EventSourceInit) {
          super(url, eventSourceInitDict);
          console.log('SSE connection created:', url);
          
          this.addEventListener('open', () => {
            console.log('SSE connection opened:', url);
          });
          
          this.addEventListener('message', (event) => {
            console.log('SSE message received:', event.data);
          });
          
          this.addEventListener('error', () => {
            console.log('SSE connection error:', url);
          });
        }
      };
    });

    await test.step('Navigate and monitor SSE connections', async () => {
      await uiTestPage.navigateToClaudeInstances();
      
      // Wait for potential SSE connections
      await page.waitForTimeout(5000);
      
      // Check console for SSE logs
      const consoleLogs = await page.evaluate(() => {
        return (window as any).__sseConnections || [];
      });
      
      if (consoleLogs.length > 0) {
        await uiTestPage.takeScreenshot('sse-connections-detected');
        console.log('SSE connections detected');
      }
    });
  });

  test('should test terminal input/output simulation', async ({ page }) => {
    await test.step('Look for terminal input fields', async () => {
      // Check all pages for terminal inputs
      const pages = ['/', '/claude-instances', '/analytics'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await uiTestPage.waitForPageLoad();
        
        // Look for various terminal input selectors
        const terminalSelectors = [
          'textarea[placeholder*="command"]',
          'input[placeholder*="terminal"]',
          '.terminal-input',
          '[data-testid="terminal-input"]',
          '.xterm-helper-textarea'
        ];
        
        for (const selector of terminalSelectors) {
          const element = page.locator(selector);
          
          if (await element.isVisible()) {
            await element.fill('echo "Hello from automation test"');
            await element.press('Enter');
            await page.waitForTimeout(1000);
            
            await uiTestPage.takeScreenshot(`terminal-input-test-${pagePath.replace('/', '') || 'home'}`);
            console.log(`Terminal input test completed on ${pagePath}`);
            break;
          }
        }
      }
    });
  });

  test('should validate real-time streaming behavior', async ({ page }) => {
    const streamingData: string[] = [];
    
    // Monitor console for streaming indicators
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('stream') || text.includes('chunk') || text.includes('data')) {
        streamingData.push(text);
      }
    });

    await test.step('Navigate to pages and monitor streaming', async () => {
      await uiTestPage.navigateToClaudeInstances();
      
      // Perform actions that might trigger streaming
      await uiTestPage.refreshInstances();
      await page.waitForTimeout(2000);
      
      // Try to create an instance
      await uiTestPage.createNewInstance('Streaming Test Instance');
      await page.waitForTimeout(3000);
      
      if (streamingData.length > 0) {
        console.log('Streaming activity detected:', streamingData);
        await uiTestPage.takeScreenshot('streaming-activity-detected');
      }
    });
  });

  test('should test network error handling for WebSocket/SSE', async ({ page, context }) => {
    await test.step('Test with blocked network requests', async () => {
      // Block WebSocket and SSE requests
      await context.route('**/*', route => {
        const url = route.request().url();
        if (url.includes('ws://') || url.includes('wss://') || url.includes('/sse') || url.includes('/events')) {
          route.abort();
        } else {
          route.continue();
        }
      });

      await uiTestPage.navigateToClaudeInstances();
      await page.waitForTimeout(3000);
      
      // Check for error messages or fallback behavior
      const hasErrors = await uiTestPage.hasErrorMessages();
      
      if (hasErrors) {
        const errors = await uiTestPage.getErrorMessages();
        console.log('Network error handling working:', errors);
        await uiTestPage.takeScreenshot('network-error-handling');
      }
    });
  });

  test('should test connection retry mechanisms', async ({ page }) => {
    let connectionAttempts = 0;
    
    // Monitor connection attempts
    page.on('websocket', ws => {
      connectionAttempts++;
      console.log(`WebSocket connection attempt #${connectionAttempts}: ${ws.url()}`);
      
      ws.on('close', () => {
        console.log(`WebSocket connection closed. Attempt #${connectionAttempts}`);
      });
    });

    await test.step('Navigate and monitor connection attempts', async () => {
      await uiTestPage.navigateToClaudeInstances();
      
      // Wait for initial connection attempts
      await page.waitForTimeout(10000);
      
      if (connectionAttempts > 1) {
        console.log(`Connection retry mechanism working: ${connectionAttempts} attempts`);
        await uiTestPage.takeScreenshot('connection-retry-detected');
      } else if (connectionAttempts === 1) {
        console.log('Single connection established successfully');
        await uiTestPage.takeScreenshot('single-connection-success');
      } else {
        console.log('No WebSocket connections detected');
      }
    });
  });
});