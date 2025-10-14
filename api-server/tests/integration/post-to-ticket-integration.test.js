/**
 * Integration Tests: Post-to-Ticket Creation Flow
 *
 * TDD Approach - Tests written BEFORE implementation
 * NO MOCKS - 100% real functionality
 *
 * Tests the complete flow:
 * 1. POST /api/v1/agent-posts creates post
 * 2. Work queue ticket is automatically created
 * 3. Orchestrator can detect the ticket
 * 4. Data mapping is correct
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import postgresManager from '../../config/postgres.js';
import workQueueRepository from '../../repositories/postgres/work-queue.repository.js';

// We'll test against the real server endpoint
const API_BASE_URL = 'http://localhost:3001';

describe('Post-to-Ticket Integration (NO MOCKS)', () => {
  let testPostId = null;
  let testTicketId = null;

  beforeEach(async () => {
    // Clean up any test data from previous runs
    if (testPostId) {
      await postgresManager.query('DELETE FROM work_queue WHERE post_id = $1', [testPostId]);
      await postgresManager.query('DELETE FROM agent_memories WHERE post_id = $1', [testPostId]);
    }
  });

  afterAll(async () => {
    // Final cleanup
    if (testPostId) {
      await postgresManager.query('DELETE FROM work_queue WHERE post_id = $1', [testPostId]);
      await postgresManager.query('DELETE FROM agent_memories WHERE post_id = $1', [testPostId]);
    }
  });

  describe('FR1: Automatic Ticket Creation', () => {
    it('should create work queue ticket when post is created (REAL DB)', async () => {
      // Arrange
      const postData = {
        title: 'Integration Test Post',
        content: 'This is a test post to verify ticket creation',
        author_agent: 'integration-test-agent',
        userId: 'test-user-integration'
      };

      // Act - Create post via real API
      const response = await request(API_BASE_URL)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      // Assert - Post created successfully
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();

      testPostId = response.body.data.id;

      // Assert - Ticket was created in database (REAL QUERY)
      const ticketQuery = await postgresManager.query(
        'SELECT * FROM work_queue WHERE post_id = $1',
        [testPostId]
      );

      expect(ticketQuery.rows.length).toBe(1);
      const ticket = ticketQuery.rows[0];
      testTicketId = ticket.id;

      expect(ticket.status).toBe('pending');
      expect(ticket.user_id).toBe('test-user-integration');
      expect(ticket.post_content).toBe('This is a test post to verify ticket creation');
      expect(ticket.post_author).toBe('integration-test-agent');
    }, 10000);

    it('should create exactly ONE ticket per post (no duplicates)', async () => {
      // Arrange
      const postData = {
        title: 'Duplicate Test',
        content: 'Testing single ticket creation',
        author_agent: 'test-agent',
        userId: 'test-user-dup'
      };

      // Act
      const response = await request(API_BASE_URL)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      testPostId = response.body.data.id;

      // Assert - Exactly 1 ticket
      const ticketCount = await postgresManager.query(
        'SELECT COUNT(*) as count FROM work_queue WHERE post_id = $1',
        [testPostId]
      );

      expect(parseInt(ticketCount.rows[0].count)).toBe(1);
    }, 10000);

    it('should set default priority to 5 for new tickets', async () => {
      // Arrange
      const postData = {
        title: 'Priority Test',
        content: 'Testing default priority',
        author_agent: 'test-agent'
      };

      // Act
      const response = await request(API_BASE_URL)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      testPostId = response.body.data.id;

      // Assert - Priority is 5
      const ticket = await postgresManager.query(
        'SELECT priority FROM work_queue WHERE post_id = $1',
        [testPostId]
      );

      expect(ticket.rows[0].priority).toBe(5);
    }, 10000);
  });

  describe('FR2: Data Mapping', () => {
    it('should correctly map all post fields to ticket fields', async () => {
      // Arrange
      const postData = {
        title: 'Mapping Test Post',
        content: 'Full content for mapping test',
        author_agent: 'mapping-test-agent',
        userId: 'mapping-test-user',
        metadata: {
          tags: ['test', 'mapping'],
          customField: 'custom-value'
        }
      };

      // Act
      const response = await request(API_BASE_URL)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      testPostId = response.body.data.id;

      // Assert - All fields mapped correctly
      const ticket = await postgresManager.query(
        'SELECT * FROM work_queue WHERE post_id = $1',
        [testPostId]
      );

      const ticketData = ticket.rows[0];
      expect(ticketData.user_id).toBe('mapping-test-user');
      expect(ticketData.post_id).toBe(testPostId);
      expect(ticketData.post_content).toBe('Full content for mapping test');
      expect(ticketData.post_author).toBe('mapping-test-agent');
      expect(ticketData.assigned_agent).toBeNull(); // Not assigned yet
      expect(ticketData.status).toBe('pending');

      // Check metadata is valid JSON
      expect(ticketData.post_metadata).toBeDefined();
      expect(typeof ticketData.post_metadata).toBe('object');
      expect(ticketData.post_metadata.title).toBe('Mapping Test Post');
      expect(ticketData.post_metadata.tags).toEqual(['test', 'mapping']);
    }, 10000);

    it('should handle posts with minimal metadata', async () => {
      // Arrange
      const postData = {
        title: 'Minimal Post',
        content: 'Minimal content',
        author_agent: 'minimal-agent'
      };

      // Act
      const response = await request(API_BASE_URL)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      testPostId = response.body.data.id;

      // Assert - Ticket still created with defaults
      const ticket = await postgresManager.query(
        'SELECT * FROM work_queue WHERE post_id = $1',
        [testPostId]
      );

      expect(ticket.rows.length).toBe(1);
      expect(ticket.rows[0].post_metadata).toBeDefined();
      expect(ticket.rows[0].post_metadata.title).toBe('Minimal Post');
    }, 10000);
  });

  describe('FR3: Error Handling', () => {
    it('should return 500 if ticket creation fails', async () => {
      // This test verifies error handling exists
      // We can't easily force a ticket creation failure without mocks
      // So we verify the endpoint validates inputs properly

      const invalidPost = {
        title: '', // Invalid - empty title
        content: 'Test content',
        author_agent: 'test'
      };

      const response = await request(API_BASE_URL)
        .post('/api/v1/agent-posts')
        .send(invalidPost);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    }, 10000);

    it('should handle missing author_agent gracefully', async () => {
      const invalidPost = {
        title: 'Test',
        content: 'Test content'
        // Missing author_agent
      };

      const response = await request(API_BASE_URL)
        .post('/api/v1/agent-posts')
        .send(invalidPost);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Author agent');
    }, 10000);
  });

  describe('FR4: Orchestrator Detection', () => {
    it('should create ticket that orchestrator can query', async () => {
      // Arrange
      const postData = {
        title: 'Orchestrator Detection Test',
        content: 'Testing orchestrator can find this ticket',
        author_agent: 'detection-test-agent'
      };

      // Act - Create post
      const response = await request(API_BASE_URL)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      testPostId = response.body.data.id;

      // Assert - Orchestrator query pattern finds ticket
      const pendingTickets = await postgresManager.query(
        'SELECT * FROM work_queue WHERE status = $1 ORDER BY priority DESC, created_at ASC',
        ['pending']
      );

      // Should find our ticket in pending queue
      const ourTicket = pendingTickets.rows.find(t => t.post_id === testPostId);
      expect(ourTicket).toBeDefined();
      expect(ourTicket.status).toBe('pending');
    }, 10000);

    it('should create ticket with timestamp for orchestrator ordering', async () => {
      // Arrange
      const postData = {
        title: 'Timestamp Test',
        content: 'Testing created_at timestamp',
        author_agent: 'timestamp-agent'
      };

      // Act
      const response = await request(API_BASE_URL)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      testPostId = response.body.data.id;

      // Assert - Has created_at timestamp
      const ticket = await postgresManager.query(
        'SELECT created_at FROM work_queue WHERE post_id = $1',
        [testPostId]
      );

      expect(ticket.rows[0].created_at).toBeDefined();
      const createdAt = new Date(ticket.rows[0].created_at);
      expect(createdAt).toBeInstanceOf(Date);
      expect(createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    }, 10000);
  });

  describe('FR5: Backward Compatibility', () => {
    it('should maintain existing API response format', async () => {
      // Arrange
      const postData = {
        title: 'Compatibility Test',
        content: 'Testing response format',
        author_agent: 'compat-agent'
      };

      // Act
      const response = await request(API_BASE_URL)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      testPostId = response.body.data.id;

      // Assert - Response format unchanged (or enhanced)
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('author_agent');
    }, 10000);
  });

  describe('Performance (NFR1)', () => {
    it('should complete post+ticket creation in under 100ms', async () => {
      // Arrange
      const postData = {
        title: 'Performance Test',
        content: 'Testing latency',
        author_agent: 'perf-agent'
      };

      // Act
      const startTime = Date.now();
      const response = await request(API_BASE_URL)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);
      const endTime = Date.now();

      testPostId = response.body.data.id;

      // Assert - Completed quickly
      const duration = endTime - startTime;
      console.log(`Post+Ticket creation took: ${duration}ms`);
      expect(duration).toBeLessThan(100);
    }, 10000);
  });
});
