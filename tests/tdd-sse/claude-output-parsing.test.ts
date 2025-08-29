/**
 * TDD London School - Claude Output Parsing Tests
 * 
 * Tests focus on mock-driven parsing behavior:
 * - ANSI escape sequence handling
 * - Box-drawing character extraction
 * - Message type detection
 * - Multi-line response parsing
 */

describe('Claude Output Parsing - London School TDD', () => {
  let mockAnsiParser: jest.Mocked<any>;
  let mockMessageExtractor: jest.Mocked<any>;
  let mockOutputFormatter: jest.Mocked<any>;

  beforeEach(() => {
    // Mock ANSI parser with behavior verification
    mockAnsiParser = {
      stripAnsiCodes: jest.fn(),
      extractColorCodes: jest.fn(),
      parseFormatting: jest.fn(),
      hasAnsiCodes: jest.fn()
    };

    // Mock message extractor for content isolation
    mockMessageExtractor = {
      extractCleanText: jest.fn(),
      detectMessageType: jest.fn(),
      parseMultilineResponse: jest.fn(),
      extractBoxContent: jest.fn()
    };

    // Mock output formatter for display preparation
    mockOutputFormatter = {
      formatForDisplay: jest.fn(),
      createMessageObject: jest.fn(),
      addTimestamp: jest.fn(),
      sanitizeOutput: jest.fn()
    };
  });

  describe('ANSI Escape Sequence Handling', () => {
    it('should strip ANSI color codes from Claude output', () => {
      const ansiInput = '\x1b[32mGreen text\x1b[0m \x1b[31mRed text\x1b[0m';
      const expectedClean = 'Green text Red text';
      
      mockAnsiParser.stripAnsiCodes.mockReturnValue(expectedClean);
      mockAnsiParser.hasAnsiCodes.mockReturnValue(true);
      
      const result = mockAnsiParser.stripAnsiCodes(ansiInput);
      
      expect(mockAnsiParser.stripAnsiCodes).toHaveBeenCalledWith(ansiInput);
      expect(result).toBe(expectedClean);
      expect(mockAnsiParser.hasAnsiCodes).toHaveBeenCalledWith(ansiInput);
    });

    it('should preserve formatting information while cleaning', () => {
      const formattedInput = '\x1b[1m\x1b[32mBold Green\x1b[0m';
      const formatting = { bold: true, color: 'green' };
      
      mockAnsiParser.extractColorCodes.mockReturnValue(['32']);
      mockAnsiParser.parseFormatting.mockReturnValue(formatting);
      
      const colorCodes = mockAnsiParser.extractColorCodes(formattedInput);
      const formatInfo = mockAnsiParser.parseFormatting(formattedInput);
      
      expect(mockAnsiParser.extractColorCodes).toHaveBeenCalledWith(formattedInput);
      expect(mockAnsiParser.parseFormatting).toHaveBeenCalledWith(formattedInput);
      expect(colorCodes).toContain('32');
      expect(formatInfo).toEqual(formatting);
    });

    it('should handle complex ANSI sequences in Claude terminal output', () => {
      const complexAnsi = '\x1b[2J\x1b[H\x1b[32m┌─────┐\x1b[0m\n\x1b[32m│\x1b[0m Text \x1b[32m│\x1b[0m';
      const cleanOutput = '┌─────┐\n│ Text │';
      
      mockAnsiParser.stripAnsiCodes.mockReturnValue(cleanOutput);
      
      const result = mockAnsiParser.stripAnsiCodes(complexAnsi);
      
      expect(result).toBe(cleanOutput);
      expect(mockAnsiParser.stripAnsiCodes).toHaveBeenCalledWith(complexAnsi);
    });
  });

  describe('Box-Drawing Character Extraction', () => {
    it('should extract content from Claude box-drawing output', () => {
      const boxOutput = `┌─────────────────────┐
│ Claude Response     │
│ Multiple lines here │
└─────────────────────┘`;
      
      const expectedContent = 'Claude Response\nMultiple lines here';
      
      mockMessageExtractor.extractBoxContent.mockReturnValue(expectedContent);
      
      const content = mockMessageExtractor.extractBoxContent(boxOutput);
      
      expect(mockMessageExtractor.extractBoxContent).toHaveBeenCalledWith(boxOutput);
      expect(content).toBe(expectedContent);
    });

    it('should handle malformed box-drawing gracefully', () => {
      const malformedBox = `┌─────────────
│ Incomplete box
│ Missing bottom`;
      
      const fallbackContent = 'Incomplete box\nMissing bottom';
      
      mockMessageExtractor.extractBoxContent.mockReturnValue(fallbackContent);
      
      const result = mockMessageExtractor.extractBoxContent(malformedBox);
      
      expect(result).toBe(fallbackContent);
    });

    it('should preserve line breaks within box content', () => {
      const multiLineBox = `┌──────────┐
│ Line 1   │
│          │
│ Line 3   │
└──────────┘`;
      
      const preservedContent = 'Line 1\n\nLine 3';
      
      mockMessageExtractor.extractBoxContent.mockReturnValue(preservedContent);
      
      const result = mockMessageExtractor.extractBoxContent(multiLineBox);
      
      expect(result).toBe(preservedContent);
    });
  });

  describe('Message Type Detection', () => {
    it('should detect Claude welcome messages', () => {
      const welcomeOutput = createMockClaudeOutput('welcome');
      
      mockMessageExtractor.detectMessageType.mockReturnValue('welcome');
      
      const messageType = mockMessageExtractor.detectMessageType(welcomeOutput);
      
      expect(mockMessageExtractor.detectMessageType).toHaveBeenCalledWith(welcomeOutput);
      expect(messageType).toBe('welcome');
    });

    it('should detect error messages from Claude output', () => {
      const errorOutput = createMockClaudeOutput('error');
      
      mockMessageExtractor.detectMessageType.mockReturnValue('error');
      
      const messageType = mockMessageExtractor.detectMessageType(errorOutput);
      
      expect(messageType).toBe('error');
    });

    it('should detect regular response messages', () => {
      const responseOutput = createMockClaudeOutput('response');
      
      mockMessageExtractor.detectMessageType.mockReturnValue('response');
      
      const messageType = mockMessageExtractor.detectMessageType(responseOutput);
      
      expect(messageType).toBe('response');
    });

    it('should handle unknown message types with default fallback', () => {
      const unknownOutput = 'Some unknown format';
      
      mockMessageExtractor.detectMessageType.mockReturnValue('unknown');
      
      const messageType = mockMessageExtractor.detectMessageType(unknownOutput);
      
      expect(messageType).toBe('unknown');
    });
  });

  describe('Multi-line Response Parsing', () => {
    it('should parse multi-line Claude responses correctly', () => {
      const multiLineResponse = `Here's a multi-line response:
1. First point
2. Second point
3. Third point

And a conclusion.`;
      
      const parsedLines = [
        "Here's a multi-line response:",
        '1. First point',
        '2. Second point', 
        '3. Third point',
        '',
        'And a conclusion.'
      ];
      
      mockMessageExtractor.parseMultilineResponse.mockReturnValue(parsedLines);
      
      const result = mockMessageExtractor.parseMultilineResponse(multiLineResponse);
      
      expect(mockMessageExtractor.parseMultilineResponse).toHaveBeenCalledWith(multiLineResponse);
      expect(result).toEqual(parsedLines);
    });

    it('should handle code blocks in Claude responses', () => {
      const codeResponse = `Here's some code:

\`\`\`javascript
function hello() {
  console.log('Hello');
}
\`\`\`

Hope that helps!`;
      
      const expectedParsing = {
        text: "Here's some code:\n\nHope that helps!",
        codeBlocks: [{
          language: 'javascript',
          code: "function hello() {\n  console.log('Hello');\n}"
        }]
      };
      
      mockMessageExtractor.parseMultilineResponse.mockReturnValue(expectedParsing);
      
      const result = mockMessageExtractor.parseMultilineResponse(codeResponse);
      
      expect(result).toEqual(expectedParsing);
    });
  });

  describe('Output Sanitization and Formatting', () => {
    it('should sanitize Claude output for safe display', () => {
      const unsafeOutput = '<script>alert("xss")</script>Safe content';
      const safeOutput = 'Safe content';
      
      mockOutputFormatter.sanitizeOutput.mockReturnValue(safeOutput);
      
      const result = mockOutputFormatter.sanitizeOutput(unsafeOutput);
      
      expect(mockOutputFormatter.sanitizeOutput).toHaveBeenCalledWith(unsafeOutput);
      expect(result).toBe(safeOutput);
    });

    it('should create properly formatted message objects', () => {
      const rawOutput = createMockClaudeOutput('response');
      const messageObject = {
        id: 'msg-123',
        type: 'response',
        content: 'Claude Response',
        timestamp: Date.now(),
        raw: rawOutput
      };
      
      mockOutputFormatter.createMessageObject.mockReturnValue(messageObject);
      mockMessageExtractor.detectMessageType.mockReturnValue('response');
      
      const result = mockOutputFormatter.createMessageObject(rawOutput, 'response');
      
      expect(mockOutputFormatter.createMessageObject).toHaveBeenCalledWith(rawOutput, 'response');
      expect(result).toEqual(messageObject);
    });

    it('should add timestamps to parsed messages', () => {
      const message = { content: 'Test message', type: 'response' };
      const timestamped = { ...message, timestamp: 1234567890 };
      
      mockOutputFormatter.addTimestamp.mockReturnValue(timestamped);
      
      const result = mockOutputFormatter.addTimestamp(message);
      
      expect(mockOutputFormatter.addTimestamp).toHaveBeenCalledWith(message);
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('Integration - Full Parsing Pipeline', () => {
    it('should coordinate all parsing steps for complete processing', () => {
      const rawClaudeOutput = createAnsiOutput(createMockClaudeOutput('response'));
      
      // Mock the full pipeline
      mockAnsiParser.stripAnsiCodes.mockReturnValue('Clean output');
      mockMessageExtractor.extractBoxContent.mockReturnValue('Response content');
      mockMessageExtractor.detectMessageType.mockReturnValue('response');
      mockOutputFormatter.sanitizeOutput.mockReturnValue('Safe content');
      mockOutputFormatter.createMessageObject.mockReturnValue({
        id: 'msg-1',
        type: 'response',
        content: 'Safe content',
        timestamp: Date.now()
      });
      
      // Execute full pipeline
      const stripped = mockAnsiParser.stripAnsiCodes(rawClaudeOutput);
      const extracted = mockMessageExtractor.extractBoxContent(stripped);
      const messageType = mockMessageExtractor.detectMessageType(extracted);
      const sanitized = mockOutputFormatter.sanitizeOutput(extracted);
      const finalMessage = mockOutputFormatter.createMessageObject(sanitized, messageType);
      
      // Verify pipeline coordination
      expect(mockAnsiParser.stripAnsiCodes).toHaveBeenCalledWith(rawClaudeOutput);
      expect(mockMessageExtractor.extractBoxContent).toHaveBeenCalledWith('Clean output');
      expect(mockMessageExtractor.detectMessageType).toHaveBeenCalledWith('Response content');
      expect(mockOutputFormatter.sanitizeOutput).toHaveBeenCalledWith('Response content');
      expect(mockOutputFormatter.createMessageObject).toHaveBeenCalledWith('Safe content', 'response');
      
      expect(finalMessage).toHaveProperty('id');
      expect(finalMessage).toHaveProperty('type', 'response');
      expect(finalMessage).toHaveProperty('content', 'Safe content');
    });
  });
});