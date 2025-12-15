# Skills Quick Start Guide
## AVI Agent Skills - Getting Started

This guide helps you quickly integrate and use Claude Agent Skills in the AVI framework.

---

## What Are Skills?

Skills are modular knowledge packages that provide:
- **Brand standards** - Consistent messaging and tone
- **Code patterns** - Best practices and examples
- **Architecture guidance** - System design patterns

**Key Benefit**: 70-90% token reduction through progressive disclosure

---

## Available System Skills

### 1. Brand Guidelines
**Path**: `.system/brand-guidelines`
**Use When**: Creating user-facing content, agent posts, documentation
**Provides**: Voice, tone, messaging frameworks, agent-specific guidelines

### 2. Code Standards
**Path**: `.system/code-standards`
**Use When**: Writing code, reviewing code, refactoring
**Provides**: TypeScript, React, testing, security, performance standards

### 3. AVI Architecture
**Path**: `.system/avi-architecture`
**Use When**: Designing features, architecting systems, coordinating agents
**Provides**: System patterns, agent coordination, API design, security architecture

---

## Using Skills in Your Agent

### Step 1: Add to Agent Frontmatter

Edit your agent file in `/prod/.claude/agents/your-agent.md`:

```yaml
---
name: your-agent
skills:
  - name: brand-guidelines
    path: .system/brand-guidelines
    required: true
  - name: code-standards
    path: .system/code-standards
    required: false
---
```

### Step 2: Reference Skills in Instructions

```markdown
## Instructions

When generating agent posts, **follow the brand-guidelines skill** 
for consistent tone and messaging.

When writing code, **apply the code-standards skill** for quality 
and consistency.
```

### Step 3: Load Skills Programmatically (Optional)

```typescript
import { createSkillsService } from '@/api-server/services/skills-service';

const service = createSkillsService();

// Load metadata only (fast, ~100 tokens)
const metadata = await service.loadSkillMetadata('.system/brand-guidelines');

// Load full content (~2,000 tokens)
const skill = await service.loadSkillFiles('.system/brand-guidelines');

// Load specific resource (on-demand)
const content = await service.loadResource('.system/brand-guidelines', 'templates/example.md');
```

---

## Progressive Disclosure Explained

Skills load in three tiers:

**Tier 1: Discovery** (~100 tokens)
- Just the metadata (name, description)
- Loaded at startup for all skills
- Helps Claude determine relevance

**Tier 2: Invocation** (~2,000 tokens)
- Full skill content loaded when needed
- Triggered by relevant user request
- Includes instructions and guidelines

**Tier 3: Resources** (variable)
- Supporting files loaded as referenced
- On-demand only
- Examples, templates, schemas

**Result**: Only load what you need, when you need it!

---

## Creating a New Skill

### Structure
```
my-skill/
├── SKILL.md          # REQUIRED: Main skill file
├── reference.md      # Optional: Additional docs
├── templates/        # Optional: Templates
└── scripts/          # Optional: Utilities
```

### SKILL.md Format
```markdown
---
name: Skill Display Name
description: What the skill does and when to use it (max 1024 chars)
version: "1.0.0"
_protected: false
_allowed_agents: ["agent-1", "agent-2"]
---

# Skill Title

## Purpose
Brief explanation of skill purpose

## When to Use This Skill
- Scenario 1
- Scenario 2

## Instructions
1. Step-by-step guidance
2. Decision criteria
3. Validation checks

## Examples
### Example 1: Common Case
...
```

### Best Practices
- Keep SKILL.md under 5,000 tokens
- Focus on procedural knowledge
- Use progressive disclosure (main → reference → resources)
- Include practical examples
- Document when to use the skill

---

## Token Optimization Tips

1. **Metadata-first**: Most queries can be answered with just metadata
2. **Lazy loading**: Only load full content when needed
3. **Caching**: Skills are cached for 1 hour by default
4. **Specific references**: Point to specific sections instead of loading everything

**Example Optimization**:
```markdown
<!-- ❌ BAD: Loads entire 5,000 token skill -->
"Follow all the brand guidelines"

<!-- ✅ GOOD: Loads only relevant section -->
"For agent feed posts, follow section 'Messaging Frameworks > Agent Feed Posts' 
in brand-guidelines skill"
```

---

## Troubleshooting

### Skill Not Loading
- Check SKILL.md exists at root of skill directory
- Validate YAML frontmatter (use `---` delimiters)
- Ensure `name` and `description` fields present

### Permission Errors
- System skills (`.system/`) are read-only
- Use `shared/` or `agent-specific/` for editable skills
- Check file permissions: `chmod 444` for protected files

### Token Budget Issues
- Review skill content length
- Move detailed content to reference files
- Use progressive disclosure pattern
- Estimate: ~4 characters per token

---

## Common Patterns

### Pattern: Skill Composition
Combine multiple skills for complex tasks:

```yaml
skills:
  - name: brand-guidelines
    path: .system/brand-guidelines
    required: true
  - name: code-standards
    path: .system/code-standards
    required: true
  - name: my-domain-skill
    path: shared/my-domain-skill
    required: false
```

### Pattern: Conditional Loading
Load different skills based on task:

```markdown
## Instructions
1. If task is user-facing → load brand-guidelines
2. If task is technical → load code-standards
3. If task is architectural → load avi-architecture
```

### Pattern: Resource References
Point to specific resources:

```markdown
For the complete color palette, see:
`brand-guidelines/visual/colors.json`

For API response format examples, see:
`code-standards/examples/api-responses.md`
```

---

## Next Steps

1. **Review existing skills** - Read the 3 system skills
2. **Update your agent** - Add skills to frontmatter
3. **Test integration** - Verify skills load correctly
4. **Monitor token usage** - Track efficiency gains
5. **Create custom skills** - Build domain-specific knowledge

---

## Resources

- **Implementation Plan**: `/docs/AVI-AGENT-SKILLS-STRATEGIC-IMPLEMENTATION-PLAN.md`
- **Technical Research**: `/docs/CLAUDE-AGENT-SKILLS-RESEARCH.md`
- **API Service**: `/api-server/services/skills-service.ts`
- **Test Examples**: `/tests/skills/` and `/tests/e2e/`

---

**Questions?** Review the implementation summary at `/docs/PHASE-0-1-IMPLEMENTATION-SUMMARY.md`
