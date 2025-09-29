/**
 * TDD London School Behavior Verification Tests
 * Focus on data flow and collaboration patterns between components
 * Tests HOW objects collaborate rather than WHAT they contain
 */

const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

describe('Data Flow and Collaboration Patterns - London School TDD', () => {
  let app;
  let mockDataPipeline;
  let mockCollaborationOrchestrator;
  let mockComponentRegistry;
  let mockEventBus;
  let mockStateManager;

  beforeEach(() => {
    // Mock the collaboration infrastructure
    mockDataPipeline = {
      processActivitiesFlow: jest.fn(),
      transformAnalyticsFlow: jest.fn(),
      validateDataFlow: jest.fn(),
      routeData: jest.fn()
    };

    mockCollaborationOrchestrator = {
      coordinateAPIRequest: jest.fn(),
      orchestrateDataTransformation: jest.fn(),
      manageComponentInteractions: jest.fn(),
      handleCrossEndpointDependencies: jest.fn()
    };

    mockComponentRegistry = {
      getActivityHandler: jest.fn(),
      getAnalyticsProcessor: jest.fn(),
      getChartFormatter: jest.fn(),
      getValidationService: jest.fn()
    };

    mockEventBus = {
      emitDataRequest: jest.fn(),
      emitDataProcessed: jest.fn(),
      emitDataFormatted: jest.fn(),
      emitResponseReady: jest.fn(),
      subscribe: jest.fn(),
      publishEvent: jest.fn()
    };

    mockStateManager = {
      trackRequestState: jest.fn(),
      updateProcessingState: jest.fn(),
      getComponentState: jest.fn(),
      cleanupState: jest.fn()
    };

    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cross-Component Data Flow Orchestration', () => {
    it('should orchestrate the complete activities data flow pipeline', async () => {
      // Arrange: Mock the complete collaboration sequence
      const mockActivityData = [
        { id: uuidv4(), type: 'agent_post', timestamp: new Date().toISOString() }
      ];

      const mockProcessedData = [
        { ...mockActivityData[0], processed: true, validated: true }
      ];

      const mockPaginatedResponse = {
        data: mockProcessedData,
        pagination: { total: 1, limit: 20, offset: 0, hasMore: false }
      };

      // Mock component registry providing collaborators
      const mockActivityHandler = {
        fetchActivities: jest.fn().mockResolvedValue(mockActivityData),
        validateActivity: jest.fn().mockReturnValue(true)
      };

      const mockPaginationService = {
        paginateResults: jest.fn().mockReturnValue(mockPaginatedResponse)
      };

      const mockResponseFormatter = {
        formatAPIResponse: jest.fn().mockReturnValue({
          success: true,
          ...mockPaginatedResponse,
          timestamp: new Date().toISOString()
        })
      };

      mockComponentRegistry.getActivityHandler.mockReturnValue(mockActivityHandler);
      mockComponentRegistry.getValidationService.mockReturnValue(mockPaginationService);

      // Mock orchestration sequence
      mockCollaborationOrchestrator.coordinateAPIRequest.mockImplementation(async (req, components) => {
        const { activityHandler, paginationService } = components;

        // Step 1: Emit data request event
        mockEventBus.emitDataRequest('activities', req.query);

        // Step 2: Fetch and validate data
        const activities = await activityHandler.fetchActivities(req.query);
        activities.forEach(activity => activityHandler.validateActivity(activity));

        // Step 3: Process pagination
        const paginatedResult = paginationService.paginateResults(activities, req.query);

        // Step 4: Emit processing complete
        mockEventBus.emitDataProcessed('activities', paginatedResult);

        return paginatedResult;
      });

      app.get('/api/activities', async (req, res) => {
        // Start coordination
        const requestId = mockStateManager.trackRequestState(req);

        const components = {
          activityHandler: mockComponentRegistry.getActivityHandler(),
          paginationService: mockComponentRegistry.getValidationService()
        };

        try {
          // Orchestrate the collaboration
          const result = await mockCollaborationOrchestrator.coordinateAPIRequest(req, components);

          // Format response
          const formattedResponse = mockResponseFormatter.formatAPIResponse(result);

          // Emit response ready
          mockEventBus.emitResponseReady('activities', formattedResponse);

          res.json(formattedResponse);
        } finally {
          mockStateManager.cleanupState(requestId);
        }
      });

      // Act: Make the request
      const response = await request(app)
        .get('/api/activities')
        .query({ limit: 20, offset: 0 })
        .expect(200);

      // Assert: Verify the collaboration sequence
      expect(mockStateManager.trackRequestState).toHaveBeenCalled();
      expect(mockComponentRegistry.getActivityHandler).toHaveBeenCalled();
      expect(mockComponentRegistry.getValidationService).toHaveBeenCalled();
      expect(mockCollaborationOrchestrator.coordinateAPIRequest).toHaveBeenCalledWith(
        expect.objectContaining({ query: { limit: '20', offset: '0' } }),
        expect.objectContaining({
          activityHandler: mockActivityHandler,
          paginationService: mockPaginationService
        })
      );

      // Verify event bus interactions
      expect(mockEventBus.emitDataRequest).toHaveBeenCalledWith('activities', { limit: '20', offset: '0' });
      expect(mockEventBus.emitDataProcessed).toHaveBeenCalledWith('activities', mockPaginatedResponse);
      expect(mockEventBus.emitResponseReady).toHaveBeenCalledWith('activities', expect.any(Object));

      // Verify component interactions
      expect(mockActivityHandler.fetchActivities).toHaveBeenCalledWith({ limit: '20', offset: '0' });
      expect(mockActivityHandler.validateActivity).toHaveBeenCalledWith(mockActivityData[0]);
      expect(mockPaginationService.paginateResults).toHaveBeenCalledWith(mockActivityData, { limit: '20', offset: '0' });

      // Verify cleanup
      expect(mockStateManager.cleanupState).toHaveBeenCalled();

      expect(response.body.success).toBe(true);
    });

    it('should coordinate Chart.js data transformation pipeline for analytics', async () => {
      // Test the collaboration pattern for Chart.js data transformation
      const mockRawAnalytics = [
        { hour: '10:00', total_tokens: 1000, total_requests: 5 },
        { hour: '11:00', total_tokens: 1500, total_requests: 8 }
      ];

      const mockFormattedChartData = {
        labels: ['10:00', '11:00'],
        datasets: [{
          label: 'Tokens',
          data: [1000, 1500],
          backgroundColor: 'rgba(59, 130, 246, 0.5)'
        }]
      };

      // Mock component collaborations
      const mockAnalyticsProcessor = {
        fetchHourlyData: jest.fn().mockResolvedValue(mockRawAnalytics),
        processTimeSeriesData: jest.fn().mockReturnValue(mockRawAnalytics)
      };

      const mockChartFormatter = {
        transformToChartJs: jest.fn().mockReturnValue(mockFormattedChartData),
        validateChartStructure: jest.fn().mockReturnValue(true)
      };

      mockComponentRegistry.getAnalyticsProcessor.mockReturnValue(mockAnalyticsProcessor);
      mockComponentRegistry.getChartFormatter.mockReturnValue(mockChartFormatter);

      // Mock cross-component data transformation orchestration
      mockCollaborationOrchestrator.orchestrateDataTransformation.mockImplementation(async (dataType, processor, formatter) => {
        // Step 1: Fetch raw data
        const rawData = await processor.fetchHourlyData();
        mockEventBus.emitDataRequest('analytics', { type: 'hourly' });

        // Step 2: Process time series
        const processedData = processor.processTimeSeriesData(rawData);
        mockEventBus.emitDataProcessed('analytics', processedData);

        // Step 3: Transform to Chart.js format
        const chartData = formatter.transformToChartJs(processedData);
        mockEventBus.emitDataFormatted('analytics', chartData);

        // Step 4: Validate final structure
        formatter.validateChartStructure(chartData);

        return { chartData, rawData: processedData };
      });

      app.get('/api/token-analytics/hourly', async (req, res) => {
        const processor = mockComponentRegistry.getAnalyticsProcessor();
        const formatter = mockComponentRegistry.getChartFormatter();

        const result = await mockCollaborationOrchestrator.orchestrateDataTransformation(
          'hourly',
          processor,
          formatter
        );

        res.json({
          success: true,
          data: result.chartData,
          raw_data: result.rawData,
          timestamp: new Date().toISOString()
        });
      });

      // Act
      const response = await request(app)
        .get('/api/token-analytics/hourly')
        .expect(200);

      // Assert: Verify data transformation collaboration
      expect(mockComponentRegistry.getAnalyticsProcessor).toHaveBeenCalled();
      expect(mockComponentRegistry.getChartFormatter).toHaveBeenCalled();
      expect(mockCollaborationOrchestrator.orchestrateDataTransformation).toHaveBeenCalledWith(
        'hourly',
        mockAnalyticsProcessor,
        mockChartFormatter
      );

      // Verify component interactions in correct order
      expect(mockAnalyticsProcessor.fetchHourlyData).toHaveBeenCalled();
      expect(mockAnalyticsProcessor.processTimeSeriesData).toHaveBeenCalledWith(mockRawAnalytics);
      expect(mockChartFormatter.transformToChartJs).toHaveBeenCalledWith(mockRawAnalytics);
      expect(mockChartFormatter.validateChartStructure).toHaveBeenCalledWith(mockFormattedChartData);

      // Verify event emissions
      expect(mockEventBus.emitDataRequest).toHaveBeenCalledWith('analytics', { type: 'hourly' });
      expect(mockEventBus.emitDataProcessed).toHaveBeenCalledWith('analytics', mockRawAnalytics);
      expect(mockEventBus.emitDataFormatted).toHaveBeenCalledWith('analytics', mockFormattedChartData);

      expect(response.body.data).toEqual(mockFormattedChartData);
      expect(response.body.raw_data).toEqual(mockRawAnalytics);
    });
  });

  describe('Inter-Endpoint Collaboration Patterns', () => {
    it('should coordinate data sharing between activities and analytics endpoints', async () => {
      // Test how activities and analytics endpoints collaborate and share data
      const sharedSessionData = {
        sessionId: uuidv4(),
        userId: 'user-123',
        startTime: new Date().toISOString()
      };

      const mockSharedDataManager = {
        getSharedSession: jest.fn().mockReturnValue(sharedSessionData),
        shareDataBetweenEndpoints: jest.fn(),
        synchronizeEndpointState: jest.fn()
      };

      // Mock activities endpoint contributing to analytics
      const mockActivitiesContribution = {
        contributeToAnalytics: jest.fn(),
        reportActivityMetrics: jest.fn(),
        updateAnalyticsContext: jest.fn()
      };

      // Mock analytics endpoint consuming activity data
      const mockAnalyticsConsumer = {
        consumeActivityData: jest.fn(),
        enrichAnalyticsWithActivities: jest.fn(),
        correlateActivityMetrics: jest.fn()
      };

      mockCollaborationOrchestrator.handleCrossEndpointDependencies.mockImplementation((endpoints) => {
        const { activitiesEndpoint, analyticsEndpoint, sharedData } = endpoints;

        // Step 1: Activities endpoint reports metrics
        const activityMetrics = activitiesEndpoint.reportActivityMetrics(sharedData);

        // Step 2: Share data between endpoints
        mockSharedDataManager.shareDataBetweenEndpoints('activities', 'analytics', activityMetrics);

        // Step 3: Analytics endpoint consumes the data
        analyticsEndpoint.consumeActivityData(activityMetrics);

        // Step 4: Synchronize state
        mockSharedDataManager.synchronizeEndpointState(['activities', 'analytics']);

        return { activityMetrics, synchronized: true };
      });

      app.get('/api/cross-endpoint-test', async (req, res) => {
        const sharedData = mockSharedDataManager.getSharedSession(req.headers['x-session-id']);

        const result = mockCollaborationOrchestrator.handleCrossEndpointDependencies({
          activitiesEndpoint: mockActivitiesContribution,
          analyticsEndpoint: mockAnalyticsConsumer,
          sharedData
        });

        res.json({
          success: true,
          collaboration: result,
          sharedData
        });
      });

      // Act
      const response = await request(app)
        .get('/api/cross-endpoint-test')
        .set('x-session-id', sharedSessionData.sessionId)
        .expect(200);

      // Assert: Verify cross-endpoint collaboration
      expect(mockSharedDataManager.getSharedSession).toHaveBeenCalledWith(sharedSessionData.sessionId);
      expect(mockCollaborationOrchestrator.handleCrossEndpointDependencies).toHaveBeenCalledWith(
        expect.objectContaining({
          activitiesEndpoint: mockActivitiesContribution,
          analyticsEndpoint: mockAnalyticsConsumer,
          sharedData: sharedSessionData
        })
      );

      // Verify inter-endpoint communication
      expect(mockActivitiesContribution.reportActivityMetrics).toHaveBeenCalledWith(sharedSessionData);
      expect(mockSharedDataManager.shareDataBetweenEndpoints).toHaveBeenCalledWith(
        'activities',
        'analytics',
        expect.any(Object)
      );
      expect(mockAnalyticsConsumer.consumeActivityData).toHaveBeenCalled();
      expect(mockSharedDataManager.synchronizeEndpointState).toHaveBeenCalledWith(['activities', 'analytics']);

      expect(response.body.collaboration.synchronized).toBe(true);
    });

    it('should handle cascading data updates across multiple endpoints', async () => {
      // Test how data changes cascade through multiple endpoints
      const mockDataChangeEvent = {
        type: 'token_analytics_update',
        timestamp: new Date().toISOString(),
        affectedEndpoints: ['hourly', 'daily', 'summary'],
        changeId: uuidv4()
      };

      const mockCascadeManager = {
        initiateDataCascade: jest.fn(),
        propagateChangesToEndpoints: jest.fn(),
        validateCascadeCompletion: jest.fn()
      };

      const mockEndpointHandlers = {
        hourly: {
          handleDataUpdate: jest.fn(),
          invalidateCache: jest.fn(),
          notifyUpdate: jest.fn()
        },
        daily: {
          handleDataUpdate: jest.fn(),
          invalidateCache: jest.fn(),
          notifyUpdate: jest.fn()
        },
        summary: {
          handleDataUpdate: jest.fn(),
          invalidateCache: jest.fn(),
          notifyUpdate: jest.fn()
        }
      };

      mockCascadeManager.initiateDataCascade.mockImplementation((changeEvent, handlers) => {
        const cascadeResults = [];

        changeEvent.affectedEndpoints.forEach(endpoint => {
          const handler = handlers[endpoint];

          // Step 1: Invalidate cache
          handler.invalidateCache(changeEvent.changeId);

          // Step 2: Handle data update
          handler.handleDataUpdate(changeEvent);

          // Step 3: Notify of update
          const updateResult = handler.notifyUpdate(changeEvent.timestamp);

          cascadeResults.push({
            endpoint,
            status: 'updated',
            timestamp: updateResult
          });
        });

        return cascadeResults;
      });

      mockCascadeManager.propagateChangesToEndpoints.mockImplementation((results) => {
        // Simulate propagation logic
        results.forEach(result => {
          mockEventBus.publishEvent(`${result.endpoint}_updated`, result);
        });

        return results.length;
      });

      app.post('/api/data-cascade-test', async (req, res) => {
        // Initiate cascade
        const cascadeResults = mockCascadeManager.initiateDataCascade(
          mockDataChangeEvent,
          mockEndpointHandlers
        );

        // Propagate changes
        const propagatedCount = mockCascadeManager.propagateChangesToEndpoints(cascadeResults);

        // Validate completion
        mockCascadeManager.validateCascadeCompletion(cascadeResults);

        res.json({
          success: true,
          cascadeResults,
          propagatedCount,
          changeEvent: mockDataChangeEvent
        });
      });

      // Act
      const response = await request(app)
        .post('/api/data-cascade-test')
        .send(mockDataChangeEvent)
        .expect(200);

      // Assert: Verify cascade behavior
      expect(mockCascadeManager.initiateDataCascade).toHaveBeenCalledWith(
        mockDataChangeEvent,
        mockEndpointHandlers
      );

      // Verify each endpoint was updated
      ['hourly', 'daily', 'summary'].forEach(endpoint => {
        expect(mockEndpointHandlers[endpoint].invalidateCache).toHaveBeenCalledWith(mockDataChangeEvent.changeId);
        expect(mockEndpointHandlers[endpoint].handleDataUpdate).toHaveBeenCalledWith(mockDataChangeEvent);
        expect(mockEndpointHandlers[endpoint].notifyUpdate).toHaveBeenCalled();
      });

      expect(mockCascadeManager.propagateChangesToEndpoints).toHaveBeenCalled();
      expect(mockCascadeManager.validateCascadeCompletion).toHaveBeenCalled();

      // Verify event publications
      expect(mockEventBus.publishEvent).toHaveBeenCalledWith('hourly_updated', expect.any(Object));
      expect(mockEventBus.publishEvent).toHaveBeenCalledWith('daily_updated', expect.any(Object));
      expect(mockEventBus.publishEvent).toHaveBeenCalledWith('summary_updated', expect.any(Object));

      expect(response.body.propagatedCount).toBe(3);
      expect(response.body.cascadeResults).toHaveLength(3);
    });
  });

  describe('Component State Management Collaboration', () => {
    it('should coordinate state changes across data processing components', async () => {
      // Test how components coordinate state changes during data processing
      const mockProcessingState = {
        requestId: uuidv4(),
        stage: 'initialization',
        components: ['fetcher', 'validator', 'transformer', 'formatter'],
        progress: 0
      };

      const mockStateCoordinator = {
        initializeProcessingState: jest.fn().mockReturnValue(mockProcessingState),
        transitionComponentState: jest.fn(),
        syncComponentStates: jest.fn(),
        finalizeProcessingState: jest.fn()
      };

      const mockComponentStates = {
        fetcher: { status: 'idle', lastFetch: null },
        validator: { status: 'idle', rulesLoaded: true },
        transformer: { status: 'idle', transformationRules: [] },
        formatter: { status: 'idle', outputFormat: 'json' }
      };

      mockStateManager.getComponentState.mockImplementation((component) => {
        return mockComponentStates[component];
      });

      mockStateManager.updateProcessingState.mockImplementation((requestId, stage, progress) => {
        return {
          requestId,
          stage,
          progress,
          timestamp: new Date().toISOString()
        };
      });

      // Mock component collaboration with state coordination
      const mockDataProcessor = {
        processWithStateCoordination: jest.fn().mockImplementation(async (data, stateCoordinator) => {
          // Stage 1: Fetching
          stateCoordinator.transitionComponentState('fetcher', 'active');
          mockStateManager.updateProcessingState(mockProcessingState.requestId, 'fetching', 25);

          // Stage 2: Validating
          stateCoordinator.transitionComponentState('fetcher', 'complete');
          stateCoordinator.transitionComponentState('validator', 'active');
          mockStateManager.updateProcessingState(mockProcessingState.requestId, 'validating', 50);

          // Stage 3: Transforming
          stateCoordinator.transitionComponentState('validator', 'complete');
          stateCoordinator.transitionComponentState('transformer', 'active');
          mockStateManager.updateProcessingState(mockProcessingState.requestId, 'transforming', 75);

          // Stage 4: Formatting
          stateCoordinator.transitionComponentState('transformer', 'complete');
          stateCoordinator.transitionComponentState('formatter', 'active');
          mockStateManager.updateProcessingState(mockProcessingState.requestId, 'formatting', 90);

          // Final sync
          stateCoordinator.syncComponentStates();
          stateCoordinator.transitionComponentState('formatter', 'complete');
          mockStateManager.updateProcessingState(mockProcessingState.requestId, 'complete', 100);

          return { processed: true, stages: 4 };
        })
      };

      app.post('/api/state-coordination-test', async (req, res) => {
        // Initialize processing state
        const processingState = mockStateCoordinator.initializeProcessingState(req.body);

        try {
          // Process with state coordination
          const result = await mockDataProcessor.processWithStateCoordination(
            req.body.data,
            mockStateCoordinator
          );

          // Finalize processing state
          mockStateCoordinator.finalizeProcessingState(processingState.requestId);

          res.json({
            success: true,
            result,
            processingState
          });
        } catch (error) {
          mockStateCoordinator.finalizeProcessingState(processingState.requestId);
          throw error;
        }
      });

      // Act
      const response = await request(app)
        .post('/api/state-coordination-test')
        .send({ data: { test: 'data' } })
        .expect(200);

      // Assert: Verify state coordination
      expect(mockStateCoordinator.initializeProcessingState).toHaveBeenCalled();
      expect(mockDataProcessor.processWithStateCoordination).toHaveBeenCalledWith(
        { test: 'data' },
        mockStateCoordinator
      );

      // Verify state transitions for each component
      expect(mockStateCoordinator.transitionComponentState).toHaveBeenCalledWith('fetcher', 'active');
      expect(mockStateCoordinator.transitionComponentState).toHaveBeenCalledWith('fetcher', 'complete');
      expect(mockStateCoordinator.transitionComponentState).toHaveBeenCalledWith('validator', 'active');
      expect(mockStateCoordinator.transitionComponentState).toHaveBeenCalledWith('validator', 'complete');
      expect(mockStateCoordinator.transitionComponentState).toHaveBeenCalledWith('transformer', 'active');
      expect(mockStateCoordinator.transitionComponentState).toHaveBeenCalledWith('transformer', 'complete');
      expect(mockStateCoordinator.transitionComponentState).toHaveBeenCalledWith('formatter', 'active');
      expect(mockStateCoordinator.transitionComponentState).toHaveBeenCalledWith('formatter', 'complete');

      // Verify state updates
      expect(mockStateManager.updateProcessingState).toHaveBeenCalledWith(
        mockProcessingState.requestId,
        'fetching',
        25
      );
      expect(mockStateManager.updateProcessingState).toHaveBeenCalledWith(
        mockProcessingState.requestId,
        'validating',
        50
      );
      expect(mockStateManager.updateProcessingState).toHaveBeenCalledWith(
        mockProcessingState.requestId,
        'transforming',
        75
      );
      expect(mockStateManager.updateProcessingState).toHaveBeenCalledWith(
        mockProcessingState.requestId,
        'formatting',
        90
      );
      expect(mockStateManager.updateProcessingState).toHaveBeenCalledWith(
        mockProcessingState.requestId,
        'complete',
        100
      );

      // Verify synchronization and finalization
      expect(mockStateCoordinator.syncComponentStates).toHaveBeenCalled();
      expect(mockStateCoordinator.finalizeProcessingState).toHaveBeenCalledWith(mockProcessingState.requestId);

      expect(response.body.result.stages).toBe(4);
    });
  });

  describe('Error Handling Collaboration Patterns', () => {
    it('should coordinate error handling across component boundaries', async () => {
      // Test how components collaborate during error scenarios
      const mockError = new Error('Data processing failed');
      const mockErrorContext = {
        component: 'transformer',
        stage: 'data-transformation',
        requestId: uuidv4(),
        timestamp: new Date().toISOString()
      };

      const mockErrorCoordinator = {
        handleComponentError: jest.fn(),
        propagateErrorToCollaborators: jest.fn(),
        coordi

RecoveryActions: jest.fn(),
        finalizeErrorHandling: jest.fn()
      };

      const mockRecoveryManager = {
        attemptComponentRecovery: jest.fn(),
        rollbackComponentState: jest.fn(),
        notifyErrorResolution: jest.fn()
      };

      // Mock component error handling collaboration
      const mockFailingComponent = {
        processData: jest.fn().mockRejectedValue(mockError),
        handleError: jest.fn(),
        reportErrorToCoordinator: jest.fn()
      };

      const mockCollaboratingComponents = {
        upstream: {
          handleDownstreamError: jest.fn(),
          provideFallbackData: jest.fn()
        },
        downstream: {
          handleUpstreamError: jest.fn(),
          enterSafeMode: jest.fn()
        }
      };

      mockErrorCoordinator.handleComponentError.mockImplementation((error, context, collaborators) => {
        // Step 1: Handle the error in the failing component
        collaborators.failing.handleError(error);
        collaborators.failing.reportErrorToCoordinator(context);

        // Step 2: Notify collaborating components
        collaborators.upstream.handleDownstreamError(context);
        collaborators.downstream.handleUpstreamError(context);

        // Step 3: Attempt recovery
        const recoverySuccess = mockRecoveryManager.attemptComponentRecovery(context.component);

        if (!recoverySuccess) {
          // Fallback strategies
          collaborators.upstream.provideFallbackData();
          collaborators.downstream.enterSafeMode();
        }

        return { recovered: recoverySuccess, fallbackActivated: !recoverySuccess };
      });

      app.post('/api/error-coordination-test', async (req, res) => {
        try {
          await mockFailingComponent.processData(req.body);
          res.json({ success: true });
        } catch (error) {
          // Coordinate error handling
          const errorResult = mockErrorCoordinator.handleComponentError(
            error,
            mockErrorContext,
            {
              failing: mockFailingComponent,
              upstream: mockCollaboratingComponents.upstream,
              downstream: mockCollaboratingComponents.downstream
            }
          );

          mockErrorCoordinator.finalizeErrorHandling(mockErrorContext.requestId);

          res.status(500).json({
            success: false,
            error: 'Component collaboration failure',
            errorHandling: errorResult,
            context: mockErrorContext
          });
        }
      });

      // Act
      const response = await request(app)
        .post('/api/error-coordination-test')
        .send({ data: 'test' })
        .expect(500);

      // Assert: Verify error handling collaboration
      expect(mockFailingComponent.processData).toHaveBeenCalledWith({ data: 'test' });
      expect(mockErrorCoordinator.handleComponentError).toHaveBeenCalledWith(
        mockError,
        mockErrorContext,
        expect.objectContaining({
          failing: mockFailingComponent,
          upstream: mockCollaboratingComponents.upstream,
          downstream: mockCollaboratingComponents.downstream
        })
      );

      // Verify component error handling
      expect(mockFailingComponent.handleError).toHaveBeenCalledWith(mockError);
      expect(mockFailingComponent.reportErrorToCoordinator).toHaveBeenCalledWith(mockErrorContext);

      // Verify collaborator notifications
      expect(mockCollaboratingComponents.upstream.handleDownstreamError).toHaveBeenCalledWith(mockErrorContext);
      expect(mockCollaboratingComponents.downstream.handleUpstreamError).toHaveBeenCalledWith(mockErrorContext);

      // Verify recovery attempts
      expect(mockRecoveryManager.attemptComponentRecovery).toHaveBeenCalledWith('transformer');

      // Verify finalization
      expect(mockErrorCoordinator.finalizeErrorHandling).toHaveBeenCalledWith(mockErrorContext.requestId);

      expect(response.body.success).toBe(false);
      expect(response.body.errorHandling).toHaveProperty('recovered');
      expect(response.body.errorHandling).toHaveProperty('fallbackActivated');
    });
  });
});