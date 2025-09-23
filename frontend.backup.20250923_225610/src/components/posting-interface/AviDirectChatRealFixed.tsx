/**
 * AviDirectChatReal - CORRECTED Real Claude Code Integration for Avi DM
 * Uses proper /api/claude/instances endpoints and ClaudeProcessManager integration
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Send,
  Bot,
  MessageCircle,
  Loader,
  AlertCircle,
  Settings,
  Wifi,
  WifiOff,
  Check,
  Terminal,
  Folder
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface AviMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  isStreaming?: boolean;
}

interface AviDirectChatRealProps {
  onMessageSent?: (message: any) => void;
  isMobile?: boolean;
  className?: string;
}

export const AviDirectChatReal: React.FC<AviDirectChatRealProps> = ({
  onMessageSent,
  isMobile = false,
  className
}) => {
  // State
  const [messages, setMessages] = useState<AviMessage[]>([]);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'offline'>('offline');

  // Refs
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Claude Code connection using CORRECT endpoints
  const connectToClaudeInstance = useCallback(async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Create Claude Code instance using CORRECT /api/claude/instances endpoint
      const response = await fetch('/api/claude/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Avi - Direct Message Assistant',
          workingDirectory: '/workspaces/agent-feed/prod',
          skipPermissions: true,
          resumeSession: true,
          metadata: {
            isAvi: true,
            purpose: 'direct-messaging',
            capabilities: ['code-review', 'debugging', 'architecture', 'general-assistance'],
            usesClaudeProcessManager: true
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to create Claude instance: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const instanceData = await response.json();
      console.log('Claude Code instance created:', instanceData);

      const newInstanceId = instanceData.data?.id || instanceData.id;

      if (!newInstanceId) {
        console.error('Invalid instance response structure:', instanceData);
        throw new Error('No instance ID returned from API');
      }

      setInstanceId(newInstanceId);

      // Initialize WebSocket connection for real-time communication
      await initializeWebSocketConnection(newInstanceId);

      // Mark as connected
      console.log('✅ Connected to Claude Code instance:', newInstanceId);
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionQuality('excellent');
      setError(null);

      // Add welcome message showing real integration
      setMessages([{
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Hello! I'm Avi, connected to a real Claude Code instance (${newInstanceId.slice(-8)}) running in /workspaces/agent-feed/prod.\n\nI can:\n🔍 Access your actual project files\n⚙️ Run real commands\n🔧 Debug and review code\n📁 Navigate your filesystem\n\nTry asking: "What files are in my directory?" or "Show me package.json"`,
        timestamp: new Date(),
        status: 'sent'
      }]);

    } catch (err) {
      console.error('Failed to connect to Claude instance:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(false);
      setConnectionQuality('offline');

      // Retry connection after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isConnected) {
          connectToClaudeInstance();
        }
      }, 5000);
    }
  }, [isConnecting, isConnected]);

  // Initialize WebSocket connection
  const initializeWebSocketConnection = useCallback(async (instanceId: string) => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/claude/${instanceId}`;

      console.log('Connecting WebSocket to:', wsUrl);
      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        websocket.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ WebSocket connected to Claude instance');
          setConnectionQuality('excellent');
          resolve();
        };

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error, event.data);
          }
        };

        websocket.onerror = (error) => {
          clearTimeout(timeout);
          console.error('WebSocket error:', error);
          setConnectionQuality('poor');
          // Don't reject here - continue with HTTP-only mode
          resolve();
        };

        websocket.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          setConnectionQuality('good'); // HTTP still works

          // Attempt to reconnect after delay
          setTimeout(() => {
            if (isConnected && instanceId) {
              initializeWebSocketConnection(instanceId);
            }
          }, 5000);
        };
      });

    } catch (wsError) {
      console.warn('WebSocket connection failed, using HTTP-only mode:', wsError);
      setConnectionQuality('good'); // HTTP still works
    }
  }, [isConnected]);

  // Handle WebSocket messages for streaming
  const handleWebSocketMessage = useCallback((data: any) => {
    console.log('WebSocket message received:', data);

    switch (data.type) {
      case 'message':
        // Complete message from Claude
        setMessages(prev => [...prev, {
          id: `claude-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
          status: 'sent'
        }]);
        setIsTyping(false);
        break;

      case 'streaming':
        // Streaming message chunk
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
            // Update existing streaming message
            return prev.map((msg, index) =>
              index === prev.length - 1
                ? { ...msg, content: msg.content + data.content }
                : msg
            );
          } else {
            // Start new streaming message
            return [...prev, {
              id: `claude-streaming-${Date.now()}`,
              role: 'assistant',
              content: data.content,
              timestamp: new Date(),
              status: 'sent',
              isStreaming: true
            }];
          }
        });
        setIsTyping(false);
        break;

      case 'stream_end':
        // Mark streaming as complete
        setMessages(prev => prev.map(msg =>
          msg.isStreaming ? { ...msg, isStreaming: false } : msg
        ));
        break;

      case 'error':
        setError(data.message || 'Claude Code error');
        setIsTyping(false);
        break;

      case 'typing':
        setIsTyping(true);
        break;

      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }, []);

  // Send message to Claude using CORRECT endpoints
  const sendMessage = useCallback(async () => {
    if (!message.trim() || !isConnected || !instanceId) {
      return;
    }

    const userMessage: AviMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
      status: 'sending'
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);

    // Clear input
    const messageContent = message.trim();
    setMessage('');
    setIsTyping(true);

    try {
      // Send message via CORRECT /api/claude/instances endpoint
      const response = await fetch(`/api/claude/instances/${instanceId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
          metadata: {
            source: 'avi-dm',
            timestamp: new Date().toISOString(),
            sessionType: 'real-claude-code'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Message failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const responseData = await response.json();
      console.log('Message response:', responseData);

      // Update message status to sent
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id
          ? { ...msg, status: 'sent' as const }
          : msg
      ));

      // Add Claude's response if not handled by WebSocket
      const claudeResponse = responseData.data?.response;
      if (claudeResponse?.content && !wsRef.current) {
        // HTTP-only mode - add response directly
        setMessages(prev => [...prev, {
          id: `claude-${Date.now()}`,
          role: 'assistant',
          content: claudeResponse.content,
          timestamp: new Date(),
          status: 'sent'
        }]);
      }

      setIsTyping(false);

      // Notify parent component
      onMessageSent?.({
        content: messageContent,
        timestamp: new Date(),
        instanceId,
        response: claudeResponse,
        realClaudeResponse: true
      });

    } catch (err) {
      console.error('Failed to send message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      setIsTyping(false);

      // Update message status to error
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id
          ? { ...msg, status: 'error' as const }
          : msg
      ));
    }
  }, [message, isConnected, instanceId, onMessageSent]);

  // Initialize connection on mount
  useEffect(() => {
    connectToClaudeInstance();

    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectToClaudeInstance]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = messageRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Connection quality indicator
  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
        return <Wifi className="w-3 h-3 text-green-400" />;
      case 'good':
        return <Wifi className="w-3 h-3 text-yellow-400" />;
      case 'poor':
        return <Wifi className="w-3 h-3 text-orange-400" />;
      default:
        return <WifiOff className="w-3 h-3 text-red-400" />;
    }
  };

  const getConnectionLabel = () => {
    if (isConnecting) return 'Connecting...';
    if (!isConnected) return 'Disconnected';

    const wsStatus = wsRef.current?.readyState === WebSocket.OPEN ? ' + WebSocket' : ' (HTTP)';
    return `Connected${wsStatus}`;
  };

  return (
    <div className={cn("flex flex-col h-full bg-white", className)} data-testid="avi-direct-chat-real">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 via-purple-700 to-pink-600" data-testid="avi-header">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl" data-testid="avi-avatar">
            🤖
          </div>
          <div className="text-white">
            <h3 className="font-semibold flex items-center space-x-2">
              <span>Avi - Real Claude Code</span>
              <Terminal className="w-4 h-4" />
            </h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1" data-testid="avi-status">
                {isConnecting ? (
                  <>
                    <Loader className="w-3 h-3 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    {getConnectionIcon()}
                    <span>{getConnectionLabel()}</span>
                  </>
                )}
              </div>
              {instanceId && (
                <span className="text-white/70 text-xs flex items-center space-x-1">
                  <Folder className="w-3 h-3" />
                  <span>/workspaces/agent-feed/prod</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setError(null)}
          className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4" data-testid="error-message">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-400 mr-3" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={connectToClaudeInstance}
              className="ml-auto text-red-600 hover:text-red-800 font-medium"
              data-testid="retry-button"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex max-w-xs lg:max-w-md",
              msg.role === 'user' ? "ml-auto" : "mr-auto"
            )}
            data-testid={`message-${msg.role}`}
          >
            <div
              className={cn(
                "px-4 py-2 rounded-lg",
                msg.role === 'user'
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              )}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              <div
                className={cn(
                  "flex items-center justify-between mt-1 text-xs",
                  msg.role === 'user' ? "text-blue-100" : "text-gray-500"
                )}
              >
                <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.role === 'user' && (
                  <div className="flex items-center space-x-1">
                    {msg.status === 'sending' && <Loader className="w-3 h-3 animate-spin" />}
                    {msg.status === 'sent' && <Check className="w-3 h-3" />}
                    {msg.status === 'error' && <AlertCircle className="w-3 h-3 text-red-300" />}
                  </div>
                )}
                {msg.isStreaming && (
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex mr-auto" data-testid="typing-indicator">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-xs text-gray-500 ml-2">Avi is processing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={messageRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !isConnected
                  ? 'Connecting to Avi...'
                  : 'Message Avi directly...'
              }
              disabled={!isConnected}
              className={cn(
                "w-full p-3 pr-12 border border-gray-300 rounded-lg resize-none",
                "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isMobile && "text-base" // Prevent zoom on mobile
              )}
              rows={1}
              maxLength={2000}
              data-testid="message-input"
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!message.trim() || !isConnected}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2",
              !message.trim() || !isConnected
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            )}
            data-testid="send-button"
          >
            <Send className="w-4 h-4" />
            {!isMobile && <span>Send</span>}
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          Press ⌘+Enter to send • Real Claude Code • Working Dir: /workspaces/agent-feed/prod
          {instanceId && ` • Instance: ${instanceId.slice(-8)}`}
        </div>
      </div>
    </div>
  );
};

export default AviDirectChatReal;