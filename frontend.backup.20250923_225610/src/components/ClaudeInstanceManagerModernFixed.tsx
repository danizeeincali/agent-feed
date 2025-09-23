import React, { useState, useEffect, useRef } from 'react';
import { useSSEConnectionSingleton } from '../hooks/useSSEConnectionSingleton';
import ClaudeOutputParser from '../utils/claude-output-parser';

interface ClaudeInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: Date;
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  instanceId?: string;
}

interface ClaudeInstanceManagerProps {
  apiUrl?: string;
}

const ClaudeInstanceManagerModernFixed: React.FC<ClaudeInstanceManagerProps> = ({ 
  apiUrl = 'http://localhost:3000' 
}) => {
  const [instances, setInstances] = useState<ClaudeInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<string>('Disconnected');
  
  // Track output buffer and position per instance to handle incremental updates
  const outputBuffersRef = useRef<{ [key: string]: { buffer: string; position: number; lastMessageId: string | null } }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use SSE Connection Singleton - prevents duplication
  const { 
    connectionState,
    connectToInstance,
    disconnectFromInstance,
    sendCommand,
    addHandler,
    removeHandler,
    isConnected,
    getAllConnections
  } = useSSEConnectionSingleton(apiUrl);
  
  const connectionError = connectionState.lastError;

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedInstance]);

  // Setup event handlers and fetch instances
  useEffect(() => {
    fetchInstances();

    // Handle SSE terminal output with incremental parsing
    const handleOutput = (data: any) => {
      if (data.instanceId && (data.output || data.data)) {
        const incrementalOutput = data.output || data.data;
        console.log(`🎯 Processing incremental output for ${data.instanceId}:`, incrementalOutput.substring(0, 100));
        
        // Initialize buffer for this instance if needed
        if (!outputBuffersRef.current[data.instanceId]) {
          outputBuffersRef.current[data.instanceId] = {
            buffer: '',
            position: 0,
            lastMessageId: null
          };
        }
        
        const bufferInfo = outputBuffersRef.current[data.instanceId];
        
        // Check if this is a duplicate or already processed output
        if (data.position !== undefined && data.position < bufferInfo.position) {
          console.log(`⏭️ Skipping already processed output at position ${data.position} (current: ${bufferInfo.position})`);
          return;
        }
        
        // For incremental updates, append to buffer
        if (data.isIncremental) {
          bufferInfo.buffer += incrementalOutput;
          if (data.position !== undefined) {
            bufferInfo.position = data.position + incrementalOutput.length;
          }
        } else {
          // For non-incremental, replace buffer (backwards compatibility)
          bufferInfo.buffer = incrementalOutput;
          bufferInfo.position = incrementalOutput.length;
        }
        
        // Parse the complete buffer for messages
        const parsedMessages = ClaudeOutputParser.parseClaudeOutput(bufferInfo.buffer);
        
        // Only add NEW messages that haven't been added yet
        const existingMessageCount = messages[data.instanceId]?.length || 0;
        const newMessages = parsedMessages.slice(existingMessageCount);
        
        newMessages.forEach((parsed, index) => {
          const messageType = parsed.type === 'welcome' ? 'system' : 
                             parsed.type === 'system' ? 'system' :
                             parsed.type === 'prompt' ? 'user' : 'assistant';
          
          const messageId = `${data.instanceId}-${Date.now()}-${existingMessageCount + index}`;
          
          addMessage(data.instanceId, {
            id: messageId,
            type: messageType as any,
            content: parsed.content,
            timestamp: new Date(),
            instanceId: data.instanceId
          });
          
          bufferInfo.lastMessageId = messageId;
        });
        
        // If no parsed messages, show raw (for debugging) only if it's new content
        if (newMessages.length === 0 && incrementalOutput.trim() && !data.isIncremental) {
          console.log('⚠️ No new parsed messages from incremental update');
          addMessage(data.instanceId, {
            id: `${data.instanceId}-raw-${Date.now()}`,
            type: 'assistant',
            content: ClaudeOutputParser.extractTextContent(incrementalOutput) || incrementalOutput,
            timestamp: new Date(),
            instanceId: data.instanceId
          });
        }
      }
    };

    const handleStatus = (data: any) => {
      if (data.instanceId) {
        updateInstanceStatus(data.instanceId, data.status);
        if (data.status === 'running') {
          setError(null);
        }
      }
    };

    const handleError = (data: any) => {
      setError(data.message || 'Connection error occurred');
      setConnectionType('Error');
    };

    // Register event handlers with singleton manager - prevents duplication
    addHandler('terminal:output', handleOutput);
    addHandler('message', handleOutput); // Handle both formats
    addHandler('instance:status', handleStatus);
    addHandler('error', handleError);
    addHandler('connect', (data) => {
      console.log('✅ SSE Connected:', data);
      setConnectionType('SSE Connected');
      setError(null);
    });
    addHandler('disconnect', (data) => {
      console.log('🔌 SSE Disconnected:', data);
      setConnectionType('Disconnected');
    });

    // Update connection type based on connection status
    if (isConnected) {
      setConnectionType('SSE Connected');
      setError(null);
    } else if (connectionError) {
      setConnectionType('Error');
      setError(connectionError);
    }

    return () => {
      // Cleanup handlers - singleton manager handles this automatically
      console.log('🧹 Cleaning up SSE handlers');
    };
  }, [isConnected, connectionError, addHandler, removeHandler]);

  const fetchInstances = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/claude/instances`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.instances)) {
          setInstances(data.instances);
        }
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
    }
  };

  const addMessage = (instanceId: string, message: Message) => {
    setMessages(prev => ({
      ...prev,
      [instanceId]: [...(prev[instanceId] || []), message]
    }));
  };

  const updateInstanceStatus = (instanceId: string, status: string) => {
    setInstances(prev => prev.map(instance => 
      instance.id === instanceId ? { ...instance, status: status as any } : instance
    ));
  };

  const createInstance = async (instanceType: string, command: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command,
          instanceType,
          usePty: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.instance) {
          setInstances(prev => [...prev, data.instance]);
          setSelectedInstance(data.instance.id);
          
          // Connect to SSE stream for this instance using singleton - prevents duplication
          connectToInstance(data.instance.id);
          
          // Add welcome message
          addMessage(data.instance.id, {
            id: `${data.instance.id}-welcome`,
            type: 'system',
            content: `🚀 Created ${instanceType} instance: ${data.instance.name}`,
            timestamp: new Date(),
            instanceId: data.instance.id
          });
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create instance');
      }
    } catch (error) {
      setError(`Failed to create instance: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedInstance) return;

    const message: Message = {
      id: `${selectedInstance}-user-${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: new Date(),
      instanceId: selectedInstance
    };

    // Add user message
    addMessage(selectedInstance, message);

    // Send to backend using singleton manager
    try {
      await sendCommand(selectedInstance, input);
    } catch (error) {
      console.error('Error sending message:', error);
      setError(`Failed to send message: ${error}`);
    }

    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Professional Button Component
  const ClaudeButton: React.FC<{
    onClick: () => void;
    title: string;
    description: string;
    icon: string;
    variant: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
    disabled?: boolean;
  }> = ({ onClick, title, description, icon, variant, disabled }) => {
    const baseClasses = "group relative overflow-hidden rounded-xl p-6 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
    
    const variantClasses = {
      primary: "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg",
      secondary: "bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg",
      tertiary: "bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg",
      quaternary: "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${variantClasses[variant]}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{icon}</span>
              <h3 className="font-semibold text-lg">{title}</h3>
            </div>
            <p className="text-sm opacity-90 leading-relaxed">{description}</p>
          </div>
        </div>
        
        {/* Shine effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </button>
    );
  };

  // Enhanced Message Component with better parsing display
  const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-slideIn`}>
        <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : isSystem 
              ? 'bg-gray-100 text-gray-700 border border-gray-200' 
              : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
        }`}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>
          <div className={`text-xs mt-2 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  const selectedInstanceData = instances.find(i => i.id === selectedInstance);
  const currentMessages = selectedInstance ? messages[selectedInstance] || [] : [];

  // Debug connection info
  const connectionStats = getAllConnections();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <h1 className="text-3xl font-bold mb-2">Claude Instance Manager (Fixed)</h1>
            <div className="flex items-center gap-4 text-blue-100">
              <span className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                Connection: {connectionType}
              </span>
              {selectedInstanceData && (
                <span className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    selectedInstanceData.status === 'running' ? 'bg-green-400' : 
                    selectedInstanceData.status === 'starting' ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></div>
                  {selectedInstanceData.name} ({selectedInstanceData.status})
                </span>
              )}
              <span className="text-xs">
                Connections: {connectionStats.activeConnections} | Handlers: {connectionStats.totalHandlers}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Instance Controls */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Create Claude Instance</h2>
              
              <div className="space-y-4">
                <ClaudeButton
                  onClick={() => createInstance('prod', ['claude'])}
                  title="prod/claude"
                  description="Production Claude instance in /prod directory"
                  icon="🏭"
                  variant="primary"
                  disabled={loading}
                />
                
                <ClaudeButton
                  onClick={() => createInstance('skip-permissions', ['claude', '--dangerously-skip-permissions'])}
                  title="skip-permissions"
                  description="Claude with permissions bypassed"
                  icon="⚡"
                  variant="secondary"
                  disabled={loading}
                />
                
                <ClaudeButton
                  onClick={() => createInstance('skip-permissions-c', ['claude', '--dangerously-skip-permissions', '-c'])}
                  title="skip-permissions -c"
                  description="Continue previous conversation"
                  icon="🔄"
                  variant="tertiary"
                  disabled={loading}
                />
                
                <ClaudeButton
                  onClick={() => createInstance('skip-permissions-resume', ['claude', '--dangerously-skip-permissions', '--resume'])}
                  title="skip-permissions --resume"
                  description="Resume previous session"
                  icon="▶️"
                  variant="quaternary"
                  disabled={loading}
                />
              </div>

              {/* Active Instances */}
              {instances.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Active Instances</h3>
                  <div className="space-y-2">
                    {instances.map(instance => (
                      <button
                        key={instance.id}
                        onClick={() => setSelectedInstance(instance.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedInstance === instance.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">{instance.name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            instance.status === 'running' ? 'bg-green-100 text-green-800' :
                            instance.status === 'starting' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {instance.status}
                          </span>
                        </div>
                        {instance.pid && (
                          <div className="text-sm text-gray-500 mt-1">
                            PID: {instance.pid}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chat Interface - Enhanced with better message handling */}
            <div className="lg:col-span-2 flex flex-col h-[600px]">
              {selectedInstance ? (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                    {currentMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <div className="text-4xl mb-4">💬</div>
                          <p className="text-lg">Ready to chat with Claude</p>
                          <p className="text-sm">Type your message below to get started</p>
                        </div>
                      </div>
                    ) : (
                      currentMessages.map(message => (
                        <MessageBubble key={message.id} message={message} />
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t bg-white">
                    <div className="flex gap-3">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message to Claude..."
                        className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={1}
                        style={{ minHeight: '50px', maxHeight: '150px' }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!input.trim() || loading}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors duration-200 font-medium"
                      >
                        Send
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Press Enter to send, Shift+Enter for new line
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🤖</div>
                    <p className="text-xl mb-2">No instance selected</p>
                    <p>Create or select a Claude instance to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <span className="text-red-500">⚠️</span>
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="mx-6 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span>Creating Claude instance...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ClaudeInstanceManagerModernFixed;