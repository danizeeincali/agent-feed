/**
 * Real-time Cost Monitoring Service
 *
 * Provides real-time monitoring, alerting, and analytics for Claude Code SDK costs
 */

import { EventEmitter } from 'events';
import { CostTracker, CostSession, TokenUsage } from './CostTracker';

export interface MonitoringConfig {
  alerting: {
    costThresholds: {
      warning: number;
      critical: number;
      emergency: number;
    };
    tokenThresholds: {
      warning: number;
      critical: number;
      emergency: number;
    };
    timeWindows: {
      minute: number;
      hour: number;
      day: number;
    };
  };
  notifications: {
    webhooks: string[];
    emailRecipients: string[];
    slackChannels: string[];
  };
  sampling: {
    metricsInterval: number; // milliseconds
    aggregationWindow: number; // milliseconds
  };
}

export interface AlertEvent {
  id: string;
  type: 'cost' | 'token' | 'rate' | 'session' | 'system';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  description: string;
  sessionId?: string;
  userId?: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MetricsSnapshot {
  timestamp: Date;
  costs: {
    totalToday: number;
    totalThisHour: number;
    totalThisMinute: number;
    averagePerSession: number;
    averagePerStep: number;
  };
  tokens: {
    totalToday: TokenUsage;
    totalThisHour: TokenUsage;
    totalThisMinute: TokenUsage;
    averagePerSession: TokenUsage;
    averagePerStep: TokenUsage;
  };
  sessions: {
    active: number;
    completed: number;
    failed: number;
    totalToday: number;
  };
  performance: {
    averageStepDuration: number;
    errorRate: number;
    retryRate: number;
  };
  topConsumers: {
    byUser: Array<{ userId: string; cost: number; tokens: number }>;
    bySession: Array<{ sessionId: string; cost: number; tokens: number }>;
    byTool: Array<{ tool: string; cost: number; tokens: number; usage: number }>;
  };
}

export class CostMonitoringService extends EventEmitter {
  private costTracker: CostTracker;
  private config: MonitoringConfig;
  private metricsHistory: MetricsSnapshot[] = [];
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private metricsInterval?: NodeJS.Timeout;

  constructor(costTracker: CostTracker, config: Partial<MonitoringConfig> = {}) {
    super();

    this.costTracker = costTracker;
    this.config = {
      alerting: {
        costThresholds: {
          warning: 50.00,
          critical: 100.00,
          emergency: 200.00
        },
        tokenThresholds: {
          warning: 100000,
          critical: 500000,
          emergency: 1000000
        },
        timeWindows: {
          minute: 60 * 1000,
          hour: 60 * 60 * 1000,
          day: 24 * 60 * 60 * 1000
        }
      },
      notifications: {
        webhooks: [],
        emailRecipients: [],
        slackChannels: []
      },
      sampling: {
        metricsInterval: 10000, // 10 seconds
        aggregationWindow: 300000 // 5 minutes
      },
      ...config
    };

    this.setupEventListeners();
    this.startMonitoring();
  }

  private setupEventListeners(): void {
    // Listen to cost tracker events
    this.costTracker.on('stepTracked', (stepUsage) => {
      this.checkStepThresholds(stepUsage);
    });

    this.costTracker.on('sessionStarted', (session) => {
      this.emit('sessionStarted', session);
    });

    this.costTracker.on('sessionEnded', (session) => {
      this.checkSessionThresholds(session);
      this.emit('sessionEnded', session);
    });

    this.costTracker.on('alert', (alert) => {
      this.handleAlert(alert);
    });
  }

  private startMonitoring(): void {
    // Collect metrics at regular intervals
    this.metricsInterval = setInterval(() => {
      this.collectMetrics().catch(console.error);
    }, this.config.sampling.metricsInterval);
  }

  private async collectMetrics(): Promise<MetricsSnapshot> {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

    try {
      // Get usage analytics for different time windows
      const [dailyAnalytics, hourlyAnalytics, minuteAnalytics] = await Promise.all([
        this.costTracker.getUsageAnalytics({ startDate: dayStart, granularity: 'day' }),
        this.costTracker.getUsageAnalytics({ startDate: hourStart, granularity: 'hour' }),
        this.costTracker.getUsageAnalytics({ startDate: minuteStart, granularity: 'hour' })
      ]);

      // Get top consumers
      const [topUserConsumers, topSessionConsumers, topToolConsumers] = await Promise.all([
        this.costTracker.getTopCostConsumers({ groupBy: 'user', startDate: dayStart, limit: 5 }),
        this.costTracker.getTopCostConsumers({ groupBy: 'session', startDate: dayStart, limit: 5 }),
        this.costTracker.getTopCostConsumers({ groupBy: 'tool', startDate: dayStart, limit: 5 })
      ]);

      // Get real-time metrics
      const realTimeMetrics = this.costTracker.getRealTimeMetrics();

      // Aggregate data
      const dailyData = dailyAnalytics[0] || this.getEmptyAnalytics();
      const hourlyData = hourlyAnalytics[0] || this.getEmptyAnalytics();
      const minuteData = minuteAnalytics[0] || this.getEmptyAnalytics();

      const snapshot: MetricsSnapshot = {
        timestamp: now,
        costs: {
          totalToday: dailyData.total_cost || 0,
          totalThisHour: hourlyData.total_cost || 0,
          totalThisMinute: minuteData.total_cost || 0,
          averagePerSession: dailyData.step_count ? (dailyData.total_cost / dailyData.step_count) : 0,
          averagePerStep: dailyData.avg_cost_per_step || 0
        },
        tokens: {
          totalToday: {
            inputTokens: dailyData.total_input_tokens || 0,
            outputTokens: dailyData.total_output_tokens || 0,
            totalTokens: (dailyData.total_input_tokens || 0) + (dailyData.total_output_tokens || 0),
            cacheCreationTokens: dailyData.total_cache_creation_tokens || 0,
            cacheReadTokens: dailyData.total_cache_read_tokens || 0
          },
          totalThisHour: {
            inputTokens: hourlyData.total_input_tokens || 0,
            outputTokens: hourlyData.total_output_tokens || 0,
            totalTokens: (hourlyData.total_input_tokens || 0) + (hourlyData.total_output_tokens || 0),
            cacheCreationTokens: hourlyData.total_cache_creation_tokens || 0,
            cacheReadTokens: hourlyData.total_cache_read_tokens || 0
          },
          totalThisMinute: {
            inputTokens: minuteData.total_input_tokens || 0,
            outputTokens: minuteData.total_output_tokens || 0,
            totalTokens: (minuteData.total_input_tokens || 0) + (minuteData.total_output_tokens || 0),
            cacheCreationTokens: minuteData.total_cache_creation_tokens || 0,
            cacheReadTokens: minuteData.total_cache_read_tokens || 0
          },
          averagePerSession: {
            inputTokens: dailyData.step_count ? (dailyData.total_input_tokens || 0) / dailyData.step_count : 0,
            outputTokens: dailyData.step_count ? (dailyData.total_output_tokens || 0) / dailyData.step_count : 0,
            totalTokens: dailyData.step_count ? ((dailyData.total_input_tokens || 0) + (dailyData.total_output_tokens || 0)) / dailyData.step_count : 0,
            cacheCreationTokens: dailyData.step_count ? (dailyData.total_cache_creation_tokens || 0) / dailyData.step_count : 0,
            cacheReadTokens: dailyData.step_count ? (dailyData.total_cache_read_tokens || 0) / dailyData.step_count : 0
          },
          averagePerStep: {
            inputTokens: (dailyData.total_input_tokens || 0) / Math.max(dailyData.step_count, 1),
            outputTokens: (dailyData.total_output_tokens || 0) / Math.max(dailyData.step_count, 1),
            totalTokens: ((dailyData.total_input_tokens || 0) + (dailyData.total_output_tokens || 0)) / Math.max(dailyData.step_count, 1),
            cacheCreationTokens: (dailyData.total_cache_creation_tokens || 0) / Math.max(dailyData.step_count, 1),
            cacheReadTokens: (dailyData.total_cache_read_tokens || 0) / Math.max(dailyData.step_count, 1)
          }
        },
        sessions: {
          active: realTimeMetrics.activeSessions,
          completed: 0, // Would need to query database for this
          failed: 0,    // Would need to query database for this
          totalToday: dailyData.step_count || 0
        },
        performance: {
          averageStepDuration: 0, // Would calculate from step durations
          errorRate: 0,          // Would calculate from failed steps
          retryRate: realTimeMetrics.retryQueueSize / Math.max(dailyData.step_count, 1)
        },
        topConsumers: {
          byUser: topUserConsumers.map(u => ({
            userId: u.identifier,
            cost: u.total_cost,
            tokens: u.total_tokens
          })),
          bySession: topSessionConsumers.map(s => ({
            sessionId: s.identifier,
            cost: s.total_cost,
            tokens: s.total_tokens
          })),
          byTool: topToolConsumers.map(t => ({
            tool: t.identifier,
            cost: t.total_cost,
            tokens: t.total_tokens,
            usage: t.step_count
          }))
        }
      };

      // Store in history (keep only last hour of data)
      this.metricsHistory.push(snapshot);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > oneHourAgo);

      // Check thresholds
      this.checkMetricsThresholds(snapshot);

      // Emit metrics update
      this.emit('metricsUpdate', snapshot);

      return snapshot;

    } catch (error) {
      console.error('Error collecting metrics:', error);
      throw error;
    }
  }

  private getEmptyAnalytics() {
    return {
      step_count: 0,
      total_cost: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cache_creation_tokens: 0,
      total_cache_read_tokens: 0,
      avg_cost_per_step: 0
    };
  }

  private checkMetricsThresholds(snapshot: MetricsSnapshot): void {
    const { costs, tokens } = snapshot;
    const { costThresholds, tokenThresholds } = this.config.alerting;

    // Check cost thresholds
    this.checkThreshold('cost_hourly', costs.totalThisHour, costThresholds, {
      title: 'Hourly Cost Threshold Exceeded',
      description: `Hourly cost of $${costs.totalThisHour.toFixed(2)} has exceeded threshold`,
      metadata: { timeWindow: 'hour', snapshot }
    });

    this.checkThreshold('cost_daily', costs.totalToday, costThresholds, {
      title: 'Daily Cost Threshold Exceeded',
      description: `Daily cost of $${costs.totalToday.toFixed(2)} has exceeded threshold`,
      metadata: { timeWindow: 'day', snapshot }
    });

    // Check token thresholds
    this.checkThreshold('tokens_hourly', tokens.totalThisHour.totalTokens, tokenThresholds, {
      title: 'Hourly Token Threshold Exceeded',
      description: `Hourly token usage of ${tokens.totalThisHour.totalTokens.toLocaleString()} has exceeded threshold`,
      metadata: { timeWindow: 'hour', snapshot }
    });

    this.checkThreshold('tokens_daily', tokens.totalToday.totalTokens, tokenThresholds, {
      title: 'Daily Token Threshold Exceeded',
      description: `Daily token usage of ${tokens.totalToday.totalTokens.toLocaleString()} has exceeded threshold`,
      metadata: { timeWindow: 'day', snapshot }
    });
  }

  private checkThreshold(
    alertId: string,
    currentValue: number,
    thresholds: { warning: number; critical: number; emergency: number },
    alertInfo: Partial<AlertEvent>
  ): void {
    let severity: AlertEvent['severity'] | null = null;
    let threshold = 0;

    if (currentValue >= thresholds.emergency) {
      severity = 'emergency';
      threshold = thresholds.emergency;
    } else if (currentValue >= thresholds.critical) {
      severity = 'critical';
      threshold = thresholds.critical;
    } else if (currentValue >= thresholds.warning) {
      severity = 'warning';
      threshold = thresholds.warning;
    }

    if (severity) {
      const alert: AlertEvent = {
        id: alertId,
        type: 'cost',
        severity,
        threshold,
        currentValue,
        timestamp: new Date(),
        ...alertInfo
      } as AlertEvent;

      this.createAlert(alert);
    } else {
      // Clear alert if value is below thresholds
      this.clearAlert(alertId);
    }
  }

  private checkStepThresholds(stepUsage: any): void {
    // Check for unusually high step costs
    if (stepUsage.cost > 1.00) { // $1 per step is quite high
      this.createAlert({
        id: `high_step_cost_${stepUsage.stepId}`,
        type: 'cost',
        severity: 'warning',
        title: 'High Step Cost Detected',
        description: `Step ${stepUsage.stepId} cost $${stepUsage.cost.toFixed(4)}`,
        sessionId: stepUsage.sessionId,
        userId: stepUsage.userId,
        threshold: 1.00,
        currentValue: stepUsage.cost,
        timestamp: new Date(),
        metadata: { stepUsage }
      });
    }

    // Check for unusually high token usage
    if (stepUsage.tokens.totalTokens > 10000) {
      this.createAlert({
        id: `high_step_tokens_${stepUsage.stepId}`,
        type: 'token',
        severity: 'info',
        title: 'High Step Token Usage',
        description: `Step ${stepUsage.stepId} used ${stepUsage.tokens.totalTokens.toLocaleString()} tokens`,
        sessionId: stepUsage.sessionId,
        userId: stepUsage.userId,
        threshold: 10000,
        currentValue: stepUsage.tokens.totalTokens,
        timestamp: new Date(),
        metadata: { stepUsage }
      });
    }
  }

  private checkSessionThresholds(sessionInfo: any): void {
    const session = this.costTracker.getSessionCost(sessionInfo.sessionId);
    if (!session) return;

    // Check session total cost
    if (session.totalCost > 10.00) {
      this.createAlert({
        id: `high_session_cost_${session.sessionId}`,
        type: 'session',
        severity: session.totalCost > 50.00 ? 'critical' : 'warning',
        title: 'High Session Cost',
        description: `Session ${session.sessionId} total cost: $${session.totalCost.toFixed(2)}`,
        sessionId: session.sessionId,
        userId: session.userId,
        threshold: 10.00,
        currentValue: session.totalCost,
        timestamp: new Date(),
        metadata: { session }
      });
    }

    // Check session duration
    if (session.endTime && session.startTime) {
      const durationHours = (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
      if (durationHours > 2) { // Sessions longer than 2 hours
        this.createAlert({
          id: `long_session_${session.sessionId}`,
          type: 'session',
          severity: 'info',
          title: 'Long Running Session',
          description: `Session ${session.sessionId} ran for ${durationHours.toFixed(1)} hours`,
          sessionId: session.sessionId,
          userId: session.userId,
          threshold: 2,
          currentValue: durationHours,
          timestamp: new Date(),
          metadata: { session }
        });
      }
    }
  }

  private createAlert(alert: AlertEvent): void {
    const existingAlert = this.activeAlerts.get(alert.id);

    // Don't spam the same alert
    if (existingAlert && existingAlert.severity === alert.severity) {
      return;
    }

    this.activeAlerts.set(alert.id, alert);
    this.emit('alert', alert);

    // Send notifications
    this.sendNotifications(alert);

    console.log(`Alert created: ${alert.severity.toUpperCase()} - ${alert.title}`);
  }

  private clearAlert(alertId: string): void {
    if (this.activeAlerts.has(alertId)) {
      const alert = this.activeAlerts.get(alertId)!;
      this.activeAlerts.delete(alertId);
      this.emit('alertCleared', alert);
      console.log(`Alert cleared: ${alert.title}`);
    }
  }

  private handleAlert(alert: any): void {
    // Handle alerts from cost tracker
    this.createAlert({
      id: `tracker_${alert.type}_${Date.now()}`,
      type: alert.type === 'session_cost_threshold' ? 'session' : 'cost',
      severity: 'warning',
      title: `Cost Tracker Alert: ${alert.type}`,
      description: JSON.stringify(alert),
      sessionId: alert.sessionId,
      userId: alert.userId,
      threshold: alert.threshold,
      currentValue: alert.currentCost,
      timestamp: new Date(),
      metadata: alert
    });
  }

  private async sendNotifications(alert: AlertEvent): Promise<void> {
    // Send webhook notifications
    for (const webhookUrl of this.config.notifications.webhooks) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert,
            timestamp: alert.timestamp.toISOString(),
            service: 'claude-code-cost-tracker'
          })
        });

        if (!response.ok) {
          console.error(`Webhook notification failed: ${response.status}`);
        }
      } catch (error) {
        console.error('Webhook notification error:', error);
      }
    }

    // Email and Slack notifications would be implemented here
    // For now, just log them
    if (this.config.notifications.emailRecipients.length > 0) {
      console.log(`Would send email to: ${this.config.notifications.emailRecipients.join(', ')}`);
    }

    if (this.config.notifications.slackChannels.length > 0) {
      console.log(`Would send Slack message to: ${this.config.notifications.slackChannels.join(', ')}`);
    }
  }

  // Public API methods

  public getCurrentMetrics(): MetricsSnapshot | null {
    return this.metricsHistory.length > 0 ? this.metricsHistory[this.metricsHistory.length - 1] : null;
  }

  public getMetricsHistory(timeRange?: { start: Date; end: Date }): MetricsSnapshot[] {
    if (!timeRange) return this.metricsHistory;

    return this.metricsHistory.filter(m =>
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  public getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  public getAlertHistory(limit = 100): AlertEvent[] {
    // In a real implementation, this would query a database
    return Array.from(this.activeAlerts.values()).slice(-limit);
  }

  public updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  public generateReport(timeRange: { start: Date; end: Date }) {
    const metrics = this.getMetricsHistory(timeRange);

    if (metrics.length === 0) {
      return null;
    }

    const totalCost = metrics.reduce((sum, m) => sum + m.costs.totalToday, 0);
    const totalTokens = metrics.reduce((sum, m) => sum + m.tokens.totalToday.totalTokens, 0);
    const totalSessions = metrics.reduce((sum, m) => sum + m.sessions.totalToday, 0);

    return {
      timeRange,
      summary: {
        totalCost,
        totalTokens,
        totalSessions,
        averageCostPerSession: totalSessions > 0 ? totalCost / totalSessions : 0,
        averageTokensPerSession: totalSessions > 0 ? totalTokens / totalSessions : 0
      },
      trends: {
        costTrend: this.calculateTrend(metrics.map(m => m.costs.totalToday)),
        tokenTrend: this.calculateTrend(metrics.map(m => m.tokens.totalToday.totalTokens))
      },
      alerts: this.getAlertHistory().filter(a =>
        a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
      ),
      topConsumers: metrics.length > 0 ? metrics[metrics.length - 1].topConsumers : null
    };
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  public stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.removeAllListeners();
  }
}