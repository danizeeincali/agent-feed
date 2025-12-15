/**
 * Hook for managing dual-mode interface messages
 * Provides simplified interface for chat and terminal message handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getGlobalWebSocketService } from '../services/WebSocketService';
import { ProcessedMessage } from '../services/MessageProcessor';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  displayType?: 'chat-user' | 'chat-assistant' | 'terminal-output' | 'tool-call' | 'system-info';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

interface ConnectionStatus {
  isConnected: boolean;
  error: string | null;
  latency: number;
}

interface MessageStats {
  total: number;
  chat: number;
  terminal: number;
  tools: number;
}

export const useDualModeMessages = (instanceId: string | null) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [terminalMessages, setTerminalMessages] = useState<ProcessedMessage[]>([]);
  const [toolUsageMessages, setToolUsageMessages] = useState<ProcessedMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    error: null,
    latency: 0
  });
  const [messageStats, setMessageStats] = useState<MessageStats>({
    total: 0,
    chat: 0,
    terminal: 0,
    tools: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const webSocketService = getGlobalWebSocketService();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Initialize connection and message subscriptions
   */
  useEffect(() => {
    if (!instanceId) {
      // Clear messages when no instance selected
      setChatMessages([]);
      setTerminalMessages([]);
      setToolUsageMessages([]);
      setMessageStats({ total: 0, chat: 0, terminal: 0, tools: 0 });
      return;
    }

    // Connect to WebSocket if not already connected
    const initializeConnection = async () => {
      try {
        if (!webSocketService.isConnected()) {
          await webSocketService.connect();
        }
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setConnectionStatus(prev => ({ ...prev, error: (error as Error).message }));
      }
    };

    initializeConnection();

    // Subscribe to instance messages
    const unsubscribe = webSocketService.subscribeToInstance(
      instanceId,
      (processedMessages: ProcessedMessage[]) => {
        processedMessages.forEach(msg => {
          if (msg.type === 'chat') {
            const chatMessage: ChatMessage = {
              id: msg.id,
              type: msg.displayType === 'chat-user' ? 'user' : 'assistant',
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              displayType: msg.displayType,
              priority: msg.priority,
              metadata: msg.metadata
            };
            
            setChatMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              if (existingIds.has(chatMessage.id)) return prev;
              return [...prev, chatMessage].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            });
          }
          
          if (['terminal', 'system'].includes(msg.type)) {
            setTerminalMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              if (existingIds.has(msg.id)) return prev;
              return [...prev, msg].sort((a, b) => a.timestamp - b.timestamp);
            });
          }
          
          if (msg.type === 'tool_usage') {
            setToolUsageMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              if (existingIds.has(msg.id)) return prev;
              return [...prev, msg].sort((a, b) => a.timestamp - b.timestamp);
            });
          }
        });
      }
    );
    
    unsubscribeRef.current = unsubscribe;
    
    // Subscribe to connection status
    const statusUnsubscribe = webSocketService.on('status', (status) => {
      setConnectionStatus({
        isConnected: status.isConnected,
        error: status.error,
        latency: status.latency || 0
      });
    });
    
    statusUnsubscribeRef.current = statusUnsubscribe;
    
    // Load existing messages
    const loadExistingMessages = () => {
      const existingChatMessages = webSocketService.getChatMessages(instanceId);
      const existingTerminalMessages = webSocketService.getTerminalMessages(instanceId);
      const existingToolMessages = webSocketService.getToolUsageMessages(instanceId);
      
      setChatMessages(existingChatMessages.map(msg => ({
        id: msg.id,
        type: msg.displayType === 'chat-user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        displayType: msg.displayType,
        priority: msg.priority,
        metadata: msg.metadata
      }) as ChatMessage));
      
      setTerminalMessages(existingTerminalMessages.filter(msg => ['terminal', 'system'].includes(msg.type)));
      setToolUsageMessages(existingToolMessages);
    };
    
    loadExistingMessages();
    
    return () => {
      unsubscribeRef.current?.();
      statusUnsubscribeRef.current?.();
    };
  }, [instanceId, webSocketService]);

  /**
   * Update message statistics
   */
  useEffect(() => {
    const total = chatMessages.length + terminalMessages.length + toolUsageMessages.length;
    setMessageStats({
      total,
      chat: chatMessages.length,
      terminal: terminalMessages.length,
      tools: toolUsageMessages.length
    });
  }, [chatMessages.length, terminalMessages.length, toolUsageMessages.length]);

  /**
   * Send message to Claude instance
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!instanceId || !message.trim()) {
      return;
    }

    setIsLoading(true);
    
    // Add user message to chat immediately for responsive UI
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: message.trim(),
      timestamp: new Date(),
      displayType: 'chat-user',
      priority: 'normal'
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    
    try {
      await webSocketService.sendToInstance(instanceId, message.trim(), 'user_input');
    } catch (error) {
      console.error('Failed to send message:', error);
      setConnectionStatus(prev => ({ ...prev, error: (error as Error).message }));
      
      // Remove the optimistically added message on error
      setChatMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [instanceId, webSocketService]);

  /**
   * Clear messages for current instance
   */
  const clearMessages = useCallback(() => {
    if (instanceId) {
      webSocketService.clearInstanceMessages(instanceId);
      setChatMessages([]);
      setTerminalMessages([]);
      setToolUsageMessages([]);
    }
  }, [instanceId, webSocketService]);

  /**
   * Get all terminal messages (including tools) in chronological order
   */
  const getAllTerminalMessages = useCallback((): ProcessedMessage[] => {
    return [...terminalMessages, ...toolUsageMessages]
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [terminalMessages, toolUsageMessages]);

  /**
   * Get connection statistics
   */
  const getConnectionStats = useCallback(() => {
    return webSocketService.getStats();
  }, [webSocketService]);

  return {
    // Messages
    chatMessages,
    terminalMessages,
    toolUsageMessages,
    allTerminalMessages: getAllTerminalMessages(),
    
    // Status
    connectionStatus,
    messageStats,
    isLoading,
    
    // Actions
    sendMessage,
    clearMessages,
    
    // Utilities
    getConnectionStats
  };
};
