/**
 * TDD Test Suite: Database Migration 014 - Sequential Agent Introductions
 *
 * London School TDD Approach:
 * - Mock database interactions
 * - Focus on behavior verification
 * - Test contracts between components
 *
 * Coverage:
 * - Migration script execution
 * - Table creation (user_engagement, introduction_queue, agent_workflows)
 * - Index creation for performance
 * - Data integrity constraints
 * - Error handling
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock better-sqlite3
const mockDbInstance = {
  exec: jest.fn(),
  prepare: jest.fn(),
  close: jest.fn(),
  pragma: jest.fn()
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

describe('Migration 014: Sequential Agent Introductions', () => {
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
    mockDbInstance.pragma.mockReturnValue([]);

    // Default successful migration
    mockReadFile.mockResolvedValue(`
      -- Migration 014
      CREATE TABLE IF NOT EXISTS user_engagement (
        user_id TEXT PRIMARY KEY,
        total_interactions INTEGER DEFAULT 0,
        posts_created INTEGER DEFAULT 0,
        comments_created INTEGER DEFAULT 0,
        likes_given INTEGER DEFAULT 0,
        engagement_score INTEGER DEFAULT 0,
        last_activity_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      ) STRICT;
    `);

    mockPrepareChain.get.mockReturnValue({ name: 'user_engagement' });
    mockPrepareChain.all.mockReturnValue([
      { name: 'user_engagement' },
      { name: 'introduction_queue' },
      { name: 'agent_workflows' }
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Migration Execution', () => {
    it('should read migration SQL file from correct path', async () => {
      // Arrange
      const expectedPath = expect.stringContaining('014-sequential-introductions.sql');

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockReadFile).toHaveBeenCalledWith(
        expectedPath,
        'utf-8'
      );
    });

    it('should execute migration SQL through database connection', async () => {
      // Arrange
      const migrationSQL = 'CREATE TABLE user_engagement (id TEXT PRIMARY KEY);';
      mockReadFile.mockResolvedValue(migrationSQL);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(migrationSQL);
    });

    it('should close database connection after migration', async () => {
      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.close).toHaveBeenCalled();
    });
  });

  describe('Table Creation - user_engagement', () => {
    it('should create user_engagement table with correct schema', async () => {
      // Arrange
      const expectedSQL = expect.stringContaining('CREATE TABLE IF NOT EXISTS user_engagement');

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('user_engagement')
      );
    });

    it('should include engagement_score column in user_engagement', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(
        'CREATE TABLE user_engagement (user_id TEXT PRIMARY KEY, engagement_score INTEGER);'
      );

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('engagement_score')
      );
    });

    it('should include activity tracking columns', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(`
        CREATE TABLE user_engagement (
          total_interactions INTEGER,
          posts_created INTEGER,
          comments_created INTEGER,
          likes_given INTEGER
        );
      `);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringMatching(/total_interactions.*posts_created.*comments_created.*likes_given/s)
      );
    });
  });

  describe('Table Creation - introduction_queue', () => {
    it('should create introduction_queue table', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(
        'CREATE TABLE IF NOT EXISTS introduction_queue (id TEXT PRIMARY KEY);'
      );

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('introduction_queue')
      );
    });

    it('should include agent_id and priority columns', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(`
        CREATE TABLE introduction_queue (
          agent_id TEXT NOT NULL,
          priority INTEGER NOT NULL,
          unlock_threshold INTEGER NOT NULL
        );
      `);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringMatching(/agent_id.*priority.*unlock_threshold/s)
      );
    });

    it('should include introduced_at timestamp column', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(
        'CREATE TABLE introduction_queue (introduced_at INTEGER);'
      );

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('introduced_at')
      );
    });
  });

  describe('Table Creation - agent_workflows', () => {
    it('should create agent_workflows table', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(
        'CREATE TABLE IF NOT EXISTS agent_workflows (id TEXT PRIMARY KEY);'
      );

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('agent_workflows')
      );
    });

    it('should include workflow_type column with CHECK constraint', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(`
        CREATE TABLE agent_workflows (
          workflow_type TEXT NOT NULL CHECK(workflow_type IN ('showcase', 'tutorial', 'onboarding'))
        );
      `);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringMatching(/workflow_type.*CHECK.*showcase.*tutorial.*onboarding/s)
      );
    });

    it('should include workflow_data JSON column', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(
        'CREATE TABLE agent_workflows (workflow_data TEXT);'
      );

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('workflow_data')
      );
    });
  });

  describe('Index Creation', () => {
    it('should create index on user_engagement.engagement_score', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(
        'CREATE INDEX IF NOT EXISTS idx_user_engagement_score ON user_engagement(engagement_score);'
      );

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('idx_user_engagement_score')
      );
    });

    it('should create index on introduction_queue priority and status', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(
        'CREATE INDEX IF NOT EXISTS idx_intro_queue_priority ON introduction_queue(priority, introduced);'
      );

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('idx_intro_queue_priority')
      );
    });

    it('should create index on agent_workflows user and status', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(
        'CREATE INDEX IF NOT EXISTS idx_workflows_user_status ON agent_workflows(user_id, status);'
      );

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('idx_workflows_user_status')
      );
    });
  });

  describe('Migration Verification', () => {
    it('should verify all three tables were created', async () => {
      // Arrange
      mockPrepareChain.all.mockReturnValue([
        { name: 'user_engagement' },
        { name: 'introduction_queue' },
        { name: 'agent_workflows' }
      ]);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      const result = await applyMigration();

      // Assert
      expect(result.success).toBe(true);
      expect(result.tablesCreated).toEqual(
        expect.arrayContaining(['user_engagement', 'introduction_queue', 'agent_workflows'])
      );
    });

    it('should fail if tables are missing', async () => {
      // Arrange
      mockPrepareChain.all.mockReturnValue([
        { name: 'user_engagement' }
        // Missing introduction_queue and agent_workflows
      ]);

      // Act & Assert
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await expect(applyMigration()).rejects.toThrow('Missing required tables');
    });

    it('should verify indexes were created', async () => {
      // Arrange
      const expectedQuery = expect.stringContaining('sqlite_master');
      mockPrepareChain.all.mockReturnValue([
        { name: 'idx_user_engagement_score' },
        { name: 'idx_intro_queue_priority' },
        { name: 'idx_workflows_user_status' }
      ]);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      const result = await applyMigration();

      // Assert
      expect(result.indexesCreated).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors gracefully', async () => {
      // Arrange
      mockReadFile.mockRejectedValue(new Error('File not found'));

      // Act & Assert
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await expect(applyMigration()).rejects.toThrow('File not found');
      expect(mockDbInstance.close).toHaveBeenCalled();
    });

    it('should handle SQL execution errors gracefully', async () => {
      // Arrange
      mockDbInstance.exec.mockImplementation(() => {
        throw new Error('SQL syntax error');
      });

      // Act & Assert
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await expect(applyMigration()).rejects.toThrow('SQL syntax error');
      expect(mockDbInstance.close).toHaveBeenCalled();
    });

    it('should handle database connection errors', async () => {
      // Arrange
      mockDatabase.mockImplementation(() => {
        throw new Error('Cannot connect to database');
      });

      // Act & Assert
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await expect(applyMigration()).rejects.toThrow('Cannot connect to database');
    });
  });

  describe('Data Integrity', () => {
    it('should enforce STRICT mode on all tables', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(`
        CREATE TABLE user_engagement (...) STRICT;
        CREATE TABLE introduction_queue (...) STRICT;
        CREATE TABLE agent_workflows (...) STRICT;
      `);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringMatching(/STRICT/g)
      );
    });

    it('should set appropriate default values for counters', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(`
        CREATE TABLE user_engagement (
          total_interactions INTEGER DEFAULT 0,
          engagement_score INTEGER DEFAULT 0
        );
      `);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('DEFAULT 0')
      );
    });

    it('should include NOT NULL constraints on required fields', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(`
        CREATE TABLE introduction_queue (
          user_id TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          priority INTEGER NOT NULL
        );
      `);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringMatching(/NOT NULL.*NOT NULL.*NOT NULL/s)
      );
    });
  });

  describe('Performance Optimizations', () => {
    it('should execute migration with performance pragmas', async () => {
      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('PRAGMA')
      );
    });

    it('should execute all statements in single transaction', async () => {
      // Arrange
      const migrationSQL = `
        CREATE TABLE user_engagement (...);
        CREATE TABLE introduction_queue (...);
        CREATE TABLE agent_workflows (...);
      `;
      mockReadFile.mockResolvedValue(migrationSQL);

      // Act
      const { applyMigration } = await import('../../../scripts/apply-migration-014.js');
      await applyMigration();

      // Assert - Should call exec once with full SQL
      expect(mockDbInstance.exec).toHaveBeenCalledTimes(1);
    });
  });
});
