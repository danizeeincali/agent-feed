---
name: Idea Evaluation
description: Systematic evaluation framework for new agent ideas, feature proposals, and ecosystem expansion opportunities
version: "1.0.0"
_protected: false
_allowed_agents: ["agent-ideas-agent", "agent-feedback-agent", "meta-agent"]
_last_updated: "2025-10-18"
---

# Idea Evaluation Skill

## Purpose

Provides comprehensive frameworks for evaluating, prioritizing, and planning new agent ideas and feature enhancements. Transforms creative suggestions into actionable, data-driven implementation roadmaps with clear business justification.

## When to Use This Skill

- Evaluating proposals for new agents or features
- Prioritizing agent ecosystem expansion opportunities
- Conducting feasibility assessments for ideas
- Creating implementation roadmaps
- Calculating ROI and business impact
- Making go/no-go decisions on proposals

## Core Evaluation Framework

### 1. Idea Capture and Initial Assessment

**Structured Capture Format**:
```
IDEA TITLE: Clear, descriptive name

PROBLEM STATEMENT:
  What user pain point or business gap does this address?

PROPOSED SOLUTION:
  High-level description of the agent/feature

TARGET USERS:
  Who will benefit? (Specific user segments)

BUSINESS OBJECTIVES:
  Strategic alignment and expected outcomes

INITIAL CLASSIFICATION:
  - Category: user-facing|system-agent|infrastructure
  - Type: new-agent|enhancement|integration|automation
  - Scope: small|medium|large|transformative
```

**Quick Viability Check**:
```
✓ Is this technically possible with available tools?
✓ Does this fit within system architecture?
✓ Is there clear user demand or business need?
✓ Can we define measurable success criteria?
✓ Does this align with strategic priorities?

If any answer is "No" → Document why and defer or reject
```

### 2. Multi-Dimensional Scoring System

**Score each dimension on 1-10 scale**:

#### Technical Feasibility (Weight: 25%)
```
10 = Straightforward with existing capabilities
8-9 = Requires some new integration but well-understood
6-7 = Moderate complexity, new patterns needed
4-5 = Significant technical challenges, uncertain approach
1-3 = Cutting-edge, high risk, may not be feasible

Evaluation Criteria:
- Available tools and MCP integrations sufficient?
- Agent coordination patterns established?
- Technical dependencies manageable?
- Performance and scalability concerns addressed?
- Security and compliance requirements met?
```

#### Business Impact (Weight: 35%)
```
10 = Transformative, game-changing capability
8-9 = High strategic value, significant user benefit
6-7 = Meaningful improvement, clear ROI
4-5 = Incremental value, nice-to-have
1-3 = Minimal impact, unclear benefit

Evaluation Criteria:
- User workflow improvement quantified?
- Time/cost savings measurable?
- Quality or accuracy enhancement clear?
- Competitive differentiation significant?
- Strategic alignment strong?
```

#### Implementation Effort (Weight: 20%)
```
1-3 = Quick win, <1 week
4-5 = Moderate effort, 1-2 weeks
6-7 = Substantial, 3-4 weeks
8-9 = Major project, 1-2 months
10 = Transformative, >2 months

Evaluation Criteria:
- Development time realistic?
- Testing complexity manageable?
- Integration effort reasonable?
- Documentation requirements clear?
- Maintenance overhead acceptable?
```

#### User Demand (Weight: 15%)
```
10 = Overwhelming demand, multiple urgent requests
8-9 = Strong demand, clear user requests
6-7 = Moderate interest, some user mentions
4-5 = Speculative, potential future need
1-3 = No clear demand, exploratory only

Evaluation Criteria:
- How many users requesting this?
- How frequently is it mentioned?
- What's the intensity of need?
- Are there workarounds currently?
- What's the pain level without it?
```

#### Strategic Fit (Weight: 5%)
```
10 = Core to platform strategy
8-9 = Directly supports strategic initiatives
6-7 = Aligned with strategic direction
4-5 = Tangentially related
1-3 = Orthogonal to strategy

Evaluation Criteria:
- Fits platform vision?
- Supports key objectives?
- Builds competitive moats?
- Enables future capabilities?
- Aligns with values and principles?
```

**Overall Score Calculation**:
```
OVERALL_SCORE =
  (Technical × 0.25) +
  (Business Impact × 0.35) +
  (10 - Implementation Effort) × 0.20 +
  (User Demand × 0.15) +
  (Strategic Fit × 0.05)

Scoring Guide:
9.0-10.0 = MUST DO (Immediate priority)
7.5-8.9  = SHOULD DO (High priority, plan soon)
6.0-7.4  = COULD DO (Medium priority, backlog)
4.0-5.9  = NICE TO HAVE (Low priority, defer)
0.0-3.9  = DECLINE (Not worth pursuing)
```

### 3. Priority Matrix Framework

**Impact vs. Effort Quadrants**:

```
HIGH IMPACT, LOW EFFORT → QUICK WINS
  - Prioritize immediately
  - Execute within 1-2 sprints
  - High ROI, builds momentum
  - Examples: Simple automation, obvious feature gaps

HIGH IMPACT, HIGH EFFORT → STRATEGIC PROJECTS
  - Plan thoroughly
  - Allocate dedicated resources
  - Multi-phase rollout
  - Examples: New core agents, major integrations

LOW IMPACT, LOW EFFORT → FILL-IN WORK
  - Do when capacity available
  - Good for onboarding or downtime
  - Don't block important work
  - Examples: UI polish, minor enhancements

LOW IMPACT, HIGH EFFORT → AVOID/DEFER
  - Generally decline
  - Only if strategic rationale compelling
  - High opportunity cost
  - Examples: Gold-plating, over-engineering
```

**Decision Tree**:
```
IF overall_score >= 9.0
  AND technical_feasibility >= 6
  AND business_impact >= 8
  → APPROVE IMMEDIATELY, allocate resources

ELSE IF overall_score >= 7.5
  AND no critical blockers
  → APPROVE FOR PLANNING, add to roadmap

ELSE IF overall_score >= 6.0
  AND clear user demand
  → ADD TO BACKLOG, revisit quarterly

ELSE IF overall_score < 6.0
  → DECLINE OR DEFER
```

### 4. Feasibility Deep Dive

**Technical Assessment**:
```
ARCHITECTURE REVIEW:
  - How does this fit into existing system?
  - What new components required?
  - Integration points with other agents?
  - Data flow and state management?
  - Performance implications?

TOOL AVAILABILITY:
  - Required tools available in production?
  - MCP servers needed?
  - Third-party integrations required?
  - API dependencies identified?

IMPLEMENTATION COMPLEXITY:
  - Algorithm complexity level?
  - Novel vs. established patterns?
  - Testing complexity (unit, integration, E2E)?
  - Deployment complexity?

RISK ASSESSMENT:
  - Technical risks identified?
  - Mitigation strategies defined?
  - Rollback plans in place?
  - Security reviewed?
```

**Resource Assessment**:
```
DEVELOPMENT RESOURCES:
  - Engineering time (hours/days/weeks)
  - Specialist expertise required?
  - Dependencies on other teams?

INFRASTRUCTURE RESOURCES:
  - Additional compute/storage needed?
  - MCP server requirements?
  - Cost implications?

ONGOING MAINTENANCE:
  - Support overhead?
  - Monitoring requirements?
  - Documentation needs?
  - Training requirements?
```

### 5. Business Case Development

**ROI Calculation Framework**:
```
BENEFITS (Quantified):
  Time Savings:
    - Hours saved per user per week
    - Number of users affected
    - Hourly value of time
    → Annual savings: $X

  Quality Improvements:
    - Error reduction %
    - Rework elimination
    - Accuracy improvements
    → Annual value: $X

  New Capabilities:
    - Revenue opportunities
    - Cost avoidance
    - Competitive advantage
    → Annual value: $X

  TOTAL ANNUAL BENEFIT: $X

COSTS (Estimated):
  Development:
    - Engineering time × hourly cost
    → One-time cost: $X

  Infrastructure:
    - Additional compute/storage
    - Third-party services
    → Annual recurring cost: $X

  Maintenance:
    - Ongoing support time × cost
    → Annual recurring cost: $X

  TOTAL COST (3-Year): $X

ROI = (Total Benefits - Total Costs) / Total Costs × 100%
Payback Period = Initial Investment / Annual Benefit
```

**Qualitative Value**:
```
STRATEGIC VALUE:
  - Competitive differentiation
  - Platform capability expansion
  - User satisfaction improvement
  - Team productivity enhancement

RISK MITIGATION:
  - Reduces operational risks
  - Improves system reliability
  - Enhances security posture
  - Decreases technical debt
```

### 6. Implementation Roadmap Template

**Phase-Based Planning**:
```
PHASE 0: VALIDATION (1-2 weeks)
  - Create proof-of-concept
  - Validate technical approach
  - Test with pilot users
  - Refine requirements
  → Go/No-Go Decision Point

PHASE 1: MVP DEVELOPMENT (2-4 weeks)
  - Core functionality implementation
  - Basic testing and validation
  - Limited rollout to early adopters
  - Gather initial feedback
  → Evaluate for Phase 2

PHASE 2: FEATURE COMPLETE (2-3 weeks)
  - Full feature set implementation
  - Comprehensive testing
  - Documentation creation
  - Broader user rollout
  → Production readiness review

PHASE 3: OPTIMIZATION (1-2 weeks)
  - Performance tuning
  - Edge case handling
  - User feedback incorporation
  - Final production deployment
  → Success metrics tracking
```

**Success Criteria**:
```
MUST HAVE (Launch Blockers):
  - Core functionality working
  - Security review passed
  - Performance acceptable
  - Documentation complete
  - Tests passing (>90% coverage)

SHOULD HAVE (Post-Launch Priority):
  - Advanced features implemented
  - User experience polished
  - Integration with all agents
  - Advanced monitoring in place

COULD HAVE (Future Iterations):
  - Nice-to-have features
  - Additional optimizations
  - Extended integrations
  - Advanced analytics
```

### 7. Comparative Analysis Framework

**When evaluating multiple ideas simultaneously**:

```
SCORING MATRIX:
                 | Idea A | Idea B | Idea C |
Technical        |   8.5  |   7.0  |   9.0  |
Business Impact  |   9.0  |   8.5  |   7.0  |
Implementation   |   3.0  |   6.0  |   2.0  | (Lower = easier)
User Demand      |   8.0  |   7.5  |   6.0  |
Strategic Fit    |   9.0  |   8.0  |   7.5  |
-----------------+--------+--------+--------+
OVERALL SCORE    |   8.4  |   7.6  |   7.8  |
-----------------+--------+--------+--------+
RECOMMENDATION   |  DO 1st|  DO 3rd|  DO 2nd|
```

**Decision Criteria**:
- If scores within 0.5 → Consider dependencies and sequencing
- If resource-constrained → Choose highest business impact
- If building momentum → Mix quick wins with strategic projects
- If capability gaps critical → Prioritize foundation-building

## Best Practices

### For Idea Collection:
1. **Encourage Specificity**: Vague ideas are hard to evaluate
2. **Capture Context**: Why now? What triggered this idea?
3. **Document Assumptions**: What are we assuming is true?
4. **Identify Constraints**: What limitations exist?
5. **Record Source**: Where did this idea originate?

### For Evaluation:
1. **Be Objective**: Use frameworks, not gut feelings
2. **Be Consistent**: Apply criteria uniformly
3. **Be Thorough**: Don't skip dimensions
4. **Be Realistic**: Honest assessment beats wishful thinking
5. **Be Documented**: Record rationale for future reference

### For Prioritization:
1. **Balance Portfolio**: Mix quick wins and strategic projects
2. **Consider Dependencies**: Sequence ideas logically
3. **Align with Resources**: Don't over-commit
4. **Revisit Periodically**: Priorities change over time
5. **Communicate Decisions**: Explain why ideas accepted or declined

## Integration with Other Skills

- **feedback-frameworks**: Convert feedback into actionable ideas
- **avi-architecture**: Ensure architectural alignment
- **code-standards**: Maintain technical quality
- **task-management**: Create implementation tasks
- **productivity-patterns**: Optimize implementation workflows

## Success Metrics

- **Evaluation Completeness**: 100% of ideas assessed within 1 week
- **Decision Quality**: 85%+ of approved ideas successfully implemented
- **ROI Accuracy**: Actual vs. projected benefits within 20%
- **Rejection Appropriateness**: <10% of rejected ideas later regretted
- **Time to Market**: Average idea-to-implementation < 6 weeks

## References

- [scoring-worksheets.md](scoring-worksheets.md) - Detailed scoring templates
- [business-case-templates.md](business-case-templates.md) - ROI calculation tools
- [feasibility-checklists.md](feasibility-checklists.md) - Technical review guides
- [roadmap-templates.md](roadmap-templates.md) - Implementation planning tools
- [decision-records.md](decision-records.md) - Historical decision archive

## Learning Integration (ReasoningBank)

This skill is learning-enabled through ReasoningBank SAFLA integration.

### What This Skill Learns

- **Pattern Recognition**: Accurate predictors of implementation success, ROI estimation reliability, idea quality indicators, feasibility assessment patterns
- **Success Criteria**: Approved ideas shipped successfully (>80% completion rate), ROI predictions within 25% of actual, user satisfaction with implemented features >4/5
- **Confidence Growth**: Evaluation criteria gain confidence when approved ideas succeed and rejected ideas would have failed

### Learning Workflow

1. **Before Execution**: Query ReasoningBank for relevant patterns
   - Namespace: `idea-evaluation`
   - Context: Idea type, business domain, complexity signals, similar past evaluations
   - Top 5 most confident evaluation patterns retrieved

2. **During Execution**: Apply learned patterns to enhance scoring
   - Adjust scoring weights based on historical accuracy
   - Identify risk factors that previously correlated with failure
   - Recommend similar successful implementations for reference

3. **After Execution**: Record outcome and update confidence
   - Success (idea shipped, ROI met, users satisfied) → +20% confidence boost
   - Failure (idea failed, ROI missed, poor adoption) → -15% confidence reduction
   - Store new patterns from unexpected outcomes (both positive and negative)

### Example: Learning in Action

**Before Learning (Month 1):**
```javascript
Idea: "AI-powered task prioritization"
Initial Evaluation:
  - Technical Feasibility: 7/10
  - Business Impact: 8/10
  - Overall Score: 7.8/10
  - Decision: APPROVE

Outcome: Failed implementation (technical complexity underestimated)
Actual Complexity: Required ML expertise not on team
ROI: -$50K (wasted development time)
```

**After Learning (Month 6):**
```javascript
Idea: "ML-based meeting scheduler"
Learned Pattern: "ML features: verify team expertise first (confidence: 0.88)"
Enhanced Evaluation:
  - Technical Feasibility: 7/10 → 4/10 (adjusted for lack of ML expertise)
  - Team Capability Check: FAILED
  - Overall Score: 7.5 → 5.2/10
  - Decision: DEFER until ML hire completed

Result: Pattern confidence → 0.92
Avoided: $75K in failed development
Alternative: Simpler rule-based scheduler shipped successfully
```

**Real-World Impact:**
- Month 1: 60% of approved ideas ship successfully
- Month 6: 85% of approved ideas ship successfully
- Learned that "authentication" ideas take 2x longer than estimated (pattern confidence: 0.90)
- Discovered high-impact + low-effort ideas have 95% success rate (became priority filter)
- Found that ideas with >3 dependencies have 40% higher failure rate (now flagged in evaluation)

### Pattern Storage Schema

```json
{
  "id": "pattern-idea-ml-expertise-check",
  "content": "ML/AI feature ideas: Require demonstrated team ML expertise or defer. Historical failure rate: 75% without expertise, 15% with expertise",
  "namespace": "idea-evaluation",
  "confidence": 0.88,
  "context": {
    "ideaCategory": "ml-ai-features",
    "criticalSuccessFactor": "team-ml-expertise",
    "adjustmentRule": {
      "hasExpertise": { "technicalFeasibility": "no-adjustment" },
      "noExpertise": { "technicalFeasibility": "-3", "recommendation": "defer-until-hired" }
    },
    "failureRate": {
      "withExpertise": 0.15,
      "withoutExpertise": 0.75
    }
  },
  "outcomes": {
    "success_count": 15,
    "failure_count": 2,
    "last_outcome": "success",
    "avg_roi_accuracy": 0.87,
    "prevented_failures": 8
  }
}
```

### Integration Code Example

```typescript
// Example showing how this skill queries and learns
import { reasoningBankService } from '@/services/safla-service';

async function evaluateIdeaWithLearning(idea: IdeaProposal) {
  // 1. Query learned patterns
  const queryContext = `${idea.category} ${idea.title} ${idea.problemStatement}`;
  const patterns = await reasoningBankService.queryPatterns(
    queryContext,
    'idea-evaluation',
    5
  );

  // 2. Calculate base scores
  let scores = {
    technical: calculateTechnicalFeasibility(idea),
    business: calculateBusinessImpact(idea),
    effort: calculateImplementationEffort(idea),
    demand: calculateUserDemand(idea),
    strategic: calculateStrategicFit(idea)
  };

  // 3. Apply learned adjustments
  for (const pattern of patterns.filter(p => p.confidence > 0.7)) {
    if (pattern.context.adjustmentRule) {
      const { adjustmentRule } = pattern.context;

      // Check if adjustment condition is met
      const conditionMet = evaluateCondition(idea, pattern.context);
      const adjustment = conditionMet ?
        adjustmentRule.hasExpertise :
        adjustmentRule.noExpertise;

      // Apply adjustments to scores
      for (const [dimension, change] of Object.entries(adjustment)) {
        if (typeof change === 'string' && change.startsWith('-')) {
          scores[dimension] += parseInt(change);
        }
      }
    }
  }

  // 4. Calculate final score with learned weights
  const overallScore = calculateWeightedScore(scores);

  // 5. Add learned risk factors
  const riskFactors = patterns
    .filter(p => p.context.failureRate)
    .map(p => ({
      risk: p.content,
      severity: p.context.failureRate.withoutExpertise || p.context.failureRate,
      confidence: p.confidence,
      mitigation: p.context.adjustmentRule?.recommendation
    }));

  // 6. Generate recommendation
  const decision = determineDecision(overallScore, riskFactors);

  return {
    scores,
    overallScore,
    decision,
    learnedRiskFactors: riskFactors,
    patternsApplied: patterns.slice(0, 3),
    confidenceLevel: patterns[0]?.confidence || 0.5,

    // 7. Outcome tracking
    recordOutcome: async (
      shipped: boolean,
      actualROI: number,
      projectedROI: number,
      userSatisfaction: number,
      postMortemNotes: string
    ) => {
      const roiAccuracy = 1 - Math.abs(actualROI - projectedROI) / projectedROI;
      const success = shipped && roiAccuracy > 0.75 && userSatisfaction >= 4;

      for (const pattern of patterns) {
        await reasoningBankService.recordOutcome(
          pattern.id,
          success ? 'success' : 'failure',
          {
            context: {
              ideaId: idea.id,
              shipped,
              actualROI,
              projectedROI,
              roiAccuracy,
              userSatisfaction,
              postMortem: postMortemNotes
            },
            executionTimeMs: 0 // Implementation time tracked separately
          }
        );
      }

      // Store new pattern from this evaluation
      if (!success && !patterns.some(p => p.content.includes(postMortemNotes))) {
        await reasoningBankService.createPattern({
          content: `${idea.category} ideas: ${postMortemNotes} - adjust ${dimension} score by -${adjustmentAmount}`,
          namespace: 'idea-evaluation',
          category: idea.category,
          metadata: {
            failureMode: postMortemNotes,
            originalScore: overallScore,
            shouldHaveBeenDecision: 'DECLINE'
          }
        });
      }
    }
  };
}
```

---

**Remember**: Great execution on a mediocre idea beats mediocre execution on a great idea. Evaluate rigorously, prioritize ruthlessly, execute excellently, and measure relentlessly. The best idea is the one that ships and delivers value.
