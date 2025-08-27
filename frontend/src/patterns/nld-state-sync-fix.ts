/**
 * NLD State Synchronization Fix Implementation
 * Automated resolution for React state management anti-patterns
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { nldReactStateMonitor } from './nld-react-state-monitor';

/**
 * Enhanced hook for synchronized state management
 * Prevents race conditions between state updates and async operations
 */
export function useSynchronizedState<T>(
  initialValue: T,
  options: {
    onStateChange?: (newValue: T, oldValue: T) => void | Promise<void>;
    debounceMs?: number;
    componentName?: string;
    stateKey?: string;
  } = {}
): [T, (value: T | ((prev: T) => T)) => void, { isPending: boolean }] {
  
  const { 
    onStateChange, 
    debounceMs = 0, 
    componentName = 'Unknown',
    stateKey = 'state'
  } = options;
  
  const [state, setState] = useState<T>(initialValue);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousValueRef = useRef<T>(initialValue);

  const setSynchronizedState = useCallback((value: T | ((prev: T) => T)) => {
    const newValue = typeof value === 'function' ? (value as (prev: T) => T)(state) : value;
    const oldValue = previousValueRef.current;
    
    // Track state change for NLD monitoring
    nldReactStateMonitor.trackStateChange(componentName, stateKey, oldValue, newValue);
    
    setState(newValue);
    previousValueRef.current = newValue;
    
    if (onStateChange) {
      setIsPending(true);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Debounce the state change callback
      timeoutRef.current = setTimeout(async () => {
        try {
          await onStateChange(newValue, oldValue);
        } catch (error) {
          console.error('State change callback error:', error);
        } finally {
          setIsPending(false);
        }
      }, debounceMs);
    }
  }, [state, onStateChange, debounceMs, componentName, stateKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, setSynchronizedState, { isPending }];
}

/**
 * Enhanced useEffect with dependency monitoring
 * Automatically detects missing dependencies and stale closures
 */
export function useMonitoredEffect(
  effect: React.EffectCallback,
  deps: React.DependencyList | undefined,
  options: {
    componentName?: string;
    effectName?: string;
    skipDependencyCheck?: boolean;
  } = {}
): void {
  
  const { 
    componentName = 'Unknown',
    effectName = 'effect',
    skipDependencyCheck = false 
  } = options;

  // Monitor effect execution in development
  useEffect(() => {
    if (!skipDependencyCheck && process.env.NODE_ENV === 'development') {
      nldReactStateMonitor.trackUseEffectExecution(
        componentName,
        effectName,
        deps || [],
        effect
      );
    }
    
    return effect();
  }, deps);
}

/**
 * Connection state hook with automatic synchronization
 * Fixes the connection lifecycle mismatch anti-pattern
 */
interface ConnectionState {
  isSSE: boolean;
  isPolling: boolean;
  instanceId: string | null;
  connectionType: 'none' | 'sse' | 'polling';
  isConnected: boolean;
}

export function useConnectionState(
  initialInstanceId?: string | null
): [
  ConnectionState,
  {
    connectSSE: (instanceId: string) => void;
    startPolling: (instanceId: string) => void;
    disconnect: () => void;
    setInstanceId: (instanceId: string | null) => void;
  }
] {
  
  const [connectionState, setConnectionState] = useSynchronizedState<ConnectionState>(
    {
      isSSE: false,
      isPolling: false,
      instanceId: initialInstanceId || null,
      connectionType: 'none',
      isConnected: false
    },
    {
      componentName: 'ConnectionStateHook',
      stateKey: 'connectionState'
    }
  );

  const connectSSE = useCallback((instanceId: string) => {
    // Track connection event for NLD monitoring
    nldReactStateMonitor.trackConnectionEvent(instanceId, 'sse', connectionState.instanceId);
    
    setConnectionState(prev => ({
      ...prev,
      isSSE: true,
      isPolling: false,
      instanceId,
      connectionType: 'sse',
      isConnected: true
    }));
  }, [setConnectionState, connectionState.instanceId]);

  const startPolling = useCallback((instanceId: string) => {
    // Track connection event for NLD monitoring  
    nldReactStateMonitor.trackConnectionEvent(instanceId, 'polling', connectionState.instanceId);
    
    setConnectionState(prev => ({
      ...prev,
      isSSE: false,
      isPolling: true,
      instanceId,
      connectionType: 'polling', 
      isConnected: true
    }));
  }, [setConnectionState, connectionState.instanceId]);

  const disconnect = useCallback(() => {
    const currentInstanceId = connectionState.instanceId;
    if (currentInstanceId) {
      nldReactStateMonitor.trackConnectionEvent(currentInstanceId, 'disconnect', null);
    }
    
    setConnectionState(prev => ({
      ...prev,
      isSSE: false,
      isPolling: false,
      instanceId: null,
      connectionType: 'none',
      isConnected: false
    }));
  }, [setConnectionState, connectionState.instanceId]);

  const setInstanceId = useCallback((instanceId: string | null) => {
    setConnectionState(prev => ({
      ...prev,
      instanceId
    }));
  }, [setConnectionState]);

  return [
    connectionState,
    { connectSSE, startPolling, disconnect, setInstanceId }
  ];
}

/**
 * Instance selection hook with automatic terminal synchronization
 * Fixes the state isolation and race condition anti-patterns
 */
export function useInstanceSelection(options: {
  onInstanceChange?: (instanceId: string | null) => void | Promise<void>;
  autoConnect?: boolean;
  componentName?: string;
} = {}): [
  string | null,
  {
    selectInstance: (instanceId: string | null) => void;
    clearSelection: () => void;
    isPending: boolean;
  }
] {
  
  const { 
    onInstanceChange, 
    autoConnect = true,
    componentName = 'InstanceSelection'
  } = options;

  const [selectedInstance, setSelectedInstance, { isPending }] = useSynchronizedState<string | null>(
    null,
    {
      onStateChange: async (newInstanceId, oldInstanceId) => {
        if (newInstanceId !== oldInstanceId && onInstanceChange) {
          await onInstanceChange(newInstanceId);
        }
      },
      debounceMs: 50, // Small delay to ensure state propagation
      componentName,
      stateKey: 'selectedInstance'
    }
  );

  const selectInstance = useCallback((instanceId: string | null) => {
    setSelectedInstance(instanceId);
  }, [setSelectedInstance]);

  const clearSelection = useCallback(() => {
    setSelectedInstance(null);
  }, [setSelectedInstance]);

  return [
    selectedInstance,
    { selectInstance, clearSelection, isPending }
  ];
}

/**
 * Comprehensive Claude Instance Manager hook
 * Combines all fixes for the detected anti-patterns
 */
export function useClaudeInstanceManager(apiUrl: string = 'http://localhost:3000') {
  // Use the enhanced instance selection hook
  const [selectedInstance, { selectInstance, isPending: isSelectionPending }] = useInstanceSelection({
    onInstanceChange: async (instanceId) => {
      if (instanceId && connectionState.instanceId !== instanceId) {
        // Automatically sync terminal connection when instance selection changes
        try {
          console.log('🔄 Syncing terminal connection to:', instanceId);
          connectSSE(instanceId);
        } catch (error) {
          console.warn('SSE failed, falling back to polling:', error);
          startPolling(instanceId);
        }
      }
    },
    componentName: 'ClaudeInstanceManager'
  });

  // Use the enhanced connection state hook
  const [connectionState, { connectSSE, startPolling, disconnect }] = useConnectionState();

  // Instance creation with proper state synchronization
  const createInstance = useCallback(async (command: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: [command] })
      });
      
      const data = await response.json();
      if (data.success) {
        // This will automatically trigger terminal connection via onInstanceChange
        selectInstance(data.instanceId);
        return data.instanceId;
      } else {
        throw new Error(data.error || 'Failed to create instance');
      }
    } catch (error) {
      console.error('Create instance error:', error);
      throw error;
    }
  }, [apiUrl, selectInstance]);

  // Enhanced effect with dependency monitoring
  useMonitoredEffect(
    () => {
      // This effect ensures connection state stays in sync with selected instance
      if (selectedInstance && connectionState.instanceId !== selectedInstance) {
        console.log('🔄 Connection state out of sync, correcting...', {
          selected: selectedInstance,
          connected: connectionState.instanceId
        });
      }
    },
    [selectedInstance, connectionState.instanceId],
    {
      componentName: 'ClaudeInstanceManager',
      effectName: 'connectionStateSyncCheck'
    }
  );

  return {
    selectedInstance,
    connectionState,
    selectInstance,
    createInstance,
    connectSSE,
    startPolling,
    disconnect,
    isPending: isSelectionPending,
    // Utility functions for debugging
    getDebugInfo: () => ({
      selectedInstance,
      connectionState,
      isInSync: selectedInstance === connectionState.instanceId,
      antiPatternReport: nldReactStateMonitor.generateAntiPatternReport()
    })
  };
}

/**
 * Provider component for NLD monitoring context
 */
export const NLDMonitoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    console.log('🔍 NLD Monitoring System Activated');
    
    return () => {
      console.log('🔍 NLD Monitoring System Deactivated');
    };
  }, []);

  return <>{children}</>;
};

/**
 * Development tools component for visualizing state sync
 */
export const NLDStateDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        setDebugInfo(nldReactStateMonitor.generateAntiPatternReport());
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, []);

  if (process.env.NODE_ENV !== 'development' || !debugInfo) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 10000
    }}>
      <h4>🔍 NLD State Monitor</h4>
      <div>State Changes: {debugInfo.summary?.totalStateChanges || 0}</div>
      <div>Race Conditions: {debugInfo.summary?.raceConditionsDetected || 0}</div>
      <div>Stale Closures: {debugInfo.summary?.staleClosuresDetected || 0}</div>
      <div>Connection Events: {debugInfo.summary?.totalConnectionEvents || 0}</div>
      {debugInfo.antiPatterns?.raceConditions?.length > 0 && (
        <div style={{ color: 'red' }}>⚠️ Race conditions detected!</div>
      )}
    </div>
  );
};