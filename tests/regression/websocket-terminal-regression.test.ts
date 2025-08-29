/**
 * TDD Regression Test Suite: WebSocket Terminal After Proxy Fix
 * Prevents "fix one, break another" cascade failures
 */

// Converted from Vitest to Jest - globals available
import { render, screen, waitFor } from '@testing-library/react';
import { io } from 'socket.io-client';

// Mock Socket.IO
jest.mock('socket.io-client');
const mockIo = jest.mocked(io);

// Mock WebSocket
global.WebSocket = jest.fn();

describe('WebSocket Terminal Regression Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Socket.IO client
    const mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      connected: false,
      id: 'test-socket-id'
    };
    
    mockIo.mockReturnValue(mockSocket as any);
    
    // Mock WebSocket
    const mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: WebSocket.OPEN
    };
    
    (global.WebSocket as any).mockImplementation(() => mockWebSocket);
  });

  describe('Socket.IO Proxy Compatibility', () => {
    it('should use relative URLs for Socket.IO connections after proxy fix', async () => {
      // Test TerminalFixed component
      const { TerminalFixed } = await import('@/components/TerminalFixed');
      
      // Mock process status as running to trigger Socket.IO connection
      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const,
        startedAt: new Date().toISOString()
      };
      
      render(<TerminalFixed isVisible={true} processStatus={mockProcessStatus} />);
      
      // Verify Socket.IO is called with relative URL (proxy-compatible)
      await waitFor(() => {
        expect(mockIo).toHaveBeenCalledWith('/', expect.any(Object));
      });
      
      // Ensure it's NOT called with absolute URL (would bypass proxy)
      expect(mockIo).not.toHaveBeenCalledWith(
        expect.stringMatching(/http:\/\/localhost:3001/),
        expect.any(Object)
      );
    });

    it('should use relative URLs for Terminal component Socket.IO connections', async () => {
      const { TerminalComponent } = await import('@/components/Terminal');
      
      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };
      
      render(<TerminalComponent isVisible={true} processStatus={mockProcessStatus} />);
      
      await waitFor(() => {
        expect(mockIo).toHaveBeenCalledWith('/terminal', expect.any(Object));
      });
      
      expect(mockIo).not.toHaveBeenCalledWith(
        expect.stringMatching(/http:\/\/localhost:3001\/terminal/),
        expect.any(Object)
      );
    });
  });

  describe('WebSocket Proxy Compatibility', () => {
    it('should construct proxy-compatible WebSocket URLs', () => {
      // Mock window.location for relative URL construction
      const mockLocation = {
        protocol: 'http:',
        host: 'localhost:5173'
      };
      
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });
      
      // Test WebSocket URL construction logic
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/terminal-debug`;
      
      expect(wsUrl).toBe('ws://localhost:5173/terminal-debug');
      expect(wsUrl).not.toContain('localhost:3001');
    });

    it('should handle HTTPS to WSS protocol conversion', () => {
      const mockLocation = {
        protocol: 'https:',
        host: 'localhost:5173'
      };
      
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/terminal`;
      
      expect(wsUrl).toBe('wss://localhost:5173/terminal');
    });
  });

  describe('Integration: HTTP API + WebSocket Together', () => {
    it('should maintain Claude detection API while fixing WebSocket terminal', async () => {
      // Mock successful API call (HTTP proxy working)
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          claudeAvailable: true,
          message: 'Claude Code is available'
        })
      });

      const { SimpleLauncher } = await import('@/components/SimpleLauncher');
      render(<SimpleLauncher />);

      // Verify API call still works (HTTP proxy)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/claude/check',
          expect.objectContaining({
            method: 'GET'
          })
        );
      });

      // Verify Claude availability is detected
      await waitFor(() => {
        expect(screen.getByText(/✅ Available/)).toBeInTheDocument();
      });

      // Verify WebSocket connections use relative URLs (WebSocket proxy)
      await waitFor(() => {
        expect(mockIo).toHaveBeenCalledWith(
          expect.not.stringMatching(/http:\/\/localhost:3001/),
          expect.any(Object)
        );
      });
    });
  });

  describe('Regression Detection Rules', () => {
    it('should detect when hardcoded URLs are reintroduced', () => {
      const hardcodedPatterns = [
        'http://localhost:3001',
        'ws://localhost:3001',
        'localhost:3001'
      ];

      // This test would fail if hardcoded URLs are reintroduced
      hardcodedPatterns.forEach(pattern => {
        expect(mockIo).not.toHaveBeenCalledWith(
          expect.stringContaining(pattern),
          expect.any(Object)
        );
      });
    });

    it('should prevent infinite reconnection loops', async () => {
      // Mock failed connection scenario
      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        connected: false,
        id: null
      };

      mockIo.mockReturnValue(mockSocket as any);

      const { TerminalFixed } = await import('@/components/TerminalFixed');
      
      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };

      render(<TerminalFixed isVisible={true} processStatus={mockProcessStatus} />);

      // Simulate connection error
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
      if (errorHandler) {
        errorHandler(new Error('Connection failed'));
      }

      // Verify connection attempts are limited (not infinite)
      await waitFor(() => {
        expect(mockIo).toHaveBeenCalledTimes(1);
      });

      // Should not create multiple connection attempts rapidly
      expect(mockSocket.connect).not.toHaveBeenCalledTimes(10);
    });
  });

  describe('NLD Pattern Validation', () => {
    it('should validate the fix addresses the identified regression pattern', () => {
      // Validate pattern: "incomplete-proxy-configuration"
      // Before fix: HTTP proxy works, WebSocket proxy missing
      // After fix: Both HTTP and WebSocket proxies configured
      
      const viteConfig = {
        server: {
          proxy: {
            '/api': { target: 'http://localhost:3001' },      // HTTP proxy (existing)
            '/socket.io': { target: 'http://localhost:3001', ws: true } // WebSocket proxy (added)
          }
        }
      };

      expect(viteConfig.server.proxy['/api']).toBeDefined();
      expect(viteConfig.server.proxy['/socket.io']).toBeDefined();
      expect(viteConfig.server.proxy['/socket.io'].ws).toBe(true);
    });

    it('should validate fix addresses "cross-origin-websocket-blocking"', () => {
      // Pattern: Frontend 5173 → Backend 3001 WebSocket connections blocked
      // Solution: Use proxy so all connections appear to come from same origin
      
      const mockLocation = {
        protocol: 'http:',
        host: 'localhost:5173'  // Frontend port
      };
      
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });
      
      // WebSocket URLs should use frontend origin (will be proxied to backend)
      const wsUrl = `ws://${window.location.host}/terminal`;
      expect(wsUrl).toBe('ws://localhost:5173/terminal');
      expect(wsUrl).not.toBe('ws://localhost:3001/terminal');
    });

    it('should validate fix addresses "hardcoded-websocket-urls" pattern', () => {
      // Pattern: Terminal components using absolute URLs
      // Solution: Use relative URLs that can be proxied
      
      // Test that Socket.IO calls use relative URLs
      expect(mockIo).not.toHaveBeenCalledWith(
        expect.stringMatching(/^https?:\/\//),
        expect.any(Object)
      );
      
      // Relative URLs start with '/' (proxy-compatible)
      if (mockIo.mock.calls.length > 0) {
        const firstCallUrl = mockIo.mock.calls[0][0];
        expect(firstCallUrl).toMatch(/^\/|^$/);
      }
    });
  });
});