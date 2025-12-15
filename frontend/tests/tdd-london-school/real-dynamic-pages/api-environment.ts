/**
 * Real API Environment Configuration
 * 
 * London School TDD: Configure real backend connections
 * NO MOCK SERVICES - All tests hit actual API endpoints
 */

// Real backend API configuration
process.env.REACT_APP_API_URL = 'http://localhost:3000/api';
process.env.REACT_APP_WS_URL = 'ws://localhost:3000/ws';

// Test database configuration (uses real database)
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3000';
process.env.DB_NAME = 'agent_feed_test';

// Real API timeout configurations
process.env.API_TIMEOUT = '10000';
process.env.WS_TIMEOUT = '5000';

// London School: Real collaboration tracking
export const API_ENDPOINTS = {
  AGENTS: '/api/agents',
  AGENT_PAGES: '/api/agents/{agentId}/pages',
  DYNAMIC_PAGE: '/api/agents/{agentId}/pages/{pageId}',
  AGENT_POSTS: '/api/v1/agent-posts',
  HEALTH_CHECK: '/api/health'
} as const;

// Real API base URL for testing
export const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Real server health check
export const waitForServerReady = async (timeout = 30000): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) {
        console.log('✅ Real backend server is ready for TDD tests');
        return true;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.error('❌ Real backend server failed to start within timeout');
  return false;
};

// Real database connection verification
export const verifyDatabaseConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const health = await response.json();
    
    return health.database === true;
  } catch (error) {
    console.error('❌ Database connection verification failed:', error);
    return false;
  }
};

// Real API response validators
export const validateApiResponse = (response: any, expectedStructure: any): boolean => {
  if (!response || typeof response !== 'object') {
    return false;
  }
  
  for (const [key, expectedType] of Object.entries(expectedStructure)) {
    if (!(key in response)) {
      return false;
    }
    
    if (typeof response[key] !== expectedType) {
      return false;
    }
  }
  
  return true;
};

console.log('🔧 London School TDD: Real API environment configured');
console.log(`📡 Base URL: ${BASE_URL}`);
console.log('🚫 NO MOCKS: All requests go to real backend');