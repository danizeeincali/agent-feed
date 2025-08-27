/**
 * SSE Event Flow Gap Detector
 * 
 * Monitors for gaps in SSE event flow where:
 * - Backend sends SSE events but frontend doesn't receive them
 * - Terminal output events are lost in transmission
 * - Connection drops are not properly handled
 * - Event broadcasting fails to reach active connections
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

interface SSEEventFlow {
  instanceId: string;
  eventType: string;
  sent: boolean;
  received: boolean;
  timestamp: string;
  data: any;
  connectionId: string;
  latency?: number;
}

interface SSEConnectionState {
  instanceId: string;
  connectionId: string;
  status: 'active' | 'dropped' | 'stale' | 'reconnecting';
  eventsSent: number;
  eventsReceived: number;
  lastActivity: string;
  gapCount: number;
  totalLatency: number;
}

interface EventFlowGap {
  id: string;
  instanceId: string;
  gapType: 'missing_events' | 'connection_drop' | 'broadcast_failure' | 'timeout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  eventsSent: number;
  eventsReceived: number;
  gapSize: number;
  duration: number;
  affectedConnections: string[];
  timestamp: string;
  evidenceScore: number;
  tddfactor: number;
}

export class SSEEventFlowGapDetector extends EventEmitter {
  private eventFlows: Map<string, SSEEventFlow[]> = new Map(); // instanceId -> events
  private connectionStates: Map<string, SSEConnectionState> = new Map(); // connectionId -> state
  private gaps: Map<string, EventFlowGap> = new Map();
  private gapThreshold = 0.7; // If less than 70% events reach frontend, it's a gap

  constructor(private options = {
    logDirectory: '/workspaces/agent-feed/src/nld/patterns/terminal-pipe-failures',
    maxEventHistory: 5000,
    gapDetectionInterval: 1000, // Check for gaps every second
    connectionTimeout: 30000, // 30 seconds
    realTimeAlert: true
  }) {
    super();
    
    // Start gap detection monitoring
    this.startGapDetectionMonitoring();
  }

  /**
   * Record an SSE event being sent from backend
   */
  public recordEventSent(instanceId: string, eventData: {
    type: string;
    data: any;
    connectionId: string;
    timestamp?: string;
  }): void {
    const eventFlow: SSEEventFlow = {
      instanceId,
      eventType: eventData.type,
      sent: true,
      received: false,
      timestamp: eventData.timestamp || new Date().toISOString(),
      data: eventData.data,
      connectionId: eventData.connectionId
    };

    if (!this.eventFlows.has(instanceId)) {
      this.eventFlows.set(instanceId, []);
    }

    this.eventFlows.get(instanceId)!.push(eventFlow);
    
    // Update connection state
    this.updateConnectionState(eventData.connectionId, instanceId, 'sent');
    
    // Trim old events
    this.trimEventHistory(instanceId);
  }

  /**
   * Record an SSE event being received by frontend
   */
  public recordEventReceived(instanceId: string, eventData: {
    type: string;
    connectionId: string;
    timestamp?: string;
    latency?: number;
  }): void {
    const events = this.eventFlows.get(instanceId) || [];
    
    // Find matching sent event
    const matchingEvent = events
      .slice()
      .reverse()
      .find(e => 
        e.eventType === eventData.type && 
        e.connectionId === eventData.connectionId && 
        e.sent && 
        !e.received
      );

    if (matchingEvent) {
      matchingEvent.received = true;
      matchingEvent.latency = eventData.latency || 
        (new Date().getTime() - new Date(matchingEvent.timestamp).getTime());
    } else {
      // Event received without being sent (possible race condition or error)
      console.warn(`🚨 SSE Event received without matching sent event: ${eventData.type} on ${instanceId}`);
    }

    // Update connection state
    this.updateConnectionState(eventData.connectionId, instanceId, 'received');
  }

  /**
   * Record connection state change
   */
  public recordConnectionStateChange(connectionId: string, instanceId: string, newState: 'active' | 'dropped' | 'stale' | 'reconnecting'): void {
    const state = this.connectionStates.get(connectionId);
    
    if (state) {
      state.status = newState;
      state.lastActivity = new Date().toISOString();
    } else {
      this.connectionStates.set(connectionId, {
        instanceId,
        connectionId,
        status: newState,
        eventsSent: 0,
        eventsReceived: 0,
        lastActivity: new Date().toISOString(),
        gapCount: 0,
        totalLatency: 0
      });
    }

    // If connection dropped, analyze for gaps
    if (newState === 'dropped') {
      this.analyzeConnectionDrop(connectionId, instanceId);
    }
  }

  /**
   * Update connection state for event tracking
   */
  private updateConnectionState(connectionId: string, instanceId: string, eventType: 'sent' | 'received'): void {
    let state = this.connectionStates.get(connectionId);
    
    if (!state) {
      state = {
        instanceId,
        connectionId,
        status: 'active',
        eventsSent: 0,
        eventsReceived: 0,
        lastActivity: new Date().toISOString(),
        gapCount: 0,
        totalLatency: 0
      };
      this.connectionStates.set(connectionId, state);
    }

    if (eventType === 'sent') {
      state.eventsSent++;
    } else {
      state.eventsReceived++;
    }

    state.lastActivity = new Date().toISOString();
  }

  /**
   * Start continuous gap detection monitoring
   */
  private startGapDetectionMonitoring(): void {
    setInterval(() => {
      this.detectEventFlowGaps();
      this.detectStaleConnections();
    }, this.options.gapDetectionInterval);
  }

  /**
   * Detect gaps in event flow for all instances
   */
  private detectEventFlowGaps(): void {
    for (const [instanceId, events] of this.eventFlows.entries()) {
      this.analyzeEventFlowForInstance(instanceId, events);
    }
  }

  /**
   * Analyze event flow for specific instance
   */
  private analyzeEventFlowForInstance(instanceId: string, events: SSEEventFlow[]): void {
    const recentEvents = events.slice(-100); // Analyze last 100 events
    
    if (recentEvents.length < 10) return; // Need minimum events for analysis

    const sentEvents = recentEvents.filter(e => e.sent);
    const receivedEvents = recentEvents.filter(e => e.received);
    
    const receiptRatio = receivedEvents.length / sentEvents.length;
    
    // Gap detected: less than threshold of events are being received
    if (receiptRatio < this.gapThreshold) {
      this.recordEventFlowGap(instanceId, {
        gapType: 'missing_events',
        severity: receiptRatio < 0.3 ? 'critical' : receiptRatio < 0.5 ? 'high' : 'medium',
        eventsSent: sentEvents.length,
        eventsReceived: receivedEvents.length,
        gapSize: sentEvents.length - receivedEvents.length,
        affectedConnections: [...new Set(sentEvents.map(e => e.connectionId))]
      });
    }

    // Check for broadcast failures (events sent but none received on any connection)
    const broadcastEvents = sentEvents.filter(e => !e.received && 
      (new Date().getTime() - new Date(e.timestamp).getTime()) > 5000); // 5 second timeout

    if (broadcastEvents.length > 5) { // Multiple events not reaching any connection
      this.recordEventFlowGap(instanceId, {
        gapType: 'broadcast_failure',
        severity: 'high',
        eventsSent: broadcastEvents.length,
        eventsReceived: 0,
        gapSize: broadcastEvents.length,
        affectedConnections: [...new Set(broadcastEvents.map(e => e.connectionId))]
      });
    }
  }

  /**
   * Analyze connection drop for gaps
   */
  private analyzeConnectionDrop(connectionId: string, instanceId: string): void {
    const state = this.connectionStates.get(connectionId);
    if (!state) return;

    const gapSize = state.eventsSent - state.eventsReceived;
    
    if (gapSize > 5) { // Significant number of events lost during connection
      this.recordEventFlowGap(instanceId, {
        gapType: 'connection_drop',
        severity: gapSize > 20 ? 'high' : 'medium',
        eventsSent: state.eventsSent,
        eventsReceived: state.eventsReceived,
        gapSize,
        affectedConnections: [connectionId]
      });
    }
  }

  /**
   * Detect stale connections that haven't received events recently
   */
  private detectStaleConnections(): void {
    const now = Date.now();
    
    for (const [connectionId, state] of this.connectionStates.entries()) {
      const lastActivity = new Date(state.lastActivity).getTime();
      const inactiveTime = now - lastActivity;
      
      if (inactiveTime > this.options.connectionTimeout && state.status === 'active') {
        state.status = 'stale';
        
        // Analyze if events were still being sent to stale connection
        const recentEvents = this.eventFlows.get(state.instanceId) || [];
        const staleEvents = recentEvents.filter(e => 
          e.connectionId === connectionId && 
          new Date(e.timestamp).getTime() > lastActivity
        );

        if (staleEvents.length > 0) {
          this.recordEventFlowGap(state.instanceId, {
            gapType: 'timeout',
            severity: 'medium',
            eventsSent: staleEvents.length,
            eventsReceived: 0,
            gapSize: staleEvents.length,
            affectedConnections: [connectionId]
          });
        }
      }
    }
  }

  /**
   * Record an event flow gap
   */
  private recordEventFlowGap(instanceId: string, gapData: Partial<EventFlowGap>): void {
    const gapId = `gap-${instanceId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const gap: EventFlowGap = {
      id: gapId,
      instanceId,
      gapType: gapData.gapType || 'missing_events',
      severity: gapData.severity || 'medium',
      eventsSent: gapData.eventsSent || 0,
      eventsReceived: gapData.eventsReceived || 0,
      gapSize: gapData.gapSize || 0,
      duration: 0, // Could be calculated from event timestamps
      affectedConnections: gapData.affectedConnections || [],
      timestamp: new Date().toISOString(),
      evidenceScore: this.calculateEvidenceScore(gapData),
      tddfactor: this.calculateTDDFactor(gapData.gapType || 'missing_events')
    };

    this.gaps.set(gapId, gap);

    // Update connection gap counts
    gap.affectedConnections.forEach(connectionId => {
      const state = this.connectionStates.get(connectionId);
      if (state) {
        state.gapCount++;
      }
    });

    // Export for neural training
    this.exportForNeuralTraining(gap);

    // Real-time alert
    if (this.options.realTimeAlert && gap.severity === 'critical') {
      this.emit('criticalGap', gap);
    }

    // Log gap
    this.logGap(gap);

    console.log(`🚨 NLD: SSE Event Flow Gap detected - ${gap.gapType} (${gap.severity})`);
    console.log(`   Instance: ${instanceId}`);
    console.log(`   Gap Size: ${gap.gapSize} events`);
    console.log(`   Evidence Score: ${gap.evidenceScore}`);
    console.log(`   Affected Connections: ${gap.affectedConnections.length}`);
  }

  /**
   * Calculate evidence score for gap
   */
  private calculateEvidenceScore(gapData: Partial<EventFlowGap>): number {
    let score = 0.5; // Base score

    const gapRatio = (gapData.gapSize || 0) / (gapData.eventsSent || 1);
    score += gapRatio * 0.3; // Higher gap ratio = higher evidence

    if (gapData.gapType === 'broadcast_failure') score += 0.2;
    if (gapData.gapType === 'connection_drop') score += 0.15;
    
    const connectionCount = gapData.affectedConnections?.length || 1;
    if (connectionCount > 1) score += 0.1; // Multiple connections affected

    return Math.min(score, 1.0);
  }

  /**
   * Calculate TDD factor
   */
  private calculateTDDFactor(gapType: string): number {
    const tddFactors = {
      'missing_events': 0.8,    // Event flow tests would catch
      'connection_drop': 0.6,   // Connection handling tests
      'broadcast_failure': 0.9, // Broadcasting tests would catch
      'timeout': 0.7            // Timeout tests would catch
    };

    return tddFactors[gapType] || 0.5;
  }

  /**
   * Export gap for neural training
   */
  private exportForNeuralTraining(gap: EventFlowGap): void {
    const trainingData = {
      pattern_type: 'sse_event_flow_gap',
      gap_type: gap.gapType,
      severity: gap.severity,
      evidence_score: gap.evidenceScore,
      tdd_factor: gap.tddfactor,
      features: {
        gap_ratio: gap.gapSize / gap.eventsSent,
        connection_count: gap.affectedConnections.length,
        is_broadcast_failure: gap.gapType === 'broadcast_failure',
        is_connection_drop: gap.gapType === 'connection_drop',
        gap_size: gap.gapSize
      },
      timestamp: gap.timestamp,
      instance_id: gap.instanceId
    };

    const exportPath = path.join(this.options.logDirectory, 'sse-gap-neural-training.jsonl');
    fs.appendFileSync(exportPath, JSON.stringify(trainingData) + '\n');
  }

  /**
   * Log gap to file
   */
  private logGap(gap: EventFlowGap): void {
    const logPath = path.join(this.options.logDirectory, 'sse-event-flow-gaps.json');
    
    try {
      let existingGaps: any[] = [];
      if (fs.existsSync(logPath)) {
        const logContent = fs.readFileSync(logPath, 'utf-8');
        existingGaps = JSON.parse(logContent);
      }
      
      existingGaps.push(gap);
      
      // Keep only last 1000 gaps
      if (existingGaps.length > 1000) {
        existingGaps = existingGaps.slice(-1000);
      }
      
      fs.writeFileSync(logPath, JSON.stringify(existingGaps, null, 2));
    } catch (error) {
      console.error('Failed to log SSE gap:', error);
    }
  }

  /**
   * Trim old event history to prevent memory leaks
   */
  private trimEventHistory(instanceId: string): void {
    const events = this.eventFlows.get(instanceId);
    if (events && events.length > this.options.maxEventHistory) {
      this.eventFlows.set(instanceId, events.slice(-this.options.maxEventHistory));
    }
  }

  /**
   * Get gap statistics
   */
  public getGapStats(): {
    totalGaps: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    averageGapSize: number;
    averageEvidenceScore: number;
    recentGaps: EventFlowGap[];
  } {
    const gaps = Array.from(this.gaps.values());
    
    const byType = gaps.reduce((acc, g) => {
      acc[g.gapType] = (acc[g.gapType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = gaps.reduce((acc, g) => {
      acc[g.severity] = (acc[g.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgGapSize = gaps.reduce((sum, g) => sum + g.gapSize, 0) / gaps.length || 0;
    const avgEvidence = gaps.reduce((sum, g) => sum + g.evidenceScore, 0) / gaps.length || 0;

    return {
      totalGaps: gaps.length,
      byType,
      bySeverity,
      averageGapSize: avgGapSize,
      averageEvidenceScore: avgEvidence,
      recentGaps: gaps.slice(-20)
    };
  }

  /**
   * Get connection states
   */
  public getConnectionStates(): Map<string, SSEConnectionState> {
    return new Map(this.connectionStates);
  }

  /**
   * Cleanup resources for instance
   */
  public cleanup(instanceId: string): void {
    this.eventFlows.delete(instanceId);
    
    // Remove connection states for this instance
    for (const [connectionId, state] of this.connectionStates.entries()) {
      if (state.instanceId === instanceId) {
        this.connectionStates.delete(connectionId);
      }
    }
  }
}