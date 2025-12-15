import { useState, useEffect, useRef, useCallback } from 'react';

interface SSEEvent {
  type: string;
  data: any;
  timestamp: string;
}

interface UseSSEOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface ConnectionHealth {
  connected: boolean;
  lastHeartbeat: number | null;
  connectionTime: number | null;
  uptime: number;
  reconnectAttempts: number;
}

interface UseSSEReturn {
  connected: boolean;
  events: SSEEvent[];
  error: string | null;
  reconnect: () => void;
  clearEvents: () => void;
  connectionHealth: ConnectionHealth;
}

export function useSSE(
  url: string,
  options: UseSSEOptions = {}
): UseSSEReturn {
  const {
    reconnect: shouldReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    connected: false,
    lastHeartbeat: null,
    connectionTime: null,
    uptime: 0,
    reconnectAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const connectionTimeRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new SSE connection
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!mountedRef.current) return;
        console.log('SSE connection opened:', url);
        connectionTimeRef.current = Date.now();
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        setConnectionHealth({
          connected: true,
          lastHeartbeat: null,
          connectionTime: connectionTimeRef.current,
          uptime: 0,
          reconnectAttempts: reconnectAttemptsRef.current,
        });
      };

      eventSource.onerror = (e) => {
        if (!mountedRef.current) return;
        console.error('SSE connection error:', e);
        setConnected(false);

        const errorMessage = 'Connection lost. Reconnecting...';
        setError(errorMessage);

        setConnectionHealth(prev => ({
          ...prev,
          connected: false,
          reconnectAttempts: reconnectAttemptsRef.current,
        }));

        // Attempt reconnection
        if (shouldReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Max reconnection attempts reached. Please refresh the page.');
        }
      };

      eventSource.onmessage = (e) => {
        if (!mountedRef.current) return;

        try {
          const parsedData = JSON.parse(e.data);
          const event: SSEEvent = {
            type: parsedData.type || 'message',
            data: parsedData.data || parsedData,
            timestamp: parsedData.timestamp || new Date().toISOString(),
          };

          setEvents((prev) => [event, ...prev].slice(0, 100)); // Keep last 100 events
        } catch (parseError) {
          console.error('Error parsing SSE message:', parseError);
        }
      };

      // Listen for specific event types
      const eventTypes = [
        'heartbeat',
        'connection',
        'tool_execution',
        'tool_activity',
        'agent_spawn',
        'agent_action',
        'prompt_sent',
        'session_metrics',
        'execution_start',
        'execution_complete',
        'custom',
        'progress',
      ];

      eventTypes.forEach((eventType) => {
        eventSource.addEventListener(eventType, (e: any) => {
          if (!mountedRef.current) return;

          try {
            const parsedData = JSON.parse(e.data);

            // Handle heartbeat separately for connection health monitoring
            if (eventType === 'heartbeat') {
              const now = Date.now();
              setConnectionHealth(prev => ({
                ...prev,
                lastHeartbeat: now,
                uptime: parsedData.uptime || (connectionTimeRef.current ? now - connectionTimeRef.current : 0),
              }));

              console.debug('SSE heartbeat received:', parsedData);
              // Don't add heartbeat to events list to avoid clutter
              return;
            }

            const event: SSEEvent = {
              type: eventType,
              data: parsedData,
              timestamp: parsedData.timestamp || new Date().toISOString(),
            };

            setEvents((prev) => [event, ...prev].slice(0, 100));
          } catch (parseError) {
            console.error(`Error parsing ${eventType} event:`, parseError);
          }
        });
      });

    } catch (err) {
      console.error('Failed to create SSE connection:', err);
      setError('Failed to establish connection');
      setConnected(false);
    }
  }, [url, shouldReconnect, reconnectInterval, maxReconnectAttempts]);

  const reconnectManually = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setError(null);
    connect();
  }, [connect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return {
    connected,
    events,
    error,
    reconnect: reconnectManually,
    clearEvents,
    connectionHealth,
  };
}
