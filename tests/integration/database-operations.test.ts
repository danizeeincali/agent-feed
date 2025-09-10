import { DatabaseService } from '../../src/database/DatabaseService';
import path from 'path';
import fs from 'fs/promises';

describe('Database Operations Integration Tests', () => {
  let dbService: DatabaseService;
  const testDbPath = path.join(__dirname, '../fixtures/integration-test.db');

  beforeEach(async () => {
    // Clean up any existing test database
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    dbService = new DatabaseService(testDbPath);
    await dbService.connect();
    await dbService.initializeSchema();
  });

  afterEach(async () => {
    if (dbService) {
      await dbService.disconnect();
    }

    // Clean up test database
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Schema Management', () => {
    it('should create all required tables', async () => {
      const tables = await dbService.getTables();
      
      expect(tables).toContain('posts');
      expect(tables).toContain('agents');
    });

    it('should handle schema upgrades gracefully', async () => {
      // Test adding a new column (simulating schema upgrade)
      try {
        await dbService.run('ALTER TABLE posts ADD COLUMN new_column TEXT');
        
        const columns = await dbService.getTableColumns('posts');
        expect(columns).toContain('new_column');
      } catch (error) {
        // This might fail if column already exists, which is fine
        expect(error.message).toMatch(/duplicate column name|already exists/i);
      }
    });

    it('should maintain data integrity during schema changes', async () => {
      // Insert test data
      const testPost = {
        title: 'Schema Test Post',
        content: 'Content for schema test',
        author: 'schema-test',
        hashtags: ['schema', 'test']
      };

      const postId = await dbService.createPost(testPost);
      
      // Perform a schema change
      try {
        await dbService.run('ALTER TABLE posts ADD COLUMN extra_field TEXT DEFAULT "default_value"');
      } catch (error) {
        // Ignore if column already exists
      }

      // Verify data is still intact
      const retrievedPost = await dbService.getPost(postId);
      expect(retrievedPost).toMatchObject(testPost);
    });
  });

  describe('Transaction Management', () => {
    it('should commit successful transactions', async () => {
      await dbService.runTransaction(async (tx) => {
        await tx.run('INSERT INTO posts (title, content, author) VALUES (?, ?, ?)', 
          ['Transaction Test 1', 'Content 1', 'tx-test']);
        await tx.run('INSERT INTO posts (title, content, author) VALUES (?, ?, ?)', 
          ['Transaction Test 2', 'Content 2', 'tx-test']);
      });

      const posts = await dbService.getAllPosts();
      const transactionPosts = posts.filter(p => p.author === 'tx-test');
      
      expect(transactionPosts).toHaveLength(2);
    });

    it('should rollback failed transactions', async () => {
      await expect(async () => {
        await dbService.runTransaction(async (tx) => {
          await tx.run('INSERT INTO posts (title, content, author) VALUES (?, ?, ?)', 
            ['Rollback Test', 'Content', 'rollback-test']);
          
          // Force an error
          throw new Error('Transaction rollback test');
        });
      }).rejects.toThrow('Transaction rollback test');

      const posts = await dbService.getAllPosts();
      const rollbackPosts = posts.filter(p => p.author === 'rollback-test');
      
      expect(rollbackPosts).toHaveLength(0);
    });

    it('should handle nested transactions correctly', async () => {
      await dbService.runTransaction(async (tx1) => {
        await tx1.run('INSERT INTO posts (title, content, author) VALUES (?, ?, ?)', 
          ['Nested Test 1', 'Content 1', 'nested-test']);

        try {
          await dbService.runTransaction(async (tx2) => {
            await tx2.run('INSERT INTO posts (title, content, author) VALUES (?, ?, ?)', 
              ['Nested Test 2', 'Content 2', 'nested-test']);
            
            throw new Error('Inner transaction error');
          });
        } catch (error) {
          // Inner transaction should rollback, but outer should continue
        }

        await tx1.run('INSERT INTO posts (title, content, author) VALUES (?, ?, ?)', 
          ['Nested Test 3', 'Content 3', 'nested-test']);
      });

      const posts = await dbService.getAllPosts();
      const nestedPosts = posts.filter(p => p.author === 'nested-test');
      
      // Should have posts 1 and 3, but not 2
      expect(nestedPosts).toHaveLength(2);
      expect(nestedPosts.some(p => p.title === 'Nested Test 1')).toBe(true);
      expect(nestedPosts.some(p => p.title === 'Nested Test 3')).toBe(true);
      expect(nestedPosts.some(p => p.title === 'Nested Test 2')).toBe(false);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity', async () => {
      // Create an agent
      const agent = {
        id: 'integrity-test-agent',
        name: 'Integrity Test Agent',
        description: 'Agent for testing referential integrity',
        capabilities: ['testing'],
        version: '1.0.0',
        status: 'active' as const
      };

      await dbService.createAgent(agent);

      // Create posts referencing the agent
      const post1 = await dbService.createPost({
        title: 'Post 1',
        content: 'Content 1',
        author: agent.id,
        hashtags: ['integrity']
      });

      const post2 = await dbService.createPost({
        title: 'Post 2',
        content: 'Content 2',
        author: agent.id,
        hashtags: ['integrity']
      });

      // Verify relationships
      const agentPosts = await dbService.getPostsByAuthor(agent.id);
      expect(agentPosts).toHaveLength(2);
      expect(agentPosts.every(p => p.author === agent.id)).toBe(true);
    });

    it('should handle concurrent operations safely', async () => {
      const concurrentOperations = Array(10).fill(null).map(async (_, index) => {
        return dbService.createPost({
          title: `Concurrent Post ${index}`,
          content: `Content for concurrent post ${index}`,
          author: `concurrent-agent-${index}`,
          hashtags: ['concurrent', `test${index}`]
        });
      });

      const postIds = await Promise.all(concurrentOperations);
      
      expect(postIds).toHaveLength(10);
      expect(new Set(postIds).size).toBe(10); // All IDs should be unique
    });

    it('should handle large batch operations efficiently', async () => {
      const batchSize = 100;
      const posts = Array(batchSize).fill(null).map((_, index) => ({
        title: `Batch Post ${index}`,
        content: `Content for batch post ${index}`,
        author: `batch-agent-${index % 10}`, // 10 different authors
        hashtags: ['batch', `post${index}`]
      }));

      const start = Date.now();
      
      await dbService.runTransaction(async (tx) => {
        for (const post of posts) {
          await tx.run(
            'INSERT INTO posts (title, content, author, hashtags, timestamp) VALUES (?, ?, ?, ?, ?)',
            [post.title, post.content, post.author, JSON.stringify(post.hashtags), new Date().toISOString()]
          );
        }
      });

      const duration = Date.now() - start;
      
      // Verify all posts were inserted
      const allPosts = await dbService.getAllPosts();
      const batchPosts = allPosts.filter(p => p.title.startsWith('Batch Post'));
      
      expect(batchPosts).toHaveLength(batchSize);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database corruption gracefully', async () => {
      // Close the connection
      await dbService.disconnect();
      
      // Corrupt the database file
      await fs.writeFile(testDbPath, 'corrupted data');
      
      // Try to reconnect
      const corruptedDbService = new DatabaseService(testDbPath);
      
      await expect(corruptedDbService.connect()).rejects.toThrow();
    });

    it('should recover from connection loss', async () => {
      // Insert some data
      const testPost = {
        title: 'Recovery Test',
        content: 'Testing recovery',
        author: 'recovery-test',
        hashtags: ['recovery']
      };

      const postId = await dbService.createPost(testPost);
      
      // Simulate connection loss
      await dbService.disconnect();
      
      // Reconnect
      await dbService.connect();
      
      // Verify data is still accessible
      const retrievedPost = await dbService.getPost(postId);
      expect(retrievedPost).toMatchObject(testPost);
    });

    it('should handle disk space issues', async () => {
      // This is a simulation - actual disk space testing would be complex
      // We'll test error handling for write operations
      
      const largePosts = Array(1000).fill(null).map((_, index) => ({
        title: `Large Post ${index}`,
        content: 'x'.repeat(10000), // 10KB content per post
        author: `large-agent-${index}`,
        hashtags: ['large', 'stress']
      }));

      // This should either succeed or fail gracefully
      try {
        for (const post of largePosts) {
          await dbService.createPost(post);
        }
        
        // If successful, verify some data was written
        const posts = await dbService.getAllPosts();
        expect(posts.length).toBeGreaterThan(0);
      } catch (error) {
        // If failed, should be a clear database error
        expect(error.message).toMatch(/database|disk|space|write/i);
      }
    });
  });

  describe('Performance Optimization', () => {
    it('should use database indexes effectively', async () => {
      // Create test data
      const posts = Array(50).fill(null).map((_, index) => ({
        title: `Index Test Post ${index}`,
        content: `Content ${index}`,
        author: `index-agent-${index % 5}`, // 5 different authors
        hashtags: ['index', `test${index % 10}`] // 10 different hashtag patterns
      }));

      for (const post of posts) {
        await dbService.createPost(post);
      }

      // Test query performance
      const start = Date.now();
      
      // These queries should benefit from indexes
      await dbService.getPostsByAuthor('index-agent-1');
      await dbService.getPostsByHashtag('test5');
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should be fast with proper indexing
    });

    it('should handle complex queries efficiently', async () => {
      // Create diverse test data
      const agents = Array(10).fill(null).map((_, index) => ({
        id: `complex-agent-${index}`,
        name: `Complex Agent ${index}`,
        description: `Agent ${index} for complex queries`,
        capabilities: [`capability${index % 3}`, `skill${index % 4}`],
        version: '1.0.0',
        status: index % 2 === 0 ? 'active' : 'inactive' as const
      }));

      for (const agent of agents) {
        await dbService.createAgent(agent);
      }

      const posts = Array(30).fill(null).map((_, index) => ({
        title: `Complex Post ${index}`,
        content: `Complex content ${index}`,
        author: `complex-agent-${index % 10}`,
        hashtags: [`tag${index % 5}`, `category${index % 3}`]
      }));

      for (const post of posts) {
        await dbService.createPost(post);
      }

      const start = Date.now();
      
      // Complex query combining multiple filters
      const activeAgents = await dbService.run(
        'SELECT * FROM agents WHERE status = "active" AND capabilities LIKE ?',
        ['%capability0%']
      );

      const recentPosts = await dbService.run(
        'SELECT p.*, a.name as agent_name FROM posts p JOIN agents a ON p.author = a.id WHERE a.status = "active" ORDER BY p.timestamp DESC LIMIT 10'
      );

      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500); // Complex queries should still be fast
      expect(activeAgents).toBeDefined();
      expect(recentPosts).toBeDefined();
    });
  });
});