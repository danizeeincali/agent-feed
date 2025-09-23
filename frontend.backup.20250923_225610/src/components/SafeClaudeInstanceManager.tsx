/**
 * SafeClaudeInstanceManager - SPARC Single Connection Architecture
 * 
 * Implements safety-first WebSocket connection management with:
 * 1. Disconnect-first connection sequence
 * 2. Connection lock mechanism for race condition prevention
 * 3. Individual Connect/Disconnect buttons per instance
 * 4. Visual connection state indicators
 * 5. Single active connection enforcement
 */

import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { nldCapture } from '../utils/nld-ui-capture';
import { ClaudeInstanceButtons } from './claude-manager';
import DualModeInterface from './claude-manager/DualModeInterface';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useSingleConnectionManager } from '../hooks/useSingleConnectionManager';
import { ConnectionButton } from './ConnectionButton';
import RenderTracker from './test/RenderTracker';

interface ClaudeInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: Date;
}

interface SafeClaudeInstanceManagerProps {
  apiUrl?: string;
}

const SafeClaudeInstanceManager: React.FC<SafeClaudeInstanceManagerProps> = ({ 
  apiUrl = 'http://localhost:3000'
}) => {
  const [instances, setInstances] = useState<ClaudeInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [output, setOutput] = useState<{ [key: string]: string }>({});
  const [messages, setMessages] = useState<{ [key: string]: any[] }>({});
  const [lastProcessedPosition, setLastProcessedPosition] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SPARC SAFETY FIRST: Single Connection Manager
  const { 
    connectionState, 
    currentInstanceId, 
    isConnected, 
    connectToInstance, 
    disconnectFromInstance, 
    sendMessage, 
    connectionStatistics,
    error: connectionErrorObj,
    addMessageHandler,
    removeMessageHandler
  } = useSingleConnectionManager();
  
  // Convert Error object to string for rendering
  const connectionError = connectionErrorObj ? connectionErrorObj.message : null;

  // Setup message handlers and instance polling
  useEffect(() => {
    fetchInstances();
    
    const statusPolling = setInterval(() => {
      fetchInstances();
    }, 15000); // SPARC SAFETY: Reduced from 2s to 15s to prevent API spam

    // Handle terminal output from the single connection
    const outputHandler = (data: any) => {
      if (data.output && data.terminalId && currentInstanceId === data.terminalId) {
        console.log(`📺 SAFETY FIRST: Processing output for ${data.terminalId.slice(0,8)}`);
        
        setOutput(prev => ({
          ...prev,
          [data.terminalId]: (prev[data.terminalId] || '') + data.output
        }));
      }
    };

    addMessageHandler('terminal:output', outputHandler);

    return () => {
      clearInterval(statusPolling);
      removeMessageHandler('terminal:output', outputHandler);
    };
  }, []); // SPARC SAFETY: Remove dependencies to prevent interval recreation

  // Update connection type display
  const getConnectionTypeDisplay = () => {
    if (!isConnected) return 'Disconnected';
    if (currentInstanceId) return `Connected (${currentInstanceId.slice(0,8)})`;
    return `Connection State: ${connectionState}`;
  };

  const fetchInstances = async () => {
    try {
      const response = await fetch(`/api/claude/instances`);
      const data = await response.json();
      
      if (data.success) {
        const instances = data.instances.map((instance: any) => ({
          id: instance.id,
          name: instance.name || `Claude ${instance.id}`,
          status: instance.status,
          pid: instance.pid,
          startTime: new Date(instance.created || Date.now())
        }));
        setInstances(instances);
        setError(null);
      } else {
        setError(data.error || data.message || 'Failed to fetch instances');
      }
    } catch (err) {
      console.error('Failed to fetch instances:', err);
      setError('Failed to fetch instances');
    }
  };

  // SPARC SAFETY FIRST: Launch & Connect with disconnect-first sequence
  const createInstanceAndConnect = async (command: string) => {
    setLoading(true);
    setError(null);
    
    console.log('🚀 SAFETY FIRST: Launch & Connect - Command:', command);
    
    try {
      // STEP 1: DISCONNECT FIRST (Safety guarantee)
      if (currentInstanceId) {
        console.log('🔌 STEP 1: Disconnecting existing connection for safety');
        await disconnectFromInstance();
      }
      
      // STEP 2: CREATE NEW INSTANCE (Clean environment)
      console.log('🏗️ STEP 2: Creating new instance');
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
          console.error('❌ Instance creation failed: No instance in response');
          setError('Instance creation failed: No instance in response');
          return;
        }
        
        console.log(`✅ Claude instance ${instance.id} created successfully`);
        
        // Add instance to state first
        setInstances(prev => [...prev, {
          id: instance.id,
          name: instance.name || `Claude ${instance.id}`,
          status: instance.status,
          pid: instance.pid,
          startTime: new Date(instance.created || Date.now())
        }]);
        
        // STEP 3: CONNECT EXCLUSIVELY (Single connection)
        console.log('🔗 STEP 3: Connecting to new instance');
        await connectToInstance(instance.id);
        
        // STEP 4: UPDATE UI STATE (Show terminal)
        console.log('🖥️ STEP 4: Updating UI state');
        setSelectedInstance(instance.id);
        setOutput(prev => ({ 
          ...prev, 
          [instance.id]: 'Claude instance created and connected safely!\n' 
        }));
        setMessages(prev => ({ ...prev, [instance.id]: [] }));
        setLastProcessedPosition(prev => ({ ...prev, [instance.id]: 0 }));
        
        console.log('✅ SAFETY FIRST: Launch & Connect completed successfully');
      } else {
        const errorMsg = data.error || 'Failed to launch terminal';
        console.error('❌ Instance creation failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Create instance error:', err);
      const errorMessage = 'Failed to create instance';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // SPARC SAFETY FIRST: Individual instance connection
  const handleInstanceConnect = async (instanceId: string) => {
    try {
      setError(null);
      
      // STEP 1: DISCONNECT FIRST (if needed)
      if (currentInstanceId && currentInstanceId !== instanceId) {
        console.log(`🔌 SAFETY FIRST: Disconnecting from ${currentInstanceId} before connecting to ${instanceId}`);
        await disconnectFromInstance();
      }
      
      // STEP 2: CONNECT TO TARGET INSTANCE
      console.log(`🔗 SAFETY FIRST: Connecting to instance ${instanceId}`);
      await connectToInstance(instanceId);
      
      // STEP 3: UPDATE UI STATE
      setSelectedInstance(instanceId);
      if (!output[instanceId]) {
        setOutput(prev => ({ ...prev, [instanceId]: 'Connected safely!\n' }));
        setMessages(prev => ({ ...prev, [instanceId]: [] }));
        setLastProcessedPosition(prev => ({ ...prev, [instanceId]: 0 }));
      }
      
      console.log(`✅ SAFETY FIRST: Successfully connected to ${instanceId}`);
    } catch (err) {
      console.error('Connection error:', err);
      setError(`Failed to connect to instance: ${err instanceof Error ? err.message : err}`);
    }
  };

  // SPARC SAFETY FIRST: Safe disconnect
  const handleInstanceDisconnect = async () => {
    if (!currentInstanceId) return;
    
    try {
      setError(null);
      console.log(`🔌 SAFETY FIRST: Disconnecting from ${currentInstanceId}`);
      await disconnectFromInstance();
      console.log('✅ SAFETY FIRST: Disconnected successfully');
    } catch (err) {
      console.error('Disconnect error:', err);
      setError(`Failed to disconnect: ${err instanceof Error ? err.message : err}`);
    }
  };

  // SPARC SAFETY FIRST: Send input with connection validation
  const sendInput = (input: string) => {
    if (!currentInstanceId) {
      setError('No instance connected');
      return;
    }
    
    if (!input || !input.trim()) {
      console.warn('Cannot send empty input');
      return;
    }
    
    if (!isConnected || connectionState !== 'CONNECTED') {
      setError('Not connected to terminal');
      return;
    }

    const trimmedInput = input.trim();
    console.log('⌨️ SAFETY FIRST: Sending command to connected instance:', trimmedInput);
    
    try {
      const message = {
        type: 'input',
        data: trimmedInput + '\n',
        terminalId: currentInstanceId,
        timestamp: Date.now()
      };
      
      sendMessage(message);
      setError(null);
      console.log('✅ SAFETY FIRST: Command sent successfully');
      
    } catch (err) {
      console.error('Failed to send command:', err);
      setError(`Failed to send command: ${err instanceof Error ? err.message : err}`);
    }
  };

  const terminateInstance = async (instanceId: string) => {
    try {
      // Disconnect if this is the current instance
      if (currentInstanceId === instanceId) {
        await disconnectFromInstance();
      }
      
      const response = await fetch(`/api/claude/instances/${instanceId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('Instance terminated successfully');
        await fetchInstances();
        
        if (selectedInstance === instanceId) {
          setSelectedInstance(null);
        }
        
        setOutput(prev => {
          const newOutput = { ...prev };
          delete newOutput[instanceId];
          return newOutput;
        });
        
        setError(null);
      } else {
        setError(data.error || 'Failed to terminate instance');
      }
    } catch (err) {
      console.error('Failed to terminate instance:', err);
      setError('Failed to terminate instance');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" data-testid="safe-claude-instance-manager">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Safe Claude Instance Manager
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Single-connection architecture with safety-first connection management
          </p>
          <div className="mt-2 text-sm">
            <span className="font-semibold">Connection Status:</span> {getConnectionTypeDisplay()}
            {connectionStatistics && (
              <span className="ml-4 text-gray-500">
                Connected for: {Math.round((Date.now() - connectionStatistics.connectTime) / 1000)}s
              </span>
            )}
          </div>
        </div>

        {/* Launch Buttons */}
        <Card>
          <CardContent className="p-6">
            <ClaudeInstanceButtons
              onCreateInstance={createInstanceAndConnect}
              loading={loading}
              connectionStatuses={{}}
            />
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Instances List with Individual Connection Controls */}
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
                    {instances.map(instance => {
                      const isConnectedToThis = currentInstanceId === instance.id;
                      
                      return (
                        <div 
                          key={instance.id}
                          className={cn(
                            'p-4 rounded-lg border transition-all duration-200',
                            'hover:border-blue-300 dark:hover:border-blue-600',
                            isConnectedToThis
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' 
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                          )}
                          data-testid={`instance-${instance.id}`}
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
                              {isConnectedToThis && (
                                <Badge variant="default" className="text-xs">
                                  Connected
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Connection Control Button */}
                              <ConnectionButton
                                instanceId={instance.id}
                                isConnected={isConnectedToThis}
                                connectionState={isConnectedToThis ? connectionState : 'DISCONNECTED'}
                                onConnect={() => handleInstanceConnect(instance.id)}
                                onDisconnect={handleInstanceDisconnect}
                                disabled={instance.status !== 'running'}
                                size="sm"
                              />
                              
                              {/* Terminate Button */}
                              <button
                                onClick={() => terminateInstance(instance.id)}
                                className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-sm transition-colors"
                                data-testid={`terminate-${instance.id}`}
                              >
                                ×
                              </button>
                            </div>
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
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connection Statistics */}
            {connectionStatistics && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Connection Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>State:</span>
                      <span className={cn(
                        'font-semibold',
                        connectionState === 'CONNECTED' && 'text-green-600',
                        connectionState === 'CONNECTING' && 'text-yellow-600',
                        connectionState === 'DISCONNECTED' && 'text-gray-600',
                        connectionState === 'ERROR' && 'text-red-600'
                      )}>
                        {connectionState}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{Math.round((Date.now() - connectionStatistics.connectTime) / 1000)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Messages:</span>
                      <span>{connectionStatistics.messageCount || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <div className="h-[600px]">
              <DualModeInterface
                selectedInstance={instances.find(i => i.id === selectedInstance) || null}
                output={output}
                connectionType={getConnectionTypeDisplay()}
                isConnected={isConnected}
                onSendInput={sendInput}
                onInstanceSelect={(id) => setSelectedInstance(id)}
                instances={instances}
                loading={loading}
                error={error || connectionError}
              />
            </div>
          </div>
        </div>

        {/* Error Display */}
        {(error || connectionError) && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{error || connectionError}</span>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* SPARC: Render tracking for performance debugging */}
        {process.env.NODE_ENV === 'development' && (
          <RenderTracker 
            componentName="SafeClaudeInstanceManager" 
            data={{ 
              instancesCount: instances.length, 
              selectedInstance, 
              outputKeys: Object.keys(output),
              connectionState,
              currentInstanceId
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SafeClaudeInstanceManager;
export type { SafeClaudeInstanceManagerProps };