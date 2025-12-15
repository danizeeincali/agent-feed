# Sequential Agent Introduction System - Quick Reference

**Full Spec**: [SPARC-SEQUENTIAL-INTRODUCTIONS.md](./SPARC-SEQUENTIAL-INTRODUCTIONS.md)
**Summary**: [SPARC-SEQUENTIAL-INTRODUCTIONS-SUMMARY.md](./SPARC-SEQUENTIAL-INTRODUCTIONS-SUMMARY.md)

---

## 🎯 Core Concept

**Sequential introductions** = Agents revealed progressively based on user engagement, NOT all at once.

**Formula**:
```
Readiness Score = (Engagement × 0.3) + (Context × 0.4) + (Prerequisites × 0.2) + (Timing × 0.1)
```

**Rule**: Introduce when `readiness ≥ 0.5` AND `24h since last intro`

---

## 🏗️ Architecture (3 Core Services)

### 1. Orchestrator (`orchestrator.service.js`)
```javascript
// Main entry point - call on user events
await orchestrator.checkAndScheduleIntroductions(userId, {
  type: 'post_created',
  content: post.content,
  timestamp: Date.now()
});

// Returns: { canIntroduce: true, agentId, postId } or { canIntroduce: false, reason }
```

### 2. Detection (`engagement-detection.service.js`)
```javascript
// Calculate scores
const engagementScore = detection.calculateEngagementScore(userId, agentConfig);
const contextScore = detection.calculateContextScore(eventContext, agentConfig);

// Get metrics
const metrics = detection.getUserEngagementMetrics(userId);
// Returns: { totalPosts, totalInteractions, daysActive, lastActivityTime }
```

### 3. Generator (`introduction-generator.service.js`)
```javascript
// Generate personalized intro
const intro = await generator.generateIntroduction(userId, agentConfig, eventContext);
// Returns: { success: true, postId, agentId, content }
```

---

## 📊 Database Tables (4 New/Extended)

### 1. `agent_introductions` (extend existing)
```sql
-- Add columns:
readiness_score REAL DEFAULT 0.0
introduction_attempt INTEGER DEFAULT 1
ignored BOOLEAN DEFAULT 0
first_interaction_at INTEGER
```

### 2. `engagement_metrics` (new)
```sql
user_id, metric_date, total_posts, total_comments,
agent_interactions, quality_score
```

### 3. `introduction_queue` (new)
```sql
user_id, agent_id, readiness_score, context_trigger,
scheduled_for, status ('pending'|'ready'|'introduced'|'deferred')
```

### 4. `workflow_patterns` (new)
```sql
user_id, pattern_type, description, frequency,
suggested_agent_id
```

---

## 🔌 Integration Hooks

### Hook 1: After Post Creation
```javascript
// In: api-server/routes/posts.js
app.post('/api/posts', async (req, res) => {
  const post = await createPost(req.body);

  // NEW: Check for agent introductions
  await orchestrator.checkAndScheduleIntroductions(req.userId, {
    type: 'post_created',
    content: post.content
  });

  res.json(post);
});
```

### Hook 2: After Phase 1 Completion
```javascript
// In: api-server/services/onboarding/onboarding-flow-service.js
processUseCaseResponse(userId, useCase) {
  // ... existing code ...

  // NEW: Trigger core agent introductions
  await orchestrator.checkAndScheduleIntroductions(userId, {
    type: 'phase1_complete'
  });
}
```

### Hook 3: After Comment on Agent Post
```javascript
// In: api-server/routes/comments.js
app.post('/api/posts/:id/comments', async (req, res) => {
  const comment = await createComment(req.body);

  // NEW: Track interaction quality
  if (isAgentPost(comment.post_id)) {
    await stateManager.recordInteraction(req.userId, post.agentId, {
      type: 'comment',
      quality: 'high'
    });
  }

  res.json(comment);
});
```

---

## 🎨 Agent Configuration (intro-templates)

### Template Structure
```json
{
  "agentId": "page-builder-agent",
  "displayName": "Page Builder",
  "description": "I create dynamic pages...",
  "capabilities": ["Build dashboards", "Create layouts"],
  "examples": ["Create a dashboard", "Build a profile page"],
  "cta": "Try mentioning @page-builder-agent!",
  "triggerRules": {
    "immediate": false,
    "contextual": ["page", "dashboard", "layout"],
    "minPosts": 3,
    "minInteractions": null,
    "minDaysActive": null
  },
  "prerequisites": {
    "agents": ["personal-todos-agent"],
    "phase": 1
  }
}
```

### Trigger Rule Examples

**Immediate (core agents)**:
```json
"triggerRules": {
  "immediate": true,  // Intro after Phase 1
  "minPosts": null
}
```

**Context-based (specialized agents)**:
```json
"triggerRules": {
  "immediate": false,
  "contextual": ["page", "dashboard", "layout"],  // Keywords
  "minPosts": 3  // Minimum engagement
}
```

**Milestone-based (advanced agents)**:
```json
"triggerRules": {
  "immediate": false,
  "minInteractions": 5,  // 5+ agent interactions
  "minDaysActive": 3     // 3+ days on platform
}
```

---

## 🧪 Testing Quick Commands

### Run Unit Tests
```bash
npm test -- api-server/tests/services/sequential-introductions
```

### Run Integration Tests
```bash
npm test -- api-server/tests/integration/sequential-introductions-e2e.test.js
```

### Test Readiness Calculation
```javascript
const score = await orchestrator.calculateReadinessScore(
  'test-user-123',
  pageBuilderConfig,
  { type: 'post_created', content: 'I need a dashboard' }
);
console.log(score);  // Should be ~0.9 (high context match)
```

### Test Rate Limiting
```javascript
// Introduce agent 1
await orchestrator.introduceAgent(userId, agent1Config);

// Try to introduce agent 2 immediately
const result = await orchestrator.checkAndScheduleIntroductions(userId, context);
console.log(result.canIntroduce);  // Should be false (rate limited)
```

---

## 🐛 Debugging Checklist

### Introduction Not Triggering?
1. Check `agent_introductions` → already introduced?
2. Check readiness score → score ≥ 0.5?
3. Check last intro timestamp → 24h elapsed?
4. Check prerequisites → met?
5. Check logs → any errors?

### Context Not Matching?
1. Verify keywords in `triggerRules.contextual`
2. Check `calculateContextScore()` logic
3. Test with exact keyword in post content
4. Check minimum engagement thresholds met

### Introduction Content Not Personalized?
1. Check LLM integration → API key valid?
2. Check timeout → <500ms?
3. Check fallback → template loaded?
4. Check user context → data available?

---

## 📈 Monitoring Queries

### Check Introduction Queue
```sql
SELECT user_id, agent_id, readiness_score, status, scheduled_for
FROM introduction_queue
WHERE status = 'pending'
ORDER BY readiness_score DESC;
```

### Check Recent Introductions
```sql
SELECT ai.user_id, ai.agent_id, ai.introduced_at, ai.readiness_score, ai.ignored
FROM agent_introductions ai
WHERE ai.introduced_at > unixepoch() - 86400  -- Last 24h
ORDER BY ai.introduced_at DESC;
```

### Check Engagement Metrics
```sql
SELECT user_id, SUM(total_posts) as posts,
       SUM(agent_interactions) as interactions,
       AVG(quality_score) as avg_quality
FROM engagement_metrics
GROUP BY user_id;
```

### Check Ignored Agents
```sql
SELECT user_id, agent_id, introduced_at, interaction_count
FROM agent_introductions
WHERE ignored = 1
AND introduced_at < unixepoch() - 604800;  -- Ignored for 7+ days
```

---

## 🚀 Performance Targets

| Operation | Target | Test Command |
|-----------|--------|--------------|
| Readiness calculation | <100ms | `time orchestrator.calculateReadinessScore()` |
| Engagement query | <50ms | `EXPLAIN QUERY PLAN SELECT...` |
| Introduction generation | <500ms | `time generator.generateIntroduction()` |
| Event handler overhead | <10ms | Profile `/api/posts` endpoint |

---

## 🔧 Configuration

### Adjust Rate Limiting
```javascript
// In: config/sequential-introductions.config.js
export const config = {
  MIN_WAIT_HOURS: 24,  // Change to 48 for less frequent intros
  MAX_INTROS_PER_SESSION: 1
};
```

### Adjust Readiness Weights
```javascript
const weights = {
  engagement: 0.3,  // Increase for engagement-heavy scoring
  context: 0.4,     // Increase for context-heavy scoring
  prerequisites: 0.2,
  timing: 0.1
};
```

### Adjust Score Threshold
```javascript
if (topCandidate.score < 0.5) {  // Change to 0.6 for stricter gating
  // Not ready yet
}
```

---

## 📚 Related Documentation

- **Full Specification**: [SPARC-SEQUENTIAL-INTRODUCTIONS.md](./SPARC-SEQUENTIAL-INTRODUCTIONS.md) (1,559 lines)
- **Executive Summary**: [SPARC-SEQUENTIAL-INTRODUCTIONS-SUMMARY.md](./SPARC-SEQUENTIAL-INTRODUCTIONS-SUMMARY.md)
- **Integration Guide**: `SEQUENTIAL-INTRODUCTIONS-INTEGRATION-GUIDE.md` (to be created)
- **API Reference**: `SEQUENTIAL-INTRODUCTIONS-API-REFERENCE.md` (to be created)

---

## 🤝 Get Help

- **Swarm Memory**: `.swarm/memory.db` → key: `sequential-intro/sparc-spec`
- **Claude Flow Hooks**: `npx claude-flow@alpha hooks --help`
- **Team Contact**: SPARC Specification Writer Agent

---

**Last Updated**: 2025-11-06
**Status**: ✅ SPECIFICATION COMPLETE, READY FOR IMPLEMENTATION
