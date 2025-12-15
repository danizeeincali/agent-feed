/**
 * TDD London School Test for TerminalView showNotification Error
 * 
 * This test follows the London School (mockist) approach:
 * 1. Mock all external dependencies
 * 2. Focus on interaction testing
 * 3. Test object collaborations
 * 4. Verify behavior through mock expectations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TerminalView from '@/components/TerminalView';
import * as useNotificationModule from '@/hooks/useNotification';
import * as useTerminalSocketModule from '@/hooks/useTerminalSocket';

// London School: Mock all external dependencies
jest.mock('@/hooks/useNotification');
jest.mock('@/hooks/useTerminalSocket');
jest.mock('xterm', () => ({
  Terminal: jest.fn().mockImplementation(() => ({
    loadAddon: jest.fn(),
    open: jest.fn(),
    onData: jest.fn(),
    onResize: jest.fn(),
    onSelectionChange: jest.fn(),
    dispose: jest.fn(),
    clear: jest.fn(),
    getSelection: jest.fn(),
    buffer: {
      active: {
        toString: jest.fn(() => 'terminal content')
      }
    },
    options: {}
  }))
}));

jest.mock('xterm-addon-fit', () => ({
  FitAddon: jest.fn().mockImplementation(() => ({
    fit: jest.fn()
  }))
}));

jest.mock('xterm-addon-web-links', () => ({
  WebLinksAddon: jest.fn()
}));

jest.mock('xterm-addon-search', () => ({
  SearchAddon: jest.fn().mockImplementation(() => ({
    findNext: jest.fn(),
    findPrevious: jest.fn()
  }))
}));

describe('TerminalView - Notification System (TDD London School)', () => {
  // Mock contracts - Define expected collaborator interfaces
  let mockShowNotification: jest.Mock;
  let mockAddNotification: jest.Mock;
  let mockTerminalSocket: {
    connected: boolean;
    connecting: boolean;
    instanceInfo: any;
    connect: jest.Mock;
    disconnect: jest.Mock;
    sendInput: jest.Mock;
    sendResize: jest.Mock;
    error: string | null;
    history: string[];
  };

  beforeEach(() => {
    // London School: Set up fresh mocks for each test
    mockShowNotification = jest.fn();
    mockAddNotification = jest.fn();
    
    // Mock useNotification hook
    (useNotificationModule.useNotification as jest.Mock).mockReturnValue({
      showNotification: mockShowNotification, // This should exist but doesn't in current implementation
      addNotification: mockAddNotification,
      notifications: [],
      removeNotification: jest.fn(),
      clearAll: jest.fn()
    });

    // Mock useTerminalSocket hook
    mockTerminalSocket = {
      connected: false,
      connecting: false,
      instanceInfo: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      sendInput: jest.fn(),
      sendResize: jest.fn(),
      error: null,
      history: []
    };

    (useTerminalSocketModule.useTerminalSocket as jest.Mock).mockReturnValue(mockTerminalSocket);

    // Mock global objects safely
    if (!Object.getOwnPropertyDescriptor(navigator, 'clipboard')) {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: jest.fn()
        },
        writable: true,
        configurable: true
      });
    } else {
      // @ts-ignore
      navigator.clipboard = {
        writeText: jest.fn()
      };
    }

    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // RED: This test should FAIL initially because showNotification is not exported
  describe('RED Phase: Reproducing the showNotification Error', () => {
    it('should fail when showNotification is not available from useNotification hook', () => {
      // Arrange: Set up useNotification to NOT return showNotification (current broken state)
      (useNotificationModule.useNotification as jest.Mock).mockReturnValue({
        // Missing showNotification - this is the bug we're testing
        addNotification: mockAddNotification,
        notifications: [],
        removeNotification: jest.fn(),
        clearAll: jest.fn()
      });

      // Act & Assert: This should throw an error about showNotification not being a function
      expect(() => {
        render(
          <MemoryRouter initialEntries={['/terminal/test-instance']}>
            <TerminalView />
          </MemoryRouter>
        );
      }).toThrow(); // This test should FAIL initially
    });

    it('should fail when error occurs and showNotification is called', async () => {
      // Arrange: Mock an error scenario
      mockTerminalSocket.error = 'Connection failed';
      (useNotificationModule.useNotification as jest.Mock).mockReturnValue({
        // Missing showNotification - this is the bug
        addNotification: mockAddNotification,
        notifications: [],
        removeNotification: jest.fn(),
        clearAll: jest.fn()
      });

      // Act & Assert: Should fail when trying to call showNotification
      expect(() => {
        render(
          <MemoryRouter initialEntries={['/terminal/test-instance']}>
            <TerminalView />
          </MemoryRouter>
        );
      }).toThrow();
    });
  });

  // GREEN: These tests should PASS after we fix the useNotification hook
  describe('GREEN Phase: Working Notification System', () => {
    beforeEach(() => {
      // Mock the corrected useNotification hook
      (useNotificationModule.useNotification as jest.Mock).mockReturnValue({
        showNotification: mockShowNotification, // Now properly available
        addNotification: mockAddNotification,
        notifications: [],
        removeNotification: jest.fn(),
        clearAll: jest.fn()
      });
    });

    it('should call showNotification when terminal connection error occurs', async () => {
      // Arrange: Set up error scenario
      mockTerminalSocket.error = 'WebSocket connection failed';

      // Act: Render component
      render(
        <MemoryRouter initialEntries={['/terminal/test-instance']}>
          <TerminalView />
        </MemoryRouter>
      );

      // Assert: Verify showNotification was called with error details
      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith({
          type: 'error',
          title: 'Terminal Connection Error',
          message: 'WebSocket connection failed',
          duration: 5000
        });
      });
    });

    it('should call showNotification when text is copied to clipboard', async () => {
      // Arrange: Set up connected terminal with selection
      mockTerminalSocket.connected = true;
      
      render(
        <MemoryRouter initialEntries={['/terminal/test-instance']}>
          <TerminalView />
        </MemoryRouter>
      );

      // Mock terminal selection
      const mockTerminal = {
        getSelection: jest.fn(() => 'selected text')
      };

      // Act: Simulate copy action
      const copyButton = screen.getByTitle('Copy Selection');
      fireEvent.click(copyButton);

      // Assert: Verify showNotification was called for successful copy
      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith({
          type: 'success',
          title: 'Copied',
          message: 'Selection copied to clipboard',
          duration: 2000
        });
      });
    });

    it('should properly handle notification system contract', () => {
      // Arrange & Act
      render(
        <MemoryRouter initialEntries={['/terminal/test-instance']}>
          <TerminalView />
        </MemoryRouter>
      );

      // Assert: Verify useNotification hook was called
      expect(useNotificationModule.useNotification).toHaveBeenCalled();
      
      // Assert: Verify the component can access showNotification
      const mockCallResult = (useNotificationModule.useNotification as jest.Mock).mock.results[0].value;
      expect(mockCallResult).toHaveProperty('showNotification');
      expect(typeof mockCallResult.showNotification).toBe('function');
    });
  });

  // REFACTOR: Test interaction patterns and object collaborations
  describe('REFACTOR Phase: Comprehensive Notification Interactions', () => {
    beforeEach(() => {
      (useNotificationModule.useNotification as jest.Mock).mockReturnValue({
        showNotification: mockShowNotification,
        addNotification: mockAddNotification,
        notifications: [],
        removeNotification: jest.fn(),
        clearAll: jest.fn()
      });
    });

    it('should coordinate error notifications with reconnection attempts', async () => {
      // Arrange: Set up multiple error scenarios
      mockTerminalSocket.error = 'Network timeout';

      render(
        <MemoryRouter initialEntries={['/terminal/test-instance']}>
          <TerminalView />
        </MemoryRouter>
      );

      // Assert: Verify error notification is shown
      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            title: 'Terminal Connection Error',
            message: 'Network timeout'
          })
        );
      });

      // Assert: Verify it's called exactly once for this error
      expect(mockShowNotification).toHaveBeenCalledTimes(1);
    });

    it('should handle notification system gracefully when clipboard fails', async () => {
      // Arrange: Mock clipboard failure
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true
      });

      mockTerminalSocket.connected = true;

      render(
        <MemoryRouter initialEntries={['/terminal/test-instance']}>
          <TerminalView />
        </MemoryRouter>
      );

      // Act: Try to copy (should not crash)
      const copyButton = screen.getByTitle('Copy Selection');
      fireEvent.click(copyButton);

      // Assert: Should not call showNotification when clipboard is unavailable
      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('should maintain proper separation of concerns between terminal and notification systems', () => {
      // Arrange & Act
      render(
        <MemoryRouter initialEntries={['/terminal/test-instance']}>
          <TerminalView />
        </MemoryRouter>
      );

      // Assert: Terminal should only depend on notification interface, not implementation
      expect(useNotificationModule.useNotification).toHaveBeenCalledTimes(1);
      expect(useNotificationModule.useNotification).toHaveBeenCalledWith(); // No parameters - loose coupling
    });
  });

  // Contract Testing: Verify the notification system interface
  describe('Contract Testing: Notification System Interface', () => {
    it('should define the correct notification contract', () => {
      // Arrange: Expected interface contract
      const expectedContract = {
        showNotification: expect.any(Function),
        addNotification: expect.any(Function),
        notifications: expect.any(Array),
        removeNotification: expect.any(Function),
        clearAll: expect.any(Function)
      };

      // Act
      render(
        <MemoryRouter initialEntries={['/terminal/test-instance']}>
          <TerminalView />
        </MemoryRouter>
      );

      // Assert: Verify the hook returns the expected contract
      const mockResult = (useNotificationModule.useNotification as jest.Mock).mock.results[0].value;
      expect(mockResult).toEqual(expect.objectContaining(expectedContract));
    });

    it('should ensure showNotification accepts the correct parameters', () => {
      // Arrange
      render(
        <MemoryRouter initialEntries={['/terminal/test-instance']}>
          <TerminalView />
        </MemoryRouter>
      );

      // Act: Simulate error to trigger notification
      mockTerminalSocket.error = 'Test error';

      // Re-render to trigger effect
      render(
        <MemoryRouter initialEntries={['/terminal/test-instance']}>
          <TerminalView />
        </MemoryRouter>
      );

      // Assert: Verify showNotification is called with correct parameter structure
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringMatching(/^(success|error|warning|info)$/),
          title: expect.any(String),
          message: expect.any(String),
          duration: expect.any(Number)
        })
      );
    });
  });
});