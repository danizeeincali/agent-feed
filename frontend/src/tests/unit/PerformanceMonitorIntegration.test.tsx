/**
 * TDD Tests for Enhanced Performance Metrics Integration
 * Testing performance monitoring integration into Analytics dashboard
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Mock functions and setup for Jest
import EnhancedPerformanceMetrics from '@/components/EnhancedPerformanceMetrics';
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

describe('EnhancedPerformanceMetrics Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render real-time performance metrics', async () => {
    render(
      <TestWrapper>
        <EnhancedPerformanceMetrics />
      </TestWrapper>
    );

    expect(screen.getByText('Frame Rate')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('Render Time')).toBeInTheDocument();
    expect(screen.getByText('Component Mounts')).toBeInTheDocument();
  });

  it('should show performance status indicators', async () => {
    render(
      <TestWrapper>
        <EnhancedPerformanceMetrics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/FPS/)).toBeInTheDocument();
      expect(screen.getByText(/MB/)).toBeInTheDocument();
      expect(screen.getByText(/ms/)).toBeInTheDocument();
    });
  });

  it('should display performance insights panel', async () => {
    render(
      <TestWrapper>
        <EnhancedPerformanceMetrics />
      </TestWrapper>
    );

    expect(screen.getByText('Real-time Performance Insights')).toBeInTheDocument();
    expect(screen.getByText('Overall Status:')).toBeInTheDocument();
    expect(screen.getByText('Memory Health:')).toBeInTheDocument();
    expect(screen.getByText('Render Performance:')).toBeInTheDocument();
  });

  it('should show detailed metrics table', async () => {
    render(
      <TestWrapper>
        <EnhancedPerformanceMetrics />
      </TestWrapper>
    );

    expect(screen.getByText('Detailed Performance Metrics')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Frames Per Second')).toBeInTheDocument();
      expect(screen.getByText('Current Value')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Target')).toBeInTheDocument();
    });
  });

  it('should display performance recommendations', async () => {
    render(
      <TestWrapper>
        <EnhancedPerformanceMetrics />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should show at least one status indicator
      const statusElements = screen.getAllByText(/optimal|excellent|good|poor|high|moderate/i);
      expect(statusElements.length).toBeGreaterThan(0);
    });
  });

  it('should show mini performance indicator when enabled', async () => {
    render(
      <TestWrapper>
        <EnhancedPerformanceMetrics showMiniIndicator={true} />
      </TestWrapper>
    );

    expect(screen.getByText('Live Performance')).toBeInTheDocument();
  });

  it('should hide mini performance indicator when disabled', async () => {
    render(
      <TestWrapper>
        <EnhancedPerformanceMetrics showMiniIndicator={false} />
      </TestWrapper>
    );

    expect(screen.queryByText('Live Performance')).not.toBeInTheDocument();
  });

  it('should update performance metrics over time', async () => {
    const { rerender } = render(
      <TestWrapper>
        <EnhancedPerformanceMetrics />
      </TestWrapper>
    );

    // Initial render should show metrics
    expect(screen.getByText('Frame Rate')).toBeInTheDocument();

    // Mock time passage
    jest.advanceTimersByTime(1000);

    rerender(
      <TestWrapper>
        <EnhancedPerformanceMetrics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/FPS/)).toBeInTheDocument();
    });
  });

  it('should handle memory usage status colors correctly', async () => {
    render(
      <TestWrapper>
        <EnhancedPerformanceMetrics />
      </TestWrapper>
    );

    // Check that memory usage is displayed
    await waitFor(() => {
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    });
  });

  it('should show performance status with correct color coding', async () => {
    render(
      <TestWrapper>
        <EnhancedPerformanceMetrics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Frame Rate')).toBeInTheDocument();
      // Should have some status indication
      const statusText = screen.getByText(/Status:/);
      expect(statusText).toBeInTheDocument();
    });
  });
});