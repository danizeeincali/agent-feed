/**
 * TDD Unit Tests: User Name Display System (Backend)
 *
 * Tests the backend API and database operations for user display names:
 * - user_settings table returns correct display name
 * - Comment creation stores author_user_id
 * - Comment queries join with user_settings
 * - Display names returned in API responses
 * - Migration script functionality
 *
 * Test Coverage: 30 tests
 */

const { describe, it, expect, beforeEach, afterEach, vi } = require('@jest/globals');
const Database = require('better-sqlite3');
const { createUserSettingsService } = require('../../services/user-settings-service');

describe('User Name Display System - Backend', () => {
  let db;
  let userSettingsService;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');

    // Create user_settings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        display_name TEXT,
        display_name_style TEXT,
        onboarding_completed INTEGER DEFAULT 0,
        onboarding_completed_at TEXT,
        profile_json TEXT DEFAULT '{}',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create comments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT,
        author_user_id TEXT,
        parent_id TEXT,
        depth INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    userSettingsService = createUserSettingsService(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('user_settings Table Operations', () => {
    it('should return "Woz" for demo-user-123', () => {
      // Arrange
      db.prepare(`
        INSERT INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `).run('demo-user-123', 'Woz');

      // Act
      const settings = userSettingsService.getUserSettings('demo-user-123');

      // Assert
      expect(settings).toBeDefined();
      expect(settings.display_name).toBe('Woz');
      expect(settings.user_id).toBe('demo-user-123');
    });

    it('should return null when user settings not found', () => {
      // Act
      const settings = userSettingsService.getUserSettings('non-existent-user');

      // Assert
      expect(settings).toBeNull();
    });

    it('should retrieve display_name field correctly', () => {
      // Arrange
      db.prepare(`
        INSERT INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `).run('test-user', 'TestName');

      // Act
      const settings = userSettingsService.getUserSettings('test-user');

      // Assert
      expect(settings.display_name).toBe('TestName');
    });

    it('should retrieve all user settings fields', () => {
      // Arrange
      db.prepare(`
        INSERT INTO user_settings (
          user_id,
          display_name,
          display_name_style,
          onboarding_completed,
          profile_json
        )
        VALUES (?, ?, ?, ?, ?)
      `).run('test-user', 'Test User', 'bold', 1, '{"role": "developer"}');

      // Act
      const settings = userSettingsService.getUserSettings('test-user');

      // Assert
      expect(settings.user_id).toBe('test-user');
      expect(settings.display_name).toBe('Test User');
      expect(settings.display_name_style).toBe('bold');
      expect(settings.onboarding_completed).toBe(1);
      expect(settings.profile_json).toEqual({ role: 'developer' });
    });

    it('should handle special characters in display names', () => {
      // Arrange
      const specialName = "O'Brien";
      db.prepare(`
        INSERT INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `).run('test-user', specialName);

      // Act
      const settings = userSettingsService.getUserSettings('test-user');

      // Assert
      expect(settings.display_name).toBe(specialName);
    });

    it('should handle unicode characters in display names', () => {
      // Arrange
      const unicodeName = '用户名 👤';
      db.prepare(`
        INSERT INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `).run('test-user', unicodeName);

      // Act
      const settings = userSettingsService.getUserSettings('test-user');

      // Assert
      expect(settings.display_name).toBe(unicodeName);
    });
  });

  describe('Comment Creation with author_user_id', () => {
    it('should store author_user_id when creating comment', () => {
      // Arrange & Act
      const result = db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('comment-1', 'post-1', 'Test comment', 'User', 'demo-user-123');

      // Assert
      expect(result.changes).toBe(1);

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('comment-1');
      expect(comment.author_user_id).toBe('demo-user-123');
    });

    it('should allow null author_user_id for agent comments', () => {
      // Arrange & Act
      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('comment-1', 'post-1', 'Agent comment', 'lambda-vi', null);

      // Assert
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('comment-1');
      expect(comment.author).toBe('lambda-vi');
      expect(comment.author_user_id).toBeNull();
    });

    it('should store both author and author_user_id fields', () => {
      // Arrange & Act
      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('comment-1', 'post-1', 'Comment', 'Fallback Name', 'user-123');

      // Assert
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('comment-1');
      expect(comment.author).toBe('Fallback Name');
      expect(comment.author_user_id).toBe('user-123');
    });

    it('should handle comments without author_user_id (legacy format)', () => {
      // Arrange & Act
      db.prepare(`
        INSERT INTO comments (id, post_id, content, author)
        VALUES (?, ?, ?, ?)
      `).run('comment-1', 'post-1', 'Old comment', 'OldUser');

      // Assert
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('comment-1');
      expect(comment.author).toBe('OldUser');
      expect(comment.author_user_id).toBeNull();
    });
  });

  describe('Comment Queries with user_settings Join', () => {
    beforeEach(() => {
      // Insert test user settings
      db.prepare(`
        INSERT INTO user_settings (user_id, display_name)
        VALUES (?, ?), (?, ?)
      `).run('demo-user-123', 'Woz', 'user-456', 'Alice');
    });

    it('should join comments with user_settings', () => {
      // Arrange
      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('comment-1', 'post-1', 'Test', 'User', 'demo-user-123');

      // Act
      const comment = db.prepare(`
        SELECT
          c.*,
          us.display_name
        FROM comments c
        LEFT JOIN user_settings us ON c.author_user_id = us.user_id
        WHERE c.id = ?
      `).get('comment-1');

      // Assert
      expect(comment.display_name).toBe('Woz');
      expect(comment.author_user_id).toBe('demo-user-123');
    });

    it('should handle LEFT JOIN when author_user_id is null', () => {
      // Arrange
      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('comment-1', 'post-1', 'Agent comment', 'lambda-vi', null);

      // Act
      const comment = db.prepare(`
        SELECT
          c.*,
          us.display_name
        FROM comments c
        LEFT JOIN user_settings us ON c.author_user_id = us.user_id
        WHERE c.id = ?
      `).get('comment-1');

      // Assert
      expect(comment.author).toBe('lambda-vi');
      expect(comment.display_name).toBeNull();
    });

    it('should return multiple comments with display names', () => {
      // Arrange
      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_user_id)
        VALUES
          (?, ?, ?, ?, ?),
          (?, ?, ?, ?, ?)
      `).run(
        'comment-1', 'post-1', 'Comment 1', 'User', 'demo-user-123',
        'comment-2', 'post-1', 'Comment 2', 'User', 'user-456'
      );

      // Act
      const comments = db.prepare(`
        SELECT
          c.*,
          us.display_name
        FROM comments c
        LEFT JOIN user_settings us ON c.author_user_id = us.user_id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
      `).all('post-1');

      // Assert
      expect(comments).toHaveLength(2);
      expect(comments[0].display_name).toBe('Woz');
      expect(comments[1].display_name).toBe('Alice');
    });

    it('should handle mixed user and agent comments', () => {
      // Arrange
      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_user_id)
        VALUES
          (?, ?, ?, ?, ?),
          (?, ?, ?, ?, ?)
      `).run(
        'comment-1', 'post-1', 'User comment', 'User', 'demo-user-123',
        'comment-2', 'post-1', 'Agent comment', 'lambda-vi', null
      );

      // Act
      const comments = db.prepare(`
        SELECT
          c.*,
          us.display_name,
          COALESCE(us.display_name, c.author) as effective_author
        FROM comments c
        LEFT JOIN user_settings us ON c.author_user_id = us.user_id
        WHERE c.post_id = ?
      `).all('post-1');

      // Assert
      expect(comments[0].effective_author).toBe('Woz');
      expect(comments[1].effective_author).toBe('lambda-vi');
    });
  });

  describe('API Response Format', () => {
    it('should include display_name in comment response', () => {
      // Arrange
      db.prepare(`
        INSERT INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `).run('demo-user-123', 'Woz');

      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('comment-1', 'post-1', 'Test', 'User', 'demo-user-123');

      // Act
      const result = db.prepare(`
        SELECT
          c.id,
          c.content,
          c.author,
          c.author_user_id,
          us.display_name
        FROM comments c
        LEFT JOIN user_settings us ON c.author_user_id = us.user_id
        WHERE c.id = ?
      `).get('comment-1');

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: 'comment-1',
        content: 'Test',
        author: 'User',
        author_user_id: 'demo-user-123',
        display_name: 'Woz'
      }));
    });

    it('should return null display_name for agents', () => {
      // Arrange
      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('comment-1', 'post-1', 'Agent', 'lambda-vi', null);

      // Act
      const result = db.prepare(`
        SELECT
          c.*,
          us.display_name
        FROM comments c
        LEFT JOIN user_settings us ON c.author_user_id = us.user_id
        WHERE c.id = ?
      `).get('comment-1');

      // Assert
      expect(result.author).toBe('lambda-vi');
      expect(result.display_name).toBeNull();
    });

    it('should include all comment fields in response', () => {
      // Arrange
      db.prepare(`
        INSERT INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `).run('demo-user-123', 'Woz');

      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_user_id, parent_id, depth)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('comment-1', 'post-1', 'Test', 'User', 'demo-user-123', null, 0);

      // Act
      const result = db.prepare(`
        SELECT
          c.id,
          c.post_id,
          c.content,
          c.author,
          c.author_user_id,
          c.parent_id,
          c.depth,
          c.created_at,
          us.display_name
        FROM comments c
        LEFT JOIN user_settings us ON c.author_user_id = us.user_id
        WHERE c.id = ?
      `).get('comment-1');

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('post_id');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('author');
      expect(result).toHaveProperty('author_user_id');
      expect(result).toHaveProperty('parent_id');
      expect(result).toHaveProperty('depth');
      expect(result).toHaveProperty('created_at');
      expect(result).toHaveProperty('display_name');
    });
  });

  describe('User Settings Service', () => {
    it('should create user settings with display name', () => {
      // Act
      const settings = userSettingsService.updateUserSettings('new-user', {
        display_name: 'NewUser'
      });

      // Assert
      expect(settings).toBeDefined();
      expect(settings.display_name).toBe('NewUser');
      expect(settings.user_id).toBe('new-user');
    });

    it('should update existing display name', () => {
      // Arrange
      userSettingsService.updateUserSettings('test-user', {
        display_name: 'OldName'
      });

      // Act
      const updated = userSettingsService.updateUserSettings('test-user', {
        display_name: 'NewName'
      });

      // Assert
      expect(updated.display_name).toBe('NewName');
    });

    it('should retrieve display name only', () => {
      // Arrange
      userSettingsService.updateUserSettings('test-user', {
        display_name: 'TestName'
      });

      // Act
      const displayName = userSettingsService.getDisplayName('test-user');

      // Assert
      expect(displayName).toBe('TestName');
    });

    it('should return null for non-existent user display name', () => {
      // Act
      const displayName = userSettingsService.getDisplayName('non-existent');

      // Assert
      expect(displayName).toBeNull();
    });

    it('should set display name for existing user', () => {
      // Arrange
      userSettingsService.updateUserSettings('test-user', {
        display_name: 'OldName'
      });

      // Act
      const updated = userSettingsService.setDisplayName('test-user', 'UpdatedName');

      // Assert
      expect(updated.display_name).toBe('UpdatedName');
    });
  });

  describe('Migration Compatibility', () => {
    it('should handle comments without author_user_id (pre-migration)', () => {
      // Arrange - Insert old-style comment
      db.prepare(`
        INSERT INTO comments (id, post_id, content, author)
        VALUES (?, ?, ?, ?)
      `).run('old-comment', 'post-1', 'Old comment', 'OldUser');

      // Act
      const comment = db.prepare(`
        SELECT
          c.*,
          us.display_name,
          COALESCE(us.display_name, c.author) as effective_author
        FROM comments c
        LEFT JOIN user_settings us ON c.author_user_id = us.user_id
        WHERE c.id = ?
      `).get('old-comment');

      // Assert
      expect(comment.author).toBe('OldUser');
      expect(comment.author_user_id).toBeNull();
      expect(comment.effective_author).toBe('OldUser');
    });

    it('should handle comments with author_user_id (post-migration)', () => {
      // Arrange
      db.prepare(`
        INSERT INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `).run('user-123', 'RealName');

      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('new-comment', 'post-1', 'New comment', 'Fallback', 'user-123');

      // Act
      const comment = db.prepare(`
        SELECT
          c.*,
          us.display_name,
          COALESCE(us.display_name, c.author) as effective_author
        FROM comments c
        LEFT JOIN user_settings us ON c.author_user_id = us.user_id
        WHERE c.id = ?
      `).get('new-comment');

      // Assert
      expect(comment.author).toBe('Fallback');
      expect(comment.author_user_id).toBe('user-123');
      expect(comment.effective_author).toBe('RealName');
    });

    it('should correctly process mixed old and new comments', () => {
      // Arrange
      db.prepare(`
        INSERT INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `).run('user-123', 'ModernUser');

      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_user_id)
        VALUES
          (?, ?, ?, ?, ?),
          (?, ?, ?, ?, ?)
      `).run(
        'old-comment', 'post-1', 'Old', 'LegacyUser', null,
        'new-comment', 'post-1', 'New', 'Fallback', 'user-123'
      );

      // Act
      const comments = db.prepare(`
        SELECT
          c.*,
          us.display_name,
          COALESCE(us.display_name, c.author) as effective_author
        FROM comments c
        LEFT JOIN user_settings us ON c.author_user_id = us.user_id
        WHERE c.post_id = ?
      `).all('post-1');

      // Assert
      expect(comments[0].effective_author).toBe('LegacyUser');
      expect(comments[1].effective_author).toBe('ModernUser');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty display name', () => {
      // Arrange
      db.prepare(`
        INSERT INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `).run('test-user', '');

      // Act
      const settings = userSettingsService.getUserSettings('test-user');

      // Assert
      expect(settings.display_name).toBe('');
    });

    it('should handle very long display names', () => {
      // Arrange
      const longName = 'A'.repeat(200);
      db.prepare(`
        INSERT INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `).run('test-user', longName);

      // Act
      const settings = userSettingsService.getUserSettings('test-user');

      // Assert
      expect(settings.display_name).toBe(longName);
      expect(settings.display_name.length).toBe(200);
    });

    it('should handle SQL injection attempts in display name', () => {
      // Arrange
      const maliciousName = "'; DROP TABLE user_settings; --";

      // Act
      const settings = userSettingsService.updateUserSettings('test-user', {
        display_name: maliciousName
      });

      // Assert - Should store safely without executing SQL
      expect(settings.display_name).toBe(maliciousName);

      // Verify table still exists
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'
      `).get();
      expect(tableExists).toBeDefined();
    });

    it('should handle null values in profile_json', () => {
      // Act
      const settings = userSettingsService.updateUserSettings('test-user', {
        display_name: 'TestUser',
        profile_json: null
      });

      // Assert
      expect(settings.display_name).toBe('TestUser');
    });
  });
});
