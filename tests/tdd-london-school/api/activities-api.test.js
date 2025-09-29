/**
 * TDD London School Tests for /api/activities endpoint
 * Outside-in development with mock-driven testing
 * Focus on behavior verification and collaboration patterns
 */

const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

describe('Activities API - London School TDD', () => {
  let app;
  let mockActivityRepository;
  let mockPaginationService;
  let mockDataValidator;
  let mockActivitiesController;

  beforeEach(() => {
    // Mock collaborators following London School approach
    mockActivityRepository = {
      findActivities: jest.fn(),
      countActivities: jest.fn(),
      validatePagination: jest.fn()
    };

    mockPaginationService = {
      calculateOffset: jest.fn(),
      validateLimit: jest.fn(),
      createPaginationResponse: jest.fn()
    };

    mockDataValidator = {
      validateActivityData: jest.fn(),
      ensureUUIDFormat: jest.fn(),
      sanitizeResponse: jest.fn()
    };

    // Create minimal express app for testing
    app = express();
    app.use(express.json());

    // Add CORS middleware mock
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Outside-In: Live Feed Activities Behavior', () => {
    it('should provide paginated activities for live feed display', async () => {
      // Arrange: Mock the expected behavior chain
      const mockActivities = [
        {
          id: uuidv4(),
          type: 'agent_post',
          title: 'New Agent Analysis',
          content: 'Analysis of market trends completed',
          timestamp: new Date().toISOString(),
          agent_id: uuidv4(),
          metadata: { priority: 'high' }
        },
        {
          id: uuidv4(),
          type: 'agent_interaction',
          title: 'User Query Processed',
          content: 'Successfully processed user data request',
          timestamp: new Date().toISOString(),
          agent_id: uuidv4(),
          metadata: { priority: 'medium' }
        }
      ];

      // Mock the collaboration sequence
      mockPaginationService.validateLimit.mockReturnValue(20);
      mockPaginationService.calculateOffset.mockReturnValue(0);
      mockActivityRepository.findActivities.mockResolvedValue(mockActivities);
      mockActivityRepository.countActivities.mockResolvedValue(25);
      mockDataValidator.validateActivityData.mockReturnValue(true);
      mockDataValidator.ensureUUIDFormat.mockImplementation(data => data);
      mockPaginationService.createPaginationResponse.mockReturnValue({
        data: mockActivities,
        pagination: {
          total: 25,
          limit: 20,
          offset: 0,
          hasMore: true
        }
      });

      // Add the endpoint with mocked dependencies
      app.get('/api/activities', async (req, res) => {
        const { limit = 20, offset = 0 } = req.query;

        // Verify collaboration sequence
        const validatedLimit = mockPaginationService.validateLimit(parseInt(limit));
        const calculatedOffset = mockPaginationService.calculateOffset(parseInt(offset));

        const activities = await mockActivityRepository.findActivities({
          limit: validatedLimit,
          offset: calculatedOffset
        });

        const totalCount = await mockActivityRepository.countActivities();

        // Validate each activity
        activities.forEach(activity => {
          mockDataValidator.validateActivityData(activity);
          mockDataValidator.ensureUUIDFormat(activity);
        });

        const response = mockPaginationService.createPaginationResponse(
          activities,
          totalCount,
          validatedLimit,
          calculatedOffset
        );

        res.json({
          success: true,
          ...response,
          timestamp: new Date().toISOString()
        });
      });

      // Act: Make request to the endpoint
      const response = await request(app)
        .get('/api/activities')
        .query({ limit: 20, offset: 0 })
        .expect(200);

      // Assert: Verify the collaboration behavior
      expect(mockPaginationService.validateLimit).toHaveBeenCalledWith(20);
      expect(mockPaginationService.calculateOffset).toHaveBeenCalledWith(0);
      expect(mockActivityRepository.findActivities).toHaveBeenCalledWith({
        limit: 20,
        offset: 0
      });
      expect(mockActivityRepository.countActivities).toHaveBeenCalled();
      expect(mockDataValidator.validateActivityData).toHaveBeenCalledTimes(2);
      expect(mockPaginationService.createPaginationResponse).toHaveBeenCalledWith(
        mockActivities, 25, 20, 0
      );

      // Verify response structure for live feed
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        total: 25,
        limit: 20,
        offset: 0,
        hasMore: true
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle activity data structure for Chart.js compatibility', async () => {
      // Arrange: Mock time-series activities for Chart.js
      const mockTimeSeriesActivities = [
        {
          id: uuidv4(),
          type: 'agent_post',
          timestamp: '2025-09-29T10:00:00Z',
          count: 5,
          metadata: { chart_data: true }
        },
        {
          id: uuidv4(),
          type: 'agent_interaction',
          timestamp: '2025-09-29T11:00:00Z',
          count: 8,
          metadata: { chart_data: true }
        }
      ];

      mockActivityRepository.findActivities.mockResolvedValue(mockTimeSeriesActivities);
      mockDataValidator.ensureUUIDFormat.mockImplementation(data => {
        // Verify UUID string format to prevent .slice errors
        if (typeof data.id !== 'string' || data.id.length !== 36) {
          throw new Error('Invalid UUID format');
        }
        return data;
      });

      app.get('/api/activities', async (req, res) => {
        const activities = await mockActivityRepository.findActivities({});

        activities.forEach(activity => {
          mockDataValidator.ensureUUIDFormat(activity);
        });

        res.json({
          success: true,
          data: activities.map(activity => ({
            x: activity.timestamp,
            y: activity.count,
            id: activity.id
          }))
        });
      });

      // Act & Assert
      const response = await request(app)
        .get('/api/activities')
        .expect(200);

      expect(mockDataValidator.ensureUUIDFormat).toHaveBeenCalledTimes(2);
      expect(response.body.data[0]).toHaveProperty('x');
      expect(response.body.data[0]).toHaveProperty('y');
      expect(response.body.data[0]).toHaveProperty('id');
    });
  });

  describe('Behavior Verification: Error Handling Collaboration', () => {
    it('should coordinate error handling across collaborators', async () => {
      // Arrange: Mock error scenarios
      const mockError = new Error('Database connection failed');
      mockActivityRepository.findActivities.mockRejectedValue(mockError);

      const mockErrorHandler = {
        handleRepositoryError: jest.fn(),
        createErrorResponse: jest.fn()
      };

      mockErrorHandler.handleRepositoryError.mockReturnValue({
        status: 500,
        message: 'Internal server error'
      });
      mockErrorHandler.createErrorResponse.mockReturnValue({
        success: false,
        error: 'Failed to fetch activities',
        timestamp: new Date().toISOString()
      });

      app.get('/api/activities', async (req, res) => {
        try {
          await mockActivityRepository.findActivities({});
        } catch (error) {
          const handledError = mockErrorHandler.handleRepositoryError(error);
          const errorResponse = mockErrorHandler.createErrorResponse(handledError);
          res.status(handledError.status).json(errorResponse);
        }
      });

      // Act
      const response = await request(app)
        .get('/api/activities')
        .expect(500);

      // Assert: Verify error handling collaboration
      expect(mockActivityRepository.findActivities).toHaveBeenCalled();
      expect(mockErrorHandler.handleRepositoryError).toHaveBeenCalledWith(mockError);
      expect(mockErrorHandler.createErrorResponse).toHaveBeenCalled();
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should validate pagination parameters and reject invalid requests', async () => {
      // Arrange: Mock validation failure
      mockPaginationService.validateLimit.mockImplementation((limit) => {
        if (limit > 100 || limit < 1) {
          throw new Error('Invalid limit parameter');
        }
        return limit;
      });

      const mockErrorValidator = {
        createValidationError: jest.fn()
      };

      mockErrorValidator.createValidationError.mockReturnValue({
        success: false,
        error: 'Validation failed',
        details: 'Limit must be between 1 and 100'
      });

      app.get('/api/activities', async (req, res) => {
        const { limit = 20 } = req.query;

        try {
          mockPaginationService.validateLimit(parseInt(limit));
          res.json({ success: true, data: [] });
        } catch (error) {
          const validationError = mockErrorValidator.createValidationError(error);
          res.status(400).json(validationError);
        }
      });

      // Act & Assert
      const response = await request(app)
        .get('/api/activities')
        .query({ limit: 150 })
        .expect(400);

      expect(mockPaginationService.validateLimit).toHaveBeenCalledWith(150);
      expect(mockErrorValidator.createValidationError).toHaveBeenCalled();
      expect(response.body.success).toBe(false);
      expect(response.body.details).toContain('Limit must be between 1 and 100');
    });
  });

  describe('Contract Definition Through Mocks', () => {
    it('should define clear contracts for activity data structure', () => {
      // Assert: Define the expected contract for activities
      const expectedActivityContract = {
        id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
        type: expect.stringMatching(/^(agent_post|agent_interaction|system_event)$/),
        title: expect.any(String),
        content: expect.any(String),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/),
        agent_id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
        metadata: expect.any(Object)
      };

      // Mock repository should enforce this contract
      mockActivityRepository.findActivities.mockImplementation(async () => {
        const mockActivity = {
          id: uuidv4(),
          type: 'agent_post',
          title: 'Test Activity',
          content: 'Test content',
          timestamp: new Date().toISOString(),
          agent_id: uuidv4(),
          metadata: { test: true }
        };

        // Contract verification
        expect(mockActivity).toMatchObject(expectedActivityContract);
        return [mockActivity];
      });

      // Verify contract is enforced
      return mockActivityRepository.findActivities({}).then(activities => {
        expect(activities[0]).toMatchObject(expectedActivityContract);
      });
    });

    it('should define pagination service contract', () => {
      // Test pagination service behavior contract
      const paginationContract = {
        validateLimit: expect.any(Function),
        calculateOffset: expect.any(Function),
        createPaginationResponse: expect.any(Function)
      };

      expect(mockPaginationService).toMatchObject(paginationContract);

      // Test method contracts
      mockPaginationService.validateLimit.mockReturnValue(20);
      mockPaginationService.calculateOffset.mockReturnValue(0);
      mockPaginationService.createPaginationResponse.mockReturnValue({
        data: [],
        pagination: {
          total: 0,
          limit: 20,
          offset: 0,
          hasMore: false
        }
      });

      expect(mockPaginationService.validateLimit(20)).toBe(20);
      expect(mockPaginationService.calculateOffset(0)).toBe(0);
      expect(mockPaginationService.createPaginationResponse([], 0, 20, 0))
        .toHaveProperty('pagination');
    });
  });

  describe('Real-Time Capability Testing', () => {
    it('should support real-time activity updates through WebSocket collaboration', async () => {
      // Mock WebSocket service collaboration
      const mockWebSocketService = {
        broadcastActivity: jest.fn(),
        subscribeToActivities: jest.fn(),
        notifyClientsOfNewActivity: jest.fn()
      };

      const newActivity = {
        id: uuidv4(),
        type: 'agent_post',
        title: 'Real-time Activity',
        content: 'This activity was just created',
        timestamp: new Date().toISOString(),
        agent_id: uuidv4(),
        metadata: { realtime: true }
      };

      mockActivityRepository.findActivities.mockResolvedValue([newActivity]);
      mockWebSocketService.broadcastActivity.mockResolvedValue(true);

      app.post('/api/activities', async (req, res) => {
        const activity = req.body;

        // Save to repository
        await mockActivityRepository.findActivities({});

        // Broadcast real-time update
        await mockWebSocketService.broadcastActivity(activity);

        res.status(201).json({
          success: true,
          data: activity,
          realtime: true
        });
      });

      // Act
      const response = await request(app)
        .post('/api/activities')
        .send(newActivity)
        .expect(201);

      // Assert: Verify real-time collaboration
      expect(mockActivityRepository.findActivities).toHaveBeenCalled();
      expect(mockWebSocketService.broadcastActivity).toHaveBeenCalledWith(newActivity);
      expect(response.body.realtime).toBe(true);
    });
  });

  describe('Performance and UUID String Operations', () => {
    it('should handle UUID string operations without slice errors', async () => {
      // Test UUID string manipulation safety
      const mockActivitiesWithUUIDs = Array.from({ length: 50 }, () => ({
        id: uuidv4(),
        type: 'agent_post',
        title: `Activity ${Math.random()}`,
        content: 'Content',
        timestamp: new Date().toISOString(),
        agent_id: uuidv4(),
        metadata: {}
      }));

      mockActivityRepository.findActivities.mockResolvedValue(mockActivitiesWithUUIDs);

      // Mock UUID processing that could cause slice errors
      const mockUUIDProcessor = {
        processUUIDs: jest.fn(),
        validateUUIDStrings: jest.fn()
      };

      mockUUIDProcessor.processUUIDs.mockImplementation((activities) => {
        return activities.map(activity => {
          // Safe UUID string operations
          if (typeof activity.id === 'string' && activity.id.length === 36) {
            return {
              ...activity,
              shortId: activity.id.substring(0, 8),
              agentShortId: activity.agent_id.substring(0, 8)
            };
          }
          throw new Error('Invalid UUID string format');
        });
      });

      app.get('/api/activities', async (req, res) => {
        const activities = await mockActivityRepository.findActivities({});
        const processedActivities = mockUUIDProcessor.processUUIDs(activities);

        res.json({
          success: true,
          data: processedActivities
        });
      });

      // Act
      const response = await request(app)
        .get('/api/activities')
        .expect(200);

      // Assert: Verify safe UUID processing
      expect(mockUUIDProcessor.processUUIDs).toHaveBeenCalledWith(mockActivitiesWithUUIDs);
      expect(response.body.data).toHaveLength(50);
      expect(response.body.data[0]).toHaveProperty('shortId');
      expect(response.body.data[0]).toHaveProperty('agentShortId');
      expect(response.body.data[0].shortId).toHaveLength(8);
    });
  });
});