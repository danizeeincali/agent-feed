/**
 * TDD London School Tests - ConnectionStatus Component
 * Mock-driven UI component testing focused on interaction verification
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConnectionStatus } from '../../../src/components/ConnectionStatus';
import { useWebSocketSingletonContext } from '../../../src/context/WebSocketSingletonContext';

// Mock the context hook
jest.mock('../../../src/context/WebSocketSingletonContext');

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Wifi: ({ className }: { className: string }) => <div className={className} data-testid="wifi-icon" />,
  WifiOff: ({ className }: { className: string }) => <div className={className} data-testid="wifi-off-icon" />,
  AlertCircle: ({ className }: { className: string }) => <div className={className} data-testid="alert-circle-icon" />,
  Users: ({ className }: { className: string }) => <div className={className} data-testid="users-icon" />
}));

interface MockContextValue {
  isConnected: boolean;
  connectionState: {
    isConnected: boolean;
    isConnecting: boolean;
    reconnectAttempt: number;
    lastConnected: string | null;
    connectionError: string | null;
  };
  systemStats: {
    connectedUsers: number;
    activeRooms: number;
    totalSockets: number;
    timestamp: string;
  } | null;
  onlineUsers: Array<{ id: string; username: string; lastSeen: string }>;
  reconnect: jest.Mock;
}

describe('TDD London School: ConnectionStatus Component', () => {
  let mockContext: MockContextValue;
  let mockUseWebSocketSingletonContext: jest.MockedFunction<typeof useWebSocketSingletonContext>;
  
  beforeEach(() => {
    mockContext = {
      isConnected: false,
      connectionState: {
        isConnected: false,
        isConnecting: false,
        reconnectAttempt: 0,
        lastConnected: null,
        connectionError: null
      },
      systemStats: null,
      onlineUsers: [],
      reconnect: jest.fn().mockResolvedValue(undefined)
    };
    
    mockUseWebSocketSingletonContext = useWebSocketSingletonContext as jest.MockedFunction<typeof useWebSocketSingletonContext>;
    mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Component Contract and Context Dependencies', () => {
    it('should retrieve connection state from context on render', () => {
      render(<ConnectionStatus />);
      
      expect(mockUseWebSocketSingletonContext).toHaveBeenCalledWith();
    });
    
    it('should handle missing context gracefully', () => {
      // Mock the context to throw error (simulating missing provider)
      mockUseWebSocketSingletonContext.mockImplementation(() => {
        throw new Error('useWebSocketSingletonContext must be used within a WebSocketSingletonProvider');
      });
      
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        render(<ConnectionStatus />);
      }).toThrow();
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('Connection State Display Logic', () => {
    it('should display disconnected state correctly', () => {
      render(<ConnectionStatus />);
      
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
      
      // Should use red color class
      const statusElement = screen.getByText('Disconnected').closest('.bg-red-50');
      expect(statusElement).toBeInTheDocument();
    });
    
    it('should display connecting state correctly', () => {
      mockContext.connectionState.isConnecting = true;
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
      
      // Should use yellow color class
      const statusElement = screen.getByText('Connecting...').closest('.bg-yellow-50');
      expect(statusElement).toBeInTheDocument();
      
      // Icon should have animate-spin class
      const icon = screen.getByTestId('alert-circle-icon');
      expect(icon).toHaveClass('animate-spin');
    });
    
    it('should display connected state correctly', () => {
      mockContext.isConnected = true;
      mockContext.connectionState.isConnected = true;
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
      
      // Should use green color class
      const statusElement = screen.getByText('Connected').closest('.bg-green-50');
      expect(statusElement).toBeInTheDocument();
    });
    
    it('should display reconnection attempts correctly', () => {
      mockContext.connectionState.reconnectAttempt = 3;
      mockContext.connectionState.isConnecting = false; // Not currently connecting
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.getByText('Reconnecting (3)')).toBeInTheDocument();
    });
  });
  
  describe('Critical Race Condition Display', () => {
    it('should display correct state when context isConnected differs from connectionState', () => {
      // Race condition: Context shows not connected but connectionState might be different
      mockContext.isConnected = false; // Hook says not connected
      mockContext.connectionState.isConnected = true; // But internal state says connected
      mockContext.connectionState.isConnecting = false;
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      // Component should prioritize the hook's isConnected value
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
    });
    
    it('should show connecting when isConnecting is true even if isConnected is false', () => {
      mockContext.isConnected = false;
      mockContext.connectionState.isConnected = false;
      mockContext.connectionState.isConnecting = true; // This should take precedence
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    });
    
    it('should handle inconsistent state gracefully', () => {
      // Edge case: Both connected and connecting are true (shouldn't happen but test gracefully)
      mockContext.isConnected = true;
      mockContext.connectionState.isConnected = true;
      mockContext.connectionState.isConnecting = true;
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      // Should prioritize isConnected from hook
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });
  
  describe('Status Color and Icon Logic', () => {
    it('should apply green styles for connected state', () => {
      mockContext.isConnected = true;
      mockContext.connectionState.isConnected = true;
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      const statusDiv = screen.getByText('Connected').closest('div');
      expect(statusDiv).toHaveClass('bg-green-50', 'text-green-700');
      
      const statusIndicator = screen.getByText('Connected').parentElement?.querySelector('.w-2.h-2');
      expect(statusIndicator).toHaveClass('bg-green-500', 'animate-pulse');
    });
    
    it('should apply yellow styles for connecting state', () => {
      mockContext.connectionState.isConnecting = true;
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      const statusDiv = screen.getByText('Connecting...').closest('div');
      expect(statusDiv).toHaveClass('bg-yellow-50', 'text-yellow-700');
      
      const statusIndicator = screen.getByText('Connecting...').parentElement?.querySelector('.w-2.h-2');
      expect(statusIndicator).toHaveClass('bg-yellow-500', 'animate-pulse');
    });
    
    it('should apply red styles for disconnected state', () => {
      render(<ConnectionStatus />);
      
      const statusDiv = screen.getByText('Disconnected').closest('div');
      expect(statusDiv).toHaveClass('bg-red-50', 'text-red-700');
      
      const statusIndicator = screen.getByText('Disconnected').parentElement?.querySelector('.w-2.h-2');
      expect(statusIndicator).toHaveClass('bg-red-500');
      // Should NOT have animate-pulse when disconnected
      expect(statusIndicator).not.toHaveClass('animate-pulse');
    });
  });
  
  describe('Online Users Display', () => {
    it('should show online users count when connected', () => {
      mockContext.isConnected = true;
      mockContext.onlineUsers = [
        { id: '1', username: 'user1', lastSeen: '2024-01-01T10:00:00Z' },
        { id: '2', username: 'user2', lastSeen: '2024-01-01T10:01:00Z' },
        { id: '3', username: 'user3', lastSeen: '2024-01-01T10:02:00Z' }
      ];
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
    });
    
    it('should hide online users count when disconnected', () => {
      mockContext.isConnected = false;
      mockContext.onlineUsers = [
        { id: '1', username: 'user1', lastSeen: '2024-01-01T10:00:00Z' }
      ];
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.queryByTestId('users-icon')).not.toBeInTheDocument();
    });
    
    it('should show zero count when no users online', () => {
      mockContext.isConnected = true;
      mockContext.onlineUsers = [];
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
  
  describe('Error Handling and Reconnection', () => {
    it('should display connection error when present', () => {
      mockContext.connectionState.connectionError = 'Connection timeout';
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.getByText('Connection timeout')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
    
    it('should hide error message when connected', () => {
      mockContext.isConnected = true;
      mockContext.connectionState.isConnected = true;
      mockContext.connectionState.connectionError = 'Connection timeout';
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.queryByText('Connection timeout')).not.toBeInTheDocument();
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });
    
    it('should call reconnect when retry button is clicked', async () => {
      mockContext.connectionState.connectionError = 'Connection failed';
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      expect(mockContext.reconnect).toHaveBeenCalledWith();
    });
    
    it('should handle reconnect errors gracefully', async () => {
      const reconnectError = new Error('Reconnect failed');
      mockContext.reconnect.mockRejectedValue(reconnectError);
      mockContext.connectionState.connectionError = 'Connection failed';
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<ConnectionStatus />);
      
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(mockContext.reconnect).toHaveBeenCalled();
      });
      
      // Component should still be rendered (not crash)
      expect(screen.getByText('Retry')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('System Statistics Display', () => {
    it('should display system stats when connected', () => {
      mockContext.isConnected = true;
      mockContext.systemStats = {
        connectedUsers: 42,
        activeRooms: 12,
        totalSockets: 50,
        timestamp: '2024-01-01T10:00:00Z'
      };
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.getByText('Users: 42')).toBeInTheDocument();
      expect(screen.getByText('Rooms: 12')).toBeInTheDocument();
    });
    
    it('should hide system stats when disconnected', () => {
      mockContext.isConnected = false;
      mockContext.systemStats = {
        connectedUsers: 42,
        activeRooms: 12,
        totalSockets: 50,
        timestamp: '2024-01-01T10:00:00Z'
      };
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.queryByText('Users: 42')).not.toBeInTheDocument();
      expect(screen.queryByText('Rooms: 12')).not.toBeInTheDocument();
    });
    
    it('should handle null system stats', () => {
      mockContext.isConnected = true;
      mockContext.systemStats = null;
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.queryByText(/Users:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Rooms:/)).not.toBeInTheDocument();
    });
  });
  
  describe('Last Connected Timestamp', () => {
    it('should show last connected time when disconnected', () => {
      const lastConnectedTime = '2024-01-01T10:00:00Z';
      mockContext.isConnected = false;
      mockContext.connectionState.lastConnected = lastConnectedTime;
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      const expectedTime = new Date(lastConnectedTime).toLocaleTimeString();
      expect(screen.getByText(`Last connected: ${expectedTime}`)).toBeInTheDocument();
    });
    
    it('should hide last connected time when connected', () => {
      const lastConnectedTime = '2024-01-01T10:00:00Z';
      mockContext.isConnected = true;
      mockContext.connectionState.lastConnected = lastConnectedTime;
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.queryByText(/Last connected:/)).not.toBeInTheDocument();
    });
    
    it('should hide last connected time when no previous connection', () => {
      mockContext.isConnected = false;
      mockContext.connectionState.lastConnected = null;
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      expect(screen.queryByText(/Last connected:/)).not.toBeInTheDocument();
    });
  });
  
  describe('Component Accessibility and Structure', () => {
    it('should have proper ARIA structure for screen readers', () => {
      render(<ConnectionStatus />);
      
      // Main status should be easily identifiable
      const statusElement = screen.getByText('Disconnected');
      expect(statusElement).toBeInTheDocument();
      
      // Status indicator should be visually distinct
      const indicator = statusElement.parentElement?.querySelector('.w-2.h-2');
      expect(indicator).toBeInTheDocument();
    });
    
    it('should render all interactive elements correctly', () => {
      mockContext.connectionState.connectionError = 'Connection failed';
      mockUseWebSocketSingletonContext.mockReturnValue(mockContext as any);
      
      render(<ConnectionStatus />);
      
      const retryButton = screen.getByRole('button', { name: 'Retry' });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toBeEnabled();
    });
    
    it('should have consistent styling classes', () => {
      render(<ConnectionStatus />);
      
      const container = screen.getByText('Disconnected').closest('.absolute.bottom-4.left-4.right-4.space-y-2');
      expect(container).toBeInTheDocument();
    });
  });
});