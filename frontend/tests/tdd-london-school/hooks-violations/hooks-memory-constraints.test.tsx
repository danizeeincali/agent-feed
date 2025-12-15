/**
 * TDD London School - Memory Constraints and Performance Hooks Violations
 * 
 * This test suite focuses on memory usage violations and performance issues
 * related to React hooks in the UnifiedAgentPage ecosystem. It uses London School
 * methodology to expose how components behave under memory pressure and
 * performance constraints.
 * 
 * MEMORY VIOLATIONS EXPOSED:
 * 1. Memory leaks from uncleaned useEffect subscriptions
 * 2. Excessive memory usage from large state objects  
 * 3. Memory accumulation from rapid re-renders
 * 4. Stale closures holding references to large objects
 * 5. WebSocket connection memory leaks
 * 
 * PERFORMANCE VIOLATIONS:
 * 1. Infinite re-render loops from unstable dependencies
 * 2. Excessive useCallback recreations
 * 3. Heavy useMemo calculations blocking UI
 * 4. State update batching issues
 */

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { jest } from '@jest/globals';

// =============================================================================
// MEMORY MONITORING INFRASTRUCTURE
// =============================================================================

/**
 * Mock memory monitoring system for testing memory constraints
 */
class MemoryMonitor {
  private allocations = new Map<string, number>();
  private limit: number;
  private currentUsage = 0;
  
  constructor(limitMB: number = 512) {
    this.limit = limitMB * 1024 * 1024; // Convert to bytes
  }
  
  allocate(id: string, sizeMB: number): number {
    const bytes = sizeMB * 1024 * 1024;
    const existing = this.allocations.get(id) || 0;
    
    this.allocations.set(id, existing + bytes);
    this.currentUsage += bytes;
    
    if (this.currentUsage > this.limit) {
      throw new Error(`Memory limit exceeded: ${this.getUsageMB()}MB > ${this.limit / (1024 * 1024)}MB`);
    }
    
    return this.currentUsage;
  }
  
  deallocate(id: string): void {
    const allocated = this.allocations.get(id) || 0;
    this.currentUsage -= allocated;
    this.allocations.delete(id);
  }
  
  getUsageMB(): number {
    return this.currentUsage / (1024 * 1024);
  }
  
  getUsagePercent(): number {
    return (this.currentUsage / this.limit) * 100;
  }
  
  reset(): void {
    this.allocations.clear();
    this.currentUsage = 0;
  }
  
  simulate(operations: Array<{ type: 'allocate' | 'deallocate', id: string, sizeMB?: number }>): void {
    operations.forEach(op => {
      if (op.type === 'allocate' && op.sizeMB) {
        this.allocate(op.id, op.sizeMB);
      } else if (op.type === 'deallocate') {
        this.deallocate(op.id);
      }
    });
  }
}

/**
 * Performance tracking for hooks violations
 */
class PerformanceTracker {
  private renderTimes: number[] = [];
  private hookCalls = new Map<string, number>();
  private startTime: number = 0;
  
  startRender(): void {
    this.startTime = performance.now();
  }
  
  endRender(): number {
    const duration = performance.now() - this.startTime;
    this.renderTimes.push(duration);
    return duration;
  }
  
  trackHook(hookName: string): void {
    this.hookCalls.set(hookName, (this.hookCalls.get(hookName) || 0) + 1);
  }
  
  getAverageRenderTime(): number {
    return this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
  }
  
  getExcessiveHooks(): Array<{ hook: string, calls: number }> {
    return Array.from(this.hookCalls.entries())
      .filter(([_, calls]) => calls > 50)
      .map(([hook, calls]) => ({ hook, calls }));
  }
  
  hasPerformanceIssues(): boolean {
    return this.getAverageRenderTime() > 16.67 || this.getExcessiveHooks().length > 0;
  }
  
  reset(): void {
    this.renderTimes = [];
    this.hookCalls.clear();
    this.startTime = 0;
  }
}

// Global instances
const memoryMonitor = new MemoryMonitor(512); // 512MB limit
const performanceTracker = new PerformanceTracker();

// =============================================================================
// MOCK COMPONENTS FOR TESTING MEMORY VIOLATIONS
// =============================================================================

/**
 * Component that simulates memory-intensive operations
 */
const MemoryIntensiveComponent: React.FC<{ dataSize: number, leakMemory?: boolean }> = ({ 
  dataSize, 
  leakMemory = false 
}) => {
  const [data, setData] = React.useState<any[]>([]);
  const [subscriptions] = React.useState<Set<() => void>>(new Set());
  
  React.useEffect(() => {
    // Simulate memory allocation
    memoryMonitor.allocate('component-data', dataSize);
    
    // Create large data array
    const largeData = Array.from({ length: dataSize * 1000 }, (_, i) => ({
      id: i,
      content: 'x'.repeat(1000), // 1KB per item
      metadata: { timestamp: Date.now(), index: i }
    }));
    
    setData(largeData);
    
    // Simulate memory leak by not cleaning up subscriptions
    if (leakMemory) {
      const interval = setInterval(() => {
        setData(prev => [...prev, { 
          id: Date.now(),
          content: 'leaked-' + 'x'.repeat(1000),
          metadata: { leaked: true }
        }]);
      }, 100);
      
      subscriptions.add(() => clearInterval(interval));
      
      // Intentionally don't return cleanup function to create memory leak
    } else {
      return () => {
        memoryMonitor.deallocate('component-data');
      };
    }
  }, [dataSize, leakMemory]);
  
  return (
    <div data-testid="memory-intensive-component">
      Data items: {data.length}
    </div>
  );
};

/**
 * Component with infinite re-render loop
 */
const InfiniteRenderComponent: React.FC<{ triggerLoop?: boolean }> = ({ triggerLoop = false }) => {
  const [count, setCount] = React.useState(0);
  const [renderCount, setRenderCount] = React.useState(0);
  
  // Track renders
  React.useEffect(() => {
    performanceTracker.startRender();
    setRenderCount(prev => prev + 1);
    performanceTracker.endRender();
  });
  
  // Create infinite loop if triggered
  React.useEffect(() => {
    if (triggerLoop && renderCount > 0 && renderCount < 100) {
      setCount(prev => prev + 1); // This will trigger another render
    }
    
    if (renderCount >= 100) {
      throw new Error('Too many re-renders. React limits the number of renders to prevent an infinite loop.');
    }
  }, [triggerLoop, count, renderCount]);
  
  return (
    <div data-testid="infinite-render-component">
      Count: {count}, Renders: {renderCount}
    </div>
  );
};

/**
 * Component with unstable dependencies
 */
const UnstableDependenciesComponent: React.FC<{ data: any[] }> = ({ data }) => {
  const [filtered, setFiltered] = React.useState<any[]>([]);
  
  // Unstable callback - new function every render
  const filterData = React.useCallback((items: any[]) => {
    performanceTracker.trackHook('unstable-callback');
    return items.filter(item => item.id % 2 === 0);
  }, [data]); // data array changes every render
  
  // Expensive memo with unstable dependency
  const expensiveComputation = React.useMemo(() => {
    performanceTracker.trackHook('expensive-memo');
    
    // Simulate expensive computation
    let result = 0;
    for (let i = 0; i < data.length * 10000; i++) {
      result += Math.random();
    }
    
    return result;
  }, [filterData]); // filterData changes every render
  
  React.useEffect(() => {
    performanceTracker.trackHook('unstable-effect');
    setFiltered(filterData(data));
  }, [filterData, data]);
  
  return (
    <div data-testid="unstable-dependencies-component">
      Filtered: {filtered.length}, Computation: {expensiveComputation.toFixed(2)}
    </div>
  );
};

// =============================================================================
// LONDON SCHOOL MEMORY CONSTRAINT TESTS
// =============================================================================

describe('Memory Constraints and Performance Hooks Violations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    memoryMonitor.reset();
    performanceTracker.reset();
  });

  // =============================================================================
  // TEST 1: MEMORY ALLOCATION VIOLATIONS
  // =============================================================================
  describe('Memory Allocation Violations', () => {
    test('should exceed 512MB memory limit with large component state', async () => {
      // ARRANGE: Component that will exceed memory limit
      const TestWrapper = () => (
        <MemoryIntensiveComponent dataSize={600} /> // 600MB of data
      );

      // ACT & ASSERT: Should throw memory limit error
      await expect(async () => {
        render(<TestWrapper />);
        
        // Wait for useEffect to execute
        await waitFor(() => {
          expect(screen.getByTestId('memory-intensive-component')).toBeInTheDocument();
        });
      }).rejects.toThrow('Memory limit exceeded');
    });

    test('should detect gradual memory accumulation from multiple components', async () => {
      // ARRANGE: Multiple components that together exceed memory limit
      const TestWrapper = () => (
        <div>
          <MemoryIntensiveComponent dataSize={150} />
          <MemoryIntensiveComponent dataSize={150} />
          <MemoryIntensiveComponent dataSize={150} />
          <MemoryIntensiveComponent dataSize={100} />
        </div>
      );

      // ACT & ASSERT: Should accumulate memory and exceed limit
      await expect(async () => {
        render(<TestWrapper />);
        
        await waitFor(() => {
          const components = screen.getAllByTestId('memory-intensive-component');
          expect(components).toHaveLength(4);
        });
      }).rejects.toThrow('Memory limit exceeded');
    });

    test('should detect memory leaks from uncleaned useEffect subscriptions', async () => {
      // ARRANGE: Component with intentional memory leak
      const { unmount } = render(
        <MemoryIntensiveComponent dataSize={100} leakMemory={true} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('memory-intensive-component')).toBeInTheDocument();
      });

      // Track memory before unmount
      const memoryBeforeUnmount = memoryMonitor.getUsageMB();

      // ACT: Unmount component (memory should be cleaned up but won't be due to leak)
      unmount();

      // Wait for potential cleanup
      await new Promise(resolve => setTimeout(resolve, 200));

      // ASSERT: Memory should still be allocated (indicating leak)
      expect(memoryMonitor.getUsageMB()).toBeCloseTo(memoryBeforeUnmount, 0);
      expect(memoryMonitor.getUsagePercent()).toBeGreaterThan(15); // Still using significant memory
    });
  });

  // =============================================================================
  // TEST 2: INFINITE RE-RENDER VIOLATIONS  
  // =============================================================================
  describe('Infinite Re-render Violations', () => {
    test('should detect infinite re-render loop from state updates', async () => {
      // ARRANGE: Component that will trigger infinite renders
      const TestWrapper = () => (
        <InfiniteRenderComponent triggerLoop={true} />
      );

      // ACT & ASSERT: Should throw infinite loop error
      await expect(async () => {
        render(<TestWrapper />);
        
        // Wait for loop to be detected
        await waitFor(() => {
          expect(screen.getByTestId('infinite-render-component')).toBeInTheDocument();
        }, { timeout: 2000 });
      }).rejects.toThrow('Too many re-renders');
    });

    test('should detect excessive renders from unstable dependencies', async () => {
      // ARRANGE: Data that changes every render
      let renderCount = 0;
      const UnstableWrapper = () => {
        renderCount++;
        const data = Array.from({ length: 100 }, () => ({ 
          id: Math.random(), // Changes every render
          value: renderCount 
        }));
        
        return <UnstableDependenciesComponent data={data} />;
      };

      // ACT: Render component
      const { rerender } = render(<UnstableWrapper />);

      // Force multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(<UnstableWrapper />);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // ASSERT: Should have excessive hook calls
      const excessiveHooks = performanceTracker.getExcessiveHooks();
      expect(excessiveHooks.length).toBeGreaterThan(0);
      expect(excessiveHooks.some(h => h.hook === 'unstable-callback')).toBe(true);
    });
  });

  // =============================================================================
  // TEST 3: PERFORMANCE DEGRADATION VIOLATIONS
  // =============================================================================
  describe('Performance Degradation Violations', () => {
    test('should detect render times exceeding 16.67ms budget', async () => {
      // ARRANGE: Component with expensive operations
      const ExpensiveComponent = () => {
        const [data] = React.useState(Array.from({ length: 10000 }, (_, i) => i));
        
        // Expensive computation that blocks render
        const result = React.useMemo(() => {
          performanceTracker.startRender();
          
          // Simulate heavy computation
          let sum = 0;
          for (let i = 0; i < data.length * 1000; i++) {
            sum += Math.sin(i) * Math.cos(i);
          }
          
          performanceTracker.endRender();
          return sum;
        }, [data]);
        
        return (
          <div data-testid="expensive-component">
            Result: {result}
          </div>
        );
      };

      // ACT: Render expensive component
      render(<ExpensiveComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('expensive-component')).toBeInTheDocument();
      });

      // ASSERT: Should detect performance issues
      expect(performanceTracker.hasPerformanceIssues()).toBe(true);
      expect(performanceTracker.getAverageRenderTime()).toBeGreaterThan(16.67);
    });

    test('should detect memory pressure from rapid state updates', async () => {
      // ARRANGE: Component that rapidly updates state
      const RapidUpdateComponent = () => {
        const [updates, setUpdates] = React.useState<number[]>([]);
        
        React.useEffect(() => {
          const interval = setInterval(() => {
            setUpdates(prev => {
              const newArray = [...prev, Date.now()];
              
              // Allocate memory for each update
              memoryMonitor.allocate(`update-${newArray.length}`, 1); // 1MB per update
              
              return newArray;
            });
          }, 10); // Very frequent updates
          
          // Clean up after 100 updates or timeout
          const timeout = setTimeout(() => {
            clearInterval(interval);
          }, 1000);
          
          return () => {
            clearInterval(interval);
            clearTimeout(timeout);
          };
        }, []);
        
        return (
          <div data-testid="rapid-update-component">
            Updates: {updates.length}
          </div>
        );
      };

      // ACT: Render component with rapid updates
      render(<RapidUpdateComponent />);

      // Wait for updates to accumulate
      await waitFor(() => {
        const component = screen.getByTestId('rapid-update-component');
        expect(component).toHaveTextContent(/Updates: \d+/);
      }, { timeout: 1500 });

      // ASSERT: Should detect memory pressure
      expect(memoryMonitor.getUsagePercent()).toBeGreaterThan(50);
    });
  });

  // =============================================================================
  // TEST 4: COMPLEX INTEGRATION MEMORY VIOLATIONS
  // =============================================================================
  describe('Complex Integration Memory Violations', () => {
    test('should simulate real-world UnifiedAgentPage memory stress', async () => {
      // ARRANGE: Mock the actual problematic scenario from UnifiedAgentPage
      const StressTestComponent: React.FC<{ agentId: string }> = ({ agentId }) => {
        const [agent, setAgent] = React.useState(null);
        const [activities, setActivities] = React.useState<any[]>([]);
        const [posts, setPosts] = React.useState<any[]>([]);
        const [loading, setLoading] = React.useState(true);
        
        // Simulate fetchAgentData with memory allocation
        const fetchAgentData = React.useCallback(async () => {
          memoryMonitor.allocate(`agent-data-${agentId}`, 50); // 50MB for agent data
          
          // Simulate large response data
          const largeActivities = Array.from({ length: 1000 }, (_, i) => ({
            id: `activity-${i}`,
            data: 'x'.repeat(1000),
            metadata: { large: true }
          }));
          
          const largePosts = Array.from({ length: 500 }, (_, i) => ({
            id: `post-${i}`,
            content: 'x'.repeat(2000),
            interactions: { likes: i, comments: i * 2 }
          }));
          
          setAgent({ id: agentId, name: `Agent ${agentId}` });
          setActivities(largeActivities);
          setPosts(largePosts);
          setLoading(false);
        }, [agentId]);
        
        React.useEffect(() => {
          fetchAgentData();
          
          // Cleanup function that should deallocate memory
          return () => {
            try {
              memoryMonitor.deallocate(`agent-data-${agentId}`);
            } catch (e) {
              // Ignore cleanup errors for testing
            }
          };
        }, [fetchAgentData]);
        
        if (loading) return <div>Loading...</div>;
        
        return (
          <div data-testid={`stress-component-${agentId}`}>
            Agent: {agent?.id}
            Activities: {activities.length}
            Posts: {posts.length}
          </div>
        );
      };

      // ACT: Render multiple agent components to stress memory
      const { rerender } = render(
        <div>
          <StressTestComponent agentId="agent-1" />
          <StressTestComponent agentId="agent-2" />
          <StressTestComponent agentId="agent-3" />
        </div>
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('stress-component-agent-1')).toBeInTheDocument();
        expect(screen.getByTestId('stress-component-agent-2')).toBeInTheDocument();
        expect(screen.getByTestId('stress-component-agent-3')).toBeInTheDocument();
      });

      // ACT: Rapidly switch agent IDs to simulate navigation
      for (let i = 4; i <= 8; i++) {
        rerender(
          <div>
            <StressTestComponent agentId={`agent-${i}`} />
            <StressTestComponent agentId={`agent-${i + 1}`} />
            <StressTestComponent agentId={`agent-${i + 2}`} />
          </div>
        );
        
        await waitFor(() => {
          expect(screen.getByTestId(`stress-component-agent-${i}`)).toBeInTheDocument();
        });
      }

      // ASSERT: Should exceed memory limit or approach it
      expect(memoryMonitor.getUsagePercent()).toBeGreaterThan(80);
    });

    test('should detect WebSocket memory leaks in real-time updates', async () => {
      // ARRANGE: Mock WebSocket with memory leaks
      const mockWebSocket = {
        connections: new Set(),
        connect: (onMessage: (data: any) => void) => {
          const connection = { onMessage, id: Date.now() };
          mockWebSocket.connections.add(connection);
          
          // Allocate memory for connection
          memoryMonitor.allocate(`ws-connection-${connection.id}`, 5); // 5MB per connection
          
          // Simulate message handler that allocates memory
          const interval = setInterval(() => {
            memoryMonitor.allocate(`ws-message-${Date.now()}`, 1); // 1MB per message
            onMessage({ type: 'update', data: 'x'.repeat(1000) });
          }, 100);
          
          return {
            close: () => {
              clearInterval(interval);
              mockWebSocket.connections.delete(connection);
              // Memory should be cleaned up here but isn't (simulating leak)
            }
          };
        }
      };

      const WebSocketComponent = () => {
        const [messages, setMessages] = React.useState<any[]>([]);
        
        React.useEffect(() => {
          const ws = mockWebSocket.connect((data: any) => {
            setMessages(prev => [...prev, data]);
          });
          
          // Simulate forgetting to clean up WebSocket
          // return () => ws.close(); // This line is commented out to simulate leak
        }, []);
        
        return (
          <div data-testid="websocket-component">
            Messages: {messages.length}
          </div>
        );
      };

      // ACT: Render multiple WebSocket components
      const { unmount } = render(
        <div>
          <WebSocketComponent />
          <WebSocketComponent />
          <WebSocketComponent />
        </div>
      );

      // Wait for connections to be established
      await waitFor(() => {
        expect(screen.getAllByTestId('websocket-component')).toHaveLength(3);
      });

      // Wait for some messages to accumulate
      await new Promise(resolve => setTimeout(resolve, 500));

      // ACT: Unmount components
      unmount();

      // ASSERT: Memory should still be allocated (indicating leaks)
      expect(memoryMonitor.getUsagePercent()).toBeGreaterThan(20);
      expect(mockWebSocket.connections.size).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // TEST 5: MEMORY CONSTRAINT RECOVERY SCENARIOS
  // =============================================================================
  describe('Memory Constraint Recovery', () => {
    test('should attempt graceful degradation when approaching memory limits', async () => {
      // ARRANGE: Component that monitors memory and degrades performance
      const GracefulDegradationComponent = () => {
        const [data, setData] = React.useState<any[]>([]);
        const [degradedMode, setDegradedMode] = React.useState(false);
        
        React.useEffect(() => {
          const loadData = () => {
            try {
              // Try to allocate memory
              memoryMonitor.allocate('graceful-component', 400); // 400MB
              
              setData(Array.from({ length: 100000 }, (_, i) => ({ id: i })));
            } catch (memoryError) {
              // Enter degraded mode
              setDegradedMode(true);
              setData(Array.from({ length: 100 }, (_, i) => ({ id: i }))); // Smaller dataset
            }
          };
          
          loadData();
          
          return () => {
            try {
              memoryMonitor.deallocate('graceful-component');
            } catch (e) {
              // Ignore cleanup errors
            }
          };
        }, []);
        
        return (
          <div data-testid="graceful-component">
            Mode: {degradedMode ? 'degraded' : 'normal'}
            Items: {data.length}
          </div>
        );
      };

      // ACT: Pre-allocate some memory to push close to limit
      memoryMonitor.allocate('pre-allocation', 200); // Use 200MB first

      render(<GracefulDegradationComponent />);

      // ASSERT: Should detect degraded mode activation
      await waitFor(() => {
        const component = screen.getByTestId('graceful-component');
        expect(component).toHaveTextContent('Mode: degraded');
        expect(component).toHaveTextContent('Items: 100'); // Smaller dataset
      });
    });
  });
});

// =============================================================================
// MEMORY CONSTRAINT TESTING UTILITIES
// =============================================================================

/**
 * Custom Jest matcher for memory violations
 */
declare global {
  namespace jest {
    interface Matchers<R> {
      toExceedMemoryLimit(): R;
      toHaveMemoryLeak(): R;
      toHavePerformanceIssues(): R;
    }
  }
}

expect.extend({
  toExceedMemoryLimit(received: MemoryMonitor) {
    const exceeded = received.getUsagePercent() > 100;
    return {
      message: () => 
        `Expected memory usage to ${exceeded ? 'not ' : ''}exceed limit. ` +
        `Current usage: ${received.getUsageMB().toFixed(2)}MB (${received.getUsagePercent().toFixed(1)}%)`,
      pass: exceeded,
    };
  },
  
  toHaveMemoryLeak(received: MemoryMonitor) {
    const hasLeak = received.getUsagePercent() > 10; // Still using significant memory after cleanup
    return {
      message: () => 
        `Expected component to ${hasLeak ? 'not ' : ''}have memory leak. ` +
        `Remaining usage: ${received.getUsageMB().toFixed(2)}MB`,
      pass: hasLeak,
    };
  },
  
  toHavePerformanceIssues(received: PerformanceTracker) {
    const hasIssues = received.hasPerformanceIssues();
    return {
      message: () => 
        `Expected component to ${hasIssues ? 'not ' : ''}have performance issues. ` +
        `Average render time: ${received.getAverageRenderTime().toFixed(2)}ms`,
      pass: hasIssues,
    };
  },
});

/**
 * Memory stress testing utility
 */
export function createMemoryStressTest(
  component: React.ComponentType<any>, 
  props: any,
  options: {
    maxMemoryMB?: number;
    iterations?: number;
    concurrentInstances?: number;
  } = {}
) {
  const { maxMemoryMB = 512, iterations = 10, concurrentInstances = 1 } = options;
  const monitor = new MemoryMonitor(maxMemoryMB);
  
  return {
    async execute() {
      const results = [];
      
      for (let i = 0; i < iterations; i++) {
        const instances = Array.from({ length: concurrentInstances }, () => 
          render(React.createElement(component, props))
        );
        
        const memoryBeforeIteration = monitor.getUsageMB();
        
        // Simulate some operations
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const memoryAfterIteration = monitor.getUsageMB();
        
        instances.forEach(instance => instance.unmount());
        
        results.push({
          iteration: i,
          memoryDelta: memoryAfterIteration - memoryBeforeIteration,
          totalMemory: memoryAfterIteration,
        });
      }
      
      return {
        results,
        averageMemoryDelta: results.reduce((sum, r) => sum + r.memoryDelta, 0) / results.length,
        peakMemory: Math.max(...results.map(r => r.totalMemory)),
        hasMemoryLeak: results[results.length - 1].totalMemory > results[0].totalMemory,
      };
    }
  };
}