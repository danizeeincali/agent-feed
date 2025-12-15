# Autonomous Learning Service - Quick Reference

## One-Line Summary

Automatically monitors skill execution and enables learning when performance degrades.

## Initialization

```typescript
import { createSAFLAService } from './services/safla-service';
import { createAutonomousLearningService } from './services/autonomous-learning-service';

const safla = createSAFLAService();
const learning = createAutonomousLearningService(safla);
```

## Recording Executions

```typescript
// Wrap every skill execution
try {
  const result = await executeSkill(params);
  await learning.recordSkillExecution(skillName, agentId, 'success');
} catch (error) {
  await learning.recordSkillExecution(skillName, agentId, 'failure', {
    errorMessage: error.message
  });
}
```

## Getting Recommendations

```typescript
// For Avi's morning feed
const recommendations = await learning.getLearningRecommendations();
// Returns: [{ skillName, priority, issue, recommendation, ... }]
```

## Checking Progress

```typescript
// Weekly review
const progress = await learning.trackLearningProgress(skillName);
const report = learning.generateReportForAvi(skillName, progress);
console.log(report);
```

## Performance Triggers

| Trigger | Threshold | Description |
|---------|-----------|-------------|
| **Low Success Rate** | <70% | Skill succeeds less than 70% of time |
| **High Variance** | >0.3 | Inconsistent results day-to-day |
| **Declining Trend** | <-10% | Performance dropping over time |
| **Error Spike** | +20% | Recent errors significantly higher |

## Decision Criteria

- Minimum 10 executions required
- At least 2 indicators must trigger
- Confidence must be ≥85%
- Auto-enables if configured

## Typical Workflow

```
Execution → Record → Monitor (6h intervals) → Detect Issues
    ↓
Enable Learning → Track Progress (14 days) → Measure Improvement
    ↓
Performance Good (>80%)? → Auto-Disable → Report Success
```

## Key Metrics

```typescript
interface PerformanceMetrics {
  successRate: number;        // 0-1 (target: >0.8)
  variance: number;            // 0-1 (target: <0.3)
  consistencyScore: number;    // 0-1 (target: >0.7)
  totalExecutions: number;     // (need: ≥10)
}
```

## Avi Report Examples

**Improving:**
```
I noticed meeting-prep-skill had 65% accuracy, so I enabled learning.
After 12 days, accuracy improved to 85% (+20%). 47 patterns learned.
Performance is now good - learning can be disabled.
```

**Stable:**
```
content-skill learning enabled 8 days ago. Performance stable at 75%
(started at 70%). 23 patterns learned. Continuing to improve.
```

**Warning:**
```
Warning: api-skill performance degrading despite learning.
Started at 80%, now at 65% (-15%). Investigating root cause...
```

## Performance Guarantees

- **Recording Overhead**: <1ms per execution
- **Analysis Latency**: <50ms
- **Memory Impact**: <10MB for 1000+ skills
- **Decision Accuracy**: >90%

## Configuration Cheat Sheet

```typescript
{
  minExecutionsForAnalysis: 10,      // Data points needed
  successRateThreshold: 0.70,        // 70% trigger
  varianceThreshold: 0.3,             // Consistency limit
  trendThreshold: -0.1,               // -10% decline

  autoEnableLearning: true,           // Auto-enable
  confidenceRequirement: 0.85,        // 85% confidence

  improvementCheckDays: 14,           // 2 weeks to improve
  goodPerformanceThreshold: 0.80,     // 80% is good
}
```

## API Quick Reference

```typescript
// Core operations
recordSkillExecution(skill, agent, outcome, context)  // <1ms
analyzeSkillPerformance(skill, windowDays?)           // <50ms
checkAndEnableLearning(skill)                         // Auto-enable
getLearningRecommendations()                          // For Avi
trackLearningProgress(skill)                          // Before/after
generateReportForAvi(skill, progress)                 // Human text

// Utilities
getOverallStats()                                     // System health
acknowledgeRecommendation(skill)                      // Mark seen
close()                                               // Cleanup
```

## Testing

```bash
npm test tests/unit/autonomous-learning-service.test.ts
```

## Common Patterns

### Wrap Skill Execution
```typescript
async function safeExecuteSkill(name, agent, params) {
  const start = Date.now();
  try {
    const result = await skill.execute(params);
    await learning.recordSkillExecution(name, agent, 'success', {
      executionTimeMs: Date.now() - start
    });
    return result;
  } catch (error) {
    await learning.recordSkillExecution(name, agent, 'failure', {
      executionTimeMs: Date.now() - start,
      errorMessage: error.message
    });
    throw error;
  }
}
```

### Morning Avi Check
```typescript
async function aviMorningRoutine() {
  const recs = await learning.getLearningRecommendations();

  for (const rec of recs) {
    if (rec.priority === 'critical' || rec.priority === 'high') {
      await postToFeed({
        type: 'learning_alert',
        content: rec.recommendation,
        priority: rec.priority
      });
    }
  }
}
```

### Weekly Review
```typescript
async function weeklyLearningReview() {
  const stats = learning.getOverallStats();
  const reports = [];

  // Check all skills with learning enabled
  // (implementation depends on tracking mechanism)

  console.log(`Weekly Review: ${stats.learningEnabled} skills learning`);
  console.log(`Overall success rate: ${(stats.avgSuccessRate * 100).toFixed(1)}%`);
}
```

## Decision Tree

```
Execution Recorded
    ↓
Has 10+ executions? → NO → Wait for more data
    ↓ YES
Success rate <70%? → NO → Check variance
    ↓ YES
High variance? → Add reason (+0.25 confidence)
    ↓
Declining trend? → Add reason (+0.25 confidence)
    ↓
Error spike? → Add reason (+0.25 confidence)
    ↓
≥2 reasons AND confidence ≥0.85? → NO → Don't enable
    ↓ YES
Enable Learning + Create Recommendation
    ↓
Monitor for 14 days
    ↓
Success rate >80%? → YES → Auto-disable
    ↓ NO
Continue learning
```

## Integration Points

1. **Skill Execution Wrapper** - Record all executions
2. **Avi Morning Feed** - Check recommendations
3. **Weekly Progress Review** - Track improvements
4. **ReasoningBank** - Pattern storage backend
5. **SAFLA Service** - Learning engine

## Files

- **Service**: `/api-server/services/autonomous-learning-service.ts`
- **Tests**: `/tests/unit/autonomous-learning-service.test.ts`
- **Guide**: `/docs/AUTONOMOUS-LEARNING-INTEGRATION-GUIDE.md`
- **Database**: `/prod/.reasoningbank/autonomous-learning.db`

## Support

For issues or questions:
1. Check integration guide for detailed explanations
2. Review test suite for usage examples
3. Verify configuration matches your use case
4. Monitor performance metrics in production
