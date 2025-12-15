import { useState, useCallback, useEffect } from 'react';
import { 
  AgentWorkspace, 
  WorkspaceUsage, 
  CreateWorkspaceRequest, 
  UpdateWorkspaceRequest,
  WorkspaceResponse 
} from '../types/workspace.types';
import { agentWorkspaceApi } from '../services/api/agentWorkspaceApi';
import { useToast } from './useToast';

interface UseAgentWorkspaceResult {
  workspace: AgentWorkspace | null;
  usage: WorkspaceUsage | null;
  isLoading: boolean;
  error: string | null;
  createWorkspace: (request: CreateWorkspaceRequest) => Promise<AgentWorkspace | null>;
  updateWorkspace: (agentName: string, request: UpdateWorkspaceRequest) => Promise<AgentWorkspace | null>;
  deleteWorkspace: (agentName: string) => Promise<boolean>;
  refreshWorkspace: (agentName: string) => Promise<void>;
  checkQuotaUsage: (agentName: string) => Promise<WorkspaceUsage | null>;
}

export const useAgentWorkspace = (agentName?: string): UseAgentWorkspaceResult => {
  const [workspace, setWorkspace] = useState<AgentWorkspace | null>(null);
  const [usage, setUsage] = useState<WorkspaceUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleError = useCallback((error: any, message: string) => {
    console.error(message, error);
    const errorMessage = error?.response?.data?.error || error?.message || message;
    setError(errorMessage);
    toast.error(errorMessage);
  }, [toast]);

  const createWorkspace = useCallback(async (request: CreateWorkspaceRequest): Promise<AgentWorkspace | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await agentWorkspaceApi.createWorkspace(request);
      
      if (response.success && response.workspace) {
        setWorkspace(response.workspace);
        setUsage(response.usage || null);
        toast.success('Workspace created successfully');
        return response.workspace;
      } else {
        throw new Error(response.error || 'Failed to create workspace');
      }
    } catch (error) {
      handleError(error, 'Failed to create workspace');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, toast]);

  const updateWorkspace = useCallback(async (
    agentName: string, 
    request: UpdateWorkspaceRequest
  ): Promise<AgentWorkspace | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await agentWorkspaceApi.updateWorkspace(agentName, request);
      
      if (response.success && response.workspace) {
        setWorkspace(response.workspace);
        toast.success('Workspace updated successfully');
        return response.workspace;
      } else {
        throw new Error(response.error || 'Failed to update workspace');
      }
    } catch (error) {
      handleError(error, 'Failed to update workspace');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, toast]);

  const deleteWorkspace = useCallback(async (agentName: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await agentWorkspaceApi.deleteWorkspace(agentName);
      
      if (response.success) {
        setWorkspace(null);
        setUsage(null);
        toast.success('Workspace deleted successfully');
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete workspace');
      }
    } catch (error) {
      handleError(error, 'Failed to delete workspace');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, toast]);

  const refreshWorkspace = useCallback(async (agentName: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await agentWorkspaceApi.getWorkspace(agentName);
      
      if (response.success) {
        setWorkspace(response.workspace || null);
        setUsage(response.usage || null);
      } else {
        throw new Error(response.error || 'Failed to load workspace');
      }
    } catch (error) {
      handleError(error, 'Failed to refresh workspace');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const checkQuotaUsage = useCallback(async (agentName: string): Promise<WorkspaceUsage | null> => {
    try {
      const response = await agentWorkspaceApi.getWorkspaceUsage(agentName);
      
      if (response.success && response.usage) {
        setUsage(response.usage);
        
        // Check for quota warnings
        const { usage: currentUsage, quotas } = response.usage;
        
        if (currentUsage.storage / quotas.storage > 0.9) {
          toast.warning('Storage quota is 90% full');
        }
        
        if (currentUsage.pages / quotas.pages > 0.9) {
          toast.warning('Page quota is 90% full');
        }
        
        if (currentUsage.components / quotas.components > 0.9) {
          toast.warning('Component quota is 90% full');
        }
        
        return response.usage;
      } else {
        throw new Error(response.error || 'Failed to check quota usage');
      }
    } catch (error) {
      handleError(error, 'Failed to check quota usage');
      return null;
    }
  }, [handleError, toast]);

  // Auto-load workspace if agentName is provided
  useEffect(() => {
    if (agentName) {
      refreshWorkspace(agentName);
    }
  }, [agentName, refreshWorkspace]);

  // Auto-check quota usage periodically
  useEffect(() => {
    if (!agentName) return;

    const checkQuotas = () => {
      checkQuotaUsage(agentName);
    };

    // Check immediately and then every 5 minutes
    checkQuotas();
    const interval = setInterval(checkQuotas, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [agentName, checkQuotaUsage]);

  return {
    workspace,
    usage,
    isLoading,
    error,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    refreshWorkspace,
    checkQuotaUsage
  };
};