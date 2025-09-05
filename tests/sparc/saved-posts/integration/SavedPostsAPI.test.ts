/**
 * SPARC Integration Tests: Saved Posts API Endpoints
 * Real HTTP calls to actual backend server
 * NO MOCKS - Live server integration testing
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';

describe('SPARC Integration Tests: Saved Posts API Endpoints', () => {
  const BASE_URL = 'http://localhost:3000';
  let testPostId: string;
  let testUserId: string = 'integration-test-user';
  
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create a test post for saved posts testing
    const testPost = {
      title: 'Integration Test Post for Saved Functionality',
      content: 'This post is created specifically for testing saved posts functionality through real API calls. It includes comprehensive content with #testing #integration #saved hashtags.',
      authorAgent: 'IntegrationTestAgent',
      metadata: {
        businessImpact: 75,
        isAgentResponse: true,
        testPost: true
      },
      tags: ['integration', 'testing', 'saved']
    };

    try {
      const response = await fetch(`${BASE_URL}/api/v1/agent-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPost)
      });

      if (response.ok) {
        const result = await response.json();
        testPostId = result.data.id;
        console.log(`✅ Created test post: ${testPostId}`);
      } else {
        // Use existing test post if creation fails
        testPostId = 'prod-post-1'; // Use existing post from seed data
        console.log(`⚠️ Using existing test post: ${testPostId}`);
      }
    } catch (error) {
      // Fallback to existing post
      testPostId = 'prod-post-1';
      console.log(`⚠️ Fallback to existing test post: ${testPostId}`);
    }
  });

  afterAll(async () => {
    // Clean up: Unsave the test post if it was saved
    try {
      await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save?user_id=${testUserId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.log('Cleanup: Could not unsave test post');
    }

    // Only delete if we created it (not a seed post)
    if (!testPostId.startsWith('prod-post-')) {
      try {
        await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.log('Cleanup: Could not delete test post');
      }
    }
  });

  test('SPARC: POST /api/v1/agent-posts/:id/save creates saved post', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: testUserId })
    });

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.post_id).toBe(testPostId);
    expect(result.data.user_id).toBe(testUserId);
    expect(result.message).toBe('Post saved successfully');
  });

  test('SPARC: POST /api/v1/agent-posts/:id/save handles duplicate saves', async () => {
    // Save the post first time
    await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: testUserId })
    });

    // Save the post second time
    const response = await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: testUserId })
    });

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.post_id).toBe(testPostId);
    expect(result.data.user_id).toBe(testUserId);
  });

  test('SPARC: DELETE /api/v1/agent-posts/:id/save removes saved post', async () => {
    // First ensure the post is saved
    await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: testUserId })
    });

    // Then unsave it
    const response = await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save?user_id=${testUserId}`, {
      method: 'DELETE'
    });

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.message).toBe('Post unsaved successfully');
  });

  test('SPARC: DELETE /api/v1/agent-posts/:id/save handles non-existent save', async () => {
    // Ensure post is not saved first
    await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save?user_id=${testUserId}`, {
      method: 'DELETE'
    });

    // Try to unsave again
    const response = await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save?user_id=${testUserId}`, {
      method: 'DELETE'
    });

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.message).toBe('Post was not saved');
  });

  test('SPARC: GET /api/v1/agent-posts?filter=saved returns saved posts', async () => {
    // Save the test post
    await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: testUserId })
    });

    // Get saved posts
    const response = await fetch(`${BASE_URL}/api/v1/agent-posts?filter=saved&user_id=${testUserId}`);
    
    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.total).toBeGreaterThan(0);
    expect(result.filter).toBe('saved');

    // Verify our test post is in the saved posts
    const savedPost = result.data.find((post: any) => post.id === testPostId);
    expect(savedPost).toBeDefined();
    expect(savedPost.engagement.isSaved).toBe(true);
  });

  test('SPARC: Save/unsave workflow affects filter results', async () => {
    // Get initial saved posts count
    const initialResponse = await fetch(`${BASE_URL}/api/v1/agent-posts?filter=saved&user_id=${testUserId}`);
    const initialResult = await initialResponse.json();
    const initialCount = initialResult.total;

    // Save the test post
    await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: testUserId })
    });

    // Check saved posts count increased
    const afterSaveResponse = await fetch(`${BASE_URL}/api/v1/agent-posts?filter=saved&user_id=${testUserId}`);
    const afterSaveResult = await afterSaveResponse.json();
    expect(afterSaveResult.total).toBe(initialCount + 1);

    // Unsave the post
    await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save?user_id=${testUserId}`, {
      method: 'DELETE'
    });

    // Check saved posts count decreased
    const afterUnsaveResponse = await fetch(`${BASE_URL}/api/v1/agent-posts?filter=saved&user_id=${testUserId}`);
    const afterUnsaveResult = await afterUnsaveResponse.json();
    expect(afterUnsaveResult.total).toBe(initialCount);
  });

  test('SPARC: POST engagement includes isSaved property', async () => {
    // Save the test post
    await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: testUserId })
    });

    // Get all posts and verify isSaved is included
    const response = await fetch(`${BASE_URL}/api/v1/agent-posts?user_id=${testUserId}`);
    const result = await response.json();

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);

    // Find our test post
    const testPost = result.data.find((post: any) => post.id === testPostId);
    expect(testPost).toBeDefined();
    expect(testPost.engagement).toBeDefined();
    expect(testPost.engagement.isSaved).toBe(true);
  });

  test('SPARC: Error handling for invalid post ID', async () => {
    const invalidPostId = 'non-existent-post-12345';
    
    const response = await fetch(`${BASE_URL}/api/v1/agent-posts/${invalidPostId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: testUserId })
    });

    // Should handle gracefully (most DB implementations will still create the record)
    // The important part is that it doesn't crash the server
    expect(response.status).toBeLessThan(500);
  });

  test('SPARC: Concurrent save/unsave operations handle correctly', async () => {
    // Perform concurrent save operations
    const savePromises = Array.from({ length: 5 }, () =>
      fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: `${testUserId}-concurrent` })
      })
    );

    const saveResults = await Promise.all(savePromises);
    
    // All should succeed
    for (const result of saveResults) {
      expect(result.ok).toBe(true);
    }

    // Verify only one save record exists
    const savedPostsResponse = await fetch(`${BASE_URL}/api/v1/agent-posts?filter=saved&user_id=${testUserId}-concurrent`);
    const savedPostsResult = await savedPostsResponse.json();
    
    // Should have exactly one saved post (no duplicates)
    const savedCount = savedPostsResult.data.filter((post: any) => post.id === testPostId).length;
    expect(savedCount).toBe(1);

    // Clean up
    await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save?user_id=${testUserId}-concurrent`, {
      method: 'DELETE'
    });
  });

  test('SPARC: Full save/unsave/filter workflow integration', async () => {
    const workflowUserId = `${testUserId}-workflow`;

    // Step 1: Verify post is not saved initially
    let savedPostsResponse = await fetch(`${BASE_URL}/api/v1/agent-posts?filter=saved&user_id=${workflowUserId}`);
    let savedPostsResult = await savedPostsResponse.json();
    let isPostSaved = savedPostsResult.data.some((post: any) => post.id === testPostId);
    expect(isPostSaved).toBe(false);

    // Step 2: Save the post
    const saveResponse = await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: workflowUserId })
    });
    expect(saveResponse.ok).toBe(true);

    // Step 3: Verify post appears in saved posts filter
    savedPostsResponse = await fetch(`${BASE_URL}/api/v1/agent-posts?filter=saved&user_id=${workflowUserId}`);
    savedPostsResult = await savedPostsResponse.json();
    isPostSaved = savedPostsResult.data.some((post: any) => post.id === testPostId);
    expect(isPostSaved).toBe(true);

    // Step 4: Verify isSaved property in general posts list
    const allPostsResponse = await fetch(`${BASE_URL}/api/v1/agent-posts?user_id=${workflowUserId}`);
    const allPostsResult = await allPostsResponse.json();
    const testPostInAll = allPostsResult.data.find((post: any) => post.id === testPostId);
    expect(testPostInAll.engagement.isSaved).toBe(true);

    // Step 5: Unsave the post
    const unsaveResponse = await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save?user_id=${workflowUserId}`, {
      method: 'DELETE'
    });
    expect(unsaveResponse.ok).toBe(true);

    // Step 6: Verify post no longer appears in saved posts filter
    savedPostsResponse = await fetch(`${BASE_URL}/api/v1/agent-posts?filter=saved&user_id=${workflowUserId}`);
    savedPostsResult = await savedPostsResponse.json();
    isPostSaved = savedPostsResult.data.some((post: any) => post.id === testPostId);
    expect(isPostSaved).toBe(false);

    // Step 7: Verify isSaved property is false in general posts list
    const finalAllPostsResponse = await fetch(`${BASE_URL}/api/v1/agent-posts?user_id=${workflowUserId}`);
    const finalAllPostsResult = await finalAllPostsResponse.json();
    const finalTestPost = finalAllPostsResult.data.find((post: any) => post.id === testPostId);
    expect(finalTestPost.engagement.isSaved).toBe(false);

    console.log('✅ Complete save/unsave/filter workflow validated successfully');
  });
});