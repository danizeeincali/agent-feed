import { useState, useEffect, useRef } from 'react';

interface DualInstanceData {
  activities: Array<{
    id: string;
    agentName: string;
    instance: 'development' | 'production';
    type: string;
    description: string;
    timestamp: Date;
    metadata?: any;
  }>;
  handoffs: Array<{
    id: string;
    fromInstance: 'development' | 'production';
    toInstance: 'development' | 'production';
    type: string;
    status: string;
    description: string;
    timestamp: Date;
  }>;
}

interface WebSocketMessage {
  type: 'connection' | 'update' | 'error';
  data: any;
}

export const useDualInstanceWebSocket = () => {
  const [data, setData] = useState<DualInstanceData>({
    activities: [],
    handoffs: []
  });
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/dual-instance`;
      
      wsRef.current = new WebSocket(wsUrl);
      setConnectionStatus('connecting');
      setError(null);

      wsRef.current.onopen = () => {
        console.log('Dual instance WebSocket connected');
        setConnectionStatus('connected');
        setError(null);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connection':
              console.log('WebSocket connection confirmed:', message.data);
              break;
              
            case 'update':
              setData(prevData => ({
                activities: message.data.activities || prevData.activities,
                handoffs: message.data.handoffs || prevData.handoffs
              }));
              break;
              
            case 'error':
              setError(message.data.message || 'WebSocket error occurred');
              break;
              
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          setError('Failed to parse WebSocket message');
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Dual instance WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 5 seconds if not manually closed
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connect();
          }, 5000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Dual instance WebSocket error:', error);
        setError('WebSocket connection error');
        setConnectionStatus('disconnected');
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to create WebSocket connection');
      setConnectionStatus('disconnected');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setConnectionStatus('disconnected');
  };

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  };

  // Fetch initial data via HTTP
  const fetchInitialData = async () => {
    try {
      const [activitiesRes, handoffsRes] = await Promise.all([
        fetch('/api/dual-instance/activities?limit=20'),
        fetch('/api/dual-instance/handoff/status')
      ]);

      if (activitiesRes.ok && handoffsRes.ok) {
        const activitiesData = await activitiesRes.json();
        const handoffsData = await handoffsRes.json();

        setData({
          activities: activitiesData.activities || [],
          handoffs: handoffsData.handoffs || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
      setError('Failed to fetch initial data');
    }
  };

  useEffect(() => {
    // Fetch initial data
    fetchInitialData();
    
    // Connect WebSocket
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []);

  // Retry connection if needed
  const retry = () => {
    disconnect();
    setTimeout(connect, 1000);
  };

  return {
    data,
    connectionStatus,
    error,
    retry,
    sendMessage,
    isConnected: connectionStatus === 'connected'
  };
};