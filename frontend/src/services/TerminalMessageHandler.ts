/**
 * Terminal Message Handler Implementation
 * 
 * Coordinates message handling across terminal subsystems
 */

import {
  TerminalMessageHandlerConfig,
  TerminalMessage,
  TerminalOutput,
  TerminalOutputType,
  TerminalCommandResult,
  TerminalCommandHistory,
  IOutputRenderer,
  IStateManager,
  IEventEmitter,
  IAnalytics
} from '../types/terminal';

export class TerminalMessageHandler {
  private outputRenderer: IOutputRenderer;
  private stateManager: IStateManager;
  private eventEmitter: IEventEmitter;
  private analytics: IAnalytics;

  constructor(config: TerminalMessageHandlerConfig) {
    this.outputRenderer = config.outputRenderer;
    this.stateManager = config.stateManager;
    this.eventEmitter = config.eventEmitter;
    this.analytics = config.analytics;
  }

  handleOutput(data: string): void {
    const output: TerminalOutput = {
      content: data,
      type: 'stdout',
      timestamp: Date.now()
    };

    // Coordinate with renderer
    this.outputRenderer.renderOutput(output);
    this.outputRenderer.scrollToBottom();

    // Coordinate with analytics
    this.analytics.trackPerformance('output_processed', {
      contentLength: data.length,
      timestamp: output.timestamp
    });

    // Emit event for other components
    this.eventEmitter.emit('terminal:output', {
      data,
      timestamp: output.timestamp
    });
  }

  handleError(error: string): void {
    const errorOutput: TerminalOutput = {
      content: error,
      type: 'stderr',
      timestamp: Date.now(),
      isError: true
    };

    // Coordinate with renderer
    this.outputRenderer.renderError(errorOutput);
    this.outputRenderer.scrollToBottom();

    // Coordinate with analytics
    this.analytics.trackError('terminal_error', {
      message: error,
      timestamp: errorOutput.timestamp
    });

    // Emit error event
    this.eventEmitter.emit('terminal:error', {
      error,
      timestamp: errorOutput.timestamp,
      severity: 'error'
    });
  }

  handleConnectionStatus(status: string): void {
    // Coordinate with state manager
    this.stateManager.updateConnectionState(status as any);

    // Track analytics
    this.analytics.trackConnectionEvent('status_change', {
      status,
      timestamp: Date.now()
    });

    // Render status in terminal
    const statusMessage = status === 'connected' ? 'Terminal connected' : 'Terminal disconnected';
    this.outputRenderer.renderOutput({
      content: statusMessage,
      type: 'system',
      timestamp: Date.now(),
      isSystemMessage: true
    });

    // Emit connection event
    this.eventEmitter.emit('terminal:connection', {
      status,
      timestamp: Date.now()
    });
  }

  handleCommandResult(result: TerminalCommandResult | any): void {
    // Handle both structured result objects and simple data
    const commandData = typeof result === 'object' && result.command ? result : { data: result };
    
    if (commandData.command) {
      // Coordinate with state manager
      const historyEntry: TerminalCommandHistory = {
        command: commandData.command,
        exitCode: commandData.exitCode || 0,
        timestamp: Date.now(),
        duration: commandData.duration
      };
      this.stateManager.updateCommandHistory(historyEntry);

      // Coordinate with analytics
      this.analytics.trackCommand({
        command: commandData.command,
        exitCode: commandData.exitCode || 0,
        duration: commandData.duration || 0,
        timestamp: historyEntry.timestamp
      });

      // Handle command failures
      if (commandData.error) {
        this.outputRenderer.renderError({
          content: commandData.error,
          type: 'stderr',
          timestamp: Date.now(),
          isError: true
        });
        
        this.analytics.trackError('command_failed', {
          command: commandData.command,
          exitCode: commandData.exitCode,
          error: commandData.error
        });
      }

      // Render new prompt
      this.outputRenderer.renderPrompt({
        directory: this.stateManager.getCurrentDirectory(),
        exitCode: commandData.exitCode || 0
      });
    } else {
      // Handle simple command result data
      this.handleOutput(String(commandData.data || commandData));
    }
  }

  handleDirectoryChange(directory: string): void {
    // Coordinate with state manager
    this.stateManager.setCurrentDirectory(directory);

    // Render updated prompt
    this.outputRenderer.renderPrompt({
      directory: directory,
      exitCode: 0
    });
  }

  handleMessage(message: TerminalMessage | any): void {
    if (!message.type) {
      this.eventEmitter.emit('terminal:unknown_message', {
        message,
        timestamp: Date.now()
      });
      return;
    }

    switch (message.type) {
      case 'output':
        this.handleOutput(message.data);
        break;
      case 'error':
        this.handleError(message.data);
        break;
      case 'command_result':
        this.handleCommandResult(message.data);
        break;
      case 'directory_change':
        this.handleDirectoryChange(message.data);
        break;
      case 'connection_status':
        this.handleConnectionStatus(message.data);
        break;
      default:
        this.eventEmitter.emit('terminal:unknown_message', {
          message,
          timestamp: Date.now()
        });
    }
  }

  handleBatchMessages(messages: TerminalMessage[]): void {
    // Process all messages
    messages.forEach(message => {
      if (message.type === 'output') {
        const output: TerminalOutput = {
          content: message.data,
          type: 'stdout',
          timestamp: message.timestamp
        };
        this.outputRenderer.renderOutput(output);
      } else {
        this.handleMessage(message);
      }
    });

    // Only scroll once at the end for performance
    this.outputRenderer.scrollToBottom();
  }
}