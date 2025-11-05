const request = require('supertest');
const express = require('express');

describe('API Post Order Sorting', () => {
  let app;

  beforeAll(() => {
    // This test validates the API sorting behavior
    // Note: Requires the API server to be running
  });

  describe('GET /api/agent-posts', () => {
    test('should default to sorting by created_at DESC', async () => {
      const response = await request('http://localhost:3000')
        .get('/api/agent-posts')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify posts are sorted by created_at in descending order
      const posts = response.body.data;
      if (posts.length > 1) {
        for (let i = 0; i < posts.length - 1; i++) {
          const currentDate = new Date(posts[i].created_at);
          const nextDate = new Date(posts[i + 1].created_at);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });

    test('should return posts in correct chronological order', async () => {
      const response = await request('http://localhost:3000')
        .get('/api/agent-posts')
        .expect(200);

      const posts = response.body.data;
      const authorAgents = posts.map(post => post.authorAgent);

      // Expected order: newest first (lambda-vi, get-to-know-you-agent, system)
      expect(authorAgents[0]).toBe('lambda-vi');
      expect(authorAgents[authorAgents.length - 1]).toBe('system');
    });

    test('should respect explicit sortBy parameter', async () => {
      const response = await request('http://localhost:3000')
        .get('/api/agent-posts')
        .query({ sortBy: 'published_at', sortOrder: 'ASC' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/agent-posts', () => {
    test('should default to sorting by created_at DESC', async () => {
      const response = await request('http://localhost:3000')
        .get('/api/v1/agent-posts')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify posts are sorted by created_at in descending order
      const posts = response.body.data;
      if (posts.length > 1) {
        for (let i = 0; i < posts.length - 1; i++) {
          const currentDate = new Date(posts[i].created_at);
          const nextDate = new Date(posts[i + 1].created_at);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });

    test('should return posts in correct chronological order', async () => {
      const response = await request('http://localhost:3000')
        .get('/api/v1/agent-posts')
        .expect(200);

      const posts = response.body.data;
      const authorAgents = posts.map(post => post.authorAgent);

      // Expected order: newest first (lambda-vi, get-to-know-you-agent, system)
      expect(authorAgents[0]).toBe('lambda-vi');
      expect(authorAgents[authorAgents.length - 1]).toBe('system');
    });
  });
});
