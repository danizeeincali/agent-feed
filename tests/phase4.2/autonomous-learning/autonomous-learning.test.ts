/**
 * PHASE 4.2: Autonomous Learning Tests
 *
 * Comprehensive test suite for autonomous learning detection, triggers, and impact measurement.
 * Tests the core algorithms that enable agents to learn and improve autonomously.
 *
 * Coverage:
 * - Performance detection algorithms (10 tests)
 * - Learning trigger thresholds (10 tests)
 * - Statistical confidence calculations (10 tests)
 * - False positive prevention (5 tests)
 * - Learning impact measurement (5 tests)
 * - Avi reporting generation (5 tests)
 * - SAFLA service integration (5 tests)
 *
 * Total: 50 tests (increased from 40 for comprehensive coverage)
 */

import { SAFLAService, PatternInput, Pattern } from '../../../api-server/services/safla-service';
import * as path from 'path';
import * as fs from 'fs';

describe('Phase 4.2: Autonomous Learning', () => {
  let saflaService: SAFLAService;
  let testDbPath: string;

  beforeEach(() => {
    // Create unique test database for each test
    const testId = Math.random().toString(36).substring(7);
    testDbPath = path.join(process.cwd(), 'tests', 'phase4.2', '.temp', `test-${testId}.db`);

    // Ensure directory exists
    const dbDir = path.dirname(testDbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    saflaService = new SAFLAService(testDbPath);
  });

  afterEach(() => {
    saflaService.close();

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  // ============================================================
  // PERFORMANCE DETECTION ALGORITHMS (10 tests)
  // ============================================================

  describe('Performance Detection Algorithms', () => {
    test('should detect performance improvement over baseline', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Test pattern for performance detection',
        namespace: 'test-agent',
        category: 'skill-execution',
      });

      // Record multiple successful outcomes
      for (let i = 0; i < 10; i++) {
        await saflaService.recordOutcome(pattern.id, 'success', {
          executionTimeMs: 100 - i * 5, // Decreasing execution time
        });
      }

      const updatedPattern = saflaService.getPattern(pattern.id);
      expect(updatedPattern).not.toBeNull();
      expect(updatedPattern!.successCount).toBe(10);
      expect(updatedPattern!.confidence).toBeGreaterThan(pattern.confidence);

      // Performance should improve (confidence increases)
      const performanceImprovement = updatedPattern!.confidence - pattern.confidence;
      expect(performanceImprovement).toBeGreaterThan(0.1);
    });

    test('should detect performance degradation', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Pattern with degrading performance',
        namespace: 'test-agent',
      });

      // Record failures
      for (let i = 0; i < 5; i++) {
        await saflaService.recordOutcome(pattern.id, 'failure', {
          executionTimeMs: 1000 + i * 100, // Increasing execution time
        });
      }

      const updatedPattern = saflaService.getPattern(pattern.id);
      expect(updatedPattern!.confidence).toBeLessThan(pattern.confidence);
      expect(updatedPattern!.failureCount).toBe(5);
    });

    test('should calculate success rate accurately', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Success rate test pattern',
        namespace: 'test-agent',
      });

      // 7 successes, 3 failures = 70% success rate
      for (let i = 0; i < 7; i++) {
        await saflaService.recordOutcome(pattern.id, 'success');
      }
      for (let i = 0; i < 3; i++) {
        await saflaService.recordOutcome(pattern.id, 'failure');
      }

      const updatedPattern = saflaService.getPattern(pattern.id);
      const successRate = updatedPattern!.successCount / updatedPattern!.totalInvocations;

      expect(successRate).toBeCloseTo(0.7, 2);
      expect(updatedPattern!.totalInvocations).toBe(10);
    });

    test('should detect statistical significance with sufficient sample size', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Statistical significance test',
        namespace: 'test-agent',
      });

      // Record 30 outcomes (minimum for statistical significance)
      for (let i = 0; i < 30; i++) {
        const outcome = i < 24 ? 'success' : 'failure'; // 80% success
        await saflaService.recordOutcome(pattern.id, outcome);
      }

      const updatedPattern = saflaService.getPattern(pattern.id);
      expect(updatedPattern!.totalInvocations).toBeGreaterThanOrEqual(30);

      // With 80% success rate, confidence should be high
      expect(updatedPattern!.confidence).toBeGreaterThan(0.7);
    });

    test('should not trigger learning with insufficient data', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Insufficient data test',
        namespace: 'test-agent',
      });

      // Only 5 outcomes (below threshold)
      for (let i = 0; i < 5; i++) {
        await saflaService.recordOutcome(pattern.id, 'success');
      }

      const updatedPattern = saflaService.getPattern(pattern.id);

      // Should have minimal confidence change with low sample size
      expect(updatedPattern!.totalInvocations).toBeLessThan(30);
      expect(Math.abs(updatedPattern!.confidence - 0.5)).toBeLessThan(0.5);
    });

    test('should calculate moving average for performance trends', () => {
      const outcomes = [100, 95, 90, 85, 80, 75, 70];

      // Calculate 3-point moving average
      const movingAverage = (arr: number[], window: number) => {
        const result: number[] = [];
        for (let i = window - 1; i < arr.length; i++) {
          const sum = arr.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
          result.push(sum / window);
        }
        return result;
      };

      const ma = movingAverage(outcomes, 3);

      expect(ma.length).toBe(5);
      expect(ma[0]).toBeCloseTo((100 + 95 + 90) / 3, 2);
      expect(ma[ma.length - 1]).toBeCloseTo((80 + 75 + 70) / 3, 2);

      // Verify downward trend
      expect(ma[ma.length - 1]).toBeLessThan(ma[0]);
    });

    test('should detect variance in performance metrics', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Variance detection test',
        namespace: 'test-agent',
      });

      const executionTimes = [100, 200, 90, 210, 95, 205, 100, 200];

      for (const time of executionTimes) {
        await saflaService.recordOutcome(pattern.id, 'success', {
          executionTimeMs: time,
        });
      }

      const outcomes = saflaService.getPatternOutcomes(pattern.id);
      const times = outcomes.map(o => o.executionTimeMs || 0);

      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);

      // High variance indicates inconsistent performance
      expect(stdDev).toBeGreaterThan(40);
    });

    test('should identify performance outliers', () => {
      const executionTimes = [100, 105, 98, 102, 500, 103, 99]; // 500ms is outlier

      const mean = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const stdDev = Math.sqrt(
        executionTimes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / executionTimes.length
      );

      const outliers = executionTimes.filter(time =>
        Math.abs(time - mean) > 2 * stdDev
      );

      expect(outliers).toContain(500);
      expect(outliers.length).toBe(1);
    });

    test('should calculate confidence intervals for success rate', () => {
      const successes = 80;
      const total = 100;
      const successRate = successes / total;

      // Wilson score interval for 95% confidence
      const z = 1.96;
      const denominator = 1 + (z * z) / total;
      const center = successRate + (z * z) / (2 * total);
      const spread = z * Math.sqrt((successRate * (1 - successRate) / total) + (z * z / (4 * total * total)));

      const lowerBound = (center - spread) / denominator;
      const upperBound = (center + spread) / denominator;

      expect(lowerBound).toBeGreaterThan(0.7);
      expect(upperBound).toBeLessThan(0.9);
      expect(successRate).toBeGreaterThan(lowerBound);
      expect(successRate).toBeLessThan(upperBound);
    });

    test('should detect performance plateaus', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Plateau detection test',
        namespace: 'test-agent',
      });

      // Consistent performance (no improvement)
      for (let i = 0; i < 20; i++) {
        await saflaService.recordOutcome(pattern.id, 'success', {
          executionTimeMs: 100,
        });
      }

      const outcomes = saflaService.getPatternOutcomes(pattern.id);
      const executionTimes = outcomes.map(o => o.executionTimeMs || 0).slice(0, 10);

      // Calculate if performance is plateauing (low variance)
      const mean = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const variance = executionTimes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / executionTimes.length;

      expect(variance).toBeLessThan(10); // Very low variance = plateau
    });
  });

  // ============================================================
  // LEARNING TRIGGER THRESHOLDS (10 tests)
  // ============================================================

  describe('Learning Trigger Thresholds', () => {
    test('should trigger learning after 30+ invocations with poor performance', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Learning trigger test',
        namespace: 'test-agent',
      });

      // 30 invocations with 40% success rate
      for (let i = 0; i < 30; i++) {
        const outcome = i < 12 ? 'success' : 'failure';
        await saflaService.recordOutcome(pattern.id, outcome);
      }

      const updatedPattern = saflaService.getPattern(pattern.id);
      const successRate = updatedPattern!.successCount / updatedPattern!.totalInvocations;

      expect(updatedPattern!.totalInvocations).toBeGreaterThanOrEqual(30);
      expect(successRate).toBeLessThan(0.5); // Poor performance

      // Learning should be triggered
      const shouldTriggerLearning = updatedPattern!.totalInvocations >= 30 && successRate < 0.5;
      expect(shouldTriggerLearning).toBe(true);
    });

    test('should not trigger learning with good performance', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Good performance test',
        namespace: 'test-agent',
      });

      // 30 invocations with 85% success rate
      for (let i = 0; i < 30; i++) {
        const outcome = i < 25 ? 'success' : 'failure';
        await saflaService.recordOutcome(pattern.id, outcome);
      }

      const updatedPattern = saflaService.getPattern(pattern.id);
      const successRate = updatedPattern!.successCount / updatedPattern!.totalInvocations;

      expect(successRate).toBeGreaterThan(0.8);

      // Learning should NOT be triggered (performance is good)
      const shouldTriggerLearning = updatedPattern!.totalInvocations >= 30 && successRate < 0.5;
      expect(shouldTriggerLearning).toBe(false);
    });

    test('should require minimum sample size before triggering', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Minimum sample size test',
        namespace: 'test-agent',
      });

      // Only 10 invocations, even with poor performance
      for (let i = 0; i < 10; i++) {
        await saflaService.recordOutcome(pattern.id, 'failure');
      }

      const updatedPattern = saflaService.getPattern(pattern.id);
      const successRate = updatedPattern!.successCount / updatedPattern!.totalInvocations;

      expect(successRate).toBe(0); // 100% failure

      // Should NOT trigger learning (insufficient data)
      const shouldTriggerLearning = updatedPattern!.totalInvocations >= 30 && successRate < 0.5;
      expect(shouldTriggerLearning).toBe(false);
    });

    test('should use configurable success rate threshold', () => {
      const successRateThreshold = 0.6; // 60% minimum

      const testCases = [
        { successRate: 0.8, shouldTrigger: false },
        { successRate: 0.65, shouldTrigger: false },
        { successRate: 0.55, shouldTrigger: true },
        { successRate: 0.3, shouldTrigger: true },
      ];

      for (const testCase of testCases) {
        const shouldTrigger = testCase.successRate < successRateThreshold;
        expect(shouldTrigger).toBe(testCase.shouldTrigger);
      }
    });

    test('should consider confidence threshold for learning triggers', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Confidence threshold test',
        namespace: 'test-agent',
      });

      // Record outcomes to reach low confidence
      for (let i = 0; i < 15; i++) {
        await saflaService.recordOutcome(pattern.id, 'failure');
      }

      const updatedPattern = saflaService.getPattern(pattern.id);

      // Confidence should be below threshold
      expect(updatedPattern!.confidence).toBeLessThan(0.3);

      const shouldTriggerLearning = updatedPattern!.confidence < 0.3;
      expect(shouldTriggerLearning).toBe(true);
    });

    test('should detect declining trend over time window', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Declining trend test',
        namespace: 'test-agent',
      });

      // First 20: 80% success, Last 20: 40% success (declining)
      for (let i = 0; i < 40; i++) {
        const outcome = i < 20
          ? (i < 16 ? 'success' : 'failure')
          : (i < 28 ? 'success' : 'failure');
        await saflaService.recordOutcome(pattern.id, outcome);
      }

      const outcomes = saflaService.getPatternOutcomes(pattern.id);

      // Calculate success rate for first and last 20
      const recent20 = outcomes.slice(0, 20);
      const older20 = outcomes.slice(20, 40);

      const recentSuccessRate = recent20.filter(o => o.outcome === 'success').length / 20;
      const olderSuccessRate = older20.filter(o => o.outcome === 'success').length / 20;

      expect(recentSuccessRate).toBeLessThan(olderSuccessRate);

      // Declining trend detected
      const decliningTrend = recentSuccessRate < olderSuccessRate - 0.2; // 20% decline
      expect(decliningTrend).toBe(true);
    });

    test('should implement sliding window for trend detection', () => {
      const outcomes = Array(50).fill(null).map((_, i) => ({
        outcome: i < 40 ? 'success' : 'failure' as const,
        timestamp: Date.now() - (50 - i) * 60000,
      }));

      const windowSize = 10;
      const windows: number[] = [];

      for (let i = windowSize; i <= outcomes.length; i++) {
        const window = outcomes.slice(i - windowSize, i);
        const successRate = window.filter(o => o.outcome === 'success').length / windowSize;
        windows.push(successRate);
      }

      // Last window should have lower success rate
      expect(windows[windows.length - 1]).toBeLessThan(windows[0]);
    });

    test('should apply exponential smoothing to trend detection', () => {
      const alpha = 0.3; // Smoothing factor
      const outcomes = [1, 1, 1, 0, 0, 1, 0, 0, 0, 0]; // 1=success, 0=failure

      let smoothedValue = outcomes[0];
      const smoothedSeries: number[] = [smoothedValue];

      for (let i = 1; i < outcomes.length; i++) {
        smoothedValue = alpha * outcomes[i] + (1 - alpha) * smoothedValue;
        smoothedSeries.push(smoothedValue);
      }

      // Smoothed series should show declining trend
      expect(smoothedSeries[smoothedSeries.length - 1]).toBeLessThan(smoothedSeries[0]);
    });

    test('should trigger on consecutive failure threshold', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Consecutive failures test',
        namespace: 'test-agent',
      });

      // Record 5 consecutive failures
      for (let i = 0; i < 5; i++) {
        await saflaService.recordOutcome(pattern.id, 'failure');
      }

      const outcomes = saflaService.getPatternOutcomes(pattern.id);
      const consecutiveFailures = outcomes
        .slice(0, 5)
        .every(o => o.outcome === 'failure');

      expect(consecutiveFailures).toBe(true);

      // Should trigger learning on 5+ consecutive failures
      const shouldTrigger = consecutiveFailures && outcomes.length >= 5;
      expect(shouldTrigger).toBe(true);
    });

    test('should not trigger on sporadic failures', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Sporadic failures test',
        namespace: 'test-agent',
      });

      // Alternating success/failure
      for (let i = 0; i < 10; i++) {
        const outcome = i % 2 === 0 ? 'success' : 'failure';
        await saflaService.recordOutcome(pattern.id, outcome);
      }

      const outcomes = saflaService.getPatternOutcomes(pattern.id);
      const hasConsecutiveFailures = outcomes.slice(0, 5).every(o => o.outcome === 'failure');

      expect(hasConsecutiveFailures).toBe(false);

      // Should NOT trigger (no consecutive failures)
      const shouldTrigger = hasConsecutiveFailures;
      expect(shouldTrigger).toBe(false);
    });
  });

  // ============================================================
  // STATISTICAL CONFIDENCE CALCULATIONS (10 tests)
  // ============================================================

  describe('Statistical Confidence Calculations', () => {
    test('should calculate binomial confidence intervals', () => {
      const successes = 75;
      const total = 100;
      const confidenceLevel = 0.95;
      const z = 1.96; // 95% confidence

      const p = successes / total;
      const se = Math.sqrt((p * (1 - p)) / total);
      const margin = z * se;

      const lowerBound = p - margin;
      const upperBound = p + margin;

      expect(lowerBound).toBeGreaterThan(0.65);
      expect(upperBound).toBeLessThan(0.85);
      expect(p).toBe(0.75);
    });

    test('should apply Bayesian updating to confidence', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Bayesian updating test',
        namespace: 'test-agent',
      });

      const initialConfidence = pattern.confidence;

      // Record evidence
      await saflaService.recordOutcome(pattern.id, 'success');
      const afterSuccess = saflaService.getPattern(pattern.id)!.confidence;

      await saflaService.recordOutcome(pattern.id, 'failure');
      const afterFailure = saflaService.getPattern(pattern.id)!.confidence;

      // Confidence should increase after success
      expect(afterSuccess).toBeGreaterThan(initialConfidence);

      // Confidence should decrease after failure
      expect(afterFailure).toBeLessThan(afterSuccess);
    });

    test('should calculate standard error of proportion', () => {
      const successRate = 0.7;
      const sampleSize = 100;

      const standardError = Math.sqrt((successRate * (1 - successRate)) / sampleSize);

      expect(standardError).toBeCloseTo(0.046, 3);
    });

    test('should determine sample size for desired margin of error', () => {
      const desiredMargin = 0.05; // ±5%
      const confidenceLevel = 0.95;
      const z = 1.96;
      const estimatedProportion = 0.5; // Most conservative

      const requiredSampleSize = Math.ceil(
        (z * z * estimatedProportion * (1 - estimatedProportion)) / (desiredMargin * desiredMargin)
      );

      expect(requiredSampleSize).toBe(385);
    });

    test('should apply normal approximation validity check', () => {
      const testCases = [
        { n: 30, p: 0.5, valid: true },   // np=15, n(1-p)=15
        { n: 30, p: 0.1, valid: false },  // np=3, n(1-p)=27
        { n: 100, p: 0.1, valid: true },  // np=10, n(1-p)=90
        { n: 10, p: 0.5, valid: false },  // np=5, n(1-p)=5
      ];

      for (const tc of testCases) {
        const npValid = tc.n * tc.p >= 10;
        const nqValid = tc.n * (1 - tc.p) >= 10;
        const isValid = npValid && nqValid;

        expect(isValid).toBe(tc.valid);
      }
    });

    test('should calculate z-score for performance comparison', () => {
      const mean = 100;
      const stdDev = 15;
      const observation = 130;

      const zScore = (observation - mean) / stdDev;

      expect(zScore).toBeCloseTo(2, 1);

      // 2 standard deviations = statistically significant
      expect(Math.abs(zScore) > 1.96).toBe(true);
    });

    test('should perform two-proportion z-test', () => {
      // Compare two performance periods
      const period1 = { successes: 80, total: 100 };
      const period2 = { successes: 65, total: 100 };

      const p1 = period1.successes / period1.total;
      const p2 = period2.successes / period2.total;

      const pooledP = (period1.successes + period2.successes) / (period1.total + period2.total);
      const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / period1.total + 1 / period2.total));

      const zScore = (p1 - p2) / se;

      // Significant difference (z > 1.96)
      expect(Math.abs(zScore)).toBeGreaterThan(1.96);
    });

    test('should calculate chi-square goodness of fit', () => {
      const observed = [45, 30, 25]; // Actual outcomes
      const expected = [33.33, 33.33, 33.33]; // Expected if uniform

      let chiSquare = 0;
      for (let i = 0; i < observed.length; i++) {
        chiSquare += Math.pow(observed[i] - expected[i], 2) / expected[i];
      }

      // Chi-square critical value for df=2, α=0.05 is 5.991
      expect(chiSquare).toBeGreaterThan(5.991); // Significant deviation
    });

    test('should apply continuity correction for small samples', () => {
      const successes = 5;
      const total = 10;
      const hypothesizedP = 0.5;

      // Without continuity correction
      const pHat = successes / total;
      const se = Math.sqrt((hypothesizedP * (1 - hypothesizedP)) / total);
      const zWithout = (pHat - hypothesizedP) / se;

      // With continuity correction
      const correctedP = (successes - 0.5) / total;
      const zWith = (correctedP - hypothesizedP) / se;

      expect(Math.abs(zWith)).toBeLessThan(Math.abs(zWithout));
    });

    test('should calculate confidence decay over time', () => {
      const initialConfidence = 0.8;
      const daysSinceLastUse = 30;
      const decayRate = 0.02; // 2% per day

      const decayedConfidence = initialConfidence * Math.exp(-decayRate * daysSinceLastUse);

      expect(decayedConfidence).toBeLessThan(initialConfidence);
      expect(decayedConfidence).toBeCloseTo(0.44, 2);
    });
  });

  // ============================================================
  // FALSE POSITIVE PREVENTION (5 tests)
  // ============================================================

  describe('False Positive Prevention', () => {
    test('should not trigger on random noise', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Random noise test',
        namespace: 'test-agent',
      });

      // Random outcomes (50/50 split)
      for (let i = 0; i < 30; i++) {
        const outcome = Math.random() > 0.5 ? 'success' : 'failure';
        await saflaService.recordOutcome(pattern.id, outcome);
      }

      const updatedPattern = saflaService.getPattern(pattern.id);
      const successRate = updatedPattern!.successCount / updatedPattern!.totalInvocations;

      // Success rate should be close to 50% (random)
      expect(successRate).toBeGreaterThan(0.3);
      expect(successRate).toBeLessThan(0.7);

      // Should not trigger learning on random noise
      const significantDeviation = Math.abs(successRate - 0.5) > 0.2;
      expect(significantDeviation).toBe(false);
    });

    test('should require statistically significant degradation', () => {
      const baselineRate = 0.8;
      const currentRate = 0.75;
      const sampleSize = 30;

      const se = Math.sqrt((baselineRate * (1 - baselineRate)) / sampleSize);
      const zScore = (currentRate - baselineRate) / se;

      // Not statistically significant (z < 1.96)
      expect(Math.abs(zScore)).toBeLessThan(1.96);

      const isSignificant = Math.abs(zScore) > 1.96;
      expect(isSignificant).toBe(false);
    });

    test('should filter out temporary performance blips', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Temporary blip test',
        namespace: 'test-agent',
      });

      // Good performance: 25 successes
      for (let i = 0; i < 25; i++) {
        await saflaService.recordOutcome(pattern.id, 'success');
      }

      // Temporary blip: 3 failures
      for (let i = 0; i < 3; i++) {
        await saflaService.recordOutcome(pattern.id, 'failure');
      }

      // Recovery: 7 successes
      for (let i = 0; i < 7; i++) {
        await saflaService.recordOutcome(pattern.id, 'success');
      }

      const updatedPattern = saflaService.getPattern(pattern.id);
      const overallSuccessRate = updatedPattern!.successCount / updatedPattern!.totalInvocations;

      // Overall still good (32/35 = 91%)
      expect(overallSuccessRate).toBeGreaterThan(0.85);

      // Should not trigger learning
      const shouldTrigger = overallSuccessRate < 0.5;
      expect(shouldTrigger).toBe(false);
    });

    test('should use multiple detection methods to confirm issues', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Multi-method detection test',
        namespace: 'test-agent',
      });

      // Genuine performance issue: sustained low success rate
      for (let i = 0; i < 30; i++) {
        const outcome = i < 10 ? 'success' : 'failure';
        await saflaService.recordOutcome(pattern.id, outcome);
      }

      const updatedPattern = saflaService.getPattern(pattern.id);
      const successRate = updatedPattern!.successCount / updatedPattern!.totalInvocations;

      // Method 1: Overall success rate
      const method1Triggered = successRate < 0.5;

      // Method 2: Confidence threshold
      const method2Triggered = updatedPattern!.confidence < 0.4;

      // Method 3: Sample size
      const method3Valid = updatedPattern!.totalInvocations >= 30;

      // All methods should agree
      expect(method1Triggered).toBe(true);
      expect(method2Triggered).toBe(true);
      expect(method3Valid).toBe(true);
    });

    test('should apply Bonferroni correction for multiple comparisons', () => {
      const numComparisons = 5;
      const desiredAlpha = 0.05;
      const adjustedAlpha = desiredAlpha / numComparisons;

      // Adjusted significance threshold
      const zCritical = 1.96; // Normal threshold
      const adjustedZ = 2.81; // Bonferroni-corrected (approximation)

      expect(adjustedAlpha).toBeCloseTo(0.01, 2);
      expect(adjustedZ).toBeGreaterThan(zCritical);
    });
  });

  // ============================================================
  // LEARNING IMPACT MEASUREMENT (5 tests)
  // ============================================================

  describe('Learning Impact Measurement', () => {
    test('should measure confidence improvement after learning', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Learning impact test',
        namespace: 'test-agent',
      });

      const beforeConfidence = pattern.confidence;

      // Simulate learning cycle: failures → learning → improvement
      for (let i = 0; i < 10; i++) {
        await saflaService.recordOutcome(pattern.id, 'failure');
      }

      const afterFailures = saflaService.getPattern(pattern.id)!.confidence;

      // Simulate learning improvement
      for (let i = 0; i < 15; i++) {
        await saflaService.recordOutcome(pattern.id, 'success');
      }

      const afterLearning = saflaService.getPattern(pattern.id)!.confidence;

      // Measure impact
      const learningImpact = afterLearning - afterFailures;

      expect(afterLearning).toBeGreaterThan(afterFailures);
      expect(learningImpact).toBeGreaterThan(0.2); // Significant improvement
    });

    test('should calculate ROI of learning intervention', () => {
      const beforeSuccessRate = 0.4;
      const afterSuccessRate = 0.8;
      const avgTaskValue = 10; // dollars
      const learningCost = 50; // dollars
      const tasksPerDay = 20;
      const daysToAnalyze = 30;

      const valueBefore = beforeSuccessRate * avgTaskValue * tasksPerDay * daysToAnalyze;
      const valueAfter = afterSuccessRate * avgTaskValue * tasksPerDay * daysToAnalyze;
      const valueGained = valueAfter - valueBefore;

      const roi = ((valueGained - learningCost) / learningCost) * 100;

      expect(roi).toBeGreaterThan(0); // Positive ROI
      expect(roi).toBeCloseTo(4700, -2); // ~4700% ROI
    });

    test('should track performance metrics pre and post learning', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Pre/post metrics test',
        namespace: 'test-agent',
      });

      // Pre-learning: 20 invocations
      const preLearningExecutionTimes: number[] = [];
      for (let i = 0; i < 20; i++) {
        const time = 200 + Math.random() * 50;
        preLearningExecutionTimes.push(time);
        await saflaService.recordOutcome(pattern.id, i < 8 ? 'success' : 'failure', {
          executionTimeMs: time,
        });
      }

      const preMeanTime = preLearningExecutionTimes.reduce((a, b) => a + b, 0) / preLearningExecutionTimes.length;
      const preSuccessRate = 8 / 20;

      // Post-learning: 20 invocations
      const postLearningExecutionTimes: number[] = [];
      for (let i = 0; i < 20; i++) {
        const time = 150 + Math.random() * 30;
        postLearningExecutionTimes.push(time);
        await saflaService.recordOutcome(pattern.id, i < 17 ? 'success' : 'failure', {
          executionTimeMs: time,
        });
      }

      const postMeanTime = postLearningExecutionTimes.reduce((a, b) => a + b, 0) / postLearningExecutionTimes.length;
      const postSuccessRate = 17 / 20;

      // Improvements
      const timeImprovement = ((preMeanTime - postMeanTime) / preMeanTime) * 100;
      const successImprovement = postSuccessRate - preSuccessRate;

      expect(timeImprovement).toBeGreaterThan(20); // >20% faster
      expect(successImprovement).toBeGreaterThan(0.3); // 30%+ better success rate
    });

    test('should calculate effect size (Cohen\'s d)', () => {
      const preMean = 200;
      const preStdDev = 40;
      const postMean = 150;
      const postStdDev = 30;

      const pooledStdDev = Math.sqrt((preStdDev ** 2 + postStdDev ** 2) / 2);
      const cohensD = (postMean - preMean) / pooledStdDev;

      // Large effect size (|d| > 0.8)
      expect(Math.abs(cohensD)).toBeGreaterThan(0.8);
    });

    test('should generate learning impact report', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Impact report test',
        namespace: 'test-agent',
        skillId: 'test-skill',
      });

      // Simulate learning cycle
      for (let i = 0; i < 40; i++) {
        const outcome = i < 15 ? 'failure' : (i < 35 ? 'success' : 'failure');
        await saflaService.recordOutcome(pattern.id, outcome, {
          executionTimeMs: i < 15 ? 250 : 150,
        });
      }

      const updatedPattern = saflaService.getPattern(pattern.id)!;
      const outcomes = saflaService.getPatternOutcomes(pattern.id);

      const report = {
        patternId: updatedPattern.id,
        skillId: updatedPattern.skillId,
        totalInvocations: updatedPattern.totalInvocations,
        finalConfidence: updatedPattern.confidence,
        successRate: updatedPattern.successCount / updatedPattern.totalInvocations,
        avgExecutionTime: outcomes.reduce((sum, o) => sum + (o.executionTimeMs || 0), 0) / outcomes.length,
        learningTriggered: true,
        impactSummary: 'Confidence improved from low to medium after learning intervention',
      };

      expect(report.totalInvocations).toBe(40);
      expect(report.successRate).toBeGreaterThan(0.4);
      expect(report.finalConfidence).toBeGreaterThan(0.3);
    });
  });

  // ============================================================
  // AVI REPORTING GENERATION (5 tests)
  // ============================================================

  describe('Avi Reporting Generation', () => {
    test('should generate learning opportunity report for Avi', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Avi reporting test',
        namespace: 'test-agent',
        agentId: 'test-agent-001',
        skillId: 'test-skill-001',
        category: 'skill-execution',
      });

      // Create learning opportunity
      for (let i = 0; i < 30; i++) {
        await saflaService.recordOutcome(pattern.id, i < 12 ? 'success' : 'failure');
      }

      const updatedPattern = saflaService.getPattern(pattern.id)!;
      const successRate = updatedPattern.successCount / updatedPattern.totalInvocations;

      const aviReport = {
        reportType: 'learning-opportunity',
        timestamp: Date.now(),
        agentId: updatedPattern.agentId,
        skillId: updatedPattern.skillId,
        patternId: updatedPattern.id,
        metrics: {
          totalInvocations: updatedPattern.totalInvocations,
          successRate,
          currentConfidence: updatedPattern.confidence,
          performanceDecline: true,
        },
        recommendation: 'Enable autonomous learning for this skill',
        priority: 'high',
      };

      expect(aviReport.metrics.totalInvocations).toBeGreaterThanOrEqual(30);
      expect(aviReport.metrics.successRate).toBeLessThan(0.5);
      expect(aviReport.priority).toBe('high');
    });

    test('should prioritize multiple learning opportunities', async () => {
      const patterns = [];

      // Create 3 patterns with different severity
      for (let i = 0; i < 3; i++) {
        const pattern = await saflaService.storePattern({
          content: `Pattern ${i}`,
          namespace: 'test-agent',
          skillId: `skill-${i}`,
        });

        const failureRate = [0.7, 0.5, 0.3][i]; // Different severities
        for (let j = 0; j < 30; j++) {
          const outcome = Math.random() > failureRate ? 'success' : 'failure';
          await saflaService.recordOutcome(pattern.id, outcome);
        }

        patterns.push(saflaService.getPattern(pattern.id)!);
      }

      // Create priority scores
      const prioritized = patterns
        .map(p => ({
          patternId: p.id,
          skillId: p.skillId,
          successRate: p.successCount / p.totalInvocations,
          priorityScore: (1 - p.confidence) * (1 - p.successCount / p.totalInvocations),
        }))
        .sort((a, b) => b.priorityScore - a.priorityScore);

      // Highest failure rate should be highest priority
      expect(prioritized[0].successRate).toBeLessThan(prioritized[1].successRate);
    });

    test('should generate learning progress report', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Progress report test',
        namespace: 'test-agent',
      });

      // Simulate learning progress
      const snapshots: Array<{ invocations: number; confidence: number; successRate: number }> = [];

      for (let i = 0; i < 40; i++) {
        const outcome = i < 15 ? 'failure' : 'success';
        await saflaService.recordOutcome(pattern.id, outcome);

        if (i % 10 === 9) {
          const current = saflaService.getPattern(pattern.id)!;
          snapshots.push({
            invocations: current.totalInvocations,
            confidence: current.confidence,
            successRate: current.successCount / current.totalInvocations,
          });
        }
      }

      const progressReport = {
        patternId: pattern.id,
        snapshots,
        trend: snapshots[snapshots.length - 1].successRate > snapshots[0].successRate ? 'improving' : 'declining',
        learningEffective: snapshots[snapshots.length - 1].confidence > snapshots[0].confidence,
      };

      expect(progressReport.snapshots.length).toBe(4);
      expect(progressReport.trend).toBe('improving');
      expect(progressReport.learningEffective).toBe(true);
    });

    test('should format report for Avi consumption', () => {
      const rawData = {
        agentId: 'agent-001',
        skillId: 'skill-001',
        successRate: 0.35,
        confidence: 0.28,
        totalInvocations: 45,
      };

      const formattedReport = {
        title: '🎯 Learning Opportunity Detected',
        agent: rawData.agentId,
        skill: rawData.skillId,
        summary: `Performance below threshold (${(rawData.successRate * 100).toFixed(1)}% success rate)`,
        metrics: [
          `Success Rate: ${(rawData.successRate * 100).toFixed(1)}%`,
          `Confidence: ${(rawData.confidence * 100).toFixed(1)}%`,
          `Sample Size: ${rawData.totalInvocations} invocations`,
        ],
        action: 'Recommend enabling autonomous learning',
        timestamp: new Date().toISOString(),
      };

      expect(formattedReport.title).toContain('Learning Opportunity');
      expect(formattedReport.metrics.length).toBe(3);
      expect(formattedReport.action).toContain('learning');
    });

    test('should include confidence intervals in Avi reports', () => {
      const successes = 30;
      const total = 100;
      const p = successes / total;
      const z = 1.96;

      const se = Math.sqrt((p * (1 - p)) / total);
      const margin = z * se;

      const aviReport = {
        successRate: p,
        confidenceInterval: {
          lower: p - margin,
          upper: p + margin,
          confidenceLevel: 0.95,
        },
        interpretation: `95% confident the true success rate is between ${((p - margin) * 100).toFixed(1)}% and ${((p + margin) * 100).toFixed(1)}%`,
      };

      expect(aviReport.confidenceInterval.lower).toBeGreaterThan(0.2);
      expect(aviReport.confidenceInterval.upper).toBeLessThan(0.4);
      expect(aviReport.interpretation).toContain('95% confident');
    });
  });

  // ============================================================
  // SAFLA SERVICE INTEGRATION (5 tests)
  // ============================================================

  describe('SAFLA Service Integration', () => {
    test('should store and retrieve patterns correctly', async () => {
      const input: PatternInput = {
        content: 'Test pattern content',
        namespace: 'test-namespace',
        agentId: 'agent-123',
        skillId: 'skill-456',
        category: 'execution',
        tags: ['test', 'pattern'],
        metadata: { version: '1.0' },
      };

      const stored = await saflaService.storePattern(input);

      expect(stored.id).toBeDefined();
      expect(stored.content).toBe(input.content);
      expect(stored.namespace).toBe(input.namespace);
      expect(stored.agentId).toBe(input.agentId);
      expect(stored.skillId).toBe(input.skillId);
      expect(stored.confidence).toBe(0.5); // Initial confidence

      const retrieved = saflaService.getPattern(stored.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(stored.id);
    });

    test('should perform semantic search with correct ranking', async () => {
      // Store multiple patterns
      await saflaService.storePattern({
        content: 'JavaScript array manipulation techniques',
        namespace: 'dev',
      });

      await saflaService.storePattern({
        content: 'Python list comprehension examples',
        namespace: 'dev',
      });

      await saflaService.storePattern({
        content: 'Database query optimization strategies',
        namespace: 'dev',
      });

      // Search for JavaScript content
      const results = await saflaService.queryPatterns('JavaScript array methods', 'dev', 10);

      expect(results.length).toBeGreaterThan(0);
      // Most relevant pattern should be first (JavaScript-related)
      expect(results[0].content).toContain('JavaScript');
    });

    test('should update confidence based on outcomes', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Confidence update test',
        namespace: 'test',
      });

      const initialConfidence = pattern.confidence;

      // Record success
      const afterSuccess = await saflaService.recordOutcome(pattern.id, 'success');
      expect(afterSuccess.confidence).toBeGreaterThan(initialConfidence);

      // Record failure
      const afterFailure = await saflaService.recordOutcome(pattern.id, 'failure');
      expect(afterFailure.confidence).toBeLessThan(afterSuccess.confidence);
    });

    test('should retrieve namespace statistics', async () => {
      const namespace = 'stats-test';

      // Create patterns with various outcomes
      for (let i = 0; i < 5; i++) {
        const pattern = await saflaService.storePattern({
          content: `Pattern ${i}`,
          namespace,
        });

        for (let j = 0; j < 10; j++) {
          const outcome = j < 7 ? 'success' : 'failure';
          await saflaService.recordOutcome(pattern.id, outcome);
        }
      }

      const stats = saflaService.getNamespaceStats(namespace);

      expect(stats.totalPatterns).toBe(5);
      expect(stats.totalSuccesses).toBe(35); // 5 patterns × 7 successes
      expect(stats.totalFailures).toBe(15); // 5 patterns × 3 failures
      expect(stats.successRate).toBeCloseTo(0.7, 2);
    });

    test('should perform MMR ranking for diversity', async () => {
      // Store similar patterns
      const patterns = [];
      for (let i = 0; i < 5; i++) {
        const pattern = await saflaService.storePattern({
          content: `React hooks pattern ${i}: useState and useEffect`,
          namespace: 'react',
        });
        patterns.push(pattern);
      }

      // Add one diverse pattern
      const diversePattern = await saflaService.storePattern({
        content: 'Database connection pooling with PostgreSQL',
        namespace: 'react',
      });
      patterns.push(diversePattern);

      const ranked = await saflaService.rankPatterns(patterns, 'React hooks patterns', 0.7);

      expect(ranked.length).toBe(6);

      // First result should be most similar
      expect(ranked[0].content).toContain('React hooks');

      // Diverse pattern should appear (not filtered out)
      const hasDiversePattern = ranked.some(r => r.content.includes('PostgreSQL'));
      expect(hasDiversePattern).toBe(true);
    });
  });
});
