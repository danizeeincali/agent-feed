/**
 * Test Data Fixtures and Factories
 * London School TDD approach - focus on interaction patterns
 */

// Post data factory with behavior-focused variations
const createMockPost = (overrides = {}) => {
  const defaults = {
    id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Agent Performance Update',
    content: 'Successfully completed automated task optimization with 15% performance improvement.',
    authorAgent: 'optimization-agent',
    publishedAt: new Date().toISOString(),
    metadata: {
      businessImpact: 7,
      tags: ['performance', 'automation'],
      isAgentResponse: true,
      version: 1
    },
    likes: Math.floor(Math.random() * 20),
    comments: Math.floor(Math.random() * 8),
    shares: Math.floor(Math.random() * 5),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  return { ...defaults, ...overrides };
};

// Specialized post variations for different test scenarios
const createHighImpactPost = (overrides = {}) => createMockPost({
  metadata: {
    businessImpact: 9,
    tags: ['critical', 'performance', 'optimization'],
    isAgentResponse: true,
    version: 1
  },
  likes: 25,
  comments: 12,
  shares: 8,
  ...overrides
});

const createLowImpactPost = (overrides = {}) => createMockPost({
  metadata: {
    businessImpact: 3,
    tags: ['routine', 'maintenance'],
    isAgentResponse: true,
    version: 1
  },
  likes: 2,
  comments: 0,
  shares: 0,
  ...overrides
});

const createDraftPost = (overrides = {}) => createMockPost({
  publishedAt: null,
  metadata: {
    businessImpact: 5,
    tags: ['draft'],
    isAgentResponse: true,
    version: 1,
    status: 'draft'
  },
  ...overrides
});

// User data factory
const createMockUser = (overrides = {}) => ({
  id: `user-${Date.now()}`,
  username: 'test-user',
  role: 'agent',
  permissions: ['read', 'write', 'comment'],
  lastActive: new Date().toISOString(),
  ...overrides
});

// Agent data factory
const createMockAgent = (overrides = {}) => ({
  id: `agent-${Date.now()}`,
  name: 'performance-optimizer-agent',
  type: 'automation',
  status: 'active',
  capabilities: ['optimization', 'analysis', 'reporting'],
  lastTaskCompleted: new Date().toISOString(),
  performanceMetrics: {
    tasksCompleted: 145,
    averageExecutionTime: 2300, // ms
    successRate: 0.97
  },
  ...overrides
});

// Database result mocks
const createMockDatabaseResult = (rows = [], overrides = {}) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  fields: [],
  ...overrides
});

// WebSocket event mocks
const createMockWebSocketEvent = (type, data, overrides = {}) => ({
  type,
  data,
  timestamp: Date.now(),
  source: 'feed-service',
  ...overrides
});

// Error fixtures for testing error handling
const createDatabaseError = (code = '42P01', message = 'relation "posts" does not exist') => {
  const error = new Error(message);
  error.code = code;
  error.severity = 'ERROR';
  error.detail = 'Database constraint violation';
  return error;
};

const createConnectionError = () => {
  const error = new Error('connect ECONNREFUSED 127.0.0.1:5432');
  error.code = 'ECONNREFUSED';
  error.errno = -61;
  error.syscall = 'connect';
  return error;
};

const createTimeoutError = () => {
  const error = new Error('Query timeout');
  error.code = 'QUERY_TIMEOUT';
  error.timeout = 5000;
  return error;
};

// Mock API responses
const createSuccessResponse = (data, overrides = {}) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
  ...overrides
});

const createErrorResponse = (error, code = 'UNKNOWN_ERROR', overrides = {}) => ({
  success: false,
  error,
  errorCode: code,
  timestamp: new Date().toISOString(),
  ...overrides
});

// Performance test data
const createPerformanceMetrics = (overrides = {}) => ({
  responseTime: 45, // ms
  throughput: 250, // requests/second
  errorRate: 0.002, // 0.2%
  resourceUsage: {
    memory: { used: 256, total: 1024 }, // MB
    cpu: { usage: 35 } // percentage
  },
  databaseMetrics: {
    connectionPoolSize: 10,
    activeConnections: 3,
    waitingQueries: 0,
    averageQueryTime: 12 // ms
  },
  ...overrides
});

// Search result fixtures
const createSearchResults = (query, posts = [], overrides = {}) => ({
  query,
  posts,
  totalResults: posts.length,
  searchTime: Math.floor(Math.random() * 100) + 20, // 20-120ms
  suggestions: [],
  filters: {
    tags: [],
    authors: [],
    dateRange: null
  },
  ...overrides
});

// Engagement data fixtures
const createEngagementStats = (postId, overrides = {}) => ({
  postId,
  likes: Math.floor(Math.random() * 50),
  comments: Math.floor(Math.random() * 20),
  shares: Math.floor(Math.random() * 10),
  views: Math.floor(Math.random() * 500) + 100,
  engagementRate: Math.random() * 0.1, // 0-10%
  topInteractors: [
    createMockUser({ id: 'user-1', username: 'active-user-1' }),
    createMockUser({ id: 'user-2', username: 'active-user-2' })
  ],
  ...overrides
});

// Mock collections for testing pagination
const createPostCollection = (count = 50, startId = 1) => {
  return Array(count).fill(null).map((_, index) => 
    createMockPost({
      id: `post-${startId + index}`,
      title: `Post ${startId + index}`,
      publishedAt: new Date(Date.now() - (index * 3600000)).toISOString() // 1 hour intervals
    })
  );
};

// Test state builders for complex scenarios
const createFeedState = (overrides = {}) => ({
  posts: createPostCollection(10),
  users: {
    'user-1': createMockUser({ id: 'user-1' }),
    'user-2': createMockUser({ id: 'user-2' })
  },
  agents: {
    'agent-1': createMockAgent({ id: 'agent-1' }),
    'agent-2': createMockAgent({ id: 'agent-2' })
  },
  connections: {
    websocket: { connected: true, clientCount: 25 },
    database: { connected: true, poolSize: 10, activeConnections: 3 }
  },
  ...overrides
});

// Export all factories and fixtures
module.exports = {
  // Basic factories
  createMockPost,
  createHighImpactPost,
  createLowImpactPost,
  createDraftPost,
  createMockUser,
  createMockAgent,
  
  // Database mocks
  createMockDatabaseResult,
  createDatabaseError,
  createConnectionError,
  createTimeoutError,
  
  // API response mocks
  createSuccessResponse,
  createErrorResponse,
  
  // WebSocket mocks
  createMockWebSocketEvent,
  
  // Performance mocks
  createPerformanceMetrics,
  
  // Search and engagement mocks
  createSearchResults,
  createEngagementStats,
  
  // Collections and state builders
  createPostCollection,
  createFeedState,
  
  // Common test constants
  TEST_CONSTANTS: {
    PERFORMANCE_THRESHOLDS: {
      RESPONSE_TIME: { MAX: 200, P95: 150, P99: 300 },
      THROUGHPUT: { MIN: 100 },
      ERROR_RATE: { MAX: 0.01 },
      MEMORY_USAGE: { MAX: 80 },
      CPU_USAGE: { MAX: 85 }
    },
    
    DATABASE_LIMITS: {
      CONNECTION_POOL_SIZE: 10,
      QUERY_TIMEOUT: 5000,
      MAX_CONNECTIONS: 100
    },
    
    WEBSOCKET_CONFIG: {
      MAX_CLIENTS: 1000,
      HEARTBEAT_INTERVAL: 30000,
      RECONNECT_TIMEOUT: 5000
    }
  }
};
