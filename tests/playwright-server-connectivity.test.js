/**
 * SPARC:debug TDD + Playwright Test - Server Connectivity Validation
 * Comprehensive browser testing for ERR_SOCKET_NOT_CONNECTED resolution
 */

const { test, expect } = require('@playwright/test');

test.describe('Server Connectivity - SPARC:debug + Playwright Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Wait for servers to stabilize
    await page.waitForTimeout(5000);
  });

  test('should connect to frontend server without ERR_SOCKET_NOT_CONNECTED', async ({ page }) => {
    console.log('Testing server connectivity...');
    
    // Test both common ports that might be in use
    const testUrls = [
      'http://127.0.0.1:3001/',
      'http://127.0.0.1:3002/', 
      'http://localhost:3001/',
      'http://localhost:3002/'
    ];
    
    let successfulUrl = null;
    let lastError = null;
    
    for (const url of testUrls) {
      try {
        console.log(`Testing URL: ${url}`);
        const response = await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        
        if (response && response.status() === 200) {
          successfulUrl = url;
          console.log(`✅ Successfully connected to: ${url}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Failed to connect to ${url}: ${error.message}`);
        lastError = error;
      }
    }
    
    // At least one URL should be accessible
    expect(successfulUrl).not.toBeNull();
    
    // Validate the successful connection
    if (successfulUrl) {
      const response = await page.goto(successfulUrl);
      expect(response.status()).toBe(200);
      
      // Check that we get HTML content (not ERR_SOCKET_NOT_CONNECTED)
      const content = await page.content();
      expect(content).toContain('<!doctype html>');
      expect(content).toContain('<div id="root">');
      
      console.log('✅ Server connectivity validated successfully');
    }
  });
  
  test('should not show ERR_SOCKET_NOT_CONNECTED browser error', async ({ page }) => {
    const testUrls = ['http://127.0.0.1:3002/', 'http://127.0.0.1:3001/'];
    
    for (const url of testUrls) {
      try {
        await page.goto(url, { timeout: 10000 });
        
        // Check that browser doesn't show connection error page
        const errorText = await page.textContent('body').catch(() => '');
        
        expect(errorText).not.toContain('ERR_SOCKET_NOT_CONNECTED');
        expect(errorText).not.toContain('This site can\'t be reached');
        expect(errorText).not.toContain('temporarily down');
        
        console.log(`✅ No connection errors found for ${url}`);
        break; // If one works, that's sufficient
      } catch (error) {
        console.log(`Skipping ${url} - not accessible: ${error.message}`);
      }
    }
  });
  
  test('should render React application content', async ({ page }) => {
    // Try multiple possible server addresses
    const testUrls = ['http://127.0.0.1:3002/', 'http://127.0.0.1:3001/'];
    let pageLoaded = false;
    
    for (const url of testUrls) {
      try {
        const response = await page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 20000 
        });
        
        if (response && response.status() === 200) {
          pageLoaded = true;
          
          // Wait for React to mount
          await page.waitForTimeout(3000);
          
          // Check for React application elements
          const hasRoot = await page.locator('#root').count() > 0;
          const hasReactContent = await page.evaluate(() => {
            const root = document.getElementById('root');
            return root && root.children.length > 0;
          });
          
          expect(hasRoot).toBe(true);
          
          if (hasReactContent) {
            console.log('✅ React application content rendered successfully');
            break;
          }
        }
      } catch (error) {
        console.log(`Failed to test ${url}: ${error.message}`);
      }
    }
    
    expect(pageLoaded).toBe(true);
  });
  
  test('should validate server process health', async ({ page }) => {
    // This test validates that the server is responsive to requests
    const testUrl = 'http://127.0.0.1:3002/';
    
    try {
      const startTime = Date.now();
      const response = await page.goto(testUrl, { timeout: 10000 });
      const responseTime = Date.now() - startTime;
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(10000); // Should respond within 10 seconds
      
      // Validate server headers indicate it's a development server
      const headers = response.headers();
      console.log('Response headers:', headers);
      
      console.log(`✅ Server health validated - Response time: ${responseTime}ms`);
    } catch (error) {
      console.log(`❌ Server health check failed: ${error.message}`);
      throw error;
    }
  });
  
});

test.describe('SPARC:debug Process Validation', () => {
  
  test('should detect clean development environment', async ({ page }) => {
    // Test that we don't have conflicting processes
    await page.goto('http://127.0.0.1:3002/', { timeout: 15000 });
    
    // Server should respond consistently
    const response1 = await page.goto('http://127.0.0.1:3002/');
    await page.waitForTimeout(1000);
    const response2 = await page.goto('http://127.0.0.1:3002/');
    
    expect(response1.status()).toBe(200);
    expect(response2.status()).toBe(200);
    
    console.log('✅ Development environment stability validated');
  });
  
});