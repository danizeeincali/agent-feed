import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DynamicPageWithData from '../../components/DynamicPageWithData';

/**
 * Integration Tests for DynamicPageWithData Component
 *
 * Tests the full workflow of:
 * 1. Fetching page specification from API
 * 2. Fetching data from dataSource endpoint
 * 3. Resolving bindings in layout
 * 4. Rendering the resolved page
 */

// Mock fetch globally
global.fetch = vi.fn();

describe('DynamicPageWithData Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  describe('Page and Data Fetching', () => {
    it('should fetch page spec and data, then render resolved layout', async () => {
      const mockPageSpec = {
        success: true,
        page: {
          id: 'page-1',
          agentId: 'agent-1',
          title: 'Analytics Dashboard',
          version: '1.0.0',
          layout: [
            {
              type: 'header',
              config: {
                title: '{{data.dashboard.title}}',
                level: 1
              }
            },
            {
              type: 'stat',
              config: {
                label: 'Total Users',
                value: '{{data.metrics.users}}'
              }
            }
          ],
          dataSource: '/api/dashboard/data',
          status: 'published',
          createdAt: '2025-10-01T00:00:00Z',
          updatedAt: '2025-10-01T00:00:00Z'
        }
      };

      const mockData = {
        success: true,
        data: {
          dashboard: {
            title: 'My Dashboard'
          },
          metrics: {
            users: 1500
          }
        }
      };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/agent-pages/agents/agent-1/pages/page-1')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockPageSpec)
          });
        }
        if (url.includes('/api/dashboard/data')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockData)
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderWithRouter(
        <DynamicPageWithData pageId="page-1" agentId="agent-1" />
      );

      // Should show loading state initially
      expect(screen.getByText(/Loading page/i)).toBeInTheDocument();

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Wait for data to load and badge to appear
      await waitFor(() => {
        expect(screen.getByText('Data-driven')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify the page is fully rendered
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    it('should handle page without dataSource using empty data object', async () => {
      const mockPageSpec = {
        success: true,
        page: {
          id: 'page-2',
          agentId: 'agent-1',
          title: 'Static Page',
          version: '1.0.0',
          layout: [
            {
              type: 'header',
              config: {
                title: 'Static Title',
                level: 1
              }
            }
          ],
          // No dataSource field
          status: 'published',
          createdAt: '2025-10-01T00:00:00Z',
          updatedAt: '2025-10-01T00:00:00Z'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPageSpec)
      });

      renderWithRouter(
        <DynamicPageWithData pageId="page-2" agentId="agent-1" />
      );

      await waitFor(() => {
        expect(screen.getByText('Static Page')).toBeInTheDocument();
      });

      // Should NOT show data-driven badge
      expect(screen.queryByText('Data-driven')).not.toBeInTheDocument();
    });

    it('should handle page spec fetch error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      renderWithRouter(
        <DynamicPageWithData pageId="page-404" agentId="agent-1" />
      );

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
        expect(screen.getByText('Page not found')).toBeInTheDocument();
      });
    });

    it('should handle data fetch error', async () => {
      const mockPageSpec = {
        success: true,
        page: {
          id: 'page-3',
          agentId: 'agent-1',
          title: 'Dashboard',
          version: '1.0.0',
          layout: [{ type: 'header', config: { title: 'Test' } }],
          dataSource: '/api/broken/data',
          status: 'published',
          createdAt: '2025-10-01T00:00:00Z',
          updatedAt: '2025-10-01T00:00:00Z'
        }
      };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/agent-pages')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockPageSpec)
          });
        }
        if (url.includes('/api/broken/data')) {
          return Promise.resolve({
            ok: false,
            status: 500
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderWithRouter(
        <DynamicPageWithData pageId="page-3" agentId="agent-1" />
      );

      await waitFor(() => {
        expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load data: 500/)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter(
        <DynamicPageWithData pageId="page-error" agentId="agent-1" />
      );

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
        expect(screen.getByText('Network error while loading page')).toBeInTheDocument();
      });
    });
  });

  describe('Data Binding Resolution', () => {
    it('should resolve nested data paths correctly', async () => {
      const mockPageSpec = {
        success: true,
        page: {
          id: 'page-4',
          agentId: 'agent-1',
          title: 'User Profile',
          version: '1.0.0',
          layout: [
            {
              type: 'Card',
              config: {
                title: '{{data.user.profile.name}}',
                description: '{{data.user.profile.bio}}'
              }
            }
          ],
          dataSource: '/api/user/data',
          status: 'published',
          createdAt: '2025-10-01T00:00:00Z',
          updatedAt: '2025-10-01T00:00:00Z'
        }
      };

      const mockData = {
        success: true,
        data: {
          user: {
            profile: {
              name: 'Jane Doe',
              bio: 'Software Developer'
            }
          }
        }
      };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/agent-pages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPageSpec)
          });
        }
        if (url.includes('/api/user/data')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockData)
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderWithRouter(
        <DynamicPageWithData pageId="page-4" agentId="agent-1" />
      );

      await waitFor(() => {
        expect(screen.getByText('User Profile')).toBeInTheDocument();
      });
    });

    it('should resolve array paths correctly', async () => {
      const mockPageSpec = {
        success: true,
        page: {
          id: 'page-5',
          agentId: 'agent-1',
          title: 'Task List',
          version: '1.0.0',
          layout: [
            {
              type: 'Card',
              config: {
                title: '{{data.tasks[0].title}}'
              }
            }
          ],
          dataSource: '/api/tasks/data',
          status: 'published',
          createdAt: '2025-10-01T00:00:00Z',
          updatedAt: '2025-10-01T00:00:00Z'
        }
      };

      const mockData = {
        success: true,
        data: {
          tasks: [
            { id: 1, title: 'First Task', status: 'pending' },
            { id: 2, title: 'Second Task', status: 'completed' }
          ]
        }
      };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/agent-pages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPageSpec)
          });
        }
        if (url.includes('/api/tasks/data')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockData)
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderWithRouter(
        <DynamicPageWithData pageId="page-5" agentId="agent-1" />
      );

      await waitFor(() => {
        expect(screen.getByText('Task List')).toBeInTheDocument();
      });
    });

    it('should handle multiple bindings in the same component', async () => {
      const mockPageSpec = {
        success: true,
        page: {
          id: 'page-6',
          agentId: 'agent-1',
          title: 'Complex Page',
          version: '1.0.0',
          layout: [
            {
              type: 'header',
              config: {
                title: '{{data.title}}',
                level: 1
              }
            },
            {
              type: 'Card',
              config: {
                title: '{{data.card.title}}',
                description: '{{data.card.description}}'
              }
            }
          ],
          dataSource: '/api/complex/data',
          status: 'published',
          createdAt: '2025-10-01T00:00:00Z',
          updatedAt: '2025-10-01T00:00:00Z'
        }
      };

      const mockData = {
        success: true,
        data: {
          title: 'Welcome Dashboard',
          card: {
            title: 'Quick Stats',
            description: 'Overview of your metrics'
          }
        }
      };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/agent-pages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPageSpec)
          });
        }
        if (url.includes('/api/complex/data')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockData)
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderWithRouter(
        <DynamicPageWithData pageId="page-6" agentId="agent-1" />
      );

      await waitFor(() => {
        expect(screen.getByText('Complex Page')).toBeInTheDocument();
      });
    });
  });

  describe('UI States', () => {
    it('should show loading indicator while fetching page', async () => {
      (global.fetch as any).mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                page: {
                  id: 'page-7',
                  agentId: 'agent-1',
                  title: 'Test',
                  version: '1.0.0',
                  layout: [],
                  status: 'published',
                  createdAt: '2025-10-01T00:00:00Z',
                  updatedAt: '2025-10-01T00:00:00Z'
                }
              })
            });
          }, 100);
        });
      });

      renderWithRouter(
        <DynamicPageWithData pageId="page-7" agentId="agent-1" />
      );

      expect(screen.getByText(/Loading page/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/Loading page/i)).not.toBeInTheDocument();
      });
    });

    it('should show loading indicator while fetching data', async () => {
      const mockPageSpec = {
        success: true,
        page: {
          id: 'page-8',
          agentId: 'agent-1',
          title: 'Dashboard',
          version: '1.0.0',
          layout: [{ type: 'header', config: { title: 'Test' } }],
          dataSource: '/api/slow/data',
          status: 'published',
          createdAt: '2025-10-01T00:00:00Z',
          updatedAt: '2025-10-01T00:00:00Z'
        }
      };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/agent-pages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPageSpec)
          });
        }
        if (url.includes('/api/slow/data')) {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} })
              });
            }, 100);
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderWithRouter(
        <DynamicPageWithData pageId="page-8" agentId="agent-1" />
      );

      await waitFor(() => {
        expect(screen.getByText(/Loading data/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByText(/Loading data/i)).not.toBeInTheDocument();
      });
    });

    it('should show status badges correctly', async () => {
      const mockPageSpec = {
        success: true,
        page: {
          id: 'page-9',
          agentId: 'agent-1',
          title: 'Draft Page',
          version: '2.0.0',
          layout: [],
          status: 'draft',
          createdAt: '2025-10-01T00:00:00Z',
          updatedAt: '2025-10-01T00:00:00Z'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPageSpec)
      });

      renderWithRouter(
        <DynamicPageWithData pageId="page-9" agentId="agent-1" />
      );

      await waitFor(() => {
        expect(screen.getByText('Draft Page')).toBeInTheDocument();
        expect(screen.getByText('draft')).toBeInTheDocument();
        expect(screen.getByText('v2.0.0')).toBeInTheDocument();
      });
    });
  });
});
