import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  const baseURL = 'http://localhost:3000';
  
  test.describe('Share Endpoint Removal Validation', () => {
    test('should return 404 for share endpoints', async ({ request }) => {
      const shareEndpoints = [
        '/api/posts/share',
        '/api/posts/1/share',
        '/api/share',
        '/share',
        '/api/posts/123/share',
        '/api/social/share'
      ];

      for (const endpoint of shareEndpoints) {
        const response = await request.get(`${baseURL}${endpoint}`);
        expect([404, 405]).toContain(response.status());
      }
    });

    test('should reject POST requests to share endpoints', async ({ request }) => {
      const shareData = {
        postId: 1,
        platform: 'twitter',
        text: 'Check this out!',
        url: 'https://example.com/post/1'
      };

      const shareEndpoints = [
        '/api/posts/share',
        '/api/share',
        '/api/social/share'
      ];

      for (const endpoint of shareEndpoints) {
        const response = await request.post(`${baseURL}${endpoint}`, {
          data: shareData
        });
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test('should reject PUT/PATCH requests to share endpoints', async ({ request }) => {
      const shareEndpoints = ['/api/posts/1/share', '/api/share/123'];

      for (const endpoint of shareEndpoints) {
        const putResponse = await request.put(`${baseURL}${endpoint}`, {
          data: { shareCount: 10 }
        });
        expect(putResponse.status()).toBeGreaterThanOrEqual(400);

        const patchResponse = await request.patch(`${baseURL}${endpoint}`, {
          data: { shareCount: 15 }
        });
        expect(patchResponse.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test('should reject DELETE requests to share endpoints', async ({ request }) => {
      const shareEndpoints = [
        '/api/posts/1/share',
        '/api/share/123',
        '/api/social/share/456'
      ];

      for (const endpoint of shareEndpoints) {
        const response = await request.delete(`${baseURL}${endpoint}`);
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });
  });

  test.describe('Posts API Validation', () => {
    test('should return posts without share data', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/posts`);
      expect(response.status()).toBe(200);

      const posts = await response.json();
      expect(Array.isArray(posts)).toBeTruthy();

      // Verify no share-related fields in posts
      posts.forEach(post => {
        expect(post).not.toHaveProperty('shareCount');
        expect(post).not.toHaveProperty('shares');
        expect(post).not.toHaveProperty('shareUrl');
        expect(post).not.toHaveProperty('shareData');
        expect(post).not.toHaveProperty('socialShares');
      });
    });

    test('should return individual posts without share data', async ({ request }) => {
      // First get a list of posts to get valid IDs
      const postsResponse = await request.get(`${baseURL}/api/posts`);
      const posts = await postsResponse.json();

      if (posts.length > 0) {
        const postId = posts[0].id;
        const response = await request.get(`${baseURL}/api/posts/${postId}`);
        
        if (response.status() === 200) {
          const post = await response.json();
          
          // Verify no share-related fields
          expect(post).not.toHaveProperty('shareCount');
          expect(post).not.toHaveProperty('shares');
          expect(post).not.toHaveProperty('shareUrl');
          expect(post).not.toHaveProperty('shareData');
        }
      }
    });

    test('should handle like interactions without affecting share data', async ({ request }) => {
      const postsResponse = await request.get(`${baseURL}/api/posts`);
      const posts = await postsResponse.json();

      if (posts.length > 0) {
        const postId = posts[0].id;
        
        // Try to like the post
        const likeResponse = await request.post(`${baseURL}/api/posts/${postId}/like`);
        
        if (likeResponse.status() === 200 || likeResponse.status() === 201) {
          // Get updated post data
          const updatedPostResponse = await request.get(`${baseURL}/api/posts/${postId}`);
          
          if (updatedPostResponse.status() === 200) {
            const updatedPost = await updatedPostResponse.json();
            
            // Should have like data but no share data
            expect(updatedPost).not.toHaveProperty('shareCount');
            expect(updatedPost).not.toHaveProperty('shares');
            
            // May have like data
            if (updatedPost.likeCount !== undefined) {
              expect(typeof updatedPost.likeCount).toBe('number');
            }
          }
        }
      }
    });

    test('should handle comment interactions without share references', async ({ request }) => {
      const postsResponse = await request.get(`${baseURL}/api/posts`);
      const posts = await postsResponse.json();

      if (posts.length > 0) {
        const postId = posts[0].id;
        
        // Get comments for the post
        const commentsResponse = await request.get(`${baseURL}/api/posts/${postId}/comments`);
        
        if (commentsResponse.status() === 200) {
          const comments = await commentsResponse.json();
          
          // Verify comments don't contain share data
          if (Array.isArray(comments)) {
            comments.forEach(comment => {
              expect(comment).not.toHaveProperty('shareCount');
              expect(comment).not.toHaveProperty('shares');
              
              // Comment text should not reference share functionality
              if (comment.text) {
                expect(comment.text.toLowerCase()).not.toContain('share this post');
                expect(comment.text.toLowerCase()).not.toContain('shared via');
              }
            });
          }
        }
      }
    });
  });

  test.describe('Search API Validation', () => {
    test('should return search results without share data', async ({ request }) => {
      const searchResponse = await request.get(`${baseURL}/api/search?q=test`);
      
      if (searchResponse.status() === 200) {
        const results = await searchResponse.json();
        
        if (Array.isArray(results)) {
          results.forEach(result => {
            expect(result).not.toHaveProperty('shareCount');
            expect(result).not.toHaveProperty('shares');
            expect(result).not.toHaveProperty('shareUrl');
          });
        } else if (results.items) {
          // Search results might be wrapped in a response object
          results.items.forEach(item => {
            expect(item).not.toHaveProperty('shareCount');
            expect(item).not.toHaveProperty('shares');
          });
        }
      }
    });

    test('should handle search queries without share filters', async ({ request }) => {
      const searchQueries = [
        'technology',
        'news',
        'update',
        'interesting'
      ];

      for (const query of searchQueries) {
        const response = await request.get(`${baseURL}/api/search?q=${encodeURIComponent(query)}`);
        
        if (response.status() === 200) {
          const results = await response.json();
          
          // Results should not contain share-related metadata
          const responseText = JSON.stringify(results);
          expect(responseText.toLowerCase()).not.toContain('sharecount');
          expect(responseText.toLowerCase()).not.toContain('shareurl');
        }
      }
    });

    test('should reject search with share-related parameters', async ({ request }) => {
      const shareSearchParams = [
        'shareCount=high',
        'sortBy=shares',
        'filter=mostShared',
        'include=shareData'
      ];

      for (const param of shareSearchParams) {
        const response = await request.get(`${baseURL}/api/search?q=test&${param}`);
        
        // Should either ignore the parameter or return an error
        if (response.status() === 200) {
          const results = await response.json();
          const responseText = JSON.stringify(results);
          
          // Results should not be sorted or filtered by share data
          expect(responseText.toLowerCase()).not.toContain('share');
        } else {
          // Or return an error for unsupported parameters
          expect(response.status()).toBeGreaterThanOrEqual(400);
        }
      }
    });
  });

  test.describe('User API Validation', () => {
    test('should return user profiles without share statistics', async ({ request }) => {
      const usersResponse = await request.get(`${baseURL}/api/users`);
      
      if (usersResponse.status() === 200) {
        const users = await usersResponse.json();
        
        if (Array.isArray(users)) {
          users.forEach(user => {
            expect(user).not.toHaveProperty('shareCount');
            expect(user).not.toHaveProperty('totalShares');
            expect(user).not.toHaveProperty('sharesReceived');
            expect(user).not.toHaveProperty('shareScore');
          });
        }
      }
    });

    test('should handle user activity without share events', async ({ request }) => {
      const activityResponse = await request.get(`${baseURL}/api/users/activity`);
      
      if (activityResponse.status() === 200) {
        const activities = await activityResponse.json();
        
        if (Array.isArray(activities)) {
          activities.forEach(activity => {
            expect(activity.type).not.toBe('share');
            expect(activity.type).not.toBe('shared');
            expect(activity.action).not.toBe('share');
            
            if (activity.metadata) {
              expect(activity.metadata).not.toHaveProperty('shareTarget');
              expect(activity.metadata).not.toHaveProperty('sharePlatform');
            }
          });
        }
      }
    });
  });

  test.describe('Analytics API Validation', () => {
    test('should track engagement without share metrics', async ({ request }) => {
      const analyticsResponse = await request.get(`${baseURL}/api/analytics/engagement`);
      
      if (analyticsResponse.status() === 200) {
        const analytics = await analyticsResponse.json();
        
        // Should have engagement metrics but not share metrics
        expect(analytics).not.toHaveProperty('shareCount');
        expect(analytics).not.toHaveProperty('sharesPerDay');
        expect(analytics).not.toHaveProperty('topSharedPosts');
        
        // May have other engagement metrics
        const allowedMetrics = [
          'views', 'likes', 'comments', 'clickThrough', 
          'timeSpent', 'scrollDepth', 'bounceRate'
        ];
        
        Object.keys(analytics).forEach(key => {
          if (!allowedMetrics.includes(key)) {
            expect(key.toLowerCase()).not.toContain('share');
          }
        });
      }
    });

    test('should return dashboard metrics without share data', async ({ request }) => {
      const dashboardResponse = await request.get(`${baseURL}/api/analytics/dashboard`);
      
      if (dashboardResponse.status() === 200) {
        const dashboard = await dashboardResponse.json();
        
        // Dashboard should not include share metrics
        const responseText = JSON.stringify(dashboard);
        expect(responseText.toLowerCase()).not.toContain('share');
        
        // But may include other metrics
        if (dashboard.metrics) {
          expect(dashboard.metrics).not.toHaveProperty('shares');
          expect(dashboard.metrics).not.toHaveProperty('shareRate');
        }
      }
    });
  });

  test.describe('Error Handling Validation', () => {
    test('should handle 404 errors appropriately', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/nonexistent`);
      expect(response.status()).toBe(404);

      const errorResponse = await response.json();
      
      // Error messages should not reference share functionality
      if (errorResponse.message) {
        expect(errorResponse.message.toLowerCase()).not.toContain('share');
      }
    });

    test('should handle malformed requests without exposing share endpoints', async ({ request }) => {
      const malformedRequests = [
        { endpoint: '/api/posts/abc/like', expectedStatus: 400 },
        { endpoint: '/api/posts/999999', expectedStatus: 404 },
        { endpoint: '/api/search', expectedStatus: 400 }
      ];

      for (const { endpoint, expectedStatus } of malformedRequests) {
        const response = await request.get(`${baseURL}${endpoint}`);
        expect(response.status()).toBeGreaterThanOrEqual(400);

        const errorResponse = await response.json().catch(() => ({}));
        
        // Error response should not suggest share endpoints
        if (errorResponse.message || errorResponse.error) {
          const errorText = JSON.stringify(errorResponse).toLowerCase();
          expect(errorText).not.toContain('/share');
          expect(errorText).not.toContain('share endpoint');
        }
      }
    });

    test('should handle rate limiting without share endpoint suggestions', async ({ request }) => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array(20).fill(null).map(() => 
        request.get(`${baseURL}/api/posts`)
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status() === 429);

      if (rateLimitedResponse) {
        const errorResponse = await rateLimitedResponse.json().catch(() => ({}));
        
        // Rate limit message should not suggest share endpoints
        if (errorResponse.message) {
          expect(errorResponse.message.toLowerCase()).not.toContain('share');
        }
      }
    });
  });

  test.describe('Content Security and Validation', () => {
    test('should sanitize user input without breaking share removal', async ({ request }) => {
      const maliciousInputs = [
        '<script>alert("share")</script>',
        'javascript:void(share())',
        '${shareFunction}',
        'share" OR 1=1--'
      ];

      for (const input of maliciousInputs) {
        const searchResponse = await request.get(
          `${baseURL}/api/search?q=${encodeURIComponent(input)}`
        );

        if (searchResponse.status() === 200) {
          const results = await searchResponse.json();
          const responseText = JSON.stringify(results);
          
          // Should not contain unsanitized malicious input
          expect(responseText).not.toContain('<script>');
          expect(responseText).not.toContain('javascript:');
          
          // And should not expose share functionality
          expect(responseText.toLowerCase()).not.toContain('sharefunction');
        }
      }
    });

    test('should validate JSON payloads without share fields', async ({ request }) => {
      const invalidPayloads = [
        { shareCount: 100, content: 'test' },
        { content: 'test', shares: ['twitter', 'facebook'] },
        { content: 'test', shareUrl: 'https://evil.com' }
      ];

      for (const payload of invalidPayloads) {
        const response = await request.post(`${baseURL}/api/posts`, {
          data: payload
        });

        if (response.status() === 200 || response.status() === 201) {
          // If accepted, should strip share-related fields
          const createdPost = await response.json();
          expect(createdPost).not.toHaveProperty('shareCount');
          expect(createdPost).not.toHaveProperty('shares');
          expect(createdPost).not.toHaveProperty('shareUrl');
        } else {
          // Or reject the payload entirely
          expect(response.status()).toBeGreaterThanOrEqual(400);
        }
      }
    });
  });

  test.describe('API Response Consistency', () => {
    test('should maintain consistent response format without share fields', async ({ request }) => {
      const endpoints = [
        '/api/posts',
        '/api/posts/1',
        '/api/search?q=test',
        '/api/users'
      ];

      const responses = [];
      for (const endpoint of endpoints) {
        try {
          const response = await request.get(`${baseURL}${endpoint}`);
          if (response.status() === 200) {
            const data = await response.json();
            responses.push({ endpoint, data });
          }
        } catch (error) {
          // Continue with other endpoints
        }
      }

      // All responses should have consistent structure without share fields
      responses.forEach(({ endpoint, data }) => {
        const responseText = JSON.stringify(data);
        expect(responseText.toLowerCase()).not.toContain('sharecount');
        expect(responseText.toLowerCase()).not.toContain('shareurl');
        expect(responseText.toLowerCase()).not.toContain('sharedata');
        
        // Should maintain other expected fields
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          
          // Basic structure should remain intact
          if (endpoint.includes('/posts')) {
            expect(item).toHaveProperty('id');
            // Content or title expected for posts
            expect(item.content || item.title || item.text).toBeTruthy();
          }
        }
      });
    });
  });
});