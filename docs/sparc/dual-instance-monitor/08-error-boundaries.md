# SPARC Phase 8: Error Boundary and Graceful Degradation Strategies

## Overview

This phase implements comprehensive error boundaries and graceful degradation strategies to ensure the Dual Instance Monitor system remains functional and user-friendly even when components fail or external systems become unavailable.

## Error Boundary Architecture

### 1. Hierarchical Error Boundary System

```typescript
// /frontend/src/components/dual-instance/error-boundaries/DualInstanceErrorBoundary.tsx
import React, { Component, ReactNode, ErrorInfo } from 'react';
import { ErrorLogger } from '@/services/error-logger';
import { ErrorRecoveryManager } from '@/services/error-recovery';
import { FallbackComponent } from './FallbackComponent';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  recoveryAttempts: number;
  lastErrorTime: Date | null;
}

interface DualInstanceErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRecoveryAttempts?: number;
  recoveryDelay?: number;
  isolateFailures?: boolean;
}

export class DualInstanceErrorBoundary extends Component<
  DualInstanceErrorBoundaryProps,
  ErrorBoundaryState
> {
  private errorLogger: ErrorLogger;
  private recoveryManager: ErrorRecoveryManager;
  private recoveryTimer?: NodeJS.Timeout;

  constructor(props: DualInstanceErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      recoveryAttempts: 0,
      lastErrorTime: null
    };

    this.errorLogger = new ErrorLogger();
    this.recoveryManager = new ErrorRecoveryManager();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastErrorTime: new Date()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, maxRecoveryAttempts = 3 } = this.props;
    
    // Update state with error info
    this.setState({ errorInfo });

    // Log error with context
    this.logError(error, errorInfo);

    // Notify parent component
    onError?.(error, errorInfo);

    // Attempt recovery if within limits
    if (this.state.recoveryAttempts < maxRecoveryAttempts) {
      this.scheduleRecovery();
    } else {
      // Max attempts reached, escalate
      this.escalateError(error, errorInfo);
    }
  }

  private logError(error: Error, errorInfo: ErrorInfo): void {
    const errorRecord = {
      id: this.state.errorId!,
      timestamp: new Date(),
      component: 'DualInstanceMonitor',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      context: this.gatherErrorContext(),
      severity: this.classifyErrorSeverity(error)
    };

    this.errorLogger.logError(errorRecord);
  }

  private gatherErrorContext(): ErrorContext {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      memoryUsage: this.getMemoryUsage(),
      connectionCount: this.getActiveConnectionCount(),
      systemStatus: this.getSystemStatus()
    };
  }

  private classifyErrorSeverity(error: Error): ErrorSeverity {
    // Critical errors that break core functionality
    if (error.name === 'ChunkLoadError' || 
        error.message.includes('Network Error') ||
        error.message.includes('WebSocket')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity for component failures
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return ErrorSeverity.HIGH;
    }

    // Medium for rendering issues
    if (error.message.includes('render') || error.message.includes('prop')) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  private scheduleRecovery(): void {
    const { recoveryDelay = 2000 } = this.props;
    const delay = this.calculateRecoveryDelay();

    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery();
    }, delay);
  }

  private calculateRecoveryDelay(): number {
    const { recoveryDelay = 2000 } = this.props;
    const { recoveryAttempts } = this.state;
    
    // Exponential backoff with jitter
    const baseDelay = recoveryDelay * Math.pow(2, recoveryAttempts);
    const jitter = Math.random() * 1000;
    
    return Math.min(baseDelay + jitter, 30000); // Max 30 seconds
  }

  private attemptRecovery(): void {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempts: prevState.recoveryAttempts + 1
    }));

    // Log recovery attempt
    this.errorLogger.logRecoveryAttempt({
      errorId: this.state.errorId!,
      attempt: this.state.recoveryAttempts + 1,
      timestamp: new Date()
    });
  }

  private escalateError(error: Error, errorInfo: ErrorInfo): void {
    // Report to external error tracking
    this.errorLogger.escalateError({
      error,
      errorInfo,
      errorId: this.state.errorId!,
      context: this.gatherErrorContext()
    });

    // Trigger system-wide graceful degradation
    this.triggerGracefulDegradation();
  }

  private triggerGracefulDegradation(): void {
    // Emit event to notify other components
    window.dispatchEvent(new CustomEvent('system-degradation', {
      detail: {
        component: 'DualInstanceMonitor',
        errorId: this.state.errorId,
        severity: ErrorSeverity.CRITICAL
      }
    }));
  }

  render() {
    const { hasError, error, errorInfo, recoveryAttempts } = this.state;
    const { children, fallback: FallbackComponent = FallbackComponent, maxRecoveryAttempts = 3 } = this.props;

    if (hasError && error) {
      return (
        <FallbackComponent
          error={error}
          errorInfo={errorInfo}
          recoveryAttempts={recoveryAttempts}
          maxRecoveryAttempts={maxRecoveryAttempts}
          onRetry={() => this.attemptRecovery()}
          onReportError={() => this.reportErrorToSupport()}
        />
      );
    }

    return children;
  }

  private reportErrorToSupport(): void {
    const errorReport = {
      errorId: this.state.errorId,
      error: this.state.error,
      errorInfo: this.state.errorInfo,
      context: this.gatherErrorContext(),
      userFeedback: prompt('Please describe what you were doing when this error occurred:')
    };

    this.errorLogger.submitSupportReport(errorReport);
  }
}
```

### 2. Component-Specific Error Boundaries

```typescript
// /frontend/src/components/dual-instance/error-boundaries/ConnectionErrorBoundary.tsx
export class ConnectionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Handle connection-specific errors
    if (this.isConnectionError(error)) {
      this.handleConnectionFailure(error);
    } else if (this.isWebSocketError(error)) {
      this.handleWebSocketFailure(error);
    } else {
      this.handleGenericError(error, errorInfo);
    }
  }

  private isConnectionError(error: Error): boolean {
    return error.message.includes('Connection failed') ||
           error.message.includes('Network Error') ||
           error.name === 'NetworkError';
  }

  private isWebSocketError(error: Error): boolean {
    return error.message.includes('WebSocket') ||
           error.message.includes('Socket.IO');
  }

  private handleConnectionFailure(error: Error): void {
    // Switch to offline mode
    this.setState({
      hasError: true,
      error,
      degradationMode: DegradationMode.OFFLINE
    });

    // Notify connection manager
    this.notifyConnectionManager('connection_failure', error);
  }

  private handleWebSocketFailure(error: Error): void {
    // Switch to polling mode or cached data
    this.setState({
      hasError: true,
      error,
      degradationMode: DegradationMode.POLLING
    });

    // Attempt to use fallback communication method
    this.enableFallbackCommunication();
  }

  render() {
    const { hasError, error, degradationMode } = this.state;
    
    if (hasError) {
      switch (degradationMode) {
        case DegradationMode.OFFLINE:
          return <OfflineModeFallback error={error} onRetry={this.retry} />;
        case DegradationMode.POLLING:
          return <PollingModeFallback error={error} onRetry={this.retry} />;
        default:
          return <GenericErrorFallback error={error} onRetry={this.retry} />;
      }
    }

    return this.props.children;
  }
}

// Log Stream Error Boundary
export class LogStreamErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.isLogStreamError(error)) {
      this.handleLogStreamFailure(error);
    } else {
      this.handleGenericError(error, errorInfo);
    }
  }

  private handleLogStreamFailure(error: Error): void {
    // Switch to cached logs only
    this.setState({
      hasError: true,
      error,
      degradationMode: DegradationMode.CACHED_ONLY
    });

    // Disable real-time log streaming
    this.disableRealTimeStreaming();
    
    // Use local log buffer
    this.enableLocalBufferMode();
  }

  render() {
    const { hasError, error } = this.state;
    
    if (hasError) {
      return (
        <CachedLogsFallback
          error={error}
          onRetry={this.retry}
          cachedLogs={this.getCachedLogs()}
        />
      );
    }

    return this.props.children;
  }
}
```

### 3. Fallback Components

```typescript
// /frontend/src/components/dual-instance/fallbacks/FallbackComponent.tsx
interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  onRetry: () => void;
  onReportError: () => void;
}

export const FallbackComponent: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  recoveryAttempts,
  maxRecoveryAttempts,
  onRetry,
  onReportError
}) => {
  const canRetry = recoveryAttempts < maxRecoveryAttempts;
  const errorType = classifyError(error);

  return (
    <div className="error-fallback">
      <div className="error-content">
        <div className="error-icon">
          {errorType === 'connection' ? '🔌' : 
           errorType === 'network' ? '📡' : 
           errorType === 'memory' ? '💾' : '⚠️'}
        </div>
        
        <h2>Something went wrong</h2>
        
        <div className="error-message">
          <p>{getHumanReadableError(error)}</p>
          {process.env.NODE_ENV === 'development' && (
            <details className="error-details">
              <summary>Technical Details</summary>
              <pre>{error.stack}</pre>
              {errorInfo && (
                <pre>{errorInfo.componentStack}</pre>
              )}
            </details>
          )}
        </div>

        <div className="error-actions">
          {canRetry && (
            <button
              className="retry-button primary"
              onClick={onRetry}
              disabled={recoveryAttempts >= maxRecoveryAttempts}
            >
              {recoveryAttempts > 0 ? `Retry (${recoveryAttempts}/${maxRecoveryAttempts})` : 'Try Again'}
            </button>
          )}
          
          <button
            className="refresh-button secondary"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
          
          <button
            className="report-button tertiary"
            onClick={onReportError}
          >
            Report Issue
          </button>
        </div>

        <div className="error-suggestions">
          <h4>What you can try:</h4>
          <ul>
            {getErrorSuggestions(error).map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// Offline Mode Fallback
export const OfflineModeFallback: React.FC<{
  error: Error;
  onRetry: () => void;
}> = ({ error, onRetry }) => {
  const [cachedData, setCachedData] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load cached data
    loadCachedInstanceData().then(setCachedData);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="offline-fallback">
      <div className="offline-header">
        <span className="offline-icon">📴</span>
        <h3>Connection Lost</h3>
        <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? '🟢 Network Connected' : '🔴 Network Offline'}
        </div>
      </div>

      {cachedData && (
        <div className="cached-data-viewer">
          <h4>Last Known Status</h4>
          <CachedInstanceStatus data={cachedData} />
        </div>
      )}

      <div className="offline-actions">
        <button
          className="retry-button"
          onClick={onRetry}
          disabled={!isOnline}
        >
          {isOnline ? 'Reconnect' : 'Waiting for Network...'}
        </button>
        
        <button
          className="offline-mode-button"
          onClick={() => enableOfflineMode()}
        >
          Continue in Offline Mode
        </button>
      </div>

      <div className="offline-tips">
        <h4>While offline, you can:</h4>
        <ul>
          <li>View cached instance status</li>
          <li>Review historical logs</li>
          <li>Export saved data</li>
          <li>Modify local settings</li>
        </ul>
      </div>
    </div>
  );
};

// Cached Logs Fallback
export const CachedLogsFallback: React.FC<{
  error: Error;
  onRetry: () => void;
  cachedLogs: LogEntry[];
}> = ({ error, onRetry, cachedLogs }) => {
  return (
    <div className="cached-logs-fallback">
      <div className="fallback-header">
        <span className="warning-icon">⚠️</span>
        <h3>Live Logs Unavailable</h3>
        <p>Showing cached log entries. Real-time streaming is disabled.</p>
      </div>

      <div className="cached-logs-viewer">
        <div className="logs-header">
          <h4>Cached Logs ({cachedLogs.length} entries)</h4>
          <div className="logs-actions">
            <button onClick={onRetry}>Retry Live Stream</button>
            <button onClick={() => exportCachedLogs(cachedLogs)}>Export</button>
          </div>
        </div>

        <div className="logs-content">
          {cachedLogs.slice(0, 100).map(log => (
            <LogEntryDisplay key={log.id} entry={log} cached={true} />
          ))}
        </div>
      </div>
    </div>
  );
};
```

## Graceful Degradation Strategies

### 1. Feature Degradation Manager

```typescript
// /frontend/src/services/degradation/FeatureDegradationManager.ts
export class FeatureDegradationManager {
  private degradationState = new Map<string, DegradationLevel>();
  private featuresConfig: FeaturesConfig;
  private eventEmitter: EventEmitter;

  constructor(config: FeaturesConfig) {
    this.featuresConfig = config;
    this.eventEmitter = new EventEmitter();
    this.setupGlobalErrorHandler();
  }

  private setupGlobalErrorHandler(): void {
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason);
    });

    window.addEventListener('system-degradation', (event: CustomEvent) => {
      this.handleSystemDegradation(event.detail);
    });
  }

  degradeFeature(feature: string, level: DegradationLevel, reason: string): void {
    this.degradationState.set(feature, level);
    
    this.eventEmitter.emit('feature_degraded', {
      feature,
      level,
      reason,
      timestamp: new Date()
    });

    this.applyFeatureDegradation(feature, level);
  }

  private applyFeatureDegradation(feature: string, level: DegradationLevel): void {
    switch (feature) {
      case 'real_time_logs':
        this.degradeRealTimeLogs(level);
        break;
      case 'live_metrics':
        this.degradeLiveMetrics(level);
        break;
      case 'auto_discovery':
        this.degradeAutoDiscovery(level);
        break;
      case 'health_monitoring':
        this.degradeHealthMonitoring(level);
        break;
      case 'visual_charts':
        this.degradeVisualCharts(level);
        break;
    }
  }

  private degradeRealTimeLogs(level: DegradationLevel): void {
    switch (level) {
      case DegradationLevel.REDUCED:
        // Reduce log update frequency
        this.setLogUpdateInterval(5000); // 5 seconds instead of real-time
        break;
      case DegradationLevel.LIMITED:
        // Switch to cached logs only
        this.enableCachedLogsOnly();
        break;
      case DegradationLevel.DISABLED:
        // Disable log streaming entirely
        this.disableLogStreaming();
        break;
    }
  }

  private degradeLiveMetrics(level: DegradationLevel): void {
    switch (level) {
      case DegradationLevel.REDUCED:
        // Reduce chart update frequency
        this.setMetricsUpdateInterval(30000); // 30 seconds
        break;
      case DegradationLevel.LIMITED:
        // Switch to basic metrics only
        this.enableBasicMetricsOnly();
        break;
      case DegradationLevel.DISABLED:
        // Show static summary only
        this.enableStaticMetricsView();
        break;
    }
  }

  private degradeAutoDiscovery(level: DegradationLevel): void {
    switch (level) {
      case DegradationLevel.REDUCED:
        // Reduce discovery frequency
        this.setDiscoveryInterval(60000); // 1 minute
        break;
      case DegradationLevel.LIMITED:
        // Manual discovery only
        this.enableManualDiscoveryOnly();
        break;
      case DegradationLevel.DISABLED:
        // Use cached instances only
        this.useCachedInstancesOnly();
        break;
    }
  }

  restoreFeature(feature: string): void {
    if (this.degradationState.has(feature)) {
      this.degradationState.delete(feature);
      this.restoreFeatureToNormal(feature);
      
      this.eventEmitter.emit('feature_restored', {
        feature,
        timestamp: new Date()
      });
    }
  }

  getSystemDegradationLevel(): SystemDegradationLevel {
    const degradedFeatures = Array.from(this.degradationState.values());
    
    if (degradedFeatures.length === 0) {
      return SystemDegradationLevel.NORMAL;
    }

    if (degradedFeatures.some(level => level === DegradationLevel.DISABLED)) {
      return SystemDegradationLevel.SEVERE;
    }

    if (degradedFeatures.some(level => level === DegradationLevel.LIMITED)) {
      return SystemDegradationLevel.MODERATE;
    }

    return SystemDegradationLevel.MINIMAL;
  }

  generateDegradationReport(): DegradationReport {
    return {
      systemLevel: this.getSystemDegradationLevel(),
      degradedFeatures: Array.from(this.degradationState.entries()).map(([feature, level]) => ({
        feature,
        level,
        impact: this.assessFeatureImpact(feature, level)
      })),
      recommendations: this.generateRecommendations(),
      timestamp: new Date()
    };
  }
}
```

### 2. Adaptive Performance Manager

```typescript
// /frontend/src/services/degradation/AdaptivePerformanceManager.ts
export class AdaptivePerformanceManager {
  private performanceThresholds: PerformanceThresholds;
  private performanceMonitor: PerformanceMonitor;
  private degradationManager: FeatureDegradationManager;

  constructor(
    thresholds: PerformanceThresholds,
    degradationManager: FeatureDegradationManager
  ) {
    this.performanceThresholds = thresholds;
    this.degradationManager = degradationManager;
    this.performanceMonitor = new PerformanceMonitor();
    
    this.startPerformanceMonitoring();
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.checkPerformanceMetrics();
    }, 5000); // Check every 5 seconds
  }

  private checkPerformanceMetrics(): void {
    const metrics = this.performanceMonitor.getCurrentMetrics();
    
    // Check memory usage
    if (metrics.memoryUsage > this.performanceThresholds.memory.critical) {
      this.handleCriticalMemoryUsage();
    } else if (metrics.memoryUsage > this.performanceThresholds.memory.warning) {
      this.handleHighMemoryUsage();
    }

    // Check CPU usage
    if (metrics.cpuUsage > this.performanceThresholds.cpu.critical) {
      this.handleHighCPUUsage();
    }

    // Check DOM complexity
    if (metrics.domNodes > this.performanceThresholds.dom.critical) {
      this.handleHighDOMComplexity();
    }

    // Check render performance
    if (metrics.frameRate < this.performanceThresholds.rendering.critical) {
      this.handlePoorRenderingPerformance();
    }
  }

  private handleCriticalMemoryUsage(): void {
    // Aggressive memory optimization
    this.degradationManager.degradeFeature('visual_charts', DegradationLevel.DISABLED, 'Critical memory usage');
    this.degradationManager.degradeFeature('real_time_logs', DegradationLevel.LIMITED, 'Critical memory usage');
    this.degradationManager.degradeFeature('live_metrics', DegradationLevel.REDUCED, 'Critical memory usage');
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Clear caches
    this.clearNonEssentialCaches();
  }

  private handleHighMemoryUsage(): void {
    // Moderate memory optimization
    this.degradationManager.degradeFeature('visual_charts', DegradationLevel.REDUCED, 'High memory usage');
    this.degradationManager.degradeFeature('real_time_logs', DegradationLevel.REDUCED, 'High memory usage');
    
    // Reduce cache sizes
    this.reduceLogBufferSize();
    this.reduceMetricsHistorySize();
  }

  private handleHighCPUUsage(): void {
    // Reduce CPU-intensive operations
    this.degradationManager.degradeFeature('auto_discovery', DegradationLevel.REDUCED, 'High CPU usage');
    this.degradationManager.degradeFeature('health_monitoring', DegradationLevel.REDUCED, 'High CPU usage');
    
    // Throttle animations
    this.throttleAnimations();
  }

  private handlePoorRenderingPerformance(): void {
    // Optimize rendering
    this.degradationManager.degradeFeature('visual_charts', DegradationLevel.LIMITED, 'Poor rendering performance');
    
    // Reduce animation complexity
    this.simplifyAnimations();
    
    // Enable virtualization for large lists
    this.enableVirtualization();
  }
}
```

### 3. Error Recovery Strategies

```typescript
// /frontend/src/services/error-recovery/ErrorRecoveryStrategies.ts
export class NetworkErrorRecoveryStrategy implements ErrorRecoveryStrategy {
  async recover(error: Error, context: ErrorContext): Promise<ErrorResolution> {
    // Check network connectivity
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
      return {
        resolved: false,
        strategy: ResolutionStrategy.FALLBACK,
        description: 'Device is offline, switching to cached data mode'
      };
    }

    // Attempt to restore connection
    try {
      await this.testConnectivity();
      
      // Connection restored, retry original operation
      if (context.retryOperation) {
        await context.retryOperation();
      }
      
      return {
        resolved: true,
        resolvedAt: new Date(),
        strategy: ResolutionStrategy.AUTOMATIC_RETRY,
        description: 'Network connection restored, operation retried successfully'
      };
    } catch (retryError) {
      return {
        resolved: false,
        strategy: ResolutionStrategy.ESCALATE,
        description: 'Network connectivity test failed, manual intervention required'
      };
    }
  }

  private async testConnectivity(): Promise<void> {
    try {
      const response = await fetch('/ping', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error('Connectivity test failed');
      }
    } catch (error) {
      throw new Error('Network is unreachable');
    }
  }
}

export class MemoryErrorRecoveryStrategy implements ErrorRecoveryStrategy {
  async recover(error: Error, context: ErrorContext): Promise<ErrorResolution> {
    // Check if this is a memory-related error
    if (!this.isMemoryError(error)) {
      return {
        resolved: false,
        strategy: ResolutionStrategy.ESCALATE,
        description: 'Not a memory-related error'
      };
    }

    try {
      // Clear caches and reduce memory usage
      await this.performMemoryCleanup();
      
      // Wait for garbage collection
      await this.waitForGarbageCollection();
      
      // Check if memory situation improved
      const memoryAfter = this.getMemoryUsage();
      if (memoryAfter < 0.8) { // Less than 80% memory usage
        return {
          resolved: true,
          resolvedAt: new Date(),
          strategy: ResolutionStrategy.AUTOMATIC_RETRY,
          description: 'Memory cleanup successful, operation can be retried'
        };
      } else {
        return {
          resolved: false,
          strategy: ResolutionStrategy.FALLBACK,
          description: 'Memory cleanup insufficient, switching to low-memory mode'
        };
      }
    } catch (cleanupError) {
      return {
        resolved: false,
        strategy: ResolutionStrategy.ESCALATE,
        description: 'Memory cleanup failed, system restart may be required'
      };
    }
  }

  private async performMemoryCleanup(): Promise<void> {
    // Clear log buffers
    window.dispatchEvent(new CustomEvent('clear-log-buffers'));
    
    // Clear metrics history
    window.dispatchEvent(new CustomEvent('clear-metrics-history'));
    
    // Clear image caches
    window.dispatchEvent(new CustomEvent('clear-image-cache'));
    
    // Dispose of chart instances
    window.dispatchEvent(new CustomEvent('dispose-charts'));
  }
}
```

## Monitoring and Alerting

### 1. System Health Monitor

```typescript
// /frontend/src/services/monitoring/SystemHealthMonitor.ts
export class SystemHealthMonitor {
  private healthStatus: SystemHealthStatus;
  private alerts: SystemAlert[] = [];
  private thresholds: HealthThresholds;

  constructor(thresholds: HealthThresholds) {
    this.thresholds = thresholds;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.checkSystemHealth();
    }, 10000); // Check every 10 seconds
  }

  private checkSystemHealth(): void {
    const metrics = this.gatherHealthMetrics();
    
    // Check error rates
    if (metrics.errorRate > this.thresholds.errorRate.critical) {
      this.raiseAlert({
        level: AlertLevel.CRITICAL,
        type: 'error_rate',
        message: `Critical error rate: ${metrics.errorRate.toFixed(2)}%`,
        data: { errorRate: metrics.errorRate }
      });
    }

    // Check performance metrics
    if (metrics.responseTime > this.thresholds.responseTime.critical) {
      this.raiseAlert({
        level: AlertLevel.WARNING,
        type: 'performance',
        message: `Slow response time: ${metrics.responseTime}ms`,
        data: { responseTime: metrics.responseTime }
      });
    }

    // Check memory usage
    if (metrics.memoryUsage > this.thresholds.memory.critical) {
      this.raiseAlert({
        level: AlertLevel.CRITICAL,
        type: 'memory',
        message: `Critical memory usage: ${(metrics.memoryUsage * 100).toFixed(1)}%`,
        data: { memoryUsage: metrics.memoryUsage }
      });
    }

    this.updateHealthStatus(metrics);
  }

  private raiseAlert(alert: Partial<SystemAlert>): void {
    const fullAlert: SystemAlert = {
      id: `alert_${Date.now()}`,
      timestamp: new Date(),
      acknowledged: false,
      ...alert
    } as SystemAlert;

    this.alerts.push(fullAlert);
    
    // Emit alert event
    window.dispatchEvent(new CustomEvent('system-alert', {
      detail: fullAlert
    }));
  }
}
```

This comprehensive error boundary and graceful degradation system provides:

1. **Hierarchical Error Boundaries**: Multi-level error containment
2. **Intelligent Recovery**: Automatic retry with exponential backoff
3. **Graceful Degradation**: Progressive feature reduction under stress
4. **Performance Adaptation**: Dynamic resource management
5. **User-Friendly Fallbacks**: Informative error displays with recovery options
6. **Offline Support**: Cached data access when connections fail
7. **Memory Management**: Automatic cleanup and optimization
8. **Health Monitoring**: Proactive system health assessment
9. **Alert System**: Real-time issue notification and escalation
10. **Recovery Strategies**: Multiple approaches for different error types

The system ensures that the Dual Instance Monitor remains functional and provides value to users even when individual components fail or external systems become unavailable.