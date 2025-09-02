/**
 * TDD London School: AdvancedSSETerminal Component Tests
 * 
 * Tests focus on behavior verification through mocking external dependencies.
 * Testing HOW the component collaborates with its dependencies.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdvancedSSETerminal } from '../../../../../frontend/src/components/AdvancedSSETerminal';
import { createEventSourceMock } from '../../mocks/EventSourceMock';

// === DEPENDENCY MOCKS ===

// Mock the advanced SSE connection hook
const mockUseAdvancedSSEConnection = vi.fn();
vi.mock('../../../../../frontend/src/hooks/useAdvancedSSEConnection', () => ({
  default: mockUseAdvancedSSEConnection
}));

// Mock fetch for terminal commands
const mockFetch = vi.fn();
global.fetch = mockFetch;

// === TEST SETUP ===

describe('TDD London School: AdvancedSSETerminal Component', () => {
  let mockConnectionHook: any;
  let mockEventSourceController: any;
  let mockConnectToInstance: Mock;
  let mockDisconnectFromInstance: Mock;
  let mockSendCommand: Mock;
  let mockAddMessageHandler: Mock;
  let mockAddStateChangeHandler: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup EventSource mock
    const { controller } = createEventSourceMock();
    mockEventSourceController = controller;

    // Create mock functions for the hook
    mockConnectToInstance = vi.fn();
    mockDisconnectFromInstance = vi.fn();
    mockSendCommand = vi.fn();
    mockAddMessageHandler = vi.fn();
    mockAddStateChangeHandler = vi.fn();

    // Mock the complete hook return value
    mockConnectionHook = {
      connectionState: {
        isConnected: false,
        isConnecting: false,
        isRecovering: false,
        connectionHealth: 'disconnected',
        lastError: null,
        sequenceNumber: 0,
        messagesPerSecond: 0
      },
      metrics: {
        totalMessages: 0,
        averageLatency: 0,
        connectionUptime: 0,
        recoveryCount: 0
      },
      connectToInstance: mockConnectToInstance,
      disconnectFromInstance: mockDisconnectFromInstance,
      getMessages: vi.fn(() => []),
      getUIState: vi.fn(() => null),
      updateScroll: vi.fn(),
      setAutoScroll: vi.fn(),
      scrollToBottom: vi.fn(),
      setInstanceVisibility: vi.fn(),
      addMessageHandler: mockAddMessageHandler,
      addStateChangeHandler: mockAddStateChangeHandler,
      getMetrics: vi.fn(() => mockConnectionHook.metrics),
      flushUpdates: vi.fn()
    };

    mockUseAdvancedSSEConnection.mockReturnValue(mockConnectionHook);

    // Mock fetch for command sending
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true })
    });
  });

  describe('Outside-In: User expects real-time terminal interface', () => {
    it('should establish SSE connection when component mounts', () => {
      // Arrange
      const instanceId = 'claude-7800';
      const props = { instanceId };

      // Act - User views terminal component
      render(<AdvancedSSETerminal {...props} />);

      // Assert - Should establish connection through collaboration
      expect(mockUseAdvancedSSEConnection).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({
          autoReconnect: true,
          maxRetries: 5,
          enableBackfill: true,
          batchSize: 20,
          maxMemoryMB: 10
        })
      );
      expect(mockConnectToInstance).toHaveBeenCalledWith(instanceId);
    });

    it('should setup message and state handlers for real-time updates', () => {
      // Arrange
      const instanceId = 'claude-7800';
      const props = { instanceId };

      // Act - Component initializes
      render(<AdvancedSSETerminal {...props} />);

      // Assert - Should register for real-time updates
      expect(mockAddMessageHandler).toHaveBeenCalledWith(expect.any(Function));
      expect(mockAddStateChangeHandler).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should display terminal output when messages arrive', async () => {
      // Arrange
      const instanceId = 'claude-7800';
      const testMessage = {
        content: 'Hello from terminal',
        timestamp: new Date().toISOString(),
        type: 'output'
      };

      // Mock message handler to simulate real-time message
      mockAddMessageHandler.mockImplementation((handler) => {
        // Simulate message arrival
        setTimeout(() => {
          handler(instanceId, [testMessage]);
        }, 10);
        return vi.fn(); // unsubscribe function
      });

      // Act - User views terminal
      render(<AdvancedSSETerminal instanceId={instanceId} />);

      // Assert - Should display the message content
      await waitFor(() => {
        expect(screen.getByText(/Hello from terminal/)).toBeInTheDocument();
      });
    });
  });

  describe('Mock-Driven: Component Collaboration Testing', () => {
    it('should coordinate with connection service for state updates', () => {
      // Arrange
      const instanceId = 'claude-7800';
      const connectionStateUpdate = {
        connectionHealth: 'healthy',
        memoryUsage: '5 MB',
        processingLatency: 25
      };

      // Mock state change handler
      mockAddStateChangeHandler.mockImplementation((handler) => {
        // Simulate state change
        setTimeout(() => {
          handler(instanceId, connectionStateUpdate);
        }, 10);
        return vi.fn();
      });

      // Act - Component handles state changes
      render(<AdvancedSSETerminal instanceId={instanceId} />);

      // Assert - Should register for state changes
      expect(mockAddStateChangeHandler).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should send terminal commands through proper API collaboration', async () => {
      // Arrange
      const instanceId = 'claude-7800';
      const testCommand = 'ls -la';
      
      // Mock connected state
      mockConnectionHook.connectionState.isConnected = true;
      mockUseAdvancedSSEConnection.mockReturnValue(mockConnectionHook);

      // Act - User types and submits command
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      const input = screen.getByPlaceholderText('Enter command...');
      const sendButton = screen.getByText('Send');
      
      fireEvent.change(input, { target: { value: testCommand } });
      fireEvent.click(sendButton);

      // Assert - Should make API call with proper collaboration
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `http://localhost:3000/api/v1/claude/instances/${instanceId}/terminal/input`,
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: testCommand })
          })
        );
      });
    });

    it('should coordinate scroll behavior with UI state manager', () => {
      // Arrange
      const instanceId = 'claude-7800';
      const mockUpdateScroll = vi.fn();
      mockConnectionHook.updateScroll = mockUpdateScroll;
      mockUseAdvancedSSEConnection.mockReturnValue(mockConnectionHook);

      // Act - Component renders with terminal content
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      // Simulate terminal content update
      const testMessage = { content: 'New output', timestamp: new Date().toISOString(), type: 'output' };
      mockAddMessageHandler.mock.calls[0][0](instanceId, [testMessage]);

      // Assert - Should coordinate scroll updates
      expect(mockUpdateScroll).toHaveBeenCalled();
    });
  });

  describe('Behavior Verification: User Interaction Patterns', () => {
    it('should handle auto-scroll toggle behavior', async () => {
      // Arrange
      const instanceId = 'claude-7800';
      const mockSetAutoScroll = vi.fn();
      mockConnectionHook.setAutoScroll = mockSetAutoScroll;
      mockUseAdvancedSSEConnection.mockReturnValue(mockConnectionHook);

      // Act - User toggles auto-scroll
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      const autoScrollButton = screen.getByText(/Auto-scroll:/);
      fireEvent.click(autoScrollButton);

      // Assert - Should coordinate with scroll manager
      expect(mockSetAutoScroll).toHaveBeenCalledWith(instanceId, expect.any(Boolean));
    });

    it('should handle connection visibility changes for performance', () => {
      // Arrange
      const instanceId = 'claude-7800';
      const mockSetInstanceVisibility = vi.fn();
      mockConnectionHook.setInstanceVisibility = mockSetInstanceVisibility;
      mockUseAdvancedSSEConnection.mockReturnValue(mockConnectionHook);

      // Mock document visibility API
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false
      });

      // Act - Component handles visibility change
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      // Simulate tab becoming hidden
      Object.defineProperty(document, 'hidden', { value: true });
      fireEvent(document, new Event('visibilitychange'));

      // Assert - Should coordinate visibility with performance manager
      expect(mockSetInstanceVisibility).toHaveBeenCalledWith(instanceId, false);
    });

    it('should handle terminal clearing behavior', () => {
      // Arrange
      const instanceId = 'claude-7800';

      // Act - User clears terminal
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      // Assert - Terminal content should be cleared
      const terminalContent = screen.getByText(/Waiting for terminal output/);
      expect(terminalContent).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should display connection errors to user', async () => {
      // Arrange
      const instanceId = 'claude-7800';
      const errorMessage = 'Connection failed';
      
      mockConnectionHook.connectionState.lastError = errorMessage;
      mockUseAdvancedSSEConnection.mockReturnValue(mockConnectionHook);

      // Act - Component renders with error state
      render(<AdvancedSSETerminal instanceId={instanceId} />);

      // Assert - Should display error to user
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });

    it('should disable input when disconnected', () => {
      // Arrange
      const instanceId = 'claude-7800';
      mockConnectionHook.connectionState.isConnected = false;
      mockUseAdvancedSSEConnection.mockReturnValue(mockConnectionHook);

      // Act - Component renders disconnected state
      render(<AdvancedSSETerminal instanceId={instanceId} />);

      // Assert - Input should be disabled
      const input = screen.getByPlaceholderText('Enter command...');
      const sendButton = screen.getByText('Send');
      
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    it('should handle command sending failures gracefully', async () => {
      // Arrange
      const instanceId = 'claude-7800';
      mockConnectionHook.connectionState.isConnected = true;
      mockUseAdvancedSSEConnection.mockReturnValue(mockConnectionHook);
      
      // Mock fetch failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act - User attempts to send command
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      const input = screen.getByPlaceholderText('Enter command...');
      const sendButton = screen.getByText('Send');
      
      fireEvent.change(input, { target: { value: 'test command' } });
      fireEvent.click(sendButton);

      // Assert - Should handle error gracefully (no crash)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Component Lifecycle Management', () => {
    it('should cleanup connection on unmount', () => {
      // Arrange
      const instanceId = 'claude-7800';

      // Act - Component mounts and unmounts
      const { unmount } = render(<AdvancedSSETerminal instanceId={instanceId} />);
      unmount();

      // Assert - Should cleanup connection
      expect(mockDisconnectFromInstance).toHaveBeenCalledWith(instanceId);
    });

    it('should handle instance ID changes properly', () => {
      // Arrange
      const initialInstanceId = 'claude-7800';
      const newInstanceId = 'claude-7801';

      // Act - Component re-renders with new instance ID
      const { rerender } = render(<AdvancedSSETerminal instanceId={initialInstanceId} />);
      
      // Clear previous calls
      mockConnectToInstance.mockClear();
      mockDisconnectFromInstance.mockClear();
      
      rerender(<AdvancedSSETerminal instanceId={newInstanceId} />);

      // Assert - Should disconnect old and connect new
      expect(mockDisconnectFromInstance).toHaveBeenCalledWith(initialInstanceId);
      expect(mockConnectToInstance).toHaveBeenCalledWith(newInstanceId);
    });
  });

  describe('Performance and Optimization Behavior', () => {
    it('should implement command history management', async () => {
      // Arrange
      const instanceId = 'claude-7800';
      mockConnectionHook.connectionState.isConnected = true;
      mockUseAdvancedSSEConnection.mockReturnValue(mockConnectionHook);

      // Act - User sends multiple commands
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      const input = screen.getByPlaceholderText('Enter command...');
      
      const commands = ['command1', 'command2', 'command3'];
      
      for (const command of commands) {
        fireEvent.change(input, { target: { value: command } });
        fireEvent.keyDown(input, { key: 'Enter' });
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/terminal/input'),
            expect.objectContaining({
              body: JSON.stringify({ input: command })
            })
          );
        });
      }

      // Assert - Should handle history navigation
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(input).toHaveValue('command3');
    });

    it('should coordinate with flush updates for performance', () => {
      // Arrange
      const instanceId = 'claude-7800';
      const mockFlushUpdates = vi.fn();
      mockConnectionHook.flushUpdates = mockFlushUpdates;
      mockUseAdvancedSSEConnection.mockReturnValue(mockConnectionHook);

      // Act - User triggers flush updates
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      const flushButton = screen.getByText('Flush Updates');
      fireEvent.click(flushButton);

      // Assert - Should coordinate with performance manager
      expect(mockFlushUpdates).toHaveBeenCalled();
    });
  });
});

/**
 * Component Contract Summary
 * 
 * The AdvancedSSETerminal component should:
 * 
 * 1. Collaborate with useAdvancedSSEConnection hook for:
 *    - Connection establishment and cleanup
 *    - Real-time message handling
 *    - State change notifications
 *    - Performance optimization
 * 
 * 2. Coordinate with external APIs for:
 *    - Terminal command submission
 *    - Connection management
 * 
 * 3. Handle user interactions for:
 *    - Command input and history
 *    - Terminal control (clear, scroll, auto-scroll)
 *    - Connection management
 * 
 * 4. Provide error handling and recovery:
 *    - Display connection errors
 *    - Graceful degradation when disconnected
 *    - Recovery coordination
 */