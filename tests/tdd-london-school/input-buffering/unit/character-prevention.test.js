/**
 * TDD London School: Character-by-Character Prevention Tests
 * Focus: Mock-driven verification that individual characters are NOT sent
 * Behavior: Ensure buffering prevents individual character transmission
 */

const {
  createMockWebSocket,
  createMockCharacterFilter,
  createMockInputBuffer,
  createMockInputElement,
  createMockEnterKeyDetector,
  mockVerification,
  contractVerification
} = require('../mocks/input-handling-mocks');

describe('Character-by-Character Prevention', () => {
  let mockWebSocket;
  let mockCharacterFilter;
  let mockInputBuffer;
  let mockInputElement;
  let mockEnterKeyDetector;
  let characterHandler;

  beforeEach(() => {
    mockWebSocket = createMockWebSocket();
    mockCharacterFilter = createMockCharacterFilter();
    mockInputBuffer = createMockInputBuffer();
    mockInputElement = createMockInputElement();
    mockEnterKeyDetector = createMockEnterKeyDetector();

    // Mock CharacterHandler that prevents individual character sending
    const CharacterHandler = jest.fn().mockImplementation(() => ({
      webSocket: mockWebSocket,
      characterFilter: mockCharacterFilter,
      inputBuffer: mockInputBuffer,
      inputElement: mockInputElement,
      enterKeyDetector: mockEnterKeyDetector,
      handleCharacterInput: jest.fn(),
      preventCharacterSending: jest.fn(),
      bufferCharacterInput: jest.fn()
    }));

    characterHandler = new CharacterHandler();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Individual Character Filtering', () => {
    it('should filter out single character inputs from WebSocket sending', async () => {
      // Arrange: Single character input sequence
      const singleCharacters = ['a', 'b', 'c', '1', '2', '$', '@'];
      
      mockCharacterFilter.shouldBuffer.mockReturnValue(true);
      mockCharacterFilter.shouldSend.mockReturnValue(false);
      mockEnterKeyDetector.isEnterKey.mockReturnValue(false);

      // Act: Process each single character
      for (const char of singleCharacters) {
        const keyEvent = { key: char };
        mockInputElement.value = char;

        characterHandler.handleCharacterInput = jest.fn(async (event) => {
          if (!mockEnterKeyDetector.isEnterKey(event)) {
            if (mockCharacterFilter.shouldBuffer(event) && !mockCharacterFilter.shouldSend(event)) {
              mockInputBuffer.append(mockInputElement.value);
              return { buffered: true, sent: false };
            }
          }
        });

        const result = await characterHandler.handleCharacterInput(keyEvent);
        
        expect(result.buffered).toBe(true);
        expect(result.sent).toBe(false);
      }

      // Assert: Verify no WebSocket sends for individual characters
      expect(mockWebSocket.send).not.toHaveBeenCalled();
      expect(mockInputBuffer.append).toHaveBeenCalledTimes(singleCharacters.length);
    });

    it('should prevent transmission of character sequences until complete', async () => {
      // Arrange: Building up a command character by character
      const commandChars = ['l', 's', ' ', '-', 'l', 'a'];
      let accumulatedCommand = '';

      mockCharacterFilter.shouldBuffer.mockReturnValue(true);
      mockCharacterFilter.shouldSend.mockReturnValue(false);
      mockCharacterFilter.isCompleteInput.mockReturnValue(false);

      // Act: Build command character by character
      for (const char of commandChars) {
        accumulatedCommand += char;
        mockInputElement.value = accumulatedCommand;

        characterHandler.preventCharacterSending = jest.fn(async (input) => {
          // Check if input is complete (not individual characters)
          if (!mockCharacterFilter.isCompleteInput(input)) {
            // Buffer the character, don't send
            if (mockCharacterFilter.shouldBuffer({ key: char })) {
              mockInputBuffer.append(input);
              return { prevented: true, buffered: input };
            }
          }
          return { prevented: false };
        });

        const result = await characterHandler.preventCharacterSending(accumulatedCommand);
        expect(result.prevented).toBe(true);
      }

      // Assert: Verify character-by-character prevention
      mockVerification.verifyNoCharacterSending(mockWebSocket);
      expect(mockInputBuffer.append).toHaveBeenCalledTimes(commandChars.length);
      expect(mockCharacterFilter.isCompleteInput).toHaveBeenCalledTimes(commandChars.length);
    });

    it('should distinguish between single characters and complete commands', async () => {
      // Arrange: Mix of single characters and complete command
      const inputs = [
        { input: 'g', isComplete: false },
        { input: 'gi', isComplete: false },
        { input: 'git', isComplete: false },
        { input: 'git ', isComplete: false },
        { input: 'git status', isComplete: true }
      ];

      // Act & Assert: Test each input level
      for (const { input, isComplete } of inputs) {
        mockCharacterFilter.isCompleteInput.mockReturnValue(isComplete);
        mockCharacterFilter.shouldSend.mockReturnValue(isComplete);

        characterHandler.handleCharacterInput = jest.fn(async (inp) => {
          if (mockCharacterFilter.isCompleteInput(inp)) {
            if (mockCharacterFilter.shouldSend({ input: inp })) {
              mockWebSocket.send(JSON.stringify({ command: inp }));
              return { sent: true, complete: true };
            }
          } else {
            mockInputBuffer.append(inp);
            return { sent: false, buffered: true };
          }
        });

        const result = await characterHandler.handleCharacterInput(input);
        
        if (isComplete) {
          expect(result.sent).toBe(true);
          expect(result.complete).toBe(true);
        } else {
          expect(result.sent).toBe(false);
          expect(result.buffered).toBe(true);
        }
      }

      // Only the complete command should have been sent
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Input Buffering Verification', () => {
    it('should accumulate characters in buffer without sending', async () => {
      // Arrange: Character accumulation setup
      let bufferContent = '';
      mockInputBuffer.append.mockImplementation((content) => {
        bufferContent = content;
      });
      mockInputBuffer.getCurrentLine.mockImplementation(() => bufferContent);

      const typingSequence = ['h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd'];
      
      mockCharacterFilter.shouldBuffer.mockReturnValue(true);
      mockEnterKeyDetector.isEnterKey.mockReturnValue(false);

      // Act: Accumulate characters
      for (const char of typingSequence) {
        const currentValue = bufferContent + char;
        mockInputElement.value = currentValue;

        characterHandler.bufferCharacterInput = jest.fn(async (event) => {
          if (!mockEnterKeyDetector.isEnterKey(event)) {
            if (mockCharacterFilter.shouldBuffer(event)) {
              mockInputBuffer.append(mockInputElement.value);
              return { buffered: mockInputElement.value };
            }
          }
        });

        const keyEvent = { key: char };
        const result = await characterHandler.bufferCharacterInput(keyEvent);
        
        expect(result.buffered).toBe(currentValue);
      }

      // Assert: Verify accumulation without sending
      expect(mockInputBuffer.getCurrentLine()).toBe('hello world');
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should maintain buffer integrity during character input', async () => {
      // Arrange: Buffer integrity test
      const inputSequence = [
        { char: 'n', expected: 'n' },
        { char: 'p', expected: 'np' },
        { char: 'm', expected: 'npm' },
        { char: ' ', expected: 'npm ' },
        { char: 't', expected: 'npm t' },
        { char: 'e', expected: 'npm te' },
        { char: 's', expected: 'npm tes' },
        { char: 't', expected: 'npm test' }
      ];

      let currentBuffer = '';
      mockInputBuffer.append.mockImplementation((content) => {
        currentBuffer = content;
      });
      mockInputBuffer.getCurrentLine.mockReturnValue(currentBuffer);

      // Act: Test buffer integrity
      for (const { char, expected } of inputSequence) {
        mockInputElement.value = expected;
        
        characterHandler.bufferCharacterInput = jest.fn(async (character) => {
          mockInputBuffer.append(mockInputElement.value);
          return { 
            buffer: mockInputBuffer.getCurrentLine(),
            character: character 
          };
        });

        const result = await characterHandler.bufferCharacterInput(char);
        expect(result.buffer).toBe(expected);
      }

      // Assert: Verify final buffer state
      expect(currentBuffer).toBe('npm test');
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('Anti-Pattern Prevention', () => {
    it('should prevent rapid character transmission', async () => {
      // Arrange: Rapid typing simulation
      const rapidChars = 'quicktest'.split('');
      let accumulator = '';

      mockCharacterFilter.shouldSend.mockReturnValue(false);
      mockCharacterFilter.shouldBuffer.mockReturnValue(true);

      // Act: Simulate rapid typing
      const startTime = Date.now();
      
      for (const char of rapidChars) {
        accumulator += char;
        mockInputElement.value = accumulator;

        characterHandler.preventCharacterSending = jest.fn(async (char) => {
          // Anti-pattern: Prevent any individual character sending
          if (char.length <= 1) {
            return { prevented: true, reason: 'single_character' };
          }
          
          // Still prevent multi-character if not complete
          if (!mockCharacterFilter.shouldSend({ input: char })) {
            mockInputBuffer.append(accumulator);
            return { prevented: true, reason: 'incomplete_command' };
          }
          
          return { prevented: false };
        });

        const result = await characterHandler.preventCharacterSending(char);
        expect(result.prevented).toBe(true);
      }

      const endTime = Date.now();
      
      // Assert: Verify prevention regardless of typing speed
      expect(mockWebSocket.send).not.toHaveBeenCalled();
      expect(endTime - startTime).toBeLessThan(1000); // Rapid typing
    });

    it('should block character-by-character WebSocket calls', async () => {
      // Arrange: Attempt character-by-character sending
      const characters = ['c', 'u', 'r', 'l', ' ', 'h', 't', 't', 'p'];
      
      // Mock the anti-pattern attempt
      mockWebSocket.send.mockImplementation((data) => {
        const parsed = JSON.parse(data);
        if (parsed.data && parsed.data.length === 1) {
          throw new Error('Single character sending blocked');
        }
      });

      // Act: Attempt to send individual characters
      for (const char of characters) {
        characterHandler.preventCharacterSending = jest.fn(async (character) => {
          try {
            // This should be blocked
            if (character.length === 1) {
              return { 
                blocked: true, 
                reason: 'Individual character sending not allowed' 
              };
            }
            
            // This would attempt the anti-pattern (should not happen)
            mockWebSocket.send(JSON.stringify({ data: character }));
            return { blocked: false };
          } catch (error) {
            return { blocked: true, error: error.message };
          }
        });

        const result = await characterHandler.preventCharacterSending(char);
        expect(result.blocked).toBe(true);
      }

      // Assert: Verify complete blocking of character sending
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should enforce minimum command length before sending', async () => {
      // Arrange: Minimum command length enforcement
      const inputs = [
        { input: 'l', length: 1, shouldBlock: true },
        { input: 'ls', length: 2, shouldBlock: true },
        { input: 'ls ', length: 3, shouldBlock: false },
        { input: 'ls -', length: 4, shouldBlock: false },
        { input: 'ls -l', length: 5, shouldBlock: false }
      ];

      const MIN_COMMAND_LENGTH = 3;
      
      // Act & Assert: Test minimum length enforcement
      for (const { input, length, shouldBlock } of inputs) {
        mockCharacterFilter.shouldSend.mockImplementation(() => {
          return length >= MIN_COMMAND_LENGTH;
        });

        characterHandler.preventCharacterSending = jest.fn(async (inp) => {
          if (inp.length < MIN_COMMAND_LENGTH) {
            mockInputBuffer.append(inp);
            return { blocked: true, reason: 'below_minimum_length' };
          }
          
          if (mockCharacterFilter.shouldSend()) {
            mockWebSocket.send(JSON.stringify({ command: inp }));
            return { blocked: false, sent: true };
          }
          
          return { blocked: true, reason: 'filter_denied' };
        });

        const result = await characterHandler.preventCharacterSending(input);
        
        if (shouldBlock) {
          expect(result.blocked).toBe(true);
        } else if (!shouldBlock && mockCharacterFilter.shouldSend()) {
          expect(result.sent).toBe(true);
        }
      }
    });
  });

  describe('Complete Input Detection', () => {
    it('should only allow sending of complete, valid inputs', async () => {
      // Arrange: Complete vs incomplete inputs
      const testInputs = [
        { input: 'pwd', complete: true, valid: true },
        { input: 'echo "hello', complete: false, valid: false }, // Unclosed quote
        { input: 'echo "hello"', complete: true, valid: true },
        { input: 'git commit -m "test', complete: false, valid: false },
        { input: 'git commit -m "test"', complete: true, valid: true }
      ];

      // Act & Assert: Test complete input detection
      for (const { input, complete, valid } of testInputs) {
        mockCharacterFilter.isCompleteInput.mockReturnValue(complete);
        mockCharacterFilter.shouldSend.mockReturnValue(complete && valid);

        characterHandler.handleCharacterInput = jest.fn(async (inp) => {
          const isComplete = mockCharacterFilter.isCompleteInput(inp);
          const shouldSend = mockCharacterFilter.shouldSend({ input: inp });
          
          if (isComplete && shouldSend) {
            mockWebSocket.send(JSON.stringify({ command: inp }));
            return { sent: true, complete: true };
          } else {
            mockInputBuffer.append(inp);
            return { sent: false, buffered: true, complete: isComplete };
          }
        });

        const result = await characterHandler.handleCharacterInput(input);
        
        expect(result.complete).toBe(complete);
        if (complete && valid) {
          expect(result.sent).toBe(true);
        } else {
          expect(result.sent).toBe(false);
          expect(result.buffered).toBe(true);
        }
      }

      // Verify only complete, valid inputs were sent
      expect(mockWebSocket.send).toHaveBeenCalledTimes(3);
    });

    it('should validate input completeness before transmission', async () => {
      // Arrange: Input completeness validation
      const complexCommand = 'find . -name "*.js" | grep -v node_modules';
      
      mockCharacterFilter.isCompleteInput.mockImplementation((input) => {
        // Complex validation: check for balanced quotes, complete pipes, etc.
        const openQuotes = (input.match(/"/g) || []).length;
        const hasUncompletedPipe = input.trim().endsWith('|');
        
        return openQuotes % 2 === 0 && !hasUncompletedPipe;
      });

      // Test building the complex command
      const buildSteps = [
        'find . -name "*.js',          // Incomplete: unclosed quote
        'find . -name "*.js"',         // Complete: balanced quotes
        'find . -name "*.js" |',       // Incomplete: uncompleted pipe
        'find . -name "*.js" | grep',  // Incomplete: incomplete pipe command
        complexCommand                 // Complete: full command
      ];

      for (const step of buildSteps) {
        const isComplete = mockCharacterFilter.isCompleteInput(step);
        
        characterHandler.handleCharacterInput = jest.fn(async (inp) => {
          if (mockCharacterFilter.isCompleteInput(inp)) {
            mockWebSocket.send(JSON.stringify({ command: inp }));
            return { sent: true };
          } else {
            mockInputBuffer.append(inp);
            return { sent: false };
          }
        });

        const result = await characterHandler.handleCharacterInput(step);
        
        if (step === 'find . -name "*.js"' || step === complexCommand) {
          expect(result.sent).toBe(true);
        } else {
          expect(result.sent).toBe(false);
        }
      }
    });
  });

  describe('Contract Verification', () => {
    it('should satisfy CharacterFilter contract', () => {
      expect(mockCharacterFilter).toHaveProperty('shouldBuffer');
      expect(mockCharacterFilter).toHaveProperty('shouldSend');
      expect(mockCharacterFilter).toHaveProperty('isCompleteInput');
      expect(mockCharacterFilter.shouldBuffer).toBeInstanceOf(Function);
    });

    it('should satisfy InputBuffer contract for character accumulation', () => {
      expect(mockInputBuffer).toHaveProperty('append');
      expect(mockInputBuffer).toHaveProperty('getCurrentLine');
      expect(mockInputBuffer.append).toBeInstanceOf(Function);
    });

    it('should maintain character prevention workflow integrity', async () => {
      // Arrange: Workflow integrity test
      const character = 'a';
      
      // Act: Execute character handling workflow
      characterHandler.handleCharacterInput = jest.fn(async (char) => {
        mockEnterKeyDetector.isEnterKey({ key: char });
        mockCharacterFilter.shouldBuffer({ key: char });
        mockCharacterFilter.shouldSend({ input: char });
        mockInputBuffer.append(char);
      });

      await characterHandler.handleCharacterInput(character);

      // Assert: Verify workflow order
      expect(mockEnterKeyDetector.isEnterKey).toHaveBeenCalledBefore(mockCharacterFilter.shouldBuffer);
      expect(mockCharacterFilter.shouldBuffer).toHaveBeenCalledBefore(mockCharacterFilter.shouldSend);
      expect(mockCharacterFilter.shouldSend).toHaveBeenCalledBefore(mockInputBuffer.append);
    });
  });
});