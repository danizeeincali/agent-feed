/**
 * TDD London School: Feature 16 - Terminal Command History
 * 
 * Behavioral tests using mock-driven development approach
 * Focus: Object interactions and collaboration contracts
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedSSEInterface } from '../../frontend/src/components/claude-manager/EnhancedSSEInterface';
import { TerminalCommandHistory, TerminalCommandHistoryImpl } from '../../tests/missing-features-implementation';

// Mock localStorage for behavioral testing
const mockLocalStorage = {
  data: {} as Record<string, string>,
  getItem: jest.fn((key: string) => mockLocalStorage.data[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorage.data[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockLocalStorage.data[key];
  }),
  clear: jest.fn(() => {
    mockLocalStorage.data = {};
  })
};

// Mock the SSE hook for isolation
jest.mock('../../frontend/src/hooks/useSSEClaudeInstance');
const mockUseSSEClaudeInstance = require('../../frontend/src/hooks/useSSEClaudeInstance').useSSEClaudeInstance as jest.MockedFunction<any>;

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('TDD London School: Terminal Command History (Feature 16)', () => {
  let mockSSEHook: any;
  let mockCommandHistory: jest.Mocked<TerminalCommandHistory>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    
    // Setup SSE hook mock
    mockSSEHook = {
      manager: { cleanup: jest.fn() },
      isConnected: true,
      connectionState: 'connected',
      connectionError: null,
      availableInstances: [
        { id: 'claude-test-1', pid: 1234, status: 'running' }
      ],
      selectedInstanceId: 'claude-test-1',
      output: [],
      connectToInstance: jest.fn().mockResolvedValue(void 0),
      disconnectFromInstance: jest.fn().mockResolvedValue(void 0),
      sendCommand: jest.fn().mockResolvedValue(void 0),
      refreshInstances: jest.fn().mockResolvedValue(void 0),
      clearOutput: jest.fn(),
      loading: false,
      messageCount: 0,
      lastActivity: new Date()
    };

    mockUseSSEClaudeInstance.mockReturnValue(mockSSEHook);

    // Setup command history mock with behavioral contracts
    mockCommandHistory = {
      commands: [],
      currentIndex: -1,
      maxHistory: 100,
      addCommand: jest.fn(),
      getNextCommand: jest.fn(),
      getPreviousCommand: jest.fn(),
      clearHistory: jest.fn(),
      saveToStorage: jest.fn(),
      loadFromStorage: jest.fn()
    } as jest.Mocked<TerminalCommandHistory>;
  });

  describe('SPARC Specification: Command History Behavioral Contracts', () => {
    it('should define terminal command history interface correctly', () => {
      const history = new TerminalCommandHistoryImpl();
      
      // Verify interface contract
      expect(typeof history.addCommand).toBe('function');
      expect(typeof history.getPreviousCommand).toBe('function');
      expect(typeof history.getNextCommand).toBe('function');
      expect(typeof history.clearHistory).toBe('function');
      expect(typeof history.saveToStorage).toBe('function');
      expect(typeof history.loadFromStorage).toBe('function');
      
      // Verify initial state
      expect(history.commands).toEqual([]);
      expect(history.currentIndex).toBe(-1);
      expect(history.maxHistory).toBe(100);
    });

    it('should collaborate with localStorage for persistence', () => {
      const history = new TerminalCommandHistoryImpl();
      
      // Verify storage collaboration on construction
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('claude_terminal_history');
      
      // Test command addition and storage collaboration
      history.addCommand('test command');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'claude_terminal_history',
        expect.stringContaining('"commands":["test command"]')
      );
    });

    it('should enforce business rules through behavioral contracts', () => {
      const history = new TerminalCommandHistoryImpl();
      
      // Test empty command rejection
      history.addCommand('');
      expect(history.commands).toHaveLength(0);
      
      history.addCommand('   ');
      expect(history.commands).toHaveLength(0);
      
      // Test valid command acceptance
      history.addCommand('valid command');
      expect(history.commands).toContain('valid command');
      expect(history.currentIndex).toBe(1);
    });

    it('should handle duplicate consecutive command filtering', () => {
      const history = new TerminalCommandHistoryImpl();
      
      history.addCommand('command1');
      history.addCommand('command1'); // Duplicate should be ignored
      history.addCommand('command2');
      history.addCommand('command2'); // Duplicate should be ignored
      
      expect(history.commands).toEqual(['command1', 'command2']);
      expect(history.commands).toHaveLength(2);
    });

    it('should enforce maximum history limit contract', () => {
      const history = new TerminalCommandHistoryImpl(3); // Small limit for testing
      
      // Add more commands than limit
      for (let i = 1; i <= 5; i++) {
        history.addCommand(`command${i}`);
      }
      
      // Should only keep last 3 commands
      expect(history.commands).toEqual(['command3', 'command4', 'command5']);
      expect(history.commands).toHaveLength(3);
    });
  });

  describe('SPARC Pseudocode: Navigation Algorithm Behavioral Testing', () => {
    it('should implement arrow key navigation workflow correctly', () => {
      const history = new TerminalCommandHistoryImpl();
      
      // Setup command history
      history.addCommand('command1');
      history.addCommand('command2');
      history.addCommand('command3');
      
      // Test up arrow navigation (previous command)
      expect(history.getPreviousCommand()).toBe('command3');
      expect(history.getPreviousCommand()).toBe('command2');
      expect(history.getPreviousCommand()).toBe('command1');
      expect(history.getPreviousCommand()).toBe('command1'); // Should stay at first
      
      // Test down arrow navigation (next command)
      expect(history.getNextCommand()).toBe('command2');
      expect(history.getNextCommand()).toBe('command3');
      expect(history.getNextCommand()).toBe(''); // Past end for new input
    });

    it('should handle navigation edge cases gracefully', () => {
      const history = new TerminalCommandHistoryImpl();
      
      // Test navigation with empty history
      expect(history.getPreviousCommand()).toBeNull();
      expect(history.getNextCommand()).toBeNull();
      
      // Test navigation with single command
      history.addCommand('single command');
      expect(history.getPreviousCommand()).toBe('single command');
      expect(history.getNextCommand()).toBe(''); // Allow new input
    });

    it('should reset navigation index when new command is added', () => {
      const history = new TerminalCommandHistoryImpl();
      
      history.addCommand('command1');
      history.addCommand('command2');
      
      // Navigate backwards
      history.getPreviousCommand(); // command2
      history.getPreviousCommand(); // command1
      expect(history.currentIndex).toBe(0);
      
      // Add new command should reset index
      history.addCommand('command3');
      expect(history.currentIndex).toBe(3); // At end of history
    });
  });

  describe('SPARC Architecture: Integration Contracts with UI Components', () => {
    it('should integrate with terminal input field behavior', async () => {
      const user = userEvent.setup();
      
      // Render component with terminal view
      render(<EnhancedSSEInterface />);
      
      // Switch to terminal view
      await user.click(screen.getByText('Terminal'));
      
      const terminalInput = screen.getByPlaceholderText('Enter command...');
      expect(terminalInput).toBeInTheDocument();
      
      // Test that arrow key events can be bound (preparation for integration)
      fireEvent.keyDown(terminalInput, { key: 'ArrowUp', code: 'ArrowUp' });
      fireEvent.keyDown(terminalInput, { key: 'ArrowDown', code: 'ArrowDown' });
      
      // At this point, without integration, no history behavior should occur
      expect(terminalInput).toHaveValue('');
    });

    it('should preserve command sending workflow with history integration', async () => {
      const user = userEvent.setup();
      render(<EnhancedSSEInterface />);
      
      await user.click(screen.getByText('Terminal'));
      const terminalInput = screen.getByPlaceholderText('Enter command...');
      
      // Send a command
      await user.type(terminalInput, 'test command');
      fireEvent.keyPress(terminalInput, { key: 'Enter', charCode: 13 });
      
      // Verify command was sent via SSE
      expect(mockSSEHook.sendCommand).toHaveBeenCalledWith('claude-test-1', 'test command');
      
      // This behavior should be enhanced with history storage
      // (currently no history integration exists)
    });
  });

  describe('SPARC Refinement: Storage Persistence Contracts', () => {
    it('should handle localStorage failures gracefully', () => {
      // Mock localStorage failure
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const history = new TerminalCommandHistoryImpl();
      history.addCommand('test command');
      
      // Should not throw, but should log warning
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save command history to localStorage:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle corrupted storage data gracefully', () => {
      // Mock corrupted localStorage data
      mockLocalStorage.getItem.mockReturnValue('invalid json {');
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const history = new TerminalCommandHistoryImpl();
      
      // Should initialize with empty history instead of crashing
      expect(history.commands).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load command history from localStorage:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should restore command history on initialization', () => {
      // Setup stored history
      const storedHistory = {
        commands: ['stored1', 'stored2', 'stored3'],
        timestamp: Date.now()
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedHistory));
      
      const history = new TerminalCommandHistoryImpl();
      
      // Should restore from storage
      expect(history.commands).toEqual(['stored1', 'stored2', 'stored3']);
      expect(history.currentIndex).toBe(3); // At end of restored history
    });
  });

  describe('SPARC Completion: Cross-Feature Integration Behavioral Testing', () => {
    it('should maintain history across component re-renders', () => {
      const history = new TerminalCommandHistoryImpl();
      
      history.addCommand('persistent command');
      
      // Simulate component re-render by creating new instance
      const newHistory = new TerminalCommandHistoryImpl();
      
      // Should load from storage
      expect(newHistory.commands).toContain('persistent command');
    });

    it('should not interfere with SSE streaming performance', () => {
      const history = new TerminalCommandHistoryImpl();
      
      // Add many commands quickly
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        history.addCommand(`command${i}`);
      }
      const endTime = performance.now();
      
      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(100); // 100ms limit
      
      // Should maintain history limit
      expect(history.commands).toHaveLength(100);
    });

    it('should clear history when requested', () => {
      const history = new TerminalCommandHistoryImpl();
      
      history.addCommand('command1');
      history.addCommand('command2');
      expect(history.commands).toHaveLength(2);
      
      history.clearHistory();
      
      expect(history.commands).toEqual([]);
      expect(history.currentIndex).toBe(-1);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'claude_terminal_history',
        expect.stringContaining('"commands":[]')
      );
    });
  });

  describe('SPARC Integration: Mock Verification Contracts', () => {
    it('should verify all mock interactions follow behavioral contracts', () => {
      const history = new TerminalCommandHistoryImpl();
      
      // Test all major interactions
      history.addCommand('test');
      history.getPreviousCommand();
      history.getNextCommand();
      history.clearHistory();
      
      // Verify localStorage interactions
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('claude_terminal_history');
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      // Verify behavioral consistency
      expect(history.commands).toEqual([]);
      expect(history.currentIndex).toBe(-1);
    });
  });
});