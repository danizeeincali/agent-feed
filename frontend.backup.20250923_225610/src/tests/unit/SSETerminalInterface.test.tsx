/**
 * Unit Tests for SSETerminalInterface Component
 * 
 * Tests the SSE-based Interactive Control tab functionality including:
 * - Component rendering and state management
 * - SSE connection handling 
 * - Command input processing
 * - Real-time output display
 * - Connection status indicators
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach, MockedFunction } from 'vitest';
import SSETerminalInterface from '../../components/claude-manager/SSETerminalInterface';
import * as useSSEClaudeInstanceModule from '../../hooks/useSSEClaudeInstance';
import { ConnectionState } from '../../managers/ClaudeInstanceManager';

// Mock the useSSEClaudeInstance hook
const mockUseSSEClaudeInstance = vi.fn();
vi.mock('../../hooks/useSSEClaudeInstance', () => ({
  useSSEClaudeInstance: mockUseSSEClaudeInstance
}));

// Mock CSS import
vi.mock('../../components/claude-manager/claude-manager.css', () => ({}));

describe('SSETerminalInterface', () => {
  const mockConnectToInstance = vi.fn();
  const mockDisconnectFromInstance = vi.fn();
  const mockSendCommand = vi.fn();
  const mockClearOutput = vi.fn();
  const mockOnConnectionChange = vi.fn();

  const defaultHookReturn = {
    isConnected: false,
    connectionState: ConnectionState.DISCONNECTED,
    connectionError: null,
    output: [],
    connectToInstance: mockConnectToInstance,
    disconnectFromInstance: mockDisconnectFromInstance,
    sendCommand: mockSendCommand,
    clearOutput: mockClearOutput,
    loading: false,
    messageCount: 0,
    lastActivity: null
  };

  const defaultProps = {
    instanceId: 'claude-8251',
    apiUrl: 'http://localhost:3000',
    autoConnect: true,
    onConnectionChange: mockOnConnectionChange
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSSEClaudeInstance.mockReturnValue(defaultHookReturn);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Component Rendering', () => {
    it('should render terminal interface with instance ID', () => {
      render(<SSETerminalInterface {...defaultProps} />);
      
      expect(screen.getByText(/Terminal - claude-8251/)).toBeInTheDocument();
      expect(screen.getByText('claude-8251')).toBeInTheDocument();
    });

    it('should show disconnected status initially', () => {
      render(<SSETerminalInterface {...defaultProps} />);
      
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('Connect')).toBeInTheDocument();
    });

    it('should display welcome message when no output', () => {
      render(<SSETerminalInterface {...defaultProps} />);
      
      expect(screen.getByText(/Terminal ready/)).toBeInTheDocument();
    });

    it('should show command input with correct placeholder', () => {
      render(<SSETerminalInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Connect to instance to send commands');
      expect(input).toBeInTheDocument();
      expect(input).toBeDisabled();
    });
  });

  describe('Connection Handling', () => {
    it('should auto-connect when instanceId is provided and autoConnect is true', () => {
      render(<SSETerminalInterface {...defaultProps} />);
      
      expect(mockConnectToInstance).toHaveBeenCalledWith('claude-8251');
    });

    it('should not auto-connect when autoConnect is false', () => {
      render(<SSETerminalInterface {...defaultProps} autoConnect={false} />);
      
      expect(mockConnectToInstance).not.toHaveBeenCalled();
    });

    it('should handle connection state changes correctly', () => {
      const { rerender } = render(<SSETerminalInterface {...defaultProps} />);
      
      // Test connected state
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectionState: ConnectionState.CONNECTED,
        messageCount: 5
      });
      
      rerender(<SSETerminalInterface {...defaultProps} />);
      
      expect(screen.getByText('Connected (5 messages)')).toBeInTheDocument();
      expect(screen.getByText('Disconnect')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type command and press Enter...')).toBeInTheDocument();
    });

    it('should display connection error when present', () => {
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        connectionState: ConnectionState.ERROR,
        connectionError: 'Failed to connect to SSE stream'
      });
      
      render(<SSETerminalInterface {...defaultProps} />);
      
      expect(screen.getByText('Error: Failed to connect to SSE stream')).toBeInTheDocument();
      expect(screen.getByText('Failed to connect to SSE stream')).toBeInTheDocument();
    });

    it('should call onConnectionChange when connection state changes', () => {
      const { rerender } = render(<SSETerminalInterface {...defaultProps} />);
      
      // Mock connected state
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectionState: ConnectionState.CONNECTED
      });
      
      rerender(<SSETerminalInterface {...defaultProps} />);
      
      expect(mockOnConnectionChange).toHaveBeenCalledWith(true, 'claude-8251');
    });
  });

  describe('Command Input', () => {
    beforeEach(() => {
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectionState: ConnectionState.CONNECTED
      });
    });

    it('should enable input when connected', () => {
      render(<SSETerminalInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type command and press Enter...');
      expect(input).toBeEnabled();
    });

    it('should send command when Enter key is pressed', async () => {
      const user = userEvent.setup();
      render(<SSETerminalInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type command and press Enter...');
      await user.type(input, 'ls -la');
      await user.keyboard('{Enter}');
      
      expect(mockSendCommand).toHaveBeenCalledWith('claude-8251', 'ls -la');
    });

    it('should send command when Send button is clicked', async () => {
      const user = userEvent.setup();
      render(<SSETerminalInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type command and press Enter...');
      const sendButton = screen.getByText('Send');
      
      await user.type(input, 'pwd');
      await user.click(sendButton);
      
      expect(mockSendCommand).toHaveBeenCalledWith('claude-8251', 'pwd');
    });

    it('should clear input after sending command', async () => {
      const user = userEvent.setup();
      render(<SSETerminalInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type command and press Enter...') as HTMLInputElement;
      
      await user.type(input, 'echo "test"');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should not send empty commands', async () => {
      const user = userEvent.setup();
      render(<SSETerminalInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type command and press Enter...');
      await user.type(input, '   ');
      await user.keyboard('{Enter}');
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it('should handle command history navigation', async () => {
      const user = userEvent.setup();
      render(<SSETerminalInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type command and press Enter...') as HTMLInputElement;
      
      // Send first command
      await user.type(input, 'first command');
      await user.keyboard('{Enter}');
      
      // Send second command
      await user.type(input, 'second command');
      await user.keyboard('{Enter}');
      
      // Navigate history
      await user.keyboard('{ArrowUp}');
      expect(input.value).toBe('second command');
      
      await user.keyboard('{ArrowUp}');
      expect(input.value).toBe('first command');
      
      await user.keyboard('{ArrowDown}');
      expect(input.value).toBe('second command');
      
      await user.keyboard('{ArrowDown}');
      expect(input.value).toBe('');
    });

    it('should clear input on Escape key', async () => {
      const user = userEvent.setup();
      render(<SSETerminalInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type command and press Enter...') as HTMLInputElement;
      
      await user.type(input, 'some command');
      await user.keyboard('{Escape}');
      
      expect(input.value).toBe('');
    });
  });

  describe('Terminal Output', () => {
    const mockOutputMessages = [
      {
        id: '1',
        instanceId: 'claude-8251',
        type: 'output' as const,
        content: 'Welcome to Claude terminal',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        isReal: true
      },
      {
        id: '2',
        instanceId: 'claude-8251',
        type: 'input' as const,
        content: '> ls -la',
        timestamp: new Date('2024-01-01T10:01:00Z'),
        isReal: true
      }
    ];

    it('should display output messages', () => {
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        output: mockOutputMessages,
        messageCount: 2
      });
      
      render(<SSETerminalInterface {...defaultProps} />);
      
      expect(screen.getByText('Welcome to Claude terminal')).toBeInTheDocument();
      expect(screen.getByText('> ls -la')).toBeInTheDocument();
    });

    it('should show timestamps for output messages', () => {
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        output: mockOutputMessages
      });
      
      render(<SSETerminalInterface {...defaultProps} />);
      
      expect(screen.getByText('10:00:00 AM')).toBeInTheDocument();
      expect(screen.getByText('10:01:00 AM')).toBeInTheDocument();
    });

    it('should handle clear output functionality', async () => {
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        output: mockOutputMessages,
        messageCount: 2
      });
      
      const user = userEvent.setup();
      render(<SSETerminalInterface {...defaultProps} />);
      
      const clearButton = screen.getByText('Clear (2)');
      await user.click(clearButton);
      
      expect(mockClearOutput).toHaveBeenCalledWith('claude-8251');
    });
  });

  describe('Connection Controls', () => {
    it('should toggle connection when connection button is clicked', async () => {
      const user = userEvent.setup();
      
      // Start disconnected
      const { rerender } = render(<SSETerminalInterface {...defaultProps} />);
      
      const connectButton = screen.getByText('Connect');
      await user.click(connectButton);
      expect(mockConnectToInstance).toHaveBeenCalledWith('claude-8251');
      
      // Now mock connected state
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectionState: ConnectionState.CONNECTED
      });
      
      rerender(<SSETerminalInterface {...defaultProps} />);
      
      const disconnectButton = screen.getByText('Disconnect');
      await user.click(disconnectButton);
      expect(mockDisconnectFromInstance).toHaveBeenCalledWith('claude-8251');
    });

    it('should disable controls when loading', () => {
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        loading: true
      });
      
      render(<SSETerminalInterface {...defaultProps} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Loading...').closest('button')).toBeDisabled();
    });

    it('should show last activity timestamp when available', () => {
      const lastActivity = new Date('2024-01-01T10:30:00Z');
      
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        lastActivity
      });
      
      render(<SSETerminalInterface {...defaultProps} />);
      
      expect(screen.getByText(/Last: 10:30:00 AM/)).toBeInTheDocument();
    });
  });

  describe('Multiple Claude Instances', () => {
    const instanceIds = ['claude-8251', 'claude-3494', 'claude-2023', 'claude-9392', 'claude-4411'];

    instanceIds.forEach(instanceId => {
      it(`should handle connection to instance ${instanceId}`, () => {
        render(<SSETerminalInterface {...defaultProps} instanceId={instanceId} />);
        
        expect(screen.getByText(new RegExp(`Terminal - ${instanceId.slice(0, 12)}`))).toBeInTheDocument();
        expect(mockConnectToInstance).toHaveBeenCalledWith(instanceId);
      });

      it(`should send commands to correct instance ${instanceId}`, async () => {
        mockUseSSEClaudeInstance.mockReturnValue({
          ...defaultHookReturn,
          isConnected: true,
          connectionState: ConnectionState.CONNECTED
        });
        
        const user = userEvent.setup();
        render(<SSETerminalInterface {...defaultProps} instanceId={instanceId} />);
        
        const input = screen.getByPlaceholderText('Type command and press Enter...');
        await user.type(input, 'test command');
        await user.keyboard('{Enter}');
        
        expect(mockSendCommand).toHaveBeenCalledWith(instanceId, 'test command');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', () => {
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        connectionState: ConnectionState.ERROR,
        connectionError: 'SSE connection failed'
      });
      
      render(<SSETerminalInterface {...defaultProps} />);
      
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('SSE connection failed')).toBeInTheDocument();
    });

    it('should handle command send failures', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('Command failed'));
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectionState: ConnectionState.CONNECTED
      });
      
      const user = userEvent.setup();
      render(<SSETerminalInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type command and press Enter...');
      await user.type(input, 'failing command');
      await user.keyboard('{Enter}');
      
      // Should not crash the component
      expect(screen.getByText(/Terminal - claude-8251/)).toBeInTheDocument();
    });

    it('should handle missing instanceId gracefully', () => {
      render(<SSETerminalInterface {...defaultProps} instanceId="" />);
      
      expect(screen.getByText(/Terminal -/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectionState: ConnectionState.CONNECTED
      });
      
      render(<SSETerminalInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type command and press Enter...');
      expect(input).toHaveAttribute('autoComplete', 'off');
      expect(input).toHaveAttribute('spellCheck', 'false');
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button).toHaveAttribute('title');
      });
    });

    it('should support keyboard navigation', async () => {
      mockUseSSEClaudeInstance.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectionState: ConnectionState.CONNECTED
      });
      
      render(<SSETerminalInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type command and press Enter...');
      
      // Should be able to focus input
      input.focus();
      expect(document.activeElement).toBe(input);
    });
  });
});