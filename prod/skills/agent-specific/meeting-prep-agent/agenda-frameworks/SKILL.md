---
name: Agenda Frameworks
description: Structured agenda design patterns, time allocation strategies, and facilitation techniques for effective meetings
version: "1.0.0"
category: agent-specific
agent: meeting-prep-agent
_protected: false
---

# Agenda Frameworks Skill

## Purpose
Provides proven agenda structures, facilitation frameworks, and time management patterns to ensure meetings are well-structured, time-efficient, and outcome-focused.

## When to Use This Skill
- Designing meeting agendas
- Structuring discussion topics
- Allocating time effectively
- Facilitating productive conversations
- Ensuring balanced participation
- Driving toward decisions

## Core Agenda Frameworks

### 1. The Amazon "6-Pager" Framework

**Structure:**
- First 20-30 minutes: Silent reading of pre-circulated document
- Remaining time: Structured Q&A and discussion

**Benefits:**
- Everyone aligned on context
- Deeper, more thoughtful questions
- Reduced meeting time overall

**Implementation:**
```json
{
  "framework": "Amazon 6-Pager",
  "agenda": [
    {
      "phase": "Silent Reading",
      "duration": 20,
      "activity": "All participants read 6-page memo silently",
      "rules": [
        "No talking during reading time",
        "Take notes and mark questions",
        "Read thoroughly, don't skim"
      ]
    },
    {
      "phase": "Q&A Session",
      "duration": 30,
      "activity": "Structured question and answer",
      "format": "Round-robin questions, author responds"
    },
    {
      "phase": "Discussion & Decision",
      "duration": 10,
      "activity": "Open discussion and decision-making",
      "output": "Clear decision or next steps"
    }
  ],
  "preparation": {
    "author": [
      "Write comprehensive 6-page memo",
      "Include data, analysis, and recommendation",
      "Anticipate questions"
    ],
    "participants": [
      "Come prepared to read carefully",
      "Bring critical thinking mindset"
    ]
  }
}
```

### 2. The "Lean Coffee" Format

**Structure:** Democratized agenda-building

**Process:**
1. **Build Agenda** (5 min): Participants propose topics
2. **Vote** (2 min): Dot voting to prioritize topics
3. **Discuss** (time-boxed): 7 minutes per topic
4. **Vote to Continue** (30 sec): Thumbs up/down to extend by 3 min
5. **Move On**: Next highest priority topic

**Implementation:**
```json
{
  "framework": "Lean Coffee",
  "phases": [
    {
      "phase": "Topic Collection",
      "duration": 5,
      "activity": "Write topics on cards/sticky notes",
      "output": "10-15 potential topics"
    },
    {
      "phase": "Voting",
      "duration": 2,
      "activity": "Each person gets 3 votes to distribute",
      "output": "Prioritized topic list"
    },
    {
      "phase": "Discussion",
      "duration": "variable",
      "activity": "Discuss topics in order",
      "rules": [
        "7 minutes initial discussion",
        "Vote to extend 3 more minutes",
        "Maximum 2 extensions per topic"
      ]
    }
  ],
  "benefits": [
    "Democratic topic selection",
    "Covers what's most important to group",
    "Built-in time management",
    "High engagement"
  ]
}
```

### 3. The "Liberating Structures" Framework

**Patterns for Different Meeting Needs:**

#### 1-2-4-All Pattern
**Use Case:** Generating ideas, solving problems collaboratively

**Structure:**
```json
{
  "pattern": "1-2-4-All",
  "steps": [
    {
      "step": "1 (Individual)",
      "duration": 3,
      "activity": "Silent self-reflection on question/challenge"
    },
    {
      "step": "2 (Pairs)",
      "duration": 5,
      "activity": "Share ideas in pairs, build on each other"
    },
    {
      "step": "4 (Small Groups)",
      "duration": 10,
      "activity": "Combine pairs, synthesize key ideas"
    },
    {
      "step": "All (Full Group)",
      "duration": 10,
      "activity": "Each group shares top 1-2 insights"
    }
  ],
  "benefits": [
    "Everyone participates",
    "Ideas refined through iteration",
    "Introverts have voice",
    "Generates high-quality insights"
  ]
}
```

#### TRIZ Pattern
**Use Case:** Identifying and eliminating negative patterns

**Structure:**
```json
{
  "pattern": "TRIZ",
  "question": "How could we guarantee the WORST possible outcome?",
  "steps": [
    {
      "step": "Generate Bad Ideas",
      "duration": 10,
      "activity": "Brainstorm ways to fail spectacularly"
    },
    {
      "step": "Identify Current Practices",
      "duration": 10,
      "activity": "Which bad ideas are we actually doing?"
    },
    {
      "step": "Stop Doing",
      "duration": 10,
      "activity": "Commit to stopping harmful practices"
    }
  ]
}
```

### 4. The "Decision-Making" Framework

**For Meetings Requiring Clear Decisions:**

**Structure:**
```json
{
  "framework": "RAPID Decision Framework",
  "roles": {
    "R": "Recommend - Proposes action",
    "A": "Agree - Must agree before decision",
    "P": "Perform - Executes decision",
    "I": "Input - Provides input",
    "D": "Decide - Makes final decision"
  },
  "agenda": [
    {
      "phase": "Frame Decision",
      "duration": 5,
      "owner": "Recommender",
      "activity": "Clearly state decision to be made",
      "output": "Decision statement"
    },
    {
      "phase": "Present Recommendation",
      "duration": 10,
      "owner": "Recommender",
      "activity": "Present analysis, options, recommendation",
      "include": ["Data", "Trade-offs", "Risks"]
    },
    {
      "phase": "Input Gathering",
      "duration": 15,
      "owner": "Input providers",
      "activity": "Share perspectives, concerns, additional data"
    },
    {
      "phase": "Agreement Check",
      "duration": 5,
      "owner": "Agree role",
      "activity": "State objections or give approval"
    },
    {
      "phase": "Decision",
      "duration": 5,
      "owner": "Decider",
      "activity": "Make final decision",
      "output": "Clear decision with rationale"
    },
    {
      "phase": "Implementation Planning",
      "duration": 10,
      "owner": "Performer",
      "activity": "Outline next steps and timeline"
    }
  ]
}
```

## Time Allocation Strategies

### The "3-5-3" Rule

**For 60-Minute Meetings:**
- **First 3 minutes**: Context setting, agenda review
- **Middle 50 minutes**: Core discussion/work
- **Last 3-5 minutes**: Summarize, action items, next steps

**Benefits:**
- Crisp start and end
- Prevents meetings running over
- Ensures clarity on outcomes

### The "Parkinson's Law" Approach

**Principle:** Work expands to fill time allocated

**Strategy:**
- Allocate 20% less time than seems necessary
- Forces focus and efficiency
- Example: 40 minutes instead of 60

### The "Energy Curve" Allocation

**Based on Attention Patterns:**
```json
{
  "0-10min": {
    "energy": "high",
    "allocation": "Most important topics",
    "type": "Decision-making, critical discussion"
  },
  "10-35min": {
    "energy": "medium-high",
    "allocation": "Core work, detailed discussion",
    "type": "Problem-solving, brainstorming"
  },
  "35-45min": {
    "energy": "declining",
    "allocation": "Less demanding topics",
    "type": "Updates, information sharing"
  },
  "45-50min": {
    "energy": "low",
    "allocation": "Summary and wrap-up",
    "type": "Action items, next steps"
  }
}
```

## Facilitation Techniques

### 1. The "Parking Lot"

**Purpose:** Capture off-topic items without derailing

**Implementation:**
```javascript
const parkingLot = {
  items: [],

  add: (item, raisedBy) => {
    parkingLot.items.push({
      topic: item,
      raisedBy,
      timestamp: new Date()
    });
    console.log(`Parked: ${item} - we'll address this later`);
  },

  review: () => {
    console.log('Parking Lot Review:');
    parkingLot.items.forEach(item => {
      // Decide: schedule follow-up, assign owner, or discard
      console.log(`- ${item.topic}`);
    });
  }
};
```

### 2. The "Fist to Five" Consensus Check

**Quick consensus assessment:**
- **5 fingers**: Strongly agree
- **4 fingers**: Agree
- **3 fingers**: Neutral/can live with it
- **2 fingers**: Disagree but won't block
- **1 finger**: Strong disagreement
- **Fist**: Will block

**Usage:**
```json
{
  "technique": "Fist to Five",
  "when": "After discussion, before decision",
  "process": [
    "Facilitator states proposal clearly",
    "Everyone raises hand with fist to five",
    "If all 3+, decision made",
    "If any 1-2, hear concerns and adjust",
    "Revote after addressing concerns"
  ]
}
```

### 3. The "Silent Writing" Technique

**Prevents groupthink, ensures all voices:**

**Process:**
1. **Pose question** (written on board/screen)
2. **Silent writing** (5-7 minutes)
3. **Share ideas** (round-robin, no discussion yet)
4. **Group similar ideas**
5. **Discuss** (now with full context)

### 4. The "Round Robin" Technique

**Ensures balanced participation:**

**Rules:**
- Go around the table/virtual room
- Everyone gets equal time (e.g., 2 minutes)
- No interruptions during someone's turn
- Can say "pass" but get another chance later

### 5. The "Timebox with Alarm" Technique

**Strict time management:**
```javascript
class MeetingTimer {
  setAgendaItem(topic, duration) {
    console.log(`Starting: ${topic} (${duration} minutes)`);

    // Warning at 80% time
    setTimeout(() => {
      console.log('⚠️ 2 minutes remaining');
    }, duration * 0.8 * 60 * 1000);

    // End alarm
    setTimeout(() => {
      console.log(`⏰ Time's up for ${topic}`);
      this.promptTransition();
    }, duration * 60 * 1000);
  }

  promptTransition() {
    // Ask: move on or extend?
    const extend = askGroup('Extend discussion? (costs next topic time)');
    if (extend) {
      this.extendTime(3); // 3 more minutes
    } else {
      this.moveToNext();
    }
  }
}
```

## Participation Patterns

### The "Think-Pair-Share" Pattern

**Structure:**
```json
{
  "pattern": "Think-Pair-Share",
  "steps": [
    {
      "step": "Think",
      "duration": 2,
      "activity": "Individual reflection on question"
    },
    {
      "step": "Pair",
      "duration": 5,
      "activity": "Discuss with partner"
    },
    {
      "step": "Share",
      "duration": 10,
      "activity": "Pairs share with larger group"
    }
  ],
  "benefits": [
    "Processes ideas before speaking",
    "Builds confidence",
    "Generates higher quality contributions"
  ]
}
```

### The "Breakout Groups" Pattern

**For Large Meetings:**
```json
{
  "pattern": "Breakout Groups",
  "when": "7+ participants",
  "structure": [
    {
      "phase": "Full Group",
      "duration": 10,
      "activity": "Frame problem/question"
    },
    {
      "phase": "Breakouts",
      "duration": 15,
      "activity": "Small group discussion (3-4 people)",
      "output": "Each group synthesizes key insights"
    },
    {
      "phase": "Report Back",
      "duration": 15,
      "activity": "Each group shares top 2-3 insights"
    },
    {
      "phase": "Full Group",
      "duration": 10,
      "activity": "Synthesize across groups, decide next steps"
    }
  ]
}
```

## Agenda Anti-Patterns to Avoid

### 1. The "Information Dump"
- **Problem:** 45 minutes of one-way presentation
- **Fix:** Send materials in advance, use meeting for Q&A

### 2. The "Open-Ended Discussion"
- **Problem:** No time limits, rambling conversations
- **Fix:** Time-box topics, use facilitation techniques

### 3. The "Decision-Free Meeting"
- **Problem:** Discuss endlessly but decide nothing
- **Fix:** Build in decision points, use RAPID framework

### 4. The "Last-Minute Agenda"
- **Problem:** Agenda sent 5 minutes before meeting
- **Fix:** 24-48 hour advance notice rule

### 5. The "Too Many Topics"
- **Problem:** 10 topics in 30 minutes
- **Fix:** Maximum 3-5 topics, be realistic about time

### 6. The "No Breaks" Marathon
- **Problem:** 2+ hours without breaks
- **Fix:** 10-minute break every 60-90 minutes

## Agenda Templates by Meeting Type

### 1. Problem-Solving Meeting
```json
{
  "agenda": [
    {
      "topic": "Define Problem",
      "duration": "15%",
      "activity": "Clearly articulate the problem"
    },
    {
      "topic": "Root Cause Analysis",
      "duration": "25%",
      "activity": "Use 5 Whys or fishbone diagram"
    },
    {
      "topic": "Generate Solutions",
      "duration": "30%",
      "activity": "Brainstorm, evaluate options"
    },
    {
      "topic": "Decide & Plan",
      "duration": "25%",
      "activity": "Choose solution, plan implementation"
    },
    {
      "topic": "Wrap-up",
      "duration": "5%",
      "activity": "Summarize, assign action items"
    }
  ]
}
```

### 2. Alignment Meeting
```json
{
  "agenda": [
    {
      "topic": "Current State",
      "duration": "20%",
      "activity": "Where are we now?"
    },
    {
      "topic": "Desired Future State",
      "duration": "20%",
      "activity": "Where do we want to be?"
    },
    {
      "topic": "Gap Analysis",
      "duration": "20%",
      "activity": "What's the difference?"
    },
    {
      "topic": "Strategy Discussion",
      "duration": "30%",
      "activity": "How do we close the gap?"
    },
    {
      "topic": "Agreement & Next Steps",
      "duration": "10%",
      "activity": "Confirm alignment, assign owners"
    }
  ]
}
```

### 3. Feedback Meeting
```json
{
  "agenda": [
    {
      "topic": "Context Setting",
      "duration": "10%",
      "activity": "Purpose of feedback, ground rules"
    },
    {
      "topic": "Present Work/Situation",
      "duration": "20%",
      "activity": "Share what needs feedback"
    },
    {
      "topic": "Clarifying Questions",
      "duration": "15%",
      "activity": "Ensure understanding"
    },
    {
      "topic": "Feedback Sharing",
      "duration": "35%",
      "activity": "Structured feedback (e.g., I like, I wish, I wonder)"
    },
    {
      "topic": "Synthesis & Next Steps",
      "duration": "20%",
      "activity": "Summarize themes, plan revisions"
    }
  ]
}
```

## Integration with Meeting-Prep-Agent

```javascript
async function generateAgenda(meetingType, duration, objectives) {
  const framework = selectFramework(meetingType);
  const timeAllocations = calculateTimeAllocations(framework, duration);

  const agenda = {
    meetingType,
    duration,
    objectives,
    framework: framework.name,
    items: timeAllocations.map(item => ({
      topic: item.topic,
      duration: item.duration,
      type: item.type,
      facilitation: selectFacilitationTechnique(item),
      successCriteria: defineSuccessCriteria(item)
    })),
    facilitationNotes: framework.facilitationTips,
    materials: framework.requiredMaterials
  };

  return agenda;
}
```

## Best Practices

1. **Start with Objective**: Every agenda item should connect to meeting objective
2. **Time Buffer**: Allocate 10-15% buffer time
3. **Energy Awareness**: Put critical items when energy is highest
4. **Participation Design**: Plan how everyone will contribute
5. **Decision Clarity**: Explicit decision points with clear owners
6. **Flexibility**: Be willing to adjust mid-meeting if needed
7. **Test Run**: For critical meetings, do a dry run

## Learning Integration (ReasoningBank)

This skill is learning-enabled through ReasoningBank SAFLA integration.

### What This Skill Learns

- **Pattern Recognition**: Effective agenda structures for different meeting objectives, optimal time allocations per framework, successful facilitation techniques for specific group sizes
- **Success Criteria**: Meeting goals achieved, participants report good use of time, decisions made efficiently, engagement rating >4/5
- **Confidence Growth**: Frameworks gain confidence through repeated successful facilitations with high participant satisfaction

### Learning Workflow

1. **Before Execution**: Query ReasoningBank for relevant patterns
   - Namespace: `meeting-preparation`
   - Context: Meeting objective, group size, decision type, facilitation style needed
   - Top 5 most confident agenda frameworks retrieved

2. **During Execution**: Apply learned patterns to structure meeting
   - Select framework based on historical success for similar objectives
   - Adjust time allocations using learned efficiency patterns
   - Recommend facilitation techniques proven for this group dynamic

3. **After Execution**: Record outcome and update confidence
   - Success (goals achieved, high engagement, efficient use of time) → +20% confidence boost
   - Failure (objectives missed, poor engagement, time wasted) → -15% confidence reduction
   - Store new patterns from innovative agenda structures that worked

### Example: Learning in Action

**Before Learning (Week 1):**
```javascript
Meeting: "Strategic product prioritization"
Framework Used: Generic discussion format
Time Allocation: Equal time for all topics
Outcome: Ran 30 minutes over, no clear decisions, low engagement (2.5/5)
Issue: "Too much time spent debating, not enough structure"
```

**After Learning (Week 6):**
```javascript
Meeting: "Q2 product prioritization"
Learned Pattern: "Product prioritization: Use 1-2-4-All pattern + Impact/Effort matrix (confidence: 0.92)"
Framework: Liberating Structures 1-2-4-All (15min) → Impact/Effort plotting (20min) → Decision (10min)
Outcome: Finished 5 minutes early, clear priorities set, high engagement (4.7/5)
Result: Pattern confidence → 0.95
```

**Real-World Impact:**
- Week 1: 35% of decision meetings reach clear conclusions
- Week 6: 85% of decision meetings produce actionable outcomes
- Learned that Lean Coffee format works best for team standups with >7 people
- Discovered Amazon 6-Pager method reduces meeting time by 40% for complex proposals
- Found that TRIZ facilitation technique increases idea quality by 30% for problem-solving sessions

### Pattern Storage Schema

```json
{
  "id": "pattern-agenda-product-prioritization",
  "content": "Product prioritization meetings: Use 1-2-4-All pattern for idea generation (15min), then Impact/Effort matrix plotting (20min), followed by structured decision-making with RAPID framework (10min)",
  "namespace": "meeting-preparation",
  "confidence": 0.92,
  "context": {
    "meetingObjective": "prioritization",
    "framework": "1-2-4-All + Impact/Effort + RAPID",
    "groupSize": "6-12",
    "totalDuration": 45,
    "phases": [
      { "name": "1-2-4-All ideation", "duration": 15, "technique": "liberating-structures" },
      { "name": "Impact/Effort plotting", "duration": 20, "technique": "matrix-analysis" },
      { "name": "Decision with RAPID", "duration": 10, "technique": "rapid-framework" }
    ],
    "successFactors": ["structured-ideation", "visual-framework", "clear-decision-process"]
  },
  "outcomes": {
    "success_count": 22,
    "failure_count": 2,
    "last_outcome": "success",
    "avg_engagement_rating": 4.6,
    "avg_decision_quality": 4.3,
    "time_efficiency": 0.95
  }
}
```

### Integration Code Example

```typescript
// Example showing how this skill queries and learns
import { reasoningBankService } from '@/services/safla-service';

async function designOptimalAgenda(
  objective: string,
  participants: number,
  duration: number,
  decisionRequired: boolean
) {
  // 1. Query learned patterns
  const queryContext = `${objective} meeting with ${participants} participants, ${duration} minutes, decision: ${decisionRequired}`;
  const patterns = await reasoningBankService.queryPatterns(
    queryContext,
    'meeting-preparation',
    5
  );

  // 2. Select framework and apply learned optimizations
  let selectedFramework = selectBaseFramework(objective, decisionRequired);

  if (patterns.length > 0 && patterns[0].confidence > 0.75) {
    const learnedPattern = patterns[0];

    // Apply learned framework if significantly more confident
    if (learnedPattern.context.framework) {
      selectedFramework = {
        name: learnedPattern.context.framework,
        phases: learnedPattern.context.phases || selectedFramework.phases,
        successProbability: learnedPattern.confidence,
        basedOn: `${learnedPattern.outcomes.success_count} successful uses`
      };
    }
  }

  // 3. Optimize time allocations using learned patterns
  const optimizedPhases = selectedFramework.phases.map(phase => {
    const learnedTiming = patterns.find(p =>
      p.context.phases?.some(lp => lp.name === phase.name)
    );

    return {
      ...phase,
      duration: learnedTiming?.context.phases.find(lp => lp.name === phase.name)?.duration || phase.duration,
      confidence: learnedTiming?.confidence || 0.5
    };
  });

  // 4. Add facilitation technique recommendations
  const facilitationRecommendations = patterns
    .filter(p => p.confidence > 0.7)
    .map(p => ({
      technique: p.context.framework,
      confidence: p.confidence,
      whenToUse: p.content,
      successRate: p.outcomes.success_count / (p.outcomes.success_count + p.outcomes.failure_count)
    }));

  return {
    framework: {
      ...selectedFramework,
      phases: optimizedPhases
    },
    facilitationRecommendations,
    learnedFrom: patterns.slice(0, 3),

    // 5. Outcome tracking
    recordOutcome: async (
      goalsAchieved: boolean,
      engagementRating: number,
      timeEfficiency: number, // 0-1 scale
      participantFeedback: string[]
    ) => {
      const success = goalsAchieved && engagementRating >= 4 && timeEfficiency > 0.85;

      for (const pattern of patterns) {
        await reasoningBankService.recordOutcome(
          pattern.id,
          success ? 'success' : 'failure',
          {
            context: {
              objective,
              participants,
              duration,
              goalsAchieved,
              engagementRating,
              timeEfficiency,
              feedback: participantFeedback.join('; ')
            },
            executionTimeMs: duration * 60 * 1000
          }
        );
      }

      // Store novel successful approach as new pattern
      if (success && !patterns.some(p => p.context.framework === selectedFramework.name)) {
        await reasoningBankService.createPattern({
          content: `${objective} meetings: ${selectedFramework.name} framework achieves high engagement (${engagementRating}/5) and goals`,
          namespace: 'meeting-preparation',
          category: 'agenda-framework',
          metadata: {
            framework: selectedFramework.name,
            objective,
            participants,
            engagementRating,
            timeEfficiency
          }
        });
      }
    }
  };
}
```

## References
- Meeting Templates: `/prod/skills/agent-specific/meeting-prep-agent/meeting-templates/SKILL.md`
- Note-Taking: `/prod/skills/agent-specific/meeting-prep-agent/note-taking/SKILL.md`
- Facilitation Guides: Liberating Structures, Lean Coffee, Amazon Working Backwards
