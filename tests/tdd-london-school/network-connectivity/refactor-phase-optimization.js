/**
 * TDD London School - REFACTOR Phase Optimization
 * Optimize the GREEN phase solution while maintaining test coverage
 * Focus on clean architecture and robust error handling
 */

const { networkMockRegistry } = require('./mocks/network-mocks');

describe('REFACTOR PHASE - Network Connectivity Optimization', () => {
  
  describe('Optimized Connection Factory', () => {
    
    class OptimizedConnectionFactory {
      static async createConnection(options = {}) {
        const strategies = this.getAvailableStrategies();
        const manager = new ConnectionManager();
        
        strategies.forEach(strategy => manager.registerStrategy(strategy));
        
        return await manager.connect();
      }
      
      static getAvailableStrategies() {
        const strategies = [];
        
        // Codespaces strategy (highest priority)
        if (this.isCodespacesEnvironment()) {
          strategies.push(new EnhancedCodespacesStrategy());
        }
        
        // Local development strategy
        if (!this.isCodespacesEnvironment()) {
          strategies.push(new EnhancedLocalStrategy());
        }
        
        // Fallback strategy
        strategies.push(new FallbackStrategy());
        
        return strategies;
      }
      
      static isCodespacesEnvironment() {
        return process.env.CODESPACES === 'true' && 
               process.env.CODESPACE_NAME &&
               process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
      }
    }
    
    it('should create optimal connection for current environment', async () => {
      const mockFetch = networkMockRegistry.registerFetchMock('optimized');
      mockFetch.mockSuccess({ 
        status: 'healthy',
        performance: { responseTime: 50 },
        environment: 'optimized'
      });
      
      const connection = await OptimizedConnectionFactory.createConnection();
      
      expect(connection.isConnected).toBe(true);
      
      // Test optimized request
      const response = await connection.request('/health');
      const data = await response.json();
      
      expect(data.environment).toBe('optimized');
      expect(data.performance).toBeDefined();
      
      console.log('✅ Optimized connection factory working');
    });
  });

  describe('Enhanced Error Handling', () => {
    
    class ResilientConnectionWrapper {
      constructor(baseConnection) {
        this.baseConnection = baseConnection;
        this.retryConfig = {
          maxRetries: 3,
          backoffMs: 1000,
          timeoutMs: 5000
        };
        this.circuitBreaker = {
          failureThreshold: 5,
          resetTimeoutMs: 60000,
          state: 'closed', // closed, open, half-open
          failures: 0
        };
      }
      
      async request(path, options = {}) {
        if (this.circuitBreaker.state === 'open') {
          if (Date.now() - this.circuitBreaker.lastFailure < this.circuitBreaker.resetTimeoutMs) {
            throw new Error('Circuit breaker is open');
          }
          this.circuitBreaker.state = 'half-open';
        }
        
        return await this.retryWithBackoff(async () => {
          const response = await this.baseConnection.request(path, options);
          
          // Reset circuit breaker on success
          this.circuitBreaker.failures = 0;
          if (this.circuitBreaker.state === 'half-open') {
            this.circuitBreaker.state = 'closed';
          }
          
          return response;
        });
      }
      
      async retryWithBackoff(operation) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
          try {
            return await this.withTimeout(operation(), this.retryConfig.timeoutMs);
          } catch (error) {
            lastError = error;
            this.circuitBreaker.failures++;
            
            if (this.circuitBreaker.failures >= this.circuitBreaker.failureThreshold) {
              this.circuitBreaker.state = 'open';
              this.circuitBreaker.lastFailure = Date.now();
            }
            
            if (attempt < this.retryConfig.maxRetries) {
              const delay = this.retryConfig.backoffMs * Math.pow(2, attempt);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        throw lastError;
      }
      
      withTimeout(promise, timeoutMs) {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
          )
        ]);
      }
    }
    
    it('should handle intermittent network failures with retry', async () => {
      const mockFetch = networkMockRegistry.registerFetchMock('resilient');
      
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network temporarily unavailable'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'recovered' })
        });
      });
      
      const baseConnection = { 
        request: (path, options) => fetch(`http://test.com${path}`, options).then(r => r)
      };
      
      const resilientConnection = new ResilientConnectionWrapper(baseConnection);
      
      const response = await resilientConnection.request('/health');
      const data = await response.json();
      
      expect(data.status).toBe('recovered');
      expect(callCount).toBe(3);
      
      console.log('✅ Resilient connection recovered after 3 attempts');
    });

    it('should implement circuit breaker pattern', async () => {
      const mockFetch = networkMockRegistry.registerFetchMock('circuit-breaker');
      
      // Mock persistent failures
      mockFetch.mockRejectedValue(new Error('Server down'));
      
      const baseConnection = { 
        request: (path, options) => fetch(`http://test.com${path}`, options)
      };
      
      const resilientConnection = new ResilientConnectionWrapper(baseConnection);
      
      // Trigger circuit breaker with multiple failures
      for (let i = 0; i < 5; i++) {
        try {
          await resilientConnection.request('/health');
        } catch (error) {
          // Expected failures
        }
      }
      
      // Circuit should now be open
      expect(resilientConnection.circuitBreaker.state).toBe('open');
      
      // Next request should fail fast
      const startTime = Date.now();
      try {
        await resilientConnection.request('/health');
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(error.message).toBe('Circuit breaker is open');
        expect(duration).toBeLessThan(100); // Fail fast
      }
      
      console.log('✅ Circuit breaker preventing cascading failures');
    });
  });

  describe('Performance Optimization', () => {
    
    class PerformanceOptimizedConnection {
      constructor(baseConnection) {
        this.baseConnection = baseConnection;
        this.cache = new Map();
        this.requestQueue = new Map();
        this.metrics = {
          requests: 0,
          cacheHits: 0,
          avgResponseTime: 0
        };
      }
      
      async request(path, options = {}) {
        const startTime = Date.now();
        this.metrics.requests++;
        
        // Check cache for GET requests
        if (!options.method || options.method === 'GET') {
          const cacheKey = `${path}${JSON.stringify(options)}`;
          const cached = this.cache.get(cacheKey);
          
          if (cached && Date.now() - cached.timestamp < 30000) { // 30s cache
            this.metrics.cacheHits++;
            console.log('📊 Cache hit for:', path);
            return cached.response;
          }
        }
        
        // Deduplicate identical requests
        const requestKey = `${path}${JSON.stringify(options)}`;
        if (this.requestQueue.has(requestKey)) {
          console.log('🔄 Deduplicating request:', path);
          return this.requestQueue.get(requestKey);
        }
        
        // Make request
        const requestPromise = this.baseConnection.request(path, options);
        this.requestQueue.set(requestKey, requestPromise);
        
        try {
          const response = await requestPromise;
          
          // Cache successful GET requests
          if ((!options.method || options.method === 'GET') && response.ok) {
            const cacheKey = `${path}${JSON.stringify(options)}`;
            this.cache.set(cacheKey, {
              response,
              timestamp: Date.now()
            });
          }
          
          // Update metrics
          const responseTime = Date.now() - startTime;
          this.metrics.avgResponseTime = (
            (this.metrics.avgResponseTime * (this.metrics.requests - 1)) + responseTime
          ) / this.metrics.requests;
          
          return response;
        } finally {
          this.requestQueue.delete(requestKey);
        }
      }
      
      getMetrics() {
        return {
          ...this.metrics,
          cacheHitRate: this.metrics.cacheHits / this.metrics.requests
        };
      }
    }
    
    it('should cache GET requests for performance', async () => {
      const mockFetch = networkMockRegistry.registerFetchMock('performance');
      
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ 
            data: 'cached-data',
            requestNumber: callCount
          })
        });
      });
      
      const baseConnection = { 
        request: (path, options) => fetch(`http://test.com${path}`, options).then(r => r)
      };
      
      const optimizedConnection = new PerformanceOptimizedConnection(baseConnection);
      
      // First request
      const response1 = await optimizedConnection.request('/data');
      const data1 = await response1.json();
      
      // Second request (should be cached)
      const response2 = await optimizedConnection.request('/data');
      const data2 = await response2.json();
      
      expect(data1.requestNumber).toBe(1);
      expect(data2.requestNumber).toBe(1); // Same as first (cached)
      expect(callCount).toBe(1); // Only one actual fetch call
      
      const metrics = optimizedConnection.getMetrics();
      expect(metrics.cacheHitRate).toBe(0.5); // 1 hit out of 2 requests
      
      console.log('✅ Caching reducing redundant requests');
      console.log('📊 Cache hit rate:', metrics.cacheHitRate);
    });

    it('should deduplicate concurrent requests', async () => {
      const mockFetch = networkMockRegistry.registerFetchMock('deduplication');
      
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ 
                data: 'deduplicated',
                requestNumber: callCount
              })
            });
          }, 100);
        });
      });
      
      const baseConnection = { 
        request: (path, options) => fetch(`http://test.com${path}`, options).then(r => r)
      };
      
      const optimizedConnection = new PerformanceOptimizedConnection(baseConnection);
      
      // Make 3 concurrent identical requests
      const promises = [
        optimizedConnection.request('/data'),
        optimizedConnection.request('/data'),
        optimizedConnection.request('/data')
      ];
      
      const responses = await Promise.all(promises);
      const dataResults = await Promise.all(
        responses.map(r => r.json())
      );
      
      // All should have the same request number (deduplicated)
      expect(dataResults[0].requestNumber).toBe(1);
      expect(dataResults[1].requestNumber).toBe(1);
      expect(dataResults[2].requestNumber).toBe(1);
      expect(callCount).toBe(1); // Only one actual fetch call
      
      console.log('✅ Request deduplication working');
      console.log('📊 3 concurrent requests → 1 actual request');
    });
  });

  describe('Clean Architecture Patterns', () => {
    
    it('should demonstrate dependency injection pattern', () => {
      // Mock dependencies using DI
      const healthChecker = {
        check: jest.fn().mockResolvedValue({ status: 'healthy' })
      };
      
      const logger = {
        info: jest.fn(),
        error: jest.fn()
      };
      
      const metrics = {
        increment: jest.fn(),
        timing: jest.fn()
      };
      
      class InjectableConnectionService {
        constructor(dependencies) {
          this.healthChecker = dependencies.healthChecker;
          this.logger = dependencies.logger;
          this.metrics = dependencies.metrics;
        }
        
        async connect() {
          this.logger.info('Attempting connection');
          const startTime = Date.now();
          
          try {
            const health = await this.healthChecker.check();
            const duration = Date.now() - startTime;
            
            this.metrics.increment('connections.success');
            this.metrics.timing('connections.duration', duration);
            
            return { connected: true, health };
          } catch (error) {
            this.metrics.increment('connections.failure');
            this.logger.error('Connection failed', error);
            throw error;
          }
        }
      }
      
      const service = new InjectableConnectionService({
        healthChecker,
        logger,
        metrics
      });
      
      return service.connect().then(result => {
        expect(result.connected).toBe(true);
        expect(healthChecker.check).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith('Attempting connection');
        expect(metrics.increment).toHaveBeenCalledWith('connections.success');
        
        console.log('✅ Dependency injection pattern implemented');
      });
    });

    it('should use factory pattern for connection creation', () => {
      const ConnectionFactory = {
        create: (type, options = {}) => {
          const strategies = {
            codespaces: () => new MockCodespacesConnection(options),
            local: () => new MockLocalConnection(options),
            test: () => new MockTestConnection(options)
          };
          
          const strategy = strategies[type];
          if (!strategy) {
            throw new Error(`Unknown connection type: ${type}`);
          }
          
          return strategy();
        }
      };
      
      class MockCodespacesConnection {
        constructor(options) {
          this.type = 'codespaces';
          this.options = options;
        }
      }
      
      class MockLocalConnection {
        constructor(options) {
          this.type = 'local';
          this.options = options;
        }
      }
      
      class MockTestConnection {
        constructor(options) {
          this.type = 'test';
          this.options = options;
        }
      }
      
      const codespacesConnection = ConnectionFactory.create('codespaces', { port: 5173 });
      const localConnection = ConnectionFactory.create('local', { host: 'localhost' });
      
      expect(codespacesConnection.type).toBe('codespaces');
      expect(localConnection.type).toBe('local');
      
      console.log('✅ Factory pattern for clean connection creation');
    });
  });
});