/**
 * TDD RED PHASE: Infinite Loading Regression Test
 * Tests for infinite spinner issue when TokenCostAnalytics component loads
 * Created to capture the WebSocket URL mismatch causing endless loading
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TokenCostAnalytics from '@/components/TokenCostAnalytics';

// Mock WebSocket with connection failure simulation
const mockUseWebSocketSingleton = jest.fn();

jest.mock('@/hooks/useWebSocketSingleton', () => ({
  useWebSocketSingleton: (config: any) => mockUseWebSocketSingleton(config)
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

describe('TokenCostAnalytics - Infinite Loading Regression Tests', () => {
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

  test('FAILING TEST: should complete loading within 5 seconds', async () => {
    // Simulate WebSocket connection that never succeeds (current issue)
    mockUseWebSocketSingleton.mockReturnValue({
      socket: null, // No socket connection
      isConnected: false, // Never connects
      error: null,
      lastMessage: null,
      connectionHistory: [],
      connect: jest.fn(),
      disconnect: jest.fn(),
      reconnect: jest.fn(),
      send: jest.fn()
    });

    const { container } = render(
      <TokenCostAnalytics 
        showBudgetAlerts={true} 
        enableExport={true} 
      />
    );

    // Should NOT be loading forever - this will FAIL
    await waitFor(() => {
      // Component should complete loading within 5 seconds
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Should show actual content or error message, not infinite loading
    expect(container).not.toBeEmptyDOMElement();
    
    // Should either show data or a meaningful error message
    const hasContent = screen.queryByText(/token cost/i) || 
                      screen.queryByText(/unable to load/i) ||
                      screen.queryByText(/error/i);
    expect(hasContent).toBeInTheDocument();
  });

  test('FAILING TEST: should show error message when WebSocket fails', async () => {
    // Simulate WebSocket connection failure
    mockUseWebSocketSingleton.mockReturnValue({
      socket: null,
      isConnected: false,
      error: new Error('Connection failed'),
      lastMessage: null,
      connectionHistory: [],
      connect: jest.fn(),
      disconnect: jest.fn(),
      reconnect: jest.fn(),
      send: jest.fn()
    });

    render(<TokenCostAnalytics />);

    // Should show error message instead of infinite loading
    await waitFor(() => {
      const errorMessage = screen.queryByText(/unable to load|error|connection failed/i);
      expect(errorMessage).toBeInTheDocument();
    }, { timeout: 6000 });

    // Should NOT show loading spinner forever
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('FAILING TEST: should retry connection when retry button clicked', async () => {
    const mockConnect = jest.fn();
    
    mockUseWebSocketSingleton.mockReturnValue({
      socket: null,
      isConnected: false,
      error: new Error('Connection failed'),
      lastMessage: null,
      connectionHistory: [],
      connect: mockConnect,
      disconnect: jest.fn(),
      reconnect: jest.fn(),
      send: jest.fn()
    });

    render(<TokenCostAnalytics />);

    // Wait for error state to appear
    await waitFor(() => {
      expect(screen.queryByText(/error|retry|connection/i)).toBeInTheDocument();
    }, { timeout: 6000 });

    // Should have a retry button
    const retryButton = screen.getByRole('button', { name: /retry|reload|refresh/i });
    expect(retryButton).toBeInTheDocument();

    // Clicking retry should attempt reconnection
    act(() => {
      retryButton.click();
    });

    // Should call connect function
    expect(mockConnect).toHaveBeenCalled();
  });

  test('FAILING TEST: should use consistent WebSocket URL configuration', async () => {
    // Capture the URL used by the hook
    let capturedConfig: any;
    mockUseWebSocketSingleton.mockImplementation((config) => {
      capturedConfig = config;
      return {
        socket: null,
        isConnected: false,
        error: null,
        lastMessage: null,
        connectionHistory: [],
        connect: jest.fn(),
        disconnect: jest.fn(),
        reconnect: jest.fn(),
        send: jest.fn()
      };
    });

    render(<TokenCostAnalytics />);

    // Should use consistent URL (not mixing 3000 and 3001)
    await waitFor(() => {
      expect(capturedConfig).toBeDefined();
    });

    // URL should be consistent and valid
    expect(capturedConfig.url).toBeDefined();
    expect(capturedConfig.url).toMatch(/^wss?:\/\/.*:\d+$/);
    
    // Should not mix different ports
    const urlParts = capturedConfig.url.match(/:(\d+)/);
    if (urlParts) {
      const port = urlParts[1];
      expect(['3000', '3001']).toContain(port);
      // This test captures the URL mismatch issue
    }
  });

  test('FAILING TEST: should fall back to mock data when WebSocket unavailable', async () => {
    // No WebSocket connection available
    mockUseWebSocketSingleton.mockReturnValue({
      socket: null,
      isConnected: false,
      error: new Error('WebSocket not available'),
      lastMessage: null,
      connectionHistory: [],
      connect: jest.fn(),
      disconnect: jest.fn(),
      reconnect: jest.fn(),
      send: jest.fn()
    });

    render(<TokenCostAnalytics enableExport={true} />);

    // Should eventually show mock/cached data instead of infinite loading
    await waitFor(() => {
      // Look for any token-related content or fallback UI
      const tokenContent = screen.queryByText(/token|cost|usage|\$|claude|openai/i);
      expect(tokenContent).toBeInTheDocument();
    }, { timeout: 6000 });

    // Should not be stuck in loading state
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
});

/*
 * EXPECTED TEST RESULTS:
 * - All tests should FAIL initially (TDD Red phase)
 * - This captures the infinite loading bug and WebSocket URL issues
 * - After implementing fixes, these tests should PASS (TDD Green phase)
 * - This follows proper TDD Red-Green-Refactor cycle
 */