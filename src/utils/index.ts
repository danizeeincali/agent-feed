/**
 * ANSI Parser Utilities - Main Export
 * Complete suite for parsing and processing Claude terminal output
 */

export { ANSIParser, ParsedClaudeResponse } from './ansi-parser';
export { 
  ClaudeOutputProcessor, 
  ClaudeOutputOptions, 
  ProcessedClaudeOutput 
} from './claude-output-processor';

// Re-export for backward compatibility with existing strip-ansi usage
export { ANSIParser as stripAnsi } from './ansi-parser';

/**
 * Quick utility functions for common use cases
 */

/**
 * Strip ANSI codes from text (simple replacement for strip-ansi package)
 */
export const stripAnsi = (text: string): string => {
  return ANSIParser.quickStrip(text);
};

/**
 * Process Claude output for terminal display
 */
export const processForTerminal = (rawOutput: string): string => {
  return ClaudeOutputProcessor.processForTerminal(rawOutput);
};

/**
 * Process Claude output for web UI
 */
export const processForWeb = (rawOutput: string): ProcessedClaudeOutput => {
  return ClaudeOutputProcessor.processForWeb(rawOutput);
};

/**
 * Extract only the main response (strip thinking and tool use)
 */
export const extractResponse = (rawOutput: string): string => {
  return ANSIParser.extractResponse(rawOutput);
};

/**
 * Get parsing summary/statistics
 */
export const getParsingStats = (rawOutput: string): string => {
  return ANSIParser.getSummary(rawOutput);
};