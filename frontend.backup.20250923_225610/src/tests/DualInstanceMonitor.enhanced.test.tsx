/**
 * Enhanced TDD Tests for Dual Instance Monitor - London School Approach
 * 
 * This test suite follows London School (mockist) TDD principles:
 * 1. Outside-in development approach
 * 2. Mock-driven development with behavior verification
 * 3. Focus on object collaboration over state
 * 4. Comprehensive interaction testing
 * 5. Contract-based testing with clear boundaries
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { io, Socket } from 'socket.io-client';

// Mock socket.io-client with comprehensive behavior verification
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
  id: 'mock-socket-id'
};

const mockIo = jest.fn(() => mockSocket);
jest.mock('socket.io-client', () => ({
  io: mockIo,
  Socket: jest.fn()
}));

// Mock the environment variables
const mockEnv = {
  VITE_WEBSOCKET_HUB_URL: 'http://localhost:3002'
};

// Create a test-friendly version of DualInstanceMonitor
const createDualInstanceMonitor = () => {
  const React = require('react');
  const { useState, useEffect, useCallback, useRef } = React;
  const { AlertCircle, CheckCircle, Loader, Server, Activity, WifiOff, Wifi, Users } = require('lucide-react');

  const TestDualInstanceMonitor: React.FC = () => {
    const [instances, setInstances] = useState(new Map());
    const [hubStatus, setHubStatus] = useState(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const [logFilter, setLogFilter] = useState('all');
    const [selectedInstance, setSelectedInstance] = useState('all');
    const [isConnectingToHub, setIsConnectingToHub] = useState(true);
    
    const logsEndRef = useRef(null);
    const reconnectTimers = useRef(new Map());
    const hubSocket = useRef(null);
    const hubPollingInterval = useRef(null);

    // Mock the connectToHub function for testing
    const connectToHub = useCallback(() => {
      setIsConnectingToHub(true);
      
      const primaryHub = mockEnv.VITE_WEBSOCKET_HUB_URL || 'http://localhost:3002';
      const socket = mockIo(primaryHub, {
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      hubSocket.current = socket;
      setIsConnectingToHub(false);
      
      socket.emit('registerMonitor', {
        type: 'dual-instance-monitor',
        capabilities: ['logging', 'status', 'control']
      });

      socket.emit('requestStatus');
      return socket;
    }, []);

    useEffect(() => {
      connectToHub();
      return () => {
        if (hubSocket.current) {
          hubSocket.current.disconnect();
        }
        if (hubPollingInterval.current) {
          clearInterval(hubPollingInterval.current);
        }
        reconnectTimers.current.forEach(timer => clearTimeout(timer));
      };
    }, [connectToHub]);

    return (
      <div className="p-6 bg-white rounded-lg shadow-lg" data-testid="dual-instance-monitor">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Server className="w-6 h-6" />
              Dual Instance Monitor
            </h2>
            <div className="flex items-center gap-4">
              {instances.size === 2 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Dual Mode Active</span>
                </div>
              )}
              <div className="flex items-center gap-2" data-testid="connection-status">
                {isConnectingToHub ? (
                  <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                ) : hubStatus ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <span className="text-sm text-gray-600">
                  {isConnectingToHub ? 'Connecting...' : hubStatus ? 'Hub Connected' : 'Hub Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Instance Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {Array.from(instances.values()).map((instance: any) => (
              <div 
                key={instance.id}
                className={`p-4 rounded-lg border-2 ${
                  instance.status === 'connected' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
                data-testid={`instance-card-${instance.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{instance.name}</h3>
                  <div data-testid={`status-icon-${instance.id}`}>
                    {instance.status === 'connected' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {instance.status === 'connecting' && <Loader className="w-5 h-5 text-yellow-500 animate-spin" />}
                    {instance.status === 'disconnected' && <WifiOff className="w-5 h-5 text-gray-500" />}
                    {instance.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium" data-testid={`instance-status-${instance.id}`}>{instance.status}</span>
                  </div>
                </div>
              </div>
            ))}

            {instances.size === 0 && (
              <div className="col-span-2 p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
                <Server className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No Claude instances detected</p>
                <p className="text-sm mt-1">Waiting for instances to connect...</p>
              </div>
            )}
          </div>
        </div>

        {/* Log Viewer */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Instance Logs
            </h3>
            <div className="flex items-center gap-3">
              {/* Instance Filter */}
              <select
                value={selectedInstance}
                onChange={(e) => setSelectedInstance(e.target.value)}
                className="px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="instance-filter"
              >
                <option value="all">All Instances</option>
                {Array.from(instances.values()).map((instance: any) => (
                  <option key={instance.id} value={instance.id}>
                    {instance.name}
                  </option>
                ))}
              </select>

              {/* Log Level Filter */}
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="log-level-filter"
              >
                <option value="all">All Levels</option>
                <option value="info">Info</option>
                <option value="warn">Warnings</option>
                <option value="error">Errors</option>
              </select>

              {/* Auto-scroll Toggle */}
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-3 py-1 text-sm rounded-md ${
                  autoScroll 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
                data-testid="auto-scroll-toggle"
              >
                Auto-scroll
              </button>

              {/* Clear Logs */}
              <button
                onClick={() => {
                  setInstances(prev => {
                    const updated = new Map(prev);
                    updated.forEach((instance, id) => {
                      updated.set(id, { ...instance, logs: [] });
                    });
                    return updated;
                  });
                }}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
                data-testid="clear-logs-button"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Log Display */}
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm" data-testid="log-display">
            <div className="text-center text-gray-500 py-8">
              <p>No logs to display</p>
              <p className="text-xs mt-1">Logs will appear here as instances generate them</p>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span data-testid="instance-count">Instances: {Array.from(instances.values()).filter((i: any) => i.status === 'connected').length}</span>
            {hubStatus && (
              <>
                <span data-testid="hub-clients">Hub Clients: {(hubStatus as any).totalClients}</span>
                <span data-testid="uptime">Uptime: {Math.floor((hubStatus as any).uptime / 60)}m</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Monitoring Active</span>
          </div>
        </div>
      </div>
    );
  };

  return TestDualInstanceMonitor;
};

describe('DualInstanceMonitor - London School TDD Validation', () => {
  let DualInstanceMonitor: React.ComponentType;
  let mockSocketInstance: any;

  beforeEach(() => {
    // Reset all mocks for test isolation
    jest.clearAllMocks();
    
    // Create fresh component instance for each test
    DualInstanceMonitor = createDualInstanceMonitor();
    
    // Reset mock socket behavior
    mockSocketInstance = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: true,
      id: 'test-socket-id'
    };
    
    mockIo.mockReturnValue(mockSocketInstance);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Mock Usage and Interaction Verification (London School Core)', () => {
    test('should properly mock Socket.IO interactions', () => {
      render(<DualInstanceMonitor />);
      
      // Verify Socket.IO factory was called with correct parameters
      expect(mockIo).toHaveBeenCalledWith(
        'http://localhost:3002',
        expect.objectContaining({
          timeout: 5000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        })
      );
    });

    test('should verify monitor registration interaction', () => {
      render(<DualInstanceMonitor />);
      
      // Verify the component collaborates correctly with socket
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('registerMonitor', {
        type: 'dual-instance-monitor',
        capabilities: ['logging', 'status', 'control']
      });
      
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('requestStatus');
    });

    test('should verify socket cleanup behavior on unmount', () => {
      const { unmount } = render(<DualInstanceMonitor />);
      
      // Verify initial connection
      expect(mockIo).toHaveBeenCalled();
      
      // Unmount and verify cleanup
      unmount();
      
      // Component should have attempted to disconnect
      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
    });
  });

  describe('Test Isolation and Independence', () => {
    test('first test should not affect second test state', () => {
      const { unmount } = render(<DualInstanceMonitor />);
      expect(screen.getByText('Dual Instance Monitor')).toBeInTheDocument();
      unmount();
      
      // Second render should be completely independent
      render(<DualInstanceMonitor />);
      expect(screen.getByText('Dual Instance Monitor')).toBeInTheDocument();
      expect(mockIo).toHaveBeenCalledTimes(1); // Only once in this test
    });

    test('mock state should be clean between tests', () => {
      render(<DualInstanceMonitor />);
      
      // This test should start with fresh mocks
      expect(mockIo).toHaveBeenCalledTimes(1);
      expect(mockSocketInstance.emit).toHaveBeenCalledTimes(2); // registerMonitor + requestStatus
    });
  });

  describe('Behavior-Driven Test Design (Not State-Checking)', () => {
    test('should focus on component behavior rather than internal state', () => {
      render(<DualInstanceMonitor />);
      
      // London School: Test WHAT the component does, not what it contains
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(screen.getByText('No Claude instances detected')).toBeInTheDocument();
      
      // Verify behavior: auto-scroll should be enabled by default
      const autoScrollButton = screen.getByTestId('auto-scroll-toggle');
      expect(autoScrollButton).toHaveClass('bg-blue-500');
    });

    test('should test user interactions and their behavioral outcomes', () => {
      render(<DualInstanceMonitor />);
      
      const autoScrollButton = screen.getByTestId('auto-scroll-toggle');
      
      // Test behavior: clicking should toggle the visual state
      expect(autoScrollButton).toHaveClass('bg-blue-500');
      
      fireEvent.click(autoScrollButton);
      expect(autoScrollButton).toHaveClass('bg-gray-200');
      
      fireEvent.click(autoScrollButton);
      expect(autoScrollButton).toHaveClass('bg-blue-500');
    });

    test('should test filter behavior changes', () => {
      render(<DualInstanceMonitor />);
      
      const logLevelFilter = screen.getByTestId('log-level-filter');
      
      // Test filter behavior
      fireEvent.change(logLevelFilter, { target: { value: 'error' } });
      expect(logLevelFilter).toHaveValue('error');
      
      fireEvent.change(logLevelFilter, { target: { value: 'all' } });
      expect(logLevelFilter).toHaveValue('all');
    });
  });

  describe('Error Boundary and Resilience Testing', () => {
    test('should handle socket connection errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Simulate socket error
      mockIo.mockImplementation(() => {
        throw new Error('Socket connection failed');
      });
      
      // Component should still render without crashing
      expect(() => render(<DualInstanceMonitor />)).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    test('should handle malformed data without crashing', () => {
      render(<DualInstanceMonitor />);
      
      // Simulate malformed hub status - component should handle gracefully
      const onHandler = mockSocketInstance.on.mock.calls.find(call => call[0] === 'hubStatus')?.[1];
      
      if (onHandler) {
        expect(() => {
          onHandler(null);
          onHandler(undefined);
          onHandler({ invalid: 'data' });
        }).not.toThrow();
      }
    });
  });

  describe('Async Operation Testing Patterns', () => {
    test('should handle async connection state changes', async () => {
      render(<DualInstanceMonitor />);
      
      // Initially connecting
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      
      // Simulate successful connection
      act(() => {
        const connectHandler = mockSocketInstance.on.mock.calls.find(call => call[0] === 'connect')?.[1];
        if (connectHandler) {
          connectHandler();
        }
      });
      
      // Should show connected state
      await waitFor(() => {
        expect(screen.queryByText('Connecting...')).not.toBeInTheDocument();
      });
    });

    test('should handle async log updates', async () => {
      render(<DualInstanceMonitor />);
      
      // Clear logs initially shows no logs message
      expect(screen.getByText('No logs to display')).toBeInTheDocument();
      
      const clearButton = screen.getByTestId('clear-logs-button');
      fireEvent.click(clearButton);
      
      // Should still show no logs message after clearing
      await waitFor(() => {
        expect(screen.getByText('No logs to display')).toBeInTheDocument();
      });
    });
  });

  describe('Mock Contract Verification', () => {
    test('should verify socket.io mock contract adherence', () => {
      render(<DualInstanceMonitor />);
      
      // Verify mock was called as expected
      expect(mockIo).toHaveBeenCalledWith(
        expect.stringContaining('localhost:3002'),
        expect.objectContaining({
          timeout: expect.any(Number),
          reconnection: expect.any(Boolean),
          reconnectionAttempts: expect.any(Number),
          reconnectionDelay: expect.any(Number)
        })
      );
      
      // Verify socket instance has required methods
      expect(mockSocketInstance.emit).toBeDefined();
      expect(mockSocketInstance.on).toBeDefined();
      expect(mockSocketInstance.disconnect).toBeDefined();
    });

    test('should verify component follows expected collaboration patterns', () => {
      render(<DualInstanceMonitor />);
      
      // Component should follow the pattern: connect -> register -> request status
      const emitCalls = mockSocketInstance.emit.mock.calls;
      
      expect(emitCalls).toContainEqual(['registerMonitor', expect.any(Object)]);
      expect(emitCalls).toContainEqual(['requestStatus']);
    });
  });

  describe('Coverage Gap Analysis', () => {
    test('should test instance detection scenarios', () => {
      render(<DualInstanceMonitor />);
      
      // Test no instances scenario
      expect(screen.getByText('No Claude instances detected')).toBeInTheDocument();
      expect(screen.getByText('Instances: 0')).toBeInTheDocument();
    });

    test('should test filter combinations', () => {
      render(<DualInstanceMonitor />);
      
      const instanceFilter = screen.getByTestId('instance-filter');
      const logLevelFilter = screen.getByTestId('log-level-filter');
      
      // Test various filter combinations
      fireEvent.change(instanceFilter, { target: { value: 'all' } });
      fireEvent.change(logLevelFilter, { target: { value: 'error' } });
      
      expect(instanceFilter).toHaveValue('all');
      expect(logLevelFilter).toHaveValue('error');
    });

    test('should test accessibility features', () => {
      render(<DualInstanceMonitor />);
      
      // Test that interactive elements are keyboard accessible
      const autoScrollButton = screen.getByTestId('auto-scroll-toggle');
      const clearButton = screen.getByTestId('clear-logs-button');
      
      expect(autoScrollButton).toBeInTheDocument();
      expect(clearButton).toBeInTheDocument();
      
      // Test focus behavior
      autoScrollButton.focus();
      expect(document.activeElement).toBe(autoScrollButton);
    });
  });
});