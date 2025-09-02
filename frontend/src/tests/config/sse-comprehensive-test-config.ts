/**
 * Comprehensive SSE Test Configuration
 * 
 * Configuration for testing SSE-based Interactive Control tab functionality
 * across all 5 Claude instances with various scenarios and edge cases.
 */

export const SSE_TEST_CONFIG = {
  // Environment URLs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  
  // Claude instance configuration
  claudeInstances: [
    {
      id: 'claude-8251',
      name: 'Claude 8251',
      sseEndpoint: '/api/claude/instances/claude-8251/terminal/stream',
      commandEndpoint: '/api/claude/instances/claude-8251/terminal/input'
    },
    {
      id: 'claude-3494',
      name: 'Claude 3494',
      sseEndpoint: '/api/claude/instances/claude-3494/terminal/stream',
      commandEndpoint: '/api/claude/instances/claude-3494/terminal/input'
    },
    {
      id: 'claude-2023',
      name: 'Claude 2023',
      sseEndpoint: '/api/claude/instances/claude-2023/terminal/stream',
      commandEndpoint: '/api/claude/instances/claude-2023/terminal/input'
    },
    {
      id: 'claude-9392',
      name: 'Claude 9392',
      sseEndpoint: '/api/claude/instances/claude-9392/terminal/stream',
      commandEndpoint: '/api/claude/instances/claude-9392/terminal/input'
    },
    {
      id: 'claude-4411',
      name: 'Claude 4411',
      sseEndpoint: '/api/claude/instances/claude-4411/terminal/stream',
      commandEndpoint: '/api/claude/instances/claude-4411/terminal/input'
    }
  ],
  
  // Test command sets for different scenarios
  testCommands: {
    basic: [
      'echo "Hello World"',
      'pwd',
      'whoami',
      'date'
    ],
    
    intermediate: [
      'ls -la',
      'cat /etc/hostname',
      'ps aux | head -5',
      'df -h'
    ],
    
    advanced: [
      'find . -name "*.json" | head -3',
      'grep -r "test" . | head -2',
      'echo "Multi\nLine\nOutput"',
      'for i in {1..3}; do echo "Loop $i"; done'
    ],
    
    stress: [
      'seq 1 100',
      'yes | head -50',
      'cat /dev/urandom | head -c 1000 | base64',
      'ls -la /usr/bin | head -20'
    ],
    
    error: [
      'nonexistent_command',
      'cat /nonexistent/file',
      'ls /root/secret',
      'chmod 777 /'
    ]
  },
  
  // Timeout configurations (in milliseconds)
  timeouts: {
    short: 5000,
    medium: 15000,
    long: 30000,
    veryLong: 60000
  },
  
  // Performance thresholds
  performance: {
    maxConnectionTime: 5000,
    maxCommandResponseTime: 10000,
    maxRenderTime: 2000,
    maxMemoryUsageMB: 100
  },
  
  // Error patterns to watch for
  errorPatterns: {
    webSocket: [
      /WebSocket.*failed/i,
      /ws:\/\/.*error/i,
      /WebSocket.*closed/i,
      /websocket.*connection/i
    ],
    
    sse: [
      /EventSource.*error/i,
      /SSE.*failed/i,
      /Server-Sent Events.*error/i
    ],
    
    whiteScreen: [
      /Cannot read property.*undefined/,
      /TypeError.*null/,
      /ReferenceError/,
      /Uncaught/
    ],
    
    connection: [
      /fetch.*failed/i,
      /Network.*error/i,
      /CORS.*error/i,
      /Connection.*refused/i
    ]
  },
  
  // Test scenarios
  scenarios: {
    // Happy path scenarios
    happyPath: {
      name: 'Happy Path Testing',
      description: 'Test normal user workflows without errors',
      instances: ['claude-8251', 'claude-3494'],
      commands: 'basic'
    },
    
    // Multiple instances simultaneously
    multiInstance: {
      name: 'Multi-Instance Testing',
      description: 'Test multiple Claude instances simultaneously',
      instances: ['claude-8251', 'claude-3494', 'claude-2023'],
      commands: 'intermediate'
    },
    
    // All instances testing
    allInstances: {
      name: 'All Instances Testing',
      description: 'Test all 5 Claude instances',
      instances: ['claude-8251', 'claude-3494', 'claude-2023', 'claude-9392', 'claude-4411'],
      commands: 'basic'
    },
    
    // Stress testing
    stress: {
      name: 'Stress Testing',
      description: 'Test system under high load',
      instances: ['claude-8251'],
      commands: 'stress'
    },
    
    // Error handling
    errorHandling: {
      name: 'Error Handling Testing',
      description: 'Test error scenarios and recovery',
      instances: ['claude-8251'],
      commands: 'error'
    },
    
    // Connection resilience
    resilience: {
      name: 'Connection Resilience Testing',
      description: 'Test connection recovery and stability',
      instances: ['claude-8251', 'claude-3494'],
      commands: 'intermediate'
    }
  },
  
  // Validation criteria
  validation: {
    // SSE connection validation
    sseConnection: {
      mustHaveSSERequests: true,
      maxWebSocketRequests: 0, // Should be 0 for pure SSE
      minConnectionUptime: 5000
    },
    
    // Command execution validation
    commandExecution: {
      maxResponseTime: 10000,
      mustReceiveOutput: true,
      mustUseHTTPPost: true
    },
    
    // UI validation
    ui: {
      maxRenderTime: 3000,
      mustShowConnectionStatus: true,
      mustShowTerminalOutput: true,
      mustNotShowWhiteScreen: true
    },
    
    // Performance validation
    performance: {
      maxMemoryIncrease: 50, // MB
      maxCPUUsage: 80, // %
      maxNetworkLatency: 1000 // ms
    }
  },
  
  // Retry configuration
  retry: {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential'
  },
  
  // Reporting configuration
  reporting: {
    outputDir: './src/tests/reports/sse-comprehensive',
    formats: ['html', 'json', 'junit'],
    screenshots: true,
    videos: false,
    traces: true
  }
};

export type SSETestConfig = typeof SSE_TEST_CONFIG;
export type ClaudeInstance = typeof SSE_TEST_CONFIG.claudeInstances[0];
export type TestScenario = typeof SSE_TEST_CONFIG.scenarios[keyof typeof SSE_TEST_CONFIG.scenarios];

// Helper functions for test configuration
export const getInstanceById = (id: string): ClaudeInstance | undefined => {
  return SSE_TEST_CONFIG.claudeInstances.find(instance => instance.id === id);
};

export const getCommandSet = (setName: keyof typeof SSE_TEST_CONFIG.testCommands): string[] => {
  return SSE_TEST_CONFIG.testCommands[setName] || [];
};

export const getScenario = (scenarioName: keyof typeof SSE_TEST_CONFIG.scenarios): TestScenario => {
  return SSE_TEST_CONFIG.scenarios[scenarioName];
};

export const buildSSEUrl = (instanceId: string): string => {
  const instance = getInstanceById(instanceId);
  return instance ? `${SSE_TEST_CONFIG.backendUrl}${instance.sseEndpoint}` : '';
};

export const buildCommandUrl = (instanceId: string): string => {
  const instance = getInstanceById(instanceId);
  return instance ? `${SSE_TEST_CONFIG.backendUrl}${instance.commandEndpoint}` : '';
};

export default SSE_TEST_CONFIG;