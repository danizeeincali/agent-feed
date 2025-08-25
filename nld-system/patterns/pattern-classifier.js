/**
 * Pattern Classification Engine
 * Classifies and categorizes different types of failure patterns
 */

class PatternClassifier {
  constructor() {
    this.classificationRules = this.initializeClassificationRules();
    this.featureExtractors = this.initializeFeatureExtractors();
    this.confidenceThresholds = {
      HIGH: 0.8,
      MEDIUM: 0.6,
      LOW: 0.4
    };
  }

  /**
   * Initialize classification rules for different failure types
   */
  initializeClassificationRules() {
    return {
      PROCESS_MANAGEMENT: {
        keywords: ['pty', 'spawn', 'child_process', 'pid', 'signal', 'kill', 'exit'],
        patterns: [
          /pty\.spawn.*failed/i,
          /child process.*error/i,
          /process.*killed/i,
          /signal.*term/i
        ],
        severity: 'HIGH',
        category: 'SYSTEM'
      },

      COMMUNICATION_PROTOCOL: {
        keywords: ['websocket', 'socket.io', 'engine.io', 'protocol', 'parse', 'json'],
        patterns: [
          /42\[.*\]/,                    // Socket.IO Engine.IO format
          /websocket.*connection.*failed/i,
          /json.*parse.*error/i,
          /protocol.*mismatch/i,
          /engine\.io.*incompatible/i
        ],
        severity: 'CRITICAL',
        category: 'NETWORK'
      },

      RESOURCE_ALLOCATION: {
        keywords: ['memory', 'cpu', 'timeout', 'limit', 'exhausted', 'quota'],
        patterns: [
          /memory.*exceeded/i,
          /cpu.*limit/i,
          /connection.*limit/i,
          /timeout.*exceeded/i
        ],
        severity: 'HIGH',
        category: 'RESOURCE'
      },

      USER_INTERACTION: {
        keywords: ['input', 'resize', 'cursor', 'display', 'render', 'ui'],
        patterns: [
          /terminal.*resize.*failed/i,
          /input.*not.*processed/i,
          /cursor.*position.*error/i,
          /display.*corruption/i
        ],
        severity: 'MEDIUM',
        category: 'USER_INTERFACE'
      },

      TERMINAL_HANG: {
        keywords: ['hang', 'freeze', 'unresponsive', 'stuck', 'claude', 'interactive'],
        patterns: [
          /terminal.*hang/i,
          /claude.*hang/i,
          /interactive.*mode.*stuck/i,
          /command.*not.*responding/i
        ],
        severity: 'HIGH',
        category: 'TERMINAL'
      },

      ARCHITECTURE_TRANSITION: {
        keywords: ['instance', 'separation', 'dedicated', 'isolation', 'creation'],
        patterns: [
          /instance.*creation.*failed/i,
          /dedicated.*instance.*error/i,
          /separation.*failed/i,
          /isolation.*breach/i
        ],
        severity: 'CRITICAL',
        category: 'ARCHITECTURE'
      },

      CONNECTION_MANAGEMENT: {
        keywords: ['connect', 'disconnect', 'reconnect', 'close', 'open'],
        patterns: [
          /connection.*lost/i,
          /reconnect.*failed/i,
          /websocket.*closed/i,
          /connection.*timeout/i
        ],
        severity: 'MEDIUM',
        category: 'NETWORK'
      },

      DATA_CORRUPTION: {
        keywords: ['corrupt', 'invalid', 'malformed', 'encoding', 'decode'],
        patterns: [
          /data.*corrupt/i,
          /invalid.*format/i,
          /malformed.*message/i,
          /encoding.*error/i
        ],
        severity: 'HIGH',
        category: 'DATA'
      }
    };
  }

  /**
   * Initialize feature extractors
   */
  initializeFeatureExtractors() {
    return {
      textual: this.extractTextualFeatures.bind(this),
      temporal: this.extractTemporalFeatures.bind(this),
      contextual: this.extractContextualFeatures.bind(this),
      behavioral: this.extractBehavioralFeatures.bind(this),
      environmental: this.extractEnvironmentalFeatures.bind(this)
    };
  }

  /**
   * Classify a failure pattern
   */
  classify(failureData) {
    const classification = {
      primaryCategory: null,
      secondaryCategories: [],
      confidence: 0,
      features: {},
      reasoning: [],
      severity: 'UNKNOWN',
      recommendations: []
    };

    // Extract features from all extractors
    for (const [name, extractor] of Object.entries(this.featureExtractors)) {
      classification.features[name] = extractor(failureData);
    }

    // Score against all classification rules
    const scores = {};
    for (const [category, rules] of Object.entries(this.classificationRules)) {
      scores[category] = this.scoreAgainstRules(failureData, rules, classification.features);
    }

    // Find primary category (highest score)
    const sortedScores = Object.entries(scores)
      .sort(([,a], [,b]) => b.confidence - a.confidence);

    if (sortedScores.length > 0) {
      const [primaryCategory, primaryScore] = sortedScores[0];
      classification.primaryCategory = primaryCategory;
      classification.confidence = primaryScore.confidence;
      classification.severity = primaryScore.severity;
      classification.reasoning = primaryScore.reasoning;

      // Add secondary categories with high confidence
      classification.secondaryCategories = sortedScores
        .slice(1)
        .filter(([,score]) => score.confidence > this.confidenceThresholds.MEDIUM)
        .map(([category,]) => category);
    }

    // Generate recommendations based on classification
    classification.recommendations = this.generateRecommendations(classification);

    return classification;
  }

  /**
   * Score failure data against classification rules
   */
  scoreAgainstRules(failureData, rules, features) {
    let score = 0;
    const reasoning = [];
    const maxScore = rules.keywords.length + rules.patterns.length;

    const searchText = JSON.stringify(failureData).toLowerCase();

    // Score keyword matches
    let keywordMatches = 0;
    for (const keyword of rules.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        keywordMatches++;
        reasoning.push(`Keyword match: ${keyword}`);
      }
    }
    score += keywordMatches;

    // Score pattern matches
    let patternMatches = 0;
    for (const pattern of rules.patterns) {
      if (pattern.test(searchText)) {
        patternMatches++;
        reasoning.push(`Pattern match: ${pattern.source}`);
      }
    }
    score += patternMatches;

    // Apply feature-based scoring
    const featureScore = this.scoreFeatures(features, rules);
    score += featureScore.score;
    reasoning.push(...featureScore.reasoning);

    const confidence = maxScore > 0 ? Math.min(score / maxScore, 1) : 0;

    return {
      confidence,
      severity: rules.severity,
      category: rules.category,
      reasoning,
      keywordMatches,
      patternMatches
    };
  }

  /**
   * Score based on extracted features
   */
  scoreFeatures(features, rules) {
    let score = 0;
    const reasoning = [];

    // Textual features
    if (features.textual.errorDensity > 0.3) {
      score += 0.5;
      reasoning.push('High error keyword density');
    }

    // Temporal features
    if (features.temporal.isRecentFailure && rules.severity === 'CRITICAL') {
      score += 0.3;
      reasoning.push('Recent critical failure pattern');
    }

    // Contextual features
    if (features.contextual.hasStackTrace && rules.category === 'SYSTEM') {
      score += 0.2;
      reasoning.push('System error with stack trace');
    }

    // Behavioral features
    if (features.behavioral.isRepeatingFailure) {
      score += 0.4;
      reasoning.push('Repeating failure pattern detected');
    }

    return { score, reasoning };
  }

  /**
   * Extract textual features from failure data
   */
  extractTextualFeatures(failureData) {
    const text = JSON.stringify(failureData);
    const words = text.toLowerCase().match(/\w+/g) || [];
    
    const errorKeywords = [
      'error', 'fail', 'exception', 'crash', 'hang', 'timeout',
      'invalid', 'corrupt', 'broken', 'dead', 'killed'
    ];
    
    const errorWords = words.filter(word => 
      errorKeywords.some(keyword => word.includes(keyword))
    );

    return {
      totalWords: words.length,
      errorWords: errorWords.length,
      errorDensity: words.length > 0 ? errorWords.length / words.length : 0,
      textLength: text.length,
      hasStackTrace: text.includes('stack') || text.includes('trace'),
      hasErrorCode: /error.*code.*\d+/i.test(text)
    };
  }

  /**
   * Extract temporal features from failure data
   */
  extractTemporalFeatures(failureData) {
    const now = Date.now();
    const timestamp = failureData.timestamp || now;
    const age = now - timestamp;

    return {
      timestamp,
      age,
      isRecentFailure: age < 300000, // 5 minutes
      isStaleFailure: age > 3600000,  // 1 hour
      hourOfDay: new Date(timestamp).getHours(),
      dayOfWeek: new Date(timestamp).getDay(),
      timeCategory: this.categorizeTime(new Date(timestamp))
    };
  }

  /**
   * Extract contextual features from failure data
   */
  extractContextualFeatures(failureData) {
    return {
      hasContext: !!failureData.context,
      hasUserFeedback: !!failureData.userFeedback,
      hasStackTrace: !!(failureData.stackTrace || failureData.error?.stack),
      hasErrorCode: !!(failureData.errorCode || failureData.code),
      hasSolution: !!failureData.solution,
      contextDepth: this.calculateContextDepth(failureData.context),
      environmentProvided: !!failureData.environmentContext
    };
  }

  /**
   * Extract behavioral features from failure data
   */
  extractBehavioralFeatures(failureData) {
    const signature = this.createFailureSignature(failureData);
    
    return {
      failureSignature: signature,
      isRepeatingFailure: this.isRepeatingPattern(signature),
      hasQuickResolution: this.hasQuickResolution(failureData),
      userTriggered: !!failureData.userReported,
      automatedDetection: !failureData.userReported,
      severityLevel: this.inferSeverityLevel(failureData)
    };
  }

  /**
   * Extract environmental features from failure data
   */
  extractEnvironmentalFeatures(failureData) {
    const env = failureData.environmentContext || {};
    
    return {
      platform: env.platform || 'unknown',
      nodeVersion: env.nodeVersion || 'unknown',
      memoryPressure: this.assessMemoryPressure(env.memoryUsage),
      systemLoad: this.assessSystemLoad(env),
      connectionCount: env.activeConnections || 0,
      uptime: env.uptime || 0
    };
  }

  /**
   * Generate recommendations based on classification
   */
  generateRecommendations(classification) {
    const recommendations = [];

    switch (classification.primaryCategory) {
      case 'COMMUNICATION_PROTOCOL':
        recommendations.push({
          priority: 'HIGH',
          action: 'Fix protocol compatibility',
          description: 'Convert frontend to raw WebSocket or backend to Socket.IO server',
          estimatedEffort: 'Medium'
        });
        break;

      case 'TERMINAL_HANG':
        recommendations.push({
          priority: 'HIGH',
          action: 'Implement hang detection',
          description: 'Add command interception for problematic patterns',
          estimatedEffort: 'Low'
        });
        break;

      case 'PROCESS_MANAGEMENT':
        recommendations.push({
          priority: 'CRITICAL',
          action: 'Review process lifecycle',
          description: 'Audit PTY spawning and cleanup procedures',
          estimatedEffort: 'High'
        });
        break;

      case 'RESOURCE_ALLOCATION':
        recommendations.push({
          priority: 'MEDIUM',
          action: 'Optimize resource usage',
          description: 'Implement resource monitoring and limits',
          estimatedEffort: 'Medium'
        });
        break;
    }

    // Add confidence-based recommendations
    if (classification.confidence < this.confidenceThresholds.MEDIUM) {
      recommendations.push({
        priority: 'LOW',
        action: 'Improve pattern recognition',
        description: 'Collect more data for this failure type',
        estimatedEffort: 'Low'
      });
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  categorizeTime(date) {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return 'MORNING';
    if (hour >= 12 && hour < 18) return 'AFTERNOON';
    if (hour >= 18 && hour < 24) return 'EVENING';
    return 'NIGHT';
  }

  calculateContextDepth(context) {
    if (!context) return 0;
    return JSON.stringify(context).split('{').length - 1;
  }

  createFailureSignature(failureData) {
    const key = [
      failureData.type,
      failureData.category,
      failureData.context?.errorType
    ].filter(Boolean).join(':');
    
    return crypto.createHash('md5').update(key).digest('hex').substring(0, 8);
  }

  isRepeatingPattern(signature) {
    // This would check against historical signatures
    // For now, return false - would be implemented with historical data
    return false;
  }

  hasQuickResolution(failureData) {
    if (!failureData.solution) return false;
    
    const quickIndicators = ['restart', 'refresh', 'clear', 'reset'];
    const solution = JSON.stringify(failureData.solution).toLowerCase();
    
    return quickIndicators.some(indicator => solution.includes(indicator));
  }

  inferSeverityLevel(failureData) {
    const indicators = JSON.stringify(failureData).toLowerCase();
    
    if (indicators.includes('critical') || indicators.includes('fatal')) return 'CRITICAL';
    if (indicators.includes('error') || indicators.includes('failed')) return 'HIGH';
    if (indicators.includes('warning') || indicators.includes('degraded')) return 'MEDIUM';
    
    return 'LOW';
  }

  assessMemoryPressure(memoryUsage) {
    if (!memoryUsage) return 'UNKNOWN';
    
    const used = memoryUsage.heapUsed || 0;
    const total = memoryUsage.heapTotal || 1;
    const ratio = used / total;
    
    if (ratio > 0.9) return 'HIGH';
    if (ratio > 0.7) return 'MEDIUM';
    return 'LOW';
  }

  assessSystemLoad(env) {
    if (!env.cpuUsage) return 'UNKNOWN';
    
    // Simple assessment based on available metrics
    if (env.activeConnections > 50) return 'HIGH';
    if (env.activeConnections > 20) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Batch classify multiple failures
   */
  batchClassify(failures) {
    return failures.map(failure => ({
      ...failure,
      classification: this.classify(failure)
    }));
  }

  /**
   * Update classification rules based on feedback
   */
  updateRules(category, updates) {
    if (this.classificationRules[category]) {
      this.classificationRules[category] = {
        ...this.classificationRules[category],
        ...updates
      };
    }
  }

  /**
   * Get classification statistics
   */
  getClassificationStats() {
    return {
      totalRules: Object.keys(this.classificationRules).length,
      categories: Object.keys(this.classificationRules),
      thresholds: this.confidenceThresholds
    };
  }
}

module.exports = PatternClassifier;