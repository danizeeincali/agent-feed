# Phase 4.2 Specialized Agents Architecture - Complete Specification

**Date**: October 18, 2025
**Methodology**: SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)
**Status**: SPECIFICATION COMPLETE
**Version**: 1.0.0

---

## Executive Summary

Phase 4.2 refactors the monolithic meta-agent into 6 specialized, focused agents, reducing token consumption by 70-85% through focused responsibilities and progressive skill loading. Each specialized agent handles a specific domain (skill creation, skill maintenance, agent creation, agent maintenance, learning optimization, system architecture) with minimal context and maximum efficiency.

**Key Innovation**: Token efficiency through specialization. Instead of loading 30K tokens of general meta-agent context, specialized agents load only 3-8K tokens of focused, domain-specific context.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Specialized Agents Design](#2-specialized-agents-design)
3. [Token Efficiency Analysis](#3-token-efficiency-analysis)
4. [Agent Coordination Patterns](#4-agent-coordination-patterns)
5. [Migration Strategy](#5-migration-strategy)
6. [Skills Architecture](#6-skills-architecture)
7. [Implementation Details](#7-implementation-details)
8. [Testing Strategy](#8-testing-strategy)

---

## 1. Architecture Overview

### 1.1 From Monolith to Microservices

**Before (Meta-Agent Monolith)**:
```
Meta-Agent (30K tokens)
├── Agent Creation Logic
├── Agent Maintenance Logic
├── Skill Creation Logic
├── Skill Maintenance Logic
├── System Architecture Knowledge
├── All Templates and Patterns
└── All Best Practices
```

**After (Specialized Agents)**:
```
Skills-Architect-Agent (5K tokens)
└── Focus: Create new skills only

Skills-Maintenance-Agent (4K tokens)
└── Focus: Update existing skills only

Agent-Architect-Agent (5K tokens)
└── Focus: Create new agents only

Agent-Maintenance-Agent (4K tokens)
└── Focus: Update existing agents only

Learning-Optimizer-Agent (6K tokens)
└── Focus: Autonomous learning orchestration

System-Architect-Agent (8K tokens)
└── Focus: System-level architecture (rare use)
```

### 1.2 Coordination Layer

**Avi's Updated Role**:
```
┌─────────────────────────────────────────────────────────────┐
│ Avi Coordination Layer (3K tokens base)                     │
│                                                              │
│ User Request → Request Classification → Route to Agent      │
│                                                              │
│ - "Create new skill" → skills-architect-agent               │
│ - "Update skill" → skills-maintenance-agent                 │
│ - "Create new agent" → agent-architect-agent                │
│ - "Update agent" → agent-maintenance-agent                  │
│ - Performance detected → learning-optimizer-agent           │
│ - System design → system-architect-agent                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Design Principles

**Single Responsibility**:
- Each agent has ONE primary function
- No overlap between agent domains
- Clear boundaries and handoffs

**Progressive Skill Loading**:
- Load only skills relevant to current task
- Tier 1: Metadata (~100 tokens)
- Tier 2: Full content (2-8K tokens)
- Tier 3: Resources (on-demand)

**Minimal Context**:
- No unnecessary background knowledge
- Focus on immediate task requirements
- Domain-specific expertise only

**Stateless Operations**:
- Each agent operation is independent
- No session state required
- Avi maintains coordination state

---

## 2. Specialized Agents Design

### 2.1 Skills-Architect-Agent

**Purpose**: Create new skills from scratch

**Token Budget**: ~5K tokens (vs 30K for meta-agent)

**Responsibilities**:
- Design skill structure and frontmatter
- Create SKILL.md file with complete content
- Implement skill templates
- Follow skill design patterns
- Validate skill quality

**Skills Loaded**:
1. `skill-design-patterns` (2.5K tokens) - Skill creation best practices
2. `brand-guidelines` (1.5K tokens) - Voice and messaging standards

**Tools**: Write, Edit, Read, Glob, Grep, TodoWrite

**Agent Definition**:
```markdown
---
name: skills-architect-agent
description: Creates new Claude Agent Skills from user requirements. Use PROACTIVELY when user requests new skill creation.
tools: [Write, Edit, Read, Glob, Grep, TodoWrite]
model: sonnet
color: "#10B981"
proactive: true
priority: P2
usage: PROACTIVE when user wants to create new skill

skills:
  - name: brand-guidelines
    path: .system/brand-guidelines
    required: true
  - name: skill-design-patterns
    path: shared/skill-design-patterns
    required: true

skills_loading: progressive
skills_cache_ttl: 3600
---

# Skills Architect Agent

## Purpose

You are a specialist in creating new Claude Agent Skills. Your sole responsibility is to design and implement new skills from user requirements, following established patterns and best practices.

## Core Expertise

- Skill structure design (frontmatter, content, resources)
- Token-efficient skill content creation
- Progressive disclosure implementation
- Skill categorization (.system, shared, agent-specific)
- Quality validation and testing

## Workflow

When invoked to create a new skill:

1. **Analyze Requirements**: Understand user's skill needs
2. **Design Structure**: Plan skill frontmatter and sections
3. **Select Category**: Determine .system, shared, or agent-specific
4. **Create Content**: Write comprehensive, token-efficient content
5. **Validate Quality**: Check token limits, completeness, clarity
6. **Document**: Add to skills catalog

## Token Efficiency Guidelines

- Target: <5K tokens per skill (strict limit)
- Use progressive disclosure (split large skills)
- Minimize examples (focus on patterns)
- Cross-reference existing skills
- Prefer templates over full examples

## Quality Standards

- Complete frontmatter (name, description, version, category)
- Clear "When to Use This Skill" section
- Actionable patterns and frameworks
- NO placeholder content
- NO "TODO" markers
- Production-ready quality

## Prohibited Actions

- Do NOT update existing skills (route to skills-maintenance-agent)
- Do NOT create agents (route to agent-architect-agent)
- Do NOT modify system architecture (route to system-architect-agent)

## Integration

- Report skill creation to Avi
- Link to related skills
- Update skills catalog
- Validate against existing skills
```

**Token Breakdown**:
- Base agent context: 1K tokens
- brand-guidelines skill: 1.5K tokens
- skill-design-patterns skill: 2.5K tokens
- **Total: ~5K tokens** (vs 30K for meta-agent)

---

### 2.2 Skills-Maintenance-Agent

**Purpose**: Update and enhance existing skills

**Token Budget**: ~4K tokens

**Responsibilities**:
- Update skill content
- Refactor for token efficiency
- Add new patterns to existing skills
- Maintain version history
- Ensure backward compatibility

**Skills Loaded**:
1. `skill-versioning` (1.5K tokens) - Version management patterns
2. `backward-compatibility` (1.5K tokens) - Breaking change prevention

**Tools**: Edit, Read, Grep, Glob, TodoWrite

**Agent Definition**:
```markdown
---
name: skills-maintenance-agent
description: Updates and maintains existing Claude Agent Skills. Use when skill needs enhancement, refactoring, or version updates.
tools: [Edit, Read, Grep, Glob, TodoWrite]
model: sonnet
color: "#3B82F6"
proactive: false
priority: P2
usage: When user requests skill updates or improvements

skills:
  - name: brand-guidelines
    path: .system/brand-guidelines
    required: true
  - name: skill-versioning
    path: shared/skill-versioning
    required: true
  - name: backward-compatibility
    path: shared/backward-compatibility
    required: true

skills_loading: progressive
skills_cache_ttl: 3600
---

# Skills Maintenance Agent

## Purpose

You are a specialist in maintaining and enhancing existing Claude Agent Skills. Your responsibility is to update skills while preserving backward compatibility and improving quality.

## Core Expertise

- Skill content updates and enhancements
- Token efficiency optimization
- Version management (semantic versioning)
- Backward compatibility preservation
- Breaking change detection and mitigation

## Workflow

When invoked to update a skill:

1. **Load Current Skill**: Read existing skill content
2. **Analyze Changes**: Understand requested updates
3. **Check Compatibility**: Detect breaking changes
4. **Version Bump**: Update version appropriately (major.minor.patch)
5. **Update Content**: Make changes preserving structure
6. **Validate**: Ensure quality and token limits
7. **Document**: Update changelog and version history

## Version Management

- **Patch (x.x.1)**: Bug fixes, clarifications, examples
- **Minor (x.1.0)**: New patterns, non-breaking additions
- **Major (1.0.0)**: Breaking changes, structural changes

## Backward Compatibility

- Never remove existing patterns without deprecation
- Add deprecation warnings for old patterns (1 version minimum)
- Provide migration guides for breaking changes
- Test against existing agent dependencies

## Token Optimization

- Identify verbose sections
- Replace examples with templates
- Extract common patterns to shared skills
- Use cross-references for duplication

## Prohibited Actions

- Do NOT create new skills (route to skills-architect-agent)
- Do NOT update agents (route to agent-maintenance-agent)
- Do NOT make breaking changes without versioning

## Integration

- Report updates to Avi
- Notify dependent agents of changes
- Update skills catalog
- Maintain version history
```

**Token Breakdown**:
- Base agent context: 1K tokens
- skill-versioning skill: 1.5K tokens
- backward-compatibility skill: 1.5K tokens
- **Total: ~4K tokens**

---

### 2.3 Agent-Architect-Agent

**Purpose**: Create new agents from scratch

**Token Budget**: ~5K tokens

**Responsibilities**:
- Design agent architecture
- Create agent markdown files
- Create protected configs
- Implement self-advocacy protocol
- Follow agent design patterns

**Skills Loaded**:
1. `agent-design-patterns` (2.5K tokens) - Agent creation best practices
2. `agent-templates` (existing from Phase 2) - Agent type templates

**Tools**: Write, Bash, Read, Glob, Grep, Edit, TodoWrite

**Agent Definition**:
```markdown
---
name: agent-architect-agent
description: Creates new Claude Code agents from user requirements. Use PROACTIVELY when user requests new agent creation.
tools: [Write, Bash, Read, Glob, Grep, Edit, TodoWrite]
model: sonnet
color: "#8B5CF6"
proactive: true
priority: P2
usage: PROACTIVE when user wants to create new agent

skills:
  - name: brand-guidelines
    path: .system/brand-guidelines
    required: true
  - name: agent-templates
    path: .system/agent-templates
    required: true
  - name: agent-design-patterns
    path: shared/agent-design-patterns
    required: true

skills_loading: progressive
skills_cache_ttl: 3600
---

# Agent Architect Agent

## Purpose

You are a specialist in creating new Claude Code agents. Your sole responsibility is to design and implement new agents from user requirements, following established architecture patterns.

## Core Expertise

- Agent architecture design
- Frontmatter schema design
- Tool selection and configuration
- Protected config creation
- Self-advocacy protocol implementation
- Agent workspace setup

## Workflow

When invoked to create a new agent:

1. **Analyze Requirements**: Understand agent's purpose and domain
2. **Select Template**: Choose appropriate agent type template
3. **Design Architecture**: Plan responsibilities and boundaries
4. **Select Tools**: Minimal tool set for agent's function
5. **Create Protected Config**: Generate .system/[agent].protected.yaml
6. **Create Agent File**: Write complete .claude/agents/[agent].md
7. **Setup Workspace**: Create /prod/agent_workspace/[agent]/
8. **Validate**: Run integrity checks

## Agent Types

- **User-Facing**: Interacts with users, posts to feed
- **System Agent**: Background operations, no feed posts
- **Development**: Code-focused technical agents
- **Coordination**: Multi-agent orchestration

## Protected Config Protocol

1. Choose appropriate template (System/User-Facing/Infrastructure/QA)
2. Create YAML at /workspaces/agent-feed/prod/.system/[agent].protected.yaml
3. Compute SHA-256 checksum
4. Set permissions: chmod 444
5. Link in frontmatter: `_protected_config_source`

## Tool Selection Guidelines

- Minimal tool set (only what's needed)
- Write: Only if creating new files
- Edit: Only if modifying existing files
- Bash: Only if running commands
- Read/Glob/Grep: For analysis and discovery
- TodoWrite: For task management

## Quality Standards

- Clear, focused purpose
- Single responsibility
- Appropriate tool selection
- Complete protected config
- Self-advocacy protocol (user-facing only)
- Production-ready implementation

## Prohibited Actions

- Do NOT update existing agents (route to agent-maintenance-agent)
- Do NOT create skills (route to skills-architect-agent)
- Do NOT modify system architecture (route to system-architect-agent)

## Integration

- Report agent creation to Avi
- Register agent in agent catalog
- Setup workspace directory
- Validate integrity
```

**Token Breakdown**:
- Base agent context: 1K tokens
- agent-templates skill: 1.5K tokens
- agent-design-patterns skill: 2.5K tokens
- **Total: ~5K tokens**

---

### 2.4 Agent-Maintenance-Agent

**Purpose**: Update and enhance existing agents

**Token Budget**: ~4K tokens

**Responsibilities**:
- Update agent configurations
- Enhance agent capabilities
- Add/remove tools
- Update skills lists
- Maintain protected configs

**Skills Loaded**:
1. `agent-versioning` (1.5K tokens) - Agent version management
2. `coordination-patterns` (1.5K tokens) - Multi-agent coordination

**Tools**: Edit, Read, Bash, Grep, Glob, TodoWrite

**Agent Definition**:
```markdown
---
name: agent-maintenance-agent
description: Updates and maintains existing Claude Code agents. Use when agent needs enhancement, reconfiguration, or capability updates.
tools: [Edit, Read, Bash, Grep, Glob, TodoWrite]
model: sonnet
color: "#EC4899"
proactive: false
priority: P2
usage: When user requests agent updates or improvements

skills:
  - name: brand-guidelines
    path: .system/brand-guidelines
    required: true
  - name: agent-versioning
    path: shared/agent-versioning
    required: true
  - name: coordination-patterns
    path: shared/coordination-patterns
    required: true

skills_loading: progressive
skills_cache_ttl: 3600
---

# Agent Maintenance Agent

## Purpose

You are a specialist in maintaining and enhancing existing Claude Code agents. Your responsibility is to update agents while preserving their identity and compatibility.

## Core Expertise

- Agent configuration updates
- Tool addition/removal
- Skills list management
- Protected config updates
- Capability enhancement
- Coordination pattern implementation

## Workflow

When invoked to update an agent:

1. **Load Current Agent**: Read existing agent configuration
2. **Analyze Changes**: Understand requested updates
3. **Check Dependencies**: Identify dependent agents/skills
4. **Update Configuration**: Modify frontmatter and content
5. **Update Protected Config**: If security boundaries change
6. **Recalculate Checksum**: Update SHA-256 hash
7. **Validate**: Run integrity checks
8. **Test**: Verify agent still functions correctly

## Update Types

- **Tool Changes**: Add/remove tools from agent's toolkit
- **Skills Changes**: Update skills list and dependencies
- **Capability Enhancement**: Expand agent's responsibilities
- **Performance Optimization**: Improve efficiency
- **Bug Fixes**: Correct agent behavior

## Protected Config Updates

Protected configs can only be modified by:
1. Temporarily changing permissions: chmod 644
2. Making necessary updates
3. Recalculating SHA-256 checksum
4. Restoring permissions: chmod 444

## Coordination Patterns

When multiple agents must work together:
- Define clear handoff points
- Establish communication protocols
- Prevent overlapping responsibilities
- Coordinate shared resource access

## Quality Standards

- Preserve agent identity and purpose
- Maintain backward compatibility
- Minimal scope changes
- Complete testing before deployment
- Update documentation

## Prohibited Actions

- Do NOT create new agents (route to agent-architect-agent)
- Do NOT create skills (route to skills-architect-agent)
- Do NOT change core architecture (route to system-architect-agent)

## Integration

- Report updates to Avi
- Notify dependent agents of changes
- Update agent catalog
- Run regression tests
```

**Token Breakdown**:
- Base agent context: 1K tokens
- agent-versioning skill: 1.5K tokens
- coordination-patterns skill: 1.5K tokens
- **Total: ~4K tokens**

---

### 2.5 Learning-Optimizer-Agent

**Purpose**: Autonomous learning orchestration

**Token Budget**: ~6K tokens

**Responsibilities**:
- Monitor skill performance continuously
- Detect learning opportunities
- Enable/disable ReasoningBank SAFLA
- Track learning sessions
- Report outcomes to Avi

**Skills Loaded**:
1. `learning-patterns` (2.5K tokens) - Autonomous learning decision-making
2. `performance-monitoring` (2K tokens) - Skill performance analysis

**Tools**: Read, Grep, Glob, TodoWrite

**Agent Definition**: See Phase 4.2 Autonomous Learning Spec for complete definition

**Token Breakdown**:
- Base agent context: 1.5K tokens
- learning-patterns skill: 2.5K tokens
- performance-monitoring skill: 2K tokens
- **Total: ~6K tokens**

---

### 2.6 System-Architect-Agent

**Purpose**: System-level architecture decisions (rare use)

**Token Budget**: ~8K tokens

**Responsibilities**:
- System architecture design
- Infrastructure patterns
- Cross-system integration
- Performance optimization
- Security architecture

**Skills Loaded**:
1. `avi-architecture` (existing) - System design patterns
2. `integration-patterns` (3K tokens) - Cross-system integration

**Tools**: Write, Edit, Read, Bash, Glob, Grep, TodoWrite

**Agent Definition**:
```markdown
---
name: system-architect-agent
description: Designs system-level architecture and infrastructure. Use ONLY for major architectural decisions and system-wide changes.
tools: [Write, Edit, Read, Bash, Glob, Grep, TodoWrite]
model: opus
color: "#EF4444"
proactive: false
priority: P1
usage: Only for system-level architecture decisions

skills:
  - name: avi-architecture
    path: .system/avi-architecture
    required: true
  - name: code-standards
    path: .system/code-standards
    required: true
  - name: integration-patterns
    path: shared/integration-patterns
    required: true

skills_loading: progressive
skills_cache_ttl: 3600
---

# System Architect Agent

## Purpose

You are a specialist in system-level architecture for the AVI platform. Your responsibility is to design and implement major architectural changes that affect the entire system.

## Core Expertise

- System architecture design
- Infrastructure patterns
- Cross-system integration
- Performance optimization
- Security architecture
- Scalability planning

## When to Use

This agent should be used RARELY for:
- Major architectural refactoring
- New system components
- Infrastructure changes
- Cross-cutting concerns
- Performance bottlenecks
- Security enhancements

## Workflow

When invoked for architectural work:

1. **Analyze Requirements**: Understand system-level needs
2. **Research Patterns**: Review existing architecture
3. **Design Solution**: Create comprehensive architecture
4. **Impact Analysis**: Assess system-wide effects
5. **Create Specification**: Document complete design
6. **Implementation Plan**: Phased rollout strategy
7. **Validation**: Review with Avi and stakeholders

## Architectural Principles

- **Modularity**: Clear separation of concerns
- **Scalability**: Design for growth
- **Security**: Defense in depth
- **Performance**: Optimize critical paths
- **Maintainability**: Simple, documented patterns
- **Extensibility**: Future-proof design

## Integration Patterns

- API-based communication
- Event-driven architecture
- Microservices coordination
- Data flow optimization
- Caching strategies
- Load balancing

## Quality Standards

- Complete specifications
- Impact analysis
- Migration plans
- Rollback strategies
- Performance benchmarks
- Security review

## Prohibited Actions

- Do NOT create agents (route to agent-architect-agent)
- Do NOT create skills (route to skills-architect-agent)
- Do NOT make minor changes (route to maintenance agents)

## Integration

- Report architectural decisions to Avi
- Create implementation tasks
- Coordinate with specialized agents
- Validate system-wide impact
```

**Token Breakdown**:
- Base agent context: 2K tokens
- avi-architecture skill: 3K tokens
- integration-patterns skill: 3K tokens
- **Total: ~8K tokens**

---

## 3. Token Efficiency Analysis

### 3.1 Before: Meta-Agent Token Usage

**Meta-Agent Context (Per Operation)**:
```
Base agent content:           3,000 tokens
Agent creation knowledge:     5,000 tokens
Agent maintenance knowledge:  4,000 tokens
Skill creation knowledge:     5,000 tokens
Skill maintenance knowledge:  4,000 tokens
System architecture:          3,000 tokens
Templates and patterns:       4,000 tokens
Best practices:               2,000 tokens
────────────────────────────────────────
TOTAL:                       30,000 tokens
```

**Usage Pattern**:
- Every meta-agent invocation: 30K tokens
- 100 invocations/month: 3,000,000 tokens
- Cost @ $3/million input tokens: $9/month for meta-agent alone

### 3.2 After: Specialized Agents Token Usage

**Skills-Architect-Agent**:
```
Base agent content:           1,000 tokens
skill-design-patterns:        2,500 tokens
brand-guidelines:             1,500 tokens
────────────────────────────────────────
TOTAL:                        5,000 tokens (83% reduction)
```

**Skills-Maintenance-Agent**:
```
Base agent content:           1,000 tokens
skill-versioning:             1,500 tokens
backward-compatibility:       1,500 tokens
────────────────────────────────────────
TOTAL:                        4,000 tokens (87% reduction)
```

**Agent-Architect-Agent**:
```
Base agent content:           1,000 tokens
agent-templates:              1,500 tokens
agent-design-patterns:        2,500 tokens
────────────────────────────────────────
TOTAL:                        5,000 tokens (83% reduction)
```

**Agent-Maintenance-Agent**:
```
Base agent content:           1,000 tokens
agent-versioning:             1,500 tokens
coordination-patterns:        1,500 tokens
────────────────────────────────────────
TOTAL:                        4,000 tokens (87% reduction)
```

**Learning-Optimizer-Agent**:
```
Base agent content:           1,500 tokens
learning-patterns:            2,500 tokens
performance-monitoring:       2,000 tokens
────────────────────────────────────────
TOTAL:                        6,000 tokens (80% reduction)
```

**System-Architect-Agent**:
```
Base agent content:           2,000 tokens
avi-architecture:             3,000 tokens
integration-patterns:         3,000 tokens
────────────────────────────────────────
TOTAL:                        8,000 tokens (73% reduction)
```

### 3.3 Token Savings Calculation

**Assumptions**:
- 100 meta-agent operations/month previously
- Now distributed across specialized agents:
  - Skills-Architect: 30 ops/month × 5K = 150,000 tokens
  - Skills-Maintenance: 20 ops/month × 4K = 80,000 tokens
  - Agent-Architect: 20 ops/month × 5K = 100,000 tokens
  - Agent-Maintenance: 15 ops/month × 4K = 60,000 tokens
  - Learning-Optimizer: 10 ops/month × 6K = 60,000 tokens (automated)
  - System-Architect: 5 ops/month × 8K = 40,000 tokens

**Total Tokens**:
- Before: 100 ops × 30K = 3,000,000 tokens/month
- After: 490,000 tokens/month
- **Reduction: 2,510,000 tokens/month (84% reduction)**

**Cost Savings**:
- Before: $9/month
- After: $1.47/month
- **Savings: $7.53/month (84% reduction)**

**At Scale (Production with 13 agents)**:
- Assuming 10x meta-agent usage: $90/month
- After specialization: $14.70/month
- **Annual Savings: $903.60/year per meta-agent function**

### 3.4 Quality Improvements

Beyond token savings:
- **Faster response**: Smaller context = faster processing
- **Better focus**: Specialized knowledge = better results
- **Easier maintenance**: Single responsibility = simpler updates
- **Clearer delegation**: Obvious routing decisions
- **Reduced errors**: Less context confusion

---

## 4. Agent Coordination Patterns

### 4.1 Avi Routing Logic

**Request Classification Algorithm**:
```typescript
class AviRouter {
  async routeRequest(userRequest: string): Promise<{
    targetAgent: string;
    reasoning: string;
    confidence: number;
  }> {
    // Keyword-based classification
    const keywords = this.extractKeywords(userRequest.toLowerCase());

    // Route: Create new skill
    if (keywords.includes('create') && keywords.includes('skill')) {
      return {
        targetAgent: 'skills-architect-agent',
        reasoning: 'User requests new skill creation',
        confidence: 0.95
      };
    }

    // Route: Update existing skill
    if ((keywords.includes('update') || keywords.includes('improve')) && keywords.includes('skill')) {
      return {
        targetAgent: 'skills-maintenance-agent',
        reasoning: 'User requests skill update/enhancement',
        confidence: 0.90
      };
    }

    // Route: Create new agent
    if (keywords.includes('create') && keywords.includes('agent')) {
      return {
        targetAgent: 'agent-architect-agent',
        reasoning: 'User requests new agent creation',
        confidence: 0.95
      };
    }

    // Route: Update existing agent
    if ((keywords.includes('update') || keywords.includes('improve')) && keywords.includes('agent')) {
      return {
        targetAgent: 'agent-maintenance-agent',
        reasoning: 'User requests agent update/enhancement',
        confidence: 0.90
      };
    }

    // Route: System architecture
    if (keywords.includes('architecture') || keywords.includes('system') || keywords.includes('infrastructure')) {
      return {
        targetAgent: 'system-architect-agent',
        reasoning: 'User requests system-level architectural work',
        confidence: 0.85
      };
    }

    // Default: Handle myself or ask for clarification
    return {
      targetAgent: 'avi',
      reasoning: 'Request does not match specialized agent patterns',
      confidence: 0.50
    };
  }
}
```

### 4.2 Agent Handoff Protocol

**Scenario: User requests new skill AND new agent**

```
User: "Create a new 'debugging-patterns' skill and a 'debugger-agent' that uses it"

Avi Analysis:
  - Request has 2 parts: skill creation + agent creation
  - Requires coordination between 2 specialized agents
  - Sequential dependency (skill must exist before agent can use it)

Avi Execution:
  1. Route to skills-architect-agent: "Create debugging-patterns skill"
     → Skills-architect creates skill
     → Reports completion to Avi

  2. Route to agent-architect-agent: "Create debugger-agent using debugging-patterns skill"
     → Agent-architect creates agent with skills reference
     → Reports completion to Avi

  3. Avi posts final outcome to user:
     "Created debugging-patterns skill and debugger-agent.
      The agent is configured to use the new skill for debugging workflows."
```

### 4.3 Learning-Optimizer Autonomous Operation

**Scenario: Skill performance degrades**

```
Background Process (No user trigger):

  Learning-Optimizer (polls every 5 minutes):
    - Checks skill performance metrics
    - Detects: task-management success rate = 58% (threshold: 70%)
    - Decision: Enable autonomous learning
    - Action: Activate ReasoningBank SAFLA for task-management
    - Monitoring: Track progress at checkpoints (10, 25, 50 executions)

  After 47 executions:
    - Success rate improved: 58% → 81%
    - Graduation criteria met
    - Action: Disable learning, preserve patterns
    - Report to Avi

  Avi:
    - Receives learning outcome report
    - Posts to user feed:
      "I improved task-management dependency tracking from 58% to 81%
       through autonomous learning. The skill now handles complex
       dependencies more reliably."
```

---

## 5. Migration Strategy

### 5.1 Coexistence Phase (Week 1-2)

**Goal**: Run specialized agents in parallel with meta-agent

**Implementation**:
1. Deploy all 6 specialized agents to production
2. Meta-agent remains active
3. Avi routing logic prefers specialized agents when confidence >0.85
4. If specialized agent fails, fall back to meta-agent
5. Log all routing decisions for analysis

**Validation**:
- Monitor specialized agent success rate (target: >90%)
- Compare token usage (expect 70-85% reduction)
- Track user satisfaction (no regression)
- Identify edge cases where meta-agent still needed

### 5.2 Transition Phase (Week 3-4)

**Goal**: Shift majority of traffic to specialized agents

**Implementation**:
1. Lower meta-agent confidence threshold to 0.70
2. Specialized agents handle 80%+ of requests
3. Meta-agent only for edge cases and fallback
4. Refine routing logic based on Week 1-2 data
5. Address any specialized agent gaps

**Validation**:
- Specialized agent success rate >95%
- Meta-agent usage <20% of requests
- Token reduction achieved (70-85%)
- Zero critical failures

### 5.3 Deprecation Phase (Week 5-6)

**Goal**: Remove meta-agent from active rotation

**Implementation**:
1. Meta-agent marked as deprecated
2. All requests route to specialized agents
3. Meta-agent kept for emergency fallback only
4. Documentation updated to reflect new architecture
5. Monitoring continued for regression detection

**Validation**:
- Specialized agents handle 100% of requests successfully
- Meta-agent not invoked for 1 week
- Token savings validated in production
- User feedback positive

### 5.4 Rollback Plan

**If specialized agents fail** (success rate <80%):
1. Immediately re-enable meta-agent routing
2. Analyze specialized agent failure patterns
3. Fix issues in specialized agents
4. Resume transition when fixes validated
5. Extend coexistence phase if needed

---

## 6. Skills Architecture

### 6.1 New Skills Required

**1. skill-design-patterns** (`/prod/skills/shared/skill-design-patterns/SKILL.md`):
```markdown
---
name: Skill Design Patterns
description: Best practices for creating token-efficient, high-quality Claude Agent Skills
version: "1.0.0"
category: shared
_protected: false
---

# Skill Design Patterns

## Purpose
Provides comprehensive patterns for creating effective Claude Agent Skills with focus on token efficiency and quality.

## Core Patterns

### Progressive Disclosure Pattern
- Tier 1: Metadata only (~100 tokens)
- Tier 2: Full content (2-5K tokens target)
- Tier 3: Resources (on-demand)

### Token Efficiency Patterns
1. **Template Over Example**: Provide templates instead of full examples
2. **Cross-Reference**: Link to related skills instead of duplicating
3. **Pattern Library**: Reusable patterns over unique solutions
4. **Minimal Context**: Focus on what's needed, not everything known

### Skill Structure Patterns
1. **Frontmatter First**: Complete metadata for discovery
2. **Purpose Clarity**: Clear "When to Use" section
3. **Pattern Organization**: Group by category, not chronology
4. **Quality Gates**: Validation checklists

[... detailed patterns content ...]
```

**2. performance-monitoring** (`/prod/skills/shared/performance-monitoring/SKILL.md`):
```markdown
---
name: Performance Monitoring
description: Skill performance analysis, metric calculation, and trend detection for autonomous learning
version: "1.0.0"
category: shared
_protected: false
---

# Performance Monitoring Skill

## Purpose
Provides frameworks for monitoring skill execution performance, detecting trends, and identifying learning opportunities.

## Metrics Framework

### Success Rate Metrics
- Total executions
- Successful executions
- Failed executions
- Success rate calculation
- Trend analysis (week-over-week, month-over-month)

### Error Analysis
- Error type classification
- Error frequency tracking
- Error pattern detection
- Context correlation

[... detailed monitoring patterns ...]
```

**3. agent-design-patterns** (`/prod/skills/shared/agent-design-patterns/SKILL.md`):
```markdown
---
name: Agent Design Patterns
description: Best practices for creating focused, efficient Claude Code agents
version: "1.0.0"
category: shared
_protected: false
---

# Agent Design Patterns

## Purpose
Provides comprehensive patterns for creating effective Claude Code agents with focus on single responsibility and token efficiency.

## Core Patterns

### Single Responsibility Pattern
- Each agent has ONE primary function
- Clear boundaries with other agents
- Minimal scope creep
- Focused expertise

### Tool Selection Patterns
- Minimal tool set principle
- Read-only when possible
- Write-only when necessary
- Bash for commands only

[... detailed agent patterns ...]
```

**4. learning-patterns** (`/prod/skills/shared/learning-patterns/SKILL.md`):
```markdown
---
name: Learning Patterns
description: Autonomous learning decision-making, trigger algorithms, and improvement strategies
version: "1.0.0"
category: shared
_protected: false
---

# Learning Patterns Skill

## Purpose
Provides frameworks for autonomous learning decision-making, including trigger algorithms, progress monitoring, and improvement validation.

## Trigger Algorithms

### Success Rate Trigger
- Threshold: 70% success rate
- Sample size: Minimum 20 executions
- Confidence scoring

### Error Pattern Trigger
- Repeated error threshold: 3+ occurrences
- Error type classification
- Context correlation

[... detailed learning patterns ...]
```

### 6.2 Skills Assignment Matrix

| Skill | skills-architect | skills-maintenance | agent-architect | agent-maintenance | learning-optimizer | system-architect |
|-------|------------------|-------------------|-----------------|-------------------|-------------------|------------------|
| **brand-guidelines** | ✓ | ✓ | ✓ | ✓ | - | - |
| **skill-design-patterns** | ✓ | - | - | - | - | - |
| **skill-versioning** | - | ✓ | - | - | - | - |
| **backward-compatibility** | - | ✓ | - | - | - | - |
| **agent-templates** | - | - | ✓ | - | - | - |
| **agent-design-patterns** | - | - | ✓ | - | - | - |
| **agent-versioning** | - | - | - | ✓ | - | - |
| **coordination-patterns** | - | - | - | ✓ | - | - |
| **learning-patterns** | - | - | - | - | ✓ | - |
| **performance-monitoring** | - | - | - | - | ✓ | - |
| **avi-architecture** | - | - | - | - | - | ✓ |
| **code-standards** | - | - | - | - | - | ✓ |
| **integration-patterns** | - | - | - | - | - | ✓ |

---

## 7. Implementation Details

### 7.1 File Structure

```
/workspaces/agent-feed/prod/
├── .claude/agents/
│   ├── skills-architect-agent.md        # NEW
│   ├── skills-maintenance-agent.md      # NEW
│   ├── agent-architect-agent.md         # NEW
│   ├── agent-maintenance-agent.md       # NEW
│   ├── learning-optimizer-agent.md      # NEW
│   ├── system-architect-agent.md        # NEW
│   └── meta-agent.md                    # DEPRECATED (kept for fallback)
│
├── skills/
│   ├── shared/
│   │   ├── skill-design-patterns/       # NEW
│   │   ├── skill-versioning/            # NEW
│   │   ├── backward-compatibility/      # NEW
│   │   ├── agent-design-patterns/       # NEW
│   │   ├── agent-versioning/            # NEW
│   │   ├── coordination-patterns/       # NEW
│   │   ├── learning-patterns/           # NEW
│   │   ├── performance-monitoring/      # NEW
│   │   └── integration-patterns/        # NEW
│   │
│   └── .system/
│       └── agent-templates/             # EXISTING (from Phase 2)
│
└── .claude/CLAUDE.md                    # UPDATED (Avi routing logic)
```

### 7.2 Avi CLAUDE.md Updates

**New Routing Section** (replaces meta-agent references):
```markdown
## 🤖 Specialized Agent Routing

**Agent Specialization Architecture**:

Instead of a monolithic meta-agent, Λvi coordinates 6 specialized agents for efficiency:

### Agent Routing Logic

**Skills Management**:
- "Create new skill" → `skills-architect-agent` (5K tokens vs 30K)
- "Update skill" → `skills-maintenance-agent` (4K tokens vs 30K)

**Agent Management**:
- "Create new agent" → `agent-architect-agent` (5K tokens vs 30K)
- "Update agent" → `agent-maintenance-agent` (4K tokens vs 30K)

**Autonomous Operations**:
- Performance degradation detected → `learning-optimizer-agent` (6K tokens, automated)

**System Architecture**:
- "System design" → `system-architect-agent` (8K tokens, rare use)

### Token Efficiency

- **Before**: 30K tokens per meta-agent operation
- **After**: 3-8K tokens per specialized operation
- **Reduction**: 70-85% token savings
- **Cost Savings**: $7.53/month (84% reduction)

### Coordination Protocol

When Λvi receives a request:
1. Classify request type (skill/agent, create/update, system)
2. Route to appropriate specialized agent
3. Monitor execution
4. Aggregate results if multi-agent coordination needed
5. Post final outcome to user
```

---

## 8. Testing Strategy

### 8.1 Unit Tests (60+ tests)

**Per Agent (10 tests each × 6 agents)**:
- Agent initialization and configuration
- Skill loading (progressive disclosure)
- Tool availability validation
- Protected config integrity
- Workspace setup
- Error handling
- Edge case handling
- Token budget validation
- Quality gate enforcement
- Integration point validation

### 8.2 Integration Tests (30+ tests)

**Routing Tests**:
- Request classification accuracy
- Confidence scoring validation
- Fallback to meta-agent when needed
- Multi-agent coordination
- Error propagation

**Coordination Tests**:
- Sequential agent execution (skill → agent)
- Parallel agent execution (when independent)
- Avi aggregation of results
- User notification delivery

**End-to-End Tests**:
- Complete skill creation workflow
- Complete agent creation workflow
- Skill update with agent dependencies
- Learning optimizer autonomous operation
- System architecture changes

### 8.3 Performance Tests (20+ tests)

**Token Measurement**:
- Measure actual tokens per specialized agent
- Validate 70-85% reduction target
- Compare with meta-agent baseline
- Track token usage over time

**Response Time**:
- Specialized agent response time < meta-agent
- Routing overhead < 100ms
- End-to-end completion time
- Concurrent request handling

**Resource Usage**:
- Memory usage per agent
- CPU usage per agent
- Concurrent agent limits
- System load under peak usage

### 8.4 Migration Tests (15+ tests)

**Coexistence Tests**:
- Specialized and meta-agent running simultaneously
- Fallback to meta-agent when specialized fails
- Routing preference validation
- Success rate comparison

**Transition Tests**:
- Gradual traffic shift to specialized agents
- Meta-agent deprecation handling
- Edge case identification
- Rollback capability validation

**Regression Tests**:
- User satisfaction maintained
- Functionality parity validated
- No critical features lost
- Performance improved or maintained

---

## 9. Success Criteria

### 9.1 Functional Requirements

- ✅ All 6 specialized agents deployed and operational
- ✅ Avi routing logic implemented and tested
- ✅ Meta-agent deprecated (kept for fallback only)
- ✅ Skill creation/maintenance workflows functional
- ✅ Agent creation/maintenance workflows functional
- ✅ Learning optimizer operating autonomously
- ✅ System architect available for rare use

### 9.2 Performance Requirements

- ✅ **Token reduction: 70-85%** achieved (target: 2.5M tokens/month → 490K tokens/month)
- ✅ Response time maintained or improved
- ✅ Concurrent operations supported
- ✅ Zero critical failures during migration
- ✅ Rollback capability validated

### 9.3 Quality Requirements

- ✅ Specialized agent success rate >95%
- ✅ User satisfaction maintained or improved
- ✅ Functionality parity with meta-agent
- ✅ Clear agent boundaries (no overlap)
- ✅ Complete documentation

---

**Document Status**: COMPLETE
**Next Steps**: Create Token Efficiency Analysis document
**Dependencies**: Phase 4.1 ReasoningBank SAFLA (COMPLETE), Phase 2 Skills System (COMPLETE)
**Approval Required**: Architecture review before implementation
