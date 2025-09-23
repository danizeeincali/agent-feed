/**
 * Mock Factories for Token Analytics Testing
 * London School TDD - Mock-Driven Development
 * 
 * Provides test doubles for:
 * - WebSocket connections (65% risk mitigation)
 * - Token calculation services (72% accuracy risk)
 * - Memory monitoring (78% memory leak risk)
 * - Budget alert systems
 */

import { jest } from '@jest/globals';

// WebSocket Service Mock Factory
export const mockWebSocketService = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockImplementation((channel: string, callback: Function) => {
    // Store callback for later invocation
    return { channel, callback, unsubscribe: jest.fn() };
  }),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue(undefined),
  isConnected: jest.fn().mockReturnValue(true),
  getConnectionState: jest.fn().mockReturnValue('connected'),
  onConnectionChange: jest.fn(),
  
  // Error simulation methods
  simulateDisconnection: jest.fn(),
  simulateReconnection: jest.fn(),
  simulateError: jest.fn(),
  
  // Performance monitoring
  getLatency: jest.fn().mockReturnValue(50), // 50ms latency
  getMessageCount: jest.fn().mockReturnValue(0),
  resetCounters: jest.fn()
});

// Token Calculator Mock Factory
export const mockTokenCalculator = () => ({
  calculateCost: jest.fn().mockImplementation((tokens: number) => {
    if (typeof tokens !== 'number' || !isFinite(tokens) || tokens < 0) {
      return 0;
    }
    return tokens * 0.01; // $0.01 per token
  }),
  
  calculateBulkCost: jest.fn().mockImplementation((tokenArray: number[]) => {
    return tokenArray.reduce((sum, tokens) => sum + (tokens * 0.01), 0);
  }),
  
  processBatch: jest.fn().mockImplementation((updates: Array<{tokens: number}>) => {
    return updates.map(update => ({
      ...update,
      cost: update.tokens * 0.01,
      processed: true
    }));
  }),
  
  onCostUpdate: jest.fn().mockImplementation((callback: Function) => {
    // Store callback for manual triggering in tests
    return { callback, unsubscribe: jest.fn() };
  }),
  
  getCurrentRate: jest.fn().mockReturnValue(0.01),
  setRate: jest.fn(),
  
  // Error handling
  handleCalculationError: jest.fn(),
  validateInput: jest.fn().mockReturnValue(true),
  
  // Cleanup
  destroy: jest.fn(),
  
  // Performance metrics
  getProcessingTime: jest.fn().mockReturnValue(1), // 1ms processing time
  getTotalProcessed: jest.fn().mockReturnValue(0),
  resetMetrics: jest.fn()
});

// Budget Alert System Mock
export const mockBudgetAlerts = () => ({
  checkThreshold: jest.fn().mockImplementation((current: number, threshold: number) => {
    return current > threshold;
  }),
  
  triggerAlert: jest.fn().mockImplementation((alert: any) => {
    return Promise.resolve({ sent: true, alertId: `alert-${Date.now()}` });
  }),
  
  setThreshold: jest.fn(),
  getThreshold: jest.fn().mockReturnValue(100.00),
  
  subscribe: jest.fn().mockImplementation((callback: Function) => ({
    unsubscribe: jest.fn()
  })),
  
  getAlertHistory: jest.fn().mockReturnValue([]),
  clearAlerts: jest.fn(),
  
  // Alert types
  createBudgetAlert: jest.fn(),
  createUsageAlert: jest.fn(),
  createPerformanceAlert: jest.fn(),
  
  // Configuration
  configure: jest.fn(),
  getConfiguration: jest.fn().mockReturnValue({
    budgetThreshold: 100.00,
    usageThreshold: 80,
    alertFrequency: 'once'
  })
});

// Memory Monitor Mock Factory
export const mockMemoryMonitor = () => ({
  startMonitoring: jest.fn().mockImplementation(() => {
    // Simulate monitoring start
    return Promise.resolve({ monitoring: true });
  }),
  
  stopMonitoring: jest.fn().mockImplementation(() => {
    return Promise.resolve({ monitoring: false });
  }),
  
  getMemoryUsage: jest.fn().mockReturnValue({
    used: 50 * 1024 * 1024, // 50MB
    total: 100 * 1024 * 1024, // 100MB
    percentage: 50,
    available: 50 * 1024 * 1024
  }),
  
  onMemoryThreshold: jest.fn().mockImplementation((threshold: number, callback: Function) => {
    return { threshold, callback, unsubscribe: jest.fn() };
  }),
  
  clearMemory: jest.fn().mockImplementation(() => {
    return Promise.resolve({ freed: 10 * 1024 * 1024 }); // 10MB freed
  }),
  
  getMemoryHistory: jest.fn().mockReturnValue([]),
  
  // Leak detection
  detectLeaks: jest.fn().mockReturnValue([]),
  markReference: jest.fn(),
  checkReferences: jest.fn().mockReturnValue({ leaks: [] }),
  
  // Thresholds
  setMemoryThreshold: jest.fn(),
  getMemoryThreshold: jest.fn().mockReturnValue(80), // 80% threshold
  
  // Performance
  getGCStats: jest.fn().mockReturnValue({
    collections: 5,
    totalTime: 100, // 100ms total GC time
    avgTime: 20 // 20ms average
  })
});

// WebSocket Connection Mock with Realistic Behavior
export const createRealisticWebSocketMock = (
  connectionDelay: number = 100,
  dropoutRate: number = 0.02 // 2% message dropout
) => {
  let connected = false;
  let messageCount = 0;
  const subscribers = new Map<string, Function[]>();
  
  return {
    connect: jest.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          connected = true;
          resolve(undefined);
        }, connectionDelay);
      });
    }),
    
    disconnect: jest.fn().mockImplementation(() => {
      connected = false;
      return Promise.resolve(undefined);
    }),
    
    subscribe: jest.fn().mockImplementation((channel: string, callback: Function) => {
      if (!subscribers.has(channel)) {
        subscribers.set(channel, []);
      }
      subscribers.get(channel)?.push(callback);
      
      return {
        unsubscribe: jest.fn().mockImplementation(() => {
          const callbacks = subscribers.get(channel) || [];
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
        })
      };
    }),
    
    send: jest.fn().mockImplementation((channel: string, data: any) => {
      messageCount++;
      
      // Simulate message dropout
      if (Math.random() < dropoutRate) {
        return Promise.reject(new Error('Message dropped'));
      }
      
      // Simulate network delay
      return new Promise((resolve) => {
        setTimeout(() => {
          const callbacks = subscribers.get(channel) || [];
          callbacks.forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error('Callback error:', error);
            }
          });
          resolve(undefined);
        }, Math.random() * 50); // 0-50ms delay
      });
    }),
    
    isConnected: jest.fn().mockImplementation(() => connected),
    
    getConnectionState: jest.fn().mockImplementation(() => {
      return connected ? 'connected' : 'disconnected';
    }),
    
    // Test utilities
    simulateMessage: (channel: string, data: any) => {
      const callbacks = subscribers.get(channel) || [];
      callbacks.forEach(callback => callback(data));
    },
    
    simulateDisconnection: () => {
      connected = false;
      // Notify all subscribers about disconnection
      subscribers.forEach((callbacks, channel) => {
        callbacks.forEach(callback => {
          try {
            callback({ type: 'disconnection', channel });
          } catch (error) {
            console.error('Disconnection callback error:', error);
          }
        });
      });
    },
    
    getMessageCount: jest.fn().mockImplementation(() => messageCount),
    resetCounters: jest.fn().mockImplementation(() => { messageCount = 0; })
  };
};

// High-Performance Token Stream Mock
export const createHighPerformanceTokenStreamMock = () => {
  const subscribers = new Set<Function>();
  let isRunning = false;
  let intervalId: NodeJS.Timeout | null = null;
  
  return {
    startStream: jest.fn().mockImplementation((frequency: number = 100) => {
      if (isRunning) return;
      
      isRunning = true;
      intervalId = setInterval(() => {
        const tokenData = {
          tokens: Math.floor(Math.random() * 100) + 1,
          cost: Math.random() * 5 + 0.01,
          timestamp: Date.now(),
          model: 'gpt-4',
          operation: 'completion'
        };
        
        subscribers.forEach(callback => {
          try {
            callback(tokenData);
          } catch (error) {
            console.error('Stream callback error:', error);
          }
        });
      }, 1000 / frequency); // Convert frequency to interval
    }),
    
    stopStream: jest.fn().mockImplementation(() => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      isRunning = false;
    }),
    
    subscribe: jest.fn().mockImplementation((callback: Function) => {
      subscribers.add(callback);
      return {
        unsubscribe: jest.fn().mockImplementation(() => {
          subscribers.delete(callback);
        })
      };
    }),
    
    isRunning: jest.fn().mockImplementation(() => isRunning),
    
    // Bulk generation for testing
    generateBulkTokenData: jest.fn().mockImplementation((count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        tokens: Math.floor(Math.random() * 100) + 1,
        cost: Math.random() * 5 + 0.01,
        timestamp: Date.now() + i,
        model: 'gpt-4',
        operation: 'completion',
        sequenceId: i
      }));
    }),
    
    // Memory-efficient streaming
    createBatchedStream: jest.fn().mockImplementation((batchSize: number = 10) => {
      return {
        subscribe: jest.fn(),
        processBatch: jest.fn(),
        clearBatch: jest.fn(),
        getBatchSize: jest.fn().mockReturnValue(batchSize)
      };
    })
  };
};

// Database Mock for Historical Data
export const mockTokenDatabase = () => ({
  insert: jest.fn().mockResolvedValue({ id: 'token-record-123' }),
  
  query: jest.fn().mockImplementation((params: any) => {
    // Simulate query results based on parameters
    const mockResults = Array.from({ length: params.limit || 10 }, (_, i) => ({
      id: `record-${i}`,
      tokens: Math.floor(Math.random() * 100),
      cost: Math.random() * 5,
      timestamp: Date.now() - (i * 60000), // 1 minute intervals
      model: 'gpt-4'
    }));
    
    return Promise.resolve(mockResults);
  }),
  
  aggregate: jest.fn().mockImplementation((timeframe: string) => {
    return Promise.resolve({
      totalTokens: 10000,
      totalCost: 100.50,
      avgTokensPerRequest: 250,
      avgCostPerRequest: 2.51,
      timeframe
    });
  }),
  
  cleanup: jest.fn().mockResolvedValue({ deletedRecords: 100 }),
  
  getStats: jest.fn().mockResolvedValue({
    totalRecords: 1000,
    oldestRecord: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    newestRecord: new Date(),
    avgRecordSize: 256 // bytes
  }),
  
  // Batch operations
  insertBatch: jest.fn().mockResolvedValue({ insertedIds: [] }),
  deleteBatch: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  
  // Performance monitoring
  getPerformanceMetrics: jest.fn().mockResolvedValue({
    avgQueryTime: 15, // ms
    totalQueries: 500,
    cacheHitRate: 0.85
  })
});

// Export all mock factories
export const TokenAnalyticsMocks = {
  webSocket: mockWebSocketService,
  calculator: mockTokenCalculator,
  budgetAlerts: mockBudgetAlerts,
  memoryMonitor: mockMemoryMonitor,
  realisticWebSocket: createRealisticWebSocketMock,
  highPerformanceStream: createHighPerformanceTokenStreamMock,
  database: mockTokenDatabase
};