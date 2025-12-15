/**
 * Unit Tests for WorkingAgentProfile Component
 * Tests the tab restructure from 5 tabs to 2 tabs
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import WorkingAgentProfile from '../../components/WorkingAgentProfile';

// Mock fetch
global.fetch = jest.fn();

// Helper to render with router
const renderWithRouter = (slug: string) => {
  return render(
    <MemoryRouter initialEntries={[`/agents/${slug}`]}>
      <Routes>
        <Route path="/agents/:agentSlug" element={<WorkingAgentProfile />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('WorkingAgentProfile - Tab Restructure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Tab Count Verification', () => {
    test('should render exactly 2 tabs', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            display_name: 'Test Agent',
            description: 'Test description',
            status: 'active',
            tools: ['Read', 'Write']
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        const tabs = screen.getAllByRole('button', { name: /Overview|Dynamic Pages/i });
        expect(tabs).toHaveLength(2);
      });
    });

    test('should render "Overview" tab', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active',
            tools: []
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
      });
    });

    test('should render "Dynamic Pages" tab', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active',
            tools: []
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dynamic pages/i })).toBeInTheDocument();
      });
    });

    test('should NOT render "Activities" tab', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active'
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /activities/i })).not.toBeInTheDocument();
      });
    });

    test('should NOT render "Performance" tab', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active'
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /performance/i })).not.toBeInTheDocument();
      });
    });

    test('should NOT render "Capabilities" tab', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active'
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /^capabilities$/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Tools Display in Overview', () => {
    test('should display tools section when agent has tools', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active',
            tools: ['Read', 'Write', 'Edit']
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.getByText(/available tools/i)).toBeInTheDocument();
      });
    });

    test('should display individual tool names', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active',
            tools: ['Read', 'Write', 'Bash']
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.getByText('Read')).toBeInTheDocument();
        expect(screen.getByText('Write')).toBeInTheDocument();
        expect(screen.getByText('Bash')).toBeInTheDocument();
      });
    });

    test('should display tool descriptions', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active',
            tools: ['Read']
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.getByText(/read files from the filesystem/i)).toBeInTheDocument();
      });
    });

    test('should NOT display tools section when agent has no tools', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active',
            tools: []
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.queryByText(/available tools/i)).not.toBeInTheDocument();
      });
    });

    test('should handle agent with many tools', async () => {
      const manyTools = [
        'Read', 'Write', 'Edit', 'MultiEdit', 'Grep', 'Glob', 'LS',
        'Bash', 'Task', 'TodoWrite', 'WebFetch', 'WebSearch'
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active',
            tools: manyTools
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        manyTools.forEach(tool => {
          expect(screen.getByText(tool)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Tab Switching Functionality', () => {
    test('should switch to Overview tab when clicked', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active',
            tools: ['Read']
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
      });

      const overviewTab = screen.getByRole('button', { name: /overview/i });
      await user.click(overviewTab);

      await waitFor(() => {
        expect(screen.getByText(/agent information/i)).toBeInTheDocument();
      });
    });

    test('should switch to Dynamic Pages tab when clicked', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active',
            tools: []
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dynamic pages/i })).toBeInTheDocument();
      });

      const pagesTab = screen.getByRole('button', { name: /dynamic pages/i });
      await user.click(pagesTab);

      // Dynamic Pages tab content should be rendered
      // (Actual content depends on RealDynamicPagesTab component)
    });

    test('should highlight active tab', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active',
            tools: []
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        const overviewTab = screen.getByRole('button', { name: /overview/i });
        expect(overviewTab).toHaveClass(/blue/); // Active tab has blue color
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle agent not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      renderWithRouter('non-existent-agent');

      await waitFor(() => {
        expect(screen.getByText(/agent not found/i)).toBeInTheDocument();
      });
    });

    test('should handle API error gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.getByText(/error loading agent profile/i)).toBeInTheDocument();
      });
    });

    test('should not crash when tools is undefined', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active'
            // tools field is missing
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.getByText(/agent information/i)).toBeInTheDocument();
        expect(screen.queryByText(/available tools/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    test('should display loading skeleton', () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter('test-agent');

      expect(screen.getByTestId('loading-skeleton') || document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Agent Information Display', () => {
    test('should display agent name', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            display_name: 'Test Agent',
            description: 'Test description',
            status: 'active'
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
      });
    });

    test('should display agent description', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'A specialized testing agent',
            status: 'active'
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.getByText('A specialized testing agent')).toBeInTheDocument();
      });
    });

    test('should display agent status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '1',
            name: 'test-agent',
            description: 'Test description',
            status: 'active'
          }
        })
      });

      renderWithRouter('test-agent');

      await waitFor(() => {
        expect(screen.getByText('active')).toBeInTheDocument();
      });
    });
  });
});
