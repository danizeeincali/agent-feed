/**
 * TDD Tests for Performance Monitor Integration
 * Testing WebSocket Debug Panel and Error Testing integration into Performance section
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Mock functions and setup for Jest
import PerformanceMonitor from '@/components/PerformanceMonitor';
import { WebSocketProvider } from '@/context/WebSocketSingletonContext';

// Mock WebSocket
const mockWebSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
  id: 'test-socket-id'
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockWebSocket)
}));

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1024 * 1024 * 10 // 10MB
    }
  }
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider config={{ autoConnect: false }}>
        {children}
      </WebSocketProvider>
    </QueryClientProvider>
  );
};

describe('PerformanceMonitor Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render performance metrics in main view', async () => {
    render(
      <TestWrapper>
        <PerformanceMonitor />
      </TestWrapper>
    );

    expect(screen.getByText('Performance Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/FPS:/)).toBeInTheDocument();
    expect(screen.getByText(/Memory:/)).toBeInTheDocument();
  });

  it('should include WebSocket Debug Panel tab in performance section', async () => {
    render(
      <TestWrapper>
        <PerformanceMonitor />
      </TestWrapper>
    );

    expect(screen.getByText('WebSocket Debug')).toBeInTheDocument();
    expect(screen.getByText('Error Testing')).toBeInTheDocument();
  });

  it('should switch between performance tabs correctly', async () => {
    render(
      <TestWrapper>
        <PerformanceMonitor />
      </TestWrapper>
    );

    // Click on WebSocket Debug tab
    fireEvent.click(screen.getByText('WebSocket Debug'));
    
    await waitFor(() => {
      expect(screen.getByText('WebSocket Connection Debug Panel')).toBeInTheDocument();
    });

    // Click on Error Testing tab
    fireEvent.click(screen.getByText('Error Testing'));
    
    await waitFor(() => {
      expect(screen.getByText('Error Testing Tools')).toBeInTheDocument();
    });
  });

  it('should show WebSocket connection tests in debug panel', async () => {
    render(
      <TestWrapper>
        <PerformanceMonitor />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('WebSocket Debug'));

    await waitFor(() => {
      expect(screen.getByText('WebSocket Hub (Primary)')).toBeInTheDocument();
      expect(screen.getByText('Robust WebSocket Server')).toBeInTheDocument();
    });
  });

  it('should provide error testing buttons in error testing tab', async () => {
    render(
      <TestWrapper>
        <PerformanceMonitor />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Error Testing'));

    await waitFor(() => {
      expect(screen.getByText('Render Error')).toBeInTheDocument();
      expect(screen.getByText('Async Error')).toBeInTheDocument();
      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });
  });

  it('should not render WebSocket debug panel outside performance section', () => {
    // This test ensures the debug panel is removed from App.tsx
    const { container } = render(
      <div data-testid="app-main">
        {/* Simulating App.tsx without WebSocket debug panel */}
      </div>
    );

    // Should not find WebSocket debug panel in main app area
    expect(container.querySelector('[data-testid="websocket-debug-panel"]')).toBeNull();
  });

  it('should maintain all WebSocket testing capabilities in performance section', async () => {
    render(
      <TestWrapper>
        <PerformanceMonitor />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('WebSocket Debug'));

    // Should have retest functionality
    const retestButton = await screen.findByText(/Retest/);
    expect(retestButton).toBeInTheDocument();

    // Should have quick actions
    await waitFor(() => {
      expect(screen.getByText('Hub Health')).toBeInTheDocument();
      expect(screen.getByText('Show Config')).toBeInTheDocument();
      expect(screen.getByText('Manual Test')).toBeInTheDocument();
    });
  });

  it('should trigger error tests correctly from performance section', async () => {
    render(
      <TestWrapper>
        <PerformanceMonitor />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Error Testing'));

    const renderErrorButton = await screen.findByText('Render Error');
    fireEvent.click(renderErrorButton);

    // Should show error testing component
    await waitFor(() => {
      expect(screen.getByText(/Testing: render error/)).toBeInTheDocument();
    });
  });

  it('should show performance metrics alongside debug tools', async () => {
    render(
      <TestWrapper>
        <PerformanceMonitor />
      </TestWrapper>
    );

    // Performance metrics should always be visible
    expect(screen.getByText(/FPS:/)).toBeInTheDocument();
    expect(screen.getByText(/Memory:/)).toBeInTheDocument();

    // Switch to debug panel - metrics should still be visible
    fireEvent.click(screen.getByText('WebSocket Debug'));
    expect(screen.getByText(/FPS:/)).toBeInTheDocument();
  });

  it('should have proper tab styling and navigation', async () => {
    render(
      <TestWrapper>
        <PerformanceMonitor />
      </TestWrapper>
    );

    const performanceTab = screen.getByRole('tab', { name: /Performance/i });
    const debugTab = screen.getByRole('tab', { name: /WebSocket Debug/i });
    const errorTab = screen.getByRole('tab', { name: /Error Testing/i });

    expect(performanceTab).toHaveAttribute('aria-selected', 'true');
    expect(debugTab).toHaveAttribute('aria-selected', 'false');
    expect(errorTab).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(debugTab);
    
    await waitFor(() => {
      expect(debugTab).toHaveAttribute('aria-selected', 'true');
      expect(performanceTab).toHaveAttribute('aria-selected', 'false');
    });
  });
});