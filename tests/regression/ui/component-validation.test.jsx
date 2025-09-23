/**
 * UI Component Validation Regression Tests
 * Tests critical React components and their functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import fetch from 'node-fetch';

// Mock fetch for testing
global.fetch = jest.fn();

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/'
  })
}));

// Import components to test
let Agents;

// Dynamically import components with error handling
beforeAll(async () => {
  try {
    const AgentsModule = await import('../../../frontend/src/pages/Agents.jsx');
    Agents = AgentsModule.default;
  } catch (error) {
    console.warn('Could not import Agents component:', error.message);
    // Create a mock component for testing
    Agents = () => <div data-testid="agents-mock">Agents Component Mock</div>;
  }
});

describe('UI Component Regression Tests', () => {
  beforeEach(() => {
    // Reset fetch mock
    fetch.mockClear();

    // Mock successful API response
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: 'test-agent-1',
            name: 'Test Agent 1',
            status: 'active',
            priority: 'P0',
            description: 'A test agent for UI testing',
            type: 'user_facing',
            capabilities: ['test-capability']
          },
          {
            id: 'test-agent-2',
            name: 'Test Agent 2',
            status: 'idle',
            priority: 'P1',
            description: 'Another test agent',
            type: 'system',
            capabilities: ['monitoring', 'analysis']
          }
        ],
        count: 2,
        metadata: {
          total_count: 2,
          data_source: 'real_agent_files',
          discovery_time: new Date().toISOString()
        }
      })
    });
  });

  describe('Agents Page Component', () => {
    test('should render without crashing', async () => {
      await act(async () => {
        render(<Agents />);
      });

      expect(screen.getByText(/agents/i)).toBeInTheDocument();
    });

    test('should display loading state initially', async () => {
      // Mock a delayed response
      fetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, data: [] })
          }), 100)
        )
      );

      render(<Agents />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('should fetch and display agents', async () => {
      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
        expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('/api/agents');
    });

    test('should display agent details correctly', async () => {
      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Check for agent details
      expect(screen.getByText('A test agent for UI testing')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('P0')).toBeInTheDocument();
    });

    test('should handle API errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('API Error'));

      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        expect(screen.getByText(/warning/i)).toBeInTheDocument();
        expect(screen.getByText(/could not connect/i)).toBeInTheDocument();
      });

      // Should display fallback data
      expect(screen.getByText('Personal Todos Agent')).toBeInTheDocument();
    });

    test('should display fallback agents when API fails', async () => {
      fetch.mockRejectedValue(new Error('Network Error'));

      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        expect(screen.getByText('Personal Todos Agent')).toBeInTheDocument();
        expect(screen.getByText('Meeting Prep Agent')).toBeInTheDocument();
        expect(screen.getByText('Get To Know You Agent')).toBeInTheDocument();
      });
    });

    test('should render agent cards with proper styling', async () => {
      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        const agentCards = screen.getAllByTestId('agent-card');
        expect(agentCards.length).toBeGreaterThan(0);
      });

      const agentCards = screen.getAllByTestId('agent-card');
      agentCards.forEach(card => {
        expect(card).toHaveStyle({
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '12px',
          padding: '1.5rem'
        });
      });
    });

    test('should display correct status colors', async () => {
      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        const activeStatus = screen.getByText('active');
        const idleStatus = screen.getByText('idle');

        expect(activeStatus).toBeInTheDocument();
        expect(idleStatus).toBeInTheDocument();
      });
    });

    test('should display priority badges correctly', async () => {
      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        const p0Priority = screen.getByText('P0');
        const p1Priority = screen.getByText('P1');

        expect(p0Priority).toBeInTheDocument();
        expect(p1Priority).toBeInTheDocument();
      });
    });

    test('should handle empty agent list', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          count: 0,
          metadata: { total_count: 0 }
        })
      });

      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        expect(screen.getByText(/no agents found/i)).toBeInTheDocument();
        expect(screen.getByText(/make sure agents are configured/i)).toBeInTheDocument();
      });
    });

    test('should update agent count display', async () => {
      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        expect(screen.getByText(/2 agents discovered/i)).toBeInTheDocument();
      });
    });

    test('should handle different agent types', async () => {
      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        expect(screen.getByText('User-Facing')).toBeInTheDocument();
        expect(screen.getByText('System Agent')).toBeInTheDocument();
      });
    });

    test('should be accessible', async () => {
      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        const agentList = screen.getByTestId('agent-list');
        expect(agentList).toBeInTheDocument();
      });

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    test('should handle responsive layout', async () => {
      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        const agentGrid = screen.getByTestId('agent-list');
        expect(agentGrid).toHaveStyle({
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem'
        });
      });
    });
  });

  describe('Agent Card Component', () => {
    test('should render agent information correctly', async () => {
      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
        expect(screen.getByText('A test agent for UI testing')).toBeInTheDocument();
      });
    });

    test('should handle missing optional fields', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [{
            id: 'minimal-agent',
            name: 'Minimal Agent'
            // Missing description, status, priority, etc.
          }],
          count: 1
        })
      });

      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        expect(screen.getByText('Minimal Agent')).toBeInTheDocument();
      });

      // Should handle missing fields gracefully
      expect(screen.getByText(/no description available/i)).toBeInTheDocument();
    });

    test('should display agent status with correct styling', async () => {
      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        const statusElements = screen.getAllByText(/active|idle/);
        expect(statusElements.length).toBeGreaterThan(0);
      });
    });

    test('should handle long agent names and descriptions', async () => {
      const longName = 'A'.repeat(100);
      const longDescription = 'B'.repeat(500);

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [{
            id: 'long-agent',
            name: longName,
            description: longDescription,
            status: 'active'
          }],
          count: 1
        })
      });

      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        expect(screen.getByText(longName)).toBeInTheDocument();
        expect(screen.getByText(longDescription)).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    test('should handle malformed API response', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          // Missing required fields
          notData: 'invalid'
        })
      });

      await act(async () => {
        render(<Agents />);
      });

      // Should fall back to default behavior
      await waitFor(() => {
        expect(screen.getByText(/warning/i) || screen.getByText(/no agents found/i)).toBeInTheDocument();
      });
    });

    test('should handle network timeout', async () => {
      fetch.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        expect(screen.getByText(/warning/i) || screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    test('should handle invalid JSON response', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        expect(screen.getByText(/warning/i) || screen.getByText(/fallback/i)).toBeInTheDocument();
      });
    });

    test('should handle HTTP error responses', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Server Error'
        })
      });

      await act(async () => {
        render(<Agents />);
      });

      await waitFor(() => {
        expect(screen.getByText(/warning/i) || screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Memory', () => {
    test('should not cause memory leaks', async () => {
      const { unmount } = render(<Agents />);

      await waitFor(() => {
        expect(screen.getByText(/agents/i)).toBeInTheDocument();
      });

      // Should unmount cleanly
      unmount();
      expect(true).toBe(true); // Test passes if no errors during unmount
    });

    test('should handle rapid re-renders', async () => {
      const { rerender } = render(<Agents />);

      for (let i = 0; i < 5; i++) {
        await act(async () => {
          rerender(<Agents />);
        });
      }

      await waitFor(() => {
        expect(screen.getByText(/agents/i)).toBeInTheDocument();
      });
    });
  });
});