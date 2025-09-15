# Claude Code Output Parsing & Tool Detection System

## Architecture Decision Record (ADR)

**Status**: Proposed
**Date**: 2025-09-15
**Decision**: Implement intelligent Claude Code output parsing with real-time tool detection

## Context

Claude Code generates complex output that includes:
- Natural language responses
- Tool invocations (function calls)
- Code execution results
- File operations
- Error messages
- Progress indicators

We need a sophisticated parsing system that can:
1. Parse streaming output in real-time
2. Detect and classify different output types
3. Extract structured data from unstructured text
4. Maintain context across multiple tool calls
5. Handle partial/incomplete messages
6. Provide visual indicators for different operations

## Decision

Implement a multi-layered parsing architecture with pattern recognition, state machines, and neural-assisted classification.

## Component Architecture

### 1. Output Classification Engine

```typescript
interface OutputClassificationEngine {
  classifyChunk(chunk: string, context: ParsingContext): OutputClassification;
  updateContext(classification: OutputClassification): void;
  getConfidence(): number;
}

interface OutputClassification {
  type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'system' | 'code' | 'file-op';
  subtype?: string;
  confidence: number;
  metadata: Record<string, any>;
  rawContent: string;
  parsedContent?: any;
}

interface ParsingContext {
  previousChunks: string[];
  activeToolCalls: Map<string, ToolCallState>;
  sessionState: SessionState;
  expectationStack: ParseExpectation[];
}
```

### 2. Tool Detection Patterns

```typescript
class ToolDetectionEngine {
  private patterns: Map<string, ToolPattern>;
  private stateMachine: ToolStateMachine;

  constructor() {
    this.initializePatterns();
    this.stateMachine = new ToolStateMachine();
  }

  private initializePatterns() {
    this.patterns = new Map([
      // Function call patterns
      ['function_call', {
        pattern: /^<function_calls>\s*<invoke name="([^"]+)">/,
        extractor: this.extractFunctionCall,
        confidence: 0.95
      }],

      // Tool result patterns
      ['tool_result', {
        pattern: /^<\/antml:invoke>\s*<\/antml:function_calls>/,
        extractor: this.extractToolResult,
        confidence: 0.9
      }],

      // File operation patterns
      ['file_operation', {
        pattern: /(?:Reading|Writing|Editing|Creating) (?:file|directory): (.+)/,
        extractor: this.extractFileOperation,
        confidence: 0.85
      }],

      // Command execution patterns
      ['command_execution', {
        pattern: /Executing command: (.+)/,
        extractor: this.extractCommandExecution,
        confidence: 0.8
      }],

      // Error patterns
      ['error', {
        pattern: /(?:Error|Exception|Failed): (.+)/,
        extractor: this.extractError,
        confidence: 0.9
      }],

      // Progress indicators
      ['progress', {
        pattern: /(?:Progress|Step \d+|Processing): (.+)/,
        extractor: this.extractProgress,
        confidence: 0.7
      }]
    ]);
  }

  public detectTools(chunk: string, context: ParsingContext): ToolDetectionResult[] {
    const results: ToolDetectionResult[] = [];

    for (const [type, pattern] of this.patterns) {
      const match = chunk.match(pattern.pattern);
      if (match) {
        const result = pattern.extractor(match, chunk, context);
        if (result.confidence >= 0.6) {
          results.push(result);
        }
      }
    }

    // Apply state machine validation
    return this.stateMachine.validateDetections(results, context);
  }
}
```

### 3. Streaming Parser State Machine

```typescript
enum ParsingState {
  IDLE = 'idle',
  READING_TEXT = 'reading_text',
  PARSING_FUNCTION_CALL = 'parsing_function_call',
  READING_PARAMETERS = 'reading_parameters',
  WAITING_FOR_RESULT = 'waiting_for_result',
  PARSING_RESULT = 'parsing_result',
  ERROR_RECOVERY = 'error_recovery'
}

class StreamingParserStateMachine {
  private currentState: ParsingState = ParsingState.IDLE;
  private buffer: string = '';
  private activeToolCall?: ToolCallState;
  private expectationStack: ParseExpectation[] = [];

  public processChunk(chunk: string): ParsedChunk[] {
    this.buffer += chunk;
    const results: ParsedChunk[] = [];

    while (this.buffer.length > 0) {
      const result = this.processCurrentState();
      if (result) {
        results.push(result);
      } else {
        break; // Need more data
      }
    }

    return results;
  }

  private processCurrentState(): ParsedChunk | null {
    switch (this.currentState) {
      case ParsingState.IDLE:
        return this.processIdle();

      case ParsingState.READING_TEXT:
        return this.processText();

      case ParsingState.PARSING_FUNCTION_CALL:
        return this.processFunctionCall();

      case ParsingState.READING_PARAMETERS:
        return this.processParameters();

      case ParsingState.WAITING_FOR_RESULT:
        return this.processWaitingForResult();

      case ParsingState.PARSING_RESULT:
        return this.processResult();

      case ParsingState.ERROR_RECOVERY:
        return this.processErrorRecovery();

      default:
        throw new Error(`Unknown parsing state: ${this.currentState}`);
    }
  }

  private processIdle(): ParsedChunk | null {
    // Look for start patterns
    const functionCallMatch = this.buffer.match(/^<function_calls>/);
    if (functionCallMatch) {
      this.currentState = ParsingState.PARSING_FUNCTION_CALL;
      this.consumeFromBuffer(functionCallMatch[0].length);
      return null;
    }

    // Look for text content
    const textMatch = this.buffer.match(/^([^<]+)/);
    if (textMatch) {
      this.currentState = ParsingState.READING_TEXT;
      return null;
    }

    return null;
  }

  private processFunctionCall(): ParsedChunk | null {
    const invokeMatch = this.buffer.match(/^<invoke name="([^"]+)">/);
    if (invokeMatch) {
      const toolName = invokeMatch[1];
      this.activeToolCall = {
        id: this.generateId(),
        name: toolName,
        parameters: {},
        startTime: Date.now(),
        state: 'starting'
      };

      this.currentState = ParsingState.READING_PARAMETERS;
      this.consumeFromBuffer(invokeMatch[0].length);

      return {
        type: 'tool-start',
        content: this.activeToolCall,
        timestamp: Date.now()
      };
    }

    return null;
  }

  private processParameters(): ParsedChunk | null {
    // Parse parameter tags
    const paramMatch = this.buffer.match(/^<parameter name="([^"]+)">([^<]*)<\/antml:parameter>/);
    if (paramMatch) {
      const [fullMatch, paramName, paramValue] = paramMatch;

      if (this.activeToolCall) {
        this.activeToolCall.parameters[paramName] = paramValue;
      }

      this.consumeFromBuffer(fullMatch.length);
      return null; // Continue collecting parameters
    }

    // Check for end of invoke
    const endInvokeMatch = this.buffer.match(/^<\/antml:invoke>/);
    if (endInvokeMatch) {
      this.currentState = ParsingState.WAITING_FOR_RESULT;
      this.consumeFromBuffer(endInvokeMatch[0].length);

      if (this.activeToolCall) {
        this.activeToolCall.state = 'executing';

        return {
          type: 'tool-executing',
          content: this.activeToolCall,
          timestamp: Date.now()
        };
      }
    }

    return null;
  }

  private processWaitingForResult(): ParsedChunk | null {
    // Look for result opening tag or function_calls closing
    const resultMatch = this.buffer.match(/^<result>/);
    if (resultMatch) {
      this.currentState = ParsingState.PARSING_RESULT;
      this.consumeFromBuffer(resultMatch[0].length);
      return null;
    }

    const endFunctionCallsMatch = this.buffer.match(/^<\/antml:function_calls>/);
    if (endFunctionCallsMatch) {
      this.currentState = ParsingState.IDLE;
      this.consumeFromBuffer(endFunctionCallsMatch[0].length);

      if (this.activeToolCall) {
        this.activeToolCall.state = 'completed';
        const result = {
          type: 'tool-complete',
          content: this.activeToolCall,
          timestamp: Date.now()
        };
        this.activeToolCall = undefined;
        return result;
      }
    }

    return null;
  }

  private processResult(): ParsedChunk | null {
    const endResultMatch = this.buffer.match(/^(.+?)<\/result>/s);
    if (endResultMatch) {
      const resultContent = endResultMatch[1];

      if (this.activeToolCall) {
        this.activeToolCall.result = resultContent;
        this.activeToolCall.state = 'completed';
      }

      this.consumeFromBuffer(endResultMatch[0].length);
      this.currentState = ParsingState.WAITING_FOR_RESULT;

      return {
        type: 'tool-result',
        content: {
          toolCall: this.activeToolCall,
          result: resultContent
        },
        timestamp: Date.now()
      };
    }

    return null;
  }

  private processErrorRecovery(): ParsedChunk | null {
    // Implement error recovery logic
    // Try to find next valid state
    const nextValidPattern = this.buffer.match(/(?:<function_calls>|^[^<]+)/);
    if (nextValidPattern) {
      // Reset to appropriate state
      this.currentState = nextValidPattern[0].startsWith('<function_calls>')
        ? ParsingState.PARSING_FUNCTION_CALL
        : ParsingState.READING_TEXT;

      return {
        type: 'error-recovery',
        content: { message: 'Recovered from parsing error' },
        timestamp: Date.now()
      };
    }

    return null;
  }

  private consumeFromBuffer(length: number): void {
    this.buffer = this.buffer.substring(length);
  }

  private generateId(): string {
    return `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 4. Advanced Pattern Recognition

```typescript
class AdvancedPatternRecognizer {
  private neuralClassifier?: NeuralClassifier;
  private contextAnalyzer: ContextAnalyzer;
  private semanticParser: SemanticParser;

  constructor(config: PatternRecognitionConfig) {
    this.contextAnalyzer = new ContextAnalyzer();
    this.semanticParser = new SemanticParser();

    if (config.enableNeuralClassification) {
      this.neuralClassifier = new NeuralClassifier();
    }
  }

  public analyzeChunk(chunk: string, context: ParsingContext): AdvancedAnalysis {
    // Multi-layer analysis
    const layers = {
      syntactic: this.analyzeSyntax(chunk),
      semantic: this.semanticParser.parse(chunk, context),
      contextual: this.contextAnalyzer.analyze(chunk, context),
      neural: this.neuralClassifier?.classify(chunk, context)
    };

    return this.combineAnalyses(layers);
  }

  private analyzeSyntax(chunk: string): SyntacticAnalysis {
    return {
      hasXmlTags: /<[^>]+>/.test(chunk),
      hasJsonStructure: this.detectJsonStructure(chunk),
      hasCodeBlocks: /```[\s\S]*?```/.test(chunk),
      hasFileReferences: /\b\w+\.\w+\b/.test(chunk),
      hasCommandSyntax: /^\s*\$/.test(chunk),
      indentationLevel: this.measureIndentation(chunk),
      lineCount: chunk.split('\n').length
    };
  }

  private detectJsonStructure(chunk: string): boolean {
    try {
      // Try to find JSON-like patterns
      const jsonMatch = chunk.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        JSON.parse(jsonMatch[0]);
        return true;
      }
    } catch {
      // Not valid JSON
    }
    return false;
  }

  private measureIndentation(chunk: string): number {
    const lines = chunk.split('\n');
    let totalIndentation = 0;
    let lineCount = 0;

    for (const line of lines) {
      if (line.trim()) {
        const indentMatch = line.match(/^(\s*)/);
        totalIndentation += indentMatch ? indentMatch[1].length : 0;
        lineCount++;
      }
    }

    return lineCount > 0 ? totalIndentation / lineCount : 0;
  }

  private combineAnalyses(layers: AnalysisLayers): AdvancedAnalysis {
    // Weight different analysis types
    const weights = {
      syntactic: 0.3,
      semantic: 0.4,
      contextual: 0.2,
      neural: 0.1
    };

    const confidence = this.calculateWeightedConfidence(layers, weights);
    const classification = this.determineClassification(layers);

    return {
      classification,
      confidence,
      layers,
      metadata: this.extractMetadata(layers)
    };
  }
}
```

### 5. Real-time Visualization Components

```typescript
interface ToolVisualizationComponent {
  // Tool execution indicator
  ToolExecutionIndicator: React.FC<{
    toolCall: ToolCallState;
    showDetails?: boolean;
  }>;

  // Progress visualization
  ProgressVisualization: React.FC<{
    progress: ProgressState;
    estimatedDuration?: number;
  }>;

  // Output type indicator
  OutputTypeIndicator: React.FC<{
    type: OutputClassification['type'];
    confidence: number;
  }>;

  // Stream health indicator
  StreamHealthIndicator: React.FC<{
    connectionStatus: ConnectionStatus;
    latency: number;
    errorRate: number;
  }>;
}

// Implementation example
const ToolExecutionIndicator: React.FC<ToolExecutionIndicatorProps> = ({
  toolCall,
  showDetails = false
}) => {
  const getStatusIcon = (state: ToolCallState['state']) => {
    switch (state) {
      case 'starting': return <Loader className="animate-spin" />;
      case 'executing': return <Zap className="text-blue-500 animate-pulse" />;
      case 'completed': return <CheckCircle className="text-green-500" />;
      case 'error': return <XCircle className="text-red-500" />;
      default: return <Circle />;
    }
  };

  const formatDuration = (startTime: number) => {
    const duration = Date.now() - startTime;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
      {getStatusIcon(toolCall.state)}
      <div className="flex-1">
        <div className="font-medium text-sm">{toolCall.name}</div>
        {showDetails && (
          <div className="text-xs text-gray-500">
            Duration: {formatDuration(toolCall.startTime)}
          </div>
        )}
      </div>
      {toolCall.state === 'executing' && (
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
      )}
    </div>
  );
};
```

### 6. Error Recovery & Resilience

```typescript
class ParsingErrorRecovery {
  private errorPatterns: Map<string, RecoveryStrategy>;
  private contextRecovery: ContextRecoveryManager;

  constructor() {
    this.initializeErrorPatterns();
    this.contextRecovery = new ContextRecoveryManager();
  }

  private initializeErrorPatterns() {
    this.errorPatterns = new Map([
      ['malformed_xml', {
        pattern: /^[^<]*<(?!\/?\w)/,
        recovery: this.recoverFromMalformedXml,
        confidence: 0.8
      }],

      ['incomplete_function_call', {
        pattern: /^<function_calls>\s*$/,
        recovery: this.recoverFromIncompleteFunction,
        confidence: 0.9
      }],

      ['mixed_content', {
        pattern: /(?:text content)</,
        recovery: this.recoverFromMixedContent,
        confidence: 0.7
      }],

      ['encoding_issues', {
        pattern: /[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F]/,
        recovery: this.recoverFromEncodingIssues,
        confidence: 0.6
      }]
    ]);
  }

  public attemptRecovery(
    error: ParsingError,
    context: ParsingContext
  ): RecoveryResult {
    // Try pattern-based recovery first
    for (const [type, strategy] of this.errorPatterns) {
      if (strategy.pattern.test(error.chunk)) {
        const result = strategy.recovery(error, context);
        if (result.success) {
          return result;
        }
      }
    }

    // Try context-based recovery
    return this.contextRecovery.attemptRecovery(error, context);
  }

  private recoverFromMalformedXml(
    error: ParsingError,
    context: ParsingContext
  ): RecoveryResult {
    // Strategy: Skip malformed part, continue from next valid tag
    const nextValidTag = error.chunk.match(/<\w+[^>]*>/);
    if (nextValidTag) {
      const skipLength = error.chunk.indexOf(nextValidTag[0]);
      return {
        success: true,
        recoveredContent: error.chunk.substring(skipLength),
        skippedContent: error.chunk.substring(0, skipLength),
        strategy: 'skip_malformed_xml'
      };
    }

    return { success: false, strategy: 'no_recovery_possible' };
  }

  private recoverFromIncompleteFunction(
    error: ParsingError,
    context: ParsingContext
  ): RecoveryResult {
    // Strategy: Wait for more data or timeout
    return {
      success: true,
      recoveredContent: error.chunk,
      action: 'wait_for_more_data',
      strategy: 'incomplete_function_call'
    };
  }
}
```

### 7. Performance Optimization

```typescript
interface ParsingPerformanceOptimizer {
  // Chunking strategy
  chunkingStrategy: {
    optimalChunkSize: 4096; // bytes
    maxChunkSize: 16384;
    minChunkSize: 256;
    adaptiveChunking: true;
  };

  // Parsing optimization
  parsingOptimization: {
    regexCaching: Map<string, RegExp>;
    patternPrecompilation: true;
    lazyEvaluation: true;
    memoization: Map<string, ParsedChunk>;
  };

  // Memory management
  memoryManagement: {
    maxBufferSize: 1048576; // 1MB
    gcThreshold: 524288; // 512KB
    contextCleanupInterval: 30000; // 30s
  };
}

class OptimizedStreamingParser {
  private regexCache = new Map<string, RegExp>();
  private memoCache = new Map<string, ParsedChunk>();
  private performanceMetrics: PerformanceMetrics;

  constructor(config: PerformanceConfig) {
    this.performanceMetrics = new PerformanceMetrics();
    this.precompilePatterns();
  }

  private precompilePatterns(): void {
    // Pre-compile frequently used regex patterns
    const commonPatterns = [
      'function_call',
      'tool_result',
      'error_pattern',
      'file_operation',
      'command_execution'
    ];

    for (const pattern of commonPatterns) {
      this.regexCache.set(pattern, this.compilePattern(pattern));
    }
  }

  public parseChunkOptimized(chunk: string): ParsedChunk[] {
    const startTime = performance.now();

    // Check memo cache first
    const cacheKey = this.generateCacheKey(chunk);
    const cached = this.memoCache.get(cacheKey);
    if (cached) {
      this.performanceMetrics.recordCacheHit();
      return [cached];
    }

    // Perform parsing
    const results = this.performParsing(chunk);

    // Cache result if appropriate
    if (this.shouldCache(chunk, results)) {
      this.memoCache.set(cacheKey, results[0]);
    }

    const duration = performance.now() - startTime;
    this.performanceMetrics.recordParsingTime(duration);

    return results;
  }

  private shouldCache(chunk: string, results: ParsedChunk[]): boolean {
    // Cache small, deterministic chunks
    return chunk.length < 1024 &&
           results.length === 1 &&
           results[0].type !== 'error';
  }
}
```

## Implementation Timeline

### Week 1: Core Parsing Engine
- [ ] Basic state machine implementation
- [ ] Pattern recognition for function calls
- [ ] Simple tool detection
- [ ] Error handling foundations

### Week 2: Advanced Features
- [ ] Semantic analysis
- [ ] Context awareness
- [ ] Complex pattern recognition
- [ ] Performance optimization

### Week 3: Integration & Testing
- [ ] Frontend component integration
- [ ] Real-time visualization
- [ ] Comprehensive testing
- [ ] Error recovery testing

### Week 4: Polish & Documentation
- [ ] Performance tuning
- [ ] Documentation completion
- [ ] User experience refinement
- [ ] Production readiness

## Success Metrics

- **Accuracy**: > 95% correct tool detection
- **Latency**: < 10ms per chunk processing
- **Reliability**: < 0.1% parsing errors
- **Recovery**: < 100ms error recovery time
- **Throughput**: > 1000 chunks/second

This parsing system provides the intelligence needed to transform raw Claude Code output into meaningful, actionable information for the streaming ticker interface.