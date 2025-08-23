/**
 * WebSocket Hub Test Mocks - London School TDD
 * Mock factories for all WebSocket Hub collaborators
 */

import { jest } from '@jest/globals';

// Mock WebSocket connection
export const createMockWebSocket = (id: string = 'test-ws') => ({
  id,
  readyState: 1, // OPEN
  send: jest.fn(),
  close: jest.fn(),
  terminate: jest.fn(),
  ping: jest.fn(),
  pong: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
  isAlive: true,
  lastSeen: Date.now()
});

// Mock WebSocket Server
export const createMockWebSocketServer = () => ({
  clients: new Set(),
  on: jest.fn(),
  close: jest.fn(),
  handleUpgrade: jest.fn(),
  emit: jest.fn()
});

// Mock Hub Router - focuses on message routing behavior
export const createMockHubRouter = () => ({
  route: jest.fn(),
  registerChannel: jest.fn(),
  unregisterChannel: jest.fn(),
  getRoute: jest.fn(),
  validateRoute: jest.fn(),
  getChannelClients: jest.fn().mockReturnValue([]),
  routeMessage: jest.fn().mockResolvedValue(true)
});

// Mock Security Manager - focuses on authorization behavior
export const createMockSecurityManager = () => ({
  validateConnection: jest.fn().mockResolvedValue(true),
  authorizeChannel: jest.fn().mockResolvedValue(true),
  validateMessage: jest.fn().mockResolvedValue(true),
  isolateChannel: jest.fn(),
  revokeAccess: jest.fn(),
  getChannelPermissions: jest.fn().mockReturnValue(['read', 'write']),
  enforceRateLimit: jest.fn().mockResolvedValue(true)
});

// Mock Connection Manager - focuses on connection lifecycle
export const createMockConnectionManager = () => ({
  register: jest.fn().mockResolvedValue('client-123'),
  unregister: jest.fn(),
  heartbeat: jest.fn(),
  getConnection: jest.fn(),
  getAllConnections: jest.fn().mockReturnValue(new Map()),
  isConnected: jest.fn().mockReturnValue(true),
  getConnectionCount: jest.fn().mockReturnValue(0),
  cleanupStaleConnections: jest.fn()
});

// Mock Message Queue - focuses on message handling behavior
export const createMockMessageQueue = () => ({
  enqueue: jest.fn(),
  dequeue: jest.fn(),
  peek: jest.fn(),
  size: jest.fn().mockReturnValue(0),
  clear: jest.fn(),
  process: jest.fn(),
  onMessage: jest.fn(),
  getQueueStats: jest.fn().mockReturnValue({ pending: 0, processed: 0, errors: 0 })
});

// Mock Performance Monitor - focuses on metrics collection
export const createMockPerformanceMonitor = () => ({
  recordLatency: jest.fn(),
  recordThroughput: jest.fn(),
  recordConnection: jest.fn(),
  recordDisconnection: jest.fn(),
  recordError: jest.fn(),
  getMetrics: jest.fn().mockReturnValue({
    averageLatency: 10,
    throughput: 100,
    activeConnections: 0,
    errorRate: 0
  }),
  reset: jest.fn()
});

// Mock Event Logger - focuses on audit trail
export const createMockEventLogger = () => ({
  logConnection: jest.fn(),
  logDisconnection: jest.fn(),
  logMessage: jest.fn(),
  logError: jest.fn(),
  logSecurity: jest.fn(),
  getEvents: jest.fn().mockReturnValue([]),
  clearEvents: jest.fn()
});

// Hub Client Mock Factory
export const createMockHubClient = (type: 'frontend' | 'prod' = 'frontend', channel: string = 'default') => ({
  id: `${type}-client-${Math.random().toString(36).substr(2, 9)}`,
  type,
  channel,
  ws: createMockWebSocket(),
  authenticated: true,
  permissions: ['read', 'write'],
  lastActivity: Date.now(),
  metadata: { userAgent: 'test', ip: '127.0.0.1' }
});

// Message Mock Factory
export const createMockMessage = (from: string, to: string, type: string = 'data') => ({
  id: `msg-${Math.random().toString(36).substr(2, 9)}`,
  from,
  to,
  type,
  channel: 'default',
  payload: { test: true },
  timestamp: Date.now(),
  retries: 0
});

// Contract Testing Helpers
export const verifyMockContract = (mock: any, expectedMethods: string[]) => {
  expectedMethods.forEach(method => {
    expect(mock[method]).toBeDefined();
    expect(typeof mock[method]).toBe('function');
  });
};

// Swarm Coordination Mocks
export const createMockSwarmCoordinator = () => ({
  notifyTestStart: jest.fn(),
  shareResults: jest.fn(),
  registerTestAgent: jest.fn(),
  coordinateExecution: jest.fn(),
  aggregateResults: jest.fn()
});