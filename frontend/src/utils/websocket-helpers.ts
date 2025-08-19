/**
 * WebSocket utility functions for AgentLink
 * Provides helper functions for common WebSocket operations
 */

export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: string;
  source?: string;
}

export interface ConnectionMetrics {
  connectionTime: number;
  reconnectAttempts: number;
  messagesReceived: number;
  messagesSent: number;
  averageLatency: number;
  lastHeartbeat: Date | null;
}

/**
 * Format WebSocket event for consistent structure
 */
export function formatWebSocketEvent(type: string, data: any, source?: string): WebSocketEvent {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
    source,
  };
}

/**
 * Validate event data structure
 */
export function validateEventData(event: any): boolean {
  if (!event || typeof event !== 'object') return false;
  
  const required = ['type', 'data', 'timestamp'];
  return required.every(field => field in event);
}

/**
 * Calculate connection health score (0-100)
 */
export function calculateHealthScore(metrics: ConnectionMetrics): number {
  let score = 100;
  
  // Penalize for reconnection attempts
  if (metrics.reconnectAttempts > 0) {
    score -= Math.min(metrics.reconnectAttempts * 10, 30);
  }
  
  // Penalize for high latency
  if (metrics.averageLatency > 1000) {
    score -= Math.min((metrics.averageLatency - 1000) / 100, 20);
  }
  
  // Penalize for old heartbeat
  if (metrics.lastHeartbeat) {
    const timeSinceHeartbeat = Date.now() - metrics.lastHeartbeat.getTime();
    if (timeSinceHeartbeat > 60000) { // More than 1 minute
      score -= Math.min(timeSinceHeartbeat / 60000 * 5, 15);
    }
  } else {
    score -= 25; // No heartbeat at all
  }
  
  return Math.max(score, 0);
}

/**
 * Generate unique event ID
 */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce function for event handling
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}

/**
 * Throttle function for event handling
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Parse WebSocket error for user-friendly messages
 */
export function parseWebSocketError(error: any): string {
  if (typeof error === 'string') return error;
  
  if (error?.message) {
    const message = error.message.toLowerCase();
    
    if (message.includes('connection failed') || message.includes('econnrefused')) {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    
    if (message.includes('timeout')) {
      return 'Connection timed out. The server may be busy.';
    }
    
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return 'Authentication failed. Please log in again.';
    }
    
    if (message.includes('rate limit')) {
      return 'Too many requests. Please slow down.';
    }
    
    return error.message;
  }
  
  return 'An unexpected error occurred with the real-time connection.';
}

/**
 * Check if browser supports WebSocket
 */
export function supportsWebSocket(): boolean {
  return typeof WebSocket !== 'undefined' && WebSocket.CLOSED !== undefined;
}

/**
 * Check if browser supports advanced WebSocket features
 */
export function supportsAdvancedWebSocket(): boolean {
  if (!supportsWebSocket()) return false;
  
  try {
    // Check for binary type support
    const ws = new WebSocket('ws://test');
    const supportsBinary = 'binaryType' in ws;
    ws.close();
    return supportsBinary;
  } catch {
    return false;
  }
}

/**
 * Get optimal transport method for Socket.IO
 */
export function getOptimalTransport(): string[] {
  if (!supportsWebSocket()) {
    return ['polling'];
  }
  
  // Prefer WebSocket, fallback to polling
  return ['websocket', 'polling'];
}

/**
 * Format time duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

/**
 * Format latency for display
 */
export function formatLatency(ms: number): string {
  if (ms < 50) return 'Excellent';
  if (ms < 100) return 'Good';
  if (ms < 200) return 'Fair';
  if (ms < 500) return 'Poor';
  return 'Very Poor';
}

/**
 * Create error event
 */
export function createErrorEvent(error: any, context?: string): WebSocketEvent {
  return formatWebSocketEvent('error', {
    message: parseWebSocketError(error),
    context,
    originalError: error,
  }, 'client');
}

/**
 * Create connection event
 */
export function createConnectionEvent(type: 'connected' | 'disconnected' | 'reconnecting', data?: any): WebSocketEvent {
  return formatWebSocketEvent(`connection:${type}`, {
    ...data,
    clientTime: new Date().toISOString(),
  }, 'client');
}

/**
 * Log WebSocket event for debugging
 */
export function logWebSocketEvent(event: WebSocketEvent, level: 'info' | 'warn' | 'error' = 'info') {
  if (process.env.NODE_ENV === 'development') {
    const style = {
      info: 'color: #3b82f6',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444',
    }[level];
    
    console.log(
      `%c[WebSocket] ${event.type}`,
      style,
      {
        timestamp: event.timestamp,
        data: event.data,
        source: event.source,
      }
    );
  }
}

export default {
  formatWebSocketEvent,
  validateEventData,
  calculateHealthScore,
  generateEventId,
  debounce,
  throttle,
  parseWebSocketError,
  supportsWebSocket,
  supportsAdvancedWebSocket,
  getOptimalTransport,
  formatDuration,
  formatLatency,
  createErrorEvent,
  createConnectionEvent,
  logWebSocketEvent,
};