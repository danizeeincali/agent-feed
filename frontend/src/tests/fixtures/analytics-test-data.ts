/**
 * Test Fixtures for Analytics Testing
 * Provides consistent test data across all test suites
 */

import { TokenUsageData, CostMetrics, BudgetAlert } from '@/services/cost-tracking/CostTrackingService';

// Base timestamp for consistent test data
const BASE_TIMESTAMP = new Date('2024-01-15T10:00:00Z');

/**
 * Sample token usage data for testing
 */
export const SAMPLE_TOKEN_USAGE: TokenUsageData[] = [
  {
    id: 'usage-001',
    timestamp: new Date(BASE_TIMESTAMP.getTime()),
    provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    tokensUsed: 150,
    estimatedCost: 0.00045,
    requestType: 'chat',
    component: 'AviDirectChatSDK',
    sessionId: 'session-001',
    metadata: { userMessage: 'Hello Claude!' }
  },
  {
    id: 'usage-002',
    timestamp: new Date(BASE_TIMESTAMP.getTime() + 60000), // +1 minute
    provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    tokensUsed: 320,
    estimatedCost: 0.00096,
    requestType: 'chat',
    component: 'AviDirectChatSDK',
    sessionId: 'session-001',
    metadata: { userMessage: 'Can you help me with coding?' }
  },
  {
    id: 'usage-003',
    timestamp: new Date(BASE_TIMESTAMP.getTime() + 120000), // +2 minutes
    provider: 'openai',
    model: 'gpt-4-turbo',
    tokensUsed: 200,
    estimatedCost: 0.002,
    requestType: 'completion',
    component: 'TestComponent',
    sessionId: 'session-002',
    metadata: { userMessage: 'Generate a function' }
  },
  {
    id: 'usage-004',
    timestamp: new Date(BASE_TIMESTAMP.getTime() + 180000), // +3 minutes
    provider: 'claude',
    model: 'claude-3-haiku-20240307',
    tokensUsed: 80,
    estimatedCost: 0.00002,
    requestType: 'analysis',
    component: 'AnalysisComponent',
    sessionId: 'session-003'
  },
  {
    id: 'usage-005',
    timestamp: new Date(BASE_TIMESTAMP.getTime() + 240000), // +4 minutes
    provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    tokensUsed: 450,
    estimatedCost: 0.00135,
    requestType: 'tool_use',
    component: 'AviDirectChatSDK',
    sessionId: 'session-001',
    metadata: { tools: ['Read', 'Write', 'Bash'] }
  }
];

/**
 * Sample cost metrics for testing
 */
export const SAMPLE_COST_METRICS: CostMetrics = {
  totalTokensUsed: 1200,
  totalCost: 0.00458,
  costByProvider: {
    claude: 0.00258,
    openai: 0.002
  },
  costByModel: {
    'claude-3-5-sonnet-20241022': 0.00276,
    'claude-3-haiku-20240307': 0.00002,
    'gpt-4-turbo': 0.002
  },
  averageCostPerToken: 0.00000382,
  tokensPerMinute: 300,
  costTrend: 'increasing',
  lastUpdated: new Date(BASE_TIMESTAMP.getTime() + 300000),
  dailyCost: 0.00458,
  weeklyCost: 0.032,
  monthlyCost: 0.137
};

/**
 * Budget alert samples for testing different alert levels
 */
export const SAMPLE_BUDGET_ALERTS: {
  warning: BudgetAlert;
  critical: BudgetAlert;
  exceeded: BudgetAlert;
} = {
  warning: {
    level: 'warning',
    type: 'daily',
    current: 8.5,
    limit: 10.0,
    percentage: 85.0,
    message: 'Daily budget at 85.0%',
    timestamp: new Date(BASE_TIMESTAMP.getTime() + 360000)
  },
  critical: {
    level: 'critical',
    type: 'weekly',
    current: 47.5,
    limit: 50.0,
    percentage: 95.0,
    message: 'Weekly budget at 95.0%',
    timestamp: new Date(BASE_TIMESTAMP.getTime() + 420000)
  },
  exceeded: {
    level: 'exceeded',
    type: 'monthly',
    current: 205.0,
    limit: 200.0,
    percentage: 102.5,
    message: 'Monthly budget at 102.5%',
    timestamp: new Date(BASE_TIMESTAMP.getTime() + 480000)
  }
};

/**
 * Large dataset for performance testing
 */
export const generateLargeDataset = (size: number): TokenUsageData[] => {
  const providers = ['claude', 'openai', 'mcp', 'claude-flow'] as const;
  const models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
    'claude-3-opus-20240229',
    'gpt-4-turbo',
    'gpt-3.5-turbo'
  ];
  const requestTypes = ['chat', 'completion', 'tool_use', 'analysis'] as const;
  const components = ['AviDirectChatSDK', 'TestComponent', 'AnalysisComponent', 'PerformanceTest'];

  return Array.from({ length: size }, (_, i) => {
    const provider = providers[i % providers.length];
    const model = models[i % models.length];
    const requestType = requestTypes[i % requestTypes.length];
    const component = components[i % components.length];
    const tokensUsed = 50 + (i % 500);

    // Calculate cost based on model
    const costRates = {
      'claude-3-5-sonnet-20241022': 0.003,
      'claude-3-haiku-20240307': 0.00025,
      'claude-3-opus-20240229': 0.015,
      'gpt-4-turbo': 0.01,
      'gpt-3.5-turbo': 0.001
    };

    const rate = costRates[model as keyof typeof costRates] || 0.003;
    const estimatedCost = (tokensUsed / 1000) * rate;

    return {
      id: `generated-${i.toString().padStart(6, '0')}`,
      timestamp: new Date(BASE_TIMESTAMP.getTime() + (i * 30000)), // 30 seconds apart
      provider,
      model,
      tokensUsed,
      estimatedCost,
      requestType,
      component,
      sessionId: `session-${Math.floor(i / 10) + 1}`,
      metadata: {
        index: i,
        batch: Math.floor(i / 100),
        synthetic: true
      }
    };
  });
};

/**
 * Mock API responses for different scenarios
 */
export const MOCK_API_RESPONSES = {
  successfulChat: {
    success: true,
    responses: [{
      content: 'I understand your request. Let me help you with that task.',
      type: 'assistant'
    }],
    usage: {
      prompt_tokens: 45,
      completion_tokens: 25,
      total_tokens: 70
    },
    model: 'claude-3-5-sonnet-20241022',
    costEstimate: 0.00021,
    sessionId: 'test-session-001',
    timestamp: new Date().toISOString(),
    claudeCode: true,
    toolsEnabled: true
  },

  chatWithImages: {
    success: true,
    responses: [{
      content: 'I can see the image you shared. It appears to be a code editor with some JavaScript functions.',
      type: 'assistant'
    }],
    usage: {
      prompt_tokens: 1200, // Higher for image processing
      completion_tokens: 45,
      total_tokens: 1245
    },
    model: 'claude-3-5-sonnet-20241022',
    costEstimate: 0.003735,
    sessionId: 'test-session-images',
    timestamp: new Date().toISOString(),
    claudeCode: true,
    toolsEnabled: true,
    metadata: {
      hasImages: true,
      imageCount: 1
    }
  },

  toolUseResponse: {
    success: true,
    responses: [{
      content: 'I\'ll help you with that. Let me read the file first.',
      type: 'assistant'
    }, {
      content: 'I\'ve analyzed the code. Here are my recommendations...',
      type: 'assistant'
    }],
    usage: {
      prompt_tokens: 150,
      completion_tokens: 320,
      total_tokens: 470
    },
    model: 'claude-3-5-sonnet-20241022',
    costEstimate: 0.00141,
    sessionId: 'test-session-tools',
    timestamp: new Date().toISOString(),
    claudeCode: true,
    toolsEnabled: true,
    metadata: {
      toolsUsed: ['Read', 'Grep'],
      fileOperations: 3
    }
  },

  errorResponse: {
    success: false,
    error: 'Rate limit exceeded',
    details: 'Too many requests. Please try again in 60 seconds.',
    timestamp: new Date().toISOString(),
    claudeCode: false,
    toolsEnabled: false
  },

  networkError: {
    success: false,
    error: 'Network request failed',
    details: 'Unable to connect to Claude Code API',
    timestamp: new Date().toISOString()
  }
};

/**
 * Test configuration presets
 */
export const TEST_CONFIGS = {
  default: {
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
  },

  highBudget: {
    budgetLimits: {
      daily: 100.0,
      weekly: 500.0,
      monthly: 2000.0
    },
    alertThresholds: {
      warning: 75,
      critical: 90
    },
    enableRealTimeTracking: true,
    enableAuditing: true,
    storageKey: 'test-high-budget'
  },

  lowBudget: {
    budgetLimits: {
      daily: 1.0,
      weekly: 5.0,
      monthly: 20.0
    },
    alertThresholds: {
      warning: 85,
      critical: 95
    },
    enableRealTimeTracking: true,
    enableAuditing: false,
    storageKey: 'test-low-budget'
  },

  disabled: {
    budgetLimits: {
      daily: 10.0,
      weekly: 50.0,
      monthly: 200.0
    },
    alertThresholds: {
      warning: 80,
      critical: 95
    },
    enableRealTimeTracking: false,
    enableAuditing: false,
    storageKey: 'test-disabled'
  }
};

/**
 * Time range presets for testing
 */
export const TIME_RANGES = {
  lastHour: {
    start: new Date(Date.now() - 3600000),
    end: new Date()
  },
  last24Hours: {
    start: new Date(Date.now() - 86400000),
    end: new Date()
  },
  lastWeek: {
    start: new Date(Date.now() - 604800000),
    end: new Date()
  },
  lastMonth: {
    start: new Date(Date.now() - 2592000000),
    end: new Date()
  },
  custom: {
    start: BASE_TIMESTAMP,
    end: new Date(BASE_TIMESTAMP.getTime() + 3600000)
  }
};

/**
 * Utility functions for test data generation
 */
export const testDataUtils = {
  /**
   * Create a token usage entry with custom overrides
   */
  createTokenUsage: (overrides: Partial<TokenUsageData> = {}): TokenUsageData => ({
    id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    tokensUsed: 100,
    estimatedCost: 0.0003,
    requestType: 'chat',
    component: 'TestComponent',
    ...overrides
  }),

  /**
   * Create a sequence of token usage entries
   */
  createTokenUsageSequence: (count: number, interval: number = 60000): TokenUsageData[] => {
    return Array.from({ length: count }, (_, i) =>
      testDataUtils.createTokenUsage({
        id: `sequence-${i}`,
        timestamp: new Date(BASE_TIMESTAMP.getTime() + (i * interval)),
        tokensUsed: 50 + (i * 10),
        metadata: { sequenceIndex: i }
      })
    );
  },

  /**
   * Create mock cost metrics with custom values
   */
  createMockMetrics: (overrides: Partial<CostMetrics> = {}): CostMetrics => ({
    ...SAMPLE_COST_METRICS,
    ...overrides
  }),

  /**
   * Create a budget alert with custom values
   */
  createBudgetAlert: (level: 'warning' | 'critical' | 'exceeded', overrides: Partial<BudgetAlert> = {}): BudgetAlert => ({
    ...SAMPLE_BUDGET_ALERTS[level],
    ...overrides
  })
};

/**
 * Mock service responses for different scenarios
 */
export const MOCK_SERVICE_SCENARIOS = {
  normalUsage: {
    usageData: SAMPLE_TOKEN_USAGE.slice(0, 3),
    metrics: SAMPLE_COST_METRICS,
    alerts: []
  },

  highUsage: {
    usageData: generateLargeDataset(100),
    metrics: {
      ...SAMPLE_COST_METRICS,
      totalTokensUsed: 50000,
      totalCost: 15.75,
      costTrend: 'increasing' as const
    },
    alerts: [SAMPLE_BUDGET_ALERTS.warning]
  },

  criticalUsage: {
    usageData: generateLargeDataset(200),
    metrics: {
      ...SAMPLE_COST_METRICS,
      totalTokensUsed: 100000,
      totalCost: 47.5,
      costTrend: 'increasing' as const
    },
    alerts: [SAMPLE_BUDGET_ALERTS.critical]
  },

  exceededBudget: {
    usageData: generateLargeDataset(300),
    metrics: {
      ...SAMPLE_COST_METRICS,
      totalTokensUsed: 150000,
      totalCost: 205.0,
      costTrend: 'increasing' as const
    },
    alerts: [SAMPLE_BUDGET_ALERTS.exceeded]
  },

  emptyData: {
    usageData: [],
    metrics: {
      totalTokensUsed: 0,
      totalCost: 0,
      costByProvider: {},
      costByModel: {},
      averageCostPerToken: 0,
      tokensPerMinute: 0,
      costTrend: 'stable' as const,
      lastUpdated: new Date(),
      dailyCost: 0,
      weeklyCost: 0,
      monthlyCost: 0
    },
    alerts: []
  }
};

/**
 * Performance benchmarks for testing
 */
export const PERFORMANCE_BENCHMARKS = {
  tokenTracking: {
    singleOperation: 10, // ms
    batchOperation: 100, // ms for 100 items
    sustainedRate: 50 // operations per second
  },
  metricsCalculation: {
    smallDataset: 20, // ms for <100 items
    mediumDataset: 50, // ms for <1000 items
    largeDataset: 100 // ms for <10000 items
  },
  rendering: {
    initialLoad: 100, // ms
    chartRender: 200, // ms
    dataUpdate: 50 // ms
  }
};