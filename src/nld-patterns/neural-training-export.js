/**
 * Neural Training Export for Claude Flow Integration
 * Exports NLD pattern data for neural network training
 * 
 * This module formats failure patterns for claude-flow neural training
 * to improve future solution effectiveness and prevent recurring failures.
 */

import { MemoryLeakPattern } from './memory-leak-detection.js';
import { MemoryLeakPreventionTDD } from './tdd-memory-leak-prevention.js';

export class NeuralTrainingExporter {
  constructor() {
    this.trainingData = [];
    this.patterns = new Map();
    this.metadata = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      totalPatterns: 0,
      criticalFailures: 0
    };
  }
  
  /**
   * Add NLD pattern to training dataset
   */
  addPattern(pattern) {
    if (!pattern.id || !pattern.type) {
      throw new Error('Pattern must have id and type');
    }
    
    this.patterns.set(pattern.id, pattern);
    
    const trainingRecord = this.convertToTrainingFormat(pattern);
    this.trainingData.push(trainingRecord);
    
    this.metadata.totalPatterns++;
    if (pattern.severity === 'CRITICAL') {
      this.metadata.criticalFailures++;
    }
  }
  
  /**
   * Convert NLD pattern to claude-flow neural training format
   */
  convertToTrainingFormat(pattern) {
    return {
      // Neural network input features
      features: {
        // Code pattern signatures
        codePatterns: pattern.neuralPatterns?.inputSignatures || [],
        
        // Failure indicators
        symptoms: pattern.symptoms || [],
        
        // Context features
        domain: pattern.originalTask?.domain || 'general',
        complexity: this.extractComplexity(pattern),
        environment: pattern.environment || 'unknown',
        
        // TDD features  
        tddUsed: pattern.tddUsage || false,
        testCoverage: this.extractTestCoverage(pattern),
        
        // Confidence features
        claudeConfidence: pattern.effectiveness?.claudeConfidence || 0.5
      },
      
      // Neural network output labels
      labels: {
        // Primary failure classification
        failureType: pattern.type,
        severity: pattern.severity,
        
        // Outcome prediction
        willFail: pattern.effectiveness?.userSuccessRate < 0.5,
        needsTDD: !pattern.tddUsage && pattern.severity === 'CRITICAL',
        
        // Prevention strategies
        preventionStrategies: pattern.preventiveStrategies || [],
        requiredPatterns: pattern.tddPatterns || []
      },
      
      // Training metadata
      metadata: {
        patternId: pattern.id,
        timestamp: pattern.timestamp,
        weight: this.calculateTrainingWeight(pattern),
        source: 'nld-agent',
        validated: true
      }
    };
  }
  
  /**
   * Extract complexity score from pattern
   */
  extractComplexity(pattern) {
    let complexity = 0.5; // Default medium complexity
    
    // Increase complexity for memory issues
    if (pattern.type.includes('MEMORY_LEAK')) complexity += 0.3;
    if (pattern.type.includes('INFINITE_LOOP')) complexity += 0.2;
    
    // Increase complexity for multiple components
    if (pattern.symptoms && pattern.symptoms.length > 3) complexity += 0.1;
    
    // Cap at 1.0
    return Math.min(complexity, 1.0);
  }
  
  /**
   * Extract test coverage features
   */
  extractTestCoverage(pattern) {
    const coverage = {
      hasMemoryTests: false,
      hasResourceTests: false, 
      hasPerformanceTests: false,
      hasMockingTests: false
    };
    
    if (pattern.tddAnalysis) {
      coverage.hasMemoryTests = pattern.tddAnalysis.testCoverage?.memoryLeakTests || false;
      coverage.hasResourceTests = pattern.tddAnalysis.testCoverage?.resourceCleanupTests || false;
      coverage.hasPerformanceTests = pattern.tddAnalysis.testCoverage?.performanceBoundaryTests || false;
      coverage.hasMockingTests = pattern.tddAnalysis.testCoverage?.fileSystemMocking || false;
    }
    
    return coverage;
  }
  
  /**
   * Calculate training weight based on pattern importance
   */
  calculateTrainingWeight(pattern) {
    let weight = 0.5; // Base weight
    
    // Increase weight for critical failures
    if (pattern.severity === 'CRITICAL') weight += 0.4;
    else if (pattern.severity === 'HIGH') weight += 0.2;
    
    // Increase weight for service outages
    if (pattern.impact === 'service_outage') weight += 0.3;
    
    // Increase weight for patterns where Claude was highly confident but wrong
    if (pattern.effectiveness?.claudeConfidence > 0.8 && 
        pattern.effectiveness?.userSuccessRate < 0.2) {
      weight += 0.2;
    }
    
    return Math.min(weight, 1.0);
  }
  
  /**
   * Export training data for claude-flow neural networks
   */
  exportForClaudeFlow() {
    return {
      format: 'claude-flow-neural-v1',
      metadata: this.metadata,
      trainingSet: this.trainingData,
      
      // Neural network configuration suggestions
      networkConfig: {
        inputDimensions: this.calculateInputDimensions(),
        outputCategories: this.getOutputCategories(),
        recommendedLayers: this.recommendLayerConfiguration(),
        learningRate: 0.001,
        batchSize: 32
      },
      
      // Pattern-specific training parameters
      trainingParameters: {
        epochs: 100,
        validationSplit: 0.2,
        earlyStoppingPatience: 10,
        lossFunction: 'categorical_crossentropy',
        metrics: ['accuracy', 'precision', 'recall']
      }
    };
  }
  
  /**
   * Calculate input dimensions for neural network
   */
  calculateInputDimensions() {
    // Based on feature analysis
    return {
      codePatterns: 20,      // Max code pattern features
      symptoms: 15,          // Max symptom features  
      context: 10,           // Context features
      tddFeatures: 8,        // TDD-related features
      confidence: 1          // Claude confidence score
    };
  }
  
  /**
   * Get output categories for classification
   */
  getOutputCategories() {
    return {
      failureTypes: [
        'MEMORY_LEAK_INFINITE_LOOP',
        'RESOURCE_EXHAUSTION',
        'PERFORMANCE_DEGRADATION',
        'INFINITE_RECURSION',
        'EVENT_LISTENER_LEAK'
      ],
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      preventionStrategies: [
        'add_memory_monitoring',
        'implement_rate_limiting',
        'add_circuit_breaker',
        'improve_resource_cleanup',
        'add_performance_tests'
      ]
    };
  }
  
  /**
   * Recommend neural network layer configuration
   */
  recommendLayerConfiguration() {
    return [
      { type: 'input', neurons: 54 }, // Total input features
      { type: 'dense', neurons: 128, activation: 'relu' },
      { type: 'dropout', rate: 0.3 },
      { type: 'dense', neurons: 64, activation: 'relu' },
      { type: 'dropout', rate: 0.2 },
      { type: 'dense', neurons: 32, activation: 'relu' },
      { type: 'output', neurons: 15, activation: 'softmax' } // Classification output
    ];
  }
  
  /**
   * Save training data to file for claude-flow consumption
   */
  async saveTrainingData(filePath) {
    const exportData = this.exportForClaudeFlow();
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    return exportData;
  }
}

// Initialize and export memory leak pattern
const exporter = new NeuralTrainingExporter();
exporter.addPattern(MemoryLeakPattern);

export { exporter as neuralTrainingExporter };
export default exporter;