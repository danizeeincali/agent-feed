/**
 * Comprehensive Test Suite for Posting Intelligence Framework
 * London School TDD - Mock all dependencies, test behaviors
 */

// Jest is available globally
const {
    PostingIntelligenceFramework,
    ContentTemplateEngine,
    BusinessImpactAnalyzer,
    PostingIntelligenceError
} = require('../../src/posting-intelligence/core-framework');

const {
    QualityAssessmentSystem
} = require('../../src/posting-intelligence/quality-assessment');

const {
    EngagementOptimizer
} = require('../../src/posting-intelligence/engagement-optimization');

describe('PostingIntelligenceFramework', () => {
    let framework;
    let mockTemplateEngine;
    let mockImpactAnalyzer;
    let mockQualityAssessment;
    let mockEngagementOptimizer;
    let mockPatternRecognition;
    let mockContextIntegrator;

    beforeEach(() => {
        // Mock all dependencies - London School TDD principle
        mockTemplateEngine = {
            composeContent: jest.fn()
        };

        mockImpactAnalyzer = {
            analyzeBusinessImpact: jest.fn()
        };

        mockQualityAssessment = {
            assessContent: jest.fn()
        };

        mockEngagementOptimizer = {
            optimizeForEngagement: jest.fn()
        };

        mockPatternRecognition = {
            enhanceWithPatterns: jest.fn()
        };

        mockContextIntegrator = {
            integrateContext: jest.fn()
        };

        framework = new PostingIntelligenceFramework();
        
        // Inject mocks
        framework.templateEngine = mockTemplateEngine;
        framework.impactAnalyzer = mockImpactAnalyzer;
        framework.qualityAssessment = mockQualityAssessment;
        framework.engagementOptimizer = mockEngagementOptimizer;
        framework.patternRecognition = mockPatternRecognition;
        framework.contextIntegrator = mockContextIntegrator;
    });

    describe('generateIntelligentPost', () => {
        it('should orchestrate all phases of post generation correctly', async () => {
            // Arrange
            const agentType = 'personal-todos';
            const userData = { title: 'Test task', priority: 'P1' };
            const context = { businessContext: 'Strategic initiative' };

            const mockBaseContent = { text: 'Base content', agentType };
            const mockImpactAnalysis = { score: 0.8, factors: [] };
            const mockQualityMetrics = { overallScore: 0.9, breakdown: {} };
            const mockOptimizedContent = { 
                text: 'Optimized content', 
                engagementPrediction: { score: 0.85 },
                appliedPatterns: ['emotional_connection'],
                processingTime: 150
            };
            const mockEnhancedContent = { 
                ...mockOptimizedContent,
                appliedPatterns: ['emotional_connection', 'clarity_boost']
            };
            const mockContextualContent = {
                ...mockEnhancedContent,
                contextSources: ['session_history']
            };

            mockTemplateEngine.composeContent.mockResolvedValue(mockBaseContent);
            mockImpactAnalyzer.analyzeBusinessImpact.mockResolvedValue(mockImpactAnalysis);
            mockQualityAssessment.assessContent.mockResolvedValue(mockQualityMetrics);
            mockEngagementOptimizer.optimizeForEngagement.mockResolvedValue(mockOptimizedContent);
            mockPatternRecognition.enhanceWithPatterns.mockResolvedValue(mockEnhancedContent);
            mockContextIntegrator.integrateContext.mockResolvedValue(mockContextualContent);

            // Act
            const result = await framework.generateIntelligentPost(agentType, userData, context);

            // Assert - Verify each phase was called in correct order
            expect(mockTemplateEngine.composeContent).toHaveBeenCalledWith(agentType, userData, context);
            expect(mockImpactAnalyzer.analyzeBusinessImpact).toHaveBeenCalledWith(mockBaseContent, userData);
            expect(mockQualityAssessment.assessContent).toHaveBeenCalledWith(mockBaseContent, mockImpactAnalysis);
            expect(mockEngagementOptimizer.optimizeForEngagement).toHaveBeenCalledWith(
                mockBaseContent, 
                mockQualityMetrics, 
                context
            );
            expect(mockPatternRecognition.enhanceWithPatterns).toHaveBeenCalledWith(
                mockOptimizedContent,
                agentType,
                userData.feedHistory
            );
            expect(mockContextIntegrator.integrateContext).toHaveBeenCalledWith(
                mockEnhancedContent,
                userData.sessionHistory,
                context
            );

            // Assert final structure
            expect(result).toHaveProperty('content', 'Optimized content');
            expect(result.metadata).toEqual({
                qualityScore: 0.9,
                impactScore: 0.8,
                engagementPrediction: { score: 0.85 },
                patterns: ['emotional_connection', 'clarity_boost'],
                contextSources: ['session_history'],
                generatedAt: expect.any(String),
                framework: 'PostingIntelligenceFramework',
                version: '1.0.0'
            });
            expect(result.analytics.processingTime).toBe(150);
        });

        it('should handle errors gracefully and throw PostingIntelligenceError', async () => {
            // Arrange
            const error = new Error('Template engine failed');
            mockTemplateEngine.composeContent.mockRejectedValue(error);

            // Act & Assert
            await expect(framework.generateIntelligentPost('personal-todos', {}, {}))
                .rejects.toThrow(PostingIntelligenceError);
            await expect(framework.generateIntelligentPost('personal-todos', {}, {}))
                .rejects.toThrow('Failed to generate intelligent post');
        });

        it('should meet performance requirement of <200ms for post composition', async () => {
            // Arrange
            const startTime = Date.now();
            
            mockTemplateEngine.composeContent.mockResolvedValue({ text: 'Content', agentType: 'test' });
            mockImpactAnalyzer.analyzeBusinessImpact.mockResolvedValue({ score: 0.7, factors: [] });
            mockQualityAssessment.assessContent.mockResolvedValue({ overallScore: 0.8, breakdown: {} });
            mockEngagementOptimizer.optimizeForEngagement.mockResolvedValue({ 
                text: 'Content', 
                engagementPrediction: {},
                appliedPatterns: [],
                processingTime: 50
            });
            mockPatternRecognition.enhanceWithPatterns.mockResolvedValue({ 
                text: 'Content', 
                appliedPatterns: []
            });
            mockContextIntegrator.integrateContext.mockResolvedValue({ 
                text: 'Content', 
                contextSources: []
            });

            // Act
            await framework.generateIntelligentPost('personal-todos', {}, {});
            const duration = Date.now() - startTime;

            // Assert
            expect(duration).toBeLessThan(200); // Performance requirement
        });
    });

    describe('packageFinalPost', () => {
        it('should create properly structured final post package', () => {
            // Arrange
            const content = {
                text: 'Final content',
                engagementPrediction: { score: 0.8 },
                appliedPatterns: ['clarity'],
                contextSources: ['history'],
                processingTime: 100,
                optimizationSteps: 2
            };
            const qualityMetrics = {
                overallScore: 0.85,
                breakdown: { clarity: 0.9 }
            };
            const impactAnalysis = {
                score: 0.75,
                factors: { revenue: 0.8 }
            };

            // Act
            const result = framework.packageFinalPost(content, qualityMetrics, impactAnalysis);

            // Assert
            expect(result).toEqual({
                content: 'Final content',
                metadata: {
                    qualityScore: 0.85,
                    impactScore: 0.75,
                    engagementPrediction: { score: 0.8 },
                    patterns: ['clarity'],
                    contextSources: ['history'],
                    generatedAt: expect.any(String),
                    framework: 'PostingIntelligenceFramework',
                    version: '1.0.0'
                },
                analytics: {
                    processingTime: 100,
                    optimizationSteps: 2,
                    qualityBreakdown: { clarity: 0.9 },
                    impactFactors: { revenue: 0.8 }
                },
                recommendations: expect.any(Array)
            });
        });
    });

    describe('batchGeneratePosts', () => {
        it('should process multiple posts with intelligence sharing', async () => {
            // Arrange
            const requests = [
                { agentType: 'personal-todos', userData: { title: 'Task 1' }, context: {} },
                { agentType: 'meeting-prep', userData: { title: 'Meeting 1' }, context: {} }
            ];

            mockTemplateEngine.composeContent.mockResolvedValue({ text: 'Content', agentType: 'test' });
            mockImpactAnalyzer.analyzeBusinessImpact.mockResolvedValue({ score: 0.8, factors: [] });
            mockQualityAssessment.assessContent.mockResolvedValue({ overallScore: 0.9, breakdown: {} });
            mockEngagementOptimizer.optimizeForEngagement.mockResolvedValue({
                text: 'Content',
                engagementPrediction: { score: 0.8 },
                appliedPatterns: [{ type: 'emotional' }],
                processingTime: 100,
                optimizationSteps: 1
            });
            mockPatternRecognition.enhanceWithPatterns.mockResolvedValue({
                text: 'Content',
                appliedPatterns: [{ type: 'emotional' }]
            });
            mockContextIntegrator.integrateContext.mockResolvedValue({
                text: 'Content',
                contextSources: []
            });

            // Act
            const result = await framework.batchGeneratePosts(requests);

            // Assert
            expect(result.posts).toHaveLength(2);
            expect(result.batchAnalytics).toHaveProperty('totalPosts', 2);
            expect(result.batchAnalytics).toHaveProperty('averageQuality');
            expect(result.sharedInsights).toBeInstanceOf(Array);
        });

        it('should achieve 100 posts/minute throughput requirement', async () => {
            // Arrange
            const requests = Array(10).fill().map((_, i) => ({
                agentType: 'personal-todos',
                userData: { title: `Task ${i}` },
                context: {}
            }));

            // Mock fast responses
            mockTemplateEngine.composeContent.mockResolvedValue({ text: 'Content', agentType: 'test' });
            mockImpactAnalyzer.analyzeBusinessImpact.mockResolvedValue({ score: 0.8, factors: [] });
            mockQualityAssessment.assessContent.mockResolvedValue({ overallScore: 0.9, breakdown: {} });
            mockEngagementOptimizer.optimizeForEngagement.mockResolvedValue({
                text: 'Content',
                engagementPrediction: {},
                appliedPatterns: [],
                processingTime: 10,
                optimizationSteps: 0
            });
            mockPatternRecognition.enhanceWithPatterns.mockResolvedValue({ text: 'Content', appliedPatterns: [] });
            mockContextIntegrator.integrateContext.mockResolvedValue({ text: 'Content', contextSources: [] });

            // Act
            const startTime = Date.now();
            const result = await framework.batchGeneratePosts(requests);
            const duration = Date.now() - startTime;

            // Assert
            const postsPerMinute = (requests.length / duration) * 60000;
            expect(postsPerMinute).toBeGreaterThan(100); // Performance requirement
            expect(result.posts).toHaveLength(10);
        });
    });

    describe('generateRecommendations', () => {
        it('should generate quality recommendations when score is below threshold', () => {
            // Arrange
            const qualityMetrics = {
                overallScore: 0.5, // Below threshold of 0.7
                improvements: [{ suggestion: 'Improve clarity' }]
            };
            const impactAnalysis = { score: 0.8 };

            // Act
            const recommendations = framework.generateRecommendations(qualityMetrics, impactAnalysis);

            // Assert
            expect(recommendations).toContainEqual({
                type: 'quality',
                message: 'Consider revising content for better clarity and structure',
                priority: 'high',
                suggestions: [{ suggestion: 'Improve clarity' }]
            });
        });

        it('should generate impact recommendations when score is low', () => {
            // Arrange
            const qualityMetrics = { overallScore: 0.8 };
            const impactAnalysis = {
                score: 0.4, // Below 0.5 threshold
                improvements: [{ suggestion: 'Add business metrics' }]
            };

            // Act
            const recommendations = framework.generateRecommendations(qualityMetrics, impactAnalysis);

            // Assert
            expect(recommendations).toContainEqual({
                type: 'impact',
                message: 'Content could benefit from stronger business relevance',
                priority: 'medium',
                suggestions: [{ suggestion: 'Add business metrics' }]
            });
        });
    });
});

describe('ContentTemplateEngine', () => {
    let templateEngine;

    beforeEach(() => {
        templateEngine = new ContentTemplateEngine();
    });

    describe('composeContent', () => {
        it('should compose content for personal-todos agent type', async () => {
            // Arrange
            const agentType = 'personal-todos';
            const userData = {
                title: 'Implement user authentication',
                priority: 'P1',
                impact_score: 8,
                business_context: 'Security enhancement project'
            };
            const context = {};

            // Act
            const result = await templateEngine.composeContent(agentType, userData, context);

            // Assert
            expect(result.text).toContain('**Task Context**: Security enhancement project');
            expect(result.text).toContain('**Task**: Implement user authentication');
            expect(result.text).toContain('**Priority Reasoning**: Critical priority due to high impact (8/10)');
            expect(result.composition.agentType).toBe(agentType);
            expect(result.wordCount).toBeGreaterThan(0);
            expect(result.estimatedReadTime).toBeGreaterThan(0);
        });

        it('should compose content for meeting-prep agent type', async () => {
            // Arrange
            const agentType = 'meeting-prep';
            const userData = { purpose: 'Project kickoff' };
            const context = {
                agenda: {
                    purpose: 'Project kickoff meeting',
                    topics: ['Timeline', 'Resources', 'Deliverables'],
                    outcomes: 'Clear project plan'
                }
            };

            // Act
            const result = await templateEngine.composeContent(agentType, userData, context);

            // Assert
            expect(result.text).toContain('**Meeting Purpose**: Project kickoff meeting');
            expect(result.text).toContain('• Timeline');
            expect(result.text).toContain('• Resources');
            expect(result.text).toContain('**Expected Outcomes**: Clear project plan');
        });

        it('should throw error for unsupported agent type', async () => {
            // Act & Assert
            await expect(templateEngine.composeContent('unsupported-type', {}, {}))
                .rejects.toThrow('No template found for agent type: unsupported-type');
        });
    });

    describe('generatePriorityReasoning', () => {
        it('should generate reasoning for P1 priority', () => {
            // Arrange
            const userData = { priority: 'P1', impact_score: 9 };

            // Act
            const reasoning = templateEngine.generatePriorityReasoning(userData);

            // Assert
            expect(reasoning).toBe('Critical priority due to high impact (9/10) and urgent timeline');
        });

        it('should generate reasoning for P3 priority', () => {
            // Arrange
            const userData = { priority: 'P3', impact_score: 5 };

            // Act
            const reasoning = templateEngine.generatePriorityReasoning(userData);

            // Assert
            expect(reasoning).toBe('Standard priority balancing impact (5/10) with resource availability');
        });

        it('should default to P3 reasoning for unknown priority', () => {
            // Arrange
            const userData = { priority: 'UNKNOWN', impact_score: 6 };

            // Act
            const reasoning = templateEngine.generatePriorityReasoning(userData);

            // Assert
            expect(reasoning).toBe('Standard priority balancing impact (6/10) with resource availability');
        });
    });
});

describe('BusinessImpactAnalyzer', () => {
    let analyzer;

    beforeEach(() => {
        analyzer = new BusinessImpactAnalyzer();
    });

    describe('analyzeBusinessImpact', () => {
        it('should analyze content with high revenue impact', async () => {
            // Arrange
            const content = {
                text: 'This project will increase revenue by optimizing customer sales processes and improving market growth'
            };
            const userData = { impact_score: 9, priority: 'P1' };

            // Act
            const result = await analyzer.analyzeBusinessImpact(content, userData);

            // Assert
            expect(result.score).toBeGreaterThan(0.5);
            expect(result.factors.revenue).toBeGreaterThan(0.5);
            expect(result.factors.efficiency).toBeGreaterThan(0.5);
            expect(result.reasoning).toContain('revenue:');
        });

        it('should analyze content with low business impact', async () => {
            // Arrange
            const content = {
                text: 'Simple task with no specific business implications'
            };
            const userData = { impact_score: 2, priority: 'P4' };

            // Act
            const result = await analyzer.analyzeBusinessImpact(content, userData);

            // Assert
            expect(result.score).toBeLessThan(0.7);
            expect(result.improvements.length).toBeGreaterThan(0);
        });

        it('should generate improvements for low scores', async () => {
            // Arrange
            const content = { text: 'Basic content' };
            const userData = {};

            // Act
            const result = await analyzer.analyzeBusinessImpact(content, userData);

            // Assert
            expect(result.improvements).toContain('Consider adding more revenue-focused language and metrics');
            expect(result.improvements).toContain('Highlight efficiency gains and process improvements');
            expect(result.improvements).toContain('Connect to broader strategic objectives and goals');
        });
    });

    describe('analyzeRevenueImpact', () => {
        it('should detect revenue keywords and calculate score', () => {
            // Arrange
            const content = { text: 'This will increase revenue and improve sales growth in the market' };
            const userData = { impact_score: 8 };

            // Act
            const score = analyzer.analyzeRevenueImpact(content, userData);

            // Assert
            expect(score).toBeGreaterThan(0.5);
            expect(score).toBeLessThanOrEqual(1.0);
        });

        it('should handle content with no revenue keywords', () => {
            // Arrange
            const content = { text: 'Simple task without business impact' };
            const userData = { impact_score: 3 };

            // Act
            const score = analyzer.analyzeRevenueImpact(content, userData);

            // Assert
            expect(score).toBeLessThan(0.5);
        });
    });

    describe('analyzeEfficiencyImpact', () => {
        it('should detect efficiency keywords and apply priority multiplier', () => {
            // Arrange
            const content = { text: 'This will automate processes and optimize workflow to improve efficiency' };
            const userData = { priority: 'P1' };

            // Act
            const score = analyzer.analyzeEfficiencyImpact(content, userData);

            // Assert
            expect(score).toBeGreaterThan(0.6);
        });

        it('should apply lower multiplier for lower priority tasks', () => {
            // Arrange
            const content = { text: 'This will automate processes and optimize workflow' };
            const highPriorityData = { priority: 'P1' };
            const lowPriorityData = { priority: 'P4' };

            // Act
            const highPriorityScore = analyzer.analyzeEfficiencyImpact(content, highPriorityData);
            const lowPriorityScore = analyzer.analyzeEfficiencyImpact(content, lowPriorityData);

            // Assert
            expect(highPriorityScore).toBeGreaterThan(lowPriorityScore);
        });
    });
});

describe('Error Handling and Resilience', () => {
    let framework;

    beforeEach(() => {
        framework = new PostingIntelligenceFramework();
    });

    it('should handle template engine failures gracefully', async () => {
        // Arrange
        framework.templateEngine = {
            composeContent: jest.fn().mockRejectedValue(new Error('Template error'))
        };

        // Act & Assert
        await expect(framework.generateIntelligentPost('personal-todos', {}, {}))
            .rejects.toThrow(PostingIntelligenceError);
    });

    it('should handle partial failures in optimization pipeline', async () => {
        // Arrange
        framework.templateEngine = {
            composeContent: jest.fn().mockResolvedValue({ text: 'Content', agentType: 'test' })
        };
        framework.impactAnalyzer = {
            analyzeBusinessImpact: jest.fn().mockResolvedValue({ score: 0.5, factors: [] })
        };
        framework.qualityAssessment = {
            assessContent: jest.fn().mockRejectedValue(new Error('Quality assessment failed'))
        };

        // Act & Assert
        await expect(framework.generateIntelligentPost('personal-todos', {}, {}))
            .rejects.toThrow(PostingIntelligenceError);
    });
});

describe('Performance and Scalability', () => {
    let framework;

    beforeEach(() => {
        framework = new PostingIntelligenceFramework();
        
        // Mock all dependencies with fast responses
        framework.templateEngine = {
            composeContent: jest.fn().mockResolvedValue({ text: 'Content', agentType: 'test' })
        };
        framework.impactAnalyzer = {
            analyzeBusinessImpact: jest.fn().mockResolvedValue({ score: 0.8, factors: [] })
        };
        framework.qualityAssessment = {
            assessContent: jest.fn().mockResolvedValue({ overallScore: 0.9, breakdown: {} })
        };
        framework.engagementOptimizer = {
            optimizeForEngagement: jest.fn().mockResolvedValue({
                text: 'Content',
                engagementPrediction: {},
                appliedPatterns: [],
                processingTime: 10,
                optimizationSteps: 1
            })
        };
        framework.patternRecognition = {
            enhanceWithPatterns: jest.fn().mockResolvedValue({ text: 'Content', appliedPatterns: [] })
        };
        framework.contextIntegrator = {
            integrateContext: jest.fn().mockResolvedValue({ text: 'Content', contextSources: [] })
        };
    });

    it('should handle high-volume batch processing efficiently', async () => {
        // Arrange
        const requests = Array(50).fill().map((_, i) => ({
            agentType: 'personal-todos',
            userData: { title: `Task ${i}` },
            context: {}
        }));

        // Act
        const startTime = Date.now();
        const result = await framework.batchGeneratePosts(requests);
        const duration = Date.now() - startTime;

        // Assert
        expect(result.posts).toHaveLength(50);
        expect(duration).toBeLessThan(5000); // Should process 50 posts in under 5 seconds
        
        const postsPerSecond = requests.length / (duration / 1000);
        expect(postsPerSecond).toBeGreaterThan(10); // At least 10 posts per second
    });

    it('should maintain performance under memory pressure', async () => {
        // Arrange - Create memory-intensive operations
        const largeUserData = {
            title: 'A'.repeat(1000),
            description: 'B'.repeat(5000),
            feedHistory: Array(100).fill({ content: 'C'.repeat(500) }),
            sessionHistory: Array(50).fill({ data: 'D'.repeat(200) })
        };

        // Act
        const startTime = Date.now();
        await framework.generateIntelligentPost('personal-todos', largeUserData, {});
        const duration = Date.now() - startTime;

        // Assert
        expect(duration).toBeLessThan(500); // Should still be fast with large data
    });
});