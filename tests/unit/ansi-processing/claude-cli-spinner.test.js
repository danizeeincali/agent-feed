/**
 * TDD London School Tests for Claude CLI Spinner Behavior
 * Tests specific to Claude CLI spinner animations and prompt interactions
 */

describe('Claude CLI Spinner Animation - London School TDD', () => {
  let mockTerminalSession;
  let mockWebSocket;

  beforeEach(() => {
    // Mock WebSocket collaborator
    mockWebSocket = {
      readyState: 1,
      send: jest.fn(),
      on: jest.fn(),
      close: jest.fn()
    };

    // Create mock TerminalSession with real processAnsiSequences method
    mockTerminalSession = {
      ws: mockWebSocket,
      processAnsiSequences: require('../../../backend-terminal-server-emergency-fix').TerminalSession.prototype.processAnsiSequences,
      sendMessage: jest.fn(),
      sendData: function(data) {
        if (this.ws.readyState === 1) {
          const processedData = this.processAnsiSequences(data);
          this.sendMessage({
            type: 'data',
            data: processedData,
            timestamp: Date.now()
          });
        }
      }
    };
  });

  describe('Claude CLI Loading Spinner Patterns', () => {
    it('should handle Claude CLI thinking spinner without cascading', () => {
      // Simulate Claude CLI's thinking spinner pattern
      const spinnerSequence = [
        '⠋ Thinking...',
        '\r⠙ Thinking...',
        '\r⠹ Thinking...',
        '\r⠸ Thinking...',
        '\r⠼ Thinking...',
        '\r⠴ Thinking...',
        '\r⠦ Thinking...',
        '\r⠧ Thinking...',
        '\r⠇ Thinking...',
        '\r⠏ Thinking...'
      ];

      spinnerSequence.forEach((frame, index) => {
        mockTerminalSession.sendData(frame);
        
        // Verify each frame preserves carriage return for proper overwriting
        const sentCall = mockTerminalSession.sendMessage.mock.calls[index];
        expect(sentCall).toBeDefined();
        
        const sentData = sentCall[0].data;
        if (index > 0) {
          expect(sentData).toContain('\r');
          expect(sentData).not.toContain('\x1b[1G');
        }
      });
    });

    it('should handle Claude CLI streaming response with cursor positioning', () => {
      // Simulate Claude's streaming response pattern
      const streamingSequence = [
        'Claude: ',
        'I can help',
        ' with that.',
        '\r\x1b[K> What would you like to do next?'
      ];

      streamingSequence.forEach(chunk => {
        mockTerminalSession.sendData(chunk);
      });

      // Verify the final prompt clears and positions correctly
      const finalCall = mockTerminalSession.sendMessage.mock.calls[3];
      expect(finalCall[0].data).toContain('\r\x1b[K');
      expect(finalCall[0].data).not.toContain('\x1b[1G');
    });

    it('should preserve Claude CLI progress indicators', () => {
      // Test Claude's file processing progress
      const progressSequence = [
        'Processing files... 0%',
        '\rProcessing files... 25%',
        '\rProcessing files... 50%',
        '\rProcessing files... 75%',
        '\rProcessing files... 100%',
        '\r\x1b[KComplete!'
      ];

      progressSequence.forEach((update, index) => {
        mockTerminalSession.sendData(update);
        
        const sentData = mockTerminalSession.sendMessage.mock.calls[index][0].data;
        
        if (index > 0 && index < 5) {
          // Progress updates should preserve \r
          expect(sentData).toContain('\r');
          expect(sentData).not.toContain('\x1b[1G');
        }
        
        if (index === 5) {
          // Final clear should preserve \r\x1b[K pattern
          expect(sentData).toContain('\r\x1b[K');
        }
      });
    });
  });

  describe('Complex Claude CLI Interaction Patterns', () => {
    it('should handle multi-line output with carriage returns', () => {
      const complexOutput = `Analyzing codebase...
⠋ Processing files\r⠙ Processing files\r⠹ Processing files
\r\x1b[KFound 15 issues
> Ready for next command`;

      mockTerminalSession.sendData(complexOutput);

      const sentData = mockTerminalSession.sendMessage.mock.calls[0][0].data;
      
      // Should preserve all carriage returns
      expect(sentData.match(/\r/g)).toHaveLength(4);
      expect(sentData).not.toContain('\x1b[1G');
      expect(sentData).toContain('\r\x1b[K');
    });

    it('should handle Claude CLI error messages with proper formatting', () => {
      const errorPattern = `\rError: Command failed
\r\x1b[31mDetails: Invalid syntax\x1b[0m
\r\x1b[K> Please try again`;

      mockTerminalSession.sendData(errorPattern);

      const sentData = mockTerminalSession.sendMessage.mock.calls[0][0].data;
      
      // Error formatting should be preserved
      expect(sentData).toContain('\r\x1b[31m'); // Red error color
      expect(sentData).toContain('\x1b[0m');    // Reset color
      expect(sentData).toContain('\r\x1b[K');   // Clear and prompt
      expect(sentData).not.toContain('\x1b[1G');
    });

    it('should handle rapid spinner updates without accumulation', () => {
      // Simulate rapid spinner updates as would occur in real Claude CLI usage
      const rapidUpdates = Array.from({length: 50}, (_, i) => {
        const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        const spinner = spinners[i % spinners.length];
        return i === 0 ? `${spinner} Working...` : `\r${spinner} Working...`;
      });

      rapidUpdates.forEach(update => {
        mockTerminalSession.sendData(update);
      });

      // Verify no accumulation - each update should overwrite the previous
      rapidUpdates.slice(1).forEach((_, index) => {
        const sentData = mockTerminalSession.sendMessage.mock.calls[index + 1][0].data;
        expect(sentData).toMatch(/^\r�[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] Working\.\.\.$/);
        expect(sentData).not.toContain('\x1b[1G');
      });
    });
  });

  describe('Contract Verification - London School', () => {
    it('should maintain contract with frontend terminal renderer', () => {
      // Contract: processed data must preserve terminal semantics
      const testInput = 'Loading\r\x1b[KDone';
      
      mockTerminalSession.sendData(testInput);
      
      // Verify contract: data type, structure, and content preservation
      const sentMessage = mockTerminalSession.sendMessage.mock.calls[0][0];
      expect(sentMessage).toMatchObject({
        type: 'data',
        data: expect.stringContaining('\r\x1b[K'),
        timestamp: expect.any(Number)
      });
      
      // Contract: no cursor positioning escape sequences
      expect(sentMessage.data).not.toContain('\x1b[1G');
    });

    it('should verify interaction with WebSocket sender', () => {
      const spinnerData = '⠋ Loading\r⠙ Loading';
      
      mockTerminalSession.sendData(spinnerData);
      
      // London School: verify the conversation
      expect(mockTerminalSession.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockTerminalSession.sendMessage).toHaveBeenCalledWith({
        type: 'data',
        data: expect.stringContaining('\r'),
        timestamp: expect.any(Number)
      });
    });
  });
});