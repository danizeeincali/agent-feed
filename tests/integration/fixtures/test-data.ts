/**
 * Test Data Fixtures for Integration Tests
 * Provides realistic test data for API endpoint testing
 */

export interface TestMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TestApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TestStreamingEvent {
  type: string;
  data: any;
  timestamp: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// Test Messages for Avi Chat API
export const aviChatTestMessages = {
  simple: {
    message: "Hello Avi, can you help me with a simple task?",
    expected: {
      success: true,
      responses: expect.any(Array),
      timestamp: expect.any(String)
    }
  },
  withImages: {
    message: {
      text: "Analyze this screenshot",
      images: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="]
    },
    expected: {
      success: true,
      responses: expect.any(Array),
      timestamp: expect.any(String)
    }
  },
  empty: {
    message: "",
    expected: {
      success: false,
      error: "Message is required and must be a string"
    }
  },
  invalid: {
    message: null,
    expected: {
      success: false,
      error: "Message is required and must be a string"
    }
  },
  long: {
    message: "This is a very long message that tests the API's ability to handle large amounts of text. ".repeat(100),
    expected: {
      success: true,
      responses: expect.any(Array),
      timestamp: expect.any(String)
    }
  }
};

// Test Messages for Claude Code API
export const claudeCodeTestMessages = {
  fileRead: {
    message: "Read the package.json file and tell me about the project dependencies",
    options: {
      workingDirectory: "/workspaces/agent-feed",
      allowedTools: ["Read", "Grep"]
    },
    expected: {
      success: true,
      message: expect.any(String),
      responses: expect.any(Array),
      timestamp: expect.any(String),
      claudeCode: true,
      toolsEnabled: true
    }
  },
  bashCommand: {
    message: "Run 'ls -la' to show me the current directory contents",
    options: {
      workingDirectory: "/workspaces/agent-feed",
      allowedTools: ["Bash"]
    },
    expected: {
      success: true,
      message: expect.any(String),
      responses: expect.any(Array),
      timestamp: expect.any(String),
      claudeCode: true,
      toolsEnabled: true
    }
  },
  codeAnalysis: {
    message: "Analyze the frontend source code structure and provide insights",
    options: {
      workingDirectory: "/workspaces/agent-feed/frontend/src",
      allowedTools: ["Read", "Grep", "Glob"]
    },
    expected: {
      success: true,
      message: expect.any(String),
      responses: expect.any(Array),
      timestamp: expect.any(String),
      claudeCode: true,
      toolsEnabled: true
    }
  },
  writeFile: {
    message: "Create a simple hello world script in the tests directory",
    options: {
      workingDirectory: "/workspaces/agent-feed/tests",
      allowedTools: ["Write", "Read"]
    },
    expected: {
      success: true,
      message: expect.any(String),
      responses: expect.any(Array),
      timestamp: expect.any(String),
      claudeCode: true,
      toolsEnabled: true
    }
  }
};

// Test Data for Streaming Ticker
export const streamingTickerTestData = {
  toolActivity: {
    type: 'tool_activity',
    data: {
      tool: 'testing',
      action: 'running integration tests',
      timestamp: Date.now(),
      priority: 'medium'
    }
  },
  executionStart: {
    type: 'execution_start',
    data: {
      prompt: 'Starting test execution...',
      timestamp: Date.now()
    }
  },
  executionComplete: {
    type: 'execution_complete',
    data: {
      message: 'Test execution completed successfully',
      timestamp: Date.now(),
      priority: 'high'
    }
  },
  error: {
    type: 'error',
    data: {
      message: 'Test error occurred',
      error: 'Sample error for testing',
      timestamp: Date.now(),
      priority: 'critical'
    }
  }
};

// Performance Test Data
export const performanceTestData = {
  concurrentRequests: 10,
  requestTimeout: 30000,
  expectedResponseTime: 5000,
  rateLimit: {
    requests: 100,
    windowMs: 60000
  }
};

// WebSocket Test Data
export const webSocketTestData = {
  connectionTimeout: 10000,
  messageTimeout: 5000,
  maxReconnectAttempts: 3,
  reconnectDelay: 1000,
  testMessages: [
    { type: 'ping', data: 'test-ping' },
    { type: 'subscribe', data: { channel: 'test-channel' } },
    { type: 'unsubscribe', data: { channel: 'test-channel' } }
  ]
};

// Error Test Cases
export const errorTestCases = {
  networkError: {
    description: 'Network connection failure',
    mockResponse: { status: 0, error: 'Network Error' }
  },
  serverError: {
    description: 'Internal server error',
    mockResponse: { status: 500, error: 'Internal Server Error' }
  },
  badRequest: {
    description: 'Invalid request format',
    mockResponse: { status: 400, error: 'Bad Request' }
  },
  unauthorized: {
    description: 'Authentication failure',
    mockResponse: { status: 401, error: 'Unauthorized' }
  },
  rateLimited: {
    description: 'Too many requests',
    mockResponse: { status: 429, error: 'Too Many Requests' }
  },
  timeout: {
    description: 'Request timeout',
    mockResponse: { status: 408, error: 'Request Timeout' }
  }
};

// Validation Schemas
export const validationSchemas = {
  aviChatResponse: {
    type: 'object',
    required: ['success', 'timestamp'],
    properties: {
      success: { type: 'boolean' },
      responses: { type: 'array' },
      timestamp: { type: 'string' },
      error: { type: 'string' }
    }
  },
  claudeCodeResponse: {
    type: 'object',
    required: ['success', 'timestamp', 'claudeCode'],
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      responses: { type: 'array' },
      timestamp: { type: 'string' },
      claudeCode: { type: 'boolean' },
      toolsEnabled: { type: 'boolean' },
      error: { type: 'string' }
    }
  },
  streamingEvent: {
    type: 'object',
    required: ['type', 'data'],
    properties: {
      type: { type: 'string' },
      data: { type: 'object' },
      timestamp: { type: 'number' },
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
    }
  }
};

// Helper Functions
export const createTestMessage = (overrides: Partial<TestMessage> = {}): TestMessage => ({
  id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  content: 'Test message content',
  role: 'user',
  timestamp: new Date().toISOString(),
  ...overrides
});

export const createTestResponse = <T>(data: T, overrides: Partial<TestApiResponse<T>> = {}): TestApiResponse<T> => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
  ...overrides
});

export const createStreamingEvent = (overrides: Partial<TestStreamingEvent> = {}): TestStreamingEvent => ({
  type: 'test',
  data: { message: 'Test streaming event' },
  timestamp: Date.now(),
  priority: 'medium',
  ...overrides
});

// Test Utilities
export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const waitForCondition = async (
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeout) {
    await delay(interval);
  }
  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

export const generateRandomString = (length: number = 10): string =>
  Math.random().toString(36).substring(2, 2 + length);

export const generateLargePayload = (sizeKB: number): string =>
  'x'.repeat(sizeKB * 1024);