/**
 * NLD Integration System
 * 
 * This module provides a unified interface for integrating all NLD components
 * into the Claude Instance Management system with automatic initialization
 * and configuration management.
 */

import { NLDPatternDetector, useNLDPatternDetection } from './nld-core-monitor';
import { NLDComponentWatcher, useNLDComponentMonitoring } from './nld-component-watcher';
import { NLDLoggingSystem } from './nld-logging-system';
import { NLDRecoverySystem } from './nld-recovery-system';
import { NLDAlertSystem } from './nld-alert-system';
import { TemporalDeadZoneDetector, useTemporalDeadZoneDetection } from './temporal-dead-zone-prevention';

export interface NLDSystemConfig {
  enabled: boolean;
  debug: boolean;
  autoRecovery: boolean;
  alerting: boolean;
  logging: boolean;
  performance: boolean;
  memory: boolean;
  websocket: boolean;
  whiteScreen: boolean;
  temporalDeadZone: boolean;
  components: string[];
  logLevel: 'verbose' | 'normal' | 'minimal';
}

export interface NLDSystemStatus {
  initialized: boolean;
  healthy: boolean;
  components: {
    detector: boolean;
    logging: boolean;
    recovery: boolean;
    alerts: boolean;
  };
  stats: {
    totalPatterns: number;
    criticalIssues: number;
    recoveryRate: number;
    systemScore: number;
  };
  lastUpdate: Date;
}

/**
 * Unified NLD System Integration
 */
export class NLDIntegrationSystem {
  private config: NLDSystemConfig;
  private detector: NLDPatternDetector;
  private logging: NLDLoggingSystem;
  private recovery: NLDRecoverySystem;
  private alerts: NLDAlertSystem;
  private tdzdDetector: TemporalDeadZoneDetector;
  private componentWatchers: Map<string, NLDComponentWatcher> = new Map();
  private initialized = false;
  private healthCheckTimer?: number;

  constructor(config?: Partial<NLDSystemConfig>) {
    this.config = this.getDefaultConfig(config);
    
    // Initialize core systems
    this.detector = new NLDPatternDetector();
    this.logging = new NLDLoggingSystem();
    this.recovery = new NLDRecoverySystem(this.logging);
    this.alerts = new NLDAlertSystem(this.logging);
    this.tdzdDetector = new TemporalDeadZoneDetector();

    this.initialize();
  }

  /**
   * Get default system configuration
   */
  private getDefaultConfig(override?: Partial<NLDSystemConfig>): NLDSystemConfig {
    return {
      enabled: true,
      debug: process.env.NODE_ENV === 'development',
      autoRecovery: true,
      alerting: true,
      logging: true,
      performance: true,
      memory: true,
      websocket: true,
      whiteScreen: true,
      temporalDeadZone: true,
      components: [
        'ClaudeInstanceSelector',
        'ClaudeInstanceManager', 
        'RobustWebSocketProvider',
        'TerminalLauncher',
        'NLDDashboard'
      ],
      logLevel: 'normal',
      ...override
    };
  }

  /**
   * Initialize the NLD system
   */
  private initialize(): void {
    if (!this.config.enabled) {
      console.log('🧠 NLD System disabled');
      return;
    }

    console.log('🧠 Initializing NLD System...');

    try {
      // Set up pattern detection event listeners
      this.setupPatternListeners();

      // Set up recovery event listeners
      this.setupRecoveryListeners();

      // Set up temporal dead zone detection
      if (this.config.temporalDeadZone) {
        this.setupTDZDDetection();
      }

      // Start health monitoring
      this.startHealthMonitoring();

      // Initialize component monitoring for specified components
      this.config.components.forEach(componentName => {
        const watcher = new NLDComponentWatcher(this.detector);
        this.componentWatchers.set(componentName, watcher);
      });

      this.initialized = true;
      console.log('✅ NLD System initialized successfully');

      // Log initialization pattern
      this.detector.detectPattern('nld-001', {
        component: 'NLD-System',
        userAgent: navigator.userAgent,
        url: window.location.href,
        networkState: navigator.onLine ? 'online' : 'offline'
      }, 'NLD System initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize NLD System:', error);
      throw error;
    }
  }

  /**
   * Set up pattern detection listeners
   */
  private setupPatternListeners(): void {
    // Listen for pattern detection events from the core detector
    const originalDetectPattern = this.detector.detectPattern.bind(this.detector);
    this.detector.detectPattern = (patternId, context, failureMode, userFeedback) => {
      const record = originalDetectPattern(patternId, context, failureMode, userFeedback);
      
      // Log the pattern
      if (this.config.logging) {
        this.logging.queuePattern(record);
      }

      // Send alerts
      if (this.config.alerting) {
        this.alerts.processPattern(record);
      }

      // Attempt recovery
      if (this.config.autoRecovery) {
        this.recovery.executeRecovery(record).then(success => {
          record.recovered = success;
          record.effectiveness = success ? 0.8 : 0.0;

          // Update logging with recovery result
          if (this.config.logging) {
            this.logging.queuePattern(record);
          }
        }).catch(error => {
          console.error('Recovery failed:', error);
        });
      }

      return record;
    };
  }

  /**
   * Set up recovery event listeners
   */
  private setupRecoveryListeners(): void {
    // Listen for recovery events
    window.addEventListener('nld-force-rerender', this.handleForceRerender.bind(this));
    window.addEventListener('nld-websocket-backoff', this.handleWebSocketBackoff.bind(this));
    window.addEventListener('nld-memory-cleanup', this.handleMemoryCleanup.bind(this));
    window.addEventListener('nld-operation-lock', this.handleOperationLock.bind(this));
    window.addEventListener('nld-performance-optimize', this.handlePerformanceOptimize.bind(this));
  }

  /**
   * Set up Temporal Dead Zone detection
   */
  private setupTDZDDetection(): void {
    // Monitor for TDZ errors at the window level
    const originalError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (typeof message === 'string' && 
          (message.includes('Cannot access') && message.includes('before initialization'))) {
        
        this.detector.detectPattern('tdz-001', {
          component: 'Global-TDZ-Detection',
          userAgent: navigator.userAgent,
          url: window.location.href,
          networkState: navigator.onLine ? 'online' : 'offline',
          stackTrace: error?.stack
        }, `Temporal Dead Zone Error: ${message}`);
      }

      if (originalError) {
        return originalError(message, source, lineno, colno, error);
      }
      return false;
    };
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = window.setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform system health check
   */
  private performHealthCheck(): void {
    const systemHealth = this.detector.getSystemHealth();
    
    if (systemHealth.criticalIssues > 0) {
      console.warn(`🚨 System health warning: ${systemHealth.criticalIssues} critical issues`);
    }

    if (systemHealth.score < 50) {
      this.detector.detectPattern('nld-005', {
        component: 'Health-Monitor',
        userAgent: navigator.userAgent,
        url: window.location.href,
        networkState: navigator.onLine ? 'online' : 'offline'
      }, `System health degraded: score ${systemHealth.score}`);
    }
  }

  /**
   * Handle force rerender recovery
   */
  private handleForceRerender(event: CustomEvent): void {
    if (this.config.debug) {
      console.log('🔄 Force rerender triggered:', event.detail);
    }

    // Trigger React re-render by updating a dummy state
    window.dispatchEvent(new CustomEvent('nld-state-update', {
      detail: { timestamp: Date.now(), source: 'force-rerender' }
    }));
  }

  /**
   * Handle WebSocket backoff recovery
   */
  private handleWebSocketBackoff(event: CustomEvent): void {
    if (this.config.debug) {
      console.log('🔌 WebSocket backoff triggered:', event.detail);
    }

    // Implement exponential backoff logic here
    const backoffTime = event.detail.backoffTime || 1000;
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('nld-websocket-retry'));
    }, backoffTime);
  }

  /**
   * Handle memory cleanup recovery
   */
  private handleMemoryCleanup(event: CustomEvent): void {
    if (this.config.debug) {
      console.log('💾 Memory cleanup triggered:', event.detail);
    }

    // Clean up known memory leak sources
    this.cleanupImageUrls();
    this.cleanupEventListeners();
  }

  /**
   * Handle operation lock recovery
   */
  private handleOperationLock(event: CustomEvent): void {
    if (this.config.debug) {
      console.log('🔒 Operation lock triggered:', event.detail);
    }

    // Implement operation locking to prevent race conditions
    const lockTime = event.detail.lockTime || 1000;
    window.dispatchEvent(new CustomEvent('nld-operation-locked', {
      detail: { lockTime, timestamp: Date.now() }
    }));
  }

  /**
   * Handle performance optimization recovery
   */
  private handlePerformanceOptimize(event: CustomEvent): void {
    if (this.config.debug) {
      console.log('⚡ Performance optimization triggered:', event.detail);
    }

    // Trigger performance optimizations
    window.dispatchEvent(new CustomEvent('nld-optimize-performance', {
      detail: { level: 'aggressive', timestamp: Date.now() }
    }));
  }

  /**
   * Clean up image URLs to prevent memory leaks
   */
  private cleanupImageUrls(): void {
    // Revoke any blob URLs that might be leaking
    const images = document.querySelectorAll('img[src^="blob:"]');
    images.forEach(img => {
      const src = (img as HTMLImageElement).src;
      if (src.startsWith('blob:')) {
        URL.revokeObjectURL(src);
      }
    });
  }

  /**
   * Clean up event listeners
   */
  private cleanupEventListeners(): void {
    // Remove any dangling event listeners
    window.dispatchEvent(new CustomEvent('nld-cleanup-listeners'));
  }

  /**
   * Get system status
   */
  public getStatus(): NLDSystemStatus {
    const systemHealth = this.detector.getSystemHealth();
    const alertStats = this.alerts.getAlertStats();

    return {
      initialized: this.initialized,
      healthy: systemHealth.score > 70,
      components: {
        detector: !!this.detector,
        logging: !!this.logging,
        recovery: !!this.recovery,
        alerts: !!this.alerts
      },
      stats: {
        totalPatterns: this.detector.getRecords().length,
        criticalIssues: systemHealth.criticalIssues,
        recoveryRate: systemHealth.recoveryRate,
        systemScore: systemHealth.score
      },
      lastUpdate: new Date()
    };
  }

  /**
   * Get comprehensive system report
   */
  public getSystemReport(): {
    status: NLDSystemStatus;
    config: NLDSystemConfig;
    patterns: ReturnType<typeof this.detector.exportTrainingData>;
    recovery: ReturnType<typeof this.recovery.exportRecoveryData>;
    alerts: ReturnType<typeof this.alerts.exportAlerts>;
    logging: ReturnType<typeof this.logging.exportPatterns>;
  } {
    return {
      status: this.getStatus(),
      config: this.config,
      patterns: this.detector.exportTrainingData(),
      recovery: this.recovery.exportRecoveryData(),
      alerts: this.alerts.exportAlerts(),
      logging: this.logging.exportPatterns()
    };
  }

  /**
   * Update system configuration
   */
  public updateConfig(newConfig: Partial<NLDSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update alert configuration
    this.alerts.configure({
      enabled: this.config.alerting,
      severity: ['critical', 'high', 'medium', 'low'],
      categories: ['white-screen', 'websocket', 'memory-leak', 'race-condition', 'performance']
    });

    console.log('🧠 NLD System configuration updated:', this.config);
  }

  /**
   * Force pattern detection for testing
   */
  public triggerTestPattern(patternId: string, context?: any): void {
    this.detector.detectPattern(patternId, {
      component: 'Test-Trigger',
      userAgent: navigator.userAgent,
      url: window.location.href,
      networkState: navigator.onLine ? 'online' : 'offline',
      ...context
    }, 'Test pattern triggered manually');
  }

  /**
   * Export all system data
   */
  public exportSystemData(): string {
    const report = this.getSystemReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Dispose of system resources
   */
  public dispose(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    this.detector?.dispose();
    this.logging?.dispose();
    this.recovery?.dispose();
    this.alerts?.dispose();

    this.componentWatchers.forEach(watcher => watcher.dispose());
    this.componentWatchers.clear();

    this.initialized = false;
    console.log('🧠 NLD System disposed');
  }
}

/**
 * Global NLD System Instance
 */
let nldSystemInstance: NLDIntegrationSystem | null = null;

/**
 * Initialize the global NLD system
 */
export function initializeNLDSystem(config?: Partial<NLDSystemConfig>): NLDIntegrationSystem {
  if (nldSystemInstance) {
    console.warn('NLD System already initialized');
    return nldSystemInstance;
  }

  nldSystemInstance = new NLDIntegrationSystem(config);
  
  // Make available globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).nldSystem = nldSystemInstance;
  }

  return nldSystemInstance;
}

/**
 * Get the global NLD system instance
 */
export function getNLDSystem(): NLDIntegrationSystem | null {
  return nldSystemInstance;
}

/**
 * React Hook for NLD System Integration
 */
export function useNLDSystem(config?: Partial<NLDSystemConfig>): {
  system: NLDIntegrationSystem | null;
  status: NLDSystemStatus | null;
  triggerTest: (patternId: string) => void;
} {
  const [system, setSystem] = React.useState<NLDIntegrationSystem | null>(null);
  const [status, setStatus] = React.useState<NLDSystemStatus | null>(null);

  React.useEffect(() => {
    const nldSystem = initializeNLDSystem(config);
    setSystem(nldSystem);

    const updateStatus = () => {
      setStatus(nldSystem.getStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000); // Update every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  const triggerTest = React.useCallback((patternId: string) => {
    system?.triggerTestPattern(patternId);
  }, [system]);

  return { system, status, triggerTest };
}

export default NLDIntegrationSystem;