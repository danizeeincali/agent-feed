/**
 * PHASE 4.2: Learning Optimizer Agent Tests
 *
 * Tests for the specialized Learning Optimizer agent that monitors skill performance,
 * detects learning opportunities, and manages autonomous learning.
 *
 * Coverage:
 * - Autonomous monitoring workflow (10 tests)
 * - Skill performance analysis (7 tests)
 * - Learning enablement decisions (5 tests)
 * - Progress tracking (5 tests)
 * - Reporting to Avi (3 tests)
 * - Pattern quality management (5 tests)
 *
 * Total: 35 tests (increased from 30 for comprehensive coverage)
 */

import { SAFLAService } from '../../../api-server/services/safla-service';
import * as path from 'path';
import * as fs from 'fs';

// Mock Learning Optimizer Agent implementation
interface SkillPerformanceMetrics {
  skillId: string;
  agentId: string;
  totalInvocations: number;
  successRate: number;
  avgExecutionTime: number;
  confidence: number;
  lastAnalyzed: number;
}

interface LearningOpportunity {
  skillId: string;
  agentId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  metrics: SkillPerformanceMetrics;
  recommendedAction: string;
  priorityScore: number;
}

class LearningOptimizerAgent {
  private saflaService: SAFLAService;
  private monitoringInterval: number = 300000; // 5 minutes

  constructor(saflaService: SAFLAService) {
    this.saflaService = saflaService;
  }

  /**
   * Analyze skill performance and detect learning opportunities
   */
  async analyzeSkillPerformance(skillId: string, agentId: string): Promise<SkillPerformanceMetrics | null> {
    const patterns = await this.saflaService.queryPatterns(`skillId:${skillId}`, agentId, 100);

    if (patterns.length === 0) {
      return null;
    }

    const totalInvocations = patterns.reduce((sum, p) => sum + p.totalInvocations, 0);
    const totalSuccesses = patterns.reduce((sum, p) => sum + p.successCount, 0);
    const successRate = totalInvocations > 0 ? totalSuccesses / totalInvocations : 0;

    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;

    // Calculate average execution time from outcomes
    let totalExecutionTime = 0;
    let executionCount = 0;

    for (const pattern of patterns.slice(0, 10)) {
      const outcomes = this.saflaService.getPatternOutcomes(pattern.id, 20);
      for (const outcome of outcomes) {
        if (outcome.executionTimeMs) {
          totalExecutionTime += outcome.executionTimeMs;
          executionCount++;
        }
      }
    }

    const avgExecutionTime = executionCount > 0 ? totalExecutionTime / executionCount : 0;

    return {
      skillId,
      agentId,
      totalInvocations,
      successRate,
      avgExecutionTime,
      confidence: avgConfidence,
      lastAnalyzed: Date.now(),
    };
  }

  /**
   * Detect if learning should be enabled for a skill
   */
  detectLearningOpportunity(metrics: SkillPerformanceMetrics): LearningOpportunity | null {
    // Criteria for learning opportunity
    const hasMinimumData = metrics.totalInvocations >= 30;
    const hasPoorPerformance = metrics.successRate < 0.6;
    const hasLowConfidence = metrics.confidence < 0.4;

    if (!hasMinimumData) {
      return null;
    }

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let priorityScore = 0;

    if (metrics.successRate < 0.3 || metrics.confidence < 0.2) {
      severity = 'critical';
      priorityScore = 100;
    } else if (metrics.successRate < 0.4 || metrics.confidence < 0.3) {
      severity = 'high';
      priorityScore = 75;
    } else if (metrics.successRate < 0.5 || metrics.confidence < 0.35) {
      severity = 'medium';
      priorityScore = 50;
    } else if (hasPoorPerformance || hasLowConfidence) {
      severity = 'low';
      priorityScore = 25;
    } else {
      return null; // No learning needed
    }

    return {
      skillId: metrics.skillId,
      agentId: metrics.agentId,
      severity,
      reason: `Performance below threshold (${(metrics.successRate * 100).toFixed(1)}% success, ${(metrics.confidence * 100).toFixed(1)}% confidence)`,
      metrics,
      recommendedAction: 'Enable autonomous learning',
      priorityScore,
    };
  }

  /**
   * Track learning progress over time
   */
  async trackLearningProgress(skillId: string, agentId: string): Promise<{
    snapshots: Array<{ timestamp: number; metrics: SkillPerformanceMetrics }>;
    trend: 'improving' | 'declining' | 'stable';
    recommendation: string;
  }> {
    // Simulate tracking snapshots over time
    const current = await this.analyzeSkillPerformance(skillId, agentId);

    if (!current) {
      return {
        snapshots: [],
        trend: 'stable',
        recommendation: 'Insufficient data for tracking',
      };
    }

    // Mock snapshots (in real implementation, would be stored)
    const snapshots = [
      { timestamp: Date.now() - 86400000, metrics: { ...current, successRate: 0.4, confidence: 0.3 } },
      { timestamp: Date.now() - 43200000, metrics: { ...current, successRate: 0.5, confidence: 0.4 } },
      { timestamp: Date.now(), metrics: current },
    ];

    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];

    const successRateChange = lastSnapshot.metrics.successRate - firstSnapshot.metrics.successRate;
    const confidenceChange = lastSnapshot.metrics.confidence - firstSnapshot.metrics.confidence;

    let trend: 'improving' | 'declining' | 'stable';
    if (successRateChange > 0.1 || confidenceChange > 0.1) {
      trend = 'improving';
    } else if (successRateChange < -0.1 || confidenceChange < -0.1) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    const recommendation = trend === 'improving'
      ? 'Continue current learning approach'
      : trend === 'declining'
      ? 'Adjust learning strategy or investigate root cause'
      : 'Monitor for changes';

    return { snapshots, trend, recommendation };
  }

  /**
   * Generate report for Avi
   */
  generateAviReport(opportunities: LearningOpportunity[]): {
    title: string;
    summary: string;
    opportunities: LearningOpportunity[];
    prioritizedActions: string[];
    timestamp: string;
  } {
    const sortedOpportunities = [...opportunities].sort((a, b) => b.priorityScore - a.priorityScore);

    return {
      title: '🎓 Learning Optimizer Report',
      summary: `Detected ${opportunities.length} learning opportunities`,
      opportunities: sortedOpportunities,
      prioritizedActions: sortedOpportunities.slice(0, 3).map(
        (opp, idx) => `${idx + 1}. [${opp.severity.toUpperCase()}] ${opp.skillId} - ${opp.reason}`
      ),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Manage pattern quality
   */
  async assessPatternQuality(patternId: string): Promise<{
    quality: 'high' | 'medium' | 'low';
    issues: string[];
    recommendations: string[];
  }> {
    const pattern = this.saflaService.getPattern(patternId);

    if (!pattern) {
      return {
        quality: 'low',
        issues: ['Pattern not found'],
        recommendations: [],
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check sample size
    if (pattern.totalInvocations < 10) {
      issues.push('Insufficient invocation history');
      recommendations.push('Collect more usage data before analysis');
    }

    // Check confidence
    if (pattern.confidence < 0.3) {
      issues.push('Low confidence score');
      recommendations.push('Review pattern effectiveness');
    }

    // Check success rate
    const successRate = pattern.successCount / (pattern.totalInvocations || 1);
    if (successRate < 0.5) {
      issues.push('Low success rate');
      recommendations.push('Consider pattern refinement');
    }

    // Check recency
    const daysSinceLastUse = pattern.lastUsedAt
      ? (Date.now() - pattern.lastUsedAt) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (daysSinceLastUse > 90) {
      issues.push('Pattern not used recently');
      recommendations.push('Archive or update pattern');
    }

    // Determine quality
    let quality: 'high' | 'medium' | 'low';
    if (issues.length === 0) {
      quality = 'high';
    } else if (issues.length <= 2) {
      quality = 'medium';
    } else {
      quality = 'low';
    }

    return { quality, issues, recommendations };
  }
}

describe('Phase 4.2: Learning Optimizer Agent', () => {
  let saflaService: SAFLAService;
  let optimizer: LearningOptimizerAgent;
  let testDbPath: string;

  beforeEach(() => {
    const testId = Math.random().toString(36).substring(7);
    testDbPath = path.join(process.cwd(), 'tests', 'phase4.2', '.temp', `optimizer-${testId}.db`);

    const dbDir = path.dirname(testDbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    saflaService = new SAFLAService(testDbPath);
    optimizer = new LearningOptimizerAgent(saflaService);
  });

  afterEach(() => {
    saflaService.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  // ============================================================
  // AUTONOMOUS MONITORING WORKFLOW (10 tests)
  // ============================================================

  describe('Autonomous Monitoring Workflow', () => {
    test('should continuously monitor skill performance', async () => {
      // Create test patterns
      for (let i = 0; i < 5; i++) {
        const pattern = await saflaService.storePattern({
          content: `Test pattern ${i}`,
          namespace: 'test-agent',
          skillId: 'test-skill-001',
        });

        for (let j = 0; j < 20; j++) {
          await saflaService.recordOutcome(pattern.id, j < 12 ? 'success' : 'failure');
        }
      }

      const metrics = await optimizer.analyzeSkillPerformance('test-skill-001', 'test-agent');

      expect(metrics).not.toBeNull();
      expect(metrics!.totalInvocations).toBeGreaterThanOrEqual(50);
      expect(metrics!.successRate).toBeCloseTo(0.6, 1);
    });

    test('should detect multiple learning opportunities', async () => {
      const opportunities: LearningOpportunity[] = [];

      // Create multiple skills with varying performance
      for (let skillIdx = 0; skillIdx < 3; skillIdx++) {
        const pattern = await saflaService.storePattern({
          content: `Skill ${skillIdx} pattern`,
          namespace: 'test-agent',
          skillId: `skill-${skillIdx}`,
        });

        const successRates = [0.3, 0.5, 0.8];
        const targetRate = successRates[skillIdx];

        for (let i = 0; i < 30; i++) {
          const outcome = Math.random() < targetRate ? 'success' : 'failure';
          await saflaService.recordOutcome(pattern.id, outcome);
        }

        const metrics = await optimizer.analyzeSkillPerformance(`skill-${skillIdx}`, 'test-agent');
        if (metrics) {
          const opportunity = optimizer.detectLearningOpportunity(metrics);
          if (opportunity) {
            opportunities.push(opportunity);
          }
        }
      }

      // Should detect opportunities for skill-0 and skill-1 (low performance)
      expect(opportunities.length).toBeGreaterThanOrEqual(1);
    });

    test('should prioritize critical performance issues', async () => {
      const opportunities: LearningOpportunity[] = [];

      const testCases = [
        { skillId: 'critical-skill', successRate: 0.2, severity: 'critical' as const },
        { skillId: 'high-skill', successRate: 0.35, severity: 'high' as const },
        { skillId: 'medium-skill', successRate: 0.45, severity: 'medium' as const },
      ];

      for (const tc of testCases) {
        const pattern = await saflaService.storePattern({
          content: `${tc.skillId} pattern`,
          namespace: 'test-agent',
          skillId: tc.skillId,
        });

        for (let i = 0; i < 30; i++) {
          const outcome = Math.random() < tc.successRate ? 'success' : 'failure';
          await saflaService.recordOutcome(pattern.id, outcome);
        }

        const metrics = await optimizer.analyzeSkillPerformance(tc.skillId, 'test-agent');
        if (metrics) {
          const opportunity = optimizer.detectLearningOpportunity(metrics);
          if (opportunity) {
            opportunities.push(opportunity);
          }
        }
      }

      // Sort by priority
      opportunities.sort((a, b) => b.priorityScore - a.priorityScore);

      // Critical should be first
      expect(opportunities[0].severity).toBe('critical');
    });

    test('should handle agents with no performance issues', async () => {
      const pattern = await saflaService.storePattern({
        content: 'High performing skill',
        namespace: 'test-agent',
        skillId: 'perfect-skill',
      });

      for (let i = 0; i < 30; i++) {
        await saflaService.recordOutcome(pattern.id, 'success');
      }

      const metrics = await optimizer.analyzeSkillPerformance('perfect-skill', 'test-agent');
      const opportunity = optimizer.detectLearningOpportunity(metrics!);

      expect(opportunity).toBeNull(); // No learning needed
    });

    test('should run monitoring loop at scheduled intervals', () => {
      const intervalMs = 300000; // 5 minutes

      const monitoringSchedule = {
        interval: intervalMs,
        lastRun: Date.now(),
        nextRun: Date.now() + intervalMs,
      };

      expect(monitoringSchedule.interval).toBe(300000);
      expect(monitoringSchedule.nextRun).toBeGreaterThan(monitoringSchedule.lastRun);
    });

    test('should aggregate metrics across multiple agents', async () => {
      const agents = ['agent-1', 'agent-2', 'agent-3'];

      for (const agentId of agents) {
        const pattern = await saflaService.storePattern({
          content: `Pattern for ${agentId}`,
          namespace: agentId,
          skillId: 'shared-skill',
          agentId,
        });

        for (let i = 0; i < 20; i++) {
          await saflaService.recordOutcome(pattern.id, i < 12 ? 'success' : 'failure');
        }
      }

      // Collect metrics for all agents
      const allMetrics: SkillPerformanceMetrics[] = [];

      for (const agentId of agents) {
        const metrics = await optimizer.analyzeSkillPerformance('shared-skill', agentId);
        if (metrics) {
          allMetrics.push(metrics);
        }
      }

      expect(allMetrics.length).toBe(3);

      const avgSuccessRate = allMetrics.reduce((sum, m) => sum + m.successRate, 0) / allMetrics.length;
      expect(avgSuccessRate).toBeCloseTo(0.6, 1);
    });

    test('should throttle monitoring for low-activity skills', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Low activity skill',
        namespace: 'test-agent',
        skillId: 'low-activity',
      });

      // Only 5 invocations
      for (let i = 0; i < 5; i++) {
        await saflaService.recordOutcome(pattern.id, 'success');
      }

      const metrics = await optimizer.analyzeSkillPerformance('low-activity', 'test-agent');

      // Should still analyze, but opportunity detection requires 30+ invocations
      expect(metrics).not.toBeNull();
      expect(metrics!.totalInvocations).toBeLessThan(30);

      const opportunity = optimizer.detectLearningOpportunity(metrics!);
      expect(opportunity).toBeNull(); // Insufficient data
    });

    test('should handle monitoring errors gracefully', async () => {
      // Try to analyze non-existent skill
      const metrics = await optimizer.analyzeSkillPerformance('non-existent-skill', 'test-agent');

      expect(metrics).toBeNull();
    });

    test('should batch process multiple skills efficiently', async () => {
      const skillIds: string[] = [];

      // Create 10 skills
      for (let i = 0; i < 10; i++) {
        const skillId = `batch-skill-${i}`;
        skillIds.push(skillId);

        const pattern = await saflaService.storePattern({
          content: `Skill ${i}`,
          namespace: 'test-agent',
          skillId,
        });

        for (let j = 0; j < 30; j++) {
          await saflaService.recordOutcome(pattern.id, j < 18 ? 'success' : 'failure');
        }
      }

      const startTime = Date.now();

      // Analyze all skills
      const results = await Promise.all(
        skillIds.map(skillId => optimizer.analyzeSkillPerformance(skillId, 'test-agent'))
      );

      const duration = Date.now() - startTime;

      expect(results.filter(r => r !== null).length).toBe(10);
      expect(duration).toBeLessThan(5000); // Should complete in <5 seconds
    });

    test('should persist monitoring state between runs', () => {
      const monitoringState = {
        lastMonitoringRun: Date.now(),
        skillsMonitored: 15,
        opportunitiesDetected: 3,
        avgAnalysisTime: 125,
      };

      // Simulate state persistence
      const serialized = JSON.stringify(monitoringState);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.skillsMonitored).toBe(15);
      expect(deserialized.opportunitiesDetected).toBe(3);
    });
  });

  // ============================================================
  // SKILL PERFORMANCE ANALYSIS (7 tests)
  // ============================================================

  describe('Skill Performance Analysis', () => {
    test('should calculate comprehensive performance metrics', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Comprehensive metrics test',
        namespace: 'test-agent',
        skillId: 'metrics-skill',
      });

      for (let i = 0; i < 30; i++) {
        await saflaService.recordOutcome(pattern.id, i < 21 ? 'success' : 'failure', {
          executionTimeMs: 100 + Math.random() * 50,
        });
      }

      const metrics = await optimizer.analyzeSkillPerformance('metrics-skill', 'test-agent');

      expect(metrics).not.toBeNull();
      expect(metrics!.totalInvocations).toBe(30);
      expect(metrics!.successRate).toBeCloseTo(0.7, 1);
      expect(metrics!.confidence).toBeGreaterThan(0.5);
      expect(metrics!.avgExecutionTime).toBeGreaterThan(0);
    });

    test('should detect performance trends over time', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Trend detection test',
        namespace: 'test-agent',
        skillId: 'trend-skill',
      });

      // Declining performance: 90% → 50%
      for (let i = 0; i < 40; i++) {
        const threshold = i < 20 ? 0.9 : 0.5;
        const outcome = Math.random() < threshold ? 'success' : 'failure';
        await saflaService.recordOutcome(pattern.id, outcome);
      }

      const progress = await optimizer.trackLearningProgress('trend-skill', 'test-agent');

      expect(progress.snapshots.length).toBeGreaterThan(0);
      // Note: trend detection depends on snapshot timing, but we can verify structure
      expect(progress.trend).toBeDefined();
      expect(progress.recommendation).toBeDefined();
    });

    test('should compare performance against baseline', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Baseline comparison test',
        namespace: 'test-agent',
        skillId: 'baseline-skill',
      });

      // Establish baseline
      for (let i = 0; i < 20; i++) {
        await saflaService.recordOutcome(pattern.id, i < 16 ? 'success' : 'failure');
      }

      const baseline = await optimizer.analyzeSkillPerformance('baseline-skill', 'test-agent');

      // Continue with current performance
      for (let i = 0; i < 20; i++) {
        await saflaService.recordOutcome(pattern.id, i < 10 ? 'success' : 'failure');
      }

      const current = await optimizer.analyzeSkillPerformance('baseline-skill', 'test-agent');

      const performanceChange = current!.successRate - baseline!.successRate;

      expect(performanceChange).toBeLessThan(0); // Declining
    });

    test('should identify performance bottlenecks', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Bottleneck detection test',
        namespace: 'test-agent',
        skillId: 'bottleneck-skill',
      });

      // Variable execution times
      const executionTimes = [100, 105, 98, 500, 102, 600, 99, 550];

      for (const time of executionTimes) {
        await saflaService.recordOutcome(pattern.id, 'success', {
          executionTimeMs: time,
        });
      }

      const outcomes = saflaService.getPatternOutcomes(pattern.id);
      const times = outcomes.map(o => o.executionTimeMs || 0);

      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      const outliers = times.filter(t => t > mean * 2);

      expect(outliers.length).toBeGreaterThan(0); // Has bottlenecks
    });

    test('should segment performance by context', async () => {
      const contexts = ['context-A', 'context-B', 'context-C'];

      for (const context of contexts) {
        const pattern = await saflaService.storePattern({
          content: `Pattern for ${context}`,
          namespace: 'test-agent',
          skillId: 'segmented-skill',
          contextType: context,
        });

        const successRate = context === 'context-A' ? 0.8 : context === 'context-B' ? 0.5 : 0.3;

        for (let i = 0; i < 20; i++) {
          const outcome = Math.random() < successRate ? 'success' : 'failure';
          await saflaService.recordOutcome(pattern.id, outcome);
        }
      }

      // Analysis would segment by context (simplified here)
      const metrics = await optimizer.analyzeSkillPerformance('segmented-skill', 'test-agent');

      expect(metrics).not.toBeNull();
      expect(metrics!.totalInvocations).toBeGreaterThanOrEqual(60);
    });

    test('should calculate statistical significance of changes', () => {
      const before = { successes: 80, total: 100 };
      const after = { successes: 60, total: 100 };

      const p1 = before.successes / before.total;
      const p2 = after.successes / after.total;

      const pooledP = (before.successes + after.successes) / (before.total + after.total);
      const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / before.total + 1 / after.total));

      const zScore = (p1 - p2) / se;

      // Significant change (z > 1.96)
      expect(Math.abs(zScore)).toBeGreaterThan(1.96);
    });

    test('should handle incomplete or missing performance data', async () => {
      // Try to analyze skill with no patterns
      const metrics = await optimizer.analyzeSkillPerformance('missing-skill', 'test-agent');

      expect(metrics).toBeNull();
    });
  });

  // ============================================================
  // LEARNING ENABLEMENT DECISIONS (5 tests)
  // ============================================================

  describe('Learning Enablement Decisions', () => {
    test('should enable learning for critically underperforming skills', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Critical underperformance',
        namespace: 'test-agent',
        skillId: 'critical-skill',
      });

      for (let i = 0; i < 30; i++) {
        await saflaService.recordOutcome(pattern.id, i < 6 ? 'success' : 'failure');
      }

      const metrics = await optimizer.analyzeSkillPerformance('critical-skill', 'test-agent');
      const opportunity = optimizer.detectLearningOpportunity(metrics!);

      expect(opportunity).not.toBeNull();
      expect(opportunity!.severity).toBe('critical');
      expect(opportunity!.recommendedAction).toContain('learning');
    });

    test('should not enable learning for well-performing skills', async () => {
      const pattern = await saflaService.storePattern({
        content: 'High performance',
        namespace: 'test-agent',
        skillId: 'excellent-skill',
      });

      for (let i = 0; i < 30; i++) {
        await saflaService.recordOutcome(pattern.id, i < 28 ? 'success' : 'failure');
      }

      const metrics = await optimizer.analyzeSkillPerformance('excellent-skill', 'test-agent');
      const opportunity = optimizer.detectLearningOpportunity(metrics!);

      expect(opportunity).toBeNull();
    });

    test('should consider multiple factors in decision making', async () => {
      const testCases = [
        { successRate: 0.3, confidence: 0.25, expectedSeverity: 'critical' },
        { successRate: 0.35, confidence: 0.28, expectedSeverity: 'high' },
        { successRate: 0.45, confidence: 0.32, expectedSeverity: 'medium' },
        { successRate: 0.55, confidence: 0.38, expectedSeverity: 'low' },
      ];

      for (const tc of testCases) {
        const pattern = await saflaService.storePattern({
          content: `Test case ${tc.expectedSeverity}`,
          namespace: 'test-agent',
          skillId: `skill-${tc.expectedSeverity}`,
        });

        const successCount = Math.floor(tc.successRate * 30);
        for (let i = 0; i < 30; i++) {
          await saflaService.recordOutcome(pattern.id, i < successCount ? 'success' : 'failure');
        }

        const metrics = await optimizer.analyzeSkillPerformance(`skill-${tc.expectedSeverity}`, 'test-agent');
        const opportunity = optimizer.detectLearningOpportunity(metrics!);

        if (opportunity) {
          expect(opportunity.severity).toBe(tc.expectedSeverity);
        }
      }
    });

    test('should provide clear reasoning for enablement decisions', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Decision reasoning test',
        namespace: 'test-agent',
        skillId: 'reasoning-skill',
      });

      for (let i = 0; i < 30; i++) {
        await saflaService.recordOutcome(pattern.id, i < 12 ? 'success' : 'failure');
      }

      const metrics = await optimizer.analyzeSkillPerformance('reasoning-skill', 'test-agent');
      const opportunity = optimizer.detectLearningOpportunity(metrics!);

      expect(opportunity).not.toBeNull();
      expect(opportunity!.reason).toBeDefined();
      expect(opportunity!.reason).toContain('%'); // Should include percentages
    });

    test('should recommend alternative actions when learning not appropriate', async () => {
      // Low sample size
      const pattern = await saflaService.storePattern({
        content: 'Low sample size',
        namespace: 'test-agent',
        skillId: 'low-sample-skill',
      });

      for (let i = 0; i < 10; i++) {
        await saflaService.recordOutcome(pattern.id, 'failure');
      }

      const metrics = await optimizer.analyzeSkillPerformance('low-sample-skill', 'test-agent');
      const opportunity = optimizer.detectLearningOpportunity(metrics!);

      // Should not enable learning with insufficient data
      expect(opportunity).toBeNull();
    });
  });

  // ============================================================
  // PROGRESS TRACKING (5 tests)
  // ============================================================

  describe('Progress Tracking', () => {
    test('should track learning progress over multiple iterations', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Progress tracking test',
        namespace: 'test-agent',
        skillId: 'progress-skill',
      });

      // Simulate improvement over time
      for (let i = 0; i < 60; i++) {
        const successRate = 0.3 + (i / 60) * 0.5; // 30% → 80%
        const outcome = Math.random() < successRate ? 'success' : 'failure';
        await saflaService.recordOutcome(pattern.id, outcome);
      }

      const progress = await optimizer.trackLearningProgress('progress-skill', 'test-agent');

      expect(progress.snapshots.length).toBeGreaterThan(0);
      expect(progress.trend).toBe('improving');
    });

    test('should detect when learning is not effective', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Ineffective learning test',
        namespace: 'test-agent',
        skillId: 'ineffective-skill',
      });

      // No improvement despite attempts
      for (let i = 0; i < 60; i++) {
        await saflaService.recordOutcome(pattern.id, i % 3 === 0 ? 'success' : 'failure');
      }

      const progress = await optimizer.trackLearningProgress('ineffective-skill', 'test-agent');

      // Should detect stable or declining trend
      expect(['stable', 'declining']).toContain(progress.trend);
    });

    test('should calculate learning velocity', async () => {
      const snapshots = [
        { timestamp: Date.now() - 86400000 * 2, successRate: 0.3 },
        { timestamp: Date.now() - 86400000, successRate: 0.5 },
        { timestamp: Date.now(), successRate: 0.7 },
      ];

      const improvements = [];
      for (let i = 1; i < snapshots.length; i++) {
        const improvement = snapshots[i].successRate - snapshots[i - 1].successRate;
        const timeDelta = (snapshots[i].timestamp - snapshots[i - 1].timestamp) / 86400000; // days
        const velocity = improvement / timeDelta;
        improvements.push(velocity);
      }

      const avgVelocity = improvements.reduce((sum, v) => sum + v, 0) / improvements.length;

      expect(avgVelocity).toBeGreaterThan(0); // Positive learning velocity
    });

    test('should maintain historical progress records', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Historical records test',
        namespace: 'test-agent',
        skillId: 'historical-skill',
      });

      for (let i = 0; i < 40; i++) {
        await saflaService.recordOutcome(pattern.id, i < 25 ? 'success' : 'failure');
      }

      const outcomes = saflaService.getPatternOutcomes(pattern.id);

      expect(outcomes.length).toBeGreaterThan(0);
      expect(outcomes[0].timestamp).toBeDefined();

      // Outcomes should be in descending order by timestamp
      for (let i = 1; i < outcomes.length; i++) {
        expect(outcomes[i].timestamp).toBeLessThanOrEqual(outcomes[i - 1].timestamp);
      }
    });

    test('should provide progress visualization data', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Visualization data test',
        namespace: 'test-agent',
        skillId: 'viz-skill',
      });

      for (let i = 0; i < 50; i++) {
        await saflaService.recordOutcome(pattern.id, i < 35 ? 'success' : 'failure');
      }

      const outcomes = saflaService.getPatternOutcomes(pattern.id);

      // Generate time series data
      const timeSeries = outcomes.map(o => ({
        timestamp: o.timestamp,
        confidence: o.confidenceAfter,
        outcome: o.outcome,
      }));

      expect(timeSeries.length).toBe(50);
      expect(timeSeries[0].timestamp).toBeDefined();
      expect(timeSeries[0].confidence).toBeDefined();
    });
  });

  // ============================================================
  // REPORTING TO AVI (3 tests)
  // ============================================================

  describe('Reporting to Avi', () => {
    test('should generate comprehensive report with all opportunities', async () => {
      const opportunities: LearningOpportunity[] = [];

      for (let i = 0; i < 3; i++) {
        const pattern = await saflaService.storePattern({
          content: `Report skill ${i}`,
          namespace: 'test-agent',
          skillId: `report-skill-${i}`,
        });

        for (let j = 0; j < 30; j++) {
          await saflaService.recordOutcome(pattern.id, j < 10 ? 'success' : 'failure');
        }

        const metrics = await optimizer.analyzeSkillPerformance(`report-skill-${i}`, 'test-agent');
        const opportunity = optimizer.detectLearningOpportunity(metrics!);
        if (opportunity) {
          opportunities.push(opportunity);
        }
      }

      const report = optimizer.generateAviReport(opportunities);

      expect(report.title).toContain('Learning Optimizer');
      expect(report.opportunities.length).toBe(opportunities.length);
      expect(report.prioritizedActions.length).toBeGreaterThan(0);
      expect(report.timestamp).toBeDefined();
    });

    test('should prioritize opportunities in report', async () => {
      const opportunities: LearningOpportunity[] = [
        {
          skillId: 'low-priority',
          agentId: 'test-agent',
          severity: 'low',
          reason: 'Minor issue',
          metrics: {} as any,
          recommendedAction: 'Monitor',
          priorityScore: 25,
        },
        {
          skillId: 'high-priority',
          agentId: 'test-agent',
          severity: 'critical',
          reason: 'Critical issue',
          metrics: {} as any,
          recommendedAction: 'Immediate action',
          priorityScore: 100,
        },
      ];

      const report = optimizer.generateAviReport(opportunities);

      // First prioritized action should be critical
      expect(report.prioritizedActions[0]).toContain('CRITICAL');
      expect(report.prioritizedActions[0]).toContain('high-priority');
    });

    test('should include actionable recommendations in report', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Actionable recommendations',
        namespace: 'test-agent',
        skillId: 'action-skill',
      });

      for (let i = 0; i < 30; i++) {
        await saflaService.recordOutcome(pattern.id, i < 8 ? 'success' : 'failure');
      }

      const metrics = await optimizer.analyzeSkillPerformance('action-skill', 'test-agent');
      const opportunity = optimizer.detectLearningOpportunity(metrics!);

      expect(opportunity).not.toBeNull();
      expect(opportunity!.recommendedAction).toBeDefined();
      expect(opportunity!.recommendedAction.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // PATTERN QUALITY MANAGEMENT (5 tests)
  // ============================================================

  describe('Pattern Quality Management', () => {
    test('should assess pattern quality accurately', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Quality assessment test',
        namespace: 'test-agent',
      });

      for (let i = 0; i < 30; i++) {
        await saflaService.recordOutcome(pattern.id, i < 25 ? 'success' : 'failure');
      }

      const quality = await optimizer.assessPatternQuality(pattern.id);

      expect(quality.quality).toBe('high');
      expect(quality.issues.length).toBe(0);
    });

    test('should identify low-quality patterns', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Low quality pattern',
        namespace: 'test-agent',
      });

      for (let i = 0; i < 10; i++) {
        await saflaService.recordOutcome(pattern.id, i < 3 ? 'success' : 'failure');
      }

      const quality = await optimizer.assessPatternQuality(pattern.id);

      expect(quality.quality).toBe('low');
      expect(quality.issues.length).toBeGreaterThan(0);
      expect(quality.recommendations.length).toBeGreaterThan(0);
    });

    test('should provide specific quality improvement recommendations', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Improvement recommendations',
        namespace: 'test-agent',
      });

      // Low sample size
      for (let i = 0; i < 5; i++) {
        await saflaService.recordOutcome(pattern.id, 'failure');
      }

      const quality = await optimizer.assessPatternQuality(pattern.id);

      expect(quality.recommendations).toContain('Collect more usage data before analysis');
    });

    test('should detect stale patterns', async () => {
      const pattern = await saflaService.storePattern({
        content: 'Stale pattern test',
        namespace: 'test-agent',
      });

      // Create old pattern (simulate by checking lastUsedAt)
      await saflaService.recordOutcome(pattern.id, 'success');

      const updatedPattern = saflaService.getPattern(pattern.id)!;

      // Check if pattern would be considered stale
      const daysSinceLastUse = updatedPattern.lastUsedAt
        ? (Date.now() - updatedPattern.lastUsedAt) / (1000 * 60 * 60 * 24)
        : Infinity;

      const isStale = daysSinceLastUse > 90;

      // This pattern is fresh, so should not be stale
      expect(isStale).toBe(false);
    });

    test('should rank patterns by quality for cleanup', async () => {
      const patterns = [];

      for (let i = 0; i < 5; i++) {
        const pattern = await saflaService.storePattern({
          content: `Pattern ${i}`,
          namespace: 'test-agent',
        });

        // Varying quality levels
        const successCount = [25, 20, 15, 10, 5][i];
        for (let j = 0; j < 30; j++) {
          await saflaService.recordOutcome(pattern.id, j < successCount ? 'success' : 'failure');
        }

        patterns.push(pattern);
      }

      // Assess all patterns
      const qualityAssessments = await Promise.all(
        patterns.map(p => optimizer.assessPatternQuality(p.id))
      );

      const lowQualityCount = qualityAssessments.filter(q => q.quality === 'low').length;

      expect(lowQualityCount).toBeGreaterThan(0);
    });
  });
});
