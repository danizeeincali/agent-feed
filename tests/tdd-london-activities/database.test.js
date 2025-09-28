/**
 * TDD London School Database Layer Tests for Activities
 * Tests real database operations with no mocks
 * Focus: Interaction testing and behavior verification
 */

const path = require('path');

describe('Activities Database Layer - TDD London School', () => {
  let ActivitiesDatabase;
  let activitiesDb;

  beforeEach(() => {
    // Require fresh module for each test (dependency injection pattern)
    delete require.cache[require.resolve('../../src/database/activities/ActivitiesDatabase')];

    // Mock the database path to use test database
    jest.doMock('../../src/database/activities/config', () => ({
      getDatabasePath: () => global.getTestDbPath()
    }));

    ActivitiesDatabase = require('../../src/database/activities/ActivitiesDatabase');
    activitiesDb = new ActivitiesDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Database Table Creation', () => {
    it('should create activities table if not exists', () => {
      // Given: Fresh database from jest.setup.js
      // When: ActivitiesDatabase is instantiated
      // Then: activities table should exist

      const tableInfo = global.testDb.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='activities'
      `).get();

      expect(tableInfo).toBeTruthy();
      expect(tableInfo.name).toBe('activities');
    });

    it('should create proper indexes for activities table', () => {
      // Given: Activities table exists
      // When: Database is initialized
      // Then: Required indexes should exist

      const indexes = global.testDb.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND tbl_name='activities'
      `).all();

      const indexNames = indexes.map(idx => idx.name);

      expect(indexNames).toContain('idx_activities_timestamp');
      expect(indexNames).toContain('idx_activities_actor');
      expect(indexNames).toContain('idx_activities_type');
    });
  });

  describe('Activity Storage - Real Database Operations', () => {
    it('should store real activity when system event occurs', async () => {
      // Given: Clean database state (empty activities)
      const initialCount = global.testDb.prepare('SELECT COUNT(*) as count FROM activities').get().count;
      expect(initialCount).toBe(0);

      // When: Real activity is created through system operation
      const activityData = {
        type: 'agent_spawn',
        title: 'Agent Spawned',
        description: 'Research agent spawned for task analysis',
        actor: 'swarm-coordinator',
        target_type: 'agent',
        target_id: 'research-agent-001',
        metadata: JSON.stringify({
          agentType: 'researcher',
          swarmId: 'analysis-swarm-123'
        })
      };

      const activityId = await activitiesDb.createActivity(activityData);

      // Then: Activity should be stored in database
      const storedActivity = global.testDb.prepare(`
        SELECT * FROM activities WHERE id = ?
      `).get(activityId);

      expect(storedActivity).toBeTruthy();
      expect(storedActivity.type).toBe('agent_spawn');
      expect(storedActivity.title).toBe('Agent Spawned');
      expect(storedActivity.actor).toBe('swarm-coordinator');
      expect(storedActivity.target_id).toBe('research-agent-001');
      expect(JSON.parse(storedActivity.metadata).swarmId).toBe('analysis-swarm-123');

      // Verify timestamp is recent
      const activityTime = new Date(storedActivity.timestamp);
      const now = new Date();
      expect(now.getTime() - activityTime.getTime()).toBeLessThan(1000); // Within 1 second
    });

    it('should generate unique IDs for each activity', async () => {
      // Given: Clean database
      // When: Multiple activities are created
      const activity1Id = await activitiesDb.createActivity({
        type: 'task_start',
        title: 'Task Started',
        actor: 'user',
        description: 'User started new task'
      });

      const activity2Id = await activitiesDb.createActivity({
        type: 'task_complete',
        title: 'Task Completed',
        actor: 'user',
        description: 'User completed task'
      });

      // Then: IDs should be unique
      expect(activity1Id).not.toBe(activity2Id);
      expect(activity1Id).toBeTruthy();
      expect(activity2Id).toBeTruthy();

      // Verify both are stored
      const count = global.testDb.prepare('SELECT COUNT(*) as count FROM activities').get().count;
      expect(count).toBe(2);
    });
  });

  describe('Activity Retrieval - Empty State Handling', () => {
    it('should return empty array when no activities exist', async () => {
      // Given: Clean database with no activities
      const count = global.testDb.prepare('SELECT COUNT(*) as count FROM activities').get().count;
      expect(count).toBe(0);

      // When: Activities are retrieved
      const activities = await activitiesDb.getActivities();

      // Then: Should return empty array (no mock data)
      expect(Array.isArray(activities)).toBe(true);
      expect(activities).toHaveLength(0);
    });

    it('should return empty array with pagination when no activities exist', async () => {
      // Given: Clean database
      // When: Activities are retrieved with pagination
      const result = await activitiesDb.getActivities({
        page: 1,
        limit: 10
      });

      // Then: Should return proper empty pagination structure
      expect(result).toEqual({
        activities: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0
        }
      });
    });
  });

  describe('Activity Retrieval - Real Data Operations', () => {
    beforeEach(async () => {
      // Create real test activities in database
      await activitiesDb.createActivity({
        type: 'agent_spawn',
        title: 'Research Agent Created',
        description: 'Created research agent for analysis',
        actor: 'swarm-coordinator'
      });

      await activitiesDb.createActivity({
        type: 'task_start',
        title: 'Analysis Task Started',
        description: 'Started data analysis task',
        actor: 'research-agent-001'
      });

      await activitiesDb.createActivity({
        type: 'post_create',
        title: 'New Post Created',
        description: 'User created new blog post',
        actor: 'user-123',
        target_type: 'post',
        target_id: 'post-456'
      });
    });

    it('should retrieve real activities with pagination', async () => {
      // Given: Database with 3 real activities
      // When: Activities are retrieved with pagination
      const result = await activitiesDb.getActivities({
        page: 1,
        limit: 2
      });

      // Then: Should return real activities with proper pagination
      expect(result.activities).toHaveLength(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.pages).toBe(2);

      // Verify real data (not mocks)
      expect(result.activities[0].type).toMatch(/^(agent_spawn|task_start|post_create)$/);
      expect(result.activities[0].title).toBeTruthy();
      expect(result.activities[0].actor).toBeTruthy();
    });

    it('should retrieve activities by type filter', async () => {
      // Given: Mixed activity types in database
      // When: Activities are filtered by type
      const agentActivities = await activitiesDb.getActivitiesByType('agent_spawn');

      // Then: Should return only matching activities
      expect(agentActivities).toHaveLength(1);
      expect(agentActivities[0].type).toBe('agent_spawn');
      expect(agentActivities[0].title).toBe('Research Agent Created');
    });

    it('should retrieve activities by actor', async () => {
      // Given: Activities from different actors
      // When: Activities are filtered by actor
      const userActivities = await activitiesDb.getActivitiesByActor('user-123');

      // Then: Should return only user activities
      expect(userActivities).toHaveLength(1);
      expect(userActivities[0].actor).toBe('user-123');
      expect(userActivities[0].type).toBe('post_create');
    });
  });

  describe('Real-time Activity Broadcasting Preparation', () => {
    it('should prepare activity data for WebSocket broadcasting', async () => {
      // Given: Real activity in database
      const activityId = await activitiesDb.createActivity({
        type: 'comment_add',
        title: 'Comment Added',
        description: 'User added comment to post',
        actor: 'user-456',
        target_type: 'post',
        target_id: 'post-789',
        metadata: JSON.stringify({ commentId: 'comment-123' })
      });

      // When: Activity is formatted for broadcasting
      const broadcastData = await activitiesDb.getActivityForBroadcast(activityId);

      // Then: Should return properly formatted data
      expect(broadcastData).toEqual({
        id: activityId,
        type: 'comment_add',
        title: 'Comment Added',
        description: 'User added comment to post',
        actor: 'user-456',
        target_type: 'post',
        target_id: 'post-789',
        metadata: { commentId: 'comment-123' },
        timestamp: expect.any(String),
        created_at: expect.any(String)
      });
    });
  });

  describe('Error Handling - Real Database Failures', () => {
    it('should handle database write failures gracefully', async () => {
      // Given: Database with constraint violation potential
      // When: Attempting to create activity with invalid data
      const invalidActivity = {
        // Missing required fields to trigger database error
        type: null,
        title: null
      };

      // Then: Should reject with meaningful error
      await expect(activitiesDb.createActivity(invalidActivity))
        .rejects
        .toThrow(/NOT NULL constraint failed/);
    });

    it('should handle database read failures gracefully', async () => {
      // Given: Corrupted or inaccessible database
      global.testDb.close(); // Simulate database connection failure

      // When: Attempting to read activities
      // Then: Should handle error gracefully
      await expect(activitiesDb.getActivities())
        .rejects
        .toThrow(/database/i);
    });
  });
});