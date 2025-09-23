/**
 * TDD London School Test: Status SSE Connection Issues
 * 
 * ISSUE: Backend shows "Broadcasting status running for instance claude-2646 to 0 connections"
 * SHOULD: Show "Broadcasting status running for instance claude-2646 to 1 connections"
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHTTPSSE } from '../../../src/hooks/useHTTPSSE';

// Mock EventSource and fetch
global.EventSource = vi.fn();
global.fetch = vi.fn();

describe('Status SSE Connection Failures', () => {
  let mockEventSource: any;
  let mockFetch: any;
  
  beforeEach(() => {
    mockEventSource = EventSource as any;
    mockFetch = fetch as any;
    
    // Mock EventSource
    mockEventSource.mockImplementation((url: string) => ({
      url,
      onopen: null,
      onmessage: null,
      onerror: null,
      close: vi.fn(),
      readyState: 1,
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2
    }));
    
    // Mock fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    } as Response);
    
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('FAILING TEST: Status SSE connection not being established', () => {
    it('should establish status SSE connection but currently fails', async () => {
      const { result } = renderHook(() => useHTTPSSE({ 
        autoConnect: true,
        url: 'http://localhost:3000' 
      }));
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // This test reveals the issue: status connection is not being created
      expect(mockEventSource).toHaveBeenCalledWith(
        'http://localhost:3000/api/status/stream',
        { withCredentials: false }
      );
      
      expect(result.current.isConnected).toBe(true);
    });
  });
  
  describe('ISSUE IDENTIFICATION: Missing status connection setup', () => {
    it('identifies that connectStatusSSE is not being called in useEffect', async () => {
      const { result } = renderHook(() => useHTTPSSE({ 
        autoConnect: true,
        url: 'http://localhost:3000' 
      }));
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // The issue: useHTTPSSE creates a mock socket but never calls connectStatusSSE
      // Looking at the hook, it only calls connectStatusSSE in the useEffect but
      // this might not be working properly
      expect(mockEventSource).toHaveBeenCalled();
    });
  });
});