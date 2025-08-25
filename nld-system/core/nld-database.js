/**
 * Neural Learning Database (NLD) Core System
 * Captures failure patterns and builds learning intelligence for Claude instance architecture
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class NeuralLearningDatabase {
  constructor(config = {}) {
    this.dbPath = config.dbPath || './nld-data';
    this.maxRecords = config.maxRecords || 10000;
    this.initialized = false;
    
    // In-memory cache for fast pattern matching
    this.failurePatterns = new Map();
    this.successPatterns = new Map();
    this.neuralModels = new Map();
    
    // Performance metrics
    this.metrics = {
      totalFailures: 0,
      patternMatches: 0,
      correctPredictions: 0,
      falsePositives: 0,
      learningAccuracy: 0
    };
  }

  async initialize() {
    try {
      await fs.mkdir(this.dbPath, { recursive: true });
      await fs.mkdir(path.join(this.dbPath, 'patterns'), { recursive: true });
      await fs.mkdir(path.join(this.dbPath, 'models'), { recursive: true });
      await fs.mkdir(path.join(this.dbPath, 'reports'), { recursive: true });
      
      await this.loadExistingPatterns();
      await this.loadNeuralModels();
      
      this.initialized = true;
      console.log('[NLD] Neural Learning Database initialized');
    } catch (error) {
      console.error('[NLD] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Store failure pattern with complete context
   */
  async storeFailurePattern(failureData) {
    if (!this.initialized) await this.initialize();

    const pattern = {
      id: this.generatePatternId(failureData),
      timestamp: Date.now(),
      type: failureData.type || 'unknown',
      category: this.classifyFailure(failureData),
      context: {
        taskDescription: failureData.taskDescription,
        claudeConfidence: failureData.claudeConfidence,
        actualOutcome: failureData.actualOutcome,
        userFeedback: failureData.userFeedback,
        errorSignature: this.extractErrorSignature(failureData),
        environmentContext: failureData.environmentContext
      },
      solution: failureData.solution || null,
      effectiveness: this.calculateEffectiveness(failureData),
      neuralFeatures: this.extractNeuralFeatures(failureData),
      relatedPatterns: []
    };

    // Find related patterns using neural similarity
    pattern.relatedPatterns = await this.findRelatedPatterns(pattern);

    // Store pattern
    this.failurePatterns.set(pattern.id, pattern);
    await this.persistPattern(pattern);

    // Update neural models
    await this.updateNeuralModel(pattern);

    this.metrics.totalFailures++;
    return pattern.id;
  }

  /**
   * Classify failure types for pattern recognition
   */
  classifyFailure(failureData) {
    const classifications = {
      'PROCESS_MANAGEMENT': [
        'pty spawn', 'process kill', 'child process', 'pid', 'signal'
      ],
      'COMMUNICATION_PROTOCOL': [
        'websocket', 'socket.io', 'message parsing', 'protocol mismatch', 'engine.io'
      ],
      'RESOURCE_ALLOCATION': [
        'memory', 'cpu', 'file descriptors', 'connection limit', 'timeout'
      ],
      'USER_INTERACTION': [
        'input handling', 'terminal resize', 'cursor position', 'display', 'rendering'
      ],
      'TERMINAL_HANG': [
        'hang', 'freeze', 'unresponsive', 'claude command', 'interactive mode'
      ],
      'ARCHITECTURE_TRANSITION': [
        'instance creation', 'separation', 'dedicated instance', 'isolation'
      ]
    };

    const errorText = JSON.stringify(failureData).toLowerCase();
    
    for (const [category, keywords] of Object.entries(classifications)) {
      if (keywords.some(keyword => errorText.includes(keyword))) {
        return category;
      }
    }
    
    return 'UNCLASSIFIED';
  }

  /**
   * Extract neural features for pattern matching
   */
  extractNeuralFeatures(failureData) {
    return {
      // Task complexity indicators
      taskComplexity: this.assessTaskComplexity(failureData.taskDescription),
      
      // Error signature vectors
      errorVector: this.createErrorVector(failureData),
      
      // Context features
      environmentFeatures: this.extractEnvironmentFeatures(failureData),
      
      // Temporal features
      timeFeatures: this.extractTimeFeatures(failureData),
      
      // Communication pattern features
      communicationFeatures: this.extractCommunicationFeatures(failureData)
    };
  }

  /**
   * Create error signature vector for similarity matching
   */
  createErrorVector(failureData) {
    const errorText = JSON.stringify(failureData).toLowerCase();
    const features = [];
    
    // Protocol-related features
    features.push(errorText.includes('socket.io') ? 1 : 0);
    features.push(errorText.includes('websocket') ? 1 : 0);
    features.push(errorText.includes('engine.io') ? 1 : 0);
    features.push(errorText.includes('json parse') ? 1 : 0);
    
    // Terminal-related features
    features.push(errorText.includes('pty') ? 1 : 0);
    features.push(errorText.includes('terminal') ? 1 : 0);
    features.push(errorText.includes('hang') ? 1 : 0);
    features.push(errorText.includes('timeout') ? 1 : 0);
    
    // Claude-specific features
    features.push(errorText.includes('claude') ? 1 : 0);
    features.push(errorText.includes('instance') ? 1 : 0);
    features.push(errorText.includes('dedicated') ? 1 : 0);
    
    return features;
  }

  /**
   * Calculate solution effectiveness score
   */
  calculateEffectiveness(failureData) {
    let score = 0.5; // Base score
    
    // User success feedback
    if (failureData.userFeedback) {
      if (failureData.userFeedback.includes('worked') || 
          failureData.userFeedback.includes('fixed')) {
        score += 0.3;
      }
      if (failureData.userFeedback.includes('failed') || 
          failureData.userFeedback.includes('broken')) {
        score -= 0.3;
      }
    }
    
    // Claude confidence vs actual outcome
    if (failureData.claudeConfidence && failureData.actualOutcome) {
      const confidenceDiff = Math.abs(failureData.claudeConfidence - failureData.actualOutcome);
      score -= confidenceDiff * 0.2;
    }
    
    // TDD usage correlation
    if (failureData.tddUsed) {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Find patterns similar to the current one using neural similarity
   */
  async findRelatedPatterns(pattern) {
    const similarities = [];
    
    for (const [id, existingPattern] of this.failurePatterns) {
      if (id === pattern.id) continue;
      
      const similarity = this.calculatePatternSimilarity(pattern, existingPattern);
      if (similarity > 0.7) {
        similarities.push({ id, similarity });
      }
    }
    
    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  /**
   * Calculate similarity between two patterns using cosine similarity
   */
  calculatePatternSimilarity(pattern1, pattern2) {
    const v1 = pattern1.neuralFeatures.errorVector;
    const v2 = pattern2.neuralFeatures.errorVector;
    
    if (!v1 || !v2 || v1.length !== v2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      norm1 += v1[i] * v1[i];
      norm2 += v2[i] * v2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Predict failure probability for a given scenario
   */
  async predictFailureProbability(scenario) {
    if (!this.initialized) await this.initialize();
    
    const features = this.extractNeuralFeatures(scenario);
    let probability = 0;
    let matchingPatterns = 0;
    
    for (const pattern of this.failurePatterns.values()) {
      const similarity = this.calculatePatternSimilarity({ neuralFeatures: features }, pattern);
      
      if (similarity > 0.5) {
        probability += (1 - pattern.effectiveness) * similarity;
        matchingPatterns++;
      }
    }
    
    return matchingPatterns > 0 ? probability / matchingPatterns : 0.1; // Default low probability
  }

  /**
   * Generate automated fix suggestions based on learned patterns
   */
  async generateFixSuggestions(scenario) {
    const relatedPatterns = await this.findSimilarFailures(scenario);
    const suggestions = [];
    
    for (const pattern of relatedPatterns) {
      if (pattern.solution && pattern.effectiveness > 0.7) {
        suggestions.push({
          solution: pattern.solution,
          confidence: pattern.effectiveness,
          similarityScore: pattern.similarity,
          category: pattern.category,
          historicalSuccess: this.getHistoricalSuccess(pattern.solution)
        });
      }
    }
    
    // Sort by confidence and historical success
    return suggestions.sort((a, b) => 
      (b.confidence * b.historicalSuccess) - (a.confidence * a.historicalSuccess)
    );
  }

  /**
   * Update neural model with new pattern data
   */
  async updateNeuralModel(pattern) {
    const modelKey = pattern.category;
    
    if (!this.neuralModels.has(modelKey)) {
      this.neuralModels.set(modelKey, {
        patterns: [],
        weights: new Array(pattern.neuralFeatures.errorVector.length).fill(0.1),
        accuracy: 0,
        lastUpdated: Date.now()
      });
    }
    
    const model = this.neuralModels.get(modelKey);
    model.patterns.push(pattern);
    
    // Simple weight adjustment based on effectiveness
    if (pattern.effectiveness > 0.7) {
      for (let i = 0; i < model.weights.length; i++) {
        model.weights[i] += pattern.neuralFeatures.errorVector[i] * 0.01;
      }
    }
    
    model.lastUpdated = Date.now();
    await this.persistNeuralModel(modelKey, model);
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateAnalyticsReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overview: {
        totalFailures: this.metrics.totalFailures,
        totalPatterns: this.failurePatterns.size,
        learningAccuracy: this.metrics.learningAccuracy,
        modelCount: this.neuralModels.size
      },
      categoryBreakdown: this.getCategoryBreakdown(),
      topFailurePatterns: await this.getTopFailurePatterns(),
      solutionEffectiveness: this.getSolutionEffectiveness(),
      neuralModelStatus: this.getNeuralModelStatus(),
      recommendations: await this.generateSystemRecommendations()
    };
    
    await this.persistReport('analytics', report);
    return report;
  }

  /**
   * Persist pattern to disk
   */
  async persistPattern(pattern) {
    const filename = `pattern_${pattern.id}.json`;
    const filepath = path.join(this.dbPath, 'patterns', filename);
    await fs.writeFile(filepath, JSON.stringify(pattern, null, 2));
  }

  /**
   * Load existing patterns from disk
   */
  async loadExistingPatterns() {
    try {
      const patternsDir = path.join(this.dbPath, 'patterns');
      const files = await fs.readdir(patternsDir).catch(() => []);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(patternsDir, file);
          const data = await fs.readFile(filepath, 'utf8');
          const pattern = JSON.parse(data);
          this.failurePatterns.set(pattern.id, pattern);
        }
      }
      
      console.log(`[NLD] Loaded ${this.failurePatterns.size} existing patterns`);
    } catch (error) {
      console.warn('[NLD] Could not load existing patterns:', error);
    }
  }

  /**
   * Generate unique pattern ID
   */
  generatePatternId(failureData) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify({
      type: failureData.type,
      taskDescription: failureData.taskDescription,
      timestamp: Math.floor(Date.now() / 1000 / 60) // Minute precision
    }));
    return hash.digest('hex').substring(0, 16);
  }

  // Helper methods for feature extraction
  assessTaskComplexity(description) {
    if (!description) return 0;
    
    const complexityIndicators = [
      'implement', 'create', 'build', 'system', 'architecture',
      'integration', 'database', 'api', 'multiple', 'complex'
    ];
    
    const words = description.toLowerCase().split(/\s+/);
    const matches = words.filter(word => 
      complexityIndicators.some(indicator => word.includes(indicator))
    );
    
    return Math.min(matches.length / words.length, 1);
  }

  extractEnvironmentFeatures(failureData) {
    const env = failureData.environmentContext || {};
    return {
      platform: env.platform === 'linux' ? 1 : 0,
      hasDocker: env.hasDocker ? 1 : 0,
      nodeVersion: this.normalizeVersion(env.nodeVersion),
      memoryUsage: env.memoryUsage ? env.memoryUsage / 1000000 : 0 // MB
    };
  }

  normalizeVersion(version) {
    if (!version) return 0;
    const match = version.match(/(\d+)\.(\d+)/);
    return match ? parseInt(match[1]) + parseInt(match[2]) / 100 : 0;
  }

  extractTimeFeatures(failureData) {
    const now = new Date();
    return {
      hourOfDay: now.getHours() / 24,
      dayOfWeek: now.getDay() / 7,
      monthOfYear: now.getMonth() / 12
    };
  }

  extractCommunicationFeatures(failureData) {
    const errorText = JSON.stringify(failureData).toLowerCase();
    return {
      hasWebSocketError: errorText.includes('websocket') ? 1 : 0,
      hasSocketIOError: errorText.includes('socket.io') ? 1 : 0,
      hasParsingError: errorText.includes('parse') || errorText.includes('json') ? 1 : 0,
      hasConnectionError: errorText.includes('connection') || errorText.includes('connect') ? 1 : 0
    };
  }

  // Analytics helper methods
  getCategoryBreakdown() {
    const breakdown = {};
    for (const pattern of this.failurePatterns.values()) {
      breakdown[pattern.category] = (breakdown[pattern.category] || 0) + 1;
    }
    return breakdown;
  }

  async getTopFailurePatterns() {
    const patterns = Array.from(this.failurePatterns.values())
      .sort((a, b) => b.relatedPatterns.length - a.relatedPatterns.length)
      .slice(0, 10);
    
    return patterns.map(p => ({
      id: p.id,
      category: p.category,
      occurrences: p.relatedPatterns.length + 1,
      effectiveness: p.effectiveness
    }));
  }

  getSolutionEffectiveness() {
    const solutions = {};
    for (const pattern of this.failurePatterns.values()) {
      if (pattern.solution) {
        const key = pattern.solution.approach || 'unknown';
        if (!solutions[key]) {
          solutions[key] = { count: 0, totalEffectiveness: 0 };
        }
        solutions[key].count++;
        solutions[key].totalEffectiveness += pattern.effectiveness;
      }
    }
    
    for (const [key, data] of Object.entries(solutions)) {
      data.averageEffectiveness = data.totalEffectiveness / data.count;
    }
    
    return solutions;
  }

  getNeuralModelStatus() {
    const status = {};
    for (const [category, model] of this.neuralModels) {
      status[category] = {
        patternCount: model.patterns.length,
        accuracy: model.accuracy,
        lastUpdated: new Date(model.lastUpdated).toISOString()
      };
    }
    return status;
  }

  async generateSystemRecommendations() {
    const recommendations = [];
    
    // Analyze most common failure categories
    const breakdown = this.getCategoryBreakdown();
    const topCategory = Object.entries(breakdown)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCategory && topCategory[1] > 5) {
      recommendations.push({
        priority: 'HIGH',
        category: topCategory[0],
        message: `High frequency of ${topCategory[0]} failures (${topCategory[1]} occurrences)`,
        action: 'Review and strengthen patterns in this category'
      });
    }
    
    // Check learning accuracy
    if (this.metrics.learningAccuracy < 0.7) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'LEARNING',
        message: `Learning accuracy below threshold (${(this.metrics.learningAccuracy * 100).toFixed(1)}%)`,
        action: 'Increase training data diversity and pattern validation'
      });
    }
    
    return recommendations;
  }

  async persistReport(type, report) {
    const filename = `${type}_${Date.now()}.json`;
    const filepath = path.join(this.dbPath, 'reports', filename);
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
  }

  async persistNeuralModel(modelKey, model) {
    const filename = `model_${modelKey}.json`;
    const filepath = path.join(this.dbPath, 'models', filename);
    await fs.writeFile(filepath, JSON.stringify(model, null, 2));
  }

  async loadNeuralModels() {
    try {
      const modelsDir = path.join(this.dbPath, 'models');
      const files = await fs.readdir(modelsDir).catch(() => []);
      
      for (const file of files) {
        if (file.endsWith('.json') && file.startsWith('model_')) {
          const filepath = path.join(modelsDir, file);
          const data = await fs.readFile(filepath, 'utf8');
          const model = JSON.parse(data);
          const key = file.replace('model_', '').replace('.json', '');
          this.neuralModels.set(key, model);
        }
      }
      
      console.log(`[NLD] Loaded ${this.neuralModels.size} neural models`);
    } catch (error) {
      console.warn('[NLD] Could not load neural models:', error);
    }
  }

  // Additional utility methods
  async findSimilarFailures(scenario) {
    const features = this.extractNeuralFeatures(scenario);
    const similar = [];
    
    for (const pattern of this.failurePatterns.values()) {
      const similarity = this.calculatePatternSimilarity({ neuralFeatures: features }, pattern);
      if (similarity > 0.6) {
        similar.push({ ...pattern, similarity });
      }
    }
    
    return similar.sort((a, b) => b.similarity - a.similarity);
  }

  getHistoricalSuccess(solution) {
    let successes = 0;
    let total = 0;
    
    for (const pattern of this.failurePatterns.values()) {
      if (pattern.solution && pattern.solution.approach === solution.approach) {
        total++;
        if (pattern.effectiveness > 0.7) successes++;
      }
    }
    
    return total > 0 ? successes / total : 0.5;
  }

  extractErrorSignature(failureData) {
    const signature = {
      errorType: failureData.type,
      keywords: [],
      stackTrace: failureData.stackTrace || null,
      errorCode: failureData.errorCode || null
    };
    
    const text = JSON.stringify(failureData).toLowerCase();
    const keywords = [
      'websocket', 'socket.io', 'pty', 'terminal', 'hang', 'timeout',
      'parse', 'json', 'protocol', 'connection', 'claude', 'instance'
    ];
    
    signature.keywords = keywords.filter(keyword => text.includes(keyword));
    
    return signature;
  }
}

module.exports = NeuralLearningDatabase;