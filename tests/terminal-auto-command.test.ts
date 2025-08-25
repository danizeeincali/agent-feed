/**
 * TDD Tests for Terminal Auto-Command Feature
 * Tests all three phases of the implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SimpleLauncher } from '../frontend/src/components/SimpleLauncher';
import { TerminalComponent } from '../frontend/src/components/Terminal';
import { TerminalFixed } from '../frontend/src/components/TerminalFixed';

// Mock Socket.IO
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    offAny: vi.fn(),
    connected: true,
    disconnect: vi.fn(),
  })),
}));

describe('Terminal Auto-Command Feature', () => {
  describe('Phase 1: Auto "cd prod"', () => {
    it('should accept initialCommand prop in Terminal component', () => {
      const { container } = render(
        <TerminalComponent 
          isVisible={true}
          processStatus={{ isRunning: true, status: 'running' }}
          initialCommand="cd prod"
        />
      );
      expect(container).toBeTruthy();
    });

    it('should accept initialCommand prop in TerminalFixed component', () => {
      const { container } = render(
        <TerminalFixed 
          isVisible={true}
          processStatus={{ isRunning: true, status: 'running' }}
          initialCommand="cd prod"
        />
      );
      expect(container).toBeTruthy();
    });

    it('should execute initialCommand after WebSocket connection', async () => {
      const mockSocket = {
        on: vi.fn((event, handler) => {
          if (event === 'connect') {
            setTimeout(() => handler(), 10);
          }
        }),
        emit: vi.fn(),
        off: vi.fn(),
        offAny: vi.fn(),
        connected: true,
        disconnect: vi.fn(),
      };

      vi.mocked(io).mockReturnValue(mockSocket as any);

      render(
        <TerminalFixed 
          isVisible={true}
          processStatus={{ isRunning: true, status: 'running' }}
          initialCommand="cd prod"
        />
      );

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('message', 
          expect.objectContaining({
            type: 'input',
            data: 'cd prod\r',
          })
        );
      });
    });

    it('should not execute command if initialCommand is not provided', async () => {
      const mockSocket = {
        on: vi.fn((event, handler) => {
          if (event === 'connect') {
            setTimeout(() => handler(), 10);
          }
        }),
        emit: vi.fn(),
        off: vi.fn(),
        offAny: vi.fn(),
        connected: true,
        disconnect: vi.fn(),
      };

      vi.mocked(io).mockReturnValue(mockSocket as any);

      render(
        <TerminalFixed 
          isVisible={true}
          processStatus={{ isRunning: true, status: 'running' }}
        />
      );

      await waitFor(() => {
        expect(mockSocket.emit).not.toHaveBeenCalledWith('message', 
          expect.objectContaining({
            type: 'input',
            data: 'cd prod\r',
          })
        );
      });
    });
  });

  describe('Phase 2: Auto "cd prod && claude"', () => {
    it('should execute compound command', async () => {
      const mockSocket = {
        on: vi.fn((event, handler) => {
          if (event === 'connect') {
            setTimeout(() => handler(), 10);
          }
        }),
        emit: vi.fn(),
        off: vi.fn(),
        offAny: vi.fn(),
        connected: true,
        disconnect: vi.fn(),
      };

      vi.mocked(io).mockReturnValue(mockSocket as any);

      render(
        <TerminalFixed 
          isVisible={true}
          processStatus={{ isRunning: true, status: 'running' }}
          initialCommand="cd prod && claude"
        />
      );

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('message', 
          expect.objectContaining({
            type: 'input',
            data: 'cd prod && claude\r',
          })
        );
      });
    });
  });

  describe('Phase 3: Four Button Options', () => {
    beforeEach(() => {
      // Mock fetch for API calls
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            claudeAvailable: true,
            status: { isRunning: false, status: 'stopped' }
          }),
        })
      ) as any;
    });

    it('should render four launch buttons instead of one', async () => {
      render(<SimpleLauncher />);
      
      await waitFor(() => {
        expect(screen.getByText(/prod\/claude$/)).toBeInTheDocument();
        expect(screen.getByText(/skip-permissions$/)).toBeInTheDocument();
        expect(screen.getByText(/skip-permissions -c$/)).toBeInTheDocument();
        expect(screen.getByText(/skip-permissions --resume$/)).toBeInTheDocument();
      });
    });

    it('should pass correct initialCommand for first button', async () => {
      const { container } = render(<SimpleLauncher />);
      
      await waitFor(() => {
        const button = screen.getByText(/prod\/claude$/);
        fireEvent.click(button);
      });

      // Check that terminal is rendered with correct initialCommand
      await waitFor(() => {
        const terminalElement = container.querySelector('[data-initial-command="cd prod && claude"]');
        expect(terminalElement).toBeInTheDocument();
      });
    });

    it('should pass correct initialCommand for second button', async () => {
      const { container } = render(<SimpleLauncher />);
      
      await waitFor(() => {
        const button = screen.getByText(/skip-permissions$/);
        fireEvent.click(button);
      });

      await waitFor(() => {
        const terminalElement = container.querySelector('[data-initial-command="cd prod && claude --dangerously-skip-permissions"]');
        expect(terminalElement).toBeInTheDocument();
      });
    });

    it('should pass correct initialCommand for third button', async () => {
      const { container } = render(<SimpleLauncher />);
      
      await waitFor(() => {
        const button = screen.getByText(/skip-permissions -c$/);
        fireEvent.click(button);
      });

      await waitFor(() => {
        const terminalElement = container.querySelector('[data-initial-command="cd prod && claude --dangerously-skip-permissions -c"]');
        expect(terminalElement).toBeInTheDocument();
      });
    });

    it('should pass correct initialCommand for fourth button', async () => {
      const { container } = render(<SimpleLauncher />);
      
      await waitFor(() => {
        const button = screen.getByText(/skip-permissions --resume$/);
        fireEvent.click(button);
      });

      await waitFor(() => {
        const terminalElement = container.querySelector('[data-initial-command="cd prod && claude --dangerously-skip-permissions --resume"]');
        expect(terminalElement).toBeInTheDocument();
      });
    });

    it('should maintain all existing terminal functionality', async () => {
      const mockSocket = {
        on: vi.fn(),
        emit: vi.fn(),
        off: vi.fn(),
        offAny: vi.fn(),
        connected: true,
        disconnect: vi.fn(),
      };

      vi.mocked(io).mockReturnValue(mockSocket as any);

      render(
        <TerminalFixed 
          isVisible={true}
          processStatus={{ isRunning: true, status: 'running' }}
          initialCommand="cd prod"
        />
      );

      // Verify terminal still accepts manual input
      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('output', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      });
    });
  });

  describe('Regression Tests', () => {
    it('should not break existing SimpleLauncher functionality', async () => {
      render(<SimpleLauncher />);
      
      // Check that status display still works
      expect(screen.getByText(/Process Status/)).toBeInTheDocument();
      
      // Check that Claude availability check still works
      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toBeInTheDocument();
      });
    });

    it('should maintain terminal visibility toggle', async () => {
      render(<SimpleLauncher />);
      
      // Terminal should not be visible initially
      expect(screen.queryByText(/Claude Terminal/)).not.toBeInTheDocument();
    });

    it('should preserve WebSocket connection logic', async () => {
      const mockSocket = {
        on: vi.fn(),
        emit: vi.fn(),
        off: vi.fn(),
        offAny: vi.fn(),
        connected: false,
        disconnect: vi.fn(),
      };

      vi.mocked(io).mockReturnValue(mockSocket as any);

      render(
        <TerminalFixed 
          isVisible={true}
          processStatus={{ isRunning: false, status: 'stopped' }}
        />
      );

      // Should not connect when process is not running
      expect(mockSocket.on).not.toHaveBeenCalledWith('connect', expect.any(Function));
    });
  });
});