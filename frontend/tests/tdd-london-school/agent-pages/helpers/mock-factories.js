/**
 * TDD London School: Mock Factories and Test Helpers
 * Focus: Contract-driven mock creation and test utilities
 */

/**
 * Advanced Mock Factory for TDD London School
 * Creates consistent mocks with behavior verification
 */
export class MockFactory {
  constructor() {
    this.mockHistory = new Map();
    this.contractRegistry = new Map();
  }

  /**
   * Create a mock with contract enforcement
   */
  createMock(name, contract = {}) {
    const mock = {};
    
    // Register contract
    this.contractRegistry.set(name, contract);
    
    // Create mock methods based on contract
    Object.keys(contract).forEach(method => {
      mock[method] = jest.fn();
      
      // Set default behavior if specified
      if (contract[method].defaultReturn) {
        mock[method].mockReturnValue(contract[method].defaultReturn);
      }
      
      if (contract[method].defaultResolve) {
        mock[method].mockResolvedValue(contract[method].defaultResolve);
      }
    });
    
    mock.mockName = name;
    this.mockHistory.set(name, mock);
    
    return mock;
  }

  /**
   * Create Agent Page mock with realistic data
   */
  createAgentPageMock(pageId = 'test-page', overrides = {}) {
    return {
      id: pageId,
      title: `${pageId.charAt(0).toUpperCase()}${pageId.slice(1)} Page`,
      content: `<div data-testid="${pageId}-content">Mock content for ${pageId}</div>`,
      metadata: {
        created: new Date('2024-01-01T00:00:00Z').toISOString(),
        modified: new Date().toISOString(),
        version: '1.0.0',
        author: 'test-user',
        status: 'active',
        ...overrides.metadata
      },
      components: [
        {
          id: `${pageId}-header`,
          type: 'header',
          props: { title: `${pageId} Header` }
        },
        {
          id: `${pageId}-content`,
          type: 'content',
          props: { content: `${pageId} body content` }
        }
      ],
      permissions: {
        read: true,
        write: true,
        delete: false
      },
      analytics: {
        views: Math.floor(Math.random() * 1000),
        lastViewed: new Date().toISOString(),
        avgLoadTime: 250 + Math.floor(Math.random() * 200)
      },
      ...overrides
    };
  }

  /**
   * Create API Response mock with proper structure
   */
  createApiResponseMock(data, status = 200, headers = {}) {
    return {
      status,
      statusText: this.getStatusText(status),
      data,
      headers: {
        'content-type': 'application/json',
        'x-request-id': `req-${Date.now()}`,
        ...headers
      },
      ok: status >= 200 && status < 300,
      timestamp: new Date().toISOString(),
      duration: Math.floor(Math.random() * 100) + 50 // Mock response time
    };
  }

  /**
   * Create Error Response mock with proper error structure
   */
  createErrorResponseMock(status = 500, message = 'Internal Server Error', details = {}) {
    return {
      status,
      error: true,
      message,
      code: this.getErrorCode(status),
      timestamp: new Date().toISOString(),
      requestId: `req-error-${Date.now()}`,
      details: {
        stack: 'Mock stack trace',
        context: 'test-context',
        ...details
      }
    };
  }

  /**
   * Create Component Registry mock with full lifecycle
   */
  createComponentRegistryMock() {
    const registry = new Map();
    
    return this.createMock('ComponentRegistry', {
      register: {
        defaultResolve: (id, component) => {
          registry.set(id, { ...component, registeredAt: new Date().toISOString() });
          return true;
        }
      },
      unregister: {
        defaultResolve: (id) => {
          const existed = registry.has(id);
          registry.delete(id);
          return existed;
        }
      },
      get: {
        defaultReturn: (id) => registry.get(id) || null
      },
      exists: {
        defaultReturn: (id) => registry.has(id)
      },
      list: {
        defaultReturn: () => Array.from(registry.keys())
      },
      clear: {
        defaultReturn: () => {
          const count = registry.size;
          registry.clear();
          return count;
        }
      },
      getMetadata: {
        defaultReturn: (id) => {
          const component = registry.get(id);
          return component ? {
            id,
            registeredAt: component.registeredAt,
            type: component.type,
            version: component.version || '1.0.0'
          } : null;
        }
      }
    });
  }

  /**
   * Create File System mock for testing
   */
  createFileSystemMock() {
    const files = new Map();
    
    return this.createMock('FileSystem', {
      existsSync: {
        defaultReturn: (path) => files.has(path)
      },
      readFileSync: {
        defaultReturn: (path) => files.get(path) || null
      },
      writeFileSync: {
        defaultReturn: (path, content) => {
          files.set(path, content);
          return true;
        }
      },
      statSync: {
        defaultReturn: (path) => files.has(path) ? {
          isFile: () => true,
          isDirectory: () => false,
          size: files.get(path)?.length || 0,
          mtime: new Date(),
          ctime: new Date()
        } : null
      },
      readdirSync: {
        defaultReturn: (path) => Array.from(files.keys())
          .filter(file => file.startsWith(path))
          .map(file => file.replace(path + '/', ''))
      }
    });
  }

  /**
   * Create Network Service mock with realistic behavior
   */
  createNetworkServiceMock() {
    return this.createMock('NetworkService', {
      request: {
        defaultResolve: (url, options = {}) => {
          // Simulate network delay
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(this.createApiResponseMock(
                { message: 'Mock response', url },
                options.expectedStatus || 200
              ));
            }, options.delay || 50);
          });
        }
      },
      retry: {
        defaultResolve: async (requestFn, maxRetries = 3) => {
          let lastError;
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              return await requestFn();
            } catch (error) {
              lastError = error;
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, attempt * 100));
              }
            }
          }
          throw lastError;
        }
      },
      timeout: {
        defaultResolve: (promise, ms) => {
          return Promise.race([
            promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), ms)
            )
          ]);
        }
      },
      abort: {
        defaultReturn: () => ({ aborted: true, timestamp: new Date().toISOString() })
      }
    });
  }

  /**
   * Create Performance Monitor mock
   */
  createPerformanceMonitorMock() {
    const timings = new Map();
    const metrics = {};
    
    return this.createMock('PerformanceMonitor', {
      startTiming: {
        defaultReturn: (name) => {
          timings.set(name, Date.now());
          return true;
        }
      },
      endTiming: {
        defaultReturn: (name) => {
          const start = timings.get(name);
          if (start) {
            const duration = Date.now() - start;
            metrics[name] = duration;
            timings.delete(name);
            return duration;
          }
          return 0;
        }
      },
      recordMetric: {
        defaultReturn: (name, value) => {
          metrics[name] = value;
          return true;
        }
      },
      getMetrics: {
        defaultReturn: () => ({ ...metrics })
      },
      clearMetrics: {
        defaultReturn: () => {
          Object.keys(metrics).forEach(key => delete metrics[key]);
          timings.clear();
          return true;
        }
      }
    });
  }

  /**
   * Create realistic user session mock
   */
  createUserSessionMock(userId = 'user-123') {
    return {
      id: userId,
      username: `testuser-${userId}`,
      email: `${userId}@example.com`,
      roles: ['user'],
      permissions: ['read:agent-pages', 'write:agent-pages'],
      session: {
        id: `session-${Date.now()}`,
        created: new Date().toISOString(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastActivity: new Date().toISOString()
      },
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC'
      }
    };
  }

  /**
   * Create swarm coordination mocks
   */
  createSwarmCoordinationMocks() {
    return {
      coordinator: this.createMock('SwarmCoordinator', {
        initSwarm: { defaultResolve: { success: true, swarmId: 'swarm-123' } },
        spawnAgent: { defaultResolve: { success: true, agentId: 'agent-456' } },
        coordinateTask: { defaultResolve: { success: true, taskId: 'task-789' } },
        getSwarmStatus: { defaultReturn: { active: true, agents: 3, tasks: 5 } }
      }),
      
      memoryManager: this.createMock('MemoryManager', {
        store: { defaultResolve: true },
        retrieve: { defaultResolve: null },
        clear: { defaultResolve: true },
        getStats: { defaultReturn: { entries: 0, size: 0 } }
      }),
      
      taskOrchestrator: this.createMock('TaskOrchestrator', {
        assignTask: { defaultResolve: { assigned: true, agentId: 'agent-123' } },
        getTaskStatus: { defaultReturn: 'pending' },
        completeTask: { defaultResolve: { completed: true } }
      })
    };
  }

  /**
   * Verify mock interactions against contracts
   */
  verifyMockContracts(mockName) {
    const mock = this.mockHistory.get(mockName);
    const contract = this.contractRegistry.get(mockName);
    
    if (!mock || !contract) {
      throw new Error(`Mock or contract not found for: ${mockName}`);
    }

    const violations = [];
    
    Object.keys(contract).forEach(method => {
      if (!mock[method]) {
        violations.push(`Missing method: ${method}`);
      }
      
      if (typeof mock[method] !== 'function') {
        violations.push(`${method} is not a function`);
      }
    });

    return {
      valid: violations.length === 0,
      violations,
      mock,
      contract
    };
  }

  /**
   * Helper methods
   */
  getStatusText(status) {
    const statusTexts = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error'
    };
    return statusTexts[status] || 'Unknown Status';
  }

  getErrorCode(status) {
    const errorCodes = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      500: 'INTERNAL_ERROR'
    };
    return errorCodes[status] || 'UNKNOWN_ERROR';
  }

  /**
   * Create test scenario builders
   */
  createScenarioBuilder() {
    return {
      givenAgentPage: (pageId) => ({
        exists: () => this.createAgentPageMock(pageId),
        missing: () => null,
        corrupted: () => ({ ...this.createAgentPageMock(pageId), content: null })
      }),
      
      givenApiResponse: (status) => ({
        withData: (data) => this.createApiResponseMock(data, status),
        withError: (message) => this.createErrorResponseMock(status, message)
      }),
      
      givenUserSession: () => ({
        authenticated: () => this.createUserSessionMock(),
        expired: () => ({ ...this.createUserSessionMock(), session: { expires: new Date(Date.now() - 1000).toISOString() } }),
        unauthorized: () => null
      })
    };
  }

  /**
   * Reset all mocks and clear history
   */
  resetAll() {
    this.mockHistory.forEach(mock => {
      Object.keys(mock).forEach(key => {
        if (typeof mock[key] === 'function' && mock[key].mockReset) {
          mock[key].mockReset();
        }
      });
    });
    
    this.mockHistory.clear();
    this.contractRegistry.clear();
  }
}

// Export singleton instance
export const mockFactory = new MockFactory();

// Export individual factory methods for convenience
export const {
  createMock,
  createAgentPageMock,
  createApiResponseMock,
  createErrorResponseMock,
  createComponentRegistryMock,
  createFileSystemMock,
  createNetworkServiceMock,
  createPerformanceMonitorMock,
  createUserSessionMock,
  createSwarmCoordinationMocks,
  verifyMockContracts,
  createScenarioBuilder,
  resetAll
} = mockFactory;