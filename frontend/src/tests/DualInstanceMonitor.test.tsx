/**
 * TDD Tests for Dual Instance Monitor
 * 
 * Testing strategy:
 * 1. Test instance detection (0, 1, 2 instances)
 * 2. Test connection resilience
 * 3. Test log filtering and display
 * 4. Test auto-reconnection
 * 5. Test error boundaries
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DualInstanceMonitor } from '../components/DualInstanceMonitor';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');
const mockIo = io as jest.MockedFunction<typeof io>;

// Mock import.meta.env
jest.mock('../components/DualInstanceMonitor', () => {
  const originalModule = jest.requireActual('../components/DualInstanceMonitor');
  return {
    ...originalModule,
    DualInstanceMonitor: jest.fn().mockImplementation(() => {
      const React = require('react');
      const { useEffect, useState, useCallback, useRef } = React;
      
      // Component implementation with mocked env
      const MOCK_ENV = {
        VITE_WEBSOCKET_HUB_URL: 'http://localhost:3002'
      };
      
      return originalModule.DualInstanceMonitor({ env: MOCK_ENV });
    })
  };
});

describe('DualInstanceMonitor', () => {
  let mockSocket: any;

  beforeEach(() => {
    // Create mock socket
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: true,
    };
    
    mockIo.mockReturnValue(mockSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render without errors when no instances are running', () => {
      render(<DualInstanceMonitor />);
      
      expect(screen.getByText('Dual Instance Monitor')).toBeInTheDocument();
      expect(screen.getByText('No Claude instances detected')).toBeInTheDocument();
    });

    test('should show connecting state initially', () => {
      render(<DualInstanceMonitor />);
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    test('should display dual mode indicator when 2 instances connected', async () => {
      render(<DualInstanceMonitor />);
      
      // Simulate hub connection
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      connectHandler?.();
      
      // Simulate hub status with 2 instances
      const statusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'hubStatus')?.[1];
      statusHandler?.({
        totalClients: 3,
        claudeInstances: [
          { id: 'inst1', instanceType: 'production', devMode: false },
          { id: 'inst2', instanceType: 'development', devMode: true }
        ],
        frontendClients: 1,
        uptime: 1000
      });
      
      await waitFor(() => {
        expect(screen.getByText('Dual Mode Active')).toBeInTheDocument();
      });
    });
  });

  describe('Instance Detection', () => {
    test('should detect and display single instance', async () => {
      render(<DualInstanceMonitor />);
      
      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      connectHandler?.();
      
      // Send single instance status
      const statusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'hubStatus')?.[1];
      statusHandler?.({
        totalClients: 2,
        claudeInstances: [
          { id: 'prod-123', instanceType: 'production', devMode: false }
        ],
        frontendClients: 1,
        uptime: 500
      });
      
      await waitFor(() => {
        expect(screen.getByText('Production Instance 1')).toBeInTheDocument();
        expect(screen.queryByText('Dual Mode Active')).not.toBeInTheDocument();
      });
    });

    test('should detect and display two instances', async () => {
      render(<DualInstanceMonitor />);
      
      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      connectHandler?.();
      
      // Send two instances status
      const statusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'hubStatus')?.[1];
      statusHandler?.({
        totalClients: 3,
        claudeInstances: [
          { id: 'prod-123', instanceType: 'production', devMode: false },
          { id: 'dev-456', instanceType: 'development', devMode: true }
        ],
        frontendClients: 1,
        uptime: 500
      });
      
      await waitFor(() => {
        expect(screen.getByText('Production Instance 1')).toBeInTheDocument();
        expect(screen.getByText('Development Instance 2')).toBeInTheDocument();
        expect(screen.getByText('Dual Mode Active')).toBeInTheDocument();
      });
    });

    test('should handle instance disconnection', async () => {
      render(<DualInstanceMonitor />);
      
      // Connect and add instance
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      connectHandler?.();
      
      const statusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'hubStatus')?.[1];
      statusHandler?.({
        totalClients: 2,
        claudeInstances: [
          { id: 'inst1', instanceType: 'production', devMode: false }
        ],
        frontendClients: 1,
        uptime: 500
      });
      
      // Simulate disconnection
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'instanceDisconnected')?.[1];
      disconnectHandler?.('inst1');
      
      await waitFor(() => {
        expect(screen.getByText('disconnected')).toBeInTheDocument();
      });
    });
  });

  describe('Connection Resilience', () => {
    test('should fallback to secondary hub on primary failure', async () => {
      let primaryFailed = false;
      
      mockIo.mockImplementation((url: string) => {
        if (url.includes('3002') && !primaryFailed) {
          primaryFailed = true;
          // Simulate primary hub failure
          setTimeout(() => {
            const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
            errorHandler?.(new Error('Connection failed'));
          }, 10);
        }
        return mockSocket;
      });
      
      render(<DualInstanceMonitor />);
      
      await waitFor(() => {
        // Should try fallback connection
        expect(mockIo).toHaveBeenCalledWith(expect.stringContaining('3003'), expect.any(Object));
      });
    });

    test('should fallback to HTTP polling when WebSocket fails', async () => {
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            totalClients: 1,
            claudeInstances: [],
            frontendClients: 1,
            uptime: 100
          })
        })
      ) as jest.Mock;
      
      // Simulate WebSocket failure
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect_error') {
          setTimeout(() => handler(new Error('WebSocket failed')), 10);
        }
      });
      
      render(<DualInstanceMonitor />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/hub/status'),
          expect.any(Object)
        );
      }, { timeout: 3000 });
    });

    test('should handle reconnection attempts with backoff', async () => {
      jest.useFakeTimers();
      
      render(<DualInstanceMonitor />);
      
      // Simulate instance disconnection
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      connectHandler?.();
      
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'instanceDisconnected')?.[1];
      disconnectHandler?.('inst1');
      
      // Fast-forward through reconnect attempts
      jest.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('checkInstance', 'inst1');
      });
      
      jest.useRealTimers();
    });
  });

  describe('Log Management', () => {
    test('should display logs from instances', async () => {
      render(<DualInstanceMonitor />);
      
      // Connect and add instance
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      connectHandler?.();
      
      // Add instance
      const statusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'hubStatus')?.[1];
      statusHandler?.({
        totalClients: 2,
        claudeInstances: [
          { id: 'inst1', instanceType: 'production', devMode: false }
        ],
        frontendClients: 1,
        uptime: 500
      });
      
      // Send log
      const logHandler = mockSocket.on.mock.calls.find(call => call[0] === 'instanceLog')?.[1];
      logHandler?.({
        instanceId: 'inst1',
        log: {
          timestamp: new Date(),
          level: 'info',
          message: 'Test log message'
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('Test log message')).toBeInTheDocument();
      });
    });

    test('should filter logs by level', async () => {
      render(<DualInstanceMonitor />);
      
      // Setup instance and logs
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      connectHandler?.();
      
      const statusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'hubStatus')?.[1];
      statusHandler?.({
        totalClients: 2,
        claudeInstances: [{ id: 'inst1', instanceType: 'production', devMode: false }],
        frontendClients: 1,
        uptime: 500
      });
      
      const logHandler = mockSocket.on.mock.calls.find(call => call[0] === 'instanceLog')?.[1];
      logHandler?.({ instanceId: 'inst1', log: { timestamp: new Date(), level: 'info', message: 'Info log' }});
      logHandler?.({ instanceId: 'inst1', log: { timestamp: new Date(), level: 'error', message: 'Error log' }});
      
      // Filter to errors only
      const filterSelect = screen.getByRole('combobox', { name: /level/i });
      fireEvent.change(filterSelect, { target: { value: 'error' } });
      
      await waitFor(() => {
        expect(screen.queryByText('Info log')).not.toBeInTheDocument();
        expect(screen.getByText('Error log')).toBeInTheDocument();
      });
    });

    test('should limit logs to prevent memory issues', async () => {
      render(<DualInstanceMonitor />);
      
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      connectHandler?.();
      
      const statusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'hubStatus')?.[1];
      statusHandler?.({
        totalClients: 2,
        claudeInstances: [{ id: 'inst1', instanceType: 'production', devMode: false }],
        frontendClients: 1,
        uptime: 500
      });
      
      const logHandler = mockSocket.on.mock.calls.find(call => call[0] === 'instanceLog')?.[1];
      
      // Send more than MAX_LOGS_PER_INSTANCE (500) logs
      for (let i = 0; i < 600; i++) {
        logHandler?.({
          instanceId: 'inst1',
          log: {
            timestamp: new Date(),
            level: 'info',
            message: `Log ${i}`
          }
        });
      }
      
      await waitFor(() => {
        // Should not display the first 100 logs (trimmed)
        expect(screen.queryByText('Log 0')).not.toBeInTheDocument();
        expect(screen.queryByText('Log 99')).not.toBeInTheDocument();
        // Should display recent logs
        expect(screen.getByText('Log 599')).toBeInTheDocument();
      });
    });

    test('should clear logs when clear button clicked', async () => {
      render(<DualInstanceMonitor />);
      
      // Setup instance with logs
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      connectHandler?.();
      
      const statusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'hubStatus')?.[1];
      statusHandler?.({
        totalClients: 2,
        claudeInstances: [{ id: 'inst1', instanceType: 'production', devMode: false }],
        frontendClients: 1,
        uptime: 500
      });
      
      const logHandler = mockSocket.on.mock.calls.find(call => call[0] === 'instanceLog')?.[1];
      logHandler?.({ instanceId: 'inst1', log: { timestamp: new Date(), level: 'info', message: 'Test log' }});
      
      await waitFor(() => {
        expect(screen.getByText('Test log')).toBeInTheDocument();
      });
      
      // Click clear button
      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Test log')).not.toBeInTheDocument();
        expect(screen.getByText('No logs to display')).toBeInTheDocument();
      });
    });
  });

  describe('UI Interactions', () => {
    test('should toggle auto-scroll', async () => {
      render(<DualInstanceMonitor />);
      
      const autoScrollButton = screen.getByText('Auto-scroll');
      expect(autoScrollButton).toHaveClass('bg-blue-500'); // Initially on
      
      fireEvent.click(autoScrollButton);
      expect(autoScrollButton).toHaveClass('bg-gray-200'); // Now off
      
      fireEvent.click(autoScrollButton);
      expect(autoScrollButton).toHaveClass('bg-blue-500'); // Back on
    });

    test('should filter by instance', async () => {
      render(<DualInstanceMonitor />);
      
      // Setup two instances
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      connectHandler?.();
      
      const statusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'hubStatus')?.[1];
      statusHandler?.({
        totalClients: 3,
        claudeInstances: [
          { id: 'inst1', instanceType: 'production', devMode: false },
          { id: 'inst2', instanceType: 'development', devMode: true }
        ],
        frontendClients: 1,
        uptime: 500
      });
      
      await waitFor(() => {
        const instanceSelect = screen.getAllByRole('combobox')[0];
        expect(instanceSelect).toBeInTheDocument();
        
        // Should have options for all instances
        fireEvent.click(instanceSelect);
        expect(screen.getByText('All Instances')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries', () => {
    test('should handle malformed hub status gracefully', async () => {
      render(<DualInstanceMonitor />);
      
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      connectHandler?.();
      
      // Send malformed status
      const statusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'hubStatus')?.[1];
      statusHandler?.(null);
      statusHandler?.(undefined);
      statusHandler?.({ invalid: 'data' });
      
      // Component should not crash
      expect(screen.getByText('Dual Instance Monitor')).toBeInTheDocument();
    });

    test('should handle socket errors without crashing', async () => {
      render(<DualInstanceMonitor />);
      
      // Simulate various socket errors
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
      errorHandler?.(new Error('Socket timeout'));
      errorHandler?.(new Error('Connection refused'));
      errorHandler?.(null);
      
      // Component should remain functional
      expect(screen.getByText('Dual Instance Monitor')).toBeInTheDocument();
    });
  });
});