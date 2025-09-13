/**
 * NLD Pattern Detection Service
 * Real-time monitoring and prevention of known failure patterns
 * Integrates with existing NLD patterns to provide proactive error prevention
 */

import fs from 'fs/promises';
import { EventEmitter } from 'events';
import pageNotFoundPrevention from './page-not-found-prevention.js';

class NLDPatternDetectionService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.patterns = new Map();
    this.monitoring = options.monitoring !== false;
    this.autoFix = options.autoFix !== false;
    this.logPath = options.logPath || '/workspaces/agent-feed/src/nld-patterns/detection-log.jsonl';
    this.initialized = false;
    
    // Initialize statistics FIRST
    this.stats = {
      detections: 0,
      preventions: 0,
      autoFixes: 0,
      failures: 0,
      patterns: {}
    };
    
    // Pattern registry - after stats initialization
    this.registerPattern(pageNotFoundPrevention);
    
    console.log('🔍 NLD Pattern Detection Service initializing...');
  }
  
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Ensure log directory exists
      await fs.mkdir('/workspaces/agent-feed/src/nld-patterns', { recursive: true });
      
      // Load existing pattern statistics
      await this.loadStats();
      
      this.initialized = true;
      console.log('✅ NLD Pattern Detection Service initialized');
      console.log(`📊 Loaded ${this.patterns.size} patterns`);
      
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize NLD Pattern Detection Service:', error);
      throw error;
    }
  }
  
  // Register a new pattern for detection
  registerPattern(pattern) {
    if (!pattern.patternId || !pattern.detection) {
      throw new Error('Invalid pattern: must have patternId and detection');
    }
    
    this.patterns.set(pattern.patternId, pattern);
    
    // Ensure stats.patterns exists
    if (!this.stats.patterns) {
      this.stats.patterns = {};
    }
    
    if (!this.stats.patterns[pattern.patternId]) {
      this.stats.patterns[pattern.patternId] = {
        detections: 0,
        preventions: 0,
        autoFixes: 0,
        failures: 0
      };
    }
    
    console.log(`📦 Registered pattern: ${pattern.patternId}`);
  }
  
  // Detect pattern matches from error context
  async detectPattern(errorContext) {
    if (!this.initialized) await this.initialize();
    
    const detections = [];
    
    for (const [patternId, pattern] of this.patterns) {
      const match = await this.checkPatternMatch(pattern, errorContext);
      if (match.isMatch) {
        detections.push({
          patternId,
          pattern,
          confidence: match.confidence,
          context: errorContext,
          triggers: match.triggers,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    if (detections.length > 0) {
      this.stats.detections += detections.length;
      
      for (const detection of detections) {
        this.stats.patterns[detection.patternId].detections++;
        await this.handleDetection(detection);
      }
    }
    
    return detections;
  }
  
  // Check if a pattern matches the given context
  async checkPatternMatch(pattern, context) {
    const match = {
      isMatch: false,
      confidence: 0,
      triggers: []
    };
    
    // Check error message patterns
    if (pattern.detection.errorMessage && context.error) {
      const errorMatch = pattern.detection.errorMessage.test(context.error.message);
      if (errorMatch) {
        match.isMatch = true;
        match.confidence += 0.4;
        match.triggers.push('error_message_match');
      }
    }
    
    // Check HTTP status patterns
    if (pattern.detection.httpStatus && context.response) {
      if (context.response.status === pattern.detection.httpStatus) {
        match.isMatch = true;
        match.confidence += 0.3;
        match.triggers.push('http_status_match');
      }
    }
    
    // Check URL patterns
    if (pattern.detection.urlPattern && context.url) {
      if (pattern.detection.urlPattern.test(context.url)) {
        match.isMatch = true;
        match.confidence += 0.2;
        match.triggers.push('url_pattern_match');
      }
    }
    
    // Check API response patterns
    if (pattern.detection.apiResponse && context.response) {
      const apiMatch = this.checkApiResponseMatch(pattern.detection.apiResponse, context.response.data);
      if (apiMatch) {
        match.isMatch = true;
        match.confidence += 0.3;
        match.triggers.push('api_response_match');
      }
    }
    
    // Check context patterns
    if (pattern.detection.contextPatterns && context.description) {
      for (const contextPattern of pattern.detection.contextPatterns) {
        if (context.description.includes(contextPattern)) {
          match.isMatch = true;
          match.confidence += 0.1;
          match.triggers.push('context_pattern_match');
        }
      }
    }
    
    // Normalize confidence score
    match.confidence = Math.min(match.confidence, 1.0);
    
    return match;
  }
  
  // Check if API response matches expected pattern
  checkApiResponseMatch(expected, actual) {
    if (typeof expected !== 'object' || typeof actual !== 'object') {
      return expected === actual;
    }
    
    return Object.keys(expected).every(key => {
      if (typeof expected[key] === 'object') {
        return this.checkApiResponseMatch(expected[key], actual[key]);
      }
      return expected[key] === actual[key];
    });
  }
  
  // Handle a detected pattern
  async handleDetection(detection) {
    console.log(`🚨 NLD: Pattern detected - ${detection.patternId} (confidence: ${detection.confidence.toFixed(2)})`);
    
    // Log the detection
    await this.logDetection(detection);
    
    // Emit detection event
    this.emit('patternDetected', detection);
    
    // Attempt prevention if auto-fix is enabled
    if (this.autoFix && detection.pattern.autoFix && detection.pattern.autoFix.enabled) {
      try {
        const preventionResult = await this.attemptPrevention(detection);
        if (preventionResult.success) {
          this.stats.preventions++;
          this.stats.patterns[detection.patternId].preventions++;
          
          console.log(`✅ NLD: Successfully prevented pattern: ${detection.patternId}`);
          this.emit('patternPrevented', { detection, result: preventionResult });
        } else {
          this.stats.failures++;
          this.stats.patterns[detection.patternId].failures++;
          
          console.warn(`⚠️ NLD: Failed to prevent pattern: ${detection.patternId}`, preventionResult.error);
          this.emit('preventionFailed', { detection, result: preventionResult });
        }
      } catch (error) {
        this.stats.failures++;
        this.stats.patterns[detection.patternId].failures++;
        
        console.error(`❌ NLD: Error during prevention attempt:`, error);
        this.emit('preventionError', { detection, error });
      }
    }
  }
  
  // Attempt to prevent the detected pattern
  async attemptPrevention(detection) {
    const { pattern, context } = detection;
    
    // Run pattern-specific diagnosis
    let diagnosis = null;
    if (pattern.diagnosePageNotFound) {
      diagnosis = await pattern.diagnosePageNotFound(
        context.agentId,
        context.pageId,
        context.db
      );
    }
    
    // If auto-fix is available and applicable
    if (diagnosis && diagnosis.canAutoFix) {
      try {
        const fixResult = await diagnosis.autoFix();
        
        if (fixResult.success) {
          this.stats.autoFixes++;
          this.stats.patterns[detection.patternId].autoFixes++;
          
          // Validate the fix
          if (pattern.autoFix.validateAfterFix) {
            const validation = await pattern.autoFix.validateAfterFix(
              context.agentId,
              context.pageId
            );
            
            return {
              success: validation.allChecksPass,
              method: 'auto_fix',
              fixes: fixResult.fixes,
              validation: validation,
              diagnosis: diagnosis
            };
          }
          
          return {
            success: true,
            method: 'auto_fix',
            fixes: fixResult.fixes,
            diagnosis: diagnosis
          };
        } else {
          return {
            success: false,
            method: 'auto_fix',
            error: fixResult.message,
            diagnosis: diagnosis
          };
        }
      } catch (error) {
        return {
          success: false,
          method: 'auto_fix',
          error: error.message,
          diagnosis: diagnosis
        };
      }
    }
    
    // If no auto-fix is available, try pattern-specific prevention methods
    if (pattern.prevention) {
      try {
        const preventionMethods = Object.keys(pattern.prevention);
        const preventionResults = [];
        
        for (const method of preventionMethods) {
          if (typeof pattern.prevention[method] === 'function') {
            try {
              const result = await pattern.prevention[method](context.agentId, context.pageId, context);
              preventionResults.push({ method, result, success: true });
            } catch (error) {
              preventionResults.push({ method, result: null, success: false, error: error.message });
            }
          }
        }
        
        const successfulPreventions = preventionResults.filter(r => r.success);
        
        return {
          success: successfulPreventions.length > 0,
          method: 'prevention_methods',
          results: preventionResults,
          diagnosis: diagnosis
        };
      } catch (error) {
        return {
          success: false,
          method: 'prevention_methods',
          error: error.message,
          diagnosis: diagnosis
        };
      }
    }
    
    return {
      success: false,
      method: 'none_available',
      message: 'No prevention methods available for this pattern',
      diagnosis: diagnosis
    };
  }
  
  // Log detection for analysis and neural training
  async logDetection(detection) {
    const logEntry = {
      id: `nld-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: detection.timestamp,
      type: 'pattern_detection',
      pattern: detection.patternId,
      confidence: detection.confidence,
      triggers: detection.triggers,
      context: {
        url: detection.context.url,
        agentId: detection.context.agentId,
        pageId: detection.context.pageId,
        error: detection.context.error ? {
          message: detection.context.error.message,
          stack: detection.context.error.stack?.split('\n').slice(0, 5) // Limit stack trace
        } : null
      },
      metadata: {
        userAgent: detection.context.userAgent,
        source: 'nld-pattern-detection',
        version: '1.0.0'
      }
    };
    
    try {
      await fs.appendFile(this.logPath, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('❌ Failed to log detection:', error);
    }
  }
  
  // Load statistics from previous runs
  async loadStats() {
    const statsPath = '/workspaces/agent-feed/src/nld-patterns/detection-stats.json';
    
    try {
      const statsData = await fs.readFile(statsPath, 'utf8');
      const loadedStats = JSON.parse(statsData);
      
      // Merge with current stats
      this.stats = {
        ...this.stats,
        ...loadedStats,
        patterns: {
          ...this.stats.patterns,
          ...loadedStats.patterns
        }
      };
      
      console.log('📊 NLD: Loaded detection statistics');
    } catch (error) {
      // File doesn't exist or is corrupted, use default stats
      console.log('📊 NLD: Using default statistics (no existing file found)');
    }
  }
  
  // Save statistics
  async saveStats() {
    const statsPath = '/workspaces/agent-feed/src/nld-patterns/detection-stats.json';
    
    try {
      await fs.writeFile(statsPath, JSON.stringify(this.stats, null, 2));
    } catch (error) {
      console.error('❌ Failed to save statistics:', error);
    }
  }
  
  // Get current statistics
  getStats() {
    return {
      ...this.stats,
      uptime: process.uptime(),
      activePatterns: this.patterns.size,
      lastUpdate: new Date().toISOString()
    };
  }
  
  // Export neural training data
  async exportNeuralTrainingData() {
    const exportData = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      service: 'nld-pattern-detection',
      statistics: this.getStats(),
      patterns: []
    };
    
    // Export training data from each registered pattern
    for (const [patternId, pattern] of this.patterns) {
      if (pattern.neuralTraining && pattern.neuralTraining.exportTrainingData) {
        try {
          const patternTrainingData = await pattern.neuralTraining.exportTrainingData();
          exportData.patterns.push({
            patternId,
            trainingData: patternTrainingData
          });
        } catch (error) {
          console.warn(`⚠️ Failed to export training data for pattern ${patternId}:`, error);
        }
      }
    }
    
    const exportPath = '/workspaces/agent-feed/src/nld-patterns/neural-training-export.json';
    
    try {
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
      console.log(`🧠 NLD: Neural training data exported to: ${exportPath}`);
      return { success: true, path: exportPath, data: exportData };
    } catch (error) {
      console.error(`❌ NLD: Failed to export neural training data:`, error);
      return { success: false, error: error.message };
    }
  }
  
  // Cleanup and shutdown
  async shutdown() {
    console.log('🛑 NLD: Shutting down Pattern Detection Service...');
    
    // Save final statistics
    await this.saveStats();
    
    // Export final neural training data
    await this.exportNeuralTrainingData();
    
    this.emit('shutdown');
    console.log('✅ NLD: Pattern Detection Service shut down gracefully');
  }
}

// Create singleton instance
export const nldPatternDetectionService = new NLDPatternDetectionService();

// Initialize on import
nldPatternDetectionService.initialize().catch(error => {
  console.error('❌ Failed to initialize NLD Pattern Detection Service:', error);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await nldPatternDetectionService.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await nldPatternDetectionService.shutdown();
  process.exit(0);
});

export default nldPatternDetectionService;