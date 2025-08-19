import { test, expect } from '@playwright/test';

test.describe('Final API Validation Tests', () => {
  test('Complete API-Frontend Integration Check', async ({ page }) => {
    test.setTimeout(90000); // Increase timeout to 90 seconds
    console.log('Starting comprehensive API validation...');
    
    // 1. Check backend is running
    const backendResponse = await fetch('http://localhost:3000/api/v1/agent-posts');
    expect(backendResponse.status).toBe(200);
    const backendData = await backendResponse.json();
    expect(backendData.success).toBe(true);
    expect(backendData.data).toBeDefined();
    expect(backendData.data.length).toBeGreaterThan(0);
    console.log('✅ Backend API is working');
    
    // 2. Check frontend proxy
    const proxyResponse = await fetch('http://localhost:3001/api/v1/agent-posts');
    expect(proxyResponse.status).toBe(200);
    const proxyData = await proxyResponse.json();
    expect(proxyData.success).toBe(true);
    console.log('✅ Frontend proxy is working');
    
    // 3. Check health endpoint
    const healthResponse = await fetch('http://localhost:3000/health');
    expect(healthResponse.status).toBe(200);
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    console.log('✅ Health endpoint is working');
    
    // 4. Load the frontend
    await page.goto('http://localhost:3001');
    
    // Wait for any initial loading
    await page.waitForTimeout(3000);
    
    // 5. Check for error messages
    const errorElement = page.locator('[data-testid="error-state"], text=/Unable to load feed|Error connecting/i');
    const hasError = await errorElement.isVisible().catch(() => false);
    
    if (hasError) {
      // If error is showing, click retry
      const retryButton = page.locator('button:has-text("Retry")');
      if (await retryButton.isVisible()) {
        console.log('Clicking retry button...');
        await retryButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // 6. Check if posts are visible
    const posts = page.locator('article');
    const postCount = await posts.count();
    console.log(`Found ${postCount} posts`);
    
    if (postCount === 0) {
      // Take a diagnostic screenshot
      await page.screenshot({ 
        path: 'tests/screenshots/no-posts-diagnostic.png', 
        fullPage: true 
      });
      
      // Log page content for debugging
      const pageContent = await page.content();
      console.log('Page HTML snippet:', pageContent.substring(0, 500));
      
      // Check console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      if (consoleErrors.length > 0) {
        console.log('Console errors:', consoleErrors);
      }
    }
    
    // 7. Verify posts are displayed
    expect(postCount).toBeGreaterThan(0);
    console.log('✅ Posts are displayed in the UI');
    
    // 8. Verify post content
    const firstPost = posts.first();
    const postText = await firstPost.textContent();
    expect(postText).toContain('Strategic Planning');
    console.log('✅ Post content is correct');
    
    // 9. Take success screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/api-working-success.png', 
      fullPage: true 
    });
    
    console.log('✅ All API validation tests passed!');
  });
  
  test('Direct API Data Validation', async () => {
    // Direct test of API endpoints
    const response = await fetch('http://localhost:3000/api/v1/agent-posts');
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(3); // We have 3 demo posts
    
    // Validate post structure
    const post = data.data[0];
    expect(post).toHaveProperty('id');
    expect(post).toHaveProperty('title');
    expect(post).toHaveProperty('content');
    expect(post).toHaveProperty('authorAgent');
    expect(post).toHaveProperty('publishedAt');
    expect(post).toHaveProperty('metadata');
    
    // Validate metadata
    expect(post.metadata).toHaveProperty('isAgentResponse', true);
    expect(post.metadata).toHaveProperty('businessImpact');
    expect(post.metadata).toHaveProperty('tags');
    expect(Array.isArray(post.metadata.tags)).toBe(true);
    
    console.log('✅ API data structure validation passed');
  });
});