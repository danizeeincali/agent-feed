/**
 * useActivityStream Hook
 * Subscribes to SSE endpoint for real-time activity updates
 * Filters for high-priority activities only
 */

import { useState, useEffect } from 'react';

interface ActivityStreamResult {
  currentActivity: string | null;
  connectionStatus: 'disconnected' | 'connected' | 'error';
}

interface ActivityMessage {
  type: string;
  data?: {
    priority?: string;
    tool?: string;
    action?: string;
    message?: string;
  };
}

const HIGH_PRIORITY_TOOLS = ['Task', 'Bash', 'Read', 'Write', 'Edit', 'Agent'];

/**
 * Determines if a message is high priority based on:
 * - priority === 'high'
 * - tool in HIGH_PRIORITY_TOOLS
 * - message starts with 'Phase'
 */
function isHighPriority(message: ActivityMessage): boolean {
  if (!message.data) return false;

  // Check explicit high priority
  if (message.data.priority === 'high') return true;

  // Check if tool is in high-priority list
  if (message.data.tool && HIGH_PRIORITY_TOOLS.includes(message.data.tool)) {
    return true;
  }

  // Check if message starts with 'Phase'
  if (message.data.message && message.data.message.startsWith('Phase')) {
    return true;
  }

  return false;
}

/**
 * Formats activity text from message data
 * Priority: tool(action) > message
 */
function formatActivity(data?: ActivityMessage['data']): string {
  if (!data) return '';

  // Prefer tool(action) format
  if (data.tool && data.action) {
    return `${data.tool}(${data.action})`;
  }

  // Fallback to message
  if (data.message) {
    return data.message;
  }

  return '';
}

/**
 * Custom hook for subscribing to activity stream via SSE
 *
 * @param enabled - Whether to connect to the stream
 * @param userId - User ID for the stream connection (default: 'avi-chat')
 * @returns Current activity and connection status
 */
export function useActivityStream(
  enabled: boolean,
  userId: string = 'avi-chat'
): ActivityStreamResult {
  const [currentActivity, setCurrentActivity] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');

  useEffect(() => {
    if (!enabled) {
      setCurrentActivity(null);
      setConnectionStatus('disconnected');
      return;
    }

    const url = `/api/streaming-ticker/stream?userId=${userId}`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setConnectionStatus('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const message: ActivityMessage = JSON.parse(event.data);

        if (isHighPriority(message)) {
          const activity = formatActivity(message.data);
          if (activity) {
            setCurrentActivity(activity);
          }
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('error');
    };

    return () => {
      eventSource.close();
      setConnectionStatus('disconnected');
      setCurrentActivity(null);
    };
  }, [enabled, userId]);

  return { currentActivity, connectionStatus };
}
