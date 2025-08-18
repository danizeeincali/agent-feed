/**
 * System Error Recovery Tests
 * Tests error handling, recovery mechanisms, and system resilience
 */

const request = require('supertest');
const { app } = require('../../src/api/server');
const { db } = require('../../src/database/connection');
const { claudeFlowService } = require('../../src/services/claude-flow');
const io = require('socket.io-client');

// Mock external services for error testing
jest.mock('../../src/mcp/claude-flow-client');
const mockClaudeFlow = require('../../src/mcp/claude-flow-client');

describe('System Error Recovery Tests', () => {
  let testUser;
  let authToken;
  let testFeed;
  let testSession;

  beforeAll(async () => {
    // Setup test database
    await db.migrate();
    
    // Create test user
    const userResult = await db.query(`
      INSERT INTO users (email, name, password_hash) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, ['errortest@example.com', 'Error Test User', 'hashedpassword']);
    
    testUser = userResult.rows[0];
    
    // Generate auth token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test feed
    const feedResult = await db.query(`
      INSERT INTO feeds (user_id, name, url, feed_type) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, [testUser.id, 'Error Test Feed', 'https://example.com/error-feed.rss', 'rss']);
    
    testFeed = feedResult.rows[0];

    // Create test session
    const sessionResult = await db.query(`
      INSERT INTO claude_flow_sessions (user_id, swarm_id, configuration) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [testUser.id, 'error-test-swarm', JSON.stringify({ topology: 'mesh' })]);
    
    testSession = sessionResult.rows[0];
  });

  afterAll(async () => {
    // Cleanup test data
    await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    await db.close();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Database Error Recovery', () => {
    test('Should handle database connection timeouts', async () => {
      // Mock database timeout
      const originalQuery = db.query;
      db.query = jest.fn().mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 1000);
        })
      );

      const response = await request(app)
        .get('/api/v1/feeds')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('database');
      
      // Restore original function
      db.query = originalQuery;
    });

    test('Should handle database constraint violations gracefully', async () => {
      // Try to create duplicate user
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'errortest@example.com', // Duplicate email
          name: 'Duplicate User',
          password: 'password123'
        });
      
      expect(response.status).toBe(409); // Conflict
      expect(response.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    test('Should handle malformed database queries', async () => {
      // This would be caught by query validation
      const response = await request(app)
        .get('/api/v1/feeds')
        .query({ invalid_param: "'; DROP TABLE users; --" })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
    });

    test('Should recover from database connection pool exhaustion', async () => {
      // Simulate pool exhaustion by making many concurrent requests
      const promises = [];
      for (let i = 0; i < 30; i++) {
        promises.push(
          request(app)
            .get('/health')
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Most should succeed, some might be queued
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(20);
      
      // System should still be responsive
      const healthResponse = await request(app).get('/health');
      expect(healthResponse.status).toBe(200);
    });

    test('Should handle database transaction rollbacks', async () => {
      const client = await db.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Valid operation
        const feedResult = await client.query(`
          INSERT INTO feeds (user_id, name, url, feed_type) 
          VALUES ($1, $2, $3, $4) 
          RETURNING id
        `, [testUser.id, 'Transaction Test Feed', 'https://example.com/tx-test.rss', 'rss']);
        
        // Force error to trigger rollback
        await client.query(`
          INSERT INTO feeds (user_id, name, url, feed_type) 
          VALUES ($1, $2, $3, $4)
        `, [testUser.id, 'Duplicate URL', 'https://example.com/tx-test.rss', 'rss']); // Duplicate URL
        
        await client.query('COMMIT');
        
        fail('Should have thrown error');
        
      } catch (error) {
        await client.query('ROLLBACK');
        
        // Verify no feeds were created
        const checkResult = await db.query(
          'SELECT * FROM feeds WHERE name = $1 AND user_id = $2',
          ['Transaction Test Feed', testUser.id]
        );
        
        expect(checkResult.rows.length).toBe(0);
      } finally {
        client.release();
      }
    });
  });

  describe('API Error Handling', () => {
    test('Should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/v1/feeds')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{invalid json}');
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    test('Should handle oversized request payloads', async () => {
      const largePayload = {
        name: 'Test Feed',
        url: 'https://example.com/feed.rss',
        feed_type: 'rss',
        content: 'x'.repeat(20 * 1024 * 1024) // 20MB content
      };
      
      const response = await request(app)
        .post('/api/v1/feeds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largePayload);
      
      expect(response.status).toBe(413); // Payload too large
    });

    test('Should handle invalid authentication tokens', async () => {
      const response = await request(app)
        .get('/api/v1/feeds')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    test('Should handle expired authentication tokens', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );
      
      const response = await request(app)
        .get('/api/v1/feeds')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    test('Should handle rate limiting gracefully', async () => {
      // Make requests rapidly to trigger rate limiting
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(app)
            .get('/health')
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      rateLimitedResponses.forEach(response => {
        expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      });
    });

    test('Should handle validation errors with detailed messages', async () => {
      const response = await request(app)
        .post('/api/v1/feeds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Empty name
          url: 'invalid-url', // Invalid URL
          feed_type: 'invalid', // Invalid type
          fetch_interval: -5 // Invalid interval
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error.validation_errors).toBeInstanceOf(Array);
      expect(response.body.error.validation_errors.length).toBeGreaterThan(0);
    });
  });

  describe('Claude Flow Error Recovery', () => {
    test('Should handle Claude Flow service unavailability', async () => {
      mockClaudeFlow.swarmInit.mockRejectedValue(new Error('Service unavailable'));
      
      const response = await request(app)
        .post('/api/v1/claude-flow/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topology: 'mesh',
          max_agents: 3
        });
      
      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('CLAUDE_FLOW_UNAVAILABLE');
    });

    test('Should handle Claude Flow timeout errors', async () => {
      mockClaudeFlow.taskOrchestrate.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(resolve, 10000); // 10 second timeout
        })
      );
      
      const response = await request(app)
        .post(`/api/v1/claude-flow/sessions/${testSession.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'Test task',
          timeout: 1000 // 1 second timeout
        });
      
      expect(response.status).toBe(408); // Request timeout
      expect(response.body.error.code).toBe('OPERATION_TIMEOUT');
    });

    test('Should handle malformed Claude Flow responses', async () => {
      mockClaudeFlow.agentSpawn.mockResolvedValue({
        // Missing required fields
        invalid_response: true
      });
      
      const response = await request(app)
        .post(`/api/v1/claude-flow/sessions/${testSession.id}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'researcher'
        });
      
      expect(response.status).toBe(502); // Bad gateway
      expect(response.body.error.code).toBe('INVALID_CLAUDE_FLOW_RESPONSE');
    });

    test('Should retry failed Claude Flow operations', async () => {
      let callCount = 0;
      mockClaudeFlow.agentSpawn.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return {
          agent_id: 'retry-agent-123',
          type: 'researcher',
          status: 'active'
        };
      });
      
      const response = await request(app)
        .post(`/api/v1/claude-flow/sessions/${testSession.id}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'researcher',
          max_retries: 3
        });
      
      expect(response.status).toBe(201);
      expect(response.body.agent_id).toBe('retry-agent-123');
      expect(callCount).toBe(3);
    });

    test('Should handle partial Claude Flow failures', async () => {
      // Mock partial success scenario
      mockClaudeFlow.taskOrchestrate.mockResolvedValue({
        task_id: 'partial-task-123',
        status: 'partial_failure',
        completed_agents: ['agent-1'],
        failed_agents: ['agent-2'],
        error_details: {
          'agent-2': 'Agent failed to initialize'
        }
      });
      
      const response = await request(app)
        .post(`/api/v1/claude-flow/sessions/${testSession.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'Partial failure test',
          strategy: 'adaptive'
        });
      
      expect(response.status).toBe(207); // Multi-status
      expect(response.body.status).toBe('partial_failure');
      expect(response.body.completed_agents).toHaveLength(1);
      expect(response.body.failed_agents).toHaveLength(1);
    });
  });

  describe('WebSocket Error Recovery', () => {
    test('Should handle WebSocket authentication failures', async (done) => {
      const client = io('http://localhost:3004', {
        auth: {
          token: 'invalid-token'
        },
        forceNew: true
      });
      
      client.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication');
        client.disconnect();
        done();
      });
      
      client.on('connect', () => {
        client.disconnect();
        done(new Error('Should not have connected with invalid token'));
      });
    });

    test('Should handle WebSocket connection drops', async () => {
      const client = io('http://localhost:3004', {
        auth: {
          token: authToken,
          userId: testUser.id
        },
        forceNew: true
      });
      
      await new Promise((resolve, reject) => {
        client.on('connect', resolve);
        client.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      // Simulate connection drop
      client.disconnect();
      
      // Should reconnect automatically
      const reconnectPromise = new Promise((resolve, reject) => {
        client.on('connect', resolve);
        client.on('connect_error', reject);
        setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
      });
      
      client.connect();
      await reconnectPromise;
      
      expect(client.connected).toBe(true);
      client.disconnect();
    });

    test('Should handle malformed WebSocket messages', async () => {
      const client = io('http://localhost:3004', {
        auth: {
          token: authToken,
          userId: testUser.id
        },
        forceNew: true
      });
      
      await new Promise((resolve, reject) => {
        client.on('connect', resolve);
        client.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      // Send malformed messages
      client.emit('subscribe:feed', null);
      client.emit('subscribe:feed', { invalid: 'data' });
      client.emit('invalid:event', 'test');
      
      // Should still be connected
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(client.connected).toBe(true);
      
      client.disconnect();
    });

    test('Should handle WebSocket event handler errors', async () => {
      const client = io('http://localhost:3004', {
        auth: {
          token: authToken,
          userId: testUser.id
        },
        forceNew: true
      });
      
      await new Promise((resolve, reject) => {
        client.on('connect', resolve);
        client.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      // Add error handler that throws
      client.on('test:error', () => {
        throw new Error('Handler error');
      });
      
      const errorPromise = new Promise(resolve => {
        client.on('error', resolve);
      });
      
      // Trigger error handler
      const { io: serverIO } = require('../../src/api/server');
      serverIO.to(`user:${testUser.id}`).emit('test:error', { data: 'test' });
      
      const error = await errorPromise;
      expect(error.message).toBe('Handler error');
      
      // Client should still be connected
      expect(client.connected).toBe(true);
      client.disconnect();
    });
  });

  describe('Memory Management and Resource Cleanup', () => {
    test('Should handle memory pressure gracefully', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create memory pressure
      const largeArrays = [];
      for (let i = 0; i < 100; i++) {
        largeArrays.push(new Array(100000).fill(Math.random()));
      }
      
      // System should still respond
      const response = await request(app)
        .get('/health');
      
      expect(response.status).toBe(200);
      
      // Cleanup
      largeArrays.length = 0;
      if (global.gc) {
        global.gc();
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalMemory = process.memoryUsage();
      console.log(`Memory test - Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB, Final: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
    });

    test('Should cleanup resources on process termination', async () => {
      // This is difficult to test directly, but we can verify cleanup functions exist
      const processListeners = process.listeners('SIGTERM');
      expect(processListeners.length).toBeGreaterThan(0);
      
      const uncaughtListeners = process.listeners('uncaughtException');
      expect(uncaughtListeners.length).toBeGreaterThan(0);
      
      const rejectionListeners = process.listeners('unhandledRejection');
      expect(rejectionListeners.length).toBeGreaterThan(0);
    });

    test('Should handle resource leaks', async () => {
      // Create multiple sessions without proper cleanup
      const sessions = [];
      
      for (let i = 0; i < 10; i++) {
        const sessionResult = await db.query(`
          INSERT INTO claude_flow_sessions (user_id, swarm_id, configuration) 
          VALUES ($1, $2, $3) 
          RETURNING *
        `, [testUser.id, `leak-test-${i}`, JSON.stringify({ topology: 'mesh' })]);
        
        sessions.push(sessionResult.rows[0]);
      }
      
      // Simulate cleanup process
      const cleanupPromises = sessions.map(session => 
        claudeFlowService.endSession(session.id)
      );
      
      await Promise.all(cleanupPromises);
      
      // Verify sessions were cleaned up
      const remainingSessions = await db.query(
        'SELECT * FROM claude_flow_sessions WHERE swarm_id LIKE $1 AND status != $2',
        ['leak-test-%', 'completed']
      );
      
      expect(remainingSessions.rows.length).toBe(0);
    });
  });

  describe('Circuit Breaker and Fallback Mechanisms', () => {
    test('Should implement circuit breaker for external services', async () => {
      // Simulate multiple failures to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        mockClaudeFlow.swarmInit.mockRejectedValueOnce(new Error('Service failure'));
        
        await request(app)
          .post('/api/v1/claude-flow/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ topology: 'mesh' })
          .expect(503);
      }
      
      // Circuit breaker should now be open
      const response = await request(app)
        .post('/api/v1/claude-flow/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ topology: 'mesh' });
      
      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('CIRCUIT_BREAKER_OPEN');
    });

    test('Should provide fallback responses during service failures', async () => {
      mockClaudeFlow.neuralPatterns.mockRejectedValue(new Error('Neural service down'));
      
      const response = await request(app)
        .post(`/api/v1/claude-flow/sessions/${testSession.id}/analyze`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test content for analysis'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.analysis).toBeDefined();
      expect(response.body.fallback).toBe(true);
      expect(response.body.analysis.confidence).toBeLessThan(0.5); // Low confidence fallback
    });

    test('Should gracefully degrade functionality', async () => {
      // Mock partial service availability
      mockClaudeFlow.swarmInit.mockResolvedValue({
        swarm_id: 'degraded-swarm',
        topology: 'mesh',
        status: 'degraded',
        available_features: ['basic_agents'], // Limited features
        unavailable_features: ['neural_training', 'advanced_orchestration']
      });
      
      const response = await request(app)
        .post('/api/v1/claude-flow/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topology: 'mesh',
          max_agents: 3,
          features: ['neural_training'] // Request unavailable feature
        });
      
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('degraded');
      expect(response.body.warnings).toContain('neural_training unavailable');
    });
  });

  describe('Data Consistency and Recovery', () => {
    test('Should handle data corruption gracefully', async () => {
      // Simulate corrupted data by inserting invalid JSON
      await db.query(`
        UPDATE feeds 
        SET automation_config = 'invalid json' 
        WHERE id = $1
      `, [testFeed.id]);
      
      const response = await request(app)
        .get(`/api/v1/feeds/${testFeed.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.automation_config).toEqual({}); // Default fallback
      expect(response.body.warnings).toContain('automation_config_corrupted');
      
      // Restore valid data
      await db.query(`
        UPDATE feeds 
        SET automation_config = '{}' 
        WHERE id = $1
      `, [testFeed.id]);
    });

    test('Should handle inconsistent data states', async () => {
      // Create orphaned feed items (feed doesn't exist)
      const orphanedItemResult = await db.query(`
        INSERT INTO feed_items (feed_id, title, content, url, content_hash) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `, ['00000000-0000-0000-0000-000000000000', 'Orphaned Item', 'Content', 'https://example.com/orphan', 'orphanhash']);
      
      // API should handle this gracefully
      const response = await request(app)
        .get('/api/v1/feeds')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      // Should not include orphaned items in feed item counts
      
      // Cleanup orphaned item
      await db.query('DELETE FROM feed_items WHERE id = $1', [orphanedItemResult.rows[0].id]);
    });

    test('Should recover from cache inconsistencies', async () => {
      // This test would be more relevant if we had Redis caching
      // For now, test in-memory cache scenarios
      
      // Create feed item
      const itemResult = await db.query(`
        INSERT INTO feed_items (feed_id, title, content, url, content_hash) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `, [testFeed.id, 'Cache Test Item', 'Cache content', 'https://example.com/cache', 'cachehash']);
      
      // Get items (might be cached)
      const response1 = await request(app)
        .get(`/api/v1/feeds/${testFeed.id}/items`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const itemCount1 = response1.body.items.length;
      
      // Delete item directly from database (bypassing cache)
      await db.query('DELETE FROM feed_items WHERE id = $1', [itemResult.rows[0].id]);
      
      // Get items again (should reflect current database state)
      const response2 = await request(app)
        .get(`/api/v1/feeds/${testFeed.id}/items?force_refresh=true`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const itemCount2 = response2.body.items.length;
      
      expect(itemCount2).toBe(itemCount1 - 1);
    });
  });

  describe('Security Error Handling', () => {
    test('Should handle SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get('/api/v1/feeds')
        .query({ search: maliciousInput })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200); // Should not crash
      
      // Verify users table still exists
      const usersCheck = await db.query('SELECT COUNT(*) FROM users');
      expect(usersCheck.rows[0].count).toBeDefined();
    });

    test('Should handle XSS attempts in API responses', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      // Create feed with XSS payload
      const feedResult = await db.query(`
        INSERT INTO feeds (user_id, name, url, feed_type) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `, [testUser.id, xssPayload, 'https://example.com/xss-feed.rss', 'rss']);
      
      const response = await request(app)
        .get(`/api/v1/feeds/${feedResult.rows[0].id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.text).not.toContain('<script>');
      expect(response.body.name).toBe(xssPayload); // Should be escaped in JSON
      
      // Cleanup
      await db.query('DELETE FROM feeds WHERE id = $1', [feedResult.rows[0].id]);
    });

    test('Should handle authorization bypass attempts', async () => {
      // Try to access another user's feed
      const otherUserResult = await db.query(`
        INSERT INTO users (email, name, password_hash) 
        VALUES ($1, $2, $3) 
        RETURNING *
      `, ['other@example.com', 'Other User', 'hash']);
      
      const otherUser = otherUserResult.rows[0];
      
      const otherFeedResult = await db.query(`
        INSERT INTO feeds (user_id, name, url, feed_type) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `, [otherUser.id, 'Other User Feed', 'https://example.com/other-feed.rss', 'rss']);
      
      const response = await request(app)
        .get(`/api/v1/feeds/${otherFeedResult.rows[0].id}`)
        .set('Authorization', `Bearer ${authToken}`); // Using testUser's token
      
      expect(response.status).toBe(404); // Should not reveal existence
      
      // Cleanup
      await db.query('DELETE FROM users WHERE id = $1', [otherUser.id]);
    });
  });

  describe('Error Logging and Monitoring', () => {
    test('Should log errors with proper context', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Trigger an error
      await request(app)
        .post('/api/v1/feeds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' });
      
      // Should have logged the error
      expect(consoleSpy).toHaveBeenCalled();
      const loggedError = consoleSpy.mock.calls[0][0];
      expect(loggedError).toContain('Validation error');
      
      consoleSpy.mockRestore();
    });

    test('Should provide error correlation IDs', async () => {
      const response = await request(app)
        .get('/api/v1/feeds/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body.error.correlation_id).toBeDefined();
      expect(response.body.error.correlation_id).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    });

    test('Should sanitize sensitive data in error responses', async () => {
      // Try to trigger error with sensitive data
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'errortest@example.com',
          password: 'wrong-password-with-sensitive-data'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error.message).not.toContain('wrong-password-with-sensitive-data');
      expect(response.body.error.message).toBe('Invalid credentials');
    });
  });
});
