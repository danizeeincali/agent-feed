/**
 * Enhanced Claude Instance Synchronization Hook
 * Addresses instance ID mismatch between frontend and backend
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';

interface ClaudeInstanceData {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: Date;
  validated: boolean;
}

interface InstanceSyncState {
  instances: ClaudeInstanceData[];
  selectedInstanceId: string | null;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
  syncInProgress: boolean;
}

interface UseClaudeInstanceSyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
  validateInstances?: boolean;
  clearCacheOnMount?: boolean;
}

export const useClaudeInstanceSync = (options: UseClaudeInstanceSyncOptions = {}) => {
  const {
    autoSync = true,
    syncInterval = 3000, // 3 seconds
    validateInstances = true,
    clearCacheOnMount = true
  } = options;

  const [state, setState] = useState<InstanceSyncState>({
    instances: [],
    selectedInstanceId: null,
    isLoading: false,
    error: null,
    lastSync: null,
    syncInProgress: false
  });

  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);
  const validationCacheRef = useRef<Map<string, boolean>>(new Map());

  // Validate instance ID format
  const validateInstanceId = useCallback((instanceId: string): boolean => {
    if (!instanceId || typeof instanceId !== 'string') {
      return false;
    }
    
    // Check cache first
    if (validationCacheRef.current.has(instanceId)) {
      return validationCacheRef.current.get(instanceId)!;
    }
    
    // Validate format: claude-XXXX where XXXX is alphanumeric
    const isValid = /^claude-[a-zA-Z0-9]+$/.test(instanceId.trim());
    
    // Cache result
    validationCacheRef.current.set(instanceId, isValid);
    
    return isValid;
  }, []);

  // Parse backend response and validate instances
  const parseAndValidateInstances = useCallback((backendResponse: any): ClaudeInstanceData[] => {
    if (!backendResponse?.success || !Array.isArray(backendResponse.instances)) {
      console.warn('Invalid backend response format:', backendResponse);
      return [];
    }

    return backendResponse.instances
      .map((instanceString: string) => {
        try {
          // Extract ID from format "claude-XXXX (Description)" or just "claude-XXXX"
          const idMatch = instanceString.match(/^(claude-[a-zA-Z0-9]+)(?:\s*\((.+)\))?$/);
          
          if (!idMatch) {
            console.warn('Could not parse instance format:', instanceString);
            return null;
          }
          
          const id = idMatch[1];
          const description = idMatch[2] || 'Running';
          
          // Validate ID format
          if (!validateInstanceId(id)) {
            console.warn('Invalid instance ID format:', id);
            return null;
          }
          
          return {
            id,
            name: instanceString,
            status: 'running' as const, // Backend only returns running instances
            startTime: new Date(),
            validated: true
          };
        } catch (error) {
          console.warn('Error parsing instance:', instanceString, error);
          return null;
        }
      })
      .filter((instance): instance is ClaudeInstanceData => instance !== null);
  }, [validateInstanceId]);

  // Sync with backend
  const syncWithBackend = useCallback(async (forceSync = false): Promise<ClaudeInstanceData[]> => {
    if (!mountedRef.current || (state.syncInProgress && !forceSync)) {
      return state.instances;
    }

    setState(prev => ({ ...prev, syncInProgress: true, error: null }));

    try {
      // Clear API cache if requested or on force sync
      if (forceSync || clearCacheOnMount) {
        apiService.clearCache('/claude/instances');
      }

      console.log('🔄 Syncing with backend...');
      const backendResponse = await apiService.getClaudeInstances(!forceSync);
      
      if (!mountedRef.current) return state.instances;
      
      const validatedInstances = parseAndValidateInstances(backendResponse);
      
      console.log('✅ Backend sync completed:', {
        found: validatedInstances.length,
        instances: validatedInstances.map(i => ({ id: i.id, name: i.name }))
      });

      setState(prev => ({
        ...prev,
        instances: validatedInstances,
        lastSync: new Date(),
        syncInProgress: false,
        error: null
      }));

      return validatedInstances;
    } catch (error) {
      console.error('❌ Backend sync failed:', error);
      
      if (!mountedRef.current) return state.instances;
      
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setState(prev => ({
        ...prev,
        error: `Sync failed: ${errorMessage}`,
        syncInProgress: false
      }));

      return state.instances;
    }
  }, [state.syncInProgress, state.instances, clearCacheOnMount, parseAndValidateInstances]);

  // Validate if instance exists in backend
  const validateInstanceExists = useCallback(async (instanceId: string): Promise<boolean> => {
    if (!validateInstanceId(instanceId)) {
      return false;
    }

    try {
      const instances = await syncWithBackend();
      return instances.some(instance => instance.id === instanceId);
    } catch (error) {
      console.error('Failed to validate instance:', instanceId, error);
      return false;
    }
  }, [syncWithBackend, validateInstanceId]);

  // Select instance with validation
  const selectInstance = useCallback(async (instanceId: string | null): Promise<boolean> => {
    if (!instanceId) {
      setState(prev => ({ ...prev, selectedInstanceId: null, error: null }));
      return true;
    }

    if (!validateInstanceId(instanceId)) {
      const error = `Invalid instance ID format: ${instanceId}`;
      console.error(error);
      setState(prev => ({ ...prev, error, selectedInstanceId: null }));
      return false;
    }

    // Validate instance exists in backend
    const exists = await validateInstanceExists(instanceId);
    if (!exists) {
      const error = `Instance ${instanceId} not found in backend`;
      console.error(error);
      setState(prev => ({ ...prev, error, selectedInstanceId: null }));
      
      // Force sync to get latest instances
      await syncWithBackend(true);
      return false;
    }

    setState(prev => ({ 
      ...prev, 
      selectedInstanceId: instanceId, 
      error: null 
    }));
    return true;
  }, [validateInstanceId, validateInstanceExists, syncWithBackend]);

  // Force refresh
  const forceSync = useCallback(() => {
    return syncWithBackend(true);
  }, [syncWithBackend]);

  // Clear validation cache
  const clearValidationCache = useCallback(() => {
    validationCacheRef.current.clear();
  }, []);

  // Setup auto sync
  useEffect(() => {
    if (!autoSync) return;

    // Initial sync
    syncWithBackend(true);

    // Setup interval
    syncIntervalRef.current = setInterval(() => {
      syncWithBackend(false);
    }, syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSync, syncInterval, syncWithBackend]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    instances: state.instances,
    selectedInstanceId: state.selectedInstanceId,
    selectedInstance: state.instances.find(i => i.id === state.selectedInstanceId) || null,
    isLoading: state.isLoading,
    error: state.error,
    lastSync: state.lastSync,
    syncInProgress: state.syncInProgress,
    
    // Actions
    syncWithBackend,
    selectInstance,
    forceSync,
    clearValidationCache,
    validateInstanceId,
    validateInstanceExists,
    
    // Computed
    hasValidInstances: state.instances.length > 0,
    runningInstancesCount: state.instances.filter(i => i.status === 'running').length
  };
};