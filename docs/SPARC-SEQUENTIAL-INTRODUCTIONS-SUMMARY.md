# Sequential Agent Introduction System - Executive Summary

**Full Specification**: [SPARC-SEQUENTIAL-INTRODUCTIONS.md](./SPARC-SEQUENTIAL-INTRODUCTIONS.md)
**Status**: ✅ SPECIFICATION COMPLETE
**Implementation Estimate**: 4 weeks (1 developer)
**Swarm Memory Key**: `sequential-intro/sparc-spec`

---

## What We're Building

A progressive agent introduction system that reveals agents to users one at a time, based on:
- **Engagement milestones** (posts created, interactions, days active)
- **Context triggers** (keywords in posts, workflow patterns)
- **Natural progression** (24-48 hour gaps between introductions)
- **Personalized content** (LLM-generated introductions referencing user activity)

---

## Key Components

### 1. Sequential Introduction Orchestrator
**File**: `api-server/services/sequential-introductions/orchestrator.service.js`

**Responsibilities**:
- Calculate readiness scores for all un-introduced agents (0.0-1.0)
- Enforce rate limiting (max 1 intro per 24 hours)
- Prioritize agents by readiness score
- Introduce top candidate when score ≥0.5

**Algorithm**:
```
Readiness Score =
  (Engagement Score × 0.3) +
  (Context Score × 0.4) +
  (Prerequisite Score × 0.2) +
  (Timing Score × 0.1)
```

### 2. Engagement Detection Service
**File**: `api-server/services/sequential-introductions/engagement-detection.service.js`

**Responsibilities**:
- Track user engagement metrics (posts, comments, interactions)
- Detect context keywords in user posts
- Calculate interaction quality (do users engage with agent responses?)
- Identify workflow patterns for automation opportunities

**Metrics Tracked**:
- Total posts created
- Total agent interactions
- Days active on platform
- Interaction quality score (replies to agent posts)

### 3. Conversational Introduction Generator
**File**: `api-server/services/sequential-introductions/introduction-generator.service.js`

**Responsibilities**:
- Generate personalized introduction posts using LLM
- Reference user's recent activity in first sentence
- Explain WHY this agent is valuable NOW
- Include 2-3 specific examples based on user context
- Fallback to template if LLM fails

**Example Introduction**:
> "Hi Alex! I noticed you've created 3 posts about productivity - I'm the Personal Todos agent and I can help you organize those ideas. I use IMPACT prioritization (Importance, Momentum, People, Advancement, Context, Time) to help you focus on what matters most. Try mentioning @personal-todos-agent to create your first task!"

### 4. PageBuilder Showcase Workflow
**File**: `api-server/services/sequential-introductions/workflows/pagebuilder-showcase.workflow.js`

**Trigger Conditions**:
- User created 3+ posts, OR
- User mentioned "page", "dashboard", "layout" in post, OR
- User shared 2+ links (can showcase with pages)

**Introduction Includes**:
- Visual example of PageBuilder capabilities
- Suggested templates based on user's content
- Offer to create first page automatically

### 5. Agent Builder Tutorial Workflow
**File**: `api-server/services/sequential-introductions/workflows/agent-builder-tutorial.workflow.js`

**Trigger Conditions**:
- User has 2+ core agents introduced
- User has 5+ meaningful agent interactions
- User active for 3+ days

**Introduction Includes**:
- Detected automation opportunities from user's workflow
- Template for first custom agent
- Step-by-step tutorial offer

---

## Database Schema

### Extended Tables

**agent_introductions** (extend existing):
```sql
ALTER TABLE agent_introductions ADD COLUMN readiness_score REAL DEFAULT 0.0;
ALTER TABLE agent_introductions ADD COLUMN introduction_attempt INTEGER DEFAULT 1;
ALTER TABLE agent_introductions ADD COLUMN ignored BOOLEAN DEFAULT 0;
ALTER TABLE agent_introductions ADD COLUMN first_interaction_at INTEGER;
```

**engagement_metrics** (new):
```sql
CREATE TABLE engagement_metrics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  metric_date INTEGER NOT NULL,
  total_posts INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  agent_interactions INTEGER DEFAULT 0,
  quality_score REAL DEFAULT 0.0,
  created_at INTEGER NOT NULL
);
```

**introduction_queue** (new):
```sql
CREATE TABLE introduction_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  readiness_score REAL NOT NULL,
  context_trigger TEXT,  -- JSON
  scheduled_for INTEGER,
  created_at INTEGER NOT NULL,
  status TEXT CHECK(status IN ('pending', 'ready', 'introduced', 'deferred'))
);
```

**workflow_patterns** (new):
```sql
CREATE TABLE workflow_patterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  description TEXT NOT NULL,
  frequency INTEGER DEFAULT 1,
  last_detected INTEGER NOT NULL,
  suggested_agent_id TEXT,
  created_at INTEGER NOT NULL
);
```

---

## Integration Points

### Existing Services (Modify)
1. **OnboardingFlowService** → Trigger intros after Phase 1 completion
2. **AgentIntroductionService** → Extend with sequential logic
3. **HemingwayBridgeService** → Create engagement bridges for pending intros
4. **Post/Comment Handlers** → Track user activity for engagement metrics

### Event Hooks (Add)
```javascript
// After post creation
orchestrator.checkAndScheduleIntroductions(userId, {
  type: "post_created",
  content: post.content,
  timestamp: Date.now()
});

// After comment on agent post
stateManager.recordInteraction(userId, agentId, {
  type: "comment",
  quality: "high"  // User engaged with agent response
});

// After Phase 1 completion
orchestrator.checkAndScheduleIntroductions(userId, {
  type: "phase1_complete"
});
```

---

## User Flow Example

### Day 1: User Signs Up
1. User completes onboarding (Phase 1)
2. System calculates readiness scores
3. Personal Todos agent has highest score (0.8)
4. **Personal Todos introduces itself** (24h wait starts)

### Day 2: User Creates Posts
1. User creates 2 posts about project management
2. Agent Ideas score increases (context match)
3. System checks: 24h elapsed? Yes
4. **Agent Ideas introduces itself** (24h wait starts)

### Day 3: User Mentions "Dashboard"
1. User creates post: "I need a dashboard to track progress"
2. PageBuilder score jumps to 0.9 (keyword match)
3. System checks: 24h elapsed? Yes
4. **PageBuilder introduces with dashboard offer** (24h wait starts)

### Day 5: User Has 5 Agent Interactions
1. User replied to 3 agent posts, mentioned agents 2 times
2. Agent Builder prerequisites met (2+ core agents, 5+ interactions, 3+ days)
3. System detects automation opportunity: "User creates daily standup posts"
4. **Agent Builder introduces with tutorial** (suggests "Standup Agent")

---

## Acceptance Criteria

### AC-1: Rate Limiting
```gherkin
GIVEN Personal Todos introduced 12 hours ago
WHEN PageBuilder trigger conditions met
THEN PageBuilder introduction is DEFERRED
AND PageBuilder introduces 12 hours later (24h from last intro)
```

### AC-2: Context Triggering
```gherkin
GIVEN user creates post containing "dashboard"
AND PageBuilder not yet introduced
AND 24 hours since last introduction
THEN PageBuilder creates contextual introduction
AND introduction references user's dashboard need
```

### AC-3: Engagement Gating
```gherkin
GIVEN user has 4 agent interactions (below threshold)
WHEN Agent Builder checks prerequisites
THEN Agent Builder introduction is BLOCKED
AND system waits for 5th interaction
```

### AC-4: Ignored Agent Re-Surface
```gherkin
GIVEN Personal Todos introduced 7 days ago
AND user has NOT interacted with Personal Todos
WHEN user reaches new engagement milestone
THEN Personal Todos re-introduces with different approach
```

### AC-5: Personalization Quality
```gherkin
GIVEN user's use case is "business"
AND user created posts about "quarterly planning"
WHEN Personal Todos introduces
THEN introduction mentions "strategic initiatives" and "business priorities"
AND examples reference "quarterly planning" context
```

---

## Performance Requirements

| Metric | Target | Validation |
|--------|--------|------------|
| Readiness calculation | <100ms for all agents | Load test with 10 pending agents |
| Engagement metric query | <50ms | Database query optimization |
| Introduction generation | <500ms (incl. LLM) | Timeout fallback to template |
| Event handler overhead | <10ms added | Profile post/comment handlers |
| Database query latency | <50ms (p95) | Proper indexing on all queries |

---

## Success Metrics

### Quantitative
- **Introduction Success Rate**: ≥60% of introductions lead to user interaction within 7 days
- **Agent Adoption Rate**: ≥70% of introduced agents used at least once
- **Time to First Interaction**: Average <48 hours from intro to first use
- **Re-introduction Rate**: <20% of agents require re-introduction

### Qualitative
- Users report discovering agents "at the right time" (survey)
- Users don't feel overwhelmed by agent spam (survey)
- Introductions feel relevant and contextual (feedback)

---

## Implementation Phases

### Week 1: Core Services
- [x] Spec complete ✅
- [ ] Create orchestrator service
- [ ] Implement readiness scoring
- [ ] Create database migrations
- [ ] Unit tests (20+)

### Week 2: Detection & Generation
- [ ] Create engagement detection service
- [ ] Implement metric tracking
- [ ] Create introduction generator
- [ ] LLM integration + fallback
- [ ] Unit tests (25+)

### Week 3: Workflows & Integration
- [ ] Create PageBuilder workflow
- [ ] Create Agent Builder workflow
- [ ] Integrate with OnboardingFlowService
- [ ] Hook into post/comment handlers
- [ ] Integration tests (20+)

### Week 4: Testing & Deployment
- [ ] Performance testing
- [ ] Load testing
- [ ] Edge case validation
- [ ] Documentation
- [ ] Alpha testing (10 users)
- [ ] Production deployment

---

## Files to Create

### Services (6 files)
1. `orchestrator.service.js` - Main coordination logic
2. `engagement-detection.service.js` - Metric tracking and scoring
3. `introduction-generator.service.js` - Content generation with LLM
4. `state-manager.service.js` - Queue and state management
5. `workflows/pagebuilder-showcase.workflow.js` - PageBuilder intro
6. `workflows/agent-builder-tutorial.workflow.js` - Agent Builder intro

### Database (1 file)
7. `migrations/add-sequential-introduction-tables.sql` - Schema updates

### Tests (4 files)
8. `tests/services/sequential-introductions/orchestrator.service.test.js`
9. `tests/services/sequential-introductions/engagement-detection.service.test.js`
10. `tests/services/sequential-introductions/introduction-generator.service.test.js`
11. `tests/integration/sequential-introductions-e2e.test.js`

### Documentation (3 files)
12. `docs/SEQUENTIAL-INTRODUCTIONS-INTEGRATION-GUIDE.md`
13. `docs/SEQUENTIAL-INTRODUCTIONS-API-REFERENCE.md`
14. `docs/INTRODUCTION-CONTENT-GUIDELINES.md`

### Configuration (1 file)
15. `config/sequential-introductions.config.js` - Thresholds and weights

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| LLM latency >1s | Poor UX | Medium | 500ms timeout, template fallback |
| Introduction fatigue | Low adoption | Low | 24h rate limit, A/B test 48h |
| Context false positives | Irrelevant intros | Medium | Require 0.3 context score + other factors |
| DB performance | Slow scoring | Low | Proper indexing, caching, async |
| Queue overflow | Too many pending | Low | Cap at 5 agents per user |

---

## Next Steps

1. **Review this spec** with team/stakeholders
2. **Approve architecture** and database schema
3. **Begin Week 1** implementation (orchestrator service)
4. **Set up monitoring** dashboard for alpha testing
5. **Schedule weekly check-ins** for progress tracking

---

## Questions for Stakeholders

1. **Rate Limiting**: Should we use 24h or 48h between introductions? (A/B test?)
2. **LLM Budget**: What's acceptable cost per introduction generation?
3. **Introduction Content**: Should we involve copywriters for templates?
4. **Metrics Dashboard**: Who will monitor introduction success rates?
5. **Alpha Testing**: Which 10 users should we start with?

---

**Status**: ✅ READY FOR IMPLEMENTATION
**Estimated Delivery**: 4 weeks from approval
**Team Size**: 1 backend developer + 1 tester

**Contact**: SPARC Specification Writer Agent
**Swarm Memory**: `.swarm/memory.db` → key: `sequential-intro/sparc-spec`
