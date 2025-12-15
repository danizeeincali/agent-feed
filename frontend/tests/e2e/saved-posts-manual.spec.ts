import { test, expect } from '@playwright/test';

/**
 * Manual Saved Posts Functionality Test
 * 
 * This test validates the actual saved posts functionality by:
 * 1. Loading the application
 * 2. Testing save/unsave on real posts
 * 3. Verifying API calls are made
 * 4. Testing the saved posts filter
 */

test.describe('Manual Saved Posts Testing', () => {
  test('should test saved posts functionality manually', async ({ page }) => {
    console.log('🔍 Starting manual saved posts test...');
    
    // Navigate to the application
    await page.goto('http://localhost:5173');
    console.log('✅ Navigated to application');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');
    
    // Take a screenshot to see the current state
    await page.screenshot({ path: 'test-results/screenshots/initial-state.png', fullPage: true });
    
    // Wait for posts to appear
    await page.waitForSelector('article', { timeout: 10000 });
    console.log('✅ Posts are visible');
    
    // Get all articles (posts)
    const posts = await page.locator('article').all();
    console.log(`✅ Found ${posts.length} posts`);
    
    if (posts.length > 0) {
      console.log('🔍 Testing first post...');
      const firstPost = posts[0];
      
      // Take a screenshot of the first post
      await firstPost.screenshot({ path: 'test-results/screenshots/first-post.png' });
      
      // Look for save/bookmark buttons in the first post
      const saveButtons = await firstPost.locator('button').all();
      
      for (let i = 0; i < saveButtons.length; i++) {
        const button = saveButtons[i];
        const buttonText = await button.textContent();
        const title = await button.getAttribute('title');
        
        console.log(`Button ${i}: "${buttonText}" (title: "${title}")`);
        
        // Check if this is a save button
        if (buttonText && (buttonText.includes('Save') || buttonText.includes('Saved')) ||
            title && (title.includes('Save') || title.includes('save'))) {
          
          console.log(`🎯 Found save button: "${buttonText}"`);
          
          // Monitor network requests
          const saveApiCalled = page.waitForRequest(request => 
            request.url().includes('/api/v1/agent-posts/') && 
            request.url().includes('/save') &&
            request.method() === 'POST'
          );
          
          // Click the save button
          await button.click();
          console.log('✅ Clicked save button');
          
          try {
            // Wait for the API call
            const request = await Promise.race([
              saveApiCalled,
              page.waitForTimeout(5000).then(() => null)
            ]);
            
            if (request) {
              console.log('✅ Save API call detected:', request.url());
              console.log('Method:', request.method());
              console.log('Headers:', await request.allHeaders());
              
              // Wait for response
              const response = await request.response();
              if (response) {
                console.log('Response status:', response.status());
                const responseText = await response.text();
                console.log('Response body:', responseText);
              }
            } else {
              console.log('⚠️ No save API call detected within timeout');
            }
          } catch (error) {
            console.log('⚠️ Error monitoring API call:', error);
          }
          
          // Wait a bit for UI to update
          await page.waitForTimeout(2000);
          
          // Check if button text changed
          const newButtonText = await button.textContent();
          console.log(`Button text after click: "${newButtonText}"`);
          
          // Take screenshot after save
          await firstPost.screenshot({ path: 'test-results/screenshots/after-save.png' });
          
          break;
        }
      }
      
      // Look for filter options
      console.log('🔍 Looking for filter options...');
      
      // Try to find filter buttons or dropdowns
      const allButtons = await page.locator('button, select').all();
      
      for (let i = 0; i < allButtons.length; i++) {
        const element = allButtons[i];
        const text = await element.textContent();
        
        if (text && (text.toLowerCase().includes('saved') || text.toLowerCase().includes('filter'))) {
          console.log(`🎯 Found potential filter element: "${text}"`);
          
          // If this looks like a saved filter, try clicking it
          if (text.toLowerCase().includes('saved')) {
            console.log('🔍 Testing saved filter...');
            
            // Monitor network requests for filter
            const filterApiCalled = page.waitForRequest(request => 
              request.url().includes('/api/v1/agent-posts') && 
              request.url().includes('filter=saved')
            );
            
            await element.click();
            console.log('✅ Clicked saved filter');
            
            try {
              const request = await Promise.race([
                filterApiCalled,
                page.waitForTimeout(5000).then(() => null)
              ]);
              
              if (request) {
                console.log('✅ Filter API call detected:', request.url());
                
                // Wait for response and new posts to load
                await page.waitForTimeout(3000);
                
                // Count posts after filter
                const filteredPosts = await page.locator('article').all();
                console.log(`✅ Posts after filter: ${filteredPosts.length}`);
                
                // Take screenshot of filtered results
                await page.screenshot({ path: 'test-results/screenshots/filtered-saved.png', fullPage: true });
              } else {
                console.log('⚠️ No filter API call detected within timeout');
              }
            } catch (error) {
              console.log('⚠️ Error monitoring filter API call:', error);
            }
            
            break;
          }
        }
      }
    } else {
      console.log('⚠️ No posts found');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/screenshots/final-state.png', fullPage: true });
    
    console.log('✅ Manual test completed');
  });
  
  test('should test backend API endpoints directly', async ({ page }) => {
    console.log('🔍 Testing backend API endpoints directly...');
    
    // Test the save API endpoint
    const saveResponse = await page.request.post('http://localhost:3000/api/v1/agent-posts/test-post-id/save', {
      data: {}
    });
    
    console.log('Save API Response Status:', saveResponse.status());
    console.log('Save API Response:', await saveResponse.text());
    
    // Test the unsave API endpoint
    const unsaveResponse = await page.request.delete('http://localhost:3000/api/v1/agent-posts/test-post-id/save?user_id=anonymous');
    
    console.log('Unsave API Response Status:', unsaveResponse.status());
    console.log('Unsave API Response:', await unsaveResponse.text());
    
    // Test the filtered posts API endpoint
    const filteredResponse = await page.request.get('http://localhost:3000/api/v1/agent-posts?filter=saved&user_id=anonymous');
    
    console.log('Filtered Posts API Response Status:', filteredResponse.status());
    console.log('Filtered Posts API Response:', await filteredResponse.text());
    
    console.log('✅ Backend API test completed');
  });
  
  test('should capture detailed component structure', async ({ page }) => {
    console.log('🔍 Analyzing component structure...');
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('article', { timeout: 10000 });
    
    // Get detailed HTML structure
    const bodyHTML = await page.locator('body').innerHTML();
    
    // Save the HTML structure for analysis
    require('fs').writeFileSync('test-results/screenshots/page-structure.html', bodyHTML);
    
    // Look for specific elements
    const saveButtons = await page.locator('button:has-text("Save"), button:has-text("Saved")').all();
    console.log(`Found ${saveButtons.length} save/saved buttons`);
    
    for (let i = 0; i < saveButtons.length; i++) {
      const button = saveButtons[i];
      const text = await button.textContent();
      const classes = await button.getAttribute('class');
      const title = await button.getAttribute('title');
      
      console.log(`Save button ${i}:`);
      console.log(`  Text: "${text}"`);
      console.log(`  Classes: "${classes}"`);
      console.log(`  Title: "${title}"`);
    }
    
    // Look for bookmark icons
    const bookmarkIcons = await page.locator('[data-lucide="bookmark"], svg[class*="bookmark"]').all();
    console.log(`Found ${bookmarkIcons.length} bookmark icons`);
    
    console.log('✅ Component structure analysis completed');
  });
});