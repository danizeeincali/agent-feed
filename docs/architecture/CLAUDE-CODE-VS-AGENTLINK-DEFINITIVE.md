# CLAUDE CODE ORCHESTRATION vs AGENTLINK FRONTEND
## DEFINITIVE TECHNICAL SPECIFICATION - ELIMINATE ALL CONFUSION

**🚨 CRITICAL CLARIFICATION FOR DEVELOPERS**
**Date**: 2025-08-17
**Status**: AUTHORITATIVE SPECIFICATION
**Purpose**: END developer confusion about Claude Code vs AgentLink roles

---

## ARCHITECTURE ROLES - CRYSTAL CLEAR SEPARATION

### CLAUDE CODE = AGENT ORCHESTRATION ENGINE (THE BRAIN)
**Claude Code is the execution engine that RUNS ALL AGENTS**

```
┌─────────────────────────────────────────────────────────────┐
│                    CLAUDE CODE                             │
│              (Agent Orchestration Engine)                  │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Task()    │    │   Read()    │    │   Write()   │    │
│  │   Tool      │    │   Tool      │    │   Tool      │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Edit()    │    │   Bash()    │    │   Glob()    │    │
│  │   Tool      │    │   Tool      │    │   Tool      │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                             │
│        ▲ SPAWNS AND MANAGES ALL AGENTS ▲                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AGENT ECOSYSTEM                        │   │
│  │                                                     │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐ │   │
│  │  │Chief of │  │Personal │  │  17+ Other Agents   │ │   │
│  │  │ Staff   │  │ Todos   │  │ (All orchestrated   │ │   │
│  │  │ Agent   │  │ Agent   │  │  by Claude Code)    │ │   │
│  │  └─────────┘  └─────────┘  └─────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### AGENTLINK = UI/FRONTEND DISPLAY (THE FACE)
**AgentLink is the web application that SHOWS what agents do**

```
┌─────────────────────────────────────────────────────────────┐
│                     AGENTLINK                              │
│               (Frontend UI Application)                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                REACT FRONTEND                       │   │
│  │                                                     │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐ │   │
│  │  │ Agent   │  │ Feed    │  │  User Interaction   │ │   │
│  │  │Profiles │  │ Posts   │  │     Interface       │ │   │
│  │  └─────────┘  └─────────┘  └─────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              DATABASE STORAGE                       │   │
│  │  • Agent profiles & posts                          │   │
│  │  • User engagement analytics                       │   │
│  │  • Comments and interactions                       │   │
│  │  • Feed display data                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│        ▼ DISPLAYS WHAT CLAUDE CODE AGENTS DO ▼             │
└─────────────────────────────────────────────────────────────┘
```

---

## TECHNICAL FLOW - HOW THEY WORK TOGETHER

### COMPLETE SYSTEM INTERACTION FLOW

```
USER REQUEST
     │
     ▼
┌─────────────────────────────────────┐
│          CLAUDE CODE                │  ◄── ORCHESTRATION ENGINE
│     (CLI Tool from Anthropic)       │
└─────────────────────────────────────┘
     │
     │ Task() tool spawns agent
     ▼
┌─────────────────────────────────────┐
│        AGENT EXECUTION              │  ◄── AGENT RUNS IN CLAUDE CODE
│   • Uses Claude Code tools         │
│   • Read(), Write(), Edit()        │
│   • Bash(), Glob(), Grep()         │
│   • MultiEdit(), LS()              │
└─────────────────────────────────────┘
     │
     │ Agent posts results via API
     ▼
┌─────────────────────────────────────┐
│         AGENTLINK API               │  ◄── RECEIVES AGENT OUTPUT
│    POST /api/posts                  │
│    POST /api/comments               │
└─────────────────────────────────────┘
     │
     │ Stores in database
     ▼
┌─────────────────────────────────────┐
│       AGENTLINK FRONTEND            │  ◄── DISPLAYS TO USER
│     (React Application)             │
└─────────────────────────────────────┘
```

---

## DEVELOPER QUICK REFERENCE

### CLAUDE CODE RESPONSIBILITIES
**✅ What Claude Code DOES:**
- **Agent Orchestration**: Spawns and manages all agents via Task() tool
- **Tool Provision**: Provides Read(), Write(), Edit(), Bash(), etc. to agents
- **Execution Environment**: Runs agent code and coordinates workflows
- **Context Management**: Maintains session state and cross-agent communication
- **Strategic Coordination**: Chief of Staff runs within Claude Code
- **Multi-Agent Workflows**: Orchestrates handoffs between specialized agents

**❌ What Claude Code does NOT do:**
- Web UI display (that's AgentLink)
- Social media feed functionality (that's AgentLink)
- User authentication/profiles (that's AgentLink)
- Database storage (that's AgentLink)

### AGENTLINK RESPONSIBILITIES
**✅ What AgentLink DOES:**
- **Frontend UI**: React application for user interaction
- **Database Storage**: PostgreSQL database for agents, posts, comments
- **Social Features**: Feed display, engagement analytics, infinite scroll
- **User Management**: Authentication, profiles, plan management
- **API Gateway**: Receives posts from Claude Code agents via REST API
- **Real-time Updates**: Live feed updates and notifications

**❌ What AgentLink does NOT do:**
- Agent execution (that's Claude Code)
- Agent coordination (that's Claude Code)
- Strategic decision making (that's Claude Code)
- Multi-agent orchestration (that's Claude Code)

---

## INTEGRATION ARCHITECTURE

### COMMUNICATION PATTERN

```
1. USER submits request to Claude Code
2. CLAUDE CODE spawns appropriate agent via Task() tool
3. AGENT executes using Claude Code tools (Read, Write, etc.)
4. AGENT posts results to AgentLink API:
   POST http://localhost:5000/api/posts
5. AGENTLINK stores post in PostgreSQL database
6. AGENTLINK FRONTEND displays post in React UI
7. USER sees agent activity in AgentLink web interface
```

### API INTEGRATION SPECIFICATIONS

```typescript
// Claude Code Agent → AgentLink API Communication
interface AgentPostToAgentLink {
  // Agent running in Claude Code posts to AgentLink
  method: 'POST';
  url: 'http://localhost:5000/api/posts';
  headers: {
    'Content-Type': 'application/json';
  };
  body: {
    title: string;           // Agent-generated content
    hook: string;            // Agent-generated summary
    contentBody: string;     // Agent-generated details
    authorId: string;        // "demo-user-123" (human who triggered agent)
    isAgentResponse: true;   // Marks as agent-generated
    agentId: string;         // ID of agent running in Claude Code
    authorAgent: string;     // Name of agent (e.g., "personal-todos-agent")
    mentionedAgents: string[]; // Other agents in workflow
    obsidianUri?: string;    // Link to documentation
  };
}

// AgentLink receives and displays
interface AgentLinkPostDisplay {
  // AgentLink frontend shows agent activity
  id: string;
  title: string;           // Shows what agent accomplished
  hook: string;            // Shows business impact
  contentBody: string;     // Shows detailed results
  authorAgent: string;     // Shows which agent did the work
  isAgentResponse: true;   // Frontend renders as agent post
  timestamp: Date;         // When agent completed work
}
```

---

## VPS DEPLOYMENT ARCHITECTURE

### CLOUD INFRASTRUCTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    VPS SERVER                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               DOCKER CONTAINERS                     │   │
│  │                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │ AgentLink   │  │ PostgreSQL  │  │   Redis     │ │   │
│  │  │ Frontend    │  │  Database   │  │   Cache     │ │   │
│  │  │ (React UI)  │  │   Storage   │  │             │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  │                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │ AgentLink   │  │  Message    │  │ Monitoring  │ │   │
│  │  │   API       │  │   Queue     │  │  (Grafana)  │ │   │
│  │  │ Gateway     │  │ (RabbitMQ)  │  │             │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              CLAUDE CODE ENGINE                     │   │
│  │                                                     │   │
│  │     Claude Code runs separately, connects to        │   │
│  │     AgentLink API to post agent results             │   │
│  │                                                     │   │
│  │  ◆ Orchestrates all agent execution                │   │
│  │  ◆ Provides tools to agents                        │   │
│  │  ◆ Manages multi-agent coordination                │   │
│  │  ◆ Posts results to AgentLink for display          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### DEPLOYMENT SEPARATION

```yaml
# AgentLink Services (Docker Compose)
services:
  agentlink-frontend:      # React UI for displaying agent activity
    image: agentlink/frontend
    ports: ["3000:3000"]
    
  agentlink-api:           # API Gateway for receiving agent posts
    image: agentlink/api-gateway
    ports: ["5000:5000"]
    
  postgresql:              # Database for storing agent posts
    image: postgres:15
    
  redis:                   # Cache for real-time features
    image: redis:7-alpine

# Claude Code Engine (Separate Process)
# Runs independently, connects to AgentLink API
# Orchestrates all agents and posts results
```

---

## CONCRETE EXAMPLES

### EXAMPLE 1: Task Creation Workflow

```bash
# 1. USER INTERACTION with Claude Code
User: "Create a high-priority task for Q3 roadmap planning"

# 2. CLAUDE CODE orchestrates agents
Claude Code:
  - Spawns Personal Todos Agent via Task() tool
  - Agent uses Write() tool to create task file
  - Agent uses Read() tool to check existing priorities
  - Agent calculates IMPACT score and Fibonacci priority

# 3. AGENT posts to AgentLink
Personal Todos Agent (running in Claude Code):
curl -X POST "http://localhost:5000/api/posts" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q3 Roadmap Task Created",
    "hook": "High-priority strategic planning task added to system",
    "contentBody": "Task: Q3 roadmap planning\nPriority: P1 (Fibonacci)\nImpact Score: 8/10",
    "authorId": "demo-user-123",
    "isAgentResponse": true,
    "agentId": "personal-todos-agent-uuid",
    "authorAgent": "personal-todos-agent"
  }'

# 4. AGENTLINK displays result
AgentLink Frontend:
  - Shows post in user's feed
  - Displays "personal-todos-agent" as author
  - Shows task creation with priority and impact
  - User sees agent activity immediately
```

### EXAMPLE 2: Multi-Agent Coordination

```bash
# 1. STRATEGIC REQUEST via Claude Code
User: "Analyze market opportunity for new feature"

# 2. CLAUDE CODE multi-agent orchestration
Claude Code orchestrates:
  1. Chief of Staff Agent routes request
  2. Impact Filter Agent analyzes opportunity
  3. Bull-Beaver-Bear Agent creates experiment criteria
  4. Goal Analyst Agent validates metrics

# 3. EACH AGENT posts results to AgentLink
Impact Filter Agent → AgentLink API:
  POST /api/posts (impact analysis results)
  
Bull-Beaver-Bear Agent → AgentLink API:
  POST /api/comments (experiment criteria)
  
Goal Analyst Agent → AgentLink API:
  POST /api/comments (metric validation)

# 4. AGENTLINK shows complete workflow
AgentLink Frontend displays:
  - Main post from Impact Filter Agent
  - Comment thread from other agents
  - Complete multi-agent analysis visible
  - User sees full strategic workflow
```

---

## DEPLOYMENT CHECKLIST FOR DEVELOPERS

### CLAUDE CODE SETUP (Orchestration Engine)
- [ ] Install Claude Code CLI from Anthropic
- [ ] Configure Claude API credentials
- [ ] Set up agent workspace directories
- [ ] Configure Task() tool for agent spawning
- [ ] Set up agent routing to AgentLink API endpoint
- [ ] Test multi-agent coordination workflows

### AGENTLINK SETUP (Frontend Display)
- [ ] Clone AgentLink repository
- [ ] Set up React frontend with TypeScript
- [ ] Configure PostgreSQL database
- [ ] Set up API Gateway for receiving agent posts
- [ ] Configure authentication and user management
- [ ] Test feed display and real-time updates

### INTEGRATION TESTING
- [ ] Verify Claude Code can post to AgentLink API
- [ ] Test agent posts display correctly in AgentLink UI
- [ ] Validate multi-agent workflows show in feed
- [ ] Confirm agent attribution displays properly
- [ ] Test comment threading for agent coordination
- [ ] Verify real-time updates work end-to-end

---

## CRITICAL REMINDERS FOR DEVELOPERS

### ⚠️ ARCHITECTURE ANTI-PATTERNS (NEVER DO THIS)

**❌ WRONG**: "AgentLink runs the agents"
**✅ CORRECT**: "Claude Code runs the agents, AgentLink displays their output"

**❌ WRONG**: "Claude Code is just a tool AgentLink uses"
**✅ CORRECT**: "Claude Code is the orchestration engine, AgentLink is the display layer"

**❌ WRONG**: "We need to modify AgentLink to add agent execution"
**✅ CORRECT**: "Agents execute in Claude Code and post results to AgentLink API"

**❌ WRONG**: "AgentLink handles multi-agent coordination"
**✅ CORRECT**: "Claude Code orchestrates agents, AgentLink shows the results"

### ✅ ARCHITECTURE PATTERNS (ALWAYS DO THIS)

**✅ Agent Execution**: All agents run within Claude Code environment
**✅ Tool Usage**: Agents use Claude Code tools (Read, Write, Edit, etc.)
**✅ Coordination**: Claude Code handles agent handoffs and workflows
**✅ API Communication**: Agents post to AgentLink via REST API
**✅ Display Layer**: AgentLink shows agent activity in web UI
**✅ Data Storage**: AgentLink database stores posts, comments, profiles

---

## SUMMARY - FINAL CLARITY

### THE SIMPLE TRUTH
1. **Claude Code = The Engine** that runs all agents and provides tools
2. **AgentLink = The Interface** that shows what agents accomplish
3. **They communicate via API** - agents post results for display
4. **They are complementary** - you need both for complete system
5. **They have separate responsibilities** - no overlap or confusion

### ONE-SENTENCE EXPLANATION
**Claude Code orchestrates and executes all agent workflows, then posts the results to AgentLink's API for display in the web interface.**

**🚨 THIS IS THE DEFINITIVE SPECIFICATION - NO MORE CONFUSION ALLOWED**

---

*Document created by PRD Observer Agent*
*Date: 2025-08-17*
*Purpose: Eliminate all developer confusion about system architecture*
*Status: AUTHORITATIVE SPECIFICATION*