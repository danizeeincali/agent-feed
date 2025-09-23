/**
 * TDD London School Tests for TerminalView Component
 * 
 * Tests addon import validation, component mounting, error boundaries,
 * and WebSocket integration using behavior verification and mock-driven development.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TerminalView } from '@/components/TerminalView';

// Mock dependencies using London School approach - define collaborator contracts
const mockTerminal = {
  loadAddon: jest.fn().mockReturnValue(undefined),
  open: jest.fn().mockReturnValue(undefined),
  onData: jest.fn().mockReturnValue(undefined),
  onResize: jest.fn().mockReturnValue(undefined),
  onSelectionChange: jest.fn().mockReturnValue(undefined),
  dispose: jest.fn().mockReturnValue(undefined),
  clear: jest.fn().mockReturnValue(undefined),
  getSelection: jest.fn().mockReturnValue('mock selection'),
  write: jest.fn().mockReturnValue(undefined),
  buffer: {
    active: {
      toString: jest.fn().mockReturnValue('terminal buffer content')
    }
  },
  options: {
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    theme: {},
    cursorBlink: true,
    scrollback: 1000
  }
};

const mockFitAddon = {
  fit: jest.fn().mockReturnValue(undefined)
};

const mockSearchAddon = {
  findNext: jest.fn().mockReturnValue(undefined),
  findPrevious: jest.fn().mockReturnValue(undefined)
};

const mockWebLinksAddon = {};

const mockTerminalSocket = {
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

const mockNotification = {
  showNotification: jest.fn()
};

// Mock xterm imports - ensure mocks return proper instances
jest.mock('xterm', () => ({
  Terminal: jest.fn().mockImplementation(() => ({
    ...mockTerminal,
    // Ensure all methods return the terminal instance for chaining if needed
    loadAddon: jest.fn().mockReturnThis(),
    open: jest.fn().mockReturnThis(),
    onData: jest.fn().mockReturnThis(),
    onResize: jest.fn().mockReturnThis(),
    onSelectionChange: jest.fn().mockReturnThis()
  }))
}));

jest.mock('xterm-addon-fit', () => ({
  FitAddon: jest.fn().mockImplementation(() => mockFitAddon)
}));

jest.mock('xterm-addon-search', () => ({
  SearchAddon: jest.fn().mockImplementation(() => mockSearchAddon)
}));

jest.mock('xterm-addon-web-links', () => ({
  WebLinksAddon: jest.fn().mockImplementation(() => mockWebLinksAddon)
}));

// Mock CSS import
jest.mock('xterm/css/xterm.css', () => ({}));

// Mock hooks
jest.mock('@/hooks/useTerminalSocket', () => ({
  useTerminalSocket: () => mockTerminalSocket
}));

jest.mock('@/hooks/useNotification', () => ({
  useNotification: () => mockNotification
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockParams = { instanceId: 'test-instance' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockParams,
  useNavigate: () => mockNavigate
}));

// Mock browser APIs
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  },
  writable: true
});

Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined)
    }
  },
  writable: true
});

Object.defineProperty(global, 'BroadcastChannel', {
  value: jest.fn().mockImplementation(() => ({
    close: jest.fn(),
    postMessage: jest.fn(),
    onmessage: null
  })),
  writable: true
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: jest.fn().mockReturnValue('mock-blob-url'),
    revokeObjectURL: jest.fn()
  },
  writable: true
});

// Helper to wrap component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('TerminalView - London School TDD', () => {
  let mockTerminalInstance: any;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a fresh mock terminal instance for each test
    mockTerminalInstance = {
      ...mockTerminal,
      loadAddon: jest.fn().mockReturnValue(undefined),
      open: jest.fn().mockReturnValue(undefined),
      onData: jest.fn().mockReturnValue(undefined),
      onResize: jest.fn().mockReturnValue(undefined),
      onSelectionChange: jest.fn().mockReturnValue(undefined),
      dispose: jest.fn().mockReturnValue(undefined),
      clear: jest.fn().mockReturnValue(undefined),
      getSelection: jest.fn().mockReturnValue('mock selection'),
      write: jest.fn().mockReturnValue(undefined),
      buffer: {
        active: {
          toString: jest.fn().mockReturnValue('terminal buffer content')
        }
      },
      options: {
        fontSize: 14,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        theme: {},
        cursorBlink: true,
        scrollback: 1000
      }
    };
    
    // Update the mock to return our fresh instance
    (require('xterm').Terminal as jest.Mock).mockImplementation(() => mockTerminalInstance);
    
    // Create fresh addon mocks for each test
    mockFitAddon.fit = jest.fn().mockReturnValue(undefined);
    mockSearchAddon.findNext = jest.fn().mockReturnValue(undefined);
    mockSearchAddon.findPrevious = jest.fn().mockReturnValue(undefined);
    
    // Reset other mocks
    mockTerminalSocket.connect.mockClear();
    mockNotification.showNotification.mockClear();
    
    // Reset addon constructor mocks
    (require('xterm-addon-fit').FitAddon as jest.Mock).mockImplementation(() => mockFitAddon);
    (require('xterm-addon-search').SearchAddon as jest.Mock).mockImplementation(() => mockSearchAddon);
    (require('xterm-addon-web-links').WebLinksAddon as jest.Mock).mockImplementation(() => mockWebLinksAddon);
  });

  describe('Import Validation Tests', () => {
    it('should import all required xterm addons without throwing errors', () => {
      expect(() => {
        renderWithRouter(<TerminalView />);
      }).not.toThrow();
    });

    it('should verify Terminal constructor is called with correct configuration', () => {
      renderWithRouter(<TerminalView />);
      
      expect(require('xterm').Terminal).toHaveBeenCalledWith(
        expect.objectContaining({
          fontSize: expect.any(Number),
          fontFamily: expect.any(String),
          theme: expect.any(Object),
          cursorBlink: expect.any(Boolean),
          scrollback: expect.any(Number),
          allowTransparency: true,
          macOptionIsMeta: true,
          rightClickSelectsWord: true,
          allowProposedApi: true
        })
      );
    });

    it('should verify all addon constructors are called', () => {
      renderWithRouter(<TerminalView />);
      
      expect(require('xterm-addon-fit').FitAddon).toHaveBeenCalled();
      expect(require('xterm-addon-search').SearchAddon).toHaveBeenCalled();
      expect(require('xterm-addon-web-links').WebLinksAddon).toHaveBeenCalled();
    });
  });

  describe('Component Mounting Tests', () => {
    it('should mount successfully without throwing errors', () => {
      expect(() => {
        renderWithRouter(<TerminalView />);
      }).not.toThrow();
    });

    it('should render terminal container', () => {
      renderWithRouter(<TerminalView />);
      
      const terminalContainer = document.querySelector('.absolute.inset-0.p-2');
      expect(terminalContainer).toBeInTheDocument();
    });

    it('should display instance information in header', () => {
      renderWithRouter(<TerminalView />);
      
      expect(screen.getByText(/Terminal: test-instance/)).toBeInTheDocument();
    });

    it('should show connection status indicator', () => {
      renderWithRouter(<TerminalView />);
      
      expect(screen.getByText('disconnected')).toBeInTheDocument();
    });
  });

  describe('Addon Loading Tests', () => {
    it('should load all addons on terminal instance in correct sequence', () => {
      renderWithRouter(<TerminalView />);
      
      // Verify loadAddon is called exactly 3 times for each addon
      expect(mockTerminalInstance.loadAddon).toHaveBeenCalledTimes(3);
      
      // Verify addons are loaded in order
      expect(mockTerminalInstance.loadAddon).toHaveBeenNthCalledWith(1, mockFitAddon);
      expect(mockTerminalInstance.loadAddon).toHaveBeenNthCalledWith(2, mockWebLinksAddon);
      expect(mockTerminalInstance.loadAddon).toHaveBeenNthCalledWith(3, mockSearchAddon);
    });

    it('should open terminal after addon loading', () => {
      renderWithRouter(<TerminalView />);
      
      expect(mockTerminalInstance.open).toHaveBeenCalledWith(expect.any(HTMLElement));
      expect(mockFitAddon.fit).toHaveBeenCalled();
    });

    it('should setup event handlers after terminal initialization', () => {
      renderWithRouter(<TerminalView />);
      
      expect(mockTerminalInstance.onData).toHaveBeenCalledWith(expect.any(Function));
      expect(mockTerminalInstance.onResize).toHaveBeenCalledWith(expect.any(Function));
      expect(mockTerminalInstance.onSelectionChange).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Error Boundary Tests', () => {
    it('should gracefully handle terminal initialization failures', () => {
      // Mock terminal constructor to throw
      const originalTerminal = require('xterm').Terminal;
      require('xterm').Terminal = jest.fn().mockImplementation(() => {
        throw new Error('Terminal initialization failed');
      });

      // Component should render but catch the error internally
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // The component mounts but terminal initialization fails
      // This is expected behavior - the component should handle this gracefully
      const { container } = renderWithRouter(<TerminalView />);
      
      // Component should still render the UI
      expect(container.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();

      // Restore mocks
      require('xterm').Terminal = originalTerminal;
      consoleSpy.mockRestore();
    });

    it('should handle addon loading failures gracefully', () => {
      // Create a mock that throws on loadAddon
      const throwingTerminal = {
        ...mockTerminalInstance,
        loadAddon: jest.fn().mockImplementation(() => {
          throw new Error('Addon loading failed');
        })
      };
      
      (require('xterm').Terminal as jest.Mock).mockImplementation(() => throwingTerminal);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Component should render but handle the addon loading error
      const { container } = renderWithRouter(<TerminalView />);
      expect(container.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should display error state when terminal fails to initialize', () => {
      mockTerminalSocket.error = 'Failed to initialize terminal';
      
      renderWithRouter(<TerminalView />);
      
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.getByText('Failed to initialize terminal')).toBeInTheDocument();
    });
  });

  describe('Terminal Initialization Tests', () => {
    it('should initialize terminal with default settings', () => {
      renderWithRouter(<TerminalView />);
      
      expect(require('xterm').Terminal).toHaveBeenCalledWith(
        expect.objectContaining({
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          cursorBlink: true,
          scrollback: 1000
        })
      );
    });

    it('should connect to WebSocket on component mount with instance ID', () => {
      renderWithRouter(<TerminalView />);
      
      expect(mockTerminalSocket.connect).toHaveBeenCalledWith('test-instance');
    });

    it('should setup window resize listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      renderWithRouter(<TerminalView />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('WebSocket Integration Tests', () => {
    it('should send input data when terminal data is received', () => {
      mockTerminalSocket.connected = true;
      renderWithRouter(<TerminalView />);
      
      // Get the onData callback that was registered
      const onDataCallback = mockTerminalInstance.onData.mock.calls[0][0];
      
      // Simulate terminal input
      act(() => {
        onDataCallback('test input');
      });
      
      expect(mockTerminalSocket.sendInput).toHaveBeenCalledWith('test input');
    });

    it('should send resize data when terminal is resized', () => {
      mockTerminalSocket.connected = true;
      renderWithRouter(<TerminalView />);
      
      // Get the onResize callback
      const onResizeCallback = mockTerminalInstance.onResize.mock.calls[0][0];
      
      // Simulate terminal resize
      act(() => {
        onResizeCallback({ cols: 80, rows: 24 });
      });
      
      expect(mockTerminalSocket.sendResize).toHaveBeenCalledWith(80, 24);
    });

    it('should not send data when disconnected', () => {
      mockTerminalSocket.connected = false;
      renderWithRouter(<TerminalView />);
      
      const onDataCallback = mockTerminalInstance.onData.mock.calls[0][0];
      
      act(() => {
        onDataCallback('test input');
      });
      
      expect(mockTerminalSocket.sendInput).not.toHaveBeenCalled();
    });

    it('should write history data to terminal', () => {
      // Set up mock with history
      const mockWithHistory = {
        ...mockTerminalSocket,
        history: ['line 1\n', 'line 2\n']
      };
      
      // Re-mock the hook to return history
      (require('@/hooks/useTerminalSocket').useTerminalSocket as jest.Mock).mockReturnValue(mockWithHistory);
      
      renderWithRouter(<TerminalView />);
      
      expect(mockTerminalInstance.write).toHaveBeenCalledWith('line 1\n');
      expect(mockTerminalInstance.write).toHaveBeenCalledWith('line 2\n');
    });
  });

  describe('Search Functionality Tests', () => {
    it('should show search input when search button is clicked', () => {
      renderWithRouter(<TerminalView />);
      
      const searchButton = screen.getByTitle('Search');
      fireEvent.click(searchButton);
      
      expect(screen.getByPlaceholderText('Search terminal...')).toBeInTheDocument();
    });

    it('should call SearchAddon.findNext when Enter is pressed', () => {
      renderWithRouter(<TerminalView />);
      
      // Open search panel
      const searchButton = screen.getByTitle('Search');
      fireEvent.click(searchButton);
      
      const searchInput = screen.getByPlaceholderText('Search terminal...');
      fireEvent.change(searchInput, { target: { value: 'test query' } });
      
      fireEvent.keyDown(searchInput, { key: 'Enter' });
      
      expect(mockSearchAddon.findNext).toHaveBeenCalledWith('test query');
    });

    it('should call SearchAddon.findPrevious when Shift+Enter is pressed', () => {
      renderWithRouter(<TerminalView />);
      
      // Open search panel
      const searchButton = screen.getByTitle('Search');
      fireEvent.click(searchButton);
      
      const searchInput = screen.getByPlaceholderText('Search terminal...');
      fireEvent.change(searchInput, { target: { value: 'test query' } });
      
      fireEvent.keyDown(searchInput, { key: 'Enter', shiftKey: true });
      
      expect(mockSearchAddon.findPrevious).toHaveBeenCalledWith('test query');
    });

    it('should use search navigation buttons correctly', () => {
      renderWithRouter(<TerminalView />);
      
      // Open search panel
      const searchButton = screen.getByTitle('Search');
      fireEvent.click(searchButton);
      
      const searchInput = screen.getByPlaceholderText('Search terminal...');
      fireEvent.change(searchInput, { target: { value: 'test query' } });
      
      // Click next button (↓)
      const nextButton = screen.getByText('↓');
      fireEvent.click(nextButton);
      
      expect(mockSearchAddon.findNext).toHaveBeenCalledWith('test query');
      
      // Click previous button (↑)
      const prevButton = screen.getByText('↑');
      fireEvent.click(prevButton);
      
      expect(mockSearchAddon.findPrevious).toHaveBeenCalledWith('test query');
    });
  });

  describe('Settings Management Tests', () => {
    it('should load settings from localStorage on mount', () => {
      const mockSettings = {
        fontSize: 16,
        theme: 'light',
        fontFamily: 'Courier New'
      };
      
      (global.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockSettings));
      
      renderWithRouter(<TerminalView />);
      
      expect(global.localStorage.getItem).toHaveBeenCalledWith('terminal-settings');
    });

    it('should save settings to localStorage when updated', async () => {
      renderWithRouter(<TerminalView />);
      
      // Open settings
      const settingsButton = screen.getByTitle('Settings');
      fireEvent.click(settingsButton);
      
      // Change font size
      const fontSizeSlider = screen.getByDisplayValue('14');
      fireEvent.change(fontSizeSlider, { target: { value: '16' } });
      
      await waitFor(() => {
        expect(global.localStorage.setItem).toHaveBeenCalledWith(
          'terminal-settings',
          expect.stringContaining('"fontSize":16')
        );
      });
    });

    it('should update terminal options when settings change', async () => {
      renderWithRouter(<TerminalView />);
      
      // Open settings
      const settingsButton = screen.getByTitle('Settings');
      fireEvent.click(settingsButton);
      
      // Change theme
      const themeSelect = screen.getByDisplayValue('dark');
      fireEvent.change(themeSelect, { target: { value: 'light' } });
      
      await waitFor(() => {
        expect(mockTerminalInstance.options.theme).toBeDefined();
        expect(mockFitAddon.fit).toHaveBeenCalled();
      });
    });
  });

  describe('Connection Management Tests', () => {
    it('should show reconnect button when disconnected', () => {
      // Mock the hook to return disconnected state
      const mockDisconnected = {
        ...mockTerminalSocket,
        connected: false,
        connecting: false
      };
      
      (require('@/hooks/useTerminalSocket').useTerminalSocket as jest.Mock).mockReturnValue(mockDisconnected);
      
      renderWithRouter(<TerminalView />);
      
      expect(screen.getByText('Connect')).toBeInTheDocument();
    });

    it('should attempt reconnection when reconnect is clicked', () => {
      const mockDisconnected = {
        ...mockTerminalSocket,
        connected: false,
        connecting: false,
        connect: jest.fn()
      };
      
      (require('@/hooks/useTerminalSocket').useTerminalSocket as jest.Mock).mockReturnValue(mockDisconnected);
      
      renderWithRouter(<TerminalView />);
      
      const reconnectButton = screen.getByText('Connect');
      fireEvent.click(reconnectButton);
      
      expect(mockDisconnected.connect).toHaveBeenCalledWith('test-instance');
    });

    it('should navigate away when disconnect is clicked', () => {
      renderWithRouter(<TerminalView />);
      
      const disconnectButton = screen.getByText('Disconnect');
      fireEvent.click(disconnectButton);
      
      expect(mockTerminalSocket.disconnect).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dual-instance');
    });

    it('should show notification on connection error', async () => {
      mockTerminalSocket.error = 'Connection failed';
      
      renderWithRouter(<TerminalView />);
      
      await waitFor(() => {
        expect(mockNotification.showNotification).toHaveBeenCalledWith({
          type: 'error',
          title: 'Terminal Connection Error',
          message: 'Connection failed',
          duration: 5000
        });
      });
    });
  });

  describe('Clipboard Integration Tests', () => {
    it('should copy selection to clipboard when copy button is clicked', () => {
      mockTerminalInstance.getSelection.mockReturnValue('selected text');
      
      renderWithRouter(<TerminalView />);
      
      const copyButton = screen.getByTitle('Copy Selection');
      fireEvent.click(copyButton);
      
      expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('selected text');
      expect(mockNotification.showNotification).toHaveBeenCalledWith({
        type: 'success',
        title: 'Copied',
        message: 'Selection copied to clipboard',
        duration: 2000
      });
    });

    it('should copy selection automatically on terminal selection change', () => {
      mockTerminalInstance.getSelection.mockReturnValue('auto selected text');
      
      renderWithRouter(<TerminalView />);
      
      // Get the onSelectionChange callback
      const onSelectionCallback = mockTerminalInstance.onSelectionChange.mock.calls[0][0];
      
      act(() => {
        onSelectionCallback();
      });
      
      expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('auto selected text');
    });
  });

  describe('Cleanup Tests', () => {
    it('should dispose terminal on unmount', () => {
      const { unmount } = renderWithRouter(<TerminalView />);
      
      unmount();
      
      expect(mockTerminalInstance.dispose).toHaveBeenCalled();
    });

    it('should remove event listeners on cleanup', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderWithRouter(<TerminalView />);
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should disconnect WebSocket on unmount', () => {
      const mockWithDisconnect = {
        ...mockTerminalSocket,
        disconnect: jest.fn()
      };
      
      (require('@/hooks/useTerminalSocket').useTerminalSocket as jest.Mock).mockReturnValue(mockWithDisconnect);
      
      const { unmount } = renderWithRouter(<TerminalView />);
      
      unmount();
      
      expect(mockWithDisconnect.disconnect).toHaveBeenCalled();
    });
  });

  describe('Fullscreen Mode Tests', () => {
    it('should toggle fullscreen mode when maximize button is clicked', async () => {
      renderWithRouter(<TerminalView />);
      
      const fullscreenButton = screen.getByTitle('Fullscreen');
      fireEvent.click(fullscreenButton);
      
      // Check if component has fullscreen classes
      await waitFor(() => {
        const container = document.querySelector('.fixed.inset-0.z-50.bg-black');
        expect(container).toBeInTheDocument();
      });
      
      // Should fit terminal after fullscreen toggle
      await waitFor(() => {
        expect(mockFitAddon.fit).toHaveBeenCalled();
      }, { timeout: 200 });
    });
  });

  describe('Content Download Tests', () => {
    it('should download terminal content when download button is clicked', () => {
      // Mock document.createElement and link.click
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') return mockLink as any;
        return originalCreateElement(tagName);
      });
      
      renderWithRouter(<TerminalView />);
      
      const downloadButton = screen.getByTitle('Download Content');
      fireEvent.click(downloadButton);
      
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
      
      createElementSpy.mockRestore();
    });
  });
});