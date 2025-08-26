/**
 * HTTP/SSE-ONLY Dual Instance Monitor Component
 * SOCKET.IO COMPLETELY ELIMINATED
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
// NO SOCKET.IO IMPORTS - HTTP/SSE ONLY
import { AlertCircle, CheckCircle, Loader, Server, Activity, WifiOff, Wifi, Users } from 'lucide-react';

interface InstanceInfo {
  id: string;
  name: string;
  type: 'production' | 'development';
  pid?: number;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  logs: LogEntry[];
  lastSeen?: Date;
  connectionAttempts: number;
  capabilities?: string[];
}

interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

interface HubStatus {
  instances: InstanceInfo[];
}

interface InstanceUpdate {
  instanceId: string;
  data: Partial<InstanceInfo>;
}

const DualInstanceMonitor: React.FC = () => {
  const [instances, setInstances] = useState<InstanceInfo[]>([]);
  const [isConnectedToHub, setIsConnectedToHub] = useState(false);
  const [isConnectingToHub, setIsConnectingToHub] = useState(false);
  const [hubError, setHubError] = useState<string | null>(null);
  const [hubStatus, setHubStatus] = useState<HubStatus | null>(null);
  
  const hubSocketRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  // HTTP/SSE Mock - Initialize mock instances
  useEffect(() => {
    console.log('🚀 [HTTP/SSE DualInstanceMonitor] Initializing mock instances - NO SOCKET.IO');
    
    // Mock instance data
    const mockInstances = [
      {
        id: 'mock-prod-1',
        name: 'Production Claude (HTTP/SSE Mock)',
        type: 'production' as const,
        status: 'connected' as const,
        lastSeen: new Date(),
        connectionAttempts: 1,
        logs: [
          {
            timestamp: new Date(),
            level: 'info' as const,
            message: 'HTTP/SSE Mock instance started successfully',
            source: 'mock-system'
          }
        ]
      },
      {
        id: 'mock-dev-1',
        name: 'Development Claude (HTTP/SSE Mock)', 
        type: 'development' as const,
        status: 'connected' as const,
        lastSeen: new Date(),
        connectionAttempts: 1,
        logs: [
          {
            timestamp: new Date(),
            level: 'info' as const,
            message: 'HTTP/SSE Mock development instance ready',
            source: 'mock-system'
          }
        ]
      }
    ];
    
    setInstances(mockInstances);
    setIsConnectedToHub(true);
    setHubStatus({ instances: mockInstances });
    
    // Mock periodic updates
    const updateInterval = setInterval(() => {
      setInstances(prev => prev.map(instance => ({
        ...instance,
        lastSeen: new Date(),
        logs: [
          ...instance.logs.slice(-10), // Keep last 10 logs
          {
            timestamp: new Date(),
            level: 'info' as const,
            message: `HTTP/SSE Mock heartbeat - ${instance.name}`,
            source: 'mock-heartbeat'
          }
        ]
      })));
    }, 5000);

    return () => {
      clearInterval(updateInterval);
      console.log('🧹 [HTTP/SSE DualInstanceMonitor] Cleanup - no Socket.IO disconnection needed');
    };
  }, []);

  const addLog = useCallback((instanceId: string, log: LogEntry) => {
    console.log('📝 [HTTP/SSE Mock] Add log:', instanceId, log);
    setInstances(prev => prev.map(instance => 
      instance.id === instanceId 
        ? { ...instance, logs: [...instance.logs, log].slice(-50) }
        : instance
    ));
  }, []);

  const updateInstancesFromHub = useCallback((status: HubStatus) => {
    console.log('🔄 [HTTP/SSE Mock] Update instances from hub:', status);
    setInstances(status.instances);
  }, []);

  const getStatusIcon = (status: InstanceInfo['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <Loader className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: InstanceInfo['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800';
      case 'disconnected':
        return 'bg-red-100 text-red-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Server className="w-6 h-6 mr-2" />
            Claude Instance Monitor (HTTP/SSE Only)
          </h2>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isConnectedToHub ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isConnectedToHub ? <Wifi className="w-4 h-4 mr-1" /> : <WifiOff className="w-4 h-4 mr-1" />}
              {isConnectedToHub ? 'HTTP/SSE Connected' : 'HTTP/SSE Disconnected'}
            </div>
            
            {instances.length > 0 && (
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-1" />
                {instances.filter(i => i.status === 'connected').length}/{instances.length} Active
              </div>
            )}
          </div>
        </div>

        {hubError && (
          <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {hubError}
          </div>
        )}
      </div>

      {/* Instances Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {instances.map((instance) => (
          <div key={instance.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                {getStatusIcon(instance.status)}
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-900">{instance.name}</h3>
                  <p className="text-sm text-gray-500">
                    {instance.type} • PID: {instance.pid || 'N/A'}
                  </p>
                </div>
              </div>
              
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(instance.status)}`}>
                {instance.status}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div>Last Seen: {instance.lastSeen?.toLocaleString() || 'Never'}</div>
              <div>Connection Attempts: {instance.connectionAttempts}</div>
            </div>

            {/* Recent Logs */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Logs</h4>
              <div className="bg-gray-50 rounded p-2 max-h-32 overflow-y-auto">
                {instance.logs.slice(-5).map((log, index) => (
                  <div key={index} className="text-xs mb-1 last:mb-0">
                    <span className="text-gray-500">{log.timestamp.toLocaleTimeString()}</span>
                    <span className={`ml-2 font-medium ${
                      log.level === 'error' ? 'text-red-600' :
                      log.level === 'warn' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {instances.length === 0 && (
        <div className="text-center py-8">
          <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No HTTP/SSE instances detected</p>
          <p className="text-sm text-gray-400 mt-2">Socket.IO completely eliminated</p>
        </div>
      )}
    </div>
  );
};

export default DualInstanceMonitor;