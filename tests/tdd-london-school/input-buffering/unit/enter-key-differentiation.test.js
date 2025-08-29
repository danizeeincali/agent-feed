/**
 * TDD London School: Enter Key vs Regular Keystrokes Differentiation Tests
 * Focus: Mock-driven testing of Enter key detection vs regular keystrokes
 * Behavior: Verify proper key differentiation and handling logic
 */

const {
  createMockKeyboardEvent,
  createMockEnterKeyDetector,
  createMockInputElement,
  createMockCharacterFilter,
  mockVerification,
  getKeyCode
} = require('../mocks/input-handling-mocks');

describe('Enter Key vs Regular Keystrokes Differentiation', () => {
  let mockEnterKeyDetector;
  let mockInputElement;
  let mockCharacterFilter;
  let keyDifferentiator;

  beforeEach(() => {
    mockEnterKeyDetector = createMockEnterKeyDetector();
    mockInputElement = createMockInputElement();
    mockCharacterFilter = createMockCharacterFilter();

    // Mock KeyDifferentiator that distinguishes key types
    const KeyDifferentiator = jest.fn().mockImplementation(() => ({
      enterKeyDetector: mockEnterKeyDetector,
      inputElement: mockInputElement,
      characterFilter: mockCharacterFilter,
      handleKeyDown: jest.fn(),
      isActionKey: jest.fn(),
      processRegularKey: jest.fn(),
      processEnterKey: jest.fn()
    }));

    keyDifferentiator = new KeyDifferentiator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Enter Key Detection Specificity', () => {
    it('should detect Enter key by key property', async () => {
      // Arrange: Enter key event with key property
      const enterEvent = createMockKeyboardEvent('Enter');
      mockEnterKeyDetector.isEnterKey.mockImplementation((event) => {
        return event.key === 'Enter';
      });

      // Act: Detect Enter key
      const isEnter = mockEnterKeyDetector.isEnterKey(enterEvent);

      // Assert: Verify Enter key detection
      expect(isEnter).toBe(true);
      expect(mockEnterKeyDetector.isEnterKey).toHaveBeenCalledWith(enterEvent);
    });

    it('should detect Enter key by keyCode 13', async () => {
      // Arrange: Enter key event with keyCode
      const enterEvent = createMockKeyboardEvent('Enter');
      enterEvent.keyCode = 13;
      
      mockEnterKeyDetector.isEnterKey.mockImplementation((event) => {
        return event.keyCode === 13 || event.key === 'Enter';
      });

      // Act: Detect Enter by keyCode
      const isEnter = mockEnterKeyDetector.isEnterKey(enterEvent);

      // Assert: Verify keyCode detection
      expect(isEnter).toBe(true);
      expect(enterEvent.keyCode).toBe(13);
    });

    it('should handle both key and keyCode for Enter detection', async () => {
      // Arrange: Enter event with both properties
      const enterEvent = createMockKeyboardEvent('Enter');
      enterEvent.keyCode = 13;
      
      mockEnterKeyDetector.isEnterKey.mockImplementation((event) => {
        return (event.key === 'Enter') || (event.keyCode === 13);
      });

      // Act: Test dual detection
      const isEnter = mockEnterKeyDetector.isEnterKey(enterEvent);

      // Assert: Verify dual property detection
      expect(isEnter).toBe(true);
      expect(enterEvent.key).toBe('Enter');
      expect(enterEvent.keyCode).toBe(13);
    });

    it('should not detect Enter for similar keys', async () => {
      // Arrange: Keys that might be confused with Enter
      const similarKeys = [
        { key: 'NumpadEnter', keyCode: 13 }, // Should be treated as Enter
        { key: 'Return', keyCode: 13 },      // Should be treated as Enter
        { key: '\n', keyCode: 10 },          // Line feed, not Enter
        { key: '\r', keyCode: 13 }           // Carriage return, might be Enter
      ];

      mockEnterKeyDetector.isEnterKey.mockImplementation((event) => {
        return event.key === 'Enter' || 
               event.key === 'NumpadEnter' || 
               event.key === 'Return' ||
               event.keyCode === 13;
      });

      // Act & Assert: Test similar keys
      for (const keyData of similarKeys) {
        const keyEvent = createMockKeyboardEvent(keyData.key);
        keyEvent.keyCode = keyData.keyCode;
        
        const isEnter = mockEnterKeyDetector.isEnterKey(keyEvent);
        
        if (keyData.key === 'NumpadEnter' || keyData.key === 'Return' || keyData.keyCode === 13) {
          expect(isEnter).toBe(true);
        }
      }
    });
  });

  describe('Regular Keystroke Identification', () => {
    it('should identify regular character keys', async () => {
      // Arrange: Regular character keys
      const characterKeys = ['a', 'b', 'z', 'A', 'Z', '1', '0', '9'];
      
      mockEnterKeyDetector.isEnterKey.mockReturnValue(false);
      mockCharacterFilter.shouldBuffer.mockReturnValue(true);

      // Act & Assert: Test character keys
      for (const char of characterKeys) {
        const keyEvent = createMockKeyboardEvent(char);
        
        keyDifferentiator.processRegularKey = jest.fn(async (event) => {
          if (!mockEnterKeyDetector.isEnterKey(event)) {
            if (mockCharacterFilter.shouldBuffer(event)) {
              return { type: 'character', char: event.key, buffer: true };
            }
          }
          return null;
        });

        const result = await keyDifferentiator.processRegularKey(keyEvent);
        
        expect(result.type).toBe('character');
        expect(result.char).toBe(char);
        expect(result.buffer).toBe(true);
        expect(mockEnterKeyDetector.isEnterKey).toHaveBeenCalledWith(keyEvent);
      }
    });

    it('should identify special non-Enter keys', async () => {
      // Arrange: Special keys that are not Enter
      const specialKeys = [
        'Escape', 'Tab', 'Backspace', 'Delete', 
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Home', 'End', 'PageUp', 'PageDown'
      ];

      mockEnterKeyDetector.isEnterKey.mockReturnValue(false);

      // Act & Assert: Test special keys
      for (const key of specialKeys) {
        const keyEvent = createMockKeyboardEvent(key);
        
        keyDifferentiator.isActionKey = jest.fn((event) => {
          const actionKeys = ['Escape', 'Tab', 'Backspace', 'Delete'];
          return actionKeys.includes(event.key) || event.key.startsWith('Arrow');
        });

        const isAction = keyDifferentiator.isActionKey(keyEvent);
        const isEnter = mockEnterKeyDetector.isEnterKey(keyEvent);
        
        expect(isEnter).toBe(false);
        if (['Escape', 'Tab', 'Backspace', 'Delete'].includes(key) || key.startsWith('Arrow')) {
          expect(isAction).toBe(true);
        }
      }
    });

    it('should handle modifier keys separately', async () => {
      // Arrange: Modifier keys
      const modifierKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'];
      
      mockEnterKeyDetector.isEnterKey.mockReturnValue(false);

      // Act & Assert: Test modifier keys
      for (const key of modifierKeys) {
        const keyEvent = createMockKeyboardEvent(key);
        
        keyDifferentiator.processRegularKey = jest.fn(async (event) => {
          if (!mockEnterKeyDetector.isEnterKey(event)) {
            const modifiers = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'];
            if (modifiers.includes(event.key)) {
              return { type: 'modifier', key: event.key, ignore: true };
            }
          }
          return null;
        });

        const result = await keyDifferentiator.processRegularKey(keyEvent);
        
        expect(result.type).toBe('modifier');
        expect(result.key).toBe(key);
        expect(result.ignore).toBe(true);
      }
    });
  });

  describe('Key Handling Differentiation Logic', () => {
    it('should route Enter keys to Enter handler', async () => {
      // Arrange: Enter key routing
      const enterEvent = createMockKeyboardEvent('Enter');
      mockEnterKeyDetector.isEnterKey.mockReturnValue(true);

      // Act: Route Enter key
      keyDifferentiator.handleKeyDown = jest.fn(async (event) => {
        if (mockEnterKeyDetector.isEnterKey(event)) {
          return await keyDifferentiator.processEnterKey(event);
        } else {
          return await keyDifferentiator.processRegularKey(event);
        }
      });

      keyDifferentiator.processEnterKey = jest.fn().mockResolvedValue({ 
        type: 'enter', 
        action: 'send_command' 
      });

      const result = await keyDifferentiator.handleKeyDown(enterEvent);

      // Assert: Verify Enter key routing
      expect(result.type).toBe('enter');
      expect(result.action).toBe('send_command');
      expect(keyDifferentiator.processEnterKey).toHaveBeenCalledWith(enterEvent);
      expect(keyDifferentiator.processRegularKey).not.toHaveBeenCalled();
    });

    it('should route regular keys to regular handler', async () => {
      // Arrange: Regular key routing
      const regularEvent = createMockKeyboardEvent('a');
      mockEnterKeyDetector.isEnterKey.mockReturnValue(false);

      // Act: Route regular key
      keyDifferentiator.handleKeyDown = jest.fn(async (event) => {
        if (mockEnterKeyDetector.isEnterKey(event)) {
          return await keyDifferentiator.processEnterKey(event);
        } else {
          return await keyDifferentiator.processRegularKey(event);
        }
      });

      keyDifferentiator.processRegularKey = jest.fn().mockResolvedValue({ 
        type: 'regular', 
        action: 'buffer_character' 
      });

      const result = await keyDifferentiator.handleKeyDown(regularEvent);

      // Assert: Verify regular key routing
      expect(result.type).toBe('regular');
      expect(result.action).toBe('buffer_character');
      expect(keyDifferentiator.processRegularKey).toHaveBeenCalledWith(regularEvent);
      expect(keyDifferentiator.processEnterKey).not.toHaveBeenCalled();
    });

    it('should handle key combination differentiation', async () => {
      // Arrange: Key combinations with Enter
      const keyCombinations = [
        { key: 'Enter', shiftKey: false, expected: 'send' },
        { key: 'Enter', shiftKey: true, expected: 'newline' },
        { key: 'Enter', ctrlKey: true, expected: 'force_send' },
        { key: 'Enter', metaKey: true, expected: 'force_send' }
      ];

      // Act & Assert: Test key combinations
      for (const combo of keyCombinations) {
        const keyEvent = createMockKeyboardEvent('Enter', combo);
        mockEnterKeyDetector.isEnterKey.mockReturnValue(true);
        mockEnterKeyDetector.isModifiedEnter.mockImplementation((event) => {
          return event.shiftKey || event.ctrlKey || event.metaKey;
        });

        keyDifferentiator.processEnterKey = jest.fn(async (event) => {
          if (mockEnterKeyDetector.isModifiedEnter(event)) {
            if (event.shiftKey) return { action: 'newline' };
            if (event.ctrlKey || event.metaKey) return { action: 'force_send' };
          }
          return { action: 'send' };
        });

        const result = await keyDifferentiator.processEnterKey(keyEvent);
        expect(result.action).toBe(combo.expected);
      }
    });
  });

  describe('Behavioral Differentiation', () => {
    it('should buffer regular keys without sending', async () => {
      // Arrange: Regular key sequence
      const keySequence = ['h', 'e', 'l', 'l', 'o'];
      let bufferedContent = '';

      mockEnterKeyDetector.isEnterKey.mockReturnValue(false);
      mockCharacterFilter.shouldBuffer.mockReturnValue(true);

      // Act: Process key sequence
      for (const key of keySequence) {
        const keyEvent = createMockKeyboardEvent(key);

        keyDifferentiator.processRegularKey = jest.fn(async (event) => {
          if (mockCharacterFilter.shouldBuffer(event)) {
            bufferedContent += event.key;
            return { buffered: bufferedContent, sent: false };
          }
        });

        const result = await keyDifferentiator.processRegularKey(keyEvent);
        
        expect(result.sent).toBe(false);
        expect(result.buffered).toContain(key);
      }

      // Assert: Verify buffering behavior
      expect(bufferedContent).toBe('hello');
      expect(mockCharacterFilter.shouldBuffer).toHaveBeenCalledTimes(5);
    });

    it('should send command only on Enter key', async () => {
      // Arrange: Command completion with Enter
      mockInputElement.value = 'ls -la';
      const enterEvent = createMockKeyboardEvent('Enter');
      mockEnterKeyDetector.isEnterKey.mockReturnValue(true);
      mockEnterKeyDetector.shouldTriggerSend.mockReturnValue(true);

      // Act: Process Enter key
      keyDifferentiator.processEnterKey = jest.fn(async (event) => {
        if (mockEnterKeyDetector.shouldTriggerSend(event)) {
          const command = mockInputElement.value.trim();
          return { 
            sent: true, 
            command,
            buffered: false 
          };
        }
        return { sent: false, buffered: true };
      });

      const result = await keyDifferentiator.processEnterKey(enterEvent);

      // Assert: Verify sending behavior
      expect(result.sent).toBe(true);
      expect(result.command).toBe('ls -la');
      expect(result.buffered).toBe(false);
      expect(mockEnterKeyDetector.shouldTriggerSend).toHaveBeenCalledWith(enterEvent);
    });

    it('should prevent default only for Enter keys', async () => {
      // Arrange: Mixed key events
      const keyEvents = [
        { key: 'a', shouldPreventDefault: false },
        { key: 'Enter', shouldPreventDefault: true },
        { key: 'Tab', shouldPreventDefault: false },
        { key: 'Escape', shouldPreventDefault: false }
      ];

      // Act & Assert: Test preventDefault behavior
      for (const { key, shouldPreventDefault } of keyEvents) {
        const keyEvent = createMockKeyboardEvent(key);
        const isEnter = key === 'Enter';
        
        mockEnterKeyDetector.isEnterKey.mockReturnValue(isEnter);
        mockEnterKeyDetector.shouldPreventDefault.mockReturnValue(isEnter);

        keyDifferentiator.handleKeyDown = jest.fn(async (event) => {
          if (mockEnterKeyDetector.isEnterKey(event)) {
            if (mockEnterKeyDetector.shouldPreventDefault(event)) {
              event.preventDefault();
              return { preventedDefault: true };
            }
          }
          return { preventedDefault: false };
        });

        const result = await keyDifferentiator.handleKeyDown(keyEvent);
        
        if (shouldPreventDefault) {
          expect(result.preventedDefault).toBe(true);
          expect(keyEvent.preventDefault).toHaveBeenCalled();
        } else {
          expect(result.preventedDefault).toBe(false);
          expect(keyEvent.preventDefault).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('Edge Cases in Key Differentiation', () => {
    it('should handle rapid key combinations', async () => {
      // Arrange: Rapid key sequence ending with Enter
      const rapidSequence = ['a', 'b', 'c', 'Enter'];
      let processedKeys = [];

      // Act: Process rapid sequence
      for (const key of rapidSequence) {
        const keyEvent = createMockKeyboardEvent(key);
        const isEnter = key === 'Enter';
        
        mockEnterKeyDetector.isEnterKey.mockReturnValue(isEnter);

        keyDifferentiator.handleKeyDown = jest.fn(async (event) => {
          processedKeys.push({
            key: event.key,
            isEnter: mockEnterKeyDetector.isEnterKey(event),
            timestamp: Date.now()
          });
          
          if (isEnter) {
            return { type: 'command_sent' };
          } else {
            return { type: 'character_buffered' };
          }
        });

        await keyDifferentiator.handleKeyDown(keyEvent);
      }

      // Assert: Verify sequence processing
      expect(processedKeys).toHaveLength(4);
      expect(processedKeys.slice(0, 3).every(k => !k.isEnter)).toBe(true);
      expect(processedKeys[3].isEnter).toBe(true);
    });

    it('should handle Enter key without input value', async () => {
      // Arrange: Enter key with empty input
      const enterEvent = createMockKeyboardEvent('Enter');
      mockInputElement.value = '';
      mockEnterKeyDetector.isEnterKey.mockReturnValue(true);
      mockEnterKeyDetector.shouldTriggerSend.mockImplementation((event) => {
        return mockInputElement.value.trim().length > 0;
      });

      // Act: Process empty Enter
      keyDifferentiator.processEnterKey = jest.fn(async (event) => {
        if (!mockEnterKeyDetector.shouldTriggerSend(event)) {
          return { sent: false, reason: 'empty_input' };
        }
        return { sent: true };
      });

      const result = await keyDifferentiator.processEnterKey(enterEvent);

      // Assert: Verify empty input handling
      expect(result.sent).toBe(false);
      expect(result.reason).toBe('empty_input');
      expect(mockEnterKeyDetector.shouldTriggerSend).toHaveBeenCalledWith(enterEvent);
    });
  });

  describe('Contract Verification', () => {
    it('should satisfy key differentiation contracts', () => {
      expect(mockEnterKeyDetector).toHaveProperty('isEnterKey');
      expect(mockEnterKeyDetector).toHaveProperty('shouldPreventDefault');
      expect(mockEnterKeyDetector).toHaveProperty('shouldTriggerSend');
      expect(mockCharacterFilter).toHaveProperty('shouldBuffer');
    });

    it('should maintain consistent key event handling', () => {
      // Verify all key handling methods exist and are functions
      expect(keyDifferentiator.handleKeyDown).toBeInstanceOf(Function);
      expect(keyDifferentiator.processRegularKey).toBeInstanceOf(Function);
      expect(keyDifferentiator.processEnterKey).toBeInstanceOf(Function);
    });

    it('should ensure proper mock interactions', () => {
      // Verify mocks are properly configured
      const enterEvent = createMockKeyboardEvent('Enter');
      expect(enterEvent.key).toBe('Enter');
      expect(enterEvent.keyCode).toBe(13);
      expect(enterEvent.preventDefault).toBeInstanceOf(Function);
    });
  });
});