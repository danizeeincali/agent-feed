/**
 * Engagement Optimization System
 * Multi-dimensional content optimization for maximum user engagement
 */

class EngagementOptimizer {
    constructor(config = {}) {
        this.config = {
            // Optimization target and thresholds
            targetEngagement: 0.75,
            maxOptimizationRounds: 3,
            convergenceThreshold: 0.05,
            
            // Dimension weights for engagement calculation
            weights: {
                emotional: 0.3,
                structural: 0.25,
                interactive: 0.15,
                personalization: 0.1,
                timing: 0.1,
                visual: 0.1
            },
            
            // Performance requirement: <200ms per optimization
            performanceTarget: 200,
            ...config
        };

        this.emotionalAnalyzer = new EmotionalEngagementAnalyzer();
        this.interactivityEnhancer = new InteractivityEnhancer();
        this.personalizationEngine = new PersonalizationEngine();
        this.structuralOptimizer = new StructuralOptimizer();
        this.engagementPredictor = new EngagementPredictor();
    }

    /**
     * Optimize content for maximum engagement through iterative enhancement
     */
    async optimizeForEngagement(content, qualityMetrics, context = {}) {
        const startTime = Date.now();
        let currentContent = { ...content };
        let currentEngagement = await this.assessCurrentEngagement(currentContent, context);
        
        const optimizationLog = [];
        const appliedStrategies = [];
        let optimizationSteps = 0;

        try {
            // Multi-round optimization until target reached or max rounds hit
            while (currentEngagement.score < this.config.targetEngagement && 
                   optimizationSteps < this.config.maxOptimizationRounds) {
                
                const roundStartTime = Date.now();
                const previousScore = currentEngagement.score;
                
                // Select optimization strategies based on weakest areas
                const strategies = this.selectOptimizationStrategies(
                    currentEngagement.weakestAreas, 
                    optimizationSteps
                );
                
                // Apply selected strategies
                const optimizations = await this.applyOptimizationStrategies(
                    currentContent, 
                    strategies, 
                    context
                );
                
                // Update content with successful optimizations
                if (optimizations.some(opt => opt.improved)) {
                    currentContent = this.integrateOptimizations(currentContent, optimizations);
                    currentEngagement = await this.assessCurrentEngagement(currentContent, context);
                    
                    // Track successful strategies
                    optimizations.forEach(opt => {
                        if (opt.improved) {
                            appliedStrategies.push(...opt.strategies);
                        }
                    });
                }
                
                optimizationSteps++;
                
                optimizationLog.push({
                    round: optimizationSteps,
                    previousScore,
                    newScore: currentEngagement.score,
                    improvement: currentEngagement.score - previousScore,
                    strategiesApplied: strategies,
                    processingTime: Date.now() - roundStartTime
                });
                
                // Check for convergence (minimal improvement)
                const improvement = currentEngagement.score - previousScore;
                if (improvement < this.config.convergenceThreshold) {
                    break;
                }
            }

            // Generate final engagement prediction
            const engagementPrediction = await this.engagementPredictor.predict(
                currentContent, 
                currentEngagement, 
                context
            );

            const processingTime = Date.now() - startTime;

            return {
                text: currentContent.text,
                engagementScore: currentEngagement.score,
                engagementPrediction,
                optimizationSteps,
                appliedStrategies: [...new Set(appliedStrategies)], // Remove duplicates
                improvementLog: optimizationLog,
                processingTime,
                optimizedAt: new Date().toISOString()
            };

        } catch (error) {
            throw new EngagementOptimizationError('Failed to optimize content for engagement', error);
        }
    }

    /**
     * Assess current engagement across all dimensions
     */
    async assessCurrentEngagement(content, context = {}) {
        const [
            emotional,
            structural, 
            interactive,
            personalization
        ] = await Promise.all([
            this.emotionalAnalyzer.analyze(content),
            this.structuralOptimizer.assess(content),
            this.interactivityEnhancer.assess(content),
            this.personalizationEngine.assess(content, context.userData || {})
        ]);

        const dimensions = {
            emotional,
            structural,
            interactive,
            personalization
        };

        // Calculate weighted engagement score
        const score = Object.entries(dimensions).reduce((total, [dimension, result]) => {
            const weight = this.config.weights[dimension] || 0;
            return total + (result.score * weight);
        }, 0);

        const weakestAreas = this.identifyWeakestAreas(dimensions);
        const improvementOpportunities = this.generateImprovementOpportunities(dimensions);

        return {
            score,
            dimensions,
            weakestAreas,
            improvementOpportunities
        };
    }

    /**
     * Select optimization strategies based on weakest performance areas
     */
    selectOptimizationStrategies(weakestAreas, round) {
        const strategies = [];
        
        // Add strategies for weakest dimensions
        weakestAreas.forEach(area => {
            switch (area.dimension) {
                case 'emotional':
                    strategies.push('enhance_emotional_connection');
                    break;
                case 'interactive':
                    strategies.push('add_interactivity');
                    break;
                case 'structural':
                    strategies.push('improve_structure');
                    break;
                case 'personalization':
                    strategies.push('add_personalization');
                    break;
            }
        });
        
        // Add round-specific strategies
        if (round === 0) {
            strategies.push('optimize_opening');
        } else if (round === 1) {
            strategies.push('enhance_call_to_action');
        } else if (round === 2) {
            strategies.push('refine_language');
        }
        
        // Limit to top 3 strategies to prevent over-optimization
        return strategies.slice(0, 3);
    }

    /**
     * Apply selected optimization strategies
     */
    async applyOptimizationStrategies(content, strategies, context) {
        const optimizations = [];

        for (const strategy of strategies) {
            let result;
            
            switch (strategy) {
                case 'enhance_emotional_connection':
                    result = await this.emotionalAnalyzer.enhance(content, context);
                    result.strategies = ['emotional_enhancement'];
                    break;
                    
                case 'add_interactivity':
                    result = await this.interactivityEnhancer.enhance(content, context);
                    result.strategies = ['interactivity_boost'];
                    break;
                    
                case 'improve_structure':
                    result = await this.structuralOptimizer.optimize(content);
                    result.strategies = ['structural_improvement'];
                    break;
                    
                case 'add_personalization':
                    result = await this.personalizationEngine.personalize(content, context.userData || {});
                    result.strategies = ['personalization_added'];
                    break;
                    
                case 'optimize_opening':
                    result = this.optimizeOpening(content);
                    result.strategies = ['opening_optimization'];
                    break;
                    
                case 'enhance_call_to_action':
                    result = this.enhanceCallToAction(content);
                    result.strategies = ['cta_enhancement'];
                    break;
                    
                case 'refine_language':
                    result = this.refineLanguage(content);
                    result.strategies = ['language_refinement'];
                    break;
                    
                default:
                    result = { improved: false, text: content.text, strategies: [] };
            }
            
            optimizations.push(result);
        }

        return optimizations;
    }

    /**
     * Integrate successful optimizations into content
     */
    integrateOptimizations(content, optimizations) {
        let integratedContent = { ...content };
        
        optimizations.forEach(optimization => {
            if (optimization.improved) {
                integratedContent.text = optimization.text;
                // Preserve other content properties while updating text
            }
        });
        
        return integratedContent;
    }

    /**
     * Optimize content opening for better engagement
     */
    optimizeOpening(content) {
        const text = content.text;
        const agentType = content.agentType;
        
        // Check if opening is already engaging
        const engagingPatterns = /^(Here's what|Key priority|Making progress|Excited to|Working on)/i;
        if (engagingPatterns.test(text)) {
            return { improved: false, text, changes: [] };
        }
        
        // Generate engaging openings based on agent type
        const openingTemplates = {
            'personal-todos': [
                "Here's what I'm focusing on:",
                "Key priority for today:",
                "Making progress on:"
            ],
            'meeting-prep': [
                "Preparing for our upcoming meeting:",
                "Here's what we need to cover:",
                "Key topics for discussion:"
            ],
            'meeting-next-steps': [
                "Here are our key outcomes:",
                "Following up on our meeting:",
                "Next steps from our discussion:"
            ],
            'follow-ups': [
                "Quick update on progress:",
                "Here's where we stand:",
                "Latest developments:"
            ],
            'agent-ideas': [
                "I have an idea that could help:",
                "Here's a potential solution:",
                "What if we tried this approach:"
            ]
        };
        
        const templates = openingTemplates[agentType] || openingTemplates['personal-todos'];
        const selectedOpening = templates[Math.floor(Math.random() * templates.length)];
        
        // Replace or prepend the opening
        const optimizedText = `${selectedOpening} ${text}`;
        
        return {
            improved: true,
            text: optimizedText,
            changes: ['optimized_opening']
        };
    }

    /**
     * Enhance call-to-action elements
     */
    enhanceCallToAction(content) {
        const text = content.text;
        const agentType = content.agentType;
        
        // Check if CTA already exists
        if (text.includes('?') || /\b(let me know|thoughts|feedback|ideas)\b/i.test(text)) {
            return { improved: false, text, changes: [] };
        }
        
        // Generate CTAs based on agent type
        const ctaTemplates = {
            'personal-todos': [
                "What should I prioritize next?",
                "Any thoughts on the approach?",
                "Does this timeline work?"
            ],
            'meeting-prep': [
                "What topics should we add?",
                "Any specific outcomes you'd like to focus on?",
                "Who else should join this discussion?"
            ],
            'meeting-next-steps': [
                "Are these next steps clear?",
                "Any questions about the timeline?",
                "What support do you need to move forward?"
            ],
            'follow-ups': [
                "What are your thoughts on this progress?",
                "Any concerns or suggestions?",
                "Should we adjust our approach?"
            ],
            'agent-ideas': [
                "What do you think about this idea?",
                "Would this approach work in your experience?",
                "Any ways to improve this concept?"
            ]
        };
        
        const templates = ctaTemplates[agentType] || ctaTemplates['personal-todos'];
        const selectedCTA = templates[Math.floor(Math.random() * templates.length)];
        
        const optimizedText = `${text} ${selectedCTA}`;
        
        return {
            improved: true,
            text: optimizedText,
            changes: ['enhanced_cta']
        };
    }

    /**
     * Refine language for better engagement
     */
    refineLanguage(content) {
        let text = content.text;
        let improved = false;
        const changes = [];
        
        // Replace passive voice with active voice
        const passivePatterns = [
            { pattern: /was completed/g, replacement: 'completed', change: 'active_voice' },
            { pattern: /will be done/g, replacement: 'will complete', change: 'active_voice' },
            { pattern: /is being/g, replacement: 'currently', change: 'active_voice' }
        ];
        
        passivePatterns.forEach(({ pattern, replacement, change }) => {
            if (pattern.test(text)) {
                text = text.replace(pattern, replacement);
                improved = true;
                changes.push(change);
            }
        });
        
        // Add energy words
        const energyWords = {
            'good': 'excellent',
            'nice': 'fantastic',
            'okay': 'solid',
            'fine': 'great'
        };
        
        Object.entries(energyWords).forEach(([weak, strong]) => {
            const pattern = new RegExp(`\\b${weak}\\b`, 'gi');
            if (pattern.test(text)) {
                text = text.replace(pattern, strong);
                improved = true;
                changes.push('added_energy');
            }
        });
        
        return {
            improved,
            text,
            changes: [...new Set(changes)]
        };
    }

    /**
     * Identify weakest engagement areas
     */
    identifyWeakestAreas(dimensions) {
        return Object.entries(dimensions)
            .filter(([, result]) => result.score < 0.6)
            .map(([dimension, result]) => ({ dimension, score: result.score }))
            .sort((a, b) => a.score - b.score);
    }

    /**
     * Generate improvement opportunities
     */
    generateImprovementOpportunities(dimensions) {
        const opportunities = [];
        
        Object.entries(dimensions).forEach(([dimension, result]) => {
            if (result.suggestions) {
                opportunities.push({
                    dimension,
                    suggestions: result.suggestions,
                    priority: result.score < 0.4 ? 'high' : 'medium'
                });
            }
        });
        
        return opportunities;
    }
}

/**
 * Emotional Engagement Analyzer
 */
class EmotionalEngagementAnalyzer {
    constructor() {
        this.positiveWords = [
            'excited', 'amazing', 'fantastic', 'excellent', 'outstanding',
            'thrilled', 'delighted', 'wonderful', 'incredible', 'awesome',
            'great', 'superb', 'brilliant', 'remarkable', 'exceptional'
        ];
        
        this.negativeWords = [
            'terrible', 'awful', 'horrible', 'disappointing', 'frustrating',
            'difficult', 'challenging', 'problems', 'issues', 'concerns'
        ];
        
        this.personalWords = [
            'I', 'we', 'our', 'my', 'us', 'together', 'team', 'collaborate'
        ];
    }

    async analyze(content) {
        const text = content.text || '';
        
        const emotionalTone = this.analyzeEmotionalTone(text);
        const personalConnection = this.analyzePersonalConnection(text);
        
        const score = (emotionalTone * 0.6) + (personalConnection * 0.4);
        
        const suggestions = [];
        const insights = [];
        
        if (emotionalTone < 0.5) {
            suggestions.push('Add more emotional language to connect with readers');
        }
        
        if (personalConnection < 0.5) {
            suggestions.push('Use more personal pronouns and inclusive language');
        }
        
        if (score > 0.7) {
            insights.push('Content demonstrates strong emotional engagement');
        }

        return {
            score,
            details: {
                emotionalTone,
                personalConnection
            },
            suggestions,
            insights
        };
    }

    analyzeEmotionalTone(text) {
        const words = text.toLowerCase().split(/\s+/);
        const positiveCount = words.filter(word => this.positiveWords.includes(word)).length;
        const negativeCount = words.filter(word => this.negativeWords.includes(word)).length;
        
        // Calculate emotional polarity (more positive is better)
        const netPositive = positiveCount - (negativeCount * 0.5); // Negative words have less impact
        return Math.max(0, Math.min(1, netPositive / 5)); // Normalize to 0-1
    }

    analyzePersonalConnection(text) {
        const words = text.split(/\s+/);
        const personalCount = words.filter(word => 
            this.personalWords.includes(word.toLowerCase())
        ).length;
        
        return Math.min(1, personalCount / Math.max(words.length * 0.1, 1));
    }

    async enhance(content, context = {}) {
        const text = content.text;
        const currentAnalysis = await this.analyze(content);
        
        if (currentAnalysis.score > 0.7) {
            return { improved: false, text, changes: [] };
        }
        
        let enhancedText = text;
        const changes = [];
        
        // Add emotional language if lacking
        if (currentAnalysis.details.emotionalTone < 0.5) {
            enhancedText = this.addEmotionalLanguage(enhancedText, content.agentType);
            changes.push('added_emotional_language');
        }
        
        // Add personal connection if lacking
        if (currentAnalysis.details.personalConnection < 0.5) {
            enhancedText = this.addPersonalConnection(enhancedText);
            changes.push('added_personal_connection');
        }
        
        return {
            improved: changes.length > 0,
            text: enhancedText,
            changes
        };
    }

    addEmotionalLanguage(text, agentType) {
        // Add excitement and energy based on agent type
        const emotionalEnhancements = {
            'personal-todos': 'I am excited to tackle',
            'meeting-prep': 'I am looking forward to discussing',
            'agent-ideas': 'I am thrilled to share',
            'follow-ups': 'I am pleased to update',
            'meeting-next-steps': 'I am excited about our progress on'
        };
        
        const enhancement = emotionalEnhancements[agentType] || 'I am excited about';
        
        // Insert emotional language at the beginning if not already present
        if (!text.toLowerCase().includes('excited') && !text.toLowerCase().includes('thrilled')) {
            return `${enhancement} ${text.toLowerCase()}`;
        }
        
        return text;
    }

    addPersonalConnection(text) {
        // Replace impersonal language with personal language
        const personalizations = [
            { pattern: /the team/g, replacement: 'our team' },
            { pattern: /the project/g, replacement: 'our project' },
            { pattern: /it is/g, replacement: 'I believe it is' },
            { pattern: /there will be/g, replacement: 'we will have' }
        ];
        
        let personalizedText = text;
        personalizations.forEach(({ pattern, replacement }) => {
            personalizedText = personalizedText.replace(pattern, replacement);
        });
        
        return personalizedText;
    }
}

/**
 * Interactivity Enhancer
 */
class InteractivityEnhancer {
    constructor() {
        this.interactiveElements = [
            'questions', 'polls', 'requests for feedback', 'calls to action'
        ];
    }

    async assess(content) {
        const text = content.text || '';
        
        const questionCount = (text.match(/\?/g) || []).length;
        const callToActionPresent = /\b(let me know|thoughts|feedback|ideas|what do you think)\b/i.test(text);
        const engagementPrompts = /\b(share|comment|discuss|tell me)\b/i.test(text);
        
        // Score based on interactive elements
        let score = 0;
        if (questionCount > 0) score += 0.4;
        if (callToActionPresent) score += 0.3;
        if (engagementPrompts) score += 0.3;
        
        const suggestions = [];
        const insights = [];
        
        if (questionCount === 0) {
            suggestions.push('Add questions to encourage interaction');
        }
        
        if (!callToActionPresent) {
            suggestions.push('Include call-to-action elements');
        }
        
        if (!engagementPrompts) {
            suggestions.push('Add engagement prompts');
        }
        
        if (score > 0.7) {
            insights.push('Content includes good interactive elements');
        }

        return {
            score,
            details: {
                questionCount,
                callToActionPresent,
                engagementPrompts
            },
            suggestions,
            insights
        };
    }

    async enhance(content, context = {}) {
        const text = content.text;
        const currentAssessment = await this.assess(content);
        
        if (currentAssessment.score > 0.7) {
            return { improved: false, text, changes: [] };
        }
        
        let enhancedText = text;
        const changes = [];
        
        // Add question if missing
        if (currentAssessment.details.questionCount === 0) {
            enhancedText = this.addRelevantQuestion(enhancedText, content.agentType);
            changes.push('added_question');
        }
        
        // Add engagement prompt if missing
        if (!currentAssessment.details.engagementPrompts) {
            enhancedText = this.addEngagementPrompt(enhancedText);
            changes.push('added_engagement_prompt');
        }
        
        return {
            improved: changes.length > 0,
            text: enhancedText,
            changes
        };
    }

    addRelevantQuestion(text, agentType) {
        const questionTemplates = {
            'personal-todos': ['What should I prioritize?', 'Any suggestions for the approach?'],
            'meeting-prep': ['What topics should we cover?', 'Any additional agenda items?'],
            'follow-ups': ['How does this progress look?', 'Any concerns with this approach?'],
            'agent-ideas': ['What are your thoughts?', 'Would this work in your experience?'],
            'meeting-next-steps': ['Are these next steps clear?', 'Any questions about the timeline?']
        };
        
        const templates = questionTemplates[agentType] || questionTemplates['personal-todos'];
        const question = templates[Math.floor(Math.random() * templates.length)];
        
        return `${text} ${question}`;
    }

    addEngagementPrompt(text) {
        const prompts = [
            'Let me know your thoughts!',
            'I would love to hear your feedback.',
            'Please share your ideas on this.',
            'What is your take on this approach?'
        ];
        
        const prompt = prompts[Math.floor(Math.random() * prompts.length)];
        return `${text} ${prompt}`;
    }
}

/**
 * Personalization Engine
 */
class PersonalizationEngine {
    async assess(content, userData = {}) {
        const text = content.text || '';
        
        const personalGreeting = this.hasPersonalGreeting(text, userData.name);
        const roleRelevance = this.assessRoleRelevance(text, userData.role);
        const contextRelevance = this.assessContextRelevance(text, userData);
        
        const score = (personalGreeting * 0.4) + (roleRelevance * 0.3) + (contextRelevance * 0.3);
        
        const suggestions = [];
        const insights = [];
        
        if (!personalGreeting && userData.name) {
            suggestions.push('Add personal greeting');
        }
        
        if (roleRelevance < 0.5 && userData.role) {
            suggestions.push('Reference user role and context');
        }
        
        if (!userData.name && !userData.role) {
            suggestions.push('Add user context for better personalization');
        }
        
        if (score > 0.7) {
            insights.push('Content demonstrates good personalization');
        }

        return {
            score,
            details: {
                personalGreeting,
                roleRelevance,
                contextRelevance
            },
            suggestions,
            insights
        };
    }

    hasPersonalGreeting(text, name) {
        if (!name) return 0;
        
        const greetingPatterns = [
            new RegExp(`Hi ${name}`, 'i'),
            new RegExp(`Hello ${name}`, 'i'),
            new RegExp(`Hey ${name}`, 'i')
        ];
        
        return greetingPatterns.some(pattern => pattern.test(text)) ? 1 : 0;
    }

    assessRoleRelevance(text, role) {
        if (!role) return 0;
        
        return text.toLowerCase().includes(role.toLowerCase()) ? 1 : 0;
    }

    assessContextRelevance(text, userData) {
        if (!userData.currentProjects && !userData.interests) return 0;
        
        const allContext = [
            ...(userData.currentProjects || []),
            ...(userData.interests || [])
        ];
        
        const relevantTerms = allContext.filter(term =>
            text.toLowerCase().includes(term.toLowerCase())
        );
        
        return Math.min(1, relevantTerms.length / Math.max(allContext.length, 1));
    }

    async personalize(content, userData = {}) {
        const text = content.text;
        const currentAssessment = await this.assess(content, userData);
        
        if (currentAssessment.score > 0.7) {
            return { improved: false, text, changes: [] };
        }
        
        let personalizedText = text;
        const changes = [];
        
        // Add personal greeting if missing
        if (!currentAssessment.details.personalGreeting && userData.name) {
            personalizedText = this.addPersonalGreeting(personalizedText, userData.name);
            changes.push('added_personal_greeting');
        }
        
        // Add role context if relevant
        if (currentAssessment.details.roleRelevance < 0.5 && userData.role) {
            personalizedText = this.addRoleContext(personalizedText, userData.role);
            changes.push('added_role_context');
        }
        
        return {
            improved: changes.length > 0,
            text: personalizedText,
            changes
        };
    }

    addPersonalGreeting(text, name) {
        const greetings = ['Hi', 'Hello', 'Hey'];
        const greeting = greetings[Math.floor(Math.random() * greetings.length)];
        return `${greeting} ${name}! ${text}`;
    }

    addRoleContext(text, role) {
        return `As a ${role}, you might find this relevant: ${text}`;
    }
}

/**
 * Structural Optimizer
 */
class StructuralOptimizer {
    async assess(content) {
        const text = content.text || '';
        
        const paragraphStructure = this.assessParagraphStructure(text);
        const formatting = this.assessFormatting(text);
        
        const score = (paragraphStructure * 0.6) + (formatting * 0.4);
        
        const suggestions = [];
        const insights = [];
        
        if (paragraphStructure < 0.6) {
            suggestions.push('Improve paragraph structure');
        }
        
        if (formatting < 0.6) {
            suggestions.push('Add formatting for better readability');
        }
        
        if (score > 0.8) {
            insights.push('Content has excellent structure');
        }

        return {
            score,
            details: {
                paragraphStructure,
                formatting
            },
            suggestions,
            insights
        };
    }

    assessParagraphStructure(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        // Optimal is 2-4 sentences per paragraph
        if (sentences.length <= 4) return 1.0;
        if (sentences.length <= 6) return 0.8;
        if (sentences.length <= 9) return 0.6;
        return 0.4;
    }

    assessFormatting(text) {
        let score = 0;
        
        // Check for headers
        if (text.includes('**') || text.match(/^#+\s/m)) score += 0.3;
        
        // Check for lists
        if (text.includes('•') || text.match(/^\d+\.\s/m) || text.match(/^-\s/m)) score += 0.4;
        
        // Check for emphasis
        if (text.includes('*') || text.includes('_')) score += 0.2;
        
        // Check for line breaks
        if (text.includes('\n\n')) score += 0.1;
        
        return Math.min(1, score);
    }

    async optimize(content) {
        const text = content.text;
        const currentAssessment = await this.assess(content);
        
        if (currentAssessment.score > 0.8) {
            return { improved: false, text, changes: [] };
        }
        
        let optimizedText = text;
        const changes = [];
        
        // Improve paragraph structure if needed
        if (currentAssessment.details.paragraphStructure < 0.6) {
            optimizedText = this.improveParagraphs(optimizedText);
            changes.push('improved_paragraphs');
        }
        
        // Add formatting if needed
        if (currentAssessment.details.formatting < 0.6) {
            optimizedText = this.addFormatting(optimizedText, content.agentType);
            changes.push('added_formatting');
        }
        
        return {
            improved: changes.length > 0,
            text: optimizedText,
            changes
        };
    }

    improveParagraphs(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        if (sentences.length <= 4) return text;
        
        // Break long paragraphs into smaller ones
        const paragraphs = [];
        for (let i = 0; i < sentences.length; i += 3) {
            const paragraphSentences = sentences.slice(i, i + 3);
            paragraphs.push(paragraphSentences.join('. ') + '.');
        }
        
        return paragraphs.join('\n\n');
    }

    addFormatting(text, agentType) {
        // Add basic formatting based on content structure
        let formattedText = text;
        
        // Add header if it looks like a title
        const lines = text.split('\n');
        if (lines[0] && lines[0].length < 50 && !lines[0].includes('**')) {
            lines[0] = `**${lines[0]}**`;
            formattedText = lines.join('\n');
        }
        
        // Convert simple lists to bullet points
        formattedText = formattedText.replace(/^(\d+\.|-)?\s*([A-Z])/gm, '• $2');
        
        return formattedText;
    }
}

/**
 * Engagement Predictor
 */
class EngagementPredictor {
    constructor() {
        this.contentTypeMultipliers = {
            'agent-ideas': 1.3,
            'meeting-prep': 1.1,
            'follow-ups': 1.0,
            'personal-todos': 0.9,
            'meeting-next-steps': 0.8
        };
    }

    async predict(content, currentEngagement, context = {}) {
        const baseScore = currentEngagement.score || 0.5;
        
        // Apply content type multiplier
        const contentMultiplier = this.contentTypeMultipliers[content.agentType] || 1.0;
        const contentAdjustedScore = Math.min(1, baseScore * contentMultiplier);
        
        // Apply timing impact
        const timingImpact = this.assessTimingImpact(context.postingTime);
        const timingAdjustedScore = contentAdjustedScore * timingImpact;
        
        // Apply context factors
        const contextMultiplier = this.assessContextFactors(context);
        const finalScore = Math.min(1, timingAdjustedScore * contextMultiplier);
        
        // Predict expected interactions
        const expectedInteractions = this.predictInteractions(content, currentEngagement, context);
        
        // Generate factors that influenced the prediction
        const factors = this.generatePredictionFactors(content, currentEngagement, context);
        
        // Generate recommendations
        const recommendations = this.generateRecommendations(finalScore, currentEngagement);
        
        return {
            score: finalScore,
            confidence: this.calculateConfidence(currentEngagement, context),
            expectedInteractions,
            factors,
            recommendations
        };
    }

    assessTimingImpact(postingTime) {
        if (!postingTime) return 0.8; // Default moderate score
        
        const hour = postingTime.getHours();
        
        // Business hours (9 AM - 5 PM) are optimal
        if (hour >= 9 && hour <= 17) return 1.0;
        
        // Early morning (8 AM) and early evening (6 PM) are good
        if (hour === 8 || hour === 18) return 0.6;
        
        // Late evening and early morning are poor
        return 0.4;
    }

    assessContextFactors(context) {
        let multiplier = 1.0;
        
        if (context.userActivity === 'high') multiplier *= 1.2;
        if (context.userActivity === 'low') multiplier *= 0.8;
        
        if (context.feedHealth > 0.7) multiplier *= 1.1;
        if (context.feedHealth < 0.3) multiplier *= 0.9;
        
        return Math.min(1.5, multiplier);
    }

    predictInteractions(content, engagement, context) {
        const baseInteractions = 2; // Minimum expected interactions
        const engagementMultiplier = (engagement.score || 0.5) * 3;
        const contentTypeMultiplier = this.contentTypeMultipliers[content.agentType] || 1.0;
        
        return Math.round(baseInteractions * engagementMultiplier * contentTypeMultiplier);
    }

    calculateConfidence(engagement, context) {
        let confidence = 0.7; // Base confidence
        
        // Higher confidence with more engagement data
        if (engagement.dimensions) confidence += 0.1;
        
        // Lower confidence with limited context
        if (!context.userActivity || !context.postingTime) confidence -= 0.2;
        
        return Math.max(0.3, Math.min(1.0, confidence));
    }

    generatePredictionFactors(content, engagement, context) {
        const factors = [];
        
        factors.push(`Content type (${content.agentType}) affects engagement potential`);
        factors.push(`Current engagement score: ${(engagement.score * 100).toFixed(1)}%`);
        
        if (context.postingTime) {
            factors.push(`Posting time impact: ${this.assessTimingImpact(context.postingTime).toFixed(1)}`);
        }
        
        if (context.userActivity) {
            factors.push(`User activity level: ${context.userActivity}`);
        }
        
        return factors;
    }

    generateRecommendations(predictedScore, engagement) {
        const recommendations = [];
        
        if (predictedScore < 0.6) {
            recommendations.push({
                type: 'optimization',
                message: 'Consider additional optimization to improve engagement',
                priority: 'high'
            });
        }
        
        if (engagement.weakestAreas && engagement.weakestAreas.length > 0) {
            recommendations.push({
                type: 'focus_area',
                message: `Focus on improving ${engagement.weakestAreas[0].dimension}`,
                priority: 'medium'
            });
        }
        
        if (predictedScore > 0.8) {
            recommendations.push({
                type: 'timing',
                message: 'Content is well-optimized, consider optimal posting time',
                priority: 'low'
            });
        }
        
        return recommendations;
    }
}

/**
 * Custom Error Class
 */
class EngagementOptimizationError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'EngagementOptimizationError';
        this.cause = cause;
    }
}

// Export all classes
module.exports = {
    EngagementOptimizer,
    EmotionalEngagementAnalyzer,
    InteractivityEnhancer,
    PersonalizationEngine,
    StructuralOptimizer,
    EngagementPredictor,
    EngagementOptimizationError
};