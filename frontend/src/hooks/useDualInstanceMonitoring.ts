import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useWebSocketSingleton } from './useWebSocketSingleton';
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

export function useDualInstanceMonitoring() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useWebSocketSingleton({ url: '/socket.io' });

  // Fetch instance status
  const { data: status, isLoading: statusLoading } = useQuery<DualInstanceStatus>({
    queryKey: ['dual-instance-status'],
    queryFn: async () => {
      const response = await fetch('/api/dual-instance/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds
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
  });

  // Fetch pending confirmations
  const { data: pendingConfirmations = [] } = useQuery<ConfirmationRequest[]>({
    queryKey: ['dual-instance-pending'],
    queryFn: async () => {
      const response = await fetch('/api/dual-instance/pending-confirmations');
      if (!response.ok) throw new Error('Failed to fetch pending confirmations');
      return response.json();
    },
    refetchInterval: 3000, // Check more frequently for pending confirmations
  });

  // Send dev to prod handoff
  const sendHandoff = useMutation({
    mutationFn: async ({ task, context }: { task: string; context?: any }) => {
      const response = await fetch('/api/dual-instance/handoff/dev-to-prod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, context }),
      });
      if (!response.ok) throw new Error('Failed to send handoff');
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Handoff sent: ${data.messageId}`);
      queryClient.invalidateQueries({ queryKey: ['dual-instance-messages'] });
    },
    onError: (error: Error) => {
      toast.error(`Handoff failed: ${error.message}`);
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
      toast.error(`Confirmation failed: ${error.message}`);
    },
  });

  // WebSocket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleStatusUpdate = (data: any) => {
      queryClient.setQueryData(['dual-instance-status'], (old: any) => ({
        ...old,
        ...data,
      }));
    };

    const handleNewMessage = (message: Message) => {
      queryClient.setQueryData(['dual-instance-messages'], (old: Message[] = []) => {
        return [message, ...old.slice(0, 49)]; // Keep last 50 messages
      });
      
      // Show notification for important messages
      if (message.security?.requiresConfirmation) {
        toast.warning(`New confirmation request from ${message.source}`);
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

    socket.on('dual-instance-status', handleStatusUpdate);
    socket.on('dual-instance-message', handleNewMessage);
    socket.on('confirmation-processed', handleConfirmationProcessed);
    socket.on('instance-heartbeat', handleHeartbeat);

    return () => {
      socket.off('dual-instance-status', handleStatusUpdate);
      socket.off('dual-instance-message', handleNewMessage);
      socket.off('confirmation-processed', handleConfirmationProcessed);
      socket.off('instance-heartbeat', handleHeartbeat);
    };
  }, [socket, isConnected, queryClient]);

  return {
    status,
    messages,
    pendingConfirmations,
    isLoading: statusLoading || messagesLoading,
    sendHandoff: sendHandoff.mutate,
    handleConfirmation: handleConfirmation.mutate,
    isConnected,
  };
}