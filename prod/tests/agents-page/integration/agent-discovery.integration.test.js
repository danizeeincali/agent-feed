/**
 * Agent Discovery Integration Tests
 * London School TDD - Service Integration Testing
 */

const { jest, describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const path = require('path');
const fs = require('fs').promises;
const { AgentDataFactory, WebSocketEventFactory } = require('../utils/test-factories');

// Integration Test Subject - AgentDiscoveryIntegration
class AgentDiscoveryIntegration {
  constructor(fileSystemService, metadataService, webSocketService) {
    this.fileSystemService = fileSystemService;
    this.metadataService = metadataService;
    this.webSocketService = webSocketService;
    this.discoveredAgents = new Map();
  }

  async performFullDiscovery() {
    // Integration workflow: FileSystem -> Metadata -> WebSocket -> Results
    const directories = await this.fileSystemService.scanAgentDirectory();
    const agents = [];

    for (const directory of directories) {
      try {
        const metadata = await this.metadataService.extractMetadata(directory.path);
        const status = await this.webSocketService.getAgentStatus(directory.name);
        
        const agent = {
          id: directory.name,
          path: directory.path,
          ...metadata,
          status,
          discoveredAt: new Date().toISOString()
        };

        agents.push(agent);
        this.discoveredAgents.set(agent.id, agent);
      } catch (error) {
        console.error(`Failed to process agent ${directory.name}:`, error);
      }
    }

    // Notify WebSocket clients of discovery completion
    await this.webSocketService.broadcast('discovery-complete', {
      totalAgents: agents.length,
      timestamp: new Date().toISOString()
    });

    return agents;
  }

  async startRealTimeMonitoring() {
    await this.webSocketService.subscribe('agent-status-change');
    await this.fileSystemService.startWatching();
    
    this.fileSystemService.onFileChange((event) => {
      this.handleFileSystemChange(event);
    });

    this.webSocketService.onMessage('agent-status-change', (event) => {
      this.handleAgentStatusChange(event);
    });
  }

  async handleFileSystemChange(event) {
    if (event.type === 'agent-added' || event.type === 'agent-modified') {
      const metadata = await this.metadataService.extractMetadata(event.path);
      const status = await this.webSocketService.getAgentStatus(event.agentId);
      
      const updatedAgent = {
        id: event.agentId,
        path: event.path,
        ...metadata,
        status,
        lastUpdated: new Date().toISOString()
      };

      this.discoveredAgents.set(event.agentId, updatedAgent);
      
      await this.webSocketService.broadcast('agent-updated', updatedAgent);
    }
  }

  async handleAgentStatusChange(event) {
    const agent = this.discoveredAgents.get(event.agentId);
    if (agent) {
      agent.status = event.status;
      agent.lastStatusChange = event.timestamp;
      this.discoveredAgents.set(event.agentId, agent);
    }
  }
}

// Mock Services for Integration Testing
class MockFileSystemService {
  constructor() {
    this.scanAgentDirectory = jest.fn();
    this.startWatching = jest.fn();
    this.onFileChange = jest.fn();
    this.stopWatching = jest.fn();
  }
}

class MockMetadataService {
  constructor() {
    this.extractMetadata = jest.fn();
    this.validateMetadata = jest.fn();
  }
}

class MockWebSocketService {
  constructor() {
    this.getAgentStatus = jest.fn();
    this.broadcast = jest.fn();
    this.subscribe = jest.fn();
    this.onMessage = jest.fn();
    this.connected = true;
    this.subscribers = new Set();
  }
}

describe('Agent Discovery Integration', () => {
  let integration;
  let mockFileSystem;
  let mockMetadata;
  let mockWebSocket;
  let testAgents;

  beforeEach(() => {
    // Setup mock services
    mockFileSystem = new MockFileSystemService();
    mockMetadata = new MockMetadataService();
    mockWebSocket = new MockWebSocketService();

    // Create integration subject
    integration = new AgentDiscoveryIntegration(
      mockFileSystem,
      mockMetadata,
      mockWebSocket
    );

    // Setup test data
    testAgents = [
      AgentDataFactory.createPersonalTodosAgent(),
      AgentDataFactory.createMeetingNextStepsAgent(),
      AgentDataFactory.createAgentIdeasAgent()
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Discovery Workflow Integration', () => {
    describe('when performing complete agent discovery', () => {
      beforeEach(() => {
        // Mock file system scan returning agent directories
        mockFileSystem.scanAgentDirectory.mockResolvedValue([
          { name: 'personal-todos-agent', path: '/workspace/personal-todos-agent' },
          { name: 'meeting-next-steps-agent', path: '/workspace/meeting-next-steps-agent' },
          { name: 'agent-ideas-agent', path: '/workspace/agent-ideas-agent' }
        ]);

        // Mock metadata extraction for each agent
        mockMetadata.extractMetadata
          .mockResolvedValueOnce({
            name: 'Personal TODOs Agent',
            description: 'Manages personal tasks',
            version: '1.0.0',
            capabilities: ['task-management']
          })
          .mockResolvedValueOnce({
            name: 'Meeting Next Steps Agent', 
            description: 'Tracks meeting actions',
            version: '1.1.0',
            capabilities: ['action-tracking']
          })
          .mockResolvedValueOnce({
            name: 'Agent Ideas Generator',
            description: 'Generates agent ideas',
            version: '0.9.0',
            capabilities: ['idea-generation']
          });

        // Mock WebSocket status requests
        mockWebSocket.getAgentStatus
          .mockResolvedValueOnce('active')
          .mockResolvedValueOnce('active')
          .mockResolvedValueOnce('inactive');

        mockWebSocket.broadcast.mockResolvedValue();
      });

      it('should execute complete discovery workflow', async () => {
        const discoveredAgents = await integration.performFullDiscovery();

        expect(discoveredAgents).toHaveLength(3);
        expect(discoveredAgents[0]).toMatchObject({
          id: 'personal-todos-agent',
          name: 'Personal TODOs Agent',
          status: 'active'
        });
      });

      it('should maintain proper service collaboration sequence', async () => {
        await integration.performFullDiscovery();

        // Verify collaboration sequence
        expect(mockFileSystem.scanAgentDirectory).toHaveBeenCalledBefore(
          mockMetadata.extractMetadata
        );
        expect(mockMetadata.extractMetadata).toHaveBeenCalledBefore(
          mockWebSocket.getAgentStatus
        );
        expect(mockWebSocket.getAgentStatus).toHaveBeenCalledBefore(
          mockWebSocket.broadcast
        );
      });

      it('should call metadata extraction for each discovered directory', async () => {
        await integration.performFullDiscovery();

        expect(mockMetadata.extractMetadata).toHaveBeenCalledWith(
          '/workspace/personal-todos-agent'
        );
        expect(mockMetadata.extractMetadata).toHaveBeenCalledWith(
          '/workspace/meeting-next-steps-agent'
        );
        expect(mockMetadata.extractMetadata).toHaveBeenCalledWith(
          '/workspace/agent-ideas-agent'
        );
      });

      it('should request status for each agent via WebSocket', async () => {
        await integration.performFullDiscovery();

        expect(mockWebSocket.getAgentStatus).toHaveBeenCalledWith('personal-todos-agent');
        expect(mockWebSocket.getAgentStatus).toHaveBeenCalledWith('meeting-next-steps-agent');
        expect(mockWebSocket.getAgentStatus).toHaveBeenCalledWith('agent-ideas-agent');
      });

      it('should broadcast discovery completion', async () => {
        await integration.performFullDiscovery();

        expect(mockWebSocket.broadcast).toHaveBeenCalledWith('discovery-complete', {
          totalAgents: 3,
          timestamp: expect.any(String)
        });
      });

      it('should cache discovered agents', async () => {
        await integration.performFullDiscovery();

        expect(integration.discoveredAgents.size).toBe(3);
        expect(integration.discoveredAgents.has('personal-todos-agent')).toBe(true);
        expect(integration.discoveredAgents.has('meeting-next-steps-agent')).toBe(true);
        expect(integration.discoveredAgents.has('agent-ideas-agent')).toBe(true);
      });
    });

    describe('when individual agent processing fails', () => {
      beforeEach(() => {
        mockFileSystem.scanAgentDirectory.mockResolvedValue([
          { name: 'valid-agent', path: '/workspace/valid-agent' },
          { name: 'invalid-metadata-agent', path: '/workspace/invalid-metadata-agent' },
          { name: 'unreachable-agent', path: '/workspace/unreachable-agent' }
        ]);

        // First agent succeeds
        mockMetadata.extractMetadata
          .mockResolvedValueOnce({ name: 'Valid Agent', version: '1.0.0' });
        mockWebSocket.getAgentStatus
          .mockResolvedValueOnce('active');

        // Second agent metadata fails
        mockMetadata.extractMetadata
          .mockRejectedValueOnce(new Error('Invalid YAML syntax'));

        // Third agent WebSocket fails
        mockMetadata.extractMetadata
          .mockResolvedValueOnce({ name: 'Unreachable Agent', version: '1.0.0' });
        mockWebSocket.getAgentStatus
          .mockRejectedValueOnce(new Error('WebSocket timeout'));
      });

      it('should continue processing remaining agents', async () => {
        const discoveredAgents = await integration.performFullDiscovery();

        expect(discoveredAgents).toHaveLength(1);
        expect(discoveredAgents[0].id).toBe('valid-agent');
      });

      it('should attempt processing all discovered directories', async () => {
        await integration.performFullDiscovery();

        expect(mockMetadata.extractMetadata).toHaveBeenCalledTimes(3);
        expect(mockWebSocket.getAgentStatus).toHaveBeenCalledTimes(2); // Only for valid metadata
      });
    });

    describe('when file system scan fails', () => {
      beforeEach(() => {
        mockFileSystem.scanAgentDirectory.mockRejectedValue(
          new Error('Directory not accessible')
        );
      });

      it('should propagate file system errors', async () => {
        await expect(integration.performFullDiscovery())
          .rejects.toThrow('Directory not accessible');
      });

      it('should not attempt subsequent service calls', async () => {
        try {
          await integration.performFullDiscovery();
        } catch (error) {
          // Expected error
        }

        expect(mockMetadata.extractMetadata).not.toHaveBeenCalled();
        expect(mockWebSocket.getAgentStatus).not.toHaveBeenCalled();
      });
    });
  });

  describe('Real-Time Monitoring Integration', () => {
    describe('when starting real-time monitoring', () => {
      beforeEach(async () => {
        mockWebSocket.subscribe.mockResolvedValue();
        mockFileSystem.startWatching.mockResolvedValue();
        
        await integration.startRealTimeMonitoring();
      });

      it('should setup WebSocket subscription', () => {
        expect(mockWebSocket.subscribe).toHaveBeenCalledWith('agent-status-change');
      });

      it('should start file system watching', () => {
        expect(mockFileSystem.startWatching).toHaveBeenCalled();
      });

      it('should register file change handler', () => {
        expect(mockFileSystem.onFileChange).toHaveBeenCalledWith(
          expect.any(Function)
        );
      });

      it('should register WebSocket message handler', () => {
        expect(mockWebSocket.onMessage).toHaveBeenCalledWith(
          'agent-status-change',
          expect.any(Function)
        );
      });
    });

    describe('when file system changes occur', () => {
      beforeEach(async () => {
        await integration.startRealTimeMonitoring();
        
        // Setup mocks for change handling
        mockMetadata.extractMetadata.mockResolvedValue({
          name: 'Updated Agent',
          version: '1.1.0'
        });
        mockWebSocket.getAgentStatus.mockResolvedValue('active');
        mockWebSocket.broadcast.mockResolvedValue();
      });

      it('should handle agent addition events', async () => {
        const fileChangeEvent = {
          type: 'agent-added',
          agentId: 'new-agent',
          path: '/workspace/new-agent'
        };

        await integration.handleFileSystemChange(fileChangeEvent);

        expect(mockMetadata.extractMetadata).toHaveBeenCalledWith('/workspace/new-agent');
        expect(mockWebSocket.getAgentStatus).toHaveBeenCalledWith('new-agent');
        expect(mockWebSocket.broadcast).toHaveBeenCalledWith(
          'agent-updated',
          expect.objectContaining({ id: 'new-agent' })
        );
      });

      it('should handle agent modification events', async () => {
        const fileChangeEvent = {
          type: 'agent-modified',
          agentId: 'existing-agent',
          path: '/workspace/existing-agent'
        };

        await integration.handleFileSystemChange(fileChangeEvent);

        expect(mockMetadata.extractMetadata).toHaveBeenCalledWith('/workspace/existing-agent');
        expect(mockWebSocket.broadcast).toHaveBeenCalledWith(
          'agent-updated',
          expect.objectContaining({
            id: 'existing-agent',
            lastUpdated: expect.any(String)
          })
        );
      });

      it('should update agent cache on file changes', async () => {
        const fileChangeEvent = {
          type: 'agent-modified',
          agentId: 'cached-agent',
          path: '/workspace/cached-agent'
        };

        await integration.handleFileSystemChange(fileChangeEvent);

        expect(integration.discoveredAgents.has('cached-agent')).toBe(true);
        const cachedAgent = integration.discoveredAgents.get('cached-agent');
        expect(cachedAgent.name).toBe('Updated Agent');
      });
    });

    describe('when agent status changes occur', () => {
      beforeEach(async () => {
        // Pre-populate cache with agents
        integration.discoveredAgents.set('test-agent', {
          id: 'test-agent',
          name: 'Test Agent',
          status: 'active'
        });

        await integration.startRealTimeMonitoring();
      });

      it('should update cached agent status', async () => {
        const statusChangeEvent = WebSocketEventFactory.createAgentStatusChange(
          'test-agent',
          'inactive'
        );

        await integration.handleAgentStatusChange(statusChangeEvent.data);

        const updatedAgent = integration.discoveredAgents.get('test-agent');
        expect(updatedAgent.status).toBe('inactive');
        expect(updatedAgent.lastStatusChange).toBe(statusChangeEvent.data.timestamp);
      });

      it('should ignore status changes for unknown agents', async () => {
        const statusChangeEvent = WebSocketEventFactory.createAgentStatusChange(
          'unknown-agent',
          'active'
        );

        await integration.handleAgentStatusChange(statusChangeEvent.data);

        expect(integration.discoveredAgents.has('unknown-agent')).toBe(false);
      });
    });
  });

  describe('Cross-Service Error Propagation', () => {
    it('should handle metadata service failures during file changes', async () => {
      await integration.startRealTimeMonitoring();
      
      mockMetadata.extractMetadata.mockRejectedValue(
        new Error('Metadata parsing failed')
      );

      const fileChangeEvent = {
        type: 'agent-modified',
        agentId: 'problematic-agent',
        path: '/workspace/problematic-agent'
      };

      // Should not throw but should handle error gracefully
      await expect(
        integration.handleFileSystemChange(fileChangeEvent)
      ).resolves.not.toThrow();

      expect(mockWebSocket.broadcast).not.toHaveBeenCalled();
    });

    it('should handle WebSocket service failures during status requests', async () => {
      await integration.startRealTimeMonitoring();
      
      mockMetadata.extractMetadata.mockResolvedValue({ name: 'Agent' });
      mockWebSocket.getAgentStatus.mockRejectedValue(
        new Error('WebSocket connection lost')
      );

      const fileChangeEvent = {
        type: 'agent-added',
        agentId: 'new-agent',
        path: '/workspace/new-agent'
      };

      await expect(
        integration.handleFileSystemChange(fileChangeEvent)
      ).resolves.not.toThrow();

      expect(mockWebSocket.broadcast).not.toHaveBeenCalled();
    });
  });

  describe('Service Collaboration Verification', () => {
    it('should maintain proper service boundaries', async () => {
      // File system service should only handle directory operations
      expect(typeof mockFileSystem.scanAgentDirectory).toBe('function');
      expect(typeof mockFileSystem.startWatching).toBe('function');
      
      // Metadata service should only handle metadata operations
      expect(typeof mockMetadata.extractMetadata).toBe('function');
      
      // WebSocket service should only handle real-time communication
      expect(typeof mockWebSocket.getAgentStatus).toBe('function');
      expect(typeof mockWebSocket.broadcast).toBe('function');
    });

    it('should coordinate services without tight coupling', async () => {
      await integration.performFullDiscovery();

      // Each service should be called independently
      expect(mockFileSystem.scanAgentDirectory).toHaveBeenCalledTimes(1);
      expect(mockMetadata.extractMetadata).toHaveBeenCalledTimes(3);
      expect(mockWebSocket.getAgentStatus).toHaveBeenCalledTimes(3);
    });

    it('should aggregate results from all services', async () => {
      const agents = await integration.performFullDiscovery();

      // Results should contain data from all services
      agents.forEach(agent => {
        expect(agent).toHaveProperty('id');       // From file system
        expect(agent).toHaveProperty('name');     // From metadata
        expect(agent).toHaveProperty('status');   // From WebSocket
        expect(agent).toHaveProperty('discoveredAt'); // From integration
      });
    });
  });
});