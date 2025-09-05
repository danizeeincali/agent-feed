/**
 * Comprehensive Test Suite for Quality Assessment System
 * London School TDD - Focus on behavior verification
 */

const { jest } = require('@jest/globals');
const {
    QualityAssessmentSystem,
    ClarityAnalyzer,
    StructureAnalyzer,
    RelevanceAnalyzer,
    ActionabilityAnalyzer,
    CompletenessAnalyzer,
    ReadabilityAnalyzer,
    QualityAssessmentError
} = require('../../posting-intelligence/quality-assessment');

describe('QualityAssessmentSystem', () => {
    let qualitySystem;
    let mockClarityAnalyzer;
    let mockStructureAnalyzer;
    let mockRelevanceAnalyzer;
    let mockActionabilityAnalyzer;
    let mockCompletenessAnalyzer;
    let mockReadabilityAnalyzer;

    beforeEach(() => {
        // Mock all analyzer dependencies
        mockClarityAnalyzer = {
            analyze: jest.fn()
        };
        mockStructureAnalyzer = {
            analyze: jest.fn()
        };
        mockRelevanceAnalyzer = {
            analyze: jest.fn()
        };
        mockActionabilityAnalyzer = {
            analyze: jest.fn()
        };
        mockCompletenessAnalyzer = {
            analyze: jest.fn()
        };
        mockReadabilityAnalyzer = {
            analyze: jest.fn()
        };

        qualitySystem = new QualityAssessmentSystem();
        
        // Inject mocks
        qualitySystem.clarityAnalyzer = mockClarityAnalyzer;
        qualitySystem.structureAnalyzer = mockStructureAnalyzer;
        qualitySystem.relevanceAnalyzer = mockRelevanceAnalyzer;
        qualitySystem.actionabilityAnalyzer = mockActionabilityAnalyzer;
        qualitySystem.completenessAnalyzer = mockCompletenessAnalyzer;
        qualitySystem.readabilityAnalyzer = mockReadabilityAnalyzer;
    });

    describe('assessContent', () => {
        it('should assess content across all quality dimensions', async () => {
            // Arrange
            const content = { text: 'Sample content for assessment' };
            const impactAnalysis = { score: 0.8, factors: {} };

            const mockDimensionResults = {
                clarity: { score: 0.85, insights: ['Clear language'], suggestions: [] },
                structure: { score: 0.75, insights: [], suggestions: ['Add headers'] },
                relevance: { score: 0.90, insights: ['Highly relevant'], suggestions: [] },
                actionability: { score: 0.70, insights: [], suggestions: ['Add specific actions'] },
                completeness: { score: 0.80, insights: [], suggestions: [] },
                readability: { score: 0.88, insights: ['Easy to read'], suggestions: [] }
            };

            mockClarityAnalyzer.analyze.mockResolvedValue(mockDimensionResults.clarity);
            mockStructureAnalyzer.analyze.mockResolvedValue(mockDimensionResults.structure);
            mockRelevanceAnalyzer.analyze.mockResolvedValue(mockDimensionResults.relevance);
            mockActionabilityAnalyzer.analyze.mockResolvedValue(mockDimensionResults.actionability);
            mockCompletenessAnalyzer.analyze.mockResolvedValue(mockDimensionResults.completeness);
            mockReadabilityAnalyzer.analyze.mockResolvedValue(mockDimensionResults.readability);

            // Act
            const result = await qualitySystem.assessContent(content, impactAnalysis);

            // Assert
            expect(mockClarityAnalyzer.analyze).toHaveBeenCalledWith(content);
            expect(mockStructureAnalyzer.analyze).toHaveBeenCalledWith(content);
            expect(mockRelevanceAnalyzer.analyze).toHaveBeenCalledWith(content, impactAnalysis);
            expect(mockActionabilityAnalyzer.analyze).toHaveBeenCalledWith(content);
            expect(mockCompletenessAnalyzer.analyze).toHaveBeenCalledWith(content);
            expect(mockReadabilityAnalyzer.analyze).toHaveBeenCalledWith(content);

            expect(result.overallScore).toBeCloseTo(0.812); // Weighted average
            expect(result.grade).toBe('Good');
            expect(result.dimensions).toEqual(mockDimensionResults);
            expect(result.processingTime).toBeDefined();
            expect(result.assessedAt).toBeDefined();
        });

        it('should calculate weighted overall score correctly', async () => {
            // Arrange
            const content = { text: 'Test content' };
            const mockResults = {
                clarity: { score: 1.0 },
                structure: { score: 0.8 },
                relevance: { score: 0.6 },
                actionability: { score: 0.4 },
                completeness: { score: 0.2 },
                readability: { score: 0.0 }
            };

            Object.keys(mockResults).forEach(key => {
                qualitySystem[`${key}Analyzer`].analyze.mockResolvedValue(mockResults[key]);
            });

            // Act
            const result = await qualitySystem.assessContent(content);

            // Assert
            // Expected: 1.0*0.25 + 0.8*0.20 + 0.6*0.20 + 0.4*0.15 + 0.2*0.10 + 0.0*0.10 = 0.63
            expect(result.overallScore).toBeCloseTo(0.63, 2);
        });

        it('should handle errors gracefully', async () => {
            // Arrange
            const content = { text: 'Test content' };
            mockClarityAnalyzer.analyze.mockRejectedValue(new Error('Clarity analysis failed'));

            // Act & Assert
            await expect(qualitySystem.assessContent(content))
                .rejects.toThrow(QualityAssessmentError);
            await expect(qualitySystem.assessContent(content))
                .rejects.toThrow('Failed to assess content quality');
        });

        it('should generate quality insights based on scores', async () => {
            // Arrange
            const content = { text: 'Test content' };
            const highScoreResults = {
                clarity: { score: 0.9, insights: ['Excellent clarity'] },
                structure: { score: 0.3, suggestions: ['Poor structure'] },
                relevance: { score: 0.7 },
                actionability: { score: 0.6 },
                completeness: { score: 0.8 },
                readability: { score: 0.7 }
            };

            Object.keys(highScoreResults).forEach(key => {
                qualitySystem[`${key}Analyzer`].analyze.mockResolvedValue(highScoreResults[key]);
            });

            // Act
            const result = await qualitySystem.assessContent(content);

            // Assert
            const strengthInsights = result.insights.filter(i => i.type === 'strength');
            const weaknessInsights = result.insights.filter(i => i.type === 'weakness');
            
            expect(strengthInsights).toHaveLength(1);
            expect(strengthInsights[0].dimension).toBe('clarity');
            expect(weaknessInsights).toHaveLength(1);
            expect(weaknessInsights[0].dimension).toBe('structure');
        });

        it('should identify improvements with proper prioritization', async () => {
            // Arrange
            const content = { text: 'Test content' };
            const resultsWithSuggestions = {
                clarity: { score: 0.2, suggestions: ['Critical clarity issues'] }, // High priority
                structure: { score: 0.4, suggestions: ['Structure improvements'] }, // Medium priority
                relevance: { score: 0.7, suggestions: ['Minor relevance tweaks'] }, // Low priority
                actionability: { score: 0.8 },
                completeness: { score: 0.9 },
                readability: { score: 0.6 }
            };

            Object.keys(resultsWithSuggestions).forEach(key => {
                qualitySystem[`${key}Analyzer`].analyze.mockResolvedValue(resultsWithSuggestions[key]);
            });

            // Act
            const result = await qualitySystem.assessContent(content);

            // Assert
            expect(result.improvements).toHaveLength(3);
            expect(result.improvements[0].priority).toBe('high'); // Lowest score first
            expect(result.improvements[0].dimension).toBe('clarity');
            expect(result.improvements[1].priority).toBe('medium');
            expect(result.improvements[2].priority).toBe('low');
        });

        it('should create detailed quality breakdown', async () => {
            // Arrange
            const content = { text: 'Test content' };
            const mockResults = {
                clarity: { score: 0.8, details: { sentenceComplexity: 0.9 } },
                structure: { score: 0.7 },
                relevance: { score: 0.9 },
                actionability: { score: 0.6 },
                completeness: { score: 0.5 },
                readability: { score: 0.8 }
            };

            Object.keys(mockResults).forEach(key => {
                qualitySystem[`${key}Analyzer`].analyze.mockResolvedValue(mockResults[key]);
            });

            // Act
            const result = await qualitySystem.assessContent(content);

            // Assert
            expect(result.breakdown.clarity).toEqual({
                score: 0.8,
                weight: 0.25,
                contribution: 0.2,
                grade: 'Good',
                details: { sentenceComplexity: 0.9 }
            });
            expect(result.breakdown.structure.contribution).toBeCloseTo(0.14); // 0.7 * 0.2
        });
    });

    describe('batchAssess', () => {
        it('should assess multiple contents and provide batch analytics', async () => {
            // Arrange
            const contents = [
                { text: 'Content 1' },
                { text: 'Content 2' },
                { text: 'Content 3' }
            ];

            const mockResults = {
                clarity: { score: 0.8 },
                structure: { score: 0.7 },
                relevance: { score: 0.6 },
                actionability: { score: 0.5 },
                completeness: { score: 0.4 },
                readability: { score: 0.9 }
            };

            Object.keys(mockResults).forEach(key => {
                qualitySystem[`${key}Analyzer`].analyze.mockResolvedValue(mockResults[key]);
            });

            // Act
            const result = await qualitySystem.batchAssess(contents);

            // Assert
            expect(result.assessments).toHaveLength(3);
            expect(result.batchAnalytics.count).toBe(3);
            expect(result.batchAnalytics.averageScore).toBeDefined();
            expect(result.batchAnalytics.scoreDistribution).toBeDefined();
            expect(result.batchAnalytics.dimensionAverages).toBeDefined();
            expect(result.totalProcessingTime).toBeDefined();
        });

        it('should calculate score distribution correctly', async () => {
            // Arrange
            const contents = [
                { text: 'Excellent content' }, // Will score 0.65
                { text: 'Poor content' }       // Will score 0.65
            ];

            const mockResults = {
                clarity: { score: 0.8 },
                structure: { score: 0.7 },
                relevance: { score: 0.6 },
                actionability: { score: 0.5 },
                completeness: { score: 0.4 },
                readability: { score: 0.9 }
            };

            Object.keys(mockResults).forEach(key => {
                qualitySystem[`${key}Analyzer`].analyze.mockResolvedValue(mockResults[key]);
            });

            // Act
            const result = await qualitySystem.batchAssess(contents);

            // Assert
            const distribution = result.batchAnalytics.scoreDistribution;
            expect(distribution.acceptable).toBe(2); // Both should fall in acceptable range
            expect(distribution.excellent).toBe(0);
            expect(distribution.good).toBe(0);
            expect(distribution.poor).toBe(0);
        });
    });

    describe('getQualityGrade', () => {
        it('should assign correct quality grades', () => {
            expect(qualitySystem.getQualityGrade(0.95)).toBe('Excellent');
            expect(qualitySystem.getQualityGrade(0.75)).toBe('Good');
            expect(qualitySystem.getQualityGrade(0.55)).toBe('Acceptable');
            expect(qualitySystem.getQualityGrade(0.35)).toBe('Poor');
            expect(qualitySystem.getQualityGrade(0.15)).toBe('Very Poor');
        });
    });
});

describe('ClarityAnalyzer', () => {
    let clarityAnalyzer;

    beforeEach(() => {
        clarityAnalyzer = new ClarityAnalyzer();
    });

    describe('analyze', () => {
        it('should analyze clarity with high score for clear content', async () => {
            // Arrange
            const content = {
                text: 'This is a clear and concise sentence. It explains the topic well. The language is simple and direct.'
            };

            // Act
            const result = await clarityAnalyzer.analyze(content);

            // Assert
            expect(result.score).toBeGreaterThan(0.5);
            expect(result.details.sentenceComplexity).toBeDefined();
            expect(result.details.vocabularyClarity).toBeDefined();
            expect(result.details.ambiguity).toBeDefined();
        });

        it('should analyze clarity with low score for complex content', async () => {
            // Arrange
            const content = {
                text: 'Utilizing sophisticated methodologies to facilitate the optimization of operational synergies through strategic leveraging of innovative paradigms that will maximize the utilization of resources while simultaneously addressing the multifaceted challenges inherent in contemporary business environments.'
            };

            // Act
            const result = await clarityAnalyzer.analyze(content);

            // Assert
            expect(result.score).toBeLessThan(0.7);
            expect(result.suggestions).toContain('Replace complex jargon with simpler, clearer language');
        });

        it('should detect ambiguous language', async () => {
            // Arrange
            const content = {
                text: 'It is important that this thing gets done. They need to handle that stuff over there.'
            };

            // Act
            const result = await clarityAnalyzer.analyze(content);

            // Assert
            expect(result.suggestions).toContain('Reduce ambiguous pronouns and references');
        });
    });

    describe('assessSentenceComplexity', () => {
        it('should rate optimal sentence length highly', () => {
            const result = clarityAnalyzer.assessSentenceComplexity(17); // Optimal range 15-20
            expect(result).toBe(1.0);
        });

        it('should penalize very long sentences', () => {
            const result = clarityAnalyzer.assessSentenceComplexity(35);
            expect(result).toBeLessThan(0.6);
        });

        it('should penalize very short sentences', () => {
            const result = clarityAnalyzer.assessSentenceComplexity(5);
            expect(result).toBeLessThan(0.6);
        });
    });

    describe('assessVocabularyClarity', () => {
        it('should penalize complex vocabulary', () => {
            const complexText = 'We must utilize these methodologies to facilitate optimization and leverage synergies';
            const result = clarityAnalyzer.assessVocabularyClarity(complexText);
            expect(result).toBeLessThan(1.0);
        });

        it('should reward simple vocabulary', () => {
            const simpleText = 'We need to use these methods to improve results and work together';
            const result = clarityAnalyzer.assessVocabularyClarity(simpleText);
            expect(result).toBeGreaterThan(0.8);
        });
    });
});

describe('StructureAnalyzer', () => {
    let structureAnalyzer;

    beforeEach(() => {
        structureAnalyzer = new StructureAnalyzer();
    });

    describe('analyze', () => {
        it('should analyze well-structured content positively', async () => {
            // Arrange
            const content = {
                text: `**Introduction**
                
                This document outlines the key points. Therefore, we will cover three main areas.
                
                **Main Points**
                • First important point
                • Second critical item
                • Third essential element
                
                **Conclusion**
                Furthermore, these points lead to clear next steps.`
            };

            // Act
            const result = await structureAnalyzer.analyze(content);

            // Assert
            expect(result.score).toBeGreaterThan(0.7);
            expect(result.details.formatting).toBeGreaterThan(0.7);
            expect(result.details.hierarchy).toBeGreaterThan(0.7);
        });

        it('should identify poor structure', async () => {
            // Arrange
            const content = {
                text: 'This is just a long paragraph with no structure or formatting and no clear organization or logical flow between ideas which makes it hard to follow and understand the main points being communicated to the reader.'
            };

            // Act
            const result = await structureAnalyzer.analyze(content);

            // Assert
            expect(result.score).toBeLessThan(0.6);
            expect(result.suggestions).toContain('Add transition words to improve flow between ideas');
            expect(result.suggestions).toContain('Use headers, bullets, or formatting to improve readability');
        });
    });

    describe('assessLogicalFlow', () => {
        it('should detect transition words', () => {
            const textWithTransitions = 'First, we analyze the data. However, there are challenges. Therefore, we need alternatives. Furthermore, we should consider other options.';
            const result = structureAnalyzer.assessLogicalFlow(textWithTransitions);
            expect(result).toBeGreaterThan(0.5);
        });

        it('should detect lack of transitions', () => {
            const textWithoutTransitions = 'We analyze data. There are challenges. We need alternatives. We should consider options.';
            const result = structureAnalyzer.assessLogicalFlow(textWithoutTransitions);
            expect(result).toBeLessThan(0.5);
        });
    });

    describe('assessFormatting', () => {
        it('should detect headers', () => {
            const textWithHeaders = '**Main Header** Content here # Another Header More content';
            const result = structureAnalyzer.assessFormatting(textWithHeaders);
            expect(result).toBeGreaterThan(0.8);
        });

        it('should detect lists', () => {
            const textWithLists = 'Items: • First item • Second item 1. Numbered item';
            const result = structureAnalyzer.assessFormatting(textWithLists);
            expect(result).toBeGreaterThan(0.7);
        });

        it('should give low score for plain text', () => {
            const plainText = 'Just plain text with no formatting at all';
            const result = structureAnalyzer.assessFormatting(plainText);
            expect(result).toBeLessThan(0.6);
        });
    });
});

describe('RelevanceAnalyzer', () => {
    let relevanceAnalyzer;

    beforeEach(() => {
        relevanceAnalyzer = new RelevanceAnalyzer();
    });

    describe('analyze', () => {
        it('should analyze business-relevant content highly', async () => {
            // Arrange
            const content = {
                text: 'This initiative will drive revenue growth by improving customer satisfaction and expanding our market presence',
                agentType: 'personal-todos'
            };
            const impactAnalysis = { score: 0.9 };

            // Act
            const result = await relevanceAnalyzer.analyze(content, impactAnalysis);

            // Assert
            expect(result.score).toBeGreaterThan(0.6);
            expect(result.details.businessRelevance).toBeGreaterThan(0.5);
        });

        it('should detect context relevance based on agent type', async () => {
            // Arrange
            const content = {
                text: 'Prepare agenda for tomorrow\'s meeting and discuss key objectives',
                agentType: 'meeting-prep'
            };

            // Act
            const result = await relevanceAnalyzer.analyze(content);

            // Assert
            expect(result.details.contextRelevance).toBeGreaterThan(0.5);
        });

        it('should suggest improvements for low relevance', async () => {
            // Arrange
            const content = {
                text: 'Just some random thoughts without clear business connection'
            };

            // Act
            const result = await relevanceAnalyzer.analyze(content);

            // Assert
            expect(result.suggestions).toContain('Connect content more clearly to business impact and objectives');
        });
    });

    describe('assessBusinessRelevance', () => {
        it('should use impact analysis score as base', () => {
            const text = 'Simple content';
            const impactAnalysis = { score: 0.8 };
            const result = relevanceAnalyzer.assessBusinessRelevance(text, impactAnalysis);
            expect(result).toBeGreaterThan(0.5);
        });

        it('should bonus for business keywords', () => {
            const businessText = 'This will improve revenue and help customers in the market';
            const impactAnalysis = { score: 0.5 };
            const result = relevanceAnalyzer.assessBusinessRelevance(businessText, impactAnalysis);
            expect(result).toBeGreaterThan(0.5);
        });
    });

    describe('assessContextRelevance', () => {
        it('should match agent type keywords', () => {
            const content = {
                text: 'Schedule meeting and prepare agenda for discussion',
                agentType: 'meeting-prep'
            };
            const result = relevanceAnalyzer.assessContextRelevance(content.text, content);
            expect(result).toBeGreaterThan(0.5);
        });

        it('should default for unknown agent type', () => {
            const content = {
                text: 'Some content',
                agentType: 'unknown-type'
            };
            const result = relevanceAnalyzer.assessContextRelevance(content.text, content);
            expect(result).toBe(0);
        });
    });
});

describe('ActionabilityAnalyzer', () => {
    let actionabilityAnalyzer;

    beforeEach(() => {
        actionabilityAnalyzer = new ActionabilityAnalyzer();
    });

    describe('analyze', () => {
        it('should rate actionable content highly', async () => {
            // Arrange
            const content = {
                text: 'Create the new user interface by Friday, review the design with the team, and implement the feedback by 3/15/2024'
            };

            // Act
            const result = await actionabilityAnalyzer.analyze(content);

            // Assert
            expect(result.score).toBeGreaterThan(0.5);
            expect(result.details.actionWords).toBeGreaterThan(0);
            expect(result.details.specificity).toBeGreaterThan(0);
            expect(result.details.timelineClarity).toBeGreaterThan(0);
        });

        it('should suggest improvements for vague content', async () => {
            // Arrange
            const content = {
                text: 'Think about the project and maybe consider some options for improvement'
            };

            // Act
            const result = await actionabilityAnalyzer.analyze(content);

            // Assert
            expect(result.suggestions).toContain('Include more specific action verbs and clear directives');
            expect(result.suggestions).toContain('Add specific details like dates, numbers, or concrete examples');
            expect(result.suggestions).toContain('Clarify timelines and deadlines for better actionability');
        });
    });

    describe('assessActionWords', () => {
        it('should detect action verbs', () => {
            const actionText = 'Create, develop, implement, and execute the plan';
            const result = actionabilityAnalyzer.assessActionWords(actionText);
            expect(result).toBeGreaterThan(0.5);
        });

        it('should return low score for passive content', () => {
            const passiveText = 'There might be some considerations about possibilities';
            const result = actionabilityAnalyzer.assessActionWords(passiveText);
            expect(result).toBeLessThan(0.3);
        });
    });

    describe('assessSpecificity', () => {
        it('should detect specific details', () => {
            const specificText = 'Complete by 3/15/2024, allocate $5000 budget, work 8 hours per day';
            const result = actionabilityAnalyzer.assessSpecificity(specificText);
            expect(result).toBeGreaterThan(0.3);
        });

        it('should return low score for vague content', () => {
            const vague.text = 'Do some work on the thing';
            const result = actionabilityAnalyzer.assessSpecificity(vague.text);
            expect(result).toBeLessThan(0.3);
        });
    });
});

describe('CompletenessAnalyzer', () => {
    let completenessAnalyzer;

    beforeEach(() => {
        completenessAnalyzer = new CompletenessAnalyzer();
    });

    describe('analyze', () => {
        it('should assess personal-todos completeness', async () => {
            // Arrange
            const content = {
                text: 'What: Implement user auth. Why: Security requirements. When: By March 15. How: Use OAuth2 integration.',
                agentType: 'personal-todos'
            };

            // Act
            const result = await completenessAnalyzer.analyze(content);

            // Assert
            expect(result.score).toBeGreaterThan(0.7);
            expect(result.details.informationCompleteness).toBeGreaterThan(0.7);
        });

        it('should assess meeting-next-steps completeness', async () => {
            // Arrange
            const content = {
                text: 'Meeting summary: Discussed project timeline. Actions: Create detailed plan. Decisions: Approved budget. Timeline: Complete by end of month.',
                agentType: 'meeting-next-steps'
            };

            // Act
            const result = await completenessAnalyzer.analyze(content);

            // Assert
            expect(result.score).toBeGreaterThan(0.6);
        });

        it('should suggest improvements for incomplete content', async () => {
            // Arrange
            const content = {
                text: 'Just a brief note without much detail',
                agentType: 'personal-todos'
            };

            // Act
            const result = await completenessAnalyzer.analyze(content);

            // Assert
            expect(result.suggestions).toContain('Include all essential information elements for this content type');
        });
    });
});

describe('ReadabilityAnalyzer', () => {
    let readabilityAnalyzer;

    beforeEach(() => {
        readabilityAnalyzer = new ReadabilityAnalyzer();
    });

    describe('analyze', () => {
        it('should assess readable content positively', async () => {
            // Arrange
            const content = {
                text: 'This is easy to read. The sentences are short. Words are simple. The content flows well.'
            };

            // Act
            const result = await readabilityAnalyzer.analyze(content);

            // Assert
            expect(result.score).toBeGreaterThan(0.6);
            expect(result.details.fleschScore).toBeDefined();
            expect(result.details.wordComplexity).toBeDefined();
            expect(result.details.sentenceVariation).toBeDefined();
        });

        it('should suggest improvements for complex text', async () => {
            // Arrange
            const content = {
                text: 'The implementation of sophisticated algorithmic methodologies requires comprehensive understanding of multidimensional optimization paradigms that necessitate extensive computational resources and specialized expertise in advanced mathematical frameworks.'
            };

            // Act
            const result = await readabilityAnalyzer.analyze(content);

            // Assert
            expect(result.suggestions).toContain('Simplify sentence structure and vocabulary for better readability');
        });
    });

    describe('calculateFleschReadability', () => {
        it('should calculate Flesch score for simple text', () => {
            const simpleText = 'The cat sat on the mat. It was warm.';
            const score = readabilityAnalyzer.calculateFleschReadability(simpleText);
            expect(score).toBeGreaterThan(60); // Should be fairly readable
        });

        it('should calculate Flesch score for complex text', () => {
            const complexText = 'The implementation necessitates comprehensive understanding of multidimensional optimization paradigms.';
            const score = readabilityAnalyzer.calculateFleschReadability(complexText);
            expect(score).toBeLessThan(60); // Should be more difficult
        });
    });

    describe('countSyllables', () => {
        it('should count syllables correctly', () => {
            expect(readabilityAnalyzer.countSyllables('cat')).toBe(1);
            expect(readabilityAnalyzer.countSyllables('hello')).toBe(2);
            expect(readabilityAnalyzer.countSyllables('beautiful')).toBe(3);
            expect(readabilityAnalyzer.countSyllables('understanding')).toBe(4);
        });

        it('should handle edge cases', () => {
            expect(readabilityAnalyzer.countSyllables('a')).toBe(1);
            expect(readabilityAnalyzer.countSyllables('the')).toBe(1);
            expect(readabilityAnalyzer.countSyllables('queue')).toBe(1);
        });
    });
});

describe('Integration and Performance Tests', () => {
    let qualitySystem;

    beforeEach(() => {
        qualitySystem = new QualityAssessmentSystem();
    });

    it('should complete assessment within performance requirements', async () => {
        // Arrange
        const content = {
            text: 'This is a comprehensive test of the quality assessment system with multiple sentences and varied complexity to ensure the system can handle realistic content within the required timeframe.'
        };

        // Act
        const startTime = Date.now();
        const result = await qualitySystem.assessContent(content);
        const duration = Date.now() - startTime;

        // Assert
        expect(duration).toBeLessThan(100); // Should complete within 100ms
        expect(result.processingTime).toBeLessThan(100);
    });

    it('should handle batch processing efficiently', async () => {
        // Arrange
        const contents = Array(10).fill().map((_, i) => ({
            text: `Test content ${i} with various complexity levels and different lengths to simulate real usage scenarios`
        }));

        // Act
        const startTime = Date.now();
        const result = await qualitySystem.batchAssess(contents);
        const duration = Date.now() - startTime;

        // Assert
        expect(duration).toBeLessThan(1000); // Batch of 10 should complete within 1 second
        expect(result.assessments).toHaveLength(10);
        expect(result.batchAnalytics).toBeDefined();
    });

    it('should maintain consistency across multiple assessments', async () => {
        // Arrange
        const content = {
            text: 'Consistent content for repeated assessment to verify system reliability and deterministic behavior'
        };

        // Act
        const results = await Promise.all([
            qualitySystem.assessContent(content),
            qualitySystem.assessContent(content),
            qualitySystem.assessContent(content)
        ]);

        // Assert
        const scores = results.map(r => r.overallScore);
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - scores[0], 2), 0) / scores.length;
        expect(variance).toBeLessThan(0.01); // Should be highly consistent
    });
});