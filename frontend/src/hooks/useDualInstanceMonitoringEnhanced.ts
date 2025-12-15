/**
 * Enhanced Dual Instance Monitoring Hook
 * Integrates the new connection management system with existing dual-instance monitoring
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useEnhancedDualInstanceConnection } from './useConnectionManager';
import { toast } from 'sonner';

interface InstanceHealth {
  timestamp: string;
  pid?: number;
  workspace?: string;
  type?: string;
  isCurrent?: boolean;
  activeAgents?: number;
  status?: string;
}

interface InstanceStatus {
  status: 'running' | 'stopped' | 'error';
  health: InstanceHealth | null;
}

interface DualInstanceStatus {
  timestamp: string;
  development: InstanceStatus;
  production: InstanceStatus;
  communication: any;
  pendingConfirmations: any[];
}

interface Message {
  id: string;
  source: string;
  target: string;
  type: string;
  timestamp: string;
  payload: any;
  status: string;
  security: {
    requiresConfirmation: boolean;
  };
}

interface ConfirmationRequest {
  message: Message;
  expiresAt: string;
}

export function useDualInstanceMonitoringEnhanced() {
  const queryClient = useQueryClient();
  
  // Use enhanced connection management
  const {
    socket,
    isConnected,
    state: connectionState,
    health: connectionHealth,
    metrics: connectionMetrics,
    connect: connectWs,
    disconnect: disconnectWs,
    reconnect: reconnectWs,
    getConnectionQuality,
    getConnectionStability
  } = useEnhancedDualInstanceConnection();

  // Fetch instance status
  const { data: status, isLoading: statusLoading } = useQuery<DualInstanceStatus>({
    queryKey: ['dual-instance-status'],
    queryFn: async () => {
      const response = await fetch('/api/dual-instance/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      return response.json();
    },
    refetchInterval: 5000,
    enabled: isConnected // Only fetch when connected
  });

  // Fetch message history
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['dual-instance-messages'],
    queryFn: async () => {
      const response = await fetch('/api/dual-instance/messages?limit=50');
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    refetchInterval: 10000,
    enabled: isConnected
  });

  // Fetch pending confirmations
  const { data: pendingConfirmations = [] } = useQuery<ConfirmationRequest[]>({
    queryKey: ['dual-instance-pending'],
    queryFn: async () => {
      const response = await fetch('/api/dual-instance/pending-confirmations');
      if (!response.ok) throw new Error('Failed to fetch pending confirmations');
      return response.json();
    },
    refetchInterval: 3000,
    enabled: isConnected
  });

  // Send dev to prod handoff
  const sendHandoff = useMutation({
    mutationFn: async ({ task, context }: { task: string; context?: any }) => {
      if (!isConnected) {
        throw new Error('WebSocket not connected');
      }
      
      const response = await fetch('/api/dual-instance/handoff/dev-to-prod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, context }),
      });
      if (!response.ok) throw new Error('Failed to send handoff');
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Handoff sent: ${data.messageId}`, {
        description: `Connection quality: ${getConnectionQuality()}`
      });
      queryClient.invalidateQueries({ queryKey: ['dual-instance-messages'] });
    },
    onError: (error: Error) => {
      toast.error(`Handoff failed: ${error.message}`, {
        description: isConnected ? 'Check server status' : 'WebSocket disconnected'
      });
    },
  });

  // Handle confirmation
  const handleConfirmation = useMutation({
    mutationFn: async ({ 
      messageId, 
      approved, 
      comment 
    }: { 
      messageId: string; 
      approved: boolean; 
      comment?: string;
    }) => {
      if (!isConnected) {
        throw new Error('WebSocket not connected');
      }
      
      const response = await fetch(`/api/dual-instance/confirm/${messageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, comment }),
      });
      if (!response.ok) throw new Error('Failed to process confirmation');
      return response.json();
    },
    onSuccess: (data, variables) => {
      const action = variables.approved ? 'approved' : 'rejected';
      toast.success(`Request ${action}: ${data.id}`);
      queryClient.invalidateQueries({ queryKey: ['dual-instance-pending'] });
      queryClient.invalidateQueries({ queryKey: ['dual-instance-messages'] });
    },
    onError: (error: Error) => {
      toast.error(`Confirmation failed: ${error.message}`, {
        description: isConnected ? 'Check server status' : 'WebSocket disconnected'
      });
    },
  });

  // WebSocket event listeners with enhanced error handling
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleStatusUpdate = (data: any) => {
      queryClient.setQueryData(['dual-instance-status'], (old: any) => ({
        ...old,
        ...data,
        _connectionHealth: connectionHealth,
        _connectionMetrics: connectionMetrics
      }));
    };

    const handleNewMessage = (message: Message) => {
      queryClient.setQueryData(['dual-instance-messages'], (old: Message[] = []) => {
        return [message, ...old.slice(0, 49)];
      });
      
      // Enhanced notifications with connection context
      if (message.security?.requiresConfirmation) {
        toast.warning(`New confirmation request from ${message.source}`, {
          description: `Connection: ${getConnectionQuality()} quality, ${Math.round(connectionHealth.latency || 0)}ms latency`
        });
        queryClient.invalidateQueries({ queryKey: ['dual-instance-pending'] });
      }
    };

    const handleConfirmationProcessed = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['dual-instance-pending'] });
      queryClient.invalidateQueries({ queryKey: ['dual-instance-messages'] });
    };

    const handleHeartbeat = (data: any) => {
      const { instance, ...health } = data;
      queryClient.setQueryData(['dual-instance-status'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          [instance]: {
            status: 'running',
            health,
          },
        };
      });
    };

    // Enhanced error handling for dual instance events
    const handleConnectionError = (error: any) => {
      toast.error('Dual instance communication error', {
        description: error.message || 'Unknown connection error'
      });
    };

    // Register event listeners
    socket.on('dual-instance-status', handleStatusUpdate);
    socket.on('dual-instance-message', handleNewMessage);
    socket.on('confirmation-processed', handleConfirmationProcessed);
    socket.on('instance-heartbeat', handleHeartbeat);
    socket.on('dual-instance-error', handleConnectionError);

    return () => {
      socket.off('dual-instance-status', handleStatusUpdate);
      socket.off('dual-instance-message', handleNewMessage);
      socket.off('confirmation-processed', handleConfirmationProcessed);
      socket.off('instance-heartbeat', handleHeartbeat);
      socket.off('dual-instance-error', handleConnectionError);
    };
  }, [socket, isConnected, queryClient, connectionHealth, connectionMetrics, getConnectionQuality]);

  // Connection state change notifications
  useEffect(() => {
    const handleConnectionChange = () => {
      if (isConnected) {
        toast.success('Connected to dual instance system', {
          description: `Quality: ${getConnectionQuality()}, Stability: ${Math.round(getConnectionStability() * 100)}%`
        });
      } else {
        toast.warning('Disconnected from dual instance system', {
          description: 'Real-time features may be limited'
        });
      }
    };

    // Only notify on state changes, not initial connection
    let isFirstConnection = true;
    if (isFirstConnection) {
      isFirstConnection = false;
      return;
    }

    handleConnectionChange();
  }, [isConnected, getConnectionQuality, getConnectionStability]);

  return {
    // Legacy API for backward compatibility
    status,
    messages,
    pendingConfirmations,
    isLoading: statusLoading || messagesLoading,
    sendHandoff: sendHandoff.mutate,
    handleConfirmation: handleConfirmation.mutate,
    isConnected,

    // Enhanced connection management
    connectionState,
    connectionHealth,
    connectionMetrics,
    connectionQuality: getConnectionQuality(),
    connectionStability: getConnectionStability(),
    
    // Connection control methods
    connectWs,
    disconnectWs,
    reconnectWs,
    
    // Additional utilities
    isHandoffPending: sendHandoff.isPending,
    isConfirmationPending: handleConfirmation.isPending,
    
    // Diagnostic information
    getDiagnostics: () => ({
      websocket: {
        state: connectionState,
        health: connectionHealth,
        metrics: connectionMetrics,
        quality: getConnectionQuality(),
        stability: getConnectionStability()
      },
      api: {
        statusLoading,
        messagesLoading,
        messagesCount: messages.length,
        pendingCount: pendingConfirmations.length
      }
    })
  };
}

// Backward compatibility export
export { useDualInstanceMonitoringEnhanced as useDualInstanceMonitoring };