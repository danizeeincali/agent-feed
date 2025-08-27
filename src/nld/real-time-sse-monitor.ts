/**
 * NLD Real-Time SSE Event Flow Monitor
 * 
 * Continuously monitors SSE event broadcasting and terminal command processing
 * to detect anti-patterns in real-time and trigger alerts.
 */

import { nldPatternDatabase } from './sse-event-flow-anti-patterns-database';

interface SSEEventMetrics {
  eventType: string;
  timestamp: number;
  instanceId: string;
  data?: any;
  processed: boolean;
  latency?: number;
}

interface TerminalCommandMetrics {
  instanceId: string;
  input: string;
  echoTimestamp?: number;
  responseTimestamp?: number;
  success: boolean;
  latency?: number;
}

interface StatusChangeMetrics {
  instanceId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: number;
  sseBroadcastSent: boolean;
  frontendUpdated: boolean;
}

export class RealTimeSSEMonitor {
  private sseEventHistory: SSEEventMetrics[] = [];
  private terminalCommandHistory: TerminalCommandMetrics[] = [];
  private statusChangeHistory: StatusChangeMetrics[] = [];
  private eventHandlerCoverage: Map<string, number> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeEventTypes();
  }

  private initializeEventTypes(): void {
    // Track coverage for all expected SSE event types
    const expectedEventTypes = [
      'terminal_output',
      'input_echo', 
      'status_update',
      'connected',
      'heartbeat'
    ];

    expectedEventTypes.forEach(type => {
      this.eventHandlerCoverage.set(type, 0);
    });
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    console.log('🔍 NLD Real-Time SSE Monitor: Starting event flow monitoring...');
    this.isMonitoring = true;

    // Monitor every 1 second for anti-patterns
    this.monitoringInterval = setInterval(() => {
      this.detectAntiPatterns();
      this.cleanupOldMetrics();
    }, 1000);

    // Set up event listeners for various monitoring points
    this.setupEventListeners();
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('🔍 NLD Real-Time SSE Monitor: Stopping monitoring...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private setupEventListeners(): void {
    // Monitor SSE events in browser environment
    if (typeof window !== 'undefined') {
      // Hook into EventSource messages
      const originalEventSourceAdd = EventSource.prototype.addEventListener;
      EventSource.prototype.addEventListener = function(type: string, listener: any) {
        const wrappedListener = (event: MessageEvent) => {
          // Track SSE event reception
          if (type === 'message') {
            try {
              const data = JSON.parse(event.data);
              realTimeSSEMonitor.recordSSEEvent({
                eventType: data.type || 'unknown',
                timestamp: Date.now(),
                instanceId: data.instanceId || 'unknown',
                data: data,
                processed: false
              });
            } catch (error) {
              console.warn('Failed to parse SSE event for monitoring:', error);
            }
          }
          
          return listener.call(this, event);
        };
        
        return originalEventSourceAdd.call(this, type, wrappedListener);
      };
    }
  }

  recordSSEEvent(metrics: SSEEventMetrics): void {
    this.sseEventHistory.push(metrics);
    
    // Track event type coverage
    const currentCount = this.eventHandlerCoverage.get(metrics.eventType) || 0;
    this.eventHandlerCoverage.set(metrics.eventType, currentCount + 1);
    
    // Mark as processed after a delay to detect handling gaps
    setTimeout(() => {
      const event = this.sseEventHistory.find(e => 
        e.timestamp === metrics.timestamp && 
        e.instanceId === metrics.instanceId &&
        e.eventType === metrics.eventType
      );
      if (event) {
        event.processed = true;
        event.latency = Date.now() - event.timestamp;
      }
    }, 500);
  }

  recordTerminalCommand(instanceId: string, input: string): TerminalCommandMetrics {
    const metrics: TerminalCommandMetrics = {
      instanceId,
      input,
      success: false
    };
    
    this.terminalCommandHistory.push(metrics);
    return metrics;
  }

  recordTerminalEcho(instanceId: string, input: string): void {
    const command = this.terminalCommandHistory
      .reverse()
      .find(cmd => cmd.instanceId === instanceId && cmd.input.trim() === input.trim());
    
    if (command) {
      command.echoTimestamp = Date.now();
    }
  }

  recordTerminalResponse(instanceId: string, response: string): void {
    const command = this.terminalCommandHistory
      .reverse()
      .find(cmd => cmd.instanceId === instanceId && !cmd.responseTimestamp);
    
    if (command) {
      command.responseTimestamp = Date.now();
      command.success = true;
      
      if (command.echoTimestamp) {
        command.latency = command.responseTimestamp - command.echoTimestamp;
      }
    }
  }

  recordStatusChange(instanceId: string, oldStatus: string, newStatus: string, sseBroadcastSent: boolean = false): void {
    const metrics: StatusChangeMetrics = {
      instanceId,
      oldStatus,
      newStatus,
      timestamp: Date.now(),
      sseBroadcastSent,
      frontendUpdated: false
    };
    
    this.statusChangeHistory.push(metrics);
    
    // Check for frontend update after delay
    setTimeout(() => {
      // This would be set by frontend when UI updates
      // For now, assume frontend updated if SSE broadcast was sent
      metrics.frontendUpdated = sseBroadcastSent;
    }, 1000);
  }

  private detectAntiPatterns(): void {
    this.detectStatusBroadcastGaps();
    this.detectTerminalProcessingGaps();
    this.detectEventHandlerGaps();
    this.detectEventStreamIssues();
  }

  private detectStatusBroadcastGaps(): void {
    const recentStatusChanges = this.statusChangeHistory
      .filter(change => (Date.now() - change.timestamp) < 5000); // Last 5 seconds

    recentStatusChanges.forEach(change => {
      if (!change.sseBroadcastSent) {
        nldPatternDatabase.recordDetection('SSE_STATUS_BROADCAST_GAP_V1', {
          instanceId: change.instanceId,
          statusChange: `${change.oldStatus} -> ${change.newStatus}`,
          timestamp: change.timestamp,
          sseBroadcastSent: change.sseBroadcastSent
        });
      }
    });
  }

  private detectTerminalProcessingGaps(): void {
    const recentCommands = this.terminalCommandHistory
      .filter(cmd => cmd.echoTimestamp && (Date.now() - cmd.echoTimestamp) > 2000); // Commands with echo older than 2 seconds

    recentCommands.forEach(cmd => {
      if (!cmd.responseTimestamp) {
        nldPatternDatabase.recordDetection('TERMINAL_COMMAND_PROCESSING_INCOMPLETE_V1', {
          instanceId: cmd.instanceId,
          input: cmd.input,
          echoTimestamp: cmd.echoTimestamp,
          responseTimestamp: cmd.responseTimestamp,
          latencySinceEcho: cmd.echoTimestamp ? Date.now() - cmd.echoTimestamp : null
        });
      }
    });
  }

  private detectEventHandlerGaps(): void {
    const unprocessedEvents = this.sseEventHistory
      .filter(event => (Date.now() - event.timestamp) > 1000 && !event.processed); // Older than 1 second and not processed

    if (unprocessedEvents.length > 0) {
      nldPatternDatabase.recordDetection('EVENT_HANDLER_REGISTRATION_GAP_V1', {
        unprocessedEvents: unprocessedEvents.length,
        eventTypes: unprocessedEvents.map(e => e.eventType),
        oldestEvent: Math.min(...unprocessedEvents.map(e => e.timestamp))
      });
    }
  }

  private detectEventStreamIssues(): void {
    const recentEvents = this.sseEventHistory
      .filter(event => (Date.now() - event.timestamp) < 10000); // Last 10 seconds

    const unknownEventTypes = recentEvents
      .filter(event => event.eventType === 'unknown' || !this.eventHandlerCoverage.has(event.eventType))
      .map(event => event.eventType);

    if (unknownEventTypes.length > 0) {
      nldPatternDatabase.recordDetection('SSE_MULTI_EVENT_STREAM_ISSUE_V1', {
        unknownEventTypes: [...new Set(unknownEventTypes)],
        totalUnknownEvents: unknownEventTypes.length,
        knownEventTypes: Array.from(this.eventHandlerCoverage.keys())
      });
    }
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - (5 * 60 * 1000); // Keep last 5 minutes

    this.sseEventHistory = this.sseEventHistory.filter(event => event.timestamp > cutoffTime);
    this.terminalCommandHistory = this.terminalCommandHistory.filter(cmd => 
      !cmd.echoTimestamp || cmd.echoTimestamp > cutoffTime
    );
    this.statusChangeHistory = this.statusChangeHistory.filter(change => change.timestamp > cutoffTime);
  }

  getMetrics(): {
    sseEvents: number;
    terminalCommands: number;
    statusChanges: number;
    eventHandlerCoverage: Record<string, number>;
    recentAntiPatterns: any[];
  } {
    return {
      sseEvents: this.sseEventHistory.length,
      terminalCommands: this.terminalCommandHistory.length,
      statusChanges: this.statusChangeHistory.length,
      eventHandlerCoverage: Object.fromEntries(this.eventHandlerCoverage),
      recentAntiPatterns: nldPatternDatabase.getDetectionHistory().slice(0, 5)
    };
  }

  generateRealTimeReport(): {
    timestamp: string;
    monitoring: boolean;
    metrics: any;
    antiPatterns: any[];
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const antiPatterns = nldPatternDatabase.getDetectionHistory().slice(0, 10);
    
    const recommendations: string[] = [];
    
    // Generate specific recommendations based on detected patterns
    if (antiPatterns.some(p => p.patternId === 'SSE_STATUS_BROADCAST_GAP_V1')) {
      recommendations.push("🚨 Add broadcastToInstance() calls after status changes in backend");
    }
    
    if (antiPatterns.some(p => p.patternId === 'TERMINAL_COMMAND_PROCESSING_INCOMPLETE_V1')) {
      recommendations.push("🚨 Complete terminal command processing pipeline - ensure responses are generated and broadcast");
    }
    
    if (antiPatterns.some(p => p.patternId === 'EVENT_HANDLER_REGISTRATION_GAP_V1')) {
      recommendations.push("🚨 Add missing SSE event handlers in frontend useHTTPSSE hook");
    }
    
    if (antiPatterns.some(p => p.patternId === 'SSE_MULTI_EVENT_STREAM_ISSUE_V1')) {
      recommendations.push("🚨 Implement comprehensive event type routing in SSE message handler");
    }
    
    return {
      timestamp: new Date().toISOString(),
      monitoring: this.isMonitoring,
      metrics,
      antiPatterns,
      recommendations
    };
  }

  // Static methods for global access
  static recordSSEEventStatic(eventType: string, instanceId: string, data: any): void {
    if (typeof window !== 'undefined' && (window as any).realTimeSSEMonitor) {
      (window as any).realTimeSSEMonitor.recordSSEEvent({
        eventType,
        timestamp: Date.now(),
        instanceId,
        data,
        processed: false
      });
    }
  }

  static recordStatusChangeStatic(instanceId: string, oldStatus: string, newStatus: string, sseBroadcastSent: boolean): void {
    if (typeof window !== 'undefined' && (window as any).realTimeSSEMonitor) {
      (window as any).realTimeSSEMonitor.recordStatusChange(instanceId, oldStatus, newStatus, sseBroadcastSent);
    }
  }
}

// Create global instance
export const realTimeSSEMonitor = new RealTimeSSEMonitor();

// Make available globally for browser environments
if (typeof window !== 'undefined') {
  (window as any).realTimeSSEMonitor = realTimeSSEMonitor;
  (window as any).nldPatternDatabase = nldPatternDatabase;
}