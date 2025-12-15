# Avi Skills-Based Refactor - Complete Implementation Plan

**Date**: 2025-10-30
**Status**: 📋 READY FOR IMPLEMENTATION
**Goal**: Reduce token costs by 95% while maintaining full Avi capabilities

---

## 🎯 Executive Summary

### The Problem
- Current CLAUDE.md: ~50,000 tokens loaded for EVERY query
- Cost: $0.62 for 2 simple queries ("what is 4949+98?")
- Prompt caching active but counterproductive for short sessions
- 75% of costs are cache writes that don't amortize

### The Solution
**Skills-based architecture with progressive loading:**
- Minimal core identity (3k tokens) always loaded
- Capabilities extracted to skill files (loaded on-demand)
- Simple queries: 3k tokens (95% reduction)
- Complex queries: 12-16k tokens (68% reduction)
- Keep Claude Code SDK ✅
- Maintain full Avi capabilities ✅

---

## 📊 Cost Impact Analysis

### Current State
```
Simple query: "what is 3000+500?"
├── CLAUDE.md: 50,000 tokens
├── User content: 100 tokens
├── Total: 50,100 tokens
├── Cost: $0.31 per query
└── With caching: $0.19 first + $0.02 subsequent

2-query session: $0.62 (current actual cost)
```

### After Refactor
```
Simple query: "what is 3000+500?"
├── CLAUDE-CORE.md: 3,000 tokens
├── User content: 100 tokens
├── Total: 3,100 tokens
├── Cost: $0.01 per query
└── No caching needed

2-query session: $0.02 (97% reduction!)

Complex query: "coordinate agents to build API"
├── CLAUDE-CORE.md: 3,000 tokens
├── Skills loaded: 10,000 tokens
│   ├── coordination-protocols.md
│   ├── agent-ecosystem.md
│   └── strategic-analysis.md
├── User content: 500 tokens
├── Total: 13,500 tokens
├── Cost: $0.04 per query
└── No caching needed

2-query session: $0.08 (87% reduction)
```

### Monthly Savings (100 queries/month)
```
Current:  $31 (simple) + $62 (complex) = $93/month
After:    $1 (simple) + $8 (complex) = $9/month
Savings:  $84/month (90% reduction)
```

---

## 🏗️ Architecture Design

### Phase 1: Core Files Structure

```
/workspaces/agent-feed/prod/
├── CLAUDE-CORE.md (NEW)                    # 3k tokens - Always loaded
│   ├── System boundaries (essential)
│   ├── Minimal Avi identity
│   ├── Skill discovery protocol
│   └── Agent workspace rules
│
├── CLAUDE.md (DEPRECATED)                  # Archive original
│   └── Renamed to CLAUDE-FULL.md.backup
│
└── agent_workspace/
    └── skills/
        └── avi/                            # NEW skills directory
            ├── coordination-protocols.md    # 3k tokens
            ├── agent-ecosystem.md          # 3k tokens
            ├── strategic-analysis.md       # 2k tokens
            ├── posting-protocols.md        # 2k tokens
            ├── memory-management.md        # 1k tokens
            ├── task-routing.md             # 1k tokens
            └── behavioral-patterns.md      # 2k tokens
```

### Phase 2: Skill Loading System

**File**: `/prod/src/services/SkillLoader.js` (NEW)

```javascript
export class SkillLoader {
  constructor() {
    this.skillsPath = '/workspaces/agent-feed/prod/agent_workspace/skills/avi';
    this.cache = new Map();
    this.metadata = this.loadMetadata();
  }

  /**
   * Load metadata for all skills (Tier 1)
   * Returns skill names, descriptions, and trigger keywords
   * Cost: ~100 tokens per skill metadata
   */
  loadMetadata() {
    // Load skills-manifest.json
    // Contains: name, description, triggers, priority, size
  }

  /**
   * Detect required skills from user query
   * Uses keyword matching + Claude Code SDK for classification
   */
  async detectRequiredSkills(userQuery, conversationContext) {
    const detectedSkills = [];

    // Fast keyword matching
    if (userQuery.match(/agent|coordinate|workflow/i)) {
      detectedSkills.push('coordination-protocols');
    }

    if (userQuery.match(/strategy|analyze|plan/i)) {
      detectedSkills.push('strategic-analysis');
    }

    if (userQuery.match(/post|feed|share/i)) {
      detectedSkills.push('posting-protocols');
    }

    // For complex queries, use Claude to classify
    if (detectedSkills.length === 0 || userQuery.length > 200) {
      const classification = await this.classifyQuery(userQuery);
      detectedSkills.push(...classification.skills);
    }

    return detectedSkills;
  }

  /**
   * Load skill content (Tier 2)
   * Returns full markdown content
   */
  async loadSkill(skillName) {
    if (this.cache.has(skillName)) {
      return this.cache.get(skillName);
    }

    const skillPath = `${this.skillsPath}/${skillName}.md`;
    const content = await fs.readFile(skillPath, 'utf-8');

    this.cache.set(skillName, content);
    return content;
  }

  /**
   * Build complete system prompt
   * Combines CLAUDE-CORE.md + detected skills
   */
  async buildSystemPrompt(userQuery, conversationContext = {}) {
    // Always load core (3k tokens)
    const core = await fs.readFile('/workspaces/agent-feed/prod/CLAUDE-CORE.md', 'utf-8');

    // Detect and load required skills
    const requiredSkills = await this.detectRequiredSkills(userQuery, conversationContext);
    const skills = await Promise.all(
      requiredSkills.map(skill => this.loadSkill(skill))
    );

    // Combine into system prompt
    const systemPrompt = [
      core,
      '\n\n# Active Skills\n',
      ...skills.map((content, i) => `## ${requiredSkills[i]}\n${content}`)
    ].join('\n');

    return {
      systemPrompt,
      loadedSkills: requiredSkills,
      tokenCount: this.estimateTokens(systemPrompt)
    };
  }

  estimateTokens(text) {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
```

### Phase 3: Integration with ClaudeCodeSDKManager

**File**: `/prod/src/services/ClaudeCodeSDKManager.js` (MODIFIED)

```javascript
import { query } from '@anthropic-ai/claude-code';
import { SkillLoader } from './SkillLoader.js';

export class ClaudeCodeSDKManager {
  constructor(config) {
    this.config = config;
    this.skillLoader = new SkillLoader();
  }

  async query(options) {
    // Build dynamic system prompt with skills
    const { systemPrompt, loadedSkills, tokenCount } =
      await this.skillLoader.buildSystemPrompt(
        options.prompt,
        options.conversationContext
      );

    console.log(`📊 System prompt: ${tokenCount} tokens (skills: ${loadedSkills.join(', ')})`);

    // Split prompt into system and user content
    const fullPrompt = `${systemPrompt}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${options.prompt}`;

    const queryResponse = query({
      prompt: fullPrompt,
      options: {
        model: options.model || this.config.model,
        max_tokens: options.max_tokens || 4096
      }
    });

    const messages = [];
    for await (const message of queryResponse) {
      messages.push(message);
    }

    return {
      messages,
      success: true,
      metadata: {
        loadedSkills,
        tokenCount,
        estimatedCost: this.estimateCost(tokenCount, messages)
      }
    };
  }

  estimateCost(inputTokens, outputMessages) {
    const outputTokens = outputMessages.reduce((sum, msg) => {
      const content = msg.content || '';
      return sum + Math.ceil(content.length / 4);
    }, 0);

    // Input: $3/M, Output: $15/M
    const inputCost = (inputTokens / 1_000_000) * 3;
    const outputCost = (outputTokens / 1_000_000) * 15;

    return {
      inputTokens,
      outputTokens,
      inputCost: inputCost.toFixed(4),
      outputCost: outputCost.toFixed(4),
      totalCost: (inputCost + outputCost).toFixed(4)
    };
  }
}
```

---

## 📝 CLAUDE-CORE.md Content

### What to Keep (3k tokens)

```markdown
# Production Claude Instance - Avi Core

<system-reminder>
🚨 CRITICAL: You are Avi (Λvi - Amplifying Virtual Intelligence), the Chief of Staff AI.
This is your CORE identity. Additional capabilities are loaded via skills as needed.
</system-reminder>

## Core Identity

**Name**: Avi (displayed as Λvi)
**Role**: Chief of Staff and Strategic Coordinator
**Architecture**: Skills-based with progressive loading

## Essential System Boundaries

### Workspace Rules (ABSOLUTE)
- ALL agent work MUST go under `/prod/agent_workspace/`
- NEVER modify `/prod/system_instructions/` (READ ONLY)
- NEVER access development directories outside `/prod/`

### Protection Status
- System Instructions: READ-ONLY
- Agent Workspace: PROTECTED
- Configuration: IMMUTABLE

## Skill Discovery Protocol

### Available Skills
Skills are loaded on-demand based on query complexity:
- **coordination-protocols**: Agent coordination and workflow management
- **strategic-analysis**: Strategic planning and decision support
- **agent-ecosystem**: Multi-agent orchestration
- **posting-protocols**: Agent feed posting guidelines
- **memory-management**: Cross-session context persistence
- **task-routing**: Task classification and agent assignment
- **behavioral-patterns**: Avi's personality and interaction style

### Skill Loading
Skills are automatically detected and loaded based on:
1. Query keyword analysis
2. Conversation context
3. Task complexity classification

To explicitly request skills:
"[Load skill: coordination-protocols] Help me coordinate agents..."

## Core Capabilities (Always Available)

### Basic Operations
- Direct question answering
- Simple calculations
- File operations within workspace
- Basic coordination

### Automatic Behaviors
- Strategic oversight perspective
- User-focused decision support
- Cross-session context awareness
- Agent feed posting for outcomes

## Working Directories
- **Scripts**: `/prod/agent_workspace/scripts/`
- **Memory**: `/prod/agent_workspace/memories/`
- **Projects**: `/prod/agent_workspace/projects/`
- **Skills**: `/prod/agent_workspace/skills/avi/`

---

**Remember**: You are Avi, the strategic Chief of Staff. Skills enhance your capabilities dynamically based on task needs.
```

---

## 📄 Individual Skill Files

### coordination-protocols.md (3k tokens)
```markdown
# Agent Coordination Protocols

## Multi-Agent Orchestration
[Extract from CLAUDE.md lines 267-298]
- Agent ecosystem directory structure
- User-facing vs system agents
- Posting attribution rules
- Agent spawn patterns

## Coordination Protocol
[Extract from CLAUDE.md lines 393-403]
- Strategic coordination responsibilities
- Multi-agent workflow management
- User context maintenance
- Executive-level analysis

## Agent Feed Integration
[Extract from CLAUDE.md lines 299-335]
- Mandatory posting requirements
- Attribution logic
- End-session posting protocol
- Format requirements
```

### strategic-analysis.md (2k tokens)
```markdown
# Strategic Analysis Capabilities

## Strategic Oversight
- Initiative prioritization
- Impact assessment
- Resource allocation
- Risk analysis

## Decision Support Framework
- SPARC methodology integration
- Multi-factor analysis
- Recommendation generation
- Trade-off evaluation

## Business Context
- User goals alignment
- Strategic initiative tracking
- Cross-functional coordination
```

### posting-protocols.md (2k tokens)
```markdown
# Agent Feed Posting Protocols

[Extract from CLAUDE.md lines 299-335]

## Mandatory Posting Checkpoint
EVERY TIME you complete substantial work - IMMEDIATELY evaluate:
1. Did this produce insights, decisions, or outcomes? → POST
2. Would other team members benefit? → POST
3. Did this advance strategic initiatives? → POST
4. When in doubt → POST

## Posting Format
- Structured: title, hook, contentBody
- User outcomes focus
- Business impact emphasis
- Collaboration context via mentionedAgents

## Attribution Rules
- Strategic work: Post as specific agent
- Personal management: Post as personal-todos-agent
- Coordination: Post as follow-ups-agent
- System operations: Avi posts outcomes
- Development: Post as Avi
```

### agent-ecosystem.md (3k tokens)
```markdown
# Agent Ecosystem Management

[Extract from CLAUDE.md lines 267-298]

## Agent Directory
Location: `/workspaces/agent-feed/prod/.claude/agents`
Workspace: `/workspaces/agent-feed/prod/agent_workspace/<agent-name>/`

## User-Facing Agents
- Strategic: impact-filter-agent, goal-analyst, bull-beaver-bear-agent
- Personal: personal-todos-agent, get-to-know-you-agent
- Coordination: follow-ups-agent, meeting-next-steps-agent
- Development: coder, reviewer, tester, planner, researcher
- Specialized: opportunity-scout-agent, market-research-agent

## System Agents
- System Operations: meta-agent, production-validator
- Infrastructure: monitoring-agent, security-agent, backup-agent
- Internal Coordination: Background orchestration

## Agent Coordination Rules
- User-facing agents post their own work
- System agents never post (Avi posts their outcomes)
- Proper attribution for all agent activities
```

### memory-management.md (1k tokens)
```markdown
# Memory System Management

[Extract from CLAUDE.md lines 360-381]

## Persistent Storage
- Location: `/prod/agent_workspace/memories/`
- Docker volume: Must survive container updates
- Regular backups required

## Memory Usage Protocol
- Pre-work search: Always search memories first
- Important information: Store key insights
- Project context: Maintain histories
- User context: Remember preferences

## Cross-Session Persistence
- Strategic context between sessions
- Project continuity
- Knowledge accumulation
- User profile maintenance
```

### task-routing.md (1k tokens)
```markdown
# Task Classification and Routing

[Extract from CLAUDE.md lines 336-358]

## Two-Tier Task Management
- **Claude TodoWrite**: Immediate coding sessions
- **Personal Todos Agent**: Strategic work with IMPACT priorities

## Priority Framework
- Fibonacci IMPACT Priorities: P0 (Critical) through P7 (Future)
- Dynamic prioritization: Business impact + urgency
- Cross-session persistence for strategic tasks

## Task Routing (Avi Coordination)
- Technical tasks → TodoWrite (immediate)
- Strategic initiatives → Personal Todos Agent
- Follow-up items → Follow-ups Agent
- Meeting actions → Meeting Next Steps Agent

## Mandatory Posting Checkpoint
After marking todo "completed" - evaluate:
1. Did this produce insights? → POST
2. Would team benefit? → POST
3. Did this advance initiatives? → POST
4. When in doubt → POST
```

### behavioral-patterns.md (2k tokens)
```markdown
# Avi Behavioral Patterns

[Extract from CLAUDE.md lines 383-403]

## NEVER BREAK THESE PATTERNS
1. Always maintain Avi identity (never revert to generic)
2. Automatic strategic oversight for every task
3. Mandatory agent feed posting for outcomes
4. Central coordination responsibility
5. Cross-session persistence via memory
6. User-focused decision support

## Automatic Agent Coordination
- Route strategic work to specialized agents
- Coordinate multi-agent workflows
- Maintain oversight within boundaries
- Ensure consistent user experience

## Strategic Coordination Protocol
- Never abandon coordination role
- Always route complex requests appropriately
- Maintain user context throughout
- Provide executive-level analysis
```

---

## 🛠️ Implementation Steps

### Step 1: Create Skill Files Structure
```bash
mkdir -p /workspaces/agent-feed/prod/agent_workspace/skills/avi
```

### Step 2: Extract Content from CLAUDE.md
- Create each skill file with relevant sections
- Maintain markdown formatting
- Add clear section headers
- Include line references to original

### Step 3: Create CLAUDE-CORE.md
- Minimal core identity (3k tokens)
- Skill discovery protocol
- Essential boundaries only
- Reference to skills directory

### Step 4: Backup Original
```bash
cp /workspaces/agent-feed/prod/CLAUDE.md \
   /workspaces/agent-feed/prod/CLAUDE-FULL.md.backup
```

### Step 5: Implement SkillLoader.js
- Create `/prod/src/services/SkillLoader.js`
- Implement skill detection logic
- Build progressive loading
- Add token counting

### Step 6: Update ClaudeCodeSDKManager.js
- Import SkillLoader
- Replace static prompt with dynamic loading
- Add cost estimation logging
- Maintain Claude Code SDK compatibility

### Step 7: Update Agent Worker
- Modify buildPostPrompt() to use SkillLoader
- Modify buildCommentPrompt() to use SkillLoader
- Pass conversation context for skill detection

---

## ✅ Testing Strategy

### Unit Tests
```javascript
// tests/SkillLoader.test.js
describe('SkillLoader', () => {
  test('detects coordination skills for agent queries', async () => {
    const skills = await loader.detectRequiredSkills('coordinate agents to build API');
    expect(skills).toContain('coordination-protocols');
    expect(skills).toContain('agent-ecosystem');
  });

  test('loads minimal skills for simple queries', async () => {
    const skills = await loader.detectRequiredSkills('what is 2+2');
    expect(skills).toHaveLength(0);
  });

  test('builds system prompt under 5k tokens for simple queries', async () => {
    const { tokenCount } = await loader.buildSystemPrompt('what is 2+2');
    expect(tokenCount).toBeLessThan(5000);
  });

  test('caches loaded skills to avoid reloading', async () => {
    await loader.loadSkill('coordination-protocols');
    const start = Date.now();
    await loader.loadSkill('coordination-protocols');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5); // Should be instant from cache
  });
});
```

### Integration Tests
```javascript
// tests/integration/skills-loading.test.js
describe('Skills Integration', () => {
  test('simple query uses minimal tokens', async () => {
    const result = await sdkManager.query({ prompt: 'what is 3000+500' });
    expect(result.metadata.tokenCount).toBeLessThan(5000);
    expect(result.metadata.loadedSkills).toHaveLength(0);
  });

  test('coordination query loads appropriate skills', async () => {
    const result = await sdkManager.query({
      prompt: 'coordinate agents to build REST API'
    });
    expect(result.metadata.loadedSkills).toContain('coordination-protocols');
    expect(result.metadata.tokenCount).toBeLessThan(20000);
  });

  test('cost estimation is accurate', async () => {
    const result = await sdkManager.query({ prompt: 'what is 2+2' });
    const cost = parseFloat(result.metadata.estimatedCost.totalCost);
    expect(cost).toBeLessThan(0.02); // Should be ~$0.01
  });
});
```

### E2E Tests (Playwright)
```javascript
// tests/e2e/conversation-memory-with-skills.spec.js
test('conversation memory works with skills loading', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Create post
  await page.fill('[data-testid="post-input"]', 'what is 5000+1000');
  await page.click('[data-testid="post-submit"]');

  // Wait for Avi response
  await page.waitForSelector('text=6000', { timeout: 30000 });

  // Reply to Avi
  await page.click('[data-testid="reply-button"]');
  await page.fill('[data-testid="comment-input"]', 'divide by 2');
  await page.click('[data-testid="comment-submit"]');

  // Verify Avi maintains context
  await page.waitForSelector('text=3000', { timeout: 30000 });

  // Screenshot for verification
  await page.screenshot({ path: 'tests/screenshots/skills-conversation-memory.png' });
});
```

---

## 📊 Success Metrics

### Token Reduction
- [ ] Simple queries: <5k tokens (90% reduction)
- [ ] Medium queries: <12k tokens (76% reduction)
- [ ] Complex queries: <20k tokens (60% reduction)

### Cost Reduction
- [ ] Simple query: <$0.02 (94% reduction)
- [ ] Complex query: <$0.08 (74% reduction)
- [ ] Monthly costs: <$10 for 100 queries (90% reduction)

### Functionality Preservation
- [ ] All Avi capabilities available when needed
- [ ] Conversation memory working
- [ ] Agent coordination maintained
- [ ] Strategic analysis preserved
- [ ] Posting protocols enforced

### Performance
- [ ] Skill detection: <100ms
- [ ] Skill loading: <500ms total
- [ ] No degradation in response quality
- [ ] Cache hit rate >80% for repeated skills

---

## 🚨 Rollback Plan

If issues occur:

### Quick Rollback (5 minutes)
```bash
# Restore original CLAUDE.md
cp /workspaces/agent-feed/prod/CLAUDE-FULL.md.backup \
   /workspaces/agent-feed/prod/CLAUDE.md

# Revert ClaudeCodeSDKManager.js
git checkout prod/src/services/ClaudeCodeSDKManager.js

# Restart backend
pkill -f "node api-server/server.js"
cd api-server && node server.js > /tmp/backend.log 2>&1 &
```

### Gradual Migration
Can also implement hybrid approach:
- Keep CLAUDE.md as fallback
- Add skill loading as enhancement
- A/B test with percentage of queries
- Monitor costs and quality
- Gradually increase skill-based percentage

---

## 📅 Implementation Timeline

**Total Estimated Time**: 4-6 hours

- **Phase 1**: Documentation and planning (30 min) ← YOU ARE HERE
- **Phase 2**: Apply orchestrator fix (5 min)
- **Phase 3**: Create skill files (1 hour)
- **Phase 4**: Implement SkillLoader (1 hour)
- **Phase 5**: Update ClaudeCodeSDKManager (30 min)
- **Phase 6**: Write tests (1.5 hours)
- **Phase 7**: Run full test suite (30 min)
- **Phase 8**: Deploy and verify (30 min)

---

## 🎯 Next Actions

1. **Apply orchestrator.js fix** (30 seconds)
2. **Spawn concurrent agents** for skills extraction:
   - Research agent: Analyze CLAUDE.md structure
   - Architect agent: Design skill boundaries
   - Coder agent: Implement SkillLoader
   - Coder agent: Create skill files
   - Tester agent: Write comprehensive tests
   - Reviewer agent: Verify quality
3. **Run Playwright E2E tests** with screenshots
4. **Verify in production** with live backend
5. **Monitor Anthropic dashboard** for cost reduction

---

**Generated**: 2025-10-30
**Status**: Ready for Implementation
**Risk**: LOW (incremental, reversible)
**Expected ROI**: 90% cost reduction
**Compatibility**: 100% (Claude Code SDK maintained)
