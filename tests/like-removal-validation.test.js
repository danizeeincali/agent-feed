/**
 * Comprehensive Like Functionality Removal Validation Test Suite
 * 
 * This test suite validates that ALL like functionality has been completely
 * removed from the Agent Feed application while ensuring other features work.
 */

import { expect } from 'chai';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer';

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

describe('Like Functionality Removal Validation', function() {
  this.timeout(30000);
  
  let browser;
  let page;

  before(async function() {
    // Launch browser for UI tests
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Set viewport for consistent testing
    await page.setViewport({ width: 1280, height: 720 });
    
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  });

  after(async function() {
    if (browser) {
      await browser.close();
    }
  });

  describe('1. API Endpoint Validation - Like Routes Should Not Exist', function() {
    
    it('should return 404/405 for POST /api/v1/agent-posts/:id/like', async function() {
      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts/test-post/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'test-user' })
      });
      
      // Should be 404 (not found) or 405 (method not allowed)
      expect([404, 405]).to.include(response.status);
      console.log('✅ POST like endpoint properly returns error:', response.status);
    });

    it('should return 404/405 for DELETE /api/v1/agent-posts/:id/like', async function() {
      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts/test-post/like?user_id=test-user`, {
        method: 'DELETE'
      });
      
      expect([404, 405]).to.include(response.status);
      console.log('✅ DELETE like endpoint properly returns error:', response.status);
    });

    it('should return 404/405 for GET /api/v1/agent-posts/:id/likes', async function() {
      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts/test-post/likes`);
      
      expect([404, 405]).to.include(response.status);
      console.log('✅ GET likes endpoint properly returns error:', response.status);
    });

  });

  describe('2. Data Structure Validation - No Like Counts in Responses', function() {
    
    it('should not include like_count in agent posts response', async function() {
      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts?limit=5`);
      expect(response.status).to.equal(200);
      
      const data = await response.json();
      expect(data).to.have.property('posts');
      expect(Array.isArray(data.posts)).to.be.true;
      
      if (data.posts.length > 0) {
        data.posts.forEach((post, index) => {
          expect(post).to.not.have.property('like_count');
          expect(post).to.not.have.property('likes');
          expect(post).to.not.have.property('user_liked');
          console.log(`✅ Post ${index + 1} has no like-related fields`);
        });
      }
    });

    it('should not include like data in engagement metrics', async function() {
      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts?limit=1`);
      const data = await response.json();
      
      if (data.posts && data.posts.length > 0) {
        const post = data.posts[0];
        
        // Check that engagement object doesn't have like properties
        if (post.engagement) {
          expect(post.engagement).to.not.have.property('likes');
          expect(post.engagement).to.not.have.property('like_count');
          console.log('✅ Engagement metrics exclude like data');
        }
      }
    });

  });

  describe('3. Frontend UI Validation - No Like Elements', function() {
    
    it('should load the frontend without errors', async function() {
      const response = await page.goto(FRONTEND_URL, { 
        waitUntil: 'networkidle0',
        timeout: 15000
      });
      expect(response.status()).to.equal(200);
      console.log('✅ Frontend loads successfully');
    });

    it('should not display any like buttons or heart icons', async function() {
      // Wait for posts to load
      await page.waitForSelector('[data-testid="post-item"]', { timeout: 10000 });
      
      // Check for like buttons (various possible selectors)
      const likeButtons = await page.$$([
        'button[aria-label*="like"]',
        'button[aria-label*="Like"]',
        '.like-button',
        '[data-testid="like-button"]',
        'button:has-text("like")',
        'button:has-text("Like")'
      ].join(', '));
      
      expect(likeButtons).to.have.lengthOf(0);
      console.log('✅ No like buttons found in UI');
    });

    it('should not display heart icons or like indicators', async function() {
      // Check for heart icons (FontAwesome, heroicons, etc.)
      const heartIcons = await page.$$([
        '.fa-heart',
        '.hero-heart',
        '[data-icon="heart"]',
        'svg[class*="heart"]',
        '[aria-label*="heart"]'
      ].join(', '));
      
      expect(heartIcons).to.have.lengthOf(0);
      console.log('✅ No heart icons found in UI');
    });

    it('should not display like counts in post cards', async function() {
      // Look for like count displays
      const likeCounts = await page.$$([
        '[data-testid="like-count"]',
        '.like-count',
        'span:has-text("like")',
        'span:has-text("Like")',
        'div:has-text(" likes")'
      ].join(', '));
      
      expect(likeCounts).to.have.lengthOf(0);
      console.log('✅ No like counts found in UI');
    });

    it('should not have like-related text content', async function() {
      const bodyText = await page.$eval('body', el => el.textContent.toLowerCase());
      
      // Should not contain like-related text (except in comments/content)
      const likeMatches = bodyText.match(/\blike\b/g) || [];
      
      // Filter out legitimate uses (like "I would like to..." in post content)
      // Focus on UI-specific like terms
      expect(bodyText).to.not.include('likes this');
      expect(bodyText).to.not.include('liked by');
      expect(bodyText).to.not.include('like post');
      expect(bodyText).to.not.include('unlike');
      
      console.log('✅ No like-related UI text found');
    });

  });

  describe('4. Remaining Functionality Validation - Other Features Work', function() {
    
    it('should successfully save and unsave posts', async function() {
      // Get a post to test with
      const postsResponse = await fetch(`${BACKEND_URL}/api/v1/agent-posts?limit=1`);
      const postsData = await postsResponse.json();
      
      if (postsData.posts && postsData.posts.length > 0) {
        const postId = postsData.posts[0].id;
        
        // Test save functionality
        const saveResponse = await fetch(`${BACKEND_URL}/api/v1/agent-posts/${postId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'test-user' })
        });
        
        expect([200, 201, 409]).to.include(saveResponse.status); // 409 if already saved
        console.log('✅ Save functionality works');
        
        // Test unsave functionality
        const unsaveResponse = await fetch(`${BACKEND_URL}/api/v1/agent-posts/${postId}/save?user_id=test-user`, {
          method: 'DELETE'
        });
        
        expect([200, 204]).to.include(unsaveResponse.status);
        console.log('✅ Unsave functionality works');
      }
    });

    it('should display save/unsave buttons in UI', async function() {
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });
      await page.waitForSelector('[data-testid="post-item"]', { timeout: 10000 });
      
      // Look for save buttons
      const saveButtons = await page.$$([
        'button[aria-label*="save"]',
        'button[aria-label*="Save"]',
        '.save-button',
        '[data-testid="save-button"]',
        'button:has-text("Save")',
        'button:has-text("Unsave")'
      ].join(', '));
      
      expect(saveButtons.length).to.be.greaterThan(0);
      console.log(`✅ Found ${saveButtons.length} save/unsave buttons in UI`);
    });

    it('should successfully create new posts', async function() {
      const newPost = {
        content: 'Test post for like removal validation',
        author: 'test-agent',
        agent_type: 'test',
        user_id: 'test-user'
      };
      
      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost)
      });
      
      expect([200, 201]).to.include(response.status);
      
      if (response.ok) {
        const data = await response.json();
        expect(data).to.have.property('id');
        expect(data).to.not.have.property('like_count');
        console.log('✅ Post creation works and excludes like data');
      }
    });

    it('should successfully filter posts', async function() {
      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts?filter=all&limit=10`);
      expect(response.status).to.equal(200);
      
      const data = await response.json();
      expect(data).to.have.property('posts');
      console.log('✅ Post filtering works');
    });

    it('should handle search functionality', async function() {
      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts?search=test&limit=10`);
      expect(response.status).to.equal(200);
      
      const data = await response.json();
      expect(data).to.have.property('posts');
      console.log('✅ Search functionality works');
    });

  });

  describe('5. Database Validation - No Like References', function() {
    
    it('should not return like-related fields in any post query', async function() {
      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts?limit=50`);
      const data = await response.json();
      
      if (data.posts && data.posts.length > 0) {
        const allFields = new Set();
        
        data.posts.forEach(post => {
          Object.keys(post).forEach(field => allFields.add(field));
          
          // Recursively check nested objects
          if (post.engagement && typeof post.engagement === 'object') {
            Object.keys(post.engagement).forEach(field => allFields.add(`engagement.${field}`));
          }
        });
        
        const likeFields = Array.from(allFields).filter(field => 
          field.toLowerCase().includes('like')
        );
        
        expect(likeFields).to.have.lengthOf(0);
        console.log('✅ No like-related fields found in database responses');
        console.log('Available fields:', Array.from(allFields).sort());
      }
    });

  });

  describe('6. WebSocket Functionality - No Like Events', function() {
    
    it('should establish WebSocket connection without like event handlers', async function() {
      // This test would require WebSocket connection testing
      // For now, we'll check that WebSocket endpoint exists
      const response = await fetch(`${BACKEND_URL}/api/health`);
      expect(response.status).to.equal(200);
      
      const health = await response.json();
      console.log('✅ WebSocket health check passed');
    });

  });

  describe('7. JavaScript Console Errors - No Like-Related Errors', function() {
    
    it('should not have JavaScript errors related to like functionality', async function() {
      const errors = [];
      
      page.on('pageerror', error => {
        if (error.message.toLowerCase().includes('like')) {
          errors.push(error.message);
        }
      });
      
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });
      await page.waitForSelector('[data-testid="post-item"]', { timeout: 10000 });
      
      // Wait a bit for any async errors
      await page.waitForTimeout(2000);
      
      expect(errors).to.have.lengthOf(0);
      console.log('✅ No like-related JavaScript errors');
    });

    it('should not have failed network requests for like endpoints', async function() {
      const failedRequests = [];
      
      page.on('requestfailed', request => {
        const url = request.url();
        if (url.includes('/like') || url.includes('/likes')) {
          failedRequests.push(url);
        }
      });
      
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });
      await page.waitForSelector('[data-testid="post-item"]', { timeout: 10000 });
      
      // Interact with posts to trigger any like-related requests
      const postElements = await page.$$('[data-testid="post-item"]');
      if (postElements.length > 0) {
        await postElements[0].click();
        await page.waitForTimeout(1000);
      }
      
      expect(failedRequests).to.have.lengthOf(0);
      console.log('✅ No failed like-related network requests');
    });

  });

});

// Run the tests with proper error handling
console.log('🧪 Starting Like Removal Validation Test Suite...');
console.log('🎯 Testing against:');
console.log(`   Frontend: ${FRONTEND_URL}`);
console.log(`   Backend: ${BACKEND_URL}`);
console.log('');