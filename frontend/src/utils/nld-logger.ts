// NLD (Neuro Learning Development) Logger for Enhanced Agent Manager
// Captures failure patterns and success metrics for continuous learning

interface NLDLogEntry {
  timestamp: string;
  component: string;
  event: 'render_attempt' | 'render_success' | 'render_failure' | 'error' | 'warning' | 'debug';
  details: {
    message: string;
    error?: Error | string;
    stack?: string;
    props?: any;
    state?: any;
    context?: any;
    userAgent?: string;
    url?: string;
    elementId?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern?: string;
  resolution?: string;
}

class NLDLogger {
  private logs: NLDLogEntry[] = [];
  private maxLogs = 1000;
  private patterns: Map<string, number> = new Map();

  log(entry: Omit<NLDLogEntry, 'timestamp'>) {
    const logEntry: NLDLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      details: {
        ...entry.details,
        userAgent: navigator.userAgent,
        url: window.location.href,
      }
    };

    this.logs.push(logEntry);
    
    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Track patterns
    if (logEntry.pattern) {
      const count = this.patterns.get(logEntry.pattern) || 0;
      this.patterns.set(logEntry.pattern, count + 1);
    }

    // Console output for development
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      const logLevel = this.getConsoleMethod(entry.event, entry.severity);
      console[logLevel](`[NLD] ${entry.component}:`, logEntry);
    } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      const logLevel = this.getConsoleMethod(entry.event, entry.severity);
      console[logLevel](`[NLD] ${entry.component}:`, logEntry);
    }

    // Store in localStorage for persistence
    this.persistLogs();
  }

  private getConsoleMethod(event: NLDLogEntry['event'], severity: NLDLogEntry['severity']): 'log' | 'warn' | 'error' {
    if (event === 'render_failure' || event === 'error' || severity === 'critical') {
      return 'error';
    }
    if (event === 'warning' || severity === 'high') {
      return 'warn';
    }
    return 'log';
  }

  renderAttempt(component: string, props?: any, state?: any) {
    this.log({
      component,
      event: 'render_attempt',
      details: {
        message: `Attempting to render ${component}`,
        props,
        state
      },
      severity: 'low'
    });
  }

  renderSuccess(component: string, elementId?: string) {
    this.log({
      component,
      event: 'render_success',
      details: {
        message: `Successfully rendered ${component}`,
        elementId
      },
      severity: 'low',
      pattern: 'successful_render'
    });
  }

  renderFailure(component: string, error: Error | string, props?: any, state?: any) {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    
    this.log({
      component,
      event: 'render_failure',
      details: {
        message: `Failed to render ${component}: ${errorMessage}`,
        error: errorMessage,
        stack,
        props,
        state
      },
      severity: 'critical',
      pattern: this.categorizeError(errorMessage)
    });
  }

  error(component: string, error: Error | string, context?: any) {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    this.log({
      component,
      event: 'error',
      details: {
        message: errorMessage,
        error: errorMessage,
        stack,
        context
      },
      severity: 'high',
      pattern: this.categorizeError(errorMessage)
    });
  }

  warning(component: string, message: string, context?: any) {
    this.log({
      component,
      event: 'warning',
      details: {
        message,
        context
      },
      severity: 'medium'
    });
  }

  debug(component: string, message: string, data?: any) {
    this.log({
      component,
      event: 'debug',
      details: {
        message,
        context: data
      },
      severity: 'low'
    });
  }

  private categorizeError(errorMessage: string): string {
    const lowerMessage = errorMessage.toLowerCase();
    
    if (lowerMessage.includes('hook') || lowerMessage.includes('usewebsocket')) {
      return 'hook_error';
    }
    if (lowerMessage.includes('import') || lowerMessage.includes('module')) {
      return 'import_error';
    }
    if (lowerMessage.includes('render') || lowerMessage.includes('component')) {
      return 'render_error';
    }
    if (lowerMessage.includes('websocket') || lowerMessage.includes('connection')) {
      return 'websocket_error';
    }
    if (lowerMessage.includes('undefined') || lowerMessage.includes('null')) {
      return 'null_undefined_error';
    }
    if (lowerMessage.includes('cannot read') || lowerMessage.includes('property')) {
      return 'property_access_error';
    }
    
    return 'unknown_error';
  }

  // Get logs for analysis
  getLogs(component?: string, pattern?: string): NLDLogEntry[] {
    let filtered = this.logs;
    
    if (component) {
      filtered = filtered.filter(log => log.component === component);
    }
    
    if (pattern) {
      filtered = filtered.filter(log => log.pattern === pattern);
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Get pattern analysis
  getPatternAnalysis(): Array<{ pattern: string; count: number; percentage: number }> {
    const total = this.logs.length;
    return Array.from(this.patterns.entries())
      .map(([pattern, count]) => ({
        pattern,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  // Export logs for external analysis
  exportLogs(): string {
    return JSON.stringify({
      logs: this.logs,
      patterns: Object.fromEntries(this.patterns),
      analysis: this.getPatternAnalysis(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    this.patterns.clear();
    localStorage.removeItem('nld-logs');
  }

  private persistLogs() {
    try {
      const recentLogs = this.logs.slice(-100); // Keep only last 100 logs in localStorage
      localStorage.setItem('nld-logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('[NLD] Failed to persist logs:', error);
    }
  }

  // Load persisted logs on init
  loadPersistedLogs() {
    try {
      const stored = localStorage.getItem('nld-logs');
      if (stored) {
        const logs = JSON.parse(stored);
        this.logs.push(...logs);
      }
    } catch (error) {
      console.warn('[NLD] Failed to load persisted logs:', error);
    }
  }
}

// Global NLD Logger instance
export const nldLogger = new NLDLogger();

// Load persisted logs on module initialization
if (typeof window !== 'undefined') {
  nldLogger.loadPersistedLogs();
}

// React Error Boundary HOC
export function withNLDLogging<T extends object>(
  WrappedComponent: any,
  componentName: string
) {
  return function NLDLoggedComponent(props: T) {
    // Only use React hooks if React is available
    if (typeof window !== 'undefined' && window.React?.useEffect) {
      window.React.useEffect(() => {
        nldLogger.renderAttempt(componentName, props);
        
        // Success callback
        const timeoutId = setTimeout(() => {
          nldLogger.renderSuccess(componentName);
        }, 100);
        
        return () => clearTimeout(timeoutId);
      }, [props]);
    }

    try {
      if (typeof window !== 'undefined' && window.React?.createElement) {
        return window.React.createElement(WrappedComponent, props);
      }
      return null;
    } catch (error) {
      nldLogger.renderFailure(componentName, error as Error, props);
      throw error;
    }
  };
}

export default nldLogger;