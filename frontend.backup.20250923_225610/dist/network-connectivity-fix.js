/**
 * Browser Network Connectivity Fix for Codespaces
 * Based on TDD London School analysis
 * 
 * This fixes the ERR_SOCKET_NOT_CONNECTED error by:
 * 1. Detecting GitHub Codespaces environment
 * 2. Using public forwarded URLs instead of localhost
 * 3. Providing fallbacks for different environments
 */

class CodespacesNetworkFix {
  constructor() {
    this.isCodespaces = this.detectCodespacesEnvironment();
    this.baseUrl = this.determineBaseUrl();
    this.initialized = false;
    
    console.log('🔧 Network Fix Initializing...');
    console.log('- Environment:', this.isCodespaces ? 'GitHub Codespaces' : 'Local/Other');
    console.log('- Base URL:', this.baseUrl);
  }
  
  detectCodespacesEnvironment() {
    // Check if we're in a Codespaces environment
    const userAgent = navigator.userAgent || '';
    const currentUrl = window.location.href;
    
    // Method 1: Check if URL contains codespaces pattern
    const codespacesUrlPattern = /https:\/\/.*\.app\.github\.dev/;
    if (codespacesUrlPattern.test(currentUrl)) {
      return true;
    }
    
    // Method 2: Check for Codespaces-specific indicators in URL
    if (currentUrl.includes('github.dev') || currentUrl.includes('codespace')) {
      return true;
    }
    
    // Method 3: Check localStorage or other browser indicators
    try {
      const codespacesIndicator = localStorage.getItem('codespaces-env') === 'true';
      if (codespacesIndicator) {
        return true;
      }
    } catch (e) {
      // localStorage might not be available
    }
    
    return false;
  }
  
  determineBaseUrl() {
    if (this.isCodespaces) {
      // In Codespaces, use the current origin which should be the public URL
      const currentOrigin = window.location.origin;
      
      // Extract the base part and construct the backend URL
      if (currentOrigin.includes('app.github.dev')) {
        // Pattern: https://username-reponame-random.app.github.dev
        // Backend typically runs on same domain but different port
        // For now, assume same origin (Vite dev server serves both frontend and proxies backend)
        return currentOrigin;
      }
      
      return currentOrigin;
    }
    
    // For local development, use localhost
    return `${window.location.protocol}//localhost:5173`;
  }
  
  async testConnection(path = '/health') {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      return {
        success: response.ok,
        status: response.status,
        url: `${this.baseUrl}${path}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        url: `${this.baseUrl}${path}`
      };
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
    
    try {
      const response = await fetch(url, finalOptions);
      return response;
    } catch (error) {
      console.error(`Request to ${url} failed:`, error);
      throw error;
    }
  }
  
  createWebSocket(path = '/ws') {
    const wsProtocol = this.baseUrl.startsWith('https:') ? 'wss:' : 'ws:';
    const wsUrl = this.baseUrl.replace(/^https?:/, wsProtocol) + path;
    
    console.log('🔌 Creating WebSocket connection to:', wsUrl);
    
    return new WebSocket(wsUrl);
  }
  
  async initialize() {
    console.log('🚀 Initializing network connection fix...');
    
    // Test connection
    const testResult = await this.testConnection();
    
    if (testResult.success) {
      console.log('✅ Network connection successful!');
      console.log(`- URL: ${testResult.url}`);
      console.log(`- Status: ${testResult.status}`);
      
      this.initialized = true;
      return true;
    } else {
      console.error('❌ Network connection failed:');
      console.error(`- URL: ${testResult.url}`);
      console.error(`- Error: ${testResult.error}`);
      
      return false;
    }
  }
  
  // Replace browser's fetch function with our managed version
  installGlobalFix() {
    const originalFetch = window.fetch;
    const self = this;
    
    window.fetch = function(input, options = {}) {
      // If it's a relative URL or localhost, use our managed request
      if (typeof input === 'string') {
        if (input.startsWith('/') || input.includes('localhost:5173')) {
          const path = input.startsWith('/') ? input : new URL(input).pathname + new URL(input).search;
          return self.makeRequest(path, options);
        }
      }
      
      // Otherwise, use original fetch
      return originalFetch.call(this, input, options);
    };
    
    console.log('🔧 Global fetch replacement installed');
  }
  
  // Health check for the UI
  async getSystemHealth() {
    try {
      const response = await this.makeRequest('/health');
      const data = await response.json();
      
      return {
        connected: true,
        environment: this.isCodespaces ? 'codespaces' : 'local',
        baseUrl: this.baseUrl,
        health: data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        environment: this.isCodespaces ? 'codespaces' : 'local',
        baseUrl: this.baseUrl,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Auto-initialize when script loads
let networkFix = null;

async function initializeNetworkFix() {
  try {
    networkFix = new CodespacesNetworkFix();
    const success = await networkFix.initialize();
    
    if (success) {
      // Install global fix to intercept fetch calls
      networkFix.installGlobalFix();
      
      // Make networkFix available globally
      window.networkFix = networkFix;
      
      // Dispatch custom event to notify other scripts
      window.dispatchEvent(new CustomEvent('networkFixReady', { 
        detail: { networkFix, success: true } 
      }));
      
      console.log('🎉 Network connectivity fix installed successfully!');
    } else {
      console.warn('⚠️ Network fix could not establish connection');
      window.dispatchEvent(new CustomEvent('networkFixReady', { 
        detail: { networkFix, success: false } 
      }));
    }
  } catch (error) {
    console.error('💥 Network fix initialization failed:', error);
    window.dispatchEvent(new CustomEvent('networkFixReady', { 
      detail: { error, success: false } 
    }));
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNetworkFix);
} else {
  initializeNetworkFix();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CodespacesNetworkFix };
}