/**
 * useTicketUpdates Hook - Usage Examples
 *
 * This file demonstrates various ways to use the useTicketUpdates hook
 * for real-time ticket status updates in your React components.
 */

import React from 'react';
import { useTicketUpdates } from './useTicketUpdates';
import { useToast } from './useToast';

// ============================================================================
// Example 1: Basic Usage - Simple Integration
// ============================================================================

export function AgentFeedBasic() {
  // Just call the hook at the top level - it handles everything automatically
  useTicketUpdates();

  return (
    <div>
      <h1>Agent Feed</h1>
      {/* Your feed content */}
    </div>
  );
}

// ============================================================================
// Example 2: With Toast Notifications
// ============================================================================

export function AgentFeedWithToasts() {
  const toast = useToast();

  // Enable notifications by passing toast handlers
  useTicketUpdates({
    showNotifications: true,
    toast: {
      success: (message) => toast.showSuccess(message),
      error: (message) => toast.showError(message),
      info: (message) => toast.showInfo(message)
    }
  });

  return (
    <div>
      <h1>Agent Feed</h1>
      {/* Your feed content */}
      {/* Toast notifications will appear automatically */}
    </div>
  );
}

// ============================================================================
// Example 3: With Custom Update Handler
// ============================================================================

export function AgentFeedWithCustomHandler() {
  const [lastUpdate, setLastUpdate] = React.useState(null);

  useTicketUpdates({
    onUpdate: (data) => {
      // Custom logic when a ticket updates
      console.log('Custom handler received update:', data);
      setLastUpdate(data);

      // You could also:
      // - Play a sound notification
      // - Update local state
      // - Trigger analytics events
      // - Send to error tracking service if failed
      if (data.status === 'failed') {
        console.error('Ticket failed:', data.ticket_id, data.error);
        // Send to error tracking service
      }
    }
  });

  return (
    <div>
      <h1>Agent Feed</h1>
      {lastUpdate && (
        <div className="last-update">
          Last update: {lastUpdate.agent_id} - {lastUpdate.status}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 4: Conditional Activation
// ============================================================================

export function AgentFeedConditional() {
  const [enableUpdates, setEnableUpdates] = React.useState(true);

  // Only connect when enabled is true
  const { isConnected } = useTicketUpdates({
    enabled: enableUpdates
  });

  return (
    <div>
      <h1>Agent Feed</h1>
      <div className="controls">
        <button onClick={() => setEnableUpdates(!enableUpdates)}>
          {enableUpdates ? 'Disable' : 'Enable'} Real-time Updates
        </button>
        <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Example 5: Full-Featured Integration (Recommended for Production)
// ============================================================================

export function AgentFeedProduction() {
  const toast = useToast();
  const [updateCount, setUpdateCount] = React.useState(0);

  const { isConnected } = useTicketUpdates({
    enabled: true,
    showNotifications: true,
    toast: {
      success: (message) => toast.showSuccess(message),
      error: (message) => toast.showError(message, 0), // Don't auto-dismiss errors
      info: (message) => toast.showInfo(message)
    },
    onUpdate: (data) => {
      // Track update count
      setUpdateCount(prev => prev + 1);

      // Log for debugging
      console.log('[AgentFeed] Update received:', {
        ticket_id: data.ticket_id,
        status: data.status,
        agent_id: data.agent_id
      });

      // Handle specific statuses
      if (data.status === 'completed') {
        // Trigger celebration animation or sound
        console.log('Analysis complete for post', data.post_id);
      } else if (data.status === 'failed') {
        // Send to error tracking
        console.error('Analysis failed:', data.error);
      }
    }
  });

  return (
    <div>
      <header>
        <h1>Agent Feed</h1>
        <div className="status-bar">
          <span>
            WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span>Updates received: {updateCount}</span>
        </div>
      </header>
      {/* Your feed content */}
    </div>
  );
}

// ============================================================================
// Example 6: Integration with Existing Components
// ============================================================================

/**
 * How to integrate into your main App.tsx or AgentFeed component:
 */

/*
import { useTicketUpdates } from './hooks/useTicketUpdates';
import { useToast } from './hooks/useToast';

function App() {
  const toast = useToast();

  // Add this at the top level of your main component
  useTicketUpdates({
    showNotifications: true,
    toast: {
      success: (msg) => toast.showSuccess(msg),
      error: (msg) => toast.showError(msg),
      info: (msg) => toast.showInfo(msg)
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        // ... your existing app structure
      </BrowserRouter>
    </QueryClientProvider>
  );
}
*/

// ============================================================================
// Event Data Structure Reference
// ============================================================================

/**
 * ticket:status:update event payload structure:
 *
 * {
 *   post_id: "post-123",           // The post being analyzed
 *   ticket_id: "ticket-456",       // Unique ticket identifier
 *   status: "completed",           // Status: pending | processing | completed | failed
 *   agent_id: "link-logger-agent", // Which agent is processing this
 *   timestamp: "2025-10-23T...",   // ISO timestamp
 *   error: "Error message"         // Only present when status === 'failed'
 * }
 */

// ============================================================================
// Advanced: Direct Socket Access
// ============================================================================

export function AgentFeedAdvanced() {
  const { socket, isConnected } = useTicketUpdates();

  // You can use the socket directly for advanced use cases
  React.useEffect(() => {
    if (!socket) return;

    // Subscribe to specific post updates
    const handleConnect = () => {
      console.log('Connected to WebSocket');
      // Subscribe to specific posts
      socket.emit('subscribe:post', 'post-123');
      socket.emit('subscribe:agent', 'link-logger-agent');
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
      // Unsubscribe on cleanup
      socket.emit('unsubscribe:post', 'post-123');
      socket.emit('unsubscribe:agent', 'link-logger-agent');
    };
  }, [socket]);

  return (
    <div>
      <h1>Agent Feed Advanced</h1>
      <div>Connection: {isConnected ? 'Active' : 'Inactive'}</div>
    </div>
  );
}
