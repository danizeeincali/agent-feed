/**
 * Jest Setup for TDD London School Claude Process Spawning Tests
 * 
 * Configures:
 * - Global mocks for child_process and node-pty
 * - Test environment variables
 * - Custom matchers for process verification
 * - Mock implementations that enforce contracts
 */

const { jest } = require('@jest/globals');

// === GLOBAL TEST ENVIRONMENT SETUP ===
process.env.NODE_ENV = 'test';
process.env.CLAUDE_TEST_MODE = 'true';
process.env.TEST_TIMEOUT = '10000';

// === CONSOLE OUTPUT CONTROL ===
// Reduce noise during tests while keeping error visibility
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  // Only show logs if they contain test-relevant information
  const message = args.join(' ');
  if (message.includes('VERIFY') || message.includes('CONTRACT') || message.includes('CRITICAL')) {
    originalConsoleLog(...args);
  }
};

console.error = (...args) => {
  // Always show errors
  originalConsoleError(...args);
};

// === MOCK PROCESS FACTORY ===
global.createMockChildProcess = (overrides = {}) => {
  return {
    pid: 12345,
    stdin: {
      write: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn(),
      writable: true
    },
    stdout: {
      on: jest.fn(),
      pipe: jest.fn(),
      readable: true,
      read: jest.fn()
    },
    stderr: {
      on: jest.fn(),
      readable: true,
      read: jest.fn()
    },
    on: jest.fn(),
    kill: jest.fn(),
    killed: false,
    connected: true,
    exitCode: null,
    signalCode: null,
    ...overrides
  };
};

global.createMockPtyProcess = (overrides = {}) => {
  return {
    pid: 54321,
    write: jest.fn(),
    onData: jest.fn(),
    onExit: jest.fn(),
    resize: jest.fn(),
    kill: jest.fn(),
    cols: 120,
    rows: 30,
    destroyed: false,
    ...overrides
  };
};

// === CONTRACT VERIFICATION HELPERS ===
global.verifySpawnContract = (mockSpawn, expectedCommand, expectedArgs, expectedOptions) => {
  expect(mockSpawn).toHaveBeenCalledWith(expectedCommand, expectedArgs, expect.objectContaining(expectedOptions));
  
  // CRITICAL CONTRACT: Verify --print flag is NOT present
  const [actualCommand, actualArgs] = mockSpawn.mock.calls[0];
  expect(actualArgs).not.toContain('--print');
  expect(actualCommand).toBe(expectedCommand);
};

global.verifyInteractiveContract = (processInfo) => {
  expect(processInfo).toEqual(expect.objectContaining({
    instanceId: expect.any(String),
    pid: expect.any(Number),
    command: 'claude',
    args: expect.any(Array),
    startTime: expect.any(Date),
    status: expect.any(String)
  }));
  
  // CRITICAL: Verify no --print in args
  expect(processInfo.args).not.toContain('--print');
};

// === MOCK STATE MANAGEMENT ===
global.mockState = {
  processes: new Map(),
  connections: new Map(),
  reset() {
    this.processes.clear();
    this.connections.clear();
  }
};

// === ASYNC HELPERS FOR PROCESS TESTING ===
global.waitForProcessEvent = (mockProcess, eventName, timeout = 1000) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Process event '${eventName}' not received within ${timeout}ms`));
    }, timeout);
    
    // Check if event handler was registered
    const eventCall = mockProcess.on.mock.calls.find(call => call[0] === eventName);
    if (eventCall) {
      clearTimeout(timeoutId);
      resolve(eventCall[1]); // Return the handler function
    } else {
      clearTimeout(timeoutId);
      reject(new Error(`Event handler for '${eventName}' not registered`));
    }
  });
};

global.simulateProcessOutput = (mockProcess, outputData, isError = false) => {
  const stream = isError ? 'stderr' : 'stdout';
  const dataCall = mockProcess[stream].on.mock.calls.find(call => call[0] === 'data');
  if (dataCall) {
    dataCall[1](Buffer.from(outputData));
  }
};

global.simulateProcessExit = (mockProcess, exitCode = 0, signal = null) => {
  const exitCall = mockProcess.on.mock.calls.find(call => call[0] === 'exit');
  if (exitCall) {
    exitCall[1](exitCode, signal);
  }
};

// === PTY-SPECIFIC HELPERS ===
global.simulatePtyData = (mockPtyProcess, data) => {
  const dataCall = mockPtyProcess.onData.mock.calls[0];
  if (dataCall) {
    dataCall[0](data); // PTY data callback
  }
};

global.simulatePtyExit = (mockPtyProcess, exitCode = 0, signal = null) => {
  const exitCall = mockPtyProcess.onExit.mock.calls[0];
  if (exitCall) {
    exitCall[0]({ exitCode, signal });
  }
};

// === TEST UTILITIES ===
global.createTestButtonConfig = (type = 'prod', options = {}) => {
  const configs = {
    prod: {
      type: 'prod',
      name: '🚀 prod/claude',
      usePty: false,
      ...options
    },
    'skip-permissions': {
      type: 'skip-permissions',
      name: '⚡ skip-permissions',
      usePty: false,
      ...options
    },
    'skip-permissions-c': {
      type: 'skip-permissions-c',
      name: '💬 skip-permissions -c',
      usePty: false,
      ...options
    },
    'skip-permissions-resume': {
      type: 'skip-permissions-resume',
      name: '🔄 skip-permissions --resume',
      usePty: false,
      ...options
    }
  };
  
  return configs[type] || configs.prod;
};

// === CLEANUP HELPERS ===
global.cleanupMockState = () => {
  global.mockState.reset();
  jest.clearAllMocks();
};

// === BEFOREEACH/AFTEREACH DEFAULTS ===
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  global.mockState.reset();
});

afterEach(() => {
  // Restore mocks after each test
  jest.restoreAllMocks();
});

// === GLOBAL TEST TIMEOUT ===
jest.setTimeout(10000);

// === CUSTOM JEST MATCHERS ===
expect.extend({
  toHaveSpawnedWithoutPrintFlag(mockSpawn, command, args) {
    const pass = mockSpawn.mock.calls.some(call => {
      const [actualCommand, actualArgs] = call;
      return actualCommand === command && 
             JSON.stringify(actualArgs) === JSON.stringify(args) &&
             !actualArgs.includes('--print');
    });
    
    if (pass) {
      return {
        message: () => `Expected ${command} NOT to be spawned without --print flag`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${command} to be spawned with args ${JSON.stringify(args)} and WITHOUT --print flag`,
        pass: false
      };
    }
  },
  
  toBeInteractiveProcess(processInfo) {
    const hasRequiredFields = processInfo &&
      typeof processInfo.instanceId === 'string' &&
      typeof processInfo.pid === 'number' &&
      processInfo.command === 'claude' &&
      Array.isArray(processInfo.args) &&
      !processInfo.args.includes('--print');
    
    if (hasRequiredFields) {
      return {
        message: () => `Expected process NOT to be interactive`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected process to be interactive (have instanceId, pid, claude command, args without --print)`,
        pass: false
      };
    }
  }
});

// === EXPORT FOR USE IN TESTS ===
module.exports = {
  createMockChildProcess: global.createMockChildProcess,
  createMockPtyProcess: global.createMockPtyProcess,
  verifySpawnContract: global.verifySpawnContract,
  verifyInteractiveContract: global.verifyInteractiveContract,
  createTestButtonConfig: global.createTestButtonConfig
};