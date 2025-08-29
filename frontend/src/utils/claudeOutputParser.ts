/**
 * SPARC Implementation: Claude Terminal Output Parser
 * 
 * Extracts clean, readable content from Claude's terminal output,
 * handling ANSI escape sequences, box drawings, and formatting.
 * 
 * Features:
 * - ANSI escape sequence removal
 * - Box drawing content extraction
 * - Message type detection
 * - Content formatting and cleanup
 * - Structured message creation
 */

export interface ParsedMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isError?: boolean;
  metadata?: {
    raw: string;
    hasBoxDrawing: boolean;
    hasANSI: boolean;
    messageType: string;
  };
}

export class ClaudeOutputParser {
  // ANSI escape sequence patterns
  private static readonly ANSI_PATTERNS = {
    // Color codes: \x1b[30-37m, \x1b[40-47m, etc.
    colors: /\x1b\[[0-9;]*[mGKH]/g,
    // Cursor movement: \x1b[nA, \x1b[nB, etc.
    cursor: /\x1b\[[0-9]*[ABCDHJK]/g,
    // Clear sequences: \x1b[2J, \x1b[K, etc.
    clear: /\x1b\[[0-9]*[JK]/g,
    // All ANSI sequences
    all: /\x1b\[[0-9;]*[a-zA-Z]/g
  };

  // Box drawing patterns (Claude uses these for responses)
  private static readonly BOX_PATTERNS = {
    // Top border: ┌─────────...
    topBorder: /┌─+┐/g,
    // Bottom border: └─────────...
    bottomBorder: /└─+┘/g,
    // Side borders: │ content │
    sideBorder: /│/g,
    // Horizontal lines: ─────────
    horizontal: /─+/g,
    // Corner characters
    corners: /[┌┐└┘]/g,
    // All box drawing characters
    all: /[─│┌┐└┘┤├┬┴┼]/g
  };

  // Common Claude response patterns
  private static readonly CLAUDE_PATTERNS = {
    // Claude command output indicators
    commandOutput: /^[\$#>]\s/,
    // Error messages
    error: /^(error|failed|exception)/i,
    // Status messages
    status: /^\[(.*?)\]/,
    // File paths
    filePath: /^\/\w+/,
    // Claude thinking indicators
    thinking: /(thinking|processing|analyzing)/i
  };

  /**
   * Main parsing function - converts raw terminal output to structured messages
   */
  static parseOutput(rawOutput: string, instanceId: string): ParsedMessage[] {
    if (!rawOutput?.trim()) {
      return [{
        id: `${instanceId}-welcome-${Date.now()}`,
        content: `Connected to Claude instance ${instanceId.slice(0, 8)}\nWaiting for Claude responses...`,
        role: 'system',
        timestamp: new Date(),
        metadata: {
          raw: rawOutput,
          hasBoxDrawing: false,
          hasANSI: false,
          messageType: 'welcome'
        }
      }];
    }

    const messages: ParsedMessage[] = [];
    
    // Step 1: Split by major sections (box-drawn responses vs regular output)
    const sections = this.splitIntoSections(rawOutput);
    
    let messageCounter = 0;
    for (const section of sections) {
      if (!section.trim()) continue;
      
      const parsed = this.parseSection(section, instanceId, messageCounter++);
      if (parsed) {
        messages.push(parsed);
      }
    }
    
    return messages.length > 0 ? messages : this.createFallbackMessage(rawOutput, instanceId);
  }

  /**
   * Split output into logical sections (box-drawn responses, regular output, etc.)
   */
  private static splitIntoSections(output: string): string[] {
    const lines = output.split('\n');
    const sections: string[] = [];
    let currentSection: string[] = [];
    let inBoxDrawing = false;
    
    for (const line of lines) {
      const hasBoxChars = this.BOX_PATTERNS.all.test(line);
      const isTopBorder = this.BOX_PATTERNS.topBorder.test(line);
      const isBottomBorder = this.BOX_PATTERNS.bottomBorder.test(line);
      
      if (isTopBorder && !inBoxDrawing) {
        // Start of new box-drawn section
        if (currentSection.length > 0) {
          sections.push(currentSection.join('\n'));
          currentSection = [];
        }
        inBoxDrawing = true;
        currentSection.push(line);
      } else if (isBottomBorder && inBoxDrawing) {
        // End of box-drawn section
        currentSection.push(line);
        sections.push(currentSection.join('\n'));
        currentSection = [];
        inBoxDrawing = false;
      } else if (inBoxDrawing || hasBoxChars) {
        // Inside box-drawn section
        currentSection.push(line);
      } else {
        // Regular output - group consecutive lines
        if (inBoxDrawing && currentSection.length > 0) {
          sections.push(currentSection.join('\n'));
          currentSection = [];
          inBoxDrawing = false;
        }
        currentSection.push(line);
      }
    }
    
    // Add remaining section
    if (currentSection.length > 0) {
      sections.push(currentSection.join('\n'));
    }
    
    return sections;
  }

  /**
   * Parse individual section into a structured message
   */
  private static parseSection(section: string, instanceId: string, counter: number): ParsedMessage | null {
    const hasBoxDrawing = this.BOX_PATTERNS.all.test(section);
    const hasANSI = this.ANSI_PATTERNS.all.test(section);
    
    // Clean the content
    let cleanContent = section;
    
    // Remove ANSI sequences first
    if (hasANSI) {
      cleanContent = this.removeANSISequences(cleanContent);
    }
    
    // Extract content from box drawings
    if (hasBoxDrawing) {
      cleanContent = this.extractBoxContent(cleanContent);
    }
    
    // Final cleanup
    cleanContent = this.cleanupContent(cleanContent);
    
    if (!cleanContent.trim()) {
      return null;
    }
    
    // Determine message type and role
    const messageType = this.detectMessageType(cleanContent, hasBoxDrawing);
    const role = this.determineRole(cleanContent, messageType);
    const isError = this.isErrorMessage(cleanContent);
    
    return {
      id: `${instanceId}-msg-${counter}-${Date.now()}`,
      content: cleanContent,
      role,
      timestamp: new Date(),
      isError,
      metadata: {
        raw: section,
        hasBoxDrawing,
        hasANSI,
        messageType
      }
    };
  }

  /**
   * Remove ANSI escape sequences
   */
  private static removeANSISequences(text: string): string {
    return text
      .replace(this.ANSI_PATTERNS.all, '') // Remove all ANSI sequences
      .replace(/\x1b/g, '') // Remove any remaining ESC characters
      .replace(/\r/g, ''); // Remove carriage returns
  }

  /**
   * Extract content from box-drawn sections
   */
  private static extractBoxContent(text: string): string {
    const lines = text.split('\n');
    const contentLines: string[] = [];
    
    for (const line of lines) {
      // Skip pure border lines
      if (/^[─┌┐└┘]+$/.test(line.trim())) {
        continue;
      }
      
      // Extract content from lines with side borders
      if (line.includes('│')) {
        // Remove side borders and extract content
        const content = line
          .replace(/^[│\s]*/, '') // Remove leading border and spaces
          .replace(/[│\s]*$/, '') // Remove trailing border and spaces
          .trim();
        
        if (content) {
          contentLines.push(content);
        }
      } else if (line.trim() && !this.BOX_PATTERNS.all.test(line)) {
        // Regular line without box characters
        contentLines.push(line.trim());
      }
    }
    
    return contentLines.join('\n');
  }

  /**
   * Clean up content formatting
   */
  private static cleanupContent(content: string): string {
    return content
      .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines to double
      .replace(/[ \t]{2,}/g, ' ') // Reduce multiple spaces to single
      .trim();
  }

  /**
   * Detect the type of message
   */
  private static detectMessageType(content: string, hasBoxDrawing: boolean): string {
    if (hasBoxDrawing) return 'claude_response';
    if (this.CLAUDE_PATTERNS.commandOutput.test(content)) return 'command_output';
    if (this.CLAUDE_PATTERNS.error.test(content)) return 'error';
    if (this.CLAUDE_PATTERNS.status.test(content)) return 'status';
    if (this.CLAUDE_PATTERNS.thinking.test(content)) return 'thinking';
    if (this.CLAUDE_PATTERNS.filePath.test(content)) return 'file_operation';
    return 'general';
  }

  /**
   * Determine message role based on content
   */
  private static determineRole(content: string, messageType: string): 'user' | 'assistant' | 'system' {
    if (messageType === 'claude_response') return 'assistant';
    if (messageType === 'error' || messageType === 'status') return 'system';
    if (messageType === 'command_output') return 'assistant';
    
    // Check content patterns
    if (content.toLowerCase().includes('claude')) return 'assistant';
    if (this.CLAUDE_PATTERNS.commandOutput.test(content)) return 'system';
    
    return 'assistant'; // Default to assistant for Claude output
  }

  /**
   * Check if content indicates an error
   */
  private static isErrorMessage(content: string): boolean {
    return this.CLAUDE_PATTERNS.error.test(content) ||
           content.toLowerCase().includes('failed') ||
           content.toLowerCase().includes('exception') ||
           content.toLowerCase().includes('not found');
  }

  /**
   * Create fallback message when parsing fails
   */
  private static createFallbackMessage(rawOutput: string, instanceId: string): ParsedMessage[] {
    return [{
      id: `${instanceId}-fallback-${Date.now()}`,
      content: this.cleanupContent(this.removeANSISequences(rawOutput)),
      role: 'assistant',
      timestamp: new Date(),
      metadata: {
        raw: rawOutput,
        hasBoxDrawing: this.BOX_PATTERNS.all.test(rawOutput),
        hasANSI: this.ANSI_PATTERNS.all.test(rawOutput),
        messageType: 'fallback'
      }
    }];
  }

  /**
   * Utility method to check if text contains Claude response patterns
   */
  static isClaudeResponse(text: string): boolean {
    return this.BOX_PATTERNS.all.test(text) ||
           text.toLowerCase().includes('claude') ||
           this.CLAUDE_PATTERNS.thinking.test(text);
  }

  /**
   * Extract only the essential content from Claude's response
   */
  static extractEssentialContent(rawOutput: string): string {
    if (!rawOutput?.trim()) return '';
    
    const cleaned = this.removeANSISequences(rawOutput);
    if (this.BOX_PATTERNS.all.test(cleaned)) {
      return this.extractBoxContent(cleaned);
    }
    
    return this.cleanupContent(cleaned);
  }
}

// Convenience functions for direct use
export const parseClaudeOutput = ClaudeOutputParser.parseOutput;
export const extractClaudeContent = ClaudeOutputParser.extractEssentialContent;
export const isClaudeResponse = ClaudeOutputParser.isClaudeResponse;