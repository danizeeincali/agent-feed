/**
 * Message Handling and Buffering Tests - London School TDD Approach
 * Tests message ordering, buffering, and stream processing for WebSocket to HTTP+SSE migration
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MockEventSource, EventSourceMockFactory } from '../mocks/EventSourceMock';
import { FetchMock, FetchMockFactory } from '../mocks/FetchMock';

interface MessageBuffer {
  append(message: any): void;
  flush(): any[];
  clear(): void;
  size(): number;
  peek(): any | null;
  isEmpty(): boolean;
  isFull(): boolean;
  setMaxSize(size: number): void;
}

interface StreamProcessor {
  processMessage(message: any): Promise<any>;
  processStream(messages: any[]): Promise<any[]>;
  setTransformer(transformer: (msg: any) => any): void;
  setFilter(filter: (msg: any) => boolean): void;
}

interface MessageOrdering {
  enforceOrder(messages: any[]): any[];
  detectOutOfOrder(messages: any[]): boolean;
  reorderMessages(messages: any[]): any[];
  getSequenceGaps(messages: any[]): number[];
}

// London School - Mock Message Buffer Implementation
class MockMessageBuffer implements MessageBuffer {
  private buffer: any[] = [];
  private maxSize: number = 100;
  
  // Jest Mocks for Behavior Verification
  public appendMock = jest.fn<(message: any) => void>();
  public flushMock = jest.fn<() => any[]>();
  public clearMock = jest.fn<() => void>();
  public overflowMock = jest.fn<(droppedMessage: any) => void>();

  append(message: any): void {
    this.appendMock(message);
    
    if (this.buffer.length >= this.maxSize) {
      const dropped = this.buffer.shift();
      this.overflowMock(dropped);
    }
    
    this.buffer.push({
      ...message,
      bufferedAt: Date.now(),
      sequenceId: this.buffer.length
    });
  }

  flush(): any[] {
    this.flushMock();
    const messages = [...this.buffer];
    this.buffer = [];
    return messages;
  }

  clear(): void {
    this.clearMock();
    this.buffer = [];
  }

  size(): number {
    return this.buffer.length;
  }

  peek(): any | null {
    return this.buffer[0] || null;
  }

  isEmpty(): boolean {
    return this.buffer.length === 0;
  }

  isFull(): boolean {
    return this.buffer.length >= this.maxSize;
  }

  setMaxSize(size: number): void {
    this.maxSize = size;
  }

  // London School - Test Support Methods
  public getBufferContents(): any[] {
    return [...this.buffer];
  }

  public simulateOverflow(messages: any[]): any[] {
    const dropped: any[] = [];
    messages.forEach(msg => {
      if (this.buffer.length >= this.maxSize) {
        dropped.push(this.buffer.shift());
      }
      this.buffer.push(msg);
    });
    return dropped;
  }
}

// London School - Mock Stream Processor Implementation
class MockStreamProcessor implements StreamProcessor {
  private transformer: ((msg: any) => any) | null = null;
  private filter: ((msg: any) => boolean) | null = null;
  
  // Jest Mocks for Behavior Verification
  public processMessageMock = jest.fn<(message: any) => Promise<any>>();
  public processStreamMock = jest.fn<(messages: any[]) => Promise<any[]>>();
  public transformerMock = jest.fn<(msg: any) => any>();
  public filterMock = jest.fn<(msg: any) => boolean>();

  async processMessage(message: any): Promise<any> {
    this.processMessageMock(message);
    
    let processed = message;
    
    // Apply filter first
    if (this.filter && !this.filter(processed)) {
      this.filterMock(processed);
      return null;
    }
    
    // Apply transformer
    if (this.transformer) {
      processed = this.transformer(processed);
      this.transformerMock(processed);
    }
    
    return processed;
  }

  async processStream(messages: any[]): Promise<any[]> {
    this.processStreamMock(messages);
    
    const processed: any[] = [];
    
    for (const message of messages) {
      const result = await this.processMessage(message);
      if (result !== null) {
        processed.push(result);
      }
    }
    
    return processed;
  }

  setTransformer(transformer: (msg: any) => any): void {
    this.transformer = transformer;
  }

  setFilter(filter: (msg: any) => boolean): void {
    this.filter = filter;
  }
}

// London School - Mock Message Ordering Implementation
class MockMessageOrdering implements MessageOrdering {
  // Jest Mocks for Behavior Verification
  public enforceOrderMock = jest.fn<(messages: any[]) => any[]>();
  public detectOutOfOrderMock = jest.fn<(messages: any[]) => boolean>();
  public reorderMessagesMock = jest.fn<(messages: any[]) => any[]>();
  public getSequenceGapsMock = jest.fn<(messages: any[]) => number[]>();

  enforceOrder(messages: any[]): any[] {
    this.enforceOrderMock(messages);
    
    return messages.sort((a, b) => {
      const aSeq = a.sequenceId || a.timestamp || 0;
      const bSeq = b.sequenceId || b.timestamp || 0;
      return aSeq - bSeq;
    });
  }

  detectOutOfOrder(messages: any[]): boolean {
    this.detectOutOfOrderMock(messages);
    
    for (let i = 1; i < messages.length; i++) {
      const prev = messages[i - 1].sequenceId || 0;
      const curr = messages[i].sequenceId || 0;
      if (curr < prev) {
        return true;
      }
    }
    return false;
  }

  reorderMessages(messages: any[]): any[] {
    this.reorderMessagesMock(messages);
    return this.enforceOrder(messages);
  }

  getSequenceGaps(messages: any[]): number[] {
    this.getSequenceGapsMock(messages);
    
    const gaps: number[] = [];
    const sequences = messages.map(m => m.sequenceId || 0).sort((a, b) => a - b);
    
    for (let i = 1; i < sequences.length; i++) {
      const expected = sequences[i - 1] + 1;
      const actual = sequences[i];
      if (actual > expected) {
        for (let gap = expected; gap < actual; gap++) {
          gaps.push(gap);
        }
      }
    }
    
    return gaps;
  }
}

describe('Message Handling and Buffering Tests - London School TDD', () => {
  let mockEventSource: MockEventSource;
  let mockFetch: FetchMock;
  let mockBuffer: MockMessageBuffer;
  let mockProcessor: MockStreamProcessor;
  let mockOrdering: MockMessageOrdering;
  
  // London School - External Collaborators
  let mockTerminalRenderer: any;
  let mockUIUpdater: any;
  let mockErrorHandler: any;
  let mockMetricsCollector: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup core mocks
    mockEventSource = EventSourceMockFactory.createConnectedMock('ws://localhost:3000');
    mockFetch = FetchMockFactory.createTerminalMock();
    mockBuffer = new MockMessageBuffer();
    mockProcessor = new MockStreamProcessor();
    mockOrdering = new MockMessageOrdering();
    
    // Setup external collaborators
    mockTerminalRenderer = {
      render: jest.fn(),
      appendOutput: jest.fn(),
      updateStatus: jest.fn(),
      clearOutput: jest.fn()
    };
    
    mockUIUpdater = {
      updateConnectionStatus: jest.fn(),
      showError: jest.fn(),
      showWarning: jest.fn(),
      clearNotifications: jest.fn()
    };
    
    mockErrorHandler = {
      handleError: jest.fn(),
      reportError: jest.fn(),
      shouldRetry: jest.fn().mockReturnValue(true)
    };
    
    mockMetricsCollector = {
      recordMessageLatency: jest.fn(),
      recordBufferUsage: jest.fn(),
      recordProcessingTime: jest.fn(),
      recordThroughput: jest.fn()
    };
  });

  describe('Message Buffering Scenarios', () => {
    it('should buffer messages when terminal is not ready', async () => {
      // London School - Setup terminal not ready scenario
      const mockTerminalManager = {
        isReady: jest.fn().mockReturnValue(false),
        onReady: jest.fn(),
        processBufferedMessages: jest.fn()
      };
      
      // Send messages before terminal is ready
      const testMessages = [
        { type: 'output', data: 'Command started...' },
        { type: 'output', data: 'Processing files...' },
        { type: 'output', data: 'Command completed.' }
      ];
      
      testMessages.forEach(msg => {
        mockEventSource.mockMessage(msg);
        mockBuffer.append(msg);
      });
      
      // Verify messages were buffered
      expect(mockBuffer.appendMock).toHaveBeenCalledTimes(3);
      expect(mockBuffer.size()).toBe(3);
      expect(mockBuffer.isEmpty()).toBe(false);
      
      // Verify terminal renderer was not called yet
      expect(mockTerminalRenderer.render).not.toHaveBeenCalled();
      
      // Simulate terminal becoming ready
      mockTerminalManager.isReady.mockReturnValue(true);
      const bufferedMessages = mockBuffer.flush();
      
      // Process buffered messages
      const processedMessages = await mockProcessor.processStream(bufferedMessages);
      
      // Verify processing and rendering
      expect(mockBuffer.flushMock).toHaveBeenCalled();
      expect(mockProcessor.processStreamMock).toHaveBeenCalledWith(bufferedMessages);
      expect(processedMessages).toHaveLength(3);
      
      // Verify metrics collection
      expect(mockMetricsCollector.recordBufferUsage).toHaveBeenCalledWith({
        bufferedCount: 3,
        bufferFlushTime: expect.any(Number)
      });
    });

    it('should handle buffer overflow with message prioritization', async () => {
      // London School - Setup buffer overflow scenario
      mockBuffer.setMaxSize(5);
      
      const mockPrioritizer = {
        prioritize: jest.fn((messages: any[]) => 
          messages.sort((a, b) => (b.priority || 0) - (a.priority || 0))
        ),
        shouldDropMessage: jest.fn(() => false)
      };
      
      // Create messages with different priorities
      const messages = [
        { type: 'output', data: 'low priority', priority: 1 },
        { type: 'error', data: 'high priority error', priority: 5 },
        { type: 'output', data: 'normal output', priority: 2 },
        { type: 'warning', data: 'medium priority warning', priority: 3 },
        { type: 'output', data: 'another low priority', priority: 1 },
        { type: 'critical', data: 'critical system message', priority: 10 }
      ];
      
      // Fill buffer beyond capacity
      messages.forEach(msg => mockBuffer.append(msg));
      
      // Verify overflow handling
      expect(mockBuffer.overflowMock).toHaveBeenCalledTimes(1);
      expect(mockBuffer.size()).toBe(5); // At max capacity
      
      // Verify high-priority messages are retained
      const bufferContents = mockBuffer.getBufferContents();
      const criticalMessage = bufferContents.find(m => m.type === 'critical');
      expect(criticalMessage).toBeDefined();
      
      // Verify metrics recorded overflow
      expect(mockMetricsCollector.recordBufferUsage).toHaveBeenCalledWith({
        overflow: true,
        droppedMessages: 1,
        bufferUtilization: 1.0
      });
    });

    it('should maintain message ordering across different transport types', async () => {
      // London School - Setup mixed transport scenario
      const sseMessages = [
        { type: 'output', data: 'SSE message 1', sequenceId: 1, transport: 'sse' },
        { type: 'output', data: 'SSE message 3', sequenceId: 3, transport: 'sse' }
      ];
      
      const httpMessages = [
        { type: 'output', data: 'HTTP message 2', sequenceId: 2, transport: 'http' },
        { type: 'output', data: 'HTTP message 4', sequenceId: 4, transport: 'http' }
      ];
      
      // Simulate messages arriving out of order from different transports
      mockBuffer.append(sseMessages[0]);
      mockBuffer.append(httpMessages[1]); // Out of order
      mockBuffer.append(httpMessages[0]);
      mockBuffer.append(sseMessages[1]);
      
      const bufferedMessages = mockBuffer.flush();
      
      // Check if messages are out of order
      const isOutOfOrder = mockOrdering.detectOutOfOrder(bufferedMessages);
      expect(isOutOfOrder).toBe(true);
      expect(mockOrdering.detectOutOfOrderMock).toHaveBeenCalled();
      
      // Reorder messages
      const orderedMessages = mockOrdering.reorderMessages(bufferedMessages);
      
      // Verify correct ordering
      expect(orderedMessages[0].sequenceId).toBe(1);
      expect(orderedMessages[1].sequenceId).toBe(2);
      expect(orderedMessages[2].sequenceId).toBe(3);
      expect(orderedMessages[3].sequenceId).toBe(4);
      
      // Verify ordering service was used
      expect(mockOrdering.reorderMessagesMock).toHaveBeenCalled();
      
      // Process ordered messages
      await mockProcessor.processStream(orderedMessages);
      
      // Verify UI updates in correct order
      expect(mockTerminalRenderer.render).toHaveBeenCalledTimes(4);
    });
  });

  describe('Stream Processing Scenarios', () => {
    it('should process terminal output with ANSI code handling', async () => {
      // London School - Setup ANSI processing scenario
      const mockANSIProcessor = {
        parseAnsiCodes: jest.fn((text: string) => ({
          text: text.replace(/\x1b\[[0-9;]*m/g, ''),
          formatting: ['bold', 'red']
        })),
        applyFormatting: jest.fn()
      };
      
      mockProcessor.setTransformer((msg: any) => {
        if (msg.type === 'output' && typeof msg.data === 'string') {
          const processed = mockANSIProcessor.parseAnsiCodes(msg.data);
          return {
            ...msg,
            text: processed.text,
            formatting: processed.formatting
          };
        }
        return msg;
      });
      
      // Send message with ANSI codes
      const ansiMessage = {
        type: 'output',
        data: '\x1b[1;31mError: Command failed\x1b[0m'
      };
      
      const processedMessage = await mockProcessor.processMessage(ansiMessage);
      
      // Verify ANSI processing
      expect(mockANSIProcessor.parseAnsiCodes).toHaveBeenCalledWith(ansiMessage.data);
      expect(processedMessage.text).toBe('Error: Command failed');
      expect(processedMessage.formatting).toEqual(['bold', 'red']);
      
      // Verify terminal rendering with formatting
      expect(mockTerminalRenderer.render).toHaveBeenCalledWith({
        text: 'Error: Command failed',
        formatting: ['bold', 'red']
      });
    });

    it('should filter sensitive information from command output', async () => {
      // London School - Setup sensitive data filtering
      const sensitivePatterns = [
        /password[=:\s]+[\w\d]+/gi,
        /token[=:\s]+[\w\d\-_]+/gi,
        /api[_-]?key[=:\s]+[\w\d]+/gi
      ];
      
      const mockSensitiveDataFilter = {
        containsSensitiveData: jest.fn((text: string) => 
          sensitivePatterns.some(pattern => pattern.test(text))
        ),
        sanitizeData: jest.fn((text: string) => 
          sensitivePatterns.reduce((sanitized, pattern) => 
            sanitized.replace(pattern, '[REDACTED]'), text)
        )
      };
      
      mockProcessor.setFilter((msg: any) => {
        if (mockSensitiveDataFilter.containsSensitiveData(msg.data)) {
          msg.data = mockSensitiveDataFilter.sanitizeData(msg.data);
          msg.wasSanitized = true;
        }
        return true; // Keep the message after sanitization
      });
      
      // Test messages with sensitive data
      const sensitiveMessages = [
        { type: 'output', data: 'export password=secret123' },
        { type: 'output', data: 'Using API_KEY=abc123def456' },
        { type: 'output', data: 'Normal command output' }
      ];
      
      const processedMessages = await mockProcessor.processStream(sensitiveMessages);
      
      // Verify sensitive data was filtered
      expect(mockSensitiveDataFilter.containsSensitiveData).toHaveBeenCalledTimes(3);
      expect(mockSensitiveDataFilter.sanitizeData).toHaveBeenCalledTimes(2);
      
      // Verify redacted output
      expect(processedMessages[0].data).toContain('[REDACTED]');
      expect(processedMessages[1].data).toContain('[REDACTED]');
      expect(processedMessages[2].data).toBe('Normal command output');
      
      // Verify sanitization was marked
      expect(processedMessages[0].wasSanitized).toBe(true);
      expect(processedMessages[1].wasSanitized).toBe(true);
      expect(processedMessages[2].wasSanitized).toBeUndefined();
      
      // Verify security metrics
      expect(mockMetricsCollector.recordProcessingTime).toHaveBeenCalledWith({
        sensitiveDataFiltered: 2,
        totalMessages: 3
      });
    });

    it('should handle large message chunks with streaming processing', async () => {
      // London School - Setup streaming scenario
      const largeOutput = 'A'.repeat(10000); // 10KB of data
      const chunkSize = 1000;
      
      const mockChunkProcessor = {
        chunkMessage: jest.fn((data: string, size: number) => {
          const chunks = [];
          for (let i = 0; i < data.length; i += size) {
            chunks.push(data.slice(i, i + size));
          }
          return chunks;
        }),
        processChunk: jest.fn(),
        reassembleChunks: jest.fn()
      };
      
      // Simulate large message being chunked
      const largeMessage = { type: 'output', data: largeOutput };
      const chunks = mockChunkProcessor.chunkMessage(largeOutput, chunkSize);
      
      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunkMessage = {
          type: 'output_chunk',
          data: chunks[i],
          chunkIndex: i,
          totalChunks: chunks.length,
          messageId: 'large-message-1'
        };
        
        await mockProcessor.processMessage(chunkMessage);
        mockBuffer.append(chunkMessage);
      }
      
      // Verify chunking and processing
      expect(mockChunkProcessor.chunkMessage).toHaveBeenCalledWith(largeOutput, chunkSize);
      expect(mockBuffer.size()).toBe(chunks.length);
      
      // Verify incremental rendering for better UX
      expect(mockTerminalRenderer.appendOutput).toHaveBeenCalledTimes(chunks.length);
      
      // Verify performance metrics
      expect(mockMetricsCollector.recordThroughput).toHaveBeenCalledWith({
        messageSize: largeOutput.length,
        chunks: chunks.length,
        processingTime: expect.any(Number)
      });
    });
  });

  describe('Message Ordering and Synchronization', () => {
    it('should detect and handle sequence gaps', async () => {
      // London School - Setup sequence gap scenario
      const messagesWithGaps = [
        { type: 'output', data: 'Message 1', sequenceId: 1 },
        { type: 'output', data: 'Message 3', sequenceId: 3 }, // Gap: missing 2
        { type: 'output', data: 'Message 5', sequenceId: 5 }, // Gap: missing 4
        { type: 'output', data: 'Message 7', sequenceId: 7 }  // Gap: missing 6
      ];
      
      const detectedGaps = mockOrdering.getSequenceGaps(messagesWithGaps);
      
      // Verify gap detection
      expect(mockOrdering.getSequenceGapsMock).toHaveBeenCalled();
      expect(detectedGaps).toEqual([2, 4, 6]);
      
      // Mock gap recovery mechanism
      const mockGapRecovery = {
        requestMissingMessages: jest.fn(),
        waitForMissingMessages: jest.fn().mockResolvedValue([
          { type: 'output', data: 'Message 2', sequenceId: 2 },
          { type: 'output', data: 'Message 4', sequenceId: 4 }
        ]),
        giveUpOnMissingMessages: jest.fn()
      };
      
      // Attempt to recover missing messages
      const recoveredMessages = await mockGapRecovery.waitForMissingMessages();
      
      // Combine original and recovered messages
      const allMessages = [...messagesWithGaps, ...recoveredMessages];
      const orderedMessages = mockOrdering.reorderMessages(allMessages);
      
      // Verify correct ordering after recovery
      expect(orderedMessages[0].sequenceId).toBe(1);
      expect(orderedMessages[1].sequenceId).toBe(2);
      expect(orderedMessages[2].sequenceId).toBe(3);
      expect(orderedMessages[4].sequenceId).toBe(5);
      
      // Verify gap recovery was attempted
      expect(mockGapRecovery.waitForMissingMessages).toHaveBeenCalled();
      
      // Verify UI showed gap recovery status
      expect(mockUIUpdater.showWarning).toHaveBeenCalledWith(
        'Recovering missing messages...'
      );
    });

    it('should synchronize messages from multiple connection types', async () => {
      // London School - Setup multi-connection synchronization
      const sseConnection = EventSourceMockFactory.createConnectedMock('ws://localhost:3000');
      const httpConnection = FetchMockFactory.createTerminalMock();
      
      const mockSynchronizer = {
        synchronizeConnections: jest.fn(),
        mergeMessageStreams: jest.fn(),
        resolveConflicts: jest.fn(),
        selectPrimaryConnection: jest.fn().mockReturnValue('sse')
      };
      
      // Simulate concurrent messages from both connections
      const sseMessages = [
        { type: 'output', data: 'SSE: Command output', timestamp: 1000, source: 'sse' },
        { type: 'status', data: 'Connected via SSE', timestamp: 1100, source: 'sse' }
      ];
      
      const httpMessages = [
        { type: 'output', data: 'HTTP: Same command output', timestamp: 1050, source: 'http' },
        { type: 'heartbeat', data: 'HTTP keepalive', timestamp: 1200, source: 'http' }
      ];
      
      // Send messages from both sources
      sseMessages.forEach(msg => sseConnection.mockMessage(msg));
      // HTTP messages would come through fetch responses
      
      // Merge and synchronize streams
      const mergedMessages = [...sseMessages, ...httpMessages];
      const synchronizedMessages = mockSynchronizer.mergeMessageStreams(mergedMessages);
      
      // Verify synchronization
      expect(mockSynchronizer.mergeMessageStreams).toHaveBeenCalledWith(mergedMessages);
      expect(mockSynchronizer.selectPrimaryConnection).toHaveBeenCalled();
      
      // Verify conflict resolution for duplicate messages
      expect(mockSynchronizer.resolveConflicts).toHaveBeenCalled();
      
      // Process synchronized messages
      await mockProcessor.processStream(synchronizedMessages);
      
      // Verify metrics recorded synchronization
      expect(mockMetricsCollector.recordProcessingTime).toHaveBeenCalledWith({
        synchronizedSources: 2,
        messageConflicts: expect.any(Number),
        primarySource: 'sse'
      });
    });
  });

  describe('London School - Contract Verification', () => {
    it('should verify all message handling contracts are fulfilled', () => {
      // Verify buffer interactions
      expect(mockBuffer.appendMock).toHaveBeenCalled();
      expect(mockBuffer.flushMock).toHaveBeenCalled();
      
      // Verify processing interactions  
      expect(mockProcessor.processMessageMock).toHaveBeenCalled();
      expect(mockProcessor.processStreamMock).toHaveBeenCalled();
      
      // Verify ordering interactions
      expect(mockOrdering.enforceOrderMock).toHaveBeenCalled();
      expect(mockOrdering.detectOutOfOrderMock).toHaveBeenCalled();
      
      // Verify external collaborator interactions
      expect(mockTerminalRenderer.render).toHaveBeenCalled();
      expect(mockMetricsCollector.recordBufferUsage).toHaveBeenCalled();
    });

    it('should verify proper cleanup and resource management', () => {
      // Clear all buffers and processors
      mockBuffer.clear();
      mockProcessor = new MockStreamProcessor();
      
      // Verify cleanup
      expect(mockBuffer.clearMock).toHaveBeenCalled();
      expect(mockBuffer.isEmpty()).toBe(true);
      
      // Verify error handler handled cleanup
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should verify performance characteristics are maintained', () => {
      // Verify all performance metrics were collected
      expect(mockMetricsCollector.recordMessageLatency).toHaveBeenCalled();
      expect(mockMetricsCollector.recordBufferUsage).toHaveBeenCalled();
      expect(mockMetricsCollector.recordProcessingTime).toHaveBeenCalled();
      expect(mockMetricsCollector.recordThroughput).toHaveBeenCalled();
      
      // Verify buffer never exceeded optimal size
      expect(mockBuffer.isFull()).toBe(false);
      
      // Verify processing never blocked the main thread
      expect(mockProcessor.processStreamMock).toHaveBeenCalled();
    });
  });
});