/**
 * ClaudeInstanceManagerSSE - SSE-based Claude Instance Manager Component
 * 
 * Modern React component using HTTP+SSE architecture for Claude instance management.
 * Replaces WebSocket-based communication with more reliable SSE streaming.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useSSEClaudeManager } from '../hooks/useSSEClaudeManager';
import { InstanceConfig } from '../services/HTTPCommandService';
import { SSEConnectionState } from '../services/SSEClaudeInstanceManager';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface ClaudeInstanceManagerSSEProps {
  apiUrl?: string;
  autoConnect?: boolean;
}

const ClaudeInstanceManagerSSE: React.FC<ClaudeInstanceManagerSSEProps> = ({
  apiUrl = 'http://localhost:3000',
  autoConnect = false
}) => {
  // Local state
  const [input, setInput] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  
  // SSE Claude Manager hook
  const {
    connectionState,
    isConnected,
    error,
    messages,
    instances,
    selectedInstance,
    connecting,
    sendingCommand,
    creatingInstance,
    terminatingInstance,
    connect,
    disconnect,
    sendInput,
    createInstance,
    terminateInstance,
    refreshInstances,
    selectInstance,
    clearHistory,
    getStatistics
  } = useSSEClaudeManager({
    apiBaseUrl: apiUrl,
    autoConnect
  });
  
  // Auto-scroll terminal output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Handle input submission
  const handleSendInput = async () => {
    if (!input.trim() || !isConnected) return;
    
    try {
      await sendInput(input);
      setInput('');
    } catch (error) {
      console.error('Failed to send input:', error);
    }
  };
  
  // Handle Enter key in input
  const handleInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendInput();
    }
  };
  
  // Handle instance creation
  const handleCreateInstance = async (command: string) => {
    const config: InstanceConfig = {
      type: 'dev',
      workingDirectory: '/workspaces/agent-feed',
      command
    };
    
    try {
      const instance = await createInstance(config);
      selectInstance(instance);
      // Auto-connect to newly created instance
      if (instance.status === 'running') {
        setTimeout(() => connect(instance.id), 1000);
      }
    } catch (error) {
      console.error('Failed to create instance:', error);
    }
  };
  
  // Handle instance selection
  const handleInstanceSelect = async (instanceId: string) => {
    const instance = instances.find(i => i.id === instanceId);
    if (!instance) return;
    
    // Disconnect from current instance if connected
    if (isConnected && selectedInstance?.id !== instanceId) {
      await disconnect();
    }
    
    selectInstance(instance);
    
    // Auto-connect if instance is running
    if (instance.status === 'running') {
      try {
        await connect(instanceId);
      } catch (error) {
        console.error('Failed to connect to instance:', error);
      }
    }
  };
  
  // Handle instance termination
  const handleTerminateInstance = async (instanceId: string) => {
    if (confirm('Are you sure you want to terminate this instance?')) {
      try {
        await terminateInstance(instanceId);
      } catch (error) {
        console.error('Failed to terminate instance:', error);
      }
    }
  };
  
  // Get connection status display
  const getConnectionStatusDisplay = () => {
    switch (connectionState) {
      case SSEConnectionState.CONNECTED:
        return { text: 'Connected', className: 'connected', color: 'green' };
      case SSEConnectionState.CONNECTING:
        return { text: 'Connecting...', className: 'connecting', color: 'yellow' };
      case SSEConnectionState.RECONNECTING:
        return { text: 'Reconnecting...', className: 'reconnecting', color: 'yellow' };
      case SSEConnectionState.ERROR:
        return { text: 'Error', className: 'error', color: 'red' };
      case SSEConnectionState.TERMINATED:
        return { text: 'Terminated', className: 'terminated', color: 'gray' };
      default:
        return { text: 'Disconnected', className: 'disconnected', color: 'gray' };
    }
  };
  
  const statusDisplay = getConnectionStatusDisplay();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Claude Instance Manager (SSE)
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            HTTP+SSE architecture for reliable Claude instance communication
          </p>
          <div className="mt-2 flex items-center justify-center gap-4 text-sm">
            <Badge variant={statusDisplay.color as any}>
              {statusDisplay.text}
            </Badge>
            {selectedInstance && (
              <span className="text-gray-500">
                Instance: {selectedInstance.id.slice(0, 12)}...
              </span>
            )}
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <span className="font-medium">Error: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Instance Launch Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Launch New Instance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button
                onClick={() => handleCreateInstance('claude')}
                disabled={creatingInstance}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                🚀 Standard Claude
              </button>
              <button
                onClick={() => handleCreateInstance('claude --dangerously-skip-permissions')}
                disabled={creatingInstance}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
              >
                ⚡ Skip Permissions
              </button>
              <button
                onClick={() => handleCreateInstance('claude --dangerously-skip-permissions -c')}
                disabled={creatingInstance}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                ⚡ Skip Permissions -c
              </button>
              <button
                onClick={() => handleCreateInstance('claude --dangerously-skip-permissions --resume')}
                disabled={creatingInstance}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                ↻ Resume
              </button>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Instances List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Active Instances</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {instances.filter(i => i.status === 'running').length}/{instances.length}
                  </Badge>
                  <button
                    onClick={refreshInstances}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    Refresh
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {instances.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No instances available. Launch one to get started!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {instances.map(instance => (
                      <div
                        key={instance.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedInstance?.id === instance.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-800'
                        }`}
                        onClick={() => handleInstanceSelect(instance.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{instance.name}</div>
                            <div className="text-xs text-gray-500">
                              ID: {instance.id.slice(0, 12)}...
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={instance.status === 'running' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {instance.status}
                            </Badge>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTerminateInstance(instance.id);
                              }}
                              disabled={terminatingInstance}
                              className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Terminal Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Terminal {selectedInstance && `- ${selectedInstance.id.slice(0, 12)}...`}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isConnected && (
                      <button
                        onClick={clearHistory}
                        className="text-sm text-gray-500 hover:text-gray-600"
                      >
                        Clear
                      </button>
                    )}
                    <div className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-4">
                {selectedInstance ? (
                  <>
                    {/* Terminal Output */}
                    <div
                      ref={outputRef}
                      className="flex-1 bg-black text-green-400 p-4 rounded font-mono text-sm overflow-y-auto"
                    >
                      {messages.length === 0 ? (
                        <div className="text-gray-500">
                          {isConnected 
                            ? 'Connected to Claude instance. Type commands below.'
                            : 'Connect to instance to start terminal session.'
                          }
                        </div>
                      ) : (
                        messages.map(message => (
                          <div
                            key={message.id}
                            className={`mb-1 ${
                              message.type === 'input' ? 'text-yellow-400' : 
                              message.type === 'error' ? 'text-red-400' :
                              message.type === 'system' ? 'text-blue-400' :
                              'text-green-400'
                            }`}
                          >
                            <span className="text-gray-500 text-xs mr-2">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                            <span className="whitespace-pre-wrap">{message.content}</span>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Terminal Input */}
                    <div className="mt-4 flex gap-2">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleInputKeyPress}
                        placeholder={isConnected ? "Type command and press Enter..." : "Connect to instance first"}
                        disabled={!isConnected || sendingCommand}
                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                      <button
                        onClick={handleSendInput}
                        disabled={!isConnected || !input.trim() || sendingCommand}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        {sendingCommand ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    Select an instance or create a new one to start
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Statistics (Development Mode) */}
        {process.env.NODE_ENV === 'development' && (
          <Card>
            <CardHeader>
              <CardTitle>Connection Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-gray-600">
                {JSON.stringify(getStatistics(), null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClaudeInstanceManagerSSE;