import { test, expect } from '@playwright/test';

test.describe('Simple Page Content Test', () => {
  test('Verify dual-instance page renders content', async ({ page }) => {
    console.log('🧪 Testing dual-instance page content...');
    
    // Navigate to dual-instance page
    await page.goto('/dual-instance');
    
    // Wait for basic React app to load
    await page.waitForSelector('#root', { timeout: 10000 });
    
    // Check if root has content
    const rootContent = await page.innerHTML('#root');
    console.log(`📏 Root content length: ${rootContent.length} characters`);
    
    // Check for key elements that should be present
    const pageTitle = await page.textContent('h1');
    console.log(`📋 Page title: "${pageTitle}"`);
    
    // Check for dual instance specific content
    const dualInstanceTitle = await page.textContent('text=Dual Instance Monitor');
    console.log(`🔍 Dual Instance title found: ${!!dualInstanceTitle}`);
    
    // Check for tab elements
    const tabs = await page.$$('[role="tab"], [data-testid*="tab"]');
    console.log(`📑 Number of tabs found: ${tabs.length}`);
    
    // Check for agent cards or content areas
    const cards = await page.$$('.card, [data-testid*="card"]');
    console.log(`🃏 Number of cards found: ${cards.length}`);
    
    // Take screenshot for manual verification
    await page.screenshot({ 
      path: 'src/screenshots/dual-instance-actual-content.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved to: src/screenshots/dual-instance-actual-content.png');
    
    // Capture all text content
    const bodyText = await page.textContent('body');
    const visibleTextLength = bodyText?.trim().length || 0;
    console.log(`📝 Total visible text length: ${visibleTextLength} characters`);
    
    if (visibleTextLength > 0) {
      console.log(`📄 First 300 characters of content: "${bodyText?.substring(0, 300)}..."`);
    }
    
    // Log current state
    if (visibleTextLength > 100) {
      console.log('✅ PAGE IS RENDERING CONTENT - No white screen detected');
    } else {
      console.log('❌ PAGE APPEARS EMPTY - Possible white screen issue');
    }
    
    // Basic assertions to verify page is working
    expect(rootContent.length).toBeGreaterThan(100);
    expect(pageTitle).toBeTruthy();
    expect(visibleTextLength).toBeGreaterThan(50);
  });
  
  test('Check API endpoints behavior', async ({ page }) => {
    console.log('🌐 Testing API endpoint responses...');
    
    // Navigate to dual-instance page to trigger API calls
    await page.goto('/dual-instance');
    
    // Monitor network requests
    const apiRequests: { url: string; status: number; responseType: string }[] = [];
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        try {
          const contentType = response.headers()['content-type'] || '';
          const status = response.status();
          
          apiRequests.push({
            url: response.url(),
            status: status,
            responseType: contentType
          });
          
          console.log(`🔗 API Request: ${response.url()}`);
          console.log(`   Status: ${status}`);
          console.log(`   Content-Type: ${contentType}`);
          
          if (status >= 400) {
            const text = await response.text();
            console.log(`   Error response preview: ${text.substring(0, 100)}...`);
          }
        } catch (error) {
          console.log(`   Error reading response: ${error}`);
        }
      }
    });
    
    // Wait for potential API calls
    await page.waitForTimeout(5000);
    
    console.log(`📊 Total API requests captured: ${apiRequests.length}`);
    
    // Analyze API responses
    const failedRequests = apiRequests.filter(req => req.status >= 400);
    const htmlResponses = apiRequests.filter(req => 
      req.responseType.includes('html') && !req.responseType.includes('json')
    );
    
    console.log(`❌ Failed requests (4xx/5xx): ${failedRequests.length}`);
    console.log(`🔍 HTML responses (should be JSON): ${htmlResponses.length}`);
    
    if (htmlResponses.length > 0) {
      console.log('🚨 ISSUE IDENTIFIED: API endpoints returning HTML instead of JSON');
      htmlResponses.forEach(req => {
        console.log(`   - ${req.url} (${req.status}) -> ${req.responseType}`);
      });
    }
  });
});