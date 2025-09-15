/**
 * Neural Learning Database (NLD) - Failure Pattern Detector
 * Automatically detects and classifies test failure patterns using ML approaches
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FailurePatternDetector {
  constructor(options = {}) {
    this.dbPath = options.dbPath || path.join(__dirname, 'test-learning-database.json');
    this.confidenceThreshold = options.confidenceThreshold || 0.7;
    this.patternCache = new Map();
    this.learningHistory = [];

    // Neural pattern weights for different failure types
    this.neuralWeights = {
      apiFailure: {
        keywords: ['fetch', 'api', 'endpoint', 'request', 'response', 'status'],
        weight: 0.8,
        patterns: [/fetch.*failed/i, /api.*error/i, /status.*[45]\d\d/i]
      },
      componentRender: {
        keywords: ['render', 'component', 'mount', 'dom', 'element', 'jsx'],
        weight: 0.75,
        patterns: [/render.*error/i, /component.*fail/i, /dom.*not.*found/i]
      },
      stateManagement: {
        keywords: ['state', 'redux', 'context', 'store', 'dispatch', 'update'],
        weight: 0.7,
        patterns: [/state.*undefined/i, /dispatch.*error/i, /store.*invalid/i]
      },
      navigation: {
        keywords: ['navigate', 'route', 'router', 'link', 'redirect', 'history'],
        weight: 0.65,
        patterns: [/navigation.*failed/i, /route.*not.*found/i, /redirect.*error/i]
      },
      contentParsing: {
        keywords: ['parse', 'json', 'data', 'format', 'content', 'structure'],
        weight: 0.6,
        patterns: [/parse.*error/i, /json.*invalid/i, /data.*malformed/i]
      }
    };
  }

  /**
   * Detect failure patterns in test results
   * @param {Object} testResult - Test execution result
   * @returns {Object} Pattern detection analysis
   */
  async detectPatterns(testResult) {
    const analysis = {
      id: this.generatePatternId(testResult),
      timestamp: new Date().toISOString(),
      testName: testResult.testName,
      failureType: 'unknown',
      confidence: 0,
      patterns: [],
      recommendations: [],
      neuralScore: 0
    };

    // Extract failure information
    const failureText = this.extractFailureText(testResult);
    const stackTrace = testResult.error?.stack || '';
    const errorMessage = testResult.error?.message || '';

    // Neural pattern analysis
    const neuralAnalysis = this.analyzeWithNeuralPatterns(failureText, stackTrace, errorMessage);
    analysis.neuralScore = neuralAnalysis.score;
    analysis.failureType = neuralAnalysis.type;
    analysis.confidence = neuralAnalysis.confidence;

    // Pattern matching
    const detectedPatterns = this.matchKnownPatterns(failureText, stackTrace);
    analysis.patterns = detectedPatterns;

    // Historical pattern learning
    const historicalMatch = await this.findHistoricalMatches(analysis);
    if (historicalMatch.length > 0) {
      analysis.confidence = Math.min(analysis.confidence + 0.2, 1.0);
      analysis.recommendations = this.generateRecommendations(historicalMatch);
    }

    // Store learning data
    await this.storeLearningData(analysis);

    return analysis;
  }

  /**
   * Analyze with neural pattern recognition
   * @param {string} failureText - Failure text to analyze
   * @param {string} stackTrace - Stack trace
   * @param {string} errorMessage - Error message
   * @returns {Object} Neural analysis result
   */
  analyzeWithNeuralPatterns(failureText, stackTrace, errorMessage) {
    const combinedText = `${failureText} ${stackTrace} ${errorMessage}`.toLowerCase();
    let maxScore = 0;
    let bestType = 'unknown';
    let confidence = 0;

    for (const [type, config] of Object.entries(this.neuralWeights)) {
      let score = 0;

      // Keyword matching with TF-IDF-like scoring
      const keywordScore = this.calculateKeywordScore(combinedText, config.keywords);
      score += keywordScore * 0.4;

      // Pattern matching with regex
      const patternScore = this.calculatePatternScore(combinedText, config.patterns);
      score += patternScore * 0.6;

      // Apply neural weight
      score *= config.weight;

      if (score > maxScore) {
        maxScore = score;
        bestType = type;
        confidence = Math.min(score, 1.0);
      }
    }

    return {
      type: bestType,
      score: maxScore,
      confidence: confidence
    };
  }

  /**
   * Calculate keyword relevance score
   * @param {string} text - Text to analyze
   * @param {Array} keywords - Keywords to match
   * @returns {number} Score between 0 and 1
   */
  calculateKeywordScore(text, keywords) {
    const words = text.split(/\s+/);
    const totalWords = words.length;
    let matchCount = 0;

    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex);
      if (matches) {
        matchCount += matches.length;
      }
    });

    return Math.min(matchCount / totalWords * keywords.length, 1.0);
  }

  /**
   * Calculate pattern matching score
   * @param {string} text - Text to analyze
   * @param {Array} patterns - Regex patterns to match
   * @returns {number} Score between 0 and 1
   */
  calculatePatternScore(text, patterns) {
    let matchCount = 0;

    patterns.forEach(pattern => {
      if (pattern.test(text)) {
        matchCount++;
      }
    });

    return matchCount / patterns.length;
  }

  /**
   * Extract meaningful failure text from test result
   * @param {Object} testResult - Test result object
   * @returns {string} Extracted failure text
   */
  extractFailureText(testResult) {
    const sources = [
      testResult.error?.message,
      testResult.failureMessage,
      testResult.title,
      testResult.fullName
    ].filter(Boolean);

    return sources.join(' ').toLowerCase();
  }

  /**
   * Match against known failure patterns
   * @param {string} failureText - Failure text
   * @param {string} stackTrace - Stack trace
   * @returns {Array} Detected patterns
   */
  matchKnownPatterns(failureText, stackTrace) {
    const patterns = [];
    const combinedText = `${failureText} ${stackTrace}`;

    // API failure patterns
    if (/fetch|api|endpoint|xhr|ajax/i.test(combinedText)) {
      patterns.push({
        type: 'apiFailure',
        confidence: 0.8,
        indicators: ['network request', 'endpoint communication']
      });
    }

    // Component rendering patterns
    if (/render|mount|component|dom/i.test(combinedText)) {
      patterns.push({
        type: 'componentRender',
        confidence: 0.75,
        indicators: ['component lifecycle', 'DOM manipulation']
      });
    }

    // State management patterns
    if (/state|redux|context|store/i.test(combinedText)) {
      patterns.push({
        type: 'stateManagement',
        confidence: 0.7,
        indicators: ['state updates', 'store management']
      });
    }

    // Navigation patterns
    if (/route|navigate|router|history/i.test(combinedText)) {
      patterns.push({
        type: 'navigation',
        confidence: 0.65,
        indicators: ['routing logic', 'navigation flow']
      });
    }

    // Content parsing patterns
    if (/parse|json|xml|data/i.test(combinedText)) {
      patterns.push({
        type: 'contentParsing',
        confidence: 0.6,
        indicators: ['data transformation', 'content processing']
      });
    }

    return patterns;
  }

  /**
   * Find historical pattern matches
   * @param {Object} analysis - Current analysis
   * @returns {Array} Historical matches
   */
  async findHistoricalMatches(analysis) {
    try {
      const database = await this.loadDatabase();
      const matches = [];

      for (const record of database.failures || []) {
        const similarity = this.calculateSimilarity(analysis, record);
        if (similarity > this.confidenceThreshold) {
          matches.push({
            ...record,
            similarity: similarity
          });
        }
      }

      return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
    } catch (error) {
      console.warn('Could not load historical data:', error.message);
      return [];
    }
  }

  /**
   * Calculate similarity between two failure patterns
   * @param {Object} pattern1 - First pattern
   * @param {Object} pattern2 - Second pattern
   * @returns {number} Similarity score
   */
  calculateSimilarity(pattern1, pattern2) {
    let similarity = 0;

    // Type matching
    if (pattern1.failureType === pattern2.failureType) {
      similarity += 0.4;
    }

    // Pattern overlap
    const patterns1 = pattern1.patterns.map(p => p.type);
    const patterns2 = pattern2.patterns?.map(p => p.type) || [];
    const overlap = patterns1.filter(p => patterns2.includes(p)).length;
    const total = Math.max(patterns1.length, patterns2.length);
    if (total > 0) {
      similarity += (overlap / total) * 0.3;
    }

    // Neural score similarity
    const scoreDiff = Math.abs(pattern1.neuralScore - (pattern2.neuralScore || 0));
    similarity += (1 - scoreDiff) * 0.3;

    return similarity;
  }

  /**
   * Generate improvement recommendations
   * @param {Array} historicalMatches - Historical pattern matches
   * @returns {Array} Recommendations
   */
  generateRecommendations(historicalMatches) {
    const recommendations = [];
    const solutions = new Map();

    // Aggregate solutions from historical matches
    historicalMatches.forEach(match => {
      if (match.solution) {
        const key = match.solution.type || 'generic';
        if (!solutions.has(key)) {
          solutions.set(key, {
            type: key,
            description: match.solution.description,
            confidence: 0,
            count: 0
          });
        }
        const solution = solutions.get(key);
        solution.confidence += match.similarity;
        solution.count++;
      }
    });

    // Convert to recommendations
    solutions.forEach(solution => {
      recommendations.push({
        type: solution.type,
        description: solution.description,
        confidence: solution.confidence / solution.count,
        frequency: solution.count
      });
    });

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Store learning data for future analysis
   * @param {Object} analysis - Pattern analysis
   */
  async storeLearningData(analysis) {
    try {
      const database = await this.loadDatabase();

      if (!database.failures) {
        database.failures = [];
      }

      database.failures.push(analysis);

      // Keep only recent failures (last 1000)
      if (database.failures.length > 1000) {
        database.failures = database.failures.slice(-1000);
      }

      await this.saveDatabase(database);

      // Update learning history
      this.learningHistory.push({
        timestamp: analysis.timestamp,
        type: analysis.failureType,
        confidence: analysis.confidence
      });

    } catch (error) {
      console.error('Failed to store learning data:', error);
    }
  }

  /**
   * Load the learning database
   * @returns {Object} Database content
   */
  async loadDatabase() {
    try {
      const data = await fs.readFile(this.dbPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        version: '1.0.0',
        created: new Date().toISOString(),
        failures: [],
        patterns: {},
        metrics: {}
      };
    }
  }

  /**
   * Save the learning database
   * @param {Object} database - Database content
   */
  async saveDatabase(database) {
    database.lastUpdated = new Date().toISOString();
    await fs.writeFile(this.dbPath, JSON.stringify(database, null, 2));
  }

  /**
   * Generate unique pattern ID
   * @param {Object} testResult - Test result
   * @returns {string} Unique ID
   */
  generatePatternId(testResult) {
    const content = JSON.stringify({
      test: testResult.testName,
      error: testResult.error?.message,
      time: Math.floor(Date.now() / 1000)
    });
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
  }

  /**
   * Get detection statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const typeCount = {};
    this.learningHistory.forEach(entry => {
      typeCount[entry.type] = (typeCount[entry.type] || 0) + 1;
    });

    return {
      totalDetections: this.learningHistory.length,
      averageConfidence: this.learningHistory.reduce((sum, entry) => sum + entry.confidence, 0) / this.learningHistory.length || 0,
      failureTypes: typeCount,
      lastDetection: this.learningHistory[this.learningHistory.length - 1]?.timestamp
    };
  }
}

module.exports = FailurePatternDetector;