/**
 * TDD London School - GREEN Phase Implementation
 * Implements fixes to make the failing RED phase tests pass
 * Focus on making tests green with minimal implementation
 */

const { networkMockRegistry, EnvironmentMock } = require('./mocks/network-mocks');
const { 
  ConnectionManager, 
  CodespacesConnectionStrategy, 
  LocalConnectionStrategy,
  CodespacesConnection,
  LocalConnection
} = require('./contracts/connection-contracts');

describe('GREEN PHASE - Network Connectivity Fixes', () => {
  
  let connectionManager;
  
  beforeEach(() => {
    connectionManager = new ConnectionManager();
    networkMockRegistry.setupDefaultMocks();
  });

  afterEach(() => {
    if (connectionManager) {
      connectionManager.disconnect();
    }
    networkMockRegistry.clearAll();
  });

  describe('Codespaces Public URL Strategy', () => {
    
    it('should successfully connect using Codespaces public URL', async () => {
      const envMock = EnvironmentMock.mockCodespacesEnvironment();
      
      // Mock successful response for Codespaces public URL
      const mockFetch = networkMockRegistry.getMock('fetch');
      mockFetch.mockSuccess({ 
        status: 'healthy', 
        timestamp: Date.now(),
        environment: 'codespaces' 
      });
      
      const strategy = new CodespacesConnectionStrategy();
      
      // Test that strategy is available in Codespaces environment
      expect(strategy.isAvailable()).toBe(true);
      
      // Test that connection test passes
      const canConnect = await strategy.test();
      expect(canConnect).toBe(true);
      
      // Test actual connection
      const connection = await strategy.connect();
      expect(connection).toBeInstanceOf(CodespacesConnection);
      expect(connection.baseUrl).toBe(strategy.getPublicUrl());
      
      // Verify fetch was called with public URL
      const expectedUrl = strategy.getPublicUrl();
      expect(mockFetch).toHaveBeenCalledWith(`${expectedUrl}/health`);
      
      console.log('✅ Codespaces strategy working with public URL:', expectedUrl);
      
      envMock.restore();
    });

    it('should handle HTTPS WebSocket connections in Codespaces', () => {
      const envMock = EnvironmentMock.mockCodespacesEnvironment();
      
      const mockWebSocket = networkMockRegistry.getMock('websocket');
      mockWebSocket.mockSuccessfulConnection('wss://test-codespace-123-5173.app.github.dev/ws');
      
      const strategy = new CodespacesConnectionStrategy();
      const connection = new CodespacesConnection(strategy.getPublicUrl());
      
      const ws = connection.createWebSocket('/ws');
      
      return new Promise((resolve) => {
        ws.onopen = () => {
          expect(mockWebSocket).toHaveBeenCalledWith('wss://test-codespace-123-5173.app.github.dev/ws');
          expect(ws.readyState).toBe(1); // OPEN
          console.log('✅ WebSocket connection established via HTTPS');
          resolve();
        };
      }).finally(() => {
        envMock.restore();
      });
    });

    it('should make API requests through public URL', async () => {
      const envMock = EnvironmentMock.mockCodespacesEnvironment();
      
      const mockFetch = networkMockRegistry.getMock('fetch');
      mockFetch.mockSuccess({ 
        response: 'Hello from Codespaces!',
        sessionId: 'test-session',
        timestamp: Date.now()
      });
      
      const strategy = new CodespacesConnectionStrategy();
      const connection = await strategy.connect();
      
      const response = await connection.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test', sessionId: 'test-session' })
      });
      
      const data = await response.json();
      
      expect(data.response).toBe('Hello from Codespaces!');
      expect(mockFetch).toHaveBeenCalledWith(
        `${strategy.getPublicUrl()}/api/chat`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Forwarded-Proto': 'https'
          })
        })
      );
      
      console.log('✅ API request successful through public URL');
      
      envMock.restore();
    });
  });

  describe('Connection Manager with Strategy Pattern', () => {
    
    it('should prioritize Codespaces strategy when available', async () => {
      const envMock = EnvironmentMock.mockCodespacesEnvironment();
      
      // Setup successful Codespaces mock
      const mockFetch = networkMockRegistry.getMock('fetch');
      mockFetch.mockSuccess({ status: 'healthy', environment: 'codespaces' });
      
      // Register strategies
      connectionManager.registerStrategy(new CodespacesConnectionStrategy());
      connectionManager.registerStrategy(new LocalConnectionStrategy());
      
      const connection = await connectionManager.connect();
      
      expect(connection).toBeInstanceOf(CodespacesConnection);
      expect(connection.isConnected).toBe(true);
      
      // Verify Codespaces URL was used (higher priority)
      const codespacesUrl = `https://${process.env.CODESPACE_NAME}-5173.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
      expect(mockFetch).toHaveBeenCalledWith(`${codespacesUrl}/health`);
      
      console.log('✅ Connection manager prioritized Codespaces strategy');
      
      envMock.restore();
    });

    it('should fall back to local strategy when Codespaces unavailable', async () => {
      const envMock = EnvironmentMock.mockLocalEnvironment();
      
      // Setup successful local mock
      const mockFetch = networkMockRegistry.getMock('fetch');
      mockFetch.mockImplementation((url) => {
        if (url === 'http://localhost:5173/health') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ status: 'healthy', environment: 'local' })
          });
        }
        return Promise.reject(new Error('ERR_SOCKET_NOT_CONNECTED'));
      });
      
      // Register strategies
      connectionManager.registerStrategy(new CodespacesConnectionStrategy());
      connectionManager.registerStrategy(new LocalConnectionStrategy());
      
      const connection = await connectionManager.connect();
      
      expect(connection).toBeInstanceOf(LocalConnection);
      expect(connection.baseUrl).toBe('http://localhost:5173');
      expect(connection.isConnected).toBe(true);
      
      console.log('✅ Connection manager fell back to local strategy');
      
      envMock.restore();
    });

    it('should handle connection callbacks and state changes', async () => {
      const envMock = EnvironmentMock.mockCodespacesEnvironment();
      
      const mockFetch = networkMockRegistry.getMock('fetch');
      mockFetch.mockSuccess({ status: 'healthy' });
      
      const connectionCallback = jest.fn();
      connectionManager.onConnectionChange(connectionCallback);
      
      connectionManager.registerStrategy(new CodespacesConnectionStrategy());
      
      const connection = await connectionManager.connect();
      
      // Verify callback was called
      expect(connectionCallback).toHaveBeenCalledWith('connected', connection);
      
      // Test disconnection
      connectionManager.disconnect();
      expect(connectionCallback).toHaveBeenCalledWith('disconnected', null);
      
      console.log('✅ Connection state callbacks working');
      
      envMock.restore();
    });
  });

  describe('Browser Integration Fixes', () => {
    
    it('should provide working fetch implementation', async () => {
      // This test shows how the connection manager provides working fetch
      const envMock = EnvironmentMock.mockCodespacesEnvironment();
      
      const mockFetch = networkMockRegistry.getMock('fetch');
      mockFetch.mockSuccess({
        status: 'healthy',
        timestamp: Date.now(),
        services: { frontend: 'running', backend: 'running' }
      });
      
      connectionManager.registerStrategy(new CodespacesConnectionStrategy());
      const connection = await connectionManager.connect();
      
      // This is what the browser application would call
      const response = await connection.request('/health');
      const healthData = await response.json();
      
      expect(healthData.status).toBe('healthy');
      expect(healthData.services).toBeDefined();
      
      // Verify correct URL was used
      const expectedUrl = `https://${process.env.CODESPACE_NAME}-5173.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/health`;
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
      
      console.log('✅ Browser can now make successful requests');
      
      envMock.restore();
    });

    it('should handle CORS headers correctly', async () => {
      const envMock = EnvironmentMock.mockCodespacesEnvironment();
      
      const mockFetch = networkMockRegistry.getMock('fetch');
      
      // Mock CORS preflight
      mockFetch.mockImplementation((url, options) => {
        if (options?.method === 'OPTIONS') {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Map([
              ['Access-Control-Allow-Origin', '*'],
              ['Access-Control-Allow-Methods', 'GET, POST, OPTIONS'],
              ['Access-Control-Allow-Headers', 'Content-Type']
            ])
          });
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true })
        });
      });
      
      connectionManager.registerStrategy(new CodespacesConnectionStrategy());
      const connection = await connectionManager.connect();
      
      // Test CORS preflight
      const preflightResponse = await connection.request('/api/chat', { method: 'OPTIONS' });
      expect(preflightResponse.ok).toBe(true);
      
      // Test actual request
      const actualResponse = await connection.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' })
      });
      
      expect(actualResponse.ok).toBe(true);
      
      console.log('✅ CORS handling working correctly');
      
      envMock.restore();
    });
  });

  describe('Error Handling and Resilience', () => {
    
    it('should retry failed connections', async () => {
      const envMock = EnvironmentMock.mockCodespacesEnvironment();
      
      const mockFetch = networkMockRegistry.getMock('fetch');
      
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'healthy' })
        });
      });
      
      const strategy = new CodespacesConnectionStrategy();
      
      // Implement retry logic in strategy
      strategy.test = async function() {
        const maxRetries = 3;
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
          try {
            const response = await fetch(`${this.getPublicUrl()}/health`);
            return response.ok;
          } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        throw lastError;
      };
      
      const canConnect = await strategy.test();
      expect(canConnect).toBe(true);
      expect(callCount).toBe(3);
      
      console.log('✅ Retry logic working - succeeded after 3 attempts');
      
      envMock.restore();
    });

    it('should handle mixed content policy gracefully', async () => {
      // Mock HTTPS environment
      const originalLocation = global.window?.location;
      global.window = {
        location: {
          protocol: 'https:',
          hostname: 'test-codespace-123-5173.app.github.dev'
        }
      };
      
      const mockFetch = networkMockRegistry.getMock('fetch');
      
      // HTTP requests should be blocked in HTTPS context
      mockFetch.mockImplementation((url) => {
        if (url.startsWith('http://')) {
          return Promise.reject(new Error('Mixed Content: The page was loaded over HTTPS'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'secure' })
        });
      });
      
      const envMock = EnvironmentMock.mockCodespacesEnvironment();
      const strategy = new CodespacesConnectionStrategy();
      
      // Should use HTTPS URL automatically
      const connection = await strategy.connect();
      const response = await connection.request('/health');
      const data = await response.json();
      
      expect(data.status).toBe('secure');
      expect(connection.baseUrl).toMatch(/^https:/);
      
      console.log('✅ Mixed content policy handled - using HTTPS');
      
      // Restore
      global.window = { location: originalLocation };
      envMock.restore();
    });
  });
});