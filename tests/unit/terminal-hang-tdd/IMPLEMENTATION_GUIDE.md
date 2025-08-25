# Terminal Hang Fix Implementation Guide

## 🚨 CURRENT STATUS: Tests Created and Failing (As Expected)

The London School TDD test suite has been successfully created with **30 comprehensive failing tests** that capture the terminal hanging behavior. These tests are **designed to fail** and provide a roadmap for implementing fixes.

## 📋 Test Suite Summary

| Test Suite | Tests | Focus Area | Expected Status |
|------------|--------|------------|----------------|
| **Terminal Responsiveness** | 6 | Response timeouts, hang detection | ❌ FAILING |
| **WebSocket Message Flow** | 6 | Bidirectional communication | ❌ FAILING |
| **PTY Process State** | 6 | Process blocking, recovery | ❌ FAILING |
| **Command Execution Flow** | 6 | "cd prod && claude" hanging | ❌ FAILING |
| **Terminal Contracts** | 6 | System integration contracts | ❌ FAILING |

## 🎯 Implementation Roadmap

Based on the failing tests, here's the priority order for implementing fixes:

### Phase 1: Timeout Detection (High Priority)
**Files to modify**: 
- `/workspaces/agent-feed/src/websocket/TerminalWebSocket.ts`
- `/workspaces/agent-feed/backend-terminal-server-emergency-fix.js`

**Implementation needed**:
```typescript
// Add command timeout tracking
const commandTimeouts = new Map();

const executeCommandWithTimeout = (command: string, timeoutMs: number = 5000) => {
  const commandId = generateId();
  
  // Set timeout
  const timeout = setTimeout(() => {
    handleCommandTimeout(commandId, command);
  }, timeoutMs);
  
  commandTimeouts.set(commandId, { timeout, command, startTime: Date.now() });
  
  // Execute command
  ptyProcess.write(command);
  
  return commandId;
};

const handleCommandTimeout = (commandId: string, command: string) => {
  console.log(`Command timeout: ${command}`);
  
  // Send interrupt signal
  ptyProcess.write('\x03'); // Ctrl+C
  
  // Notify client
  sendToClient({
    type: 'timeout',
    command,
    message: 'Command execution timed out'
  });
  
  // Clean up
  commandTimeouts.delete(commandId);
};
```

### Phase 2: Process Health Monitoring (High Priority)
**Implementation needed**:
```typescript
class ProcessHealthMonitor {
  private lastActivity = Date.now();
  private healthCheckInterval: NodeJS.Timeout;
  
  startMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 2000); // Check every 2 seconds
  }
  
  performHealthCheck() {
    const timeSinceActivity = Date.now() - this.lastActivity;
    
    if (timeSinceActivity > 5000) { // 5 second threshold
      this.handleUnresponsiveProcess();
    }
  }
  
  recordActivity() {
    this.lastActivity = Date.now();
  }
  
  handleUnresponsiveProcess() {
    // Attempt recovery
    ptyProcess.write('\x03'); // Interrupt
    
    setTimeout(() => {
      if (Date.now() - this.lastActivity > 10000) {
        // Force kill if still unresponsive
        ptyProcess.kill('SIGTERM');
      }
    }, 3000);
  }
}
```

### Phase 3: WebSocket Message Acknowledgment (Medium Priority)
**Implementation needed**:
```typescript
interface PendingMessage {
  id: string;
  message: any;
  timestamp: number;
  timeout: NodeJS.Timeout;
}

const pendingMessages = new Map<string, PendingMessage>();

const sendMessageWithAck = (message: any, timeoutMs: number = 3000) => {
  const messageId = generateId();
  message.id = messageId;
  
  const timeout = setTimeout(() => {
    handleMessageTimeout(messageId);
  }, timeoutMs);
  
  pendingMessages.set(messageId, {
    id: messageId,
    message,
    timestamp: Date.now(),
    timeout
  });
  
  websocket.send(JSON.stringify(message));
};

const handleMessageAck = (messageId: string) => {
  const pending = pendingMessages.get(messageId);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingMessages.delete(messageId);
  }
};
```

### Phase 4: Command Flow Control (Medium Priority)
**Implementation needed**:
```typescript
class CommandFlowController {
  private isExecuting = false;
  private commandQueue: Array<{command: string, priority: number}> = [];
  
  async executeCommand(command: string, priority: number = 1): Promise<void> {
    if (this.isExecuting) {
      // Queue the command
      this.commandQueue.push({ command, priority });
      this.commandQueue.sort((a, b) => b.priority - a.priority);
      return;
    }
    
    this.isExecuting = true;
    
    try {
      await this.processCommand(command);
    } finally {
      this.isExecuting = false;
      this.processQueue();
    }
  }
  
  private async processCommand(command: string): Promise<void> {
    // Check for problematic commands
    if (this.isProblematicCommand(command)) {
      await this.executeWithExtraMonitoring(command);
    } else {
      await this.executeNormally(command);
    }
  }
  
  private isProblematicCommand(command: string): boolean {
    return command.includes('claude') || 
           command.match(/cd\s+\w+\s*&&\s*claude/);
  }
}
```

### Phase 5: Error Recovery (Medium Priority)  
**Implementation needed**:
```typescript
class ErrorRecoveryManager {
  async recoverFromHang(sessionId: string): Promise<boolean> {
    const session = getSession(sessionId);
    if (!session) return false;
    
    // Step 1: Try interrupt
    session.ptyProcess.write('\x03');
    await this.waitForResponse(2000);
    
    if (this.isResponsive(session)) {
      return true;
    }
    
    // Step 2: Try SIGTERM
    session.ptyProcess.kill('SIGTERM');
    await this.waitForResponse(3000);
    
    if (this.isResponsive(session)) {
      return true;
    }
    
    // Step 3: Force kill and restart
    session.ptyProcess.kill('SIGKILL');
    await this.restartSession(sessionId);
    
    return true;
  }
}
```

## 🧪 Test-Driven Implementation Process

### Step 1: Choose One Failing Test
Start with the simplest failing test:
```bash
cd /workspaces/agent-feed/tests/unit/terminal-hang-tdd
npm test -- --testNamePattern="should respond to commands within 5 seconds"
```

### Step 2: Implement Minimal Fix
Add just enough code to make that specific test pass:
```typescript
// In TerminalWebSocket.ts - minimal timeout implementation
socket.on('terminal:command', (command: string) => {
  const timeout = setTimeout(() => {
    // Minimal timeout handling
    socket.emit('terminal:timeout', { command });
  }, 5000);
  
  session.pty.write(command);
});
```

### Step 3: Verify Test Passes
```bash
npm test -- --testNamePattern="should respond to commands within 5 seconds"
```

### Step 4: Run All Tests
```bash
npm test
```

### Step 5: Refactor and Improve
Once the test passes, improve the implementation while keeping tests green.

### Step 6: Move to Next Failing Test
Repeat the process for each failing test.

## 📁 Files That Need Modification

### Backend Files
1. **`/workspaces/agent-feed/src/websocket/TerminalWebSocket.ts`**
   - Add timeout detection
   - Implement health monitoring
   - Add message acknowledgments

2. **`/workspaces/agent-feed/backend-terminal-server-emergency-fix.js`**
   - Add command timeout handling
   - Implement recovery mechanisms
   - Improve error handling

3. **`/workspaces/agent-feed/src/services/terminal-streaming.ts`**
   - Add process monitoring
   - Implement flow control
   - Add error recovery

### Frontend Files
1. **`/workspaces/agent-feed/frontend/src/components/TerminalFixed.tsx`**
   - Add timeout detection
   - Implement reconnection logic
   - Handle timeout responses

2. **`/workspaces/agent-feed/frontend/src/services/terminal-websocket.ts`**
   - Add message acknowledgments
   - Implement retry mechanisms
   - Add connection health monitoring

## 🎯 Success Criteria

After implementing fixes, these tests should transform:
- ❌ **30 failing tests** → ✅ **30 passing tests**
- ❌ **Hanging behavior** → ✅ **Responsive terminal**
- ❌ **Unrecoverable state** → ✅ **Automatic recovery**

## 📊 Monitoring Implementation Progress

### Run Tests After Each Change
```bash
npm run validate-hangs
```

### Track Progress
- Phase 1 complete: 6 tests should pass (timeout detection)
- Phase 2 complete: 12 tests should pass (+ health monitoring)  
- Phase 3 complete: 18 tests should pass (+ message acks)
- Phase 4 complete: 24 tests should pass (+ flow control)
- Phase 5 complete: 30 tests should pass (+ error recovery)

## 🚀 Final Validation

Once all tests pass:

1. **Integration Testing**
   ```bash
   cd /workspaces/agent-feed/frontend
   npm run dev
   # Test actual terminal with "cd prod && claude --help"
   ```

2. **Production Validation**  
   - Test with real terminal sessions
   - Verify no hanging occurs
   - Confirm recovery mechanisms work

3. **Performance Testing**
   - Ensure fixes don't impact normal operation
   - Verify timeout values are appropriate
   - Test under high load

The London School TDD approach ensures that every fix is driven by a failing test, resulting in robust and well-tested terminal hang prevention.