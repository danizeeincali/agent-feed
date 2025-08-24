/**
 * useInstanceManager Hook
 * 
 * Hook for managing Claude instance lifecycle and operations
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { getSocketIOUrl } from '../utils/websocket-url';

export interface ProcessInfo {
  pid: number | null;
  name: string;
  status: 'running' | 'stopped' | 'restarting' | 'error';
  startTime: Date | null;
  autoRestartEnabled: boolean;
  autoRestartHours: number;
}

export interface LaunchConfig {
  autoRestartHours?: number;
  workingDirectory?: string;
  resumeOnRestart?: boolean;
  agentLinkEnabled?: boolean;
}

// Instance interface for dual instance page compatibility
export interface InstanceInfo extends ProcessInfo {
  id: string;
  type: string;
  createdAt: Date;
}

// Stats interface for monitoring
export interface InstanceStats {
  running: number;
  stopped: number;
  error: number;
  total: number;
}

export const useInstanceManager = () => {
  // Generate stable instance ID that persists across process restarts
  const stableInstanceId = useRef<string>(uuidv4());
  
  const [processInfo, setProcessInfo] = useState<ProcessInfo>({
    pid: null,
    name: 'Claude Instance',
    status: 'stopped',
    startTime: null,
    autoRestartEnabled: false,
    autoRestartHours: 6
  });

  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io(getSocketIOUrl(), {
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('Instance manager connected to WebSocket');
      setIsConnected(true);
      
      // Request current process info
      newSocket.emit('process:info');
    });

    newSocket.on('disconnect', () => {
      console.log('Instance manager disconnected from WebSocket');
      setIsConnected(false);
    });

    newSocket.on('process:info', (info: ProcessInfo) => {
      setProcessInfo(info);
    });

    newSocket.on('process:launched', (info: ProcessInfo) => {
      setProcessInfo(info);
    });

    newSocket.on('process:killed', () => {
      setProcessInfo(prev => ({ 
        ...prev, 
        status: 'stopped', 
        pid: null,
        startTime: null
      }));
    });

    newSocket.on('process:error', (error: any) => {
      console.error('Process error:', error);
      setProcessInfo(prev => ({ ...prev, status: 'error' }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const launchInstance = useCallback(async (config?: LaunchConfig): Promise<void> => {
    if (!socket) return;

    return new Promise((resolve, reject) => {
      socket.emit('process:launch', config || {});
      
      socket.once('process:launched', (info: ProcessInfo) => {
        setProcessInfo(info);
        resolve();
      });

      socket.once('process:error', (error: any) => {
        reject(new Error(error.message || 'Failed to launch instance'));
      });
    });
  }, [socket]);

  const killInstance = useCallback(async (): Promise<void> => {
    if (!socket) return;

    return new Promise((resolve) => {
      socket.emit('process:kill');
      
      socket.once('process:killed', () => {
        resolve();
      });
    });
  }, [socket]);

  const restartInstance = useCallback(async (): Promise<void> => {
    if (!socket) return;

    return new Promise((resolve, reject) => {
      socket.emit('process:restart');
      
      socket.once('process:restarted', (info: ProcessInfo) => {
        setProcessInfo(info);
        resolve();
      });

      socket.once('process:error', (error: any) => {
        reject(new Error(error.message || 'Failed to restart instance'));
      });
    });
  }, [socket]);

  const updateConfig = useCallback((config: Partial<LaunchConfig>): void => {
    if (!socket) return;
    
    socket.emit('process:config', config);
  }, [socket]);

  // CRITICAL FIX: Always provide at least one mock instance for UI consistency
  const instances = useMemo<InstanceInfo[]>(() => {
    const baseInstanceInfo: InstanceInfo = {
      id: stableInstanceId.current, // Use stable UUID
      type: 'claude-instance',
      name: processInfo?.name || 'Claude Instance',
      status: processInfo?.status || 'stopped',
      pid: processInfo?.pid || null,
      startTime: processInfo?.startTime || null,
      autoRestartEnabled: processInfo?.autoRestartEnabled || false,
      autoRestartHours: processInfo?.autoRestartHours || 6,
      createdAt: processInfo?.startTime || new Date()
    };
    
    return [baseInstanceInfo];
  }, [processInfo]);

  // CRITICAL FIX: Always provide consistent stats based on current process status
  const stats = useMemo<InstanceStats>(() => {
    const status = processInfo?.status || 'stopped';
    return {
      running: status === 'running' || status === 'restarting' ? 1 : 0,
      stopped: status === 'stopped' ? 1 : 0,
      error: status === 'error' ? 1 : 0,
      total: 1 // Always one instance in single-instance mode
    };
  }, [processInfo]);

  return {
    // Legacy interface for backward compatibility
    processInfo,
    isConnected,
    launchInstance,
    killInstance,
    restartInstance,
    updateConfig,
    // New interface for DualInstancePage
    instances,
    stats,
    loading: false, // Add loading state if needed
    error: null // Add error state if needed
  };
};

export default useInstanceManager;