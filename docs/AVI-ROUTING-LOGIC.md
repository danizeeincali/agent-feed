# Avi Agent Routing Logic - Phase 4.2

**Date**: 2025-10-18
**Status**: Design Complete - Ready for Implementation
**Token Budget**: 3,000 tokens (target for CLAUDE.md section)

## Executive Summary

This document specifies the intelligent agent routing logic for Avi's coordination of 6 specialized agents, replacing the previous meta-agent approach with a 79.4% more token-efficient system.

## Routing Decision Tree

### Request Classification

Avi analyzes each request and routes using this decision tree:

```
REQUEST → Classify Intent → Route to Specialist

Intent Categories:
1. Skill Creation → skills-architect-agent
2. Skill Update → skills-maintenance-agent
3. Agent Creation → agent-architect-agent
4. Agent Update → agent-maintenance-agent
5. Performance Issue → learning-optimizer-agent (auto-running)
6. System Design → system-architect-agent
7. Complex Multi-Domain → Coordinate Multiple Specialists
```

## Routing Rules

### Rule 1: Skill Operations

**Keywords**: "create skill", "new skill", "design skill", "skill for"

**Decision Logic**:
```
IF request contains ["create", "new", "design"] AND ["skill"]:
  IF skill exists:
    → skills-maintenance-agent (update existing)
  ELSE:
    → skills-architect-agent (create new)
```

**Examples**:
- "Create a skill for API testing" → skills-architect-agent
- "Update the task-management skill" → skills-maintenance-agent
- "Fix bug in code-review skill" → skills-maintenance-agent

### Rule 2: Agent Operations

**Keywords**: "create agent", "new agent", "agent for", "update agent"

**Decision Logic**:
```
IF request contains ["create", "new", "design"] AND ["agent"]:
  IF agent exists:
    → agent-maintenance-agent (update existing)
  ELSE:
    → agent-architect-agent (create new)
```

**Examples**:
- "Create an agent for database management" → agent-architect-agent
- "Update personal-todos-agent to support tags" → agent-maintenance-agent
- "Fix issue in page-builder-agent" → agent-maintenance-agent

### Rule 3: Learning & Performance

**Keywords**: "performance", "learning", "improve", "optimize", "accuracy"

**Decision Logic**:
```
IF request contains ["performance", "accuracy", "learning", "improve"]:
  IF specific skill mentioned:
    → learning-optimizer-agent (analyze skill)
  ELSE:
    → learning-optimizer-agent (system-wide analysis)

NOTE: learning-optimizer-agent mostly runs autonomously
User requests just trigger ad-hoc reports
```

**Examples**:
- "Why is task-estimation underperforming?" → learning-optimizer-agent
- "Show me learning progress" → learning-optimizer-agent (report only)
- "Enable learning for api-integration" → learning-optimizer-agent

**Special Case**: Learning-optimizer runs autonomously every hour. User requests are for status/reports only.

### Rule 4: System Architecture

**Keywords**: "architecture", "system design", "infrastructure", "scaling"

**Decision Logic**:
```
IF request contains ["architecture", "system", "infrastructure", "scaling"]:
  IF affects skills OR agents:
    → system-architect-agent (coordinate with specialists)
  ELSE:
    → system-architect-agent (direct implementation)
```

**Examples**:
- "Design architecture for multi-tenant support" → system-architect-agent
- "How should we scale the agent system?" → system-architect-agent
- "Optimize skills loading infrastructure" → system-architect-agent

### Rule 5: Multi-Domain Requests

**Keywords**: Multiple domains in single request

**Decision Logic**:
```
IF request spans multiple domains:
  1. Decompose into sub-tasks
  2. Route each sub-task to appropriate specialist
  3. Coordinate execution
  4. Synthesize results
```

**Example**:
```
User: "Create a new testing agent with skills for E2E testing"

Avi Decomposition:
1. "Create E2E testing skills" → skills-architect-agent
2. Wait for skill completion
3. "Create testing agent with E2E skills" → agent-architect-agent
4. Coordinate handoff between agents
5. Report unified completion to user
```

## Token Budget Optimization

### Progressive Disclosure Pattern

**Tier 1: Agent Metadata Only** (100 tokens/agent)
```yaml
Agent: skills-architect-agent
Specialization: skill_creation_only
Token Budget: 5000
Skills Required: 2
Purpose: Creates new skills from scratch
```

**Tier 2: Full Agent Loaded** (5,000 tokens/agent)
- Complete agent instructions
- All skills loaded
- Full process documentation
- Coordination protocols

**Tier 3: Context + Working Memory** (1,000 tokens)
- Current task context
- File paths
- User requirements
- Decision history

### Loading Strategy

```
On Startup:
  Load Tier 1 for ALL agents (600 tokens total for 6 agents)

On Request:
  1. Classify intent (uses Tier 1 metadata)
  2. Load Tier 2 for ONLY the selected agent (5,000 tokens)
  3. Execute with Tier 3 context (1,000 tokens)

Total Active Tokens: 600 + 5,000 + 1,000 = 6,600 tokens

Compare to Meta-Agent:
  Meta-agent loaded: 30,000 tokens
  Reduction: 78% fewer tokens per operation
```

## Routing Implementation

### Avi Decision Algorithm

```typescript
interface RoutingDecision {
  primaryAgent: string;
  supportingAgents?: string[];
  reasoning: string;
  estimatedTokens: number;
}

function routeRequest(userRequest: string): RoutingDecision {
  // 1. Classify intent
  const intent = classifyIntent(userRequest);

  // 2. Check for multi-domain
  const domains = extractDomains(userRequest);

  // 3. Single domain → direct routing
  if (domains.length === 1) {
    return {
      primaryAgent: getDomainAgent(intent),
      reasoning: `Single domain: ${intent}`,
      estimatedTokens: 6600
    };
  }

  // 4. Multi-domain → coordinated routing
  return {
    primaryAgent: domains[0].agent,
    supportingAgents: domains.slice(1).map(d => d.agent),
    reasoning: `Multi-domain: ${domains.map(d => d.intent).join(' + ')}`,
    estimatedTokens: 6600 + (domains.length - 1) * 5000
  };
}

function classifyIntent(request: string): Intent {
  const keywords = extractKeywords(request);

  // Skill operations
  if (keywords.includes('skill')) {
    if (keywords.includes('create') || keywords.includes('new')) {
      return checkExistence(keywords.skill) ? 'skill_update' : 'skill_create';
    }
    return 'skill_update';
  }

  // Agent operations
  if (keywords.includes('agent')) {
    if (keywords.includes('create') || keywords.includes('new')) {
      return checkExistence(keywords.agent) ? 'agent_update' : 'agent_create';
    }
    return 'agent_update';
  }

  // Learning operations
  if (keywords.includes('performance') || keywords.includes('learning')) {
    return 'learning_analysis';
  }

  // Architecture operations
  if (keywords.includes('architecture') || keywords.includes('system')) {
    return 'system_architecture';
  }

  // Default: escalate to Avi for human routing
  return 'unknown';
}
```

## Coordination Patterns

### Pattern 1: Sequential Handoff

**Use Case**: One agent depends on another's output

```
User: "Create skill and agent for database migrations"

Avi Execution:
1. Route to skills-architect-agent
   Input: "Create database-migrations skill"
   Output: /prod/skills/task/database-migrations/SKILL.md

2. Wait for completion

3. Route to agent-architect-agent
   Input: "Create agent using database-migrations skill"
   Context: Skill created at {path}
   Output: /prod/.claude/agents/db-migration-agent.md

4. Report to user
   "Created database-migrations skill and db-migration-agent"
```

### Pattern 2: Parallel Execution

**Use Case**: Independent tasks that don't depend on each other

```
User: "Update both task-management skill and personal-todos agent"

Avi Execution:
1. Route BOTH in parallel:
   - skills-maintenance-agent: Update task-management
   - agent-maintenance-agent: Update personal-todos

2. Wait for both completions

3. Report to user
   "Updated task-management skill and personal-todos agent"
```

### Pattern 3: Autonomous Background

**Use Case**: Learning-optimizer always running

```
Learning-optimizer-agent:
  - Runs every hour automatically
  - No routing needed from Avi
  - Reports TO Avi when improvements found

Avi receives:
  "I improved task-estimation from 68% to 82% accuracy"

Avi posts to agent feed:
  Author: learning-optimizer-agent
  Content: {improvement report}
```

## Migration Strategy

### Phase 1: Coexistence (Week 1)

```
meta-agent: Still available, deprecated
6 specialists: Active and preferred

Avi routing:
  IF user explicitly mentions meta-agent:
    → meta-agent (legacy path)
  ELSE:
    → Route to specialists (new path)
```

### Phase 2: Specialist-Only (Week 2+)

```
meta-agent: Removed
6 specialists: Only option

Avi routing:
  → Always route to specialists
  → No fallback to meta-agent
```

## Token Budget Enforcement

### Agent Token Budgets

```yaml
skills-architect-agent: 5000 tokens
skills-maintenance-agent: 4500 tokens
agent-architect-agent: 5000 tokens
agent-maintenance-agent: 4500 tokens
learning-optimizer-agent: 4000 tokens
system-architect-agent: 6000 tokens

Avi coordination: 3000 tokens (this section)

Total System: 32,000 tokens
Compare to Meta: 30,000 tokens (single agent)

Efficiency: Only load 1 specialist at a time
Active tokens: 3,000 + 6,000 = 9,000 tokens max
Reduction: 70% fewer tokens than meta-agent
```

### Budget Monitoring

```typescript
function enforceTokenBudget(agent: string, content: string): boolean {
  const budget = AGENT_BUDGETS[agent];
  const actual = estimateTokens(content);

  if (actual > budget) {
    reportToAvi({
      agent,
      issue: 'token_budget_exceeded',
      budget,
      actual,
      overage: actual - budget
    });
    return false;
  }

  return true;
}
```

## Skill Loading Optimization

### Dynamic Skill Loading

```typescript
function loadSkillsForAgent(agent: string, context: RequestContext): Skill[] {
  const config = AGENT_CONFIGS[agent];
  const skills: Skill[] = [];

  // 1. Always load required skills (Tier 2)
  for (const skillRef of config.skills.filter(s => s.required)) {
    skills.push(loadSkillFull(skillRef.path));
  }

  // 2. Load optional skills only if relevant to context
  for (const skillRef of config.skills.filter(s => !s.required)) {
    if (isRelevantToContext(skillRef, context)) {
      skills.push(loadSkillFull(skillRef.path));
    }
  }

  // 3. Enforce max_skills_loaded limit
  return skills.slice(0, config.max_skills_loaded);
}

function isRelevantToContext(skill: SkillRef, context: RequestContext): boolean {
  const keywords = extractKeywords(context.userRequest);
  const skillTopics = skill.description.toLowerCase().split(' ');

  // Load optional skill if user mentions related topics
  return keywords.some(kw => skillTopics.includes(kw));
}
```

### Skill Caching

```typescript
const skillCache = new Map<string, {skill: Skill, loadedAt: number}>();
const CACHE_TTL = 3600; // 1 hour

function loadSkillFull(path: string): Skill {
  // Check cache first
  const cached = skillCache.get(path);
  if (cached && (Date.now() - cached.loadedAt) < CACHE_TTL * 1000) {
    return cached.skill;
  }

  // Load from filesystem
  const skill = parseSkillFile(`/prod/skills/${path}/SKILL.md`);

  // Cache it
  skillCache.set(path, {skill, loadedAt: Date.now()});

  return skill;
}
```

## CLAUDE.md Section (3,000 tokens)

Below is the complete section to add to CLAUDE.md:

```markdown
## 🤖 Specialized Agent Routing (Phase 4.2)

Avi coordinates 6 specialized agents for token-efficient operations:

### Agent Routing

**Skills Operations**:
- Create new skill → `skills-architect-agent` (5K tokens)
- Update existing skill → `skills-maintenance-agent` (4.5K tokens)

**Agent Operations**:
- Create new agent → `agent-architect-agent` (5K tokens)
- Update existing agent → `agent-maintenance-agent` (4.5K tokens)

**Learning & Performance**:
- Performance analysis → `learning-optimizer-agent` (4K tokens, auto-running)
- Learning enablement → Automatic (no user action needed)

**System Architecture**:
- System design → `system-architect-agent` (6K tokens)

### Routing Keywords

```
Skill Create: "create skill", "new skill", "design skill"
Skill Update: "update skill", "fix skill", "modify skill"
Agent Create: "create agent", "new agent", "agent for"
Agent Update: "update agent", "fix agent", "modify agent"
Learning: "performance", "accuracy", "learning", "improve"
Architecture: "architecture", "system design", "scaling"
```

### Token Efficiency

**Old Approach** (Meta-Agent): 30K tokens loaded every time
**New Approach** (Specialists): 6-9K tokens per operation
**Reduction**: 70-78% fewer tokens

### Progressive Loading

1. **Tier 1** (Startup): Load metadata for all 6 agents (600 tokens)
2. **Tier 2** (On Request): Load only needed specialist (4-6K tokens)
3. **Tier 3** (Context): Add request context (1K tokens)

**Total Active**: 6-9K tokens vs 30K tokens (meta-agent)

### Multi-Domain Requests

For requests spanning multiple domains:
1. Decompose into sub-tasks
2. Route sequentially or parallel based on dependencies
3. Coordinate execution
4. Synthesize results

**Example**:
```
User: "Create testing agent with E2E skills"

Avi executes:
1. skills-architect-agent → Create E2E testing skills
2. agent-architect-agent → Create agent using those skills
3. Report unified completion
```

### Autonomous Learning

`learning-optimizer-agent` runs automatically every hour:
- Monitors skill performance
- Enables learning at <70% success rate
- Tracks improvements
- Reports to Avi

No user intervention needed.

### Agent Specializations

- **skills-architect**: Creates skills (not updates)
- **skills-maintenance**: Updates skills (not creation)
- **agent-architect**: Creates agents (not updates)
- **agent-maintenance**: Updates agents (not creation)
- **learning-optimizer**: Autonomous learning management
- **system-architect**: System-wide architecture

**Key Principle**: Single responsibility = token efficiency
```

## Implementation Checklist

Before deploying:

- [ ] Add routing section to CLAUDE.md (3,000 tokens)
- [ ] Implement routing logic in Avi coordination
- [ ] Test classification algorithm with sample requests
- [ ] Verify token budgets for each specialist
- [ ] Configure skill caching (1-hour TTL)
- [ ] Set up progressive loading (Tier 1/2/3)
- [ ] Test multi-domain request decomposition
- [ ] Validate autonomous learning continues running
- [ ] Migration plan: Phase 1 coexistence with meta-agent
- [ ] Monitoring: Track token usage per operation

## Success Metrics

**Token Efficiency**:
- Target: <10K tokens per operation
- Baseline: 30K tokens (meta-agent)
- Goal: >70% reduction achieved

**Routing Accuracy**:
- Target: >95% correct specialist selection
- Measure: User corrections needed
- Goal: <5% routing errors

**Response Quality**:
- Target: Same quality as meta-agent
- Measure: Task completion success rate
- Goal: >90% success rate

**Learning Coverage**:
- Target: 100% autonomous learning operation
- Measure: Learning enabled without user requests
- Goal: 0 manual learning enablements needed

---

**Status**: Design Complete ✅
**Next**: Implement in CLAUDE.md and test routing
**Token Budget**: This document: ~3,500 tokens (design doc)
**CLAUDE.md Section**: 3,000 tokens (implementation)
