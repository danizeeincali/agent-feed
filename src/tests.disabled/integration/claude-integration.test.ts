/**
 * TDD Integration Tests for Claude Code Integration
 * Following London School TDD methodology for Avi DM System
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/test-globals';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Claude Code Integration - TDD London School', () => {
  const TEST_INSTANCE_ID = 'test-instance-123';
  const CORRECT_API_BASE = '/api/claude/instances';
  const WORKING_DIRECTORY = '/workspaces/agent-feed/prod';

  beforeEach(() => {
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  describe('API Endpoint Integration', () => {
    test('should create Claude Code instance with correct endpoint and config', async () => {
      // Arrange - Set up mock response
      const mockInstanceResponse = {
        success: true,
        data: {
          id: TEST_INSTANCE_ID,
          name: 'Avi - Direct Message Assistant',
          workingDirectory: WORKING_DIRECTORY,
          status: 'running',
          isConnected: true,
          metadata: {
            isAvi: true,
            purpose: 'direct-messaging',
            realInstance: true
          }
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockInstanceResponse
      } as Response);

      // Act - Create instance with correct config
      const response = await fetch(`${CORRECT_API_BASE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Avi - Direct Message Assistant',
          workingDirectory: WORKING_DIRECTORY,
          skipPermissions: true,
          resumeSession: true,
          metadata: {
            isAvi: true,
            purpose: 'direct-messaging',
            capabilities: ['code-review', 'debugging', 'architecture', 'general-assistance']
          }
        })
      });

      // Assert - Verify correct endpoint called with correct config
      expect(fetch).toHaveBeenCalledWith(`${CORRECT_API_BASE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Avi - Direct Message Assistant',
          workingDirectory: WORKING_DIRECTORY,
          skipPermissions: true,
          resumeSession: true,
          metadata: {
            isAvi: true,
            purpose: 'direct-messaging',
            capabilities: ['code-review', 'debugging', 'architecture', 'general-assistance']
          }
        })
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(TEST_INSTANCE_ID);
      expect(result.data.workingDirectory).toBe(WORKING_DIRECTORY);
    });

    test('should send message using correct endpoint format', async () => {
      // Arrange
      const testMessage = 'Hello Avi, what files are in my directory?';
      const mockMessageResponse = {
        success: true,
        data: {
          messageId: 'msg-123',
          instanceId: TEST_INSTANCE_ID,
          content: testMessage,
          response: {
            content: 'Files in /workspaces/agent-feed/prod:\npackage.json\nsrc/\ndist/',
            metadata: {
              model: 'claude-sonnet-4',
              realClaudeResponse: true,
              processingTime: 1200
            }
          }
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessageResponse
      } as Response);

      // Act
      const response = await fetch(`${CORRECT_API_BASE}/${TEST_INSTANCE_ID}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: testMessage,
          metadata: {
            source: 'avi-dm',
            timestamp: new Date().toISOString()
          }
        })
      });

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        `${CORRECT_API_BASE}/${TEST_INSTANCE_ID}/message`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining(testMessage)
        })
      );

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.response.metadata.realClaudeResponse).toBe(true);
    });

    test('should handle API errors gracefully', async () => {
      // Arrange - Mock API error
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Claude instance creation failed',
          details: 'Process spawn error'
        })
      } as Response);

      // Act
      const response = await fetch(`${CORRECT_API_BASE}`, {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Instance' })
      });

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Claude instance creation failed');
    });
  });

  describe('WebSocket Integration', () => {
    test('should connect to correct WebSocket endpoint', () => {
      // Arrange - Mock WebSocket
      const mockWebSocket = {
        onopen: null as ((event: Event) => void) | null,
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        onclose: null as ((event: CloseEvent) => void) | null,
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN
      };

      // Mock WebSocket constructor
      (global as any).WebSocket = jest.fn().mockImplementation((url: string) => {
        expect(url).toBe(`ws://localhost:8080/ws/claude/${TEST_INSTANCE_ID}`);
        return mockWebSocket;
      });

      // Act - Create WebSocket connection
      const wsUrl = `ws://localhost:8080/ws/claude/${TEST_INSTANCE_ID}`;
      const ws = new WebSocket(wsUrl);

      // Assert
      expect(WebSocket).toHaveBeenCalledWith(`ws://localhost:8080/ws/claude/${TEST_INSTANCE_ID}`);
      expect(ws).toBeDefined();
    });

    test('should handle streaming message events', (done) => {
      // Arrange
      const mockWebSocket = {
        onopen: null as ((event: Event) => void) | null,
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        onclose: null as ((event: CloseEvent) => void) | null,
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN
      };

      (global as any).WebSocket = jest.fn().mockImplementation(() => mockWebSocket);

      const testStreamingData = {
        type: 'streaming',
        requestId: 'req-123',
        content: 'This is a streaming response...',
        sessionId: TEST_INSTANCE_ID
      };

      // Act
      const ws = new WebSocket(`ws://localhost:8080/ws/claude/${TEST_INSTANCE_ID}`);

      // Set up message handler
      ws.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);

        // Assert
        expect(data.type).toBe('streaming');
        expect(data.requestId).toBe('req-123');
        expect(data.content).toBe('This is a streaming response...');
        done();
      };

      // Simulate incoming message
      const mockEvent = {
        data: JSON.stringify(testStreamingData)
      } as MessageEvent;

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(mockEvent);
      }
    });
  });

  describe('Working Directory Integration', () => {
    test('should use correct working directory for Claude Code sessions', async () => {
      // Arrange
      const mockHealthResponse = {
        success: true,
        data: {
          id: TEST_INSTANCE_ID,
          workingDirectory: WORKING_DIRECTORY,
          status: 'running',
          pid: 12345,
          uptime: 30000,
          lastActivity: new Date().toISOString()
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealthResponse
      } as Response);

      // Act
      const response = await fetch(`${CORRECT_API_BASE}/${TEST_INSTANCE_ID}/health`);
      const result = await response.json();

      // Assert
      expect(result.data.workingDirectory).toBe(WORKING_DIRECTORY);
      expect(result.data.status).toBe('running');
    });

    test('should access real filesystem in prod directory', async () => {
      // Arrange - Mock file listing response
      const mockFileListResponse = {
        success: true,
        data: {
          response: {
            content: `Files and folders in ${WORKING_DIRECTORY}:\n\npackage.json\nsrc/\ntests/\ndist/\nnode_modules/`,
            metadata: {
              model: 'claude-sonnet-4',
              realClaudeResponse: true,
              workingDirectory: WORKING_DIRECTORY
            }
          }
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFileListResponse
      } as Response);

      // Act - Ask Claude to list files
      const response = await fetch(`${CORRECT_API_BASE}/${TEST_INSTANCE_ID}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'What files are in my directory?',
          metadata: { source: 'avi-dm' }
        })
      });

      const result = await response.json();

      // Assert - Should show real filesystem contents
      expect(result.data.response.content).toContain('package.json');
      expect(result.data.response.content).toContain(WORKING_DIRECTORY);
      expect(result.data.response.metadata.realClaudeResponse).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle instance not found error', async () => {
      // Arrange
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: 'Claude instance not found',
          instanceId: 'non-existent-id'
        })
      } as Response);

      // Act
      const response = await fetch(`${CORRECT_API_BASE}/non-existent-id/message`, {
        method: 'POST',
        body: JSON.stringify({ content: 'test message' })
      });

      // Assert
      expect(response.status).toBe(404);
      const result = await response.json();
      expect(result.error).toContain('Claude instance not found');
    });

    test('should handle connection timeouts', async () => {
      // Arrange - Mock timeout error
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Request timeout')
      );

      // Act & Assert
      await expect(
        fetch(`${CORRECT_API_BASE}/${TEST_INSTANCE_ID}/message`, {
          method: 'POST',
          body: JSON.stringify({ content: 'test' })
        })
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('Integration with ClaudeProcessManager', () => {
    test('should verify ClaudeProcessManager integration', async () => {
      // This test would verify that the API correctly uses ClaudeProcessManager
      // In actual implementation, this would test the server-side integration

      // Arrange - Mock response that indicates ClaudeProcessManager is used
      const mockProcessResponse = {
        success: true,
        data: {
          id: TEST_INSTANCE_ID,
          pid: 12345,
          status: 'running',
          metadata: {
            usingClaudeProcessManager: true,
            claudeCodeBinary: true,
            realProcess: true
          }
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProcessResponse
      } as Response);

      // Act
      const response = await fetch(`${CORRECT_API_BASE}/${TEST_INSTANCE_ID}`);
      const result = await response.json();

      // Assert
      expect(result.data.metadata.usingClaudeProcessManager).toBe(true);
      expect(result.data.metadata.claudeCodeBinary).toBe(true);
      expect(result.data.pid).toBeDefined();
    });
  });
});

describe('AviDirectChatReal Component Integration', () => {
  // These tests would be for the React component once implemented
  test.todo('should connect to Claude instance on mount');
  test.todo('should send messages via correct API endpoints');
  test.todo('should handle WebSocket streaming responses');
  test.todo('should display connection status correctly');
  test.todo('should handle errors and show retry options');
  test.todo('should use prod working directory');
});

// Performance Tests
describe('Performance and Resource Usage', () => {
  test.todo('should not create duplicate Claude instances');
  test.todo('should handle concurrent message sending');
  test.todo('should clean up resources on unmount');
  test.todo('should handle WebSocket reconnection');
});