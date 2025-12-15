/**
 * Terminal Test Utilities
 * 
 * Comprehensive utilities and mocks for terminal testing including
 * mock factories, test data generators, and common test helpers.
 */

import { EventEmitter } from 'events';
import { 
  ILogger, 
  IRetryManager, 
  IMessageHandler, 
  IConnectionManager,
  TerminalMessage,
  TerminalConnectionState,
  TerminalCommandResult
} from '@/types/terminal';

// Mock implementations
export class MockLogger implements ILogger {
  public logs: { level: string; message: string; meta?: any }[] = [];

  info(message: string, meta?: any): void {
    this.logs.push({ level: 'info', message, meta });
  }

  warn(message: string, meta?: any): void {
    this.logs.push({ level: 'warn', message, meta });
  }

  error(message: string, meta?: any): void {
    this.logs.push({ level: 'error', message, meta });
  }

  debug(message: string, meta?: any): void {
    this.logs.push({ level: 'debug', message, meta });
  }

  getLogs(level?: string): typeof this.logs {
    return level ? this.logs.filter(log => log.level === level) : this.logs;
  }

  clear(): void {
    this.logs = [];
  }

  getLastLog(level?: string): typeof this.logs[0] | undefined {
    const logs = this.getLogs(level);
    return logs[logs.length - 1];
  }
}

export class MockRetryManager implements IRetryManager {
  private attempt = 0;
  private maxRetries = 3;

  shouldRetry(error: Error, attempt: number): boolean {
    return attempt < this.maxRetries;
  }

  getNextDelay(attempt: number, options?: { jitter?: boolean }): number {
    const baseDelay = 1000 * Math.pow(2, attempt);
    return options?.jitter ? baseDelay + Math.random() * 1000 : baseDelay;
  }

  reset(): void {
    this.attempt = 0;
  }

  incrementAttempt(): void {
    this.attempt++;
  }

  getCurrentAttempt(): number {
    return this.attempt;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>, 
    options?: { timeout?: number }
  ): Promise<T> {
    let lastError: Error;
    
    while (this.shouldRetry(new Error(), this.attempt)) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.incrementAttempt();
        
        if (this.shouldRetry(lastError, this.attempt)) {
          const delay = this.getNextDelay(this.attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  getMetrics() {
    return {
      currentAttempt: this.attempt,
      maxRetries: this.maxRetries,
      currentDelay: this.getNextDelay(this.attempt),
      isRetrying: this.attempt > 0,
      lastError: null
    };
  }

  setMaxRetries(max: number): void {
    this.maxRetries = max;
  }
}

export class MockMessageHandler implements IMessageHandler {
  public handledMessages: { type: string; data: any }[] = [];

  handleOutput(data: string): void {
    this.handledMessages.push({ type: 'output', data });
  }

  handleError(error: string): void {
    this.handledMessages.push({ type: 'error', data: error });
  }

  handleConnectionStatus(status: string): void {
    this.handledMessages.push({ type: 'connection_status', data: status });
  }

  handleCommandResult(result: TerminalCommandResult | any): void {
    this.handledMessages.push({ type: 'command_result', data: result });
  }

  handleDirectoryChange?(directory: string): void {
    this.handledMessages.push({ type: 'directory_change', data: directory });
  }

  handleMessage?(message: TerminalMessage | any): void {
    this.handledMessages.push({ type: 'generic_message', data: message });
  }

  handleBatchMessages?(messages: TerminalMessage[]): void {
    this.handledMessages.push({ type: 'batch_messages', data: messages });
  }

  getHandledMessages(type?: string): typeof this.handledMessages {
    return type ? 
      this.handledMessages.filter(msg => msg.type === type) : 
      this.handledMessages;
  }

  clear(): void {
    this.handledMessages = [];
  }
}

export class MockConnectionManager implements IConnectionManager {
  private state: TerminalConnectionState = 'disconnected';
  private mockWebSocket: MockWebSocket | null = null;

  async connect(url: string): Promise<WebSocket> {
    this.state = 'connecting';
    this.mockWebSocket = new MockWebSocket(url);
    
    // Simulate async connection
    setTimeout(() => {
      this.state = 'connected';
      this.mockWebSocket?.simulateOpen();
    }, 10);

    return this.mockWebSocket as any;
  }

  async disconnect(): Promise<void> {
    this.state = 'disconnected';
    this.mockWebSocket?.close();
    this.mockWebSocket = null;
  }

  getConnectionState(): TerminalConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  setState(state: TerminalConnectionState): void {
    this.state = state;
  }

  getMockWebSocket(): MockWebSocket | null {
    return this.mockWebSocket;
  }
}

export class MockWebSocket extends EventEmitter {
  public readyState: number = WebSocket.CONNECTING;
  public url: string;
  public sentMessages: string[] = [];
  public protocol: string = '';
  public extensions: string = '';
  public bufferedAmount: number = 0;
  public binaryType: 'blob' | 'arraybuffer' = 'blob';

  // WebSocket constants
  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSING = 2;
  public static readonly CLOSED = 3;

  public readonly CONNECTING = MockWebSocket.CONNECTING;
  public readonly OPEN = MockWebSocket.OPEN;
  public readonly CLOSING = MockWebSocket.CLOSING;
  public readonly CLOSED = MockWebSocket.CLOSED;

  // Event handlers (for compatibility)
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    super();
    this.url = url;
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    
    this.sentMessages.push(typeof data === 'string' ? data : '[Binary Data]');
    this.emit('mock_send', data);
  }

  close(code?: number, reason?: string): void {
    if (this.readyState === MockWebSocket.CLOSED) return;
    
    this.readyState = MockWebSocket.CLOSING;
    
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      const closeEvent = { code: code || 1000, reason: reason || '', wasClean: true };
      this.emit('close', closeEvent);
      if (this.onclose) this.onclose(closeEvent as CloseEvent);
    }, 0);
  }

  // Test utility methods
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    const openEvent = new Event('open');
    this.emit('open', openEvent);
    if (this.onopen) this.onopen(openEvent);
  }

  simulateMessage(data: any): void {
    if (this.readyState !== MockWebSocket.OPEN) return;
    
    const messageEvent = { 
      data: typeof data === 'string' ? data : JSON.stringify(data),
      type: 'message',
      origin: this.url,
      lastEventId: '',
      source: null,
      ports: []
    };
    
    this.emit('message', messageEvent);
    if (this.onmessage) this.onmessage(messageEvent as MessageEvent);
  }

  simulateError(error?: Error | string): void {
    const errorEvent = new Event('error');
    if (error) {
      (errorEvent as any).error = typeof error === 'string' ? new Error(error) : error;
    }
    
    this.emit('error', errorEvent);
    if (this.onerror) this.onerror(errorEvent);
  }

  getSentMessages(): string[] {
    return [...this.sentMessages];
  }

  getLastSentMessage(): string | undefined {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  clearSentMessages(): void {
    this.sentMessages = [];
  }

  // EventTarget compatibility
  addEventListener(type: string, listener: EventListener): void {
    this.on(type, listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.off(type, listener);
  }

  dispatchEvent(event: Event): boolean {
    this.emit(event.type, event);
    return true;
  }
}

// Test data generators
export class TerminalTestDataGenerator {
  static generateTerminalMessage(type: string, data: any = null): TerminalMessage {
    return {
      type: type as any,
      data: data || `test-data-for-${type}`,
      timestamp: Date.now(),
      sessionId: `session-${Math.random().toString(36).substr(2, 9)}`,
      requestId: `request-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  static generateCommandResult(
    command: string = 'test-command',
    exitCode: number = 0
  ): TerminalCommandResult {
    return {
      command,
      exitCode,
      output: `Output from ${command}`,
      error: exitCode !== 0 ? `Error from ${command}` : undefined,
      duration: Math.floor(Math.random() * 1000) + 100,
      timestamp: Date.now()
    };
  }

  static generateLargeOutput(lines: number = 1000): string {
    return Array.from({ length: lines }, (_, i) => 
      `Line ${i + 1}: This is a test line with some content`
    ).join('\n');
  }

  static generateBinaryData(size: number = 1024): Uint8Array {
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = Math.floor(Math.random() * 256);
    }
    return data;
  }

  static generateUnicodeText(): string {
    return [
      'Hello World 🌍',
      '日本語テスト',
      'العربية',
      'Русский',
      'Ελληνικά',
      '🚀💻⚡🎉',
      'Émojis: 😀😃😄😁'
    ].join('\n');
  }

  static generateErrorScenarios(): Array<{ code: string; message: string; recoverable: boolean }> {
    return [
      { code: 'ECONNREFUSED', message: 'Connection refused', recoverable: true },
      { code: 'ETIMEDOUT', message: 'Connection timeout', recoverable: true },
      { code: 'ENOTFOUND', message: 'DNS lookup failed', recoverable: true },
      { code: 'PROTOCOL_ERROR', message: 'Protocol error', recoverable: false },
      { code: 'INVALID_MESSAGE', message: 'Invalid message format', recoverable: false },
      { code: 'ENOMEM', message: 'Out of memory', recoverable: true },
      { code: 'EMFILE', message: 'Too many open files', recoverable: true }
    ];
  }
}

// Test helpers
export class TerminalTestHelpers {
  static async waitForCondition(
    condition: () => boolean,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms timeout`);
  }

  static async waitForEvent(
    emitter: EventEmitter,
    eventName: string,
    timeout: number = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event '${eventName}' not emitted within ${timeout}ms`));
      }, timeout);

      emitter.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  static mockTimers(): {
    advance: (ms: number) => void;
    restore: () => void;
  } {
    const originalSetTimeout = setTimeout;
    const originalClearTimeout = clearTimeout;
    const originalSetInterval = setInterval;
    const originalClearInterval = clearInterval;
    
    let currentTime = Date.now();
    const timers = new Map<number, { callback: Function; time: number }>();
    let timerId = 1;

    global.setTimeout = jest.fn((callback: Function, delay: number = 0) => {
      const id = timerId++;
      timers.set(id, { callback, time: currentTime + delay });
      return id;
    }) as any;

    global.clearTimeout = jest.fn((id: number) => {
      timers.delete(id);
    }) as any;

    const advance = (ms: number) => {
      currentTime += ms;
      
      for (const [id, timer] of timers.entries()) {
        if (timer.time <= currentTime) {
          timer.callback();
          timers.delete(id);
        }
      }
    };

    const restore = () => {
      global.setTimeout = originalSetTimeout;
      global.clearTimeout = originalClearTimeout;
      global.setInterval = originalSetInterval;
      global.clearInterval = originalClearInterval;
    };

    return { advance, restore };
  }

  static createMockFactory() {
    return {
      logger: () => new MockLogger(),
      retryManager: () => new MockRetryManager(),
      messageHandler: () => new MockMessageHandler(),
      connectionManager: () => new MockConnectionManager(),
      webSocket: (url: string) => new MockWebSocket(url),
      eventEmitter: () => new EventEmitter()
    };
  }

  static async simulateNetworkConditions(options: {
    latency?: number;
    packetLoss?: number;
    bandwidth?: number;
    jitter?: number;
  }): Promise<{
    send: (data: any) => Promise<void>;
    receive: (callback: (data: any) => void) => void;
    destroy: () => void;
  }> {
    const { latency = 0, packetLoss = 0, bandwidth = Infinity, jitter = 0 } = options;
    const callbacks: Array<(data: any) => void> = [];

    const send = async (data: any): Promise<void> => {
      // Simulate packet loss
      if (Math.random() < packetLoss) {
        return; // Packet dropped
      }

      // Simulate bandwidth limitation
      const dataSize = JSON.stringify(data).length;
      const transmissionTime = dataSize / bandwidth * 1000; // Convert to ms

      // Simulate latency with jitter
      const actualLatency = latency + (jitter * (Math.random() - 0.5));

      setTimeout(() => {
        callbacks.forEach(callback => callback(data));
      }, Math.max(0, actualLatency + transmissionTime));
    };

    const receive = (callback: (data: any) => void): void => {
      callbacks.push(callback);
    };

    const destroy = (): void => {
      callbacks.length = 0;
    };

    return { send, receive, destroy };
  }

  static generatePerformanceBenchmark() {
    return {
      start: Date.now(),
      memory: process.memoryUsage(),
      
      measure(name: string) {
        return {
          name,
          duration: Date.now() - this.start,
          memoryDelta: {
            heapUsed: process.memoryUsage().heapUsed - this.memory.heapUsed,
            heapTotal: process.memoryUsage().heapTotal - this.memory.heapTotal,
            external: process.memoryUsage().external - this.memory.external,
            rss: process.memoryUsage().rss - this.memory.rss
          }
        };
      }
    };
  }
}

// Assertion helpers
export class TerminalTestAssertions {
  static assertMessageSent(webSocket: MockWebSocket, expectedMessage: Partial<TerminalMessage>): void {
    const sentMessages = webSocket.getSentMessages();
    const found = sentMessages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return Object.entries(expectedMessage).every(([key, value]) => 
          parsed[key] === value
        );
      } catch {
        return false;
      }
    });

    if (!found) {
      throw new Error(
        `Expected message not found. Expected: ${JSON.stringify(expectedMessage)}, ` +
        `Sent messages: ${JSON.stringify(sentMessages)}`
      );
    }
  }

  static assertLogContains(logger: MockLogger, level: string, message: string): void {
    const logs = logger.getLogs(level);
    const found = logs.some(log => log.message.includes(message));

    if (!found) {
      throw new Error(
        `Expected log message not found. Level: ${level}, Message: ${message}, ` +
        `Actual logs: ${JSON.stringify(logs)}`
      );
    }
  }

  static assertPerformance(
    operation: () => Promise<any> | any,
    maxDuration: number,
    maxMemoryIncrease: number = Infinity
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      try {
        await operation();
        
        const duration = Date.now() - startTime;
        const memoryIncrease = process.memoryUsage().heapUsed - startMemory;

        if (duration > maxDuration) {
          reject(new Error(
            `Operation took ${duration}ms, expected less than ${maxDuration}ms`
          ));
        }

        if (memoryIncrease > maxMemoryIncrease) {
          reject(new Error(
            `Memory increased by ${memoryIncrease} bytes, expected less than ${maxMemoryIncrease} bytes`
          ));
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Export factory function for easy test setup
export function createTerminalTestSuite() {
  const mockFactory = TerminalTestHelpers.createMockFactory();
  const dataGenerator = TerminalTestDataGenerator;
  const helpers = TerminalTestHelpers;
  const assertions = TerminalTestAssertions;

  return {
    mocks: mockFactory,
    data: dataGenerator,
    helpers,
    assertions,
    
    // Convenience setup functions
    setupBasicTest: () => ({
      logger: mockFactory.logger(),
      retryManager: mockFactory.retryManager(),
      messageHandler: mockFactory.messageHandler(),
      connectionManager: mockFactory.connectionManager(),
      eventEmitter: mockFactory.eventEmitter()
    }),

    setupWebSocketTest: (url: string = 'ws://localhost:3000/test') => ({
      webSocket: mockFactory.webSocket(url),
      logger: mockFactory.logger(),
      messageHandler: mockFactory.messageHandler()
    }),

    setupPerformanceTest: () => ({
      benchmark: helpers.generatePerformanceBenchmark(),
      mockTimers: helpers.mockTimers()
    })
  };
}