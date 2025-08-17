# Complete Agent List - Claude Code VPS System

## Agent Configuration System

**Configuration Directory**: `~/.claude/agents/`  
**Format**: Markdown files with YAML frontmatter  
**Execution**: Claude Code orchestrates agents via Task() tool using these MD configurations  
**NOT Docker Containers**: Agents run within Claude Code, not as separate containers

## ALL 21 Agents (Complete List)

### 1. **chief-of-staff-agent.md**
- **Role**: Strategic orchestration and central coordination
- **Tools**: Read, Write, Edit, MultiEdit, Grep, Glob, LS, TodoWrite, Bash, Task
- **Usage**: PROACTIVE for VP-level workflow optimization

### 2. **prd-observer-agent.md**
- **Role**: Background monitoring of agent interactions for PRD documentation
- **Tools**: Read, Write, Edit, MultiEdit, LS, Glob, Grep
- **Usage**: PROACTIVE during multi-agent workflows

### 3. **personal-todos-agent.md**
- **Role**: Task management with Fibonacci priority system (P0-P7)
- **Tools**: Read, Write, Edit, MultiEdit, LS, Glob, mcp__dani-agent-feed__*, Bash
- **Usage**: PROACTIVE for managing personal task lists

### 4. **impact-filter-agent.md**
- **Role**: Transform vague requests into actionable initiatives
- **Tools**: Read, Write, Edit, MultiEdit, LS, Glob, Bash, TodoWrite
- **Usage**: PROACTIVE for structured request creation

### 5. **follow-ups-agent.md**
- **Role**: Track follow-ups with team members on delegated tasks
- **Tools**: Read, Write, Edit, MultiEdit, LS, Glob
- **Usage**: PROACTIVE for delegation tracking

### 6. **meeting-prep-agent.md**
- **Role**: Create meeting agendas with clear outcomes
- **Tools**: Read, Write, Edit, MultiEdit, LS, Glob, Bash
- **Usage**: PROACTIVE for meeting preparation

### 7. **meeting-next-steps-agent.md**
- **Role**: Process meeting transcripts to extract action items
- **Tools**: Read, Write, Edit, MultiEdit, LS, Glob, Grep
- **Usage**: PROACTIVE for meeting follow-up extraction

### 8. **bull-beaver-bear-agent.md**
- **Role**: Define AB test outcome scenarios and decision thresholds
- **Tools**: Read, Write, Edit, MultiEdit, LS, Glob, Grep
- **Usage**: PROACTIVE before running any test

### 9. **goal-analyst-agent.md**
- **Role**: Analyze goal hierarchies and metric flow
- **Tools**: Read, Write, Edit, MultiEdit, LS, Glob, Grep
- **Usage**: PROACTIVE when goals or metrics discussed

### 10. **opportunity-scout-agent.md**
- **Role**: Identify micro-scale business opportunities (4-6 hour buildable)
- **Tools**: * (all tools)
- **Usage**: Only when user explicitly requests

### 11. **market-research-analyst-agent.md**
- **Role**: Comprehensive market research and competitive analysis
- **Tools**: Web tools only
- **Usage**: Supporting opportunity validation

### 12. **financial-viability-analyzer-agent.md**
- **Role**: Financial analysis and ROI calculations
- **Tools**: * (all tools)
- **Usage**: After opportunity identification

### 13. **opportunity-log-maintainer-agent.md**
- **Role**: Update and maintain opportunity logs
- **Tools**: * (all tools)
- **Usage**: Document opportunity insights

### 14. **link-logger-agent.md**
- **Role**: Strategic link capture and progressive summarization
- **Tools**: Read, Write, Edit, MultiEdit, Grep, Glob, LS, WebFetch, WebSearch, Bash, Task, TodoWrite, mcp__firecrawl__*
- **Usage**: PROACTIVE when URLs mentioned

### 15. **agent-feedback-agent.md**
- **Role**: Capture and track feedback on all agents
- **Tools**: Read, Write, Edit, MultiEdit, LS, Glob, Grep
- **Usage**: PROACTIVE when user provides corrections

### 16. **get-to-know-you-agent.md**
- **Role**: User onboarding and profile building
- **Tools**: Read, Write, Bash, WebFetch
- **Usage**: PROACTIVE for user discovery

### 17. **agent-feed-post-composer-agent.md**
- **Role**: Compose agent activity updates for feed
- **Tools**: WebFetch, Bash, Read, Glob
- **Usage**: PROACTIVE for posting outcomes

### 18. **agent-ideas-agent.md**
- **Role**: Capture and analyze ideas for new agents
- **Tools**: Read, Write, Edit, MultiEdit, LS, Glob, Grep
- **Usage**: PROACTIVE for agent ecosystem expansion

### 19. **meta-agent.md**
- **Role**: Generate new Claude Code sub-agent configurations
- **Tools**: Bash, Glob, Grep, LS, Read, Edit, MultiEdit, Write, NotebookEdit, WebFetch, TodoWrite, WebSearch, mcp__firecrawl__*
- **Usage**: PROACTIVE when user wants new agent

### 20. **meta-update-agent.md**
- **Role**: Update existing agent configuration files
- **Tools**: Bash, Glob, Grep, LS, Read, Edit, MultiEdit, Write, NotebookEdit, WebFetch, TodoWrite, WebSearch, mcp__firecrawl__*
- **Usage**: PROACTIVE for agent improvements

### 21. **chief-of-staff-automation-agent.md**
- **Role**: Daily coordination automation cycles (5am/10pm)
- **Tools**: Task, Read, Write, Bash, LS, Glob, Edit, MultiEdit
- **Usage**: Automated scheduling with catch-up logic

## Configuration File Structure

Each agent MD file contains:

```markdown
---
name: agent-name
description: Brief description of agent purpose
tools: List of Claude Code tools the agent can use
color: UI color for agent display
model: AI model preference (e.g., sonnet, opus)
---

# Purpose
Detailed description of the agent's role and responsibilities

## Instructions
Step-by-step instructions for how the agent operates

## Examples
Concrete examples of agent usage and outputs
```

## How Agents Work in Claude Code

1. **MD Configuration Files**: Each agent is defined by an MD file in `~/.claude/agents/`
2. **Claude Code Orchestration**: Claude Code reads these configurations
3. **Task Tool Execution**: Agents are invoked via `Task(subagent_type="agent-name")`
4. **Tool Access**: Each agent only has access to tools listed in its MD configuration
5. **No Docker Containers**: Agents run within Claude Code runtime, not separate containers
6. **Shared Context**: Agents can pass context and handoff work to each other

## Agent Coordination Flow

```
User Request
    ↓
Claude Code (Chief of Staff Mode)
    ↓
Reads ~/.claude/agents/*.md configurations
    ↓
Task(subagent_type="appropriate-agent")
    ↓
Agent executes with specified tools
    ↓
Results posted to AgentLink feed (if configured)
    ↓
Context preserved for next interaction
```

## Important Notes

- **Configuration-Based**: Agents are configurations, not running processes
- **Claude Code Runtime**: All execution happens within Claude Code
- **Dynamic Loading**: Agent configurations can be updated without restarts
- **Tool Restrictions**: Each agent only accesses tools defined in its MD file
- **Proactive vs Explicit**: Some agents activate automatically, others only on request