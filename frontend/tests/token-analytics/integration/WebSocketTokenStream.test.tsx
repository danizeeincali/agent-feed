/**
 * Integration Tests for WebSocket Token Streaming
 * London School TDD - Mock-Driven Integration Testing
 * 
 * Focus Areas:
 * - 65% WebSocket connection stability risk mitigation
 * - Real-time token cost streaming integration
 * - Connection recovery and error handling
 * - Performance under high-frequency updates
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { TokenCostAnalytics } from '../../../src/components/TokenCostAnalytics';
import { WebSocketProvider } from '../../../src/context/WebSocketContext';
import { 
  createRealisticWebSocketMock, 
  createHighPerformanceTokenStreamMock,
  mockTokenCalculator,
  mockMemoryMonitor 
} from '../mocks/TokenAnalyticsMocks';

describe('WebSocket Token Streaming Integration - NLD Risk Mitigation', () => {
  let mockWebSocket: ReturnType<typeof createRealisticWebSocketMock>;
  let mockTokenStream: ReturnType<typeof createHighPerformanceTokenStreamMock>;
  let mockCalculator: ReturnType<typeof mockTokenCalculator>;
  let mockMemoryMonitor: ReturnType<typeof mockMemoryMonitor>;

  beforeEach(() => {
    mockWebSocket = createRealisticWebSocketMock(50, 0.01); // 50ms delay, 1% dropout
    mockTokenStream = createHighPerformanceTokenStreamMock();
    mockCalculator = mockTokenCalculator();
    mockMemoryMonitor = mockMemoryMonitor();
  });

  afterEach(async () => {
    // Ensure proper cleanup
    await act(async () => {
      mockTokenStream.stopStream();
      await mockWebSocket.disconnect();
      mockMemoryMonitor.stopMonitoring();
    });
  });

  describe('Connection Stability - 65% Risk Mitigation', () => {
    it('should establish WebSocket connection and handle token streaming', async () => {
      // Arrange
      const onConnectionState = jest.fn();
      
      // Act
      render(
        <WebSocketProvider 
          value={mockWebSocket}
          onConnectionStateChange={onConnectionState}
        >
          <TokenCostAnalytics 
            calculator={mockCalculator}
            memoryMonitor={mockMemoryMonitor}
          />
        </WebSocketProvider>
      );

      // Wait for connection establishment
      await act(async () => {
        await mockWebSocket.connect();
      });

      // Assert - Connection should be established
      expect(mockWebSocket.isConnected()).toBe(true);
      expect(mockWebSocket.subscribe).toHaveBeenCalledWith(
        'token-cost-updates',
        expect.any(Function)
      );
    });

    it('should handle connection drops with automatic recovery', async () => {
      // Arrange
      const reconnectionAttempts = jest.fn();
      
      render(
        <WebSocketProvider 
          value={mockWebSocket}
          onReconnectionAttempt={reconnectionAttempts}
        >
          <TokenCostAnalytics calculator={mockCalculator} />
        </WebSocketProvider>
      );

      await act(async () => {
        await mockWebSocket.connect();
      });

      // Act - Simulate connection drop
      await act(async () => {
        mockWebSocket.simulateDisconnection();
      });

      // Assert - Should attempt reconnection
      await waitFor(() => {
        expect(reconnectionAttempts).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Verify reconnection logic
      expect(mockWebSocket.connect).toHaveBeenCalledTimes(2);
    });

    it('should handle message dropout gracefully', async () => {
      // Arrange - WebSocket with 5% dropout rate
      const dropoutWebSocket = createRealisticWebSocketMock(10, 0.05);
      const messagesReceived = jest.fn();
      const messagesDropped = jest.fn();

      render(
        <WebSocketProvider value={dropoutWebSocket}>
          <TokenCostAnalytics 
            calculator={mockCalculator}
            onMessageReceived={messagesReceived}
            onMessageDropped={messagesDropped}
          />
        </WebSocketProvider>
      );

      await act(async () => {
        await dropoutWebSocket.connect();
      });

      // Act - Send 100 messages
      const messages = Array.from({ length: 100 }, (_, i) => ({
        tokens: i + 1,
        cost: (i + 1) * 0.01,
        timestamp: Date.now() + i
      }));

      await act(async () => {
        for (const message of messages) {
          try {
            await dropoutWebSocket.send('token-cost-updates', message);
          } catch (error) {
            messagesDropped();
          }
        }
      });

      // Assert - Should handle dropouts gracefully
      await waitFor(() => {
        expect(messagesReceived).toHaveBeenCalled();
        // With 5% dropout, should receive ~95 messages
        expect(messagesReceived.mock.calls.length).toBeGreaterThan(90);
        expect(messagesReceived.mock.calls.length).toBeLessThan(100);
      });
    });
  });

  describe('High-Frequency Token Updates - Performance Integration', () => {
    it('should handle 1000+ token updates per second without degradation', async () => {
      // Arrange - High-frequency stream
      const performanceMetrics = {
        updateCount: 0,
        memoryUsage: [],
        processingTimes: []
      };

      render(
        <WebSocketProvider value={mockWebSocket}>
          <TokenCostAnalytics 
            calculator={mockCalculator}
            memoryMonitor={mockMemoryMonitor}
            onPerformanceMetric={(metric) => {
              performanceMetrics.updateCount++;
              performanceMetrics.memoryUsage.push(metric.memoryUsage);
              performanceMetrics.processingTimes.push(metric.processingTime);
            }}
          />
        </WebSocketProvider>
      );

      await act(async () => {
        await mockWebSocket.connect();
        mockTokenStream.startStream(1000); // 1000 updates/second
      });

      // Act - Run for 2 seconds
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        mockTokenStream.stopStream();
      });

      // Assert - Performance should remain stable
      expect(performanceMetrics.updateCount).toBeGreaterThan(1500); // Should process most updates
      
      // Memory usage should not increase significantly
      const initialMemory = performanceMetrics.memoryUsage[0];
      const finalMemory = performanceMetrics.memoryUsage[performanceMetrics.memoryUsage.length - 1];
      const memoryIncrease = ((finalMemory - initialMemory) / initialMemory) * 100;
      
      expect(memoryIncrease).toBeLessThan(20); // Less than 20% memory increase
      
      // Processing times should remain consistent
      const avgProcessingTime = performanceMetrics.processingTimes.reduce((a, b) => a + b, 0) / performanceMetrics.processingTimes.length;
      expect(avgProcessingTime).toBeLessThan(5); // Less than 5ms average processing
    });

    it('should implement backpressure when overwhelmed', async () => {
      // Arrange - Simulate system under extreme load
      const backpressureEvents = jest.fn();
      
      render(
        <WebSocketProvider value={mockWebSocket}>
          <TokenCostAnalytics 
            calculator={mockCalculator}
            memoryMonitor={mockMemoryMonitor}
            onBackpressure={backpressureEvents}
            maxQueueSize={100}
          />
        </WebSocketProvider>
      );

      await act(async () => {
        await mockWebSocket.connect();
      });

      // Act - Send updates faster than they can be processed
      const bulkData = mockTokenStream.generateBulkTokenData(1000);
      
      await act(async () => {
        // Simulate rapid-fire updates
        bulkData.forEach((data, index) => {
          setTimeout(() => {
            mockWebSocket.simulateMessage('token-cost-updates', data);
          }, index * 0.1); // 0.1ms intervals = 10,000 updates/second
        });
        
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Assert - Backpressure should be triggered
      await waitFor(() => {
        expect(backpressureEvents).toHaveBeenCalled();
      });
      
      // System should continue functioning despite backpressure
      expect(mockCalculator.processBatch).toHaveBeenCalled();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from WebSocket errors and maintain data integrity', async () => {
      // Arrange
      const errorRecoveryAttempts = jest.fn();
      const dataIntegrityChecks = jest.fn();
      
      render(
        <WebSocketProvider value={mockWebSocket}>
          <TokenCostAnalytics 
            calculator={mockCalculator}
            onErrorRecovery={errorRecoveryAttempts}
            onDataIntegrityCheck={dataIntegrityChecks}
          />
        </WebSocketProvider>
      );

      await act(async () => {
        await mockWebSocket.connect();
      });

      // Send some initial data
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          mockWebSocket.simulateMessage('token-cost-updates', {
            tokens: i + 1,
            cost: (i + 1) * 0.01,
            timestamp: Date.now() + i,
            sequenceId: i
          });
        }
      });

      // Act - Simulate network error
      await act(async () => {
        mockWebSocket.simulateDisconnection();
        // Simulate data loss during disconnection
        mockWebSocket.simulateMessage('token-cost-updates', {
          tokens: 20,
          cost: 0.20,
          timestamp: Date.now() + 15,
          sequenceId: 15 // Gap in sequence
        });
      });

      // Assert - Should detect gap and request missing data
      await waitFor(() => {
        expect(errorRecoveryAttempts).toHaveBeenCalled();
        expect(dataIntegrityChecks).toHaveBeenCalledWith(
          expect.objectContaining({
            expectedSequence: 11,
            receivedSequence: 15,
            gap: 4
          })
        );
      });
    });

    it('should maintain token calculation accuracy during connection instability', async () => {
      // Arrange - Unstable connection
      const unstableWebSocket = createRealisticWebSocketMock(100, 0.1); // 10% dropout
      const calculationResults = [];
      
      render(
        <WebSocketProvider value={unstableWebSocket}>
          <TokenCostAnalytics 
            calculator={mockCalculator}
            onCalculationComplete={(result) => {
              calculationResults.push(result);
            }}
          />
        </WebSocketProvider>
      );

      await act(async () => {
        await unstableWebSocket.connect();
      });

      // Act - Send token data with intentional connection issues
      const testData = [
        { tokens: 100, expectedCost: 1.00 },
        { tokens: 250, expectedCost: 2.50 },
        { tokens: 500, expectedCost: 5.00 }
      ];

      await act(async () => {
        for (let i = 0; i < testData.length; i++) {
          const data = testData[i];
          
          // Simulate connection instability
          if (i === 1) {
            unstableWebSocket.simulateDisconnection();
            await new Promise(resolve => setTimeout(resolve, 100));
            await unstableWebSocket.connect();
          }
          
          await unstableWebSocket.send('token-cost-updates', {
            tokens: data.tokens,
            timestamp: Date.now() + i
          });
        }
      });

      // Assert - Calculations should remain accurate despite connection issues
      await waitFor(() => {
        expect(calculationResults.length).toBeGreaterThan(0);
      });

      calculationResults.forEach((result, index) => {
        if (testData[index]) {
          expect(result.cost).toBeCloseTo(testData[index].expectedCost, 2);
        }
      });

      // Verify error handling was invoked
      expect(mockCalculator.handleCalculationError).toHaveBeenCalledTimes(0); // No calculation errors
    });
  });

  describe('Memory Management Under Streaming Load', () => {
    it('should prevent memory leaks during extended streaming sessions', async () => {
      // Arrange - Long-running streaming session
      const memorySnapshots = [];
      
      render(
        <WebSocketProvider value={mockWebSocket}>
          <TokenCostAnalytics 
            calculator={mockCalculator}
            memoryMonitor={mockMemoryMonitor}
            memoryThreshold={80}
          />
        </WebSocketProvider>
      );

      await act(async () => {
        await mockWebSocket.connect();
        mockMemoryMonitor.startMonitoring();
      });

      // Act - Simulate 5-minute streaming session
      await act(async () => {
        const streamDuration = 5000; // 5 seconds (simulating 5 minutes)
        const updateInterval = 10; // Every 10ms
        const totalUpdates = streamDuration / updateInterval;
        
        for (let i = 0; i < totalUpdates; i++) {
          setTimeout(() => {
            mockWebSocket.simulateMessage('token-cost-updates', {
              tokens: Math.floor(Math.random() * 100) + 1,
              cost: Math.random() * 5,
              timestamp: Date.now() + i
            });
            
            // Take memory snapshot every 100 updates
            if (i % 100 === 0) {
              memorySnapshots.push(mockMemoryMonitor.getMemoryUsage());
            }
          }, i * updateInterval);
        }
        
        await new Promise(resolve => setTimeout(resolve, streamDuration + 100));
      });

      // Assert - Memory usage should not grow unbounded
      expect(memorySnapshots.length).toBeGreaterThan(5);
      
      const initialMemory = memorySnapshots[0].percentage;
      const finalMemory = memorySnapshots[memorySnapshots.length - 1].percentage;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be controlled (less than 30% increase)
      expect(memoryGrowth).toBeLessThan(30);
      
      // Should trigger memory cleanup when threshold is approached
      expect(mockMemoryMonitor.clearMemory).toHaveBeenCalled();
    });
  });
});