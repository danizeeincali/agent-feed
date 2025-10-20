---
_protected_config_source: ".system/CLAUDE.protected.yaml"
_agent_type: "system"
_protection_level: "maximum"
---

# Claude Code Configuration - SPARC Development Environment

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### 📁 File Organization Rules

**NEVER save to root folder. Use these directories:**
- `/src` - Source code files
- `/tests` - Test files
- `/docs` - Documentation and markdown files
- `/config` - Configuration files
- `/scripts` - Utility scripts
- `/examples` - Example code

## Project Overview

This project uses SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology with Claude-Flow orchestration for systematic Test-Driven Development.

## PageBuilder Agent Integration

### **NEW: Centralized Page Building System**

The PageBuilder Agent (`page-builder-agent`) is now available for dynamic page creation across all agents:

#### Usage Examples:
```bash
# Create a new agent page through PageBuilder
@page-builder-agent create-page --agent-id="my-agent" --title="Dashboard" --layout="grid"

# Update existing page via PageBuilder service
@page-builder-agent update-page --page-id="abc123" --content="updated content"

# List agent pages through centralized system
@page-builder-agent list-pages --agent-id="my-agent"

# Validate page design and components
@page-builder-agent validate-design --components='[{"type":"metric","props":{"label":"Tasks","value":42}}]'
```

#### Available Page Templates:
- **Dashboard Template**: Metrics, charts, KPIs, and real-time data visualization
- **Documentation Template**: Text content, guides, tutorials, and reference materials
- **Profile Template**: Agent information, capabilities, and social features
- **Custom Template**: Flexible component-based layouts with drag-and-drop

#### Inter-Agent Communication Protocol:
```json
{
  "action": "CREATE_PAGE",
  "agentId": "requesting-agent-id",
  "data": {
    "title": "Page Title",
    "template": "dashboard|documentation|profile|custom",
    "layout": "grid|single-column|two-column|sidebar",
    "components": [
      {
        "type": "metric",
        "props": { "label": "Tasks", "value": 42, "unit": "completed" }
      }
    ]
  }
}
```

#### Security Notice:
All page content is validated through the PageBuilder Agent's security pipeline before publication. The system includes:
- **Component Whitelist**: Only approved React components allowed
- **XSS Prevention**: Automatic content sanitization and validation
- **Access Control**: Agent ownership verification and permission checks
- **Rate Limiting**: Maximum 100 page operations per agent per hour
- **Memory Safety**: 2GB heap limit with automatic cleanup cycles

## SPARC Commands

### Core Commands
- `npx claude-flow sparc modes` - List available modes
- `npx claude-flow sparc run <mode> "<task>"` - Execute specific mode
- `npx claude-flow sparc tdd "<feature>"` - Run complete TDD workflow
- `npx claude-flow sparc info <mode>` - Get mode details

### Batchtools Commands
- `npx claude-flow sparc batch <modes> "<task>"` - Parallel execution
- `npx claude-flow sparc pipeline "<task>"` - Full pipeline processing
- `npx claude-flow sparc concurrent <mode> "<tasks-file>"` - Multi-task processing

### Build Commands
- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run lint` - Linting
- `npm run typecheck` - Type checking

## SPARC Workflow Phases

1. **Specification** - Requirements analysis (`sparc run spec-pseudocode`)
2. **Pseudocode** - Algorithm design (`sparc run spec-pseudocode`)
3. **Architecture** - System design (`sparc run architect`)
4. **Refinement** - TDD implementation (`sparc tdd`)
5. **Completion** - Integration (`sparc run integration`)

## Code Style & Best Practices

- **Modular Design**: Files under 500 lines
- **Environment Safety**: Never hardcode secrets
- **Test-First**: Write tests before implementation
- **Clean Architecture**: Separate concerns
- **Documentation**: Keep updated
- **Memory Safety**: Monitor memory usage and implement cleanup

## 🚀 Available Agents (55 Total)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### **NEW: Page Building & Verification System**
- `page-builder-agent` - **Centralized dynamic page creation service for all agents**
- `page-verification-agent` - **Autonomous QA testing for dynamic pages**
- `dynamic-page-testing-agent` - **E2E testing and validation for dynamic pages**

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`, `swarm-memory-manager`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`, `crdt-synchronizer`, `quorum-manager`, `security-manager`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`, `memory-coordinator`, `smart-agent`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`, `project-board-sync`, `repo-architect`, `multi-repo-swarm`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### Testing & Validation
`tdd-london-swarm`, `production-validator`

### Migration & Planning
`migration-planner`, `swarm-init`

## 🎯 Claude Code vs MCP Tools

### Claude Code Handles ALL:
- File operations (Read, Write, Edit, MultiEdit, Glob, Grep)
- Code generation and programming
- Bash commands and system operations
- Implementation work
- Project navigation and analysis
- TodoWrite and task management
- Git operations
- Package management
- Testing and debugging
- **Dynamic page building via PageBuilder Agent**

### MCP Tools ONLY:
- Coordination and planning
- Memory management
- Neural features
- Performance tracking
- Swarm orchestration
- GitHub integration

**KEY**: MCP coordinates, Claude Code executes.

## 🚀 Quick Setup

```bash
# Add Claude Flow MCP server
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

## MCP Tool Categories

### Coordination
`swarm_init`, `agent_spawn`, `task_orchestrate`

### Monitoring
`swarm_status`, `agent_list`, `agent_metrics`, `task_status`, `task_results`

### Memory & Neural
`memory_usage`, `neural_status`, `neural_train`, `neural_patterns`

### GitHub Integration
`github_swarm`, `repo_analyze`, `pr_enhance`, `issue_triage`, `code_review`

### System
`benchmark_run`, `features_detect`, `swarm_monitor`

## 📋 Agent Coordination Protocol

### Every Agent MUST:

**1️⃣ BEFORE Work:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-[id]"
```

**2️⃣ DURING Work:**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[what was done]"
```

**3️⃣ AFTER Work:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🎯 Concurrent Execution Examples

### ✅ CORRECT (Single Message):
```javascript
[BatchTool]:
  // Initialize swarm with PageBuilder integration
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "page-builder-agent" }
  mcp__claude-flow__agent_spawn { type: "tester" }
  
  // Spawn agents with Task tool
  Task("Research agent: Analyze requirements...")
  Task("PageBuilder agent: Create dynamic pages...")
  Task("Tester agent: Create test suite...")
  
  // Batch todos
  TodoWrite { todos: [
    {id: "1", content: "Research", status: "in_progress", priority: "high"},
    {id: "2", content: "Design", status: "pending", priority: "high"},
    {id: "3", content: "Implement", status: "pending", priority: "high"},
    {id: "4", content: "Test", status: "pending", priority: "medium"},
    {id: "5", content: "Document", status: "pending", priority: "low"}
  ]}
  
  // File operations
  Bash "mkdir -p app/{src,tests,docs}"
  Write "app/src/index.js"
  Write "app/tests/index.test.js"
  Write "app/docs/README.md"
```

### ❌ WRONG (Multiple Messages):
```javascript
Message 1: mcp__claude-flow__swarm_init
Message 2: Task("agent 1")
Message 3: TodoWrite { todos: [single todo] }
Message 4: Write "file.js"
// This breaks parallel coordination!
```

## Performance Benefits

- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**
- **2.8-4.4x speed improvement**
- **27+ neural models**
- **Memory-safe page building** with automatic cleanup

## Hooks Integration

### Pre-Operation
- Auto-assign agents by file type
- Validate commands for safety
- Prepare resources automatically
- Optimize topology by complexity
- Cache searches
- **Initialize PageBuilder Agent for page operations**

### Post-Operation
- Auto-format code
- Train neural patterns
- Update memory
- Analyze performance
- Track token usage
- **Cleanup page building resources**

### Session Management
- Generate summaries
- Persist state
- Track metrics
- Restore context
- Export workflows
- **Maintain page building cache and templates**

## Advanced Features (v2.0.0)

- 🚀 Automatic Topology Selection
- ⚡ Parallel Execution (2.8-4.4x speed)
- 🧠 Neural Training
- 📊 Bottleneck Analysis
- 🤖 Smart Auto-Spawning
- 🛡️ Self-Healing Workflows
- 💾 Cross-Session Memory
- 🔗 GitHub Integration
- **🎨 Centralized Page Building System**

## Integration Tips

1. Start with basic swarm init
2. Scale agents gradually
3. Use memory for context
4. Monitor progress regularly
5. Train patterns from success
6. Enable hooks automation
7. Use GitHub tools first
8. **Leverage PageBuilder Agent for all dynamic page needs**

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues

---

Remember: **Claude Flow coordinates, Claude Code creates, PageBuilder Agent builds pages!**

## 🤖 Meet Λvi - Your Chief of Staff

**Identity**: Λvi (Amplifying Virtual Intelligence) - displayed as "Λvi"
**Role**: Chief of Staff and strategic orchestrator for your personal/business operations

### Λvi's Core Capabilities
- Agent ecosystem coordination and leadership
- Strategic oversight and initiative orchestration
- Automated coordination cycle management
- Personal/business task prioritization
- Cross-functional workflow coordination

## 🎯 Claude Agent Skills Integration

### Skills Architecture

AVI uses Claude Agent Skills for token-efficient knowledge delivery through progressive disclosure:

1. **Discovery**: All skill metadata loaded at startup (~100 tokens/skill)
2. **Invocation**: Full skill content loaded when relevant (~2,000 tokens)
3. **Resources**: Supporting files loaded as referenced

### Skills Directory Structure

```
/prod/skills/
├── .system/          # Protected system skills (read-only)
│   ├── brand-guidelines/
│   ├── code-standards/
│   └── avi-architecture/
├── shared/           # Cross-agent skills (editable)
└── agent-specific/   # Agent-scoped skills (editable)
```

### System Skills Available

1. **brand-guidelines** - AVI brand voice and messaging standards
2. **code-standards** - TypeScript, React, and testing best practices
3. **avi-architecture** - System design patterns and coordination guidelines

### Using Skills in Agents

**Add to agent frontmatter:**
```yaml
skills:
  - name: brand-guidelines
    path: .system/brand-guidelines
    required: true
  - name: code-standards
    path: .system/code-standards
    required: false
```

**Reference skills in content:**
```markdown
When generating agent posts, follow the brand-guidelines skill
for consistent tone and messaging.

When writing code, apply the code-standards skill for quality
and consistency.
```

### Skills vs Tools vs MCP

| Feature | Skills | Tools | MCP |
|---------|--------|-------|-----|
| **Purpose** | Static knowledge, workflows | System operations | External services |
| **Loading** | Progressive (on-demand) | Always available | Connection-based |
| **Cost** | Low (cached) | None (local) | Medium (network) |
| **Use For** | Standards, templates, docs | File ops, git, bash | APIs, databases |

### Skills Service API

**Location**: `/api-server/services/skills-service.ts`

**Usage:**
```typescript
import { createSkillsService } from '@/api-server/services/skills-service';

const service = createSkillsService();

// Load skill metadata only (Tier 1)
const metadata = await service.loadSkillMetadata('.system/brand-guidelines');

// Load complete skill (Tier 2)
const skill = await service.loadSkillFiles('.system/brand-guidelines');

// Load specific resource (Tier 3)
const content = await service.loadResource('.system/brand-guidelines', 'templates/example.md');
```

### Skills Governance

All skills must comply with:
- Token limits (<5,000 tokens per skill)
- Security validation
- Version control
- Protection enforcement for `.system/` skills

### Creating New Skills

See: `/prod/system_instructions/skills/skill_creation_guide.md` (future)

## 🎯 Specialized Agent Routing (Phase 4.2)

Avi coordinates 6 specialized agents for 70-78% token efficiency improvement:

### Agent Roster

**Skills Management**:
- `skills-architect-agent` - Creates new skills (5K tokens)
- `skills-maintenance-agent` - Updates existing skills (4.5K tokens)

**Agent Management**:
- `agent-architect-agent` - Creates new agents (5K tokens)
- `agent-maintenance-agent` - Updates existing agents (4.5K tokens)

**Learning & Optimization**:
- `learning-optimizer-agent` - Autonomous learning management (4K tokens, auto-running)

**System Architecture**:
- `system-architect-agent` - System-wide design and architecture (6K tokens)

### Routing Logic

**Skill Operations**:
```
Create new skill → skills-architect-agent
Update/fix existing skill → skills-maintenance-agent
Keywords: "create skill", "new skill", "update skill", "fix skill"
```

**Agent Operations**:
```
Create new agent → agent-architect-agent
Update/fix existing agent → agent-maintenance-agent
Keywords: "create agent", "new agent", "update agent", "fix agent"
```

**Learning & Performance**:
```
Performance analysis → learning-optimizer-agent
Learning enablement → Automatic (agent-initiated, no user action)
Keywords: "performance", "accuracy", "learning", "improve"
```

**System Architecture**:
```
System design → system-architect-agent
Keywords: "architecture", "system design", "scaling", "infrastructure"
```

### Token Efficiency

**Meta-Agent Approach** (Legacy): 30K tokens every operation
**Specialist Approach** (Phase 4.2): 6-9K tokens per operation
**Efficiency Gain**: 70-78% reduction

### Progressive Agent Loading

**Tier 1 - Startup** (600 tokens total):
- Load metadata for all 6 specialists
- Agent name, specialization, token budget, purpose

**Tier 2 - On Request** (4-6K tokens):
- Load only the selected specialist
- Full instructions, skills, process documentation

**Tier 3 - Context** (1K tokens):
- Request context, file paths, user requirements

**Total Active**: 6-9K tokens vs 30K (meta-agent)

### Multi-Domain Coordination

When requests span multiple domains, Avi:
1. Decomposes into sub-tasks
2. Routes to appropriate specialists (sequential or parallel)
3. Coordinates execution and handoffs
4. Synthesizes unified result

**Example**:
```
User: "Create testing agent with E2E testing skills"

Avi executes:
1. skills-architect-agent → Create E2E testing skills
2. Wait for completion
3. agent-architect-agent → Create agent using new skills
4. Report: "Created E2E testing skills and testing-agent"
```

### Autonomous Learning

`learning-optimizer-agent` operates autonomously:
- Runs every hour automatically
- Monitors skill performance across all agents
- Enables learning when success rate < 70%
- Tracks improvements and reports to Avi
- No user intervention required

User requests are for status/reports only.

### Agent Specialization Principle

Each specialist has single responsibility:
- **Creators** (architects): Design and build new (skills/agents)
- **Maintainers**: Update and fix existing (skills/agents)
- **Optimizer**: Autonomous learning management
- **System**: Architecture and infrastructure

**Key**: Single responsibility = focused context = token efficiency

### Migration Status

**Phase 1** (Current): Coexistence with meta-agent
- meta-agent available but deprecated
- Specialists preferred for all new work
- Migration path: Week 1-2

**Phase 2** (Target): Specialist-only
- meta-agent removed
- All routing through specialists
- Timeline: Week 2+

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.
**ALWAYS use PageBuilder Agent for dynamic page creation across all agents.**
**ALWAYS reference appropriate skills when relevant to task.**