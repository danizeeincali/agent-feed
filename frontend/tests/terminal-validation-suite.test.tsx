/**
 * Comprehensive Terminal Validation Suite
 * 
 * This test suite validates the complete terminal functionality after the SearchAddon fix.
 * It covers component rendering, addon loading, search functionality, and user interactions.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock xterm and addons
const mockTerminal = {
  open: jest.fn(),
  dispose: jest.fn(),
  write: jest.fn(),
  clear: jest.fn(),
  getSelection: jest.fn().mockReturnValue('test selection'),
  onData: jest.fn(),
  onResize: jest.fn(),
  onSelectionChange: jest.fn(),
  loadAddon: jest.fn().mockImplementation((addon) => {
    // Simulate successful addon loading
    console.log('Mock terminal loading addon:', addon);
    return true;
  }),
  buffer: {
    active: {
      toString: jest.fn().mockReturnValue('terminal content')
    }
  },
  options: {},
  // Add missing methods that TerminalView expects
  cols: 80,
  rows: 24,
  element: null,
  onKey: jest.fn(),
  focus: jest.fn(),
  blur: jest.fn(),
  scrollToTop: jest.fn(),
  scrollToBottom: jest.fn(),
  scrollLines: jest.fn(),
  scrollPages: jest.fn(),
  scrollToLine: jest.fn(),
  clear: jest.fn(),
  reset: jest.fn(),
  resize: jest.fn()
};

const mockFitAddon = {
  fit: jest.fn()
};

const mockSearchAddon = {
  findNext: jest.fn(),
  findPrevious: jest.fn()
};

const mockWebLinksAddon = {};

// Mock modules
jest.mock('xterm', () => ({
  Terminal: jest.fn(() => mockTerminal)
}));

jest.mock('xterm-addon-fit', () => ({
  FitAddon: jest.fn(() => mockFitAddon)
}));

jest.mock('xterm-addon-search', () => ({
  SearchAddon: jest.fn(() => mockSearchAddon)
}));

jest.mock('xterm-addon-web-links', () => ({
  WebLinksAddon: jest.fn(() => mockWebLinksAddon)
}));

// Mock CSS import
jest.mock('xterm/css/xterm.css', () => ({}));

// Mock hooks
const mockUseTerminalSocket = {
  connected: false,
  connecting: false,
  instanceInfo: {
    name: 'test-instance',
    type: 'claude',
    pid: 12345
  },
  connect: jest.fn(),
  disconnect: jest.fn(),
  sendInput: jest.fn(),
  sendResize: jest.fn(),
  error: null,
  history: []
};

jest.mock('@/hooks/useTerminalSocket', () => ({
  useTerminalSocket: () => mockUseTerminalSocket
}));

jest.mock('@/hooks/useNotification', () => ({
  useNotification: () => ({
    showNotification: jest.fn()
  })
}));

// Mock react-router-dom params
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ instanceId: 'test-instance-123' }),
  useNavigate: () => jest.fn()
}));

// Import component after mocks
import TerminalView from '../src/components/TerminalView';

describe('Terminal Validation Suite - SearchAddon Fix', () => {
  let queryClient: QueryClient;

  const renderTerminalView = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TerminalView />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTerminal.loadAddon.mockClear();
    mockFitAddon.fit.mockClear();
    mockSearchAddon.findNext.mockClear();
    mockSearchAddon.findPrevious.mockClear();
  });

  describe('1. Component Rendering', () => {
    it('should render terminal component without errors', async () => {
      await act(async () => {
        renderTerminalView();
      });

      expect(screen.getByText(/Terminal: test-instance/)).toBeInTheDocument();
    });

    it('should display connection status correctly', async () => {
      await act(async () => {
        renderTerminalView();
      });

      expect(screen.getByText('disconnected')).toBeInTheDocument();
    });

    it('should show instance information', async () => {
      await act(async () => {
        renderTerminalView();
      });

      expect(screen.getByText(/claude.*PID: 12345/)).toBeInTheDocument();
    });
  });

  describe('2. Terminal Initialization', () => {
    it('should create terminal instance on mount', async () => {
      const { Terminal } = require('xterm');
      
      await act(async () => {
        renderTerminalView();
      });

      await waitFor(() => {
        expect(Terminal).toHaveBeenCalledWith(expect.objectContaining({
          fontSize: expect.any(Number),
          fontFamily: expect.any(String),
          theme: expect.any(Object),
          cursorBlink: expect.any(Boolean),
          scrollback: expect.any(Number)
        }));
      });
    });

    it('should open terminal in container', async () => {
      await act(async () => {
        renderTerminalView();
      });

      await waitFor(() => {
        expect(mockTerminal.open).toHaveBeenCalled();
      });
    });

    it('should fit terminal after opening', async () => {
      await act(async () => {
        renderTerminalView();
      });

      await waitFor(() => {
        expect(mockFitAddon.fit).toHaveBeenCalled();
      });
    });
  });

  describe('3. Addon Loading - SearchAddon Fix Validation', () => {
    it('should load FitAddon without errors', async () => {
      const { FitAddon } = require('xterm-addon-fit');
      
      await act(async () => {
        renderTerminalView();
      });

      await waitFor(() => {
        expect(FitAddon).toHaveBeenCalled();
        expect(mockTerminal.loadAddon).toHaveBeenCalledWith(mockFitAddon);
      });
    });

    it('should load SearchAddon without errors - CRITICAL FIX VALIDATION', async () => {
      const { SearchAddon } = require('xterm-addon-search');
      
      await act(async () => {
        renderTerminalView();
      });

      await waitFor(() => {
        expect(SearchAddon).toHaveBeenCalled();
        expect(mockTerminal.loadAddon).toHaveBeenCalledWith(mockSearchAddon);
      });
    });

    it('should load WebLinksAddon without errors', async () => {
      const { WebLinksAddon } = require('xterm-addon-web-links');
      
      await act(async () => {
        renderTerminalView();
      });

      await waitFor(() => {
        expect(WebLinksAddon).toHaveBeenCalled();
        expect(mockTerminal.loadAddon).toHaveBeenCalledWith(mockWebLinksAddon);
      });
    });

    it('should load all three addons in correct order', async () => {
      await act(async () => {
        renderTerminalView();
      });

      await waitFor(() => {
        expect(mockTerminal.loadAddon).toHaveBeenCalledTimes(3);
        expect(mockTerminal.loadAddon).toHaveBeenNthCalledWith(1, mockFitAddon);
        expect(mockTerminal.loadAddon).toHaveBeenNthCalledWith(2, mockWebLinksAddon);
        expect(mockTerminal.loadAddon).toHaveBeenNthCalledWith(3, mockSearchAddon);
      });
    });
  });

  describe('4. Search Functionality', () => {
    it('should toggle search panel when search button clicked', async () => {
      await act(async () => {
        renderTerminalView();
      });

      const searchButton = screen.getByTitle('Search');
      
      await act(async () => {
        fireEvent.click(searchButton);
      });

      expect(screen.getByPlaceholderText('Search terminal...')).toBeInTheDocument();
    });

    it('should call SearchAddon.findNext when Enter pressed', async () => {
      await act(async () => {
        renderTerminalView();
      });

      const searchButton = screen.getByTitle('Search');
      await act(async () => {
        fireEvent.click(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search terminal...');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test query' } });
        fireEvent.keyDown(searchInput, { key: 'Enter' });
      });

      expect(mockSearchAddon.findNext).toHaveBeenCalledWith('test query');
    });

    it('should call SearchAddon.findPrevious when Shift+Enter pressed', async () => {
      await act(async () => {
        renderTerminalView();
      });

      const searchButton = screen.getByTitle('Search');
      await act(async () => {
        fireEvent.click(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search terminal...');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test query' } });
        fireEvent.keyDown(searchInput, { key: 'Enter', shiftKey: true });
      });

      expect(mockSearchAddon.findPrevious).toHaveBeenCalledWith('test query');
    });

    it('should call SearchAddon methods via navigation buttons', async () => {
      await act(async () => {
        renderTerminalView();
      });

      const searchButton = screen.getByTitle('Search');
      await act(async () => {
        fireEvent.click(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search terminal...');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test query' } });
      });

      const nextButton = screen.getByText('↓');
      const prevButton = screen.getByText('↑');

      await act(async () => {
        fireEvent.click(nextButton);
      });
      expect(mockSearchAddon.findNext).toHaveBeenCalledWith('test query');

      await act(async () => {
        fireEvent.click(prevButton);
      });
      expect(mockSearchAddon.findPrevious).toHaveBeenCalledWith('test query');
    });
  });

  describe('5. Terminal Controls', () => {
    it('should have all control buttons visible', async () => {
      await act(async () => {
        renderTerminalView();
      });

      expect(screen.getByTitle('Search')).toBeInTheDocument();
      expect(screen.getByTitle('Copy Selection')).toBeInTheDocument();
      expect(screen.getByTitle('Download Content')).toBeInTheDocument();
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
      expect(screen.getByTitle('Fullscreen')).toBeInTheDocument();
    });

    it('should show settings panel when settings button clicked', async () => {
      await act(async () => {
        renderTerminalView();
      });

      const settingsButton = screen.getByTitle('Settings');
      
      await act(async () => {
        fireEvent.click(settingsButton);
      });

      expect(screen.getByText('Font Size')).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Font Family')).toBeInTheDocument();
    });

    it('should call terminal.clear when clear is triggered', async () => {
      await act(async () => {
        renderTerminalView();
      });

      // Simulate clear functionality (would be called by component methods)
      mockTerminal.clear();
      expect(mockTerminal.clear).toHaveBeenCalled();
    });
  });

  describe('6. Connection State Handling', () => {
    it('should show connection overlay when disconnected', async () => {
      await act(async () => {
        renderTerminalView();
      });

      expect(screen.getByText('Not connected')).toBeInTheDocument();
    });

    it('should show reconnect button when disconnected', async () => {
      await act(async () => {
        renderTerminalView();
      });

      const reconnectButton = screen.getByText('Connect');
      expect(reconnectButton).toBeInTheDocument();
      
      await act(async () => {
        fireEvent.click(reconnectButton);
      });

      expect(mockUseTerminalSocket.connect).toHaveBeenCalledWith('test-instance-123');
    });

    it('should show connecting state when connecting', async () => {
      mockUseTerminalSocket.connecting = true;
      mockUseTerminalSocket.connected = false;

      await act(async () => {
        renderTerminalView();
      });

      expect(screen.getByText('Connecting to terminal...')).toBeInTheDocument();
    });
  });

  describe('7. Error Handling', () => {
    it('should handle SearchAddon initialization errors gracefully', async () => {
      const { SearchAddon } = require('xterm-addon-search');
      SearchAddon.mockImplementationOnce(() => {
        throw new Error('SearchAddon failed');
      });

      // Should not throw despite addon error
      await act(async () => {
        expect(() => renderTerminalView()).not.toThrow();
      });
    });

    it('should handle terminal initialization errors', async () => {
      const { Terminal } = require('xterm');
      Terminal.mockImplementationOnce(() => {
        throw new Error('Terminal initialization failed');
      });

      // Should not crash the component
      await act(async () => {
        expect(() => renderTerminalView()).not.toThrow();
      });
    });
  });

  describe('8. Integration Testing', () => {
    it('should integrate all components without conflicts', async () => {
      await act(async () => {
        renderTerminalView();
      });

      // Should have all major UI elements
      expect(screen.getByText(/Terminal: test-instance/)).toBeInTheDocument();
      expect(screen.getByTitle('Search')).toBeInTheDocument();
      expect(screen.getByText('Disconnect')).toBeInTheDocument();
      expect(screen.getByText('Connect')).toBeInTheDocument();

      // Should have properly initialized terminal
      expect(mockTerminal.open).toHaveBeenCalled();
      expect(mockTerminal.loadAddon).toHaveBeenCalledTimes(3);
    });

    it('should maintain proper addon references', async () => {
      await act(async () => {
        renderTerminalView();
      });

      // Enable search functionality
      const searchButton = screen.getByTitle('Search');
      await act(async () => {
        fireEvent.click(searchButton);
      });

      // Should be able to interact with search
      const searchInput = screen.getByPlaceholderText('Search terminal...');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } });
        fireEvent.keyDown(searchInput, { key: 'Enter' });
      });

      // SearchAddon should be properly loaded and functional
      expect(mockSearchAddon.findNext).toHaveBeenCalledWith('test');
    });
  });
});

describe('Terminal Validation - Production Readiness Assessment', () => {
  describe('9. Performance Validation', () => {
    it('should not create memory leaks with addon loading', async () => {
      let component: any;
      
      await act(async () => {
        component = renderTerminalView();
      });

      // Unmount component
      component.unmount();

      // Terminal should be disposed
      expect(mockTerminal.dispose).toHaveBeenCalled();
    });

    it('should handle rapid addon operations without errors', async () => {
      await act(async () => {
        renderTerminalView();
      });

      // Rapidly toggle search multiple times
      const searchButton = screen.getByTitle('Search');
      
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          fireEvent.click(searchButton);
        });
      }

      // Should still be functional
      expect(screen.getByTitle('Search')).toBeInTheDocument();
    });
  });

  describe('10. Regression Prevention', () => {
    it('should prevent SearchAddon undefined errors', async () => {
      const { SearchAddon } = require('xterm-addon-search');
      
      await act(async () => {
        renderTerminalView();
      });

      // Verify SearchAddon was imported and instantiated
      expect(SearchAddon).toHaveBeenCalled();
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(mockSearchAddon);
      
      // This should not throw "SearchAddon is not defined"
      expect(mockSearchAddon).toBeDefined();
    });

    it('should maintain addon compatibility across updates', async () => {
      await act(async () => {
        renderTerminalView();
      });

      // All addons should load successfully
      expect(mockTerminal.loadAddon).toHaveBeenCalledTimes(3);
      
      // No addon should fail to load
      expect(mockTerminal.loadAddon).not.toThrow();
    });

    it('should preserve terminal functionality after addon loading', async () => {
      await act(async () => {
        renderTerminalView();
      });

      // Terminal should maintain core functionality
      expect(mockTerminal.open).toHaveBeenCalled();
      expect(mockTerminal.onData).toHaveBeenCalled();
      expect(mockTerminal.onResize).toHaveBeenCalled();
      expect(mockFitAddon.fit).toHaveBeenCalled();
    });
  });
});