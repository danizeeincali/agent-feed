import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { nldCapture } from '../utils/nld-ui-capture';
import { ClaudeInstanceButtons, ChatInterface } from './claude-manager';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface ClaudeInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: Date;
}

interface ClaudeInstanceManagerModernProps {
  apiUrl?: string;
}

const ClaudeInstanceManagerModern: React.FC<ClaudeInstanceManagerModernProps> = ({ 
  apiUrl = 'http://localhost:3000'  // SPARC ARCHITECTURE: HTTP API port - WebSocket uses 3002
}) => {
  const [instances, setInstances] = useState<ClaudeInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [output, setOutput] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<string>('Disconnected');
  const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(null);
  
  // WebSocket state management
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsConnectionError = null;
  const eventHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  
  // SSE status stream management
  const [statusEventSource, setStatusEventSource] = useState<EventSource | null>(null);
  const [isStatusConnected, setIsStatusConnected] = useState(false);
  
  // Legacy compatibility for existing code
  const socketCompat = { connected: isConnected };
  const connectionError = wsConnectionError;

  // Setup event handlers, fetch instances, and establish SSE connection
  useEffect(() => {
    fetchInstances();
    setupEventHandlers();
    connectToStatusStream();
    
    return () => {
      cleanupEventHandlers();
      disconnectStatusStream();
    };
  }, []);

  // WebSocket event handler management
  const addHandler = (event: string, handler: (data: any) => void) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(handler);
  };

  const removeHandler = (event: string, handler?: (data: any) => void) => {
    if (handler) {
      eventHandlersRef.current.get(event)?.delete(handler);
    } else {
      eventHandlersRef.current.delete(event);
    }
  };

  const triggerHandlers = (event: string, data: any) => {
    const handlers = eventHandlersRef.current.get(event);
    handlers?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Handler error for event ${event}:`, error);
      }
    });
  };

  const setupEventHandlers = () => {
    // Handle connection events
    addHandler('connect', (data) => {
      console.log('✅ WebSocket Connected:', data);
      setError(null);
      setCurrentInstanceId(data.terminalId || null);
      setConnectionType(data.connectionType === 'websocket' ? `Connected via WebSocket${data.terminalId ? ` (${data.terminalId.slice(0,8)})` : ''}` : 
                      'Connected via WebSocket');
    });
    
    // Handle ALL terminal output (the parser will handle Claude vs system content)
    addHandler('terminal:output', (data) => {
      if (data.output && data.terminalId) {
        console.log(`📺 Terminal output for ${data.terminalId.slice(0,8)}:`, data.output.slice(0, 100));
        
        setOutput(prev => ({
          ...prev,
          [data.terminalId]: (prev[data.terminalId] || '') + data.output
        }));
      }
    });
    
    // Handle alternative message format
    addHandler('message', (data) => {
      if ((data.type === 'output' || data.type === 'terminal_output') && data.terminalId) {
        const output = data.output || data.data;
        if (output) {
          console.log(`📺 Message output for ${data.terminalId.slice(0,8)}:`, output.slice(0, 100));
          
          setOutput(prev => ({
            ...prev,
            [data.terminalId]: (prev[data.terminalId] || '') + output
          }));
        }
      }
    });
    
    // Handle instance status updates
    addHandler('terminal:status', (data) => {
      console.log('📲 Terminal status update received:', data);
      
      setInstances(prev => prev.map(instance => 
        instance.id === data.terminalId 
          ? { ...instance, status: data.status as ClaudeInstance['status'] }
          : instance
      ));
      
      if (data.instanceId === selectedInstance) {
        const timestamp = new Date().toLocaleTimeString();
        const statusMessage = `[${timestamp}] Status changed to: ${data.status}\n`;
        setOutput(prev => ({
          ...prev,
          [data.instanceId]: (prev[data.instanceId] || '') + statusMessage
        }));
      }
    });
    
    // Handle connection errors
    addHandler('error', (error) => {
      console.error('WebSocket Connection error:', error);
      setError(error.message || error.error || 'Connection error');
      setConnectionType('Connection Error');
    });
    
    // Handle disconnection
    addHandler('disconnect', (data) => {
      console.log('🔌 WebSocket Disconnected:', data);
      setConnectionType('Disconnected');
      if (data.instanceId === selectedInstance) {
        setCurrentInstanceId(null);
      }
    });
  };

  const cleanupEventHandlers = () => {
    eventHandlersRef.current.clear();
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  };

  // SSE Status Stream Management
  const connectToStatusStream = () => {
    console.log('🔗 Connecting to SSE status stream...');
    
    // Close existing connection if any
    if (statusEventSource) {
      statusEventSource.close();
    }
    
    try {
      // Connect to the SSE status endpoint that backend provides
      const eventSource = new EventSource(`${apiUrl}/api/status/stream`);
      
      eventSource.onopen = () => {
        console.log('✅ SSE Status stream connected');
        setIsStatusConnected(true);
        setError(null);
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 SSE Status message received:', data.type, data);
          
          // Handle status updates for instances
          if (data.type === 'instance:status') {
            console.log(`📲 Status update for ${data.instanceId}: ${data.status}`);
            
            // Update instances state with new status
            setInstances(prev => prev.map(instance => 
              instance.id === data.instanceId 
                ? { ...instance, status: data.status as ClaudeInstance['status'] }
                : instance
            ));
            
            // Also trigger existing event handlers for compatibility
            triggerHandlers('terminal:status', {
              terminalId: data.instanceId,
              status: data.status,
              timestamp: data.timestamp
            });
          }
          
          // Handle connection confirmations
          if (data.type === 'connected') {
            console.log('✅ SSE Status stream connection confirmed');
          }
          
        } catch (parseError) {
          console.error('❌ SSE Status message parsing error:', parseError);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('❌ SSE Status stream error:', error);
        setIsStatusConnected(false);
        
        // Only attempt to reconnect if the connection was previously established
        if (eventSource.readyState === EventSource.CLOSED || eventSource.readyState === EventSource.CONNECTING) {
          setTimeout(() => {
            console.log('🔄 Attempting to reconnect SSE status stream...');
            connectToStatusStream();
          }, 2000);
        }
      };
      
      setStatusEventSource(eventSource);
      
    } catch (error) {
      console.error('❌ Failed to create SSE status connection:', error);
      setError('Failed to connect to status stream');
    }
  };
  
  const disconnectStatusStream = () => {
    console.log('🔌 Disconnecting from SSE status stream');
    
    if (statusEventSource) {
      statusEventSource.close();
      setStatusEventSource(null);
      setIsStatusConnected(false);
    }
  };

  // WebSocket connection management
  const connectToTerminal = (terminalId: string) => {
    if (!terminalId || terminalId === 'undefined' || !terminalId.trim()) {
      console.error('🚨 Cannot connect WebSocket with invalid terminal ID:', terminalId);
      setError('Invalid terminal ID for WebSocket connection');
      return;
    }

    console.log('🔄 Connecting WebSocket to terminal:', terminalId);
    
    // Clean up existing connection
    if (socket) {
      console.log('🔌 Closing existing WebSocket connection');
      socket.close();
      setSocket(null);
    }

    try {
      // Connect to WebSocket terminal endpoint - SPARC UNIFIED ARCHITECTURE: Single server
      // HTTP API + WebSocket Terminal both on localhost:3000
      const wsUrl = apiUrl.replace('http://', 'ws://')
                          .replace('https://', 'wss://');
      const ws = new WebSocket(`${wsUrl}/terminal`);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connection established');
        setIsConnected(true);
        setError(null);
        setSocket(ws);
        
        // Send terminal connection message
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: terminalId,
          timestamp: Date.now()
        }));
        
        triggerHandlers('connect', { 
          transport: 'websocket', 
          terminalId,
          connectionType: 'websocket'
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 SPARC: WebSocket message received:', data.type, data);
          
          // Route messages to appropriate handlers
          if (data.type === 'output' || data.type === 'terminal_output') {
            triggerHandlers('terminal:output', {
              output: data.data || data.output,
              terminalId: data.terminalId || terminalId,
              timestamp: data.timestamp
            });
          } else if (data.type === 'echo') {
            // Handle echo messages for immediate feedback
            triggerHandlers('terminal:output', {
              output: data.data,
              terminalId: data.terminalId || terminalId,
              timestamp: data.timestamp,
              isEcho: true
            });
          } else if (data.type === 'status') {
            triggerHandlers('terminal:status', {
              terminalId: data.terminalId || terminalId,
              status: data.status,
              timestamp: data.timestamp
            });
          } else if (data.type === 'connect') {
            console.log('✅ SPARC: WebSocket connection confirmed for terminal:', data.terminalId);
          } else if (data.type === 'error') {
            console.error('❌ SPARC: WebSocket error from server:', data.error);
            setError(data.error);
          }
          
          // Generic message handler
          triggerHandlers('message', data);
          
        } catch (parseError) {
          console.error('WebSocket message parsing error:', parseError);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('WebSocket connection error');
        triggerHandlers('error', error);
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        setSocket(null);
        
        triggerHandlers('disconnect', { 
          code: event.code, 
          reason: event.reason 
        });
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError(error instanceof Error ? error.message : 'WebSocket connection failed');
    }
  };

  const disconnectFromInstance = () => {
    console.log('🔌 Disconnecting from current instance');
    
    if (socket) {
      socket.close(1000, 'Manual disconnect');
      setSocket(null);
    }
    
    setIsConnected(false);
    setCurrentInstanceId(null);
  };

  // Update connection status when connectionError changes
  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
      setConnectionType('Connection Error');
    } else if (isConnected) {
      setError(null);
    }
  }, [connectionError, isConnected]);
  
  // Monitor SSE status connection and update connection type
  useEffect(() => {
    const updateConnectionStatus = () => {
      if (isStatusConnected && isConnected) {
        setConnectionType(`Connected (WebSocket + SSE Status)`);
      } else if (isStatusConnected) {
        setConnectionType('Connected (SSE Status Only)');
      } else if (isConnected) {
        setConnectionType('Connected (WebSocket Only)');
      } else {
        setConnectionType('Disconnected');
      }
    };
    
    updateConnectionStatus();
  }, [isStatusConnected, isConnected]);

  const fetchInstances = async () => {
    try {
      // REAL BACKEND API: Use /api/claude/instances to get Claude instances
      const response = await fetch(`/api/claude/instances`);
      const data = await response.json();
      
      if (data.success) {
        // Use Claude instances from backend
        const instances = data.instances.map((instance: any) => ({
          id: instance.id,
          name: instance.name || `Claude ${instance.id}`,
          status: instance.status,
          pid: instance.pid,
          startTime: new Date(instance.created || Date.now())
        }));
        setInstances(instances);
        setError(null); // Clear any previous errors on successful fetch
      } else {
        // Handle API response errors
        const errorMessage = data.error || data.message || 'Failed to fetch instances';
        setError(errorMessage);
        console.warn('API returned error:', data);
      }
    } catch (err) {
      console.error('Failed to fetch instances:', err);
      
      // Enhanced error handling for mixed API versioning scenarios
      let errorMessage = 'Failed to fetch instances';
      
      if (err instanceof Error) {
        if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error - please check connection';
        } else if (err.message.includes('404')) {
          errorMessage = 'Instance API endpoint not found';
        } else {
          errorMessage = `Connection error: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      
      nldCapture.captureCommunicationBreakdown(
        { endpoint: '/api/claude/instances', method: 'GET', error: err },
        'ClaudeInstanceManagerModern'
      );
    }
  };

  const createInstance = async (command: string) => {
    const startTime = performance.now();
    setLoading(true);
    setError(null);
    
    console.log('🚀 REAL Terminal Launch - Command:', command);
    
    try {
      // Use the REAL Claude instances API endpoint
      const response = await fetch(`/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'dev',
          workingDirectory: '/workspaces/agent-feed',
          command: command
        })
      });
      
      const data = await response.json();
      if (data.success) {
        const instance = data.instance;
        
        if (!instance || !instance.id) {
          console.error('❌ Instance creation succeeded but no instance found in response:', data);
          setError('Instance creation failed: No instance in response');
          return;
        }
        
        console.log(`✅ Claude instance ${instance.id} created successfully`);
        
        // Connect to the new instance terminal WebSocket  
        connectToTerminal(instance.id);
        
        // Update instances list
        await fetchInstances();
        
        // Set up the terminal for WebSocket connection
        setCurrentInstanceId(instance.id);
        setSelectedInstance(instance.id);
        setOutput(prev => ({ ...prev, [instance.id]: 'Claude instance created! Connecting to WebSocket...\n' }));
        
        // Ensure SSE status stream is connected for status updates
        if (!isStatusConnected) {
          connectToStatusStream();
        }
        
        console.log('✅ Real Claude terminal ready for WebSocket connection');
      } else {
        const errorMsg = data.error || 'Failed to launch terminal';
        console.error('❌ Instance creation failed:', errorMsg, data);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Create instance error:', err);
      const errorMessage = 'Failed to create instance';
      setError(errorMessage);
      
      // Enhanced error capture for mixed API versioning
      nldCapture.captureInstanceCreationFailure(
        err instanceof Error ? err.message : errorMessage,
        `${apiUrl}/api/claude/instances`,
        'POST',
        'ClaudeInstanceManagerModern'
      );
    } finally {
      setLoading(false);
    }
  };

  const sendInput = (input: string) => {
    if (!selectedInstance || selectedInstance === 'undefined' || !selectedInstance.trim()) {
      console.warn('Cannot send input: no valid instance selected', { selectedInstance });
      setError('No valid instance selected');
      return;
    }
    
    if (!input.trim()) {
      console.warn('Cannot send empty input');
      return;
    }
    
    if (!/^claude-[a-zA-Z0-9]+$/.test(selectedInstance)) {
      console.error('Invalid instance ID format:', selectedInstance);
      setError(`Invalid instance ID format: ${selectedInstance}`);
      return;
    }
    
    if (isConnected && socket) {
      console.log('⌨️ SPARC: Sending input via WebSocket to instance:', selectedInstance, 'Input:', input);
      try {
        // SPARC FIX: Use socket.send() method properly with JSON message format
        socket.send(JSON.stringify({
          type: 'input',
          data: input,
          terminalId: selectedInstance,
          timestamp: Date.now()
        }));
        setError(null);
      } catch (err) {
        console.error('Failed to send WebSocket command:', err);
        setError(`Failed to send command: ${err instanceof Error ? err.message : err}`);
      }
    } else {
      console.warn('Not connected to WebSocket, cannot send input');
      setError('Not connected to terminal');
    }
  };

  const terminateInstance = async (instanceId: string) => {
    try {
      // Use the correct Claude instance deletion endpoint
      const response = await fetch(`/api/claude/instances/${instanceId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('Claude instance terminated successfully, refreshing instances list...');
        await fetchInstances();
        
        // Clean up UI state for terminated instance
        if (selectedInstance === instanceId) {
          setSelectedInstance(null);
          disconnectFromInstance();
        }
        
        setOutput(prev => {
          const newOutput = { ...prev };
          delete newOutput[instanceId];
          return newOutput;
        });
        
        setError(null); // Clear any previous errors
      } else {
        const errorMessage = data.error || data.message || 'Failed to terminate instance';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Failed to terminate instance:', err);
      const errorMessage = err instanceof Error ? 
        `Termination failed: ${err.message}` : 
        'Failed to terminate instance';
      setError(errorMessage);
    }
  };

  const handleInstanceSelect = (instanceId: string) => {
    if (!instanceId || instanceId === 'undefined' || !instanceId.trim()) {
      console.error('Cannot select instance with invalid ID:', instanceId);
      setError('Invalid instance ID');
      return;
    }
    
    if (!/^claude-[a-zA-Z0-9]+$/.test(instanceId)) {
      console.error('Instance ID does not match expected format:', instanceId);
      setError(`Invalid instance ID format: ${instanceId}`);
      return;
    }
    
    console.log('Selecting validated instance:', instanceId);
    
    if (selectedInstance && selectedInstance !== instanceId) {
      console.log('Disconnecting from previous instance:', selectedInstance);
      disconnectFromTerminal();
    }
    
    setSelectedInstance(instanceId);
    if (!output[instanceId]) {
      setOutput(prev => ({ ...prev, [instanceId]: '' }));
    }
    
    const instance = instances.find(i => i.id === instanceId);
    if (instance && instance.status === 'running') {
      setTimeout(async () => {
        try {
          // WebSocket connections to terminal server
          console.log('🔗 SPARC: Starting WebSocket for selected terminal:', instanceId);
          connectToTerminal(instanceId);
          console.log('✅ SPARC: Connecting to selected terminal:', instanceId);
        } catch (wsError) {
          console.log('⚠️ SPARC: Failed to connect to selected terminal:', wsError);
          setError(`Failed to connect: ${wsError instanceof Error ? wsError.message : wsError}`);
        }
      }, 100);
    }
  };

  const selectedInstanceObject = instances.find(i => i.id === selectedInstance);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Claude Instance Manager
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Launch and manage Claude instances with modern interface
          </p>
          {/* API Versioning Info for Development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              API: Instance operations via /api/claude/ • SSE streaming via /api/v1/ • Status: {isStatusConnected ? '✅ Connected' : '❌ Disconnected'}
            </div>
          )}
        </div>

        {/* Launch Buttons */}
        <Card>
          <CardContent className="p-6">
            <ClaudeInstanceButtons
              onCreateInstance={createInstance}
              loading={loading}
              connectionStatuses={{}}
            />
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Instances List */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">
                    Active Instances
                  </CardTitle>
                  {instances.length > 0 && (
                    <Badge variant="secondary">
                      {instances.filter(i => i.status === 'running').length}/{instances.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {instances.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m14-2v2M3 15h2m14 0h2M7 12h10" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      No active instances. Launch one to get started!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {instances.map(instance => (
                      <div 
                        key={instance.id}
                        className={cn(
                          'p-4 rounded-lg border cursor-pointer transition-all duration-200',
                          'hover:border-blue-300 dark:hover:border-blue-600',
                          selectedInstance === instance.id 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' 
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        )}
                        onClick={() => handleInstanceSelect(instance.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              instance.status === 'running' && 'bg-green-500 animate-pulse',
                              instance.status === 'starting' && 'bg-yellow-500 animate-bounce',
                              instance.status === 'stopped' && 'bg-gray-400',
                              instance.status === 'error' && 'bg-red-500 animate-pulse'
                            )} />
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {instance.name}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              terminateInstance(instance.id);
                            }}
                            className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-sm transition-colors"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>ID: {instance.id.slice(0, 8)}</span>
                          {instance.pid && <span>PID: {instance.pid}</span>}
                          <Badge 
                            variant={instance.status === 'running' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {instance.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <div className="h-[600px]">
              <ChatInterface
                selectedInstance={selectedInstanceObject || null}
                output={output}
                connectionType={connectionType}
                isConnected={isConnected}
                onSendInput={sendInput}
                onInstanceSelect={handleInstanceSelect}
                instances={instances}
                loading={loading}
                error={error}
              />
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClaudeInstanceManagerModern;
export type { ClaudeInstanceManagerModernProps };