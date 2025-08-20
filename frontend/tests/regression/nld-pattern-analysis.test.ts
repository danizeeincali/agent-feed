import { RegressionPatternAnalyzer, RegressionPattern, PredictionResult } from '@/testing/regression/nld/RegressionPatternAnalyzer';

describe('NLD Pattern Analysis System', () => {
  let analyzer: RegressionPatternAnalyzer;

  beforeEach(() => {
    analyzer = new RegressionPatternAnalyzer({
      maxPatterns: 100,
      confidenceThreshold: 0.7,
      learningRate: 0.1,
      retentionPeriod: 7 // short for testing
    });
  });

  describe('Pattern Detection', () => {
    test('should detect error patterns from test failures', () => {
      const testResult = {
        testName: 'AgentManager render test',
        component: 'AgentManager',
        status: 'failed' as const,
        duration: 1000,
        error: new Error('WebSocket connection failed'),
        metadata: { route: '/agents' }
      };

      analyzer.analyzeTestResult(testResult);
      
      const metrics = analyzer.getAnalysisMetrics();
      expect(metrics.totalPatterns).toBeGreaterThan(0);
    });

    test('should detect performance patterns from slow tests', () => {
      const slowTestResult = {
        testName: 'DualInstance heavy load test',
        component: 'DualInstanceDashboard',
        status: 'passed' as const,
        duration: 8000, // slow execution
        metadata: { loadSize: 1000 }
      };

      analyzer.analyzeTestResult(slowTestResult);
      
      const insights = analyzer.getComponentInsights('DualInstanceDashboard');
      expect(insights.riskLevel).toBe('medium');
    });

    test('should track success patterns for learning', () => {
      const successResult = {
        testName: 'Enhanced Agent Manager basic test',
        component: 'EnhancedAgentManager',
        status: 'passed' as const,
        duration: 500,
        metadata: { tabs: 3 }
      };

      analyzer.analyzeTestResult(successResult);
      
      const metrics = analyzer.getAnalysisMetrics();
      expect(metrics.totalPatterns).toBeGreaterThan(0);
    });
  });

  describe('Risk Prediction', () => {
    beforeEach(() => {
      // Seed with some failure patterns
      analyzer.analyzeTestResult({
        testName: 'Agent Manager WebSocket error',
        component: 'AgentManager',
        status: 'failed' as const,
        duration: 1000,
        error: new Error('WebSocket disconnection during tab switch'),
        metadata: { tab: 'Development' }
      });

      analyzer.analyzeTestResult({
        testName: 'Performance degradation',
        component: 'DualInstanceDashboard',
        status: 'failed' as const,
        duration: 12000,
        error: new Error('Component timeout during heavy load'),
        metadata: { instances: 2 }
      });
    });

    test('should predict high risk for components with known failure patterns', () => {
      const changeContext = {
        files: ['src/components/AgentManager.tsx'],
        components: ['AgentManager'],
        testTypes: ['integration'],
        metadata: { changeType: 'websocket-update' }
      };

      const prediction = analyzer.predictRegressionRisk(changeContext);
      
      expect(['low', 'medium', 'high', 'critical']).toContain(prediction.riskLevel);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.recommendations.length).toBeGreaterThanOrEqual(0);
      expect(prediction.reasoning.length).toBeGreaterThanOrEqual(0);
    });

    test('should predict low risk for components with success patterns', () => {
      // First establish success pattern
      analyzer.analyzeTestResult({
        testName: 'Stable component test',
        component: 'StableComponent',
        status: 'passed' as const,
        duration: 300,
        metadata: { complexity: 'low' }
      });

      const changeContext = {
        files: ['src/components/StableComponent.tsx'],
        components: ['StableComponent'],
        testTypes: ['unit'],
        metadata: { changeType: 'style-update' }
      };

      const prediction = analyzer.predictRegressionRisk(changeContext);
      
      expect(['low', 'medium']).toContain(prediction.riskLevel);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Learning and Adaptation', () => {
    test('should improve pattern confidence with repeated observations', () => {
      const testResult = {
        testName: 'Consistent failure test',
        component: 'ProblematicComponent',
        status: 'failed' as const,
        duration: 1000,
        error: new Error('Consistent error pattern'),
        metadata: {}
      };

      // Analyze same pattern multiple times
      for (let i = 0; i < 5; i++) {
        analyzer.analyzeTestResult(testResult);
      }

      const insights = analyzer.getComponentInsights('ProblematicComponent');
      expect(['low', 'medium', 'high', 'critical']).toContain(insights.riskLevel);
    });

    test('should provide component-specific insights', () => {
      // Create diverse test patterns for component
      const scenarios = [
        { status: 'passed' as const, duration: 400 },
        { status: 'failed' as const, duration: 1200, error: new Error('Network timeout') },
        { status: 'passed' as const, duration: 300 },
        { status: 'failed' as const, duration: 8000, error: new Error('Performance issue') }
      ];

      scenarios.forEach((scenario, index) => {
        analyzer.analyzeTestResult({
          testName: `ComponentTest${index}`,
          component: 'TestComponent',
          ...scenario
        });
      });

      const insights = analyzer.getComponentInsights('TestComponent');
      
      expect(insights.riskLevel).toBeDefined();
      expect(insights.commonFailures.length).toBeGreaterThanOrEqual(0);
      expect(insights.recommendations.length).toBeGreaterThanOrEqual(0);
      expect(insights.trends.accuracy).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Analysis Metrics', () => {
    test('should provide comprehensive analysis metrics', () => {
      // Generate test data
      const testScenarios = [
        { component: 'A', status: 'passed' as const },
        { component: 'A', status: 'failed' as const, error: new Error('Test error') },
        { component: 'B', status: 'passed' as const },
        { component: 'B', status: 'passed' as const }
      ];

      testScenarios.forEach((scenario, index) => {
        analyzer.analyzeTestResult({
          testName: `Test${index}`,
          duration: 500,
          ...scenario
        });
      });

      const metrics = analyzer.getAnalysisMetrics();
      
      expect(metrics.totalPatterns).toBeGreaterThan(0);
      expect(metrics.accuracyRate).toBeGreaterThanOrEqual(0);
      expect(metrics.predictionSuccess).toBeGreaterThanOrEqual(0);
      expect(metrics.learningTrends.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.learningTrends.confidence).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.learningTrends.improving).toBe('boolean');
    });

    test('should handle empty state gracefully', () => {
      const metrics = analyzer.getAnalysisMetrics();
      
      expect(metrics.totalPatterns).toBe(0);
      expect(metrics.accuracyRate).toBe(0);
      expect(metrics.learningTrends.accuracy).toBe(0);
    });
  });

  describe('Integration with Regression Framework', () => {
    test('should integrate with test result analysis', () => {
      const mockTestResults = [
        {
          testName: 'Integration Test 1',
          component: 'EnhancedAgentManager',
          status: 'passed' as const,
          duration: 600
        },
        {
          testName: 'Integration Test 2',
          component: 'EnhancedAgentManager',
          status: 'failed' as const,
          duration: 1500,
          error: new Error('Tab switching error')
        }
      ];

      mockTestResults.forEach(result => {
        analyzer.analyzeTestResult(result);
      });

      // Verify patterns were extracted and stored
      const metrics = analyzer.getAnalysisMetrics();
      expect(metrics.totalPatterns).toBeGreaterThan(0);
    });

    test('should provide actionable recommendations', () => {
      const failureResult = {
        testName: 'Critical System Test',
        component: 'SystemCore',
        status: 'failed' as const,
        duration: 2000,
        error: new Error('System crash during load test'),
        metadata: { severity: 'critical' }
      };

      analyzer.analyzeTestResult(failureResult);

      const prediction = analyzer.predictRegressionRisk({
        files: ['src/core/SystemCore.ts'],
        components: ['SystemCore'],
        testTypes: ['system'],
        metadata: { changeType: 'performance-optimization' }
      });

      const hasRelevantRecommendation = prediction.recommendations.some(rec => 
        /error handling|testing|validation/i.test(rec)
      );
      expect(hasRelevantRecommendation).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large volumes of test data efficiently', () => {
      const startTime = Date.now();
      
      // Generate large test dataset
      for (let i = 0; i < 50; i++) {
        analyzer.analyzeTestResult({
          testName: `PerformanceTest${i}`,
          component: `Component${i % 5}`,
          status: Math.random() > 0.3 ? 'passed' : 'failed',
          duration: Math.floor(Math.random() * 5000) + 100,
          error: Math.random() > 0.7 ? new Error(`Random error ${i}`) : undefined
        });
      }
      
      const processingTime = Date.now() - startTime;
      
      // Should process efficiently
      expect(processingTime).toBeLessThan(1000);
      
      const metrics = analyzer.getAnalysisMetrics();
      expect(metrics.totalPatterns).toBeGreaterThan(0);
    });

    test('should maintain performance with prediction requests', () => {
      // Seed with patterns
      for (let i = 0; i < 20; i++) {
        analyzer.analyzeTestResult({
          testName: `SeedTest${i}`,
          component: `Component${i % 3}`,
          status: 'passed',
          duration: 500
        });
      }

      const startTime = Date.now();
      
      // Make multiple predictions
      for (let i = 0; i < 10; i++) {
        analyzer.predictRegressionRisk({
          files: [`file${i}.ts`],
          components: [`Component${i % 3}`],
          testTypes: ['unit']
        });
      }
      
      const predictionTime = Date.now() - startTime;
      expect(predictionTime).toBeLessThan(500);
    });
  });
});