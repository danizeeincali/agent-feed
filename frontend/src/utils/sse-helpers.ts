/**
 * SSE Utility Functions and Helpers
 * 
 * Common utilities for working with Server-Sent Events in Claude instances.
 */

import { ConnectionState } from '../managers/ClaudeInstanceManager';

/**
 * Validate instance ID format
 */
export const validateInstanceId = (instanceId: string): boolean => {
  return Boolean(instanceId && /^claude-[a-zA-Z0-9]+$/.test(instanceId));
};

/**
 * Format instance ID for display
 */
export const formatInstanceId = (instanceId: string, maxLength: number = 12): string => {
  if (!instanceId) return 'Unknown';
  return instanceId.length > maxLength 
    ? `${instanceId.slice(0, maxLength)}...` 
    : instanceId;
};

/**
 * Get connection state color/class for UI
 */
export const getConnectionStateClass = (state: ConnectionState): string => {
  switch (state) {
    case ConnectionState.CONNECTED:
      return 'connected';
    case ConnectionState.CONNECTING:
      return 'connecting';
    case ConnectionState.RECONNECTING:
      return 'reconnecting';
    case ConnectionState.ERROR:
      return 'error';
    case ConnectionState.DISCONNECTED:
    default:
      return 'disconnected';
  }
};

/**
 * Get connection state display text
 */
export const getConnectionStateText = (state: ConnectionState): string => {
  switch (state) {
    case ConnectionState.CONNECTED:
      return 'Connected';
    case ConnectionState.CONNECTING:
      return 'Connecting...';
    case ConnectionState.RECONNECTING:
      return 'Reconnecting...';
    case ConnectionState.ERROR:
      return 'Connection Error';
    case ConnectionState.DISCONNECTED:
    default:
      return 'Disconnected';
  }
};

/**
 * Calculate exponential backoff delay
 */
export const calculateBackoffDelay = (
  attempt: number,
  baseDelay: number = 2000,
  maxDelay: number = 30000
): number => {
  const exponential = baseDelay * Math.pow(2, attempt);
  const withJitter = exponential + Math.random() * 1000;
  return Math.min(withJitter, maxDelay);
};

/**
 * Create SSE URL with proper formatting
 */
export const createSSEUrl = (
  baseUrl: string,
  instanceId: string,
  endpoint: string = 'terminal/stream'
): string => {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  return `${cleanBaseUrl}/api/claude/instances/${instanceId}/${endpoint}`;
};

/**
 * Create HTTP command URL
 */
export const createCommandUrl = (
  baseUrl: string,
  instanceId: string,
  endpoint: string = 'terminal/input'
): string => {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  return `${cleanBaseUrl}/api/claude/instances/${instanceId}/${endpoint}`;
};

/**
 * Parse SSE message data safely
 */
export const parseSSEMessage = (data: string): any => {
  try {
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to parse SSE message:', data, error);
    return { 
      type: 'parse_error', 
      data: data, 
      error: error instanceof Error ? error.message : 'Parse failed' 
    };
  }
};

/**
 * Sanitize terminal output for safe display
 */
export const sanitizeTerminalOutput = (content: string): string => {
  return content
    .replace(/[\x00-\x08\x0E-\x1F\x7F]/g, '') // Remove control characters except \t, \n, \r
    .replace(/\x1B\[[0-9;]*[mGK]/g, ''); // Remove ANSI escape codes
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (date: Date, includeSeconds: boolean = true): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' })
  };
  
  return date.toLocaleTimeString(undefined, options);
};

/**
 * Debounce function for rate limiting
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * Throttle function for rate limiting
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Create retry function with exponential backoff
 */
export const createRetryFunction = <T>(
  asyncFn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
) => {
  return async (): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await asyncFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxAttempts - 1) {
          const delay = calculateBackoffDelay(attempt, baseDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  };
};

/**
 * Health check utilities
 */
export const createHealthChecker = (
  checkFn: () => Promise<boolean>,
  interval: number = 30000
) => {
  let intervalId: NodeJS.Timeout;
  let isRunning = false;
  const callbacks: ((healthy: boolean) => void)[] = [];
  
  return {
    start: () => {
      if (isRunning) return;
      
      isRunning = true;
      intervalId = setInterval(async () => {
        try {
          const healthy = await checkFn();
          callbacks.forEach(cb => cb(healthy));
        } catch (error) {
          console.error('Health check failed:', error);
          callbacks.forEach(cb => cb(false));
        }
      }, interval);
    },
    
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        isRunning = false;
      }
    },
    
    onHealthChange: (callback: (healthy: boolean) => void) => {
      callbacks.push(callback);
    },
    
    removeHealthListener: (callback: (healthy: boolean) => void) => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  };
};

/**
 * Performance monitoring utilities
 */
export const createPerformanceMonitor = () => {
  const metrics = {
    messageCount: 0,
    errorCount: 0,
    reconnectCount: 0,
    averageLatency: 0,
    lastActivity: null as Date | null
  };
  
  const latencies: number[] = [];
  
  return {
    recordMessage: () => {
      metrics.messageCount++;
      metrics.lastActivity = new Date();
    },
    
    recordError: () => {
      metrics.errorCount++;
    },
    
    recordReconnect: () => {
      metrics.reconnectCount++;
    },
    
    recordLatency: (latency: number) => {
      latencies.push(latency);
      
      // Keep only last 100 measurements
      if (latencies.length > 100) {
        latencies.shift();
      }
      
      metrics.averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    },
    
    getMetrics: () => ({ ...metrics }),
    
    reset: () => {
      metrics.messageCount = 0;
      metrics.errorCount = 0;
      metrics.reconnectCount = 0;
      metrics.averageLatency = 0;
      metrics.lastActivity = null;
      latencies.length = 0;
    }
  };
};

export default {
  validateInstanceId,
  formatInstanceId,
  getConnectionStateClass,
  getConnectionStateText,
  calculateBackoffDelay,
  createSSEUrl,
  createCommandUrl,
  parseSSEMessage,
  sanitizeTerminalOutput,
  formatTimestamp,
  debounce,
  throttle,
  createRetryFunction,
  createHealthChecker,
  createPerformanceMonitor
};