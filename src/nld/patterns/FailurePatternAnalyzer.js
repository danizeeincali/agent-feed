/**
 * Failure Pattern Analyzer for Link Preview Service
 * Analyzes and classifies failure patterns to build predictive models
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

export class FailurePatternAnalyzer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      dataPath: config.dataPath || '/workspaces/agent-feed/.claude-flow/nld',
      minPatternOccurrence: config.minPatternOccurrence || 3,
      patternTimeWindow: config.patternTimeWindow || 7 * 24 * 60 * 60 * 1000, // 7 days
      confidenceThreshold: config.confidenceThreshold || 0.75,
      ...config
    };

    // Pattern storage
    this.failurePatterns = new Map();
    this.platformPatterns = new Map();
    this.temporalPatterns = new Map();
    this.errorCorrelations = new Map();
    
    // Analysis metrics
    this.analysisMetrics = {
      patternsDetected: 0,
      accuratePredictions: 0,
      totalPredictions: 0,
      falsePositives: 0,
      falseNegatives: 0
    };

    this.initialize();
  }

  async initialize() {
    try {
      await this.loadExistingPatterns();
      await this.buildCorrelationMatrix();
      console.log('🔍 Failure Pattern Analyzer initialized');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Pattern Analyzer initialization failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Analyze a failure event and extract patterns
   */
  analyzeFailure(failureData) {
    try {
      // Extract multiple pattern types
      const patterns = {
        platform: this.extractPlatformPattern(failureData),
        temporal: this.extractTemporalPattern(failureData),
        error: this.extractErrorPattern(failureData),
        network: this.extractNetworkPattern(failureData),
        content: this.extractContentPattern(failureData),
        sequence: this.extractSequencePattern(failureData)
      };

      // Store patterns
      this.storePatterns(patterns, failureData);

      // Check for emerging patterns
      const emergingPatterns = this.detectEmergingPatterns(patterns);
      
      // Update correlations
      this.updateCorrelations(patterns, failureData);

      // Emit analysis results
      this.emit('patternAnalyzed', {
        failureId: failureData.requestId,
        patterns,
        emergingPatterns,
        confidence: this.calculatePatternConfidence(patterns),
        recommendations: this.generatePatternRecommendations(patterns)
      });

      return patterns;
    } catch (error) {
      console.error('❌ Pattern analysis failed:', error);
      return null;
    }
  }

  /**
   * Extract platform-specific failure patterns
   */
  extractPlatformPattern(failureData) {
    const platform = failureData.platform;
    const errorType = failureData.error.type;
    const context = failureData.context;

    return {
      type: 'platform',
      platform,
      errorType,
      httpStatus: context.httpStatus,
      rateLimited: context.rateLimited,
      authError: context.authError,
      timeoutError: context.timeoutError,
      parseError: context.parseError,
      userAgent: failureData.userAgent,
      timestamp: failureData.completionTime,
      signature: `${platform}-${errorType}-${context.httpStatus || 'unknown'}`
    };
  }

  /**
   * Extract temporal failure patterns (time-based)
   */
  extractTemporalPattern(failureData) {
    const timestamp = new Date(failureData.completionTime);
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return {
      type: 'temporal',
      hour,
      dayOfWeek,
      isWeekend,
      platform: failureData.platform,
      errorType: failureData.error.type,
      timestamp: failureData.completionTime,
      signature: `${failureData.platform}-${hour}-${dayOfWeek}-${failureData.error.type}`
    };
  }

  /**
   * Extract error-specific patterns
   */
  extractErrorPattern(failureData) {
    const error = failureData.error;
    const context = failureData.context;

    return {
      type: 'error',
      errorType: error.type,
      errorCode: error.code,
      httpStatus: context.httpStatus,
      message: error.message,
      retryAttempted: context.recoveryAttempted,
      fallbackUsed: context.fallbackUsed,
      platform: failureData.platform,
      timestamp: failureData.completionTime,
      signature: `${error.type}-${error.code || 'unknown'}-${context.httpStatus || 'unknown'}`
    };
  }

  /**
   * Extract network-related failure patterns
   */
  extractNetworkPattern(failureData) {
    const context = failureData.context;
    const duration = failureData.duration;

    return {
      type: 'network',
      networkError: context.networkError,
      timeoutError: context.timeoutError,
      duration,
      platform: failureData.platform,
      isSlowResponse: duration > 15000,
      connectionIssue: context.networkError && !context.timeoutError,
      timestamp: failureData.completionTime,
      signature: `network-${context.networkError ? 'error' : 'ok'}-${context.timeoutError ? 'timeout' : 'normal'}`
    };
  }

  /**
   * Extract content parsing failure patterns
   */
  extractContentPattern(failureData) {
    const context = failureData.context;
    
    return {
      type: 'content',
      parseError: context.parseError,
      platform: failureData.platform,
      extractionStrategy: failureData.extractionStrategy,
      userAgent: failureData.userAgent,
      contentType: context.contentType,
      timestamp: failureData.completionTime,
      signature: `content-${context.parseError ? 'parse-error' : 'ok'}-${failureData.platform}`
    };
  }

  /**
   * Extract failure sequence patterns (multiple related failures)
   */
  extractSequencePattern(failureData) {
    const recentFailures = this.getRecentFailuresForPlatform(
      failureData.platform, 
      30 * 60 * 1000 // 30 minutes
    );

    return {
      type: 'sequence',
      platform: failureData.platform,
      recentFailureCount: recentFailures.length,
      isSequentialFailure: recentFailures.length > 2,
      failureTypes: recentFailures.map(f => f.error.type),
      timeSpan: recentFailures.length > 0 ? 
        Date.now() - new Date(recentFailures[0].timestamp).getTime() : 0,
      timestamp: failureData.completionTime,
      signature: `sequence-${failureData.platform}-${recentFailures.length}`
    };
  }

  /**
   * Store patterns for future analysis
   */
  storePatterns(patterns, failureData) {
    Object.values(patterns).forEach(pattern => {
      if (!pattern) return;

      const key = pattern.signature;
      const existing = this.failurePatterns.get(key);

      if (existing) {
        existing.occurrences++;
        existing.lastOccurrence = pattern.timestamp;
        existing.confidence = Math.min(existing.confidence + 0.05, 1.0);
        existing.examples.push(failureData.requestId);
        if (existing.examples.length > 10) {
          existing.examples = existing.examples.slice(-10);
        }
      } else {
        this.failurePatterns.set(key, {
          ...pattern,
          occurrences: 1,
          firstOccurrence: pattern.timestamp,
          lastOccurrence: pattern.timestamp,
          confidence: 0.3,
          examples: [failureData.requestId],
          predictiveValue: 0.0
        });
      }
    });

    this.analysisMetrics.patternsDetected = this.failurePatterns.size;
  }

  /**
   * Detect emerging failure patterns
   */
  detectEmergingPatterns(patterns) {
    const emerging = [];
    const recentTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    Object.values(patterns).forEach(pattern => {
      if (!pattern) return;

      const existing = this.failurePatterns.get(pattern.signature);
      if (existing && existing.occurrences >= this.config.minPatternOccurrence) {
        const recentOccurrence = new Date(existing.lastOccurrence).getTime() > recentTime;
        
        if (recentOccurrence && existing.confidence > this.config.confidenceThreshold) {
          emerging.push({
            pattern: existing,
            severity: this.calculatePatternSeverity(existing),
            recommendation: this.generatePatternRecommendation(existing)
          });
        }
      }
    });

    return emerging;
  }

  /**
   * Update pattern correlations
   */
  updateCorrelations(patterns, failureData) {
    const patternKeys = Object.values(patterns)
      .filter(p => p)
      .map(p => p.signature);

    // Update co-occurrence matrix
    for (let i = 0; i < patternKeys.length; i++) {
      for (let j = i + 1; j < patternKeys.length; j++) {
        const key = `${patternKeys[i]}|${patternKeys[j]}`;
        const correlation = this.errorCorrelations.get(key) || { count: 0, confidence: 0 };
        correlation.count++;
        correlation.confidence = Math.min(correlation.confidence + 0.1, 1.0);
        this.errorCorrelations.set(key, correlation);
      }
    }
  }

  /**
   * Predict failure probability for a request
   */
  predictFailureProbability(requestData) {
    let totalProbability = 0.0;
    let patternMatches = 0;
    let confidenceSum = 0.0;

    // Check against all known patterns
    this.failurePatterns.forEach(pattern => {
      const match = this.patternMatches(requestData, pattern);
      if (match.matches) {
        const probability = this.calculateFailureProbability(pattern);
        totalProbability += probability * match.strength;
        confidenceSum += pattern.confidence * match.strength;
        patternMatches++;
      }
    });

    // Calculate weighted average
    const averageProbability = patternMatches > 0 ? totalProbability / patternMatches : 0.1;
    const averageConfidence = patternMatches > 0 ? confidenceSum / patternMatches : 0.1;

    return {
      probability: Math.min(averageProbability, 0.95),
      confidence: averageConfidence,
      matchingPatterns: patternMatches,
      recommendation: this.generatePreventionRecommendation(averageProbability)
    };
  }

  /**
   * Check if a pattern matches current request data
   */
  patternMatches(requestData, pattern) {
    let matches = false;
    let strength = 0.0;

    switch (pattern.type) {
      case 'platform':
        matches = requestData.platform === pattern.platform;
        strength = matches ? 0.8 : 0.0;
        break;
      
      case 'temporal':
        const hour = new Date().getHours();
        const dayOfWeek = new Date().getDay();
        matches = hour === pattern.hour || dayOfWeek === pattern.dayOfWeek;
        strength = matches ? 0.6 : 0.0;
        break;

      case 'network':
        // Network patterns are harder to predict in advance
        matches = true;
        strength = 0.3;
        break;

      case 'sequence':
        const recentFailures = this.getRecentFailuresForPlatform(requestData.platform, 30 * 60 * 1000);
        matches = recentFailures.length > 1;
        strength = matches ? Math.min(recentFailures.length * 0.2, 0.9) : 0.0;
        break;

      default:
        matches = false;
        strength = 0.0;
    }

    return { matches, strength };
  }

  /**
   * Calculate failure probability from pattern data
   */
  calculateFailureProbability(pattern) {
    const baseRate = 0.1; // Base failure rate
    const occurrenceMultiplier = Math.min(pattern.occurrences * 0.1, 0.5);
    const confidenceMultiplier = pattern.confidence;
    const recentnessMultiplier = this.calculateRecentnessMultiplier(pattern.lastOccurrence);

    return Math.min(
      baseRate + occurrenceMultiplier * confidenceMultiplier * recentnessMultiplier,
      0.95
    );
  }

  /**
   * Calculate how recent a pattern is (more recent = higher multiplier)
   */
  calculateRecentnessMultiplier(timestamp) {
    const hoursSinceOccurrence = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceOccurrence < 1) return 1.0;
    if (hoursSinceOccurrence < 6) return 0.8;
    if (hoursSinceOccurrence < 24) return 0.6;
    if (hoursSinceOccurrence < 72) return 0.4;
    return 0.2;
  }

  /**
   * Generate recommendations based on pattern analysis
   */
  generatePatternRecommendations(patterns) {
    const recommendations = [];

    Object.values(patterns).forEach(pattern => {
      if (!pattern) return;

      switch (pattern.type) {
        case 'platform':
          if (pattern.rateLimited) {
            recommendations.push('Implement exponential backoff for this platform');
          }
          if (pattern.authError) {
            recommendations.push('Review authentication mechanism for this platform');
          }
          break;

        case 'temporal':
          if (pattern.hour >= 9 && pattern.hour <= 17) {
            recommendations.push('Consider off-peak processing during business hours');
          }
          break;

        case 'network':
          if (pattern.timeoutError) {
            recommendations.push('Increase timeout values or implement request cancellation');
          }
          break;

        case 'sequence':
          if (pattern.isSequentialFailure) {
            recommendations.push('Implement circuit breaker pattern for this platform');
          }
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Export pattern analysis data for neural training
   */
  async exportPatternData() {
    const exportData = {
      metadata: {
        exportTimestamp: new Date().toISOString(),
        totalPatterns: this.failurePatterns.size,
        analysisMetrics: this.analysisMetrics
      },
      patterns: Array.from(this.failurePatterns.entries()).map(([key, pattern]) => ({
        signature: key,
        ...pattern
      })),
      correlations: Array.from(this.errorCorrelations.entries()).map(([key, correlation]) => ({
        patterns: key.split('|'),
        ...correlation
      })),
      platformSummary: this.generatePlatformSummary(),
      temporalSummary: this.generateTemporalSummary()
    };

    const exportPath = path.join(
      this.config.dataPath,
      'exports',
      `pattern-analysis-${Date.now()}.json`
    );

    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    return exportPath;
  }

  // Utility methods
  getRecentFailuresForPlatform(platform, timeWindow) {
    // In a real implementation, this would query stored failure data
    // For now, return empty array
    return [];
  }

  calculatePatternConfidence(patterns) {
    const validPatterns = Object.values(patterns).filter(p => p);
    if (validPatterns.length === 0) return 0.0;
    
    const avgConfidence = validPatterns.reduce((sum, p) => {
      const existing = this.failurePatterns.get(p.signature);
      return sum + (existing?.confidence || 0.3);
    }, 0) / validPatterns.length;

    return avgConfidence;
  }

  calculatePatternSeverity(pattern) {
    let severity = 'low';
    
    if (pattern.occurrences > 10 && pattern.confidence > 0.8) {
      severity = 'high';
    } else if (pattern.occurrences > 5 && pattern.confidence > 0.6) {
      severity = 'medium';
    }

    return severity;
  }

  generatePatternRecommendation(pattern) {
    const recommendations = {
      'platform': 'Review platform-specific handling and implement targeted fixes',
      'temporal': 'Consider time-based request scheduling and rate limiting',
      'error': 'Implement specific error handling for this error type',
      'network': 'Improve network resilience with retries and fallbacks',
      'content': 'Enhance content parsing with alternative strategies',
      'sequence': 'Implement circuit breaker to prevent cascading failures'
    };

    return recommendations[pattern.type] || 'Review and improve error handling';
  }

  generatePreventionRecommendation(probability) {
    if (probability > 0.7) {
      return 'High failure risk - implement circuit breaker and fallback strategies';
    } else if (probability > 0.4) {
      return 'Medium failure risk - implement retry logic with exponential backoff';
    } else {
      return 'Low failure risk - maintain standard error handling';
    }
  }

  generatePlatformSummary() {
    const summary = {};
    
    this.failurePatterns.forEach(pattern => {
      if (pattern.type === 'platform') {
        const platform = pattern.platform;
        if (!summary[platform]) {
          summary[platform] = {
            totalFailures: 0,
            errorTypes: {},
            avgConfidence: 0
          };
        }
        summary[platform].totalFailures += pattern.occurrences;
        summary[platform].errorTypes[pattern.errorType] = 
          (summary[platform].errorTypes[pattern.errorType] || 0) + pattern.occurrences;
      }
    });

    return summary;
  }

  generateTemporalSummary() {
    const hourly = new Array(24).fill(0);
    const daily = new Array(7).fill(0);

    this.failurePatterns.forEach(pattern => {
      if (pattern.type === 'temporal') {
        hourly[pattern.hour] += pattern.occurrences;
        daily[pattern.dayOfWeek] += pattern.occurrences;
      }
    });

    return { hourly, daily };
  }

  async loadExistingPatterns() {
    // Load patterns from storage
    // Implementation would read from filesystem/database
  }

  async buildCorrelationMatrix() {
    // Build correlation matrix from existing data
    // Implementation would analyze historical correlations
  }
}

export default FailurePatternAnalyzer;