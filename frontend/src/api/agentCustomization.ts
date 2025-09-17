// API client for agent customization features

import { ProfileSettings } from '@/components/agent-customization/ProfileSettingsManager';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class AgentCustomizationAPI {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config: RequestInit = {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      };

      // Add auth token if available
      const token = this.getAuthToken();
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`,
        };
      }

      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Handle different error status codes
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data || data,
        message: data.message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown API error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  private getAuthToken(): string | null {
    // Try to get token from localStorage or sessionStorage
    return localStorage.getItem('authToken') || 
           sessionStorage.getItem('authToken') ||
           null;
  }

  // Agent Settings CRUD operations
  async getAgentSettings(agentId: string): Promise<ApiResponse<ProfileSettings>> {
    return this.makeRequest<ProfileSettings>(`/agents/${agentId}/settings`);
  }

  async updateAgentSettings(
    agentId: string, 
    settings: ProfileSettings
  ): Promise<ApiResponse<ProfileSettings>> {
    return this.makeRequest<ProfileSettings>(`/agents/${agentId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async createAgentSettings(
    agentId: string, 
    settings: ProfileSettings
  ): Promise<ApiResponse<ProfileSettings>> {
    return this.makeRequest<ProfileSettings>(`/agents/${agentId}/settings`, {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  async deleteAgentSettings(agentId: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/agents/${agentId}/settings`, {
      method: 'DELETE',
    });
  }

  // Settings versioning and backup
  async getSettingsHistory(
    agentId: string, 
    limit: number = 10
  ): Promise<PaginatedResponse<ProfileSettings>> {
    return this.makeRequest<ProfileSettings[]>(
      `/agents/${agentId}/settings/history?limit=${limit}`
    ) as Promise<PaginatedResponse<ProfileSettings>>;
  }

  async restoreSettingsVersion(
    agentId: string, 
    versionId: string
  ): Promise<ApiResponse<ProfileSettings>> {
    return this.makeRequest<ProfileSettings>(
      `/agents/${agentId}/settings/restore/${versionId}`,
      { method: 'POST' }
    );
  }

  // Settings templates
  async getSettingsTemplates(): Promise<ApiResponse<ProfileSettings[]>> {
    return this.makeRequest<ProfileSettings[]>('/settings/templates');
  }

  async createSettingsTemplate(
    name: string,
    settings: ProfileSettings
  ): Promise<ApiResponse<{ id: string; name: string }>> {
    return this.makeRequest<{ id: string; name: string }>('/settings/templates', {
      method: 'POST',
      body: JSON.stringify({ name, settings }),
    });
  }

  async deleteSettingsTemplate(templateId: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/settings/templates/${templateId}`, {
      method: 'DELETE',
    });
  }

  // Settings validation
  async validateSettings(settings: ProfileSettings): Promise<ApiResponse<{
    isValid: boolean;
    errors: Array<{ field: string; message: string; severity: string }>;
  }>> {
    return this.makeRequest<{
      isValid: boolean;
      errors: Array<{ field: string; message: string; severity: string }>;
    }>('/settings/validate', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // Bulk operations
  async exportAgentSettings(agentIds: string[]): Promise<ApiResponse<{
    filename: string;
    downloadUrl: string;
  }>> {
    return this.makeRequest<{
      filename: string;
      downloadUrl: string;
    }>('/agents/settings/export', {
      method: 'POST',
      body: JSON.stringify({ agentIds }),
    });
  }

  async importAgentSettings(
    agentId: string,
    settingsFile: File
  ): Promise<ApiResponse<ProfileSettings>> {
    const formData = new FormData();
    formData.append('settings', settingsFile);

    return this.makeRequest<ProfileSettings>(`/agents/${agentId}/settings/import`, {
      method: 'POST',
      headers: {}, // Let browser set content-type for FormData
      body: formData,
    });
  }

  // Analytics and metrics
  async getCustomizationAnalytics(
    agentId: string,
    timeRange: '24h' | '7d' | '30d' = '7d'
  ): Promise<ApiResponse<{
    profileViews: number;
    settingsChanges: number;
    popularThemes: Array<{ theme: string; count: number }>;
    widgetUsage: Array<{ widgetType: string; count: number }>;
  }>> {
    return this.makeRequest<{
      profileViews: number;
      settingsChanges: number;
      popularThemes: Array<{ theme: string; count: number }>;
      widgetUsage: Array<{ widgetType: string; count: number }>;
    }>(`/agents/${agentId}/analytics/customization?range=${timeRange}`);
  }

  // User preferences
  async getUserPreferences(): Promise<ApiResponse<{
    defaultTheme: string;
    autoSave: boolean;
    notifications: {
      profileViews: boolean;
      settingsChanges: boolean;
    };
  }>> {
    return this.makeRequest<{
      defaultTheme: string;
      autoSave: boolean;
      notifications: {
        profileViews: boolean;
        settingsChanges: boolean;
      };
    }>('/user/preferences');
  }

  async updateUserPreferences(preferences: {
    defaultTheme?: string;
    autoSave?: boolean;
    notifications?: {
      profileViews?: boolean;
      settingsChanges?: boolean;
    };
  }): Promise<ApiResponse<void>> {
    return this.makeRequest<void>('/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  // Sharing and collaboration
  async shareAgentSettings(
    agentId: string,
    shareConfig: {
      isPublic: boolean;
      allowCopy: boolean;
      expiresAt?: string;
      shareWith?: string[];
    }
  ): Promise<ApiResponse<{ shareId: string; shareUrl: string }>> {
    return this.makeRequest<{ shareId: string; shareUrl: string }>(
      `/agents/${agentId}/settings/share`,
      {
        method: 'POST',
        body: JSON.stringify(shareConfig),
      }
    );
  }

  async getSharedSettings(shareId: string): Promise<ApiResponse<{
    settings: ProfileSettings;
    metadata: {
      agentName: string;
      sharedBy: string;
      sharedAt: string;
      allowCopy: boolean;
    };
  }>> {
    return this.makeRequest<{
      settings: ProfileSettings;
      metadata: {
        agentName: string;
        sharedBy: string;
        sharedAt: string;
        allowCopy: boolean;
      };
    }>(`/shared/settings/${shareId}`);
  }

  async copySharedSettings(
    shareId: string,
    targetAgentId: string
  ): Promise<ApiResponse<ProfileSettings>> {
    return this.makeRequest<ProfileSettings>(
      `/shared/settings/${shareId}/copy`,
      {
        method: 'POST',
        body: JSON.stringify({ targetAgentId }),
      }
    );
  }

  // Real-time updates
  async subscribeToSettingsUpdates(
    agentId: string,
    callback: (update: {
      type: 'settings_updated' | 'settings_deleted';
      agentId: string;
      settings?: ProfileSettings;
      timestamp: string;
    }) => void
  ): Promise<() => void> {
    // WebSocket or EventSource implementation
    const eventSource = new EventSource(
      `${this.baseUrl}/agents/${agentId}/settings/subscribe`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
    };

    // Return unsubscribe function
    return () => {
      eventSource.close();
    };
  }

  // Health check and status
  async getAPIStatus(): Promise<ApiResponse<{
    status: 'healthy' | 'degraded' | 'down';
    version: string;
    features: {
      customization: boolean;
      templates: boolean;
      sharing: boolean;
      analytics: boolean;
    };
  }>> {
    return this.makeRequest<{
      status: 'healthy' | 'degraded' | 'down';
      version: string;
      features: {
        customization: boolean;
        templates: boolean;
        sharing: boolean;
        analytics: boolean;
      };
    }>('/status');
  }
}

// Create singleton instance
export const agentCustomizationAPI = new AgentCustomizationAPI();

// Convenience hooks and utilities
export const useAgentCustomizationAPI = () => agentCustomizationAPI;

// Error handling utilities
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const isAPIError = (error: any): error is APIError => {
  return error instanceof APIError;
};

// Retry utilities
export const withRetry = async <T>(
  operation: () => Promise<ApiResponse<T>>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<ApiResponse<T>> => {
  let lastError: Error = new Error('Operation failed');
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (result.success) {
        return result;
      }
      lastError = new Error(result.error || 'Operation failed');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  
  return {
    success: false,
    error: lastError.message,
    timestamp: new Date().toISOString(),
  };
};

// Cache utilities
export class APICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
}

export const apiCache = new APICache();

export default agentCustomizationAPI;