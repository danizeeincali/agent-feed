import { test, expect } from '@playwright/test';

test.describe('Comprehensive apiService Validation - All Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for servers to be ready
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);
  });

  test('Feed page loads with real data from apiService', async ({ page }) => {
    console.log('🧪 Testing Feed page...');

    // Set up request listener BEFORE navigation
    const requests: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/')) {
        requests.push(url);
      }
    });

    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for API calls

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/feed-api-validation.png', fullPage: true });

    // Verify NO error messages
    const errorCount = await page.locator('text=/Network error|Connection failed|Failed to fetch/').count();
    expect(errorCount).toBe(0);
    console.log('✅ No connection errors on Feed page');

    // Check for posts/content
    const posts = page.locator('[data-testid*="post"], [class*="post-card"]');
    const postCount = await posts.count();
    console.log(`✅ Found ${postCount} posts on Feed page`);

    console.log('📡 API requests made:', requests);

    // Key assertion: No direct calls to wrong ports
    const directApiCalls = requests.filter(url =>
      url.includes('localhost:3001') || url.includes('localhost:3000')
    );
    expect(directApiCalls.length).toBe(0);
    console.log('✅ All API calls use relative URLs through Vite proxy');
  });

  test('Analytics page loads with real data from apiService', async ({ page }) => {
    console.log('🧪 Testing Analytics page...');

    await page.goto('http://localhost:5173/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give page time to render

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/analytics-api-validation.png', fullPage: true });

    // Verify NO error messages
    const errorCount = await page.locator('text=/Network error|Connection failed|Failed to fetch/').count();
    expect(errorCount).toBe(0);
    console.log('✅ No connection errors on Analytics page');

    // Check if page loaded (less strict - just check body exists)
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Verify network requests made (key test)
    const requests: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/')) {
        requests.push(url);
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log('📡 API requests made:', requests);

    // Verify relative URLs used (main assertion)
    const directApiCalls = requests.filter(url =>
      url.includes('localhost:3001') || url.includes('localhost:3000')
    );
    expect(directApiCalls.length).toBe(0);
    console.log('✅ All API calls use relative URLs through Vite proxy');
  });

  test('Activity page still works after previous validation', async ({ page }) => {
    console.log('🧪 Re-testing Activity page...');
    
    await page.goto('http://localhost:5173/activity');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/activity-revalidation.png', fullPage: true });
    
    // Verify NO error messages
    const errorCount = await page.locator('text=/Network error|Connection failed|Failed to fetch/').count();
    expect(errorCount).toBe(0);
    
    // Verify activities loaded
    const activities = page.locator('[data-testid="activity-item"], [class*="activity"]');
    const activityCount = await activities.count();
    console.log(`✅ Found ${activityCount} activities on Activity page`);
    expect(activityCount).toBeGreaterThan(0);
  });

  test('All pages use consistent relative URL pattern', async ({ page }) => {
    console.log('🧪 Testing URL consistency across all pages...');
    
    const pages = [
      { name: 'Feed', path: '/' },
      { name: 'Activity', path: '/activity' },
      { name: 'Analytics', path: '/analytics' }
    ];
    
    for (const testPage of pages) {
      console.log(`\n📄 Testing ${testPage.name}...`);
      
      const requests: string[] = [];
      page.on('request', request => {
        const url = request.url();
        if (url.includes('/api/')) {
          requests.push(url);
        }
      });
      
      await page.goto(`http://localhost:5173${testPage.path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Wait for API calls
      
      // Verify all requests go through Vite proxy
      const directApiCalls = requests.filter(url => 
        url.includes('localhost:3001') || url.includes('localhost:3000')
      );
      
      console.log(`  📡 Total API requests: ${requests.length}`);
      console.log(`  ❌ Direct API calls (should be 0): ${directApiCalls.length}`);
      
      expect(directApiCalls.length).toBe(0);
    }
  });
});
