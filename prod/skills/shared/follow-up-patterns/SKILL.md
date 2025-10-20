---
name: Follow-up Patterns
description: Systematic delegation tracking, accountability management, and follow-up communication frameworks
version: "1.0.0"
_protected: false
_allowed_agents: ["follow-ups-agent", "meeting-next-steps-agent", "personal-todos-agent"]
_last_updated: "2025-10-18"
---

# Follow-up Patterns Skill

## Purpose

Provides comprehensive frameworks for tracking delegated work, managing accountability, and conducting effective follow-up communications. Ensures commitments are met, blockers are identified early, and stakeholders remain informed.

## When to Use This Skill

- Tracking delegated tasks and commitments
- Scheduling and executing follow-up communications
- Managing escalations for overdue items
- Monitoring team member response patterns
- Creating accountability reports
- Coordinating multi-party workflows

## Core Follow-up Frameworks

### 1. Delegation Capture Framework

**Initial Delegation Structure**:
```
WHAT:
  - Clear, specific task description
  - Detailed success criteria
  - Deliverable format and expectations

WHO:
  - Person/team responsible
  - Stakeholders to keep informed
  - Escalation contacts if needed

WHEN:
  - Deadline (date and time)
  - Interim milestones if applicable
  - Expected time investment

WHY:
  - Business context and importance
  - Dependencies on this work
  - Impact if not completed

HOW:
  - Resources available
  - Support or guidance offered
  - Communication preferences
```

**Delegation Data Model**:
```json
{
  "delegation_id": "DEL-YYYY-###",
  "title": "Clear task description",
  "delegated_to": "Person/team name",
  "delegated_by": "Requestor name",
  "delegated_date": "ISO-8601 timestamp",
  "due_date": "ISO-8601 timestamp",
  "priority": "P0|P1|P2|P3",
  "status": "pending|in_progress|blocked|completed|overdue",
  "business_context": "Why this matters",
  "success_criteria": ["Criterion 1", "Criterion 2"],
  "resources_provided": ["Link 1", "Document 2"],
  "milestones": [
    {"name": "Milestone", "date": "ISO-8601", "status": "pending"}
  ],
  "communication_log": [],
  "escalation_level": 0,
  "completion_percentage": 0-100
}
```

### 2. Follow-up Scheduling Framework

**Frequency Based on Priority**:
```
P0 CRITICAL:
  - Initial check-in: 4 hours after delegation
  - Follow-up frequency: Every 4-8 hours
  - Escalation trigger: Overdue by 4 hours
  - Communication channel: Direct/immediate (phone, chat)

P1 HIGH:
  - Initial check-in: 24 hours after delegation
  - Follow-up frequency: Daily
  - Escalation trigger: Overdue by 1 day
  - Communication channel: Email, scheduled calls

P2 MEDIUM:
  - Initial check-in: 3 days after delegation
  - Follow-up frequency: Every 3-4 days
  - Escalation trigger: Overdue by 3 days
  - Communication channel: Email, status meetings

P3 LOW:
  - Initial check-in: 1 week after delegation
  - Follow-up frequency: Weekly
  - Escalation trigger: Overdue by 1 week
  - Communication channel: Email, periodic reviews
```

**Dynamic Scheduling Rules**:
```
IF deadline < 7 days away
  THEN increase follow-up frequency by 2x

IF no response to previous 2 follow-ups
  THEN escalate and change communication channel

IF status = "blocked"
  THEN immediate follow-up to resolve blocker

IF completion_percentage stalled for >2 follow-ups
  THEN schedule working session to unblock
```

### 3. Communication Templates

#### Initial Delegation Template
```
Subject: [PRIORITY] Delegated: [TASK] - Due [DATE]

Hi [Name],

Following up on our discussion, here's what I need:

**Task**: [Clear description of what needs to be done]

**Deadline**: [Date and time]

**Success Criteria**:
- [Specific measurable outcome 1]
- [Specific measurable outcome 2]

**Business Context**:
[Why this matters and what it impacts]

**Resources Available**:
- [Link/document 1]
- [Contact for questions]

**Next Check-in**: I'll follow up on [date] to see how things are progressing.

Please confirm you:
1. Understand the requirements
2. Can meet the deadline
3. Have the resources needed

Let me know if you have any questions or need support.

Best regards,
[Your name]
```

#### Progress Check-in Template
```
Subject: [TASK] Progress Check - [X] days to deadline

Hi [Name],

Quick check-in on [task]. With [X] days until [deadline], I wanted to see:

**Current Status**:
- What progress has been made?
- What percentage complete?

**Blockers**:
- Any issues or challenges encountered?
- What support do you need?

**Confidence Level**:
- How confident are you in meeting the deadline?
- Should we adjust timeline or expectations?

**Next Steps**:
- What are your next actions?
- When can I expect the next update?

I'm here to help clear any obstacles. Let me know how I can support you.

Thanks,
[Your name]
```

#### Escalation Template
```
Subject: URGENT: [TASK] Overdue - Immediate Action Required

Hi [Name],

[Task] was due on [original deadline] and is now [X] days overdue.

**Business Impact**:
[Specific consequences of delay - be concrete]

**Immediate Needs**:
1. Current status and blocking issues
2. Realistic revised timeline with milestones
3. Resources required to complete

This impacts [stakeholder/business area] and requires immediate resolution.

Please respond by [time today] with:
- Updated status
- Revised delivery date
- Support needed

CC: [Manager/stakeholders as appropriate]

[Your name]
```

#### Completion Confirmation Template
```
Subject: ✅ [TASK] Completed - Thank You!

Hi [Name],

Thank you for completing [task]!

**What Was Delivered**:
[Summary of deliverables]

**Impact**:
[How this helps the business/project]

**Feedback**:
[Specific positive feedback on quality/timeliness]

I appreciate your [specific quality: thoroughness/speed/creativity].

**Follow-up Actions** (if any):
- [Next steps or related work]

Thanks again for your excellent work on this!

Best regards,
[Your name]
```

### 4. Escalation Management Framework

**Escalation Levels**:
```
LEVEL 0: Normal follow-up
  - Routine status checks
  - On track or minor delays
  - No action beyond standard follow-up

LEVEL 1: First escalation
  - Overdue by 1 follow-up cycle
  - Missed 2 consecutive check-ins
  - ACTION: Change communication channel, increase frequency

LEVEL 2: Management escalation
  - Overdue by 2+ follow-up cycles
  - Critical blocker identified
  - ACTION: Involve manager/lead, resource reallocation discussion

LEVEL 3: Executive escalation
  - Overdue by 3+ follow-up cycles OR P0 overdue by any amount
  - Business impact materializing
  - ACTION: Executive involvement, formal escalation process, alternative assignments
```

**Escalation Triggers**:
```
AUTOMATIC ESCALATION CONDITIONS:
- P0 overdue by 4 hours
- P1 overdue by 1 day
- P2 overdue by 3 days
- P3 overdue by 1 week
- No response after 3 follow-up attempts
- Status "blocked" for >2 days without resolution
- Completion percentage hasn't changed in 2 weeks (for long-running tasks)
```

**Escalation Protocol**:
```
1. DOCUMENT the situation
   - What was delegated and when
   - Follow-up history
   - Current status and delays
   - Business impact

2. NOTIFY stakeholders
   - Inform delegate's manager
   - Brief affected stakeholders
   - Provide context and request support

3. EXPLORE alternatives
   - Can deadline be extended?
   - Can scope be reduced?
   - Are alternative resources available?
   - Can task be reassigned?

4. TAKE action
   - Implement agreed-upon solution
   - Update all parties
   - Adjust tracking and follow-up schedule

5. LEARN and adapt
   - What led to escalation?
   - How can we prevent this in future?
   - Update delegation approach if needed
```

### 5. Team Member Pattern Recognition

**Response Pattern Analysis**:
```
HIGHLY RESPONSIVE:
  - Responds within 4 hours typically
  - Proactively provides updates
  - Rarely needs follow-up
  → Strategy: Less frequent check-ins, trust-based approach

MODERATELY RESPONSIVE:
  - Responds within 24-48 hours
  - Needs periodic reminders
  - Generally delivers on time
  → Strategy: Standard follow-up cadence

SLOW RESPONDER:
  - Takes 2-3 days to respond
  - Needs frequent follow-ups
  - Variable delivery timeliness
  → Strategy: Increased follow-up frequency, earlier check-ins

NON-RESPONSIVE:
  - Rarely responds without escalation
  - Consistently misses deadlines
  - Requires management involvement
  → Strategy: Immediate escalation protocol, manager in loop from start
```

**Delivery Pattern Analysis**:
```
EARLY DELIVERER:
  - Consistently delivers ahead of schedule
  - High quality work
  → Strategy: Can assign stretch deadlines, trust-based follow-up

ON-TIME DELIVERER:
  - Meets deadlines reliably
  - Predictable cadence
  → Strategy: Standard follow-up, milestone tracking

LATE DELIVERER:
  - Frequently misses original deadlines
  - But delivers with reminders
  → Strategy: Build in buffer time, frequent check-ins

CHRONIC LATE:
  - Consistently late even with follow-up
  - Quality may also suffer
  → Strategy: Escalate early, consider reassignment for critical work
```

### 6. Status Reporting Framework

**Individual Delegation Status**:
```
TASK: [Task name]
OWNER: [Person responsible]
STATUS: [Current status]
DUE: [Deadline] (in X days)
PROGRESS: [Percentage or phase complete]

RECENT ACTIVITY:
- [Last update and when]
- [Blockers if any]
- [Support provided]

NEXT ACTIONS:
- [Delegate's next steps]
- [Our next follow-up date]

CONFIDENCE: [Green/Yellow/Red indicator]
```

**Aggregate Dashboard**:
```
DELEGATION OVERVIEW:
  Total Active: X
  On Track: X (Y%)
  At Risk: X (Y%)
  Overdue: X (Y%)

PRIORITY BREAKDOWN:
  P0: X active, X overdue
  P1: X active, X overdue
  P2: X active, X overdue
  P3: X active, X overdue

ESCALATIONS:
  Level 1: X items
  Level 2: X items
  Level 3: X items

TOP CONCERNS:
  1. [Item most overdue or highest risk]
  2. [Second highest concern]
  3. [Third highest concern]

RECENT COMPLETIONS:
  - [Task 1] - Completed [date] by [person]
  - [Task 2] - Completed [date] by [person]
```

### 7. Continuous Improvement Patterns

**Delegation Retrospective**:
```
AFTER EACH MAJOR DELEGATION (especially if issues arose):

WHAT WENT WELL:
- Clear expectations set?
- Resources adequate?
- Communication effective?
- Deadline realistic?

WHAT COULD IMPROVE:
- Earlier identification of blockers?
- Better initial scoping?
- More frequent check-ins needed?
- Different resources required?

LESSONS LEARNED:
- What patterns emerged?
- What would we do differently?
- How can we prevent similar issues?

ACTION ITEMS:
- Process improvements to implement
- Communication changes needed
- Resource allocation adjustments
```

## Best Practices

### For Effective Delegation:
1. **Be Crystal Clear**: Ambiguity leads to delays and misunderstandings
2. **Provide Context**: Explain the "why" not just the "what"
3. **Confirm Understanding**: Always verify comprehension before ending discussion
4. **Set Realistic Deadlines**: Account for competing priorities and complexity
5. **Offer Support**: Make yourself available for questions and unblocking

### For Productive Follow-ups:
1. **Be Consistent**: Follow-up on schedule, don't let items slip
2. **Be Supportive**: Approach is "How can I help?" not "Why isn't this done?"
3. **Be Brief**: Respect people's time with concise communications
4. **Be Documented**: Keep thorough records of all follow-up interactions
5. **Be Adaptive**: Adjust approach based on individual response patterns

### For Successful Escalations:
1. **Escalate Early**: Don't wait until crisis to flag issues
2. **Be Factual**: Focus on impact and timeline, not blame
3. **Propose Solutions**: Don't just identify problems
4. **Keep Stakeholders Informed**: No surprises for leadership
5. **Close the Loop**: Update all parties when escalation resolves

## Integration with Other Skills

- **meeting-coordination**: Capture action items from meetings
- **task-management**: Integrate with personal task tracking
- **feedback-frameworks**: Learn from delegation patterns
- **productivity-patterns**: Optimize delegation workflows
- **user-preferences**: Personalize communication approaches

## Success Metrics

- **On-Time Completion Rate**: 90%+ tasks delivered by original deadline
- **Response Rate**: 95%+ follow-ups receive timely responses
- **Escalation Effectiveness**: 100% critical escalations resolved within SLA
- **Early Warning**: 80%+ blockers identified 2+ days before impact
- **Stakeholder Satisfaction**: Positive feedback on accountability management

## References

- [communication-templates.md](communication-templates.md) - Full template library
- [escalation-playbooks.md](escalation-playbooks.md) - Detailed escalation procedures
- [response-pattern-guide.md](response-pattern-guide.md) - Team member analysis tools
- [reporting-dashboards.md](reporting-dashboards.md) - Status report templates
- [delegation-checklists.md](delegation-checklists.md) - Pre-delegation validation

---

**Remember**: Accountability without support is blame. Follow-up is about enabling success, not policing failure. Be consistent, be supportive, be relentless in helping people succeed. The best follow-up is the one that makes the next one unnecessary.
