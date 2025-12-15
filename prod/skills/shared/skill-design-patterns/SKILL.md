---
name: skill-design-patterns
description: Best practices and patterns for creating high-quality, maintainable, and effective skills that serve specialized agents and enable autonomous learning
version: 1.0.0
category: shared
tags:
  - design
  - architecture
  - best-practices
  - patterns
  - quality
primary_agent: skills-architect-agent
related_skills:
  - agent-design-patterns
  - learning-patterns
  - performance-monitoring
author: Avi System
created: 2025-10-18
last_updated: 2025-10-18
token_efficiency: high
learning_enabled: false
---

# Skill Design Patterns

This skill teaches the skills-architect-agent how to create high-quality skills that are focused, maintainable, learnable, and token-efficient.

## Overview

A well-designed skill:
- Solves one specific problem domain
- Has clear, complete documentation
- Includes practical code examples
- Can be learned from execution data
- Fits within token budget constraints
- Follows consistent structure

## Skill Architecture

### Single Responsibility Principle

Each skill should focus on ONE domain:

**GOOD - Focused Skills:**
```markdown
# database-optimization
Teaching query optimization, indexing, and performance tuning

# api-design
RESTful API design patterns, versioning, authentication

# error-handling
Error handling strategies, logging, recovery patterns
```

**BAD - Unfocused Skills:**
```markdown
# backend-development
Everything about backend: databases, APIs, caching, queues, auth...
(Too broad - split into focused skills)

# utilities
Random helper functions and utilities
(No clear purpose - organize by domain)
```

### Skill Scope Definition

```typescript
interface SkillScope {
  domain: string;              // What problem space
  purpose: string;             // Why this skill exists
  boundaries: {
    includes: string[];        // What IS covered
    excludes: string[];        // What is NOT covered
  };
  prerequisites: string[];     // Required knowledge
  learningOutcomes: string[];  // What agent will learn
}

// Example: Database Optimization Skill
const exampleScope: SkillScope = {
  domain: 'database-query-optimization',
  purpose: 'Teach agents to write efficient database queries and design optimal indexes',

  boundaries: {
    includes: [
      'Query optimization techniques',
      'Index design and selection',
      'Execution plan analysis',
      'Performance profiling',
      'Common anti-patterns'
    ],
    excludes: [
      'Database administration',
      'Backup and recovery',
      'Replication setup',
      'Database selection',
      'Schema migrations'
    ]
  },

  prerequisites: [
    'Basic SQL knowledge',
    'Understanding of relational databases'
  ],

  learningOutcomes: [
    'Write queries that use indexes effectively',
    'Identify and fix slow queries',
    'Design indexes for common access patterns',
    'Understand when to denormalize'
  ]
};
```

### Skill Organization Pattern

```markdown
# Standard Skill Structure

## Overview (50-100 words)
Brief description of what this skill teaches and why it matters

## Core Concepts (200-400 words)
Fundamental principles and mental models

## Practical Patterns (400-600 words)
Real-world patterns with code examples

## Common Pitfalls (200-300 words)
What NOT to do and why

## Best Practices (200-300 words)
Guidelines for success

## Examples (300-500 words)
Complete, runnable examples

## Summary (50-100 words)
Key takeaways
```

## Frontmatter Requirements

### Required Fields

Every skill MUST have complete YAML frontmatter:

```yaml
---
name: skill-name                    # REQUIRED: kebab-case identifier
description: Brief description      # REQUIRED: 1-2 sentences, <200 chars
version: 1.0.0                      # REQUIRED: Semantic versioning
category: shared                    # REQUIRED: shared | specialized | domain
tags:                               # REQUIRED: At least 3 relevant tags
  - tag1
  - tag2
  - tag3
primary_agent: agent-name           # REQUIRED: Which agent uses this most
related_skills:                     # OPTIONAL: Related skills
  - skill-1
  - skill-2
author: Avi System                  # REQUIRED: Creator
created: 2025-10-18                 # REQUIRED: ISO date
last_updated: 2025-10-18            # REQUIRED: ISO date
token_efficiency: high              # REQUIRED: high | medium | low
learning_enabled: false             # REQUIRED: true | false
---
```

### Frontmatter Validation

```typescript
interface SkillFrontmatter {
  name: string;
  description: string;
  version: string;
  category: 'shared' | 'specialized' | 'domain';
  tags: string[];
  primary_agent: string;
  related_skills?: string[];
  author: string;
  created: string;          // ISO date
  last_updated: string;     // ISO date
  token_efficiency: 'high' | 'medium' | 'low';
  learning_enabled: boolean;
}

class FrontmatterValidator {
  validate(frontmatter: Partial<SkillFrontmatter>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!frontmatter.name) {
      errors.push('Missing required field: name');
    } else if (!/^[a-z0-9-]+$/.test(frontmatter.name)) {
      errors.push('Name must be kebab-case (lowercase, hyphens only)');
    }

    if (!frontmatter.description) {
      errors.push('Missing required field: description');
    } else if (frontmatter.description.length > 200) {
      errors.push('Description must be <200 characters');
    }

    if (!frontmatter.version) {
      errors.push('Missing required field: version');
    } else if (!/^\d+\.\d+\.\d+$/.test(frontmatter.version)) {
      errors.push('Version must follow semantic versioning (e.g., 1.0.0)');
    }

    if (!frontmatter.category) {
      errors.push('Missing required field: category');
    } else if (!['shared', 'specialized', 'domain'].includes(frontmatter.category)) {
      errors.push('Category must be: shared, specialized, or domain');
    }

    if (!frontmatter.tags || frontmatter.tags.length < 3) {
      errors.push('Must have at least 3 tags');
    }

    if (!frontmatter.primary_agent) {
      errors.push('Missing required field: primary_agent');
    }

    if (!frontmatter.author) {
      errors.push('Missing required field: author');
    }

    if (!frontmatter.created) {
      errors.push('Missing required field: created');
    }

    if (!frontmatter.last_updated) {
      errors.push('Missing required field: last_updated');
    }

    if (!frontmatter.token_efficiency) {
      errors.push('Missing required field: token_efficiency');
    }

    if (frontmatter.learning_enabled === undefined) {
      errors.push('Missing required field: learning_enabled');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  generate(skillName: string, config: Partial<SkillFrontmatter>): SkillFrontmatter {
    const now = new Date().toISOString().split('T')[0];

    return {
      name: skillName,
      description: config.description || 'Skill description needed',
      version: '1.0.0',
      category: config.category || 'shared',
      tags: config.tags || ['tag1', 'tag2', 'tag3'],
      primary_agent: config.primary_agent || 'general-agent',
      related_skills: config.related_skills,
      author: 'Avi System',
      created: now,
      last_updated: now,
      token_efficiency: config.token_efficiency || 'medium',
      learning_enabled: config.learning_enabled || false
    };
  }
}
```

### Category Guidelines

**Shared Skills**: Used by multiple agents across domains
- `learning-patterns`
- `performance-monitoring`
- `error-handling`

**Specialized Skills**: For specific agent types
- `agent-design-patterns` (for agent-architect)
- `learning-optimization` (for learning-optimizer)

**Domain Skills**: For specific technical domains
- `database-optimization`
- `api-design`
- `frontend-performance`

## Content Organization

### Section Structure

```markdown
# Skill Name

Clear, focused title matching the frontmatter name.

## Overview

Brief introduction (50-100 words):
- What this skill teaches
- Why it matters
- Who should use it

## Core Concepts

Fundamental principles (200-400 words):
- Mental models
- Key terminology
- Theoretical foundation

## Practical Patterns

Real-world applications (400-600 words):
- Common use cases
- Implementation patterns
- Code examples

## Common Pitfalls

What to avoid (200-300 words):
- Typical mistakes
- Why they're problematic
- How to avoid them

## Best Practices

Guidelines for success (200-300 words):
- Recommended approaches
- Quality criteria
- Performance considerations

## Examples

Complete, runnable code (300-500 words):
- Realistic scenarios
- Full context
- Expected outcomes

## Summary

Key takeaways (50-100 words):
- Recap main points
- Reinforce critical concepts
```

### Code Example Guidelines

```typescript
// GOOD: Complete, runnable example with context

/**
 * Example: Optimizing database queries with indexes
 *
 * Problem: Slow user lookup by email
 * Solution: Add index on email column
 */

// BEFORE: Slow query (table scan)
const user = await db.query(`
  SELECT * FROM users WHERE email = $1
`, [email]);
// Execution time: ~450ms on 1M users

// AFTER: Fast query (index scan)
await db.query(`
  CREATE INDEX idx_users_email ON users(email)
`);

const user = await db.query(`
  SELECT * FROM users WHERE email = $1
`, [email]);
// Execution time: ~2ms on 1M users

/**
 * Why this works:
 * - B-tree index enables O(log n) lookups
 * - Email lookups are common (high cardinality)
 * - Read-heavy workload justifies index overhead
 */
```

```typescript
// BAD: Incomplete, vague example

// Create an index
CREATE INDEX idx ON table(column);

// Use the index
SELECT * FROM table WHERE column = value;

// (No context, no explanation, not runnable)
```

### Progressive Complexity

```typescript
// Pattern: Start simple, add complexity progressively

// LEVEL 1: Basic Pattern
function fetchUser(id: string): Promise<User> {
  return db.users.findById(id);
}

// LEVEL 2: Add Error Handling
async function fetchUser(id: string): Promise<User> {
  try {
    const user = await db.users.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { id, error });
    throw error;
  }
}

// LEVEL 3: Add Caching
async function fetchUser(id: string): Promise<User> {
  // Check cache first
  const cached = await cache.get(`user:${id}`);
  if (cached) {
    return cached;
  }

  // Fetch from database
  try {
    const user = await db.users.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }

    // Cache for 5 minutes
    await cache.set(`user:${id}`, user, 300);

    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { id, error });
    throw error;
  }
}

// LEVEL 4: Production-Ready
class UserRepository {
  constructor(
    private db: Database,
    private cache: Cache,
    private logger: Logger
  ) {}

  async fetchUser(id: string): Promise<User> {
    // Check cache
    const cached = await this.cache.get(`user:${id}`);
    if (cached) {
      this.logger.debug('User fetched from cache', { id });
      return cached;
    }

    // Fetch from database
    try {
      const user = await this.db.users.findById(id);

      if (!user) {
        throw new UserNotFoundError(id);
      }

      // Cache result
      await this.cache.set(`user:${id}`, user, 300);

      this.logger.info('User fetched from database', { id });
      return user;

    } catch (error) {
      if (error instanceof UserNotFoundError) {
        // Expected error - don't log as error
        this.logger.debug('User not found', { id });
      } else {
        // Unexpected error
        this.logger.error('Failed to fetch user', { id, error });
      }
      throw error;
    }
  }
}
```

## Learning Integration

### When to Enable Learning

```typescript
interface LearningCriteria {
  // Enable learning when:
  hasVariableInputs: boolean;      // Inputs change over time
  hasPerformanceMetrics: boolean;  // Can measure success objectively
  hasIterativeExecution: boolean;  // Executed multiple times
  hasOptimizationPotential: boolean; // Room for improvement
}

function shouldEnableLearning(skillScope: SkillScope): boolean {
  const criteria: LearningCriteria = {
    // Can inputs vary significantly?
    hasVariableInputs: skillScope.domain.includes('optimization') ||
                       skillScope.domain.includes('selection') ||
                       skillScope.domain.includes('tuning'),

    // Can we measure success objectively?
    hasPerformanceMetrics: skillScope.learningOutcomes.some(outcome =>
      outcome.includes('performance') ||
      outcome.includes('efficiency') ||
      outcome.includes('accuracy')
    ),

    // Is it used repeatedly?
    hasIterativeExecution: !skillScope.domain.includes('one-time') &&
                          !skillScope.domain.includes('migration'),

    // Can it be improved?
    hasOptimizationPotential: !skillScope.domain.includes('standard') &&
                             !skillScope.domain.includes('fixed')
  };

  // Enable learning if at least 3 criteria are met
  const metCriteria = Object.values(criteria).filter(Boolean).length;
  return metCriteria >= 3;
}
```

### Learning Documentation Pattern

```markdown
## Learning Considerations

This skill has learning enabled because:
- Queries vary by workload and schema
- Performance is objectively measurable
- Executed frequently in production
- Optimization strategies improve over time

### What Can Be Learned

1. **Index Selection**
   - Which columns benefit most from indexes
   - Composite index vs multiple single-column indexes
   - When to use partial indexes

2. **Query Patterns**
   - Common access patterns in this application
   - Optimal join strategies for typical queries
   - When to denormalize for performance

### Performance Metrics

Success measured by:
- Query execution time (target: <100ms for P95)
- Index usage ratio (target: >80% of queries use indexes)
- Full table scan frequency (target: <5% of queries)

### Learning Feedback Loop

```typescript
interface QueryOptimizationFeedback {
  query: string;
  executionTime: number;
  usedIndexes: string[];
  rowsScanned: number;
  rowsReturned: number;
  recommendations: string[];
}

async function recordQueryExecution(
  query: string,
  result: QueryResult
): Promise<void> {
  const feedback: QueryOptimizationFeedback = {
    query,
    executionTime: result.duration,
    usedIndexes: result.plan.indexes,
    rowsScanned: result.plan.rowsExamined,
    rowsReturned: result.rows.length,
    recommendations: analyzeQueryPlan(result.plan)
  };

  await learningSystem.recordExecution('database-optimization', feedback);
}
```
```

## Token Efficiency

### Guidelines for Token Budget

```typescript
interface TokenBudget {
  frontmatter: number;     // ~200 tokens
  overview: number;        // ~100 tokens
  concepts: number;        // ~400 tokens
  patterns: number;        // ~800 tokens
  pitfalls: number;        // ~300 tokens
  practices: number;       // ~300 tokens
  examples: number;        // ~600 tokens
  summary: number;         // ~100 tokens
  total: number;           // ~2800 tokens target
}

const OPTIMAL_BUDGET: TokenBudget = {
  frontmatter: 200,
  overview: 100,
  concepts: 400,
  patterns: 800,
  pitfalls: 300,
  practices: 300,
  examples: 600,
  summary: 100,
  total: 2800
};

// Maximum allowed: 4000 tokens
// Optimal range: 2500-3500 tokens
```

### Token Optimization Techniques

```typescript
// WASTEFUL: Verbose explanations
/**
 * This function is designed to take a user identifier as input,
 * which should be provided in the form of a string, and then
 * it will attempt to retrieve the corresponding user record
 * from the database by executing a query...
 */

// EFFICIENT: Clear and concise
/**
 * Fetches user by ID from database
 */

// ---

// WASTEFUL: Repetitive examples
// Example 1: Fetch user by ID
// Example 2: Fetch user by email
// Example 3: Fetch user by username
// (Showing same pattern 3 times)

// EFFICIENT: One comprehensive example
/**
 * Generic fetch pattern - works for any unique field
 */
async function fetchBy(field: string, value: any): Promise<User> {
  return db.users.findOne({ [field]: value });
}

// ---

// WASTEFUL: Long variable names in examples
const userAuthenticationAndAuthorizationService = new Service();

// EFFICIENT: Clear but concise
const authService = new Service();
```

### Content Density Optimization

```markdown
BAD - Low density:

## Error Handling

Error handling is very important in software development. When errors occur,
you need to handle them properly. There are many types of errors that can
happen. Some errors are expected, and some are unexpected. You should always
log errors. Error logging helps with debugging. You should also return
meaningful error messages to users.

GOOD - High density:

## Error Handling

Handle errors at appropriate boundaries:

```typescript
// Business logic layer: Throw specific errors
if (!user) throw new UserNotFoundError(id);

// API layer: Transform to HTTP responses
catch (error) {
  if (error instanceof UserNotFoundError) {
    return res.status(404).json({ error: 'User not found' });
  }
  logger.error('Unexpected error', { error });
  return res.status(500).json({ error: 'Internal error' });
}
```

Log errors with context for debugging:
- User action that triggered error
- Relevant identifiers (user ID, request ID)
- Stack trace for unexpected errors
```

## Quality Criteria

### Completeness Checklist

```typescript
interface SkillQualityCheck {
  frontmatter: {
    allFieldsPresent: boolean;
    validFormat: boolean;
    appropriateTags: boolean;
  };

  content: {
    hasOverview: boolean;
    hasConcepts: boolean;
    hasPatterns: boolean;
    hasExamples: boolean;
    hasSummary: boolean;
  };

  examples: {
    areComplete: boolean;
    areRunnable: boolean;
    haveContext: boolean;
    showRealScenarios: boolean;
  };

  learning: {
    hasLearningSection: boolean;    // If learning_enabled: true
    definesMetrics: boolean;
    describesFeedbackLoop: boolean;
  };

  tokenEfficiency: {
    withinBudget: boolean;          // <4000 tokens
    optimal: boolean;               // 2500-3500 tokens
    highDensity: boolean;           // No fluff
  };
}

class SkillQualityValidator {
  validate(skillPath: string): SkillQualityCheck {
    const skill = this.loadSkill(skillPath);
    const frontmatter = this.parseFrontmatter(skill);
    const content = this.parseContent(skill);
    const tokens = this.estimateTokens(skill);

    return {
      frontmatter: {
        allFieldsPresent: this.checkRequiredFields(frontmatter),
        validFormat: this.validateFormat(frontmatter),
        appropriateTags: frontmatter.tags.length >= 3
      },

      content: {
        hasOverview: /^## Overview/m.test(content),
        hasConcepts: /^## Core Concepts/m.test(content),
        hasPatterns: /^## (Practical )?Patterns/m.test(content),
        hasExamples: /^## Examples/m.test(content),
        hasSummary: /^## Summary/m.test(content)
      },

      examples: {
        areComplete: this.checkExampleCompleteness(content),
        areRunnable: this.checkExampleRunnability(content),
        haveContext: this.checkExampleContext(content),
        showRealScenarios: this.checkRealisticScenarios(content)
      },

      learning: {
        hasLearningSection: frontmatter.learning_enabled ?
          /^## Learning/m.test(content) : true,
        definesMetrics: frontmatter.learning_enabled ?
          /metrics|measure|performance/i.test(content) : true,
        describesFeedbackLoop: frontmatter.learning_enabled ?
          /feedback|record|track/i.test(content) : true
      },

      tokenEfficiency: {
        withinBudget: tokens < 4000,
        optimal: tokens >= 2500 && tokens <= 3500,
        highDensity: this.checkContentDensity(content)
      }
    };
  }

  generateReport(check: SkillQualityCheck): {
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    let score = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check frontmatter (20 points)
    if (!check.frontmatter.allFieldsPresent) {
      score -= 10;
      issues.push('Missing required frontmatter fields');
    }
    if (!check.frontmatter.validFormat) {
      score -= 5;
      issues.push('Invalid frontmatter format');
    }
    if (!check.frontmatter.appropriateTags) {
      score -= 5;
      issues.push('Need at least 3 relevant tags');
    }

    // Check content (30 points)
    const contentChecks = Object.values(check.content);
    const missingContent = contentChecks.filter(c => !c).length;
    score -= missingContent * 6;
    if (missingContent > 0) {
      issues.push(`Missing ${missingContent} required content sections`);
    }

    // Check examples (25 points)
    if (!check.examples.areComplete) {
      score -= 10;
      issues.push('Examples are incomplete');
      recommendations.push('Add complete, runnable code examples');
    }
    if (!check.examples.haveContext) {
      score -= 10;
      issues.push('Examples lack context');
      recommendations.push('Explain when and why to use each pattern');
    }
    if (!check.examples.showRealScenarios) {
      score -= 5;
      issues.push('Examples are too abstract');
      recommendations.push('Use realistic, production-like scenarios');
    }

    // Check learning (15 points)
    if (!check.learning.hasLearningSection) {
      score -= 7;
      issues.push('Missing learning section (required when learning_enabled: true)');
    }
    if (!check.learning.definesMetrics) {
      score -= 4;
      issues.push('Learning metrics not defined');
    }
    if (!check.learning.describesFeedbackLoop) {
      score -= 4;
      issues.push('Feedback loop not described');
    }

    // Check token efficiency (10 points)
    if (!check.tokenEfficiency.withinBudget) {
      score -= 10;
      issues.push('Exceeds token budget (4000 max)');
      recommendations.push('Remove unnecessary content or split into multiple skills');
    } else if (!check.tokenEfficiency.optimal) {
      score -= 3;
      recommendations.push('Optimize to 2500-3500 token range');
    }
    if (!check.tokenEfficiency.highDensity) {
      score -= 3;
      recommendations.push('Increase content density - remove fluff');
    }

    return { score: Math.max(0, score), issues, recommendations };
  }
}
```

### Accuracy Verification

```typescript
class SkillAccuracyChecker {
  async verifyCodeExamples(skillPath: string): Promise<{
    valid: boolean;
    errors: Array<{ line: number; error: string }>;
  }> {
    const skill = await this.loadSkill(skillPath);
    const codeBlocks = this.extractCodeBlocks(skill);
    const errors: Array<{ line: number; error: string }> = [];

    for (const block of codeBlocks) {
      // Check syntax
      try {
        this.parseTypeScript(block.code);
      } catch (error) {
        errors.push({
          line: block.lineNumber,
          error: `Syntax error: ${error.message}`
        });
      }

      // Check for common mistakes
      const issues = this.checkCommonMistakes(block.code);
      errors.push(...issues.map(issue => ({
        line: block.lineNumber,
        error: issue
      })));
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private checkCommonMistakes(code: string): string[] {
    const issues: string[] = [];

    // Check for unhandled promises
    if (/await\s+\w+\([^)]*\)(?!\s*(\.catch|;))/.test(code)) {
      issues.push('Unhandled promise rejection');
    }

    // Check for missing error handling
    if (/async\s+function/.test(code) && !/try\s*{/.test(code)) {
      issues.push('Async function without try/catch');
    }

    // Check for console.log in examples
    if (/console\.log/.test(code)) {
      issues.push('Use logger instead of console.log');
    }

    return issues;
  }
}
```

## Skill Versioning

### Semantic Versioning

```typescript
interface SkillVersion {
  major: number;  // Breaking changes
  minor: number;  // New features, backward compatible
  patch: number;  // Bug fixes
}

class SkillVersionManager {
  incrementVersion(
    current: string,
    changeType: 'major' | 'minor' | 'patch'
  ): string {
    const [major, minor, patch] = current.split('.').map(Number);

    switch (changeType) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
    }
  }

  determineChangeType(
    oldContent: string,
    newContent: string
  ): 'major' | 'minor' | 'patch' {
    const oldSections = this.extractSections(oldContent);
    const newSections = this.extractSections(newContent);

    // Major: Removed sections or changed structure
    const removedSections = oldSections.filter(s =>
      !newSections.some(ns => ns.title === s.title)
    );

    if (removedSections.length > 0) {
      return 'major';
    }

    // Minor: Added new sections
    const addedSections = newSections.filter(s =>
      !oldSections.some(os => os.title === s.title)
    );

    if (addedSections.length > 0) {
      return 'minor';
    }

    // Patch: Content improvements
    return 'patch';
  }
}
```

## Best Practices Summary

### DO
1. ✓ Focus on single domain
2. ✓ Include complete, runnable examples
3. ✓ Use real-world scenarios
4. ✓ Provide clear context for every example
5. ✓ Define learning metrics if learning_enabled
6. ✓ Optimize for token efficiency
7. ✓ Use progressive complexity
8. ✓ Validate code examples
9. ✓ Include error handling patterns
10. ✓ Write for your specific agent audience

### DON'T
1. ✗ Create mega-skills covering multiple domains
2. ✗ Use incomplete or pseudo-code examples
3. ✗ Write abstract examples without context
4. ✗ Ignore token budget constraints
5. ✗ Enable learning without defining metrics
6. ✗ Include placeholder content
7. ✗ Repeat the same pattern multiple times
8. ✗ Use overly verbose explanations
9. ✗ Forget frontmatter validation
10. ✗ Skip quality checks before deployment

## Example: Complete Skill Template

```markdown
---
name: example-skill
description: Brief description of what this skill teaches
version: 1.0.0
category: shared
tags:
  - tag1
  - tag2
  - tag3
primary_agent: example-agent
related_skills:
  - related-skill-1
author: Avi System
created: 2025-10-18
last_updated: 2025-10-18
token_efficiency: high
learning_enabled: false
---

# Example Skill

## Overview

Brief introduction to what this skill teaches and why it matters.

## Core Concepts

Fundamental principles and mental models.

## Practical Patterns

Real-world implementation patterns with code examples.

```typescript
// Complete, runnable example
class ExamplePattern {
  // Implementation
}
```

## Common Pitfalls

What NOT to do and why.

## Best Practices

Guidelines for success.

## Examples

Complete, realistic scenarios with full context.

## Summary

Key takeaways and reinforcement of critical concepts.
```

## Summary

Great skills are focused, complete, practical, and efficient. Follow these patterns to create skills that agents can learn from effectively while staying within token budgets.
