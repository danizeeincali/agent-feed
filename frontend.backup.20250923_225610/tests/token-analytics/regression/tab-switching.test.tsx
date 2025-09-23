/**
 * TDD RED PHASE: Tab Switching Regression Test
 * Tests for white screen issue when clicking Token Costs tab
 * Created to capture the existing failure before fixing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleAnalytics from '@/components/SimpleAnalytics';

// Mock WebSocket to prevent connection issues during testing
jest.mock('@/hooks/useWebSocketSingleton', () => ({
  useWebSocketSingleton: jest.fn(() => ({
    socket: null, // This should cause the component to handle missing socket gracefully
    isConnected: false,
    error: null,
    lastMessage: null,
    connectionHistory: [],
    connect: jest.fn(),
    disconnect: jest.fn(),
    reconnect: jest.fn(),
    send: jest.fn()
  }))
}));

// Mock NLD logger
jest.mock('@/utils/nld-logger', () => ({
  nldLogger: {
    renderAttempt: jest.fn(),
    renderSuccess: jest.fn(),
    renderFailure: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Analytics Tab Switching - Regression Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage
    const mockLocalStorage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
    
    // Mock performance API
    Object.defineProperty(window, 'performance', {
      value: {
        now: jest.fn(() => Date.now()),
        mark: jest.fn(),
        measure: jest.fn(() => ({ duration: 50 }))
      }
    });
  });

  test('FAILING TEST: should render Token Costs tab without white screen', async () => {
    // This test is expected to FAIL initially, capturing the bug
    const { container } = render(<SimpleAnalytics />);

    // Wait for initial system tab to load
    await waitFor(() => {
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
    });

    // Verify tab buttons exist
    const tokenCostsButton = screen.getByText('Token Costs');
    expect(tokenCostsButton).toBeInTheDocument();

    // Click the Token Costs tab - THIS SHOULD CAUSE WHITE SCREEN
    fireEvent.click(tokenCostsButton);

    // These assertions should FAIL due to white screen:
    // 1. Component should exist (but it crashes)
    await waitFor(() => {
      expect(screen.queryByText('Token Cost Analytics')).toBeInTheDocument();
    }, { timeout: 3000 });

    // 2. No error message should show
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

    // 3. Container should have content (but it's empty due to crash)
    expect(container).not.toBeEmptyDOMElement();
  });

  test('FAILING TEST: should handle WebSocket connection failure gracefully', async () => {
    // Mock a WebSocket that fails
    const mockUseWebSocket = require('@/hooks/useWebSocketSingleton').useWebSocketSingleton;
    mockUseWebSocket.mockReturnValue({
      socket: null,
      isConnected: false,
      error: new Error('WebSocket connection failed'),
      lastMessage: null,
      connectionHistory: [],
      connect: jest.fn(),
      disconnect: jest.fn(),
      reconnect: jest.fn(),
      send: jest.fn()
    });

    render(<SimpleAnalytics />);

    // Click Token Costs tab
    const tokenCostsButton = screen.getByText('Token Costs');
    fireEvent.click(tokenCostsButton);

    // Should show error message instead of crashing
    await waitFor(() => {
      // This will FAIL - no error handling exists yet
      expect(screen.getByText(/unable to load token analytics/i)).toBeInTheDocument();
    });
  });

  test('FAILING TEST: should return to working state when switching back to System tab', async () => {
    render(<SimpleAnalytics />);

    // Start on System tab (should work)
    expect(screen.getByText('System Analytics')).toBeInTheDocument();

    // Click Token Costs (causes crash)
    const tokenCostsButton = screen.getByText('Token Costs');
    fireEvent.click(tokenCostsButton);

    // Click back to System tab
    const systemButton = screen.getByText('System');
    fireEvent.click(systemButton);

    // Should show System tab again (but might be broken due to crash)
    await waitFor(() => {
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
    });

    // System metrics should still be visible
    expect(screen.queryByText('CPU Usage')).toBeInTheDocument();
  });

  test('FAILING TEST: should maintain URL stability during tab switches', async () => {
    // Mock window.location
    delete (window as any).location;
    window.location = { href: 'http://127.0.0.1:3001/analytics' } as any;

    render(<SimpleAnalytics />);

    // Click Token Costs tab
    const tokenCostsButton = screen.getByText('Token Costs');
    fireEvent.click(tokenCostsButton);

    // URL should remain the same
    expect(window.location.href).toBe('http://127.0.0.1:3001/analytics');
  });
});

/*
 * EXPECTED TEST RESULTS:
 * - All tests should FAIL initially
 * - This captures the exact white screen bug user reported
 * - After implementing fixes, these tests should PASS
 * - This follows TDD Red-Green-Refactor cycle
 */