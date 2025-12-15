# Terminal Testing Strategy

## Comprehensive Testing Approach for Robust Terminal Input

### Testing Levels

## 1. Unit Tests

### Frontend Terminal Client Tests
```typescript
// tests/RawTerminalClient.test.ts
import RawTerminalClient from '../src/RawTerminalClient';
import { Terminal } from 'xterm';

describe('RawTerminalClient', () => {
  let client: RawTerminalClient;
  let mockTerminal: jest.Mocked<Terminal>;
  let mockWebSocket: jest.Mocked<WebSocket>;
  
  beforeEach(() => {
    // Mock WebSocket
    global.WebSocket = jest.fn(() => mockWebSocket) as any;
    
    client = new RawTerminalClient({
      url: 'ws://localhost:8080',
      debugMode: true
    });
  });
  
  describe('Input Handling', () => {
    it('should capture and queue all terminal input', () => {
      const container = document.createElement('div');
      const terminal = client.initializeTerminal(container);
      
      // Simulate user typing
      const inputData = 'ls -la\r';
      terminal.onData(inputData);
      
      // Verify input was captured and logged
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Input captured:'),
        expect.objectContaining({
          data: JSON.stringify(inputData),
          length: inputData.length
        })
      );
    });
    
    it('should queue input when not connected', () => {
      const container = document.createElement('div');
      const terminal = client.initializeTerminal(container);
      
      // Simulate input while disconnected
      terminal.onData('echo "test"');
      
      // Verify input was queued
      expect(client['inputQueue']).toContain('echo "test"');
    });
    
    it('should process queued input when connection is restored', async () => {
      const container = document.createElement('div');
      const terminal = client.initializeTerminal(container);
      
      // Queue input while disconnected
      terminal.onData('queued input');
      
      // Connect
      mockWebSocket.readyState = WebSocket.OPEN;
      await client.connect();
      
      // Verify queued input was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'input',
          data: 'queued input',
          timestamp: expect.any(Number)
        })
      );
    });
  });
  
  describe('Connection Management', () => {
    it('should reconnect with exponential backoff', async () => {
      jest.useFakeTimers();
      
      // Simulate connection failure
      mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as any);
      
      // Fast-forward through reconnection attempts
      for (let i = 1; i <= 3; i++) {
        const expectedDelay = 1000 * Math.pow(2, i - 1);
        jest.advanceTimersByTime(expectedDelay);
        
        expect(global.WebSocket).toHaveBeenCalledTimes(i + 1);
      }
      
      jest.useRealTimers();
    });
    
    it('should stop reconnecting after max attempts', () => {
      const client = new RawTerminalClient({
        url: 'ws://localhost:8080',
        maxReconnectAttempts: 3
      });
      
      // Simulate repeated connection failures
      for (let i = 0; i < 5; i++) {
        mockWebSocket.onclose?.({ code: 1006 } as any);
      }
      
      expect(client['reconnectAttempts']).toBe(3);
    });
  });
  
  describe('Message Handling', () => {
    it('should handle JSON messages correctly', () => {
      const container = document.createElement('div');
      const terminal = client.initializeTerminal(container);
      
      const message = {
        type: 'output',
        data: 'Hello World\r\n',
        timestamp: Date.now()
      };
      
      mockWebSocket.onmessage?.({
        data: JSON.stringify(message)
      } as any);
      
      expect(terminal.write).toHaveBeenCalledWith('Hello World\r\n');
    });
    
    it('should handle raw data as fallback', () => {
      const container = document.createElement('div');
      const terminal = client.initializeTerminal(container);
      
      const rawData = 'Raw terminal output\r\n';
      
      mockWebSocket.onmessage?.({
        data: rawData
      } as any);
      
      expect(terminal.write).toHaveBeenCalledWith(rawData);
    });
  });
});
```

### Backend Terminal Server Tests
```typescript
// tests/RawTerminalServer.test.ts
import RawTerminalServer from '../src/RawTerminalServer';
import WebSocket from 'ws';
import * as pty from 'node-pty';

jest.mock('node-pty');
jest.mock('ws');

describe('RawTerminalServer', () => {
  let server: RawTerminalServer;
  let mockPty: jest.Mocked<pty.IPty>;
  let mockWss: jest.Mocked<WebSocket.Server>;
  let mockClient: jest.Mocked<WebSocket>;
  
  beforeEach(() => {
    mockPty = {
      write: jest.fn(),
      resize: jest.fn(),
      kill: jest.fn(),
      onData: jest.fn(),
      onExit: jest.fn(),
      pid: 1234
    } as any;
    
    (pty.spawn as jest.Mock).mockReturnValue(mockPty);
    
    server = new RawTerminalServer(8080, true);
  });
  
  describe('PTY Management', () => {
    it('should initialize PTY process correctly', () => {
      expect(pty.spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          name: 'xterm-color',
          cols: 80,
          rows: 24,
          env: expect.objectContaining({
            TERM: 'xterm-color',
            COLORTERM: 'truecolor'
          })
        })
      );
    });
    
    it('should forward PTY output to all clients', () => {
      const testOutput = 'Hello from PTY\r\n';
      
      // Simulate PTY output
      const onDataCallback = mockPty.onData.mock.calls[0][0];
      onDataCallback(testOutput);
      
      // Verify broadcast to clients
      expect(mockClient.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'output',
          data: testOutput,
          timestamp: expect.any(Number)
        })
      );
    });
    
    it('should restart PTY process on exit', (done) => {
      const onExitCallback = mockPty.onExit.mock.calls[0][0];
      
      // Simulate PTY exit
      onExitCallback({ exitCode: 0, signal: null });
      
      // Wait for restart
      setTimeout(() => {
        expect(pty.spawn).toHaveBeenCalledTimes(2);
        done();
      }, 1100);
    });
  });
  
  describe('Client Management', () => {
    it('should handle client input correctly', () => {
      const inputMessage = {
        type: 'input',
        data: 'ls -la\r',
        timestamp: Date.now()
      };
      
      // Simulate client message
      mockClient.on.mock.calls
        .find(([event]) => event === 'message')[1]
        (JSON.stringify(inputMessage));
      
      expect(mockPty.write).toHaveBeenCalledWith('ls -la\r');
    });
    
    it('should handle resize requests', () => {
      const resizeMessage = {
        type: 'resize',
        cols: 120,
        rows: 30,
        timestamp: Date.now()
      };
      
      mockClient.on.mock.calls
        .find(([event]) => event === 'message')[1]
        (JSON.stringify(resizeMessage));
      
      expect(mockPty.resize).toHaveBeenCalledWith(120, 30);
    });
    
    it('should clean up disconnected clients', () => {
      const clientId = 'test-client';
      server['clients'].set(clientId, {
        id: clientId,
        ws: mockClient,
        lastActivity: new Date()
      });
      
      // Simulate client disconnect
      mockClient.on.mock.calls
        .find(([event]) => event === 'close')[1]
        (1000, 'Normal closure');
      
      expect(server['clients'].has(clientId)).toBe(false);
    });
  });
});
```

## 2. Integration Tests

### End-to-End Terminal Communication
```typescript
// tests/integration/terminal-e2e.test.ts
import RawTerminalServer from '../../src/RawTerminalServer';
import RawTerminalClient from '../../src/RawTerminalClient';
import { JSDOM } from 'jsdom';

describe('Terminal Integration', () => {
  let server: RawTerminalServer;
  let client: RawTerminalClient;
  let dom: JSDOM;
  
  beforeAll(async () => {
    // Setup DOM environment
    dom = new JSDOM('<!DOCTYPE html><div id="terminal"></div>');
    (global as any).window = dom.window;
    (global as any).document = dom.window.document;
    (global as any).WebSocket = dom.window.WebSocket;
    
    // Start server
    server = new RawTerminalServer(18080, true);
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 100));
  });
  
  afterAll(() => {
    server?.shutdown();
    dom?.window.close();
  });
  
  beforeEach(() => {
    client = new RawTerminalClient({
      url: 'ws://localhost:18080',
      debugMode: true
    });
  });
  
  afterEach(() => {
    client?.disconnect();
  });
  
  it('should establish connection and exchange messages', async () => {
    const container = document.getElementById('terminal')!;
    const terminal = client.initializeTerminal(container);
    
    // Connect to server
    await client.connect();
    
    expect(client.getConnectionStatus()).toBe('connected');
    
    // Test input/output flow
    let receivedOutput = '';
    terminal.onData = jest.fn();
    terminal.write = jest.fn((data) => {
      receivedOutput += data;
    });
    
    // Send command
    terminal.onData('echo "Hello Integration Test"\r');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    expect(receivedOutput).toContain('Hello Integration Test');
  });
  
  it('should handle multiple concurrent connections', async () => {
    const clients = [];
    const terminals = [];
    
    // Create multiple clients
    for (let i = 0; i < 5; i++) {
      const testClient = new RawTerminalClient({
        url: 'ws://localhost:18080',
        debugMode: true
      });
      
      const container = document.createElement('div');
      const terminal = testClient.initializeTerminal(container);
      
      await testClient.connect();
      
      clients.push(testClient);
      terminals.push(terminal);
    }
    
    // Verify all connected
    expect(clients.every(c => c.getConnectionStatus() === 'connected')).toBe(true);
    
    // Send input from one client
    terminals[0].onData('whoami\r');
    
    // Verify all clients receive output
    await new Promise(resolve => setTimeout(resolve, 500));
    
    terminals.forEach(terminal => {
      expect(terminal.write).toHaveBeenCalledWith(expect.stringContaining('whoami'));
    });
    
    // Cleanup
    clients.forEach(client => client.disconnect());
  });
  
  it('should recover from connection failures', async () => {
    const container = document.getElementById('terminal')!;
    const terminal = client.initializeTerminal(container);
    
    await client.connect();
    expect(client.getConnectionStatus()).toBe('connected');
    
    // Simulate server restart
    server.shutdown();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    server = new RawTerminalServer(18080, true);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Wait for auto-reconnection
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    expect(client.getConnectionStatus()).toBe('connected');
  });
});
```

## 3. Manual Testing Procedures

### Terminal Input Validation Checklist

#### Basic Input Testing
```bash
# Test Plan: Terminal Input Validation
# Location: /workspaces/agent-feed/docs/testing/

# 1. Character Input Tests
echo "Testing basic character input"
# Expected: Characters appear immediately as typed

# 2. Special Character Tests  
echo "Testing special chars: !@#$%^&*()"
# Expected: All special characters transmitted correctly

# 3. Control Character Tests
# Ctrl+C (should interrupt)
# Ctrl+D (should send EOF)
# Ctrl+Z (should suspend if supported)
# Ctrl+L (should clear screen)

# 4. Arrow Key Tests
# Up/Down arrows (command history)
# Left/Right arrows (cursor movement)
# Expected: Proper cursor positioning

# 5. Function Key Tests
# F1-F12 keys
# Expected: Function keys work or are ignored gracefully

# 6. Multi-byte Character Tests
echo "Testing Unicode: 你好世界 🚀 🌟"
# Expected: Unicode characters display correctly

# 7. Rapid Input Tests
# Type very quickly: "The quick brown fox jumps over the lazy dog"
# Expected: No characters lost, proper order maintained

# 8. Large Input Tests
cat > large_input.txt << 'EOF'
[Large block of text - 1000+ characters]
EOF
cat large_input.txt
# Expected: Large inputs handled without truncation

# 9. Paste Operations
# Copy and paste large text blocks
# Expected: Paste operations work correctly

# 10. Session Persistence
# Type commands, refresh page, return
# Expected: Session state maintained (if implemented)
```

### Browser Compatibility Testing
```javascript
// Browser Test Matrix
const browsers = [
  'Chrome 120+',
  'Firefox 115+', 
  'Safari 16+',
  'Edge 120+'
];

const tests = [
  'WebSocket support',
  'xterm.js compatibility',
  'Keyboard event handling',
  'Copy/paste functionality',
  'Full screen mode',
  'Performance under load'
];

// Test each browser/test combination
// Document results in compatibility matrix
```

### Performance Testing
```typescript
// Performance Test Suite
class TerminalPerformanceTests {
  async testInputLatency(): Promise<void> {
    const client = new RawTerminalClient({ url: 'ws://localhost:8080' });
    const times: number[] = [];
    
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      
      // Send input
      client.sendInput('test');
      
      // Measure round-trip time
      await this.waitForResponse();
      
      const end = performance.now();
      times.push(end - start);
    }
    
    const avgLatency = times.reduce((a, b) => a + b) / times.length;
    const maxLatency = Math.max(...times);
    
    console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`Max Latency: ${maxLatency.toFixed(2)}ms`);
    
    // Assert acceptable latency thresholds
    expect(avgLatency).toBeLessThan(50); // < 50ms average
    expect(maxLatency).toBeLessThan(200); // < 200ms max
  }
  
  async testHighVolumeInput(): Promise<void> {
    // Test 1000 rapid-fire inputs
    // Measure: throughput, memory usage, connection stability
  }
  
  async testMemoryUsage(): Promise<void> {
    // Monitor memory usage during extended session
    // Look for memory leaks in terminal buffer
  }
}
```

## 4. Automated Testing Infrastructure

### Continuous Integration Pipeline
```yaml
# .github/workflows/terminal-tests.yml
name: Terminal Integration Tests

on: [push, pull_request]

jobs:
  terminal-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Start terminal server
      run: npm run terminal:server &
      
    - name: Wait for server startup
      run: sleep 5
      
    - name: Run unit tests
      run: npm test -- tests/unit/
      
    - name: Run integration tests  
      run: npm test -- tests/integration/
      
    - name: Run E2E tests
      run: npm run test:e2e:terminal
      
    - name: Performance tests
      run: npm run test:performance
      
    - name: Upload test results
      uses: actions/upload-artifact@v3
      with:
        name: terminal-test-results
        path: test-results/
```

### Test Data Collection
```typescript
// Test metrics collection
interface TestMetrics {
  testName: string;
  duration: number;
  inputLatency: number[];
  outputLatency: number[];
  memoryUsage: number[];
  connectionStability: number;
  errorRate: number;
  timestamp: Date;
}

class TestMetricsCollector {
  private metrics: TestMetrics[] = [];
  
  recordTest(test: TestMetrics): void {
    this.metrics.push(test);
    this.generateReport();
  }
  
  generateReport(): void {
    // Generate comprehensive test report
    // Include trends, regressions, performance graphs
  }
}
```

## 5. Debugging Tools

### Terminal Debug Console
```typescript
class TerminalDebugConsole {
  private logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }> = [];
  
  log(level: string, message: string, data?: any): void {
    this.logs.push({
      timestamp: new Date(),
      level: level as any,
      message,
      data
    });
    
    // Real-time debug output
    console.log(`[TERMINAL-DEBUG] ${level.toUpperCase()}: ${message}`, data || '');
  }
  
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
  
  clearLogs(): void {
    this.logs = [];
  }
}
```

### Network Traffic Analysis
```typescript
// WebSocket message interceptor for debugging
class WebSocketDebugger {
  private originalSend: WebSocket['send'];
  private messageLog: Array<{
    direction: 'sent' | 'received';
    timestamp: Date;
    data: string;
    size: number;
  }> = [];
  
  install(ws: WebSocket): void {
    this.originalSend = ws.send.bind(ws);
    
    // Intercept outgoing messages
    ws.send = (data: string | ArrayBuffer | Blob) => {
      this.logMessage('sent', data.toString());
      return this.originalSend(data);
    };
    
    // Intercept incoming messages
    const originalOnMessage = ws.onmessage;
    ws.onmessage = (event) => {
      this.logMessage('received', event.data);
      return originalOnMessage?.call(ws, event);
    };
  }
  
  private logMessage(direction: 'sent' | 'received', data: string): void {
    this.messageLog.push({
      direction,
      timestamp: new Date(),
      data: data.substring(0, 1000), // Truncate for readability
      size: data.length
    });
  }
  
  exportMessageLog(): string {
    return JSON.stringify(this.messageLog, null, 2);
  }
}
```

## 6. Test Success Criteria

### Acceptance Criteria
- [ ] 100% input capture rate (no lost keystrokes)
- [ ] < 50ms average input latency
- [ ] < 200ms maximum input latency  
- [ ] 99.9% connection stability
- [ ] Graceful handling of all connection failures
- [ ] Support for all standard terminal operations
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Memory usage remains stable during extended sessions
- [ ] No silent failures in event chain
- [ ] Comprehensive error reporting and logging

### Performance Benchmarks
- **Input Throughput**: > 1000 characters/second
- **Concurrent Connections**: Support 50+ simultaneous users
- **Memory Usage**: < 10MB per terminal session
- **CPU Usage**: < 5% during normal operation
- **Startup Time**: < 2 seconds for initial connection

This comprehensive testing strategy ensures that the terminal input system is thoroughly validated at all levels, from individual components to full end-to-end workflows.