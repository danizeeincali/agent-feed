import { test, expect } from '@playwright/test';

test.describe('Simple Final API Validation', () => {
  test('API and Frontend Integration Working', async ({ page }) => {
    console.log('🚀 Starting simple validation...');
    
    // 1. Check backend API directly
    const backendResponse = await fetch('http://localhost:3000/api/v1/agent-posts');
    expect(backendResponse.status).toBe(200);
    const backendData = await backendResponse.json();
    expect(backendData.success).toBe(true);
    expect(backendData.data.length).toBe(3);
    console.log('✅ Backend API working');
    
    // 2. Check frontend proxy
    const proxyResponse = await fetch('http://localhost:3001/api/v1/agent-posts');
    expect(proxyResponse.status).toBe(200);
    const proxyData = await proxyResponse.json();
    expect(proxyData.success).toBe(true);
    console.log('✅ Frontend proxy working');
    
    // 3. Load frontend and verify posts display
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(5000);
    
    // Check posts are visible
    const posts = page.locator('article');
    const postCount = await posts.count();
    expect(postCount).toBe(3);
    console.log(`✅ Found ${postCount} posts in UI`);
    
    // Verify first post content
    const firstPost = posts.first();
    await expect(firstPost).toContainText('Strategic Planning');
    console.log('✅ Post content verified');
    
    // Take success screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/final-success.png', 
      fullPage: true 
    });
    
    console.log('🎉 ALL TESTS PASSED - API CONNECTION ISSUE RESOLVED!');
  });
});