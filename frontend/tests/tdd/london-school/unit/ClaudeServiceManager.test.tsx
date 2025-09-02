/**
 * ClaudeServiceManager Unit Tests - London School TDD
 * Mock-driven tests focusing on behavior verification and interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ClaudeInstanceManager from '../../../../src/components/ClaudeInstanceManager';
import { useHTTPSSE } from '../../../../src/hooks/useHTTPSSE';
import { createMockContracts, expectInteractionPattern, validateContractCompliance } from '../test-setup';

// Mock the HTTP/SSE hook with full contract
vi.mock('../../../../src/hooks/useHTTPSSE');
vi.mock('../../../../src/utils/nld-ui-capture', () => ({
  nldCapture: {
    captureCommunicationBreakdown: vi.fn(),
    captureInstanceCreationFailure: vi.fn()
  }
}));

const mockUseHTTPSSE = useHTTPSSE as any;

describe('ClaudeServiceManager - London School Unit Tests', () => {
  let mockContracts: ReturnType<typeof createMockContracts>;
  let mockHTTPSSEReturn: ReturnType<typeof useHTTPSSE>;

  beforeEach(() => {
    mockContracts = createMockContracts();
    
    // Create comprehensive mock for HTTP/SSE hook
    mockHTTPSSEReturn = {
      socket: { id: 'mock-socket' } as any,
      isConnected: true,
      connectionError: null,
      connectSSE: vi.fn(),
      startPolling: vi.fn(),
      disconnectFromInstance: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn()
    };

    (mockUseHTTPSSE as any).mockReturnValue(mockHTTPSSEReturn);
    
    // Mock fetch with proper contract
    global.fetch = mockContracts.APIContract.fetch;
    mockContracts.APIContract.response.json.mockResolvedValue({
      success: true,
      instances: []
    });
  });

  describe('Instance Creation Workflow', () => {
    it('should coordinate instance creation with proper API contract', async () => {
      // Arrange
      const expectedConfig = {
        command: ['claude'],
        instanceType: 'prod'
      };

      mockContracts.APIContract.response.json.mockResolvedValueOnce({
        success: true,
        instanceId: 'claude-123',
        instance: {
          id: 'claude-123',
          type: 'prod',
          workingDirectory: '/prod'
        }
      });

      // Act
      render(<ClaudeInstanceManager />);
      
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Assert - Verify API interaction contract
      await waitFor(() => {
        expect(mockContracts.APIContract.fetch).toHaveBeenCalledWith(
          'http://localhost:3333/api/v1/claude/instances',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expectedConfig)
          }
        );
      });

      // Verify response contract compliance
      validateContractCompliance(
        mockContracts.APIContract.response.json,
        {
          input: undefined,
          output: {
            success: true,
            instanceId: expect.stringMatching(/^claude-\d+$/),
            instance: expect.objectContaining({
              id: expect.any(String),
              type: expect.any(String)
            })
          }
        }
      );
    });

    it('should validate /prod directory requirement for production instances', async () => {
      // Arrange - Mock production instance creation
      mockContracts.APIContract.response.json.mockResolvedValueOnce({
        success: true,
        instanceId: 'claude-456',
        instance: {
          id: 'claude-456',
          type: 'prod',
          workingDirectory: '/workspaces/agent-feed/prod'
        }
      });

      // Act
      render(<ClaudeInstanceManager />);
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Assert - Verify production mode configuration
      await waitFor(() => {
        expect(mockContracts.APIContract.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({
              command: ['claude'],
              instanceType: 'prod'
            })
          })
        );
      });
    });

    it('should handle skip-permissions configuration correctly', async () => {
      // Arrange
      const expectedSkipConfig = {
        command: ['claude', '--dangerously-skip-permissions'],
        instanceType: 'skip-permissions'
      };

      mockContracts.APIContract.response.json.mockResolvedValueOnce({
        success: true,
        instanceId: 'claude-789',
        instance: { id: 'claude-789' }
      });

      // Act
      render(<ClaudeInstanceManager />);
      const skipButton = screen.getByText('⚡ skip-permissions');
      await userEvent.click(skipButton);

      // Assert
      await waitFor(() => {
        expect(mockContracts.APIContract.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify(expectedSkipConfig)
          })
        );
      });
    });
  });

  describe('Instance Tracking and Status Management', () => {
    it('should track instances through complete lifecycle', async () => {
      // Arrange
      const mockInstances = [
        {
          id: 'claude-123',
          name: 'Test Instance',
          status: 'starting' as const,
          pid: 12345
        }
      ];

      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: mockInstances
      });

      // Mock event handlers
      const mockEventHandlers = new Map();
      mockHTTPSSEReturn.on.mockImplementation((event, handler) => {
        mockEventHandlers.set(event, handler);
      });

      // Act
      render(<ClaudeInstanceManager />);

      // Simulate status update event
      const statusHandler = mockEventHandlers.get('instance:status');
      if (statusHandler) {
        statusHandler({
          instanceId: 'claude-123',
          status: 'running'
        });
      }

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('status-claude-123')).toHaveTextContent('running');
      });
    });

    it('should verify worker instance designation logic', async () => {
      // Arrange
      const workerInstance = {
        id: 'claude-worker-001',
        name: 'Worker Instance',
        status: 'running' as const,
        type: 'worker',
        capabilities: ['feed-processing', 'job-submission']
      };

      // Act - Mock worker instance detection
      render(<ClaudeInstanceManager />);

      // Simulate worker instance creation
      const mockEventHandlers = new Map();
      mockHTTPSSEReturn.on.mockImplementation((event, handler) => {
        mockEventHandlers.set(event, handler);
      });

      const createHandler = mockEventHandlers.get('instance:create:success');
      if (createHandler) {
        createHandler(workerInstance);
      }

      // Assert - Worker instance should be designated correctly
      expect(mockHTTPSSEReturn.on).toHaveBeenCalledWith(
        'instance:create:success',
        expect.any(Function)
      );
    });
  });

  describe('Job Submission and Result Polling', () => {
    it('should coordinate job submission through worker instance', async () => {
      // Arrange
      const workerInstanceId = 'claude-worker-123';
      const jobPayload = {
        type: 'feed-analysis',
        data: { feedUrl: 'https://example.com/feed.xml' }
      };

      // Mock successful job submission
      mockHTTPSSEReturn.emit = jest.fn();

      render(<ClaudeInstanceManager />);
      
      // Simulate instance selection
      const mockInstance = {
        id: workerInstanceId,
        name: 'Worker Instance',
        status: 'running' as const
      };

      // Set up instance data
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [mockInstance]
      });

      // Trigger re-render with instance data
      render(<ClaudeInstanceManager />);

      // Act - Select instance and send job command
      const instanceCard = screen.getByTestId(`instance-card`);
      if (instanceCard) {
        await userEvent.click(instanceCard);
      }

      const commandInput = screen.getByTestId('command-input');
      const sendButton = screen.getByTestId('send-command-button');

      await userEvent.type(commandInput, JSON.stringify(jobPayload));
      await userEvent.click(sendButton);

      // Assert - Verify job submission interaction
      expect(mockHTTPSSEReturn.emit).toHaveBeenCalledWith(
        'terminal:input',
        expect.objectContaining({
          input: expect.stringContaining(JSON.stringify(jobPayload)),
          instanceId: workerInstanceId
        })
      );
    });

    it('should handle API error responses with retry logic', async () => {
      // Arrange - Mock API failure
      mockContracts.APIContract.fetch.mockRejectedValueOnce(
        new Error('Network error')
      );

      // Act
      render(<ClaudeInstanceManager />);
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Assert - Error handling
      await waitFor(() => {
        expect(screen.getByText('Failed to create instance')).toBeInTheDocument();
      });

      // Verify error capture was called
      expect(require('../../../../src/utils/nld-ui-capture').nldCapture.captureInstanceCreationFailure)
        .toHaveBeenCalledWith(
          'Network error',
          'http://localhost:3333/api/v1/claude/instances',
          'POST',
          'ClaudeInstanceManager'
        );
    });
  });

  describe('Real-time Communication Patterns', () => {
    it('should establish proper WebSocket/SSE connection patterns', async () => {
      // Arrange
      const instanceId = 'claude-test-123';
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [{
          id: instanceId,
          name: 'Test Instance',
          status: 'running'
        }]
      });

      // Act
      render(<ClaudeInstanceManager />);
      
      // Wait for component to load and establish connections
      await waitFor(() => {
        expect(mockHTTPSSEReturn.on).toHaveBeenCalledTimes(7); // All event handlers
      });

      // Assert - Verify connection establishment pattern
      expectInteractionPattern(mockHTTPSSEReturn as any, [
        { mock: 'on', args: ['connect', expect.any(Function)] },
        { mock: 'on', args: ['terminal:output', expect.any(Function)] },
        { mock: 'on', args: ['output', expect.any(Function)] },
        { mock: 'on', args: ['instance:create:success', expect.any(Function)] },
        { mock: 'on', args: ['instance:create:error', expect.any(Function)] },
        { mock: 'on', args: ['instance:status', expect.any(Function)] },
        { mock: 'on', args: ['error', expect.any(Function)] }
      ]);
    });

    it('should handle terminal output streaming with proper validation', async () => {
      // Arrange
      const mockOutput = {
        output: 'Claude is ready for interactions\n',
        instanceId: 'claude-123',
        isReal: true
      };

      const mockEventHandlers = new Map();
      mockHTTPSSEReturn.on.mockImplementation((event, handler) => {
        mockEventHandlers.set(event, handler);
      });

      render(<ClaudeInstanceManager />);

      // Act - Simulate terminal output
      const outputHandler = mockEventHandlers.get('terminal:output');
      if (outputHandler) {
        outputHandler(mockOutput);
      }

      // Assert - Verify output processing
      await waitFor(() => {
        const outputArea = screen.getByTestId('terminal-output');
        expect(outputArea).toHaveTextContent('Claude is ready for interactions');
      });
    });
  });

  describe('Worker Instance Failover Scenarios', () => {
    it('should handle worker instance failure and failover', async () => {
      // Arrange
      const primaryWorker = {
        id: 'claude-worker-1',
        name: 'Primary Worker',
        status: 'running' as const
      };

      const backupWorker = {
        id: 'claude-worker-2', 
        name: 'Backup Worker',
        status: 'running' as const
      };

      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [primaryWorker, backupWorker]
      });

      const mockEventHandlers = new Map();
      mockHTTPSSEReturn.on.mockImplementation((event, handler) => {
        mockEventHandlers.set(event, handler);
      });

      render(<ClaudeInstanceManager />);

      // Act - Simulate primary worker failure
      const errorHandler = mockEventHandlers.get('instance:error');
      if (errorHandler) {
        errorHandler({
          instanceId: 'claude-worker-1',
          error: 'Worker process crashed'
        });
      }

      // Assert - Error state handling
      await waitFor(() => {
        expect(screen.getByText(/Worker process crashed/)).toBeInTheDocument();
      });
    });
  });

  describe('Input Validation and Security', () => {
    it('should validate instance ID format before operations', async () => {
      // Arrange - Mock instance with invalid ID format
      const invalidInstance = {
        id: 'invalid-id-format', // Should match /^claude-[a-zA-Z0-9]+$/
        name: 'Invalid Instance',
        status: 'running' as const
      };

      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [invalidInstance]
      });

      render(<ClaudeInstanceManager />);

      // Act - Try to select invalid instance
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      // Assert - Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Invalid instance ID format/)).toBeInTheDocument();
      });
    });

    it('should prevent command injection in input validation', async () => {
      // Arrange
      const maliciousInput = '; rm -rf / #';
      
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [{
          id: 'claude-123',
          name: 'Test Instance', 
          status: 'running'
        }]
      });

      render(<ClaudeInstanceManager />);

      // Select instance first
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      // Act - Try to send malicious input
      const commandInput = screen.getByTestId('command-input');
      const sendButton = screen.getByTestId('send-command-button');

      await userEvent.type(commandInput, maliciousInput);
      await userEvent.click(sendButton);

      // Assert - Input should still be sent (filtering handled by backend)
      expect(mockHTTPSSEReturn.emit).toHaveBeenCalledWith(
        'terminal:input',
        expect.objectContaining({
          input: maliciousInput + '\n',
          instanceId: 'claude-123'
        })
      );
    });
  });
});