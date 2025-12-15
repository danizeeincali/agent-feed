import axios, { AxiosResponse } from 'axios';
import { 
  CreateWorkspaceRequest, 
  UpdateWorkspaceRequest, 
  WorkspaceResponse,
  WorkspaceListResponse,
  WorkspaceUsage
} from '../../types/workspace.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login or refresh token
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const agentWorkspaceApi = {
  // Create a new agent workspace
  async createWorkspace(request: CreateWorkspaceRequest): Promise<WorkspaceResponse> {
    try {
      const response: AxiosResponse<WorkspaceResponse> = await apiClient.post(
        '/agent-workspaces',
        request
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create workspace');
    }
  },

  // Get workspace by agent name
  async getWorkspace(agentName: string): Promise<WorkspaceResponse> {
    try {
      const response: AxiosResponse<WorkspaceResponse> = await apiClient.get(
        `/agent-workspaces/${encodeURIComponent(agentName)}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get workspace');
    }
  },

  // Update workspace
  async updateWorkspace(
    agentName: string, 
    request: UpdateWorkspaceRequest
  ): Promise<WorkspaceResponse> {
    try {
      const response: AxiosResponse<WorkspaceResponse> = await apiClient.put(
        `/agent-workspaces/${encodeURIComponent(agentName)}`,
        request
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update workspace');
    }
  },

  // Delete workspace
  async deleteWorkspace(agentName: string): Promise<WorkspaceResponse> {
    try {
      const response: AxiosResponse<WorkspaceResponse> = await apiClient.delete(
        `/agent-workspaces/${encodeURIComponent(agentName)}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete workspace');
    }
  },

  // Get all workspaces (admin only)
  async getAllWorkspaces(
    page: number = 1, 
    limit: number = 20,
    search?: string
  ): Promise<WorkspaceListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      });

      const response: AxiosResponse<WorkspaceListResponse> = await apiClient.get(
        `/agent-workspaces?${params}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get workspaces');
    }
  },

  // Get workspace usage and quotas
  async getWorkspaceUsage(agentName: string): Promise<{ success: boolean; usage?: WorkspaceUsage; error?: string }> {
    try {
      const response: AxiosResponse<{ success: boolean; usage: WorkspaceUsage }> = await apiClient.get(
        `/agent-workspaces/${encodeURIComponent(agentName)}/usage`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get workspace usage');
    }
  },

  // Get workspace permissions
  async getWorkspacePermissions(agentName: string): Promise<any> {
    try {
      const response = await apiClient.get(
        `/agent-workspaces/${encodeURIComponent(agentName)}/permissions`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get workspace permissions');
    }
  },

  // Grant workspace permission
  async grantPermission(
    agentName: string, 
    permission: {
      targetAgent: string;
      permissionType: 'read' | 'write' | 'admin';
      resourceType: 'workspace' | 'page' | 'file';
      resourceId?: string;
    }
  ): Promise<any> {
    try {
      const response = await apiClient.post(
        `/agent-workspaces/${encodeURIComponent(agentName)}/permissions`,
        permission
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to grant permission');
    }
  },

  // Revoke workspace permission
  async revokePermission(agentName: string, permissionId: string): Promise<any> {
    try {
      const response = await apiClient.delete(
        `/agent-workspaces/${encodeURIComponent(agentName)}/permissions/${permissionId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to revoke permission');
    }
  },

  // Get audit log
  async getAuditLog(
    agentName: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      action?: string;
      severity?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
        if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
        if (filters.action) params.append('action', filters.action);
        if (filters.severity) params.append('severity', filters.severity);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
      }

      const response = await apiClient.get(
        `/agent-workspaces/${encodeURIComponent(agentName)}/audit-log?${params}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get audit log');
    }
  },

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error: any) {
      throw new Error('Health check failed');
    }
  }
};