/**
 * Neural Training Data Export for SSE Endpoint Mismatch Patterns
 * 
 * Exports comprehensive training datasets from endpoint mismatch patterns
 * for claude-flow neural network training to prevent similar API versioning
 * inconsistencies in future development.
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { sseEndpointMismatchDetector, EndpointMismatchPattern, NeuralTrainingFeature } from './sse-endpoint-mismatch-pattern-detector';

export interface NeuralTrainingDataset {
    metadata: {
        datasetId: string;
        version: string;
        createdAt: string;
        patternType: string;
        totalSamples: number;
        featureCount: number;
    };
    
    // Training samples
    trainingData: TrainingSample[];
    
    // Feature definitions
    features: FeatureDefinition[];
    
    // Model configuration
    modelConfig: ModelConfiguration;
    
    // Validation data
    validationSamples: ValidationSample[];
    
    // Claude-flow integration
    claudeFlowConfig: ClaudeFlowIntegrationConfig;
}

export interface TrainingSample {
    id: string;
    patternId: string;
    
    // Input features
    features: { [key: string]: number };
    
    // Expected outputs
    labels: {
        willFail: number;           // 0-1 probability of failure
        severity: number;           // 0-1 severity score
        failureType: string;        // classification label
        preventionNeeded: number;   // 0-1 prevention urgency
    };
    
    // Context
    context: {
        endpointType: 'sse' | 'rest' | 'websocket';
        versioningPattern: string;
        applicationDomain: string;
    };
    
    // Quality metrics
    quality: {
        confidence: number;
        reliability: number;
        completeness: number;
    };
}

export interface FeatureDefinition {
    name: string;
    type: 'numeric' | 'categorical' | 'boolean';
    description: string;
    importance: number;
    normalizationRange?: [number, number];
    categories?: string[];
}

export interface ModelConfiguration {
    architecture: 'feedforward' | 'lstm' | 'transformer';
    layers: LayerConfig[];
    optimizer: OptimizerConfig;
    lossFunction: string;
    metrics: string[];
    hyperparameters: { [key: string]: any };
}

export interface LayerConfig {
    type: string;
    units?: number;
    activation?: string;
    dropout?: number;
    regularization?: string;
}

export interface OptimizerConfig {
    type: 'adam' | 'sgd' | 'rmsprop';
    learningRate: number;
    decay?: number;
    momentum?: number;
}

export interface ValidationSample {
    input: { [key: string]: number };
    expectedOutput: any;
    actualOutput?: any;
    accuracy?: number;
}

export interface ClaudeFlowIntegrationConfig {
    modelType: 'pattern-detection' | 'failure-prediction' | 'prevention-strategy';
    integrationEndpoint: string;
    trainingMode: 'supervised' | 'unsupervised' | 'reinforcement';
    
    // Neural patterns integration
    neuralPatterns: {
        patternType: string;
        confidence: number;
        applicability: string[];
    }[];
    
    // Hook integration
    hooks: {
        preTrain: string[];
        postTrain: string[];
        onFailure: string[];
    };
}

/**
 * Main neural training data exporter
 */
export class NeuralTrainingEndpointMismatchExporter {
    private exportPath: string;
    
    constructor(exportPath: string = '/workspaces/agent-feed/src/nld/neural-training') {
        this.exportPath = exportPath;
        this.ensureExportDirectory();
    }
    
    /**
     * Export comprehensive training dataset
     */
    public async exportTrainingDataset(): Promise<NeuralTrainingDataset> {
        console.log('🧠 [NLD] Starting neural training data export...');
        
        // Get all detected patterns
        const patterns = sseEndpointMismatchDetector.getAllPatterns();
        
        if (patterns.length === 0) {
            console.log('⚠️ [NLD] No patterns available for export. Running detection first...');
            await sseEndpointMismatchDetector.detectEndpointMismatches();
            const newPatterns = sseEndpointMismatchDetector.getAllPatterns();
            return this.createDatasetFromPatterns(newPatterns);
        }
        
        return this.createDatasetFromPatterns(patterns);
    }
    
    /**
     * Create comprehensive dataset from patterns
     */
    private createDatasetFromPatterns(patterns: EndpointMismatchPattern[]): NeuralTrainingDataset {
        const datasetId = `endpoint_mismatch_training_${Date.now()}`;
        
        // Generate training samples
        const trainingSamples = this.generateTrainingSamples(patterns);
        
        // Define features
        const features = this.defineFeatures(patterns);
        
        // Configure model
        const modelConfig = this.createModelConfiguration();
        
        // Generate validation samples
        const validationSamples = this.generateValidationSamples(patterns);
        
        // Create claude-flow integration config
        const claudeFlowConfig = this.createClaudeFlowConfig();
        
        const dataset: NeuralTrainingDataset = {
            metadata: {
                datasetId,
                version: '1.0.0',
                createdAt: new Date().toISOString(),
                patternType: 'api_endpoint_path_version_mismatch',
                totalSamples: trainingSamples.length,
                featureCount: features.length
            },
            trainingData: trainingSamples,
            features,
            modelConfig,
            validationSamples,
            claudeFlowConfig
        };
        
        // Export dataset
        this.saveDataset(dataset);
        
        console.log(`✅ [NLD] Exported neural training dataset: ${datasetId}`);
        console.log(`   - Training samples: ${trainingSamples.length}`);
        console.log(`   - Features: ${features.length}`);
        console.log(`   - Validation samples: ${validationSamples.length}`);
        
        return dataset;
    }
    
    /**
     * Generate training samples from patterns
     */
    private generateTrainingSamples(patterns: EndpointMismatchPattern[]): TrainingSample[] {
        const samples: TrainingSample[] = [];
        
        patterns.forEach((pattern, patternIndex) => {
            // Create positive samples (failure cases)
            pattern.versioningInconsistencies.forEach((inconsistency, incIndex) => {
                const sampleId = `${pattern.id}_positive_${incIndex}`;
                
                samples.push({
                    id: sampleId,
                    patternId: pattern.id,
                    features: this.extractFeaturesFromInconsistency(pattern, inconsistency, true),
                    labels: {
                        willFail: 1.0,
                        severity: inconsistency.severity,
                        failureType: inconsistency.type,
                        preventionNeeded: 1.0
                    },
                    context: {
                        endpointType: inconsistency.frontendPath.includes('stream') ? 'sse' : 'rest',
                        versioningPattern: this.getVersioningPattern(inconsistency),
                        applicationDomain: 'claude-code-terminal'
                    },
                    quality: {
                        confidence: 0.95,
                        reliability: 0.9,
                        completeness: 0.85
                    }
                });
            });
            
            // Create negative samples (working cases)
            pattern.restEndpoints.filter(e => e.status === 'working').forEach((endpoint, endpIndex) => {
                const sampleId = `${pattern.id}_negative_${endpIndex}`;
                
                samples.push({
                    id: sampleId,
                    patternId: pattern.id,
                    features: this.extractFeaturesFromEndpoint(pattern, endpoint, false),
                    labels: {
                        willFail: 0.0,
                        severity: 0.1,
                        failureType: 'no_failure',
                        preventionNeeded: 0.0
                    },
                    context: {
                        endpointType: 'rest',
                        versioningPattern: 'consistent_v1',
                        applicationDomain: 'claude-code-terminal'
                    },
                    quality: {
                        confidence: 0.9,
                        reliability: 0.95,
                        completeness: 0.9
                    }
                });
            });
        });
        
        return samples;
    }
    
    /**
     * Extract features from versioning inconsistency
     */
    private extractFeaturesFromInconsistency(
        pattern: EndpointMismatchPattern, 
        inconsistency: any, 
        isFailureCase: boolean
    ): { [key: string]: number } {
        const features: { [key: string]: number } = {};
        
        // Basic pattern features
        features['pattern_severity'] = pattern.severity === 'high' ? 1.0 : pattern.severity === 'medium' ? 0.5 : 0.0;
        features['inconsistency_count'] = pattern.versioningInconsistencies.length;
        features['sse_endpoint_count'] = pattern.sseEndpoints.length;
        features['rest_endpoint_count'] = pattern.restEndpoints.length;
        
        // Inconsistency-specific features
        features['inconsistency_severity'] = inconsistency.severity;
        features['is_path_mismatch'] = inconsistency.type === 'path_mismatch' ? 1.0 : 0.0;
        features['is_protocol_mismatch'] = inconsistency.type === 'protocol_mismatch' ? 1.0 : 0.0;
        features['evidence_count'] = inconsistency.evidence ? inconsistency.evidence.length : 0;
        
        // Path analysis features
        features['frontend_has_version'] = inconsistency.frontendPath.includes('/v1/') ? 1.0 : 0.0;
        features['backend_has_version'] = inconsistency.backendPath.includes('/v1/') ? 1.0 : 0.0;
        features['is_sse_endpoint'] = inconsistency.frontendPath.includes('stream') ? 1.0 : 0.0;
        features['is_terminal_endpoint'] = inconsistency.frontendPath.includes('terminal') ? 1.0 : 0.0;
        
        // Context features
        features['failure_probability'] = pattern.riskAssessment.failureProbability;
        features['impact_score'] = pattern.riskAssessment.impactScore;
        features['detection_confidence'] = pattern.riskAssessment.detectionConfidence;
        features['business_impact_count'] = pattern.riskAssessment.businessImpact.length;
        
        // Application features
        features['has_claude_instances'] = inconsistency.frontendPath.includes('claude') ? 1.0 : 0.0;
        features['has_terminal_functionality'] = inconsistency.frontendPath.includes('terminal') ? 1.0 : 0.0;
        
        return features;
    }
    
    /**
     * Extract features from working endpoint
     */
    private extractFeaturesFromEndpoint(
        pattern: EndpointMismatchPattern,
        endpoint: any,
        isFailureCase: boolean
    ): { [key: string]: number } {
        const features: { [key: string]: number } = {};
        
        // Basic features
        features['pattern_severity'] = 0.0; // No severity for working endpoints
        features['inconsistency_count'] = 0;
        features['sse_endpoint_count'] = pattern.sseEndpoints.length;
        features['rest_endpoint_count'] = pattern.restEndpoints.length;
        
        // Endpoint features
        features['inconsistency_severity'] = 0.0;
        features['is_path_mismatch'] = 0.0;
        features['is_protocol_mismatch'] = 0.0;
        features['evidence_count'] = 0;
        
        // Path analysis
        features['frontend_has_version'] = endpoint.version === 'v1' ? 1.0 : 0.0;
        features['backend_has_version'] = endpoint.version === 'v1' ? 1.0 : 0.0;
        features['is_sse_endpoint'] = endpoint.usage === 'sse' ? 1.0 : 0.0;
        features['is_terminal_endpoint'] = endpoint.path.includes('terminal') ? 1.0 : 0.0;
        
        // Positive context
        features['failure_probability'] = 0.05; // Low probability for working endpoints
        features['impact_score'] = 0.0;
        features['detection_confidence'] = 0.9;
        features['business_impact_count'] = 0;
        
        // Application features
        features['has_claude_instances'] = endpoint.path.includes('claude') ? 1.0 : 0.0;
        features['has_terminal_functionality'] = endpoint.path.includes('terminal') ? 1.0 : 0.0;
        
        return features;
    }
    
    /**
     * Get versioning pattern description
     */
    private getVersioningPattern(inconsistency: any): string {
        if (inconsistency.type === 'path_mismatch') {
            if (inconsistency.frontendPath.includes('/api/v1/')) return 'frontend_versioned_backend_unversioned';
            if (inconsistency.backendPath.includes('/api/v1/')) return 'frontend_unversioned_backend_versioned';
            return 'path_structure_mismatch';
        }
        
        if (inconsistency.type === 'protocol_mismatch') {
            return 'mixed_protocol_versioning';
        }
        
        return 'unknown_pattern';
    }
    
    /**
     * Define neural network features
     */
    private defineFeatures(patterns: EndpointMismatchPattern[]): FeatureDefinition[] {
        const features: FeatureDefinition[] = [
            {
                name: 'pattern_severity',
                type: 'numeric',
                description: 'Overall pattern severity (0=low, 0.5=medium, 1=high)',
                importance: 0.9,
                normalizationRange: [0, 1]
            },
            {
                name: 'inconsistency_count',
                type: 'numeric',
                description: 'Number of versioning inconsistencies detected',
                importance: 0.85,
                normalizationRange: [0, 10]
            },
            {
                name: 'inconsistency_severity',
                type: 'numeric',
                description: 'Severity of specific inconsistency',
                importance: 0.95,
                normalizationRange: [0, 1]
            },
            {
                name: 'is_path_mismatch',
                type: 'boolean',
                description: 'Whether inconsistency is a path mismatch',
                importance: 0.8
            },
            {
                name: 'is_protocol_mismatch',
                type: 'boolean',
                description: 'Whether inconsistency is a protocol mismatch',
                importance: 0.75
            },
            {
                name: 'frontend_has_version',
                type: 'boolean',
                description: 'Whether frontend path includes version',
                importance: 0.7
            },
            {
                name: 'backend_has_version',
                type: 'boolean',
                description: 'Whether backend path includes version',
                importance: 0.7
            },
            {
                name: 'is_sse_endpoint',
                type: 'boolean',
                description: 'Whether endpoint is used for SSE',
                importance: 0.9
            },
            {
                name: 'failure_probability',
                type: 'numeric',
                description: 'Calculated failure probability',
                importance: 1.0,
                normalizationRange: [0, 1]
            },
            {
                name: 'impact_score',
                type: 'numeric',
                description: 'Business impact score',
                importance: 0.8,
                normalizationRange: [0, 1]
            }
        ];
        
        return features;
    }
    
    /**
     * Create model configuration for neural network
     */
    private createModelConfiguration(): ModelConfiguration {
        return {
            architecture: 'feedforward',
            layers: [
                {
                    type: 'dense',
                    units: 128,
                    activation: 'relu',
                    dropout: 0.2
                },
                {
                    type: 'dense',
                    units: 64,
                    activation: 'relu',
                    dropout: 0.1
                },
                {
                    type: 'dense',
                    units: 32,
                    activation: 'relu'
                },
                {
                    type: 'dense',
                    units: 4, // willFail, severity, failureType (3 classes), preventionNeeded
                    activation: 'sigmoid'
                }
            ],
            optimizer: {
                type: 'adam',
                learningRate: 0.001,
                decay: 0.0001
            },
            lossFunction: 'binary_crossentropy',
            metrics: ['accuracy', 'precision', 'recall', 'f1_score'],
            hyperparameters: {
                batchSize: 32,
                epochs: 100,
                validationSplit: 0.2,
                earlyStopping: {
                    patience: 10,
                    monitor: 'val_loss'
                }
            }
        };
    }
    
    /**
     * Generate validation samples
     */
    private generateValidationSamples(patterns: EndpointMismatchPattern[]): ValidationSample[] {
        const samples: ValidationSample[] = [];
        
        // Create validation scenarios
        const validationScenarios = [
            {
                description: 'SSE endpoint with version mismatch',
                input: {
                    pattern_severity: 1.0,
                    inconsistency_count: 1,
                    inconsistency_severity: 0.9,
                    is_path_mismatch: 1.0,
                    is_sse_endpoint: 1.0,
                    frontend_has_version: 0.0,
                    backend_has_version: 1.0,
                    failure_probability: 0.95
                },
                expectedOutput: {
                    willFail: 1.0,
                    severity: 0.9,
                    failureType: 'path_mismatch',
                    preventionNeeded: 1.0
                }
            },
            {
                description: 'REST endpoint with consistent versioning',
                input: {
                    pattern_severity: 0.0,
                    inconsistency_count: 0,
                    inconsistency_severity: 0.0,
                    is_path_mismatch: 0.0,
                    is_sse_endpoint: 0.0,
                    frontend_has_version: 1.0,
                    backend_has_version: 1.0,
                    failure_probability: 0.05
                },
                expectedOutput: {
                    willFail: 0.0,
                    severity: 0.0,
                    failureType: 'no_failure',
                    preventionNeeded: 0.0
                }
            }
        ];
        
        validationScenarios.forEach((scenario, index) => {
            samples.push({
                input: scenario.input,
                expectedOutput: scenario.expectedOutput
            });
        });
        
        return samples;
    }
    
    /**
     * Create claude-flow integration configuration
     */
    private createClaudeFlowConfig(): ClaudeFlowIntegrationConfig {
        return {
            modelType: 'pattern-detection',
            integrationEndpoint: 'npx claude-flow neural train endpoint-mismatch',
            trainingMode: 'supervised',
            
            neuralPatterns: [
                {
                    patternType: 'api_versioning_inconsistency',
                    confidence: 0.9,
                    applicability: ['api_development', 'sse_implementation', 'integration_testing']
                },
                {
                    patternType: 'endpoint_path_mismatch',
                    confidence: 0.85,
                    applicability: ['frontend_backend_integration', 'api_gateway_config']
                }
            ],
            
            hooks: {
                preTrain: [
                    'validate-training-data',
                    'normalize-features',
                    'split-dataset'
                ],
                postTrain: [
                    'evaluate-model',
                    'export-model',
                    'update-pattern-database'
                ],
                onFailure: [
                    'log-failure-details',
                    'trigger-retraining',
                    'notify-development-team'
                ]
            }
        };
    }
    
    /**
     * Save dataset to file system
     */
    private saveDataset(dataset: NeuralTrainingDataset): void {
        try {
            // Save main dataset
            const datasetFile = join(this.exportPath, `${dataset.metadata.datasetId}.json`);
            writeFileSync(datasetFile, JSON.stringify(dataset, null, 2));
            
            // Save claude-flow specific format
            const claudeFlowFile = join(this.exportPath, `${dataset.metadata.datasetId}_claude_flow.json`);
            const claudeFlowFormat = this.convertToClaudeFlowFormat(dataset);
            writeFileSync(claudeFlowFile, JSON.stringify(claudeFlowFormat, null, 2));
            
            // Save training script
            const trainingScript = this.generateTrainingScript(dataset);
            const scriptFile = join(this.exportPath, `train_${dataset.metadata.datasetId}.js`);
            writeFileSync(scriptFile, trainingScript);
            
            console.log(`💾 [NLD] Saved training dataset to:`);
            console.log(`   - Dataset: ${datasetFile}`);
            console.log(`   - Claude-Flow: ${claudeFlowFile}`);
            console.log(`   - Training script: ${scriptFile}`);
            
        } catch (error) {
            console.error('❌ [NLD] Failed to save training dataset:', error);
        }
    }
    
    /**
     * Convert to claude-flow neural format
     */
    private convertToClaudeFlowFormat(dataset: NeuralTrainingDataset): any {
        return {
            version: '2.0.0',
            type: 'pattern-detection-training',
            metadata: dataset.metadata,
            
            training: {
                samples: dataset.trainingData.map(sample => ({
                    input: Object.values(sample.features),
                    output: [
                        sample.labels.willFail,
                        sample.labels.severity,
                        sample.labels.preventionNeeded
                    ],
                    context: sample.context
                }))
            },
            
            model: {
                architecture: dataset.modelConfig.architecture,
                config: dataset.modelConfig,
                features: dataset.features
            },
            
            integration: dataset.claudeFlowConfig
        };
    }
    
    /**
     * Generate training script
     */
    private generateTrainingScript(dataset: NeuralTrainingDataset): string {
        return `#!/usr/bin/env node
/**
 * Auto-generated training script for ${dataset.metadata.datasetId}
 * 
 * Usage: node train_${dataset.metadata.datasetId}.js
 * Or with Claude Flow: npx claude-flow neural train ${dataset.metadata.datasetId}_claude_flow.json
 */

const { spawn } = require('child_process');
const path = require('path');

async function trainModel() {
    console.log('🚀 Starting neural training for endpoint mismatch detection...');
    
    const datasetPath = path.join(__dirname, '${dataset.metadata.datasetId}_claude_flow.json');
    
    // Train with claude-flow
    const claudeFlow = spawn('npx', [
        'claude-flow@alpha',
        'neural',
        'train',
        datasetPath,
        '--pattern-type', 'endpoint-mismatch',
        '--export-model', 'true',
        '--validate', 'true'
    ], {
        stdio: 'inherit'
    });
    
    claudeFlow.on('close', (code) => {
        if (code === 0) {
            console.log('✅ Training completed successfully!');
            console.log('📊 Model exported for pattern detection use');
        } else {
            console.error('❌ Training failed with code:', code);
        }
    });
}

// Auto-run if called directly
if (require.main === module) {
    trainModel().catch(console.error);
}

module.exports = { trainModel };
`;
    }
    
    /**
     * Ensure export directory exists
     */
    private ensureExportDirectory(): void {
        if (!existsSync(this.exportPath)) {
            mkdirSync(this.exportPath, { recursive: true });
            console.log(`📁 [NLD] Created export directory: ${this.exportPath}`);
        }
    }
    
    /**
     * Generate summary report
     */
    public generateExportSummary(dataset: NeuralTrainingDataset): any {
        return {
            export: {
                datasetId: dataset.metadata.datasetId,
                timestamp: dataset.metadata.createdAt,
                totalSamples: dataset.metadata.totalSamples,
                features: dataset.metadata.featureCount
            },
            
            quality: {
                averageConfidence: dataset.trainingData.reduce((sum, s) => sum + s.quality.confidence, 0) / dataset.trainingData.length,
                positiveNegativeRatio: this.calculatePositiveNegativeRatio(dataset.trainingData),
                featureCompleteness: this.calculateFeatureCompleteness(dataset.trainingData)
            },
            
            integration: {
                claudeFlowReady: true,
                trainingScriptGenerated: true,
                neuralPatternsCount: dataset.claudeFlowConfig.neuralPatterns.length
            },
            
            recommendations: [
                'Run training script to train the neural model',
                'Validate model performance on validation set',
                'Integrate trained model with development workflow',
                'Set up automated retraining on new pattern detection'
            ]
        };
    }
    
    /**
     * Calculate positive/negative sample ratio
     */
    private calculatePositiveNegativeRatio(samples: TrainingSample[]): number {
        const positive = samples.filter(s => s.labels.willFail > 0.5).length;
        const negative = samples.filter(s => s.labels.willFail <= 0.5).length;
        return negative > 0 ? positive / negative : positive;
    }
    
    /**
     * Calculate feature completeness
     */
    private calculateFeatureCompleteness(samples: TrainingSample[]): number {
        if (samples.length === 0) return 0;
        
        const totalFeatures = Object.keys(samples[0].features).length;
        const completeness = samples.map(sample => {
            const nonZeroFeatures = Object.values(sample.features).filter(v => v !== 0).length;
            return nonZeroFeatures / totalFeatures;
        });
        
        return completeness.reduce((sum, c) => sum + c, 0) / completeness.length;
    }
}

// Export singleton instance
export const neuralTrainingEndpointMismatchExporter = new NeuralTrainingEndpointMismatchExporter();