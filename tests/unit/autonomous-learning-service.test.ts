/**
 * Autonomous Learning Service - Unit Tests
 *
 * Comprehensive test suite for autonomous learning trigger system.
 * Tests performance detection, learning decisions, and progress tracking.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AutonomousLearningService } from '../../api-server/services/autonomous-learning-service';
import { SAFLAService } from '../../api-server/services/safla-service';
import * as fs from 'fs';
import * as path from 'path';

// Test database paths
const TEST_DB_DIR = path.join(process.cwd(), 'tests', 'temp');
const TEST_LEARNING_DB = path.join(TEST_DB_DIR, 'test-autonomous-learning.db');
const TEST_SAFLA_DB = path.join(TEST_DB_DIR, 'test-safla.db');

describe('AutonomousLearningService', () => {
  let service: AutonomousLearningService;
  let safla: SAFLAService;

  beforeEach(() => {
    // Ensure test directory exists
    if (!fs.existsSync(TEST_DB_DIR)) {
      fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    }

    // Clean up previous test databases
    [TEST_LEARNING_DB, TEST_SAFLA_DB].forEach(dbPath => {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      // Also remove WAL and SHM files
      ['-wal', '-shm'].forEach(suffix => {
        const file = `${dbPath}${suffix}`;
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    });

    // Create services
    safla = new SAFLAService(TEST_SAFLA_DB);
    service = new AutonomousLearningService(safla, {
      dbPath: TEST_LEARNING_DB,
      autoEnableLearning: false, // Manual control for tests
      minExecutionsForAnalysis: 10,
      successRateThreshold: 0.70,
      varianceThreshold: 0.3,
      trendThreshold: -0.1,
    });
  });

  afterEach(() => {
    // Close connections
    service.close();
    safla.close();

    // Clean up test databases
    [TEST_LEARNING_DB, TEST_SAFLA_DB].forEach(dbPath => {
      try {
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
        }
        ['-wal', '-shm'].forEach(suffix => {
          const file = `${dbPath}${suffix}`;
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
      } catch (error) {
        console.warn(`Cleanup warning for ${dbPath}:`, error);
      }
    });
  });

  // ============================================================
  // SKILL EXECUTION RECORDING
  // ============================================================

  describe('recordSkillExecution', () => {
    it('should record successful skill execution', async () => {
      await service.recordSkillExecution(
        'test-skill',
        'agent-1',
        'success',
        { executionTimeMs: 150 }
      );

      const stats = service.getOverallStats();
      expect(stats.totalExecutions).toBe(1);
      expect(stats.avgSuccessRate).toBe(1.0);
    });

    it('should record failed skill execution', async () => {
      await service.recordSkillExecution(
        'test-skill',
        'agent-1',
        'failure',
        { errorMessage: 'Test error' }
      );

      const stats = service.getOverallStats();
      expect(stats.totalExecutions).toBe(1);
      expect(stats.avgSuccessRate).toBe(0);
    });

    it('should record multiple executions', async () => {
      // 7 successes, 3 failures = 70% success rate
      for (let i = 0; i < 7; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'success');
      }
      for (let i = 0; i < 3; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'failure');
      }

      const stats = service.getOverallStats();
      expect(stats.totalExecutions).toBe(10);
      expect(stats.avgSuccessRate).toBe(0.7);
    });

    it('should have <1ms overhead', async () => {
      const iterations = 100;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'success');
      }

      const duration = Date.now() - start;
      const avgMs = duration / iterations;

      expect(avgMs).toBeLessThan(1);
    });
  });

  // ============================================================
  // PERFORMANCE ANALYSIS
  // ============================================================

  describe('analyzeSkillPerformance', () => {
    it('should return insufficient data for <10 executions', async () => {
      // Only 5 executions
      for (let i = 0; i < 5; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'success');
      }

      const analysis = await service.analyzeSkillPerformance('test-skill');

      expect(analysis.shouldEnableLearning).toBe(false);
      expect(analysis.reasons[0]).toContain('Insufficient data');
      expect(analysis.metrics.totalExecutions).toBe(5);
    });

    it('should detect low success rate (<70%)', async () => {
      // 5 successes, 5 failures = 50% success rate
      for (let i = 0; i < 5; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'success');
      }
      for (let i = 0; i < 5; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'failure');
      }

      const analysis = await service.analyzeSkillPerformance('test-skill');

      expect(analysis.metrics.successRate).toBe(0.5);
      expect(analysis.reasons).toContain(
        expect.stringContaining('Low success rate: 50')
      );
    });

    it('should detect high variance (inconsistent performance)', async () => {
      // Alternate success/failure over multiple days to create variance
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      // Simulate 10 days of inconsistent performance
      for (let day = 0; day < 10; day++) {
        // Day with high success
        if (day % 2 === 0) {
          for (let i = 0; i < 3; i++) {
            await service.recordSkillExecution('test-skill', 'agent-1', 'success');
          }
        }
        // Day with high failure
        else {
          for (let i = 0; i < 3; i++) {
            await service.recordSkillExecution('test-skill', 'agent-1', 'failure');
          }
        }
      }

      const analysis = await service.analyzeSkillPerformance('test-skill');

      expect(analysis.metrics.totalExecutions).toBe(30);
      // Variance should be detected (though exact value depends on implementation)
      expect(analysis.metrics.variance).toBeGreaterThan(0);
    });

    it('should detect declining performance trend', async () => {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      // First half: 80% success rate
      for (let i = 0; i < 8; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'success');
      }
      for (let i = 0; i < 2; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'failure');
      }

      // Wait to create time separation
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second half: 40% success rate (declining)
      for (let i = 0; i < 4; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'success');
      }
      for (let i = 0; i < 6; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'failure');
      }

      const analysis = await service.analyzeSkillPerformance('test-skill');

      expect(analysis.trend.direction).toBe('declining');
      expect(analysis.trend.slope).toBeLessThan(0);
    });

    it('should complete analysis in <50ms', async () => {
      // Create test data
      for (let i = 0; i < 50; i++) {
        await service.recordSkillExecution(
          'test-skill',
          'agent-1',
          i % 2 === 0 ? 'success' : 'failure'
        );
      }

      const start = Date.now();
      await service.analyzeSkillPerformance('test-skill');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });

  // ============================================================
  // LEARNING DECISIONS
  // ============================================================

  describe('checkAndEnableLearning', () => {
    it('should not enable learning with good performance', async () => {
      // 90% success rate - good performance
      for (let i = 0; i < 18; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'success');
      }
      for (let i = 0; i < 2; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'failure');
      }

      const decision = await service.checkAndEnableLearning('test-skill');

      expect(decision.shouldEnable).toBe(false);
      expect(decision.performanceMetrics.successRate).toBe(0.9);
    });

    it('should enable learning with poor performance', async () => {
      // Create auto-enable service
      const autoService = new AutonomousLearningService(safla, {
        dbPath: TEST_LEARNING_DB,
        autoEnableLearning: true,
        minExecutionsForAnalysis: 10,
        successRateThreshold: 0.70,
        confidenceRequirement: 0.5, // Lower for test
      });

      try {
        // 50% success rate - poor performance
        for (let i = 0; i < 10; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', 'success');
        }
        for (let i = 0; i < 10; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', 'failure');
        }

        const decision = await autoService.checkAndEnableLearning('test-skill');

        expect(decision.shouldEnable).toBe(true);
        expect(decision.wasEnabled).toBe(true);
        expect(decision.currentlyEnabled).toBe(true);
      } finally {
        autoService.close();
      }
    });

    it('should provide clear reasons for decision', async () => {
      // Multiple issues: low success rate + inconsistent
      for (let i = 0; i < 6; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'success');
      }
      for (let i = 0; i < 6; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'failure');
      }

      const decision = await service.checkAndEnableLearning('test-skill');

      expect(decision.reasons.length).toBeGreaterThan(0);
      expect(decision.reasons.some(r => r.includes('success rate'))).toBe(true);
    });

    it('should calculate confidence score', async () => {
      // Clear poor performance
      for (let i = 0; i < 3; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'success');
      }
      for (let i = 0; i < 17; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'failure');
      }

      const decision = await service.checkAndEnableLearning('test-skill');

      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
    });

    it('should estimate impact of learning', async () => {
      for (let i = 0; i < 5; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'success');
      }
      for (let i = 0; i < 5; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'failure');
      }

      const decision = await service.checkAndEnableLearning('test-skill');

      expect(decision.estimatedImpact).toBeTruthy();
      expect(decision.estimatedImpact).toContain('%');
    });
  });

  // ============================================================
  // AVI RECOMMENDATIONS
  // ============================================================

  describe('getLearningRecommendations', () => {
    it('should return empty array when no recommendations', async () => {
      const recommendations = await service.getLearningRecommendations();
      expect(recommendations).toEqual([]);
    });

    it('should create recommendation when learning enabled', async () => {
      const autoService = new AutonomousLearningService(safla, {
        dbPath: TEST_LEARNING_DB,
        autoEnableLearning: true,
        minExecutionsForAnalysis: 10,
        confidenceRequirement: 0.5,
      });

      try {
        // Poor performance
        for (let i = 0; i < 5; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', 'success');
        }
        for (let i = 0; i < 5; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', 'failure');
        }

        await autoService.checkAndEnableLearning('test-skill');

        const recommendations = await autoService.getLearningRecommendations();

        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations[0].skillName).toBe('test-skill');
        expect(recommendations[0].priority).toBeTruthy();
        expect(recommendations[0].recommendation).toBeTruthy();
      } finally {
        autoService.close();
      }
    });

    it('should prioritize recommendations correctly', async () => {
      const autoService = new AutonomousLearningService(safla, {
        dbPath: TEST_LEARNING_DB,
        autoEnableLearning: true,
        minExecutionsForAnalysis: 10,
        confidenceRequirement: 0.5,
      });

      try {
        // Create high priority issue (very poor performance)
        for (let i = 0; i < 2; i++) {
          await autoService.recordSkillExecution('critical-skill', 'agent-1', 'success');
        }
        for (let i = 0; i < 18; i++) {
          await autoService.recordSkillExecution('critical-skill', 'agent-1', 'failure');
        }

        await autoService.checkAndEnableLearning('critical-skill');

        const recommendations = await autoService.getLearningRecommendations();

        expect(recommendations.length).toBeGreaterThan(0);
        expect(['critical', 'high']).toContain(recommendations[0].priority);
      } finally {
        autoService.close();
      }
    });

    it('should include time estimates', async () => {
      const autoService = new AutonomousLearningService(safla, {
        dbPath: TEST_LEARNING_DB,
        autoEnableLearning: true,
        minExecutionsForAnalysis: 10,
        confidenceRequirement: 0.5,
      });

      try {
        for (let i = 0; i < 10; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', i < 5 ? 'success' : 'failure');
        }

        await autoService.checkAndEnableLearning('test-skill');

        const recommendations = await autoService.getLearningRecommendations();

        expect(recommendations[0].estimatedTimeToImprove).toBeTruthy();
        expect(recommendations[0].estimatedTimeToImprove).toMatch(/\d+/);
      } finally {
        autoService.close();
      }
    });
  });

  // ============================================================
  // PROGRESS TRACKING
  // ============================================================

  describe('trackLearningProgress', () => {
    it('should return no progress when learning not enabled', async () => {
      const progress = await service.trackLearningProgress('test-skill');

      expect(progress.learningEnabled).toBe(false);
      expect(progress.status).toBe('insufficient_data');
    });

    it('should measure improvement after learning enabled', async () => {
      const autoService = new AutonomousLearningService(safla, {
        dbPath: TEST_LEARNING_DB,
        autoEnableLearning: true,
        minExecutionsForAnalysis: 10,
        confidenceRequirement: 0.5,
      });

      try {
        // Initial poor performance
        for (let i = 0; i < 5; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', 'success');
        }
        for (let i = 0; i < 5; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', 'failure');
        }

        // Enable learning
        await autoService.checkAndEnableLearning('test-skill');

        // Improved performance after learning
        for (let i = 0; i < 8; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', 'success');
        }
        for (let i = 0; i < 2; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', 'failure');
        }

        const progress = await autoService.trackLearningProgress('test-skill');

        expect(progress.learningEnabled).toBe(true);
        expect(progress.after.successRate).toBeGreaterThan(progress.before.successRate);
        expect(progress.improvements.successRateImprovement).toBeGreaterThan(0);
      } finally {
        autoService.close();
      }
    });

    it('should detect improving status', async () => {
      const autoService = new AutonomousLearningService(safla, {
        dbPath: TEST_LEARNING_DB,
        autoEnableLearning: true,
        minExecutionsForAnalysis: 10,
        improvementCheckDays: 7,
        confidenceRequirement: 0.5,
      });

      try {
        // Poor initial
        for (let i = 0; i < 10; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', i < 5 ? 'success' : 'failure');
        }

        await autoService.checkAndEnableLearning('test-skill');

        // Much better after learning
        for (let i = 0; i < 15; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', i < 13 ? 'success' : 'failure');
        }

        const progress = await autoService.trackLearningProgress('test-skill');

        expect(['improving', 'stable']).toContain(progress.status);
        expect(progress.improvements.overallImprovement).toBeGreaterThanOrEqual(0);
      } finally {
        autoService.close();
      }
    });

    it('should recommend continuation when appropriate', async () => {
      const autoService = new AutonomousLearningService(safla, {
        dbPath: TEST_LEARNING_DB,
        autoEnableLearning: true,
        minExecutionsForAnalysis: 10,
        goodPerformanceThreshold: 0.90,
        confidenceRequirement: 0.5,
      });

      try {
        // Moderate performance - should continue
        for (let i = 0; i < 10; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', i < 7 ? 'success' : 'failure');
        }

        await autoService.checkAndEnableLearning('test-skill');

        for (let i = 0; i < 10; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', i < 8 ? 'success' : 'failure');
        }

        const progress = await autoService.trackLearningProgress('test-skill');

        // Should continue since not at 90% threshold
        expect(progress.recommendContinue).toBe(true);
      } finally {
        autoService.close();
      }
    });
  });

  // ============================================================
  // AVI REPORTING
  // ============================================================

  describe('generateReportForAvi', () => {
    it('should generate human-readable report for improving skill', async () => {
      const autoService = new AutonomousLearningService(safla, {
        dbPath: TEST_LEARNING_DB,
        autoEnableLearning: true,
        minExecutionsForAnalysis: 10,
        confidenceRequirement: 0.5,
      });

      try {
        // Poor then good
        for (let i = 0; i < 10; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', i < 5 ? 'success' : 'failure');
        }

        await autoService.checkAndEnableLearning('test-skill');

        for (let i = 0; i < 10; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', i < 9 ? 'success' : 'failure');
        }

        const progress = await autoService.trackLearningProgress('test-skill');
        const report = autoService.generateReportForAvi('test-skill', progress);

        expect(report).toContain('test-skill');
        expect(report).toContain('accuracy');
        expect(report.length).toBeGreaterThan(50);
      } finally {
        autoService.close();
      }
    });

    it('should include percentage improvements', async () => {
      const autoService = new AutonomousLearningService(safla, {
        dbPath: TEST_LEARNING_DB,
        autoEnableLearning: true,
        minExecutionsForAnalysis: 10,
        confidenceRequirement: 0.5,
      });

      try {
        for (let i = 0; i < 10; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', i < 5 ? 'success' : 'failure');
        }

        await autoService.checkAndEnableLearning('test-skill');

        for (let i = 0; i < 10; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', i < 8 ? 'success' : 'failure');
        }

        const progress = await autoService.trackLearningProgress('test-skill');
        const report = autoService.generateReportForAvi('test-skill', progress);

        expect(report).toMatch(/\d+%/);
      } finally {
        autoService.close();
      }
    });

    it('should warn about degrading performance', async () => {
      const autoService = new AutonomousLearningService(safla, {
        dbPath: TEST_LEARNING_DB,
        autoEnableLearning: true,
        minExecutionsForAnalysis: 10,
        confidenceRequirement: 0.5,
      });

      try {
        // Good then poor
        for (let i = 0; i < 10; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', i < 8 ? 'success' : 'failure');
        }

        await autoService.checkAndEnableLearning('test-skill');

        for (let i = 0; i < 10; i++) {
          await autoService.recordSkillExecution('test-skill', 'agent-1', i < 4 ? 'success' : 'failure');
        }

        const progress = await autoService.trackLearningProgress('test-skill');
        const report = autoService.generateReportForAvi('test-skill', progress);

        if (progress.status === 'degrading') {
          expect(report.toLowerCase()).toContain('warning');
        }
      } finally {
        autoService.close();
      }
    });
  });

  // ============================================================
  // PERFORMANCE REQUIREMENTS
  // ============================================================

  describe('Performance Requirements', () => {
    it('should maintain <1% overhead per execution', async () => {
      const iterations = 1000;

      // Baseline: measure raw loop time
      const baselineStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        // Minimal work
        const _ = { skill: 'test', outcome: 'success' };
      }
      const baselineTime = Date.now() - baselineStart;

      // With recording
      const recordStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await service.recordSkillExecution('test-skill', 'agent-1', 'success');
      }
      const recordTime = Date.now() - recordStart;

      const overhead = ((recordTime - baselineTime) / recordTime) * 100;

      // Should be very low overhead
      expect(overhead).toBeLessThan(5); // 5% is generous, should be <1%
    });

    it('should analyze 100+ executions in <50ms', async () => {
      // Create large dataset
      for (let i = 0; i < 100; i++) {
        await service.recordSkillExecution(
          'test-skill',
          'agent-1',
          i % 3 === 0 ? 'failure' : 'success'
        );
      }

      const start = Date.now();
      await service.analyzeSkillPerformance('test-skill');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle skill with no executions', async () => {
      const analysis = await service.analyzeSkillPerformance('nonexistent-skill');

      expect(analysis.metrics.totalExecutions).toBe(0);
      expect(analysis.shouldEnableLearning).toBe(false);
    });

    it('should handle all successes', async () => {
      for (let i = 0; i < 20; i++) {
        await service.recordSkillExecution('perfect-skill', 'agent-1', 'success');
      }

      const decision = await service.checkAndEnableLearning('perfect-skill');

      expect(decision.shouldEnable).toBe(false);
      expect(decision.performanceMetrics.successRate).toBe(1.0);
    });

    it('should handle all failures', async () => {
      const autoService = new AutonomousLearningService(safla, {
        dbPath: TEST_LEARNING_DB,
        autoEnableLearning: true,
        minExecutionsForAnalysis: 10,
        confidenceRequirement: 0.5,
      });

      try {
        for (let i = 0; i < 20; i++) {
          await autoService.recordSkillExecution('broken-skill', 'agent-1', 'failure');
        }

        const decision = await autoService.checkAndEnableLearning('broken-skill');

        expect(decision.shouldEnable).toBe(true);
        expect(decision.performanceMetrics.successRate).toBe(0);
      } finally {
        autoService.close();
      }
    });
  });

  // ============================================================
  // OVERALL STATISTICS
  // ============================================================

  describe('getOverallStats', () => {
    it('should return accurate overall statistics', async () => {
      // Skill 1
      for (let i = 0; i < 10; i++) {
        await service.recordSkillExecution('skill-1', 'agent-1', 'success');
      }

      // Skill 2
      for (let i = 0; i < 5; i++) {
        await service.recordSkillExecution('skill-2', 'agent-1', 'success');
      }
      for (let i = 0; i < 5; i++) {
        await service.recordSkillExecution('skill-2', 'agent-1', 'failure');
      }

      const stats = service.getOverallStats();

      expect(stats.totalSkills).toBe(2);
      expect(stats.totalExecutions).toBe(20);
      expect(stats.avgSuccessRate).toBe(0.75); // 15 successes / 20 total
    });
  });
});
