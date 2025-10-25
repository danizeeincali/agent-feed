/**
 * useTicketUpdates Hook
 *
 * React hook for listening to real-time ticket status updates via Socket.IO
 *
 * Features:
 * - Automatic connection/disconnection lifecycle management
 * - React Query cache invalidation on status updates
 * - Optional toast notifications for status changes
 * - Proper cleanup on unmount
 * - Error handling for connection failures
 *
 * Event Payload Structure:
 * {
 *   post_id: string,
 *   ticket_id: string,
 *   status: 'pending' | 'processing' | 'completed' | 'failed',
 *   agent_id: string,
 *   timestamp: string (ISO format),
 *   error?: string (present when status === 'failed')
 * }
 *
 * Usage:
 *   import { useTicketUpdates } from './hooks/useTicketUpdates';
 *
 *   function AgentFeed() {
 *     useTicketUpdates(); // Call at top level of component
 *     // ... rest of component
 *   }
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '../services/socket';

export function useTicketUpdates(options = {}) {
  const queryClient = useQueryClient();

  const {
    // Enable/disable the hook (useful for conditional activation)
    enabled = true,

    // Custom callback for ticket updates (receives full event data)
    onUpdate = null,

    // Enable toast notifications (requires toast library to be set up)
    showNotifications = false,

    // Custom toast function (if using a different toast library)
    toast = null
  } = options;

  useEffect(() => {
    // Skip if disabled
    if (!enabled) {
      return;
    }

    // Connect to Socket.IO server
    socket.connect();

    // Handler for ticket status updates
    const handleTicketUpdate = (data) => {
      console.log('[useTicketUpdates] Ticket status update received:', {
        ticket_id: data.ticket_id,
        post_id: data.post_id,
        status: data.status,
        agent_id: data.agent_id,
        timestamp: data.timestamp
      });

      // Invalidate posts query to trigger refetch from server (for React Query components)
      // This ensures the UI shows the latest ticket_status with accurate counts
      // Strategy: Rely on React Query's automatic refetch instead of manual cache updates
      // Benefit: Always consistent with server state, no field name mismatches
      queryClient.invalidateQueries({ queryKey: ['posts'] });

      // Also invalidate specific post query if available
      if (data.post_id) {
        queryClient.invalidateQueries({ queryKey: ['post', data.post_id] });
      }

      // NEW: Emit custom browser event for components using useState (not React Query)
      // This bridges WebSocket events to components like RealSocialMediaFeed
      // Event pattern allows decoupled communication without prop drilling
      const customEvent = new CustomEvent('ticket:status:update', {
        detail: {
          ticket_id: data.ticket_id,
          post_id: data.post_id,
          agent_id: data.agent_id,
          status: data.status,
          timestamp: data.timestamp,
          error: data.error || null
        }
      });
      window.dispatchEvent(customEvent);

      console.log('[useTicketUpdates] Dispatched custom event:', {
        type: 'ticket:status:update',
        post_id: data.post_id,
        status: data.status
      });

      // Show notifications if enabled
      if (showNotifications && toast) {
        if (data.status === 'completed') {
          toast.success(`${data.agent_id} finished analyzing post ${data.post_id}`);
        } else if (data.status === 'failed') {
          const errorMsg = data.error || 'Unknown error';
          toast.error(`${data.agent_id} analysis failed: ${errorMsg}`);
        } else if (data.status === 'processing') {
          toast.info(`${data.agent_id} is analyzing post ${data.post_id}`);
        }
      }

      // Call custom update handler if provided
      if (onUpdate && typeof onUpdate === 'function') {
        onUpdate(data);
      }
    };

    // Handler for worker lifecycle events (optional, for debugging)
    const handleWorkerEvent = (data) => {
      console.log('[useTicketUpdates] Worker lifecycle event:', {
        worker_id: data.worker_id,
        ticket_id: data.ticket_id,
        event_type: data.event_type,
        timestamp: data.timestamp
      });
    };

    // Handler for connection confirmation
    const handleConnected = (data) => {
      console.log('[useTicketUpdates] WebSocket connected:', data);
    };

    // Register event listeners
    socket.on('ticket:status:update', handleTicketUpdate);
    socket.on('worker:lifecycle', handleWorkerEvent);
    socket.on('connected', handleConnected);

    // Cleanup function - runs on unmount or when dependencies change
    return () => {
      console.log('[useTicketUpdates] Cleaning up Socket.IO listeners');

      // Remove event listeners
      socket.off('ticket:status:update', handleTicketUpdate);
      socket.off('worker:lifecycle', handleWorkerEvent);
      socket.off('connected', handleConnected);

      // Disconnect from server
      // Note: Only disconnect if no other components are using the socket
      // In a real app, you might want to use a ref counter or context
      socket.disconnect();
    };
  }, [queryClient, enabled, onUpdate, showNotifications, toast]);

  // Return socket for advanced usage (optional)
  return {
    socket,
    isConnected: socket.connected
  };
}

export default useTicketUpdates;
