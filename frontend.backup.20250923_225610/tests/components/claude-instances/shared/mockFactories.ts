/**
 * Shared Mock Factories for Claude Instance Management Tests
 * 
 * London School TDD approach: Define contracts and mock collaborators
 * Provides consistent mock implementations across test suites
 */

import { ClaudeInstanceType, ClaudeInstance, ConversationMessage, MessageAttachment } from '../../../../src/types/claude-instances';

// Swarm Coordination Mock Factory
export const createSwarmCoordinator = () => ({
  notifySelection: jest.fn(),
  shareInstanceState: jest.fn(), 
  coordinateWithPeers: jest.fn(),
  shareMessage: jest.fn(),
  syncConversationState: jest.fn(),
  notifyTyping: jest.fn(),
  shareFileUpload: jest.fn(),
  shareStatus: jest.fn(),
  coordinateHealthChecks: jest.fn(),
  notifyStatusChange: jest.fn(),
  aggregateMetrics: jest.fn(),
  notifyPeers: jest.fn(),
  shareFileValidation: jest.fn(),
  coordinateUpload: jest.fn(),
  checkQuota: jest.fn().mockResolvedValue({ available: true, remaining: 100 }),
});

// WebSocket Mock Factory  
export const createWebSocketMock = () => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
  connect: jest.fn(),
  disconnect: jest.fn(),
  onMessage: jest.fn(),
  onConnectionChange: jest.fn(),
});

// File Services Mock Factory
export const createFileServicesMock = () => ({
  uploadFile: jest.fn().mockResolvedValue({
    id: 'upload-1',
    url: 'https://example.com/file.jpg',
    thumbnail: 'https://example.com/thumb.jpg'
  }),
  validateFile: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  validateFileType: jest.fn().mockReturnValue({ isValid: true }),
  validateFileSize: jest.fn().mockReturnValue({ isValid: true }),
  validateFileCount: jest.fn().mockReturnValue({ isValid: true }),
  generatePreview: jest.fn().mockResolvedValue('data:image/jpeg;base64,test'),
  generateThumbnail: jest.fn(),
  getUploadProgress: jest.fn().mockReturnValue(0),
});

// Health Monitoring Mock Factory
export const createHealthMonitorMock = () => ({
  checkHealth: jest.fn().mockResolvedValue({
    status: 'healthy',
    latency: 45,
    lastResponse: new Date(),
    errorCount: 0,
  }),
  subscribeToUpdates: jest.fn().mockReturnValue(jest.fn()),
  unsubscribe: jest.fn(),
  getLatency: jest.fn().mockReturnValue(45),
  getErrorCount: jest.fn().mockReturnValue(0),
});

// Connection Manager Mock Factory
export const createConnectionManagerMock = () => ({
  getConnectionState: jest.fn().mockReturnValue('connected'),
  subscribe: jest.fn().mockReturnValue(jest.fn()),
  unsubscribe: jest.fn(),
  reconnect: jest.fn(),
});

// Metrics Collector Mock Factory  
export const createMetricsCollectorMock = () => ({
  recordStatusChange: jest.fn(),
  getPerformanceMetrics: jest.fn().mockReturnValue({
    averageLatency: 45,
    successRate: 99.5,
    errorRate: 0.5,
  }),
  trackHealthTrends: jest.fn(),
});

// Drag Drop Manager Mock Factory
export const createDragDropManagerMock = () => ({
  onDragEnter: jest.fn(),
  onDragOver: jest.fn(),
  onDragLeave: jest.fn(),
  onDrop: jest.fn(),
  reset: jest.fn(),
});

// Test Data Factories

export const createMockClaudeInstanceType = (overrides: Partial<ClaudeInstanceType> = {}): ClaudeInstanceType => ({
  id: 'claude-default',
  name: 'Claude Default',
  command: 'claude',
  description: 'Start Claude with default settings',
  available: true,
  configured: true,
  enabled: true,
  models: [{
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    capabilities: ['text', 'image', 'code']
  }],
  ...overrides,
});

export const createMockClaudeInstance = (overrides: Partial<ClaudeInstance> = {}): ClaudeInstance => ({
  id: 'test-instance',
  type: createMockClaudeInstanceType(),
  status: 'ready',
  connectionState: 'connected',
  createdAt: new Date(),
  processInfo: {
    pid: 1234,
    memoryUsage: 128 * 1024 * 1024,
    cpuUsage: 15.5,
    uptime: 3600,
    lastHealthCheck: new Date(),
  },
  ...overrides,
});

export const createMockConversationMessage = (overrides: Partial<ConversationMessage> = {}): ConversationMessage => ({
  id: 'msg-1',
  type: 'user',
  content: 'Hello Claude',
  timestamp: new Date(),
  ...overrides,
});

export const createMockMessageAttachment = (overrides: Partial<MessageAttachment> = {}): MessageAttachment => ({
  id: 'att-1',
  type: 'image',
  name: 'test-image.jpg',
  size: 1024,
  url: 'https://example.com/image.jpg',
  thumbnail: 'https://example.com/thumb.jpg',
  ...overrides,
});

// Contract Verification Helpers

export const verifySwarmCoordinationContract = (mockCoordinator: ReturnType<typeof createSwarmCoordinator>) => {
  // Verify all coordination methods are functions
  expect(typeof mockCoordinator.notifySelection).toBe('function');
  expect(typeof mockCoordinator.shareInstanceState).toBe('function');
  expect(typeof mockCoordinator.coordinateWithPeers).toBe('function');
  expect(typeof mockCoordinator.shareStatus).toBe('function');
  expect(typeof mockCoordinator.coordinateHealthChecks).toBe('function');
};

export const verifyWebSocketContract = (mockWebSocket: ReturnType<typeof createWebSocketMock>) => {
  // Verify WebSocket interface compliance
  expect(typeof mockWebSocket.send).toBe('function');
  expect(typeof mockWebSocket.close).toBe('function');
  expect(typeof mockWebSocket.addEventListener).toBe('function');
  expect(typeof mockWebSocket.readyState).toBe('number');
};

export const verifyFileServicesContract = (mockFileServices: ReturnType<typeof createFileServicesMock>) => {
  // Verify file services interface compliance
  expect(typeof mockFileServices.uploadFile).toBe('function');
  expect(typeof mockFileServices.validateFile).toBe('function');
  expect(typeof mockFileServices.generatePreview).toBe('function');
  
  // Verify async methods return promises
  expect(mockFileServices.uploadFile()).toBeInstanceOf(Promise);
  expect(mockFileServices.generatePreview()).toBeInstanceOf(Promise);
};

// Test Setup Helpers

export const setupDefaultMocks = () => {
  const swarmCoordinator = createSwarmCoordinator();
  const webSocket = createWebSocketMock();
  const fileServices = createFileServicesMock();
  const healthMonitor = createHealthMonitorMock();
  const connectionManager = createConnectionManagerMock();
  const metricsCollector = createMetricsCollectorMock();
  
  // Setup global WebSocket mock
  (global as any).WebSocket = jest.fn(() => webSocket);
  
  return {
    swarmCoordinator,
    webSocket,
    fileServices,
    healthMonitor,
    connectionManager,
    metricsCollector,
  };
};

export const cleanupMocks = () => {
  jest.clearAllMocks();
  delete (global as any).WebSocket;
};

// Performance Testing Helpers

export const createPerformanceTestMocks = () => {
  const mocks = setupDefaultMocks();
  
  // Add performance tracking
  const originalNow = performance.now;
  const performanceMock = jest.fn(() => Date.now());
  (global as any).performance = { now: performanceMock };
  
  return {
    ...mocks,
    performanceMock,
    cleanup: () => {
      cleanupMocks();
      (global as any).performance = { now: originalNow };
    }
  };
};

// Accessibility Testing Helpers

export const createAccessibilityTestMocks = () => {
  const mocks = setupDefaultMocks();
  
  // Enhanced coordination for accessibility features
  mocks.swarmCoordinator.coordinateWithPeers.mockImplementation((action) => {
    if (action.action?.includes('accessibility')) {
      return Promise.resolve({ accessibilitySupport: true });
    }
    return Promise.resolve({});
  });
  
  return mocks;
};

// Error Simulation Helpers

export const createErrorScenarioMocks = () => {
  const mocks = setupDefaultMocks();
  
  // Setup error scenarios
  mocks.webSocket.readyState = WebSocket.CLOSED;
  mocks.fileServices.uploadFile.mockRejectedValue(new Error('Upload failed'));
  mocks.healthMonitor.checkHealth.mockRejectedValue(new Error('Health check failed'));
  
  return mocks;
};

// Load Testing Helpers

export const createLoadTestMocks = (instanceCount: number = 100) => {
  const mocks = setupDefaultMocks();
  
  // Create multiple instances for load testing
  const instances = Array.from({ length: instanceCount }, (_, i) => 
    createMockClaudeInstance({ 
      id: `instance-${i}`,
      type: createMockClaudeInstanceType({ id: `type-${i}`, name: `Instance ${i}` })
    })
  );
  
  return {
    ...mocks,
    instances,
  };
};

// Contract Testing Utilities

export interface MockContract {
  methods: string[];
  returnTypes: Record<string, string>;
  asyncMethods: string[];
}

export const verifyMockContract = (mock: any, contract: MockContract) => {
  // Verify all required methods exist
  contract.methods.forEach(method => {
    expect(typeof mock[method]).toBe('function');
  });
  
  // Verify return types
  Object.entries(contract.returnTypes).forEach(([method, type]) => {
    if (contract.asyncMethods.includes(method)) {
      expect(mock[method]()).toBeInstanceOf(Promise);
    } else {
      expect(typeof mock[method]()).toBe(type);
    }
  });
};

export const SWARM_COORDINATOR_CONTRACT: MockContract = {
  methods: ['notifySelection', 'shareInstanceState', 'coordinateWithPeers'],
  returnTypes: {
    notifySelection: 'undefined',
    shareInstanceState: 'undefined', 
    coordinateWithPeers: 'object'
  },
  asyncMethods: []
};

export const FILE_SERVICES_CONTRACT: MockContract = {
  methods: ['uploadFile', 'validateFile', 'generatePreview'],
  returnTypes: {
    uploadFile: 'object',
    validateFile: 'object',
    generatePreview: 'object'
  },
  asyncMethods: ['uploadFile', 'generatePreview']
};

// Integration Test Helpers

export const createIntegrationTestMocks = () => {
  const mocks = setupDefaultMocks();
  
  // Setup realistic integration scenarios
  mocks.swarmCoordinator.coordinateWithPeers.mockImplementation(async (action) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    switch (action.action) {
      case 'instance_selected':
        return { coordination: 'success', peersNotified: 3 };
      case 'upload_file':
        return { uploadId: 'upload-123', processingQueue: 'ready' };
      default:
        return { status: 'acknowledged' };
    }
  });
  
  return mocks;
};