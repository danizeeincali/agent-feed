/**
 * TDD LONDON SCHOOL: "No pages found" Root Cause Test
 * 
 * CRITICAL FAILING TEST - Reproduces exact error condition:
 * "No pages found for agent, but looking for page 'b2935f20-b8a2-4be4-f6f467a8df9d'"
 * 
 * Test Strategy:
 * 1. Mock useParams to return exact failing scenario
 * 2. Mock fetch API to simulate various response states
 * 3. Test timing issues between component mount and API calls
 * 4. Isolate the race condition causing the error
 * 
 * Error Location: AgentDynamicPage.tsx:312
 * Trigger Condition: initialPageId exists + pages.length === 0 + !loading
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter, useParams } from 'react-router-dom';
import { vi } from 'vitest';
import AgentDynamicPage from '../../../components/AgentDynamicPage';

// LONDON SCHOOL: Mock React Router useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

// LONDON SCHOOL: Mock fetch for API behavior control
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock agent data matching the real scenario
const mockAgent = {
  id: 'personal-todos-agent',
  name: 'Personal Todos Agent',
  display_name: 'Personal Todos Agent',
};

describe('TDD London School: "No pages found" Root Cause Analysis', () => {
  const mockUseParams = vi.mocked(useParams);

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Default successful API response mock
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/agents/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [] // Empty pages array - this is the key issue
          })
        });
      }
      return Promise.reject(new Error('Unexpected API call'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * FAILING TEST 1: Reproduce Exact Error Message
   * This test MUST fail to expose the root cause
   */
  test('FAIL: Should reproduce "No pages found for agent, but looking for page" error', async () => {
    // ARRANGE: Mock the exact failing scenario
    mockUseParams.mockReturnValue({
      agentId: 'personal-todos-agent',
      pageId: 'b2935f20-b8a2-4be4-bed4-f6f467a8df9d' // Exact failing pageId
    });

    // Mock API to return empty pages (simulating real scenario)
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [] // No pages returned from API
        })
      })
    );

    // ACT: Render component with initialPageId prop
    render(
      <BrowserRouter>
        <AgentDynamicPage 
          agent={mockAgent}
          initialPageId="b2935f20-b8a2-4be4-bed4-f6f467a8df9d"
        />
      </BrowserRouter>
    );

    // ASSERT: Wait for the exact error message to appear
    await waitFor(() => {
      expect(screen.getByText(/No pages found for agent, but looking for page/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify the exact error message format
    expect(screen.getByText(
      'No pages found for agent, but looking for page "b2935f20-b8a2-4be4-bed4-f6f467a8df9d"'
    )).toBeInTheDocument();
  });

  /**
   * FAILING TEST 2: Race Condition Analysis  
   * Tests the exact timing issue causing the error
   */
  test('FAIL: Should expose race condition between loading state and page lookup', async () => {
    // ARRANGE: Mock slow API response
    let resolveApiCall: (value: any) => void;
    const apiPromise = new Promise(resolve => { resolveApiCall = resolve; });
    
    mockUseParams.mockReturnValue({
      agentId: 'personal-todos-agent',
      pageId: 'b2935f20-b8a2-4be4-bed4-f6f467a8df9d'
    });

    mockFetch.mockImplementation(() => apiPromise);

    // ACT: Render component
    const { rerender } = render(
      <BrowserRouter>
        <AgentDynamicPage 
          agent={mockAgent}
          initialPageId="b2935f20-b8a2-4be4-bed4-f6f467a8df9d"
        />
      </BrowserRouter>
    );

    // ASSERT: Initially should show loading
    expect(screen.getByText(/Loading agent workspace/i)).toBeInTheDocument();

    // ACT: Resolve API with empty pages
    act(() => {
      resolveApiCall!({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [] // Empty pages
        })
      });
    });

    // ASSERT: Should show the exact error after loading completes
    await waitFor(() => {
      expect(screen.queryByText(/Loading agent workspace/i)).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/No pages found for agent, but looking for page/i)).toBeInTheDocument();
    });
  });

  /**
   * ROOT CAUSE ANALYSIS SUMMARY TEST
   * Documents the exact problem location and conditions
   */
  test('ROOT CAUSE: Document exact error trigger conditions', async () => {
    // This test documents the findings - it should fail to demonstrate the issue

    /*
     * ROOT CAUSE IDENTIFIED:
     * 
     * Location: AgentDynamicPage.tsx:310-313
     * Code: 
     *   } else if (initialPageId && initialPageId !== 'undefined' && pages.length === 0 && !loading) {
     *     setError(`No pages found for agent, but looking for page "${initialPageId}"`);
     *   }
     * 
     * Trigger Conditions:
     * 1. initialPageId is provided (from URL/props)
     * 2. initialPageId !== 'undefined' 
     * 3. pages.length === 0 (API returned empty array or hasn't loaded yet)
     * 4. !loading (loading state is false)
     * 
     * Race Condition:
     * - useEffect dependencies: [initialPageId, pages, loading]
     * - When API succeeds but returns empty pages, loading becomes false
     * - Component tries to find initialPageId in empty pages array
     * - Error is set instead of handling the "no pages available" state
     * 
     * Fix Required:
     * - Better handling of empty pages state vs missing specific page
     * - Distinguish between "API returned no pages" vs "page not found in existing pages"
     * - Improve loading state management during page lookup
     */

    const mockConsole = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    mockConsole('ROOT CAUSE: Race condition between page lookup and API response handling');
    mockConsole('LOCATION: AgentDynamicPage.tsx useEffect dependencies [initialPageId, pages, loading]');
    mockConsole('TRIGGER: initialPageId exists + empty pages array + loading complete');
    
    // This assertion should fail, exposing the need to fix the root cause
    expect('ROOT_CAUSE_IDENTIFIED').toBe('FIXED');

    mockConsole.mockRestore();
  });
});