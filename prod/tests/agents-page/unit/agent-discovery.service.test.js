/**
 * Agent Discovery Service Tests
 * London School TDD - Mock-Driven Service Testing
 */

const { jest, describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// Subject Under Test
class AgentDiscoveryService {
  constructor(fileSystem, metadataParser, webSocket) {
    this.fileSystem = fileSystem;
    this.metadataParser = metadataParser;
    this.webSocket = webSocket;
    this.watchers = new Map();
    this.agentCache = new Map();
  }

  async discoverAgents() {
    const agentDirectories = await this.fileSystem.scanDirectory('/agent_workspace');
    const agents = [];
    
    for (const directory of agentDirectories) {
      try {
        const metadata = await this.metadataParser.parseMetadata(directory.path);
        const status = await this.getAgentStatus(directory.name);
        
        agents.push({
          id: directory.name,
          path: directory.path,
          metadata,
          status,
          lastUpdated: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Failed to process agent ${directory.name}:`, error);
      }
    }
    
    return agents;
  }

  async getAgentStatus(agentId) {
    return this.webSocket.requestStatus(agentId);
  }

  async startWatching() {
    const watcher = await this.fileSystem.watch('/agent_workspace');
    watcher.on('change', this.handleFileSystemChange.bind(this));
    this.watchers.set('/agent_workspace', watcher);
  }

  handleFileSystemChange(event) {
    this.webSocket.broadcast('agent-change', event);
  }

  stopWatching() {
    this.watchers.forEach(watcher => watcher.unwatch());
    this.watchers.clear();
  }
}

// Mock dependencies
const mockFileSystem = {
  scanDirectory: jest.fn(),
  watch: jest.fn()
};

const mockMetadataParser = {
  parseMetadata: jest.fn()
};

const mockWebSocket = {
  requestStatus: jest.fn(),
  broadcast: jest.fn()
};

const mockWatcher = {
  on: jest.fn(),
  unwatch: jest.fn()
};

describe('AgentDiscoveryService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AgentDiscoveryService(
      mockFileSystem,
      mockMetadataParser,
      mockWebSocket
    );
  });

  describe('Agent Discovery Workflow', () => {
    describe('when discovering agents successfully', () => {
      beforeEach(() => {
        // Mock successful file system scan
        mockFileSystem.scanDirectory.mockResolvedValue([
          { name: 'personal-todos-agent', path: '/agent_workspace/personal-todos-agent' },
          { name: 'meeting-agent', path: '/agent_workspace/meeting-agent' }
        ]);

        // Mock successful metadata parsing
        mockMetadataParser.parseMetadata
          .mockResolvedValueOnce({
            name: 'Personal TODOs Agent',
            version: '1.0.0',
            capabilities: ['task-management']
          })
          .mockResolvedValueOnce({
            name: 'Meeting Agent',
            version: '1.1.0',
            capabilities: ['meeting-processing']
          });

        // Mock successful status requests
        mockWebSocket.requestStatus
          .mockResolvedValueOnce('active')
          .mockResolvedValueOnce('inactive');
      });

      it('should discover agents by collaborating with file system', async () => {
        await service.discoverAgents();

        expect(mockFileSystem.scanDirectory).toHaveBeenCalledWith('/agent_workspace');
      });

      it('should parse metadata for each discovered agent', async () => {
        await service.discoverAgents();

        expect(mockMetadataParser.parseMetadata)
          .toHaveBeenCalledWith('/agent_workspace/personal-todos-agent');
        expect(mockMetadataParser.parseMetadata)
          .toHaveBeenCalledWith('/agent_workspace/meeting-agent');
      });

      it('should request status for each agent via WebSocket', async () => {
        await service.discoverAgents();

        expect(mockWebSocket.requestStatus)
          .toHaveBeenCalledWith('personal-todos-agent');
        expect(mockWebSocket.requestStatus)
          .toHaveBeenCalledWith('meeting-agent');
      });

      it('should return properly structured agent data', async () => {
        const agents = await service.discoverAgents();

        expect(agents).toHaveLength(2);
        expect(agents[0]).toMatchObject({
          id: 'personal-todos-agent',
          path: '/agent_workspace/personal-todos-agent',
          metadata: {
            name: 'Personal TODOs Agent',
            version: '1.0.0',
            capabilities: ['task-management']
          },
          status: 'active',
          lastUpdated: expect.any(String)
        });
      });

      it('should follow proper collaboration sequence', async () => {
        await service.discoverAgents();

        // Verify the sequence of collaborations
        const fileSystemCalls = mockFileSystem.scanDirectory.mock.invocationCallOrder;
        const metadataParserCalls = mockMetadataParser.parseMetadata.mock.invocationCallOrder;
        const webSocketCalls = mockWebSocket.requestStatus.mock.invocationCallOrder;

        expect(Math.min(...metadataParserCalls)).toBeGreaterThan(Math.max(...fileSystemCalls));
        expect(Math.min(...webSocketCalls)).toBeGreaterThan(Math.max(...metadataParserCalls));
      });
    });

    describe('when individual agent processing fails', () => {
      beforeEach(() => {
        mockFileSystem.scanDirectory.mockResolvedValue([
          { name: 'valid-agent', path: '/agent_workspace/valid-agent' },
          { name: 'invalid-agent', path: '/agent_workspace/invalid-agent' }
        ]);

        mockMetadataParser.parseMetadata
          .mockResolvedValueOnce({ name: 'Valid Agent', version: '1.0.0' })
          .mockRejectedValueOnce(new Error('Invalid YAML'));

        mockWebSocket.requestStatus
          .mockResolvedValueOnce('active');
      });

      it('should continue processing other agents despite individual failures', async () => {
        const agents = await service.discoverAgents();

        expect(agents).toHaveLength(1);
        expect(agents[0].id).toBe('valid-agent');
      });

      it('should attempt to process all discovered directories', async () => {
        await service.discoverAgents();

        expect(mockMetadataParser.parseMetadata).toHaveBeenCalledTimes(2);
        expect(mockWebSocket.requestStatus).toHaveBeenCalledTimes(1);
      });
    });

    describe('when file system scan fails', () => {
      beforeEach(() => {
        mockFileSystem.scanDirectory.mockRejectedValue(
          new Error('Permission denied')
        );
      });

      it('should propagate file system errors', async () => {
        await expect(service.discoverAgents()).rejects.toThrow('Permission denied');
      });

      it('should not attempt metadata parsing when scan fails', async () => {
        try {
          await service.discoverAgents();
        } catch (error) {
          // Expected error
        }

        expect(mockMetadataParser.parseMetadata).not.toHaveBeenCalled();
        expect(mockWebSocket.requestStatus).not.toHaveBeenCalled();
      });
    });
  });

  describe('File System Watching', () => {
    describe('when starting file system watch', () => {
      beforeEach(() => {
        mockFileSystem.watch.mockResolvedValue(mockWatcher);
      });

      it('should setup file system watcher on agent directory', async () => {
        await service.startWatching();

        expect(mockFileSystem.watch).toHaveBeenCalledWith('/agent_workspace');
      });

      it('should register change handler with watcher', async () => {
        await service.startWatching();

        expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
      });

      it('should store watcher for later cleanup', async () => {
        await service.startWatching();

        expect(service.watchers.has('/agent_workspace')).toBe(true);
      });
    });

    describe('when file system changes occur', () => {
      beforeEach(async () => {
        mockFileSystem.watch.mockResolvedValue(mockWatcher);
        await service.startWatching();
      });

      it('should broadcast changes via WebSocket', () => {
        const changeEvent = {
          type: 'modified',
          path: '/agent_workspace/personal-todos-agent/config.yaml',
          timestamp: Date.now()
        };

        service.handleFileSystemChange(changeEvent);

        expect(mockWebSocket.broadcast).toHaveBeenCalledWith('agent-change', changeEvent);
      });
    });

    describe('when stopping file system watch', () => {
      beforeEach(async () => {
        mockFileSystem.watch.mockResolvedValue(mockWatcher);
        await service.startWatching();
      });

      it('should unwatch all watchers', () => {
        service.stopWatching();

        expect(mockWatcher.unwatch).toHaveBeenCalled();
      });

      it('should clear watcher storage', () => {
        service.stopWatching();

        expect(service.watchers.size).toBe(0);
      });
    });
  });

  describe('Error Handling Patterns', () => {
    it('should handle metadata parsing errors gracefully', async () => {
      mockFileSystem.scanDirectory.mockResolvedValue([
        { name: 'broken-agent', path: '/agent_workspace/broken-agent' }
      ]);
      mockMetadataParser.parseMetadata.mockRejectedValue(
        new Error('Corrupted metadata')
      );

      const agents = await service.discoverAgents();

      expect(agents).toHaveLength(0);
      // Should not propagate individual agent errors
      expect(() => service.discoverAgents()).not.toThrow();
    });

    it('should handle WebSocket status request failures', async () => {
      mockFileSystem.scanDirectory.mockResolvedValue([
        { name: 'agent', path: '/agent_workspace/agent' }
      ]);
      mockMetadataParser.parseMetadata.mockResolvedValue({ name: 'Agent' });
      mockWebSocket.requestStatus.mockRejectedValue(new Error('WebSocket error'));

      const agents = await service.discoverAgents();

      expect(agents).toHaveLength(0);
      // Should continue processing despite WebSocket errors
    });
  });

  describe('Collaboration Contract Verification', () => {
    it('should collaborate with dependencies in correct order', async () => {
      mockFileSystem.scanDirectory.mockResolvedValue([
        { name: 'agent', path: '/agent_workspace/agent' }
      ]);
      mockMetadataParser.parseMetadata.mockResolvedValue({ name: 'Agent' });
      mockWebSocket.requestStatus.mockResolvedValue('active');

      await service.discoverAgents();

      // Verify collaboration contracts
      expect(mockFileSystem.scanDirectory).toHaveBeenCalledBefore(
        mockMetadataParser.parseMetadata
      );
      expect(mockMetadataParser.parseMetadata).toHaveBeenCalledBefore(
        mockWebSocket.requestStatus
      );
    });

    it('should use WebSocket for real-time communication', async () => {
      const changeEvent = { type: 'change', path: '/test' };
      
      service.handleFileSystemChange(changeEvent);

      expect(mockWebSocket.broadcast).toHaveBeenCalledWith(
        'agent-change',
        changeEvent
      );
    });
  });
});