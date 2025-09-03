/**
 * Custom Jest Matchers for Claude AI Testing
 * 
 * Provides specialized matchers for testing Claude AI response system
 */

expect.extend({
  // Check if response has expected Claude AI structure
  toBeValidClaudeResponse(received) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.response === 'string' &&
      received.metadata &&
      typeof received.metadata.timestamp === 'string';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid Claude response`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid Claude response with id, response, and metadata`,
        pass: false
      };
    }
  },
  
  // Check if SSE message has correct format
  toBeValidSSEMessage(received) {
    const pass = received &&
      (received.event || received.data) &&
      typeof received.data === 'string';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid SSE message`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid SSE message with event and/or data`,
        pass: false
      };
    }
  },
  
  // Check if response time is within acceptable range
  toHaveResponseTimeWithin(received, expectedTime) {
    const pass = typeof received === 'number' && received <= expectedTime;
    
    if (pass) {
      return {
        message: () => `expected response time ${received}ms to be greater than ${expectedTime}ms`,
        pass: true
      };
    } else {
      return {
        message: () => `expected response time ${received}ms to be within ${expectedTime}ms`,
        pass: false
      };
    }
  },
  
  // Check if error has expected structure
  toBeClaudeError(received) {
    const pass = received &&
      received.error &&
      typeof received.error === 'string' &&
      received.timestamp;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a Claude error`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a Claude error with error and timestamp`,
        pass: false
      };
    }
  },
  
  // Check if memory usage is within reasonable bounds
  toHaveMemoryUsageWithin(received, maxMemory) {
    const memoryInMB = received / 1024 / 1024;
    const maxMemoryInMB = maxMemory / 1024 / 1024;
    const pass = memoryInMB <= maxMemoryInMB;
    
    if (pass) {
      return {
        message: () => `expected memory usage ${memoryInMB.toFixed(2)}MB to be greater than ${maxMemoryInMB.toFixed(2)}MB`,
        pass: true
      };
    } else {
      return {
        message: () => `expected memory usage ${memoryInMB.toFixed(2)}MB to be within ${maxMemoryInMB.toFixed(2)}MB`,
        pass: false
      };
    }
  }
});