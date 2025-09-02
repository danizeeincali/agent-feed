/**
 * Frontend Enhancement Agent
 * SPARC Implementation - Enhanced DualModeInterface with proper WebSocket message handling
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import MessageInput from './MessageInput';
import { io, Socket } from 'socket.io-client';

interface ClaudeInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: Date;
}

interface SequencedChatMessage {
  id: string;
  sequenceId: number;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    instanceId: string;
    retryCount?: number;
    duration?: number;
    tokensUsed?: number;
  };
}

interface ToolUsageEvent {
  id: string;
  instanceId: string;
  toolName: string;
  operation: string;
  timestamp: Date;
  result?: {
    success: boolean;
    duration: number;
    output?: string;
  };
}

interface EnhancedDualModeInterfaceProps {
  selectedInstance: ClaudeInstance | null;
  connectionType: string;
  isConnected: boolean;
  onSendInput: (input: string) => void;
  onInstanceSelect: (instanceId: string) => void;
  instances: ClaudeInstance[];
  loading?: boolean;
  error?: string | null;
}

const EnhancedDualModeInterface: React.FC<EnhancedDualModeInterfaceProps> = ({
  selectedInstance,
  connectionType,
  isConnected,
  onSendInput,
  onInstanceSelect,
  instances,
  loading = false,
  error = null
}) => {
  const [viewMode, setViewMode] = useState<'chat' | 'terminal' | 'split'>('split');
  const [chatMessages, setChatMessages] = useState<SequencedChatMessage[]>([]);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [toolEvents, setToolEvents] = useState<ToolUsageEvent[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const lastSequenceId = useRef<number>(0);

  // Enhanced WebSocket connection management
  useEffect(() => {
    if (!selectedInstance || selectedInstance.status !== 'running') {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnectionStatus('disconnected');
      }
      return;
    }

    setConnectionStatus('connecting');

    const newSocket = io('/api/claude/instances/chat', {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
      
      // Join instance room
      newSocket.emit('join_instance', { instanceId: selectedInstance.id });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('disconnected');
    });

    // Message event handlers
    newSocket.on('instance_joined', (data) => {
      console.log('Joined instance:', data.instanceId);
    });

    // Enhanced sequenced message handling
    newSocket.on('claude_message', (data) => {
      if (data.message && data.instanceId === selectedInstance.id) {
        const message: SequencedChatMessage = {
          id: data.message.id,
          sequenceId: data.message.sequenceId || Date.now(),
          type: data.message.type === 'user' ? 'user' : 'assistant',
          content: data.message.content,
          timestamp: new Date(data.message.timestamp),
          metadata: {
            instanceId: data.instanceId,
            ...data.message.metadata
          }
        };

        setChatMessages(prev => {
          // Insert message in sequence order
          const newMessages = [...prev];
          const insertIndex = newMessages.findIndex(m => m.sequenceId > message.sequenceId);
          
          if (insertIndex === -1) {
            newMessages.push(message);
          } else {
            newMessages.splice(insertIndex, 0, message);
          }

          // Update last sequence ID
          lastSequenceId.current = Math.max(lastSequenceId.current, message.sequenceId);
          
          return newMessages;
        });
      }
    });

    // Tool usage event handling (terminal only)
    newSocket.on('tool_usage', (data) => {
      if (data.instanceId === selectedInstance.id) {
        const toolEvent: ToolUsageEvent = {
          id: data.id,
          instanceId: data.instanceId,
          toolName: data.toolName,
          operation: data.operation,
          timestamp: new Date(data.timestamp),
          result: data.result
        };

        setToolEvents(prev => [toolEvent, ...prev.slice(0, 49)]); // Keep last 50 events
      }
    });

    // Error handling
    newSocket.on('error', (errorData) => {
      console.error('WebSocket error:', errorData.error);
      // Don't add errors to chat messages - they go to terminal only
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [selectedInstance]);

  // Auto-scroll both views
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput, toolEvents]);

  // Enhanced message sending with sequencing
  const handleSendMessage = useCallback((message: string) => {
    if (!message.trim() || !selectedInstance || !socket || connectionStatus !== 'connected') {
      return;
    }

    const sequenceId = lastSequenceId.current + 1;
    const userMessage: SequencedChatMessage = {
      id: `user-${Date.now()}-${sequenceId}`,
      sequenceId,
      type: 'user',
      content: message,
      timestamp: new Date(),
      metadata: {
        instanceId: selectedInstance.id
      }
    };

    // Add user message to chat immediately
    setChatMessages(prev => [...prev, userMessage]);
    lastSequenceId.current = sequenceId;

    // Send to WebSocket with sequence ID
    socket.emit('send_message', {
      instanceId: selectedInstance.id,
      content: message,
      metadata: {
        sequenceId,
        timestamp: userMessage.timestamp.toISOString()
      }
    });

    // Also send to legacy handler for backward compatibility
    onSendInput(message);
  }, [selectedInstance, socket, connectionStatus, onSendInput]);

  // Generate terminal output with tool events
  const terminalContent = useMemo(() => {
    let content = terminalOutput;
    
    // Add tool usage events to terminal output
    const sortedEvents = [...toolEvents].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (sortedEvents.length > 0) {
      const toolOutput = sortedEvents.map(event => {
        const timestamp = event.timestamp.toLocaleTimeString();
        const status = event.result ? 
          (event.result.success ? 'SUCCESS' : 'FAILED') : 
          'RUNNING';
        const duration = event.result?.duration ? ` (${event.result.duration}ms)` : '';
        
        let line = `[TOOL] ${timestamp} | ${event.toolName} -> ${event.operation} [${status}]${duration}`;
        
        if (event.result?.output) {
          const output = event.result.output.length > 100 ? 
            `${event.result.output.slice(0, 97)}...` : 
            event.result.output;
          line += `\n  Output: ${output}`;
        }
        
        return line;
      }).join('\n');
      
      if (content) {
        content += '\n\n--- Tool Usage ---\n' + toolOutput;
      } else {
        content = '--- Tool Usage ---\n' + toolOutput;
      }
    }
    
    return content;
  }, [terminalOutput, toolEvents]);

  const getConnectionStatusBadge = () => {
    if (error) return { variant: 'destructive' as const, text: 'Error' };
    if (connectionStatus === 'disconnected') return { variant: 'outline' as const, text: 'Disconnected' };
    if (connectionStatus === 'connecting') return { variant: 'outline' as const, text: 'Connecting' };
    return { variant: 'default' as const, text: 'Connected' };
  };

  const statusBadge = getConnectionStatusBadge();

  if (!selectedInstance) {
    return (
      <Card className="flex flex-col h-full">
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Instance Selected
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Select a Claude Code instance to start the enhanced dual-mode interface.
            </p>
            {instances.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 mb-2">Available instances:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {instances.map(instance => (
                    <Button
                      key={instance.id}
                      onClick={() => onInstanceSelect(instance.id)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        instance.status === 'running' && 'bg-green-500',
                        instance.status === 'starting' && 'bg-yellow-500',
                        instance.status === 'stopped' && 'bg-gray-400',
                        instance.status === 'error' && 'bg-red-500'
                      )} />
                      {instance.id.slice(0, 8)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Enhanced Header with Connection Status */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                selectedInstance.status === 'running' && connectionStatus === 'connected' && 'bg-green-500 animate-pulse',
                selectedInstance.status === 'running' && connectionStatus === 'connecting' && 'bg-yellow-500 animate-bounce',
                selectedInstance.status === 'starting' && 'bg-yellow-500 animate-bounce',
                selectedInstance.status === 'stopped' && 'bg-gray-400',
                selectedInstance.status === 'error' && 'bg-red-500 animate-pulse'
              )} />
              <span className="font-semibold">{selectedInstance.name}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {selectedInstance.id.slice(0, 8)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Seq: {lastSequenceId.current}
            </Badge>
          </div>
          
          <Badge variant={statusBadge.variant} className="text-xs">
            <div className={cn(
              'w-1.5 h-1.5 rounded-full mr-1.5',
              connectionStatus === 'connected' ? 'bg-current animate-pulse' : 'bg-current'
            )} />
            {statusBadge.text}
          </Badge>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View Mode:</span>
          <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
            {[
              { mode: 'chat' as const, label: 'Chat Only', icon: '💬' },
              { mode: 'terminal' as const, label: 'Terminal Only', icon: '⚡' },
              { mode: 'split' as const, label: 'Split View', icon: '🔄' }
            ].map(({ mode, label, icon }) => (
              <Button
                key={mode}
                onClick={() => setViewMode(mode)}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                className="text-xs"
              >
                {icon} {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex",
        viewMode === 'split' ? 'flex-row' : 'flex-col'
      )}>
        {/* Enhanced Chat Interface */}
        {(viewMode === 'chat' || viewMode === 'split') && (
          <div className={cn(
            "flex flex-col",
            viewMode === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'flex-1'
          )}>
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                💬 AI Conversation (Sequenced Messages)
              </h3>
            </div>
            
            {/* Sequenced Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <p>Start a conversation with Claude AI</p>
                  <p className="text-xs mt-1">Messages are now properly sequenced and reliable</p>
                </div>
              )}
              
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2 relative",
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  )}>
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                      <p className="text-xs opacity-60">
                        #{message.sequenceId}
                      </p>
                    </div>
                    {message.metadata?.retryCount && message.metadata.retryCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {message.metadata.retryCount}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatMessagesEndRef} />
            </div>
            
            {/* Enhanced Chat Input */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              <MessageInput
                onSendMessage={handleSendMessage}
                disabled={connectionStatus !== 'connected' || selectedInstance.status !== 'running' || loading}
                placeholder={
                  connectionStatus === 'connecting' ? 'Connecting...' :
                  connectionStatus === 'disconnected' ? 'Not connected...' :
                  selectedInstance.status !== 'running' ? 'Instance not ready...' :
                  loading ? 'Please wait...' :
                  'Type your message to Claude AI...'
                }
                showTypingIndicator={loading}
              />
            </div>
          </div>
        )}

        {/* Enhanced Terminal Monitor with Tool Events */}
        {(viewMode === 'terminal' || viewMode === 'split') && (
          <div className={cn(
            "flex flex-col",
            viewMode === 'split' ? 'w-1/2' : 'flex-1'
          )}>
            <div className="bg-gray-900 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-green-400">
                ⚡ Terminal Monitor + Tool Usage
              </h3>
              <div className="text-xs text-gray-400">
                Tools: {toolEvents.length}
              </div>
            </div>
            
            {/* Terminal Output with Tool Events */}
            <div className="flex-1 bg-black text-green-400 font-mono text-sm overflow-y-auto p-4">
              {terminalContent ? (
                <pre className="whitespace-pre-wrap break-words">
                  {terminalContent}
                </pre>
              ) : (
                <div className="text-gray-600">
                  <p>Waiting for Claude Code output and tool usage...</p>
                  <p className="text-xs mt-1">Raw terminal stream and tool events will appear here</p>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Error Display */}
      {error && (
        <div className="flex-shrink-0 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 p-3">
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDualModeInterface;
export type { EnhancedDualModeInterfaceProps, SequencedChatMessage, ToolUsageEvent };