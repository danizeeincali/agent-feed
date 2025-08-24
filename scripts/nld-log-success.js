#!/usr/bin/env node

/**
 * NLD Success Pattern Logger
 * Records successful operations to build pattern database for regression prevention
 */

const fs = require('fs').promises;
const path = require('path');

class NLDSuccessLogger {
  constructor() {
    this.nldDir = path.join(__dirname, '../nld-agent/records');
    this.patternsDir = path.join(__dirname, '../nld-agent/patterns');
  }

  async logSuccess(operation, details = {}) {
    const timestamp = new Date().toISOString();
    const recordId = `success-${operation}-${Date.now()}`;
    
    const successRecord = {
      id: recordId,
      type: 'success-pattern',
      operation,
      timestamp,
      environment: process.env.NODE_ENV || 'development',
      details,
      metadata: {
        gitCommit: details.gitCommit || await this.getGitCommit(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };
    
    try {
      // Ensure directories exist
      await fs.mkdir(this.nldDir, { recursive: true });
      await fs.mkdir(this.patternsDir, { recursive: true });
      
      // Save individual success record
      const recordPath = path.join(this.nldDir, `${recordId}.json`);
      await fs.writeFile(recordPath, JSON.stringify(successRecord, null, 2));
      
      // Update success patterns database
      await this.updateSuccessPatterns(operation, successRecord);
      
      // Update neural training data
      await this.updateNeuralPatterns(successRecord);
      
      console.log(`✅ NLD Success logged: ${operation} (${recordId})`);
      
      return recordId;
    } catch (error) {
      console.error('❌ Failed to log NLD success:', error.message);
      return null;
    }
  }

  async updateSuccessPatterns(operation, record) {
    const patternsPath = path.join(this.patternsDir, 'success-patterns.json');
    
    let patterns = {
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        totalSuccesses: 0
      },
      patterns: {}
    };
    
    try {
      const existing = await fs.readFile(patternsPath, 'utf8');
      patterns = JSON.parse(existing);
    } catch (error) {
      // File doesn't exist yet, use default
    }
    
    // Update metadata
    patterns.metadata.lastUpdated = record.timestamp;
    patterns.metadata.totalSuccesses = (patterns.metadata.totalSuccesses || 0) + 1;
    
    // Add or update pattern
    if (!patterns.patterns[operation]) {
      patterns.patterns[operation] = {
        name: operation,
        successCount: 0,
        firstSuccess: record.timestamp,
        lastSuccess: record.timestamp,
        commonConditions: [],
        environmentDistribution: {}
      };
    }
    
    const pattern = patterns.patterns[operation];
    pattern.successCount++;
    pattern.lastSuccess = record.timestamp;
    
    // Track environment distribution
    const env = record.environment;
    pattern.environmentDistribution[env] = (pattern.environmentDistribution[env] || 0) + 1;
    
    // Analyze common success conditions
    if (record.details && Object.keys(record.details).length > 0) {
      pattern.commonConditions = this.analyzeSuccessConditions(pattern.commonConditions, record.details);
    }
    
    await fs.writeFile(patternsPath, JSON.stringify(patterns, null, 2));
  }

  async updateNeuralPatterns(record) {
    const neuralPath = path.join(this.patternsDir, 'neural-training-success.json');
    
    let neuralData = {
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        totalSamples: 0
      },
      trainingData: []
    };
    
    try {
      const existing = await fs.readFile(neuralPath, 'utf8');
      neuralData = JSON.parse(existing);
    } catch (error) {
      // File doesn't exist yet, use default
    }
    
    // Convert record to neural training format
    const trainingFeatures = this.extractNeuralFeatures(record);
    
    neuralData.trainingData.push({
      id: record.id,
      timestamp: record.timestamp,
      features: trainingFeatures,
      outcome: 'success',
      confidence: 0.95
    });
    
    // Keep only last 1000 samples to prevent file bloat
    if (neuralData.trainingData.length > 1000) {
      neuralData.trainingData = neuralData.trainingData.slice(-1000);
    }
    
    neuralData.metadata.lastUpdated = record.timestamp;
    neuralData.metadata.totalSamples = neuralData.trainingData.length;
    
    await fs.writeFile(neuralPath, JSON.stringify(neuralData, null, 2));
  }

  extractNeuralFeatures(record) {
    const features = {
      operation: record.operation,
      environment: record.environment,
      timestamp: new Date(record.timestamp).getTime(),
      hasDetails: record.details && Object.keys(record.details).length > 0
    };
    
    // Extract specific features based on operation type
    switch (record.operation) {
      case 'pre-commit-validation':
        features.typescriptErrors = 0;
        features.lintErrors = 0;
        features.buildSuccess = true;
        break;
        
      case 'typescript-compilation':
        features.compilationTime = record.details.compilationTime || 0;
        features.moduleCount = record.details.moduleCount || 0;
        break;
        
      case 'websocket-connection':
        features.connectionTime = record.details.connectionTime || 0;
        features.corsErrors = 0;
        break;
        
      case 'terminal-interaction':
        features.responseTime = record.details.responseTime || 0;
        features.inputHandlerAttached = true;
        break;
        
      default:
        // Generic success features
        features.genericSuccess = true;
    }
    
    return features;
  }

  analyzeSuccessConditions(existing, newConditions) {
    // Simple frequency analysis of success conditions
    const conditionCounts = {};
    
    // Count existing conditions
    existing.forEach(condition => {
      conditionCounts[condition.key] = (conditionCounts[condition.key] || 0) + condition.frequency;
    });
    
    // Add new conditions
    Object.keys(newConditions).forEach(key => {
      if (typeof newConditions[key] !== 'object') {
        conditionCounts[key] = (conditionCounts[key] || 0) + 1;
      }
    });
    
    // Convert back to array format, sorted by frequency
    return Object.entries(conditionCounts)
      .map(([key, frequency]) => ({ key, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10); // Keep top 10 conditions
  }

  async getGitCommit() {
    try {
      const { execSync } = require('child_process');
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  // Static method for easy CLI usage
  static async log(operation, details) {
    const logger = new NLDSuccessLogger();
    return await logger.logSuccess(operation, details);
  }
}

// CLI usage
if (require.main === module) {
  const operation = process.argv[2];
  const detailsArg = process.argv[3];
  
  if (!operation) {
    console.error('Usage: node nld-log-success.js <operation> [details-json]');
    process.exit(1);
  }
  
  let details = {};
  if (detailsArg) {
    try {
      details = JSON.parse(detailsArg);
    } catch (error) {
      // If not JSON, treat as simple string details
      details = { description: detailsArg };
    }
  }
  
  NLDSuccessLogger.log(operation, details)
    .then(recordId => {
      if (recordId) {
        console.log(`Success logged with ID: ${recordId}`);
        process.exit(0);
      } else {
        console.error('Failed to log success');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

module.exports = NLDSuccessLogger;
