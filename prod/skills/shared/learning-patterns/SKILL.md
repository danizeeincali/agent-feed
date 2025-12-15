---
name: learning-patterns
description: Autonomous learning decision-making patterns for optimizing skill performance through statistical analysis and intelligent adaptation
version: 1.0.0
category: shared
tags:
  - learning
  - optimization
  - statistics
  - decision-making
  - performance
primary_agent: learning-optimizer-agent
related_skills:
  - performance-monitoring
  - skill-design-patterns
author: Avi System
created: 2025-10-18
last_updated: 2025-10-18
token_efficiency: high
learning_enabled: false
---

# Learning Patterns

This skill provides autonomous learning decision-making patterns for the learning-optimizer-agent. It defines when and how to enable learning for skills, measure impact, and make data-driven optimization decisions.

## Overview

Learning should be enabled strategically, not universally. This skill teaches you to:
- Identify when learning will provide value
- Establish performance baselines
- Measure learning impact statistically
- Avoid false positives and unnecessary adaptations
- Report findings clearly to Avi

## When to Enable Learning

### Statistical Thresholds for Learning Activation

Learning should only be enabled when objective criteria indicate potential benefit:

#### 1. Execution Volume Threshold
```typescript
interface LearningCriteria {
  minimumExecutions: number;
  timeWindow: string;
  varianceThreshold: number;
  successRateThreshold: number;
}

const LEARNING_THRESHOLDS: LearningCriteria = {
  minimumExecutions: 20,        // Need enough data
  timeWindow: '7d',             // Within recent period
  varianceThreshold: 0.15,      // 15% variance in performance
  successRateThreshold: 0.80    // Below 80% success needs improvement
};

async function shouldEnableLearning(
  skillName: string
): Promise<{ enable: boolean; reason: string }> {
  const metrics = await getSkillMetrics(skillName, LEARNING_THRESHOLDS.timeWindow);

  // Check minimum execution volume
  if (metrics.executionCount < LEARNING_THRESHOLDS.minimumExecutions) {
    return {
      enable: false,
      reason: `Insufficient data: ${metrics.executionCount} executions (need ${LEARNING_THRESHOLDS.minimumExecutions})`
    };
  }

  // Check success rate
  if (metrics.successRate < LEARNING_THRESHOLDS.successRateThreshold) {
    return {
      enable: true,
      reason: `Low success rate: ${(metrics.successRate * 100).toFixed(1)}% (threshold: ${LEARNING_THRESHOLDS.successRateThreshold * 100}%)`
    };
  }

  // Check performance variance
  if (metrics.performanceVariance > LEARNING_THRESHOLDS.varianceThreshold) {
    return {
      enable: true,
      reason: `High variance: ${(metrics.performanceVariance * 100).toFixed(1)}% (threshold: ${LEARNING_THRESHOLDS.varianceThreshold * 100}%)`
    };
  }

  return {
    enable: false,
    reason: 'Skill performing within acceptable parameters'
  };
}
```

#### 2. Performance Degradation Detection
```typescript
interface PerformanceTrend {
  slope: number;
  pValue: number;
  confidence: number;
}

async function detectPerformanceDegradation(
  skillName: string,
  windowDays: number = 14
): Promise<{ degrading: boolean; trend: PerformanceTrend }> {
  const dailyMetrics = await getDailyMetrics(skillName, windowDays);

  // Calculate linear regression
  const trend = calculateLinearRegression(
    dailyMetrics.map((m, i) => ({ x: i, y: m.successRate }))
  );

  // Significant negative trend indicates degradation
  const degrading = trend.slope < -0.01 && trend.pValue < 0.05;

  return { degrading, trend };
}

function calculateLinearRegression(
  points: Array<{ x: number; y: number }>
): PerformanceTrend {
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate p-value (simplified)
  const yPredicted = points.map(p => slope * p.x + intercept);
  const residuals = points.map((p, i) => p.y - yPredicted[i]);
  const sse = residuals.reduce((sum, r) => sum + r * r, 0);
  const mse = sse / (n - 2);
  const seSlope = Math.sqrt(mse / sumX2);
  const tStat = Math.abs(slope / seSlope);
  const pValue = 2 * (1 - tCDF(tStat, n - 2));

  return {
    slope,
    pValue,
    confidence: 1 - pValue
  };
}
```

#### 3. Error Pattern Recognition
```typescript
interface ErrorPattern {
  errorType: string;
  frequency: number;
  examples: string[];
  learnable: boolean;
}

async function analyzeErrorPatterns(
  skillName: string
): Promise<ErrorPattern[]> {
  const errors = await getSkillErrors(skillName, '30d');

  // Group errors by type/message
  const errorGroups = new Map<string, string[]>();

  for (const error of errors) {
    const errorKey = normalizeErrorMessage(error.message);
    if (!errorGroups.has(errorKey)) {
      errorGroups.set(errorKey, []);
    }
    errorGroups.get(errorKey)!.push(error.context);
  }

  // Identify learnable patterns
  const patterns: ErrorPattern[] = [];

  for (const [errorType, examples] of errorGroups) {
    const frequency = examples.length / errors.length;

    // Only patterns occurring >10% of time are worth learning from
    if (frequency > 0.1) {
      patterns.push({
        errorType,
        frequency,
        examples: examples.slice(0, 3), // Sample examples
        learnable: isLearnableError(errorType)
      });
    }
  }

  return patterns.sort((a, b) => b.frequency - a.frequency);
}

function isLearnableError(errorType: string): boolean {
  // Some errors are environmental, not learnable
  const nonLearnablePatterns = [
    /network timeout/i,
    /database connection/i,
    /rate limit/i,
    /service unavailable/i
  ];

  return !nonLearnablePatterns.some(pattern => pattern.test(errorType));
}
```

### Decision Matrix

Use this matrix to determine if learning should be enabled:

| Criterion | Threshold | Weight | Measured By |
|-----------|-----------|--------|-------------|
| Execution Count | ≥20 in 7d | Required | Execution logs |
| Success Rate | <80% | High | Success/failure ratio |
| Performance Variance | >15% | Medium | Standard deviation |
| Degradation Trend | Negative slope, p<0.05 | High | Linear regression |
| Learnable Error Rate | >10% | Medium | Error pattern analysis |
| User Complaints | >0 in 30d | High | User feedback |

## Performance Metrics

### Baseline Establishment

Before enabling learning, establish a performance baseline:

```typescript
interface PerformanceBaseline {
  skillName: string;
  version: string;
  executionCount: number;
  successRate: number;
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  commonErrors: ErrorPattern[];
  establishedAt: Date;
  validUntil: Date;
}

async function establishBaseline(
  skillName: string,
  version: string
): Promise<PerformanceBaseline> {
  const metrics = await getSkillMetrics(skillName, '7d');
  const responseTimes = await getResponseTimes(skillName, '7d');
  const errors = await analyzeErrorPatterns(skillName);

  const baseline: PerformanceBaseline = {
    skillName,
    version,
    executionCount: metrics.executionCount,
    successRate: metrics.successRate,
    averageResponseTime: calculateMean(responseTimes),
    p50ResponseTime: calculatePercentile(responseTimes, 50),
    p95ResponseTime: calculatePercentile(responseTimes, 95),
    p99ResponseTime: calculatePercentile(responseTimes, 99),
    errorRate: metrics.errorCount / metrics.executionCount,
    commonErrors: errors.filter(e => e.frequency > 0.05),
    establishedAt: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  };

  await saveBaseline(baseline);
  return baseline;
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

function calculateMean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateStdDev(values: number[]): number {
  const mean = calculateMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = calculateMean(squaredDiffs);
  return Math.sqrt(variance);
}
```

### Success Rate Calculation

```typescript
interface ExecutionResult {
  skillName: string;
  success: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

async function calculateSuccessRate(
  skillName: string,
  timeWindow: string
): Promise<{
  rate: number;
  total: number;
  successes: number;
  failures: number;
  confidenceInterval: [number, number];
}> {
  const results = await getExecutionResults(skillName, timeWindow);
  const successes = results.filter(r => r.success).length;
  const total = results.length;
  const rate = successes / total;

  // Calculate 95% confidence interval using Wilson score interval
  const z = 1.96; // 95% confidence
  const n = total;
  const p = rate;

  const denominator = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt(p * (1 - p) / n + (z * z) / (4 * n * n));

  const lower = (center - spread) / denominator;
  const upper = (center + spread) / denominator;

  return {
    rate,
    total,
    successes,
    failures: total - successes,
    confidenceInterval: [lower, upper]
  };
}
```

### Performance Variance Analysis

```typescript
interface VarianceAnalysis {
  mean: number;
  stdDev: number;
  variance: number;
  coefficientOfVariation: number;
  isStable: boolean;
}

async function analyzePerformanceVariance(
  skillName: string
): Promise<VarianceAnalysis> {
  const responseTimes = await getResponseTimes(skillName, '7d');

  const mean = calculateMean(responseTimes);
  const stdDev = calculateStdDev(responseTimes);
  const variance = stdDev * stdDev;
  const coefficientOfVariation = stdDev / mean;

  // CV < 0.15 indicates stable performance
  const isStable = coefficientOfVariation < 0.15;

  return {
    mean,
    stdDev,
    variance,
    coefficientOfVariation,
    isStable
  };
}
```

## Learning Impact Measurement

### Before/After Analysis

```typescript
interface LearningImpact {
  skillName: string;
  learningEnabled: Date;
  baselineMetrics: PerformanceBaseline;
  currentMetrics: PerformanceBaseline;
  improvement: {
    successRate: number;
    responseTime: number;
    errorRate: number;
    variance: number;
  };
  statisticalSignificance: {
    successRateSignificant: boolean;
    responseTimeSignificant: boolean;
    pValues: {
      successRate: number;
      responseTime: number;
    };
  };
  recommendation: 'keep' | 'disable' | 'continue_monitoring';
  reasoning: string;
}

async function measureLearningImpact(
  skillName: string
): Promise<LearningImpact> {
  const learningEnabledDate = await getLearningEnabledDate(skillName);
  const baseline = await getBaseline(skillName);

  // Get metrics from after learning was enabled
  const current = await establishBaseline(skillName, baseline.version);

  // Calculate improvements
  const successRateImprovement =
    (current.successRate - baseline.successRate) / baseline.successRate;
  const responseTimeImprovement =
    (baseline.averageResponseTime - current.averageResponseTime) / baseline.averageResponseTime;
  const errorRateImprovement =
    (baseline.errorRate - current.errorRate) / baseline.errorRate;
  const varianceImprovement =
    (baseline.p95ResponseTime - current.p95ResponseTime) / baseline.p95ResponseTime;

  // Test statistical significance
  const successRateTest = await tTest(
    await getSuccessRates(skillName, learningEnabledDate, -7), // Before
    await getSuccessRates(skillName, learningEnabledDate, 7)   // After
  );

  const responseTimeTest = await tTest(
    await getResponseTimes(skillName, learningEnabledDate, -7),
    await getResponseTimes(skillName, learningEnabledDate, 7)
  );

  // Determine recommendation
  let recommendation: 'keep' | 'disable' | 'continue_monitoring';
  let reasoning: string;

  if (successRateTest.significant && successRateImprovement > 0.05) {
    recommendation = 'keep';
    reasoning = `Significant improvement in success rate (+${(successRateImprovement * 100).toFixed(1)}%)`;
  } else if (successRateImprovement < -0.05 && successRateTest.significant) {
    recommendation = 'disable';
    reasoning = `Significant degradation in success rate (${(successRateImprovement * 100).toFixed(1)}%)`;
  } else if (current.executionCount < 50) {
    recommendation = 'continue_monitoring';
    reasoning = 'Insufficient data to determine impact';
  } else {
    recommendation = 'continue_monitoring';
    reasoning = 'No significant change observed';
  }

  return {
    skillName,
    learningEnabled: learningEnabledDate,
    baselineMetrics: baseline,
    currentMetrics: current,
    improvement: {
      successRate: successRateImprovement,
      responseTime: responseTimeImprovement,
      errorRate: errorRateImprovement,
      variance: varianceImprovement
    },
    statisticalSignificance: {
      successRateSignificant: successRateTest.significant,
      responseTimeSignificant: responseTimeTest.significant,
      pValues: {
        successRate: successRateTest.pValue,
        responseTime: responseTimeTest.pValue
      }
    },
    recommendation,
    reasoning
  };
}

interface TTestResult {
  tStatistic: number;
  pValue: number;
  significant: boolean;
  degreesOfFreedom: number;
}

async function tTest(
  sample1: number[],
  sample2: number[]
): Promise<TTestResult> {
  const mean1 = calculateMean(sample1);
  const mean2 = calculateMean(sample2);
  const var1 = calculateStdDev(sample1) ** 2;
  const var2 = calculateStdDev(sample2) ** 2;
  const n1 = sample1.length;
  const n2 = sample2.length;

  // Welch's t-test (unequal variances)
  const tStatistic = (mean1 - mean2) / Math.sqrt(var1 / n1 + var2 / n2);

  // Welch-Satterthwaite degrees of freedom
  const df = Math.pow(var1 / n1 + var2 / n2, 2) /
    (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));

  const pValue = 2 * (1 - tCDF(Math.abs(tStatistic), df));

  return {
    tStatistic,
    pValue,
    significant: pValue < 0.05,
    degreesOfFreedom: df
  };
}

// Student's t cumulative distribution function
function tCDF(t: number, df: number): number {
  // Simplified approximation
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(df / 2, 0.5, x);
}

function incompleteBeta(a: number, b: number, x: number): number {
  // Simplified implementation for common cases
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use continued fraction approximation
  let result = Math.exp(
    a * Math.log(x) + b * Math.log(1 - x) - logBeta(a, b)
  );

  return result * betaContinuedFraction(a, b, x) / a;
}

function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

function logGamma(x: number): number {
  // Stirling's approximation
  return (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maxIterations = 100;
  const epsilon = 1e-10;

  let result = 1;
  for (let i = 1; i <= maxIterations; i++) {
    const m = i / 2;
    const numerator = i % 2 === 0
      ? (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m))
      : -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));

    result = 1 + numerator / result;

    if (Math.abs(numerator / result) < epsilon) break;
  }

  return result;
}
```

## Success Criteria Definitions

### Quantitative Success Criteria

```typescript
interface SuccessCriteria {
  // Primary metrics
  minSuccessRate: number;           // 0.85 = 85%
  maxErrorRate: number;             // 0.10 = 10%
  maxP95ResponseTime: number;       // milliseconds

  // Secondary metrics
  maxVarianceCoefficient: number;   // 0.15 = 15%
  minExecutionsPerDay: number;      // Usage threshold

  // Learning impact
  minImprovementRate: number;       // 0.05 = 5% improvement
  minMonitoringPeriod: number;      // days
}

const DEFAULT_SUCCESS_CRITERIA: SuccessCriteria = {
  minSuccessRate: 0.85,
  maxErrorRate: 0.10,
  maxP95ResponseTime: 5000,
  maxVarianceCoefficient: 0.15,
  minExecutionsPerDay: 5,
  minImprovementRate: 0.05,
  minMonitoringPeriod: 7
};

function evaluateSkillSuccess(
  metrics: PerformanceBaseline,
  criteria: SuccessCriteria = DEFAULT_SUCCESS_CRITERIA
): {
  passing: boolean;
  failedCriteria: string[];
  score: number;
} {
  const failedCriteria: string[] = [];
  let score = 100;

  if (metrics.successRate < criteria.minSuccessRate) {
    failedCriteria.push(
      `Success rate ${(metrics.successRate * 100).toFixed(1)}% below threshold ${(criteria.minSuccessRate * 100)}%`
    );
    score -= 30;
  }

  if (metrics.errorRate > criteria.maxErrorRate) {
    failedCriteria.push(
      `Error rate ${(metrics.errorRate * 100).toFixed(1)}% above threshold ${(criteria.maxErrorRate * 100)}%`
    );
    score -= 20;
  }

  if (metrics.p95ResponseTime > criteria.maxP95ResponseTime) {
    failedCriteria.push(
      `P95 response time ${metrics.p95ResponseTime}ms above threshold ${criteria.maxP95ResponseTime}ms`
    );
    score -= 15;
  }

  const variance = calculateStdDev([metrics.averageResponseTime]) / metrics.averageResponseTime;
  if (variance > criteria.maxVarianceCoefficient) {
    failedCriteria.push(
      `Variance coefficient ${(variance * 100).toFixed(1)}% above threshold ${(criteria.maxVarianceCoefficient * 100)}%`
    );
    score -= 10;
  }

  return {
    passing: failedCriteria.length === 0,
    failedCriteria,
    score: Math.max(0, score)
  };
}
```

## False Positive Avoidance

### Statistical Rigor

```typescript
interface FalsePositiveCheck {
  sampleSize: number;
  statisticalPower: number;
  multipleTestingCorrection: boolean;
  minimumEffectSize: number;
}

function avoidFalsePositives(
  impact: LearningImpact,
  check: FalsePositiveCheck
): { reliable: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check sample size
  if (impact.currentMetrics.executionCount < check.sampleSize) {
    warnings.push(
      `Sample size too small: ${impact.currentMetrics.executionCount} (need ${check.sampleSize})`
    );
  }

  // Check effect size
  if (Math.abs(impact.improvement.successRate) < check.minimumEffectSize) {
    warnings.push(
      `Effect size too small: ${(Math.abs(impact.improvement.successRate) * 100).toFixed(1)}% (need ${(check.minimumEffectSize * 100)}%)`
    );
  }

  // Check statistical power
  const power = calculateStatisticalPower(
    impact.currentMetrics.executionCount,
    check.minimumEffectSize,
    0.05
  );

  if (power < check.statisticalPower) {
    warnings.push(
      `Statistical power too low: ${(power * 100).toFixed(1)}% (need ${(check.statisticalPower * 100)}%)`
    );
  }

  // Multiple testing correction (Bonferroni)
  if (check.multipleTestingCorrection) {
    const adjustedAlpha = 0.05 / 2; // Testing 2 metrics
    if (impact.statisticalSignificance.pValues.successRate > adjustedAlpha) {
      warnings.push('Not significant after multiple testing correction');
    }
  }

  return {
    reliable: warnings.length === 0,
    warnings
  };
}

function calculateStatisticalPower(
  sampleSize: number,
  effectSize: number,
  alpha: number
): number {
  // Simplified power calculation for proportion test
  const z_alpha = 1.96; // 95% confidence
  const z_beta = (effectSize * Math.sqrt(sampleSize)) - z_alpha;

  // Standard normal CDF approximation
  return 0.5 * (1 + Math.erf(z_beta / Math.sqrt(2)));
}
```

### Regression Detection

```typescript
interface RegressionCheck {
  baselineVersion: string;
  currentVersion: string;
  regressionThreshold: number;
}

async function detectRegression(
  skillName: string,
  check: RegressionCheck
): Promise<{ regressed: boolean; details: string }> {
  const baseline = await getBaseline(skillName, check.baselineVersion);
  const current = await getBaseline(skillName, check.currentVersion);

  const successRateChange = (current.successRate - baseline.successRate) / baseline.successRate;

  if (successRateChange < -check.regressionThreshold) {
    return {
      regressed: true,
      details: `Success rate decreased by ${(Math.abs(successRateChange) * 100).toFixed(1)}% (threshold: ${(check.regressionThreshold * 100)}%)`
    };
  }

  return {
    regressed: false,
    details: 'No significant regression detected'
  };
}
```

## Reporting Patterns for Avi

### User-Friendly Reports

```typescript
interface AviReport {
  summary: string;
  details: {
    skillName: string;
    status: 'excellent' | 'good' | 'needs_attention' | 'critical';
    metrics: {
      label: string;
      value: string;
      trend: 'up' | 'down' | 'stable';
      good: boolean;
    }[];
    recommendations: string[];
  };
  actionRequired: boolean;
  urgency: 'low' | 'medium' | 'high';
}

function generateAviReport(
  skillName: string,
  metrics: PerformanceBaseline,
  impact?: LearningImpact
): AviReport {
  const evaluation = evaluateSkillSuccess(metrics);

  let status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  if (evaluation.score >= 90) status = 'excellent';
  else if (evaluation.score >= 75) status = 'good';
  else if (evaluation.score >= 60) status = 'needs_attention';
  else status = 'critical';

  const summary = generateSummary(skillName, status, metrics, impact);

  const metricsReport = [
    {
      label: 'Success Rate',
      value: `${(metrics.successRate * 100).toFixed(1)}%`,
      trend: impact ? getTrend(impact.improvement.successRate) : 'stable' as const,
      good: metrics.successRate >= 0.85
    },
    {
      label: 'Average Response Time',
      value: `${metrics.averageResponseTime.toFixed(0)}ms`,
      trend: impact ? getTrend(-impact.improvement.responseTime) : 'stable' as const,
      good: metrics.averageResponseTime < 3000
    },
    {
      label: 'Error Rate',
      value: `${(metrics.errorRate * 100).toFixed(1)}%`,
      trend: impact ? getTrend(-impact.improvement.errorRate) : 'stable' as const,
      good: metrics.errorRate < 0.10
    },
    {
      label: 'Executions (7d)',
      value: metrics.executionCount.toString(),
      trend: 'stable' as const,
      good: metrics.executionCount > 30
    }
  ];

  const recommendations = generateRecommendations(metrics, evaluation, impact);

  return {
    summary,
    details: {
      skillName,
      status,
      metrics: metricsReport,
      recommendations
    },
    actionRequired: status === 'critical' || status === 'needs_attention',
    urgency: status === 'critical' ? 'high' : status === 'needs_attention' ? 'medium' : 'low'
  };
}

function generateSummary(
  skillName: string,
  status: string,
  metrics: PerformanceBaseline,
  impact?: LearningImpact
): string {
  const skillDisplay = skillName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  if (status === 'excellent') {
    return `${skillDisplay} is performing excellently with ${(metrics.successRate * 100).toFixed(0)}% success rate.`;
  }

  if (status === 'good') {
    return `${skillDisplay} is performing well. ${impact ? 'Learning is showing positive results.' : ''}`;
  }

  if (status === 'needs_attention') {
    const issue = metrics.successRate < 0.85 ? 'success rate needs improvement' : 'response times are high';
    return `${skillDisplay} ${issue}. ${impact ? 'Learning has been enabled to address this.' : 'Consider enabling learning.'}`;
  }

  return `${skillDisplay} is experiencing significant issues and needs immediate attention.`;
}

function getTrend(improvement: number): 'up' | 'down' | 'stable' {
  if (improvement > 0.05) return 'up';
  if (improvement < -0.05) return 'down';
  return 'stable';
}

function generateRecommendations(
  metrics: PerformanceBaseline,
  evaluation: any,
  impact?: LearningImpact
): string[] {
  const recommendations: string[] = [];

  if (metrics.successRate < 0.85 && !impact) {
    recommendations.push('Enable learning to improve success rate');
  }

  if (impact && impact.recommendation === 'keep') {
    recommendations.push('Continue learning - showing positive results');
  }

  if (impact && impact.recommendation === 'disable') {
    recommendations.push('Disable learning - not providing benefit');
  }

  if (metrics.errorRate > 0.10) {
    const topError = metrics.commonErrors[0];
    if (topError) {
      recommendations.push(`Address common error: ${topError.errorType}`);
    }
  }

  if (metrics.p95ResponseTime > 5000) {
    recommendations.push('Investigate performance bottlenecks');
  }

  if (metrics.executionCount < 30) {
    recommendations.push('Monitor for more data before making changes');
  }

  return recommendations;
}
```

## Autonomous Decision Algorithms

### Complete Decision Flow

```typescript
interface DecisionContext {
  skillName: string;
  currentMetrics: PerformanceBaseline;
  baseline?: PerformanceBaseline;
  learningEnabled: boolean;
  userFeedback?: string[];
}

interface Decision {
  action: 'enable_learning' | 'disable_learning' | 'continue_monitoring' | 'escalate';
  confidence: number;
  reasoning: string[];
  report: AviReport;
}

async function makeAutonomousDecision(
  context: DecisionContext
): Promise<Decision> {
  const reasoning: string[] = [];
  let action: Decision['action'] = 'continue_monitoring';
  let confidence = 0.5;

  // Check if we should enable learning
  if (!context.learningEnabled) {
    const shouldEnable = await shouldEnableLearning(context.skillName);

    if (shouldEnable.enable) {
      action = 'enable_learning';
      confidence = 0.8;
      reasoning.push(shouldEnable.reason);
      reasoning.push(`Based on ${context.currentMetrics.executionCount} executions over 7 days`);
    } else {
      reasoning.push(shouldEnable.reason);
    }
  }

  // Check if we should disable learning
  if (context.learningEnabled && context.baseline) {
    const impact = await measureLearningImpact(context.skillName);
    const fpCheck = avoidFalsePositives(impact, {
      sampleSize: 50,
      statisticalPower: 0.8,
      multipleTestingCorrection: true,
      minimumEffectSize: 0.05
    });

    if (!fpCheck.reliable) {
      reasoning.push('Continuing monitoring - insufficient data for decision');
      reasoning.push(...fpCheck.warnings);
    } else if (impact.recommendation === 'disable') {
      action = 'disable_learning';
      confidence = 0.9;
      reasoning.push(impact.reasoning);
      reasoning.push(`Statistical significance: p=${impact.statisticalSignificance.pValues.successRate.toFixed(3)}`);
    } else if (impact.recommendation === 'keep') {
      action = 'continue_monitoring';
      confidence = 0.7;
      reasoning.push(impact.reasoning);
    }
  }

  // Check for critical issues requiring escalation
  if (context.currentMetrics.successRate < 0.50) {
    action = 'escalate';
    confidence = 0.95;
    reasoning.push('Critical: Success rate below 50% - requires immediate attention');
  }

  // Generate report for Avi
  const report = generateAviReport(
    context.skillName,
    context.currentMetrics,
    context.baseline ? await measureLearningImpact(context.skillName) : undefined
  );

  return {
    action,
    confidence,
    reasoning,
    report
  };
}
```

### Example Usage

```typescript
// Example: Autonomous monitoring loop
async function monitorSkills() {
  const skills = await getAllSkills();

  for (const skill of skills) {
    const metrics = await establishBaseline(skill.name, skill.version);
    const baseline = await getBaseline(skill.name);
    const learningEnabled = await isLearningEnabled(skill.name);

    const decision = await makeAutonomousDecision({
      skillName: skill.name,
      currentMetrics: metrics,
      baseline,
      learningEnabled
    });

    // Log decision
    console.log(`Decision for ${skill.name}:`, {
      action: decision.action,
      confidence: `${(decision.confidence * 100).toFixed(0)}%`,
      reasoning: decision.reasoning
    });

    // Execute decision if confidence is high
    if (decision.confidence >= 0.7) {
      await executeDecision(skill.name, decision);
    }

    // Report to Avi
    await notifyAvi(decision.report);
  }
}

async function executeDecision(skillName: string, decision: Decision) {
  switch (decision.action) {
    case 'enable_learning':
      await enableLearning(skillName);
      console.log(`✓ Learning enabled for ${skillName}`);
      break;

    case 'disable_learning':
      await disableLearning(skillName);
      console.log(`✓ Learning disabled for ${skillName}`);
      break;

    case 'escalate':
      await escalateToAvi(skillName, decision.report);
      console.log(`⚠ Escalated ${skillName} to Avi`);
      break;

    case 'continue_monitoring':
      console.log(`→ Continuing to monitor ${skillName}`);
      break;
  }
}
```

## Best Practices

1. **Always establish baseline before enabling learning**
2. **Wait for statistical significance before making decisions**
3. **Use multiple metrics, not just success rate**
4. **Apply multiple testing corrections when appropriate**
5. **Document all decisions with clear reasoning**
6. **Report to Avi in user-friendly language**
7. **Escalate critical issues immediately**
8. **Monitor continuously, decide conservatively**
9. **Validate that errors are learnable before enabling learning**
10. **Consider business context alongside statistical metrics**

## Summary

This skill enables the learning-optimizer-agent to make data-driven decisions about when to enable learning, how to measure its impact, and when to disable it. By following statistical best practices and avoiding false positives, you can optimize skill performance autonomously while keeping Avi informed.
