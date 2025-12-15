/**
 * Tool Call Visualization Formatter
 * Formats Claude Code tool calls with bullet points and proper styling
 */

export interface ToolCall {
  name: string;
  args?: Record<string, any>;
  status?: 'running' | 'completed' | 'error';
  result?: string;
  error?: string;
}

export class ToolCallFormatter {
  /**
   * Format a tool call for terminal display with bullet visualization
   */
  static formatToolCall(toolCall: ToolCall): string {
    const { name, args, status = 'running', result, error } = toolCall;
    
    // Create bullet point based on status
    const bullet = this.getBulletSymbol(status);
    const statusColor = this.getStatusColor(status);
    
    // Format the main tool call line
    let output = `${statusColor}${bullet} ${name}`;
    
    // Add arguments if present
    if (args && Object.keys(args).length > 0) {
      const formattedArgs = this.formatArguments(args);
      output += `(${formattedArgs})`;
    }
    
    output += '\x1b[0m'; // Reset color
    
    // Add result or error on continuation lines
    if (result && status === 'completed') {
      const resultLines = result.split('\n');
      resultLines.forEach(line => {
        if (line.trim()) {
          output += `\n\x1b[32m⎿ ${line}\x1b[0m`;
        }
      });
    } else if (error && status === 'error') {
      output += `\n\x1b[31m⎿ Error: ${error}\x1b[0m`;
    }
    
    return output;
  }
  
  /**
   * Get bullet symbol based on tool status
   */
  private static getBulletSymbol(status: string): string {
    switch (status) {
      case 'running':
        return '●'; // Filled circle for running
      case 'completed':
        return '●'; // Filled circle for completed
      case 'error':
        return '●'; // Filled circle for error (color will differentiate)
      default:
        return '●';
    }
  }
  
  /**
   * Get ANSI color codes for status
   */
  private static getStatusColor(status: string): string {
    switch (status) {
      case 'running':
        return '\x1b[33m'; // Yellow
      case 'completed':
        return '\x1b[32m'; // Green
      case 'error':
        return '\x1b[31m'; // Red
      default:
        return '\x1b[37m'; // White
    }
  }
  
  /**
   * Format tool call arguments
   */
  private static formatArguments(args: Record<string, any>): string {
    const formattedArgs: string[] = [];
    
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string' && value.length > 50) {
        // Truncate long strings
        formattedArgs.push(`${key}: "${value.substring(0, 50)}..."`);
      } else if (typeof value === 'object') {
        formattedArgs.push(`${key}: {...}`);
      } else {
        formattedArgs.push(`${key}: ${JSON.stringify(value)}`);
      }
    }
    
    return formattedArgs.join(', ');
  }
  
  /**
   * Parse Claude Code output to detect tool calls
   */
  static parseToolCalls(output: string): { toolCalls: ToolCall[], cleanOutput: string } {
    const toolCalls: ToolCall[] = [];
    let cleanOutput = output;
    
    // Common tool call patterns in Claude Code output
    const patterns = [
      // Bash tool pattern: Running command: ls
      /Running command:\s*(.+)/gi,
      // Tool invocation: Using tool: Read
      /Using tool:\s*(\w+)/gi,
      // Function call: Calling function read_file
      /Calling function\s+(\w+)/gi,
      // Tool execution: Executing Bash(...)
      /Executing\s+(\w+)\(/gi,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const toolName = match[1].trim();
        toolCalls.push({
          name: toolName,
          status: 'running'
        });
      }
    });
    
    // Look for tool results
    const resultPattern = /Result:\s*(.+)/gi;
    let resultMatch;
    let toolIndex = 0;
    while ((resultMatch = resultPattern.exec(output)) !== null && toolIndex < toolCalls.length) {
      toolCalls[toolIndex].result = resultMatch[1].trim();
      toolCalls[toolIndex].status = 'completed';
      toolIndex++;
    }
    
    return { toolCalls, cleanOutput };
  }
  
  /**
   * Create formatted output with tool calls visualized
   */
  static formatOutputWithToolCalls(output: string): string {
    const { toolCalls, cleanOutput } = this.parseToolCalls(output);
    
    if (toolCalls.length === 0) {
      return output; // No tool calls found, return original
    }
    
    let formattedOutput = cleanOutput;
    
    // Add tool call visualizations at the beginning
    const toolCallsSection = toolCalls
      .map(toolCall => this.formatToolCall(toolCall))
      .join('\n');
    
    return `${toolCallsSection}\n\n${formattedOutput}`;
  }
}

export default ToolCallFormatter;