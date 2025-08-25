/**
 * TDD London School Validation Tests
 * Integration tests for the fixed terminal server
 */

const { TerminalSession } = require('../../../backend-terminal-server-emergency-fix');

describe('Terminal Server Carriage Return Fix - Integration Validation', () => {
  let mockWebSocket;
  let terminalSession;

  beforeEach(() => {
    // Mock WebSocket for London School testing
    mockWebSocket = {
      readyState: 1, // WebSocket.OPEN
      send: jest.fn(),
      on: jest.fn(),
      close: jest.fn()
    };

    // Mock node-pty to avoid spawning real processes
    jest.doMock('node-pty', () => ({
      spawn: jest.fn(() => ({
        pid: 12345,
        write: jest.fn(),
        on: jest.fn(),
        resize: jest.fn(),
        kill: jest.fn(),
        killed: false
      }))
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Real TerminalSession processAnsiSequences Method', () => {
    it('should use the fixed implementation for carriage returns', () => {
      const session = new TerminalSession('test', mockWebSocket);
      
      // Test the actual fixed method
      const result = session.processAnsiSequences('Loading...\rDone!');
      
      expect(result).toBe('Loading...\rDone!');
      expect(result).toContain('\r');
      expect(result).not.toContain('\x1b[1G');
    });

    it('should handle Claude CLI spinner patterns correctly', () => {
      const session = new TerminalSession('test', mockWebSocket);
      
      const spinnerFrames = [
        '⠋ Thinking...',
        '\r⠙ Thinking...',
        '\r⠹ Thinking...',
        '\r⠸ Thinking...'
      ];

      spinnerFrames.forEach(frame => {
        const result = session.processAnsiSequences(frame);
        
        if (frame.startsWith('\r')) {
          expect(result).toContain('\r');
          expect(result).not.toContain('\x1b[1G');
        }
      });
    });

    it('should preserve complex ANSI sequences with carriage returns', () => {
      const session = new TerminalSession('test', mockWebSocket);
      
      const complexSequences = [
        'Progress: 0%\r\x1b[KProgress: 50%',
        '\r\x1b[2K⠋ Loading files...',
        'Error occurred\r\x1b[31mFailed\x1b[0m'
      ];

      complexSequences.forEach(sequence => {
        const result = session.processAnsiSequences(sequence);
        
        expect(result).toContain('\r');
        expect(result).not.toContain('\x1b[1G');
        
        if (sequence.includes('\x1b[K')) {
          expect(result).toContain('\x1b[K');
        }
      });
    });
  });

  describe('Terminal Data Flow Validation', () => {
    it('should process and send data with preserved carriage returns', () => {
      const session = new TerminalSession('test', mockWebSocket);
      
      const testData = 'Working |\rWorking /\rWorking -';
      session.sendData(testData);
      
      // Verify WebSocket.send was called with processed data
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"data":"Working |\\rWorking /\\rWorking -"')
      );
    });

    it('should handle rapid spinner updates without corruption', () => {
      const session = new TerminalSession('test', mockWebSocket);
      
      // Simulate rapid Claude CLI spinner updates
      for (let i = 0; i < 10; i++) {
        const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        const frame = i === 0 ? `${spinners[i]} Processing...` : `\r${spinners[i]} Processing...`;
        
        session.sendData(frame);
      }

      // Verify all calls preserved carriage returns
      const calls = mockWebSocket.send.mock.calls;
      calls.slice(1).forEach((call, index) => {
        const messageData = JSON.parse(call[0]).data;
        expect(messageData).toContain('\r');
        expect(messageData).not.toContain('\x1b[1G');
      });
    });
  });

  describe('Contract Verification - London School', () => {
    it('should maintain proper contracts with all collaborators', () => {
      const session = new TerminalSession('test', mockWebSocket);
      
      // Contract with WebSocket: proper message format
      session.sendData('test\rdata');
      
      const sentMessage = mockWebSocket.send.mock.calls[0][0];
      const parsedMessage = JSON.parse(sentMessage);
      
      expect(parsedMessage).toMatchObject({
        type: 'data',
        data: expect.stringContaining('\r'),
        timestamp: expect.any(Number)
      });
      
      // Contract: no cursor positioning in processed data
      expect(parsedMessage.data).not.toContain('\x1b[1G');
    });

    it('should respect WebSocket state before sending', () => {
      mockWebSocket.readyState = 0; // Not open
      
      const session = new TerminalSession('test', mockWebSocket);
      session.sendData('test\rdata');
      
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed ANSI sequences gracefully', () => {
      const session = new TerminalSession('test', mockWebSocket);
      
      const malformedSequences = [
        'test\r\x1b[',
        '\r\x1b\x1b[K',
        'data\r\r\r\x1b[K'
      ];

      malformedSequences.forEach(sequence => {
        expect(() => {
          const result = session.processAnsiSequences(sequence);
          expect(result).toContain('\r'); // Should still preserve carriage returns
        }).not.toThrow();
      });
    });

    it('should handle empty and null data', () => {
      const session = new TerminalSession('test', mockWebSocket);
      
      expect(session.processAnsiSequences('')).toBe('');
      expect(session.processAnsiSequences('\r')).toBe('\r');
    });
  });
});