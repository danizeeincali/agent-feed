import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import MessageInput from './MessageInput';

interface ClaudeInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: Date;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface DualModeInterfaceProps {
  selectedInstance: ClaudeInstance | null;
  output: { [key: string]: string };
  connectionType: string;
  isConnected: boolean;
  onSendInput: (input: string) => void;
  onInstanceSelect: (instanceId: string) => void;
  instances: ClaudeInstance[];
  loading?: boolean;
  error?: string | null;
}

const DualModeInterface: React.FC<DualModeInterfaceProps> = ({
  selectedInstance,
  output,
  connectionType,
  isConnected,
  onSendInput,
  onInstanceSelect,
  instances,
  loading = false,
  error = null
}) => {
  const [viewMode, setViewMode] = useState<'chat' | 'terminal' | 'split'>('split');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [terminalOutput, setTerminalOutput] = useState('');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Process raw terminal output into chat messages and terminal stream
  useEffect(() => {
    if (!selectedInstance) return;
    
    const rawOutput = output[selectedInstance.id] || '';
    setTerminalOutput(rawOutput);
    
    // Extract AI responses from terminal output for chat view
    const lines = rawOutput.split('\n');
    const newMessages: ChatMessage[] = [];
    
    lines.forEach((line, index) => {
      // Look for Claude AI responses (longer, meaningful content)
      if (line.length > 30 && 
          !line.includes('Debug Info') && 
          !line.includes('SPARC:') &&
          !line.includes('WebSocket') &&
          (line.includes('Claude') || line.toLowerCase().includes('ai') || 
           line.includes('assist') || line.includes('help'))) {
        
        newMessages.push({
          id: `ai-${index}`,
          type: 'assistant',
          content: line.trim(),
          timestamp: new Date()
        });
      }
    });
    
    setChatMessages(prev => {
      // Merge with existing messages, avoiding duplicates
      const existingIds = new Set(prev.map(m => m.id));
      const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
      return [...prev, ...uniqueNew];
    });
  }, [output, selectedInstance]);

  // Auto-scroll both views
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, terminalOutput]);

  const handleSendMessage = (message: string) => {
    if (message.trim() && selectedInstance) {
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: message,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, userMessage]);
      
      // Send to Claude Code
      onSendInput(message);
    }
  };

  const getConnectionStatusBadge = () => {
    if (error) return { variant: 'destructive' as const, text: 'Error' };
    if (!isConnected) return { variant: 'outline' as const, text: 'Disconnected' };
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
              Select a Claude Code instance to start the dual-mode interface.
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
      {/* Header with Mode Selector */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                selectedInstance.status === 'running' && 'bg-green-500 animate-pulse',
                selectedInstance.status === 'starting' && 'bg-yellow-500 animate-bounce',
                selectedInstance.status === 'stopped' && 'bg-gray-400',
                selectedInstance.status === 'error' && 'bg-red-500 animate-pulse'
              )} />
              <span className="font-semibold">{selectedInstance.name}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {selectedInstance.id.slice(0, 8)}
            </Badge>
          </div>
          
          <Badge variant={statusBadge.variant} className="text-xs">
            <div className={cn(
              'w-1.5 h-1.5 rounded-full mr-1.5',
              isConnected ? 'bg-current animate-pulse' : 'bg-current'
            )} />
            {statusBadge.text}
          </Badge>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View Mode:</span>
          <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
            {[
              { mode: 'chat' as const, label: 'Chat', icon: '💬' },
              { mode: 'terminal' as const, label: 'Terminal', icon: '⚡' },
              { mode: 'split' as const, label: 'Both', icon: '🔄' }
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
        {/* Chat Interface */}
        {(viewMode === 'chat' || viewMode === 'split') && (
          <div className={cn(
            "flex flex-col",
            viewMode === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'flex-1'
          )}>
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                💬 AI Conversation
              </h3>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <p>Start a conversation with Claude AI</p>
                  <p className="text-xs mt-1">Type your message below</p>
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
                    "max-w-[80%] rounded-lg px-4 py-2",
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  )}>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatMessagesEndRef} />
            </div>
            
            {/* Chat Input */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              <MessageInput
                onSendMessage={handleSendMessage}
                disabled={!isConnected || selectedInstance.status !== 'running' || loading}
                placeholder={
                  !isConnected ? 'Not connected...' :
                  selectedInstance.status !== 'running' ? 'Instance not ready...' :
                  loading ? 'Please wait...' :
                  'Type your message to Claude AI...'
                }
                showTypingIndicator={loading}
              />
            </div>
          </div>
        )}

        {/* Terminal Monitor */}
        {(viewMode === 'terminal' || viewMode === 'split') && (
          <div className={cn(
            "flex flex-col",
            viewMode === 'split' ? 'w-1/2' : 'flex-1'
          )}>
            <div className="bg-gray-900 px-4 py-2 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-green-400">
                ⚡ Terminal Monitor
              </h3>
            </div>
            
            {/* Terminal Output */}
            <div className="flex-1 bg-black text-green-400 font-mono text-sm overflow-y-auto p-4">
              {terminalOutput ? (
                <pre className="whitespace-pre-wrap break-words">
                  {terminalOutput}
                </pre>
              ) : (
                <div className="text-gray-600">
                  <p>Waiting for Claude Code output...</p>
                  <p className="text-xs mt-1">Raw terminal stream will appear here</p>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        )}
      </div>

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

export default DualModeInterface;
export type { DualModeInterfaceProps, ChatMessage };