/**
 * TDD LONDON SCHOOL: Test ClaudeOutputParser for message duplication issues
 * 
 * Mock-driven tests to verify that ClaudeOutputParser is not creating
 * duplicate messages from the same raw Claude output.
 */

import { jest } from '@jest/globals';
import { ClaudeOutputParser, ParsedMessage } from '../../../frontend/src/utils/claudeOutputParser';

describe('Claude Output Tripling Issue - ClaudeOutputParser', () => {
  const testInstanceId = 'claude-test123';
  
  describe('FAILING TEST: parseOutput creates multiple messages from single input', () => {
    it('should create only one message from a single Claude response', () => {
      // ARRANGE: Single Claude response with box drawing
      const singleClaudeResponse = `
┌────────────────────────────────────────────────────────────────┐
│ I understand you want to create a new file. Let me help you    │
│ with that. Here's what I'll do:                                │
│                                                                │
│ 1. Create the file with the specified content                  │
│ 2. Ensure proper formatting and structure                      │
│ 3. Verify the file was created successfully                    │
└────────────────────────────────────────────────────────────────┘`;
      
      // ACT: Parse the output
      const parsedMessages = ClaudeOutputParser.parseOutput(singleClaudeResponse, testInstanceId);
      
      // ASSERT: Should create exactly ONE message
      expect(parsedMessages).toHaveLength(1);
      expect(parsedMessages[0].role).toBe('assistant');
      expect(parsedMessages[0].metadata?.messageType).toBe('claude_response');
      expect(parsedMessages[0].content).toContain('I understand you want to create');
    });
    
    it('FAILING: should not split single response into multiple messages', () => {
      // ARRANGE: Claude response that might be incorrectly split
      const claudeResponseWithSections = `
Some command output before Claude responds

┌────────────────────────────────────────────────────────────────┐
│ Here's my response to your question:                          │
│                                                                │
│ The issue you're experiencing is related to WebSocket         │
│ message handling. Let me explain what's happening:            │
│                                                                │
│ 1. Multiple event handlers are being attached                  │
│ 2. Each handler processes the same message                     │
│ 3. This results in duplicate output                           │
└────────────────────────────────────────────────────────────────┘

Additional terminal output after response`;
      
      // ACT: Parse the complex output
      const parsedMessages = ClaudeOutputParser.parseOutput(claudeResponseWithSections, testInstanceId);
      
      // ASSERT: Should create separate messages for each section
      expect(parsedMessages.length).toBeGreaterThan(1); // Multiple sections expected
      
      // Find the Claude response message
      const claudeResponseMessage = parsedMessages.find(msg => 
        msg.metadata?.messageType === 'claude_response'
      );
      
      expect(claudeResponseMessage).toBeDefined();
      expect(claudeResponseMessage!.content).toContain("Here's my response to your question");
      
      // Ensure the Claude response is only parsed once
      const claudeResponseMessages = parsedMessages.filter(msg =>
        msg.metadata?.messageType === 'claude_response'
      );
      expect(claudeResponseMessages).toHaveLength(1);
    });
  });

  describe('FAILING TEST: Box content extraction creates duplicates', () => {
    it('should extract box content without duplication', () => {
      // ARRANGE: Claude response with clear box structure
      const boxedResponse = `
┌────────────────────────────────────────────────────────────────┐
│ Test message content that should appear only once              │
│                                                                │
│ This is a multi-line response that should be extracted        │
│ as a single cohesive message without duplication.             │
└────────────────────────────────────────────────────────────────┘`;
      
      // ACT: Extract essential content
      const extractedContent = ClaudeOutputParser.extractEssentialContent(boxedResponse);
      
      // ASSERT: Content should appear only once
      expect(extractedContent).toContain('Test message content that should appear only once');
      expect(extractedContent).toContain('This is a multi-line response');
      
      // Verify no duplication by checking content doesn't repeat
      const contentLines = extractedContent.split('\n').filter(line => line.trim());
      const uniqueLines = [...new Set(contentLines)];
      expect(contentLines).toHaveLength(uniqueLines.length); // No duplicate lines
    });
    
    it('FAILING: should handle nested or malformed box structures', () => {
      // ARRANGE: Potentially problematic box structure that might cause duplication
      const malformedBoxResponse = `
┌────────────────────────────────────────────────────────────────┐
│ First response part                                            │
├────────────────────────────────────────────────────────────────┤
│ Middle section that might be parsed separately                │
├────────────────────────────────────────────────────────────────┤
│ Final response part                                            │
└────────────────────────────────────────────────────────────────┘`;
      
      // ACT: Parse malformed structure
      const parsedMessages = ClaudeOutputParser.parseOutput(malformedBoxResponse, testInstanceId);
      
      // ASSERT: Should create single message despite internal structure
      expect(parsedMessages).toHaveLength(1);
      expect(parsedMessages[0].content).toContain('First response part');
      expect(parsedMessages[0].content).toContain('Middle section');
      expect(parsedMessages[0].content).toContain('Final response part');
      
      // Verify no content is duplicated
      const content = parsedMessages[0].content;
      expect((content.match(/First response part/g) || []).length).toBe(1);
      expect((content.match(/Middle section/g) || []).length).toBe(1);
      expect((content.match(/Final response part/g) || []).length).toBe(1);
    });
  });

  describe('FAILING TEST: ANSI sequence removal causes duplication', () => {
    it('should not create duplicate content when removing ANSI sequences', () => {
      // ARRANGE: Claude output with ANSI color codes
      const ansiClaudeOutput = `
\x1b[32m┌────────────────────────────────────────────────────────────────┐\x1b[0m
\x1b[32m│\x1b[0m \x1b[1mI'll help you with that task.\x1b[0m                             \x1b[32m│\x1b[0m
\x1b[32m│\x1b[0m                                                                \x1b[32m│\x1b[0m
\x1b[32m│\x1b[0m \x1b[33mHere's what I'll do:\x1b[0m                                      \x1b[32m│\x1b[0m
\x1b[32m│\x1b[0m \x1b[36m1. Process your request\x1b[0m                                   \x1b[32m│\x1b[0m
\x1b[32m│\x1b[0m \x1b[36m2. Generate the appropriate response\x1b[0m                     \x1b[32m│\x1b[0m
\x1b[32m└────────────────────────────────────────────────────────────────┘\x1b[0m`;
      
      // ACT: Parse output with ANSI sequences
      const parsedMessages = ClaudeOutputParser.parseOutput(ansiClaudeOutput, testInstanceId);
      
      // ASSERT: Should create clean single message
      expect(parsedMessages).toHaveLength(1);
      expect(parsedMessages[0].content).not.toMatch(/\x1b/); // No ANSI sequences
      expect(parsedMessages[0].content).toContain("I'll help you with that task");
      expect(parsedMessages[0].content).toContain("Here's what I'll do:");
      expect(parsedMessages[0].content).toContain("1. Process your request");
      
      // Verify content appears only once after ANSI removal
      const content = parsedMessages[0].content;
      expect((content.match(/I'll help you with that task/g) || []).length).toBe(1);
    });
  });

  describe('FAILING TEST: Section splitting logic creates duplicates', () => {
    it('should not duplicate content when splitting complex output into sections', () => {
      // ARRANGE: Complex output that might trigger section splitting bugs
      const complexOutput = `
Starting Claude process...
Connected to Claude instance.

┌────────────────────────────────────────────────────────────────┐
│ Hello! I'm Claude, an AI assistant created by Anthropic.      │
│ How can I help you today?                                     │
└────────────────────────────────────────────────────────────────┘

Ready for next command.
$ echo "test command"
test command
$`;
      
      // ACT: Parse complex output
      const parsedMessages = ClaudeOutputParser.parseOutput(complexOutput, testInstanceId);
      
      // ASSERT: Each unique section should appear only once
      const allContent = parsedMessages.map(msg => msg.content).join('\n');
      
      // Check for duplication of key phrases
      expect((allContent.match(/Starting Claude process/g) || []).length).toBe(1);
      expect((allContent.match(/Hello! I'm Claude/g) || []).length).toBe(1);
      expect((allContent.match(/How can I help you today/g) || []).length).toBe(1);
      expect((allContent.match(/Ready for next command/g) || []).length).toBe(1);
      
      // Verify we have appropriate number of sections
      expect(parsedMessages.length).toBeGreaterThanOrEqual(2);
      expect(parsedMessages.length).toBeLessThanOrEqual(4); // Reasonable upper bound
    });
  });

  describe('Message ID Generation for Parser', () => {
    it('should generate unique IDs for each parsed message', () => {
      // ARRANGE: Output that creates multiple messages
      const multiSectionOutput = `
Terminal startup message.

┌────────────────────────────────────────────────────────────────┐
│ First Claude response.                                         │
└────────────────────────────────────────────────────────────────┘

Some command output.

┌────────────────────────────────────────────────────────────────┐
│ Second Claude response.                                        │
└────────────────────────────────────────────────────────────────┘`;
      
      // ACT: Parse output
      const parsedMessages = ClaudeOutputParser.parseOutput(multiSectionOutput, testInstanceId);
      
      // ASSERT: All messages should have unique IDs
      const messageIds = parsedMessages.map(msg => msg.id);
      const uniqueIds = [...new Set(messageIds)];
      
      expect(messageIds).toHaveLength(uniqueIds.length); // No duplicate IDs
      expect(parsedMessages.length).toBeGreaterThan(1); // Multiple messages created
      
      // Verify ID format
      messageIds.forEach(id => {
        expect(id).toMatch(/^claude-test123-msg-\d+-\d+$/);
      });
    });
  });

  describe('Integration with Real Claude Output Patterns', () => {
    it('FAILING: should handle real Claude command execution output without tripling', () => {
      // ARRANGE: Realistic Claude output that might cause tripling
      const realClaudeOutput = `
$ npm run test
> test
> jest --coverage

┌────────────────────────────────────────────────────────────────┐
│ I'll help you run the tests. Let me execute that command for   │
│ you and show you the results.                                 │
│                                                                │
│ Running: npm run test                                          │
└────────────────────────────────────────────────────────────────┘

 PASS  src/components/Button.test.tsx
 PASS  src/utils/helpers.test.ts

Test Suites: 2 passed, 2 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        2.456s
Ran all test suites.

┌────────────────────────────────────────────────────────────────┐
│ Great! All tests are passing. Here's a summary:               │
│                                                                │
│ ✅ 2 test suites passed                                         │
│ ✅ 15 individual tests passed                                   │
│ ⏱️  Completed in 2.456 seconds                                 │
│                                                                │
│ Your code is working correctly! Is there anything specific    │
│ you'd like me to help you with regarding the test results?    │
└────────────────────────────────────────────────────────────────┘

$ `;
      
      // ACT: Parse realistic output
      const parsedMessages = ClaudeOutputParser.parseOutput(realClaudeOutput, testInstanceId);
      
      // ASSERT: Should not create tripled content
      const allContent = parsedMessages.map(msg => msg.content).join(' ');
      
      // These key phrases should appear only once each
      expect((allContent.match(/I'll help you run the tests/g) || []).length).toBe(1);
      expect((allContent.match(/All tests are passing/g) || []).length).toBe(1);
      expect((allContent.match(/Your code is working correctly/g) || []).length).toBe(1);
      
      // Find Claude response messages
      const claudeMessages = parsedMessages.filter(msg => 
        msg.metadata?.messageType === 'claude_response'
      );
      
      // Should have exactly 2 Claude responses
      expect(claudeMessages).toHaveLength(2);
      
      // Verify content is not duplicated across messages
      const firstResponse = claudeMessages[0].content;
      const secondResponse = claudeMessages[1].content;
      
      expect(firstResponse).toContain("I'll help you run the tests");
      expect(secondResponse).toContain("Great! All tests are passing");
      expect(firstResponse).not.toContain("Great! All tests are passing"); // No cross-contamination
      expect(secondResponse).not.toContain("I'll help you run the tests"); // No cross-contamination
    });
  });
});