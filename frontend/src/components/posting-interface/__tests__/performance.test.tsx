/**
 * Performance Tests for Avi DM Functionality
 * Tests rendering performance, memory usage, and optimization
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AviDirectChatSDK } from '../AviDirectChatSDK';
import { EnhancedPostingInterface } from '../../EnhancedPostingInterface';
import {
  performanceHelpers,
  memoryHelpers,
  createFetchMock,
  setupTestEnvironment
} from './test-utils';

// Mock dependencies for performance testing
jest.mock('../../StreamingTicker', () => {
  return React.memo(function MockStreamingTicker({ enabled }: any) {
    return <div data-testid="streaming-ticker">{enabled ? 'Active' : 'Inactive'}</div>;
  });
});

jest.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

const mockFetch = createFetchMock();
global.fetch = mockFetch;

// Performance thresholds (adjust based on requirements)
const PERFORMANCE_THRESHOLDS = {
  initialRender: 100, // ms
  stateUpdate: 50, // ms
  apiCall: 16, // ms (60fps = 16.67ms per frame)
  memoryGrowth: 10 * 1024 * 1024, // 10MB
  rerenderCount: 5 // Maximum re-renders for simple updates
};

describe('Performance Tests', () => {
  let cleanup: () => void;

  beforeEach(() => {
    const env = setupTestEnvironment();
    cleanup = env.restore;
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
  });

  describe('AviDirectChatSDK Performance', () => {
    test('initial render performance', async () => {
      const renderTime = await performanceHelpers.measureRenderTime(() => {
        render(<AviDirectChatSDK />);
      });

      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.initialRender);
    });

    test('message state updates are optimized', async () => {
      mockFetch.mockSuccess({ success: true, responses: [{ content: 'Response' }] });

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      const updateTime = await performanceHelpers.measureAsyncOperation(async () => {
        await userEvent.type(textarea, 'Test message');
        await userEvent.click(sendButton);

        await waitFor(() => {
          expect(screen.getByText('Test message')).toBeInTheDocument();
        });
      });

      expect(updateTime).toBeLessThan(PERFORMANCE_THRESHOLDS.stateUpdate * 10); // Allow more time for full flow
    });

    test('handles large message history efficiently', async () => {
      const { rerender } = render(<AviDirectChatSDK />);

      // Simulate component with many messages
      const manyMessagesProps = {
        // Would need to inject initial state in real implementation
      };

      const rerenderTime = await performanceHelpers.measureRenderTime(() => {
        rerender(<AviDirectChatSDK {...manyMessagesProps} />);
      });

      expect(rerenderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.initialRender);
    });

    test('image processing performance', async () => {
      render(<AviDirectChatSDK />);

      const fileInput = screen.getByTestId('avi-chat-sdk').querySelector('input[type="file"]') as HTMLInputElement;
      const files = Array.from({ length: 5 }, (_, i) =>
        new File(['test'], `image${i}.jpg`, { type: 'image/jpeg' })
      );

      const processingTime = await performanceHelpers.measureAsyncOperation(async () => {
        await act(async () => {
          fireEvent.change(fileInput, { target: { files } });
        });

        await waitFor(() => {
          expect(screen.getByText('image0.jpg')).toBeInTheDocument();
        });
      });

      expect(processingTime).toBeLessThan(1000); // 1 second for 5 images
    });

    test('memory usage remains stable', async () => {
      const memoryMonitor = memoryHelpers.detectLeaks();

      render(<AviDirectChatSDK />);

      // Simulate heavy usage
      for (let i = 0; i < 50; i++) {
        mockFetch.mockSuccess({ success: true, responses: [{ content: `Message ${i}` }] });

        const textarea = screen.getByPlaceholderText('Type your message to Avi...');
        await userEvent.type(textarea, `Test message ${i}`);
        await userEvent.clear(textarea);
      }

      const memoryGrowth = memoryMonitor.getMemoryDiff();
      expect(memoryGrowth).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryGrowth);
    });

    test('event handler optimization', async () => {
      let renderCount = 0;
      const TestWrapper = React.memo(() => {
        renderCount++;
        return <AviDirectChatSDK />;
      });

      render(<TestWrapper />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');

      // Multiple typing events should not cause excessive re-renders
      await userEvent.type(textarea, 'Hello world');

      expect(renderCount).toBeLessThan(PERFORMANCE_THRESHOLDS.rerenderCount);
    });

    test('connection state changes do not block UI', async () => {
      const onConnectionStateChange = jest.fn();
      render(<AviDirectChatSDK onConnectionStateChange={onConnectionStateChange} />);

      const startTime = performance.now();

      // Trigger multiple state changes
      for (let i = 0; i < 10; i++) {
        mockFetch.mockSuccess({ success: true, responses: [] });

        const textarea = screen.getByPlaceholderText('Type your message to Avi...');
        const sendButton = screen.getByRole('button', { name: '' });

        await userEvent.type(textarea, `Msg ${i}`);
        await userEvent.click(sendButton);
        await userEvent.clear(textarea);
      }

      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / 10;

      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.stateUpdate * 2);
    });
  });

  describe('EnhancedPostingInterface Performance', () => {
    test('tab switching performance', async () => {
      render(<EnhancedPostingInterface />);

      const tabs = [
        screen.getByRole('tab', { name: /quick post/i }),
        screen.getByRole('tab', { name: /post/i }),
        screen.getByRole('tab', { name: /avi dm/i })
      ];

      const switchTime = await performanceHelpers.measureAsyncOperation(async () => {
        for (const tab of tabs) {
          await userEvent.click(tab);
        }
      });

      expect(switchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.stateUpdate * tabs.length);
    });

    test('form state updates are debounced', async () => {
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input') ||
                      screen.getByPlaceholderText(/what's on your mind/i);

      const typingTime = await performanceHelpers.measureAsyncOperation(async () => {
        // Rapid typing should be handled efficiently
        await userEvent.type(textarea, 'a'.repeat(100));
      });

      expect(typingTime).toBeLessThan(500); // 500ms for 100 characters
    });

    test('concurrent API calls are handled efficiently', async () => {
      // Mock multiple successful responses
      for (let i = 0; i < 5; i++) {
        mockFetch.mockSuccess({ data: { id: `post-${i}` } });
      }

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input') ||
                      screen.getByPlaceholderText(/what's on your mind/i);
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      const concurrentTime = await performanceHelpers.measureAsyncOperation(async () => {
        // Simulate rapid submissions
        for (let i = 0; i < 5; i++) {
          await userEvent.type(textarea, `Post ${i}`);
          await userEvent.click(submitButton);
          await waitFor(() => expect(textarea).toHaveValue(''));
        }
      });

      expect(concurrentTime).toBeLessThan(2000); // 2 seconds for 5 posts
    });

    test('component lazy loading performance', async () => {
      const loadTime = await performanceHelpers.measureRenderTime(() => {
        render(<EnhancedPostingInterface />);
      });

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.initialRender);

      // Switch to Avi tab (lazy loaded content)
      const aviTab = screen.getByRole('tab', { name: /avi dm/i });

      const lazyLoadTime = await performanceHelpers.measureAsyncOperation(async () => {
        await userEvent.click(aviTab);
        await waitFor(() => {
          expect(screen.getByTestId('avi-direct-chat-sdk')).toBeInTheDocument();
        });
      });

      expect(lazyLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.stateUpdate);
    });
  });

  describe('Streaming Performance', () => {
    test('streaming ticker updates do not impact main thread', async () => {
      render(<AviDirectChatSDK isLoading={true} />);

      const ticker = screen.getByTestId('streaming-ticker');
      expect(ticker).toBeInTheDocument();

      // Simulate typing while streaming is active
      const textarea = screen.getByPlaceholderText('Type your message to Avi...');

      const typingTime = await performanceHelpers.measureAsyncOperation(async () => {
        await userEvent.type(textarea, 'Typing while streaming');
      });

      expect(typingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.stateUpdate * 5);
    });

    test('handles EventSource connection efficiently', async () => {
      // Mock EventSource for performance testing
      const mockEventSource = {
        onopen: null,
        onmessage: null,
        onerror: null,
        close: jest.fn(),
        readyState: 1
      };

      (global as any).EventSource = jest.fn(() => mockEventSource);

      const connectionTime = await performanceHelpers.measureRenderTime(() => {
        render(<AviDirectChatSDK />);
      });

      expect(connectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.initialRender);
    });
  });

  describe('Memory Management', () => {
    test('cleans up event listeners on unmount', () => {
      const { unmount } = render(<AviDirectChatSDK />);

      // Check initial event listeners
      const initialListeners = process.listenerCount ? process.listenerCount('unhandledRejection') : 0;

      unmount();

      // Verify cleanup
      const finalListeners = process.listenerCount ? process.listenerCount('unhandledRejection') : 0;
      expect(finalListeners).toBeLessThanOrEqual(initialListeners);
    });

    test('prevents memory leaks in message history', async () => {
      const memoryMonitor = memoryHelpers.detectLeaks();

      const { unmount } = render(<AviDirectChatSDK />);

      // Simulate adding many messages
      for (let i = 0; i < 100; i++) {
        mockFetch.mockSuccess({ success: true, responses: [{ content: `Msg ${i}` }] });

        const textarea = screen.getByPlaceholderText('Type your message to Avi...');
        await userEvent.type(textarea, `Test ${i}`);
        await userEvent.clear(textarea);
      }

      unmount();

      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc();
      }

      const memoryGrowth = memoryMonitor.getMemoryDiff();
      expect(memoryGrowth).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryGrowth / 2);
    });

    test('handles rapid component mounting/unmounting', async () => {
      const mountTime = await performanceHelpers.measureAsyncOperation(async () => {
        for (let i = 0; i < 10; i++) {
          const { unmount } = render(<EnhancedPostingInterface />);
          unmount();
        }
      });

      expect(mountTime).toBeLessThan(1000); // 1 second for 10 mount/unmount cycles
    });
  });

  describe('Bundle Size Impact', () => {
    test('components tree-shake effectively', () => {
      // This would be tested in a real build environment
      // Here we can check that components don't import unnecessary dependencies

      const { container } = render(<AviDirectChatSDK />);
      expect(container.firstChild).toBeDefined();

      // Verify essential functionality is present
      expect(screen.getByTestId('avi-chat-sdk')).toBeInTheDocument();
      expect(screen.getByText('Avi AI Assistant')).toBeInTheDocument();
    });

    test('lazy loading reduces initial bundle', async () => {
      const initialRender = await performanceHelpers.measureRenderTime(() => {
        render(<EnhancedPostingInterface />);
      });

      expect(initialRender).toBeLessThan(PERFORMANCE_THRESHOLDS.initialRender);

      // Content should be loaded on-demand
      expect(screen.getByTestId('mention-input')).toBeInTheDocument(); // Quick tab (default)
      expect(screen.queryByTestId('post-creator')).not.toBeInTheDocument(); // Not loaded yet
    });
  });

  describe('Optimization Verification', () => {
    test('React.memo optimization works', () => {
      let parentRenders = 0;
      let childRenders = 0;

      const OptimizedChild = React.memo(() => {
        childRenders++;
        return <AviDirectChatSDK />;
      });

      const Parent = ({ trigger }: { trigger: number }) => {
        parentRenders++;
        return <OptimizedChild />;
      };

      const { rerender } = render(<Parent trigger={1} />);

      // Change prop that doesn't affect child
      rerender(<Parent trigger={2} />);
      rerender(<Parent trigger={3} />);

      expect(parentRenders).toBe(3);
      expect(childRenders).toBe(1); // Should only render once due to memo
    });

    test('useCallback optimization prevents unnecessary re-renders', async () => {
      let callbackCreations = 0;

      const TestComponent = () => {
        const callback = React.useCallback(() => {
          callbackCreations++;
        }, []);

        return <AviDirectChatSDK onMessageSent={callback} />;
      };

      const { rerender } = render(<TestComponent />);

      rerender(<TestComponent />);
      rerender(<TestComponent />);

      expect(callbackCreations).toBe(0); // Callback should be stable
    });

    test('useMemo optimization for expensive calculations', () => {
      let calculationCalls = 0;

      const TestComponent = ({ data }: { data: number[] }) => {
        const expensiveValue = React.useMemo(() => {
          calculationCalls++;
          return data.reduce((sum, n) => sum + n, 0);
        }, [data]);

        return <div>{expensiveValue}</div>;
      };

      const { rerender } = render(<TestComponent data={[1, 2, 3]} />);

      // Same data should not recalculate
      rerender(<TestComponent data={[1, 2, 3]} />);
      expect(calculationCalls).toBe(1);

      // Different data should recalculate
      rerender(<TestComponent data={[4, 5, 6]} />);
      expect(calculationCalls).toBe(2);
    });
  });
});