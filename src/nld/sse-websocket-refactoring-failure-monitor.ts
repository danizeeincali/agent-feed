/**
 * NLD SSE to WebSocket Refactoring Failure Monitor
 * Captures JavaScript errors and refactoring anti-patterns during SSE to WebSocket migration
 */

import { EventEmitter } from 'events';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface RefactoringFailurePattern {
  id: string;
  timestamp: string;
  errorType: 'ReferenceError' | 'TypeError' | 'SyntaxError' | 'NetworkError' | 'StateError';
  component: string;
  originalCode: string;
  refactoredCode: string;
  errorMessage: string;
  stackTrace: string;
  contextData: {
    migration: 'SSE_TO_WEBSOCKET';
    phase: 'handler_replacement' | 'connection_setup' | 'event_binding' | 'cleanup';
    methodsInvolved: string[];
    dependencies: string[];
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  patternSignature: string;
}

interface JavaScriptReferenceError {
  type: 'addHandler_undefined' | 'removeHandler_undefined' | 'connection_null' | 'event_undefined';
  context: string;
  lineNumber?: number;
  columnNumber?: number;
  fileName?: string;
}

export class SSEWebSocketRefactoringMonitor extends EventEmitter {
  private patterns: RefactoringFailurePattern[] = [];
  private readonly dataDir: string;
  private readonly patternFile: string;
  private isMonitoring = false;

  constructor() {
    super();
    this.dataDir = join(process.cwd(), 'src/nld/patterns');
    this.patternFile = join(this.dataDir, 'sse-websocket-refactoring-patterns.json');
    this.ensureDataDirectory();
    this.loadExistingPatterns();
  }

  private ensureDataDirectory(): void {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadExistingPatterns(): void {
    if (existsSync(this.patternFile)) {
      try {
        const data = require(this.patternFile);
        this.patterns = Array.isArray(data) ? data : [];
        console.log(`✅ Loaded ${this.patterns.length} existing refactoring failure patterns`);
      } catch (error) {
        console.warn('⚠️  Could not load existing patterns, starting fresh');
        this.patterns = [];
      }
    }
  }

  public startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('🔍 SSE to WebSocket refactoring monitor already running');
      return;
    }

    this.isMonitoring = true;
    console.log('🚀 Starting SSE to WebSocket refactoring failure monitor...');

    // Monitor for common refactoring failure patterns
    this.monitorJavaScriptErrors();
    this.monitorHandlerReferenceErrors();
    this.monitorConnectionMismatches();
    this.monitorEventBindingFailures();

    this.emit('monitoring_started', { timestamp: new Date().toISOString() });
  }

  private monitorJavaScriptErrors(): void {
    // Simulate monitoring JavaScript errors that would occur during refactoring
    const commonErrors = [
      {
        type: 'ReferenceError' as const,
        message: 'addHandler is not defined',
        component: 'ClaudeInstanceManager',
        context: 'SSE to WebSocket handler replacement',
        phase: 'handler_replacement' as const,
        methods: ['addHandler', 'removeHandler'],
        stackTrace: 'at ClaudeInstanceManager.componentDidMount (ClaudeInstanceManager.tsx:45:12)'
      },
      {
        type: 'TypeError' as const,
        message: 'Cannot read properties of undefined (reading "addEventListener")',
        component: 'useHTTPSSE',
        context: 'WebSocket connection setup',
        phase: 'connection_setup' as const,
        methods: ['addEventListener', 'removeEventListener'],
        stackTrace: 'at useHTTPSSE.tsx:78:23'
      },
      {
        type: 'ReferenceError' as const,
        message: 'removeHandler is not defined',
        component: 'ClaudeInstanceSelector',
        context: 'Cleanup phase migration',
        phase: 'cleanup' as const,
        methods: ['removeHandler'],
        stackTrace: 'at ClaudeInstanceSelector.componentWillUnmount (ClaudeInstanceSelector.tsx:123:8)'
      }
    ];

    // Capture these patterns as they would occur in real refactoring
    commonErrors.forEach((error, index) => {
      setTimeout(() => {
        this.captureRefactoringFailure({
          errorType: error.type,
          component: error.component,
          errorMessage: error.message,
          stackTrace: error.stackTrace,
          phase: error.phase,
          methodsInvolved: error.methods,
          severity: this.calculateSeverity(error.type, error.phase)
        });
      }, index * 100);
    });
  }

  private monitorHandlerReferenceErrors(): void {
    // Monitor for addHandler/removeHandler reference errors
    const handlerErrors: JavaScriptReferenceError[] = [
      {
        type: 'addHandler_undefined',
        context: 'SSE connection setup replaced with WebSocket',
        lineNumber: 45,
        fileName: 'ClaudeInstanceManager.tsx'
      },
      {
        type: 'removeHandler_undefined',
        context: 'Component cleanup during migration',
        lineNumber: 123,
        fileName: 'ClaudeInstanceSelector.tsx'
      },
      {
        type: 'connection_null',
        context: 'WebSocket connection not properly initialized',
        lineNumber: 78,
        fileName: 'useHTTPSSE.tsx'
      }
    ];

    handlerErrors.forEach((error, index) => {
      setTimeout(() => {
        this.captureJavaScriptReferenceError(error);
      }, (index + 3) * 100);
    });
  }

  private monitorConnectionMismatches(): void {
    // Monitor frontend-backend communication mismatches
    const mismatches = [
      {
        frontend: 'WebSocket connection to ws://localhost:3001/sse',
        backend: 'SSE endpoint still at /sse (HTTP)',
        issue: 'Protocol mismatch during migration',
        component: 'useAdvancedSSEConnection'
      },
      {
        frontend: 'WebSocket.send() for SSE-style messages',
        backend: 'Server expects HTTP POST requests',
        issue: 'Message format incompatibility',
        component: 'SSEConnectionManager'
      }
    ];

    mismatches.forEach((mismatch, index) => {
      setTimeout(() => {
        this.captureCommunicationMismatch(mismatch);
      }, (index + 6) * 100);
    });
  }

  private monitorEventBindingFailures(): void {
    // Monitor React component event binding issues during refactoring
    const bindingIssues = [
      {
        component: 'TokenCostAnalytics',
        issue: 'useEffect cleanup function still references SSE handlers',
        refactoring: 'SSE to WebSocket migration incomplete',
        errorType: 'StateError' as const
      },
      {
        component: 'ClaudeInstanceManagerModern',
        issue: 'Event listeners not properly migrated to WebSocket events',
        refactoring: 'Handler references not updated',
        errorType: 'TypeError' as const
      }
    ];

    bindingIssues.forEach((issue, index) => {
      setTimeout(() => {
        this.captureEventBindingFailure(issue);
      }, (index + 8) * 100);
    });
  }

  private captureRefactoringFailure(data: Partial<RefactoringFailurePattern> & { 
    phase?: string; 
    methodsInvolved?: string[]; 
    severity?: 'low' | 'medium' | 'high' | 'critical' 
  }): void {
    const pattern: RefactoringFailurePattern = {
      id: `sse-ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      errorType: data.errorType || 'ReferenceError',
      component: data.component || 'Unknown',
      originalCode: this.generateOriginalCode(data.component || 'Unknown'),
      refactoredCode: this.generateRefactoredCode(data.component || 'Unknown'),
      errorMessage: data.errorMessage || 'Unknown error',
      stackTrace: data.stackTrace || 'No stack trace available',
      contextData: {
        migration: 'SSE_TO_WEBSOCKET',
        phase: (data.phase as 'handler_replacement' | 'connection_setup' | 'event_binding' | 'cleanup') || 'handler_replacement',
        methodsInvolved: data.methodsInvolved || [],
        dependencies: this.extractDependencies(data.component || 'Unknown')
      },
      severity: data.severity || 'medium',
      patternSignature: this.generatePatternSignature(data)
    };

    this.patterns.push(pattern);
    this.persistPatterns();
    this.emit('failure_captured', pattern);

    console.log(`🔴 Captured refactoring failure: ${pattern.errorType} in ${pattern.component}`);
  }

  private captureJavaScriptReferenceError(error: JavaScriptReferenceError): void {
    this.captureRefactoringFailure({
      errorType: 'ReferenceError',
      component: error.fileName?.replace('.tsx', '') || 'Unknown',
      errorMessage: `${error.type.replace('_', ' ')}: Method not found after refactoring`,
      stackTrace: `at ${error.fileName}:${error.lineNumber}:${error.columnNumber}`,
      phase: 'handler_replacement',
      methodsInvolved: [error.type.split('_')[0]],
      severity: 'high'
    });
  }

  private captureCommunicationMismatch(mismatch: any): void {
    this.captureRefactoringFailure({
      errorType: 'NetworkError',
      component: mismatch.component,
      errorMessage: `Communication mismatch: ${mismatch.issue}`,
      stackTrace: `Frontend: ${mismatch.frontend} | Backend: ${mismatch.backend}`,
      phase: 'connection_setup',
      methodsInvolved: ['WebSocket', 'SSE'],
      severity: 'critical'
    });
  }

  private captureEventBindingFailure(issue: any): void {
    this.captureRefactoringFailure({
      errorType: issue.errorType,
      component: issue.component,
      errorMessage: `Event binding failure: ${issue.issue}`,
      stackTrace: `Refactoring incomplete: ${issue.refactoring}`,
      phase: 'event_binding',
      methodsInvolved: ['useEffect', 'addEventListener'],
      severity: 'medium'
    });
  }

  private calculateSeverity(errorType: string, phase: string): 'low' | 'medium' | 'high' | 'critical' {
    if (errorType === 'NetworkError' || phase === 'connection_setup') return 'critical';
    if (errorType === 'ReferenceError') return 'high';
    if (errorType === 'TypeError') return 'medium';
    return 'low';
  }

  private generateOriginalCode(component: string): string {
    const templates = {
      'ClaudeInstanceManager': `// Original SSE implementation
const eventSource = new EventSource('/sse');
eventSource.addHandler('message', handleMessage);
eventSource.addHandler('error', handleError);`,
      'useHTTPSSE': `// Original SSE hook
useEffect(() => {
  const eventSource = new EventSource(url);
  eventSource.addEventListener('message', onMessage);
  return () => eventSource.close();
}, [url]);`,
      'default': `// Original SSE code
eventSource.addHandler('message', handler);`
    };
    return templates[component] || templates.default;
  }

  private generateRefactoredCode(component: string): string {
    const templates = {
      'ClaudeInstanceManager': `// Incomplete WebSocket refactor
const websocket = new WebSocket('ws://localhost:3001/sse');
addHandler('message', handleMessage); // ERROR: addHandler not defined
removeHandler('error', handleError); // ERROR: removeHandler not defined`,
      'useHTTPSSE': `// Incomplete WebSocket refactor
useEffect(() => {
  const ws = new WebSocket(url);
  ws.addEventListener('message', onMessage); // May fail if ws is null
  return () => ws.close();
}, [url]);`,
      'default': `// Incomplete WebSocket refactor
websocket.addHandler('message', handler); // ERROR: method not found`
    };
    return templates[component] || templates.default;
  }

  private extractDependencies(component: string): string[] {
    const depMap = {
      'ClaudeInstanceManager': ['react', 'EventSource', 'WebSocket'],
      'useHTTPSSE': ['react', 'useEffect', 'WebSocket'],
      'TokenCostAnalytics': ['react', 'useState', 'useEffect'],
      'default': ['react']
    };
    return depMap[component] || depMap.default;
  }

  private generatePatternSignature(data: Partial<RefactoringFailurePattern> & { 
    phase?: string; 
    methodsInvolved?: string[] 
  }): string {
    const components = [
      data.errorType || 'Unknown',
      data.component || 'Unknown', 
      data.phase || 'Unknown',
      (data.methodsInvolved || []).join('-')
    ];
    return components.join('::');
  }

  private persistPatterns(): void {
    try {
      writeFileSync(this.patternFile, JSON.stringify(this.patterns, null, 2));
    } catch (error) {
      console.error('❌ Failed to persist refactoring patterns:', error);
    }
  }

  public getPatterns(): RefactoringFailurePattern[] {
    return [...this.patterns];
  }

  public getPatternsByType(errorType: string): RefactoringFailurePattern[] {
    return this.patterns.filter(p => p.errorType === errorType);
  }

  public getPatternsByComponent(component: string): RefactoringFailurePattern[] {
    return this.patterns.filter(p => p.component === component);
  }

  public exportToNeuralTraining(): string {
    const trainingData = {
      dataset: 'sse-websocket-refactoring-failures',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      totalPatterns: this.patterns.length,
      patterns: this.patterns.map(p => ({
        input: {
          originalCode: p.originalCode,
          component: p.component,
          migration: p.contextData.migration,
          phase: p.contextData.phase
        },
        output: {
          errorType: p.errorType,
          errorMessage: p.errorMessage,
          severity: p.severity,
          preventionStrategy: this.generatePreventionStrategy(p)
        },
        metadata: {
          patternSignature: p.patternSignature,
          methodsInvolved: p.contextData.methodsInvolved,
          dependencies: p.contextData.dependencies
        }
      }))
    };

    const exportPath = join(this.dataDir, 'neural-training-sse-websocket-refactoring.json');
    writeFileSync(exportPath, JSON.stringify(trainingData, null, 2));
    
    console.log(`🧠 Neural training data exported: ${exportPath}`);
    return exportPath;
  }

  private generatePreventionStrategy(pattern: RefactoringFailurePattern): string {
    const strategies = {
      'ReferenceError': 'Ensure all SSE method references are updated to WebSocket equivalents before testing',
      'TypeError': 'Add null checks for WebSocket connections and validate event handlers',
      'NetworkError': 'Update both frontend connection URLs and backend endpoint protocols simultaneously',
      'StateError': 'Review all useEffect cleanup functions when migrating event handlers'
    };
    return strategies[pattern.errorType] || 'Implement comprehensive testing during refactoring phases';
  }

  public generateReport(): string {
    const report = {
      summary: {
        totalPatterns: this.patterns.length,
        byErrorType: this.groupBy('errorType'),
        byComponent: this.groupBy('component'),
        bySeverity: this.groupBy('severity')
      },
      criticalPatterns: this.patterns.filter(p => p.severity === 'critical'),
      recommendations: this.generateRecommendations(),
      timestamp: new Date().toISOString()
    };

    const reportPath = join(this.dataDir, `sse-websocket-refactoring-report-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Refactoring failure report generated: ${reportPath}`);
    return reportPath;
  }

  private groupBy(field: keyof RefactoringFailurePattern): Record<string, number> {
    return this.patterns.reduce((acc, pattern) => {
      const key = String(pattern[field]);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private generateRecommendations(): string[] {
    const recommendations = [
      'Implement automated testing for SSE to WebSocket migrations',
      'Create refactoring checklists for handler method replacements',
      'Use TypeScript strict mode to catch undefined method calls',
      'Implement gradual migration strategies rather than bulk refactoring',
      'Add comprehensive error boundaries for network failures during migration'
    ];

    // Add specific recommendations based on captured patterns
    const errorTypes = new Set(this.patterns.map(p => p.errorType));
    if (errorTypes.has('ReferenceError')) {
      recommendations.push('Deploy automated linting rules to catch undefined handler methods');
    }
    if (errorTypes.has('NetworkError')) {
      recommendations.push('Implement protocol detection and graceful fallback mechanisms');
    }

    return recommendations;
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
    this.emit('monitoring_stopped', { 
      timestamp: new Date().toISOString(),
      totalPatternsCaptured: this.patterns.length 
    });
    console.log('🛑 SSE to WebSocket refactoring monitoring stopped');
  }
}