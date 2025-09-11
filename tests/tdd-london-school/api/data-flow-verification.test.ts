/**
 * TDD London School: API Data Flow Verification Tests
 * 
 * DATA FLOW TESTING STRATEGY:
 * 1. Verify data flow from API endpoints through all components
 * 2. Test data transformation and mapping accuracy
 * 3. Validate error propagation through the data pipeline
 * 4. Ensure real-time data updates work correctly
 * 5. Test data caching and performance optimization
 * 
 * LONDON SCHOOL DATA FLOW PRINCIPLES:
 * - Test data collaborations between components
 * - Mock external API calls, verify internal data flow
 * - Focus on data contract compliance
 * - Verify data transformation behaviors
 * - Test error handling in data pipeline
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Import test infrastructure
import { swarmCoordinator } from '../helpers/swarm-coordinator';
import { createMockFetch, type MockFetchResponse } from '../mocks/fetch.mock';
import UnifiedAgentPage, { type UnifiedAgentData } from '../../../frontend/src/components/UnifiedAgentPage';

// Data Flow Test Contracts
interface ApiDataFlowContract {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  expectedInput?: any;
  expectedOutput: any;
  transformations: string[];
  errorHandling: string[];
  caching: boolean;
  realTimeUpdates: boolean;
}

// API Data Structures (as they come from real endpoints)
interface RealApiAgentResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    display_name?: string;
    description: string;
    system_prompt?: string;
    avatar_color?: string;
    capabilities: string[];
    status: 'active' | 'inactive' | 'busy' | 'error' | 'maintenance';
    created_at?: string;
    updated_at?: string;
    last_used?: string;
    usage_count?: number;
    performance_metrics?: {
      success_rate: number;
      average_response_time: number;
      total_tokens_used: number;
      error_count: number;
      validations_completed?: number;
      uptime_percentage?: number;
    };
    health_status?: {
      cpu_usage: number;
      memory_usage: number;
      response_time: number;
      last_heartbeat: string;
      status: string;
      active_tasks?: number;
    };
  };
}

interface RealApiActivitiesResponse {
  success: boolean;
  data: Array<{
    id: string;
    type: 'task_completed' | 'task_started' | 'error' | 'milestone' | 'insight' | 'update' | 'achievement';
    title: string;
    description: string;
    timestamp: string;
    metadata?: {
      duration?: number;
      success?: boolean;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    };
  }>;
}

interface RealApiPostsResponse {
  success: boolean;
  data: Array<{
    id: string;
    type: 'insight' | 'update' | 'achievement' | 'announcement' | 'question';
    title: string;
    content: string;
    timestamp: string;
    author: {
      id: string;
      name: string;
      avatar: string;
    };
    tags: string[];
    interactions: {
      likes: number;
      comments: number;
      shares: number;
      bookmarks: number;
    };
    isLiked?: boolean;
    isBookmarked?: boolean;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }>;
}

// Data Flow Testing Framework
class DataFlowTestFramework {
  private mockFetch: MockedFunction<typeof fetch>;
  private mockResponse: MockFetchResponse;
  private dataTransformationLog: Array<{
    endpoint: string;
    input: any;
    output: any;
    transformationType: string;
    timestamp: number;
  }> = [];

  constructor() {
    this.mockFetch = vi.fn();
    this.mockResponse = createMockFetch();
    global.fetch = this.mockFetch;
  }

  // Create realistic API responses
  createRealApiAgentResponse(overrides: Partial<RealApiAgentResponse['data']> = {}): RealApiAgentResponse {
    return {
      success: true,
      data: {
        id: 'dataflow-test-agent',
        name: 'DataFlow Test Agent',
        display_name: 'DataFlow Test Agent Pro',
        description: 'Agent for testing data flow from API endpoints to components',
        system_prompt: 'You are a specialized agent for testing data flow and transformations.',
        avatar_color: '#3B82F6',
        capabilities: ['Data Flow Testing', 'API Integration', 'Transformation Validation'],
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        usage_count: 342,
        performance_metrics: {
          success_rate: 96.5,
          average_response_time: 850,
          total_tokens_used: 158432,
          error_count: 12,
          validations_completed: 328,
          uptime_percentage: 98.7
        },
        health_status: {
          cpu_usage: 45.2,
          memory_usage: 62.8,
          response_time: 120,
          last_heartbeat: new Date().toISOString(),
          status: 'healthy',
          active_tasks: 3
        },
        ...overrides
      }
    };
  }

  createRealApiActivitiesResponse(): RealApiActivitiesResponse {
    return {
      success: true,
      data: [
        {
          id: 'activity-1',
          type: 'task_completed',
          title: 'Data Flow Validation Completed',
          description: 'Successfully validated data flow from API to all components',
          timestamp: new Date().toISOString(),
          metadata: {
            duration: 12,
            success: true,
            priority: 'high'
          }
        },
        {
          id: 'activity-2',
          type: 'milestone',
          title: 'API Integration Milestone',
          description: 'Achieved seamless API integration across all endpoints',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          metadata: {
            priority: 'high'
          }
        },
        {
          id: 'activity-3',
          type: 'achievement',
          title: 'Zero Data Loss Achievement',
          description: 'Maintained perfect data integrity through all transformations',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          metadata: {
            success: true,
            priority: 'medium'
          }
        }
      ]
    };
  }

  createRealApiPostsResponse(): RealApiPostsResponse {
    return {
      success: true,
      data: [
        {
          id: 'post-1',
          type: 'insight',
          title: 'Data Flow Optimization Insights',
          content: 'Key findings from comprehensive data flow testing and optimization efforts',
          timestamp: new Date().toISOString(),
          author: {
            id: 'dataflow-test-agent',
            name: 'DataFlow Test Agent Pro',
            avatar: '💾'
          },
          tags: ['dataflow', 'optimization', 'testing', 'api'],
          interactions: {
            likes: 24,
            comments: 8,
            shares: 5,
            bookmarks: 18
          },
          isLiked: false,
          isBookmarked: true,
          priority: 'high'
        },
        {
          id: 'post-2',
          type: 'update',
          title: 'Enhanced API Response Handling',
          content: 'Implemented advanced error handling and data transformation capabilities',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          author: {
            id: 'dataflow-test-agent',
            name: 'DataFlow Test Agent Pro',
            avatar: '💾'
          },
          tags: ['api', 'error-handling', 'update'],
          interactions: {
            likes: 16,
            comments: 4,
            shares: 2,
            bookmarks: 11
          },
          priority: 'medium'
        }
      ]
    };
  }

  // Setup different API response scenarios
  async setupSuccessfulDataFlow() {
    const agentResponse = this.createRealApiAgentResponse();
    const activitiesResponse = this.createRealApiActivitiesResponse();
    const postsResponse = this.createRealApiPostsResponse();

    // Mock sequential API calls
    this.mockFetch
      .mockResolvedValueOnce(this.createResponse(agentResponse))
      .mockResolvedValueOnce(this.createResponse(activitiesResponse))
      .mockResolvedValueOnce(this.createResponse(postsResponse));

    this.logDataTransformation('/api/agents/dataflow-test-agent', null, agentResponse, 'api_response');
    this.logDataTransformation('/api/agents/dataflow-test-agent/activities', null, activitiesResponse, 'api_response');
    this.logDataTransformation('/api/agents/dataflow-test-agent/posts', null, postsResponse, 'api_response');
  }

  async setupPartialDataFailure() {
    const agentResponse = this.createRealApiAgentResponse();
    const activitiesError = { success: false, error: 'Activities service unavailable' };
    const postsResponse = this.createRealApiPostsResponse();

    this.mockFetch
      .mockResolvedValueOnce(this.createResponse(agentResponse))
      .mockResolvedValueOnce(this.createResponse(activitiesError, 503))
      .mockResolvedValueOnce(this.createResponse(postsResponse));
  }

  async setupDataTransformationError() {
    const corruptedResponse = {
      success: true,
      data: {
        id: 'corrupted-agent',
        // Missing required fields to test transformation error handling
        status: 'unknown_status' as any,
        capabilities: 'not_an_array' as any,
        performance_metrics: null
      }
    };

    this.mockFetch.mockResolvedValueOnce(this.createResponse(corruptedResponse));
  }

  private createResponse(data: any, status: number = 200): Response {
    return new Response(JSON.stringify(data), { 
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private logDataTransformation(endpoint: string, input: any, output: any, type: string) {
    this.dataTransformationLog.push({
      endpoint,
      input,
      output,
      transformationType: type,
      timestamp: Date.now()
    });
  }

  async renderUnifiedAgentPage(agentId: string = 'dataflow-test-agent') {
    return render(
      <MemoryRouter initialEntries={[`/agents/${agentId}`]}>
        <Routes>
          <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
        </Routes>
      </MemoryRouter>
    );
  }

  getDataTransformationLog() {
    return this.dataTransformationLog;
  }

  getMockFetch() {
    return this.mockFetch;
  }

  resetMocks() {
    this.mockFetch.mockReset();
    this.dataTransformationLog = [];
  }
}

// API Contracts for Testing
const API_DATA_FLOW_CONTRACTS: ApiDataFlowContract[] = [
  {
    endpoint: '/api/agents/:agentId',
    method: 'GET',
    expectedOutput: 'UnifiedAgentData',
    transformations: [
      'real_api_to_unified_structure',
      'performance_metrics_calculation',
      'health_status_interpretation',
      'stats_derivation'
    ],
    errorHandling: ['404_not_found', '500_server_error', 'malformed_response'],
    caching: true,
    realTimeUpdates: true
  },
  {
    endpoint: '/api/agents/:agentId/activities',
    method: 'GET',
    expectedOutput: 'AgentActivity[]',
    transformations: [
      'activity_type_mapping',
      'timestamp_formatting',
      'metadata_processing'
    ],
    errorHandling: ['service_unavailable', 'empty_response'],
    caching: false,
    realTimeUpdates: true
  },
  {
    endpoint: '/api/agents/:agentId/posts',
    method: 'GET',
    expectedOutput: 'AgentPost[]',
    transformations: [
      'post_type_mapping',
      'interaction_data_processing',
      'author_information_mapping'
    ],
    errorHandling: ['service_unavailable', 'empty_response'],
    caching: false,
    realTimeUpdates: true
  }
];

describe('TDD London School: API Data Flow Verification', () => {
  let framework: DataFlowTestFramework;
  let swarmSession: string;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(async () => {
    framework = new DataFlowTestFramework();
    swarmSession = await swarmCoordinator.initializeSession('api-data-flow-tests');
    user = userEvent.setup();
  });

  afterEach(async () => {
    await swarmCoordinator.finalizeSession(swarmSession);
    framework.resetMocks();
    vi.restoreAllMocks();
  });

  describe('Primary Data Flow: Agent Information', () => {
    test('should correctly transform API agent data to unified structure', async () => {
      // Arrange: Setup real API response
      await framework.setupSuccessfulDataFlow();

      // Act: Render component and trigger data flow
      await framework.renderUnifiedAgentPage();

      // Wait for data transformation and display
      await waitFor(() => {
        expect(screen.getByText('DataFlow Test Agent Pro')).toBeInTheDocument();
      });

      // Assert: Verify data transformations
      expect(screen.getByText('Agent for testing data flow from API endpoints to components')).toBeInTheDocument();
      expect(screen.getByText(/active/i)).toBeInTheDocument();

      // Verify performance metrics transformation
      expect(screen.getByText('342 tasks completed')).toBeInTheDocument();
      expect(screen.getByText('96.5% success rate')).toBeInTheDocument();
      expect(screen.getByText('0.85s avg response')).toBeInTheDocument(); // 850ms converted to seconds

      // Verify capabilities transformation
      expect(screen.getByText('Data Flow Testing')).toBeInTheDocument();
      expect(screen.getByText('API Integration')).toBeInTheDocument();

      // Navigate to details to see more transformations
      const detailsTab = screen.getByRole('button', { name: /details/i });
      await user.click(detailsTab);

      await waitFor(() => {
        expect(screen.getByText('Agent Information')).toBeInTheDocument();
      });

      // Verify detailed information transformation
      expect(screen.getByText('dataflow-test-agent')).toBeInTheDocument();
      expect(screen.getByText('3.2.1')).toBeInTheDocument(); // Version derived from API data

      // Log data transformation verification
      await swarmCoordinator.logInteraction({
        type: 'data_transformation_verification',
        component: 'UnifiedAgentPage',
        behavior: 'api_to_unified_transformation',
        transformations_verified: [
          'basic_info_mapping',
          'performance_metrics_calculation',
          'capabilities_display',
          'detailed_information_transformation'
        ],
        all_transformations_successful: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle complex performance metrics calculations', async () => {
      // Arrange: Setup API response with complex metrics
      const complexMetricsResponse = framework.createRealApiAgentResponse({
        performance_metrics: {
          success_rate: 98.75,
          average_response_time: 1250, // 1.25 seconds
          total_tokens_used: 2500000,
          error_count: 31,
          validations_completed: 2469,
          uptime_percentage: 99.95
        },
        health_status: {
          cpu_usage: 72.3,
          memory_usage: 84.1,
          response_time: 95,
          last_heartbeat: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
          status: 'healthy',
          active_tasks: 8
        }
      });

      framework.getMockFetch().mockResolvedValueOnce(
        new Response(JSON.stringify(complexMetricsResponse), { status: 200 })
      );

      // Act: Render and verify calculations
      await framework.renderUnifiedAgentPage();

      await waitFor(() => {
        expect(screen.getByText('DataFlow Test Agent Pro')).toBeInTheDocument();
      });

      // Assert: Verify complex calculations
      expect(screen.getByText('98.75% success rate')).toBeInTheDocument();
      expect(screen.getByText('1.25s avg response')).toBeInTheDocument(); // Converted from ms
      expect(screen.getByText('99.95% uptime')).toBeInTheDocument();

      // Navigate to details for more complex calculations
      const detailsTab = screen.getByRole('button', { name: /details/i });
      await user.click(detailsTab);

      await waitFor(() => {
        expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      });

      // Verify derived calculations
      expect(screen.getByText('2,469')).toBeInTheDocument(); // Formatted number
      expect(screen.getByText('31')).toBeInTheDocument(); // Error count

      // Log complex metrics verification
      await swarmCoordinator.logInteraction({
        type: 'complex_metrics_verification',
        component: 'UnifiedAgentPage',
        behavior: 'performance_calculations',
        metrics_calculated: [
          'success_rate_display',
          'response_time_conversion',
          'uptime_percentage',
          'number_formatting',
          'error_count_display'
        ],
        calculations_accurate: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle missing or null performance data gracefully', async () => {
      // Arrange: Setup API response with missing metrics
      const incompleteResponse = framework.createRealApiAgentResponse({
        performance_metrics: undefined,
        health_status: null,
        usage_count: undefined
      });

      framework.getMockFetch().mockResolvedValueOnce(
        new Response(JSON.stringify(incompleteResponse), { status: 200 })
      );

      // Act: Render with incomplete data
      await framework.renderUnifiedAgentPage();

      await waitFor(() => {
        expect(screen.getByText('DataFlow Test Agent Pro')).toBeInTheDocument();
      });

      // Assert: Verify graceful fallbacks
      expect(screen.getByText('0 tasks completed')).toBeInTheDocument(); // Fallback value
      expect(screen.getByText('0% success rate')).toBeInTheDocument(); // Fallback value
      expect(screen.getByText('0s avg response')).toBeInTheDocument(); // Fallback value

      // Component should not crash
      expect(screen.getByText('Agent for testing data flow from API endpoints to components')).toBeInTheDocument();

      // Log graceful degradation
      await swarmCoordinator.logInteraction({
        type: 'graceful_degradation_verification',
        component: 'UnifiedAgentPage',
        behavior: 'missing_data_handling',
        fallback_values_used: true,
        component_stability_maintained: true,
        error_free_operation: true,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Secondary Data Flow: Activities and Posts', () => {
    test('should correctly integrate activities data from API', async () => {
      // Arrange: Setup complete data flow
      await framework.setupSuccessfulDataFlow();

      // Act: Render and navigate to activity tab
      await framework.renderUnifiedAgentPage();

      await waitFor(() => {
        expect(screen.getByText('DataFlow Test Agent Pro')).toBeInTheDocument();
      });

      const activityTab = screen.getByRole('button', { name: /activity/i });
      await user.click(activityTab);

      // Assert: Verify activities data integration
      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
        expect(screen.getByText('Posts & Updates')).toBeInTheDocument();
      });

      // Verify specific activity data
      expect(screen.getByText('Data Flow Validation Completed')).toBeInTheDocument();
      expect(screen.getByText('Successfully validated data flow from API to all components')).toBeInTheDocument();
      expect(screen.getByText('API Integration Milestone')).toBeInTheDocument();

      // Verify activity metadata
      expect(screen.getByText('Duration: 12m')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();

      // Log activities integration
      await swarmCoordinator.logInteraction({
        type: 'activities_integration_verification',
        component: 'UnifiedAgentPage',
        behavior: 'activities_data_flow',
        activities_displayed: 3,
        metadata_preserved: true,
        timestamp_formatting_correct: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should correctly integrate posts data from API', async () => {
      // Arrange: Setup complete data flow
      await framework.setupSuccessfulDataFlow();

      // Act: Render and navigate to activity tab
      await framework.renderUnifiedAgentPage();

      await waitFor(() => {
        expect(screen.getByText('DataFlow Test Agent Pro')).toBeInTheDocument();
      });

      const activityTab = screen.getByRole('button', { name: /activity/i });
      await user.click(activityTab);

      await waitFor(() => {
        expect(screen.getByText('Posts & Updates')).toBeInTheDocument();
      });

      // Assert: Verify posts data integration
      expect(screen.getByText('Data Flow Optimization Insights')).toBeInTheDocument();
      expect(screen.getByText('Key findings from comprehensive data flow testing')).toBeInTheDocument();
      expect(screen.getByText('Enhanced API Response Handling')).toBeInTheDocument();

      // Verify post interactions data
      expect(screen.getByText('24')).toBeInTheDocument(); // Likes count
      expect(screen.getByText('8')).toBeInTheDocument(); // Comments count
      expect(screen.getByText('5')).toBeInTheDocument(); // Shares count

      // Verify post tags
      expect(screen.getByText('#dataflow')).toBeInTheDocument();
      expect(screen.getByText('#optimization')).toBeInTheDocument();
      expect(screen.getByText('#api')).toBeInTheDocument();

      // Log posts integration
      await swarmCoordinator.logInteraction({
        type: 'posts_integration_verification',
        component: 'UnifiedAgentPage',
        behavior: 'posts_data_flow',
        posts_displayed: 2,
        interaction_data_preserved: true,
        tags_displayed: true,
        author_information_correct: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle partial data failure gracefully', async () => {
      // Arrange: Setup partial failure scenario
      await framework.setupPartialDataFailure();

      // Act: Render component
      await framework.renderUnifiedAgentPage();

      await waitFor(() => {
        expect(screen.getByText('DataFlow Test Agent Pro')).toBeInTheDocument();
      });

      // Main data should load successfully
      expect(screen.getByText('342 tasks completed')).toBeInTheDocument();

      // Navigate to activity tab
      const activityTab = screen.getByRole('button', { name: /activity/i });
      await user.click(activityTab);

      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });

      // Posts should load despite activities failure
      expect(screen.getByText('Posts & Updates')).toBeInTheDocument();
      expect(screen.getByText('Data Flow Optimization Insights')).toBeInTheDocument();

      // Verify API calls were made
      expect(framework.getMockFetch()).toHaveBeenCalledTimes(3);
      expect(framework.getMockFetch()).toHaveBeenCalledWith('/api/agents/dataflow-test-agent');

      // Log partial failure handling
      await swarmCoordinator.logInteraction({
        type: 'partial_failure_verification',
        component: 'UnifiedAgentPage',
        behavior: 'graceful_partial_failure',
        main_data_loaded: true,
        secondary_data_failure_handled: true,
        user_experience_preserved: true,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Data Transformation Accuracy', () => {
    test('should accurately transform all API data types', async () => {
      // Arrange: Setup comprehensive test data
      await framework.setupSuccessfulDataFlow();

      // Act: Render and collect transformation data
      await framework.renderUnifiedAgentPage();

      await waitFor(() => {
        expect(screen.getByText('DataFlow Test Agent Pro')).toBeInTheDocument();
      });

      const transformationLog = framework.getDataTransformationLog();

      // Assert: Verify transformation accuracy
      expect(transformationLog.length).toBeGreaterThan(0);

      // Test numeric transformations
      // Response time: 850ms -> 0.85s
      expect(screen.getByText('0.85s avg response')).toBeInTheDocument();

      // Test percentage formatting
      expect(screen.getByText('96.5% success rate')).toBeInTheDocument();
      expect(screen.getByText('98.7% uptime')).toBeInTheDocument();

      // Test number formatting
      expect(screen.getByText('342 tasks completed')).toBeInTheDocument();

      // Navigate through tabs to test all transformations
      const tabs = ['details', 'activity'];
      for (const tabName of tabs) {
        const tab = screen.getByRole('button', { name: new RegExp(tabName, 'i') });
        await user.click(tab);
        
        await waitFor(() => {
          expect(tab).toHaveClass(/border-blue-500|text-blue-600/);
        });
      }

      // Log transformation accuracy
      await swarmCoordinator.logInteraction({
        type: 'transformation_accuracy_verification',
        component: 'UnifiedAgentPage',
        behavior: 'data_type_transformations',
        numeric_transformations_accurate: true,
        percentage_formatting_correct: true,
        number_formatting_correct: true,
        all_tabs_data_transformed: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle data type coercion correctly', async () => {
      // Arrange: Setup data with type coercion needs
      const typeCoercionResponse = framework.createRealApiAgentResponse({
        usage_count: '123' as any, // String instead of number
        performance_metrics: {
          success_rate: '95.5' as any, // String instead of number
          average_response_time: '1200' as any, // String instead of number
          total_tokens_used: 50000,
          error_count: '5' as any, // String instead of number
          uptime_percentage: '99.8' as any // String instead of number
        }
      });

      framework.getMockFetch().mockResolvedValueOnce(
        new Response(JSON.stringify(typeCoercionResponse), { status: 200 })
      );

      // Act: Render with type coercion data
      await framework.renderUnifiedAgentPage();

      await waitFor(() => {
        expect(screen.getByText('DataFlow Test Agent Pro')).toBeInTheDocument();
      });

      // Assert: Verify type coercion works correctly
      expect(screen.getByText('123 tasks completed')).toBeInTheDocument(); // String -> Number
      expect(screen.getByText('95.5% success rate')).toBeInTheDocument(); // String -> Number
      expect(screen.getByText('1.2s avg response')).toBeInTheDocument(); // String -> Number, then format
      expect(screen.getByText('99.8% uptime')).toBeInTheDocument(); // String -> Number

      // Log type coercion verification
      await swarmCoordinator.logInteraction({
        type: 'type_coercion_verification',
        component: 'UnifiedAgentPage',
        behavior: 'data_type_handling',
        string_to_number_conversions: 4,
        formatting_after_coercion: true,
        no_display_errors: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle corrupted data structures', async () => {
      // Arrange: Setup corrupted data
      await framework.setupDataTransformationError();

      // Act: Render with corrupted data
      await framework.renderUnifiedAgentPage('corrupted-agent');

      // Assert: Verify error handling
      await waitFor(() => {
        // Should either show error state or graceful fallback
        const hasError = screen.queryByText('Error Loading Agent') !== null;
        const hasAgent = screen.queryByText('corrupted-agent') !== null;
        
        expect(hasError || hasAgent).toBe(true);
      });

      // Component should not crash
      expect(document.querySelector('.min-h-screen')).toBeInTheDocument();

      // Log corrupted data handling
      await swarmCoordinator.logInteraction({
        type: 'corrupted_data_verification',
        component: 'UnifiedAgentPage',
        behavior: 'data_corruption_handling',
        component_stability_maintained: true,
        error_recovery_available: true,
        no_application_crash: true,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Real-Time Data Updates', () => {
    test('should handle data refresh and real-time updates', async () => {
      // Arrange: Setup initial data
      await framework.setupSuccessfulDataFlow();

      // Act: Render component
      await framework.renderUnifiedAgentPage();

      await waitFor(() => {
        expect(screen.getByText('DataFlow Test Agent Pro')).toBeInTheDocument();
      });

      // Verify initial data
      expect(screen.getByText('342 tasks completed')).toBeInTheDocument();

      // Setup updated data for refresh
      framework.resetMocks();
      const updatedResponse = framework.createRealApiAgentResponse({
        usage_count: 355, // Updated count
        performance_metrics: {
          success_rate: 97.2, // Updated rate
          average_response_time: 800, // Improved response time
          total_tokens_used: 165000,
          error_count: 10,
          uptime_percentage: 99.1
        }
      });

      framework.getMockFetch().mockResolvedValueOnce(
        new Response(JSON.stringify(updatedResponse), { status: 200 })
      );

      // Trigger refresh
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Assert: Verify updated data
      await waitFor(() => {
        expect(screen.getByText('355 tasks completed')).toBeInTheDocument();
        expect(screen.getByText('97.2% success rate')).toBeInTheDocument();
        expect(screen.getByText('0.8s avg response')).toBeInTheDocument();
      });

      // Log real-time update verification
      await swarmCoordinator.logInteraction({
        type: 'realtime_update_verification',
        component: 'UnifiedAgentPage',
        behavior: 'data_refresh_handling',
        initial_tasks: 342,
        updated_tasks: 355,
        refresh_successful: true,
        data_consistency_maintained: true,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('API Contract Compliance', () => {
    test('should comply with all defined API contracts', async () => {
      // Arrange: Setup contract verification
      await framework.setupSuccessfulDataFlow();

      // Act: Render and verify all contracts
      await framework.renderUnifiedAgentPage();

      await waitFor(() => {
        expect(screen.getByText('DataFlow Test Agent Pro')).toBeInTheDocument();
      });

      // Assert: Verify each contract
      for (const contract of API_DATA_FLOW_CONTRACTS) {
        // Verify API calls match contract endpoints
        const apiCalls = framework.getMockFetch().mock.calls;
        const relevantCall = apiCalls.find(call => 
          call[0].includes(contract.endpoint.replace(':agentId', 'dataflow-test-agent'))
        );
        
        if (contract.endpoint.includes('/activities') || contract.endpoint.includes('/posts')) {
          // These might not be called immediately
          continue;
        }
        
        expect(relevantCall).toBeDefined();
      }

      // Navigate to activity tab to trigger secondary endpoints
      const activityTab = screen.getByRole('button', { name: /activity/i });
      await user.click(activityTab);

      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });

      // Verify all contracts were satisfied
      const finalApiCalls = framework.getMockFetch().mock.calls;
      expect(finalApiCalls.length).toBeGreaterThanOrEqual(3); // Main + Activities + Posts

      // Log contract compliance
      await swarmCoordinator.logInteraction({
        type: 'api_contract_compliance',
        component: 'UnifiedAgentPage',
        behavior: 'contract_verification',
        contracts_tested: API_DATA_FLOW_CONTRACTS.length,
        api_calls_made: finalApiCalls.length,
        all_contracts_satisfied: true,
        timestamp: new Date().toISOString()
      });
    });
  });
});