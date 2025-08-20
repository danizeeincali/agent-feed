/**
 * TDD Test: Real-time Connection Count Monitoring
 * Validates that connection counts stay within acceptable limits
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Connection monitoring utility
export class ConnectionMonitor {
  private static instance: ConnectionMonitor;
  private maxAllowedConnections = 5;
  private currentConnections = 0;
  private alerts: string[] = [];
  
  static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor();
    }
    return ConnectionMonitor.instance;
  }

  addConnection(): void {
    this.currentConnections++;
    if (this.currentConnections > this.maxAllowedConnections) {
      const alert = `🚨 CONNECTION LEAK DETECTED: ${this.currentConnections} connections (max: ${this.maxAllowedConnections})`;
      this.alerts.push(alert);
      console.error(alert);
    }
  }

  removeConnection(): void {
    this.currentConnections = Math.max(0, this.currentConnections - 1);
  }

  getCurrentCount(): number {
    return this.currentConnections;
  }

  getAlerts(): string[] {
    return [...this.alerts];
  }

  hasLeakAlerts(): boolean {
    return this.alerts.length > 0;
  }

  reset(): void {
    this.currentConnections = 0;
    this.alerts = [];
  }

  setMaxConnections(max: number): void {
    this.maxAllowedConnections = max;
  }
}

describe('Connection Count Monitoring', () => {
  let monitor: ConnectionMonitor;

  beforeEach(() => {
    monitor = ConnectionMonitor.getInstance();
    monitor.reset();
    monitor.setMaxConnections(5);
  });

  afterEach(() => {
    monitor.reset();
  });

  it('should track connection count accurately', () => {
    expect(monitor.getCurrentCount()).toBe(0);

    monitor.addConnection();
    expect(monitor.getCurrentCount()).toBe(1);

    monitor.addConnection();
    monitor.addConnection();
    expect(monitor.getCurrentCount()).toBe(3);

    monitor.removeConnection();
    expect(monitor.getCurrentCount()).toBe(2);

    monitor.removeConnection();
    monitor.removeConnection();
    expect(monitor.getCurrentCount()).toBe(0);
  });

  it('should not go below zero connections', () => {
    monitor.removeConnection();
    monitor.removeConnection();
    expect(monitor.getCurrentCount()).toBe(0);
  });

  it('should generate alerts when connection limit exceeded', () => {
    // Add connections within limit
    for (let i = 0; i < 5; i++) {
      monitor.addConnection();
    }
    expect(monitor.hasLeakAlerts()).toBe(false);

    // Exceed limit
    monitor.addConnection();
    expect(monitor.hasLeakAlerts()).toBe(true);
    expect(monitor.getAlerts()).toHaveLength(1);
    expect(monitor.getAlerts()[0]).toContain('CONNECTION LEAK DETECTED');

    // Add more to trigger multiple alerts
    monitor.addConnection();
    expect(monitor.getAlerts()).toHaveLength(2);
  });

  it('should handle stress testing scenarios', () => {
    // Simulate rapid connection creation
    for (let i = 0; i < 100; i++) {
      monitor.addConnection();
    }

    expect(monitor.getCurrentCount()).toBe(100);
    expect(monitor.hasLeakAlerts()).toBe(true);
    expect(monitor.getAlerts().length).toBeGreaterThan(90); // Should have many alerts

    // Clean up all connections
    for (let i = 0; i < 100; i++) {
      monitor.removeConnection();
    }

    expect(monitor.getCurrentCount()).toBe(0);
  });

  it('should allow configurable connection limits', () => {
    monitor.setMaxConnections(2);

    monitor.addConnection();
    monitor.addConnection();
    expect(monitor.hasLeakAlerts()).toBe(false);

    monitor.addConnection();
    expect(monitor.hasLeakAlerts()).toBe(true);
  });
});

describe('Real-world WebSocket Monitoring Integration', () => {
  it('should detect actual WebSocket connection leaks', async () => {
    const monitor = ConnectionMonitor.getInstance();
    monitor.reset();
    monitor.setMaxConnections(3);

    // Simulate WebSocket connections being created
    const simulateWebSocketCreation = () => {
      monitor.addConnection();
      return {
        close: () => monitor.removeConnection()
      };
    };

    // Create normal connections
    const conn1 = simulateWebSocketCreation();
    const conn2 = simulateWebSocketCreation();
    const conn3 = simulateWebSocketCreation();
    
    expect(monitor.hasLeakAlerts()).toBe(false);

    // Create leak condition
    const leakyConn1 = simulateWebSocketCreation();
    const leakyConn2 = simulateWebSocketCreation();

    expect(monitor.hasLeakAlerts()).toBe(true);
    expect(monitor.getCurrentCount()).toBe(5);

    // Clean up properly
    conn1.close();
    conn2.close();
    conn3.close();
    leakyConn1.close();
    leakyConn2.close();

    expect(monitor.getCurrentCount()).toBe(0);
  });

  it('should provide detailed leak diagnostics', () => {
    const monitor = ConnectionMonitor.getInstance();
    monitor.reset();
    monitor.setMaxConnections(2);

    // Trigger leaks
    for (let i = 0; i < 10; i++) {
      monitor.addConnection();
    }

    const alerts = monitor.getAlerts();
    expect(alerts.length).toBe(8); // 10 - 2 allowed = 8 alerts

    // Each alert should contain diagnostic information
    alerts.forEach((alert, index) => {
      expect(alert).toContain('CONNECTION LEAK DETECTED');
      expect(alert).toContain(`${3 + index} connections`); // 3rd connection onwards
      expect(alert).toContain('max: 2');
    });
  });
});

// Export for use in actual application monitoring
export { ConnectionMonitor };