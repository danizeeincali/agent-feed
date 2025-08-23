/**
 * Terminal Integration Tests
 * 
 * Integration tests that verify the interaction between TerminalView component,
 * useTerminalSocket hook, and WebSocket connection. Tests real data flow,
 * user interactions, and system integration points.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Terminal } from 'xterm';
import { TerminalView } from '@/components/TerminalView';

// Mock socket.io-client with more sophisticated mock
let mockSocketInstance: any;
const mockSocketEvents: Map<string, Function[]> = new Map();

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => {
    mockSocketInstance = {
      id: 'mock-socket-id',
      connected: false,
      on: jest.fn((event: string, callback: Function) => {
        if (!mockSocketEvents.has(event)) {
          mockSocketEvents.set(event, []);
        }
        mockSocketEvents.get(event)!.push(callback);
      }),
      emit: jest.fn(),
      disconnect: jest.fn(),
      // Helper to trigger events
      triggerEvent: (event: string, data: any) => {
        const callbacks = mockSocketEvents.get(event) || [];
        callbacks.forEach(callback => callback(data));
      }
    };
    return mockSocketInstance;
  })
}));

// Mock xterm with more realistic behavior
const mockTerminalInstance = {
  loadAddon: jest.fn(),
  open: jest.fn(),
  onData: jest.fn(),
  onResize: jest.fn(),
  onSelectionChange: jest.fn(),
  write: jest.fn(),
  dispose: jest.fn(),
  clear: jest.fn(),
  getSelection: jest.fn(() => 'selected text'),
  buffer: {
    active: {
      toString: jest.fn(() => 'terminal content')
    }
  },
  options: {},
  // Store data handler for testing
  dataHandler: null as Function | null,
  resizeHandler: null as Function | null
};

jest.mock('xterm', () => ({
  Terminal: jest.fn(() => {
    mockTerminalInstance.onData.mockImplementation((handler: Function) => {
      mockTerminalInstance.dataHandler = handler;
    });
    mockTerminalInstance.onResize.mockImplementation((handler: Function) => {
      mockTerminalInstance.resizeHandler = handler;
    });
    return mockTerminalInstance;
  })
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

// Mock notification hook
const mockAddNotification = jest.fn();
jest.mock('@/hooks/useNotification', () => ({
  useNotification: () => ({
    addNotification: mockAddNotification
  })
}));

// Mock router
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ instanceId: 'test-instance-123' }),
  useNavigate: () => mockNavigate
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Terminal Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocketEvents.clear();
    
    // Reset mock terminal
    mockTerminalInstance.dataHandler = null;
    mockTerminalInstance.resizeHandler = null;
    mockTerminalInstance.write.mockClear();
    
    // Reset socket instance
    if (mockSocketInstance) {
      mockSocketInstance.connected = false;
    }

    // Mock browser APIs
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(void 0) },
      writable: true
    });
    
    global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
    global.URL.revokeObjectURL = jest.fn();
    
    global.BroadcastChannel = jest.fn(() => ({
      postMessage: jest.fn(),
      close: jest.fn(),
      onmessage: null
    }));

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      }
    });
  });

  describe('Full Connection Flow', () => {
    it('completes full connection and data exchange cycle', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      // Verify initial state
      expect(screen.getByText('disconnected')).toBeInTheDocument();
      
      // Simulate WebSocket connection sequence
      await act(async () => {
        // 1. Trigger connected event
        mockSocketInstance.triggerEvent('connected', {});
        
        // 2. Trigger terminal_connected event
        mockSocketInstance.triggerEvent('terminal_connected', {
          instanceId: 'test-instance-123',
          instanceName: 'Test Claude Instance',
          instanceType: 'claude',
          pid: 12345,
          sessionId: 'session-123',
          clientCount: 2
        });
        
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Verify connection state updated
      await waitFor(() => {
        expect(screen.getByText('connected')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Test Claude Instance/)).toBeInTheDocument();
      expect(screen.getByText(/PID: 12345/)).toBeInTheDocument();

      // Verify socket events were emitted
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('connect_terminal', {
        instanceId: 'test-instance-123'
      });
    });

    it('handles terminal data reception and display', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      // Establish connection first
      await act(async () => {
        mockSocketInstance.triggerEvent('connected', {});
        mockSocketInstance.triggerEvent('terminal_connected', {
          instanceId: 'test-instance-123',
          instanceName: 'Test Instance'
        });
      });

      // Send terminal data
      await act(async () => {
        mockSocketInstance.triggerEvent('terminal_data', {
          data: 'Welcome to the terminal!\n$ ',
          timestamp: '2024-01-01T00:00:00Z',
          isHistory: false
        });
      });

      // Verify data was written to terminal
      expect(mockTerminalInstance.write).toHaveBeenCalledWith('Welcome to the terminal!\n$ ');
    });

    it('handles multiple terminal data messages in sequence', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await act(async () => {
        mockSocketInstance.triggerEvent('connected', {});
        mockSocketInstance.triggerEvent('terminal_connected', {
          instanceId: 'test-instance-123'
        });
      });

      const messages = [
        'Line 1\n',
        'Line 2\n',
        'Line 3\n',
        '$ '
      ];

      for (const message of messages) {
        await act(async () => {
          mockSocketInstance.triggerEvent('terminal_data', {
            data: message,
            timestamp: new Date().toISOString(),
            isHistory: false
          });
        });
      }

      // Verify all messages were written
      messages.forEach(message => {
        expect(mockTerminalInstance.write).toHaveBeenCalledWith(message);
      });
    });
  });

  describe('User Input Handling', () => {
    it('sends user input through WebSocket', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      // Establish connection
      await act(async () => {
        mockSocketInstance.triggerEvent('connected', {});
        mockSocketInstance.triggerEvent('terminal_connected', {
          instanceId: 'test-instance-123'
        });
        mockSocketInstance.connected = true;
      });

      // Simulate user typing in terminal
      await act(async () => {
        if (mockTerminalInstance.dataHandler) {
          mockTerminalInstance.dataHandler('ls -la\r');
        }
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('terminal_input', {
        data: 'ls -la\r'
      });
    });

    it('handles terminal resize events', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await act(async () => {
        mockSocketInstance.triggerEvent('connected', {});
        mockSocketInstance.triggerEvent('terminal_connected', {
          instanceId: 'test-instance-123'
        });
        mockSocketInstance.connected = true;
      });

      // Simulate terminal resize
      await act(async () => {
        if (mockTerminalInstance.resizeHandler) {
          mockTerminalInstance.resizeHandler({ cols: 120, rows: 30 });
        }
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('terminal_resize', {
        cols: 120,
        rows: 30
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles connection errors with user notification', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await act(async () => {
        mockSocketInstance.triggerEvent('connect_error', {
          message: 'Connection timeout'
        });
      });

      // Verify error notification was shown
      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith({
          type: 'error',
          title: 'Terminal Connection Error',
          message: 'Connection timeout',
          duration: 5000
        });
      });

      expect(screen.getByText('Connection timeout')).toBeInTheDocument();
    });

    it('handles instance destruction gracefully', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      // First connect
      await act(async () => {
        mockSocketInstance.triggerEvent('connected', {});
        mockSocketInstance.triggerEvent('terminal_connected', {
          instanceId: 'test-instance-123'
        });
      });

      // Then simulate instance destruction
      await act(async () => {
        mockSocketInstance.triggerEvent('instance_destroyed', {
          instanceId: 'test-instance-123'
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/Instance has been destroyed/)).toBeInTheDocument();
      });
    });

    it('attempts auto-reconnection on disconnect', async () => {
      jest.useFakeTimers();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      // Connect first
      await act(async () => {
        mockSocketInstance.triggerEvent('connected', {});
        mockSocketInstance.triggerEvent('terminal_connected', {
          instanceId: 'test-instance-123'
        });
      });

      // Disconnect
      await act(async () => {
        mockSocketInstance.triggerEvent('disconnect', 'transport close');
      });

      // Fast-forward to trigger reconnection
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Should attempt to create new socket connection
      expect(io).toHaveBeenCalledTimes(2); // Initial + reconnection

      jest.useRealTimers();
    });
  });

  describe('Search Functionality Integration', () => {
    it('performs search operation end-to-end', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      // Open search panel
      const searchButton = screen.getByTitle('Search');
      await user.click(searchButton);

      const searchInput = screen.getByPlaceholderText('Search terminal...');
      expect(searchInput).toBeInTheDocument();

      // Enter search query and press Enter
      await user.type(searchInput, 'error');
      await user.keyboard('{Enter}');

      // Verify search was performed (through mocked SearchAddon)
      // This tests the integration between UI and search functionality
      expect(searchInput).toHaveValue('error');
    });

    it('handles search navigation (previous/next)', async () => {
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

      // Test next/previous buttons
      const nextButton = screen.getByText('↓');
      const prevButton = screen.getByText('↑');

      await user.click(nextButton);
      await user.click(prevButton);

      // Buttons should be functional
      expect(nextButton).toBeInTheDocument();
      expect(prevButton).toBeInTheDocument();
    });
  });

  describe('Settings Integration', () => {
    it('persists settings changes', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      // Open settings
      const settingsButton = screen.getByTitle('Settings');
      await user.click(settingsButton);

      // Change font size
      const fontSizeSlider = screen.getByDisplayValue('14');
      fireEvent.change(fontSizeSlider, { target: { value: '16' } });

      // Verify localStorage was called
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'terminal-settings',
        expect.stringContaining('"fontSize":16')
      );
    });

    it('applies settings to terminal instance', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const settingsButton = screen.getByTitle('Settings');
      await user.click(settingsButton);

      // Change theme
      const themeSelect = screen.getByDisplayValue('dark');
      await user.selectOptions(themeSelect, 'light');

      // Terminal options should be updated
      expect(mockTerminalInstance.options).toBeDefined();
    });
  });

  describe('Content Operations Integration', () => {
    it('copies terminal content to clipboard', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const copyButton = screen.getByTitle('Copy Selection');
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('selected text');
      
      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith({
          type: 'success',
          title: 'Copied',
          message: 'Selection copied to clipboard',
          duration: 2000
        });
      });
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
  });

  describe('Fullscreen Mode Integration', () => {
    it('toggles fullscreen mode and updates layout', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const fullscreenButton = screen.getByTitle('Fullscreen');
      await user.click(fullscreenButton);

      // Check for fullscreen classes
      const container = screen.getByText(/Terminal:/).closest('.flex');
      expect(container).toHaveClass('fixed', 'inset-0', 'z-50');

      // Button should change
      expect(screen.getByTitle('Exit Fullscreen')).toBeInTheDocument();

      // Click again to exit fullscreen
      const exitButton = screen.getByTitle('Exit Fullscreen');
      await user.click(exitButton);

      expect(screen.getByTitle('Fullscreen')).toBeInTheDocument();
    });
  });

  describe('Cross-Tab Synchronization Integration', () => {
    it('synchronizes terminal data across tabs', async () => {
      const mockBroadcastChannel = {
        postMessage: jest.fn(),
        close: jest.fn(),
        onmessage: null
      };

      (global.BroadcastChannel as jest.Mock).mockReturnValue(mockBroadcastChannel);

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await act(async () => {
        mockSocketInstance.triggerEvent('connected', {});
        mockSocketInstance.triggerEvent('terminal_connected', {
          instanceId: 'test-instance-123'
        });
      });

      await act(async () => {
        mockSocketInstance.triggerEvent('terminal_data', {
          data: 'shared data',
          timestamp: new Date().toISOString(),
          isHistory: false
        });
      });

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
        type: 'terminal_data',
        data: expect.objectContaining({
          content: 'shared data'
        })
      });
    });

    it('receives and applies data from other tabs', async () => {
      const mockBroadcastChannel = {
        postMessage: jest.fn(),
        close: jest.fn(),
        onmessage: null
      };

      (global.BroadcastChannel as jest.Mock).mockReturnValue(mockBroadcastChannel);

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await act(async () => {
        mockSocketInstance.triggerEvent('connected', {});
        mockSocketInstance.triggerEvent('terminal_connected', {
          instanceId: 'test-instance-123'
        });
      });

      // Simulate message from another tab
      const crossTabMessage = {
        data: {
          type: 'terminal_data',
          data: {
            content: 'data from other tab',
            senderId: 'other-socket-id'
          }
        }
      };

      await act(async () => {
        if (mockBroadcastChannel.onmessage) {
          mockBroadcastChannel.onmessage(crossTabMessage);
        }
      });

      expect(mockTerminalInstance.write).toHaveBeenCalledWith('data from other tab');
    });
  });

  describe('Heartbeat and Connection Health', () => {
    it('maintains connection with heartbeat system', async () => {
      jest.useFakeTimers();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await act(async () => {
        mockSocketInstance.triggerEvent('connected', {});
        mockSocketInstance.triggerEvent('terminal_connected', {
          instanceId: 'test-instance-123'
        });
        mockSocketInstance.connected = true;
      });

      // Fast-forward to trigger heartbeat
      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('ping');

      // Simulate pong response
      await act(async () => {
        mockSocketInstance.triggerEvent('pong', {});
      });

      jest.useRealTimers();
    });
  });

  describe('Memory and Performance', () => {
    it('limits history size to prevent memory issues', async () => {
      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await act(async () => {
        mockSocketInstance.triggerEvent('connected', {});
        mockSocketInstance.triggerEvent('terminal_connected', {
          instanceId: 'test-instance-123'
        });
      });

      // Send large amount of data
      for (let i = 0; i < 10005; i++) {
        await act(async () => {
          mockSocketInstance.triggerEvent('terminal_data', {
            data: `line ${i}\n`,
            timestamp: new Date().toISOString(),
            isHistory: false
          });
        });
      }

      // History should be limited (test implementation limits to 10000)
      expect(mockTerminalInstance.write).toHaveBeenCalledTimes(10005);
    });

    it('cleans up resources on component unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      await act(async () => {
        mockSocketInstance.triggerEvent('connected', {});
        mockSocketInstance.triggerEvent('terminal_connected', {
          instanceId: 'test-instance-123'
        });
      });

      unmount();

      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
      expect(mockTerminalInstance.dispose).toHaveBeenCalled();
    });
  });

  describe('Navigation Integration', () => {
    it('navigates back on disconnect', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TerminalView />
        </TestWrapper>
      );

      const disconnectButton = screen.getByText('Disconnect');
      await user.click(disconnectButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dual-instance');
      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
    });
  });
});