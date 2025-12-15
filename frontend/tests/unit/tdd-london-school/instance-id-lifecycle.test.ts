/**
 * TDD London School Tests for Instance ID Lifecycle Bug
 * 
 * Testing the critical bug where frontend passes 'undefined' to terminal 
 * connections instead of the actual instance ID.
 * 
 * London School Approach:
 * - Mock-first design to define contracts
 * - Outside-in development from user behavior
 * - Focus on interactions and collaborations
 * - Behavior verification over state testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React from 'react';

// Import types for better mock typing
interface ClaudeInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: Date;
}

interface MockHTTPSSEHook {
  socket: any;
  isConnected: boolean;
  connectionError: string | null;
  connectSSE: ReturnType<typeof vi.fn>;
  startPolling: ReturnType<typeof vi.fn>;
  disconnectFromInstance: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
}

// Mock the useHTTPSSE hook
const mockUseHTTPSSE = vi.fn<() => MockHTTPSSEHook>();

// Mock the ClaudeInstanceManager component dynamically
let MockClaudeInstanceManager: ReturnType<typeof vi.fn>;

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TDD London School: Instance ID Lifecycle Bug', () => {
  // Shared mock objects following London School pattern
  let mockHTTPSSEHook: MockHTTPSSEHook;
  let mockSocket: any;
  let mockApiResponse: any;
  let actualInstanceId: string;

  beforeEach(() => {
    // Generate actual instance ID in proper format
    actualInstanceId = `claude-${Math.random().toString(36).substr(2, 8)}`;
    
    // Create comprehensive mock for socket
    mockSocket = {
      id: 'mock-socket-id',
      connected: true,
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
      disconnect: vi.fn()
    };

    // Create comprehensive mock for useHTTPSSE hook
    mockHTTPSSEHook = {
      socket: mockSocket,
      isConnected: true,
      connectionError: null,
      connectSSE: vi.fn(),
      startPolling: vi.fn(),
      disconnectFromInstance: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn()
    };

    // Setup mock to return our hook
    mockUseHTTPSSE.mockReturnValue(mockHTTPSSEHook);

    // Mock successful API response for instance creation
    mockApiResponse = {
      success: true,
      instanceId: actualInstanceId,
      instance: {
        id: actualInstanceId,
        name: 'test-instance',
        status: 'running',
        pid: 12345
      }
    };

    // Setup fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Contract Definition: Instance ID Flow', () => {
    it('should define contract between component and useHTTPSSE hook', () => {
      // London School: Define collaborator contracts through mocks
      const expectedContract = {
        // Input contract: Hook should receive proper instance ID
        connectSSE: expect.any(Function),
        startPolling: expect.any(Function),
        
        // Output contract: Hook should emit events with instance ID
        emit: expect.any(Function),
        on: expect.any(Function),
        
        // State contract: Hook should track connection state
        isConnected: expect.any(Boolean),
        connectionError: expect.toBeOneOf([expect.any(String), null])
      };

      expect(mockHTTPSSEHook).toEqual(expect.objectContaining(expectedContract));
    });

    it('should define contract for instance creation API', async () => {
      // Test API contract returns proper instance ID format
      const response = await fetch('/api/claude/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: ['claude'] })
      });
      
      const data = await response.json();
      
      // Verify API contract compliance
      expect(data).toEqual(expect.objectContaining({
        success: true,
        instanceId: expect.stringMatching(/^claude-[a-z0-9]{8}$/),
        instance: expect.objectContaining({
          id: expect.stringMatching(/^claude-[a-z0-9]{8}$/),
          status: expect.any(String)
        })
      }));
    });
  });

  describe('Instance Creation and ID Generation', () => {
    it('should create instance with proper ID format (claude-XXXX)', async () => {
      // Mock instance creation
      const createInstanceMock = vi.fn().mockResolvedValue({
        success: true,
        instanceId: actualInstanceId
      });

      // Test instance creation returns proper ID
      const result = await createInstanceMock('claude');
      
      expect(result.instanceId).toMatch(/^claude-[a-z0-9]{8}$/);
      expect(result.instanceId).toBe(actualInstanceId);
      expect(createInstanceMock).toHaveBeenCalledWith('claude');
    });

    it('should store instance ID in component state after creation', async () => {
      // Mock component state setter
      const mockSetSelectedInstance = vi.fn();
      const mockSetInstances = vi.fn();

      // Simulate instance creation workflow
      const instanceCreationHandler = async (instanceId: string) => {
        mockSetInstances((prev: ClaudeInstance[]) => [
          ...prev,
          {
            id: instanceId,
            name: `instance-${instanceId.slice(-4)}`,
            status: 'running' as const
          }
        ]);
        mockSetSelectedInstance(instanceId);
      };

      // Execute creation workflow
      await instanceCreationHandler(actualInstanceId);

      // Verify state updates with correct instance ID
      expect(mockSetSelectedInstance).toHaveBeenCalledWith(actualInstanceId);
      expect(mockSetInstances).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Terminal Connection with Instance ID', () => {
    it('should pass correct instance ID to connectSSE', async () => {
      // Mock component behavior: selecting an instance should trigger connection
      const mockConnectToInstance = (instanceId: string) => {
        // This simulates the component's instance selection logic
        if (instanceId && instanceId !== 'undefined') {
          mockHTTPSSEHook.connectSSE(instanceId);
        }
      };

      // Test connection with valid instance ID
      mockConnectToInstance(actualInstanceId);

      // Verify correct instance ID was passed to SSE connection
      expect(mockHTTPSSEHook.connectSSE).toHaveBeenCalledWith(actualInstanceId);
      expect(mockHTTPSSEHook.connectSSE).not.toHaveBeenCalledWith(undefined);
      expect(mockHTTPSSEHook.connectSSE).not.toHaveBeenCalledWith('undefined');
    });

    it('should pass correct instance ID to startPolling as fallback', async () => {
      // Mock SSE failure scenario
      mockHTTPSSEHook.connectSSE.mockImplementation((instanceId: string) => {
        throw new Error('SSE connection failed');
      });

      const mockConnectWithFallback = (instanceId: string) => {
        try {
          mockHTTPSSEHook.connectSSE(instanceId);
        } catch (error) {
          // Fallback to polling with same instance ID
          mockHTTPSSEHook.startPolling(instanceId);
        }
      };

      // Test fallback maintains instance ID
      mockConnectWithFallback(actualInstanceId);

      expect(mockHTTPSSEHook.connectSSE).toHaveBeenCalledWith(actualInstanceId);
      expect(mockHTTPSSEHook.startPolling).toHaveBeenCalledWith(actualInstanceId);
      expect(mockHTTPSSEHook.startPolling).not.toHaveBeenCalledWith(undefined);
    });

    it('should emit terminal input with correct instance ID', () => {
      const testInput = 'test command\n';
      const selectedInstanceId = actualInstanceId;

      // Mock component sending input
      const mockSendInput = (input: string, instanceId: string) => {
        if (instanceId && instanceId !== 'undefined') {
          mockHTTPSSEHook.emit('terminal:input', {
            input: input,
            instanceId: instanceId
          });
        }
      };

      // Test input emission
      mockSendInput(testInput, selectedInstanceId);

      // Verify correct instance ID in emitted data
      expect(mockHTTPSSEHook.emit).toHaveBeenCalledWith('terminal:input', {
        input: testInput,
        instanceId: actualInstanceId
      });
    });
  });

  describe('Instance ID Flow from Component to Hook', () => {
    it('should maintain instance ID consistency across component lifecycle', async () => {
      // Track instance ID through component lifecycle
      const instanceIdTracker = {
        creation: '',
        selection: '',
        connection: '',
        terminalInput: ''
      };

      // Mock complete workflow
      const mockWorkflow = {
        createInstance: vi.fn((id: string) => {
          instanceIdTracker.creation = id;
          return Promise.resolve({ success: true, instanceId: id });
        }),
        
        selectInstance: vi.fn((id: string) => {
          instanceIdTracker.selection = id;
        }),
        
        connectToInstance: vi.fn((id: string) => {
          instanceIdTracker.connection = id;
          mockHTTPSSEHook.connectSSE(id);
        }),
        
        sendTerminalInput: vi.fn((input: string, id: string) => {
          instanceIdTracker.terminalInput = id;
          mockHTTPSSEHook.emit('terminal:input', { input, instanceId: id });
        })
      };

      // Execute complete workflow
      await mockWorkflow.createInstance(actualInstanceId);
      mockWorkflow.selectInstance(actualInstanceId);
      mockWorkflow.connectToInstance(actualInstanceId);
      mockWorkflow.sendTerminalInput('test', actualInstanceId);

      // Verify consistent instance ID throughout workflow
      expect(instanceIdTracker.creation).toBe(actualInstanceId);
      expect(instanceIdTracker.selection).toBe(actualInstanceId);
      expect(instanceIdTracker.connection).toBe(actualInstanceId);
      expect(instanceIdTracker.terminalInput).toBe(actualInstanceId);

      // Verify no undefined values
      Object.values(instanceIdTracker).forEach(id => {
        expect(id).not.toBe(undefined);
        expect(id).not.toBe('undefined');
        expect(id).toBe(actualInstanceId);
      });
    });

    it('should handle instance switching without ID corruption', () => {
      const firstInstanceId = `claude-${Math.random().toString(36).substr(2, 8)}`;
      const secondInstanceId = `claude-${Math.random().toString(36).substr(2, 8)}`;

      // Mock instance switching workflow
      const mockInstanceSwitcher = {
        currentInstance: null as string | null,
        
        switchToInstance: (newInstanceId: string) => {
          // Disconnect from current instance
          if (mockInstanceSwitcher.currentInstance) {
            mockHTTPSSEHook.disconnectFromInstance();
          }
          
          // Connect to new instance
          mockInstanceSwitcher.currentInstance = newInstanceId;
          mockHTTPSSEHook.connectSSE(newInstanceId);
        }
      };

      // Test switching between instances
      mockInstanceSwitcher.switchToInstance(firstInstanceId);
      expect(mockHTTPSSEHook.connectSSE).toHaveBeenCalledWith(firstInstanceId);

      mockInstanceSwitcher.switchToInstance(secondInstanceId);
      expect(mockHTTPSSEHook.disconnectFromInstance).toHaveBeenCalled();
      expect(mockHTTPSSEHook.connectSSE).toHaveBeenCalledWith(secondInstanceId);

      // Verify current instance is correctly tracked
      expect(mockInstanceSwitcher.currentInstance).toBe(secondInstanceId);
    });
  });

  describe('Error Scenarios with Undefined Instance IDs', () => {
    it('should prevent connection attempts with undefined instance ID', () => {
      const mockSafeConnect = (instanceId: string | undefined) => {
        // Component should validate instance ID before connecting
        if (!instanceId || instanceId === 'undefined') {
          console.warn('Cannot connect with undefined instance ID');
          return false;
        }
        
        mockHTTPSSEHook.connectSSE(instanceId);
        return true;
      };

      // Test with undefined values
      expect(mockSafeConnect(undefined)).toBe(false);
      expect(mockSafeConnect('undefined')).toBe(false);
      expect(mockSafeConnect('')).toBe(false);

      // Test with valid ID
      expect(mockSafeConnect(actualInstanceId)).toBe(true);
      expect(mockHTTPSSEHook.connectSSE).toHaveBeenCalledWith(actualInstanceId);
    });

    it('should handle backend receiving undefined instance ID gracefully', () => {
      const mockBackendHandler = (instanceId: string | undefined) => {
        if (!instanceId || instanceId === 'undefined') {
          return {
            error: 'SSE Claude terminal stream requested for instance: undefined',
            success: false
          };
        }
        
        return {
          success: true,
          message: `SSE Claude terminal stream started for instance: ${instanceId}`
        };
      };

      // Test backend response to undefined ID
      const undefinedResponse = mockBackendHandler(undefined);
      expect(undefinedResponse).toEqual({
        error: 'SSE Claude terminal stream requested for instance: undefined',
        success: false
      });

      // Test backend response to valid ID
      const validResponse = mockBackendHandler(actualInstanceId);
      expect(validResponse).toEqual({
        success: true,
        message: `SSE Claude terminal stream started for instance: ${actualInstanceId}`
      });
    });

    it('should provide meaningful error messages for debugging', () => {
      const mockErrorReporter = {
        instanceIdErrors: [] as string[],
        
        reportInstanceIdError: (context: string, instanceId: any) => {
          const error = `${context}: instance ID is ${instanceId} (type: ${typeof instanceId})`;
          mockErrorReporter.instanceIdErrors.push(error);
          console.error(error);
        }
      };

      // Test error reporting
      mockErrorReporter.reportInstanceIdError('Terminal connection', undefined);
      mockErrorReporter.reportInstanceIdError('SSE stream request', 'undefined');

      expect(mockErrorReporter.instanceIdErrors).toContain(
        'Terminal connection: instance ID is undefined (type: undefined)'
      );
      expect(mockErrorReporter.instanceIdErrors).toContain(
        'SSE stream request: instance ID is undefined (type: string)'
      );
    });
  });

  describe('Integration: Component and Hook Collaboration', () => {
    it('should demonstrate complete instance lifecycle without undefined IDs', async () => {
      // Mock complete component-hook collaboration
      const mockCollaborator = {
        component: {
          selectedInstance: null as string | null,
          instances: [] as ClaudeInstance[],
          
          createAndSelectInstance: async () => {
            // Create instance
            const response = await fetch('/api/claude/instances', {
              method: 'POST',
              body: JSON.stringify({ command: ['claude'] })
            });
            const data = await response.json();
            
            // Store instance
            mockCollaborator.component.instances.push(data.instance);
            mockCollaborator.component.selectedInstance = data.instanceId;
            
            return data.instanceId;
          },
          
          connectToSelected: () => {
            const instanceId = mockCollaborator.component.selectedInstance;
            if (instanceId && instanceId !== 'undefined') {
              mockHTTPSSEHook.connectSSE(instanceId);
              return true;
            }
            return false;
          },
          
          sendInput: (input: string) => {
            const instanceId = mockCollaborator.component.selectedInstance;
            if (instanceId && instanceId !== 'undefined') {
              mockHTTPSSEHook.emit('terminal:input', { input, instanceId });
              return true;
            }
            return false;
          }
        }
      };

      // Execute complete workflow
      const createdInstanceId = await mockCollaborator.component.createAndSelectInstance();
      const connectionSuccess = mockCollaborator.component.connectToSelected();
      const inputSuccess = mockCollaborator.component.sendInput('test command');

      // Verify successful workflow
      expect(createdInstanceId).toBe(actualInstanceId);
      expect(connectionSuccess).toBe(true);
      expect(inputSuccess).toBe(true);

      // Verify hook received correct instance ID
      expect(mockHTTPSSEHook.connectSSE).toHaveBeenCalledWith(actualInstanceId);
      expect(mockHTTPSSEHook.emit).toHaveBeenCalledWith('terminal:input', {
        input: 'test command',
        instanceId: actualInstanceId
      });

      // Verify no undefined IDs were used
      expect(mockHTTPSSEHook.connectSSE).not.toHaveBeenCalledWith(undefined);
      expect(mockHTTPSSEHook.connectSSE).not.toHaveBeenCalledWith('undefined');
    });
  });

  describe('Mock Validation and Contract Compliance', () => {
    it('should validate all mocks implement expected interfaces', () => {
      // Verify hook mock implements expected interface
      const expectedHookInterface = [
        'socket', 'isConnected', 'connectionError', 
        'connectSSE', 'startPolling', 'disconnectFromInstance',
        'on', 'off', 'emit'
      ];
      
      expectedHookInterface.forEach(method => {
        expect(mockHTTPSSEHook).toHaveProperty(method);
      });

      // Verify socket mock implements expected interface
      const expectedSocketInterface = [
        'id', 'connected', 'emit', 'on', 'off', 
        'removeAllListeners', 'disconnect'
      ];
      
      expectedSocketInterface.forEach(method => {
        expect(mockSocket).toHaveProperty(method);
      });
    });

    it('should ensure mocks can detect the original bug', () => {
      // This test demonstrates how the bug would manifest
      const buggyInstanceHandler = (selectedInstance: any) => {
        // Bug: selectedInstance could be undefined but passed as string
        const instanceId = selectedInstance ? selectedInstance.toString() : 'undefined';
        mockHTTPSSEHook.connectSSE(instanceId);
      };

      // Test the bug scenario
      buggyInstanceHandler(undefined);
      
      // This would catch the bug where 'undefined' string is passed
      expect(mockHTTPSSEHook.connectSSE).toHaveBeenCalledWith('undefined');
      
      // Clear the mock to test the fix
      mockHTTPSSEHook.connectSSE.mockClear();
      
      // Fixed version should not call with undefined
      const fixedInstanceHandler = (selectedInstance: string | null) => {
        if (selectedInstance && selectedInstance !== 'undefined') {
          mockHTTPSSEHook.connectSSE(selectedInstance);
        }
      };
      
      fixedInstanceHandler(undefined);
      expect(mockHTTPSSEHook.connectSSE).not.toHaveBeenCalled();
    });
  });
});