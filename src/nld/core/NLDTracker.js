/**
 * Neural Learning Database (NLD) Core Tracker
 * Captures failure patterns and builds predictive models for link preview functionality
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class NLDTracker extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      dataPath: config.dataPath || '/workspaces/agent-feed/.claude-flow/nld',
      sessionId: config.sessionId || this.generateSessionId(),
      enablePredictiveModeling: config.enablePredictiveModeling !== false,
      enableRealTimeMonitoring: config.enableRealTimeMonitoring !== false,
      patternConfidenceThreshold: config.patternConfidenceThreshold || 0.7,
      maxPatternMemory: config.maxPatternMemory || 1000,
      ...config
    };

    // Initialize storage structures
    this.patterns = new Map();
    this.sessions = new Map();
    this.activeRequests = new Map();
    this.failureModels = new Map();
    this.successModels = new Map();
    
    // Performance tracking
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      patternMatchAccuracy: 0,
      predictionAccuracy: 0
    };

    this.initializeNLD();
  }

  /**
   * Initialize NLD system and load existing patterns
   */
  async initializeNLD() {
    try {
      await this.ensureDirectoryStructure();
      await this.loadExistingPatterns();
      await this.loadFailureModels();
      await this.loadSuccessModels();
      
      console.log('🧠 NLD Tracker initialized successfully');
      this.emit('initialized', this.getStatus());
    } catch (error) {
      console.error('❌ NLD initialization failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Track a link preview request start
   */
  trackRequest(url, options = {}) {
    const requestId = this.generateRequestId(url);
    const timestamp = new Date().toISOString();
    
    const requestData = {
      requestId,
      url,
      timestamp,
      sessionId: this.config.sessionId,
      platform: this.detectPlatform(url),
      extractionStrategy: options.strategy || 'default',
      retryCount: options.retryCount || 0,
      useCache: options.useCache !== false,
      userAgent: options.userAgent || 'default',
      timeout: options.timeout || 15000,
      predictedOutcome: null,
      riskScore: null
    };

    // Analyze request and predict outcome
    this.analyzeRequest(requestData);
    
    this.activeRequests.set(requestId, requestData);
    this.metrics.totalRequests++;
    
    this.emit('requestStarted', requestData);
    return requestId;
  }

  /**
   * Track a successful link preview completion
   */
  trackSuccess(requestId, result, performanceMetrics = {}) {
    const requestData = this.activeRequests.get(requestId);
    if (!requestData) {
      console.warn(`⚠️ No active request found for ID: ${requestId}`);
      return;
    }

    const successData = {
      ...requestData,
      outcome: 'success',
      completionTime: new Date().toISOString(),
      duration: performanceMetrics.duration || this.calculateDuration(requestData.timestamp),
      result: this.sanitizeResult(result),
      responseSize: performanceMetrics.responseSize || 0,
      apiCalls: performanceMetrics.apiCalls || 1,
      cacheHit: performanceMetrics.cacheHit || false,
      extractionMethod: performanceMetrics.extractionMethod || 'html-parse',
      contentQuality: this.assessContentQuality(result)
    };

    // Update success patterns
    this.updateSuccessPatterns(successData);
    
    // Update metrics
    this.metrics.successfulRequests++;
    this.updateAverageResponseTime(successData.duration);
    
    this.activeRequests.delete(requestId);
    this.emit('requestSuccess', successData);
    
    // Store success pattern for neural learning
    this.storeNeuralPattern('success', successData);
  }

  /**
   * Track a failed link preview attempt
   */
  trackFailure(requestId, error, context = {}) {
    const requestData = this.activeRequests.get(requestId);
    if (!requestData) {
      console.warn(`⚠️ No active request found for ID: ${requestId}`);
      return;
    }

    const failureData = {
      ...requestData,
      outcome: 'failure',
      completionTime: new Date().toISOString(),
      duration: this.calculateDuration(requestData.timestamp),
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack,
        type: this.classifyErrorType(error)
      },
      context: {
        httpStatus: context.httpStatus,
        networkError: context.networkError || false,
        parseError: context.parseError || false,
        timeoutError: context.timeoutError || false,
        rateLimited: context.rateLimited || false,
        authError: context.authError || false,
        ...context
      },
      failureCategory: this.categorizeFailure(error, context),
      recoveryAttempted: context.recoveryAttempted || false,
      fallbackUsed: context.fallbackUsed || false
    };

    // Update failure patterns
    this.updateFailurePatterns(failureData);
    
    // Update metrics
    this.metrics.failedRequests++;
    
    this.activeRequests.delete(requestId);
    this.emit('requestFailure', failureData);
    
    // Store failure pattern for neural learning
    this.storeNeuralPattern('failure', failureData);
    
    // Trigger predictive analysis for similar requests
    this.analyzeSimilarFailurePatterns(failureData);
  }

  /**
   * Analyze request and predict potential issues
   */
  analyzeRequest(requestData) {
    const platform = requestData.platform;
    const riskFactors = [];
    let riskScore = 0.0;
    let predictedOutcome = 'success';

    // Platform-specific risk analysis
    const platformRisk = this.assessPlatformRisk(platform);
    riskScore += platformRisk.score;
    riskFactors.push(...platformRisk.factors);

    // Historical failure analysis
    const historicalRisk = this.assessHistoricalRisk(requestData.url, platform);
    riskScore += historicalRisk.score;
    riskFactors.push(...historicalRisk.factors);

    // Rate limiting risk
    const rateLimitRisk = this.assessRateLimitRisk(platform);
    riskScore += rateLimitRisk.score;
    riskFactors.push(...rateLimitRisk.factors);

    // Network conditions risk
    const networkRisk = this.assessNetworkRisk();
    riskScore += networkRisk.score;
    riskFactors.push(...networkRisk.factors);

    // Determine predicted outcome
    if (riskScore > 0.7) {
      predictedOutcome = 'high-failure-risk';
    } else if (riskScore > 0.4) {
      predictedOutcome = 'medium-failure-risk';
    }

    requestData.riskScore = Math.min(riskScore, 1.0);
    requestData.predictedOutcome = predictedOutcome;
    requestData.riskFactors = riskFactors;

    console.log(`🔍 Request analysis: ${requestData.url} - Risk: ${riskScore.toFixed(2)} (${predictedOutcome})`);
  }

  /**
   * Assess platform-specific risks
   */
  assessPlatformRisk(platform) {
    const platformRisks = {
      'youtube.com': { baseRisk: 0.2, factors: ['api-quota-limits', 'region-blocking'] },
      'twitter.com': { baseRisk: 0.3, factors: ['auth-required', 'rate-limiting-aggressive'] },
      'facebook.com': { baseRisk: 0.4, factors: ['auth-wall', 'dynamic-content'] },
      'instagram.com': { baseRisk: 0.4, factors: ['auth-required', 'anti-scraping'] },
      'linkedin.com': { baseRisk: 0.3, factors: ['auth-wall', 'rate-limiting'] },
      'default': { baseRisk: 0.1, factors: ['general-web-risks'] }
    };

    return platformRisks[platform] || platformRisks['default'];
  }

  /**
   * Assess historical failure risks for similar URLs
   */
  assessHistoricalRisk(url, platform) {
    const failurePatterns = this.failureModels.get(platform) || [];
    let riskScore = 0.0;
    const factors = [];

    for (const pattern of failurePatterns) {
      if (this.urlMatchesPattern(url, pattern.urlPattern)) {
        riskScore += pattern.failureRate * pattern.confidence;
        factors.push(`historical-${pattern.failureType}`);
      }
    }

    return { score: Math.min(riskScore, 0.5), factors };
  }

  /**
   * Assess rate limiting risks
   */
  assessRateLimitRisk(platform) {
    // Implementation would check recent request counts by platform
    // This is a simplified version
    const recentRequests = this.getRecentRequestCount(platform);
    const threshold = this.getPlatformRateLimit(platform);
    
    if (recentRequests > threshold * 0.8) {
      return { score: 0.6, factors: ['approaching-rate-limit'] };
    } else if (recentRequests > threshold * 0.6) {
      return { score: 0.3, factors: ['moderate-request-volume'] };
    }
    
    return { score: 0.0, factors: [] };
  }

  /**
   * Assess network condition risks
   */
  assessNetworkRisk() {
    // In a real implementation, this would check network conditions
    // For now, return low risk
    return { score: 0.1, factors: ['baseline-network-risk'] };
  }

  /**
   * Update failure patterns based on new failure data
   */
  updateFailurePatterns(failureData) {
    const platform = failureData.platform;
    const patterns = this.failureModels.get(platform) || [];
    
    const pattern = {
      urlPattern: this.extractUrlPattern(failureData.url),
      failureType: failureData.failureCategory,
      errorCode: failureData.error.code,
      timestamp: failureData.completionTime,
      frequency: 1,
      lastOccurrence: failureData.completionTime,
      confidence: 0.8
    };

    // Check if similar pattern exists
    const existingPattern = patterns.find(p => 
      p.urlPattern === pattern.urlPattern && 
      p.failureType === pattern.failureType
    );

    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastOccurrence = pattern.timestamp;
      existingPattern.confidence = Math.min(existingPattern.confidence + 0.1, 1.0);
    } else {
      patterns.push(pattern);
    }

    this.failureModels.set(platform, patterns);
  }

  /**
   * Update success patterns based on successful requests
   */
  updateSuccessPatterns(successData) {
    const platform = successData.platform;
    const patterns = this.successModels.get(platform) || [];
    
    const pattern = {
      urlPattern: this.extractUrlPattern(successData.url),
      extractionMethod: successData.extractionMethod,
      averageDuration: successData.duration,
      contentQuality: successData.contentQuality,
      cacheEffective: successData.cacheHit,
      timestamp: successData.completionTime,
      frequency: 1,
      confidence: 0.8
    };

    // Check if similar pattern exists
    const existingPattern = patterns.find(p => 
      p.urlPattern === pattern.urlPattern && 
      p.extractionMethod === pattern.extractionMethod
    );

    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.averageDuration = (existingPattern.averageDuration + pattern.averageDuration) / 2;
      existingPattern.confidence = Math.min(existingPattern.confidence + 0.1, 1.0);
    } else {
      patterns.push(pattern);
    }

    this.successModels.set(platform, patterns);
  }

  /**
   * Store neural pattern for claude-flow integration
   */
  async storeNeuralPattern(type, data) {
    try {
      const neuralPattern = {
        id: `nld-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: data.completionTime,
        type,
        platform: data.platform,
        pattern: this.extractNeuralPattern(data),
        effectiveness: this.calculateEffectiveness(data),
        confidence: this.calculateConfidence(data),
        metadata: {
          sessionId: data.sessionId,
          duration: data.duration,
          retryCount: data.retryCount || 0
        }
      };

      // Store in claude-flow neural patterns directory
      const neuralPath = path.join(this.config.dataPath, 'neural-patterns', `${neuralPattern.id}.json`);
      await fs.writeFile(neuralPath, JSON.stringify(neuralPattern, null, 2));

      this.emit('neuralPatternStored', neuralPattern);
    } catch (error) {
      console.error('❌ Failed to store neural pattern:', error);
    }
  }

  /**
   * Get current NLD status and metrics
   */
  getStatus() {
    return {
      isActive: true,
      metrics: { ...this.metrics },
      activeRequests: this.activeRequests.size,
      totalPatterns: this.patterns.size,
      failureModels: this.failureModels.size,
      successModels: this.successModels.size,
      sessionId: this.config.sessionId,
      uptimeHours: this.getUptimeHours()
    };
  }

  /**
   * Export neural training data
   */
  async exportNeuralTrainingData() {
    const trainingData = {
      metadata: {
        exportTimestamp: new Date().toISOString(),
        totalPatterns: this.patterns.size,
        sessionId: this.config.sessionId,
        version: '1.0.0'
      },
      failurePatterns: Array.from(this.failureModels.entries()),
      successPatterns: Array.from(this.successModels.entries()),
      metrics: this.metrics,
      predictionAccuracy: this.calculatePredictionAccuracy()
    };

    const exportPath = path.join(this.config.dataPath, 'neural-training', `export-${Date.now()}.json`);
    await fs.writeFile(exportPath, JSON.stringify(trainingData, null, 2));
    
    return exportPath;
  }

  // Utility methods
  generateSessionId() {
    return `nld-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateRequestId(url) {
    const hash = crypto.createHash('md5').update(url + Date.now()).digest('hex');
    return `req-${hash.substr(0, 8)}`;
  }

  detectPlatform(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch {
      return 'unknown';
    }
  }

  classifyErrorType(error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') return 'network';
    if (error.code === 'ETIMEDOUT') return 'timeout';
    if (error.message?.includes('429')) return 'rate-limit';
    if (error.message?.includes('403') || error.message?.includes('401')) return 'auth';
    if (error.message?.includes('parse') || error.message?.includes('JSON')) return 'parsing';
    return 'unknown';
  }

  categorizeFailure(error, context) {
    if (context.rateLimited) return 'rate-limiting';
    if (context.authError) return 'authentication';
    if (context.networkError) return 'network';
    if (context.parseError) return 'content-parsing';
    if (context.timeoutError) return 'timeout';
    return 'general';
  }

  calculateDuration(startTime) {
    return Date.now() - new Date(startTime).getTime();
  }

  updateAverageResponseTime(duration) {
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + duration) / 
      this.metrics.totalRequests;
  }

  sanitizeResult(result) {
    // Remove sensitive data and large content for storage
    return {
      title: result.title?.substring(0, 200),
      description: result.description?.substring(0, 500),
      type: result.type,
      hasImage: !!result.image,
      hasVideo: !!result.video,
      platform: result.site_name
    };
  }

  assessContentQuality(result) {
    let quality = 0.5; // baseline
    
    if (result.title && result.title.length > 10) quality += 0.2;
    if (result.description && result.description.length > 20) quality += 0.2;
    if (result.image) quality += 0.1;
    if (result.video) quality += 0.1;
    if (!result.error && !result.fallback) quality += 0.1;
    
    return Math.min(quality, 1.0);
  }

  extractUrlPattern(url) {
    try {
      const urlObj = new URL(url);
      return `${urlObj.hostname}${urlObj.pathname.replace(/\/[^\/]*$/, '/*')}`;
    } catch {
      return url;
    }
  }

  extractNeuralPattern(data) {
    return {
      platform: data.platform,
      outcome: data.outcome,
      duration: data.duration,
      errorType: data.error?.type,
      failureCategory: data.failureCategory,
      contextFactors: Object.keys(data.context || {}),
      riskScore: data.riskScore
    };
  }

  calculateEffectiveness(data) {
    if (data.outcome === 'success') {
      return Math.max(0.5, 1.0 - (data.duration / 30000)); // Higher effectiveness for faster responses
    } else {
      return Math.max(0.1, data.riskScore || 0.5); // Use risk score as effectiveness measure for failures
    }
  }

  calculateConfidence(data) {
    let confidence = 0.5;
    
    if (data.retryCount === 0) confidence += 0.2;
    if (data.duration < 5000) confidence += 0.1;
    if (data.contentQuality > 0.7) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  // Additional utility methods
  async ensureDirectoryStructure() {
    const dirs = [
      'neural-patterns',
      'failure-models', 
      'success-models',
      'neural-training',
      'exports'
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(path.join(this.config.dataPath, dir), { recursive: true });
    }
  }

  async loadExistingPatterns() {
    // Load existing patterns from storage
    // Implementation would read from filesystem
  }

  async loadFailureModels() {
    // Load existing failure models
    // Implementation would read from filesystem
  }

  async loadSuccessModels() {
    // Load existing success models
    // Implementation would read from filesystem
  }

  getRecentRequestCount(platform) {
    // Simplified implementation - would track actual request counts
    return 0;
  }

  getPlatformRateLimit(platform) {
    const limits = {
      'youtube.com': 100,
      'twitter.com': 50,
      'facebook.com': 30,
      'default': 60
    };
    return limits[platform] || limits['default'];
  }

  urlMatchesPattern(url, pattern) {
    // Simple pattern matching - could be enhanced with regex
    return url.includes(pattern.replace('/*', ''));
  }

  analyzeSimilarFailurePatterns(failureData) {
    // Analyze and emit warnings for similar failure patterns
    this.emit('patternAnalyzed', {
      type: 'failure-pattern-detected',
      platform: failureData.platform,
      category: failureData.failureCategory,
      recommendation: this.generateRecommendation(failureData)
    });
  }

  generateRecommendation(failureData) {
    const category = failureData.failureCategory;
    const recommendations = {
      'rate-limiting': 'Consider implementing exponential backoff and request queuing',
      'authentication': 'Check API credentials and authentication methods',
      'network': 'Implement retry logic with circuit breaker pattern',
      'content-parsing': 'Add fallback parsing strategies and content validation',
      'timeout': 'Adjust timeout values and implement request cancellation',
      'general': 'Review error handling and implement comprehensive logging'
    };
    
    return recommendations[category] || recommendations['general'];
  }

  getUptimeHours() {
    // Calculate uptime since initialization
    return ((Date.now() - this.initTime) / (1000 * 60 * 60));
  }

  calculatePredictionAccuracy() {
    // Calculate how accurate our failure predictions have been
    // This would be based on actual vs predicted outcomes
    return this.metrics.predictionAccuracy || 0.0;
  }
}

export default NLDTracker;