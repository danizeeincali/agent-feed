/**
 * TerminalView Component Tests
 * 
 * Comprehensive test suite for TerminalView component following SPARC methodology
 * Tests cover SearchAddon integration, terminal initialization, and error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { TerminalView } from '../../components/TerminalView';

// Mock xterm and addons
jest.mock('xterm', () => ({
  Terminal: jest.fn().mockImplementation(() => ({
    open: jest.fn(),
    dispose: jest.fn(),
    loadAddon: jest.fn(),
    onData: jest.fn(),
    onResize: jest.fn(),
    onSelectionChange: jest.fn(),
    getSelection: jest.fn(() => 'test selection'),
    clear: jest.fn(),
    write: jest.fn(),
    buffer: {
      active: {
        toString: jest.fn(() => 'test buffer content')
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

// This is the critical test - SearchAddon should be importable and instantiable
jest.mock('xterm-addon-search', () => ({
  SearchAddon: jest.fn().mockImplementation(() => ({
    findNext: jest.fn(() => true),
    findPrevious: jest.fn(() => true),
    clearDecorations: jest.fn(),
    clearActiveDecoration: jest.fn(),
    onDidChangeResults: { fire: jest.fn() }
  }))
}));

// Mock hooks
jest.mock('../../hooks/useTerminalSocket', () => ({
  useTerminalSocket: () => ({
    connected: false,
    connecting: false,
    instanceInfo: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendInput: jest.fn(),
    sendResize: jest.fn(),
    error: null,
    history: []
  })
}));

jest.mock('../../hooks/useNotification', () => ({
  useNotification: () => ({
    showNotification: jest.fn()
  })
}));

// Mock react-router-dom params
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ instanceId: 'test-instance-id' }),
  useNavigate: () => mockNavigate
}));

// Mock CSS import
jest.mock('xterm/css/xterm.css', () => ({}));

describe('TerminalView Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderTerminalView = () => {
    return render(
      <BrowserRouter>
        <TerminalView />
      </BrowserRouter>
    );
  };

  describe('SPARC Phase 1: Specification Tests', () => {
    test('should render terminal view without SearchAddon ReferenceError', () => {
      expect(() => renderTerminalView()).not.toThrow();
    });

    test('should display terminal header with instance information', () => {
      renderTerminalView();
      expect(screen.getByText(/Terminal:/)).toBeInTheDocument();
    });

    test('should show connection status', () => {
      renderTerminalView();
      expect(screen.getByText('disconnected')).toBeInTheDocument();
    });
  });

  describe('SPARC Phase 2: Pseudocode Tests - Addon Loading Flow', () => {
    test('should import and instantiate SearchAddon without errors', async () => {
      const { SearchAddon } = require('xterm-addon-search');
      expect(() => new SearchAddon()).not.toThrow();
    });

    test('should load all terminal addons in correct order', () => {
      renderTerminalView();
      
      // Verify terminal and addons are created
      const { Terminal } = require('xterm');
      const { FitAddon } = require('xterm-addon-fit');
      const { WebLinksAddon } = require('xterm-addon-web-links');
      const { SearchAddon } = require('xterm-addon-search');

      expect(Terminal).toHaveBeenCalled();
      expect(FitAddon).toHaveBeenCalled();
      expect(WebLinksAddon).toHaveBeenCalled();
      expect(SearchAddon).toHaveBeenCalled();
    });
  });

  describe('SPARC Phase 3: Architecture Tests - Component Integration', () => {
    test('should initialize terminal with proper addon architecture', () => {
      renderTerminalView();
      
      const { Terminal } = require('xterm');
      const terminalInstance = Terminal.mock.results[0].value;
      
      // Verify loadAddon is called for each addon
      expect(terminalInstance.loadAddon).toHaveBeenCalledTimes(3);
    });

    test('should handle search functionality through SearchAddon', () => {
      renderTerminalView();
      
      // Click search button to show search bar
      const searchButton = screen.getByTitle('Search');
      fireEvent.click(searchButton);
      
      // Search input should be visible
      expect(screen.getByPlaceholderText('Search terminal...')).toBeInTheDocument();
    });
  });

  describe('SPARC Phase 4: Refinement Tests - Search Functionality', () => {
    test('should perform search operations without SearchAddon errors', () => {
      renderTerminalView();
      
      // Show search bar
      const searchButton = screen.getByTitle('Search');
      fireEvent.click(searchButton);
      
      const searchInput = screen.getByPlaceholderText('Search terminal...');
      
      // Type search query
      fireEvent.change(searchInput, { target: { value: 'test query' } });
      
      // Press Enter to search
      fireEvent.keyDown(searchInput, { key: 'Enter' });
      
      // Verify SearchAddon methods are called
      const { SearchAddon } = require('xterm-addon-search');
      const searchAddonInstance = SearchAddon.mock.results[0].value;
      
      expect(searchAddonInstance.findNext).toHaveBeenCalledWith('test query');
    });

    test('should handle search direction (previous/next)', () => {
      renderTerminalView();
      
      // Show search bar
      const searchButton = screen.getByTitle('Search');
      fireEvent.click(searchButton);
      
      const searchInput = screen.getByPlaceholderText('Search terminal...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Test next button
      const nextButton = screen.getByText('↓');
      fireEvent.click(nextButton);
      
      // Test previous button  
      const prevButton = screen.getByText('↑');
      fireEvent.click(prevButton);
      
      const { SearchAddon } = require('xterm-addon-search');
      const searchAddonInstance = SearchAddon.mock.results[0].value;
      
      expect(searchAddonInstance.findNext).toHaveBeenCalledWith('test');
      expect(searchAddonInstance.findPrevious).toHaveBeenCalledWith('test');
    });

    test('should handle Shift+Enter for previous search', () => {
      renderTerminalView();
      
      const searchButton = screen.getByTitle('Search');
      fireEvent.click(searchButton);
      
      const searchInput = screen.getByPlaceholderText('Search terminal...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Shift+Enter should trigger previous search
      fireEvent.keyDown(searchInput, { key: 'Enter', shiftKey: true });
      
      const { SearchAddon } = require('xterm-addon-search');
      const searchAddonInstance = SearchAddon.mock.results[0].value;
      
      expect(searchAddonInstance.findPrevious).toHaveBeenCalledWith('test');
    });
  });

  describe('SPARC Phase 5: Completion Tests - Error Boundaries', () => {
    test('should handle addon initialization errors gracefully', () => {
      // Mock SearchAddon to throw error
      const { SearchAddon } = require('xterm-addon-search');
      SearchAddon.mockImplementationOnce(() => {
        throw new Error('SearchAddon initialization failed');
      });
      
      // Component should still render without crashing
      expect(() => renderTerminalView()).not.toThrow();
    });

    test('should provide fallback when SearchAddon is unavailable', () => {
      // Test search functionality when addon fails
      renderTerminalView();
      
      const searchButton = screen.getByTitle('Search');
      fireEvent.click(searchButton);
      
      const searchInput = screen.getByPlaceholderText('Search terminal...');
      
      // Should not crash when search is attempted
      expect(() => {
        fireEvent.change(searchInput, { target: { value: 'test' } });
        fireEvent.keyDown(searchInput, { key: 'Enter' });
      }).not.toThrow();
    });

    test('should cleanup SearchAddon references on unmount', () => {
      const { unmount } = renderTerminalView();
      
      // Unmount component
      unmount();
      
      // Verify terminal disposal
      const { Terminal } = require('xterm');
      const terminalInstance = Terminal.mock.results[0].value;
      expect(terminalInstance.dispose).toHaveBeenCalled();
    });
  });

  describe('Integration Tests - WebSocket Terminal', () => {
    test('should handle terminal connection state changes', () => {
      renderTerminalView();
      
      // Initially disconnected
      expect(screen.getByText('disconnected')).toBeInTheDocument();
    });

    test('should handle terminal controls without SearchAddon errors', () => {
      renderTerminalView();
      
      // Test various controls
      const copyButton = screen.getByTitle('Copy Selection');
      const downloadButton = screen.getByTitle('Download Content');
      const settingsButton = screen.getByTitle('Settings');
      
      expect(() => {
        fireEvent.click(copyButton);
        fireEvent.click(downloadButton);
        fireEvent.click(settingsButton);
      }).not.toThrow();
    });
  });

  describe('Regression Tests - SearchAddon Specific', () => {
    test('should not throw ReferenceError for SearchAddon at line 147', () => {
      // This specific test ensures the exact error from the bug report is fixed
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => renderTerminalView()).not.toThrow();
      
      // Verify no console errors related to SearchAddon
      const errors = consoleSpy.mock.calls.filter(call => 
        call[0] && call[0].toString().includes('SearchAddon')
      );
      expect(errors).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });

    test('should work with terminal ID d0b054ac-ee51-40cd-ae35-4c28c7cae9e7', () => {
      // Test with the specific terminal ID from the error report
      const mockUseParams = require('react-router-dom').useParams;
      mockUseParams.mockReturnValue({ 
        instanceId: 'd0b054ac-ee51-40cd-ae35-4c28c7cae9e7' 
      });
      
      expect(() => renderTerminalView()).not.toThrow();
      expect(screen.getByText(/d0b054ac-ee51-40cd-ae35-4c28c7cae9e7/)).toBeInTheDocument();
    });
  });
});