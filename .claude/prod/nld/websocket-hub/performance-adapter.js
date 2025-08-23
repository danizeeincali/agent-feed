/**
 * Neural Learning Development - WebSocket Hub Performance Adapter
 * Automatically adapts hub behavior based on learned performance patterns
 */

class PerformanceAdapter {
  constructor() {
    this.performanceProfiles = new Map();
    this.adaptationHistory = [];
    this.currentConfiguration = new Map();
    this.performanceMetrics = new Map();
    this.adaptationStrategies = new Map();
    this.learningWindow = 100; // Number of performance samples to consider
    this.adaptationThreshold = 0.15; // Minimum improvement required for adaptation
  }

  /**
   * Learn from performance measurements
   */
  learnPerformance(performanceData) {
    const profile = this.extractPerformanceProfile(performanceData);
    const profileKey = this.createProfileKey(profile);
    
    // Update performance profile
    this.updatePerformanceProfile(profileKey, profile, performanceData);
    
    // Analyze for adaptation opportunities
    const adaptationOpportunity = this.analyzeAdaptationOpportunity(performanceData);
    
    if (adaptationOpportunity.shouldAdapt) {
      return this.executeAdaptation(adaptationOpportunity);
    }

    return { adapted: false, reason: 'no_adaptation_needed' };
  }

  /**
   * Extract performance profile from data
   */
  extractPerformanceProfile(data) {
    return {
      loadLevel: this.categorizeLoad(data.connectionCount),
      messageVolume: this.categorizeVolume(data.messageCount),
      latencyProfile: this.categorizeLatency(data.averageLatency),
      timeOfDay: this.getTimeCategory(data.timestamp),
      errorRate: this.categorizeErrorRate(data.errorRate),
      resourceUtilization: this.categorizeResources(data.resources),
      networkCondition: this.categorizeNetwork(data.networkMetrics)
    };
  }

  /**
   * Update performance profile with new data
   */
  updatePerformanceProfile(profileKey, profile, data) {
    if (!this.performanceProfiles.has(profileKey)) {
      this.performanceProfiles.set(profileKey, {
        profile,
        measurements: [],
        bestConfiguration: null,
        currentPerformance: 0,
        adaptationCount: 0,
        lastUpdated: Date.now()
      });
    }

    const profileData = this.performanceProfiles.get(profileKey);
    
    // Add new measurement
    profileData.measurements.push({
      timestamp: data.timestamp,
      latency: data.averageLatency,
      throughput: data.throughput,
      errorRate: data.errorRate,
      resourceUsage: data.resources,
      configuration: new Map(this.currentConfiguration)
    });

    // Keep only recent measurements
    if (profileData.measurements.length > this.learningWindow) {
      profileData.measurements = profileData.measurements.slice(-this.learningWindow);
    }

    // Calculate current performance score
    profileData.currentPerformance = this.calculatePerformanceScore(profileData.measurements);
    
    // Update best configuration if current is better
    if (profileData.bestConfiguration === null || 
        profileData.currentPerformance > profileData.bestConfiguration.score) {
      profileData.bestConfiguration = {
        configuration: new Map(this.currentConfiguration),
        score: profileData.currentPerformance,
        timestamp: Date.now()
      };
    }

    profileData.lastUpdated = Date.now();
  }

  /**
   * Analyze if adaptation is needed
   */
  analyzeAdaptationOpportunity(data) {
    const currentScore = this.calculateCurrentPerformanceScore(data);
    const profile = this.extractPerformanceProfile(data);
    const profileKey = this.createProfileKey(profile);
    
    // Check if we have a better known configuration
    const betterConfiguration = this.findBetterConfiguration(profileKey, currentScore);
    
    if (betterConfiguration) {
      return {
        shouldAdapt: true,
        type: 'configuration_switch',
        targetConfiguration: betterConfiguration.configuration,
        expectedImprovement: betterConfiguration.score - currentScore,
        confidence: betterConfiguration.confidence
      };
    }

    // Check for performance degradation patterns
    const degradationPattern = this.detectPerformanceDegradation(data);
    
    if (degradationPattern.detected) {
      return {
        shouldAdapt: true,
        type: 'degradation_response',
        adaptations: degradationPattern.recommendedAdaptations,
        severity: degradationPattern.severity
      };
    }

    // Check for load pattern changes
    const loadPatternChange = this.detectLoadPatternChange(data);
    
    if (loadPatternChange.detected) {
      return {
        shouldAdapt: true,
        type: 'load_adaptation',
        adaptations: loadPatternChange.recommendedAdaptations,
        loadTrend: loadPatternChange.trend
      };
    }

    return { shouldAdapt: false };
  }

  /**
   * Find better configuration for current conditions
   */
  findBetterConfiguration(profileKey, currentScore) {
    const profileData = this.performanceProfiles.get(profileKey);
    
    if (!profileData || !profileData.bestConfiguration) {
      return null;
    }

    const potentialImprovement = profileData.bestConfiguration.score - currentScore;
    
    if (potentialImprovement > this.adaptationThreshold) {
      return {
        configuration: profileData.bestConfiguration.configuration,
        score: profileData.bestConfiguration.score,
        confidence: this.calculateConfigurationConfidence(profileData)
      };
    }

    // Look for similar profiles with better configurations
    return this.findSimilarBetterProfile(profileKey, currentScore);
  }

  /**
   * Find similar profile with better performance
   */
  findSimilarBetterProfile(targetProfileKey, currentScore) {
    const targetProfile = this.performanceProfiles.get(targetProfileKey);
    if (!targetProfile) return null;

    let bestMatch = null;
    let bestSimilarity = 0;

    for (const [profileKey, profileData] of this.performanceProfiles) {
      if (profileKey === targetProfileKey) continue;
      
      const similarity = this.calculateProfileSimilarity(
        targetProfile.profile, 
        profileData.profile
      );
      
      if (similarity > 0.7 && 
          profileData.bestConfiguration &&
          profileData.bestConfiguration.score > currentScore + this.adaptationThreshold &&
          similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = {
          configuration: profileData.bestConfiguration.configuration,
          score: profileData.bestConfiguration.score,
          confidence: similarity * this.calculateConfigurationConfidence(profileData)
        };
      }
    }

    return bestMatch;
  }

  /**
   * Detect performance degradation patterns
   */
  detectPerformanceDegradation(data) {
    const recentMeasurements = this.getRecentMeasurements(20);
    
    if (recentMeasurements.length < 10) {
      return { detected: false };
    }

    // Calculate trend in key metrics
    const latencyTrend = this.calculateTrend(recentMeasurements.map(m => m.latency));
    const throughputTrend = this.calculateTrend(recentMeasurements.map(m => m.throughput));
    const errorRateTrend = this.calculateTrend(recentMeasurements.map(m => m.errorRate));

    const degradationScore = (
      Math.max(0, latencyTrend) * 0.4 +  // Higher latency is bad
      Math.max(0, -throughputTrend) * 0.4 + // Lower throughput is bad
      Math.max(0, errorRateTrend) * 0.2  // Higher error rate is bad
    );

    if (degradationScore > 0.3) {
      return {
        detected: true,
        severity: degradationScore > 0.7 ? 'critical' : degradationScore > 0.5 ? 'high' : 'medium',
        recommendedAdaptations: this.generateDegradationAdaptations(latencyTrend, throughputTrend, errorRateTrend)
      };
    }

    return { detected: false };
  }

  /**
   * Detect load pattern changes
   */
  detectLoadPatternChange(data) {
    const recentConnections = this.getRecentMeasurements(30).map(m => m.connectionCount || 0);
    
    if (recentConnections.length < 15) {
      return { detected: false };
    }

    const loadTrend = this.calculateTrend(recentConnections);
    const loadVariance = this.calculateVariance(recentConnections);
    
    // Significant load increase
    if (loadTrend > 0.2 && loadVariance > 0.1) {
      return {
        detected: true,
        trend: 'increasing',
        recommendedAdaptations: this.generateLoadIncreaseAdaptations(data)
      };
    }

    // Significant load decrease
    if (loadTrend < -0.2) {
      return {
        detected: true,
        trend: 'decreasing',
        recommendedAdaptations: this.generateLoadDecreaseAdaptations(data)
      };
    }

    return { detected: false };
  }

  /**
   * Execute adaptation based on opportunity
   */
  executeAdaptation(opportunity) {
    const adaptationId = this.generateAdaptationId();
    const timestamp = Date.now();
    
    let adaptedConfigurations = [];

    switch (opportunity.type) {
      case 'configuration_switch':
        adaptedConfigurations = this.applyConfigurationSwitch(opportunity.targetConfiguration);
        break;
        
      case 'degradation_response':
        adaptedConfigurations = this.applyDegradationResponse(opportunity.adaptations);
        break;
        
      case 'load_adaptation':
        adaptedConfigurations = this.applyLoadAdaptation(opportunity.adaptations);
        break;
    }

    // Record adaptation
    this.adaptationHistory.push({
      id: adaptationId,
      timestamp,
      type: opportunity.type,
      adaptations: adaptedConfigurations,
      expectedImprovement: opportunity.expectedImprovement || 0,
      actualImprovement: null, // Will be calculated later
      success: null // Will be determined by monitoring
    });

    return {
      adapted: true,
      adaptationId,
      configurations: adaptedConfigurations,
      type: opportunity.type
    };
  }

  /**
   * Apply configuration switch
   */
  applyConfigurationSwitch(targetConfiguration) {
    const adaptations = [];
    
    for (const [key, value] of targetConfiguration) {
      if (this.currentConfiguration.get(key) !== value) {
        this.currentConfiguration.set(key, value);
        adaptations.push({
          parameter: key,
          oldValue: this.currentConfiguration.get(key),
          newValue: value,
          reason: 'better_known_configuration'
        });
      }
    }

    return adaptations;
  }

  /**
   * Apply degradation response adaptations
   */
  applyDegradationResponse(adaptations) {
    const appliedAdaptations = [];

    adaptations.forEach(adaptation => {
      const currentValue = this.currentConfiguration.get(adaptation.parameter);
      this.currentConfiguration.set(adaptation.parameter, adaptation.newValue);
      
      appliedAdaptations.push({
        parameter: adaptation.parameter,
        oldValue: currentValue,
        newValue: adaptation.newValue,
        reason: 'performance_degradation'
      });
    });

    return appliedAdaptations;
  }

  /**
   * Apply load adaptation
   */
  applyLoadAdaptation(adaptations) {
    const appliedAdaptations = [];

    adaptations.forEach(adaptation => {
      const currentValue = this.currentConfiguration.get(adaptation.parameter);
      this.currentConfiguration.set(adaptation.parameter, adaptation.newValue);
      
      appliedAdaptations.push({
        parameter: adaptation.parameter,
        oldValue: currentValue,
        newValue: adaptation.newValue,
        reason: 'load_pattern_change'
      });
    });

    return appliedAdaptations;
  }

  /**
   * Generate adaptations for performance degradation
   */
  generateDegradationAdaptations(latencyTrend, throughputTrend, errorRateTrend) {
    const adaptations = [];

    if (latencyTrend > 0.2) {
      adaptations.push({
        parameter: 'maxConcurrentConnections',
        newValue: Math.max(10, this.currentConfiguration.get('maxConcurrentConnections') * 0.8),
        reason: 'reduce_latency'
      });
      
      adaptations.push({
        parameter: 'messageQueueSize',
        newValue: Math.max(100, this.currentConfiguration.get('messageQueueSize') * 1.2),
        reason: 'buffer_messages'
      });
    }

    if (throughputTrend < -0.2) {
      adaptations.push({
        parameter: 'workerThreads',
        newValue: Math.min(16, this.currentConfiguration.get('workerThreads') + 2),
        reason: 'increase_throughput'
      });
    }

    if (errorRateTrend > 0.1) {
      adaptations.push({
        parameter: 'connectionTimeout',
        newValue: this.currentConfiguration.get('connectionTimeout') * 1.5,
        reason: 'reduce_timeouts'
      });
      
      adaptations.push({
        parameter: 'retryAttempts',
        newValue: Math.min(5, this.currentConfiguration.get('retryAttempts') + 1),
        reason: 'handle_errors'
      });
    }

    return adaptations;
  }

  /**
   * Generate adaptations for load increase
   */
  generateLoadIncreaseAdaptations(data) {
    const adaptations = [];
    const currentLoad = data.connectionCount;
    const currentCapacity = this.currentConfiguration.get('maxConcurrentConnections');

    if (currentLoad > currentCapacity * 0.8) {
      adaptations.push({
        parameter: 'maxConcurrentConnections',
        newValue: Math.min(1000, currentCapacity * 1.3),
        reason: 'scale_for_load'
      });
      
      adaptations.push({
        parameter: 'workerThreads',
        newValue: Math.min(16, this.currentConfiguration.get('workerThreads') + 1),
        reason: 'handle_increased_load'
      });
    }

    return adaptations;
  }

  /**
   * Generate adaptations for load decrease
   */
  generateLoadDecreaseAdaptations(data) {
    const adaptations = [];
    const currentLoad = data.connectionCount;
    const currentCapacity = this.currentConfiguration.get('maxConcurrentConnections');

    if (currentLoad < currentCapacity * 0.3) {
      adaptations.push({
        parameter: 'maxConcurrentConnections',
        newValue: Math.max(50, currentCapacity * 0.7),
        reason: 'scale_down_for_efficiency'
      });
      
      adaptations.push({
        parameter: 'workerThreads',
        newValue: Math.max(2, this.currentConfiguration.get('workerThreads') - 1),
        reason: 'reduce_resource_usage'
      });
    }

    return adaptations;
  }

  /**
   * Calculate performance score from measurements
   */
  calculatePerformanceScore(measurements) {
    if (measurements.length === 0) return 0;

    const scores = measurements.map(m => {
      const latencyScore = Math.max(0, 1 - (m.latency / 5000));
      const throughputScore = Math.min(1, m.throughput / 1000);
      const reliabilityScore = 1 - m.errorRate;
      
      return (latencyScore * 0.4 + throughputScore * 0.3 + reliabilityScore * 0.3);
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Calculate current performance score
   */
  calculateCurrentPerformanceScore(data) {
    const latencyScore = Math.max(0, 1 - (data.averageLatency / 5000));
    const throughputScore = Math.min(1, data.throughput / 1000);
    const reliabilityScore = 1 - data.errorRate;
    
    return (latencyScore * 0.4 + throughputScore * 0.3 + reliabilityScore * 0.3);
  }

  // Helper methods
  calculateProfileSimilarity(profile1, profile2) {
    const weights = {
      loadLevel: 0.25,
      messageVolume: 0.2,
      latencyProfile: 0.2,
      timeOfDay: 0.1,
      errorRate: 0.15,
      resourceUtilization: 0.1
    };

    let similarity = 0;
    let totalWeight = 0;

    for (const [key, weight] of Object.entries(weights)) {
      if (profile1[key] && profile2[key]) {
        if (profile1[key] === profile2[key]) {
          similarity += weight;
        }
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (val * index), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    
    return avgY > 0 ? slope / avgY : slope; // Normalized slope
  }

  calculateVariance(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return mean > 0 ? Math.sqrt(variance) / mean : Math.sqrt(variance); // Coefficient of variation
  }

  getRecentMeasurements(count) {
    const allMeasurements = [];
    
    for (const profile of this.performanceProfiles.values()) {
      allMeasurements.push(...profile.measurements);
    }
    
    return allMeasurements
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  calculateConfigurationConfidence(profileData) {
    const measurementCount = profileData.measurements.length;
    const dataMaturity = Math.min(measurementCount / this.learningWindow, 1.0);
    const recency = Math.max(0, 1 - ((Date.now() - profileData.lastUpdated) / (24 * 60 * 60 * 1000)));
    
    return dataMaturity * recency;
  }

  generateAdaptationId() {
    return `adapt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createProfileKey(profile) {
    return JSON.stringify(profile, Object.keys(profile).sort());
  }

  // Categorization methods
  categorizeLoad(count) {
    if (count < 10) return 'low';
    if (count < 50) return 'medium';
    if (count < 100) return 'high';
    return 'critical';
  }

  categorizeVolume(count) {
    if (count < 100) return 'low';
    if (count < 1000) return 'medium';
    if (count < 10000) return 'high';
    return 'very_high';
  }

  categorizeLatency(latency) {
    if (latency < 100) return 'fast';
    if (latency < 500) return 'medium';
    if (latency < 1000) return 'slow';
    return 'very_slow';
  }

  categorizeErrorRate(rate) {
    if (rate < 0.01) return 'low';
    if (rate < 0.05) return 'medium';
    if (rate < 0.1) return 'high';
    return 'critical';
  }

  categorizeResources(resources) {
    if (!resources) return 'unknown';
    
    const maxUsage = Math.max(resources.cpu || 0, resources.memory || 0);
    if (maxUsage < 50) return 'low';
    if (maxUsage < 75) return 'medium';
    if (maxUsage < 90) return 'high';
    return 'critical';
  }

  categorizeNetwork(metrics) {
    if (!metrics) return 'unknown';
    
    const latency = metrics.latency || 0;
    const packetLoss = metrics.packetLoss || 0;
    
    if (latency > 1000 || packetLoss > 0.05) return 'poor';
    if (latency > 500 || packetLoss > 0.02) return 'degraded';
    return 'good';
  }

  getTimeCategory(timestamp) {
    const hour = new Date(timestamp).getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  /**
   * Export adaptation data
   */
  exportAdaptationData() {
    return {
      timestamp: Date.now(),
      performanceProfiles: Array.from(this.performanceProfiles.entries()),
      currentConfiguration: Array.from(this.currentConfiguration.entries()),
      adaptationHistory: this.adaptationHistory.slice(-100),
      metadata: {
        learningWindow: this.learningWindow,
        adaptationThreshold: this.adaptationThreshold,
        version: '1.0.0'
      }
    };
  }

  /**
   * Import adaptation data
   */
  importAdaptationData(data) {
    if (data.performanceProfiles) {
      this.performanceProfiles = new Map(data.performanceProfiles);
    }
    if (data.currentConfiguration) {
      this.currentConfiguration = new Map(data.currentConfiguration);
    }
    if (data.adaptationHistory) {
      this.adaptationHistory = data.adaptationHistory;
    }
  }
}

module.exports = PerformanceAdapter;