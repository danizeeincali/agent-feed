/**
 * Neural Learning Development - WebSocket Hub Routing Optimizer
 * Learns optimal message routing paths and adapts to network conditions
 */

class RoutingOptimizer {
  constructor() {
    this.routingTable = new Map();
    this.latencyHistory = new Map();
    this.throughputHistory = new Map();
    this.routingDecisions = [];
    this.learningRate = 0.15;
    this.explorationRate = 0.1;
    this.maxHistorySize = 5000;
  }

  /**
   * Learn from routing decision outcome
   */
  learnRoutingOutcome(routingData) {
    const routeKey = this.createRouteKey(routingData.source, routingData.destination);
    const outcome = {
      timestamp: Date.now(),
      latency: routingData.latency,
      throughput: routingData.throughput,
      success: routingData.success,
      messageSize: routingData.messageSize,
      loadLevel: routingData.loadLevel,
      path: routingData.path
    };

    // Update routing table
    this.updateRoutingTable(routeKey, outcome);
    
    // Store decision for analysis
    this.routingDecisions.push({
      ...outcome,
      source: routingData.source,
      destination: routingData.destination,
      chosenPath: routingData.path
    });

    // Trim history
    if (this.routingDecisions.length > this.maxHistorySize) {
      this.routingDecisions = this.routingDecisions.slice(-this.maxHistorySize);
    }

    return this.analyzeRoutingPerformance(routeKey);
  }

  /**
   * Update routing table with new performance data
   */
  updateRoutingTable(routeKey, outcome) {
    if (!this.routingTable.has(routeKey)) {
      this.routingTable.set(routeKey, {
        paths: new Map(),
        bestPath: null,
        totalAttempts: 0,
        successRate: 0,
        avgLatency: 0,
        avgThroughput: 0
      });
    }

    const route = this.routingTable.get(routeKey);
    const pathKey = JSON.stringify(outcome.path);

    // Initialize path data if not exists
    if (!route.paths.has(pathKey)) {
      route.paths.set(pathKey, {
        path: outcome.path,
        attempts: 0,
        successes: 0,
        totalLatency: 0,
        totalThroughput: 0,
        recentPerformance: [],
        score: 0
      });
    }

    const pathData = route.paths.get(pathKey);
    
    // Update path statistics
    pathData.attempts++;
    route.totalAttempts++;
    
    if (outcome.success) {
      pathData.successes++;
      pathData.totalLatency += outcome.latency;
      pathData.totalThroughput += outcome.throughput;
    }

    // Store recent performance
    pathData.recentPerformance.push({
      timestamp: outcome.timestamp,
      latency: outcome.latency,
      throughput: outcome.throughput,
      success: outcome.success
    });

    // Keep only recent performance data (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    pathData.recentPerformance = pathData.recentPerformance.filter(
      p => p.timestamp > oneHourAgo
    );

    // Calculate path score
    this.calculatePathScore(pathData);
    
    // Update best path
    this.updateBestPath(route);
  }

  /**
   * Calculate performance score for a path
   */
  calculatePathScore(pathData) {
    if (pathData.attempts === 0) {
      pathData.score = 0;
      return;
    }

    const successRate = pathData.successes / pathData.attempts;
    const avgLatency = pathData.totalLatency / pathData.successes || Infinity;
    const avgThroughput = pathData.totalThroughput / pathData.successes || 0;

    // Recent performance weight
    const recentSuccesses = pathData.recentPerformance.filter(p => p.success).length;
    const recentTotal = pathData.recentPerformance.length;
    const recentSuccessRate = recentTotal > 0 ? recentSuccesses / recentTotal : successRate;

    // Weighted score calculation
    const latencyScore = Math.max(0, 1 - (avgLatency / 5000)); // 5s max latency
    const throughputScore = Math.min(1, avgThroughput / 1000); // 1000 msg/s max
    const reliabilityScore = (successRate * 0.7) + (recentSuccessRate * 0.3);

    pathData.score = (
      reliabilityScore * 0.5 +
      latencyScore * 0.3 +
      throughputScore * 0.2
    );
  }

  /**
   * Update best path for a route
   */
  updateBestPath(route) {
    let bestPath = null;
    let bestScore = -1;

    for (const [pathKey, pathData] of route.paths) {
      if (pathData.score > bestScore && pathData.attempts >= 3) {
        bestScore = pathData.score;
        bestPath = pathKey;
      }
    }

    route.bestPath = bestPath;
    
    // Update route-level statistics
    const allPaths = Array.from(route.paths.values());
    const totalSuccesses = allPaths.reduce((sum, p) => sum + p.successes, 0);
    route.successRate = totalSuccesses / route.totalAttempts;
    
    const successfulPaths = allPaths.filter(p => p.successes > 0);
    route.avgLatency = successfulPaths.reduce((sum, p) => 
      sum + (p.totalLatency / p.successes), 0) / successfulPaths.length || 0;
    route.avgThroughput = successfulPaths.reduce((sum, p) => 
      sum + (p.totalThroughput / p.successes), 0) / successfulPaths.length || 0;
  }

  /**
   * Get optimal routing path
   */
  getOptimalRoute(source, destination, messageType = 'default', currentLoad = 'medium') {
    const routeKey = this.createRouteKey(source, destination);
    
    if (!this.routingTable.has(routeKey)) {
      return this.generateInitialRoutes(source, destination, messageType);
    }

    const route = this.routingTable.get(routeKey);
    
    // Exploration vs exploitation
    if (Math.random() < this.explorationRate) {
      return this.exploreAlternativeRoute(source, destination, route);
    }

    // Use best known path
    if (route.bestPath) {
      const bestPathData = route.paths.get(route.bestPath);
      return {
        path: bestPathData.path,
        confidence: Math.min(bestPathData.attempts / 10, 1.0),
        expectedLatency: bestPathData.totalLatency / bestPathData.successes || 1000,
        expectedThroughput: bestPathData.totalThroughput / bestPathData.successes || 10,
        score: bestPathData.score,
        strategy: 'exploitation'
      };
    }

    return this.generateInitialRoutes(source, destination, messageType);
  }

  /**
   * Generate initial routing options for new routes
   */
  generateInitialRoutes(source, destination, messageType) {
    const routes = [];
    
    // Direct route
    routes.push({
      path: [source, destination],
      type: 'direct',
      priority: 1
    });

    // Hub-based routes (if applicable)
    const availableHubs = this.getAvailableHubs();
    availableHubs.forEach(hub => {
      if (hub !== source && hub !== destination) {
        routes.push({
          path: [source, hub, destination],
          type: 'hub',
          priority: 0.8
        });
      }
    });

    // Load-balanced routes
    const loadBalancers = this.getLoadBalancers();
    loadBalancers.forEach(lb => {
      routes.push({
        path: [source, lb, destination],
        type: 'load_balanced',
        priority: 0.9
      });
    });

    // Select best initial route
    const selectedRoute = routes.sort((a, b) => b.priority - a.priority)[0];
    
    return {
      path: selectedRoute.path,
      confidence: 0.0,
      expectedLatency: 1000,
      expectedThroughput: 10,
      score: 0.5,
      strategy: 'initial'
    };
  }

  /**
   * Explore alternative routing options
   */
  exploreAlternativeRoute(source, destination, route) {
    const availablePaths = Array.from(route.paths.values());
    
    // Find least explored path
    const leastExplored = availablePaths.sort((a, b) => a.attempts - b.attempts)[0];
    
    if (leastExplored && leastExplored.attempts < 5) {
      return {
        path: leastExplored.path,
        confidence: 0.2,
        expectedLatency: 1500,
        expectedThroughput: 8,
        score: 0.3,
        strategy: 'exploration'
      };
    }

    // Generate new alternative path
    return this.generateAlternativePath(source, destination);
  }

  /**
   * Generate alternative routing path
   */
  generateAlternativePath(source, destination) {
    const intermediateNodes = this.getIntermediateNodes();
    const randomNode = intermediateNodes[Math.floor(Math.random() * intermediateNodes.length)];
    
    return {
      path: [source, randomNode, destination],
      confidence: 0.1,
      expectedLatency: 2000,
      expectedThroughput: 5,
      score: 0.2,
      strategy: 'exploration_new'
    };
  }

  /**
   * Analyze routing performance and trends
   */
  analyzeRoutingPerformance(routeKey = null) {
    if (routeKey) {
      return this.analyzeSpecificRoute(routeKey);
    }

    // Global analysis
    const recentDecisions = this.routingDecisions.slice(-100);
    const successRate = recentDecisions.filter(d => d.success).length / recentDecisions.length;
    const avgLatency = recentDecisions.reduce((sum, d) => sum + d.latency, 0) / recentDecisions.length;
    const avgThroughput = recentDecisions.reduce((sum, d) => sum + d.throughput, 0) / recentDecisions.length;

    return {
      globalMetrics: {
        successRate: successRate || 0,
        avgLatency: avgLatency || 0,
        avgThroughput: avgThroughput || 0,
        totalRoutes: this.routingTable.size,
        totalDecisions: this.routingDecisions.length
      },
      topPerformingRoutes: this.getTopPerformingRoutes(),
      bottlenecks: this.identifyBottlenecks(),
      recommendations: this.generateRoutingRecommendations()
    };
  }

  /**
   * Analyze specific route performance
   */
  analyzeSpecificRoute(routeKey) {
    const route = this.routingTable.get(routeKey);
    if (!route) return null;

    const pathAnalysis = Array.from(route.paths.entries()).map(([pathKey, pathData]) => ({
      path: pathData.path,
      score: pathData.score,
      attempts: pathData.attempts,
      successRate: pathData.successes / pathData.attempts,
      avgLatency: pathData.totalLatency / pathData.successes || 0,
      avgThroughput: pathData.totalThroughput / pathData.successes || 0
    }));

    return {
      route: routeKey,
      bestPath: route.bestPath,
      overallSuccessRate: route.successRate,
      pathAnalysis: pathAnalysis.sort((a, b) => b.score - a.score)
    };
  }

  /**
   * Get top performing routes
   */
  getTopPerformingRoutes(limit = 5) {
    return Array.from(this.routingTable.entries())
      .map(([routeKey, route]) => ({
        route: routeKey,
        successRate: route.successRate,
        avgLatency: route.avgLatency,
        attempts: route.totalAttempts
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit);
  }

  /**
   * Identify routing bottlenecks
   */
  identifyBottlenecks() {
    const bottlenecks = [];
    const recentDecisions = this.routingDecisions.slice(-200);
    
    // High latency routes
    const highLatencyRoutes = recentDecisions
      .filter(d => d.latency > 2000)
      .reduce((acc, d) => {
        const key = this.createRouteKey(d.source, d.destination);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    Object.entries(highLatencyRoutes).forEach(([route, count]) => {
      if (count > 5) {
        bottlenecks.push({
          type: 'high_latency',
          route,
          occurrences: count
        });
      }
    });

    // Low throughput routes
    const lowThroughputRoutes = recentDecisions
      .filter(d => d.throughput < 5)
      .reduce((acc, d) => {
        const key = this.createRouteKey(d.source, d.destination);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    Object.entries(lowThroughputRoutes).forEach(([route, count]) => {
      if (count > 3) {
        bottlenecks.push({
          type: 'low_throughput',
          route,
          occurrences: count
        });
      }
    });

    return bottlenecks;
  }

  /**
   * Generate routing recommendations
   */
  generateRoutingRecommendations() {
    const recommendations = [];
    const analysis = this.analyzeRoutingPerformance();
    
    if (analysis.globalMetrics.successRate < 0.8) {
      recommendations.push({
        type: 'critical',
        message: 'Overall routing success rate is low',
        action: 'investigate_network_infrastructure'
      });
    }

    if (analysis.globalMetrics.avgLatency > 1000) {
      recommendations.push({
        type: 'warning',
        message: 'Average latency is high',
        action: 'optimize_routing_paths'
      });
    }

    if (analysis.bottlenecks.length > 0) {
      recommendations.push({
        type: 'info',
        message: `Found ${analysis.bottlenecks.length} routing bottlenecks`,
        action: 'review_bottleneck_routes'
      });
    }

    return recommendations;
  }

  // Helper methods
  createRouteKey(source, destination) {
    return `${source}→${destination}`;
  }

  getAvailableHubs() {
    return ['hub-1', 'hub-2', 'central-hub'];
  }

  getLoadBalancers() {
    return ['lb-1', 'lb-2'];
  }

  getIntermediateNodes() {
    return ['node-1', 'node-2', 'node-3', 'relay-1', 'relay-2'];
  }

  /**
   * Export routing data
   */
  exportRoutingData() {
    return {
      timestamp: Date.now(),
      routingTable: Array.from(this.routingTable.entries()),
      recentDecisions: this.routingDecisions.slice(-1000),
      metadata: {
        learningRate: this.learningRate,
        explorationRate: this.explorationRate,
        version: '1.0.0'
      }
    };
  }

  /**
   * Import routing data
   */
  importRoutingData(data) {
    if (data.routingTable) {
      this.routingTable = new Map(data.routingTable);
    }
    if (data.recentDecisions) {
      this.routingDecisions = data.recentDecisions;
    }
  }
}

module.exports = RoutingOptimizer;