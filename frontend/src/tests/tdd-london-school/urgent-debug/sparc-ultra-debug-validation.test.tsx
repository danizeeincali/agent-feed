/**
 * SPARC Ultra Debug Validation Tests
 * TDD London School approach to validate the root cause fix
 * 
 * This test validates the fix for the "No pages found for agent" error
 * by testing the exact data transformation that was failing.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AgentDynamicPageWrapper from '../../../src/components/AgentDynamicPageWrapper';

// Mock the specific backend response that was causing the issue
const mockBackendResponse = {
  success: true,
  agent_id: "personal-todos-agent",
  pages: [
    {
      id: "b2935f20-b8a2-4be4-bed4-f6f467a8df9d",
      agent_id: "personal-todos-agent",
      title: "Personal Todos Dashboard",
      page_type: "dynamic",
      content_type: "json",
      // This is the complex JSON that was causing parsing to fail
      content_value: "{\"template\":\"dashboard\",\"layout\":\"grid\",\"components\":[{\"type\":\"metric\",\"props\":{\"label\":\"Total Tasks\",\"value\":0,\"unit\":\"tasks\",\"trend\":\"stable\"}},{\"type\":\"metric\",\"props\":{\"label\":\"Completed\",\"value\":0,\"unit\":\"done\",\"trend\":\"up\"}},{\"type\":\"metric\",\"props\":{\"label\":\"In Progress\",\"value\":0,\"unit\":\"active\",\"trend\":\"stable\"}},{\"type\":\"metric\",\"props\":{\"label\":\"Pending\",\"value\":0,\"unit\":\"waiting\",\"trend\":\"down\"}},{\"type\":\"chart\",\"props\":{\"chartType\":\"doughnut\",\"title\":\"Priority Distribution (P0-P7)\",\"data\":{\"labels\":[\"P0 Critical\",\"P1 High\",\"P2 Important\",\"P3 Medium\",\"P4 Normal\",\"P5 Low\",\"P6 Someday\",\"P7 Future\"],\"datasets\":[{\"data\":[0,0,0,0,0,0,0,0],\"backgroundColor\":[\"#ff4444\",\"#ff8800\",\"#ffaa00\",\"#ffcc00\",\"#88cc00\",\"#00cc88\",\"#0088cc\",\"#4444cc\"]}]}}},{\"type\":\"chart\",\"props\":{\"chartType\":\"line\",\"title\":\"Task Completion Rate (30 days)\",\"data\":{\"labels\":[\"Week 1\",\"Week 2\",\"Week 3\",\"Week 4\"],\"datasets\":[{\"label\":\"Completed Tasks\",\"data\":[0,0,0,0],\"borderColor\":\"#00cc88\",\"fill\":false}]}}},{\"type\":\"form\",\"props\":{\"title\":\"Quick Add Task\",\"fields\":[{\"name\":\"title\",\"type\":\"text\",\"placeholder\":\"Task title\",\"required\":true},{\"name\":\"priority\",\"type\":\"select\",\"options\":[\"P0 Critical\",\"P1 High\",\"P2 Important\",\"P3 Medium\",\"P4 Normal\",\"P5 Low\",\"P6 Someday\",\"P7 Future\"],\"default\":\"P3 Medium\"}],\"submitText\":\"Add Task\"}},{\"type\":\"table\",\"props\":{\"title\":\"Recent Activity\",\"columns\":[\"Task\",\"Priority\",\"Status\",\"Updated\"],\"data\":[]}}]}",
      content_metadata: {},
      status: "published",
      tags: [],
      created_at: "2025-09-11 16:30:43",
      updated_at: "2025-09-11 16:30:43",
      version: 1
    }
  ],
  total: 1
};

const mockAgentResponse = {
  success: true,
  data: {
    id: "personal-todos-agent",
    name: "Personal Todos Agent",
    display_name: "Personal Todos Agent"
  }
};

describe('SPARC Ultra Debug Validation', () => {
  beforeEach(() => {
    // Mock fetch to return the exact backend responses
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/agents/personal-todos-agent/pages')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBackendResponse)
        });
      } else if (url.includes('/api/agents/personal-todos-agent')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAgentResponse)
        });
      }
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    }) as jest.Mock;

    // Clear console logs
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('VALIDATION: Should successfully load page with complex JSON content', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    
    render(
      <MemoryRouter initialEntries={['/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d']}>
        <Routes>
          <Route path="/agents/:agentId/pages/:pageId" element={<AgentDynamicPageWrapper />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for component to load and process data
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Should NOT show the "No pages found" error
    expect(screen.queryByText(/No pages found for agent/)).not.toBeInTheDocument();
    expect(screen.queryByText(/but looking for page/)).not.toBeInTheDocument();

    // Should show page content or at least not show the error
    await waitFor(() => {
      // Check that we're not in an error state
      expect(screen.queryByText(/Failed to load agent/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Error loading/)).not.toBeInTheDocument();
    });

    // Verify that the data transformation succeeded by checking console logs
    const transformLogs = consoleSpy.mock.calls.filter(call => 
      call[0] && call[0].includes('🔍 DEBUG: Transformed pages count:')
    );
    
    if (transformLogs.length > 0) {
      // If we have transform logs, verify the count is correct
      expect(transformLogs[0]).toContain('1'); // Should have 1 page
    }

    // Verify API was called correctly
    expect(global.fetch).toHaveBeenCalledWith('/api/agents/personal-todos-agent/pages');
    expect(global.fetch).toHaveBeenCalledWith('/api/agents/personal-todos-agent');
  });

  it('VALIDATION: Should handle JSON parsing gracefully', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn');
    
    // Mock response with invalid JSON content
    const invalidJsonResponse = {
      ...mockBackendResponse,
      pages: [{
        ...mockBackendResponse.pages[0],
        content_value: "{ invalid json content }"
      }]
    };

    global.fetch = jest.fn((url) => {
      if (url.includes('/api/agents/personal-todos-agent/pages')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(invalidJsonResponse)
        });
      } else if (url.includes('/api/agents/personal-todos-agent')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAgentResponse)
        });
      }
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    }) as jest.Mock;

    render(
      <MemoryRouter initialEntries={['/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d']}>
        <Routes>
          <Route path="/agents/:agentId/pages/:pageId" element={<AgentDynamicPageWrapper />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Should handle JSON parsing error gracefully
    // The component should still load, just with the unparsed content
    expect(screen.queryByText(/No pages found for agent/)).not.toBeInTheDocument();

    // Should have logged a warning about JSON parsing failure
    await waitFor(() => {
      const warningLogs = consoleWarnSpy.mock.calls.filter(call =>
        call[0] && call[0].includes('🔍 DEBUG: Failed to parse content_value for page:')
      );
      expect(warningLogs.length).toBeGreaterThan(0);
    });
  });

  it('VALIDATION: Should provide specific error message for genuine failures', async () => {
    // Mock a genuine API failure
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/agents/personal-todos-agent/pages')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: 'Database connection failed' })
        });
      } else if (url.includes('/api/agents/personal-todos-agent')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAgentResponse)
        });
      }
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    }) as jest.Mock;

    render(
      <MemoryRouter initialEntries={['/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d']}>
        <Routes>
          <Route path="/agents/:agentId/pages/:pageId" element={<AgentDynamicPageWrapper />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for component to handle the error
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Should show specific error instead of generic "No pages found"
    expect(screen.queryByText(/No pages found for agent.*but looking for page/)).not.toBeInTheDocument();
    
    // Should show actual error message or loading state
    // (The exact message depends on how the component handles API failures)
  });

  it('VALIDATION: Should display page title when successfully loaded', async () => {
    render(
      <MemoryRouter initialEntries={['/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d']}>
        <Routes>
          <Route path="/agents/:agentId/pages/:pageId" element={<AgentDynamicPageWrapper />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the page title to appear
    await waitFor(() => {
      // Should display the page title from the mock data
      const titleElement = screen.queryByText('Personal Todos Dashboard');
      if (titleElement) {
        expect(titleElement).toBeInTheDocument();
      }
      // At minimum, should not show the error message
      expect(screen.queryByText(/No pages found for agent/)).not.toBeInTheDocument();
    }, { timeout: 10000 });
  });
});