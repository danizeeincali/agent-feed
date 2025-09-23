/**
 * Tool Usage Capture Agent
 * SPARC Implementation - Captures and displays tool usage in terminal only
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { stripAnsi } from '../utils/terminal';

interface ToolUsageEvent {
  id: string;
  instanceId: string;
  toolName: string;
  operation: string;
  parameters?: Record<string, any>;
  result?: {
    success: boolean;
    output?: string;
    error?: string;
    duration: number;
  };
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface TerminalDisplay {
  write(content: string): void;
  clear(): void;
  setTitle(title: string): void;
}

export class ToolUsageCaptureAgent extends EventEmitter {
  private activeTools: Map<string, ToolUsageEvent> = new Map();
  private toolHistory: ToolUsageEvent[] = [];
  private terminalDisplays: Map<string, TerminalDisplay> = new Map();
  private readonly maxHistorySize = 100;

  constructor() {
    super();
    this.setupToolCapture();
    logger.info('ToolUsageCaptureAgent initialized');
  }

  /**
   * Register terminal display for instance
   */
  public registerTerminalDisplay(instanceId: string, display: TerminalDisplay): void {
    this.terminalDisplays.set(instanceId, display);
    display.setTitle(`Claude Code Terminal - ${instanceId.slice(0, 8)}`);
    
    // Show recent tool history
    this.displayToolHistory(instanceId);
    
    logger.debug(`Terminal display registered for instance: ${instanceId}`);
  }

  /**
   * Unregister terminal display
   */
  public unregisterTerminalDisplay(instanceId: string): void {
    this.terminalDisplays.delete(instanceId);
    logger.debug(`Terminal display unregistered for instance: ${instanceId}`);
  }

  /**
   * Setup tool usage capture hooks
   */
  private setupToolCapture(): void {
    // Capture tool start events
    this.on('toolStart', (event: Omit<ToolUsageEvent, 'id' | 'timestamp'>) => {
      const toolEvent: ToolUsageEvent = {
        ...event,
        id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };

      this.activeTools.set(toolEvent.id, toolEvent);
      this.displayToolStart(toolEvent);
    });

    // Capture tool completion events
    this.on('toolComplete', (toolId: string, result: ToolUsageEvent['result']) => {
      const toolEvent = this.activeTools.get(toolId);
      if (toolEvent) {
        toolEvent.result = result;
        this.activeTools.delete(toolId);
        this.toolHistory.unshift(toolEvent);
        
        // Maintain history size limit
        if (this.toolHistory.length > this.maxHistorySize) {
          this.toolHistory = this.toolHistory.slice(0, this.maxHistorySize);
        }

        this.displayToolComplete(toolEvent);
      }
    });
  }

  /**
   * Capture tool execution from Claude Code
   */
  public captureToolExecution(
    instanceId: string,
    toolName: string,
    operation: string,
    parameters?: Record<string, any>,
    metadata?: Record<string, any>
  ): string {
    const toolEvent = {
      instanceId,
      toolName,
      operation,
      parameters,
      metadata
    };

    this.emit('toolStart', toolEvent);
    
    // Return tool ID for completion tracking
    const toolId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return toolId;
  }

  /**
   * Complete tool execution tracking
   */
  public completeToolExecution(
    toolId: string,
    success: boolean,
    output?: string,
    error?: string,
    duration?: number
  ): void {
    const result = {
      success,
      output,
      error,
      duration: duration || 0
    };

    this.emit('toolComplete', toolId, result);
  }

  /**
   * Display tool start in terminal
   */
  private displayToolStart(event: ToolUsageEvent): void {
    const display = this.terminalDisplays.get(event.instanceId);
    if (!display) return;

    const timestamp = event.timestamp.toLocaleTimeString();
    const params = this.formatParameters(event.parameters);
    
    let line = `\n[TOOL] ${timestamp} | ${event.toolName}`;
    if (event.operation) {
      line += ` -> ${event.operation}`;
    }
    if (params) {
      line += ` ${params}`;
    }
    line += ' ...';

    display.write(`\x1b[36m${line}\x1b[0m`); // Cyan color for tool start
  }

  /**
   * Display tool completion in terminal
   */
  private displayToolComplete(event: ToolUsageEvent): void {
    const display = this.terminalDisplays.get(event.instanceId);
    if (!display || !event.result) return;

    const duration = event.result.duration ? ` (${event.result.duration}ms)` : '';
    const status = event.result.success ? 'SUCCESS' : 'FAILED';
    const color = event.result.success ? '\x1b[32m' : '\x1b[31m'; // Green or red
    
    let line = ` ${color}[${status}]${duration}\x1b[0m`;
    
    if (event.result.output) {
      const output = this.formatOutput(event.result.output);
      line += `\n  ${output}`;
    }
    
    if (event.result.error) {
      line += `\n  \x1b[31mError: ${event.result.error}\x1b[0m`;
    }

    display.write(line);
  }

  /**
   * Display tool history for new terminal connections
   */
  private displayToolHistory(instanceId: string): void {
    const display = this.terminalDisplays.get(instanceId);
    if (!display) return;

    const instanceHistory = this.toolHistory
      .filter(event => event.instanceId === instanceId)
      .slice(0, 10) // Show last 10 tools
      .reverse(); // Show in chronological order

    if (instanceHistory.length > 0) {
      display.write('\n\x1b[90m--- Recent Tool Usage ---\x1b[0m');
      
      for (const event of instanceHistory) {
        const timestamp = event.timestamp.toLocaleTimeString();
        const status = event.result?.success ? 'SUCCESS' : 'FAILED';
        const color = event.result?.success ? '\x1b[32m' : '\x1b[31m';
        const duration = event.result?.duration ? ` (${event.result.duration}ms)` : '';
        
        let line = `\n[HIST] ${timestamp} | ${event.toolName}`;
        if (event.operation) {
          line += ` -> ${event.operation}`;
        }
        line += ` ${color}[${status}]${duration}\x1b[0m`;
        
        display.write(`\x1b[90m${line}\x1b[0m`); // Gray for history
      }
      
      display.write('\n\x1b[90m--- End History ---\x1b[0m\n');
    }
  }

  /**
   * Format tool parameters for display
   */
  private formatParameters(parameters?: Record<string, any>): string {
    if (!parameters || Object.keys(parameters).length === 0) {
      return '';
    }

    const formatted: string[] = [];
    for (const [key, value] of Object.entries(parameters)) {
      let formattedValue: string;
      
      if (typeof value === 'string' && value.length > 50) {
        formattedValue = `"${value.slice(0, 47)}..."`;
      } else if (typeof value === 'object') {
        formattedValue = JSON.stringify(value);
        if (formattedValue.length > 50) {
          formattedValue = `${formattedValue.slice(0, 47)}...`;
        }
      } else {
        formattedValue = String(value);
      }
      
      formatted.push(`${key}: ${formattedValue}`);
    }

    return `(${formatted.join(', ')})`;
  }

  /**
   * Format tool output for display
   */
  private formatOutput(output: string): string {
    // Clean ANSI codes and limit output length
    const cleaned = stripAnsi(output);
    const lines = cleaned.split('\n');
    
    if (lines.length > 3) {
      return `${lines.slice(0, 2).join('\n')}\n  ... (${lines.length - 2} more lines)`;
    }
    
    if (cleaned.length > 100) {
      return `${cleaned.slice(0, 97)}...`;
    }
    
    return cleaned;
  }

  /**
   * Get tool usage statistics
   */
  public getToolStats(): Record<string, any> {
    const stats = {
      activeTools: this.activeTools.size,
      totalToolsExecuted: this.toolHistory.length,
      toolsByType: {} as Record<string, number>,
      toolsByInstance: {} as Record<string, number>,
      successRate: 0,
      averageDuration: 0
    };

    let totalDuration = 0;
    let successCount = 0;

    for (const event of this.toolHistory) {
      // Count by tool type
      stats.toolsByType[event.toolName] = (stats.toolsByType[event.toolName] || 0) + 1;
      
      // Count by instance
      stats.toolsByInstance[event.instanceId] = (stats.toolsByInstance[event.instanceId] || 0) + 1;
      
      if (event.result) {
        if (event.result.success) successCount++;
        totalDuration += event.result.duration || 0;
      }
    }

    if (this.toolHistory.length > 0) {
      stats.successRate = (successCount / this.toolHistory.length) * 100;
      stats.averageDuration = totalDuration / this.toolHistory.length;
    }

    return stats;
  }

  /**
   * Clear tool history
   */
  public clearHistory(): void {
    this.toolHistory = [];
    logger.info('Tool usage history cleared');
  }

  /**
   * Shutdown agent
   */
  public shutdown(): void {
    this.activeTools.clear();
    this.toolHistory = [];
    this.terminalDisplays.clear();
    this.removeAllListeners();
    
    logger.info('ToolUsageCaptureAgent shutdown complete');
  }
}

export default ToolUsageCaptureAgent;