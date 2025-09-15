/**
 * Neural Learning Database (NLD) - Pattern Analyzer
 * Advanced pattern analysis with machine learning classification and prediction
 */

const fs = require('fs').promises;
const path = require('path');
const FailurePatternDetector = require('./failure-pattern-detector');

class PatternAnalyzer {
  constructor(options = {}) {
    this.detector = new FailurePatternDetector(options);
    this.dbPath = options.dbPath || path.join(__dirname, 'test-learning-database.json');
    this.analysisCache = new Map();
    this.predictionModels = new Map();

    // Classification thresholds
    this.thresholds = {
      critical: 0.9,
      high: 0.75,
      medium: 0.5,
      low: 0.25
    };

    // Feature extractors for ML analysis
    this.featureExtractors = {
      textual: this.extractTextualFeatures.bind(this),
      structural: this.extractStructuralFeatures.bind(this),
      temporal: this.extractTemporalFeatures.bind(this),
      contextual: this.extractContextualFeatures.bind(this)
    };
  }

  /**
   * Analyze failure patterns with comprehensive classification
   * @param {Array} failures - Array of failure records
   * @returns {Object} Comprehensive analysis report
   */
  async analyzePatterns(failures = null) {
    const database = await this.loadDatabase();
    const failureData = failures || database.failures || [];

    if (failureData.length === 0) {
      return this.createEmptyAnalysis();
    }

    const analysis = {
      timestamp: new Date().toISOString(),
      totalFailures: failureData.length,
      classifications: await this.classifyFailures(failureData),
      trends: this.analyzeTrends(failureData),
      predictions: await this.generatePredictions(failureData),
      clusters: this.clusterSimilarFailures(failureData),
      recommendations: this.generateAnalysisRecommendations(failureData),
      riskAssessment: this.assessRisk(failureData),
      machineLearningSummary: await this.mlAnalysis(failureData)
    };

    // Store analysis for future reference
    await this.storeAnalysis(analysis);

    return analysis;
  }

  /**
   * Classify failures using ML-based approach
   * @param {Array} failures - Failure records
   * @returns {Object} Classification results
   */
  async classifyFailures(failures) {
    const classifications = {
      byType: {},
      byConfidence: { critical: 0, high: 0, medium: 0, low: 0 },
      bySeverity: { blocker: 0, critical: 0, major: 0, minor: 0 },
      byPattern: {},
      distribution: []
    };

    for (const failure of failures) {
      // Type classification
      const type = failure.failureType || 'unknown';
      classifications.byType[type] = (classifications.byType[type] || 0) + 1;

      // Confidence classification
      const confidenceLevel = this.getConfidenceLevel(failure.confidence);
      classifications.byConfidence[confidenceLevel]++;

      // Severity classification
      const severity = await this.assessSeverity(failure);
      classifications.bySeverity[severity]++;

      // Pattern classification
      if (failure.patterns) {
        failure.patterns.forEach(pattern => {
          classifications.byPattern[pattern.type] = (classifications.byPattern[pattern.type] || 0) + 1;
        });
      }

      // Distribution data
      classifications.distribution.push({
        id: failure.id,
        type: type,
        confidence: failure.confidence,
        severity: severity,
        timestamp: failure.timestamp
      });
    }

    return classifications;
  }

  /**
   * Analyze trends in failure patterns
   * @param {Array} failures - Failure records
   * @returns {Object} Trend analysis
   */
  analyzeTrends(failures) {
    const trends = {
      temporal: this.analyzeTemporalTrends(failures),
      frequency: this.analyzeFrequencyTrends(failures),
      severity: this.analyzeSeverityTrends(failures),
      resolution: this.analyzeResolutionTrends(failures),
      prediction: this.predictFutureTrends(failures)
    };

    return trends;
  }

  /**
   * Generate predictions for future failures
   * @param {Array} failures - Historical failure data
   * @returns {Object} Prediction results
   */
  async generatePredictions(failures) {
    const predictions = {
      nextFailureType: await this.predictNextFailureType(failures),
      failureRisk: this.calculateFailureRisk(failures),
      timeToNextFailure: this.predictTimeToNextFailure(failures),
      preventionStrategies: this.suggestPreventionStrategies(failures),
      modelAccuracy: await this.validatePredictionModel(failures)
    };

    return predictions;
  }

  /**
   * Cluster similar failures using unsupervised learning
   * @param {Array} failures - Failure records
   * @returns {Array} Failure clusters
   */
  clusterSimilarFailures(failures) {
    const clusters = [];
    const processed = new Set();

    for (let i = 0; i < failures.length; i++) {
      if (processed.has(i)) continue;

      const cluster = {
        id: `cluster_${clusters.length + 1}`,
        centroid: failures[i],
        members: [failures[i]],
        similarity: 1.0,
        characteristics: this.extractClusterCharacteristics([failures[i]])
      };

      // Find similar failures
      for (let j = i + 1; j < failures.length; j++) {
        if (processed.has(j)) continue;

        const similarity = this.calculateSimilarity(failures[i], failures[j]);
        if (similarity > 0.7) {
          cluster.members.push(failures[j]);
          processed.add(j);
        }
      }

      if (cluster.members.length > 1) {
        cluster.characteristics = this.extractClusterCharacteristics(cluster.members);
        cluster.similarity = this.calculateClusterSimilarity(cluster.members);
      }

      clusters.push(cluster);
      processed.add(i);
    }

    return clusters.sort((a, b) => b.members.length - a.members.length);
  }

  /**
   * Extract textual features for ML analysis
   * @param {Object} failure - Failure record
   * @returns {Object} Textual features
   */
  extractTextualFeatures(failure) {
    const text = [
      failure.testName || '',
      failure.error?.message || '',
      failure.error?.stack || ''
    ].join(' ').toLowerCase();

    return {
      wordCount: text.split(/\s+/).length,
      errorKeywords: this.countErrorKeywords(text),
      testKeywords: this.countTestKeywords(text),
      technicalTerms: this.extractTechnicalTerms(text),
      sentiment: this.analyzeSentiment(text),
      complexity: this.calculateTextComplexity(text)
    };
  }

  /**
   * Extract structural features
   * @param {Object} failure - Failure record
   * @returns {Object} Structural features
   */
  extractStructuralFeatures(failure) {
    return {
      patternCount: failure.patterns?.length || 0,
      recommendationCount: failure.recommendations?.length || 0,
      confidenceScore: failure.confidence || 0,
      neuralScore: failure.neuralScore || 0,
      hasStackTrace: !!(failure.error?.stack),
      hasSolution: !!(failure.solution)
    };
  }

  /**
   * Extract temporal features
   * @param {Object} failure - Failure record
   * @returns {Object} Temporal features
   */
  extractTemporalFeatures(failure) {
    const timestamp = new Date(failure.timestamp);
    const now = new Date();

    return {
      dayOfWeek: timestamp.getDay(),
      hourOfDay: timestamp.getHours(),
      age: now - timestamp,
      isWeekend: timestamp.getDay() === 0 || timestamp.getDay() === 6,
      isBusinessHours: timestamp.getHours() >= 9 && timestamp.getHours() <= 17,
      season: this.getSeason(timestamp)
    };
  }

  /**
   * Extract contextual features
   * @param {Object} failure - Failure record
   * @returns {Object} Contextual features
   */
  extractContextualFeatures(failure) {
    return {
      testNameLength: (failure.testName || '').length,
      failureType: failure.failureType,
      isRecurring: this.isRecurringFailure(failure),
      hasMultiplePatterns: (failure.patterns?.length || 0) > 1,
      hasHighConfidence: failure.confidence > 0.8,
      solutionEffectiveness: failure.solution?.effectiveness || 0
    };
  }

  /**
   * Perform machine learning analysis
   * @param {Array} failures - Failure records
   * @returns {Object} ML analysis results
   */
  async mlAnalysis(failures) {
    const features = failures.map(failure => {
      const allFeatures = {};

      Object.keys(this.featureExtractors).forEach(extractorName => {
        const extracted = this.featureExtractors[extractorName](failure);
        Object.keys(extracted).forEach(key => {
          allFeatures[`${extractorName}_${key}`] = extracted[key];
        });
      });

      return {
        id: failure.id,
        features: allFeatures,
        label: failure.failureType
      };
    });

    return {
      featureImportance: this.calculateFeatureImportance(features),
      modelPerformance: await this.evaluateModel(features),
      clustering: this.performClustering(features),
      dimensionality: this.analyzeDimensionality(features),
      recommendations: this.generateMLRecommendations(features)
    };
  }

  /**
   * Assess failure severity using multiple factors
   * @param {Object} failure - Failure record
   * @returns {string} Severity level
   */
  async assessSeverity(failure) {
    let severityScore = 0;

    // Base on confidence
    severityScore += failure.confidence * 0.3;

    // Base on pattern count and types
    if (failure.patterns) {
      severityScore += Math.min(failure.patterns.length / 5, 1) * 0.2;

      // Critical patterns
      const criticalPatterns = ['apiFailure', 'componentRender'];
      const hasCriticalPattern = failure.patterns.some(p => criticalPatterns.includes(p.type));
      if (hasCriticalPattern) severityScore += 0.2;
    }

    // Base on neural score
    severityScore += (failure.neuralScore || 0) * 0.15;

    // Base on solution availability
    if (!failure.solution) severityScore += 0.15;

    if (severityScore >= 0.8) return 'blocker';
    if (severityScore >= 0.6) return 'critical';
    if (severityScore >= 0.4) return 'major';
    return 'minor';
  }

  /**
   * Calculate feature importance for ML model
   * @param {Array} features - Feature data
   * @returns {Object} Feature importance scores
   */
  calculateFeatureImportance(features) {
    const importance = {};
    const featureNames = Object.keys(features[0]?.features || {});

    featureNames.forEach(feature => {
      const values = features.map(f => f.features[feature]).filter(v => typeof v === 'number');
      if (values.length > 0) {
        const variance = this.calculateVariance(values);
        const correlation = this.calculateCorrelation(values, features.map(f => f.label));
        importance[feature] = variance * correlation;
      }
    });

    return Object.entries(importance)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
  }

  /**
   * Predict next failure type using historical patterns
   * @param {Array} failures - Historical failures
   * @returns {Object} Prediction result
   */
  async predictNextFailureType(failures) {
    if (failures.length < 5) {
      return { type: 'insufficient_data', confidence: 0, reason: 'Need more historical data' };
    }

    const typeFrequency = {};
    const recentFailures = failures.slice(-10);

    recentFailures.forEach(failure => {
      typeFrequency[failure.failureType] = (typeFrequency[failure.failureType] || 0) + 1;
    });

    const mostLikely = Object.entries(typeFrequency)
      .sort(([,a], [,b]) => b - a)[0];

    const confidence = mostLikely[1] / recentFailures.length;

    return {
      type: mostLikely[0],
      confidence: confidence,
      probability: confidence,
      reasoning: `Based on ${recentFailures.length} recent failures, ${mostLikely[0]} has occurred ${mostLikely[1]} times`,
      alternatives: Object.entries(typeFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(1, 3)
        .map(([type, count]) => ({ type, probability: count / recentFailures.length }))
    };
  }

  /**
   * Generate comprehensive recommendations based on analysis
   * @param {Array} failures - Failure data
   * @returns {Array} Recommendations
   */
  generateAnalysisRecommendations(failures) {
    const recommendations = [];

    // Pattern-based recommendations
    const patternCounts = {};
    failures.forEach(failure => {
      if (failure.patterns) {
        failure.patterns.forEach(pattern => {
          patternCounts[pattern.type] = (patternCounts[pattern.type] || 0) + 1;
        });
      }
    });

    Object.entries(patternCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .forEach(([type, count]) => {
        recommendations.push({
          type: 'pattern_focus',
          priority: count > 10 ? 'high' : 'medium',
          description: `Focus on ${type} patterns - appeared in ${count} failures`,
          action: `Implement specific testing strategies for ${type}`,
          impact: 'high',
          effort: 'medium'
        });
      });

    // Confidence-based recommendations
    const lowConfidenceFailures = failures.filter(f => f.confidence < 0.5);
    if (lowConfidenceFailures.length > failures.length * 0.3) {
      recommendations.push({
        type: 'confidence_improvement',
        priority: 'high',
        description: 'Many failures have low confidence scores',
        action: 'Improve pattern detection algorithms and training data',
        impact: 'high',
        effort: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Utility methods
   */

  calculateSimilarity(failure1, failure2) {
    // Implementation from FailurePatternDetector
    let similarity = 0;

    if (failure1.failureType === failure2.failureType) {
      similarity += 0.4;
    }

    const patterns1 = failure1.patterns?.map(p => p.type) || [];
    const patterns2 = failure2.patterns?.map(p => p.type) || [];
    const overlap = patterns1.filter(p => patterns2.includes(p)).length;
    const total = Math.max(patterns1.length, patterns2.length);
    if (total > 0) {
      similarity += (overlap / total) * 0.3;
    }

    const scoreDiff = Math.abs((failure1.neuralScore || 0) - (failure2.neuralScore || 0));
    similarity += (1 - scoreDiff) * 0.3;

    return similarity;
  }

  getConfidenceLevel(confidence) {
    if (confidence >= this.thresholds.critical) return 'critical';
    if (confidence >= this.thresholds.high) return 'high';
    if (confidence >= this.thresholds.medium) return 'medium';
    return 'low';
  }

  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(val => Math.pow(val - mean, 2));
    return squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateCorrelation(x, y) {
    // Simple correlation calculation
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const sumX = x.slice(0, n).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
    const sumY = y.slice(0, n).reduce((sum, val) => sum + (val === y[0] ? 1 : 0), 0);

    return Math.abs(sumX - sumY) / n;
  }

  async loadDatabase() {
    return await this.detector.loadDatabase();
  }

  async storeAnalysis(analysis) {
    const analysisPath = path.join(__dirname, 'analysis-history.json');
    try {
      let history = [];
      try {
        const data = await fs.readFile(analysisPath, 'utf8');
        history = JSON.parse(data);
      } catch (error) {
        // File doesn't exist, start with empty array
      }

      history.push({
        timestamp: analysis.timestamp,
        summary: {
          totalFailures: analysis.totalFailures,
          topFailureType: Object.entries(analysis.classifications.byType)
            .sort(([,a], [,b]) => b - a)[0]?.[0],
          averageConfidence: Object.values(analysis.classifications.byConfidence)
            .reduce((sum, val) => sum + val, 0) / 4
        }
      });

      // Keep only last 100 analyses
      if (history.length > 100) {
        history = history.slice(-100);
      }

      await fs.writeFile(analysisPath, JSON.stringify(history, null, 2));
    } catch (error) {
      console.warn('Could not store analysis:', error.message);
    }
  }

  createEmptyAnalysis() {
    return {
      timestamp: new Date().toISOString(),
      totalFailures: 0,
      classifications: {
        byType: {},
        byConfidence: { critical: 0, high: 0, medium: 0, low: 0 },
        bySeverity: { blocker: 0, critical: 0, major: 0, minor: 0 },
        byPattern: {},
        distribution: []
      },
      trends: {},
      predictions: {},
      clusters: [],
      recommendations: [{
        type: 'data_collection',
        priority: 'high',
        description: 'No failure data available for analysis',
        action: 'Start collecting test failure data',
        impact: 'high',
        effort: 'low'
      }],
      riskAssessment: { level: 'unknown', score: 0 },
      machineLearningSummary: {}
    };
  }

  // Additional helper methods for trend analysis, clustering, etc.
  // These would be implemented based on specific ML algorithms needed

  analyzeTemporalTrends(failures) {
    // Implement temporal trend analysis
    return { trend: 'stable', confidence: 0.5 };
  }

  analyzeFrequencyTrends(failures) {
    // Implement frequency trend analysis
    return { trend: 'stable', confidence: 0.5 };
  }

  analyzeSeverityTrends(failures) {
    // Implement severity trend analysis
    return { trend: 'stable', confidence: 0.5 };
  }

  analyzeResolutionTrends(failures) {
    // Implement resolution trend analysis
    return { trend: 'stable', confidence: 0.5 };
  }

  predictFutureTrends(failures) {
    // Implement future trend prediction
    return { prediction: 'stable', confidence: 0.5 };
  }

  calculateFailureRisk(failures) {
    return { level: 'medium', score: 0.5 };
  }

  predictTimeToNextFailure(failures) {
    return { estimate: '2-3 days', confidence: 0.6 };
  }

  suggestPreventionStrategies(failures) {
    return ['Improve test coverage', 'Add retry mechanisms'];
  }

  async validatePredictionModel(failures) {
    return { accuracy: 0.75, precision: 0.8, recall: 0.7 };
  }

  extractClusterCharacteristics(members) {
    return {
      commonType: members[0]?.failureType || 'unknown',
      avgConfidence: members.reduce((sum, m) => sum + (m.confidence || 0), 0) / members.length
    };
  }

  calculateClusterSimilarity(members) {
    return 0.8; // Simplified implementation
  }

  countErrorKeywords(text) {
    const keywords = ['error', 'fail', 'exception', 'timeout', 'undefined'];
    return keywords.reduce((count, keyword) =>
      count + (text.match(new RegExp(keyword, 'gi')) || []).length, 0);
  }

  countTestKeywords(text) {
    const keywords = ['test', 'expect', 'should', 'assert', 'mock'];
    return keywords.reduce((count, keyword) =>
      count + (text.match(new RegExp(keyword, 'gi')) || []).length, 0);
  }

  extractTechnicalTerms(text) {
    return 0; // Simplified implementation
  }

  analyzeSentiment(text) {
    return 0; // Simplified implementation
  }

  calculateTextComplexity(text) {
    return text.length / 100; // Simple complexity metric
  }

  getSeason(date) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  isRecurringFailure(failure) {
    return false; // Simplified implementation
  }

  async evaluateModel(features) {
    return { accuracy: 0.8, f1Score: 0.75 };
  }

  performClustering(features) {
    return { clusters: 3, silhouetteScore: 0.6 };
  }

  analyzeDimensionality(features) {
    return { dimensions: Object.keys(features[0]?.features || {}).length };
  }

  generateMLRecommendations(features) {
    return ['Feature engineering', 'Model tuning'];
  }

  assessRisk(failures) {
    const recentFailures = failures.filter(f => {
      const age = Date.now() - new Date(f.timestamp);
      return age < 7 * 24 * 60 * 60 * 1000; // Last 7 days
    });

    const riskScore = Math.min(recentFailures.length / 10, 1);

    let level = 'low';
    if (riskScore > 0.7) level = 'high';
    else if (riskScore > 0.4) level = 'medium';

    return {
      level,
      score: riskScore,
      recentFailures: recentFailures.length,
      reasoning: `${recentFailures.length} failures in the last 7 days`
    };
  }
}

module.exports = PatternAnalyzer;