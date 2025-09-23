/**
 * @file Terminal Component Unit Tests
 * @description Comprehensive TDD tests for Terminal component with WebSocket functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TerminalComponent } from '@/components/Terminal';

// Mock dependencies
vi.mock('xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    loadAddon: vi.fn(),
    open: vi.fn(),
    write: vi.fn(),
    writeln: vi.fn(),
    focus: vi.fn(),
    dispose: vi.fn(),
    onData: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    cols: 80,
    rows: 24,
  })),
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
  })),
}));

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn(),
}));

vi.mock('@xterm/addon-search', () => ({
  SearchAddon: vi.fn(),
}));

vi.mock('@/utils/terminal-width-calculator', () => ({
  calculateTerminalDimensions: vi.fn().mockReturnValue({ cols: 120, rows: 30 }),
  analyzeCascadePotential: vi.fn().mockReturnValue({ risk: 'low' }),
  findOptimalTerminalWidth: vi.fn().mockReturnValue(120),
  recommendTerminalWidth: vi.fn().mockReturnValue({ recommendedCols: 120 }),
  detectRealTimeCascade: vi.fn().mockReturnValue(false),
}));

vi.mock('@/utils/terminalViewport', () => ({
  getResponsiveTerminalDimensions: vi.fn().mockReturnValue({ cols: 120, rows: 30 }),
  validateClaudeCliSupport: vi.fn().mockReturnValue({ 
    canHandle: true, 
    cascadeRisk: 'low',
    recommendation: 'Terminal width is optimal'
  }),
  createTerminalResizeObserver: vi.fn().mockReturnValue({
    observe: vi.fn(),
    disconnect: vi.fn(),
  }),
  debugViewportCorrelation: vi.fn(),
  getBreakpointConfig: vi.fn().mockReturnValue({ name: 'desktop', fontSize: 14 }),
}));

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  
  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  
  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }
  
  send = vi.fn();
  close = vi.fn().mockImplementation(() => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));
    }
  });
}

global.WebSocket = MockWebSocket as any;

const mockProcessStatus = {
  isRunning: true,
  pid: 12345,
  status: 'running',
};

describe('TerminalComponent', () => {
  const mockTerminalInstance = {
    loadAddon: vi.fn(),
    open: vi.fn(),
    write: vi.fn(),
    writeln: vi.fn(),
    focus: vi.fn(),
    dispose: vi.fn(),
    onData: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    cols: 80,
    rows: 24,
  };

  const mockFitAddon = {
    fit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const { Terminal } = require('xterm');
    const { FitAddon } = require('@xterm/addon-fit');
    Terminal.mockReturnValue(mockTerminalInstance);
    FitAddon.mockReturnValue(mockFitAddon);
  });

  describe('Component Rendering', () => {
    it('should render without crashing when visible', () => {
      expect(() => render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      )).not.toThrow();
    });

    it('should not render when not visible', () => {
      const { container } = render(
        <TerminalComponent 
          isVisible={false} 
          processStatus={mockProcessStatus} 
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should render terminal header with process information', () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );
      
      expect(screen.getByText('Claude Terminal')).toBeInTheDocument();
      expect(screen.getByText('PID: 12345')).toBeInTheDocument();
    });

    it('should show connection status', () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );
      
      expect(screen.getByText(/🔴 Disconnected/)).toBeInTheDocument();
    });

    it('should display terminal dimensions', () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );
      
      expect(screen.getByText(/120×30/)).toBeInTheDocument();
    });
  });

  describe('Terminal Initialization', () => {
    it('should initialize xterm.js when component becomes visible', async () => {
      const { Terminal } = require('xterm');
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(Terminal).toHaveBeenCalledWith(expect.objectContaining({
          cursorBlink: true,
          fontSize: 14,
          cols: 120,
          rows: 30,
        }));
      });
    });

    it('should load required addons', async () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(mockTerminalInstance.loadAddon).toHaveBeenCalledTimes(3); // FitAddon, WebLinksAddon, SearchAddon
      });
    });

    it('should open terminal in container', async () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(mockTerminalInstance.open).toHaveBeenCalled();
      });
    });

    it('should fit terminal to container', async () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(mockFitAddon.fit).toHaveBeenCalled();
      });
    });

    it('should write welcome message', async () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(mockTerminalInstance.writeln).toHaveBeenCalledWith(
          expect.stringContaining('Claude Code Terminal')
        );
      });
    });
  });

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection when process is running', async () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(MockWebSocket).toHaveBeenCalledWith('ws://localhost:3002/terminal');
      });
    });

    it('should update connection status when connected', async () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/🟢 Connected/)).toBeInTheDocument();
      });
    });

    it('should send init message on connection', async () => {
      const mockSend = vi.fn();
      MockWebSocket.prototype.send = mockSend;

      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'init',
            pid: 12345,
            cols: 80,
            rows: 24,
          })
        );
      });
    });

    it('should handle initial command execution', async () => {
      const mockSend = vi.fn();
      MockWebSocket.prototype.send = mockSend;

      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus}
          initialCommand="npm test"
        />
      );

      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'input',
            data: 'npm test\r',
            timestamp: expect.any(Number),
          })
        );
      });
    });

    it('should handle WebSocket errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      // Simulate WebSocket error
      await waitFor(() => {
        const ws = MockWebSocket.prototype.constructor as any;
        const instance = ws.mock.instances[0];
        if (instance && instance.onerror) {
          instance.onerror(new Event('error'));
        }
      });

      expect(screen.getByText(/🔴 Disconnected/)).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Terminal Input Handling', () => {
    let onDataCallback: (data: string) => void;

    beforeEach(() => {
      mockTerminalInstance.onData.mockImplementation((callback) => {
        onDataCallback = callback;
        return { dispose: vi.fn() };
      });
    });

    it('should set up input handler on terminal', async () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(mockTerminalInstance.onData).toHaveBeenCalled();
      });
    });

    it('should send input data via WebSocket when connected', async () => {
      const mockSend = vi.fn();
      MockWebSocket.prototype.send = mockSend;

      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(onDataCallback).toBeDefined();
      });

      // Simulate user input
      act(() => {
        onDataCallback('ls\r');
      });

      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'input',
          data: 'ls\r',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should handle carriage returns correctly for Claude CLI', async () => {
      const mockSend = vi.fn();
      MockWebSocket.prototype.send = mockSend;

      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(onDataCallback).toBeDefined();
      });

      // Simulate spinner control sequence (carriage return without newline)
      act(() => {
        onDataCallback('\r');
      });

      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'input',
          data: '\r', // Should preserve standalone \r
          timestamp: expect.any(Number),
        })
      );
    });

    it('should normalize CRLF to LF', async () => {
      const mockSend = vi.fn();
      MockWebSocket.prototype.send = mockSend;

      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(onDataCallback).toBeDefined();
      });

      // Simulate Windows line ending
      act(() => {
        onDataCallback('command\r\n');
      });

      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'input',
          data: 'command\n', // Should normalize \r\n to \n
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('WebSocket Message Handling', () => {
    it('should handle data messages', async () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        const instances = (MockWebSocket as any).mock.instances;
        const instance = instances[0];
        if (instance && instance.onmessage) {
          instance.onmessage({
            data: JSON.stringify({
              type: 'data',
              data: 'Hello from terminal!\r\n',
            }),
          });
        }
      });

      expect(mockTerminalInstance.write).toHaveBeenCalledWith('Hello from terminal!\r\n');
    });

    it('should handle error messages', async () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        const instances = (MockWebSocket as any).mock.instances;
        const instance = instances[0];
        if (instance && instance.onmessage) {
          instance.onmessage({
            data: JSON.stringify({
              type: 'error',
              message: 'Connection failed',
            }),
          });
        }
      });

      expect(mockTerminalInstance.writeln).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error: Connection failed')
      );
    });

    it('should handle init acknowledgment', async () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        const instances = (MockWebSocket as any).mock.instances;
        const instance = instances[0];
        if (instance && instance.onmessage) {
          instance.onmessage({
            data: JSON.stringify({
              type: 'init_ack',
              pid: 12345,
            }),
          });
        }
      });

      expect(mockTerminalInstance.writeln).toHaveBeenCalledWith(
        expect.stringContaining('Connected to process 12345')
      );
    });

    it('should handle malformed JSON gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        const instances = (MockWebSocket as any).mock.instances;
        const instance = instances[0];
        if (instance && instance.onmessage) {
          instance.onmessage({
            data: 'invalid json',
          });
        }
      });

      // Should fallback to writing raw data
      expect(mockTerminalInstance.write).toHaveBeenCalledWith('invalid json');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle window resize', async () => {
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      // Simulate window resize
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        expect(mockFitAddon.fit).toHaveBeenCalledTimes(2); // Initial + resize
      });
    });

    it('should send resize message to server', async () => {
      const mockSend = vi.fn();
      MockWebSocket.prototype.send = mockSend;

      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      // Wait for initial connection
      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith(
          expect.stringContaining('init')
        );
      });

      mockSend.mockClear();

      // Simulate window resize
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'resize',
            cols: 80,
            rows: 24,
            viewport: expect.objectContaining({
              width: expect.any(Number),
              height: expect.any(Number),
              cascadePrevention: true,
            }),
          })
        );
      });
    });

    it('should update cascade prevention status on resize', async () => {
      const { validateClaudeCliSupport } = require('@/utils/terminalViewport');
      
      // Mock validation to return different results
      validateClaudeCliSupport
        .mockReturnValueOnce({ canHandle: true, cascadeRisk: 'low' })
        .mockReturnValueOnce({ canHandle: false, cascadeRisk: 'high' });

      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      // Initial state should show safe
      await waitFor(() => {
        expect(screen.getByText('✅')).toBeInTheDocument();
      });

      // Simulate resize that causes cascade risk
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        expect(mockTerminalInstance.writeln).toHaveBeenCalledWith(
          expect.stringContaining('cascade risk: high')
        );
      });
    });
  });

  describe('Cleanup', () => {
    it('should dispose terminal on unmount', () => {
      const { unmount } = render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      unmount();

      expect(mockTerminalInstance.dispose).toHaveBeenCalled();
    });

    it('should close WebSocket on unmount', async () => {
      const mockClose = vi.fn();
      MockWebSocket.prototype.close = mockClose;

      const { unmount } = render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(MockWebSocket).toHaveBeenCalled();
      });

      unmount();

      expect(mockClose).toHaveBeenCalled();
    });

    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Process Status Changes', () => {
    it('should connect WebSocket when process starts running', async () => {
      const { rerender } = render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={{ isRunning: false, status: 'stopped' }} 
        />
      );

      // Initially no WebSocket
      expect(MockWebSocket).not.toHaveBeenCalled();

      // Process starts running
      rerender(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      await waitFor(() => {
        expect(MockWebSocket).toHaveBeenCalled();
      });
    });

    it('should disconnect WebSocket when process stops', async () => {
      const mockClose = vi.fn();
      MockWebSocket.prototype.close = mockClose;

      const { rerender } = render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      // Wait for connection
      await waitFor(() => {
        expect(MockWebSocket).toHaveBeenCalled();
      });

      // Process stops
      rerender(
        <TerminalComponent 
          isVisible={true} 
          processStatus={{ isRunning: false, status: 'stopped' }} 
        />
      );

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    it('should attempt to reconnect after disconnection', async () => {
      vi.useFakeTimers();

      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      // Wait for initial connection
      await waitFor(() => {
        expect(MockWebSocket).toHaveBeenCalledTimes(1);
      });

      // Simulate disconnection
      act(() => {
        const instances = (MockWebSocket as any).mock.instances;
        const instance = instances[0];
        if (instance && instance.onclose) {
          instance.onclose(new CloseEvent('close', { code: 1006, reason: 'Connection lost' }));
        }
      });

      // Advance time to trigger reconnection
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(MockWebSocket).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });

    it('should not attempt to reconnect if process is not running', async () => {
      vi.useFakeTimers();

      const { rerender } = render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={mockProcessStatus} 
        />
      );

      // Stop the process
      rerender(
        <TerminalComponent 
          isVisible={true} 
          processStatus={{ isRunning: false, status: 'stopped' }} 
        />
      );

      // Simulate disconnection
      act(() => {
        const instances = (MockWebSocket as any).mock.instances;
        const instance = instances[0];
        if (instance && instance.onclose) {
          instance.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));
        }
      });

      // Advance time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should not attempt reconnection
      expect(MockWebSocket).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });
});