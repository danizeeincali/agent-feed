/**
 * Unit Tests for AgentWorkspaceManager - TDD Implementation
 */

import { AgentWorkspaceManager } from '../../src/services/AgentWorkspaceManager';
import { AgentWorkspace, AgentWorkspaceError } from '../../src/types/AgentTypes';
import { promises as fs } from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    appendFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    rmdir: jest.fn(),
    unlink: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('AgentWorkspaceManager', () => {
  let manager: AgentWorkspaceManager;
  const testBaseDir = '/test/workspaces';

  beforeEach(() => {
    manager = new AgentWorkspaceManager(testBaseDir);
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default directory when none provided', () => {
      const defaultManager = new AgentWorkspaceManager();
      expect(defaultManager).toBeInstanceOf(AgentWorkspaceManager);
    });

    it('should initialize with custom directory', () => {
      expect(manager).toBeInstanceOf(AgentWorkspaceManager);
    });
  });

  describe('createWorkspace', () => {
    it('should create workspace with proper directory structure', async () => {
      // Arrange
      const agentName = 'test-agent';
      const expectedDir = path.join(testBaseDir, agentName);

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      const workspace = await manager.createWorkspace(agentName);

      // Assert
      expect(workspace).toEqual({
        name: agentName,
        directory: expectedDir,
        files: ['README.md'],
        logs: [],
        lastActivity: expect.any(Date)
      });

      // Verify directory creation
      expect(mockFs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join(expectedDir, 'logs'), { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join(expectedDir, 'files'), { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join(expectedDir, 'temp'), { recursive: true });

      // Verify README creation
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(expectedDir, 'README.md'),
        expect.stringContaining(`# ${agentName} Workspace`),
      );
    });

    it('should throw AgentWorkspaceError when directory creation fails', async () => {
      // Arrange
      const agentName = 'test-agent';
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      // Act & Assert
      await expect(manager.createWorkspace(agentName)).rejects.toThrow(AgentWorkspaceError);
      await expect(manager.createWorkspace(agentName)).rejects.toThrow('Permission denied');
    });

    it('should cache created workspace', async () => {
      // Arrange
      const agentName = 'cached-agent';
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      await manager.createWorkspace(agentName);
      const workspace = await manager.getWorkspace(agentName);

      // Assert
      expect(workspace).toBeTruthy();
      expect(workspace!.name).toBe(agentName);
      // stat should not be called since workspace is cached
      expect(mockFs.stat).not.toHaveBeenCalled();
    });
  });

  describe('getWorkspace', () => {
    it('should return cached workspace when available', async () => {
      // Arrange
      const agentName = 'cached-agent';
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Pre-populate cache
      const createdWorkspace = await manager.createWorkspace(agentName);

      // Act
      const workspace = await manager.getWorkspace(agentName);

      // Assert
      expect(workspace).toEqual(createdWorkspace);
    });

    it('should load workspace from filesystem when not cached', async () => {
      // Arrange
      const agentName = 'filesystem-agent';
      const expectedDir = path.join(testBaseDir, agentName);

      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.readdir
        .mockResolvedValueOnce(['file1.txt', 'file2.js']) // files directory
        .mockResolvedValueOnce(['2023-01-01.log']); // logs directory
      mockFs.readFile.mockResolvedValue('[2023-01-01T10:00:00.000Z] INFO: Test log message\n');

      // Act
      const workspace = await manager.getWorkspace(agentName);

      // Assert
      expect(workspace).toBeTruthy();
      expect(workspace!.name).toBe(agentName);
      expect(workspace!.directory).toBe(expectedDir);
      expect(mockFs.stat).toHaveBeenCalledWith(expectedDir);
    });

    it('should return null for non-existent workspace', async () => {
      // Arrange
      const agentName = 'non-existent';
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));

      // Act
      const workspace = await manager.getWorkspace(agentName);

      // Assert
      expect(workspace).toBeNull();
    });

    it('should return null if path exists but is not a directory', async () => {
      // Arrange
      const agentName = 'not-a-directory';
      mockFs.stat.mockResolvedValue({ isDirectory: () => false } as any);

      // Act
      const workspace = await manager.getWorkspace(agentName);

      // Assert
      expect(workspace).toBeNull();
    });
  });

  describe('listWorkspaces', () => {
    it('should list all available workspaces', async () => {
      // Arrange
      const mockDirents = [
        { name: 'agent1', isDirectory: () => true },
        { name: 'agent2', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
      ];

      mockFs.readdir.mockResolvedValue(mockDirents as any);
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.readdir
        .mockResolvedValueOnce(mockDirents as any) // main directory
        .mockResolvedValue([]); // subdirectories (empty for simplicity)
      mockFs.readFile.mockResolvedValue(''); // empty log files

      // Act
      const workspaces = await manager.listWorkspaces();

      // Assert
      expect(workspaces).toHaveLength(2);
      expect(workspaces[0].name).toBe('agent1');
      expect(workspaces[1].name).toBe('agent2');
    });

    it('should throw AgentWorkspaceError when base directory cannot be read', async () => {
      // Arrange
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      // Act & Assert
      await expect(manager.listWorkspaces()).rejects.toThrow(AgentWorkspaceError);
    });
  });

  describe('writeFile', () => {
    it('should write file to agent workspace', async () => {
      // Arrange
      const agentName = 'writer-agent';
      const relativePath = 'output/result.txt';
      const content = 'test content';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Pre-create workspace
      await manager.createWorkspace(agentName);
      jest.clearAllMocks();

      // Act
      const fullPath = await manager.writeFile(agentName, relativePath, content);

      // Assert
      const expectedPath = path.join(testBaseDir, agentName, 'files', relativePath);
      expect(fullPath).toBe(expectedPath);
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.dirname(expectedPath), { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(expectedPath, content, 'utf-8');
    });

    it('should create workspace if it does not exist', async () => {
      // Arrange
      const agentName = 'new-writer-agent';
      const relativePath = 'output/result.txt';
      const content = 'test content';

      mockFs.stat.mockRejectedValue(new Error('ENOENT'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      await manager.writeFile(agentName, relativePath, content);

      // Assert
      // Should create workspace directories
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(testBaseDir, agentName),
        { recursive: true }
      );
    });

    it('should throw AgentWorkspaceError when file write fails', async () => {
      // Arrange
      const agentName = 'error-agent';
      const relativePath = 'output/result.txt';
      const content = 'test content';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile
        .mockResolvedValueOnce(undefined) // README creation
        .mockRejectedValueOnce(new Error('Disk full'));

      await manager.createWorkspace(agentName);

      // Act & Assert
      await expect(manager.writeFile(agentName, relativePath, content))
        .rejects.toThrow(AgentWorkspaceError);
    });
  });

  describe('readFile', () => {
    it('should read file from agent workspace', async () => {
      // Arrange
      const agentName = 'reader-agent';
      const relativePath = 'input/data.txt';
      const expectedContent = 'file content';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(expectedContent);

      // Pre-create workspace
      await manager.createWorkspace(agentName);

      // Act
      const content = await manager.readFile(agentName, relativePath);

      // Assert
      expect(content).toBe(expectedContent);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(testBaseDir, agentName, 'files', relativePath),
        'utf-8'
      );
    });

    it('should throw AgentWorkspaceError when workspace does not exist', async () => {
      // Arrange
      const agentName = 'non-existent-agent';
      const relativePath = 'input/data.txt';

      // Act & Assert
      await expect(manager.readFile(agentName, relativePath))
        .rejects.toThrow(AgentWorkspaceError);
    });

    it('should throw AgentWorkspaceError when file read fails', async () => {
      // Arrange
      const agentName = 'error-reader-agent';
      const relativePath = 'input/data.txt';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile
        .mockResolvedValueOnce('README content') // README read
        .mockRejectedValueOnce(new Error('File not found'));

      await manager.createWorkspace(agentName);

      // Act & Assert
      await expect(manager.readFile(agentName, relativePath))
        .rejects.toThrow(AgentWorkspaceError);
    });
  });

  describe('log', () => {
    it('should write log entry to workspace log file', async () => {
      // Arrange
      const agentName = 'logger-agent';
      const level = 'info';
      const message = 'Test log message';
      const context = { key: 'value' };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.appendFile.mockResolvedValue(undefined);

      await manager.createWorkspace(agentName);
      jest.clearAllMocks();

      // Act
      await manager.log(agentName, level, message, context);

      // Assert
      const expectedLogPath = path.join(
        testBaseDir,
        agentName,
        'logs',
        `${new Date().toISOString().split('T')[0]}.log`
      );
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expectedLogPath,
        expect.stringContaining(`INFO: ${message}`)
      );
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expectedLogPath,
        expect.stringContaining(JSON.stringify(context))
      );
    });

    it('should handle logging errors gracefully', async () => {
      // Arrange
      const agentName = 'error-logger-agent';
      const level = 'error';
      const message = 'Test error message';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.appendFile.mockRejectedValue(new Error('Cannot write to log'));

      await manager.createWorkspace(agentName);

      // Act & Assert
      // Should not throw, but handle gracefully
      await expect(manager.log(agentName, level, message)).resolves.toBeUndefined();
    });
  });

  describe('cleanTempFiles', () => {
    it('should clean old temporary files', async () => {
      // Arrange
      const agentName = 'cleaner-agent';
      const olderThanHours = 1;

      const oldTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      const recentTime = Date.now() - (30 * 60 * 1000); // 30 minutes ago

      const mockDirents = [
        { name: 'old-file.tmp', isDirectory: () => false },
        { name: 'recent-file.tmp', isDirectory: () => false },
        { name: 'old-dir', isDirectory: () => true },
      ];

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(mockDirents as any);
      mockFs.stat
        .mockResolvedValueOnce({ mtimeMs: oldTime } as any) // old file
        .mockResolvedValueOnce({ mtimeMs: recentTime } as any) // recent file
        .mockResolvedValueOnce({ mtimeMs: oldTime } as any); // old directory
      mockFs.unlink.mockResolvedValue(undefined);
      mockFs.rmdir.mockResolvedValue(undefined);

      await manager.createWorkspace(agentName);

      // Act
      await manager.cleanTempFiles(agentName, olderThanHours);

      // Assert
      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(testBaseDir, agentName, 'temp', 'old-file.tmp')
      );
      expect(mockFs.rmdir).toHaveBeenCalledWith(
        path.join(testBaseDir, agentName, 'temp', 'old-dir'),
        { recursive: true }
      );
      expect(mockFs.unlink).not.toHaveBeenCalledWith(
        path.join(testBaseDir, agentName, 'temp', 'recent-file.tmp')
      );
    });

    it('should handle missing temp directory gracefully', async () => {
      // Arrange
      const agentName = 'no-temp-agent';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readdir.mockRejectedValue(new Error('ENOENT'));

      await manager.createWorkspace(agentName);

      // Act & Assert
      await expect(manager.cleanTempFiles(agentName)).resolves.toBeUndefined();
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete workspace and clear cache', async () => {
      // Arrange
      const agentName = 'deletable-agent';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rmdir.mockResolvedValue(undefined);

      // Create workspace first
      await manager.createWorkspace(agentName);
      const workspace = await manager.getWorkspace(agentName);
      expect(workspace).toBeTruthy();

      // Act
      await manager.deleteWorkspace(agentName);

      // Assert
      expect(mockFs.rmdir).toHaveBeenCalledWith(
        path.join(testBaseDir, agentName),
        { recursive: true }
      );

      // Workspace should be removed from cache
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));
      const deletedWorkspace = await manager.getWorkspace(agentName);
      expect(deletedWorkspace).toBeNull();
    });

    it('should handle deletion of non-existent workspace gracefully', async () => {
      // Arrange
      const agentName = 'non-existent-agent';

      // Act & Assert
      await expect(manager.deleteWorkspace(agentName)).resolves.toBeUndefined();
    });

    it('should throw AgentWorkspaceError when deletion fails', async () => {
      // Arrange
      const agentName = 'undeletable-agent';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rmdir.mockRejectedValue(new Error('Permission denied'));

      await manager.createWorkspace(agentName);

      // Act & Assert
      await expect(manager.deleteWorkspace(agentName)).rejects.toThrow(AgentWorkspaceError);
    });
  });
});