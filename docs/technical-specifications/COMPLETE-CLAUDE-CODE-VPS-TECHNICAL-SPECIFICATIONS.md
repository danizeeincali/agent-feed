# Claude Code VPS Technical Specifications

**Complete Technical Documentation for Self-Contained VPS Deployment**

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [API Specification](#api-specification)
3. [Agent Framework Design](#agent-framework-design)
4. [Database Schema](#database-schema)
5. [Deployment Guide](#deployment-guide)
6. [Feature Specifications](#feature-specifications)
7. [Integration Patterns](#integration-patterns)
8. [Security & Authentication](#security--authentication)
9. [Workflow Engine](#workflow-engine)
10. [UI/Frontend Architecture](#uifrontend-architecture)
11. [Monitoring & Logging](#monitoring--logging)
12. [Performance Requirements](#performance-requirements)

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Code VPS System                       │
├─────────────────────────────────────────────────────────────────┤
│  AgentLink Frontend (React/Next.js) - Runs in Docker           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │   Agent     │ │  Task Mgmt  │ │   Memory    │              │
│  │   Feed UI   │ │  Dashboard  │ │  Explorer   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  API Layer (Node.js/Express) - Runs in Docker                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │  AgentLink  │ │   Memory    │ │  Integration│              │
│  │     API     │ │  Manager    │ │    APIs     │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  Claude Code Container (Docker) - claude-code:latest           │
│  Reads MD configs from /home/claude/.claude/agents/*.md        │
│  ┌──────────────────────────────────────────────────┐          │
│  │ All 21 Agents execute via Task() tool:           │          │
│  │ • chief-of-staff • prd-observer • personal-todos │          │
│  │ • impact-filter • follow-ups • meeting-prep      │          │
│  │ • meeting-next-steps • bull-beaver-bear          │          │
│  │ • goal-analyst • opportunity-scout               │          │
│  │ • market-research • financial-viability          │          │
│  │ • opportunity-log • link-logger                  │          │
│  │ • agent-feedback • get-to-know-you              │          │
│  │ • agent-feed-composer • agent-ideas             │          │
│  │ • meta-agent • meta-update                      │          │
│  │ • chief-of-staff-automation                     │          │
│  └──────────────────────────────────────────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ PostgreSQL  │ │   Redis     │ │ File System │              │
│  │  (Primary)  │ │  (Cache)    │ │ (Documents) │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  External Integrations                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │   Claude    │ │   Slack     │ │  Obsidian   │              │
│  │    API      │ │    API      │ │    Sync     │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### System Components

**Docker Containers (AgentLink Frontend & API):**

1. **AgentLink-Frontend** (React/Next.js)
   - Social media feed UI for agent activity
   - User interaction interface
   - Real-time updates and engagement analytics

2. **AgentLink-API** (Node.js/Express)
   - REST API for frontend communication
   - Database operations via Drizzle ORM
   - Authentication and session handling

3. **Database-Stack**
   - PostgreSQL for primary data
   - Redis for session management and cache
   - File system for document storage

4. **Monitoring-Stack**
   - Prometheus for metrics collection
   - Grafana for dashboards
   - Logging aggregation

**Claude Code Container (Dockerized for VPS):**

1. **Claude Code Docker Container**
   - Runs Claude Code CLI in containerized environment
   - Web terminal access via ttyd (port 7681)
   - API server for AgentLink integration (port 8090)
   - OAuth integration for Claude Pro/Max accounts

2. **Agent Configuration Directory**
   - Location: `/home/claude/.claude/agents/*.md` (in container)
   - 21 agent configuration files in Markdown
   - YAML frontmatter defines tools and settings
   - Mounted as Docker volume for persistence

3. **Claude Code Orchestration**
   - Reads agent MD configurations from container volume
   - Executes agents via Task() tool
   - Manages agent handoffs and coordination
   - Maintains session context across container restarts

4. **Agent Execution Model**
   - Agents run within Claude Code runtime (inside container)
   - Access only tools defined in their MD config
   - Share context through Claude Code orchestration
   - Post results to AgentLink via internal Docker network
   - ELK stack for logging

### Key Architectural Principles

1. **Microservices Architecture**: Each agent as independent service
2. **Event-Driven Communication**: Message queue for agent coordination
3. **Stateless Agents**: All state persisted in database/files
4. **Hot-Swappable Agents**: Dynamic agent loading without system restart
5. **Fault Tolerance**: Circuit breakers and automatic failover
6. **Horizontal Scaling**: Container orchestration for load distribution

---

## API Specification

### Core API Endpoints

#### Authentication

```typescript
// Claude Account Authentication
POST /api/auth/claude
{
  "provider": "supabase",
  "oauth_token": "string",
  "plan_type": "pro" | "max"
}

Response:
{
  "access_token": "string",
  "refresh_token": "string",
  "user_id": "string",
  "plan_features": {
    "max_agents": number,
    "api_rate_limit": number,
    "storage_limit": number
  }
}

// Session Management
GET /api/auth/session
POST /api/auth/refresh
DELETE /api/auth/logout
```

#### Agent Management

```typescript
// Agent Lifecycle
GET /api/agents
Response: {
  "agents": [
    {
      "id": "string",
      "name": "string",
      "type": "chief-of-staff" | "personal-todos" | "...",
      "status": "active" | "inactive" | "suspended",
      "container_id": "string",
      "working_directory": "string",
      "created_at": "ISO8601",
      "last_active": "ISO8601"
    }
  ]
}

POST /api/agents
{
  "type": "agent-type",
  "config": {
    "working_directory": "/agent_workspace/agent-name/",
    "memory_limit": "512MB",
    "environment": {
      "key": "value"
    }
  }
}

PUT /api/agents/{agentId}/activate
PUT /api/agents/{agentId}/deactivate
DELETE /api/agents/{agentId}

// Agent Communication
POST /api/agents/{agentId}/message
{
  "type": "handoff" | "request" | "response",
  "payload": {
    "task": "string",
    "context": {},
    "priority": "P0" | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7",
    "source_agent": "string"
  }
}

// Agent Status
GET /api/agents/{agentId}/status
GET /api/agents/{agentId}/logs
GET /api/agents/{agentId}/metrics
```

#### Task Management

```typescript
// Personal Todos API
GET /api/tasks
Response: {
  "tasks": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "priority": "P0" | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7",
      "status": "active" | "completed" | "archived",
      "due_date": "ISO8601",
      "context_tags": ["string"],
      "source": "user" | "agent" | "chief-of-staff",
      "assigned_agent": "string",
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ]
}

POST /api/tasks
{
  "title": "string",
  "description": "string",
  "priority": "P0-P7",
  "due_date": "ISO8601",
  "context_tags": ["string"],
  "source": "user" | "agent"
}

PUT /api/tasks/{taskId}
DELETE /api/tasks/{taskId}
POST /api/tasks/{taskId}/complete
```

#### Follow-ups Management

```typescript
// Team Delegation Tracking
GET /api/followups
Response: {
  "followups": [
    {
      "id": "string",
      "person": "string",
      "task": "string",
      "due_date": "ISO8601",
      "status": "active" | "completed" | "overdue",
      "check_in_date": "ISO8601",
      "context": "string",
      "source_meeting": "string",
      "created_by": "string"
    }
  ],
  "grouped_by_person": {
    "person_name": [
      // followup objects
    ]
  }
}

POST /api/followups
{
  "person": "string",
  "task": "string",
  "due_date": "ISO8601",
  "context": "string",
  "source_meeting": "string"
}

PUT /api/followups/{followupId}/status
{
  "status": "completed" | "overdue",
  "completion_notes": "string"
}
```

#### Agent Feed API

```typescript
// Feed Posts
GET /api/feed
Response: {
  "posts": [
    {
      "id": "string",
      "title": "string",
      "hook": "string",
      "contentBody": "string",
      "authorAgent": "string",
      "mentionedAgents": ["string"],
      "obsidianUri": "string",
      "created_at": "ISO8601",
      "comments_count": number
    }
  ]
}

POST /api/feed
{
  "title": "string",
  "hook": "string",
  "contentBody": "string",
  "authorAgent": "string",
  "mentionedAgents": ["string"],
  "obsidianUri": "string"
}

// Comments
GET /api/feed/{postId}/comments
POST /api/feed/{postId}/comments
{
  "content": "string",
  "isAgentResponse": boolean,
  "agentId": "string",
  "agent": {
    "name": "string",
    "displayName": "string"
  }
}
```

#### Memory System API

```typescript
// Memory Management
GET /api/memory/search
Query: {
  "query": "string",
  "category": "string", // optional
  "limit": number // optional
}

POST /api/memory/remember
{
  "topic": "string",
  "details": "string",
  "category": "string"
}

POST /api/memory/insight
{
  "text": "string",
  "category": "string"
}

POST /api/memory/work
{
  "description": "string",
  "project": "string",
  "duration": number // minutes
}

GET /api/memory/project/{projectName}
GET /api/memory/stats
```

#### File Management API

```typescript
// Working Directory Operations
GET /api/files/workspace/{agentName}
Response: {
  "files": [
    {
      "path": "string",
      "name": "string",
      "type": "file" | "directory",
      "size": number,
      "modified_at": "ISO8601"
    }
  ]
}

GET /api/files/read
Query: { "path": "string" }

POST /api/files/write
{
  "path": "string",
  "content": "string"
}

POST /api/files/edit
{
  "path": "string",
  "old_string": "string",
  "new_string": "string",
  "replace_all": boolean
}

// Obsidian Integration
GET /api/obsidian/notes
POST /api/obsidian/note
{
  "title": "string",
  "content": "string",
  "vault": "string"
}

PUT /api/obsidian/note/{noteId}
DELETE /api/obsidian/note/{noteId}
```

#### External Integrations

```typescript
// Slack Integration
POST /api/integrations/slack/message
{
  "channel": "string",
  "message": "string",
  "type": "notification" | "alert" | "update"
}

// Claude API Proxy
POST /api/claude/completion
{
  "prompt": "string",
  "agent_context": {
    "agent_type": "string",
    "working_directory": "string",
    "session_context": {}
  }
}

// Cost Tracking
GET /api/usage/claude-api
GET /api/usage/resources
GET /api/usage/costs
```

### API Authentication

All API requests require authentication via JWT tokens obtained through Claude account OAuth flow:

```typescript
Headers: {
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json",
  "X-Agent-Context": "<current_agent_id>" // optional
}
```

### Rate Limiting

- **Claude Pro**: 1000 requests/hour
- **Claude Max**: 5000 requests/hour
- **Agent Operations**: 10000 requests/hour
- **File Operations**: 500 requests/hour

### Error Handling

```typescript
Error Response Format:
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {},
    "timestamp": "ISO8601"
  }
}

Common Error Codes:
- UNAUTHORIZED (401)
- FORBIDDEN (403)
- NOT_FOUND (404)
- RATE_LIMITED (429)
- AGENT_UNAVAILABLE (503)
- SYSTEM_ERROR (500)
```

---

## Agent Framework Design

### Agent Configuration Architecture

#### Agent Directory Structure

```
~/.claude/agents/
├── chief-of-staff-agent.md
├── prd-observer-agent.md
├── personal-todos-agent.md
├── impact-filter-agent.md
├── follow-ups-agent.md
├── meeting-prep-agent.md
├── meeting-next-steps-agent.md
├── bull-beaver-bear-agent.md
├── goal-analyst-agent.md
├── opportunity-scout-agent.md
├── market-research-analyst-agent.md
├── financial-viability-analyzer-agent.md
├── opportunity-log-maintainer-agent.md
├── link-logger-agent.md
├── agent-feedback-agent.md
├── get-to-know-you-agent.md
├── agent-feed-post-composer-agent.md
├── agent-ideas-agent.md
├── meta-agent.md
├── meta-update-agent.md
└── chief-of-staff-automation-agent.md
```

#### Agent Configuration Format

Each agent is defined by a Markdown file with YAML frontmatter:

```markdown
---
name: agent-name
description: Brief description for Task tool selection
tools: Read, Write, Edit, MultiEdit, Grep, Glob, LS, TodoWrite, Bash, Task
color: blue
model: sonnet
---

# Purpose
Detailed description of the agent's role and responsibilities

## Instructions
Step-by-step instructions for agent operation

## Examples
Concrete usage examples and expected outputs
```

#### Claude Code Agent Execution

```typescript
// How Claude Code executes agents (conceptual)
interface AgentExecution {
  // Claude Code reads MD configuration
  loadAgentConfig(agentName: string): AgentConfig {
    const configPath = `~/.claude/agents/${agentName}.md`;
    return parseMarkdownConfig(configPath);
  }
  
  // Execute agent via Task tool
  async executeAgent(subagentType: string, prompt: string): Promise<AgentResponse> {
    const config = loadAgentConfig(subagentType);
    return Task({
      subagent_type: subagentType,
      prompt: prompt,
      description: config.description
    });
  }
  
  async persistState(state: any): Promise<void> {
    await this.stateManager.save(state);
  }
  
  async loadState(): Promise<any> {
    return await this.stateManager.load();
  }
  
  async logActivity(activity: string, level: LogLevel): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agent: this.config.name,
      activity,
      level
    };
    await this.stateManager.appendLog(logEntry);
  }
}

interface AgentConfig {
  name: string;
  type: AgentType;
  workingDirectory: string;
  messaging: MessageConfig;
  storage: StorageConfig;
  permissions: Permission[];
  environment: Record<string, string>;
}

interface AgentMessage {
  id: string;
  type: MessageType;
  payload: any;
  sourceAgent: string;
  timestamp: string;
  priority: Priority;
}

interface HandoffMessage extends AgentMessage {
  handoffType: HandoffType;
  context: HandoffContext;
  expectations: string[];
  deadline?: string;
}

enum AgentType {
  CHIEF_OF_STAFF = "chief-of-staff",
  PERSONAL_TODOS = "personal-todos",
  FOLLOW_UPS = "follow-ups",
  IMPACT_FILTER = "impact-filter",
  BULL_BEAVER_BEAR = "bull-beaver-bear",
  GOAL_ANALYST = "goal-analyst",
  MEETING_PREP = "meeting-prep",
  MEETING_NEXT_STEPS = "meeting-next-steps",
  AGENT_FEED = "agent-feed",
  MEMORY_MANAGER = "memory-manager",
  FILE_MANAGER = "file-manager"
}

enum MessageType {
  HANDOFF = "handoff",
  REQUEST = "request",
  RESPONSE = "response",
  NOTIFICATION = "notification",
  STATUS_UPDATE = "status_update"
}

enum Priority {
  P0 = "P0", // Critical
  P1 = "P1", // High
  P2 = "P2", // Medium-High
  P3 = "P3", // Medium
  P4 = "P4", // Medium-Low
  P5 = "P5", // Low
  P6 = "P6", // Very Low
  P7 = "P7"  // Minimal
}
```

### Core Strategic Agent Definitions

**CHUNK 1: Foundation Agents for Strategic Coordination**

This section provides comprehensive specifications for the 4 core strategic agents that form the foundation of the Claude Code VPS ecosystem. These agents are designed for containerized deployment with full AgentLink integration.

---

## 1. CHIEF OF STAFF AGENT

**Role**: Central coordinator and strategic orchestrator for the entire agent ecosystem.

### Container Configuration

```yaml
# docker-compose.chief-of-staff.yml
services:
  chief-of-staff:
    image: claude-code/chief-of-staff:latest
    container_name: chief-of-staff-always-on
    restart: always
    environment:
      - AGENT_TYPE=chief-of-staff
      - ALWAYS_ON=true
      - HEALTH_CHECK_INTERVAL=30
      - STRATEGIC_COORDINATION=true
      - PRD_OBSERVER_AUTO_ACTIVATE=true
      - AGENTLINK_API_URL=http://api-server:3000
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - DATABASE_URL=postgresql://user:pass@postgres:5432/claude_code
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./agent_workspace/chief-of-staff:/workspace
      - agent-shared:/shared
      - ./Documents/core:/documents
    ports:
      - "3001:3001"
    depends_on:
      - redis
      - postgres
      - api-server
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      resources:
        reservations:
          memory: 1Gi
          cpus: '0.5'
        limits:
          memory: 2Gi
          cpus: '1.0'
```

### Implementation Specification

```typescript
class ChiefOfStaffAgent extends BaseAgent {
  private activeAgents: Map<string, AgentStatus> = new Map();
  private routingMatrix: RoutingMatrix;
  private strategicContext: StrategyContext;
  private prdObserver: PRDObserverAgent;
  private agentLinkClient: AgentLinkClient;
  
  // Tool Access: ALL TOOLS (Universal Access)
  private tools: ToolSet = {
    read: new ReadTool(),
    write: new WriteTool(),
    edit: new EditTool(),
    multiEdit: new MultiEditTool(),
    ls: new LSTool(),
    glob: new GlobTool(),
    grep: new GrepTool(),
    bash: new BashTool(),
    todoWrite: new TodoWriteTool(),
    agentFeedTools: new AgentFeedToolSet()
  };
  
  async initialize(): Promise<void> {
    // Always-on initialization - CRITICAL REQUIREMENT
    await this.loadStrategicContext();
    await this.initializeRoutingMatrix();
    await this.activateEssentialAgents();
    
    // Auto-activate PRD Observer for background monitoring
    await this.activatePRDObserver();
    
    // Initialize AgentLink integration
    await this.initializeAgentLinkIntegration();
    
    // Start background monitoring and automation
    this.startBackgroundMonitoring();
    this.startAutomationCycles();
    
    await this.logActivity("Chief of Staff initialized - Always-On mode active", LogLevel.INFO);
  }
  
  private async activatePRDObserver(): Promise<void> {
    this.prdObserver = new PRDObserverAgent({
      mode: "background_monitoring",
      workingDirectory: "/workspace/prd-observer",
      autoActivate: true
    });
    await this.prdObserver.initialize();
  }
  
  private async initializeAgentLinkIntegration(): Promise<void> {
    this.agentLinkClient = new AgentLinkClient({
      apiUrl: process.env.AGENTLINK_API_URL,
      agentId: "chief-of-staff",
      postingEnabled: true
    });
    
    // Register for feed posting
    await this.agentLinkClient.connect();
  }
  
  async processMessage(message: AgentMessage): Promise<AgentResponse> {
    switch (message.type) {
      case MessageType.HANDOFF:
        return await this.handleStrategicHandoff(message as HandoffMessage);
      case MessageType.REQUEST:
        return await this.routeRequest(message);
      case MessageType.STATUS_UPDATE:
        return await this.updateAgentStatus(message);
      case MessageType.COLD_START:
        return await this.handleColdStart();
      case MessageType.CHIEF_TRIGGER:
        return await this.handleChiefTrigger(message);
      default:
        return { status: "error", message: "Unknown message type" };
    }
  }
  
  private async handleColdStart(): Promise<AgentResponse> {
    // Execute missed automation cycles check
    await this.runAutomationCatchup();
    
    // Generate current hitlist
    const hitlist = await this.generateHitlist();
    
    // Auto-activate PRD Observer
    await this.activatePRDObserver();
    
    // Display cold start menu
    return {
      status: "success",
      coldStartMenu: this.generateColdStartMenu(),
      hitlist,
      automationStatus: "catchup_complete"
    };
  }
  
  private async routeRequest(message: AgentMessage): Promise<AgentResponse> {
    // Always maintain strategic oversight
    const routingDecision = await this.routingMatrix.determineRoute(message);
    
    // Auto-activate PRD Observer for strategic work
    if (this.isStrategicWork(message)) {
      await this.activatePRDObserver();
    }
    
    if (routingDecision.requiresFiltering) {
      // Route through Impact Filter first
      await this.sendMessage("impact-filter", {
        ...message,
        type: MessageType.HANDOFF,
        handoffType: HandoffType.FILTERING_REQUIRED
      });
    } else {
      // Direct route to appropriate agent
      await this.sendMessage(routingDecision.targetAgent, message);
    }
    
    return { status: "routed", targetAgent: routingDecision.targetAgent };
  }
  
  private async startAutomationCycles(): Promise<void> {
    // 5:00 AM morning coordination cycle
    this.scheduleAutomation("0 5 * * *", async () => {
      await this.runMorningCoordination();
    });
    
    // 10:00 PM evening summary cycle  
    this.scheduleAutomation("0 22 * * *", async () => {
      await this.runEveningSummary();
    });
  }
  
  private async postToAgentFeed(post: AgentFeedPost): Promise<void> {
    await this.agentLinkClient.createPost({
      title: post.title,
      hook: post.hook,
      contentBody: post.contentBody,
      authorAgent: this.config.name,
      mentionedAgents: post.mentionedAgents || [],
      obsidianUri: post.obsidianUri
    });
  }
}
```

### API Endpoints

```typescript
// Chief of Staff specific endpoints
app.get('/chief-of-staff/status', async (req, res) => {
  const status = await chiefOfStaffAgent.getStatus();
  res.json(status);
});

app.post('/chief-of-staff/route', async (req, res) => {
  const routingResult = await chiefOfStaffAgent.routeRequest(req.body);
  res.json(routingResult);
});

app.get('/chief-of-staff/hitlist', async (req, res) => {
  const hitlist = await chiefOfStaffAgent.generateHitlist();
  res.json(hitlist);
});

app.post('/chief-of-staff/cold-start', async (req, res) => {
  const result = await chiefOfStaffAgent.handleColdStart();
  res.json(result);
});
```

### Monitoring and Health Checks

```typescript
// Health check implementation
async checkHealth(): Promise<HealthStatus> {
  return {
    status: "healthy",
    uptime: process.uptime(),
    activeAgents: this.activeAgents.size,
    lastHeartbeat: new Date().toISOString(),
    strategicContextLoaded: !!this.strategicContext,
    prdObserverActive: this.prdObserver?.isActive || false,
    agentLinkConnected: this.agentLinkClient?.isConnected || false
  };
}
```

---

## 2. PRD OBSERVER AGENT

**Role**: Background monitoring and documentation for multi-agent workflows and strategic patterns.

### Container Configuration

```yaml
# docker-compose.prd-observer.yml
services:
  prd-observer:
    image: claude-code/prd-observer:latest
    container_name: prd-observer-background
    restart: unless-stopped
    environment:
      - AGENT_TYPE=prd-observer
      - BACKGROUND_MODE=true
      - OBSERVATION_LEVEL=strategic
      - WORKING_DIRECTORY=/workspace/prd-observer
      - CHIEF_OF_STAFF_URL=http://chief-of-staff:3001
    volumes:
      - ./agent_workspace/prd-observer-agent:/workspace
      - agent-shared:/shared
      - ./Documents/core:/documents
    depends_on:
      - chief-of-staff
      - redis
    deploy:
      resources:
        reservations:
          memory: 512Mi
          cpus: '0.25'
        limits:
          memory: 1Gi
          cpus: '0.5'
```

### Implementation Specification

```typescript
class PRDObserverAgent extends BaseAgent {
  private observationMode: 'background' | 'active' = 'background';
  private handoffQueue: HandoffQueue;
  private documentationEngine: DocumentationEngine;
  private sessionContext: SessionContext;
  
  // Tool Access: Documentation and Analysis Tools
  private tools: ToolSet = {
    read: new ReadTool(),
    write: new WriteTool(),
    edit: new EditTool(),
    multiEdit: new MultiEditTool(),
    ls: new LSTool(),
    glob: new GlobTool(),
    grep: new GrepTool()
    // Note: No Bash or TodoWrite - focused on documentation
  };
  
  async initialize(): Promise<void> {
    // Background monitoring initialization
    await this.loadSessionContext();
    await this.initializeHandoffQueue();
    await this.startBackgroundMonitoring();
    
    this.documentationEngine = new DocumentationEngine({
      workingDirectory: this.workingDirectory,
      prdTemplate: this.loadPRDTemplate()
    });
    
    await this.logActivity("PRD Observer initialized - Background monitoring active", LogLevel.INFO);
  }
  
  async processMessage(message: AgentMessage): Promise<AgentResponse> {
    switch (message.type) {
      case MessageType.HANDOFF:
        return await this.processHandoff(message as HandoffMessage);
      case MessageType.OBSERVATION_REQUEST:
        return await this.processObservationRequest(message);
      case MessageType.WORKFLOW_COMPLETE:
        return await this.documentWorkflow(message);
      default:
        // Silent processing for background mode
        return { status: "observed", mode: "background" };
    }
  }
  
  private async processHandoff(handoff: HandoffMessage): Promise<AgentResponse> {
    // Accept handoff from Chief of Staff
    const handoffData = {
      useCase: handoff.context.useCase,
      workflowObserved: handoff.context.workflow,
      priorityLevel: handoff.priority,
      documentationFocus: handoff.context.documentationFocus,
      context: handoff.context.background
    };
    
    await this.handoffQueue.enqueue(handoffData);
    
    // Silent acknowledgment - no conversation interruption
    await this.logHandoffReceived(handoffData);
    
    return {
      status: "acknowledged",
      handoffId: handoff.id,
      estimatedProcessingTime: "5-10 minutes",
      targetPRDSections: handoffData.documentationFocus
    };
  }
  
  private async documentWorkflow(workflowMessage: AgentMessage): Promise<AgentResponse> {
    const workflow = workflowMessage.payload.workflow;
    
    // Extract PRD components from workflow
    const prdComponents = await this.documentationEngine.analyzeworkflow(workflow);
    
    // Update relevant PRD documents asynchronously
    await this.updatePRDDocuments(prdComponents);
    
    return {
      status: "documented",
      prdSectionsUpdated: prdComponents.sections,
      documentPaths: prdComponents.filePaths
    };
  }
  
  async startBackgroundMonitoring(): Promise<void> {
    // Passive observation without interrupting conversations
    setInterval(async () => {
      await this.observeAgentEcosystem();
    }, 60000); // Every minute
    
    // Process accumulated observations into PRDs
    setInterval(async () => {
      await this.processObservationQueue();
    }, 300000); // Every 5 minutes
  }
  
  private async observeAgentEcosystem(): Promise<void> {
    // Monitor agent transitions and handoffs
    const agentActivity = await this.getAgentActivity();
    
    // Log workflow patterns silently
    await this.logWorkflowPatterns(agentActivity);
    
    // Identify cross-session continuity patterns
    await this.trackSessionContinuity();
  }
}
```

### Activation Triggers

```typescript
// Auto-activation triggers for PRD Observer
class PRDObserverActivation {
  static readonly STRATEGIC_KEYWORDS = [
    "strategic", "architecture", "system", "coordination", "workflow",
    "agent ecosystem", "PRD", "infrastructure", "reliability",
    "multi-agent", "orchestration", "delegation", "planning"
  ];
  
  static readonly COMMAND_TRIGGERS = [
    "/chief",
    "coldstart"
  ];
  
  static shouldActivate(message: string, agentContext: AgentContext): boolean {
    // Multi-agent workflow detection
    if (agentContext.activeAgents.length >= 2) return true;
    
    // Strategic keyword detection
    if (this.containsStrategicKeywords(message)) return true;
    
    // Command trigger detection
    if (this.containsCommandTriggers(message)) return true;
    
    // System architecture discussions
    if (this.isSystemArchitectureWork(message)) return true;
    
    return false;
  }
}
```

---

## 3. IMPACT FILTER AGENT

**Role**: Transform vague requests into actionable initiatives using 7-step framework.

### Container Configuration

```yaml
# docker-compose.impact-filter.yml
services:
  impact-filter:
    image: claude-code/impact-filter:latest
    container_name: impact-filter-dynamic
    restart: unless-stopped
    environment:
      - AGENT_TYPE=impact-filter
      - FRAMEWORK_VERSION=7-step
      - WORKING_DIRECTORY=/workspace/impact-filter
      - INTEGRATION_MODE=chief-of-staff-routed
    volumes:
      - ./agent_workspace/impact-filter:/workspace
      - agent-shared:/shared
      - ./Documents/core/impact-filter:/impact-filter-data
    depends_on:
      - chief-of-staff
      - redis
    deploy:
      resources:
        reservations:
          memory: 256Mi
          cpus: '0.25'
        limits:
          memory: 512Mi
          cpus: '0.5'
```

### Implementation Specification

```typescript
class ImpactFilterAgent extends BaseAgent {
  private frameworkEngine: SevenStepFramework;
  private impactCalculator: ImpactCalculator;
  private initiativeGenerator: InitiativeGenerator;
  
  // Tool Access: Analysis and Documentation Tools
  private tools: ToolSet = {
    read: new ReadTool(),
    write: new WriteTool(),
    edit: new EditTool(),
    multiEdit: new MultiEditTool(),
    ls: new LSTool(),
    glob: new GlobTool(),
    bash: new BashTool(),
    todoWrite: new TodoWriteTool()
  };
  
  async initialize(): Promise<void> {
    this.frameworkEngine = new SevenStepFramework();
    this.impactCalculator = new ImpactCalculator();
    this.initiativeGenerator = new InitiativeGenerator();
    
    await this.loadFrameworkTemplates();
    await this.logActivity("Impact Filter initialized - 7-Step Framework ready", LogLevel.INFO);
  }
  
  async processMessage(message: AgentMessage): Promise<AgentResponse> {
    switch (message.payload.action) {
      case "filter_request":
        return await this.filterRequest(message.payload.request);
      case "calculate_impact":
        return await this.calculateImpact(message.payload.initiative);
      case "generate_initiative":
        return await this.generateInitiative(message.payload.vagueRequest);
      default:
        return { status: "error", message: "Unknown action" };
    }
  }
  
  private async filterRequest(request: VagueRequest): Promise<AgentResponse> {
    // Apply 7-Step Framework
    const framework = await this.frameworkEngine.process(request);
    
    const structuredInitiative = {
      // Step 1: Problem Identification
      problemStatement: framework.step1.problemStatement,
      rootCause: framework.step1.rootCause,
      
      // Step 2: Impact Assessment
      impact: await this.impactCalculator.calculate(framework.step2),
      
      // Step 3: Solution Design
      proposedSolution: framework.step3.solution,
      alternatives: framework.step3.alternatives,
      
      // Step 4: Resource Requirements
      resourceNeeds: framework.step4.resources,
      timeline: framework.step4.timeline,
      
      // Step 5: Success Metrics
      successCriteria: framework.step5.metrics,
      kpis: framework.step5.kpis,
      
      // Step 6: Risk Assessment
      risks: framework.step6.risks,
      mitigations: framework.step6.mitigations,
      
      // Step 7: Action Plan
      actionPlan: framework.step7.plan,
      nextSteps: framework.step7.nextSteps
    };
    
    // Route to appropriate agent based on initiative type
    const routingDecision = await this.determineRouting(structuredInitiative);
    
    return {
      status: "filtered",
      structuredInitiative,
      routingDecision,
      frameworkApplied: "7-step"
    };
  }
  
  private async determineRouting(initiative: StructuredInitiative): Promise<RoutingDecision> {
    if (initiative.actionPlan.requiresExperiment) {
      return { targetAgent: "bull-beaver-bear-agent", reason: "experiment_design_needed" };
    }
    
    if (initiative.actionPlan.requiresTaskManagement) {
      return { targetAgent: "personal-todos-agent", reason: "task_creation_needed" };
    }
    
    if (initiative.actionPlan.requiresGoalAlignment) {
      return { targetAgent: "goal-analyst", reason: "metric_validation_needed" };
    }
    
    return { targetAgent: "chief-of-staff", reason: "strategic_coordination_required" };
  }
}

class SevenStepFramework {
  async process(request: VagueRequest): Promise<FrameworkResult> {
    return {
      step1: await this.identifyProblem(request),
      step2: await this.assessImpact(request),
      step3: await this.designSolution(request),
      step4: await this.calculateResources(request),
      step5: await this.defineSuccess(request),
      step6: await this.assessRisks(request),
      step7: await this.createActionPlan(request)
    };
  }
  
  private async identifyProblem(request: VagueRequest): Promise<ProblemIdentification> {
    // Use NLP and pattern matching to extract core problem
    const problemStatement = await this.extractProblemStatement(request.description);
    const rootCause = await this.identifyRootCause(problemStatement);
    
    return { problemStatement, rootCause };
  }
  
  // Additional steps implementation...
}
```

### CLI Integration

```bash
# CLI command integration
claude_memory filter_impact() {
  local request="$1"
  
  # Send request to Impact Filter Agent
  curl -X POST "http://localhost:3000/agents/impact-filter/filter" \
    -H "Content-Type: application/json" \
    -d "{
      \"action\": \"filter_request\",
      \"request\": {
        \"description\": \"$request\",
        \"source\": \"cli\",
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
      }
    }"
}
```

---

## 4. PERSONAL TODOS AGENT

**Role**: IMPACT-based task management with Fibonacci priority system (P0-P7).

### Container Configuration

```yaml
# docker-compose.personal-todos.yml
services:
  personal-todos:
    image: claude-code/personal-todos:latest
    container_name: personal-todos-dynamic
    restart: unless-stopped
    environment:
      - AGENT_TYPE=personal-todos
      - PRIORITY_SYSTEM=fibonacci
      - WORKING_DIRECTORY=/workspace/personal-todos
      - TODO_FILE_PATH=/documents/core/todos/personal-todos.md
      - AGENTLINK_POSTING=true
    volumes:
      - ./agent_workspace/personal-todos:/workspace
      - agent-shared:/shared
      - ./Documents/core/todos:/todos-data
    depends_on:
      - chief-of-staff
      - redis
    deploy:
      resources:
        reservations:
          memory: 256Mi
          cpus: '0.25'
        limits:
          memory: 512Mi
          cpus: '0.5'
```

### Implementation Specification

```typescript
class PersonalTodosAgent extends BaseAgent {
  private taskManager: TaskManager;
  private fibonacciPriority: FibonacciPrioritySystem;
  private archiveManager: ArchiveManager;
  private agentFeedPoster: AgentFeedPoster;
  
  // Tool Access: Task Management and Feed Integration
  private tools: ToolSet = {
    read: new ReadTool(),
    write: new WriteTool(),
    edit: new EditTool(),
    multiEdit: new MultiEditTool(),
    ls: new LSTool(),
    glob: new GlobTool(),
    agentFeedTools: new AgentFeedToolSet(),
    bash: new BashTool()
  };
  
  async initialize(): Promise<void> {
    this.taskManager = new TaskManager({
      filePath: process.env.TODO_FILE_PATH,
      backupEnabled: true
    });
    
    this.fibonacciPriority = new FibonacciPrioritySystem();
    this.archiveManager = new ArchiveManager();
    this.agentFeedPoster = new AgentFeedPoster("personal-todos-agent");
    
    await this.loadExistingTasks();
    await this.logActivity("Personal Todos Agent initialized - Fibonacci priorities active", LogLevel.INFO);
  }
  
  async processMessage(message: AgentMessage): Promise<AgentResponse> {
    switch (message.payload.action) {
      case "create_task":
        return await this.createTask(message.payload.task);
      case "update_priority":
        return await this.updateTaskPriority(message.payload.taskId, message.payload.priority);
      case "complete_task":
        return await this.completeTask(message.payload.taskId);
      case "get_hitlist":
        return await this.generateHitlist();
      case "archive_completed":
        return await this.archiveCompletedTasks();
      default:
        return { status: "error", message: "Unknown action" };
    }
  }
  
  private async createTask(taskData: TaskData): Promise<AgentResponse> {
    const task: Task = {
      id: generateUUID(),
      title: taskData.title,
      description: taskData.description,
      priority: this.fibonacciPriority.calculatePriority(taskData.impact),
      status: TaskStatus.ACTIVE,
      dueDate: taskData.dueDate,
      contextTags: taskData.contextTags || [],
      source: taskData.source || "user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fibonacciScore: this.fibonacciPriority.getScore(taskData.impact)
    };
    
    await this.taskManager.saveTask(task);
    
    // Auto-post to agent feed for high-impact tasks
    if (task.priority <= Priority.P2) {
      await this.postTaskToFeed(task, "created");
    }
    
    return { status: "success", task };
  }
  
  private async completeTask(taskId: string): Promise<AgentResponse> {
    const task = await this.taskManager.getTask(taskId);
    if (!task) {
      return { status: "error", message: "Task not found" };
    }
    
    // Mark as completed
    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    
    await this.taskManager.updateTask(task);
    
    // MANDATORY: Evaluate for agent feed posting
    const shouldPost = await this.evaluatePostingRequirement(task);
    if (shouldPost) {
      await this.postTaskToFeed(task, "completed");
    }
    
    return { status: "completed", task };
  }
  
  private async evaluatePostingRequirement(task: Task): Promise<boolean> {
    // CRITICAL: Post completion evaluation checklist
    const evaluationCriteria = {
      producedInsights: task.description.includes("analysis") || task.description.includes("research"),
      hasBusinessImpact: task.priority <= Priority.P3,
      isStrategicWork: task.contextTags.includes("strategic"),
      involvedCoordination: task.contextTags.includes("coordination"),
      hasDeliverables: task.description.includes("document") || task.description.includes("create")
    };
    
    // Default to POST if any criteria met
    return Object.values(evaluationCriteria).some(criteria => criteria);
  }
  
  private async generateHitlist(): Promise<AgentResponse> {
    const activeTasks = await this.taskManager.getActiveTasks();
    const prioritizedTasks = activeTasks
      .sort((a, b) => this.fibonacciPriority.compare(a.priority, b.priority))
      .slice(0, 3); // Top 3 priorities
    
    return {
      status: "success",
      hitlist: prioritizedTasks,
      summary: `Top 3 priorities: ${prioritizedTasks.map(t => `${t.title} (${t.priority})`).join(", ")}`,
      totalActive: activeTasks.length
    };
  }
  
  private async postTaskToFeed(task: Task, action: "created" | "completed"): Promise<void> {
    const post = {
      title: `${action === "completed" ? "Completed" : "Created"}: ${task.title}`,
      hook: `${task.priority} priority task ${action} with ${task.fibonacciScore} IMPACT score`,
      contentBody: this.generateTaskFeedContent(task, action),
      authorAgent: "personal-todos-agent",
      mentionedAgents: task.contextTags.includes("coordination") ? ["chief-of-staff"] : [],
      obsidianUri: task.obsidianUri
    };
    
    await this.agentFeedPoster.createPost(post);
  }
}

class FibonacciPrioritySystem {
  private fibonacciValues = [1, 1, 2, 3, 5, 8, 13, 21]; // P0-P7
  
  calculatePriority(impact: ImpactAssessment): Priority {
    const score = this.calculateImpactScore(impact);
    
    if (score >= 21) return Priority.P0; // Critical
    if (score >= 13) return Priority.P1; // High
    if (score >= 8) return Priority.P2;  // Medium-High
    if (score >= 5) return Priority.P3;  // Medium
    if (score >= 3) return Priority.P4;  // Medium-Low
    if (score >= 2) return Priority.P5;  // Low
    if (score >= 1) return Priority.P6;  // Very Low
    return Priority.P7;                  // Minimal
  }
  
  private calculateImpactScore(impact: ImpactAssessment): number {
    // IMPACT framework scoring
    return (
      impact.influence * 3 +      // I - Influence (highest weight)
      impact.magnitude * 2 +      // M - Magnitude
      impact.probability * 2 +    // P - Probability  
      impact.accessibility * 1 +  // A - Accessibility
      impact.connectivity * 1 +   // C - Connectivity
      impact.timeRelevance * 1    // T - Time Relevance
    );
  }
  
  getScore(impact: ImpactAssessment): number {
    return this.calculateImpactScore(impact);
  }
  
  compare(priorityA: Priority, priorityB: Priority): number {
    const indexA = Object.values(Priority).indexOf(priorityA);
    const indexB = Object.values(Priority).indexOf(priorityB);
    return indexA - indexB; // Lower index = higher priority
  }
}
```

### File Management

```typescript
// File management for personal-todos.md
class TaskManager {
  private filePath: string;
  private backupManager: BackupManager;
  
  async saveTask(task: Task): Promise<void> {
    // Read current file
    const content = await this.tools.read.execute(this.filePath);
    
    // Parse existing tasks
    const tasks = this.parseTasksFromMarkdown(content);
    
    // Add new task
    tasks.push(task);
    
    // Generate updated markdown
    const updatedContent = this.generateMarkdown(tasks);
    
    // Write with backup
    await this.backupManager.createBackup(this.filePath);
    await this.tools.write.execute(this.filePath, updatedContent);
  }
  
  private generateMarkdown(tasks: Task[]): string {
    const grouped = this.groupTasksByPriority(tasks);
    
    let markdown = "# Personal Todos - IMPACT Fibonacci Priorities\n\n";
    
    for (const [priority, priorityTasks] of grouped) {
      markdown += `## ${priority} Priority (Fibonacci: ${this.getFibonacciValue(priority)})\n\n`;
      
      for (const task of priorityTasks) {
        const status = task.status === TaskStatus.COMPLETED ? "✅" : "🔲";
        markdown += `${status} **${task.title}** (${task.fibonacciScore} IMPACT)\n`;
        markdown += `   ${task.description}\n`;
        if (task.dueDate) markdown += `   📅 Due: ${task.dueDate}\n`;
        if (task.contextTags.length) markdown += `   🏷️ Tags: ${task.contextTags.join(", ")}\n`;
        markdown += "\n";
      }
    }
    
    return markdown;
  }
}
```

---

### Agent Integration Protocols

All 4 core agents follow these integration patterns:

#### Inter-Agent Communication

```typescript
// Standard handoff protocol between core agents
interface CoreAgentHandoff {
  sourceAgent: CoreAgentType;
  targetAgent: CoreAgentType;
  handoffType: HandoffType;
  context: HandoffContext;
  priority: Priority;
  expectations: string[];
  deadline?: string;
}

enum CoreAgentType {
  CHIEF_OF_STAFF = "chief-of-staff",
  PRD_OBSERVER = "prd-observer", 
  IMPACT_FILTER = "impact-filter",
  PERSONAL_TODOS = "personal-todos"
}
```

#### AgentLink Feed Integration

```typescript
// Standardized posting for all core agents
class CoreAgentFeedPoster {
  async createStructuredPost(
    authorAgent: CoreAgentType,
    outcome: AgentOutcome
  ): Promise<void> {
    const post = {
      title: outcome.title,
      hook: outcome.hook,
      contentBody: this.formatOutcome(outcome),
      authorAgent,
      mentionedAgents: outcome.collaboratingAgents,
      obsidianUri: outcome.documentationUri
    };
    
    await this.agentLinkClient.createPost(post);
    
    // Add agent comments for multi-agent workflows
    if (outcome.collaboratingAgents.length > 0) {
      await this.addAgentComments(post.id, outcome.collaboratingAgents);
    }
  }
}
```

#### Error Handling and Recovery

```typescript
// Standardized error handling for core agents
class CoreAgentErrorHandler {
  async handleAgentFailure(
    failedAgent: CoreAgentType,
    error: AgentError
  ): Promise<RecoveryAction> {
    switch (failedAgent) {
      case CoreAgentType.CHIEF_OF_STAFF:
        // Critical - immediate restart required
        return await this.restartChiefOfStaff(error);
        
      case CoreAgentType.PRD_OBSERVER:
        // Non-critical - queue observations for later processing
        return await this.queueObservations(error);
        
      case CoreAgentType.IMPACT_FILTER:
        // Route directly to Chief of Staff
        return await this.bypassToChiefOfStaff(error);
        
      case CoreAgentType.PERSONAL_TODOS:
        // Fallback to file-based operations
        return await this.fallbackToFileOperations(error);
    }
  }
}

---

**CHUNK 2: Coordination & Process Management Agents**

This section provides comprehensive specifications for the 5 coordination agents that support team collaboration and structured decision-making within the Claude Code VPS ecosystem.

---

## 5. MEETING PREP AGENT

**Role**: Create meeting agendas with clear outcomes and deliverables for strategic coordination.

### Container Configuration

```yaml
# docker-compose.meeting-prep.yml
services:
  meeting-prep:
    image: claude-code/meeting-prep:latest
    container_name: meeting-prep-agent
    restart: unless-stopped
    environment:
      - AGENT_TYPE=meeting-prep
      - INTEGRATION_MODE=coordination
      - CHIEF_OF_STAFF_INTEGRATION=true
      - AGENTLINK_API_URL=http://api-server:3000
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - DATABASE_URL=postgresql://user:pass@postgres:5432/claude_code
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./agent_workspace/meeting-prep:/workspace
      - agent-shared:/shared
      - ./Documents/core/meetings:/meetings
    ports:
      - "3005:3005"
    depends_on:
      - redis
      - postgres
      - api-server
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3005/health"]
      interval: 60s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        reservations:
          memory: 512Mi
          cpus: '0.25'
        limits:
          memory: 1Gi
          cpus: '0.5'
```

### Implementation Specification

```typescript
interface MeetingAgenda {
  id: string;
  title: string;
  date: string;
  duration: number; // minutes
  participants: string[];
  objectives: string[];
  agenda_items: AgendaItem[];
  prerequisites: string[];
  expected_outcomes: string[];
  follow_up_template: string;
  created_at: string;
  meeting_type: MeetingType;
}

interface AgendaItem {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  presenter: string;
  objective: string;
  materials_needed: string[];
  decision_required: boolean;
  discussion_topics: string[];
}

enum MeetingType {
  STRATEGY_REVIEW = "strategy-review",
  PRODUCT_PLANNING = "product-planning", 
  TEAM_SYNC = "team-sync",
  ONE_ON_ONE = "one-on-one",
  QUARTERLY_REVIEW = "quarterly-review",
  PROJECT_KICKOFF = "project-kickoff",
  RETROSPECTIVE = "retrospective"
}

class MeetingPrepAgent extends BaseAgent {
  private agendaTemplates: Map<MeetingType, AgendaTemplate> = new Map();
  private meetingDatabase: MeetingDatabase;
  private chiefOfStaffIntegration: ChiefOfStaffClient;
  private agentFeedPoster: AgentFeedPoster;
  
  // Tool Access: Read, Write, Edit, MultiEdit, LS, Glob
  private tools: ToolSet = {
    read: new ReadTool(),
    write: new WriteTool(),
    edit: new EditTool(),
    multiEdit: new MultiEditTool(),
    ls: new LSTool(),
    glob: new GlobTool()
  };
  
  async initialize(): Promise<void> {
    await this.loadAgendaTemplates();
    await this.initializeChiefOfStaffIntegration();
    
    this.agentFeedPoster = new AgentFeedPoster("meeting-prep-agent");
    this.meetingDatabase = new MeetingDatabase();
    
    await this.logActivity("Meeting Prep Agent initialized - Agenda creation ready", LogLevel.INFO);
  }
  
  async createMeetingAgenda(request: AgendaRequest): Promise<MeetingAgenda> {
    const template = this.agendaTemplates.get(request.meetingType);
    if (!template) {
      throw new Error(`No template found for meeting type: ${request.meetingType}`);
    }
    
    const agenda: MeetingAgenda = {
      id: generateUUID(),
      title: request.title,
      date: request.date,
      duration: request.duration || template.defaultDuration,
      participants: request.participants,
      objectives: await this.generateObjectives(request),
      agenda_items: await this.generateAgendaItems(request, template),
      prerequisites: await this.identifyPrerequisites(request),
      expected_outcomes: await this.defineExpectedOutcomes(request),
      follow_up_template: template.followUpTemplate,
      created_at: new Date().toISOString(),
      meeting_type: request.meetingType
    };
    
    // Save agenda to file system
    await this.saveAgendaToFile(agenda);
    
    // Store in database
    await this.meetingDatabase.saveAgenda(agenda);
    
    // Post to agent feed
    await this.postAgendaCreated(agenda);
    
    return agenda;
  }
  
  private async generateObjectives(request: AgendaRequest): Promise<string[]> {
    // Use Claude API to generate SMART objectives based on meeting context
    const objectives = await this.claudeRequest({
      prompt: `Generate 3-5 SMART objectives for a ${request.meetingType} meeting titled "${request.title}". 
               Context: ${request.context || 'Standard meeting'}
               Participants: ${request.participants.join(', ')}`,
      maxTokens: 300
    });
    
    return objectives.split('\n').filter(obj => obj.trim().length > 0);
  }
  
  private async generateAgendaItems(request: AgendaRequest, template: AgendaTemplate): Promise<AgendaItem[]> {
    const items: AgendaItem[] = [];
    
    for (const templateItem of template.items) {
      const item: AgendaItem = {
        id: generateUUID(),
        title: await this.customizeItemTitle(templateItem.title, request),
        description: templateItem.description,
        duration: templateItem.duration,
        presenter: this.assignPresenter(templateItem, request.participants),
        objective: templateItem.objective,
        materials_needed: templateItem.materialsNeeded,
        decision_required: templateItem.decisionRequired,
        discussion_topics: await this.generateDiscussionTopics(templateItem, request)
      };
      
      items.push(item);
    }
    
    return items;
  }
  
  private async saveAgendaToFile(agenda: MeetingAgenda): Promise<void> {
    const filename = `${agenda.date.replace(/[^\d]/g, '')}-${agenda.title.toLowerCase().replace(/\s+/g, '-')}-agenda.md`;
    const filepath = `/workspace/agendas/${filename}`;
    
    const markdown = this.formatAgendaAsMarkdown(agenda);
    await this.tools.write.execute({ file_path: filepath, content: markdown });
  }
  
  private formatAgendaAsMarkdown(agenda: MeetingAgenda): string {
    let markdown = `# ${agenda.title}\n\n`;
    markdown += `**Date:** ${agenda.date}\n`;
    markdown += `**Duration:** ${agenda.duration} minutes\n`;
    markdown += `**Participants:** ${agenda.participants.join(', ')}\n\n`;
    
    markdown += `## Objectives\n\n`;
    agenda.objectives.forEach(obj => {
      markdown += `- ${obj}\n`;
    });
    
    markdown += `\n## Prerequisites\n\n`;
    agenda.prerequisites.forEach(prereq => {
      markdown += `- ${prereq}\n`;
    });
    
    markdown += `\n## Agenda\n\n`;
    let timeOffset = 0;
    agenda.agenda_items.forEach(item => {
      const startTime = new Date(new Date(`${agenda.date} 00:00`).getTime() + timeOffset * 60000);
      const endTime = new Date(startTime.getTime() + item.duration * 60000);
      
      markdown += `### ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}: ${item.title}\n`;
      markdown += `**Presenter:** ${item.presenter}\n`;
      markdown += `**Objective:** ${item.objective}\n`;
      if (item.materials_needed.length) {
        markdown += `**Materials:** ${item.materials_needed.join(', ')}\n`;
      }
      if (item.decision_required) {
        markdown += `**⚠️ Decision Required**\n`;
      }
      markdown += `\n${item.description}\n\n`;
      
      timeOffset += item.duration;
    });
    
    markdown += `## Expected Outcomes\n\n`;
    agenda.expected_outcomes.forEach(outcome => {
      markdown += `- ${outcome}\n`;
    });
    
    return markdown;
  }
  
  async integrateWithMeetingNextSteps(agendaId: string): Promise<void> {
    // Create handoff to meeting-next-steps-agent for processing
    await this.chiefOfStaffIntegration.createHandoff({
      sourceAgent: "meeting-prep-agent",
      targetAgent: "meeting-next-steps-agent", 
      handoffType: HandoffType.LIFECYCLE_MANAGEMENT,
      context: { agendaId, workflow: "meeting-lifecycle" },
      priority: Priority.P2,
      expectations: ["Process meeting transcript", "Extract action items", "Route follow-ups"]
    });
  }
  
  private async postAgendaCreated(agenda: MeetingAgenda): Promise<void> {
    const post = {
      title: `Meeting Agenda: ${agenda.title}`,
      hook: `${agenda.objectives.length} objectives defined for ${agenda.duration}-minute ${agenda.meeting_type}`,
      contentBody: `## Agenda Created\n\n**Meeting:** ${agenda.title}\n**Date:** ${agenda.date}\n**Participants:** ${agenda.participants.length}\n\n**Key Objectives:**\n${agenda.objectives.map(obj => `- ${obj}`).join('\n')}\n\n**Agenda Items:** ${agenda.agenda_items.length} structured items with clear outcomes`,
      authorAgent: "meeting-prep-agent",
      mentionedAgents: ["chief-of-staff"],
      obsidianUri: `obsidian://open?vault=ProductStrategy&file=meetings/${agenda.title.replace(/\s+/g, '-')}`
    };
    
    await this.agentFeedPoster.createPost(post);
  }
}
```

### CLI Integration

```bash
# Universal CLI commands for meeting preparation
prep_meeting() {
  local meeting_type="$1"
  local title="$2"
  local date="$3"
  local participants="$4"
  
  curl -X POST "http://localhost:3005/api/agenda/create" \
    -H "Content-Type: application/json" \
    -d "{
      \"meetingType\": \"$meeting_type\",
      \"title\": \"$title\", 
      \"date\": \"$date\",
      \"participants\": $(echo "$participants" | jq -R 'split(\",\")')
    }"
}

meeting_workflow() {
  local action="$1"
  case "$action" in
    "prep")
      prep_meeting "$2" "$3" "$4" "$5"
      ;;
    "templates") 
      curl "http://localhost:3005/api/templates"
      ;;
    "history")
      curl "http://localhost:3005/api/agendas/history?limit=10"
      ;;
  esac
}
```

### File Management

**Storage Location:** `~/Documents/core/meetings/agendas.md`
**Agenda Files:** `~/Documents/core/meetings/agendas/YYYY-MM-DD-meeting-title-agenda.md`
**Templates:** `~/Documents/core/meetings/templates/`

---

## 6. MEETING NEXT STEPS AGENT

**Role**: Process meeting transcripts to extract summaries, action items, and automatically route follow-ups to appropriate team members.

### Container Configuration

```yaml
# docker-compose.meeting-next-steps.yml
services:
  meeting-next-steps:
    image: claude-code/meeting-next-steps:latest
    container_name: meeting-next-steps-agent
    restart: unless-stopped
    environment:
      - AGENT_TYPE=meeting-next-steps
      - CROSS_AGENT_ROUTING=true
      - AUTO_FOLLOWUP_ROUTING=true
      - AGENTLINK_API_URL=http://api-server:3000
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - DATABASE_URL=postgresql://user:pass@postgres:5432/claude_code
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./agent_workspace/meeting-next-steps:/workspace
      - agent-shared:/shared
      - ./Documents/core/meetings:/meetings
      - ./Documents/core/followups:/followups
      - ./Documents/core/todos:/todos
    ports:
      - "3006:3006"
    depends_on:
      - redis
      - postgres
      - api-server
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3006/health"]
      interval: 60s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        reservations:
          memory: 1Gi
          cpus: '0.5'
        limits:
          memory: 2Gi
          cpus: '1.0'
```

### Implementation Specification

```typescript
interface MeetingTranscript {
  id: string;
  agendaId: string;
  title: string;
  date: string;
  participants: string[];
  transcript: string;
  summary?: MeetingSummary;
  actionItems?: ActionItem[];
  followUps?: FollowUp[];
  processed: boolean;
  created_at: string;
}

interface MeetingSummary {
  key_discussions: string[];
  decisions_made: Decision[];
  concerns_raised: string[];
  next_meeting_topics: string[];
  overall_sentiment: string;
  completion_status: CompletionStatus;
}

interface Decision {
  topic: string;
  decision: string;
  rationale: string;
  owner: string;
  implementation_date?: string;
  success_criteria: string[];
}

interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  due_date?: string;
  priority: Priority;
  context: string;
  meeting_id: string;
  category: ActionCategory;
  dependencies: string[];
  success_criteria: string[];
}

enum ActionCategory {
  FOLLOW_UP = "follow-up",
  TASK_CREATION = "task-creation", 
  RESEARCH = "research",
  DECISION_PENDING = "decision-pending",
  COORDINATION = "coordination"
}

class MeetingNextStepsAgent extends BaseAgent {
  private transcriptProcessor: TranscriptProcessor;
  private actionItemExtractor: ActionItemExtractor;
  private routingEngine: CrossAgentRoutingEngine;
  private agentFeedPoster: AgentFeedPoster;
  
  // Tool Access: Read, Write, Edit, MultiEdit, LS, Glob, Grep
  private tools: ToolSet = {
    read: new ReadTool(),
    write: new WriteTool(), 
    edit: new EditTool(),
    multiEdit: new MultiEditTool(),
    ls: new LSTool(),
    glob: new GlobTool(),
    grep: new GrepTool()
  };
  
  async initialize(): Promise<void> {
    this.transcriptProcessor = new TranscriptProcessor();
    this.actionItemExtractor = new ActionItemExtractor();
    this.routingEngine = new CrossAgentRoutingEngine();
    this.agentFeedPoster = new AgentFeedPoster("meeting-next-steps-agent");
    
    await this.setupAutomaticRouting();
    await this.logActivity("Meeting Next Steps Agent initialized - Transcript processing ready", LogLevel.INFO);
  }
  
  async processMeetingTranscript(transcript: MeetingTranscript): Promise<ProcessingResult> {
    // Step 1: Generate meeting summary
    const summary = await this.generateMeetingSummary(transcript);
    
    // Step 2: Extract action items with AI analysis
    const actionItems = await this.extractActionItems(transcript);
    
    // Step 3: Identify follow-ups requiring delegation
    const followUps = await this.identifyFollowUps(actionItems);
    
    // Step 4: Route to appropriate agents
    const routingResults = await this.routeActionItems(actionItems, followUps);
    
    // Step 5: Save processed results
    const processedTranscript = {
      ...transcript,
      summary,
      actionItems,
      followUps,
      processed: true
    };
    
    await this.saveProcessedTranscript(processedTranscript);
    
    // Step 6: Post processing results to agent feed
    await this.postProcessingComplete(processedTranscript, routingResults);
    
    return {
      summary,
      actionItems,
      followUps,
      routingResults
    };
  }
  
  private async generateMeetingSummary(transcript: MeetingTranscript): Promise<MeetingSummary> {
    const prompt = `
    Analyze this meeting transcript and provide a comprehensive summary:
    
    Meeting: ${transcript.title}
    Date: ${transcript.date}
    Participants: ${transcript.participants.join(', ')}
    
    Transcript:
    ${transcript.transcript}
    
    Provide:
    1. Key discussions (3-5 main topics)
    2. Decisions made (with rationale and owners)
    3. Concerns raised
    4. Topics for next meeting
    5. Overall sentiment (positive/neutral/negative)
    6. Completion status of agenda items
    `;
    
    const analysis = await this.claudeRequest({
      prompt,
      maxTokens: 1000
    });
    
    return this.parseSummaryResponse(analysis);
  }
  
  private async extractActionItems(transcript: MeetingTranscript): Promise<ActionItem[]> {
    const prompt = `
    Extract all action items from this meeting transcript. For each action item provide:
    - Clear description
    - Assignee (person responsible)
    - Due date (if mentioned)
    - Priority level (P0-P7)
    - Category (follow-up, task-creation, research, decision-pending, coordination)
    - Dependencies on other action items
    - Success criteria
    
    Transcript:
    ${transcript.transcript}
    `;
    
    const extraction = await this.claudeRequest({
      prompt,
      maxTokens: 800
    });
    
    return this.parseActionItems(extraction, transcript.id);
  }
  
  private async routeActionItems(actionItems: ActionItem[], followUps: FollowUp[]): Promise<RoutingResult[]> {
    const routingResults: RoutingResult[] = [];
    
    for (const actionItem of actionItems) {
      switch (actionItem.category) {
        case ActionCategory.TASK_CREATION:
          // Route to personal-todos-agent
          const todoResult = await this.routingEngine.routeToPersonalTodos({
            actionItem,
            priority: actionItem.priority,
            context: "meeting-action-item"
          });
          routingResults.push(todoResult);
          break;
          
        case ActionCategory.FOLLOW_UP:
          // Route to follow-ups-agent
          const followUpResult = await this.routingEngine.routeToFollowUps({
            actionItem,
            assignee: actionItem.assignee,
            dueDate: actionItem.due_date
          });
          routingResults.push(followUpResult);
          break;
          
        case ActionCategory.RESEARCH:
          // Route through Chief of Staff for specialized agent assignment
          const researchResult = await this.routingEngine.routeToChiefOfStaff({
            actionItem,
            requestType: "research-assignment", 
            specializedAgent: "opportunity-scout" // or market-research as appropriate
          });
          routingResults.push(researchResult);
          break;
          
        case ActionCategory.COORDINATION:
          // Always route coordination items to Chief of Staff
          const coordResult = await this.routingEngine.routeToChiefOfStaff({
            actionItem,
            requestType: "coordination-required"
          });
          routingResults.push(coordResult);
          break;
      }
    }
    
    return routingResults;
  }
  
  private async saveProcessedTranscript(transcript: MeetingTranscript): Promise<void> {
    // Save summary to markdown file
    const summaryPath = `/workspace/summaries/${transcript.date}-${transcript.title.replace(/\s+/g, '-')}-summary.md`;
    const summaryMarkdown = this.formatSummaryAsMarkdown(transcript);
    await this.tools.write.execute({ file_path: summaryPath, content: summaryMarkdown });
    
    // Save action items to structured file
    const actionItemsPath = `/workspace/action-items/${transcript.date}-${transcript.title.replace(/\s+/g, '-')}-actions.md`;
    const actionItemsMarkdown = this.formatActionItemsAsMarkdown(transcript.actionItems!);
    await this.tools.write.execute({ file_path: actionItemsPath, content: actionItemsMarkdown });
    
    // Update master meetings index
    await this.updateMeetingsIndex(transcript);
  }
  
  private formatSummaryAsMarkdown(transcript: MeetingTranscript): string {
    const summary = transcript.summary!;
    
    let markdown = `# Meeting Summary: ${transcript.title}\n\n`;
    markdown += `**Date:** ${transcript.date}\n`;
    markdown += `**Participants:** ${transcript.participants.join(', ')}\n`;
    markdown += `**Overall Sentiment:** ${summary.overall_sentiment}\n\n`;
    
    markdown += `## Key Discussions\n\n`;
    summary.key_discussions.forEach(discussion => {
      markdown += `- ${discussion}\n`;
    });
    
    markdown += `\n## Decisions Made\n\n`;
    summary.decisions_made.forEach(decision => {
      markdown += `### ${decision.topic}\n`;
      markdown += `**Decision:** ${decision.decision}\n`;
      markdown += `**Rationale:** ${decision.rationale}\n`;
      markdown += `**Owner:** ${decision.owner}\n`;
      if (decision.implementation_date) {
        markdown += `**Implementation:** ${decision.implementation_date}\n`;
      }
      markdown += `**Success Criteria:**\n`;
      decision.success_criteria.forEach(criteria => {
        markdown += `- ${criteria}\n`;
      });
      markdown += '\n';
    });
    
    if (summary.concerns_raised.length) {
      markdown += `## Concerns Raised\n\n`;
      summary.concerns_raised.forEach(concern => {
        markdown += `- ${concern}\n`;
      });
    }
    
    if (summary.next_meeting_topics.length) {
      markdown += `\n## Next Meeting Topics\n\n`;
      summary.next_meeting_topics.forEach(topic => {
        markdown += `- ${topic}\n`;
      });
    }
    
    return markdown;
  }
  
  private async postProcessingComplete(transcript: MeetingTranscript, routingResults: RoutingResult[]): Promise<void> {
    const actionsRouted = routingResults.filter(r => r.success).length;
    const totalActions = transcript.actionItems?.length || 0;
    
    const post = {
      title: `Meeting Processed: ${transcript.title}`,
      hook: `${totalActions} action items extracted, ${actionsRouted} successfully routed to team members`,
      contentBody: `## Meeting Analysis Complete\n\n**Meeting:** ${transcript.title}\n**Date:** ${transcript.date}\n\n**Summary:**\n- ${transcript.summary?.key_discussions.length || 0} key discussions captured\n- ${transcript.summary?.decisions_made.length || 0} decisions documented\n- ${totalActions} action items identified\n\n**Routing Results:**\n- ${actionsRouted}/${totalActions} action items successfully routed\n- Personal Todos: ${routingResults.filter(r => r.targetAgent === 'personal-todos-agent').length}\n- Follow-ups: ${routingResults.filter(r => r.targetAgent === 'follow-ups-agent').length}\n- Chief of Staff: ${routingResults.filter(r => r.targetAgent === 'chief-of-staff').length}`,
      authorAgent: "meeting-next-steps-agent",
      mentionedAgents: ["chief-of-staff", "personal-todos-agent", "follow-ups-agent"],
      obsidianUri: `obsidian://open?vault=ProductStrategy&file=meetings/summaries/${transcript.title.replace(/\s+/g, '-')}`
    };
    
    await this.agentFeedPoster.createPost(post);
  }
}

class CrossAgentRoutingEngine {
  async routeToPersonalTodos(payload: TodoRoutingPayload): Promise<RoutingResult> {
    const handoff = {
      sourceAgent: "meeting-next-steps-agent",
      targetAgent: "personal-todos-agent",
      handoffType: HandoffType.TASK_CREATION,
      context: payload,
      priority: payload.priority,
      expectations: ["Create task with IMPACT scoring", "Apply Fibonacci priority system"]
    };
    
    return await this.executeHandoff(handoff);
  }
  
  async routeToFollowUps(payload: FollowUpRoutingPayload): Promise<RoutingResult> {
    const handoff = {
      sourceAgent: "meeting-next-steps-agent", 
      targetAgent: "follow-ups-agent",
      handoffType: HandoffType.DELEGATION_TRACKING,
      context: payload,
      priority: Priority.P2,
      expectations: ["Create follow-up entry", "Set check-in schedule", "Track completion"]
    };
    
    return await this.executeHandoff(handoff);
  }
  
  async routeToChiefOfStaff(payload: ChiefOfStaffRoutingPayload): Promise<RoutingResult> {
    const handoff = {
      sourceAgent: "meeting-next-steps-agent",
      targetAgent: "chief-of-staff", 
      handoffType: HandoffType.STRATEGIC_COORDINATION,
      context: payload,
      priority: Priority.P1,
      expectations: ["Strategic evaluation", "Agent routing decision", "Coordination oversight"]
    };
    
    return await this.executeHandoff(handoff);
  }
}
```

### Input Processing

**Meeting Transcripts:** Accepts audio transcripts, notes, or manual input
**Automatic Detection:** Monitors meeting completion and triggers processing
**Integration:** Works with Zoom, Teams, Google Meet transcription services

---

## 7. FOLLOW-UPS AGENT

**Role**: Track and manage follow-ups with team members on delegated tasks using person-based organization.

### Container Configuration

```yaml
# docker-compose.follow-ups.yml
services:
  follow-ups:
    image: claude-code/follow-ups:latest
    container_name: follow-ups-agent
    restart: unless-stopped
    environment:
      - AGENT_TYPE=follow-ups
      - PERSON_BASED_ORGANIZATION=true
      - DELEGATION_TRACKING=true
      - AGENTLINK_API_URL=http://api-server:3000
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - DATABASE_URL=postgresql://user:pass@postgres:5432/claude_code
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./agent_workspace/follow-ups:/workspace
      - agent-shared:/shared
      - ./Documents/core/followups:/followups
    ports:
      - "3007:3007"
    depends_on:
      - redis
      - postgres
      - api-server
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3007/health"]
      interval: 60s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        reservations:
          memory: 512Mi
          cpus: '0.25'
        limits:
          memory: 1Gi
          cpus: '0.5'
```

### Implementation Specification

```typescript
interface FollowUpEntry {
  id: string;
  person: string;
  task_description: string;
  delegated_date: string;
  check_in_date: string;
  status: FollowUpStatus;
  priority: Priority;
  context: string;
  original_source: string; // meeting, email, conversation
  notes: string[];
  completion_criteria: string[];
  last_contact: string;
  next_action: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

enum FollowUpStatus {
  PENDING = "pending",
  IN_PROGRESS = "in-progress", 
  WAITING_FOR_RESPONSE = "waiting-for-response",
  COMPLETED = "completed",
  BLOCKED = "blocked",
  OVERDUE = "overdue"
}

interface PersonDashboard {
  person: string;
  total_followups: number;
  active_followups: number;
  overdue_followups: number;
  completed_this_week: number;
  avg_response_time: number; // days
  reliability_score: number; // 0-100
  recent_activity: FollowUpEntry[];
}

class FollowUpsAgent extends BaseAgent {
  private followUpDatabase: FollowUpDatabase;
  private personRegistry: PersonRegistry;
  private checkInScheduler: CheckInScheduler;
  private agentFeedPoster: AgentFeedPoster;
  
  // Tool Access: Read, Write, Edit, MultiEdit, LS, Glob
  private tools: ToolSet = {
    read: new ReadTool(),
    write: new WriteTool(),
    edit: new EditTool(),
    multiEdit: new MultiEditTool(),
    ls: new LSTool(),
    glob: new GlobTool()
  };
  
  async initialize(): Promise<void> {
    this.followUpDatabase = new FollowUpDatabase();
    this.personRegistry = new PersonRegistry();
    this.checkInScheduler = new CheckInScheduler();
    this.agentFeedPoster = new AgentFeedPoster("follow-ups-agent");
    
    await this.loadExistingFollowUps();
    await this.initializeCheckInScheduler();
    
    await this.logActivity("Follow-ups Agent initialized - Person-based tracking active", LogLevel.INFO);
  }
  
  async createFollowUp(request: FollowUpRequest): Promise<FollowUpEntry> {
    const followUp: FollowUpEntry = {
      id: generateUUID(),
      person: request.person,
      task_description: request.taskDescription,
      delegated_date: new Date().toISOString(),
      check_in_date: this.calculateCheckInDate(request.priority),
      status: FollowUpStatus.PENDING,
      priority: request.priority,
      context: request.context,
      original_source: request.source,
      notes: [],
      completion_criteria: request.completionCriteria || [],
      last_contact: new Date().toISOString(),
      next_action: "Initial delegation",
      archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Save to database
    await this.followUpDatabase.save(followUp);
    
    // Update person-based organization file
    await this.updatePersonBasedFile(followUp);
    
    // Schedule check-in reminder
    await this.checkInScheduler.scheduleCheckIn(followUp);
    
    // Post to agent feed
    await this.postFollowUpCreated(followUp);
    
    return followUp;
  }
  
  async updateFollowUpStatus(id: string, update: FollowUpUpdate): Promise<FollowUpEntry> {
    const followUp = await this.followUpDatabase.findById(id);
    if (!followUp) {
      throw new Error(`Follow-up not found: ${id}`);
    }
    
    // Update fields
    Object.assign(followUp, update);
    followUp.updated_at = new Date().toISOString();
    
    // Add note if status changed
    if (update.status) {
      followUp.notes.push(`Status changed to ${update.status} - ${new Date().toISOString()}`);
    }
    
    // Save updated follow-up
    await this.followUpDatabase.save(followUp);
    
    // Update person-based file
    await this.updatePersonBasedFile(followUp);
    
    // Reschedule check-in if needed
    if (update.check_in_date) {
      await this.checkInScheduler.rescheduleCheckIn(followUp);
    }
    
    // Post status update if significant
    if (update.status === FollowUpStatus.COMPLETED || update.status === FollowUpStatus.BLOCKED) {
      await this.postFollowUpStatusUpdate(followUp);
    }
    
    return followUp;
  }
  
  async generatePersonDashboard(person: string): Promise<PersonDashboard> {
    const followUps = await this.followUpDatabase.findByPerson(person);
    
    const dashboard: PersonDashboard = {
      person,
      total_followups: followUps.length,
      active_followups: followUps.filter(f => !f.archived && f.status !== FollowUpStatus.COMPLETED).length,
      overdue_followups: followUps.filter(f => this.isOverdue(f)).length,
      completed_this_week: followUps.filter(f => this.completedThisWeek(f)).length,
      avg_response_time: this.calculateAvgResponseTime(followUps),
      reliability_score: this.calculateReliabilityScore(followUps),
      recent_activity: followUps.slice(0, 5)
    };
    
    return dashboard;
  }
  
  private async updatePersonBasedFile(followUp: FollowUpEntry): Promise<void> {
    const filePath = `/followups/follow-ups.md`;
    const content = await this.tools.read.execute({ file_path: filePath });
    
    // Parse existing content and update person section
    const updatedContent = await this.updatePersonSection(content.content, followUp);
    
    await this.tools.write.execute({ 
      file_path: filePath, 
      content: updatedContent 
    });
  }
  
  private async updatePersonSection(content: string, followUp: FollowUpEntry): Promise<string> {
    const personSectionRegex = new RegExp(`## ${followUp.person}([\\s\\S]*?)(?=## |$)`, 'g');
    const personFollowUps = await this.followUpDatabase.findByPerson(followUp.person);
    
    let personSection = `## ${followUp.person}\n\n`;
    
    // Group by status
    const byStatus = this.groupByStatus(personFollowUps);
    
    for (const [status, items] of Object.entries(byStatus)) {
      if (items.length === 0) continue;
      
      personSection += `### ${status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}\n\n`;
      
      for (const item of items) {
        const statusIcon = this.getStatusIcon(item.status);
        personSection += `${statusIcon} **${item.task_description}** (${item.priority})\n`;
        personSection += `   📅 Check-in: ${item.check_in_date.split('T')[0]}\n`;
        personSection += `   📝 Context: ${item.context}\n`;
        if (item.notes.length > 0) {
          personSection += `   💬 Latest: ${item.notes[item.notes.length - 1]}\n`;
        }
        personSection += '\n';
      }
    }
    
    // Replace or add person section
    if (personSectionRegex.test(content)) {
      return content.replace(personSectionRegex, personSection);
    } else {
      return content + '\n\n' + personSection;
    }
  }
  
  private groupByStatus(followUps: FollowUpEntry[]): Record<string, FollowUpEntry[]> {
    return followUps.reduce((acc, followUp) => {
      if (!acc[followUp.status]) {
        acc[followUp.status] = [];
      }
      acc[followUp.status].push(followUp);
      return acc;
    }, {} as Record<string, FollowUpEntry[]>);
  }
  
  private getStatusIcon(status: FollowUpStatus): string {
    const icons = {
      [FollowUpStatus.PENDING]: "⏳",
      [FollowUpStatus.IN_PROGRESS]: "🔄", 
      [FollowUpStatus.WAITING_FOR_RESPONSE]: "⏰",
      [FollowUpStatus.COMPLETED]: "✅",
      [FollowUpStatus.BLOCKED]: "🚫",
      [FollowUpStatus.OVERDUE]: "🔴"
    };
    
    return icons[status] || "📋";
  }
  
  async archiveCompletedFollowUps(): Promise<number> {
    const completedFollowUps = await this.followUpDatabase.findByStatus(FollowUpStatus.COMPLETED);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const toArchive = completedFollowUps.filter(f => f.updated_at < oneWeekAgo);
    
    for (const followUp of toArchive) {
      followUp.archived = true;
      await this.followUpDatabase.save(followUp);
    }
    
    // Update person-based files to remove archived items
    const affectedPeople = [...new Set(toArchive.map(f => f.person))];
    for (const person of affectedPeople) {
      const remainingFollowUps = await this.followUpDatabase.findByPerson(person, { includeArchived: false });
      await this.updatePersonBasedFileComplete(person, remainingFollowUps);
    }
    
    return toArchive.length;
  }
  
  private async postFollowUpCreated(followUp: FollowUpEntry): Promise<void> {
    const post = {
      title: `Follow-up Assigned: ${followUp.person}`,
      hook: `${followUp.priority} priority task delegated with ${followUp.check_in_date.split('T')[0]} check-in`,
      contentBody: `## Follow-up Created\n\n**Assignee:** ${followUp.person}\n**Task:** ${followUp.task_description}\n**Priority:** ${followUp.priority}\n**Check-in Date:** ${followUp.check_in_date.split('T')[0]}\n**Context:** ${followUp.context}\n\n**Completion Criteria:**\n${followUp.completion_criteria.map(c => `- ${c}`).join('\n')}`,
      authorAgent: "follow-ups-agent",
      mentionedAgents: ["chief-of-staff"],
      obsidianUri: `obsidian://open?vault=ProductStrategy&file=followups/follow-ups#${followUp.person.replace(/\s+/g, '-')}`
    };
    
    await this.agentFeedPoster.createPost(post);
  }
}

class CheckInScheduler {
  async scheduleCheckIn(followUp: FollowUpEntry): Promise<void> {
    // Schedule system reminder based on check-in date
    const checkInDate = new Date(followUp.check_in_date);
    const now = new Date();
    
    if (checkInDate > now) {
      // Schedule future check-in reminder
      await this.scheduleSystemReminder(followUp, checkInDate);
    }
  }
  
  async rescheduleCheckIn(followUp: FollowUpEntry): Promise<void> {
    // Cancel existing reminder and schedule new one
    await this.cancelReminder(followUp.id);
    await this.scheduleCheckIn(followUp);
  }
  
  private async scheduleSystemReminder(followUp: FollowUpEntry, checkInDate: Date): Promise<void> {
    // Integration with system cron or task scheduler
    const reminder = {
      id: followUp.id,
      type: "follow-up-check-in",
      triggerDate: checkInDate,
      payload: followUp
    };
    
    // Store in Redis for cron job pickup
    await this.storeReminder(reminder);
  }
}
```

### Storage Organization

**Primary File:** `~/Documents/core/followups/follow-ups.md` - Person-based organization
**Archive Workflow:** Simple archive system for completed items
**Integration:** Receives handoffs from Chief of Staff and Meeting Next Steps

---

## 8. BULL-BEAVER-BEAR AGENT

**Role**: Define experiment criteria and AB test frameworks with clear Bull/Beaver/Bear outcome scenarios for decision-making.

### Container Configuration

```yaml
# docker-compose.bull-beaver-bear.yml
services:
  bull-beaver-bear:
    image: claude-code/bull-beaver-bear:latest
    container_name: bull-beaver-bear-agent
    restart: unless-stopped
    environment:
      - AGENT_TYPE=bull-beaver-bear
      - EXPERIMENT_FRAMEWORK=true
      - DECISION_CRITERIA_REQUIRED=true
      - AGENTLINK_API_URL=http://api-server:3000
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - DATABASE_URL=postgresql://user:pass@postgres:5432/claude_code
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./agent_workspace/bull-beaver-bear:/workspace
      - agent-shared:/shared
      - ./Documents/core/experiments:/experiments
    ports:
      - "3008:3008"
    depends_on:
      - redis
      - postgres
      - api-server
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3008/health"]
      interval: 60s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        reservations:
          memory: 512Mi
          cpus: '0.25'
        limits:
          memory: 1Gi
          cpus: '0.5'
```

### Implementation Specification

```typescript
interface ExperimentFramework {
  id: string;
  experiment_name: string;
  hypothesis: string;
  success_metrics: SuccessMetric[];
  bull_scenario: OutcomeScenario;
  beaver_scenario: OutcomeScenario;
  bear_scenario: OutcomeScenario;
  decision_criteria: DecisionCriteria;
  duration: number; // days
  sample_size: number;
  statistical_power: number;
  created_at: string;
  status: ExperimentStatus;
}

interface OutcomeScenario {
  name: string; // "Bull", "Beaver", "Bear"
  description: string;
  threshold_conditions: ThresholdCondition[];
  business_impact: string;
  next_actions: string[];
  probability_estimate: number; // 0-100%
  confidence_level: number; // 0-100%
}

interface ThresholdCondition {
  metric: string;
  operator: ComparisonOperator; // ">", "<", ">=", "<=", "="
  value: number;
  timeframe: string;
  measurement_unit: string;
}

interface DecisionCriteria {
  primary_metric: string;
  secondary_metrics: string[];
  minimum_effect_size: number;
  statistical_significance: number; // e.g., 0.05
  decision_rules: DecisionRule[];
  early_stopping_rules: EarlyStoppingRule[];
}

interface DecisionRule {
  condition: string;
  action: string;
  reasoning: string;
}

enum ExperimentStatus {
  PLANNING = "planning",
  READY_TO_LAUNCH = "ready-to-launch", 
  RUNNING = "running",
  COMPLETED = "completed",
  STOPPED_EARLY = "stopped-early",
  CANCELLED = "cancelled"
}

enum ComparisonOperator {
  GREATER_THAN = ">",
  LESS_THAN = "<",
  GREATER_EQUAL = ">=", 
  LESS_EQUAL = "<=",
  EQUAL = "="
}

class BullBeaverBearAgent extends BaseAgent {
  private experimentDatabase: ExperimentDatabase;
  private statisticalAnalyzer: StatisticalAnalyzer;
  private decisionEngine: DecisionEngine;
  private agentFeedPoster: AgentFeedPoster;
  
  // Tool Access: Read, Write, Edit, MultiEdit, LS, Glob, Grep
  private tools: ToolSet = {
    read: new ReadTool(),
    write: new WriteTool(),
    edit: new EditTool(),
    multiEdit: new MultiEditTool(),
    ls: new LSTool(),
    glob: new GlobTool(),
    grep: new GrepTool()
  };
  
  async initialize(): Promise<void> {
    this.experimentDatabase = new ExperimentDatabase();
    this.statisticalAnalyzer = new StatisticalAnalyzer();
    this.decisionEngine = new DecisionEngine();
    this.agentFeedPoster = new AgentFeedPoster("bull-beaver-bear-agent");
    
    await this.loadExperimentTemplates();
    await this.logActivity("Bull-Beaver-Bear Agent initialized - Experiment framework ready", LogLevel.INFO);
  }
  
  async createExperimentFramework(request: ExperimentRequest): Promise<ExperimentFramework> {
    // Step 1: Validate experiment hypothesis and metrics
    await this.validateExperimentDesign(request);
    
    // Step 2: Calculate statistical requirements
    const statRequirements = await this.calculateStatisticalRequirements(request);
    
    // Step 3: Generate Bull/Beaver/Bear scenarios
    const scenarios = await this.generateScenarios(request);
    
    // Step 4: Define decision criteria
    const decisionCriteria = await this.defineDecisionCriteria(request, scenarios);
    
    const experiment: ExperimentFramework = {
      id: generateUUID(),
      experiment_name: request.experimentName,
      hypothesis: request.hypothesis,
      success_metrics: request.successMetrics,
      bull_scenario: scenarios.bull,
      beaver_scenario: scenarios.beaver,
      bear_scenario: scenarios.bear,
      decision_criteria: decisionCriteria,
      duration: statRequirements.minimumDuration,
      sample_size: statRequirements.sampleSize,
      statistical_power: statRequirements.power,
      created_at: new Date().toISOString(),
      status: ExperimentStatus.PLANNING
    };
    
    // Save experiment framework
    await this.experimentDatabase.save(experiment);
    
    // Save to file system for reference
    await this.saveExperimentToFile(experiment);
    
    // Post experiment creation to feed
    await this.postExperimentCreated(experiment);
    
    return experiment;
  }
  
  private async generateScenarios(request: ExperimentRequest): Promise<{bull: OutcomeScenario, beaver: OutcomeScenario, bear: OutcomeScenario}> {
    const baselineMetrics = request.baselineMetrics;
    
    // Bull Scenario: Best case outcome (90th percentile)
    const bullScenario: OutcomeScenario = {
      name: "Bull",
      description: await this.generateScenarioDescription("bull", request),
      threshold_conditions: this.generateBullThresholds(baselineMetrics, request.successMetrics),
      business_impact: await this.calculateBusinessImpact("bull", request),
      next_actions: await this.defineNextActions("bull", request),
      probability_estimate: 25, // Conservative estimate
      confidence_level: 80
    };
    
    // Beaver Scenario: Expected outcome (50th percentile)
    const beaverScenario: OutcomeScenario = {
      name: "Beaver", 
      description: await this.generateScenarioDescription("beaver", request),
      threshold_conditions: this.generateBeaverThresholds(baselineMetrics, request.successMetrics),
      business_impact: await this.calculateBusinessImpact("beaver", request),
      next_actions: await this.defineNextActions("beaver", request),
      probability_estimate: 50, // Most likely outcome
      confidence_level: 85
    };
    
    // Bear Scenario: Worst case outcome (10th percentile) 
    const bearScenario: OutcomeScenario = {
      name: "Bear",
      description: await this.generateScenarioDescription("bear", request),
      threshold_conditions: this.generateBearThresholds(baselineMetrics, request.successMetrics),
      business_impact: await this.calculateBusinessImpact("bear", request),
      next_actions: await this.defineNextActions("bear", request),
      probability_estimate: 25, // Risk mitigation estimate
      confidence_level: 75
    };
    
    return { bull: bullScenario, beaver: beaverScenario, bear: bearScenario };
  }
  
  private generateBullThresholds(baseline: Record<string, number>, metrics: SuccessMetric[]): ThresholdCondition[] {
    return metrics.map(metric => ({
      metric: metric.name,
      operator: metric.direction === 'increase' ? ComparisonOperator.GREATER_EQUAL : ComparisonOperator.LESS_EQUAL,
      value: this.calculateBullValue(baseline[metric.name], metric),
      timeframe: metric.timeframe,
      measurement_unit: metric.unit
    }));
  }
  
  private generateBeaverThresholds(baseline: Record<string, number>, metrics: SuccessMetric[]): ThresholdCondition[] {
    return metrics.map(metric => ({
      metric: metric.name,
      operator: metric.direction === 'increase' ? ComparisonOperator.GREATER_EQUAL : ComparisonOperator.LESS_EQUAL,
      value: this.calculateBeaverValue(baseline[metric.name], metric),
      timeframe: metric.timeframe,
      measurement_unit: metric.unit
    }));
  }
  
  private generateBearThresholds(baseline: Record<string, number>, metrics: SuccessMetric[]): ThresholdCondition[] {
    return metrics.map(metric => ({
      metric: metric.name,
      operator: metric.direction === 'increase' ? ComparisonOperator.LESS_THAN : ComparisonOperator.GREATER_THAN,
      value: this.calculateBearValue(baseline[metric.name], metric),
      timeframe: metric.timeframe,
      measurement_unit: metric.unit
    }));
  }
  
  private calculateBullValue(baseline: number, metric: SuccessMetric): number {
    // Bull case: optimistic but achievable (baseline + 150% of target improvement)
    const targetImprovement = metric.targetImprovement || 0.2; // 20% default
    const bullMultiplier = 1.5;
    
    if (metric.direction === 'increase') {
      return baseline * (1 + targetImprovement * bullMultiplier);
    } else {
      return baseline * (1 - targetImprovement * bullMultiplier);
    }
  }
  
  private calculateBeaverValue(baseline: number, metric: SuccessMetric): number {
    // Beaver case: realistic target (baseline + 100% of target improvement)
    const targetImprovement = metric.targetImprovement || 0.2;
    
    if (metric.direction === 'increase') {
      return baseline * (1 + targetImprovement);
    } else {
      return baseline * (1 - targetImprovement);
    }
  }
  
  private calculateBearValue(baseline: number, metric: SuccessMetric): number {
    // Bear case: acceptable minimum (baseline + 50% of target improvement)
    const targetImprovement = metric.targetImprovement || 0.2;
    const bearMultiplier = 0.5;
    
    if (metric.direction === 'increase') {
      return baseline * (1 + targetImprovement * bearMultiplier);
    } else {
      return baseline * (1 - targetImprovement * bearMultiplier);
    }
  }
  
  async analyzeExperimentResults(experimentId: string, results: ExperimentResults): Promise<ExperimentAnalysis> {
    const experiment = await this.experimentDatabase.findById(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }
    
    // Statistical analysis
    const statAnalysis = await this.statisticalAnalyzer.analyze(results);
    
    // Determine which scenario was achieved
    const scenarioMatch = await this.determineScenarioMatch(experiment, results);
    
    // Generate decision recommendation
    const decision = await this.decisionEngine.generateDecision(experiment, results, scenarioMatch);
    
    const analysis: ExperimentAnalysis = {
      experimentId,
      statistical_analysis: statAnalysis,
      scenario_achieved: scenarioMatch,
      decision_recommendation: decision,
      confidence_level: statAnalysis.confidence,
      business_impact_estimate: await this.estimateBusinessImpact(experiment, results),
      next_steps: decision.recommendedActions,
      analyzed_at: new Date().toISOString()
    };
    
    // Save analysis results
    await this.saveAnalysisResults(analysis);
    
    // Post analysis to agent feed
    await this.postExperimentAnalysis(experiment, analysis);
    
    return analysis;
  }
  
  private async determineScenarioMatch(experiment: ExperimentFramework, results: ExperimentResults): Promise<string> {
    const { bull_scenario, beaver_scenario, bear_scenario } = experiment;
    
    // Check if results meet Bull criteria
    if (await this.meetsScenarioCriteria(bull_scenario, results)) {
      return "Bull";
    }
    
    // Check if results meet Beaver criteria
    if (await this.meetsScenarioCriteria(beaver_scenario, results)) {
      return "Beaver";
    }
    
    // Check if results meet Bear criteria
    if (await this.meetsScenarioCriteria(bear_scenario, results)) {
      return "Bear";
    }
    
    // Results don't meet any predefined scenario
    return "Below Bear";
  }
  
  private async meetsScenarioCriteria(scenario: OutcomeScenario, results: ExperimentResults): Promise<boolean> {
    for (const condition of scenario.threshold_conditions) {
      const actualValue = results.metrics[condition.metric];
      if (!actualValue) continue;
      
      const meetsCondition = this.evaluateCondition(actualValue, condition);
      if (!meetsCondition) {
        return false;
      }
    }
    
    return true;
  }
  
  private evaluateCondition(actualValue: number, condition: ThresholdCondition): boolean {
    switch (condition.operator) {
      case ComparisonOperator.GREATER_THAN:
        return actualValue > condition.value;
      case ComparisonOperator.GREATER_EQUAL:
        return actualValue >= condition.value;
      case ComparisonOperator.LESS_THAN:
        return actualValue < condition.value;
      case ComparisonOperator.LESS_EQUAL:
        return actualValue <= condition.value;
      case ComparisonOperator.EQUAL:
        return Math.abs(actualValue - condition.value) < 0.01; // Allow for floating point precision
      default:
        return false;
    }
  }
  
  private async saveExperimentToFile(experiment: ExperimentFramework): Promise<void> {
    const filename = `${experiment.experiment_name.toLowerCase().replace(/\s+/g, '-')}-framework.md`;
    const filepath = `/workspace/experiments/${filename}`;
    
    const markdown = this.formatExperimentAsMarkdown(experiment);
    await this.tools.write.execute({ file_path: filepath, content: markdown });
  }
  
  private formatExperimentAsMarkdown(experiment: ExperimentFramework): string {
    let markdown = `# Experiment Framework: ${experiment.experiment_name}\n\n`;
    markdown += `**Hypothesis:** ${experiment.hypothesis}\n\n`;
    markdown += `**Duration:** ${experiment.duration} days\n`;
    markdown += `**Sample Size:** ${experiment.sample_size.toLocaleString()}\n`;
    markdown += `**Statistical Power:** ${experiment.statistical_power}%\n\n`;
    
    markdown += `## Success Metrics\n\n`;
    experiment.success_metrics.forEach(metric => {
      markdown += `- **${metric.name}**: ${metric.description}\n`;
      markdown += `  - Target: ${metric.targetImprovement * 100}% ${metric.direction}\n`;
      markdown += `  - Unit: ${metric.unit}\n`;
      markdown += `  - Timeframe: ${metric.timeframe}\n\n`;
    });
    
    // Bull Scenario
    markdown += `## 🐂 Bull Scenario (Best Case)\n\n`;
    markdown += `${experiment.bull_scenario.description}\n\n`;
    markdown += `**Thresholds:**\n`;
    experiment.bull_scenario.threshold_conditions.forEach(condition => {
      markdown += `- ${condition.metric} ${condition.operator} ${condition.value} ${condition.measurement_unit}\n`;
    });
    markdown += `\n**Business Impact:** ${experiment.bull_scenario.business_impact}\n\n`;
    markdown += `**Next Actions:**\n`;
    experiment.bull_scenario.next_actions.forEach(action => {
      markdown += `- ${action}\n`;
    });
    
    // Beaver Scenario
    markdown += `\n## 🦫 Beaver Scenario (Expected Case)\n\n`;
    markdown += `${experiment.beaver_scenario.description}\n\n`;
    markdown += `**Thresholds:**\n`;
    experiment.beaver_scenario.threshold_conditions.forEach(condition => {
      markdown += `- ${condition.metric} ${condition.operator} ${condition.value} ${condition.measurement_unit}\n`;
    });
    markdown += `\n**Business Impact:** ${experiment.beaver_scenario.business_impact}\n\n`;
    markdown += `**Next Actions:**\n`;
    experiment.beaver_scenario.next_actions.forEach(action => {
      markdown += `- ${action}\n`;
    });
    
    // Bear Scenario
    markdown += `\n## 🐻 Bear Scenario (Minimum Acceptable)\n\n`;
    markdown += `${experiment.bear_scenario.description}\n\n`;
    markdown += `**Thresholds:**\n`;
    experiment.bear_scenario.threshold_conditions.forEach(condition => {
      markdown += `- ${condition.metric} ${condition.operator} ${condition.value} ${condition.measurement_unit}\n`;
    });
    markdown += `\n**Business Impact:** ${experiment.bear_scenario.business_impact}\n\n`;
    markdown += `**Next Actions:**\n`;
    experiment.bear_scenario.next_actions.forEach(action => {
      markdown += `- ${action}\n`;
    });
    
    // Decision Criteria
    markdown += `\n## Decision Criteria\n\n`;
    markdown += `**Primary Metric:** ${experiment.decision_criteria.primary_metric}\n`;
    markdown += `**Statistical Significance:** ${experiment.decision_criteria.statistical_significance}\n`;
    markdown += `**Minimum Effect Size:** ${experiment.decision_criteria.minimum_effect_size}\n\n`;
    
    markdown += `**Decision Rules:**\n`;
    experiment.decision_criteria.decision_rules.forEach(rule => {
      markdown += `- **${rule.condition}**: ${rule.action}\n`;
      markdown += `  - Reasoning: ${rule.reasoning}\n\n`;
    });
    
    return markdown;
  }
  
  private async postExperimentCreated(experiment: ExperimentFramework): Promise<void> {
    const post = {
      title: `Experiment Framework: ${experiment.experiment_name}`,
      hook: `Bull/Beaver/Bear scenarios defined with ${experiment.success_metrics.length} success metrics`,
      contentBody: `## Experiment Framework Created\n\n**Hypothesis:** ${experiment.hypothesis}\n\n**Success Scenarios:**\n🐂 **Bull**: ${experiment.bull_scenario.business_impact}\n🦫 **Beaver**: ${experiment.beaver_scenario.business_impact}\n🐻 **Bear**: ${experiment.bear_scenario.business_impact}\n\n**Statistical Requirements:**\n- Duration: ${experiment.duration} days\n- Sample size: ${experiment.sample_size.toLocaleString()}\n- Power: ${experiment.statistical_power}%`,
      authorAgent: "bull-beaver-bear-agent",
      mentionedAgents: ["chief-of-staff"],
      obsidianUri: `obsidian://open?vault=ProductStrategy&file=experiments/${experiment.experiment_name.replace(/\s+/g, '-')}`
    };
    
    await this.agentFeedPoster.createPost(post);
  }
}
```

### Usage Protocol

**ESSENTIAL before running any test:** Bull-Beaver-Bear Agent MUST be called to define success criteria
**Called by Chief of Staff:** For all experiment decision frameworks
**Clear outcome scenarios:** All experiments have predefined Bull/Beaver/Bear thresholds
**Integration:** Works with Goal Analyst for metric alignment validation

---

## 9. GOAL ANALYST AGENT

**Role**: Chronicle and analyze goal hierarchies, metric flow, and identify goal cascade alignment inconsistencies.

### Container Configuration

```yaml
# docker-compose.goal-analyst.yml
services:
  goal-analyst:
    image: claude-code/goal-analyst:latest
    container_name: goal-analyst-agent
    restart: unless-stopped
    environment:
      - AGENT_TYPE=goal-analyst
      - PROACTIVE_ANALYSIS=true
      - METRIC_FLOW_MONITORING=true
      - AGENTLINK_API_URL=http://api-server:3000
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - DATABASE_URL=postgresql://user:pass@postgres:5432/claude_code
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./agent_workspace/goal-analyst:/workspace
      - agent-shared:/shared
      - ./Documents/core/goals:/goals
      - ./Documents/core/product-strategy:/strategy
    ports:
      - "3009:3009"
    depends_on:
      - redis
      - postgres
      - api-server
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3009/health"]
      interval: 60s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        reservations:
          memory: 1Gi
          cpus: '0.5'
        limits:
          memory: 2Gi
          cpus: '1.0'
```

### Implementation Specification

```typescript
interface GoalHierarchy {
  id: string;
  company_vision: CompanyVision;
  annual_goals: AnnualGoal[];
  quarterly_goals: QuarterlyGoal[];
  team_goals: TeamGoal[];
  individual_goals: IndividualGoal[];
  metric_cascade: MetricCascade;
  created_at: string;
  updated_at: string;
}

interface CompanyVision {
  statement: string;
  key_pillars: string[];
  success_criteria: string[];
  timeframe: string; // "3-5 years"
}

interface AnnualGoal {
  id: string;
  title: string;
  description: string;
  owner: string;
  target_metrics: TargetMetric[];
  supporting_initiatives: string[];
  quarterly_breakdown: QuarterlyBreakdown[];
  alignment_to_vision: string;
}

interface QuarterlyGoal {
  id: string;
  quarter: string; // "Q1 2025"
  annual_goal_id: string;
  title: string;
  target_metrics: TargetMetric[];
  team_assignments: TeamAssignment[];
  bull_beaver_bear_criteria?: ExperimentCriteria;
}

interface MetricCascade {
  company_level: CompanyMetric[];
  team_level: TeamMetric[];
  individual_level: IndividualMetric[];
  metric_relationships: MetricRelationship[];
  flow_diagram: string; // ASCII representation
}

interface MetricRelationship {
  parent_metric: string;
  child_metrics: string[];
  relationship_type: RelationshipType;
  contribution_weight: number; // 0-1
  formula?: string;
}

enum RelationshipType {
  DIRECT_CONTRIBUTION = "direct-contribution",
  LEADING_INDICATOR = "leading-indicator",
  LAGGING_INDICATOR = "lagging-indicator", 
  CORRELATED = "correlated",
  INVERSE_CORRELATED = "inverse-correlated"
}

interface AlignmentAnalysis {
  id: string;
  analysis_date: string;
  hierarchy_id: string;
  alignment_score: number; // 0-100
  inconsistencies: Inconsistency[];
  recommendations: Recommendation[];
  metric_flow_issues: MetricFlowIssue[];
  orphaned_metrics: string[];
  cascade_breaks: CascadeBreak[];
}

interface Inconsistency {
  type: InconsistencyType;
  description: string;
  affected_goals: string[];
  severity: Severity;
  suggested_fix: string;
  business_impact: string;
}

enum InconsistencyType {
  METRIC_MISALIGNMENT = "metric-misalignment",
  GOAL_CONFLICT = "goal-conflict",
  RESOURCE_CONTRADICTION = "resource-contradiction",
  TIMELINE_MISMATCH = "timeline-mismatch",
  MEASUREMENT_GAP = "measurement-gap"
}

class GoalAnalystAgent extends BaseAgent {
  private goalDatabase: GoalDatabase;
  private metricAnalyzer: MetricAnalyzer;
  private alignmentEngine: AlignmentEngine;
  private flowDiagramGenerator: FlowDiagramGenerator;
  private agentFeedPoster: AgentFeedPoster;
  
  // Tool Access: Read, Write, Edit, MultiEdit, LS, Glob, Grep
  private tools: ToolSet = {
    read: new ReadTool(),
    write: new WriteTool(),
    edit: new EditTool(),
    multiEdit: new MultiEditTool(),
    ls: new LSTool(),
    glob: new GlobTool(),
    grep: new GrepTool()
  };
  
  async initialize(): Promise<void> {
    this.goalDatabase = new GoalDatabase();
    this.metricAnalyzer = new MetricAnalyzer();
    this.alignmentEngine = new AlignmentEngine();
    this.flowDiagramGenerator = new FlowDiagramGenerator();
    this.agentFeedPoster = new AgentFeedPoster("goal-analyst-agent");
    
    await this.loadExistingGoalHierarchy();
    await this.setupProactiveMonitoring();
    
    await this.logActivity("Goal Analyst Agent initialized - Proactive analysis active", LogLevel.INFO);
  }
  
  async analyzeGoalHierarchy(hierarchy?: GoalHierarchy): Promise<AlignmentAnalysis> {
    const targetHierarchy = hierarchy || await this.goalDatabase.getCurrentHierarchy();
    if (!targetHierarchy) {
      throw new Error("No goal hierarchy found for analysis");
    }
    
    // Step 1: Analyze metric flow and cascade integrity
    const metricFlowAnalysis = await this.metricAnalyzer.analyzeFlow(targetHierarchy.metric_cascade);
    
    // Step 2: Identify goal alignment inconsistencies
    const inconsistencies = await this.alignmentEngine.findInconsistencies(targetHierarchy);
    
    // Step 3: Check for orphaned metrics and cascade breaks
    const orphanedMetrics = await this.identifyOrphanedMetrics(targetHierarchy);
    const cascadeBreaks = await this.findCascadeBreaks(targetHierarchy);
    
    // Step 4: Generate alignment score
    const alignmentScore = await this.calculateAlignmentScore(targetHierarchy, inconsistencies);
    
    // Step 5: Create recommendations
    const recommendations = await this.generateRecommendations(inconsistencies, metricFlowAnalysis);
    
    const analysis: AlignmentAnalysis = {
      id: generateUUID(),
      analysis_date: new Date().toISOString(),
      hierarchy_id: targetHierarchy.id,
      alignment_score: alignmentScore,
      inconsistencies,
      recommendations,
      metric_flow_issues: metricFlowAnalysis.issues,
      orphaned_metrics: orphanedMetrics,
      cascade_breaks: cascadeBreaks
    };
    
    // Save analysis results
    await this.saveAnalysisResults(analysis);
    
    // Update goal hierarchy with analysis insights
    await this.updateGoalHierarchyWithInsights(targetHierarchy, analysis);
    
    // Post analysis to agent feed
    await this.postAnalysisComplete(analysis);
    
    return analysis;
  }
  
  async validateBullBeaverBearAlignment(experimentCriteria: ExperimentCriteria, relatedGoals: string[]): Promise<ValidationResult> {
    // Called by Bull-Beaver-Bear Agent to validate experiment criteria align with goals
    const hierarchy = await this.goalDatabase.getCurrentHierarchy();
    const relevantGoals = await this.findRelevantGoals(relatedGoals, hierarchy);
    
    const validation: ValidationResult = {
      isAligned: true,
      alignmentScore: 0,
      issues: [],
      recommendations: []
    };
    
    for (const goal of relevantGoals) {
      // Check if Bull scenario aligns with goal targets
      const bullAlignment = await this.checkScenarioAlignment(
        experimentCriteria.bull_scenario, 
        goal.target_metrics
      );
      
      // Check if Beaver scenario is realistic given goal constraints
      const beaverAlignment = await this.checkScenarioAlignment(
        experimentCriteria.beaver_scenario,
        goal.target_metrics
      );
      
      // Check if Bear scenario doesn't conflict with minimum requirements
      const bearAlignment = await this.checkScenarioAlignment(
        experimentCriteria.bear_scenario,
        goal.target_metrics
      );
      
      if (!bullAlignment.isValid || !beaverAlignment.isValid || !bearAlignment.isValid) {
        validation.isAligned = false;
        validation.issues.push({
          goalId: goal.id,
          issue: "Experiment scenarios don't align with goal targets",
          severity: Severity.HIGH,
          details: {
            bull: bullAlignment,
            beaver: beaverAlignment,
            bear: bearAlignment
          }
        });
      }
    }
    
    validation.alignmentScore = this.calculateValidationScore(validation.issues);
    
    if (!validation.isAligned) {
      validation.recommendations = await this.generateAlignmentRecommendations(validation.issues);
    }
    
    return validation;
  }
  
  async generateMetricFlowDiagram(hierarchy: GoalHierarchy): Promise<string> {
    // Generate ASCII representation of metric cascade
    const diagram = await this.flowDiagramGenerator.generateASCII(hierarchy.metric_cascade);
    
    // Save diagram to file
    const diagramPath = `/workspace/diagrams/metric-flow-${new Date().toISOString().split('T')[0]}.md`;
    await this.tools.write.execute({ 
      file_path: diagramPath, 
      content: `# Metric Flow Diagram\n\nGenerated: ${new Date().toISOString()}\n\n\`\`\`\n${diagram}\n\`\`\`` 
    });
    
    return diagram;
  }
  
  async identifyMetricGaps(currentMetrics: string[], proposedInitiatives: Initiative[]): Promise<MetricGap[]> {
    const gaps: MetricGap[] = [];
    
    for (const initiative of proposedInitiatives) {
      // Check if initiative has measurable success criteria
      if (!initiative.success_metrics || initiative.success_metrics.length === 0) {
        gaps.push({
          type: "missing-success-metrics",
          initiative: initiative.name,
          description: "Initiative lacks measurable success criteria",
          suggested_metrics: await this.suggestMetricsForInitiative(initiative),
          priority: Priority.P1
        });
      }
      
      // Check if metrics ladder up to company goals
      for (const metric of initiative.success_metrics || []) {
        const ladders = await this.checkMetricLaddering(metric, currentMetrics);
        if (!ladders) {
          gaps.push({
            type: "orphaned-metric",
            initiative: initiative.name,
            description: `Metric '${metric}' doesn't ladder up to company goals`,
            suggested_connections: await this.suggestMetricConnections(metric),
            priority: Priority.P2
          });
        }
      }
    }
    
    return gaps;
  }
  
  private async generateMetricCascadeVisualization(cascade: MetricCascade): Promise<string> {
    let visualization = "# Metric Cascade Flow\n\n";
    
    // Company Level
    visualization += "## Company Level Metrics\n\n";
    cascade.company_level.forEach(metric => {
      visualization += `📊 **${metric.name}**: ${metric.target} ${metric.unit}\n`;
      visualization += `   📈 ${metric.description}\n\n`;
    });
    
    // Flow relationships
    visualization += "## Metric Flow Relationships\n\n";
    visualization += "```\n";
    
    for (const relationship of cascade.metric_relationships) {
      visualization += `${relationship.parent_metric}\n`;
      visualization += `├── ${relationship.relationship_type} (${relationship.contribution_weight * 100}%)\n`;
      
      relationship.child_metrics.forEach((child, index) => {
        const isLast = index === relationship.child_metrics.length - 1;
        const prefix = isLast ? "└──" : "├──";
        visualization += `${prefix} ${child}\n`;
      });
      
      visualization += "\n";
    }
    
    visualization += "```\n\n";
    
    // Team Level
    visualization += "## Team Level Metrics\n\n";
    cascade.team_level.forEach(metric => {
      visualization += `🎯 **${metric.name}**: ${metric.target} ${metric.unit}\n`;
      visualization += `   👥 Owner: ${metric.owner_team}\n`;
      visualization += `   📋 ${metric.description}\n\n`;
    });
    
    return visualization;
  }
  
  async proactiveGoalMonitoring(): Promise<void> {
    // Called automatically when goals or metrics are mentioned
    const recentGoalChanges = await this.detectRecentGoalChanges();
    
    if (recentGoalChanges.length > 0) {
      for (const change of recentGoalChanges) {
        // Analyze impact of goal change on cascade
        const impactAnalysis = await this.analyzeGoalChangeImpact(change);
        
        if (impactAnalysis.requires_attention) {
          await this.postGoalChangeAlert(change, impactAnalysis);
        }
      }
    }
    
    // Check for metric drift (actual vs target)
    const metricDrift = await this.detectMetricDrift();
    if (metricDrift.length > 0) {
      await this.postMetricDriftAlert(metricDrift);
    }
  }
  
  private async saveAnalysisResults(analysis: AlignmentAnalysis): Promise<void> {
    // Save to database
    await this.goalDatabase.saveAnalysis(analysis);
    
    // Save detailed report to file
    const reportPath = `/workspace/analyses/goal-alignment-${analysis.analysis_date.split('T')[0]}.md`;
    const report = await this.generateAnalysisReport(analysis);
    await this.tools.write.execute({ file_path: reportPath, content: report });
    
    // Update master analysis index
    await this.updateAnalysisIndex(analysis);
  }
  
  private async generateAnalysisReport(analysis: AlignmentAnalysis): string {
    let report = `# Goal Alignment Analysis\n\n`;
    report += `**Date:** ${analysis.analysis_date}\n`;
    report += `**Alignment Score:** ${analysis.alignment_score}/100\n\n`;
    
    if (analysis.alignment_score >= 80) {
      report += `✅ **Status:** Strong alignment - goals and metrics are well-coordinated\n\n`;
    } else if (analysis.alignment_score >= 60) {
      report += `⚠️ **Status:** Moderate alignment - some improvements needed\n\n`;
    } else {
      report += `🚨 **Status:** Poor alignment - significant inconsistencies detected\n\n`;
    }
    
    // Inconsistencies
    if (analysis.inconsistencies.length > 0) {
      report += `## Inconsistencies Detected (${analysis.inconsistencies.length})\n\n`;
      
      analysis.inconsistencies.forEach((inconsistency, index) => {
        const severityIcon = inconsistency.severity === Severity.HIGH ? "🔴" : 
                           inconsistency.severity === Severity.MEDIUM ? "🟡" : "🟢";
        
        report += `### ${index + 1}. ${inconsistency.type.replace('-', ' ').toUpperCase()} ${severityIcon}\n\n`;
        report += `**Description:** ${inconsistency.description}\n`;
        report += `**Affected Goals:** ${inconsistency.affected_goals.join(', ')}\n`;
        report += `**Business Impact:** ${inconsistency.business_impact}\n`;
        report += `**Suggested Fix:** ${inconsistency.suggested_fix}\n\n`;
      });
    }
    
    // Recommendations
    if (analysis.recommendations.length > 0) {
      report += `## Recommendations (${analysis.recommendations.length})\n\n`;
      
      analysis.recommendations.forEach((rec, index) => {
        report += `### ${index + 1}. ${rec.title}\n\n`;
        report += `**Priority:** ${rec.priority}\n`;
        report += `**Description:** ${rec.description}\n`;
        report += `**Expected Impact:** ${rec.expected_impact}\n`;
        report += `**Implementation:** ${rec.implementation_steps.join(' → ')}\n\n`;
      });
    }
    
    // Orphaned Metrics
    if (analysis.orphaned_metrics.length > 0) {
      report += `## Orphaned Metrics\n\n`;
      report += `The following metrics are not connected to the goal hierarchy:\n\n`;
      analysis.orphaned_metrics.forEach(metric => {
        report += `- ${metric}\n`;
      });
      report += '\n';
    }
    
    return report;
  }
  
  private async postAnalysisComplete(analysis: AlignmentAnalysis): Promise<void> {
    const alignmentStatus = analysis.alignment_score >= 80 ? "Strong" : 
                          analysis.alignment_score >= 60 ? "Moderate" : "Poor";
    
    const post = {
      title: `Goal Alignment Analysis Complete`,
      hook: `${alignmentStatus} alignment detected (${analysis.alignment_score}/100) with ${analysis.inconsistencies.length} inconsistencies`,
      contentBody: `## Analysis Results\n\n**Alignment Score:** ${analysis.alignment_score}/100\n**Status:** ${alignmentStatus} alignment\n\n**Key Findings:**\n- ${analysis.inconsistencies.length} inconsistencies identified\n- ${analysis.recommendations.length} recommendations generated\n- ${analysis.orphaned_metrics.length} orphaned metrics found\n- ${analysis.cascade_breaks.length} cascade breaks detected\n\n**Top Priority Issues:**\n${analysis.inconsistencies.filter(i => i.severity === Severity.HIGH).slice(0, 3).map(i => `- ${i.description}`).join('\n')}`,
      authorAgent: "goal-analyst-agent",
      mentionedAgents: ["chief-of-staff"],
      obsidianUri: `obsidian://open?vault=ProductStrategy&file=goals/analyses/${analysis.analysis_date.split('T')[0]}`
    };
    
    await this.agentFeedPoster.createPost(post);
  }
}
```

### Proactive Monitoring

**PROACTIVE when goals or metrics are discussed:** Automatically triggers analysis
**Works with quarterly goals:** Integrates down to Bull/Beaver/Bear criteria
**Goal cascade alignment:** Identifies metric flow inconsistencies
**Integration:** Validates Bull-Beaver-Bear experiment criteria against goal targets

---

## Cross-Agent Integration for CHUNK 2 Coordination Agents

### Universal CLI Command Interface

```bash
# Meeting workflow commands
meeting() {
  case "$1" in
    "prep")
      curl -X POST "http://localhost:3005/api/agenda/create" \
        -H "Content-Type: application/json" \
        -d "$(echo "$2" | jq -R '{meetingType: "strategy-review", title: .}')"
      ;;
    "process")
      curl -X POST "http://localhost:3006/api/transcript/process" \
        -H "Content-Type: application/json" \
        -d "$(echo "$2" | jq -R '{transcript: .}')"
      ;;
    "followup")
      curl -X POST "http://localhost:3007/api/followup/create" \
        -H "Content-Type: application/json" \
        -d "$(echo "$2" | jq -R '{person: split(":")[0], taskDescription: split(":")[1]}')"
      ;;
  esac
}

# Experiment workflow commands
experiment() {
  case "$1" in
    "framework")
      curl -X POST "http://localhost:3008/api/experiment/create" \
        -H "Content-Type: application/json" \
        -d "$(echo "$2" | jq -R '{experimentName: ., hypothesis: "TBD"}')"
      ;;
    "analyze")
      curl -X POST "http://localhost:3008/api/experiment/$2/analyze" \
        -H "Content-Type: application/json" \
        -d "$(echo "$3" | jq -R '{results: .}')"
      ;;
  esac
}

# Goal analysis commands
goals() {
  case "$1" in
    "analyze")
      curl -X POST "http://localhost:3009/api/goals/analyze"
      ;;
    "validate")
      curl -X POST "http://localhost:3009/api/goals/validate" \
        -H "Content-Type: application/json" \
        -d "$(echo "$2" | jq -R '{experimentCriteria: .}')"
      ;;
    "flow")
      curl "http://localhost:3009/api/goals/flow-diagram"
      ;;
  esac
}
```

### Chief of Staff Routing Matrix for CHUNK 2

```typescript
// Integration with CHUNK 1 Chief of Staff routing
const CHUNK2_ROUTING_MATRIX = {
  // Meeting workflows
  "meeting-prep-needed": {
    target: "meeting-prep-agent",
    trigger: ["agenda", "meeting prep", "meeting planning"],
    handoff_type: HandoffType.COORDINATION_SUPPORT
  },
  
  "meeting-completed": {
    target: "meeting-next-steps-agent", 
    trigger: ["transcript", "meeting notes", "action items"],
    handoff_type: HandoffType.LIFECYCLE_MANAGEMENT
  },
  
  // Task delegation workflows
  "delegation-tracking": {
    target: "follow-ups-agent",
    trigger: ["delegate", "follow up", "check in"],
    handoff_type: HandoffType.DELEGATION_TRACKING
  },
  
  // Experiment workflows  
  "experiment-criteria-needed": {
    target: "bull-beaver-bear-agent",
    trigger: ["test", "experiment", "A/B", "criteria"],
    handoff_type: HandoffType.DECISION_FRAMEWORK,
    required: true // ESSENTIAL before any test
  },
  
  // Goal analysis workflows
  "goal-alignment-check": {
    target: "goal-analyst-agent", 
    trigger: ["goals", "metrics", "alignment", "cascade"],
    handoff_type: HandoffType.PROACTIVE_ANALYSIS,
    proactive: true // Auto-triggers when goals mentioned
  }
};
```

### AgentLink Feed Integration

All coordination agents follow the structured posting format with proper attribution and multi-agent comments for collaborative workflows. Each agent posts outcomes using the standardized template with appropriate `mentionedAgents` arrays to show coordination patterns.

---

## Database Schema


### PostgreSQL Schema

```sql
-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claude_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('pro', 'max')),
    plan_features JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- User Sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(512) UNIQUE NOT NULL,
    refresh_token VARCHAR(512) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Agents
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'suspended', 'error')),
    container_id VARCHAR(255),
    working_directory TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    environment JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE,
    health_status VARCHAR(50) DEFAULT 'unknown',
    health_last_check TIMESTAMP WITH TIME ZONE
);

-- Agent Messages (for audit trail)
CREATE TABLE agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_agent_id UUID REFERENCES agents(id),
    target_agent_id UUID REFERENCES agents(id),
    message_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    priority VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    response JSONB
);

-- Tasks (Personal Todos)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    due_date TIMESTAMP WITH TIME ZONE,
    context_tags TEXT[] DEFAULT '{}',
    source VARCHAR(100) NOT NULL DEFAULT 'user',
    assigned_agent_id UUID REFERENCES agents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Follow-ups (Team Delegation)
CREATE TABLE followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    person VARCHAR(255) NOT NULL,
    task TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'archived')),
    check_in_date TIMESTAMP WITH TIME ZONE,
    context TEXT,
    source_meeting VARCHAR(255),
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT
);

-- Agent Feed Posts
CREATE TABLE feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    hook VARCHAR(1000),
    content_body TEXT NOT NULL,
    author_agent VARCHAR(255) NOT NULL,
    mentioned_agents TEXT[] DEFAULT '{}',
    obsidian_uri TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feed Comments
CREATE TABLE feed_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_agent_response BOOLEAN DEFAULT FALSE,
    agent_id VARCHAR(255),
    agent_name VARCHAR(255),
    agent_display_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory System
CREATE TABLE memory_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic VARCHAR(500) NOT NULL,
    details TEXT NOT NULL,
    category VARCHAR(255),
    entry_type VARCHAR(50) NOT NULL DEFAULT 'remember' CHECK (entry_type IN ('remember', 'insight', 'work')),
    project_name VARCHAR(255),
    duration_minutes INTEGER, -- for work entries
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Full-text search index for memory
CREATE INDEX idx_memory_search ON memory_entries USING GIN (to_tsvector('english', topic || ' ' || details));

-- File System Tracking
CREATE TABLE file_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id),
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('read', 'write', 'edit', 'delete')),
    file_path TEXT NOT NULL,
    content_hash VARCHAR(64), -- SHA-256 hash for change detection
    operation_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Handoffs Tracking
CREATE TABLE agent_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_agent_id UUID REFERENCES agents(id),
    target_agent_id UUID REFERENCES agents(id),
    handoff_type VARCHAR(100) NOT NULL,
    context JSONB NOT NULL,
    expectations TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'acknowledged', 'completed', 'timeout', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    timeout_at TIMESTAMP WITH TIME ZONE,
    result JSONB
);

-- Usage and Billing
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(100) NOT NULL, -- 'claude_api', 'agent_time', 'storage'
    amount DECIMAL(10, 4) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- 'requests', 'minutes', 'bytes'
    cost DECIMAL(8, 4),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Configuration
CREATE TABLE system_config (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_users_claude_id ON users(claude_user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_agents_user ON agents(user_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_followups_user ON followups(user_id);
CREATE INDEX idx_followups_person ON followups(person);
CREATE INDEX idx_followups_status ON followups(status);
CREATE INDEX idx_feed_posts_user ON feed_posts(user_id);
CREATE INDEX idx_feed_comments_post ON feed_comments(post_id);
CREATE INDEX idx_memory_user ON memory_entries(user_id);
CREATE INDEX idx_memory_category ON memory_entries(category);
CREATE INDEX idx_memory_project ON memory_entries(project_name);
CREATE INDEX idx_file_ops_user ON file_operations(user_id);
CREATE INDEX idx_file_ops_agent ON file_operations(agent_id);
CREATE INDEX idx_handoffs_source ON agent_handoffs(source_agent_id);
CREATE INDEX idx_handoffs_target ON agent_handoffs(target_agent_id);
CREATE INDEX idx_usage_user ON usage_tracking(user_id);
CREATE INDEX idx_usage_resource ON usage_tracking(resource_type);
CREATE INDEX idx_usage_date ON usage_tracking(created_at);

-- Initial System Configuration
INSERT INTO system_config (key, value, description) VALUES
('agent_types', '{
  "chief-of-staff": {
    "always_on": true,
    "max_instances": 1,
    "health_check_interval": 30
  },
  "personal-todos": {
    "always_on": false,
    "max_instances": 1,
    "auto_activate": true
  },
  "follow-ups": {
    "always_on": false,
    "max_instances": 1,
    "auto_activate": false
  }
}', 'Agent type configurations'),
('plan_limits', '{
  "pro": {
    "max_agents": 10,
    "api_rate_limit": 1000,
    "storage_limit": "5GB",
    "memory_entries": 10000
  },
  "max": {
    "max_agents": 25,
    "api_rate_limit": 5000,
    "storage_limit": "25GB",
    "memory_entries": 50000
  }
}', 'Plan-based feature limits'),
('system_status', '{
  "maintenance_mode": false,
  "version": "1.0.0",
  "deployed_at": "2024-01-01T00:00:00Z"
}', 'System status and version information');
```

### Redis Schema (for Caching and Sessions)

```typescript
// Redis Key Patterns
interface RedisSchema {
  // User Sessions
  "session:{sessionToken}": {
    userId: string;
    expiresAt: string;
    planType: string;
    features: Record<string, any>;
  };
  
  // Agent Status Cache
  "agent:status:{agentId}": {
    status: string;
    lastHealthCheck: string;
    metrics: Record<string, number>;
  };
  
  // Message Queues
  "agent:{agentId}:messages": AgentMessage[];
  "agent:{agentId}:notifications": string; // PubSub channel
  
  // Rate Limiting
  "ratelimit:{userId}:{resource}": {
    count: number;
    resetTime: string;
  };
  
  // Cache for Memory Search
  "memory:search:{queryHash}": {
    results: MemoryEntry[];
    cachedAt: string;
  };
  
  // Active Handoffs
  "handoff:{handoffId}": {
    sourceAgent: string;
    targetAgent: string;
    status: string;
    context: Record<string, any>;
    createdAt: string;
    timeoutAt: string;
  };
  
  // File Change Detection
  "file:watch:{userId}:{filePath}": {
    lastModified: string;
    contentHash: string;
  };
}

// Redis TTL Settings
const redisTTL = {
  sessions: 7 * 24 * 60 * 60, // 7 days
  agentStatus: 5 * 60, // 5 minutes
  messages: 24 * 60 * 60, // 24 hours
  rateLimit: 60 * 60, // 1 hour
  memorySearch: 30 * 60, // 30 minutes
  handoffs: 60 * 60, // 1 hour
  fileWatch: 24 * 60 * 60 // 24 hours
};
```

### Data Relationships and Constraints

```sql
-- Ensure agent type consistency
ALTER TABLE agents ADD CONSTRAINT check_agent_type 
CHECK (type IN (
  'chief-of-staff',
  'personal-todos',
  'follow-ups',
  'impact-filter',
  'bull-beaver-bear',
  'goal-analyst',
  'meeting-prep',
  'meeting-next-steps',
  'agent-feed',
  'memory-manager',
  'file-manager'
));

-- Ensure only one Chief of Staff per user
CREATE UNIQUE INDEX idx_unique_chief_of_staff 
ON agents(user_id) 
WHERE type = 'chief-of-staff';

-- Ensure priority consistency
ALTER TABLE tasks ADD CONSTRAINT check_fibonacci_priority
CHECK (priority IN ('P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'));

-- Automatic updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_followups_updated_at BEFORE UPDATE ON followups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feed_posts_updated_at BEFORE UPDATE ON feed_posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memory_entries_updated_at BEFORE UPDATE ON memory_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Database Migration Strategy

```typescript
// migrations/001_initial_schema.ts
export async function up(db: Database): Promise<void> {
  // Create all tables with proper indexes
  await db.execute(readFileSync('./schema.sql', 'utf8'));
}

export async function down(db: Database): Promise<void> {
  // Drop all tables in reverse dependency order
  const tables = [
    'usage_tracking', 'agent_handoffs', 'file_operations',
    'memory_entries', 'feed_comments', 'feed_posts',
    'followups', 'tasks', 'agent_messages', 'agents',
    'user_sessions', 'users', 'system_config'
  ];
  
  for (const table of tables) {
    await db.execute(`DROP TABLE IF EXISTS ${table} CASCADE;`);
  }
}

// Database connection and migration runner
class DatabaseManager {
  private db: Database;
  
  async initialize(): Promise<void> {
    this.db = new Database(process.env.DATABASE_URL!);
    await this.runMigrations();
  }
  
  private async runMigrations(): Promise<void> {
    // Check current migration version
    const currentVersion = await this.getCurrentVersion();
    const migrationFiles = await this.getMigrationFiles();
    
    for (const migration of migrationFiles) {
      if (migration.version > currentVersion) {
        console.log(`Running migration ${migration.version}...`);
        await migration.up(this.db);
        await this.updateVersion(migration.version);
      }
    }
  }
}
```

---

## Deployment Guide

### VPS Requirements

#### Minimum System Requirements

```yaml
Minimum Specifications:
  CPU: 4 cores (Intel/AMD x64)
  RAM: 8GB
  Storage: 100GB SSD
  Network: 1Gbps connection
  OS: Ubuntu 22.04 LTS / CentOS 8 / Debian 11

Recommended Specifications:
  CPU: 8 cores (Intel/AMD x64)
  RAM: 16GB
  Storage: 250GB SSD
  Network: 1Gbps+ connection
  OS: Ubuntu 22.04 LTS

Production Specifications:
  CPU: 16 cores (Intel/AMD x64)
  RAM: 32GB
  Storage: 500GB SSD + 1TB backup
  Network: 10Gbps connection
  OS: Ubuntu 22.04 LTS
  Backup: Daily automated backups
```

#### Software Prerequisites

```bash
# Required Software Stack
docker: ">=24.0.0"
docker-compose: ">=2.20.0"
nginx: ">=1.22.0"
certbot: "latest" # for SSL certificates
fail2ban: "latest" # for security
ufw: "latest" # firewall

# Optional but Recommended
prometheus: "latest" # monitoring
grafana: "latest" # dashboards
elasticsearch: "latest" # logging
kibana: "latest" # log visualization
```

### Automated Installation Script

```bash
#!/bin/bash
# install-claude-code-vps.sh
# Automated installation script for Claude Code VPS

set -e

# Configuration
CLAUDE_CODE_VERSION="1.0.0"
INSTALL_DIR="/opt/claude-code"
DATA_DIR="/var/lib/claude-code"
LOG_DIR="/var/log/claude-code"
USER="claude-code"
DOMAIN="your-domain.com"
EMAIL="admin@your-domain.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root"
fi

log "Starting Claude Code VPS installation..."

# System Update
log "Updating system packages..."
apt update && apt upgrade -y

# Install Docker
log "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    log "Docker already installed"
fi

# Install Docker Compose
log "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    log "Docker Compose already installed"
fi

# Install Nginx
log "Installing Nginx..."
apt install -y nginx
systemctl enable nginx

# Install Certbot
log "Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Install Security Tools
log "Installing security tools..."
apt install -y fail2ban ufw

# Create Claude Code user
log "Creating claude-code user..."
if ! id "$USER" &>/dev/null; then
    useradd -r -s /bin/false -d $INSTALL_DIR $USER
fi

# Create directories
log "Creating directories..."
mkdir -p $INSTALL_DIR
mkdir -p $DATA_DIR
mkdir -p $LOG_DIR
mkdir -p $DATA_DIR/postgres
mkdir -p $DATA_DIR/redis
mkdir -p $DATA_DIR/agent-workspace
mkdir -p $DATA_DIR/obsidian-vault

# Set permissions
chown -R $USER:$USER $INSTALL_DIR
chown -R $USER:$USER $DATA_DIR
chown -R $USER:$USER $LOG_DIR

# Download Claude Code
log "Downloading Claude Code VPS..."
cd $INSTALL_DIR
wget -O claude-code-vps.tar.gz "https://github.com/your-org/claude-code-vps/releases/download/v$CLAUDE_CODE_VERSION/claude-code-vps.tar.gz"
tar -xzf claude-code-vps.tar.gz
rm claude-code-vps.tar.gz

# Copy configuration files
log "Setting up configuration..."
cp config/docker-compose.prod.yml docker-compose.yml
cp config/nginx.conf /etc/nginx/sites-available/claude-code
cp config/fail2ban.conf /etc/fail2ban/jail.d/claude-code.conf

# Configure environment
log "Configuring environment..."
cat > .env << EOF
# Claude Code VPS Configuration
ENVIRONMENT=production
DOMAIN=$DOMAIN
EMAIL=$EMAIL

# Database
DATABASE_URL=postgresql://claude_user:$(openssl rand -base64 32)@postgres:5432/claude_code
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 64)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Claude API
CLAUDE_API_KEY=your-claude-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
LOKI_ENABLED=true

# Storage
DATA_DIR=$DATA_DIR
LOG_DIR=$LOG_DIR
EOF

# Configure Nginx
log "Configuring Nginx..."
sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/claude-code
ln -sf /etc/nginx/sites-available/claude-code /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

# Configure SSL
log "Setting up SSL certificates..."
certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

# Configure Firewall
log "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Start services
log "Starting services..."
systemctl restart nginx
systemctl restart fail2ban

# Pull Docker images
log "Pulling Docker images..."
docker-compose pull

# Start Claude Code
log "Starting Claude Code VPS..."
docker-compose up -d

# Wait for services to be ready
log "Waiting for services to start..."
sleep 30

# Run database migrations
log "Running database migrations..."
docker-compose exec api npm run migrate:up

# Create initial admin user (if needed)
log "Setting up initial configuration..."
docker-compose exec api npm run setup:initial

# Setup monitoring
if [[ "$PROMETHEUS_ENABLED" == "true" ]]; then
    log "Setting up monitoring..."
    docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
fi

# Setup log rotation
log "Setting up log rotation..."
cat > /etc/logrotate.d/claude-code << EOF
$LOG_DIR/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        docker-compose -f $INSTALL_DIR/docker-compose.yml restart api
    endscript
}
EOF

# Setup systemd service
log "Creating systemd service..."
cat > /etc/systemd/system/claude-code.service << EOF
[Unit]
Description=Claude Code VPS
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable claude-code

# Setup backup script
log "Setting up backup system..."
cat > /usr/local/bin/claude-code-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/claude-code"
DATE=$(date +%Y%m%d_%H%M%S)
INSTALL_DIR="/opt/claude-code"
DATA_DIR="/var/lib/claude-code"

mkdir -p $BACKUP_DIR

# Database backup
docker-compose -f $INSTALL_DIR/docker-compose.yml exec -T postgres pg_dump -U claude_user claude_code | gzip > $BACKUP_DIR/database_$DATE.sql.gz

# Data backup
tar -czf $BACKUP_DIR/data_$DATE.tar.gz -C $DATA_DIR .

# Configuration backup
tar -czf $BACKUP_DIR/config_$DATE.tar.gz -C $INSTALL_DIR --exclude=data --exclude=logs .

# Clean old backups (keep 7 days)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/claude-code-backup.sh

# Setup daily backup cron
echo "0 2 * * * /usr/local/bin/claude-code-backup.sh >> /var/log/claude-code-backup.log 2>&1" | crontab -

# Health check script
log "Setting up health monitoring..."
cat > /usr/local/bin/claude-code-health.sh << 'EOF'
#!/bin/bash
INSTALL_DIR="/opt/claude-code"
LOG_FILE="/var/log/claude-code-health.log"

cd $INSTALL_DIR

# Check container health
if ! docker-compose ps | grep -q "Up"; then
    echo "$(date): Some containers are not running, attempting restart..." >> $LOG_FILE
    docker-compose up -d
fi

# Check API health
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "$(date): API health check failed, restarting API..." >> $LOG_FILE
    docker-compose restart api
fi

# Check Chief of Staff health
if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "$(date): Chief of Staff health check failed, restarting..." >> $LOG_FILE
    docker-compose restart chief-of-staff
fi
EOF

chmod +x /usr/local/bin/claude-code-health.sh

# Setup health check cron (every 5 minutes)
echo "*/5 * * * * /usr/local/bin/claude-code-health.sh" | crontab -

# Final status check
log "Performing final status check..."
sleep 10

if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    log "✓ API server is healthy"
else
    warn "⚠ API server health check failed"
fi

if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    log "✓ Chief of Staff agent is healthy"
else
    warn "⚠ Chief of Staff health check failed"
fi

if docker-compose ps | grep -q "Up.*healthy"; then
    log "✓ All containers are running"
else
    warn "⚠ Some containers may not be healthy"
fi

log "Installation completed!"
log "Access your Claude Code VPS at: https://$DOMAIN"
log "Monitoring dashboard: https://$DOMAIN/grafana (admin/admin)"
log "System logs: $LOG_DIR"
log "Backup location: /var/backups/claude-code"

log "Next steps:"
log "1. Configure your Claude API key in the web interface"
log "2. Set up your Supabase integration"
log "3. Configure Obsidian vault synchronization"
log "4. Import your existing agent workspace (if any)"

log "For support, check the documentation at: https://docs.claude-code-vps.com"
```

### Docker Configuration

#### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Reverse Proxy and Load Balancer
  nginx:
    image: nginx:alpine
    container_name: claude-code-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/ssl:/etc/nginx/ssl:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - api
      - frontend
    networks:
      - claude-code-network

  # Frontend Application
  frontend:
    image: claude-code/frontend:${CLAUDE_CODE_VERSION:-latest}
    container_name: claude-code-frontend
    restart: always
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
    networks:
      - claude-code-network

  # API Server
  api:
    image: claude-code/api:${CLAUDE_CODE_VERSION:-latest}
    container_name: claude-code-api
    restart: always
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    volumes:
      - ${DATA_DIR}/agent-workspace:/workspace
      - ${LOG_DIR}:/logs
    depends_on:
      - postgres
      - redis
      - chief-of-staff
    networks:
      - claude-code-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # Chief of Staff Agent (Always-On)
  chief-of-staff:
    image: claude-code/chief-of-staff:${CLAUDE_CODE_VERSION:-latest}
    container_name: claude-code-chief-of-staff
    restart: always
    environment:
      - NODE_ENV=production
      - AGENT_TYPE=chief-of-staff
      - ALWAYS_ON=true
      - HEALTH_CHECK_INTERVAL=30
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ${DATA_DIR}/agent-workspace/chief-of-staff:/workspace
      - ${DATA_DIR}/agent-workspace:/shared
    depends_on:
      - postgres
      - redis
    networks:
      - claude-code-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # Dynamic Agent Pool
  agent-pool:
    image: claude-code/agent-base:${CLAUDE_CODE_VERSION:-latest}
    restart: always
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        order: start-first
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    environment:
      - NODE_ENV=production
      - AGENT_TYPE=dynamic
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ${DATA_DIR}/agent-workspace:/workspace
      - ${DATA_DIR}/agent-workspace:/shared
    depends_on:
      - chief-of-staff
      - postgres
      - redis
    networks:
      - claude-code-network

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: claude-code-postgres
    restart: always
    environment:
      - POSTGRES_DB=claude_code
      - POSTGRES_USER=claude_user
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C
    volumes:
      - ${DATA_DIR}/postgres:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - claude-code-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U claude_user -d claude_code"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # Redis Cache and Message Queue
  redis:
    image: redis:7-alpine
    container_name: claude-code-redis
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - ${DATA_DIR}/redis:/data
    networks:
      - claude-code-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # File System Watcher
  file-watcher:
    image: claude-code/file-watcher:${CLAUDE_CODE_VERSION:-latest}
    container_name: claude-code-file-watcher
    restart: always
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ${DATA_DIR}/agent-workspace:/workspace:ro
      - ${DATA_DIR}/obsidian-vault:/obsidian:ro
    depends_on:
      - postgres
      - redis
    networks:
      - claude-code-network

networks:
  claude-code-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  postgres-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${DATA_DIR}/postgres
  
  redis-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${DATA_DIR}/redis
  
  agent-workspace:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${DATA_DIR}/agent-workspace
```

#### Monitoring Stack

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  # Prometheus Metrics Collection
  prometheus:
    image: prom/prometheus:latest
    container_name: claude-code-prometheus
    restart: always
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - claude-code-network

  # Grafana Dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: claude-code-grafana
    restart: always
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./config/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./config/grafana/dashboards:/var/lib/grafana/dashboards:ro
    depends_on:
      - prometheus
    networks:
      - claude-code-network

  # Node Exporter for System Metrics
  node-exporter:
    image: prom/node-exporter:latest
    container_name: claude-code-node-exporter
    restart: always
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - claude-code-network

  # Loki Log Aggregation
  loki:
    image: grafana/loki:latest
    container_name: claude-code-loki
    restart: always
    ports:
      - "3100:3100"
    volumes:
      - ./config/loki.yml:/etc/loki/local-config.yaml:ro
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - claude-code-network

  # Promtail Log Collection
  promtail:
    image: grafana/promtail:latest
    container_name: claude-code-promtail
    restart: always
    volumes:
      - ./config/promtail.yml:/etc/promtail/config.yml:ro
      - ${LOG_DIR}:/logs:ro
      - /var/log:/var/log:ro
    command: -config.file=/etc/promtail/config.yml
    depends_on:
      - loki
    networks:
      - claude-code-network

  # AlertManager for Alerts
  alertmanager:
    image: prom/alertmanager:latest
    container_name: claude-code-alertmanager
    restart: always
    ports:
      - "9093:9093"
    volumes:
      - ./config/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager-data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - claude-code-network

volumes:
  prometheus-data:
  grafana-data:
  loki-data:
  alertmanager-data:

networks:
  claude-code-network:
    external: true
```

### Environment Configuration

#### Production Environment Variables

```bash
# .env.production
# Claude Code VPS Production Configuration

# Environment
ENVIRONMENT=production
NODE_ENV=production
DOMAIN=your-domain.com
EMAIL=admin@your-domain.com
CLAUDE_CODE_VERSION=1.0.0

# Database Configuration
DATABASE_URL=postgresql://claude_user:${POSTGRES_PASSWORD}@postgres:5432/claude_code
POSTGRES_PASSWORD=your-secure-postgres-password
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
REDIS_PASSWORD=your-secure-redis-password

# Security Configuration
JWT_SECRET=your-jwt-secret-key-64-chars-minimum
SESSION_SECRET=your-session-secret-key-64-chars-minimum
ENCRYPTION_KEY=your-encryption-key-32-chars
HASH_ROUNDS=12

# Claude API Integration
CLAUDE_API_KEY=your-claude-api-key
CLAUDE_API_BASE_URL=https://api.anthropic.com
CLAUDE_API_VERSION=2023-06-01

# Supabase Authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# External Integrations
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
OBSIDIAN_SYNC_ENABLED=true
OBSIDIAN_VAULT_PATH=/data/obsidian-vault

# Storage Configuration
DATA_DIR=/var/lib/claude-code
LOG_DIR=/var/log/claude-code
WORKSPACE_DIR=/var/lib/claude-code/agent-workspace
BACKUP_DIR=/var/backups/claude-code

# Monitoring Configuration
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
GRAFANA_ADMIN_PASSWORD=your-grafana-admin-password
LOKI_ENABLED=true
ALERTMANAGER_ENABLED=true

# Performance Configuration
API_RATE_LIMIT_WINDOW=3600000  # 1 hour in ms
API_RATE_LIMIT_MAX_REQUESTS=5000
AGENT_POOL_SIZE=3
AGENT_TIMEOUT=300000  # 5 minutes in ms
HEALTH_CHECK_INTERVAL=30000  # 30 seconds in ms

# Feature Flags
CHIEF_OF_STAFF_ALWAYS_ON=true
AUTO_SCALING_ENABLED=true
BACKGROUND_MONITORING_ENABLED=true
AUTOMATIC_POSTING_ENABLED=true
FILE_WATCHING_ENABLED=true

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_INTERVAL=daily
BACKUP_RETENTION_DAYS=30
S3_BACKUP_ENABLED=false
S3_BUCKET_NAME=your-backup-bucket
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# SSL Configuration
SSL_ENABLED=true
SSL_CERT_PATH=/etc/letsencrypt/live/${DOMAIN}/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/${DOMAIN}/privkey.pem
SSL_AUTO_RENEWAL=true

# Security Headers
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true
X_FRAME_OPTIONS=DENY
X_CONTENT_TYPE_OPTIONS=nosniff

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
LOG_ROTATION_ENABLED=true
LOG_MAX_SIZE=100M
LOG_MAX_FILES=10
```

### SSL and Security Configuration

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/claude-code
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/your-domain.com/chain.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA:!aNULL:!MD5:!DSS;
    ssl_prefer_server_ciphers on;
    ssl_dhparam /etc/nginx/ssl/dhparam.pem;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security Headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self'; object-src 'none'; media-src 'self'; form-action 'self'; frame-ancestors 'none';" always;

    # General Settings
    client_max_body_size 100M;
    keepalive_timeout 65;
    server_tokens off;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

    # Main Application
    location / {
        proxy_pass http://claude-code-frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # API Endpoints
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://claude-code-api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Authentication Endpoints (stricter rate limiting)
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://claude-code-api:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Monitoring Endpoints
    location /grafana/ {
        auth_basic "Monitoring Access";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://claude-code-grafana:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /prometheus/ {
        auth_basic "Monitoring Access";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://claude-code-prometheus:9090/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health Checks (no auth required)
    location /health {
        proxy_pass http://claude-code-api:3000/health;
        access_log off;
    }

    # Static Assets Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ /\.well-known {
        allow all;
    }
}
```

#### Fail2Ban Configuration

```ini
# /etc/fail2ban/jail.d/claude-code.conf
[claude-code-auth]
enabled = true
port = http,https
filter = claude-code-auth
logpath = /var/log/claude-code/auth.log
maxretry = 3
bantime = 3600
findtime = 600

[claude-code-api]
enabled = true
port = http,https
filter = claude-code-api
logpath = /var/log/claude-code/api.log
maxretry = 10
bantime = 1800
findtime = 300

[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600
findtime = 600
```

```ini
# /etc/fail2ban/filter.d/claude-code-auth.conf
[Definition]
failregex = ^.*"POST /api/auth/.*" 40[01] .*$
            ^.*"POST /api/auth/.*" 429 .*$
ignoreregex =
```

```ini
# /etc/fail2ban/filter.d/claude-code-api.conf
[Definition]
failregex = ^.*".*" 40[0-9] .*$
            ^.*".*" 429 .*$
ignoreregex = ^.*"GET /health.*" .*$
              ^.*"GET /metrics.*" .*$
```

### Monitoring and Alerting Setup

#### Prometheus Configuration

```yaml
# config/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'claude-code-api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'claude-code-chief-of-staff'
    static_configs:
      - targets: ['chief-of-staff:3001']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
    metrics_path: '/metrics'

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

#### Alert Rules

```yaml
# config/alert_rules.yml
groups:
  - name: claude-code-alerts
    rules:
      - alert: APIDown
        expr: up{job="claude-code-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Claude Code API is down"
          description: "The Claude Code API has been down for more than 1 minute."

      - alert: ChiefOfStaffDown
        expr: up{job="claude-code-chief-of-staff"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Chief of Staff agent is down"
          description: "The Chief of Staff agent has been down for more than 1 minute."

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 90% for more than 5 minutes."

      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% for more than 5 minutes."

      - alert: DiskSpaceLow
        expr: (1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space"
          description: "Disk space usage is above 85% for more than 5 minutes."

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL database is down"
          description: "The PostgreSQL database has been down for more than 1 minute."

      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"
          description: "Redis has been down for more than 1 minute."
```

---

---

## Feature Specifications

### Core Features Implementation

#### 1. Agent Lifecycle Management

```typescript
// Agent Lifecycle Controller
class AgentLifecycleController {
  private containerManager: ContainerManager;
  private agentRegistry: AgentRegistry;
  private healthMonitor: HealthMonitor;
  
  async createAgent(request: CreateAgentRequest): Promise<Agent> {
    // Validate user plan limits
    await this.validatePlanLimits(request.userId, request.agentType);
    
    // Create working directory
    const workingDir = await this.createWorkingDirectory(request.agentType, request.userId);
    
    // Generate agent configuration
    const config = await this.generateAgentConfig(request, workingDir);
    
    // Create and start container
    const container = await this.containerManager.createContainer({
      image: `claude-code/${request.agentType}:latest`,
      environment: config.environment,
      volumes: config.volumes,
      networks: ['claude-code-network'],
      healthCheck: config.healthCheck
    });
    
    // Register agent
    const agent = await this.agentRegistry.register({
      id: generateUUID(),
      userId: request.userId,
      type: request.agentType,
      containerId: container.id,
      workingDirectory: workingDir,
      config: config,
      status: 'starting'
    });
    
    // Start health monitoring
    await this.healthMonitor.startMonitoring(agent.id);
    
    return agent;
  }
  
  async activateAgent(agentId: string): Promise<void> {
    const agent = await this.agentRegistry.get(agentId);
    if (!agent) throw new Error('Agent not found');
    
    // Start container if not running
    if (agent.status !== 'active') {
      await this.containerManager.startContainer(agent.containerId);
      
      // Wait for health check
      await this.waitForHealthy(agentId, 60000); // 60 second timeout
      
      // Update status
      await this.agentRegistry.updateStatus(agentId, 'active');
      
      // Notify Chief of Staff
      await this.notifyChiefOfStaff('agent_activated', { agentId, type: agent.type });
    }
  }
  
  async deactivateAgent(agentId: string): Promise<void> {
    const agent = await this.agentRegistry.get(agentId);
    if (!agent) throw new Error('Agent not found');
    
    // Save current state
    await this.saveAgentState(agentId);
    
    // Stop container gracefully
    await this.containerManager.stopContainer(agent.containerId, 30000); // 30 second timeout
    
    // Update status
    await this.agentRegistry.updateStatus(agentId, 'inactive');
    
    // Stop health monitoring
    await this.healthMonitor.stopMonitoring(agentId);
  }
  
  private async validatePlanLimits(userId: string, agentType: string): Promise<void> {
    const user = await this.userService.getUser(userId);
    const activeAgents = await this.agentRegistry.getActiveAgents(userId);
    const planLimits = await this.getPlanLimits(user.planType);
    
    if (activeAgents.length >= planLimits.maxAgents) {
      throw new Error(`Plan limit reached: maximum ${planLimits.maxAgents} agents`);
    }
    
    // Check agent-specific limits
    if (agentType === 'chief-of-staff') {
      const existingChief = activeAgents.find(a => a.type === 'chief-of-staff');
      if (existingChief) {
        throw new Error('Only one Chief of Staff agent allowed per user');
      }
    }
  }
}
```

#### 2. Task Management System

```typescript
// Task Management Service
class TaskManagementService {
  private db: Database;
  private fibonacciPriority: FibonacciPrioritySystem;
  private agentFeed: AgentFeedService;
  
  async createTask(request: CreateTaskRequest): Promise<Task> {
    // Calculate IMPACT-based priority
    const priority = this.fibonacciPriority.calculatePriority(request.impact);
    
    const task: Task = {
      id: generateUUID(),
      userId: request.userId,
      title: request.title,
      description: request.description,
      priority,
      status: TaskStatus.ACTIVE,
      dueDate: request.dueDate,
      contextTags: request.contextTags || [],
      source: request.source || 'user',
      assignedAgentId: request.assignedAgentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    await this.db.tasks.create(task);
    
    // Post to agent feed if high priority
    if (this.isHighPriority(priority)) {
      await this.postTaskToFeed(task);
    }
    
    // Notify assigned agent
    if (task.assignedAgentId) {
      await this.notifyAgent(task.assignedAgentId, 'new_task', task);
    }
    
    return task;
  }
  
  async generateHitlist(userId: string): Promise<Hitlist> {
    const activeTasks = await this.db.tasks.findMany({
      where: { userId, status: TaskStatus.ACTIVE },
      orderBy: { priority: 'asc' }
    });
    
    const prioritizedTasks = activeTasks
      .sort((a, b) => this.fibonacciPriority.compare(a.priority, b.priority))
      .slice(0, 3);
    
    const hitlist: Hitlist = {
      id: generateUUID(),
      userId,
      tasks: prioritizedTasks,
      generatedAt: new Date().toISOString(),
      summary: `Top 3 priorities: ${prioritizedTasks.map(t => t.title).join(', ')}`
    };
    
    return hitlist;
  }
  
  async completeTask(taskId: string, completionNotes?: string): Promise<void> {
    const task = await this.db.tasks.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Task not found');
    
    // Update task status
    await this.db.tasks.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    
    // Post completion to agent feed if substantial impact
    if (this.isSubstantialImpact(task)) {
      await this.postTaskCompletion(task, completionNotes);
    }
    
    // Update user statistics
    await this.updateUserStats(task.userId, 'task_completed');
  }
  
  private isHighPriority(priority: Priority): boolean {
    return [Priority.P0, Priority.P1, Priority.P2].includes(priority);
  }
  
  private isSubstantialImpact(task: Task): boolean {
    // Check if task has business impact > $10K threshold
    return task.contextTags.includes('high-impact') || 
           task.priority <= Priority.P2;
  }
}
```

#### 3. Follow-ups and Delegation System

```typescript
// Follow-ups Management Service
class FollowupsService {
  private db: Database;
  private notificationService: NotificationService;
  
  async createFollowup(request: CreateFollowupRequest): Promise<Followup> {
    const followup: Followup = {
      id: generateUUID(),
      userId: request.userId,
      person: request.person,
      task: request.task,
      dueDate: request.dueDate,
      status: FollowupStatus.ACTIVE,
      checkInDate: request.checkInDate,
      context: request.context,
      sourceMeeting: request.sourceMeeting,
      createdBy: request.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.db.followups.create(followup);
    
    // Schedule check-in reminder
    if (followup.checkInDate) {
      await this.scheduleCheckInReminder(followup);
    }
    
    return followup;
  }
  
  async getFollowupsByPerson(userId: string): Promise<GroupedFollowups> {
    const followups = await this.db.followups.findMany({
      where: { userId },
      orderBy: [{ person: 'asc' }, { dueDate: 'asc' }]
    });
    
    // Group by person
    const grouped = followups.reduce((acc, followup) => {
      if (!acc[followup.person]) {
        acc[followup.person] = [];
      }
      acc[followup.person].push(followup);
      return acc;
    }, {} as Record<string, Followup[]>);
    
    return {
      followups,
      groupedByPerson: grouped,
      overdue: followups.filter(f => this.isOverdue(f)),
      dueToday: followups.filter(f => this.isDueToday(f))
    };
  }
  
  async markCompleted(followupId: string, completionNotes: string): Promise<void> {
    await this.db.followups.update({
      where: { id: followupId },
      data: {
        status: FollowupStatus.COMPLETED,
        completedAt: new Date().toISOString(),
        completionNotes,
        updatedAt: new Date().toISOString()
      }
    });
    
    const followup = await this.db.followups.findUnique({ where: { id: followupId } });
    if (followup) {
      await this.postCompletionToFeed(followup, completionNotes);
    }
  }
  
  async checkOverdue(): Promise<OverdueReport> {
    const overdueFollowups = await this.db.followups.findMany({
      where: {
        status: FollowupStatus.ACTIVE,
        dueDate: { lt: new Date().toISOString() }
      }
    });
    
    // Update status to overdue
    for (const followup of overdueFollowups) {
      await this.db.followups.update({
        where: { id: followup.id },
        data: { status: FollowupStatus.OVERDUE }
      });
    }
    
    // Generate overdue report
    const report: OverdueReport = {
      count: overdueFollowups.length,
      followups: overdueFollowups,
      byPerson: this.groupByPerson(overdueFollowups),
      generatedAt: new Date().toISOString()
    };
    
    return report;
  }
  
  private async scheduleCheckInReminder(followup: Followup): Promise<void> {
    const reminderTime = new Date(followup.checkInDate!);
    reminderTime.setHours(9, 0, 0, 0); // 9 AM on check-in date
    
    await this.notificationService.scheduleNotification({
      id: generateUUID(),
      userId: followup.userId,
      type: 'followup_reminder',
      title: `Follow-up reminder: ${followup.person}`,
      message: `Check in on: ${followup.task}`,
      scheduledAt: reminderTime.toISOString(),
      data: { followupId: followup.id }
    });
  }
}
```

#### 4. Agent Feed and Communication System

```typescript
// Agent Feed Service
class AgentFeedService {
  private db: Database;
  private commentService: CommentService;
  private notificationService: NotificationService;
  
  async createPost(request: CreatePostRequest): Promise<FeedPost> {
    // Validate mandatory posting criteria
    if (!this.shouldPost(request)) {
      throw new Error('Post does not meet posting criteria');
    }
    
    const post: FeedPost = {
      id: generateUUID(),
      userId: request.userId,
      title: request.title,
      hook: request.hook,
      contentBody: request.contentBody,
      authorAgent: request.authorAgent,
      mentionedAgents: request.mentionedAgents || [],
      obsidianUri: request.obsidianUri,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.db.feedPosts.create(post);
    
    // Notify mentioned agents
    if (post.mentionedAgents.length > 0) {
      await this.notifyMentionedAgents(post);
    }
    
    // Trigger multi-agent commenting workflow if applicable
    if (request.enableMultiAgentComments) {
      await this.initiateMultiAgentComments(post);
    }
    
    return post;
  }
  
  async addComment(postId: string, request: CreateCommentRequest): Promise<FeedComment> {
    const comment: FeedComment = {
      id: generateUUID(),
      postId,
      userId: request.userId,
      content: request.content,
      isAgentResponse: request.isAgentResponse || false,
      agentId: request.agentId,
      agentName: request.agentName,
      agentDisplayName: request.agentDisplayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.db.feedComments.create(comment);
    
    // Update post comment count
    await this.db.feedPosts.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } }
    });
    
    return comment;
  }
  
  async getFeed(userId: string, options: FeedOptions = {}): Promise<FeedResponse> {
    const posts = await this.db.feedPosts.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
      include: {
        comments: {
          orderBy: { createdAt: 'asc' },
          take: 5 // Show latest 5 comments per post
        }
      }
    });
    
    return {
      posts,
      hasMore: posts.length === (options.limit || 50),
      totalCount: await this.db.feedPosts.count({ where: { userId } })
    };
  }
  
  private shouldPost(request: CreatePostRequest): boolean {
    // Check mandatory posting criteria
    const hasBusinessImpact = request.contentBody.includes('$') || 
                              request.contentBody.includes('revenue') ||
                              request.contentBody.includes('cost');
    
    const isSubstantialOutcome = request.title.includes('completed') ||
                                request.title.includes('analysis') ||
                                request.title.includes('decision');
    
    const isStrategicWork = request.mentionedAgents.includes('chief-of-staff') ||
                           request.authorAgent === 'chief-of-staff';
    
    return hasBusinessImpact || isSubstantialOutcome || isStrategicWork;
  }
  
  private async initiateMultiAgentComments(post: FeedPost): Promise<void> {
    // Get contributing agents from mentioned agents
    const contributingAgents = post.mentionedAgents.filter(agent => 
      agent !== 'chief-of-staff' && agent !== post.authorAgent
    );
    
    // Chief of Staff comments first
    if (post.mentionedAgents.includes('chief-of-staff')) {
      await this.addComment(post.id, {
        userId: post.userId,
        content: "Coordinated multi-agent workflow ensuring strategic alignment",
        isAgentResponse: true,
        agentId: "chief-of-staff-uuid",
        agentName: "chief-of-staff",
        agentDisplayName: "Chief of Staff"
      });
    }
    
    // Contributing agents comment on their specific contributions
    for (const agentName of contributingAgents) {
      const contribution = await this.getAgentContribution(agentName, post);
      if (contribution) {
        await this.addComment(post.id, {
          userId: post.userId,
          content: contribution,
          isAgentResponse: true,
          agentId: `${agentName}-uuid`,
          agentName,
          agentDisplayName: this.getAgentDisplayName(agentName)
        });
      }
    }
  }
}
```

#### 5. Memory System Integration

```typescript
// Memory Management Service
class MemoryService {
  private db: Database;
  private searchEngine: SearchEngine;
  private cache: CacheService;
  
  async remember(request: RememberRequest): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: generateUUID(),
      userId: request.userId,
      topic: request.topic,
      details: request.details,
      category: request.category,
      entryType: 'remember',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.db.memoryEntries.create(entry);
    
    // Update search index
    await this.searchEngine.indexEntry(entry);
    
    // Clear search cache for this user
    await this.cache.clearPattern(`memory:search:${request.userId}:*`);
    
    return entry;
  }
  
  async recordInsight(request: InsightRequest): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: generateUUID(),
      userId: request.userId,
      topic: `Insight: ${request.text.substring(0, 100)}...`,
      details: request.text,
      category: request.category,
      entryType: 'insight',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.db.memoryEntries.create(entry);
    await this.searchEngine.indexEntry(entry);
    
    return entry;
  }
  
  async recordWork(request: WorkRequest): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: generateUUID(),
      userId: request.userId,
      topic: `Work Session: ${request.description}`,
      details: request.description,
      category: 'work',
      entryType: 'work',
      projectName: request.project,
      durationMinutes: request.duration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.db.memoryEntries.create(entry);
    await this.searchEngine.indexEntry(entry);
    
    return entry;
  }
  
  async search(userId: string, query: string, options: SearchOptions = {}): Promise<SearchResult> {
    // Check cache first
    const cacheKey = `memory:search:${userId}:${this.hashQuery(query)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Perform full-text search
    const searchResults = await this.db.memoryEntries.findMany({
      where: {
        userId,
        AND: [
          {
            OR: [
              { topic: { contains: query, mode: 'insensitive' } },
              { details: { contains: query, mode: 'insensitive' } }
            ]
          },
          options.category ? { category: options.category } : {},
          options.entryType ? { entryType: options.entryType } : {}
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20
    });
    
    // Enhanced search with relevance scoring
    const scoredResults = searchResults.map(entry => ({
      ...entry,
      relevanceScore: this.calculateRelevanceScore(entry, query)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    const result: SearchResult = {
      entries: scoredResults,
      totalCount: scoredResults.length,
      query,
      searchedAt: new Date().toISOString()
    };
    
    // Cache results for 30 minutes
    await this.cache.set(cacheKey, result, 1800);
    
    return result;
  }
  
  async getProjectSummary(userId: string, projectName: string): Promise<ProjectSummary> {
    const workEntries = await this.db.memoryEntries.findMany({
      where: {
        userId,
        projectName,
        entryType: 'work'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const relatedEntries = await this.db.memoryEntries.findMany({
      where: {
        userId,
        OR: [
          { topic: { contains: projectName, mode: 'insensitive' } },
          { details: { contains: projectName, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const totalDuration = workEntries.reduce((sum, entry) => 
      sum + (entry.durationMinutes || 0), 0
    );
    
    return {
      projectName,
      workSessions: workEntries.length,
      totalDurationMinutes: totalDuration,
      relatedEntries: relatedEntries.length,
      firstEntry: workEntries[workEntries.length - 1]?.createdAt,
      lastEntry: workEntries[0]?.createdAt,
      summary: this.generateProjectSummary(workEntries, relatedEntries)
    };
  }
  
  private calculateRelevanceScore(entry: MemoryEntry, query: string): number {
    const queryTerms = query.toLowerCase().split(' ');
    let score = 0;
    
    // Title match (higher weight)
    const titleMatches = queryTerms.filter(term => 
      entry.topic.toLowerCase().includes(term)
    ).length;
    score += titleMatches * 3;
    
    // Content match
    const contentMatches = queryTerms.filter(term => 
      entry.details.toLowerCase().includes(term)
    ).length;
    score += contentMatches * 1;
    
    // Recency bonus (more recent = higher score)
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(entry.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    score += Math.max(0, 10 - daysSinceCreation);
    
    return score;
  }
}
```

#### 6. File Management and Obsidian Integration

```typescript
// File Management Service
class FileManagementService {
  private obsidianSync: ObsidianSyncService;
  private versionControl: VersionControlService;
  private permissionChecker: PermissionChecker;
  
  async readFile(userId: string, agentId: string, filePath: string): Promise<FileContent> {
    // Security check
    await this.permissionChecker.checkReadPermission(userId, agentId, filePath);
    
    // Log file operation
    await this.logFileOperation(userId, agentId, 'read', filePath);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);
      
      return {
        path: filePath,
        content,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        encoding: 'utf8'
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }
  
  async writeFile(userId: string, agentId: string, request: WriteFileRequest): Promise<void> {
    // Security check
    await this.permissionChecker.checkWritePermission(userId, agentId, request.path);
    
    // Backup existing file if it exists
    if (await this.fileExists(request.path)) {
      await this.versionControl.createBackup(request.path);
    }
    
    // Ensure directory exists
    await fs.ensureDir(path.dirname(request.path));
    
    // Write file
    await fs.writeFile(request.path, request.content, 'utf8');
    
    // Calculate content hash for change detection
    const contentHash = this.calculateContentHash(request.content);
    
    // Log file operation
    await this.logFileOperation(userId, agentId, 'write', request.path, { contentHash });
    
    // Sync to Obsidian if applicable
    if (this.isObsidianFile(request.path)) {
      await this.obsidianSync.syncFile(request.path);
    }
  }
  
  async editFile(userId: string, agentId: string, request: EditFileRequest): Promise<void> {
    // Security check
    await this.permissionChecker.checkWritePermission(userId, agentId, request.path);
    
    // Read current content
    const currentContent = await fs.readFile(request.path, 'utf8');
    
    // Backup current version
    await this.versionControl.createBackup(request.path);
    
    // Apply edits
    let newContent = currentContent;
    for (const edit of request.edits) {
      if (edit.replaceAll) {
        newContent = newContent.replaceAll(edit.oldString, edit.newString);
      } else {
        // Find unique occurrence
        const occurrences = (newContent.match(new RegExp(this.escapeRegex(edit.oldString), 'g')) || []).length;
        if (occurrences === 0) {
          throw new Error(`String not found: ${edit.oldString}`);
        }
        if (occurrences > 1) {
          throw new Error(`String not unique: ${edit.oldString} (found ${occurrences} times)`);
        }
        newContent = newContent.replace(edit.oldString, edit.newString);
      }
    }
    
    // Write updated content
    await fs.writeFile(request.path, newContent, 'utf8');
    
    // Log file operation
    await this.logFileOperation(userId, agentId, 'edit', request.path, {
      editsCount: request.edits.length,
      contentHash: this.calculateContentHash(newContent)
    });
    
    // Sync to Obsidian if applicable
    if (this.isObsidianFile(request.path)) {
      await this.obsidianSync.syncFile(request.path);
    }
  }
  
  async listWorkspaceFiles(userId: string, agentName: string): Promise<FileTreeNode[]> {
    const workspacePath = `/workspace/${agentName}`;
    
    // Security check
    await this.permissionChecker.checkReadPermission(userId, null, workspacePath);
    
    return await this.buildFileTree(workspacePath);
  }
  
  private async buildFileTree(dirPath: string): Promise<FileTreeNode[]> {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const nodes: FileTreeNode[] = [];
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      const stats = await fs.stat(fullPath);
      
      if (item.isDirectory()) {
        nodes.push({
          name: item.name,
          path: fullPath,
          type: 'directory',
          size: 0,
          modifiedAt: stats.mtime.toISOString(),
          children: await this.buildFileTree(fullPath)
        });
      } else {
        nodes.push({
          name: item.name,
          path: fullPath,
          type: 'file',
          size: stats.size,
          modifiedAt: stats.mtime.toISOString()
        });
      }
    }
    
    return nodes.sort((a, b) => {
      // Directories first, then files, both alphabetically
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }
}
```

#### 7. Claude API Integration and Proxy

```typescript
// Claude API Proxy Service
class ClaudeAPIProxyService {
  private claudeClient: ClaudeClient;
  private rateLimiter: RateLimiter;
  private usageTracker: UsageTracker;
  private cache: CacheService;
  
  async completion(userId: string, request: CompletionRequest): Promise<CompletionResponse> {
    // Get user plan and check limits
    const user = await this.userService.getUser(userId);
    const planLimits = await this.getPlanLimits(user.planType);
    
    // Rate limiting based on plan
    await this.rateLimiter.checkLimit(userId, planLimits.apiRateLimit);
    
    // Prepare Claude API request with agent context
    const claudeRequest = {
      prompt: this.preparePrompt(request),
      model: this.selectModel(user.planType),
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      stream: request.stream || false
    };
    
    // Check cache for similar requests
    const cacheKey = this.generateCacheKey(claudeRequest);
    if (!request.bypassCache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        await this.usageTracker.recordCacheHit(userId);
        return cached;
      }
    }
    
    try {
      // Make request to Claude API
      const startTime = Date.now();
      const response = await this.claudeClient.completion(claudeRequest);
      const duration = Date.now() - startTime;
      
      // Track usage
      await this.usageTracker.recordAPICall(userId, {
        tokens: response.usage.total_tokens,
        duration,
        model: claudeRequest.model,
        agentContext: request.agentContext
      });
      
      // Cache response if cacheable
      if (this.isCacheable(request)) {
        await this.cache.set(cacheKey, response, 3600); // 1 hour cache
      }
      
      return {
        id: response.id,
        content: response.completion,
        usage: response.usage,
        model: response.model,
        agentContext: request.agentContext,
        cached: false
      };
    } catch (error) {
      await this.usageTracker.recordError(userId, error);
      throw error;
    }
  }
  
  private preparePrompt(request: CompletionRequest): string {
    let prompt = request.prompt;
    
    // Add agent context if provided
    if (request.agentContext) {
      const contextHeader = `
# Agent Context
` +
        `Agent Type: ${request.agentContext.agentType}\n` +
        `Working Directory: ${request.agentContext.workingDirectory}\n` +
        `Session Context: ${JSON.stringify(request.agentContext.sessionContext, null, 2)}\n\n`;
      
      prompt = contextHeader + prompt;
    }
    
    return prompt;
  }
  
  private selectModel(planType: string): string {
    switch (planType) {
      case 'max':
        return 'claude-3-opus-20240229';
      case 'pro':
        return 'claude-3-sonnet-20240229';
      default:
        return 'claude-3-haiku-20240307';
    }
  }
  
  private generateCacheKey(request: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify({
      prompt: request.prompt.substring(0, 1000), // First 1000 chars
      model: request.model,
      max_tokens: request.max_tokens,
      temperature: request.temperature
    }));
    return `claude:completion:${hash.digest('hex')}`;
  }
}
```

### Feature Integration Matrix

```typescript
// Feature Integration Controller
class FeatureIntegrationController {
  private features: Map<string, FeatureHandler> = new Map();
  
  constructor() {
    // Register all feature handlers
    this.features.set('agent-lifecycle', new AgentLifecycleHandler());
    this.features.set('task-management', new TaskManagementHandler());
    this.features.set('followups', new FollowupsHandler());
    this.features.set('agent-feed', new AgentFeedHandler());
    this.features.set('memory-system', new MemorySystemHandler());
    this.features.set('file-management', new FileManagementHandler());
    this.features.set('claude-api', new ClaudeAPIHandler());
  }
  
  async processRequest(request: IntegratedRequest): Promise<IntegratedResponse> {
    const workflow = this.determineWorkflow(request);
    const results: Record<string, any> = {};
    
    // Execute workflow steps in order
    for (const step of workflow.steps) {
      const handler = this.features.get(step.feature);
      if (!handler) {
        throw new Error(`Unknown feature: ${step.feature}`);
      }
      
      try {
        const stepResult = await handler.execute(step.action, {
          ...request,
          previousResults: results
        });
        
        results[step.feature] = stepResult;
        
        // Check if step requires propagation to other features
        if (step.propagate) {
          await this.propagateResult(step.feature, stepResult, step.propagate);
        }
      } catch (error) {
        // Handle step failure
        await this.handleStepFailure(step, error, results);
        throw error;
      }
    }
    
    return {
      workflowId: workflow.id,
      results,
      completedAt: new Date().toISOString()
    };
  }
  
  private determineWorkflow(request: IntegratedRequest): Workflow {
    // Determine appropriate workflow based on request type
    switch (request.type) {
      case 'create-agent-with-task':
        return {
          id: 'agent-task-creation',
          steps: [
            { feature: 'agent-lifecycle', action: 'create', propagate: ['task-management'] },
            { feature: 'task-management', action: 'create', propagate: ['agent-feed'] },
            { feature: 'agent-feed', action: 'post' }
          ]
        };
      
      case 'complete-task-with-followup':
        return {
          id: 'task-completion-workflow',
          steps: [
            { feature: 'task-management', action: 'complete', propagate: ['followups', 'agent-feed'] },
            { feature: 'followups', action: 'create' },
            { feature: 'agent-feed', action: 'post' },
            { feature: 'memory-system', action: 'record-work' }
          ]
        };
      
      case 'multi-agent-coordination':
        return {
          id: 'multi-agent-workflow',
          steps: [
            { feature: 'agent-lifecycle', action: 'activate-multiple', propagate: ['agent-feed'] },
            { feature: 'task-management', action: 'distribute-tasks' },
            { feature: 'agent-feed', action: 'post-coordination' }
          ]
        };
      
      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  }
}
```

---

## Integration Patterns

### External API Integration Architecture

#### 1. Slack Integration

```typescript
// Slack Integration Service
class SlackIntegrationService {
  private slackClient: WebClient;
  private eventProcessor: SlackEventProcessor;
  private messageFormatter: SlackMessageFormatter;
  
  constructor() {
    this.slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.eventProcessor = new SlackEventProcessor();
    this.messageFormatter = new SlackMessageFormatter();
  }
  
  async sendNotification(request: SlackNotificationRequest): Promise<void> {
    const formattedMessage = await this.messageFormatter.format(request);
    
    try {
      const result = await this.slackClient.chat.postMessage({
        channel: request.channel,
        ...formattedMessage
      });
      
      // Log successful notification
      await this.logNotification(request, result.ts as string);
    } catch (error) {
      // Handle Slack API errors
      await this.handleSlackError(error, request);
      throw error;
    }
  }
  
  async sendAgentUpdate(agent: Agent, updateType: string): Promise<void> {
    const message = this.formatAgentUpdate(agent, updateType);
    
    await this.sendNotification({
      channel: process.env.SLACK_AGENT_CHANNEL!,
      type: 'agent_update',
      title: message.title,
      content: message.content,
      priority: this.determineMessagePriority(updateType)
    });
  }
  
  async sendTaskCompletion(task: Task, completionNotes?: string): Promise<void> {
    const message = {
      title: `✅ Task Completed: ${task.title}`,
      content: `Priority: ${task.priority}\n` +
               `Completed: ${new Date().toLocaleString()}\n` +
               (completionNotes ? `Notes: ${completionNotes}` : ''),
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Task Completed*\n${task.title}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Priority: ${task.priority} | Due: ${task.dueDate || 'No due date'}`
            }
          ]
        }
      ]
    };
    
    await this.sendNotification({
      channel: process.env.SLACK_TASKS_CHANNEL!,
      type: 'task_completion',
      ...message
    });
  }
  
  async handleSlashCommand(command: SlackSlashCommand): Promise<SlackResponse> {
    switch (command.command) {
      case '/agent-status':
        return await this.handleAgentStatusCommand(command);
      case '/hitlist':
        return await this.handleHitlistCommand(command);
      case '/followups':
        return await this.handleFollowupsCommand(command);
      default:
        return {
          text: `Unknown command: ${command.command}`,
          response_type: 'ephemeral'
        };
    }
  }
  
  private async handleAgentStatusCommand(command: SlackSlashCommand): Promise<SlackResponse> {
    const userId = await this.getUserIdFromSlack(command.user_id);
    const agents = await this.agentService.getActiveAgents(userId);
    
    const statusBlocks = agents.map(agent => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${agent.name}*\nStatus: ${agent.status}\nLast Active: ${agent.lastActive}`
      }
    }));
    
    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Agent Status'
          }
        },
        ...statusBlocks
      ],
      response_type: 'ephemeral'
    };
  }
}
```

#### 2. Obsidian Vault Synchronization

```typescript
// Obsidian Sync Service
class ObsidianSyncService {
  private vaultPath: string;
  private restAPI: ObsidianRestAPI;
  private fileWatcher: FileWatcher;
  private conflictResolver: ConflictResolver;
  
  constructor() {
    this.vaultPath = process.env.OBSIDIAN_VAULT_PATH!;
    this.restAPI = new ObsidianRestAPI();
    this.fileWatcher = new FileWatcher();
    this.conflictResolver = new ConflictResolver();
  }
  
  async initialize(): Promise<void> {
    // Setup bi-directional sync
    await this.setupFileWatching();
    await this.setupObsidianWebhooks();
    
    // Initial sync
    await this.performInitialSync();
  }
  
  async syncFile(filePath: string): Promise<void> {
    if (!this.isWithinVault(filePath)) {
      return; // Only sync files within vault
    }
    
    const relativePath = path.relative(this.vaultPath, filePath);
    const content = await fs.readFile(filePath, 'utf8');
    
    try {
      // Check if file exists in Obsidian
      const obsidianFile = await this.restAPI.getFile(relativePath);
      
      if (obsidianFile) {
        // Check for conflicts
        const conflict = await this.detectConflict(filePath, obsidianFile);
        if (conflict) {
          await this.conflictResolver.resolve(conflict);
          return;
        }
      }
      
      // Update or create file in Obsidian
      await this.restAPI.updateFile(relativePath, {
        content,
        frontmatter: this.extractFrontmatter(content)
      });
      
      // Update sync metadata
      await this.updateSyncMetadata(filePath, 'synced');
    } catch (error) {
      await this.handleSyncError(filePath, error);
    }
  }
  
  async createNote(request: CreateNoteRequest): Promise<ObsidianNote> {
    const fileName = this.sanitizeFileName(request.title);
    const filePath = path.join(this.vaultPath, `${fileName}.md`);
    
    const content = this.formatNoteContent(request);
    
    // Create file locally
    await fs.writeFile(filePath, content, 'utf8');
    
    // Create in Obsidian
    const obsidianNote = await this.restAPI.createNote({
      name: fileName,
      content: content,
      folder: request.folder
    });
    
    return obsidianNote;
  }
  
  async updateWikilinks(sourcePath: string, newLinks: string[]): Promise<void> {
    const content = await fs.readFile(sourcePath, 'utf8');
    const updatedContent = this.insertWikilinks(content, newLinks);
    
    if (content !== updatedContent) {
      await fs.writeFile(sourcePath, updatedContent, 'utf8');
      await this.syncFile(sourcePath);
    }
  }
  
  private async setupFileWatching(): Promise<void> {
    this.fileWatcher.watch(this.vaultPath, {
      recursive: true,
      filter: (filePath) => filePath.endsWith('.md')
    });
    
    this.fileWatcher.on('change', async (filePath) => {
      await this.handleFileChange(filePath);
    });
    
    this.fileWatcher.on('add', async (filePath) => {
      await this.handleFileAdd(filePath);
    });
    
    this.fileWatcher.on('unlink', async (filePath) => {
      await this.handleFileDelete(filePath);
    });
  }
  
  private formatNoteContent(request: CreateNoteRequest): string {
    const frontmatter = {
      title: request.title,
      created: new Date().toISOString(),
      tags: request.tags || [],
      agent: request.sourceAgent || 'system',
      ...request.frontmatter
    };
    
    const frontmatterYAML = Object.entries(frontmatter)
      .map(([key, value]) => `${key}: ${this.formatYAMLValue(value)}`)
      .join('\n');
    
    return `---\n${frontmatterYAML}\n---\n\n${request.content}`;
  }
  
  private insertWikilinks(content: string, links: string[]): string {
    // Find appropriate insertion points for wikilinks
    const lines = content.split('\n');
    const insertionIndex = this.findWikilinkInsertionPoint(lines);
    
    const wikilinkSection = links.map(link => `- [[${link}]]`).join('\n');
    
    if (insertionIndex >= 0) {
      lines.splice(insertionIndex, 0, '## Related', '', wikilinkSection, '');
    } else {
      lines.push('', '## Related', '', wikilinkSection);
    }
    
    return lines.join('\n');
  }
}
```

#### 3. External Service Integration Framework

```typescript
// External Service Integration Framework
class ExternalServiceManager {
  private integrations: Map<string, ServiceIntegration> = new Map();
  private healthMonitor: ServiceHealthMonitor;
  private circuitBreaker: CircuitBreaker;
  
  constructor() {
    this.healthMonitor = new ServiceHealthMonitor();
    this.circuitBreaker = new CircuitBreaker();
    this.initializeIntegrations();
  }
  
  private initializeIntegrations(): void {
    // Register all external service integrations
    this.integrations.set('slack', new SlackIntegration());
    this.integrations.set('obsidian', new ObsidianIntegration());
    this.integrations.set('claude-api', new ClaudeAPIIntegration());
    this.integrations.set('supabase', new SupabaseIntegration());
    this.integrations.set('firecrawl', new FirecrawlIntegration());
  }
  
  async callService<T>(
    serviceName: string, 
    method: string, 
    params: any
  ): Promise<T> {
    const integration = this.integrations.get(serviceName);
    if (!integration) {
      throw new Error(`Unknown service: ${serviceName}`);
    }
    
    // Check circuit breaker status
    if (this.circuitBreaker.isOpen(serviceName)) {
      throw new Error(`Service ${serviceName} is currently unavailable`);
    }
    
    try {
      const result = await integration.call(method, params);
      
      // Record successful call
      this.circuitBreaker.recordSuccess(serviceName);
      this.healthMonitor.recordSuccess(serviceName);
      
      return result;
    } catch (error) {
      // Record failure
      this.circuitBreaker.recordFailure(serviceName);
      this.healthMonitor.recordFailure(serviceName, error);
      
      throw error;
    }
  }
  
  async getServiceHealth(): Promise<ServiceHealthReport> {
    const healthChecks = await Promise.allSettled(
      Array.from(this.integrations.keys()).map(async (serviceName) => {
        const integration = this.integrations.get(serviceName)!;
        const status = await integration.healthCheck();
        return { serviceName, status };
      })
    );
    
    const report: ServiceHealthReport = {
      overall: 'healthy',
      services: {},
      timestamp: new Date().toISOString()
    };
    
    let hasUnhealthy = false;
    
    for (const result of healthChecks) {
      if (result.status === 'fulfilled') {
        const { serviceName, status } = result.value;
        report.services[serviceName] = status;
        if (status.status !== 'healthy') {
          hasUnhealthy = true;
        }
      } else {
        hasUnhealthy = true;
        // Service name would be extracted from error context
      }
    }
    
    report.overall = hasUnhealthy ? 'degraded' : 'healthy';
    
    return report;
  }
}

// Base Integration Interface
abstract class ServiceIntegration {
  protected config: ServiceConfig;
  protected rateLimiter: RateLimiter;
  protected retryPolicy: RetryPolicy;
  
  constructor(config: ServiceConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rateLimits);
    this.retryPolicy = new RetryPolicy(config.retryConfig);
  }
  
  abstract async call(method: string, params: any): Promise<any>;
  abstract async healthCheck(): Promise<ServiceHealthStatus>;
  
  protected async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    return await this.retryPolicy.execute(operation);
  }
  
  protected async checkRateLimit(): Promise<void> {
    await this.rateLimiter.checkLimit();
  }
}

// Slack Integration Implementation
class SlackIntegration extends ServiceIntegration {
  private client: WebClient;
  
  constructor() {
    super({
      name: 'slack',
      rateLimits: { requestsPerMinute: 50 },
      retryConfig: { maxAttempts: 3, backoffMs: 1000 }
    });
    
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
  }
  
  async call(method: string, params: any): Promise<any> {
    await this.checkRateLimit();
    
    return await this.executeWithRetry(async () => {
      switch (method) {
        case 'sendMessage':
          return await this.client.chat.postMessage(params);
        case 'getChannelInfo':
          return await this.client.conversations.info(params);
        case 'getUserInfo':
          return await this.client.users.info(params);
        default:
          throw new Error(`Unknown Slack method: ${method}`);
      }
    });
  }
  
  async healthCheck(): Promise<ServiceHealthStatus> {
    try {
      await this.client.auth.test();
      return {
        status: 'healthy',
        responseTime: 0, // Would be measured
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }
}
```

### Message Queue and Event System

```typescript
// Event-Driven Architecture
class EventBus {
  private redis: Redis;
  private subscribers: Map<string, EventHandler[]> = new Map();
  private deadLetterQueue: DeadLetterQueue;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
    this.deadLetterQueue = new DeadLetterQueue();
  }
  
  async publish(event: DomainEvent): Promise<void> {
    const eventData = {
      ...event,
      publishedAt: new Date().toISOString(),
      id: event.id || generateUUID()
    };
    
    // Publish to Redis pub/sub
    await this.redis.publish(
      `events:${event.type}`,
      JSON.stringify(eventData)
    );
    
    // Also add to persistent stream for replay capability
    await this.redis.xadd(
      `stream:${event.type}`,
      '*',
      'data', JSON.stringify(eventData)
    );
  }
  
  async subscribe(eventType: string, handler: EventHandler): Promise<void> {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
      
      // Setup Redis subscription
      const subscriber = this.redis.duplicate();
      await subscriber.subscribe(`events:${eventType}`);
      
      subscriber.on('message', async (channel, message) => {
        await this.handleEvent(eventType, JSON.parse(message));
      });
    }
    
    this.subscribers.get(eventType)!.push(handler);
  }
  
  private async handleEvent(eventType: string, event: DomainEvent): Promise<void> {
    const handlers = this.subscribers.get(eventType) || [];
    
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Error handling event ${eventType}:`, error);
        
        // Send to dead letter queue for retry
        await this.deadLetterQueue.add({
          event,
          handler: handler.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
}

// Domain Events
interface DomainEvent {
  id?: string;
  type: string;
  userId: string;
  data: any;
  timestamp: string;
  correlationId?: string;
}

// Event Types
enum EventType {
  AGENT_CREATED = 'agent.created',
  AGENT_ACTIVATED = 'agent.activated',
  AGENT_DEACTIVATED = 'agent.deactivated',
  TASK_CREATED = 'task.created',
  TASK_COMPLETED = 'task.completed',
  FOLLOWUP_CREATED = 'followup.created',
  FOLLOWUP_OVERDUE = 'followup.overdue',
  FEED_POST_CREATED = 'feed.post.created',
  MEMORY_ENTRY_CREATED = 'memory.entry.created',
  FILE_MODIFIED = 'file.modified',
  HANDOFF_INITIATED = 'handoff.initiated',
  HANDOFF_COMPLETED = 'handoff.completed'
}

// Event Handlers for Integration
class IntegrationEventHandlers {
  constructor(
    private slackService: SlackIntegrationService,
    private obsidianService: ObsidianSyncService,
    private agentFeedService: AgentFeedService
  ) {}
  
  async handleTaskCompleted(event: DomainEvent): Promise<void> {
    const task = event.data as Task;
    
    // Send Slack notification
    await this.slackService.sendTaskCompletion(task);
    
    // Create Obsidian note if high priority
    if (this.isHighPriority(task.priority)) {
      await this.obsidianService.createNote({
        title: `Completed: ${task.title}`,
        content: `Task completed on ${new Date().toLocaleString()}\n\n${task.description}`,
        tags: ['completed', 'task', task.priority],
        folder: 'Tasks',
        sourceAgent: 'personal-todos-agent'
      });
    }
  }
  
  async handleAgentActivated(event: DomainEvent): Promise<void> {
    const agent = event.data as Agent;
    
    // Post to agent feed
    await this.agentFeedService.createPost({
      userId: agent.userId,
      title: `Agent Activated: ${agent.name}`,
      hook: `${agent.type} agent is now active and ready for coordination`,
      contentBody: `Agent ${agent.name} has been successfully activated and integrated into the ecosystem.`,
      authorAgent: 'chief-of-staff',
      mentionedAgents: [agent.type]
    });
    
    // Send Slack notification
    await this.slackService.sendAgentUpdate(agent, 'activated');
  }
  
  async handleFollowupOverdue(event: DomainEvent): Promise<void> {
    const followup = event.data as Followup;
    
    // Send urgent Slack notification
    await this.slackService.sendNotification({
      channel: process.env.SLACK_ALERTS_CHANNEL!,
      type: 'urgent_alert',
      title: `⚠️ Overdue Follow-up: ${followup.person}`,
      content: `Task: ${followup.task}\nDue: ${followup.dueDate}\nDays overdue: ${this.calculateDaysOverdue(followup.dueDate!)}`,
      priority: 'high'
    });
  }
}
```

---

## Security & Authentication

### Authentication Architecture

#### 1. Claude Account Integration via Supabase

```typescript
// Authentication Service
class AuthenticationService {
  private supabaseClient: SupabaseClient;
  private jwtService: JWTService;
  private sessionManager: SessionManager;
  private planValidator: PlanValidator;
  
  constructor() {
    this.supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    this.jwtService = new JWTService();
    this.sessionManager = new SessionManager();
    this.planValidator = new PlanValidator();
  }
  
  async authenticateWithClaude(oauthToken: string): Promise<AuthResult> {
    try {
      // Exchange OAuth token with Supabase
      const { data: authData, error } = await this.supabaseClient.auth.exchangeCodeForSession({
        authCode: oauthToken
      });
      
      if (error) throw error;
      
      // Get Claude account information
      const claudeAccount = await this.getClaudeAccountInfo(authData.user.id);
      
      // Validate and get plan information
      const planInfo = await this.planValidator.validatePlan(claudeAccount.planType);
      
      // Create or update user in our system
      const user = await this.createOrUpdateUser({
        claudeUserId: claudeAccount.id,
        email: claudeAccount.email,
        planType: claudeAccount.planType,
        planFeatures: planInfo.features
      });
      
      // Generate JWT tokens
      const accessToken = await this.jwtService.generateAccessToken(user);
      const refreshToken = await this.jwtService.generateRefreshToken(user);
      
      // Create session
      const session = await this.sessionManager.createSession({
        userId: user.id,
        accessToken,
        refreshToken,
        planType: user.planType,
        features: user.planFeatures
      });
      
      return {
        accessToken,
        refreshToken,
        user,
        session,
        planFeatures: planInfo.features
      };
    } catch (error) {
      throw new AuthenticationError('Claude authentication failed', error);
    }
  }
  
  async validateSession(token: string): Promise<SessionValidationResult> {
    try {
      // Verify JWT token
      const payload = await this.jwtService.verifyToken(token);
      
      // Check session in Redis cache
      const session = await this.sessionManager.getSession(payload.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        await this.sessionManager.removeSession(payload.sessionId);
        throw new Error('Session expired');
      }
      
      // Update last accessed time
      await this.sessionManager.updateLastAccessed(payload.sessionId);
      
      return {
        valid: true,
        userId: session.userId,
        planType: session.planType,
        features: session.features
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  async refreshToken(refreshToken: string): Promise<RefreshResult> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyRefreshToken(refreshToken);
      
      // Get current session
      const session = await this.sessionManager.getSession(payload.sessionId);
      if (!session || session.refreshToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }
      
      // Generate new tokens
      const user = await this.userService.getUser(session.userId);
      const newAccessToken = await this.jwtService.generateAccessToken(user);
      const newRefreshToken = await this.jwtService.generateRefreshToken(user);
      
      // Update session
      await this.sessionManager.updateTokens(payload.sessionId, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
      
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new AuthenticationError('Token refresh failed', error);
    }
  }
  
  async logout(sessionId: string): Promise<void> {
    await this.sessionManager.removeSession(sessionId);
  }
  
  private async getClaudeAccountInfo(supabaseUserId: string): Promise<ClaudeAccountInfo> {
    // This would typically call Claude API or Supabase user metadata
    // to get the user's Claude plan information
    const { data, error } = await this.supabaseClient
      .from('user_metadata')
      .select('claude_plan, claude_user_id, email')
      .eq('id', supabaseUserId)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.claude_user_id,
      email: data.email,
      planType: data.claude_plan
    };
  }
}
```

#### 2. JWT Token Management

```typescript
// JWT Service
class JWTService {
  private secretKey: string;
  private issuer: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;
  
  constructor() {
    this.secretKey = process.env.JWT_SECRET!;
    this.issuer = 'claude-code-vps';
    this.accessTokenExpiry = '15m'; // 15 minutes
    this.refreshTokenExpiry = '7d'; // 7 days
  }
  
  async generateAccessToken(user: User): Promise<string> {
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      planType: user.planType,
      features: user.planFeatures,
      type: 'access',
      iss: this.issuer,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
    };
    
    return jwt.sign(payload, this.secretKey, {
      algorithm: 'HS256'
    });
  }
  
  async generateRefreshToken(user: User): Promise<string> {
    const payload: JWTPayload = {
      sub: user.id,
      type: 'refresh',
      sessionId: generateUUID(),
      iss: this.issuer,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
    
    return jwt.sign(payload, this.secretKey, {
      algorithm: 'HS256'
    });
  }
  
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.secretKey, {
        issuer: this.issuer
      }) as JWTPayload;
      
      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }
      
      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid token');
      }
      throw error;
    }
  }
  
  async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.secretKey, {
        issuer: this.issuer
      }) as JWTPayload;
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return payload;
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }
  }
}
```

#### 3. Permission System

```typescript
// Permission Management
class PermissionService {
  private permissions: Map<string, Permission[]> = new Map();
  private rolePermissions: Map<string, string[]> = new Map();
  
  constructor() {
    this.initializePermissions();
  }
  
  private initializePermissions(): void {
    // Define system permissions
    const permissions: Permission[] = [
      // Agent permissions
      { id: 'agent:create', resource: 'agent', action: 'create', scope: 'own' },
      { id: 'agent:read', resource: 'agent', action: 'read', scope: 'own' },
      { id: 'agent:update', resource: 'agent', action: 'update', scope: 'own' },
      { id: 'agent:delete', resource: 'agent', action: 'delete', scope: 'own' },
      
      // File permissions
      { id: 'file:read', resource: 'file', action: 'read', scope: 'workspace' },
      { id: 'file:write', resource: 'file', action: 'write', scope: 'workspace' },
      { id: 'file:delete', resource: 'file', action: 'delete', scope: 'workspace' },
      
      // System permissions
      { id: 'system:health', resource: 'system', action: 'read', scope: 'global' },
      { id: 'system:metrics', resource: 'system', action: 'read', scope: 'global' },
      
      // Administrative permissions
      { id: 'admin:users', resource: 'user', action: 'manage', scope: 'global' },
      { id: 'admin:system', resource: 'system', action: 'manage', scope: 'global' }
    ];
    
    permissions.forEach(p => {
      if (!this.permissions.has(p.resource)) {
        this.permissions.set(p.resource, []);
      }
      this.permissions.get(p.resource)!.push(p);
    });
    
    // Define role-based permissions
    this.rolePermissions.set('user', [
      'agent:create', 'agent:read', 'agent:update', 'agent:delete',
      'file:read', 'file:write', 'file:delete',
      'system:health'
    ]);
    
    this.rolePermissions.set('admin', [
      ...this.rolePermissions.get('user')!,
      'system:metrics', 'admin:users', 'admin:system'
    ]);
  }
  
  async checkPermission(
    userId: string,
    permission: string,
    resource?: any
  ): Promise<boolean> {
    const user = await this.userService.getUser(userId);
    const userRole = user.role || 'user';
    
    // Check if user's role has this permission
    const rolePermissions = this.rolePermissions.get(userRole) || [];
    if (!rolePermissions.includes(permission)) {
      return false;
    }
    
    // Additional resource-specific checks
    if (resource) {
      return await this.checkResourceAccess(userId, permission, resource);
    }
    
    return true;
  }
  
  private async checkResourceAccess(
    userId: string,
    permission: string,
    resource: any
  ): Promise<boolean> {
    const [resourceType, action] = permission.split(':');
    
    switch (resourceType) {
      case 'agent':
        // Users can only access their own agents
        return resource.userId === userId;
      
      case 'file':
        // Users can only access files in their workspace
        return this.isInUserWorkspace(userId, resource.path);
      
      case 'task':
      case 'followup':
      case 'memory':
        // Users can only access their own data
        return resource.userId === userId;
      
      default:
        return true;
    }
  }
  
  async checkFilePermission(
    userId: string,
    agentId: string | null,
    filePath: string,
    action: 'read' | 'write' | 'delete'
  ): Promise<void> {
    // Security checks for file operations
    
    // 1. Path traversal protection
    if (filePath.includes('..') || filePath.includes('~')) {
      throw new SecurityError('Path traversal attempt detected');
    }
    
    // 2. Restrict to user workspace
    if (!this.isInUserWorkspace(userId, filePath)) {
      throw new SecurityError('File access outside user workspace');
    }
    
    // 3. Check if agent has permission to access this file
    if (agentId) {
      const agent = await this.agentService.getAgent(agentId);
      if (!agent || agent.userId !== userId) {
        throw new SecurityError('Agent not authorized for this user');
      }
      
      if (!this.isInAgentWorkspace(agent, filePath)) {
        throw new SecurityError('File access outside agent workspace');
      }
    }
    
    // 4. Check for system file protection
    if (this.isSystemFile(filePath)) {
      throw new SecurityError('System file access denied');
    }
    
    // 5. Action-specific checks
    if (action === 'write' || action === 'delete') {
      if (this.isReadOnlyFile(filePath)) {
        throw new SecurityError('Attempt to modify read-only file');
      }
    }
  }
  
  private isInUserWorkspace(userId: string, filePath: string): boolean {
    const userWorkspace = `/workspace/users/${userId}/`;
    const normalizedPath = path.resolve(filePath);
    const normalizedWorkspace = path.resolve(userWorkspace);
    
    return normalizedPath.startsWith(normalizedWorkspace);
  }
  
  private isInAgentWorkspace(agent: Agent, filePath: string): boolean {
    const normalizedPath = path.resolve(filePath);
    const normalizedWorkspace = path.resolve(agent.workingDirectory);
    
    return normalizedPath.startsWith(normalizedWorkspace);
  }
}
```

#### 4. Rate Limiting and Security Middleware

```typescript
// Rate Limiting Service
class RateLimitingService {
  private redis: Redis;
  private planLimits: Map<string, RateLimitConfig>;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
    this.planLimits = new Map([
      ['pro', { requestsPerHour: 1000, concurrentRequests: 10 }],
      ['max', { requestsPerHour: 5000, concurrentRequests: 25 }]
    ]);
  }
  
  async checkRateLimit(userId: string, planType: string, endpoint?: string): Promise<void> {
    const limits = this.planLimits.get(planType);
    if (!limits) {
      throw new Error(`Unknown plan type: ${planType}`);
    }
    
    // Check hourly rate limit
    await this.checkHourlyLimit(userId, limits.requestsPerHour, endpoint);
    
    // Check concurrent request limit
    await this.checkConcurrentLimit(userId, limits.concurrentRequests);
  }
  
  private async checkHourlyLimit(
    userId: string,
    limit: number,
    endpoint?: string
  ): Promise<void> {
    const key = `rate_limit:hourly:${userId}${endpoint ? `:${endpoint}` : ''}`;
    const current = await this.redis.get(key);
    
    if (current && parseInt(current) >= limit) {
      const ttl = await this.redis.ttl(key);
      throw new RateLimitError(`Rate limit exceeded. Reset in ${ttl} seconds.`);
    }
    
    // Increment counter
    const multi = this.redis.multi();
    multi.incr(key);
    if (!current) {
      multi.expire(key, 3600); // 1 hour
    }
    await multi.exec();
  }
  
  private async checkConcurrentLimit(userId: string, limit: number): Promise<void> {
    const key = `concurrent:${userId}`;
    const current = await this.redis.get(key);
    
    if (current && parseInt(current) >= limit) {
      throw new RateLimitError('Concurrent request limit exceeded');
    }
  }
  
  async incrementConcurrent(userId: string): Promise<() => Promise<void>> {
    const key = `concurrent:${userId}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 300); // 5 minute expiry
    
    // Return cleanup function
    return async () => {
      await this.redis.decr(key);
    };
  }
}

// Security Middleware
class SecurityMiddleware {
  private authService: AuthenticationService;
  private permissionService: PermissionService;
  private rateLimitService: RateLimitingService;
  private auditLogger: AuditLogger;
  
  constructor() {
    this.authService = new AuthenticationService();
    this.permissionService = new PermissionService();
    this.rateLimitService = new RateLimitingService();
    this.auditLogger = new AuditLogger();
  }
  
  authenticate(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new AuthenticationError('Missing or invalid authorization header');
        }
        
        const token = authHeader.substring(7);
        const validation = await this.authService.validateSession(token);
        
        if (!validation.valid) {
          throw new AuthenticationError(validation.error || 'Invalid session');
        }
        
        // Add user context to request
        req.user = {
          id: validation.userId!,
          planType: validation.planType!,
          features: validation.features!
        };
        
        next();
      } catch (error) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: error.message
          }
        });
      }
    };
  }
  
  authorize(permission: string): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const hasPermission = await this.permissionService.checkPermission(
          req.user.id,
          permission,
          req.body || req.params
        );
        
        if (!hasPermission) {
          throw new AuthorizationError('Insufficient permissions');
        }
        
        next();
      } catch (error) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: error.message
          }
        });
      }
    };
  }
  
  rateLimit(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.rateLimitService.checkRateLimit(
          req.user.id,
          req.user.planType,
          req.route?.path
        );
        
        // Track concurrent requests
        const cleanup = await this.rateLimitService.incrementConcurrent(req.user.id);
        
        // Cleanup on response
        res.on('finish', cleanup);
        res.on('close', cleanup);
        
        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          res.status(429).json({
            error: {
              code: 'RATE_LIMITED',
              message: error.message
            }
          });
        } else {
          next(error);
        }
      }
    };
  }
  
  audit(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Log request
      await this.auditLogger.logRequest({
        userId: req.user?.id,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      
      // Track response
      res.on('finish', async () => {
        await this.auditLogger.logResponse({
          userId: req.user?.id,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });
      });
      
      next();
    };
  }
}
```

---

## UI/Frontend Architecture

### Frontend Technology Stack

**Core Technologies:**
- **Frontend Framework**: React 18 with TypeScript
- **Desktop Framework**: Tauri 2.0 (Rust-based desktop app framework)
- **Build Tool**: Vite 6 with custom configuration
- **Package Manager**: Bun (optimized for performance)
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS v4 with Tailwind CSS v4 oxide engine
- **State Management**: Zustand for lightweight global state
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion for smooth UI transitions

**Key Dependencies:**
```json
{
  "react": "^18.3.1",
  "@tauri-apps/api": "^2.1.1",
  "@radix-ui/*": "Multiple UI primitives",
  "tailwindcss": "^4.1.8",
  "zustand": "^5.0.6",
  "framer-motion": "^12.0.0-alpha.1",
  "react-hook-form": "^7.54.2",
  "zod": "^3.24.1"
}
```

### Application Architecture Pattern

**Multi-View Single Page Application (SPA) with Tab-Based Interface:**

```typescript
type View = 
  | "welcome"        // Landing screen with navigation cards
  | "projects"       // Project browser and session management
  | "cc-agents"      // Agent creation and management
  | "settings"       // Application configuration
  | "tabs"           // Primary workspace with multi-tab interface
  | "usage-dashboard" // Usage analytics and cost tracking
  | "mcp"            // MCP server management
```

**Context-Based State Management:**
- `TabProvider`: Manages multi-tab workspace state
- `OutputCacheProvider`: Caches session output for performance
- Global state via Zustand stores for agents and sessions

### Component Architecture

#### 1. Core Application Components

**App.tsx - Main Application Container:**
```typescript
function AppContent() {
  const [view, setView] = useState<View>("tabs");
  const { createClaudeMdTab, createSettingsTab } = useTabState();
  // View routing, keyboard shortcuts, event handling
}
```

**Key Features:**
- View-based routing system
- Keyboard shortcuts (Cmd/Ctrl+T, Cmd/Ctrl+W, etc.)
- Global error handling and event management
- Provider orchestration

#### 2. Tab Management System

**TabManager.tsx - Multi-Tab Interface:**
- Dynamic tab creation and management
- Tab persistence across sessions
- Support for different tab types:
  - Claude Code sessions
  - Agent execution
  - Settings panels
  - Usage dashboards

**TabContent.tsx - Tab Content Renderer:**
- Renders appropriate content based on tab type
- Handles tab-specific state management
- Optimized rendering for performance

#### 3. Agent Management Components

**CCAgents.tsx - Agent Dashboard:**
- Agent listing and creation interface
- Agent execution controls
- Integration with GitHub agent repository

**CreateAgent.tsx - Agent Configuration:**
- Visual agent creation wizard
- System prompt editor
- Model selection and configuration
- Hooks and permissions management

**AgentExecution.tsx - Runtime Management:**
- Real-time agent execution monitoring
- Process control (start, stop, monitor)
- Live output streaming
- Metrics and performance tracking

#### 4. Project and Session Management

**ProjectList.tsx - Project Browser:**
- Visual project directory browser
- Session history and management
- CLAUDE.md file integration
- Project settings access

**SessionList.tsx - Session Interface:**
- Session browsing and filtering
- Session metadata display
- Resume and new session controls

**ClaudeCodeSession.tsx - Interactive Session:**
- Real-time Claude Code execution
- Message streaming and display
- File management integration
- Checkpoint and timeline features

#### 5. Advanced Features

**CheckpointSettings.tsx - Timeline Management:**
- Session versioning and checkpoints
- Visual timeline navigation
- Diff viewer between checkpoints
- Fork and restore functionality

**UsageDashboard.tsx - Analytics Interface:**
- Cost tracking and visualization
- Token usage analytics
- Project-based usage breakdown
- Export functionality

**MCPManager.tsx - MCP Integration:**
- Model Context Protocol server management
- Configuration import/export
- Connection testing and status monitoring

### API Integration Layer

**Tauri IPC Communication:**
```typescript
// API client using Tauri's invoke system
export const api = {
  async listProjects(): Promise<Project[]> {
    return await invoke<Project[]>("list_projects");
  },
  
  async executeAgent(agentId: number, projectPath: string, task: string): Promise<number> {
    return await invoke<number>('execute_agent', { agentId, projectPath, task });
  }
  
  // 100+ API methods for comprehensive backend integration
};
```

**Real-time Communication:**
- WebSocket-style event handling through Tauri
- Live output streaming for agent execution
- Real-time session monitoring
- Process management and cleanup

### UI Component System

**Design System (shadcn/ui + Radix UI):**

```typescript
// Example component structure
export const Button = ({ variant, size, ...props }) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size }))}
      {...props}
    />
  );
};
```

**Component Categories:**
- **Base UI**: Button, Input, Card, Dialog, etc.
- **Data Display**: Tables, Charts, Metrics
- **Navigation**: Tabs, Breadcrumbs, Menus
- **Forms**: Form controls with validation
- **Feedback**: Toasts, Loading states, Error boundaries

**Custom Components:**
- **MarkdownEditor**: Rich markdown editing with preview
- **CodeEditor**: Syntax highlighting and language support
- **FileExplorer**: Native file system integration
- **TerminalOutput**: Real-time command output display

### State Management Architecture

**Zustand Stores:**

```typescript
// Agent store example
interface AgentStore {
  agents: Agent[];
  selectedAgent: Agent | null;
  loadAgents: () => Promise<void>;
  createAgent: (agent: Partial<Agent>) => Promise<Agent>;
  executeAgent: (id: number, task: string) => Promise<void>;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  selectedAgent: null,
  // Implementation...
}));
```

**Context Providers:**
- Tab state management
- Output caching for performance
- Theme and appearance preferences
- User session persistence

### Build and Development Configuration

**Vite Configuration:**
```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/*'],
          'tauri': ['@tauri-apps/api'],
          // Optimized code splitting
        }
      }
    }
  }
});
```

**Tauri Integration:**
```json
{
  "build": {
    "beforeDevCommand": "bun run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "bun run build"
  },
  "app": {
    "security": {
      "csp": "default-src 'self'; img-src 'self' asset: https://asset.localhost blob: data:; ..."
    }
  }
}
```

### Frontend-Backend Integration

#### 1. API Endpoint Mapping

**Core API Methods (180+ total methods):**

```typescript
// Project Management
api.listProjects() → GET /api/projects
api.getProjectSessions(id) → GET /api/projects/{id}/sessions

// Agent Management  
api.listAgents() → GET /api/agents
api.createAgent(...) → POST /api/agents
api.executeAgent(...) → POST /api/agents/{id}/execute

// Session Management
api.executeClaudeCode(...) → POST /api/sessions/execute
api.loadSessionHistory(...) → GET /api/sessions/{id}/history

// Usage Analytics
api.getUsageStats() → GET /api/usage/stats
api.getUsageByDateRange(...) → GET /api/usage/range

// MCP Management
api.mcpList() → GET /api/mcp/servers
api.mcpAdd(...) → POST /api/mcp/servers

// Storage Management
api.storageListTables() → GET /api/storage/tables
api.storageReadTable(...) → GET /api/storage/tables/{name}
```

#### 2. Real-time Features

**Live Session Monitoring:**
```typescript
// Real-time output streaming
const streamOutput = async (runId: number) => {
  const output = await api.getLiveSessionOutput(runId);
  // Process and display streaming output
};

// Process monitoring
const monitorSession = async (sessionId: string) => {
  const status = await api.getSessionStatus(sessionId);
  // Update UI based on session status
};
```

**Event-Driven Updates:**
- Process status changes
- File system monitoring
- Session completion notifications
- Error handling and recovery

#### 3. File System Integration

**Native File Operations:**
```typescript
// File browser integration
api.listDirectoryContents(path) → Native file system access
api.searchFiles(basePath, query) → File search functionality

// CLAUDE.md management
api.findClaudeMdFiles(projectPath) → Project file discovery
api.readClaudeMdFile(filePath) → File content access
api.saveClaudeMdFile(filePath, content) → File saving
```

### Deployment Integration

#### 1. Frontend Build Process

**Development Mode:**
```bash
# Development server with hot reload
bun run dev                    # Starts Vite dev server
bun run tauri dev             # Starts Tauri app with frontend
```

**Production Build:**
```bash
# Frontend build
bun run build                 # Builds React app to dist/
bun run tauri build          # Creates platform-specific binaries

# Outputs:
# - Linux: .deb, .AppImage packages
# - macOS: .dmg installer, .app bundle  
# - Windows: .msi, .exe installers
```

#### 2. Integration with VPS Backend

**Adaptation for Web Deployment:**

While Claudia is currently a desktop app, for VPS deployment it would need:

```typescript
// Web-compatible API client
const webApi = {
  baseURL: process.env.VITE_API_URL || 'http://localhost:3000',
  
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
        ...options?.headers
      },
      ...options
    });
    return response.json();
  }
};
```

**Required Modifications for VPS:**
1. Replace Tauri IPC with HTTP API calls
2. Implement authentication system
3. Add WebSocket for real-time features
4. Modify file system access to use backend APIs
5. Update routing for web-based navigation

#### 3. Docker Integration

**Frontend Container (Nginx-served):**
```dockerfile
# Frontend build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN npm install -g bun && bun install
COPY . .
RUN bun run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Performance Optimization

#### 1. Code Splitting and Lazy Loading

```typescript
// Route-based code splitting
const CCAgents = lazy(() => import('./components/CCAgents'));
const UsageDashboard = lazy(() => import('./components/UsageDashboard'));

// Component-level optimization
const ExpensiveComponent = memo(({ data }) => {
  const memoizedValue = useMemo(() => 
    computeExpensiveValue(data), [data]
  );
  return <div>{memoizedValue}</div>;
});
```

#### 2. Caching Strategy

**Output Cache Provider:**
```typescript
export const OutputCacheProvider = ({ children }) => {
  const cache = useRef(new Map());
  
  const getCachedOutput = useCallback((sessionId: string) => {
    return cache.current.get(sessionId);
  }, []);
  
  const setCachedOutput = useCallback((sessionId: string, output: string) => {
    cache.current.set(sessionId, output);
  }, []);
  
  return (
    <OutputCacheContext.Provider value={{ getCachedOutput, setCachedOutput }}>
      {children}
    </OutputCacheContext.Provider>
  );
};
```

#### 3. Bundle Optimization

**Vite Configuration for Performance:**
- Manual chunk splitting for vendor libraries
- Tree shaking for unused code elimination
- Asset optimization and compression
- Dynamic imports for route-based splitting

### Security Considerations

#### 1. Tauri Security Model

**CSP Configuration:**
```json
{
  "security": {
    "csp": "default-src 'self'; img-src 'self' asset: https://asset.localhost blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval'"
  }
}
```

**File System Permissions:**
```json
{
  "plugins": {
    "fs": {
      "scope": ["$HOME/**"],
      "allow": ["readFile", "writeFile", "readDir", "createDir"]
    }
  }
}
```

#### 2. Input Validation

**Zod Schema Validation:**
```typescript
const AgentSchema = z.object({
  name: z.string().min(1).max(100),
  system_prompt: z.string().min(10),
  model: z.enum(['sonnet', 'haiku', 'opus']),
  hooks: z.string().optional()
});

// Form validation
const { handleSubmit, control } = useForm({
  resolver: zodResolver(AgentSchema)
});
```

### Feature Specifications Integration

#### 1. Agent Lifecycle Management

**Frontend Implementation:**
- Visual agent creation wizard
- Real-time execution monitoring  
- Process management controls
- Output streaming and visualization
- Metrics dashboard integration

#### 2. Multi-Tab Session Management

**Tab System Features:**
- Persistent tab state across sessions
- Multiple concurrent Claude Code sessions
- Tab-specific context and history
- Cross-tab communication and coordination

#### 3. Project and File Management

**File System Integration:**
- Native file browser with search
- CLAUDE.md file management
- Project settings and configuration
- Integration with version control systems

#### 4. Usage Analytics Dashboard

**Analytics Features:**
- Real-time cost tracking
- Token usage visualization
- Project-based analytics
- Export and reporting functionality

### Technology Alignment

#### Frontend-Backend Technology Stack Compatibility:

**Aligned Technologies:**
- TypeScript across frontend and backend
- Node.js compatible ecosystem
- PostgreSQL integration via API
- Real-time communication patterns
- File system abstraction layer

**Integration Points:**
- REST API compatibility with Express.js backend
- WebSocket integration for real-time features
- Authentication system coordination
- Shared data models and types
- Error handling and logging integration

### Deployment Architecture

#### Current (Desktop App):
```
┌─────────────────────────────────────┐
│         Tauri Desktop App            │
├─────────────────────────────────────┤
│  React Frontend (Port 1420)         │
├─────────────────────────────────────┤
│  Rust Backend (Tauri Core)          │
├─────────────────────────────────────┤
│  Native OS Integration              │
│  • File System Access               │
│  • Process Management               │
│  • Native Notifications             │
└─────────────────────────────────────┘
```

#### Proposed VPS Integration:
```
┌─────────────────────────────────────┐
│         Nginx (Port 80/443)         │
├─────────────────────────────────────┤
│  React Frontend (Static Files)      │
├─────────────────────────────────────┤
│  Node.js/Express API (Port 3000)    │
├─────────────────────────────────────┤
│  Agent Ecosystem (Docker)           │
├─────────────────────────────────────┤
│  PostgreSQL + Redis + File Storage  │
└─────────────────────────────────────┘
```

---

This completes the comprehensive UI/Frontend Architecture section, providing detailed analysis of the existing Claudia frontend implementation and its integration requirements for the Claude Code VPS system. The frontend provides a solid foundation for the VPS deployment with minor modifications needed for web-based operation.