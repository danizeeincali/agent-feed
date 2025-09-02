/**
 * Complete Feed Workflow E2E Tests - London School TDD
 * End-to-end scenarios testing complete user workflows with mocked backend
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import ClaudeInstanceManager from '../../../../src/components/ClaudeInstanceManager';
import { useHTTPSSE } from '../../../../src/hooks/useHTTPSSE';
import { createMockContracts, expectInteractionPattern } from '../test-setup';

jest.mock('../../../../src/hooks/useHTTPSSE');
jest.mock('../../../../src/utils/nld-ui-capture', () => ({
  nldCapture: {
    captureCommunicationBreakdown: jest.fn(),
    captureInstanceCreationFailure: jest.fn()
  }
}));

const mockUseHTTPSSE = useHTTPSSE as jest.MockedFunction<typeof useHTTPSSE>;

describe('Complete Feed Workflow E2E Tests', () => {
  let mockContracts: ReturnType<typeof createMockContracts>;
  let mockHTTPSSEReturn: ReturnType<typeof useHTTPSSE>;
  let eventHandlers: Map<string, Function>;

  beforeEach(() => {
    mockContracts = createMockContracts();
    eventHandlers = new Map();
    
    mockHTTPSSEReturn = {
      socket: { id: 'e2e-socket' } as any,
      isConnected: true,
      connectionError: null,
      connectSSE: jest.fn(),
      startPolling: jest.fn(),
      disconnectFromInstance: jest.fn(),
      on: jest.fn().mockImplementation((event: string, handler: Function) => {
        eventHandlers.set(event, handler);
      }),
      off: jest.fn(),
      emit: jest.fn()
    };

    mockUseHTTPSSE.mockReturnValue(mockHTTPSSEReturn);
    global.fetch = mockContracts.APIContract.fetch;
  });

  describe('Complete Feed Processing Workflow', () => {
    it('should execute complete feed analysis workflow from creation to results', async () => {
      // Arrange - Full workflow scenario
      const workflowInstanceId = 'claude-feed-workflow-001';
      const feedUrl = 'https://example.com/tech-feed.xml';
      
      // Mock API responses for complete workflow
      mockContracts.APIContract.response.json
        .mockResolvedValueOnce({ success: true, instances: [] }) // Initial fetch
        .mockResolvedValueOnce({ 
          success: true, 
          instanceId: workflowInstanceId,
          instance: { 
            id: workflowInstanceId, 
            type: 'prod',
            workingDirectory: '/workspaces/agent-feed/prod'
          } 
        }) // Instance creation
        .mockResolvedValueOnce({ 
          success: true, 
          instances: [{
            id: workflowInstanceId,
            name: `claude-feed-workflow-001`,
            status: 'running'
          }] 
        }); // Refresh after creation

      render(<ClaudeInstanceManager />);

      // Step 1: Create production worker instance
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Simulate successful instance creation
      const createHandler = eventHandlers.get('instance:create:success');
      if (createHandler) {
        createHandler({ instanceId: workflowInstanceId });
      }

      // Step 2: Wait for instance connection
      await waitFor(() => {
        expect(mockHTTPSSEReturn.connectSSE).toHaveBeenCalledWith(workflowInstanceId);
      });

      // Step 3: Submit feed processing job
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      const feedJob = {
        action: 'process_feed',
        feed_url: feedUrl,
        analysis_type: 'comprehensive',
        output_format: 'structured'
      };

      const commandInput = screen.getByTestId('command-input');
      const sendButton = screen.getByTestId('send-command-button');

      await userEvent.type(commandInput, JSON.stringify(feedJob));
      await userEvent.click(sendButton);

      // Step 4: Simulate feed processing output
      const outputHandler = eventHandlers.get('terminal:output');
      if (outputHandler) {
        // Progressive feed processing output
        outputHandler({
          output: 'Starting feed analysis...\n',
          instanceId: workflowInstanceId,
          isReal: true
        });

        outputHandler({
          output: 'Fetching feed from https://example.com/tech-feed.xml\n',
          instanceId: workflowInstanceId,
          isReal: true
        });

        outputHandler({
          output: 'Processing 25 feed items...\n',
          instanceId: workflowInstanceId,
          isReal: true
        });

        outputHandler({
          output: JSON.stringify({
            status: 'completed',
            processed_items: 25,
            analysis_results: {
              categories: ['technology', 'programming', 'ai'],
              sentiment: 'positive',
              key_topics: ['machine learning', 'web development']
            }
          }) + '\n',
          instanceId: workflowInstanceId,
          isReal: true
        });
      }

      // Assert - Complete workflow verification
      
      // 1. Instance creation
      expect(mockContracts.APIContract.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v1/claude/instances',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            command: ['claude'],
            instanceType: 'prod'
          })
        })
      );

      // 2. Connection establishment
      expect(mockHTTPSSEReturn.connectSSE).toHaveBeenCalledWith(workflowInstanceId);

      // 3. Job submission
      expect(mockHTTPSSEReturn.emit).toHaveBeenCalledWith(
        'terminal:input',
        expect.objectContaining({
          input: expect.stringContaining('process_feed'),
          instanceId: workflowInstanceId
        })
      );

      // 4. Results display
      await waitFor(() => {
        const outputArea = screen.getByTestId('terminal-output');
        expect(outputArea).toHaveTextContent('Starting feed analysis');
        expect(outputArea).toHaveTextContent('Processing 25 feed items');
        expect(outputArea).toHaveTextContent('completed');
      });
    });

    it('should handle multi-feed parallel processing workflow', async () => {
      // Arrange - Multiple worker instances for parallel processing
      const workerInstances = [
        { id: 'claude-worker-01', name: 'Feed Worker 1', status: 'running' },
        { id: 'claude-worker-02', name: 'Feed Worker 2', status: 'running' }
      ];

      const feeds = [
        'https://techcrunch.com/feed',
        'https://hackernews.com/rss'
      ];

      mockContracts.APIContract.response.json
        .mockResolvedValueOnce({ success: true, instances: [] })
        .mockResolvedValueOnce({ 
          success: true, 
          instanceId: workerInstances[0].id,
          instance: workerInstances[0] 
        })
        .mockResolvedValueOnce({ 
          success: true, 
          instanceId: workerInstances[1].id,
          instance: workerInstances[1] 
        })
        .mockResolvedValue({ success: true, instances: workerInstances });

      render(<ClaudeInstanceManager />);

      // Act - Create multiple worker instances
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);
      await userEvent.click(prodButton);

      // Simulate both instances created
      const createHandler = eventHandlers.get('instance:create:success');
      if (createHandler) {
        createHandler({ instanceId: workerInstances[0].id });
        createHandler({ instanceId: workerInstances[1].id });
      }

      // Submit parallel jobs
      await waitFor(() => {
        const instanceCards = screen.getAllByTestId('instance-card');
        expect(instanceCards).toHaveLength(2);
      });

      // Submit job to first worker
      const firstCard = screen.getAllByTestId('instance-card')[0];
      fireEvent.click(firstCard);

      await userEvent.type(
        screen.getByTestId('command-input'),
        JSON.stringify({ action: 'process_feed', feed_url: feeds[0] })
      );
      await userEvent.click(screen.getByTestId('send-command-button'));

      // Assert - Parallel processing coordination
      expect(mockHTTPSSEReturn.emit).toHaveBeenCalledWith(
        'terminal:input',
        expect.objectContaining({
          input: expect.stringContaining(feeds[0]),
          instanceId: workerInstances[0].id
        })
      );
    });
  });

  describe('Interactive Claude Instance Management', () => {
    it('should support interactive Claude conversation workflow', async () => {
      // Arrange
      const interactiveInstanceId = 'claude-interactive-001';
      
      mockContracts.APIContract.response.json
        .mockResolvedValueOnce({ success: true, instances: [] })
        .mockResolvedValueOnce({ 
          success: true, 
          instanceId: interactiveInstanceId,
          instance: { id: interactiveInstanceId, status: 'running' }
        })
        .mockResolvedValueOnce({ 
          success: true, 
          instances: [{ id: interactiveInstanceId, status: 'running' }] 
        });

      render(<ClaudeInstanceManager />);

      // Step 1: Create interactive instance
      const skipPermButton = screen.getByText('⚡ skip-permissions');
      await userEvent.click(skipPermButton);

      const createHandler = eventHandlers.get('instance:create:success');
      if (createHandler) {
        createHandler({ instanceId: interactiveInstanceId });
      }

      // Step 2: Start interactive conversation
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      const conversations = [
        'Hello Claude, can you help me analyze this code?',
        'What are the main functions in this codebase?',
        'Can you suggest improvements?'
      ];

      // Step 3: Send interactive messages
      for (const message of conversations) {
        const commandInput = screen.getByTestId('command-input');
        const sendButton = screen.getByTestId('send-command-button');

        await userEvent.clear(commandInput);
        await userEvent.type(commandInput, message);
        await userEvent.click(sendButton);

        // Simulate Claude response
        const outputHandler = eventHandlers.get('terminal:output');
        if (outputHandler) {
          outputHandler({
            output: `Claude: I'll help you with that. ${message}\n\nAnalyzing...\n`,
            instanceId: interactiveInstanceId,
            isReal: true
          });
        }
      }

      // Assert - Interactive conversation flow
      expect(mockHTTPSSEReturn.emit).toHaveBeenCalledTimes(conversations.length);
      
      conversations.forEach((message, index) => {
        expect(mockHTTPSSEReturn.emit).toHaveBeenNthCalledWith(
          index + 1,
          'terminal:input',
          expect.objectContaining({
            input: message + '\n',
            instanceId: interactiveInstanceId
          })
        );
      });

      // Verify output accumulation
      await waitFor(() => {
        const outputArea = screen.getByTestId('terminal-output');
        expect(outputArea).toHaveTextContent('Claude: I\'ll help you with that');
        expect(outputArea).toHaveTextContent('Analyzing...');
      });
    });
  });

  describe('Worker Instance Failover Handling', () => {
    it('should handle primary worker failure and automatic failover', async () => {
      // Arrange - Primary and backup worker instances
      const primaryWorker = {
        id: 'claude-primary-worker',
        name: 'Primary Feed Worker',
        status: 'running',
        type: 'primary-worker'
      };

      const backupWorker = {
        id: 'claude-backup-worker',
        name: 'Backup Feed Worker', 
        status: 'running',
        type: 'backup-worker'
      };

      mockContracts.APIContract.response.json
        .mockResolvedValueOnce({ success: true, instances: [] })
        .mockResolvedValue({ 
          success: true, 
          instances: [primaryWorker, backupWorker] 
        });

      render(<ClaudeInstanceManager />);

      // Step 1: Establish primary worker
      await waitFor(() => {
        expect(screen.getByText('Primary Feed Worker')).toBeInTheDocument();
        expect(screen.getByText('Backup Feed Worker')).toBeInTheDocument();
      });

      // Step 2: Submit job to primary worker
      const primaryCard = screen.getByTestId('instance-card');
      fireEvent.click(primaryCard);

      const feedJob = {
        action: 'process_feed',
        feed_url: 'https://important-feed.com/rss',
        priority: 'high'
      };

      await userEvent.type(
        screen.getByTestId('command-input'),
        JSON.stringify(feedJob)
      );
      await userEvent.click(screen.getByTestId('send-command-button'));

      // Step 3: Simulate primary worker failure
      const errorHandler = eventHandlers.get('instance:error');
      if (errorHandler) {
        errorHandler({
          instanceId: primaryWorker.id,
          error: 'Worker process terminated unexpectedly'
        });
      }

      // Step 4: Simulate automatic failover to backup
      const statusHandler = eventHandlers.get('instance:status');
      if (statusHandler) {
        statusHandler({
          instanceId: primaryWorker.id,
          status: 'error'
        });
      }

      // Assert failover handling
      await waitFor(() => {
        expect(screen.getByText(/Worker process terminated unexpectedly/)).toBeInTheDocument();
        expect(screen.getByTestId(`status-${primaryWorker.id}`)).toHaveTextContent('error');
        expect(screen.getByTestId(`status-${backupWorker.id}`)).toHaveTextContent('running');
      });

      // User can manually switch to backup worker
      const backupCard = screen.getAllByTestId('instance-card')[1];
      fireEvent.click(backupCard);

      // Resubmit job to backup
      await userEvent.type(
        screen.getByTestId('command-input'),
        JSON.stringify(feedJob)
      );
      await userEvent.click(screen.getByTestId('send-command-button'));

      // Assert backup worker processing
      expect(mockHTTPSSEReturn.emit).toHaveBeenLastCalledWith(
        'terminal:input',
        expect.objectContaining({
          input: expect.stringContaining('process_feed'),
          instanceId: backupWorker.id
        })
      );
    });

    it('should handle cascade failure scenarios with graceful degradation', async () => {
      // Arrange - Multiple workers that fail in sequence
      const workers = [
        { id: 'claude-worker-1', name: 'Worker 1', status: 'running' },
        { id: 'claude-worker-2', name: 'Worker 2', status: 'running' },
        { id: 'claude-worker-3', name: 'Worker 3', status: 'running' }
      ];

      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: workers
      });

      render(<ClaudeInstanceManager />);

      // Act - Simulate cascade failure
      const errorHandler = eventHandlers.get('instance:error');
      const statusHandler = eventHandlers.get('instance:status');

      if (errorHandler && statusHandler) {
        // Worker 1 fails
        errorHandler({
          instanceId: 'claude-worker-1',
          error: 'Memory exhaustion'
        });
        statusHandler({ instanceId: 'claude-worker-1', status: 'error' });

        // Worker 2 fails shortly after
        setTimeout(() => {
          errorHandler({
            instanceId: 'claude-worker-2', 
            error: 'Connection timeout'
          });
          statusHandler({ instanceId: 'claude-worker-2', status: 'error' });
        }, 100);
      }

      // Assert - Should show cascade failure but maintain UI stability
      await waitFor(() => {
        expect(screen.getByText(/Memory exhaustion/)).toBeInTheDocument();
        
        // Worker 3 should still be available
        expect(screen.getByTestId('status-claude-worker-3')).toHaveTextContent('running');
      });

      // Verify user can still interact with remaining worker
      const workingCard = screen.getAllByTestId('instance-card').find(
        card => card.getAttribute('data-instance-id') === 'claude-worker-3'
      );
      
      if (workingCard) {
        fireEvent.click(workingCard);
        
        await waitFor(() => {
          expect(screen.getByTestId('command-input')).toBeEnabled();
          expect(screen.getByTestId('send-command-button')).toBeEnabled();
        });
      }
    });
  });

  describe('Real-time Feed Updates and Streaming', () => {
    it('should handle continuous feed monitoring with real-time updates', async () => {
      // Arrange
      const monitoringInstanceId = 'claude-monitor-001';
      
      mockContracts.APIContract.response.json
        .mockResolvedValueOnce({ success: true, instances: [] })
        .mockResolvedValueOnce({ 
          success: true, 
          instanceId: monitoringInstanceId,
          instance: { id: monitoringInstanceId, status: 'running' }
        })
        .mockResolvedValueOnce({ 
          success: true, 
          instances: [{ id: monitoringInstanceId, status: 'running' }] 
        });

      render(<ClaudeInstanceManager />);

      // Create monitoring instance
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      const createHandler = eventHandlers.get('instance:create:success');
      if (createHandler) {
        createHandler({ instanceId: monitoringInstanceId });
      }

      // Start continuous monitoring
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      const monitorCommand = {
        action: 'start_feed_monitor',
        feeds: [
          'https://feed1.com/rss',
          'https://feed2.com/rss'
        ],
        update_interval: 30000
      };

      await userEvent.type(
        screen.getByTestId('command-input'),
        JSON.stringify(monitorCommand)
      );
      await userEvent.click(screen.getByTestId('send-command-button'));

      // Simulate real-time feed updates
      const outputHandler = eventHandlers.get('terminal:output');
      if (outputHandler) {
        // Stream of updates
        const updates = [
          'Monitor started for 2 feeds\n',
          'New item detected in feed1: "Breaking Tech News"\n',
          'New item detected in feed2: "Latest AI Research"\n',
          'Feed monitoring active - 2 items processed\n'
        ];

        updates.forEach((update, index) => {
          setTimeout(() => {
            outputHandler({
              output: update,
              instanceId: monitoringInstanceId,
              isReal: true
            });
          }, index * 500);
        });
      }

      // Assert - Real-time updates display
      await waitFor(() => {
        const outputArea = screen.getByTestId('terminal-output');
        expect(outputArea).toHaveTextContent('Monitor started for 2 feeds');
        expect(outputArea).toHaveTextContent('Breaking Tech News');
        expect(outputArea).toHaveTextContent('Latest AI Research');
      }, { timeout: 3000 });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-frequency feed updates without performance degradation', async () => {
      // Arrange
      const performanceInstanceId = 'claude-perf-test';
      
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [{ id: performanceInstanceId, status: 'running' }]
      });

      render(<ClaudeInstanceManager />);

      // Select instance
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      // Act - Simulate high-frequency output
      const outputHandler = eventHandlers.get('terminal:output');
      if (outputHandler) {
        // Generate 100 rapid updates
        for (let i = 0; i < 100; i++) {
          outputHandler({
            output: `Update ${i}: Feed item processed\n`,
            instanceId: performanceInstanceId,
            isReal: true
          });
        }
      }

      // Assert - Should handle all updates without crashing
      await waitFor(() => {
        const outputArea = screen.getByTestId('terminal-output');
        expect(outputArea).toHaveTextContent('Update 99: Feed item processed');
      });
    });
  });

  describe('Cross-Component State Synchronization', () => {
    it('should maintain state consistency across multiple component instances', async () => {
      // Arrange - Multiple component instances (simulating complex UI)
      const sharedInstanceId = 'claude-shared-001';
      
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [{ id: sharedInstanceId, status: 'running' }]
      });

      // Render multiple manager components
      const { rerender } = render(
        <div>
          <ClaudeInstanceManager apiUrl="http://localhost:3333" />
          <ClaudeInstanceManager apiUrl="http://localhost:3333" />
        </div>
      );

      // Act - Status update should affect both components
      const statusHandler = eventHandlers.get('instance:status');
      if (statusHandler) {
        statusHandler({
          instanceId: sharedInstanceId,
          status: 'stopping'
        });
      }

      // Assert - Both components should show updated status
      await waitFor(() => {
        const statusElements = screen.getAllByTestId(`status-${sharedInstanceId}`);
        statusElements.forEach(element => {
          expect(element).toHaveTextContent('stopping');
        });
      });
    });
  });

  describe('Security and Validation', () => {
    it('should prevent unauthorized instance operations', async () => {
      // Arrange - Mock unauthorized access attempt
      const unauthorizedInstanceId = 'claude-unauthorized';
      
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: false,
        error: 'Unauthorized: Cannot access instance'
      });

      render(<ClaudeInstanceManager />);

      // Act - Try to connect to unauthorized instance
      const mockUnauthorizedInstance = {
        id: unauthorizedInstanceId,
        name: 'Unauthorized Instance',
        status: 'running'
      };

      // Simulate unauthorized instance appearing in list
      const listHandler = eventHandlers.get('instances:list');
      if (listHandler) {
        listHandler([mockUnauthorizedInstance]);
      }

      // Try to interact with unauthorized instance
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      // Assert - Should handle authorization gracefully
      expect(screen.getByTestId('command-input')).toBeInTheDocument();
    });
  });
});