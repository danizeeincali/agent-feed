/**
 * London School TDD: Database Operations Unit Tests
 * Mock-driven testing focusing on database interaction contracts
 */

const DatabaseAdapter = require('../../../src/database/DatabaseAdapter');
const PostRepository = require('../../../src/repositories/PostRepository');

describe('Database Operations - Unit Tests', () => {
  let databaseAdapter;
  let postRepository;
  let mockPgPool;
  let mockPgClient;
  
  beforeEach(() => {
    // Mock PostgreSQL dependencies
    mockPgClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    mockPgPool = {
      connect: jest.fn().mockResolvedValue(mockPgClient),
      query: jest.fn(),
      end: jest.fn()
    };
    
    // Inject mocks
    databaseAdapter = new DatabaseAdapter({ pool: mockPgPool });
    postRepository = new PostRepository({ databaseAdapter });
  });
  
  describe('DatabaseAdapter', () => {
    describe('when connecting to database', () => {
      it('should establish connection and return client', async () => {
        // Arrange
        mockPgPool.connect.mockResolvedValue(mockPgClient);
        
        // Act
        const client = await databaseAdapter.connect();
        
        // Assert - Verify interaction
        expect(mockPgPool.connect).toHaveBeenCalledTimes(1);
        expect(client).toBe(mockPgClient);
      });
      
      it('should handle connection failures', async () => {
        // Arrange
        const connectionError = new Error('ECONNREFUSED');
        mockPgPool.connect.mockRejectedValue(connectionError);
        
        // Act & Assert
        await expect(databaseAdapter.connect()).rejects.toThrow('ECONNREFUSED');
        expect(mockPgPool.connect).toHaveBeenCalledTimes(1);
      });
    });
    
    describe('when executing queries', () => {
      it('should execute query with parameters and return results', async () => {
        // Arrange
        const query = 'SELECT * FROM posts WHERE author_agent = $1';
        const params = ['test-agent'];
        const expectedResult = { rows: [{ id: 1, title: 'Test Post' }], rowCount: 1 };
        
        mockPgClient.query.mockResolvedValue(expectedResult);
        
        // Act
        const result = await databaseAdapter.query(query, params);
        
        // Assert - Verify query interaction
        expect(mockPgClient.query).toHaveBeenCalledWith(query, params);
        expect(result).toEqual(expectedResult);
      });
      
      it('should handle query execution errors', async () => {
        // Arrange
        const queryError = new Error('syntax error at or near "SELCT"');
        mockPgClient.query.mockRejectedValue(queryError);
        
        // Act & Assert
        await expect(databaseAdapter.query('SELCT * FROM posts'))
          .rejects.toThrow('syntax error');
      });
    });
    
    describe('when managing transactions', () => {
      it('should begin, commit, and release transaction properly', async () => {
        // Arrange
        mockPgClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT
        
        // Act
        await databaseAdapter.transaction(async (client) => {
          await client.query('INSERT INTO posts (title) VALUES ($1)', ['Test']);
        });
        
        // Assert - Verify transaction sequence
        expect(mockPgClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
        expect(mockPgClient.query).toHaveBeenNthCalledWith(2, 
          'INSERT INTO posts (title) VALUES ($1)', ['Test']);
        expect(mockPgClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
        expect(mockPgClient.release).toHaveBeenCalledTimes(1);
      });
      
      it('should rollback transaction on error', async () => {
        // Arrange
        const transactionError = new Error('Constraint violation');
        mockPgClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockRejectedValueOnce(transactionError) // INSERT fails
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK
        
        // Act & Assert
        await expect(databaseAdapter.transaction(async (client) => {
          await client.query('INSERT INTO posts (title) VALUES ($1)', ['Test']);
        })).rejects.toThrow('Constraint violation');
        
        // Verify rollback was called
        expect(mockPgClient.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
      });
    });
  });
  
  describe('PostRepository', () => {
    describe('when saving a post', () => {
      it('should execute insert query and return saved post', async () => {
        // Arrange
        const postData = {
          title: 'Test Post',
          content: 'Test content',
          authorAgent: 'test-agent',
          metadata: { businessImpact: 5, tags: ['test'] }
        };
        
        const expectedQuery = `
          INSERT INTO agent_posts (title, content, author_agent, metadata, published_at)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        
        const mockResult = {
          rows: [{ id: '123', ...postData, published_at: new Date() }],
          rowCount: 1
        };
        
        databaseAdapter.query = jest.fn().mockResolvedValue(mockResult);
        
        // Act
        const result = await postRepository.save(postData);
        
        // Assert - Verify repository-database collaboration
        expect(databaseAdapter.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO agent_posts'),
          expect.arrayContaining([
            postData.title,
            postData.content,
            postData.authorAgent,
            JSON.stringify(postData.metadata),
            expect.any(Date)
          ])
        );
        
        expect(result).toEqual(mockResult.rows[0]);
      });
      
      it('should handle duplicate key errors', async () => {
        // Arrange
        const duplicateError = new Error('duplicate key value violates unique constraint');
        duplicateError.code = '23505';
        
        databaseAdapter.query = jest.fn().mockRejectedValue(duplicateError);
        
        // Act & Assert
        await expect(postRepository.save({ title: 'Duplicate' }))
          .rejects.toThrow('duplicate key');
      });
    });
    
    describe('when finding posts', () => {
      it('should execute select query with proper ordering', async () => {
        // Arrange
        const mockPosts = [
          { id: '1', title: 'Post 1', published_at: new Date() },
          { id: '2', title: 'Post 2', published_at: new Date() }
        ];
        
        databaseAdapter.query = jest.fn().mockResolvedValue({
          rows: mockPosts,
          rowCount: 2
        });
        
        // Act
        const result = await postRepository.findAll({ limit: 10, offset: 0 });
        
        // Assert - Verify query structure
        expect(databaseAdapter.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM agent_posts'),
          expect.arrayContaining([10, 0])
        );
        
        expect(result).toEqual(mockPosts);
      });
      
      it('should find post by ID with engagement data', async () => {
        // Arrange
        const postId = 'post-123';
        const mockPost = {
          id: postId,
          title: 'Test Post',
          likes: 5,
          comments: 2,
          shares: 1
        };
        
        databaseAdapter.query = jest.fn().mockResolvedValue({
          rows: [mockPost],
          rowCount: 1
        });
        
        // Act
        const result = await postRepository.findById(postId);
        
        // Assert - Verify join query for engagement data
        expect(databaseAdapter.query).toHaveBeenCalledWith(
          expect.stringContaining('LEFT JOIN post_engagement'),
          [postId]
        );
        
        expect(result).toEqual(mockPost);
      });
    });
    
    describe('when updating posts', () => {
      it('should execute update query with optimistic locking', async () => {
        // Arrange
        const postId = 'post-123';
        const updateData = {
          title: 'Updated Title',
          content: 'Updated content',
          version: 2
        };
        
        const mockResult = {
          rows: [{ ...updateData, id: postId, version: 3 }],
          rowCount: 1
        };
        
        databaseAdapter.query = jest.fn().mockResolvedValue(mockResult);
        
        // Act
        const result = await postRepository.update(postId, updateData);
        
        // Assert - Verify optimistic locking in query
        expect(databaseAdapter.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE id = $1 AND version = $2'),
          expect.arrayContaining([postId, updateData.version])
        );
        
        expect(result).toEqual(mockResult.rows[0]);
      });
      
      it('should detect concurrent modification conflicts', async () => {
        // Arrange
        databaseAdapter.query = jest.fn().mockResolvedValue({
          rows: [],
          rowCount: 0 // No rows updated = version conflict
        });
        
        // Act & Assert
        await expect(postRepository.update('post-123', { version: 1 }))
          .rejects.toThrow('Concurrent modification detected');
      });
    });
  });
  
  describe('Connection Pool Management', () => {
    it('should properly manage connection lifecycle', async () => {
      // Arrange
      const queries = Array(5).fill('SELECT 1');
      
      // Act - Execute multiple queries
      await Promise.all(queries.map(query => databaseAdapter.query(query)));
      
      // Assert - Verify connection reuse
      expect(mockPgPool.connect).toHaveBeenCalledTimes(5);
      expect(mockPgClient.release).toHaveBeenCalledTimes(5);
    });
    
    it('should handle pool exhaustion gracefully', async () => {
      // Arrange
      const poolError = new Error('Pool is full');
      mockPgPool.connect.mockRejectedValue(poolError);
      
      // Act & Assert
      await expect(databaseAdapter.query('SELECT 1'))
        .rejects.toThrow('Pool is full');
    });
  });
});
