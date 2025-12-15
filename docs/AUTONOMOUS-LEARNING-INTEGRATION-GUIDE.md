# Autonomous Learning Service - Integration Guide

## Overview

The Autonomous Learning Service automatically monitors skill execution performance and enables learning when performance degrades. It provides statistical confidence in decisions and clear reporting to Avi.

## Quick Start

### 1. Initialize the Service

```typescript
import { createSAFLAService } from './services/safla-service';
import { createAutonomousLearningService } from './services/autonomous-learning-service';

// Initialize SAFLA (pattern storage)
const safla = createSAFLAService();

// Initialize autonomous learning
const learning = createAutonomousLearningService(safla, {
  autoEnableLearning: true,
  minExecutionsForAnalysis: 10,
  successRateThreshold: 0.70,
});
```

### 2. Record Skill Executions

Wrap skill executions to automatically record outcomes:

```typescript
async function executeSkill(skillName: string, agentId: string, params: any) {
  const startTime = Date.now();
  let outcome: 'success' | 'failure';
  let errorMessage: string | undefined;

  try {
    // Execute the skill
    const result = await actualSkillExecution(skillName, params);
    outcome = 'success';
    return result;
  } catch (error) {
    outcome = 'failure';
    errorMessage = error.message;
    throw error;
  } finally {
    // Record execution (async, non-blocking)
    learning.recordSkillExecution(skillName, agentId, outcome, {
      executionTimeMs: Date.now() - startTime,
      errorMessage,
      params,
    }).catch(err => {
      console.warn('Failed to record skill execution:', err);
    });
  }
}
```

### 3. Get Learning Recommendations for Avi

```typescript
async function getAviRecommendations() {
  const recommendations = await learning.getLearningRecommendations();

  for (const rec of recommendations) {
    console.log(`[${rec.priority.toUpperCase()}] ${rec.skillName}`);
    console.log(`Issue: ${rec.issue}`);
    console.log(`Recommendation: ${rec.recommendation}`);
    console.log(`Expected improvement: ${rec.expectedImprovement}`);
    console.log(`Time to improve: ${rec.estimatedTimeToImprove}`);
    console.log('---');
  }

  return recommendations;
}
```

### 4. Track Progress

```typescript
async function checkSkillProgress(skillName: string) {
  const progress = await learning.trackLearningProgress(skillName);

  // Generate human-readable report
  const report = learning.generateReportForAvi(skillName, progress);
  console.log(report);

  // Check recommendations
  if (progress.recommendDisable) {
    console.log(`✅ ${skillName} has improved - learning can be disabled`);
  } else if (progress.recommendContinue) {
    console.log(`🔄 ${skillName} still improving - continuing learning`);
  }

  return progress;
}
```

## Performance Detection Algorithms

### 1. Success Rate Threshold

Triggers learning when success rate < 70% over 10+ executions:

```typescript
if (metrics.successRate < 0.70 && metrics.totalExecutions >= 10) {
  // Enable learning
}
```

### 2. Variance Detection (Inconsistency)

Detects unstable performance by measuring daily success rate variance:

```typescript
// Calculate variance across daily success rates
const variance = calculateVariance(dailySuccessRates);

if (variance > 0.3) {
  // High variance = inconsistent = enable learning
}
```

### 3. Trend Analysis (Declining Performance)

Compares recent vs historical performance:

```typescript
const historical = successRate(firstHalfOfWindow);
const recent = successRate(secondHalfOfWindow);
const slope = recent - historical;

if (slope < -0.1) {
  // Performance declining = enable learning
}
```

### 4. Recent Error Rate Increase

Detects sudden spikes in errors:

```typescript
const recentErrorRate = errors(last7Days) / total(last7Days);
const overallErrorRate = errors(last30Days) / total(last30Days);

if (recentErrorRate > overallErrorRate * 1.2 && recentErrorRate > 0.2) {
  // Errors increasing = enable learning
}
```

## Statistical Confidence

Decisions require multiple indicators to avoid false positives:

```typescript
// Score each indicator (0-1)
let score = 0;
let reasons = [];

if (lowSuccessRate) { score += 0.25; reasons.push('low success rate'); }
if (highVariance) { score += 0.25; reasons.push('high variance'); }
if (declining) { score += 0.25; reasons.push('declining trend'); }
if (errorSpike) { score += 0.25; reasons.push('error spike'); }

// Require 2+ indicators AND confidence > 0.85
const confidence = score;
const shouldEnable = reasons.length >= 2 && confidence >= 0.85;
```

## Integration with Avi Coordination

### Automatic Workflow

1. **Continuous Monitoring**: Service monitors all skill executions
2. **Automatic Detection**: Analyzes performance every 6 hours
3. **Recommendation Creation**: Creates high-priority recommendations
4. **Avi Notification**: Avi receives recommendations in feed
5. **Progress Tracking**: Measures improvement over 14 days
6. **Auto-Disable**: Disables learning when performance is good (>80%)

### Avi Feed Integration

```typescript
// Post to Avi's coordination feed
async function postLearningUpdate(recommendation: LearningRecommendation) {
  const post = {
    type: 'learning_recommendation',
    priority: recommendation.priority,
    title: `Learning Enabled: ${recommendation.skillName}`,
    content: recommendation.recommendation,
    metadata: {
      skillName: recommendation.skillName,
      currentPerformance: recommendation.currentPerformance,
      expectedImprovement: recommendation.expectedImprovement,
      timeEstimate: recommendation.estimatedTimeToImprove,
    },
  };

  await postToAviFeed(post);
}
```

## Performance Measurement

### Before/After Comparison

```typescript
const progress = await learning.trackLearningProgress('skill-name');

console.log('Before Learning:');
console.log(`  Success Rate: ${(progress.before.successRate * 100).toFixed(1)}%`);
console.log(`  Variance: ${progress.before.variance.toFixed(3)}`);
console.log(`  Consistency: ${(progress.before.consistencyScore * 100).toFixed(1)}%`);

console.log('\nAfter Learning:');
console.log(`  Success Rate: ${(progress.after.successRate * 100).toFixed(1)}%`);
console.log(`  Variance: ${progress.after.variance.toFixed(3)}`);
console.log(`  Consistency: ${(progress.after.consistencyScore * 100).toFixed(1)}%`);

console.log('\nImprovements:');
console.log(`  Success Rate: +${(progress.improvements.successRateImprovement * 100).toFixed(1)}%`);
console.log(`  Variance Reduction: ${progress.improvements.varianceReduction.toFixed(3)}`);
console.log(`  Overall: +${(progress.improvements.overallImprovement * 100).toFixed(1)}%`);
```

## Example Avi Reports

### Improving Skill

```
I noticed meeting-prep-skill had 65% accuracy, so I enabled learning.
After 12 days, accuracy improved to 85% (+20%). 47 successful patterns
learned. Performance is now good - learning can be disabled.
```

### Stable but Suboptimal

```
content-generation-skill learning enabled 8 days ago. Performance stable
at 75% (started at 70%). 23 patterns learned. Continuing learning to
reach 80% threshold.
```

### Degrading (Warning)

```
Warning: api-integration-skill performance degrading despite learning.
Started at 80%, now at 65% (-15%). Investigating root cause - may be
external API changes requiring different approach.
```

## API Reference

### Core Methods

#### `recordSkillExecution(skillName, agentId, outcome, context)`

Records a skill execution for performance tracking.

- **Performance**: <1ms overhead
- **Async**: Non-blocking
- **Returns**: Promise<void>

#### `analyzeSkillPerformance(skillName, timeWindowDays?)`

Analyzes skill performance and determines if learning should be enabled.

- **Performance**: <50ms
- **Returns**: Promise<PerformanceAnalysis>

#### `checkAndEnableLearning(skillName)`

Checks performance and automatically enables learning if needed.

- **Auto-enable**: Respects `autoEnableLearning` config
- **Returns**: Promise<LearningDecision>

#### `getLearningRecommendations()`

Gets prioritized list of learning recommendations for Avi.

- **Limit**: 20 most important
- **Returns**: Promise<LearningRecommendation[]>

#### `trackLearningProgress(skillName)`

Measures improvement since learning was enabled.

- **Comparison**: Before vs after metrics
- **Auto-disable**: Disables if performance good
- **Returns**: Promise<ProgressReport>

#### `generateReportForAvi(skillName, progress)`

Generates human-readable progress report.

- **Format**: Natural language
- **Includes**: Percentages, improvements, recommendations
- **Returns**: string

## Configuration Options

```typescript
interface AutonomousLearningConfig {
  // Performance thresholds
  minExecutionsForAnalysis: 10,      // Min data points needed
  successRateThreshold: 0.70,        // 70% success rate threshold
  varianceThreshold: 0.3,             // Max acceptable variance
  trendThreshold: -0.1,               // -10% trend = declining

  // Time windows
  analysisWindowDays: 30,             // Full analysis window
  recentWindowDays: 7,                // Recent performance window

  // Learning control
  autoEnableLearning: true,           // Auto-enable when detected
  confidenceRequirement: 0.85,        // 85% confidence needed

  // Improvement measurement
  improvementCheckDays: 14,           // Check progress after 2 weeks
  minImprovementToDisable: 0.1,       // 10% improvement = success
  goodPerformanceThreshold: 0.80,     // 80% = good enough
}
```

## Database Schema

### skill_executions

Stores all skill execution records:

```sql
CREATE TABLE skill_executions (
  id TEXT PRIMARY KEY,
  skill_name TEXT NOT NULL,
  skill_id TEXT,
  agent_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('success', 'failure')),
  execution_time_ms INTEGER,
  error_message TEXT,
  context TEXT,
  timestamp INTEGER NOT NULL
);
```

### learning_status

Tracks learning state per skill:

```sql
CREATE TABLE learning_status (
  skill_name TEXT PRIMARY KEY,
  learning_enabled INTEGER NOT NULL DEFAULT 0,
  enabled_at INTEGER,
  disabled_at INTEGER,
  reason TEXT,
  performance_before TEXT,
  performance_after TEXT,
  last_check INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### learning_recommendations

Stores recommendations for Avi:

```sql
CREATE TABLE learning_recommendations (
  id TEXT PRIMARY KEY,
  skill_name TEXT NOT NULL,
  priority TEXT NOT NULL,
  issue TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  current_performance TEXT NOT NULL,
  expected_improvement TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  acknowledged INTEGER DEFAULT 0
);
```

## Testing

Run the test suite:

```bash
npm test tests/unit/autonomous-learning-service.test.ts
```

Tests cover:
- Skill execution recording (<1ms overhead)
- Performance analysis (<50ms latency)
- Learning decisions (statistical confidence)
- Progress tracking (before/after comparison)
- Avi reporting (human-readable)
- Edge cases (no data, all success, all failure)

## Monitoring

Check overall statistics:

```typescript
const stats = learning.getOverallStats();

console.log(`Total skills monitored: ${stats.totalSkills}`);
console.log(`Skills with learning enabled: ${stats.learningEnabled}`);
console.log(`Average success rate: ${(stats.avgSuccessRate * 100).toFixed(1)}%`);
console.log(`Total executions tracked: ${stats.totalExecutions}`);
```

## Best Practices

1. **Always record executions** - Wrap all skill calls with recording
2. **Check recommendations daily** - Integrate into Avi's morning routine
3. **Track progress weekly** - Review learning improvements every 7 days
4. **Trust the statistics** - High confidence threshold prevents false positives
5. **Monitor overhead** - Should be <1% performance impact
6. **Review auto-disabled skills** - Verify improvements were real

## Troubleshooting

### Learning not triggering

- Check execution count (need 10+)
- Verify success rate is actually low (<70%)
- Review confidence requirement (may be too high)

### False positives

- Increase `confidenceRequirement` to 0.90
- Increase `minExecutionsForAnalysis` to 20
- Adjust thresholds for your use case

### Performance degrading after learning

- Check for external factors (API changes, data quality)
- Review learned patterns in ReasoningBank
- May need manual intervention

## Future Enhancements

- Pattern quality scoring
- Multi-skill correlation detection
- Automatic A/B testing
- Learning velocity optimization
- Cross-agent pattern sharing recommendations
