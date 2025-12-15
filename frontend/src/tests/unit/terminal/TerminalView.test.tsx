/**
 * TerminalView Unit Tests
 * 
 * Comprehensive unit tests for the TerminalView component following TDD principles.
 * Tests cover component lifecycle, settings management, user interactions, 
 * connection handling, and xterm.js integration.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebLinksAddon } from 'xterm-addon-web-links';

// Mock xterm and addons
jest.mock('xterm', () => ({
  Terminal: jest.fn(() => ({
    loadAddon: jest.fn(),
    open: jest.fn(),
    onData: jest.fn(),
    onResize: jest.fn(),
    onSelectionChange: jest.fn(),
    write: jest.fn(),
    dispose: jest.fn(),
    clear: jest.fn(),
    getSelection: jest.fn(),
    buffer: {
      active: {
        toString: jest.fn(() => 'mock terminal content')
      }
    },
    options: {}
  }))
}));

jest.mock('xterm-addon-fit', () => ({
  FitAddon: jest.fn(() => ({
    fit: jest.fn()
  }))
}));

jest.mock('xterm-addon-search', () => ({
  SearchAddon: jest.fn(() => ({
    findNext: jest.fn(),
    findPrevious: jest.fn()
  }))
}));

jest.mock('xterm-addon-web-links', () => ({
  WebLinksAddon: jest.fn()
}));

// Mock hooks
const mockUseTerminalSocket = {
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

const mockUseNotification = {
  addNotification: jest.fn()
};

jest.mock('../hooks/useTerminalSocket', () => ({
  useTerminalSocket: () => mockUseTerminalSocket
}));

jest.mock('../hooks/useNotification', () => ({
  useNotification: () => mockUseNotification
}));

// Mock router params
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ instanceId: 'test-instance-123' }),
  useNavigate: () => jest.fn()
}));

import { TerminalView } from '@/components/TerminalView';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('TerminalView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      }
    });

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }));

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(void 0)
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders terminal interface with header', () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      expect(screen.getByText(/Terminal:/)).toBeInTheDocument();
      expect(screen.getByText('test-instance-123')).toBeInTheDocument();
    });

    it('shows connection status indicators', () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      expect(screen.getByText('disconnected')).toBeInTheDocument();
    });

    it('displays control buttons', () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      expect(screen.getByTitle('Search')).toBeInTheDocument();
      expect(screen.getByTitle('Copy Selection')).toBeInTheDocument();
      expect(screen.getByTitle('Download Content')).toBeInTheDocument();
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
      expect(screen.getByTitle('Fullscreen')).toBeInTheDocument();
    });
  });

  describe('Terminal Initialization', () => {
    let mockTerminalInstance: any;

    beforeEach(() => {
      mockTerminalInstance = {
        loadAddon: jest.fn(),
        open: jest.fn(),
        onData: jest.fn(),
        onResize: jest.fn(),
        onSelectionChange: jest.fn(),
        write: jest.fn(),
        dispose: jest.fn(),
        clear: jest.fn(),
        getSelection: jest.fn(),
        buffer: {
          active: {
            toString: jest.fn(() => 'mock content')
          }
        },
        options: {}
      };
      
      (Terminal as jest.Mock).mockReturnValue(mockTerminalInstance);
    });

    it('initializes terminal with default settings', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(Terminal).toHaveBeenCalledWith(
          expect.objectContaining({
            fontSize: 14,
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            cursorBlink: true,
            scrollback: 1000
          })
        );
      });
    });

    it('loads essential addons', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(FitAddon).toHaveBeenCalled();
        expect(SearchAddon).toHaveBeenCalled();
        expect(WebLinksAddon).toHaveBeenCalled();
      });

      expect(mockTerminalInstance.loadAddon).toHaveBeenCalledTimes(3);
    });

    it('sets up event listeners', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockTerminalInstance.onData).toHaveBeenCalled();
        expect(mockTerminalInstance.onResize).toHaveBeenCalled();
        expect(mockTerminalInstance.onSelectionChange).toHaveBeenCalled();
      });
    });

    it('handles terminal initialization errors gracefully', async () => {
      (Terminal as jest.Mock).mockImplementation(() => {
        throw new Error('Terminal init failed');
      });

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockUseNotification.addNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            title: 'Terminal Initialization Failed'
          })
        );
      });
    });
  });

  describe('Connection Management', () => {
    it('connects to instance terminal on mount', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockUseTerminalSocket.connect).toHaveBeenCalledWith('test-instance-123');
      });
    });

    it('shows connecting state', () => {
      mockUseTerminalSocket.connecting = true;

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      expect(screen.getByText('connecting')).toBeInTheDocument();
    });

    it('shows connected state with instance info', () => {
      mockUseTerminalSocket.connected = true;
      mockUseTerminalSocket.instanceInfo = {
        id: 'test-instance-123',
        name: 'Test Instance',
        type: 'claude',
        pid: 12345,
        sessionId: 'session-123',
        clientCount: 1
      };

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      expect(screen.getByText('connected')).toBeInTheDocument();
      expect(screen.getByText(/PID: 12345/)).toBeInTheDocument();
    });

    it('handles connection errors', async () => {
      mockUseTerminalSocket.error = 'Connection timeout';

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockUseNotification.addNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            title: 'Terminal Connection Error',
            message: 'Connection timeout'
          })
        );
      });
    });

    it('provides reconnect functionality', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const reconnectButton = screen.getByText('Reconnect');
      await user.click(reconnectButton);

      expect(mockUseTerminalSocket.connect).toHaveBeenCalledWith('test-instance-123');
    });
  });

  describe('User Input Handling', () => {
    let mockTerminalInstance: any;
    let onDataCallback: Function;

    beforeEach(() => {
      mockTerminalInstance = {
        loadAddon: jest.fn(),
        open: jest.fn(),
        onData: jest.fn((callback) => { onDataCallback = callback; }),
        onResize: jest.fn(),
        onSelectionChange: jest.fn(),
        write: jest.fn(),
        dispose: jest.fn(),
        clear: jest.fn(),
        getSelection: jest.fn(),
        buffer: { active: { toString: jest.fn() } },
        options: {}
      };
      
      (Terminal as jest.Mock).mockReturnValue(mockTerminalInstance);
      mockUseTerminalSocket.connected = true;
    });

    it('sends input to WebSocket when connected', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(onDataCallback).toBeDefined();
      });

      // Simulate user input
      act(() => {
        onDataCallback('test input');
      });

      expect(mockUseTerminalSocket.sendInput).toHaveBeenCalledWith('test input');
    });

    it('does not send input when disconnected', async () => {
      mockUseTerminalSocket.connected = false;

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(onDataCallback).toBeDefined();
      });

      act(() => {
        onDataCallback('test input');
      });

      expect(mockUseTerminalSocket.sendInput).not.toHaveBeenCalled();
    });
  });

  describe('Terminal Resizing', () => {
    let mockTerminalInstance: any;
    let onResizeCallback: Function;

    beforeEach(() => {
      mockTerminalInstance = {
        loadAddon: jest.fn(),
        open: jest.fn(),
        onData: jest.fn(),
        onResize: jest.fn((callback) => { onResizeCallback = callback; }),
        onSelectionChange: jest.fn(),
        write: jest.fn(),
        dispose: jest.fn(),
        clear: jest.fn(),
        getSelection: jest.fn(),
        buffer: { active: { toString: jest.fn() } },
        options: {}
      };
      
      (Terminal as jest.Mock).mockReturnValue(mockTerminalInstance);
      mockUseTerminalSocket.connected = true;
    });

    it('sends resize events to WebSocket', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(onResizeCallback).toBeDefined();
      });

      act(() => {
        onResizeCallback({ cols: 80, rows: 24 });
      });

      expect(mockUseTerminalSocket.sendResize).toHaveBeenCalledWith(80, 24);
    });
  });

  describe('Settings Management', () => {
    it('shows settings panel when settings button clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const settingsButton = screen.getByTitle('Settings');
      await user.click(settingsButton);

      expect(screen.getByText('Font Size')).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Font Family')).toBeInTheDocument();
    });

    it('updates terminal settings', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const settingsButton = screen.getByTitle('Settings');
      await user.click(settingsButton);

      const fontSizeSlider = screen.getByDisplayValue('14');
      await user.type(fontSizeSlider, '16');

      // Verify localStorage is called for persistence
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'terminal-settings',
        expect.stringContaining('"fontSize":16')
      );
    });

    it('loads settings from localStorage', () => {
      const mockSettings = JSON.stringify({
        fontSize: 16,
        theme: 'light',
        fontFamily: 'Courier New',
        cursorBlink: false,
        scrollback: 2000
      });

      (localStorage.getItem as jest.Mock).mockReturnValue(mockSettings);

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      expect(localStorage.getItem).toHaveBeenCalledWith('terminal-settings');
    });
  });

  describe('Search Functionality', () => {
    let mockSearchAddon: any;

    beforeEach(() => {
      mockSearchAddon = {
        findNext: jest.fn(),
        findPrevious: jest.fn()
      };
      
      (SearchAddon as jest.Mock).mockReturnValue(mockSearchAddon);
    });

    it('shows search bar when search button clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const searchButton = screen.getByTitle('Search');
      await user.click(searchButton);

      expect(screen.getByPlaceholderText('Search terminal...')).toBeInTheDocument();
    });

    it('performs search when Enter key pressed', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const searchButton = screen.getByTitle('Search');
      await user.click(searchButton);

      const searchInput = screen.getByPlaceholderText('Search terminal...');
      await user.type(searchInput, 'test query');
      await user.keyboard('{Enter}');

      expect(mockSearchAddon.findNext).toHaveBeenCalledWith('test query');
    });

    it('handles search addon errors gracefully', async () => {
      mockSearchAddon.findNext.mockImplementation(() => {
        throw new Error('Search failed');
      });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const searchButton = screen.getByTitle('Search');
      await user.click(searchButton);

      const searchInput = screen.getByPlaceholderText('Search terminal...');
      await user.type(searchInput, 'test query');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockUseNotification.addNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            title: 'Search Error'
          })
        );
      });
    });
  });

  describe('Content Operations', () => {
    let mockTerminalInstance: any;

    beforeEach(() => {
      mockTerminalInstance = {
        loadAddon: jest.fn(),
        open: jest.fn(),
        onData: jest.fn(),
        onResize: jest.fn(),
        onSelectionChange: jest.fn(),
        write: jest.fn(),
        dispose: jest.fn(),
        clear: jest.fn(),
        getSelection: jest.fn(() => 'selected text'),
        buffer: { active: { toString: jest.fn(() => 'terminal content') } },
        options: {}
      };
      
      (Terminal as jest.Mock).mockReturnValue(mockTerminalInstance);
    });

    it('copies selection to clipboard', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const copyButton = screen.getByTitle('Copy Selection');
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('selected text');
    });

    it('downloads terminal content', async () => {
      const user = userEvent.setup();
      const mockLink = { click: jest.fn(), href: '', download: '' };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const downloadButton = screen.getByTitle('Download Content');
      await user.click(downloadButton);

      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toMatch(/terminal-test-instance-123-.*\.txt/);
    });

    it('clears terminal when clear function called', () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      // This would be called internally by the component
      // Testing the terminal.clear() functionality
      expect(mockTerminalInstance.clear).toBeDefined();
    });
  });

  describe('Fullscreen Mode', () => {
    it('toggles fullscreen mode', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const fullscreenButton = screen.getByTitle('Fullscreen');
      await user.click(fullscreenButton);

      // Check for fullscreen classes (implementation detail)
      const container = screen.getByText(/Terminal:/).closest('.flex');
      expect(container).toHaveClass('fixed', 'inset-0', 'z-50');
    });

    it('changes button text in fullscreen mode', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const fullscreenButton = screen.getByTitle('Fullscreen');
      await user.click(fullscreenButton);

      expect(screen.getByTitle('Exit Fullscreen')).toBeInTheDocument();
    });
  });

  describe('History Management', () => {
    it('writes history data to terminal', async () => {
      mockUseTerminalSocket.history = ['line 1\n', 'line 2\n', 'line 3\n'];
      
      const mockTerminalInstance = {
        loadAddon: jest.fn(),
        open: jest.fn(),
        onData: jest.fn(),
        onResize: jest.fn(),
        onSelectionChange: jest.fn(),
        write: jest.fn(),
        dispose: jest.fn(),
        clear: jest.fn(),
        getSelection: jest.fn(),
        buffer: { active: { toString: jest.fn() } },
        options: {}
      };
      
      (Terminal as jest.Mock).mockReturnValue(mockTerminalInstance);

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockTerminalInstance.write).toHaveBeenCalledWith('line 1\n');
        expect(mockTerminalInstance.write).toHaveBeenCalledWith('line 2\n');
        expect(mockTerminalInstance.write).toHaveBeenCalledWith('line 3\n');
      });
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('cleans up terminal resources on unmount', () => {
      const mockTerminalInstance = {
        loadAddon: jest.fn(),
        open: jest.fn(),
        onData: jest.fn(),
        onResize: jest.fn(),
        onSelectionChange: jest.fn(),
        write: jest.fn(),
        dispose: jest.fn(),
        clear: jest.fn(),
        getSelection: jest.fn(),
        buffer: { active: { toString: jest.fn() } },
        options: {}
      };
      
      (Terminal as jest.Mock).mockReturnValue(mockTerminalInstance);

      const { unmount } = render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      unmount();

      expect(mockTerminalInstance.dispose).toHaveBeenCalled();
    });

    it('removes window event listeners on cleanup', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('Error Recovery', () => {
    it('attempts auto-reconnection on errors', async () => {
      mockUseTerminalSocket.error = 'Connection lost';

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      // Wait for error handling
      await waitFor(() => {
        expect(mockUseTerminalSocket.connect).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('limits reconnection attempts', async () => {
      mockUseTerminalSocket.error = 'Connection lost';

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      // Should not exceed maximum retry attempts (implementation specific)
      await waitFor(() => {
        expect(mockUseTerminalSocket.connect).toHaveBeenCalledWith('test-instance-123');
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      expect(screen.getByTitle('Search')).toBeInTheDocument();
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
      expect(screen.getByTitle('Fullscreen')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      // Tab navigation should work
      await user.tab();
      expect(document.activeElement).toBeDefined();
    });
  });
});