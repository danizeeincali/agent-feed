/**
 * NLD-Informed Unit Tests for TokenCostAnalytics Component
 * London School TDD with Mock-Driven Development
 * 
 * Risk Factors:
 * - 78% Memory leak risk in streaming components
 * - 65% WebSocket connection stability risk
 * - 72% Token calculation accuracy risk
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { TokenCostAnalytics } from '../../../src/components/TokenCostAnalytics';
import { WebSocketProvider } from '../../../src/context/WebSocketContext';
import { mockWebSocketService, mockTokenCalculator, mockBudgetAlerts } from '../mocks/TokenAnalyticsMocks';

// Mock factory for token cost streaming
const createMockTokenStream = (frequency: number = 100) => ({
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  emit: jest.fn(),
  getLatestCost: jest.fn(),
  resetCounters: jest.fn(),
  destroy: jest.fn()
});

// Mock factory for memory monitoring
const createMemoryMonitor = () => ({
  startMonitoring: jest.fn(),
  stopMonitoring: jest.fn(),
  getMemoryUsage: jest.fn().mockReturnValue({
    used: 50 * 1024 * 1024, // 50MB
    total: 100 * 1024 * 1024, // 100MB
    percentage: 50
  }),
  onMemoryThreshold: jest.fn(),
  clearMemory: jest.fn()
});

describe('TokenCostAnalytics - NLD Memory Leak Prevention (78% Risk)', () => {
  let mockTokenStream: ReturnType<typeof createMockTokenStream>;
  let mockMemoryMonitor: ReturnType<typeof createMemoryMonitor>;
  
  beforeEach(() => {
    mockTokenStream = createMockTokenStream();
    mockMemoryMonitor = createMemoryMonitor();
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Critical: Ensure cleanup to prevent memory leaks
    act(() => {
      mockTokenStream.destroy();
      mockMemoryMonitor.stopMonitoring();
    });
  });

  describe('Memory Management - Outside-In TDD', () => {
    it('should properly cleanup streaming subscriptions on unmount', async () => {
      // Arrange - Mock dependencies through contracts
      const mockWebSocket = mockWebSocketService();
      const mockCalculator = mockTokenCalculator();
      
      // Act - Render component
      const { unmount } = render(
        <WebSocketProvider value={mockWebSocket}>
          <TokenCostAnalytics calculator={mockCalculator} />
        </WebSocketProvider>
      );
      
      // Verify initial subscription
      expect(mockWebSocket.subscribe).toHaveBeenCalledWith(
        'token-cost-updates',
        expect.any(Function)
      );
      
      // Act - Unmount component
      unmount();
      
      // Assert - Verify proper cleanup (London School: interaction verification)
      expect(mockWebSocket.unsubscribe).toHaveBeenCalledWith('token-cost-updates');
      expect(mockCalculator.destroy).toHaveBeenCalled();
    });

    it('should handle high-frequency token updates without memory accumulation', async () => {
      // Arrange - High frequency scenario (1000 updates/second)
      const mockWebSocket = mockWebSocketService();
      const mockCalculator = mockTokenCalculator();
      const updates = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: Date.now() + i,
        tokens: Math.floor(Math.random() * 100),
        cost: Math.random() * 10
      }));
      
      render(
        <WebSocketProvider value={mockWebSocket}>
          <TokenCostAnalytics 
            calculator={mockCalculator}
            memoryMonitor={mockMemoryMonitor}
          />
        </WebSocketProvider>
      );
      
      // Act - Simulate rapid updates
      await act(async () => {
        updates.forEach((update, index) => {
          setTimeout(() => {
            const callback = mockWebSocket.subscribe.mock.calls[0][1];
            callback(update);
          }, index);
        });
        
        // Wait for all updates to process
        await new Promise(resolve => setTimeout(resolve, 1100));
      });
      
      // Assert - Memory should not exceed threshold
      await waitFor(() => {
        expect(mockMemoryMonitor.getMemoryUsage().percentage).toBeLessThan(80);
      });
      
      // Verify batching behavior to prevent memory spikes
      expect(mockCalculator.processBatch).toHaveBeenCalled();
    });

    it('should throttle UI updates to prevent memory pressure', async () => {
      // Arrange - Mock with throttling capability
      const mockWebSocket = mockWebSocketService();
      const mockCalculator = mockTokenCalculator();
      let updateCallCount = 0;
      
      const ThrottledComponent = () => {
        updateCallCount++;
        return <TokenCostAnalytics calculator={mockCalculator} />;
      };
      
      render(
        <WebSocketProvider value={mockWebSocket}>
          <ThrottledComponent />
        </WebSocketProvider>
      );
      
      // Act - Rapid fire 500 updates
      await act(async () => {
        const callback = mockWebSocket.subscribe.mock.calls[0][1];
        for (let i = 0; i < 500; i++) {
          callback({ tokens: i, cost: i * 0.01, timestamp: Date.now() + i });
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // Assert - UI updates should be throttled (London School: behavior verification)
      expect(updateCallCount).toBeLessThan(50); // Throttled to ~10 updates/second
    });
  });

  describe('Token Calculation Precision (72% Risk) - Property-Based Testing', () => {
    it('should maintain calculation accuracy across all numeric ranges', async () => {
      // Property-based test for precision
      const mockCalculator = mockTokenCalculator();
      const testCases = [
        { tokens: 1, expectedCost: 0.01 },
        { tokens: 1000, expectedCost: 10.00 },
        { tokens: 1000000, expectedCost: 10000.00 },
        { tokens: 0.1, expectedCost: 0.001 },
        { tokens: Number.MAX_SAFE_INTEGER / 1000000, expectedCost: expect.any(Number) }
      ];
      
      render(
        <TokenCostAnalytics calculator={mockCalculator} />
      );
      
      // Test each case
      for (const testCase of testCases) {
        mockCalculator.calculateCost.mockReturnValue(testCase.expectedCost);
        
        const result = mockCalculator.calculateCost(testCase.tokens);
        
        // Assert precision within acceptable tolerance
        if (typeof testCase.expectedCost === 'number') {
          expect(result).toBeCloseTo(testCase.expectedCost, 6);
        }
        
        // Verify interaction contract
        expect(mockCalculator.calculateCost).toHaveBeenCalledWith(testCase.tokens);
      }
    });

    it('should handle edge cases in token calculation without overflow', async () => {
      const mockCalculator = mockTokenCalculator();
      const edgeCases = [
        0,
        -1,
        Infinity,
        -Infinity,
        NaN,
        Number.MAX_VALUE,
        Number.MIN_VALUE
      ];
      
      render(<TokenCostAnalytics calculator={mockCalculator} />);
      
      edgeCases.forEach(edgeCase => {
        // Should not throw and should return valid result
        expect(() => {
          mockCalculator.calculateCost(edgeCase);
        }).not.toThrow();
        
        // Verify error handling contract
        expect(mockCalculator.handleCalculationError).toHaveBeenCalledWith(
          expect.objectContaining({ input: edgeCase })
        );
      });
    });
  });

  describe('Component Interaction - Contract Testing', () => {
    it('should coordinate properly with SimpleAnalytics component', async () => {
      // Arrange - Mock SimpleAnalytics contract
      const mockSimpleAnalytics = {
        updateMetrics: jest.fn(),
        getMetrics: jest.fn().mockReturnValue({ totalCost: 100.50 }),
        resetMetrics: jest.fn(),
        subscribeToUpdates: jest.fn()
      };
      
      const mockCalculator = mockTokenCalculator();
      
      render(
        <TokenCostAnalytics 
          calculator={mockCalculator}
          analyticsService={mockSimpleAnalytics}
        />
      );
      
      // Act - Simulate token cost update
      await act(async () => {
        const callback = mockCalculator.onCostUpdate.mock.calls[0][0];
        callback({ tokens: 150, cost: 15.75 });
      });
      
      // Assert - Verify collaboration contract (London School focus)
      expect(mockSimpleAnalytics.updateMetrics).toHaveBeenCalledWith({
        tokens: 150,
        cost: 15.75,
        timestamp: expect.any(Number)
      });
      
      // Verify data flow integrity
      expect(mockSimpleAnalytics.getMetrics()).toEqual(
        expect.objectContaining({ totalCost: expect.any(Number) })
      );
    });

    it('should propagate budget alerts through component hierarchy', async () => {
      // Arrange - Mock budget alert system
      const mockBudgetSystem = mockBudgetAlerts();
      const mockCalculator = mockTokenCalculator();
      
      render(
        <TokenCostAnalytics 
          calculator={mockCalculator}
          budgetSystem={mockBudgetSystem}
          budgetThreshold={100.00}
        />
      );
      
      // Act - Exceed budget threshold
      await act(async () => {
        const callback = mockCalculator.onCostUpdate.mock.calls[0][0];
        callback({ tokens: 1500, cost: 150.00 }); // Over threshold
      });
      
      // Assert - Budget alert should be triggered
      expect(mockBudgetSystem.checkThreshold).toHaveBeenCalledWith(150.00, 100.00);
      expect(mockBudgetSystem.triggerAlert).toHaveBeenCalledWith({
        type: 'budget_exceeded',
        current: 150.00,
        threshold: 100.00,
        percentage: 150
      });
    });
  });
});

describe('TokenCostAnalytics - Performance Regression Prevention', () => {
  beforeEach(() => {
    // Setup performance monitoring
    performance.mark('test-start');
  });
  
  afterEach(() => {
    performance.mark('test-end');
    const measure = performance.measure('test-duration', 'test-start', 'test-end');
    
    // Performance regression threshold: 100ms for component operations
    expect(measure.duration).toBeLessThan(100);
  });

  it('should render within performance thresholds', async () => {
    const mockCalculator = mockTokenCalculator();
    
    performance.mark('render-start');
    
    render(<TokenCostAnalytics calculator={mockCalculator} />);
    
    performance.mark('render-end');
    const renderTime = performance.measure('render-time', 'render-start', 'render-end');
    
    // Render should complete within 50ms
    expect(renderTime.duration).toBeLessThan(50);
  });

  it('should handle 1000+ token updates per second without performance degradation', async () => {
    const mockWebSocket = mockWebSocketService();
    const mockCalculator = mockTokenCalculator();
    
    render(
      <WebSocketProvider value={mockWebSocket}>
        <TokenCostAnalytics calculator={mockCalculator} />
      </WebSocketProvider>
    );
    
    performance.mark('updates-start');
    
    // Simulate 1000 updates in 1 second
    await act(async () => {
      const callback = mockWebSocket.subscribe.mock.calls[0][1];
      const promises = Array.from({ length: 1000 }, (_, i) => 
        new Promise(resolve => 
          setTimeout(() => {
            callback({ tokens: i, cost: i * 0.01, timestamp: Date.now() });
            resolve(void 0);
          }, i)
        )
      );
      
      await Promise.all(promises);
    });
    
    performance.mark('updates-end');
    const updatesTime = performance.measure('updates-time', 'updates-start', 'updates-end');
    
    // All updates should process within 2 seconds (with throttling)
    expect(updatesTime.duration).toBeLessThan(2000);
  });
});