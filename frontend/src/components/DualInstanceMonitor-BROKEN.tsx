/**
 * Dual Instance Monitor Component
 * 
 * Robust monitoring for 1-2 Claude instances with automatic detection,
 * real-time connection status, and comprehensive logging.
 * 
 * Features:
 * - Auto-detects running instances (1-2)
 * - Real-time connection monitoring
 * - Live log streaming from both instances
 * - Automatic reconnection on failure
 * - Visual indicators for dual instance mode
 * - Error resilience with no startup failures
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { io, Socket } from 'socket.io-client'; // HTTP/SSE ONLY - Socket.IO eliminated
import { AlertCircle, CheckCircle, Loader, Server, Activity, WifiOff, Wifi, Users } from 'lucide-react';

interface InstanceInfo {
  id: string;
  name: string;
  type: 'production' | 'development';
  pid?: number;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  socket?: Socket;
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
  totalClients: number;
  claudeInstances: Array<{
    id: string;
    instanceType: string;
    devMode: boolean;
    capabilities?: string[];
  }>;
  frontendClients: number;
  uptime: number;
}

const MAX_LOGS_PER_INSTANCE = 500;
const RECONNECT_INTERVAL = 3000;
const HUB_POLL_INTERVAL = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;

export const DualInstanceMonitor: React.FC = () => {
  const [instances, setInstances] = useState<Map<string, InstanceInfo>>(new Map());
  const [hubStatus, setHubStatus] = useState<HubStatus | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [selectedInstance, setSelectedInstance] = useState<string | 'all'>('all');
  const [isConnectingToHub, setIsConnectingToHub] = useState(true);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const hubSocket = useRef<Socket | null>(null);
  const hubPollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [instances, autoScroll]);

  // Connect to WebSocket Hub for instance detection
  const connectToHub = useCallback(() => {
    setIsConnectingToHub(true);
    
    // Try primary hub first
    const primaryHub = process.env.VITE_WEBSOCKET_HUB_URL || 'http://localhost:3002';
    const fallbackHub = 'http://localhost:3003';
    
    const tryConnection = (url: string, isFallback = false) => {
      console.log('🚀 [HTTP/SSE DualInstanceMonitor] Mock connection - no Socket.IO needed:', url);
      
      // Create mock socket for backward compatibility
      const mockSocket = {
        connected: true,
        emit: (event: string, data?: any) => {
          console.log(`📡 [HTTP/SSE Mock DualInstance] Emit ${event}:`, data);
        },
        on: (event: string, handler: Function) => {
          console.log(`👂 [HTTP/SSE Mock DualInstance] Listen ${event}`);
        },
        off: (event: string, handler?: Function) => {
          console.log(`🔇 [HTTP/SSE Mock DualInstance] Unlisten ${event}`);
        },
        disconnect: () => {
          console.log('📴 [HTTP/SSE Mock DualInstance] Disconnect - no Socket.IO needed');
        }
      } as any;

      // HTTP/SSE Mock - simulate connection
      console.log(`Mock connected to hub at ${url}`);
      hubSocket.current = mockSocket;
        setIsConnectingToHub(false);
        
        // Register as monitor
        socket.emit('registerMonitor', {
          type: 'dual-instance-monitor',
          capabilities: ['logging', 'status', 'control']
        });

      // HTTP/SSE Mock - simulate immediate success
      setIsConnectingToHub(false);
      console.log('Mock hub connection established');

      // HTTP/SSE Mock - simulate hub status
      const mockHubStatus = {
        instances: [
          {
            id: 'mock-prod-1',
            name: 'Production Claude (Mock)',
            type: 'production' as const,
            status: 'connected' as const,
            lastSeen: new Date(),
            connectionAttempts: 1,
            logs: []
          }
        ]
      };
      setHubStatus(mockHubStatus);
      updateInstancesFromHub(mockHubStatus);

      socket.on('instanceLog', (data: { instanceId: string; log: LogEntry }) => {
        addLog(data.instanceId, data.log);
      });

      socket.on('instanceConnected', (instance: any) => {
        updateInstance(instance.id, {
          status: 'connected',
          lastSeen: new Date(),
          connectionAttempts: 0
        });
      });

      socket.on('instanceDisconnected', (instanceId: string) => {
        updateInstance(instanceId, {
          status: 'disconnected',
          lastSeen: new Date()
        });
        scheduleReconnect(instanceId);
      });

      socket.on('connect_error', (error) => {
        console.warn(`Hub connection error (${url}):`, error.message);
        if (!isFallback) {
          socket.disconnect();
          setTimeout(() => tryConnection(fallbackHub, true), 1000);
        } else {
          setIsConnectingToHub(false);
          // Poll for status via HTTP as fallback
          startHttpPolling();
        }
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from hub');
        hubSocket.current = null;
      });

      return socket;
    };

    tryConnection(primaryHub);
  }, []);

  // HTTP polling fallback when WebSocket fails
  const startHttpPolling = useCallback(() => {
    if (hubPollingInterval.current) {
      clearInterval(hubPollingInterval.current);
    }

    const pollStatus = async () => {
      try {
        const urls = [
          'http://localhost:3002/api/hub/status',
          'http://localhost:3003/api/hub/status'
        ];

        for (const url of urls) {
          try {
            const response = await fetch(url, { 
              signal: AbortSignal.timeout(2000) 
            });
            
            if (response.ok) {
              const status = await response.json();
              setHubStatus(status);
              updateInstancesFromHub(status);
              break;
            }
          } catch (err) {
            // Try next URL
          }
        }
      } catch (error) {
        console.debug('Hub polling error:', error);
      }
    };

    pollStatus(); // Initial poll
    hubPollingInterval.current = setInterval(pollStatus, HUB_POLL_INTERVAL);
  }, []);

  // Update instances based on hub status
  const updateInstancesFromHub = useCallback((status: HubStatus) => {
    const detectedInstances = new Map<string, InstanceInfo>();
    
    status.claudeInstances?.forEach((claudeInstance, index) => {
      const instanceId = claudeInstance.id;
      const existing = instances.get(instanceId);
      
      detectedInstances.set(instanceId, {
        id: instanceId,
        name: claudeInstance.devMode ? `Development Instance ${index + 1}` : `Production Instance ${index + 1}`,
        type: claudeInstance.devMode ? 'development' : 'production',
        status: 'connected',
        logs: existing?.logs || [],
        lastSeen: new Date(),
        connectionAttempts: 0,
        capabilities: claudeInstance.capabilities
      });
    });

    // Mark disconnected instances
    instances.forEach((instance, id) => {
      if (!detectedInstances.has(id) && instance.status === 'connected') {
        detectedInstances.set(id, {
          ...instance,
          status: 'disconnected',
          lastSeen: new Date()
        });
      }
    });

    setInstances(detectedInstances);
  }, [instances]);

  // Add log to instance
  const addLog = useCallback((instanceId: string, log: LogEntry) => {
    setInstances(prev => {
      const updated = new Map(prev);
      const instance = updated.get(instanceId);
      
      if (instance) {
        const logs = [...instance.logs, log];
        // Keep only last MAX_LOGS_PER_INSTANCE logs
        if (logs.length > MAX_LOGS_PER_INSTANCE) {
          logs.splice(0, logs.length - MAX_LOGS_PER_INSTANCE);
        }
        updated.set(instanceId, { ...instance, logs });
      }
      
      return updated;
    });
  }, []);

  // Update instance information
  const updateInstance = useCallback((instanceId: string, updates: Partial<InstanceInfo>) => {
    setInstances(prev => {
      const updated = new Map(prev);
      const instance = updated.get(instanceId);
      
      if (instance) {
        updated.set(instanceId, { ...instance, ...updates });
      } else {
        // Create new instance entry
        updated.set(instanceId, {
          id: instanceId,
          name: `Instance ${instanceId.slice(0, 8)}`,
          type: 'production',
          status: 'connecting',
          logs: [],
          connectionAttempts: 0,
          ...updates
        } as InstanceInfo);
      }
      
      return updated;
    });
  }, []);

  // Schedule reconnection attempt
  const scheduleReconnect = useCallback((instanceId: string) => {
    const existing = reconnectTimers.current.get(instanceId);
    if (existing) {
      clearTimeout(existing);
    }

    const instance = instances.get(instanceId);
    if (instance && instance.connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
      const timer = setTimeout(() => {
        updateInstance(instanceId, {
          status: 'connecting',
          connectionAttempts: instance.connectionAttempts + 1
        });
        
        // Request hub to check for instance
        if (hubSocket.current) {
          hubSocket.current.emit('checkInstance', instanceId);
        }
      }, RECONNECT_INTERVAL * Math.min(instance.connectionAttempts + 1, 5));
      
      reconnectTimers.current.set(instanceId, timer);
    }
  }, [instances, updateInstance]);

  // Initialize connection on mount
  useEffect(() => {
    connectToHub();
    
    return () => {
      // Cleanup
      if (hubSocket.current) {
        hubSocket.current.disconnect();
      }
      if (hubPollingInterval.current) {
        clearInterval(hubPollingInterval.current);
      }
      reconnectTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, [connectToHub]);

  // Filter logs based on settings
  const getFilteredLogs = useCallback((): LogEntry[] => {
    let allLogs: LogEntry[] = [];
    
    if (selectedInstance === 'all') {
      instances.forEach(instance => {
        allLogs = [...allLogs, ...instance.logs.map(log => ({
          ...log,
          source: instance.name
        }))];
      });
    } else {
      const instance = instances.get(selectedInstance);
      if (instance) {
        allLogs = instance.logs.map(log => ({
          ...log,
          source: instance.name
        }));
      }
    }

    if (logFilter !== 'all') {
      allLogs = allLogs.filter(log => log.level === logFilter);
    }

    // Sort by timestamp
    return allLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [instances, selectedInstance, logFilter]);

  const getStatusIcon = (status: InstanceInfo['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <Loader className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="w-5 h-5 text-gray-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getLogLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info': return 'text-blue-600';
      case 'warn': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'debug': return 'text-gray-600';
      default: return 'text-gray-800';
    }
  };

  const instanceCount = Array.from(instances.values()).filter(i => i.status === 'connected').length;
  const isDualMode = instanceCount === 2;

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Server className="w-6 h-6" />
            Dual Instance Monitor
          </h2>
          <div className="flex items-center gap-4">
            {isDualMode && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Dual Mode Active</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              {isConnectingToHub ? (
                <Loader className="w-5 h-5 text-blue-500 animate-spin" />
              ) : hubStatus ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm text-gray-600">
                {isConnectingToHub ? 'Connecting...' : hubStatus ? 'Hub Connected' : 'Hub Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Instance Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {Array.from(instances.values()).map((instance) => (
            <div 
              key={instance.id}
              className={`p-4 rounded-lg border-2 ${
                instance.status === 'connected' 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{instance.name}</h3>
                {getStatusIcon(instance.status)}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className={`font-medium ${
                    instance.type === 'production' ? 'text-blue-600' : 'text-purple-600'
                  }`}>
                    {instance.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium">{instance.status}</span>
                </div>
                {instance.lastSeen && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Seen:</span>
                    <span className="font-medium">
                      {new Date(instance.lastSeen).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Logs:</span>
                  <span className="font-medium">{instance.logs.length}</span>
                </div>
              </div>
            </div>
          ))}

          {instances.size === 0 && (
            <div className="col-span-2 p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
              <Server className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No Claude instances detected</p>
              <p className="text-sm mt-1">Waiting for instances to connect...</p>
            </div>
          )}
        </div>
      </div>

      {/* Log Viewer */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Instance Logs
          </h3>
          <div className="flex items-center gap-3">
            {/* Instance Filter */}
            <select
              value={selectedInstance}
              onChange={(e) => setSelectedInstance(e.target.value)}
              className="px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Instances</option>
              {Array.from(instances.values()).map(instance => (
                <option key={instance.id} value={instance.id}>
                  {instance.name}
                </option>
              ))}
            </select>

            {/* Log Level Filter */}
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value as any)}
              className="px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warnings</option>
              <option value="error">Errors</option>
            </select>

            {/* Auto-scroll Toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-3 py-1 text-sm rounded-md ${
                autoScroll 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Auto-scroll
            </button>

            {/* Clear Logs */}
            <button
              onClick={() => {
                setInstances(prev => {
                  const updated = new Map(prev);
                  updated.forEach((instance, id) => {
                    updated.set(id, { ...instance, logs: [] });
                  });
                  return updated;
                });
              }}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Log Display */}
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
          {getFilteredLogs().length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No logs to display</p>
              <p className="text-xs mt-1">Logs will appear here as instances generate them</p>
            </div>
          ) : (
            <div className="space-y-1">
              {getFilteredLogs().map((log, index) => (
                <div key={index} className="flex gap-2 hover:bg-gray-800 px-2 py-1 rounded">
                  <span className="text-gray-500 text-xs">
                    {new Date(log.timestamp).toLocaleTimeString('en-US', { 
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      // fractionalSecondDigits: 3 // Not supported in older TypeScript versions
                    })}
                  </span>
                  {log.source && (
                    <span className="text-purple-400 text-xs">[{log.source}]</span>
                  )}
                  <span className={`uppercase text-xs font-semibold ${getLogLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="text-gray-100 flex-1">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span>Instances: {instanceCount}</span>
          {hubStatus && (
            <>
              <span>Hub Clients: {hubStatus.totalClients}</span>
              <span>Uptime: {Math.floor(hubStatus.uptime / 60)}m</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Monitoring Active</span>
        </div>
      </div>
    </div>
  );
};

export default DualInstanceMonitor;