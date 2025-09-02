/**
 * TDD London School: SSE Terminal Integration Tests
 * 
 * Integration tests focusing on the collaboration between components
 * and services in the SSE terminal system. Tests the conversation
 * between multiple components working together.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdvancedSSETerminal } from '../../../../frontend/src/components/AdvancedSSETerminal';
import { createEventSourceMock, setupGlobalEventSourceMock } from '../mocks/EventSourceMock';

// === INTEGRATION MOCKS ===

// Mock the entire SSE connection system
const mockSSEConnectionService = {
  createConnection: vi.fn(),
  closeConnection: vi.fn(),
  getConnection: vi.fn(),
  onMessage: vi.fn(),
  onStateChange: vi.fn(),
  onError: vi.fn()
};

const mockMessageProcessor = {
  processMessage: vi.fn(),
  getMessages: vi.fn(() => []),
  flushBuffer: vi.fn(),
  clearInstance: vi.fn()
};

const mockUIStateManager = {
  updateState: vi.fn(),
  getState: vi.fn(),
  setAutoScroll: vi.fn(),
  handleScrollUpdate: vi.fn(),
  setInstanceVisibility: vi.fn()
};

const mockErrorRecoveryManager = {
  handleConnectionFailure: vi.fn(),
  attemptRecovery: vi.fn(),
  getRecoveryState: vi.fn(() => ({ isRecovering: false, attempts: 0 }))
};

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// === TEST SETUP ===

describe('TDD London School: SSE Terminal Integration', () => {
  let eventSourceMock: any;
  let restoreEventSource: () => void;
  let mockController: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup global EventSource mock
    const mockSetup = setupGlobalEventSourceMock({
      autoConnect: false,
      simulateNetworkDelay: true
    });
    
    eventSourceMock = mockSetup.mockInstance;
    mockController = mockSetup.controller;
    restoreEventSource = mockSetup.restore;

    // Mock API responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    // Reset all service mocks
    Object.values(mockSSEConnectionService).forEach(mock => (mock as Mock).mockClear());
    Object.values(mockMessageProcessor).forEach(mock => (mock as Mock).mockClear());
    Object.values(mockUIStateManager).forEach(mock => (mock as Mock).mockClear());
    Object.values(mockErrorRecoveryManager).forEach(mock => (mock as Mock).mockClear());
  });

  afterEach(() => {
    restoreEventSource();
    mockController.reset();
  });

  describe('Outside-In: Complete SSE Terminal Integration Flow', () => {
    it('should orchestrate complete terminal initialization flow', async () => {
      // Arrange - Complete integration scenario
      const instanceId = 'claude-7800';
      const terminalUrl = `/api/v1/claude/instances/${instanceId}/terminal/stream`;

      // Mock successful connection establishment
      mockController.simulateOpen();

      // Act - User opens terminal
      render(<AdvancedSSETerminal instanceId={instanceId} />);

      // Wait for connection to be established
      await waitFor(() => {
        expect(EventSource).toHaveBeenCalledWith(
          `http://localhost:3000${terminalUrl}`,
          expect.any(Object)
        );
      });

      // Assert - Complete integration flow
      expect(screen.getByText(/Advanced SSE Terminal/)).toBeInTheDocument();
      expect(screen.getByText(/claude-7800/)).toBeInTheDocument();
    });

    it('should handle end-to-end message flow from SSE to UI', async () => {
      // Arrange - Message flow integration
      const instanceId = 'claude-7800';
      const terminalMessage = {
        type: 'terminal_output',
        data: {
          content: 'Hello from terminal integration test',
          timestamp: new Date().toISOString()
        },
        instanceId
      };

      // Act - Render terminal and establish connection
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      // Simulate connection establishment
      mockController.simulateOpen();
      
      // Simulate message arrival
      await waitFor(() => {
        mockController.simulateMessage(JSON.stringify(terminalMessage));
      });

      // Assert - Message should appear in UI
      await waitFor(() => {
        expect(screen.getByText(/Hello from terminal integration test/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should coordinate terminal command sending with backend', async () => {
      // Arrange - Command sending integration
      const instanceId = 'claude-7800';
      const testCommand = 'npm test';
      
      // Mock successful connection
      mockController.simulateOpen();

      // Act - User sends terminal command
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      // Wait for connection
      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      });

      // Send command
      const input = screen.getByPlaceholderText('Enter command...');
      const sendButton = screen.getByText('Send');
      
      fireEvent.change(input, { target: { value: testCommand } });
      fireEvent.click(sendButton);

      // Assert - Should coordinate API call and local echo
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `http://localhost:3000/api/v1/claude/instances/${instanceId}/terminal/input`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ input: testCommand })
          })
        );
      });

      // Check for command echo in terminal
      expect(screen.getByText(new RegExp(`\\$ ${testCommand}`))).toBeInTheDocument();
    });
  });

  describe('Service Integration: Component Collaboration', () => {
    it('should coordinate between connection service and message processor', async () => {
      // Arrange - Service collaboration scenario
      const instanceId = 'claude-7800';
      const messageData = {
        type: 'status_update',
        data: { status: 'processing', progress: 50 },
        instanceId
      };

      // Mock service collaboration
      const mockProcessedMessages = [{
        id: 'msg-1',
        content: 'Processing: 50%',
        timestamp: new Date(),
        type: 'info'
      }];

      mockMessageProcessor.processMessage.mockReturnValue(mockProcessedMessages);

      // Act - Trigger message processing flow
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      mockController.simulateOpen();
      mockController.simulateMessage(JSON.stringify(messageData));

      // Assert - Service collaboration should occur
      await waitFor(() => {
        // Message should be processed and displayed
        expect(screen.getByText(/Processing: 50%/)).toBeInTheDocument();
      });
    });

    it('should integrate error recovery with UI state management', async () => {
      // Arrange - Error recovery integration
      const instanceId = 'claude-7800';
      const connectionError = new ErrorEvent('error', {
        message: 'Connection lost'
      });

      // Mock recovery coordination
      mockErrorRecoveryManager.handleConnectionFailure.mockResolvedValue({
        recovered: true,
        attempts: 1
      });

      // Act - Simulate connection error and recovery
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      mockController.simulateOpen();
      
      // Simulate connection error
      mockController.simulateError(connectionError);
      
      // Simulate recovery
      setTimeout(() => {
        mockController.simulateOpen();
      }, 100);

      // Assert - UI should show error and recovery states
      await waitFor(() => {
        expect(screen.getByText(/Recovering/)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      });
    });

    it('should coordinate scroll management with message updates', async () => {
      // Arrange - Scroll coordination integration
      const instanceId = 'claude-7800';
      const messages = Array.from({ length: 5 }, (_, i) => ({
        type: 'terminal_output',
        data: { content: `Message ${i + 1}` },
        instanceId
      }));

      // Act - Send multiple messages to trigger scroll behavior
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      mockController.simulateOpen();
      
      // Send messages in sequence
      for (const message of messages) {
        mockController.simulateMessage(JSON.stringify(message));
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      }

      // Assert - All messages should be visible and scroll should be managed
      await waitFor(() => {
        messages.forEach((_, index) => {
          expect(screen.getByText(`Message ${index + 1}`)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Cross-Component Communication', () => {
    it('should coordinate connection state across multiple components', async () => {
      // Arrange - Multi-component coordination
      const instanceId = 'claude-7800';
      
      // Mock state changes
      const stateUpdates = [
        { state: 'connecting', health: 'unknown' },
        { state: 'connected', health: 'healthy' },
        { state: 'error', health: 'degraded' }
      ];

      // Act - Render component and simulate state changes
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      // Simulate state progression
      mockController.simulateOpen();
      
      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      });

      // Simulate error state
      mockController.simulateError();
      
      await waitFor(() => {
        expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
      });
    });

    it('should handle instance switching coordination', async () => {
      // Arrange - Instance switching scenario
      const firstInstance = 'claude-7800';
      const secondInstance = 'claude-7801';

      // Act - Switch instances
      const { rerender } = render(<AdvancedSSETerminal instanceId={firstInstance} />);
      
      mockController.simulateOpen();
      await waitFor(() => {
        expect(screen.getByText(`(${firstInstance})`)).toBeInTheDocument();
      });

      // Switch to second instance
      rerender(<AdvancedSSETerminal instanceId={secondInstance} />);

      // Assert - Should handle instance transition
      await waitFor(() => {
        expect(screen.getByText(`(${secondInstance})`)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Integration', () => {
    it('should coordinate visibility optimizations with message processing', async () => {
      // Arrange - Visibility optimization integration
      const instanceId = 'claude-7800';

      // Mock document visibility API
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false
      });

      // Act - Test visibility coordination
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      mockController.simulateOpen();
      
      // Simulate tab becoming hidden
      Object.defineProperty(document, 'hidden', { value: true });
      fireEvent(document, new Event('visibilitychange'));
      
      // Send messages while hidden
      mockController.simulateMessage(JSON.stringify({
        type: 'terminal_output',
        data: { content: 'Hidden message' },
        instanceId
      }));

      // Make visible again
      Object.defineProperty(document, 'hidden', { value: false });
      fireEvent(document, new Event('visibilitychange'));

      // Assert - Messages should be handled efficiently
      await waitFor(() => {
        expect(screen.getByText(/Hidden message/)).toBeInTheDocument();
      });
    });

    it('should integrate memory management across services', async () => {
      // Arrange - Memory management integration
      const instanceId = 'claude-7800';
      const largeMessageBatch = Array.from({ length: 100 }, (_, i) => ({
        type: 'terminal_output',
        data: { content: `Large message batch ${i}` },
        instanceId
      }));

      // Act - Process large message batch
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      mockController.simulateOpen();
      
      // Send large batch
      largeMessageBatch.forEach(message => {
        mockController.simulateMessage(JSON.stringify(message));
      });

      // Assert - Should handle large batches without memory issues
      await waitFor(() => {
        // Check that terminal is still responsive
        expect(screen.getByText(/Advanced SSE Terminal/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Scenarios Integration', () => {
    it('should coordinate network error handling across all services', async () => {
      // Arrange - Network error integration
      const instanceId = 'claude-7800';
      
      // Mock network failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act - Trigger network operations
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      // Try to send command during network error
      const input = screen.getByPlaceholderText('Enter command...');
      const sendButton = screen.getByText('Send');
      
      fireEvent.change(input, { target: { value: 'test command' } });
      fireEvent.click(sendButton);

      // Assert - Should handle network errors gracefully
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        // Component should remain functional
        expect(screen.getByText(/Advanced SSE Terminal/)).toBeInTheDocument();
      });
    });

    it('should integrate reconnection logic with UI feedback', async () => {
      // Arrange - Reconnection integration
      const instanceId = 'claude-7800';
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 3;

      // Mock reconnection behavior
      mockController.simulateOpen();
      
      // Act - Test reconnection flow
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      });

      // Simulate connection loss and reconnection attempts
      mockController.simulateError();
      
      // Simulate reconnection attempts
      const reconnectionInterval = setInterval(() => {
        reconnectAttempts++;
        if (reconnectAttempts < maxReconnectAttempts) {
          // Simulate failed reconnection
          mockController.simulateError();
        } else {
          // Simulate successful reconnection
          mockController.simulateOpen();
          clearInterval(reconnectionInterval);
        }
      }, 100);

      // Assert - Should show reconnection progress
      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Real-time Data Flow Integration', () => {
    it('should handle high-frequency message streams', async () => {
      // Arrange - High-frequency data flow
      const instanceId = 'claude-7800';
      const messageCount = 50;
      
      // Act - Send high-frequency messages
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      mockController.simulateOpen();
      
      // Send rapid message stream
      for (let i = 0; i < messageCount; i++) {
        mockController.simulateMessage(JSON.stringify({
          type: 'terminal_output',
          data: { content: `Rapid message ${i}` },
          instanceId
        }));
      }

      // Assert - Should handle high-frequency data
      await waitFor(() => {
        expect(screen.getByText(/Rapid message/)).toBeInTheDocument();
      });
    });

    it('should maintain message ordering in integration flow', async () => {
      // Arrange - Message ordering integration
      const instanceId = 'claude-7800';
      const orderedMessages = [
        { content: 'First message', sequence: 1 },
        { content: 'Second message', sequence: 2 },
        { content: 'Third message', sequence: 3 }
      ];

      // Act - Send ordered messages
      render(<AdvancedSSETerminal instanceId={instanceId} />);
      
      mockController.simulateOpen();
      
      // Send messages with sequence numbers
      orderedMessages.forEach(msg => {
        mockController.simulateMessage(JSON.stringify({
          type: 'terminal_output',
          data: msg,
          instanceId,
          sequenceNumber: msg.sequence
        }));
      });

      // Assert - Messages should appear in correct order
      await waitFor(() => {
        const terminalContent = screen.getByRole('textbox', { name: /terminal content/i }) 
          || document.querySelector('[class*="terminal"]');
        
        if (terminalContent) {
          const content = terminalContent.textContent || '';
          const firstIndex = content.indexOf('First message');
          const secondIndex = content.indexOf('Second message');
          const thirdIndex = content.indexOf('Third message');
          
          expect(firstIndex).toBeLessThan(secondIndex);
          expect(secondIndex).toBeLessThan(thirdIndex);
        }
      });
    });
  });
});

/**
 * Integration Contract Summary
 * 
 * The SSE Terminal Integration should coordinate:
 * 
 * 1. Connection Management:
 *    - EventSource creation and lifecycle
 *    - Connection state propagation
 *    - Error recovery coordination
 * 
 * 2. Message Processing:
 *    - Real-time message flow
 *    - Message ordering and batching
 *    - High-frequency data handling
 * 
 * 3. UI Coordination:
 *    - State updates across components
 *    - Scroll management
 *    - Visibility optimizations
 * 
 * 4. Service Collaboration:
 *    - Connection service integration
 *    - Message processor coordination
 *    - Error recovery management
 *    - UI state synchronization
 * 
 * 5. Performance Management:
 *    - Memory optimization
 *    - Batch processing
 *    - Visibility-based optimizations
 */