/**
 * NLD Integration Layer - Seamless integration with ClaudeServiceManager architecture
 * 
 * This module provides seamless integration hooks for the Neural Learning Detection
 * system to monitor the ClaudeServiceManager + ClaudeInstanceManager architecture
 * without disrupting existing functionality.
 */

import { neuralLearningDetector, FailurePattern } from './NeuralLearningDetector';

export interface UserFeedbackEvent {
  type: 'success' | 'failure' | 'error' | 'improvement';
  description: string;
  context: any;
  timestamp?: Date;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  context?: any;
}

export class NLDIntegration {
  private isInitialized: boolean = false;
  private globalContext: any = {};
  private performanceObserver?: PerformanceObserver;
  private mutationObserver?: MutationObserver;
  private interceptors: Map<string, Function> = new Map();

  /**
   * Initialize NLD integration with ClaudeServiceManager architecture
   */
  initialize(): void {
    if (this.isInitialized) return;

    console.log('🔗 Initializing NLD Integration for ClaudeServiceManager architecture');

    // Activate the neural learning detector
    neuralLearningDetector.activate();

    // Set up global context monitoring
    this.setupGlobalContextMonitoring();

    // Instrument key methods and events
    this.instrumentClaudeServiceManager();
    this.instrumentClaudeInstanceManager();
    this.instrumentWebSocketTerminal();
    this.instrumentUIComponents();

    // Set up performance monitoring
    this.setupPerformanceMonitoring();

    // Set up DOM mutation monitoring
    this.setupDOMMonitoring();

    // Set up error boundary monitoring
    this.setupErrorMonitoring();

    this.isInitialized = true;
    console.log('✅ NLD Integration initialized successfully');
  }

  /**
   * Report user feedback for neural training
   */
  reportUserFeedback(feedback: UserFeedbackEvent): void {
    const enhancedFeedback = {
      ...feedback,
      timestamp: feedback.timestamp || new Date(),
      globalContext: this.globalContext
    };

    console.log('📝 NLD User Feedback:', enhancedFeedback);

    // Store the feedback for pattern analysis
    (window as any).__nld_user_feedback = (window as any).__nld_user_feedback || [];
    (window as any).__nld_user_feedback.push(enhancedFeedback);

    // Trigger pattern analysis if failure
    if (feedback.type === 'failure' || feedback.type === 'error') {
      this.triggerFailureAnalysis(enhancedFeedback);
    }
  }

  /**
   * Report performance metrics
   */
  reportPerformanceMetric(metric: PerformanceMetric): void {
    console.log('📊 NLD Performance Metric:', metric);

    // Store metric for trend analysis
    const metricKey = `__nld_${metric.name}`;
    (window as any)[metricKey] = (window as any)[metricKey] || [];
    (window as any)[metricKey].push(metric);

    // Keep only recent metrics (last 100)
    if ((window as any)[metricKey].length > 100) {
      (window as any)[metricKey] = (window as any)[metricKey].slice(-100);
    }

    // Update global context
    this.globalContext[metric.name] = metric.value;
  }

  /**
   * Detect trigger conditions for failure pattern analysis
   */
  detectTriggerCondition(userInput: string): boolean {
    const triggerPhrases = [
      "didn't work",
      "that worked",
      "failed",
      "broken",
      "working now",
      "not working",
      "error",
      "issue",
      "problem",
      "bug"
    ];

    const normalizedInput = userInput.toLowerCase();
    return triggerPhrases.some(phrase => normalizedInput.includes(phrase));
  }

  /**
   * Wrap WebSocket for monitoring
   */
  wrapWebSocket(ws: WebSocket, url: string): void {
    const originalSend = ws.send.bind(ws);
    const originalClose = ws.close.bind(ws);

    // Track connection attempts
    this.reportPerformanceMetric({
      name: 'websocket_connection_attempt',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      context: { url }
    });

    // Override send to track message frequency
    ws.send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
      this.reportPerformanceMetric({
        name: 'websocket_message_sent',
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        context: { url, dataSize: data.toString().length }
      });

      // Track API spam detection
      const now = Date.now();
      (window as any).__nld_api_requests = (window as any).__nld_api_requests || [];
      (window as any).__nld_api_requests.push({ timestamp: now, url, type: 'websocket' });

      return originalSend(data);
    };

    // Track connection events
    ws.addEventListener('open', () => {
      (window as any).__nld_websocket_connections = (window as any).__nld_websocket_connections || [];
      (window as any).__nld_websocket_connections.push({ 
        url, 
        connected: true, 
        timestamp: Date.now() 
      });

      this.reportUserFeedback({
        type: 'success',
        description: 'WebSocket connection established',
        context: { url }
      });
    });

    ws.addEventListener('error', (error) => {
      (window as any).__nld_websocket_connections = (window as any).__nld_websocket_connections || [];
      (window as any).__nld_websocket_connections.push({ 
        url, 
        connected: false, 
        lastError: error, 
        lastErrorTime: Date.now() 
      });

      this.reportUserFeedback({
        type: 'error',
        description: 'WebSocket connection error',
        context: { url, error }
      });
    });

    ws.addEventListener('close', () => {
      this.reportPerformanceMetric({
        name: 'websocket_connection_closed',
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        context: { url }
      });
    });
  }

  /**
   * Private methods for instrumentation
   */
  private setupGlobalContextMonitoring(): void {
    // Monitor global variables that indicate system state
    this.globalContext = {
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      timestamp: Date.now()
    };

    // Update viewport on resize
    window.addEventListener('resize', () => {
      this.globalContext.viewport = { 
        width: window.innerWidth, 
        height: window.innerHeight 
      };
    });
  }

  private instrumentClaudeServiceManager(): void {
    // Monitor ClaudeServiceManager API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0] as string;
      const startTime = Date.now();

      try {
        const response = await originalFetch(...args);
        const endTime = Date.now();

        // Track API response time
        this.reportPerformanceMetric({
          name: 'api_response_time',
          value: endTime - startTime,
          unit: 'ms',
          timestamp: new Date(),
          context: { url, status: response.status }
        });

        // Track API request rate
        (window as any).__nld_api_requests = (window as any).__nld_api_requests || [];
        (window as any).__nld_api_requests.push({ 
          timestamp: startTime, 
          url, 
          type: 'http',
          responseTime: endTime - startTime,
          status: response.status
        });

        return response;
      } catch (error) {
        const endTime = Date.now();
        
        this.reportUserFeedback({
          type: 'error',
          description: 'API request failed',
          context: { url, error: error.message, duration: endTime - startTime }
        });

        throw error;
      }
    };
  }

  private instrumentClaudeInstanceManager(): void {
    // Monitor instance creation and connection patterns
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = (...args) => {
      const message = args.join(' ');
      
      // Detect service manager conflicts
      if (message.includes('ClaudeServiceManager') && message.includes('instance')) {
        (window as any).__nld_service_instances = (window as any).__nld_service_instances || [];
        (window as any).__nld_service_instances.push({ timestamp: Date.now(), message });
      }

      // Detect worker instance issues
      if (message.includes('worker') && (message.includes('failed') || message.includes('error'))) {
        (window as any).__nld_worker_failures = ((window as any).__nld_worker_failures || 0) + 1;
      }

      return originalConsoleLog(...args);
    };

    console.error = (...args) => {
      const message = args.join(' ');
      
      // Track connection failures
      if (message.includes('connection') || message.includes('WebSocket')) {
        (window as any).__nld_active_connections = ((window as any).__nld_active_connections || 1) + 1;
      }

      return originalConsoleError(...args);
    };
  }

  private instrumentWebSocketTerminal(): void {
    // Monitor WebSocket terminal patterns through global event tracking
    document.addEventListener('keydown', (event) => {
      // Track user interaction frequency
      this.reportPerformanceMetric({
        name: 'user_interaction',
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        context: { key: event.key, target: event.target?.nodeName }
      });
    });
  }

  private instrumentUIComponents(): void {
    // Monitor React component rendering
    const originalCreateElement = React?.createElement;
    if (originalCreateElement) {
      React.createElement = (...args) => {
        const componentName = args[0]?.name || args[0];
        
        // Track component rendering
        this.reportPerformanceMetric({
          name: 'component_render',
          value: 1,
          unit: 'count',
          timestamp: new Date(),
          context: { component: componentName }
        });

        return originalCreateElement(...args);
      };
    }
  }

  private setupPerformanceMonitoring(): void {
    // Monitor performance entries
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.reportPerformanceMetric({
            name: `performance_${entry.entryType}`,
            value: entry.duration || entry.startTime,
            unit: 'ms',
            timestamp: new Date(),
            context: { name: entry.name, entryType: entry.entryType }
          });
        }
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
    }

    // Monitor memory usage
    if ((performance as any).memory) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.reportPerformanceMetric({
          name: 'memory_used',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          timestamp: new Date()
        });
      }, 30000); // Every 30 seconds
    }
  }

  private setupDOMMonitoring(): void {
    // Monitor DOM mutations for component loading issues
    if ('MutationObserver' in window) {
      this.mutationObserver = new MutationObserver((mutations) => {
        let addedNodes = 0;
        let removedNodes = 0;

        mutations.forEach((mutation) => {
          addedNodes += mutation.addedNodes.length;
          removedNodes += mutation.removedNodes.length;
        });

        if (addedNodes > 10 || removedNodes > 10) {
          this.reportPerformanceMetric({
            name: 'dom_mutations',
            value: addedNodes + removedNodes,
            unit: 'count',
            timestamp: new Date(),
            context: { added: addedNodes, removed: removedNodes }
          });
        }
      });

      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  private setupErrorMonitoring(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.reportUserFeedback({
        type: 'error',
        description: 'JavaScript runtime error',
        context: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        }
      });

      // Track component failures
      if (event.message.includes('React') || event.message.includes('component')) {
        (window as any).__nld_component_failures = ((window as any).__nld_component_failures || 0) + 1;
      }
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.reportUserFeedback({
        type: 'error',
        description: 'Unhandled promise rejection',
        context: {
          reason: event.reason,
          promise: event.promise
        }
      });
    });
  }

  private triggerFailureAnalysis(feedback: UserFeedbackEvent): void {
    // Immediate failure pattern analysis
    console.log('🔍 NLD Triggering failure analysis for:', feedback.description);
    
    // Store failure context for pattern matching
    (window as any).__nld_failure_context = {
      ...feedback,
      systemState: this.globalContext,
      timestamp: Date.now()
    };

    // Trigger specific analysis based on failure type
    if (feedback.context?.url && feedback.context.url.includes('websocket')) {
      (window as any).__nld_websocket_failures = ((window as any).__nld_websocket_failures || 0) + 1;
    }

    if (feedback.description.includes('component') || feedback.description.includes('render')) {
      (window as any).__nld_component_failures = ((window as any).__nld_component_failures || 0) + 1;
    }

    if (feedback.description.includes('API') || feedback.description.includes('fetch')) {
      (window as any).__nld_api_failures = ((window as any).__nld_api_failures || 0) + 1;
    }
  }

  /**
   * Get current system state for analysis
   */
  getSystemState(): any {
    return {
      ...this.globalContext,
      metrics: neuralLearningDetector.getMetrics(),
      patterns: neuralLearningDetector.getPatterns().length,
      trainingRecords: neuralLearningDetector.getTrainingData().length,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Generate integration report
   */
  generateIntegrationReport(): string {
    const systemState = this.getSystemState();
    const patterns = neuralLearningDetector.getPatterns();
    const recentFailures = (window as any).__nld_user_feedback?.filter(
      (f: any) => (f.type === 'failure' || f.type === 'error') && 
      (Date.now() - new Date(f.timestamp).getTime()) < 300000 // Last 5 minutes
    ) || [];

    return `
**NLD Integration Report - ClaudeServiceManager Architecture**

**System State:**
- Initialized: ${systemState.isInitialized ? '✅' : '❌'}
- Viewport: ${systemState.viewport?.width}x${systemState.viewport?.height}
- Active Patterns: ${patterns.length}
- Training Records: ${systemState.trainingRecords}
- Recent Failures: ${recentFailures.length}

**Integration Health:**
- Performance Observer: ${this.performanceObserver ? '✅' : '❌'}
- Mutation Observer: ${this.mutationObserver ? '✅' : '❌'}
- WebSocket Monitoring: ${(window as any).__nld_websocket_connections ? '✅' : '❌'}
- API Monitoring: ${(window as any).__nld_api_requests ? '✅' : '❌'}

**Detected Issues:**
${patterns.filter(p => p.severity === 'critical' || p.severity === 'high')
  .map(p => `- [${p.severity.toUpperCase()}] ${p.description}`)
  .join('\n') || 'No critical issues detected'}

**Recommendations:**
${patterns.slice(0, 3)
  .map(p => `- ${p.prediction.recommendedAction}`)
  .join('\n') || 'No specific recommendations at this time'}
`;
  }

  /**
   * Cleanup integration
   */
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    neuralLearningDetector.deactivate();
    this.isInitialized = false;
    
    console.log('🔗 NLD Integration cleaned up');
  }
}

// Singleton instance
export const nldIntegration = new NLDIntegration();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  // Defer initialization to allow other modules to load
  setTimeout(() => nldIntegration.initialize(), 1000);
}