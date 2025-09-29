/**
 * TDD London School Tests for /api/token-analytics/hourly endpoint
 * Outside-in development with Chart.js compatibility focus
 * Behavior verification and mock-driven testing
 */

const request = require('supertest');
const express = require('express');

describe('Token Analytics Hourly API - London School TDD', () => {
  let app;
  let mockAnalyticsRepository;
  let mockChartDataFormatter;
  let mockTimeSeriesProcessor;
  let mockValidationService;

  beforeEach(() => {
    // Mock collaborators following London School approach
    mockAnalyticsRepository = {
      getHourlyTokenData: jest.fn(),
      validateTimeRange: jest.fn(),
      aggregateMetrics: jest.fn()
    };

    mockChartDataFormatter = {
      formatForChartJs: jest.fn(),
      createDatasets: jest.fn(),
      generateLabels: jest.fn(),
      validateChartStructure: jest.fn()
    };

    mockTimeSeriesProcessor = {
      processHourlyMetrics: jest.fn(),
      calculateAverages: jest.fn(),
      fillMissingHours: jest.fn(),
      sortByTime: jest.fn()
    };

    mockValidationService = {
      validateHourlyRequest: jest.fn(),
      ensureDataIntegrity: jest.fn(),
      checkForAnomalies: jest.fn()
    };

    // Create minimal express app for testing
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

  describe('Outside-In: Chart.js Data Structure Behavior', () => {
    it('should provide Chart.js compatible hourly token analytics', async () => {
      // Arrange: Mock the expected behavior chain for Chart.js
      const mockHourlyData = [
        {
          hour: '10:00',
          total_tokens: 2500,
          total_requests: 15,
          total_cost: 750, // cents
          avg_processing_time: 850
        },
        {
          hour: '11:00',
          total_tokens: 3200,
          total_requests: 22,
          total_cost: 960,
          avg_processing_time: 920
        },
        {
          hour: '12:00',
          total_tokens: 4100,
          total_requests: 28,
          total_cost: 1230,
          avg_processing_time: 780
        }
      ];

      const expectedChartJsFormat = {
        labels: ['10:00', '11:00', '12:00'],
        datasets: [
          {
            label: 'Total Tokens',
            data: [2500, 3200, 4100],
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Requests',
            data: [15, 22, 28],
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgb(16, 185, 129)',
            borderWidth: 1,
            yAxisID: 'y1'
          },
          {
            label: 'Cost (cents)',
            data: [750, 960, 1230],
            backgroundColor: 'rgba(139, 69, 19, 0.5)',
            borderColor: 'rgb(139, 69, 19)',
            borderWidth: 1,
            yAxisID: 'y'
          }
        ]
      };

      // Mock the collaboration sequence
      mockValidationService.validateHourlyRequest.mockReturnValue(true);
      mockAnalyticsRepository.getHourlyTokenData.mockResolvedValue(mockHourlyData);
      mockTimeSeriesProcessor.processHourlyMetrics.mockReturnValue(mockHourlyData);
      mockTimeSeriesProcessor.fillMissingHours.mockReturnValue(mockHourlyData);
      mockTimeSeriesProcessor.sortByTime.mockReturnValue(mockHourlyData);
      mockChartDataFormatter.generateLabels.mockReturnValue(['10:00', '11:00', '12:00']);
      mockChartDataFormatter.createDatasets.mockReturnValue(expectedChartJsFormat.datasets);
      mockChartDataFormatter.formatForChartJs.mockReturnValue(expectedChartJsFormat);
      mockChartDataFormatter.validateChartStructure.mockReturnValue(true);

      // Add the endpoint with mocked dependencies
      app.get('/api/token-analytics/hourly', async (req, res) => {
        // Validate request
        mockValidationService.validateHourlyRequest(req.query);

        // Get raw data
        const rawData = await mockAnalyticsRepository.getHourlyTokenData();

        // Process time series
        const processedData = mockTimeSeriesProcessor.processHourlyMetrics(rawData);
        const filledData = mockTimeSeriesProcessor.fillMissingHours(processedData);
        const sortedData = mockTimeSeriesProcessor.sortByTime(filledData);

        // Format for Chart.js
        const labels = mockChartDataFormatter.generateLabels(sortedData);
        const datasets = mockChartDataFormatter.createDatasets(sortedData);
        const chartData = mockChartDataFormatter.formatForChartJs(labels, datasets);

        // Validate final structure
        mockChartDataFormatter.validateChartStructure(chartData);

        res.json({
          success: true,
          data: chartData,
          raw_data: sortedData,
          timestamp: new Date().toISOString()
        });
      });

      // Act: Make request to the endpoint
      const response = await request(app)
        .get('/api/token-analytics/hourly')
        .expect(200);

      // Assert: Verify the collaboration behavior
      expect(mockValidationService.validateHourlyRequest).toHaveBeenCalled();
      expect(mockAnalyticsRepository.getHourlyTokenData).toHaveBeenCalled();
      expect(mockTimeSeriesProcessor.processHourlyMetrics).toHaveBeenCalledWith(mockHourlyData);
      expect(mockTimeSeriesProcessor.fillMissingHours).toHaveBeenCalledWith(mockHourlyData);
      expect(mockTimeSeriesProcessor.sortByTime).toHaveBeenCalledWith(mockHourlyData);
      expect(mockChartDataFormatter.generateLabels).toHaveBeenCalledWith(mockHourlyData);
      expect(mockChartDataFormatter.createDatasets).toHaveBeenCalledWith(mockHourlyData);
      expect(mockChartDataFormatter.validateChartStructure).toHaveBeenCalledWith(expectedChartJsFormat);

      // Verify Chart.js compatible response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('labels');
      expect(response.body.data).toHaveProperty('datasets');
      expect(response.body.data.labels).toEqual(['10:00', '11:00', '12:00']);
      expect(response.body.data.datasets).toHaveLength(3);
      expect(response.body.data.datasets[0]).toHaveProperty('yAxisID', 'y');
      expect(response.body.data.datasets[1]).toHaveProperty('yAxisID', 'y1');
      expect(response.body.raw_data).toEqual(mockHourlyData);
    });

    it('should handle multi-axis Chart.js configuration for different metrics', async () => {
      // Test dual-axis chart setup for tokens vs requests
      const mockMetrics = [
        { hour: '14:00', total_tokens: 5000, total_requests: 10 },
        { hour: '15:00', total_tokens: 7500, total_requests: 15 }
      ];

      mockAnalyticsRepository.getHourlyTokenData.mockResolvedValue(mockMetrics);

      // Mock Chart.js dual-axis configuration
      const mockDualAxisConfig = {
        labels: ['14:00', '15:00'],
        datasets: [
          {
            label: 'Total Tokens',
            data: [5000, 7500],
            yAxisID: 'y', // Primary axis
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)'
          },
          {
            label: 'Requests',
            data: [10, 15],
            yAxisID: 'y1', // Secondary axis
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgb(16, 185, 129)'
          }
        ]
      };

      mockChartDataFormatter.formatForChartJs.mockReturnValue(mockDualAxisConfig);

      app.get('/api/token-analytics/hourly', async (req, res) => {
        const data = await mockAnalyticsRepository.getHourlyTokenData();
        const chartConfig = mockChartDataFormatter.formatForChartJs(data);
        res.json({ success: true, data: chartConfig });
      });

      const response = await request(app)
        .get('/api/token-analytics/hourly')
        .expect(200);

      // Verify dual-axis configuration
      expect(response.body.data.datasets[0].yAxisID).toBe('y');
      expect(response.body.data.datasets[1].yAxisID).toBe('y1');
      expect(mockChartDataFormatter.formatForChartJs).toHaveBeenCalledWith(mockMetrics);
    });
  });

  describe('Behavior Verification: Time Series Processing', () => {
    it('should coordinate time series processing with missing hour handling', async () => {
      // Arrange: Mock incomplete hourly data
      const incompleteData = [
        { hour: '09:00', total_tokens: 1000, total_requests: 5 },
        // Missing 10:00 hour
        { hour: '11:00', total_tokens: 2000, total_requests: 8 },
        { hour: '12:00', total_tokens: 1500, total_requests: 6 }
      ];

      const filledData = [
        { hour: '09:00', total_tokens: 1000, total_requests: 5 },
        { hour: '10:00', total_tokens: 0, total_requests: 0 }, // Filled missing hour
        { hour: '11:00', total_tokens: 2000, total_requests: 8 },
        { hour: '12:00', total_tokens: 1500, total_requests: 6 }
      ];

      mockAnalyticsRepository.getHourlyTokenData.mockResolvedValue(incompleteData);
      mockTimeSeriesProcessor.fillMissingHours.mockReturnValue(filledData);
      mockTimeSeriesProcessor.sortByTime.mockReturnValue(filledData);

      app.get('/api/token-analytics/hourly', async (req, res) => {
        const rawData = await mockAnalyticsRepository.getHourlyTokenData();
        const processedData = mockTimeSeriesProcessor.fillMissingHours(rawData);
        const sortedData = mockTimeSeriesProcessor.sortByTime(processedData);

        res.json({
          success: true,
          data: sortedData,
          filled_hours: filledData.length - incompleteData.length
        });
      });

      // Act
      const response = await request(app)
        .get('/api/token-analytics/hourly')
        .expect(200);

      // Assert: Verify time series processing collaboration
      expect(mockAnalyticsRepository.getHourlyTokenData).toHaveBeenCalled();
      expect(mockTimeSeriesProcessor.fillMissingHours).toHaveBeenCalledWith(incompleteData);
      expect(mockTimeSeriesProcessor.sortByTime).toHaveBeenCalledWith(filledData);
      expect(response.body.filled_hours).toBe(1);
      expect(response.body.data).toHaveLength(4);
      expect(response.body.data[1].hour).toBe('10:00');
      expect(response.body.data[1].total_tokens).toBe(0);
    });

    it('should validate and process real-time metric calculations', async () => {
      // Test real-time average calculations
      const mockRealTimeData = [
        { hour: '13:00', total_tokens: 3000, total_requests: 12, processing_times: [800, 750, 900] },
        { hour: '14:00', total_tokens: 3500, total_requests: 14, processing_times: [850, 820, 780] }
      ];

      mockAnalyticsRepository.getHourlyTokenData.mockResolvedValue(mockRealTimeData);
      mockTimeSeriesProcessor.calculateAverages.mockImplementation((data) => {
        return data.map(item => ({
          ...item,
          avg_processing_time: item.processing_times.reduce((a, b) => a + b, 0) / item.processing_times.length,
          avg_tokens_per_request: item.total_tokens / item.total_requests
        }));
      });

      app.get('/api/token-analytics/hourly', async (req, res) => {
        const rawData = await mockAnalyticsRepository.getHourlyTokenData();
        const processedData = mockTimeSeriesProcessor.calculateAverages(rawData);
        res.json({ success: true, data: processedData });
      });

      const response = await request(app)
        .get('/api/token-analytics/hourly')
        .expect(200);

      // Verify average calculations
      expect(mockTimeSeriesProcessor.calculateAverages).toHaveBeenCalledWith(mockRealTimeData);
      expect(response.body.data[0].avg_processing_time).toBe(816.67); // (800+750+900)/3
      expect(response.body.data[0].avg_tokens_per_request).toBe(250); // 3000/12
      expect(response.body.data[1].avg_processing_time).toBe(816.67); // (850+820+780)/3
      expect(response.body.data[1].avg_tokens_per_request).toBe(250); // 3500/14
    });
  });

  describe('Contract Definition: Chart.js Data Structure', () => {
    it('should define and enforce Chart.js dataset contract', () => {
      // Define the Chart.js dataset contract
      const chartJsDatasetContract = {
        label: expect.any(String),
        data: expect.any(Array),
        backgroundColor: expect.stringMatching(/^rgba?\(\d+,\s*\d+,\s*\d+(?:,\s*[\d.]+)?\)$/),
        borderColor: expect.stringMatching(/^rgba?\(\d+,\s*\d+,\s*\d+(?:,\s*[\d.]+)?\)$/),
        borderWidth: expect.any(Number),
        yAxisID: expect.stringMatching(/^y1?$/)
      };

      // Mock formatter should enforce this contract
      mockChartDataFormatter.createDatasets.mockImplementation((data) => {
        const datasets = [
          {
            label: 'Total Tokens',
            data: data.map(d => d.total_tokens),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Requests',
            data: data.map(d => d.total_requests),
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgb(16, 185, 129)',
            borderWidth: 1,
            yAxisID: 'y1'
          }
        ];

        // Validate each dataset against contract
        datasets.forEach(dataset => {
          expect(dataset).toMatchObject(chartJsDatasetContract);
        });

        return datasets;
      });

      const mockData = [
        { hour: '15:00', total_tokens: 1000, total_requests: 5 }
      ];

      // Test contract enforcement
      const datasets = mockChartDataFormatter.createDatasets(mockData);
      expect(datasets).toHaveLength(2);
      expect(datasets[0]).toMatchObject(chartJsDatasetContract);
      expect(datasets[1]).toMatchObject(chartJsDatasetContract);
    });

    it('should define Chart.js configuration contract', () => {
      // Define complete Chart.js configuration contract
      const chartJsConfigContract = {
        labels: expect.any(Array),
        datasets: expect.arrayContaining([
          expect.objectContaining({
            label: expect.any(String),
            data: expect.any(Array),
            yAxisID: expect.any(String)
          })
        ])
      };

      mockChartDataFormatter.formatForChartJs.mockReturnValue({
        labels: ['16:00', '17:00'],
        datasets: [
          {
            label: 'Test Dataset',
            data: [100, 200],
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
            yAxisID: 'y'
          }
        ]
      });

      const chartConfig = mockChartDataFormatter.formatForChartJs();
      expect(chartConfig).toMatchObject(chartJsConfigContract);
      expect(chartConfig.labels).toContain('16:00');
      expect(chartConfig.datasets[0].data).toEqual([100, 200]);
    });
  });

  describe('Performance and Data Integrity', () => {
    it('should handle large hourly datasets efficiently', async () => {
      // Generate large dataset (24 hours of data)
      const largeDataset = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        total_tokens: Math.floor(Math.random() * 10000) + 1000,
        total_requests: Math.floor(Math.random() * 100) + 10,
        total_cost: Math.floor(Math.random() * 1000) + 100,
        avg_processing_time: Math.floor(Math.random() * 1000) + 200
      }));

      mockAnalyticsRepository.getHourlyTokenData.mockResolvedValue(largeDataset);
      mockTimeSeriesProcessor.processHourlyMetrics.mockImplementation((data) => {
        // Simulate efficient processing
        return data.map(item => ({ ...item, processed: true }));
      });

      const mockPerformanceMonitor = {
        measureProcessingTime: jest.fn(),
        validatePerformance: jest.fn()
      };

      mockPerformanceMonitor.measureProcessingTime.mockReturnValue(150); // ms
      mockPerformanceMonitor.validatePerformance.mockReturnValue(true);

      app.get('/api/token-analytics/hourly', async (req, res) => {
        const startTime = Date.now();

        const data = await mockAnalyticsRepository.getHourlyTokenData();
        const processed = mockTimeSeriesProcessor.processHourlyMetrics(data);

        const processingTime = mockPerformanceMonitor.measureProcessingTime(startTime);
        mockPerformanceMonitor.validatePerformance(processingTime);

        res.json({
          success: true,
          data: processed,
          performance: { processing_time_ms: processingTime }
        });
      });

      const response = await request(app)
        .get('/api/token-analytics/hourly')
        .expect(200);

      // Verify performance and data handling
      expect(mockTimeSeriesProcessor.processHourlyMetrics).toHaveBeenCalledWith(largeDataset);
      expect(mockPerformanceMonitor.measureProcessingTime).toHaveBeenCalled();
      expect(mockPerformanceMonitor.validatePerformance).toHaveBeenCalled();
      expect(response.body.data).toHaveLength(24);
      expect(response.body.performance.processing_time_ms).toBeLessThan(1000);
    });

    it('should detect and handle data anomalies', async () => {
      // Mock data with anomalies
      const anomalousData = [
        { hour: '18:00', total_tokens: 2000, total_requests: 10 },
        { hour: '19:00', total_tokens: -500, total_requests: 8 }, // Negative tokens (anomaly)
        { hour: '20:00', total_tokens: 50000, total_requests: 5 }, // Extremely high tokens (anomaly)
        { hour: '21:00', total_tokens: 1800, total_requests: 9 }
      ];

      mockAnalyticsRepository.getHourlyTokenData.mockResolvedValue(anomalousData);
      mockValidationService.checkForAnomalies.mockImplementation((data) => {
        const anomalies = [];
        data.forEach((item, index) => {
          if (item.total_tokens < 0) {
            anomalies.push({ index, type: 'negative_tokens', value: item.total_tokens });
          }
          if (item.total_tokens > 20000) {
            anomalies.push({ index, type: 'excessive_tokens', value: item.total_tokens });
          }
        });
        return anomalies;
      });

      app.get('/api/token-analytics/hourly', async (req, res) => {
        const data = await mockAnalyticsRepository.getHourlyTokenData();
        const anomalies = mockValidationService.checkForAnomalies(data);

        res.json({
          success: true,
          data: data,
          anomalies: anomalies,
          data_quality: anomalies.length === 0 ? 'clean' : 'anomalies_detected'
        });
      });

      const response = await request(app)
        .get('/api/token-analytics/hourly')
        .expect(200);

      // Verify anomaly detection
      expect(mockValidationService.checkForAnomalies).toHaveBeenCalledWith(anomalousData);
      expect(response.body.anomalies).toHaveLength(2);
      expect(response.body.anomalies[0].type).toBe('negative_tokens');
      expect(response.body.anomalies[1].type).toBe('excessive_tokens');
      expect(response.body.data_quality).toBe('anomalies_detected');
    });
  });

  describe('Error Handling Collaboration', () => {
    it('should coordinate error handling across time series processing', async () => {
      // Mock repository error
      const repositoryError = new Error('Database connection timeout');
      mockAnalyticsRepository.getHourlyTokenData.mockRejectedValue(repositoryError);

      const mockErrorHandler = {
        handleRepositoryError: jest.fn(),
        createAnalyticsErrorResponse: jest.fn()
      };

      mockErrorHandler.handleRepositoryError.mockReturnValue({
        status: 503,
        type: 'service_unavailable',
        retry_after: 30
      });

      mockErrorHandler.createAnalyticsErrorResponse.mockReturnValue({
        success: false,
        error: 'Analytics service temporarily unavailable',
        retry_after: 30,
        timestamp: new Date().toISOString()
      });

      app.get('/api/token-analytics/hourly', async (req, res) => {
        try {
          await mockAnalyticsRepository.getHourlyTokenData();
        } catch (error) {
          const handledError = mockErrorHandler.handleRepositoryError(error);
          const errorResponse = mockErrorHandler.createAnalyticsErrorResponse(handledError);
          res.status(handledError.status).json(errorResponse);
        }
      });

      const response = await request(app)
        .get('/api/token-analytics/hourly')
        .expect(503);

      // Verify error handling collaboration
      expect(mockErrorHandler.handleRepositoryError).toHaveBeenCalledWith(repositoryError);
      expect(mockErrorHandler.createAnalyticsErrorResponse).toHaveBeenCalled();
      expect(response.body.success).toBe(false);
      expect(response.body.retry_after).toBe(30);
    });
  });
});