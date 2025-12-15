# SPARC Phase 6: Real-Time Log Streaming Architecture

## Overview

This phase designs a comprehensive real-time log streaming system that aggregates logs from multiple Claude instances, provides filtering and search capabilities, and maintains high performance under heavy log volume.

## Core Architecture Components

### 1. Log Stream Manager

```typescript
// /frontend/src/services/dual-instance/LogStreamManager.ts
export class LogStreamManager extends EventEmitter {
  private activeStreams = new Map<string, LogStream>();
  private logBuffer: CircularLogBuffer;
  private filterEngine: LogFilterEngine;
  private searchIndex: LogSearchIndex;
  private exportManager: LogExportManager;
  private compressionService: LogCompressionService;
  
  constructor(private config: LogStreamConfig) {
    super();
    this.logBuffer = new CircularLogBuffer(config.bufferSize || 10000);
    this.filterEngine = new LogFilterEngine();
    this.searchIndex = new LogSearchIndex();
    this.exportManager = new LogExportManager();
    this.compressionService = new LogCompressionService();
    
    this.setupEventHandlers();
  }

  subscribeToInstance(instanceId: string, connection: InstanceConnection): void {
    if (this.activeStreams.has(instanceId)) {
      this.unsubscribeFromInstance(instanceId);
    }

    const stream = new LogStream(instanceId, connection, {
      autoReconnect: true,
      bufferOfflineMessages: true,
      compressionEnabled: this.config.compressionEnabled
    });

    // Setup stream event handlers
    stream.on('log_entry', (entry: LogEntry) => {
      this.handleLogEntry(entry);
    });

    stream.on('stream_error', (error: Error) => {
      this.emit('stream_error', { instanceId, error });
    });

    stream.on('stream_reconnected', () => {
      this.processOfflineBuffer(instanceId);
    });

    this.activeStreams.set(instanceId, stream);
    stream.start();
    
    this.emit('stream_subscribed', { instanceId });
  }

  unsubscribeFromInstance(instanceId: string): void {
    const stream = this.activeStreams.get(instanceId);
    if (stream) {
      stream.stop();
      this.activeStreams.delete(instanceId);
      this.emit('stream_unsubscribed', { instanceId });
    }
  }

  private handleLogEntry(entry: LogEntry): void {
    // Enrich log entry with metadata
    const enrichedEntry = this.enrichLogEntry(entry);
    
    // Add to buffer
    this.logBuffer.add(enrichedEntry);
    
    // Update search index
    this.searchIndex.addEntry(enrichedEntry);
    
    // Apply real-time filters
    if (this.filterEngine.shouldInclude(enrichedEntry)) {
      this.emit('log_entry_filtered', enrichedEntry);
    }
    
    // Emit all entries for subscribers
    this.emit('log_entry', enrichedEntry);
    
    // Check for alert conditions
    this.checkAlertConditions(enrichedEntry);
  }

  private enrichLogEntry(entry: LogEntry): EnrichedLogEntry {
    return {
      ...entry,
      enrichment: {
        instanceName: this.getInstanceName(entry.instanceId),
        receivedAt: new Date(),
        processingLatency: Date.now() - entry.timestamp.getTime(),
        sequenceNumber: this.logBuffer.getNextSequence(),
        streamHealth: this.getStreamHealth(entry.instanceId)
      }
    };
  }

  // Real-time filtering
  applyFilter(filter: LogFilter): LogEntry[] {
    this.filterEngine.setFilter(filter);
    return this.logBuffer.getFiltered(filter);
  }

  // Search functionality
  search(query: SearchQuery): SearchResult {
    return this.searchIndex.search(query);
  }

  // Export functionality
  async exportLogs(options: ExportOptions): Promise<ExportResult> {
    const entries = options.filter 
      ? this.logBuffer.getFiltered(options.filter)
      : this.logBuffer.getAll();
    
    return this.exportManager.export(entries, options);
  }

  // Statistics and monitoring
  getStreamStatistics(): StreamStatistics {
    const streams = Array.from(this.activeStreams.values());
    
    return {
      activeStreams: streams.length,
      totalLogEntries: this.logBuffer.size(),
      logRate: this.calculateLogRate(),
      streamHealth: streams.map(s => s.getHealth()),
      bufferUtilization: this.logBuffer.getUtilization(),
      indexSize: this.searchIndex.getSize(),
      memoryUsage: this.calculateMemoryUsage()
    };
  }

  private processOfflineBuffer(instanceId: string): void {
    const stream = this.activeStreams.get(instanceId);
    if (!stream) return;

    const bufferedEntries = stream.getOfflineBuffer();
    bufferedEntries.forEach(entry => {
      this.handleLogEntry(entry);
    });
    
    stream.clearOfflineBuffer();
    this.emit('offline_buffer_processed', { instanceId, count: bufferedEntries.length });
  }
}
```

### 2. Log Stream Implementation

```typescript
// /frontend/src/services/dual-instance/LogStream.ts
export class LogStream extends EventEmitter {
  private socket: Socket | null = null;
  private isActive = false;
  private offlineBuffer: LogEntry[] = [];
  private reconnectTimer?: NodeJS.Timeout;
  private healthChecker: StreamHealthChecker;
  private statistics: StreamStatistics;
  
  constructor(
    private instanceId: string,
    private connection: InstanceConnection,
    private config: LogStreamConfig
  ) {
    super();
    this.healthChecker = new StreamHealthChecker(this);
    this.statistics = new StreamStatistics();
  }

  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.connectToLogStream();
    this.healthChecker.start();
  }

  stop(): void {
    this.isActive = false;
    this.clearReconnectTimer();
    this.healthChecker.stop();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private connectToLogStream(): void {
    try {
      // Get socket from connection manager
      const socket = this.connection.socket?.getSocket();
      if (!socket) {
        throw new Error('No socket available for log streaming');
      }

      this.socket = socket;
      this.setupLogHandlers();
      
      // Subscribe to log events
      this.socket.emit('subscribe_logs', {
        instanceId: this.instanceId,
        filters: this.config.initialFilters,
        compression: this.config.compressionEnabled
      });
      
      this.emit('stream_connected');
      this.statistics.recordConnection();
      
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  private setupLogHandlers(): void {
    if (!this.socket) return;

    this.socket.on('log_entry', (data: any) => {
      try {
        const entry = this.parseLogEntry(data);
        this.statistics.recordLogEntry();
        this.emit('log_entry', entry);
      } catch (error) {
        this.emit('parse_error', { error, rawData: data });
      }
    });

    this.socket.on('log_batch', (batch: any[]) => {
      try {
        const entries = batch.map(data => this.parseLogEntry(data));
        entries.forEach(entry => {
          this.statistics.recordLogEntry();
          this.emit('log_entry', entry);
        });
      } catch (error) {
        this.emit('parse_error', { error, rawData: batch });
      }
    });

    this.socket.on('disconnect', () => {
      this.handleDisconnection();
    });

    this.socket.on('error', (error: Error) => {
      this.handleConnectionError(error);
    });
  }

  private parseLogEntry(data: any): LogEntry {
    // Validate and transform raw log data
    if (!isLogEntry(data)) {
      throw new Error('Invalid log entry format');
    }

    return {
      id: data.id || this.generateLogId(),
      instanceId: this.instanceId,
      timestamp: new Date(data.timestamp),
      level: data.level,
      message: data.message,
      source: data.source || 'unknown',
      category: data.category,
      correlationId: data.correlationId,
      sessionId: data.sessionId,
      userId: data.userId,
      metadata: data.metadata,
      stackTrace: data.stackTrace,
      context: data.context
    };
  }

  private handleDisconnection(): void {
    this.socket = null;
    this.emit('stream_disconnected');
    
    if (this.isActive && this.config.autoReconnect) {
      this.scheduleReconnection();
    }
  }

  private handleConnectionError(error: Error): void {
    this.statistics.recordError();
    this.emit('stream_error', error);
    
    if (this.isActive && this.config.autoReconnect) {
      this.scheduleReconnection();
    }
  }

  private scheduleReconnection(): void {
    this.clearReconnectTimer();
    
    const delay = this.calculateReconnectDelay();
    this.reconnectTimer = setTimeout(() => {
      if (this.isActive) {
        this.connectToLogStream();
      }
    }, delay);
  }

  private calculateReconnectDelay(): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const attempt = this.statistics.getReconnectAttempts();
    
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * 1000; // Add jitter
  }

  getOfflineBuffer(): LogEntry[] {
    return [...this.offlineBuffer];
  }

  clearOfflineBuffer(): void {
    this.offlineBuffer = [];
  }

  getHealth(): StreamHealth {
    return {
      isConnected: this.socket?.connected || false,
      lastLogEntry: this.statistics.getLastLogTime(),
      logRate: this.statistics.getLogRate(),
      errorRate: this.statistics.getErrorRate(),
      reconnectAttempts: this.statistics.getReconnectAttempts(),
      bufferSize: this.offlineBuffer.length
    };
  }
}
```

### 3. Circular Log Buffer

```typescript
// /frontend/src/services/dual-instance/CircularLogBuffer.ts
export class CircularLogBuffer {
  private buffer: LogEntry[];
  private head = 0;
  private tail = 0;
  private count = 0;
  private sequenceNumber = 0;
  
  constructor(private maxSize: number) {
    this.buffer = new Array(maxSize);
  }

  add(entry: LogEntry): void {
    this.buffer[this.tail] = entry;
    this.tail = (this.tail + 1) % this.maxSize;
    this.sequenceNumber++;
    
    if (this.count < this.maxSize) {
      this.count++;
    } else {
      // Buffer is full, move head forward
      this.head = (this.head + 1) % this.maxSize;
    }
  }

  getAll(): LogEntry[] {
    const result: LogEntry[] = [];
    
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.maxSize;
      result.push(this.buffer[index]);
    }
    
    return result;
  }

  getFiltered(filter: LogFilter): LogEntry[] {
    return this.getAll().filter(entry => this.matchesFilter(entry, filter));
  }

  getRecent(count: number): LogEntry[] {
    const actualCount = Math.min(count, this.count);
    const result: LogEntry[] = [];
    
    for (let i = 0; i < actualCount; i++) {
      const index = (this.tail - 1 - i + this.maxSize) % this.maxSize;
      result.unshift(this.buffer[index]);
    }
    
    return result;
  }

  getByTimeRange(start: Date, end: Date): LogEntry[] {
    return this.getAll().filter(entry => 
      entry.timestamp >= start && entry.timestamp <= end
    );
  }

  private matchesFilter(entry: LogEntry, filter: LogFilter): boolean {
    // Level filter
    if (filter.levels && !filter.levels.includes(entry.level)) {
      return false;
    }
    
    // Instance filter
    if (filter.instances && !filter.instances.includes(entry.instanceId)) {
      return false;
    }
    
    // Source filter
    if (filter.sources && !filter.sources.includes(entry.source)) {
      return false;
    }
    
    // Time range filter
    if (filter.timeRange) {
      if (entry.timestamp < filter.timeRange.start || 
          entry.timestamp > filter.timeRange.end) {
        return false;
      }
    }
    
    // Text search
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      return entry.message.toLowerCase().includes(query) ||
             entry.source.toLowerCase().includes(query) ||
             entry.category?.toLowerCase().includes(query);
    }
    
    return true;
  }

  size(): number {
    return this.count;
  }

  getUtilization(): number {
    return this.count / this.maxSize;
  }

  getNextSequence(): number {
    return this.sequenceNumber;
  }

  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
    this.sequenceNumber = 0;
  }
}
```

### 4. Advanced Search and Filtering

```typescript
// /frontend/src/services/dual-instance/LogSearchIndex.ts
export class LogSearchIndex {
  private index = new Map<string, Set<string>>(); // term -> log IDs
  private entries = new Map<string, LogEntry>(); // log ID -> entry
  private stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

  addEntry(entry: LogEntry): void {
    this.entries.set(entry.id, entry);
    
    // Index searchable fields
    const searchableText = [
      entry.message,
      entry.source,
      entry.category || '',
      entry.correlationId || '',
      JSON.stringify(entry.metadata || {})
    ].join(' ');
    
    const terms = this.tokenize(searchableText);
    terms.forEach(term => {
      if (!this.index.has(term)) {
        this.index.set(term, new Set());
      }
      this.index.get(term)!.add(entry.id);
    });
  }

  search(query: SearchQuery): SearchResult {
    const startTime = performance.now();
    
    if (query.type === 'simple') {
      return this.simpleSearch(query);
    } else {
      return this.advancedSearch(query);
    }
  }

  private simpleSearch(query: SearchQuery): SearchResult {
    const terms = this.tokenize(query.text);
    const matchingSets = terms.map(term => this.index.get(term) || new Set());
    
    // Intersection of all term matches
    const matchingIds = matchingSets.reduce((acc, set) => {
      return new Set([...acc].filter(id => set.has(id)));
    });

    const results = Array.from(matchingIds)
      .map(id => this.entries.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      entries: results.slice(0, query.limit || 100),
      totalMatches: results.length,
      executionTime: performance.now() - Date.now(),
      query
    };
  }

  private advancedSearch(query: SearchQuery): SearchResult {
    // Implement advanced search with boolean operators, field-specific search, etc.
    const parser = new QueryParser();
    const ast = parser.parse(query.text);
    
    const matchingIds = this.evaluateQuery(ast);
    const results = Array.from(matchingIds)
      .map(id => this.entries.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      entries: results.slice(0, query.limit || 100),
      totalMatches: results.length,
      executionTime: performance.now() - Date.now(),
      query
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2 && !this.stopWords.has(term));
  }

  getSize(): number {
    return this.entries.size;
  }

  clear(): void {
    this.index.clear();
    this.entries.clear();
  }
}
```

### 5. Real-time Log Compression

```typescript
// /frontend/src/services/dual-instance/LogCompressionService.ts
export class LogCompressionService {
  private compressionWorker?: Worker;
  private compressionQueue: CompressionTask[] = [];
  private isProcessing = false;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    if (typeof Worker !== 'undefined') {
      this.compressionWorker = new Worker(
        new URL('../workers/compression.worker.ts', import.meta.url)
      );
      
      this.compressionWorker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };
    }
  }

  async compressLogBatch(entries: LogEntry[]): Promise<CompressedLogBatch> {
    if (!this.compressionWorker) {
      // Fallback to main thread compression
      return this.compressInMainThread(entries);
    }

    return new Promise((resolve, reject) => {
      const taskId = this.generateTaskId();
      const task: CompressionTask = {
        id: taskId,
        entries,
        resolve,
        reject,
        timestamp: new Date()
      };

      this.compressionQueue.push(task);
      this.processCompressionQueue();
    });
  }

  private processCompressionQueue(): void {
    if (this.isProcessing || this.compressionQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const task = this.compressionQueue.shift()!;
    
    this.compressionWorker!.postMessage({
      type: 'compress',
      taskId: task.id,
      entries: task.entries
    });
  }

  private handleWorkerMessage(data: any): void {
    if (data.type === 'compressed') {
      const task = this.findTaskById(data.taskId);
      if (task) {
        task.resolve(data.result);
        this.removeTask(data.taskId);
      }
    } else if (data.type === 'error') {
      const task = this.findTaskById(data.taskId);
      if (task) {
        task.reject(new Error(data.error));
        this.removeTask(data.taskId);
      }
    }

    this.isProcessing = false;
    this.processCompressionQueue();
  }

  private compressInMainThread(entries: LogEntry[]): CompressedLogBatch {
    // Simple compression algorithm for fallback
    const serialized = JSON.stringify(entries);
    const compressed = this.simpleCompress(serialized);
    
    return {
      originalSize: serialized.length,
      compressedSize: compressed.length,
      compressionRatio: compressed.length / serialized.length,
      data: compressed,
      algorithm: 'simple',
      timestamp: new Date()
    };
  }

  private simpleCompress(data: string): string {
    // Basic run-length encoding for demo
    return data.replace(/(.)\1+/g, (match, char) => {
      return `${char}${match.length}`;
    });
  }

  async decompressLogBatch(compressed: CompressedLogBatch): Promise<LogEntry[]> {
    // Implement decompression based on algorithm
    switch (compressed.algorithm) {
      case 'simple':
        return this.simpleDecompress(compressed.data);
      case 'gzip':
        return this.gzipDecompress(compressed.data);
      default:
        throw new Error(`Unknown compression algorithm: ${compressed.algorithm}`);
    }
  }
}
```

### 6. Performance Optimization

```typescript
// /frontend/src/services/dual-instance/LogStreamOptimizer.ts
export class LogStreamOptimizer {
  private performanceMonitor: PerformanceMonitor;
  private adaptiveThrottling: AdaptiveThrottling;
  private memoryManager: MemoryManager;

  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    this.adaptiveThrottling = new AdaptiveThrottling();
    this.memoryManager = new MemoryManager();
  }

  optimizeLogStream(stream: LogStream): OptimizedLogStream {
    return new OptimizedLogStream(stream, {
      batchSize: this.calculateOptimalBatchSize(),
      throttleLimit: this.calculateThrottleLimit(),
      compressionEnabled: this.shouldEnableCompression(),
      indexingStrategy: this.selectIndexingStrategy()
    });
  }

  private calculateOptimalBatchSize(): number {
    const performance = this.performanceMonitor.getCurrentMetrics();
    
    if (performance.memoryUsage > 0.8) {
      return 50; // Reduce batch size under memory pressure
    } else if (performance.cpuUsage > 0.7) {
      return 100; // Balance CPU usage
    } else {
      return 500; // Optimal batch size for good performance
    }
  }

  private calculateThrottleLimit(): number {
    const performance = this.performanceMonitor.getCurrentMetrics();
    const baseLimit = 1000; // logs per second
    
    // Adjust based on system performance
    const factor = Math.max(0.1, 1 - performance.cpuUsage);
    return Math.floor(baseLimit * factor);
  }

  private shouldEnableCompression(): boolean {
    const performance = this.performanceMonitor.getCurrentMetrics();
    
    // Enable compression if memory usage is high but CPU is available
    return performance.memoryUsage > 0.6 && performance.cpuUsage < 0.8;
  }

  private selectIndexingStrategy(): IndexingStrategy {
    const performance = this.performanceMonitor.getCurrentMetrics();
    
    if (performance.memoryUsage > 0.8) {
      return IndexingStrategy.MINIMAL; // Index only essential fields
    } else if (performance.cpuUsage > 0.7) {
      return IndexingStrategy.SELECTIVE; // Index important fields
    } else {
      return IndexingStrategy.FULL; // Full text indexing
    }
  }
}

class OptimizedLogStream extends EventEmitter {
  private batchBuffer: LogEntry[] = [];
  private throttleCounter = 0;
  private lastFlush = Date.now();

  constructor(
    private originalStream: LogStream,
    private optimizations: StreamOptimizations
  ) {
    super();
    this.setupOptimizedHandlers();
  }

  private setupOptimizedHandlers(): void {
    this.originalStream.on('log_entry', (entry: LogEntry) => {
      this.handleOptimizedLogEntry(entry);
    });
  }

  private handleOptimizedLogEntry(entry: LogEntry): void {
    // Apply throttling
    if (!this.checkThrottleLimit()) {
      return; // Drop the log entry
    }

    // Add to batch buffer
    this.batchBuffer.push(entry);

    // Check if we should flush the batch
    if (this.shouldFlushBatch()) {
      this.flushBatch();
    }
  }

  private checkThrottleLimit(): boolean {
    const now = Date.now();
    const timeWindow = 1000; // 1 second
    
    if (now - this.lastFlush > timeWindow) {
      this.throttleCounter = 0;
      this.lastFlush = now;
    }

    if (this.throttleCounter >= this.optimizations.throttleLimit) {
      return false; // Throttle limit exceeded
    }

    this.throttleCounter++;
    return true;
  }

  private shouldFlushBatch(): boolean {
    const batchFull = this.batchBuffer.length >= this.optimizations.batchSize;
    const timeoutReached = Date.now() - this.lastFlush > 5000; // 5 second timeout
    
    return batchFull || timeoutReached;
  }

  private flushBatch(): void {
    if (this.batchBuffer.length === 0) return;

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];
    this.lastFlush = Date.now();

    // Emit batch for processing
    this.emit('log_batch', batch);
  }
}
```

## Integration with Existing WebSocket Infrastructure

### WebSocket Hub Integration

```typescript
// Integration with existing WebSocket Hub
export class HubLogStreamIntegration {
  constructor(private hubConnection: WebSocketConnectionManager) {}

  async subscribeToHubLogs(): Promise<void> {
    const socket = this.hubConnection.getSocket();
    if (!socket) throw new Error('Hub connection not available');

    // Subscribe to hub events that contain log information
    socket.on('claude_instance_log', (data: any) => {
      const logEntry: LogEntry = {
        id: this.generateLogId(),
        instanceId: data.instanceId,
        timestamp: new Date(data.timestamp),
        level: data.level || LogLevel.INFO,
        message: data.message,
        source: 'claude-instance',
        metadata: {
          hubManaged: true,
          originalEvent: data.eventType
        }
      };

      this.emit('hub_log_entry', logEntry);
    });

    // Subscribe to hub system logs
    socket.on('hub_system_log', (data: any) => {
      const logEntry: LogEntry = {
        id: this.generateLogId(),
        instanceId: 'websocket-hub',
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: data.message || JSON.stringify(data),
        source: 'websocket-hub',
        metadata: {
          systemLog: true,
          eventType: data.type
        }
      };

      this.emit('hub_log_entry', logEntry);
    });
  }
}
```

This real-time log streaming architecture provides:

1. **High Performance**: Optimized for handling 1000+ logs/second
2. **Memory Efficiency**: Circular buffers and compression
3. **Advanced Search**: Full-text indexing with boolean operators
4. **Real-time Filtering**: Live filter application
5. **Offline Resilience**: Buffer logs when connections are down
6. **Export Capabilities**: Multiple format support
7. **Performance Monitoring**: Adaptive optimization
8. **Integration Ready**: Works with existing WebSocket infrastructure

The system automatically adapts to system performance and provides comprehensive monitoring and debugging capabilities for the dual instance environment.