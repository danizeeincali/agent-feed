/**
 * useAviInstance Hook
 * React hook for managing Avi DM Claude instances with advanced features
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AviInstanceManager } from '../services/AviInstanceManager';
import {
  AviInstance,
  AviInstanceConfig,
  AviMessage,
  AviMessageOptions,
  AviPersonalityMode,
  AviUserPreferences,
  AviConversationMetrics,
  AviHealthStatus,
  AviDiagnosticReport,
  AviError,
  UseAviInstanceOptions,
  UseAviInstanceReturn,
  AviConversationExport
} from '../types/avi-integration';
import { ImageAttachment } from '../types/claude-instances';

const DEFAULT_OPTIONS: UseAviInstanceOptions = {
  autoConnect: true,
  personalityMode: 'adaptive',
  contextRetention: 'session',
  maxRetries: 3,
  retryInterval: 2000,
  healthCheckInterval: 30000,
  enableAnalytics: true,
  privacyMode: false
};

interface AviInstanceState {
  instance: AviInstance | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  messages: AviMessage[];
  healthStatus: AviHealthStatus | null;
  metrics: AviConversationMetrics | null;
}

/**
 * Hook for managing Avi DM Claude instances
 */
export const useAviInstance = (
  config?: Partial<AviInstanceConfig>,
  options: UseAviInstanceOptions = {}
): UseAviInstanceReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // State management
  const [state, setState] = useState<AviInstanceState>({
    instance: null,
    isConnected: false,
    isLoading: false,
    error: null,
    connectionQuality: 'good',
    messages: [],
    healthStatus: null,
    metrics: null
  });

  // Refs for stable references
  const managerRef = useRef<AviInstanceManager | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageHandlersRef = useRef(new Set<(message: AviMessage) => void>());
  const statusHandlersRef = useRef(new Set<(status: any) => void>());
  const errorHandlersRef = useRef(new Set<(error: AviError) => void>());

  // Initialize manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new AviInstanceManager({
        enableAnalytics: opts.enableAnalytics,
        privacyMode: opts.privacyMode
      });

      // Set up event listeners
      const manager = managerRef.current;

      manager.on('instance:created', (instance: AviInstance) => {
        setState(prev => ({
          ...prev,
          instance,
          isConnected: true,
          isLoading: false,
          error: null
        }));
      });

      manager.on('instance:connected', (instance: AviInstance) => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectionQuality: 'good'
        }));
      });

      manager.on('instance:error', (error: AviError) => {
        setState(prev => ({
          ...prev,
          error: error.message,
          isLoading: false,
          isConnected: error.code !== 'CONNECTION_FAILED'
        }));

        errorHandlersRef.current.forEach(handler => handler(error));
      });

      manager.on('message:sent', (message: AviMessage) => {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, message]
        }));

        messageHandlersRef.current.forEach(handler => handler(message));
      });

      manager.on('message:received', (message: AviMessage) => {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, message]
        }));

        messageHandlersRef.current.forEach(handler => handler(message));
      });

      manager.on('personality:changed', ({ mode, instance }) => {
        statusHandlersRef.current.forEach(handler => handler({ personalityMode: mode }));
      });

      manager.on('instance:destroyed', () => {
        setState(prev => ({
          ...prev,
          instance: null,
          isConnected: false,
          messages: []
        }));
      });
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.removeAllListeners();
      }
    };
  }, [opts.enableAnalytics, opts.privacyMode]);

  // Auto-connect when config is provided
  useEffect(() => {
    if (opts.autoConnect && config && !state.instance && !state.isLoading) {
      createInstance(config as AviInstanceConfig);
    }
  }, [opts.autoConnect, config, state.instance, state.isLoading]);

  // Health monitoring
  useEffect(() => {
    if (state.instance && opts.healthCheckInterval) {
      healthCheckIntervalRef.current = setInterval(() => {
        if (managerRef.current) {
          const healthStatus = managerRef.current.getHealthStatus();
          setState(prev => ({ ...prev, healthStatus }));
        }
      }, opts.healthCheckInterval);

      return () => {
        if (healthCheckIntervalRef.current) {
          clearInterval(healthCheckIntervalRef.current);
        }
      };
    }
  }, [state.instance, opts.healthCheckInterval]);

  // Metrics collection
  useEffect(() => {
    if (state.instance && opts.enableAnalytics) {
      const metricsInterval = setInterval(() => {
        if (managerRef.current) {
          const metrics = managerRef.current.getConversationMetrics();
          setState(prev => ({ ...prev, metrics }));
        }
      }, 10000); // Update metrics every 10 seconds

      return () => clearInterval(metricsInterval);
    }
  }, [state.instance, opts.enableAnalytics]);

  /**
   * Create a new Avi instance
   */
  const createInstance = useCallback(async (instanceConfig: AviInstanceConfig): Promise<AviInstance> => {
    if (!managerRef.current) {
      throw new AviError('Manager not initialized', 'SERVER_ERROR');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const instance = await managerRef.current.createInstance({
        ...instanceConfig,
        personalityMode: instanceConfig.personalityMode || opts.personalityMode,
        contextRetention: instanceConfig.contextRetention || opts.contextRetention
      });

      return instance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create instance';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      throw error;
    }
  }, [opts.personalityMode, opts.contextRetention]);

  /**
   * Destroy the current instance
   */
  const destroyInstance = useCallback(async (): Promise<void> => {
    if (!managerRef.current || !state.instance) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await managerRef.current.destroyInstance();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to destroy instance';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      throw error;
    }
  }, [state.instance]);

  /**
   * Reconnect the instance
   */
  const reconnect = useCallback(async (): Promise<void> => {
    if (!managerRef.current || !state.instance) {
      throw new AviError('No instance to reconnect', 'CONNECTION_FAILED');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // For now, we'll recreate the instance
      // In a full implementation, this would attempt reconnection
      await destroyInstance();
      if (config) {
        await createInstance(config as AviInstanceConfig);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reconnect';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      throw error;
    }
  }, [state.instance, config, destroyInstance, createInstance]);

  /**
   * Send a message
   */
  const sendMessage = useCallback(async (message: string, options?: AviMessageOptions): Promise<AviMessage> => {
    if (!managerRef.current) {
      throw new AviError('Manager not initialized', 'CONNECTION_FAILED');
    }

    return await managerRef.current.sendMessage(message, options);
  }, []);

  /**
   * Send an image
   */
  const sendImage = useCallback(async (image: ImageAttachment, caption?: string): Promise<AviMessage> => {
    if (!managerRef.current) {
      throw new AviError('Manager not initialized', 'CONNECTION_FAILED');
    }

    return await managerRef.current.sendImage(image, caption);
  }, []);

  /**
   * Set personality mode
   */
  const setPersonalityMode = useCallback((mode: AviPersonalityMode): void => {
    if (!managerRef.current) {
      throw new AviError('Manager not initialized', 'CONNECTION_FAILED');
    }

    managerRef.current.setPersonalityMode(mode);
    setState(prev => ({
      ...prev,
      instance: prev.instance ? {
        ...prev.instance,
        aviConfig: {
          ...prev.instance.aviConfig,
          personalityMode: mode
        }
      } : null
    }));
  }, []);

  /**
   * Update user preferences
   */
  const updateUserPreferences = useCallback((preferences: Partial<AviUserPreferences>): void => {
    if (!managerRef.current) {
      throw new AviError('Manager not initialized', 'CONNECTION_FAILED');
    }

    managerRef.current.updateUserPreferences(preferences);
  }, []);

  /**
   * Start a new topic
   */
  const startNewTopic = useCallback((topic: string): void => {
    // Clear messages and update context
    setState(prev => ({
      ...prev,
      messages: []
    }));

    // In a full implementation, this would update the conversation context
    console.log('Starting new topic:', topic);
  }, []);

  /**
   * End the conversation
   */
  const endConversation = useCallback(async (): Promise<void> => {
    if (!managerRef.current) {
      return;
    }

    // Export conversation data if analytics are enabled
    if (opts.enableAnalytics && state.instance) {
      const exportData = exportConversationHistory();
      console.log('Conversation ended, data exported:', exportData);
    }

    // Clear messages
    setState(prev => ({
      ...prev,
      messages: []
    }));
  }, [opts.enableAnalytics, state.instance]);

  /**
   * Get conversation metrics
   */
  const getConversationMetrics = useCallback((): AviConversationMetrics => {
    if (!managerRef.current) {
      return {
        messageCount: state.messages.length,
        averageResponseTime: 0,
        conversationDuration: 0,
        topicSwitches: 0,
        clarificationRequests: 0,
        engagementLevel: 'medium',
        complexityScore: 5
      };
    }

    return managerRef.current.getConversationMetrics();
  }, [state.messages.length]);

  /**
   * Export conversation history
   */
  const exportConversationHistory = useCallback((): AviConversationExport => {
    if (!state.instance) {
      throw new AviError('No active instance', 'CONNECTION_FAILED');
    }

    return {
      metadata: {
        userId: state.instance.aviConfig.aviUserId,
        sessionId: state.instance.aviConfig.aviSessionId,
        exportDate: new Date(),
        messageCount: state.messages.length,
        duration: 0 // Calculate from first to last message
      },
      messages: state.messages,
      analytics: getConversationMetrics(),
      userPreferences: {
        preferredLanguage: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        responseFormat: 'markdown',
        codeHighlighting: true,
        emojiUsage: 'minimal',
        technicalDetail: 'medium',
        notificationSettings: {
          soundEnabled: true,
          visualIndicators: true,
          desktopNotifications: false,
          mobilePush: false
        }
      }
    };
  }, [state.instance, state.messages, getConversationMetrics]);

  /**
   * Clear conversation history
   */
  const clearHistory = useCallback(async (): Promise<void> => {
    setState(prev => ({
      ...prev,
      messages: []
    }));
  }, []);

  /**
   * Get health status
   */
  const getHealthStatus = useCallback((): AviHealthStatus => {
    if (!managerRef.current) {
      return {
        overall: 'critical',
        components: {
          connection: 'down',
          authentication: 'invalid',
          encryption: 'compromised',
          performance: 'degraded'
        },
        metrics: {
          uptime: 0,
          responseTime: 0,
          errorRate: 1,
          memoryUsage: 0
        },
        recommendations: ['Initialize manager and create instance']
      };
    }

    return managerRef.current.getHealthStatus();
  }, []);

  /**
   * Run diagnostics
   */
  const runDiagnostics = useCallback(async (): Promise<AviDiagnosticReport> => {
    if (!managerRef.current) {
      throw new AviError('Manager not initialized', 'CONNECTION_FAILED');
    }

    return await managerRef.current.runDiagnostics();
  }, []);

  /**
   * Register message handler
   */
  const onMessage = useCallback((handler: (message: AviMessage) => void): void => {
    messageHandlersRef.current.add(handler);
  }, []);

  /**
   * Register status change handler
   */
  const onStatusChange = useCallback((handler: (status: any) => void): void => {
    statusHandlersRef.current.add(handler);
  }, []);

  /**
   * Register error handler
   */
  const onError = useCallback((handler: (error: AviError) => void): void => {
    errorHandlersRef.current.add(handler);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      if (managerRef.current) {
        managerRef.current.removeAllListeners();
      }
    };
  }, []);

  // Memoized return object
  const returnValue = useMemo((): UseAviInstanceReturn => ({
    instance: state.instance,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    connectionQuality: state.connectionQuality,

    createInstance,
    destroyInstance,
    reconnect,

    sendMessage,
    sendImage,

    setPersonalityMode,
    updateUserPreferences,
    startNewTopic,
    endConversation,

    getConversationMetrics,
    exportConversationHistory,
    clearHistory,

    getHealthStatus,
    runDiagnostics,

    onMessage,
    onStatusChange,
    onError
  }), [
    state,
    createInstance,
    destroyInstance,
    reconnect,
    sendMessage,
    sendImage,
    setPersonalityMode,
    updateUserPreferences,
    startNewTopic,
    endConversation,
    getConversationMetrics,
    exportConversationHistory,
    clearHistory,
    getHealthStatus,
    runDiagnostics,
    onMessage,
    onStatusChange,
    onError
  ]);

  return returnValue;
};

export default useAviInstance;