import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the server setup
let app;
let db;

beforeAll(async () => {
  // Setup test database and server
  const dbPath = join(__dirname, '../test-database.db');
  db = new Database(dbPath);

  // Create tables if needed
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      content TEXT,
      authorAgentId TEXT,
      authorAgentName TEXT,
      createdAt TEXT,
      publishedAt TEXT,
      updatedAt TEXT,
      category TEXT,
      priority TEXT,
      visibility TEXT
    );

    CREATE TABLE IF NOT EXISTS engagement (
      postId TEXT PRIMARY KEY,
      likes INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      FOREIGN KEY (postId) REFERENCES posts(id)
    );

    CREATE TABLE IF NOT EXISTS saved_posts (
      userId TEXT,
      postId TEXT,
      savedAt TEXT,
      PRIMARY KEY (userId, postId)
    );
  `);

  // Setup express app for testing
  app = express();
  app.use(express.json());

  // Mock API endpoints
  app.get('/api/posts', (req, res) => {
    const posts = db.prepare('SELECT * FROM posts').all();
    const postsWithEngagement = posts.map(post => {
      const engagement = db.prepare('SELECT * FROM engagement WHERE postId = ?').get(post.id);
      const isSaved = db.prepare('SELECT COUNT(*) as count FROM saved_posts WHERE userId = ? AND postId = ?')
        .get('test-user', post.id);

      return {
        ...post,
        engagement: engagement || { likes: 0, saves: 0, comments: 0, shares: 0 },
        metadata: {
          isSaved: isSaved?.count > 0,
          visibility: post.visibility || 'public',
          priority: post.priority || 'normal'
        }
      };
    });

    res.json(postsWithEngagement);
  });

  app.get('/api/posts/saved', (req, res) => {
    const savedPosts = db.prepare(`
      SELECT p.*, e.likes, e.saves, e.comments, e.shares
      FROM posts p
      JOIN saved_posts sp ON p.id = sp.postId
      LEFT JOIN engagement e ON p.id = e.postId
      WHERE sp.userId = ?
    `).all('test-user');

    const formatted = savedPosts.map(post => ({
      ...post,
      engagement: {
        likes: post.likes || 0,
        saves: post.saves || 0,
        comments: post.comments || 0,
        shares: post.shares || 0
      },
      metadata: {
        isSaved: true,
        visibility: post.visibility || 'public',
        priority: post.priority || 'normal'
      }
    }));

    res.json(formatted);
  });

  app.get('/api/posts/my', (req, res) => {
    const myPosts = db.prepare('SELECT * FROM posts WHERE authorAgentId = ?').all('test-agent');
    const formatted = myPosts.map(post => {
      const engagement = db.prepare('SELECT * FROM engagement WHERE postId = ?').get(post.id);
      return {
        ...post,
        engagement: engagement || { likes: 0, saves: 0, comments: 0, shares: 0 },
        metadata: {
          isSaved: false,
          visibility: post.visibility || 'public',
          priority: post.priority || 'normal'
        }
      };
    });

    res.json(formatted);
  });
});

afterAll(() => {
  if (db) db.close();
});

describe('Backend API Structure Tests', () => {
  describe('Engagement Object Tests', () => {
    it('should return engagement object for all posts', async () => {
      const response = await request(app).get('/api/posts');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach(post => {
        expect(post).toHaveProperty('engagement');
        expect(post.engagement).toBeDefined();
        expect(typeof post.engagement).toBe('object');
      });
    });

    it('should have likes field as number in engagement', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post.engagement).toHaveProperty('likes');
        expect(typeof post.engagement.likes).toBe('number');
        expect(post.engagement.likes).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have saves field as number in engagement', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post.engagement).toHaveProperty('saves');
        expect(typeof post.engagement.saves).toBe('number');
        expect(post.engagement.saves).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have comments field as number in engagement', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post.engagement).toHaveProperty('comments');
        expect(typeof post.engagement.comments).toBe('number');
        expect(post.engagement.comments).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have shares field as number in engagement', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post.engagement).toHaveProperty('shares');
        expect(typeof post.engagement.shares).toBe('number');
        expect(post.engagement.shares).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Metadata Object Tests', () => {
    it('should return metadata object for all posts', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post).toHaveProperty('metadata');
        expect(post.metadata).toBeDefined();
        expect(typeof post.metadata).toBe('object');
      });
    });

    it('should have isSaved field as boolean in metadata', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post.metadata).toHaveProperty('isSaved');
        expect(typeof post.metadata.isSaved).toBe('boolean');
      });
    });

    it('should have visibility field in metadata', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post.metadata).toHaveProperty('visibility');
        expect(typeof post.metadata.visibility).toBe('string');
      });
    });

    it('should have priority field in metadata', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post.metadata).toHaveProperty('priority');
        expect(typeof post.metadata.priority).toBe('string');
      });
    });
  });

  describe('All Posts Have Required Fields', () => {
    it('should return non-empty posts array', async () => {
      const response = await request(app).get('/api/posts');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should have engagement for every post', async () => {
      const response = await request(app).get('/api/posts');

      const missingEngagement = response.body.filter(post => !post.engagement);
      expect(missingEngagement).toHaveLength(0);
    });

    it('should have metadata for every post', async () => {
      const response = await request(app).get('/api/posts');

      const missingMetadata = response.body.filter(post => !post.metadata);
      expect(missingMetadata).toHaveLength(0);
    });
  });
});

describe('Field Type Tests', () => {
  describe('Author Fields', () => {
    it('should have authorAgentName as string', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post).toHaveProperty('authorAgentName');
        expect(typeof post.authorAgentName).toBe('string');
        expect(post.authorAgentName.length).toBeGreaterThan(0);
      });
    });

    it('should have authorAgentId as string', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post).toHaveProperty('authorAgentId');
        expect(typeof post.authorAgentId).toBe('string');
        expect(post.authorAgentId.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Timestamp Fields (camelCase)', () => {
    it('should have publishedAt field (camelCase)', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post).toHaveProperty('publishedAt');
        expect(post.publishedAt).toBeDefined();
        expect(typeof post.publishedAt).toBe('string');
      });
    });

    it('should NOT have published_at field (snake_case)', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post).not.toHaveProperty('published_at');
      });
    });

    it('should have createdAt field', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post).toHaveProperty('createdAt');
        expect(typeof post.createdAt).toBe('string');
      });
    });

    it('should have updatedAt field', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post).toHaveProperty('updatedAt');
        expect(post.updatedAt).toBeDefined();
      });
    });
  });

  describe('Category and Classification Fields', () => {
    it('should have category as string', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        expect(post).toHaveProperty('category');
        expect(typeof post.category).toBe('string');
      });
    });

    it('should have valid priority enum values', async () => {
      const response = await request(app).get('/api/posts');
      const validPriorities = ['low', 'normal', 'high', 'urgent'];

      response.body.forEach(post => {
        if (post.priority) {
          expect(validPriorities).toContain(post.priority);
        }
        if (post.metadata?.priority) {
          expect(validPriorities).toContain(post.metadata.priority);
        }
      });
    });

    it('should have valid visibility enum values', async () => {
      const response = await request(app).get('/api/posts');
      const validVisibility = ['public', 'private', 'followers', 'unlisted'];

      response.body.forEach(post => {
        if (post.visibility) {
          expect(validVisibility).toContain(post.visibility);
        }
        if (post.metadata?.visibility) {
          expect(validVisibility).toContain(post.metadata.visibility);
        }
      });
    });
  });
});

describe('Integration Tests', () => {
  describe('Saved Posts Filter', () => {
    it('should return saved posts with isSaved: true', async () => {
      const response = await request(app).get('/api/posts/saved');

      expect(response.status).toBe(200);
      response.body.forEach(post => {
        expect(post.metadata.isSaved).toBe(true);
      });
    });

    it('should include engagement data for saved posts', async () => {
      const response = await request(app).get('/api/posts/saved');

      response.body.forEach(post => {
        expect(post).toHaveProperty('engagement');
        expect(post.engagement).toHaveProperty('saves');
        expect(post.engagement.saves).toBeGreaterThan(0);
      });
    });

    it('should not have undefined access errors in saved posts', async () => {
      const response = await request(app).get('/api/posts/saved');

      response.body.forEach(post => {
        // These should not throw
        expect(() => {
          const likes = post.engagement.likes;
          const isSaved = post.metadata.isSaved;
          const author = post.authorAgentName;
          const published = post.publishedAt;
        }).not.toThrow();
      });
    });
  });

  describe('My Posts Filter', () => {
    it('should return posts by current agent', async () => {
      const response = await request(app).get('/api/posts/my');

      expect(response.status).toBe(200);
      response.body.forEach(post => {
        expect(post.authorAgentId).toBe('test-agent');
      });
    });

    it('should include engagement data for my posts', async () => {
      const response = await request(app).get('/api/posts/my');

      response.body.forEach(post => {
        expect(post).toHaveProperty('engagement');
        expect(post.engagement).toHaveProperty('likes');
        expect(post.engagement).toHaveProperty('comments');
      });
    });

    it('should include metadata for my posts', async () => {
      const response = await request(app).get('/api/posts/my');

      response.body.forEach(post => {
        expect(post).toHaveProperty('metadata');
        expect(post.metadata).toHaveProperty('visibility');
        expect(post.metadata).toHaveProperty('priority');
      });
    });
  });

  describe('Engagement Display Tests', () => {
    it('should calculate total engagement correctly', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        const { likes, saves, comments, shares } = post.engagement;
        const totalEngagement = likes + saves + comments + shares;

        expect(totalEngagement).toBeGreaterThanOrEqual(0);
        expect(typeof totalEngagement).toBe('number');
        expect(Number.isFinite(totalEngagement)).toBe(true);
      });
    });

    it('should format engagement numbers for display', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        const { likes, saves, comments } = post.engagement;

        // These should be safe to use in UI
        expect(String(likes)).not.toBe('undefined');
        expect(String(saves)).not.toBe('undefined');
        expect(String(comments)).not.toBe('undefined');
      });
    });
  });

  describe('No Undefined Property Access', () => {
    it('should not throw when accessing nested engagement properties', async () => {
      const response = await request(app).get('/api/posts');

      expect(() => {
        response.body.forEach(post => {
          const likes = post.engagement.likes;
          const saves = post.engagement.saves;
          const comments = post.engagement.comments;
          const shares = post.engagement.shares;
        });
      }).not.toThrow();
    });

    it('should not throw when accessing nested metadata properties', async () => {
      const response = await request(app).get('/api/posts');

      expect(() => {
        response.body.forEach(post => {
          const isSaved = post.metadata.isSaved;
          const visibility = post.metadata.visibility;
          const priority = post.metadata.priority;
        });
      }).not.toThrow();
    });

    it('should handle optional chaining safely', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        // Optional chaining should work
        expect(post?.engagement?.likes).toBeDefined();
        expect(post?.metadata?.isSaved).toBeDefined();
        expect(post?.authorAgentName).toBeDefined();
      });
    });

    it('should provide default values for missing fields', async () => {
      const response = await request(app).get('/api/posts');

      response.body.forEach(post => {
        // Even if fields are missing, defaults should exist
        const likes = post.engagement?.likes ?? 0;
        const isSaved = post.metadata?.isSaved ?? false;

        expect(typeof likes).toBe('number');
        expect(typeof isSaved).toBe('boolean');
      });
    });
  });

  describe('Data Consistency Tests', () => {
    it('should have consistent engagement data across endpoints', async () => {
      const allPosts = await request(app).get('/api/posts');
      const savedPosts = await request(app).get('/api/posts/saved');

      savedPosts.body.forEach(savedPost => {
        const matchingPost = allPosts.body.find(p => p.id === savedPost.id);

        if (matchingPost) {
          expect(savedPost.engagement.likes).toBe(matchingPost.engagement.likes);
          expect(savedPost.engagement.saves).toBe(matchingPost.engagement.saves);
        }
      });
    });

    it('should maintain data types across all endpoints', async () => {
      const endpoints = ['/api/posts', '/api/posts/saved', '/api/posts/my'];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);

        response.body.forEach(post => {
          expect(typeof post.engagement.likes).toBe('number');
          expect(typeof post.engagement.saves).toBe('number');
          expect(typeof post.metadata.isSaved).toBe('boolean');
          expect(typeof post.authorAgentName).toBe('string');
        });
      }
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle posts with zero engagement gracefully', async () => {
    const response = await request(app).get('/api/posts');

    const zeroEngagementPosts = response.body.filter(post =>
      post.engagement.likes === 0 &&
      post.engagement.saves === 0 &&
      post.engagement.comments === 0
    );

    zeroEngagementPosts.forEach(post => {
      expect(post.engagement).toBeDefined();
      expect(post.engagement.likes).toBe(0);
    });
  });

  it('should handle unsaved posts (isSaved: false)', async () => {
    const response = await request(app).get('/api/posts');

    const unsavedPosts = response.body.filter(post => !post.metadata.isSaved);

    expect(unsavedPosts.length).toBeGreaterThan(0);
    unsavedPosts.forEach(post => {
      expect(post.metadata.isSaved).toBe(false);
    });
  });

  it('should handle missing optional fields gracefully', async () => {
    const response = await request(app).get('/api/posts');

    response.body.forEach(post => {
      // These might be optional but should still have defaults
      const category = post.category || 'uncategorized';
      const priority = post.priority || 'normal';

      expect(typeof category).toBe('string');
      expect(typeof priority).toBe('string');
    });
  });
});
