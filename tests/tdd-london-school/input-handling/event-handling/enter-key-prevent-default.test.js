/**
 * TDD London School: Enter Key preventDefault Tests
 * Focus: Mock event handling and preventDefault behavior verification
 */

describe('Enter Key preventDefault Behavior', () => {
  let mockEvent;
  let mockInputElement;
  let mockCommandSender;
  let keyboardHandler;
  let mockSwarmEventCoordinator;

  beforeEach(() => {
    mockEvent = {
      key: 'Enter',
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      target: null,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false
    };

    mockInputElement = {
      value: '',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      focus: jest.fn(),
      blur: jest.fn()
    };

    mockCommandSender = {
      send: jest.fn().mockResolvedValue(true),
      canSend: jest.fn().mockReturnValue(true)
    };

    mockSwarmEventCoordinator = {
      beforeKeyEvent: jest.fn().mockResolvedValue(true),
      afterKeyEvent: jest.fn()
    };

    mockEvent.target = mockInputElement;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Enter Key Event Handling', () => {
    it('should call preventDefault on Enter key press', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      
      mockInputElement.value = 'test command';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('should not call preventDefault for non-Enter keys', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      
      mockEvent.key = 'Escape';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should call preventDefault before sending command', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      
      mockInputElement.value = 'command to send';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      // Verify preventDefault is called before command send
      expect(mockEvent.preventDefault).toHaveBeenCalledBefore(mockCommandSender.send);
    });
  });

  describe('Modifier Key Combinations', () => {
    it('should not preventDefault when Shift+Enter is pressed', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      
      mockEvent.shiftKey = true;
      mockInputElement.value = 'multiline\ncommand';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockCommandSender.send).not.toHaveBeenCalled();
    });

    it('should preventDefault for Ctrl+Enter combination', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      
      mockEvent.ctrlKey = true;
      mockInputElement.value = 'force send command';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
      expect(mockCommandSender.send).toHaveBeenCalled();
    });

    it('should handle Meta+Enter for Mac compatibility', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      
      mockEvent.metaKey = true;
      mockInputElement.value = 'mac command';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
      expect(mockCommandSender.send).toHaveBeenCalled();
    });
  });

  describe('Input Validation Before preventDefault', () => {
    it('should not preventDefault for empty input', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      
      mockInputElement.value = '';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockCommandSender.send).not.toHaveBeenCalled();
    });

    it('should not preventDefault for whitespace-only input', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      
      mockInputElement.value = '   \n\t  ';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockCommandSender.send).not.toHaveBeenCalled();
    });

    it('should preventDefault only when command can be sent', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      
      mockCommandSender.canSend.mockReturnValue(false);
      mockInputElement.value = 'valid command';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      expect(mockCommandSender.canSend).toHaveBeenCalledWith('valid command');
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Event Propagation Control', () => {
    it('should stop event propagation after preventDefault', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      
      mockInputElement.value = 'stop propagation test';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
      expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1);
      expect(mockEvent.stopPropagation).toHaveBeenCalledAfter(mockEvent.preventDefault);
    });

    it('should not stop propagation if preventDefault not called', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      
      mockEvent.key = 'Tab';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
    });
  });

  describe('Swarm Coordination for Event Handling', () => {
    it('should coordinate with swarm before handling key events', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      keyboardHandler.setSwarmEventCoordinator(mockSwarmEventCoordinator);
      
      mockInputElement.value = 'swarm coordinated';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      expect(mockSwarmEventCoordinator.beforeKeyEvent).toHaveBeenCalledWith({
        key: 'Enter',
        value: 'swarm coordinated',
        modifiers: {
          shift: false,
          ctrl: false,
          meta: false
        }
      });
    });

    it('should not preventDefault if swarm coordination fails', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      keyboardHandler.setSwarmEventCoordinator(mockSwarmEventCoordinator);
      
      mockSwarmEventCoordinator.beforeKeyEvent.mockResolvedValue(false);
      mockInputElement.value = 'blocked by swarm';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockCommandSender.send).not.toHaveBeenCalled();
    });

    it('should notify swarm after successful event handling', async () => {
      const KeyboardHandler = require('../../../../src/input/KeyboardHandler');
      keyboardHandler = new KeyboardHandler(mockInputElement, mockCommandSender);
      keyboardHandler.setSwarmEventCoordinator(mockSwarmEventCoordinator);
      
      mockInputElement.value = 'success notification';
      
      await keyboardHandler.handleKeyDown(mockEvent);
      
      expect(mockSwarmEventCoordinator.afterKeyEvent).toHaveBeenCalledWith({
        key: 'Enter',
        success: true,
        commandSent: true
      });
    });
  });
});