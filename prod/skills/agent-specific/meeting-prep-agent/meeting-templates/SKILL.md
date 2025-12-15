---
name: Meeting Templates
description: Structured meeting templates for 1-on-1s, team meetings, client meetings, and strategic sessions with agendas and success criteria
version: "1.0.0"
category: agent-specific
agent: meeting-prep-agent
_protected: false
---

# Meeting Templates Skill

## Purpose
Provides comprehensive, battle-tested meeting templates for various meeting types with pre-built agendas, time allocations, success criteria, and best practices. Ensures meetings are productive, focused, and drive actionable outcomes.

## When to Use This Skill
- Preparing for any type of meeting
- Creating meeting agendas
- Structuring discussion topics
- Defining meeting outcomes
- Allocating time appropriately
- Setting success criteria

## Meeting Template Structure

### Standard Template Format
```json
{
  "meetingType": "1-on-1|team|client|strategic|retrospective",
  "title": "Meeting title",
  "duration": 30,
  "participants": [],
  "objective": "Clear statement of meeting purpose",
  "agenda": [
    {
      "topic": "Topic name",
      "duration": 10,
      "owner": "presenter",
      "type": "discussion|decision|update|brainstorm"
    }
  ],
  "preparation": {
    "organizer": [],
    "participants": []
  },
  "successCriteria": [],
  "followUp": {
    "notes": true,
    "actionItems": true,
    "nextMeeting": false
  }
}
```

## Template 1: One-on-One Meeting

### Manager-Employee 1-on-1
**Duration:** 30-60 minutes
**Frequency:** Weekly or bi-weekly

**Objective:** Build rapport, provide feedback, discuss development, and address concerns

**Agenda Template:**
```json
{
  "meetingType": "1-on-1",
  "title": "Weekly 1-on-1: [Manager] & [Employee]",
  "duration": 45,
  "agenda": [
    {
      "topic": "Check-in & Personal Updates",
      "duration": 5,
      "owner": "both",
      "type": "discussion",
      "questions": [
        "How are you doing personally?",
        "What's on your mind this week?"
      ]
    },
    {
      "topic": "Employee's Topics (Employee-driven)",
      "duration": 15,
      "owner": "employee",
      "type": "discussion",
      "notes": "Employee brings agenda items, concerns, questions"
    },
    {
      "topic": "Project Updates & Blockers",
      "duration": 10,
      "owner": "employee",
      "type": "update",
      "questions": [
        "What projects are you working on?",
        "Any blockers or challenges?",
        "Do you need any support?"
      ]
    },
    {
      "topic": "Feedback & Coaching",
      "duration": 10,
      "owner": "manager",
      "type": "discussion",
      "notes": "Constructive feedback, recognition, coaching moments"
    },
    {
      "topic": "Career Development",
      "duration": 5,
      "owner": "both",
      "type": "discussion",
      "questions": [
        "Progress on development goals?",
        "New learning opportunities?",
        "Long-term career aspirations?"
      ]
    }
  ],
  "preparation": {
    "manager": [
      "Review previous 1-on-1 notes",
      "Prepare specific feedback examples",
      "Think about development opportunities"
    ],
    "employee": [
      "Prepare discussion topics",
      "Update on project status",
      "Note any concerns or questions"
    ]
  },
  "successCriteria": [
    "Employee feels heard and supported",
    "Feedback delivered and received",
    "Action items identified for both parties",
    "Connection and trust maintained"
  ]
}
```

### Peer 1-on-1
**Duration:** 30 minutes
**Frequency:** Monthly or as-needed

**Focus:** Collaboration, knowledge sharing, mutual support

**Agenda:**
```json
{
  "agenda": [
    {
      "topic": "Recent Wins & Challenges",
      "duration": 10,
      "notes": "Share what's going well and what's difficult"
    },
    {
      "topic": "Collaboration Opportunities",
      "duration": 10,
      "notes": "Identify ways to work together"
    },
    {
      "topic": "Knowledge Sharing",
      "duration": 5,
      "notes": "Share learnings, tools, best practices"
    },
    {
      "topic": "Mutual Support",
      "duration": 5,
      "notes": "How can we help each other?"
    }
  ]
}
```

## Template 2: Team Meeting

### Weekly Team Standup
**Duration:** 30 minutes
**Frequency:** Weekly

**Objective:** Align on priorities, share updates, identify blockers

**Agenda Template:**
```json
{
  "meetingType": "team",
  "title": "Weekly Team Standup",
  "duration": 30,
  "agenda": [
    {
      "topic": "Wins from Last Week",
      "duration": 5,
      "owner": "all",
      "type": "update",
      "format": "Round-robin, 30 seconds each"
    },
    {
      "topic": "This Week's Priorities",
      "duration": 10,
      "owner": "all",
      "type": "update",
      "format": "Each person shares top 2-3 priorities"
    },
    {
      "topic": "Blockers & Challenges",
      "duration": 10,
      "owner": "all",
      "type": "discussion",
      "notes": "Identify blockers, assign owners to resolve"
    },
    {
      "topic": "Cross-Team Collaboration",
      "duration": 3,
      "owner": "team lead",
      "type": "update",
      "notes": "Dependencies, handoffs, coordination needs"
    },
    {
      "topic": "Announcements",
      "duration": 2,
      "owner": "team lead",
      "type": "update"
    }
  ],
  "preparation": {
    "participants": [
      "Review last week's action items",
      "Prepare priority list for this week",
      "Note any blockers or questions"
    ]
  },
  "successCriteria": [
    "All team members aligned on priorities",
    "Blockers identified with owners assigned",
    "Everyone knows what everyone else is working on"
  ],
  "rules": [
    "Start and end on time",
    "Keep updates concise",
    "Park detailed discussions for after",
    "Focus on information sharing, not problem-solving"
  ]
}
```

### Monthly Team Retrospective
**Duration:** 60 minutes
**Frequency:** Monthly

**Objective:** Reflect on what's working, identify improvements

**Agenda:**
```json
{
  "meetingType": "retrospective",
  "title": "Monthly Team Retrospective",
  "duration": 60,
  "agenda": [
    {
      "topic": "Set the Stage",
      "duration": 5,
      "notes": "Review retrospective goals and ground rules"
    },
    {
      "topic": "What Went Well",
      "duration": 15,
      "type": "brainstorm",
      "format": "Silent writing → grouping → discussion"
    },
    {
      "topic": "What Could Be Better",
      "duration": 15,
      "type": "brainstorm",
      "format": "Silent writing → grouping → discussion"
    },
    {
      "topic": "Insights & Patterns",
      "duration": 10,
      "type": "discussion",
      "notes": "Identify themes and root causes"
    },
    {
      "topic": "Action Items",
      "duration": 10,
      "type": "decision",
      "notes": "Decide on 2-3 improvements to implement",
      "output": "Specific actions with owners and deadlines"
    },
    {
      "topic": "Retrospective Feedback",
      "duration": 5,
      "notes": "Meta-retrospective: how can we improve retrospectives?"
    }
  ],
  "successCriteria": [
    "2-3 actionable improvements identified",
    "All team members participated",
    "Constructive, blameless discussion",
    "Actions have clear owners and deadlines"
  ]
}
```

## Template 3: Client Meeting

### Client Kickoff Meeting
**Duration:** 60 minutes
**Objective:** Align on project scope, expectations, and success criteria

**Agenda:**
```json
{
  "meetingType": "client",
  "title": "Project Kickoff: [Project Name]",
  "duration": 60,
  "agenda": [
    {
      "topic": "Introductions",
      "duration": 5,
      "notes": "Names, roles, and communication preferences"
    },
    {
      "topic": "Project Overview",
      "duration": 10,
      "owner": "project lead",
      "type": "update",
      "topics": [
        "Project objectives",
        "Scope and deliverables",
        "Timeline and milestones"
      ]
    },
    {
      "topic": "Roles & Responsibilities",
      "duration": 10,
      "type": "discussion",
      "notes": "Who does what, decision-making authority"
    },
    {
      "topic": "Communication Plan",
      "duration": 10,
      "type": "decision",
      "topics": [
        "Meeting cadence",
        "Communication channels",
        "Escalation process",
        "Status reporting"
      ]
    },
    {
      "topic": "Success Criteria",
      "duration": 15,
      "type": "discussion",
      "notes": "Define what success looks like, measurable outcomes"
    },
    {
      "topic": "Next Steps",
      "duration": 5,
      "type": "decision",
      "output": "Action items with owners and deadlines"
    },
    {
      "topic": "Q&A",
      "duration": 5,
      "type": "discussion"
    }
  ],
  "preparation": {
    "organizer": [
      "Prepare project overview presentation",
      "Draft communication plan",
      "Define preliminary success criteria"
    ],
    "client": [
      "Review project scope",
      "Prepare questions and concerns",
      "Identify key stakeholders"
    ]
  },
  "successCriteria": [
    "Mutual understanding of project scope",
    "Communication plan agreed upon",
    "Success criteria defined",
    "Next steps clear with ownership"
  ]
}
```

### Client Status Update
**Duration:** 30 minutes
**Frequency:** Weekly or bi-weekly

**Agenda:**
```json
{
  "meetingType": "client",
  "title": "Project Status Update",
  "duration": 30,
  "agenda": [
    {
      "topic": "Accomplishments Since Last Meeting",
      "duration": 5,
      "type": "update",
      "format": "Brief highlights, visual progress tracker"
    },
    {
      "topic": "Demo (if applicable)",
      "duration": 10,
      "type": "demo",
      "notes": "Show completed work, get feedback"
    },
    {
      "topic": "Upcoming Work",
      "duration": 5,
      "type": "update",
      "notes": "Next 1-2 weeks priorities"
    },
    {
      "topic": "Blockers & Risks",
      "duration": 5,
      "type": "discussion",
      "notes": "Identify issues requiring client input or decision"
    },
    {
      "topic": "Client Feedback & Questions",
      "duration": 5,
      "type": "discussion"
    }
  ],
  "successCriteria": [
    "Client understands current progress",
    "Blockers escalated and addressed",
    "Feedback incorporated into plan"
  ]
}
```

## Template 4: Strategic Meeting

### Quarterly Planning Session
**Duration:** 2-3 hours
**Objective:** Set quarterly objectives and key results (OKRs)

**Agenda:**
```json
{
  "meetingType": "strategic",
  "title": "Q[X] Planning Session",
  "duration": 180,
  "agenda": [
    {
      "topic": "Previous Quarter Review",
      "duration": 30,
      "type": "update",
      "topics": [
        "OKRs achievement",
        "What worked well",
        "What didn't work",
        "Key learnings"
      ]
    },
    {
      "topic": "Market & Competitive Landscape",
      "duration": 20,
      "type": "update",
      "notes": "External factors influencing strategy"
    },
    {
      "topic": "Strategic Priorities",
      "duration": 30,
      "type": "discussion",
      "notes": "Top 3-5 company/team priorities for quarter"
    },
    {
      "topic": "Break",
      "duration": 10
    },
    {
      "topic": "OKR Drafting",
      "duration": 60,
      "type": "brainstorm",
      "format": "Small groups draft objectives, then share out"
    },
    {
      "topic": "OKR Finalization",
      "duration": 20,
      "type": "decision",
      "output": "Finalized OKRs with owners"
    },
    {
      "topic": "Resource Allocation",
      "duration": 10,
      "type": "decision",
      "notes": "Align resources to priorities"
    }
  ],
  "preparation": {
    "participants": [
      "Review last quarter's OKRs",
      "Gather performance data",
      "Think about strategic priorities"
    ]
  },
  "successCriteria": [
    "3-5 clear quarterly objectives defined",
    "Measurable key results for each objective",
    "Ownership assigned",
    "Resource allocation aligned"
  ]
}
```

### Decision-Making Meeting
**Duration:** 60 minutes
**Objective:** Make a specific, important decision

**Agenda:**
```json
{
  "meetingType": "strategic",
  "title": "Decision: [Decision Topic]",
  "duration": 60,
  "agenda": [
    {
      "topic": "Decision Context",
      "duration": 10,
      "type": "update",
      "notes": "Why we're making this decision, stakes involved"
    },
    {
      "topic": "Options Presentation",
      "duration": 20,
      "type": "update",
      "format": "Structured comparison of 2-3 options",
      "include": [
        "Pros and cons",
        "Resource requirements",
        "Risks and mitigations",
        "Expected outcomes"
      ]
    },
    {
      "topic": "Discussion & Questions",
      "duration": 15,
      "type": "discussion",
      "notes": "Explore concerns, validate assumptions"
    },
    {
      "topic": "Decision",
      "duration": 10,
      "type": "decision",
      "process": "Consensus if possible, tiebreaker if needed",
      "output": "Clear decision with rationale"
    },
    {
      "topic": "Implementation Plan",
      "duration": 5,
      "type": "decision",
      "output": "Next steps, owners, timeline"
    }
  ],
  "preparation": {
    "organizer": [
      "Research options thoroughly",
      "Prepare comparison framework",
      "Identify decision criteria"
    ],
    "participants": [
      "Review options document",
      "Prepare questions and concerns"
    ]
  },
  "successCriteria": [
    "Decision made",
    "Rationale documented",
    "Implementation plan clear",
    "All stakeholders aligned"
  ]
}
```

## Template 5: Brainstorming Session

**Duration:** 60-90 minutes
**Objective:** Generate creative ideas for a specific challenge

**Agenda:**
```json
{
  "meetingType": "brainstorm",
  "title": "Brainstorm: [Challenge]",
  "duration": 90,
  "agenda": [
    {
      "topic": "Problem Framing",
      "duration": 10,
      "type": "discussion",
      "notes": "Clearly define the challenge we're solving"
    },
    {
      "topic": "Silent Ideation",
      "duration": 15,
      "type": "brainstorm",
      "notes": "Everyone writes ideas individually"
    },
    {
      "topic": "Idea Sharing",
      "duration": 20,
      "type": "brainstorm",
      "notes": "Round-robin sharing, no judgment"
    },
    {
      "topic": "Idea Grouping",
      "duration": 10,
      "notes": "Cluster similar ideas, identify themes"
    },
    {
      "topic": "Break",
      "duration": 5
    },
    {
      "topic": "Idea Expansion",
      "duration": 15,
      "type": "brainstorm",
      "notes": "Build on most promising ideas"
    },
    {
      "topic": "Evaluation & Prioritization",
      "duration": 10,
      "type": "decision",
      "criteria": ["Feasibility", "Impact", "Resources required"]
    },
    {
      "topic": "Next Steps",
      "duration": 5,
      "type": "decision",
      "output": "Top 3 ideas to explore further"
    }
  ],
  "rules": [
    "No idea is bad during brainstorming",
    "Build on others' ideas",
    "Quantity over quality initially",
    "Wild ideas encouraged",
    "Critique comes later, not during generation"
  ],
  "successCriteria": [
    "30+ ideas generated",
    "Top 3 ideas identified for further exploration",
    "Diverse perspectives included",
    "Creative energy maintained"
  ]
}
```

## Best Practices

### Meeting Preparation
1. **Send agenda 24-48 hours in advance**
2. **Include preparation materials**
3. **Set clear objective and success criteria**
4. **Time-box each agenda item**
5. **Assign roles (facilitator, note-taker, timekeeper)**

### During Meeting
1. **Start on time, end on time**
2. **Follow the agenda (but be flexible)**
3. **Capture action items with owners**
4. **Park off-topic discussions**
5. **Summarize decisions and next steps**

### After Meeting
1. **Send notes within 24 hours**
2. **Highlight action items and owners**
3. **Schedule follow-up if needed**
4. **Track action item completion**

### Meeting Efficiency
- **Default to 25 or 50 minutes** (not 30 or 60)
- **Decline meetings without clear agenda**
- **Question recurring meetings regularly**
- **Use async communication when possible**
- **Limit meeting attendees to those who contribute**

## Integration with Agent Feed

Meeting prep agent should post to agent feed:
- Meeting agenda created
- Key decisions made
- Action items assigned
- Follow-up scheduled

## Learning Integration (ReasoningBank)

This skill is learning-enabled through ReasoningBank SAFLA integration.

### What This Skill Learns

- **Pattern Recognition**: Successful meeting template selection for different meeting types, effective time allocations per agenda item, participant engagement patterns
- **Success Criteria**: Meeting completed within scheduled time (±10%), all agenda items covered, post-meeting effectiveness rating >3/5
- **Confidence Growth**: Templates gain confidence through repeated successful meetings with high effectiveness ratings

### Learning Workflow

1. **Before Execution**: Query ReasoningBank for relevant patterns
   - Namespace: `meeting-preparation`
   - Context: Meeting type, participant count, duration, objectives
   - Top 5 most confident templates and timing patterns retrieved

2. **During Execution**: Apply learned patterns to enhance meeting setup
   - Weight template selection by historical success rates
   - Adjust time allocations based on learned participant patterns
   - Recommend agenda modifications based on similar past meetings

3. **After Execution**: Record outcome and update confidence
   - Success (on time, high effectiveness, goals achieved) → +20% confidence boost
   - Failure (ran over, objectives missed, low ratings) → -15% confidence reduction
   - Store new patterns from novel meeting formats or unexpected outcomes

### Example: Learning in Action

**Before Learning (Month 1):**
```javascript
Meeting Type: "1-on-1 with manager"
Template Used: Standard 30-minute 1-on-1
Actual Duration: 45 minutes (50% over)
Effectiveness Rating: 3/5
Issues: "Not enough time for career development discussion"
```

**After Learning (Month 3):**
```javascript
Meeting Type: "1-on-1 with manager"
Learned Pattern: "Manager 1-on-1s: allocate 15min for career development (confidence: 0.88)"
Template Adjustment: 45-minute format with dedicated 15min career block
Actual Duration: 43 minutes (within target)
Effectiveness Rating: 4.5/5
Result: Pattern confidence → 0.92
```

**Real-World Impact:**
- Month 1: 55% of meetings finish on time
- Month 3: 90% of meetings finish within 10% of scheduled duration
- Learned that team standups run 5 minutes longer when >8 participants
- Automatically suggests "async update + discussion" format for >10 participants
- Discovered morning meetings (9-11 AM) have 25% higher engagement ratings

### Pattern Storage Schema

```json
{
  "id": "pattern-meeting-1on1-manager",
  "content": "Manager 1-on-1 meetings: allocate minimum 45 minutes with 15-minute dedicated career development block at end",
  "namespace": "meeting-preparation",
  "confidence": 0.88,
  "context": {
    "meetingType": "1-on-1",
    "participantRole": "manager-employee",
    "recommendedDuration": 45,
    "criticalAgendaItems": ["career-development"],
    "timeAllocations": {
      "check-in": 5,
      "employee-topics": 15,
      "projects": 10,
      "career-development": 15
    }
  },
  "outcomes": {
    "success_count": 18,
    "failure_count": 3,
    "last_outcome": "success",
    "avg_effectiveness_rating": 4.3,
    "avg_time_accuracy": 0.95
  }
}
```

### Integration Code Example

```typescript
// Example showing how this skill queries and learns
import { reasoningBankService } from '@/services/safla-service';

async function selectOptimalMeetingTemplate(
  meetingType: string,
  participants: number,
  duration: number,
  objectives: string[]
) {
  // 1. Query learned patterns
  const queryContext = `${meetingType} meeting with ${participants} participants, objectives: ${objectives.join(', ')}`;
  const patterns = await reasoningBankService.queryPatterns(
    queryContext,
    'meeting-preparation',
    5
  );

  // 2. Select template and apply learned adjustments
  let baseTemplate = getBaseTemplate(meetingType);

  // Apply highest confidence pattern adjustments
  if (patterns.length > 0 && patterns[0].confidence > 0.75) {
    const learnedPattern = patterns[0];

    baseTemplate = {
      ...baseTemplate,
      duration: learnedPattern.context.recommendedDuration || duration,
      agenda: enhanceAgendaWithLearnings(
        baseTemplate.agenda,
        learnedPattern.context.timeAllocations
      ),
      successProbability: learnedPattern.confidence
    };
  }

  // 3. Add pattern-based recommendations
  const recommendations = patterns
    .filter(p => p.confidence > 0.7)
    .map(p => ({
      suggestion: p.content,
      confidence: p.confidence,
      basedOn: `${p.outcomes.success_count} successful meetings`
    }));

  return {
    template: baseTemplate,
    recommendations,
    learnedFrom: patterns.slice(0, 3),

    // 4. Outcome tracking function
    recordOutcome: async (
      actualDuration: number,
      effectivenessRating: number,
      allItemsCovered: boolean
    ) => {
      const timeAccuracy = 1 - Math.abs(actualDuration - baseTemplate.duration) / baseTemplate.duration;
      const success = timeAccuracy > 0.9 && effectivenessRating >= 3 && allItemsCovered;

      for (const pattern of patterns) {
        await reasoningBankService.recordOutcome(
          pattern.id,
          success ? 'success' : 'failure',
          {
            context: {
              meetingType,
              participants,
              actualDuration,
              plannedDuration: baseTemplate.duration,
              effectivenessRating,
              allItemsCovered
            },
            executionTimeMs: actualDuration * 60 * 1000
          }
        );
      }

      // Create new pattern if novel approach worked well
      if (success && patterns.length === 0) {
        await reasoningBankService.createPattern({
          content: `${meetingType} meeting: ${actualDuration} minutes works well for ${participants} participants`,
          namespace: 'meeting-preparation',
          category: meetingType,
          metadata: { participants, duration: actualDuration, effectivenessRating }
        });
      }
    }
  };
}
```

## References
- Agenda Frameworks: `/prod/skills/agent-specific/meeting-prep-agent/agenda-frameworks/SKILL.md`
- Note-Taking: `/prod/skills/agent-specific/meeting-prep-agent/note-taking/SKILL.md`
- Productivity Patterns: `/prod/skills/shared/productivity-patterns/SKILL.md`
