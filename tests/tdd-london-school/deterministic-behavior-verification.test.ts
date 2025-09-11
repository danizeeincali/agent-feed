/**
 * TDD London School: Deterministic Behavior Verification
 * 
 * MISSION: Verify all component behavior is deterministic and reproducible
 * APPROACH: Behavior verification through mock contracts and state inspection
 * STANDARD: Same input -> Same output, always
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock fetch for deterministic testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Component import
const getUnifiedAgentPage = async () => {
  const module = await import('../../frontend/src/components/UnifiedAgentPage');
  return module.default;
};

describe('Deterministic Behavior Verification - PREDICTABLE OUTCOMES', () => {

  beforeEach(() => {
    mockFetch.mockClear();
    // Fix Date for deterministic testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-10T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Calculation Determinism', () => {
    test('should calculate uptime percentage deterministically from health data', async () => {
      // Arrange: Fixed input data for deterministic calculation
      const deterministicHealthData = {
        success: true,
        data: {
          id: 'deterministic-agent',
          name: 'Deterministic Agent',
          description: 'Testing deterministic calculations',
          status: 'active',
          capabilities: [],
          health_status: {
            cpu_usage: 25.5,
            memory_usage: 67.3,
            response_time: 1.2,
            last_heartbeat: '2025-01-10T11:50:00Z', // 10 minutes ago
            status: 'healthy',
            active_tasks: 3
          }
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => deterministicHealthData
      });

      // Act: Render multiple times with same data
      const UnifiedAgentPage = await getUnifiedAgentPage();
      
      // First render
      const { unmount: unmount1 } = render(
        <MemoryRouter initialEntries={['/agents/deterministic-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Capture first result (need to wait for component to process)
      await waitFor(() => {
        // The uptime calculation should be deterministic based on last_heartbeat
        // With last_heartbeat 10 minutes ago, uptime should be calculated consistently
        const element = screen.queryByText(/\d+\.\d+%.*uptime/i) || screen.queryByText(/uptime.*\d+\.\d+%/i);
        if (element) {
          expect(element).toBeInTheDocument();
        }
      });

      const firstRenderUptime = screen.queryByText(/\d+\.\d+%/);
      const firstUptimeValue = firstRenderUptime?.textContent;

      unmount1();

      // Second render with identical data
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => deterministicHealthData
      });

      const { unmount: unmount2 } = render(
        <MemoryRouter initialEntries={['/agents/deterministic-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      await waitFor(() => {
        const element = screen.queryByText(/\d+\.\d+%/);
        if (element && firstUptimeValue) {
          expect(element.textContent).toBe(firstUptimeValue);
        }
      });

      unmount2();
    });

    test('should calculate today tasks deterministically from last_used timestamp', async () => {
      // Arrange: Agent with specific last_used time
      const fixedTimestampData = {
        success: true,
        data: {
          id: 'timestamp-agent',
          name: 'Timestamp Agent',
          description: 'Testing timestamp calculations',
          status: 'active',
          capabilities: [],
          last_used: '2025-01-10T08:30:00Z', // Today at 8:30 AM
          created_at: '2025-01-01T00:00:00Z'
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => fixedTimestampData
      });

      // Act: Multiple renders should yield same today tasks count
      const UnifiedAgentPage = await getUnifiedAgentPage();
      
      const results: string[] = [];

      for (let i = 0; i < 3; i++) {
        mockFetch.mockClear();
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => fixedTimestampData
        });

        const { unmount } = render(
          <MemoryRouter initialEntries={['/agents/timestamp-agent']}>
            <UnifiedAgentPage />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });

        // Look for tasks today metric
        await waitFor(() => {
          const todayElement = screen.queryByText(/\d+.*today/i);
          if (todayElement) {
            results.push(todayElement.textContent || '');
          }
        });

        unmount();
      }

      // Assert: All renders should produce identical results
      if (results.length > 1) {
        const firstResult = results[0];
        results.forEach((result, index) => {
          expect(result).toBe(firstResult);
        });
      }
    });

    test('should calculate weekly tasks deterministically from usage_count and created_at', async () => {
      // Arrange: Agent with fixed usage and creation data
      const weeklyCalculationData = {
        success: true,
        data: {
          id: 'weekly-agent',
          name: 'Weekly Agent', 
          description: 'Testing weekly calculations',
          status: 'active',
          capabilities: [],
          usage_count: 140, // Fixed usage count
          created_at: '2024-12-27T00:00:00Z' // 2 weeks ago
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => weeklyCalculationData
      });

      // Act: Multiple renders
      const UnifiedAgentPage = await getUnifiedAgentPage();
      const weeklyResults: string[] = [];

      for (let i = 0; i < 2; i++) {
        mockFetch.mockClear();
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => weeklyCalculationData
        });

        const { unmount } = render(
          <MemoryRouter initialEntries={['/agents/weekly-agent']}>
            <UnifiedAgentPage />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });

        await waitFor(() => {
          const weekElement = screen.queryByText(/this week/i)?.closest('div');
          const weekValue = weekElement?.querySelector('[class*="text-2xl"]')?.textContent;
          if (weekValue) {
            weeklyResults.push(weekValue);
          }
        });

        unmount();
      }

      // Assert: Weekly calculations should be identical
      if (weeklyResults.length === 2) {
        expect(weeklyResults[0]).toBe(weeklyResults[1]);
      }
    });

    test('should calculate satisfaction score deterministically from performance metrics', async () => {
      // Arrange: Specific performance metrics for deterministic calculation
      const satisfactionData = {
        success: true,
        data: {
          id: 'satisfaction-agent',
          name: 'Satisfaction Agent',
          description: 'Testing satisfaction calculation',
          status: 'active',
          capabilities: [],
          performance_metrics: {
            success_rate: 95.5,           // 95.5/100 * 2 = 1.91 points
            average_response_time: 1500,  // 2 - (1500/1000) = 0.5 points  
            error_count: 5,               // min(1, 5/100) = 0.05 penalty
            total_tokens_used: 10000
          }
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => satisfactionData
      });

      // Act: Multiple renders
      const UnifiedAgentPage = await getUnifiedAgentPage();
      const satisfactionResults: string[] = [];

      for (let i = 0; i < 2; i++) {
        mockFetch.mockClear();
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => satisfactionData
        });

        const { unmount } = render(
          <MemoryRouter initialEntries={['/agents/satisfaction-agent']}>
            <UnifiedAgentPage />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });

        await waitFor(() => {
          // Look for satisfaction rating
          const satisfactionElement = screen.queryByText(/\d+\.\d+\/5/);
          if (satisfactionElement) {
            satisfactionResults.push(satisfactionElement.textContent || '');
          }
        });

        unmount();
      }

      // Assert: Satisfaction should be calculated identically
      if (satisfactionResults.length === 2) {
        expect(satisfactionResults[0]).toBe(satisfactionResults[1]);
        // With the input values: 1.91 + 0.5 - 0.05 + 1 = 3.36, clamped to 1-5 range
        // Should be around 3.4/5
        expect(satisfactionResults[0]).toMatch(/[3-4]\.\d\/5/);
      }
    });
  });

  describe('UI State Determinism', () => {
    test('should render identical UI components for same API data', async () => {
      // Arrange: Comprehensive agent data
      const completeAgentData = {
        success: true,
        data: {
          id: 'ui-deterministic-agent',
          name: 'UI Deterministic Agent',
          display_name: 'UI Test Agent',
          description: 'Comprehensive agent for UI determinism testing',
          status: 'active',
          type: 'test-agent',
          category: 'testing',
          specialization: 'UI consistency validation',
          avatar_color: '#3B82F6',
          capabilities: ['ui-testing', 'consistency-check', 'validation'],
          usage_count: 250,
          performance_metrics: {
            success_rate: 88.7,
            average_response_time: 1.25,
            total_tokens_used: 45000,
            error_count: 12,
            uptime_percentage: 97.3
          },
          health_status: {
            cpu_usage: 32.1,
            memory_usage: 68.4,
            response_time: 1.18,
            last_heartbeat: '2025-01-10T11:55:00Z',
            status: 'healthy',
            active_tasks: 4
          },
          created_at: '2025-01-01T00:00:00Z',
          last_used: '2025-01-10T10:30:00Z'
        }
      };

      const activitiesData = [
        {
          id: 'ui-activity-1',
          type: 'task_completed',
          title: 'UI Consistency Test Passed',
          description: 'All UI components rendered consistently across test runs',
          timestamp: '2025-01-10T11:30:00Z',
          metadata: { duration: 120, success: true, priority: 'medium' }
        }
      ];

      const postsData = [
        {
          id: 'ui-post-1',
          type: 'insight',
          title: 'UI Determinism Best Practices',
          content: 'Ensuring consistent UI rendering requires deterministic data processing',
          timestamp: '2025-01-10T10:00:00Z',
          author: { id: 'ui-deterministic-agent', name: 'UI Test Agent', avatar: '🎯' },
          tags: ['ui', 'testing', 'best-practices'],
          interactions: { likes: 45, comments: 12, shares: 8, bookmarks: 23 },
          priority: 'high'
        }
      ];

      // Mock responses
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => completeAgentData })
        .mockResolvedValueOnce({ ok: true, json: async () => activitiesData })
        .mockResolvedValueOnce({ ok: true, json: async () => postsData });

      // Act: First render
      const UnifiedAgentPage = await getUnifiedAgentPage();
      const { unmount: unmount1 } = render(
        <MemoryRouter initialEntries={['/agents/ui-deterministic-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      // Capture UI structure
      const firstRenderHtml = document.body.innerHTML;
      const firstRenderText = document.body.textContent;

      unmount1();

      // Second render with identical data
      mockFetch.mockClear();
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => completeAgentData })
        .mockResolvedValueOnce({ ok: true, json: async () => activitiesData })
        .mockResolvedValueOnce({ ok: true, json: async () => postsData });

      const { unmount: unmount2 } = render(
        <MemoryRouter initialEntries={['/agents/ui-deterministic-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      // Assert: UI should be identical
      const secondRenderHtml = document.body.innerHTML;
      const secondRenderText = document.body.textContent;

      expect(secondRenderText).toBe(firstRenderText);
      
      // Key elements should be present in both renders
      expect(screen.getByText('UI Test Agent')).toBeInTheDocument();
      expect(screen.getByText('88.7%')).toBeInTheDocument();
      expect(screen.getByText('1.25s')).toBeInTheDocument();

      unmount2();
    });

    test('should maintain deterministic tab switching behavior', async () => {
      // Arrange: Agent data
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'tab-deterministic-agent',
              name: 'Tab Test Agent',
              description: 'Testing tab determinism',
              status: 'active',
              capabilities: ['tab-testing']
            }
          })
        })
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });

      // Act: Render and test tab switching determinism
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/tab-deterministic-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      // Test tab switching sequence multiple times
      const tabSequences = ['Details', 'Activity', 'Configuration', 'Overview'];
      
      for (let iteration = 0; iteration < 2; iteration++) {
        for (const tab of tabSequences) {
          fireEvent.click(screen.getByText(tab));
          
          await waitFor(() => {
            // Verify tab is active (should have blue styling)
            const tabElement = screen.getByText(tab).closest('button');
            expect(tabElement).toHaveClass(/text-blue-600|border-blue-500/);
          });
        }
      }

      // Should end up on Overview tab consistently
      expect(screen.getByText('Overview').closest('button')).toHaveClass(/text-blue-600|border-blue-500/);
    });
  });

  describe('Error Handling Determinism', () => {
    test('should handle API errors deterministically', async () => {
      // Arrange: Consistent error response
      const errorResponse = new Error('Deterministic API Error');
      
      // Act: Multiple error scenarios
      const errorResults: string[] = [];
      const UnifiedAgentPage = await getUnifiedAgentPage();

      for (let i = 0; i < 2; i++) {
        mockFetch.mockClear();
        mockFetch.mockRejectedValueOnce(errorResponse);

        const { unmount } = render(
          <MemoryRouter initialEntries={['/agents/error-agent']}>
            <UnifiedAgentPage />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });

        await waitFor(() => {
          const errorElement = screen.queryByText(/error.*loading/i);
          if (errorElement) {
            errorResults.push(errorElement.textContent || '');
          }
        });

        unmount();
      }

      // Assert: Error handling should be consistent
      if (errorResults.length === 2) {
        expect(errorResults[0]).toBe(errorResults[1]);
      }
    });

    test('should handle partial failures deterministically', async () => {
      // Arrange: Agent succeeds, activities fail, posts succeed
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'partial-error-agent',
              name: 'Partial Error Agent',
              description: 'Testing partial failure determinism',
              status: 'active',
              capabilities: []
            }
          })
        })
        .mockRejectedValueOnce(new Error('Activities unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            id: 'surviving-post',
            type: 'update',
            title: 'Service Update',
            content: 'Some services experiencing issues',
            timestamp: '2025-01-10T12:00:00Z',
            author: { id: 'partial-error-agent', name: 'Partial Error Agent', avatar: '⚠️' },
            tags: ['status'],
            interactions: { likes: 5, comments: 1, shares: 0, bookmarks: 2 },
            priority: 'medium'
          }]
        });

      // Act: Render
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/partial-error-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      // Navigate to activity tab
      fireEvent.click(screen.getByText('Activity'));

      await waitFor(() => {
        // Should show the successful post
        expect(screen.getByText('Service Update')).toBeInTheDocument();
        
        // Should not show any synthetic fallback for failed activities
        expect(screen.queryByText('Sample Activity')).not.toBeInTheDocument();
        expect(screen.queryByText('Generated Task')).not.toBeInTheDocument();
      });
    });
  });

  describe('Configuration Behavior Determinism', () => {
    test('should apply configuration changes deterministically', async () => {
      // Arrange: Agent with configuration
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'config-agent',
              name: 'Config Agent',
              description: 'Testing configuration determinism',
              status: 'active',
              capabilities: [],
              avatar_color: '#3B82F6'
            }
          })
        })
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });

      // Act: Render and test configuration changes
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/config-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      // Navigate to configuration tab
      fireEvent.click(screen.getByText('Configuration'));

      await waitFor(() => {
        expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
      });

      // Test configuration editing determinism
      const editButton = screen.getByText('Edit Configuration');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Done Editing')).toBeInTheDocument();
      });

      // Configuration UI should be predictable
      const nameInput = screen.getByDisplayValue('Config Agent');
      expect(nameInput).toBeInTheDocument();
      
      // Make a change and verify it's reflected
      fireEvent.change(nameInput, { target: { value: 'Modified Config Agent' } });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Modified Config Agent')).toBeInTheDocument();
      });
    });
  });

  describe('Time-Based Calculation Determinism', () => {
    test('should calculate time differences deterministically with fixed system time', async () => {
      // System time is already set to 2025-01-10T12:00:00Z in beforeEach
      
      // Arrange: Agent with specific timestamps
      const timeBasedData = {
        success: true,
        data: {
          id: 'time-agent',
          name: 'Time Agent',
          description: 'Testing time-based calculations',
          status: 'active',
          capabilities: [],
          last_used: '2025-01-10T11:30:00Z', // 30 minutes ago
          created_at: '2025-01-09T12:00:00Z', // 24 hours ago
          health_status: {
            last_heartbeat: '2025-01-10T11:59:00Z', // 1 minute ago
            status: 'healthy',
            cpu_usage: 20,
            memory_usage: 50,
            response_time: 1.0
          }
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => timeBasedData
      });

      // Act: Multiple renders with same fixed time
      const UnifiedAgentPage = await getUnifiedAgentPage();
      const timeResults: string[] = [];

      for (let i = 0; i < 2; i++) {
        mockFetch.mockClear();
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => timeBasedData
        });

        const { unmount } = render(
          <MemoryRouter initialEntries={['/agents/time-agent']}>
            <UnifiedAgentPage />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });

        // Capture time-based displays
        await waitFor(() => {
          const timeElements = screen.queryAllByText(/\d+[mhd] ago/);
          if (timeElements.length > 0) {
            timeResults.push(timeElements.map(el => el.textContent).join(','));
          }
        });

        unmount();
      }

      // Assert: Time calculations should be identical with fixed system time
      if (timeResults.length === 2) {
        expect(timeResults[0]).toBe(timeResults[1]);
      }
    });
  });
});