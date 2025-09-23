/**
 * Metrics Tracker
 * Tracks and analyzes WebSocket connection metrics and performance
 */

import { MetricsTracker, ConnectionMetrics } from './types';

export class BasicMetricsTracker implements MetricsTracker {
  private metrics: ConnectionMetrics;
  private connectionStartTime: Date | null = null;
  private lastDisconnectionTime: Date | null = null;
  private totalDowntimeStart: Date | null = null;

  constructor() {
    this.metrics = this.createInitialMetrics();
  }

  private createInitialMetrics(): ConnectionMetrics {
    return {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      reconnectionAttempts: 0,
      totalDowntime: 0,
      averageLatency: 0,
      lastConnectionTime: null,
      lastDisconnectionTime: null,
      lastDisconnectionReason: null,
      bytesReceived: 0,
      bytesSent: 0,
      messagesReceived: 0,
      messagesSent: 0
    };
  }

  recordConnection(): void {
    this.metrics.connectionAttempts++;
    this.connectionStartTime = new Date();
    
    // If we were tracking downtime, add it to total
    if (this.totalDowntimeStart) {
      const downtime = Date.now() - this.totalDowntimeStart.getTime();
      this.metrics.totalDowntime += downtime;
      this.totalDowntimeStart = null;
    }
  }

  recordSuccessfulConnection(): void {
    this.metrics.successfulConnections++;
    this.metrics.lastConnectionTime = new Date();
  }

  recordFailedConnection(error: Error): void {
    this.metrics.failedConnections++;
    
    // Start tracking downtime if not already tracking
    if (!this.totalDowntimeStart) {
      this.totalDowntimeStart = new Date();
    }
  }

  recordDisconnection(reason: string): void {
    this.metrics.lastDisconnectionTime = new Date();
    this.metrics.lastDisconnectionReason = reason;
    this.lastDisconnectionTime = new Date();
    
    // Start tracking downtime
    this.totalDowntimeStart = new Date();
    
    // Reset connection start time
    this.connectionStartTime = null;
  }

  recordReconnection(attempt: number): void {
    this.metrics.reconnectionAttempts++;
  }

  recordError(error: Error): void {
    // Errors are implicitly tracked through failed connections
    // Could be extended to track specific error types
  }

  recordMessage(direction: 'sent' | 'received', size: number): void {
    if (direction === 'sent') {
      this.metrics.messagesSent++;
      this.metrics.bytesSent += size;
    } else {
      this.metrics.messagesReceived++;
      this.metrics.bytesReceived += size;
    }
  }

  recordLatency(latency: number): void {
    // Update running average latency
    const totalLatencyMeasurements = this.metrics.messagesReceived + this.metrics.messagesSent;
    
    if (totalLatencyMeasurements === 0) {
      this.metrics.averageLatency = latency;
    } else {
      // Running average calculation
      this.metrics.averageLatency = 
        (this.metrics.averageLatency * (totalLatencyMeasurements - 1) + latency) / totalLatencyMeasurements;
    }
  }

  getMetrics(): ConnectionMetrics {
    // Calculate current total downtime if disconnected
    let currentTotalDowntime = this.metrics.totalDowntime;
    if (this.totalDowntimeStart) {
      currentTotalDowntime += Date.now() - this.totalDowntimeStart.getTime();
    }

    return {
      ...this.metrics,
      totalDowntime: currentTotalDowntime
    };
  }

  reset(): void {
    this.metrics = this.createInitialMetrics();
    this.connectionStartTime = null;
    this.lastDisconnectionTime = null;
    this.totalDowntimeStart = null;
  }

  // Additional utility methods
  getConnectionSuccessRate(): number {
    if (this.metrics.connectionAttempts === 0) return 0;
    return this.metrics.successfulConnections / this.metrics.connectionAttempts;
  }

  getCurrentSessionDuration(): number {
    if (!this.connectionStartTime) return 0;
    return Date.now() - this.connectionStartTime.getTime();
  }

  getTotalMessageCount(): number {
    return this.metrics.messagesReceived + this.metrics.messagesSent;
  }

  getTotalByteCount(): number {
    return this.metrics.bytesReceived + this.metrics.bytesSent;
  }

  getAverageMessageSize(): number {
    const totalMessages = this.getTotalMessageCount();
    if (totalMessages === 0) return 0;
    return this.getTotalByteCount() / totalMessages;
  }
}

// Enhanced metrics tracker with historical data
export class AdvancedMetricsTracker extends BasicMetricsTracker {
  private connectionHistory: Array<{
    timestamp: Date;
    type: 'connected' | 'disconnected' | 'error';
    reason?: string;
    duration?: number;
  }> = [];
  
  private latencyHistory: Array<{
    timestamp: Date;
    latency: number;
  }> = [];
  
  private readonly maxHistorySize = 1000;
  private readonly latencyHistorySize = 200;

  recordConnection(): void {
    super.recordConnection();
    this.addToHistory('connected');
  }

  recordSuccessfulConnection(): void {
    super.recordSuccessfulConnection();
    // Connection history already recorded in recordConnection
  }

  recordDisconnection(reason: string): void {
    const sessionDuration = this.getCurrentSessionDuration();
    super.recordDisconnection(reason);
    
    this.addToHistory('disconnected', reason, sessionDuration);
  }

  recordError(error: Error): void {
    super.recordError(error);
    this.addToHistory('error', error.message);
  }

  recordLatency(latency: number): void {
    super.recordLatency(latency);
    
    // Add to latency history
    this.latencyHistory.push({
      timestamp: new Date(),
      latency
    });
    
    // Maintain history size limit
    if (this.latencyHistory.length > this.latencyHistorySize) {
      this.latencyHistory.shift();
    }
  }

  private addToHistory(
    type: 'connected' | 'disconnected' | 'error',
    reason?: string,
    duration?: number
  ): void {
    this.connectionHistory.push({
      timestamp: new Date(),
      type,
      reason,
      duration
    });
    
    // Maintain history size limit
    if (this.connectionHistory.length > this.maxHistorySize) {
      this.connectionHistory.shift();
    }
  }

  getConnectionHistory(): typeof this.connectionHistory {
    return [...this.connectionHistory];
  }

  getLatencyHistory(): typeof this.latencyHistory {
    return [...this.latencyHistory];
  }

  getRecentLatencyTrend(minutes: number = 5): {
    average: number;
    min: number;
    max: number;
    samples: number;
  } {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    const recentLatencies = this.latencyHistory
      .filter(entry => entry.timestamp.getTime() > cutoffTime)
      .map(entry => entry.latency);

    if (recentLatencies.length === 0) {
      return { average: 0, min: 0, max: 0, samples: 0 };
    }

    const average = recentLatencies.reduce((sum, lat) => sum + lat, 0) / recentLatencies.length;
    const min = Math.min(...recentLatencies);
    const max = Math.max(...recentLatencies);

    return {
      average: Math.round(average * 100) / 100,
      min,
      max,
      samples: recentLatencies.length
    };
  }

  getConnectionStabilityScore(): number {
    if (this.connectionHistory.length < 2) return 1.0;

    const recentEvents = this.connectionHistory.slice(-20); // Last 20 events
    const disconnectionEvents = recentEvents.filter(e => e.type === 'disconnected' || e.type === 'error');
    
    // Score based on disconnection frequency
    const stabilityScore = Math.max(0, 1 - (disconnectionEvents.length / recentEvents.length));
    
    return Math.round(stabilityScore * 100) / 100;
  }

  getDetailedMetrics() {
    const basicMetrics = this.getMetrics();
    const latencyTrend = this.getRecentLatencyTrend();
    
    return {
      ...basicMetrics,
      connectionSuccessRate: this.getConnectionSuccessRate(),
      currentSessionDuration: this.getCurrentSessionDuration(),
      totalMessageCount: this.getTotalMessageCount(),
      totalByteCount: this.getTotalByteCount(),
      averageMessageSize: this.getAverageMessageSize(),
      recentLatencyTrend: latencyTrend,
      connectionStabilityScore: this.getConnectionStabilityScore(),
      historyEntries: this.connectionHistory.length,
      latencyHistoryEntries: this.latencyHistory.length
    };
  }

  reset(): void {
    super.reset();
    this.connectionHistory = [];
    this.latencyHistory = [];
  }

  // Export historical data for analysis
  exportHistoricalData(): {
    connections: typeof this.connectionHistory;
    latencies: typeof this.latencyHistory;
    summary: ReturnType<typeof this.getDetailedMetrics>;
  } {
    return {
      connections: this.getConnectionHistory(),
      latencies: this.getLatencyHistory(),
      summary: this.getDetailedMetrics()
    };
  }
}