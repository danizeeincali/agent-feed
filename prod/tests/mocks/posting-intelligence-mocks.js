/**
 * Posting Intelligence System Mocks
 * TDD London School - Mock-Driven Development
 */

const { LondonSchoolUtils } = require('../utils/test-setup');

/**
 * Mock Factory for Posting Intelligence Components
 */
class PostingIntelligenceMockFactory {
  /**
   * Create mock for PostingIntelligenceAPI
   */
  static createPostingIntelligenceAPIMock(config = {}) {
    const defaultBehavior = {
      generateIntelligentPost: jest.fn().mockResolvedValue({
        content: 'Generated intelligent post content',
        metadata: {
          qualityScore: 0.85,
          impactScore: 0.78,
          engagementPrediction: 0.82,
          patterns: [],
          contextSources: [],
          generatedAt: new Date().toISOString(),
          framework: 'PostingIntelligenceFramework',
          version: '1.0.0'
        },
        analytics: {
          processingTime: 245,
          optimizationSteps: 5,
          qualityBreakdown: {},
          impactFactors: {}
        },
        recommendations: []
      }),
      
      batchGeneratePosts: jest.fn().mockResolvedValue({
        batchId: 'batch_123',
        results: [],
        analytics: { totalPosts: 0, successRate: 1.0 },
        processingTime: 100
      }),
      
      assessContentQuality: jest.fn().mockResolvedValue({
        overallScore: 0.8,
        breakdown: {
          clarity: 0.85,
          structure: 0.78,
          relevance: 0.82
        },
        improvements: []
      }),
      
      optimizeForEngagement: jest.fn().mockResolvedValue({
        optimizedContent: 'Optimized content',
        engagementScore: 0.9,
        optimizations: []
      }),
      
      enhanceWithPatterns: jest.fn().mockResolvedValue({
        enhancedContent: 'Pattern-enhanced content',
        appliedPatterns: [],
        confidence: 0.85
      }),
      
      integrateContext: jest.fn().mockResolvedValue({
        contextualContent: 'Context-integrated content',
        contextSources: [],
        integrationScore: 0.8
      }),
      
      getAnalytics: jest.fn().mockResolvedValue({
        analytics: {},
        system: {},
        performance: {}
      }),
      
      healthCheck: jest.fn().mockResolvedValue({
        status: 'healthy',
        components: {},
        performance: {}
      })
    };

    return LondonSchoolUtils.createCollaboratorMock('PostingIntelligenceAPI', {
      ...defaultBehavior,
      ...config
    });
  }

  /**
   * Create mock for ContentTemplateEngine
   */
  static createContentTemplateEngineMock(config = {}) {
    const defaultBehavior = {
      composeContent: jest.fn().mockResolvedValue({
        text: 'Composed content based on template',
        composition: {
          agentType: 'personal-todos',
          structure: 'context + task + impact + next_steps',
          tone: 'professional-personal'
        },
        assemblyMethod: 'context + task + impact + next_steps',
        wordCount: 45,
        estimatedReadTime: 1
      }),
      
      populateElements: jest.fn().mockResolvedValue({
        task_description: 'Sample task',
        business_context: 'Business context',
        completion_criteria: 'Success criteria'
      }),
      
      assembleContent: jest.fn().mockReturnValue({
        text: 'Assembled content',
        wordCount: 30,
        estimatedReadTime: 1
      })
    };

    return LondonSchoolUtils.createCollaboratorMock('ContentTemplateEngine', {
      ...defaultBehavior,
      ...config
    });
  }

  /**
   * Create mock for BusinessImpactAnalyzer
   */
  static createBusinessImpactAnalyzerMock(config = {}) {
    const defaultBehavior = {
      analyzeBusinessImpact: jest.fn().mockResolvedValue({
        score: 0.75,
        factors: {
          revenue: 0.6,
          efficiency: 0.8,
          strategic: 0.7,
          risk: 0.5,
          innovation: 0.4
        },
        improvements: [
          'Consider adding more revenue-focused language'
        ],
        reasoning: [
          'revenue: Medium impact (60.0%)',
          'efficiency: High impact (80.0%)'
        ]
      }),
      
      analyzeRevenueImpact: jest.fn().mockReturnValue(0.6),
      analyzeEfficiencyImpact: jest.fn().mockReturnValue(0.8),
      analyzeStrategicImpact: jest.fn().mockReturnValue(0.7),
      analyzeRiskImpact: jest.fn().mockReturnValue(0.5),
      analyzeInnovationImpact: jest.fn().mockReturnValue(0.4)
    };

    return LondonSchoolUtils.createCollaboratorMock('BusinessImpactAnalyzer', {
      ...defaultBehavior,
      ...config
    });
  }

  /**
   * Create mock for QualityAssessmentSystem
   */
  static createQualityAssessmentSystemMock(config = {}) {
    const defaultBehavior = {
      assessContent: jest.fn().mockResolvedValue({
        overallScore: 0.85,
        breakdown: {
          clarity: { score: 0.9, feedback: 'Content is very clear' },
          structure: { score: 0.8, feedback: 'Well structured' },
          relevance: { score: 0.85, feedback: 'Highly relevant' },
          actionability: { score: 0.8, feedback: 'Clear actions' },
          completeness: { score: 0.9, feedback: 'Complete information' },
          readability: { score: 0.85, feedback: 'Easy to read' }
        },
        improvements: [],
        qualityLevel: 'high'
      }),
      
      assessClarity: jest.fn().mockResolvedValue({
        score: 0.9,
        feedback: 'Content is very clear'
      }),
      
      assessStructure: jest.fn().mockResolvedValue({
        score: 0.8,
        feedback: 'Well structured'
      })
    };

    return LondonSchoolUtils.createCollaboratorMock('QualityAssessmentSystem', {
      ...defaultBehavior,
      ...config
    });
  }

  /**
   * Create mock for EngagementOptimizer
   */
  static createEngagementOptimizerMock(config = {}) {
    const defaultBehavior = {
      optimizeForEngagement: jest.fn().mockResolvedValue({
        optimizedContent: {
          text: 'Optimized content for better engagement',
          engagementScore: 0.9,
          optimizations: [
            { type: 'emotional', improvement: 'Added engaging questions' },
            { type: 'structural', improvement: 'Improved formatting' }
          ],
          processingTime: 150,
          optimizationSteps: 3
        }
      }),
      
      analyzeEmotionalEngagement: jest.fn().mockResolvedValue({
        score: 0.75,
        emotions: ['curiosity', 'excitement'],
        suggestions: []
      }),
      
      enhanceInteractivity: jest.fn().mockResolvedValue({
        enhanced: true,
        additions: ['question', 'call-to-action']
      })
    };

    return LondonSchoolUtils.createCollaboratorMock('EngagementOptimizer', {
      ...defaultBehavior,
      ...config
    });
  }

  /**
   * Create mock for PatternRecognitionEngine
   */
  static createPatternRecognitionEngineMock(config = {}) {
    const defaultBehavior = {
      enhanceWithPatterns: jest.fn().mockResolvedValue({
        enhancedContent: {
          text: 'Pattern-enhanced content',
          appliedPatterns: [
            { type: 'temporal', confidence: 0.8, description: 'Optimal timing pattern' },
            { type: 'structural', confidence: 0.75, description: 'Effective structure' }
          ],
          confidence: 0.85,
          processingTime: 120
        }
      }),
      
      analyzePatterns: jest.fn().mockResolvedValue({
        patterns: [],
        confidence: 0.8
      }),
      
      getPatternStatistics: jest.fn().mockReturnValue({
        totalPatterns: 150,
        successfulPatterns: 120,
        averageConfidence: 0.82
      })
    };

    return LondonSchoolUtils.createCollaboratorMock('PatternRecognitionEngine', {
      ...defaultBehavior,
      ...config
    });
  }

  /**
   * Create mock for CrossSessionContextIntegrator
   */
  static createCrossSessionContextIntegratorMock(config = {}) {
    const defaultBehavior = {
      integrateContext: jest.fn().mockResolvedValue({
        contextualContent: {
          text: 'Context-integrated content',
          contextSources: [
            { type: 'session_history', relevance: 0.8 },
            { type: 'user_preferences', relevance: 0.9 }
          ],
          integrationScore: 0.85,
          processingTime: 95
        }
      }),
      
      analyzeSessionHistory: jest.fn().mockResolvedValue({
        insights: [],
        relevantContext: []
      }),
      
      extractUserPreferences: jest.fn().mockResolvedValue({
        preferences: {},
        confidence: 0.8
      })
    };

    return LondonSchoolUtils.createCollaboratorMock('CrossSessionContextIntegrator', {
      ...defaultBehavior,
      ...config
    });
  }

  /**
   * Create mock for PostingIntelligenceFramework
   */
  static createPostingIntelligenceFrameworkMock(config = {}) {
    const defaultBehavior = {
      generateIntelligentPost: jest.fn().mockResolvedValue({
        content: 'Framework-generated intelligent post',
        metadata: {
          qualityScore: 0.85,
          impactScore: 0.78,
          engagementPrediction: 0.82,
          patterns: [],
          contextSources: [],
          generatedAt: new Date().toISOString(),
          framework: 'PostingIntelligenceFramework',
          version: '1.0.0'
        },
        analytics: {
          processingTime: 245,
          optimizationSteps: 5,
          qualityBreakdown: {},
          impactFactors: {}
        },
        recommendations: []
      }),
      
      batchGeneratePosts: jest.fn().mockResolvedValue({
        posts: [],
        batchAnalytics: {},
        sharedInsights: []
      }),
      
      packageFinalPost: jest.fn().mockReturnValue({
        content: 'Final packaged post',
        metadata: {},
        analytics: {},
        recommendations: []
      })
    };

    return LondonSchoolUtils.createCollaboratorMock('PostingIntelligenceFramework', {
      ...defaultBehavior,
      ...config
    });
  }

  /**
   * Create complete mock ecosystem for integration testing
   */
  static createMockEcosystem(overrides = {}) {
    return {
      api: this.createPostingIntelligenceAPIMock(overrides.api),
      framework: this.createPostingIntelligenceFrameworkMock(overrides.framework),
      templateEngine: this.createContentTemplateEngineMock(overrides.templateEngine),
      impactAnalyzer: this.createBusinessImpactAnalyzerMock(overrides.impactAnalyzer),
      qualityAssessment: this.createQualityAssessmentSystemMock(overrides.qualityAssessment),
      engagementOptimizer: this.createEngagementOptimizerMock(overrides.engagementOptimizer),
      patternRecognition: this.createPatternRecognitionEngineMock(overrides.patternRecognition),
      contextIntegrator: this.createCrossSessionContextIntegratorMock(overrides.contextIntegrator)
    };
  }

  /**
   * Create failing mocks for error testing
   */
  static createFailingMocks() {
    const error = new Error('Mock failure for testing');
    
    return {
      api: this.createPostingIntelligenceAPIMock({
        generateIntelligentPost: jest.fn().mockRejectedValue(error)
      }),
      framework: this.createPostingIntelligenceFrameworkMock({
        generateIntelligentPost: jest.fn().mockRejectedValue(error)
      }),
      templateEngine: this.createContentTemplateEngineMock({
        composeContent: jest.fn().mockRejectedValue(error)
      })
    };
  }

  /**
   * Verify all mocks have been called as expected
   */
  static verifyMockEcosystem(mocks, expectedInteractions) {
    Object.entries(expectedInteractions).forEach(([componentName, interactions]) => {
      const mock = mocks[componentName];
      if (mock && mock.verifyCollaboration) {
        mock.verifyCollaboration(interactions);
      }
    });
  }
}

/**
 * Request/Response Mock Data Factory
 */
class MockDataFactory {
  static createValidRequest(overrides = {}) {
    return {
      agentType: 'personal-todos',
      userData: {
        id: 'user_123',
        title: 'Complete project documentation',
        description: 'Finish writing technical documentation for the new feature',
        priority: 'P2',
        impact_score: 7,
        business_context: 'Important for product launch',
        completion_criteria: 'All sections documented with examples'
      },
      context: {
        sessionHistory: [],
        businessContext: 'Product development cycle',
        currentProject: 'Feature X'
      },
      options: {
        enablePatternRecognition: true,
        enableContextIntegration: true
      },
      ...overrides
    };
  }

  static createValidResponse(overrides = {}) {
    return {
      content: 'Generated intelligent post content',
      metadata: {
        qualityScore: 0.85,
        impactScore: 0.78,
        engagementPrediction: 0.82,
        patterns: [],
        contextSources: [],
        generatedAt: new Date().toISOString(),
        framework: 'PostingIntelligenceFramework',
        version: '1.0.0'
      },
      analytics: {
        processingTime: 245,
        optimizationSteps: 5,
        qualityBreakdown: {},
        impactFactors: {}
      },
      recommendations: [],
      ...overrides
    };
  }

  static createBatchRequest(count = 3, overrides = {}) {
    return Array.from({ length: count }, (_, i) => 
      this.createValidRequest({
        userData: {
          ...this.createValidRequest().userData,
          id: `user_${i + 1}`,
          title: `Task ${i + 1}`
        },
        ...overrides
      })
    );
  }

  static createUserProfile(overrides = {}) {
    return {
      id: 'user_123',
      postCount: 25,
      avgQuality: 0.82,
      avgEngagement: 0.75,
      preferredTopics: ['technology', 'business'],
      optimalPostingTime: '09:00',
      lastActivity: new Date().toISOString(),
      ...overrides
    };
  }

  static createPerformanceMetrics(overrides = {}) {
    return {
      qualityScore: 0.85,
      engagementScore: 0.78,
      impactScore: 0.82,
      processingTime: 245,
      optimizationSteps: 5,
      patternsApplied: 3,
      contextSources: 2,
      ...overrides
    };
  }
}

module.exports = {
  PostingIntelligenceMockFactory,
  MockDataFactory
};