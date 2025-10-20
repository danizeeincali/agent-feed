---
name: Note-Taking
description: Meeting note-taking patterns, action item tracking, and documentation best practices for capturing and sharing meeting outcomes
version: "1.0.0"
category: agent-specific
agent: meeting-prep-agent
_protected: false
---

# Note-Taking Skill

## Purpose
Provides structured note-taking frameworks, action item tracking systems, and documentation patterns to ensure meeting outcomes are captured, shared, and acted upon effectively.

## When to Use This Skill
- Taking notes during meetings
- Documenting decisions and action items
- Creating meeting summaries
- Tracking follow-up tasks
- Sharing meeting outcomes
- Building institutional knowledge

## Core Note-Taking Frameworks

### 1. The "Cornell Method"

**Structure:** Divide page into three sections

**Layout:**
```
┌─────────────────────────────────────────┬─────────────┐
│                                         │   Cues/     │
│           Main Notes                    │   Keywords  │
│           (Right Column)                │   (Left)    │
│                                         │             │
├─────────────────────────────────────────┴─────────────┤
│               Summary (Bottom)                        │
└───────────────────────────────────────────────────────┘
```

**Implementation:**
```markdown
## Meeting: [Title]
**Date:** [Date]
**Participants:** [Names]

### Notes

**Main Notes**                     | **Cues/Keywords**
-----------------------------------|-------------------
Discussed Q4 roadmap priorities    | Q4 Roadmap
- Feature A: High priority         | Feature A
- Feature B: Medium priority       | Feature B
Decision: Launch Feature A first   | Decision
Action: John to draft spec         | Action: John

### Summary
Agreed to prioritize Feature A for Q4 launch. John drafting spec by Friday.
```

### 2. The "Action-Oriented" Method

**Focus:** Capture decisions and action items first

**Structure:**
```markdown
# Meeting Notes: [Title]
**Date:** [Date] | **Facilitator:** [Name] | **Note-Taker:** [Name]

## 🎯 Objective
[Meeting purpose]

## ✅ Decisions Made
1. **Decision:** [What was decided]
   - **Rationale:** [Why]
   - **Impact:** [Who/what affected]
   - **Effective Date:** [When]

## 🔨 Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Draft proposal | Alice | 2025-10-25 | ⏳ Pending |
| Review data | Bob | 2025-10-22 | ⏳ Pending |

## 📋 Discussion Summary
### Topic 1: [Name]
- Key Point 1
- Key Point 2
- Outcome

### Topic 2: [Name]
- Key Point 1
- Key Point 2
- Outcome

## 🚫 Parking Lot
- Item 1 (raised by Charlie)
- Item 2 (raised by Dana)

## 🔜 Next Steps
- [ ] Schedule follow-up meeting
- [ ] Circulate notes
- [ ] Track action item progress
```

### 3. The "Q&A" Method

**Best for:** Presentations, information-sharing meetings

**Structure:**
```markdown
# Meeting Notes: [Title]

## Presenter: [Name]
## Topic: [Topic]

### Questions & Answers

**Q:** What is the expected ROI?
**A:** 3x return within 18 months based on market analysis

**Q:** What are the risks?
**A:**
- Market timing uncertainty
- Technical complexity
- Resource constraints

**Q:** What are next steps?
**A:**
1. Finalize business case
2. Present to leadership
3. Secure budget

### Key Takeaways
1. Strong business case with 3x ROI
2. Risks identified and mitigated
3. Next steps clear with timeline
```

### 4. The "Visual" Method

**Using Diagrams and Symbols:**

**Symbols:**
```
⭐ = Important point
❗ = Critical issue
✅ = Completed
⏳ = In progress
🔜 = Next action
💡 = Idea
❓ = Question/unclear
👤 = Person mentioned
📅 = Date/deadline
💰 = Cost/budget
```

**Example:**
```markdown
⭐ Q4 Priority: Feature A launch

❗ Critical blocker: API integration delay
   👤 Sarah investigating
   📅 Resolution needed by 10/25

💡 Idea: Parallel development approach
   ✅ Team agreed to try
   🔜 Alex to draft plan

💰 Budget request: $50K additional
   ❓ Waiting for finance approval
```

## Action Item Tracking

### Action Item Schema

```json
{
  "id": "action-uuid",
  "description": "Clear, actionable task description",
  "owner": "person-name",
  "dueDate": "2025-10-25",
  "status": "pending|in_progress|completed|blocked",
  "priority": "P0|P1|P2|P3",
  "context": "Why this action is needed",
  "dependencies": [],
  "created": "2025-10-18",
  "meetingId": "meeting-uuid",
  "updates": [
    {
      "date": "2025-10-20",
      "status": "in_progress",
      "note": "Started working on this"
    }
  ]
}
```

### Action Item Template

```markdown
## Action Items

### ⏳ Pending
- **Action:** Draft project proposal
  - **Owner:** Alice
  - **Due:** 2025-10-25
  - **Context:** Needed for leadership review
  - **Depends on:** Budget approval

### 🔄 In Progress
- **Action:** Review technical architecture
  - **Owner:** Bob
  - **Due:** 2025-10-22
  - **Status:** 60% complete
  - **Update:** Architecture diagram drafted, pending review

### ✅ Completed
- **Action:** Schedule follow-up meeting
  - **Owner:** Charlie
  - **Completed:** 2025-10-18
  - **Outcome:** Meeting scheduled for 10/25

### 🚫 Blocked
- **Action:** Finalize vendor contract
  - **Owner:** Dana
  - **Due:** 2025-10-20
  - **Blocker:** Waiting for legal review
  - **Escalation:** Follow up with legal on 10/19
```

## Decision Documentation

### Decision Record Template

```markdown
# Decision Record: [Title]

**Date:** [Date]
**Decision Maker(s):** [Names]
**Status:** Proposed | Accepted | Rejected | Superseded

## Context
What is the issue we're trying to solve?

## Decision
What did we decide to do?

## Rationale
Why did we make this decision?

## Alternatives Considered
1. **Option A:** [Description]
   - Pros: [List]
   - Cons: [List]
   - Reason not chosen: [Explanation]

2. **Option B:** [Description]
   - Pros: [List]
   - Cons: [List]
   - Reason not chosen: [Explanation]

## Consequences
- **Positive:** [Expected benefits]
- **Negative:** [Trade-offs, risks]
- **Neutral:** [Other impacts]

## Implementation
- **Timeline:** [When this takes effect]
- **Owners:** [Who is responsible]
- **Success Criteria:** [How we'll know it worked]

## Review Date
[When we'll revisit this decision]
```

## Meeting Note Templates by Type

### 1. Team Standup Notes

```markdown
# Team Standup - [Date]

## Attendees
[Names]

## What We Did Yesterday
- **Alice:** Completed feature X, started feature Y
- **Bob:** Fixed bug #123, reviewed PRs
- **Charlie:** Deployed to staging, tested integration

## Today's Priorities
- **Alice:** Finish feature Y
- **Bob:** Design feature Z
- **Charlie:** Production deployment

## Blockers
- **Bob:** Waiting for API documentation (Escalated to David)

## Announcements
- Code freeze starts Friday
- Team lunch tomorrow at noon
```

### 2. Client Meeting Notes

```markdown
# Client Meeting Notes
**Client:** [Company Name]
**Date:** [Date]
**Attendees:**
- **Our side:** [Names]
- **Client side:** [Names]

## Meeting Objective
[Purpose of meeting]

## Key Discussion Points
### Topic 1: [Name]
- **Client Concern:** [Description]
- **Our Response:** [Response]
- **Resolution:** [Outcome]

### Topic 2: [Name]
- **Client Request:** [Description]
- **Our Assessment:** [Analysis]
- **Agreement:** [What we agreed to]

## Decisions Made
1. [Decision 1]
2. [Decision 2]

## Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| Send proposal | Us - Alice | 10/25 |
| Review mockups | Client - Jane | 10/27 |

## Next Meeting
**Date:** [Date]
**Agenda:** [Topics]

## Follow-up Required
- [ ] Send meeting summary to client
- [ ] Update project plan
- [ ] Schedule internal alignment meeting
```

### 3. Retrospective Notes

```markdown
# Sprint Retrospective - Sprint [#]
**Date:** [Date]
**Facilitator:** [Name]
**Participants:** [Names]

## What Went Well ✅
- Delivered all sprint commitments
- Great collaboration on Feature X
- Improved test coverage

## What Could Be Better 🔄
- Too many meetings interrupted deep work
- Code review turnaround time too slow
- Unclear requirements for Feature Y

## Action Items 🔨
| Improvement | Owner | Status |
|------------|-------|--------|
| Implement "focus time" blocks | Team Lead | ⏳ |
| Set code review SLA (24h) | Team | ⏳ |
| Requirements checklist | Product | ⏳ |

## Experiments to Try 💡
1. **Quiet hours:** 9-11 AM no meetings
2. **Code review rotation:** Assigned pairs each week
3. **Definition of ready:** Checklist before sprint planning

## Kudos 🌟
- Shoutout to Alice for excellent mentoring
- Thanks to Bob for weekend deployment support
- Great job team on hitting our velocity goal!
```

### 4. Strategy Session Notes

```markdown
# Strategic Planning Session
**Date:** [Date]
**Participants:** [Names]
**Timeframe:** [Quarter/Year]

## Current State Assessment
### Strengths
- [List]

### Weaknesses
- [List]

### Opportunities
- [List]

### Threats
- [List]

## Strategic Priorities
1. **Priority 1:** [Description]
   - **Rationale:** [Why important]
   - **Success Metrics:** [How we'll measure]
   - **Owner:** [Name]

2. **Priority 2:** [Description]
   - **Rationale:** [Why important]
   - **Success Metrics:** [How we'll measure]
   - **Owner:** [Name]

## Resource Allocation
| Priority | Team Size | Budget | Timeline |
|----------|-----------|--------|----------|
| Priority 1 | 5 | $200K | Q4 |
| Priority 2 | 3 | $100K | Q1 |

## Key Decisions
1. [Decision]
2. [Decision]

## Next Steps
- [ ] Communicate strategy to organization
- [ ] Align OKRs to priorities
- [ ] Allocate resources
- [ ] Track progress monthly
```

## Best Practices

### During the Meeting

**1. Real-Time Capture:**
- Type notes directly during meeting
- Don't wait to clean up later
- Capture key points, not verbatim

**2. Listen Actively:**
- Focus on understanding, not just recording
- Ask clarifying questions
- Confirm action items and decisions

**3. Use Structure:**
- Follow template appropriate for meeting type
- Organize as you go
- Use headers, bullets, numbering

**4. Mark Action Items:**
- Call out action items explicitly
- Confirm owner and due date
- Note dependencies

### After the Meeting

**1. Immediate Cleanup (within 1 hour):**
- Clarify unclear points
- Format for readability
- Verify action item accuracy

**2. Distribution (within 24 hours):**
```markdown
**Email Subject:** Meeting Notes: [Title] - [Date]

**To:** [Attendees] + [Stakeholders]

Hi team,

Thank you for today's productive meeting. Please find notes below.

**Key Decisions:**
- [Decision 1]
- [Decision 2]

**Action Items:**
See detailed list below - please review and confirm your items.

**Next Meeting:** [Date/Time]

[Full meeting notes]

Best,
[Your name]
```

**3. Follow-up:**
- Track action item completion
- Send reminders before due dates
- Update status as items complete

## Integration with Tools

### Automatic Action Item Extraction

```javascript
function extractActionItems(notes) {
  const actionItemPatterns = [
    /\*\*Action:\*\* (.+)/g,
    /\[ \] (.+)/g,
    /@(\w+) to (.+)/g,
    /(\w+) will (.+) by (\d{4}-\d{2}-\d{2})/g
  ];

  const actionItems = [];

  actionItemPatterns.forEach(pattern => {
    const matches = notes.matchAll(pattern);
    for (const match of matches) {
      actionItems.push({
        description: match[1] || match[2],
        owner: extractOwner(match[0]),
        dueDate: extractDate(match[0]),
        raw: match[0]
      });
    }
  });

  return actionItems;
}
```

### Meeting Summary Generation

```javascript
async function generateMeetingSummary(notes) {
  const summary = {
    date: extractDate(notes),
    participants: extractParticipants(notes),
    objective: extractObjective(notes),
    keyPoints: extractKeyPoints(notes),
    decisions: extractDecisions(notes),
    actionItems: extractActionItems(notes),
    nextSteps: extractNextSteps(notes)
  };

  return formatSummary(summary);
}
```

## Note-Taking Anti-Patterns

### 1. Verbatim Transcription
- **Problem:** Can't keep up, miss key points
- **Fix:** Capture essence, not every word

### 2. No Structure
- **Problem:** Hard to scan, find information later
- **Fix:** Use templates, consistent formatting

### 3. Delayed Writing
- **Problem:** Forget details, lose accuracy
- **Fix:** Take notes in real-time

### 4. No Action Item Tracking
- **Problem:** Things fall through cracks
- **Fix:** Explicit action item section with owners

### 5. Never Sharing Notes
- **Problem:** Information stays siloed
- **Fix:** Distribute within 24 hours

### 6. No Follow-up
- **Problem:** Action items don't get done
- **Fix:** Track status, send reminders

## Accessibility Considerations

### For Note-Takers
- Use screen-reader friendly formatting
- Provide alternative text for images/diagrams
- Use semantic HTML/markdown structure

### For Note Readers
- Clear headings and hierarchy
- Bulleted lists for scannability
- Tables for structured data
- Consistent formatting

## Metrics & Quality

### Note Quality Checklist
- [ ] All decisions documented
- [ ] All action items have owners and due dates
- [ ] Key discussion points captured
- [ ] Next steps clear
- [ ] Notes shareable within 24 hours
- [ ] Structure makes information easy to find
- [ ] Action items extractable to task system

### Effectiveness Metrics
- **Sharing Speed:** Notes distributed within 24 hours
- **Action Item Completion:** 80%+ of items completed on time
- **Clarity Score:** Recipients understand decisions and next steps
- **Usage Rate:** Notes referenced in future meetings

## Integration with Meeting-Prep-Agent

```javascript
async function createMeetingNotes(meetingId, meetingType) {
  const template = selectNoteTemplate(meetingType);
  const meeting = await getMeetingDetails(meetingId);

  const notes = {
    ...template,
    meeting: {
      title: meeting.title,
      date: meeting.date,
      participants: meeting.participants
    },
    sections: initializeSections(template),
    actionItems: [],
    decisions: []
  };

  return notes;
}

async function finalizeNotes(notes) {
  // Extract structured data
  const actionItems = extractActionItems(notes.content);
  const decisions = extractDecisions(notes.content);

  // Create tasks from action items
  for (const item of actionItems) {
    await createTask({
      title: item.description,
      owner: item.owner,
      dueDate: item.dueDate,
      context: `From meeting: ${notes.meeting.title}`
    });
  }

  // Document decisions
  for (const decision of decisions) {
    await createDecisionRecord(decision);
  }

  // Distribute notes
  await distributeNotes(notes, notes.meeting.participants);

  return notes;
}
```

## Learning Integration (ReasoningBank)

This skill is learning-enabled through ReasoningBank SAFLA integration.

### What This Skill Learns

- **Pattern Recognition**: Effective note-taking structures for different meeting types, optimal action item extraction patterns, useful decision documentation formats
- **Success Criteria**: Notes referenced in future meetings (>70%), action items completed on time (>85%), participants report notes are clear and actionable (>4/5 rating)
- **Confidence Growth**: Note-taking formats gain confidence when notes are frequently referenced and action items are consistently completed

### Learning Workflow

1. **Before Execution**: Query ReasoningBank for relevant patterns
   - Namespace: `note-taking`
   - Context: Meeting type, complexity, number of participants, decision requirements
   - Top 5 most confident note-taking structure patterns retrieved

2. **During Execution**: Apply learned patterns to structure notes
   - Select optimal template based on historical usefulness
   - Structure action items using proven extraction patterns
   - Document decisions in format with highest future reference rate

3. **After Execution**: Record outcome and update confidence
   - Success (notes referenced, action items completed, high clarity rating) → +20% confidence boost
   - Failure (notes never used, action items unclear, poor ratings) → -15% confidence reduction
   - Store new patterns from innovative note structures that prove valuable

### Example: Learning in Action

**Before Learning (Month 1):**
```javascript
Meeting: Strategic planning session (10 participants, 2 hours)
Note Format Used: Generic bullet points
Result:
  - 8 pages of unstructured notes
  - 12 action items buried in text
  - No clear decision documentation
  - Reference rate: 15% (notes rarely consulted)
  - Action completion: 58%
  - Clarity rating: 2.8/5 ("Too much detail, can't find key points")
```

**After Learning (Month 4):**
```javascript
Meeting: Q2 strategic planning (12 participants, 2 hours)
Learned Pattern: "Strategic sessions: Decision-first format + executive summary (confidence: 0.91)"
Note Format Used:
  - Executive Summary (top)
  - Decisions Made (clearly highlighted)
  - Action Items Table (owner, date, status)
  - Discussion Details (collapsed by default)
  - SWOT Analysis (visual format)

Result:
  - 3-page structured summary
  - 9 action items in clear table format
  - 4 decisions with rationale documented
  - Reference rate: 87% (frequently consulted during Q2)
  - Action completion: 94%
  - Clarity rating: 4.7/5
  - Pattern confidence → 0.94
```

**Real-World Impact:**
- Month 1: 62% of notes referenced within 30 days
- Month 4: 89% of notes referenced within 30 days
- Learned that Cornell Method works best for technical discussions (confidence: 0.88)
- Discovered action-oriented format increases completion rate by 35%
- Found that executive summaries at top increase engagement by 60%

### Pattern Storage Schema

```json
{
  "id": "pattern-notes-strategic-planning",
  "content": "Strategic planning sessions: Use decision-first format with executive summary at top, decisions highlighted, action items in table format, and SWOT analysis visual. Collapse detailed discussion notes by default.",
  "namespace": "note-taking",
  "confidence": 0.91,
  "context": {
    "meetingType": "strategic-planning",
    "participantCount": "8-15",
    "noteStructure": {
      "sections": [
        { "name": "Executive Summary", "position": "top", "format": "3-5 bullets" },
        { "name": "Decisions Made", "format": "numbered-list-with-rationale" },
        { "name": "Action Items", "format": "table", "columns": ["Action", "Owner", "Due", "Status"] },
        { "name": "SWOT Analysis", "format": "visual-matrix" },
        { "name": "Discussion Details", "format": "collapsible-sections" }
      ],
      "visualElements": ["decision-highlights", "action-table", "swot-matrix"],
      "distribution": "within-24-hours"
    },
    "successMetrics": {
      "referenceRate": 0.87,
      "actionCompletionRate": 0.94,
      "clarityRating": 4.7,
      "timeToDistribute": 18 // hours
    }
  },
  "outcomes": {
    "success_count": 31,
    "failure_count": 3,
    "last_outcome": "success",
    "avg_reference_rate": 0.84,
    "avg_action_completion": 0.91
  }
}
```

### Integration Code Example

```typescript
// Example showing how this skill queries and learns
import { reasoningBankService } from '@/services/safla-service';

async function generateOptimalNoteStructure(
  meetingType: string,
  participants: number,
  duration: number,
  hasDecisions: boolean
) {
  // 1. Query learned patterns
  const queryContext = `${meetingType} meeting ${participants} participants ${duration} minutes decisions: ${hasDecisions}`;
  const patterns = await reasoningBankService.queryPatterns(
    queryContext,
    'note-taking',
    5
  );

  // 2. Select base template
  let noteStructure = selectBaseNoteTemplate(meetingType);

  // 3. Apply learned structure optimizations
  if (patterns.length > 0 && patterns[0].confidence > 0.75) {
    const learnedPattern = patterns[0];

    if (learnedPattern.context.noteStructure) {
      noteStructure = {
        ...noteStructure,
        sections: learnedPattern.context.noteStructure.sections,
        visualElements: learnedPattern.context.noteStructure.visualElements,
        expectedReferenceRate: learnedPattern.context.successMetrics.referenceRate,
        confidence: learnedPattern.confidence
      };
    }
  }

  // 4. Generate section templates
  const sectionTemplates = noteStructure.sections.map(section => ({
    name: section.name,
    format: section.format,
    position: section.position,
    example: generateSectionExample(section),
    importanceReason: patterns.find(p =>
      p.content.includes(section.name)
    )?.content || 'Standard practice'
  }));

  // 5. Add extraction recommendations
  const extractionRecommendations = {
    actionItems: {
      pattern: patterns.find(p => p.content.includes('action'))?.context.extractionPattern || 'standard',
      expectedCompletionRate: patterns.find(p => p.content.includes('action'))?.context.successMetrics?.actionCompletionRate || 0.75
    },
    decisions: {
      format: 'numbered-list-with-rationale',
      includeAlternatives: hasDecisions,
      documentReasoningPath: true
    }
  };

  return {
    noteStructure,
    sectionTemplates,
    extractionRecommendations,
    learnedFrom: patterns.slice(0, 3),

    // 6. Outcome tracking
    trackNoteEffectiveness: async (
      notesData: {
        noteId: string,
        distributedWithin24h: boolean,
        actionItemsExtracted: number,
        decisionsDocumented: number,
        timeToComplete: number // minutes
      },
      followUpData: {
        referenceCount30Days: number,
        actionCompletionRate: number,
        participantClarityRating: number,
        participantFeedback: string[]
      }
    ) => {
      const referenceRate = followUpData.referenceCount30Days / participants;
      const success =
        referenceRate > 0.7 &&
        followUpData.actionCompletionRate > 0.8 &&
        followUpData.participantClarityRating >= 4;

      for (const pattern of patterns) {
        await reasoningBankService.recordOutcome(
          pattern.id,
          success ? 'success' : 'failure',
          {
            context: {
              meetingType,
              participants,
              duration,
              noteStructureUsed: noteStructure.sections.map(s => s.name).join(', '),
              distributionSpeed: notesData.distributedWithin24h,
              actionItemsExtracted: notesData.actionItemsExtracted,
              decisionsDocumented: notesData.decisionsDocumented,
              referenceRate,
              actionCompletionRate: followUpData.actionCompletionRate,
              clarityRating: followUpData.participantClarityRating,
              feedback: followUpData.participantFeedback.join('; ')
            },
            executionTimeMs: notesData.timeToComplete * 60 * 1000
          }
        );
      }

      // Store new high-performing note structure
      if (success && referenceRate > 0.85) {
        await reasoningBankService.createPattern({
          content: `${meetingType} meetings with ${participants} participants: ${noteStructure.sections[0].name}-first format achieves ${Math.round(referenceRate * 100)}% reference rate`,
          namespace: 'note-taking',
          category: meetingType,
          metadata: {
            noteStructure,
            successMetrics: {
              referenceRate,
              actionCompletionRate: followUpData.actionCompletionRate,
              clarityRating: followUpData.participantClarityRating
            }
          }
        });
      }
    }
  };
}
```

## References
- Meeting Templates: `/prod/skills/agent-specific/meeting-prep-agent/meeting-templates/SKILL.md`
- Agenda Frameworks: `/prod/skills/agent-specific/meeting-prep-agent/agenda-frameworks/SKILL.md`
- Task Management: `/prod/skills/shared/task-management/SKILL.md`
