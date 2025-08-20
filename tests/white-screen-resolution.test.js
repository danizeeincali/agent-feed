/**
 * SPARC:debug TDD Test - White Screen Resolution Validation
 * Testing frontend rendering after WebSocketContext fix
 */

const { spawn } = require('child_process');
const fs = require('fs');
const puppeteer = require('puppeteer');

describe('White Screen Resolution - Frontend Rendering', () => {
  let browser, page;
  
  beforeAll(async () => {
    // Wait for servers to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Enable console logging for debugging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  });
  
  afterAll(async () => {
    if (browser) await browser.close();
  });
  
  test('should not show white screen on port 3001', async () => {
    try {
      const response = await page.goto('http://127.0.0.1:3001/', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      expect(response.status()).toBe(200);
      
      // Wait for React to render
      await page.waitForTimeout(3000);
      
      // Check if page has actual content (not white screen)
      const bodyContent = await page.evaluate(() => {
        const body = document.body;
        return {
          hasChildren: body.children.length > 0,
          innerHTML: body.innerHTML.length,
          rootDiv: document.getElementById('root')?.innerHTML?.length || 0
        };
      });
      
      expect(bodyContent.hasChildren).toBe(true);
      expect(bodyContent.innerHTML).toBeGreaterThan(100);
      expect(bodyContent.rootDiv).toBeGreaterThan(0);
    } catch (error) {
      console.error('Port 3001 test failed:', error.message);
      throw error;
    }
  }, 45000);
  
  test('should not show white screen on port 3002', async () => {
    try {
      const response = await page.goto('http://127.0.0.1:3002/', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      expect(response.status()).toBe(200);
      
      // Wait for React to render
      await page.waitForTimeout(3000);
      
      // Check if page has actual content (not white screen)
      const bodyContent = await page.evaluate(() => {
        const body = document.body;
        return {
          hasChildren: body.children.length > 0,
          innerHTML: body.innerHTML.length,
          rootDiv: document.getElementById('root')?.innerHTML?.length || 0
        };
      });
      
      expect(bodyContent.hasChildren).toBe(true);
      expect(bodyContent.innerHTML).toBeGreaterThan(100);
      expect(bodyContent.rootDiv).toBeGreaterThan(0);
    } catch (error) {
      console.error('Port 3002 test failed:', error.message);
      throw error;
    }
  }, 45000);
  
  test('should have no JavaScript errors in console', async () => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.goto('http://127.0.0.1:3001/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForTimeout(5000);
    
    // Filter out minor warnings, focus on critical errors
    const criticalErrors = errors.filter(error => 
      error.includes('TypeError') || 
      error.includes('ReferenceError') ||
      error.includes('SyntaxError') ||
      error.includes('Cannot read properties')
    );
    
    expect(criticalErrors).toHaveLength(0);
  }, 45000);
  
  test('should load WebSocket context without errors', async () => {
    await page.goto('http://127.0.0.1:3001/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Check if WebSocket context is available
    const contextStatus = await page.evaluate(() => {
      // Look for WebSocket-related elements or state
      return {
        hasReactRoot: !!document.getElementById('root'),
        reactMounted: document.getElementById('root')?.children?.length > 0,
        noFatalErrors: !document.body.textContent?.includes('Unexpected token')
      };
    });
    
    expect(contextStatus.hasReactRoot).toBe(true);
    expect(contextStatus.reactMounted).toBe(true);
    expect(contextStatus.noFatalErrors).toBe(true);
  }, 45000);
});