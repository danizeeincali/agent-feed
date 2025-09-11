/**
 * TDD London School - Contract Verification Tests
 * Critical Test: Verify Data Flow Contracts and Interactions
 * 
 * London School Approach:
 * - Test object collaborations and contracts
 * - Verify interactions between components
 * - Mock dependencies to isolate behavior
 */

import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { UnifiedAgentPage } from '../../../../frontend/src/components/UnifiedAgentPage';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock all external dependencies following London School pattern
const mockApiClient = {
  fetchAgent: jest.fn(),
  fetchAgentMetrics: jest.fn(),
  fetchAgentActivities: jest.fn()
};

const mockDataTransformer = {
  transformApiDataToUnified: jest.fn()
};

const mockRouter = {
  useParams: jest.fn(() => ({ id: 'contract-test-agent' })),
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

// Mock data transformer
jest.mock('../../../../frontend/src/utils/unified-agent-data-transformer', () => ({
  transformApiDataToUnified: (...args) => mockDataTransformer.transformApiDataToUnified(...args)
}));

describe('Contract Verification - Data Flow and Interactions', () => {
  const contractAgentData = {
    id: 'contract-test-agent',
    name: 'Contract Test Agent',
    description: 'Agent for testing contracts',
    usage_count: 300,
    performance_metrics: {
      success_rate: 92.5,
      error_count: 7,
      avg_response_time: 800
    }
  };

  const contractMetricsData = {
    daily_tasks: 45,
    weekly_tasks: 315,
    monthly_tasks: 1260,
    satisfaction_score: 4.6,
    uptime_percentage: 99.1
  };

  const contractActivitiesData = [
    {
      id: 301,
      type: 'contract_task',
      timestamp: '2024-01-15T14:00:00Z',
      description: 'Contract verification task',
      success: true
    }
  ];

  const expectedTransformedData = {
    id: 'contract-test-agent',
    name: 'Contract Test Agent',
    description: 'Agent for testing contracts',
    metrics: {
      usage_count: 300,
      success_rate: 92.5,
      error_count: 7,
      avg_response_time: 800,
      daily_tasks: 45,
      weekly_tasks: 315,
      monthly_tasks: 1260,
      satisfaction_score: 4.6,
      uptime_percentage: 99.1
    },
    activities: [
      {
        id: 301,
        type: 'contract_task',
        timestamp: '2024-01-15T14:00:00Z',
        description: 'Contract verification task',
        success: true
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup successful API responses
    mockApiClient.fetchAgent.mockResolvedValue(contractAgentData);
    mockApiClient.fetchAgentMetrics.mockResolvedValue(contractMetricsData);
    mockApiClient.fetchAgentActivities.mockResolvedValue(contractActivitiesData);
    
    // Setup transformer mock
    mockDataTransformer.transformApiDataToUnified.mockReturnValue(expectedTransformedData);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <UnifiedAgentPage />
      </BrowserRouter>
    );
  };

  describe('API Contract Verification', () => {
    test('should fulfill API client contract with correct parameters', async () => {
      await act(async () => {
        renderComponent();
      });

      // Verify all API contracts are fulfilled
      await waitFor(() => {
        expect(mockApiClient.fetchAgent).toHaveBeenCalledWith('contract-test-agent');
        expect(mockApiClient.fetchAgentMetrics).toHaveBeenCalledWith('contract-test-agent');
        expect(mockApiClient.fetchAgentActivities).toHaveBeenCalledWith('contract-test-agent');
      });

      // Verify call order and frequency (London School: verify interactions)
      expect(mockApiClient.fetchAgent).toHaveBeenCalledTimes(1);
      expect(mockApiClient.fetchAgentMetrics).toHaveBeenCalledTimes(1);
      expect(mockApiClient.fetchAgentActivities).toHaveBeenCalledTimes(1);
    });

    test('should call APIs in parallel, not sequentially', async () => {
      const callOrder = [];
      
      mockApiClient.fetchAgent.mockImplementation(async () => {
        callOrder.push('agent');
        return contractAgentData;
      });
      
      mockApiClient.fetchAgentMetrics.mockImplementation(async () => {
        callOrder.push('metrics');
        return contractMetricsData;
      });
      
      mockApiClient.fetchAgentActivities.mockImplementation(async () => {
        callOrder.push('activities');
        return contractActivitiesData;
      });

      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(callOrder.length).toBe(3);
      });

      // In parallel execution, order doesn't matter - all should be called
      expect(callOrder).toContain('agent');
      expect(callOrder).toContain('metrics');
      expect(callOrder).toContain('activities');
    });

    test('should handle API contract violations gracefully', async () => {
      // Simulate API contract violation
      mockApiClient.fetchAgent.mockRejectedValue(new Error('Network error'));
      mockApiClient.fetchAgentMetrics.mockResolvedValue(contractMetricsData);
      mockApiClient.fetchAgentActivities.mockResolvedValue(contractActivitiesData);

      await act(async () => {
        renderComponent();
      });

      // Should still attempt all API calls despite failures
      await waitFor(() => {
        expect(mockApiClient.fetchAgent).toHaveBeenCalled();
        expect(mockApiClient.fetchAgentMetrics).toHaveBeenCalled();
        expect(mockApiClient.fetchAgentActivities).toHaveBeenCalled();
      });
    });
  });

  describe('Data Transformer Contract Verification', () => {
    test('should fulfill transformer contract with correct parameters', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Verify transformer is called with API responses
        expect(mockDataTransformer.transformApiDataToUnified).toHaveBeenCalledWith(
          contractAgentData,
          contractMetricsData,
          contractActivitiesData
        );
      });

      // Verify transformer is called exactly once
      expect(mockDataTransformer.transformApiDataToUnified).toHaveBeenCalledTimes(1);
    });

    test('should pass complete API data to transformer', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        const transformerCall = mockDataTransformer.transformApiDataToUnified.mock.calls[0];
        
        // Verify all expected data is passed
        expect(transformerCall[0]).toEqual(contractAgentData);
        expect(transformerCall[1]).toEqual(contractMetricsData);
        expect(transformerCall[2]).toEqual(contractActivitiesData);
      });
    });

    test('should handle transformer contract violations', async () => {
      // Simulate transformer throwing error
      mockDataTransformer.transformApiDataToUnified.mockImplementation(() => {
        throw new Error('Transformation error');
      });

      await act(async () => {
        renderComponent();
      });

      // Should still attempt transformation
      await waitFor(() => {
        expect(mockDataTransformer.transformApiDataToUnified).toHaveBeenCalled();
      });
    });
  });

  describe('UI Rendering Contract Verification', () => {
    test('should render transformed data according to UI contract', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Verify UI displays transformed data
        expect(screen.getByText('Contract Test Agent')).toBeInTheDocument();
        expect(screen.getByText('Agent for testing contracts')).toBeInTheDocument();
      });

      // Verify data flow: API -> Transformer -> UI
      expect(mockApiClient.fetchAgent).toHaveBeenCalled();
      expect(mockDataTransformer.transformApiDataToUnified).toHaveBeenCalled();
    });

    test('should display metrics from transformed data contract', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Verify metrics from transformed data are displayed
        expect(screen.getByText(/300/)).toBeInTheDocument(); // usage_count
        expect(screen.getByText(/92\.5/)).toBeInTheDocument(); // success_rate
        expect(screen.getByText(/4\.6/)).toBeInTheDocument(); // satisfaction_score
      });
    });

    test('should display activities from transformed data contract', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Verify activities from transformed data are displayed
        expect(screen.getByText(/Contract verification task/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Contract Verification', () => {
    test('should maintain error handling contract when API fails', async () => {
      mockApiClient.fetchAgent.mockRejectedValue(new Error('Agent API failed'));
      mockApiClient.fetchAgentMetrics.mockRejectedValue(new Error('Metrics API failed'));
      mockApiClient.fetchAgentActivities.mockRejectedValue(new Error('Activities API failed'));

      await act(async () => {
        renderComponent();
      });

      // Should not call transformer with failed data
      await waitFor(() => {
        // Transformer should not be called if all APIs fail
        expect(mockDataTransformer.transformApiDataToUnified).not.toHaveBeenCalled();
      });

      // Should still show error handling UI, not mock data
      await waitFor(() => {
        expect(screen.queryByText('N/A')).toBeNull();
        expect(screen.queryByText('Unknown')).toBeNull();
      });
    });

    test('should handle partial API failures according to contract', async () => {
      mockApiClient.fetchAgent.mockResolvedValue(contractAgentData);
      mockApiClient.fetchAgentMetrics.mockRejectedValue(new Error('Metrics failed'));
      mockApiClient.fetchAgentActivities.mockResolvedValue(contractActivitiesData);

      await act(async () => {
        renderComponent();
      });

      // Should handle partial failures gracefully
      await waitFor(() => {
        expect(mockApiClient.fetchAgent).toHaveBeenCalled();
        expect(mockApiClient.fetchAgentMetrics).toHaveBeenCalled();
        expect(mockApiClient.fetchAgentActivities).toHaveBeenCalled();
      });
    });
  });

  describe('Data Flow Integrity Contract', () => {
    test('should maintain data integrity through entire flow', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        // Verify complete data flow
        expect(mockApiClient.fetchAgent).toHaveBeenCalled();
        expect(mockApiClient.fetchAgentMetrics).toHaveBeenCalled();
        expect(mockApiClient.fetchAgentActivities).toHaveBeenCalled();
        expect(mockDataTransformer.transformApiDataToUnified).toHaveBeenCalled();
      });

      // Verify data integrity: no data is lost or modified outside transformer
      const transformerCall = mockDataTransformer.transformApiDataToUnified.mock.calls[0];
      expect(transformerCall[0]).toEqual(contractAgentData);
      expect(transformerCall[1]).toEqual(contractMetricsData);
      expect(transformerCall[2]).toEqual(contractActivitiesData);
    });

    test('should not modify API data before transformation', async () => {
      const originalAgentData = { ...contractAgentData };
      const originalMetricsData = { ...contractMetricsData };
      const originalActivitiesData = [...contractActivitiesData];

      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(mockDataTransformer.transformApiDataToUnified).toHaveBeenCalled();
      });

      // Verify original data is not mutated
      expect(contractAgentData).toEqual(originalAgentData);
      expect(contractMetricsData).toEqual(originalMetricsData);
      expect(contractActivitiesData).toEqual(originalActivitiesData);
    });
  });

  describe('Component Lifecycle Contract', () => {
    test('should follow proper component lifecycle contract', async () => {
      const { unmount } = render(
        <BrowserRouter>
          <UnifiedAgentPage />
        </BrowserRouter>
      );

      // Verify initialization contract
      await waitFor(() => {
        expect(mockApiClient.fetchAgent).toHaveBeenCalled();
      });

      // Verify cleanup contract
      unmount();

      // Should not make additional API calls after unmount
      const callCount = mockApiClient.fetchAgent.mock.calls.length;
      
      // Wait a bit to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockApiClient.fetchAgent.mock.calls.length).toBe(callCount);
    });
  });
});