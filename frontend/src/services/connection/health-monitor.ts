/**
 * Health Monitor
 * Monitors WebSocket connection health with ping/pong and quality assessment
 */

import { HealthMonitor, HealthStatus, ConnectionManager } from './types';

export class PingHealthMonitor implements HealthMonitor {
  private connectionManager: ConnectionManager;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPing: Date | null = null;
  private latency: number | null = null;
  private consecutiveFailures = 0;
  private maxFailures: number;
  private pingIntervalMs: number;
  private pingTimeoutMs: number;
  private latencyHistory: number[] = [];
  private maxHistorySize = 20;
  private startTime: Date | null = null;

  constructor(
    connectionManager: ConnectionManager,
    options: {
      interval?: number;
      timeout?: number;
      maxFailures?: number;
    } = {}
  ) {
    this.connectionManager = connectionManager;
    this.pingIntervalMs = options.interval || 30000; // 30 seconds
    this.pingTimeoutMs = options.timeout || 5000;    // 5 seconds
    this.maxFailures = options.maxFailures || 3;
  }

  startMonitoring(): void {
    this.stopMonitoring();
    this.startTime = new Date();
    
    // Start with an immediate ping
    this.performPing();
    
    // Schedule regular pings
    this.pingInterval = setInterval(() => {
      this.performPing();
    }, this.pingIntervalMs);
  }

  stopMonitoring(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.startTime = null;
  }

  async ping(): Promise<number> {
    const socket = this.connectionManager.getSocket();
    if (!socket || !socket.connected) {
      throw new Error('No active connection for ping');
    }

    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, this.pingTimeoutMs);

      // Use performance.now() for high precision timing
      const pingPayload = {
        clientTime: startTime,
        id: Math.random().toString(36).substr(2, 9)
      };

      socket.emit('ping', pingPayload, (response: any) => {
        clearTimeout(timeout);
        
        try {
          const endTime = performance.now();
          const roundTripTime = endTime - startTime;
          
          // Calculate server processing time if available
          let serverProcessingTime = 0;
          if (response && response.serverTime && response.serverReceivedTime) {
            serverProcessingTime = response.serverTime - response.serverReceivedTime;
          }
          
          // Network latency is round trip minus server processing
          const networkLatency = Math.max(0, roundTripTime - serverProcessingTime);
          
          this.updateLatency(networkLatency);
          resolve(networkLatency);
        } catch (error) {
          reject(new Error('Invalid ping response'));
        }
      });
    });
  }

  private async performPing(): Promise<void> {
    try {
      const latency = await this.ping();
      this.consecutiveFailures = 0;
      this.lastPing = new Date();
      
      // Emit health update
      this.connectionManager.emit('health_update', this.getHealth());
    } catch (error) {
      this.consecutiveFailures++;
      this.latency = null;
      
      // Emit health degradation warning
      this.connectionManager.emit('health_degraded', {
        consecutiveFailures: this.consecutiveFailures,
        maxFailures: this.maxFailures,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // If too many consecutive failures, trigger reconnection
      if (this.consecutiveFailures >= this.maxFailures) {
        this.connectionManager.emit('health_critical', {
          message: 'Health check failures exceeded threshold',
          consecutiveFailures: this.consecutiveFailures,
          recommendation: 'reconnect'
        });
      }
    }
  }

  private updateLatency(newLatency: number): void {
    this.latency = newLatency;
    
    // Add to history
    this.latencyHistory.push(newLatency);
    if (this.latencyHistory.length > this.maxHistorySize) {
      this.latencyHistory.shift();
    }
  }

  getLatency(): number | null {
    return this.latency;
  }

  getLastPing(): Date | null {
    return this.lastPing;
  }

  getAverageLatency(): number | null {
    if (this.latencyHistory.length === 0) return null;
    
    const sum = this.latencyHistory.reduce((acc, latency) => acc + latency, 0);
    return sum / this.latencyHistory.length;
  }

  getLatencyVariation(): number | null {
    if (this.latencyHistory.length < 2) return null;
    
    const avg = this.getAverageLatency();
    if (avg === null) return null;
    
    const variance = this.latencyHistory.reduce((acc, latency) => {
      return acc + Math.pow(latency - avg, 2);
    }, 0) / this.latencyHistory.length;
    
    return Math.sqrt(variance);
  }

  private getNetworkQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {
    if (this.latency === null) return 'unknown';
    
    // Quality assessment based on latency
    if (this.latency < 50) return 'excellent';
    if (this.latency < 150) return 'good';
    if (this.latency < 300) return 'fair';
    return 'poor';
  }

  private getUptime(): number {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime.getTime();
  }

  getHealth(): HealthStatus {
    const isHealthy = this.consecutiveFailures < this.maxFailures && 
                     this.latency !== null && 
                     this.latency < 1000; // Consider > 1s latency unhealthy

    return {
      isHealthy,
      latency: this.latency,
      lastPing: this.lastPing,
      consecutiveFailures: this.consecutiveFailures,
      uptime: this.getUptime(),
      serverTimestamp: this.lastPing,
      networkQuality: this.getNetworkQuality()
    };
  }

  getDetailedMetrics() {
    return {
      ...this.getHealth(),
      averageLatency: this.getAverageLatency(),
      latencyVariation: this.getLatencyVariation(),
      latencyHistory: [...this.latencyHistory],
      maxFailuresThreshold: this.maxFailures,
      pingInterval: this.pingIntervalMs,
      pingTimeout: this.pingTimeoutMs
    };
  }

  // Manual health check trigger
  async checkHealth(): Promise<HealthStatus> {
    try {
      await this.ping();
    } catch (error) {
      // Error is handled in ping method
    }
    return this.getHealth();
  }

  // Reset health monitor state
  reset(): void {
    this.lastPing = null;
    this.latency = null;
    this.consecutiveFailures = 0;
    this.latencyHistory = [];
    this.startTime = new Date();
  }

  // Configure monitoring parameters
  updateConfig(options: {
    interval?: number;
    timeout?: number;
    maxFailures?: number;
  }): void {
    if (options.interval) this.pingIntervalMs = options.interval;
    if (options.timeout) this.pingTimeoutMs = options.timeout;
    if (options.maxFailures) this.maxFailures = options.maxFailures;

    // Restart monitoring with new config
    if (this.pingInterval) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }
}

// Simple health monitor for basic scenarios
export class BasicHealthMonitor implements HealthMonitor {
  private isMonitoring = false;
  private lastCheck: Date | null = null;

  constructor(private connectionManager: ConnectionManager) {}

  startMonitoring(): void {
    this.isMonitoring = true;
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  async ping(): Promise<number> {
    this.lastCheck = new Date();
    // Simple ping - just check if socket is connected
    const socket = this.connectionManager.getSocket();
    if (!socket || !socket.connected) {
      throw new Error('Connection not available');
    }
    return 0; // No actual latency measurement
  }

  getLatency(): number | null {
    return null; // Not measured in basic monitor
  }

  getLastPing(): Date | null {
    return this.lastCheck;
  }

  getHealth(): HealthStatus {
    const socket = this.connectionManager.getSocket();
    const isConnected = socket && socket.connected;

    return {
      isHealthy: Boolean(isConnected),
      latency: null,
      lastPing: this.lastCheck,
      consecutiveFailures: 0,
      uptime: 0,
      serverTimestamp: null,
      networkQuality: 'unknown'
    };
  }
}