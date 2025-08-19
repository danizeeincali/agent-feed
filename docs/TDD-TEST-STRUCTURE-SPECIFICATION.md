# 🧪 TDD Test Structure Specification
## Comprehensive Testing Framework for AgentLink Feature Parity

> **Objective**: Define complete TDD test structure with swarm-coordinated execution for all 47 AgentLink features across 4 implementation phases.

---

## 📁 Test Directory Organization

```
tests/
├── phase1-foundation/           # 12 features - CRITICAL priority
│   ├── database/
│   │   ├── schema-migration.test.ts
│   │   ├── database-performance.test.ts
│   │   ├── data-integrity.test.ts
│   │   └── relationship-validation.test.ts
│   ├── auth/
│   │   ├── user-authentication.test.ts
│   │   ├── session-management.test.ts
│   │   ├── auth-middleware.test.ts
│   │   └── user-preferences.test.ts
│   ├── agents/
│   │   ├── agent-profiles.test.ts
│   │   ├── agent-system-prompts.test.ts
│   │   ├── agent-crud.test.ts
│   │   └── agent-status-tracking.test.ts
│   └── posts/
│       ├── structured-post-creation.test.ts
│       ├── post-processing-status.test.ts
│       ├── content-migration.test.ts
│       └── external-integration.test.ts
├── phase2-core-features/        # 12 features - HIGH priority
│   ├── threading/
│   │   ├── post-threading.test.ts
│   │   ├── reply-creation.test.ts
│   │   ├── thread-hierarchy.test.ts
│   │   └── thread-navigation.test.ts
│   ├── comments/
│   │   ├── comment-threading.test.ts
│   │   ├── comment-replies.test.ts
│   │   ├── comment-likes.test.ts
│   │   └── comment-processing.test.ts
│   ├── agents/
│   │   ├── chief-of-staff-processing.test.ts
│   │   ├── agent-responses.test.ts
│   │   ├── agent-processing-queue.test.ts
│   │   └── cross-agent-communication.test.ts
│   └── interactions/
│       ├── post-visibility.test.ts
│       ├── post-filtering.test.ts
│       ├── post-saving.test.ts
│       └── comprehensive-likes.test.ts
├── phase3-advanced-features/    # 12 features - MEDIUM/HIGH priority
│   ├── engagement/
│   │   ├── engagement-analytics.test.ts
│   │   ├── engagement-dashboard.test.ts
│   │   ├── activity-feed.test.ts
│   │   └── engagement-heatmap.test.ts
│   ├── posts/
│   │   ├── link-previews.test.ts
│   │   ├── agent-mentions.test.ts
│   │   ├── interaction-tracking.test.ts
│   │   └── post-metadata.test.ts
│   ├── ui/
│   │   ├── real-time-updates.test.ts
│   │   ├── search-filtering.test.ts
│   │   └── responsive-design.test.ts
│   └── notifications/
│       ├── notification-system.test.ts
│       ├── comment-notifications.test.ts
│       └── saved-posts-management.test.ts
├── phase4-polish-integration/   # 11 features - LOW/MEDIUM priority
│   ├── agents/
│   │   ├── dynamic-agent-pages.test.ts
│   │   ├── data-driven-templates.test.ts
│   │   ├── agent-page-versioning.test.ts
│   │   └── agent-page-customization.test.ts
│   ├── integration/
│   │   ├── mcp-integration.test.ts
│   │   ├── advanced-routing.test.ts
│   │   └── comment-ui-interactions.test.ts
│   └── performance/
│       ├── system-performance.test.ts
│       ├── load-testing.test.ts
│       └── optimization-validation.test.ts
├── integration/                 # Cross-phase integration tests
│   ├── end-to-end/
│   │   ├── user-journey.test.ts
│   │   ├── agent-workflow.test.ts
│   │   └── system-integration.test.ts
│   ├── api/
│   │   ├── api-consistency.test.ts
│   │   ├── api-performance.test.ts
│   │   └── api-security.test.ts
│   └── database/
│       ├── cross-table-integrity.test.ts
│       ├── query-performance.test.ts
│       └── migration-validation.test.ts
├── utils/                       # Test utilities and helpers
│   ├── test-helpers.ts
│   ├── mock-data-generators.ts
│   ├── database-setup.ts
│   ├── swarm-test-coordination.ts
│   └── performance-benchmarks.ts
└── config/                      # Test configuration
    ├── jest.config.js
    ├── playwright.config.ts
    ├── test-database.config.ts
    └── swarm-test.config.ts
```

---

## 🎯 Phase 1: Foundation TDD Specifications

### Database Migration Tests
```typescript
// tests/phase1-foundation/database/schema-migration.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { migrateDatabase, rollbackMigration, validateSchema } from '@/database/migrations';
import { testDb } from '@/tests/utils/database-setup';

describe('Database Schema Migration', () => {
  beforeAll(async () => {
    await testDb.setup();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('Migration Execution', () => {
    it('should migrate from current schema to AgentLink schema', async () => {
      const beforeTables = await testDb.getTables();
      const migrationResult = await migrateDatabase('agentlink-v1');
      const afterTables = await testDb.getTables();

      expect(migrationResult.success).toBe(true);
      expect(afterTables).toContain('agents');
      expect(afterTables).toContain('agent_pages');
      expect(afterTables).toContain('user_engagements');
    });

    it('should maintain data integrity during migration', async () => {
      const testData = await testDb.createTestData();
      await migrateDatabase('agentlink-v1');
      const migratedData = await testDb.validateTestData(testData.ids);

      expect(migratedData.posts.length).toBe(testData.posts.length);
      expect(migratedData.users.length).toBe(testData.users.length);
    });

    it('should support rollback on migration failure', async () => {
      const beforeState = await testDb.getSchemaState();
      
      // Simulate migration failure
      await expect(migrateDatabase('invalid-version')).rejects.toThrow();
      
      const afterState = await testDb.getSchemaState();
      expect(afterState).toEqual(beforeState);
    });
  });

  describe('Schema Validation', () => {
    it('should validate all required tables exist', async () => {
      const requiredTables = [
        'users', 'sessions', 'agents', 'posts', 'comments',
        'likes', 'saves', 'user_engagements', 'agent_pages'
      ];

      for (const table of requiredTables) {
        const exists = await testDb.tableExists(table);
        expect(exists).toBe(true);
      }
    });

    it('should validate foreign key relationships', async () => {
      const relationships = await testDb.getForeignKeys();
      
      expect(relationships).toContainEqual({
        table: 'posts',
        column: 'agentId',
        references: { table: 'agents', column: 'id' }
      });
      
      expect(relationships).toContainEqual({
        table: 'comments',
        column: 'postId',
        references: { table: 'posts', column: 'id' }
      });
    });
  });
});
```

### Agent Profile Management Tests
```typescript
// tests/phase1-foundation/agents/agent-profiles.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { AgentService } from '@/services/AgentService';
import { createTestAgent, cleanupTestData } from '@/tests/utils/test-helpers';

describe('Agent Profile Management', () => {
  let agentService: AgentService;

  beforeEach(async () => {
    agentService = new AgentService();
    await cleanupTestData();
  });

  describe('Agent Creation', () => {
    it('should create agent with required fields', async () => {
      const agentData = {
        name: 'test-agent',
        displayName: 'Test Agent',
        description: 'Test agent for unit testing',
        systemPrompt: 'You are a test agent.',
        avatarColor: '#FF5733',
        iconClass: 'fas fa-robot'
      };

      const agent = await agentService.createAgent(agentData);

      expect(agent.id).toBeDefined();
      expect(agent.name).toBe(agentData.name);
      expect(agent.displayName).toBe(agentData.displayName);
      expect(agent.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique agent names', async () => {
      const agentData = createTestAgent({ name: 'duplicate-agent' });
      
      await agentService.createAgent(agentData);
      
      await expect(
        agentService.createAgent({ ...agentData, displayName: 'Different Display Name' })
      ).rejects.toThrow('Agent name must be unique');
    });

    it('should validate required fields', async () => {
      const incompleteAgent = { name: 'incomplete' };

      await expect(
        agentService.createAgent(incompleteAgent as any)
      ).rejects.toThrow('Missing required fields');
    });
  });

  describe('Agent Updates', () => {
    it('should update agent system prompt', async () => {
      const agent = await agentService.createAgent(createTestAgent());
      const newPrompt = 'Updated system prompt for testing';

      const updatedAgent = await agentService.updateAgent(agent.id, {
        systemPrompt: newPrompt
      });

      expect(updatedAgent.systemPrompt).toBe(newPrompt);
      expect(updatedAgent.updatedAt).not.toBe(agent.updatedAt);
    });

    it('should maintain agent name uniqueness on update', async () => {
      const agent1 = await agentService.createAgent(createTestAgent({ name: 'agent-1' }));
      const agent2 = await agentService.createAgent(createTestAgent({ name: 'agent-2' }));

      await expect(
        agentService.updateAgent(agent2.id, { name: 'agent-1' })
      ).rejects.toThrow('Agent name must be unique');
    });
  });

  describe('Agent Retrieval', () => {
    it('should retrieve agent by ID', async () => {
      const createdAgent = await agentService.createAgent(createTestAgent());
      const retrievedAgent = await agentService.getAgentById(createdAgent.id);

      expect(retrievedAgent).toEqual(createdAgent);
    });

    it('should retrieve all active agents', async () => {
      const agents = await Promise.all([
        agentService.createAgent(createTestAgent({ name: 'agent-1' })),
        agentService.createAgent(createTestAgent({ name: 'agent-2' })),
        agentService.createAgent(createTestAgent({ name: 'agent-3' }))
      ]);

      const activeAgents = await agentService.getActiveAgents();

      expect(activeAgents).toHaveLength(3);
      expect(activeAgents.map(a => a.name)).toContain('agent-1');
    });
  });
});
```

---

## 🧵 Phase 2: Core Features TDD Specifications

### Post Threading Tests
```typescript
// tests/phase2-core-features/threading/post-threading.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { PostService } from '@/services/PostService';
import { ThreadService } from '@/services/ThreadService';
import { createTestPost, createTestUser } from '@/tests/utils/test-helpers';

describe('Post Threading System', () => {
  let postService: PostService;
  let threadService: ThreadService;

  beforeEach(async () => {
    postService = new PostService();
    threadService = new ThreadService();
    await cleanupTestData();
  });

  describe('Thread Creation', () => {
    it('should create reply with correct parent relationship', async () => {
      const user = await createTestUser();
      const parentPost = await postService.createPost({
        title: 'Parent Post',
        content: 'This is the parent post',
        authorId: user.id
      });

      const reply = await postService.createReply({
        parentPostId: parentPost.id,
        content: 'This is a reply',
        authorId: user.id
      });

      expect(reply.parentPostId).toBe(parentPost.id);
      expect(reply.id).toBeDefined();

      const threadDepth = await threadService.getThreadDepth(reply.id);
      expect(threadDepth).toBe(1);
    });

    it('should support nested subreplies', async () => {
      const user = await createTestUser();
      const parentPost = await postService.createPost(createTestPost({ authorId: user.id }));
      
      // Create reply
      const reply1 = await postService.createReply({
        parentPostId: parentPost.id,
        content: 'Level 1 reply',
        authorId: user.id
      });

      // Create subreply
      const reply2 = await postService.createReply({
        parentPostId: reply1.id,
        content: 'Level 2 subreply',
        authorId: user.id
      });

      // Create sub-subreply
      const reply3 = await postService.createReply({
        parentPostId: reply2.id,
        content: 'Level 3 sub-subreply',
        authorId: user.id
      });

      const threadHierarchy = await threadService.getThreadHierarchy(parentPost.id);
      
      expect(threadHierarchy.maxDepth).toBe(3);
      expect(threadHierarchy.totalReplies).toBe(3);
      expect(threadHierarchy.structure).toEqual({
        [parentPost.id]: {
          replies: {
            [reply1.id]: {
              replies: {
                [reply2.id]: {
                  replies: {
                    [reply3.id]: { replies: {} }
                  }
                }
              }
            }
          }
        }
      });
    });

    it('should maintain thread order by creation time', async () => {
      const user = await createTestUser();
      const parentPost = await postService.createPost(createTestPost({ authorId: user.id }));

      const replies = [];
      for (let i = 0; i < 5; i++) {
        const reply = await postService.createReply({
          parentPostId: parentPost.id,
          content: `Reply ${i}`,
          authorId: user.id
        });
        replies.push(reply);
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const threadReplies = await threadService.getThreadReplies(parentPost.id);
      
      for (let i = 1; i < threadReplies.length; i++) {
        expect(new Date(threadReplies[i].createdAt).getTime())
          .toBeGreaterThan(new Date(threadReplies[i-1].createdAt).getTime());
      }
    });
  });

  describe('Thread Navigation', () => {
    it('should collapse and expand thread branches', async () => {
      const user = await createTestUser();
      const thread = await createComplexThread(user.id, 3, 2); // 3 levels, 2 replies per level

      // Test collapse
      await threadService.collapseThread(thread.rootPost.id);
      const collapsedState = await threadService.getThreadState(thread.rootPost.id);
      expect(collapsedState.isCollapsed).toBe(true);

      // Test expand
      await threadService.expandThread(thread.rootPost.id);
      const expandedState = await threadService.getThreadState(thread.rootPost.id);
      expect(expandedState.isCollapsed).toBe(false);
    });

    it('should track thread participants', async () => {
      const users = await Promise.all([
        createTestUser(),
        createTestUser(),
        createTestUser()
      ]);

      const parentPost = await postService.createPost(createTestPost({ authorId: users[0].id }));
      
      await postService.createReply({
        parentPostId: parentPost.id,
        content: 'Reply from user 2',
        authorId: users[1].id
      });

      await postService.createReply({
        parentPostId: parentPost.id,
        content: 'Reply from user 3',
        authorId: users[2].id
      });

      const participants = await threadService.getThreadParticipants(parentPost.id);
      
      expect(participants).toHaveLength(3);
      expect(participants.map(p => p.id)).toContain(users[0].id);
      expect(participants.map(p => p.id)).toContain(users[1].id);
      expect(participants.map(p => p.id)).toContain(users[2].id);
    });

    it('should show accurate reply count indicators', async () => {
      const user = await createTestUser();
      const parentPost = await postService.createPost(createTestPost({ authorId: user.id }));

      // Create various levels of replies
      const reply1 = await postService.createReply({
        parentPostId: parentPost.id,
        content: 'Reply 1',
        authorId: user.id
      });

      const reply2 = await postService.createReply({
        parentPostId: parentPost.id,
        content: 'Reply 2',
        authorId: user.id
      });

      const subreply1 = await postService.createReply({
        parentPostId: reply1.id,
        content: 'Subreply 1',
        authorId: user.id
      });

      const replyCounts = await threadService.getReplyCountsForThread(parentPost.id);

      expect(replyCounts[parentPost.id]).toBe(4); // Total replies including nested
      expect(replyCounts[reply1.id]).toBe(1); // Direct subreplies
      expect(replyCounts[reply2.id]).toBe(0); // No subreplies
    });
  });
});
```

### Chief of Staff Processing Tests
```typescript
// tests/phase2-core-features/agents/chief-of-staff-processing.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ChiefOfStaffService } from '@/services/ChiefOfStaffService';
import { AgentProcessingService } from '@/services/AgentProcessingService';
import { createTestPost, createTestAgent } from '@/tests/utils/test-helpers';

describe('Chief of Staff Processing System', () => {
  let chiefOfStaff: ChiefOfStaffService;
  let agentProcessor: AgentProcessingService;

  beforeEach(async () => {
    chiefOfStaff = new ChiefOfStaffService();
    agentProcessor = new AgentProcessingService();
    await cleanupTestData();
  });

  describe('Processing Validation', () => {
    it('should validate all agents processed post', async () => {
      const post = await createTestPost({ requiresProcessing: true });
      const agents = await Promise.all([
        createTestAgent({ name: 'agent-1' }),
        createTestAgent({ name: 'agent-2' }),
        createTestAgent({ name: 'agent-3' })
      ]);

      // Simulate agent processing
      for (const agent of agents) {
        await agentProcessor.processPost(post.id, agent.id);
      }

      const validation = await chiefOfStaff.validatePostProcessing(post.id);

      expect(validation.allProcessed).toBe(true);
      expect(validation.processedBy).toHaveLength(agents.length);
      expect(validation.processedBy.map(p => p.agentId)).toEqual(
        expect.arrayContaining(agents.map(a => a.id))
      );
    });

    it('should identify unprocessed posts', async () => {
      const post = await createTestPost({ requiresProcessing: true });
      const agents = await Promise.all([
        createTestAgent({ name: 'agent-1' }),
        createTestAgent({ name: 'agent-2' }),
        createTestAgent({ name: 'agent-3' })
      ]);

      // Only process by 2 out of 3 agents
      await agentProcessor.processPost(post.id, agents[0].id);
      await agentProcessor.processPost(post.id, agents[1].id);

      const validation = await chiefOfStaff.validatePostProcessing(post.id);

      expect(validation.allProcessed).toBe(false);
      expect(validation.processedBy).toHaveLength(2);
      expect(validation.pendingAgents).toHaveLength(1);
      expect(validation.pendingAgents[0].id).toBe(agents[2].id);
    });

    it('should track processing timestamps', async () => {
      const post = await createTestPost({ requiresProcessing: true });
      const agent = await createTestAgent();

      const beforeProcessing = Date.now();
      await agentProcessor.processPost(post.id, agent.id);
      const afterProcessing = Date.now();

      const validation = await chiefOfStaff.validatePostProcessing(post.id);
      const processingTime = new Date(validation.processedBy[0].processedAt).getTime();

      expect(processingTime).toBeGreaterThanOrEqual(beforeProcessing);
      expect(processingTime).toBeLessThanOrEqual(afterProcessing);
    });

    it('should handle agent processing failures', async () => {
      const post = await createTestPost({ requiresProcessing: true });
      const agent = await createTestAgent();

      // Simulate processing failure
      await expect(
        agentProcessor.processPost(post.id, 'invalid-agent-id')
      ).rejects.toThrow('Agent not found');

      // Verify post remains unprocessed
      const validation = await chiefOfStaff.validatePostProcessing(post.id);
      expect(validation.allProcessed).toBe(false);
      expect(validation.processedBy).toHaveLength(0);
    });
  });

  describe('Processing Queue Management', () => {
    it('should prioritize posts by creation time', async () => {
      const posts = [];
      for (let i = 0; i < 5; i++) {
        const post = await createTestPost({ requiresProcessing: true });
        posts.push(post);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const processingQueue = await chiefOfStaff.getProcessingQueue();
      
      for (let i = 1; i < processingQueue.length; i++) {
        expect(new Date(processingQueue[i].createdAt).getTime())
          .toBeGreaterThan(new Date(processingQueue[i-1].createdAt).getTime());
      }
    });

    it('should exclude already processed posts from queue', async () => {
      const processedPost = await createTestPost({ requiresProcessing: true });
      const unprocessedPost = await createTestPost({ requiresProcessing: true });
      const agent = await createTestAgent();

      // Process one post
      await agentProcessor.processPost(processedPost.id, agent.id);
      await chiefOfStaff.markPostAsProcessed(processedPost.id);

      const processingQueue = await chiefOfStaff.getProcessingQueue();

      expect(processingQueue.map(p => p.id)).not.toContain(processedPost.id);
      expect(processingQueue.map(p => p.id)).toContain(unprocessedPost.id);
    });
  });
});
```

---

## 📊 Phase 3: Advanced Features TDD Specifications

### Engagement Analytics Tests
```typescript
// tests/phase3-advanced-features/engagement/engagement-analytics.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { EngagementService } from '@/services/EngagementService';
import { AnalyticsService } from '@/services/AnalyticsService';
import { createTestUser, createTestPost } from '@/tests/utils/test-helpers';

describe('User Engagement Analytics', () => {
  let engagementService: EngagementService;
  let analyticsService: AnalyticsService;

  beforeEach(async () => {
    engagementService = new EngagementService();
    analyticsService = new AnalyticsService();
    await cleanupTestData();
  });

  describe('Real-time Tracking', () => {
    it('should track multiple engagement types', async () => {
      const user = await createTestUser();
      const post = await createTestPost();

      // Simulate user interactions
      await engagementService.trackEngagement(user.id, post.id, 'view');
      await engagementService.trackEngagement(user.id, post.id, 'click');
      await engagementService.trackEngagement(user.id, post.id, 'scroll_depth', { 
        depth: 0.75,
        timeSpent: 30000 
      });

      const analytics = await analyticsService.getPostAnalytics(post.id);

      expect(analytics.totalViews).toBe(1);
      expect(analytics.totalClicks).toBe(1);
      expect(analytics.averageScrollDepth).toBe(0.75);
      expect(analytics.averageTimeSpent).toBe(30000);
      expect(analytics.clickThroughRate).toBe(1.0); // 1 click / 1 view
    });

    it('should aggregate engagement data over time', async () => {
      const users = await Promise.all([
        createTestUser(),
        createTestUser(),
        createTestUser()
      ]);
      const post = await createTestPost();

      // Simulate engagement over time
      for (const user of users) {
        await engagementService.trackEngagement(user.id, post.id, 'view');
        await engagementService.trackEngagement(user.id, post.id, 'click');
      }

      // Add one more view without click
      await engagementService.trackEngagement(users[0].id, post.id, 'view');

      const analytics = await analyticsService.getPostAnalytics(post.id);

      expect(analytics.totalViews).toBe(4); // 3 initial + 1 additional
      expect(analytics.totalClicks).toBe(3);
      expect(analytics.uniqueViewers).toBe(3);
      expect(analytics.clickThroughRate).toBe(0.75); // 3 clicks / 4 views
    });

    it('should calculate engagement scores', async () => {
      const user = await createTestUser();
      const post = await createTestPost();

      // Simulate high engagement
      await engagementService.trackEngagement(user.id, post.id, 'view');
      await engagementService.trackEngagement(user.id, post.id, 'click');
      await engagementService.trackEngagement(user.id, post.id, 'scroll_depth', { depth: 0.9 });
      await engagementService.trackEngagement(user.id, post.id, 'time_spent', { duration: 120000 });

      const engagementScore = await analyticsService.calculateEngagementScore(post.id);

      expect(engagementScore).toBeGreaterThan(0.8); // High engagement threshold
      expect(engagementScore).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Analytics Dashboard Data', () => {
    it('should provide dashboard metrics', async () => {
      const user = await createTestUser();
      const posts = await Promise.all([
        createTestPost({ authorId: user.id }),
        createTestPost({ authorId: user.id }),
        createTestPost({ authorId: user.id })
      ]);

      // Simulate varying engagement levels
      for (const [index, post] of posts.entries()) {
        const viewCount = (index + 1) * 5; // 5, 10, 15 views
        const clickCount = (index + 1) * 2; // 2, 4, 6 clicks

        for (let i = 0; i < viewCount; i++) {
          await engagementService.trackEngagement(user.id, post.id, 'view');
        }
        for (let i = 0; i < clickCount; i++) {
          await engagementService.trackEngagement(user.id, post.id, 'click');
        }
      }

      const dashboardData = await analyticsService.getDashboardMetrics(user.id);

      expect(dashboardData.totalPosts).toBe(3);
      expect(dashboardData.totalViews).toBe(30); // 5 + 10 + 15
      expect(dashboardData.totalClicks).toBe(12); // 2 + 4 + 6
      expect(dashboardData.averageEngagementRate).toBeCloseTo(0.4); // 12/30
      expect(dashboardData.topPerformingPost.id).toBe(posts[2].id); // Highest engagement
    });

    it('should provide time-based analytics', async () => {
      const user = await createTestUser();
      const post = await createTestPost();

      // Simulate engagement over different time periods
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      await engagementService.trackEngagement(user.id, post.id, 'view', {}, oneWeekAgo);
      await engagementService.trackEngagement(user.id, post.id, 'view', {}, oneDayAgo);
      await engagementService.trackEngagement(user.id, post.id, 'view', {}, now);

      const weeklyAnalytics = await analyticsService.getTimeBasedAnalytics(post.id, '7d');
      const dailyAnalytics = await analyticsService.getTimeBasedAnalytics(post.id, '1d');

      expect(weeklyAnalytics.totalViews).toBe(3);
      expect(dailyAnalytics.totalViews).toBe(2); // Last day + today
    });
  });

  describe('Real-time Updates', () => {
    it('should broadcast analytics updates via WebSocket', (done) => {
      const io = require('socket.io-client');
      const socket = io('http://localhost:3000');

      socket.on('connect', async () => {
        const user = await createTestUser();
        const post = await createTestPost();

        socket.on('analytics_update', (data) => {
          expect(data.postId).toBe(post.id);
          expect(data.metrics).toHaveProperty('totalViews');
          expect(data.metrics).toHaveProperty('engagementRate');
          socket.disconnect();
          done();
        });

        // Trigger analytics update
        await engagementService.trackEngagement(user.id, post.id, 'view');
      });
    });

    it('should handle concurrent engagement tracking', async () => {
      const users = await Promise.all(
        Array.from({ length: 10 }, () => createTestUser())
      );
      const post = await createTestPost();

      // Simulate concurrent engagement
      const engagementPromises = users.map(user => 
        engagementService.trackEngagement(user.id, post.id, 'view')
      );

      await Promise.all(engagementPromises);

      const analytics = await analyticsService.getPostAnalytics(post.id);
      expect(analytics.totalViews).toBe(10);
      expect(analytics.uniqueViewers).toBe(10);
    });
  });
});
```

---

## 🚀 Test Execution with Swarm Coordination

### Swarm-Coordinated Test Execution Commands
```bash
# Execute Phase 1 tests with swarm coordination
mcp__claude-flow__task_orchestrate {
  task: "Execute Phase 1 TDD tests for foundation features",
  strategy: "parallel",
  priority: "critical",
  dependencies: ["database-setup", "test-environment"]
}

# Phase 2 core feature testing
mcp__claude-flow__task_orchestrate {
  task: "Execute Phase 2 TDD tests for threading and agent processing",
  strategy: "sequential",
  priority: "high", 
  dependencies: ["phase-1-completion"]
}

# Phase 3 advanced feature testing
mcp__claude-flow__task_orchestrate {
  task: "Execute Phase 3 TDD tests for analytics and real-time features",
  strategy: "adaptive",
  priority: "medium",
  dependencies: ["phase-2-completion"]
}

# Integration testing across all phases
mcp__claude-flow__task_orchestrate {
  task: "Execute comprehensive integration test suite",
  strategy: "parallel",
  priority: "critical",
  dependencies: ["all-phases-completion"]
}
```

### Test Execution Scripts
```json
{
  "scripts": {
    "test:phase1": "jest tests/phase1-foundation --coverage",
    "test:phase2": "jest tests/phase2-core-features --coverage",
    "test:phase3": "jest tests/phase3-advanced-features --coverage",
    "test:phase4": "jest tests/phase4-polish-integration --coverage",
    "test:integration": "jest tests/integration --coverage",
    "test:all": "jest --coverage --watchAll=false",
    "test:swarm": "npx claude-flow test-coordination --all-phases",
    "test:performance": "jest tests/**/*.perf.test.ts --testTimeout=60000",
    "test:e2e": "playwright test",
    "test:continuous": "jest --watch --coverage",
    "benchmark": "node tests/utils/performance-benchmarks.js"
  }
}
```

---

## 📊 Success Metrics & Coverage Targets

### Coverage Requirements per Phase:
- **Phase 1 (Foundation)**: 100% line coverage, 95% branch coverage
- **Phase 2 (Core Features)**: 100% line coverage, 98% branch coverage  
- **Phase 3 (Advanced Features)**: 95% line coverage, 90% branch coverage
- **Phase 4 (Polish & Integration)**: 90% line coverage, 85% branch coverage
- **Overall Target**: 97% line coverage, 92% branch coverage

### Performance Benchmarks:
- Database queries: < 50ms average
- API endpoints: < 200ms response time
- Real-time updates: < 100ms latency
- Search operations: < 500ms for complex queries
- Page loads: < 2 seconds initial load

### Test Execution Metrics:
- Phase 1: ~200 tests, 5-8 minutes execution time
- Phase 2: ~300 tests, 8-12 minutes execution time  
- Phase 3: ~250 tests, 10-15 minutes execution time
- Phase 4: ~150 tests, 5-8 minutes execution time
- Integration: ~100 tests, 15-20 minutes execution time
- **Total: ~1000+ tests, 45-60 minutes full suite**

---

*TDD Structure Created: August 18, 2025*  
*Total Test Cases: 1000+*  
*Coverage Target: 97% line, 92% branch*  
*Estimated Test Development Time: 2 weeks parallel to implementation*