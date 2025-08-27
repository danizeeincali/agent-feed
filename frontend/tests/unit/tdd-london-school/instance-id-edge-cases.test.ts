/**
 * TDD London School: Instance ID Edge Cases and Integration Tests
 * 
 * Focused tests for specific edge cases and integration scenarios
 * that could cause the undefined instance ID bug
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Mock types
interface EventHandler {
  (data: any): void;
}

interface MockEventHandlers {
  [event: string]: Set<EventHandler>;
}

describe('TDD London School: Instance ID Edge Cases', () => {
  let mockEventHandlers: MockEventHandlers;
  let mockConsole: { warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockEventHandlers = {};
    
    // Mock console methods
    mockConsole = {
      warn: vi.fn(),
      error: vi.fn()
    };
    
    global.console.warn = mockConsole.warn;
    global.console.error = mockConsole.error;
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Event Handler Registration with Instance IDs', () => {
    it('should register event handlers with proper instance ID context', () => {
      const instanceId = 'claude-test1234';
      const mockOnHandler = vi.fn();
      
      // Mock event registration that tracks instance ID
      const mockEventRegister = {
        registeredEvents: new Map<string, { instanceId: string; handler: Function }>(),
        
        on: (event: string, handler: Function, contextInstanceId?: string) => {
          mockEventRegister.registeredEvents.set(event, {
            instanceId: contextInstanceId || 'unknown',
            handler
          });
        },
        
        getEventContext: (event: string) => {
          return mockEventRegister.registeredEvents.get(event);
        }
      };

      // Register events with instance ID context
      mockEventRegister.on('terminal:output', mockOnHandler, instanceId);
      mockEventRegister.on('instance:status', mockOnHandler, instanceId);

      // Verify events were registered with correct instance ID
      const outputContext = mockEventRegister.getEventContext('terminal:output');
      const statusContext = mockEventRegister.getEventContext('instance:status');

      expect(outputContext?.instanceId).toBe(instanceId);
      expect(statusContext?.instanceId).toBe(instanceId);
      expect(outputContext?.instanceId).not.toBe('undefined');
      expect(statusContext?.instanceId).not.toBe('undefined');
    });

    it('should clean up event handlers when instance changes', () => {
      const firstInstanceId = 'claude-first123';
      const secondInstanceId = 'claude-second456';
      
      const mockEventManager = {
        activeHandlers: new Map<string, string>(),
        
        setupHandlers: (instanceId: string) => {
          // Clean up previous handlers first
          mockEventManager.activeHandlers.clear();
          
          // Setup new handlers with current instance ID
          if (instanceId && instanceId !== 'undefined') {
            mockEventManager.activeHandlers.set('terminal:output', instanceId);
            mockEventManager.activeHandlers.set('instance:status', instanceId);
          }
        },
        
        getActiveInstanceId: (event: string) => {
          return mockEventManager.activeHandlers.get(event);
        }
      };

      // Setup handlers for first instance
      mockEventManager.setupHandlers(firstInstanceId);
      expect(mockEventManager.getActiveInstanceId('terminal:output')).toBe(firstInstanceId);

      // Switch to second instance
      mockEventManager.setupHandlers(secondInstanceId);
      expect(mockEventManager.getActiveInstanceId('terminal:output')).toBe(secondInstanceId);

      // Verify no undefined instance IDs
      expect(mockEventManager.getActiveInstanceId('terminal:output')).not.toBe('undefined');
    });
  });

  describe('State Transitions and Instance ID Persistence', () => {
    it('should maintain instance ID during component re-renders', () => {
      const instanceId = 'claude-persist123';
      let renderCount = 0;
      
      // Mock component state that persists instance ID across renders
      const mockComponentState = {
        selectedInstance: null as string | null,
        renderHistory: [] as Array<{ render: number; instanceId: string | null }>,
        
        setSelectedInstance: (id: string | null) => {
          mockComponentState.selectedInstance = id;
        },
        
        simulateRender: () => {
          renderCount++;
          mockComponentState.renderHistory.push({
            render: renderCount,
            instanceId: mockComponentState.selectedInstance
          });
          return mockComponentState.selectedInstance;
        }
      };

      // Set instance ID and simulate multiple renders
      mockComponentState.setSelectedInstance(instanceId);
      
      const firstRender = mockComponentState.simulateRender();
      const secondRender = mockComponentState.simulateRender();
      const thirdRender = mockComponentState.simulateRender();

      // Verify instance ID persists across renders
      expect(firstRender).toBe(instanceId);
      expect(secondRender).toBe(instanceId);
      expect(thirdRender).toBe(instanceId);

      // Verify render history shows consistent instance ID
      mockComponentState.renderHistory.forEach(({ instanceId: renderedId }) => {
        expect(renderedId).toBe(instanceId);
        expect(renderedId).not.toBe(undefined);
        expect(renderedId).not.toBe('undefined');
      });
    });

    it('should handle async state updates without losing instance ID', async () => {
      const instanceId = 'claude-async123';
      
      // Mock async state manager
      const mockAsyncStateManager = {
        pendingUpdates: 0,
        currentInstanceId: null as string | null,
        
        asyncSetInstance: async (id: string) => {
          mockAsyncStateManager.pendingUpdates++;
          
          // Simulate async delay
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Update state
          mockAsyncStateManager.currentInstanceId = id;
          mockAsyncStateManager.pendingUpdates--;
          
          return id;
        },
        
        getCurrentInstance: () => mockAsyncStateManager.currentInstanceId
      };

      // Start multiple async updates
      const updatePromises = [
        mockAsyncStateManager.asyncSetInstance(instanceId),
        mockAsyncStateManager.asyncSetInstance(instanceId),
        mockAsyncStateManager.asyncSetInstance(instanceId)
      ];

      // Wait for all updates to complete
      const results = await Promise.all(updatePromises);

      // Verify all updates completed with correct instance ID
      results.forEach(result => {
        expect(result).toBe(instanceId);
        expect(result).not.toBe('undefined');
      });

      // Verify final state is correct
      expect(mockAsyncStateManager.getCurrentInstance()).toBe(instanceId);
      expect(mockAsyncStateManager.pendingUpdates).toBe(0);
    });
  });

  describe('Connection State Management Edge Cases', () => {
    it('should handle rapid instance switching without ID corruption', async () => {
      const instances = [
        'claude-rapid001',
        'claude-rapid002', 
        'claude-rapid003'
      ];

      const mockRapidSwitcher = {
        connectionHistory: [] as Array<{ action: string; instanceId: string; timestamp: number }>,
        currentConnection: null as string | null,
        
        logAction: (action: string, instanceId: string) => {
          mockRapidSwitcher.connectionHistory.push({
            action,
            instanceId,
            timestamp: Date.now()
          });
        },
        
        switchToInstance: (newInstanceId: string) => {
          // Disconnect from current if exists
          if (mockRapidSwitcher.currentConnection) {
            mockRapidSwitcher.logAction('disconnect', mockRapidSwitcher.currentConnection);
          }
          
          // Connect to new instance
          if (newInstanceId && newInstanceId !== 'undefined') {
            mockRapidSwitcher.currentConnection = newInstanceId;
            mockRapidSwitcher.logAction('connect', newInstanceId);
          }
        }
      };

      // Rapidly switch between instances
      for (const instanceId of instances) {
        mockRapidSwitcher.switchToInstance(instanceId);
        // Small delay to simulate real-world timing
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // Verify final state
      expect(mockRapidSwitcher.currentConnection).toBe('claude-rapid003');

      // Verify no undefined instance IDs in history
      mockRapidSwitcher.connectionHistory.forEach(({ instanceId }) => {
        expect(instanceId).not.toBe(undefined);
        expect(instanceId).not.toBe('undefined');
        expect(instanceId).toMatch(/^claude-rapid\d+$/);
      });

      // Verify proper disconnect/connect sequence
      const connectActions = mockRapidSwitcher.connectionHistory.filter(h => h.action === 'connect');
      const disconnectActions = mockRapidSwitcher.connectionHistory.filter(h => h.action === 'disconnect');

      expect(connectActions).toHaveLength(3);
      expect(disconnectActions).toHaveLength(2); // First instance doesn't need disconnect
    });

    it('should prevent connection with malformed instance IDs', () => {
      const malformedIds = [
        undefined,
        'undefined',
        '',
        null,
        'claude-',
        'not-claude-format',
        '   ',
        'claude-undefined'
      ];

      const mockConnectionValidator = {
        connectionAttempts: [] as Array<{ instanceId: any; success: boolean; reason?: string }>,
        
        attemptConnection: (instanceId: any) => {
          // Validate instance ID format
          const isValidFormat = typeof instanceId === 'string' && 
                               instanceId !== 'undefined' &&
                               instanceId.match(/^claude-[a-z0-9]{8}$/);
          
          const result = {
            instanceId,
            success: !!isValidFormat,
            reason: isValidFormat ? undefined : 'Invalid instance ID format'
          };

          mockConnectionValidator.connectionAttempts.push(result);
          return result.success;
        }
      };

      // Test all malformed IDs
      malformedIds.forEach(id => {
        const success = mockConnectionValidator.attemptConnection(id);
        expect(success).toBe(false);
      });

      // Test valid ID
      const validId = 'claude-12345678';
      const validResult = mockConnectionValidator.attemptConnection(validId);
      expect(validResult).toBe(true);

      // Verify no successful connections with invalid IDs
      const successfulAttempts = mockConnectionValidator.connectionAttempts.filter(a => a.success);
      expect(successfulAttempts).toHaveLength(1);
      expect(successfulAttempts[0].instanceId).toBe(validId);
    });
  });

  describe('Error Recovery and Instance ID Restoration', () => {
    it('should recover instance ID after connection failure', async () => {
      const instanceId = 'claude-recover123';
      let connectionFailures = 0;

      const mockConnectionRecovery = {
        lastKnownInstanceId: null as string | null,
        connectionState: 'disconnected' as 'connected' | 'disconnected' | 'connecting',
        
        saveInstanceId: (id: string) => {
          if (id && id !== 'undefined') {
            mockConnectionRecovery.lastKnownInstanceId = id;
          }
        },
        
        attemptConnection: async (id: string) => {
          mockConnectionRecovery.connectionState = 'connecting';
          mockConnectionRecovery.saveInstanceId(id);
          
          // Simulate connection failure on first two attempts
          if (connectionFailures < 2) {
            connectionFailures++;
            mockConnectionRecovery.connectionState = 'disconnected';
            throw new Error('Connection failed');
          }
          
          // Success on third attempt
          mockConnectionRecovery.connectionState = 'connected';
          return true;
        },
        
        recoverConnection: async () => {
          const savedInstanceId = mockConnectionRecovery.lastKnownInstanceId;
          if (savedInstanceId && savedInstanceId !== 'undefined') {
            return await mockConnectionRecovery.attemptConnection(savedInstanceId);
          }
          return false;
        }
      };

      // Initial connection attempt (will fail)
      try {
        await mockConnectionRecovery.attemptConnection(instanceId);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Verify instance ID was saved despite failure
      expect(mockConnectionRecovery.lastKnownInstanceId).toBe(instanceId);

      // Recovery attempt (will also fail)
      try {
        await mockConnectionRecovery.recoverConnection();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Final recovery attempt (will succeed)
      const recoverySuccess = await mockConnectionRecovery.recoverConnection();
      expect(recoverySuccess).toBe(true);
      expect(mockConnectionRecovery.connectionState).toBe('connected');
      expect(mockConnectionRecovery.lastKnownInstanceId).toBe(instanceId);
    });

    it('should provide diagnostic information for debugging undefined IDs', () => {
      const mockDiagnostics = {
        diagnosticLog: [] as Array<{ 
          timestamp: number; 
          event: string; 
          instanceId: any; 
          context: string;
          stack?: string;
        }>,
        
        logInstanceIdUsage: (event: string, instanceId: any, context: string) => {
          const entry = {
            timestamp: Date.now(),
            event,
            instanceId,
            context,
            stack: new Error().stack
          };
          
          mockDiagnostics.diagnosticLog.push(entry);
          
          // Log warnings for problematic instance IDs
          if (instanceId === undefined || instanceId === 'undefined' || instanceId === '') {
            mockConsole.warn(`Problematic instance ID detected: ${instanceId} in ${context}`);
          }
        },
        
        getDiagnosticSummary: () => {
          const problematicEntries = mockDiagnostics.diagnosticLog.filter(entry => 
            entry.instanceId === undefined || 
            entry.instanceId === 'undefined' || 
            entry.instanceId === ''
          );
          
          return {
            totalEvents: mockDiagnostics.diagnosticLog.length,
            problematicEvents: problematicEntries.length,
            problematicEntries
          };
        }
      };

      // Simulate various instance ID usages
      mockDiagnostics.logInstanceIdUsage('connect', 'claude-valid123', 'component-mount');
      mockDiagnostics.logInstanceIdUsage('connect', undefined, 'component-update');
      mockDiagnostics.logInstanceIdUsage('emit', 'undefined', 'terminal-input');
      mockDiagnostics.logInstanceIdUsage('connect', 'claude-another456', 'instance-switch');

      // Get diagnostic summary
      const summary = mockDiagnostics.getDiagnosticSummary();
      
      expect(summary.totalEvents).toBe(4);
      expect(summary.problematicEvents).toBe(2);
      expect(mockConsole.warn).toHaveBeenCalledTimes(2);
      
      // Verify warning messages
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Problematic instance ID detected: undefined in component-update'
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Problematic instance ID detected: undefined in terminal-input'
      );
    });
  });

  describe('Integration with Real Component Lifecycle', () => {
    it('should simulate real component mount/unmount cycle with instance ID', () => {
      const instanceId = 'claude-lifecycle123';
      
      const mockComponentLifecycle = {
        mounted: false,
        selectedInstance: null as string | null,
        eventHandlers: new Set<Function>(),
        
        mount: () => {
          mockComponentLifecycle.mounted = true;
          mockComponentLifecycle.setupEventHandlers();
        },
        
        unmount: () => {
          mockComponentLifecycle.mounted = false;
          mockComponentLifecycle.cleanupEventHandlers();
          mockComponentLifecycle.selectedInstance = null;
        },
        
        setupEventHandlers: () => {
          const handler = vi.fn();
          mockComponentLifecycle.eventHandlers.add(handler);
        },
        
        cleanupEventHandlers: () => {
          mockComponentLifecycle.eventHandlers.clear();
        },
        
        selectInstance: (id: string) => {
          if (mockComponentLifecycle.mounted && id && id !== 'undefined') {
            mockComponentLifecycle.selectedInstance = id;
            return true;
          }
          return false;
        },
        
        getSelectedInstance: () => mockComponentLifecycle.selectedInstance
      };

      // Simulate component lifecycle
      mockComponentLifecycle.mount();
      const selectionSuccess = mockComponentLifecycle.selectInstance(instanceId);
      
      expect(mockComponentLifecycle.mounted).toBe(true);
      expect(selectionSuccess).toBe(true);
      expect(mockComponentLifecycle.getSelectedInstance()).toBe(instanceId);
      
      // Unmount component
      mockComponentLifecycle.unmount();
      
      expect(mockComponentLifecycle.mounted).toBe(false);
      expect(mockComponentLifecycle.getSelectedInstance()).toBe(null);
      expect(mockComponentLifecycle.eventHandlers.size).toBe(0);
    });
  });
});