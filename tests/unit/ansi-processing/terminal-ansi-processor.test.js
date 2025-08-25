/**
 * TDD London School Tests for ANSI Processing
 * Mock-driven tests for carriage return regression fix
 */

const { TerminalSession } = require('../../../backend-terminal-server-emergency-fix');

describe('TerminalSession ANSI Processing - London School TDD', () => {
  let mockWebSocket;
  let mockPty;
  let terminalSession;

  beforeEach(() => {
    // London School: Mock all collaborators
    mockWebSocket = {
      readyState: 1, // WebSocket.OPEN
      send: jest.fn(),
      on: jest.fn(),
      close: jest.fn()
    };

    mockPty = {
      spawn: jest.fn(() => ({
        pid: 12345,
        write: jest.fn(),
        on: jest.fn(),
        resize: jest.fn(),
        kill: jest.fn(),
        killed: false
      })),
      kill: jest.fn()
    };

    // Mock require calls
    jest.doMock('node-pty', () => mockPty);
    
    terminalSession = new TerminalSession('test-terminal', mockWebSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('processAnsiSequences - Carriage Return Behavior', () => {
    it('should preserve standalone carriage return for line overwriting', () => {
      // London School: Focus on behavior verification through interaction
      const inputData = 'Loading...\rDone!';
      
      const result = terminalSession.processAnsiSequences(inputData);
      
      // Verify carriage return is preserved, not converted to cursor positioning
      expect(result).toBe('Loading...\rDone!');
      expect(result).not.toContain('\x1b[1G'); // Should not convert \r to cursor positioning
    });

    it('should handle carriage return with line clear sequence properly', () => {
      const inputData = 'Processing\r\x1b[K'; // Common spinner pattern
      
      const result = terminalSession.processAnsiSequences(inputData);
      
      // Should clear line and return to start, allowing proper overwriting
      expect(result).toBe('Processing\r\x1b[K');
      expect(result).toContain('\r'); // Preserve carriage return
      expect(result).toContain('\x1b[K'); // Preserve line clear
    });

    it('should preserve carriage return without newline for spinner animations', () => {
      const spinnerFrames = [
        'Working |',
        'Working /',
        'Working -',
        'Working \\'
      ];
      
      spinnerFrames.forEach((frame, index) => {
        const inputData = index === 0 ? frame : `\r${frame}`;
        
        const result = terminalSession.processAnsiSequences(inputData);
        
        if (index > 0) {
          expect(result).toContain('\r');
          expect(result).not.toContain('\x1b[1G');
        }
      });
    });
  });

  describe('processAnsiSequences - Complex ANSI Sequences', () => {
    it('should handle multiple carriage returns in sequence', () => {
      const inputData = 'Step 1\rStep 2\rStep 3';
      
      const result = terminalSession.processAnsiSequences(inputData);
      
      expect(result).toBe('Step 1\rStep 2\rStep 3');
      expect(result.match(/\r/g)).toHaveLength(2);
      expect(result).not.toContain('\x1b[1G');
    });

    it('should preserve carriage return with clear to end of line', () => {
      const inputData = 'Progress: 50%\r\x1b[0KProgress: 100%';
      
      const result = terminalSession.processAnsiSequences(inputData);
      
      expect(result).toContain('\r\x1b[0K');
      expect(result).not.toContain('\x1b[1G');
    });

    it('should handle complex spinner with progress updates', () => {
      const inputData = 'Downloading... |\rDownloading... /\rDownloading... -\rDownloading... \\';
      
      const result = terminalSession.processAnsiSequences(inputData);
      
      expect(result.match(/\r/g)).toHaveLength(3);
      expect(result).not.toContain('\x1b[1G');
    });
  });

  describe('processAnsiSequences - Edge Cases', () => {
    it('should preserve carriage return followed by newline', () => {
      const inputData = 'Line 1\r\nLine 2';
      
      const result = terminalSession.processAnsiSequences(inputData);
      
      expect(result).toBe('Line 1\r\nLine 2');
      expect(result).toContain('\r\n');
    });

    it('should handle empty data gracefully', () => {
      const result = terminalSession.processAnsiSequences('');
      
      expect(result).toBe('');
    });

    it('should handle data with only carriage returns', () => {
      const inputData = '\r\r\r';
      
      const result = terminalSession.processAnsiSequences(inputData);
      
      expect(result).toBe('\r\r\r');
      expect(result).not.toContain('\x1b[1G');
    });
  });

  describe('sendData Integration - London School Interaction Testing', () => {
    it('should process ANSI sequences before sending data', () => {
      const testData = 'Loading\rComplete';
      
      terminalSession.sendData(testData);
      
      // Verify the interaction: processAnsiSequences was called and WebSocket.send was invoked
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'data',
          data: 'Loading\rComplete', // Processed data should preserve \r
          timestamp: expect.any(Number)
        })
      );
    });

    it('should coordinate between ANSI processor and WebSocket sender', () => {
      const spinnerData = 'Working |\rWorking /';
      
      terminalSession.sendData(spinnerData);
      
      // London School: Verify the conversation between collaborators
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
      
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('data');
      expect(sentMessage.data).toContain('\r');
      expect(sentMessage.data).not.toContain('\x1b[1G');
    });
  });

  describe('Mock Contracts - London School Contract Definition', () => {
    it('should define clear contract with WebSocket collaborator', () => {
      // Contract: TerminalSession should call WebSocket.send with specific message format
      const mockData = 'test\rdata';
      
      terminalSession.sendData(mockData);
      
      // Verify contract fulfillment
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringMatching(/^\{"type":"data","data":".*","timestamp":\d+\}$/)
      );
    });

    it('should respect WebSocket readyState before sending', () => {
      mockWebSocket.readyState = 0; // WebSocket.CONNECTING
      
      terminalSession.sendData('test\rdata');
      
      // Contract: Should not send when WebSocket is not OPEN
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });
});