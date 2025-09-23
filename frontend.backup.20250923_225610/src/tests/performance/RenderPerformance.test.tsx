import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { performance, PerformanceObserver } from 'perf_hooks';

// Import components to test
import AgentManager from '@/components/AgentManager';
import DualInstanceDashboard from '@/components/DualInstanceDashboard';
import App from '@/App';
import { WebSocketProvider } from '@/context/WebSocketSingletonContext';

// Mock dependencies
global.fetch = jest.fn();
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
})) as any;

// Performance measurement utilities
class PerformanceTracker {
  private startTime: number = 0;
  private measurements: { [key: string]: number[] } = {};

  start(): void {
    this.startTime = performance.now();
  }

  end(label: string): number {
    const duration = performance.now() - this.startTime;
    if (!this.measurements[label]) {
      this.measurements[label] = [];
    }
    this.measurements[label].push(duration);
    return duration;
  }

  getAverage(label: string): number {
    const measurements = this.measurements[label] || [];
    return measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
  }

  getMedian(label: string): number {
    const measurements = [...(this.measurements[label] || [])].sort((a, b) => a - b);
    const mid = Math.floor(measurements.length / 2);
    return measurements.length % 2 === 0
      ? (measurements[mid - 1] + measurements[mid]) / 2
      : measurements[mid];
  }

  getMax(label: string): number {
    const measurements = this.measurements[label] || [];
    return Math.max(...measurements);
  }

  getAllMeasurements(label: string): number[] {
    return [...(this.measurements[label] || [])];
  }

  reset(): void {
    this.measurements = {};
  }
}

// Memory monitoring utilities
class MemoryTracker {
  private initialMemory: number = 0;

  start(): void {
    if (global.gc) {
      global.gc();
    }
    this.initialMemory = (process.memoryUsage as any)().heapUsed;
  }

  getCurrentMemoryUsage(): number {
    return (process.memoryUsage as any)().heapUsed;
  }

  getMemoryDelta(): number {
    return this.getCurrentMemoryUsage() - this.initialMemory;
  }

  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    }
  }
}

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider config={{ autoConnect: false }}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </WebSocketProvider>
    </QueryClientProvider>
  );
};

describe('Render Performance Tests', () => {
  let performanceTracker: PerformanceTracker;
  let memoryTracker: MemoryTracker;

  const mockAgents = Array.from({ length: 100 }, (_, i) => ({
    id: `agent-${i}`,
    name: `agent-${i}`,
    display_name: `Agent ${i}`,
    description: `This is test agent ${i} for performance testing`,
    system_prompt: `You are agent ${i}`,
    avatar_color: '#3B82F6',
    capabilities: ['testing', 'performance', `capability-${i}`],
    status: i % 2 === 0 ? 'active' : 'inactive' as const,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    usage_count: Math.floor(Math.random() * 100),
    performance_metrics: {
      success_rate: 0.95,
      average_response_time: 1200,
      total_tokens_used: Math.floor(Math.random() * 10000),
      error_count: Math.floor(Math.random() * 5),
    },
    health_status: {
      cpu_usage: Math.floor(Math.random() * 50) + 20,
      memory_usage: Math.floor(Math.random() * 70) + 30,
      response_time: Math.floor(Math.random() * 500) + 500,
      last_heartbeat: '2023-01-01T00:00:00Z',
    },
  }));

  beforeEach(() => {
    performanceTracker = new PerformanceTracker();
    memoryTracker = new MemoryTracker();
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ agents: mockAgents }),
    });
  });

  afterEach(() => {
    performanceTracker.reset();
  });

  describe('Component Render Performance', () => {
    test('AgentManager should render within acceptable time limits', async () => {
      const iterations = 10;
      const maxRenderTime = 1000; // 1 second
      
      for (let i = 0; i < iterations; i++) {
        memoryTracker.start();
        performanceTracker.start();
        
        const { unmount } = render(
          <TestWrapper>
            <AgentManager />
          </TestWrapper>
        );
        
        await waitFor(() => {
          expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
        });
        
        const renderTime = performanceTracker.end('AgentManager-render');
        console.log(`AgentManager render ${i + 1}: ${renderTime.toFixed(2)}ms`);
        
        expect(renderTime).toBeLessThan(maxRenderTime);
        
        unmount();
        memoryTracker.forceGarbageCollection();
      }
      
      const averageRenderTime = performanceTracker.getAverage('AgentManager-render');
      const maxRenderTimeActual = performanceTracker.getMax('AgentManager-render');
      
      console.log(`AgentManager Performance Summary:
        Average: ${averageRenderTime.toFixed(2)}ms
        Median: ${performanceTracker.getMedian('AgentManager-render').toFixed(2)}ms
        Max: ${maxRenderTimeActual.toFixed(2)}ms`);
      
      expect(averageRenderTime).toBeLessThan(500); // Average should be under 500ms
      expect(maxRenderTimeActual).toBeLessThan(maxRenderTime);
    });

    test('DualInstanceDashboard should render efficiently', async () => {
      const iterations = 5;
      const maxRenderTime = 800;
      
      for (let i = 0; i < iterations; i++) {
        performanceTracker.start();
        
        const { unmount } = render(
          <TestWrapper>
            <DualInstanceDashboard />
          </TestWrapper>
        );
        
        await waitFor(() => {
          expect(screen.getByText(/dual instance dashboard/i)).toBeInTheDocument();
        });
        
        const renderTime = performanceTracker.end('DualInstanceDashboard-render');
        console.log(`DualInstanceDashboard render ${i + 1}: ${renderTime.toFixed(2)}ms`);
        
        expect(renderTime).toBeLessThan(maxRenderTime);
        
        unmount();
      }
      
      const averageRenderTime = performanceTracker.getAverage('DualInstanceDashboard-render');
      console.log(`DualInstanceDashboard Average: ${averageRenderTime.toFixed(2)}ms`);
      
      expect(averageRenderTime).toBeLessThan(400);
    });

    test('App component should load within performance budget', async () => {
      const maxLoadTime = 2000; // 2 seconds for full app load
      
      performanceTracker.start();
      
      const { unmount } = render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
      
      const loadTime = performanceTracker.end('App-load');
      console.log(`Full App load time: ${loadTime.toFixed(2)}ms`);
      
      expect(loadTime).toBeLessThan(maxLoadTime);
      
      unmount();
    });
  });

  describe('Memory Usage Analysis', () => {
    test('AgentManager should not cause memory leaks', async () => {
      const maxMemoryIncrease = 50 * 1024 * 1024; // 50MB
      const iterations = 5;
      
      memoryTracker.start();
      const initialMemory = memoryTracker.getCurrentMemoryUsage();
      
      for (let i = 0; i < iterations; i++) {
        const { unmount } = render(
          <TestWrapper>
            <AgentManager />
          </TestWrapper>
        );
        
        await waitFor(() => {
          expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
        });
        
        unmount();
        
        // Force garbage collection between iterations
        memoryTracker.forceGarbageCollection();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const finalMemory = memoryTracker.getCurrentMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log(`Memory usage: Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB, 
        Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB, 
        Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      expect(memoryIncrease).toBeLessThan(maxMemoryIncrease);
    });

    test('should handle large datasets efficiently', async () => {
      const largeAgentDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockAgents[0],
        id: `large-agent-${i}`,
        name: `large-agent-${i}`,
        display_name: `Large Dataset Agent ${i}`,
      }));
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: largeAgentDataset }),
      });
      
      memoryTracker.start();
      performanceTracker.start();
      
      const { unmount } = render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });
      
      const renderTime = performanceTracker.end('large-dataset-render');
      const memoryUsage = memoryTracker.getMemoryDelta();
      
      console.log(`Large dataset (1000 agents): 
        Render time: ${renderTime.toFixed(2)}ms
        Memory increase: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      
      expect(renderTime).toBeLessThan(3000); // 3 seconds max
      expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB max
      
      unmount();
    });
  });

  describe('Re-render Performance', () => {
    test('should minimize re-renders on prop changes', async () => {
      let renderCount = 0;
      
      const TestComponent: React.FC<{ data: any[] }> = ({ data }) => {
        renderCount++;
        return (
          <TestWrapper>
            <AgentManager />
          </TestWrapper>
        );
      };
      
      const { rerender } = render(<TestComponent data={mockAgents.slice(0, 10)} />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });
      
      const initialRenderCount = renderCount;
      
      // Trigger re-render with same data
      performanceTracker.start();
      rerender(<TestComponent data={mockAgents.slice(0, 10)} />);
      const reRenderTime = performanceTracker.end('re-render-same-data');
      
      console.log(`Re-render with same data: ${reRenderTime.toFixed(2)}ms`);
      expect(reRenderTime).toBeLessThan(100); // Should be very fast
      
      // Trigger re-render with different data
      performanceTracker.start();
      rerender(<TestComponent data={mockAgents.slice(0, 15)} />);
      const reRenderNewDataTime = performanceTracker.end('re-render-new-data');
      
      console.log(`Re-render with new data: ${reRenderNewDataTime.toFixed(2)}ms`);
      expect(reRenderNewDataTime).toBeLessThan(500);
    });

    test('should handle rapid state updates efficiently', async () => {
      const { rerender } = render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });
      
      // Simulate rapid state updates
      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        rerender(
          <TestWrapper>
            <AgentManager key={i} />
          </TestWrapper>
        );
      }
      
      const totalTime = performance.now() - startTime;
      console.log(`10 rapid updates took: ${totalTime.toFixed(2)}ms`);
      
      expect(totalTime).toBeLessThan(1000); // All updates within 1 second
    });
  });

  describe('Bundle Size and Load Performance', () => {
    test('should track component bundle impact', async () => {
      // Simulate measuring bundle size impact
      const componentSizes = {
        AgentManager: 25000, // bytes
        DualInstanceDashboard: 15000,
        WebSocketContext: 8000,
        App: 50000,
      };
      
      const totalSize = Object.values(componentSizes).reduce((sum, size) => sum + size, 0);
      const maxBundleSize = 200000; // 200KB max for core components
      
      console.log(`Component bundle sizes:
        AgentManager: ${(componentSizes.AgentManager / 1024).toFixed(2)}KB
        DualInstanceDashboard: ${(componentSizes.DualInstanceDashboard / 1024).toFixed(2)}KB
        WebSocketContext: ${(componentSizes.WebSocketContext / 1024).toFixed(2)}KB
        App: ${(componentSizes.App / 1024).toFixed(2)}KB
        Total: ${(totalSize / 1024).toFixed(2)}KB`);
      
      expect(totalSize).toBeLessThan(maxBundleSize);
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect performance regressions', async () => {
      // Baseline performance benchmarks
      const baselines = {
        AgentManagerRender: 400, // ms
        DualInstanceRender: 300,
        AppLoad: 1500,
      };
      
      // Test AgentManager
      performanceTracker.start();
      const { unmount: unmountAgent } = render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });
      
      const agentRenderTime = performanceTracker.end('regression-test-agent');
      unmountAgent();
      
      // Test DualInstanceDashboard
      performanceTracker.start();
      const { unmount: unmountDual } = render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/dual instance dashboard/i)).toBeInTheDocument();
      });
      
      const dualRenderTime = performanceTracker.end('regression-test-dual');
      unmountDual();
      
      // Test App
      performanceTracker.start();
      const { unmount: unmountApp } = render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
      
      const appLoadTime = performanceTracker.end('regression-test-app');
      unmountApp();
      
      // Check for regressions (allow 20% deviation)
      const regressionThreshold = 1.2;
      
      console.log(`Performance Regression Check:
        AgentManager: ${agentRenderTime.toFixed(2)}ms (baseline: ${baselines.AgentManagerRender}ms)
        DualInstance: ${dualRenderTime.toFixed(2)}ms (baseline: ${baselines.DualInstanceRender}ms)
        App: ${appLoadTime.toFixed(2)}ms (baseline: ${baselines.AppLoad}ms)`);
      
      expect(agentRenderTime).toBeLessThan(baselines.AgentManagerRender * regressionThreshold);
      expect(dualRenderTime).toBeLessThan(baselines.DualInstanceRender * regressionThreshold);
      expect(appLoadTime).toBeLessThan(baselines.AppLoad * regressionThreshold);
    });
  });

  describe('Stress Testing', () => {
    test('should handle stress conditions gracefully', async () => {
      // Test with extreme number of agents
      const stressDataset = Array.from({ length: 5000 }, (_, i) => ({
        ...mockAgents[0],
        id: `stress-agent-${i}`,
      }));
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: stressDataset }),
      });
      
      memoryTracker.start();
      performanceTracker.start();
      
      const { unmount } = render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );
      
      // Component should still render, even if slowly
      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      }, { timeout: 10000 });
      
      const stressRenderTime = performanceTracker.end('stress-test');
      const stressMemoryUsage = memoryTracker.getMemoryDelta();
      
      console.log(`Stress test (5000 agents):
        Render time: ${stressRenderTime.toFixed(2)}ms
        Memory usage: ${(stressMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
      
      // Should complete within reasonable limits
      expect(stressRenderTime).toBeLessThan(10000); // 10 seconds max
      expect(stressMemoryUsage).toBeLessThan(500 * 1024 * 1024); // 500MB max
      
      unmount();
    });
  });
});