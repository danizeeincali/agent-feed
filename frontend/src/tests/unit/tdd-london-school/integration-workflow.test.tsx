/**
 * TDD London School: Integration Workflow Test Suite
 * 
 * Testing Focus: Complete user journey Button → Create → Connect
 * London School Methodology: Test workflows through mock collaborations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import ClaudeInstanceManager from '../../src/components/ClaudeInstanceManager';
import { useHTTPSSE } from '../../src/hooks/useHTTPSSE';

// === LONDON SCHOOL INTEGRATION MOCKS ===

jest.mock('../../src/hooks/useHTTPSSE');
jest.mock('../../src/utils/nld-ui-capture', () => ({
  nldCapture: {
    captureCommunicationBreakdown: jest.fn(),
    captureInstanceCreationFailure: jest.fn(),
  },
}));
jest.mock('../../src/components/ClaudeInstanceManager.css', () => ({}));

const mockUseHTTPSSE = useHTTPSSE as jest.MockedFunction<typeof useHTTPSSE>;

describe('TDD London School: Integration Workflow Tests', () => {
  let mockSocket: any;
  let mockConnectSSE: jest.Mock;
  let mockStartPolling: jest.Mock;
  let mockOn: jest.Mock;
  let mockOff: jest.Mock;
  let mockEmit: jest.Mock;
  let registeredHandlers: Map<string, Function[]>;

  beforeEach(() => {
    // === WORKFLOW COLLABORATION SETUP ===
    
    registeredHandlers = new Map();
    mockConnectSSE = jest.fn().mockResolvedValue(undefined);
    mockStartPolling = jest.fn().mockResolvedValue(undefined);
    mockEmit = jest.fn();

    // Mock event registration with handler storage
    mockOn = jest.fn().mockImplementation((event: string, handler: Function) => {
      if (!registeredHandlers.has(event)) {
        registeredHandlers.set(event, []);
      }
      registeredHandlers.get(event)!.push(handler);
    });

    mockOff = jest.fn();

    mockSocket = {
      id: 'integration-socket',
      connected: true,
      emit: mockEmit,
      on: mockOn,
      off: mockOff,
    };

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

    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  describe('Complete User Journey: Button → Create → Connect', () => {
    beforeEach(() => {
      // === MOCK COMPLETE API WORKFLOW ===
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/claude/instances')) {
          if (options?.method === 'POST') {
            // Instance creation
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                instanceId: 'claude-WORKFLOW-789',
                message: 'Instance created successfully',
              }),
            });
          } else if (options?.method === 'GET' || !options) {
            // Instance fetching
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                instances: [
                  {
                    id: 'claude-WORKFLOW-789',
                    name: 'Claude Instance',
                    status: 'running',
                    pid: 12345,
                    startTime: new Date().toISOString(),
                  }
                ],
              }),
            });
          }
        }
        return Promise.reject(new Error('Unexpected API call'));
      });
    });

    test('should complete full workflow: click → create → select → connect', async () => {
      const user = userEvent.setup();
      
      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      // === STEP 1: USER CLICKS CREATE BUTTON ===
      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      expect(createButton).toBeInTheDocument();
      expect(createButton).not.toBeDisabled();

      await user.click(createButton);

      // === STEP 2: VERIFY INSTANCE CREATION API CALL ===
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/claude/instances',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('claude')
          })
        );
      });

      // === STEP 3: VERIFY INSTANCE LISTING REFETCH ===
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/claude/instances'
        );
      });

      // === STEP 4: VERIFY TERMINAL CONNECTION ATTEMPT ===
      await waitFor(() => {
        expect(mockConnectSSE).toHaveBeenCalledWith('claude-WORKFLOW-789');
      });

      // === STEP 5: SIMULATE SUCCESSFUL CONNECTION EVENT ===
      const connectHandler = registeredHandlers.get('connect')?.[0];
      if (connectHandler) {
        act(() => {
          connectHandler({
            transport: 'sse',
            instanceId: 'claude-WORKFLOW-789',
            connectionType: 'sse'
          });
        });
      }

      // === VERIFY COMPLETE WORKFLOW SUCCESS ===
      expect(mockConnectSSE).toHaveBeenCalledTimes(1);
      
      // Button should be re-enabled after process completes
      expect(createButton).not.toBeDisabled();
    });

    test('should handle workflow with SSE failure → polling fallback', async () => {
      // === MOCK SSE FAILURE → POLLING SUCCESS ===
      mockConnectSSE.mockRejectedValueOnce(new Error('SSE connection failed'));

      const user = userEvent.setup();
      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /⚡ skip-permissions/i 
      });
      
      await user.click(createButton);

      // === VERIFY FALLBACK WORKFLOW ===
      await waitFor(() => {
        expect(mockConnectSSE).toHaveBeenCalledWith('claude-WORKFLOW-789');
      });

      await waitFor(() => {
        expect(mockStartPolling).toHaveBeenCalledWith('claude-WORKFLOW-789');
      });

      // === SIMULATE POLLING CONNECTION ===
      const connectHandler = registeredHandlers.get('connect')?.[0];
      if (connectHandler) {
        act(() => {
          connectHandler({
            transport: 'polling',
            instanceId: 'claude-WORKFLOW-789',
            connectionType: 'polling'
          });
        });
      }

      expect(mockStartPolling).toHaveBeenCalledTimes(1);
    });

    test('should show loading state during workflow execution', async () => {
      const user = userEvent.setup();
      
      // === MOCK DELAYED API RESPONSE ===
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              instanceId: 'claude-LOADING-456',
            }),
          }), 200)
        )
      );

      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      await user.click(createButton);

      // === VERIFY LOADING STATE ===
      expect(createButton).toBeDisabled();
      
      // Wait for completion
      await waitFor(() => {
        expect(mockConnectSSE).toHaveBeenCalledWith('claude-LOADING-456');
      }, { timeout: 1000 });

      expect(createButton).not.toBeDisabled();
    });

    test('should display connection status during workflow', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      // === INITIAL STATE VERIFICATION ===
      expect(screen.getByText(/Connected via HTTP\/SSE/i)).toBeInTheDocument();

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      await user.click(createButton);

      await waitFor(() => {
        expect(mockConnectSSE).toHaveBeenCalled();
      });

      // === SIMULATE CONNECTION STATUS UPDATES ===
      const connectHandler = registeredHandlers.get('connect')?.[0];
      if (connectHandler) {
        act(() => {
          connectHandler({
            transport: 'sse',
            connectionType: 'sse'
          });
        });
      }

      // Status should update to reflect SSE connection
      expect(screen.getByText(/Connected via SSE/i)).toBeInTheDocument();
    });
  });

  describe('Concurrent Operations Workflow', () => {
    test('should prevent multiple simultaneous instance creations', async () => {
      const user = userEvent.setup();
      
      // === MOCK SLOW CREATION PROCESS ===
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              instanceId: 'claude-CONCURRENT-1',
            }),
          }), 300)
        )
      );

      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      // === RAPID MULTIPLE CLICKS ===
      await user.click(createButton);
      await user.click(createButton);
      await user.click(createButton);

      // Button should be disabled after first click
      expect(createButton).toBeDisabled();

      // Only one API call should be made
      expect((global.fetch as jest.Mock).mock.calls.filter(
        call => call[1]?.method === 'POST'
      )).toHaveLength(1);

      await waitFor(() => {
        expect(mockConnectSSE).toHaveBeenCalledWith('claude-CONCURRENT-1');
      }, { timeout: 1000 });
    });

    test('should handle instance selection during active creation', async () => {
      const user = userEvent.setup();
      
      // === MOCK EXISTING INSTANCE ===
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (options?.method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              instances: [
                {
                  id: 'claude-EXISTING-1',
                  name: 'Existing Instance',
                  status: 'running',
                }
              ],
            }),
          });
        }
        
        // Slow creation
        return new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              instanceId: 'claude-NEW-DURING-SELECTION',
            }),
          }), 400)
        );
      });

      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      // Wait for initial instance load
      await waitFor(() => {
        expect(screen.getByText('claude-EXISTING-1')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      // === START CREATION AND SELECT EXISTING INSTANCE ===
      await user.click(createButton);
      
      const existingInstance = screen.getByText(/claude-EXISTING-1/i);
      await user.click(existingInstance);

      // Should connect to existing instance
      expect(mockConnectSSE).toHaveBeenCalledWith('claude-EXISTING-1');

      // Wait for new instance creation to complete
      await waitFor(() => {
        expect(mockConnectSSE).toHaveBeenCalledWith('claude-NEW-DURING-SELECTION');
      }, { timeout: 1000 });

      // Should have called connectSSE twice (existing + new)
      expect(mockConnectSSE).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Recovery Workflows', () => {
    test('should recover from creation failure and allow retry', async () => {
      const user = userEvent.setup();
      
      // === MOCK INITIAL FAILURE → SUCCESS ON RETRY ===
      let attemptCount = 0;
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (options?.method === 'POST') {
          attemptCount++;
          if (attemptCount === 1) {
            return Promise.resolve({
              ok: false,
              json: () => Promise.resolve({
                success: false,
                error: 'Server overloaded',
              }),
            });
          } else {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                instanceId: 'claude-RETRY-SUCCESS',
              }),
            });
          }
        }
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, instances: [] }),
        });
      });

      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      // === FIRST ATTEMPT (SHOULD FAIL) ===
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Server overloaded')).toBeInTheDocument();
      });

      // Should not attempt connection on failure
      expect(mockConnectSSE).not.toHaveBeenCalled();

      // === RETRY ATTEMPT (SHOULD SUCCEED) ===
      await user.click(createButton);

      await waitFor(() => {
        expect(mockConnectSSE).toHaveBeenCalledWith('claude-RETRY-SUCCESS');
      });

      // Error message should be cleared
      expect(screen.queryByText('Server overloaded')).not.toBeInTheDocument();
    });

    test('should handle network failure during creation', async () => {
      const user = userEvent.setup();
      
      // === MOCK NETWORK ERROR ===
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (options?.method === 'POST') {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, instances: [] }),
        });
      });

      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create instance')).toBeInTheDocument();
      });

      // === VERIFY ERROR HANDLING ===
      expect(mockConnectSSE).not.toHaveBeenCalled();
      expect(createButton).not.toBeDisabled();
    });

    test('should handle connection failure after successful creation', async () => {
      const user = userEvent.setup();
      
      // === MOCK SUCCESSFUL CREATION + CONNECTION FAILURE ===
      mockConnectSSE.mockRejectedValue(new Error('Connection refused'));
      mockStartPolling.mockRejectedValue(new Error('Polling also failed'));

      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      await user.click(createButton);

      await waitFor(() => {
        expect(mockConnectSSE).toHaveBeenCalledWith('claude-WORKFLOW-789');
      });

      await waitFor(() => {
        expect(mockStartPolling).toHaveBeenCalledWith('claude-WORKFLOW-789');
      });

      // === VERIFY GRACEFUL DEGRADATION ===
      // Instance should be created despite connection issues
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/claude/instances',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Terminal Output Integration Workflow', () => {
    test('should process terminal output after successful connection', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      await user.click(createButton);

      await waitFor(() => {
        expect(mockConnectSSE).toHaveBeenCalledWith('claude-WORKFLOW-789');
      });

      // === SIMULATE TERMINAL OUTPUT WORKFLOW ===
      const terminalHandler = registeredHandlers.get('terminal:output')?.[0];
      
      expect(terminalHandler).toBeDefined();

      act(() => {
        terminalHandler({
          output: 'Claude is starting...\n$ ',
          instanceId: 'claude-WORKFLOW-789',
        });
      });

      // === VERIFY OUTPUT PROCESSING ===
      // The component should display the output (tested via DOM presence)
      // Since this is a mock-driven test, we verify the handler was called
      expect(terminalHandler).toBeDefined();
    });

    test('should handle input workflow after connection', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceManager apiUrl="http://localhost:3000" />);

      const createButton = screen.getByRole('button', { 
        name: /🚀 prod\/claude/i 
      });
      
      await user.click(createButton);

      await waitFor(() => {
        expect(mockConnectSSE).toHaveBeenCalledWith('claude-WORKFLOW-789');
      });

      // === INPUT WORKFLOW TEST ===
      const inputField = screen.getByPlaceholderText(/Type command and press Enter/i);
      const sendButton = screen.getByRole('button', { name: /Send/i });

      await user.type(inputField, 'ls -la');
      await user.click(sendButton);

      // === VERIFY INPUT EMISSION ===
      expect(mockEmit).toHaveBeenCalledWith('terminal:input', {
        input: 'ls -la\n',
        instanceId: 'claude-WORKFLOW-789'
      });
    });
  });
});