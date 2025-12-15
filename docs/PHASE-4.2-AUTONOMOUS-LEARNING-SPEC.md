# Phase 4.2 Autonomous Learning System - Complete Specification

**Date**: October 18, 2025
**Methodology**: SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)
**Status**: SPECIFICATION COMPLETE
**Version**: 1.0.0

---

## Executive Summary

Phase 4.2 introduces an **autonomous learning system** where agents self-initiate learning based on performance patterns, eliminating user intervention requirements. The system monitors skill execution outcomes, identifies struggling skills (<70% success rate), and autonomously enables ReasoningBank SAFLA learning to improve performance.

**Key Innovation**: Learning is **agent-initiated, not user-initiated**. Agents autonomously decide when to enable learning based on performance metrics, report improvements to Avi, and maintain optimal skill performance across the ecosystem.

---

## Table of Contents

1. [Autonomous Learning System](#1-autonomous-learning-system)
2. [Learning Trigger Algorithms](#2-learning-trigger-algorithms)
3. [Performance Monitoring](#3-performance-monitoring)
4. [Learning Cycle Workflow](#4-learning-cycle-workflow)
5. [Reporting and Feedback](#5-reporting-and-feedback)
6. [Integration Architecture](#6-integration-architecture)
7. [Data Models](#7-data-models)
8. [Implementation Requirements](#8-implementation-requirements)
9. [Testing Strategy](#9-testing-strategy)

---

## 1. Autonomous Learning System

### 1.1 Core Principles

**Autonomous Decision-Making**:
- Agents monitor their own performance metrics
- Agents detect patterns indicating learning needs
- Agents enable learning without user intervention
- Agents report improvements proactively

**Zero User Intervention**:
- No manual learning triggers required
- No user configuration for learning thresholds
- No manual performance analysis needed
- Fully automated learning lifecycle

**Continuous Improvement**:
- Learning happens in background during normal operations
- Performance improvements compound over time
- Agents become more effective with experience
- Learning outcomes persist across sessions

### 1.2 Learning-Enabled Skills (Phase 4.1 Foundation)

From Phase 4.1 ReasoningBank SAFLA implementation:

1. **task-management** - Task prioritization and dependency tracking
2. **productivity-patterns** - Workflow optimization and time management
3. **meeting-templates** - Meeting structure and facilitation
4. **agenda-frameworks** - Agenda design and time allocation
5. **note-taking** - Note capture and action item tracking
6. **user-preferences** - Preference management and personalization
7. **goal-frameworks** - Goal setting and achievement tracking

### 1.3 Learning Optimizer Agent Role

**Primary Responsibility**: Autonomous learning orchestration

**Key Functions**:
- Monitor skill execution outcomes across all agents
- Analyze performance patterns and trends
- Detect skills requiring learning intervention
- Enable ReasoningBank SAFLA for struggling skills
- Track learning progress and improvements
- Report outcomes to Avi for user visibility
- Manage ReasoningBank pattern quality

**Operational Mode**: Background daemon running continuously

---

## 2. Learning Trigger Algorithms

### 2.1 Performance Detection Algorithm

**Input**: Skill execution outcome data stream

**Algorithm**:
```typescript
interface SkillOutcome {
  skillName: string;
  agentId: string;
  timestamp: Date;
  success: boolean;
  executionTime: number;
  errorType?: string;
  context: Record<string, unknown>;
}

class PerformanceTriggerAlgorithm {
  /**
   * Analyze skill performance and determine if learning should be enabled
   *
   * Triggers:
   * 1. Success rate < 70% over last 20 executions
   * 2. Error pattern detected (same error 3+ times)
   * 3. Performance degradation (success rate dropped >15% week-over-week)
   * 4. Context-specific failure (100% failure in specific context)
   */
  async shouldEnableLearning(
    skillName: string,
    agentId: string
  ): Promise<{
    shouldEnable: boolean;
    reason: string;
    confidence: number;
    metrics: PerformanceMetrics;
  }> {
    const outcomes = await this.getRecentOutcomes(skillName, agentId, 20);

    // Trigger 1: Success Rate Check
    const successRate = this.calculateSuccessRate(outcomes);
    if (successRate < 0.70) {
      return {
        shouldEnable: true,
        reason: `Low success rate: ${(successRate * 100).toFixed(1)}% (threshold: 70%)`,
        confidence: 1.0 - (successRate / 0.70), // Higher confidence for lower success rates
        metrics: this.calculateMetrics(outcomes)
      };
    }

    // Trigger 2: Error Pattern Detection
    const errorPattern = this.detectErrorPattern(outcomes);
    if (errorPattern.repeatedErrors >= 3) {
      return {
        shouldEnable: true,
        reason: `Repeated error pattern: ${errorPattern.errorType} (${errorPattern.repeatedErrors} occurrences)`,
        confidence: 0.85,
        metrics: this.calculateMetrics(outcomes)
      };
    }

    // Trigger 3: Performance Degradation
    const weekOverWeek = await this.compareWeekOverWeek(skillName, agentId);
    if (weekOverWeek.degradation > 0.15) {
      return {
        shouldEnable: true,
        reason: `Performance degradation: ${(weekOverWeek.degradation * 100).toFixed(1)}% drop week-over-week`,
        confidence: 0.75,
        metrics: this.calculateMetrics(outcomes)
      };
    }

    // Trigger 4: Context-Specific Failure
    const contextFailure = this.detectContextFailure(outcomes);
    if (contextFailure.failureRate === 1.0 && contextFailure.sampleSize >= 5) {
      return {
        shouldEnable: true,
        reason: `Context-specific failure: 100% failure in context "${contextFailure.context}"`,
        confidence: 0.90,
        metrics: this.calculateMetrics(outcomes)
      };
    }

    return {
      shouldEnable: false,
      reason: 'Performance within acceptable range',
      confidence: 1.0,
      metrics: this.calculateMetrics(outcomes)
    };
  }

  private calculateSuccessRate(outcomes: SkillOutcome[]): number {
    if (outcomes.length === 0) return 1.0;
    const successes = outcomes.filter(o => o.success).length;
    return successes / outcomes.length;
  }

  private detectErrorPattern(outcomes: SkillOutcome[]): {
    errorType: string | null;
    repeatedErrors: number;
  } {
    const errorCounts = new Map<string, number>();

    outcomes
      .filter(o => !o.success && o.errorType)
      .forEach(o => {
        const count = errorCounts.get(o.errorType!) || 0;
        errorCounts.set(o.errorType!, count + 1);
      });

    let maxError: string | null = null;
    let maxCount = 0;

    errorCounts.forEach((count, errorType) => {
      if (count > maxCount) {
        maxCount = count;
        maxError = errorType;
      }
    });

    return { errorType: maxError, repeatedErrors: maxCount };
  }

  private async compareWeekOverWeek(
    skillName: string,
    agentId: string
  ): Promise<{
    degradation: number;
    thisWeek: number;
    lastWeek: number;
  }> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekOutcomes = await this.getOutcomesBetween(skillName, agentId, oneWeekAgo, now);
    const lastWeekOutcomes = await this.getOutcomesBetween(skillName, agentId, twoWeeksAgo, oneWeekAgo);

    const thisWeekRate = this.calculateSuccessRate(thisWeekOutcomes);
    const lastWeekRate = this.calculateSuccessRate(lastWeekOutcomes);

    const degradation = Math.max(0, lastWeekRate - thisWeekRate);

    return {
      degradation,
      thisWeek: thisWeekRate,
      lastWeek: lastWeekRate
    };
  }

  private detectContextFailure(outcomes: SkillOutcome[]): {
    context: string;
    failureRate: number;
    sampleSize: number;
  } {
    // Group outcomes by context
    const contextGroups = new Map<string, SkillOutcome[]>();

    outcomes.forEach(outcome => {
      const contextKey = JSON.stringify(outcome.context);
      const group = contextGroups.get(contextKey) || [];
      group.push(outcome);
      contextGroups.set(contextKey, group);
    });

    // Find context with 100% failure rate
    let worstContext = '';
    let worstRate = 0;
    let worstSize = 0;

    contextGroups.forEach((group, contextKey) => {
      const failureRate = 1 - this.calculateSuccessRate(group);
      if (failureRate === 1.0 && group.length >= 5) {
        if (group.length > worstSize) {
          worstContext = contextKey;
          worstRate = failureRate;
          worstSize = group.length;
        }
      }
    });

    return {
      context: worstContext,
      failureRate: worstRate,
      sampleSize: worstSize
    };
  }
}
```

### 2.2 Learning Enablement Algorithm

**Input**: Skill requiring learning intervention

**Algorithm**:
```typescript
class LearningEnablementAlgorithm {
  /**
   * Enable ReasoningBank SAFLA learning for a specific skill
   *
   * Steps:
   * 1. Verify skill supports learning (has ReasoningBank integration)
   * 2. Check if learning already enabled (prevent duplicates)
   * 3. Enable ReasoningBank SAFLA
   * 4. Set learning parameters based on performance metrics
   * 5. Initialize learning session tracking
   * 6. Schedule progress checkpoints
   */
  async enableLearning(
    skillName: string,
    agentId: string,
    metrics: PerformanceMetrics,
    reason: string
  ): Promise<LearningSession> {
    // 1. Verify skill supports learning
    const skill = await this.getSkill(skillName);
    if (!skill.supportsLearning) {
      throw new Error(`Skill ${skillName} does not support learning`);
    }

    // 2. Check if learning already enabled
    const existingSession = await this.getActiveLearningSession(skillName, agentId);
    if (existingSession) {
      return existingSession; // Already learning
    }

    // 3. Enable ReasoningBank SAFLA
    const reasoningBankConfig = this.configureLearningParameters(metrics);
    await this.enableReasoningBank(skillName, agentId, reasoningBankConfig);

    // 4. Initialize learning session
    const session: LearningSession = {
      id: generateUUID(),
      skillName,
      agentId,
      startedAt: new Date(),
      reason,
      initialMetrics: metrics,
      currentMetrics: metrics,
      checkpoints: [],
      status: 'active',
      config: reasoningBankConfig
    };

    await this.saveLearningSession(session);

    // 5. Schedule progress checkpoints
    await this.scheduleCheckpoints(session.id, [
      { after: 10, label: 'Initial progress check' },
      { after: 25, label: 'Mid-learning checkpoint' },
      { after: 50, label: 'Learning effectiveness review' }
    ]);

    // 6. Log learning enablement
    await this.logLearningEvent({
      type: 'LEARNING_ENABLED',
      sessionId: session.id,
      skillName,
      agentId,
      reason,
      metrics
    });

    return session;
  }

  private configureLearningParameters(metrics: PerformanceMetrics): ReasoningBankConfig {
    // Adjust learning aggressiveness based on performance
    const successRate = metrics.successRate;

    return {
      samplingRate: successRate < 0.5 ? 1.0 : 0.5, // Higher sampling for worse performance
      minSampleSize: 20,
      confidenceThreshold: 0.75,
      adaptiveThreshold: true,
      pruningEnabled: true,
      pruningThreshold: 0.6
    };
  }
}
```

### 2.3 Progress Monitoring Algorithm

**Input**: Active learning session

**Algorithm**:
```typescript
class ProgressMonitoringAlgorithm {
  /**
   * Monitor learning progress and determine if learning should continue
   *
   * Checkpoints:
   * - After 10 executions: Initial progress check
   * - After 25 executions: Mid-learning checkpoint
   * - After 50 executions: Learning effectiveness review
   *
   * Success Criteria:
   * - Success rate improved by >10%
   * - Success rate now >75%
   * - No regression in last 10 executions
   */
  async evaluateProgress(sessionId: string): Promise<{
    shouldContinue: boolean;
    action: 'continue' | 'graduate' | 'adjust' | 'abort';
    reason: string;
    improvement: number;
  }> {
    const session = await this.getLearningSession(sessionId);
    const currentMetrics = await this.getCurrentMetrics(session.skillName, session.agentId);

    const improvement = currentMetrics.successRate - session.initialMetrics.successRate;

    // Success: Graduated from learning
    if (currentMetrics.successRate > 0.75 && improvement > 0.10) {
      return {
        shouldContinue: false,
        action: 'graduate',
        reason: `Skill performance improved from ${(session.initialMetrics.successRate * 100).toFixed(1)}% to ${(currentMetrics.successRate * 100).toFixed(1)}%`,
        improvement
      };
    }

    // Stagnation: Adjust learning parameters
    if (improvement < 0.05 && session.checkpoints.length >= 2) {
      return {
        shouldContinue: true,
        action: 'adjust',
        reason: 'Learning progress stagnated, adjusting parameters',
        improvement
      };
    }

    // Regression: Abort learning
    const recentOutcomes = await this.getRecentOutcomes(session.skillName, session.agentId, 10);
    const recentRate = this.calculateSuccessRate(recentOutcomes);
    if (recentRate < session.initialMetrics.successRate) {
      return {
        shouldContinue: false,
        action: 'abort',
        reason: 'Learning causing regression, reverting to baseline',
        improvement
      };
    }

    // Continue: Learning in progress
    return {
      shouldContinue: true,
      action: 'continue',
      reason: `Learning in progress, improvement: ${(improvement * 100).toFixed(1)}%`,
      improvement
    };
  }
}
```

---

## 3. Performance Monitoring

### 3.1 Metrics Collection

**Real-Time Metrics**:
```typescript
interface PerformanceMetrics {
  skillName: string;
  agentId: string;
  period: DateRange;

  // Success metrics
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;

  // Error analysis
  errorTypes: Record<string, number>;
  mostCommonError: string | null;
  errorRate: number;

  // Performance trends
  weekOverWeekChange: number;
  monthOverMonthChange: number;
  trendDirection: 'improving' | 'stable' | 'degrading';

  // Execution patterns
  averageExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;

  // Context analysis
  contextPerformance: Record<string, {
    executions: number;
    successRate: number;
  }>;
}
```

### 3.2 Data Collection Points

**Skill Execution Instrumentation**:
```typescript
// Every skill execution is instrumented
async function executeSkillWithMonitoring(
  skillName: string,
  agentId: string,
  context: Record<string, unknown>
): Promise<SkillExecutionResult> {
  const startTime = Date.now();
  let outcome: SkillOutcome;

  try {
    const result = await executeSkill(skillName, context);

    outcome = {
      skillName,
      agentId,
      timestamp: new Date(),
      success: true,
      executionTime: Date.now() - startTime,
      context
    };

    return result;
  } catch (error) {
    outcome = {
      skillName,
      agentId,
      timestamp: new Date(),
      success: false,
      executionTime: Date.now() - startTime,
      errorType: error.constructor.name,
      context
    };

    throw error;
  } finally {
    // Send outcome to monitoring service
    await performanceMonitoringService.recordOutcome(outcome);
  }
}
```

### 3.3 Performance Dashboards

**Learning Optimizer Dashboard**:
- Active learning sessions
- Skills under learning
- Recent improvements
- Performance trends
- Learning effectiveness metrics

**Avi Strategic Dashboard**:
- Overall system performance
- Agent efficiency metrics
- Skill utilization patterns
- Learning ROI analysis

---

## 4. Learning Cycle Workflow

### 4.1 Complete Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Normal Operation                                   │
│ - Skills execute normally                                   │
│ - Outcomes recorded automatically                           │
│ - Performance metrics updated in real-time                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Performance Detection                              │
│ - Learning optimizer monitors metrics                       │
│ - Detects pattern: Success rate < 70%                       │
│ - Confidence: 0.85 (high confidence)                        │
│ - Reason: "task-management failing on dependency tracking"  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Autonomous Learning Enablement                     │
│ - Learning optimizer enables ReasoningBank SAFLA            │
│ - No user intervention required                             │
│ - Learning session created and tracked                      │
│ - Checkpoints scheduled (10, 25, 50 executions)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Learning in Progress                               │
│ - Skill executes with ReasoningBank enabled                 │
│ - Patterns captured and refined                             │
│ - Progress monitored at checkpoints                         │
│ - Adjustments made if needed                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 5: Improvement Detection                              │
│ - Success rate improved: 55% → 82%                          │
│ - Improvement: +27% (exceeds 10% threshold)                 │
│ - Learning optimizer validates improvement                  │
│ - Graduation criteria met                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 6: Graduation and Reporting                           │
│ - Learning session marked complete                          │
│ - ReasoningBank patterns preserved                          │
│ - Report sent to Avi                                        │
│ - Avi posts outcome to user:                                │
│   "I improved task-management dependency tracking           │
│    from 55% to 82% success rate through autonomous          │
│    learning. The skill now handles complex dependencies     │
│    more reliably."                                          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Edge Cases

**Case 1: Learning Stagnation**
- **Detection**: No improvement after 25 executions
- **Action**: Adjust learning parameters (increase sampling rate)
- **Fallback**: If still no improvement after 50, abort and report

**Case 2: Learning Regression**
- **Detection**: Performance worse than baseline
- **Action**: Immediately abort learning, revert to baseline
- **Analysis**: Analyze what went wrong, prevent future regression

**Case 3: Multiple Skills Struggling**
- **Detection**: >3 skills below threshold simultaneously
- **Action**: Prioritize by impact (most-used skills first)
- **Escalation**: Report to Avi for strategic analysis

**Case 4: Rapid Improvement**
- **Detection**: Success rate jumps >20% in <10 executions
- **Action**: Early graduation, preserve patterns immediately
- **Validation**: Monitor for regression over next 20 executions

---

## 5. Reporting and Feedback

### 5.1 Avi Reporting Format

**Learning Initiated**:
```typescript
{
  type: 'LEARNING_INITIATED',
  agentId: 'learning-optimizer-agent',
  title: 'Autonomous Learning Activated',
  hook: 'Detected performance degradation in task-management skill',
  contentBody: `
    • Skill: task-management (dependency tracking)
    • Current success rate: 55% (threshold: 70%)
    • Pattern: Repeated failures on multi-level dependencies
    • Action: Enabled autonomous learning via ReasoningBank SAFLA
    • Expected improvement: +20-30% success rate
    • Learning duration: 50-100 executions (~2-3 days)
  `,
  metadata: {
    skillName: 'task-management',
    successRate: 0.55,
    learningSessionId: 'uuid'
  }
}
```

**Learning Progress Update**:
```typescript
{
  type: 'LEARNING_PROGRESS',
  agentId: 'learning-optimizer-agent',
  title: 'Learning Progress: task-management',
  hook: 'Mid-learning checkpoint reached with positive improvement',
  contentBody: `
    • Executions completed: 25/50
    • Success rate: 55% → 68% (+13%)
    • Improvement trend: Positive
    • Patterns captured: 8 new reasoning paths
    • Confidence: High (0.82)
    • Status: Continuing to target 75%+
  `,
  metadata: {
    checkpoint: 'mid-learning',
    improvement: 0.13
  }
}
```

**Learning Graduated**:
```typescript
{
  type: 'LEARNING_COMPLETE',
  agentId: 'learning-optimizer-agent',
  title: 'Learning Successful: task-management Enhanced',
  hook: 'Skill performance improved from 55% to 82% through autonomous learning',
  contentBody: `
    • Skill: task-management (dependency tracking)
    • Initial performance: 55% success rate
    • Final performance: 82% success rate
    • Improvement: +27% (+49% relative improvement)
    • Learning duration: 47 executions over 3 days
    • Patterns learned: 12 new reasoning paths
    • Key improvements:
      - Multi-level dependency resolution
      - Circular dependency detection
      - Priority propagation across dependencies
    • Impact: Improved task coordination for all agents using this skill
  `,
  metadata: {
    initialRate: 0.55,
    finalRate: 0.82,
    improvement: 0.27,
    duration: '3 days'
  }
}
```

### 5.2 User-Facing Communication

**Principles**:
- Lead with outcomes ("I improved X from Y to Z")
- Explain business impact (reliability, accuracy, speed)
- Keep technical details minimal
- Emphasize autonomous nature ("I detected and fixed this automatically")
- Build trust through transparency

**Example User Message**:
> "I improved task-management dependency tracking from 55% to 82% success rate through autonomous learning. The skill now handles complex multi-level dependencies more reliably, which means better task coordination across all your projects. This learning happened automatically in the background over 3 days."

---

## 6. Integration Architecture

### 6.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│ User Layer                                                   │
│ - Receives learning outcome reports via Avi posts           │
│ - No configuration or intervention required                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Avi Coordination Layer                                      │
│ - Receives learning reports from optimizer                  │
│ - Posts outcomes to user feed                               │
│ - Provides strategic oversight                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Learning Optimizer Agent                                    │
│ - Monitors skill performance continuously                   │
│ - Detects learning opportunities                            │
│ - Enables/disables ReasoningBank SAFLA                      │
│ - Tracks learning sessions                                  │
│ - Reports outcomes to Avi                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Performance Monitoring Service                              │
│ - Collects skill execution outcomes                         │
│ - Calculates performance metrics                            │
│ - Stores historical data                                    │
│ - Provides query interface                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ ReasoningBank SAFLA (Phase 4.1)                             │
│ - Pattern storage and retrieval                             │
│ - Learning from execution traces                            │
│ - Pattern quality scoring                                   │
│ - Adaptive pattern selection                                │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Data Flow

```
Skill Execution
    ↓
Outcome Recorded → Performance Monitoring Service
    ↓
Metrics Calculated
    ↓
Learning Optimizer Agent (polls every 5 minutes)
    ↓
Trigger Algorithm Evaluation
    ↓
[If threshold met]
    ↓
Enable ReasoningBank SAFLA
    ↓
Learning Session Created
    ↓
Progress Monitoring (checkpoints)
    ↓
[Graduation criteria met]
    ↓
Report to Avi
    ↓
Avi Posts to User Feed
```

---

## 7. Data Models

### 7.1 Skill Outcome
```typescript
interface SkillOutcome {
  id: string;
  skillName: string;
  agentId: string;
  timestamp: Date;
  success: boolean;
  executionTime: number;
  errorType?: string;
  errorMessage?: string;
  context: Record<string, unknown>;
  learningEnabled: boolean;
  sessionId?: string;
}
```

### 7.2 Learning Session
```typescript
interface LearningSession {
  id: string;
  skillName: string;
  agentId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'active' | 'graduated' | 'aborted' | 'adjusted';
  reason: string;

  initialMetrics: PerformanceMetrics;
  currentMetrics: PerformanceMetrics;
  finalMetrics?: PerformanceMetrics;

  checkpoints: LearningCheckpoint[];
  config: ReasoningBankConfig;

  improvement?: number;
  graduationReason?: string;
}
```

### 7.3 Learning Checkpoint
```typescript
interface LearningCheckpoint {
  executionCount: number;
  timestamp: Date;
  metrics: PerformanceMetrics;
  decision: 'continue' | 'adjust' | 'graduate' | 'abort';
  reason: string;
  adjustment?: ReasoningBankConfig;
}
```

### 7.4 Performance Metrics
```typescript
interface PerformanceMetrics {
  skillName: string;
  agentId: string;
  period: DateRange;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  errorTypes: Record<string, number>;
  mostCommonError: string | null;
  weekOverWeekChange: number;
  trendDirection: 'improving' | 'stable' | 'degrading';
}
```

---

## 8. Implementation Requirements

### 8.1 Services

**Autonomous Learning Service** (`/api-server/services/autonomous-learning-service.ts`):
- Trigger algorithm implementation
- Learning enablement logic
- Progress monitoring
- Session management
- Avi reporting integration

**Performance Monitoring Service** (`/api-server/services/performance-monitoring-service.ts`):
- Outcome collection
- Metrics calculation
- Historical data storage
- Query interface
- Real-time dashboards

### 8.2 Database Schema

```sql
-- Skill outcomes table
CREATE TABLE skill_outcomes (
  id UUID PRIMARY KEY,
  skill_name VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  success BOOLEAN NOT NULL,
  execution_time INTEGER NOT NULL,
  error_type VARCHAR(255),
  error_message TEXT,
  context JSONB,
  learning_enabled BOOLEAN DEFAULT false,
  session_id UUID REFERENCES learning_sessions(id),

  INDEX idx_skill_agent (skill_name, agent_id),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_session (session_id)
);

-- Learning sessions table
CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY,
  skill_name VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  initial_metrics JSONB NOT NULL,
  current_metrics JSONB NOT NULL,
  final_metrics JSONB,
  checkpoints JSONB[],
  config JSONB NOT NULL,
  improvement NUMERIC(5,4),
  graduation_reason TEXT,

  INDEX idx_status (status),
  INDEX idx_skill (skill_name),
  INDEX idx_agent (agent_id)
);

-- Learning checkpoints table
CREATE TABLE learning_checkpoints (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES learning_sessions(id),
  execution_count INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  metrics JSONB NOT NULL,
  decision VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  adjustment JSONB,

  INDEX idx_session (session_id),
  INDEX idx_timestamp (timestamp DESC)
);
```

### 8.3 Configuration

**Learning Thresholds** (configurable):
```typescript
const LEARNING_CONFIG = {
  triggers: {
    successRateThreshold: 0.70,    // 70% success rate
    minSampleSize: 20,              // Minimum executions before triggering
    errorRepeatThreshold: 3,        // Same error 3+ times
    degradationThreshold: 0.15,     // 15% week-over-week drop
    contextFailureThreshold: 1.0    // 100% failure in specific context
  },

  graduation: {
    successRateTarget: 0.75,        // 75% success rate
    minimumImprovement: 0.10,       // 10% improvement
    maxLearningExecutions: 100,     // Max executions before forcing decision
    earlyGraduationThreshold: 0.20  // 20% improvement for early graduation
  },

  monitoring: {
    checkpointIntervals: [10, 25, 50], // Execution counts for checkpoints
    pollInterval: 300000,               // 5 minutes
    metricsRetention: 90                // Days to retain metrics
  }
};
```

---

## 9. Testing Strategy

### 9.1 Unit Tests (30+ tests)

**Trigger Algorithm Tests**:
- Test success rate threshold detection
- Test error pattern detection
- Test performance degradation detection
- Test context-specific failure detection
- Test edge cases (empty data, single execution, etc.)

**Learning Enablement Tests**:
- Test ReasoningBank activation
- Test session creation
- Test checkpoint scheduling
- Test parameter configuration
- Test duplicate session prevention

**Progress Monitoring Tests**:
- Test graduation criteria
- Test adjustment logic
- Test abort conditions
- Test early graduation
- Test stagnation detection

### 9.2 Integration Tests (20+ tests)

**End-to-End Learning Cycle**:
- Test complete lifecycle from detection to graduation
- Test learning with real skill executions
- Test Avi reporting integration
- Test multiple concurrent learning sessions
- Test learning persistence across restarts

**Performance Monitoring Integration**:
- Test outcome collection
- Test metrics calculation
- Test real-time updates
- Test historical queries
- Test dashboard data

### 9.3 Scenario Tests (10+ scenarios)

**Scenario 1: Successful Learning**:
- Skill starts at 55% success rate
- Learning triggered automatically
- Skill improves to 82%
- Graduation and reporting

**Scenario 2: Learning Stagnation**:
- Learning enabled
- No improvement after 25 executions
- Parameters adjusted
- Eventually graduates or aborts

**Scenario 3: Multiple Skills Learning**:
- 3 skills below threshold
- Learning prioritized by usage
- All complete successfully
- Avi reports all outcomes

**Scenario 4: Rapid Improvement**:
- Skill improves >20% in <10 executions
- Early graduation triggered
- Validation period initiated
- Success confirmed

**Scenario 5: Learning Regression**:
- Learning causes performance drop
- Abort triggered immediately
- Baseline restored
- Incident reported

---

## 10. Success Criteria

### 10.1 Functional Requirements

- ✅ Learning triggers automatically based on performance
- ✅ No user intervention required
- ✅ Learning sessions tracked and monitored
- ✅ Outcomes reported to Avi and user
- ✅ Multiple concurrent learning sessions supported
- ✅ Learning persists across system restarts
- ✅ Regression detection and prevention

### 10.2 Performance Requirements

- ✅ Trigger algorithm executes in <100ms
- ✅ Outcome recording overhead <10ms per execution
- ✅ Metrics calculation <500ms
- ✅ Dashboard updates real-time (<1s latency)
- ✅ Learning enablement <1s
- ✅ Checkpoint evaluation <200ms

### 10.3 Quality Requirements

- ✅ >90% of learning sessions graduate successfully
- ✅ Average improvement >15% when graduated
- ✅ <5% regression rate
- ✅ 100% of outcomes reported to user
- ✅ Zero manual interventions required
- ✅ Learning ROI >2x (value of improvements vs cost)

---

## Appendices

### A. ReasoningBank SAFLA Integration

From Phase 4.1, SAFLA (Self-Adaptive Feedback Learning Architecture) provides:
- Pattern storage and retrieval
- Learning from execution traces
- Pattern quality scoring
- Adaptive pattern selection

**Integration Points**:
- Learning optimizer calls ReasoningBank API to enable learning
- Skills execute with ReasoningBank middleware
- Patterns stored in shared ReasoningBank
- Quality metrics feed back to performance monitoring

### B. Migration from Manual Learning

**Current State (Phase 4.1)**:
- User must manually request learning
- User specifies which skills to improve
- User monitors progress manually

**Target State (Phase 4.2)**:
- System detects learning needs automatically
- System enables learning without user input
- System reports outcomes proactively

**Migration Path**:
- Phase 4.2 runs in parallel with manual system
- Gradual rollout to production agents
- User can still manually trigger if desired
- Full automation by end of Phase 4.2

### C. Future Enhancements (Post-Phase 4.2)

**Advanced Triggers**:
- Cross-skill correlation analysis
- Predictive failure detection
- User satisfaction signals
- Business impact weighting

**Learning Optimization**:
- Multi-skill joint learning
- Transfer learning between agents
- Collaborative learning across agent types
- Meta-learning (learning how to learn)

**Reporting Enhancements**:
- Learning impact quantification
- ROI calculation and visualization
- Skill improvement trends
- Comparative agent performance

---

**Document Status**: COMPLETE
**Next Steps**: Proceed to Specialized Agents Architecture specification
**Dependencies**: Phase 4.1 ReasoningBank SAFLA (COMPLETE)
**Approval Required**: Architecture review before implementation
