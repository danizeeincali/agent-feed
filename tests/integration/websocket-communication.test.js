/**
 * WebSocket Communication Integration Tests
 * Tests real-time communication, event handling, and WebSocket functionality
 */

const io = require('socket.io-client');
const { createServer } = require('http');
const { app, server } = require('../../src/api/server');
const jwt = require('jsonwebtoken');
const { db } = require('../../src/database/connection');

describe('WebSocket Communication Integration Tests', () => {
  let clientSocket;
  let authToken;
  let testUser;
  let testFeed;
  let testSession;
  const serverPort = 3001;

  beforeAll(async () => {
    // Setup test database
    await db.migrate();
    
    // Create test user
    const userResult = await db.query(`
      INSERT INTO users (email, name, password_hash) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, ['wstest@example.com', 'WebSocket Test User', 'hashedpassword']);
    
    testUser = userResult.rows[0];
    
    // Generate auth token
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
    `, [testUser.id, 'WebSocket Test Feed', 'https://example.com/ws-feed.rss', 'rss']);
    
    testFeed = feedResult.rows[0];

    // Create test Claude Flow session
    const sessionResult = await db.query(`
      INSERT INTO claude_flow_sessions (user_id, swarm_id, configuration) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [testUser.id, 'ws-test-swarm', JSON.stringify({ topology: 'mesh' })]);
    
    testSession = sessionResult.rows[0];
  });

  afterAll(async () => {
    // Cleanup test data
    await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    await db.close();
  });

  beforeEach((done) => {
    // Create client socket
    clientSocket = io(`http://localhost:${serverPort}`, {
      auth: {
        token: authToken,
        userId: testUser.id
      },
      forceNew: true
    });
    
    clientSocket.on('connect', () => {
      done();
    });
    
    clientSocket.on('connect_error', (error) => {
      done(error);
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection and Authentication', () => {
    test('Should connect with valid authentication', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    test('Should reject connection without token', (done) => {
      const unauthSocket = io(`http://localhost:${serverPort}`, {
        auth: {},
        forceNew: true
      });
      
      unauthSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication');
        unauthSocket.disconnect();
        done();
      });
      
      unauthSocket.on('connect', () => {
        unauthSocket.disconnect();
        done(new Error('Should not have connected without authentication'));
      });
    });

    test('Should join user-specific room on connection', (done) => {
      // Verify by checking if events are received
      clientSocket.on('test:user-room', (data) => {
        expect(data.message).toBe('User room test');
        done();
      });
      
      // Simulate server sending to user room
      setTimeout(() => {
        const { io: serverIO } = require('../../src/api/server');
        serverIO.to(`user:${testUser.id}`).emit('test:user-room', { message: 'User room test' });
      }, 100);
    });
  });

  describe('Feed Subscription Events', () => {
    test('Should subscribe to feed updates', (done) => {
      let subscribed = false;
      
      clientSocket.emit('subscribe:feed', testFeed.id);
      
      clientSocket.on('feed:update', (data) => {
        if (data.feedId === testFeed.id) {
          expect(data.type).toBe('new_items');
          expect(data.items).toBeInstanceOf(Array);
          subscribed = true;
          done();
        }
      });
      
      // Simulate feed update
      setTimeout(() => {
        const { io: serverIO } = require('../../src/api/server');
        serverIO.to(`feed:${testFeed.id}`).emit('feed:update', {
          feedId: testFeed.id,
          type: 'new_items',
          items: [{ id: 'item1', title: 'Test Item' }]
        });
      }, 100);
      
      setTimeout(() => {
        if (!subscribed) {
          done(new Error('Did not receive feed update'));
        }
      }, 1000);
    });

    test('Should unsubscribe from feed updates', (done) => {
      let receivedAfterUnsub = false;
      
      // Subscribe first
      clientSocket.emit('subscribe:feed', testFeed.id);
      
      setTimeout(() => {
        // Unsubscribe
        clientSocket.emit('unsubscribe:feed', testFeed.id);
        
        setTimeout(() => {
          // Try to send update
          const { io: serverIO } = require('../../src/api/server');
          serverIO.to(`feed:${testFeed.id}`).emit('feed:update', {
            feedId: testFeed.id,
            type: 'test_after_unsub'
          });
          
          setTimeout(() => {
            expect(receivedAfterUnsub).toBe(false);
            done();
          }, 200);
        }, 100);
      }, 100);
      
      clientSocket.on('feed:update', (data) => {
        if (data.type === 'test_after_unsub') {
          receivedAfterUnsub = true;
        }
      });
    });

    test('Should receive feed status changes', (done) => {
      clientSocket.emit('subscribe:feed', testFeed.id);
      
      clientSocket.on('feed:status', (data) => {
        expect(data.feedId).toBe(testFeed.id);
        expect(data.status).toBe('fetching');
        expect(data.timestamp).toBeDefined();
        done();
      });
      
      // Simulate status change
      setTimeout(() => {
        const { io: serverIO } = require('../../src/api/server');
        serverIO.to(`feed:${testFeed.id}`).emit('feed:status', {
          feedId: testFeed.id,
          status: 'fetching',
          timestamp: new Date().toISOString()
        });
      }, 100);
    });

    test('Should receive feed error notifications', (done) => {
      clientSocket.emit('subscribe:feed', testFeed.id);
      
      clientSocket.on('feed:error', (data) => {
        expect(data.feedId).toBe(testFeed.id);
        expect(data.error).toBe('Connection timeout');
        expect(data.code).toBe('FETCH_TIMEOUT');
        done();
      });
      
      // Simulate error
      setTimeout(() => {
        const { io: serverIO } = require('../../src/api/server');
        serverIO.to(`feed:${testFeed.id}`).emit('feed:error', {
          feedId: testFeed.id,
          error: 'Connection timeout',
          code: 'FETCH_TIMEOUT',
          timestamp: new Date().toISOString()
        });
      }, 100);
    });
  });

  describe('Claude Flow Session Events', () => {
    test('Should subscribe to Claude Flow session updates', (done) => {
      clientSocket.emit('subscribe:claude-flow', testSession.id);
      
      clientSocket.on('claude-flow:session:started', (data) => {
        expect(data.session_id).toBe(testSession.id);
        expect(data.user_id).toBe(testUser.id);
        expect(data.swarm_id).toBe(testSession.swarm_id);
        done();
      });
      
      // Simulate session start event
      setTimeout(() => {
        const { claudeFlowService } = require('../../src/services/claude-flow');
        claudeFlowService.emit('session:started', {
          session_id: testSession.id,
          user_id: testUser.id,
          swarm_id: testSession.swarm_id,
          configuration: testSession.configuration
        });
      }, 100);
    });

    test('Should receive agent spawning notifications', (done) => {
      clientSocket.emit('subscribe:claude-flow', testSession.id);
      
      clientSocket.on('claude-flow:agent:spawned', (data) => {
        expect(data.session_id).toBe(testSession.id);
        expect(data.agent_id).toBeDefined();
        expect(data.agent_type).toBe('researcher');
        done();
      });
      
      // Simulate agent spawn
      setTimeout(() => {
        const { io: serverIO } = require('../../src/api/server');
        serverIO.to(`claude-flow:${testSession.id}`).emit('claude-flow:agent:spawned', {
          session_id: testSession.id,
          agent_id: 'agent-123',
          agent_type: 'researcher',
          capabilities: ['research', 'analysis']
        });
      }, 100);
    });

    test('Should receive task completion events', (done) => {
      const taskId = 'task-456';
      
      clientSocket.on('claude-flow:task:completed', (data) => {
        expect(data.taskId).toBe(taskId);
        expect(data.result).toHaveProperty('status', 'completed');
        expect(data.result).toHaveProperty('output');
        done();
      });
      
      // Simulate task completion
      setTimeout(() => {
        const { claudeFlowService } = require('../../src/services/claude-flow');
        claudeFlowService.emit('task:completed', taskId, {
          status: 'completed',
          output: 'Task completed successfully',
          metrics: { duration: 1500, tokens_used: 250 }
        });
      }, 100);
    });

    test('Should receive neural pattern learning events', (done) => {
      clientSocket.emit('subscribe:claude-flow', testSession.id);
      
      clientSocket.on('claude-flow:neural:pattern', (data) => {
        expect(data.session_id).toBe(testSession.id);
        expect(data.pattern_type).toBe('optimization');
        expect(data.confidence_score).toBeGreaterThan(0.8);
        done();
      });
      
      // Simulate neural pattern learning
      setTimeout(() => {
        const { claudeFlowService } = require('../../src/services/claude-flow');
        claudeFlowService.emit('neural:pattern:learned', testSession.id, {
          session_id: testSession.id,
          pattern_type: 'optimization',
          pattern_data: { algorithm: 'adam', learning_rate: 0.001 },
          confidence_score: 0.92
        });
      }, 100);
    });

    test('Should receive session metrics updates', (done) => {
      clientSocket.emit('subscribe:claude-flow', testSession.id);
      
      clientSocket.on('claude-flow:metrics:update', (data) => {
        expect(data.session_id).toBe(testSession.id);
        expect(data.metrics).toHaveProperty('agents_spawned');
        expect(data.metrics).toHaveProperty('tasks_completed');
        expect(data.metrics).toHaveProperty('performance_score');
        done();
      });
      
      // Simulate metrics update
      setTimeout(() => {
        const { io: serverIO } = require('../../src/api/server');
        serverIO.to(`claude-flow:${testSession.id}`).emit('claude-flow:metrics:update', {
          session_id: testSession.id,
          metrics: {
            agents_spawned: 3,
            tasks_completed: 7,
            total_tokens_used: 2500,
            performance_score: 0.87
          }
        });
      }, 100);
    });
  });

  describe('Real-time Automation Events', () => {
    test('Should receive automation trigger notifications', (done) => {
      clientSocket.on('automation:triggered', (data) => {
        expect(data.feed_id).toBe(testFeed.id);
        expect(data.trigger_type).toBe('keyword_match');
        expect(data.matched_item).toBeDefined();
        done();
      });
      
      // Simulate automation trigger
      setTimeout(() => {
        const { io: serverIO } = require('../../src/api/server');
        serverIO.to(`user:${testUser.id}`).emit('automation:triggered', {
          feed_id: testFeed.id,
          trigger_type: 'keyword_match',
          trigger_id: 'trigger-789',
          matched_item: {
            id: 'item-123',
            title: 'AI breakthrough article',
            keywords_found: ['AI', 'breakthrough']
          }
        });
      }, 100);
    });

    test('Should receive automation action results', (done) => {
      clientSocket.on('automation:completed', (data) => {
        expect(data.action_type).toBe('claude_flow_spawn');
        expect(data.status).toBe('completed');
        expect(data.result).toHaveProperty('analysis');
        done();
      });
      
      // Simulate automation completion
      setTimeout(() => {
        const { io: serverIO } = require('../../src/api/server');
        serverIO.to(`user:${testUser.id}`).emit('automation:completed', {
          automation_id: 'auto-123',
          action_type: 'claude_flow_spawn',
          status: 'completed',
          result: {
            analysis: 'Positive sentiment detected',
            confidence: 0.89,
            recommendations: ['Share on social media']
          }
        });
      }, 100);
    });

    test('Should receive automation errors', (done) => {
      clientSocket.on('automation:error', (data) => {
        expect(data.error).toBe('Claude Flow service unavailable');
        expect(data.code).toBe('SERVICE_UNAVAILABLE');
        expect(data.retry_count).toBe(3);
        done();
      });
      
      // Simulate automation error
      setTimeout(() => {
        const { io: serverIO } = require('../../src/api/server');
        serverIO.to(`user:${testUser.id}`).emit('automation:error', {
          automation_id: 'auto-456',
          error: 'Claude Flow service unavailable',
          code: 'SERVICE_UNAVAILABLE',
          retry_count: 3,
          will_retry: false
        });
      }, 100);
    });
  });

  describe('System Health and Monitoring', () => {
    test('Should receive system health updates', (done) => {
      clientSocket.on('system:health', (data) => {
        expect(data.status).toBe('healthy');
        expect(data.services).toHaveProperty('database');
        expect(data.services).toHaveProperty('claude_flow');
        done();
      });
      
      // Simulate health update
      setTimeout(() => {
        const { io: serverIO } = require('../../src/api/server');
        serverIO.emit('system:health', {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'up',
            redis: 'up',
            claude_flow: 'up'
          },
          metrics: {
            active_connections: 15,
            memory_usage: 0.65,
            cpu_usage: 0.42
          }
        });
      }, 100);
    });

    test('Should receive performance alerts', (done) => {
      clientSocket.on('system:alert', (data) => {
        expect(data.level).toBe('warning');
        expect(data.component).toBe('database');
        expect(data.metric).toBe('connection_pool');
        done();
      });
      
      // Simulate performance alert
      setTimeout(() => {
        const { io: serverIO } = require('../../src/api/server');
        serverIO.emit('system:alert', {
          level: 'warning',
          component: 'database',
          metric: 'connection_pool',
          message: 'Connection pool usage above 80%',
          value: 0.85,
          threshold: 0.8
        });
      }, 100);
    });
  });

  describe('Multiple Client Coordination', () => {
    let secondClient;
    
    beforeEach((done) => {
      secondClient = io(`http://localhost:${serverPort}`, {
        auth: {
          token: authToken,
          userId: testUser.id
        },
        forceNew: true
      });
      
      secondClient.on('connect', () => {
        done();
      });
    });
    
    afterEach(() => {
      if (secondClient && secondClient.connected) {
        secondClient.disconnect();
      }
    });

    test('Should broadcast to all user sessions', (done) => {
      let receivedCount = 0;
      
      const checkCompletion = () => {
        receivedCount++;
        if (receivedCount === 2) {
          done();
        }
      };
      
      clientSocket.on('broadcast:test', (data) => {
        expect(data.message).toBe('Broadcast to all sessions');
        checkCompletion();
      });
      
      secondClient.on('broadcast:test', (data) => {
        expect(data.message).toBe('Broadcast to all sessions');
        checkCompletion();
      });
      
      // Broadcast to all user sessions
      setTimeout(() => {
        const { io: serverIO } = require('../../src/api/server');
        serverIO.to(`user:${testUser.id}`).emit('broadcast:test', {
          message: 'Broadcast to all sessions'
        });
      }, 100);
    });

    test('Should handle client disconnection gracefully', (done) => {
      secondClient.disconnect();
      
      // Send event that only first client should receive
      setTimeout(() => {
        const { io: serverIO } = require('../../src/api/server');
        serverIO.to(`user:${testUser.id}`).emit('disconnect:test', {
          message: 'After disconnect'
        });
      }, 100);
      
      clientSocket.on('disconnect:test', (data) => {
        expect(data.message).toBe('After disconnect');
        done();
      });
      
      // Second client shouldn't receive this
      secondClient.on('disconnect:test', () => {
        done(new Error('Disconnected client received event'));
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    test('Should handle malformed event data', (done) => {
      // Send malformed data
      clientSocket.emit('subscribe:feed', null);
      clientSocket.emit('subscribe:feed', { invalid: 'object' });
      clientSocket.emit('subscribe:feed', '');
      
      // Should still be connected
      setTimeout(() => {
        expect(clientSocket.connected).toBe(true);
        done();
      }, 200);
    });

    test('Should handle connection drops and reconnection', (done) => {
      let reconnected = false;
      
      clientSocket.on('disconnect', () => {
        // Attempt reconnection
        setTimeout(() => {
          clientSocket.connect();
        }, 100);
      });
      
      clientSocket.on('connect', () => {
        if (reconnected) {
          expect(clientSocket.connected).toBe(true);
          done();
        } else {
          reconnected = true;
          // Force disconnect
          clientSocket.disconnect();
        }
      });
    });

    test('Should emit error events for invalid operations', (done) => {
      clientSocket.on('error', (error) => {
        expect(error.message).toContain('Invalid');
        done();
      });
      
      // Simulate server error
      setTimeout(() => {
        clientSocket.emit('invalid:operation', { data: 'test' });
      }, 100);
    });
  });

  describe('Performance and Load Testing', () => {
    test('Should handle rapid event succession', (done) => {
      let eventCount = 0;
      const expectedEvents = 50;
      
      clientSocket.on('load:test', (data) => {
        eventCount++;
        if (eventCount === expectedEvents) {
          done();
        }
      });
      
      // Send rapid events
      const { io: serverIO } = require('../../src/api/server');
      for (let i = 0; i < expectedEvents; i++) {
        setTimeout(() => {
          serverIO.to(`user:${testUser.id}`).emit('load:test', {
            sequence: i,
            timestamp: Date.now()
          });
        }, i * 10); // 10ms intervals
      }
    });

    test('Should maintain event order', (done) => {
      const receivedEvents = [];
      const expectedSequence = [1, 2, 3, 4, 5];
      
      clientSocket.on('sequence:test', (data) => {
        receivedEvents.push(data.sequence);
        
        if (receivedEvents.length === expectedSequence.length) {
          expect(receivedEvents).toEqual(expectedSequence);
          done();
        }
      });
      
      // Send ordered events
      const { io: serverIO } = require('../../src/api/server');
      expectedSequence.forEach((seq, index) => {
        setTimeout(() => {
          serverIO.to(`user:${testUser.id}`).emit('sequence:test', {
            sequence: seq,
            timestamp: Date.now()
          });
        }, index * 50);
      });
    });
  });
});
