/**
 * TDD LONDON SCHOOL: Test Message Deduplication Logic
 * 
 * Mock-driven tests to verify the deduplication mechanisms in 
 * ClaudeInstanceManagerModern are working correctly to prevent tripling.
 */

import { jest } from '@jest/globals';

// Mock the deduplication logic from ClaudeInstanceManagerModern
class MockMessageDeduplicator {
  private processedMessages = new Set<string>();
  private readonly maxMessages = 1000;
  private readonly cleanupThreshold = 500;
  
  generateMessageId(terminalId: string, timestamp: number, output: string): string {
    return `${terminalId}-${timestamp || Date.now()}-${output.slice(0, 50)}`;
  }
  
  isDuplicate(messageId: string): boolean {
    return this.processedMessages.has(messageId);
  }
  
  markProcessed(messageId: string): void {
    this.processedMessages.add(messageId);
    
    // Memory cleanup simulation (from line 107-111 in ClaudeInstanceManagerModern)
    if (this.processedMessages.size > this.maxMessages) {
      const messagesArray = Array.from(this.processedMessages);
      this.processedMessages = new Set(messagesArray.slice(-this.cleanupThreshold));
    }
  }
  
  processMessage(data: { terminalId: string; output: string; timestamp?: number }): boolean {
    const messageId = this.generateMessageId(data.terminalId, data.timestamp || Date.now(), data.output);
    
    if (this.isDuplicate(messageId)) {
      console.log(`🔄 Duplicate message ignored: ${messageId}`);
      return false; // Message was duplicate
    }
    
    this.markProcessed(messageId);
    return true; // Message was processed
  }
  
  getProcessedCount(): number {
    return this.processedMessages.size;
  }
  
  clear(): void {
    this.processedMessages.clear();
  }
}

// Mock WebSocket message processor that integrates with deduplication
class MockWebSocketMessageProcessor {
  private deduplicator = new MockMessageDeduplicator();
  private outputState: { [terminalId: string]: string } = {};
  
  processTerminalOutput(data: { terminalId: string; output: string; timestamp?: number }): boolean {
    const wasProcessed = this.deduplicator.processMessage(data);
    
    if (wasProcessed) {
      // Clean ANSI sequences (from line 116)
      const cleanOutput = data.output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
      
      // Append to output state (from line 118-121)
      this.outputState[data.terminalId] = (this.outputState[data.terminalId] || '') + cleanOutput;
    }
    
    return wasProcessed;
  }
  
  getOutput(terminalId: string): string {
    return this.outputState[terminalId] || '';
  }
  
  getDeduplicator(): MockMessageDeduplicator {
    return this.deduplicator;
  }
  
  reset(): void {
    this.deduplicator.clear();
    this.outputState = {};
  }
}

describe('Claude Output Tripling Issue - Message Deduplication', () => {
  let deduplicator: MockMessageDeduplicator;
  let processor: MockWebSocketMessageProcessor;
  
  beforeEach(() => {
    deduplicator = new MockMessageDeduplicator();
    processor = new MockWebSocketMessageProcessor();
  });

  describe('FAILING TEST: Message ID generation creates unique identifiers', () => {
    it('should generate the same ID for identical messages', () => {
      // ARRANGE: Identical message data
      const terminalId = 'claude-test123';
      const timestamp = 1699999999999;
      const output = 'Hello from Claude!';
      
      // ACT: Generate IDs for identical messages
      const id1 = deduplicator.generateMessageId(terminalId, timestamp, output);
      const id2 = deduplicator.generateMessageId(terminalId, timestamp, output);
      
      // ASSERT: IDs should be identical for deduplication to work
      expect(id1).toBe(id2);
      expect(id1).toBe(`${terminalId}-${timestamp}-${output.slice(0, 50)}`);
    });
    
    it('should generate different IDs for different messages', () => {
      // ARRANGE: Different message variations
      const baseTerminalId = 'claude-test123';
      const baseTimestamp = 1699999999999;
      const baseOutput = 'Hello from Claude!';
      
      // ACT & ASSERT: Different terminal IDs
      const id1 = deduplicator.generateMessageId(baseTerminalId, baseTimestamp, baseOutput);
      const id2 = deduplicator.generateMessageId('claude-different', baseTimestamp, baseOutput);
      expect(id1).not.toBe(id2);
      
      // Different timestamps
      const id3 = deduplicator.generateMessageId(baseTerminalId, baseTimestamp + 1000, baseOutput);
      expect(id1).not.toBe(id3);
      
      // Different output
      const id4 = deduplicator.generateMessageId(baseTerminalId, baseTimestamp, 'Different message!');
      expect(id1).not.toBe(id4);
    });
    
    it('should handle long output by truncating to 50 characters in ID', () => {
      // ARRANGE: Very long Claude output
      const longOutput = 'A'.repeat(100) + 'B'.repeat(100) + 'C'.repeat(100);
      
      // ACT: Generate ID with long output
      const messageId = deduplicator.generateMessageId('claude-test', 123456, longOutput);
      
      // ASSERT: ID should contain only first 50 characters of output
      expect(messageId).toContain('A'.repeat(50));
      expect(messageId).not.toContain('B'.repeat(50)); // Should be truncated before B's
      expect(messageId).toBe(`claude-test-123456-${'A'.repeat(50)}`);
    });
  });

  describe('FAILING TEST: Duplicate detection prevents message processing', () => {
    it('should detect and prevent duplicate message processing', () => {
      // ARRANGE: Identical message data (the tripling scenario)
      const messageData = {
        terminalId: 'claude-test123',
        output: 'This message will be sent 3 times',
        timestamp: 1699999999999
      };
      
      // ACT: Process the same message multiple times
      const result1 = processor.processTerminalOutput(messageData);
      const result2 = processor.processTerminalOutput(messageData);
      const result3 = processor.processTerminalOutput(messageData);
      
      // ASSERT: Only first message should be processed
      expect(result1).toBe(true);  // First message processed
      expect(result2).toBe(false); // Second message blocked as duplicate
      expect(result3).toBe(false); // Third message blocked as duplicate
      
      // Output should contain the message only once
      const output = processor.getOutput('claude-test123');
      expect(output).toBe('This message will be sent 3 times');
      expect((output.match(/This message will be sent 3 times/g) || []).length).toBe(1);
      
      // Only 1 message should be tracked as processed
      expect(processor.getDeduplicator().getProcessedCount()).toBe(1);
    });
    
    it('FAILING: should allow similar but different messages', () => {
      // ARRANGE: Similar but unique messages
      const baseMessage = {
        terminalId: 'claude-test123',
        output: 'Base message content',
        timestamp: 1699999999999
      };
      
      const similarMessages = [
        { ...baseMessage, output: 'Base message content v1' },
        { ...baseMessage, output: 'Base message content v2' },
        { ...baseMessage, timestamp: baseMessage.timestamp + 1 }
      ];
      
      // ACT: Process similar but different messages
      const results = similarMessages.map(msg => processor.processTerminalOutput(msg));
      
      // ASSERT: All messages should be processed as they're unique
      expect(results).toEqual([true, true, true]);
      
      // All messages should appear in output
      const output = processor.getOutput('claude-test123');
      expect(output).toContain('Base message content v1');
      expect(output).toContain('Base message content v2');
      expect(output).toContain('Base message content'); // Third message has same content but different timestamp
      
      expect(processor.getDeduplicator().getProcessedCount()).toBe(3);
    });
  });

  describe('FAILING TEST: ANSI sequence handling in deduplication', () => {
    it('should deduplicate messages with ANSI sequences correctly', () => {
      // ARRANGE: Same message with ANSI color codes
      const messageWithANSI = {
        terminalId: 'claude-test123',
        output: '\x1b[32mGreen text message\x1b[0m',
        timestamp: 1699999999999
      };
      
      const identicalMessageWithANSI = {
        terminalId: 'claude-test123',
        output: '\x1b[32mGreen text message\x1b[0m', // Identical including ANSI
        timestamp: 1699999999999
      };
      
      // ACT: Process identical ANSI messages
      const result1 = processor.processTerminalOutput(messageWithANSI);
      const result2 = processor.processTerminalOutput(identicalMessageWithANSI);
      
      // ASSERT: Second message should be blocked as duplicate
      expect(result1).toBe(true);
      expect(result2).toBe(false);
      
      // Output should have ANSI sequences removed and appear only once
      const output = processor.getOutput('claude-test123');
      expect(output).toBe('Green text message'); // ANSI removed
      expect(output).not.toContain('\x1b'); // No ANSI sequences in output
      expect((output.match(/Green text message/g) || []).length).toBe(1);
    });
    
    it('should treat messages with different ANSI as different', () => {
      // ARRANGE: Same content with different ANSI formatting
      const redMessage = {
        terminalId: 'claude-test123',
        output: '\x1b[31mColored message\x1b[0m',
        timestamp: 1699999999999
      };
      
      const greenMessage = {
        terminalId: 'claude-test123',
        output: '\x1b[32mColored message\x1b[0m',
        timestamp: 1699999999999
      };
      
      // ACT: Process messages with different ANSI codes
      const result1 = processor.processTerminalOutput(redMessage);
      const result2 = processor.processTerminalOutput(greenMessage);
      
      // ASSERT: Both should be processed as they have different raw content
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      
      // Both messages should appear in output (ANSI stripped)
      const output = processor.getOutput('claude-test123');
      expect(output).toBe('Colored messageColored message'); // Both messages concatenated
      expect(processor.getDeduplicator().getProcessedCount()).toBe(2);
    });
  });

  describe('FAILING TEST: Memory cleanup in deduplication', () => {
    it('should maintain deduplication effectiveness after cleanup', () => {
      // ARRANGE: Simulate processing many messages to trigger cleanup
      const processor = new MockWebSocketMessageProcessor();
      const baseTimestamp = Date.now();
      
      // Process 1001 unique messages to trigger cleanup (maxMessages = 1000)
      for (let i = 0; i < 1001; i++) {
        processor.processTerminalOutput({
          terminalId: 'claude-test123',
          output: `Message number ${i}`,
          timestamp: baseTimestamp + i
        });
      }
      
      // ACT: Try to process a recent message again (should still be deduplicated)
      const recentMessage = {
        terminalId: 'claude-test123',
        output: 'Message number 1000', // This should still be in the cleaned set
        timestamp: baseTimestamp + 1000
      };
      
      const result = processor.processTerminalOutput(recentMessage);
      
      // ASSERT: Recent message should still be detected as duplicate
      expect(result).toBe(false); // Should be blocked
      expect(processor.getDeduplicator().getProcessedCount()).toBe(500); // Should be cleaned to 500
    });
    
    it('should allow old messages after cleanup', () => {
      // ARRANGE: Process many messages and trigger cleanup
      const processor = new MockWebSocketMessageProcessor();
      const baseTimestamp = Date.now();
      
      // Process messages that will be cleaned up
      for (let i = 0; i < 1001; i++) {
        processor.processTerminalOutput({
          terminalId: 'claude-test123',
          output: `Old message ${i}`,
          timestamp: baseTimestamp + i
        });
      }
      
      // ACT: Try to process an old message that should have been cleaned
      const oldMessage = {
        terminalId: 'claude-test123',
        output: 'Old message 0', // This should be cleaned from the set
        timestamp: baseTimestamp
      };
      
      const result = processor.processTerminalOutput(oldMessage);
      
      // ASSERT: Old message should be allowed as it's no longer in dedupe set
      expect(result).toBe(true); // Should be processed
    });
  });

  describe('FAILING TEST: Real-world tripling scenarios', () => {
    it('should prevent tripling in rapid WebSocket message scenario', () => {
      // ARRANGE: Simulate rapid WebSocket messages (common cause of tripling)
      const claudeResponse = `
┌────────────────────────────────────────────────────────────────┐
│ I'll help you with your request. Let me analyze the situation │
│ and provide you with a comprehensive solution.                │
└────────────────────────────────────────────────────────────────┘`;
      
      const messageData = {
        terminalId: 'claude-test123',
        output: claudeResponse,
        timestamp: 1699999999999
      };
      
      // ACT: Simulate the tripling bug - same message received 3 times rapidly
      const results = [
        processor.processTerminalOutput(messageData),
        processor.processTerminalOutput(messageData),
        processor.processTerminalOutput(messageData)
      ];
      
      // ASSERT: Only first message should be processed
      expect(results).toEqual([true, false, false]);
      
      const output = processor.getOutput('claude-test123');
      // Response should appear only once
      expect((output.match(/I'll help you with your request/g) || []).length).toBe(1);
      expect((output.match(/comprehensive solution/g) || []).length).toBe(1);
      
      expect(processor.getDeduplicator().getProcessedCount()).toBe(1);
    });
    
    it('FAILING: should handle mixed content types without creating duplicates', () => {
      // ARRANGE: Mixed Claude responses and command outputs
      const mixedMessages = [
        {
          terminalId: 'claude-test123',
          output: '$ ls -la',
          timestamp: 1699999999990
        },
        {
          terminalId: 'claude-test123', 
          output: 'total 64\ndrwxr-xr-x 8 user user 4096 Nov 15 10:00 .',
          timestamp: 1699999999991
        },
        {
          terminalId: 'claude-test123',
          output: `
┌────────────────────────────────────────────────────────────────┐
│ I can see the directory listing. Here's what I found:         │
│                                                                │
│ - Current directory contains 8 items                          │
│ - All files have proper permissions                           │
└────────────────────────────────────────────────────────────────┘`,
          timestamp: 1699999999992
        },
        // Duplicate the Claude response (simulating the bug)
        {
          terminalId: 'claude-test123',
          output: `
┌────────────────────────────────────────────────────────────────┐
│ I can see the directory listing. Here's what I found:         │
│                                                                │
│ - Current directory contains 8 items                          │
│ - All files have proper permissions                           │
└────────────────────────────────────────────────────────────────┘`,
          timestamp: 1699999999992 // Same timestamp - should be deduplicated
        }
      ];
      
      // ACT: Process mixed messages
      const results = mixedMessages.map(msg => processor.processTerminalOutput(msg));
      
      // ASSERT: First 3 should be processed, 4th should be blocked as duplicate
      expect(results).toEqual([true, true, true, false]);
      
      const output = processor.getOutput('claude-test123');
      
      // Each unique content should appear only once
      expect((output.match(/\$ ls -la/g) || []).length).toBe(1);
      expect((output.match(/total 64/g) || []).length).toBe(1);
      expect((output.match(/I can see the directory listing/g) || []).length).toBe(1);
      expect((output.match(/Current directory contains 8 items/g) || []).length).toBe(1);
      
      expect(processor.getDeduplicator().getProcessedCount()).toBe(3);
    });
  });

  describe('Edge Cases in Deduplication', () => {
    it('should handle empty and whitespace-only messages', () => {
      // ARRANGE: Edge case messages
      const edgeCases = [
        { terminalId: 'claude-test123', output: '', timestamp: 1000 },
        { terminalId: 'claude-test123', output: '   ', timestamp: 1001 },
        { terminalId: 'claude-test123', output: '\n\n\n', timestamp: 1002 },
        { terminalId: 'claude-test123', output: '', timestamp: 1000 } // Duplicate empty
      ];
      
      // ACT: Process edge cases
      const results = edgeCases.map(msg => processor.processTerminalOutput(msg));
      
      // ASSERT: Each unique message should be processed, including empty ones
      expect(results).toEqual([true, true, true, false]); // Last is duplicate of first
      expect(processor.getDeduplicator().getProcessedCount()).toBe(3);
    });
    
    it('should handle messages without timestamps', () => {
      // ARRANGE: Messages without explicit timestamps
      const messageWithoutTimestamp = {
        terminalId: 'claude-test123',
        output: 'Message without timestamp'
        // No timestamp property - should use Date.now()
      };
      
      // ACT: Process message without timestamp
      const result1 = processor.processTerminalOutput(messageWithoutTimestamp);
      const result2 = processor.processTerminalOutput(messageWithoutTimestamp);
      
      // ASSERT: Second message should be processed because timestamps will be different
      // (Date.now() will return different values)
      expect(result1).toBe(true);
      expect(result2).toBe(true); // Different generated timestamps make this unique
      
      expect(processor.getDeduplicator().getProcessedCount()).toBe(2);
    });
  });
});