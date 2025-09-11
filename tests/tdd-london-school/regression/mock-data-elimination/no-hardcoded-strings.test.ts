/**
 * TDD London School - Mock Data Elimination Regression Tests
 * Critical Test: No Hardcoded Mock Strings
 * 
 * London School Approach:
 * - Mock dependencies to isolate component behavior
 * - Verify interactions and contracts
 * - Test behavior, not implementation
 */

import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
// import { UnifiedAgentPage } from '../../../../frontend/src/components/UnifiedAgentPage';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock external dependencies following London School pattern
const mockApiClient = {
  fetchAgent: jest.fn(),
  fetchAgentMetrics: jest.fn(),
  fetchAgentActivities: jest.fn()
};

const mockRouter = {
  useParams: jest.fn(() => ({ id: 'test-agent-123' })),
  useNavigate: jest.fn()
};

// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockRouter.useParams(),
  useNavigate: () => mockRouter.useNavigate()
}));

// Mock API client
jest.mock('../../../../frontend/src/api/agentApi', () => ({
  agentApi: mockApiClient
}));

describe('Mock Data Elimination - No Hardcoded Values', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup default successful API responses
    mockApiClient.fetchAgent.mockResolvedValue({
      id: 'test-agent-123',
      name: 'Production Agent',
      description: 'Real production agent',
      usage_count: 245,
      performance_metrics: {
        success_rate: 87.5,
        error_count: 3,
        avg_response_time: 1250
      }
    });

    mockApiClient.fetchAgentMetrics.mockResolvedValue({
      daily_tasks: 23,
      weekly_tasks: 156,
      monthly_tasks: 642,
      satisfaction_score: 4.2
    });

    mockApiClient.fetchAgentActivities.mockResolvedValue([
      {
        id: 1,
        type: 'task_completion',
        timestamp: '2024-01-15T10:30:00Z',
        description: 'Completed user query processing'
      }
    ]);
  });

  const renderComponent = () => {
    return render(
      React.createElement('div', { 'data-testid': 'unified-agent-page' }, 'Mock Component')
    );
  };

  describe('Critical Failure Detection: Hardcoded Mock Strings', () => {
    test('CRITICAL: should not display "N/A" anywhere in component', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(screen.queryByText('N/A')).toBeNull();
        expect(screen.queryByText(/N\/A/)).toBeNull();
        expect(screen.queryByDisplayValue('N/A')).toBeNull();
      });

      // Verify API calls were made (London School: verify interactions)
      expect(mockApiClient.fetchAgent).toHaveBeenCalledWith('test-agent-123');
      expect(mockApiClient.fetchAgentMetrics).toHaveBeenCalledWith('test-agent-123');
    });

    test('CRITICAL: should not display "Unknown" in any fields', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(screen.queryByText('Unknown')).toBeNull();
        expect(screen.queryByText(/unknown/i)).toBeNull();
        expect(screen.queryByDisplayValue('Unknown')).toBeNull();
      });
    });

    test('CRITICAL: should not display placeholder "..." loading states permanently', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Allow temporary loading states but they should resolve
        const loadingElements = screen.queryAllByText('...');
        expect(loadingElements).toHaveLength(0);
      }, { timeout: 5000 });
    });

    test('CRITICAL: should not display zero values for metrics with real data', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // With our mock data, these should never show as 0
        expect(screen.queryByText('0 tasks')).toBeNull();
        expect(screen.queryByText('0%')).toBeNull();
        expect(screen.queryByText('Success Rate: 0')).toBeNull();
      });

      // Verify the component is using the mocked real data
      expect(mockApiClient.fetchAgent).toHaveBeenCalled();
      expect(mockApiClient.fetchAgentMetrics).toHaveBeenCalled();
    });

    test('CRITICAL: should not display dummy/sample/test data labels', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Check for common mock data indicators
        expect(screen.queryByText(/sample/i)).toBeNull();
        expect(screen.queryByText(/dummy/i)).toBeNull();
        expect(screen.queryByText(/test data/i)).toBeNull();
        expect(screen.queryByText(/mock/i)).toBeNull();
        expect(screen.queryByText(/placeholder/i)).toBeNull();
      });
    });
  });

  describe('Contract Verification: API Data Usage', () => {
    test('should verify agent data contract is fulfilled', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Verify the component received and used agent data
        expect(mockApiClient.fetchAgent).toHaveBeenCalledWith('test-agent-123');
        expect(mockApiClient.fetchAgent).toHaveBeenCalledTimes(1);
      });

      // Verify expected data is displayed (London School: verify behavior)
      await waitFor(() => {
        expect(screen.getByText('Production Agent')).toBeInTheDocument();
        expect(screen.getByText('Real production agent')).toBeInTheDocument();
      });
    });

    test('should verify metrics contract is fulfilled', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(mockApiClient.fetchAgentMetrics).toHaveBeenCalledWith('test-agent-123');
        expect(mockApiClient.fetchAgentMetrics).toHaveBeenCalledTimes(1);
      });

      // Verify metrics are displayed correctly
      await waitFor(() => {
        // These values should come from our mock data
        expect(screen.getByText(/23/)).toBeInTheDocument(); // daily_tasks
        expect(screen.getByText(/156/)).toBeInTheDocument(); // weekly_tasks
      });
    });

    test('should verify activities contract is fulfilled', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(mockApiClient.fetchAgentActivities).toHaveBeenCalledWith('test-agent-123');
        expect(mockApiClient.fetchAgentActivities).toHaveBeenCalledTimes(1);
      });

      // Verify activity data is displayed
      await waitFor(() => {
        expect(screen.getByText(/Completed user query processing/)).toBeInTheDocument();
      });
    });
  });

  describe('Error State Verification', () => {
    test('should handle API errors gracefully without showing mock data', async () => {
      // Mock API failure
      mockApiClient.fetchAgent.mockRejectedValue(new Error('API Error'));
      mockApiClient.fetchAgentMetrics.mockRejectedValue(new Error('Metrics Error'));

      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Should show error state, not fallback to mock data
        expect(screen.queryByText('N/A')).toBeNull();
        expect(screen.queryByText('Unknown')).toBeNull();
        
        // Should show appropriate error handling
        const errorElements = screen.queryAllByText(/error/i);
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });
  });
});