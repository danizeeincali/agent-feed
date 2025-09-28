/**
 * Manual Test for Activities Implementation
 * Real database operations with zero mock data
 * TDD London School methodology verification
 */

const ActivitiesDatabase = require('../../src/database/activities/ActivitiesDatabase');
const fs = require('fs');
const path = require('path');

// Test database path
const testDbPath = path.join(__dirname, 'manual-test-activities.db');

/**
 * Clean up test database
 */
function cleanup() {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
    console.log('✓ Test database cleaned up');
  }
}

/**
 * Mock the config to use our test database
 */
function mockConfig() {
  const configPath = require.resolve('../../src/database/activities/config');
  delete require.cache[configPath];

  require.cache[configPath] = {
    exports: {
      getDatabasePath: () => testDbPath
    }
  };
}

/**
 * Test Suite Runner
 */
async function runTests() {
  console.log('🧪 Running TDD London School Activities Manual Tests\n');

  let testsPassed = 0;
  let testsFailed = 0;

  /**
   * Test helper function
   */
  function test(description, testFn) {
    return new Promise(async (resolve) => {
      try {
        await testFn();
        console.log(`✓ ${description}`);
        testsPassed++;
        resolve(true);
      } catch (error) {
        console.error(`✗ ${description}`);
        console.error(`  Error: ${error.message}`);
        testsFailed++;
        resolve(false);
      }
    });
  }

  /**
   * Assertion helper
   */
  function expect(actual, expected, message = '') {
    if (typeof expected === 'function') {
      if (!expected(actual)) {
        throw new Error(`Expected condition not met: ${message}`);
      }
    } else if (actual !== expected) {
      throw new Error(`Expected ${expected}, got ${actual}. ${message}`);
    }
  }

  // Setup
  cleanup();
  mockConfig();

  console.log('📋 Database Layer Tests - Real Database Operations\n');

  // Test 1: Database initialization
  await test('should initialize database with activities table', async () => {
    const db = new ActivitiesDatabase();

    // Verify table exists by attempting to query it
    const result = await db.getActivities();
    expect(Array.isArray(result.activities), true, 'Should return activities array');
    expect(result.activities.length, 0, 'Should start with empty activities');
    expect(result.pagination.total, 0, 'Should have zero total count');

    db.close();
  });

  // Test 2: Empty state handling
  await test('should return empty array when no activities exist', async () => {
    const db = new ActivitiesDatabase();

    const result = await db.getActivities();
    expect(result.activities.length, 0, 'Activities array should be empty');
    expect(result.pagination.total, 0, 'Total count should be 0');
    expect(result.pagination.pages, 0, 'Pages should be 0');

    db.close();
  });

  // Test 3: Real activity creation
  await test('should store real activity when system event occurs', async () => {
    const db = new ActivitiesDatabase();

    const activityData = {
      type: 'agent_spawn',
      title: 'Research Agent Created',
      description: 'Created research agent for analysis',
      actor: 'swarm-coordinator',
      target_type: 'agent',
      target_id: 'research-agent-001',
      metadata: {
        agentType: 'researcher',
        swarmId: 'analysis-swarm-123'
      }
    };

    const activityId = await db.createActivity(activityData);
    expect(typeof activityId, 'string', 'Activity ID should be string');
    expect(activityId.length > 0, true, 'Activity ID should not be empty');

    // Verify activity is stored
    const storedActivity = await db.getActivityForBroadcast(activityId);
    expect(storedActivity.type, 'agent_spawn', 'Activity type should match');
    expect(storedActivity.title, 'Research Agent Created', 'Activity title should match');
    expect(storedActivity.actor, 'swarm-coordinator', 'Activity actor should match');
    expect(storedActivity.metadata.swarmId, 'analysis-swarm-123', 'Metadata should be parsed correctly');

    db.close();
  });

  // Test 4: Real data retrieval
  await test('should retrieve real activities after creation', async () => {
    const db = new ActivitiesDatabase();

    // Create multiple real activities
    const activities = [
      {
        type: 'agent_spawn',
        title: 'Agent 1 Created',
        actor: 'coordinator',
        description: 'First agent'
      },
      {
        type: 'task_start',
        title: 'Task 1 Started',
        actor: 'agent-1',
        description: 'First task'
      },
      {
        type: 'post_create',
        title: 'Post 1 Created',
        actor: 'user-1',
        description: 'First post'
      }
    ];

    const createdIds = [];
    for (const activityData of activities) {
      const id = await db.createActivity(activityData);
      createdIds.push(id);
    }

    // Verify retrieval
    const result = await db.getActivities();
    expect(result.activities.length, 3, 'Should retrieve all 3 activities');
    expect(result.pagination.total, 3, 'Total count should be 3');
    expect(result.pagination.pages, 1, 'Should have 1 page');

    // Verify activity data
    const firstActivity = result.activities[0]; // Most recent first
    expect(firstActivity.type, 'post_create', 'Most recent activity should be post_create');
    expect(firstActivity.actor, 'user-1', 'Actor should match');

    db.close();
  });

  // Test 5: Pagination with real data
  await test('should support pagination with real data', async () => {
    const db = new ActivitiesDatabase();

    // Create 5 activities for pagination test
    for (let i = 1; i <= 5; i++) {
      await db.createActivity({
        type: 'pagination_test',
        title: `Activity ${i}`,
        actor: `tester-${i}`,
        description: `Test activity number ${i}`
      });
    }

    // Test first page with limit 2
    const page1 = await db.getActivities({ page: 1, limit: 2 });
    expect(page1.activities.length, 2, 'First page should have 2 activities');
    expect(page1.pagination.total, 5, 'Total should be 5');
    expect(page1.pagination.pages, 3, 'Should have 3 pages');

    // Test second page
    const page2 = await db.getActivities({ page: 2, limit: 2 });
    expect(page2.activities.length, 2, 'Second page should have 2 activities');

    db.close();
  });

  // Test 6: Type filtering
  await test('should filter activities by type', async () => {
    const db = new ActivitiesDatabase();

    // Create activities of different types
    await db.createActivity({
      type: 'agent_spawn',
      title: 'Agent Created',
      actor: 'coordinator'
    });

    await db.createActivity({
      type: 'task_start',
      title: 'Task Started',
      actor: 'agent'
    });

    await db.createActivity({
      type: 'agent_spawn',
      title: 'Another Agent Created',
      actor: 'coordinator'
    });

    // Filter by type
    const agentActivities = await db.getActivitiesByType('agent_spawn');
    expect(agentActivities.length, 2, 'Should return 2 agent_spawn activities');

    const taskActivities = await db.getActivitiesByType('task_start');
    expect(taskActivities.length, 1, 'Should return 1 task_start activity');

    db.close();
  });

  // Test 7: Actor filtering
  await test('should filter activities by actor', async () => {
    const db = new ActivitiesDatabase();

    await db.createActivity({
      type: 'action1',
      title: 'Action by User 1',
      actor: 'user-123'
    });

    await db.createActivity({
      type: 'action2',
      title: 'Action by User 2',
      actor: 'user-456'
    });

    await db.createActivity({
      type: 'action3',
      title: 'Another action by User 1',
      actor: 'user-123'
    });

    const user1Activities = await db.getActivitiesByActor('user-123');
    expect(user1Activities.length, 2, 'User 1 should have 2 activities');

    const user2Activities = await db.getActivitiesByActor('user-456');
    expect(user2Activities.length, 1, 'User 2 should have 1 activity');

    db.close();
  });

  // Test 8: Error handling
  await test('should handle validation errors gracefully', async () => {
    const db = new ActivitiesDatabase();

    try {
      await db.createActivity({
        // Missing required fields
        title: 'Invalid Activity'
      });

      throw new Error('Should have thrown validation error');
    } catch (error) {
      expect(error.message.includes('Missing required fields'), true, 'Should throw validation error');
    }

    db.close();
  });

  console.log('\n📡 WebSocket Broadcasting Preparation Tests\n');

  // Test 9: Broadcast data formatting
  await test('should format activity data for WebSocket broadcasting', async () => {
    const db = new ActivitiesDatabase();

    const activityData = {
      type: 'broadcast_test',
      title: 'Broadcast Test Activity',
      description: 'Testing broadcast data format',
      actor: 'test-system',
      metadata: { testKey: 'testValue' }
    };

    const activityId = await db.createActivity(activityData);
    const broadcastData = await db.getActivityForBroadcast(activityId);

    expect(broadcastData.id, activityId, 'Broadcast data should include activity ID');
    expect(broadcastData.type, 'broadcast_test', 'Type should match');
    expect(broadcastData.title, 'Broadcast Test Activity', 'Title should match');
    expect(broadcastData.metadata.testKey, 'testValue', 'Metadata should be parsed as object');
    expect(typeof broadcastData.timestamp, 'string', 'Timestamp should be string');

    db.close();
  });

  // Cleanup and results
  cleanup();

  console.log(`\n📊 Test Results:`);
  console.log(`✓ Passed: ${testsPassed}`);
  console.log(`✗ Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Activities implementation verified with zero mock data.');
    console.log('✅ TDD London School methodology successfully applied');
    console.log('✅ Real database operations confirmed');
    console.log('✅ Empty state handling verified');
    console.log('✅ Activity creation and retrieval working');
    console.log('✅ WebSocket broadcasting data prepared correctly');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  cleanup();
  process.exit(1);
});