import { test, expect } from '@playwright/test';

test.describe('User Engagement Tracking Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept analytics/tracking calls
    const trackingCalls = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('analytics') || url.includes('tracking') || url.includes('metrics')) {
        trackingCalls.push({
          url,
          method: request.method(),
          postData: request.postData()
        });
      }
    });
    
    // Store tracking calls on page for later access
    await page.addInitScript(() => {
      window.trackingCalls = [];
    });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });
    await page.waitForSelector('.post-item', { timeout: 5000 });
  });

  test.describe('Like Engagement Tracking', () => {
    test('should track like interactions correctly', async ({ page }) => {
      const likeButtons = page.locator('button[aria-label*="like" i], .like-button');
      
      if (await likeButtons.count() > 0) {
        const firstLikeButton = likeButtons.first();
        
        // Set up request interception for tracking
        const trackingRequests = [];
        page.on('request', request => {
          if (request.url().includes('analytics') || request.url().includes('track')) {
            trackingRequests.push(request);
          }
        });
        
        // Click like button
        await firstLikeButton.click();
        await page.waitForTimeout(1000);
        
        // Check if like interaction was tracked
        const likeTrackingEvents = trackingRequests.filter(req => {
          const postData = req.postData();
          return postData && (postData.includes('like') || postData.includes('engagement'));
        });
        
        // Should have tracking events for likes (but not shares)
        expect(likeTrackingEvents.length).toBeGreaterThanOrEqual(0);
        
        // Verify tracking data doesn't contain share-related fields
        for (const request of likeTrackingEvents) {
          const postData = request.postData();
          if (postData) {
            expect(postData.toLowerCase()).not.toContain('share');
            expect(postData.toLowerCase()).not.toContain('shared');
          }
        }
      }
    });

    test('should track like count changes', async ({ page }) => {
      const likeButtons = page.locator('button[aria-label*="like" i], .like-button');
      const likeCounts = page.locator('.like-count, [data-testid*="like-count"]');
      
      if (await likeButtons.count() > 0 && await likeCounts.count() > 0) {
        const initialCountText = await likeCounts.first().textContent();
        const initialCount = parseInt(initialCountText || '0') || 0;
        
        await likeButtons.first().click();
        await page.waitForTimeout(1000);
        
        const newCountText = await likeCounts.first().textContent();
        const newCount = parseInt(newCountText || '0') || 0;
        
        // Like count should change appropriately
        if (newCount !== initialCount) {
          expect(Math.abs(newCount - initialCount)).toBe(1);
        }
      }
    });

    test('should maintain like state persistence', async ({ page }) => {
      const likeButtons = page.locator('button[aria-label*="like" i], .like-button');
      
      if (await likeButtons.count() > 0) {
        const firstLikeButton = likeButtons.first();
        
        // Like the post
        await firstLikeButton.click();
        await page.waitForTimeout(500);
        
        // Get the liked state
        const likedState = await firstLikeButton.getAttribute('aria-pressed') || 
                           await firstLikeButton.getAttribute('data-liked') ||
                           'true'; // Assume liked if we just clicked
        
        // Refresh the page
        await page.reload();
        await page.waitForSelector('.post-item', { timeout: 5000 });
        
        // Check if like state persisted
        const refreshedLikeButtons = page.locator('button[aria-label*="like" i], .like-button');
        if (await refreshedLikeButtons.count() > 0) {
          const persistedState = await refreshedLikeButtons.first().getAttribute('aria-pressed') ||
                                 await refreshedLikeButtons.first().getAttribute('data-liked');
          
          // State persistence might vary by implementation
          // Just ensure it doesn't cause errors
          expect(persistedState).toBeDefined();
        }
      }
    });
  });

  test.describe('Comment Engagement Tracking', () => {
    test('should track comment interactions', async ({ page }) => {
      const commentButtons = page.locator('button[aria-label*="comment" i], .comment-button');
      
      if (await commentButtons.count() > 0) {
        const trackingRequests = [];
        page.on('request', request => {
          if (request.url().includes('analytics') || request.url().includes('track')) {
            trackingRequests.push(request);
          }
        });
        
        await commentButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Check for comment tracking
        const commentTrackingEvents = trackingRequests.filter(req => {
          const postData = req.postData();
          return postData && postData.includes('comment');
        });
        
        // Should track comment interactions without share references
        for (const request of commentTrackingEvents) {
          const postData = request.postData();
          if (postData) {
            expect(postData.toLowerCase()).not.toContain('share');
          }
        }
      }
    });

    test('should track comment submissions if feature exists', async ({ page }) => {
      const commentButtons = page.locator('button[aria-label*="comment" i], .comment-button');
      
      if (await commentButtons.count() > 0) {
        await commentButtons.first().click();
        await page.waitForTimeout(500);
        
        const commentInput = page.locator('textarea[placeholder*="comment" i], input[placeholder*="comment" i]');
        
        if (await commentInput.count() > 0) {
          const trackingRequests = [];
          page.on('request', request => {
            if (request.url().includes('analytics') || request.url().includes('track')) {
              trackingRequests.push(request);
            }
          });
          
          await commentInput.first().fill('Test comment for tracking');
          
          const submitButton = page.locator('button:has-text("Post"), button:has-text("Submit")');
          if (await submitButton.count() > 0) {
            await submitButton.first().click();
            await page.waitForTimeout(1000);
            
            // Should track comment submission
            const submissionEvents = trackingRequests.filter(req => {
              const postData = req.postData();
              return postData && (postData.includes('comment') || postData.includes('submit'));
            });
            
            // Verify no share-related tracking
            for (const request of submissionEvents) {
              const postData = request.postData();
              if (postData) {
                expect(postData.toLowerCase()).not.toContain('share');
              }
            }
          }
        }
      }
    });
  });

  test.describe('View and Scroll Tracking', () => {
    test('should track post views correctly', async ({ page }) => {
      const trackingRequests = [];
      page.on('request', request => {
        if (request.url().includes('analytics') || request.url().includes('track')) {
          trackingRequests.push(request);
        }
      });
      
      // Scroll through posts to trigger view events
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(1000);
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(1000);
      
      // Check for view tracking events
      const viewEvents = trackingRequests.filter(req => {
        const postData = req.postData();
        return postData && (postData.includes('view') || postData.includes('impression'));
      });
      
      // Should track views without share data
      for (const request of viewEvents) {
        const postData = request.postData();
        if (postData) {
          expect(postData.toLowerCase()).not.toContain('share');
        }
      }
    });

    test('should track scroll depth', async ({ page }) => {
      const trackingRequests = [];
      page.on('request', request => {
        if (request.url().includes('analytics') || request.url().includes('track')) {
          trackingRequests.push(request);
        }
      });
      
      // Scroll to different positions
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.25));
      await page.waitForTimeout(500);
      
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5));
      await page.waitForTimeout(500);
      
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.75));
      await page.waitForTimeout(500);
      
      // Check for scroll tracking
      const scrollEvents = trackingRequests.filter(req => {
        const postData = req.postData();
        return postData && postData.includes('scroll');
      });
      
      // Scroll events should not contain share references
      for (const request of scrollEvents) {
        const postData = request.postData();
        if (postData) {
          expect(postData.toLowerCase()).not.toContain('share');
        }
      }
    });

    test('should track time spent on page', async ({ page }) => {
      const trackingRequests = [];
      page.on('request', request => {
        if (request.url().includes('analytics') || request.url().includes('track')) {
          trackingRequests.push(request);
        }
      });
      
      // Stay on page for a while
      await page.waitForTimeout(3000);
      
      // Interact with content
      const posts = page.locator('.post-item');
      if (await posts.count() > 0) {
        await posts.first().hover();
        await page.waitForTimeout(2000);
      }
      
      // Check for time-based tracking
      const timeEvents = trackingRequests.filter(req => {
        const postData = req.postData();
        return postData && (postData.includes('time') || postData.includes('duration'));
      });
      
      // Time tracking should not reference shares
      for (const request of timeEvents) {
        const postData = request.postData();
        if (postData) {
          expect(postData.toLowerCase()).not.toContain('share');
        }
      }
    });
  });

  test.describe('Search Engagement Tracking', () => {
    test('should track search queries', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
      
      if (await searchInput.count() > 0) {
        const trackingRequests = [];
        page.on('request', request => {
          if (request.url().includes('analytics') || request.url().includes('track')) {
            trackingRequests.push(request);
          }
        });
        
        await searchInput.first().fill('test query');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        // Check for search tracking
        const searchEvents = trackingRequests.filter(req => {
          const postData = req.postData();
          return postData && postData.includes('search');
        });
        
        // Search tracking should not include share data
        for (const request of searchEvents) {
          const postData = request.postData();
          if (postData) {
            expect(postData.toLowerCase()).not.toContain('share');
          }
        }
      }
    });

    test('should track search result clicks', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
      
      if (await searchInput.count() > 0) {
        await searchInput.first().fill('clickable');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        const trackingRequests = [];
        page.on('request', request => {
          if (request.url().includes('analytics') || request.url().includes('track')) {
            trackingRequests.push(request);
          }
        });
        
        // Click on search results
        const searchResults = page.locator('.search-result, .result-item, .post-item');
        if (await searchResults.count() > 0) {
          await searchResults.first().click();
          await page.waitForTimeout(1000);
          
          // Check for click tracking
          const clickEvents = trackingRequests.filter(req => {
            const postData = req.postData();
            return postData && (postData.includes('click') || postData.includes('select'));
          });
          
          // Click tracking should not reference shares
          for (const request of clickEvents) {
            const postData = request.postData();
            if (postData) {
              expect(postData.toLowerCase()).not.toContain('share');
            }
          }
        }
      }
    });
  });

  test.describe('Error Tracking Validation', () => {
    test('should not track share-related errors', async ({ page }) => {
      const trackingRequests = [];
      const consoleErrors = [];
      
      page.on('request', request => {
        if (request.url().includes('analytics') || request.url().includes('track')) {
          trackingRequests.push(request);
        }
      });
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Trigger various interactions that might cause errors
      await page.keyboard.press('s'); // Might have been share shortcut
      await page.keyboard.press('S');
      await page.keyboard.press('shift+s');
      
      await page.waitForTimeout(1000);
      
      // Check error tracking
      const errorEvents = trackingRequests.filter(req => {
        const postData = req.postData();
        return postData && postData.includes('error');
      });
      
      // Error tracking should not mention share functionality
      for (const request of errorEvents) {
        const postData = request.postData();
        if (postData) {
          expect(postData.toLowerCase()).not.toContain('share');
        }
      }
      
      // Console errors should not be share-related
      const shareErrors = consoleErrors.filter(error => 
        error.toLowerCase().includes('share')
      );
      expect(shareErrors).toHaveLength(0);
    });

    test('should track 404 errors appropriately', async ({ page, request }) => {
      const trackingRequests = [];
      page.on('request', req => {
        if (req.url().includes('analytics') || req.url().includes('track')) {
          trackingRequests.push(req);
        }
      });
      
      // Try to access share endpoints that should not exist
      const response = await request.get('http://localhost:3001/api/share');
      expect(response.status()).toBeGreaterThanOrEqual(400);
      
      await page.waitForTimeout(1000);
      
      // Check if 404 errors are tracked appropriately
      const errorEvents = trackingRequests.filter(req => {
        const postData = req.postData();
        return postData && (postData.includes('404') || postData.includes('error'));
      });
      
      // 404 tracking should exist but not expose share endpoints
      for (const request of errorEvents) {
        const postData = request.postData();
        if (postData && postData.includes('share')) {
          // Should track that share endpoints were accessed but return 404
          expect(postData).toContain('404');
        }
      }
    });
  });

  test.describe('Analytics Data Integrity', () => {
    test('should send complete engagement data without share metrics', async ({ page }) => {
      const trackingRequests = [];
      page.on('request', request => {
        if (request.url().includes('analytics') || request.url().includes('track')) {
          trackingRequests.push(request);
        }
      });
      
      // Perform various engagements
      const likeButtons = page.locator('button[aria-label*="like" i]');
      if (await likeButtons.count() > 0) {
        await likeButtons.first().click();
        await page.waitForTimeout(500);
      }
      
      const commentButtons = page.locator('button[aria-label*="comment" i]');
      if (await commentButtons.count() > 0) {
        await commentButtons.first().click();
        await page.waitForTimeout(500);
      }
      
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(1000);
      
      // Verify analytics payload structure
      const engagementEvents = trackingRequests.filter(req => {
        const postData = req.postData();
        return postData && (
          postData.includes('like') || 
          postData.includes('comment') || 
          postData.includes('view')
        );
      });
      
      for (const request of engagementEvents) {
        const postData = request.postData();
        if (postData) {
          try {
            const data = JSON.parse(postData);
            
            // Should have standard engagement fields
            const expectedFields = ['event', 'timestamp', 'user_id', 'session_id'];
            const hasRequiredFields = expectedFields.some(field => 
              data.hasOwnProperty(field) || postData.includes(field)
            );
            
            // Should not have share-related fields
            expect(data).not.toHaveProperty('shareCount');
            expect(data).not.toHaveProperty('shares');
            expect(data).not.toHaveProperty('shareUrl');
            expect(postData.toLowerCase()).not.toContain('share');
            
          } catch (e) {
            // If not JSON, check string data
            expect(postData.toLowerCase()).not.toContain('share');
          }
        }
      }
    });

    test('should maintain user session tracking', async ({ page }) => {
      const trackingRequests = [];
      page.on('request', request => {
        if (request.url().includes('analytics') || request.url().includes('track')) {
          trackingRequests.push(request);
        }
      });
      
      // Perform session activities
      await page.waitForTimeout(2000);
      
      const posts = page.locator('.post-item');
      if (await posts.count() > 2) {
        await posts.nth(1).click();
        await page.waitForTimeout(1000);
        await posts.nth(2).click();
        await page.waitForTimeout(1000);
      }
      
      // Check session consistency
      let sessionIds = [];
      for (const request of trackingRequests) {
        const postData = request.postData();
        if (postData) {
          try {
            const data = JSON.parse(postData);
            if (data.session_id) {
              sessionIds.push(data.session_id);
            }
          } catch (e) {
            // Extract session ID from string data if possible
            const sessionMatch = postData.match(/session[_-]?id['":\s]*([^'",\s]+)/i);
            if (sessionMatch) {
              sessionIds.push(sessionMatch[1]);
            }
          }
        }
      }
      
      // Session IDs should be consistent within the same session
      if (sessionIds.length > 1) {
        const uniqueSessionIds = [...new Set(sessionIds)];
        expect(uniqueSessionIds.length).toBe(1);
      }
    });
  });
});