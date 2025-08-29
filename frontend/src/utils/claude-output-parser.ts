/**
 * Claude Output Parser - Extract clean text from terminal formatting
 * Handles ANSI escape sequences, box drawings, and Claude-specific output
 */

export interface ParsedClaudeMessage {
  type: 'welcome' | 'response' | 'system' | 'error' | 'prompt';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    cwd?: string;
    suggestion?: string;
  };
}

export class ClaudeOutputParser {
  private static readonly ANSI_ESCAPE_REGEX = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
  private static readonly BOX_DRAWING_REGEX = /[╭╮╰╯─│┌┐└┘]/g;
  private static readonly CURSOR_CONTROL_REGEX = /\x1B\[[?]?[0-9]*[hl]/g;
  
  /**
   * Parse Claude's formatted terminal output into clean messages
   */
  static parseClaudeOutput(rawOutput: string): ParsedClaudeMessage[] {
    if (!rawOutput?.trim()) return [];
    
    const messages: ParsedClaudeMessage[] = [];
    const lines = rawOutput.split('\n');
    let currentMessage = '';
    let messageType: ParsedClaudeMessage['type'] = 'response';
    let metadata: ParsedClaudeMessage['metadata'] = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = this.cleanLine(line);
      
      // Skip empty lines and pure formatting
      if (!cleanLine.trim() || this.isOnlyFormatting(cleanLine)) {
        continue;
      }
      
      // Detect message types
      if (cleanLine.includes('Welcome to Claude Code!')) {
        if (currentMessage.trim()) {
          messages.push(this.createMessage(messageType, currentMessage.trim(), metadata));
          currentMessage = '';
        }
        messageType = 'welcome';
        currentMessage = cleanLine;
        
        // Extract cwd from welcome message
        const cwdMatch = lines.slice(i, i + 5).join('\n').match(/cwd:\s*(.+)/);
        if (cwdMatch) {
          metadata.cwd = cwdMatch[1].trim();
        }
      } else if (cleanLine.includes('Claude Opus limit reached') || cleanLine.includes('now using')) {
        // Model switching notification
        if (currentMessage.trim()) {
          messages.push(this.createMessage(messageType, currentMessage.trim(), metadata));
        }
        const modelMatch = cleanLine.match(/now using (.+)/);
        metadata.model = modelMatch ? modelMatch[1] : 'Sonnet 4';
        messages.push(this.createMessage('system', cleanLine, { ...metadata }));
        currentMessage = '';
        messageType = 'response';
      } else if (cleanLine.startsWith('Try "') && cleanLine.includes('"')) {
        // Claude suggestion
        if (currentMessage.trim()) {
          messages.push(this.createMessage(messageType, currentMessage.trim(), metadata));
        }
        const suggestion = cleanLine.match(/Try "([^"]+)"/);
        if (suggestion) {
          metadata.suggestion = suggestion[1];
          messages.push(this.createMessage('system', `Suggestion: ${suggestion[1]}`, { ...metadata }));
        }
        currentMessage = '';
        messageType = 'response';
      } else if (cleanLine.startsWith('>') && cleanLine.length > 2) {
        // User input or Claude response
        const content = cleanLine.substring(1).trim();
        if (content) {
          if (currentMessage.trim()) {
            messages.push(this.createMessage(messageType, currentMessage.trim(), metadata));
          }
          
          // Check if this is a response to user input (contains both user and response)
          const lines_ahead = lines.slice(i + 1, i + 3);
          const hasResponse = lines_ahead.some(l => {
            const clean = this.cleanLine(l);
            return clean.trim() && !clean.startsWith('>') && !this.isOnlyFormatting(clean);
          });
          
          if (hasResponse) {
            // This is user input, collect the response
            currentMessage = `User: ${content}\n`;
            messageType = 'response';
            
            // Collect response lines
            for (let j = i + 1; j < lines.length; j++) {
              const responseLine = this.cleanLine(lines[j]);
              if (!responseLine.trim() || this.isOnlyFormatting(responseLine)) continue;
              if (responseLine.startsWith('>')) break; // Next input
              
              currentMessage += `Claude: ${responseLine.trim()}`;
              break;
            }
          } else {
            // Just user input or prompt
            currentMessage = content;
            messageType = 'prompt';
          }
        }
      } else if (cleanLine.includes('? for shortcuts')) {
        // System help text
        messages.push(this.createMessage('system', 'Press ? for keyboard shortcuts', metadata));
      } else if (cleanLine.trim()) {
        // Regular response content
        if (messageType === 'welcome') {
          currentMessage += ` ${cleanLine}`;
        } else {
          if (currentMessage.trim()) {
            currentMessage += `\n${cleanLine}`;
          } else {
            currentMessage = cleanLine;
            messageType = 'response';
          }
        }
      }
    }
    
    // Add final message if exists
    if (currentMessage.trim()) {
      messages.push(this.createMessage(messageType, currentMessage.trim(), metadata));
    }
    
    return messages.filter(msg => msg.content.trim().length > 0);
  }
  
  /**
   * Clean individual line of ANSI escape sequences and formatting
   */
  private static cleanLine(line: string): string {
    return line
      .replace(this.CURSOR_CONTROL_REGEX, '') // Remove cursor control
      .replace(this.ANSI_ESCAPE_REGEX, '')    // Remove ANSI escape sequences
      .replace(this.BOX_DRAWING_REGEX, '')    // Remove box drawing characters
      .replace(/\s+/g, ' ')                   // Normalize whitespace
      .trim();
  }
  
  /**
   * Check if line contains only formatting characters
   */
  private static isOnlyFormatting(line: string): boolean {
    const cleaned = line.replace(/[\s─│┌┐└┘╭╮╰╯]/g, '');
    return cleaned.length === 0;
  }
  
  /**
   * Create a parsed message object
   */
  private static createMessage(
    type: ParsedClaudeMessage['type'], 
    content: string, 
    metadata: ParsedClaudeMessage['metadata'] = {}
  ): ParsedClaudeMessage {
    return {
      type,
      content: content.trim(),
      timestamp: new Date(),
      metadata: { ...metadata }
    };
  }
  
  /**
   * Extract just the text content from Claude output (simple version)
   */
  static extractTextContent(rawOutput: string): string {
    const messages = this.parseClaudeOutput(rawOutput);
    return messages
      .filter(msg => msg.type === 'response' || msg.type === 'welcome')
      .map(msg => msg.content)
      .join('\n')
      .trim();
  }
  
  /**
   * Check if output contains a Claude response (not just echo)
   */
  static hasClaudeResponse(rawOutput: string): boolean {
    const messages = this.parseClaudeOutput(rawOutput);
    return messages.some(msg => 
      msg.type === 'response' && 
      msg.content.toLowerCase() !== 'hello' && // Not just echo
      !msg.content.startsWith('User:') // Not just user input
    );
  }
}

export default ClaudeOutputParser;