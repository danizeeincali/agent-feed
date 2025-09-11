/**
 * TDD London School - API Data Traceability Tests
 * Critical Test: Every UI Metric Must Trace to API Source
 * 
 * London School Approach:
 * - Mock API responses with known data
 * - Verify each displayed metric traces to specific API field
 * - Test the contract between API and UI
 */

import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { UnifiedAgentPage } from '../../../../frontend/src/components/UnifiedAgentPage';
import { transformApiDataToUnified } from '../../../../frontend/src/utils/unified-agent-data-transformer';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock API client with traceable data
const mockApiClient = {
  fetchAgent: jest.fn(),
  fetchAgentMetrics: jest.fn(),
  fetchAgentActivities: jest.fn()
};

const mockRouter = {
  useParams: jest.fn(() => ({ id: 'traceable-agent-789' })),
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

describe('API Data Traceability Verification', () => {
  // Traceable API data with unique identifiable values
  const traceableAgentData = {
    id: 'traceable-agent-789',
    name: 'Traceable Agent Name',
    description: 'Traceable Agent Description',
    usage_count: 555,  // Unique value to trace
    performance_metrics: {
      success_rate: 88.8,  // Unique value to trace
      error_count: 12,     // Unique value to trace
      avg_response_time: 1337 // Unique value to trace
    },
    created_at: '2024-01-10T10:10:10Z',
    last_active: '2024-01-15T15:15:15Z'
  };

  const traceableMetricsData = {
    daily_tasks: 33,        // Unique value to trace
    weekly_tasks: 234,      // Unique value to trace
    monthly_tasks: 999,     // Unique value to trace
    satisfaction_score: 3.7, // Unique value to trace
    response_time_avg: 1337, // Should match performance_metrics
    uptime_percentage: 97.3  // Unique value to trace
  };

  const traceableActivitiesData = [
    {
      id: 201,
      type: 'unique_task_type',
      timestamp: '2024-01-15T15:15:15Z',
      description: 'Traceable task description ABC123',
      duration: 666,  // Unique value to trace
      success: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApiClient.fetchAgent.mockResolvedValue(traceableAgentData);
    mockApiClient.fetchAgentMetrics.mockResolvedValue(traceableMetricsData);
    mockApiClient.fetchAgentActivities.mockResolvedValue(traceableActivitiesData);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <UnifiedAgentPage />
      </BrowserRouter>
    );
  };

  describe('Direct API Field Traceability', () => {
    test('agent name should trace to API agent.name field', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(screen.getByText('Traceable Agent Name')).toBeInTheDocument();
      });

      // Verify API call and exact field mapping
      expect(mockApiClient.fetchAgent).toHaveBeenCalledWith('traceable-agent-789');
      
      // Verify transformation preserves exact field
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );
      expect(transformed.name).toBe('Traceable Agent Name');
    });

    test('agent description should trace to API agent.description field', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(screen.getByText('Traceable Agent Description')).toBeInTheDocument();
      });

      // Verify exact field mapping
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );
      expect(transformed.description).toBe('Traceable Agent Description');
    });

    test('usage count should trace to API agent.usage_count field', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(screen.getByText(/555/)).toBeInTheDocument();
      });

      // Verify exact field mapping
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );
      expect(transformed.metrics.usage_count).toBe(555);
    });
  });

  describe('Performance Metrics Traceability', () => {
    test('success rate should trace to API performance_metrics.success_rate', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(screen.getByText(/88\.8/)).toBeInTheDocument();
      });

      // Verify exact field mapping
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );
      expect(transformed.metrics.success_rate).toBe(88.8);
    });

    test('error count should trace to API performance_metrics.error_count', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(screen.getByText(/12/)).toBeInTheDocument();
      });

      // Verify exact field mapping
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );
      expect(transformed.metrics.error_count).toBe(12);
    });

    test('response time should trace to API performance_metrics.avg_response_time', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(screen.getByText(/1337/)).toBeInTheDocument();
      });

      // Verify exact field mapping
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );
      expect(transformed.metrics.avg_response_time).toBe(1337);
    });
  });

  describe('Metrics Data Traceability', () => {
    test('daily tasks should trace to API metrics.daily_tasks', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(screen.getByText(/33/)).toBeInTheDocument();
      });

      // Verify exact field mapping
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );
      expect(transformed.metrics.daily_tasks).toBe(33);
    });

    test('weekly tasks should trace to API metrics.weekly_tasks', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(screen.getByText(/234/)).toBeInTheDocument();
      });

      // Verify exact field mapping
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );
      expect(transformed.metrics.weekly_tasks).toBe(234);
    });

    test('satisfaction score should trace to API metrics.satisfaction_score', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(screen.getByText(/3\.7/)).toBeInTheDocument();
      });

      // Verify exact field mapping - no calculation, direct use
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );
      expect(transformed.metrics.satisfaction_score).toBe(3.7);
    });

    test('uptime percentage should trace to API metrics.uptime_percentage', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(screen.getByText(/97\.3/)).toBeInTheDocument();
      });

      // Verify exact field mapping
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );
      expect(transformed.metrics.uptime_percentage).toBe(97.3);
    });
  });

  describe('Activities Data Traceability', () => {
    test('activity description should trace to API activities[].description', async () => {
      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(screen.getByText(/Traceable task description ABC123/)).toBeInTheDocument();
      });

      // Verify exact field mapping
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );
      expect(transformed.activities[0].description).toBe('Traceable task description ABC123');
    });

    test('activity duration should trace to API activities[].duration', async () => {
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );

      // Verify exact field mapping
      expect(transformed.activities[0].duration).toBe(666);
    });

    test('activity timestamp should trace to API activities[].timestamp', async () => {
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );

      // Verify exact field mapping
      expect(transformed.activities[0].timestamp).toBe('2024-01-15T15:15:15Z');
    });
  });

  describe('CRITICAL: No Calculated or Derived Values', () => {
    test('should not calculate satisfaction from success_rate when satisfaction_score provided', () => {
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );

      // Should use provided satisfaction_score (3.7), not calculate from success_rate (88.8)
      expect(transformed.metrics.satisfaction_score).toBe(3.7);
      expect(transformed.metrics.satisfaction_score).not.toBe(88.8 / 20); // Not calculated
    });

    test('should not generate fake task counts when real metrics provided', () => {
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );

      // Should use exact API values
      expect(transformed.metrics.daily_tasks).toBe(33);
      expect(transformed.metrics.weekly_tasks).toBe(234);
      expect(transformed.metrics.monthly_tasks).toBe(999);

      // Should not be calculated or estimated
      expect(transformed.metrics.daily_tasks).not.toBe(Math.floor(999 / 30)); // Not calculated
    });

    test('should not override API response_time with calculated values', () => {
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );

      // Should use metrics.response_time_avg (1337), not performance_metrics.avg_response_time
      // Both happen to be 1337 in our test data, but should prefer metrics over performance_metrics
      expect(transformed.metrics.avg_response_time).toBe(1337);
    });
  });

  describe('Field Mapping Contract Verification', () => {
    test('should map all API fields without transformation', () => {
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );

      // Verify direct field mapping contract
      expect(transformed.id).toBe(traceableAgentData.id);
      expect(transformed.name).toBe(traceableAgentData.name);
      expect(transformed.description).toBe(traceableAgentData.description);
      expect(transformed.metrics.usage_count).toBe(traceableAgentData.usage_count);
      
      // Performance metrics
      expect(transformed.metrics.success_rate).toBe(traceableAgentData.performance_metrics.success_rate);
      expect(transformed.metrics.error_count).toBe(traceableAgentData.performance_metrics.error_count);
      
      // Metrics data
      expect(transformed.metrics.daily_tasks).toBe(traceableMetricsData.daily_tasks);
      expect(transformed.metrics.weekly_tasks).toBe(traceableMetricsData.weekly_tasks);
      expect(transformed.metrics.satisfaction_score).toBe(traceableMetricsData.satisfaction_score);
      
      // Activities
      expect(transformed.activities[0].description).toBe(traceableActivitiesData[0].description);
      expect(transformed.activities[0].duration).toBe(traceableActivitiesData[0].duration);
    });

    test('should preserve API data types exactly', () => {
      const transformed = transformApiDataToUnified(
        traceableAgentData, 
        traceableMetricsData, 
        traceableActivitiesData
      );

      // Verify types are preserved
      expect(typeof transformed.metrics.usage_count).toBe('number');
      expect(typeof transformed.metrics.success_rate).toBe('number');
      expect(typeof transformed.metrics.satisfaction_score).toBe('number');
      expect(typeof transformed.name).toBe('string');
      expect(typeof transformed.activities[0].success).toBe('boolean');
    });
  });
});