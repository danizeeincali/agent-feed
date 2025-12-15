# Detailed Implementation Specifications

## 1. Frontend Component Specifications

### StreamingTicker Component

```typescript
interface StreamingTickerProps {
  sessionId: string;
  commandId: string;
  config: StreamingConfig;
  onComplete?: (result: ExecutionResult) => void;
  onError?: (error: StreamingError) => void;
  className?: string;
}

interface StreamingConfig {
  // Display options
  showToolDetails: boolean;
  showTimestamps: boolean;
  showProgressBar: boolean;
  maxVisibleItems: number;
  autoScroll: boolean;

  // Performance options
  throttleUpdates: boolean;
  bufferSize: number;
  updateInterval: number;

  // Feature toggles
  enableVirtualScrolling: boolean;
  enableMemoization: boolean;
  enableErrorRecovery: boolean;
}

export const StreamingTicker: React.FC<StreamingTickerProps> = ({
  sessionId,
  commandId,
  config,
  onComplete,
  onError,
  className
}) => {
  // Core state
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [activeTool, setActiveTool] = useState<ToolCallState | null>(null);
  const [metrics, setMetrics] = useState<StreamingMetrics>({
    messageCount: 0,
    errorCount: 0,
    averageLatency: 0,
    throughput: 0
  });

  // Refs for performance
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const updateThrottleRef = useRef<number>();

  // Custom hooks
  const {
    connection,
    isConnected,
    error: connectionError
  } = useStreamingConnection({
    sessionId,
    commandId,
    onMessage: handleMessage,
    onError: handleConnectionError,
    onComplete: handleComplete
  });

  const {
    parsedMessages,
    parseError
  } = useOutputParser({
    rawMessages: messages,
    config: config.parsingConfig
  });

  const {
    visibleItems,
    scrollToBottom
  } = useVirtualScrolling({
    items: parsedMessages,
    containerRef,
    enabled: config.enableVirtualScrolling,
    itemHeight: 40,
    bufferSize: 10
  });

  // Event handlers
  const handleMessage = useCallback((message: RawMessage) => {
    const timestamp = Date.now();

    // Throttle updates if enabled
    if (config.throttleUpdates) {
      if (updateThrottleRef.current) {
        clearTimeout(updateThrottleRef.current);
      }

      updateThrottleRef.current = window.setTimeout(() => {
        processMessage(message, timestamp);
      }, config.updateInterval);
    } else {
      processMessage(message, timestamp);
    }
  }, [config.throttleUpdates, config.updateInterval]);

  const processMessage = useCallback((message: RawMessage, timestamp: number) => {
    setMessages(prev => {
      const newMessages = [...prev, { ...message, timestamp }];

      // Limit buffer size
      if (newMessages.length > config.bufferSize) {
        return newMessages.slice(-config.bufferSize);
      }

      return newMessages;
    });

    // Update metrics
    setMetrics(prev => ({
      ...prev,
      messageCount: prev.messageCount + 1,
      averageLatency: calculateLatency(message, timestamp)
    }));

    // Auto-scroll if enabled
    if (config.autoScroll) {
      scrollToBottom();
    }
  }, [config.bufferSize, config.autoScroll, scrollToBottom]);

  const handleConnectionError = useCallback((error: StreamingError) => {
    setConnectionStatus('error');
    onError?.(error);

    // Attempt recovery if enabled
    if (config.enableErrorRecovery) {
      connection.attemptRecovery();
    }
  }, [config.enableErrorRecovery, connection, onError]);

  const handleComplete = useCallback((result: ExecutionResult) => {
    setConnectionStatus('completed');
    onComplete?.(result);
  }, [onComplete]);

  // Render helpers
  const renderMessage = useCallback((message: ParsedMessage, index: number) => {
    return (
      <TickerMessage
        key={`${message.id}-${index}`}
        message={message}
        showDetails={config.showToolDetails}
        showTimestamp={config.showTimestamps}
      />
    );
  }, [config.showToolDetails, config.showTimestamps]);

  const renderConnectionStatus = () => (
    <ConnectionStatusIndicator
      status={connectionStatus}
      metrics={metrics}
      error={connectionError}
    />
  );

  const renderProgressBar = () => {
    if (!config.showProgressBar || !activeTool) return null;

    return (
      <ProgressBar
        tool={activeTool}
        estimatedDuration={activeTool.estimatedDuration}
      />
    );
  };

  // Effects
  useEffect(() => {
    // Initialize connection
    connection.connect();

    return () => {
      connection.disconnect();
      if (updateThrottleRef.current) {
        clearTimeout(updateThrottleRef.current);
      }
    };
  }, [connection]);

  // Render
  return (
    <div className={cn('streaming-ticker', className)}>
      {/* Header */}
      <div className="ticker-header">
        {renderConnectionStatus()}
        {renderProgressBar()}
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="ticker-messages"
        style={{
          height: config.enableVirtualScrolling ? '400px' : 'auto',
          overflow: config.enableVirtualScrolling ? 'auto' : 'visible'
        }}
      >
        {config.enableVirtualScrolling
          ? visibleItems.map(renderMessage)
          : parsedMessages.slice(-config.maxVisibleItems).map(renderMessage)
        }
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="ticker-footer">
        <StreamingMetrics metrics={metrics} />
      </div>
    </div>
  );
};
```

### TickerMessage Component

```typescript
interface TickerMessageProps {
  message: ParsedMessage;
  showDetails: boolean;
  showTimestamp: boolean;
}

export const TickerMessage: React.FC<TickerMessageProps> = ({
  message,
  showDetails,
  showTimestamp
}) => {
  const getMessageIcon = (type: MessageType) => {
    switch (type) {
      case 'tool-start':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'tool-executing':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'tool-complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'tool-error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'text':
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
      case 'file-operation':
        return <FileText className="w-4 h-4 text-purple-500" />;
      case 'command':
        return <Terminal className="w-4 h-4 text-yellow-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const renderContent = () => {
    switch (message.type) {
      case 'tool-start':
      case 'tool-executing':
        return (
          <div className="flex items-center space-x-2">
            <span className="font-medium">{message.content.name}</span>
            {showDetails && message.content.parameters && (
              <span className="text-sm text-gray-500">
                ({Object.keys(message.content.parameters).length} params)
              </span>
            )}
          </div>
        );

      case 'tool-complete':
        const duration = message.content.endTime - message.content.startTime;
        return (
          <div className="flex items-center space-x-2">
            <span className="font-medium">{message.content.name}</span>
            <span className="text-sm text-gray-500">
              completed in {(duration / 1000).toFixed(2)}s
            </span>
          </div>
        );

      case 'tool-error':
        return (
          <div className="flex items-center space-x-2">
            <span className="font-medium text-red-600">{message.content.name}</span>
            <span className="text-sm text-red-500">
              failed: {message.content.error}
            </span>
          </div>
        );

      case 'file-operation':
        return (
          <div className="flex items-center space-x-2">
            <span className="font-medium">{message.content.operation}</span>
            <span className="text-sm text-gray-500 font-mono">
              {message.content.fileName}
            </span>
          </div>
        );

      case 'command':
        return (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
              {message.content.command}
            </span>
          </div>
        );

      default:
        return (
          <div className="text-sm">
            {message.content.length > 100 && !showDetails
              ? `${message.content.substring(0, 100)}...`
              : message.content
            }
          </div>
        );
    }
  };

  return (
    <div className={cn(
      'ticker-message flex items-start space-x-3 p-2 rounded-lg transition-colors',
      message.type === 'tool-error' && 'bg-red-50',
      message.type.startsWith('tool-') && message.type !== 'tool-error' && 'bg-blue-50',
      message.type === 'file-operation' && 'bg-purple-50'
    )}>
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {getMessageIcon(message.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {renderContent()}
      </div>

      {/* Timestamp */}
      {showTimestamp && (
        <div className="flex-shrink-0 text-xs text-gray-400">
          {formatTimestamp(message.timestamp)}
        </div>
      )}
    </div>
  );
};
```

## 2. Backend API Implementation

### SSE Streaming Endpoint

```typescript
// pages/api/streaming/claude-output.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { ClaudeOutputProcessor } from '@/services/claude/OutputProcessor';
import { SSEStreamManager } from '@/services/streaming/SSEStreamManager';
import { AuthenticationService } from '@/services/auth/AuthenticationService';

interface StreamingRequest extends NextApiRequest {
  query: {
    sessionId: string;
    commandId: string;
    streamType: 'full' | 'tools-only' | 'text-only';
  };
}

export default async function handler(
  req: StreamingRequest,
  res: NextApiResponse
) {
  // Authentication
  const authService = new AuthenticationService();
  const session = await authService.validateSession(req);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate parameters
  const { sessionId, commandId, streamType = 'full' } = req.query;

  if (!sessionId || !commandId) {
    return res.status(400).json({
      error: 'Missing required parameters: sessionId, commandId'
    });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'Access-Control-Allow-Credentials': 'true',
    'X-Accel-Buffering': 'no' // Disable Nginx buffering
  });

  // Initialize services
  const streamManager = new SSEStreamManager(res, {
    sessionId,
    commandId,
    streamType,
    userId: session.userId
  });

  const outputProcessor = new ClaudeOutputProcessor({
    onMessage: (message) => streamManager.sendMessage(message),
    onToolStart: (tool) => streamManager.sendToolStart(tool),
    onToolComplete: (tool) => streamManager.sendToolComplete(tool),
    onError: (error) => streamManager.sendError(error),
    onComplete: (result) => streamManager.sendComplete(result)
  });

  try {
    // Start processing Claude output
    await outputProcessor.processCommand(commandId);

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      streamManager.sendHeartbeat();
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      streamManager.cleanup();
      outputProcessor.cleanup();
    });

    req.on('error', (error) => {
      console.error('SSE request error:', error);
      clearInterval(heartbeat);
      streamManager.cleanup();
      outputProcessor.cleanup();
    });

  } catch (error) {
    console.error('SSE streaming error:', error);
    streamManager.sendError({
      type: 'server_error',
      message: 'Failed to initialize streaming',
      recoverable: false
    });
    res.end();
  }
}

// Disable body parsing for SSE
export const config = {
  api: {
    bodyParser: false,
  },
};
```

### SSE Stream Manager

```typescript
// services/streaming/SSEStreamManager.ts
import { NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

interface SSEConfig {
  sessionId: string;
  commandId: string;
  streamType: 'full' | 'tools-only' | 'text-only';
  userId: string;
}

export class SSEStreamManager {
  private response: NextApiResponse;
  private config: SSEConfig;
  private messageSequence: number = 0;
  private isActive: boolean = true;
  private metrics: StreamingMetrics;

  constructor(response: NextApiResponse, config: SSEConfig) {
    this.response = response;
    this.config = config;
    this.metrics = {
      startTime: Date.now(),
      messageCount: 0,
      errorCount: 0,
      bytesTransferred: 0
    };

    // Send initial connection event
    this.sendEvent('connected', {
      sessionId: config.sessionId,
      commandId: config.commandId,
      streamType: config.streamType,
      timestamp: Date.now()
    });
  }

  public sendMessage(message: ParsedMessage): void {
    if (!this.isActive) return;

    // Filter based on stream type
    if (!this.shouldSendMessage(message)) return;

    this.sendEvent('message', {
      ...message,
      sequence: this.messageSequence++,
      timestamp: Date.now()
    });

    this.updateMetrics(message);
  }

  public sendToolStart(tool: ToolCallState): void {
    if (!this.isActive || this.config.streamType === 'text-only') return;

    this.sendEvent('tool-start', {
      toolName: tool.name,
      parameters: tool.parameters,
      toolId: tool.id,
      timestamp: Date.now()
    });
  }

  public sendToolComplete(tool: ToolCallState): void {
    if (!this.isActive || this.config.streamType === 'text-only') return;

    const duration = tool.endTime! - tool.startTime;

    this.sendEvent('tool-complete', {
      toolName: tool.name,
      toolId: tool.id,
      result: tool.result,
      duration,
      timestamp: Date.now()
    });
  }

  public sendError(error: StreamingError): void {
    if (!this.isActive) return;

    this.sendEvent('error', {
      ...error,
      timestamp: Date.now(),
      sequence: this.messageSequence++
    });

    this.metrics.errorCount++;
  }

  public sendComplete(result: ExecutionResult): void {
    if (!this.isActive) return;

    this.sendEvent('complete', {
      ...result,
      metrics: this.getMetrics(),
      timestamp: Date.now()
    });

    this.cleanup();
  }

  public sendHeartbeat(): void {
    if (!this.isActive) return;

    this.sendEvent('heartbeat', {
      timestamp: Date.now(),
      metrics: this.getMetrics()
    });
  }

  public cleanup(): void {
    this.isActive = false;

    try {
      this.response.end();
    } catch (error) {
      // Response already ended
    }
  }

  private sendEvent(type: string, data: any): void {
    if (!this.isActive) return;

    try {
      const eventData = JSON.stringify(data);
      const event = `event: ${type}\ndata: ${eventData}\n\n`;

      this.response.write(event);
      this.metrics.bytesTransferred += Buffer.byteLength(event, 'utf8');
    } catch (error) {
      console.error('Failed to send SSE event:', error);
      this.isActive = false;
    }
  }

  private shouldSendMessage(message: ParsedMessage): boolean {
    switch (this.config.streamType) {
      case 'tools-only':
        return message.type.startsWith('tool-');
      case 'text-only':
        return message.type === 'text';
      case 'full':
        return true;
      default:
        return true;
    }
  }

  private updateMetrics(message: ParsedMessage): void {
    this.metrics.messageCount++;

    // Estimate message size
    const messageSize = JSON.stringify(message).length;
    this.metrics.bytesTransferred += messageSize;
  }

  private getMetrics(): StreamingMetrics {
    const duration = Date.now() - this.metrics.startTime;

    return {
      ...this.metrics,
      duration,
      messagesPerSecond: this.metrics.messageCount / (duration / 1000),
      bytesPerSecond: this.metrics.bytesTransferred / (duration / 1000)
    };
  }
}
```

## 3. Claude Output Processor

```typescript
// services/claude/OutputProcessor.ts
import { ClaudeCodeSDK } from '@anthropic-ai/claude-code';
import { EventEmitter } from 'events';
import { OutputParsingEngine } from './OutputParsingEngine';
import { ToolDetectionEngine } from './ToolDetectionEngine';

interface ProcessorConfig {
  onMessage: (message: ParsedMessage) => void;
  onToolStart: (tool: ToolCallState) => void;
  onToolComplete: (tool: ToolCallState) => void;
  onError: (error: StreamingError) => void;
  onComplete: (result: ExecutionResult) => void;
}

export class ClaudeOutputProcessor extends EventEmitter {
  private claudeSDK: ClaudeCodeSDK;
  private parsingEngine: OutputParsingEngine;
  private toolDetector: ToolDetectionEngine;
  private config: ProcessorConfig;
  private activeTools: Map<string, ToolCallState> = new Map();
  private processingContext: ProcessingContext;

  constructor(config: ProcessorConfig) {
    super();
    this.config = config;
    this.claudeSDK = new ClaudeCodeSDK();
    this.parsingEngine = new OutputParsingEngine();
    this.toolDetector = new ToolDetectionEngine();
    this.processingContext = {
      sessionId: '',
      commandId: '',
      startTime: Date.now(),
      totalOutput: '',
      messageCount: 0
    };
  }

  public async processCommand(commandId: string): Promise<void> {
    this.processingContext.commandId = commandId;

    try {
      // Get command details
      const command = await this.claudeSDK.getCommand(commandId);

      // Set up streaming handlers
      this.claudeSDK.onOutput((chunk: string) => {
        this.processOutputChunk(chunk);
      });

      this.claudeSDK.onToolCall((toolCall: ToolCall) => {
        this.handleToolCall(toolCall);
      });

      this.claudeSDK.onError((error: Error) => {
        this.handleProcessingError(error);
      });

      this.claudeSDK.onComplete((result: any) => {
        this.handleProcessingComplete(result);
      });

      // Start execution
      await this.claudeSDK.executeCommand(command);

    } catch (error) {
      this.handleProcessingError(error as Error);
    }
  }

  private processOutputChunk(chunk: string): void {
    try {
      // Update context
      this.processingContext.totalOutput += chunk;
      this.processingContext.messageCount++;

      // Parse the chunk
      const parsedMessages = this.parsingEngine.parseChunk(
        chunk,
        this.processingContext
      );

      // Process each parsed message
      for (const message of parsedMessages) {
        this.processMessage(message);
      }

    } catch (error) {
      this.handleParsingError(error as Error, chunk);
    }
  }

  private processMessage(message: ParsedMessage): void {
    // Detect tools if applicable
    if (message.type === 'text' || message.type === 'unknown') {
      const toolDetection = this.toolDetector.detectTool(
        message.content,
        this.processingContext
      );

      if (toolDetection.detected) {
        message = this.convertToToolMessage(message, toolDetection);
      }
    }

    // Handle tool lifecycle
    if (message.type.startsWith('tool-')) {
      this.handleToolMessage(message);
    }

    // Send to client
    this.config.onMessage(message);
  }

  private handleToolCall(toolCall: ToolCall): void {
    const toolState: ToolCallState = {
      id: toolCall.id,
      name: toolCall.name,
      parameters: toolCall.parameters,
      startTime: Date.now(),
      state: 'starting'
    };

    this.activeTools.set(toolCall.id, toolState);
    this.config.onToolStart(toolState);

    // Update state to executing
    setTimeout(() => {
      toolState.state = 'executing';
      this.config.onToolStart(toolState); // Send update
    }, 100);
  }

  private handleToolMessage(message: ParsedMessage): void {
    const toolId = message.metadata?.toolId;
    if (!toolId) return;

    const toolState = this.activeTools.get(toolId);
    if (!toolState) return;

    switch (message.type) {
      case 'tool-complete':
        toolState.state = 'completed';
        toolState.endTime = Date.now();
        toolState.result = message.content;
        this.config.onToolComplete(toolState);
        this.activeTools.delete(toolId);
        break;

      case 'tool-error':
        toolState.state = 'error';
        toolState.endTime = Date.now();
        toolState.error = message.content.error;
        this.config.onToolComplete(toolState);
        this.activeTools.delete(toolId);
        break;
    }
  }

  private convertToToolMessage(
    message: ParsedMessage,
    detection: ToolDetectionResult
  ): ParsedMessage {
    return {
      ...message,
      type: 'tool-start',
      metadata: {
        ...message.metadata,
        toolName: detection.toolName,
        toolId: detection.toolId,
        confidence: detection.confidence
      }
    };
  }

  private handleParsingError(error: Error, chunk: string): void {
    console.error('Parsing error:', error, 'Chunk:', chunk);

    this.config.onError({
      type: 'parsing_error',
      message: error.message,
      recoverable: true,
      context: { chunk }
    });
  }

  private handleProcessingError(error: Error): void {
    console.error('Processing error:', error);

    this.config.onError({
      type: 'processing_error',
      message: error.message,
      recoverable: false
    });
  }

  private handleProcessingComplete(result: any): void {
    const executionResult: ExecutionResult = {
      commandId: this.processingContext.commandId,
      status: 'completed',
      result,
      metrics: {
        duration: Date.now() - this.processingContext.startTime,
        messageCount: this.processingContext.messageCount,
        outputLength: this.processingContext.totalOutput.length,
        toolsExecuted: this.activeTools.size
      }
    };

    this.config.onComplete(executionResult);
  }

  public cleanup(): void {
    this.claudeSDK.disconnect();
    this.removeAllListeners();
    this.activeTools.clear();
  }
}
```

## 4. Custom Hooks

### useStreamingConnection Hook

```typescript
// hooks/useStreamingConnection.ts
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseStreamingConnectionConfig {
  sessionId: string;
  commandId: string;
  onMessage: (message: RawMessage) => void;
  onError: (error: StreamingError) => void;
  onComplete: (result: ExecutionResult) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

export function useStreamingConnection(config: UseStreamingConnectionConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<StreamingError | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number>();

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');
    setError(null);

    const url = new URL('/api/streaming/claude-output', window.location.origin);
    url.searchParams.set('sessionId', config.sessionId);
    url.searchParams.set('commandId', config.commandId);

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      setReconnectAttempts(0);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        config.onMessage(data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.addEventListener('tool-start', (event) => {
      try {
        const data = JSON.parse(event.data);
        config.onMessage({ type: 'tool-start', data });
      } catch (error) {
        console.error('Failed to parse tool-start event:', error);
      }
    });

    eventSource.addEventListener('tool-complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        config.onMessage({ type: 'tool-complete', data });
      } catch (error) {
        console.error('Failed to parse tool-complete event:', error);
      }
    });

    eventSource.addEventListener('error', (event) => {
      try {
        const data = JSON.parse((event as any).data);
        const streamingError: StreamingError = {
          type: 'stream_error',
          message: data.message || 'Streaming error occurred',
          recoverable: data.recoverable !== false
        };
        setError(streamingError);
        config.onError(streamingError);
      } catch (error) {
        console.error('Failed to parse error event:', error);
      }
    });

    eventSource.addEventListener('complete', (event) => {
      try {
        const data = JSON.parse((event as any).data);
        config.onComplete(data);
        setConnectionStatus('completed');
      } catch (error) {
        console.error('Failed to parse complete event:', error);
      }
    });

    eventSource.onerror = (event) => {
      setIsConnected(false);
      setConnectionStatus('error');

      const streamingError: StreamingError = {
        type: 'connection_error',
        message: 'EventSource connection failed',
        recoverable: true
      };

      setError(streamingError);
      config.onError(streamingError);

      // Attempt reconnection if enabled
      if (config.autoReconnect &&
          reconnectAttempts < (config.maxReconnectAttempts || 5)) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

        reconnectTimeoutRef.current = window.setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connect();
        }, delay);
      }
    };
  }, [config, reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const attemptRecovery = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [disconnect, connect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connection: {
      connect,
      disconnect,
      attemptRecovery
    },
    isConnected,
    connectionStatus,
    error,
    reconnectAttempts
  };
}
```

This comprehensive implementation specification provides all the necessary components, APIs, and patterns needed to build a robust Claude Code streaming ticker system. The architecture supports real-time streaming, intelligent parsing, error recovery, and optimal performance while maintaining security and scalability.