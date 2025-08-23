/**
 * Neural Learning Development - WebSocket Lifecycle Pattern Analyzer
 * Analyzes WebSocket connection lifecycle patterns for optimization
 */

class LifecyclePatternAnalyzer {
  constructor() {
    this.lifecyclePatterns = new Map();
    this.stateTransitions = new Map();
    this.phaseAnalytics = new Map();
    this.lifecycleHistory = [];
    this.optimizationOpportunities = [];
    this.performanceBaselines = new Map();
    this.maxHistorySize = 5000;
  }

  /**
   * Analyze complete lifecycle of a WebSocket connection
   */
  analyzeLifecycle(lifecycleData) {
    const lifecycle = this.processLifecycleData(lifecycleData);
    const pattern = this.extractLifecyclePattern(lifecycle);
    
    // Store lifecycle for analysis
    this.storeLifecycle(lifecycle);
    
    // Update patterns
    this.updateLifecyclePatterns(pattern, lifecycle);
    
    // Analyze state transitions
    this.analyzeStateTransitions(lifecycle);
    
    // Identify optimization opportunities
    const opportunities = this.identifyOptimizationOpportunities(lifecycle, pattern);
    
    return {
      lifecycle,
      pattern,
      performance: this.calculateLifecyclePerformance(lifecycle),
      opportunities,
      recommendations: this.generateLifecycleRecommendations(lifecycle, opportunities)
    };
  }

  /**
   * Process raw lifecycle data into structured format
   */
  processLifecycleData(data) {
    return {
      connectionId: data.connectionId,
      startTime: data.startTime,
      endTime: data.endTime || Date.now(),
      duration: (data.endTime || Date.now()) - data.startTime,
      phases: this.extractPhases(data),
      states: data.states || [],
      events: data.events || [],
      metrics: data.metrics || {},
      outcome: data.outcome || 'ongoing'
    };
  }

  /**
   * Extract lifecycle phases from data
   */
  extractPhases(data) {
    const phases = [];
    const events = data.events || [];
    
    // Connection establishment phase
    const handshakeStart = events.find(e => e.type === 'handshake_start');
    const handshakeComplete = events.find(e => e.type === 'handshake_complete');
    
    if (handshakeStart && handshakeComplete) {
      phases.push({
        name: 'establishment',
        startTime: handshakeStart.timestamp,
        endTime: handshakeComplete.timestamp,
        duration: handshakeComplete.timestamp - handshakeStart.timestamp,
        success: true
      });
    }

    // Active communication phase
    const firstMessage = events.find(e => e.type === 'message_sent' || e.type === 'message_received');
    const lastMessage = events.filter(e => e.type === 'message_sent' || e.type === 'message_received').pop();
    
    if (firstMessage && lastMessage) {
      phases.push({
        name: 'communication',
        startTime: firstMessage.timestamp,
        endTime: lastMessage.timestamp,
        duration: lastMessage.timestamp - firstMessage.timestamp,
        messageCount: events.filter(e => e.type === 'message_sent' || e.type === 'message_received').length
      });
    }

    // Termination phase
    const closeInitiated = events.find(e => e.type === 'close_initiated');
    const connectionClosed = events.find(e => e.type === 'connection_closed');
    
    if (closeInitiated && connectionClosed) {
      phases.push({
        name: 'termination',
        startTime: closeInitiated.timestamp,
        endTime: connectionClosed.timestamp,
        duration: connectionClosed.timestamp - closeInitiated.timestamp,
        reason: closeInitiated.reason || 'unknown'
      });
    }

    return phases;
  }

  /**
   * Extract pattern from lifecycle
   */
  extractLifecyclePattern(lifecycle) {
    return {
      duration: this.categorizeDuration(lifecycle.duration),
      phaseCount: lifecycle.phases.length,
      dominantPhase: this.findDominantPhase(lifecycle.phases),
      communicationPattern: this.analyzeCommunicationPattern(lifecycle),
      terminationReason: this.categorizeTermination(lifecycle),
      performanceProfile: this.extractPerformanceProfile(lifecycle),
      errorPattern: this.analyzeErrorPattern(lifecycle)
    };
  }

  /**
   * Analyze communication patterns within lifecycle
   */
  analyzeCommunicationPattern(lifecycle) {
    const messages = lifecycle.events.filter(e => 
      e.type === 'message_sent' || e.type === 'message_received'
    );

    if (messages.length === 0) {
      return { type: 'no_communication', frequency: 0, volume: 0 };
    }

    const timeSpan = messages[messages.length - 1].timestamp - messages[0].timestamp;
    const frequency = messages.length / (timeSpan / 1000); // messages per second
    const totalVolume = messages.reduce((sum, msg) => sum + (msg.size || 0), 0);

    return {
      type: this.categorizeCommPattern(frequency, totalVolume),
      frequency,
      volume: totalVolume,
      messageCount: messages.length,
      avgMessageSize: totalVolume / messages.length
    };
  }

  /**
   * Update lifecycle patterns with new data
   */
  updateLifecyclePatterns(pattern, lifecycle) {
    const patternKey = this.createPatternKey(pattern);
    
    if (!this.lifecyclePatterns.has(patternKey)) {
      this.lifecyclePatterns.set(patternKey, {
        pattern,
        occurrences: 0,
        totalDuration: 0,
        avgDuration: 0,
        successRate: 0,
        performanceMetrics: {
          avgLatency: 0,
          avgThroughput: 0,
          errorRate: 0
        },
        lifecycles: []
      });
    }

    const patternData = this.lifecyclePatterns.get(patternKey);
    patternData.occurrences++;
    patternData.totalDuration += lifecycle.duration;
    patternData.avgDuration = patternData.totalDuration / patternData.occurrences;
    
    // Track recent lifecycles for this pattern
    patternData.lifecycles.push({
      id: lifecycle.connectionId,
      duration: lifecycle.duration,
      outcome: lifecycle.outcome,
      timestamp: Date.now()
    });

    // Keep only recent lifecycles
    if (patternData.lifecycles.length > 100) {
      patternData.lifecycles = patternData.lifecycles.slice(-100);
    }

    // Update success rate
    const successfulLifecycles = patternData.lifecycles.filter(l => l.outcome === 'success').length;
    patternData.successRate = successfulLifecycles / patternData.lifecycles.length;

    // Update performance metrics
    this.updatePatternPerformanceMetrics(patternData, lifecycle);
  }

  /**
   * Analyze state transitions throughout lifecycle
   */
  analyzeStateTransitions(lifecycle) {
    const states = lifecycle.states;
    
    for (let i = 1; i < states.length; i++) {
      const transition = `${states[i-1].state}->${states[i].state}`;
      const duration = states[i].timestamp - states[i-1].timestamp;
      
      if (!this.stateTransitions.has(transition)) {
        this.stateTransitions.set(transition, {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          successRate: 0,
          failures: 0
        });
      }

      const transitionData = this.stateTransitions.get(transition);
      transitionData.count++;
      transitionData.totalDuration += duration;
      transitionData.avgDuration = transitionData.totalDuration / transitionData.count;
      transitionData.minDuration = Math.min(transitionData.minDuration, duration);
      transitionData.maxDuration = Math.max(transitionData.maxDuration, duration);

      // Track if transition was successful
      if (states[i].error) {
        transitionData.failures++;
      }
      transitionData.successRate = (transitionData.count - transitionData.failures) / transitionData.count;
    }
  }

  /**
   * Identify optimization opportunities
   */
  identifyOptimizationOpportunities(lifecycle, pattern) {
    const opportunities = [];

    // Slow establishment phase
    const establishmentPhase = lifecycle.phases.find(p => p.name === 'establishment');
    if (establishmentPhase && establishmentPhase.duration > 5000) {
      opportunities.push({
        type: 'slow_establishment',
        phase: 'establishment',
        currentDuration: establishmentPhase.duration,
        targetDuration: 2000,
        priority: 'high',
        potentialImprovement: (establishmentPhase.duration - 2000) / 1000 + 's saved'
      });
    }

    // Long-running idle connections
    if (lifecycle.duration > 300000 && pattern.communicationPattern.messageCount < 10) {
      opportunities.push({
        type: 'idle_connection',
        phase: 'communication',
        idleDuration: lifecycle.duration,
        messageCount: pattern.communicationPattern.messageCount,
        priority: 'medium',
        potentialImprovement: 'resource_optimization'
      });
    }

    // Inefficient termination
    const terminationPhase = lifecycle.phases.find(p => p.name === 'termination');
    if (terminationPhase && terminationPhase.duration > 10000) {
      opportunities.push({
        type: 'slow_termination',
        phase: 'termination',
        currentDuration: terminationPhase.duration,
        targetDuration: 2000,
        priority: 'medium',
        potentialImprovement: 'faster_cleanup'
      });
    }

    // High error rate patterns
    if (pattern.errorPattern.errorRate > 0.1) {
      opportunities.push({
        type: 'high_error_rate',
        phase: 'communication',
        errorRate: pattern.errorPattern.errorRate,
        errorCount: pattern.errorPattern.errorCount,
        priority: 'high',
        potentialImprovement: 'reliability_improvement'
      });
    }

    return opportunities;
  }

  /**
   * Generate lifecycle recommendations
   */
  generateLifecycleRecommendations(lifecycle, opportunities) {
    const recommendations = [];

    opportunities.forEach(opp => {
      switch (opp.type) {
        case 'slow_establishment':
          recommendations.push({
            action: 'optimize_handshake',
            description: 'Reduce connection establishment time',
            implementation: 'connection_pooling',
            priority: opp.priority
          });
          break;

        case 'idle_connection':
          recommendations.push({
            action: 'implement_idle_timeout',
            description: 'Close idle connections automatically',
            implementation: 'heartbeat_mechanism',
            priority: opp.priority
          });
          break;

        case 'slow_termination':
          recommendations.push({
            action: 'optimize_cleanup',
            description: 'Improve connection cleanup process',
            implementation: 'async_cleanup',
            priority: opp.priority
          });
          break;

        case 'high_error_rate':
          recommendations.push({
            action: 'improve_error_handling',
            description: 'Reduce communication errors',
            implementation: 'retry_logic',
            priority: opp.priority
          });
          break;
      }
    });

    // Pattern-specific recommendations
    const patternKey = this.createPatternKey(this.extractLifecyclePattern(lifecycle));
    const patternData = this.lifecyclePatterns.get(patternKey);
    
    if (patternData && patternData.successRate < 0.8) {
      recommendations.push({
        action: 'investigate_pattern_failures',
        description: `Pattern has low success rate: ${(patternData.successRate * 100).toFixed(1)}%`,
        implementation: 'pattern_analysis',
        priority: 'high'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calculate lifecycle performance score
   */
  calculateLifecyclePerformance(lifecycle) {
    let score = 1.0;

    // Penalize long establishment time
    const establishmentPhase = lifecycle.phases.find(p => p.name === 'establishment');
    if (establishmentPhase) {
      score -= Math.min(0.3, establishmentPhase.duration / 10000);
    }

    // Penalize errors
    const errorCount = lifecycle.events.filter(e => e.type === 'error').length;
    score -= errorCount * 0.1;

    // Penalize inefficient termination
    const terminationPhase = lifecycle.phases.find(p => p.name === 'termination');
    if (terminationPhase && terminationPhase.duration > 5000) {
      score -= 0.1;
    }

    // Bonus for successful completion
    if (lifecycle.outcome === 'success') {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Analyze lifecycle trends over time
   */
  analyzeLifecycleTrends(timeWindow = 3600000) { // 1 hour default
    const now = Date.now();
    const recentLifecycles = this.lifecycleHistory.filter(
      l => now - l.endTime < timeWindow
    );

    if (recentLifecycles.length === 0) {
      return { noData: true };
    }

    // Calculate trends
    const avgDuration = recentLifecycles.reduce((sum, l) => sum + l.duration, 0) / recentLifecycles.length;
    const successRate = recentLifecycles.filter(l => l.outcome === 'success').length / recentLifecycles.length;
    const errorRate = recentLifecycles.reduce((sum, l) => {
      const errors = l.events.filter(e => e.type === 'error').length;
      return sum + errors;
    }, 0) / recentLifecycles.length;

    // Compare with historical baselines
    const baseline = this.getHistoricalBaseline();
    
    return {
      current: {
        avgDuration,
        successRate,
        errorRate,
        count: recentLifecycles.length
      },
      baseline: baseline,
      trends: {
        duration: this.calculateTrend(recentLifecycles.map(l => l.duration)),
        successRate: this.calculateTrend(recentLifecycles.map(l => l.outcome === 'success' ? 1 : 0)),
        errorRate: this.calculateTrend(recentLifecycles.map(l => l.events.filter(e => e.type === 'error').length))
      },
      recommendations: this.generateTrendRecommendations(avgDuration, successRate, errorRate, baseline)
    };
  }

  /**
   * Store lifecycle for historical analysis
   */
  storeLifecycle(lifecycle) {
    this.lifecycleHistory.push(lifecycle);
    
    // Trim history
    if (this.lifecycleHistory.length > this.maxHistorySize) {
      this.lifecycleHistory = this.lifecycleHistory.slice(-this.maxHistorySize);
    }
  }

  // Helper methods
  categorizeDuration(duration) {
    if (duration < 10000) return 'short';
    if (duration < 60000) return 'medium';
    if (duration < 300000) return 'long';
    return 'very_long';
  }

  findDominantPhase(phases) {
    if (phases.length === 0) return 'none';
    
    return phases.reduce((longest, phase) => 
      phase.duration > longest.duration ? phase : longest
    ).name;
  }

  categorizeCommPattern(frequency, volume) {
    if (frequency > 10) return 'high_frequency';
    if (frequency > 1) return 'moderate_frequency';
    if (volume > 10000) return 'high_volume';
    if (volume > 1000) return 'moderate_volume';
    return 'low_activity';
  }

  categorizeTermination(lifecycle) {
    const closeEvent = lifecycle.events.find(e => e.type === 'connection_closed');
    if (!closeEvent) return 'unknown';
    
    const reason = closeEvent.reason || 'normal';
    return reason;
  }

  extractPerformanceProfile(lifecycle) {
    const events = lifecycle.events;
    const latencyEvents = events.filter(e => e.latency !== undefined);
    const avgLatency = latencyEvents.length > 0 
      ? latencyEvents.reduce((sum, e) => sum + e.latency, 0) / latencyEvents.length 
      : 0;

    return {
      avgLatency,
      throughput: lifecycle.phases.find(p => p.name === 'communication')?.messageCount || 0,
      reliability: lifecycle.outcome === 'success' ? 1 : 0
    };
  }

  analyzeErrorPattern(lifecycle) {
    const errors = lifecycle.events.filter(e => e.type === 'error');
    
    return {
      errorCount: errors.length,
      errorRate: errors.length / Math.max(lifecycle.events.length, 1),
      errorTypes: [...new Set(errors.map(e => e.errorType || 'unknown'))],
      firstErrorTime: errors.length > 0 ? errors[0].timestamp - lifecycle.startTime : null
    };
  }

  updatePatternPerformanceMetrics(patternData, lifecycle) {
    const performance = this.extractPerformanceProfile(lifecycle);
    const metrics = patternData.performanceMetrics;
    const count = patternData.occurrences;

    // Update moving averages
    metrics.avgLatency = (metrics.avgLatency * (count - 1) + performance.avgLatency) / count;
    metrics.avgThroughput = (metrics.avgThroughput * (count - 1) + performance.throughput) / count;
    
    const errorRate = this.analyzeErrorPattern(lifecycle).errorRate;
    metrics.errorRate = (metrics.errorRate * (count - 1) + errorRate) / count;
  }

  createPatternKey(pattern) {
    const keyData = {
      duration: pattern.duration,
      phaseCount: pattern.phaseCount,
      dominantPhase: pattern.dominantPhase,
      commType: pattern.communicationPattern.type,
      termination: pattern.terminationReason
    };
    
    return JSON.stringify(keyData, Object.keys(keyData).sort());
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
    const sumXY = values.reduce((sum, val, index) => sum + ((typeof val === 'number' ? val : 0) * index), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  getHistoricalBaseline() {
    // Calculate baseline from historical data
    if (this.lifecycleHistory.length < 100) {
      return null;
    }

    const historical = this.lifecycleHistory.slice(0, -50); // Exclude recent data
    
    return {
      avgDuration: historical.reduce((sum, l) => sum + l.duration, 0) / historical.length,
      successRate: historical.filter(l => l.outcome === 'success').length / historical.length,
      errorRate: historical.reduce((sum, l) => {
        const errors = l.events.filter(e => e.type === 'error').length;
        return sum + errors;
      }, 0) / historical.length
    };
  }

  generateTrendRecommendations(avgDuration, successRate, errorRate, baseline) {
    const recommendations = [];

    if (baseline) {
      if (avgDuration > baseline.avgDuration * 1.2) {
        recommendations.push({
          type: 'performance_degradation',
          metric: 'duration',
          action: 'investigate_latency_increase'
        });
      }

      if (successRate < baseline.successRate * 0.9) {
        recommendations.push({
          type: 'reliability_degradation',
          metric: 'success_rate',
          action: 'investigate_failure_causes'
        });
      }

      if (errorRate > baseline.errorRate * 1.5) {
        recommendations.push({
          type: 'error_increase',
          metric: 'error_rate',
          action: 'review_error_handling'
        });
      }
    }

    return recommendations;
  }

  /**
   * Export lifecycle analysis data
   */
  exportLifecycleData() {
    return {
      timestamp: Date.now(),
      lifecyclePatterns: Array.from(this.lifecyclePatterns.entries()),
      stateTransitions: Array.from(this.stateTransitions.entries()),
      recentLifecycles: this.lifecycleHistory.slice(-1000),
      optimizationOpportunities: this.optimizationOpportunities,
      metadata: {
        maxHistorySize: this.maxHistorySize,
        version: '1.0.0'
      }
    };
  }

  /**
   * Import lifecycle analysis data
   */
  importLifecycleData(data) {
    if (data.lifecyclePatterns) {
      this.lifecyclePatterns = new Map(data.lifecyclePatterns);
    }
    if (data.stateTransitions) {
      this.stateTransitions = new Map(data.stateTransitions);
    }
    if (data.recentLifecycles) {
      this.lifecycleHistory = data.recentLifecycles;
    }
    if (data.optimizationOpportunities) {
      this.optimizationOpportunities = data.optimizationOpportunities;
    }
  }
}

module.exports = LifecyclePatternAnalyzer;