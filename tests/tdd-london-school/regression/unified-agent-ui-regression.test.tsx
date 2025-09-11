/**
 * TDD London School: UnifiedAgentPage UI Regression Tests
 * 
 * Ensures existing UI elements and functionality remain intact
 * after implementing real data integration.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock router
const mockNavigate = jest.fn();
const mockParams = { agentId: 'meta-agent' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>
}));

import UnifiedAgentPage from '../../../frontend/src/components/UnifiedAgentPage';

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('UnifiedAgentPage UI Regression Tests (London School TDD)', () => {
  const mockApiResponse = {
    success: true,
    data: {
      id: 'meta-agent',
      name: 'meta-agent',
      display_name: 'Meta Agent',
      description: 'Agent creation specialist',
      status: 'active',
      avatar_color: '#374151',
      capabilities: ['bash', 'read', 'write'],
      performance_metrics: {
        success_rate: 93.59,
        average_response_time: 214,
        total_tokens_used: 54327,
        error_count: 3,
        validations_completed: 186,
        uptime_percentage: 95.13
      },
      health_status: {
        cpu_usage: 61.97,
        memory_usage: 80.65,
        response_time: 474,
        last_heartbeat: '2025-09-10T18:26:49.085Z',
        status: 'healthy',
        active_tasks: 0
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockApiResponse)
    });
  });

  describe('Header and Navigation Elements', () => {
    it('should render header with back button and agent info', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      // Header elements should be present
      expect(screen.getByLabelText('Back to agents')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('should navigate back when back button is clicked', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Back to agents'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/agents');
    });

    it('should display agent status badge correctly', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('active')).toBeInTheDocument();
      });

      // Status badge should have proper styling
      const statusBadge = screen.getByText('active').closest('span');
      expect(statusBadge).toHaveClass('inline-flex', 'items-center');
    });
  });

  describe('Tab Navigation Functionality', () => {
    it('should render all navigation tabs', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      // All tabs should be present
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    it('should switch between tabs correctly', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      // Default should be Overview tab
      expect(screen.getByText('Overview').closest('button')).toHaveClass('text-blue-600');

      // Click Details tab
      fireEvent.click(screen.getByText('Details'));
      expect(screen.getByText('Details').closest('button')).toHaveClass('text-blue-600');

      // Click Activity tab
      fireEvent.click(screen.getByText('Activity'));
      expect(screen.getByText('Activity').closest('button')).toHaveClass('text-blue-600');

      // Click Configuration tab
      fireEvent.click(screen.getByText('Configuration'));
      expect(screen.getByText('Configuration').closest('button')).toHaveClass('text-blue-600');
    });

    it('should display appropriate content for each tab', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      // Overview tab content
      expect(screen.getByText('Agent creation specialist')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();

      // Details tab content
      fireEvent.click(screen.getByText('Details'));
      await waitFor(() => {
        expect(screen.getByText('Agent Information')).toBeInTheDocument();
        expect(screen.getByText('Capabilities')).toBeInTheDocument();
      });

      // Activity tab content
      fireEvent.click(screen.getByText('Activity'));
      await waitFor(() => {
        expect(screen.getByText('Activity & Posts')).toBeInTheDocument();
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });

      // Configuration tab content
      fireEvent.click(screen.getByText('Configuration'));
      await waitFor(() => {
        expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      });
    });
  });

  describe('Overview Tab Elements', () => {
    it('should render hero section with agent information', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Agent creation specialist')).toBeInTheDocument();
      });

      // Hero section should contain key information
      expect(screen.getByText(/tasks completed/)).toBeInTheDocument();
      expect(screen.getByText(/success rate/)).toBeInTheDocument();
      expect(screen.getByText(/avg response/)).toBeInTheDocument();
    });

    it('should render key metrics grid', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      // Key metrics should be displayed
      expect(screen.getByText('Tasks Today')).toBeInTheDocument();
      expect(screen.getByText('This Week')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('Response Time')).toBeInTheDocument();
      expect(screen.getByText('Uptime')).toBeInTheDocument();
      expect(screen.getByText('Satisfaction')).toBeInTheDocument();
    });

    it('should render quick actions section', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });

      // Quick action buttons should be present
      expect(screen.getByText('Start Task')).toBeInTheDocument();
      expect(screen.getByText('View Logs')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render recent activity preview', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });

      // Activity preview should have View All link
      expect(screen.getByText('View All')).toBeInTheDocument();
    });
  });

  describe('Details Tab Elements', () => {
    it('should display agent information correctly', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Details'));

      await waitFor(() => {
        expect(screen.getByText('Agent Information')).toBeInTheDocument();
      });

      // Agent details should be displayed
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Last Active')).toBeInTheDocument();
    });

    it('should display capabilities section', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Details'));

      await waitFor(() => {
        expect(screen.getByText('Capabilities')).toBeInTheDocument();
      });

      // Capabilities should be listed
      expect(screen.getByText('bash')).toBeInTheDocument();
      expect(screen.getByText('read')).toBeInTheDocument();
      expect(screen.getByText('write')).toBeInTheDocument();
    });

    it('should display performance metrics detail', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Details'));

      await waitFor(() => {
        expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      });

      // Performance sections should be present
      expect(screen.getByText('Task Performance')).toBeInTheDocument();
      expect(screen.getByText('Response Performance')).toBeInTheDocument();
      expect(screen.getByText('User Satisfaction')).toBeInTheDocument();
    });
  });

  describe('Activity Tab Elements', () => {
    it('should display activity header with controls', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Activity'));

      await waitFor(() => {
        expect(screen.getByText('Activity & Posts')).toBeInTheDocument();
      });

      // Activity controls should be present
      expect(screen.getByText('Filter')).toBeInTheDocument();
      expect(screen.getByText('New Post')).toBeInTheDocument();
    });

    it('should display recent activities section', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Activity'));

      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });
    });

    it('should display posts and updates section', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Activity'));

      await waitFor(() => {
        expect(screen.getByText('Posts & Updates')).toBeInTheDocument();
      });
    });
  });

  describe('Configuration Tab Elements', () => {
    it('should display configuration header with controls', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Configuration'));

      await waitFor(() => {
        expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
      });

      // Configuration controls should be present
      expect(screen.getByText('Edit Configuration')).toBeInTheDocument();
    });

    it('should display configuration sections', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Configuration'));

      await waitFor(() => {
        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
        expect(screen.getByText('Behavior Settings')).toBeInTheDocument();
        expect(screen.getByText('Privacy & Visibility')).toBeInTheDocument();
        expect(screen.getByText('Theme & Appearance')).toBeInTheDocument();
      });
    });

    it('should enable editing mode when edit button is clicked', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Configuration'));

      await waitFor(() => {
        expect(screen.getByText('Edit Configuration')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit Configuration'));

      await waitFor(() => {
        expect(screen.getByText('Done Editing')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design Elements', () => {
    it('should maintain responsive classes on key elements', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      // Check for responsive classes on main container
      const mainContainer = screen.getByText('Meta Agent').closest('.max-w-7xl');
      expect(mainContainer).toHaveClass('max-w-7xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');

      // Check for responsive grid classes
      const metricsGrid = document.querySelector('.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-6');
      expect(metricsGrid).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should display loading state correctly', async () => {
      // Mock delayed response
      mockFetch.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve(mockApiResponse)
          });
        }, 100);
      }));

      renderWithRouter(<UnifiedAgentPage />);

      // Should show loading state initially
      expect(screen.getByText('Loading agent data...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Spinner

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });
    });

    it('should display error state correctly', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'Agent not found'
        })
      });

      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Agent')).toBeInTheDocument();
      });

      // Error state should have proper buttons
      expect(screen.getByText('Back to Agents')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('Accessibility Elements', () => {
    it('should maintain proper ARIA labels and roles', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      // Check for proper ARIA labels
      expect(screen.getByLabelText('Back to agents')).toBeInTheDocument();
      
      // Check for proper heading hierarchy
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      renderWithRouter(<UnifiedAgentPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      // Tab buttons should be focusable
      const overviewTab = screen.getByText('Overview').closest('button');
      const detailsTab = screen.getByText('Details').closest('button');
      
      expect(overviewTab).toHaveAttribute('tabindex', '0');
      expect(detailsTab).toHaveAttribute('tabindex', '0');
    });
  });
});
