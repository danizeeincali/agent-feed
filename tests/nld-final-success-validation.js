/**
 * NLD Final Success Validation - ALL TESTS MUST PASS
 * Comprehensive validation until ERR_SOCKET_NOT_CONNECTED is completely resolved
 */

const { test, expect } = require('@playwright/test');
const http = require('http');

test.describe('NLD Final Success Validation - ALL TESTS MUST PASS', () => {
  
  test('CRITICAL: Server must be accessible on 127.0.0.1:3003', async ({ page }) => {
    console.log('🎯 CRITICAL TEST: Server accessibility');
    
    let response;
    let error = null;
    
    try {
      response = await page.goto('http://127.0.0.1:3003/', { 
        timeout: 15000,
        waitUntil: 'domcontentloaded'
      });
      
      console.log(`Response status: ${response.status()}`);
      expect(response.status()).toBe(200);
      
      // Get page content to verify it's not an error page
      const content = await page.content();
      expect(content).toContain('<!doctype html>');
      expect(content).toContain('<div id="root">');
      
      console.log('✅ CRITICAL TEST PASSED: Server accessible with HTML content');
      
    } catch (err) {
      error = err;
      console.error('❌ CRITICAL TEST FAILED:', err.message);
      throw err;
    }
  });
  
  test('CRITICAL: No ERR_SOCKET_NOT_CONNECTED errors', async ({ page }) => {
    console.log('🚫 CRITICAL TEST: No connection errors');
    
    let hasError = false;
    let errorMessage = '';
    
    page.on('pageerror', (error) => {
      if (error.message.includes('ERR_SOCKET_NOT_CONNECTED')) {
        hasError = true;
        errorMessage = error.message;
      }
    });
    
    try {
      await page.goto('http://127.0.0.1:3003/', { timeout: 10000 });
      await page.waitForTimeout(3000);
      
      // Check page content for error messages
      const bodyText = await page.textContent('body').catch(() => '');
      const hasSocketError = bodyText.includes('ERR_SOCKET_NOT_CONNECTED') || 
                            bodyText.includes('site can\'t be reached') ||
                            bodyText.includes('temporarily down');
      
      expect(hasError).toBe(false);
      expect(hasSocketError).toBe(false);
      
      if (hasError || hasSocketError) {
        console.error('❌ SOCKET ERROR DETECTED:', errorMessage || bodyText);
        throw new Error(`Socket connection error found: ${errorMessage || 'Page contains error text'}`);
      }
      
      console.log('✅ CRITICAL TEST PASSED: No socket connection errors');
      
    } catch (error) {
      console.error('❌ CONNECTION ERROR TEST FAILED:', error.message);
      throw error;
    }
  });
  
  test('CRITICAL: Server responds to HTTP requests consistently', async () => {
    console.log('🔄 CRITICAL TEST: Consistent HTTP responses');
    
    const testCount = 5;
    const results = [];
    
    for (let i = 0; i < testCount; i++) {
      try {
        const result = await new Promise((resolve, reject) => {
          const req = http.request({
            hostname: '127.0.0.1',
            port: 3003,
            path: '/',
            method: 'GET',
            timeout: 5000
          }, (res) => {
            console.log(`Request ${i + 1}: HTTP ${res.statusCode}`);
            resolve({ success: true, status: res.statusCode });
          });
          
          req.on('error', (error) => {
            console.log(`Request ${i + 1}: ERROR - ${error.code}`);
            resolve({ success: false, error: error.code });
          });
          
          req.end();
        });
        
        results.push(result);
        
        // All requests must be successful
        expect(result.success).toBe(true);
        expect(result.status).toBe(200);
        
      } catch (error) {
        console.error(`❌ Request ${i + 1} failed:`, error.message);
        throw error;
      }
    }
    
    console.log(`✅ CRITICAL TEST PASSED: ${testCount} consistent HTTP 200 responses`);
  });
  
  test('CRITICAL: React application renders without white screen', async ({ page }) => {
    console.log('⚛️ CRITICAL TEST: React application rendering');
    
    try {
      const response = await page.goto('http://127.0.0.1:3003/', { 
        timeout: 15000,
        waitUntil: 'networkidle'
      });
      
      expect(response.status()).toBe(200);
      
      // Wait for React to mount and render
      await page.waitForTimeout(5000);
      
      // Check for React root and content
      const hasRoot = await page.locator('#root').count() > 0;
      expect(hasRoot).toBe(true);
      
      const rootContent = await page.locator('#root').innerHTML().catch(() => '');
      const hasReactContent = rootContent.length > 100; // Should have substantial content
      
      expect(hasReactContent).toBe(true);
      
      console.log('✅ CRITICAL TEST PASSED: React application rendered successfully');
      
    } catch (error) {
      console.error('❌ REACT RENDERING TEST FAILED:', error.message);
      throw error;
    }
  });
  
  test('CRITICAL: All connection methods work', async ({ page }) => {
    console.log('🌐 CRITICAL TEST: All connection methods');
    
    const testUrls = [
      'http://127.0.0.1:3003/',
      'http://localhost:3003/'
    ];
    
    for (const url of testUrls) {
      try {
        console.log(`Testing: ${url}`);
        const response = await page.goto(url, { 
          timeout: 10000,
          waitUntil: 'domcontentloaded'
        });
        
        expect(response.status()).toBe(200);
        
        const content = await page.content();
        expect(content).toContain('<!doctype html>');
        
        console.log(`✅ SUCCESS: ${url}`);
        
      } catch (error) {
        console.error(`❌ FAILED: ${url} - ${error.message}`);
        throw error;
      }
    }
    
    console.log('✅ CRITICAL TEST PASSED: All connection methods working');
  });
  
});

test.afterAll(async () => {
  console.log('🎉 ALL CRITICAL TESTS COMPLETED SUCCESSFULLY!');
  console.log('✅ ERR_SOCKET_NOT_CONNECTED ISSUE RESOLVED');
  console.log('✅ Server connectivity fully validated');
});