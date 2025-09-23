/**
 * SPARC Phase 4 TDD Tests: Enhanced Overview Tab with AgentHome Features
 * London School TDD - Outside-in testing approach
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UnifiedAgentPage from '../../../src/components/UnifiedAgentPage';

// Mock WebSocket for real-time testing
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN
};

// Mock API responses
const mockAgentApiResponse = {
  success: true,
  data: {
    id: 'test-agent-1',
    name: 'Test Agent',
    display_name: 'Test AI Agent',
    description: 'Test agent for SPARC Phase 4 validation',
    status: 'active',
    avatar_color: '#3B82F6',
    capabilities: ['Testing', 'Validation', 'TDD'],
    usage_count: 42,
    performance_metrics: {
      success_rate: 95.5,
      average_response_time: 1200,
      uptime_percentage: 99.2,
      total_tokens_used: 150000,
      error_count: 2
    },
    health_status: {
      status: 'healthy',
      cpu_usage: 35,
      memory_usage: 45,
      response_time: 120,
      last_heartbeat: new Date().toISOString()
    }
  }
};

const mockActivitiesResponse = {
  success: true,
  data: [
    {
      id: 'activity-1',
      type: 'task_completed',
      title: 'Test Task Completed',
      description: 'Successfully completed validation test',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      metadata: { duration: 15, success: true }
    },
    {
      id: 'activity-2', 
      type: 'milestone',
      title: 'Testing Milestone Reached',
      description: 'Reached 100% test coverage milestone',
      timestamp: new Date(Date.now() - 60 * 60000).toISOString()
    }
  ]
};

const mockPostsResponse = {
  success: true,
  data: [
    {
      id: 'post-1',
      type: 'insight',
      title: 'SPARC Phase 4 Progress',
      content: 'TDD implementation proceeding successfully with comprehensive test coverage.',
      timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      author: { id: 'test-agent-1', name: 'Test AI Agent', avatar: '🤖' },
      tags: ['sparc', 'tdd', 'testing'],
      interactions: { likes: 5, comments: 2, shares: 1, bookmarks: 3 },
      priority: 'medium'
    }
  ]
};

// Setup test environment
beforeEach(() => {
  // Mock fetch API
  global.fetch = vi.fn();
  
  // Mock WebSocket
  global.WebSocket = vi.fn(() => mockWebSocket) as any;
  
  // Clear all mocks
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const renderUnifiedAgentPage = (agentId: string = 'test-agent-1') => {
  return render(
    <BrowserRouter>
      <UnifiedAgentPage />
    </BrowserRouter>
  );
};

describe('SPARC Phase 4: Enhanced Overview Tab Integration', () => {
  describe('Core AgentHome Feature Integration', () => {
    it('should display enhanced hero section with real-time status', async () => {
      // Arrange
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAgentApiResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      // Act
      renderUnifiedAgentPage();

      // Assert - Hero section should be enhanced
      await waitFor(() => {
        expect(screen.getByText('Test AI Agent')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('42 tasks completed')).toBeInTheDocument();
        expect(screen.getByText('95.5% success rate')).toBeInTheDocument();
      });

      // Assert - Status should have real-time indicator
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should render welcome message section when available', async () => {
      // Arrange
      const agentWithWelcome = {
        ...mockAgentApiResponse,
        data: {
          ...mockAgentApiResponse.data,
          welcome_message: 'Welcome to my enhanced agent workspace!'
        }
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(agentWithWelcome)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      // Act
      renderUnifiedAgentPage();

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/enhanced agent workspace/i)).toBeInTheDocument();
      });
    });

    it('should display interactive widget dashboard with edit capabilities', async () => {
      // Arrange
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAgentApiResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      // Act
      renderUnifiedAgentPage();

      // Assert - Widget dashboard should be present
      await waitFor(() => {
        // Key metrics should be displayed as widgets
        expect(screen.getByText('Tasks Today')).toBeInTheDocument();
        expect(screen.getByText('Success Rate')).toBeInTheDocument();
        expect(screen.getByText('Response Time')).toBeInTheDocument();
        expect(screen.getByText('Uptime')).toBeInTheDocument();
      });

      // Widget values should be calculated from real data
      expect(screen.getByText('1')).toBeInTheDocument(); // todayTasks calculated from usage_count
      expect(screen.getByText('95.5%')).toBeInTheDocument(); // success_rate from API
      expect(screen.getByText('1.2s')).toBeInTheDocument(); // response_time converted to seconds
    });

    it('should render enhanced quick actions with categorization', async () => {
      // Arrange
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAgentApiResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      // Act
      renderUnifiedAgentPage();

      // Assert - Quick actions should be enhanced
      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
        
        // Primary actions
        expect(screen.getByText('Start Task')).toBeInTheDocument();
        expect(screen.getByText('Analytics')).toBeInTheDocument();
        
        // Secondary actions  
        expect(screen.getByText('View Logs')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('should integrate real-time activity preview with link to full activity tab', async () => {
      // Arrange
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAgentApiResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      // Act
      renderUnifiedAgentPage();

      // Assert - Activity preview should show real data
      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        expect(screen.getByText('Test Task Completed')).toBeInTheDocument();
        expect(screen.getByText('Testing Milestone Reached')).toBeInTheDocument();
      });

      // Should have link to full activity tab
      expect(screen.getByText('View All')).toBeInTheDocument();
      
      // Clicking should navigate to activity tab
      fireEvent.click(screen.getByText('View All'));
      expect(screen.getByRole('tab', { name: /activity/i })).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should handle real-time status updates via WebSocket', async () => {
      // Arrange
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAgentApiResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      renderUnifiedAgentPage();

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('active')).toBeInTheDocument();
      });

      // Act - Simulate WebSocket status update
      const statusUpdateHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (statusUpdateHandler) {
        statusUpdateHandler({
          data: JSON.stringify({
            type: 'agent-status-update',
            agentId: 'test-agent-1',
            status: 'busy'
          })
        });
      }

      // Assert - Status should be updated in real-time
      await waitFor(() => {
        expect(screen.getByText('busy')).toBeInTheDocument();
      });
    });

    it('should update metrics in real-time when data changes', async () => {
      // Arrange
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAgentApiResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      renderUnifiedAgentPage();

      // Wait for initial metrics
      await waitFor(() => {
        expect(screen.getByText('95.5%')).toBeInTheDocument();
      });

      // Act - Simulate metrics update
      const metricsUpdateHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (metricsUpdateHandler) {
        metricsUpdateHandler({
          data: JSON.stringify({
            type: 'agent-metrics-update',
            agentId: 'test-agent-1',
            metrics: {
              success_rate: 97.2,
              response_time: 1100
            }
          })
        });
      }

      // Assert - Metrics should be updated
      await waitFor(() => {
        expect(screen.getByText('97.2%')).toBeInTheDocument();
        expect(screen.getByText('1.1s')).toBeInTheDocument();
      });
    });
  });

  describe('Existing Functionality Preservation', () => {
    it('should maintain all 8 existing tabs without regression', async () => {
      // Arrange
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAgentApiResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      // Act
      renderUnifiedAgentPage();

      // Assert - All tabs should be present and functional
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /definition/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /pages/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /workspace/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /details/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /activity/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /configuration/i })).toBeInTheDocument();
      });

      // Test tab navigation still works
      fireEvent.click(screen.getByRole('tab', { name: /details/i }));
      expect(screen.getByRole('tab', { name: /details/i })).toHaveAttribute('data-state', 'active');

      fireEvent.click(screen.getByRole('tab', { name: /activity/i }));
      expect(screen.getByRole('tab', { name: /activity/i })).toHaveAttribute('data-state', 'active');
    });

    it('should preserve existing data transformation and API integration', async () => {
      // Arrange
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAgentApiResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      // Act
      renderUnifiedAgentPage();

      // Assert - API calls should be made with existing patterns
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/agents/test-agent-1');
        expect(global.fetch).toHaveBeenCalledWith('/api/agents/test-agent-1/activities');
        expect(global.fetch).toHaveBeenCalledWith('/api/agents/test-agent-1/posts');
      });

      // Data should be transformed correctly
      expect(screen.getByText('Test AI Agent')).toBeInTheDocument();
      expect(screen.getByText(/test agent for sparc phase 4/i)).toBeInTheDocument();
    });

    it('should handle API errors gracefully without breaking existing functionality', async () => {
      // Arrange - Mock API error
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      // Act
      renderUnifiedAgentPage();

      // Assert - Should show error state without crashing
      await waitFor(() => {
        expect(screen.getByText(/error loading agent/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /back to agents/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should maintain sub-2s load time for enhanced overview', async () => {
      // Arrange
      const startTime = performance.now();
      
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAgentApiResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      // Act
      renderUnifiedAgentPage();

      // Assert - Content should load quickly
      await waitFor(() => {
        expect(screen.getByText('Test AI Agent')).toBeInTheDocument();
        
        const loadTime = performance.now() - startTime;
        expect(loadTime).toBeLessThan(2000); // Less than 2 seconds
      });
    });

    it('should implement lazy loading for widget content', async () => {
      // Arrange
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAgentApiResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      // Act
      renderUnifiedAgentPage();

      // Assert - Widgets should load progressively
      await waitFor(() => {
        // Core metrics should load first
        expect(screen.getByText('Tasks Today')).toBeInTheDocument();
      });

      // Activity widget should load after
      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should maintain WCAG 2.1 AA compliance with enhanced features', async () => {
      // Arrange
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAgentApiResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      // Act
      renderUnifiedAgentPage();

      // Assert - Accessibility features should be present
      await waitFor(() => {
        // Proper headings hierarchy
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        
        // Interactive elements should be focusable
        const quickActionButtons = screen.getAllByRole('button');
        quickActionButtons.forEach(button => {
          expect(button).toHaveAttribute('tabindex', '0');
        });

        // Status indicators should have proper labels
        expect(screen.getByLabelText(/agent status/i)).toBeInTheDocument();
      });
    });

    it('should provide responsive design for all screen sizes', async () => {
      // This would typically involve viewport testing
      // For now, we verify responsive classes are applied
      
      // Arrange
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAgentApiResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivitiesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPostsResponse)
        });

      // Act
      renderUnifiedAgentPage();

      // Assert - Responsive classes should be present
      await waitFor(() => {
        const mainContent = screen.getByRole('main', { hidden: true });
        expect(mainContent).toHaveClass(/max-w-7xl/); // Responsive container
      });
    });
  });
});

describe('SPARC Phase 4: Integration Validation', () => {
  it('should successfully integrate all AgentHome features without breaking existing functionality', async () => {
    // This is a comprehensive integration test
    
    // Arrange
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAgentApiResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActivitiesResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPostsResponse)
      });

    // Act
    renderUnifiedAgentPage();

    // Assert - All features should be present and functional
    await waitFor(() => {
      // 1. Enhanced hero section
      expect(screen.getByText('Test AI Agent')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
      
      // 2. Metrics dashboard
      expect(screen.getByText('Tasks Today')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      
      // 3. Quick actions
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Start Task')).toBeInTheDocument();
      
      // 4. Activity preview
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('Test Task Completed')).toBeInTheDocument();
      
      // 5. All tabs still present
      expect(screen.getAllByRole('tab')).toHaveLength(8);
    });

    // Test that tab navigation still works
    fireEvent.click(screen.getByRole('tab', { name: /details/i }));
    expect(screen.getByText('Agent Information')).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('tab', { name: /overview/i }));
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });
});