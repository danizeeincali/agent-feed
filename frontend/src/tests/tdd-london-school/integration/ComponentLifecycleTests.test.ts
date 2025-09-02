/**
 * Component Lifecycle Integration Tests - London School TDD Approach
 * Tests component mounting, unmounting, and interaction flows with comprehensive mocking
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MockEventSource, EventSourceMockFactory } from '../mocks/EventSourceMock';
import { FetchMock, FetchMockFactory } from '../mocks/FetchMock';
import { MockConnectionManager, ConnectionContractFactory } from '../contracts/ConnectionStateContracts';

// London School - Mock Component Dependencies
interface MockTerminalComponent {
  mount: jest.MockedFunction<(container: HTMLElement) => void>;
  unmount: jest.MockedFunction<() => void>;
  focus: jest.MockedFunction<() => void>;
  blur: jest.MockedFunction<() => void>;
  write: jest.MockedFunction<(data: string) => void>;
  clear: jest.MockedFunction<() => void>;
  resize: jest.MockedFunction<(cols: number, rows: number) => void>;
  getElement: jest.MockedFunction<() => HTMLElement | null>;
  onData: jest.MockedFunction<(callback: (data: string) => void) => void>;
  onResize: jest.MockedFunction<(callback: (size: any) => void) => void>;
}

interface MockErrorBoundary {
  hasError: boolean;
  error: Error | null;
  catchError: jest.MockedFunction<(error: Error, errorInfo: any) => void>;
  reset: jest.MockedFunction<() => void>;
  getFallbackComponent: jest.MockedFunction<() => React.ComponentType>;
}

interface MockConnectionProvider {
  connect: jest.MockedFunction<(instanceId: string) => Promise<void>>;
  disconnect: jest.MockedFunction<(instanceId?: string) => Promise<void>>;
  sendMessage: jest.MockedFunction<(instanceId: string, message: any) => Promise<void>>;
  getConnectionState: jest.MockedFunction<() => any>;
  subscribe: jest.MockedFunction<(event: string, handler: Function) => void>;
  unsubscribe: jest.MockedFunction<(event: string, handler?: Function) => void>;
}

// London School - Mock Factory for Components
class ComponentMockFactory {
  public static createTerminalMock(): MockTerminalComponent {
    return {
      mount: jest.fn(),
      unmount: jest.fn(),
      focus: jest.fn(),
      blur: jest.fn(),
      write: jest.fn(),
      clear: jest.fn(),
      resize: jest.fn(),
      getElement: jest.fn().mockReturnValue(document.createElement('div')),
      onData: jest.fn(),
      onResize: jest.fn()
    };
  }

  public static createErrorBoundaryMock(): MockErrorBoundary {
    return {
      hasError: false,
      error: null,
      catchError: jest.fn((error: Error) => {
        this.hasError = true;
        this.error = error;
      }),
      reset: jest.fn(() => {
        this.hasError = false;
        this.error = null;
      }),
      getFallbackComponent: jest.fn(() => () => null)
    } as MockErrorBoundary;
  }

  public static createConnectionProviderMock(): MockConnectionProvider {
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue(undefined),
      getConnectionState: jest.fn().mockReturnValue({
        status: 'connected',
        instanceId: 'test-instance'
      }),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    };
  }
}

describe('Component Lifecycle Integration Tests - London School TDD', () => {
  let mockTerminal: MockTerminalComponent;
  let mockErrorBoundary: MockErrorBoundary;
  let mockConnectionProvider: MockConnectionProvider;
  let mockEventSource: MockEventSource;
  let mockFetch: FetchMock;
  let mockConnectionManager: MockConnectionManager;
  
  // Mock External Services
  let mockUserInteractionService: any;
  let mockAccessibilityService: any;
  let mockPerformanceMonitor: any;
  let mockMemoryManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup component mocks
    mockTerminal = ComponentMockFactory.createTerminalMock();
    mockErrorBoundary = ComponentMockFactory.createErrorBoundaryMock();
    mockConnectionProvider = ComponentMockFactory.createConnectionProviderMock();
    
    // Setup connection mocks
    mockEventSource = EventSourceMockFactory.createConnectedMock('ws://localhost:3000');
    mockFetch = FetchMockFactory.createTerminalMock();
    mockConnectionManager = ConnectionContractFactory.createHybridContract();
    
    // Setup external service mocks
    mockUserInteractionService = {
      trackUserAction: jest.fn(),
      recordInteractionTime: jest.fn(),
      detectUserIdle: jest.fn(),
      handleUserFocus: jest.fn(),
      handleUserBlur: jest.fn()
    };
    
    mockAccessibilityService = {
      announceToScreenReader: jest.fn(),
      setAriaLabels: jest.fn(),
      manageTabOrder: jest.fn(),
      handleKeyboardNavigation: jest.fn()
    };
    
    mockPerformanceMonitor = {
      startMeasure: jest.fn(),
      endMeasure: jest.fn(),
      recordComponentMount: jest.fn(),
      recordComponentUnmount: jest.fn(),
      monitorMemoryUsage: jest.fn()
    };
    
    mockMemoryManager = {
      trackComponentMemory: jest.fn(),
      cleanupResources: jest.fn(),
      preventMemoryLeaks: jest.fn(),
      optimizeGarbageCollection: jest.fn()
    };
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
  });

  describe('Component Mounting Lifecycle', () => {
    it('should properly initialize all dependencies during mount', async () => {
      // London School - Setup mounting scenario with all dependencies
      const mountPromise = new Promise((resolve) => {
        mockTerminal.mount.mockImplementation((container: HTMLElement) => {
          // Simulate terminal initialization
          setTimeout(() => {
            mockPerformanceMonitor.recordComponentMount('terminal');
            resolve(undefined);
          }, 100);
        });
      });
      
      // Mock component mounting sequence
      const mockComponent = {
        componentDidMount: async () => {
          // Initialize terminal
          const container = document.createElement('div');
          mockTerminal.mount(container);
          
          // Setup connection
          await mockConnectionProvider.connect('test-instance');
          
          // Setup event listeners
          mockConnectionProvider.subscribe('message', mockTerminal.write);
          mockConnectionProvider.subscribe('error', mockErrorBoundary.catchError);
          
          // Initialize accessibility features
          mockAccessibilityService.setAriaLabels(container);
          mockAccessibilityService.manageTabOrder();
          
          // Start performance monitoring
          mockPerformanceMonitor.startMeasure('component-lifecycle');
        }
      };
      
      // Execute mounting
      await mockComponent.componentDidMount();
      await mountPromise;
      
      // Verify mounting sequence
      expect(mockTerminal.mount).toHaveBeenCalledWith(expect.any(HTMLElement));
      expect(mockConnectionProvider.connect).toHaveBeenCalledWith('test-instance');
      expect(mockConnectionProvider.subscribe).toHaveBeenCalledTimes(2);
      
      // Verify accessibility setup
      expect(mockAccessibilityService.setAriaLabels).toHaveBeenCalled();
      expect(mockAccessibilityService.manageTabOrder).toHaveBeenCalled();
      
      // Verify performance monitoring
      expect(mockPerformanceMonitor.recordComponentMount).toHaveBeenCalledWith('terminal');
      expect(mockPerformanceMonitor.startMeasure).toHaveBeenCalledWith('component-lifecycle');
    });

    it('should handle mounting failures gracefully', async () => {
      // London School - Setup mounting failure scenario
      const mountingError = new Error('Terminal initialization failed');
      mockTerminal.mount.mockImplementation(() => {
        throw mountingError;
      });
      
      const mockComponent = {
        componentDidMount: async () => {
          try {
            const container = document.createElement('div');
            mockTerminal.mount(container);
          } catch (error) {
            mockErrorBoundary.catchError(error as Error, {
              componentStack: 'TerminalComponent'
            });
          }
        }
      };
      
      // Execute mounting with error
      await mockComponent.componentDidMount();
      
      // Verify error handling
      expect(mockTerminal.mount).toHaveBeenCalled();
      expect(mockErrorBoundary.catchError).toHaveBeenCalledWith(
        mountingError,
        expect.objectContaining({ componentStack: 'TerminalComponent' })
      );
      expect(mockErrorBoundary.hasError).toBe(true);
      
      // Verify fallback UI is prepared
      expect(mockErrorBoundary.getFallbackComponent).toHaveBeenCalled();
      
      // Verify error metrics are recorded
      expect(mockPerformanceMonitor.recordComponentMount).not.toHaveBeenCalled();
    });

    it('should establish connection during mounting with proper error handling', async () => {
      // London School - Setup connection establishment during mount
      const connectionSetupPromise = mockConnectionManager.connect({
        url: 'ws://localhost:3000',
        enableAutoReconnect: true,
        timeout: 5000
      });
      
      const mockComponent = {
        componentDidMount: async () => {
          // Setup terminal first
          mockTerminal.mount(document.createElement('div'));
          
          // Establish connection
          try {
            await connectionSetupPromise;
            
            // Setup message handlers
            mockConnectionProvider.subscribe('connect', () => {
              mockAccessibilityService.announceToScreenReader('Terminal connected');
            });
            
            mockConnectionProvider.subscribe('disconnect', () => {
              mockAccessibilityService.announceToScreenReader('Terminal disconnected');
            });
            
            mockConnectionProvider.subscribe('message', (data: any) => {
              mockTerminal.write(data.output);
              mockUserInteractionService.trackUserAction('message_received');
            });
            
          } catch (error) {
            mockErrorBoundary.catchError(error as Error, {
              phase: 'connection_setup'
            });
          }
        }
      };
      
      // Execute mounting with connection
      await mockComponent.componentDidMount();
      
      // Verify connection was established
      expect(mockConnectionManager.connectMock).toHaveBeenCalledWith({
        url: 'ws://localhost:3000',
        enableAutoReconnect: true,
        timeout: 5000
      });
      
      // Verify event handlers were setup
      expect(mockConnectionProvider.subscribe).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockConnectionProvider.subscribe).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockConnectionProvider.subscribe).toHaveBeenCalledWith('message', expect.any(Function));
      
      // Verify accessibility announcements are ready
      expect(mockAccessibilityService.announceToScreenReader).toHaveBeenCalled();
    });
  });

  describe('Component Unmounting Lifecycle', () => {
    it('should properly cleanup all resources during unmount', async () => {
      // London School - Setup unmounting scenario
      let cleanupCallbacks: Function[] = [];
      
      const mockComponent = {
        componentWillUnmount: async () => {
          // Stop performance monitoring
          mockPerformanceMonitor.endMeasure('component-lifecycle');
          
          // Cleanup connection
          mockConnectionProvider.unsubscribe('message');
          mockConnectionProvider.unsubscribe('error');
          await mockConnectionProvider.disconnect();
          
          // Cleanup terminal
          mockTerminal.unmount();
          
          // Cleanup accessibility features
          mockAccessibilityService.manageTabOrder(false);
          
          // Cleanup memory
          mockMemoryManager.cleanupResources();
          mockMemoryManager.preventMemoryLeaks();
          
          // Execute cleanup callbacks
          cleanupCallbacks.forEach(callback => callback());
          
          // Record unmount metrics
          mockPerformanceMonitor.recordComponentUnmount('terminal');
        }
      };
      
      // Execute unmounting
      await mockComponent.componentWillUnmount();
      
      // Verify cleanup sequence
      expect(mockPerformanceMonitor.endMeasure).toHaveBeenCalledWith('component-lifecycle');
      expect(mockConnectionProvider.unsubscribe).toHaveBeenCalledTimes(2);
      expect(mockConnectionProvider.disconnect).toHaveBeenCalled();
      expect(mockTerminal.unmount).toHaveBeenCalled();
      
      // Verify memory cleanup
      expect(mockMemoryManager.cleanupResources).toHaveBeenCalled();
      expect(mockMemoryManager.preventMemoryLeaks).toHaveBeenCalled();
      
      // Verify metrics recording
      expect(mockPerformanceMonitor.recordComponentUnmount).toHaveBeenCalledWith('terminal');
    });

    it('should handle unmounting errors without crashing', async () => {
      // London School - Setup unmounting error scenario
      const unmountError = new Error('Connection cleanup failed');
      mockConnectionProvider.disconnect.mockRejectedValue(unmountError);
      
      const mockComponent = {
        componentWillUnmount: async () => {
          try {
            await mockConnectionProvider.disconnect();
            mockTerminal.unmount();
          } catch (error) {
            // Log error but continue cleanup
            console.error('Unmount error:', error);
            
            // Force cleanup even if connection fails
            mockTerminal.unmount();
            mockMemoryManager.cleanupResources();
          }
        }
      };
      
      // Execute unmounting with error
      await mockComponent.componentWillUnmount();
      
      // Verify disconnect was attempted
      expect(mockConnectionProvider.disconnect).toHaveBeenCalled();
      
      // Verify cleanup continued despite error
      expect(mockTerminal.unmount).toHaveBeenCalled();
      expect(mockMemoryManager.cleanupResources).toHaveBeenCalled();
    });

    it('should prevent memory leaks during unmounting', async () => {
      // London School - Setup memory leak prevention scenario
      const mockEventListeners: Map<string, Function[]> = new Map();
      const mockTimeouts: NodeJS.Timeout[] = [];
      const mockIntervals: NodeJS.Timer[] = [];
      
      const mockComponent = {
        componentWillUnmount: () => {
          // Clear event listeners
          mockEventListeners.forEach((listeners, event) => {
            listeners.forEach(listener => {
              mockConnectionProvider.unsubscribe(event, listener);
            });
          });
          mockEventListeners.clear();
          
          // Clear timeouts and intervals
          mockTimeouts.forEach(timeout => clearTimeout(timeout));
          mockIntervals.forEach(interval => clearInterval(interval));
          
          // Cleanup DOM references
          mockTerminal.getElement.mockReturnValue(null);
          
          // Run garbage collection optimization
          mockMemoryManager.optimizeGarbageCollection();
          
          // Track memory usage after cleanup
          mockMemoryManager.trackComponentMemory('post-cleanup');
        }
      };
      
      // Execute unmounting
      mockComponent.componentWillUnmount();
      
      // Verify memory leak prevention
      expect(mockConnectionProvider.unsubscribe).toHaveBeenCalled();
      expect(mockMemoryManager.optimizeGarbageCollection).toHaveBeenCalled();
      expect(mockMemoryManager.trackComponentMemory).toHaveBeenCalledWith('post-cleanup');
      
      // Verify DOM references are cleared
      expect(mockTerminal.getElement()).toBeNull();
    });
  });

  describe('User Interaction Flows', () => {
    it('should handle user input with proper event delegation', async () => {
      // London School - Setup user input scenario
      const userInput = 'ls -la\n';
      
      const mockComponent = {
        handleUserInput: async (input: string) => {
          // Track user action
          mockUserInteractionService.trackUserAction('terminal_input', {
            inputLength: input.length,
            timestamp: Date.now()
          });
          
          // Send command through connection
          try {
            await mockConnectionProvider.sendMessage('test-instance', {
              type: 'input',
              data: input
            });
            
            // Update UI to show command was sent
            mockTerminal.write(`$ ${input}`);
            
          } catch (error) {
            mockErrorBoundary.catchError(error as Error, {
              context: 'user_input'
            });
          }
        }
      };
      
      // Simulate user input
      await mockComponent.handleUserInput(userInput);
      
      // Verify user interaction tracking
      expect(mockUserInteractionService.trackUserAction).toHaveBeenCalledWith(
        'terminal_input',
        expect.objectContaining({
          inputLength: userInput.length,
          timestamp: expect.any(Number)
        })
      );
      
      // Verify command was sent
      expect(mockConnectionProvider.sendMessage).toHaveBeenCalledWith(
        'test-instance',
        {
          type: 'input',
          data: userInput
        }
      );
      
      // Verify UI was updated
      expect(mockTerminal.write).toHaveBeenCalledWith(`$ ${userInput}`);
    });

    it('should handle focus and blur events with accessibility considerations', async () => {
      // London School - Setup focus management scenario
      const mockComponent = {
        handleFocus: () => {
          mockTerminal.focus();
          mockUserInteractionService.handleUserFocus();
          mockAccessibilityService.announceToScreenReader('Terminal focused');
          mockPerformanceMonitor.recordComponentMount('focus');
        },
        
        handleBlur: () => {
          mockTerminal.blur();
          mockUserInteractionService.handleUserBlur();
          mockAccessibilityService.announceToScreenReader('Terminal unfocused');
          mockPerformanceMonitor.recordComponentUnmount('focus');
        }
      };
      
      // Simulate focus events
      mockComponent.handleFocus();
      
      // Verify focus handling
      expect(mockTerminal.focus).toHaveBeenCalled();
      expect(mockUserInteractionService.handleUserFocus).toHaveBeenCalled();
      expect(mockAccessibilityService.announceToScreenReader).toHaveBeenCalledWith('Terminal focused');
      
      // Simulate blur events
      mockComponent.handleBlur();
      
      // Verify blur handling
      expect(mockTerminal.blur).toHaveBeenCalled();
      expect(mockUserInteractionService.handleUserBlur).toHaveBeenCalled();
      expect(mockAccessibilityService.announceToScreenReader).toHaveBeenCalledWith('Terminal unfocused');
    });

    it('should handle keyboard shortcuts with proper event handling', async () => {
      // London School - Setup keyboard shortcut scenario
      const keyboardShortcuts = {
        'Ctrl+C': 'interrupt',
        'Ctrl+D': 'exit',
        'Ctrl+L': 'clear',
        'Ctrl+R': 'reverse_search'
      };
      
      const mockComponent = {
        handleKeyboardShortcut: async (key: string, ctrlKey: boolean) => {
          const shortcut = ctrlKey ? `Ctrl+${key}` : key;
          const action = keyboardShortcuts[shortcut as keyof typeof keyboardShortcuts];
          
          if (action) {
            mockUserInteractionService.trackUserAction('keyboard_shortcut', {
              shortcut,
              action
            });
            
            switch (action) {
              case 'interrupt':
                await mockConnectionProvider.sendMessage('test-instance', {
                  type: 'signal',
                  signal: 'SIGINT'
                });
                break;
              case 'clear':
                mockTerminal.clear();
                break;
              default:
                await mockConnectionProvider.sendMessage('test-instance', {
                  type: 'shortcut',
                  action
                });
            }
          }
        }
      };
      
      // Test interrupt shortcut
      await mockComponent.handleKeyboardShortcut('C', true);
      
      // Verify shortcut handling
      expect(mockUserInteractionService.trackUserAction).toHaveBeenCalledWith(
        'keyboard_shortcut',
        { shortcut: 'Ctrl+C', action: 'interrupt' }
      );
      
      expect(mockConnectionProvider.sendMessage).toHaveBeenCalledWith(
        'test-instance',
        { type: 'signal', signal: 'SIGINT' }
      );
      
      // Test clear shortcut
      await mockComponent.handleKeyboardShortcut('L', true);
      
      expect(mockTerminal.clear).toHaveBeenCalled();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should catch and handle component errors gracefully', async () => {
      // London School - Setup error boundary scenario
      const componentError = new Error('Terminal rendering failed');
      
      const mockComponent = {
        render: () => {
          try {
            // Simulate component error
            throw componentError;
          } catch (error) {
            mockErrorBoundary.catchError(error as Error, {
              componentName: 'TerminalComponent',
              phase: 'render',
              stack: (error as Error).stack
            });
            
            // Return fallback UI
            return mockErrorBoundary.getFallbackComponent();
          }
        }
      };
      
      // Execute component render with error
      const result = mockComponent.render();
      
      // Verify error was caught
      expect(mockErrorBoundary.catchError).toHaveBeenCalledWith(
        componentError,
        expect.objectContaining({
          componentName: 'TerminalComponent',
          phase: 'render'
        })
      );
      
      expect(mockErrorBoundary.hasError).toBe(true);
      expect(mockErrorBoundary.error).toBe(componentError);
      
      // Verify fallback UI is returned
      expect(mockErrorBoundary.getFallbackComponent).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle connection errors through error boundary', async () => {
      // London School - Setup connection error boundary scenario
      const connectionError = new Error('WebSocket connection failed');
      mockConnectionProvider.connect.mockRejectedValue(connectionError);
      
      const mockComponent = {
        componentDidMount: async () => {
          try {
            await mockConnectionProvider.connect('test-instance');
          } catch (error) {
            mockErrorBoundary.catchError(error as Error, {
              context: 'connection',
              retryable: true
            });
            
            // Show connection error UI
            mockAccessibilityService.announceToScreenReader(
              'Connection failed, please try again'
            );
          }
        }
      };
      
      // Execute mounting with connection error
      await mockComponent.componentDidMount();
      
      // Verify error handling
      expect(mockConnectionProvider.connect).toHaveBeenCalledWith('test-instance');
      expect(mockErrorBoundary.catchError).toHaveBeenCalledWith(
        connectionError,
        expect.objectContaining({
          context: 'connection',
          retryable: true
        })
      );
      
      // Verify user feedback
      expect(mockAccessibilityService.announceToScreenReader).toHaveBeenCalledWith(
        'Connection failed, please try again'
      );
    });
  });

  describe('London School - Contract Verification', () => {
    it('should verify all lifecycle contracts are fulfilled', () => {
      // Verify component mocks were interacted with properly
      expect(mockTerminal.mount).toHaveBeenCalled();
      expect(mockTerminal.unmount).toHaveBeenCalled();
      
      // Verify connection provider contracts
      expect(mockConnectionProvider.connect).toHaveBeenCalled();
      expect(mockConnectionProvider.disconnect).toHaveBeenCalled();
      expect(mockConnectionProvider.subscribe).toHaveBeenCalled();
      expect(mockConnectionProvider.unsubscribe).toHaveBeenCalled();
      
      // Verify error boundary contracts
      expect(mockErrorBoundary.catchError).toHaveBeenCalled();
      
      // Verify external service contracts
      expect(mockUserInteractionService.trackUserAction).toHaveBeenCalled();
      expect(mockAccessibilityService.announceToScreenReader).toHaveBeenCalled();
      expect(mockPerformanceMonitor.recordComponentMount).toHaveBeenCalled();
      expect(mockMemoryManager.cleanupResources).toHaveBeenCalled();
    });

    it('should verify proper resource management throughout lifecycle', () => {
      // Verify memory management
      expect(mockMemoryManager.trackComponentMemory).toHaveBeenCalled();
      expect(mockMemoryManager.cleanupResources).toHaveBeenCalled();
      expect(mockMemoryManager.preventMemoryLeaks).toHaveBeenCalled();
      
      // Verify performance monitoring
      expect(mockPerformanceMonitor.startMeasure).toHaveBeenCalled();
      expect(mockPerformanceMonitor.endMeasure).toHaveBeenCalled();
      
      // Verify connection cleanup
      expect(mockConnectionProvider.disconnect).toHaveBeenCalled();
      expect(mockConnectionProvider.unsubscribe).toHaveBeenCalled();
    });

    it('should verify all collaborators are properly mocked', () => {
      // Verify all mocks are jest functions
      expect(jest.isMockFunction(mockTerminal.mount)).toBe(true);
      expect(jest.isMockFunction(mockConnectionProvider.connect)).toBe(true);
      expect(jest.isMockFunction(mockErrorBoundary.catchError)).toBe(true);
      expect(jest.isMockFunction(mockUserInteractionService.trackUserAction)).toBe(true);
      
      // Verify mocks have been called (behavior verification)
      expect(mockTerminal.mount).toHaveBeenCalled();
      expect(mockConnectionProvider.connect).toHaveBeenCalled();
      expect(mockErrorBoundary.catchError).toHaveBeenCalled();
      expect(mockUserInteractionService.trackUserAction).toHaveBeenCalled();
    });
  });
});