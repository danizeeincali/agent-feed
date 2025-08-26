/**
 * NLD Alert System
 * 
 * This module provides real-time alerts for critical pattern detection
 * including desktop notifications, console warnings, and UI notifications.
 */

import { NLTRecord, NLDPattern } from './nld-core-monitor';
import { NLDLoggingSystem } from './nld-logging-system';

export interface AlertConfig {
  enabled: boolean;
  severity: NLDPattern['severity'][];
  categories: NLDPattern['category'][];
  channels: AlertChannel[];
  throttleTime: number; // Minimum time between alerts for same pattern
  batchTime: number; // Time to batch multiple alerts
}

export interface AlertChannel {
  type: 'console' | 'notification' | 'ui' | 'sound' | 'webhook';
  enabled: boolean;
  config: Record<string, any>;
}

export interface Alert {
  id: string;
  timestamp: Date;
  severity: NLDPattern['severity'];
  category: NLDPattern['category'];
  pattern: string;
  message: string;
  details: NLTRecord;
  acknowledged: boolean;
  channel: string;
}

/**
 * NLD Alert System for Real-Time Notifications
 */
export class NLDAlertSystem {
  private config: AlertConfig;
  private alerts: Alert[] = [];
  private throttleMap: Map<string, number> = new Map();
  private batchQueue: NLTRecord[] = [];
  private batchTimer?: number;
  private loggingSystem: NLDLoggingSystem;
  private alertCallbacks: Map<string, (alert: Alert) => void> = new Map();

  constructor(loggingSystem: NLDLoggingSystem) {
    this.loggingSystem = loggingSystem;
    this.config = this.getDefaultConfig();
    this.initializeNotificationPermission();
  }

  /**
   * Get default alert configuration
   */
  private getDefaultConfig(): AlertConfig {
    return {
      enabled: true,
      severity: ['critical', 'high', 'medium', 'low'],
      categories: ['white-screen', 'websocket', 'memory-leak', 'race-condition', 'performance'],
      channels: [
        {
          type: 'console',
          enabled: true,
          config: { 
            colors: {
              critical: '#ff0000',
              high: '#ff6600', 
              medium: '#ffaa00',
              low: '#00aa00'
            }
          }
        },
        {
          type: 'notification',
          enabled: true,
          config: {
            icon: '🧠',
            requireInteraction: false,
            silent: false
          }
        },
        {
          type: 'ui',
          enabled: true,
          config: {
            position: 'top-right',
            duration: 5000,
            showClose: true
          }
        },
        {
          type: 'sound',
          enabled: false,
          config: {
            volume: 0.3,
            sounds: {
              critical: 'error',
              high: 'warning',
              medium: 'info',
              low: 'success'
            }
          }
        }
      ],
      throttleTime: 30000, // 30 seconds
      batchTime: 5000 // 5 seconds
    };
  }

  /**
   * Initialize notification permission
   */
  private async initializeNotificationPermission(): Promise<void> {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      } catch (error) {
        console.warn('Failed to request notification permission:', error);
      }
    }
  }

  /**
   * Configure alert system
   */
  public configure(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('NLD Alert System configured:', this.config);
  }

  /**
   * Process a pattern detection for alerting
   */
  public processPattern(record: NLTRecord): void {
    if (!this.shouldAlert(record)) {
      return;
    }

    // Check throttling
    const throttleKey = `${record.pattern.id}-${record.pattern.category}`;
    const lastAlert = this.throttleMap.get(throttleKey) || 0;
    const now = Date.now();

    if (now - lastAlert < this.config.throttleTime) {
      return; // Throttled
    }

    this.throttleMap.set(throttleKey, now);

    // Add to batch queue
    this.batchQueue.push(record);

    // Set up batch processing if not already running
    if (!this.batchTimer) {
      this.batchTimer = window.setTimeout(() => {
        this.processBatchedAlerts();
      }, this.config.batchTime);
    }

    // For critical alerts, process immediately
    if (record.pattern.severity === 'critical') {
      this.createAlert(record);
    }
  }

  /**
   * Check if a pattern should trigger an alert
   */
  private shouldAlert(record: NLTRecord): boolean {
    if (!this.config.enabled) return false;
    if (!this.config.severity.includes(record.pattern.severity)) return false;
    if (!this.config.categories.includes(record.pattern.category)) return false;
    
    return true;
  }

  /**
   * Process batched alerts
   */
  private processBatchedAlerts(): void {
    if (this.batchQueue.length === 0) {
      this.batchTimer = undefined;
      return;
    }

    // Group by pattern type
    const grouped = this.batchQueue.reduce((acc, record) => {
      const key = `${record.pattern.id}-${record.pattern.severity}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(record);
      return acc;
    }, {} as Record<string, NLTRecord[]>);

    // Create alerts for each group
    Object.values(grouped).forEach(records => {
      if (records.length === 1) {
        this.createAlert(records[0]);
      } else {
        this.createBatchAlert(records);
      }
    });

    // Clear batch queue
    this.batchQueue = [];
    this.batchTimer = undefined;
  }

  /**
   * Create a single alert
   */
  private createAlert(record: NLTRecord): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity: record.pattern.severity,
      category: record.pattern.category,
      pattern: record.pattern.pattern,
      message: this.generateAlertMessage(record),
      details: record,
      acknowledged: false,
      channel: 'multiple'
    };

    this.alerts.push(alert);
    this.sendAlert(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Create a batched alert for multiple similar patterns
   */
  private createBatchAlert(records: NLTRecord[]): void {
    const firstRecord = records[0];
    const alert: Alert = {
      id: `batch-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity: firstRecord.pattern.severity,
      category: firstRecord.pattern.category,
      pattern: firstRecord.pattern.pattern,
      message: `${records.length} instances of ${firstRecord.pattern.pattern} detected`,
      details: firstRecord, // Use first record as representative
      acknowledged: false,
      channel: 'batch'
    };

    this.alerts.push(alert);
    this.sendAlert(alert);
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(record: NLTRecord): string {
    const severityEmojis = {
      critical: '🚨',
      high: '⚠️',
      medium: '💡',
      low: 'ℹ️'
    };

    const categoryEmojis = {
      'white-screen': '🖥️',
      'websocket': '🔌',
      'memory-leak': '💾',
      'race-condition': '⚡',
      'performance': '🐌',
      'temporal-dead-zone': '⏰'
    };

    const emoji = severityEmojis[record.pattern.severity];
    const categoryEmoji = categoryEmojis[record.pattern.category] || '🔍';

    return `${emoji} ${categoryEmoji} ${record.pattern.pattern}: ${record.failureMode}`;
  }

  /**
   * Send alert through configured channels
   */
  private sendAlert(alert: Alert): void {
    this.config.channels.forEach(channel => {
      if (!channel.enabled) return;

      try {
        switch (channel.type) {
          case 'console':
            this.sendConsoleAlert(alert, channel.config);
            break;
          case 'notification':
            this.sendNotificationAlert(alert, channel.config);
            break;
          case 'ui':
            this.sendUIAlert(alert, channel.config);
            break;
          case 'sound':
            this.sendSoundAlert(alert, channel.config);
            break;
          case 'webhook':
            this.sendWebhookAlert(alert, channel.config);
            break;
        }
      } catch (error) {
        console.error(`Failed to send ${channel.type} alert:`, error);
      }
    });

    // Trigger callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Alert callback error:', error);
      }
    });
  }

  /**
   * Send console alert
   */
  private sendConsoleAlert(alert: Alert, config: any): void {
    const color = config.colors?.[alert.severity] || '#333';
    const style = `color: ${color}; font-weight: bold; font-size: 14px;`;
    
    console.groupCollapsed(`%c🧠 NLD Alert: ${alert.message}`, style);
    console.log('Severity:', alert.severity);
    console.log('Category:', alert.category);
    console.log('Pattern:', alert.pattern);
    console.log('Time:', alert.timestamp.toLocaleTimeString());
    console.log('Details:', alert.details);
    if (alert.details.context.stackTrace) {
      console.log('Stack Trace:', alert.details.context.stackTrace);
    }
    console.groupEnd();
  }

  /**
   * Send desktop notification alert
   */
  private sendNotificationAlert(alert: Alert, config: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`NLD Alert: ${alert.pattern}`, {
        body: alert.message,
        icon: config.icon || '🧠',
        tag: `nld-${alert.category}`, // Prevents duplicate notifications
        requireInteraction: config.requireInteraction || false,
        silent: config.silent || false,
        data: {
          alertId: alert.id,
          pattern: alert.pattern,
          severity: alert.severity
        }
      });

      notification.onclick = () => {
        window.focus();
        this.acknowledgeAlert(alert.id);
        notification.close();
      };

      // Auto-close after 5 seconds for non-critical alerts
      if (alert.severity !== 'critical') {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    }
  }

  /**
   * Send UI alert (dispatch custom event for UI components to handle)
   */
  private sendUIAlert(alert: Alert, config: any): void {
    window.dispatchEvent(new CustomEvent('nld-ui-alert', {
      detail: {
        alert,
        config
      }
    }));
  }

  /**
   * Send sound alert
   */
  private sendSoundAlert(alert: Alert, config: any): void {
    if (!('Audio' in window)) return;

    const soundMap = {
      error: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXLTp66hVFApGn+T...',
      warning: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXLTp66hVFApGn+T...',
      info: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXLTp66hVFApGn+T...',
      success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXLTp66hVFApGn+T...'
    };

    const soundType = config.sounds?.[alert.severity] || 'info';
    const soundData = soundMap[soundType as keyof typeof soundMap];

    if (soundData) {
      const audio = new Audio(soundData);
      audio.volume = config.volume || 0.3;
      audio.play().catch(error => {
        console.warn('Failed to play alert sound:', error);
      });
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert, config: any): Promise<void> {
    if (!config.url) return;

    const payload = {
      alert: {
        id: alert.id,
        timestamp: alert.timestamp.toISOString(),
        severity: alert.severity,
        category: alert.category,
        pattern: alert.pattern,
        message: alert.message
      },
      context: {
        component: alert.details.context.component,
        url: alert.details.context.url,
        userAgent: alert.details.context.userAgent,
        networkState: alert.details.context.networkState
      },
      failureMode: alert.details.failureMode,
      recovered: alert.details.recovered,
      effectiveness: alert.details.effectiveness
    };

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers || {})
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn('Webhook alert failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('Failed to send webhook alert:', error);
    }
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log(`Alert acknowledged: ${alert.message}`);
    }
  }

  /**
   * Acknowledge all alerts
   */
  public acknowledgeAll(): void {
    this.alerts.forEach(alert => {
      alert.acknowledged = true;
    });
    console.log('All alerts acknowledged');
  }

  /**
   * Get unacknowledged alerts
   */
  public getUnacknowledgedAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Get all alerts
   */
  public getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  /**
   * Get alerts by severity
   */
  public getAlertsBySeverity(severity: NLDPattern['severity']): Alert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Get alerts by category
   */
  public getAlertsByCategory(category: NLDPattern['category']): Alert[] {
    return this.alerts.filter(alert => alert.category === category);
  }

  /**
   * Clear all alerts
   */
  public clearAlerts(): void {
    this.alerts = [];
    this.throttleMap.clear();
    console.log('All alerts cleared');
  }

  /**
   * Register alert callback
   */
  public onAlert(id: string, callback: (alert: Alert) => void): void {
    this.alertCallbacks.set(id, callback);
  }

  /**
   * Remove alert callback
   */
  public offAlert(id: string): void {
    this.alertCallbacks.delete(id);
  }

  /**
   * Get alert statistics
   */
  public getAlertStats(): {
    total: number;
    unacknowledged: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    recentAlerts: number; // Last hour
  } {
    const total = this.alerts.length;
    const unacknowledged = this.alerts.filter(a => !a.acknowledged).length;
    const oneHourAgo = Date.now() - 3600000;
    const recentAlerts = this.alerts.filter(a => a.timestamp.getTime() > oneHourAgo).length;

    const bySeverity = this.alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = this.alerts.reduce((acc, alert) => {
      acc[alert.category] = (acc[alert.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      unacknowledged,
      bySeverity,
      byCategory,
      recentAlerts
    };
  }

  /**
   * Export alert data
   */
  public exportAlerts(): {
    alerts: Alert[];
    config: AlertConfig;
    stats: ReturnType<typeof this.getAlertStats>;
    exportTime: string;
  } {
    return {
      alerts: this.alerts,
      config: this.config,
      stats: this.getAlertStats(),
      exportTime: new Date().toISOString()
    };
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    
    this.alerts = [];
    this.throttleMap.clear();
    this.batchQueue = [];
    this.alertCallbacks.clear();
  }
}

export default NLDAlertSystem;