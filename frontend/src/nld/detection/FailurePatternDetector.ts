/**
 * NLD Failure Pattern Detector
 * Captures and analyzes failure patterns in real-time
 */

export interface FailurePattern {
  id: string;
  type: 'sse_connection' | 'api_call' | 'user_interaction' | 'component_lifecycle' | 'data_fetching' | 'ui_state';
  context: {
    component: string;
    action: string;
    timestamp: number;
    userAgent: string;
    url: string;
    sessionId: string;
  };
  error: {
    message: string;
    stack?: string;
    code?: string | number;
  };
  userFeedback?: {
    trigger: string; // "didn't work", "not working", "failed", "broken", etc.
    confidence: number; // 0-1 score
    originalTask: string;
    claudeSolution: string;
  };
  resolution?: {
    method: string;
    success: boolean;
    timeToResolve: number;
  };
}

export class FailurePatternDetector {
  private patterns: Map<string, FailurePattern> = new Map();
  private userFeedbackTriggers = [
    'didn\'t work', 'not working', 'failed', 'broken', 'error',
    'wrong', 'issue', 'problem', 'bug', 'crash', 'freeze'
  ];

  constructor(private sessionId: string = `session_${Date.now()}`) {
    this.initializeDetection();
  }

  private initializeDetection(): void {
    // Global error detection
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // Console error monitoring
    this.interceptConsoleError();
    
    // User feedback monitoring
    this.setupUserFeedbackDetection();
  }

  private handleGlobalError(event: ErrorEvent): void {
    const pattern: FailurePattern = {
      id: this.generateId(),
      type: 'component_lifecycle',
      context: {
        component: 'global',
        action: 'script_error',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId
      },
      error: {
        message: event.message,
        stack: event.error?.stack,
        code: event.lineno
      }
    };

    this.capturePattern(pattern);
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const pattern: FailurePattern = {
      id: this.generateId(),
      type: 'api_call',
      context: {
        component: 'promise',
        action: 'unhandled_rejection',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId
      },
      error: {
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack
      }
    };

    this.capturePattern(pattern);
  }

  private interceptConsoleError(): void {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const errorMessage = args.join(' ');
      
      // Check for SSE connection errors
      if (errorMessage.includes('EventSource') || errorMessage.includes('SSE')) {
        this.detectSSEFailure(errorMessage);
      }
      
      // Check for API errors
      if (errorMessage.includes('fetch') || errorMessage.includes('axios') || errorMessage.includes('API')) {
        this.detectAPIFailure(errorMessage);
      }

      originalError.apply(console, args);
    };
  }

  private setupUserFeedbackDetection(): void {
    // Monitor for user feedback patterns in chat/input elements
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && target.value) {
        this.analyzeUserFeedback(target.value);
      }
    });

    // Monitor for console commands that indicate issues
    this.monitorConsoleCommands();
  }

  private analyzeUserFeedback(text: string): void {
    const lowerText = text.toLowerCase();
    const trigger = this.userFeedbackTriggers.find(t => lowerText.includes(t));
    
    if (trigger) {
      const confidence = this.calculateFeedbackConfidence(lowerText, trigger);
      
      if (confidence > 0.5) {
        const pattern: FailurePattern = {
          id: this.generateId(),
          type: 'user_interaction',
          context: {
            component: 'user_feedback',
            action: 'negative_feedback',
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            sessionId: this.sessionId
          },
          error: {
            message: `User reported issue: ${trigger}`,
          },
          userFeedback: {
            trigger,
            confidence,
            originalTask: this.extractTaskContext(text),
            claudeSolution: this.getLastClaudeSolution()
          }
        };

        this.capturePattern(pattern);
      }
    }
  }

  private calculateFeedbackConfidence(text: string, trigger: string): number {
    let confidence = 0.5;
    
    // Increase confidence for explicit failure words
    if (text.includes('error') || text.includes('failed') || text.includes('broken')) {
      confidence += 0.2;
    }
    
    // Increase confidence for context clues
    if (text.includes('when I') || text.includes('tried to') || text.includes('expected')) {
      confidence += 0.15;
    }
    
    // Increase confidence for solution attempts
    if (text.includes('but') || text.includes('however') || text.includes('instead')) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private extractTaskContext(text: string): string {
    // Extract what the user was trying to do
    const taskPatterns = [
      /trying to (.+?)(?:\.|,|$)/i,
      /when I (.+?)(?:\.|,|$)/i,
      /to (.+?)(?:\.|,|$)/i
    ];

    for (const pattern of taskPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }

    return text.substring(0, 100); // Fallback to first 100 chars
  }

  private getLastClaudeSolution(): string {
    // This would integrate with the chat history to get Claude's last response
    // For now, return placeholder
    return 'Last Claude solution context would be captured here';
  }

  private monitorConsoleCommands(): void {
    // Monitor developer console for debugging commands that indicate issues
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('debug') || message.includes('test') || message.includes('check')) {
        // User is debugging - might indicate an issue
        this.detectDebuggingActivity(message);
      }
      originalLog.apply(console, args);
    };
  }

  public detectSSEFailure(errorMessage: string): void {
    const pattern: FailurePattern = {
      id: this.generateId(),
      type: 'sse_connection',
      context: {
        component: 'EventSource',
        action: 'connection_failure',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId
      },
      error: {
        message: errorMessage,
        code: 'SSE_CONNECTION_FAILED'
      }
    };

    this.capturePattern(pattern);
  }

  public detectAPIFailure(errorMessage: string, response?: Response): void {
    const pattern: FailurePattern = {
      id: this.generateId(),
      type: 'api_call',
      context: {
        component: 'API',
        action: 'request_failure',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId
      },
      error: {
        message: errorMessage,
        code: response?.status || 'API_ERROR'
      }
    };

    this.capturePattern(pattern);
  }

  public detectComponentFailure(component: string, action: string, error: Error): void {
    const pattern: FailurePattern = {
      id: this.generateId(),
      type: 'component_lifecycle',
      context: {
        component,
        action,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId
      },
      error: {
        message: error.message,
        stack: error.stack,
        code: error.name
      }
    };

    this.capturePattern(pattern);
  }

  public detectDataFetchingFailure(endpoint: string, error: Error): void {
    const pattern: FailurePattern = {
      id: this.generateId(),
      type: 'data_fetching',
      context: {
        component: 'DataFetcher',
        action: `fetch_${endpoint}`,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId
      },
      error: {
        message: error.message,
        stack: error.stack
      }
    };

    this.capturePattern(pattern);
  }

  public detectUIStateInconsistency(component: string, expectedState: any, actualState: any): void {
    const pattern: FailurePattern = {
      id: this.generateId(),
      type: 'ui_state',
      context: {
        component,
        action: 'state_inconsistency',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId
      },
      error: {
        message: `UI state inconsistency: expected ${JSON.stringify(expectedState)}, got ${JSON.stringify(actualState)}`,
      }
    };

    this.capturePattern(pattern);
  }

  private detectDebuggingActivity(message: string): void {
    const pattern: FailurePattern = {
      id: this.generateId(),
      type: 'user_interaction',
      context: {
        component: 'developer_console',
        action: 'debugging_activity',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId
      },
      error: {
        message: `Debugging activity detected: ${message}`,
      }
    };

    this.capturePattern(pattern);
  }

  private capturePattern(pattern: FailurePattern): void {
    this.patterns.set(pattern.id, pattern);
    
    // Send to NLD learning system
    this.sendToLearningSystem(pattern);
    
    // Store in local storage for persistence
    this.persistPattern(pattern);
    
    console.debug('NLD: Captured failure pattern', pattern);
  }

  private sendToLearningSystem(pattern: FailurePattern): void {
    // This would integrate with the claude-flow neural system
    try {
      // For now, we'll use the memory system to store patterns
      const patternData = {
        pattern,
        timestamp: Date.now(),
        sessionId: this.sessionId
      };
      
      // In a real implementation, this would send to the neural learning system
      localStorage.setItem(`nld_pattern_${pattern.id}`, JSON.stringify(patternData));
    } catch (error) {
      console.warn('Failed to send pattern to learning system:', error);
    }
  }

  private persistPattern(pattern: FailurePattern): void {
    try {
      const existingPatterns = JSON.parse(localStorage.getItem('nld_failure_patterns') || '[]');
      existingPatterns.push(pattern);
      
      // Keep only the last 100 patterns to prevent storage overflow
      const trimmedPatterns = existingPatterns.slice(-100);
      localStorage.setItem('nld_failure_patterns', JSON.stringify(trimmedPatterns));
    } catch (error) {
      console.warn('Failed to persist pattern:', error);
    }
  }

  private generateId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getPatterns(): FailurePattern[] {
    return Array.from(this.patterns.values());
  }

  public getPatternsByType(type: FailurePattern['type']): FailurePattern[] {
    return this.getPatterns().filter(p => p.type === type);
  }

  public clearPatterns(): void {
    this.patterns.clear();
    localStorage.removeItem('nld_failure_patterns');
  }

  public exportPatterns(): string {
    return JSON.stringify(this.getPatterns(), null, 2);
  }
}

// Global singleton instance
export const failureDetector = new FailurePatternDetector();