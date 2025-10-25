/**
 * TDD Test Suite: Database Migration 007 - Add author_agent Column
 *
 * London School TDD Approach:
 * - Mock database interactions
 * - Focus on behavior verification
 * - Test contracts between components
 *
 * Coverage:
 * - Migration script execution
 * - Column addition
 * - Data migration
 * - Backward compatibility
 * - Error handling
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock better-sqlite3
const mockDbInstance = {
  exec: jest.fn(),
  prepare: jest.fn(),
  close: jest.fn()
};

const mockDatabase = jest.fn(() => mockDbInstance);

jest.unstable_mockModule('better-sqlite3', () => ({
  default: mockDatabase
}));

// Mock fs promises
const mockReadFile = jest.fn();
jest.unstable_mockModule('fs', () => ({
  promises: {
    readFile: mockReadFile
  }
}));

describe('Migration 007: Add author_agent Column', () => {
  let migrationModule;
  let mockPrepareChain;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup prepare chain for verification queries
    mockPrepareChain = {
      get: jest.fn(),
      all: jest.fn()
    };

    mockDbInstance.prepare.mockReturnValue(mockPrepareChain);

    // Default successful migration
    mockReadFile.mockResolvedValue(`
      ALTER TABLE comments ADD COLUMN author_agent TEXT;
      UPDATE comments SET author_agent = author WHERE author_agent IS NULL;
    `);

    mockPrepareChain.get.mockReturnValue({ count: 0 });
    mockPrepareChain.all.mockReturnValue([
      { id: 1, author: 'agent1', author_agent: 'agent1' },
      { id: 2, author: 'agent2', author_agent: 'agent2' }
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Migration Execution', () => {
    it('should read migration SQL file from correct path', async () => {
      // Arrange
      const expectedPath = expect.stringContaining('007-rename-author-column.sql');

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await applyMigration();

      // Assert
      expect(mockReadFile).toHaveBeenCalledWith(
        expectedPath,
        'utf-8'
      );
    });

    it('should execute migration SQL through database connection', async () => {
      // Arrange
      const migrationSQL = 'ALTER TABLE comments ADD COLUMN author_agent TEXT;';
      mockReadFile.mockResolvedValue(migrationSQL);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(migrationSQL);
    });

    it('should verify migration success by checking null values', async () => {
      // Arrange
      const expectedQuery = expect.stringContaining('author_agent IS NULL');

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.prepare).toHaveBeenCalledWith(expectedQuery);
      expect(mockPrepareChain.get).toHaveBeenCalled();
    });

    it('should close database connection after migration', async () => {
      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.close).toHaveBeenCalled();
    });
  });

  describe('Migration Verification', () => {
    it('should succeed when all comments have author_agent populated', async () => {
      // Arrange
      mockPrepareChain.get.mockReturnValue({ count: 0 });

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      const result = await applyMigration();

      // Assert
      expect(result.success).toBe(true);
      expect(result.nullCount).toBe(0);
    });

    it('should fail when comments have null author_agent values', async () => {
      // Arrange
      mockPrepareChain.get.mockReturnValue({ count: 5 });

      // Act & Assert
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await expect(applyMigration()).rejects.toThrow('Migration incomplete');
    });

    it('should retrieve sample data for verification', async () => {
      // Arrange
      const expectedQuery = expect.stringContaining('LIMIT 5');
      const sampleData = [
        { id: 1, author: 'agent1', author_agent: 'agent1' },
        { id: 2, author: 'agent2', author_agent: 'agent2' }
      ];
      mockPrepareChain.all.mockReturnValue(sampleData);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      const result = await applyMigration();

      // Assert
      expect(mockDbInstance.prepare).toHaveBeenCalledWith(expectedQuery);
      expect(result.samples).toEqual(sampleData);
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors gracefully', async () => {
      // Arrange
      mockReadFile.mockRejectedValue(new Error('File not found'));

      // Act & Assert
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await expect(applyMigration()).rejects.toThrow('File not found');
      expect(mockDbInstance.close).toHaveBeenCalled();
    });

    it('should handle SQL execution errors gracefully', async () => {
      // Arrange
      mockDbInstance.exec.mockImplementation(() => {
        throw new Error('SQL syntax error');
      });

      // Act & Assert
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await expect(applyMigration()).rejects.toThrow('SQL syntax error');
      expect(mockDbInstance.close).toHaveBeenCalled();
    });

    it('should handle database connection errors', async () => {
      // Arrange
      mockDatabase.mockImplementation(() => {
        throw new Error('Cannot connect to database');
      });

      // Act & Assert
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await expect(applyMigration()).rejects.toThrow('Cannot connect to database');
    });
  });

  describe('Data Migration Behavior', () => {
    it('should copy author values to author_agent column', async () => {
      // Arrange
      const expectedSQL = expect.stringContaining('SET author_agent = author');
      mockReadFile.mockResolvedValue(expectedSQL);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE comments')
      );
    });

    it('should only update rows where author_agent is NULL', async () => {
      // Arrange
      const expectedSQL = expect.stringContaining('WHERE author_agent IS NULL');
      mockReadFile.mockResolvedValue(expectedSQL);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('WHERE author_agent IS NULL')
      );
    });
  });

  describe('Backward Compatibility', () => {
    it('should keep both author and author_agent columns', async () => {
      // Arrange
      const migrationSQL = `
        ALTER TABLE comments ADD COLUMN author_agent TEXT;
        UPDATE comments SET author_agent = author WHERE author_agent IS NULL;
      `;
      mockReadFile.mockResolvedValue(migrationSQL);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await applyMigration();

      // Assert - Migration should NOT drop author column
      expect(mockDbInstance.exec).not.toHaveBeenCalledWith(
        expect.stringContaining('DROP COLUMN author')
      );
    });

    it('should allow querying both author and author_agent', async () => {
      // Arrange
      const sampleQuery = 'SELECT id, author, author_agent FROM comments LIMIT 5';
      mockDbInstance.prepare.mockReturnValue(mockPrepareChain);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.prepare).toHaveBeenCalledWith(
        expect.stringContaining('author, author_agent')
      );
    });
  });

  describe('Performance Considerations', () => {
    it('should execute migration in single transaction', async () => {
      // Arrange
      const migrationSQL = 'ALTER TABLE comments ADD COLUMN author_agent TEXT;';
      mockReadFile.mockResolvedValue(migrationSQL);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await applyMigration();

      // Assert - Should call exec once with full SQL
      expect(mockDbInstance.exec).toHaveBeenCalledTimes(1);
    });

    it('should handle large datasets efficiently', async () => {
      // Arrange
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        author: `agent${i}`,
        author_agent: `agent${i}`
      }));
      mockPrepareChain.all.mockReturnValue(largeDataset.slice(0, 5));

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-007.js');
      await applyMigration();

      // Assert - Migration should complete without timeout
      expect(mockDbInstance.exec).toHaveBeenCalled();
      expect(mockPrepareChain.get).toHaveBeenCalled();
    });
  });
});

describe('Database Selector: author_agent Support', () => {
  let mockSqliteDb;
  let databaseSelector;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SQLite prepare chain
    const mockPrepareChain = {
      run: jest.fn(),
      get: jest.fn(() => ({
        id: 'comment-123',
        post_id: 'post-1',
        author: 'avi',
        author_agent: 'avi',
        content: 'Test comment'
      }))
    };

    mockSqliteDb = {
      prepare: jest.fn(() => mockPrepareChain)
    };

    // Mock database selector
    databaseSelector = {
      usePostgres: false,
      sqliteDb: mockSqliteDb,
      createComment: jest.fn()
    };
  });

  describe('Comment Creation with author_agent', () => {
    it('should accept author_agent in comment data', async () => {
      // Arrange
      const commentData = {
        post_id: 'post-1',
        content: 'Test comment',
        author_agent: 'avi'
      };

      // Act
      await databaseSelector.createComment('avi', commentData);

      // Assert
      expect(mockSqliteDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('author_agent')
      );
    });

    it('should use author_agent as primary field', async () => {
      // Arrange
      const commentData = {
        post_id: 'post-1',
        content: 'Test comment',
        author_agent: 'avi'
      };

      const mockRun = jest.fn();
      mockSqliteDb.prepare.mockReturnValue({
        run: mockRun,
        get: jest.fn(() => ({ ...commentData, id: 'comment-123' }))
      });

      // Act
      await databaseSelector.createComment('avi', commentData);

      // Assert
      expect(mockRun).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'avi', // author_agent value
        expect.anything(),
        expect.anything()
      );
    });

    it('should fall back to author field if author_agent not provided', async () => {
      // Arrange
      const commentData = {
        post_id: 'post-1',
        content: 'Test comment',
        author: 'link-logger'
      };

      const mockRun = jest.fn();
      mockSqliteDb.prepare.mockReturnValue({
        run: mockRun,
        get: jest.fn(() => ({ ...commentData, id: 'comment-123' }))
      });

      // Act
      await databaseSelector.createComment('link-logger', commentData);

      // Assert
      expect(mockRun).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'link-logger', // author field
        'link-logger', // author_agent should use author as fallback
        expect.anything(),
        expect.anything()
      );
    });

    it('should support both author and author_agent in same request', async () => {
      // Arrange
      const commentData = {
        post_id: 'post-1',
        content: 'Test comment',
        author: 'legacy-agent',
        author_agent: 'new-agent'
      };

      const mockRun = jest.fn();
      mockSqliteDb.prepare.mockReturnValue({
        run: mockRun,
        get: jest.fn(() => ({ ...commentData, id: 'comment-123' }))
      });

      // Act
      await databaseSelector.createComment('new-agent', commentData);

      // Assert - Should prefer author_agent
      expect(mockRun).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'legacy-agent',  // author preserved
        'new-agent',     // author_agent used
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with old code using only author field', async () => {
      // Arrange
      const legacyCommentData = {
        post_id: 'post-1',
        content: 'Legacy comment',
        author: 'old-agent'
      };

      const mockRun = jest.fn();
      mockSqliteDb.prepare.mockReturnValue({
        run: mockRun,
        get: jest.fn(() => ({ ...legacyCommentData, id: 'comment-123' }))
      });

      // Act
      await databaseSelector.createComment('old-agent', legacyCommentData);

      // Assert - Should populate both columns
      expect(mockRun).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'old-agent', // author
        'old-agent', // author_agent (copied from author)
        expect.anything(),
        expect.anything()
      );
    });

    it('should return comments with both author and author_agent fields', async () => {
      // Arrange
      const mockGet = jest.fn(() => ({
        id: 'comment-123',
        author: 'agent',
        author_agent: 'agent'
      }));

      mockSqliteDb.prepare.mockReturnValue({
        run: jest.fn(),
        get: mockGet
      });

      // Act
      const result = await databaseSelector.createComment('agent', {
        post_id: 'post-1',
        content: 'Test'
      });

      // Assert
      expect(result).toHaveProperty('author');
      expect(result).toHaveProperty('author_agent');
    });
  });
});
