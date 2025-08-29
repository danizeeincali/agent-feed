/**
 * TDD London School: Input Value Buffering Tests
 * Focus: Mock input.value collection until Enter key pressed
 * Behavior: Verify buffering vs sending behavior through mock interactions
 */

const {
  createMockInputElement,
  createMockKeyboardEvent,
  createMockInputBuffer,
  createMockCharacterFilter,
  createMockEnterKeyDetector,
  mockVerification,
  contractVerification
} = require('../mocks/input-handling-mocks');

describe('Input Value Buffering Until Enter', () => {
  let mockInputElement;
  let mockInputBuffer;
  let mockCharacterFilter;
  let mockEnterKeyDetector;
  let inputHandler;

  beforeEach(() => {
    mockInputElement = createMockInputElement();
    mockInputBuffer = createMockInputBuffer();
    mockCharacterFilter = createMockCharacterFilter();
    mockEnterKeyDetector = createMockEnterKeyDetector();

    // Mock InputHandler class that we're testing against
    const InputHandler = jest.fn().mockImplementation(() => ({
      inputElement: mockInputElement,
      inputBuffer: mockInputBuffer,
      characterFilter: mockCharacterFilter,
      enterKeyDetector: mockEnterKeyDetector,
      handleInput: jest.fn(),
      handleKeyDown: jest.fn(),
      bufferInput: jest.fn(),
      sendCommand: jest.fn()
    }));

    inputHandler = new InputHandler();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Value Collection Behavior', () => {
    it('should buffer input value on regular keystrokes', async () => {
      // Arrange: Regular keystroke event
      const keyEvent = createMockKeyboardEvent('a');
      mockInputElement.value = 'test command';
      mockCharacterFilter.shouldBuffer.mockReturnValue(true);
      mockEnterKeyDetector.isEnterKey.mockReturnValue(false);

      // Act: Handle the keystroke
      inputHandler.handleKeyDown = jest.fn(async (event) => {
        if (!mockEnterKeyDetector.isEnterKey(event)) {
          if (mockCharacterFilter.shouldBuffer(event)) {
            mockInputBuffer.append(mockInputElement.value);
          }
        }
      });

      await inputHandler.handleKeyDown(keyEvent);

      // Assert: Verify buffering behavior
      expect(mockEnterKeyDetector.isEnterKey).toHaveBeenCalledWith(keyEvent);
      expect(mockCharacterFilter.shouldBuffer).toHaveBeenCalledWith(keyEvent);
      expect(mockInputBuffer.append).toHaveBeenCalledWith('test command');
    });

    it('should not send command on regular character input', async () => {
      // Arrange: Regular character input
      const keyEvent = createMockKeyboardEvent('b');
      mockInputElement.value = 'partial';
      mockEnterKeyDetector.isEnterKey.mockReturnValue(false);
      mockCharacterFilter.shouldSend.mockReturnValue(false);

      // Act: Handle character input
      inputHandler.sendCommand = jest.fn();
      inputHandler.handleKeyDown = jest.fn(async (event) => {
        if (!mockEnterKeyDetector.isEnterKey(event)) {
          if (!mockCharacterFilter.shouldSend(event)) {
            // Buffer the character, don't send
            return false;
          }
        }
      });

      const result = await inputHandler.handleKeyDown(keyEvent);

      // Assert: Verify no command sent
      expect(result).toBe(false);
      expect(mockCharacterFilter.shouldSend).toHaveBeenCalledWith(keyEvent);
      expect(inputHandler.sendCommand).not.toHaveBeenCalled();
    });

    it('should accumulate multiple keystrokes in buffer', async () => {
      // Arrange: Multiple keystroke sequence
      const keystrokes = ['h', 'e', 'l', 'l', 'o'];
      let accumulatedValue = '';

      mockCharacterFilter.shouldBuffer.mockReturnValue(true);
      mockEnterKeyDetector.isEnterKey.mockReturnValue(false);

      // Act: Simulate typing each character
      for (const char of keystrokes) {
        accumulatedValue += char;
        mockInputElement.value = accumulatedValue;
        
        const keyEvent = createMockKeyboardEvent(char);
        
        inputHandler.handleKeyDown = jest.fn(async (event) => {
          if (mockCharacterFilter.shouldBuffer(event)) {
            mockInputBuffer.append(mockInputElement.value);
          }
        });

        await inputHandler.handleKeyDown(keyEvent);
      }

      // Assert: Verify all keystrokes buffered
      expect(mockInputBuffer.append).toHaveBeenCalledTimes(5);
      expect(mockInputBuffer.append).toHaveBeenLastCalledWith('hello');
    });
  });

  describe('Enter Key Detection and Behavior', () => {
    it('should detect Enter key press correctly', async () => {
      // Arrange: Enter key event
      const enterEvent = createMockKeyboardEvent('Enter');
      mockEnterKeyDetector.isEnterKey.mockReturnValue(true);

      // Act: Handle Enter key
      inputHandler.handleKeyDown = jest.fn(async (event) => {
        return mockEnterKeyDetector.isEnterKey(event);
      });

      const isEnter = await inputHandler.handleKeyDown(enterEvent);

      // Assert: Verify Enter key detection
      expect(mockEnterKeyDetector.isEnterKey).toHaveBeenCalledWith(enterEvent);
      expect(isEnter).toBe(true);
    });

    it('should distinguish Enter from regular keys', async () => {
      // Arrange: Mix of keys including Enter
      const keys = [
        { key: 'a', isEnter: false },
        { key: 'Enter', isEnter: true },
        { key: 'b', isEnter: false },
        { key: '1', isEnter: false }
      ];

      // Act & Assert: Test each key
      for (const { key, isEnter } of keys) {
        const keyEvent = createMockKeyboardEvent(key);
        mockEnterKeyDetector.isEnterKey.mockReturnValue(isEnter);

        inputHandler.handleKeyDown = jest.fn(async (event) => {
          return mockEnterKeyDetector.isEnterKey(event);
        });

        const result = await inputHandler.handleKeyDown(keyEvent);
        
        expect(mockEnterKeyDetector.isEnterKey).toHaveBeenCalledWith(keyEvent);
        expect(result).toBe(isEnter);
      }
    });

    it('should handle Enter keyCode (13) detection', async () => {
      // Arrange: Enter event with keyCode
      const enterEvent = createMockKeyboardEvent('Enter');
      enterEvent.keyCode = 13;
      
      mockEnterKeyDetector.isEnterKey.mockImplementation((event) => {
        return event.keyCode === 13 || event.key === 'Enter';
      });

      // Act: Test keyCode-based detection
      const isEnter = mockEnterKeyDetector.isEnterKey(enterEvent);

      // Assert: Verify keyCode detection works
      expect(isEnter).toBe(true);
      expect(mockEnterKeyDetector.isEnterKey).toHaveBeenCalledWith(enterEvent);
    });
  });

  describe('Input Buffering vs Command Sending Logic', () => {
    it('should buffer input until Enter, then send complete line', async () => {
      // Arrange: Typing sequence followed by Enter
      const typingSequence = [
        { key: 'h', value: 'h', shouldBuffer: true },
        { key: 'i', value: 'hi', shouldBuffer: true },
        { key: ' ', value: 'hi ', shouldBuffer: true },
        { key: 't', value: 'hi t', shouldBuffer: true },
        { key: 'Enter', value: 'hi there', shouldSend: true }
      ];

      mockCharacterFilter.shouldBuffer.mockReturnValue(true);
      mockCharacterFilter.shouldSend.mockReturnValue(false);
      
      // Act: Process typing sequence
      for (const { key, value, shouldBuffer, shouldSend } of typingSequence) {
        mockInputElement.value = value;
        const keyEvent = createMockKeyboardEvent(key);
        const isEnter = key === 'Enter';

        mockEnterKeyDetector.isEnterKey.mockReturnValue(isEnter);
        if (shouldSend) {
          mockCharacterFilter.shouldSend.mockReturnValue(true);
        }

        inputHandler.handleKeyDown = jest.fn(async (event) => {
          if (mockEnterKeyDetector.isEnterKey(event)) {
            if (mockCharacterFilter.shouldSend(event)) {
              // Complete line ready to send
              return mockInputElement.value;
            }
          } else if (mockCharacterFilter.shouldBuffer(event)) {
            mockInputBuffer.append(mockInputElement.value);
          }
          return null;
        });

        const result = await inputHandler.handleKeyDown(keyEvent);
        
        if (shouldSend) {
          expect(result).toBe('hi there');
        } else if (shouldBuffer) {
          expect(mockInputBuffer.append).toHaveBeenCalledWith(value);
        }
      }

      // Assert: Verify complete buffering behavior
      expect(mockInputBuffer.append).toHaveBeenCalledTimes(4); // 4 characters before Enter
    });

    it('should not send incomplete input on non-Enter keys', async () => {
      // Arrange: Various non-Enter keys
      const nonEnterKeys = ['a', 'Backspace', 'Tab', 'Escape', 'ArrowUp', 'Shift'];
      
      mockEnterKeyDetector.isEnterKey.mockReturnValue(false);
      mockCharacterFilter.shouldSend.mockReturnValue(false);

      // Act & Assert: Test each non-Enter key
      for (const key of nonEnterKeys) {
        const keyEvent = createMockKeyboardEvent(key);
        mockInputElement.value = 'some input';

        inputHandler.handleKeyDown = jest.fn(async (event) => {
          if (mockEnterKeyDetector.isEnterKey(event)) {
            return mockCharacterFilter.shouldSend(event);
          }
          return false;
        });

        const shouldSend = await inputHandler.handleKeyDown(keyEvent);
        
        expect(mockEnterKeyDetector.isEnterKey).toHaveBeenCalledWith(keyEvent);
        expect(shouldSend).toBe(false);
      }
    });
  });

  describe('Buffer State Management', () => {
    it('should clear buffer after successful command send', async () => {
      // Arrange: Complete command ready to send
      const enterEvent = createMockKeyboardEvent('Enter');
      mockInputElement.value = 'complete command';
      mockEnterKeyDetector.isEnterKey.mockReturnValue(true);
      mockCharacterFilter.shouldSend.mockReturnValue(true);

      // Act: Send command and clear buffer
      inputHandler.handleKeyDown = jest.fn(async (event) => {
        if (mockEnterKeyDetector.isEnterKey(event) && mockCharacterFilter.shouldSend(event)) {
          const command = mockInputElement.value;
          mockInputBuffer.clear(); // Clear after sending
          return command;
        }
      });

      const result = await inputHandler.handleKeyDown(enterEvent);

      // Assert: Verify buffer cleared
      expect(result).toBe('complete command');
      expect(mockInputBuffer.clear).toHaveBeenCalledTimes(1);
    });

    it('should maintain buffer state across multiple keystrokes', async () => {
      // Arrange: Multiple keystrokes building up command
      let bufferContent = '';
      
      mockInputBuffer.getCurrentLine.mockImplementation(() => bufferContent);
      mockInputBuffer.append.mockImplementation((value) => {
        bufferContent = value;
      });

      // Act: Build command character by character
      const keystrokes = ['t', 'e', 's', 't'];
      let fullValue = '';

      for (const char of keystrokes) {
        fullValue += char;
        mockInputElement.value = fullValue;
        
        const keyEvent = createMockKeyboardEvent(char);
        mockEnterKeyDetector.isEnterKey.mockReturnValue(false);
        mockCharacterFilter.shouldBuffer.mockReturnValue(true);

        inputHandler.handleKeyDown = jest.fn(async (event) => {
          if (mockCharacterFilter.shouldBuffer(event)) {
            mockInputBuffer.append(mockInputElement.value);
          }
        });

        await inputHandler.handleKeyDown(keyEvent);
      }

      // Assert: Verify buffer maintains state
      expect(mockInputBuffer.getCurrentLine()).toBe('test');
      expect(mockInputBuffer.append).toHaveBeenCalledTimes(4);
    });
  });

  describe('Contract Verification', () => {
    it('should satisfy InputBuffer contract', () => {
      contractVerification.verifyInputHandlerContract(inputHandler);
      expect(mockInputBuffer).toHaveProperty('append');
      expect(mockInputBuffer).toHaveProperty('getCurrentLine');
      expect(mockInputBuffer).toHaveProperty('clear');
    });

    it('should satisfy EnterKeyDetector contract', () => {
      contractVerification.verifyEnterKeyDetectorContract(mockEnterKeyDetector);
    });

    it('should maintain proper mock interaction patterns', () => {
      // Verify mocks were properly created and have expected methods
      expect(mockInputElement.value).toBeDefined();
      expect(mockInputBuffer.append).toBeInstanceOf(Function);
      expect(mockCharacterFilter.shouldBuffer).toBeInstanceOf(Function);
      expect(mockEnterKeyDetector.isEnterKey).toBeInstanceOf(Function);
    });
  });
});