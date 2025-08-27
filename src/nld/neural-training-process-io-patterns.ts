/**
 * Neural Training Export System for Process I/O Patterns
 * Exports failure patterns and prevention strategies for claude-flow neural training
 * Generated: 2025-08-27
 */

import { ProcessIOAntiPatternsDatabase, ProcessIOFailurePattern } from './process-io-anti-patterns-database';
import { TDDProcessIOPreventionStrategies, TDDTestPattern } from './tdd-process-io-prevention-strategies';
import { StdoutCaptureMetrics } from './stdout-capture-failure-monitor';

export interface NeuralTrainingPattern {
  patternId: string;
  patternType: 'failure' | 'prevention' | 'success';
  domain: 'process-io' | 'sse-streaming' | 'terminal-integration';
  complexity: 'simple' | 'medium' | 'complex';
  confidence: number; // 0-100
  trainingData: {
    inputs: Record<string, any>;
    expectedOutputs: Record<string, any>;
    contextFeatures: string[];
  };
  metadata: {
    severity: string;
    frequency: number;
    lastSeen: string;
    preventionStrategy?: string;
  };
}

export interface ClaudeFlowNeuralExport {
  exportId: string;
  timestamp: string;
  version: string;
  domain: 'process-io-capture';
  totalPatterns: number;
  patterns: NeuralTrainingPattern[];
  trainingRecommendations: string[];
  successMetrics: {
    preventedFailures: number;
    improvementScore: number;
    tddCoverage: number;
  };
}

export class NeuralTrainingProcessIOPatterns {
  private antiPatternsDB: ProcessIOAntiPatternsDatabase;
  private preventionStrategies: TDDProcessIOPreventionStrategies;
  private exportHistory: Map<string, ClaudeFlowNeuralExport> = new Map();

  constructor() {
    this.antiPatternsDB = new ProcessIOAntiPatternsDatabase();
    this.preventionStrategies = new TDDProcessIOPreventionStrategies();
  }

  public generateNeuralExport(
    instanceMetrics?: Map<string, StdoutCaptureMetrics>
  ): ClaudeFlowNeuralExport {
    const exportId = `process-io-${Date.now()}`;
    const timestamp = new Date().toISOString();

    console.log(`🧠 Generating neural export for process I/O patterns: ${exportId}`);

    const failurePatterns = this.convertFailurePatternsToNeural();
    const preventionPatterns = this.convertPreventionPatternsToNeural();
    const successPatterns = this.generateSuccessPatterns(instanceMetrics);

    const allPatterns = [
      ...failurePatterns,
      ...preventionPatterns,
      ...successPatterns
    ];

    const neuralExport: ClaudeFlowNeuralExport = {
      exportId,
      timestamp,
      version: '1.0.0',
      domain: 'process-io-capture',
      totalPatterns: allPatterns.length,
      patterns: allPatterns,
      trainingRecommendations: this.generateTrainingRecommendations(),
      successMetrics: this.calculateSuccessMetrics(instanceMetrics)
    };

    this.exportHistory.set(exportId, neuralExport);
    console.log(`✅ Neural export generated: ${allPatterns.length} patterns`);

    return neuralExport;
  }

  private convertFailurePatternsToNeural(): NeuralTrainingPattern[] {
    const failurePatterns = this.antiPatternsDB.getAllPatterns();
    
    return failurePatterns.map((pattern): NeuralTrainingPattern => {
      const complexity = this.determineComplexity(pattern);
      const confidence = this.calculateConfidence(pattern);

      return {
        patternId: pattern.patternId,
        patternType: 'failure',
        domain: this.mapToDomain(pattern.patternName),
        complexity,
        confidence,
        trainingData: {
          inputs: {
            processSpawned: true,
            handlerRegistered: pattern.patternId !== 'STDOUT_HANDLER_SILENT',
            sseConnected: true,
            outputExpected: true,
            timeoutThreshold: 5000
          },
          expectedOutputs: {
            success: false,
            failureType: pattern.patternId,
            errorCode: pattern.patternId,
            recoverySuggestion: pattern.tddPreventionStrategy
          },
          contextFeatures: [
            'process-lifecycle',
            'stdout-handlers',
            'sse-connections',
            'timing-dependencies',
            'error-recovery'
          ]
        },
        metadata: {
          severity: pattern.impactAssessment.severity,
          frequency: this.estimateFrequency(pattern),
          lastSeen: new Date().toISOString(),
          preventionStrategy: pattern.tddPreventionStrategy
        }
      };
    });
  }

  private convertPreventionPatternsToNeural(): NeuralTrainingPattern[] {
    const preventionPatterns = this.preventionStrategies.getAllTestPatterns();
    
    return preventionPatterns.map((pattern): NeuralTrainingPattern => {
      return {
        patternId: pattern.testId,
        patternType: 'prevention',
        domain: 'process-io',
        complexity: this.mapTestComplexity(pattern.testCategory),
        confidence: 95, // High confidence in prevention patterns
        trainingData: {
          inputs: {
            testType: pattern.testCategory,
            preventedFailures: pattern.preventedFailures,
            timeoutThreshold: pattern.timeoutThreshold,
            mockingRequired: pattern.mockingStrategy.length > 0
          },
          expectedOutputs: {
            success: true,
            preventionEffective: true,
            testPassed: true,
            coverage: pattern.preventedFailures.length
          },
          contextFeatures: [
            'test-driven-development',
            'failure-prevention',
            'mock-testing',
            'integration-testing',
            'timeout-handling'
          ]
        },
        metadata: {
          severity: 'prevention',
          frequency: 1, // Always applicable
          lastSeen: new Date().toISOString(),
          preventionStrategy: pattern.description
        }
      };
    });
  }

  private generateSuccessPatterns(
    instanceMetrics?: Map<string, StdoutCaptureMetrics>
  ): NeuralTrainingPattern[] {
    if (!instanceMetrics) return [];

    const successfulInstances = Array.from(instanceMetrics.entries())
      .filter(([_, metrics]) => metrics.captureHealthScore > 80)
      .slice(0, 10); // Limit to 10 success patterns

    return successfulInstances.map(([instanceId, metrics]): NeuralTrainingPattern => {
      return {
        patternId: `SUCCESS_${instanceId}`,
        patternType: 'success',
        domain: 'process-io',
        complexity: 'simple',
        confidence: Math.min(95, metrics.captureHealthScore),
        trainingData: {
          inputs: {
            processSpawned: !!metrics.processSpawnTime,
            handlerRegistered: !!metrics.handlerRegistrationTime,
            firstOutputReceived: !!metrics.firstOutputTime,
            sseConnected: metrics.activeConnections > 0,
            outputEvents: metrics.totalOutputEvents
          },
          expectedOutputs: {
            success: true,
            healthScore: metrics.captureHealthScore,
            failedBroadcasts: metrics.failedBroadcasts,
            outputLatency: this.calculateOutputLatency(metrics)
          },
          contextFeatures: [
            'successful-capture',
            'healthy-metrics',
            'reliable-streaming',
            'connection-stability'
          ]
        },
        metadata: {
          severity: 'success',
          frequency: 1,
          lastSeen: new Date().toISOString()
        }
      };
    });
  }

  private determineComplexity(pattern: ProcessIOFailurePattern): 'simple' | 'medium' | 'complex' {
    const triggerCount = pattern.commonTriggers.length;
    const symptomCount = pattern.failureSymptoms.length;
    
    if (triggerCount <= 2 && symptomCount <= 3) return 'simple';
    if (triggerCount <= 4 && symptomCount <= 6) return 'medium';
    return 'complex';
  }

  private calculateConfidence(pattern: ProcessIOFailurePattern): number {
    // Base confidence on severity and symptom clarity
    const severityScore = {
      'critical': 95,
      'high': 85,
      'medium': 75,
      'low': 65
    }[pattern.impactAssessment.severity];

    const symptomClarityBonus = Math.min(10, pattern.failureSymptoms.length);
    
    return Math.min(100, severityScore + symptomClarityBonus);
  }

  private mapToDomain(patternName: string): 'process-io' | 'sse-streaming' | 'terminal-integration' {
    if (patternName.toLowerCase().includes('sse') || patternName.toLowerCase().includes('broadcast')) {
      return 'sse-streaming';
    }
    if (patternName.toLowerCase().includes('terminal')) {
      return 'terminal-integration';
    }
    return 'process-io';
  }

  private mapTestComplexity(category: string): 'simple' | 'medium' | 'complex' {
    const complexityMap = {
      'unit': 'simple',
      'integration': 'medium',
      'end-to-end': 'complex'
    } as const;
    
    return complexityMap[category as keyof typeof complexityMap] || 'medium';
  }

  private estimateFrequency(pattern: ProcessIOFailurePattern): number {
    // Estimate based on severity and common triggers
    const severityMultiplier = {
      'critical': 0.8,
      'high': 0.6,
      'medium': 0.4,
      'low': 0.2
    }[pattern.impactAssessment.severity];

    const triggerComplexity = pattern.commonTriggers.length / 5; // Normalize to 0-1
    
    return Math.min(1, severityMultiplier + triggerComplexity);
  }

  private calculateOutputLatency(metrics: StdoutCaptureMetrics): number {
    if (!metrics.processSpawnTime || !metrics.firstOutputTime) return -1;
    
    return metrics.firstOutputTime.getTime() - metrics.processSpawnTime.getTime();
  }

  private generateTrainingRecommendations(): string[] {
    return [
      'Train on process initialization timing patterns to predict stdout readiness',
      'Build SSE connection health models using broadcast success rates',
      'Develop race condition detection using connection establishment timing',
      'Create failure recovery patterns based on connection cleanup effectiveness',
      'Train timeout threshold optimization using latency distribution data',
      'Build process health prediction models using early output characteristics',
      'Develop proactive failure detection using output flow patterns'
    ];
  }

  private calculateSuccessMetrics(
    instanceMetrics?: Map<string, StdoutCaptureMetrics>
  ): { preventedFailures: number; improvementScore: number; tddCoverage: number } {
    if (!instanceMetrics) {
      return {
        preventedFailures: 0,
        improvementScore: 0,
        tddCoverage: 0
      };
    }

    const totalInstances = instanceMetrics.size;
    const healthyInstances = Array.from(instanceMetrics.values())
      .filter(m => m.captureHealthScore > 70).length;
    
    const preventionPatterns = this.preventionStrategies.getAllTestPatterns();
    const failurePatterns = this.antiPatternsDB.getAllPatterns();
    
    return {
      preventedFailures: healthyInstances,
      improvementScore: Math.round((healthyInstances / totalInstances) * 100) || 0,
      tddCoverage: Math.round((preventionPatterns.length / failurePatterns.length) * 100) || 0
    };
  }

  public exportToClaudeFlow(neuralExport: ClaudeFlowNeuralExport): void {
    // In production, this would integrate with claude-flow neural training system
    console.log(`🚀 Exporting to claude-flow neural training:`);
    console.log(`   Export ID: ${neuralExport.exportId}`);
    console.log(`   Pattern Count: ${neuralExport.totalPatterns}`);
    console.log(`   Domain: ${neuralExport.domain}`);
    console.log(`   Success Rate: ${neuralExport.successMetrics.improvementScore}%`);
    
    // Save to neural exports directory for claude-flow pickup
    this.saveNeuralExport(neuralExport);
  }

  private saveNeuralExport(neuralExport: ClaudeFlowNeuralExport): void {
    // Save to file system for claude-flow integration
    const fs = require('fs');
    const path = require('path');
    
    const exportsDir = '/workspaces/agent-feed/neural-exports';
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const exportPath = path.join(exportsDir, `${neuralExport.exportId}.json`);
    fs.writeFileSync(exportPath, JSON.stringify(neuralExport, null, 2));
    
    console.log(`💾 Neural export saved: ${exportPath}`);
  }

  public getExportHistory(): ClaudeFlowNeuralExport[] {
    return Array.from(this.exportHistory.values());
  }

  public generateClaudeFlowIntegration(): string {
    return `/**
 * Claude-Flow Neural Training Integration
 * Process I/O Capture Patterns
 * Generated: ${new Date().toISOString()}
 */

// Integration with claude-flow neural training system
import { NeuralTrainingProcessIOPatterns } from './neural-training-process-io-patterns';

export async function integrateWithClaudeFlow() {
  const neuralTraining = new NeuralTrainingProcessIOPatterns();
  
  // Generate neural export
  const neuralExport = neuralTraining.generateNeuralExport();
  
  // Export to claude-flow
  neuralTraining.exportToClaudeFlow(neuralExport);
  
  console.log('🧠 Process I/O patterns integrated with claude-flow neural training');
  
  return neuralExport;
}

// Hook for claude-flow to pull training data
export function pullProcessIOTrainingData() {
  const neuralTraining = new NeuralTrainingProcessIOPatterns();
  return neuralTraining.generateNeuralExport();
}`;
  }
}

// Singleton for global neural training integration
export const neuralTrainingProcessIO = new NeuralTrainingProcessIOPatterns();