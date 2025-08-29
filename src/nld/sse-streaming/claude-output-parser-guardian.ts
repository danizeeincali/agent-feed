/**
 * Claude Output Parser Guardian - NLD Pattern Detection System
 * Prevents Claude output parsing failures and ANSI escape sequence issues
 */

export interface ClaudeOutputFailure {
  failureId: string;
  failureType: 'CLAUDE_OUTPUT_PARSING_FAILURE' | 'ANSI_ESCAPE_RENDERING' | 'BOX_DRAWING_DISPLAY' | 'MESSAGE_FORMAT_CORRUPTION';
  rawContent: string;
  expectedFormat: 'chat_bubble' | 'code_block' | 'terminal_output' | 'structured_data';
  detectedAt: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  parseAttempts: number;
  fallbackUsed: boolean;
  details: {
    ansiSequences: string[];
    boxDrawingChars: boolean;
    jsonParseError: boolean;
    unicodeIssues: boolean;
    lengthTruncation: boolean;
  };
}

export interface ParsingStrategy {
  strategyName: string;
  priority: number;
  pattern: RegExp;
  handler: (content: string) => string;
  fallback?: (content: string) => string;
}

class ClaudeOutputParserGuardian {
  private failureHistory: ClaudeOutputFailure[] = [];
  private parsingStrategies: ParsingStrategy[] = [];
  private ansiEscapeRegex = /\x1b\[[0-9;]*[mGKHf]/g;
  private boxDrawingRegex = /[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬]/g;
  private codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  private terminalPromptRegex = /^[\$#>]\s+/gm;
  
  private readonly MAX_PARSE_ATTEMPTS = 3;
  private readonly TRUNCATION_THRESHOLD = 10000;

  constructor() {
    this.initializeParsingStrategies();
  }

  /**
   * Initialize parsing strategies in priority order
   */
  private initializeParsingStrategies(): void {
    this.parsingStrategies = [
      {
        strategyName: 'ANSI_ESCAPE_CLEANUP',
        priority: 1,
        pattern: this.ansiEscapeRegex,
        handler: (content: string) => this.cleanAnsiEscapes(content),
        fallback: (content: string) => this.preserveAnsiAsText(content)
      },
      {
        strategyName: 'BOX_DRAWING_CONVERSION',
        priority: 2,
        pattern: this.boxDrawingRegex,
        handler: (content: string) => this.convertBoxDrawing(content),
        fallback: (content: string) => this.replaceBoxDrawingWithAscii(content)
      },
      {
        strategyName: 'CODE_BLOCK_FORMATTING',
        priority: 3,
        pattern: this.codeBlockRegex,
        handler: (content: string) => this.formatCodeBlocks(content),
        fallback: (content: string) => this.preserveCodeAsPlaintext(content)
      },
      {
        strategyName: 'TERMINAL_OUTPUT_PARSING',
        priority: 4,
        pattern: this.terminalPromptRegex,
        handler: (content: string) => this.parseTerminalOutput(content),
        fallback: (content: string) => this.wrapTerminalOutput(content)
      },
      {
        strategyName: 'UNICODE_NORMALIZATION',
        priority: 5,
        pattern: /[^\x00-\x7F]/g,
        handler: (content: string) => this.normalizeUnicode(content),
        fallback: (content: string) => this.replaceUnicodeWithSafe(content)
      }
    ];
  }

  /**
   * Main parsing function with failure detection and recovery
   */
  public parseClaudeOutput(
    rawContent: string,
    expectedFormat: 'chat_bubble' | 'code_block' | 'terminal_output' | 'structured_data' = 'chat_bubble'
  ): { 
    parsedContent: string; 
    success: boolean; 
    failureDetected: ClaudeOutputFailure | null;
    strategiesUsed: string[];
  } {
    const strategiesUsed: string[] = [];
    let parsedContent = rawContent;
    let parseAttempts = 0;
    let fallbackUsed = false;

    // Detect potential parsing issues upfront
    const detectedIssues = this.detectParsingIssues(rawContent);
    
    try {
      // Apply parsing strategies in priority order
      for (const strategy of this.parsingStrategies.sort((a, b) => a.priority - b.priority)) {
        if (strategy.pattern.test(parsedContent)) {
          parseAttempts++;
          strategiesUsed.push(strategy.strategyName);
          
          try {
            parsedContent = strategy.handler(parsedContent);
          } catch (error) {
            console.warn(`[NLD-Claude] Strategy failed: ${strategy.strategyName}`, error);
            
            if (strategy.fallback) {
              parsedContent = strategy.fallback(parsedContent);
              fallbackUsed = true;
            }
          }
          
          if (parseAttempts >= this.MAX_PARSE_ATTEMPTS) {
            break;
          }
        }
      }

      // Validate final output
      const validationResult = this.validateParsedOutput(parsedContent, expectedFormat);
      
      if (!validationResult.valid) {
        const failure = this.createFailureRecord(rawContent, expectedFormat, detectedIssues, parseAttempts, fallbackUsed);
        this.recordFailure(failure);
        
        // Apply emergency fallback
        parsedContent = this.applyEmergencyFallback(rawContent, expectedFormat);
        
        return {
          parsedContent,
          success: false,
          failureDetected: failure,
          strategiesUsed
        };
      }

      return {
        parsedContent,
        success: true,
        failureDetected: null,
        strategiesUsed
      };

    } catch (error) {
      console.error(`[NLD-Claude] Critical parsing error:`, error);
      
      const failure = this.createFailureRecord(rawContent, expectedFormat, detectedIssues, parseAttempts, fallbackUsed);
      this.recordFailure(failure);
      
      return {
        parsedContent: this.applyEmergencyFallback(rawContent, expectedFormat),
        success: false,
        failureDetected: failure,
        strategiesUsed
      };
    }
  }

  /**
   * Detect parsing issues in raw content
   */
  private detectParsingIssues(content: string): ClaudeOutputFailure['details'] {
    const ansiSequences = content.match(this.ansiEscapeRegex) || [];
    const boxDrawingChars = this.boxDrawingRegex.test(content);
    const lengthTruncation = content.length > this.TRUNCATION_THRESHOLD;
    
    let jsonParseError = false;
    try {
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        JSON.parse(content);
      }
    } catch (error) {
      jsonParseError = true;
    }

    const unicodeIssues = /[^\x00-\x7F]/.test(content) && !/[\u2010-\u2027\u2030-\u205F]/.test(content);

    return {
      ansiSequences,
      boxDrawingChars,
      jsonParseError,
      unicodeIssues,
      lengthTruncation
    };
  }

  /**
   * Clean ANSI escape sequences
   */
  private cleanAnsiEscapes(content: string): string {
    // Preserve color information in a readable format
    let cleaned = content.replace(/\x1b\[(\d+)m/g, (match, code) => {
      const colorMap: Record<string, string> = {
        '30': '[BLACK]', '31': '[RED]', '32': '[GREEN]', '33': '[YELLOW]',
        '34': '[BLUE]', '35': '[MAGENTA]', '36': '[CYAN]', '37': '[WHITE]',
        '0': '[RESET]', '1': '[BOLD]', '4': '[UNDERLINE]'
      };
      return colorMap[code] || '';
    });

    // Remove remaining ANSI sequences
    cleaned = cleaned.replace(this.ansiEscapeRegex, '');
    
    return cleaned.trim();
  }

  /**
   * Preserve ANSI as readable text (fallback)
   */
  private preserveAnsiAsText(content: string): string {
    return content.replace(/\x1b/g, '\\x1b');
  }

  /**
   * Convert box drawing characters to Unicode equivalents
   */
  private convertBoxDrawing(content: string): string {
    const boxDrawingMap: Record<string, string> = {
      '─': '─', '│': '│', '┌': '┌', '┐': '┐', '└': '└', '┘': '┘',
      '├': '├', '┤': '┤', '┬': '┬', '┴': '┴', '┼': '┼',
      '═': '═', '║': '║', '╔': '╔', '╗': '╗', '╚': '╚', '╝': '╝',
      '╠': '╠', '╣': '╣', '╦': '╦', '╩': '╩', '╬': '╬'
    };

    let converted = content;
    for (const [char, replacement] of Object.entries(boxDrawingMap)) {
      converted = converted.replace(new RegExp(char, 'g'), replacement);
    }

    return converted;
  }

  /**
   * Replace box drawing with ASCII (fallback)
   */
  private replaceBoxDrawingWithAscii(content: string): string {
    const asciiMap: Record<string, string> = {
      '─': '-', '│': '|', '┌': '+', '┐': '+', '└': '+', '┘': '+',
      '├': '+', '┤': '+', '┬': '+', '┴': '+', '┼': '+',
      '═': '=', '║': '|', '╔': '+', '╗': '+', '╚': '+', '╝': '+',
      '╠': '+', '╣': '+', '╦': '+', '╩': '+', '╬': '+'
    };

    let converted = content;
    for (const [char, replacement] of Object.entries(asciiMap)) {
      converted = converted.replace(new RegExp(char, 'g'), replacement);
    }

    return converted;
  }

  /**
   * Format code blocks properly
   */
  private formatCodeBlocks(content: string): string {
    return content.replace(this.codeBlockRegex, (match, language, code) => {
      const lang = language || 'text';
      const cleanCode = code.replace(/^\n+|\n+$/g, '');
      return `\`\`\`${lang}\n${cleanCode}\n\`\`\``;
    });
  }

  /**
   * Preserve code as plaintext (fallback)
   */
  private preserveCodeAsPlaintext(content: string): string {
    return content.replace(this.codeBlockRegex, (match, language, code) => {
      return `[CODE BLOCK - ${language || 'text'}]\n${code}\n[/CODE BLOCK]`;
    });
  }

  /**
   * Parse terminal output format
   */
  private parseTerminalOutput(content: string): string {
    // Wrap terminal commands in appropriate formatting
    return content.replace(this.terminalPromptRegex, (match) => {
      return `<span class="terminal-prompt">${match}</span>`;
    });
  }

  /**
   * Wrap terminal output (fallback)
   */
  private wrapTerminalOutput(content: string): string {
    return `<pre class="terminal-output">${content}</pre>`;
  }

  /**
   * Normalize Unicode characters
   */
  private normalizeUnicode(content: string): string {
    try {
      return content.normalize('NFC');
    } catch (error) {
      console.warn(`[NLD-Claude] Unicode normalization failed:`, error);
      return this.replaceUnicodeWithSafe(content);
    }
  }

  /**
   * Replace problematic Unicode with safe alternatives
   */
  private replaceUnicodeWithSafe(content: string): string {
    // Replace common problematic Unicode with ASCII equivalents
    const unicodeMap: Record<string, string> = {
      '\u2013': '-',    // en dash
      '\u2014': '--',   // em dash
      '\u2018': "'",    // left single quote
      '\u2019': "'",    // right single quote
      '\u201C': '"',    // left double quote
      '\u201D': '"',    // right double quote
      '\u2026': '...',  // ellipsis
    };

    let safe = content;
    for (const [unicode, replacement] of Object.entries(unicodeMap)) {
      safe = safe.replace(new RegExp(unicode, 'g'), replacement);
    }

    // Remove any remaining problematic Unicode
    safe = safe.replace(/[^\x00-\x7F]/g, '?');
    
    return safe;
  }

  /**
   * Validate parsed output
   */
  private validateParsedOutput(content: string, expectedFormat: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for remaining ANSI sequences
    if (this.ansiEscapeRegex.test(content)) {
      issues.push('ANSI_SEQUENCES_REMAINING');
    }

    // Check for malformed JSON if expected
    if (expectedFormat === 'structured_data') {
      try {
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
          JSON.parse(content);
        }
      } catch (error) {
        issues.push('MALFORMED_JSON');
      }
    }

    // Check for excessive length
    if (content.length > this.TRUNCATION_THRESHOLD) {
      issues.push('CONTENT_TOO_LONG');
    }

    // Check for empty content
    if (!content.trim()) {
      issues.push('EMPTY_CONTENT');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Create failure record
   */
  private createFailureRecord(
    rawContent: string,
    expectedFormat: string,
    details: ClaudeOutputFailure['details'],
    parseAttempts: number,
    fallbackUsed: boolean
  ): ClaudeOutputFailure {
    const severityScore = this.calculateSeverity(details, parseAttempts);
    
    return {
      failureId: `CLAUDE_PARSE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      failureType: this.determineFailureType(details),
      rawContent: rawContent.substring(0, 1000), // Truncate for storage
      expectedFormat: expectedFormat as ClaudeOutputFailure['expectedFormat'],
      detectedAt: Date.now(),
      severity: severityScore,
      parseAttempts,
      fallbackUsed,
      details
    };
  }

  /**
   * Calculate failure severity
   */
  private calculateSeverity(details: ClaudeOutputFailure['details'], parseAttempts: number): 'low' | 'medium' | 'high' | 'critical' {
    let score = 0;
    
    if (details.ansiSequences.length > 0) score += 1;
    if (details.boxDrawingChars) score += 2;
    if (details.jsonParseError) score += 3;
    if (details.unicodeIssues) score += 1;
    if (details.lengthTruncation) score += 2;
    if (parseAttempts >= this.MAX_PARSE_ATTEMPTS) score += 2;

    if (score >= 8) return 'critical';
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Determine failure type based on details
   */
  private determineFailureType(details: ClaudeOutputFailure['details']): ClaudeOutputFailure['failureType'] {
    if (details.ansiSequences.length > 3) return 'ANSI_ESCAPE_RENDERING';
    if (details.boxDrawingChars) return 'BOX_DRAWING_DISPLAY';
    if (details.jsonParseError) return 'MESSAGE_FORMAT_CORRUPTION';
    return 'CLAUDE_OUTPUT_PARSING_FAILURE';
  }

  /**
   * Record failure for neural training
   */
  private recordFailure(failure: ClaudeOutputFailure): void {
    this.failureHistory.push(failure);
    
    // Keep only last 100 failures for analysis
    if (this.failureHistory.length > 100) {
      this.failureHistory.shift();
    }

    this.exportNeuralTrainingData(failure);
    console.warn(`[NLD-Claude] Parsing failure recorded:`, failure);
  }

  /**
   * Apply emergency fallback parsing
   */
  private applyEmergencyFallback(rawContent: string, expectedFormat: string): string {
    // Strip all formatting and return clean text
    let fallback = rawContent
      .replace(this.ansiEscapeRegex, '')
      .replace(this.boxDrawingRegex, '+')
      .replace(/[^\x00-\x7F]/g, '?')
      .trim();

    // Apply minimal formatting based on expected format
    switch (expectedFormat) {
      case 'code_block':
        return `\`\`\`\n${fallback}\n\`\`\``;
      case 'terminal_output':
        return `<pre>${fallback}</pre>`;
      case 'structured_data':
        return `{"content": "${fallback.replace(/"/g, '\\"')}"}`;
      default:
        return fallback;
    }
  }

  /**
   * Export neural training data
   */
  private exportNeuralTrainingData(failure: ClaudeOutputFailure): void {
    const trainingData = {
      failure,
      context: {
        totalFailures: this.failureHistory.length,
        recentFailureRate: this.calculateRecentFailureRate(),
        timestamp: Date.now()
      }
    };

    console.log(`[NLD-Claude] Neural training data exported:`, trainingData);
  }

  /**
   * Calculate recent failure rate
   */
  private calculateRecentFailureRate(): number {
    const recentWindow = Date.now() - 300000; // 5 minutes
    const recentFailures = this.failureHistory.filter(f => f.detectedAt > recentWindow);
    return recentFailures.length / 300; // Failures per second
  }

  /**
   * Get parsing statistics
   */
  public getParsingStatistics(): {
    totalFailures: number;
    failuresByType: Record<string, number>;
    averageSeverity: string;
    recentFailureRate: number;
  } {
    const failuresByType = this.failureHistory.reduce((acc, failure) => {
      acc[failure.failureType] = (acc[failure.failureType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const avgSeverityScore = this.failureHistory.reduce((sum, f) => sum + severityScores[f.severity], 0) / this.failureHistory.length;
    const avgSeverity = avgSeverityScore >= 3.5 ? 'critical' : avgSeverityScore >= 2.5 ? 'high' : avgSeverityScore >= 1.5 ? 'medium' : 'low';

    return {
      totalFailures: this.failureHistory.length,
      failuresByType,
      averageSeverity: avgSeverity,
      recentFailureRate: this.calculateRecentFailureRate()
    };
  }

  /**
   * Clear failure history
   */
  public clearHistory(): void {
    this.failureHistory.length = 0;
  }
}

export default ClaudeOutputParserGuardian;