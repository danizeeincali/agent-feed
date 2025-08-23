/**
 * Neural Learning Development - Message Routing Efficiency Tracker
 * Tracks and optimizes message routing efficiency in WebSocket hub
 */

class MessageRoutingTracker {
  constructor() {
    this.routingMetrics = new Map();
    this.messageJourneys = new Map();
    this.routingEfficiency = new Map();
    this.bottleneckPatterns = new Map();
    this.routingHistory = [];
    this.pathOptimizations = new Map();
    this.maxHistorySize = 8000;
    this.learningRate = 0.1;
  }

  /**
   * Track message routing through the system
   */
  trackMessageRouting(messageData) {
    const journey = this.createMessageJourney(messageData);
    const efficiency = this.calculateRoutingEfficiency(journey);
    
    // Store journey for analysis
    this.storeMessageJourney(journey);
    
    // Update routing metrics
    this.updateRoutingMetrics(journey, efficiency);
    
    // Detect bottlenecks
    const bottlenecks = this.detectBottlenecks(journey);
    
    // Learn routing optimizations
    const optimizations = this.learnRoutingOptimizations(journey, efficiency);

    return {
      journey,
      efficiency,
      bottlenecks,
      optimizations,
      recommendations: this.generateRoutingRecommendations(journey, efficiency, bottlenecks)
    };
  }

  /**
   * Create message journey from routing data
   */
  createMessageJourney(data) {
    return {
      messageId: data.messageId,
      source: data.source,
      destination: data.destination,
      messageType: data.messageType || 'default',
      size: data.size || 0,
      priority: data.priority || 'normal',
      startTime: data.startTime,
      endTime: data.endTime || Date.now(),
      totalTime: (data.endTime || Date.now()) - data.startTime,
      hops: data.hops || [],
      path: data.path || [],
      queueTimes: data.queueTimes || [],
      processingTimes: data.processingTimes || [],
      errors: data.errors || [],
      retries: data.retries || 0,
      success: data.success !== false
    };
  }

  /**
   * Calculate routing efficiency metrics
   */
  calculateRoutingEfficiency(journey) {
    const directPathEstimate = this.estimateDirectPathTime(journey.source, journey.destination);
    const actualTime = journey.totalTime;
    const hopCount = journey.hops.length;
    const optimalHops = this.calculateOptimalHops(journey.source, journey.destination);
    
    // Time efficiency (0-1, higher is better)
    const timeEfficiency = directPathEstimate > 0 ? 
      Math.max(0, Math.min(1, directPathEstimate / actualTime)) : 0.5;
    
    // Path efficiency (0-1, higher is better)
    const pathEfficiency = optimalHops > 0 ? 
      Math.max(0, Math.min(1, optimalHops / hopCount)) : 0.5;
    
    // Queue efficiency (0-1, higher is better)
    const totalQueueTime = journey.queueTimes.reduce((sum, time) => sum + time, 0);
    const queueEfficiency = Math.max(0, 1 - (totalQueueTime / journey.totalTime));
    
    // Processing efficiency (0-1, higher is better)
    const totalProcessingTime = journey.processingTimes.reduce((sum, time) => sum + time, 0);
    const processingEfficiency = totalProcessingTime > 0 ? 
      Math.max(0, 1 - (totalProcessingTime / journey.totalTime)) : 1;
    
    // Overall efficiency score
    const overallEfficiency = (
      timeEfficiency * 0.3 +
      pathEfficiency * 0.25 +
      queueEfficiency * 0.25 +
      processingEfficiency * 0.2
    );

    return {
      timeEfficiency,
      pathEfficiency,
      queueEfficiency,
      processingEfficiency,
      overallEfficiency,
      metrics: {
        directPathEstimate,
        actualTime,
        hopCount,
        optimalHops,
        totalQueueTime,
        totalProcessingTime
      }
    };
  }

  /**
   * Store message journey for analysis
   */
  storeMessageJourney(journey) {
    this.messageJourneys.set(journey.messageId, journey);
    this.routingHistory.push({
      timestamp: Date.now(),
      messageId: journey.messageId,
      route: this.createRouteKey(journey.source, journey.destination),
      efficiency: this.calculateRoutingEfficiency(journey).overallEfficiency,
      duration: journey.totalTime,
      hopCount: journey.hops.length
    });

    // Trim history
    if (this.routingHistory.length > this.maxHistorySize) {
      this.routingHistory = this.routingHistory.slice(-this.maxHistorySize);
    }

    // Clean old journeys
    if (this.messageJourneys.size > 1000) {
      const oldestEntries = Array.from(this.messageJourneys.entries())
        .sort(([,a], [,b]) => a.startTime - b.startTime)
        .slice(0, 200);
      
      oldestEntries.forEach(([id]) => this.messageJourneys.delete(id));
    }
  }

  /**
   * Update routing metrics
   */
  updateRoutingMetrics(journey, efficiency) {
    const routeKey = this.createRouteKey(journey.source, journey.destination);
    
    if (!this.routingMetrics.has(routeKey)) {
      this.routingMetrics.set(routeKey, {
        route: routeKey,
        messageCount: 0,
        totalTime: 0,
        avgTime: 0,
        bestTime: Infinity,
        worstTime: 0,
        avgEfficiency: 0,
        totalEfficiency: 0,
        successRate: 0,
        successCount: 0,
        hopCounts: [],
        pathVariations: new Map(),
        recentPerformance: []
      });
    }

    const metrics = this.routingMetrics.get(routeKey);
    metrics.messageCount++;
    metrics.totalTime += journey.totalTime;
    metrics.avgTime = metrics.totalTime / metrics.messageCount;
    metrics.bestTime = Math.min(metrics.bestTime, journey.totalTime);
    metrics.worstTime = Math.max(metrics.worstTime, journey.totalTime);
    
    if (journey.success) {
      metrics.successCount++;
    }
    metrics.successRate = metrics.successCount / metrics.messageCount;
    
    // Update efficiency metrics
    metrics.totalEfficiency += efficiency.overallEfficiency;
    metrics.avgEfficiency = metrics.totalEfficiency / metrics.messageCount;
    
    // Track hop counts
    metrics.hopCounts.push(journey.hops.length);
    if (metrics.hopCounts.length > 100) {
      metrics.hopCounts = metrics.hopCounts.slice(-100);
    }
    
    // Track path variations
    const pathKey = JSON.stringify(journey.path);
    if (!metrics.pathVariations.has(pathKey)) {
      metrics.pathVariations.set(pathKey, {
        path: journey.path,
        count: 0,
        avgTime: 0,
        totalTime: 0
      });
    }
    
    const pathVariation = metrics.pathVariations.get(pathKey);
    pathVariation.count++;
    pathVariation.totalTime += journey.totalTime;
    pathVariation.avgTime = pathVariation.totalTime / pathVariation.count;
    
    // Store recent performance
    metrics.recentPerformance.push({
      timestamp: Date.now(),
      time: journey.totalTime,
      efficiency: efficiency.overallEfficiency,
      success: journey.success
    });
    
    // Keep only recent performance data
    if (metrics.recentPerformance.length > 50) {
      metrics.recentPerformance = metrics.recentPerformance.slice(-50);
    }
  }

  /**
   * Detect routing bottlenecks
   */
  detectBottlenecks(journey) {
    const bottlenecks = [];
    
    // Analyze each hop for bottlenecks
    journey.hops.forEach((hop, index) => {
      const hopTime = journey.processingTimes[index] || 0;
      const queueTime = journey.queueTimes[index] || 0;
      const totalHopTime = hopTime + queueTime;
      
      // High processing time
      if (hopTime > journey.totalTime * 0.3) {
        bottlenecks.push({
          type: 'high_processing_time',
          location: hop.node,
          processingTime: hopTime,
          percentage: (hopTime / journey.totalTime) * 100,
          severity: 'high'
        });
      }
      
      // High queue time
      if (queueTime > journey.totalTime * 0.2) {
        bottlenecks.push({
          type: 'high_queue_time',
          location: hop.node,
          queueTime: queueTime,
          percentage: (queueTime / journey.totalTime) * 100,
          severity: 'medium'
        });
      }
      
      // Overall hop bottleneck
      if (totalHopTime > journey.totalTime * 0.4) {
        bottlenecks.push({
          type: 'hop_bottleneck',
          location: hop.node,
          totalTime: totalHopTime,
          percentage: (totalHopTime / journey.totalTime) * 100,
          severity: 'high'
        });
      }
    });
    
    // Analyze overall path efficiency
    const pathEfficiency = this.calculateRoutingEfficiency(journey).pathEfficiency;
    if (pathEfficiency < 0.5) {
      bottlenecks.push({
        type: 'inefficient_path',
        efficiency: pathEfficiency,
        currentHops: journey.hops.length,
        optimalHops: this.calculateOptimalHops(journey.source, journey.destination),
        severity: 'medium'
      });
    }
    
    return bottlenecks;
  }

  /**
   * Learn routing optimizations from patterns
   */
  learnRoutingOptimizations(journey, efficiency) {
    const routeKey = this.createRouteKey(journey.source, journey.destination);
    const optimizations = [];
    
    // Learn from successful efficient routes
    if (journey.success && efficiency.overallEfficiency > 0.8) {
      this.recordSuccessfulPattern(routeKey, journey, efficiency);
    }
    
    // Learn from failed or inefficient routes
    if (!journey.success || efficiency.overallEfficiency < 0.5) {
      optimizations.push(...this.analyzeInefficiencies(journey, efficiency));
    }
    
    // Compare with historical performance
    const historical = this.getHistoricalPerformance(routeKey);
    if (historical) {
      optimizations.push(...this.compareWithHistorical(journey, efficiency, historical));
    }
    
    // Learn from retry patterns
    if (journey.retries > 0) {
      optimizations.push(...this.analyzeRetryPatterns(journey));
    }
    
    return optimizations;
  }

  /**
   * Record successful routing patterns
   */
  recordSuccessfulPattern(routeKey, journey, efficiency) {
    if (!this.pathOptimizations.has(routeKey)) {
      this.pathOptimizations.set(routeKey, {
        route: routeKey,
        successfulPaths: new Map(),
        bestPath: null,
        bestEfficiency: 0
      });
    }
    
    const optimization = this.pathOptimizations.get(routeKey);
    const pathKey = JSON.stringify(journey.path);
    
    if (!optimization.successfulPaths.has(pathKey)) {
      optimization.successfulPaths.set(pathKey, {
        path: journey.path,
        count: 0,
        avgEfficiency: 0,
        totalEfficiency: 0,
        avgTime: 0,
        totalTime: 0
      });
    }
    
    const pathData = optimization.successfulPaths.get(pathKey);
    pathData.count++;
    pathData.totalEfficiency += efficiency.overallEfficiency;
    pathData.avgEfficiency = pathData.totalEfficiency / pathData.count;
    pathData.totalTime += journey.totalTime;
    pathData.avgTime = pathData.totalTime / pathData.count;
    
    // Update best path if this is better
    if (pathData.avgEfficiency > optimization.bestEfficiency && pathData.count >= 3) {
      optimization.bestPath = pathKey;
      optimization.bestEfficiency = pathData.avgEfficiency;
    }
  }

  /**
   * Analyze inefficiencies in routing
   */
  analyzeInefficiencies(journey, efficiency) {
    const optimizations = [];
    
    // Path inefficiency
    if (efficiency.pathEfficiency < 0.6) {
      optimizations.push({
        type: 'path_optimization',
        issue: 'suboptimal_path',
        currentPath: journey.path,
        suggestedImprovement: 'find_shorter_path',
        priority: 'high'
      });
    }
    
    // Queue time inefficiency
    if (efficiency.queueEfficiency < 0.7) {
      const maxQueueHop = this.findMaxQueueTimeHop(journey);
      optimizations.push({
        type: 'queue_optimization',
        issue: 'high_queue_times',
        problematicNode: maxQueueHop.node,
        queueTime: maxQueueHop.queueTime,
        suggestedImprovement: 'load_balancing',
        priority: 'medium'
      });
    }
    
    // Processing inefficiency
    if (efficiency.processingEfficiency < 0.7) {
      const maxProcessingHop = this.findMaxProcessingTimeHop(journey);
      optimizations.push({
        type: 'processing_optimization',
        issue: 'high_processing_times',
        problematicNode: maxProcessingHop.node,
        processingTime: maxProcessingHop.processingTime,
        suggestedImprovement: 'performance_tuning',
        priority: 'high'
      });
    }
    
    return optimizations;
  }

  /**
   * Compare current performance with historical data
   */
  compareWithHistorical(journey, efficiency, historical) {
    const optimizations = [];
    
    // Time performance degradation
    if (journey.totalTime > historical.avgTime * 1.5) {
      optimizations.push({
        type: 'performance_degradation',
        issue: 'increased_latency',
        currentTime: journey.totalTime,
        historicalAvg: historical.avgTime,
        degradation: ((journey.totalTime - historical.avgTime) / historical.avgTime) * 100,
        suggestedImprovement: 'investigate_latency_increase',
        priority: 'high'
      });
    }
    
    // Efficiency degradation
    if (efficiency.overallEfficiency < historical.avgEfficiency * 0.8) {
      optimizations.push({
        type: 'efficiency_degradation',
        issue: 'decreased_efficiency',
        currentEfficiency: efficiency.overallEfficiency,
        historicalAvg: historical.avgEfficiency,
        degradation: ((historical.avgEfficiency - efficiency.overallEfficiency) / historical.avgEfficiency) * 100,
        suggestedImprovement: 'efficiency_analysis',
        priority: 'medium'
      });
    }
    
    return optimizations;
  }

  /**
   * Analyze retry patterns for optimization
   */
  analyzeRetryPatterns(journey) {
    const optimizations = [];
    
    if (journey.retries > 2) {
      optimizations.push({
        type: 'retry_optimization',
        issue: 'excessive_retries',
        retryCount: journey.retries,
        suggestedImprovement: 'improve_reliability',
        priority: 'medium'
      });
    }
    
    return optimizations;
  }

  /**
   * Generate routing recommendations
   */
  generateRoutingRecommendations(journey, efficiency, bottlenecks) {
    const recommendations = [];
    
    // Efficiency-based recommendations
    if (efficiency.overallEfficiency < 0.6) {
      recommendations.push({
        type: 'efficiency_improvement',
        priority: 'high',
        action: 'optimize_routing_algorithm',
        description: 'Overall routing efficiency is below threshold'
      });
    }
    
    // Bottleneck-based recommendations
    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.type) {
        case 'high_processing_time':
          recommendations.push({
            type: 'processing_optimization',
            priority: bottleneck.severity === 'high' ? 'high' : 'medium',
            action: 'optimize_node_processing',
            target: bottleneck.location,
            description: `High processing time at ${bottleneck.location}`
          });
          break;
          
        case 'high_queue_time':
          recommendations.push({
            type: 'queue_optimization',
            priority: 'medium',
            action: 'implement_load_balancing',
            target: bottleneck.location,
            description: `High queue time at ${bottleneck.location}`
          });
          break;
          
        case 'inefficient_path':
          recommendations.push({
            type: 'path_optimization',
            priority: 'medium',
            action: 'find_alternative_routes',
            description: 'Current path is not optimal'
          });
          break;
      }
    });
    
    // Pattern-based recommendations
    const routeKey = this.createRouteKey(journey.source, journey.destination);
    const optimization = this.pathOptimizations.get(routeKey);
    
    if (optimization && optimization.bestPath) {
      const currentPathKey = JSON.stringify(journey.path);
      if (currentPathKey !== optimization.bestPath) {
        recommendations.push({
          type: 'path_suggestion',
          priority: 'low',
          action: 'use_optimal_path',
          description: 'A more efficient path is available for this route'
        });
      }
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Analyze routing performance trends
   */
  analyzeRoutingTrends(timeWindow = 3600000) { // 1 hour default
    const now = Date.now();
    const recentHistory = this.routingHistory.filter(
      h => now - h.timestamp < timeWindow
    );
    
    if (recentHistory.length === 0) {
      return { noData: true };
    }
    
    // Calculate trends
    const efficiencyTrend = this.calculateTrend(recentHistory.map(h => h.efficiency));
    const durationTrend = this.calculateTrend(recentHistory.map(h => h.duration));
    const hopCountTrend = this.calculateTrend(recentHistory.map(h => h.hopCount));
    
    // Route analysis
    const routePerformance = this.analyzeRoutePerformance(recentHistory);
    
    return {
      trends: {
        efficiency: efficiencyTrend,
        duration: durationTrend,
        hopCount: hopCountTrend
      },
      routePerformance,
      summary: {
        totalMessages: recentHistory.length,
        avgEfficiency: recentHistory.reduce((sum, h) => sum + h.efficiency, 0) / recentHistory.length,
        avgDuration: recentHistory.reduce((sum, h) => sum + h.duration, 0) / recentHistory.length,
        avgHopCount: recentHistory.reduce((sum, h) => sum + h.hopCount, 0) / recentHistory.length
      }
    };
  }

  // Helper methods
  createRouteKey(source, destination) {
    return `${source}->${destination}`;
  }

  estimateDirectPathTime(source, destination) {
    // Simple estimation based on network distance
    // In production, this would use actual network topology data
    return 100; // Base latency assumption
  }

  calculateOptimalHops(source, destination) {
    // Calculate minimum hops needed for route
    // In production, this would use actual network topology
    return 2; // Assumption: most routes need at least 2 hops
  }

  findMaxQueueTimeHop(journey) {
    let maxIndex = 0;
    let maxTime = 0;
    
    journey.queueTimes.forEach((time, index) => {
      if (time > maxTime) {
        maxTime = time;
        maxIndex = index;
      }
    });
    
    return {
      node: journey.hops[maxIndex]?.node || 'unknown',
      queueTime: maxTime
    };
  }

  findMaxProcessingTimeHop(journey) {
    let maxIndex = 0;
    let maxTime = 0;
    
    journey.processingTimes.forEach((time, index) => {
      if (time > maxTime) {
        maxTime = time;
        maxIndex = index;
      }
    });
    
    return {
      node: journey.hops[maxIndex]?.node || 'unknown',
      processingTime: maxTime
    };
  }

  getHistoricalPerformance(routeKey) {
    return this.routingMetrics.get(routeKey);
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (val * index), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  analyzeRoutePerformance(history) {
    const routeGroups = history.reduce((groups, item) => {
      if (!groups[item.route]) {
        groups[item.route] = [];
      }
      groups[item.route].push(item);
      return groups;
    }, {});
    
    return Object.entries(routeGroups).map(([route, items]) => ({
      route,
      messageCount: items.length,
      avgEfficiency: items.reduce((sum, item) => sum + item.efficiency, 0) / items.length,
      avgDuration: items.reduce((sum, item) => sum + item.duration, 0) / items.length,
      trend: this.calculateTrend(items.map(item => item.efficiency))
    })).sort((a, b) => b.messageCount - a.messageCount);
  }

  /**
   * Export routing tracking data
   */
  exportRoutingData() {
    return {
      timestamp: Date.now(),
      routingMetrics: Array.from(this.routingMetrics.entries()),
      pathOptimizations: Array.from(this.pathOptimizations.entries()),
      recentHistory: this.routingHistory.slice(-2000),
      bottleneckPatterns: Array.from(this.bottleneckPatterns.entries()),
      metadata: {
        maxHistorySize: this.maxHistorySize,
        learningRate: this.learningRate,
        version: '1.0.0'
      }
    };
  }

  /**
   * Import routing tracking data
   */
  importRoutingData(data) {
    if (data.routingMetrics) {
      this.routingMetrics = new Map(data.routingMetrics);
    }
    if (data.pathOptimizations) {
      this.pathOptimizations = new Map(data.pathOptimizations);
    }
    if (data.recentHistory) {
      this.routingHistory = data.recentHistory;
    }
    if (data.bottleneckPatterns) {
      this.bottleneckPatterns = new Map(data.bottleneckPatterns);
    }
  }
}

module.exports = MessageRoutingTracker;