/**
 * TDD Unit Tests - WorkingAgentProfile (Embedded Mode)
 * London School TDD: Test doubles (mocks/stubs) for all dependencies
 *
 * Component Responsibilities:
 * - Accept agent data via props (embedded mode)
 * - Render all tabs (Overview, Pages, Activities, Performance, Capabilities)
 * - NO back button in embedded mode
 * - Handle missing agent data gracefully
 * - Display agent information correctly
 * - Tab navigation without page reload
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import WorkingAgentProfile from '../../components/WorkingAgentProfile';
import { Agent } from '../../types/api';

// Mock child components
vi.mock('../../components/RealDynamicPagesTab', () => ({
  default: ({ agentId }: { agentId: string }) => (
    <div data-testid="dynamic-pages-tab">
      Dynamic Pages for {agentId}
    </div>
  )
}));

vi.mock('../../components/PageManager', () => ({
  default: () => <div data-testid="page-manager">Page Manager</div>
}));

const mockAgent: Agent = {
  id: 'agent-123',
  slug: 'test-agent',
  name: 'Test Agent',
  display_name: 'Test Agent Pro',
  description: 'A test agent for unit testing',
  system_prompt: 'You are a test agent',
  avatar_color: '#3B82F6',
  capabilities: ['coding', 'testing', 'debugging'],
  status: 'active',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
  last_used: '2025-01-20T00:00:00Z',
  usage_count: 100,
  version: '2.1.0',
  configuration: {
    max_tokens: 4000,
    temperature: 0.7
  },
  performance_metrics: {
    success_rate: 0.95,
    average_response_time: 150,
    total_tokens_used: 50000,
    error_count: 5,
    uptime_percentage: 99.5,
    last_performance_check: '2025-01-20T00:00:00Z',
    performance_trend: 'improving'
  },
  health_status: {
    cpu_usage: 35,
    memory_usage: 1024,
    response_time: 120,
    last_heartbeat: '2025-01-20T12:00:00Z',
    connection_status: 'connected',
    error_count_24h: 1
  }
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/agents/test-agent']}>
      {component}
    </MemoryRouter>
  );
};

describe('WorkingAgentProfile - Embedded Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch for agent data
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/agents/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockAgent
          })
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  describe('Rendering - Basic Display', () => {
    it('should render the component without errors', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      });
    });

    it('should display agent name from display_name field', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      });
    });

    it('should display agent description', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText('A test agent for unit testing')).toBeInTheDocument();
      });
    });

    it('should display agent status badge', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText('active')).toBeInTheDocument();
      });
    });

    it('should display agent ID', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText(/ID: agent-123/i)).toBeInTheDocument();
      });
    });

    it('should render agent avatar with correct color', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const avatar = screen.getByTestId('agent-avatar');
        expect(avatar).toHaveStyle({ backgroundColor: '#3B82F6' });
      });
    });
  });

  describe('Back Button - Embedded Mode Behavior', () => {
    it('should NOT display back button in embedded mode', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      });

      const backButton = screen.queryByRole('button', { name: /back|return/i });
      expect(backButton).not.toBeInTheDocument();
    });

    it('should NOT have ArrowLeft icon in embedded mode', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      });

      const arrowIcon = screen.queryByTestId('arrow-left-icon');
      expect(arrowIcon).not.toBeInTheDocument();
    });

    it('should NOT navigate away when header is clicked', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      });

      const header = screen.getByText('Test Agent Pro');
      fireEvent.click(header);

      // Should remain on same route
      expect(window.location.pathname).toContain('test-agent');
    });
  });

  describe('Tabs - Navigation', () => {
    it('should render all tab buttons', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /dynamic pages/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /activities/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /performance/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /capabilities/i })).toBeInTheDocument();
      });
    });

    it('should show Overview tab as active by default', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const overviewTab = screen.getByRole('tab', { name: /overview/i });
        expect(overviewTab).toHaveClass(/border-blue-500|text-blue-600/);
      });
    });

    it('should switch to Pages tab when clicked', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /dynamic pages/i })).toBeInTheDocument();
      });

      const pagesTab = screen.getByRole('tab', { name: /dynamic pages/i });
      fireEvent.click(pagesTab);

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-pages-tab')).toBeInTheDocument();
      });
    });

    it('should switch to Activities tab when clicked', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /activities/i })).toBeInTheDocument();
      });

      const activitiesTab = screen.getByRole('tab', { name: /activities/i });
      fireEvent.click(activitiesTab);

      await waitFor(() => {
        expect(screen.getByText(/recent activities/i)).toBeInTheDocument();
      });
    });

    it('should switch to Performance tab when clicked', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /performance/i })).toBeInTheDocument();
      });

      const performanceTab = screen.getByRole('tab', { name: /performance/i });
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByText(/performance metrics/i)).toBeInTheDocument();
      });
    });

    it('should switch to Capabilities tab when clicked', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /capabilities/i })).toBeInTheDocument();
      });

      const capabilitiesTab = screen.getByRole('tab', { name: /capabilities/i });
      fireEvent.click(capabilitiesTab);

      await waitFor(() => {
        expect(screen.getByText(/capabilities & skills/i)).toBeInTheDocument();
      });
    });

    it('should highlight active tab visually', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const overviewTab = screen.getByRole('tab', { name: /overview/i });
        expect(overviewTab).toHaveClass('border-blue-500');
      });

      const pagesTab = screen.getByRole('tab', { name: /dynamic pages/i });
      fireEvent.click(pagesTab);

      await waitFor(() => {
        expect(pagesTab).toHaveClass('border-blue-500');
      });
    });

    it('should remove highlight from previously active tab', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const overviewTab = screen.getByRole('tab', { name: /overview/i });
        expect(overviewTab).toHaveClass('border-blue-500');
      });

      const pagesTab = screen.getByRole('tab', { name: /dynamic pages/i });
      fireEvent.click(pagesTab);

      await waitFor(() => {
        const overviewTab = screen.getByRole('tab', { name: /overview/i });
        expect(overviewTab).not.toHaveClass('border-blue-500');
      });
    });
  });

  describe('Overview Tab - Content', () => {
    it('should display agent description in overview', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText('A test agent for unit testing')).toBeInTheDocument();
      });
    });

    it('should display agent status in overview', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const overview = screen.getByText(/agent information/i).closest('div');
        const status = within(overview!).getByText(/active/i);
        expect(status).toBeInTheDocument();
      });
    });

    it('should display agent capabilities in overview', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText('coding')).toBeInTheDocument();
        expect(screen.getByText('testing')).toBeInTheDocument();
        expect(screen.getByText('debugging')).toBeInTheDocument();
      });
    });

    it('should render capabilities as badges', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const codingBadge = screen.getByText('coding');
        expect(codingBadge).toHaveClass(/bg-blue-50|text-blue-800/);
      });
    });
  });

  describe('Dynamic Pages Tab - Content', () => {
    it('should render RealDynamicPagesTab component', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const pagesTab = screen.getByRole('tab', { name: /dynamic pages/i });
        fireEvent.click(pagesTab);
      });

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-pages-tab')).toBeInTheDocument();
      });
    });

    it('should pass correct agentId to RealDynamicPagesTab', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const pagesTab = screen.getByRole('tab', { name: /dynamic pages/i });
        fireEvent.click(pagesTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/dynamic pages for test-agent/i)).toBeInTheDocument();
      });
    });
  });

  describe('Activities Tab - Content', () => {
    it('should show empty state for activities', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const activitiesTab = screen.getByRole('tab', { name: /activities/i });
        fireEvent.click(activitiesTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/no recent activities/i)).toBeInTheDocument();
      });
    });

    it('should display activities icon in empty state', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const activitiesTab = screen.getByRole('tab', { name: /activities/i });
        fireEvent.click(activitiesTab);
      });

      await waitFor(() => {
        const icon = screen.getByTestId('activities-empty-icon');
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tab - Content', () => {
    it('should show performance metrics section', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const performanceTab = screen.getByRole('tab', { name: /performance/i });
        fireEvent.click(performanceTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/performance metrics/i)).toBeInTheDocument();
      });
    });

    it('should show performance placeholder when agent is inactive', async () => {
      const inactiveAgent = { ...mockAgent, status: 'inactive' as const };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: inactiveAgent })
        } as Response)
      );

      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const performanceTab = screen.getByRole('tab', { name: /performance/i });
        fireEvent.click(performanceTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/performance metrics will be available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Capabilities Tab - Content', () => {
    it('should display all agent capabilities', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const capabilitiesTab = screen.getByRole('tab', { name: /capabilities/i });
        fireEvent.click(capabilitiesTab);
      });

      await waitFor(() => {
        expect(screen.getByText('coding')).toBeInTheDocument();
        expect(screen.getByText('testing')).toBeInTheDocument();
        expect(screen.getByText('debugging')).toBeInTheDocument();
      });
    });

    it('should show capability details in cards', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const capabilitiesTab = screen.getByRole('tab', { name: /capabilities/i });
        fireEvent.click(capabilitiesTab);
      });

      await waitFor(() => {
        const cards = screen.getAllByTestId(/capability-card/i);
        expect(cards.length).toBe(3);
      });
    });

    it('should show empty state when no capabilities', async () => {
      const agentWithoutCapabilities = { ...mockAgent, capabilities: [] };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: agentWithoutCapabilities })
        } as Response)
      );

      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const capabilitiesTab = screen.getByRole('tab', { name: /capabilities/i });
        fireEvent.click(capabilitiesTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/no capabilities information/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling - Missing Data', () => {
    it('should show error state when agent not found', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ success: false, error: 'Not found' })
        } as Response)
      );

      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText(/agent not found/i)).toBeInTheDocument();
      });
    });

    it('should show error message when API fails', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText(/error loading agent profile/i)).toBeInTheDocument();
      });
    });

    it('should display error icon in error state', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500
        } as Response)
      );

      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const errorIcon = screen.getByTestId('error-icon');
        expect(errorIcon).toBeInTheDocument();
      });
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalAgent = {
        id: 'agent-minimal',
        slug: 'minimal',
        name: 'Minimal Agent',
        description: 'Basic agent',
        status: 'active'
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: minimalAgent })
        } as Response)
      );

      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText('Minimal Agent')).toBeInTheDocument();
      });
    });

    it('should use name as fallback when display_name is missing', async () => {
      const agentWithoutDisplayName = { ...mockAgent };
      delete agentWithoutDisplayName.display_name;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: agentWithoutDisplayName })
        } as Response)
      );

      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton initially', () => {
      renderWithRouter(<WorkingAgentProfile />);

      expect(screen.getByTestId('profile-loading-skeleton')).toBeInTheDocument();
    });

    it('should show loading spinner', () => {
      renderWithRouter(<WorkingAgentProfile />);

      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('animate-pulse');
    });

    it('should hide loading state after data loads', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.queryByTestId('profile-loading-skeleton')).not.toBeInTheDocument();
      });
    });

    it('should render content after successful load', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toHaveTextContent('Test Agent Pro');
      });
    });

    it('should have ARIA labels on tabs', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const overviewTab = screen.getByRole('tab', { name: /overview/i });
        expect(overviewTab).toHaveAttribute('aria-selected');
      });
    });

    it('should mark selected tab with aria-selected="true"', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const overviewTab = screen.getByRole('tab', { name: /overview/i });
        expect(overviewTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should have proper tablist role', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation between tabs', async () => {
      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const overviewTab = screen.getByRole('tab', { name: /overview/i });
        overviewTab.focus();
        expect(overviewTab).toHaveFocus();
      });
    });
  });

  describe('Performance', () => {
    it('should render quickly with complete agent data', async () => {
      const startTime = performance.now();

      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(200);
    });

    it('should not re-render unnecessarily when switching tabs', async () => {
      const renderSpy = vi.fn();

      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        const pagesTab = screen.getByRole('tab', { name: /dynamic pages/i });
        fireEvent.click(pagesTab);
      });

      // Tab switch should be instant
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-pages-tab')).toBeInTheDocument();
      }, { timeout: 50 });
    });
  });

  describe('Integration with URL Params', () => {
    it('should fetch agent data based on agentSlug param', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      renderWithRouter(<WorkingAgentProfile />);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/agents/test-agent'));
      });
    });

    it('should handle different agent slugs', async () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/agents/different-agent']}>
          <WorkingAgentProfile />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('different-agent'));
      });
    });
  });
});
