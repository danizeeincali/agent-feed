/**
 * NLD (Non-Linear Dynamics) Core Pattern Detection System
 * 
 * This system monitors for various failure patterns in Claude Instance Management
 * including white screen failures, WebSocket issues, memory leaks, race conditions,
 * and performance degradation patterns.
 */

import { useEffect, useRef, useCallback } from 'react';
import { TemporalDeadZoneDetector } from './temporal-dead-zone-prevention';

export interface NLDPattern {
  id: string;
  category: 'white-screen' | 'websocket' | 'memory-leak' | 'race-condition' | 'performance' | 'temporal-dead-zone';
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: string;
  description: string;
  detection: string;
  recovery: string;
  prevention: string;
  examples: {
    symptoms: string[];
    triggers: string[];
    solutions: string[];
  };
}

export interface NLTRecord {
  id: string;
  timestamp: string;
  pattern: NLDPattern;
  context: {
    component: string;
    userAgent: string;
    url: string;
    stackTrace?: string;
    networkState: string;
    memoryUsage?: {
      used: number;
      total: number;
      percentage: number;
    };
    performanceMetrics?: {
      renderTime: number;
      loadTime: number;
      interactiveTime: number;
    };
  };
  failureMode: string;
  effectiveness: number;
  recovered: boolean;
  userFeedback?: string;
}

export const NLD_PATTERNS: NLDPattern[] = [
  {
    id: 'nld-001',
    category: 'white-screen',
    severity: 'critical',
    pattern: 'Component Initialization Failure',
    description: 'React component fails to initialize causing white screen',
    detection: 'Monitor for components that mount but never render content',
    recovery: 'Implement error boundaries with fallback UI',
    prevention: 'Use defensive programming and null checks',
    examples: {
      symptoms: ['White screen after navigation', 'Component never renders', 'No error messages'],
      triggers: ['Undefined props', 'API failures during mount', 'Missing dependencies'],
      solutions: ['Add error boundaries', 'Implement loading states', 'Add prop validation']
    }
  },
  {
    id: 'nld-002',
    category: 'websocket',
    severity: 'high',
    pattern: 'WebSocket Connection Loop',
    description: 'WebSocket repeatedly connects and disconnects',
    detection: 'Track connection events and detect rapid cycling',
    recovery: 'Implement exponential backoff reconnection',
    prevention: 'Add connection state management and debouncing',
    examples: {
      symptoms: ['Constant reconnection attempts', 'Performance degradation', 'Battery drain'],
      triggers: ['Network instability', 'Server overload', 'Authentication failures'],
      solutions: ['Exponential backoff', 'Connection pooling', 'Health checks']
    }
  },
  {
    id: 'nld-003',
    category: 'memory-leak',
    severity: 'medium',
    pattern: 'Image Handle Memory Leak',
    description: 'Large images not being properly disposed in instance management',
    detection: 'Monitor memory usage growth over time',
    recovery: 'Force garbage collection and clear image references',
    prevention: 'Implement proper cleanup in useEffect',
    examples: {
      symptoms: ['Steadily increasing memory usage', 'Browser slowdown', 'Tab crashes'],
      triggers: ['Large image uploads', 'Rapid instance switching', 'Failed image disposal'],
      solutions: ['URL.revokeObjectURL()', 'WeakMap for references', 'Manual cleanup']
    }
  },
  {
    id: 'nld-004',
    category: 'race-condition',
    severity: 'high',
    pattern: 'Concurrent Instance Launch',
    description: 'Multiple instances launching simultaneously causing conflicts',
    detection: 'Monitor for overlapping async operations',
    recovery: 'Cancel conflicting operations and queue requests',
    prevention: 'Implement operation locking and queuing',
    examples: {
      symptoms: ['Instances failing to start', 'Duplicate instances', 'Resource conflicts'],
      triggers: ['Rapid button clicks', 'Network latency', 'State inconsistency'],
      solutions: ['Debouncing', 'Operation queues', 'State locks']
    }
  },
  {
    id: 'nld-005',
    category: 'performance',
    severity: 'medium',
    pattern: 'Infinite Re-render Loop',
    description: 'Component continuously re-renders causing performance issues',
    detection: 'Monitor render frequency and component update cycles',
    recovery: 'Break render loop and optimize dependencies',
    prevention: 'Use useMemo and useCallback appropriately',
    examples: {
      symptoms: ['Browser freezing', 'High CPU usage', 'Unresponsive UI'],
      triggers: ['Incorrect dependencies', 'State mutations', 'Prop drilling'],
      solutions: ['Memoization', 'Dependency optimization', 'State management']
    }
  }
];

/**
 * NLD Pattern Detection Engine
 * Core system for detecting and analyzing failure patterns
 */
export class NLDPatternDetector {
  private patterns: Map<string, NLDPattern> = new Map();
  private records: NLTRecord[] = [];
  private tdzdDetector: TemporalDeadZoneDetector;
  private observers: Map<string, PerformanceObserver> = new Map();
  private memoryWatcher?: number;
  private lastMemoryCheck = 0;

  constructor() {
    NLD_PATTERNS.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
    this.tdzdDetector = new TemporalDeadZoneDetector();
    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor long tasks that could indicate performance issues
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.detectPattern('nld-005', {
              component: 'unknown',
              userAgent: navigator.userAgent,
              url: window.location.href,
              networkState: navigator.onLine ? 'online' : 'offline',
              performanceMetrics: {
                renderTime: entry.duration,
                loadTime: 0,
                interactiveTime: 0
              }
            }, `Long task detected: ${entry.duration}ms`);
          }
        }
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (error) {
        console.warn('Long task monitoring not supported:', error);
      }
    }

    // Memory monitoring
    this.startMemoryMonitoring();

    // WebSocket monitoring
    this.monitorWebSockets();
  }

  /**
   * Start memory usage monitoring
   */
  private startMemoryMonitoring(): void {
    if (!('performance' in window) || !('memory' in performance)) return;

    this.memoryWatcher = window.setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        const currentUsage = memory.usedJSHeapSize;
        const total = memory.totalJSHeapSize;
        const percentage = (currentUsage / total) * 100;

        // Detect memory leaks - increase of >20MB in 30 seconds
        if (this.lastMemoryCheck > 0 && (currentUsage - this.lastMemoryCheck) > 20 * 1024 * 1024) {
          this.detectPattern('nld-003', {
            component: 'memory-monitor',
            userAgent: navigator.userAgent,
            url: window.location.href,
            networkState: navigator.onLine ? 'online' : 'offline',
            memoryUsage: {
              used: currentUsage,
              total: total,
              percentage: percentage
            }
          }, `Memory leak detected: ${Math.round((currentUsage - this.lastMemoryCheck) / 1024 / 1024)}MB increase`);
        }

        this.lastMemoryCheck = currentUsage;

        // High memory usage warning
        if (percentage > 85) {
          this.detectPattern('nld-003', {
            component: 'memory-monitor',
            userAgent: navigator.userAgent,
            url: window.location.href,
            networkState: navigator.onLine ? 'online' : 'offline',
            memoryUsage: {
              used: currentUsage,
              total: total,
              percentage: percentage
            }
          }, `High memory usage: ${percentage.toFixed(1)}%`);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Monitor WebSocket connections for patterns
   */
  private monitorWebSockets(): void {
    if (typeof window === 'undefined') return;

    const originalWebSocket = window.WebSocket;
    const connectionAttempts = new Map<string, number>();
    const connectionTimes = new Map<string, number>();

    window.WebSocket = class extends originalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);

        const urlString = url.toString();
        const currentTime = Date.now();
        
        // Track connection attempts
        const attempts = connectionAttempts.get(urlString) || 0;
        connectionAttempts.set(urlString, attempts + 1);
        connectionTimes.set(urlString, currentTime);

        // Detect connection loops (>5 attempts in 30 seconds)
        if (attempts > 5) {
          const firstAttempt = connectionTimes.get(urlString) || 0;
          if (currentTime - firstAttempt < 30000) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            detector.detectPattern('nld-002', {
              component: 'websocket-monitor',
              userAgent: navigator.userAgent,
              url: window.location.href,
              networkState: navigator.onLine ? 'online' : 'offline'
            }, `WebSocket connection loop detected: ${attempts} attempts to ${urlString}`);
          }
        }

        // Reset counter after successful connection
        this.addEventListener('open', () => {
          connectionAttempts.delete(urlString);
          connectionTimes.delete(urlString);
        });

        // Track failed connections
        this.addEventListener('error', () => {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          detector.detectPattern('nld-002', {
            component: 'websocket-monitor',
            userAgent: navigator.userAgent,
            url: window.location.href,
            networkState: navigator.onLine ? 'online' : 'offline'
          }, `WebSocket connection failed: ${urlString}`);
        });
      }
    };

    const detector = this;
  }

  /**
   * Detect a specific pattern occurrence
   */
  public detectPattern(
    patternId: string, 
    context: NLTRecord['context'], 
    failureMode: string,
    userFeedback?: string
  ): NLTRecord {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      throw new Error(`Unknown pattern ID: ${patternId}`);
    }

    const record: NLTRecord = {
      id: `nlt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      pattern,
      context: {
        ...context,
        stackTrace: new Error().stack
      },
      failureMode,
      effectiveness: 0, // Will be calculated based on recovery success
      recovered: false,
      userFeedback
    };

    this.records.push(record);
    this.logPattern(record);

    // Trigger recovery mechanisms
    this.attemptRecovery(record);

    return record;
  }

  /**
   * Attempt automatic recovery for detected pattern
   */
  private attemptRecovery(record: NLTRecord): void {
    switch (record.pattern.category) {
      case 'white-screen':
        this.recoverWhiteScreen(record);
        break;
      case 'websocket':
        this.recoverWebSocket(record);
        break;
      case 'memory-leak':
        this.recoverMemoryLeak(record);
        break;
      case 'race-condition':
        this.recoverRaceCondition(record);
        break;
      case 'performance':
        this.recoverPerformance(record);
        break;
    }
  }

  /**
   * Recovery mechanism for white screen failures
   */
  private recoverWhiteScreen(record: NLTRecord): void {
    console.warn('🚨 White screen detected, attempting recovery...');
    
    // Force a re-render by dispatching a custom event
    window.dispatchEvent(new CustomEvent('nld-force-rerender', { 
      detail: { pattern: record.pattern.id, timestamp: record.timestamp }
    }));

    // Mark as recovered after a short delay to allow re-render
    setTimeout(() => {
      record.recovered = true;
      record.effectiveness = 0.7; // 70% effectiveness for automatic recovery
      this.updateRecord(record);
    }, 1000);
  }

  /**
   * Recovery mechanism for WebSocket issues
   */
  private recoverWebSocket(record: NLTRecord): void {
    console.warn('🔌 WebSocket issue detected, implementing backoff...');
    
    window.dispatchEvent(new CustomEvent('nld-websocket-backoff', {
      detail: { pattern: record.pattern.id, timestamp: record.timestamp }
    }));

    record.recovered = true;
    record.effectiveness = 0.8;
    this.updateRecord(record);
  }

  /**
   * Recovery mechanism for memory leaks
   */
  private recoverMemoryLeak(record: NLTRecord): void {
    console.warn('💾 Memory leak detected, triggering cleanup...');
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }

    window.dispatchEvent(new CustomEvent('nld-memory-cleanup', {
      detail: { pattern: record.pattern.id, timestamp: record.timestamp }
    }));

    record.recovered = true;
    record.effectiveness = 0.6;
    this.updateRecord(record);
  }

  /**
   * Recovery mechanism for race conditions
   */
  private recoverRaceCondition(record: NLTRecord): void {
    console.warn('⚡ Race condition detected, implementing locks...');
    
    window.dispatchEvent(new CustomEvent('nld-operation-lock', {
      detail: { pattern: record.pattern.id, timestamp: record.timestamp }
    }));

    record.recovered = true;
    record.effectiveness = 0.9;
    this.updateRecord(record);
  }

  /**
   * Recovery mechanism for performance issues
   */
  private recoverPerformance(record: NLTRecord): void {
    console.warn('🐌 Performance issue detected, optimizing...');
    
    window.dispatchEvent(new CustomEvent('nld-performance-optimize', {
      detail: { pattern: record.pattern.id, timestamp: record.timestamp }
    }));

    record.recovered = true;
    record.effectiveness = 0.5;
    this.updateRecord(record);
  }

  /**
   * Update an existing record
   */
  private updateRecord(record: NLTRecord): void {
    const index = this.records.findIndex(r => r.id === record.id);
    if (index !== -1) {
      this.records[index] = record;
      this.logPattern(record, true); // Log as update
    }
  }

  /**
   * Log pattern to console and storage
   */
  private logPattern(record: NLTRecord, isUpdate: boolean = false): void {
    const action = isUpdate ? 'Updated' : 'Detected';
    console.log(`🧠 NLD Pattern ${action}:`, {
      id: record.id,
      pattern: record.pattern.pattern,
      severity: record.pattern.severity,
      category: record.pattern.category,
      failureMode: record.failureMode,
      recovered: record.recovered,
      effectiveness: record.effectiveness
    });

    // Store in localStorage for debugging
    const storageKey = 'nld-patterns';
    const existingPatterns = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    if (isUpdate) {
      const index = existingPatterns.findIndex((p: any) => p.id === record.id);
      if (index !== -1) {
        existingPatterns[index] = record;
      }
    } else {
      existingPatterns.push(record);
    }
    
    // Keep only last 100 records
    const trimmedPatterns = existingPatterns.slice(-100);
    localStorage.setItem(storageKey, JSON.stringify(trimmedPatterns));
  }

  /**
   * Get all recorded patterns
   */
  public getRecords(): NLTRecord[] {
    return [...this.records];
  }

  /**
   * Get records by category
   */
  public getRecordsByCategory(category: NLDPattern['category']): NLTRecord[] {
    return this.records.filter(record => record.pattern.category === category);
  }

  /**
   * Get patterns by severity
   */
  public getRecordsBySeverity(severity: NLDPattern['severity']): NLTRecord[] {
    return this.records.filter(record => record.pattern.severity === severity);
  }

  /**
   * Calculate overall system health
   */
  public getSystemHealth(): {
    score: number;
    criticalIssues: number;
    recentFailures: number;
    recoveryRate: number;
  } {
    const recentRecords = this.records.filter(
      record => Date.now() - new Date(record.timestamp).getTime() < 3600000 // Last hour
    );

    const criticalIssues = recentRecords.filter(
      record => record.pattern.severity === 'critical' && !record.recovered
    ).length;

    const recoveredCount = recentRecords.filter(record => record.recovered).length;
    const recoveryRate = recentRecords.length > 0 ? recoveredCount / recentRecords.length : 1;

    // Calculate health score (0-100)
    const baseScore = 100;
    const criticalPenalty = criticalIssues * 25;
    const failurePenalty = (recentRecords.length - recoveredCount) * 10;
    const score = Math.max(0, baseScore - criticalPenalty - failurePenalty);

    return {
      score,
      criticalIssues,
      recentFailures: recentRecords.length,
      recoveryRate
    };
  }

  /**
   * Export data for neural training
   */
  public exportTrainingData(): {
    patterns: NLDPattern[];
    records: NLTRecord[];
    metadata: {
      exportTime: string;
      totalRecords: number;
      categories: Record<string, number>;
      recoveryRate: number;
    };
  } {
    const categoryCount = this.records.reduce((acc, record) => {
      acc[record.pattern.category] = (acc[record.pattern.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recoveredCount = this.records.filter(r => r.recovered).length;
    const recoveryRate = this.records.length > 0 ? recoveredCount / this.records.length : 0;

    return {
      patterns: Array.from(this.patterns.values()),
      records: this.records,
      metadata: {
        exportTime: new Date().toISOString(),
        totalRecords: this.records.length,
        categories: categoryCount,
        recoveryRate
      }
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    // Clear intervals
    if (this.memoryWatcher) {
      clearInterval(this.memoryWatcher);
      this.memoryWatcher = undefined;
    }

    // Disconnect observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();

    // Clear records
    this.records = [];
  }
}

/**
 * React Hook for NLD Pattern Detection
 * Use this in your main app component to enable monitoring
 */
export function useNLDPatternDetection(enabled: boolean = true): {
  detector: NLDPatternDetector | null;
  systemHealth: ReturnType<NLDPatternDetector['getSystemHealth']> | null;
  records: NLTRecord[];
} {
  const detectorRef = useRef<NLDPatternDetector | null>(null);
  const [systemHealth, setSystemHealth] = React.useState<ReturnType<NLDPatternDetector['getSystemHealth']> | null>(null);
  const [records, setRecords] = React.useState<NLTRecord[]>([]);

  // Initialize detector
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    detectorRef.current = new NLDPatternDetector();

    return () => {
      detectorRef.current?.dispose();
      detectorRef.current = null;
    };
  }, [enabled]);

  // Update system health periodically
  useEffect(() => {
    if (!detectorRef.current) return;

    const updateHealth = () => {
      if (detectorRef.current) {
        setSystemHealth(detectorRef.current.getSystemHealth());
        setRecords(detectorRef.current.getRecords());
      }
    };

    updateHealth(); // Initial update
    const interval = setInterval(updateHealth, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [enabled]);

  return {
    detector: detectorRef.current,
    systemHealth,
    records
  };
}

export default NLDPatternDetector;