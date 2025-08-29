/**
 * SSE Neural Training Export System
 * Exports SSE buffer accumulation patterns for neural network training
 * Part of NLD (Neuro-Learning Development) system
 */

import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import SSEBufferAccumulationDetector from './sse-buffer-accumulation-detector';
import SSEEventHandlerDuplicationAnalyzer from './sse-event-handler-duplication-analyzer';
import OutputBufferManagementFailurePatterns from './output-buffer-management-failure-patterns';
import FrontendMessageStateAccumulationDetector from './frontend-message-state-accumulation-detector';

interface NeuralTrainingDataset {
  datasetId: string;
  name: string;
  description: string;
  version: string;
  createdAt: string;
  samples: NeuralTrainingSample[];
  metadata: {
    totalSamples: number;
    positiveExamples: number;
    negativeExamples: number;
    features: string[];
    labels: string[];
  };
}

interface NeuralTrainingSample {
  sampleId: string;
  features: {
    messageCount: number;
    repetitionCount: number;
    timeSpan: number;
    bufferSize: number;
    connectionCount: number;
    outputPosition: number;
    parserState: string;
    instanceType: string;
    severity: number; // 0-1 normalized
    antiPattern: string;
  };
  label: {
    isAntiPattern: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    antiPatternType: string;
    preventable: boolean;
    rootCause: string;
  };
  contextualData: {
    originalPattern: any;
    timestamp: string;
    environment: string;
  };
}

interface NeuralModelConfig {
  modelType: 'classification' | 'regression' | 'anomaly_detection';
  architecture: 'feedforward' | 'lstm' | 'transformer';
  inputFeatures: string[];
  outputClasses: string[];
  trainingParams: {
    batchSize: number;
    epochs: number;
    learningRate: number;
    validationSplit: number;
  };
}

export class SSENeuralTrainingExport extends EventEmitter {
  private exportDir: string;
  private datasets: Map<string, NeuralTrainingDataset> = new Map();
  private bufferDetector: SSEBufferAccumulationDetector;
  private handlerAnalyzer: SSEEventHandlerDuplicationAnalyzer;
  private bufferFailureAnalyzer: OutputBufferManagementFailurePatterns;
  private frontendDetector: FrontendMessageStateAccumulationDetector;

  constructor(
    exportDir: string,
    bufferDetector: SSEBufferAccumulationDetector,
    handlerAnalyzer: SSEEventHandlerDuplicationAnalyzer,
    bufferFailureAnalyzer: OutputBufferManagementFailurePatterns,
    frontendDetector: FrontendMessageStateAccumulationDetector
  ) {
    super();
    this.exportDir = exportDir;
    this.bufferDetector = bufferDetector;
    this.handlerAnalyzer = handlerAnalyzer;
    this.bufferFailureAnalyzer = bufferFailureAnalyzer;
    this.frontendDetector = frontendDetector;
    
    this.ensureExportDirectory();
    console.log('🤖 SSE Neural Training Export System initialized');
  }

  /**
   * Export SSE Buffer Replay Loop patterns for neural training
   */
  exportSSEBufferReplayLoopPatterns(): NeuralTrainingDataset {
    const patterns = this.bufferDetector.getDetectedPatterns();
    const replayLoopPatterns = patterns.filter(p => 
      p.antiPattern === 'SSE_BUFFER_REPLAY_LOOP' ||
      p.antiPattern === 'SSE_INFINITE_MESSAGE_REPETITION'
    );

    const samples: NeuralTrainingSample[] = replayLoopPatterns.map(pattern => ({
      sampleId: `sse-replay-${pattern.patternId}`,
      features: {
        messageCount: pattern.repetitionCount,
        repetitionCount: pattern.repetitionCount,
        timeSpan: pattern.timeSpan,
        bufferSize: pattern.technicalDetails.bufferSize,
        connectionCount: pattern.technicalDetails.connectionCount,
        outputPosition: pattern.technicalDetails.outputPosition,
        parserState: pattern.technicalDetails.parserState,
        instanceType: 'sse_buffer',
        severity: this.normalizeSeverity(pattern.severity),
        antiPattern: pattern.antiPattern
      },
      label: {
        isAntiPattern: true,
        severity: pattern.severity,
        antiPatternType: 'SSE_BUFFER_REPLAY_LOOP',
        preventable: true,
        rootCause: pattern.rootCause
      },
      contextualData: {
        originalPattern: pattern,
        timestamp: pattern.detectedAt,
        environment: 'production'
      }
    }));

    // Add negative examples (normal behavior)
    const negativeExamples = this.generateNegativeExamples('SSE_BUFFER_REPLAY_LOOP', samples.length * 0.5);
    samples.push(...negativeExamples);

    const dataset: NeuralTrainingDataset = {
      datasetId: `sse-buffer-replay-${Date.now()}`,
      name: 'SSE Buffer Replay Loop Detection Dataset',
      description: 'Training data for detecting SSE buffer replay loop anti-patterns',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      samples,
      metadata: {
        totalSamples: samples.length,
        positiveExamples: replayLoopPatterns.length,
        negativeExamples: negativeExamples.length,
        features: [
          'messageCount', 'repetitionCount', 'timeSpan', 'bufferSize', 
          'connectionCount', 'outputPosition', 'severity'
        ],
        labels: ['isAntiPattern', 'severity', 'antiPatternType', 'preventable']
      }
    };

    this.datasets.set(dataset.datasetId, dataset);
    this.persistDataset(dataset);
    
    console.log(`📄 Exported SSE Buffer Replay Loop dataset: ${samples.length} samples`);
    return dataset;
  }

  /**
   * Export output position tracking failure patterns
   */
  exportOutputPositionTrackingFailures(): NeuralTrainingDataset {
    const bufferFailures = this.bufferFailureAnalyzer.getBufferFailures();
    const positionFailures = bufferFailures.filter(f => 
      f.failureType === 'position_reset' || 
      f.failureType === 'parser_corruption'
    );

    const samples: NeuralTrainingSample[] = positionFailures.map(failure => ({
      sampleId: `position-fail-${failure.patternId}`,
      features: {
        messageCount: 0, // Not applicable for position failures
        repetitionCount: failure.bufferState.overflowCount,
        timeSpan: 0, // Instantaneous failure
        bufferSize: failure.bufferState.size,
        connectionCount: failure.failureDetails.affectedConnections,
        outputPosition: failure.bufferState.position,
        parserState: 'corrupted',
        instanceType: 'output_buffer',
        severity: this.normalizeSeverity(failure.failureDetails.impactSeverity),
        antiPattern: `BUFFER_${failure.failureType.toUpperCase()}`
      },
      label: {
        isAntiPattern: true,
        severity: failure.failureDetails.impactSeverity,
        antiPatternType: 'OUTPUT_POSITION_TRACKING_FAILURE',
        preventable: true,
        rootCause: failure.technicalCause
      },
      contextualData: {
        originalPattern: failure,
        timestamp: failure.detectedAt,
        environment: 'production'
      }
    }));

    // Add negative examples
    const negativeExamples = this.generateNegativeExamples('OUTPUT_POSITION_TRACKING_FAILURE', samples.length * 0.3);
    samples.push(...negativeExamples);

    const dataset: NeuralTrainingDataset = {
      datasetId: `output-position-failures-${Date.now()}`,
      name: 'Output Position Tracking Failure Dataset',
      description: 'Training data for detecting output position tracking failures',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      samples,
      metadata: {
        totalSamples: samples.length,
        positiveExamples: positionFailures.length,
        negativeExamples: negativeExamples.length,
        features: [
          'bufferSize', 'outputPosition', 'connectionCount', 
          'repetitionCount', 'severity'
        ],
        labels: ['isAntiPattern', 'severity', 'antiPatternType', 'preventable']
      }
    };

    this.datasets.set(dataset.datasetId, dataset);
    this.persistDataset(dataset);
    
    console.log(`📄 Exported Output Position Tracking dataset: ${samples.length} samples`);
    return dataset;
  }

  /**
   * Export frontend message accumulation patterns
   */
  exportFrontendMessageAccumulationPatterns(): NeuralTrainingDataset {
    const patterns = this.frontendDetector.getDetectedPatterns();
    
    const samples: NeuralTrainingSample[] = patterns.map(pattern => ({
      sampleId: `frontend-accum-${pattern.patternId}`,
      features: {
        messageCount: pattern.messageCount,
        repetitionCount: pattern.duplicateCount,
        timeSpan: pattern.timeWindow,
        bufferSize: pattern.technicalDetails.stateSize,
        connectionCount: 1, // Frontend is single connection
        outputPosition: -1, // Not applicable for frontend
        parserState: pattern.accumulationType,
        instanceType: 'frontend_component',
        severity: this.normalizeSeverity(pattern.severity),
        antiPattern: `FRONTEND_${pattern.accumulationType.toUpperCase()}`
      },
      label: {
        isAntiPattern: true,
        severity: pattern.severity,
        antiPatternType: 'FRONTEND_MESSAGE_ACCUMULATION',
        preventable: true,
        rootCause: pattern.rootCause
      },
      contextualData: {
        originalPattern: pattern,
        timestamp: pattern.detectedAt,
        environment: 'production'
      }
    }));

    // Add negative examples
    const negativeExamples = this.generateNegativeExamples('FRONTEND_MESSAGE_ACCUMULATION', samples.length * 0.4);
    samples.push(...negativeExamples);

    const dataset: NeuralTrainingDataset = {
      datasetId: `frontend-accumulation-${Date.now()}`,
      name: 'Frontend Message Accumulation Dataset',
      description: 'Training data for detecting frontend message state accumulation',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      samples,
      metadata: {
        totalSamples: samples.length,
        positiveExamples: patterns.length,
        negativeExamples: negativeExamples.length,
        features: [
          'messageCount', 'duplicateCount', 'timeWindow', 'stateSize',
          'renderCount', 'severity'
        ],
        labels: ['isAntiPattern', 'severity', 'antiPatternType', 'preventable']
      }
    };

    this.datasets.set(dataset.datasetId, dataset);
    this.persistDataset(dataset);
    
    console.log(`📄 Exported Frontend Accumulation dataset: ${samples.length} samples`);
    return dataset;
  }

  /**
   * Export ClaudeOutputParser buffer processing failure patterns
   */
  exportClaudeOutputParserFailures(): NeuralTrainingDataset {
    const parserFailures = this.bufferFailureAnalyzer.getParserFailures();
    
    const samples: NeuralTrainingSample[] = parserFailures.map(failure => ({
      sampleId: `parser-fail-${failure.patternId}`,
      features: {
        messageCount: 0, // Parser failures are process-level
        repetitionCount: 0,
        timeSpan: 0,
        bufferSize: failure.inputBuffer.size + failure.outputBuffer.size,
        connectionCount: 1, // Per-instance parser
        outputPosition: failure.outputBuffer.writePosition,
        parserState: failure.parserState,
        instanceType: 'claude_parser',
        severity: failure.processingFailure.errorType === 'infinite_loop' ? 1.0 : 0.7,
        antiPattern: `PARSER_${failure.processingFailure.errorType.toUpperCase()}`
      },
      label: {
        isAntiPattern: true,
        severity: failure.processingFailure.errorType === 'infinite_loop' ? 'critical' : 'high',
        antiPatternType: 'CLAUDE_OUTPUT_PARSER_FAILURE',
        preventable: true,
        rootCause: failure.processingFailure.errorMessage
      },
      contextualData: {
        originalPattern: failure,
        timestamp: failure.detectedAt,
        environment: 'production'
      }
    }));

    // Add negative examples
    const negativeExamples = this.generateNegativeExamples('CLAUDE_OUTPUT_PARSER_FAILURE', samples.length * 0.2);
    samples.push(...negativeExamples);

    const dataset: NeuralTrainingDataset = {
      datasetId: `parser-failures-${Date.now()}`,
      name: 'Claude Output Parser Failure Dataset',
      description: 'Training data for detecting Claude output parser failures',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      samples,
      metadata: {
        totalSamples: samples.length,
        positiveExamples: parserFailures.length,
        negativeExamples: negativeExamples.length,
        features: [
          'bufferSize', 'outputPosition', 'parserState', 'severity'
        ],
        labels: ['isAntiPattern', 'severity', 'antiPatternType', 'preventable']
      }
    };

    this.datasets.set(dataset.datasetId, dataset);
    this.persistDataset(dataset);
    
    console.log(`📄 Exported Claude Parser Failure dataset: ${samples.length} samples`);
    return dataset;
  }

  /**
   * Generate comprehensive combined dataset for multi-pattern detection
   */
  generateCombinedAntiPatternDataset(): NeuralTrainingDataset {
    const bufferDataset = this.exportSSEBufferReplayLoopPatterns();
    const positionDataset = this.exportOutputPositionTrackingFailures();
    const frontendDataset = this.exportFrontendMessageAccumulationPatterns();
    const parserDataset = this.exportClaudeOutputParserFailures();

    const allSamples = [
      ...bufferDataset.samples,
      ...positionDataset.samples,
      ...frontendDataset.samples,
      ...parserDataset.samples
    ];

    const combinedDataset: NeuralTrainingDataset = {
      datasetId: `sse-combined-antipatterns-${Date.now()}`,
      name: 'Combined SSE Anti-Pattern Detection Dataset',
      description: 'Comprehensive training data for all SSE streaming anti-patterns',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      samples: allSamples,
      metadata: {
        totalSamples: allSamples.length,
        positiveExamples: allSamples.filter(s => s.label.isAntiPattern).length,
        negativeExamples: allSamples.filter(s => !s.label.isAntiPattern).length,
        features: [
          'messageCount', 'repetitionCount', 'timeSpan', 'bufferSize',
          'connectionCount', 'outputPosition', 'severity', 'antiPattern'
        ],
        labels: ['isAntiPattern', 'severity', 'antiPatternType', 'preventable']
      }
    };

    this.datasets.set(combinedDataset.datasetId, combinedDataset);
    this.persistDataset(combinedDataset);
    
    console.log(`📊 Generated Combined Anti-Pattern Dataset: ${allSamples.length} samples`);
    console.log(`   Positive Examples: ${combinedDataset.metadata.positiveExamples}`);
    console.log(`   Negative Examples: ${combinedDataset.metadata.negativeExamples}`);
    
    return combinedDataset;
  }

  /**
   * Generate negative examples (normal behavior) for training
   */
  private generateNegativeExamples(antiPatternType: string, count: number): NeuralTrainingSample[] {
    const negativeExamples: NeuralTrainingSample[] = [];
    
    for (let i = 0; i < count; i++) {
      let sample: NeuralTrainingSample;
      
      switch (antiPatternType) {
        case 'SSE_BUFFER_REPLAY_LOOP':
          sample = {
            sampleId: `normal-sse-${i}`,
            features: {
              messageCount: Math.floor(Math.random() * 50) + 1, // 1-50 messages
              repetitionCount: 1, // No repetition
              timeSpan: Math.floor(Math.random() * 60000) + 1000, // 1-60 seconds
              bufferSize: Math.floor(Math.random() * 100) + 10, // 10-110
              connectionCount: Math.floor(Math.random() * 3) + 1, // 1-3 connections
              outputPosition: Math.floor(Math.random() * 100) + 1, // Progressive
              parserState: 'healthy',
              instanceType: 'sse_buffer',
              severity: Math.random() * 0.3, // Low severity
              antiPattern: 'NONE'
            },
            label: {
              isAntiPattern: false,
              severity: 'low',
              antiPatternType: 'NONE',
              preventable: false,
              rootCause: 'Normal operation'
            },
            contextualData: {
              originalPattern: null,
              timestamp: new Date().toISOString(),
              environment: 'synthetic'
            }
          };
          break;
          
        case 'OUTPUT_POSITION_TRACKING_FAILURE':
          sample = {
            sampleId: `normal-position-${i}`,
            features: {
              messageCount: Math.floor(Math.random() * 20) + 1,
              repetitionCount: 0, // No overflow
              timeSpan: 0,
              bufferSize: Math.floor(Math.random() * 1000) + 100,
              connectionCount: Math.floor(Math.random() * 5) + 1,
              outputPosition: Math.floor(Math.random() * 1000) + 100, // Progressive
              parserState: 'healthy',
              instanceType: 'output_buffer',
              severity: Math.random() * 0.2,
              antiPattern: 'NONE'
            },
            label: {
              isAntiPattern: false,
              severity: 'low',
              antiPatternType: 'NONE',
              preventable: false,
              rootCause: 'Normal buffer operation'
            },
            contextualData: {
              originalPattern: null,
              timestamp: new Date().toISOString(),
              environment: 'synthetic'
            }
          };
          break;
          
        case 'FRONTEND_MESSAGE_ACCUMULATION':
          sample = {
            sampleId: `normal-frontend-${i}`,
            features: {
              messageCount: Math.floor(Math.random() * 30) + 1, // 1-30 messages
              repetitionCount: 0, // No duplicates
              timeSpan: Math.floor(Math.random() * 300000) + 60000, // 1-5 minutes
              bufferSize: Math.floor(Math.random() * 5000) + 100,
              connectionCount: 1,
              outputPosition: -1,
              parserState: 'bounded_growth',
              instanceType: 'frontend_component',
              severity: Math.random() * 0.25,
              antiPattern: 'NONE'
            },
            label: {
              isAntiPattern: false,
              severity: 'low',
              antiPatternType: 'NONE',
              preventable: false,
              rootCause: 'Normal frontend message handling'
            },
            contextualData: {
              originalPattern: null,
              timestamp: new Date().toISOString(),
              environment: 'synthetic'
            }
          };
          break;
          
        default:
          sample = {
            sampleId: `normal-generic-${i}`,
            features: {
              messageCount: Math.floor(Math.random() * 20) + 1,
              repetitionCount: 0,
              timeSpan: Math.floor(Math.random() * 30000) + 1000,
              bufferSize: Math.floor(Math.random() * 500) + 50,
              connectionCount: Math.floor(Math.random() * 3) + 1,
              outputPosition: Math.floor(Math.random() * 500) + 50,
              parserState: 'healthy',
              instanceType: 'generic',
              severity: Math.random() * 0.2,
              antiPattern: 'NONE'
            },
            label: {
              isAntiPattern: false,
              severity: 'low',
              antiPatternType: 'NONE',
              preventable: false,
              rootCause: 'Normal operation'
            },
            contextualData: {
              originalPattern: null,
              timestamp: new Date().toISOString(),
              environment: 'synthetic'
            }
          };
      }
      
      negativeExamples.push(sample);
    }
    
    return negativeExamples;
  }

  /**
   * Normalize severity to 0-1 range for neural network training
   */
  private normalizeSeverity(severity: string): number {
    switch (severity) {
      case 'critical': return 1.0;
      case 'high': return 0.75;
      case 'medium': return 0.5;
      case 'low': return 0.25;
      default: return 0.0;
    }
  }

  /**
   * Generate neural network model configuration
   */
  generateModelConfig(datasetId: string): NeuralModelConfig {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    return {
      modelType: 'classification',
      architecture: 'feedforward',
      inputFeatures: dataset.metadata.features,
      outputClasses: ['normal', 'low', 'medium', 'high', 'critical'],
      trainingParams: {
        batchSize: 32,
        epochs: 100,
        learningRate: 0.001,
        validationSplit: 0.2
      }
    };
  }

  /**
   * Export dataset in TensorFlow.js format
   */
  exportToTensorFlowJS(datasetId: string): void {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Prepare feature matrix
    const features = dataset.samples.map(sample => [
      sample.features.messageCount,
      sample.features.repetitionCount,
      sample.features.timeSpan / 1000, // Normalize to seconds
      sample.features.bufferSize / 1000, // Normalize to KB
      sample.features.connectionCount,
      sample.features.outputPosition / 1000, // Normalize
      sample.features.severity
    ]);

    // Prepare labels (one-hot encoded)
    const labels = dataset.samples.map(sample => {
      const severityIndex = ['low', 'medium', 'high', 'critical'].indexOf(sample.label.severity);
      return sample.label.isAntiPattern ? severityIndex + 1 : 0; // 0 = normal
    });

    const tfData = {
      features,
      labels,
      metadata: {
        ...dataset.metadata,
        inputShape: [features[0].length],
        outputShape: [5], // 5 classes: normal, low, medium, high, critical
        normalizationParams: {
          timeSpan: { max: Math.max(...dataset.samples.map(s => s.features.timeSpan)) },
          bufferSize: { max: Math.max(...dataset.samples.map(s => s.features.bufferSize)) },
          outputPosition: { max: Math.max(...dataset.samples.map(s => s.features.outputPosition)) }
        }
      }
    };

    const tfExportPath = join(this.exportDir, `${datasetId}-tensorflow.json`);
    writeFileSync(tfExportPath, JSON.stringify(tfData, null, 2));
    
    console.log(`🤖 Exported TensorFlow.js dataset: ${tfExportPath}`);
  }

  /**
   * Export dataset in PyTorch format
   */
  exportToPyTorch(datasetId: string): void {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const pytorchData = {
      train_data: dataset.samples.map(sample => ({
        features: [
          sample.features.messageCount,
          sample.features.repetitionCount,
          sample.features.timeSpan,
          sample.features.bufferSize,
          sample.features.connectionCount,
          sample.features.outputPosition,
          sample.features.severity
        ],
        label: sample.label.isAntiPattern ? 1 : 0,
        severity: sample.label.severity,
        anti_pattern_type: sample.label.antiPatternType
      })),
      metadata: dataset.metadata
    };

    const pytorchExportPath = join(this.exportDir, `${datasetId}-pytorch.json`);
    writeFileSync(pytorchExportPath, JSON.stringify(pytorchData, null, 2));
    
    console.log(`🐍 Exported PyTorch dataset: ${pytorchExportPath}`);
  }

  /**
   * Generate training script for the dataset
   */
  generateTrainingScript(datasetId: string, framework: 'tensorflow' | 'pytorch'): string {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    if (framework === 'tensorflow') {
      return `
/**
 * TensorFlow.js Training Script for ${dataset.name}
 * Generated by NLD Neural Training Export System
 */

import * as tf from '@tensorflow/tfjs';
import { readFileSync } from 'fs';

async function trainSSEAntiPatternModel() {
  // Load dataset
  const datasetPath = '${datasetId}-tensorflow.json';
  const rawData = JSON.parse(readFileSync(datasetPath, 'utf8'));
  
  // Prepare tensors
  const features = tf.tensor2d(rawData.features);
  const labels = tf.tensor1d(rawData.labels, 'int32');
  
  // Create model
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [${dataset.metadata.features.length}], units: 64, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.3 }),
      tf.layers.dense({ units: 32, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.2 }),
      tf.layers.dense({ units: 5, activation: 'softmax' }) // 5 severity classes
    ]
  });
  
  // Compile model
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'sparseCategoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  // Train model
  console.log('Training SSE Anti-Pattern Detection Model...');
  await model.fit(features, labels, {
    epochs: 100,
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(\`Epoch \${epoch + 1}: loss = \${logs.loss.toFixed(4)}, accuracy = \${logs.acc.toFixed(4)}\`);
      }
    }
  });
  
  // Save model
  await model.save('file://./sse-antipattern-model');
  console.log('Model saved to ./sse-antipattern-model');
  
  // Test model
  const testSample = tf.tensor2d([[100, 1000, 5000, 2048, 5, 1024, 1.0]]); // Critical pattern
  const prediction = model.predict(testSample) as tf.Tensor;
  const predictedClass = await prediction.argMax(-1).data();
  console.log('Test prediction:', predictedClass[0]); // Should be 4 (critical)
}

trainSSEAntiPatternModel().catch(console.error);
      `;
    } else {
      return `
# PyTorch Training Script for ${dataset.name}
# Generated by NLD Neural Training Export System

import torch
import torch.nn as nn
import torch.optim as optim
import json
import numpy as np
from sklearn.model_selection import train_test_split

class SSEAntiPatternClassifier(nn.Module):
    def __init__(self, input_size=7, hidden_size=64, num_classes=5):
        super(SSEAntiPatternClassifier, self).__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.dropout1 = nn.Dropout(0.3)
        self.fc2 = nn.Linear(hidden_size, hidden_size // 2)
        self.dropout2 = nn.Dropout(0.2)
        self.fc3 = nn.Linear(hidden_size // 2, num_classes)
        self.relu = nn.ReLU()
        
    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.dropout1(x)
        x = self.relu(self.fc2(x))
        x = self.dropout2(x)
        x = self.fc3(x)
        return x

def train_model():
    # Load dataset
    with open('${datasetId}-pytorch.json', 'r') as f:
        data = json.load(f)
    
    # Prepare data
    features = np.array([sample['features'] for sample in data['train_data']])
    labels = np.array([sample['label'] for sample in data['train_data']])
    
    # Split data
    X_train, X_val, y_train, y_val = train_test_split(features, labels, test_size=0.2, random_state=42)
    
    # Convert to tensors
    X_train = torch.FloatTensor(X_train)
    X_val = torch.FloatTensor(X_val)
    y_train = torch.LongTensor(y_train)
    y_val = torch.LongTensor(y_val)
    
    # Initialize model
    model = SSEAntiPatternClassifier()
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    # Training loop
    print('Training SSE Anti-Pattern Detection Model...')
    for epoch in range(100):
        model.train()
        optimizer.zero_grad()
        outputs = model(X_train)
        loss = criterion(outputs, y_train)
        loss.backward()
        optimizer.step()
        
        # Validation
        if epoch % 10 == 0:
            model.eval()
            with torch.no_grad():
                val_outputs = model(X_val)
                val_loss = criterion(val_outputs, y_val)
                _, predicted = torch.max(val_outputs.data, 1)
                accuracy = (predicted == y_val).sum().item() / y_val.size(0)
                
                print(f'Epoch {epoch}: Loss = {loss.item():.4f}, Val Loss = {val_loss.item():.4f}, Accuracy = {accuracy:.4f}')
    
    # Save model
    torch.save(model.state_dict(), 'sse_antipattern_model.pth')
    print('Model saved to sse_antipattern_model.pth')
    
    # Test model
    test_sample = torch.FloatTensor([[100, 1000, 5000, 2048, 5, 1024, 1.0]])  # Critical pattern
    model.eval()
    with torch.no_grad():
        prediction = model(test_sample)
        predicted_class = torch.max(prediction.data, 1)[1]
        print(f'Test prediction: {predicted_class.item()}')  # Should be 4 (critical)

if __name__ == '__main__':
    train_model()
      `;
    }
  }

  /**
   * Ensure export directory exists
   */
  private ensureExportDirectory(): void {
    if (!existsSync(this.exportDir)) {
      mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Persist dataset to storage
   */
  private persistDataset(dataset: NeuralTrainingDataset): void {
    try {
      const filePath = join(this.exportDir, `${dataset.datasetId}.json`);
      writeFileSync(filePath, JSON.stringify(dataset, null, 2));
      
      // Also export in both ML frameworks
      this.exportToTensorFlowJS(dataset.datasetId);
      this.exportToPyTorch(dataset.datasetId);
      
      // Generate training scripts
      const tfScript = this.generateTrainingScript(dataset.datasetId, 'tensorflow');
      const pytorchScript = this.generateTrainingScript(dataset.datasetId, 'pytorch');
      
      writeFileSync(join(this.exportDir, `${dataset.datasetId}-train.js`), tfScript);
      writeFileSync(join(this.exportDir, `${dataset.datasetId}-train.py`), pytorchScript);
      
    } catch (error) {
      console.error(`Failed to persist dataset ${dataset.datasetId}:`, error);
    }
  }

  /**
   * Get all datasets
   */
  getAllDatasets(): NeuralTrainingDataset[] {
    return Array.from(this.datasets.values());
  }

  /**
   * Get dataset statistics
   */
  getDatasetStatistics(): {
    totalDatasets: number;
    totalSamples: number;
    totalPositiveExamples: number;
    totalNegativeExamples: number;
    antiPatternBreakdown: { [key: string]: number };
  } {
    const datasets = this.getAllDatasets();
    const stats = {
      totalDatasets: datasets.length,
      totalSamples: 0,
      totalPositiveExamples: 0,
      totalNegativeExamples: 0,
      antiPatternBreakdown: {} as { [key: string]: number }
    };

    datasets.forEach(dataset => {
      stats.totalSamples += dataset.metadata.totalSamples;
      stats.totalPositiveExamples += dataset.metadata.positiveExamples;
      stats.totalNegativeExamples += dataset.metadata.negativeExamples;

      dataset.samples.forEach(sample => {
        if (sample.label.isAntiPattern) {
          const antiPattern = sample.label.antiPatternType;
          stats.antiPatternBreakdown[antiPattern] = (stats.antiPatternBreakdown[antiPattern] || 0) + 1;
        }
      });
    });

    return stats;
  }

  /**
   * Generate comprehensive neural training report
   */
  generateNeuralTrainingReport(): string {
    const stats = this.getDatasetStatistics();
    const datasets = this.getAllDatasets();
    
    let report = '=== SSE Neural Training Export Report ===\n\n';
    
    report += `🤖 TRAINING DATA STATISTICS:\n`;
    report += `- Total Datasets: ${stats.totalDatasets}\n`;
    report += `- Total Training Samples: ${stats.totalSamples}\n`;
    report += `- Positive Examples (Anti-Patterns): ${stats.totalPositiveExamples}\n`;
    report += `- Negative Examples (Normal): ${stats.totalNegativeExamples}\n`;
    report += `- Balance Ratio: ${(stats.totalPositiveExamples / stats.totalNegativeExamples).toFixed(2)}:1\n\n`;
    
    report += `📈 ANTI-PATTERN BREAKDOWN:\n`;
    Object.entries(stats.antiPatternBreakdown).forEach(([pattern, count]) => {
      report += `- ${pattern}: ${count} samples\n`;
    });
    report += '\n';
    
    report += `📁 GENERATED DATASETS:\n`;
    datasets.forEach(dataset => {
      report += `- ${dataset.name}:\n`;
      report += `  ID: ${dataset.datasetId}\n`;
      report += `  Samples: ${dataset.metadata.totalSamples}\n`;
      report += `  Features: ${dataset.metadata.features.join(', ')}\n`;
      report += `  Created: ${dataset.createdAt}\n\n`;
    });
    
    report += `🚀 READY FOR NEURAL TRAINING:\n`;
    report += `- TensorFlow.js datasets: ${stats.totalDatasets}\n`;
    report += `- PyTorch datasets: ${stats.totalDatasets}\n`;
    report += `- Training scripts generated\n`;
    report += `- Export directory: ${this.exportDir}\n`;
    
    return report;
  }
}

export default SSENeuralTrainingExport;