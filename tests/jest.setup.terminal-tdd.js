// Jest setup for Terminal TDD tests

// Mock socket.io completely
jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    of: jest.fn().mockReturnValue({
      use: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
      sockets: new Map()
    })
  }))
}));

// Mock node-pty
jest.mock('node-pty', () => ({
  spawn: jest.fn().mockReturnValue({
    write: jest.fn(),
    resize: jest.fn(),
    kill: jest.fn(),
    on: jest.fn(),
    pid: 12345
  })
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock database
jest.mock('../src/database/connection', () => ({
  db: {
    query: jest.fn(),
    end: jest.fn()
  }
}));

// Mock claude instance manager
jest.mock('../src/services/claude-instance-manager', () => ({
  claudeInstanceManager: {
    getInstanceStatus: jest.fn(),
    getTerminalSession: jest.fn(),
    addTerminalClient: jest.fn(),
    removeTerminalClient: jest.fn(),
    getTerminalHistory: jest.fn(),
    writeToTerminal: jest.fn(),
    resizeTerminal: jest.fn(),
    listInstances: jest.fn(),
    on: jest.fn(),
    emit: jest.fn()
  }
}));

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
});

console.log('🧪 Terminal TDD Test Setup Complete');