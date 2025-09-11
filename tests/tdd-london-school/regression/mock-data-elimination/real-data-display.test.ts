/**
 * TDD London School - Real Data Display Verification Tests
 * Critical Test: Verify Only Real Data is Displayed
 * 
 * London School Approach:
 * - Test interactions between data transformer and UI components
 * - Verify behavior contracts are met
 * - Mock external dependencies while testing real data flow
 */

import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { UnifiedAgentPage } from '../../../../frontend/src/components/UnifiedAgentPage';
import { transformApiDataToUnified } from '../../../../frontend/src/utils/unified-agent-data-transformer';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock API client with deterministic real data
const mockApiClient = {
  fetchAgent: jest.fn(),
  fetchAgentMetrics: jest.fn(),
  fetchAgentActivities: jest.fn()
};

const mockRouter = {
  useParams: jest.fn(() => ({ id: 'production-agent-456' })),
  useNavigate: jest.fn()
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockRouter.useParams(),
  useNavigate: () => mockRouter.useNavigate()
}));

jest.mock('../../../../frontend/src/api/agentApi', () => ({
  agentApi: mockApiClient
}));

describe('Real Data Integration Verification', () => {
  const realApiData = {
    id: 'production-agent-456',
    name: 'Customer Service AI',
    description: 'Handles customer inquiries and support tickets',
    usage_count: 1247,
    performance_metrics: {
      success_rate: 94.2,
      error_count: 8,
      avg_response_time: 850
    },
    created_at: '2024-01-10T08:00:00Z',
    last_active: '2024-01-15T16:45:00Z'
  };

  const realMetricsData = {
    daily_tasks: 42,
    weekly_tasks: 289,
    monthly_tasks: 1247,
    satisfaction_score: 4.7,
    response_time_avg: 850,
    uptime_percentage: 99.2
  };

  const realActivitiesData = [
    {
      id: 101,
      type: 'query_processed',
      timestamp: '2024-01-15T16:30:00Z',
      description: 'Processed customer billing inquiry',
      duration: 750,
      success: true
    },
    {
      id: 102,
      type: 'ticket_resolved',
      timestamp: '2024-01-15T16:15:00Z',
      description: 'Resolved technical support ticket #12345',
      duration: 1200,
      success: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApiClient.fetchAgent.mockResolvedValue(realApiData);
    mockApiClient.fetchAgentMetrics.mockResolvedValue(realMetricsData);
    mockApiClient.fetchAgentActivities.mockResolvedValue(realActivitiesData);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <UnifiedAgentPage />
      </BrowserRouter>
    );
  };

  describe('Real Data Display Verification', () => {
    test('should display real task counts from API metrics', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Verify exact real data is displayed
        expect(screen.getByText(/42/)).toBeInTheDocument(); // daily_tasks
        expect(screen.getByText(/289/)).toBeInTheDocument(); // weekly_tasks
        expect(screen.getByText(/1247/)).toBeInTheDocument(); // monthly_tasks or usage_count
      });

      // Verify API contract was fulfilled
      expect(mockApiClient.fetchAgentMetrics).toHaveBeenCalledWith('production-agent-456');
    });

    test('should display calculated satisfaction from performance metrics', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Should show real satisfaction score, not calculated or N/A
        expect(screen.getByText(/4\.7/)).toBeInTheDocument(); // satisfaction_score
        expect(screen.getByText(/94\.2/)).toBeInTheDocument(); // success_rate
      });

      // Verify no fallback calculations are used
      expect(screen.queryByText('N/A')).toBeNull();
    });

    test('should display real performance metrics accurately', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Verify performance data is shown correctly
        expect(screen.getByText(/850/)).toBeInTheDocument(); // avg_response_time
        expect(screen.getByText(/99\.2/)).toBeInTheDocument(); // uptime_percentage
        expect(screen.getByText(/8/)).toBeInTheDocument(); // error_count
      });
    });

    test('should display real activity data with timestamps', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Verify real activity descriptions are shown
        expect(screen.getByText(/Processed customer billing inquiry/)).toBeInTheDocument();
        expect(screen.getByText(/Resolved technical support ticket/)).toBeInTheDocument();
      });

      // Verify activities API was called
      expect(mockApiClient.fetchAgentActivities).toHaveBeenCalledWith('production-agent-456');
    });
  });

  describe('Data Transformation Verification', () => {
    test('should transform API data correctly without mock fallbacks', () => {
      const transformed = transformApiDataToUnified(realApiData, realMetricsData, realActivitiesData);

      // Verify no mock data is introduced during transformation
      expect(transformed.name).toBe('Customer Service AI');
      expect(transformed.description).toBe('Handles customer inquiries and support tickets');
      expect(transformed.metrics.usage_count).toBe(1247);
      expect(transformed.metrics.success_rate).toBe(94.2);
      
      // Verify no N/A or Unknown values
      expect(JSON.stringify(transformed)).not.toContain('N/A');
      expect(JSON.stringify(transformed)).not.toContain('Unknown');
      expect(JSON.stringify(transformed)).not.toContain('null');
    });

    test('should calculate derived metrics from real data only', () => {
      const transformed = transformApiDataToUnified(realApiData, realMetricsData, realActivitiesData);

      // Verify calculations use real data
      if (transformed.metrics.calculated_satisfaction) {
        expect(transformed.metrics.calculated_satisfaction).toBeGreaterThan(0);
        expect(transformed.metrics.calculated_satisfaction).toBeLessThanOrEqual(5);
      }

      // Should use provided satisfaction_score, not calculated
      expect(transformed.metrics.satisfaction_score).toBe(4.7);
    });
  });

  describe('Real Data Consistency Verification', () => {
    test('should maintain data consistency across multiple renders', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <UnifiedAgentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/42/)).toBeInTheDocument();
      });

      // Re-render and verify same data
      rerender(
        <BrowserRouter>
          <UnifiedAgentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/42/)).toBeInTheDocument();
        expect(screen.getByText(/289/)).toBeInTheDocument();
        expect(screen.getByText(/4\.7/)).toBeInTheDocument();
      });
    });

    test('should show real timestamps, not relative time fallbacks', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Should show real timestamp formatting, not "a few minutes ago" placeholders
        const timeElements = screen.getAllByText(/2024-01-15/);
        expect(timeElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Contract Behavior Verification', () => {
    test('should fulfill all data loading contracts', async () => {
      await act(async () => {
        renderComponent();
      });

      // Verify all expected API calls were made (London School: verify interactions)
      await waitFor(() => {
        expect(mockApiClient.fetchAgent).toHaveBeenCalledTimes(1);
        expect(mockApiClient.fetchAgentMetrics).toHaveBeenCalledTimes(1);
        expect(mockApiClient.fetchAgentActivities).toHaveBeenCalledTimes(1);
      });

      // Verify all contracts were fulfilled with correct parameters
      expect(mockApiClient.fetchAgent).toHaveBeenCalledWith('production-agent-456');
      expect(mockApiClient.fetchAgentMetrics).toHaveBeenCalledWith('production-agent-456');
      expect(mockApiClient.fetchAgentActivities).toHaveBeenCalledWith('production-agent-456');
    });

    test('should display data immediately after API resolution', async () => {
      await act(async () => {
        renderComponent();
      });

      // Should not show loading states permanently
      await waitFor(() => {
        expect(screen.getByText('Customer Service AI')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Verify no loading placeholders remain
      expect(screen.queryByText('Loading...')).toBeNull();
      expect(screen.queryByText('...')).toBeNull();
    });
  });
});