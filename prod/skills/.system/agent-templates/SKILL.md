---
name: Agent Templates
description: Agent template standards, tool integration patterns, and frontmatter schemas for creating new Claude Code sub-agents
_protected: true
_version: "1.0.0"
_allowed_agents: ["meta-agent"]
---

# Agent Templates Skill

## Purpose
Provides meta-agent with comprehensive templates, standards, and patterns for generating high-quality Claude Code sub-agent configurations. Ensures consistency, security, and best practices across all agent creation.

## When to Use This Skill
- Creating new agent configurations
- Updating existing agent definitions
- Defining agent frontmatter and metadata
- Selecting appropriate tools for agent capabilities
- Implementing agent self-advocacy protocols
- Integrating with protected configuration system

## Agent Types & Templates

### 1. User-Facing Agent Template
**Characteristics:**
- Interacts directly with users
- Posts to agent feed
- Accumulates user-specific data
- May self-advocate for dynamic pages
- Implements data endpoints

**Frontmatter Structure:**
```yaml
---
name: agent-name
description: Clear delegation description starting with action verb
tools: [Read, Write, Edit, Glob, Grep, TodoWrite, Bash]
color: "#hex-color"
model: sonnet
proactive: true
priority: P0-P3
usage: PROACTIVE for [specific use case]
page_config:
  route: /agents/agent-name
  component: AgentNamePage
  data_endpoint: /api/agents/agent-name/data
  layout: single
_protected_config_source: ".system/agent-name.protected.yaml"
---
```

**Required Sections:**
- Purpose statement
- Working directory (`/prod/agent_workspace/agent-name/`)
- Production environment compliance
- Core responsibilities
- Self-advocacy protocol (if applicable)
- Data endpoint implementation

### 2. System Agent Template
**Characteristics:**
- Background operations only
- No user interaction
- No agent feed posting
- Λvi posts their outcomes
- System-level operations

**Frontmatter Structure:**
```yaml
---
name: system-agent-name
description: System operation description
tools: [Bash, Glob, Grep, Read, Edit, Write]
model: sonnet
color: "#374151"
priority: P1
usage: System operations for [purpose]
_protected_config_source: ".system/system-agent-name.protected.yaml"
_agent_type: "system"
---
```

**Key Differences:**
- No `proactive` flag
- No `page_config`
- No self-advocacy protocol
- `_agent_type: "system"` in frontmatter

### 3. Development Agent Template
**For code-related agents (coder, reviewer, tester):**
```yaml
---
name: dev-agent-name
description: Development task description
tools: [Read, Write, Edit, MultiEdit, Glob, Grep, Bash, TodoWrite]
model: sonnet
color: "#10b981"
proactive: true
priority: P2
usage: PROACTIVE for development tasks
skills:
  - name: code-standards
    path: .system/code-standards
    required: true
_protected_config_source: ".system/dev-agent-name.protected.yaml"
---
```

## Tool Selection Guide

### Essential Tools by Agent Type

**File Operations:**
- `Read` - Reading files (all agents)
- `Write` - Creating new files
- `Edit` - Modifying existing files
- `MultiEdit` - Batch file editing

**Search & Discovery:**
- `Glob` - File pattern matching
- `Grep` - Content search

**Execution:**
- `Bash` - Command execution
- `TodoWrite` - Task management

**External Data:**
- `WebFetch` - Web content retrieval
- `WebSearch` - Web search capability

**Specialized:**
- `mcp__firecrawl__*` - Advanced web scraping
- `mcp__ide__*` - IDE integration

### Tool Selection Matrix

| Agent Purpose | Recommended Tools |
|--------------|------------------|
| **Code Generator** | Read, Write, Edit, MultiEdit, Bash, Glob, Grep |
| **Code Reviewer** | Read, Glob, Grep, Edit |
| **Tester** | Read, Write, Bash, Glob, Grep |
| **Documentation** | Read, Write, Edit, Glob, WebFetch |
| **Task Manager** | Read, Write, TodoWrite, Glob |
| **Meeting Prep** | Read, Write, Edit, WebFetch |
| **Research** | Read, Write, WebFetch, WebSearch, Grep |

## Frontmatter Schema Reference

### Required Fields
```yaml
name: string                    # kebab-case, ends with -agent
description: string             # Delegation-focused, actionable
tools: string[]                # Array of tool names
model: string                   # "sonnet" (default) or "opus"
color: string                   # Hex color code
```

### Optional Fields
```yaml
proactive: boolean              # Enable proactive delegation
priority: string                # P0-P7 (Fibonacci scale)
usage: string                   # Usage description
page_config: object             # Dynamic page configuration
skills: array                   # Skills integration
_protected_config_source: string  # Protected config path
_agent_type: string             # "system" or undefined
```

### Skills Integration
```yaml
skills:
  - name: skill-name
    path: .system/skill-name    # or shared/ or agent-specific/
    required: boolean           # Is skill mandatory?
```

## Self-Advocacy Protocol

### Implementation Template
```markdown
## Self-Advocacy Protocol

You can request a dedicated page from Λvi when you meet these criteria:
- You have >10 real data items relevant to your function
- User accesses you >3 times in a session or daily
- You're performing operations that would benefit from visualization
- User explicitly requests UI capabilities for your function

### Request Format:
When conditions are met, send this to Λvi:
"I need a page because:
- Data volume: I have [X] real [data type]
- User engagement: [frequency/pattern]
- Business value: [specific benefit - be concrete]"

### Page Configuration:
If approved, your page config will be added to your frontmatter:
```yaml
page_config:
  route: /agents/[agent-id]
  component: [AgentPage]
  data_endpoint: /api/agents/[agent-id]/data
  layout: single
```

### Data Endpoint Implementation:
[Agent-specific implementation code]
```

### When NOT to Include
- System agents (meta-agent, monitoring agents)
- Utility agents without user data
- Single-purpose task agents

## Protected Configuration

### Protected Config Template
```yaml
agent_id: "agent-name"
workspace:
  base_path: "/workspaces/agent-feed/prod/agent_workspace/agent-name"
  allowed_paths:
    - "/workspaces/agent-feed/prod/agent_workspace/agent-name"
  forbidden_paths:
    - "/workspaces/agent-feed/src"
    - "/workspaces/agent-feed/frontend"
api:
  endpoint: "/api/agents/agent-name"
  methods: ["GET", "POST", "PUT"]
security:
  max_file_size_mb: 10
  allowed_extensions: [".md", ".json", ".txt"]
_checksum: "sha256-hash"
```

### Creating Protected Config
1. Create YAML file at `/prod/.claude/agents/.system/agent-name.protected.yaml`
2. Fill in agent-specific values
3. Compute SHA-256 checksum
4. Set read-only permissions: `chmod 444 file.protected.yaml`

## Agent Structure Best Practices

### Purpose Statement
- Single, clear sentence
- Focus on outcomes, not implementation
- Avoid technical jargon

### Working Directory
Always specify agent workspace:
```
Your working directory is `/workspaces/agent-feed/prod/agent_workspace/agent-name/`
```

### Production Environment Compliance
Standard section for all agents:
```markdown
## Production Environment Compliance

- **Workspace Restriction**: All operations within `/prod/agent_workspace/agent-name/`
- **System Integration**: Coordinates with `/prod/system_instructions/`
- **Security Boundaries**: No access to development directories outside `/prod/`
- **Memory Persistence**: Data stored persistently across Docker updates
- **Agent Feed Posting**: [Posts directly as agent-name OR via Λvi coordination]
```

### Core Responsibilities
- 4-6 bullet points
- Action-oriented
- Measurable outcomes
- Clear scope

## Color Palette

Standard agent colors by category:

| Category | Color | Hex |
|----------|-------|-----|
| **System** | Gray | `#374151` |
| **Strategic** | Purple | `#7c3aed` |
| **Personal** | Green | `#059669` |
| **Development** | Emerald | `#10b981` |
| **Meeting/Collaboration** | Brown | `#7c2d12` |
| **Research** | Blue | `#2563eb` |
| **Testing/QA** | Yellow | `#eab308` |
| **Documentation** | Cyan | `#06b6d4` |

## Naming Conventions

### Agent Names
- Use kebab-case
- End with `-agent`
- Be specific and descriptive
- Avoid generic terms

**Good:**
- `meeting-prep-agent`
- `code-review-agent`
- `task-priority-agent`

**Bad:**
- `helper-agent` (too generic)
- `agent1` (meaningless)
- `MeetingAgent` (wrong case)

### File Names
- Agent definition: `agent-name.md`
- Protected config: `agent-name.protected.yaml`
- Workspace: `/prod/agent_workspace/agent-name/`

## Integration with Skills System

### Recommended Skills by Agent Type

**All Development Agents:**
```yaml
skills:
  - name: code-standards
    path: .system/code-standards
    required: true
```

**User-Facing Agents:**
```yaml
skills:
  - name: brand-guidelines
    path: .system/brand-guidelines
    required: true
```

**System Architects:**
```yaml
skills:
  - name: avi-architecture
    path: .system/avi-architecture
    required: true
```

## Validation Checklist

Before generating agent configuration:
- [ ] Name is kebab-case and ends with -agent
- [ ] Description is delegation-focused
- [ ] Tools are minimal but sufficient
- [ ] Color matches agent category
- [ ] Purpose statement is clear and concise
- [ ] Working directory is specified
- [ ] Production compliance section included
- [ ] Self-advocacy protocol (if user-facing)
- [ ] Protected config created and referenced
- [ ] Skills integrated where appropriate

## Examples

### Example 1: User-Facing Agent
See: `/prod/.claude/agents/personal-todos-agent.md`

### Example 2: System Agent
See: `/prod/.claude/agents/meta-agent.md`

### Example 3: Meeting Agent
See: `/prod/.claude/agents/meeting-prep-agent.md`

## References
- Claude Code Documentation: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- AVI Architecture: `/prod/skills/.system/avi-architecture/SKILL.md`
- Code Standards: `/prod/skills/.system/code-standards/SKILL.md`
- Brand Guidelines: `/prod/skills/.system/brand-guidelines/SKILL.md`
