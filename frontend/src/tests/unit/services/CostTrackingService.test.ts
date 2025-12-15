/**
 * Unit Tests for Cost Tracking Service
 * Comprehensive test suite covering all functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { CostTrackingService, TokenUsageData, CostTrackingConfig, BudgetAlert } from '@/services/cost-tracking/CostTrackingService';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('CostTrackingService', () => {
  let service: CostTrackingService;
  let config: CostTrackingConfig;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);

    // Default configuration
    config = {
      budgetLimits: {
        daily: 10.0,
        weekly: 50.0,
        monthly: 200.0
      },
      alertThresholds: {
        warning: 80,
        critical: 95
      },
      enableRealTimeTracking: true,
      enableAuditing: false,
      storageKey: 'test-cost-tracking'
    };

    service = new CostTrackingService(config);
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with provided configuration', () => {
      expect(service.getConfig()).toEqual(config);
    });

    it('should load data from localStorage if available', () => {
      const mockData = {
        usageData: [{
          id: 'test-1',
          timestamp: new Date().toISOString(),
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 100,
          estimatedCost: 0.003,
          requestType: 'chat'
        }],
        config: config,
        lastSaved: new Date().toISOString()
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));

      const newService = new CostTrackingService(config);
      const usageData = newService.getUsageData();

      expect(usageData).toHaveLength(1);
      expect(usageData[0].id).toBe('test-1');
      expect(usageData[0].timestamp).toBeInstanceOf(Date);

      newService.destroy();
    });
  });

  describe('Token Usage Tracking', () => {
    it('should track token usage correctly', async () => {
      const usage = {
        provider: 'claude' as const,
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 100,
        requestType: 'chat' as const,
        component: 'AviDirectChatSDK'
      };

      await service.trackTokenUsage(usage);

      const usageData = service.getUsageData();
      expect(usageData).toHaveLength(1);
      expect(usageData[0].tokensUsed).toBe(100);
      expect(usageData[0].provider).toBe('claude');
      expect(usageData[0].estimatedCost).toBeCloseTo(0.0003, 6); // 100 tokens * 0.003 / 1000
    });

    it('should calculate cost correctly for different models', async () => {
      const testCases = [
        {
          model: 'claude-3-5-sonnet-20241022',
          tokens: 1000,
          requestType: 'chat',
          expectedCost: 0.003 // 1000 tokens * 0.003 / 1000
        },
        {
          model: 'claude-3-haiku-20240307',
          tokens: 1000,
          requestType: 'completion',
          expectedCost: 0.00025 // 1000 tokens * 0.00025 / 1000
        },
        {
          model: 'gpt-4-turbo',
          tokens: 1000,
          requestType: 'output',
          expectedCost: 0.03 // 1000 tokens * 0.03 / 1000 (output rate)
        }
      ];

      for (const testCase of testCases) {
        await service.trackTokenUsage({
          provider: 'claude',
          model: testCase.model,
          tokensUsed: testCase.tokens,
          requestType: testCase.requestType
        });
      }

      const usageData = service.getUsageData();
      expect(usageData).toHaveLength(3);

      usageData.forEach((usage, index) => {
        expect(usage.estimatedCost).toBeCloseTo(testCases[2 - index].expectedCost, 6);
      });
    });

    it('should use fallback rates for unknown models', async () => {
      await service.trackTokenUsage({
        provider: 'claude',
        model: 'unknown-model',
        tokensUsed: 1000,
        requestType: 'chat'
      });

      const usageData = service.getUsageData();
      expect(usageData[0].estimatedCost).toBeCloseTo(0.003, 6); // Fallback to Claude Sonnet rates
    });

    it('should emit usage-tracked event', async () => {
      const eventCallback = vi.fn();
      service.on('usage-tracked', eventCallback);

      await service.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 100,
        requestType: 'chat'
      });

      expect(eventCallback).toHaveBeenCalledOnce();
      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          tokensUsed: 100,
          provider: 'claude'
        })
      );
    });

    it('should maintain maximum storage limit', async () => {
      // Add more than 10k entries
      for (let i = 0; i < 10001; i++) {
        await service.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 1,
          requestType: 'chat'
        });
      }

      const usageData = service.getUsageData();
      expect(usageData.length).toBeLessThanOrEqual(8000);
    });
  });

  describe('Cost Metrics Calculation', () => {
    beforeEach(async () => {
      // Add sample data
      const sampleData = [
        {
          provider: 'claude' as const,
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 1000,
          requestType: 'chat' as const,
          component: 'AviDirectChatSDK'
        },
        {
          provider: 'openai' as const,
          model: 'gpt-4-turbo',
          tokensUsed: 500,
          requestType: 'completion' as const,
          component: 'TestComponent'
        }
      ];

      for (const data of sampleData) {
        await service.trackTokenUsage(data);
      }
    });

    it('should calculate total tokens and cost correctly', () => {
      const metrics = service.getCostMetrics();

      expect(metrics.totalTokensUsed).toBe(1500);
      expect(metrics.totalCost).toBeCloseTo(0.008, 6); // 0.003 + 0.005
      expect(metrics.averageCostPerToken).toBeCloseTo(0.008 / 1500, 8);
    });

    it('should calculate cost by provider', () => {
      const metrics = service.getCostMetrics();

      expect(metrics.costByProvider.claude).toBeCloseTo(0.003, 6);
      expect(metrics.costByProvider.openai).toBeCloseTo(0.005, 6);
    });

    it('should calculate cost by model', () => {
      const metrics = service.getCostMetrics();

      expect(metrics.costByModel['claude-3-5-sonnet-20241022']).toBeCloseTo(0.003, 6);
      expect(metrics.costByModel['gpt-4-turbo']).toBeCloseTo(0.005, 6);
    });

    it('should calculate metrics for specific time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const metrics = service.getCostMetrics({
        start: oneHourAgo,
        end: now
      });

      expect(metrics.totalTokensUsed).toBe(1500);
    });

    it('should calculate cost trend correctly', async () => {
      // Add more data to establish a trend
      for (let i = 0; i < 20; i++) {
        await service.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 1000 + (i * 100), // Increasing usage
          requestType: 'chat'
        });
      }

      const metrics = service.getCostMetrics();
      expect(metrics.costTrend).toBe('increasing');
    });
  });

  describe('Budget Alerts', () => {
    it('should trigger budget alerts when thresholds are exceeded', async () => {
      const alertCallback = vi.fn();
      service.on('budget-alerts', alertCallback);

      // Add usage that exceeds 80% of daily budget (8.0 out of 10.0)
      await service.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 2666666, // Should cost around 8.0
        requestType: 'chat'
      });

      expect(alertCallback).toHaveBeenCalledOnce();
      const alerts: BudgetAlert[] = alertCallback.mock.calls[0][0];
      expect(alerts).toHaveLength(1);
      expect(alerts[0].level).toBe('warning');
      expect(alerts[0].type).toBe('daily');
      expect(alerts[0].percentage).toBeGreaterThan(80);
    });

    it('should trigger critical alert at 95% threshold', async () => {
      const alertCallback = vi.fn();
      service.on('budget-alerts', alertCallback);

      // Add usage that exceeds 95% of daily budget
      await service.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 3166666, // Should cost around 9.5
        requestType: 'chat'
      });

      const alerts: BudgetAlert[] = alertCallback.mock.calls[0][0];
      expect(alerts[0].level).toBe('critical');
    });

    it('should trigger exceeded alert at 100% threshold', async () => {
      const alertCallback = vi.fn();
      service.on('budget-alerts', alertCallback);

      // Add usage that exceeds 100% of daily budget
      await service.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 3333334, // Should cost around 10.0+
        requestType: 'chat'
      });

      const alerts: BudgetAlert[] = alertCallback.mock.calls[0][0];
      expect(alerts[0].level).toBe('exceeded');
    });
  });

  describe('Data Filtering and Querying', () => {
    beforeEach(async () => {
      const sampleData = [
        {
          provider: 'claude' as const,
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 100,
          requestType: 'chat' as const,
          component: 'AviDirectChatSDK',
          sessionId: 'session-1'
        },
        {
          provider: 'openai' as const,
          model: 'gpt-4-turbo',
          tokensUsed: 200,
          requestType: 'completion' as const,
          component: 'TestComponent',
          sessionId: 'session-2'
        },
        {
          provider: 'claude' as const,
          model: 'claude-3-haiku-20240307',
          tokensUsed: 150,
          requestType: 'analysis' as const,
          component: 'AviDirectChatSDK',
          sessionId: 'session-1'
        }
      ];

      for (const data of sampleData) {
        await service.trackTokenUsage(data);
      }
    });

    it('should filter by provider', () => {
      const claudeData = service.getUsageData({ provider: 'claude' });
      expect(claudeData).toHaveLength(2);
      expect(claudeData.every(usage => usage.provider === 'claude')).toBe(true);
    });

    it('should filter by model', () => {
      const sonnetData = service.getUsageData({ model: 'claude-3-5-sonnet-20241022' });
      expect(sonnetData).toHaveLength(1);
      expect(sonnetData[0].model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should filter by component', () => {
      const aviData = service.getUsageData({ component: 'AviDirectChatSDK' });
      expect(aviData).toHaveLength(2);
      expect(aviData.every(usage => usage.component === 'AviDirectChatSDK')).toBe(true);
    });

    it('should filter by session ID', () => {
      const session1Data = service.getUsageData({ sessionId: 'session-1' });
      expect(session1Data).toHaveLength(2);
      expect(session1Data.every(usage => usage.sessionId === 'session-1')).toBe(true);
    });

    it('should limit results', () => {
      const limitedData = service.getUsageData({ limit: 2 });
      expect(limitedData).toHaveLength(2);
    });

    it('should filter by time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const recentData = service.getUsageData({
        timeRange: { start: oneHourAgo, end: now }
      });

      expect(recentData).toHaveLength(3);
    });

    it('should combine multiple filters', () => {
      const filteredData = service.getUsageData({
        provider: 'claude',
        component: 'AviDirectChatSDK',
        limit: 1
      });

      expect(filteredData).toHaveLength(1);
      expect(filteredData[0].provider).toBe('claude');
      expect(filteredData[0].component).toBe('AviDirectChatSDK');
    });
  });

  describe('Data Export', () => {
    beforeEach(async () => {
      await service.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 100,
        requestType: 'chat',
        component: 'AviDirectChatSDK'
      });
    });

    it('should export data as JSON', () => {
      const exported = service.exportData('json');
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('exportDate');
      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('usageData');
      expect(parsed.usageData).toHaveLength(1);
    });

    it('should export data as CSV', () => {
      const exported = service.exportData('csv');
      const lines = exported.split('\n');

      expect(lines[0]).toContain('timestamp,provider,model,tokensUsed,estimatedCost');
      expect(lines[1]).toContain('claude,claude-3-5-sonnet-20241022,100');
    });
  });

  describe('Event Management', () => {
    it('should register and trigger event listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      service.on('test-event', callback1);
      service.on('test-event', callback2);

      // Manually emit event for testing
      (service as any).emit('test-event', { test: 'data' });

      expect(callback1).toHaveBeenCalledWith({ test: 'data' });
      expect(callback2).toHaveBeenCalledWith({ test: 'data' });
    });

    it('should remove event listeners', () => {
      const callback = vi.fn();

      service.on('test-event', callback);
      service.off('test-event', callback);

      (service as any).emit('test-event', { test: 'data' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle errors in event listeners gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.on('test-event', errorCallback);
      service.on('test-event', normalCallback);

      (service as any).emit('test-event', { test: 'data' });

      expect(consoleSpy).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Storage Management', () => {
    it('should save data to localStorage when real-time tracking is enabled', async () => {
      await service.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 100,
        requestType: 'chat'
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-cost-tracking',
        expect.stringContaining('"usageData"')
      );
    });

    it('should handle storage errors gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await service.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 100,
        requestType: 'chat'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save cost tracking data to storage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        budgetLimits: {
          daily: 20.0,
          weekly: 100.0,
          monthly: 400.0
        }
      };

      service.updateConfig(newConfig);
      const updatedConfig = service.getConfig();

      expect(updatedConfig.budgetLimits.daily).toBe(20.0);
      expect(updatedConfig.alertThresholds.warning).toBe(80); // Should preserve existing values
    });

    it('should emit config-updated event', () => {
      const callback = vi.fn();
      service.on('config-updated', callback);

      const newConfig = { enableAuditing: true };
      service.updateConfig(newConfig);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ enableAuditing: true })
      );
    });
  });

  describe('Data Management', () => {
    it('should clear all data', async () => {
      await service.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 100,
        requestType: 'chat'
      });

      expect(service.getUsageData()).toHaveLength(1);

      const callback = vi.fn();
      service.on('data-cleared', callback);

      service.clearData();

      expect(service.getUsageData()).toHaveLength(0);
      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe('Auditing', () => {
    it('should log audit information when enabled', async () => {
      const auditConfig = { ...config, enableAuditing: true };
      const auditService = new CostTrackingService(auditConfig);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await auditService.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 100,
        requestType: 'chat',
        component: 'AviDirectChatSDK'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AUDIT] Token usage tracked:',
        expect.objectContaining({
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokens: 100,
          component: 'AviDirectChatSDK'
        })
      );

      consoleSpy.mockRestore();
      auditService.destroy();
    });
  });

  describe('Service Lifecycle', () => {
    it('should destroy service and cleanup resources', () => {
      const callback = vi.fn();
      service.on('test-event', callback);

      service.destroy();

      // Event listeners should be cleared
      (service as any).emit('test-event', { test: 'data' });
      expect(callback).not.toHaveBeenCalled();

      // Should save data to storage on destroy
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });
});