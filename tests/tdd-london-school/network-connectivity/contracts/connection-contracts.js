/**
 * TDD London School - Connection Contracts
 * Defines the expected interfaces and behaviors for network connections
 * Focus on collaboration patterns and interaction contracts
 */

/**
 * Health Check Contract
 * Defines the expected behavior for server health checks
 */
const HealthCheckContract = {
  method: 'GET',
  path: '/health',
  expectedResponse: {
    status: 200,
    contentType: 'application/json',
    body: {
      status: 'healthy',
      timestamp: 'number',
      services: 'object'
    }
  },
  timeout: 5000,
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000
  }
};

/**
 * WebSocket Connection Contract
 * Defines expected WebSocket behavior and message patterns
 */
const WebSocketContract = {
  url: 'ws://localhost:5173/ws',
  protocols: [],
  expectedEvents: ['open', 'message', 'close', 'error'],
  expectedReadyStates: {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
  },
  messageFormat: {
    type: 'string',
    payload: 'object',
    timestamp: 'number'
  },
  heartbeat: {
    interval: 30000,
    timeout: 5000
  }
};

/**
 * API Request Contract
 * Defines expected API request/response patterns
 */
const APIContract = {
  baseUrl: 'http://localhost:5173/api',
  endpoints: {
    status: {
      method: 'GET',
      path: '/status',
      expectedResponse: {
        status: 200,
        body: {
          server: 'string',
          version: 'string',
          uptime: 'number'
        }
      }
    },
    chat: {
      method: 'POST',
      path: '/chat',
      headers: {
        'Content-Type': 'application/json'
      },
      expectedRequest: {
        message: 'string',
        sessionId: 'string'
      },
      expectedResponse: {
        status: 200,
        body: {
          response: 'string',
          sessionId: 'string',
          timestamp: 'number'
        }
      }
    }
  },
  errorHandling: {
    networkError: {
      code: 'ERR_NETWORK',
      retry: true,
      maxRetries: 3
    },
    timeout: {
      code: 'ERR_TIMEOUT',
      retry: true,
      maxRetries: 2
    },
    serverError: {
      code: 'ERR_SERVER',
      retry: false
    }
  }
};

/**
 * Connection Strategy Contract
 * Defines how different connection strategies should behave
 */
class ConnectionStrategy {
  constructor(name, options = {}) {
    this.name = name;
    this.priority = options.priority || 0;
    this.timeout = options.timeout || 5000;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Test if this strategy can establish a connection
   * @returns {Promise<boolean>}
   */
  async test() {
    throw new Error('test() must be implemented by concrete strategy');
  }

  /**
   * Establish connection using this strategy
   * @returns {Promise<Connection>}
   */
  async connect() {
    throw new Error('connect() must be implemented by concrete strategy');
  }

  /**
   * Check if strategy is available in current environment
   * @returns {boolean}
   */
  isAvailable() {
    return true;
  }
}

/**
 * Codespaces Connection Strategy Contract
 * Handles GitHub Codespaces specific connection logic
 */
class CodespacesConnectionStrategy extends ConnectionStrategy {
  constructor() {
    super('codespaces', { priority: 100 });
  }

  isAvailable() {
    return process.env.CODESPACES === 'true' && 
           process.env.CODESPACE_NAME && 
           process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  }

  getPublicUrl(port = 5173) {
    if (!this.isAvailable()) {
      throw new Error('Codespaces environment not available');
    }
    
    const codespaceName = process.env.CODESPACE_NAME;
    const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
    
    return `https://${codespaceName}-${port}.${domain}`;
  }

  async test() {
    if (!this.isAvailable()) return false;
    
    try {
      const response = await fetch(`${this.getPublicUrl()}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async connect() {
    if (!this.isAvailable()) {
      throw new Error('Codespaces strategy not available');
    }
    
    const baseUrl = this.getPublicUrl();
    return new CodespacesConnection(baseUrl);
  }
}

/**
 * Local Connection Strategy Contract
 * Handles direct localhost connections
 */
class LocalConnectionStrategy extends ConnectionStrategy {
  constructor() {
    super('local', { priority: 50 });
  }

  isAvailable() {
    return process.env.CODESPACES !== 'true';
  }

  async test() {
    const testUrls = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://0.0.0.0:5173'
    ];

    for (const url of testUrls) {
      try {
        const response = await fetch(`${url}/health`);
        if (response.ok) return true;
      } catch (error) {
        continue;
      }
    }
    
    return false;
  }

  async connect() {
    // Try different localhost variants
    const testUrls = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://0.0.0.0:5173'
    ];

    for (const url of testUrls) {
      try {
        const response = await fetch(`${url}/health`);
        if (response.ok) {
          return new LocalConnection(url);
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('No working localhost connection found');
  }
}

/**
 * Connection Interface Contract
 * Defines what all connection implementations must provide
 */
class Connection {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.isConnected = false;
  }

  /**
   * Make HTTP request
   * @param {string} path - API path
   * @param {object} options - Fetch options
   * @returns {Promise<Response>}
   */
  async request(path, options = {}) {
    throw new Error('request() must be implemented by concrete connection');
  }

  /**
   * Create WebSocket connection
   * @param {string} path - WebSocket path
   * @returns {WebSocket}
   */
  createWebSocket(path) {
    throw new Error('createWebSocket() must be implemented by concrete connection');
  }

  /**
   * Close connection and cleanup resources
   */
  close() {
    this.isConnected = false;
  }
}

/**
 * Codespaces Connection Implementation
 */
class CodespacesConnection extends Connection {
  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      // Codespaces specific headers if needed
      headers: {
        ...options.headers,
        'X-Forwarded-Proto': 'https'
      }
    });
    return response;
  }

  createWebSocket(path) {
    const wsUrl = this.baseUrl.replace('https:', 'wss:') + path;
    return new WebSocket(wsUrl);
  }
}

/**
 * Local Connection Implementation
 */
class LocalConnection extends Connection {
  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    return await fetch(url, options);
  }

  createWebSocket(path) {
    const wsUrl = this.baseUrl.replace('http:', 'ws:') + path;
    return new WebSocket(wsUrl);
  }
}

/**
 * Connection Manager Contract
 * Orchestrates connection strategies and maintains active connections
 */
class ConnectionManager {
  constructor() {
    this.strategies = [];
    this.activeConnection = null;
    this.connectionCallbacks = new Set();
  }

  /**
   * Register a connection strategy
   * @param {ConnectionStrategy} strategy
   */
  registerStrategy(strategy) {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Attempt to establish connection using best available strategy
   * @returns {Promise<Connection>}
   */
  async connect() {
    const availableStrategies = this.strategies.filter(s => s.isAvailable());
    
    for (const strategy of availableStrategies) {
      try {
        if (await strategy.test()) {
          this.activeConnection = await strategy.connect();
          this.activeConnection.isConnected = true;
          this.notifyConnectionChange('connected', this.activeConnection);
          return this.activeConnection;
        }
      } catch (error) {
        console.warn(`Strategy ${strategy.name} failed:`, error.message);
        continue;
      }
    }
    
    throw new Error('No available connection strategy worked');
  }

  /**
   * Get current active connection
   * @returns {Connection|null}
   */
  getConnection() {
    return this.activeConnection;
  }

  /**
   * Add connection state change callback
   * @param {Function} callback
   */
  onConnectionChange(callback) {
    this.connectionCallbacks.add(callback);
  }

  /**
   * Remove connection state change callback
   * @param {Function} callback
   */
  offConnectionChange(callback) {
    this.connectionCallbacks.delete(callback);
  }

  /**
   * Notify all callbacks of connection state change
   * @param {string} state
   * @param {Connection} connection
   */
  notifyConnectionChange(state, connection) {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(state, connection);
      } catch (error) {
        console.error('Connection callback error:', error);
      }
    });
  }

  /**
   * Close active connection
   */
  disconnect() {
    if (this.activeConnection) {
      this.activeConnection.close();
      this.notifyConnectionChange('disconnected', null);
      this.activeConnection = null;
    }
  }
}

module.exports = {
  HealthCheckContract,
  WebSocketContract,
  APIContract,
  ConnectionStrategy,
  CodespacesConnectionStrategy,
  LocalConnectionStrategy,
  Connection,
  CodespacesConnection,
  LocalConnection,
  ConnectionManager
};