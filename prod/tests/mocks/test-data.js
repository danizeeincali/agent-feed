/**
 * Test Data Fixtures - TDD London School
 * Comprehensive test data for behavior verification
 */

// User Data Fixtures
const mockUserData = {
  minimal: {
    title: 'Basic task',
    priority: 'P3'
  },
  
  complete: {
    title: 'Complete project analysis',
    description: 'Analyze market trends and competitive landscape',
    priority: 'P1',
    impact_score: 8,
    business_context: 'Strategic planning for Q2 product launch',
    completion_criteria: 'Report delivered with actionable insights',
    tags: ['analysis', 'market-research', 'strategy'],
    estimated_hours: 16,
    due_date: '2023-12-31',
    department: 'Product Management',
    stakeholders: ['CEO', 'Product Team', 'Marketing']
  },
  
  meetingPrep: {
    purpose: 'Quarterly business review',
    topics: ['Revenue performance', 'Market expansion', 'Team growth'],
    expected_outcomes: 'Strategic decisions for next quarter',
    participants: ['Executive team', 'Department heads'],
    duration: 120,
    agenda: {
      purpose: 'Review Q3 performance and plan Q4 strategy',
      topics: ['Financial results', 'Market analysis', 'Resource planning'],
      outcomes: 'Approved budget and strategic initiatives'
    }
  },
  
  followUp: {
    status: 'In Progress',
    progress: 'Completed initial research phase',
    blockers: ['Waiting for market data', 'Resource allocation pending'],
    next_steps: ['Finalize analysis', 'Present findings', 'Get stakeholder approval'],
    completion_percentage: 60
  },
  
  agentIdea: {
    problem: 'Manual data entry is time-consuming and error-prone',
    solution: 'Automated data extraction and validation system',
    value: 'Save 20 hours/week and reduce errors by 95%',
    implementation: 'Python script with ML validation, 2-week timeline'
  }
};

// Context Data Fixtures
const mockContextData = {
  minimal: {},
  
  withHistory: {
    sessionHistory: [
      {
        type: 'post',
        content: 'Previous post about project planning',
        timestamp: '2023-01-01T10:00:00Z',
        engagement: 0.75
      }
    ],
    userPreferences: {
      tone: 'professional',
      length: 'medium',
      includeMetrics: true
    }
  },
  
  businessContext: {
    businessContext: 'Product launch preparation',
    currentProjects: ['Market Research', 'Competitive Analysis'],
    teamContext: {
      department: 'Product',
      teamSize: 8,
      currentSprint: 'Sprint 23'
    },
    organizationalGoals: ['Increase market share', 'Improve efficiency']
  },
  
  sharedContext: {
    patterns: new Map([
      ['professional_tone', 5],
      ['action_oriented', 3],
      ['data_driven', 2]
    ]),
    insights: [
      {
        type: 'high_quality_pattern',
        pattern: ['clear_structure', 'specific_metrics'],
        score: 0.92
      }
    ]
  }
};

// Expected Output Fixtures
const mockOutputs = {
  highQualityPost: {
    content: 'High-quality generated post with clear structure and actionable content',
    metadata: {
      qualityScore: 0.92,
      impactScore: 0.85,
      engagementPrediction: {
        score: 0.88,
        factors: ['clarity', 'relevance', 'action_orientation'],
        confidence: 0.91
      },
      patterns: ['professional_tone', 'clear_structure', 'actionable_content'],
      contextSources: ['user_data', 'business_context', 'session_history'],
      generatedAt: '2023-01-01T12:00:00.000Z',
      framework: 'PostingIntelligenceFramework',
      version: '1.0.0'
    },
    analytics: {
      processingTime: 245,
      optimizationSteps: 4,
      qualityBreakdown: {
        clarity: 0.95,
        structure: 0.90,
        relevance: 0.92,
        engagement: 0.88
      },
      impactFactors: {
        revenue: 0.80,
        efficiency: 0.90,
        strategic: 0.85,
        risk: 0.70,
        innovation: 0.75
      }
    },
    recommendations: []
  },
  
  lowQualityPost: {
    content: 'Basic post with minimal structure',
    metadata: {
      qualityScore: 0.55,
      impactScore: 0.45,
      engagementPrediction: {
        score: 0.52,
        factors: ['basic_content'],
        confidence: 0.60
      },
      patterns: ['basic_structure'],
      contextSources: ['user_data'],
      generatedAt: '2023-01-01T12:00:00.000Z',
      framework: 'PostingIntelligenceFramework',
      version: '1.0.0'
    },
    analytics: {
      processingTime: 120,
      optimizationSteps: 1,
      qualityBreakdown: {
        clarity: 0.60,
        structure: 0.50,
        relevance: 0.55,
        engagement: 0.50
      },
      impactFactors: {
        revenue: 0.30,
        efficiency: 0.50,
        strategic: 0.40,
        risk: 0.60,
        innovation: 0.35
      }
    },
    recommendations: [
      {
        type: 'quality',
        message: 'Consider revising content for better clarity and structure',
        priority: 'high',
        suggestions: ['Add clear headings', 'Include specific examples']
      },
      {
        type: 'impact',
        message: 'Content could benefit from stronger business relevance',
        priority: 'medium',
        suggestions: ['Connect to business objectives', 'Add measurable outcomes']
      }
    ]
  },
  
  batchResults: {
    posts: [
      // Reference to highQualityPost and lowQualityPost
    ],
    batchAnalytics: {
      totalPosts: 2,
      averageQuality: 0.735,
      averageImpact: 0.65,
      successfulPatterns: [
        {
          type: 'professional_tone',
          usage: 2,
          averageQuality: 0.735,
          effectiveness: 'high'
        },
        {
          type: 'clear_structure',
          usage: 1,
          averageQuality: 0.92,
          effectiveness: 'high'
        }
      ],
      processingTime: 365
    },
    sharedInsights: [
      {
        type: 'high_quality_pattern',
        pattern: ['professional_tone', 'clear_structure', 'actionable_content'],
        score: 0.92
      }
    ]
  }
};

// Error Scenarios
const mockErrors = {
  postingIntelligenceError: {
    name: 'PostingIntelligenceError',
    message: 'Failed to generate intelligent post',
    cause: new Error('Template engine failed')
  },
  
  validationError: {
    name: 'ValidationError',
    message: 'Invalid user data provided',
    details: {
      field: 'agentType',
      expected: 'string',
      received: 'undefined'
    }
  },
  
  timeoutError: {
    name: 'TimeoutError',
    message: 'Operation timed out after 30 seconds',
    timeout: 30000
  }
};

// Performance Test Data
const performanceData = {
  bulkRequests: {
    small: 10,
    medium: 50,
    large: 100
  },
  
  loadTestScenarios: [
    {
      name: 'normal_load',
      requestsPerSecond: 10,
      duration: 60,
      expectedLatency: 500
    },
    {
      name: 'peak_load',
      requestsPerSecond: 50,
      duration: 120,
      expectedLatency: 1000
    },
    {
      name: 'stress_load',
      requestsPerSecond: 100,
      duration: 60,
      expectedLatency: 2000
    }
  ],
  
  throughputTargets: {
    postsPerMinute: 100,
    maxLatency: 2000,
    errorRate: 0.01,
    cpuUtilization: 0.80
  }
};

// Database Test Data
const databaseFixtures = {
  agentPosts: [
    {
      id: 1,
      agent_type: 'personal-todos',
      content: 'Test post content',
      metadata: JSON.stringify({ quality: 0.8 }),
      user_id: 'user-123',
      created_at: '2023-01-01T12:00:00Z',
      updated_at: '2023-01-01T12:00:00Z'
    }
  ],
  
  feedIntelligence: [
    {
      id: 1,
      post_id: 1,
      engagement_score: 0.75,
      reach_count: 1000,
      interaction_count: 75,
      analysis: JSON.stringify({ insights: [] }),
      created_at: '2023-01-01T12:30:00Z'
    }
  ],
  
  performanceMetrics: [
    {
      id: 1,
      operation_type: 'post_generation',
      duration_ms: 250,
      success: true,
      metadata: JSON.stringify({ steps: 4 }),
      created_at: '2023-01-01T12:00:00Z'
    }
  ]
};

module.exports = {
  mockUserData,
  mockContextData,
  mockOutputs,
  mockErrors,
  performanceData,
  databaseFixtures
};