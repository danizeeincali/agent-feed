/**
 * Stream Completion for Claude Output Processor
 * Completes the stream processing functionality
 */

import { ClaudeOutputOptions, ProcessedClaudeOutput } from './claude-output-processor';
import { ANSIParser } from './ansi-parser';

export class StreamProcessor {
  /**
   * Create a stream processor for real-time Claude output
   */
  public static createStreamProcessor(
    options: ClaudeOutputOptions = {},
    onProcessed?: (processed: ProcessedClaudeOutput) => void
  ): (chunk: string) => void {
    let buffer = '';
    
    return (chunk: string) => {
      buffer += chunk;
      
      // Process complete responses (heuristic: ends with thinking or function call tags)
      if (buffer.includes('</thinking>') || 
          buffer.includes('