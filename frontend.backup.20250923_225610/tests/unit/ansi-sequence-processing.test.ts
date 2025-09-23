/**
 * TDD London School Unit Tests for ANSI Sequence Processing
 * Testing the processAnsiSequences method behavior verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the TerminalSession class for testing
class MockTerminalSession {
  processAnsiSequences(data) {
    // Current implementation from backend-terminal-server-emergency-fix.js
    return data
      // FIXED: Preserve carriage returns - they're essential for line overwriting
      // Only modify problematic sequences, not basic carriage returns
      .replace(/\r\x1b\[2K/g, '\r\x1b[2K')    // \r + clear entire line - preserve both
      .replace(/\r\x1b\[K/g, '\r\x1b[K')      // \r + clear line - preserve both
      .replace(/\r\x1b\[0K/g, '\r\x1b[0K')    // \r + clear to end - preserve both
      // CRITICAL: DO NOT TOUCH standalone \r - it's essential for spinner animations!
      
      // Handle cursor positioning (prevents duplicate lines)
      .replace(/\x1b\[\d*A/g, '')              // Remove cursor up sequences
      .replace(/\x1b\[\d*B/g, '')              // Remove cursor down sequences
      
      // Handle line clearing (ensures proper overwriting)
      .replace(/\x1b\[0K/g, '\x1b[0K')         // Clear to end of line
      .replace(/\x1b\[1K/g, '\x1b[1K')         // Clear to start of line
      .replace(/\x1b\[2K/g, '\x1b[2K')         // Clear entire line
      
      // Remove problematic sequences
      .replace(/\x1b\[\?25[lh]/g, '')          // Remove cursor show/hide
      .replace(/\x1b\[\?1049[lh]/g, '')        // Remove alternate screen buffer
      .replace(/\x1b\[\?2004[lh]/g, '');       // Remove bracketed paste mode
  }
}

describe('ANSI Sequence Processing - London School TDD', () => {
  let terminalSession;

  beforeEach(() => {
    terminalSession = new MockTerminalSession();
  });

  describe('Basic Terminal Control Characters', () => {
    it('should preserve newline characters as actual line breaks', () => {
      const input = 'line1\nline2\nline3';
      const result = terminalSession.processAnsiSequences(input);
      
      // Verify newlines are preserved as actual characters, not literal '\n'
      expect(result).toBe('line1\nline2\nline3');
      expect(result.split('\n')).toHaveLength(3);
      expect(result.includes('\\n')).toBe(false); // Should not contain literal '\n'
    });

    it('should preserve carriage return characters for line overwriting', () => {
      const input = 'progress: 50%\rprogress: 100%';
      const result = terminalSession.processAnsiSequences(input);
      
      expect(result).toBe('progress: 50%\rprogress: 100%');
      expect(result.includes('\r')).toBe(true);
    });

    it('should handle complex command output with newlines and carriage returns', () => {
      const claudeCommand = '@danizeeincali ➜ /workspaces/agent-feed (v1) $ cd prod && claude\n';
      const result = terminalSession.processAnsiSequences(claudeCommand);
      
      // CRITICAL: This should NOT contain literal '\n' - it should be a real newline
      expect(result).not.toContain('\\n');
      expect(result).toContain('\n'); // Should contain actual newline character
      expect(result.endsWith('\n')).toBe(true);
    });
  });

  describe('ANSI Escape Sequence Handling', () => {
    it('should preserve carriage return with line clearing sequences', () => {
      const spinnerUpdate = '\r\x1b[2KProcessing... [/]';
      const result = terminalSession.processAnsiSequences(spinnerUpdate);
      
      expect(result).toBe('\r\x1b[2KProcessing... [/]');
      expect(result.startsWith('\r')).toBe(true);
    });

    it('should remove cursor movement sequences to prevent duplicates', () => {
      const withCursorUp = 'line1\n\x1b[1Aline2';
      const result = terminalSession.processAnsiSequences(withCursorUp);
      
      expect(result).toBe('line1\nline2');
      expect(result).not.toMatch(/\x1b\[\d*A/);
    });

    it('should remove cursor visibility control sequences', () => {
      const withCursorControl = '\x1b[?25lHidden cursor\x1b[?25hVisible cursor';
      const result = terminalSession.processAnsiSequences(withCursorControl);
      
      expect(result).toBe('Hidden cursorVisible cursor');
      expect(result).not.toMatch(/\x1b\[\?25[lh]/);
    });
  });

  describe('Terminal Progress Indicators', () => {
    it('should handle spinner animations with carriage returns', () => {
      const spinnerFrames = [
        'Loading... [|]',
        '\rLoading... [/]',
        '\rLoading... [-]',
        '\rLoading... [\\]'
      ];
      
      spinnerFrames.forEach(frame => {
        const result = terminalSession.processAnsiSequences(frame);
        expect(result).toBe(frame); // Should preserve spinner format
      });
    });

    it('should handle progress bars with overwriting', () => {
      const progressSequence = 'Progress: [████░░░░░░] 40%\rProgress: [██████░░░░] 60%';
      const result = terminalSession.processAnsiSequences(progressSequence);
      
      expect(result).toBe(progressSequence);
      expect(result.includes('\r')).toBe(true);
    });
  });

  describe('Command Line Interface Behavior', () => {
    it('should properly handle shell prompt with newlines', () => {
      const shellPrompt = 'user@machine:~/path $ command\noutput line 1\noutput line 2\n';
      const result = terminalSession.processAnsiSequences(shellPrompt);
      
      expect(result).toBe(shellPrompt);
      expect(result.split('\n')).toHaveLength(4); // 3 lines + empty at end
      expect(result).not.toContain('\\n'); // No literal backslash-n
    });

    it('should handle mixed control sequences correctly', () => {
      const complexOutput = 'Starting process...\n\r\x1b[2KProgress: 50%\rProgress: 100%\n\x1b[32mComplete!\x1b[0m\n';
      const result = terminalSession.processAnsiSequences(complexOutput);
      
      // Should preserve structure but clean problematic sequences
      expect(result).toContain('\n');
      expect(result).toContain('\r\x1b[2K');
      expect(result).not.toContain('\\n'); // No literal newlines
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle empty strings', () => {
      const result = terminalSession.processAnsiSequences('');
      expect(result).toBe('');
    });

    it('should handle strings with only control characters', () => {
      const onlyControl = '\n\r\x1b[2K\x1b[1A';
      const result = terminalSession.processAnsiSequences(onlyControl);
      
      expect(result).toBe('\n\r\x1b[2K'); // Cursor up should be removed
    });

    it('should handle malformed ANSI sequences gracefully', () => {
      const malformed = 'text\x1b[invalid\nmore text';
      const result = terminalSession.processAnsiSequences(malformed);
      
      expect(result).toContain('text');
      expect(result).toContain('more text');
      expect(result).toContain('\n');
    });
  });

  describe('Mock Collaboration Verification', () => {
    it('should verify WebSocket would receive properly formatted data', () => {
      const mockWebSocket = {
        readyState: 1, // OPEN
        send: vi.fn()
      };
      
      const mockData = 'command output\nwith newlines\n';
      const processed = terminalSession.processAnsiSequences(mockData);
      
      // Verify the processed data maintains proper structure
      expect(processed).toBe(mockData);
      expect(processed.split('\n')).toHaveLength(3);
      
      // Mock verification: WebSocket send would be called with correct format
      if (mockWebSocket.readyState === 1) {
        const mockSend = vi.fn();
        mockWebSocket.send = mockSend;
        
        const message = {
          type: 'data',
          data: processed,
          timestamp: Date.now()
        };
        mockWebSocket.send(JSON.stringify(message));
        expect(mockSend).toHaveBeenCalledWith(
          expect.stringContaining('"data":"command output\\nwith newlines\\n"')
        );
      }
    });
  });
});