/**
 * Neural Training Dataset for React StrictMode Resource Leak Patterns
 * Generated from NLD Pattern Analysis: REACT_STRICTMODE_AUTO_RESOURCE_CREATION
 */

export interface NeuralTrainingRecord {
  id: string;
  patternType: string;
  inputFeatures: number[];
  expectedOutput: number[];
  metadata: {
    componentName: string;
    failureType: string;
    severity: number;
    preventable: boolean;
  };
}

export interface PatternFeatures {
  hasUseEffect: boolean;
  hasResourceCreation: boolean;
  hasEmptyDependencyArray: boolean;
  hasAsyncInEffect: boolean;
  hasCleanupFunction: boolean;
  hasUserControlledInit: boolean;
  hasStateTracking: boolean;
  codeComplexity: number;
  resourceTypeCount: number;
}

/**
 * Convert pattern features to numerical array for neural network training
 */
export function encodePatternFeatures(features: PatternFeatures): number[] {
  return [
    features.hasUseEffect ? 1 : 0,
    features.hasResourceCreation ? 1 : 0, 
    features.hasEmptyDependencyArray ? 1 : 0,
    features.hasAsyncInEffect ? 1 : 0,
    features.hasCleanupFunction ? 1 : 0,
    features.hasUserControlledInit ? 1 : 0,
    features.hasStateTracking ? 1 : 0,
    features.codeComplexity / 10.0, // Normalize complexity score
    features.resourceTypeCount / 5.0 // Normalize resource count
  ];
}

/**
 * Generate training dataset from StrictMode failure pattern
 */
export const STRICTMODE_TRAINING_DATASET: NeuralTrainingRecord[] = [
  {
    id: 'STRICTMODE-FAILURE-001',
    patternType: 'REACT_STRICTMODE_RESOURCE_LEAK',
    inputFeatures: encodePatternFeatures({
      hasUseEffect: true,
      hasResourceCreation: true,
      hasEmptyDependencyArray: true,
      hasAsyncInEffect: true,
      hasCleanupFunction: false,
      hasUserControlledInit: false,
      hasStateTracking: false,
      codeComplexity: 7,
      resourceTypeCount: 2
    }),
    expectedOutput: [1, 0], // [failure_probability, success_probability]
    metadata: {
      componentName: 'DualModeClaudeManager',
      failureType: 'AUTOMATIC_RESOURCE_CREATION',
      severity: 0.9,
      preventable: true
    }
  },
  {
    id: 'STRICTMODE-SUCCESS-001',
    patternType: 'REACT_STRICTMODE_RESOURCE_CONTROLLED',
    inputFeatures: encodePatternFeatures({
      hasUseEffect: true,
      hasResourceCreation: true,
      hasEmptyDependencyArray: false,
      hasAsyncInEffect: false,
      hasCleanupFunction: true,
      hasUserControlledInit: true,
      hasStateTracking: true,
      codeComplexity: 8,
      resourceTypeCount: 2
    }),
    expectedOutput: [0, 1], // [failure_probability, success_probability]
    metadata: {
      componentName: 'DualModeClaudeManager_Fixed',
      failureType: 'USER_CONTROLLED_RESOURCE',
      severity: 0.1,
      preventable: true
    }
  },
  {
    id: 'STRICTMODE-PARTIAL-001',
    patternType: 'REACT_STRICTMODE_MIXED_PATTERN',
    inputFeatures: encodePatternFeatures({
      hasUseEffect: true,
      hasResourceCreation: true,
      hasEmptyDependencyArray: true,
      hasAsyncInEffect: false,
      hasCleanupFunction: true,
      hasUserControlledInit: false,
      hasStateTracking: false,
      codeComplexity: 5,
      resourceTypeCount: 1
    }),
    expectedOutput: [0.7, 0.3], // [failure_probability, success_probability]
    metadata: {
      componentName: 'PartialResourceManager',
      failureType: 'MIXED_RESOURCE_PATTERN',
      severity: 0.6,
      preventable: true
    }
  },
  {
    id: 'STRICTMODE-SAFE-001',
    patternType: 'REACT_STRICTMODE_SAFE_PATTERN',
    inputFeatures: encodePatternFeatures({
      hasUseEffect: false,
      hasResourceCreation: true,
      hasEmptyDependencyArray: false,
      hasAsyncInEffect: false,
      hasCleanupFunction: false,
      hasUserControlledInit: true,
      hasStateTracking: true,
      codeComplexity: 3,
      resourceTypeCount: 1
    }),
    expectedOutput: [0.1, 0.9], // [failure_probability, success_probability]
    metadata: {
      componentName: 'SafeResourceManager',
      failureType: 'CALLBACK_CONTROLLED_RESOURCE',
      severity: 0.1,
      preventable: true
    }
  }
];

/**
 * Neural network configuration for StrictMode pattern detection
 */
export const STRICTMODE_NEURAL_CONFIG = {
  inputSize: 9, // Number of features in encodePatternFeatures
  hiddenLayers: [16, 8], // Two hidden layers
  outputSize: 2, // [failure_prob, success_prob]
  learningRate: 0.001,
  epochs: 1000,
  batchSize: 32,
  validationSplit: 0.2
};

/**
 * Pattern classification labels for training
 */
export const PATTERN_CLASSIFICATION_LABELS = {
  SAFE: 0,
  LOW_RISK: 1,
  MEDIUM_RISK: 2,
  HIGH_RISK: 3,
  CRITICAL_RISK: 4
};

/**
 * Generate augmented training data for improved model robustness
 */
export function generateAugmentedTrainingData(
  baseRecords: NeuralTrainingRecord[],
  augmentationFactor: number = 3
): NeuralTrainingRecord[] {
  const augmentedData: NeuralTrainingRecord[] = [...baseRecords];
  
  baseRecords.forEach((record, index) => {
    for (let i = 0; i < augmentationFactor; i++) {
      const noisyFeatures = record.inputFeatures.map(feature => {
        // Add small random noise to numerical features (last 2 features)
        if (feature < 1) {
          return Math.max(0, Math.min(1, feature + (Math.random() - 0.5) * 0.1));
        }
        return feature;
      });
      
      augmentedData.push({
        id: `${record.id}_AUG_${i}`,
        patternType: record.patternType,
        inputFeatures: noisyFeatures,
        expectedOutput: record.expectedOutput,
        metadata: {
          ...record.metadata,
          componentName: `${record.metadata.componentName}_Variant_${i}`
        }
      });
    }
  });
  
  return augmentedData;
}

/**
 * Export training data in Claude Flow neural network format
 */
export function exportToClaudeFlowFormat(records: NeuralTrainingRecord[]): any {
  return {
    version: "1.0.0",
    patternType: "REACT_STRICTMODE_RESOURCE_LEAK",
    timestamp: new Date().toISOString(),
    trainingData: records.map(record => ({
      input: record.inputFeatures,
      output: record.expectedOutput,
      metadata: record.metadata
    })),
    configuration: STRICTMODE_NEURAL_CONFIG,
    classificationLabels: PATTERN_CLASSIFICATION_LABELS
  };
}

/**
 * Validate training record for completeness and correctness
 */
export function validateTrainingRecord(record: NeuralTrainingRecord): boolean {
  const checks = [
    record.id && record.id.length > 0,
    record.patternType && record.patternType.length > 0,
    record.inputFeatures && record.inputFeatures.length === STRICTMODE_NEURAL_CONFIG.inputSize,
    record.expectedOutput && record.expectedOutput.length === STRICTMODE_NEURAL_CONFIG.outputSize,
    record.metadata && record.metadata.componentName && record.metadata.failureType,
    record.inputFeatures.every(feature => typeof feature === 'number' && !isNaN(feature)),
    record.expectedOutput.every(output => typeof output === 'number' && !isNaN(output))
  ];
  
  return checks.every(check => check);
}