/**
 * Claude Output Processor
 * High-level interface for processing Claude terminal output
 * Integrates with the ANSI parser for complete output handling
 */

import { ANSIParser, ParsedClaudeResponse } from './ansi-parser';

export interface ClaudeOutputOptions {
  preserveThinking?: boolean;
  preserveToolUse?: boolean;
  includeMetadata?: boolean;
  maxLength?: number;
  formatAsMarkdown?: boolean;
}

export interface ProcessedClaudeOutput {
  response: string;
  thinking?: string;
  toolUse?: string[];
  metadata?: {
    originalLength: number;
    processedLength: number;
    compressionRatio: number;
    hasStructuredContent: boolean;
    processingTime: number;
  };
  raw?: string;
}

export class ClaudeOutputProcessor {
  private static readonly DEFAULT_OPTIONS: ClaudeOutputOptions = {
    preserveThinking: false,
    preserveToolUse: false,
    includeMetadata: true,
    maxLength: 50000,
    formatAsMarkdown: false
  };

  /**
   * Process raw Claude output with customizable options
   */
  public static process(
    rawOutput: string, 
    options: ClaudeOutputOptions = {}
  ): ProcessedClaudeOutput {
    const startTime = performance.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    if (!rawOutput || typeof rawOutput !== 'string') {
      return this.createEmptyResult(startTime);
    }

    // Truncate if too long
    const input = opts.maxLength && rawOutput.length > opts.maxLength 
      ? rawOutput.substring(0, opts.maxLength) + '...[truncated]'
      : rawOutput;

    // Parse the output
    const parsed = ANSIParser.parse(input);
    
    // Extract components
    const result: ProcessedClaudeOutput = {
      response: this.extractMainResponse(parsed, opts),
    };

    // Add thinking if requested
    if (opts.preserveThinking) {
      result.thinking = this.extractThinking(parsed);
    }

    // Add tool use if requested
    if (opts.preserveToolUse) {
      result.toolUse = this.extractToolUse(parsed);
    }

    // Add metadata if requested
    if (opts.includeMetadata) {
      const processingTime = performance.now() - startTime;
      result.metadata = {
        originalLength: rawOutput.length,
        processedLength: result.response.length,
        compressionRatio: rawOutput.length > 0 
          ? ((rawOutput.length - result.response.length) / rawOutput.length) * 100
          : 0,
        hasStructuredContent: (parsed.structuredContent?.sections.length || 0) > 0,
        processingTime
      };
    }

    return result;
  }

  /**
   * Quick process for simple use cases
   */
  public static quickProcess(rawOutput: string): string {
    return ANSIParser.extractResponse(rawOutput);
  }

  /**
   * Process for display in terminal/console
   */
  public static processForTerminal(rawOutput: string): string {
    const processed = this.process(rawOutput, {
      preserveThinking: false,
      preserveToolUse: false,
      includeMetadata: false,
      formatAsMarkdown: false
    });
    
    return processed.response;
  }

  /**
   * Process for display in web UI
   */
  public static processForWeb(rawOutput: string): ProcessedClaudeOutput {
    return this.process(rawOutput, {
      preserveThinking: true,
      preserveToolUse: true,
      includeMetadata: true,
      formatAsMarkdown: true
    });
  }

  /**
   * Process for logging/debugging
   */
  public static processForDebug(rawOutput: string): ProcessedClaudeOutput & { raw: string } {
    const processed = this.process(rawOutput, {
      preserveThinking: true,
      preserveToolUse: true,
      includeMetadata: true
    });
    
    return {
      ...processed,
      raw: rawOutput
    };
  }

  /**
   * Extract main response content
   */
  private static extractMainResponse(
    parsed: ParsedClaudeResponse, 
    options: ClaudeOutputOptions
  ): string {
    let response = ANSIParser.extractResponse(parsed.cleanText);
    
    if (options.formatAsMarkdown) {
      response = this.formatAsMarkdown(response, parsed);
    }
    
    return response;
  }

  /**
   * Extract thinking content
   */
  private static extractThinking(parsed: ParsedClaudeResponse): string | undefined {
    const thinkingSections = parsed.structuredContent?.sections.filter(
      section => section.type === 'thinking'
    );
    
    if (!thinkingSections || thinkingSections.length === 0) {
      return undefined;
    }
    
    return thinkingSections.map(section => section.content).join('\n\n');
  }

  /**
   * Extract tool use content
   */
  private static extractToolUse(parsed: ParsedClaudeResponse): string[] | undefined {
    const toolSections = parsed.structuredContent?.sections.filter(
      section => section.type === 'tool_use'
    );
    
    if (!toolSections || toolSections.length === 0) {
      return undefined;
    }
    
    return toolSections.map(section => section.content);
  }

  /**
   * Format content as markdown
   */
  private static formatAsMarkdown(
    content: string, 
    parsed: ParsedClaudeResponse
  ): string {
    let markdown = content;
    
    // Add code blocks for code-like content
    if (this.looksLikeCode(content)) {
      markdown = '```\n' + content + '\n```';
    }
    
    // Add headers for structured sections
    if (parsed.structuredContent?.sections) {
      const hasThinking = parsed.structuredContent.sections.some(s => s.type === 'thinking');
      const hasToolUse = parsed.structuredContent.sections.some(s => s.type === 'tool_use');
      
      if (hasThinking || hasToolUse) {
        markdown = '## Response\n\n' + markdown;
      }
    }
    
    return markdown;
  }

  /**
   * Check if content looks like code
   */
  private static looksLikeCode(content: string): boolean {
    const codeIndicators = [
      /^\s*[{}[\]]/m,  // Brackets/braces at start of line
      /;\s*$/m,        // Semicolon at end of line
      /\w+\s*[=:]\s*\w+/m, // Assignment-like patterns
      /function\s+\w+/i,   // Function declarations
      /class\s+\w+/i,      // Class declarations
      /import\s+.*from/i,  // Import statements
    ];
    
    return codeIndicators.some(regex => regex.test(content));
  }

  /**
   * Create empty result
   */
  private static createEmptyResult(startTime: number): ProcessedClaudeOutput {
    return {
      response: '',
      metadata: {
        originalLength: 0,
        processedLength: 0,
        compressionRatio: 0,
        hasStructuredContent: false,
        processingTime: performance.now() - startTime
      }
    };
  }

  /**
   * Batch process multiple outputs
   */
  public static batchProcess(
    outputs: string[], 
    options: ClaudeOutputOptions = {}
  ): ProcessedClaudeOutput[] {
    return outputs.map(output => this.process(output, options));
  }

  /**
   * Stream processor for real-time output
   */
  public static createStreamProcessor(
    options: ClaudeOutputOptions = {},
    onProcessed?: (processed: ProcessedClaudeOutput) => void
  ): (chunk: string) => void {
    let buffer = '';
    
    return (chunk: string) => {
      buffer += chunk;
      
      // Process complete responses (heuristic: ends with thinking or function call tags)
      if (buffer.includes('</thinking>') || buffer.includes('