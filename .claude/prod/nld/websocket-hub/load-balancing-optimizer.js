/**
 * Neural Learning Development - Load Balancing Optimization System
 * Learns optimal load distribution patterns and adapts balancing strategies
 */

class LoadBalancingOptimizer {
  constructor() {
    this.balancingStrategies = new Map();
    this.nodePerformance = new Map();
    this.loadDistribution = new Map();
    this.balancingHistory = [];
    this.optimizationRules = new Map();
    this.performanceBaselines = new Map();
    this.adaptiveThresholds = new Map();
    this.maxHistorySize = 5000;
    this.learningRate = 0.15;
    
    this.initializeStrategies();
    this.initializeThresholds();
  }

  /**
   * Initialize load balancing strategies
   */
  initializeStrategies() {
    this.balancingStrategies.set('round_robin', {
      name: 'Round Robin',
      implementation: this.roundRobinStrategy.bind(this),
      effectiveness: 0.7,
      useCount: 0,
      successRate: 0
    });

    this.balancingStrategies.set('weighted_round_robin', {
      name: 'Weighted Round Robin',
      implementation: this.weightedRoundRobinStrategy.bind(this),
      effectiveness: 0.8,
      useCount: 0,
      successRate: 0
    });

    this.balancingStrategies.set('least_connections', {
      name: 'Least Connections',
      implementation: this.leastConnectionsStrategy.bind(this),
      effectiveness: 0.75,
      useCount: 0,
      successRate: 0
    });

    this.balancingStrategies.set('performance_based', {
      name: 'Performance Based',
      implementation: this.performanceBasedStrategy.bind(this),
      effectiveness: 0.9,
      useCount: 0,
      successRate: 0
    });

    this.balancingStrategies.set('adaptive_hybrid', {
      name: 'Adaptive Hybrid',
      implementation: this.adaptiveHybridStrategy.bind(this),
      effectiveness: 0.85,
      useCount: 0,
      successRate: 0
    });
  }

  /**
   * Initialize adaptive thresholds
   */
  initializeThresholds() {
    this.adaptiveThresholds.set('cpu_threshold', { value: 80, min: 60, max: 95 });
    this.adaptiveThresholds.set('memory_threshold', { value: 85, min: 70, max: 95 });
    this.adaptiveThresholds.set('connection_threshold', { value: 100, min: 50, max: 200 });
    this.adaptiveThresholds.set('latency_threshold', { value: 1000, min: 500, max: 3000 });
    this.adaptiveThresholds.set('error_rate_threshold', { value: 0.05, min: 0.01, max: 0.1 });
  }

  /**
   * Optimize load balancing for incoming request
   */
  optimizeLoadBalancing(requestData) {
    const nodes = this.getAvailableNodes(requestData);
    const strategy = this.selectOptimalStrategy(requestData, nodes);
    const selectedNode = this.executeStrategy(strategy, requestData, nodes);
    
    // Record the balancing decision
    const balancingRecord = this.recordBalancingDecision(requestData, strategy, selectedNode, nodes);
    
    // Learn from the decision
    this.learnFromBalancing(balancingRecord);
    
    // Update node performance tracking
    this.updateNodePerformance(selectedNode, requestData);

    return {
      selectedNode,
      strategy: strategy.name,
      confidence: this.calculateSelectionConfidence(strategy, selectedNode, nodes),
      alternativeNodes: this.getAlternativeNodes(selectedNode, nodes),
      expectedPerformance: this.estimatePerformance(selectedNode, requestData),
      balancingRecord
    };
  }

  /**
   * Get available nodes for load balancing
   */
  getAvailableNodes(requestData) {
    // In production, this would query actual node registry
    const mockNodes = [
      {
        id: 'node-1',
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        connections: Math.floor(Math.random() * 150),
        latency: Math.random() * 2000,
        errorRate: Math.random() * 0.1,
        region: 'us-east-1',
        capacity: 200,
        status: 'healthy'
      },
      {
        id: 'node-2',
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        connections: Math.floor(Math.random() * 150),
        latency: Math.random() * 2000,
        errorRate: Math.random() * 0.1,
        region: 'us-east-1',
        capacity: 200,
        status: 'healthy'
      },
      {
        id: 'node-3',
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        connections: Math.floor(Math.random() * 150),
        latency: Math.random() * 2000,
        errorRate: Math.random() * 0.1,
        region: 'us-west-1',
        capacity: 200,
        status: 'healthy'
      }
    ];

    // Filter out unhealthy nodes
    return mockNodes.filter(node => this.isNodeHealthy(node));
  }

  /**
   * Select optimal balancing strategy
   */
  selectOptimalStrategy(requestData, nodes) {
    const context = this.analyzeBalancingContext(requestData, nodes);
    let bestStrategy = null;
    let bestScore = -1;

    for (const [strategyId, strategy] of this.balancingStrategies) {
      const score = this.calculateStrategyScore(strategy, context);
      if (score > bestScore) {
        bestScore = score;
        bestStrategy = strategy;
      }
    }

    return bestStrategy || this.balancingStrategies.get('adaptive_hybrid');
  }

  /**
   * Analyze context for strategy selection
   */
  analyzeBalancingContext(requestData, nodes) {
    const nodeStats = this.calculateNodeStatistics(nodes);
    
    return {
      nodeCount: nodes.length,
      avgCpu: nodeStats.avgCpu,
      avgMemory: nodeStats.avgMemory,
      avgConnections: nodeStats.avgConnections,
      avgLatency: nodeStats.avgLatency,
      loadVariance: nodeStats.loadVariance,
      requestType: requestData.type || 'default',
      requestPriority: requestData.priority || 'normal',
      clientRegion: requestData.region || 'unknown',
      timeOfDay: this.getTimeCategory(Date.now()),
      currentLoad: this.getCurrentSystemLoad()
    };
  }

  /**
   * Calculate strategy effectiveness score
   */
  calculateStrategyScore(strategy, context) {
    let score = strategy.effectiveness;

    // Adjust based on recent performance
    if (strategy.useCount > 10) {
      score *= strategy.successRate;
    }

    // Context-specific adjustments
    if (context.loadVariance > 0.3 && strategy.name.includes('Performance')) {
      score *= 1.2; // Performance-based works better with load variance
    }

    if (context.nodeCount <= 2 && strategy.name === 'Round Robin') {
      score *= 1.1; // Simple strategies work well with few nodes
    }

    if (context.avgLatency > 1000 && strategy.name.includes('Performance')) {
      score *= 1.15; // Performance-based helps with latency issues
    }

    if (context.currentLoad === 'high' && strategy.name === 'Adaptive Hybrid') {
      score *= 1.25; // Adaptive works best under high load
    }

    return score;
  }

  /**
   * Execute selected balancing strategy
   */
  executeStrategy(strategy, requestData, nodes) {
    return strategy.implementation(requestData, nodes);
  }

  // Load balancing strategy implementations
  roundRobinStrategy(requestData, nodes) {
    const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
    const index = this.getCounterValue('round_robin') % sortedNodes.length;
    this.incrementCounter('round_robin');
    return sortedNodes[index];
  }

  weightedRoundRobinStrategy(requestData, nodes) {
    const weights = nodes.map(node => this.calculateNodeWeight(node));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    let random = Math.random() * totalWeight;
    for (let i = 0; i < nodes.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return nodes[i];
      }
    }
    
    return nodes[nodes.length - 1];
  }

  leastConnectionsStrategy(requestData, nodes) {
    return nodes.reduce((leastLoaded, node) => 
      node.connections < leastLoaded.connections ? node : leastLoaded
    );
  }

  performanceBasedStrategy(requestData, nodes) {
    const scoredNodes = nodes.map(node => ({
      node,
      score: this.calculatePerformanceScore(node)
    }));

    scoredNodes.sort((a, b) => b.score - a.score);
    return scoredNodes[0].node;
  }

  adaptiveHybridStrategy(requestData, nodes) {
    const context = this.analyzeBalancingContext(requestData, nodes);
    
    // Choose sub-strategy based on current conditions
    if (context.loadVariance > 0.4) {
      return this.performanceBasedStrategy(requestData, nodes);
    } else if (context.avgConnections > 80) {
      return this.leastConnectionsStrategy(requestData, nodes);
    } else {
      return this.weightedRoundRobinStrategy(requestData, nodes);
    }
  }

  /**
   * Calculate node weight for weighted strategies
   */
  calculateNodeWeight(node) {
    // Higher weight = more likely to be selected
    let weight = node.capacity || 100;
    
    // Reduce weight based on current load
    weight *= (1 - (node.cpu / 100) * 0.3);
    weight *= (1 - (node.memory / 100) * 0.3);
    weight *= (1 - (node.connections / (node.capacity || 100)) * 0.2);
    weight *= (1 - (node.errorRate || 0) * 0.2);
    
    // Increase weight for low latency
    weight *= (1 + (1000 - Math.min(node.latency || 1000, 1000)) / 1000 * 0.1);
    
    return Math.max(0.1, weight);
  }

  /**
   * Calculate performance score for nodes
   */
  calculatePerformanceScore(node) {
    let score = 1.0;
    
    // CPU utilization penalty
    score -= (node.cpu / 100) * 0.25;
    
    // Memory utilization penalty
    score -= (node.memory / 100) * 0.25;
    
    // Connection load penalty
    const connectionLoad = node.connections / (node.capacity || 100);
    score -= connectionLoad * 0.2;
    
    // Latency penalty
    score -= Math.min(node.latency || 0, 2000) / 2000 * 0.15;
    
    // Error rate penalty
    score -= (node.errorRate || 0) * 0.15;
    
    // Bonus for healthy status
    if (node.status === 'healthy') {
      score += 0.1;
    }
    
    return Math.max(0, score);
  }

  /**
   * Record balancing decision for learning
   */
  recordBalancingDecision(requestData, strategy, selectedNode, availableNodes) {
    const record = {
      timestamp: Date.now(),
      requestId: requestData.id || this.generateRequestId(),
      strategy: strategy.name,
      selectedNode: selectedNode.id,
      availableNodes: availableNodes.map(n => n.id),
      nodeStates: availableNodes.map(n => ({
        id: n.id,
        cpu: n.cpu,
        memory: n.memory,
        connections: n.connections,
        latency: n.latency,
        errorRate: n.errorRate
      })),
      requestContext: {
        type: requestData.type,
        priority: requestData.priority,
        region: requestData.region
      },
      outcome: null // Will be updated when request completes
    };

    this.balancingHistory.push(record);
    
    // Trim history
    if (this.balancingHistory.length > this.maxHistorySize) {
      this.balancingHistory = this.balancingHistory.slice(-this.maxHistorySize);
    }

    return record;
  }

  /**
   * Learn from balancing outcomes
   */
  learnFromBalancing(record) {
    // Update strategy statistics
    const strategy = Array.from(this.balancingStrategies.values())
      .find(s => s.name === record.strategy);
    
    if (strategy) {
      strategy.useCount++;
      
      // Calculate success rate (placeholder - would use actual outcome)
      const simulatedSuccess = Math.random() > 0.1; // 90% success rate simulation
      if (simulatedSuccess) {
        strategy.successRate = (strategy.successRate * (strategy.useCount - 1) + 1) / strategy.useCount;
      } else {
        strategy.successRate = (strategy.successRate * (strategy.useCount - 1)) / strategy.useCount;
      }
    }

    // Learn optimization rules
    this.learnOptimizationRules(record);
    
    // Adapt thresholds based on outcomes
    this.adaptThresholds(record);
  }

  /**
   * Learn optimization rules from patterns
   */
  learnOptimizationRules(record) {
    const ruleKey = this.createRuleKey(record.requestContext, record.nodeStates);
    
    if (!this.optimizationRules.has(ruleKey)) {
      this.optimizationRules.set(ruleKey, {
        pattern: record.requestContext,
        strategies: new Map(),
        bestStrategy: null,
        confidence: 0,
        sampleCount: 0
      });
    }

    const rule = this.optimizationRules.get(ruleKey);
    rule.sampleCount++;
    
    if (!rule.strategies.has(record.strategy)) {
      rule.strategies.set(record.strategy, {
        useCount: 0,
        successCount: 0,
        avgPerformance: 0
      });
    }

    const strategyData = rule.strategies.get(record.strategy);
    strategyData.useCount++;
    
    // Simulate performance measurement
    const performance = this.simulatePerformanceMeasurement(record);
    strategyData.avgPerformance = (strategyData.avgPerformance * (strategyData.useCount - 1) + performance) / strategyData.useCount;
    
    // Update best strategy
    this.updateBestStrategy(rule);
  }

  /**
   * Adapt thresholds based on performance
   */
  adaptThresholds(record) {
    const selectedNode = record.nodeStates.find(n => n.id === record.selectedNode);
    if (!selectedNode) return;

    // Simulate performance outcome
    const performance = this.simulatePerformanceMeasurement(record);
    
    // Adapt CPU threshold
    if (selectedNode.cpu > this.adaptiveThresholds.get('cpu_threshold').value && performance < 0.7) {
      this.adjustThreshold('cpu_threshold', -2);
    } else if (selectedNode.cpu < this.adaptiveThresholds.get('cpu_threshold').value && performance > 0.9) {
      this.adjustThreshold('cpu_threshold', 1);
    }

    // Adapt memory threshold
    if (selectedNode.memory > this.adaptiveThresholds.get('memory_threshold').value && performance < 0.7) {
      this.adjustThreshold('memory_threshold', -2);
    } else if (selectedNode.memory < this.adaptiveThresholds.get('memory_threshold').value && performance > 0.9) {
      this.adjustThreshold('memory_threshold', 1);
    }
  }

  /**
   * Update node performance tracking
   */
  updateNodePerformance(node, requestData) {
    if (!this.nodePerformance.has(node.id)) {
      this.nodePerformance.set(node.id, {
        nodeId: node.id,
        requestCount: 0,
        successCount: 0,
        totalResponseTime: 0,
        avgResponseTime: 0,
        errorCount: 0,
        lastUpdate: Date.now(),
        performanceHistory: []
      });
    }

    const perf = this.nodePerformance.get(node.id);
    perf.requestCount++;
    perf.lastUpdate = Date.now();
    
    // Simulate response time and success
    const responseTime = this.simulateResponseTime(node);
    const success = Math.random() > (node.errorRate || 0.01);
    
    perf.totalResponseTime += responseTime;
    perf.avgResponseTime = perf.totalResponseTime / perf.requestCount;
    
    if (success) {
      perf.successCount++;
    } else {
      perf.errorCount++;
    }

    // Store recent performance
    perf.performanceHistory.push({
      timestamp: Date.now(),
      responseTime,
      success,
      nodeState: {
        cpu: node.cpu,
        memory: node.memory,
        connections: node.connections
      }
    });

    // Keep only recent history
    if (perf.performanceHistory.length > 100) {
      perf.performanceHistory = perf.performanceHistory.slice(-100);
    }
  }

  /**
   * Analyze load balancing effectiveness
   */
  analyzeBalancingEffectiveness(timeWindow = 3600000) { // 1 hour default
    const now = Date.now();
    const recentHistory = this.balancingHistory.filter(
      record => now - record.timestamp < timeWindow
    );

    if (recentHistory.length === 0) {
      return { noData: true };
    }

    // Strategy effectiveness analysis
    const strategyPerformance = this.analyzeStrategyPerformance(recentHistory);
    
    // Load distribution analysis
    const loadDistribution = this.analyzeLoadDistribution(recentHistory);
    
    // Node utilization analysis
    const nodeUtilization = this.analyzeNodeUtilization();
    
    // Optimization recommendations
    const recommendations = this.generateOptimizationRecommendations(
      strategyPerformance, loadDistribution, nodeUtilization
    );

    return {
      summary: {
        totalRequests: recentHistory.length,
        strategiesUsed: [...new Set(recentHistory.map(r => r.strategy))].length,
        avgResponseTime: this.calculateAvgResponseTime(recentHistory),
        loadBalanceEfficiency: this.calculateLoadBalanceEfficiency(recentHistory)
      },
      strategyPerformance,
      loadDistribution,
      nodeUtilization,
      recommendations
    };
  }

  // Helper methods
  isNodeHealthy(node) {
    const cpuThreshold = this.adaptiveThresholds.get('cpu_threshold').value;
    const memoryThreshold = this.adaptiveThresholds.get('memory_threshold').value;
    const errorThreshold = this.adaptiveThresholds.get('error_rate_threshold').value;
    
    return node.status === 'healthy' &&
           node.cpu < cpuThreshold &&
           node.memory < memoryThreshold &&
           (node.errorRate || 0) < errorThreshold;
  }

  calculateNodeStatistics(nodes) {
    const count = nodes.length;
    const avgCpu = nodes.reduce((sum, n) => sum + n.cpu, 0) / count;
    const avgMemory = nodes.reduce((sum, n) => sum + n.memory, 0) / count;
    const avgConnections = nodes.reduce((sum, n) => sum + n.connections, 0) / count;
    const avgLatency = nodes.reduce((sum, n) => sum + (n.latency || 0), 0) / count;
    
    // Calculate load variance
    const loads = nodes.map(n => (n.cpu + n.memory) / 2);
    const avgLoad = loads.reduce((sum, load) => sum + load, 0) / count;
    const variance = loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / count;
    const loadVariance = Math.sqrt(variance) / avgLoad;

    return {
      avgCpu,
      avgMemory,
      avgConnections,
      avgLatency,
      loadVariance
    };
  }

  getTimeCategory(timestamp) {
    const hour = new Date(timestamp).getHours();
    if (hour >= 9 && hour <= 17) return 'business_hours';
    if (hour >= 18 && hour <= 23) return 'evening';
    return 'off_hours';
  }

  getCurrentSystemLoad() {
    // Simulate current system load
    const random = Math.random();
    if (random < 0.3) return 'low';
    if (random < 0.7) return 'medium';
    return 'high';
  }

  getCounterValue(key) {
    if (!this.loadDistribution.has(key)) {
      this.loadDistribution.set(key, 0);
    }
    return this.loadDistribution.get(key);
  }

  incrementCounter(key) {
    const current = this.getCounterValue(key);
    this.loadDistribution.set(key, current + 1);
  }

  calculateSelectionConfidence(strategy, selectedNode, nodes) {
    const score = this.calculatePerformanceScore(selectedNode);
    const avgScore = nodes.reduce((sum, n) => sum + this.calculatePerformanceScore(n), 0) / nodes.length;
    return Math.min(1, score / avgScore);
  }

  getAlternativeNodes(selectedNode, nodes) {
    return nodes
      .filter(n => n.id !== selectedNode.id)
      .sort((a, b) => this.calculatePerformanceScore(b) - this.calculatePerformanceScore(a))
      .slice(0, 2);
  }

  estimatePerformance(node, requestData) {
    const score = this.calculatePerformanceScore(node);
    const baseLatency = 100;
    const estimatedLatency = baseLatency + (node.latency || 0) + ((1 - score) * 500);
    
    return {
      estimatedLatency,
      expectedThroughput: Math.max(1, score * 100),
      reliability: 1 - (node.errorRate || 0)
    };
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  simulatePerformanceMeasurement(record) {
    // Simulate performance based on node state
    const selectedNode = record.nodeStates.find(n => n.id === record.selectedNode);
    if (!selectedNode) return 0.5;
    
    const score = this.calculatePerformanceScore(selectedNode);
    return Math.max(0, Math.min(1, score + (Math.random() - 0.5) * 0.2));
  }

  simulateResponseTime(node) {
    const baseTime = 100;
    const loadFactor = (node.cpu + node.memory) / 200;
    return baseTime + (node.latency || 0) + (loadFactor * 500) + (Math.random() * 100);
  }

  createRuleKey(context, nodeStates) {
    const avgLoad = nodeStates.reduce((sum, n) => sum + (n.cpu + n.memory) / 2, 0) / nodeStates.length;
    const keyData = {
      type: context.type,
      priority: context.priority,
      loadCategory: avgLoad > 80 ? 'high' : avgLoad > 50 ? 'medium' : 'low'
    };
    return JSON.stringify(keyData);
  }

  updateBestStrategy(rule) {
    let bestStrategy = null;
    let bestPerformance = -1;

    for (const [strategyName, data] of rule.strategies) {
      if (data.useCount >= 3 && data.avgPerformance > bestPerformance) {
        bestPerformance = data.avgPerformance;
        bestStrategy = strategyName;
      }
    }

    rule.bestStrategy = bestStrategy;
    rule.confidence = rule.sampleCount >= 10 ? Math.min(1, rule.sampleCount / 50) : 0;
  }

  adjustThreshold(thresholdName, adjustment) {
    const threshold = this.adaptiveThresholds.get(thresholdName);
    if (!threshold) return;

    const newValue = threshold.value + adjustment;
    threshold.value = Math.max(threshold.min, Math.min(threshold.max, newValue));
  }

  analyzeStrategyPerformance(history) {
    const strategies = {};
    
    history.forEach(record => {
      if (!strategies[record.strategy]) {
        strategies[record.strategy] = {
          name: record.strategy,
          useCount: 0,
          avgPerformance: 0,
          totalPerformance: 0
        };
      }
      
      const strategy = strategies[record.strategy];
      strategy.useCount++;
      
      const performance = this.simulatePerformanceMeasurement(record);
      strategy.totalPerformance += performance;
      strategy.avgPerformance = strategy.totalPerformance / strategy.useCount;
    });

    return Object.values(strategies).sort((a, b) => b.avgPerformance - a.avgPerformance);
  }

  analyzeLoadDistribution(history) {
    const distribution = {};
    
    history.forEach(record => {
      const nodeId = record.selectedNode;
      distribution[nodeId] = (distribution[nodeId] || 0) + 1;
    });

    const total = history.length;
    return Object.entries(distribution).map(([nodeId, count]) => ({
      nodeId,
      requestCount: count,
      percentage: (count / total) * 100
    }));
  }

  analyzeNodeUtilization() {
    const utilization = [];
    
    for (const [nodeId, perf] of this.nodePerformance) {
      utilization.push({
        nodeId,
        requestCount: perf.requestCount,
        successRate: perf.successCount / perf.requestCount,
        avgResponseTime: perf.avgResponseTime,
        errorRate: perf.errorCount / perf.requestCount
      });
    }

    return utilization.sort((a, b) => b.requestCount - a.requestCount);
  }

  generateOptimizationRecommendations(strategyPerf, loadDist, nodeUtil) {
    const recommendations = [];

    // Strategy recommendations
    const bestStrategy = strategyPerf[0];
    if (bestStrategy && bestStrategy.avgPerformance > 0.8) {
      recommendations.push({
        type: 'strategy_optimization',
        priority: 'medium',
        action: `favor_${bestStrategy.name.toLowerCase().replace(' ', '_')}`,
        description: `${bestStrategy.name} shows best performance`
      });
    }

    // Load distribution recommendations
    const maxLoad = Math.max(...loadDist.map(d => d.percentage));
    const minLoad = Math.min(...loadDist.map(d => d.percentage));
    
    if (maxLoad - minLoad > 30) {
      recommendations.push({
        type: 'load_balancing',
        priority: 'high',
        action: 'improve_distribution',
        description: 'Load distribution is uneven across nodes'
      });
    }

    // Node utilization recommendations
    const lowPerformanceNodes = nodeUtil.filter(n => n.successRate < 0.9);
    if (lowPerformanceNodes.length > 0) {
      recommendations.push({
        type: 'node_optimization',
        priority: 'high',
        action: 'investigate_node_issues',
        description: `${lowPerformanceNodes.length} nodes showing low success rates`
      });
    }

    return recommendations;
  }

  calculateAvgResponseTime(history) {
    const responseTimes = history.map(r => this.simulateResponseTime(
      r.nodeStates.find(n => n.id === r.selectedNode)
    ));
    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  calculateLoadBalanceEfficiency(history) {
    const distribution = this.analyzeLoadDistribution(history);
    const avgPercentage = 100 / distribution.length;
    const variance = distribution.reduce((sum, d) => 
      sum + Math.pow(d.percentage - avgPercentage, 2), 0) / distribution.length;
    
    // Lower variance = higher efficiency
    return Math.max(0, 1 - (Math.sqrt(variance) / avgPercentage));
  }

  /**
   * Export load balancing data
   */
  exportBalancingData() {
    return {
      timestamp: Date.now(),
      balancingStrategies: Array.from(this.balancingStrategies.entries()),
      nodePerformance: Array.from(this.nodePerformance.entries()),
      optimizationRules: Array.from(this.optimizationRules.entries()),
      adaptiveThresholds: Array.from(this.adaptiveThresholds.entries()),
      recentHistory: this.balancingHistory.slice(-1000),
      metadata: {
        maxHistorySize: this.maxHistorySize,
        learningRate: this.learningRate,
        version: '1.0.0'
      }
    };
  }

  /**
   * Import load balancing data
   */
  importBalancingData(data) {
    if (data.balancingStrategies) {
      this.balancingStrategies = new Map(data.balancingStrategies);
    }
    if (data.nodePerformance) {
      this.nodePerformance = new Map(data.nodePerformance);
    }
    if (data.optimizationRules) {
      this.optimizationRules = new Map(data.optimizationRules);
    }
    if (data.adaptiveThresholds) {
      this.adaptiveThresholds = new Map(data.adaptiveThresholds);
    }
    if (data.recentHistory) {
      this.balancingHistory = data.recentHistory;
    }
  }
}

module.exports = LoadBalancingOptimizer;