/**
 * Quality Assessment System
 * Comprehensive content quality analysis across multiple dimensions
 */

class QualityAssessmentSystem {
    constructor(config = {}) {
        this.config = {
            // Dimension weights (must sum to 1.0)
            weights: {
                clarity: 0.25,
                structure: 0.20,
                relevance: 0.20,
                actionability: 0.15,
                completeness: 0.10,
                readability: 0.10
            },
            // Quality thresholds
            thresholds: {
                excellent: 0.9,
                good: 0.8,
                acceptable: 0.6,
                poor: 0.4
            },
            // Performance target: <100ms per assessment
            performanceTarget: 100,
            ...config
        };

        this.clarityAnalyzer = new ClarityAnalyzer();
        this.structureAnalyzer = new StructureAnalyzer();
        this.relevanceAnalyzer = new RelevanceAnalyzer();
        this.actionabilityAnalyzer = new ActionabilityAnalyzer();
        this.completenessAnalyzer = new CompletenessAnalyzer();
        this.readabilityAnalyzer = new ReadabilityAnalyzer();
    }

    /**
     * Assess content quality across all dimensions
     */
    async assessContent(content, impactAnalysis = {}) {
        const startTime = Date.now();

        try {
            // Run all assessments in parallel for performance
            const [
                clarityResult,
                structureResult,
                relevanceResult,
                actionabilityResult,
                completenessResult,
                readabilityResult
            ] = await Promise.all([
                this.clarityAnalyzer.analyze(content),
                this.structureAnalyzer.analyze(content),
                this.relevanceAnalyzer.analyze(content, impactAnalysis),
                this.actionabilityAnalyzer.analyze(content),
                this.completenessAnalyzer.analyze(content),
                this.readabilityAnalyzer.analyze(content)
            ]);

            const dimensions = {
                clarity: clarityResult,
                structure: structureResult,
                relevance: relevanceResult,
                actionability: actionabilityResult,
                completeness: completenessResult,
                readability: readabilityResult
            };

            // Calculate weighted overall score
            const overallScore = this.calculateOverallScore(dimensions);
            const grade = this.getQualityGrade(overallScore);
            const processingTime = Date.now() - startTime;

            const assessment = {
                overallScore,
                grade,
                dimensions,
                breakdown: this.createDetailedBreakdown(dimensions),
                insights: this.generateInsights(dimensions),
                improvements: this.identifyImprovements(dimensions),
                processingTime,
                assessedAt: new Date().toISOString()
            };

            return assessment;

        } catch (error) {
            throw new QualityAssessmentError('Failed to assess content quality', error);
        }
    }

    /**
     * Calculate weighted overall quality score
     */
    calculateOverallScore(dimensions) {
        return Object.entries(dimensions).reduce((score, [dimension, result]) => {
            const weight = this.config.weights[dimension] || 0;
            return score + (result.score * weight);
        }, 0);
    }

    /**
     * Get quality grade based on score
     */
    getQualityGrade(score) {
        if (score >= this.config.thresholds.excellent) return 'Excellent';
        if (score >= this.config.thresholds.good) return 'Good';
        if (score >= this.config.thresholds.acceptable) return 'Acceptable';
        if (score >= this.config.thresholds.poor) return 'Poor';
        return 'Very Poor';
    }

    /**
     * Create detailed breakdown of quality assessment
     */
    createDetailedBreakdown(dimensions) {
        const breakdown = {};
        
        Object.entries(dimensions).forEach(([dimension, result]) => {
            const weight = this.config.weights[dimension];
            const contribution = result.score * weight;
            
            breakdown[dimension] = {
                score: result.score,
                weight,
                contribution,
                grade: this.getQualityGrade(result.score),
                ...(result.details && { details: result.details })
            };
        });
        
        return breakdown;
    }

    /**
     * Generate quality insights from dimension results
     */
    generateInsights(dimensions) {
        const insights = [];
        
        Object.entries(dimensions).forEach(([dimension, result]) => {
            if (result.score > 0.8) {
                insights.push({
                    type: 'strength',
                    dimension,
                    message: `Strong ${dimension} with score of ${(result.score * 100).toFixed(1)}%`,
                    insights: result.insights || []
                });
            } else if (result.score < 0.6) {
                insights.push({
                    type: 'weakness',
                    dimension,
                    message: `${dimension} needs improvement (${(result.score * 100).toFixed(1)}%)`,
                    suggestions: result.suggestions || []
                });
            }
        });
        
        return insights;
    }

    /**
     * Identify improvements with prioritization
     */
    identifyImprovements(dimensions) {
        const improvements = [];
        
        // Collect all suggestions with scores for prioritization
        Object.entries(dimensions).forEach(([dimension, result]) => {
            if (result.suggestions && result.suggestions.length > 0) {
                const priority = result.score < 0.4 ? 'high' : 
                               result.score < 0.6 ? 'medium' : 'low';
                
                improvements.push({
                    dimension,
                    priority,
                    score: result.score,
                    suggestions: result.suggestions
                });
            }
        });
        
        // Sort by score (lowest first = highest priority)
        return improvements.sort((a, b) => a.score - b.score);
    }

    /**
     * Batch assess multiple contents
     */
    async batchAssess(contents, impactAnalyses = []) {
        const startTime = Date.now();
        const assessments = [];

        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            const impactAnalysis = impactAnalyses[i] || {};
            const assessment = await this.assessContent(content, impactAnalysis);
            assessments.push(assessment);
        }

        const totalProcessingTime = Date.now() - startTime;
        const batchAnalytics = this.generateBatchAnalytics(assessments);

        return {
            assessments,
            batchAnalytics,
            totalProcessingTime
        };
    }

    /**
     * Generate analytics for batch assessment
     */
    generateBatchAnalytics(assessments) {
        const scores = assessments.map(a => a.overallScore);
        const dimensionTotals = {};
        
        // Initialize dimension totals
        Object.keys(this.config.weights).forEach(dimension => {
            dimensionTotals[dimension] = 0;
        });
        
        // Sum dimension scores
        assessments.forEach(assessment => {
            Object.keys(dimensionTotals).forEach(dimension => {
                dimensionTotals[dimension] += assessment.dimensions[dimension].score;
            });
        });
        
        // Calculate averages
        const count = assessments.length;
        const dimensionAverages = {};
        Object.keys(dimensionTotals).forEach(dimension => {
            dimensionAverages[dimension] = dimensionTotals[dimension] / count;
        });
        
        // Calculate score distribution
        const scoreDistribution = {
            excellent: scores.filter(s => s >= this.config.thresholds.excellent).length,
            good: scores.filter(s => s >= this.config.thresholds.good && s < this.config.thresholds.excellent).length,
            acceptable: scores.filter(s => s >= this.config.thresholds.acceptable && s < this.config.thresholds.good).length,
            poor: scores.filter(s => s < this.config.thresholds.acceptable).length
        };

        return {
            count,
            averageScore: scores.reduce((sum, score) => sum + score, 0) / count,
            scoreDistribution,
            dimensionAverages
        };
    }
}

/**
 * Clarity Analyzer - Assesses content clarity and comprehension
 */
class ClarityAnalyzer {
    constructor() {
        this.complexWords = new Set([
            'utilize', 'facilitate', 'leverage', 'optimize', 'maximize', 'synergize',
            'paradigm', 'methodology', 'comprehensive', 'multifaceted', 'sophisticated'
        ]);
        
        this.ambiguousWords = new Set([
            'it', 'this', 'that', 'thing', 'stuff', 'they', 'them', 'these', 'those'
        ]);
    }

    async analyze(content) {
        const text = content.text || '';
        const sentences = this.splitSentences(text);
        
        // Analyze multiple clarity dimensions
        const sentenceComplexity = this.assessSentenceComplexity(
            sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length
        );
        
        const vocabularyClarity = this.assessVocabularyClarity(text);
        const ambiguity = 1 - this.assessAmbiguity(text); // Lower ambiguity = higher clarity
        
        // Weighted score calculation
        const score = (sentenceComplexity * 0.4) + (vocabularyClarity * 0.4) + (ambiguity * 0.2);
        
        const suggestions = [];
        const insights = [];
        
        if (sentenceComplexity < 0.6) {
            suggestions.push('Simplify sentence structure and reduce average sentence length');
        }
        
        if (vocabularyClarity < 0.6) {
            suggestions.push('Replace complex jargon with simpler, clearer language');
        }
        
        if (ambiguity < 0.6) {
            suggestions.push('Reduce ambiguous pronouns and references');
        }
        
        if (score > 0.8) {
            insights.push('Content demonstrates excellent clarity and readability');
        }

        return {
            score,
            details: {
                sentenceComplexity,
                vocabularyClarity,
                ambiguity
            },
            suggestions,
            insights
        };
    }

    splitSentences(text) {
        return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    }

    assessSentenceComplexity(avgLength) {
        // Optimal sentence length is 15-20 words
        if (avgLength >= 15 && avgLength <= 20) return 1.0;
        if (avgLength >= 10 && avgLength <= 25) return 0.8;
        if (avgLength >= 8 && avgLength <= 30) return 0.6;
        return 0.4;
    }

    assessVocabularyClarity(text) {
        const words = text.toLowerCase().split(/\s+/);
        const complexWordCount = words.filter(word => this.complexWords.has(word)).length;
        const complexityRatio = complexWordCount / Math.max(words.length, 1);
        
        // Lower complexity ratio = higher clarity
        return Math.max(0, 1 - (complexityRatio * 3));
    }

    assessAmbiguity(text) {
        const words = text.toLowerCase().split(/\s+/);
        const ambiguousWordCount = words.filter(word => this.ambiguousWords.has(word)).length;
        const ambiguityRatio = ambiguousWordCount / Math.max(words.length, 1);
        
        return Math.min(1, ambiguityRatio * 4); // Higher ratio = higher ambiguity
    }
}

/**
 * Structure Analyzer - Assesses content organization and formatting
 */
class StructureAnalyzer {
    constructor() {
        this.transitionWords = [
            'however', 'therefore', 'furthermore', 'moreover', 'consequently',
            'additionally', 'meanwhile', 'subsequently', 'nevertheless', 'thus',
            'first', 'second', 'third', 'finally', 'in conclusion'
        ];
    }

    async analyze(content) {
        const text = content.text || '';
        
        const logicalFlow = this.assessLogicalFlow(text);
        const formatting = this.assessFormatting(text);
        const hierarchy = this.assessHierarchy(text);
        
        const score = (logicalFlow * 0.4) + (formatting * 0.3) + (hierarchy * 0.3);
        
        const suggestions = [];
        const insights = [];
        
        if (logicalFlow < 0.6) {
            suggestions.push('Add transition words to improve flow between ideas');
        }
        
        if (formatting < 0.6) {
            suggestions.push('Use headers, bullets, or formatting to improve readability');
        }
        
        if (hierarchy < 0.6) {
            suggestions.push('Organize content with clear hierarchical structure');
        }
        
        if (score > 0.8) {
            insights.push('Content demonstrates excellent structural organization');
        }

        return {
            score,
            details: {
                logicalFlow,
                formatting,
                hierarchy
            },
            suggestions,
            insights
        };
    }

    assessLogicalFlow(text) {
        const words = text.toLowerCase().split(/\s+/);
        const transitionCount = words.filter(word => 
            this.transitionWords.includes(word)
        ).length;
        
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const transitionRatio = transitionCount / Math.max(sentences.length, 1);
        
        // Optimal transition ratio is around 0.2-0.3
        return Math.min(1, transitionRatio * 3);
    }

    assessFormatting(text) {
        let score = 0;
        
        // Check for headers
        if (text.includes('**') || text.includes('# ')) {
            score += 0.4;
        }
        
        // Check for lists
        if (text.includes('•') || text.includes('- ') || /^\d+\.\s/m.test(text)) {
            score += 0.4;
        }
        
        // Check for emphasis
        if (text.includes('*') || text.includes('_')) {
            score += 0.2;
        }
        
        return Math.min(1, score);
    }

    assessHierarchy(text) {
        // Look for clear section divisions
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        
        if (paragraphs.length >= 3) {
            return 0.8; // Good paragraph structure
        } else if (paragraphs.length === 2) {
            return 0.6;
        } else {
            return 0.3; // Likely needs better organization
        }
    }
}

/**
 * Relevance Analyzer - Assesses content relevance to business and context
 */
class RelevanceAnalyzer {
    constructor() {
        this.businessKeywords = [
            'revenue', 'profit', 'customer', 'market', 'growth', 'value',
            'efficiency', 'productivity', 'roi', 'strategy', 'goal', 'objective'
        ];
        
        this.agentContextKeywords = {
            'personal-todos': ['task', 'priority', 'complete', 'deadline', 'action'],
            'meeting-prep': ['meeting', 'agenda', 'discussion', 'prepare', 'topics'],
            'meeting-next-steps': ['action', 'follow-up', 'decision', 'assigned', 'timeline'],
            'follow-ups': ['status', 'progress', 'update', 'completion', 'next'],
            'agent-ideas': ['idea', 'suggestion', 'proposal', 'innovation', 'solution']
        };
    }

    async analyze(content, impactAnalysis = {}) {
        const text = content.text || '';
        const agentType = content.agentType;
        
        const businessRelevance = this.assessBusinessRelevance(text, impactAnalysis);
        const contextRelevance = this.assessContextRelevance(text, content);
        
        const score = (businessRelevance * 0.6) + (contextRelevance * 0.4);
        
        const suggestions = [];
        const insights = [];
        
        if (businessRelevance < 0.5) {
            suggestions.push('Connect content more clearly to business impact and objectives');
        }
        
        if (contextRelevance < 0.5) {
            suggestions.push('Ensure content aligns better with the specific agent type context');
        }
        
        if (score > 0.8) {
            insights.push('Content demonstrates strong relevance to business goals');
        }

        return {
            score,
            details: {
                businessRelevance,
                contextRelevance
            },
            suggestions,
            insights
        };
    }

    assessBusinessRelevance(text, impactAnalysis) {
        // Use impact analysis score as base if available
        const baseScore = impactAnalysis.score || 0;
        
        // Bonus for business keywords
        const words = text.toLowerCase().split(/\s+/);
        const businessWordCount = words.filter(word => 
            this.businessKeywords.includes(word)
        ).length;
        const businessBonus = Math.min(0.3, businessWordCount * 0.1);
        
        return Math.min(1, baseScore + businessBonus);
    }

    assessContextRelevance(text, content) {
        const agentType = content.agentType;
        const contextKeywords = this.agentContextKeywords[agentType] || [];
        
        if (contextKeywords.length === 0) return 0;
        
        const words = text.toLowerCase().split(/\s+/);
        const contextWordCount = words.filter(word => 
            contextKeywords.includes(word)
        ).length;
        
        return Math.min(1, contextWordCount / contextKeywords.length);
    }
}

/**
 * Actionability Analyzer - Assesses how actionable the content is
 */
class ActionabilityAnalyzer {
    constructor() {
        this.actionWords = [
            'create', 'develop', 'implement', 'execute', 'complete', 'finish',
            'review', 'analyze', 'prepare', 'schedule', 'organize', 'plan',
            'design', 'build', 'test', 'deploy', 'optimize', 'improve'
        ];
        
        this.specificityIndicators = [
            /\d+\/\d+\/\d+/, // Dates
            /\$[\d,]+/, // Money amounts  
            /\d+%/, // Percentages
            /\d+:\d+/, // Times
            /\d+\s*(hours?|days?|weeks?|months?)/, // Durations
            /by\s+\w+day/i // Deadlines
        ];
    }

    async analyze(content) {
        const text = content.text || '';
        
        const actionWords = this.assessActionWords(text);
        const specificity = this.assessSpecificity(text);
        const timelineClarity = this.assessTimelineClarity(text);
        
        const score = (actionWords * 0.4) + (specificity * 0.3) + (timelineClarity * 0.3);
        
        const suggestions = [];
        const insights = [];
        
        if (actionWords < 0.5) {
            suggestions.push('Include more specific action verbs and clear directives');
        }
        
        if (specificity < 0.5) {
            suggestions.push('Add specific details like dates, numbers, or concrete examples');
        }
        
        if (timelineClarity < 0.5) {
            suggestions.push('Clarify timelines and deadlines for better actionability');
        }
        
        if (score > 0.8) {
            insights.push('Content provides clear, actionable guidance');
        }

        return {
            score,
            details: {
                actionWords,
                specificity,
                timelineClarity
            },
            suggestions,
            insights
        };
    }

    assessActionWords(text) {
        const words = text.toLowerCase().split(/\s+/);
        const actionWordCount = words.filter(word => 
            this.actionWords.includes(word)
        ).length;
        
        return Math.min(1, actionWordCount / 5); // Normalize to max of 5 action words
    }

    assessSpecificity(text) {
        let specificityCount = 0;
        
        this.specificityIndicators.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                specificityCount += matches.length;
            }
        });
        
        return Math.min(1, specificityCount / 3); // Normalize to max of 3 specific details
    }

    assessTimelineClarity(text) {
        const timelinePatterns = [
            /by\s+\w+day/i,
            /\d+\/\d+\/\d+/,
            /in\s+\d+\s*(days?|weeks?|months?)/i,
            /(asap|urgent|immediately)/i
        ];
        
        const hasTimeline = timelinePatterns.some(pattern => pattern.test(text));
        return hasTimeline ? 1.0 : 0.0;
    }
}

/**
 * Completeness Analyzer - Assesses content completeness based on type
 */
class CompletenessAnalyzer {
    constructor() {
        this.completenessRequirements = {
            'personal-todos': ['what', 'why', 'when', 'how'],
            'meeting-prep': ['purpose', 'agenda', 'participants', 'outcomes'],
            'meeting-next-steps': ['summary', 'actions', 'decisions', 'timeline'],
            'follow-ups': ['status', 'progress', 'blockers', 'next'],
            'agent-ideas': ['problem', 'solution', 'benefits', 'implementation']
        };
    }

    async analyze(content) {
        const text = content.text || '';
        const agentType = content.agentType;
        
        const informationCompleteness = this.assessInformationCompleteness(text, agentType);
        
        const score = informationCompleteness;
        
        const suggestions = [];
        const insights = [];
        
        if (score < 0.7) {
            suggestions.push('Include all essential information elements for this content type');
        }
        
        if (score > 0.8) {
            insights.push('Content provides comprehensive information coverage');
        }

        return {
            score,
            details: {
                informationCompleteness
            },
            suggestions,
            insights
        };
    }

    assessInformationCompleteness(text, agentType) {
        const requirements = this.completenessRequirements[agentType] || [];
        if (requirements.length === 0) return 0.5; // Default for unknown types
        
        const textLower = text.toLowerCase();
        const coveredRequirements = requirements.filter(req => 
            textLower.includes(req.toLowerCase())
        );
        
        return coveredRequirements.length / requirements.length;
    }
}

/**
 * Readability Analyzer - Assesses text readability using various metrics
 */
class ReadabilityAnalyzer {
    async analyze(content) {
        const text = content.text || '';
        
        const fleschScore = this.calculateFleschReadability(text);
        const wordComplexity = this.assessWordComplexity(text);
        const sentenceVariation = this.assessSentenceVariation(text);
        
        // Convert Flesch score to 0-1 scale (higher Flesch = more readable)
        const normalizedFlesch = Math.max(0, Math.min(1, fleschScore / 100));
        
        const score = (normalizedFlesch * 0.5) + (wordComplexity * 0.3) + (sentenceVariation * 0.2);
        
        const suggestions = [];
        const insights = [];
        
        if (normalizedFlesch < 0.6) {
            suggestions.push('Simplify sentence structure and vocabulary for better readability');
        }
        
        if (wordComplexity < 0.5) {
            suggestions.push('Use simpler, more common words');
        }
        
        if (score > 0.8) {
            insights.push('Content demonstrates excellent readability');
        }

        return {
            score,
            details: {
                fleschScore: fleschScore,
                wordComplexity,
                sentenceVariation
            },
            suggestions,
            insights
        };
    }

    calculateFleschReadability(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/).filter(w => w.trim().length > 0);
        
        if (sentences.length === 0 || words.length === 0) return 0;
        
        let totalSyllables = 0;
        words.forEach(word => {
            totalSyllables += this.countSyllables(word);
        });
        
        const avgSentenceLength = words.length / sentences.length;
        const avgSyllablesPerWord = totalSyllables / words.length;
        
        // Flesch Reading Ease formula
        const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
        
        return Math.max(0, Math.min(100, fleschScore));
    }

    countSyllables(word) {
        word = word.toLowerCase();
        if (word.length <= 3) return 1;
        
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        word = word.replace(/^y/, '');
        
        const matches = word.match(/[aeiouy]{1,2}/g);
        return Math.max(1, matches ? matches.length : 1);
    }

    assessWordComplexity(text) {
        const words = text.split(/\s+/).filter(w => w.trim().length > 0);
        const longWords = words.filter(word => word.length > 6);
        const complexityRatio = longWords.length / Math.max(words.length, 1);
        
        // Lower complexity ratio = higher readability
        return Math.max(0, 1 - complexityRatio);
    }

    assessSentenceVariation(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length < 2) return 0.5;
        
        const lengths = sentences.map(s => s.split(/\s+/).length);
        const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
        
        // Calculate variance
        const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Normalize variation score (higher variation = better readability)
        return Math.min(1, standardDeviation / 5);
    }
}

/**
 * Custom Error Class
 */
class QualityAssessmentError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'QualityAssessmentError';
        this.cause = cause;
    }
}

// Export all classes
module.exports = {
    QualityAssessmentSystem,
    ClarityAnalyzer,
    StructureAnalyzer,
    RelevanceAnalyzer,
    ActionabilityAnalyzer,
    CompletenessAnalyzer,
    ReadabilityAnalyzer,
    QualityAssessmentError
};