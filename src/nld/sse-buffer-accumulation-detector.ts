/**
 * SSE Buffer Accumulation Anti-Pattern Detector
 * Detects infinite message repetition patterns in SSE streaming
 * Part of NLD (Neuro-Learning Development) system
 */

import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface SSEMessage {
  type: string;
  data: string;
  instanceId: string;
  timestamp: string;
  source?: string;
  isReal?: boolean;
  processType?: string;
}

interface BufferAccumulationPattern {
  patternId: string;
  instanceId: string;
  messageType: string;
  repetitionCount: number;
  duplicateContent: string;
  timeSpan: number;
  detectedAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  antiPattern: string;
  rootCause: string;
  technicalDetails: {
    bufferSize: number;
    outputPosition: number;
    parserState: string;
    connectionCount: number;
  };
}

interface SSEEventHandlerDuplication {
  patternId: string;
  handlerFunction: string;
  registrationCount: number;
  instances: string[];
  duplicateRegistrations: Array<{
    timestamp: string;
    callStack: string;
  }>;
}

interface OutputBufferFailure {
  patternId: string;
  instanceId: string;
  bufferType: 'global' | 'instance' | 'connection';
  failureMode: 'overflow' | 'corruption' | 'position_tracking' | 'parser_state';
  bufferState: {
    size: number;
    position: number;
    content: string;
  };
  detectedAt: string;
}

export class SSEBufferAccumulationDetector extends EventEmitter {
  private messageHistory: Map<string, SSEMessage[]> = new Map();
  private patternStorage: string;
  private detectedPatterns: BufferAccumulationPattern[] = [];
  private handlerDuplication: Map<string, SSEEventHandlerDuplication> = new Map();
  private bufferFailures: OutputBufferFailure[] = [];
  private readonly maxHistorySize = 1000;
  private readonly repetitionThreshold = 5;
  private readonly timeWindowMs = 10000; // 10 seconds

  constructor(storageDir: string) {
    super();
    this.patternStorage = join(storageDir, 'sse-buffer-patterns.json');
    this.loadExistingPatterns();
    console.log('🔍 SSE Buffer Accumulation Detector initialized');
  }

  /**
   * Analyze SSE message for buffer accumulation patterns
   */
  analyzeSSEMessage(message: SSEMessage): void {
    const instanceId = message.instanceId;
    
    // Initialize message history for instance
    if (!this.messageHistory.has(instanceId)) {
      this.messageHistory.set(instanceId, []);
    }
    
    const history = this.messageHistory.get(instanceId)!;
    history.push(message);
    
    // Maintain history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
    
    // Check for buffer accumulation patterns
    this.detectInfiniteRepetition(instanceId, history);
    this.detectBufferReplayLoop(instanceId, history);
    this.detectOutputPositionFailure(instanceId, history);
  }

  /**
   * Detect infinite message repetition patterns
   */
  private detectInfiniteRepetition(instanceId: string, history: SSEMessage[]): void {
    if (history.length < this.repetitionThreshold) return;
    
    const recentMessages = history.slice(-this.repetitionThreshold);
    const firstMessage = recentMessages[0];
    
    // Check if all recent messages are identical
    const isRepeating = recentMessages.every(msg => 
      msg.data === firstMessage.data && 
      msg.type === firstMessage.type
    );
    
    if (isRepeating) {
      const timeSpan = new Date(recentMessages[recentMessages.length - 1].timestamp).getTime() - 
                     new Date(recentMessages[0].timestamp).getTime();
      
      // Count total repetitions in recent history
      const repetitionCount = history.filter(msg => 
        msg.data === firstMessage.data && 
        msg.type === firstMessage.type
      ).length;
      
      const pattern: BufferAccumulationPattern = {
        patternId: `sse-repeat-${instanceId}-${Date.now()}`,
        instanceId,
        messageType: firstMessage.type,
        repetitionCount,
        duplicateContent: firstMessage.data.substring(0, 200),
        timeSpan,
        detectedAt: new Date().toISOString(),
        severity: this.calculateSeverity(repetitionCount),
        antiPattern: 'SSE_INFINITE_MESSAGE_REPETITION',
        rootCause: this.analyzeRepetitionRootCause(firstMessage, repetitionCount),
        technicalDetails: {
          bufferSize: history.length,
          outputPosition: -1, // Unknown for message repetition
          parserState: 'unknown',
          connectionCount: 1 // Assume single connection
        }
      };
      
      this.recordPattern(pattern);
      console.warn(`🚨 SSE Buffer Accumulation detected: ${repetitionCount} repetitions of ${firstMessage.type} messages`);
    }
  }

  /**
   * Detect SSE buffer replay loop patterns
   */
  private detectBufferReplayLoop(instanceId: string, history: SSEMessage[]): void {
    if (history.length < 10) return;
    
    const recentMessages = history.slice(-20);
    const sequences = this.findRepeatingSequences(recentMessages);
    
    sequences.forEach(sequence => {
      if (sequence.length >= 3 && sequence.repetitions >= 2) {
        const pattern: BufferAccumulationPattern = {
          patternId: `sse-replay-${instanceId}-${Date.now()}`,
          instanceId,
          messageType: 'sequence_replay',
          repetitionCount: sequence.repetitions,
          duplicateContent: sequence.pattern.map(msg => `${msg.type}:${msg.data.substring(0, 50)}`).join('; '),
          timeSpan: this.calculateSequenceTimeSpan(sequence.pattern),
          detectedAt: new Date().toISOString(),
          severity: 'high',
          antiPattern: 'SSE_BUFFER_REPLAY_LOOP',
          rootCause: 'Backend SSE streaming buffer position reset causing message replay',
          technicalDetails: {
            bufferSize: history.length,
            outputPosition: 0, // Reset position causing replay
            parserState: 'replay_loop',
            connectionCount: 1
          }
        };
        
        this.recordPattern(pattern);
        console.warn(`🔄 SSE Buffer Replay Loop detected: ${sequence.repetitions} repetitions of ${sequence.length}-message sequence`);
      }
    });
  }

  /**
   * Detect output position tracking failures
   */
  private detectOutputPositionFailure(instanceId: string, history: SSEMessage[]): void {
    // Look for patterns where the same output appears multiple times with different timestamps
    // This indicates ClaudeOutputParser buffer processing issues
    const outputMap = new Map<string, SSEMessage[]>();
    
    history.slice(-50).forEach(message => {
      const key = `${message.type}:${message.data}`;
      if (!outputMap.has(key)) {
        outputMap.set(key, []);
      }
      outputMap.get(key)!.push(message);
    });
    
    outputMap.forEach((messages, outputKey) => {
      if (messages.length >= 3) {
        // Same output appearing multiple times suggests position tracking failure
        const bufferFailure: OutputBufferFailure = {
          patternId: `output-pos-${instanceId}-${Date.now()}`,
          instanceId,
          bufferType: 'instance',
          failureMode: 'position_tracking',
          bufferState: {
            size: messages.length,
            position: 0,
            content: outputKey
          },
          detectedAt: new Date().toISOString()
        };
        
        this.bufferFailures.push(bufferFailure);
        console.warn(`📍 Output Position Tracking Failure: Same output repeated ${messages.length} times`);
      }
    });
  }

  /**
   * Record event handler duplication patterns
   */
  recordEventHandlerDuplication(handlerFunction: string, instanceId: string, callStack: string): void {
    const handlerId = `${handlerFunction}-${instanceId}`;
    
    if (!this.handlerDuplication.has(handlerId)) {
      this.handlerDuplication.set(handlerId, {
        patternId: `handler-dup-${Date.now()}`,
        handlerFunction,
        registrationCount: 0,
        instances: [],
        duplicateRegistrations: []
      });
    }
    
    const duplication = this.handlerDuplication.get(handlerId)!;
    duplication.registrationCount++;
    
    if (!duplication.instances.includes(instanceId)) {
      duplication.instances.push(instanceId);
    }
    
    duplication.duplicateRegistrations.push({
      timestamp: new Date().toISOString(),
      callStack
    });
    
    if (duplication.registrationCount > 2) {
      console.warn(`🔄 SSE Event Handler Duplication: ${handlerFunction} registered ${duplication.registrationCount} times`);
    }
  }

  /**
   * Analyze frontend message state accumulation
   */
  analyzeFrontendMessageAccumulation(messageState: any[]): void {
    if (messageState.length > 100) {
      const duplicates = this.findDuplicatesInArray(messageState);
      
      if (duplicates.length > 20) {
        const pattern: BufferAccumulationPattern = {
          patternId: `frontend-accum-${Date.now()}`,
          instanceId: 'frontend',
          messageType: 'state_accumulation',
          repetitionCount: duplicates.length,
          duplicateContent: JSON.stringify(duplicates.slice(0, 3)),
          timeSpan: 0,
          detectedAt: new Date().toISOString(),
          severity: 'high',
          antiPattern: 'FRONTEND_MESSAGE_STATE_ACCUMULATION',
          rootCause: 'Frontend not clearing old messages, causing memory bloat',
          technicalDetails: {
            bufferSize: messageState.length,
            outputPosition: -1,
            parserState: 'accumulating',
            connectionCount: 1
          }
        };
        
        this.recordPattern(pattern);
        console.warn(`📈 Frontend Message Accumulation: ${messageState.length} messages, ${duplicates.length} duplicates`);
      }
    }
  }

  /**
   * Calculate severity based on repetition count
   */
  private calculateSeverity(repetitionCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (repetitionCount >= 1000) return 'critical';
    if (repetitionCount >= 100) return 'high';
    if (repetitionCount >= 20) return 'medium';
    return 'low';
  }

  /**
   * Analyze root cause of message repetition
   */
  private analyzeRepetitionRootCause(message: SSEMessage, repetitionCount: number): string {
    if (repetitionCount >= 1000) {
      return 'Backend SSE streaming buffer replay loop - output position never advances';
    }
    if (message.type === 'output' && message.source === 'stdout') {
      return 'ClaudeOutputParser buffer processing failure - same output reprocessed multiple times';
    }
    if (message.type === 'terminal:echo') {
      return 'Terminal echo duplication - input command being re-echoed';
    }
    return 'Unknown SSE streaming issue causing message duplication';
  }

  /**
   * Find repeating sequences in message array
   */
  private findRepeatingSequences(messages: SSEMessage[]): Array<{pattern: SSEMessage[], repetitions: number, length: number}> {
    const sequences = [];
    
    for (let length = 2; length <= Math.floor(messages.length / 2); length++) {
      for (let start = 0; start <= messages.length - length * 2; start++) {
        const pattern = messages.slice(start, start + length);
        let repetitions = 1;
        
        for (let i = start + length; i <= messages.length - length; i += length) {
          const candidate = messages.slice(i, i + length);
          if (this.arraysEqual(pattern, candidate)) {
            repetitions++;
          } else {
            break;
          }
        }
        
        if (repetitions >= 2) {
          sequences.push({ pattern, repetitions, length });
        }
      }
    }
    
    return sequences;
  }

  /**
   * Check if two message arrays are equal
   */
  private arraysEqual(a: SSEMessage[], b: SSEMessage[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((msg, index) => 
      msg.type === b[index].type && msg.data === b[index].data
    );
  }

  /**
   * Calculate time span for sequence
   */
  private calculateSequenceTimeSpan(pattern: SSEMessage[]): number {
    if (pattern.length === 0) return 0;
    const first = new Date(pattern[0].timestamp).getTime();
    const last = new Date(pattern[pattern.length - 1].timestamp).getTime();
    return last - first;
  }

  /**
   * Find duplicates in array
   */
  private findDuplicatesInArray(arr: any[]): any[] {
    const seen = new Set();
    const duplicates = [];
    
    for (const item of arr) {
      const key = JSON.stringify(item);
      if (seen.has(key)) {
        duplicates.push(item);
      } else {
        seen.add(key);
      }
    }
    
    return duplicates;
  }

  /**
   * Record detected pattern
   */
  private recordPattern(pattern: BufferAccumulationPattern): void {
    this.detectedPatterns.push(pattern);
    this.persistPatterns();
    this.emit('patternDetected', pattern);
  }

  /**
   * Get all detected patterns
   */
  getDetectedPatterns(): BufferAccumulationPattern[] {
    return [...this.detectedPatterns];
  }

  /**
   * Get event handler duplications
   */
  getEventHandlerDuplications(): SSEEventHandlerDuplication[] {
    return Array.from(this.handlerDuplication.values());
  }

  /**
   * Get buffer failures
   */
  getBufferFailures(): OutputBufferFailure[] {
    return [...this.bufferFailures];
  }

  /**
   * Load existing patterns from storage
   */
  private loadExistingPatterns(): void {
    try {
      if (existsSync(this.patternStorage)) {
        const data = readFileSync(this.patternStorage, 'utf8');
        const parsed = JSON.parse(data);
        this.detectedPatterns = parsed.patterns || [];
        console.log(`📂 Loaded ${this.detectedPatterns.length} existing SSE buffer patterns`);
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
        patterns: this.detectedPatterns,
        handlerDuplications: Array.from(this.handlerDuplication.values()),
        bufferFailures: this.bufferFailures,
        lastUpdated: new Date().toISOString()
      };
      
      writeFileSync(this.patternStorage, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to persist patterns:', error);
    }
  }

  /**
   * Clear all detected patterns (for testing)
   */
  clearPatterns(): void {
    this.detectedPatterns = [];
    this.handlerDuplication.clear();
    this.bufferFailures = [];
    this.messageHistory.clear();
  }

  /**
   * Generate failure analysis report
   */
  generateFailureAnalysisReport(): string {
    const critical = this.detectedPatterns.filter(p => p.severity === 'critical');
    const high = this.detectedPatterns.filter(p => p.severity === 'high');
    
    let report = '=== SSE Buffer Accumulation Analysis Report ===\n\n';
    
    if (critical.length > 0) {
      report += `🚨 CRITICAL ISSUES (${critical.length}):\n`;
      critical.forEach(pattern => {
        report += `- ${pattern.antiPattern}: ${pattern.repetitionCount} repetitions\n`;
        report += `  Root Cause: ${pattern.rootCause}\n`;
        report += `  Instance: ${pattern.instanceId}\n\n`;
      });
    }
    
    if (high.length > 0) {
      report += `⚠️  HIGH PRIORITY (${high.length}):\n`;
      high.forEach(pattern => {
        report += `- ${pattern.antiPattern}: ${pattern.repetitionCount} repetitions\n`;
        report += `  Root Cause: ${pattern.rootCause}\n\n`;
      });
    }
    
    const handlerDups = this.getEventHandlerDuplications().filter(h => h.registrationCount > 2);
    if (handlerDups.length > 0) {
      report += `🔄 EVENT HANDLER DUPLICATIONS (${handlerDups.length}):\n`;
      handlerDups.forEach(dup => {
        report += `- ${dup.handlerFunction}: ${dup.registrationCount} registrations\n`;
      });
    }
    
    return report;
  }
}

export default SSEBufferAccumulationDetector;