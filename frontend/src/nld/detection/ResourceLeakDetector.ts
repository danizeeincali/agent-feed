/**
 * Resource Leak Detection System
 * Specialized NLD component for detecting and preventing resource leak patterns
 * in React components and navigation flows
 */

import { mcp__claude_flow__neural_patterns } from '../../../types/claude-flow';

export interface ResourceLeakPattern {
  id: string;
  type: 'component_mount_leak' | 'navigation_accumulation' | 'event_listener_leak' | 'timer_leak' | 'api_subscription_leak';
  component: string;
  leakSource: string;
  detectionTime: number;
  resourceCount: number;
  cleanupMissing: boolean;
  navigationPath?: string;
  metadata: {
    pid?: number;
    memoryUsage?: number;
    instanceCount?: number;
    userAgent: string;
    url: string;
    sessionId: string;
  };
}

export interface ResourceUsageMetrics {
  componentInstances: Map<string, number>;
  eventListeners: Map<string, number>;
  timers: Set<number>;
  subscriptions: Map<string, number>;
  totalMemoryEstimate: number;
  leakScore: number;
}

export class ResourceLeakDetector {
  private patterns: ResourceLeakPattern[] = [];
  private resourceMetrics: ResourceUsageMetrics;
  private componentMountCounts: Map<string, number> = new Map();
  private componentUnmountCounts: Map<string, number> = new Map();
  private navigationHistory: string[] = [];
  private isMonitoring = false;
  private alertThresholds = {
    maxInstancesPerComponent: 5,
    maxEventListeners: 50,
    maxTimers: 20,
    maxSubscriptions: 10,
    memoryLeakThresholdMB: 50
  };

  constructor() {
    this.resourceMetrics = {
      componentInstances: new Map(),
      eventListeners: new Map(),
      timers: new Set(),
      subscriptions: new Map(),
      totalMemoryEstimate: 0,
      leakScore: 0
    };
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor navigation changes
    this.setupNavigationMonitoring();
    
    // Monitor resource usage periodically
    this.startResourceMonitoring();
    
    // Hook into React DevTools if available
    this.setupReactMonitoring();
    
    this.isMonitoring = true;
    console.log('Resource Leak Detector initialized');
  }

  private setupNavigationMonitoring(): void {
    // Monitor pushState/replaceState for SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      this.recordNavigation(args[2] as string || window.location.pathname);
      originalPushState.apply(history, args);
    };

    history.replaceState = (...args) => {
      this.recordNavigation(args[2] as string || window.location.pathname);
      originalReplaceState.apply(history, args);
    };

    // Monitor hash changes
    window.addEventListener('hashchange', () => {
      this.recordNavigation(window.location.pathname + window.location.hash);
    });

    // Monitor popstate
    window.addEventListener('popstate', () => {
      this.recordNavigation(window.location.pathname);
    });
  }

  private recordNavigation(path: string): void {
    this.navigationHistory.push(path);
    
    // Keep only last 20 navigation entries
    if (this.navigationHistory.length > 20) {
      this.navigationHistory = this.navigationHistory.slice(-20);
    }

    // Check for resource accumulation after navigation
    setTimeout(() => {
      this.checkNavigationResourceAccumulation();
    }, 1000);
  }

  private startResourceMonitoring(): void {
    setInterval(() => {
      this.updateResourceMetrics();
      this.detectResourceLeaks();
    }, 5000); // Check every 5 seconds
  }

  private setupReactMonitoring(): void {
    // Hook into React component lifecycle if React DevTools is available
    if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      hook.onCommitFiberRoot = hook.onCommitFiberRoot || [];
      hook.onCommitFiberUnmount = hook.onCommitFiberUnmount || [];

      // Monitor component mounts
      const originalOnCommit = hook.onCommitFiberRoot;
      hook.onCommitFiberRoot = (id: number, root: any) => {
        this.processReactFiberTree(root);
        if (originalOnCommit) originalOnCommit(id, root);
      };
    }
  }

  private processReactFiberTree(root: any): void {
    // Walk the React fiber tree to count component instances
    const walkFiber = (fiber: any) => {
      if (fiber && fiber.type && typeof fiber.type === 'function') {
        const componentName = fiber.type.name || fiber.type.displayName || 'Anonymous';
        this.recordComponentMount(componentName);
      }

      if (fiber.child) walkFiber(fiber.child);
      if (fiber.sibling) walkFiber(fiber.sibling);
    };

    if (root && root.current) {
      walkFiber(root.current);
    }
  }

  public recordComponentMount(componentName: string): void {
    const currentCount = this.componentMountCounts.get(componentName) || 0;
    this.componentMountCounts.set(componentName, currentCount + 1);
    
    // Update resource metrics
    this.resourceMetrics.componentInstances.set(
      componentName, 
      (this.resourceMetrics.componentInstances.get(componentName) || 0) + 1
    );

    // Check for excessive instances
    if (currentCount + 1 > this.alertThresholds.maxInstancesPerComponent) {
      this.detectComponentMountLeak(componentName, currentCount + 1);
    }
  }

  public recordComponentUnmount(componentName: string): void {
    const currentCount = this.componentUnmountCounts.get(componentName) || 0;
    this.componentUnmountCounts.set(componentName, currentCount + 1);
    
    // Update resource metrics
    const instanceCount = this.resourceMetrics.componentInstances.get(componentName) || 0;
    if (instanceCount > 0) {
      this.resourceMetrics.componentInstances.set(componentName, instanceCount - 1);
    }
  }

  private detectComponentMountLeak(componentName: string, instanceCount: number): void {
    const pattern: ResourceLeakPattern = {
      id: this.generateId(),
      type: 'component_mount_leak',
      component: componentName,
      leakSource: 'automatic_component_creation',
      detectionTime: Date.now(),
      resourceCount: instanceCount,
      cleanupMissing: true,
      metadata: {
        instanceCount,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.generateSessionId()
      }
    };

    this.capturePattern(pattern);
  }

  private checkNavigationResourceAccumulation(): void {
    // Check if resource counts increased significantly after navigation
    const totalInstances = Array.from(this.resourceMetrics.componentInstances.values())
      .reduce((sum, count) => sum + count, 0);

    if (totalInstances > this.alertThresholds.maxInstancesPerComponent * 3) {
      const pattern: ResourceLeakPattern = {
        id: this.generateId(),
        type: 'navigation_accumulation',
        component: 'navigation_system',
        leakSource: 'navigation_triggered_accumulation',
        detectionTime: Date.now(),
        resourceCount: totalInstances,
        cleanupMissing: true,
        navigationPath: this.navigationHistory.slice(-3).join(' -> '),
        metadata: {
          instanceCount: totalInstances,
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: this.generateSessionId()
        }
      };

      this.capturePattern(pattern);
    }
  }

  private updateResourceMetrics(): void {
    // Estimate memory usage
    if (typeof (performance as any).memory !== 'undefined') {
      const memInfo = (performance as any).memory;
      this.resourceMetrics.totalMemoryEstimate = memInfo.usedJSHeapSize / (1024 * 1024); // MB
    }

    // Update leak score
    this.resourceMetrics.leakScore = this.calculateLeakScore();
  }

  private calculateLeakScore(): number {
    let score = 0;

    // Component instance score
    const totalInstances = Array.from(this.resourceMetrics.componentInstances.values())
      .reduce((sum, count) => sum + count, 0);
    score += Math.min(totalInstances / 50, 1) * 0.3;

    // Event listener score
    const totalListeners = Array.from(this.resourceMetrics.eventListeners.values())
      .reduce((sum, count) => sum + count, 0);
    score += Math.min(totalListeners / this.alertThresholds.maxEventListeners, 1) * 0.2;

    // Timer score
    score += Math.min(this.resourceMetrics.timers.size / this.alertThresholds.maxTimers, 1) * 0.2;

    // Subscription score
    const totalSubscriptions = Array.from(this.resourceMetrics.subscriptions.values())
      .reduce((sum, count) => sum + count, 0);
    score += Math.min(totalSubscriptions / this.alertThresholds.maxSubscriptions, 1) * 0.1;

    // Memory score
    if (this.resourceMetrics.totalMemoryEstimate > this.alertThresholds.memoryLeakThresholdMB) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  private detectResourceLeaks(): void {
    // Check for various types of resource leaks
    this.detectEventListenerLeaks();
    this.detectTimerLeaks();
    this.detectSubscriptionLeaks();
    this.detectMemoryLeaks();
  }

  private detectEventListenerLeaks(): void {
    const totalListeners = Array.from(this.resourceMetrics.eventListeners.values())
      .reduce((sum, count) => sum + count, 0);

    if (totalListeners > this.alertThresholds.maxEventListeners) {
      const pattern: ResourceLeakPattern = {
        id: this.generateId(),
        type: 'event_listener_leak',
        component: 'event_system',
        leakSource: 'missing_event_listener_cleanup',
        detectionTime: Date.now(),
        resourceCount: totalListeners,
        cleanupMissing: true,
        metadata: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: this.generateSessionId()
        }
      };

      this.capturePattern(pattern);
    }
  }

  private detectTimerLeaks(): void {
    if (this.resourceMetrics.timers.size > this.alertThresholds.maxTimers) {
      const pattern: ResourceLeakPattern = {
        id: this.generateId(),
        type: 'timer_leak',
        component: 'timer_system',
        leakSource: 'missing_timer_cleanup',
        detectionTime: Date.now(),
        resourceCount: this.resourceMetrics.timers.size,
        cleanupMissing: true,
        metadata: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: this.generateSessionId()
        }
      };

      this.capturePattern(pattern);
    }
  }

  private detectSubscriptionLeaks(): void {
    const totalSubscriptions = Array.from(this.resourceMetrics.subscriptions.values())
      .reduce((sum, count) => sum + count, 0);

    if (totalSubscriptions > this.alertThresholds.maxSubscriptions) {
      const pattern: ResourceLeakPattern = {
        id: this.generateId(),
        type: 'api_subscription_leak',
        component: 'subscription_system',
        leakSource: 'missing_subscription_cleanup',
        detectionTime: Date.now(),
        resourceCount: totalSubscriptions,
        cleanupMissing: true,
        metadata: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: this.generateSessionId()
        }
      };

      this.capturePattern(pattern);
    }
  }

  private detectMemoryLeaks(): void {
    if (this.resourceMetrics.totalMemoryEstimate > this.alertThresholds.memoryLeakThresholdMB) {
      const pattern: ResourceLeakPattern = {
        id: this.generateId(),
        type: 'component_mount_leak',
        component: 'memory_system',
        leakSource: 'excessive_memory_usage',
        detectionTime: Date.now(),
        resourceCount: Math.floor(this.resourceMetrics.totalMemoryEstimate),
        cleanupMissing: true,
        metadata: {
          memoryUsage: this.resourceMetrics.totalMemoryEstimate,
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: this.generateSessionId()
        }
      };

      this.capturePattern(pattern);
    }
  }

  private capturePattern(pattern: ResourceLeakPattern): void {
    this.patterns.push(pattern);
    console.warn('Resource Leak Detected:', pattern);

    // Send to neural pattern analysis
    if (typeof mcp__claude_flow__neural_patterns !== 'undefined') {
      mcp__claude_flow__neural_patterns({
        action: 'learn',
        operation: 'resource_leak_pattern',
        outcome: pattern.type,
        metadata: {
          component: pattern.component,
          leakSource: pattern.leakSource,
          resourceCount: pattern.resourceCount,
          cleanupMissing: pattern.cleanupMissing
        }
      });
    }

    // Trigger alert if needed
    this.triggerResourceLeakAlert(pattern);
  }

  private triggerResourceLeakAlert(pattern: ResourceLeakPattern): void {
    // Create user-visible alert for resource leaks
    const alertMessage = this.generateAlertMessage(pattern);
    
    // Store alert in NLD system
    const alertData = {
      type: 'resource_leak_alert',
      pattern,
      message: alertMessage,
      timestamp: Date.now(),
      severity: this.calculateSeverity(pattern)
    };

    localStorage.setItem(`resource_leak_alert_${pattern.id}`, JSON.stringify(alertData));
    
    // Log to console for development
    console.error('RESOURCE LEAK ALERT:', alertMessage);
  }

  private generateAlertMessage(pattern: ResourceLeakPattern): string {
    switch (pattern.type) {
      case 'component_mount_leak':
        return `Component "${pattern.component}" has ${pattern.resourceCount} instances. Check for missing cleanup in useEffect hooks.`;
      
      case 'navigation_accumulation':
        return `Resource accumulation detected after navigation: ${pattern.resourceCount} total instances. Check component unmounting.`;
      
      case 'event_listener_leak':
        return `${pattern.resourceCount} event listeners detected. Ensure removeEventListener is called in cleanup.`;
      
      case 'timer_leak':
        return `${pattern.resourceCount} timers active. Ensure clearTimeout/clearInterval is called in cleanup.`;
      
      case 'api_subscription_leak':
        return `${pattern.resourceCount} active subscriptions. Ensure unsubscribe is called in cleanup.`;
      
      default:
        return `Resource leak detected: ${pattern.type} (${pattern.resourceCount} resources)`;
    }
  }

  private calculateSeverity(pattern: ResourceLeakPattern): 'low' | 'medium' | 'high' | 'critical' {
    if (pattern.resourceCount > 50) return 'critical';
    if (pattern.resourceCount > 20) return 'high';
    if (pattern.resourceCount > 10) return 'medium';
    return 'low';
  }

  // Public API methods
  public getResourceMetrics(): ResourceUsageMetrics {
    return { ...this.resourceMetrics };
  }

  public getLeakPatterns(): ResourceLeakPattern[] {
    return [...this.patterns];
  }

  public clearPatterns(): void {
    this.patterns = [];
  }

  public getLeakScore(): number {
    return this.resourceMetrics.leakScore;
  }

  public setAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  public exportLeakData(): string {
    return JSON.stringify({
      patterns: this.patterns,
      metrics: this.resourceMetrics,
      navigation: this.navigationHistory,
      thresholds: this.alertThresholds,
      mountCounts: Object.fromEntries(this.componentMountCounts),
      unmountCounts: Object.fromEntries(this.componentUnmountCounts)
    }, null, 2);
  }

  private generateId(): string {
    return `leak_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}`;
  }
}

// Singleton instance
export const resourceLeakDetector = new ResourceLeakDetector();