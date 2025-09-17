/**
 * Claude Terminal Integration
 * Example integration of ANSI parser with existing terminal/WebSocket infrastructure
 */

import { ANSIParser, ClaudeOutputProcessor } from '../utils';
import { EventEmitter } from 'events';

export interface TerminalMessage {
  id: string;
  timestamp: Date;
  rawOutput: string;
  processedOutput: string;
  metadata?: {
    hasThinking: boolean;
    hasToolUse: boolean;
    compressionRatio: number;
    processingTime: number;
  };
}

export class ClaudeTerminalProcessor extends EventEmitter {
  private messageHistory: TerminalMessage[] = [];
  private processingOptions: any;

  constructor(options = {}) {
    super();
    this.processingOptions = {
      preserveThinking: false,
      preserveToolUse: false,
      includeMetadata: true,
      maxLength: 50000,
      ...options
    };
  }

  /**
   * Process incoming Claude output from WebSocket or terminal
   */
  processMessage(rawOutput: string, messageId?: string): TerminalMessage {
    const id = messageId || this.generateMessageId();
    const timestamp = new Date();

    // Process the raw output
    const processed = ClaudeOutputProcessor.process(rawOutput, this.processingOptions);

    const message: TerminalMessage = {
      id,
      timestamp,
      rawOutput,
      processedOutput: processed.response,
      metadata: processed.metadata ? {
        hasThinking: processed.metadata.hasStructuredContent && !!processed.thinking,
        hasToolUse: processed.metadata.hasStructuredContent && !!processed.toolUse,
        compressionRatio: processed.metadata.compressionRatio,
        processingTime: processed.metadata.processingTime
      } : undefined
    };

    // Store in history
    this.messageHistory.push(message);
    this.trimHistory();

    // Emit events
    this.emit('messageProcessed', message);
    if (message.metadata?.hasThinking) {
      this.emit('thinkingDetected', { id, thinking: processed.thinking });
    }
    if (message.metadata?.hasToolUse) {
      this.emit('toolUseDetected', { id, tools: processed.toolUse });
    }

    return message;
  }

  /**
   * Stream processor for real-time output
   */
  createStreamHandler(): (chunk: string) => void {
    let buffer = '';
    let chunkCount = 0;

    return (chunk: string) => {
      buffer += chunk;
      chunkCount++;

      // Process complete responses or every N chunks
      const shouldProcess =
        buffer.includes('</thinking>') ||
        buffer.includes('