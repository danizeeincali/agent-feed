/**
 * TDD London School - Practical Implementation
 * Real implementation based on TDD analysis for Codespaces environment
 */

class CodespacesNetworkManager {
  constructor() {
    this.isCodespaces = this.detectCodespacesEnvironment();
    this.baseUrl = this.determineBaseUrl();
    this.connection = null;
  }
  
  detectCodespacesEnvironment() {
    return !!(
      process.env.CODESPACES === 'true' &&
      process.env.CODESPACE_NAME &&
      process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    );
  }
  
  determineBaseUrl() {
    if (this.isCodespaces) {
      const codespaceName = process.env.CODESPACE_NAME;
      const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
      return `https://${codespaceName}-5173.${domain}`;
    }
    
    // For browser environment, use current origin if available
    if (typeof window !== 'undefined' && window.location) {
      return `${window.location.protocol}//${window.location.host}`;
    }
    
    // Fallback to localhost
    return 'http://localhost:5173';
  }
  
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.warn('Connection test failed:', error.message);
      return false;
    }
  }
  
  async makeRequest(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    
    const defaultOptions = {
      headers: {
        'Accept': 'application/json',
        ...(this.isCodespaces && { 'X-Forwarded-Proto': 'https' })
      }
    };
    
    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
    
    return fetch(url, finalOptions);
  }
  
  createWebSocket(path = '/ws') {
    const wsProtocol = this.baseUrl.startsWith('https:') ? 'wss:' : 'ws:';
    const wsUrl = this.baseUrl.replace(/^https?:/, wsProtocol) + path;
    
    return new WebSocket(wsUrl);
  }
  
  async initialize() {
    console.log('🔍 Initializing network connection...');
    console.log('- Environment:', this.isCodespaces ? 'Codespaces' : 'Local');
    console.log('- Base URL:', this.baseUrl);
    
    const connected = await this.testConnection();
    
    if (connected) {
      console.log('✅ Network connection established');
      this.connection = { status: 'connected', baseUrl: this.baseUrl };
      return this.connection;
    } else {
      console.log('❌ Network connection failed');
      throw new Error(`Failed to connect to ${this.baseUrl}`);
    }
  }
}

// Browser-specific implementation
class BrowserNetworkAdapter {
  constructor() {
    this.manager = new CodespacesNetworkManager();
  }
  
  async init() {
    try {
      await this.manager.initialize();
      
      // Replace global fetch with managed version
      if (typeof window !== 'undefined') {
        window.managedFetch = (path, options) => this.manager.makeRequest(path, options);
        window.createWebSocket = (path) => this.manager.createWebSocket(path);
      }
      
      return true;
    } catch (error) {
      console.error('Browser network adapter initialization failed:', error);
      return false;
    }
  }
  
  // Health check specifically for frontend
  async healthCheck() {
    try {
      const response = await this.manager.makeRequest('/health');
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
  
  // Chat API specifically for the application
  async sendMessage(message, sessionId) {
    try {
      const response = await this.manager.makeRequest('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, sessionId })
      });
      
      return await response.json();
    } catch (error) {
      throw new Error(`Chat request failed: ${error.message}`);
    }
  }
}

// Export for testing and browser use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CodespacesNetworkManager,
    BrowserNetworkAdapter
  };
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  window.networkAdapter = new BrowserNetworkAdapter();
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Auto-initializing network adapter...');
    await window.networkAdapter.init();
  });
}