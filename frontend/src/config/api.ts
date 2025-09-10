/**
 * API Configuration for Claude Agent Feed
 * Centralized API endpoint management with version support and backward compatibility
 */

export interface APIConfig {
  baseUrl: string;
  version: string;
  endpoints: {
    claude: {
      instances: string;
      instanceDetail: (id: string) => string;
      terminalStream: (id: string) => string;
      terminalInput: (id: string) => string;
      sseStatus: (id: string) => string;
    };
    auth: {
      login: string;
      register: string;
      profile: string;
    };
    feeds: {
      list: string;
      detail: (id: string) => string;
    };
  };
  fallbackEndpoints?: {
    claude: {
      instances: string;
      instanceDetail: (id: string) => string;
      terminalStream: (id: string) => string;
      terminalInput: (id: string) => string;
    };
  };
}

/**
 * Default API configuration using versioned endpoints
 */
export const defaultAPIConfig: APIConfig = {
  baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000',
  version: 'v1',
  endpoints: {
    claude: {
      instances: '/api/claude/instances',
      instanceDetail: (id: string) => `/api/claude/instances/${id}`,
      terminalStream: (id: string) => `/api/claude/instances/${id}/terminal/stream`,
      terminalInput: (id: string) => `/api/claude/instances/${id}/terminal/input`,
      sseStatus: (id: string) => `/api/claude/instances/${id}/sse/status`,
    },
    auth: {
      login: '/api/auth/login',
      register: '/api/auth/register',
      profile: '/api/auth/profile',
    },
    feeds: {
      list: '/api/feeds',
      detail: (id: string) => `/api/feeds/${id}`,
    },
  },
  // Backward compatibility fallback endpoints
  fallbackEndpoints: {
    claude: {
      instances: '/api/claude/instances',
      instanceDetail: (id: string) => `/api/claude/instances/${id}`,
      terminalStream: (id: string) => `/api/claude/instances/${id}/terminal/stream`,
      terminalInput: (id: string) => `/api/claude/instances/${id}/terminal/input`,
    },
  },
};

/**
 * API Client class with version management and fallback support
 */
export class APIClient {
  private config: APIConfig;
  private enableFallback: boolean;

  constructor(config: APIConfig = defaultAPIConfig, enableFallback: boolean = true) {
    this.config = config;
    this.enableFallback = enableFallback;
  }

  /**
   * Get full URL for an endpoint
   */
  getURL(endpoint: string): string {
    return `${this.config.baseUrl}${endpoint}`;
  }

  /**
   * Get Claude instances endpoint with fallback support
   */
  getClaudeInstancesEndpoint(): string {
    return this.config.endpoints.claude.instances;
  }

  /**
   * Get Claude terminal stream endpoint with fallback support
   */
  getTerminalStreamEndpoint(instanceId: string): string {
    return this.config.endpoints.claude.terminalStream(instanceId);
  }

  /**
   * Get Claude terminal input endpoint with fallback support
   */
  getTerminalInputEndpoint(instanceId: string): string {
    return this.config.endpoints.claude.terminalInput(instanceId);
  }

  /**
   * Make API request with fallback support
   */
  async fetchWithFallback(endpoint: string, options?: RequestInit): Promise<Response> {
    const primaryURL = this.getURL(endpoint);
    
    try {
      const response = await fetch(primaryURL, options);
      if (response.ok || !this.enableFallback) {
        return response;
      }
      throw new Error(`Primary endpoint failed: ${response.status}`);
    } catch (error) {
      if (!this.enableFallback || !this.config.fallbackEndpoints) {
        throw error;
      }

      // Try fallback endpoint if available
      const fallbackEndpoint = this.getFallbackEndpoint(endpoint);
      if (fallbackEndpoint) {
        console.warn(`Primary endpoint failed, trying fallback: ${fallbackEndpoint}`);
        const fallbackURL = this.getURL(fallbackEndpoint);
        return fetch(fallbackURL, options);
      }

      throw error;
    }
  }

  /**
   * Get fallback endpoint for a given primary endpoint
   */
  private getFallbackEndpoint(primaryEndpoint: string): string | null {
    const fallback = this.config.fallbackEndpoints;
    if (!fallback) return null;

    // Map primary endpoints to fallback endpoints
    const endpointMap: Record<string, string> = {
      [this.config.endpoints.claude.instances]: fallback.claude.instances,
    };

    // Handle parameterized endpoints
    if (primaryEndpoint.includes('/terminal/stream')) {
      const instanceId = this.extractInstanceId(primaryEndpoint);
      return instanceId ? fallback.claude.terminalStream(instanceId) : null;
    }

    if (primaryEndpoint.includes('/terminal/input')) {
      const instanceId = this.extractInstanceId(primaryEndpoint);
      return instanceId ? fallback.claude.terminalInput(instanceId) : null;
    }

    return endpointMap[primaryEndpoint] || null;
  }

  /**
   * Extract instance ID from endpoint path
   */
  private extractInstanceId(endpoint: string): string | null {
    const match = endpoint.match(/\/instances\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Update API configuration
   */
  updateConfig(newConfig: Partial<APIConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): APIConfig {
    return { ...this.config };
  }
}

/**
 * Default API client instance
 */
export const apiClient = new APIClient();

/**
 * Utility function to get versioned API endpoint
 */
export function getAPIEndpoint(path: string, version: string = 'v1'): string {
  const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/${version}${path}`;
}

/**
 * Legacy endpoint support - gradually phase out
 * @deprecated Use apiClient.getURL() with proper endpoints instead
 */
export function getLegacyEndpoint(path: string): string {
  const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api${path}`;
}

export default apiClient;