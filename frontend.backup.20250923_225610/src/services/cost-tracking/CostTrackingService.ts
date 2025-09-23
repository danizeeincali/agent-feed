/**
 * Cost Tracking Service for Claude SDK Analytics
 * Handles token usage monitoring, cost calculation, and budget management
 */

export interface TokenUsageData {
  id: string;
  timestamp: Date;
  provider: 'claude' | 'openai' | 'mcp' | 'claude-flow';
  model: string;
  tokensUsed: number;
  estimatedCost: number;
  requestType: 'chat' | 'completion' | 'tool_use' | 'analysis';
  component?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface CostMetrics {
  totalTokensUsed: number;
  totalCost: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
  averageCostPerToken: number;
  tokensPerMinute: number;
  costTrend: 'increasing' | 'decreasing' | 'stable';
  lastUpdated: Date;
  dailyCost: number;
  weeklyCost: number;
  monthlyCost: number;
}

export interface BudgetAlert {
  level: 'warning' | 'critical' | 'exceeded';
  type: 'daily' | 'weekly' | 'monthly';
  current: number;
  limit: number;
  percentage: number;
  message: string;
  timestamp: Date;
}

export interface BudgetLimits {
  daily: number;
  weekly: number;
  monthly: number;
}

export interface CostTrackingConfig {
  budgetLimits: BudgetLimits;
  alertThresholds: {
    warning: number; // percentage
    critical: number; // percentage
  };
  enableRealTimeTracking: boolean;
  enableAuditing: boolean;
  storageKey?: string;
}

export class CostTrackingService {
  private usageData: TokenUsageData[] = [];
  private config: CostTrackingConfig;
  private eventListeners: Map<string, Function[]> = new Map();
  private storageKey: string;

  // Model cost rates (per 1K tokens)
  private readonly COST_RATES = {
    'claude-3-5-sonnet-20241022': {
      input: 0.003,
      output: 0.015
    },
    'claude-3-haiku-20240307': {
      input: 0.00025,
      output: 0.00125
    },
    'claude-3-opus-20240229': {
      input: 0.015,
      output: 0.075
    },
    'gpt-4-turbo': {
      input: 0.01,
      output: 0.03
    },
    'gpt-3.5-turbo': {
      input: 0.001,
      output: 0.002
    }
  };

  constructor(config: CostTrackingConfig) {
    this.config = config;
    this.storageKey = config.storageKey || 'claude-sdk-cost-tracking';
    this.loadFromStorage();
    this.initializeEventListeners();
  }

  /**
   * Track token usage and calculate costs
   */
  async trackTokenUsage(usage: Omit<TokenUsageData, 'id' | 'timestamp' | 'estimatedCost'>): Promise<void> {
    const estimatedCost = this.calculateCost(usage.model, usage.tokensUsed, usage.requestType);

    const tokenUsage: TokenUsageData = {
      id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      estimatedCost,
      ...usage
    };

    this.usageData.push(tokenUsage);

    // Keep only last 10k entries for performance
    if (this.usageData.length > 10000) {
      this.usageData = this.usageData.slice(-8000);
    }

    if (this.config.enableRealTimeTracking) {
      await this.saveToStorage();
      this.emit('usage-tracked', tokenUsage);
      await this.checkBudgetAlerts();
    }

    if (this.config.enableAuditing) {
      this.auditTokenUsage(tokenUsage);
    }
  }

  /**
   * Calculate cost based on model and usage
   */
  private calculateCost(model: string, tokens: number, requestType: string): number {
    const rates = this.COST_RATES[model as keyof typeof this.COST_RATES];
    if (!rates) {
      // Fallback to Claude Sonnet rates for unknown models
      const fallbackRates = this.COST_RATES['claude-3-5-sonnet-20241022'];
      return (tokens / 1000) * (requestType.includes('output') ? fallbackRates.output : fallbackRates.input);
    }

    const rate = requestType.includes('output') ? rates.output : rates.input;
    return (tokens / 1000) * rate;
  }

  /**
   * Get current cost metrics
   */
  getCostMetrics(timeRange?: { start: Date; end: Date }): CostMetrics {
    let filteredData = this.usageData;

    if (timeRange) {
      filteredData = this.usageData.filter(usage =>
        usage.timestamp >= timeRange.start && usage.timestamp <= timeRange.end
      );
    }

    const totalTokensUsed = filteredData.reduce((sum, usage) => sum + usage.tokensUsed, 0);
    const totalCost = filteredData.reduce((sum, usage) => sum + usage.estimatedCost, 0);

    // Calculate cost by provider
    const costByProvider = filteredData.reduce((acc, usage) => {
      acc[usage.provider] = (acc[usage.provider] || 0) + usage.estimatedCost;
      return acc;
    }, {} as Record<string, number>);

    // Calculate cost by model
    const costByModel = filteredData.reduce((acc, usage) => {
      acc[usage.model] = (acc[usage.model] || 0) + usage.estimatedCost;
      return acc;
    }, {} as Record<string, number>);

    // Calculate tokens per minute
    const timeSpan = filteredData.length > 0
      ? (Math.max(...filteredData.map(u => u.timestamp.getTime())) -
         Math.min(...filteredData.map(u => u.timestamp.getTime()))) / 60000
      : 1;
    const tokensPerMinute = totalTokensUsed / timeSpan;

    // Calculate cost trend
    const costTrend = this.calculateCostTrend(filteredData);

    // Calculate period costs
    const now = new Date();
    const dailyCost = this.getCostForPeriod(now, 1);
    const weeklyCost = this.getCostForPeriod(now, 7);
    const monthlyCost = this.getCostForPeriod(now, 30);

    return {
      totalTokensUsed,
      totalCost,
      costByProvider,
      costByModel,
      averageCostPerToken: totalTokensUsed > 0 ? totalCost / totalTokensUsed : 0,
      tokensPerMinute,
      costTrend,
      lastUpdated: new Date(),
      dailyCost,
      weeklyCost,
      monthlyCost
    };
  }

  /**
   * Calculate cost trend based on recent usage
   */
  private calculateCostTrend(data: TokenUsageData[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 10) return 'stable';

    const sortedData = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const midpoint = Math.floor(sortedData.length / 2);

    const firstHalf = sortedData.slice(0, midpoint);
    const secondHalf = sortedData.slice(midpoint);

    const firstHalfCost = firstHalf.reduce((sum, usage) => sum + usage.estimatedCost, 0);
    const secondHalfCost = secondHalf.reduce((sum, usage) => sum + usage.estimatedCost, 0);

    const firstHalfAvg = firstHalfCost / firstHalf.length;
    const secondHalfAvg = secondHalfCost / secondHalf.length;

    const difference = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

    if (difference > 0.1) return 'increasing';
    if (difference < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Get cost for specific period (days)
   */
  private getCostForPeriod(endDate: Date, days: number): number {
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    return this.usageData
      .filter(usage => usage.timestamp >= startDate && usage.timestamp <= endDate)
      .reduce((sum, usage) => sum + usage.estimatedCost, 0);
  }

  /**
   * Check budget alerts
   */
  private async checkBudgetAlerts(): Promise<void> {
    const metrics = this.getCostMetrics();
    const alerts: BudgetAlert[] = [];

    // Check daily budget
    const dailyPercentage = (metrics.dailyCost / this.config.budgetLimits.daily) * 100;
    if (dailyPercentage >= this.config.alertThresholds.warning) {
      alerts.push({
        level: dailyPercentage >= 100 ? 'exceeded' :
               dailyPercentage >= this.config.alertThresholds.critical ? 'critical' : 'warning',
        type: 'daily',
        current: metrics.dailyCost,
        limit: this.config.budgetLimits.daily,
        percentage: dailyPercentage,
        message: `Daily budget at ${dailyPercentage.toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    // Check weekly budget
    const weeklyPercentage = (metrics.weeklyCost / this.config.budgetLimits.weekly) * 100;
    if (weeklyPercentage >= this.config.alertThresholds.warning) {
      alerts.push({
        level: weeklyPercentage >= 100 ? 'exceeded' :
               weeklyPercentage >= this.config.alertThresholds.critical ? 'critical' : 'warning',
        type: 'weekly',
        current: metrics.weeklyCost,
        limit: this.config.budgetLimits.weekly,
        percentage: weeklyPercentage,
        message: `Weekly budget at ${weeklyPercentage.toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    // Check monthly budget
    const monthlyPercentage = (metrics.monthlyCost / this.config.budgetLimits.monthly) * 100;
    if (monthlyPercentage >= this.config.alertThresholds.warning) {
      alerts.push({
        level: monthlyPercentage >= 100 ? 'exceeded' :
               monthlyPercentage >= this.config.alertThresholds.critical ? 'critical' : 'warning',
        type: 'monthly',
        current: metrics.monthlyCost,
        limit: this.config.budgetLimits.monthly,
        percentage: monthlyPercentage,
        message: `Monthly budget at ${monthlyPercentage.toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    if (alerts.length > 0) {
      this.emit('budget-alerts', alerts);
    }
  }

  /**
   * Get usage data with optional filtering
   */
  getUsageData(filter?: {
    provider?: string;
    model?: string;
    component?: string;
    sessionId?: string;
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }): TokenUsageData[] {
    let filteredData = [...this.usageData];

    if (filter) {
      if (filter.provider) {
        filteredData = filteredData.filter(usage => usage.provider === filter.provider);
      }
      if (filter.model) {
        filteredData = filteredData.filter(usage => usage.model === filter.model);
      }
      if (filter.component) {
        filteredData = filteredData.filter(usage => usage.component === filter.component);
      }
      if (filter.sessionId) {
        filteredData = filteredData.filter(usage => usage.sessionId === filter.sessionId);
      }
      if (filter.timeRange) {
        filteredData = filteredData.filter(usage =>
          usage.timestamp >= filter.timeRange!.start && usage.timestamp <= filter.timeRange!.end
        );
      }
      if (filter.limit) {
        filteredData = filteredData.slice(-filter.limit);
      }
    }

    return filteredData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Export data for reporting
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = this.getUsageData();

    if (format === 'csv') {
      const headers = ['timestamp', 'provider', 'model', 'tokensUsed', 'estimatedCost', 'requestType', 'component'];
      const csvData = [
        headers.join(','),
        ...data.map(usage => [
          usage.timestamp.toISOString(),
          usage.provider,
          usage.model,
          usage.tokensUsed,
          usage.estimatedCost,
          usage.requestType,
          usage.component || ''
        ].join(','))
      ].join('\n');
      return csvData;
    }

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      metrics: this.getCostMetrics(),
      usageData: data
    }, null, 2);
  }

  /**
   * Event listener management
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in cost tracking event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Initialize event listeners
   */
  private initializeEventListeners(): void {
    // Auto-save on usage tracking if enabled
    if (this.config.enableRealTimeTracking) {
      this.on('usage-tracked', () => {
        this.saveToStorage();
      });
    }
  }

  /**
   * Audit token usage
   */
  private auditTokenUsage(usage: TokenUsageData): void {
    console.log(`[AUDIT] Token usage tracked:`, {
      id: usage.id,
      provider: usage.provider,
      model: usage.model,
      tokens: usage.tokensUsed,
      cost: usage.estimatedCost,
      component: usage.component,
      timestamp: usage.timestamp.toISOString()
    });
  }

  /**
   * Storage management
   */
  private async saveToStorage(): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = {
          usageData: this.usageData.slice(-1000), // Keep last 1000 entries in storage
          config: this.config,
          lastSaved: new Date().toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save cost tracking data to storage:', error);
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = localStorage.getItem(this.storageKey);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.usageData) {
            this.usageData = parsed.usageData.map((usage: any) => ({
              ...usage,
              timestamp: new Date(usage.timestamp)
            }));
          }
        }
      } catch (error) {
        console.error('Failed to load cost tracking data from storage:', error);
      }
    }
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.usageData = [];
    this.saveToStorage();
    this.emit('data-cleared', null);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CostTrackingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveToStorage();
    this.emit('config-updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): CostTrackingConfig {
    return { ...this.config };
  }

  /**
   * Destroy service and cleanup
   */
  destroy(): void {
    this.eventListeners.clear();
    this.saveToStorage();
  }
}