/**
 * Performance and Load Testing
 * Tests system performance under various load conditions
 */

const request = require('supertest');
const io = require('socket.io-client');
const { app } = require('../../src/api/server');
const { db } = require('../../src/database/connection');
const { claudeFlowService } = require('../../src/services/claude-flow');
const cluster = require('cluster');
const os = require('os');

// Mock external services for performance testing
jest.mock('../../src/mcp/claude-flow-client');
const mockClaudeFlow = require('../../src/mcp/claude-flow-client');

describe('Performance and Load Testing', () => {
  let testUser;
  let authToken;
  let testFeed;
  const numCPUs = os.cpus().length;

  beforeAll(async () => {
    // Setup test database
    await db.migrate();
    
    // Create test user
    const userResult = await db.query(`
      INSERT INTO users (email, name, password_hash) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, ['perftest@example.com', 'Performance Test User', 'hashedpassword']);
    
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
    `, [testUser.id, 'Performance Test Feed', 'https://example.com/perf-feed.rss', 'rss']);
    
    testFeed = feedResult.rows[0];

    // Mock Claude Flow responses
    mockClaudeFlow.swarmInit.mockResolvedValue({
      swarm_id: 'perf-swarm-123',
      topology: 'mesh',
      status: 'initialized'
    });
    
    mockClaudeFlow.agentSpawn.mockResolvedValue({
      agent_id: 'perf-agent-123',
      type: 'researcher',
      status: 'active'
    });
    
    mockClaudeFlow.taskOrchestrate.mockResolvedValue({
      task_id: 'perf-task-123',
      status: 'running'
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    await db.close();
  });

  describe('API Endpoint Performance', () => {
    test('Should handle concurrent authentication requests', async () => {
      const concurrentUsers = 50;
      const startTime = Date.now();
      
      const loginPromises = Array(concurrentUsers).fill(null).map((_, index) => 
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'perftest@example.com',
            password: 'testpassword'
          })
      );
      
      const responses = await Promise.all(loginPromises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Performance requirements
      expect(totalDuration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(totalDuration / concurrentUsers).toBeLessThan(200); // Average < 200ms per request
      
      console.log(`Concurrent auth test: ${concurrentUsers} requests in ${totalDuration}ms`);
      console.log(`Average response time: ${Math.round(totalDuration / concurrentUsers)}ms`);
    });

    test('Should handle high-volume feed creation', async () => {
      const feedCount = 100;
      const batchSize = 10;
      const startTime = Date.now();
      
      const batches = [];
      for (let i = 0; i < feedCount; i += batchSize) {
        const batch = [];
        for (let j = 0; j < batchSize && (i + j) < feedCount; j++) {
          batch.push(
            request(app)
              .post('/api/v1/feeds')
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                name: `Performance Feed ${i + j}`,
                url: `https://example.com/feed-${i + j}.rss`,
                feed_type: 'rss'
              })
          );
        }
        batches.push(Promise.all(batch));
      }
      
      const results = await Promise.all(batches);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // Flatten results and check success
      const allResponses = results.flat();
      const successCount = allResponses.filter(r => r.status === 201).length;
      
      expect(successCount).toBe(feedCount);
      expect(totalDuration).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log(`Feed creation test: ${feedCount} feeds in ${totalDuration}ms`);
      console.log(`Success rate: ${(successCount / feedCount * 100).toFixed(1)}%`);
      
      // Cleanup created feeds
      const createdFeeds = allResponses.map(r => r.body.id);
      await db.query('DELETE FROM feeds WHERE id = ANY($1)', [createdFeeds]);
    });

    test('Should handle rapid feed item retrieval', async () => {
      // Create test feed items
      const itemCount = 1000;
      const insertPromises = [];
      
      for (let i = 0; i < itemCount; i++) {
        insertPromises.push(
          db.query(`
            INSERT INTO feed_items (feed_id, title, content, url, content_hash) 
            VALUES ($1, $2, $3, $4, $5)
          `, [testFeed.id, `Item ${i}`, `Content ${i}`, `https://example.com/item-${i}`, `hash-${i}`])
        );
      }
      
      await Promise.all(insertPromises);
      
      // Test retrieval performance
      const retrievalCount = 20;
      const startTime = Date.now();
      
      const retrievalPromises = Array(retrievalCount).fill(null).map(() => 
        request(app)
          .get(`/api/v1/feeds/${testFeed.id}/items?limit=50`)
          .set('Authorization', `Bearer ${authToken}`)
      );
      
      const responses = await Promise.all(retrievalPromises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.items.length).toBe(50);
      });
      
      expect(totalDuration / retrievalCount).toBeLessThan(100); // Average < 100ms per request
      
      console.log(`Feed item retrieval: ${retrievalCount} requests in ${totalDuration}ms`);
      console.log(`Average response time: ${Math.round(totalDuration / retrievalCount)}ms`);
    });

    test('Should handle complex query performance', async () => {
      const queryCount = 50;
      const startTime = Date.now();
      
      const queryPromises = Array(queryCount).fill(null).map((_, index) => 
        request(app)
          .get('/api/v1/feeds')
          .query({
            search: 'test',
            status: 'active',
            limit: 20,
            offset: index * 20
          })
          .set('Authorization', `Bearer ${authToken}`)
      );
      
      const responses = await Promise.all(queryPromises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('feeds');
      });
      
      expect(totalDuration / queryCount).toBeLessThan(150); // Average < 150ms per query
      
      console.log(`Complex query test: ${queryCount} queries in ${totalDuration}ms`);
    });
  });

  describe('Database Performance', () => {
    test('Should handle bulk data operations efficiently', async () => {
      const recordCount = 5000;
      const startTime = Date.now();
      
      // Bulk insert feed items
      const values = [];
      const params = [];
      
      for (let i = 0; i < recordCount; i++) {
        const paramIndex = i * 5;
        values.push(`($${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`);
        params.push(
          testFeed.id,
          `Bulk Item ${i}`,
          `Bulk content ${i}`,
          `https://example.com/bulk-${i}`,
          `bulk-hash-${i}`
        );
      }
      
      const query = `
        INSERT INTO feed_items (feed_id, title, content, url, content_hash) 
        VALUES ${values.join(', ')}
      `;
      
      await db.query(query, params);
      
      const insertEndTime = Date.now();
      const insertDuration = insertEndTime - startTime;
      
      // Test bulk retrieval
      const retrievalStartTime = Date.now();
      
      const result = await db.query(`
        SELECT * FROM feed_items 
        WHERE feed_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1000
      `, [testFeed.id]);
      
      const retrievalEndTime = Date.now();
      const retrievalDuration = retrievalEndTime - retrievalStartTime;
      
      expect(result.rows.length).toBe(1000);
      expect(insertDuration).toBeLessThan(10000); // Bulk insert < 10 seconds
      expect(retrievalDuration).toBeLessThan(1000); // Retrieval < 1 second
      
      console.log(`Bulk insert: ${recordCount} records in ${insertDuration}ms`);
      console.log(`Bulk retrieval: 1000 records in ${retrievalDuration}ms`);
      
      // Test index performance
      const indexTestStart = Date.now();
      
      await db.query(`
        SELECT * FROM feed_items 
        WHERE feed_id = $1 AND title ILIKE $2
      `, [testFeed.id, '%Item 100%']);
      
      const indexTestEnd = Date.now();
      const indexDuration = indexTestEnd - indexTestStart;
      
      expect(indexDuration).toBeLessThan(50); // Index query < 50ms
    });

    test('Should handle concurrent database connections', async () => {
      const connectionCount = 20;
      const queryCount = 10;
      
      const connectionPromises = Array(connectionCount).fill(null).map(async () => {
        const queries = [];
        for (let i = 0; i < queryCount; i++) {
          queries.push(
            db.query('SELECT COUNT(*) FROM feed_items WHERE feed_id = $1', [testFeed.id])
          );
        }
        return Promise.all(queries);
      });
      
      const startTime = Date.now();
      const results = await Promise.all(connectionPromises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // All queries should succeed
      results.forEach(connectionResults => {
        connectionResults.forEach(queryResult => {
          expect(queryResult.rows[0].count).toBeDefined();
        });
      });
      
      const totalQueries = connectionCount * queryCount;
      expect(totalDuration / totalQueries).toBeLessThan(20); // Average < 20ms per query
      
      console.log(`Concurrent DB test: ${totalQueries} queries in ${totalDuration}ms`);
    });

    test('Should perform complex aggregation queries efficiently', async () => {
      const startTime = Date.now();
      
      const aggregationQuery = `
        SELECT 
          DATE_TRUNC('day', created_at) as day,
          COUNT(*) as item_count,
          COUNT(DISTINCT feed_id) as feed_count,
          AVG(CHAR_LENGTH(content)) as avg_content_length
        FROM feed_items 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY day DESC
      `;
      
      const result = await db.query(aggregationQuery);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(Array.isArray(result.rows)).toBe(true);
      expect(duration).toBeLessThan(500); // Complex aggregation < 500ms
      
      console.log(`Aggregation query: ${duration}ms`);
    });
  });

  describe('WebSocket Performance', () => {
    test('Should handle many concurrent WebSocket connections', async () => {
      const connectionCount = 100;
      const clients = [];
      
      const connectionPromises = Array(connectionCount).fill(null).map((_, index) => 
        new Promise((resolve, reject) => {
          const client = io('http://localhost:3003', {
            auth: {
              token: authToken,
              userId: testUser.id
            },
            forceNew: true
          });
          
          client.on('connect', () => {
            clients.push(client);
            resolve(client);
          });
          
          client.on('connect_error', reject);
          
          setTimeout(() => reject(new Error(`Connection ${index} timeout`)), 5000);
        })
      );
      
      const startTime = Date.now();
      const connectedClients = await Promise.all(connectionPromises);
      const connectionTime = Date.now() - startTime;
      
      expect(connectedClients.length).toBe(connectionCount);
      expect(connectionTime).toBeLessThan(10000); // All connections < 10 seconds
      
      // Test broadcast performance
      const broadcastStartTime = Date.now();
      let receivedCount = 0;
      
      const broadcastPromise = new Promise(resolve => {
        connectedClients.forEach(client => {
          client.on('performance:broadcast', () => {
            receivedCount++;
            if (receivedCount === connectionCount) {
              resolve();
            }
          });
        });
      });
      
      // Simulate broadcast
      const { io: serverIO } = require('../../src/api/server');
      serverIO.to(`user:${testUser.id}`).emit('performance:broadcast', {
        message: 'Performance test broadcast',
        timestamp: Date.now()
      });
      
      await broadcastPromise;
      const broadcastTime = Date.now() - broadcastStartTime;
      
      expect(receivedCount).toBe(connectionCount);
      expect(broadcastTime).toBeLessThan(2000); // Broadcast delivery < 2 seconds
      
      console.log(`WebSocket connections: ${connectionCount} in ${connectionTime}ms`);
      console.log(`Broadcast delivery: ${connectionCount} clients in ${broadcastTime}ms`);
      
      // Cleanup connections
      connectedClients.forEach(client => client.disconnect());
    });

    test('Should handle rapid event succession', async () => {
      const client = io('http://localhost:3003', {
        auth: {
          token: authToken,
          userId: testUser.id
        }
      });
      
      await new Promise((resolve, reject) => {
        client.on('connect', resolve);
        client.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      const eventCount = 1000;
      let receivedCount = 0;
      const receivedEvents = [];
      
      const eventPromise = new Promise(resolve => {
        client.on('rapid:event', (data) => {
          receivedCount++;
          receivedEvents.push(data.sequence);
          if (receivedCount === eventCount) {
            resolve();
          }
        });
      });
      
      const startTime = Date.now();
      
      // Send rapid events
      const { io: serverIO } = require('../../src/api/server');
      for (let i = 0; i < eventCount; i++) {
        serverIO.to(`user:${testUser.id}`).emit('rapid:event', {
          sequence: i,
          timestamp: Date.now()
        });
      }
      
      await eventPromise;
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      expect(receivedCount).toBe(eventCount);
      expect(totalDuration).toBeLessThan(5000); // All events < 5 seconds
      
      // Check event ordering
      const isOrdered = receivedEvents.every((seq, index) => index === 0 || seq >= receivedEvents[index - 1]);
      expect(isOrdered).toBe(true);
      
      console.log(`Rapid events: ${eventCount} events in ${totalDuration}ms`);
      console.log(`Event rate: ${Math.round(eventCount / (totalDuration / 1000))} events/second`);
      
      client.disconnect();
    });
  });

  describe('Claude Flow Performance', () => {
    test('Should handle multiple concurrent swarm initializations', async () => {
      const swarmCount = 10;
      const startTime = Date.now();
      
      const swarmPromises = Array(swarmCount).fill(null).map((_, index) => 
        claudeFlowService.initializeSession(testUser.id, {
          topology: 'mesh',
          max_agents: 3,
          description: `Performance Test Swarm ${index}`
        })
      );
      
      const sessions = await Promise.all(swarmPromises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      expect(sessions.length).toBe(swarmCount);
      sessions.forEach(session => {
        expect(session).toHaveProperty('id');
        expect(session).toHaveProperty('swarm_id');
      });
      
      expect(totalDuration / swarmCount).toBeLessThan(500); // Average < 500ms per swarm
      
      console.log(`Swarm initialization: ${swarmCount} swarms in ${totalDuration}ms`);
      
      // Cleanup sessions
      const cleanupPromises = sessions.map(session => 
        db.query('DELETE FROM claude_flow_sessions WHERE id = $1', [session.id])
      );
      await Promise.all(cleanupPromises);
    });

    test('Should handle high-volume agent spawning', async () => {
      // Create test session
      const session = await claudeFlowService.initializeSession(testUser.id, {
        topology: 'mesh',
        max_agents: 50
      });
      
      const agentCount = 25;
      const startTime = Date.now();
      
      const agentPromises = Array(agentCount).fill(null).map((_, index) => 
        claudeFlowService.spawnAgent(session.id, {
          type: index % 2 === 0 ? 'researcher' : 'analyzer',
          capabilities: [`capability_${index}`]
        })
      );
      
      const agents = await Promise.all(agentPromises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      expect(agents.length).toBe(agentCount);
      agents.forEach(agent => {
        expect(agent).toHaveProperty('agent_id');
        expect(agent).toHaveProperty('type');
      });
      
      expect(totalDuration / agentCount).toBeLessThan(200); // Average < 200ms per agent
      
      console.log(`Agent spawning: ${agentCount} agents in ${totalDuration}ms`);
      
      // Cleanup session
      await db.query('DELETE FROM claude_flow_sessions WHERE id = $1', [session.id]);
    });

    test('Should handle concurrent task orchestration', async () => {
      const session = await claudeFlowService.initializeSession(testUser.id, {
        topology: 'mesh',
        max_agents: 10
      });
      
      const taskCount = 20;
      const startTime = Date.now();
      
      const taskPromises = Array(taskCount).fill(null).map((_, index) => 
        claudeFlowService.orchestrateTask(session.id, {
          task: `Performance test task ${index}`,
          strategy: 'adaptive',
          priority: 'medium'
        })
      );
      
      const tasks = await Promise.all(taskPromises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      expect(tasks.length).toBe(taskCount);
      tasks.forEach(task => {
        expect(task).toHaveProperty('task_id');
        expect(task).toHaveProperty('status');
      });
      
      expect(totalDuration / taskCount).toBeLessThan(300); // Average < 300ms per task
      
      console.log(`Task orchestration: ${taskCount} tasks in ${totalDuration}ms`);
      
      // Cleanup session
      await db.query('DELETE FROM claude_flow_sessions WHERE id = $1', [session.id]);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    test('Should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate heavy workload
      const workloadPromises = [];
      
      // API requests
      for (let i = 0; i < 100; i++) {
        workloadPromises.push(
          request(app)
            .get('/api/v1/feeds')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      // Database operations
      for (let i = 0; i < 50; i++) {
        workloadPromises.push(
          db.query('SELECT COUNT(*) FROM feed_items WHERE feed_id = $1', [testFeed.id])
        );
      }
      
      await Promise.all(workloadPromises);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalMemory = process.memoryUsage();
      
      // Memory should not increase by more than 50MB
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory usage - Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`Memory usage - Final: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });

    test('Should handle connection pool limits gracefully', async () => {
      // Attempt to create more connections than pool limit
      const connectionAttempts = 50;
      const connectionPromises = [];
      
      for (let i = 0; i < connectionAttempts; i++) {
        connectionPromises.push(
          db.query('SELECT pg_sleep(0.1), $1 as test_id', [i])
        );
      }
      
      const startTime = Date.now();
      const results = await Promise.all(connectionPromises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // All queries should complete successfully
      expect(results.length).toBe(connectionAttempts);
      results.forEach((result, index) => {
        expect(result.rows[0].test_id).toBe(index.toString());
      });
      
      // Should handle gracefully without timing out
      expect(totalDuration).toBeLessThan(30000);
      
      console.log(`Connection pool test: ${connectionAttempts} connections in ${totalDuration}ms`);
    });
  });

  describe('Stress Testing', () => {
    test('Should survive extended high-load operation', async () => {
      const duration = 30000; // 30 seconds
      const requestsPerSecond = 10;
      const interval = 1000 / requestsPerSecond;
      
      let totalRequests = 0;
      let successfulRequests = 0;
      let errors = [];
      
      const startTime = Date.now();
      
      const stressTest = async () => {
        while (Date.now() - startTime < duration) {
          const batchPromises = [];
          
          // Mix of different operations
          batchPromises.push(
            request(app)
              .get('/health')
              .then(res => {
                totalRequests++;
                if (res.status === 200) successfulRequests++;
                return res;
              })
              .catch(err => {
                totalRequests++;
                errors.push(err.message);
              })
          );
          
          batchPromises.push(
            request(app)
              .get('/api/v1/feeds')
              .set('Authorization', `Bearer ${authToken}`)
              .then(res => {
                totalRequests++;
                if (res.status === 200) successfulRequests++;
                return res;
              })
              .catch(err => {
                totalRequests++;
                errors.push(err.message);
              })
          );
          
          await Promise.all(batchPromises);
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      };
      
      await stressTest();
      
      const endTime = Date.now();
      const actualDuration = endTime - startTime;
      const successRate = (successfulRequests / totalRequests) * 100;
      
      console.log(`Stress test completed:`);
      console.log(`Duration: ${actualDuration}ms`);
      console.log(`Total requests: ${totalRequests}`);
      console.log(`Successful: ${successfulRequests}`);
      console.log(`Success rate: ${successRate.toFixed(1)}%`);
      console.log(`Errors: ${errors.length}`);
      
      // Should maintain high success rate
      expect(successRate).toBeGreaterThan(95);
      expect(errors.length).toBeLessThan(totalRequests * 0.05);
    });

    test('Should handle resource exhaustion gracefully', async () => {
      // Attempt to exhaust various resources
      const promises = [];
      
      // Memory pressure
      const largeData = Array(1000).fill(null).map(() => ({
        id: Math.random(),
        data: 'x'.repeat(10000)
      }));
      
      // CPU pressure
      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise(resolve => {
            const start = Date.now();
            while (Date.now() - start < 100) {
              Math.random() * Math.random();
            }
            resolve();
          })
        );
      }
      
      // Database pressure
      for (let i = 0; i < 20; i++) {
        promises.push(
          db.query(`
            SELECT COUNT(*) 
            FROM feed_items 
            WHERE content ILIKE '%test%' 
            AND created_at > NOW() - INTERVAL '1 day'
          `)
        );
      }
      
      // API pressure
      for (let i = 0; i < 30; i++) {
        promises.push(
          request(app)
            .get('/api/v1/feeds')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Resource exhaustion test:`);
      console.log(`Duration: ${duration}ms`);
      console.log(`Successful operations: ${successful}`);
      console.log(`Failed operations: ${failed}`);
      
      // System should remain responsive
      expect(duration).toBeLessThan(10000);
      expect(successful).toBeGreaterThan(failed);
      
      // Health check should still work
      const healthResponse = await request(app).get('/health');
      expect(healthResponse.status).toBe(200);
    });
  });
});
