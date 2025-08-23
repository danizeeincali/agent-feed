/**
 * Neural Learning Development - WebSocket Hub Connection Pattern Learner
 * Learns from webhook failures and optimizes WebSocket connections
 */

class ConnectionPatternLearner {
  constructor() {
    this.patterns = new Map();
    this.connectionHistory = [];
    this.failurePatterns = [];
    this.successPatterns = [];
    this.learningRate = 0.1;
    this.patternThreshold = 0.75;
    this.maxHistorySize = 10000;
  }

  /**
   * Learn from connection attempt
   */
  learnConnection(connectionData) {
    const pattern = this.extractConnectionPattern(connectionData);
    const outcome = connectionData.success ? 'success' : 'failure';
    
    // Store in history
    this.connectionHistory.push({
      timestamp: Date.now(),
      pattern,
      outcome,
      latency: connectionData.latency,
      retryCount: connectionData.retryCount || 0,
      errorType: connectionData.errorType || null
    });

    // Trim history if too large
    if (this.connectionHistory.length > this.maxHistorySize) {
      this.connectionHistory = this.connectionHistory.slice(-this.maxHistorySize);
    }

    // Update pattern weights
    this.updatePatternWeights(pattern, outcome, connectionData);
    
    // Store specific failure/success patterns
    if (outcome === 'failure') {
      this.learnFailurePattern(pattern, connectionData);
    } else {
      this.learnSuccessPattern(pattern, connectionData);
    }

    return this.analyzePattern(pattern);
  }

  /**
   * Extract connection pattern features
   */
  extractConnectionPattern(data) {
    return {
      protocol: data.protocol || 'websocket',
      endpoint: this.hashEndpoint(data.endpoint),
      timeOfDay: this.getTimeCategory(data.timestamp),
      loadLevel: this.categorizeLoad(data.currentConnections),
      instanceHealth: data.instanceHealth || 'unknown',
      previousFailures: data.recentFailures || 0,
      networkLatency: this.categorizeLatency(data.networkLatency),
      messageVolume: this.categorizeVolume(data.messageVolume)
    };
  }

  /**
   * Update pattern weights based on outcome
   */
  updatePatternWeights(pattern, outcome, data) {
    const patternKey = this.serializePattern(pattern);
    
    if (!this.patterns.has(patternKey)) {
      this.patterns.set(patternKey, {
        successCount: 0,
        failureCount: 0,
        totalLatency: 0,
        attempts: 0,
        lastSeen: Date.now(),
        features: pattern
      });
    }

    const patternStats = this.patterns.get(patternKey);
    patternStats.attempts++;
    patternStats.lastSeen = Date.now();
    patternStats.totalLatency += data.latency || 0;

    if (outcome === 'success') {
      patternStats.successCount++;
    } else {
      patternStats.failureCount++;
    }

    // Calculate success rate
    patternStats.successRate = patternStats.successCount / patternStats.attempts;
    patternStats.avgLatency = patternStats.totalLatency / patternStats.attempts;
  }

  /**
   * Learn specific failure patterns
   */
  learnFailurePattern(pattern, data) {
    const failureSignature = {
      pattern,
      errorType: data.errorType,
      errorMessage: data.errorMessage,
      timestamp: Date.now(),
      preconditions: {
        loadLevel: pattern.loadLevel,
        instanceHealth: pattern.instanceHealth,
        recentFailures: data.recentFailures || 0
      }
    };

    this.failurePatterns.push(failureSignature);
    
    // Keep only recent failure patterns
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.failurePatterns = this.failurePatterns.filter(fp => fp.timestamp > oneHourAgo);
  }

  /**
   * Learn successful connection patterns
   */
  learnSuccessPattern(pattern, data) {
    const successSignature = {
      pattern,
      latency: data.latency,
      timestamp: Date.now(),
      conditions: {
        loadLevel: pattern.loadLevel,
        instanceHealth: pattern.instanceHealth,
        messageVolume: pattern.messageVolume
      }
    };

    this.successPatterns.push(successSignature);
    
    // Keep only recent success patterns
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.successPatterns = this.successPatterns.filter(sp => sp.timestamp > oneHourAgo);
  }

  /**
   * Predict connection success probability
   */
  predictConnectionSuccess(connectionAttempt) {
    const pattern = this.extractConnectionPattern(connectionAttempt);
    const patternKey = this.serializePattern(pattern);
    
    // Direct pattern match
    if (this.patterns.has(patternKey)) {
      const stats = this.patterns.get(patternKey);
      return {
        probability: stats.successRate,
        confidence: Math.min(stats.attempts / 10, 1.0),
        expectedLatency: stats.avgLatency,
        recommendation: this.generateRecommendation(stats)
      };
    }

    // Fuzzy pattern matching
    return this.fuzzyPatternMatch(pattern);
  }

  /**
   * Fuzzy pattern matching for similar patterns
   */
  fuzzyPatternMatch(targetPattern) {
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const [patternKey, stats] of this.patterns) {
      const similarity = this.calculatePatternSimilarity(targetPattern, stats.features);
      if (similarity > bestSimilarity && similarity > 0.7) {
        bestSimilarity = similarity;
        bestMatch = stats;
      }
    }

    if (bestMatch) {
      return {
        probability: bestMatch.successRate * bestSimilarity,
        confidence: bestSimilarity,
        expectedLatency: bestMatch.avgLatency,
        recommendation: this.generateRecommendation(bestMatch)
      };
    }

    // Default prediction for unknown patterns
    return {
      probability: 0.5,
      confidence: 0.0,
      expectedLatency: 1000,
      recommendation: 'unknown_pattern'
    };
  }

  /**
   * Calculate similarity between patterns
   */
  calculatePatternSimilarity(pattern1, pattern2) {
    const weights = {
      protocol: 0.2,
      endpoint: 0.15,
      timeOfDay: 0.1,
      loadLevel: 0.2,
      instanceHealth: 0.15,
      networkLatency: 0.1,
      messageVolume: 0.1
    };

    let similarity = 0;
    let totalWeight = 0;

    for (const [key, weight] of Object.entries(weights)) {
      if (pattern1[key] && pattern2[key]) {
        if (pattern1[key] === pattern2[key]) {
          similarity += weight;
        }
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  /**
   * Generate recommendation based on pattern
   */
  generateRecommendation(stats) {
    if (stats.successRate > 0.9) return 'proceed';
    if (stats.successRate > 0.7) return 'proceed_with_monitoring';
    if (stats.successRate > 0.5) return 'retry_with_backoff';
    if (stats.successRate > 0.3) return 'alternative_endpoint';
    return 'defer_connection';
  }

  /**
   * Analyze current connection trends
   */
  analyzeTrends() {
    const recentHistory = this.connectionHistory.slice(-100);
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentConnections = recentHistory.filter(h => h.timestamp > oneHourAgo);
    const successRate = recentConnections.filter(h => h.outcome === 'success').length / recentConnections.length;
    
    return {
      recentSuccessRate: successRate || 0,
      totalPatterns: this.patterns.size,
      recentConnections: recentConnections.length,
      avgLatency: recentConnections.reduce((sum, h) => sum + (h.latency || 0), 0) / recentConnections.length,
      topFailureReasons: this.getTopFailureReasons(),
      recommendations: this.generateTrendRecommendations(successRate)
    };
  }

  /**
   * Get top failure reasons
   */
  getTopFailureReasons() {
    const failureReasons = {};
    this.failurePatterns.forEach(fp => {
      const reason = fp.errorType || 'unknown';
      failureReasons[reason] = (failureReasons[reason] || 0) + 1;
    });

    return Object.entries(failureReasons)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));
  }

  /**
   * Generate trend-based recommendations
   */
  generateTrendRecommendations(successRate) {
    const recommendations = [];

    if (successRate < 0.5) {
      recommendations.push('critical_connection_issues');
      recommendations.push('investigate_infrastructure');
    } else if (successRate < 0.7) {
      recommendations.push('monitor_connection_health');
      recommendations.push('implement_circuit_breaker');
    } else if (successRate < 0.9) {
      recommendations.push('optimize_retry_logic');
    }

    return recommendations;
  }

  // Helper methods
  hashEndpoint(endpoint) {
    return endpoint ? endpoint.split('/').pop() : 'unknown';
  }

  getTimeCategory(timestamp) {
    const hour = new Date(timestamp).getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  categorizeLoad(connections) {
    if (connections < 10) return 'low';
    if (connections < 50) return 'medium';
    if (connections < 100) return 'high';
    return 'critical';
  }

  categorizeLatency(latency) {
    if (latency < 100) return 'fast';
    if (latency < 500) return 'medium';
    if (latency < 1000) return 'slow';
    return 'very_slow';
  }

  categorizeVolume(volume) {
    if (volume < 10) return 'low';
    if (volume < 100) return 'medium';
    if (volume < 1000) return 'high';
    return 'very_high';
  }

  serializePattern(pattern) {
    return JSON.stringify(pattern, Object.keys(pattern).sort());
  }

  /**
   * Export learned patterns for storage
   */
  exportPatterns() {
    return {
      timestamp: Date.now(),
      patterns: Array.from(this.patterns.entries()).map(([key, value]) => ({
        pattern: key,
        stats: value
      })),
      failurePatterns: this.failurePatterns,
      successPatterns: this.successPatterns,
      metadata: {
        totalConnections: this.connectionHistory.length,
        learningRate: this.learningRate,
        version: '1.0.0'
      }
    };
  }

  /**
   * Import previously learned patterns
   */
  importPatterns(data) {
    if (data.patterns) {
      this.patterns.clear();
      data.patterns.forEach(({ pattern, stats }) => {
        this.patterns.set(pattern, stats);
      });
    }

    if (data.failurePatterns) {
      this.failurePatterns = data.failurePatterns;
    }

    if (data.successPatterns) {
      this.successPatterns = data.successPatterns;
    }
  }
}

module.exports = ConnectionPatternLearner;