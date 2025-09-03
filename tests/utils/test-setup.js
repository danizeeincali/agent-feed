/**
 * Test Setup and Utilities
 * 
 * Common test utilities, mocking infrastructure, and setup functions
 * for the Claude AI response system test suite.
 */

import fetch from 'node-fetch';
import { EventSource } from 'eventsource';
import fs from 'fs/promises';
import path from 'path';

// Make fetch and EventSource globally available for tests
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = fetch;
}
if (typeof globalThis.EventSource === 'undefined') {
  globalThis.EventSource = EventSource;
}

export const TEST_CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  FRONTEND_URL: 'http://localhost:5173',
  DEFAULT_TIMEOUT: 30000,
  SSE_TIMEOUT: 10000,
  CLAUDE_RESPONSE_TIMEOUT: 20000
};

/**
 * Test Data Factory for creating consistent test data
 */
export class TestDataFactory {
  static generateInstanceConfig(overrides = {}) {
    const defaults = {
      command: 'claude --dangerously-skip-permissions',
      name: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'skip-permissions'
    };
    return { ...defaults, ...overrides };
  }

  static generateTestMessage(type = 'simple') {
    const messages = {
      simple: 'What is 2+2?',
      complex: 'Please explain the concept of recursion in programming with a simple example.',
      math: `Calculate ${Math.floor(Math.random() * 100)} + ${Math.floor(Math.random() * 100)}`,
      creative: 'Write a haiku about testing software.',
      special: 'Test with special chars: 🚀 ñáéíóú "quotes" \'apostrophes\' <tags> & symbols'
    };
    return messages[type] || messages.simple;
  }

  static generateInstanceId() {
    return `claude-${Math.random().toString(36).substr(2, 12)}`;
  }
}

/**
 * Mock SSE Server for testing without real backend
 */
export class MockSSEServer {
  constructor() {
    this.connections = new Map();
    this.messages = new Map();
    this.isRunning = false;
  }

  start(port = 3001) {
    // This would start a mock HTTP server with SSE endpoints
    // For now, just track state
    this.isRunning = true;
    this.port = port;
  }

  stop() {
    this.connections.clear();
    this.messages.clear();
    this.isRunning = false;
  }

  simulateConnection(instanceId) {
    if (!this.connections.has(instanceId)) {
      this.connections.set(instanceId, new Set());
    }
    
    const connectionId = Math.random().toString(36);
    this.connections.get(instanceId).add(connectionId);
    return connectionId;
  }

  simulateMessage(instanceId, message) {
    if (!this.messages.has(instanceId)) {
      this.messages.set(instanceId, []);
    }
    
    const sseMessage = {
      type: 'terminal_output',
      data: `Mock response to: ${message}`,
      instanceId,
      timestamp: new Date().toISOString(),
      isReal: true
    };
    
    this.messages.get(instanceId).push(sseMessage);
    return sseMessage;
  }
}

/**
 * Test Environment Manager
 */
export class TestEnvironment {
  constructor() {
    this.cleanupTasks = [];
    this.testStartTime = Date.now();
  }

  async waitForBackendReady(timeoutMs = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/health`);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Backend not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Backend not ready within timeout');
  }

  async waitForFrontendReady(timeoutMs = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(TEST_CONFIG.FRONTEND_URL);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Frontend not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Frontend not ready within timeout');
  }

  addCleanupTask(task) {
    this.cleanupTasks.push(task);
  }

  async cleanup() {
    const errors = [];
    for (const task of this.cleanupTasks.reverse()) {
      try {
        await task();
      } catch (error) {
        errors.push(error);
        console.warn('Cleanup task failed:', error.message);
      }
    }
    this.cleanupTasks = [];
    return errors;
  }
}

/**
 * Claude Instance Test Manager (Enhanced version)
 */
export class ClaudeInstanceTestManager {
  constructor() {
    this.activeInstances = [];
    this.sseConnections = [];
    this.testEnvironment = new TestEnvironment();
  }

  async createInstance(config = {}) {
    const instanceConfig = TestDataFactory.generateInstanceConfig(config);
    
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(instanceConfig)
    });

    if (!response.ok) {
      throw new Error(`Instance creation failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success || !data.instanceId) {
      throw new Error('Instance creation response invalid');
    }

    this.activeInstances.push(data.instanceId);
    this.testEnvironment.addCleanupTask(() => this.deleteInstance(data.instanceId));
    
    return data.instanceId;
  }

  async waitForInstanceReady(instanceId, timeoutMs = 15000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`);
        if (response.ok) {
          const data = await response.json();
          const instance = data.instances?.find(i => i.id === instanceId);
          if (instance && (instance.status === 'running' || instance.status === 'ready')) {
            return instance;
          }
        }
      } catch (error) {
        // Continue waiting
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`Instance ${instanceId} not ready within ${timeoutMs}ms`);
  }

  async createSSEConnection(instanceId) {
    const eventSource = new EventSource(
      `${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`
    );
    
    this.sseConnections.push(eventSource);
    this.testEnvironment.addCleanupTask(() => eventSource.close());
    
    return eventSource;
  }

  async waitForSSEConnection(eventSource, timeoutMs = TEST_CONFIG.SSE_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SSE connection timeout'));
      }, timeoutMs);

      eventSource.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  async sendMessage(instanceId, message) {
    const response = await fetch(
      `${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}/terminal/input`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: message })
      }
    );

    if (!response.ok) {
      throw new Error(`Send message failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async waitForSSEMessage(eventSource, timeoutMs = TEST_CONFIG.CLAUDE_RESPONSE_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SSE message timeout'));
      }, timeoutMs);

      const messageHandler = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'terminal_output' && data.isReal && data.data?.trim()) {
            clearTimeout(timeout);
            eventSource.removeEventListener('message', messageHandler);
            resolve(data);
          }
        } catch (error) {
          // Ignore parse errors, continue waiting
        }
      };

      eventSource.addEventListener('message', messageHandler);
    });
  }

  async deleteInstance(instanceId) {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}`, {
      method: 'DELETE'
    });

    if (response.ok || response.status === 404) {
      this.activeInstances = this.activeInstances.filter(id => id !== instanceId);
      return true;
    }

    throw new Error(`Delete instance failed: ${response.status}`);
  }

  async cleanup() {
    // Close SSE connections
    this.sseConnections.forEach(es => {
      if (es.readyState === EventSource.OPEN) {
        es.close();
      }
    });
    this.sseConnections = [];

    // Run all cleanup tasks
    await this.testEnvironment.cleanup();
    this.activeInstances = [];
  }
}

/**
 * Test Report Generator
 */
export class TestReportGenerator {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  addResult(testName, status, duration, metadata = {}) {
    this.results.push({
      testName,
      status,
      duration,
      metadata,
      timestamp: Date.now()
    });
  }

  generateSummary() {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const totalDuration = Date.now() - this.startTime;

    return {
      summary: {
        total: this.results.length,
        passed,
        failed,
        skipped,
        passRate: (passed / this.results.length * 100).toFixed(1) + '%',
        totalDuration: totalDuration + 'ms'
      },
      results: this.results
    };
  }

  async saveReport(filename) {
    const report = this.generateSummary();
    const reportPath = path.join(process.cwd(), 'tests', 'reports', filename);
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 Test report saved to: ${reportPath}`);
      return reportPath;
    } catch (error) {
      console.warn('Failed to save test report:', error.message);
      return null;
    }
  }
}

/**
 * Common test assertions for Claude system
 */
export const ClaudeAssertions = {
  isValidInstanceId(instanceId) {
    return typeof instanceId === 'string' && /^claude-[a-zA-Z0-9]+$/.test(instanceId);
  },

  isValidSSEMessage(message) {
    return (
      message &&
      typeof message === 'object' &&
      message.type &&
      message.hasOwnProperty('data') &&
      message.hasOwnProperty('isReal') &&
      message.instanceId &&
      message.timestamp
    );
  },

  isValidClaudeResponse(data) {
    return (
      data &&
      typeof data === 'string' &&
      data.trim().length > 0
    );
  }
};

/**
 * Test fixtures and sample data
 */
export const TestFixtures = {
  sampleQuestions: [
    'What is 2+2?',
    'What is the capital of France?',
    'Explain recursion in one sentence.',
    'What color is the sky?',
    'Count from 1 to 5.'
  ],

  sampleInstances: [
    { type: 'default', command: 'claude' },
    { type: 'skip-permissions', command: 'claude --dangerously-skip-permissions' },
    { type: 'interactive', command: 'claude --interactive' }
  ],

  expectedResponses: {
    '2+2': ['4', 'four'],
    'capital of france': ['paris'],
    'color.*sky': ['blue'],
    'count.*1.*5': ['1', '2', '3', '4', '5']
  }
};

/**
 * Retry mechanism for flaky operations
 */
export async function withRetry(operation, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
}

/**
 * Setup function for test suites
 */
export async function setupTestEnvironment() {
  const testEnv = new TestEnvironment();
  
  // Wait for backend to be ready
  await testEnv.waitForBackendReady();
  console.log('✅ Backend is ready');
  
  return testEnv;
}

/**
 * Global test setup for Jest
 */
export function setupGlobalTestEnvironment() {
  // Set longer default timeouts for Claude responses
  jest.setTimeout(60000);
  
  // Add custom matchers
  expect.extend({
    toBeValidInstanceId(received) {
      const pass = ClaudeAssertions.isValidInstanceId(received);
      return {
        message: () => `expected ${received} to be a valid instance ID`,
        pass
      };
    },

    toBeValidSSEMessage(received) {
      const pass = ClaudeAssertions.isValidSSEMessage(received);
      return {
        message: () => `expected ${received} to be a valid SSE message`,
        pass
      };
    },

    toBeValidClaudeResponse(received) {
      const pass = ClaudeAssertions.isValidClaudeResponse(received);
      return {
        message: () => `expected ${received} to be a valid Claude response`,
        pass
      };
    }
  });
  
  console.log('🔧 Global test environment setup complete');
}

// Auto-setup when imported
if (typeof jest !== 'undefined') {
  setupGlobalTestEnvironment();
}