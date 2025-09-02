/**
 * Tool Call Output Visualization System
 * Formats and tracks Claude tool calls for real-time WebSocket broadcasting
 * 
 * INTEGRATION POINTS:
 * - Enhances existing Claude output before broadcasting
 * - Uses current stable WebSocket pipeline
 * - No new connection managers or services
 * - Modifies only output formatting, not connection logic
 * 
 * SAFETY MEASURES:
 * - Fails gracefully if tool call formatting fails
 * - No async operations that could cause timing issues
 * - Uses existing logging and error handling patterns
 * - Zero performance impact on WebSocket stability
 */

class ToolCallFormatter {
  constructor() {
    this.activeToolCalls = new Map(); // toolCallId -> { status, startTime, toolName, parameters, result }
    this.toolCallCounter = 0;
    this.debugMode = process.env.NODE_ENV !== 'production';
  }

  /**
   * Generates a unique tool call ID for tracking
   * @returns {string} Unique tool call identifier
   */
  generateToolCallId() {
    this.toolCallCounter++;
    return `tool_${Date.now()}_${this.toolCallCounter}`;
  }

  /**
   * Detects if output contains tool calls using pattern matching
   * @param {string} output - Raw Claude output to analyze
   * @returns {Object|null} Parsed tool call information or null
   */
  detectToolCall(output) {
    try {
      // Pattern 1: Standard function calls with antml:function_calls
      // Must have proper opening and closing tags, and be well-formed
      const functionCallPattern = /<function_calls>\s*<invoke name="([^"]+)">/;
      const functionMatch = output.match(functionCallPattern);
      
      if (functionMatch) {
        const toolName = functionMatch[1];
        
        // SAFETY: Ensure this is a well-formed tool call by checking for closing tags
        if (!output.includes('</invoke>') || !output.includes('</function_calls>')) {
          return null; // Malformed, treat as regular output
        }
        
        const parametersMatch = output.match(/<parameter name="([^"]+)">([\s\S]*?)<\/parameter>/g);
        const parameters = {};
        
        if (parametersMatch) {
          parametersMatch.forEach(paramMatch => {
            const paramPattern = /<parameter name="([^"]+)">([\s\S]*?)<\/parameter>/;
            const match = paramMatch.match(paramPattern);
            if (match) {
              parameters[match[1]] = match[2].trim();
            }
          });
        }

        return {
          type: 'tool_call',
          toolName,
          parameters,
          rawOutput: output
        };
      }

      // Pattern 2: Tool results/responses
      const resultPattern = /<\/antml:function_calls>|<function_results>/;
      if (resultPattern.test(output)) {
        return {
          type: 'tool_result',
          rawOutput: output
        };
      }

      // Pattern 3: Claude Code Tool Detection - Look for typical Claude responses that indicate tool usage
      const claudeToolPatterns = [
        // Detect when Claude is about to use tools or has used them
        { pattern: /I'll (?:use|run|check|read|search|create|write|edit|look at|examine|analyze)/i, tool: 'Read' },
        { pattern: /Let me (?:use|run|check|read|search|create|write|edit|look at|examine|analyze)/i, tool: 'Read' }, 
        { pattern: /I'm (?:using|running|checking|reading|searching|creating|writing|editing|looking at|examining|analyzing)/i, tool: 'Read' },
        { pattern: /I can see (?:that |from )?(?:the |this )?(?:file|directory|package\.json|.*\.js|.*\.ts|.*\.json)/i, tool: 'Read' },
        { pattern: /The (?:file|directory|package\.json|.*\.js|.*\.ts|.*\.json) (?:shows|contains|indicates)/i, tool: 'Read' },
        { pattern: /Based on (?:the |this )?(?:file|directory|package\.json|analysis)/i, tool: 'Read' },
        // Command execution patterns
        { pattern: /Running command:(.+)/i, tool: 'Bash' },
        { pattern: /Executing:(.+)/i, tool: 'Bash' },
        { pattern: /\$ (.+)/i, tool: 'Bash' }
      ];
      
      // Check if Claude is describing tool usage
      for (const { pattern, tool } of claudeToolPatterns) {
        if (pattern.test(output)) {
          return {
            type: 'tool_execution',
            toolName: tool,
            parameters: { description: output.trim() },
            rawOutput: output
          };
        }
      }

      // Legacy execution patterns
      const executionPatterns = [
        /Running command:/i,
        /Executing:/i,
        /Tool Output:/i,
        /Command executed:/i,
        /<\/function_calls>/  // End of function calls also indicates execution
      ];

      for (const pattern of executionPatterns) {
        if (pattern.test(output)) {
          return {
            type: 'tool_execution',
            rawOutput: output
          };
        }
      }

      return null;
    } catch (error) {
      // SAFETY: Graceful degradation - log error but don't throw
      if (this.debugMode) {
        console.warn('⚠️ ToolCallFormatter: Error detecting tool call:', error.message);
      }
      return null;
    }
  }

  /**
   * Formats tool call output for visualization
   * @param {string} output - Raw Claude output
   * @param {string} instanceId - Claude instance identifier
   * @returns {Object} Formatted message object for WebSocket broadcasting
   */
  formatToolCallOutput(output, instanceId) {
    try {
      const toolCallInfo = this.detectToolCall(output);
      
      if (!toolCallInfo) {
        // Not a tool call, return original format
        return {
          type: 'output',
          data: output,
          terminalId: instanceId,
          timestamp: Date.now(),
          source: 'process',
          enhanced: false
        };
      }
      
      // SAFETY CHECK: If this looks like a malformed tool call, treat as regular output
      if (toolCallInfo.type === 'tool_call' && (!toolCallInfo.toolName || toolCallInfo.toolName.length === 0)) {
        return {
          type: 'output',
          data: output,
          terminalId: instanceId,
          timestamp: Date.now(),
          source: 'process',
          enhanced: false,
          error: 'formatting_failed'
        };
      }

      // Generate tool call ID and track status
      const toolCallId = this.generateToolCallId();
      const timestamp = Date.now();

      switch (toolCallInfo.type) {
        case 'tool_call':
          this.activeToolCalls.set(toolCallId, {
            status: 'starting',
            startTime: timestamp,
            toolName: toolCallInfo.toolName,
            parameters: toolCallInfo.parameters,
            instanceId
          });

          // CREATE CLAUDE CODE STYLE VISUALIZATION
          const toolIcon = this.getToolIcon(toolCallInfo.toolName);
          const toolDisplayName = this.getToolDisplayName(toolCallInfo.toolName);
          const parameterDisplay = this.formatParameterDisplay(toolCallInfo.parameters);
          
          const visualOutput = `${toolIcon} ${toolDisplayName}(${parameterDisplay})\n⎿ Starting tool execution...`;

          return {
            type: 'tool_call',
            data: visualOutput,
            terminalId: instanceId,
            timestamp,
            source: 'claude-tools',
            enhanced: true,
            toolCall: {
              id: toolCallId,
              status: 'starting',
              toolName: toolCallInfo.toolName,
              parameters: toolCallInfo.parameters,
              displayName: toolDisplayName,
              icon: toolIcon
            }
          };

        case 'tool_result':
          return {
            type: 'tool_result',
            data: output,
            terminalId: instanceId,
            timestamp,
            source: 'claude-tools',
            enhanced: true,
            toolResult: {
              status: 'completed',
              content: this.extractToolResult(output)
            }
          };

        case 'tool_execution':
          // CREATE CLAUDE CODE STYLE VISUALIZATION FOR DETECTED TOOL USAGE
          const detectedTool = toolCallInfo.toolName || 'Tool';
          const activity = this.extractExecutionActivity(output);
          const formattedOutput = `● ${detectedTool}(${activity})\n⎿ ${output.trim()}`;

          return {
            type: 'tool_execution',
            data: formattedOutput,
            terminalId: instanceId,
            timestamp,
            source: 'claude-tools',
            enhanced: true,
            toolExecution: {
              status: 'running',
              activity: activity
            }
          };

        default:
          return {
            type: 'output',
            data: output,
            terminalId: instanceId,
            timestamp,
            source: 'process',
            enhanced: false
          };
      }
    } catch (error) {
      // SAFETY: Graceful degradation - return original format on any error
      if (this.debugMode) {
        console.error('❌ ToolCallFormatter: Error formatting tool call output:', error);
      }
      
      return {
        type: 'output',
        data: output,
        terminalId: instanceId,
        timestamp: Date.now(),
        source: 'process',
        enhanced: false,
        error: 'formatting_failed'
      };
    }
  }

  /**
   * Updates the status of an active tool call
   * @param {string} toolCallId - Tool call identifier
   * @param {string} status - New status ('running', 'completed', 'failed')
   * @param {Object} additionalData - Additional data to merge
   */
  updateToolCallStatus(toolCallId, status, additionalData = {}) {
    try {
      const toolCall = this.activeToolCalls.get(toolCallId);
      if (toolCall) {
        toolCall.status = status;
        toolCall.lastUpdate = Date.now();
        Object.assign(toolCall, additionalData);
        
        if (status === 'completed' || status === 'failed') {
          toolCall.duration = Date.now() - toolCall.startTime;
        }
      }
    } catch (error) {
      // SAFETY: Silent failure for status updates
      if (this.debugMode) {
        console.warn('⚠️ ToolCallFormatter: Error updating tool call status:', error.message);
      }
    }
  }

  /**
   * Gets a human-readable display name for a tool
   * @param {string} toolName - Technical tool name
   * @returns {string} Human-readable display name
   */
  getToolDisplayName(toolName) {
    const displayNames = {
      'Bash': 'Terminal Command',
      'Read': 'Read File',
      'Write': 'Write File',
      'Edit': 'Edit File',
      'MultiEdit': 'Edit Multiple Files',
      'Grep': 'Search Files',
      'Glob': 'Find Files',
      'WebFetch': 'Fetch URL',
      'TodoWrite': 'Update Tasks',
      'WebSearch': 'Web Search'
    };
    
    return displayNames[toolName] || toolName;
  }

  /**
   * Gets an icon for a tool type
   * @param {string} toolName - Technical tool name
   * @returns {string} Icon identifier
   */
  getToolIcon(toolName) {
    // Use Claude Code style bullet points for all tools
    return '●';
  }

  /**
   * Formats tool parameters for display
   * @param {Object} parameters - Tool parameters
   * @returns {string} Formatted parameter display
   */
  formatParameterDisplay(parameters) {
    if (!parameters || Object.keys(parameters).length === 0) {
      return '';
    }
    
    // For Bash commands, show the command
    if (parameters.command) {
      return parameters.command;
    }
    
    // For file operations, show the file path
    if (parameters.file_path || parameters.path) {
      return parameters.file_path || parameters.path;
    }
    
    // For search operations, show the pattern
    if (parameters.pattern) {
      return parameters.pattern;
    }
    
    // Default: show first parameter value
    const firstParam = Object.values(parameters)[0];
    if (typeof firstParam === 'string') {
      return firstParam.length > 50 ? firstParam.substring(0, 50) + '...' : firstParam;
    }
    
    return Object.keys(parameters).join(', ');
  }

  /**
   * Extracts tool result content from raw output
   * @param {string} output - Raw tool result output
   * @returns {string} Extracted result content
   */
  extractToolResult(output) {
    try {
      // Look for result content between function_results tags
      const resultMatch = output.match(/<function_results>(.*?)<\/function_results>/s);
      if (resultMatch) {
        return resultMatch[1].trim();
      }
      
      // Fallback: return truncated output
      return output.substring(0, 500) + (output.length > 500 ? '...' : '');
    } catch (error) {
      return 'Result extraction failed';
    }
  }

  /**
   * Extracts execution activity from tool execution output
   * @param {string} output - Raw execution output
   * @returns {string} Extracted activity description
   */
  extractExecutionActivity(output) {
    try {
      // Extract the actual command or activity being performed
      const lines = output.split('\n');
      const activityLine = lines.find(line => 
        line.includes('Running') || 
        line.includes('Executing') || 
        line.includes('Command')
      );
      
      return activityLine ? activityLine.trim() : 'Tool execution in progress';
    } catch (error) {
      return 'Processing...';
    }
  }

  /**
   * Gets statistics about active tool calls
   * @returns {Object} Tool call statistics
   */
  getStatistics() {
    const stats = {
      active: 0,
      completed: 0,
      failed: 0,
      total: this.activeToolCalls.size
    };

    for (const toolCall of this.activeToolCalls.values()) {
      switch (toolCall.status) {
        case 'starting':
        case 'running':
          stats.active++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'failed':
          stats.failed++;
          break;
      }
    }

    return stats;
  }

  /**
   * Cleans up old completed tool calls to prevent memory leaks
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   */
  cleanup(maxAge = 3600000) {
    try {
      const now = Date.now();
      const toDelete = [];

      for (const [id, toolCall] of this.activeToolCalls.entries()) {
        if (toolCall.lastUpdate && (now - toolCall.lastUpdate > maxAge)) {
          toDelete.push(id);
        }
      }

      toDelete.forEach(id => this.activeToolCalls.delete(id));
      
      if (this.debugMode && toDelete.length > 0) {
        console.log(`🧹 ToolCallFormatter: Cleaned up ${toDelete.length} old tool calls`);
      }
    } catch (error) {
      // SAFETY: Silent cleanup failure
      if (this.debugMode) {
        console.warn('⚠️ ToolCallFormatter: Cleanup error:', error.message);
      }
    }
  }
}

// Export singleton instance for consistent state across the application
const toolCallFormatter = new ToolCallFormatter();

// Start cleanup interval (every 10 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    toolCallFormatter.cleanup();
  }, 600000);
}

module.exports = { 
  ToolCallFormatter, 
  toolCallFormatter 
};