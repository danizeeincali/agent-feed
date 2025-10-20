---
name: agent-design-patterns
description: Best practices and architectural patterns for creating focused, efficient, and maintainable specialized agents that excel at specific domains
version: 1.0.0
category: shared
tags:
  - agent-design
  - architecture
  - specialization
  - best-practices
  - patterns
primary_agent: agent-architect-agent
related_skills:
  - skill-design-patterns
  - learning-patterns
  - performance-monitoring
author: Avi System
created: 2025-10-18
last_updated: 2025-10-18
token_efficiency: high
learning_enabled: false
---

# Agent Design Patterns

This skill teaches the agent-architect-agent how to design specialized agents that are focused, efficient, and maintainable through proper architecture, skill selection, and configuration.

## Overview

A well-designed agent:
- Has a single, clear purpose
- Includes only necessary skills and tools
- Operates within token budget constraints
- Maintains clear boundaries with other agents
- Can be tested and validated independently

## Agent Architecture Patterns

### Single Responsibility Principle

Each agent should have ONE primary responsibility:

**GOOD - Focused Agents:**
```yaml
# learning-optimizer-agent
purpose: Monitor skill performance and optimize learning settings
responsibilities:
  - Analyze skill execution metrics
  - Enable/disable learning based on data
  - Report optimization decisions to Avi

# skills-architect-agent
purpose: Design and validate new skills
responsibilities:
  - Create skill specifications
  - Validate skill quality
  - Ensure skill completeness
```

**BAD - Unfocused Agents:**
```yaml
# backend-agent (Too broad)
purpose: Handle all backend tasks
responsibilities:
  - Database optimization
  - API design
  - Caching strategies
  - Queue management
  - Security
  - Deployment
  # Split into specialized agents instead
```

### Agent Scope Definition

```typescript
interface AgentScope {
  name: string;
  purpose: string;              // One-sentence mission
  domain: string;               // Problem space
  primaryResponsibilities: string[];
  boundaries: {
    handles: string[];          // What this agent DOES
    delegates: {                // What it delegates
      task: string;
      to: string;               // Which agent
    }[];
  };
  successCriteria: string[];    // How to measure success
}

// Example: Learning Optimizer Agent
const learningOptimizerScope: AgentScope = {
  name: 'learning-optimizer-agent',
  purpose: 'Optimize skill learning through data-driven analysis',
  domain: 'skill-performance-optimization',

  primaryResponsibilities: [
    'Monitor skill execution metrics',
    'Analyze performance trends',
    'Make learning enable/disable decisions',
    'Report findings to Avi'
  ],

  boundaries: {
    handles: [
      'Performance metric collection',
      'Statistical analysis of skill performance',
      'Learning activation decisions',
      'Performance reporting'
    ],

    delegates: [
      {
        task: 'Creating new skills',
        to: 'skills-architect-agent'
      },
      {
        task: 'Fixing skill bugs',
        to: 'skills-debugger-agent'
      },
      {
        task: 'User-facing reports',
        to: 'avi'
      }
    ]
  },

  successCriteria: [
    'Skills improve when learning enabled',
    'No false positives (unnecessary learning activation)',
    'Optimization decisions are statistically valid',
    'Reports are clear and actionable'
  ]
};
```

### Layered Agent Architecture

```typescript
interface AgentLayer {
  layer: 'orchestration' | 'specialization' | 'execution';
  agents: string[];
  responsibilities: string[];
}

const AGENT_LAYERS: AgentLayer[] = [
  {
    layer: 'orchestration',
    agents: ['avi', 'meta-agent'],
    responsibilities: [
      'Coordinate multi-agent workflows',
      'Handle user interactions',
      'Make high-level decisions'
    ]
  },

  {
    layer: 'specialization',
    agents: [
      'learning-optimizer-agent',
      'skills-architect-agent',
      'agent-architect-agent',
      'deployment-agent'
    ],
    responsibilities: [
      'Deep expertise in specific domain',
      'Autonomous decision-making in scope',
      'Communicate results to orchestration layer'
    ]
  },

  {
    layer: 'execution',
    agents: ['database-agent', 'api-agent', 'cache-agent'],
    responsibilities: [
      'Execute specific technical tasks',
      'Implement decisions from specialization layer',
      'Report execution status'
    ]
  }
];
```

## Frontmatter Structure

### Required Agent Frontmatter

```yaml
---
name: agent-name                    # REQUIRED: kebab-case
role: Agent Role Title              # REQUIRED: Human-readable role
purpose: One-sentence mission       # REQUIRED: <100 chars
version: 1.0.0                      # REQUIRED: Semantic versioning

specialization:
  domain: domain-name               # REQUIRED: Primary domain
  expertise_level: expert           # REQUIRED: novice|intermediate|expert
  scope: focused                    # REQUIRED: focused|moderate|broad

skills:                             # REQUIRED: Skills this agent uses
  - skill-name-1
  - skill-name-2

tools:                              # REQUIRED: Tools this agent needs
  - tool-name-1
  - tool-name-2

token_budget:
  context: 8000                     # REQUIRED: Max context tokens
  output: 2000                      # REQUIRED: Max output tokens

collaboration:
  works_with:                       # OPTIONAL: Related agents
    - agent-1
    - agent-2
  delegates_to:                     # OPTIONAL: Delegation map
    - task: task-description
      agent: target-agent

monitoring:
  track_performance: true           # REQUIRED: Enable metrics
  learning_enabled: false           # REQUIRED: Can this agent learn

metadata:
  author: Avi System                # REQUIRED: Creator
  created: 2025-10-18               # REQUIRED: ISO date
  last_updated: 2025-10-18          # REQUIRED: ISO date
  status: active                    # REQUIRED: active|deprecated|experimental
---
```

### Frontmatter Validation

```typescript
interface AgentFrontmatter {
  name: string;
  role: string;
  purpose: string;
  version: string;
  specialization: {
    domain: string;
    expertise_level: 'novice' | 'intermediate' | 'expert';
    scope: 'focused' | 'moderate' | 'broad';
  };
  skills: string[];
  tools: string[];
  token_budget: {
    context: number;
    output: number;
  };
  collaboration?: {
    works_with?: string[];
    delegates_to?: Array<{
      task: string;
      agent: string;
    }>;
  };
  monitoring: {
    track_performance: boolean;
    learning_enabled: boolean;
  };
  metadata: {
    author: string;
    created: string;
    last_updated: string;
    status: 'active' | 'deprecated' | 'experimental';
  };
}

class AgentFrontmatterValidator {
  validate(frontmatter: Partial<AgentFrontmatter>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!frontmatter.name) {
      errors.push('Missing required field: name');
    } else if (!/^[a-z0-9-]+$/.test(frontmatter.name)) {
      errors.push('Name must be kebab-case');
    }

    if (!frontmatter.role) {
      errors.push('Missing required field: role');
    }

    if (!frontmatter.purpose) {
      errors.push('Missing required field: purpose');
    } else if (frontmatter.purpose.length > 100) {
      errors.push('Purpose must be <100 characters');
    }

    if (!frontmatter.version) {
      errors.push('Missing required field: version');
    }

    if (!frontmatter.specialization) {
      errors.push('Missing required field: specialization');
    } else {
      if (!frontmatter.specialization.domain) {
        errors.push('Missing specialization.domain');
      }
      if (!frontmatter.specialization.expertise_level) {
        errors.push('Missing specialization.expertise_level');
      }
      if (!frontmatter.specialization.scope) {
        errors.push('Missing specialization.scope');
      }
    }

    if (!frontmatter.skills || frontmatter.skills.length === 0) {
      errors.push('Must specify at least one skill');
    } else if (frontmatter.skills.length > 10) {
      warnings.push('Agent has >10 skills - consider splitting');
    }

    if (!frontmatter.tools || frontmatter.tools.length === 0) {
      warnings.push('No tools specified - is this intentional?');
    }

    if (!frontmatter.token_budget) {
      errors.push('Missing required field: token_budget');
    } else {
      if (!frontmatter.token_budget.context) {
        errors.push('Missing token_budget.context');
      }
      if (!frontmatter.token_budget.output) {
        errors.push('Missing token_budget.output');
      }
    }

    if (!frontmatter.monitoring) {
      errors.push('Missing required field: monitoring');
    }

    if (!frontmatter.metadata) {
      errors.push('Missing required field: metadata');
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
```

## Skills Selection

### Skill Selection Criteria

```typescript
interface SkillSelectionCriteria {
  relevance: number;        // 0-10: How relevant to agent's purpose
  frequency: number;        // 0-10: How often agent will use it
  uniqueness: number;       // 0-10: Is it available elsewhere?
  tokenCost: number;        // Estimated tokens
  learningValue: number;    // 0-10: Can agent improve with this?
}

class SkillSelector {
  async selectSkills(
    agentScope: AgentScope,
    availableSkills: string[]
  ): Promise<{
    recommended: string[];
    optional: string[];
    reasoning: Map<string, string>;
  }> {
    const scores = new Map<string, SkillSelectionCriteria>();
    const reasoning = new Map<string, string>();

    for (const skillName of availableSkills) {
      const skill = await this.loadSkill(skillName);
      const score = await this.scoreSkill(skill, agentScope);
      scores.set(skillName, score);
    }

    // Calculate total scores
    const skillScores = Array.from(scores.entries()).map(([name, criteria]) => ({
      name,
      score: this.calculateTotalScore(criteria),
      criteria
    }));

    // Sort by score
    skillScores.sort((a, b) => b.score - a.score);

    // Recommended: Top skills within token budget
    const recommended: string[] = [];
    let totalTokens = 0;
    const maxTokens = 20000; // Reserve tokens for agent instructions

    for (const skill of skillScores) {
      if (skill.score >= 7 && totalTokens + skill.criteria.tokenCost < maxTokens) {
        recommended.push(skill.name);
        totalTokens += skill.criteria.tokenCost;
        reasoning.set(skill.name, this.explainScore(skill.criteria));
      }
    }

    // Optional: Good skills that didn't make the cut
    const optional = skillScores
      .filter(s => s.score >= 5 && !recommended.includes(s.name))
      .slice(0, 5)
      .map(s => s.name);

    return { recommended, optional, reasoning };
  }

  private async scoreSkill(
    skill: any,
    agentScope: AgentScope
  ): Promise<SkillSelectionCriteria> {
    // Relevance: Does skill domain match agent domain?
    const relevance = this.calculateRelevance(skill, agentScope);

    // Frequency: Will agent use this often?
    const frequency = this.estimateFrequency(skill, agentScope);

    // Uniqueness: Is this skill critical and unique?
    const uniqueness = this.assessUniqueness(skill, agentScope);

    // Token cost
    const tokenCost = await this.estimateTokenCost(skill);

    // Learning value
    const learningValue = skill.frontmatter.learning_enabled ? 8 : 3;

    return { relevance, frequency, uniqueness, tokenCost, learningValue };
  }

  private calculateTotalScore(criteria: SkillSelectionCriteria): number {
    // Weighted scoring
    return (
      criteria.relevance * 0.35 +
      criteria.frequency * 0.25 +
      criteria.uniqueness * 0.20 +
      criteria.learningValue * 0.15 +
      (10 - Math.min(10, criteria.tokenCost / 500)) * 0.05
    );
  }

  private calculateRelevance(skill: any, agentScope: AgentScope): number {
    // Check if skill tags overlap with agent domain
    const skillTags = new Set(skill.frontmatter.tags || []);
    const domainKeywords = new Set(agentScope.domain.split('-'));

    const overlap = Array.from(skillTags).filter(tag =>
      domainKeywords.has(tag)
    ).length;

    return Math.min(10, overlap * 3);
  }

  private estimateFrequency(skill: any, agentScope: AgentScope): number {
    // Estimate how often agent will use this skill
    const primarySkills = agentScope.primaryResponsibilities.length;
    const isCore = agentScope.primaryResponsibilities.some(resp =>
      resp.toLowerCase().includes(skill.frontmatter.name.replace(/-/g, ' '))
    );

    return isCore ? 10 : Math.max(3, 10 - primarySkills);
  }

  private assessUniqueness(skill: any, agentScope: AgentScope): number {
    // Is this skill unique to this agent's domain?
    if (skill.frontmatter.category === 'specialized') {
      return 9;
    }
    if (skill.frontmatter.primary_agent === agentScope.name) {
      return 10;
    }
    return 5; // Shared skill
  }

  private async estimateTokenCost(skill: any): Promise<number> {
    const content = await this.loadSkillContent(skill.path);
    return Math.ceil(content.length / 4); // Rough estimate: 4 chars per token
  }

  private explainScore(criteria: SkillSelectionCriteria): string {
    const reasons: string[] = [];

    if (criteria.relevance >= 8) {
      reasons.push('highly relevant to agent domain');
    }
    if (criteria.frequency >= 8) {
      reasons.push('used frequently');
    }
    if (criteria.uniqueness >= 8) {
      reasons.push('unique to this specialization');
    }
    if (criteria.learningValue >= 7) {
      reasons.push('supports learning and improvement');
    }

    return reasons.join(', ');
  }
}
```

### Skill Organization Pattern

```yaml
# Organize skills by priority

skills:
  # Core skills (always loaded)
  core:
    - agent-design-patterns      # Critical for main function
    - skill-design-patterns       # Critical for main function

  # Secondary skills (loaded when needed)
  secondary:
    - learning-patterns           # Used occasionally
    - performance-monitoring      # Used occasionally

  # Optional skills (reference only)
  reference:
    - database-optimization       # For context, not execution
```

## Tool Configuration

### Tool Selection

```typescript
interface ToolRequirement {
  name: string;
  purpose: string;
  frequency: 'always' | 'often' | 'sometimes' | 'rarely';
  alternatives: string[];
}

class ToolSelector {
  selectTools(agentScope: AgentScope): ToolRequirement[] {
    const requirements: ToolRequirement[] = [];

    // Determine required tools based on responsibilities
    if (this.needsFileSystem(agentScope)) {
      requirements.push({
        name: 'read',
        purpose: 'Read skill/agent files',
        frequency: 'always',
        alternatives: []
      });

      requirements.push({
        name: 'write',
        purpose: 'Create/update skills/agents',
        frequency: 'often',
        alternatives: ['edit']
      });
    }

    if (this.needsAnalysis(agentScope)) {
      requirements.push({
        name: 'grep',
        purpose: 'Search for patterns in code',
        frequency: 'often',
        alternatives: ['glob']
      });
    }

    if (this.needsExecution(agentScope)) {
      requirements.push({
        name: 'bash',
        purpose: 'Run tests and validations',
        frequency: 'sometimes',
        alternatives: []
      });
    }

    if (this.needsWebAccess(agentScope)) {
      requirements.push({
        name: 'web_fetch',
        purpose: 'Fetch documentation and resources',
        frequency: 'rarely',
        alternatives: []
      });
    }

    return requirements;
  }

  private needsFileSystem(agentScope: AgentScope): boolean {
    return agentScope.primaryResponsibilities.some(resp =>
      /create|update|modify|design|architect/i.test(resp)
    );
  }

  private needsAnalysis(agentScope: AgentScope): boolean {
    return agentScope.primaryResponsibilities.some(resp =>
      /analyze|monitor|track|measure/i.test(resp)
    );
  }

  private needsExecution(agentScope: AgentScope): boolean {
    return agentScope.primaryResponsibilities.some(resp =>
      /test|validate|verify|execute/i.test(resp)
    );
  }

  private needsWebAccess(agentScope: AgentScope): boolean {
    return agentScope.primaryResponsibilities.some(resp =>
      /research|fetch|retrieve|documentation/i.test(resp)
    );
  }
}
```

### Tool Configuration Examples

```yaml
# Learning Optimizer Agent - Analysis focused
tools:
  - read                    # Read skill execution logs
  - grep                    # Search for performance patterns
  - bash                    # Run statistical analysis scripts

# Skills Architect Agent - Creation focused
tools:
  - read                    # Read existing skills
  - write                   # Create new skills
  - edit                    # Update existing skills
  - grep                    # Search for patterns
  - bash                    # Validate skill files

# Agent Architect Agent - Design focused
tools:
  - read                    # Read existing agents
  - write                   # Create new agents
  - edit                    # Update agent configs
  - glob                    # Find agent files
  - bash                    # Validate agent files
```

## Token Budget Management

### Budget Allocation Strategy

```typescript
interface TokenBudget {
  context: number;          // Total context window
  allocation: {
    system: number;         // System instructions
    skills: number;         // Loaded skills
    conversation: number;   // Conversation history
    tools: number;          // Tool descriptions
    buffer: number;         // Safety margin
  };
  output: number;           // Max output tokens
}

class TokenBudgetManager {
  calculateOptimalBudget(
    agentScope: AgentScope,
    selectedSkills: string[]
  ): TokenBudget {
    // Start with reasonable defaults
    const totalContext = 32000;  // Claude 3 Sonnet context
    const totalOutput = 4000;

    // Estimate system instructions
    const systemTokens = this.estimateSystemTokens(agentScope);

    // Estimate skill tokens
    const skillTokens = this.estimateSkillTokens(selectedSkills);

    // Allocate remaining for conversation
    const toolTokens = 2000;  // Tool descriptions
    const bufferTokens = 2000;  // Safety margin
    const conversationTokens = totalContext - systemTokens - skillTokens - toolTokens - bufferTokens;

    return {
      context: totalContext,
      allocation: {
        system: systemTokens,
        skills: skillTokens,
        conversation: conversationTokens,
        tools: toolTokens,
        buffer: bufferTokens
      },
      output: totalOutput
    };
  }

  private estimateSystemTokens(agentScope: AgentScope): number {
    // Base system prompt
    let tokens = 1000;

    // Add for complex scope
    if (agentScope.primaryResponsibilities.length > 3) {
      tokens += 500;
    }

    // Add for delegation instructions
    if (agentScope.boundaries.delegates.length > 0) {
      tokens += agentScope.boundaries.delegates.length * 100;
    }

    return tokens;
  }

  private estimateSkillTokens(skills: string[]): number {
    // Average skill is ~3000 tokens
    return skills.length * 3000;
  }

  validateBudget(budget: TokenBudget): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check if skills take too much space
    const skillPercentage = (budget.allocation.skills / budget.context) * 100;
    if (skillPercentage > 70) {
      warnings.push(
        `Skills consume ${skillPercentage.toFixed(0)}% of context - consider reducing`
      );
    }

    // Check if conversation space is too small
    const conversationPercentage = (budget.allocation.conversation / budget.context) * 100;
    if (conversationPercentage < 20) {
      warnings.push(
        `Only ${conversationPercentage.toFixed(0)}% left for conversation - may be limiting`
      );
    }

    // Check total allocation
    const totalAllocated = Object.values(budget.allocation).reduce((sum, v) => sum + v, 0);
    if (totalAllocated > budget.context) {
      warnings.push('Budget over-allocated - reduce skills or system prompt');
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }
}
```

### Token Optimization Techniques

```typescript
class AgentTokenOptimizer {
  optimizeAgent(agent: AgentFrontmatter): {
    original: number;
    optimized: number;
    savings: number;
    changes: string[];
  } {
    const changes: string[] = [];
    let originalTokens = this.estimateAgentTokens(agent);

    // 1. Remove redundant skills
    const skillAnalysis = this.analyzeSkillOverlap(agent.skills);
    if (skillAnalysis.redundant.length > 0) {
      agent.skills = agent.skills.filter(s =>
        !skillAnalysis.redundant.includes(s)
      );
      changes.push(`Removed ${skillAnalysis.redundant.length} redundant skills`);
    }

    // 2. Use skill references instead of full loading
    const largeSkills = this.findLargeSkills(agent.skills);
    if (largeSkills.length > 0) {
      changes.push(`Consider using skill references for: ${largeSkills.join(', ')}`);
    }

    // 3. Optimize system instructions
    const instructionSavings = this.optimizeInstructions(agent);
    if (instructionSavings > 0) {
      changes.push(`Optimized system instructions (saved ~${instructionSavings} tokens)`);
    }

    const optimizedTokens = this.estimateAgentTokens(agent);
    const savings = originalTokens - optimizedTokens;

    return {
      original: originalTokens,
      optimized: optimizedTokens,
      savings,
      changes
    };
  }

  private analyzeSkillOverlap(skills: string[]): {
    redundant: string[];
    reasoning: Map<string, string>;
  } {
    const redundant: string[] = [];
    const reasoning = new Map<string, string>();

    // Check for skills that cover similar domains
    const skillGroups = this.groupSimilarSkills(skills);

    for (const [domain, domainSkills] of skillGroups) {
      if (domainSkills.length > 2) {
        // Keep most comprehensive, remove others
        const sorted = this.sortByComprehensiveness(domainSkills);
        const toRemove = sorted.slice(1);

        redundant.push(...toRemove);
        reasoning.set(
          domain,
          `${sorted[0]} covers all capabilities of ${toRemove.join(', ')}`
        );
      }
    }

    return { redundant, reasoning };
  }
}
```

## Specialization Patterns

### Deep Specialization

```yaml
# Example: Database Optimization Specialist

name: database-optimizer-agent
role: Database Query Optimization Specialist
purpose: Optimize database queries and design efficient indexes

specialization:
  domain: database-performance
  expertise_level: expert
  scope: focused

skills:
  - database-query-optimization
  - index-design-patterns
  - query-execution-analysis
  - performance-profiling

# Deep expertise in ONE domain
# Not trying to handle API design, caching, etc.
```

### Coordinated Specialization

```yaml
# Example: Multiple agents working together

# Agent 1: API Design
name: api-architect-agent
handles:
  - REST API design
  - GraphQL schema design
  - API versioning

delegates:
  - task: Database query optimization
    to: database-optimizer-agent
  - task: Caching strategy
    to: cache-optimizer-agent

# Agent 2: Database Optimization
name: database-optimizer-agent
handles:
  - Query optimization
  - Index design
  - Schema design

delegates:
  - task: API endpoint design
    to: api-architect-agent
  - task: Cache invalidation
    to: cache-optimizer-agent
```

## Quality Assurance

### Agent Validation Checklist

```typescript
interface AgentQualityCheck {
  frontmatter: {
    complete: boolean;
    valid: boolean;
  };

  scope: {
    focused: boolean;           // Single responsibility
    clearBoundaries: boolean;   // Well-defined limits
    noDuplication: boolean;     // Not overlapping with other agents
  };

  skills: {
    relevant: boolean;          // All skills are necessary
    withinBudget: boolean;      // Fit in token budget
    noRedundancy: boolean;      // No overlapping skills
  };

  tools: {
    sufficient: boolean;        // Has all needed tools
    minimal: boolean;           // No unnecessary tools
  };

  collaboration: {
    clearDelegation: boolean;   // Knows when to delegate
    noCircular: boolean;        // No circular dependencies
  };
}

class AgentQualityValidator {
  async validate(agentPath: string): Promise<{
    score: number;
    checks: AgentQualityCheck;
    issues: string[];
    recommendations: string[];
  }> {
    const agent = await this.loadAgent(agentPath);
    const checks: AgentQualityCheck = {
      frontmatter: {
        complete: this.checkFrontmatterComplete(agent),
        valid: this.checkFrontmatterValid(agent)
      },
      scope: {
        focused: this.checkFocused(agent),
        clearBoundaries: this.checkBoundaries(agent),
        noDuplication: await this.checkDuplication(agent)
      },
      skills: {
        relevant: this.checkSkillRelevance(agent),
        withinBudget: this.checkTokenBudget(agent),
        noRedundancy: this.checkSkillRedundancy(agent)
      },
      tools: {
        sufficient: this.checkToolSufficiency(agent),
        minimal: this.checkToolMinimalism(agent)
      },
      collaboration: {
        clearDelegation: this.checkDelegation(agent),
        noCircular: await this.checkCircularDeps(agent)
      }
    };

    const { score, issues, recommendations } = this.scoreAgent(checks);

    return { score, checks, issues, recommendations };
  }

  private scoreAgent(checks: AgentQualityCheck): {
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    let score = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Frontmatter (10 points)
    if (!checks.frontmatter.complete) {
      score -= 5;
      issues.push('Incomplete frontmatter');
    }
    if (!checks.frontmatter.valid) {
      score -= 5;
      issues.push('Invalid frontmatter format');
    }

    // Scope (30 points)
    if (!checks.scope.focused) {
      score -= 15;
      issues.push('Agent scope too broad');
      recommendations.push('Split into multiple focused agents');
    }
    if (!checks.scope.clearBoundaries) {
      score -= 10;
      issues.push('Unclear boundaries');
      recommendations.push('Define what agent handles vs delegates');
    }
    if (!checks.scope.noDuplication) {
      score -= 5;
      issues.push('Overlaps with existing agents');
    }

    // Skills (30 points)
    if (!checks.skills.relevant) {
      score -= 10;
      issues.push('Some skills not relevant to agent purpose');
    }
    if (!checks.skills.withinBudget) {
      score -= 15;
      issues.push('Skills exceed token budget');
      recommendations.push('Reduce number of skills or use references');
    }
    if (!checks.skills.noRedundancy) {
      score -= 5;
      issues.push('Redundant skills detected');
    }

    // Tools (15 points)
    if (!checks.tools.sufficient) {
      score -= 10;
      issues.push('Missing necessary tools');
    }
    if (!checks.tools.minimal) {
      score -= 5;
      recommendations.push('Remove unused tools');
    }

    // Collaboration (15 points)
    if (!checks.collaboration.clearDelegation) {
      score -= 10;
      issues.push('Delegation strategy unclear');
    }
    if (!checks.collaboration.noCircular) {
      score -= 5;
      issues.push('Circular dependency detected');
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }
}
```

## Testing and Validation

### Agent Testing Strategy

```typescript
interface AgentTest {
  name: string;
  type: 'unit' | 'integration' | 'performance';
  scenario: string;
  expectedBehavior: string;
  validationCriteria: string[];
}

const AGENT_TEST_SUITE: AgentTest[] = [
  {
    name: 'Core Functionality',
    type: 'unit',
    scenario: 'Agent receives typical request in its domain',
    expectedBehavior: 'Completes task using assigned skills',
    validationCriteria: [
      'Uses correct skills',
      'Stays within scope',
      'Produces valid output',
      'Within token budget'
    ]
  },

  {
    name: 'Boundary Handling',
    type: 'unit',
    scenario: 'Agent receives out-of-scope request',
    expectedBehavior: 'Recognizes and delegates appropriately',
    validationCriteria: [
      'Identifies out-of-scope task',
      'Delegates to correct agent',
      'Provides clear explanation'
    ]
  },

  {
    name: 'Collaboration',
    type: 'integration',
    scenario: 'Agent works with other agents on complex task',
    expectedBehavior: 'Coordinates effectively and maintains boundaries',
    validationCriteria: [
      'Delegates when appropriate',
      'Receives delegated tasks correctly',
      'No circular dependencies',
      'Clear communication'
    ]
  },

  {
    name: 'Performance',
    type: 'performance',
    scenario: 'Agent handles multiple requests in sequence',
    expectedBehavior: 'Maintains quality and efficiency',
    validationCriteria: [
      'Response time <5s',
      'Token usage within budget',
      'Consistent quality',
      'No memory leaks'
    ]
  }
];
```

## Best Practices Summary

### DO
1. ✓ Create focused agents with single responsibility
2. ✓ Define clear scope and boundaries
3. ✓ Select only necessary skills
4. ✓ Configure minimal required tools
5. ✓ Manage token budget carefully
6. ✓ Establish clear delegation patterns
7. ✓ Validate agent design before deployment
8. ✓ Test collaboration scenarios
9. ✓ Monitor agent performance
10. ✓ Document specialization clearly

### DON'T
1. ✗ Create generalist agents that do everything
2. ✗ Include skills "just in case"
3. ✗ Exceed token budget constraints
4. ✗ Create circular dependencies
5. ✗ Duplicate functionality across agents
6. ✗ Skip frontmatter validation
7. ✗ Ignore collaboration patterns
8. ✗ Deploy without testing
9. ✗ Mix multiple domains in one agent
10. ✗ Forget to define delegation strategy

## Summary

Great agents are focused specialists that excel in their domain, collaborate effectively, and operate efficiently within token constraints. Follow these patterns to create agents that are maintainable, testable, and effective.
