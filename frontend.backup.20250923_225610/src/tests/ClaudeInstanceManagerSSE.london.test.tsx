/**
 * TDD London School Tests for ClaudeInstanceManagerSSE Component
 * 
 * Mock-driven component interaction testing focusing on user workflows,
 * hook integration, and UI state synchronization contracts.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClaudeInstanceManagerSSE from '../../components/ClaudeInstanceManagerSSE';
import { SSEConnectionState } from '../../services/SSEClaudeInstanceManager';

// Mock the SSE Claude Manager hook
const mockHookReturn = {
  connectionState: SSEConnectionState.DISCONNECTED,
  isConnected: false,
  error: null,
  messages: [],
  instances: [],
  selectedInstance: null,
  connecting: false,
  sendingCommand: false,
  creatingInstance: false,
  terminatingInstance: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
  sendInput: jest.fn(),
  createInstance: jest.fn(),
  terminateInstance: jest.fn(),
  refreshInstances: jest.fn(),
  selectInstance: jest.fn(),
  clearHistory: jest.fn(),
  getStatistics: jest.fn().mockReturnValue({})
};

jest.mock('../../hooks/useSSEClaudeManager', () => ({
  useSSEClaudeManager: jest.fn(() => mockHookReturn)
}));

// Mock UI components
jest.mock('../../components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={`card ${className || ''}`}>{children}</div>,
  CardHeader: ({ children }: any) => <div className="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 className="card-title">{children}</h3>,
  CardContent: ({ children }: any) => <div className="card-content">{children}</div>
}));

jest.mock('../../components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span className={`badge badge-${variant}`}>{children}</span>
}));

describe('ClaudeInstanceManagerSSE - London School TDD', () => {
  let mockHook: typeof mockHookReturn;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock hook to default state
    mockHook = {
      ...mockHookReturn,
      connectionState: SSEConnectionState.DISCONNECTED,
      isConnected: false,
      error: null,
      messages: [],
      instances: [],
      selectedInstance: null,
      connecting: false,
      sendingCommand: false,
      creatingInstance: false,
      terminatingInstance: false
    };

    // Re-mock with fresh state
    const { useSSEClaudeManager } = require('../../hooks/useSSEClaudeManager');
    useSSEClaudeManager.mockReturnValue(mockHook);
  });

  describe('Component Initialization Behavior Contract', () => {
    it('should coordinate hook initialization with provided configuration', () => {
      const apiUrl = 'http://custom-api:3000';
      const autoConnect = true;

      render(
        <ClaudeInstanceManagerSSE 
          apiUrl={apiUrl} 
          autoConnect={autoConnect} 
        />
      );

      const { useSSEClaudeManager } = require('../../hooks/useSSEClaudeManager');
      expect(useSSEClaudeManager).toHaveBeenCalledWith({
        apiBaseUrl: apiUrl,
        autoConnect
      });
    });

    it('should use default configuration when none provided', () => {
      render(<ClaudeInstanceManagerSSE />);

      const { useSSEClaudeManager } = require('../../hooks/useSSEClaudeManager');
      expect(useSSEClaudeManager).toHaveBeenCalledWith({
        apiBaseUrl: 'http://localhost:3000',
        autoConnect: false
      });
    });
  });

  describe('Connection Status Display Contract', () => {
    it('should coordinate connection status display with hook state', () => {
      mockHook.connectionState = SSEConnectionState.CONNECTED;
      mockHook.isConnected = true;
      mockHook.selectedInstance = {
        id: 'claude-instance-12345678',
        name: 'Test Instance',
        status: 'running'
      };

      render(<ClaudeInstanceManagerSSE />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Instance: claude-insta...')).toBeInTheDocument();
    });

    it('should display connection error states correctly', () => {
      mockHook.connectionState = SSEConnectionState.ERROR;
      mockHook.error = 'Connection failed';

      render(<ClaudeInstanceManagerSSE />);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Error: Connection failed')).toBeInTheDocument();
    });

    it('should display reconnecting state appropriately', () => {
      mockHook.connectionState = SSEConnectionState.RECONNECTING;

      render(<ClaudeInstanceManagerSSE />);

      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    });
  });

  describe('Instance Creation Behavior Contract', () => {
    it('should coordinate instance creation with hook through button interactions', async () => {
      const user = userEvent.setup();
      const mockCreateInstance = jest.fn().mockResolvedValue({
        id: 'claude-new123',
        name: 'New Instance',
        status: 'running'
      });
      mockHook.createInstance = mockCreateInstance;

      render(<ClaudeInstanceManagerSSE />);

      const standardButton = screen.getByText('🚀 Standard Claude');
      await user.click(standardButton);

      expect(mockCreateInstance).toHaveBeenCalledWith({
        type: 'dev',
        workingDirectory: '/workspaces/agent-feed',
        command: 'claude'
      });
    });

    it('should coordinate skip permissions instance creation', async () => {
      const user = userEvent.setup();
      const mockCreateInstance = jest.fn().mockResolvedValue({
        id: 'claude-skip123',
        status: 'running'
      });
      mockHook.createInstance = mockCreateInstance;

      render(<ClaudeInstanceManagerSSE />);

      const skipButton = screen.getByText('⚡ Skip Permissions');
      await user.click(skipButton);

      expect(mockCreateInstance).toHaveBeenCalledWith({
        type: 'dev',
        workingDirectory: '/workspaces/agent-feed',
        command: 'claude --dangerously-skip-permissions'
      });
    });

    it('should handle instance creation with auto-connect workflow', async () => {
      const user = userEvent.setup();
      const mockInstance = {
        id: 'claude-auto123',
        name: 'Auto Instance',
        status: 'running'
      };
      
      const mockCreateInstance = jest.fn().mockResolvedValue(mockInstance);
      const mockSelectInstance = jest.fn();
      const mockConnect = jest.fn();
      
      mockHook.createInstance = mockCreateInstance;
      mockHook.selectInstance = mockSelectInstance;
      mockHook.connect = mockConnect;

      render(<ClaudeInstanceManagerSSE />);

      const standardButton = screen.getByText('🚀 Standard Claude');
      await user.click(standardButton);

      await waitFor(() => {
        expect(mockSelectInstance).toHaveBeenCalledWith(mockInstance);
      });

      // Auto-connect should be scheduled
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockConnect).toHaveBeenCalledWith(mockInstance.id);
    });

    it('should disable creation buttons when creating instance', () => {
      mockHook.creatingInstance = true;

      render(<ClaudeInstanceManagerSSE />);

      const buttons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('Standard Claude') ||
        btn.textContent?.includes('Skip Permissions') ||
        btn.textContent?.includes('Resume')
      );

      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Instance Selection Behavior Contract', () => {
    it('should coordinate instance selection with state management', async () => {
      const user = userEvent.setup();
      const mockInstances = [
        { id: 'claude-instance1', name: 'Instance 1', status: 'running' },
        { id: 'claude-instance2', name: 'Instance 2', status: 'stopped' }
      ];
      
      const mockSelectInstance = jest.fn();
      const mockConnect = jest.fn().mockResolvedValue(undefined);
      const mockDisconnect = jest.fn().mockResolvedValue(undefined);
      
      mockHook.instances = mockInstances;
      mockHook.selectedInstance = mockInstances[0];
      mockHook.isConnected = true;
      mockHook.selectInstance = mockSelectInstance;
      mockHook.connect = mockConnect;
      mockHook.disconnect = mockDisconnect;

      render(<ClaudeInstanceManagerSSE />);

      // Click on second instance
      const instanceCard = screen.getByText('Instance 2').closest('div');
      await user.click(instanceCard!);

      expect(mockDisconnect).toHaveBeenCalled(); // Should disconnect from current first
      expect(mockSelectInstance).toHaveBeenCalledWith(mockInstances[1]);
    });

    it('should auto-connect to running instances when selected', async () => {
      const user = userEvent.setup();
      const runningInstance = { 
        id: 'claude-running123', 
        name: 'Running Instance', 
        status: 'running' 
      };
      
      const mockConnect = jest.fn().mockResolvedValue(undefined);
      mockHook.instances = [runningInstance];
      mockHook.connect = mockConnect;

      render(<ClaudeInstanceManagerSSE />);

      const instanceCard = screen.getByText('Running Instance').closest('div');
      await user.click(instanceCard!);

      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledWith(runningInstance.id);
      });
    });

    it('should not auto-connect to stopped instances', async () => {
      const user = userEvent.setup();
      const stoppedInstance = { 
        id: 'claude-stopped123', 
        name: 'Stopped Instance', 
        status: 'stopped' 
      };
      
      const mockConnect = jest.fn();
      mockHook.instances = [stoppedInstance];
      mockHook.connect = mockConnect;

      render(<ClaudeInstanceManagerSSE />);

      const instanceCard = screen.getByText('Stopped Instance').closest('div');
      await user.click(instanceCard!);

      await waitFor(() => {
        expect(mockConnect).not.toHaveBeenCalled();
      });
    });
  });

  describe('Terminal Interface Behavior Contract', () => {
    it('should coordinate input sending with hook when connected', async () => {
      const user = userEvent.setup();
      const testCommand = 'ls -la';
      
      mockHook.isConnected = true;
      mockHook.selectedInstance = { id: 'claude-test123', name: 'Test', status: 'running' };
      const mockSendInput = jest.fn().mockResolvedValue(undefined);
      mockHook.sendInput = mockSendInput;

      render(<ClaudeInstanceManagerSSE />);

      const input = screen.getByPlaceholderText('Type command and press Enter...');
      const sendButton = screen.getByText('Send');

      await user.type(input, testCommand);
      await user.click(sendButton);

      expect(mockSendInput).toHaveBeenCalledWith(testCommand);
      expect(input).toHaveValue(''); // Should clear after sending
    });

    it('should coordinate Enter key press for command sending', async () => {
      const user = userEvent.setup();
      const testCommand = 'pwd';
      
      mockHook.isConnected = true;
      mockHook.selectedInstance = { id: 'claude-test123', name: 'Test', status: 'running' };
      const mockSendInput = jest.fn().mockResolvedValue(undefined);
      mockHook.sendInput = mockSendInput;

      render(<ClaudeInstanceManagerSSE />);

      const input = screen.getByPlaceholderText('Type command and press Enter...');
      
      await user.type(input, testCommand);
      await user.keyboard('{Enter}');

      expect(mockSendInput).toHaveBeenCalledWith(testCommand);
    });

    it('should disable input controls when not connected', () => {
      mockHook.isConnected = false;
      mockHook.selectedInstance = { id: 'claude-test123', name: 'Test', status: 'running' };

      render(<ClaudeInstanceManagerSSE />);

      const input = screen.getByPlaceholderText('Connect to instance first');
      const sendButton = screen.getByText('Send');

      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    it('should display terminal output messages correctly', () => {
      const mockMessages = [
        {
          id: 'msg1',
          type: 'input',
          content: '> ls -la\n',
          timestamp: new Date('2023-01-01T10:00:00Z')
        },
        {
          id: 'msg2',
          type: 'output',
          content: 'total 64\ndrwxr-xr-x  8 user user  256 Jan  1 10:00 .\n',
          timestamp: new Date('2023-01-01T10:00:01Z')
        },
        {
          id: 'msg3',
          type: 'error',
          content: 'command not found: invalid\n',
          timestamp: new Date('2023-01-01T10:00:02Z')
        }
      ];

      mockHook.messages = mockMessages;
      mockHook.selectedInstance = { id: 'claude-test123', name: 'Test', status: 'running' };

      render(<ClaudeInstanceManagerSSE />);

      expect(screen.getByText('> ls -la')).toBeInTheDocument();
      expect(screen.getByText(/total 64/)).toBeInTheDocument();
      expect(screen.getByText(/command not found: invalid/)).toBeInTheDocument();
    });

    it('should coordinate history clearing with hook', async () => {
      const user = userEvent.setup();
      
      mockHook.isConnected = true;
      mockHook.selectedInstance = { id: 'claude-test123', name: 'Test', status: 'running' };
      mockHook.messages = [{ id: 'msg1', type: 'output', content: 'test', timestamp: new Date() }];
      const mockClearHistory = jest.fn();
      mockHook.clearHistory = mockClearHistory;

      render(<ClaudeInstanceManagerSSE />);

      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);

      expect(mockClearHistory).toHaveBeenCalled();
    });
  });

  describe('Instance Termination Behavior Contract', () => {
    it('should coordinate instance termination with confirmation dialog', async () => {
      const user = userEvent.setup();
      const mockTerminate = jest.fn().mockResolvedValue(undefined);
      const mockInstance = { id: 'claude-term123', name: 'Term Instance', status: 'running' };
      
      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      mockHook.instances = [mockInstance];
      mockHook.terminateInstance = mockTerminate;

      render(<ClaudeInstanceManagerSSE />);

      const terminateButton = screen.getByRole('button', { name: '×' });
      await user.click(terminateButton);

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to terminate this instance?');
      expect(mockTerminate).toHaveBeenCalledWith(mockInstance.id);

      confirmSpy.mockRestore();
    });

    it('should cancel termination when user declines confirmation', async () => {
      const user = userEvent.setup();
      const mockTerminate = jest.fn();
      const mockInstance = { id: 'claude-term123', name: 'Term Instance', status: 'running' };
      
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      
      mockHook.instances = [mockInstance];
      mockHook.terminateInstance = mockTerminate;

      render(<ClaudeInstanceManagerSSE />);

      const terminateButton = screen.getByRole('button', { name: '×' });
      await user.click(terminateButton);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockTerminate).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should disable terminate button when terminating', () => {
      mockHook.terminatingInstance = true;
      mockHook.instances = [{ id: 'claude-term123', name: 'Term Instance', status: 'running' }];

      render(<ClaudeInstanceManagerSSE />);

      const terminateButton = screen.getByRole('button', { name: '×' });
      expect(terminateButton).toBeDisabled();
    });
  });

  describe('Instance List Management Contract', () => {
    it('should coordinate instance list refresh with hook', async () => {
      const user = userEvent.setup();
      const mockRefreshInstances = jest.fn().mockResolvedValue(undefined);
      mockHook.refreshInstances = mockRefreshInstances;

      render(<ClaudeInstanceManagerSSE />);

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      expect(mockRefreshInstances).toHaveBeenCalled();
    });

    it('should display instance count correctly', () => {
      mockHook.instances = [
        { id: 'claude-1', name: 'Instance 1', status: 'running' },
        { id: 'claude-2', name: 'Instance 2', status: 'stopped' },
        { id: 'claude-3', name: 'Instance 3', status: 'running' }
      ];

      render(<ClaudeInstanceManagerSSE />);

      expect(screen.getByText('2/3')).toBeInTheDocument(); // 2 running out of 3 total
    });

    it('should display empty state when no instances available', () => {
      mockHook.instances = [];

      render(<ClaudeInstanceManagerSSE />);

      expect(screen.getByText('No instances available. Launch one to get started!')).toBeInTheDocument();
    });

    it('should highlight selected instance in list', () => {
      const mockInstances = [
        { id: 'claude-1', name: 'Instance 1', status: 'running' },
        { id: 'claude-2', name: 'Instance 2', status: 'running' }
      ];
      
      mockHook.instances = mockInstances;
      mockHook.selectedInstance = mockInstances[1]; // Select second instance

      render(<ClaudeInstanceManagerSSE />);

      const selectedCard = screen.getByText('Instance 2').closest('div');
      expect(selectedCard).toHaveClass('border-blue-500', 'bg-blue-50');
    });
  });

  describe('Loading State Coordination', () => {
    it('should show loading states during async operations', () => {
      mockHook.connecting = true;
      mockHook.sendingCommand = true;
      mockHook.creatingInstance = true;
      mockHook.terminatingInstance = true;

      render(<ClaudeInstanceManagerSSE />);

      expect(screen.getByText('Sending...')).toBeInTheDocument();
      
      const createButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('Standard Claude')
      );
      createButtons.forEach(button => expect(button).toBeDisabled());
    });
  });

  describe('Development Mode Statistics', () => {
    it('should display statistics in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockStats = {
        totalConnections: 2,
        activeConnections: 1,
        messagesSent: 5
      };
      mockHook.getStatistics = jest.fn().mockReturnValue(mockStats);

      render(<ClaudeInstanceManagerSSE />);

      expect(screen.getByText('Connection Statistics')).toBeInTheDocument();
      expect(screen.getByText(JSON.stringify(mockStats, null, 2))).toBeInTheDocument();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should hide statistics in production mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(<ClaudeInstanceManagerSSE />);

      expect(screen.queryByText('Connection Statistics')).not.toBeInTheDocument();

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('Error Handling Integration', () => {
    it('should display connection errors from hook', () => {
      mockHook.error = 'Failed to connect to instance';

      render(<ClaudeInstanceManagerSSE />);

      expect(screen.getByText('Error: Failed to connect to instance')).toBeInTheDocument();
    });

    it('should handle command sending errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockHook.isConnected = true;
      mockHook.selectedInstance = { id: 'claude-test123', name: 'Test', status: 'running' };
      mockHook.sendInput = jest.fn().mockRejectedValue(new Error('Send failed'));

      render(<ClaudeInstanceManagerSSE />);

      const input = screen.getByPlaceholderText('Type command and press Enter...');
      await user.type(input, 'test');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to send input:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility and UX Contracts', () => {
    it('should provide appropriate ARIA labels and roles', () => {
      mockHook.instances = [{ id: 'claude-1', name: 'Instance 1', status: 'running' }];
      mockHook.isConnected = false;

      render(<ClaudeInstanceManagerSSE />);

      expect(screen.getByRole('textbox')).toHaveAttribute('placeholder');
      expect(screen.getAllByRole('button')).toHaveLength.greaterThan(0);
    });

    it('should show connection indicator status', () => {
      mockHook.isConnected = true;

      render(<ClaudeInstanceManagerSSE />);

      const indicator = document.querySelector('.bg-green-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should show disconnected indicator when not connected', () => {
      mockHook.isConnected = false;

      render(<ClaudeInstanceManagerSSE />);

      const indicator = document.querySelector('.bg-gray-400');
      expect(indicator).toBeInTheDocument();
    });
  });
});