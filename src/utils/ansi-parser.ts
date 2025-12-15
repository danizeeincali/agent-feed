/**
 * Comprehensive ANSI Parser for Claude Terminal Output
 * Converts raw Claude terminal output with ANSI sequences into clean, readable text
 * Based on claudable's approach for handling complex ANSI formatting
 */

export interface ParsedClaudeResponse {
  cleanText: string;
  structuredContent?: {
    sections: Array<{
      type: 'thinking' | 'response' | 'tool_use' | 'error' | 'metadata';
      content: string;
      raw?: string;
    }>;
  };
  metadata?: {
    hasThinking: boolean;
    hasToolUse: boolean;
    hasError: boolean;
    originalLength: number;
    cleanLength: number;
  };
}

export class ANSIParser {
  // Extended ANSI regex patterns
  private static readonly ANSI_ESCAPE_REGEX = /\x1b\[[0-9;]*[mGKHJABCDEFGhlnpq]/g;
  private static readonly ANSI_COLOR_REGEX = /\x1b\[[0-9;]*m/g;
  private static readonly ANSI_CURSOR_REGEX = /\x1b\[[0-9]*[ABCDFGHIJ]/g;
  private static readonly ANSI_CLEAR_REGEX = /\x1b\[[0-9]*[JK]/g;
  private static readonly ANSI_SGR_REGEX = /\x1b\[[0-9;]*m/g;
  
  // Box drawing characters mapping
  private static readonly BOX_DRAWING_MAP: Record<string, string> = {
    '┌': '+', '┐': '+', '└': '+', '┘': '+',
    '┬': '+', '┴': '+', '├': '+', '┤': '+', '┼': '+',
    '─': '-', '│': '|',
    '┏': '+', '┓': '+', '┗': '+', '┛': '+',
    '┳': '+', '┻': '+', '┣': '+', '┫': '+', '╋': '+',
    '━': '=', '┃': '|',
    '╔': '+', '╗': '+', '╚': '+', '╝': '+',
    '╦': '+', '╩': '+', '╠': '+', '╣': '+', '╬': '+',
    '═': '=', '║': '|'
  };

  // Claude response patterns
  private static readonly CLAUDE_THINKING_START = /(?:\x1b\[[0-9;]*m)?<thinking>(?:\x1b\[[0-9;]*m)?/gi;
  private static readonly CLAUDE_THINKING_END = /(?:\x1b\[[0-9;]*m)?<\/thinking>(?:\x1b\[[0-9;]*m)?/gi;
  private static readonly CLAUDE_TOOL_START = /(?:\x1b\[[0-9;]*m)?<function_calls>(?:\x1b\[[0-9;]*m)?/gi;
  private static readonly CLAUDE_TOOL_END = /(?:\x1b\[[0-9;]*m)?<\/antml:function_calls>(?:\x1b\[[0-9;]*m)?/gi;
  
  // Control character patterns
  private static readonly CONTROL_CHARS_REGEX = /[\x00-\x1f\x7f-\x9f]/g;
  private static readonly BELL_CHAR_REGEX = /\x07/g;
  private static readonly CARRIAGE_RETURN_REGEX = /\r\n?/g;
  
  /**
   * Main parsing method - converts raw ANSI output to clean text
   */
  public static parse(rawOutput: string): ParsedClaudeResponse {
    if (!rawOutput || typeof rawOutput !== 'string') {
      return {
        cleanText: '',
        metadata: {
          hasThinking: false,
          hasToolUse: false,
          hasError: false,
          originalLength: 0,
          cleanLength: 0
        }
      };
    }

    const originalLength = rawOutput.length;
    
    // Step 1: Strip all ANSI escape sequences
    let cleaned = this.stripAnsiSequences(rawOutput);
    
    // Step 2: Convert box drawing characters
    cleaned = this.convertBoxDrawing(cleaned);
    
    // Step 3: Handle control characters
    cleaned = this.handleControlCharacters(cleaned);
    
    // Step 4: Parse Claude-specific content
    const structuredContent = this.parseClaudeContent(cleaned);
    
    // Step 5: Final cleanup
    cleaned = this.finalCleanup(cleaned);
    
    // Generate metadata
    const metadata = {
      hasThinking: this.hasThinkingTags(rawOutput),
      hasToolUse: this.hasToolUseTags(rawOutput),
      hasError: this.hasErrorContent(rawOutput),
      originalLength,
      cleanLength: cleaned.length
    };

    return {
      cleanText: cleaned,
      structuredContent,
      metadata
    };
  }

  /**
   * Strip all ANSI escape sequences
   */
  private static stripAnsiSequences(text: string): string {
    return text
      .replace(this.ANSI_ESCAPE_REGEX, '')
      .replace(this.ANSI_COLOR_REGEX, '')
      .replace(this.ANSI_CURSOR_REGEX, '')
      .replace(this.ANSI_CLEAR_REGEX, '')
      .replace(this.ANSI_SGR_REGEX, '')
      // Handle additional ANSI patterns
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
      .replace(/\x1b\][0-9;]*;[^\x07]*\x07/g, '')
      .replace(/\x1b\[[0-9]*;[0-9]*[HfF]/g, '')
      .replace(/\x1b\[[0-9]*[ABCD]/g, '')
      .replace(/\x1b\[[0-9]*[surn]/g, '')
      .replace(/\x1b\[[\?\!][0-9]*[hl]/g, '');
  }

  /**
   * Convert box drawing characters to ASCII equivalents
   */
  private static convertBoxDrawing(text: string): string {
    let result = text;
    for (const [unicode, ascii] of Object.entries(this.BOX_DRAWING_MAP)) {
      result = result.replace(new RegExp(unicode, 'g'), ascii);
    }
    return result;
  }

  /**
   * Handle control characters and special sequences
   */
  private static handleControlCharacters(text: string): string {
    return text
      .replace(this.BELL_CHAR_REGEX, '')
      .replace(this.CARRIAGE_RETURN_REGEX, '\n')
      .replace(this.CONTROL_CHARS_REGEX, (match) => {
        // Keep tabs and newlines, remove other control chars
        return match === '\t' || match === '\n' ? match : '';
      })
      // Handle backspace sequences
      .replace(/.\x08/g, '')
      // Handle form feed and vertical tab
      .replace(/[\f\v]/g, ' ');
  }

  /**
   * Parse Claude-specific content structure
   */
  private static parseClaudeContent(text: string): ParsedClaudeResponse['structuredContent'] {
    const sections: Array<{
      type: 'thinking' | 'response' | 'tool_use' | 'error' | 'metadata';
      content: string;
      raw?: string;
    }> = [];

    // Extract thinking sections
    const thinkingMatches = this.extractSections(text, /<thinking>/gi, /<\/thinking>/gi);
    thinkingMatches.forEach(match => {
      sections.push({
        type: 'thinking',
        content: match.content.trim(),
        raw: match.raw
      });
    });

    // Extract tool use sections
    const toolMatches = this.extractSections(text, /<function_calls>/gi, /<\/antml:function_calls>/gi);
    toolMatches.forEach(match => {
      sections.push({
        type: 'tool_use',
        content: match.content.trim(),
        raw: match.raw
      });
    });

    // Extract error sections (common error patterns)
    const errorPatterns = [
      /error[:\s]/gi,
      /exception[:\s]/gi,
      /failed[:\s]/gi,
      /\[error\]/gi
    ];

    errorPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        // Extract surrounding context for errors
        const lines = text.split('\n');
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            const contextStart = Math.max(0, index - 1);
            const contextEnd = Math.min(lines.length, index + 2);
            const errorContext = lines.slice(contextStart, contextEnd).join('\n');
            sections.push({
              type: 'error',
              content: errorContext.trim()
            });
          }
        });
      }
    });

    return { sections };
  }

  /**
   * Extract sections between start and end patterns
   */
  private static extractSections(text: string, startPattern: RegExp, endPattern: RegExp): Array<{content: string, raw: string}> {
    const results: Array<{content: string, raw: string}> = [];
    let searchText = text;
    let startMatch;
    
    while ((startMatch = startPattern.exec(searchText)) !== null) {
      const startIndex = startMatch.index + startMatch[0].length;
      const remainingText = searchText.substring(startIndex);
      
      endPattern.lastIndex = 0;
      const endMatch = endPattern.exec(remainingText);
      
      if (endMatch) {
        const content = remainingText.substring(0, endMatch.index);
        const raw = searchText.substring(startMatch.index, startIndex + endMatch.index + endMatch[0].length);
        results.push({ content, raw });
        
        // Continue searching after this match
        searchText = remainingText.substring(endMatch.index + endMatch[0].length);
        startPattern.lastIndex = 0;
      } else {
        break;
      }
    }
    
    return results;
  }

  /**
   * Final cleanup of text
   */
  private static finalCleanup(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{3,}/g, '  ')
      // Remove trailing whitespace from lines
      .replace(/[ \t]+$/gm, '')
      // Remove leading/trailing whitespace
      .trim();
  }

  /**
   * Check for thinking tags
   */
  private static hasThinkingTags(text: string): boolean {
    return this.CLAUDE_THINKING_START.test(text) && this.CLAUDE_THINKING_END.test(text);
  }

  /**
   * Check for tool use tags
   */
  private static hasToolUseTags(text: string): boolean {
    return this.CLAUDE_TOOL_START.test(text) && this.CLAUDE_TOOL_END.test(text);
  }

  /**
   * Check for error content
   */
  private static hasErrorContent(text: string): boolean {
    const errorKeywords = ['error', 'exception', 'failed', 'crash', 'fatal'];
    return errorKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Quick strip method for simple ANSI removal
   */
  public static quickStrip(text: string): string {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/\x1b\[[0-9;]*[mGKHJABCDEFGhlnpq]/g, '');
  }

  /**
   * Extract only the response content (excluding thinking and tool use)
   */
  public static extractResponse(rawOutput: string): string {
    const parsed = this.parse(rawOutput);
    
    // Remove thinking and tool use sections from the clean text
    let responseText = parsed.cleanText;
    
    if (parsed.structuredContent?.sections) {
      parsed.structuredContent.sections.forEach(section => {
        if (section.type === 'thinking' || section.type === 'tool_use') {
          responseText = responseText.replace(section.content, '');
        }
      });
    }
    
    // Clean up any remaining tags
    responseText = responseText
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .replace(/<function_calls>[\s\S]*?<\/antml:function_calls>/gi, '')
      .trim();
    
    return this.finalCleanup(responseText);
  }

  /**
   * Get a summary of the parsing results
   */
  public static getSummary(rawOutput: string): string {
    const parsed = this.parse(rawOutput);
    const { metadata, structuredContent } = parsed;
    
    const summary = [
      `Original length: ${metadata?.originalLength || 0} characters`,
      `Clean length: ${metadata?.cleanLength || 0} characters`,
      `Compression ratio: ${metadata?.originalLength ? 
        ((1 - (metadata.cleanLength / metadata.originalLength)) * 100).toFixed(1) + '%' : 
        'N/A'}`
    ];
    
    if (metadata?.hasThinking) summary.push('Contains thinking process');
    if (metadata?.hasToolUse) summary.push('Contains tool usage');
    if (metadata?.hasError) summary.push('Contains error messages');
    
    if (structuredContent?.sections) {
      summary.push(`Structured sections: ${structuredContent.sections.length}`);
    }
    
    return summary.join('\n');
  }
}

export default ANSIParser;