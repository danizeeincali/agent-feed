/**
 * TDD London School Test Suite - DualInstance Routing Tests
 * 
 * Focused on testing routing behavior and page loading interactions
 * to identify navigation-related white screen issues
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DualInstance from '../../src/pages/DualInstance';

// Mock Terminal dependencies - London School approach
jest.mock('@xterm/xterm', () => ({
  Terminal: jest.fn().mockImplementation(() => ({
    open: mockTerminalOpen,
    dispose: mockTerminalDispose,
    writeln: mockTerminalWriteln,
    write: mockTerminalWrite,
    onData: mockTerminalOnData,
    cols: 80,
    rows: 24,
    loadAddon: mockLoadAddon
  }))
}));

jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn().mockImplementation(() => ({
    fit: mockFitAddonFit
  }))
}));

jest.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn().mockImplementation(() => ({
    on: mockSocketOn,
    emit: mockSocketEmit,
    disconnect: mockSocketDisconnect
  }))
}));

jest.mock('../../src/components/DualInstanceMonitor', () => {
  return function MockDualInstanceMonitor() {
    mockDualInstanceMonitor.mockCalls.push({});
    return <div data-testid="dual-instance-monitor">Instance Monitor Component</div>;
  };
});

// Mock CSS imports
jest.mock('@xterm/xterm/css/xterm.css', () => ({}));

// London School mock objects for interaction verification
const mockTerminalOpen = jest.fn();
const mockTerminalDispose = jest.fn();
const mockTerminalWriteln = jest.fn();
const mockTerminalWrite = jest.fn();
const mockTerminalOnData = jest.fn();
const mockLoadAddon = jest.fn();
const mockFitAddonFit = jest.fn();
const mockSocketOn = jest.fn();
const mockSocketEmit = jest.fn();
const mockSocketDisconnect = jest.fn();
const mockDualInstanceMonitor = jest.fn();

describe('DualInstance Page Routing - London School TDD', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockTerminalOpen.mockClear();
    mockTerminalDispose.mockClear();
    mockTerminalWriteln.mockClear();
    mockTerminalWrite.mockClear();
    mockTerminalOnData.mockClear();
    mockLoadAddon.mockClear();
    mockFitAddonFit.mockClear();
    mockSocketOn.mockClear();
    mockSocketEmit.mockClear();
    mockSocketDisconnect.mockClear();
    mockDualInstanceMonitor.mockCalls.length = 0;

    // Setup default socket behavior
    mockSocketOn.mockImplementation((event, callback) => {
      if (event === 'connect') {
        setTimeout(() => callback(), 0);
      }
      return jest.fn();
    });
  });

  afterEach(() => {
    // Cleanup any timers or pending operations
    jest.clearAllTimers();
  });

  describe('Page Initialization and Component Loading', () => {
    it('should render DualInstance page without white screen', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      // Verify page content is rendered immediately
      expect(container.firstChild).not.toBeEmptyDOMElement();
      
      // Check for essential page elements
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      expect(screen.getByText('Claude Instance')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByTestId('dual-instance-monitor')).toBeInTheDocument();
      });
    });

    it('should initialize terminal component correctly', async () => {
      render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      // Verify terminal initialization sequence
      await waitFor(() => {
        expect(mockTerminalOpen).toHaveBeenCalledTimes(1);
        expect(mockLoadAddon).toHaveBeenCalledTimes(2); // FitAddon and WebLinksAddon
        expect(mockFitAddonFit).toHaveBeenCalledTimes(1);
      });

      // Check terminal container is rendered
      expect(screen.getByText('Terminal (Shared across all tabs)')).toBeInTheDocument();
    });

    it('should establish WebSocket connection on mount', async () => {
      render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      // Verify WebSocket connection is established
      await waitFor(() => {
        expect(mockSocketOn).toHaveBeenCalledWith('connect', expect.any(Function));
        expect(mockSocketOn).toHaveBeenCalledWith('disconnect', expect.any(Function));
        expect(mockSocketOn).toHaveBeenCalledWith('process:info', expect.any(Function));
        expect(mockSocketOn).toHaveBeenCalledWith('terminal:data', expect.any(Function));
      });

      // Verify process info request is sent
      await waitFor(() => {
        expect(mockSocketEmit).toHaveBeenCalledWith('process:info');
      });
    });

    it('should load DualInstanceMonitor component', async () => {
      render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockDualInstanceMonitor).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('dual-instance-monitor')).toBeVisible();
      });
    });
  });

  describe('Process Control Interface Behavior', () => {
    it('should render process control buttons in correct initial state', async () => {
      render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      // Verify control buttons are present
      const launchButton = screen.getByText('Launch New Instance');
      const restartButton = screen.getByText('Restart');
      const killButton = screen.getByText('Kill');
      const configButton = screen.getByText('Config');

      expect(launchButton).toBeInTheDocument();
      expect(restartButton).toBeInTheDocument();
      expect(killButton).toBeInTheDocument();
      expect(configButton).toBeInTheDocument();

      // Verify initial disabled state (process not running)
      expect(restartButton).toBeDisabled();
      expect(killButton).toBeDisabled();
      expect(launchButton).not.toBeDisabled();
    });

    it('should handle process launch interaction', async () => {
      render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      const launchButton = screen.getByText('Launch New Instance');
      
      // Simulate launch button click
      await act(async () => {
        launchButton.click();
      });

      // Verify launch command is sent via WebSocket
      await waitFor(() => {
        expect(mockSocketEmit).toHaveBeenCalledWith('process:launch', {
          autoRestartHours: 6,
          workingDirectory: '/workspaces/agent-feed/prod',
          resumeOnRestart: true,
          agentLinkEnabled: true
        });
      });

      // Button should show launching state
      expect(screen.getByText('Launching...')).toBeInTheDocument();
    });

    it('should update UI when process status changes', async () => {
      render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      // Simulate process info update via WebSocket
      const mockProcessInfo = {
        pid: 12345,
        name: 'Claude Instance',
        status: 'running' as const,
        startTime: new Date(),
        autoRestartEnabled: true,
        autoRestartHours: 6
      };

      // Find the process:info callback and trigger it
      const processInfoCallback = mockSocketOn.mock.calls.find(
        call => call[0] === 'process:info'
      )?.[1];

      if (processInfoCallback) {
        act(() => {
          processInfoCallback(mockProcessInfo);
        });
      }

      await waitFor(() => {
        // UI should reflect running status
        expect(screen.getByText('PID: 12345')).toBeInTheDocument();
        expect(screen.getByText('Auto-restart: 6h')).toBeInTheDocument();
        
        // Control buttons should update
        expect(screen.getByText('Launch New Instance')).toBeDisabled();
        expect(screen.getByText('Restart')).not.toBeDisabled();
        expect(screen.getByText('Kill')).not.toBeDisabled();
      });
    });
  });

  describe('Configuration Panel Interaction', () => {
    it('should toggle configuration panel', async () => {
      render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      const configButton = screen.getByText('Config');

      // Config panel should not be visible initially
      expect(screen.queryByText('Configuration')).not.toBeInTheDocument();

      // Click to open config panel
      await act(async () => {
        configButton.click();
      });

      // Config panel should now be visible
      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument();
        expect(screen.getByText('Auto-restart every:')).toBeInTheDocument();
      });
    });

    it('should handle configuration updates', async () => {
      render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      // Open config panel
      const configButton = screen.getByText('Config');
      await act(async () => {
        configButton.click();
      });

      await waitFor(() => {
        const autoRestartInput = screen.getByDisplayValue('6');
        const applyButton = screen.getByText('Apply');

        // Change auto-restart value
        act(() => {
          autoRestartInput.focus();
          autoRestartInput.setSelectionRange(0, 1);
        });

        // Click apply
        act(() => {
          applyButton.click();
        });

        // Verify config update is sent
        expect(mockSocketEmit).toHaveBeenCalledWith('process:config', {
          autoRestartHours: 6
        });
      });
    });
  });

  describe('Terminal Integration Behavior', () => {
    it('should handle terminal data reception', async () => {
      render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      // Find terminal:data callback
      const terminalDataCallback = mockSocketOn.mock.calls.find(
        call => call[0] === 'terminal:data'
      )?.[1];

      if (terminalDataCallback) {
        const testData = {
          type: 'output',
          data: 'Test terminal output',
          timestamp: new Date()
        };

        act(() => {
          terminalDataCallback(testData);
        });

        // Verify terminal write is called
        await waitFor(() => {
          expect(mockTerminalWrite).toHaveBeenCalledWith('Test terminal output');
        });
      }
    });

    it('should handle terminal input', async () => {
      render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      // Simulate terminal data input
      const onDataCallback = mockTerminalOnData.mock.calls[0]?.[0];
      
      if (onDataCallback) {
        act(() => {
          onDataCallback('test input');
        });

        // Verify input is sent via WebSocket
        await waitFor(() => {
          expect(mockSocketEmit).toHaveBeenCalledWith('terminal:input', 'test input');
        });
      }
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup resources on unmount', async () => {
      const { unmount } = render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      // Unmount component
      unmount();

      await waitFor(() => {
        // Verify cleanup calls
        expect(mockSocketDisconnect).toHaveBeenCalledTimes(1);
        expect(mockTerminalDispose).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle window resize events', async () => {
      render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      // Simulate window resize
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        // Verify terminal fit is called
        expect(mockFitAddonFit).toHaveBeenCalledTimes(2); // Initial + resize
        
        // Verify resize event is sent via WebSocket
        expect(mockSocketEmit).toHaveBeenCalledWith('terminal:resize', {
          cols: 80,
          rows: 24
        });
      });
    });
  });

  describe('Error Handling and Fallback Behavior', () => {
    it('should handle WebSocket connection errors gracefully', async () => {
      // Mock WebSocket disconnect
      mockSocketOn.mockImplementation((event, callback) => {
        if (event === 'disconnect') {
          setTimeout(() => callback(), 100);
        }
        return jest.fn();
      });

      render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockTerminalWriteln).toHaveBeenCalledWith(
          '\x1b[31m✗ Disconnected from terminal server\x1b[0m'
        );
      });
    });

    it('should handle process launch errors', async () => {
      render(
        <MemoryRouter initialEntries={['/dual-instance']}>
          <DualInstance />
        </MemoryRouter>
      );

      // Mock process error event
      const processErrorCallback = mockSocketOn.mock.calls.find(
        call => call[0] === 'process:error'
      )?.[1];

      if (processErrorCallback) {
        const errorData = {
          message: 'Failed to start process',
          action: 'launch'
        };

        // Mock window.alert
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

        act(() => {
          processErrorCallback(errorData);
        });

        await waitFor(() => {
          expect(mockTerminalWriteln).toHaveBeenCalledWith(
            '\x1b[31m✗ Error during launch: Failed to start process\x1b[0m'
          );
          expect(alertSpy).toHaveBeenCalledWith(
            'Failed to launch Claude instance: Failed to start process'
          );
        });

        alertSpy.mockRestore();
      }
    });
  });
});