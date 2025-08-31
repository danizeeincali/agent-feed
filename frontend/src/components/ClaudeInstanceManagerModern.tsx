import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { nldCapture } from '../utils/nld-ui-capture';
import { ClaudeInstanceButtons } from './claude-manager';
import DualModeInterface from './claude-manager/DualModeInterface';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useWebSocketSingleton } from '../hooks/useWebSocketSingleton';
import RenderTracker from './test/RenderTracker';

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
  const [messages, setMessages] = useState<{ [key: string]: any[] }>({});
  const [lastProcessedPosition, setLastProcessedPosition] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<string>('Disconnected');
  
  // SPARC + NLD SOLUTION: Use WebSocket Singleton to prevent StrictMode duplicates
  const webSocketSingleton = useWebSocketSingleton(apiUrl);
  const { isConnected, connect, disconnect, send, addHandler, removeHandler, currentTerminalId } = webSocketSingleton;
  
  // SPARC FIX: Setup singleton event handlers and status polling
  useEffect(() => {
    fetchInstances();
    
    // Poll for status updates every 2 seconds to catch status changes
    const statusPolling = setInterval(() => {
      fetchInstances();
    }, 2000);
    
    // Terminal output handler
    const outputHandler = (data) => {
      if (data.output && data.terminalId) {
        console.log(`📺 SPARC Singleton: Processing output for ${data.terminalId.slice(0,8)}:`, data.output.slice(0, 100));
        
        setOutput(prev => ({
          ...prev,
          [data.terminalId]: (prev[data.terminalId] || '') + data.output
        }));
      }
    };
    
    // Terminal status handler
    const statusHandler = (data) => {
      console.log('📲 SPARC Singleton: Status update received:', data);
      
      setInstances(prev => prev.map(instance => 
        instance.id === data.terminalId 
          ? { ...instance, status: data.status as ClaudeInstance['status'] }
          : instance
      ));
    };
    
    // Connection handler
    const connectHandler = (data) => {
      console.log('✅ SPARC Singleton: Connected to terminal:', data);
      setError(null);
      setConnectionType(`Connected via WebSocket${data.terminalId ? ` (${data.terminalId.slice(0,8)})` : ''}`);
    };
    
    // Error handler
    const errorHandler = (error) => {
      console.error('❌ SPARC Singleton: Error:', error);
      setError(error.message || error.error || 'Connection error');
      setConnectionType('Connection Error');
    };
    
    // Disconnect handler
    const disconnectHandler = (data) => {
      console.log('🔌 SPARC Singleton: Disconnected:', data);
      setConnectionType('Disconnected');
    };
    
    // Add handlers
    addHandler('terminal:output', outputHandler);
    addHandler('terminal:status', statusHandler);
    addHandler('connect', connectHandler);
    addHandler('error', errorHandler);
    addHandler('disconnect', disconnectHandler);
    
    return () => {
      // Cleanup polling and singleton handlers on unmount
      clearInterval(statusPolling);
      removeHandler('terminal:output', outputHandler);
      removeHandler('terminal:status', statusHandler);
      removeHandler('connect', connectHandler);
      removeHandler('error', errorHandler);
      removeHandler('disconnect', disconnectHandler);
    };
  }, [addHandler, removeHandler]);

  // SPARC FIX: Connection status management using singleton
  useEffect(() => {
    if (isConnected) {
      setError(null);
      setConnectionType('Connected (WebSocket)');
    } else {
      setConnectionType('Disconnected');
    }
  }, [isConnected]);

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
        
        // Connect to the new instance using singleton
        connect(instance.id);
        
        // SPARC FIX: Add instance to state manually instead of fetchInstances()
        // This prevents race condition with SSE status updates
        setInstances(prev => [...prev, {
          id: instance.id,
          name: instance.name || `Claude ${instance.id}`,
          status: instance.status,
          pid: instance.pid,
          startTime: new Date(instance.created || Date.now())
        }]);
        
        // Set up the terminal state
        setSelectedInstance(instance.id);
        setOutput(prev => ({ ...prev, [instance.id]: 'Claude instance created! Connecting to WebSocket...\n' }));
        setMessages(prev => ({ ...prev, [instance.id]: [] }));
        setLastProcessedPosition(prev => ({ ...prev, [instance.id]: 0 }));
        
        // SPARC FIX: Status updates handled via WebSocket
        
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
    
    if (!input || !input.trim()) {
      console.warn('Cannot send empty input');
      return;
    }
    
    if (!/^claude-[a-zA-Z0-9]+$/.test(selectedInstance)) {
      console.error('Invalid instance ID format:', selectedInstance);
      setError(`Invalid instance ID format: ${selectedInstance}`);
      return;
    }
    
    if (!isConnected) {
      console.warn('Not connected to WebSocket, cannot send input');
      setError('Not connected to terminal');
      return;
    }

    // SPARC FIX: Proper line-based input handling
    const trimmedInput = input.trim();
    console.log('⌨️ SPARC: Sending complete command line to Claude CLI:', trimmedInput);
    
    try {
      // Send complete command with newline terminator for proper CLI execution
      const commandLine = trimmedInput + '\n';
      
      const message = {
        type: 'input',
        data: commandLine,
        terminalId: selectedInstance,
        timestamp: Date.now()
      };
      
      console.log('📤 SPARC Singleton: Sending WebSocket message:', message);
      send(message);
      
      setError(null);
      console.log('✅ SPARC Singleton: Command sent successfully to Claude CLI');
      
    } catch (err) {
      console.error('Failed to send WebSocket command:', err);
      setError(`Failed to send command: ${err instanceof Error ? err.message : err}`);
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
          disconnect();
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
    
    // Extract base instance ID if formatted
    const baseInstanceId = instanceId.includes('(') ? instanceId.split(' (')[0].trim() : instanceId;
    
    if (!/^claude-[a-zA-Z0-9]+$/.test(baseInstanceId)) {
      console.error('Instance ID does not match expected format:', baseInstanceId);
      setError(`Invalid instance ID format: ${baseInstanceId}`);
      return;
    }
    
    console.log('🎯 SPARC Singleton: Selecting instance with clean switch:', baseInstanceId, 'from:', instanceId);
    
    // SPARC FIX: Always disconnect first for clean switch
    if (currentTerminalId && currentTerminalId !== baseInstanceId) {
      console.log('🔌 SPARC Singleton: Disconnecting from previous instance:', currentTerminalId);
      disconnect();
    }
    
    setSelectedInstance(baseInstanceId);
    
    // Initialize output buffer for new instance if needed
    if (!output[baseInstanceId]) {
      setOutput(prev => ({ ...prev, [baseInstanceId]: '' }));
      setMessages(prev => ({ ...prev, [baseInstanceId]: [] }));
      setLastProcessedPosition(prev => ({ ...prev, [baseInstanceId]: 0 }));
    }
    
    const instance = instances.find(i => i.id === baseInstanceId);
    if (instance && instance.status === 'running') {
      // SPARC FIX: Only connect if not already connected to this instance
      if (currentTerminalId !== baseInstanceId) {
        console.log('🔗 SPARC Singleton: Connecting exclusively to selected terminal:', baseInstanceId);
        // Connect immediately to existing running instance
        connect(baseInstanceId);
      } else {
        console.log('✅ SPARC Singleton: Already connected to selected instance');
      }
    } else {
      console.warn(`⚠️ Instance ${baseInstanceId} is not running (status: ${instance?.status})`);
      setError(`Instance ${baseInstanceId} is not running`);
    }
  };

  const selectedInstanceObject = instances.find(i => i.id === selectedInstance);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" data-testid="claude-instance-manager">
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
              API: Instance operations via /api/claude/ • <span data-testid="connection-status">WebSocket connection: {isConnected ? '✅ Connected' : '❌ Disconnected'}</span>
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
                          'claude-instance-item p-4 rounded-lg border cursor-pointer transition-all duration-200',
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
              <DualModeInterface
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
        
        {/* SPARC: Render tracking for performance debugging */}
        {process.env.NODE_ENV === 'development' && (
          <RenderTracker 
            componentName="ClaudeInstanceManager" 
            data={{ instancesCount: instances.length, selectedInstance, outputKeys: Object.keys(output) }}
          />
        )}
      </div>
    </div>
  );
};

export default ClaudeInstanceManagerModern;
export type { ClaudeInstanceManagerModernProps };