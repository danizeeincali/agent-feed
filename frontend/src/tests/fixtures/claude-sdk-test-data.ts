/**
 * Test Data Fixtures for Claude SDK Analytics E2E Tests
 * Provides realistic data for comprehensive testing scenarios
 */

export interface TestCostMetrics {
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

export interface TestAnalyticsData {
  costMetrics: TestCostMetrics;
  realTimeData: {
    activeConnections: number;
    messagesPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
  chartData: Array<{
    timestamp: string;
    tokens: number;
    cost: number;
    requests: number;
    provider?: string;
  }>;
}

// Sample token usage data for testing
export const SAMPLE_TOKEN_USAGE = {
  claude: {
    'claude-3-5-sonnet-20241022': 45600,
    'claude-3-haiku-20240307': 12800,
    'claude-3-opus-20240229': 8900
  },
  openai: {
    'gpt-4-turbo': 15600,
    'gpt-3.5-turbo': 32100
  }
};

// Sample cost metrics for testing
export const SAMPLE_COST_METRICS: TestCostMetrics = {
  totalTokensUsed: 125840,
  totalCost: 2.4567,
  costByProvider: {
    claude: 2.1890,
    openai: 0.2677
  },
  costByModel: {
    'claude-3-5-sonnet-20241022': 1.8234,
    'claude-3-haiku-20240307': 0.3656,
    'gpt-4-turbo': 0.2677
  },
  averageCostPerToken: 0.0000195,
  tokensPerMinute: 245.6,
  costTrend: 'increasing',
  lastUpdated: new Date(),
  dailyCost: 0.8456,
  weeklyCost: 5.2345,
  monthlyCost: 18.5678
};

// Mock API responses for different scenarios
export const MOCK_API_RESPONSES = {
  successfulChat: {
    success: true,
    data: {
      response: 'This is a test response from Claude SDK',
      usage: {
        input_tokens: 150,
        output_tokens: 89,
        total_tokens: 239
      },
      cost: 0.0047,
      model: 'claude-3-5-sonnet-20241022',
      timestamp: new Date().toISOString()
    }
  },

  errorResponse: {
    success: false,
    error: 'API_LIMIT_EXCEEDED',
    message: 'Monthly usage limit exceeded',
    code: 429
  },

  costAnalytics: {
    success: true,
    data: SAMPLE_COST_METRICS
  },

  realTimeUpdates: {
    success: true,
    data: {
      activeConnections: 3,
      messagesPerSecond: 2.4,
      averageResponseTime: 1200,
      errorRate: 0.02,
      timestamp: new Date().toISOString()
    }
  }
};

// Generate large dataset for performance testing
export function generateLargeDataset(size: number = 1000) {
  const providers = ['claude', 'openai', 'anthropic'];
  const models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
    'gpt-4-turbo',
    'gpt-3.5-turbo'
  ];

  return Array.from({ length: size }, (_, i) => ({
    id: i,
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
    tokens: Math.floor(50 + Math.random() * 500),
    cost: Number((0.001 + Math.random() * 0.05).toFixed(6)),
    provider: providers[i % providers.length],
    model: models[i % models.length],
    requestType: i % 3 === 0 ? 'chat' : i % 3 === 1 ? 'completion' : 'embedding',
    responseTime: Math.floor(800 + Math.random() * 2000),
    success: Math.random() > 0.05, // 95% success rate
    userId: `user_${Math.floor(i / 10)}`,
    sessionId: `session_${Math.floor(i / 5)}`
  }));
}

// Test scenarios for different edge cases
export const TEST_SCENARIOS = {
  highUsage: {
    ...SAMPLE_COST_METRICS,
    totalCost: 150.75,
    dailyCost: 25.50,
    costTrend: 'increasing' as const,
    budgetAlert: {
      level: 'critical',
      message: 'Daily budget exceeded by 40%',
      percentage: 140
    }
  },

  lowUsage: {
    ...SAMPLE_COST_METRICS,
    totalCost: 0.15,
    dailyCost: 0.05,
    totalTokensUsed: 1200,
    costTrend: 'stable' as const
  },

  errorState: {
    error: true,
    message: 'Unable to fetch analytics data',
    code: 'ANALYTICS_SERVICE_DOWN',
    retryAfter: 300
  },

  emptyState: {
    ...SAMPLE_COST_METRICS,
    totalCost: 0,
    totalTokensUsed: 0,
    dailyCost: 0,
    weeklyCost: 0,
    monthlyCost: 0
  }
};

// Chart data generators
export const chartDataGenerators = {
  // Generate hourly data for last 24 hours
  hourly: (hours: number = 24) => {
    return Array.from({ length: hours }, (_, i) => ({
      timestamp: new Date(Date.now() - (hours - 1 - i) * 3600000).toISOString(),
      tokens: Math.floor(100 + Math.random() * 400),
      cost: Number((0.005 + Math.random() * 0.03).toFixed(6)),
      requests: Math.floor(5 + Math.random() * 25),
      errors: Math.floor(Math.random() * 3),
      provider: i % 2 === 0 ? 'claude' : 'openai'
    }));
  },

  // Generate daily data for last 30 days
  daily: (days: number = 30) => {
    return Array.from({ length: days }, (_, i) => ({
      timestamp: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString(),
      tokens: Math.floor(2000 + Math.random() * 8000),
      cost: Number((0.1 + Math.random() * 0.5).toFixed(4)),
      requests: Math.floor(50 + Math.random() * 200),
      errors: Math.floor(Math.random() * 10),
      uniqueUsers: Math.floor(5 + Math.random() * 20)
    }));
  },

  // Generate real-time data points
  realTime: () => ({
    timestamp: new Date().toISOString(),
    activeConnections: Math.floor(1 + Math.random() * 10),
    messagesPerSecond: Number((0.5 + Math.random() * 4).toFixed(2)),
    averageResponseTime: Math.floor(800 + Math.random() * 1500),
    errorRate: Number((Math.random() * 0.1).toFixed(4)),
    memoryUsage: Number((50 + Math.random() * 40).toFixed(2)),
    cpuUsage: Number((20 + Math.random() * 60).toFixed(2))
  })
};

// Export format test data
export const EXPORT_TEST_DATA = {
  json: {
    format: 'json',
    expectedMimeType: 'application/json',
    expectedExtension: '.json'
  },
  csv: {
    format: 'csv',
    expectedMimeType: 'text/csv',
    expectedExtension: '.csv'
  },
  xlsx: {
    format: 'xlsx',
    expectedMimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    expectedExtension: '.xlsx'
  },
  pdf: {
    format: 'pdf',
    expectedMimeType: 'application/pdf',
    expectedExtension: '.pdf'
  }
};

// Utility functions for test data
export const testDataUtils = {
  // Generate realistic cost progression over time
  generateCostProgression: (days: number = 30, startingCost: number = 0.1) => {
    let currentCost = startingCost;
    const progression = [];

    for (let i = 0; i < days; i++) {
      // Simulate realistic cost variations (slight upward trend with daily fluctuations)
      const dailyVariation = (Math.random() - 0.5) * 0.02; // ±1% daily variation
      const trendIncrease = 0.001; // Small upward trend

      currentCost += (currentCost * dailyVariation) + trendIncrease;

      progression.push({
        date: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().split('T')[0],
        cost: Number(Math.max(0, currentCost).toFixed(6)),
        tokens: Math.floor(currentCost * 10000 + Math.random() * 1000),
        requests: Math.floor(currentCost * 500 + Math.random() * 100)
      });
    }

    return progression;
  },

  // Generate provider distribution data
  generateProviderDistribution: () => {
    const total = 100;
    const claudePercentage = 60 + Math.random() * 20; // 60-80%
    const openaiPercentage = 100 - claudePercentage;

    return {
      claude: Number(claudePercentage.toFixed(1)),
      openai: Number(openaiPercentage.toFixed(1))
    };
  },

  // Generate model usage breakdown
  generateModelBreakdown: () => {
    return {
      'claude-3-5-sonnet-20241022': 45 + Math.random() * 20,
      'claude-3-haiku-20240307': 15 + Math.random() * 15,
      'claude-3-opus-20240229': 5 + Math.random() * 10,
      'gpt-4-turbo': 10 + Math.random() * 15,
      'gpt-3.5-turbo': 15 + Math.random() * 20
    };
  },

  // Validate test data structure
  validateAnalyticsData: (data: any): boolean => {
    const requiredFields = ['costMetrics', 'realTimeData', 'chartData'];
    return requiredFields.every(field => field in data);
  },

  // Generate random but realistic response times
  generateResponseTimes: (count: number = 100) => {
    return Array.from({ length: count }, () => {
      // Log-normal distribution for realistic response times
      const mu = 7; // ln(1100ms) ≈ 7
      const sigma = 0.5;
      const normal = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
      return Math.max(200, Math.floor(Math.exp(mu + sigma * normal)));
    });
  }
};

export default {
  SAMPLE_TOKEN_USAGE,
  SAMPLE_COST_METRICS,
  MOCK_API_RESPONSES,
  TEST_SCENARIOS,
  EXPORT_TEST_DATA,
  generateLargeDataset,
  chartDataGenerators,
  testDataUtils
};