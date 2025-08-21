/**
 * Adaptive Protection Engine
 * Dynamically adjusts protection mechanisms based on learned patterns
 */

class AdaptiveProtectionEngine {
    constructor(protector, monitor) {
        this.protector = protector;
        this.monitor = monitor;
        this.adaptationRules = new Map();
        this.protectionStrategies = new Map();
        this.learningCycles = 0;
        this.adaptationThreshold = 0.75;
        
        this.initializeEngine();
    }

    initializeEngine() {
        this.loadBaseStrategies();
        this.setupLearningLoop();
        this.startAdaptationEngine();
        
        console.log('Adaptive Protection Engine initialized');
    }

    loadBaseStrategies() {
        // Base protection strategies
        this.protectionStrategies.set('access_control', {
            name: 'Access Control',
            effectiveness: 0.8,
            cost: 'low',
            techniques: ['authentication', 'authorization', 'rate_limiting'],
            adaptive: true
        });

        this.protectionStrategies.set('behavioral_analysis', {
            name: 'Behavioral Analysis',
            effectiveness: 0.9,
            cost: 'medium',
            techniques: ['pattern_recognition', 'anomaly_detection', 'ml_classification'],
            adaptive: true
        });

        this.protectionStrategies.set('proactive_defense', {
            name: 'Proactive Defense',
            effectiveness: 0.95,
            cost: 'high',
            techniques: ['predictive_blocking', 'preemptive_isolation', 'dynamic_hardening'],
            adaptive: true
        });

        this.protectionStrategies.set('reactive_response', {
            name: 'Reactive Response',
            effectiveness: 0.7,
            cost: 'low',
            techniques: ['incident_response', 'damage_containment', 'forensic_analysis'],
            adaptive: false
        });
    }

    setupLearningLoop() {
        // Continuous learning from violations and responses
        this.monitor.on('violation_detected', (violation) => {
            this.learnFromViolation(violation);
        });

        this.monitor.on('alert_processed', (alert) => {
            this.learnFromResponse(alert);
        });

        // Periodic strategy evaluation
        setInterval(() => {
            this.evaluateStrategies();
        }, 300000); // Every 5 minutes
    }

    startAdaptationEngine() {
        setInterval(() => {
            this.adaptProtectionMechanisms();
        }, 600000); // Every 10 minutes
    }

    learnFromViolation(violation) {
        const strategy = this.selectOptimalStrategy(violation);
        const adaptation = this.generateAdaptation(violation, strategy);
        
        this.adaptationRules.set(violation.fingerprint, adaptation);
        this.updateStrategyEffectiveness(strategy, violation);
    }

    learnFromResponse(alert) {
        const responseEffectiveness = alert.response?.effectiveness || 0;
        const strategy = this.identifyUsedStrategy(alert.response);
        
        if (strategy) {
            this.updateStrategySuccess(strategy, responseEffectiveness);
        }
        
        // Learn what response actions work best
        this.optimizeResponseActions(alert);
    }

    selectOptimalStrategy(violation) {
        let bestStrategy = null;
        let bestScore = 0;

        for (const [key, strategy] of this.protectionStrategies) {
            const score = this.calculateStrategyScore(strategy, violation);
            if (score > bestScore) {
                bestScore = score;
                bestStrategy = key;
            }
        }

        return bestStrategy;
    }

    calculateStrategyScore(strategy, violation) {
        let score = strategy.effectiveness;
        
        // Adjust based on violation severity
        const severityMultiplier = {
            'low': 0.8,
            'medium': 1.0,
            'high': 1.2,
            'critical': 1.5
        };
        score *= severityMultiplier[violation.severity] || 1.0;
        
        // Consider cost efficiency
        const costPenalty = {
            'low': 0,
            'medium': -0.1,
            'high': -0.2
        };
        score += costPenalty[strategy.cost] || 0;
        
        // Boost adaptive strategies for new patterns
        if (strategy.adaptive && this.isNewPattern(violation)) {
            score += 0.1;
        }
        
        return score;
    }

    generateAdaptation(violation, strategyKey) {
        const strategy = this.protectionStrategies.get(strategyKey);
        
        return {
            violation_pattern: violation.fingerprint,
            strategy: strategyKey,
            techniques: this.selectTechniques(strategy, violation),
            parameters: this.optimizeParameters(strategy, violation),
            confidence: this.calculateConfidence(violation),
            created: new Date().toISOString(),
            success_count: 0,
            failure_count: 0
        };
    }

    selectTechniques(strategy, violation) {
        // Intelligently select techniques based on violation characteristics
        const selectedTechniques = [];
        
        if (violation.type === 'access_pattern_violation') {
            selectedTechniques.push('authentication', 'rate_limiting');
        } else if (violation.type === 'modification_attempt') {
            selectedTechniques.push('authorization', 'behavioral_analysis');
        } else if (violation.type === 'protection_breach_attempt') {
            selectedTechniques.push('predictive_blocking', 'dynamic_hardening');
        }
        
        // Ensure we include techniques from the selected strategy
        strategy.techniques.forEach(technique => {
            if (!selectedTechniques.includes(technique)) {
                selectedTechniques.push(technique);
            }
        });
        
        return selectedTechniques;
    }

    optimizeParameters(strategy, violation) {
        const baseParams = {
            sensitivity: 0.8,
            response_time: 1000,
            isolation_timeout: 300000,
            escalation_threshold: 3
        };
        
        // Adjust based on violation severity
        switch (violation.severity) {
            case 'critical':
                baseParams.sensitivity = 0.95;
                baseParams.response_time = 100;
                baseParams.escalation_threshold = 1;
                break;
            case 'high':
                baseParams.sensitivity = 0.9;
                baseParams.response_time = 500;
                baseParams.escalation_threshold = 2;
                break;
            case 'medium':
                baseParams.sensitivity = 0.8;
                break;
            case 'low':
                baseParams.sensitivity = 0.7;
                baseParams.response_time = 2000;
                break;
        }
        
        return baseParams;
    }

    adaptProtectionMechanisms() {
        this.learningCycles++;
        console.log(`Running adaptation cycle ${this.learningCycles}`);
        
        // Evaluate current protection effectiveness
        const effectiveness = this.evaluateOverallEffectiveness();
        
        if (effectiveness < this.adaptationThreshold) {
            console.log(`Low effectiveness detected (${effectiveness}), adapting protections`);
            this.enhanceProtections();
        }
        
        // Optimize existing adaptations
        this.optimizeAdaptations();
        
        // Remove ineffective adaptations
        this.pruneIneffectiveAdaptations();
        
        // Generate new strategies if needed
        if (this.shouldGenerateNewStrategy()) {
            this.generateNewStrategy();
        }
    }

    evaluateOverallEffectiveness() {
        let totalSuccess = 0;
        let totalAttempts = 0;
        
        for (const adaptation of this.adaptationRules.values()) {
            totalSuccess += adaptation.success_count;
            totalAttempts += adaptation.success_count + adaptation.failure_count;
        }
        
        return totalAttempts > 0 ? totalSuccess / totalAttempts : 0.5;
    }

    enhanceProtections() {
        // Increase sensitivity across all strategies
        for (const [key, strategy] of this.protectionStrategies) {
            if (strategy.adaptive) {
                strategy.effectiveness = Math.min(strategy.effectiveness * 1.1, 0.99);
            }
        }
        
        // Activate more aggressive techniques
        this.activateAggressiveTechniques();
        
        // Reduce response times
        this.optimizeResponseTimes();
    }

    optimizeAdaptations() {
        for (const [pattern, adaptation] of this.adaptationRules) {
            if (adaptation.success_count + adaptation.failure_count > 10) {
                const successRate = adaptation.success_count / (adaptation.success_count + adaptation.failure_count);
                
                if (successRate < 0.5) {
                    // Low success rate, need to optimize
                    this.optimizeAdaptation(pattern, adaptation);
                } else if (successRate > 0.9) {
                    // Very successful, can we make it more efficient?
                    this.optimizeForEfficiency(pattern, adaptation);
                }
            }
        }
    }

    optimizeAdaptation(pattern, adaptation) {
        console.log(`Optimizing low-performing adaptation for pattern ${pattern}`);
        
        // Try different technique combinations
        adaptation.techniques = this.exploreTechniqueCombinations(adaptation);
        
        // Adjust parameters
        adaptation.parameters.sensitivity = Math.min(adaptation.parameters.sensitivity * 1.2, 0.99);
        adaptation.parameters.response_time = Math.max(adaptation.parameters.response_time * 0.8, 50);
        
        // Reset counters to re-evaluate
        adaptation.success_count = 0;
        adaptation.failure_count = 0;
    }

    optimizeForEfficiency(pattern, adaptation) {
        console.log(`Optimizing high-performing adaptation for efficiency ${pattern}`);
        
        // Can we achieve the same effectiveness with lower cost?
        adaptation.parameters.response_time = Math.min(adaptation.parameters.response_time * 1.1, 2000);
        adaptation.parameters.sensitivity = Math.max(adaptation.parameters.sensitivity * 0.95, 0.6);
        
        // Try simpler technique combinations
        if (adaptation.techniques.length > 2) {
            adaptation.techniques = adaptation.techniques.slice(0, 2);
        }
    }

    pruneIneffectiveAdaptations() {
        const toRemove = [];
        
        for (const [pattern, adaptation] of this.adaptationRules) {
            const totalAttempts = adaptation.success_count + adaptation.failure_count;
            
            if (totalAttempts > 20) {
                const successRate = adaptation.success_count / totalAttempts;
                if (successRate < 0.3) {
                    toRemove.push(pattern);
                }
            }
        }
        
        toRemove.forEach(pattern => {
            console.log(`Removing ineffective adaptation for pattern ${pattern}`);
            this.adaptationRules.delete(pattern);
        });
    }

    shouldGenerateNewStrategy() {
        // Generate new strategy if we're seeing novel attack patterns
        const recentViolations = this.getRecentViolations();
        const novelPatterns = recentViolations.filter(v => !this.adaptationRules.has(v.fingerprint));
        
        return novelPatterns.length > 5; // Threshold for new strategy generation
    }

    generateNewStrategy() {
        console.log('Generating new adaptive strategy based on recent patterns');
        
        const recentPatterns = this.analyzeRecentPatterns();
        const newStrategy = {
            name: `Adaptive_Strategy_${Date.now()}`,
            effectiveness: 0.8, // Start with moderate effectiveness
            cost: 'medium',
            techniques: this.deriveOptimalTechniques(recentPatterns),
            adaptive: true,
            generated: true,
            creation_date: new Date().toISOString()
        };
        
        const strategyKey = `adaptive_${this.protectionStrategies.size}`;
        this.protectionStrategies.set(strategyKey, newStrategy);
        
        console.log(`Generated new strategy: ${strategyKey}`);
    }

    // Advanced Learning Methods
    exploreTechniqueCombinations(adaptation) {
        const allTechniques = [
            'authentication', 'authorization', 'rate_limiting',
            'pattern_recognition', 'anomaly_detection', 'ml_classification',
            'predictive_blocking', 'preemptive_isolation', 'dynamic_hardening',
            'behavioral_fingerprinting', 'entropy_analysis', 'temporal_correlation'
        ];
        
        // Use genetic algorithm approach to find optimal combinations
        const combinations = this.generateTechniqueCombinations(allTechniques);
        return this.selectBestCombination(combinations, adaptation);
    }

    generateTechniqueCombinations(techniques) {
        const combinations = [];
        
        // Generate combinations of 2-4 techniques
        for (let size = 2; size <= 4; size++) {
            const combos = this.getCombinations(techniques, size);
            combinations.push(...combos);
        }
        
        return combinations;
    }

    getCombinations(arr, size) {
        const combinations = [];
        
        function backtrack(start, current) {
            if (current.length === size) {
                combinations.push([...current]);
                return;
            }
            
            for (let i = start; i < arr.length; i++) {
                current.push(arr[i]);
                backtrack(i + 1, current);
                current.pop();
            }
        }
        
        backtrack(0, []);
        return combinations;
    }

    selectBestCombination(combinations, adaptation) {
        // Score combinations based on historical performance and compatibility
        let bestCombo = combinations[0] || [];
        let bestScore = 0;
        
        combinations.forEach(combo => {
            const score = this.scoreTechniqueCombination(combo, adaptation);
            if (score > bestScore) {
                bestScore = score;
                bestCombo = combo;
            }
        });
        
        return bestCombo;
    }

    scoreTechniqueCombination(combo, adaptation) {
        let score = 0;
        
        // Base score from technique effectiveness
        combo.forEach(technique => {
            score += this.getTechniqueEffectiveness(technique);
        });
        
        // Bonus for synergistic combinations
        score += this.getSynergyBonus(combo);
        
        // Penalty for complexity
        score -= combo.length * 0.1;
        
        return score;
    }

    getTechniqueEffectiveness(technique) {
        const effectiveness = {
            'authentication': 0.8,
            'authorization': 0.85,
            'rate_limiting': 0.7,
            'pattern_recognition': 0.9,
            'anomaly_detection': 0.85,
            'ml_classification': 0.95,
            'predictive_blocking': 0.9,
            'preemptive_isolation': 0.8,
            'dynamic_hardening': 0.85,
            'behavioral_fingerprinting': 0.9,
            'entropy_analysis': 0.8,
            'temporal_correlation': 0.75
        };
        
        return effectiveness[technique] || 0.5;
    }

    getSynergyBonus(combo) {
        // Define synergistic technique pairs
        const synergies = {
            'pattern_recognition+anomaly_detection': 0.2,
            'authentication+authorization': 0.15,
            'predictive_blocking+preemptive_isolation': 0.25,
            'behavioral_fingerprinting+entropy_analysis': 0.2,
            'ml_classification+temporal_correlation': 0.3
        };
        
        let bonus = 0;
        
        for (let i = 0; i < combo.length; i++) {
            for (let j = i + 1; j < combo.length; j++) {
                const pair = `${combo[i]}+${combo[j]}`;
                const reversePair = `${combo[j]}+${combo[i]}`;
                bonus += synergies[pair] || synergies[reversePair] || 0;
            }
        }
        
        return bonus;
    }

    // Utility Methods
    isNewPattern(violation) {
        return !this.adaptationRules.has(violation.fingerprint);
    }

    identifyUsedStrategy(response) {
        // Analyze response actions to identify which strategy was used
        if (!response || !response.actions_taken) return null;
        
        const actions = response.actions_taken.map(a => a.action);
        
        for (const [key, strategy] of this.protectionStrategies) {
            if (this.actionsMatchStrategy(actions, strategy.techniques)) {
                return key;
            }
        }
        
        return null;
    }

    actionsMatchStrategy(actions, techniques) {
        return techniques.some(technique => 
            actions.some(action => action.includes(technique.replace('_', '_')))
        );
    }

    updateStrategyEffectiveness(strategyKey, violation) {
        const strategy = this.protectionStrategies.get(strategyKey);
        if (strategy && strategy.adaptive) {
            // Slightly increase effectiveness for successful pattern matching
            strategy.effectiveness = Math.min(strategy.effectiveness * 1.01, 0.99);
        }
    }

    updateStrategySuccess(strategyKey, effectiveness) {
        const strategy = this.protectionStrategies.get(strategyKey);
        if (strategy) {
            // Exponential moving average of effectiveness
            const alpha = 0.1;
            strategy.effectiveness = (alpha * effectiveness) + ((1 - alpha) * strategy.effectiveness);
        }
    }

    getRecentViolations() {
        // In a real implementation, this would query recent violations from storage
        return []; // Placeholder
    }

    analyzeRecentPatterns() {
        // Analyze patterns from recent violations to inform strategy generation
        return {
            common_sources: ['unknown'],
            common_targets: ['system_files'],
            common_methods: ['direct_access'],
            temporal_patterns: ['business_hours'],
            severity_distribution: { 'low': 0.3, 'medium': 0.4, 'high': 0.2, 'critical': 0.1 }
        };
    }

    deriveOptimalTechniques(patterns) {
        // Derive optimal techniques based on pattern analysis
        const techniques = ['pattern_recognition', 'behavioral_fingerprinting'];
        
        if (patterns.severity_distribution.critical > 0.15) {
            techniques.push('predictive_blocking');
        }
        
        if (patterns.temporal_patterns.includes('business_hours')) {
            techniques.push('temporal_correlation');
        }
        
        return techniques;
    }

    calculateConfidence(violation) {
        // Calculate confidence based on pattern familiarity and data quality
        let confidence = 0.7; // Base confidence
        
        // Adjust based on data completeness
        const fields = ['type', 'source', 'target', 'severity'];
        const completeness = fields.filter(field => violation[field]).length / fields.length;
        confidence *= completeness;
        
        // Adjust based on pattern frequency
        if (this.adaptationRules.has(violation.fingerprint)) {
            const adaptation = this.adaptationRules.get(violation.fingerprint);
            const experience = adaptation.success_count + adaptation.failure_count;
            confidence *= Math.min(1 + (experience * 0.05), 1.5);
        }
        
        return Math.min(confidence, 0.99);
    }

    activateAggressiveTechniques() {
        console.log('Activating aggressive protection techniques');
        // Implementation would activate more stringent protection measures
    }

    optimizeResponseTimes() {
        console.log('Optimizing response times for faster threat mitigation');
        // Implementation would adjust system parameters for faster responses
    }
}

module.exports = AdaptiveProtectionEngine;