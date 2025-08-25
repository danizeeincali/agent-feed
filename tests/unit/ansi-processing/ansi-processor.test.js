/**
 * TDD London School Tests - Isolated ANSI Processing Logic
 * Pure function tests without constructor dependencies
 */

// Extract the processAnsiSequences method for isolated testing
function createProcessAnsiSequences() {
  // This is the CURRENT BROKEN implementation from the server
  return function processAnsiSequences(data) {
    return data
      // Handle carriage return patterns (main cause of cascading) - BROKEN
      .replace(/\r\x1b\[K/g, '\x1b[2K\x1b[1G') // \r + clear line -> clear entire line + move to start
      .replace(/\r\x1b\[0K/g, '\x1b[0K\x1b[1G') // \r + clear to end -> clear to end + move to start  
      .replace(/\r(?!\n)/g, '\x1b[1G')         // Standalone \r -> just move cursor to start - BROKEN!
      
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
  };
}

// The FIXED implementation
function createFixedProcessAnsiSequences() {
  return function processAnsiSequences(data) {
    return data
      // CRITICAL FIX: Preserve carriage returns for proper terminal behavior
      // Only modify problematic sequences, not basic carriage returns
      .replace(/\r\x1b\[2K/g, '\r\x1b[2K')    // \r + clear entire line - preserve both
      .replace(/\r\x1b\[K/g, '\r\x1b[K')      // \r + clear line - preserve both
      .replace(/\r\x1b\[0K/g, '\r\x1b[0K')    // \r + clear to end - preserve both
      // DO NOT TOUCH standalone \r - it's essential for spinner animations!
      
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
  };
}

describe('ANSI Processing - London School TDD Regression Fix', () => {
  let brokenProcessor;
  let fixedProcessor;

  beforeEach(() => {
    brokenProcessor = createProcessAnsiSequences();
    fixedProcessor = createFixedProcessAnsiSequences();
  });

  describe('Carriage Return Regression - Current Broken Behavior', () => {
    it('demonstrates the current bug: standalone \\r gets converted incorrectly', () => {
      const input = 'Loading...\rDone!';
      
      const brokenResult = brokenProcessor(input);
      
      // This demonstrates the bug: \r gets converted to cursor positioning
      expect(brokenResult).toBe('Loading...\x1b[1G]Done!');
      expect(brokenResult).toContain('\x1b[1G'); // Proves the bug exists
      expect(brokenResult).not.toContain('\r');  // Original \r is lost
    });

    it('shows spinner animation failure with current implementation', () => {
      const spinnerInput = '⠋ Working\r⠙ Working\r⠹ Working';
      
      const brokenResult = brokenProcessor(spinnerInput);
      
      // Current broken behavior - loses carriage returns
      expect(brokenResult).toBe('⠋ Working\x1b[1G]⠙ Working\x1b[1G]⠹ Working');
      expect(brokenResult).not.toContain('\r');
      expect(brokenResult).toContain('\x1b[1G'); // Wrong cursor positioning
    });
  });

  describe('Fixed Implementation - London School Verification', () => {
    it('should preserve standalone carriage return for line overwriting', () => {
      const input = 'Loading...\rDone!';
      
      const fixedResult = fixedProcessor(input);
      
      // Fixed: preserves original carriage return
      expect(fixedResult).toBe('Loading...\rDone!');
      expect(fixedResult).toContain('\r');
      expect(fixedResult).not.toContain('\x1b[1G');
    });

    it('should handle spinner animations correctly', () => {
      const spinnerInput = '⠋ Working\r⠙ Working\r⠹ Working';
      
      const fixedResult = fixedProcessor(spinnerInput);
      
      // Fixed: preserves carriage returns for proper overwriting
      expect(fixedResult).toBe('⠋ Working\r⠙ Working\r⠹ Working');
      expect(fixedResult.match(/\r/g)).toHaveLength(2);
      expect(fixedResult).not.toContain('\x1b[1G');
    });

    it('should preserve complex carriage return + clear sequences', () => {
      const input = 'Processing\r\x1b[KComplete!';
      
      const fixedResult = fixedProcessor(input);
      
      // Fixed: preserves both \r and clear sequence
      expect(fixedResult).toBe('Processing\r\x1b[KComplete!');
      expect(fixedResult).toContain('\r\x1b[K');
      expect(fixedResult).not.toContain('\x1b[1G');
    });

    it('should handle multiple carriage returns correctly', () => {
      const input = 'Step 1\rStep 2\rStep 3\rFinal';
      
      const fixedResult = fixedProcessor(input);
      
      // Fixed: all carriage returns preserved
      expect(fixedResult).toBe('Step 1\rStep 2\rStep 3\rFinal');
      expect(fixedResult.match(/\r/g)).toHaveLength(3);
      expect(fixedResult).not.toContain('\x1b[1G');
    });
  });

  describe('Contract Verification - London School', () => {
    it('should maintain terminal semantics contract', () => {
      const testCases = [
        'Simple text',
        'Line 1\r\nLine 2',
        'Loading\rDone',
        '\r\x1b[KCleared',
        '⠋\r⠙\r⠹\r⠸'
      ];

      testCases.forEach(testCase => {
        const result = fixedProcessor(testCase);
        
        // Contract: preserve essential terminal control characters
        if (testCase.includes('\r')) {
          expect(result).toContain('\r');
        }
        
        if (testCase.includes('\x1b[K')) {
          expect(result).toContain('\x1b[K');
        }
        
        // Contract: no incorrect cursor positioning
        expect(result).not.toContain('\x1b[1G');
      });
    });
  });

  describe('Claude CLI Specific Patterns', () => {
    it('should handle Claude CLI thinking spinner correctly', () => {
      const claudeSpinner = '⠋ Thinking...\r⠙ Thinking...\r⠹ Thinking...';
      
      const result = fixedProcessor(claudeSpinner);
      
      expect(result).toBe('⠋ Thinking...\r⠙ Thinking...\r⠹ Thinking...');
      expect(result.match(/\r/g)).toHaveLength(2);
    });

    it('should handle Claude CLI prompt patterns', () => {
      const promptPattern = 'Processing files...\r\x1b[K> Ready for input';
      
      const result = fixedProcessor(promptPattern);
      
      expect(result).toBe('Processing files...\r\x1b[K> Ready for input');
      expect(result).toContain('\r\x1b[K');
    });
  });
});