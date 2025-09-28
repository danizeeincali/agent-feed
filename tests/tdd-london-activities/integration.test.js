/**
 * TDD London School Integration Tests for Activities
 * End-to-end workflow testing with real components
 * Focus: Complete system behavior verification
 */

const request = require('supertest');
const WebSocket = require('ws');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const ActivitiesDatabase = require('../../src/database/activities/ActivitiesDatabase');
const ActivityBroadcaster = require('../../src/websockets/activities/ActivityBroadcaster');

describe('Activities System Integration - TDD London School', () => {
  let app;
  let server;
  let wss;
  let broadcaster;
  let activitiesDb;
  let wsPort;

  beforeAll(async () => {
    // Setup Next.js app for API testing
    const nextApp = next({
      dev: false,
      dir: process.cwd(),
      quiet: true
    });

    const handle = nextApp.getRequestHandler();
    await nextApp.prepare();

    // Create HTTP server for API
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    app = server;
  });

  beforeEach(async () => {
    // Setup WebSocket server for broadcasting tests
    wsPort = 3100 + Math.floor(Math.random() * 900);
    const httpServer = createServer();
    wss = new WebSocket.Server({ server: httpServer });

    // Initialize real database and broadcaster
    activitiesDb = new ActivitiesDatabase();
    broadcaster = new ActivityBroadcaster(wss, activitiesDb);

    // Start WebSocket server
    await new Promise((resolve) => {
      httpServer.listen(wsPort, resolve);
    });
  });

  afterEach(() => {
    if (broadcaster) broadcaster.close();
    if (wss) wss.close();
    if (activitiesDb) activitiesDb.close();
  });

  afterAll(() => {
    if (server) server.close();
  });

  describe('Complete Activity Workflow - Database to WebSocket', () => {
    it('should create activity via API and broadcast via WebSocket', async () => {
      // Given: WebSocket client connected for real-time updates
      const ws = new WebSocket(`ws://localhost:${wsPort}`);
      await new Promise((resolve) => ws.on('open', resolve));

      const receivedMessages = [];
      ws.on('message', (data) => {
        receivedMessages.push(JSON.parse(data));
      });

      // When: Activity is created via API
      const activityData = {
        type: 'agent_spawn',
        title: 'Integration Test Agent',
        description: 'Agent created during integration testing',
        actor: 'integration-test-system',
        target_type: 'agent',
        target_id: 'integration-agent-001',
        metadata: {
          testType: 'integration',
          environment: 'test'
        }
      };

      const apiResponse = await request(app)
        .post('/api/activities')
        .send(activityData)
        .expect(201);

      // And: Activity is broadcast via WebSocket
      const activityId = apiResponse.body.data.id;
      await broadcaster.broadcastActivity(activityId);

      // Then: API should return created activity
      expect(apiResponse.body.success).toBe(true);
      expect(apiResponse.body.data.id).toBeTruthy();
      expect(apiResponse.body.data.type).toBe('agent_spawn');
      expect(apiResponse.body.data.title).toBe('Integration Test Agent');

      // And: WebSocket client should receive broadcast
      await new Promise(resolve => setTimeout(resolve, 100));

      const activityBroadcast = receivedMessages.find(msg =>
        msg.type === 'activity_update' && msg.data.id === activityId
      );

      expect(activityBroadcast).toBeTruthy();
      expect(activityBroadcast.data.type).toBe('agent_spawn');
      expect(activityBroadcast.data.title).toBe('Integration Test Agent');
      expect(activityBroadcast.data.metadata.testType).toBe('integration');

      ws.close();
    });

    it('should handle complete swarm orchestration workflow', async () => {
      // Given: Multiple WebSocket clients (simulating dashboard users)
      const clients = [];
      const clientMessages = [];

      for (let i = 0; i < 3; i++) {
        const ws = new WebSocket(`ws://localhost:${wsPort}`);
        await new Promise((resolve) => ws.on('open', resolve));

        clientMessages[i] = [];
        ws.on('message', (data) => {
          clientMessages[i].push(JSON.parse(data));
        });

        clients.push(ws);
      }

      // When: Complete swarm workflow occurs
      const swarmWorkflow = [
        {
          type: 'swarm_init',
          title: 'Swarm Initialized',
          description: 'Analysis swarm initialized with 5 agents',
          actor: 'swarm-orchestrator',
          metadata: { topology: 'hierarchical', maxAgents: 5 }
        },
        {
          type: 'agent_spawn',
          title: 'Coordinator Agent Created',
          description: 'Coordinator agent spawned',
          actor: 'swarm-orchestrator',
          target_type: 'agent',
          target_id: 'coordinator-001'
        },
        {
          type: 'agent_spawn',
          title: 'Research Agent Created',
          description: 'Research agent spawned',
          actor: 'coordinator-001',
          target_type: 'agent',
          target_id: 'researcher-001'
        },
        {
          type: 'task_start',
          title: 'Analysis Task Started',
          description: 'Data analysis task initiated',
          actor: 'researcher-001',
          metadata: { taskType: 'data_analysis', priority: 'high' }
        },
        {
          type: 'task_complete',
          title: 'Analysis Task Completed',
          description: 'Data analysis completed successfully',
          actor: 'researcher-001',
          metadata: { results: 'positive', confidence: 0.95 }
        }
      ];

      const createdActivityIds = [];

      // Create each activity via API and broadcast
      for (const activityData of swarmWorkflow) {
        const apiResponse = await request(app)
          .post('/api/activities')
          .send(activityData)
          .expect(201);

        const activityId = apiResponse.body.data.id;
        createdActivityIds.push(activityId);

        await broadcaster.broadcastActivity(activityId);
        await new Promise(resolve => setTimeout(resolve, 20)); // Small delay between events
      }

      // Then: All clients should receive all workflow events
      await new Promise(resolve => setTimeout(resolve, 200));

      for (let clientIndex = 0; clientIndex < 3; clientIndex++) {
        const messages = clientMessages[clientIndex];
        const activityUpdates = messages.filter(msg => msg.type === 'activity_update');

        expect(activityUpdates).toHaveLength(5);

        // Verify workflow sequence
        expect(activityUpdates[0].data.type).toBe('swarm_init');
        expect(activityUpdates[1].data.type).toBe('agent_spawn');
        expect(activityUpdates[1].data.target_id).toBe('coordinator-001');
        expect(activityUpdates[2].data.type).toBe('agent_spawn');
        expect(activityUpdates[2].data.target_id).toBe('researcher-001');
        expect(activityUpdates[3].data.type).toBe('task_start');
        expect(activityUpdates[4].data.type).toBe('task_complete');
      }

      // Cleanup
      clients.forEach(ws => ws.close());
    });
  });

  describe('API-Database-WebSocket Data Consistency', () => {
    it('should maintain data consistency across all layers', async () => {
      // Given: Activity created via API
      const activityData = {
        type: 'consistency_test',
        title: 'Data Consistency Test',
        description: 'Testing data flow consistency',
        actor: 'consistency-tester',
        metadata: { testId: 'consistency-001' }
      };

      const createResponse = await request(app)
        .post('/api/activities')
        .send(activityData)
        .expect(201);

      const activityId = createResponse.body.data.id;

      // When: Retrieving activity via API
      const getResponse = await request(app)
        .get('/api/activities')
        .expect(200);

      // Then: API data should match created activity
      const retrievedActivity = getResponse.body.activities.find(a => a.id === activityId);
      expect(retrievedActivity).toBeTruthy();
      expect(retrievedActivity.type).toBe('consistency_test');
      expect(retrievedActivity.title).toBe('Data Consistency Test');
      expect(retrievedActivity.metadata.testId).toBe('consistency-001');

      // And: Database direct access should match API data
      const dbActivity = await activitiesDb.getActivityForBroadcast(activityId);
      expect(dbActivity.type).toBe(retrievedActivity.type);
      expect(dbActivity.title).toBe(retrievedActivity.title);
      expect(dbActivity.metadata.testId).toBe(retrievedActivity.metadata.testId);

      // And: WebSocket broadcast should match database data
      const ws = new WebSocket(`ws://localhost:${wsPort}`);
      await new Promise((resolve) => ws.on('open', resolve));

      const broadcastMessages = [];
      ws.on('message', (data) => {
        broadcastMessages.push(JSON.parse(data));
      });

      await broadcaster.broadcastActivity(activityId);
      await new Promise(resolve => setTimeout(resolve, 50));

      const activityBroadcast = broadcastMessages.find(msg =>
        msg.type === 'activity_update' && msg.data.id === activityId
      );

      expect(activityBroadcast.data.type).toBe(dbActivity.type);
      expect(activityBroadcast.data.title).toBe(dbActivity.title);
      expect(activityBroadcast.data.metadata.testId).toBe(dbActivity.metadata.testId);

      ws.close();
    });
  });

  describe('Real-time Feed Updates', () => {
    it('should provide real-time feed updates for activity streams', async () => {
      // Given: WebSocket client connected for feed updates
      const ws = new WebSocket(`ws://localhost:${wsPort}`);
      await new Promise((resolve) => ws.on('open', resolve));

      const feedUpdates = [];
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'feed_update') {
          feedUpdates.push(message);
        }
      });

      // When: Multiple activities are created rapidly
      const rapidActivities = [
        { type: 'user_login', title: 'User Logged In', actor: 'user-001' },
        { type: 'post_create', title: 'New Post Created', actor: 'user-001' },
        { type: 'comment_add', title: 'Comment Added', actor: 'user-002' },
        { type: 'like_add', title: 'Post Liked', actor: 'user-003' },
        { type: 'share_create', title: 'Post Shared', actor: 'user-004' }
      ];

      for (const activityData of rapidActivities) {
        const response = await request(app)
          .post('/api/activities')
          .send(activityData)
          .expect(201);

        const activityId = response.body.data.id;
        await broadcaster.broadcastFeedUpdate(activityId);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Then: Should receive real-time feed updates
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(feedUpdates.length).toBeGreaterThan(0);

      const latestFeedUpdate = feedUpdates[feedUpdates.length - 1];
      expect(latestFeedUpdate.data.activities).toBeTruthy();
      expect(latestFeedUpdate.data.total_count).toBe(5);

      // Verify feed contains all created activities
      const feedActivityTypes = latestFeedUpdate.data.activities.map(a => a.type);
      expect(feedActivityTypes).toContain('user_login');
      expect(feedActivityTypes).toContain('post_create');
      expect(feedActivityTypes).toContain('comment_add');

      ws.close();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle API errors gracefully without affecting WebSocket', async () => {
      // Given: WebSocket client connected
      const ws = new WebSocket(`ws://localhost:${wsPort}`);
      await new Promise((resolve) => ws.on('open', resolve));

      const messages = [];
      ws.on('message', (data) => messages.push(JSON.parse(data)));

      // When: Invalid activity creation attempt
      await request(app)
        .post('/api/activities')
        .send({ invalid: 'data' })
        .expect(400);

      // And: Valid activity creation
      const validActivity = {
        type: 'recovery_test',
        title: 'Recovery Test Activity',
        actor: 'recovery-tester'
      };

      const response = await request(app)
        .post('/api/activities')
        .send(validActivity)
        .expect(201);

      await broadcaster.broadcastActivity(response.body.data.id);

      // Then: WebSocket should still work normally
      await new Promise(resolve => setTimeout(resolve, 100));

      const activityBroadcasts = messages.filter(msg => msg.type === 'activity_update');
      expect(activityBroadcasts).toHaveLength(1);
      expect(activityBroadcasts[0].data.type).toBe('recovery_test');

      ws.close();
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent activity creation and broadcasting', async () => {
      // Given: Multiple WebSocket clients
      const clientCount = 5;
      const clients = [];

      for (let i = 0; i < clientCount; i++) {
        const ws = new WebSocket(`ws://localhost:${wsPort}`);
        await new Promise((resolve) => ws.on('open', resolve));
        clients.push(ws);
      }

      // When: Many activities are created concurrently
      const concurrentActivities = Array.from({ length: 20 }, (_, i) => ({
        type: 'load_test',
        title: `Load Test Activity ${i + 1}`,
        description: `Concurrent activity creation test ${i + 1}`,
        actor: `load-tester-${i % 5}`,
        metadata: { testNumber: i + 1, batch: 'concurrent' }
      }));

      const startTime = Date.now();

      // Create all activities concurrently
      const creationPromises = concurrentActivities.map(activityData =>
        request(app)
          .post('/api/activities')
          .send(activityData)
          .expect(201)
      );

      const responses = await Promise.all(creationPromises);
      const endTime = Date.now();

      // Then: All activities should be created successfully
      expect(responses).toHaveLength(20);
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeTruthy();
      });

      // And: Performance should be reasonable (less than 5 seconds for 20 activities)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000);

      console.log(`Created 20 activities concurrently in ${totalTime}ms`);

      // Cleanup
      clients.forEach(ws => ws.close());
    });
  });
});