import { useState, useEffect, useRef } from 'react';

/**
 * Hook: useActivityStream
 *
 * Subscribes to real-time Claude activity via SSE endpoint.
 * Returns current high-priority activity text for inline display.
 *
 * @param enabled - Whether to subscribe to activity stream
 * @returns {currentActivity, connectionStatus}
 */

interface ActivityMessage {
  type: string;
  data: {
    tool?: string;
    action?: string;
    message?: string;
    timestamp: number;
    priority?: string;
  };
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseActivityStreamResult {
  currentActivity: string | null;
  connectionStatus: ConnectionStatus;
}

const MAX_ACTIVITY_LENGTH = 80;

/**
 * Format activity text according to spec:
 * - Tool execution: "ToolName(action)"
 * - Task spawning: "Task(description)"
 * - Phase descriptions: "Phase X: description"
 * - Truncate to 80 chars with ellipsis
 */
const formatActivity = (msg: ActivityMessage): string | null => {
  // Only process HIGH priority messages
  if (msg.data.priority !== 'high') {
    return null;
  }

  let activityText = '';

  if (msg.type === 'tool_activity' && msg.data.tool && msg.data.action) {
    // Format: "ToolName(action)"
    activityText = `${msg.data.tool}(${msg.data.action})`;
  } else if (msg.data.message) {
    // Use raw message for phase descriptions, task spawns, etc.
    activityText = msg.data.message;
  } else {
    return null;
  }

  // Truncate to MAX_ACTIVITY_LENGTH
  if (activityText.length > MAX_ACTIVITY_LENGTH) {
    return activityText.substring(0, MAX_ACTIVITY_LENGTH - 3) + '...';
  }

  return activityText;
};

export const useActivityStream = (enabled: boolean): UseActivityStreamResult => {
  const [currentActivity, setCurrentActivity] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Cleanup and reset when disabled
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnectionStatus('disconnected');
      setCurrentActivity(null);
      return;
    }

    // Connect to SSE endpoint
    const connect = () => {
      setConnectionStatus('connecting');

      const url = new URL('/api/streaming-ticker/stream', window.location.origin);
      url.searchParams.set('userId', 'avi-dm-user');

      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionStatus('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const message: ActivityMessage = JSON.parse(event.data);

          // Ignore heartbeats and connection messages
          if (message.type === 'heartbeat' || message.type === 'connection') {
            return;
          }

          // Format and update activity if high priority
          const formattedActivity = formatActivity(message);
          if (formattedActivity) {
            setCurrentActivity(formattedActivity);
          }
        } catch (error) {
          console.error('Error parsing activity message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Activity stream error:', error);
        setConnectionStatus('error');

        // Auto-reconnect after delay
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            setTimeout(connect, 2000);
          }
        }, 1000);
      };
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [enabled]);

  return { currentActivity, connectionStatus };
};
