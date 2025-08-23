import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface ConnectionTest {
  url: string;
  name: string;
  status: 'testing' | 'connected' | 'failed' | 'timeout';
  socketId?: string;
  error?: string;
  responseTime?: number;
}

export const WebSocketDebugPanel: React.FC = () => {
  const [tests, setTests] = useState<ConnectionTest[]>([
    { url: 'http://localhost:3002', name: 'WebSocket Hub (Primary)', status: 'testing' },
    { url: 'http://localhost:3003', name: 'Robust WebSocket Server', status: 'testing' },
    { url: import.meta.env.VITE_WEBSOCKET_HUB_URL || 'http://localhost:3002', name: 'Environment URL', status: 'testing' }
  ]);
  const [isTestingActive, setIsTestingActive] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'unknown' | 'healthy' | 'degraded' | 'unhealthy'>('unknown');

  const testConnection = async (test: ConnectionTest): Promise<ConnectionTest> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let hasResolved = false;

      const socket: Socket = io(test.url, {
        timeout: 5000,
        transports: ['websocket', 'polling'],
        forceNew: true
      });

      const resolveOnce = (result: ConnectionTest) => {
        if (!hasResolved) {
          hasResolved = true;
          socket.disconnect();
          resolve(result);
        }
      };

      socket.on('connect', () => {
        const responseTime = Date.now() - startTime;
        
        // Register as frontend
        socket.emit('registerFrontend', {
          type: 'frontend',
          userAgent: navigator.userAgent,
          debugMode: true,
          timestamp: new Date().toISOString()
        });

        resolveOnce({
          ...test,
          status: 'connected',
          socketId: socket.id,
          responseTime
        });
      });

      socket.on('connect_error', (error) => {
        resolveOnce({
          ...test,
          status: 'failed',
          error: error.message,
          responseTime: Date.now() - startTime
        });
      });

      // Timeout handler
      setTimeout(() => {
        resolveOnce({
          ...test,
          status: 'timeout',
          error: 'Connection timeout after 5 seconds',
          responseTime: Date.now() - startTime
        });
      }, 5000);
    });
  };

  const runAllTests = async () => {
    setIsTestingActive(true);
    console.log('🧪 WebSocket Debug Panel: Running connection tests...');

    const results: ConnectionTest[] = [];
    
    for (const test of tests) {
      setTests(prev => prev.map(t => 
        t.url === test.url ? { ...t, status: 'testing' } : t
      ));

      const result = await testConnection(test);
      results.push(result);
      
      setTests(prev => prev.map(t => 
        t.url === test.url ? result : t
      ));
    }

    // Determine overall status
    const connectedCount = results.filter(r => r.status === 'connected').length;
    const totalCount = results.length;
    
    if (connectedCount === 0) {
      setOverallStatus('unhealthy');
    } else if (connectedCount < totalCount / 2) {
      setOverallStatus('degraded');
    } else {
      setOverallStatus('healthy');
    }

    setIsTestingActive(false);
    console.log('✅ WebSocket Debug Panel: Tests completed', results);
  };

  useEffect(() => {
    // Auto-run tests on mount
    runAllTests();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'timeout': return 'text-yellow-600';
      case 'testing': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return '✅';
      case 'failed': return '❌';
      case 'timeout': return '⏰';
      case 'testing': return '🔄';
      default: return '❓';
    }
  };

  const getOverallStatusColor = () => {
    switch (overallStatus) {
      case 'healthy': return 'border-green-500 bg-green-50';
      case 'degraded': return 'border-yellow-500 bg-yellow-50';
      case 'unhealthy': return 'border-red-500 bg-red-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${getOverallStatusColor()}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Status: <span className="uppercase">{overallStatus}</span>
          </span>
        </div>
        <button
          onClick={runAllTests}
          disabled={isTestingActive}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          {isTestingActive ? '🔄 Testing...' : '🧪 Retest'}
        </button>
      </div>

      <div className="space-y-2">
        {tests.map((test, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center gap-3">
              <span className="text-lg">{getStatusIcon(test.status)}</span>
              <div>
                <div className="font-medium">{test.name}</div>
                <div className="text-sm text-gray-600">{test.url}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-medium capitalize ${getStatusColor(test.status)}`}>
                {test.status}
              </div>
              {test.socketId && (
                <div className="text-xs text-gray-500">ID: {test.socketId}</div>
              )}
              {test.responseTime && (
                <div className="text-xs text-gray-500">{test.responseTime}ms</div>
              )}
              {test.error && (
                <div className="text-xs text-red-500 max-w-xs truncate">{test.error}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-white rounded border">
        <h4 className="font-medium mb-2">📊 Quick Actions</h4>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => window.open('http://localhost:3002/health', '_blank')}
            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            📊 Hub Health
          </button>
          <button
            onClick={() => {
              console.log('Environment Variables:', {
                VITE_WEBSOCKET_HUB_URL: import.meta.env.VITE_WEBSOCKET_HUB_URL,
                VITE_DEV_MODE: import.meta.env.VITE_DEV_MODE,
                VITE_DEBUG_WEBSOCKET: import.meta.env.VITE_DEBUG_WEBSOCKET
              });
            }}
            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            🔧 Show Config
          </button>
          <button
            onClick={() => {
              if (typeof (window as any).testWebSocket === 'function') {
                (window as any).testWebSocket();
              } else {
                console.log('💡 Manual test: io("http://localhost:3002").emit("registerFrontend", {type: "frontend"})');
              }
            }}
            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            🧪 Manual Test
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebSocketDebugPanel;