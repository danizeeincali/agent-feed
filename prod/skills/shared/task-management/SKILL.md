---
name: Task Management
description: Fibonacci priority system (P0-P8), task templates, dependency tracking, and productivity workflows for AVI task management
version: "1.0.0"
category: shared
_protected: false
---

# Task Management Skill

## Purpose
Provides comprehensive task management framework using Fibonacci-based priority system, task templates, dependency tracking, and productivity optimization patterns for all AVI agents.

## When to Use This Skill
- Creating and prioritizing tasks
- Managing task dependencies
- Implementing priority escalation
- Tracking task completion
- Optimizing productivity workflows
- Coordinating cross-agent task management

## Fibonacci Priority System

### Priority Levels: Fibonacci as Forcing Function

The Fibonacci priority system (P0, P1, P2, P3, P5, P8, P13, P21...) is an **infinite sequence** designed as a **psychological forcing function** to enforce prioritization discipline through scarcity.

**How the Forcing Function Works**:

The expanding gaps between priority levels make it increasingly difficult to justify using higher priorities, preventing "everything is P1" syndrome:

- **P0, P1, P2, P3** (gaps: 1, 1, 1) - Small gaps, easy to use for urgent work
- **P3, P5, P8** (gaps: 2, 3) - Growing gaps force harder prioritization choices
- **P8, P13, P21** (gaps: 5, 8) - Increasingly rare to justify, reserved for exceptional cases

**Practical Application**:
- The sequence continues infinitely (P21, P34, P55, P89...)
- **P8 is the practical ceiling** for most users and teams
- Most work falls naturally into P1-P5 range
- The expanding gaps prevent priority inflation

**Key Principle**: The scarcity constraint forces you to make hard trade-offs rather than marking everything as high priority.

### Priority Selection Guidelines

**P0 (Critical):**
- System is completely down
- Revenue-generating functionality broken
- Security vulnerability actively exploited
- Legal/compliance deadline imminent

**P1 (High/Urgent):**
- Important meeting approaching
- Client deliverable due soon
- Strategic initiative with executive visibility
- Blocking other team members

**P2 (Medium/Important):**
- Planned sprint work
- Scheduled feature development
- Optimization with measurable impact
- Cross-team coordination

**P3 (Normal/Scheduled):**
- Routine development tasks
- Documentation updates
- Code quality improvements
- Regular maintenance

**P5 (Low/Backlog):**
- Nice-to-have features
- UX polish
- Technical debt
- Performance optimizations

**P8 (Minimal/Future):**
- Research projects
- Experimental features
- Long-term strategic planning
- Someday/maybe items

## Task Schema

### Core Task Structure
```json
{
  "id": "task-uuid",
  "title": "Clear, actionable task title",
  "description": "Detailed task description with context",
  "priority": "P0|P1|P2|P3|P5|P8",
  "status": "pending|in_progress|blocked|completed|cancelled",
  "created_at": "2025-10-18T12:00:00Z",
  "updated_at": "2025-10-18T14:00:00Z",
  "due_date": "2025-10-20T17:00:00Z",
  "completed_at": null,
  "estimated_hours": 2,
  "actual_hours": null,
  "impact_score": 8,
  "owner": "agent-id",
  "assignee": "user-id",
  "tags": ["development", "frontend"],
  "dependencies": [],
  "metadata": {}
}
```

**Note**: For effort/impact assessment guidelines, see the [Productivity Patterns skill](/prod/skills/shared/productivity-patterns/SKILL.md#effort-impact-assessment-framework).

## Task Templates

### Template 1: Feature Development
```json
{
  "title": "[Feature] Implement {feature name}",
  "description": "**User Story:** As a {user}, I want to {action} so that {benefit}\n\n**Acceptance Criteria:**\n- [ ] Criterion 1\n- [ ] Criterion 2\n\n**Technical Approach:**\n- Implementation details\n\n**Testing:**\n- Unit tests\n- Integration tests",
  "priority": "P2",
  "estimated_hours": 8,
  "tags": ["feature", "development"],
  "metadata": {
    "type": "feature",
    "component": "frontend|backend|fullstack"
  }
}
```

### Template 2: Bug Fix
```json
{
  "title": "[Bug] Fix {issue description}",
  "description": "**Issue:**\n{What's broken}\n\n**Steps to Reproduce:**\n1. Step 1\n2. Step 2\n\n**Expected Behavior:**\n{What should happen}\n\n**Actual Behavior:**\n{What currently happens}\n\n**Root Cause:**\n{Analysis}\n\n**Solution:**\n{Fix approach}",
  "priority": "P1",
  "estimated_hours": 2,
  "tags": ["bug", "fix"],
  "metadata": {
    "type": "bug",
    "severity": "critical|high|medium|low"
  }
}
```

### Template 3: Research Task
```json
{
  "title": "[Research] Investigate {topic}",
  "description": "**Objective:**\n{What to research}\n\n**Questions to Answer:**\n- Question 1\n- Question 2\n\n**Deliverable:**\n{Expected output}\n\n**Success Criteria:**\n- [ ] Research complete\n- [ ] Findings documented\n- [ ] Recommendation provided",
  "priority": "P5",
  "estimated_hours": 4,
  "tags": ["research", "analysis"],
  "metadata": {
    "type": "research",
    "deliverable": "document|presentation|poc"
  }
}
```

### Template 4: Meeting Preparation
```json
{
  "title": "[Meeting] Prep for {meeting name}",
  "description": "**Meeting Date:** {date/time}\n**Participants:** {list}\n**Objective:** {purpose}\n\n**Preparation Tasks:**\n- [ ] Review background materials\n- [ ] Prepare presentation\n- [ ] Draft agenda\n- [ ] Gather data/metrics\n\n**Expected Outcomes:**\n- {outcome 1}\n- {outcome 2}",
  "priority": "P1",
  "estimated_hours": 2,
  "tags": ["meeting", "preparation"],
  "metadata": {
    "type": "meeting-prep",
    "meetingType": "1-on-1|team|client|strategic"
  }
}
```

## Dependency Management

### Dependency Types
1. **Blocks**: This task blocks another task
2. **Blocked By**: This task is blocked by another task
3. **Relates To**: Informational relationship
4. **Child Of**: Parent-child hierarchy

### Dependency Schema
```json
{
  "dependencies": [
    {
      "type": "blocks|blocked_by|relates_to|child_of",
      "taskId": "related-task-uuid",
      "reason": "Why this dependency exists"
    }
  ]
}
```

### Dependency Resolution
```javascript
function canStartTask(task, allTasks) {
  const blockedBy = task.dependencies.filter(d => d.type === 'blocked_by');

  for (const dep of blockedBy) {
    const blockingTask = allTasks.find(t => t.id === dep.taskId);
    if (blockingTask && blockingTask.status !== 'completed') {
      return false;
    }
  }

  return true;
}
```

### Critical Path Analysis
```javascript
function findCriticalPath(tasks) {
  // Topological sort to find longest path
  const graph = buildDependencyGraph(tasks);
  const sorted = topologicalSort(graph);

  let criticalPath = [];
  let longestDuration = 0;

  for (const task of sorted) {
    const pathDuration = calculatePathDuration(task, graph);
    if (pathDuration > longestDuration) {
      longestDuration = pathDuration;
      criticalPath = getPathToTask(task, graph);
    }
  }

  return { criticalPath, duration: longestDuration };
}
```

## Priority Escalation

### Auto-Escalation Rules
```javascript
const EscalationRules = {
  // Escalate if deadline approaching
  deadlineProximity: {
    P3: { daysUntilDue: 1, escalateTo: 'P2' },
    P2: { daysUntilDue: 0.5, escalateTo: 'P1' }
  },

  // Escalate if blocking other tasks
  blockingCritical: {
    condition: (task, blockedTasks) => {
      return blockedTasks.some(t => t.priority === 'P0' || t.priority === 'P1');
    },
    escalateTo: 'P1'
  },

  // Escalate if aging in backlog
  agingTask: {
    P3: { daysOld: 30, escalateTo: 'P2' },
    P5: { daysOld: 60, escalateTo: 'P3' }
  }
};

function checkEscalation(task, allTasks) {
  // Check deadline proximity
  if (task.due_date) {
    const daysUntil = daysBetween(new Date(), task.due_date);
    const rule = EscalationRules.deadlineProximity[task.priority];
    if (rule && daysUntil <= rule.daysUntilDue) {
      return { shouldEscalate: true, newPriority: rule.escalateTo };
    }
  }

  // Check if blocking critical tasks
  const blockedTasks = findBlockedTasks(task, allTasks);
  if (EscalationRules.blockingCritical.condition(task, blockedTasks)) {
    return { shouldEscalate: true, newPriority: EscalationRules.blockingCritical.escalateTo };
  }

  return { shouldEscalate: false };
}
```

## Task Workflows

### Workflow States
```
pending → in_progress → completed
    ↓           ↓
  blocked    cancelled
```

### State Transitions
```javascript
const AllowedTransitions = {
  pending: ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['completed', 'blocked', 'pending', 'cancelled'],
  blocked: ['pending', 'cancelled'],
  completed: [],  // Terminal state
  cancelled: []   // Terminal state
};

function canTransition(currentStatus, newStatus) {
  return AllowedTransitions[currentStatus]?.includes(newStatus) || false;
}
```

### Workflow Automation
```javascript
async function updateTaskStatus(taskId, newStatus, reason) {
  const task = await getTask(taskId);

  if (!canTransition(task.status, newStatus)) {
    throw new Error(`Invalid transition: ${task.status} → ${newStatus}`);
  }

  task.status = newStatus;
  task.updated_at = new Date().toISOString();

  if (newStatus === 'completed') {
    task.completed_at = new Date().toISOString();
    task.actual_hours = calculateActualHours(task);

    // Unblock dependent tasks
    await unblockDependentTasks(taskId);
  }

  if (newStatus === 'blocked') {
    task.metadata.blockReason = reason;
    await notifyStakeholders(task, 'blocked');
  }

  await saveTask(task);
  return task;
}
```

## Task Metrics & Analytics

### Velocity Tracking
```javascript
function calculateVelocity(tasks, periodDays = 7) {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);

  const completedTasks = tasks.filter(t =>
    t.status === 'completed' &&
    new Date(t.completed_at) >= periodStart
  );

  const totalPoints = completedTasks.reduce((sum, t) =>
    sum + (t.impact_score || 0), 0
  );

  return totalPoints / periodDays;
}
```

### Burn-down Tracking
```javascript
function generateBurndown(tasks, sprintDays = 14) {
  const totalPoints = tasks.reduce((sum, t) => sum + (t.impact_score || 0), 0);
  const dailyProgress = [];

  for (let day = 0; day <= sprintDays; day++) {
    const completedByDay = tasks.filter(t =>
      t.status === 'completed' &&
      daysSince(t.completed_at) <= day
    );

    const completedPoints = completedByDay.reduce((sum, t) =>
      sum + (t.impact_score || 0), 0
    );

    dailyProgress.push({
      day,
      remaining: totalPoints - completedPoints,
      ideal: totalPoints - (totalPoints / sprintDays * day)
    });
  }

  return dailyProgress;
}
```

## Integration with Agents

### Personal Todos Agent Integration
```javascript
async function createPersonalTask(userId, taskData) {
  const task = {
    ...taskData,
    owner: 'personal-todos-agent',
    assignee: userId,
    created_at: new Date().toISOString()
  };

  // Auto-assign priority if not specified
  if (!task.priority) {
    task.priority = inferPriority(task);
  }

  await saveTask(task);
  await postToAgentFeed('personal-todos-agent', `Created task: ${task.title}`);

  return task;
}
```

### Cross-Agent Task Coordination
```javascript
async function delegateTask(taskId, targetAgent) {
  const task = await getTask(taskId);

  // Update task ownership
  task.metadata.delegatedFrom = task.owner;
  task.owner = targetAgent;
  task.updated_at = new Date().toISOString();

  await saveTask(task);
  await notifyAgent(targetAgent, 'task_delegated', task);

  return task;
}
```

## Best Practices

1. **Clear Titles**: Use action verbs and specific descriptions
2. **Right-sized Tasks**: 2-8 hours optimal, break down larger tasks
3. **Impact Scoring**: Always assess business value
4. **Dependencies**: Document blocking relationships
5. **Status Updates**: Keep status current
6. **Priority Discipline**: Use Fibonacci scale consistently
7. **Completion Criteria**: Define "done" upfront

## Storage Location

**Task Database:**
`/prod/agent_workspace/personal-todos-agent/tasks.json`

**Task Archives:**
`/prod/agent_workspace/personal-todos-agent/archives/{year}/{month}/`

## Learning Integration (ReasoningBank)

This skill is learning-enabled through ReasoningBank SAFLA integration.

### What This Skill Learns

- **Pattern Recognition**: Successful priority assignment strategies, task completion time patterns, effective categorization approaches
- **Success Criteria**: Task completed on schedule, accurate effort estimation (actual vs estimated within 20%), user satisfaction with prioritization
- **Confidence Growth**: Patterns gain confidence through repeated successful task completions and accurate predictions

### Learning Workflow

1. **Before Execution**: Query ReasoningBank for relevant patterns
   - Namespace: `task-management`
   - Context: Task description, type, and user context
   - Top 5 most confident patterns retrieved

2. **During Execution**: Apply learned patterns to enhance recommendations
   - Weight priority suggestions by pattern confidence
   - Combine skill logic with learned estimation patterns
   - Provide confidence scores for time estimates

3. **After Execution**: Record outcome and update confidence
   - Success (completed on time, accurate estimate) → +20% confidence boost
   - Failure (missed deadline, poor estimate) → -15% confidence reduction
   - Store new patterns from novel task types

### Example: Learning in Action

**Before Learning (Week 1):**
```javascript
Task: "Implement user authentication"
Skill Baseline: P2 priority, 8-hour estimate
Pattern Confidence: 0.5 (no history)
Outcome: Took 12 hours (50% over estimate)
```

**After Learning (Week 4):**
```javascript
Task: "Implement OAuth integration"
Learned Pattern: "Authentication tasks typically take 1.5x initial estimate"
Pattern Confidence: 0.85 (3 successful applications)
Adjusted Estimate: 8 hours → 12 hours
Outcome: Took 11 hours (within 10% of estimate)
Result: Pattern confidence → 0.90
```

**Real-World Impact:**
- Week 1: 40% of tasks completed on estimated timeline
- Week 4: 85% of tasks completed within 20% of estimate
- Learned that user's "feature development" tasks take longer in afternoons vs mornings (energy patterns)
- Automatically escalates P3 tasks when blocking P1 work (learned from 5 instances)

### Pattern Storage Schema

```json
{
  "id": "pattern-task-auth-estimation",
  "content": "Authentication feature tasks: multiply initial estimate by 1.5x for security review overhead",
  "namespace": "task-management",
  "confidence": 0.85,
  "context": {
    "taskType": "authentication",
    "estimationAdjustment": 1.5,
    "reasonCodes": ["security-review", "edge-case-handling", "testing-complexity"]
  },
  "outcomes": {
    "success_count": 12,
    "failure_count": 2,
    "last_outcome": "success",
    "avg_accuracy": 0.92
  }
}
```

### Integration Code Example

```typescript
// Example showing how this skill queries and learns
import { reasoningBankService } from '@/services/safla-service';

async function enhancedTaskPrioritization(task: Task, userId: string) {
  // 1. Query learned patterns
  const patterns = await reasoningBankService.queryPatterns(
    `${task.title} ${task.description}`,
    'task-management',
    5
  );

  // 2. Apply patterns to recommendation
  let estimatedHours = baseEstimate(task);
  let suggestedPriority = basePriority(task);

  // Weight by pattern confidence
  for (const pattern of patterns.filter(p => p.confidence > 0.7)) {
    if (pattern.context.estimationAdjustment) {
      estimatedHours *= pattern.context.estimationAdjustment;
    }
    if (pattern.context.priorityEscalation && task.dueDate) {
      suggestedPriority = escalatePriority(suggestedPriority);
    }
  }

  // 3. Create task with learned adjustments
  const enhancedTask = {
    ...task,
    estimated_hours: Math.round(estimatedHours),
    priority: suggestedPriority,
    confidence_score: patterns[0]?.confidence || 0.5,
    learned_from: patterns.map(p => p.id)
  };

  await createTask(enhancedTask);

  // 4. Track for outcome recording
  return {
    task: enhancedTask,
    patternsUsed: patterns.slice(0, 3),
    trackOutcome: async (actualHours: number, completed: boolean) => {
      const success = Math.abs(actualHours - estimatedHours) / estimatedHours < 0.2 && completed;

      for (const pattern of patterns) {
        await reasoningBankService.recordOutcome(
          pattern.id,
          success ? 'success' : 'failure',
          {
            context: { taskId: enhancedTask.id, actualHours, estimatedHours },
            executionTimeMs: actualHours * 60 * 60 * 1000
          }
        );
      }
    }
  };
}
```

## References
- Personal Todos Agent: `/prod/.claude/agents/personal-todos-agent.md`
- User Preferences: `/prod/skills/shared/user-preferences/SKILL.md`
- Productivity Patterns: `/prod/skills/shared/productivity-patterns/SKILL.md`
