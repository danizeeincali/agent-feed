import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface ClaudeInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: Date;
}

interface ChatInterfaceProps {
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

const ChatInterface: React.FC<ChatInterfaceProps> = ({
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
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output, selectedInstance?.id]);

  const handleSendMessage = (message: string) => {
    if (message.trim() && selectedInstance) {
      onSendInput(message);
      setInput('');
    }
  };

  const getConnectionStatusColor = () => {
    if (error) return 'text-red-500';
    if (!isConnected) return 'text-gray-400';
    if (connectionType.toLowerCase().includes('sse')) return 'text-green-500';
    if (connectionType.toLowerCase().includes('polling')) return 'text-yellow-500';
    return 'text-blue-500';
  };

  const getConnectionStatusBadge = () => {
    if (error) return { variant: 'destructive' as const, text: 'Error' };
    if (!isConnected) return { variant: 'outline' as const, text: 'Disconnected' };
    if (connectionType.toLowerCase().includes('sse')) return { variant: 'default' as const, text: 'SSE Connected' };
    if (connectionType.toLowerCase().includes('polling')) return { variant: 'secondary' as const, text: 'Polling' };
    return { variant: 'default' as const, text: 'Connected' };
  };

  const statusBadge = getConnectionStatusBadge();

  return (
    <Card className="flex flex-col h-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-lg">
      {/* Header */}
      <CardHeader className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {selectedInstance ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    selectedInstance.status === 'running' && 'bg-green-500 animate-pulse',
                    selectedInstance.status === 'starting' && 'bg-yellow-500 animate-bounce',
                    selectedInstance.status === 'stopped' && 'bg-gray-400',
                    selectedInstance.status === 'error' && 'bg-red-500 animate-pulse'
                  )} />
                  <span>{selectedInstance.name}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {selectedInstance.id.slice(0, 8)}
                </Badge>
              </div>
            ) : (
              'Select an Instance'
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant={statusBadge.variant} className="text-xs">
              <div className={cn(
                'w-1.5 h-1.5 rounded-full mr-1.5',
                isConnected ? 'bg-current animate-pulse' : 'bg-current'
              )} />
              {statusBadge.text}
            </Badge>
            
            {instances.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {instances.filter(i => i.status === 'running').length}/{instances.length} active
              </Badge>
            )}
          </div>
        </div>
        
        {selectedInstance && selectedInstance.status === 'starting' && (
          <div className="mt-2 flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            Instance is starting up...
          </div>
        )}
        
        {error && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
      </CardHeader>

      {/* Chat Area */}
      <CardContent className="flex-1 p-0 flex flex-col">
        {selectedInstance ? (
          <>
            {/* Messages */}
            <MessageList
              instanceId={selectedInstance.id}
              output={output[selectedInstance.id] || ''}
              connectionType={connectionType}
              isConnected={isConnected}
            />
            
            {/* Input */}
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={!isConnected || selectedInstance.status !== 'running' || loading}
              placeholder={
                !isConnected ? 'Not connected...' :
                selectedInstance.status !== 'running' ? 'Instance not ready...' :
                loading ? 'Please wait...' :
                'Type your command and press Enter...'
              }
              showTypingIndicator={loading}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Instance Selected
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Select an instance from the list or launch a new one to start chatting with Claude.
              </p>
              
              {instances.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">Available instances:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {instances.map(instance => (
                      <button
                        key={instance.id}
                        onClick={() => onInstanceSelect(instance.id)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          instance.status === 'running' && 'bg-green-500',
                          instance.status === 'starting' && 'bg-yellow-500',
                          instance.status === 'stopped' && 'bg-gray-400',
                          instance.status === 'error' && 'bg-red-500'
                        )} />
                        {instance.id.slice(0, 8)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <div ref={messagesEndRef} />
    </Card>
  );
};

export default ChatInterface;
export type { ChatInterfaceProps };