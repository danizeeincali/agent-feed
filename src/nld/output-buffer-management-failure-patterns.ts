/**
 * Output Buffer Management Failure Patterns Documentation
 * Documents and analyzes output buffer management failures in SSE streaming
 * Part of NLD (Neuro-Learning Development) system
 */

import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface BufferState {
  size: number;
  position: number;
  capacity: number;
  lastWrite: string;
  lastRead: string;
  overflowCount: number;
  underflowCount: number;
}

interface BufferFailurePattern {
  patternId: string;
  instanceId: string;
  failureType: 'overflow' | 'position_reset' | 'parser_corruption' | 'memory_leak' | 'duplicate_write';
  bufferType: 'global_output' | 'instance_buffer' | 'connection_buffer' | 'parser_buffer';
  bufferState: BufferState;
  failureDetails: {
    triggerCondition: string;
    reproducibilityRate: number;
    impactSeverity: 'low' | 'medium' | 'high' | 'critical';
    affectedConnections: number;
    dataLoss: boolean;
  };
  technicalCause: string;
  manifestation: string;
  detectedAt: string;
  stackTrace?: string;
}

interface ClaudeOutputParserFailure {
  patternId: string;
  instanceId: string;
  parserState: 'buffering' | 'processing' | 'outputting' | 'corrupted' | 'deadlocked';
  inputBuffer: {
    size: number;
    content: string;
    lastPosition: number;
  };
  outputBuffer: {
    size: number;
    content: string;
    writePosition: number;
    readPosition: number;
  };
  processingFailure: {
    stage: 'input_capture' | 'parsing' | 'output_generation' | 'streaming';
    errorType: 'infinite_loop' | 'position_corruption' | 'buffer_overflow' | 'state_corruption';
    errorMessage: string;
  };
  detectedAt: string;
}

interface SSEStreamingFailure {
  patternId: string;
  instanceId: string;
  streamingStage: 'connection_init' | 'message_broadcast' | 'buffer_write' | 'connection_cleanup';
  failureMode: 'broadcast_storm' | 'connection_leak' | 'message_duplication' | 'buffer_corruption';
  connectionDetails: {
    totalConnections: number;
    activeConnections: number;
    zombieConnections: number;
    failedBroadcasts: number;
  };
  messageDetails: {
    totalMessages: number;
    duplicateMessages: number;
    corruptedMessages: number;
    lostMessages: number;
  };
  detectedAt: string;
}

export class OutputBufferManagementFailurePatterns extends EventEmitter {
  private bufferFailures: BufferFailurePattern[] = [];
  private parserFailures: ClaudeOutputParserFailure[] = [];
  private streamingFailures: SSEStreamingFailure[] = [];
  private patternStorage: string;
  private bufferMonitoring: Map<string, BufferState> = new Map();

  constructor(storageDir: string) {
    super();
    this.patternStorage = join(storageDir, 'output-buffer-failure-patterns.json');
    this.loadExistingPatterns();
    console.log('📊 Output Buffer Management Failure Pattern Analyzer initialized');
  }

  /**
   * Document buffer overflow failure pattern
   */
  documentBufferOverflowFailure(
    instanceId: string, 
    bufferType: string, 
    currentSize: number, 
    capacity: number,
    triggerCondition: string,
    stackTrace?: string
  ): void {
    const bufferState: BufferState = {
      size: currentSize,
      position: currentSize,
      capacity,
      lastWrite: new Date().toISOString(),
      lastRead: '',
      overflowCount: 1,
      underflowCount: 0
    };

    const pattern: BufferFailurePattern = {
      patternId: `buffer-overflow-${instanceId}-${Date.now()}`,
      instanceId,
      failureType: 'overflow',
      bufferType: bufferType as any,
      bufferState,
      failureDetails: {
        triggerCondition,
        reproducibilityRate: this.calculateReproducibilityRate(instanceId, 'overflow'),
        impactSeverity: currentSize > capacity * 2 ? 'critical' : 'high',
        affectedConnections: 1,
        dataLoss: true
      },
      technicalCause: `Buffer size ${currentSize} exceeded capacity ${capacity}`,
      manifestation: 'Messages lost, memory allocation failures, system instability',
      detectedAt: new Date().toISOString(),
      stackTrace
    };

    this.recordBufferFailure(pattern);
    console.error(`💥 Buffer Overflow Failure: ${bufferType} buffer ${currentSize}/${capacity} bytes`);
  }

  /**
   * Document buffer position reset failure
   */
  documentPositionResetFailure(
    instanceId: string,
    bufferType: string,
    expectedPosition: number,
    actualPosition: number,
    content: string
  ): void {
    const bufferState: BufferState = {
      size: content.length,
      position: actualPosition,
      capacity: content.length,
      lastWrite: new Date().toISOString(),
      lastRead: new Date().toISOString(),
      overflowCount: 0,
      underflowCount: 1
    };

    const pattern: BufferFailurePattern = {
      patternId: `position-reset-${instanceId}-${Date.now()}`,
      instanceId,
      failureType: 'position_reset',
      bufferType: bufferType as any,
      bufferState,
      failureDetails: {
        triggerCondition: `Position reset from ${expectedPosition} to ${actualPosition}`,
        reproducibilityRate: this.calculateReproducibilityRate(instanceId, 'position_reset'),
        impactSeverity: 'critical',
        affectedConnections: 999, // Affects all connections
        dataLoss: false
      },
      technicalCause: 'Buffer read/write position tracking failure causing replay from beginning',
      manifestation: '1000+ duplicate messages streamed to frontend',
      detectedAt: new Date().toISOString()
    };

    this.recordBufferFailure(pattern);
    console.error(`🔄 Position Reset Failure: Expected ${expectedPosition}, got ${actualPosition}`);
  }

  /**
   * Document Claude output parser failure
   */
  documentClaudeOutputParserFailure(
    instanceId: string,
    parserState: string,
    inputSize: number,
    inputContent: string,
    outputSize: number,
    outputContent: string,
    errorStage: string,
    errorType: string,
    errorMessage: string
  ): void {
    const failure: ClaudeOutputParserFailure = {
      patternId: `parser-failure-${instanceId}-${Date.now()}`,
      instanceId,
      parserState: parserState as any,
      inputBuffer: {
        size: inputSize,
        content: inputContent.substring(0, 500),
        lastPosition: inputSize
      },
      outputBuffer: {
        size: outputSize,
        content: outputContent.substring(0, 500),
        writePosition: outputSize,
        readPosition: 0
      },
      processingFailure: {
        stage: errorStage as any,
        errorType: errorType as any,
        errorMessage
      },
      detectedAt: new Date().toISOString()
    };

    this.parserFailures.push(failure);
    this.persistPatterns();
    console.error(`🤖 Claude Parser Failure: ${errorType} in ${errorStage} - ${errorMessage}`);
  }

  /**
   * Document SSE streaming failure
   */
  documentSSEStreamingFailure(
    instanceId: string,
    streamingStage: string,
    failureMode: string,
    connectionStats: { total: number; active: number; zombie: number; failed: number },
    messageStats: { total: number; duplicates: number; corrupted: number; lost: number }
  ): void {
    const failure: SSEStreamingFailure = {
      patternId: `sse-streaming-${instanceId}-${Date.now()}`,
      instanceId,
      streamingStage: streamingStage as any,
      failureMode: failureMode as any,
      connectionDetails: {
        totalConnections: connectionStats.total,
        activeConnections: connectionStats.active,
        zombieConnections: connectionStats.zombie,
        failedBroadcasts: connectionStats.failed
      },
      messageDetails: {
        totalMessages: messageStats.total,
        duplicateMessages: messageStats.duplicates,
        corruptedMessages: messageStats.corrupted,
        lostMessages: messageStats.lost
      },
      detectedAt: new Date().toISOString()
    };

    this.streamingFailures.push(failure);
    this.persistPatterns();
    console.error(`🌊 SSE Streaming Failure: ${failureMode} in ${streamingStage}`);
  }

  /**
   * Analyze buffer state changes over time
   */
  analyzeBufferStateProgression(instanceId: string, currentState: BufferState): void {
    const previousState = this.bufferMonitoring.get(instanceId);
    
    if (previousState) {
      // Check for suspicious state changes
      if (currentState.position < previousState.position && 
          currentState.size === previousState.size) {
        // Position reset without size change - classic replay bug
        this.documentPositionResetFailure(
          instanceId,
          'parser_buffer',
          previousState.position,
          currentState.position,
          'Buffer content unchanged'
        );
      }
      
      if (currentState.size > currentState.capacity) {
        // Buffer overflow detected
        this.documentBufferOverflowFailure(
          instanceId,
          'instance_buffer',
          currentState.size,
          currentState.capacity,
          'Buffer size exceeded capacity during write operation'
        );
      }
    }

    this.bufferMonitoring.set(instanceId, { ...currentState });
  }

  /**
   * Identify memory leak patterns in buffer management
   */
  identifyMemoryLeakPatterns(): void {
    const instanceBufferSizes = new Map<string, number[]>();
    
    // Collect buffer sizes over time for each instance
    this.bufferFailures.forEach(failure => {
      if (!instanceBufferSizes.has(failure.instanceId)) {
        instanceBufferSizes.set(failure.instanceId, []);
      }
      instanceBufferSizes.get(failure.instanceId)!.push(failure.bufferState.size);
    });

    // Identify instances with consistently growing buffer sizes
    instanceBufferSizes.forEach((sizes, instanceId) => {
      if (sizes.length >= 5) {
        const isGrowing = sizes.every((size, index) => 
          index === 0 || size >= sizes[index - 1]
        );
        
        if (isGrowing && sizes[sizes.length - 1] > sizes[0] * 2) {
          const pattern: BufferFailurePattern = {
            patternId: `memory-leak-${instanceId}-${Date.now()}`,
            instanceId,
            failureType: 'memory_leak',
            bufferType: 'global_output',
            bufferState: {
              size: sizes[sizes.length - 1],
              position: sizes[sizes.length - 1],
              capacity: sizes[0],
              lastWrite: new Date().toISOString(),
              lastRead: '',
              overflowCount: sizes.length,
              underflowCount: 0
            },
            failureDetails: {
              triggerCondition: 'Continuously growing buffer size without cleanup',
              reproducibilityRate: 100,
              impactSeverity: 'critical',
              affectedConnections: 1,
              dataLoss: false
            },
            technicalCause: 'Buffer not being cleared or reset, accumulating data over time',
            manifestation: 'Memory usage growth, eventual system instability',
            detectedAt: new Date().toISOString()
          };

          this.recordBufferFailure(pattern);
          console.error(`🧟 Memory Leak Pattern: Instance ${instanceId} buffer grew from ${sizes[0]} to ${sizes[sizes.length - 1]} bytes`);
        }
      }
    });
  }

  /**
   * Calculate reproducibility rate for failure types
   */
  private calculateReproducibilityRate(instanceId: string, failureType: string): number {
    const sameTypeFailures = this.bufferFailures.filter(f => 
      f.instanceId === instanceId && f.failureType === failureType
    );
    
    // Higher count = higher reproducibility
    return Math.min(sameTypeFailures.length * 20, 100);
  }

  /**
   * Record buffer failure pattern
   */
  private recordBufferFailure(pattern: BufferFailurePattern): void {
    this.bufferFailures.push(pattern);
    this.persistPatterns();
    this.emit('bufferFailureDetected', pattern);
  }

  /**
   * Get detected buffer failures
   */
  getBufferFailures(): BufferFailurePattern[] {
    return [...this.bufferFailures];
  }

  /**
   * Get parser failures
   */
  getParserFailures(): ClaudeOutputParserFailure[] {
    return [...this.parserFailures];
  }

  /**
   * Get streaming failures
   */
  getStreamingFailures(): SSEStreamingFailure[] {
    return [...this.streamingFailures];
  }

  /**
   * Get failure statistics
   */
  getFailureStatistics(): {
    bufferFailures: { [key: string]: number };
    parserFailures: { [key: string]: number };
    streamingFailures: { [key: string]: number };
    totalFailures: number;
    criticalFailures: number;
  } {
    const bufferStats: { [key: string]: number } = {};
    const parserStats: { [key: string]: number } = {};
    const streamingStats: { [key: string]: number } = {};
    let criticalFailures = 0;

    this.bufferFailures.forEach(failure => {
      bufferStats[failure.failureType] = (bufferStats[failure.failureType] || 0) + 1;
      if (failure.failureDetails.impactSeverity === 'critical') {
        criticalFailures++;
      }
    });

    this.parserFailures.forEach(failure => {
      parserStats[failure.processingFailure.errorType] = (parserStats[failure.processingFailure.errorType] || 0) + 1;
    });

    this.streamingFailures.forEach(failure => {
      streamingStats[failure.failureMode] = (streamingStats[failure.failureMode] || 0) + 1;
    });

    return {
      bufferFailures: bufferStats,
      parserFailures: parserStats,
      streamingFailures: streamingStats,
      totalFailures: this.bufferFailures.length + this.parserFailures.length + this.streamingFailures.length,
      criticalFailures
    };
  }

  /**
   * Load existing patterns from storage
   */
  private loadExistingPatterns(): void {
    try {
      if (existsSync(this.patternStorage)) {
        const data = readFileSync(this.patternStorage, 'utf8');
        const parsed = JSON.parse(data);
        this.bufferFailures = parsed.bufferFailures || [];
        this.parserFailures = parsed.parserFailures || [];
        this.streamingFailures = parsed.streamingFailures || [];
        console.log(`📂 Loaded ${this.bufferFailures.length + this.parserFailures.length + this.streamingFailures.length} existing buffer failure patterns`);
      }
    } catch (error) {
      console.error('Failed to load existing patterns:', error);
    }
  }

  /**
   * Persist patterns to storage
   */
  private persistPatterns(): void {
    try {
      const data = {
        bufferFailures: this.bufferFailures,
        parserFailures: this.parserFailures,
        streamingFailures: this.streamingFailures,
        lastUpdated: new Date().toISOString()
      };
      
      writeFileSync(this.patternStorage, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to persist patterns:', error);
    }
  }

  /**
   * Clear all patterns (for testing)
   */
  clearPatterns(): void {
    this.bufferFailures = [];
    this.parserFailures = [];
    this.streamingFailures = [];
    this.bufferMonitoring.clear();
  }

  /**
   * Generate comprehensive buffer management failure report
   */
  generateFailureReport(): string {
    const stats = this.getFailureStatistics();
    const critical = this.bufferFailures.filter(f => f.failureDetails.impactSeverity === 'critical');
    
    let report = '=== Output Buffer Management Failure Analysis Report ===\n\n';
    
    report += `📊 FAILURE STATISTICS:\n`;
    report += `- Total Failures: ${stats.totalFailures}\n`;
    report += `- Critical Failures: ${stats.criticalFailures}\n`;
    report += `- Buffer Failures: ${Object.values(stats.bufferFailures).reduce((a, b) => a + b, 0)}\n`;
    report += `- Parser Failures: ${Object.values(stats.parserFailures).reduce((a, b) => a + b, 0)}\n`;
    report += `- Streaming Failures: ${Object.values(stats.streamingFailures).reduce((a, b) => a + b, 0)}\n\n`;
    
    if (critical.length > 0) {
      report += `🚨 CRITICAL BUFFER FAILURES (${critical.length}):\n`;
      critical.forEach(failure => {
        report += `- ${failure.failureType}: ${failure.technicalCause}\n`;
        report += `  Instance: ${failure.instanceId}\n`;
        report += `  Manifestation: ${failure.manifestation}\n`;
        report += `  Buffer State: ${failure.bufferState.size}/${failure.bufferState.capacity} bytes\n\n`;
      });
    }
    
    const parserFailures = this.parserFailures.filter(f => f.processingFailure.errorType === 'infinite_loop');
    if (parserFailures.length > 0) {
      report += `🤖 CLAUDE PARSER INFINITE LOOPS (${parserFailures.length}):\n`;
      parserFailures.forEach(failure => {
        report += `- Instance ${failure.instanceId}: ${failure.processingFailure.errorMessage}\n`;
        report += `  Input Buffer: ${failure.inputBuffer.size} bytes\n`;
        report += `  Output Buffer: ${failure.outputBuffer.size} bytes\n\n`;
      });
    }
    
    const streamFailures = this.streamingFailures.filter(f => f.failureMode === 'broadcast_storm');
    if (streamFailures.length > 0) {
      report += `🌊 SSE BROADCAST STORMS (${streamFailures.length}):\n`;
      streamFailures.forEach(failure => {
        report += `- Instance ${failure.instanceId}: ${failure.messageDetails.duplicateMessages} duplicate messages\n`;
        report += `  Connections: ${failure.connectionDetails.totalConnections} total, ${failure.connectionDetails.zombieConnections} zombie\n\n`;
      });
    }
    
    return report;
  }
}

export default OutputBufferManagementFailurePatterns;