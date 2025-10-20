---
name: Feedback Frameworks
description: Comprehensive feedback collection, categorization, and analysis frameworks for continuous improvement
version: "1.0.0"
_protected: false
_allowed_agents: ["agent-feedback-agent", "agent-ideas-agent", "meta-agent", "meta-update-agent"]
_last_updated: "2025-10-18"
---

# Feedback Frameworks Skill

## Purpose

Provides systematic frameworks for collecting, categorizing, analyzing, and acting on feedback across all production agents. Enables data-driven continuous improvement through structured feedback management and insight extraction.

## When to Use This Skill

- Capturing user feedback on agent performance
- Analyzing feedback trends and patterns
- Categorizing feedback by type and severity
- Generating actionable improvement recommendations
- Tracking feedback resolution and impact
- Creating quality assurance reports

## Core Frameworks

### 1. Feedback Collection Framework

**Immediate Capture Protocol**:
```
WHAT was the feedback? (Specific description)
WHO provided it? (User, agent, system)
WHEN did it occur? (Timestamp, context)
WHERE in workflow? (Which agent, which feature)
WHY is it important? (Business impact)
```

**Data Structure**:
```json
{
  "feedback_id": "FB-YYYY-###",
  "timestamp": "ISO-8601",
  "source": "user|agent|system|monitoring",
  "agent_target": "agent-name",
  "category": "performance|experience|capability|bug|enhancement",
  "severity": "critical|high|medium|low",
  "description": "Detailed feedback content",
  "context": "Workflow and environmental context",
  "user_satisfaction_score": 1-10,
  "business_impact": "Description of business implications"
}
```

### 2. Feedback Categorization System

**Primary Categories**:

1. **Performance Feedback**
   - **Accuracy**: Correctness of outputs (Target: >95%)
   - **Completeness**: Thoroughness of responses
   - **Speed**: Execution time and latency
   - **Reliability**: Consistency and uptime
   - **Scalability**: Performance under load

2. **User Experience Feedback**
   - **Clarity**: Communication understandability
   - **Helpfulness**: Value provided to users
   - **Proactiveness**: Appropriate automatic actions
   - **Integration**: Cross-agent coordination quality
   - **Accessibility**: Ease of use and discoverability

3. **Capability Feedback**
   - **Feature Gaps**: Missing functionality
   - **Tool Limitations**: Insufficient capabilities
   - **Workflow Issues**: Process inefficiencies
   - **Automation Opportunities**: Manual tasks to automate
   - **Enhancement Requests**: Improvement suggestions

4. **Bug Reports**
   - **Functional**: Features not working as designed
   - **Integration**: Cross-system failures
   - **Performance**: Degradation or slowdowns
   - **Security**: Vulnerabilities or exposure risks
   - **Data**: Incorrect or corrupted data

5. **Enhancement Ideas**
   - **New Features**: Novel capabilities
   - **Workflow Improvements**: Process optimizations
   - **User Interface**: UI/UX enhancements
   - **Agent Coordination**: Better orchestration
   - **Strategic Capabilities**: High-value additions

### 3. Severity Assessment Framework

**Critical (Immediate Action)**:
- Production system down or severely degraded
- Data loss or security vulnerability
- Revenue impact or customer-facing failures
- Multiple user reports of same issue
- Regulatory or compliance violations

**High (24-48 Hours)**:
- Significant functionality impaired
- Major workflow disruption
- Strategic feature malfunction
- High user satisfaction impact (-2 points or more)
- Competitive disadvantage created

**Medium (1-2 Weeks)**:
- Moderate functionality affected
- Workarounds available but inconvenient
- User experience degradation
- Enhancement with strong business case
- Quality-of-life improvements

**Low (Planned Backlog)**:
- Minor issues with minimal impact
- Nice-to-have enhancements
- Edge case scenarios
- Future-focused improvements
- Optimization opportunities

### 4. Feedback Analysis Framework

**Pattern Recognition**:
```
FREQUENCY: How often does this feedback occur?
  - Single occurrence: Isolated incident
  - Occasional: 2-5 occurrences per month
  - Regular: Weekly occurrences
  - Frequent: Daily or multiple per day

CORRELATION: What else is happening when feedback occurs?
  - Specific agents involved
  - Time of day or load patterns
  - User segments or workflows
  - Environmental factors

TREND: Is feedback increasing, decreasing, or stable?
  - Historical analysis
  - Moving averages
  - Seasonal patterns
  - Growth trajectory

IMPACT: What's the business consequence?
  - User satisfaction delta
  - Workflow efficiency change
  - Revenue or cost implications
  - Strategic alignment effect
```

**Root Cause Analysis**:
```
1. DEFINE the problem precisely
   - What exactly is the issue?
   - What is the expected vs. actual behavior?

2. COLLECT relevant data
   - User reports and contexts
   - System logs and metrics
   - Agent performance data
   - Environmental conditions

3. IDENTIFY possible causes
   - Agent configuration issues
   - Tool limitations
   - Integration problems
   - System resource constraints
   - User expectation mismatches

4. DETERMINE root cause
   - 5 Whys technique
   - Fishbone diagram analysis
   - Correlation vs. causation evaluation

5. VERIFY the diagnosis
   - Test hypothesis
   - Reproduce the issue
   - Validate with additional data
```

### 5. Actionable Improvement Framework

**Recommendation Structure**:
```
PROBLEM STATEMENT:
  Clear, concise description of the issue

PROPOSED SOLUTION:
  Specific, actionable recommendations

EXPECTED IMPACT:
  - User satisfaction improvement: +X points
  - Workflow efficiency gain: Y% faster
  - Business value: Revenue/cost implications

IMPLEMENTATION EFFORT:
  - Development time: Hours/days/weeks
  - Testing complexity: Low/medium/high
  - Deployment risk: Low/medium/high

PRIORITY JUSTIFICATION:
  Why this should be prioritized over alternatives

SUCCESS CRITERIA:
  Measurable outcomes to validate solution effectiveness
```

**Prioritization Matrix**:
```
IMPACT vs EFFORT Grid:

High Impact, Low Effort → QUICK WINS (Do First)
High Impact, High Effort → STRATEGIC PROJECTS (Plan & Execute)
Low Impact, Low Effort → FILL-IN WORK (Do When Available)
Low Impact, High Effort → DE-PRIORITIZE (Avoid or Defer)
```

### 6. Feedback Resolution Tracking

**Status Lifecycle**:
```
RECEIVED → TRIAGED → INVESTIGATING → PLANNED → IN_PROGRESS → TESTING → RESOLVED → VERIFIED → CLOSED
```

**Tracking Metrics**:
- Time to first response (Target: <24 hours)
- Time to triage (Target: <48 hours)
- Time to resolution (Varies by severity)
- User satisfaction post-resolution (Target: +2 points)
- Resolution effectiveness (% of issues not reopening: >90%)

### 7. Quality Assurance Reporting

**Weekly Dashboard**:
```
FEEDBACK SUMMARY:
  - Total feedback received: X
  - By category: Performance (X), Experience (X), Capability (X)
  - By severity: Critical (X), High (X), Medium (X), Low (X)

RESOLUTION METRICS:
  - Feedback resolved this week: X
  - Average resolution time: X days
  - Resolution rate: X%

TRENDING ISSUES:
  - Top 3 recurring feedback themes
  - Emerging patterns or concerns
  - User satisfaction trends

IMPROVEMENT HIGHLIGHTS:
  - Key enhancements deployed
  - Measured impact of recent changes
  - Success stories and user testimonials
```

**Monthly Scorecard**:
```
AGENT PERFORMANCE:
  - Per-agent accuracy rates
  - Per-agent user satisfaction scores
  - Per-agent feedback volume trends

SYSTEM HEALTH:
  - Overall user satisfaction: X.X/10
  - Feedback velocity: Increasing/stable/decreasing
  - Resolution efficiency: X% within SLA

STRATEGIC INSIGHTS:
  - Major capability gaps identified
  - Competitive intelligence from feedback
  - Long-term improvement roadmap recommendations
```

## Best Practices

### For Feedback Collection:
1. **Be Specific**: Capture detailed context, not just complaints
2. **Be Objective**: Focus on facts and measurable impacts
3. **Be Timely**: Record feedback immediately while context is fresh
4. **Be Empathetic**: Understand user perspective and frustrations
5. **Be Systematic**: Use consistent structure and classification

### For Feedback Analysis:
1. **Look for Patterns**: Single feedback points are anecdotes; patterns are data
2. **Prioritize Impact**: Focus on high-impact issues, not just high-volume
3. **Validate Hypotheses**: Test assumptions before implementing solutions
4. **Consider Context**: Environmental factors matter for proper analysis
5. **Measure Outcomes**: Track whether solutions actually improve satisfaction

### For Feedback Resolution:
1. **Close the Loop**: Always inform users when their feedback is addressed
2. **Iterate Quickly**: Small, frequent improvements beat large, slow ones
3. **Validate Success**: Measure post-deployment outcomes
4. **Document Learnings**: Share insights across the agent ecosystem
5. **Celebrate Wins**: Recognize successful improvements and team efforts

## Integration with Other Skills

- **idea-evaluation**: Convert feedback into enhancement ideas
- **user-preferences**: Personalize based on feedback patterns
- **task-management**: Create follow-up tasks for resolution
- **productivity-patterns**: Identify workflow optimization opportunities
- **code-standards**: Apply technical quality improvements

## Success Metrics

- **Feedback Capture Rate**: 100% of user interactions eligible for feedback
- **Categorization Accuracy**: 95%+ correct categorization on first pass
- **Resolution SLA**: 85%+ resolved within severity-based timeframes
- **User Satisfaction Improvement**: +15% average increase post-resolution
- **Pattern Detection**: 90%+ of recurring issues identified within 2 weeks
- **Actionable Insights**: 80%+ of feedback generates concrete improvements

## References

- [feedback-templates.md](feedback-templates.md) - Standard feedback forms
- [analysis-worksheets.md](analysis-worksheets.md) - Root cause analysis guides
- [resolution-playbooks.md](resolution-playbooks.md) - Common issue resolutions
- [reporting-dashboards.md](reporting-dashboards.md) - Dashboard templates
- [user-communication-templates.md](user-communication-templates.md) - Closing the loop

---

**Remember**: Feedback is a gift. Treat it systematically, analyze it rigorously, act on it strategically, and measure its impact relentlessly. Continuous improvement is not a project—it's a discipline.
