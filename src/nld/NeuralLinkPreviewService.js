/**
 * Neural Link Preview Service
 * Enhanced LinkPreviewService with NLD pattern tracking and predictive capabilities
 */

import { linkPreviewService } from '../services/LinkPreviewService.js';
import NLDTracker from './core/NLDTracker.js';
import FailurePatternAnalyzer from './patterns/FailurePatternAnalyzer.js';
import SelfHealingManager from './recovery/SelfHealingManager.js';
import AlertSystem from './monitoring/AlertSystem.js';
import ClaudeFlowIntegrator from './neural/ClaudeFlowIntegrator.js';
import { EventEmitter } from 'events';

export class NeuralLinkPreviewService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      enableNLDTracking: config.enableNLDTracking !== false,
      enablePredictiveModeling: config.enablePredictiveModeling !== false,
      enableSelfHealing: config.enableSelfHealing !== false,
      enableAlerting: config.enableAlerting !== false,
      enableClaudeFlowIntegration: config.enableClaudeFlowIntegration !== false,
      dataPath: config.dataPath || '/workspaces/agent-feed/.claude-flow/nld',
      ...config
    };

    // Initialize NLD components
    this.nldTracker = null;
    this.patternAnalyzer = null;
    this.healingManager = null;
    this.alertSystem = null;
    this.neuralIntegrator = null;
    
    // Service state
    this.isInitialized = false;
    this.requestStats = {
      total: 0,
      successful: 0,
      failed: 0,
      healed: 0,
      predicted: 0
    };

    this.initialize();
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Neural Link Preview Service...');
      
      // Initialize NLD Tracker
      if (this.config.enableNLDTracking) {
        this.nldTracker = new NLDTracker(this.config);
        await this.waitForInitialization(this.nldTracker);
      }
      
      // Initialize Pattern Analyzer
      this.patternAnalyzer = new FailurePatternAnalyzer(this.config);
      await this.waitForInitialization(this.patternAnalyzer);
      
      // Initialize Self-Healing Manager
      if (this.config.enableSelfHealing) {
        this.healingManager = new SelfHealingManager(this.config);
        await this.waitForInitialization(this.healingManager);
      }
      
      // Initialize Alert System
      if (this.config.enableAlerting) {
        this.alertSystem = new AlertSystem(this.config);
        await this.waitForInitialization(this.alertSystem);
      }
      
      // Initialize Claude Flow Integrator
      if (this.config.enableClaudeFlowIntegration) {
        this.neuralIntegrator = new ClaudeFlowIntegrator(this.config);
        await this.waitForInitialization(this.neuralIntegrator);
      }
      
      // Setup event handlers
      this.setupEventHandlers();
      
      this.isInitialized = true;
      console.log('✅ Neural Link Preview Service initialized successfully');
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Neural Link Preview Service initialization failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Enhanced link preview with NLD capabilities
   */
  async getLinkPreview(url, options = {}) {
    if (!this.isInitialized) {
      console.warn('⚠️ Service not fully initialized, falling back to basic service');
      return linkPreviewService.getLinkPreview(url);
    }

    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    try {
      this.requestStats.total++;
      
      // Start NLD tracking
      let trackingId = null;
      if (this.nldTracker) {
        trackingId = this.nldTracker.trackRequest(url, options);
      }
      
      // Get prediction if available
      let prediction = null;
      if (this.config.enablePredictiveModeling && this.neuralIntegrator) {
        prediction = await this.getPrediction(url, options);
        this.requestStats.predicted++;
      }
      
      // Check rate limiting
      if (this.healingManager) {
        const platform = this.extractPlatform(url);
        if (!this.healingManager.isRequestAllowed(platform)) {
          throw new Error(`Rate limited for platform: ${platform}`);
        }
      }
      
      // Execute request with monitoring
      const result = await this.executeWithMonitoring(url, options, prediction);
      
      // Record success
      const duration = Date.now() - startTime;
      this.recordSuccess(trackingId, result, duration, prediction);
      
      return result;
      
    } catch (error) {
      // Record failure and attempt recovery
      const duration = Date.now() - startTime;
      const recoveryResult = await this.handleFailure(url, error, {
        requestId,
        trackingId: this.nldTracker ? this.nldTracker.trackRequest(url, options) : null,
        duration,
        prediction,
        options
      });
      
      if (recoveryResult.success) {
        this.requestStats.healed++;
        return recoveryResult.result;
      } else {
        this.requestStats.failed++;
        throw error;
      }
    }
  }

  /**
   * Execute request with comprehensive monitoring
   */
  async executeWithMonitoring(url, options, prediction) {
    const startTime = Date.now();
    
    try {
      // Use prediction to adjust strategy
      const adjustedOptions = this.adjustOptionsBasedOnPrediction(options, prediction);
      
      // Execute with original service
      const result = await linkPreviewService.getLinkPreview(url, adjustedOptions);
      
      const duration = Date.now() - startTime;
      
      // Monitor performance
      if (this.alertSystem) {
        this.alertSystem.processDataPoint('success', this.extractPlatform(url), {
          duration,
          contentQuality: this.assessContentQuality(result),
          extractionMethod: result.extractionMethod || 'default',
          cacheHit: result.cacheHit || false,
          success: true
        });
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Monitor failure
      if (this.alertSystem) {
        this.alertSystem.processDataPoint('failure', this.extractPlatform(url), {
          errorType: this.classifyError(error),
          errorCode: error.code,
          httpStatus: this.extractHttpStatus(error),
          duration,
          success: false
        });
      }
      
      throw error;
    }
  }

  /**
   * Handle failure with pattern analysis and recovery
   */
  async handleFailure(url, error, context) {
    const platform = this.extractPlatform(url);
    
    try {
      // Create failure data
      const failureData = this.createFailureData(url, error, context);
      
      // Record failure in NLD tracker
      if (this.nldTracker && context.trackingId) {
        this.nldTracker.trackFailure(context.trackingId, error, {
          httpStatus: this.extractHttpStatus(error),
          networkError: this.isNetworkError(error),
          parseError: this.isParseError(error),
          timeoutError: this.isTimeoutError(error),
          rateLimited: this.isRateLimitError(error),
          authError: this.isAuthError(error)
        });
      }
      
      // Analyze failure pattern
      if (this.patternAnalyzer) {
        const patterns = this.patternAnalyzer.analyzeFailure(failureData);
        
        // Update neural patterns if available
        if (this.neuralIntegrator && patterns) {
          await this.neuralIntegrator.processNeuralPattern({
            type: 'failure',
            platform,
            errorType: this.classifyError(error),
            httpStatus: this.extractHttpStatus(error),
            timestamp: new Date().toISOString(),
            outcome: 'failure',
            patterns,
            ...failureData
          });
        }
      }
      
      // Attempt self-healing recovery
      if (this.healingManager) {
        console.log(`🔧 Attempting self-healing recovery for ${url}`);
        const recoveryResult = await this.healingManager.attemptRecovery(failureData);
        
        if (recoveryResult.success) {
          console.log(`✅ Recovery successful for ${url}`);
          return {
            success: true,
            result: recoveryResult.result,
            recoveryStrategy: recoveryResult.strategy
          };
        } else {
          console.log(`❌ Recovery failed for ${url}: ${recoveryResult.reason}`);
        }
        
        // Adapt rate limiting based on failure
        this.healingManager.adaptRateLimit(platform, failureData);
      }
      
      return { success: false, error };
      
    } catch (recoveryError) {
      console.error('❌ Error during failure handling:', recoveryError);
      return { success: false, error };
    }
  }

  /**
   * Record successful request
   */
  recordSuccess(trackingId, result, duration, prediction) {
    this.requestStats.successful++;
    
    // Record in NLD tracker
    if (this.nldTracker && trackingId) {
      this.nldTracker.trackSuccess(trackingId, result, {
        duration,
        responseSize: JSON.stringify(result).length,
        apiCalls: 1,
        cacheHit: result.cacheHit || false,
        extractionMethod: result.extractionMethod || 'html-parse'
      });
    }
    
    // Update neural patterns
    if (this.neuralIntegrator) {
      const platform = this.extractPlatformFromResult(result);
      this.neuralIntegrator.processNeuralPattern({
        type: 'success',
        platform,
        timestamp: new Date().toISOString(),
        outcome: 'success',
        duration,
        contentQuality: this.assessContentQuality(result),
        prediction
      });
    }
  }

  /**
   * Get prediction for request
   */
  async getPrediction(url, options) {
    if (!this.neuralIntegrator) return null;
    
    try {
      const requestData = {
        platform: this.extractPlatform(url),
        hasAuth: options.hasAuth || false,
        useProxy: options.useProxy || false,
        retryCount: options.retryCount || 0,
        timeout: options.timeout || 15000
      };
      
      return await this.neuralIntegrator.getPrediction(requestData);
    } catch (error) {
      console.warn('⚠️ Prediction failed:', error);
      return null;
    }
  }

  /**
   * Adjust request options based on prediction
   */
  adjustOptionsBasedOnPrediction(options, prediction) {
    if (!prediction) return options;
    
    const adjusted = { ...options };
    
    // Adjust timeout based on predicted duration
    if (prediction.estimatedDuration) {
      adjusted.timeout = Math.max(
        prediction.estimatedDuration * 1.5,
        options.timeout || 15000
      );
    }
    
    // Use fallback strategy if high failure probability
    if (prediction.failureProbability > 0.7) {
      adjusted.useFallback = true;
      adjusted.strategy = 'conservative';
    }
    
    // Add recommended action
    if (prediction.recommendedAction) {
      adjusted.recommendedAction = prediction.recommendedAction;
    }
    
    return adjusted;
  }

  /**
   * Get comprehensive service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      statistics: this.requestStats,
      components: {
        nldTracker: this.nldTracker?.getStatus() || null,
        patternAnalyzer: this.patternAnalyzer ? 'active' : 'disabled',
        healingManager: this.healingManager?.getHealthStatus() || null,
        alertSystem: this.alertSystem?.getAlertStatus() || null,
        neuralIntegrator: this.neuralIntegrator?.getNeuralStatus() || null
      },
      configuration: this.config
    };
  }

  /**
   * Export all NLD data for analysis
   */
  async exportNLDData() {
    const exports = {};
    
    try {
      if (this.nldTracker) {
        exports.tracker = await this.nldTracker.exportNeuralTrainingData();
      }
      
      if (this.patternAnalyzer) {
        exports.patterns = await this.patternAnalyzer.exportPatternData();
      }
      
      if (this.healingManager) {
        exports.healing = await this.healingManager.exportHealingData();
      }
      
      if (this.alertSystem) {
        exports.alerts = await this.alertSystem.exportAlertData();
      }
      
      if (this.neuralIntegrator) {
        exports.neural = await this.neuralIntegrator.exportNeuralData();
      }
      
      console.log('📊 NLD data exported successfully');
      return exports;
      
    } catch (error) {
      console.error('❌ NLD data export failed:', error);
      throw error;
    }
  }

  // Utility methods
  async waitForInitialization(component) {
    return new Promise((resolve, reject) => {
      if (component.isInitialized) {
        resolve();
        return;
      }
      
      const timeout = setTimeout(() => {
        reject(new Error('Component initialization timeout'));
      }, 30000);
      
      component.once('initialized', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      component.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  setupEventHandlers() {
    // Handle pattern analyzer events
    if (this.patternAnalyzer) {
      this.patternAnalyzer.on('patternAnalyzed', (analysis) => {
        this.emit('patternDetected', analysis);
      });
    }
    
    // Handle healing manager events
    if (this.healingManager) {
      this.healingManager.on('recoveryAttempt', (attempt) => {
        this.emit('recoveryAttempted', attempt);
      });
      
      this.healingManager.on('circuitBreakerTripped', (event) => {
        this.emit('circuitBreakerTripped', event);
      });
    }
    
    // Handle alert system events
    if (this.alertSystem) {
      this.alertSystem.on('alertSent', (alert) => {
        this.emit('alertSent', alert);
      });
    }
    
    // Handle neural integrator events
    if (this.neuralIntegrator) {
      this.neuralIntegrator.on('patternProcessed', (pattern) => {
        this.emit('neuralPatternProcessed', pattern);
      });
    }
  }

  generateRequestId() {
    return `nreq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  extractPlatform(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return 'unknown';
    }
  }

  extractPlatformFromResult(result) {
    return result.site_name?.toLowerCase() || 'unknown';
  }

  classifyError(error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') return 'network';
    if (error.code === 'ETIMEDOUT') return 'timeout';
    if (error.message?.includes('429')) return 'rate-limit';
    if (error.message?.includes('403') || error.message?.includes('401')) return 'auth';
    if (error.message?.includes('parse')) return 'parsing';
    return 'unknown';
  }

  extractHttpStatus(error) {
    const match = error.message?.match(/HTTP (\d{3})/);
    return match ? parseInt(match[1]) : null;
  }

  isNetworkError(error) {
    return ['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET'].includes(error.code);
  }

  isParseError(error) {
    return error.message?.includes('parse') || error.message?.includes('JSON');
  }

  isTimeoutError(error) {
    return error.code === 'ETIMEDOUT' || error.message?.includes('timeout');
  }

  isRateLimitError(error) {
    return error.message?.includes('429') || error.message?.includes('rate limit');
  }

  isAuthError(error) {
    return error.message?.includes('401') || error.message?.includes('403');
  }

  assessContentQuality(result) {
    let quality = 0.5;
    
    if (result.title && result.title.length > 10) quality += 0.2;
    if (result.description && result.description.length > 20) quality += 0.2;
    if (result.image) quality += 0.1;
    if (result.video) quality += 0.1;
    if (!result.error && !result.fallback) quality += 0.1;
    
    return Math.min(quality, 1.0);
  }

  createFailureData(url, error, context) {
    return {
      requestId: context.requestId,
      url,
      platform: this.extractPlatform(url),
      timestamp: new Date().toISOString(),
      duration: context.duration,
      error: {
        message: error.message,
        code: error.code,
        type: this.classifyError(error)
      },
      context: {
        httpStatus: this.extractHttpStatus(error),
        networkError: this.isNetworkError(error),
        parseError: this.isParseError(error),
        timeoutError: this.isTimeoutError(error),
        rateLimited: this.isRateLimitError(error),
        authError: this.isAuthError(error),
        recoveryAttempted: false,
        fallbackUsed: false
      },
      failureCategory: this.classifyError(error),
      prediction: context.prediction,
      options: context.options
    };
  }
}

// Create singleton instance
const neuralLinkPreviewService = new NeuralLinkPreviewService({
  enableNLDTracking: true,
  enablePredictiveModeling: true,
  enableSelfHealing: true,
  enableAlerting: true,
  enableClaudeFlowIntegration: true
});

export { neuralLinkPreviewService };
export default NeuralLinkPreviewService;