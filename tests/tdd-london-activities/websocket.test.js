/**
 * TDD London School WebSocket Broadcasting Tests for Activities
 * Tests real WebSocket broadcasting with actual activity events
 * Focus: Real-time behavior verification
 */

const WebSocket = require('ws');
const { createServer } = require('http');
const ActivitiesDatabase = require('../../src/database/activities/ActivitiesDatabase');
const ActivityBroadcaster = require('../../src/websockets/activities/ActivityBroadcaster');

describe('Activities WebSocket Broadcasting - TDD London School', () => {
  let server;
  let wss;
  let broadcaster;
  let activitiesDb;
  let testPort;

  beforeEach(async () => {
    // Setup real WebSocket server for testing
    testPort = 3001 + Math.floor(Math.random() * 1000);
    server = createServer();
    wss = new WebSocket.Server({ server });

    // Initialize real database and broadcaster
    activitiesDb = new ActivitiesDatabase();
    broadcaster = new ActivityBroadcaster(wss, activitiesDb);

    // Start server
    await new Promise((resolve) => {
      server.listen(testPort, resolve);
    });
  });

  afterEach(async () => {
    if (broadcaster) {
      broadcaster.close();
    }
    if (wss) {
      wss.close();
    }
    if (server) {
      server.close();
    }
    if (activitiesDb) {
      activitiesDb.close();
    }
  });

  describe('WebSocket Connection Management', () => {
    it('should establish WebSocket connection for activity updates', async () => {
      // Given: WebSocket server is running
      // When: Client connects to activities WebSocket
      const ws = new WebSocket(`ws://localhost:${testPort}`);

      // Then: Connection should be established
      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });

    it('should track connected clients for broadcasting', async () => {
      // Given: Multiple clients connecting
      const clients = [];

      // When: Multiple WebSocket clients connect
      for (let i = 0; i < 3; i++) {
        const ws = new WebSocket(`ws://localhost:${testPort}`);
        await new Promise((resolve) => ws.on('open', resolve));
        clients.push(ws);
      }

      // Then: Broadcaster should track all clients
      expect(broadcaster.getConnectedClientsCount()).toBe(3);

      // Cleanup
      clients.forEach(ws => ws.close());
    });

    it('should remove clients from tracking when disconnected', async () => {
      // Given: Connected client
      const ws = new WebSocket(`ws://localhost:${testPort}`);
      await new Promise((resolve) => ws.on('open', resolve));

      expect(broadcaster.getConnectedClientsCount()).toBe(1);

      // When: Client disconnects
      ws.close();
      await new Promise((resolve) => ws.on('close', resolve));

      // Then: Client should be removed from tracking
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow cleanup
      expect(broadcaster.getConnectedClientsCount()).toBe(0);
    });
  });

  describe('Real-time Activity Broadcasting', () => {
    it('should broadcast real activities via WebSocket', async () => {
      // Given: Connected WebSocket client
      const ws = new WebSocket(`ws://localhost:${testPort}`);
      await new Promise((resolve) => ws.on('open', resolve));

      const receivedMessages = [];
      ws.on('message', (data) => {
        receivedMessages.push(JSON.parse(data));
      });

      // When: Real system event occurs (agent spawn)
      const activityData = {
        type: 'agent_spawn',
        title: 'Research Agent Spawned',
        description: 'Spawned research agent for data analysis',
        actor: 'swarm-coordinator',
        target_type: 'agent',
        target_id: 'research-agent-456',
        metadata: {
          agentType: 'researcher',
          swarmId: 'analysis-swarm-789'
        }
      };

      const activityId = await activitiesDb.createActivity(activityData);
      await broadcaster.broadcastActivity(activityId);

      // Then: Activity should be broadcast to WebSocket client
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow broadcast

      expect(receivedMessages).toHaveLength(1);
      const broadcastedActivity = receivedMessages[0];

      expect(broadcastedActivity.type).toBe('activity_update');
      expect(broadcastedActivity.data.type).toBe('agent_spawn');
      expect(broadcastedActivity.data.title).toBe('Research Agent Spawned');
      expect(broadcastedActivity.data.actor).toBe('swarm-coordinator');
      expect(broadcastedActivity.data.metadata.swarmId).toBe('analysis-swarm-789');
      expect(broadcastedActivity.timestamp).toBeTruthy();

      ws.close();
    });

    it('should broadcast to multiple connected clients', async () => {
      // Given: Multiple connected clients
      const clients = [];
      const receivedMessages = [];

      for (let i = 0; i < 3; i++) {
        const ws = new WebSocket(`ws://localhost:${testPort}`);
        await new Promise((resolve) => ws.on('open', resolve));

        receivedMessages[i] = [];
        ws.on('message', (data) => {
          receivedMessages[i].push(JSON.parse(data));
        });

        clients.push(ws);
      }

      // When: Real activity occurs
      const activityData = {
        type: 'task_complete',
        title: 'Task Completed',
        description: 'Research task completed successfully',
        actor: 'research-agent-123'
      };

      const activityId = await activitiesDb.createActivity(activityData);
      await broadcaster.broadcastActivity(activityId);

      // Then: All clients should receive the broadcast
      await new Promise(resolve => setTimeout(resolve, 100));

      for (let i = 0; i < 3; i++) {
        expect(receivedMessages[i]).toHaveLength(1);
        expect(receivedMessages[i][0].data.type).toBe('task_complete');
        expect(receivedMessages[i][0].data.title).toBe('Task Completed');
      }

      // Cleanup
      clients.forEach(ws => ws.close());
    });

    it('should handle broadcast failures gracefully', async () => {
      // Given: Client with connection issues
      const ws = new WebSocket(`ws://localhost:${testPort}`);
      await new Promise((resolve) => ws.on('open', resolve));

      // Simulate connection issues by closing underlying socket
      ws.terminate();

      // When: Attempting to broadcast activity
      const activityData = {
        type: 'error_test',
        title: 'Error Test Activity',
        actor: 'test-system'
      };

      const activityId = await activitiesDb.createActivity(activityData);

      // Then: Broadcast should handle disconnected clients gracefully
      expect(async () => {
        await broadcaster.broadcastActivity(activityId);
      }).not.toThrow();
    });
  });

  describe('Activity Event Types', () => {
    let ws;
    let receivedMessages;

    beforeEach(async () => {
      ws = new WebSocket(`ws://localhost:${testPort}`);
      await new Promise((resolve) => ws.on('open', resolve));

      receivedMessages = [];
      ws.on('message', (data) => {
        receivedMessages.push(JSON.parse(data));
      });
    });

    afterEach(() => {
      if (ws) ws.close();
    });

    it('should broadcast agent spawn activities', async () => {
      // Given: Agent spawn event
      const activityData = {
        type: 'agent_spawn',
        title: 'New Agent Created',
        description: 'Coder agent spawned for task execution',
        actor: 'swarm-manager',
        target_type: 'agent',
        target_id: 'coder-agent-001'
      };

      // When: Activity is created and broadcast
      const activityId = await activitiesDb.createActivity(activityData);
      await broadcaster.broadcastActivity(activityId);

      // Then: Should broadcast agent spawn event
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(receivedMessages[0].data.type).toBe('agent_spawn');
      expect(receivedMessages[0].data.target_type).toBe('agent');
    });

    it('should broadcast post creation activities', async () => {
      // Given: Post creation event
      const activityData = {
        type: 'post_create',
        title: 'New Post Published',
        description: 'User published blog post about AI',
        actor: 'user-789',
        target_type: 'post',
        target_id: 'post-abc123'
      };

      // When: Activity is created and broadcast
      const activityId = await activitiesDb.createActivity(activityData);
      await broadcaster.broadcastActivity(activityId);

      // Then: Should broadcast post creation event
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(receivedMessages[0].data.type).toBe('post_create');
      expect(receivedMessages[0].data.target_id).toBe('post-abc123');
    });

    it('should broadcast task events', async () => {
      // Given: Task start event
      const activityData = {
        type: 'task_start',
        title: 'Analysis Task Started',
        description: 'Started comprehensive data analysis',
        actor: 'analysis-agent',
        metadata: {
          taskType: 'data_analysis',
          priority: 'high'
        }
      };

      // When: Activity is created and broadcast
      const activityId = await activitiesDb.createActivity(activityData);
      await broadcaster.broadcastActivity(activityId);

      // Then: Should broadcast task event with metadata
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(receivedMessages[0].data.type).toBe('task_start');
      expect(receivedMessages[0].data.metadata.taskType).toBe('data_analysis');
    });
  });

  describe('Real-time Feed Integration', () => {
    it('should integrate with activity feed updates', async () => {
      // Given: WebSocket client listening for feed updates
      const ws = new WebSocket(`ws://localhost:${testPort}`);
      await new Promise((resolve) => ws.on('open', resolve));

      const feedUpdates = [];
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'feed_update') {
          feedUpdates.push(message);
        }
      });

      // When: Multiple real activities occur in sequence
      const activities = [
        {
          type: 'agent_spawn',
          title: 'Agent 1 Created',
          actor: 'coordinator'
        },
        {
          type: 'task_start',
          title: 'Task 1 Started',
          actor: 'agent-1'
        },
        {
          type: 'post_create',
          title: 'Post 1 Created',
          actor: 'user-1'
        }
      ];

      for (const activityData of activities) {
        const activityId = await activitiesDb.createActivity(activityData);
        await broadcaster.broadcastFeedUpdate(activityId);
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      }

      // Then: Should receive real-time feed updates
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(feedUpdates.length).toBeGreaterThan(0);
      expect(feedUpdates[0].data.activities).toBeTruthy();

      ws.close();
    });
  });
});