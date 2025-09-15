/**
 * Unit Tests for Claude Output Parser
 *
 * Tests the parsing logic for Claude terminal output, including:
 * - ANSI escape sequence removal
 * - Message type detection
 * - Metadata extraction
 * - Edge cases and malformed data
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeOutputParser, ParsedClaudeMessage } from '../../../utils/claude-output-parser';

describe('ClaudeOutputParser', () => {
  describe('parseClaudeOutput', () => {
    it('should parse welcome message with metadata', () => {
      const welcomeOutput = `
\x1B[2J\x1B[H┌──────────────────────────────────────┐
│  Welcome to Claude Code!              │
│  cwd: /workspaces/agent-feed          │
│  ? for shortcuts                      │
└──────────────────────────────────────┘
`;

      const messages = ClaudeOutputParser.parseClaudeOutput(welcomeOutput);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: 'welcome',
        content: expect.stringContaining('Welcome to Claude Code!'),
        metadata: {
          cwd: '/workspaces/agent-feed'
        }
      });
    });

    it('should parse model switching notification', () => {
      const modelSwitchOutput = `
Claude Opus limit reached for this conversation, now using Sonnet 4
`;

      const messages = ClaudeOutputParser.parseClaudeOutput(modelSwitchOutput);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: 'system',
        content: expect.stringContaining('now using Sonnet 4'),
        metadata: {
          model: 'Sonnet 4'
        }
      });
    });

    it('should parse user input and Claude response', () => {
      const conversationOutput = `
> ls -la
total 24
drwxr-xr-x  6 user user 4096 Jan 15 10:30 .
drwxr-xr-x  3 user user 4096 Jan 15 10:25 ..
-rw-r--r--  1 user user  123 Jan 15 10:30 package.json
`;

      const messages = ClaudeOutputParser.parseClaudeOutput(conversationOutput);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: 'response',
        content: expect.stringContaining('User: ls -la')
      });
    });

    it('should parse Claude suggestion', () => {
      const suggestionOutput = `
Try "npm install" to install dependencies
`;

      const messages = ClaudeOutputParser.parseClaudeOutput(suggestionOutput);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: 'system',
        content: 'Suggestion: npm install',
        metadata: {
          suggestion: 'npm install'
        }
      });
    });

    it('should handle empty or null input', () => {
      expect(ClaudeOutputParser.parseClaudeOutput('')).toEqual([]);
      expect(ClaudeOutputParser.parseClaudeOutput(null as any)).toEqual([]);
      expect(ClaudeOutputParser.parseClaudeOutput(undefined as any)).toEqual([]);
    });

    it('should filter out empty messages', () => {
      const outputWithEmpty = `



`;

      const messages = ClaudeOutputParser.parseClaudeOutput(outputWithEmpty);
      expect(messages).toEqual([]);
    });
  });

  describe('ANSI escape sequence handling', () => {
    it('should remove ANSI color codes', () => {
      const coloredOutput = `\x1B[31mError:\x1B[0m File not found`;
      const messages = ClaudeOutputParser.parseClaudeOutput(coloredOutput);

      expect(messages[0].content).toBe('Error: File not found');
    });

    it('should remove cursor control sequences', () => {
      const cursorOutput = `\x1B[2J\x1B[H\x1B[?25lHidden cursor\x1B[?25h`;
      const messages = ClaudeOutputParser.parseClaudeOutput(cursorOutput);

      expect(messages[0].content).toBe('Hidden cursor');
    });

    it('should remove box drawing characters', () => {
      const boxOutput = `┌──────┐
│ Text │
└──────┘`;
      const messages = ClaudeOutputParser.parseClaudeOutput(boxOutput);

      expect(messages[0].content).toBe('Text');
    });

    it('should handle complex ANSI sequences', () => {
      const complexOutput = `\x1B[1;32m\x1B[2K\x1B[G┌─ \x1B[1;36mStatus\x1B[0m ─┐\x1B[0m
\x1B[32m│\x1B[0m Connected \x1B[32m│\x1B[0m
\x1B[32m└───────────┘\x1B[0m`;

      const messages = ClaudeOutputParser.parseClaudeOutput(complexOutput);
      expect(messages[0].content).toContain('Status');
      expect(messages[0].content).toContain('Connected');
    });
  });

  describe('extractTextContent', () => {
    it('should extract clean text from complex output', () => {
      const complexOutput = `
\x1B[2J\x1B[H┌──────────────────────────────────────┐
│  Welcome to Claude Code!              │
└──────────────────────────────────────┘

> echo "Hello World"
Hello World

System message: Process completed
`;

      const text = ClaudeOutputParser.extractTextContent(complexOutput);

      expect(text).toContain('Welcome to Claude Code!');
      expect(text).toContain('Hello World');
      expect(text).not.toContain('└');
      expect(text).not.toContain('\x1B');
    });

    it('should return empty string for no content', () => {
      expect(ClaudeOutputParser.extractTextContent('')).toBe('');
      expect(ClaudeOutputParser.extractTextContent('   ')).toBe('');
    });
  });

  describe('hasClaudeResponse', () => {
    it('should detect Claude responses', () => {
      const claudeResponse = `
I can help you with that. Here's the solution:

\`\`\`javascript
function example() {
  return "Hello World";
}
\`\`\`
`;

      expect(ClaudeOutputParser.hasClaudeResponse(claudeResponse)).toBe(true);
    });

    it('should ignore simple echoes', () => {
      const echoOutput = `> hello
hello`;

      expect(ClaudeOutputParser.hasClaudeResponse(echoOutput)).toBe(false);
    });

    it('should ignore user input only', () => {
      const userOnly = `> ls -la
User: ls -la`;

      expect(ClaudeOutputParser.hasClaudeResponse(userOnly)).toBe(false);
    });

    it('should handle empty input', () => {
      expect(ClaudeOutputParser.hasClaudeResponse('')).toBe(false);
      expect(ClaudeOutputParser.hasClaudeResponse(null as any)).toBe(false);
    });
  });

  describe('message metadata extraction', () => {
    it('should extract working directory from welcome', () => {
      const welcomeWithCwd = `
Welcome to Claude Code!
Current working directory: /home/user/project
Model: Claude Sonnet 4
`;

      const messages = ClaudeOutputParser.parseClaudeOutput(welcomeWithCwd);
      expect(messages[0].metadata?.cwd).toContain('/home/user/project');
    });

    it('should extract model information', () => {
      const modelInfo = `Now using Claude Haiku for faster responses`;

      const messages = ClaudeOutputParser.parseClaudeOutput(modelInfo);
      expect(messages[0].metadata?.model).toContain('Haiku');
    });

    it('should preserve timestamps', () => {
      const output = `System message at 2024-01-15T10:30:00Z`;

      const messages = ClaudeOutputParser.parseClaudeOutput(output);
      expect(messages[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed ANSI sequences', () => {
      const malformedOutput = `\x1B[Hello\x1BWorld\x1B[999mText`;

      const messages = ClaudeOutputParser.parseClaudeOutput(malformedOutput);
      expect(messages[0].content).toContain('Text');
    });

    it('should handle very long lines', () => {
      const longLine = 'a'.repeat(10000);
      const longOutput = `Long content: ${longLine}`;

      const messages = ClaudeOutputParser.parseClaudeOutput(longOutput);
      expect(messages[0].content).toContain('Long content:');
      expect(messages[0].content.length).toBeGreaterThan(1000);
    });

    it('should handle unicode characters', () => {
      const unicodeOutput = `Message with emojis: 🚀 🎉 ✨ and unicode: αβγδε`;

      const messages = ClaudeOutputParser.parseClaudeOutput(unicodeOutput);
      expect(messages[0].content).toContain('🚀');
      expect(messages[0].content).toContain('αβγδε');
    });

    it('should handle mixed line endings', () => {
      const mixedOutput = `Line 1\r\nLine 2\nLine 3\r`;

      const messages = ClaudeOutputParser.parseClaudeOutput(mixedOutput);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain('Line 1');
      expect(messages[0].content).toContain('Line 2');
      expect(messages[0].content).toContain('Line 3');
    });

    it('should handle nested box drawings', () => {
      const nestedBoxes = `
┌─────────────────┐
│ Outer Box       │
│ ┌─────────────┐ │
│ │ Inner Box   │ │
│ └─────────────┘ │
└─────────────────┘`;

      const messages = ClaudeOutputParser.parseClaudeOutput(nestedBoxes);
      expect(messages[0].content).toContain('Outer Box');
      expect(messages[0].content).toContain('Inner Box');
      expect(messages[0].content).not.toContain('┌');
    });
  });

  describe('performance', () => {
    it('should parse large output efficiently', () => {
      // Generate large output (1MB)
      const largeOutput = Array(1000).fill(0).map((_, i) =>
        `Line ${i}: ${'a'.repeat(1000)}`
      ).join('\n');

      const start = performance.now();
      const messages = ClaudeOutputParser.parseClaudeOutput(largeOutput);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should parse 1MB in <100ms
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should handle many small messages efficiently', () => {
      const manyMessages = Array(10000).fill(0).map((_, i) =>
        `Message ${i}`
      ).join('\n');

      const start = performance.now();
      const messages = ClaudeOutputParser.parseClaudeOutput(manyMessages);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // Should parse 10k messages in <50ms
      expect(messages.length).toBe(1); // All combined into one message
    });
  });
});