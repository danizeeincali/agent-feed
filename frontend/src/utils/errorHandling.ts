/**
 * Comprehensive Error Handling Utilities for React Applications
 * Based on 2024 best practices for bulletproof error management
 */

export interface ErrorDetails {
  id: string;
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: Date;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  buildVersion?: string;
  errorBoundary?: string;
  props?: Record<string, any>;
  state?: Record<string, any>;
  context?: Record<string, any>;
}

export interface ErrorMetrics {
  errorCount: number;
  uniqueErrors: number;
  errorRate: number;
  lastError?: Date;
  topErrors: Array<{ message: string; count: number }>;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ErrorCategory = 
  | 'component' 
  | 'network' 
  | 'auth' 
  | 'validation' 
  | 'async' 
  | 'render' 
  | 'chunk' 
  | 'route' 
  | 'unknown';

export interface ErrorReportingConfig {
  endpoint?: string;
  apiKey?: string;
  enableDevConsole: boolean;
  enableLocalStorage: boolean;
  enableAnalytics: boolean;
  maxStoredErrors: number;
  ignoredErrors: Array<string | RegExp>;
  rateLimitMs: number;
}

class ErrorHandler {
  private config: ErrorReportingConfig;
  private errorQueue: ErrorDetails[] = [];
  private lastReportTime = 0;
  private errorCounts = new Map<string, number>();

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enableDevConsole: process.env.NODE_ENV === 'development',
      enableLocalStorage: true,
      enableAnalytics: true,
      maxStoredErrors: 50,
      ignoredErrors: [
        /Script error/,
        /Network request failed/,
        /ChunkLoadError/,
        /Non-Error promise rejection captured/
      ],
      rateLimitMs: 5000,
      ...config
    };

    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      this.captureError(error, {
        category: 'async',
        severity: 'high',
        context: { type: 'unhandledRejection' }
      });
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      const error = event.error || new Error(event.message);
      this.captureError(error, {
        category: 'unknown',
        severity: 'medium',
        context: { 
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Handle chunk load errors (lazy loading failures)
    window.addEventListener('error', (event) => {
      if (event.target && 'src' in event.target) {
        const error = new Error(`Failed to load chunk: ${(event.target as any).src}`);
        this.captureError(error, {
          category: 'chunk',
          severity: 'medium',
          context: { src: (event.target as any).src }
        });
      }
    }, true);
  }

  public captureError(
    error: Error,
    options: {
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Record<string, any>;
      componentStack?: string;
      props?: Record<string, any>;
      state?: Record<string, any>;
      errorBoundary?: string;
    } = {}
  ): string {
    // Check if error should be ignored
    if (this.shouldIgnoreError(error)) {
      return '';
    }

    const errorId = this.generateErrorId(error);
    const sessionId = this.getOrCreateSessionId();

    const errorDetails: ErrorDetails = {
      id: errorId,
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: options.componentStack,
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId,
      buildVersion: this.getBuildVersion(),
      errorBoundary: options.errorBoundary,
      props: options.props,
      state: options.state,
      context: {
        category: options.category || this.categorizeError(error),
        severity: options.severity || this.getSeverity(error),
        ...options.context
      }
    };

    // Update error counts
    this.updateErrorCounts(errorDetails);

    // Log to console in development
    if (this.config.enableDevConsole) {
      this.logToConsole(errorDetails);
    }

    // Store locally
    if (this.config.enableLocalStorage) {
      this.storeLocally(errorDetails);
    }

    // Report to monitoring service
    this.reportError(errorDetails);

    // Send to analytics
    if (this.config.enableAnalytics) {
      this.sendToAnalytics(errorDetails);
    }

    return errorId;
  }

  private shouldIgnoreError(error: Error): boolean {
    return this.config.ignoredErrors.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(error.message);
      }
      return error.message.includes(pattern);
    });
  }

  private generateErrorId(error: Error): string {
    const hash = this.simpleHash(error.message + error.stack);
    return `err-${Date.now()}-${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('error-session-id');
    if (!sessionId) {
      // Use deterministic counter instead of Math.random()
      const counter = (globalThis.__sessionCounter = (globalThis.__sessionCounter || 0) + 1);
      sessionId = `session-${Date.now()}-${counter.toString(36)}`;
      sessionStorage.setItem('error-session-id', sessionId);
    }
    return sessionId;
  }

  private getBuildVersion(): string {
    return process.env.VITE_BUILD_VERSION || process.env.REACT_APP_VERSION || 'unknown';
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch')) return 'network';
    if (message.includes('auth') || message.includes('unauthorized')) return 'auth';
    if (message.includes('validation') || message.includes('invalid')) return 'validation';
    if (stack.includes('promise') || message.includes('async')) return 'async';
    if (message.includes('render') || stack.includes('render')) return 'render';
    if (message.includes('chunk') || message.includes('loading')) return 'chunk';
    if (message.includes('route') || message.includes('navigation')) return 'route';
    
    return 'component';
  }

  private getSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) return 'critical';
    if (message.includes('auth') || message.includes('security')) return 'high';
    if (message.includes('network') || message.includes('timeout')) return 'medium';
    
    return 'low';
  }

  private updateErrorCounts(errorDetails: ErrorDetails): void {
    const key = `${errorDetails.name}:${errorDetails.message}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  private logToConsole(errorDetails: ErrorDetails): void {
    const category = errorDetails.context?.category || 'unknown';
    const severity = errorDetails.context?.severity || 'low';
    
    console.group(`🚨 Error Captured [${category.toUpperCase()}] - ${severity.toUpperCase()}`);
    console.error('Error:', errorDetails.name, errorDetails.message);
    console.log('Error ID:', errorDetails.id);
    console.log('Timestamp:', errorDetails.timestamp.toISOString());
    console.log('URL:', errorDetails.url);
    console.log('Session:', errorDetails.sessionId);
    
    if (errorDetails.componentStack) {
      console.log('Component Stack:', errorDetails.componentStack);
    }
    
    if (errorDetails.context) {
      console.log('Context:', errorDetails.context);
    }
    
    if (errorDetails.stack) {
      console.log('Stack Trace:', errorDetails.stack);
    }
    
    console.groupEnd();
  }

  private storeLocally(errorDetails: ErrorDetails): void {
    try {
      const stored = JSON.parse(localStorage.getItem('error-log') || '[]');
      stored.push(errorDetails);
      
      // Keep only recent errors
      if (stored.length > this.config.maxStoredErrors) {
        stored.splice(0, stored.length - this.config.maxStoredErrors);
      }
      
      localStorage.setItem('error-log', JSON.stringify(stored));
    } catch (e) {
      console.warn('Failed to store error locally:', e);
    }
  }

  private async reportError(errorDetails: ErrorDetails): Promise<void> {
    if (!this.config.endpoint) return;
    
    // Rate limiting
    const now = Date.now();
    if (now - this.lastReportTime < this.config.rateLimitMs) {
      this.errorQueue.push(errorDetails);
      return;
    }
    
    this.lastReportTime = now;
    
    try {
      const payload = {
        ...errorDetails,
        queue: this.errorQueue.splice(0) // Send queued errors too
      };
      
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn('Failed to report error to monitoring service:', e);
      // Re-queue the error
      this.errorQueue.unshift(errorDetails);
    }
  }

  private sendToAnalytics(errorDetails: ErrorDetails): void {
    // Google Analytics 4
    if ((window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: `${errorDetails.name}: ${errorDetails.message}`,
        fatal: errorDetails.context?.severity === 'critical',
        custom_parameters: {
          error_id: errorDetails.id,
          error_category: errorDetails.context?.category,
          error_boundary: errorDetails.errorBoundary,
          session_id: errorDetails.sessionId
        }
      });
    }
    
    // Custom analytics
    if ((window as any).analytics) {
      (window as any).analytics.track('Error Occurred', {
        errorId: errorDetails.id,
        errorName: errorDetails.name,
        errorMessage: errorDetails.message,
        category: errorDetails.context?.category,
        severity: errorDetails.context?.severity,
        url: errorDetails.url,
        timestamp: errorDetails.timestamp
      });
    }
  }

  public getErrorMetrics(): ErrorMetrics {
    const errors = this.getStoredErrors();
    const uniqueErrors = new Set(errors.map(e => `${e.name}:${e.message}`)).size;
    const lastHour = Date.now() - (60 * 60 * 1000);
    const recentErrors = errors.filter(e => new Date(e.timestamp).getTime() > lastHour);
    
    const topErrors = Array.from(this.errorCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));
    
    return {
      errorCount: errors.length,
      uniqueErrors,
      errorRate: recentErrors.length,
      lastError: errors.length > 0 ? new Date(errors[errors.length - 1].timestamp) : undefined,
      topErrors
    };
  }

  public getStoredErrors(): ErrorDetails[] {
    try {
      return JSON.parse(localStorage.getItem('error-log') || '[]');
    } catch {
      return [];
    }
  }

  public clearErrorLog(): void {
    localStorage.removeItem('error-log');
    this.errorCounts.clear();
  }

  public exportErrorLog(): string {
    return JSON.stringify(this.getStoredErrors(), null, 2);
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler();

// Utility functions
export const captureError = (
  error: Error,
  context?: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    context?: Record<string, any>;
    componentStack?: string;
    props?: Record<string, any>;
    state?: Record<string, any>;
    errorBoundary?: string;
  }
): string => {
  return errorHandler.captureError(error, context);
};

export const captureException = (
  message: string,
  context?: Record<string, any>
): string => {
  const error = new Error(message);
  return captureError(error, { context });
};

export const captureComponentError = (
  error: Error,
  componentName: string,
  props?: Record<string, any>,
  state?: Record<string, any>
): string => {
  return captureError(error, {
    category: 'component',
    severity: 'medium',
    errorBoundary: componentName,
    props,
    state
  });
};

export const captureNetworkError = (
  error: Error,
  url?: string,
  method?: string
): string => {
  return captureError(error, {
    category: 'network',
    severity: 'medium',
    context: { url, method }
  });
};

export const captureAsyncError = (
  error: Error,
  operation?: string
): string => {
  return captureError(error, {
    category: 'async',
    severity: 'high',
    context: { operation }
  });
};

export const getErrorMetrics = (): ErrorMetrics => {
  return errorHandler.getErrorMetrics();
};

export const getStoredErrors = (): ErrorDetails[] => {
  return errorHandler.getStoredErrors();
};

export const clearErrorLog = (): void => {
  errorHandler.clearErrorLog();
};

export const exportErrorLog = (): string => {
  return errorHandler.exportErrorLog();
};

// Error boundary helpers
export const createErrorBoundaryConfig = (
  componentName: string,
  options?: {
    fallbackComponent?: React.ComponentType<any>;
    onError?: (error: Error, errorInfo: any) => void;
    resetKeys?: Array<string | number>;
  }
) => ({
  onError: (error: Error, errorInfo: any) => {
    captureComponentError(
      error,
      componentName,
      undefined,
      undefined
    );
    options?.onError?.(error, errorInfo);
  },
  resetKeys: options?.resetKeys,
  FallbackComponent: options?.fallbackComponent
});

// Development helpers
export const simulateError = (message: string = 'Simulated error for testing'): void => {
  if (process.env.NODE_ENV === 'development') {
    throw new Error(message);
  }
};

export const logErrorBoundaryRender = (boundaryName: string, hasError: boolean): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`ErrorBoundary [${boundaryName}] rendered, hasError: ${hasError}`);
  }
};

export default errorHandler;