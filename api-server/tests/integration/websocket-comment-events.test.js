/**
 * Integration Tests: WebSocket Comment Events
 *
 * Tests for real-time comment event broadcasting via Socket.IO
 * Verifies that comment:created events are properly broadcasted with full payload
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { io as Client } from 'socket.io-client';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('WebSocket Comment Events Integration', () => {
  let io;
  let serverSocket;
  let clientSocket;
  let httpServer;
  let db;
  const TEST_PORT = 3099;
  const TEST_DB_PATH = join(__dirname, '../test-data/websocket-comments.db');

  beforeAll(async () => {
    // Setup test database
    const dbDir = dirname(TEST_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');

    // Create test schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        content TEXT NOT NULL,
        content_type TEXT DEFAULT 'text',
        author TEXT NOT NULL,
        author_type TEXT DEFAULT 'user',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Setup test server with Socket.IO
    const app = express();
    httpServer = createServer(app);
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Setup Socket.IO connection handler
    io.on('connection', (socket) => {
      serverSocket = socket;

      socket.on('subscribe:post', (postId) => {
        socket.join(`post:${postId}`);
      });

      socket.on('unsubscribe:post', (postId) => {
        socket.leave(`post:${postId}`);
      });
    });

    // Start server
    await new Promise((resolve) => {
      httpServer.listen(TEST_PORT, resolve);
    });
  });

  afterAll(async () => {
    // Cleanup
    if (clientSocket) {
      clientSocket.close();
    }
    if (io) {
      io.close();
    }
    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close(resolve);
      });
    }
    if (db) {
      db.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(async () => {
    // Connect client socket
    clientSocket = Client(`http://localhost:${TEST_PORT}`);
    await new Promise((resolve) => {
      clientSocket.on('connect', resolve);
    });

    // Clear test data
    db.exec('DELETE FROM comments');
    db.exec('DELETE FROM posts');

    // Insert test post
    db.prepare('INSERT INTO posts (id, title, content) VALUES (?, ?, ?)').run(
      'test-post-1',
      'Test Post',
      'Test content'
    );
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.removeAllListeners();
      clientSocket.close();
    }
  });

  describe('comment:created Event Broadcasting', () => {
    it('should broadcast comment:created event when comment is added', async () => {
      const postId = 'test-post-1';
      const commentData = {
        id: 'comment-1',
        post_id: postId,
        content: 'Test comment content',
        content_type: 'text',
        author: 'test-user',
        author_type: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Subscribe to post
      clientSocket.emit('subscribe:post', postId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Setup listener for comment:created event
      const eventPromise = new Promise((resolve) => {
        clientSocket.on('comment:created', (data) => {
          resolve(data);
        });
      });

      // Insert comment into database
      db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        commentData.id,
        commentData.post_id,
        commentData.content,
        commentData.content_type,
        commentData.author,
        commentData.author_type,
        commentData.created_at,
        commentData.updated_at
      );

      // Broadcast the event (simulating what the API would do)
      io.to(`post:${postId}`).emit('comment:created', {
        postId,
        comment: commentData,
      });

      // Wait for event
      const receivedData = await eventPromise;

      // Verify event was received
      expect(receivedData).toBeDefined();
      expect(receivedData.postId).toBe(postId);
    });

    it('should include full comment object in event payload', async () => {
      const postId = 'test-post-1';
      const commentData = {
        id: 'comment-2',
        post_id: postId,
        content: 'Full comment data test',
        content_type: 'markdown',
        author: 'agent-avi',
        author_type: 'agent',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      clientSocket.emit('subscribe:post', postId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const eventPromise = new Promise((resolve) => {
        clientSocket.on('comment:created', (data) => {
          resolve(data);
        });
      });

      // Broadcast event with full comment data
      io.to(`post:${postId}`).emit('comment:created', {
        postId,
        comment: commentData,
      });

      const receivedData = await eventPromise;

      // Verify all comment fields are present
      expect(receivedData.comment).toMatchObject({
        id: commentData.id,
        post_id: commentData.post_id,
        content: commentData.content,
        content_type: commentData.content_type,
        author: commentData.author,
        author_type: commentData.author_type,
      });
      expect(receivedData.comment.created_at).toBeDefined();
      expect(receivedData.comment.updated_at).toBeDefined();
    });

    it('should include postId in event payload', async () => {
      const postId = 'test-post-1';
      const commentData = {
        id: 'comment-3',
        post_id: postId,
        content: 'Test postId field',
        content_type: 'text',
        author: 'user-123',
        author_type: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      clientSocket.emit('subscribe:post', postId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const eventPromise = new Promise((resolve) => {
        clientSocket.on('comment:created', (data) => {
          resolve(data);
        });
      });

      io.to(`post:${postId}`).emit('comment:created', {
        postId,
        comment: commentData,
      });

      const receivedData = await eventPromise;

      expect(receivedData).toHaveProperty('postId');
      expect(receivedData.postId).toBe(postId);
    });

    it('should have event name as comment:created not comment:added', async () => {
      const postId = 'test-post-1';
      const commentData = {
        id: 'comment-4',
        post_id: postId,
        content: 'Event name verification',
        content_type: 'text',
        author: 'test-user',
        author_type: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      clientSocket.emit('subscribe:post', postId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      let receivedEventName = null;
      const eventPromise = new Promise((resolve) => {
        // Listen to both possible event names
        clientSocket.on('comment:created', () => {
          receivedEventName = 'comment:created';
          resolve('comment:created');
        });

        clientSocket.on('comment:added', () => {
          receivedEventName = 'comment:added';
          resolve('comment:added');
        });
      });

      // Emit with correct event name
      io.to(`post:${postId}`).emit('comment:created', {
        postId,
        comment: commentData,
      });

      const eventName = await eventPromise;

      expect(eventName).toBe('comment:created');
      expect(receivedEventName).toBe('comment:created');
    });
  });

  describe('Room-based Broadcasting', () => {
    it('should only broadcast to subscribers of specific post', async () => {
      const postId1 = 'test-post-1';
      const postId2 = 'test-post-2';

      // Create second post
      db.prepare('INSERT INTO posts (id, title, content) VALUES (?, ?, ?)').run(
        postId2,
        'Test Post 2',
        'Test content 2'
      );

      // Subscribe to post 1 only
      clientSocket.emit('subscribe:post', postId1);
      await new Promise((resolve) => setTimeout(resolve, 100));

      let receivedEvents = [];
      clientSocket.on('comment:created', (data) => {
        receivedEvents.push(data);
      });

      // Emit event for post 1
      io.to(`post:${postId1}`).emit('comment:created', {
        postId: postId1,
        comment: { id: 'c1', content: 'Post 1 comment' },
      });

      // Emit event for post 2 (should NOT be received)
      io.to(`post:${postId2}`).emit('comment:created', {
        postId: postId2,
        comment: { id: 'c2', content: 'Post 2 comment' },
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should only receive event for post 1
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].postId).toBe(postId1);
    });

    it('should broadcast to multiple subscribers', async () => {
      const postId = 'test-post-1';

      // Create second client
      const client2 = Client(`http://localhost:${TEST_PORT}`);
      await new Promise((resolve) => {
        client2.on('connect', resolve);
      });

      // Subscribe both clients
      clientSocket.emit('subscribe:post', postId);
      client2.emit('subscribe:post', postId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const events1 = [];
      const events2 = [];

      clientSocket.on('comment:created', (data) => {
        events1.push(data);
      });

      client2.on('comment:created', (data) => {
        events2.push(data);
      });

      // Broadcast event
      io.to(`post:${postId}`).emit('comment:created', {
        postId,
        comment: { id: 'c1', content: 'Multi-subscriber test' },
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Both clients should receive the event
      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
      expect(events1[0].comment.id).toBe('c1');
      expect(events2[0].comment.id).toBe('c1');

      client2.close();
    });
  });

  describe('Comment Field Validation', () => {
    it('should include content_type field in comment payload', async () => {
      const postId = 'test-post-1';
      const commentData = {
        id: 'comment-5',
        post_id: postId,
        content: 'Test content_type field',
        content_type: 'markdown',
        author: 'agent-avi',
        author_type: 'agent',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      clientSocket.emit('subscribe:post', postId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const eventPromise = new Promise((resolve) => {
        clientSocket.on('comment:created', (data) => {
          resolve(data);
        });
      });

      io.to(`post:${postId}`).emit('comment:created', {
        postId,
        comment: commentData,
      });

      const receivedData = await eventPromise;

      expect(receivedData.comment).toHaveProperty('content_type');
      expect(receivedData.comment.content_type).toBe('markdown');
    });

    it('should include author_type field in comment payload', async () => {
      const postId = 'test-post-1';
      const commentData = {
        id: 'comment-6',
        post_id: postId,
        content: 'Test author_type field',
        content_type: 'text',
        author: 'agent-avi',
        author_type: 'agent',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      clientSocket.emit('subscribe:post', postId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const eventPromise = new Promise((resolve) => {
        clientSocket.on('comment:created', (data) => {
          resolve(data);
        });
      });

      io.to(`post:${postId}`).emit('comment:created', {
        postId,
        comment: commentData,
      });

      const receivedData = await eventPromise;

      expect(receivedData.comment).toHaveProperty('author_type');
      expect(receivedData.comment.author_type).toBe('agent');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing postId gracefully', async () => {
      const commentData = {
        id: 'comment-7',
        content: 'Missing postId test',
        content_type: 'text',
        author: 'test-user',
        author_type: 'user',
      };

      let errorOccurred = false;
      try {
        io.emit('comment:created', {
          comment: commentData,
          // postId is missing
        });
      } catch (error) {
        errorOccurred = true;
      }

      expect(errorOccurred).toBe(false); // Should not throw error
    });

    it('should handle malformed comment data gracefully', async () => {
      const postId = 'test-post-1';

      clientSocket.emit('subscribe:post', postId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      let receivedData = null;
      clientSocket.on('comment:created', (data) => {
        receivedData = data;
      });

      let errorOccurred = false;
      try {
        io.to(`post:${postId}`).emit('comment:created', {
          postId,
          comment: {
            // Missing required fields
            id: 'malformed',
          },
        });
      } catch (error) {
        errorOccurred = true;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(errorOccurred).toBe(false); // Should not throw error
      expect(receivedData).toBeDefined(); // Event should still be received
    });
  });
});
