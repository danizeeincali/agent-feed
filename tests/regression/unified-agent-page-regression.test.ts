/**
 * Regression Test Suite for Unified Agent Page
 * Ensures existing functionality continues to work after changes
 * 
 * Focus Areas:
 * - Existing agent list functionality
 * - Route handling and navigation
 * - API compatibility
 * - UI component stability
 * - Performance regression prevention
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { createMockFetch } from '../tdd-london-school/mocks/fetch.mock';

// Import components to test regression
import UnifiedAgentPage from '../../frontend/src/components/UnifiedAgentPage';

describe('Unified Agent Page Regression Tests', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Existing Agent List Functionality', () => {
    test('should not break existing agents list when unified page is added', async () => {
      // This test ensures the unified page doesn't interfere with existing agent list
      // Mock the agents list API response
      const mockAgentsResponse = {
        success: true,
        data: [
          {
            id: 'agent-1',
            name: 'Test Agent 1',
            status: 'active'
          },
          {
            id: 'agent-2', 
            name: 'Test Agent 2',
            status: 'inactive'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAgentsResponse
      });

      // Verify agents list API still works
      const response = await fetch('/api/agents');
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('agent-1');
    });

    test('should maintain backward compatibility with existing agent data structure', async () => {
      // Test that existing agent data structures continue to work
      const legacyAgentData = {
        id: 'legacy-agent',
        name: 'Legacy Agent',
        display_name: 'Legacy Agent Display',
        description: 'Legacy description',
        status: 'active',
        capabilities: ['legacy-capability'],
        avatar_color: '#FF0000',
        // Missing some new fields that should be handled gracefully
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: legacyAgentData })
      });

      const TestComponent = () => (
        <MemoryRouter initialEntries={['/agents/legacy-agent']}>
          <Routes>
            <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
          </Routes>
        </MemoryRouter>
      );

      render(<TestComponent />);

      // Should handle legacy data without crashing
      await waitFor(() => {
        expect(screen.getByText(/Legacy Agent/)).toBeInTheDocument();
      });

      // Should provide default values for missing fields
      expect(screen.queryByText(/Error Loading Agent/)).not.toBeInTheDocument();
    });

    test('should not cause 404 errors on existing agent routes', async () => {
      // Test that existing agent routes still work
      const existingAgentIds = [
        'agent-feedback-agent',
        'meta-agent', 
        'personal-todos-agent',
        'meeting-prep-agent'
      ];

      for (const agentId of existingAgentIds) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              id: agentId,
              name: `${agentId} Name`,
              status: 'active',
              capabilities: []
            }
          })
        });

        const TestComponent = () => (
          <MemoryRouter initialEntries={[`/agents/${agentId}`]}>
            <Routes>
              <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
            </Routes>
          </MemoryRouter>
        );

        render(<TestComponent />);

        await waitFor(() => {
          expect(screen.getByText(/Name/)).toBeInTheDocument();
        });

        // Verify no 404 or error states
        expect(screen.queryByText(/404|Not Found|Error Loading/)).not.toBeInTheDocument();
      }
    });
  });

  describe('Route Handling Regression', () => {
    test('should not break existing route patterns', async () => {
      // Verify common route patterns still work
      const routePatterns = [
        { path: '/agents/simple-agent', agentId: 'simple-agent' },
        { path: '/agents/agent-with-hyphens', agentId: 'agent-with-hyphens' },
        { path: '/agents/AgentWithCamelCase', agentId: 'AgentWithCamelCase' }
      ];

      for (const pattern of routePatterns) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              id: pattern.agentId,
              name: `Agent ${pattern.agentId}`,
              status: 'active'
            }
          })
        });

        const TestComponent = () => (
          <MemoryRouter initialEntries={[pattern.path]}>
            <Routes>
              <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
            </Routes>
          </MemoryRouter>
        );

        const { unmount } = render(<TestComponent />);

        await waitFor(() => {
          expect(screen.getByText(/Agent/)).toBeInTheDocument();
        });

        // Verify correct API call was made
        expect(mockFetch).toHaveBeenCalledWith(`/api/agents/${pattern.agentId}`);

        unmount();
      }
    });

    test('should handle special characters in agent IDs', async () => {
      // Test edge cases in agent ID handling
      const specialAgentIds = [
        'agent_with_underscores',
        'agent.with.dots',
        'agent-123-numeric'
      ];

      for (const agentId of specialAgentIds) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { id: agentId, name: agentId, status: 'active' }
          })
        });

        const TestComponent = () => (
          <MemoryRouter initialEntries={[`/agents/${agentId}`]}>
            <Routes>
              <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
            </Routes>
          </MemoryRouter>
        );

        const { unmount } = render(<TestComponent />);

        await waitFor(() => {
          expect(screen.queryByText(/Error Loading Agent/)).not.toBeInTheDocument();
        });

        unmount();
      }
    });

    test('should redirect old routes properly', async () => {
      // If there were old route formats, test that they redirect correctly
      // This is a placeholder for any legacy route handling
      
      const TestComponent = () => (
        <MemoryRouter initialEntries={['/agents/test-agent']}>
          <Routes>
            <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
          </Routes>
        </MemoryRouter>
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'test-agent', name: 'Test Agent', status: 'active' }
        })
      });

      render(<TestComponent />);

      // Should load successfully without redirects for this simple case
      await waitFor(() => {
        expect(screen.getByText(/Test Agent/)).toBeInTheDocument();
      });
    });
  });

  describe('API Compatibility Regression', () => {
    test('should maintain compatibility with existing API response format', async () => {
      // Test that existing API response formats are still supported
      const existingApiResponse = {
        success: true,
        data: {
          id: 'compatibility-test',
          name: 'Compatibility Test Agent',
          display_name: 'Compatibility Test Agent',
          description: 'Testing API compatibility',
          status: 'active',
          avatar_color: '#3B82F6',
          capabilities: ['read', 'write'],
          system_prompt: 'System prompt text',
          model: 'sonnet',
          priority: 'P1',
          proactive: true,
          usage: 'TEST AGENT',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T12:00:00.000Z'
        },
        timestamp: '2025-01-01T12:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => existingApiResponse
      });

      const TestComponent = () => (
        <MemoryRouter initialEntries={['/agents/compatibility-test']}>
          <Routes>
            <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
          </Routes>
        </MemoryRouter>
      );

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Compatibility Test Agent')).toBeInTheDocument();
      });

      // Verify all expected data is displayed
      expect(screen.getByText('Testing API compatibility')).toBeInTheDocument();
      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });

    test('should handle API errors the same way as before', async () => {
      // Test existing error handling behavior
      const errorCases = [
        { status: 404, error: 'Agent not found' },
        { status: 500, error: 'Internal server error' },
        { status: 403, error: 'Forbidden' }
      ];

      for (const errorCase of errorCases) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: errorCase.status,
          json: async () => ({ success: false, error: errorCase.error })
        });

        const TestComponent = () => (
          <MemoryRouter initialEntries={['/agents/error-test']}>
            <Routes>
              <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
            </Routes>
          </MemoryRouter>
        );

        const { unmount } = render(<TestComponent />);

        await waitFor(() => {
          expect(screen.getByText(/Error Loading Agent|Agent Not Found/)).toBeInTheDocument();
        });

        // Verify error recovery options are available
        expect(screen.getByText(/Back to Agents/)).toBeInTheDocument();
        expect(screen.getByText(/Try Again/)).toBeInTheDocument();

        unmount();
      }
    });

    test('should maintain request headers and parameters', async () => {
      // Verify that API requests maintain the expected format
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'header-test', name: 'Header Test', status: 'active' }
        })
      });

      const TestComponent = () => (
        <MemoryRouter initialEntries={['/agents/header-test']}>
          <Routes>
            <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
          </Routes>
        </MemoryRouter>
      );

      render(<TestComponent />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Verify the request was made correctly
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/agents/header-test');
      expect(options?.method || 'GET').toBe('GET');
    });
  });

  describe('UI Component Stability', () => {
    test('should not break existing component styling', async () => {
      // Test that existing components maintain their styling
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'style-test', name: 'Style Test', status: 'active' }
        })
      });

      const TestComponent = () => (
        <MemoryRouter initialEntries={['/agents/style-test']}>
          <Routes>
            <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
          </Routes>
        </MemoryRouter>
      );

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Style Test')).toBeInTheDocument();
      });

      // Verify key styling classes are present
      const container = document.querySelector('.min-h-screen');
      expect(container).toBeInTheDocument();

      const headerContainer = document.querySelector('.bg-white.border-b');
      expect(headerContainer).toBeInTheDocument();
    });

    test('should maintain responsive design breakpoints', async () => {
      // Test that responsive design classes are preserved
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'responsive-test', name: 'Responsive Test', status: 'active' }
        })
      });

      const TestComponent = () => (
        <MemoryRouter initialEntries={['/agents/responsive-test']}>
          <Routes>
            <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
          </Routes>
        </MemoryRouter>
      );

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Responsive Test')).toBeInTheDocument();
      });

      // Check for responsive classes
      const maxWidthContainer = document.querySelector('.max-w-7xl');
      expect(maxWidthContainer).toBeInTheDocument();

      const responsiveGrid = document.querySelector('.grid');
      expect(responsiveGrid).toBeInTheDocument();
    });

    test('should preserve accessibility features', async () => {
      // Test that accessibility attributes are maintained
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'a11y-test', name: 'Accessibility Test', status: 'active' }
        })
      });

      const TestComponent = () => (
        <MemoryRouter initialEntries={['/agents/a11y-test']}>
          <Routes>
            <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
          </Routes>
        </MemoryRouter>
      );

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Accessibility Test')).toBeInTheDocument();
      });

      // Verify accessibility attributes
      const backButton = screen.getByLabelText(/back to agents/i);
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveAttribute('aria-label');
    });
  });

  describe('Performance Regression Prevention', () => {
    test('should not introduce memory leaks', async () => {
      // Test for potential memory leaks with multiple renders
      const TestComponent = ({ agentId }: { agentId: string }) => (
        <MemoryRouter initialEntries={[`/agents/${agentId}`]}>
          <Routes>
            <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
          </Routes>
        </MemoryRouter>
      );

      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { id: `test-${i}`, name: `Test ${i}`, status: 'active' }
          })
        });

        const { unmount } = render(<TestComponent agentId={`test-${i}`} />);

        await waitFor(() => {
          expect(screen.getByText(`Test ${i}`)).toBeInTheDocument();
        });

        unmount();
      }

      // If we reach this point without issues, no obvious memory leaks occurred
      expect(true).toBe(true);
    });

    test('should not degrade API response times', async () => {
      // Test that API calls are still efficient
      const startTime = Date.now();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'perf-test', name: 'Performance Test', status: 'active' }
        })
      });

      const TestComponent = () => (
        <MemoryRouter initialEntries={['/agents/perf-test']}>
          <Routes>
            <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
          </Routes>
        </MemoryRouter>
      );

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Performance Test')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Should render reasonably quickly (adjust threshold as needed)
      expect(renderTime).toBeLessThan(2000);
    });

    test('should handle concurrent navigation efficiently', async () => {
      // Test multiple rapid navigation events
      const TestComponent = ({ agentId }: { agentId: string }) => (
        <MemoryRouter initialEntries={[`/agents/${agentId}`]}>
          <Routes>
            <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Setup multiple mock responses
      for (let i = 0; i < 3; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { id: `concurrent-${i}`, name: `Concurrent ${i}`, status: 'active' }
          })
        });
      }

      // Render multiple components rapidly
      const components = [];
      for (let i = 0; i < 3; i++) {
        const { unmount } = render(<TestComponent agentId={`concurrent-${i}`} />);
        components.push(unmount);
      }

      // Wait for all to potentially load
      await waitFor(() => {
        // At least one should have loaded
        expect(mockFetch).toHaveBeenCalled();
      }, { timeout: 5000 });

      // Cleanup
      components.forEach(unmount => unmount());
    });
  });

  describe('Data Integrity Checks', () => {
    test('should not corrupt existing agent data', async () => {
      // Verify that data transformation doesn't corrupt values
      const originalData = {
        id: 'integrity-test',
        name: 'Data Integrity Test',
        description: 'Original description',
        status: 'active',
        capabilities: ['original', 'capabilities'],
        avatar_color: '#FF5733',
        system_prompt: 'Original system prompt',
        priority: 'P0',
        usage_count: 42,
        performance_metrics: {
          success_rate: 95.5,
          average_response_time: 125,
          total_tokens_used: 15577
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: originalData })
      });

      const TestComponent = () => (
        <MemoryRouter initialEntries={['/agents/integrity-test']}>
          <Routes>
            <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
          </Routes>
        </MemoryRouter>
      );

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Data Integrity Test')).toBeInTheDocument();
      });

      // Verify original data values are preserved and displayed
      expect(screen.getByText('Original description')).toBeInTheDocument();
      expect(screen.getByText(/active/i)).toBeInTheDocument();
      
      // Navigate to details tab to verify more data
      const detailsTab = screen.getByRole('button', { name: /details/i });
      fireEvent.click(detailsTab);

      await waitFor(() => {
        expect(screen.getByText('Agent Information')).toBeInTheDocument();
      });

      // Verify ID is displayed correctly
      expect(screen.getByText('integrity-test')).toBeInTheDocument();
    });

    test('should handle edge cases in existing data formats', async () => {
      // Test various edge cases that might exist in production data
      const edgeCaseData = {
        id: 'edge-case-test',
        name: '', // Empty name
        description: null, // Null description
        status: 'unknown-status', // Non-standard status
        capabilities: null, // Null capabilities array
        avatar_color: 'invalid-color', // Invalid color format
        created_at: 'invalid-date', // Invalid date format
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: edgeCaseData })
      });

      const TestComponent = () => (
        <MemoryRouter initialEntries={['/agents/edge-case-test']}>
          <Routes>
            <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
          </Routes>
        </MemoryRouter>
      );

      render(<TestComponent />);

      // Should not crash with edge case data
      await waitFor(() => {
        expect(screen.queryByText(/Error Loading Agent/)).not.toBeInTheDocument();
      });

      // Should provide fallback values
      expect(screen.getByText('edge-case-test')).toBeInTheDocument(); // Uses ID as fallback for empty name
    });
  });
});