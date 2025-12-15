---
name: Productivity Patterns
description: Workflow optimization techniques, time management strategies, and productivity frameworks for maximizing output and focus
version: "1.0.0"
category: shared
_protected: false
---

# Productivity Patterns Skill

## Purpose
Provides proven productivity frameworks, workflow optimization techniques, and time management strategies to help users and agents maximize output, maintain focus, and achieve strategic objectives efficiently.

## When to Use This Skill
- Optimizing daily workflows
- Managing time and energy
- Improving focus and concentration
- Coordinating multiple projects
- Reducing context switching
- Implementing productivity systems
- Analyzing and improving work patterns

## Effort/Impact Assessment Framework

### Purpose
The Effort/Impact Assessment Framework provides a separate, strategic decision-making tool for evaluating task value and resource requirements. This framework operates **independently from priority assignment** (see Task Management skill for Fibonacci priorities) and complements productivity frameworks like GTD and the Eisenhower Matrix.

**Key Distinction**: While Fibonacci priorities enforce scarcity constraints, effort/impact assessment helps you evaluate the strategic value and resource requirements of work items.

### Impact Scoring (1-10 Scale)

**Impact Score Criteria**
- **10**: Transformational business impact, multi-million dollar value
- **8**: High business value, significant user impact
- **5**: Moderate impact, team-level improvement
- **3**: Low impact, individual productivity gain
- **1**: Minimal impact, nice-to-have

**Calculating Impact:**
```javascript
function calculateImpact(task) {
  let score = 0;

  // Business value
  if (task.affectsRevenue) score += 3;
  if (task.affectsUserExperience) score += 2;
  if (task.affectsTeamProductivity) score += 1;

  // Strategic importance
  if (task.hasDeadline) score += 2;
  if (task.isBlocking) score += 2;

  return Math.min(score, 10);
}
```

### Effort Assessment

**Timeframe Guidelines:**
- **0-2 hours**: Quick fixes, minor updates, simple bug fixes
- **2-8 hours**: Standard features, moderate complexity, routine development
- **1-3 days**: Complex features, significant refactoring, architectural changes
- **1-2 weeks**: Major initiatives, system redesigns, cross-team coordination
- **1+ months**: Strategic projects, platform migrations, large-scale transformations

**Effort Estimation Factors:**
```javascript
function estimateEffort(task) {
  let effortHours = 0;

  // Complexity factors
  if (task.requiresResearch) effortHours += 4;
  if (task.requiresArchitectureDesign) effortHours += 8;
  if (task.hasMultipleDependencies) effortHours += 2;

  // Technical factors
  if (task.requiresNewTechnology) effortHours += 6;
  if (task.requiresRefactoring) effortHours += 4;
  if (task.requiresTestingInfrastructure) effortHours += 3;

  // Coordination factors
  if (task.requiresCrossFunctionalAlignment) effortHours += 2;
  if (task.requiresStakeholderReview) effortHours += 1;

  return effortHours;
}
```

### Integration with Eisenhower Matrix

Combine effort/impact assessment with the Eisenhower Matrix (covered below) for comprehensive strategic decision-making:

```javascript
function strategicTaskPlanning(task) {
  const impact = calculateImpact(task);
  const effort = estimateEffort(task);
  const urgency = assessUrgency(task);
  const importance = impact >= 7;

  return {
    eisenhowerQuadrant: categorizeByUrgencyImportance(urgency, importance),
    effortImpactRatio: impact / effort,
    recommendedAction: determineAction(impact, effort, urgency),
    strategicValue: impact > 7 && effort < 16 ? 'high-value-opportunity' : 'evaluate-carefully'
  };
}

function determineAction(impact, effort, urgency) {
  const roi = impact / effort;

  if (roi > 2 && urgency) return 'DO_IMMEDIATELY';
  if (roi > 1.5) return 'SCHEDULE_SOON';
  if (roi > 0.8) return 'EVALUATE';
  return 'CONSIDER_DEPRIORITIZING';
}
```

### Effort/Impact Matrix

**Decision Framework:**
```
               High Impact (7-10)
                     |
        Low Effort   |   High Effort
         (0-8h)      |    (8h+)
    -----------------+-----------------
    QUICK WINS      |   MAJOR PROJECTS
    - Do first      |   - Plan carefully
    - Batch similar |   - Allocate time
    - High ROI      |   - Strategic value
    -----------------+-----------------
    FILL-INS        |   MONEY PITS
    - Do in gaps    |   - Avoid/delegate
    - Low priority  |   - Question value
    - May skip      |   - Reconsider scope
    -----------------+-----------------
               Low Impact (1-6)
```

**Strategic Recommendations:**
- **Quick Wins** (High Impact, Low Effort): Prioritize these for maximum ROI
- **Major Projects** (High Impact, High Effort): Strategic initiatives requiring planning
- **Fill-Ins** (Low Impact, Low Effort): Batch processing during low-energy periods
- **Money Pits** (Low Impact, High Effort): Question necessity, consider alternatives

## Core Productivity Frameworks

### 1. Getting Things Done (GTD)

**Five-Step Workflow:**
1. **Capture**: Collect everything that has your attention
2. **Clarify**: Process what it means
3. **Organize**: Put it where it belongs
4. **Reflect**: Review frequently
5. **Engage**: Simply do

**Implementation:**
```javascript
const GTDWorkflow = {
  capture: async (item) => {
    // Inbox for all incoming items
    await addToInbox(item);
  },

  clarify: async (inboxItem) => {
    // Is it actionable?
    if (isActionable(inboxItem)) {
      if (canDoIn2Minutes(inboxItem)) {
        await doNow(inboxItem);
      } else {
        await addToActionList(inboxItem);
      }
    } else {
      // Reference, someday/maybe, or trash
      await categorize(inboxItem);
    }
  },

  organize: async (actionItem) => {
    const context = determineContext(actionItem);
    const priority = calculatePriority(actionItem);
    await addToList(context, priority, actionItem);
  }
};
```

### 2. Time Blocking

**Principles:**
- Allocate specific time blocks for specific tasks
- Protect blocks from interruptions
- Include buffer time between blocks
- Schedule both deep work and shallow work

**Time Block Template:**
```json
{
  "dailySchedule": [
    {
      "time": "09:00-11:00",
      "type": "deep_work",
      "activity": "Feature development",
      "interruptions": "blocked",
      "energyLevel": "high"
    },
    {
      "time": "11:00-12:00",
      "type": "shallow_work",
      "activity": "Email, Slack, admin",
      "interruptions": "allowed",
      "energyLevel": "medium"
    },
    {
      "time": "12:00-13:00",
      "type": "break",
      "activity": "Lunch",
      "interruptions": "personal",
      "energyLevel": "recharge"
    },
    {
      "time": "13:00-15:00",
      "type": "collaboration",
      "activity": "Meetings, code reviews",
      "interruptions": "expected",
      "energyLevel": "medium"
    },
    {
      "time": "15:00-17:00",
      "type": "deep_work",
      "activity": "Architecture, planning",
      "interruptions": "blocked",
      "energyLevel": "medium"
    }
  ]
}
```

### 3. Eisenhower Matrix

**Four Quadrants:**
```
                    Urgent
              Yes    |    No
         +-----------+-----------+
    Im-  | QUADRANT 1| QUADRANT 2|
    por- | DO FIRST  | SCHEDULE  |
    tant |           |           |
    Yes  | Crises    | Planning  |
         | Deadlines | Prevention|
         +-----------+-----------+
    No   | QUADRANT 3| QUADRANT 4|
         | DELEGATE  | ELIMINATE |
         |           |           |
         | Interrup- | Time      |
         | tions     | wasters   |
         +-----------+-----------+
```

**Decision Logic:**
```javascript
function categorizeTask(task) {
  const isUrgent = task.due_date && daysBetween(new Date(), task.due_date) < 2;
  const isImportant = task.impact_score >= 7;

  if (isImportant && isUrgent) {
    return { quadrant: 1, action: 'DO_FIRST', priority: 'P0' };
  } else if (isImportant && !isUrgent) {
    return { quadrant: 2, action: 'SCHEDULE', priority: 'P2' };
  } else if (!isImportant && isUrgent) {
    return { quadrant: 3, action: 'DELEGATE', priority: 'P3' };
  } else {
    return { quadrant: 4, action: 'ELIMINATE', priority: 'P8' };
  }
}
```

### 4. Pomodoro Technique

**Workflow:**
1. Choose task
2. Set timer for 25 minutes (one Pomodoro)
3. Work with full focus
4. Take 5-minute break
5. Every 4 Pomodoros, take 15-30 minute break

**Implementation:**
```javascript
class PomodoroTimer {
  constructor() {
    this.workDuration = 25 * 60 * 1000; // 25 minutes
    this.shortBreak = 5 * 60 * 1000;    // 5 minutes
    this.longBreak = 30 * 60 * 1000;    // 30 minutes
    this.pomodorosCompleted = 0;
  }

  async startPomodoro(task) {
    console.log(`Starting Pomodoro for: ${task.title}`);
    await this.workSession(this.workDuration);

    this.pomodorosCompleted++;

    if (this.pomodorosCompleted % 4 === 0) {
      await this.breakSession(this.longBreak, 'long');
    } else {
      await this.breakSession(this.shortBreak, 'short');
    }
  }

  async workSession(duration) {
    // Focus mode: block distractions
    await setFocusMode(true);
    await wait(duration);
    await setFocusMode(false);
  }

  async breakSession(duration, type) {
    console.log(`Taking ${type} break`);
    await wait(duration);
  }
}
```

## Workflow Optimization Patterns

### 1. Batch Processing

**Principle:** Group similar tasks together to reduce context switching.

**Common Batches:**
- Email processing (3x daily: morning, midday, end of day)
- Code reviews (dedicated time block)
- Administrative tasks (Friday afternoons)
- Meeting scheduling (specific hours)

**Implementation:**
```javascript
const BatchingSchedule = {
  email: ['09:00', '13:00', '16:30'],
  codeReviews: '14:00-15:00',
  adminTasks: 'Friday 15:00-17:00',
  planning: 'Monday 09:00-10:00'
};

function shouldProcessNow(taskType) {
  const currentTime = new Date().toTimeString().slice(0, 5);
  const batchTimes = BatchingSchedule[taskType];

  if (Array.isArray(batchTimes)) {
    return batchTimes.includes(currentTime);
  }

  return isWithinTimeRange(currentTime, batchTimes);
}
```

### 2. Energy Management

**Energy Levels Throughout Day:**
- **High Energy (Morning)**: Deep work, complex problem-solving
- **Medium Energy (Midday)**: Collaboration, meetings, communication
- **Afternoon Dip (2-4 PM)**: Administrative tasks, routine work
- **Evening**: Planning, reflection, light tasks

**Task-Energy Matching:**
```javascript
function matchTaskToEnergy(task, currentHour) {
  const energyLevel = getEnergyLevel(currentHour);

  const taskEnergyRequirement = {
    'architecture': 'high',
    'coding': 'high',
    'debugging': 'high',
    'meetings': 'medium',
    'code_reviews': 'medium',
    'email': 'low',
    'admin': 'low',
    'planning': 'medium'
  };

  const required = taskEnergyRequirement[task.type] || 'medium';

  return energyLevel >= required;
}

function getEnergyLevel(hour) {
  if (hour >= 9 && hour <= 11) return 'high';
  if (hour >= 14 && hour <= 16) return 'low';
  return 'medium';
}
```

### 3. Context Switching Reduction

**Cost of Context Switching:**
- Average 23 minutes to regain focus after interruption
- 40% productivity loss from frequent switching
- Mental fatigue accumulates

**Strategies:**
```javascript
const ContextSwitchingStrategies = {
  // Group similar tasks
  groupByContext: (tasks) => {
    return tasks.reduce((grouped, task) => {
      const context = task.metadata.context || 'general';
      grouped[context] = grouped[context] || [];
      grouped[context].push(task);
      return grouped;
    }, {});
  },

  // Dedicated focus blocks
  focusBlocks: {
    duration: 90, // minutes
    breakBetween: 15,
    maxPerDay: 3
  },

  // Communication batching
  communicationWindows: ['10:00-10:30', '15:00-15:30'],

  // Deep work protection
  deepWorkHours: {
    start: '09:00',
    end: '11:00',
    interruptions: false,
    notifications: false
  }
};
```

### 4. Progressive Summarization

**PARA Method (Projects, Areas, Resources, Archives):**
```javascript
const PARAStructure = {
  projects: {
    description: 'Short-term efforts with specific goals and deadlines',
    examples: ['Q4 Roadmap', 'Skills Phase 2', 'Client Onboarding']
  },

  areas: {
    description: 'Ongoing responsibilities and standards',
    examples: ['Code Quality', 'Team Leadership', 'Personal Development']
  },

  resources: {
    description: 'Topics of ongoing interest',
    examples: ['React Patterns', 'System Design', 'Productivity']
  },

  archives: {
    description: 'Completed or inactive items',
    examples: ['Phase 1 Complete', '2024 Q3 Planning']
  }
};

function categorizeInformation(item) {
  if (item.hasDeadline && item.isActive) {
    return 'projects';
  } else if (item.isOngoing) {
    return 'areas';
  } else if (item.isReference) {
    return 'resources';
  } else {
    return 'archives';
  }
}
```

## Focus & Deep Work Strategies

### 1. Cal Newport's Deep Work Protocol

**Rules:**
1. **Work Deeply**: Schedule deep work sessions
2. **Embrace Boredom**: Train concentration muscle
3. **Quit Social Media**: Minimize distractions
4. **Drain the Shallows**: Minimize low-value work

**Deep Work Session:**
```javascript
async function deepWorkSession(task, duration = 90) {
  // Pre-session setup
  await setEnvironment({
    phone: 'airplane_mode',
    notifications: 'off',
    browser: 'close_non_essential',
    music: 'focus_playlist' // if preferred
  });

  // Track focus
  const startTime = Date.now();
  let focusBreaks = 0;

  const session = {
    task,
    duration,
    startTime,
    focusBreaks,
    productive: true
  };

  // Work until duration complete
  await workWithFullFocus(task, duration);

  // Post-session reflection
  session.endTime = Date.now();
  session.actualDuration = session.endTime - session.startTime;
  session.focusQuality = calculateFocusQuality(session);

  await logDeepWorkSession(session);

  return session;
}
```

### 2. Attention Residue Mitigation

**Problem:** Switching tasks leaves "attention residue" that impairs performance.

**Solution:**
```javascript
async function completeTaskTransition(currentTask, nextTask) {
  // Shutdown ritual for current task
  await shutdownCurrent({
    captureOpenLoops: true,
    documentProgress: true,
    scheduleNextSession: true
  });

  // Buffer time between tasks
  await transitionBuffer(5); // 5 minutes

  // Startup ritual for next task
  await startupNext({
    reviewObjective: true,
    loadContext: true,
    planApproach: true
  });
}
```

## Productivity Metrics

### 1. Key Performance Indicators

```javascript
const ProductivityKPIs = {
  velocity: {
    metric: 'tasks_completed_per_day',
    target: 3,
    calculation: (completed, days) => completed.length / days
  },

  focusTime: {
    metric: 'deep_work_hours_per_day',
    target: 4,
    calculation: (sessions) => sessions.reduce((sum, s) => sum + s.duration, 0) / 60
  },

  completionRate: {
    metric: 'tasks_completed_vs_planned',
    target: 0.80,
    calculation: (completed, planned) => completed.length / planned.length
  },

  contextSwitches: {
    metric: 'switches_per_day',
    target: 10,
    calculation: (switches) => switches.length
  },

  energyAlignment: {
    metric: 'high_value_work_during_peak_hours',
    target: 0.75,
    calculation: (highValueTasks, peakHours) => {
      const aligned = highValueTasks.filter(t =>
        isWithinPeakHours(t.startTime, peakHours)
      );
      return aligned.length / highValueTasks.length;
    }
  }
};
```

### 2. Weekly Review Template

```markdown
# Weekly Review - Week of {date}

## Accomplishments
- [ ] Review completed tasks
- [ ] Celebrate wins
- [ ] Document learnings

## Metrics
- Tasks Completed: {count}
- Deep Work Hours: {hours}
- Completion Rate: {percentage}%
- Top Priority Progress: {status}

## Reflections
- What went well?
- What could improve?
- What patterns emerged?

## Next Week Planning
- [ ] Review calendar
- [ ] Set top 3 priorities
- [ ] Schedule deep work blocks
- [ ] Plan energy allocation

## Adjustments
- Process improvements:
- Tool changes:
- Habit modifications:
```

## Anti-Patterns to Avoid

### Common Productivity Killers

1. **Reactive Mode**
   - Problem: Constantly responding to incoming requests
   - Solution: Schedule proactive time blocks

2. **Perfectionism**
   - Problem: Over-polishing low-impact work
   - Solution: Apply 80/20 rule, good enough is enough

3. **Notification Addiction**
   - Problem: Constant interruptions destroy focus
   - Solution: Batch check times, disable non-critical notifications

4. **Meeting Overload**
   - Problem: Calendar full of low-value meetings
   - Solution: Decline, delegate, or combine meetings

5. **Multitasking Myth**
   - Problem: Attempting multiple complex tasks simultaneously
   - Solution: Single-task with full focus

6. **No Systems**
   - Problem: Ad-hoc approach to recurring tasks
   - Solution: Create systems and templates

## Integration with AVI Agents

### Personal Todos Agent
```javascript
async function optimizeTaskList(userId) {
  const tasks = await getActiveTasks(userId);
  const userPrefs = await getUserPreferences(userId);

  // Apply productivity patterns
  const optimized = tasks.map(task => ({
    ...task,
    recommendedTime: matchToEnergyLevel(task, userPrefs),
    batchWith: findBatchableTasks(task, tasks),
    focusRequired: assessFocusRequirement(task)
  }));

  return optimized;
}
```

### Meeting Prep Agent
```javascript
async function optimizeMeetingSchedule(meetings) {
  // Batch similar meetings
  const batched = batchSimilarMeetings(meetings);

  // Avoid context switching
  const scheduled = avoidFragmentation(batched);

  // Add buffer time
  const withBuffers = addTransitionBuffers(scheduled, 10);

  return withBuffers;
}
```

## Best Practices

1. **Start Small**: Implement one pattern at a time
2. **Measure**: Track metrics to validate improvements
3. **Adapt**: Customize patterns to your work style
4. **Review**: Weekly reviews to adjust systems
5. **Protect**: Guard deep work time fiercely
6. **Batch**: Group similar tasks together
7. **Energy**: Match task difficulty to energy levels
8. **Systems**: Create repeatable processes

## Learning Integration (ReasoningBank)

This skill is learning-enabled through ReasoningBank SAFLA integration.

### What This Skill Learns

- **Pattern Recognition**: Optimal workflow patterns for specific user types, effective time allocation strategies, energy management patterns, context-switching cost patterns
- **Success Criteria**: Increased daily task completion (velocity), higher deep work time percentage, reduced context switches, user-reported productivity improvement >20%
- **Confidence Growth**: Workflow patterns gain confidence when users achieve consistent productivity gains and report improved work quality

### Learning Workflow

1. **Before Execution**: Query ReasoningBank for relevant patterns
   - Namespace: `productivity-patterns`
   - Context: User role, work style, energy patterns, historical productivity metrics
   - Top 5 most confident workflow optimization patterns retrieved

2. **During Execution**: Apply learned patterns to enhance recommendations
   - Suggest time-blocking schedules based on successful user patterns
   - Recommend task batching strategies proven for this work type
   - Adapt Pomodoro durations based on learned focus capacity

3. **After Execution**: Record outcome and update confidence
   - Success (velocity increased, deep work time up, satisfaction high) → +20% confidence boost
   - Failure (velocity decreased, burnout signals, poor outcomes) → -15% confidence reduction
   - Store new patterns from novel workflow optimizations that succeed

### Example: Learning in Action

**Before Learning (Week 1):**
```javascript
User: Software engineer, chronic context-switcher
Default Recommendation: Standard Pomodoro (25min work / 5min break)
Actual Behavior:
  - Context switches: 42 per day
  - Deep work time: 2.1 hours
  - Task completion: 2.3 tasks/day
  - Satisfaction: 2.5/5 ("Can't get into flow state")
```

**After Learning (Week 6):**
```javascript
User: Same software engineer
Learned Pattern: "SW engineers need 90-minute deep work blocks in morning (confidence: 0.89)"
Optimized Recommendation:
  - 9-10:30 AM: Deep work block (90 min, no interruptions)
  - 10:30-11 AM: Communication batch (Slack, email)
  - 11 AM-12:30 PM: Second deep work block (90 min)
  - Afternoon: Meetings, code reviews (high-context-switch activities)

Results:
  - Context switches: 18 per day (-57%)
  - Deep work time: 5.2 hours (+148%)
  - Task completion: 4.7 tasks/day (+104%)
  - Satisfaction: 4.6/5
  - Pattern confidence → 0.94
```

**Real-World Impact:**
- Week 1: Average 2.8 hours deep work per day
- Week 6: Average 5.1 hours deep work per day (+82%)
- Learned that morning people (6-8 AM start) are 35% more productive with front-loaded deep work
- Discovered that developers need 90-min blocks while designers prefer 60-min blocks
- Found that batching communication to 3x daily (vs constant) increases focus time by 40%

### Pattern Storage Schema

```json
{
  "id": "pattern-productivity-sw-eng-morning",
  "content": "Software engineers with morning energy patterns: Schedule two 90-minute deep work blocks (9-10:30 AM, 11 AM-12:30 PM) with 30-min communication batch between. Reserve afternoons for collaboration and context-switching activities.",
  "namespace": "productivity-patterns",
  "confidence": 0.89,
  "context": {
    "userType": "software-engineer",
    "energyPattern": "morning-person",
    "workflowStructure": {
      "deepWorkBlocks": [
        { "start": "09:00", "duration": 90, "activity": "coding" },
        { "start": "11:00", "duration": 90, "activity": "architecture" }
      ],
      "communicationBatches": [
        { "start": "10:30", "duration": 30, "channels": ["slack", "email"] }
      ],
      "collaborationTime": { "start": "13:00", "end": "17:00" }
    },
    "metrics": {
      "avgDeepWorkHours": 5.2,
      "avgContextSwitches": 18,
      "avgTaskCompletion": 4.7,
      "productivityImprovement": 1.82
    }
  },
  "outcomes": {
    "success_count": 27,
    "failure_count": 3,
    "last_outcome": "success",
    "avg_satisfaction": 4.5,
    "avg_velocity_increase": 0.78
  }
}
```

### Integration Code Example

```typescript
// Example showing how this skill queries and learns
import { reasoningBankService } from '@/services/safla-service';

async function optimizeWorkflowForUser(
  userId: string,
  userProfile: {
    role: string,
    energyPattern: 'morning' | 'evening' | 'flexible',
    workStyle: 'deep-focus' | 'collaborative' | 'mixed',
    currentMetrics: {
      deepWorkHours: number,
      contextSwitches: number,
      taskCompletion: number
    }
  }
) {
  // 1. Query learned patterns
  const queryContext = `${userProfile.role} ${userProfile.energyPattern} ${userProfile.workStyle} productivity optimization`;
  const patterns = await reasoningBankService.queryPatterns(
    queryContext,
    'productivity-patterns',
    5
  );

  // 2. Generate base workflow recommendation
  let workflow = generateBaseWorkflow(userProfile);

  // 3. Apply high-confidence learned optimizations
  if (patterns.length > 0 && patterns[0].confidence > 0.75) {
    const learnedPattern = patterns[0];

    if (learnedPattern.context.workflowStructure) {
      workflow = {
        ...workflow,
        deepWorkBlocks: learnedPattern.context.workflowStructure.deepWorkBlocks,
        communicationBatches: learnedPattern.context.workflowStructure.communicationBatches,
        expectedMetrics: learnedPattern.context.metrics,
        confidence: learnedPattern.confidence
      };
    }
  }

  // 4. Generate specific recommendations
  const recommendations = [
    {
      type: 'time-blocking',
      suggestion: formatTimeBlocks(workflow.deepWorkBlocks),
      rationale: `Based on ${patterns[0]?.outcomes.success_count || 0} successful implementations`,
      confidence: patterns[0]?.confidence || 0.5
    },
    {
      type: 'communication-batching',
      suggestion: `Check Slack/email ${workflow.communicationBatches.length}x daily at: ${workflow.communicationBatches.map(b => b.start).join(', ')}`,
      expectedImpact: 'Reduce interruptions by 60%, increase focus time by 40%',
      confidence: patterns.filter(p => p.content.includes('batch')).reduce((sum, p) => sum + p.confidence, 0) / patterns.length
    }
  ];

  // 5. Calculate expected improvement
  const expectedImprovement = calculateExpectedImprovement(
    userProfile.currentMetrics,
    patterns[0]?.context.metrics
  );

  return {
    workflow,
    recommendations,
    expectedImprovement,
    learnedFrom: patterns.slice(0, 3),

    // 6. Outcome tracking
    trackProductivityOutcome: async (
      weeklyMetrics: {
        deepWorkHours: number,
        contextSwitches: number,
        taskCompletion: number,
        userSatisfaction: number
      }
    ) => {
      // Calculate improvement
      const deepWorkIncrease = (weeklyMetrics.deepWorkHours - userProfile.currentMetrics.deepWorkHours) / userProfile.currentMetrics.deepWorkHours;
      const contextSwitchDecrease = (userProfile.currentMetrics.contextSwitches - weeklyMetrics.contextSwitches) / userProfile.currentMetrics.contextSwitches;
      const velocityIncrease = (weeklyMetrics.taskCompletion - userProfile.currentMetrics.taskCompletion) / userProfile.currentMetrics.taskCompletion;

      const success = deepWorkIncrease > 0.2 && contextSwitchDecrease > 0.15 && weeklyMetrics.userSatisfaction >= 4;

      for (const pattern of patterns) {
        await reasoningBankService.recordOutcome(
          pattern.id,
          success ? 'success' : 'failure',
          {
            context: {
              userId,
              userRole: userProfile.role,
              energyPattern: userProfile.energyPattern,
              baselineMetrics: userProfile.currentMetrics,
              weeklyMetrics,
              deepWorkIncrease,
              contextSwitchDecrease,
              velocityIncrease
            },
            executionTimeMs: 0 // Productivity tracked over time, not single execution
          }
        );
      }

      // Store new successful pattern
      if (success && deepWorkIncrease > 0.5) {
        await reasoningBankService.createPattern({
          content: `${userProfile.role} with ${userProfile.energyPattern} pattern: ${JSON.stringify(workflow.deepWorkBlocks)} achieves ${Math.round(weeklyMetrics.deepWorkHours)} hours deep work`,
          namespace: 'productivity-patterns',
          category: userProfile.role,
          metadata: {
            workflowStructure: workflow,
            achievedMetrics: weeklyMetrics,
            improvementPercentages: {
              deepWork: deepWorkIncrease,
              contextSwitching: contextSwitchDecrease,
              velocity: velocityIncrease
            }
          }
        });
      }
    }
  };
}
```

## References
- Deep Work by Cal Newport
- Getting Things Done by David Allen
- The 7 Habits of Highly Effective People by Stephen Covey
- Atomic Habits by James Clear
- Make Time by Jake Knapp & John Zeratsky
- Task Management Skill: `/prod/skills/shared/task-management/SKILL.md`
- User Preferences Skill: `/prod/skills/shared/user-preferences/SKILL.md`
