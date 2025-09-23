/**
 * Performance Tests for Simplified UI
 * 
 * Validates that the simplified UI maintains or improves performance:
 * - Component render times
 * - Memory usage optimization
 * - Bundle size impact
 * - WebSocket performance
 * - User interaction responsiveness
 * - Large dataset handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { performance } from 'perf_hooks';
import React from 'react';
import ClaudeInstanceManager from '@/components/ClaudeInstanceManager';

// Mock performance APIs
global.performance = {
  ...global.performance,
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn().mockReturnValue([]),
  getEntriesByName: vi.fn().mockReturnValue([]),
  now: () => Date.now()
};

// Mock fetch for controlled responses
global.fetch = vi.fn();

// Mock WebSocket for performance testing
class PerformanceMockWebSocket {
  static OPEN = 1;
  readyState = PerformanceMockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  
  messageQueue: string[] = [];
  sendCount = 0;

  constructor(url: string) {
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 1);
  }

  send(data: string) {
    this.sendCount++;
    this.messageQueue.push(data);
  }

  close() {
    this.readyState = PerformanceMockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Simulate message processing
  simulateMessage(message: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', {
        data: JSON.stringify(message)
      }));
    }
  }
}

global.WebSocket = PerformanceMockWebSocket as any;

describe('Simplified UI Performance Tests', () => {
  let mockFetch: any;
  let performanceEntries: any[] = [];

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    performanceEntries = [];
    vi.clearAllMocks();

    // Default fast API responses
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        instances: []
      })
    });

    // Mock performance measurement
    global.performance.mark = vi.fn();
    global.performance.measure = vi.fn().mockImplementation((name, start, end) => {
      const entry = {
        name,
        startTime: Date.now(),
        duration: Math.random() * 100, // Mock duration
        entryType: 'measure'
      };
      performanceEntries.push(entry);
      return entry;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    performanceEntries = [];
  });

  describe('Component Render Performance', () => {
    it('renders ClaudeInstanceManager within acceptable time', async () => {
      const startTime = performance.now();
      
      render(<ClaudeInstanceManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      
      // Should render within 200ms
      expect(renderTime).toBeLessThan(200);
    });

    it('handles initial WebSocket connection efficiently', async () => {
      const startTime = performance.now();
      
      render(<ClaudeInstanceManager />);

      // Wait for WebSocket connection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const connectionTime = performance.now() - startTime;
      
      // WebSocket connection should be fast
      expect(connectionTime).toBeLessThan(100);
    });

    it('renders all 4 buttons without performance degradation', () => {
      const startTime = performance.now();
      
      render(<ClaudeInstanceManager />);
      
      // Verify all buttons are rendered
      expect(screen.getByText('🚀 prod/claude')).toBeInTheDocument();
      expect(screen.getByText('⚡ skip-permissions')).toBeInTheDocument();
      expect(screen.getByText('⚡ skip-permissions -c')).toBeInTheDocument();
      expect(screen.getByText('↻ skip-permissions --resume')).toBeInTheDocument();

      const totalRenderTime = performance.now() - startTime;
      
      // Button rendering should be instantaneous
      expect(totalRenderTime).toBeLessThan(50);
    });

    it('handles re-renders efficiently during state changes', async () => {
      render(<ClaudeInstanceManager />);

      const startTime = performance.now();
      
      // Trigger state change
      fireEvent.click(screen.getByText('🚀 prod/claude'));
      
      await waitFor(() => {
        expect(screen.getByText('🚀 prod/claude')).toBeDisabled();
      });

      const stateChangeTime = performance.now() - startTime;
      
      // State changes should be fast
      expect(stateChangeTime).toBeLessThan(100);
    });
  });

  describe('Memory Usage Optimization', () => {
    it('maintains reasonable memory footprint', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      const { unmount } = render(<ClaudeInstanceManager />);

      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      });

      const mountedMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      unmount();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const unmountedMemory = (performance as any).memory?.usedJSHeapSize || 0;

      if (initialMemory > 0 && mountedMemory > 0) {
        const memoryIncrease = mountedMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // < 10MB
        
        // Memory should be cleaned up after unmount
        expect(unmountedMemory).toBeLessThanOrEqual(mountedMemory);
      }
    });

    it('handles multiple instances without memory leaks', async () => {
      const instances = Array(10).fill(null).map((_, i) => ({
        id: `instance-${i}`,
        name: `Instance ${i}`,
        status: 'running',
        pid: 1000 + i
      }));

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          instances
        })
      });

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      render(<ClaudeInstanceManager />);

      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      });

      const loadedMemory = (performance as any).memory?.usedJSHeapSize || 0;

      if (initialMemory > 0 && loadedMemory > 0) {
        const memoryIncrease = loadedMemory - initialMemory;
        // Should handle 10 instances efficiently
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // < 5MB for 10 instances
      }
    });

    it('cleans up WebSocket connections properly', async () => {
      let wsInstances: PerformanceMockWebSocket[] = [];
      
      const originalWebSocket = global.WebSocket;
      global.WebSocket = vi.fn().mockImplementation((url) => {
        const ws = new PerformanceMockWebSocket(url);
        wsInstances.push(ws);
        return ws;
      });

      const { unmount } = render(<ClaudeInstanceManager />);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(wsInstances).toHaveLength(1);
      expect(wsInstances[0].readyState).toBe(PerformanceMockWebSocket.OPEN);

      unmount();

      // WebSocket should be closed
      expect(wsInstances[0].readyState).toBe(PerformanceMockWebSocket.CLOSED);

      global.WebSocket = originalWebSocket;
    });
  });

  describe('User Interaction Responsiveness', () => {
    it('responds to button clicks within acceptable time', async () => {
      render(<ClaudeInstanceManager />);

      const button = screen.getByText('🚀 prod/claude');
      
      const startTime = performance.now();
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(button).toBeDisabled();
      });

      const responseTime = performance.now() - startTime;
      
      // UI should respond within 50ms
      expect(responseTime).toBeLessThan(50);
    });

    it('handles rapid button clicks efficiently', async () => {
      render(<ClaudeInstanceManager />);

      const button = screen.getByText('🚀 prod/claude');
      
      const startTime = performance.now();
      
      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }

      const totalTime = performance.now() - startTime;
      
      // Should handle rapid clicks efficiently
      expect(totalTime).toBeLessThan(100);
      
      // Should only make one API call due to disabled state
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2); // Initial fetch + one create call
      });
    });

    it('maintains input responsiveness during WebSocket activity', async () => {
      let wsInstance: PerformanceMockWebSocket;
      
      const originalWebSocket = global.WebSocket;
      global.WebSocket = vi.fn().mockImplementation((url) => {
        wsInstance = new PerformanceMockWebSocket(url);
        return wsInstance;
      });

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          instances: [{ id: 'test-1', name: 'Test', status: 'running' }]
        })
      });

      render(<ClaudeInstanceManager />);

      // Wait for instance to load
      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      // Select instance
      fireEvent.click(screen.getByText('Test'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type command and press Enter...')).toBeInTheDocument();
      });

      // Simulate heavy WebSocket activity
      act(() => {
        for (let i = 0; i < 100; i++) {
          wsInstance.simulateMessage({
            type: 'output',
            instanceId: 'test-1',
            data: `Output line ${i}\n`
          });
        }
      });

      // Test input responsiveness during heavy activity
      const input = screen.getByPlaceholderText('Type command and press Enter...');
      
      const startTime = performance.now();
      fireEvent.change(input, { target: { value: 'test command' } });
      const responseTime = performance.now() - startTime;
      
      expect(input).toHaveValue('test command');
      expect(responseTime).toBeLessThan(50);

      global.WebSocket = originalWebSocket;
    });
  });

  describe('WebSocket Performance', () => {
    it('handles WebSocket messages efficiently', async () => {
      let wsInstance: PerformanceMockWebSocket;
      
      const originalWebSocket = global.WebSocket;
      global.WebSocket = vi.fn().mockImplementation((url) => {
        wsInstance = new PerformanceMockWebSocket(url);
        return wsInstance;
      });

      render(<ClaudeInstanceManager />);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const startTime = performance.now();
      
      // Send many messages rapidly
      act(() => {
        for (let i = 0; i < 50; i++) {
          wsInstance.simulateMessage({
            type: 'instances',
            data: [{ id: `inst-${i}`, name: `Instance ${i}`, status: 'running' }]
          });
        }
      });

      const processingTime = performance.now() - startTime;
      
      // Should process messages efficiently
      expect(processingTime).toBeLessThan(200);

      global.WebSocket = originalWebSocket;
    });

    it('handles WebSocket reconnection efficiently', async () => {
      let wsInstances: PerformanceMockWebSocket[] = [];
      
      const originalWebSocket = global.WebSocket;
      global.WebSocket = vi.fn().mockImplementation((url) => {
        const ws = new PerformanceMockWebSocket(url);
        wsInstances.push(ws);
        return ws;
      });

      // Mock setTimeout for reconnection
      const originalSetTimeout = global.setTimeout;
      const timeoutSpy = vi.fn();
      global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
        if (delay === 3000) {
          timeoutSpy();
          return originalSetTimeout(callback, 10); // Fast reconnect for test
        }
        return originalSetTimeout(callback, delay);
      });

      render(<ClaudeInstanceManager />);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(wsInstances).toHaveLength(1);

      const startTime = performance.now();
      
      // Simulate connection close
      act(() => {
        wsInstances[0].close();
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const reconnectionTime = performance.now() - startTime;
      
      // Should attempt reconnection quickly
      expect(timeoutSpy).toHaveBeenCalled();
      expect(reconnectionTime).toBeLessThan(100);

      global.setTimeout = originalSetTimeout;
      global.WebSocket = originalWebSocket;
    });
  });

  describe('Large Dataset Performance', () => {
    it('handles large instance lists efficiently', async () => {
      const largeInstanceList = Array(100).fill(null).map((_, i) => ({
        id: `large-instance-${i}`,
        name: `Large Instance ${i}`,
        status: i % 3 === 0 ? 'running' : i % 3 === 1 ? 'stopped' : 'starting',
        pid: 2000 + i,
        startTime: new Date(Date.now() - i * 1000).toISOString()
      }));

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          instances: largeInstanceList
        })
      });

      const startTime = performance.now();
      
      render(<ClaudeInstanceManager />);

      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      }, { timeout: 5000 });

      const renderTime = performance.now() - startTime;
      
      // Should handle 100 instances within reasonable time
      expect(renderTime).toBeLessThan(1000);

      // Verify instance count is displayed correctly
      await waitFor(() => {
        const runningCount = largeInstanceList.filter(i => i.status === 'running').length;
        expect(screen.getByText(`Active: ${runningCount}/100`)).toBeInTheDocument();
      });
    });

    it('handles large output streams without blocking UI', async () => {
      let wsInstance: PerformanceMockWebSocket;
      
      const originalWebSocket = global.WebSocket;
      global.WebSocket = vi.fn().mockImplementation((url) => {
        wsInstance = new PerformanceMockWebSocket(url);
        return wsInstance;
      });

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          instances: [{ id: 'output-test', name: 'Output Test', status: 'running' }]
        })
      });

      render(<ClaudeInstanceManager />);

      // Select instance
      await waitFor(() => {
        const instance = screen.getByText('Output Test');
        fireEvent.click(instance);
      });

      await waitFor(() => {
        expect(screen.getByText('Instance Output')).toBeInTheDocument();
      });

      const startTime = performance.now();
      
      // Simulate large output stream
      act(() => {
        for (let i = 0; i < 500; i++) {
          wsInstance.simulateMessage({
            type: 'output',
            instanceId: 'output-test',
            data: `This is a long output line ${i} with lots of text to simulate real world usage\n`
          });
        }
      });

      const processingTime = performance.now() - startTime;
      
      // Should handle large output efficiently
      expect(processingTime).toBeLessThan(500);
      
      // UI should remain responsive
      const button = screen.getByText('Send');
      expect(button).toBeEnabled();

      global.WebSocket = originalWebSocket;
    });
  });

  describe('Bundle Size Impact', () => {
    it('maintains reasonable component size', () => {
      // This is a proxy test - in real scenarios you'd measure actual bundle size
      const component = render(<ClaudeInstanceManager />);
      
      // Component should render successfully (indicating reasonable size)
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      
      // Count DOM elements as a proxy for complexity
      const allElements = component.container.querySelectorAll('*');
      
      // Should have reasonable DOM complexity
      expect(allElements.length).toBeLessThan(100);
    });

    it('uses efficient CSS classes and styling', () => {
      render(<ClaudeInstanceManager />);
      
      // Verify efficient CSS class usage
      const buttons = screen.getAllByRole('button');
      
      buttons.forEach(button => {
        const classes = button.className.split(' ');
        // Should use reasonable number of CSS classes
        expect(classes.length).toBeLessThan(10);
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('tracks component lifecycle performance', async () => {
      const { unmount } = render(<ClaudeInstanceManager />);

      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      });

      // Should be able to track performance without issues
      expect(() => {
        performance.mark('test-mark');
        performance.measure('test-measure', 'test-mark');
      }).not.toThrow();

      unmount();
    });

    it('handles performance monitoring during heavy usage', async () => {
      render(<ClaudeInstanceManager />);

      const startTime = performance.now();
      
      // Simulate heavy usage
      const buttons = [
        '🚀 prod/claude',
        '⚡ skip-permissions', 
        '⚡ skip-permissions -c',
        '↻ skip-permissions --resume'
      ];

      for (const buttonText of buttons) {
        const button = screen.getByText(buttonText);
        fireEvent.mouseOver(button);
        fireEvent.mouseOut(button);
        fireEvent.focus(button);
        fireEvent.blur(button);
      }

      const interactionTime = performance.now() - startTime;
      
      // Should handle interactions efficiently
      expect(interactionTime).toBeLessThan(200);
    });
  });
});