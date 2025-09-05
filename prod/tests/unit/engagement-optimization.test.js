/**
 * Comprehensive Test Suite for Engagement Optimization
 * London School TDD - Mock all dependencies, focus on behavior
 */

// Jest is available globally
const {
    EngagementOptimizer,
    EmotionalEngagementAnalyzer,
    InteractivityEnhancer,
    PersonalizationEngine,
    StructuralOptimizer,
    EngagementPredictor,
    EngagementOptimizationError
} = require('../../src/posting-intelligence/engagement-optimization');

describe('EngagementOptimizer', () => {
    let optimizer;
    let mockEmotionalAnalyzer;
    let mockInteractivityEnhancer;
    let mockPersonalizationEngine;
    let mockStructuralOptimizer;
    let mockEngagementPredictor;

    beforeEach(() => {
        // Mock all dependencies - London School TDD principle
        mockEmotionalAnalyzer = {
            analyze: jest.fn(),
            enhance: jest.fn()
        };

        mockInteractivityEnhancer = {
            assess: jest.fn(),
            enhance: jest.fn()
        };

        mockPersonalizationEngine = {
            assess: jest.fn(),
            personalize: jest.fn()
        };

        mockStructuralOptimizer = {
            assess: jest.fn(),
            optimize: jest.fn()
        };

        mockEngagementPredictor = {
            predict: jest.fn()
        };

        optimizer = new EngagementOptimizer();

        // Inject mocks
        optimizer.emotionalAnalyzer = mockEmotionalAnalyzer;
        optimizer.interactivityEnhancer = mockInteractivityEnhancer;
        optimizer.personalizationEngine = mockPersonalizationEngine;
        optimizer.structuralOptimizer = mockStructuralOptimizer;
        optimizer.engagementPredictor = mockEngagementPredictor;
    });

    describe('optimizeForEngagement', () => {
        it('should orchestrate multi-round optimization correctly', async () => {
            // Arrange
            const content = { text: 'Initial content', agentType: 'personal-todos' };
            const qualityMetrics = { overallScore: 0.8 };
            const context = { userData: { name: 'John' } };

            // Mock initial low engagement that improves over rounds
            mockEmotionalAnalyzer.analyze
                .mockResolvedValueOnCall(0, { score: 0.5 })
                .mockResolvedValueOnCall(1, { score: 0.7 })
                .mockResolvedValueOnCall(2, { score: 0.8 });

            mockInteractivityEnhancer.assess
                .mockResolvedValue({ score: 0.6 });

            mockPersonalizationEngine.assess
                .mockResolvedValue({ score: 0.7 });

            mockStructuralOptimizer.assess
                .mockResolvedValue({ score: 0.8 });

            // Mock enhancement methods
            mockEmotionalAnalyzer.enhance
                .mockResolvedValue({ improved: true, text: 'Enhanced content', changes: ['added_emotion'] });

            mockEngagementPredictor.predict
                .mockResolvedValue({ score: 0.8, confidence: 0.9 });

            // Act
            const result = await optimizer.optimizeForEngagement(content, qualityMetrics, context);

            // Assert
            expect(result.engagementScore).toBeGreaterThan(0.7);
            expect(result.optimizationSteps).toBeGreaterThan(0);
            expect(result.appliedStrategies).toBeDefined();
            expect(result.optimizationLog).toBeDefined();
            expect(mockEngagementPredictor.predict).toHaveBeenCalled();
        });

        it('should stop optimization when target score is reached', async () => {
            // Arrange
            const content = { text: 'Already good content', agentType: 'personal-todos' };
            const qualityMetrics = { overallScore: 0.9 };
            const context = {};

            // Mock high initial engagement (above target threshold of 0.75)
            mockEmotionalAnalyzer.analyze.mockResolvedValue({ score: 0.8 });
            mockInteractivityEnhancer.assess.mockResolvedValue({ score: 0.8 });
            mockPersonalizationEngine.assess.mockResolvedValue({ score: 0.8 });
            mockStructuralOptimizer.assess.mockResolvedValue({ score: 0.8 });

            mockEngagementPredictor.predict.mockResolvedValue({ score: 0.85 });

            // Act
            const result = await optimizer.optimizeForEngagement(content, qualityMetrics, context);

            // Assert
            expect(result.optimizationSteps).toBe(0); // Should stop immediately
            expect(result.engagementScore).toBeGreaterThan(0.75);
        });

        it('should handle optimization errors gracefully', async () => {
            // Arrange
            const content = { text: 'Content', agentType: 'personal-todos' };
            const qualityMetrics = { overallScore: 0.7 };
            const context = {};

            mockEmotionalAnalyzer.analyze.mockRejectedValue(new Error('Analysis failed'));

            // Act & Assert
            await expect(optimizer.optimizeForEngagement(content, qualityMetrics, context))
                .rejects.toThrow(EngagementOptimizationError);
        });

        it('should limit optimization to maximum rounds', async () => {
            // Arrange
            const content = { text: 'Stubborn content', agentType: 'personal-todos' };
            const qualityMetrics = { overallScore: 0.6 };
            const context = {};

            // Mock consistently low engagement that never improves
            mockEmotionalAnalyzer.analyze.mockResolvedValue({ score: 0.3 });
            mockInteractivityEnhancer.assess.mockResolvedValue({ score: 0.3 });
            mockPersonalizationEngine.assess.mockResolvedValue({ score: 0.3 });
            mockStructuralOptimizer.assess.mockResolvedValue({ score: 0.3 });

            // Mock improvements that don't actually improve
            mockEmotionalAnalyzer.enhance.mockResolvedValue({ improved: false });
            mockInteractivityEnhancer.enhance.mockResolvedValue({ improved: false });
            mockPersonalizationEngine.personalize.mockResolvedValue({ improved: false });
            mockStructuralOptimizer.optimize.mockResolvedValue({ improved: false });

            mockEngagementPredictor.predict.mockResolvedValue({ score: 0.3 });

            // Act
            const result = await optimizer.optimizeForEngagement(content, qualityMetrics, context);

            // Assert
            expect(result.optimizationSteps).toBeLessThanOrEqual(3); // Max rounds from config
        });
    });

    describe('assessCurrentEngagement', () => {
        it('should calculate weighted engagement score correctly', async () => {
            // Arrange
            const content = { text: 'Test content' };
            const context = { userData: { name: 'Alice' } };

            const mockDimensionScores = {
                emotional: { score: 0.8 },
                structural: { score: 0.6 },
                interactive: { score: 0.4 },
                personalization: { score: 1.0 }
            };

            mockEmotionalAnalyzer.analyze.mockResolvedValue(mockDimensionScores.emotional);
            mockStructuralOptimizer.assess.mockResolvedValue(mockDimensionScores.structural);
            mockInteractivityEnhancer.assess.mockResolvedValue(mockDimensionScores.interactive);
            mockPersonalizationEngine.assess.mockResolvedValue(mockDimensionScores.personalization);

            // Act
            const result = await optimizer.assessCurrentEngagement(content, context);

            // Assert
            // Expected: 0.8*0.3 + 0.6*0.25 + 0.4*0.15 + 1.0*0.1 = 0.7
            expect(result.score).toBeCloseTo(0.7, 2);
            expect(result.dimensions).toEqual(mockDimensionScores);
            expect(result.weakestAreas).toBeDefined();
            expect(result.improvementOpportunities).toBeDefined();
        });

        it('should identify weakest areas correctly', async () => {
            // Arrange
            const content = { text: 'Test content' };
            const context = {};

            mockEmotionalAnalyzer.analyze.mockResolvedValue({ score: 0.9 }); // Strong
            mockStructuralOptimizer.assess.mockResolvedValue({ score: 0.3 }); // Weak
            mockInteractivityEnhancer.assess.mockResolvedValue({ score: 0.4 }); // Weak
            mockPersonalizationEngine.assess.mockResolvedValue({ score: 0.8 }); // Strong

            // Act
            const result = await optimizer.assessCurrentEngagement(content, context);

            // Assert
            expect(result.weakestAreas).toHaveLength(2);
            expect(result.weakestAreas[0].dimension).toBe('structural'); // Should be lowest score first
            expect(result.weakestAreas[0].score).toBe(0.3);
        });
    });

    describe('selectOptimizationStrategies', () => {
        it('should select strategies based on weakest areas', () => {
            // Arrange
            const weakestAreas = [
                { dimension: 'emotional', score: 0.2 },
                { dimension: 'interactive', score: 0.3 }
            ];
            const round = 0;

            // Act
            const strategies = optimizer.selectOptimizationStrategies(weakestAreas, round);

            // Assert
            expect(strategies).toContain('enhance_emotional_connection');
            expect(strategies).toContain('add_interactivity');
            expect(strategies).toContain('optimize_opening'); // Round 0 specific
            expect(strategies.length).toBeLessThanOrEqual(3); // Should limit strategies
        });

        it('should add round-specific strategies', () => {
            // Arrange
            const weakestAreas = [];

            // Act
            const round0Strategies = optimizer.selectOptimizationStrategies(weakestAreas, 0);
            const round1Strategies = optimizer.selectOptimizationStrategies(weakestAreas, 1);

            // Assert
            expect(round0Strategies).toContain('optimize_opening');
            expect(round1Strategies).toContain('enhance_call_to_action');
        });
    });

    describe('optimizeOpening', () => {
        it('should improve non-engaging openings', () => {
            // Arrange
            const content = {
                text: 'This is a task that needs to be done.',
                agentType: 'personal-todos'
            };

            // Act
            const result = optimizer.optimizeOpening(content);

            // Assert
            expect(result.improved).toBe(true);
            expect(result.text).not.toBe(content.text);
            expect(result.text).toMatch(/^(Here's what|Key priority|Making progress)/);
        });

        it('should not modify already engaging openings', () => {
            // Arrange
            const content = {
                text: 'Here\'s what I\'m focusing on today: implementing the new feature.',
                agentType: 'personal-todos'
            };

            // Act
            const result = optimizer.optimizeOpening(content);

            // Assert
            expect(result.improved).toBe(false);
            expect(result.text).toBe(content.text);
        });

        it('should generate appropriate openings for different agent types', () => {
            // Arrange
            const meetingContent = {
                text: 'We need to discuss the project timeline.',
                agentType: 'meeting-prep'
            };

            // Act
            const result = optimizer.optimizeOpening(meetingContent);

            // Assert
            expect(result.improved).toBe(true);
            expect(result.text).toMatch(/^(Preparing for|Here's what we|Key topics)/);
        });
    });

    describe('enhanceCallToAction', () => {
        it('should add CTA to content without one', () => {
            // Arrange
            const content = {
                text: 'I completed the project analysis and found several improvement areas.',
                agentType: 'follow-ups'
            };

            // Act
            const result = optimizer.enhanceCallToAction(content);

            // Assert
            expect(result.improved).toBe(true);
            expect(result.text).toContain('?');
            expect(result.text.length).toBeGreaterThan(content.text.length);
        });

        it('should not modify content that already has CTA', () => {
            // Arrange
            const content = {
                text: 'I completed the analysis. What are your thoughts?',
                agentType: 'follow-ups'
            };

            // Act
            const result = optimizer.enhanceCallToAction(content);

            // Assert
            expect(result.improved).toBe(false);
            expect(result.text).toBe(content.text);
        });

        it('should generate appropriate CTAs for different agent types', () => {
            // Arrange
            const agentTypes = ['personal-todos', 'meeting-prep', 'meeting-next-steps', 'follow-ups', 'agent-ideas'];
            
            // Act & Assert
            agentTypes.forEach(agentType => {
                const content = { text: 'Content without CTA', agentType };
                const result = optimizer.enhanceCallToAction(content);
                
                expect(result.improved).toBe(true);
                expect(result.text).toContain('?');
            });
        });
    });

    describe('identifyWeakestAreas', () => {
        it('should identify and sort weak dimensions', () => {
            // Arrange
            const dimensions = {
                clarity: { score: 0.8 },
                structure: { score: 0.3 }, // Weakest
                relevance: { score: 0.5 }, // Second weakest
                actionability: { score: 0.9 }
            };

            // Act
            const result = optimizer.identifyWeakestAreas(dimensions);

            // Assert
            expect(result).toHaveLength(2); // Only scores < 0.6
            expect(result[0].dimension).toBe('structure');
            expect(result[0].score).toBe(0.3);
            expect(result[1].dimension).toBe('relevance');
            expect(result[1].score).toBe(0.5);
        });

        it('should return empty array when all dimensions are strong', () => {
            // Arrange
            const dimensions = {
                clarity: { score: 0.8 },
                structure: { score: 0.7 },
                relevance: { score: 0.9 }
            };

            // Act
            const result = optimizer.identifyWeakestAreas(dimensions);

            // Assert
            expect(result).toHaveLength(0);
        });
    });
});

describe('EmotionalEngagementAnalyzer', () => {
    let analyzer;

    beforeEach(() => {
        analyzer = new EmotionalEngagementAnalyzer();
    });

    describe('analyze', () => {
        it('should analyze emotional tone correctly', async () => {
            // Arrange
            const content = {
                text: 'I am excited about this amazing opportunity! We achieved great success and made excellent progress.'
            };

            // Act
            const result = await analyzer.analyze(content);

            // Assert
            expect(result.score).toBeGreaterThan(0.6);
            expect(result.insights.length).toBeGreaterThan(0);
        });

        it('should detect lack of emotional engagement', async () => {
            // Arrange
            const content = {
                text: 'This is a factual update about the project status. The information is provided for reference.'
            };

            // Act
            const result = await analyzer.analyze(content);

            // Assert
            expect(result.score).toBeLessThan(0.6);
            expect(result.suggestions).toContain('Add more emotional language to connect with readers');
        });

        it('should analyze personal connection', async () => {
            // Arrange
            const personalContent = {
                text: 'I am working on our team project and we are making great progress together.'
            };
            const impersonalContent = {
                text: 'The project is progressing according to schedule and milestones are being met.'
            };

            // Act
            const personalResult = await analyzer.analyze(personalContent);
            const impersonalResult = await analyzer.analyze(impersonalContent);

            // Assert
            expect(personalResult.score).toBeGreaterThan(impersonalResult.score);
        });
    });

    describe('analyzeEmotionalTone', () => {
        it('should favor positive emotional content', () => {
            const positiveText = 'This is an exciting and fantastic opportunity with amazing results';
            const result = analyzer.analyzeEmotionalTone(positiveText);
            expect(result).toBeGreaterThan(0.5);
        });

        it('should handle mixed emotional content', () => {
            const mixedText = 'This is exciting progress, but we face challenging issues that are difficult';
            const result = analyzer.analyzeEmotionalTone(mixedText);
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThan(1);
        });

        it('should return low score for neutral content', () => {
            const neutralText = 'This is factual information about the current status and details';
            const result = analyzer.analyzeEmotionalTone(neutralText);
            expect(result).toBeLessThan(0.5);
        });
    });

    describe('enhance', () => {
        it('should enhance content with low emotional score', async () => {
            // Arrange
            const content = {
                text: 'Complete the task according to requirements',
                agentType: 'personal-todos'
            };

            // Act
            const result = await analyzer.enhance(content, {});

            // Assert
            expect(result.improved).toBe(true);
            expect(result.text).not.toBe(content.text);
            expect(result.changes).toContain('added_emotional_language');
        });

        it('should not modify content with high emotional score', async () => {
            // Arrange
            const content = {
                text: 'I am thrilled and excited to tackle this amazing challenge!'
            };

            // Act
            const result = await analyzer.enhance(content, {});

            // Assert
            expect(result.improved).toBe(false);
            expect(result.text).toBe(content.text);
            expect(result.changes).toHaveLength(0);
        });

        it('should add appropriate emotional language for different agent types', async () => {
            // Arrange
            const agentTypes = ['personal-todos', 'meeting-prep', 'agent-ideas'];
            
            for (const agentType of agentTypes) {
                const content = { text: 'Basic content', agentType };
                
                // Act
                const result = await analyzer.enhance(content, {});
                
                // Assert
                expect(result.improved).toBe(true);
                expect(result.text).toContain('excited');
            }
        });
    });
});

describe('InteractivityEnhancer', () => {
    let enhancer;

    beforeEach(() => {
        enhancer = new InteractivityEnhancer();
    });

    describe('assess', () => {
        it('should assess interactive content highly', async () => {
            // Arrange
            const content = {
                text: 'What do you think about this approach? Let me know your feedback and thoughts on the proposal.'
            };

            // Act
            const result = await enhancer.assess(content);

            // Assert
            expect(result.score).toBeGreaterThan(0.7);
        });

        it('should identify missing interactivity elements', async () => {
            // Arrange
            const content = {
                text: 'This is a statement without any interactive elements.'
            };

            // Act
            const result = await enhancer.assess(content);

            // Assert
            expect(result.suggestions).toContain('Add questions to encourage interaction');
            expect(result.suggestions).toContain('Include call-to-action elements');
            expect(result.suggestions).toContain('Add engagement prompts');
        });
    });

    describe('enhance', () => {
        it('should add questions to non-interactive content', async () => {
            // Arrange
            const content = {
                text: 'I completed the project analysis',
                agentType: 'follow-ups'
            };

            // Act
            const result = await enhancer.enhance(content, {});

            // Assert
            expect(result.improved).toBe(true);
            expect(result.text).toContain('?');
            expect(result.changes).toContain('added_question');
        });

        it('should not modify already interactive content', async () => {
            // Arrange
            const content = {
                text: 'What are your thoughts on this approach? Let me know your feedback.',
                agentType: 'agent-ideas'
            };

            // Act
            const result = await enhancer.enhance(content, {});

            // Assert
            expect(result.improved).toBe(false);
            expect(result.text).toBe(content.text);
        });

        it('should generate relevant questions for different agent types', async () => {
            // Arrange
            const testCases = [
                { agentType: 'personal-todos', expected: 'prioritize' },
                { agentType: 'meeting-prep', expected: 'topics' },
                { agentType: 'agent-ideas', expected: 'thoughts' }
            ];

            for (const testCase of testCases) {
                const content = { text: 'Non-interactive content', agentType: testCase.agentType };
                
                // Act
                const result = await enhancer.enhance(content, {});
                
                // Assert
                expect(result.improved).toBe(true);
                expect(result.text.toLowerCase()).toContain(testCase.expected);
            }
        });
    });
});

describe('PersonalizationEngine', () => {
    let engine;

    beforeEach(() => {
        engine = new PersonalizationEngine();
    });

    describe('assess', () => {
        it('should assess personalized content highly', async () => {
            // Arrange
            const content = {
                text: 'Hi Alice, given your role as Product Manager, this frontend development project aligns with your current goals'
            };
            const userData = {
                name: 'Alice',
                role: 'Product Manager',
                currentGoals: ['frontend development', 'user experience']
            };

            // Act
            const result = await engine.assess(content, userData);

            // Assert
            expect(result.score).toBeGreaterThan(0.7);
        });

        it('should suggest personalization when userData is missing', async () => {
            // Arrange
            const content = { text: 'Generic content' };
            const userData = {};

            // Act
            const result = await engine.assess(content, userData);

            // Assert
            expect(result.suggestions).toContain('Add user context for better personalization');
        });

        it('should assess context relevance correctly', async () => {
            // Arrange
            const content = { text: 'Working on the mobile app project' };
            const userData = {
                currentProjects: ['mobile app', 'api integration'],
                interests: ['mobile development']
            };

            // Act
            const result = await engine.assess(content, userData);

            // Assert
            expect(result.score).toBeGreaterThan(0.5);
        });
    });

    describe('personalize', () => {
        it('should add personal greeting when missing', async () => {
            // Arrange
            const content = { text: 'Here is the project update' };
            const userData = { name: 'Bob' };

            // Act
            const result = await engine.personalize(content, userData);

            // Assert
            expect(result.improved).toBe(true);
            expect(result.text).toMatch(/^(Hi|Hello|Hey) Bob!/);
            expect(result.changes).toContain('added_personal_greeting');
        });

        it('should add role context when relevant', async () => {
            // Arrange
            const content = { text: 'This update is important' };
            const userData = { role: 'Engineer' };

            // Act
            const result = await engine.personalize(content, userData);

            // Assert
            expect(result.improved).toBe(true);
            expect(result.text).toContain('Engineer');
            expect(result.changes).toContain('added_role_context');
        });

        it('should not modify already personalized content', async () => {
            // Arrange
            const content = { text: 'Hello Sarah! As a Designer, you\'ll find this relevant.' };
            const userData = { name: 'Sarah', role: 'Designer' };

            // Act
            const result = await engine.personalize(content, userData);

            // Assert
            expect(result.improved).toBe(false);
            expect(result.text).toBe(content.text);
        });
    });
});

describe('StructuralOptimizer', () => {
    let optimizer;

    beforeEach(() => {
        optimizer = new StructuralOptimizer();
    });

    describe('assess', () => {
        it('should assess well-structured content highly', async () => {
            // Arrange
            const content = {
                text: `**Project Update**
                
                We made significant progress this week. The team completed three major milestones.
                
                **Next Steps**
                • Finalize testing
                • Deploy to staging
                • Schedule user review`
            };

            // Act
            const result = await optimizer.assess(content);

            // Assert
            expect(result.score).toBeGreaterThan(0.7);
        });

        it('should identify structural improvements needed', async () => {
            // Arrange
            const content = {
                text: 'This is a very long paragraph without any structure or formatting which makes it difficult to read and understand the main points being communicated and could really benefit from better organization and visual hierarchy to help readers process the information more effectively'
            };

            // Act
            const result = await optimizer.assess(content);

            // Assert
            expect(result.suggestions).toContain('Improve paragraph structure');
            expect(result.suggestions).toContain('Add formatting for better readability');
        });
    });

    describe('optimize', () => {
        it('should improve paragraph structure for long content', async () => {
            // Arrange
            const content = {
                text: 'Sentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six. Sentence seven. Sentence eight. Sentence nine.'
            };

            // Act
            const result = await optimizer.optimize(content);

            // Assert
            expect(result.improved).toBe(true);
            expect(result.text.split('\n\n')).toHaveLength(2); // Should be broken into paragraphs
            expect(result.changes).toContain('improved_paragraphs');
        });

        it('should add formatting to improve readability', async () => {
            // Arrange
            const content = {
                text: 'Project Status\nFirst we completed the analysis\nSecond we designed the solution\nFinally we implemented the changes',
                agentType: 'follow-ups'
            };

            // Act
            const result = await optimizer.optimize(content);

            // Assert
            expect(result.improved).toBe(true);
            expect(result.text).toContain('**Project Status**'); // Should add header formatting
            expect(result.text).toContain('•'); // Should format as list
            expect(result.changes).toContain('added_formatting');
        });

        it('should not modify well-structured content', async () => {
            // Arrange
            const content = {
                text: `**Well Structured**
                
                This content has good structure with proper formatting.
                
                • Clear list items
                • Good organization
                • Readable format`
            };

            // Act
            const result = await optimizer.optimize(content);

            // Assert
            expect(result.improved).toBe(false);
            expect(result.text).toBe(content.text);
        });
    });
});

describe('EngagementPredictor', () => {
    let predictor;

    beforeEach(() => {
        predictor = new EngagementPredictor();
    });

    describe('predict', () => {
        it('should generate comprehensive engagement prediction', async () => {
            // Arrange
            const content = { text: 'Test content', agentType: 'agent-ideas' };
            const currentEngagement = { score: 0.8 };
            const context = { postingTime: new Date(), userActivity: 'high' };

            // Act
            const result = await predictor.predict(content, currentEngagement, context);

            // Assert
            expect(result.score).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.factors).toBeInstanceOf(Array);
            expect(result.expectedInteractions).toBeGreaterThan(0);
            expect(result.recommendations).toBeInstanceOf(Array);
        });

        it('should predict higher interactions for idea content', async () => {
            // Arrange
            const ideaContent = { agentType: 'agent-ideas' };
            const todoContent = { agentType: 'personal-todos' };
            const engagement = { score: 0.7 };

            // Act
            const ideaResult = await predictor.predict(ideaContent, engagement, {});
            const todoResult = await predictor.predict(todoContent, engagement, {});

            // Assert
            expect(ideaResult.expectedInteractions).toBeGreaterThan(todoResult.expectedInteractions);
        });

        it('should adjust prediction based on context factors', async () => {
            // Arrange
            const content = { agentType: 'personal-todos' };
            const engagement = { score: 0.6 };
            const highActivityContext = { userActivity: 'high', feedHealth: 0.8 };
            const lowActivityContext = { userActivity: 'low', feedHealth: 0.3 };

            // Act
            const highResult = await predictor.predict(content, engagement, highActivityContext);
            const lowResult = await predictor.predict(content, engagement, lowActivityContext);

            // Assert
            expect(highResult.score).toBeGreaterThan(lowResult.score);
        });

        it('should generate recommendations for low engagement', async () => {
            // Arrange
            const content = { agentType: 'personal-todos' };
            const lowEngagement = { score: 0.3 };

            // Act
            const result = await predictor.predict(content, lowEngagement, {});

            // Assert
            expect(result.recommendations.length).toBeGreaterThan(0);
            expect(result.recommendations.some(r => r.type === 'optimization')).toBe(true);
        });
    });

    describe('predictInteractions', () => {
        it('should scale interactions with engagement score', () => {
            const highEngagement = { score: 0.9 };
            const lowEngagement = { score: 0.3 };
            const content = { agentType: 'personal-todos' };

            const highResult = predictor.predictInteractions(content, highEngagement, {});
            const lowResult = predictor.predictInteractions(content, lowEngagement, {});

            expect(highResult).toBeGreaterThan(lowResult);
        });

        it('should apply content type multipliers', () => {
            const engagement = { score: 0.7 };
            const ideaContent = { agentType: 'agent-ideas' };
            const todoContent = { agentType: 'personal-todos' };

            const ideaResult = predictor.predictInteractions(ideaContent, engagement, {});
            const todoResult = predictor.predictInteractions(todoContent, engagement, {});

            expect(ideaResult).toBeGreaterThan(todoResult);
        });
    });

    describe('assessTimingImpact', () => {
        it('should favor business hours', () => {
            const businessHour = new Date('2024-03-15T14:00:00Z'); // 2 PM
            const offHour = new Date('2024-03-15T23:00:00Z'); // 11 PM

            const businessResult = predictor.assessTimingImpact(businessHour);
            const offResult = predictor.assessTimingImpact(offHour);

            expect(businessResult).toBeGreaterThan(offResult);
        });

        it('should give moderate scores to early/late work hours', () => {
            const earlyHour = new Date('2024-03-15T08:00:00Z'); // 8 AM
            const lateHour = new Date('2024-03-15T18:00:00Z'); // 6 PM

            const earlyResult = predictor.assessTimingImpact(earlyHour);
            const lateResult = predictor.assessTimingImpact(lateHour);

            expect(earlyResult).toBe(0.6);
            expect(lateResult).toBe(0.6);
        });
    });
});

describe('Performance and Integration Tests', () => {
    let optimizer;

    beforeEach(() => {
        optimizer = new EngagementOptimizer();
    });

    it('should complete optimization within performance requirements', async () => {
        // Arrange
        const content = { text: 'Test content for optimization', agentType: 'personal-todos' };
        const qualityMetrics = { overallScore: 0.6 };
        const context = { userData: { name: 'Alice' } };

        // Act
        const startTime = Date.now();
        const result = await optimizer.optimizeForEngagement(content, qualityMetrics, context);
        const duration = Date.now() - startTime;

        // Assert
        expect(duration).toBeLessThan(200); // Should complete within 200ms
        expect(result.processingTime).toBeLessThan(200);
    });

    it('should handle batch optimization efficiently', async () => {
        // Arrange
        const contents = Array(5).fill().map((_, i) => ({
            text: `Content ${i} for batch optimization testing`,
            agentType: 'personal-todos'
        }));

        // Act
        const startTime = Date.now();
        const results = await Promise.all(
            contents.map(content => optimizer.optimizeForEngagement(content, { overallScore: 0.6 }, {}))
        );
        const duration = Date.now() - startTime;

        // Assert
        expect(results).toHaveLength(5);
        expect(duration).toBeLessThan(1000); // 5 optimizations in under 1 second
        results.forEach(result => {
            expect(result.engagementScore).toBeDefined();
            expect(result.optimizationSteps).toBeDefined();
        });
    });

    it('should maintain consistency in optimization results', async () => {
        // Arrange
        const content = { text: 'Consistent test content', agentType: 'personal-todos' };
        const qualityMetrics = { overallScore: 0.7 };
        const context = {};

        // Act
        const results = await Promise.all([
            optimizer.optimizeForEngagement(content, qualityMetrics, context),
            optimizer.optimizeForEngagement(content, qualityMetrics, context),
            optimizer.optimizeForEngagement(content, qualityMetrics, context)
        ]);

        // Assert
        const scores = results.map(r => r.engagementScore);
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - scores[0], 2), 0) / scores.length;
        expect(variance).toBeLessThan(0.1); // Should be reasonably consistent
    });
});