/**
 * TDD London School - Network Connectivity Mocks
 * Provides mock implementations for browser networking APIs
 * Focus on interaction testing rather than state verification
 */

/**
 * Mock Factory for Browser Network APIs
 * Creates consistent mocks with behavior verification capabilities
 */
class NetworkMockFactory {
  
  static createFetchMock() {
    const fetchMock = jest.fn();
    
    // Default to ERR_SOCKET_NOT_CONNECTED (RED phase)
    fetchMock.mockRejectedValue(new Error('ERR_SOCKET_NOT_CONNECTED'));
    
    // Provide methods to configure different scenarios
    fetchMock.mockSuccess = (response) => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
        ...response
      });
    };
    
    fetchMock.mockNetworkError = (errorMessage = 'ERR_SOCKET_NOT_CONNECTED') => {
      fetchMock.mockRejectedValue(new Error(errorMessage));
    };
    
    fetchMock.mockCORSError = () => {
      fetchMock.mockRejectedValue(new Error('CORS policy: Cross origin requests are only supported for protocol schemes'));
    };
    
    fetchMock.mockTimeout = () => {
      fetchMock.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );
    };
    
    return fetchMock;
  }
  
  static createWebSocketMock() {
    const WebSocketMock = jest.fn();
    
    WebSocketMock.mockImplementation((url) => {
      const wsMock = {
        url,
        readyState: 0, // CONNECTING
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
      
      // Default to connection failure (RED phase)
      setTimeout(() => {
        wsMock.readyState = 3; // CLOSED
        if (wsMock.onerror) {
          wsMock.onerror(new Event('error'));
        }
        if (wsMock.onclose) {
          wsMock.onclose(new CloseEvent('close', { 
            code: 1006, 
            reason: 'Connection failed' 
          }));
        }
      }, 0);
      
      return wsMock;
    });
    
    // Methods to configure different scenarios
    WebSocketMock.mockSuccessfulConnection = (url) => {
      WebSocketMock.mockImplementation((wsUrl) => {
        if (wsUrl !== url) return WebSocketMock.defaultImplementation(wsUrl);
        
        const wsMock = {
          url: wsUrl,
          readyState: 1, // OPEN
          onopen: null,
          onmessage: null,
          onerror: null,
          onclose: null,
          send: jest.fn(),
          close: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        };
        
        setTimeout(() => {
          if (wsMock.onopen) {
            wsMock.onopen(new Event('open'));
          }
        }, 0);
        
        return wsMock;
      });
    };
    
    WebSocketMock.defaultImplementation = WebSocketMock.getMockImplementation();
    
    return WebSocketMock;
  }
  
  static createXMLHttpRequestMock() {
    const XHRMock = jest.fn();
    
    XHRMock.mockImplementation(() => {
      const xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        abort: jest.fn(),
        setRequestHeader: jest.fn(),
        getResponseHeader: jest.fn(),
        getAllResponseHeaders: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        readyState: 0,
        status: 0,
        statusText: '',
        responseText: '',
        response: null,
        responseType: '',
        timeout: 0,
        withCredentials: false,
        onreadystatechange: null,
        onload: null,
        onerror: null,
        ontimeout: null,
        onabort: null
      };
      
      // Default to network error (RED phase)
      xhrMock.send.mockImplementation(() => {
        setTimeout(() => {
          xhrMock.readyState = 4;
          xhrMock.status = 0;
          if (xhrMock.onerror) {
            xhrMock.onerror(new Event('error'));
          }
          // Trigger event listeners
          xhrMock.addEventListener.mock.calls.forEach(([event, handler]) => {
            if (event === 'error') handler(new Event('error'));
          });
        }, 0);
      });
      
      return xhrMock;
    });
    
    // Method to configure successful response
    XHRMock.mockSuccessfulResponse = (url, response) => {
      XHRMock.mockImplementation(() => {
        const xhrMock = XHRMock.defaultImplementation();
        
        xhrMock.send.mockImplementation(() => {
          setTimeout(() => {
            xhrMock.readyState = 4;
            xhrMock.status = 200;
            xhrMock.statusText = 'OK';
            xhrMock.responseText = JSON.stringify(response);
            xhrMock.response = response;
            
            if (xhrMock.onload) {
              xhrMock.onload(new Event('load'));
            }
            // Trigger event listeners
            xhrMock.addEventListener.mock.calls.forEach(([event, handler]) => {
              if (event === 'load') handler(new Event('load'));
            });
          }, 0);
        });
        
        return xhrMock;
      });
    };
    
    XHRMock.defaultImplementation = XHRMock.getMockImplementation();
    
    return XHRMock;
  }
}

/**
 * Environment Mock for Codespaces Detection
 */
class EnvironmentMock {
  
  static mockCodespacesEnvironment() {
    const originalEnv = process.env;
    
    process.env = {
      ...originalEnv,
      CODESPACES: 'true',
      CODESPACE_NAME: 'test-codespace-123',
      GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'app.github.dev'
    };
    
    return {
      restore: () => {
        process.env = originalEnv;
      }
    };
  }
  
  static mockLocalEnvironment() {
    const originalEnv = process.env;
    
    const localEnv = { ...originalEnv };
    delete localEnv.CODESPACES;
    delete localEnv.CODESPACE_NAME;
    delete localEnv.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
    
    process.env = localEnv;
    
    return {
      restore: () => {
        process.env = originalEnv;
      }
    };
  }
  
  static getCodespacesUrl(port = 5173) {
    const codespaceName = process.env.CODESPACE_NAME;
    const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
    
    if (!codespaceName || !domain) {
      throw new Error('Codespaces environment variables not found');
    }
    
    return `https://${codespaceName}-${port}.${domain}`;
  }
}

/**
 * Connection Strategy Mock
 * Tests different connection strategies and fallbacks
 */
class ConnectionStrategyMock {
  
  static createStrategy(name, options = {}) {
    return {
      name,
      test: jest.fn(),
      connect: jest.fn(),
      isAvailable: jest.fn().mockReturnValue(options.available !== false),
      priority: options.priority || 0,
      timeout: options.timeout || 5000
    };
  }
  
  static createFailingStrategy(name, errorMessage = 'Connection failed') {
    const strategy = this.createStrategy(name, { available: false });
    
    strategy.test.mockRejectedValue(new Error(errorMessage));
    strategy.connect.mockRejectedValue(new Error(errorMessage));
    
    return strategy;
  }
  
  static createSuccessfulStrategy(name, response = { status: 'ok' }) {
    const strategy = this.createStrategy(name, { available: true });
    
    strategy.test.mockResolvedValue(true);
    strategy.connect.mockResolvedValue(response);
    
    return strategy;
  }
}

/**
 * Mock Registry for managing all network mocks
 */
class NetworkMockRegistry {
  
  constructor() {
    this.mocks = new Map();
    this.strategies = new Map();
    this.environments = new Map();
  }
  
  registerFetchMock(name = 'default') {
    const fetchMock = NetworkMockFactory.createFetchMock();
    this.mocks.set(`fetch-${name}`, fetchMock);
    return fetchMock;
  }
  
  registerWebSocketMock(name = 'default') {
    const wsMock = NetworkMockFactory.createWebSocketMock();
    this.mocks.set(`websocket-${name}`, wsMock);
    return wsMock;
  }
  
  registerXHRMock(name = 'default') {
    const xhrMock = NetworkMockFactory.createXMLHttpRequestMock();
    this.mocks.set(`xhr-${name}`, xhrMock);
    return xhrMock;
  }
  
  getMock(type, name = 'default') {
    return this.mocks.get(`${type}-${name}`);
  }
  
  clearAll() {
    this.mocks.clear();
    this.strategies.clear();
    this.environments.clear();
  }
  
  setupDefaultMocks() {
    global.fetch = this.registerFetchMock();
    global.WebSocket = this.registerWebSocketMock();
    global.XMLHttpRequest = this.registerXMLHttpRequestMock();
  }
  
  restoreOriginalAPIs() {
    // In a real environment, you would restore the original implementations
    delete global.fetch;
    delete global.WebSocket;
    delete global.XMLHttpRequest;
  }
}

// Export singleton instance
const networkMockRegistry = new NetworkMockRegistry();

module.exports = {
  NetworkMockFactory,
  EnvironmentMock,
  ConnectionStrategyMock,
  NetworkMockRegistry,
  networkMockRegistry
};