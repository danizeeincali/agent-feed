/**
 * AviDirectChatReal - Production-Ready Claude Code Integration for Avi DM
 * Bulletproof implementation with comprehensive error handling and connection retry logic
 *
 * Features:
 * - Exponential backoff retry with jitter
 * - Robust WebSocket/SSE error handling
 * - Connection state management with recovery
 * - Memory leak prevention
 * - Production-ready error boundaries
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
  RefreshCw,
  Shield
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { safeApiCall, safePost, apiCache } from '@/utils/apiSafety';
import { captureError, captureNetworkError, captureAsyncError } from '@/utils/errorHandling';
import { safeObject, safeString, safeHandler, isDefined } from '@/utils/safetyUtils';

// Connection States for robust state management
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  DEGRADED = 'degraded'
}

interface AviMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error' | 'retry';
  isStreaming?: boolean;
  retryCount?: number;
  errorDetails?: string;
}

interface ConnectionMetrics {
  connectionAttempts: number;
  successfulConnections: number;
  totalMessages: number;
  errorCount: number;
  lastConnected: Date | null;
  uptime: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
}

interface AviDirectChatRealProps {
  onMessageSent?: (message: any) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onError?: (error: Error, context?: any) => void;
  isMobile?: boolean;
  className?: string;
  retryConfig?: Partial<RetryConfig>;
  enableMetrics?: boolean;
}

export const AviDirectChatReal: React.FC<AviDirectChatRealProps> = ({
  onMessageSent,
  onConnectionStateChange,
  onError,
  isMobile = false,
  className,
  retryConfig,
  enableMetrics = true
}) => {
  // Retry configuration with exponential backoff
  const defaultRetryConfig: RetryConfig = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    jitterFactor: 0.1
  };
  const finalRetryConfig = { ...defaultRetryConfig, ...retryConfig };

  // Core State
  const [messages, setMessages] = useState<AviMessage[]>([]);
  const [message, setMessage] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);

  // Connection Management State
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState<Date | null>(null);
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics>({
    connectionAttempts: 0,
    successfulConnections: 0,
    totalMessages: 0,
    errorCount: 0,
    lastConnected: null,
    uptime: 0
  });

  // Refs for cleanup and state management
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastHeartbeatRef = useRef<Date>(new Date());
  const connectionStartTimeRef = useRef<Date | null>(null);

  // Utility functions for robust error handling
  const updateConnectionState = useCallback((newState: ConnectionState, errorMessage?: string) => {
    if (!isMountedRef.current) return;

    setConnectionState(prevState => {
      if (prevState !== newState) {
        console.log(`[AviDirectChat] Connection state: ${prevState} → ${newState}`);
        onConnectionStateChange?.(newState);
      }
      return newState;
    });

    if (errorMessage) {
      setError(errorMessage);
    } else if (newState === ConnectionState.CONNECTED) {
      setError(null);
    }
  }, [onConnectionStateChange]);

  const updateMetrics = useCallback((update: Partial<ConnectionMetrics>) => {
    if (!enableMetrics || !isMountedRef.current) return;

    setConnectionMetrics(prev => ({ ...prev, ...update }));
  }, [enableMetrics]);

  // Calculate retry delay with exponential backoff and jitter
  const calculateRetryDelay = useCallback((attempt: number): number => {
    const exponentialDelay = Math.min(
      finalRetryConfig.baseDelay * Math.pow(2, attempt),
      finalRetryConfig.maxDelay
    );
    const jitter = exponentialDelay * finalRetryConfig.jitterFactor * Math.random();
    return exponentialDelay + jitter;
  }, [finalRetryConfig]);

  // Safe cleanup function
  const cleanupConnection = useCallback(() => {
    console.log('[AviDirectChat] Cleaning up connection resources');

    // Clear timers
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Close EventSource
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (error) {
        console.warn('[AviDirectChat] Error closing EventSource:', error);
      }
      eventSourceRef.current = null;
    }
  }, []);

  // Enhanced SSE message handler with error boundaries
  const handleSSEMessage = useCallback((event: MessageEvent) => {
    if (!isMountedRef.current) return;

    try {
      const data = safeObject(JSON.parse(event.data));
      lastHeartbeatRef.current = new Date();

      updateMetrics({ totalMessages: connectionMetrics.totalMessages + 1 });

      // Handle different message types
      if (data.type === 'output' && data.output?.trim()) {
        setMessages(prev => [...prev, {
          id: `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: safeString(data.output),
          timestamp: new Date(),
          status: 'sent'
        }]);
        setIsTyping(false);
      } else if (data.type === 'heartbeat') {
        // Connection health check - no action needed
        console.debug('[AviDirectChat] Heartbeat received');
      } else if (data.type === 'error') {
        const errorMsg = safeString(data.message, 'Unknown server error');
        captureError(new Error(`SSE Error: ${errorMsg}`), {
          category: 'network',
          context: { instanceId, data }
        });
        setError(errorMsg);
      }

    } catch (parseError) {
      const error = parseError instanceof Error ? parseError : new Error('SSE parse error');
      captureError(error, {
        category: 'network',
        context: { eventData: event.data, instanceId }
      });
      console.error('[AviDirectChat] SSE parsing error:', error);
    }
  }, [instanceId, connectionMetrics.totalMessages, updateMetrics]);

  // Robust SSE error handler
  const handleSSEError = useCallback((event: Event) => {
    if (!isMountedRef.current) return;

    console.warn('[AviDirectChat] SSE connection error:', event);

    const eventSource = eventSourceRef.current;
    if (!eventSource) return;

    // Handle different EventSource states
    if (eventSource.readyState === EventSource.CONNECTING) {
      console.log('[AviDirectChat] SSE reconnecting...');
      updateConnectionState(ConnectionState.RECONNECTING);
      return;
    }

    if (eventSource.readyState === EventSource.CLOSED) {
      console.log('[AviDirectChat] SSE connection closed');
      updateConnectionState(ConnectionState.DISCONNECTED, 'Connection closed by server');

      // Attempt reconnection if within retry limits
      if (retryAttempt < finalRetryConfig.maxRetries) {
        scheduleRetry();
      } else {
        updateConnectionState(ConnectionState.ERROR, 'Max retry attempts reached');
        updateMetrics({ errorCount: connectionMetrics.errorCount + 1 });
      }
    }
  }, [retryAttempt, finalRetryConfig.maxRetries, connectionMetrics.errorCount, updateMetrics, updateConnectionState]);

  // Schedule retry with exponential backoff
  const scheduleRetry = useCallback(() => {
    if (!isMountedRef.current || retryAttempt >= finalRetryConfig.maxRetries) return;

    const delay = calculateRetryDelay(retryAttempt);
    console.log(`[AviDirectChat] Scheduling retry ${retryAttempt + 1}/${finalRetryConfig.maxRetries} in ${delay}ms`);

    setRetryAttempt(prev => prev + 1);
    updateConnectionState(ConnectionState.RECONNECTING, `Retrying in ${Math.ceil(delay / 1000)}s...`);

    retryTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        connectToClaudeInstance();
      }
    }, delay);
  }, [retryAttempt, finalRetryConfig.maxRetries, calculateRetryDelay]);

  // Create Claude instance with robust error handling
  const createClaudeInstance = useCallback(async (): Promise<string> => {
    updateMetrics({ connectionAttempts: connectionMetrics.connectionAttempts + 1 });

    const result = await safePost<any>('/api/claude/instances', {
      command: 'claude',
      instanceType: 'code',
      workingDirectory: '/workspaces/agent-feed/prod',
      usePty: true
    }, {
      timeout: 15000,
      retries: 2,
      validateResponse: (data) => {
        const responseData = safeObject(data);
        const id = responseData.data?.id || responseData.id;
        return isDefined(id) && typeof id === 'string' && id.length > 0;
      },
      onError: (error) => {
        captureNetworkError(error, '/api/claude/instances', 'POST');
        onError?.(error, { operation: 'create_instance' });
      }
    });

    if (!result.isSuccess || !result.data) {
      const errorMsg = result.error?.message || 'Failed to create Claude instance';
      throw new Error(errorMsg);
    }

    const newInstanceId = result.data.data?.id || result.data.id;

    if (!newInstanceId || typeof newInstanceId !== 'string') {
      throw new Error('Invalid instance ID received from server');
    }

    return newInstanceId;
  }, [connectionMetrics.connectionAttempts, updateMetrics, onError]);

  // Setup SSE connection with comprehensive error handling
  const setupSSEConnection = useCallback(async (instanceId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const sseUrl = `/api/claude/instances/${instanceId}/terminal/stream`;
        console.log('[AviDirectChat] Setting up SSE connection:', sseUrl);

        const eventSource = new EventSource(sseUrl, {
          withCredentials: false
        });

        eventSourceRef.current = eventSource;

        // Connection timeout
        const connectionTimeout = setTimeout(() => {
          eventSource.close();
          reject(new Error('SSE connection timeout'));
        }, 15000);

        eventSource.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('[AviDirectChat] SSE connection established');

          updateConnectionState(ConnectionState.CONNECTED);
          setRetryAttempt(0); // Reset retry counter on successful connection
          connectionStartTimeRef.current = new Date();

          updateMetrics({
            successfulConnections: connectionMetrics.successfulConnections + 1,
            lastConnected: new Date()
          });

          // Start heartbeat monitoring
          heartbeatIntervalRef.current = setInterval(() => {
            const timeSinceLastHeartbeat = Date.now() - lastHeartbeatRef.current.getTime();
            if (timeSinceLastHeartbeat > 120000) { // 2 minutes
              console.warn('[AviDirectChat] Heartbeat timeout detected');
              updateConnectionState(ConnectionState.DEGRADED, 'Connection may be unstable');
            }
          }, 30000); // Check every 30 seconds

          resolve();
        };

        eventSource.onmessage = handleSSEMessage;
        eventSource.onerror = (event) => {
          clearTimeout(connectionTimeout);
          handleSSEError(event);
        };

      } catch (error) {
        const err = error instanceof Error ? error : new Error('SSE setup failed');
        captureError(err, {
          category: 'network',
          context: { instanceId, operation: 'sse_setup' }
        });
        reject(err);
      }
    });
  }, [handleSSEMessage, handleSSEError, updateConnectionState, updateMetrics, connectionMetrics.successfulConnections]);

  // Main connection function with comprehensive error handling
  const connectToClaudeInstance = useCallback(async () => {
    if (connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.CONNECTED) {
      console.log('[AviDirectChat] Connection already in progress or established');
      return;
    }

    try {
      updateConnectionState(ConnectionState.CONNECTING);
      setLastConnectionAttempt(new Date());

      // Step 1: Create Claude instance
      const newInstanceId = await createClaudeInstance();
      setInstanceId(newInstanceId);

      console.log('[AviDirectChat] Created Claude instance:', newInstanceId);

      // Step 2: Setup SSE connection
      await setupSSEConnection(newInstanceId);

      console.log('[AviDirectChat] Successfully connected to Claude instance');

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Connection failed');

      console.error('[AviDirectChat] Connection failed:', err);

      captureAsyncError(err, 'claude_instance_connection');
      onError?.(err, { instanceId, retryAttempt });

      updateConnectionState(ConnectionState.ERROR, err.message);
      updateMetrics({ errorCount: connectionMetrics.errorCount + 1 });

      // Schedule retry if within limits
      if (retryAttempt < finalRetryConfig.maxRetries) {
        scheduleRetry();
      }
    }
  }, [connectionState, createClaudeInstance, setupSSEConnection, instanceId, retryAttempt, finalRetryConfig.maxRetries, scheduleRetry, onError, updateConnectionState, updateMetrics, connectionMetrics.errorCount]);

  // Force reconnection with cleanup
  const forceReconnect = useCallback(() => {
    console.log('[AviDirectChat] Force reconnecting...');

    cleanupConnection();
    setRetryAttempt(0);
    setError(null);

    // Clear cache to force fresh instance creation
    apiCache.delete('/api/claude/instances');

    setTimeout(() => {
      if (isMountedRef.current) {
        connectToClaudeInstance();
      }
    }, 1000);
  }, [cleanupConnection, connectToClaudeInstance]);

  // Enhanced message sending with retry logic
  const sendMessage = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || connectionState !== ConnectionState.CONNECTED || !instanceId) {
      console.warn('[AviDirectChat] Cannot send message:', {
        hasMessage: !!trimmedMessage,
        connectionState,
        instanceId: !!instanceId
      });
      return;
    }

    const userMessage: AviMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
      status: 'sending',
      retryCount: 0
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    try {
      // Send message with robust error handling
      const result = await safePost<any>(
        `/api/claude/instances/${instanceId}/terminal/input`,
        { input: trimmedMessage + '\n' },
        {
          timeout: 30000,
          retries: 2,
          validateResponse: (data) => {
            const responseData = safeObject(data);
            return responseData.success === true || responseData.data !== undefined;
          },
          onRetry: (attempt, error) => {
            console.log(`[AviDirectChat] Retrying message send, attempt ${attempt}:`, error.message);

            // Update message status to show retry
            setMessages(prev => prev.map(msg =>
              msg.id === userMessage.id
                ? {
                  ...msg,
                  status: 'retry' as const,
                  retryCount: attempt,
                  errorDetails: `Retry ${attempt}: ${error.message}`
                }
                : msg
            ));
          },
          onError: (error) => {
            captureNetworkError(error, `/api/claude/instances/${instanceId}/terminal/input`, 'POST');
          }
        }
      );

      if (!result.isSuccess) {
        throw result.error || new Error('Failed to send message');
      }

      console.log('[AviDirectChat] Message sent successfully:', result.data);

      // Update message status to sent
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id
          ? { ...msg, status: 'sent' as const, errorDetails: undefined }
          : msg
      ));

      setIsTyping(false);

      // Notify parent component with safe data
      const notificationData = {
        content: trimmedMessage,
        timestamp: new Date(),
        instanceId,
        response: safeObject(result.data?.data),
        success: true
      };

      safeHandler(() => onMessageSent?.(notificationData), () => {
        console.warn('[AviDirectChat] onMessageSent handler failed');
      })();

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown send error');

      console.error('[AviDirectChat] Failed to send message:', err);

      captureAsyncError(err, 'message_send');
      onError?.(err, { messageId: userMessage.id, instanceId });

      setIsTyping(false);

      // Update message status to error with details
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id
          ? {
            ...msg,
            status: 'error' as const,
            errorDetails: err.message
          }
          : msg
      ));

      // Show user-friendly error
      setError(`Failed to send message: ${err.message}`);

      // If connection seems broken, trigger reconnection
      if (err.message.includes('timeout') || err.message.includes('network') || err.message.includes('fetch')) {
        updateConnectionState(ConnectionState.DEGRADED, 'Connection issues detected');
      }
    }
  }, [message, connectionState, instanceId, onMessageSent, onError, updateConnectionState]);

  // Component lifecycle management
  useEffect(() => {
    console.log('[AviDirectChat] Component mounting, initializing connection...');

    // Initialize connection
    connectToClaudeInstance();

    return () => {
      console.log('[AviDirectChat] Component unmounting, cleaning up...');
      isMountedRef.current = false;
      cleanupConnection();
    };
  }, []); // Empty dependency array to run only on mount

  // Update uptime metrics
  useEffect(() => {
    if (!enableMetrics || connectionState !== ConnectionState.CONNECTED || !connectionStartTimeRef.current) {
      return;
    }

    const updateUptime = () => {
      if (connectionStartTimeRef.current && isMountedRef.current) {
        const uptime = Date.now() - connectionStartTimeRef.current.getTime();
        updateMetrics({ uptime: Math.floor(uptime / 1000) });
      }
    };

    // Update uptime every 30 seconds
    const uptimeInterval = setInterval(updateUptime, 30000);

    return () => clearInterval(uptimeInterval);
  }, [connectionState, enableMetrics, updateMetrics]);

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

  return (
    <div className={cn("flex flex-col h-full bg-white", className)} data-testid="avi-direct-chat">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600" data-testid="avi-header">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl" data-testid="avi-avatar">
            🤖
          </div>
          <div className="text-white">
            <h3 className="font-semibold">Avi - AI Assistant</h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1" data-testid="avi-status">
                {connectionState === ConnectionState.CONNECTING && (
                  <>
                    <Loader className="w-3 h-3 animate-spin" />
                    <span>Connecting...</span>
                  </>
                )}
                {connectionState === ConnectionState.CONNECTED && (
                  <>
                    <Wifi className="w-3 h-3 text-green-300" />
                    <span>Connected</span>
                  </>
                )}
                {connectionState === ConnectionState.RECONNECTING && (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-yellow-300" />
                    <span>Reconnecting...</span>
                  </>
                )}
                {connectionState === ConnectionState.DEGRADED && (
                  <>
                    <AlertCircle className="w-3 h-3 text-yellow-300" />
                    <span>Unstable</span>
                  </>
                )}
                {(connectionState === ConnectionState.DISCONNECTED || connectionState === ConnectionState.ERROR) && (
                  <>
                    <WifiOff className="w-3 h-3 text-red-300" />
                    <span>Disconnected</span>
                  </>
                )}
              </div>
              {instanceId && (
                <span className="text-white/70 text-xs">
                  Instance: {instanceId.slice(-8)}
                </span>
              )}
              {retryAttempt > 0 && retryAttempt < finalRetryConfig.maxRetries && (
                <span className="text-white/70 text-xs">
                  Retry: {retryAttempt}/{finalRetryConfig.maxRetries}
                </span>
              )}
              {enableMetrics && connectionMetrics.uptime > 0 && (
                <span className="text-white/70 text-xs">
                  Up: {Math.floor(connectionMetrics.uptime / 60)}m
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {connectionState === ConnectionState.ERROR && (
            <button
              onClick={forceReconnect}
              className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
              title="Force reconnect"
              data-testid="reconnect-button"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setError(null)}
            className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4" data-testid="error-message">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-400 mr-3" />
            <span className="text-red-700">{error}</span>
            <div className="ml-auto flex items-center space-x-2">
              {connectionState !== ConnectionState.CONNECTING && connectionState !== ConnectionState.RECONNECTING && (
                <button
                  onClick={forceReconnect}
                  className="text-red-600 hover:text-red-800 font-medium"
                  data-testid="retry-button"
                >
                  Retry
                </button>
              )}
              {(connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.RECONNECTING) && (
                <div className="flex items-center text-red-600">
                  <Loader className="w-3 h-3 animate-spin mr-1" />
                  <span className="text-sm">Connecting...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Welcome Message */}
      {messages.length === 0 && connectionState !== ConnectionState.CONNECTING && (
        <div className="p-6 text-center" data-testid="avi-greeting">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Hello! I'm Avi, your AI coding assistant
          </h3>
          <p className="text-gray-600 mb-4">
            I'm your AI coding assistant powered by Claude Code. I can help with development tasks,
            review code, debug issues, explain concepts, and coordinate with other agents.
          </p>
          {enableMetrics && connectionMetrics.totalMessages > 0 && (
            <div className="text-xs text-gray-500 space-y-1">
              <div>Messages: {connectionMetrics.totalMessages} | Connections: {connectionMetrics.successfulConnections}</div>
              {connectionMetrics.errorCount > 0 && (
                <div>Errors: {connectionMetrics.errorCount}</div>
              )}
            </div>
          )}
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
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-900"
              )}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              <div
                className={cn(
                  "flex items-center justify-between mt-1 text-xs",
                  msg.role === 'user' ? "text-purple-100" : "text-gray-500"
                )}
              >
                <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.role === 'user' && (
                  <div className="flex items-center space-x-1">
                    {msg.status === 'sending' && <Loader className="w-3 h-3 animate-spin" />}
                    {msg.status === 'retry' && (
                      <div className="flex items-center space-x-1" title={msg.errorDetails}>
                        <RefreshCw className="w-3 h-3 animate-spin text-yellow-300" />
                        {msg.retryCount && <span className="text-xs">({msg.retryCount})</span>}
                      </div>
                    )}
                    {msg.status === 'sent' && <Check className="w-3 h-3" />}
                    {msg.status === 'error' && (
                      <div className="flex items-center space-x-1" title={msg.errorDetails}>
                        <AlertCircle className="w-3 h-3 text-red-300" />
                      </div>
                    )}
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
              {msg.errorDetails && msg.status === 'error' && (
                <div className="mt-1 text-xs text-red-400 opacity-75">
                  {msg.errorDetails}
                </div>
              )}
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
                <span className="text-xs text-gray-500 ml-2">Avi is thinking...</span>
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
                connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.RECONNECTING
                  ? 'Connecting to Avi...'
                  : connectionState === ConnectionState.CONNECTED
                  ? 'Message Avi directly...'
                  : 'Connection required...'
              }
              disabled={connectionState !== ConnectionState.CONNECTED}
              className={cn(
                "w-full p-3 pr-12 border border-gray-300 rounded-lg resize-none",
                "focus:ring-2 focus:ring-purple-500 focus:border-transparent",
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
            disabled={!message.trim() || connectionState !== ConnectionState.CONNECTED}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2",
              !message.trim() || connectionState !== ConnectionState.CONNECTED
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-purple-600 text-white hover:bg-purple-700 active:scale-95"
            )}
            data-testid="send-button"
            title={connectionState !== ConnectionState.CONNECTED ? `Cannot send: ${connectionState}` : 'Send message'}
          >
            <Send className="w-4 h-4" />
            {!isMobile && <span>Send</span>}
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-500 space-y-1">
          <div>
            Press ⌘+Enter to send • Production Claude Code •
            {instanceId && ` Instance: ${instanceId.slice(-8)}`}
          </div>
          {enableMetrics && (
            <div className="flex items-center space-x-2">
              <Shield className="w-3 h-3" />
              <span>Protected mode</span>
              {connectionState === ConnectionState.CONNECTED && connectionMetrics.uptime > 0 && (
                <span>• Uptime: {Math.floor(connectionMetrics.uptime / 60)}m {connectionMetrics.uptime % 60}s</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AviDirectChatReal;