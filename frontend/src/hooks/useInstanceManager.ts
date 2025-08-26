/**
 * useInstanceManager Hook
 * 
 * Hook for managing Claude instance lifecycle and operations
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
// HTTP/SSE only - Socket.IO removed
// import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
// import { getSocketIOUrl } from '../utils/websocket-url';

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

  // HTTP/SSE only - Socket.IO completely eliminated
  useEffect(() => {
    console.log('🚀 [HTTP/SSE Instance Manager] Mock connection - no Socket.IO needed');
    
    // Create mock socket for backward compatibility
    const mockSocket = {
      connected: true,
      emit: (event: string, data?: any) => {
        console.log(`📡 [HTTP/SSE Mock Instance] Emit ${event}:`, data);
      },
      on: (event: string, handler: Function) => {
        console.log(`👂 [HTTP/SSE Mock Instance] Listen ${event}`);
      },
      off: (event: string, handler?: Function) => {
        console.log(`🔇 [HTTP/SSE Mock Instance] Unlisten ${event}`);
      },
      disconnect: () => {
        console.log('📴 [HTTP/SSE Mock Instance] Disconnect - no Socket.IO needed');
      }
    };

    // HTTP/SSE Mock - immediate connection simulation
    console.log('🌐 [HTTP/SSE Instance Manager] Mock connection established');
    setIsConnected(true);
    
    // Mock process info with immediate response
    setTimeout(() => {
      const mockInfo = {
        pid: 54321,
        name: 'Claude Instance Manager (Mock)',
        status: 'running' as const,
        startTime: new Date(),
        autoRestartEnabled: true,
        autoRestartHours: 6
      };
      setProcessInfo(mockInfo);
      console.log('📊 [HTTP/SSE Mock Instance] Process info loaded');
    }, 100);

    setSocket(mockSocket as any);

    return () => {
      console.log('🧹 [HTTP/SSE Mock Instance] Cleanup - no Socket.IO disconnection needed');
    };
  }, []);

  const launchInstance = useCallback(async (config?: LaunchConfig): Promise<void> => {
    if (!socket) return;

    return new Promise((resolve, reject) => {
      console.log('🚀 [HTTP/SSE Mock Instance] Launch process:', config || {});
      
      // Mock successful launch
      setTimeout(() => {
        const mockInfo = {
          pid: Math.floor(Math.random() * 90000) + 10000,
          name: 'Claude Instance (Mock Launch)',
          status: 'running' as const,
          startTime: new Date(),
          autoRestartEnabled: true,
          autoRestartHours: 6
        };
        setProcessInfo(mockInfo);
        console.log('✓ [HTTP/SSE Mock Instance] Process launched successfully');
        resolve();
      }, 1000);
    });
  }, [socket]);

  const killInstance = useCallback(async (): Promise<void> => {
    if (!socket) return;

    return new Promise((resolve) => {
      console.log('🛑 [HTTP/SSE Mock Instance] Kill process');
      
      // Mock successful kill
      setTimeout(() => {
        setProcessInfo(prev => ({
          ...prev,
          pid: null,
          status: 'stopped',
          startTime: null
        }));
        console.log('✓ [HTTP/SSE Mock Instance] Process killed successfully');
        resolve();
      }, 500);
    });
  }, [socket]);

  const restartInstance = useCallback(async (): Promise<void> => {
    if (!socket) return;

    return new Promise((resolve, reject) => {
      console.log('🔄 [HTTP/SSE Mock Instance] Restart process');
      
      // Mock restart sequence
      setTimeout(() => {
        setProcessInfo(prev => ({ ...prev, status: 'restarting' }));
        
        setTimeout(() => {
          const mockInfo = {
            pid: Math.floor(Math.random() * 90000) + 10000,
            name: 'Claude Instance (Mock Restart)',
            status: 'running' as const,
            startTime: new Date(),
            autoRestartEnabled: true,
            autoRestartHours: 6
          };
          setProcessInfo(mockInfo);
          console.log('✓ [HTTP/SSE Mock Instance] Process restarted successfully');
          resolve();
        }, 1500);
      }, 500);
    });
  }, [socket]);

  const updateConfig = useCallback((config: Partial<LaunchConfig>): void => {
    if (!socket) return;
    
    console.log('⚙️ [HTTP/SSE Mock Instance] Update config:', config);
    // Mock config update - no Socket.IO emission
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