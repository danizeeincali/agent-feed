# Testing Strategy for Connection Management

## Overview

This document outlines the comprehensive testing strategy for the WebSocket connection management system. The strategy covers unit tests, integration tests, end-to-end tests, and performance testing to ensure robust, reliable connection management.

## Testing Architecture

### Test Categories

#### 1. Unit Tests
- **Connection Manager Core Logic**
- **State Machine Transitions**
- **Reconnection Strategies**
- **Health Monitoring**
- **Metrics Tracking**
- **Error Handling**

#### 2. Integration Tests
- **WebSocket Client-Server Communication**
- **React Hook Integration**
- **UI Component Behavior**
- **Event-Driven Architecture**
- **Error Recovery Flows**

#### 3. End-to-End Tests
- **Complete User Workflows**
- **Cross-Browser Compatibility**
- **Network Condition Simulation**
- **Real-Time Feature Validation**

#### 4. Performance Tests
- **Connection Latency**
- **Memory Usage**
- **CPU Utilization**
- **Concurrent Connection Handling**

## Unit Testing Framework

### Test Environment Setup

```typescript
// jest.config.js for connection management tests
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup/connection-test-setup.ts'],
  testMatch: [
    '<rootDir>/src/tests/unit/connection/**/*.test.ts',
    '<rootDir>/src/tests/unit/connection/**/*.test.tsx'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/services/connection/**/*.ts',
    'src/hooks/useConnectionManager.ts',
    'src/components/connection/**/*.tsx',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Mock WebSocket Implementation

```typescript
// src/tests/mocks/MockWebSocket.ts
export class MockWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  public readyState: number = MockWebSocket.CONNECTING;
  public url: string;
  public protocol: string = '';
  
  private static instances: MockWebSocket[] = [];
  private messageQueue: any[] = [];
  private closeHandlers: Array<(event: CloseEvent) => void> = [];
  private errorHandlers: Array<(event: Event) => void> = [];
  
  constructor(url: string, protocols?: string | string[]) {
    super();
    this.url = url;
    MockWebSocket.instances.push(this);
    
    // Simulate async connection
    setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        this.dispatchEvent(new Event('open'));
      }
    }, 10);
  }
  
  send(data: string | ArrayBuffer | Blob): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    
    this.messageQueue.push(data);
    
    // Simulate server echo for testing
    setTimeout(() => {
      const response = typeof data === 'string' ? JSON.parse(data) : data;
      this.simulateMessage({ type: 'echo', data: response });
    }, 5);
  }
  
  close(code?: number, reason?: string): void {
    if (this.readyState === MockWebSocket.CLOSED || this.readyState === MockWebSocket.CLOSING) {
      return;
    }
    
    this.readyState = MockWebSocket.CLOSING;
    
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      const closeEvent = new CloseEvent('close', { code: code || 1000, reason: reason || '' });
      this.dispatchEvent(closeEvent);
    }, 10);
  }
  
  // Test utilities
  simulateMessage(data: any): void {
    const messageEvent = new MessageEvent('message', { data: JSON.stringify(data) });
    this.dispatchEvent(messageEvent);
  }
  
  simulateError(error: string): void {
    const errorEvent = new Event('error');
    (errorEvent as any).error = new Error(error);
    this.dispatchEvent(errorEvent);
  }
  
  simulateConnectionFailure(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.simulateError('Connection failed');
  }
  
  static getInstances(): MockWebSocket[] {
    return MockWebSocket.instances;
  }
  
  static resetInstances(): void {
    MockWebSocket.instances = [];
  }
  
  static getLastInstance(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }
}

// Mock Socket.IO client
export const mockSocketIOClient = {
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
    id: 'mock-socket-id'
  }))
};
```

### Connection Manager Unit Tests

```typescript
// src/tests/unit/connection/connection-manager.test.ts
import { WebSocketConnectionManager } from '@/services/connection/connection-manager';
import { ConnectionState } from '@/services/connection/types';
import { MockWebSocket } from '../../mocks/MockWebSocket';

// Mock Socket.IO
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
    removeAllListeners: jest.fn()
  }))
}));

describe('WebSocketConnectionManager', () => {
  let manager: WebSocketConnectionManager;
  
  beforeEach(() => {
    MockWebSocket.resetInstances();
    manager = new WebSocketConnectionManager({
      url: 'ws://localhost:3001',
      autoConnect: false
    });
  });
  
  afterEach(() => {
    manager.destroy();
  });
  
  describe('Connection Lifecycle', () => {
    it('should initialize in disconnected state', () => {
      expect(manager.getState()).toBe(ConnectionState.DISCONNECTED);
      expect(manager.isConnected()).toBe(false);
    });
    
    it('should transition to connecting state when connect is called', async () => {
      const connectPromise = manager.connect();
      expect(manager.getState()).toBe(ConnectionState.CONNECTING);
      
      // Wait for connection to complete
      await connectPromise;
      expect(manager.getState()).toBe(ConnectionState.CONNECTED);
    });
    
    it('should handle connection failures gracefully', async () => {
      const mockSocket = MockWebSocket.getLastInstance();
      
      // Simulate connection failure
      setTimeout(() => {
        mockSocket?.simulateConnectionFailure();
      }, 5);
      
      await expect(manager.connect()).rejects.toThrow();
      expect(manager.getState()).toBe(ConnectionState.ERROR);
    });
    
    it('should transition to disconnected state when disconnect is called', async () => {
      await manager.connect();
      expect(manager.getState()).toBe(ConnectionState.CONNECTED);
      
      await manager.disconnect();
      expect(manager.getState()).toBe(ConnectionState.DISCONNECTED);
    });
  });
  
  describe('Reconnection Logic', () => {
    it('should attempt reconnection after connection loss', async () => {
      await manager.connect();
      const mockSocket = MockWebSocket.getLastInstance();
      
      // Simulate connection loss
      mockSocket?.simulateConnectionFailure();
      
      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(manager.getState()).toBe(ConnectionState.RECONNECTING);
    });
    
    it('should respect max reconnection attempts', async () => {
      const limitedManager = new WebSocketConnectionManager({
        url: 'ws://localhost:3001',
        maxReconnectAttempts: 2,
        autoConnect: false
      });
      
      // Simulate repeated failures
      for (let i = 0; i < 3; i++) {
        try {
          await limitedManager.reconnect();
        } catch (error) {
          // Expected to fail after max attempts
        }
      }
      
      expect(limitedManager.getState()).toBe(ConnectionState.ERROR);
      limitedManager.destroy();
    });
  });
  
  describe('Event Emission', () => {
    it('should emit state change events', async () => {
      const stateChangeHandler = jest.fn();
      manager.on('state_change', stateChangeHandler);
      
      await manager.connect();
      
      expect(stateChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          from: ConnectionState.DISCONNECTED,
          to: ConnectionState.CONNECTING
        })
      );
    });
    
    it('should emit error events on connection failures', async () => {
      const errorHandler = jest.fn();
      manager.on('error', errorHandler);
      
      const mockSocket = MockWebSocket.getLastInstance();
      setTimeout(() => mockSocket?.simulateError('Test error'), 5);
      
      try {
        await manager.connect();
      } catch (error) {
        // Expected
      }
      
      expect(errorHandler).toHaveBeenCalled();
    });
  });
});
```

### Health Monitor Unit Tests

```typescript
// src/tests/unit/connection/health-monitor.test.ts
import { PingHealthMonitor } from '@/services/connection/health-monitor';
import { WebSocketConnectionManager } from '@/services/connection/connection-manager';

describe('PingHealthMonitor', () => {
  let manager: WebSocketConnectionManager;
  let healthMonitor: PingHealthMonitor;
  
  beforeEach(() => {
    manager = new WebSocketConnectionManager({
      url: 'ws://localhost:3001',
      autoConnect: false
    });
    healthMonitor = new PingHealthMonitor(manager, {
      interval: 100, // Short interval for testing
      timeout: 50,
      maxFailures: 2
    });
  });
  
  afterEach(() => {
    healthMonitor.stopMonitoring();
    manager.destroy();
  });
  
  it('should start monitoring when connection is established', async () => {
    await manager.connect();
    healthMonitor.startMonitoring();
    
    // Wait for initial ping
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const health = healthMonitor.getHealth();
    expect(health.lastPing).toBeTruthy();
  });
  
  it('should detect connection health degradation', async () => {
    await manager.connect();
    const mockSocket = manager.getSocket();
    
    // Mock ping timeout
    mockSocket.emit = jest.fn();
    
    healthMonitor.startMonitoring();
    
    // Wait for ping attempts to fail
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const health = healthMonitor.getHealth();
    expect(health.consecutiveFailures).toBeGreaterThan(0);
    expect(health.isHealthy).toBe(false);
  });
});
```

## Integration Testing

### React Hook Testing

```typescript
// src/tests/integration/hooks/useConnectionManager.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useConnectionManager } from '@/hooks/useConnectionManager';
import { ConnectionState } from '@/services/connection/types';

describe('useConnectionManager Integration', () => {
  it('should provide connection state and control methods', () => {
    const { result } = renderHook(() => useConnectionManager({
      url: 'ws://localhost:3001',
      autoConnect: false
    }));
    
    expect(result.current.state).toBe(ConnectionState.DISCONNECTED);
    expect(result.current.isConnected).toBe(false);
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
  });
  
  it('should update state when connection changes', async () => {
    const { result } = renderHook(() => useConnectionManager({
      url: 'ws://localhost:3001',
      autoConnect: false
    }));
    
    await act(async () => {
      await result.current.connect();
    });
    
    expect(result.current.state).toBe(ConnectionState.CONNECTED);
    expect(result.current.isConnected).toBe(true);
  });
});
```

### UI Component Testing

```typescript
// src/tests/integration/components/ConnectionStatusIndicator.test.tsx
import { render, screen } from '@testing-library/react';
import { ConnectionStatusIndicator } from '@/components/connection/ConnectionStatusIndicator';
import { useConnectionManager } from '@/hooks/useConnectionManager';

// Mock the hook
jest.mock('@/hooks/useConnectionManager');
const mockUseConnectionManager = useConnectionManager as jest.MockedFunction<typeof useConnectionManager>;

describe('ConnectionStatusIndicator Integration', () => {
  it('should display correct status for connected state', () => {
    mockUseConnectionManager.mockReturnValue({
      state: ConnectionState.CONNECTED,
      isConnected: true,
      health: { latency: 50, networkQuality: 'excellent' },
      // ... other properties
    } as any);
    
    render(<ConnectionStatusIndicator showText showLatency />);
    
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
    expect(screen.getByText(/50ms/)).toBeInTheDocument();
  });
  
  it('should display error state with appropriate styling', () => {
    mockUseConnectionManager.mockReturnValue({
      state: ConnectionState.ERROR,
      isConnected: false,
      hasError: true,
      // ... other properties
    } as any);
    
    render(<ConnectionStatusIndicator variant="detailed" />);
    
    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { hidden: true })).toHaveClass('text-red-500');
  });
});
```

## Network Simulation Testing

### Connection Scenario Testing

```typescript
// src/tests/integration/network/connection-scenarios.test.ts
import { WebSocketConnectionManager } from '@/services/connection/connection-manager';
import { ConnectionState } from '@/services/connection/types';

describe('Network Scenario Testing', () => {
  let manager: WebSocketConnectionManager;
  
  beforeEach(() => {
    manager = new WebSocketConnectionManager({
      url: 'ws://localhost:3001',
      autoConnect: false
    });
  });
  
  afterEach(() => {
    manager.destroy();
  });
  
  describe('Intermittent Connectivity', () => {
    it('should handle rapid connect/disconnect cycles', async () => {
      const connectionPromises = [];
      
      // Simulate rapid connection attempts
      for (let i = 0; i < 5; i++) {
        connectionPromises.push(
          manager.connect().catch(() => {}) // Ignore failures
        );
        
        if (i % 2 === 0) {
          await manager.disconnect();
        }
      }
      
      await Promise.all(connectionPromises);
      
      // Should eventually stabilize
      expect([
        ConnectionState.CONNECTED,
        ConnectionState.DISCONNECTED,
        ConnectionState.ERROR
      ]).toContain(manager.getState());
    });
  });
  
  describe('Slow Network Conditions', () => {
    it('should handle connection timeouts gracefully', async () => {
      const slowManager = new WebSocketConnectionManager({
        url: 'ws://slow-server:3001',
        timeout: 100, // Very short timeout
        autoConnect: false
      });
      
      await expect(slowManager.connect()).rejects.toThrow(/timeout/i);
      expect(slowManager.getState()).toBe(ConnectionState.ERROR);
      
      slowManager.destroy();
    });
  });
});
```

## Performance Testing

### Memory Leak Detection

```typescript
// src/tests/performance/memory-leaks.test.ts
describe('Memory Leak Testing', () => {
  it('should not leak memory during repeated connections', async () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Create and destroy many connection managers
    for (let i = 0; i < 100; i++) {
      const manager = new WebSocketConnectionManager({
        url: 'ws://localhost:3001',
        autoConnect: false
      });
      
      await manager.connect().catch(() => {});
      await manager.disconnect();
      manager.destroy();
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryGrowth = finalMemory - initialMemory;
    
    // Memory growth should be reasonable (less than 5MB)
    expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024);
  });
});
```

### Latency Testing

```typescript
// src/tests/performance/latency.test.ts
describe('Connection Latency Testing', () => {
  it('should maintain low latency under normal conditions', async () => {
    const manager = new WebSocketConnectionManager({
      url: 'ws://localhost:3001',
      autoConnect: false
    });
    
    await manager.connect();
    
    const latencyMeasurements: number[] = [];
    
    // Measure ping latency multiple times
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();
      
      // Simulate ping operation
      await new Promise(resolve => {
        const socket = manager.getSocket();
        socket.emit('ping', startTime, () => {
          const latency = performance.now() - startTime;
          latencyMeasurements.push(latency);
          resolve(void 0);
        });
      });
    }
    
    const averageLatency = latencyMeasurements.reduce((a, b) => a + b, 0) / latencyMeasurements.length;
    
    // Average latency should be reasonable (less than 100ms in test environment)
    expect(averageLatency).toBeLessThan(100);
    
    manager.destroy();
  });
});
```

## End-to-End Testing

### Playwright E2E Tests

```typescript
// e2e/connection-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Connection Management E2E', () => {
  test('should show connection status in UI', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for initial connection
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
    
    // Check connection indicator
    await expect(page.locator('.connection-indicator')).toHaveClass(/connected/);
  });
  
  test('should handle manual disconnect and reconnect', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for connection
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
    
    // Disconnect manually
    await page.click('[data-testid="disconnect-button"]');
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected');
    
    // Reconnect
    await page.click('[data-testid="connect-button"]');
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
  });
  
  test('should show health metrics', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Open health dashboard
    await page.click('[data-testid="health-dashboard-button"]');
    
    // Check for latency display
    await expect(page.locator('[data-testid="latency-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="quality-metric"]')).toBeVisible();
  });
});
```

## Test Data and Fixtures

### Test Configuration

```typescript
// src/tests/fixtures/connection-config.ts
export const TEST_CONFIGS = {
  minimal: {
    url: 'ws://localhost:3001',
    autoConnect: false,
    reconnection: false
  },
  
  withReconnection: {
    url: 'ws://localhost:3001',
    autoConnect: false,
    reconnection: true,
    maxReconnectAttempts: 3,
    reconnectionDelay: 100
  },
  
  production: {
    url: 'wss://api.example.com/ws',
    autoConnect: true,
    reconnection: true,
    maxReconnectAttempts: 10,
    reconnectionDelay: 1000,
    withCredentials: true
  }
};
```

## Continuous Integration

### GitHub Actions Test Workflow

```yaml
# .github/workflows/connection-tests.yml
name: Connection Management Tests

on:
  push:
    branches: [ main, develop ]
    paths: 
      - 'frontend/src/services/connection/**'
      - 'frontend/src/hooks/useConnectionManager.ts'
      - 'frontend/src/components/connection/**'
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18, 20]
        
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
        
    - name: Install dependencies
      working-directory: frontend
      run: npm ci
      
    - name: Run unit tests
      working-directory: frontend
      run: npm run test:connection -- --coverage
      
    - name: Run integration tests
      working-directory: frontend
      run: npm run test:integration:connection
      
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: frontend/coverage/lcov.info
        flags: connection-management
        
  e2e:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 18
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Start test server
      run: npm run dev &
      
    - name: Wait for server
      run: npx wait-on http://localhost:3000
      
    - name: Run Playwright tests
      run: npx playwright test e2e/connection-management.spec.ts
      
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
```

## Test Execution Guidelines

### Running Tests Locally

```bash
# Unit tests
npm run test:connection

# Integration tests
npm run test:integration:connection

# Performance tests
npm run test:performance:connection

# E2E tests
npm run test:e2e:connection

# All connection-related tests
npm run test:connection:all
```

### Coverage Requirements

- **Minimum Coverage**: 80% for all metrics (lines, functions, branches, statements)
- **Critical Path Coverage**: 95% for connection state machine and error handling
- **UI Component Coverage**: 90% for connection-related components

### Test Maintenance

1. **Regular Review**: Review and update tests monthly
2. **Flaky Test Monitoring**: Track and fix unstable tests
3. **Performance Baseline**: Update performance benchmarks quarterly
4. **Cross-Browser Testing**: Test in Chrome, Firefox, Safari, Edge
5. **Mobile Testing**: Include mobile browsers in E2E testing