import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TickerMessage {
  type: string;
  data: {
    tool?: string;
    action?: string;
    message?: string;
    timestamp: number;
    priority?: string;
    connectionId?: string;
  };
}

interface StreamingTickerProps {
  enabled?: boolean;
  userId?: string;
  className?: string;
  maxMessages?: number;
  demo?: boolean;
}

const StreamingTicker: React.FC<StreamingTickerProps> = ({
  enabled = true,
  userId = 'anonymous',
  className = '',
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
      thinking: 'text-blue-400',
      read: 'text-green-400',
      search: 'text-yellow-400',
      write: 'text-orange-400',
      edit: 'text-purple-400',
      bash: 'text-red-400'
    };
    return colors[tool as keyof typeof colors] || 'text-gray-400';
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

    // Use relative URL for Vite proxy compatibility
    let url = '/api/streaming-ticker/stream';
    const params = new URLSearchParams();
    params.set('userId', userId);
    if (demo) {
      params.set('demo', 'true');
    }

    // Append query parameters if any
    const queryString = params.toString();
    if (queryString) {
      url += '?' + queryString;
    }

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      console.log('Streaming ticker connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const message: TickerMessage = JSON.parse(event.data);

        // Handle different message types
        if (message.type === 'connection') {
          setConnectionId(message.data.connectionId as string);
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

  // Auto-connect on mount and when enabled changes
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

  // Message animation variants
  const messageVariants = {
    initial: {
      opacity: 0,
      x: -20,
      scale: 0.9
    },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 300
      }
    },
    exit: {
      opacity: 0,
      x: 20,
      scale: 0.9,
      transition: { duration: 0.2 }
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className={`streaming-ticker ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-400' :
          connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
          connectionStatus === 'error' ? 'bg-red-400' :
          'bg-gray-400'
        }`} />
        <span className="text-xs text-gray-500">
          {connectionStatus === 'connected' ? 'Live' :
           connectionStatus === 'connecting' ? 'Connecting...' :
           connectionStatus === 'error' ? 'Reconnecting...' :
           'Disconnected'}
        </span>
      </div>

      {/* Messages */}
      <div className="space-y-1 min-h-[120px] max-h-[200px] overflow-hidden">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={`${message.data.timestamp}-${index}`}
              variants={messageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 border border-gray-700/50"
            >
              <span className="text-sm">
                {getPriorityEmoji(message.data.priority)}
              </span>
              <span className={`text-sm font-mono ${getToolColor(message.data.tool)}`}>
                {formatMessage(message)}
              </span>
              <span className="text-xs text-gray-500 ml-auto">
                {new Date(message.data.timestamp).toLocaleTimeString()}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {messages.length === 0 && connectionStatus === 'connected' && (
          <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Waiting for Claude activity...
            </motion.div>
          </div>
        )}
      </div>

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-600">
          Connection: {connectionId?.substring(0, 8)}...
        </div>
      )}
    </div>
  );
};

export default StreamingTicker;