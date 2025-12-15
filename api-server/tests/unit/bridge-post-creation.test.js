/**
 * Test: Bridge to Post Creation
 * Validates that Hemingway Bridges automatically create agent posts
 */

const Database = require('better-sqlite3');
const { createHemingwayBridgeService } = require('../../services/engagement/hemingway-bridge-service.js');

describe('Hemingway Bridge Post Creation', () => {
  let db;
  let bridgeService;
  const testUserId = 'test-user-bridge-posts';

  beforeAll(() => {
    // Use in-memory database for testing
    db = new Database(':memory:');

    // Create necessary tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS hemingway_bridges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        bridge_type TEXT NOT NULL,
        content TEXT NOT NULL,
        priority INTEGER NOT NULL,
        post_id TEXT,
        agent_id TEXT,
        action TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        completed_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS agent_posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        authorAgent TEXT NOT NULL,
        publishedAt TEXT NOT NULL,
        metadata TEXT NOT NULL,
        engagement TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY
      );
    `);

    // Insert test user
    db.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').run(testUserId);

    bridgeService = createHemingwayBridgeService(db);
  });

  afterAll(() => {
    db.close();
  });

  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM hemingway_bridges WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM agent_posts WHERE authorAgent = ? OR authorAgent = ?').run('system', 'test-agent');
  });

  describe('createBridgePost', () => {
    test('should create agent post from bridge', async () => {
      // Create a bridge manually (without auto post creation)
      const bridge = await bridgeService.createBridge({
        userId: testUserId,
        type: 'question',
        content: 'What is your favorite programming language?',
        priority: 3,
        agentId: 'test-agent',
        createPost: false
      });

      expect(bridge).toBeDefined();
      expect(bridge.id).toBeDefined();
      expect(bridge.post_id).toBeNull();

      // Now create post from bridge
      const post = await bridgeService.createBridgePost(bridge);

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.content).toBe(bridge.content);
      expect(post.authorAgent).toBe('test-agent');

      // Verify metadata contains bridge info
      const metadata = JSON.parse(post.metadata);
      expect(metadata.isBridge).toBe(true);
      expect(metadata.bridgeId).toBe(bridge.id);
      expect(metadata.bridgeType).toBe('question');
      expect(metadata.bridgePriority).toBe(3);

      // Verify bridge was updated with post_id
      const updatedBridge = bridgeService.getBridgeById(bridge.id);
      expect(updatedBridge.post_id).toBe(post.id);
    });

    test('should not create duplicate post for bridge', async () => {
      // Create bridge with auto post creation
      const bridge = await bridgeService.createBridge({
        userId: testUserId,
        type: 'insight',
        content: 'Did you know TypeScript improves code quality?',
        priority: 5,
        agentId: 'system'
      });

      expect(bridge.post_id).toBeDefined();
      const firstPostId = bridge.post_id;

      // Try to create post again
      const result = await bridgeService.createBridgePost(bridge);
      expect(result.alreadyExists).toBe(true);
      expect(result.id).toBe(firstPostId);

      // Verify only one post exists
      const posts = db.prepare('SELECT * FROM agent_posts WHERE id = ?').all(firstPostId);
      expect(posts.length).toBe(1);
    });

    test('should use system as default agent when no agent_id provided', async () => {
      const bridge = await bridgeService.createBridge({
        userId: testUserId,
        type: 'question',
        content: 'Generic question without agent',
        priority: 4
      });

      expect(bridge.post_id).toBeDefined();

      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(bridge.post_id);
      expect(post.authorAgent).toBe('system');
    });

    test('should extract title from content', async () => {
      const multilineContent = `First line becomes title
      Second line is part of content
      Third line too`;

      const bridge = await bridgeService.createBridge({
        userId: testUserId,
        type: 'new_feature',
        content: multilineContent,
        priority: 2,
        agentId: 'test-agent'
      });

      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(bridge.post_id);
      expect(post.title).toBe('First line becomes title');
      expect(post.content).toBe(multilineContent);
    });
  });

  describe('createBridge with auto post creation', () => {
    test('should automatically create post when bridge is active', async () => {
      const bridge = await bridgeService.createBridge({
        userId: testUserId,
        type: 'continue_thread',
        content: 'Your post is being reviewed by agents!',
        priority: 1,
        agentId: 'system'
      });

      // Bridge should be active by default
      expect(bridge.active).toBe(1);

      // Post should be automatically created
      expect(bridge.post_id).toBeDefined();
      expect(bridge.post_id).not.toBeNull();

      // Verify post exists in database
      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(bridge.post_id);
      expect(post).toBeDefined();
      expect(post.content).toBe(bridge.content);
      expect(post.authorAgent).toBe('system');
    });

    test('should respect createPost=false flag', async () => {
      const bridge = await bridgeService.createBridge({
        userId: testUserId,
        type: 'insight',
        content: 'Test insight without post',
        priority: 4,
        agentId: 'test-agent',
        createPost: false
      });

      expect(bridge.active).toBe(1);
      expect(bridge.post_id).toBeNull();

      // Verify no post was created
      const posts = db.prepare('SELECT * FROM agent_posts WHERE authorAgent = ?').all('test-agent');
      expect(posts.length).toBe(0);
    });
  });

  describe('ensureBridgeExists with post creation', () => {
    test('should create post for existing bridge without post_id', async () => {
      // Create bridge without post
      const bridge = await bridgeService.createBridge({
        userId: testUserId,
        type: 'question',
        content: 'Bridge without post',
        priority: 3,
        agentId: 'system',
        createPost: false
      });

      expect(bridge.post_id).toBeNull();

      // Call ensureBridgeExists
      const ensuredBridge = await bridgeService.ensureBridgeExists(testUserId);

      expect(ensuredBridge.id).toBe(bridge.id);
      expect(ensuredBridge.post_id).toBeDefined();
      expect(ensuredBridge.post_id).not.toBeNull();
    });

    test('should create new bridge with post when none exist', async () => {
      // Ensure no bridges exist
      db.prepare('DELETE FROM hemingway_bridges WHERE user_id = ?').run(testUserId);

      const bridge = await bridgeService.ensureBridgeExists(testUserId);

      expect(bridge).toBeDefined();
      expect(bridge.user_id).toBe(testUserId);
      expect(bridge.active).toBe(1);
      expect(bridge.post_id).toBeDefined();

      // Verify post exists
      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(bridge.post_id);
      expect(post).toBeDefined();
    });
  });

  describe('Post content and metadata', () => {
    test('should include correct engagement data', async () => {
      const bridge = await bridgeService.createBridge({
        userId: testUserId,
        type: 'new_feature',
        content: 'Check out this new feature!',
        priority: 2,
        agentId: 'test-agent'
      });

      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(bridge.post_id);
      const engagement = JSON.parse(post.engagement);

      expect(engagement.comments).toBe(0);
      expect(engagement.likes).toBe(0);
      expect(engagement.shares).toBe(0);
    });

    test('should store all bridge metadata', async () => {
      const bridge = await bridgeService.createBridge({
        userId: testUserId,
        type: 'next_step',
        content: 'Complete onboarding step 2',
        priority: 2,
        agentId: 'onboarding-agent',
        action: 'trigger_step2'
      });

      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(bridge.post_id);
      const metadata = JSON.parse(post.metadata);

      expect(metadata.isBridge).toBe(true);
      expect(metadata.bridgeId).toBe(bridge.id);
      expect(metadata.bridgeType).toBe('next_step');
      expect(metadata.bridgePriority).toBe(2);
      expect(metadata.bridgeAction).toBe('trigger_step2');
    });
  });
});
