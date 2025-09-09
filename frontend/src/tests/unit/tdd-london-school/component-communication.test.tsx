/**
 * TDD London School: Component Communication & State Management Test Suite
 * 
 * Testing Focus: Fix broken instance creation → terminal connection flow
 * London School Methodology: Mock-first, behavior-driven testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import ClaudeInstanceManager from '../../src/components/ClaudeInstanceManager';
import { useHTTPSSE } from '../../src/hooks/useHTTPSSE';

// === LONDON SCHOOL MOCK CONTRACTS ===

// Mock the useHTTPSSE hook completely
jest.mock('../../src/hooks/useHTTPSSE', () => ({
  useHTTPSSE: jest.fn(),
}));

// Mock the nld capture system
jest.mock('../../src/utils/nld-ui-capture', () => ({
  nldCapture: {
    captureCommunicationBreakdown: jest.fn(),
    captureInstanceCreationFailure: jest.fn(),
  },
}));

// Mock CSS imports
jest.mock('../../src/components/ClaudeInstanceManager.css', () => ({}));

const mockUseHTTPSSE = useHTTPSSE as jest.MockedFunction<typeof useHTTPSSE>;

describe('TDD London School: Component Communication Tests', () => {
  let mockSocket: any;
  let mockConnectSSE: jest.Mock;
  let mockStartPolling: jest.Mock;
  let mockOn: jest.Mock;
  let mockOff: jest.Mock;
  let mockEmit: jest.Mock;

  beforeEach(() => {
    // === BEHAVIOR-DRIVEN MOCK SETUP ===
    
    mockConnectSSE = jest.fn().mockResolvedValue(undefined);
    mockStartPolling = jest.fn().mockResolvedValue(undefined);
    mockOn = jest.fn();
    mockOff = jest.fn();
    mockEmit = jest.fn();

    mockSocket = {
      id: 'mock-socket-123',
      connected: true,
      emit: mockEmit,
      on: mockOn,
      off: mockOff,
    };

    // Mock useHTTPSSE with complete contract definition
    mockUseHTTPSSE.mockReturnValue({
      socket: mockSocket,
      isConnected: true,
      connectionError: null,
      connectSSE: mockConnectSSE,
      startPolling: mockStartPolling,
      on: mockOn,
      off: mockOff,
      emit: mockEmit,
    });

    // Mock fetch globally for API calls
    global.fetch = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Instance Creation → Terminal Connection Flow', () => {
    beforeEach(() => {
      // Mock successful instance creation API response
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/claude/instances') && url.includes('GET')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              instances: [],
            }),
          });
        }
        
        if (url.includes('/api/claude/instances') && url.includes('POST')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              instanceId: 'claude-NEW-123',
              message: 'Instance created successfully',
            }),
          });
        }
        
        return Promise.reject(new Error('Unexpected API call'));
      });
    });

    test('should trigger terminal connection when instance creation succeeds', async () => {
      // === LONDON SCHOOL: TEST BEHAVIOR THROUGH MOCKS ===
      
      const user = userEvent.setup();
      
      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      // Find and click the creation button
      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      await user.click(createButton);

      // === VERIFY BEHAVIOR CONTRACTS ===
      
      await waitFor(() => {
        // 1. API call should be made for instance creation
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/claude/instances',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"command":["claude"]'),
          })
        );
      });

      await waitFor(() => {
        // 2. connectSSE should be called with new instance ID
        expect(mockConnectSSE).toHaveBeenCalledWith('claude-NEW-123');
      });

      // === CRITICAL: TEST THE BROKEN FLOW ===
      // This should pass once the communication is fixed
      expect(mockConnectSSE).toHaveBeenCalledTimes(1);
    });

    test('should update selectedInstance state after successful creation', async () => {
      const user = userEvent.setup();
      
      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      await user.click(createButton);

      await waitFor(() => {
        // Should fetch instances after creation
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/claude/instances',
          expect.objectContaining({ method: 'GET' })
        );
      });

      // === TEST STATE SYNCHRONIZATION ===
      // The component should update its internal state
      expect(mockConnectSSE).toHaveBeenCalledWith('claude-NEW-123');
    });

    test('should handle SSE connection failure with polling fallback', async () => {
      // === MOCK ERROR BEHAVIOR ===
      mockConnectSSE.mockRejectedValueOnce(new Error('SSE connection failed'));

      const user = userEvent.setup();
      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      await user.click(createButton);

      await waitFor(() => {
        expect(mockConnectSSE).toHaveBeenCalledWith('claude-NEW-123');
      });

      await waitFor(() => {
        // Should fallback to polling when SSE fails
        expect(mockStartPolling).toHaveBeenCalledWith('claude-NEW-123');
      });
    });
  });

  describe('Component Event Handler Contracts', () => {
    test('should setup terminal output event handlers', async () => {
      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      // === VERIFY EVENT HANDLER REGISTRATION ===
      expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('terminal:output', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should process terminal output messages correctly', async () => {
      const user = userEvent.setup();
      
      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      // Extract the terminal:output handler
      const terminalOutputHandler = mockOn.mock.calls.find(
        call => call[0] === 'terminal:output'
      )?.[1];

      expect(terminalOutputHandler).toBeDefined();

      // === TEST HANDLER BEHAVIOR ===
      const mockOutputData = {
        output: 'Claude initialized successfully\n',
        instanceId: 'claude-123',
      };

      act(() => {
        terminalOutputHandler(mockOutputData);
      });

      // The component should process the output (internal state update)
      // This tests the mock behavior contract
      expect(terminalOutputHandler).toHaveBeenLastCalledWith(mockOutputData);
    });

    test('should cleanup event handlers on unmount', () => {
      const { unmount } = render(
        <ClaudeInstanceManager apiUrl="http://localhost:3000" />
      );

      // Clear previous calls
      mockOff.mockClear();

      unmount();

      // === VERIFY CLEANUP CONTRACTS ===
      expect(mockOff).toHaveBeenCalledWith('connect');
      expect(mockOff).toHaveBeenCalledWith('terminal:output');
      expect(mockOff).toHaveBeenCalledWith('error');
    });
  });

  describe('Component Communication Failures', () => {
    test('should handle API creation failure gracefully', async () => {
      // === MOCK FAILURE BEHAVIOR ===
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('GET')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, instances: [] }),
          });
        }
        
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({
            success: false,
            error: 'Instance creation failed',
          }),
        });
      });

      const user = userEvent.setup();
      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      await user.click(createButton);

      await waitFor(() => {
        // Should NOT call connectSSE when creation fails
        expect(mockConnectSSE).not.toHaveBeenCalled();
      });

      // Should display error state
      expect(screen.getByText('Instance creation failed')).toBeInTheDocument();
    });

    test('should handle network errors during creation', async () => {
      // === MOCK NETWORK ERROR ===
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network connection failed')
      );

      const user = userEvent.setup();
      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create instance')).toBeInTheDocument();
      });

      // Should NOT attempt terminal connection on network error
      expect(mockConnectSSE).not.toHaveBeenCalled();
    });
  });

  describe('State Synchronization Timing', () => {
    test('should ensure proper async state update sequence', async () => {
      const user = userEvent.setup();
      
      // Mock fetch with delayed response to test timing
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              instanceId: 'claude-DELAYED-123',
            }),
          }), 100)
        )
      );

      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      // Should show loading state
      await user.click(createButton);
      
      // Button should be disabled during creation
      expect(createButton).toBeDisabled();

      await waitFor(() => {
        expect(mockConnectSSE).toHaveBeenCalledWith('claude-DELAYED-123');
      }, { timeout: 2000 });

      // Button should be enabled after completion
      expect(createButton).not.toBeDisabled();
    });

    test('should prevent stale closure issues with instance IDs', async () => {
      const user = userEvent.setup();
      
      // Mock multiple rapid instance creations
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            instanceId: `claude-RAPID-${callCount}`,
          }),
        });
      });

      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      // Rapid-fire clicks (testing race conditions)
      await user.click(createButton);
      await user.click(createButton);

      await waitFor(() => {
        // Should only connect to the last created instance
        expect(mockConnectSSE).toHaveBeenLastCalledWith('claude-RAPID-2');
      });
    });
  });
});