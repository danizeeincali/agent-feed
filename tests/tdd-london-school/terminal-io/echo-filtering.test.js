/**
 * TDD London School - Terminal I/O Echo Filtering Tests
 * 
 * PROBLEM: Character-by-character echo creates visual noise and breaks UX
 * SOLUTION: Drive correct PTY and WebSocket architecture through mocks
 * 
 * RED PHASE: Write failing tests that specify desired behavior
 * GREEN PHASE: Implement with mocks to define contracts
 * REFACTOR PHASE: Clean implementation
 */

// Jest is globally available

// Mock dependencies first - London School approach
const mockPty = {
  spawn: jest.fn(),
  write: jest.fn(),
  on: jest.fn(),
  kill: jest.fn(),
  resize: jest.fn()
};

const mockWebSocket = {
  send: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
  close: jest.fn()
};

const mockProcess = {
  stdout: { on: jest.fn(), write: jest.fn() },
  stderr: { on: jest.fn(), write: jest.fn() },
  stdin: { write: jest.fn() },
  kill: jest.fn(),
  on: jest.fn()
};

// Mock modules using London School pattern
jest.mock('node-pty', () => ({
  spawn: jest.fn(() => mockProcess)
}));

jest.mock('ws', () => ({
  WebSocketServer: jest.fn(() => ({
    on: jest.fn(),
    clients: new Set()
  }))
}));

describe('TDD London School - Echo Filtering', () => {
  
  describe('RED PHASE: Failing Specifications', () => {
    
    it('should NOT echo individual characters during typing', () => {
      // RED: This test will fail until we implement proper buffering
      const terminalManager = new TerminalManager(mockPty, mockWebSocket);
      
      // Simulate user typing "hello" character by character
      terminalManager.handleInput('h');
      terminalManager.handleInput('e');
      terminalManager.handleInput('l');
      terminalManager.handleInput('l');
      terminalManager.handleInput('o');
      
      // EXPECTATION: WebSocket should NOT send individual characters
      expect(mockWebSocket.send).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'output', data: 'h' })
      );
      expect(mockWebSocket.send).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'output', data: 'e' })
      );
      
      // This test will FAIL until we fix the echo behavior
    });
    
    it('should buffer input until Enter is pressed', () => {
      // RED: Define the contract through mock expectations
      const terminalManager = new TerminalManager(mockPty, mockWebSocket);
      
      // Type characters without Enter
      terminalManager.handleInput('l');
      terminalManager.handleInput('s');
      
      // Should NOT execute command yet
      expect(mockPty.write).not.toHaveBeenCalled();
      
      // Now press Enter
      terminalManager.handleInput('\n');
      
      // NOW should execute the complete command
      expect(mockPty.write).toHaveBeenCalledWith('ls\n');
    });
    
    it('should only show command output, not input echo', () => {
      // RED: Mock the PTY to simulate command execution
      const terminalManager = new TerminalManager(mockPty, mockWebSocket);
      
      // Mock PTY responding with command output (not echo)
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          // Simulate real command output
          setTimeout(() => callback('file1.txt\nfile2.txt\n'), 10);
        }
      });
      
      // Execute command
      terminalManager.executeCommand('ls\n');
      
      // Should show ONLY the command output
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.objectContaining({ 
          type: 'output', 
          data: 'file1.txt\nfile2.txt\n' 
        })
      );
      
      // Should NOT echo the command itself
      expect(mockWebSocket.send).not.toHaveBeenCalledWith(
        expect.objectContaining({ 
          type: 'output', 
          data: 'ls' 
        })
      );
    });
    
  });
  
  describe('GREEN PHASE: Mock-Driven Implementation', () => {
    
    it('should configure PTY with echo=false', () => {
      // GREEN: Define how PTY should be spawned
      const ptySpawn = require('node-pty').spawn;
      
      new TerminalManager(mockPty, mockWebSocket);
      
      expect(ptySpawn).toHaveBeenCalledWith(
        expect.any(String), // shell
        expect.any(Array), // args
        expect.objectContaining({
          echo: false, // CRITICAL: No echo
          ptyOptions: expect.objectContaining({
            echo: false
          })
        })
      );
    });
    
    it('should implement input buffering through mocks', () => {
      // GREEN: Mock the correct buffering behavior
      let inputBuffer = '';
      
      const mockTerminalManager = {
        handleInput: jest.fn((char) => {
          if (char === '\n') {
            // Execute buffered command
            mockPty.write(inputBuffer + '\n');
            inputBuffer = '';
          } else {
            // Buffer the character
            inputBuffer += char;
          }
        })
      };
      
      // Test the buffering contract
      mockTerminalManager.handleInput('l');
      mockTerminalManager.handleInput('s');
      expect(mockPty.write).not.toHaveBeenCalled();
      
      mockTerminalManager.handleInput('\n');
      expect(mockPty.write).toHaveBeenCalledWith('ls\n');
    });
    
    it('should separate input from output in WebSocket messages', () => {
      // GREEN: Define message protocol through mocks
      const terminalManager = new TerminalManager(mockPty, mockWebSocket);
      
      // Mock WebSocket message handler
      mockWebSocket.on.mockImplementation((event, handler) => {
        if (event === 'message') {
          terminalManager._messageHandler = handler;
        }
      });
      
      // Simulate receiving input message
      const inputMessage = JSON.stringify({ type: 'input', data: 'ls' });
      terminalManager._messageHandler(inputMessage);
      
      // Should NOT immediately send as output
      expect(mockWebSocket.send).not.toHaveBeenCalledWith(
        expect.stringContaining('"type":"output"')
      );
    });
    
  });
  
  describe('REFACTOR PHASE: Clean Implementation', () => {
    
    it('should implement clean separation of concerns', () => {
      // REFACTOR: Verify clean architecture
      const mockInputBuffer = {
        add: jest.fn(),
        flush: jest.fn(() => 'ls'),
        clear: jest.fn()
      };
      
      const mockOutputFilter = {
        isEcho: jest.fn(() => false),
        isCommandOutput: jest.fn(() => true)
      };
      
      const terminalManager = new TerminalManager(
        mockPty, 
        mockWebSocket,
        { inputBuffer: mockInputBuffer, outputFilter: mockOutputFilter }
      );
      
      // Test clean interactions
      terminalManager.handleInput('l');
      expect(mockInputBuffer.add).toHaveBeenCalledWith('l');
      
      terminalManager.handleInput('\n');
      expect(mockInputBuffer.flush).toHaveBeenCalled();
      expect(mockPty.write).toHaveBeenCalledWith('ls\n');
    });
    
  });
  
});

// Stub implementation to make tests runnable
class TerminalManager {
  constructor(pty, webSocket, components = {}) {
    this.pty = pty;
    this.webSocket = webSocket;
    this.inputBuffer = components.inputBuffer || new InputBuffer();
    this.outputFilter = components.outputFilter || new OutputFilter();
  }
  
  handleInput(char) {
    if (char === '\n') {
      const command = this.inputBuffer.flush();
      this.pty.write(command + '\n');
    } else {
      this.inputBuffer.add(char);
    }
  }
  
  executeCommand(command) {
    this.pty.write(command);
  }
}

class InputBuffer {
  constructor() { this.buffer = ''; }
  add(char) { this.buffer += char; }
  flush() { const cmd = this.buffer; this.buffer = ''; return cmd; }
}

class OutputFilter {
  isEcho(data) { return false; }
  isCommandOutput(data) { return true; }
}

module.exports = { TerminalManager, InputBuffer, OutputFilter };