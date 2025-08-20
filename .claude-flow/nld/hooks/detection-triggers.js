#!/usr/bin/env node

/**
 * NLD Agent Detection Triggers
 * Automatically detects user feedback patterns and activates NLD data collection
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class NLDDetector {
  constructor() {
    this.workspaceDir = '/Users/dani/Documents/core/agent_workspace/nld-agent';
    this.databaseDir = '.claude-flow/nld/database';
    
    // Failure detection patterns
    this.failurePatterns = [
      /didn't work/i,
      /not working/i,
      /that failed/i,
      /broken/i,
      /error/i,
      /issue/i,
      /problem/i,
      /wrong/i
    ];
    
    // Success confirmation patterns  
    this.successPatterns = [
      /that worked/i,
      /working now/i,
      /fixed/i,
      /perfect/i,
      /success/i,
      /great/i
    ];
  }

  /**
   * Detect if user feedback indicates Claude's success/failure prediction was wrong
   */
  detectFeedbackPattern(userMessage, claudeLastResponse) {
    const isFailureFeedback = this.failurePatterns.some(pattern => 
      pattern.test(userMessage));
    const isSuccessFeedback = this.successPatterns.some(pattern => 
      pattern.test(userMessage));
      
    if (!isFailureFeedback && !isSuccessFeedback) {
      return null;
    }
    
    // Analyze Claude's confidence in last response
    const claudeClaimedSuccess = this.analyzeClaudeConfidence(claudeLastResponse);
    
    // Detect mismatch between Claude's claim and user's experience
    if ((isFailureFeedback && claudeClaimedSuccess) || 
        (isSuccessFeedback && !claudeClaimedSuccess)) {
      return {
        type: isFailureFeedback ? 'unexpected_failure' : 'unexpected_success',
        userFeedback: userMessage,
        claudeResponse: claudeLastResponse,
        mismatch: true
      };
    }
    
    return null;
  }

  /**
   * Analyze Claude's confidence level from response text
   */
  analyzeClaudeConfidence(response) {
    const confidenceIndicators = {
      high: ['should work', 'this will', 'successfully', 'complete', 'done'],
      medium: ['should', 'try this', 'attempt', 'might work'],
      low: ['not sure', 'might', 'possibly', 'uncertain']
    };
    
    let confidence = 0.5; // default medium confidence
    
    for (const [level, indicators] of Object.entries(confidenceIndicators)) {
      for (const indicator of indicators) {
        if (response.toLowerCase().includes(indicator)) {
          switch(level) {
            case 'high': confidence = Math.max(confidence, 0.8); break;
            case 'medium': confidence = Math.max(confidence, 0.5); break;
            case 'low': confidence = Math.min(confidence, 0.3); break;
          }
        }
      }
    }
    
    return confidence > 0.6;
  }

  /**
   * Create NLT record from detected pattern
   */
  async createNLTRecord(detectionData, taskContext = {}) {
    const recordId = this.generateRecordId();
    const timestamp = new Date().toISOString();
    
    const record = {
      record_id: recordId,
      timestamp: timestamp,
      session_id: process.env.CLAUDE_SESSION_ID || 'unknown',
      task_context: {
        original_task: taskContext.originalTask || 'Unknown task',
        task_domain: this.classifyTaskDomain(taskContext.originalTask || ''),
        task_complexity: this.assessComplexity(taskContext.originalTask || ''),
        claude_solution: detectionData.claudeResponse,
        claude_confidence: this.analyzeClaudeConfidence(detectionData.claudeResponse)
      },
      user_feedback: {
        feedback_text: detectionData.userFeedback,
        outcome: detectionData.type === 'unexpected_failure' ? 'failure' : 'success',
        corrected_solution: '', // To be filled later if provided
        time_to_feedback: 0 // Calculate from session timing
      },
      failure_analysis: {
        failure_type: this.classifyFailureType(detectionData),
        root_cause: 'Pattern detected via user feedback',
        tdd_used: this.detectTDDUsage(detectionData.claudeResponse),
        test_coverage: 0
      },
      effectiveness_metrics: {
        effectiveness_score: this.calculateEffectivenessScore(detectionData),
        user_success_rate: 0.5, // Default, to be updated with historical data
        tdd_factor: this.detectTDDUsage(detectionData.claudeResponse) ? 1.2 : 1.0,
        pattern_frequency: 1
      },
      neural_integration: {
        training_data_exported: false,
        pattern_classification: this.classifyPattern(detectionData),
        prediction_confidence: 0.0,
        similar_patterns: []
      }
    };
    
    // Save record
    await this.saveRecord(record);
    
    return record;
  }

  /**
   * Generate unique record ID
   */
  generateRecordId() {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5')
      .update(`${timestamp}-${Math.random()}`)
      .digest('hex')
      .substring(0, 8);
    return `nlt-${timestamp}-${hash}`;
  }

  /**
   * Classify task domain
   */
  classifyTaskDomain(task) {
    const domains = {
      'debug': ['fix', 'error', 'bug', 'debug', 'issue'],
      'feature': ['add', 'create', 'implement', 'build', 'new'],
      'refactor': ['refactor', 'improve', 'optimize', 'clean'],
      'test': ['test', 'spec', 'unit', 'integration'],
      'code': ['code', 'function', 'class', 'method']
    };
    
    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(keyword => task.toLowerCase().includes(keyword))) {
        return domain;
      }
    }
    
    return 'general';
  }

  /**
   * Assess task complexity (1-10 scale)
   */
  assessComplexity(task) {
    let complexity = 3; // default
    
    const complexityIndicators = {
      simple: ['simple', 'basic', 'quick', 'small'],
      medium: ['moderate', 'standard', 'typical'],
      complex: ['complex', 'advanced', 'difficult', 'multiple', 'integration']
    };
    
    for (const [level, indicators] of Object.entries(complexityIndicators)) {
      for (const indicator of indicators) {
        if (task.toLowerCase().includes(indicator)) {
          switch(level) {
            case 'simple': complexity = Math.min(complexity, 2); break;
            case 'medium': complexity = 5; break;
            case 'complex': complexity = Math.max(complexity, 7); break;
          }
        }
      }
    }
    
    return complexity;
  }

  /**
   * Classify failure type
   */
  classifyFailureType(detectionData) {
    const failureTypes = {
      'logic': ['logic', 'algorithm', 'calculation', 'condition'],
      'environment': ['path', 'permission', 'environment', 'config'],
      'dependency': ['import', 'require', 'dependency', 'module'],
      'integration': ['api', 'service', 'connection', 'network'],
      'syntax': ['syntax', 'parse', 'compile', 'format']
    };
    
    const text = `${detectionData.userFeedback} ${detectionData.claudeResponse}`.toLowerCase();
    
    for (const [type, keywords] of Object.entries(failureTypes)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return type;
      }
    }
    
    return 'design';
  }

  /**
   * Detect if TDD was used in Claude's solution
   */
  detectTDDUsage(response) {
    const tddIndicators = ['test', 'spec', 'describe', 'it(', 'expect', 'assert', 'beforeEach', 'afterEach'];
    return tddIndicators.some(indicator => response.toLowerCase().includes(indicator));
  }

  /**
   * Calculate effectiveness score
   */
  calculateEffectivenessScore(detectionData) {
    // Base score depends on outcome
    let score = detectionData.type === 'unexpected_success' ? 0.8 : 0.2;
    
    // Adjust based on TDD usage
    if (this.detectTDDUsage(detectionData.claudeResponse)) {
      score *= 1.2;
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Classify pattern for ML training
   */
  classifyPattern(detectionData) {
    return `${detectionData.type}_${this.classifyFailureType(detectionData)}`;
  }

  /**
   * Save record to database
   */
  async saveRecord(record) {
    const filename = `${record.record_id}.json`;
    const filepath = path.join(this.databaseDir, 'records', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(record, null, 2));
    
    // Update index
    await this.updateIndex(record);
    
    console.log(`NLD: Created record ${record.record_id}`);
  }

  /**
   * Update search indexes
   */
  async updateIndex(record) {
    const indexPath = path.join(this.databaseDir, 'index.json');
    let index = {};
    
    if (fs.existsSync(indexPath)) {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    }
    
    // Add to indexes
    index.by_timestamp = index.by_timestamp || [];
    index.by_domain = index.by_domain || {};
    index.by_failure_type = index.by_failure_type || {};
    
    index.by_timestamp.push({
      record_id: record.record_id,
      timestamp: record.timestamp
    });
    
    const domain = record.task_context.task_domain;
    index.by_domain[domain] = index.by_domain[domain] || [];
    index.by_domain[domain].push(record.record_id);
    
    const failureType = record.failure_analysis.failure_type;
    index.by_failure_type[failureType] = index.by_failure_type[failureType] || [];
    index.by_failure_type[failureType].push(record.record_id);
    
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }
}

module.exports = { NLDDetector };

// CLI usage
if (require.main === module) {
  const detector = new NLDDetector();
  
  const userMessage = process.argv[2];
  const claudeResponse = process.argv[3];
  const taskContext = process.argv[4] ? JSON.parse(process.argv[4]) : {};
  
  if (userMessage && claudeResponse) {
    const detection = detector.detectFeedbackPattern(userMessage, claudeResponse);
    if (detection) {
      detector.createNLTRecord(detection, taskContext)
        .then(record => {
          console.log('NLD Detection Result:', JSON.stringify({
            detected: true,
            record_id: record.record_id,
            pattern_type: detection.type
          }, null, 2));
        })
        .catch(err => console.error('Error:', err));
    } else {
      console.log('No pattern detected');
    }
  }
}