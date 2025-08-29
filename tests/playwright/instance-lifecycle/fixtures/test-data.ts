/**
 * Test Data Fixtures for Claude Instance Lifecycle Testing
 */

export interface InstanceTestData {
  id: string;
  name: string;
  type: 'claude-3-5-sonnet' | 'claude-3-opus' | 'claude-3-haiku' | 'claude-instant';
  status: 'running' | 'stopped' | 'error' | 'starting';
  pid?: number;
  port?: number;
  uptime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface MockAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// Valid instance configurations
export const validInstanceConfigs = {
  sonnet: {
    name: 'Test Claude 3.5 Sonnet',
    type: 'claude-3-5-sonnet' as const,
    config: {
      maxTokens: 4096,
      temperature: 0.7,
      systemPrompt: 'You are a helpful AI assistant for testing.'
    }
  },
  opus: {
    name: 'Test Claude 3 Opus',
    type: 'claude-3-opus' as const,
    config: {
      maxTokens: 4096,
      temperature: 0.5,
      systemPrompt: 'You are a helpful AI assistant for testing.'
    }
  },
  haiku: {
    name: 'Test Claude 3 Haiku',
    type: 'claude-3-haiku' as const,
    config: {
      maxTokens: 2048,
      temperature: 0.3,
      systemPrompt: 'You are a helpful AI assistant for testing.'
    }
  },
  instant: {
    name: 'Test Claude Instant',
    type: 'claude-instant' as const,
    config: {
      maxTokens: 2048,
      temperature: 0.3,
      systemPrompt: 'You are a helpful AI assistant for testing.'
    }
  }
};

// Mock instance data for testing
export const mockInstances: InstanceTestData[] = [
  {
    id: 'test-instance-1',
    name: 'Test Instance 1',
    type: 'claude-3-5-sonnet',
    status: 'running',
    pid: 12345,
    port: 3001,
    uptime: 3600,
    memoryUsage: 512,
    cpuUsage: 25.5
  },
  {
    id: 'test-instance-2',
    name: 'Test Instance 2',
    type: 'claude-3-opus',
    status: 'running',
    pid: 12346,
    port: 3002,
    uptime: 1800,
    memoryUsage: 768,
    cpuUsage: 35.2
  },
  {
    id: 'test-instance-3',
    name: 'Test Instance 3',
    type: 'claude-3-haiku',
    status: 'stopped',
    pid: undefined,
    port: undefined,
    uptime: 0,
    memoryUsage: 0,
    cpuUsage: 0
  }
];

// API endpoint configurations
export const apiEndpoints = {
  instances: {
    list: '/api/v1/claude/instances',
    create: '/api/v1/claude/instances',
    get: (id: string) => `/api/v1/claude/instances/${id}`,
    delete: (id: string) => `/api/v1/claude/instances/${id}`,
    start: (id: string) => `/api/v1/claude/instances/${id}/start`,
    stop: (id: string) => `/api/v1/claude/instances/${id}/stop`,
    restart: (id: string) => `/api/v1/claude/instances/${id}/restart`
  },
  terminal: {
    stream: (id: string) => `/api/v1/claude/instances/${id}/terminal/stream`,
    poll: (id: string) => `/api/v1/claude/instances/${id}/terminal/poll`,
    execute: (id: string) => `/api/v1/claude/instances/${id}/terminal/execute`
  },
  sse: {
    status: (id: string) => `/api/v1/claude/instances/${id}/sse/status`,
    connections: (id: string) => `/api/v1/claude/instances/${id}/sse/connections`,
    statistics: '/api/v1/sse/statistics',
    flush: '/api/v1/sse/flush-buffers'
  }
};

// Mock API responses
export const mockAPIResponses = {
  instancesList: {
    success: true,
    data: mockInstances
  } as MockAPIResponse,

  instanceCreated: (config: typeof validInstanceConfigs.sonnet) => ({
    success: true,
    data: {
      id: `test-${Date.now()}`,
      ...config,
      status: 'starting',
      pid: Math.floor(Math.random() * 10000) + 1000,
      port: Math.floor(Math.random() * 1000) + 3000,
      createdAt: new Date().toISOString()
    }
  } as MockAPIResponse),

  instanceDetails: (id: string) => ({
    success: true,
    data: mockInstances.find(i => i.id === id) || {
      id,
      name: `Instance ${id}`,
      type: 'claude-3-5-sonnet' as const,
      status: 'running' as const,
      pid: 12345,
      port: 3001
    }
  } as MockAPIResponse),

  sseStatus: (id: string) => ({
    success: true,
    instanceId: id,
    connections: {
      count: 1,
      active: 1,
      connections: [
        {
          id: `conn-${id}`,
          clientId: `client-${Date.now()}`,
          connected: true,
          health: 'healthy',
          messageCount: 42,
          bytesTransferred: 2048,
          uptime: 30000
        }
      ]
    },
    metrics: {
      totalConnections: 1,
      activeConnections: 1,
      totalMessages: 42,
      totalBytes: 2048
    },
    healthStatus: 'healthy'
  }),

  sseStatistics: {
    success: true,
    statistics: {
      totalConnections: 3,
      activeConnections: 2,
      totalInstances: 3,
      totalMessages: 156,
      totalBytes: 12288,
      uptime: 3600,
      health: 'healthy'
    },
    timestamp: new Date().toISOString()
  } as MockAPIResponse,

  error: (message: string) => ({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  } as MockAPIResponse),

  networkError: {
    success: false,
    error: 'Failed to fetch instances',
    message: 'Network error or server unavailable'
  } as MockAPIResponse
};

// Test scenarios for different conditions
export const testScenarios = {
  // Normal operation scenarios
  normal: {
    instancesAvailable: true,
    serverResponding: true,
    sseWorking: true,
    networkStable: true
  },

  // Error scenarios
  networkFailure: {
    instancesAvailable: false,
    serverResponding: false,
    sseWorking: false,
    networkStable: false
  },

  partialFailure: {
    instancesAvailable: true,
    serverResponding: true,
    sseWorking: false,
    networkStable: true
  },

  serverError: {
    instancesAvailable: false,
    serverResponding: true,
    sseWorking: false,
    networkStable: true
  },

  // Recovery scenarios
  recovery: {
    instancesAvailable: true,
    serverResponding: true,
    sseWorking: true,
    networkStable: true,
    wasDown: true
  }
};

// Performance thresholds
export const performanceThresholds = {
  pageLoad: 5000, // 5 seconds
  instanceCreation: 30000, // 30 seconds
  sseConnection: 10000, // 10 seconds
  apiResponse: 3000, // 3 seconds
  uiUpdate: 1000 // 1 second
};

// SSE test messages
export const sseTestMessages = {
  welcome: {
    type: 'connection',
    message: 'SSE connection established',
    timestamp: new Date().toISOString()
  },
  
  output: {
    type: 'output',
    data: 'Hello from Claude instance!\n',
    timestamp: new Date().toISOString()
  },
  
  status: {
    type: 'status',
    status: 'running',
    pid: 12345,
    uptime: 3600,
    timestamp: new Date().toISOString()
  },
  
  error: {
    type: 'error',
    error: 'Test error message',
    timestamp: new Date().toISOString()
  },
  
  close: {
    type: 'close',
    message: 'Connection closed',
    timestamp: new Date().toISOString()
  }
};

// Utility functions for test data
export const testUtils = {
  generateInstanceId: () => `test-instance-${Date.now()}-${Math.random().toString(36).substring(2)}`,
  
  generateClientId: () => `client-${Date.now()}-${Math.random().toString(36).substring(2)}`,
  
  createMockInstance: (overrides: Partial<InstanceTestData> = {}): InstanceTestData => ({
    id: testUtils.generateInstanceId(),
    name: 'Test Instance',
    type: 'claude-3-5-sonnet',
    status: 'running',
    pid: Math.floor(Math.random() * 10000) + 1000,
    port: Math.floor(Math.random() * 1000) + 3000,
    uptime: Math.floor(Math.random() * 3600),
    memoryUsage: Math.floor(Math.random() * 1024),
    cpuUsage: Math.floor(Math.random() * 100),
    ...overrides
  }),
  
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  waitForCondition: async (
    condition: () => Promise<boolean> | boolean,
    timeout: number = 10000,
    interval: number = 100
  ): Promise<void> => {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await testUtils.delay(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};