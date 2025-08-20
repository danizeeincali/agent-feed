#!/usr/bin/env node

/**
 * NLD Neural Network Training Data Export
 * Exports NLT records in claude-flow neural network format
 */

const fs = require('fs');
const path = require('path');

class NeuralDataExporter {
  constructor() {
    this.databaseDir = '.claude-flow/nld/database';
    this.neuralDir = '.claude-flow/nld/neural';
    this.workspaceDir = '/Users/dani/Documents/core/agent_workspace/nld-agent';
  }

  /**
   * Export all NLT records as neural training data
   */
  async exportTrainingData() {
    const records = await this.loadAllRecords();
    const trainingData = await this.formatForNeuralTraining(records);
    
    await this.saveTrainingData(trainingData);
    await this.updateNeuralPatterns(trainingData);
    
    return trainingData;
  }

  /**
   * Load all NLT records from database
   */
  async loadAllRecords() {
    const recordsDir = path.join(this.databaseDir, 'records');
    
    if (!fs.existsSync(recordsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(recordsDir)
      .filter(file => file.endsWith('.json'));
    
    const records = [];
    
    for (const file of files) {
      try {
        const filepath = path.join(recordsDir, file);
        const record = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        records.push(record);
      } catch (error) {
        console.error(`Error loading record ${file}:`, error.message);
      }
    }
    
    return records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Format records for claude-flow neural network training
   */
  async formatForNeuralTraining(records) {
    const trainingData = {
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        total_records: records.length,
        data_types: ['failure_patterns', 'success_patterns', 'effectiveness_scores']
      },
      patterns: {
        failure_detection: [],
        success_prediction: [],
        tdd_effectiveness: []
      },
      features: [],
      labels: []
    };

    for (const record of records) {
      // Extract features for neural network
      const features = this.extractFeatures(record);
      const labels = this.extractLabels(record);
      
      trainingData.features.push(features);
      trainingData.labels.push(labels);
      
      // Add to pattern collections
      if (record.user_feedback.outcome === 'failure') {
        trainingData.patterns.failure_detection.push({
          pattern: this.createFailurePattern(record),
          confidence: record.neural_integration.prediction_confidence || 0.5,
          context: this.extractContext(record)
        });
      } else {
        trainingData.patterns.success_prediction.push({
          pattern: this.createSuccessPattern(record),
          confidence: record.neural_integration.prediction_confidence || 0.5,
          context: this.extractContext(record)
        });
      }
      
      if (record.failure_analysis.tdd_used) {
        trainingData.patterns.tdd_effectiveness.push({
          effectiveness_score: record.effectiveness_metrics.effectiveness_score,
          tdd_factor: record.effectiveness_metrics.tdd_factor,
          test_coverage: record.failure_analysis.test_coverage,
          domain: record.task_context.task_domain
        });
      }
    }

    return trainingData;
  }

  /**
   * Extract numerical features from record for ML model
   */
  extractFeatures(record) {
    return [
      this.encodeTaskDomain(record.task_context.task_domain),
      record.task_context.task_complexity || 0,
      record.task_context.claude_confidence || 0.5,
      this.encodeFailureType(record.failure_analysis.failure_type),
      record.failure_analysis.tdd_used ? 1 : 0,
      record.failure_analysis.test_coverage || 0,
      record.user_feedback.time_to_feedback || 0,
      this.encodeOutcome(record.user_feedback.outcome)
    ];
  }

  /**
   * Extract labels for supervised learning
   */
  extractLabels(record) {
    return {
      effectiveness_score: record.effectiveness_metrics.effectiveness_score,
      will_succeed: record.user_feedback.outcome === 'success' ? 1 : 0,
      requires_tdd: record.failure_analysis.tdd_used ? 1 : 0,
      complexity_rating: record.task_context.task_complexity || 3
    };
  }

  /**
   * Create failure pattern representation
   */
  createFailurePattern(record) {
    return {
      task_signature: this.createTaskSignature(record),
      failure_indicators: this.extractFailureIndicators(record),
      context_features: this.extractContextFeatures(record),
      resolution_hints: this.extractResolutionHints(record)
    };
  }

  /**
   * Create success pattern representation
   */
  createSuccessPattern(record) {
    return {
      task_signature: this.createTaskSignature(record),
      success_indicators: this.extractSuccessIndicators(record),
      context_features: this.extractContextFeatures(record),
      best_practices: this.extractBestPractices(record)
    };
  }

  /**
   * Create unique task signature for pattern matching
   */
  createTaskSignature(record) {
    const task = record.task_context.original_task.toLowerCase();
    const domain = record.task_context.task_domain;
    const complexity = record.task_context.task_complexity;
    
    return `${domain}_${complexity}_${this.hashString(task)}`;
  }

  /**
   * Extract failure indicators for pattern recognition
   */
  extractFailureIndicators(record) {
    return {
      failure_type: record.failure_analysis.failure_type,
      root_cause: record.failure_analysis.root_cause,
      user_feedback_sentiment: this.analyzeSentiment(record.user_feedback.feedback_text),
      claude_overconfidence: record.task_context.claude_confidence > 0.8
    };
  }

  /**
   * Extract success indicators
   */
  extractSuccessIndicators(record) {
    return {
      tdd_usage: record.failure_analysis.tdd_used,
      test_coverage: record.failure_analysis.test_coverage,
      claude_confidence_match: Math.abs(record.task_context.claude_confidence - record.effectiveness_metrics.effectiveness_score) < 0.2,
      positive_feedback: this.analyzeSentiment(record.user_feedback.feedback_text) > 0
    };
  }

  /**
   * Extract context features for pattern matching
   */
  extractContextFeatures(record) {
    return {
      domain: record.task_context.task_domain,
      complexity: record.task_context.task_complexity,
      session_context: record.session_id,
      timestamp_features: this.extractTimeFeatures(record.timestamp)
    };
  }

  /**
   * Extract context information
   */
  extractContext(record) {
    return {
      domain: record.task_context.task_domain,
      complexity: record.task_context.task_complexity,
      tdd_used: record.failure_analysis.tdd_used,
      failure_type: record.failure_analysis.failure_type
    };
  }

  /**
   * Encode categorical variables
   */
  encodeTaskDomain(domain) {
    const domains = ['debug', 'feature', 'refactor', 'test', 'code', 'general'];
    return domains.indexOf(domain) !== -1 ? domains.indexOf(domain) : 5;
  }

  encodeFailureType(type) {
    const types = ['logic', 'environment', 'dependency', 'integration', 'syntax', 'design'];
    return types.indexOf(type) !== -1 ? types.indexOf(type) : 5;
  }

  encodeOutcome(outcome) {
    return outcome === 'success' ? 1 : (outcome === 'partial' ? 0.5 : 0);
  }

  /**
   * Simple sentiment analysis
   */
  analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'perfect', 'working', 'fixed', 'success'];
    const negativeWords = ['bad', 'broken', 'failed', 'wrong', 'error', 'issue'];
    
    let score = 0;
    const words = text.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    }
    
    return score / words.length;
  }

  /**
   * Extract time-based features
   */
  extractTimeFeatures(timestamp) {
    const date = new Date(timestamp);
    return {
      hour_of_day: date.getHours(),
      day_of_week: date.getDay(),
      month: date.getMonth()
    };
  }

  /**
   * Simple string hashing
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  /**
   * Extract resolution hints from successful corrections
   */
  extractResolutionHints(record) {
    if (record.user_feedback.corrected_solution) {
      return {
        correction_provided: true,
        solution_length: record.user_feedback.corrected_solution.length,
        includes_tests: /test|spec|describe|it\(/i.test(record.user_feedback.corrected_solution)
      };
    }
    return { correction_provided: false };
  }

  /**
   * Extract best practices from successful patterns
   */
  extractBestPractices(record) {
    return {
      used_tdd: record.failure_analysis.tdd_used,
      high_test_coverage: record.failure_analysis.test_coverage > 70,
      appropriate_complexity: record.task_context.task_complexity <= 6,
      good_confidence_calibration: Math.abs(record.task_context.claude_confidence - record.effectiveness_metrics.effectiveness_score) < 0.3
    };
  }

  /**
   * Save training data in claude-flow format
   */
  async saveTrainingData(trainingData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `training-data-${timestamp}.json`;
    const filepath = path.join(this.neuralDir, 'exports', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(trainingData, null, 2));
    
    // Update latest export reference
    const latestPath = path.join(this.neuralDir, 'latest-export.json');
    fs.writeFileSync(latestPath, JSON.stringify({
      export_file: filename,
      created: trainingData.metadata.created,
      record_count: trainingData.metadata.total_records
    }, null, 2));
    
    console.log(`NLD: Exported training data to ${filename}`);
    return filepath;
  }

  /**
   * Update neural patterns for claude-flow integration
   */
  async updateNeuralPatterns(trainingData) {
    const patternsFile = path.join(this.neuralDir, 'nld-patterns.json');
    
    const patterns = {
      failure_patterns: trainingData.patterns.failure_detection.map(p => ({
        signature: p.pattern.task_signature,
        indicators: p.pattern.failure_indicators,
        confidence: p.confidence,
        count: 1
      })),
      success_patterns: trainingData.patterns.success_prediction.map(p => ({
        signature: p.pattern.task_signature,
        indicators: p.pattern.success_indicators,
        confidence: p.confidence,
        count: 1
      })),
      tdd_effectiveness: trainingData.patterns.tdd_effectiveness,
      summary_stats: {
        total_patterns: trainingData.patterns.failure_detection.length + trainingData.patterns.success_prediction.length,
        failure_rate: trainingData.patterns.failure_detection.length / (trainingData.patterns.failure_detection.length + trainingData.patterns.success_prediction.length),
        avg_tdd_effectiveness: trainingData.patterns.tdd_effectiveness.reduce((sum, p) => sum + p.effectiveness_score, 0) / Math.max(1, trainingData.patterns.tdd_effectiveness.length)
      }
    };
    
    fs.writeFileSync(patternsFile, JSON.stringify(patterns, null, 2));
    console.log('NLD: Updated neural patterns for claude-flow integration');
    
    return patterns;
  }

  /**
   * Generate training summary report
   */
  async generateReport(trainingData) {
    const report = {
      summary: {
        total_records: trainingData.metadata.total_records,
        failure_rate: trainingData.patterns.failure_detection.length / trainingData.metadata.total_records,
        tdd_usage_rate: trainingData.patterns.tdd_effectiveness.length / trainingData.metadata.total_records,
        avg_effectiveness: trainingData.features.reduce((sum, f, i) => sum + trainingData.labels[i].effectiveness_score, 0) / trainingData.metadata.total_records
      },
      recommendations: [],
      top_failure_patterns: trainingData.patterns.failure_detection.slice(0, 10),
      top_success_patterns: trainingData.patterns.success_prediction.slice(0, 10)
    };
    
    // Generate recommendations
    if (report.summary.failure_rate > 0.3) {
      report.recommendations.push('Consider implementing more TDD practices - high failure rate detected');
    }
    
    if (report.summary.tdd_usage_rate < 0.4) {
      report.recommendations.push('Increase TDD adoption - correlation with higher success rates observed');
    }
    
    const reportPath = path.join(this.neuralDir, 'training-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }
}

module.exports = { NeuralDataExporter };

// CLI usage
if (require.main === module) {
  const exporter = new NeuralDataExporter();
  
  exporter.exportTrainingData()
    .then(data => {
      console.log('Training data export completed');
      return exporter.generateReport(data);
    })
    .then(report => {
      console.log('Training report:', JSON.stringify(report.summary, null, 2));
    })
    .catch(err => console.error('Export error:', err));
}