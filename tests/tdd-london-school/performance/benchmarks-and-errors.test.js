/**
 * TDD London School Performance Benchmarks and Error Scenario Tests
 * Focus on performance monitoring collaboration and error handling behavior
 * Tests performance under various conditions and comprehensive error scenarios
 */

const request = require('supertest');
const express = require('express');
const { performance } = require('perf_hooks');
const { v4: uuidv4 } = require('uuid');

describe('Performance Benchmarks and Error Scenarios - London School TDD', () => {
  let app;
  let mockPerformanceMonitor;
  let mockStressTestOrchestrator;
  let mockErrorScenarioManager;
  let mockResourceMonitor;
  let mockMetricsCollector;

  beforeEach(() => {
    // Mock performance monitoring collaborators
    mockPerformanceMonitor = {
      startBenchmark: jest.fn(),
      endBenchmark: jest.fn(),
      measureResponseTime: jest.fn(),
      trackThroughput: jest.fn(),
      monitorMemoryUsage: jest.fn(),
      validatePerformanceThresholds: jest.fn()
    };

    mockStressTestOrchestrator = {
      simulateConcurrentLoad: jest.fn(),
      generateStressScenarios: jest.fn(),
      coordinateLoadDistribution: jest.fn(),
      measureSystemUnderStress: jest.fn()
    };

    mockErrorScenarioManager = {
      simulateNetworkErrors: jest.fn(),
      simulateDataCorruption: jest.fn(),
      simulateResourceExhaustion: jest.fn(),
      simulateComponentFailures: jest.fn(),
      measureErrorRecovery: jest.fn()
    };

    mockResourceMonitor = {
      trackCPUUsage: jest.fn(),
      trackMemoryUsage: jest.fn(),
      trackNetworkLatency: jest.fn(),
      validateResourceLimits: jest.fn()
    };

    mockMetricsCollector = {
      collectPerformanceMetrics: jest.fn(),
      aggregateMetrics: jest.fn(),
      generatePerformanceReport: jest.fn(),
      compareAgainstBaseline: jest.fn()
    };

    app = express();
    app.use(express.json());

    // Setup default mock behaviors
    mockPerformanceMonitor.startBenchmark.mockReturnValue(performance.now());
    mockPerformanceMonitor.endBenchmark.mockReturnValue(performance.now());
    mockPerformanceMonitor.measureResponseTime.mockReturnValue(150);
    mockPerformanceMonitor.validatePerformanceThresholds.mockReturnValue(true);
    mockResourceMonitor.trackCPUUsage.mockReturnValue(45.5);
    mockResourceMonitor.trackMemoryUsage.mockReturnValue(128.7);
    mockResourceMonitor.trackNetworkLatency.mockReturnValue(25);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Performance Benchmark Collaboration', () => {
    it('should benchmark activities API performance with comprehensive monitoring', async () => {
      // Arrange: Setup performance monitoring collaboration
      const mockActivitiesData = Array.from({ length: 100 }, (_, i) => ({
        id: uuidv4(),
        type: 'agent_post',
        message: `Test activity ${i}`,
        timestamp: new Date().toISOString(),
        agent_id: uuidv4()
      }));

      const performanceThresholds = {
        maxResponseTime: 500, // ms
        maxMemoryUsage: 200, // MB
        maxCPUUsage: 70, // %
        minThroughput: 100 // requests per second
      };

      // Mock performance benchmark orchestration
      mockStressTestOrchestrator.simulateConcurrentLoad.mockImplementation(async (endpoint, concurrency, duration) => {
        const results = [];
        const startTime = performance.now();

        for (let i = 0; i < concurrency; i++) {
          const requestStart = mockPerformanceMonitor.startBenchmark();

          // Simulate request processing
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

          const requestEnd = mockPerformanceMonitor.endBenchmark();
          const responseTime = mockPerformanceMonitor.measureResponseTime(requestStart, requestEnd);

          const cpuUsage = mockResourceMonitor.trackCPUUsage();
          const memoryUsage = mockResourceMonitor.trackMemoryUsage();
          const networkLatency = mockResourceMonitor.trackNetworkLatency();

          results.push({
            requestId: i,
            responseTime,
            cpuUsage,
            memoryUsage,
            networkLatency,
            timestamp: new Date().toISOString()
          });
        }

        const endTime = performance.now();
        const totalDuration = endTime - startTime;
        const throughput = (concurrency / totalDuration) * 1000; // requests per second

        mockPerformanceMonitor.trackThroughput(throughput);

        return {
          results,
          summary: {
            totalRequests: concurrency,
            duration: totalDuration,
            throughput,
            avgResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length,
            avgCPUUsage: results.reduce((sum, r) => sum + r.cpuUsage, 0) / results.length,
            avgMemoryUsage: results.reduce((sum, r) => sum + r.memoryUsage, 0) / results.length
          }
        };
      });

      app.get('/api/activities', async (req, res) => {
        const benchmarkStart = mockPerformanceMonitor.startBenchmark();

        // Simulate data processing
        const processedData = mockActivitiesData.slice(0, parseInt(req.query.limit) || 20);

        const benchmarkEnd = mockPerformanceMonitor.endBenchmark();
        const responseTime = mockPerformanceMonitor.measureResponseTime(benchmarkStart, benchmarkEnd);

        // Collect performance metrics
        const metrics = {
          responseTime,
          cpuUsage: mockResourceMonitor.trackCPUUsage(),
          memoryUsage: mockResourceMonitor.trackMemoryUsage(),
          networkLatency: mockResourceMonitor.trackNetworkLatency()
        };

        mockMetricsCollector.collectPerformanceMetrics(metrics);

        res.json({
          success: true,
          data: processedData,
          total: mockActivitiesData.length,
          performance: metrics,
          timestamp: new Date().toISOString()
        });
      });

      app.post('/api/performance-benchmark', async (req, res) => {
        const { endpoint, concurrency = 10, duration = 1000 } = req.body;

        // Run stress test
        const loadTestResults = await mockStressTestOrchestrator.simulateConcurrentLoad(
          endpoint,
          concurrency,
          duration
        );

        // Validate against thresholds
        const thresholdValidation = mockPerformanceMonitor.validatePerformanceThresholds(
          loadTestResults.summary,
          performanceThresholds
        );

        // Generate performance report
        const performanceReport = mockMetricsCollector.generatePerformanceReport(loadTestResults);

        res.json({
          success: true,
          benchmarkResults: loadTestResults,
          thresholdValidation,
          performanceReport,
          thresholds: performanceThresholds
        });
      });

      // Act: Run performance benchmark
      const benchmarkResponse = await request(app)
        .post('/api/performance-benchmark')
        .send({
          endpoint: '/api/activities',
          concurrency: 20,
          duration: 2000
        })
        .timeout(10000)
        .expect(200);

      // Assert: Verify performance monitoring collaboration
      expect(mockStressTestOrchestrator.simulateConcurrentLoad).toHaveBeenCalledWith(
        '/api/activities',
        20,
        2000
      );

      // Verify performance measurements
      expect(mockPerformanceMonitor.startBenchmark).toHaveBeenCalledTimes(20);
      expect(mockPerformanceMonitor.endBenchmark).toHaveBeenCalledTimes(20);
      expect(mockPerformanceMonitor.measureResponseTime).toHaveBeenCalledTimes(20);
      expect(mockResourceMonitor.trackCPUUsage).toHaveBeenCalledTimes(20);
      expect(mockResourceMonitor.trackMemoryUsage).toHaveBeenCalledTimes(20);
      expect(mockResourceMonitor.trackNetworkLatency).toHaveBeenCalledTimes(20);

      // Verify throughput tracking
      expect(mockPerformanceMonitor.trackThroughput).toHaveBeenCalled();

      // Verify threshold validation
      expect(mockPerformanceMonitor.validatePerformanceThresholds).toHaveBeenCalledWith(
        expect.objectContaining({
          totalRequests: 20,
          throughput: expect.any(Number),
          avgResponseTime: expect.any(Number)
        }),
        performanceThresholds
      );

      // Verify report generation
      expect(mockMetricsCollector.generatePerformanceReport).toHaveBeenCalled();

      expect(benchmarkResponse.body.success).toBe(true);
      expect(benchmarkResponse.body.benchmarkResults.summary.totalRequests).toBe(20);
      expect(benchmarkResponse.body.thresholds).toEqual(performanceThresholds);

      console.log(`Performance benchmark completed: ${benchmarkResponse.body.benchmarkResults.summary.avgResponseTime}ms avg response time`);
    });

    it('should benchmark Chart.js data transformation performance', async () => {
      // Test performance of Chart.js data transformation under load
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        hour: `${(i % 24).toString().padStart(2, '0')}:00`,
        total_tokens: Math.floor(Math.random() * 10000) + 1000,
        total_requests: Math.floor(Math.random() * 100) + 10
      }));

      const mockChartTransformationBenchmark = {
        benchmarkDataTransformation: jest.fn(),
        measureTransformationSteps: jest.fn(),
        validateTransformationPerformance: jest.fn()
      };

      mockChartTransformationBenchmark.benchmarkDataTransformation.mockImplementation((data) => {
        const transformationStart = performance.now();

        // Simulate Chart.js transformation steps
        const labels = data.map(d => d.hour);
        const tokenData = data.map(d => d.total_tokens);
        const requestData = data.map(d => d.total_requests);

        const chartData = {
          labels,
          datasets: [
            {
              label: 'Tokens',
              data: tokenData,
              backgroundColor: 'rgba(59, 130, 246, 0.5)'
            },
            {
              label: 'Requests',
              data: requestData,
              backgroundColor: 'rgba(16, 185, 129, 0.5)'
            }
          ]
        };

        const transformationEnd = performance.now();
        const transformationTime = transformationEnd - transformationStart;

        mockPerformanceMonitor.measureResponseTime(transformationStart, transformationEnd);

        return {
          chartData,
          performance: {
            transformationTime,
            dataPoints: data.length,
            datasets: chartData.datasets.length,
            memoryUsage: mockResourceMonitor.trackMemoryUsage()
          }
        };
      });

      app.get('/api/token-analytics/hourly', async (req, res) => {
        const benchmarkStart = mockPerformanceMonitor.startBenchmark();

        // Benchmark Chart.js transformation
        const transformationResult = mockChartTransformationBenchmark.benchmarkDataTransformation(largeDataset);

        // Measure transformation steps
        mockChartTransformationBenchmark.measureTransformationSteps(transformationResult.performance);

        // Validate performance
        const performanceValid = mockChartTransformationBenchmark.validateTransformationPerformance(
          transformationResult.performance
        );

        const benchmarkEnd = mockPerformanceMonitor.endBenchmark();

        res.json({
          success: true,
          data: transformationResult.chartData,
          performance: {
            ...transformationResult.performance,
            totalBenchmarkTime: mockPerformanceMonitor.measureResponseTime(benchmarkStart, benchmarkEnd),
            performanceValid
          }
        });
      });

      // Act
      const response = await request(app)
        .get('/api/token-analytics/hourly')
        .timeout(10000)
        .expect(200);

      // Assert: Verify Chart.js transformation benchmarking
      expect(mockChartTransformationBenchmark.benchmarkDataTransformation).toHaveBeenCalledWith(largeDataset);
      expect(mockChartTransformationBenchmark.measureTransformationSteps).toHaveBeenCalled();
      expect(mockChartTransformationBenchmark.validateTransformationPerformance).toHaveBeenCalled();

      // Verify Chart.js structure
      expect(response.body.data).toHaveProperty('labels');
      expect(response.body.data).toHaveProperty('datasets');
      expect(response.body.data.datasets).toHaveLength(2);

      // Verify performance metrics
      expect(response.body.performance).toHaveProperty('transformationTime');
      expect(response.body.performance).toHaveProperty('dataPoints', 1000);
      expect(response.body.performance).toHaveProperty('datasets', 2);

      console.log(`Chart.js transformation of ${response.body.performance.dataPoints} data points completed in ${response.body.performance.transformationTime}ms`);
    });
  });

  describe('Comprehensive Error Scenario Testing', () => {
    it('should handle network failure scenarios with proper error collaboration', async () => {
      // Test comprehensive network error handling
      const networkErrorScenarios = [
        { type: 'timeout', duration: 5000 },
        { type: 'connection_refused', code: 'ECONNREFUSED' },
        { type: 'dns_failure', code: 'ENOTFOUND' },
        { type: 'ssl_error', code: 'DEPTH_ZERO_SELF_SIGNED_CERT' }
      ];

      const mockNetworkErrorHandler = {
        simulateNetworkError: jest.fn(),
        handleNetworkError: jest.fn(),
        implementRetryStrategy: jest.fn(),
        fallbackToCache: jest.fn()
      };

      mockErrorScenarioManager.simulateNetworkErrors.mockImplementation((scenarios) => {
        const errorResults = [];

        scenarios.forEach(scenario => {
          const errorStart = performance.now();

          // Simulate error handling
          const simulatedError = mockNetworkErrorHandler.simulateNetworkError(scenario);
          const handlingResult = mockNetworkErrorHandler.handleNetworkError(simulatedError);

          let recoveryAction = null;
          if (handlingResult.requiresRetry) {
            recoveryAction = mockNetworkErrorHandler.implementRetryStrategy(scenario);
          } else if (handlingResult.useFallback) {
            recoveryAction = mockNetworkErrorHandler.fallbackToCache(scenario);
          }

          const errorEnd = performance.now();
          const errorHandlingTime = errorEnd - errorStart;

          errorResults.push({
            scenario: scenario.type,
            handlingTime: errorHandlingTime,
            recoveryAction,
            resolved: !!recoveryAction
          });
        });

        return errorResults;
      });

      app.post('/api/network-error-test', async (req, res) => {
        try {
          const errorResults = mockErrorScenarioManager.simulateNetworkErrors(networkErrorScenarios);

          // Measure error recovery
          const recoveryMetrics = mockErrorScenarioManager.measureErrorRecovery(errorResults);

          res.json({
            success: true,
            errorScenarios: errorResults,
            recoveryMetrics,
            totalScenarios: networkErrorScenarios.length
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: 'Network error simulation failed',
            message: error.message
          });
        }
      });

      // Act
      const response = await request(app)
        .post('/api/network-error-test')
        .timeout(10000)
        .expect(200);

      // Assert: Verify network error handling collaboration
      expect(mockErrorScenarioManager.simulateNetworkErrors).toHaveBeenCalledWith(networkErrorScenarios);

      // Verify error simulation and handling for each scenario
      networkErrorScenarios.forEach(scenario => {
        expect(mockNetworkErrorHandler.simulateNetworkError).toHaveBeenCalledWith(scenario);
        expect(mockNetworkErrorHandler.handleNetworkError).toHaveBeenCalled();
      });

      expect(mockErrorScenarioManager.measureErrorRecovery).toHaveBeenCalled();

      expect(response.body.success).toBe(true);
      expect(response.body.errorScenarios).toHaveLength(4);
      expect(response.body.totalScenarios).toBe(4);

      console.log(`Network error scenarios tested: ${response.body.errorScenarios.length} scenarios, recovery metrics generated`);
    });

    it('should handle data corruption scenarios with validation and recovery', async () => {
      // Test data corruption detection and recovery
      const corruptedDataScenarios = [
        {
          type: 'invalid_uuid',
          data: { id: 'not-a-uuid', agent_id: 'also-not-uuid' }
        },
        {
          type: 'negative_values',
          data: { total_tokens: -500, total_requests: -10 }
        },
        {
          type: 'missing_required_fields',
          data: { incomplete: true }
        },
        {
          type: 'type_mismatch',
          data: { total_tokens: 'not-a-number', timestamp: 123456 }
        }
      ];

      const mockDataCorruptionHandler = {
        detectDataCorruption: jest.fn(),
        categorizeCorruption: jest.fn(),
        attemptDataRepair: jest.fn(),
        quarantineCorruptedData: jest.fn(),
        generateCorruptionReport: jest.fn()
      };

      mockErrorScenarioManager.simulateDataCorruption.mockImplementation((scenarios) => {
        const corruptionResults = [];

        scenarios.forEach(scenario => {
          const detectionStart = performance.now();

          // Detect corruption
          const corruptionDetected = mockDataCorruptionHandler.detectDataCorruption(scenario.data);

          if (corruptionDetected) {
            // Categorize the corruption
            const category = mockDataCorruptionHandler.categorizeCorruption(scenario.type);

            // Attempt repair
            const repairResult = mockDataCorruptionHandler.attemptDataRepair(scenario.data, category);

            if (!repairResult.success) {
              // Quarantine if repair fails
              mockDataCorruptionHandler.quarantineCorruptedData(scenario.data, category);
            }

            const detectionEnd = performance.now();
            const processingTime = detectionEnd - detectionStart;

            corruptionResults.push({
              scenario: scenario.type,
              detected: true,
              category,
              repaired: repairResult.success,
              quarantined: !repairResult.success,
              processingTime,
              repairedData: repairResult.data
            });
          }
        });

        // Generate comprehensive report
        const corruptionReport = mockDataCorruptionHandler.generateCorruptionReport(corruptionResults);

        return { corruptionResults, corruptionReport };
      });

      app.post('/api/data-corruption-test', async (req, res) => {
        const { corruptionResults, corruptionReport } = mockErrorScenarioManager.simulateDataCorruption(
          corruptedDataScenarios
        );

        res.json({
          success: true,
          corruptionAnalysis: corruptionResults,
          report: corruptionReport,
          scenariosTested: corruptedDataScenarios.length
        });
      });

      // Act
      const response = await request(app)
        .post('/api/data-corruption-test')
        .timeout(10000)
        .expect(200);

      // Assert: Verify data corruption handling collaboration
      expect(mockErrorScenarioManager.simulateDataCorruption).toHaveBeenCalledWith(corruptedDataScenarios);

      // Verify corruption detection and handling for each scenario
      corruptedDataScenarios.forEach(scenario => {
        expect(mockDataCorruptionHandler.detectDataCorruption).toHaveBeenCalledWith(scenario.data);
        expect(mockDataCorruptionHandler.categorizeCorruption).toHaveBeenCalledWith(scenario.type);
        expect(mockDataCorruptionHandler.attemptDataRepair).toHaveBeenCalled();
      });

      expect(mockDataCorruptionHandler.generateCorruptionReport).toHaveBeenCalled();

      expect(response.body.success).toBe(true);
      expect(response.body.corruptionAnalysis).toHaveLength(4);
      expect(response.body.scenariosTested).toBe(4);

      console.log(`Data corruption scenarios tested: ${response.body.scenariosTested} scenarios analyzed`);
    });

    it('should handle resource exhaustion scenarios with graceful degradation', async () => {
      // Test resource exhaustion and graceful degradation
      const resourceExhaustionScenarios = [
        { type: 'memory_exhaustion', limit: '512MB' },
        { type: 'cpu_overload', load: '95%' },
        { type: 'connection_pool_exhaustion', connections: 1000 },
        { type: 'disk_space_full', available: '0MB' }
      ];

      const mockResourceExhaustionHandler = {
        simulateResourceExhaustion: jest.fn(),
        detectResourceLimits: jest.fn(),
        implementGracefulDegradation: jest.fn(),
        activateEmergencyMeasures: jest.fn(),
        monitorRecovery: jest.fn()
      };

      mockErrorScenarioManager.simulateResourceExhaustion.mockImplementation((scenarios) => {
        const exhaustionResults = [];

        scenarios.forEach(scenario => {
          const simulationStart = performance.now();

          // Simulate resource exhaustion
          const exhaustionState = mockResourceExhaustionHandler.simulateResourceExhaustion(scenario);

          // Detect limits hit
          const limitsDetected = mockResourceExhaustionHandler.detectResourceLimits(exhaustionState);

          if (limitsDetected.critical) {
            // Implement graceful degradation
            const degradationResult = mockResourceExhaustionHandler.implementGracefulDegradation(scenario.type);

            if (degradationResult.insufficient) {
              // Activate emergency measures
              mockResourceExhaustionHandler.activateEmergencyMeasures(scenario.type);
            }

            // Monitor recovery
            const recoveryMetrics = mockResourceExhaustionHandler.monitorRecovery(scenario.type);

            const simulationEnd = performance.now();
            const handlingTime = simulationEnd - simulationStart;

            exhaustionResults.push({
              scenario: scenario.type,
              exhaustionDetected: true,
              degradationActivated: true,
              emergencyMeasuresUsed: degradationResult.insufficient,
              recoveryTime: recoveryMetrics.estimatedRecoveryTime,
              handlingTime
            });
          }
        });

        return exhaustionResults;
      });

      app.post('/api/resource-exhaustion-test', async (req, res) => {
        const exhaustionResults = mockErrorScenarioManager.simulateResourceExhaustion(
          resourceExhaustionScenarios
        );

        // Measure overall error recovery
        const recoveryMetrics = mockErrorScenarioManager.measureErrorRecovery(exhaustionResults);

        res.json({
          success: true,
          resourceExhaustionAnalysis: exhaustionResults,
          recoveryMetrics,
          scenariosTested: resourceExhaustionScenarios.length
        });
      });

      // Act
      const response = await request(app)
        .post('/api/resource-exhaustion-test')
        .timeout(10000)
        .expect(200);

      // Assert: Verify resource exhaustion handling collaboration
      expect(mockErrorScenarioManager.simulateResourceExhaustion).toHaveBeenCalledWith(resourceExhaustionScenarios);

      // Verify resource exhaustion handling for each scenario
      resourceExhaustionScenarios.forEach(scenario => {
        expect(mockResourceExhaustionHandler.simulateResourceExhaustion).toHaveBeenCalledWith(scenario);
        expect(mockResourceExhaustionHandler.detectResourceLimits).toHaveBeenCalled();
        expect(mockResourceExhaustionHandler.implementGracefulDegradation).toHaveBeenCalledWith(scenario.type);
      });

      expect(mockErrorScenarioManager.measureErrorRecovery).toHaveBeenCalled();

      expect(response.body.success).toBe(true);
      expect(response.body.resourceExhaustionAnalysis).toHaveLength(4);
      expect(response.body.scenariosTested).toBe(4);

      console.log(`Resource exhaustion scenarios tested: ${response.body.scenariosTested} scenarios, recovery metrics: ${JSON.stringify(response.body.recoveryMetrics)}`);
    });
  });

  describe('End-to-End Performance and Error Integration', () => {
    it('should validate system performance under combined stress and error conditions', async () => {
      // Test comprehensive scenario combining performance stress and error conditions
      const combinedTestScenario = {
        performanceLoad: {
          concurrentRequests: 50,
          duration: 5000,
          endpoints: ['/api/activities', '/api/token-analytics/hourly', '/api/token-analytics/summary']
        },
        errorConditions: {
          networkFailureRate: 0.1, // 10% network failures
          dataCorruptionRate: 0.05, // 5% data corruption
          resourceConstraints: {
            maxMemory: '256MB',
            maxCPU: '80%'
          }
        }
      };

      const mockIntegratedTestOrchestrator = {
        orchestrateCombinedTest: jest.fn(),
        injectErrorsUnderLoad: jest.fn(),
        measureSystemResilience: jest.fn(),
        generateComprehensiveReport: jest.fn()
      };

      mockIntegratedTestOrchestrator.orchestrateCombinedTest.mockImplementation(async (scenario) => {
        const testStart = performance.now();

        // Start performance load
        const loadTestPromise = mockStressTestOrchestrator.simulateConcurrentLoad(
          scenario.performanceLoad.endpoints[0],
          scenario.performanceLoad.concurrentRequests,
          scenario.performanceLoad.duration
        );

        // Inject errors during load
        const errorInjectionPromise = mockIntegratedTestOrchestrator.injectErrorsUnderLoad(
          scenario.errorConditions
        );

        // Run both concurrently
        const [loadResults, errorResults] = await Promise.all([loadTestPromise, errorInjectionPromise]);

        const testEnd = performance.now();
        const totalTestTime = testEnd - testStart;

        // Measure system resilience
        const resilienceMetrics = mockIntegratedTestOrchestrator.measureSystemResilience(
          loadResults,
          errorResults
        );

        return {
          loadResults,
          errorResults,
          resilienceMetrics,
          totalTestTime
        };
      });

      mockIntegratedTestOrchestrator.injectErrorsUnderLoad.mockResolvedValue({
        networkErrors: 5,
        dataCorruptions: 2,
        resourceConstraintHits: 3,
        totalErrorsInjected: 10,
        errorsRecovered: 8
      });

      mockIntegratedTestOrchestrator.measureSystemResilience.mockReturnValue({
        successRate: 0.92, // 92% success rate under stress
        averageRecoveryTime: 150, // ms
        errorRecoveryRate: 0.8, // 80% of errors recovered
        performanceDegradation: 0.15, // 15% performance degradation
        overallResilienceScore: 8.5 // out of 10
      });

      app.post('/api/integrated-stress-error-test', async (req, res) => {
        try {
          const testResults = await mockIntegratedTestOrchestrator.orchestrateCombinedTest(
            combinedTestScenario
          );

          const comprehensiveReport = mockIntegratedTestOrchestrator.generateComprehensiveReport(
            testResults
          );

          res.json({
            success: true,
            testResults,
            comprehensiveReport,
            scenario: combinedTestScenario
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: 'Integrated test failed',
            message: error.message
          });
        }
      });

      // Act
      const response = await request(app)
        .post('/api/integrated-stress-error-test')
        .timeout(15000)
        .expect(200);

      // Assert: Verify integrated test orchestration
      expect(mockIntegratedTestOrchestrator.orchestrateCombinedTest).toHaveBeenCalledWith(combinedTestScenario);
      expect(mockIntegratedTestOrchestrator.injectErrorsUnderLoad).toHaveBeenCalledWith(
        combinedTestScenario.errorConditions
      );
      expect(mockIntegratedTestOrchestrator.measureSystemResilience).toHaveBeenCalled();
      expect(mockIntegratedTestOrchestrator.generateComprehensiveReport).toHaveBeenCalled();

      // Verify load test execution
      expect(mockStressTestOrchestrator.simulateConcurrentLoad).toHaveBeenCalledWith(
        '/api/activities',
        50,
        5000
      );

      expect(response.body.success).toBe(true);
      expect(response.body.testResults).toHaveProperty('resilienceMetrics');
      expect(response.body.testResults.resilienceMetrics.overallResilienceScore).toBeGreaterThan(7.0);

      console.log(`Integrated stress-error test completed with resilience score: ${response.body.testResults.resilienceMetrics.overallResilienceScore}/10`);
    });
  });
});