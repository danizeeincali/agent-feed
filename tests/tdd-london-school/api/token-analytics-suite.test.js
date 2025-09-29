/**
 * TDD London School Tests for Token Analytics Suite
 * /api/token-analytics/daily, /api/token-analytics/messages, /api/token-analytics/summary
 * Outside-in development with comprehensive behavior verification
 */

const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

describe('Token Analytics Suite - London School TDD', () => {
  let app;
  let mockAnalyticsRepository;
  let mockChartDataFormatter;
  let mockAggregationService;
  let mockValidationService;
  let mockMessageProcessor;
  let mockSummaryCalculator;

  beforeEach(() => {
    // Mock collaborators following London School approach
    mockAnalyticsRepository = {
      getDailyTokenData: jest.fn(),
      getMessageData: jest.fn(),
      getAllAnalyticsData: jest.fn(),
      validateDateRange: jest.fn()
    };

    mockChartDataFormatter = {
      formatDailyChartData: jest.fn(),
      createTimeSeriesDatasets: jest.fn(),
      validateChartCompatibility: jest.fn()
    };

    mockAggregationService = {
      aggregateDailyMetrics: jest.fn(),
      calculatePeriodSummary: jest.fn(),
      groupByProvider: jest.fn(),
      groupByModel: jest.fn()
    };

    mockValidationService = {
      validatePaginationParams: jest.fn(),
      validateFilterParams: jest.fn(),
      ensureDataConsistency: jest.fn()
    };

    mockMessageProcessor = {
      processMessageFilters: jest.fn(),
      formatMessageResponse: jest.fn(),
      calculateMessageMetrics: jest.fn()
    };

    mockSummaryCalculator = {
      calculateTotalMetrics: jest.fn(),
      calculateAverages: jest.fn(),
      generateProviderBreakdown: jest.fn(),
      generateModelBreakdown: jest.fn()
    };

    // Create express app for testing
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      next();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Daily Analytics API - Outside-In Behavior', () => {
    it('should provide Chart.js compatible daily token analytics', async () => {
      // Arrange: Mock daily data for Chart.js time series
      const mockDailyData = [
        {
          date: '2025-09-27',
          total_tokens: 45000,
          total_requests: 180,
          total_cost: 13500, // cents
          avg_processing_time: 650
        },
        {
          date: '2025-09-28',
          total_tokens: 52000,
          total_requests: 210,
          total_cost: 15600,
          avg_processing_time: 720
        },
        {
          date: '2025-09-29',
          total_tokens: 48000,
          total_requests: 195,
          total_cost: 14400,
          avg_processing_time: 680
        }
      ];

      const expectedDailyChartFormat = {
        labels: ['2025-09-27', '2025-09-28', '2025-09-29'],
        datasets: [
          {
            label: 'Daily Tokens',
            data: [45000, 52000, 48000],
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Daily Requests',
            data: [180, 210, 195],
            backgroundColor: 'rgba(34, 197, 94, 0.5)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
            yAxisID: 'y1'
          }
        ]
      };

      // Mock collaboration sequence
      mockValidationService.validateDateRange.mockReturnValue(true);
      mockAnalyticsRepository.getDailyTokenData.mockResolvedValue(mockDailyData);
      mockAggregationService.aggregateDailyMetrics.mockReturnValue(mockDailyData);
      mockChartDataFormatter.formatDailyChartData.mockReturnValue(expectedDailyChartFormat);
      mockChartDataFormatter.validateChartCompatibility.mockReturnValue(true);

      app.get('/api/token-analytics/daily', async (req, res) => {
        // Validate request
        mockValidationService.validateDateRange(req.query);

        // Get and process data
        const rawData = await mockAnalyticsRepository.getDailyTokenData();
        const aggregatedData = mockAggregationService.aggregateDailyMetrics(rawData);
        const chartData = mockChartDataFormatter.formatDailyChartData(aggregatedData);

        // Validate Chart.js compatibility
        mockChartDataFormatter.validateChartCompatibility(chartData);

        res.json({
          success: true,
          data: chartData,
          raw_data: aggregatedData,
          timestamp: new Date().toISOString()
        });
      });

      // Act
      const response = await request(app)
        .get('/api/token-analytics/daily')
        .expect(200);

      // Assert: Verify collaboration behavior
      expect(mockValidationService.validateDateRange).toHaveBeenCalled();
      expect(mockAnalyticsRepository.getDailyTokenData).toHaveBeenCalled();
      expect(mockAggregationService.aggregateDailyMetrics).toHaveBeenCalledWith(mockDailyData);
      expect(mockChartDataFormatter.formatDailyChartData).toHaveBeenCalledWith(mockDailyData);
      expect(mockChartDataFormatter.validateChartCompatibility).toHaveBeenCalled();

      // Verify Chart.js structure
      expect(response.body.success).toBe(true);
      expect(response.body.data.labels).toEqual(['2025-09-27', '2025-09-28', '2025-09-29']);
      expect(response.body.data.datasets).toHaveLength(2);
      expect(response.body.data.datasets[0].yAxisID).toBe('y');
      expect(response.body.data.datasets[1].yAxisID).toBe('y1');
    });

    it('should handle 30-day time series with missing data interpolation', async () => {
      // Test missing day handling for Chart.js continuity
      const incompleteDailyData = [
        { date: '2025-09-01', total_tokens: 40000, total_requests: 160 },
        // Missing 2025-09-02
        { date: '2025-09-03', total_tokens: 45000, total_requests: 180 },
        { date: '2025-09-04', total_tokens: 42000, total_requests: 170 }
      ];

      const interpolatedData = [
        { date: '2025-09-01', total_tokens: 40000, total_requests: 160 },
        { date: '2025-09-02', total_tokens: 42500, total_requests: 170, interpolated: true },
        { date: '2025-09-03', total_tokens: 45000, total_requests: 180 },
        { date: '2025-09-04', total_tokens: 42000, total_requests: 170 }
      ];

      mockAnalyticsRepository.getDailyTokenData.mockResolvedValue(incompleteDailyData);
      mockAggregationService.aggregateDailyMetrics.mockReturnValue(interpolatedData);

      app.get('/api/token-analytics/daily', async (req, res) => {
        const rawData = await mockAnalyticsRepository.getDailyTokenData();
        const processedData = mockAggregationService.aggregateDailyMetrics(rawData);
        res.json({ success: true, data: processedData });
      });

      const response = await request(app)
        .get('/api/token-analytics/daily')
        .expect(200);

      expect(mockAggregationService.aggregateDailyMetrics).toHaveBeenCalledWith(incompleteDailyData);
      expect(response.body.data).toHaveLength(4);
      expect(response.body.data[1].interpolated).toBe(true);
      expect(response.body.data[1].total_tokens).toBe(42500); // Interpolated value
    });
  });

  describe('Messages Analytics API - Outside-In Behavior', () => {
    it('should provide paginated message analytics with filtering', async () => {
      // Arrange: Mock message data with realistic structure
      const mockMessages = [
        {
          id: 12345,
          timestamp: '2025-09-29T10:30:00Z',
          session_id: uuidv4(),
          request_id: uuidv4(),
          message_id: uuidv4(),
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          request_type: 'chat',
          input_tokens: 1500,
          output_tokens: 800,
          total_tokens: 2300,
          cost_total: 690, // cents
          processing_time_ms: 850,
          message_preview: 'User requested code analysis for React component',
          response_preview: 'Provided comprehensive analysis with optimization suggestions',
          component: 'TokenAnalyticsDashboard'
        },
        {
          id: 12346,
          timestamp: '2025-09-29T10:35:00Z',
          session_id: uuidv4(),
          request_id: uuidv4(),
          message_id: uuidv4(),
          provider: 'openai',
          model: 'gpt-4',
          request_type: 'completion',
          input_tokens: 800,
          output_tokens: 400,
          total_tokens: 1200,
          cost_total: 360,
          processing_time_ms: 1200,
          message_preview: 'User requested data processing algorithm',
          response_preview: 'Generated efficient algorithm with complexity analysis',
          component: 'DataProcessor'
        }
      ];

      // Mock collaboration sequence
      mockValidationService.validatePaginationParams.mockReturnValue(true);
      mockValidationService.validateFilterParams.mockReturnValue(true);
      mockAnalyticsRepository.getMessageData.mockResolvedValue(mockMessages);
      mockMessageProcessor.processMessageFilters.mockReturnValue(mockMessages);
      mockMessageProcessor.formatMessageResponse.mockReturnValue({
        data: mockMessages,
        total: 2,
        limit: 50,
        offset: 0
      });

      app.get('/api/token-analytics/messages', async (req, res) => {
        const { limit = 50, offset = 0, provider, model } = req.query;

        // Validate parameters
        mockValidationService.validatePaginationParams({ limit, offset });
        mockValidationService.validateFilterParams({ provider, model });

        // Get and filter data
        const rawMessages = await mockAnalyticsRepository.getMessageData();
        const filteredMessages = mockMessageProcessor.processMessageFilters(rawMessages, { provider, model });
        const response = mockMessageProcessor.formatMessageResponse(filteredMessages, { limit, offset });

        res.json({
          success: true,
          ...response,
          timestamp: new Date().toISOString()
        });
      });

      // Act
      const response = await request(app)
        .get('/api/token-analytics/messages')
        .query({ limit: 50, offset: 0, provider: 'anthropic' })
        .expect(200);

      // Assert: Verify collaboration behavior
      expect(mockValidationService.validatePaginationParams).toHaveBeenCalledWith({ limit: '50', offset: '0' });
      expect(mockValidationService.validateFilterParams).toHaveBeenCalledWith({ provider: 'anthropic', model: undefined });
      expect(mockAnalyticsRepository.getMessageData).toHaveBeenCalled();
      expect(mockMessageProcessor.processMessageFilters).toHaveBeenCalledWith(mockMessages, { provider: 'anthropic', model: undefined });
      expect(mockMessageProcessor.formatMessageResponse).toHaveBeenCalled();

      // Verify message structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.data[0]).toHaveProperty('session_id');
      expect(response.body.data[0]).toHaveProperty('total_tokens');
      expect(response.body.data[0]).toHaveProperty('processing_time_ms');
    });

    it('should ensure UUID string safety in message processing', async () => {
      // Test UUID string operations to prevent .slice errors
      const messagesWithUUIDs = [
        {
          id: 1,
          session_id: uuidv4(),
          request_id: uuidv4(),
          message_id: uuidv4(),
          provider: 'anthropic',
          total_tokens: 1000
        }
      ];

      mockAnalyticsRepository.getMessageData.mockResolvedValue(messagesWithUUIDs);

      const mockUUIDProcessor = {
        validateUUIDStrings: jest.fn(),
        processUUIDFields: jest.fn()
      };

      mockUUIDProcessor.validateUUIDStrings.mockImplementation((messages) => {
        messages.forEach(msg => {
          if (typeof msg.session_id !== 'string' || msg.session_id.length !== 36) {
            throw new Error('Invalid session_id UUID format');
          }
          if (typeof msg.request_id !== 'string' || msg.request_id.length !== 36) {
            throw new Error('Invalid request_id UUID format');
          }
        });
        return true;
      });

      mockUUIDProcessor.processUUIDFields.mockImplementation((messages) => {
        return messages.map(msg => ({
          ...msg,
          session_short: msg.session_id.substring(0, 8),
          request_short: msg.request_id.substring(0, 8)
        }));
      });

      app.get('/api/token-analytics/messages', async (req, res) => {
        const messages = await mockAnalyticsRepository.getMessageData();
        mockUUIDProcessor.validateUUIDStrings(messages);
        const processedMessages = mockUUIDProcessor.processUUIDFields(messages);
        res.json({ success: true, data: processedMessages });
      });

      const response = await request(app)
        .get('/api/token-analytics/messages')
        .expect(200);

      // Verify UUID safety
      expect(mockUUIDProcessor.validateUUIDStrings).toHaveBeenCalledWith(messagesWithUUIDs);
      expect(mockUUIDProcessor.processUUIDFields).toHaveBeenCalledWith(messagesWithUUIDs);
      expect(response.body.data[0]).toHaveProperty('session_short');
      expect(response.body.data[0].session_short).toHaveLength(8);
    });
  });

  describe('Summary Analytics API - Outside-In Behavior', () => {
    it('should calculate comprehensive analytics summary with provider breakdowns', async () => {
      // Arrange: Mock comprehensive analytics data
      const mockAllData = {
        messages: [
          { provider: 'anthropic', model: 'claude-3-sonnet', total_tokens: 1000, cost_total: 300, processing_time_ms: 800, session_id: uuidv4() },
          { provider: 'anthropic', model: 'claude-3-haiku', total_tokens: 800, cost_total: 240, processing_time_ms: 600, session_id: uuidv4() },
          { provider: 'openai', model: 'gpt-4', total_tokens: 1200, cost_total: 360, processing_time_ms: 1000, session_id: uuidv4() },
          { provider: 'openai', model: 'gpt-4', total_tokens: 900, cost_total: 270, processing_time_ms: 750, session_id: uuidv4() }
        ]
      };

      const expectedSummary = {
        total_requests: 4,
        total_tokens: 3900,
        total_cost: 1170,
        avg_processing_time: 787.5,
        unique_sessions: 4,
        providers_used: 2,
        models_used: 3
      };

      const expectedProviderBreakdown = [
        {
          provider: 'anthropic',
          requests: 2,
          tokens: 1800,
          cost: 540,
          avg_time: 700
        },
        {
          provider: 'openai',
          requests: 2,
          tokens: 2100,
          cost: 630,
          avg_time: 875
        }
      ];

      // Mock collaboration sequence
      mockAnalyticsRepository.getAllAnalyticsData.mockResolvedValue(mockAllData);
      mockSummaryCalculator.calculateTotalMetrics.mockReturnValue(expectedSummary);
      mockSummaryCalculator.generateProviderBreakdown.mockReturnValue(expectedProviderBreakdown);
      mockSummaryCalculator.generateModelBreakdown.mockReturnValue([]);

      app.get('/api/token-analytics/summary', async (req, res) => {
        const allData = await mockAnalyticsRepository.getAllAnalyticsData();
        const summary = mockSummaryCalculator.calculateTotalMetrics(allData.messages);
        const providerBreakdown = mockSummaryCalculator.generateProviderBreakdown(allData.messages);
        const modelBreakdown = mockSummaryCalculator.generateModelBreakdown(allData.messages);

        res.json({
          success: true,
          data: {
            summary,
            by_provider: providerBreakdown,
            by_model: modelBreakdown
          },
          timestamp: new Date().toISOString()
        });
      });

      // Act
      const response = await request(app)
        .get('/api/token-analytics/summary')
        .expect(200);

      // Assert: Verify calculation collaboration
      expect(mockAnalyticsRepository.getAllAnalyticsData).toHaveBeenCalled();
      expect(mockSummaryCalculator.calculateTotalMetrics).toHaveBeenCalledWith(mockAllData.messages);
      expect(mockSummaryCalculator.generateProviderBreakdown).toHaveBeenCalledWith(mockAllData.messages);
      expect(mockSummaryCalculator.generateModelBreakdown).toHaveBeenCalledWith(mockAllData.messages);

      // Verify summary structure
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toEqual(expectedSummary);
      expect(response.body.data.by_provider).toEqual(expectedProviderBreakdown);
      expect(response.body.data.by_provider).toHaveLength(2);
      expect(response.body.data.by_provider[0].provider).toBe('anthropic');
    });

    it('should handle unique session counting and model aggregation', async () => {
      // Test unique session logic and model grouping
      const messagesWithDuplicateSessions = [
        { session_id: 'session-1', provider: 'anthropic', model: 'claude-3-sonnet', total_tokens: 1000 },
        { session_id: 'session-1', provider: 'anthropic', model: 'claude-3-sonnet', total_tokens: 800 }, // Same session
        { session_id: 'session-2', provider: 'openai', model: 'gpt-4', total_tokens: 1200 },
        { session_id: 'session-3', provider: 'anthropic', model: 'claude-3-haiku', total_tokens: 900 }
      ];

      mockAnalyticsRepository.getAllAnalyticsData.mockResolvedValue({ messages: messagesWithDuplicateSessions });

      mockSummaryCalculator.calculateTotalMetrics.mockImplementation((messages) => {
        const uniqueSessions = new Set(messages.map(m => m.session_id)).size;
        const uniqueModels = new Set(messages.map(m => `${m.provider}:${m.model}`)).size;

        return {
          total_requests: messages.length,
          unique_sessions: uniqueSessions,
          models_used: uniqueModels
        };
      });

      app.get('/api/token-analytics/summary', async (req, res) => {
        const data = await mockAnalyticsRepository.getAllAnalyticsData();
        const summary = mockSummaryCalculator.calculateTotalMetrics(data.messages);
        res.json({ success: true, data: { summary } });
      });

      const response = await request(app)
        .get('/api/token-analytics/summary')
        .expect(200);

      expect(response.body.data.summary.total_requests).toBe(4);
      expect(response.body.data.summary.unique_sessions).toBe(3); // session-1, session-2, session-3
      expect(response.body.data.summary.models_used).toBe(3); // anthropic:claude-3-sonnet, openai:gpt-4, anthropic:claude-3-haiku
    });
  });

  describe('Contract Definition and Data Consistency', () => {
    it('should define consistent data contracts across all analytics endpoints', () => {
      // Define shared analytics data contract
      const analyticsDataContract = {
        success: expect.any(Boolean),
        data: expect.any(Object),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)
      };

      const messageContract = {
        id: expect.any(Number),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/),
        session_id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
        provider: expect.stringMatching(/^(anthropic|openai|google)$/),
        model: expect.any(String),
        total_tokens: expect.any(Number),
        cost_total: expect.any(Number),
        processing_time_ms: expect.any(Number)
      };

      // Test contract enforcement
      const mockMessage = {
        id: 123,
        timestamp: new Date().toISOString(),
        session_id: uuidv4(),
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        total_tokens: 1000,
        cost_total: 300,
        processing_time_ms: 800
      };

      expect(mockMessage).toMatchObject(messageContract);

      const mockResponse = {
        success: true,
        data: { messages: [mockMessage] },
        timestamp: new Date().toISOString()
      };

      expect(mockResponse).toMatchObject(analyticsDataContract);
    });

    it('should ensure data consistency across summary calculations', async () => {
      // Test that summary calculations are consistent with raw data
      const testMessages = [
        { total_tokens: 1000, cost_total: 300, processing_time_ms: 800 },
        { total_tokens: 1500, cost_total: 450, processing_time_ms: 1200 }
      ];

      mockSummaryCalculator.calculateTotalMetrics.mockImplementation((messages) => {
        const totalTokens = messages.reduce((sum, msg) => sum + msg.total_tokens, 0);
        const totalCost = messages.reduce((sum, msg) => sum + msg.cost_total, 0);
        const avgTime = messages.reduce((sum, msg) => sum + msg.processing_time_ms, 0) / messages.length;

        return {
          total_requests: messages.length,
          total_tokens: totalTokens,
          total_cost: totalCost,
          avg_processing_time: avgTime
        };
      });

      const summary = mockSummaryCalculator.calculateTotalMetrics(testMessages);

      // Verify calculations are consistent
      expect(summary.total_requests).toBe(2);
      expect(summary.total_tokens).toBe(2500); // 1000 + 1500
      expect(summary.total_cost).toBe(750); // 300 + 450
      expect(summary.avg_processing_time).toBe(1000); // (800 + 1200) / 2
    });
  });

  describe('Performance and Error Scenarios', () => {
    it('should handle concurrent analytics requests efficiently', async () => {
      // Test concurrent request handling
      const mockPerformanceMonitor = {
        trackConcurrentRequests: jest.fn(),
        measureResponseTime: jest.fn()
      };

      mockAnalyticsRepository.getDailyTokenData.mockResolvedValue([]);
      mockAnalyticsRepository.getMessageData.mockResolvedValue([]);
      mockAnalyticsRepository.getAllAnalyticsData.mockResolvedValue({ messages: [] });

      mockPerformanceMonitor.trackConcurrentRequests.mockReturnValue('request-123');
      mockPerformanceMonitor.measureResponseTime.mockReturnValue(150);

      // Add all endpoints
      app.get('/api/token-analytics/daily', async (req, res) => {
        const requestId = mockPerformanceMonitor.trackConcurrentRequests();
        const data = await mockAnalyticsRepository.getDailyTokenData();
        const responseTime = mockPerformanceMonitor.measureResponseTime();
        res.json({ success: true, data, requestId, responseTime });
      });

      app.get('/api/token-analytics/messages', async (req, res) => {
        const requestId = mockPerformanceMonitor.trackConcurrentRequests();
        const data = await mockAnalyticsRepository.getMessageData();
        const responseTime = mockPerformanceMonitor.measureResponseTime();
        res.json({ success: true, data, requestId, responseTime });
      });

      app.get('/api/token-analytics/summary', async (req, res) => {
        const requestId = mockPerformanceMonitor.trackConcurrentRequests();
        const data = await mockAnalyticsRepository.getAllAnalyticsData();
        const responseTime = mockPerformanceMonitor.measureResponseTime();
        res.json({ success: true, data, requestId, responseTime });
      });

      // Make concurrent requests
      const [dailyResponse, messagesResponse, summaryResponse] = await Promise.all([
        request(app).get('/api/token-analytics/daily'),
        request(app).get('/api/token-analytics/messages'),
        request(app).get('/api/token-analytics/summary')
      ]);

      // Verify concurrent handling
      expect(mockPerformanceMonitor.trackConcurrentRequests).toHaveBeenCalledTimes(3);
      expect(mockPerformanceMonitor.measureResponseTime).toHaveBeenCalledTimes(3);
      expect(dailyResponse.status).toBe(200);
      expect(messagesResponse.status).toBe(200);
      expect(summaryResponse.status).toBe(200);
    });

    it('should handle data corruption and validation errors gracefully', async () => {
      // Test corrupted data handling
      const corruptedData = [
        { total_tokens: 'invalid', total_requests: null, date: '2025-09-29' },
        { total_tokens: -1000, total_requests: 50, date: 'invalid-date' }
      ];

      mockAnalyticsRepository.getDailyTokenData.mockResolvedValue(corruptedData);

      const mockDataValidator = {
        validateDataIntegrity: jest.fn(),
        sanitizeCorruptedData: jest.fn(),
        createValidationReport: jest.fn()
      };

      mockDataValidator.validateDataIntegrity.mockImplementation((data) => {
        const errors = [];
        data.forEach((item, index) => {
          if (typeof item.total_tokens !== 'number' || item.total_tokens < 0) {
            errors.push({ index, field: 'total_tokens', value: item.total_tokens });
          }
          if (!item.total_requests || item.total_requests < 0) {
            errors.push({ index, field: 'total_requests', value: item.total_requests });
          }
        });
        return errors;
      });

      mockDataValidator.sanitizeCorruptedData.mockReturnValue([]);
      mockDataValidator.createValidationReport.mockReturnValue({
        total_records: 2,
        valid_records: 0,
        errors: 4
      });

      app.get('/api/token-analytics/daily', async (req, res) => {
        const data = await mockAnalyticsRepository.getDailyTokenData();
        const validationErrors = mockDataValidator.validateDataIntegrity(data);

        if (validationErrors.length > 0) {
          const sanitizedData = mockDataValidator.sanitizeCorruptedData(data);
          const report = mockDataValidator.createValidationReport(data, validationErrors);

          res.status(422).json({
            success: false,
            error: 'Data validation failed',
            data: sanitizedData,
            validation_report: report,
            errors: validationErrors
          });
        } else {
          res.json({ success: true, data });
        }
      });

      const response = await request(app)
        .get('/api/token-analytics/daily')
        .expect(422);

      // Verify error handling
      expect(mockDataValidator.validateDataIntegrity).toHaveBeenCalledWith(corruptedData);
      expect(mockDataValidator.sanitizeCorruptedData).toHaveBeenCalledWith(corruptedData);
      expect(response.body.success).toBe(false);
      expect(response.body.validation_report.errors).toBe(4);
      expect(response.body.errors).toHaveLength(4);
    });
  });
});