/**
 * NLD Stdout Capture Failure Monitor
 * Real-time detection of stdout capture failures in Claude process spawning
 * Monitors: /workspaces/agent-feed/simple-backend.js createRealClaudeInstance function
 * Generated: 2025-08-27
 */

import { ProcessIOAntiPatternsDatabase, ProcessIOFailurePattern } from './process-io-anti-patterns-database';

export interface StdoutCaptureEvent {
  timestamp: string;
  instanceId: string;
  eventType: 'process_spawn' | 'stdout_handler_registered' | 'stdout_data' | 'sse_connection' | 'output_broadcast' | 'failure_detected';
  processId?: number;
  data?: any;
  failurePattern?: string;
}

export interface StdoutCaptureMetrics {
  instanceId: string;
  processSpawnTime?: Date;
  handlerRegistrationTime?: Date;
  firstOutputTime?: Date;
  sseConnectionTime?: Date;
  totalOutputEvents: number;
  failedBroadcasts: number;
  activeConnections: number;
  captureHealthScore: number; // 0-100
}

export class StdoutCaptureFailureMonitor {
  private antiPatternsDB: ProcessIOAntiPatternsDatabase;
  private monitoredInstances: Map<string, StdoutCaptureMetrics> = new Map();
  private eventLog: StdoutCaptureEvent[] = [];
  private isMonitoring: boolean = false;
  private failureDetectionThreshold: number = 5000; // 5 seconds
  private outputTimeoutTimer: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.antiPatternsDB = new ProcessIOAntiPatternsDatabase();
  }

  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    console.log('🔍 NLD Stdout Capture Failure Monitor - Starting');
    this.isMonitoring = true;
    
    // Hook into existing backend monitoring
    this.setupProcessSpawnHooks();
    this.setupSSEConnectionHooks();
    this.setupOutputCapturHooks();
    
    console.log('✅ NLD Monitor active - Process I/O failure detection enabled');
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
    
    // Clear all timeout timers
    this.outputTimeoutTimer.forEach((timer) => clearTimeout(timer));
    this.outputTimeoutTimer.clear();
    
    console.log('🛑 NLD Stdout Capture Monitor - Stopped');
  }

  private setupProcessSpawnHooks(): void {
    // Monitor process spawning events
    // Note: In real implementation, this would hook into the actual backend
    console.log('🔧 Setting up process spawn monitoring hooks');
  }

  private setupSSEConnectionHooks(): void {
    // Monitor SSE connection establishment
    console.log('🔧 Setting up SSE connection monitoring hooks');
  }

  private setupOutputCapturHooks(): void {
    // Monitor stdout/stderr data capture
    console.log('🔧 Setting up output capture monitoring hooks');
  }

  public recordProcessSpawn(instanceId: string, processId: number): void {
    if (!this.isMonitoring) return;

    const metrics: StdoutCaptureMetrics = {
      instanceId,
      processSpawnTime: new Date(),
      totalOutputEvents: 0,
      failedBroadcasts: 0,
      activeConnections: 0,
      captureHealthScore: 0
    };

    this.monitoredInstances.set(instanceId, metrics);

    this.logEvent({
      timestamp: new Date().toISOString(),
      instanceId,
      eventType: 'process_spawn',
      processId
    });

    // Start timeout timer for stdout capture failure detection
    this.startOutputTimeoutDetection(instanceId);

    console.log(`🔍 NLD Monitor: Process spawn tracked - ${instanceId} (PID: ${processId})`);
  }

  public recordStdoutHandlerRegistration(instanceId: string): void {
    if (!this.isMonitoring) return;

    const metrics = this.monitoredInstances.get(instanceId);
    if (metrics) {
      metrics.handlerRegistrationTime = new Date();
      this.monitoredInstances.set(instanceId, metrics);
    }

    this.logEvent({
      timestamp: new Date().toISOString(),
      instanceId,
      eventType: 'stdout_handler_registered'
    });

    console.log(`🔍 NLD Monitor: Stdout handler registered - ${instanceId}`);
  }

  public recordStdoutData(instanceId: string, data: string): void {
    if (!this.isMonitoring) return;

    const metrics = this.monitoredInstances.get(instanceId);
    if (metrics) {
      if (!metrics.firstOutputTime) {
        metrics.firstOutputTime = new Date();
        // Clear timeout timer - output received successfully
        this.clearOutputTimeoutDetection(instanceId);
        console.log(`✅ NLD Monitor: First output received - ${instanceId}`);
      }
      
      metrics.totalOutputEvents++;
      metrics.captureHealthScore = Math.min(100, metrics.totalOutputEvents * 10);
      this.monitoredInstances.set(instanceId, metrics);
    }

    this.logEvent({
      timestamp: new Date().toISOString(),
      instanceId,
      eventType: 'stdout_data',
      data: data.length
    });
  }

  public recordSSEConnection(instanceId: string, connectionCount: number): void {
    if (!this.isMonitoring) return;

    const metrics = this.monitoredInstances.get(instanceId);
    if (metrics) {
      metrics.sseConnectionTime = new Date();
      metrics.activeConnections = connectionCount;
      this.monitoredInstances.set(instanceId, metrics);
    }

    this.logEvent({
      timestamp: new Date().toISOString(),
      instanceId,
      eventType: 'sse_connection',
      data: { connectionCount }
    });

    console.log(`🔍 NLD Monitor: SSE connection tracked - ${instanceId} (${connectionCount} connections)`);
  }

  public recordOutputBroadcast(instanceId: string, success: boolean): void {
    if (!this.isMonitoring) return;

    const metrics = this.monitoredInstances.get(instanceId);
    if (metrics) {
      if (!success) {
        metrics.failedBroadcasts++;
        metrics.captureHealthScore = Math.max(0, metrics.captureHealthScore - 5);
      }
      this.monitoredInstances.set(instanceId, metrics);
    }

    this.logEvent({
      timestamp: new Date().toISOString(),
      instanceId,
      eventType: 'output_broadcast',
      data: { success }
    });

    if (!success) {
      console.log(`⚠️ NLD Monitor: Output broadcast failed - ${instanceId}`);
      this.detectFailurePattern(instanceId);
    }
  }

  private startOutputTimeoutDetection(instanceId: string): void {
    const timer = setTimeout(() => {
      this.handleOutputTimeout(instanceId);
    }, this.failureDetectionThreshold);

    this.outputTimeoutTimer.set(instanceId, timer);
  }

  private clearOutputTimeoutDetection(instanceId: string): void {
    const timer = this.outputTimeoutTimer.get(instanceId);
    if (timer) {
      clearTimeout(timer);
      this.outputTimeoutTimer.delete(instanceId);
    }
  }

  private handleOutputTimeout(instanceId: string): void {
    console.log(`🚨 NLD Monitor: Stdout capture timeout detected - ${instanceId}`);
    
    this.logEvent({
      timestamp: new Date().toISOString(),
      instanceId,
      eventType: 'failure_detected',
      failurePattern: 'STDOUT_HANDLER_SILENT'
    });

    this.detectFailurePattern(instanceId);
  }

  private detectFailurePattern(instanceId: string): void {
    const metrics = this.monitoredInstances.get(instanceId);
    if (!metrics) return;

    let detectedPattern: string | undefined;

    // Pattern 1: Stdout Handler Present But Silent
    if (metrics.processSpawnTime && metrics.handlerRegistrationTime && !metrics.firstOutputTime) {
      const timeSinceSpawn = Date.now() - metrics.processSpawnTime.getTime();
      if (timeSinceSpawn > this.failureDetectionThreshold) {
        detectedPattern = 'STDOUT_HANDLER_SILENT';
      }
    }

    // Pattern 2: SSE Broadcasting Gap
    if (metrics.firstOutputTime && metrics.failedBroadcasts > 0 && metrics.activeConnections > 0) {
      detectedPattern = 'SSE_OUTPUT_GAP';
    }

    // Pattern 3: Process Initialization Race Condition
    if (metrics.sseConnectionTime && metrics.processSpawnTime && 
        metrics.sseConnectionTime < metrics.processSpawnTime) {
      detectedPattern = 'PROCESS_INIT_RACE';
    }

    if (detectedPattern) {
      console.log(`🎯 NLD Pattern Detected: ${detectedPattern} for instance ${instanceId}`);
      this.recordPatternDetection(instanceId, detectedPattern);
    }
  }

  private recordPatternDetection(instanceId: string, patternId: string): void {
    const pattern = this.antiPatternsDB.getPatternById(patternId);
    if (!pattern) return;

    console.log(`📊 NLD Failure Pattern Analysis:`);
    console.log(`   Pattern: ${pattern.patternName}`);
    console.log(`   Severity: ${pattern.impactAssessment.severity}`);
    console.log(`   Instance: ${instanceId}`);
    console.log(`   Prevention: ${pattern.tddPreventionStrategy}`);

    // Export to neural training system
    this.exportToNeuralTraining(instanceId, pattern);
  }

  private exportToNeuralTraining(instanceId: string, pattern: ProcessIOFailurePattern): void {
    const neuralData = {
      timestamp: new Date().toISOString(),
      instanceId,
      failurePattern: pattern.patternId,
      severity: pattern.impactAssessment.severity,
      context: this.monitoredInstances.get(instanceId),
      tddRecommendation: pattern.tddPreventionStrategy
    };

    // In real implementation, this would export to neural-training-export.ts
    console.log('🧠 NLD Neural Export:', JSON.stringify(neuralData, null, 2));
  }

  private logEvent(event: StdoutCaptureEvent): void {
    this.eventLog.push(event);
    
    // Keep only last 1000 events
    if (this.eventLog.length > 1000) {
      this.eventLog.shift();
    }
  }

  public getInstanceMetrics(instanceId: string): StdoutCaptureMetrics | undefined {
    return this.monitoredInstances.get(instanceId);
  }

  public getAllMetrics(): Map<string, StdoutCaptureMetrics> {
    return this.monitoredInstances;
  }

  public getFailureReport(): {
    totalInstances: number;
    healthyInstances: number;
    failedInstances: number;
    detectedPatterns: string[];
    avgHealthScore: number;
  } {
    const metrics = Array.from(this.monitoredInstances.values());
    const healthy = metrics.filter(m => m.captureHealthScore > 50);
    const failed = metrics.filter(m => m.captureHealthScore <= 50);
    const avgScore = metrics.reduce((sum, m) => sum + m.captureHealthScore, 0) / metrics.length || 0;
    
    const detectedPatterns = this.eventLog
      .filter(e => e.eventType === 'failure_detected' && e.failurePattern)
      .map(e => e.failurePattern!)
      .filter((pattern, index, self) => self.indexOf(pattern) === index);

    return {
      totalInstances: metrics.length,
      healthyInstances: healthy.length,
      failedInstances: failed.length,
      detectedPatterns,
      avgHealthScore: Math.round(avgScore)
    };
  }

  public getEventHistory(instanceId?: string): StdoutCaptureEvent[] {
    if (instanceId) {
      return this.eventLog.filter(e => e.instanceId === instanceId);
    }
    return [...this.eventLog];
  }
}

// Singleton instance for global monitoring
export const stdoutCaptureMonitor = new StdoutCaptureFailureMonitor();