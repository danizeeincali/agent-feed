import { renderHook, act, waitFor } from '@testing-library/react';

// Import the setup file which includes all mocks
import '../setup';

// Now import the hook after mocks are set up
import { useTokenCostTracking, TokenUsage } from '@/hooks/useTokenCostTracking';
import * as nldLogger from '@/utils/nld-logger';

// Additional localStorage mock for this specific test
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('useTokenCostTracking Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Initialization', () => {
    test('should initialize with default state', async () => {
      const { result } = renderHook(() => useTokenCostTracking());

      expect(result.current.loading).toBe(true);
      expect(result.current.tokenUsages).toEqual([]);
      expect(result.current.metrics).toBeNull();
      expect(result.current.budgetStatus).toBeNull();
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    test('should load historical data from localStorage', async () => {
      const mockUsages = [
        {
          id: 'test-1',
          timestamp: '2024-01-01T10:00:00Z',
          provider: 'claude',
          model: 'claude-3-sonnet',
          tokensUsed: 100,
          estimatedCost: 0.0003,
          requestType: 'completion'
        }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUsages));

      const { result } = renderHook(() => useTokenCostTracking());

      await waitFor(() => {
        expect(result.current.tokenUsages).toHaveLength(1);
        expect(result.current.tokenUsages[0].id).toBe('test-1');
      });
    });
  });

  describe('Token Cost Calculations', () => {
    test('should calculate Claude token costs correctly', () => {
      const { result } = renderHook(() => useTokenCostTracking());

      const cost = result.current.calculateTokenCost('claude', 'claude-3-sonnet', 1000, 500);
      // Expected: (1000 * 0.000003) + (500 * 0.000015) = 0.003 + 0.0075 = 0.0105
      expect(cost).toBe(0.0105);
    });

    test('should calculate OpenAI token costs correctly', () => {
      const { result } = renderHook(() => useTokenCostTracking());

      const cost = result.current.calculateTokenCost('openai', 'gpt-4', 1000, 500);
      // Expected: (1000 * 0.00003) + (500 * 0.00006) = 0.03 + 0.03 = 0.06
      expect(cost).toBe(0.06);
    });

    test('should handle unknown providers gracefully', () => {
      const { result } = renderHook(() => useTokenCostTracking());

      const cost = result.current.calculateTokenCost('unknown', 'model', 1000, 500);
      expect(cost).toBe(0);
      expect(nldLogger.nldLogger.renderFailure).toHaveBeenCalledWith(
        'useTokenCostTracking',
        expect.any(Error),
        { provider: 'unknown', model: 'model' }
      );
    });

    test('should handle unknown models gracefully', () => {
      const { result } = renderHook(() => useTokenCostTracking());

      const cost = result.current.calculateTokenCost('claude', 'unknown-model', 1000, 500);
      expect(cost).toBe(0);
      expect(nldLogger.nldLogger.renderFailure).toHaveBeenCalledWith(
        'useTokenCostTracking',
        expect.any(Error),
        { provider: 'claude', model: 'unknown-model' }
      );
    });
  });

  describe('Token Usage Tracking', () => {
    test('should track new token usage correctly', async () => {
      const { result } = renderHook(() => useTokenCostTracking());

      await act(async () => {
        await result.current.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-sonnet',
          tokensUsed: 100,
          requestType: 'completion',
          component: 'AgentManager'
        });
      });

      await waitFor(() => {
        expect(result.current.tokenUsages).toHaveLength(1);
        const usage = result.current.tokenUsages[0];
        expect(usage.provider).toBe('claude');
        expect(usage.model).toBe('claude-3-sonnet');
        expect(usage.tokensUsed).toBe(100);
        expect(usage.estimatedCost).toBe(0.0003); // 100 * 0.000003
        expect(usage.id).toBeDefined();
        expect(usage.timestamp).toBeInstanceOf(Date);
      });

      expect(nldLogger.nldLogger.renderAttempt).toHaveBeenCalled();
      expect(nldLogger.nldLogger.renderSuccess).toHaveBeenCalled();
    });

    test('should maintain memory limits (max 1000 entries)', async () => {
      const { result } = renderHook(() => useTokenCostTracking());

      // Add 1050 entries
      await act(async () => {
        for (let i = 0; i < 1050; i++) {
          await result.current.trackTokenUsage({
            provider: 'claude',
            model: 'claude-3-sonnet',
            tokensUsed: 10,
            requestType: 'completion',
            component: `test-${i}`
          });
        }
      });

      await waitFor(() => {
        expect(result.current.tokenUsages).toHaveLength(1000);
      });
    });
  });

  describe('Metrics Calculation', () => {
    test('should calculate comprehensive metrics', async () => {
      const { result } = renderHook(() => useTokenCostTracking());

      // Add multiple token usages
      await act(async () => {
        await result.current.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-sonnet',
          tokensUsed: 100,
          requestType: 'completion'
        });
        await result.current.trackTokenUsage({
          provider: 'openai',
          model: 'gpt-4',
          tokensUsed: 200,
          requestType: 'completion'
        });
        await result.current.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-haiku',
          tokensUsed: 300,
          requestType: 'completion'
        });
      });

      await waitFor(() => {
        expect(result.current.metrics).not.toBeNull();
      });

      const metrics = result.current.metrics!;
      expect(metrics.totalTokensUsed).toBe(600); // 100 + 200 + 300
      expect(metrics.totalCost).toBeGreaterThan(0);
      expect(metrics.costByProvider).toHaveProperty('claude');
      expect(metrics.costByProvider).toHaveProperty('openai');
      expect(metrics.costByModel).toHaveProperty('claude-3-sonnet');
      expect(metrics.costByModel).toHaveProperty('gpt-4');
      expect(metrics.costByModel).toHaveProperty('claude-3-haiku');
      expect(metrics.averageCostPerToken).toBeGreaterThan(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(metrics.costTrend);
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
    });

    test('should handle empty token usages', async () => {
      const { result } = renderHook(() => useTokenCostTracking());

      await waitFor(() => {
        expect(result.current.metrics).toBeNull();
      });
    });
  });

  describe('Budget Management', () => {
    test('should calculate budget status with limits', async () => {
      const budgetLimits = {
        daily: 1.0,
        weekly: 5.0,
        monthly: 20.0
      };

      const { result } = renderHook(() => 
        useTokenCostTracking({ budgetLimits })
      );

      // Add usage that exceeds daily budget
      await act(async () => {
        await result.current.trackTokenUsage({
          provider: 'openai',
          model: 'gpt-4',
          tokensUsed: 2000, // This will cost $0.06 for input, exceeding daily budget
          requestType: 'completion'
        });
      });

      await waitFor(() => {
        expect(result.current.budgetStatus).not.toBeNull();
      });

      const budgetStatus = result.current.budgetStatus!;
      expect(budgetStatus.dailyBudget).toBe(1.0);
      expect(budgetStatus.weeklyBudget).toBe(5.0);
      expect(budgetStatus.monthlyBudget).toBe(20.0);
      expect(budgetStatus.dailyUsed).toBeGreaterThan(0);
      expect(budgetStatus.alertLevel).toBeDefined();
      expect(budgetStatus.projectedDailyCost).toBeGreaterThan(0);
      expect(budgetStatus.projectedMonthlyCost).toBeGreaterThan(0);
    });

    test('should determine correct alert levels', async () => {
      const budgetLimits = {
        daily: 0.01, // Very low budget for testing
      };

      const { result } = renderHook(() => 
        useTokenCostTracking({ budgetLimits })
      );

      // Add usage that exceeds budget
      await act(async () => {
        await result.current.trackTokenUsage({
          provider: 'openai',
          model: 'gpt-4',
          tokensUsed: 1000, // This costs $0.03, exceeding $0.01 budget
          requestType: 'completion'
        });
      });

      await waitFor(() => {
        expect(result.current.budgetStatus?.alertLevel).toBe('exceeded');
      });
    });
  });

  describe('Memory Leak Prevention', () => {
    test('should cleanup subscriptions on unmount', () => {
      const { unmount } = renderHook(() => useTokenCostTracking());
      
      // Should not throw and should cleanup properly
      expect(() => unmount()).not.toThrow();
    });

    test('should persist data to localStorage', async () => {
      const { result } = renderHook(() => useTokenCostTracking());

      await act(async () => {
        await result.current.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-sonnet',
          tokensUsed: 100,
          requestType: 'completion'
        });
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'tokenUsages',
          expect.any(String)
        );
      });
    });

    test('should handle localStorage quota exceeded gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useTokenCostTracking());

      await act(async () => {
        await result.current.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-sonnet',
          tokensUsed: 100,
          requestType: 'completion'
        });
      });

      // Should handle error gracefully
      expect(nldLogger.nldLogger.renderFailure).toHaveBeenCalledWith(
        'useTokenCostTracking',
        expect.any(Error),
        { action: 'localStorage' }
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle tracking errors gracefully', async () => {
      const { result } = renderHook(() => useTokenCostTracking());

      // Mock an error in cost calculation
      const originalCalculateTokenCost = result.current.calculateTokenCost;
      jest.spyOn(result.current, 'calculateTokenCost').mockImplementation(() => {
        throw new Error('Calculation error');
      });

      await act(async () => {
        await result.current.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-sonnet',
          tokensUsed: 100,
          requestType: 'completion'
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
      });

      expect(nldLogger.nldLogger.renderFailure).toHaveBeenCalled();
    });

    test('should handle fetch errors during initialization', async () => {
      // Mock fetch to throw error
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTokenCostTracking());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should handle error gracefully and not crash
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('Performance Optimization', () => {
    test('should debounce metrics calculation', async () => {
      const { result } = renderHook(() => useTokenCostTracking());

      // Add multiple usages quickly
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          await result.current.trackTokenUsage({
            provider: 'claude',
            model: 'claude-3-sonnet',
            tokensUsed: 10,
            requestType: 'completion'
          });
        }
      });

      // Metrics should be calculated after debounce
      await waitFor(() => {
        expect(result.current.metrics).not.toBeNull();
        expect(result.current.metrics?.totalTokensUsed).toBe(50);
      }, { timeout: 1000 });
    });

    test('should maintain performance with high-frequency updates', async () => {
      const { result } = renderHook(() => useTokenCostTracking());

      const startTime = performance.now();

      // Simulate high-frequency updates
      await act(async () => {
        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(result.current.trackTokenUsage({
            provider: 'claude',
            model: 'claude-3-sonnet',
            tokensUsed: 10,
            requestType: 'completion'
          }));
        }
        await Promise.all(promises);
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(executionTime).toBeLessThan(1000);

      await waitFor(() => {
        expect(result.current.tokenUsages).toHaveLength(100);
        expect(result.current.metrics?.totalTokensUsed).toBe(1000);
      });
    });
  });
});