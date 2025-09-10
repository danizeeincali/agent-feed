/**
 * Unit Tests for AgentDatabase - TDD Implementation
 */

import { AgentDatabase, DatabaseConfig } from '../../src/database/AgentDatabase';
import { AgentDefinition } from '../../src/types/AgentTypes';
import { Database } from 'better-sqlite3';
import { __mockFunctions } from './__mocks__/better-sqlite3';

// Mock better-sqlite3 using the __mocks__ directory approach
jest.mock('better-sqlite3');

// Extract mock functions for use in tests
const { mockPrepare, mockRun, mockGet, mockAll, mockExec, mockClose, mockBackup } = __mockFunctions;

describe('AgentDatabase', () => {
  let database: AgentDatabase;
  const testConfig: DatabaseConfig = {
    memory: true,
    verbose: false
  };

  const sampleAgent: AgentDefinition = {
    name: 'test-agent',
    description: 'Test agent for database testing',
    tools: ['Read', 'Write'],
    model: 'sonnet',
    color: '#blue',
    proactive: true,
    priority: 'P1',
    usage: 'Testing purposes',
    body: '# Test Agent\n\nThis is a test agent.',
    filePath: '/test/agents/test-agent.md',
    lastModified: new Date('2023-01-01T00:00:00.000Z'),
    workspaceDirectory: '/test/workspace/test-agent/'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock implementations
    mockExec.mockReturnValue(undefined);
    mockPrepare.mockReturnValue({
      run: mockRun,
      get: mockGet,
      all: mockAll
    });
    database = new AgentDatabase(testConfig);
  });

  afterEach(() => {
    if (database && typeof database.close === 'function') {
      database.close();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultDb = new AgentDatabase();
      expect(defaultDb).toBeInstanceOf(AgentDatabase);
      expect(Database).toHaveBeenCalled();
    });

    it('should initialize with custom configuration', () => {
      expect(database).toBeInstanceOf(AgentDatabase);
      expect(Database).toHaveBeenCalledWith(':memory:', expect.any(Object));
    });

    it('should create all required tables', () => {
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS agents'));
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS agent_metrics'));
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS agent_workspaces'));
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS agent_logs'));
    });

    it('should create indexes for performance', () => {
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('CREATE INDEX IF NOT EXISTS'));
    });
  });

  describe('saveAgent', () => {
    it('should save agent to database', async () => {
      // Arrange
      mockRun.mockReturnValue({ changes: 1 });

      // Act
      await database.saveAgent(sampleAgent);

      // Assert
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT OR REPLACE INTO agents'));
      expect(mockRun).toHaveBeenCalledWith(
        sampleAgent.name,
        'test-agent', // slug
        sampleAgent.description,
        JSON.stringify(sampleAgent.tools),
        sampleAgent.model,
        sampleAgent.color,
        1, // proactive as integer
        sampleAgent.priority,
        sampleAgent.usage,
        sampleAgent.body,
        sampleAgent.filePath,
        sampleAgent.workspaceDirectory,
        sampleAgent.name, // for COALESCE check
        sampleAgent.lastModified.toISOString()
      );
    });

    it('should generate correct slug from agent name', async () => {
      // Arrange
      const agentWithComplexName = {
        ...sampleAgent,
        name: 'Complex Agent Name With Spaces!'
      };
      mockRun.mockReturnValue({ changes: 1 });

      // Act
      await database.saveAgent(agentWithComplexName);

      // Assert
      expect(mockRun).toHaveBeenCalledWith(
        expect.any(String),
        'complex-agent-name-with-spaces', // expected slug
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('getAgent', () => {
    it('should return agent when found', async () => {
      // Arrange
      const dbRow = {
        name: sampleAgent.name,
        description: sampleAgent.description,
        tools: JSON.stringify(sampleAgent.tools),
        model: sampleAgent.model,
        color: sampleAgent.color,
        proactive: 1,
        priority: sampleAgent.priority,
        usage: sampleAgent.usage,
        body: sampleAgent.body,
        file_path: sampleAgent.filePath,
        workspace_directory: sampleAgent.workspaceDirectory,
        last_modified: sampleAgent.lastModified.toISOString()
      };
      mockGet.mockReturnValue(dbRow);

      // Act
      const result = await database.getAgent(sampleAgent.name);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        name: sampleAgent.name,
        description: sampleAgent.description,
        tools: sampleAgent.tools,
        model: sampleAgent.model,
        proactive: true
      }));
      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM agents WHERE name = ?');
      expect(mockGet).toHaveBeenCalledWith(sampleAgent.name);
    });

    it('should return null when agent not found', async () => {
      // Arrange
      mockGet.mockReturnValue(undefined);

      // Act
      const result = await database.getAgent('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getAgentBySlug', () => {
    it('should return agent when found by slug', async () => {
      // Arrange
      const dbRow = {
        name: sampleAgent.name,
        description: sampleAgent.description,
        tools: JSON.stringify(sampleAgent.tools),
        model: sampleAgent.model,
        color: sampleAgent.color,
        proactive: 1,
        priority: sampleAgent.priority,
        usage: sampleAgent.usage,
        body: sampleAgent.body,
        file_path: sampleAgent.filePath,
        workspace_directory: sampleAgent.workspaceDirectory,
        last_modified: sampleAgent.lastModified.toISOString()
      };
      mockGet.mockReturnValue(dbRow);

      // Act
      const result = await database.getAgentBySlug('test-agent');

      // Assert
      expect(result).toBeTruthy();
      expect(result!.name).toBe(sampleAgent.name);
      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM agents WHERE slug = ?');
      expect(mockGet).toHaveBeenCalledWith('test-agent');
    });
  });

  describe('listAgents', () => {
    it('should list agents with no filters', async () => {
      // Arrange
      const dbRows = [
        {
          name: 'agent1',
          description: 'First agent',
          tools: '["Read"]',
          model: 'sonnet',
          color: '#blue',
          proactive: 1,
          priority: 'P1',
          usage: 'Testing',
          body: 'Agent 1 body',
          file_path: '/test/agent1.md',
          workspace_directory: '/workspace/agent1/',
          last_modified: '2023-01-01T00:00:00.000Z'
        }
      ];
      mockAll.mockReturnValue(dbRows);

      // Act
      const result = await database.listAgents();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('agent1');
      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM agents ORDER BY priority, name');
      expect(mockAll).toHaveBeenCalled();
    });

    it('should list agents with filters and pagination', async () => {
      // Arrange
      mockAll.mockReturnValue([]);

      // Act
      await database.listAgents({
        limit: 10,
        offset: 5,
        model: 'sonnet',
        proactive: true,
        priority: 'P1',
        search: 'test'
      });

      // Assert
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('WHERE'));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('model = ?'));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('proactive = ?'));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('priority = ?'));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('LIKE'));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('LIMIT'));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('OFFSET'));
    });
  });

  describe('deleteAgent', () => {
    it('should delete existing agent', async () => {
      // Arrange
      mockRun.mockReturnValue({ changes: 1 });

      // Act
      const result = await database.deleteAgent('test-agent');

      // Assert
      expect(result).toBe(true);
      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM agents WHERE name = ?');
      expect(mockRun).toHaveBeenCalledWith('test-agent');
    });

    it('should return false for non-existent agent', async () => {
      // Arrange
      mockRun.mockReturnValue({ changes: 0 });

      // Act
      const result = await database.deleteAgent('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('updateMetrics', () => {
    it('should update agent metrics', async () => {
      // Arrange
      const metrics = {
        totalInvocations: 10,
        successRate: 0.9,
        averageResponseTime: 1500,
        lastUsed: new Date('2023-01-02T00:00:00.000Z'),
        errorCount: 1
      };
      mockRun.mockReturnValue({ changes: 1 });

      // Act
      await database.updateMetrics('test-agent', metrics);

      // Assert
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT OR REPLACE INTO agent_metrics'));
      expect(mockRun).toHaveBeenCalledWith(
        'test-agent',
        metrics.totalInvocations,
        'test-agent',
        metrics.successRate,
        'test-agent',
        metrics.averageResponseTime,
        'test-agent',
        metrics.lastUsed.toISOString(),
        'test-agent',
        metrics.errorCount,
        'test-agent',
        'test-agent'
      );
    });
  });

  describe('getMetrics', () => {
    it('should return metrics when found', async () => {
      // Arrange
      const dbRow = {
        agent_name: 'test-agent',
        total_invocations: 10,
        success_rate: 0.9,
        average_response_time: 1500,
        last_used: '2023-01-02T00:00:00.000Z',
        error_count: 1
      };
      mockGet.mockReturnValue(dbRow);

      // Act
      const result = await database.getMetrics('test-agent');

      // Assert
      expect(result).toEqual({
        name: 'test-agent',
        totalInvocations: 10,
        successRate: 0.9,
        averageResponseTime: 1500,
        lastUsed: new Date('2023-01-02T00:00:00.000Z'),
        errorCount: 1
      });
    });

    it('should return null when metrics not found', async () => {
      // Arrange
      mockGet.mockReturnValue(undefined);

      // Act
      const result = await database.getMetrics('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('recordWorkspaceActivity', () => {
    it('should record workspace activity', async () => {
      // Arrange
      const files = ['file1.txt', 'file2.js'];
      mockRun.mockReturnValue({ changes: 1 });

      // Act
      await database.recordWorkspaceActivity('test-agent', '/workspace/test-agent/', files);

      // Assert
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT OR REPLACE INTO agent_workspaces'));
      expect(mockRun).toHaveBeenCalledWith(
        'test-agent',
        '/workspace/test-agent/',
        JSON.stringify(files),
        'test-agent'
      );
    });
  });

  describe('addLog', () => {
    it('should add log entry', async () => {
      // Arrange
      const context = { key: 'value' };
      mockRun.mockReturnValue({ changes: 1 });

      // Act
      await database.addLog('test-agent', 'info', 'Test message', context);

      // Assert
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO agent_logs'));
      expect(mockRun).toHaveBeenCalledWith(
        'test-agent',
        'info',
        'Test message',
        JSON.stringify(context)
      );
    });

    it('should add log entry without context', async () => {
      // Arrange
      mockRun.mockReturnValue({ changes: 1 });

      // Act
      await database.addLog('test-agent', 'error', 'Error message');

      // Assert
      expect(mockRun).toHaveBeenCalledWith(
        'test-agent',
        'error',
        'Error message',
        null
      );
    });
  });

  describe('getLogs', () => {
    it('should return logs for agent', async () => {
      // Arrange
      const dbRows = [
        {
          level: 'info',
          message: 'Test message',
          context: '{"key":"value"}',
          timestamp: '2023-01-01T00:00:00.000Z'
        }
      ];
      mockAll.mockReturnValue(dbRows);

      // Act
      const result = await database.getLogs('test-agent', 10);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        level: 'info',
        message: 'Test message',
        context: { key: 'value' },
        timestamp: new Date('2023-01-01T00:00:00.000Z')
      });
      expect(mockAll).toHaveBeenCalledWith('test-agent', 10);
    });
  });

  describe('getStats', () => {
    it('should return database statistics', () => {
      // Arrange
      mockGet
        .mockReturnValueOnce({ count: 5 })  // agents count
        .mockReturnValueOnce({ count: 100 }) // logs count
        .mockReturnValueOnce({ count: 3 })   // workspaces count
        .mockReturnValueOnce({ page_count: 10 }) // page count
        .mockReturnValueOnce({ page_size: 4096 }); // page size

      // Act
      const stats = database.getStats();

      // Assert
      expect(stats).toEqual({
        totalAgents: 5,
        totalLogs: 100,
        totalWorkspaces: 3,
        databaseSize: '0.04 MB'
      });
    });
  });

  describe('backup', () => {
    it('should create database backup', async () => {
      // Arrange
      const backupPath = '/test/backup.db';
      mockBackup.mockImplementation((path, callback) => callback(null));

      // Act
      await database.backup(backupPath);

      // Assert
      expect(mockBackup).toHaveBeenCalledWith(backupPath, expect.any(Function));
    });

    it('should reject on backup error', async () => {
      // Arrange
      const backupPath = '/test/backup.db';
      const error = new Error('Backup failed');
      mockBackup.mockImplementation((path, callback) => callback(error));

      // Act & Assert
      await expect(database.backup(backupPath)).rejects.toThrow('Backup failed');
    });
  });
});