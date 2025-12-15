import React, { useState, useEffect, useRef } from 'react';

interface TickerMessage {
  type: string;
  data: {
    tool?: string;
    action?: string;
    message?: string;
    timestamp: number;
    priority?: string;
  };
}

interface StreamingTickerProps {
  enabled?: boolean;
  userId?: string;
  maxMessages?: number;
  demo?: boolean;
}

const StreamingTickerWorking: React.FC<StreamingTickerProps> = ({
  enabled = true,
  userId = 'anonymous',
  maxMessages = 5,
  demo = false
}) => {
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Priority colors for different tools
  const getToolColor = (tool?: string) => {
    const colors = {
      thinking: '#3b82f6',  // blue
      read: '#10b981',      // green
      search: '#f59e0b',    // yellow
      write: '#f97316',     // orange
      edit: '#a855f7',      // purple
      bash: '#ef4444'       // red
    };
    return colors[tool as keyof typeof colors] || '#6b7280';
  };

  // Get priority emoji
  const getPriorityEmoji = (priority?: string) => {
    const emojis = {
      low: '💭',
      medium: '⚡',
      high: '🔥',
      critical: '⚠️'
    };
    return emojis[priority as keyof typeof emojis] || '📍';
  };

  // Format message for display
  const formatMessage = (msg: TickerMessage) => {
    if (msg.type === 'tool_activity' && msg.data.tool && msg.data.action) {
      return `${msg.data.tool}: ${msg.data.action}`;
    }
    if (msg.data.message) {
      return msg.data.message;
    }
    return `${msg.type}: ${JSON.stringify(msg.data)}`;
  };

  // Connect to streaming endpoint
  const connect = () => {
    if (!enabled || eventSourceRef.current) return;

    setConnectionStatus('connecting');

    const url = new URL('/api/streaming-ticker/stream', window.location.origin);
    url.searchParams.set('userId', userId);
    if (demo) {
      url.searchParams.set('demo', 'true');
    }

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      console.log('Streaming ticker connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const message: TickerMessage = JSON.parse(event.data);

        if (message.type === 'connection') {
          setConnectionId((message.data as any).connectionId as string);
        } else if (message.type === 'heartbeat') {
          // Silent heartbeat
        } else {
          // Add to message queue
          setMessages(prev => {
            const newMessages = [message, ...prev].slice(0, maxMessages);
            return newMessages;
          });
        }
      } catch (error) {
        console.error('Error parsing ticker message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Streaming ticker error:', error);
      setConnectionStatus('error');

      // Retry connection after delay
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          disconnect();
          setTimeout(connect, 2000);
        }
      }, 1000);
    };
  };

  // Disconnect from streaming
  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnectionStatus('disconnected');
    setConnectionId(null);
  };

  // Auto-connect on mount
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, userId, demo]);

  if (!enabled) {
    return null;
  }

  return (
    <div style={{ fontFamily: 'system-ui' }}>
      {/* Connection Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor:
            connectionStatus === 'connected' ? '#10b981' :
            connectionStatus === 'connecting' ? '#f59e0b' :
            connectionStatus === 'error' ? '#ef4444' : '#6b7280'
        }} />
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          {connectionStatus === 'connected' ? 'Live' :
           connectionStatus === 'connecting' ? 'Connecting...' :
           connectionStatus === 'error' ? 'Reconnecting...' :
           'Disconnected'}
        </span>
      </div>

      {/* Messages */}
      <div style={{ minHeight: '120px', maxHeight: '200px', overflow: 'hidden' }}>
        {messages.map((message, index) => (
          <div
            key={`${message.data.timestamp}-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              marginBottom: '4px',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '6px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              animation: 'fadeIn 0.3s ease-in'
            }}
          >
            <span style={{ fontSize: '14px' }}>
              {getPriorityEmoji(message.data.priority)}
            </span>
            <span style={{
              fontSize: '14px',
              fontFamily: 'monospace',
              color: getToolColor(message.data.tool),
              fontWeight: '500'
            }}>
              {formatMessage(message)}
            </span>
            <span style={{
              fontSize: '11px',
              color: '#6b7280',
              marginLeft: 'auto'
            }}>
              {new Date(message.data.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}

        {/* Empty state */}
        {messages.length === 0 && connectionStatus === 'connected' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '80px',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            <div style={{ opacity: 0.7 }}>
              Waiting for Claude activity...
            </div>
          </div>
        )}
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && connectionId && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#9ca3af' }}>
          Connection: {connectionId.substring(0, 8)}...
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default StreamingTickerWorking;