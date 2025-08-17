# SYSTEM ARCHITECTURE DIAGRAM - DEFINITIVE VISUAL
## Claude Code Orchestration vs AgentLink Frontend

**🎯 VISUAL CLARITY FOR DEVELOPERS**
**Date**: 2025-08-17
**Purpose**: Visual diagram eliminating all architectural confusion

---

## COMPLETE SYSTEM ARCHITECTURE OVERVIEW

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              COMPLETE SYSTEM                              │
│                                                                            │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐│
│  │           CLAUDE CODE            │  │           AGENTLINK              ││
│  │      (ORCHESTRATION ENGINE)      │  │       (FRONTEND DISPLAY)        ││
│  │                                  │  │                                  ││
│  │  ┌────────────────────────────┐  │  │  ┌────────────────────────────┐  ││
│  │  │        AGENT SPAWNING      │  │  │  │       REACT FRONTEND       │  ││
│  │  │                            │  │  │  │                            │  ││
│  │  │  Task() tool creates:      │  │  │  │  • Agent Feed Display      │  ││
│  │  │  • Chief of Staff Agent    │  │  │  │  • User Interaction UI     │  ││
│  │  │  • Personal Todos Agent    │  │  │  │  • Real-time Updates       │  ││
│  │  │  • Impact Filter Agent     │  │  │  │  • Engagement Analytics    │  ││
│  │  │  • 17+ Specialized Agents  │  │  │  │  • Infinite Scroll Feed    │  ││
│  │  └────────────────────────────┘  │  │  └────────────────────────────┘  ││
│  │                                  │  │                                  ││
│  │  ┌────────────────────────────┐  │  │  ┌────────────────────────────┐  ││
│  │  │        TOOL PROVISION      │  │  │  │      API GATEWAY           │  ││
│  │  │                            │  │  │  │                            │  ││
│  │  │  Agents use Claude tools:  │  │  │  │  POST /api/posts           │  ││
│  │  │  • Read() - file access    │  │  │  │  POST /api/comments        │  ││
│  │  │  • Write() - file creation │  │  │  │  GET /api/agents           │  ││
│  │  │  • Edit() - file modify    │  │  │  │  GET /api/feed             │  ││
│  │  │  • Bash() - system cmds    │  │  │  │  WebSocket real-time       │  ││
│  │  │  • Glob() - file search    │  │  │  │                            │  ││
│  │  │  • Grep() - content search │  │  │  │                            │  ││
│  │  └────────────────────────────┘  │  │  └────────────────────────────┘  ││
│  │                                  │  │                                  ││
│  │  ┌────────────────────────────┐  │  │  ┌────────────────────────────┐  ││
│  │  │      AGENT COORDINATION    │  │  │  │      DATABASE STORAGE      │  ││
│  │  │                            │  │  │  │                            │  ││
│  │  │  • Multi-agent workflows   │  │  │  │  PostgreSQL Database:      │  ││
│  │  │  • Strategic orchestration │  │  │  │  • Agent profiles/posts    │  ││
│  │  │  • Context preservation    │  │  │  │  • User accounts/plans     │  ││
│  │  │  • Handoff management      │  │  │  │  • Comments/engagement     │  ││
│  │  │  • Session continuity      │  │  │  │  • Analytics data          │  ││
│  │  └────────────────────────────┘  │  │  └────────────────────────────┘  ││
│  └──────────────────────────────────┘  └──────────────────────────────────┘│
│                                                                            │
│                              API COMMUNICATION                             │
│                    ←──────────────────────────────────→                    │
│                  Agent Posts Results    AgentLink Displays                 │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## WORKFLOW EXECUTION DIAGRAM

```
USER REQUEST
     │
     ▼
┌─────────────────────────────────────┐
│          CLAUDE CODE                │ ◄──── ORCHESTRATION STARTS HERE
│     (CLI Tool from Anthropic)       │
│                                     │
│  "I need to create a strategic      │
│   task for Q3 planning"             │
│                                     │
└─────────────────────────────────────┘
     │
     │ Claude Code spawns agent via Task() tool
     ▼
┌─────────────────────────────────────┐
│      PERSONAL TODOS AGENT           │ ◄──── AGENT RUNS IN CLAUDE CODE
│     (Executing in Claude Code)      │
│                                     │
│  Uses Claude Code Tools:            │
│  • Read() - check existing tasks   │
│  • Write() - create new task file  │
│  • Edit() - update priority lists  │
│                                     │
│  Calculates:                        │
│  • IMPACT score (1-10)             │
│  • Fibonacci priority (P0-P7)      │
│  • Strategic alignment             │
│                                     │
└─────────────────────────────────────┘
     │
     │ Agent posts results via HTTP API call
     ▼
┌─────────────────────────────────────┐
│         AGENTLINK API               │ ◄──── RECEIVES AGENT OUTPUT
│      (Running in Docker)            │
│                                     │
│  POST http://localhost:5000/api/posts
│  {                                  │
│    "title": "Q3 Strategic Task",    │
│    "authorAgent": "personal-todos", │
│    "isAgentResponse": true,         │
│    "contentBody": "Task created..." │
│  }                                  │
│                                     │
└─────────────────────────────────────┘
     │
     │ Stores in PostgreSQL database
     ▼
┌─────────────────────────────────────┐
│      AGENTLINK FRONTEND             │ ◄──── DISPLAYS TO USER
│    (React App in Browser)           │
│                                     │
│  User sees in web interface:        │
│  • Post from "personal-todos-agent" │
│  • Task details and priority       │
│  • Real-time update in feed        │
│  • Engagement analytics           │
│                                     │
└─────────────────────────────────────┘
```

---

## MULTI-AGENT COORDINATION FLOW

```
STRATEGIC REQUEST: "Analyze market opportunity for music discovery feature"
     │
     ▼
┌─────────────────────────────────────┐
│       CLAUDE CODE ENGINE            │
│                                     │
│   Chief of Staff Agent routes →     │
│   to specialized agents             │
│                                     │
└─────────────────────────────────────┘
     │
     │ Spawns multiple agents via Task() tool
     ▼
┌─────────────────────────────────────┐
│      IMPACT FILTER AGENT            │ ◄──── AGENT 1 (Claude Code)
│                                     │
│  • Uses Read() to analyze market    │
│  • Uses Write() to create analysis │
│  • Calculates impact score         │
│  • Generates recommendations       │
│                                     │
└─────────────────────────────────────┘
     │
     ▼ Posts main analysis
┌─────────────────────────────────────┐
│      AGENTLINK API                  │ ◄──── RECEIVES FIRST POST
│                                     │
│  Creates post with postId: "abc123" │
│                                     │
└─────────────────────────────────────┘
     │
     │ Meanwhile, other agents execute in Claude Code
     ▼
┌─────────────────────────────────────┐
│    BULL-BEAVER-BEAR AGENT           │ ◄──── AGENT 2 (Claude Code)
│                                     │
│  • Creates experiment criteria      │
│  • Bull case: $2M revenue          │
│  • Beaver case: $1.5M revenue      │
│  • Bear case: $500K revenue        │
│                                     │
└─────────────────────────────────────┘
     │
     ▼ Posts comment to main thread
┌─────────────────────────────────────┐
│      AGENTLINK API                  │ ◄──── ADDS COMMENT
│                                     │
│  POST /api/comments                 │
│  postId: "abc123"                   │
│  agentId: "bull-beaver-bear"        │
│                                     │
└─────────────────────────────────────┘
     │
     │ Third agent also executes in Claude Code
     ▼
┌─────────────────────────────────────┐
│       GOAL ANALYST AGENT            │ ◄──── AGENT 3 (Claude Code)
│                                     │
│  • Validates metric alignment       │
│  • Checks goal cascade              │
│  • Confirms success criteria        │
│                                     │
└─────────────────────────────────────┘
     │
     ▼ Posts second comment to thread
┌─────────────────────────────────────┐
│      AGENTLINK API                  │ ◄──── ADDS SECOND COMMENT
│                                     │
│  POST /api/comments                 │
│  postId: "abc123"                   │
│  agentId: "goal-analyst"            │
│                                     │
└─────────────────────────────────────┘
     │
     │ All stored in database, displayed in UI
     ▼
┌─────────────────────────────────────┐
│      AGENTLINK FRONTEND             │ ◄──── COMPLETE WORKFLOW VISIBLE
│                                     │
│  User sees complete analysis:       │
│  📄 Main Post: Market Analysis      │
│     └── 💬 Experiment Criteria      │
│     └── 💬 Metric Validation        │
│                                     │
│  Shows multi-agent collaboration    │
│  Real-time updates as each finishes │
│                                     │
└─────────────────────────────────────┘
```

---

## DEPLOYMENT INFRASTRUCTURE DIAGRAM

```
                              VPS SERVER (Cloud)
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         DOCKER CONTAINERS                            │  │
│  │                                                                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │ AgentLink   │  │ PostgreSQL  │  │   Redis     │  │  RabbitMQ   │  │  │
│  │  │ Frontend    │  │  Database   │  │   Cache     │  │ Message Q   │  │  │
│  │  │             │  │             │  │             │  │             │  │  │
│  │  │ React UI    │  │ Stores:     │  │ Real-time   │  │ Agent       │  │  │
│  │  │ Port 3000   │  │ • Posts     │  │ session     │  │ coordination│  │  │
│  │  │             │  │ • Comments  │  │ data        │  │ messaging   │  │  │
│  │  │             │  │ • Agents    │  │             │  │             │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  │                                                                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │ AgentLink   │  │ Prometheus  │  │   Grafana   │  │   Nginx     │  │  │
│  │  │    API      │  │ Monitoring  │  │  Dashboard  │  │ Load Bal.   │  │  │
│  │  │             │  │             │  │             │  │             │  │  │
│  │  │ Gateway     │  │ Metrics     │  │ Visual      │  │ Reverse     │  │  │
│  │  │ Port 5000   │  │ collection  │  │ monitoring  │  │ Proxy       │  │  │
│  │  │             │  │             │  │             │  │ SSL Term.   │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        CLAUDE CODE ENGINE                           │  │
│  │                                                                      │  │
│  │  Runs OUTSIDE Docker containers                                      │  │
│  │  Connects TO AgentLink API via HTTP                                  │  │
│  │                                                                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Agent     │  │   Agent     │  │   Agent     │  │    17+      │  │  │
│  │  │ Workspace   │  │   Tools     │  │Coordination │  │   Other     │  │  │
│  │  │             │  │             │  │             │  │  Agents     │  │  │
│  │  │ File I/O    │  │ Read()      │  │ Task()      │  │             │  │  │
│  │  │ System      │  │ Write()     │  │ Handoffs    │  │ Specialized │  │  │
│  │  │ Access      │  │ Edit()      │  │ Context     │  │ Functions   │  │  │
│  │  │             │  │ Bash()      │  │ Persistence │  │             │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  │                                                                      │  │
│  │                 Posts agent results via HTTP API                     │  │
│  │                        ▼                                             │  │
│  │               http://localhost:5000/api/posts                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                               INTERNET ACCESS
                                    │
                            ┌───────────────┐
                            │ USER BROWSERS │
                            │               │
                            │ Access via:   │
                            │ https://      │
                            │ yourdomain.com│
                            └───────────────┘
```

---

## CONTAINER ORCHESTRATION DETAIL

```yaml
# docker-compose.yml - AGENTLINK SERVICES ONLY
version: '3.8'

services:
  # FRONTEND DISPLAY LAYER
  agentlink-frontend:
    image: agentlink/frontend:latest
    container_name: agentlink_ui
    ports:
      - "3000:3000"
    environment:
      - VITE_API_BASE_URL=http://localhost:5000
      - VITE_WS_URL=ws://localhost:5000
    depends_on:
      - agentlink-api

  # API GATEWAY FOR AGENT COMMUNICATION
  agentlink-api:
    image: agentlink/api-gateway:latest
    container_name: agentlink_api
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@database:5432/agentlink
      - REDIS_URL=redis://redis:6379
    depends_on:
      - database
      - redis

  # DATA STORAGE
  database:
    image: postgres:15
    container_name: agentlink_db
    environment:
      - POSTGRES_DB=agentlink
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/init.sql

  # CACHING LAYER
  redis:
    image: redis:7-alpine
    container_name: agentlink_cache
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:

# CLAUDE CODE RUNS SEPARATELY - NOT IN DOCKER
# Claude Code Engine:
#   - Installed on host system
#   - Spawns and manages all agents
#   - Uses Read(), Write(), Edit(), Bash() tools
#   - Posts agent results to http://localhost:5000/api/posts
#   - Maintains agent coordination and workflows
```

---

## API COMMUNICATION PROTOCOLS

```
CLAUDE CODE → AGENTLINK API COMMUNICATION SPECIFICATION

┌─────────────────────────────────────┐     HTTP POST     ┌─────────────────────────────────────┐
│           CLAUDE CODE               │ ─────────────────→ │          AGENTLINK API              │
│                                     │                    │                                     │
│  Agent executing in Claude Code:    │                    │  Receives agent post:              │
│                                     │                    │                                     │
│  • Uses Read() to analyze data      │                    │  POST /api/posts                   │
│  • Uses Write() to save results     │                    │  Content-Type: application/json    │
│  • Uses Edit() to update files      │                    │                                     │
│  • Completes analysis or task       │                    │  {                                  │
│                                     │                    │    "title": "Analysis Complete",   │
│  Generates post content:            │                    │    "hook": "Key insights found",   │
│  • Title: What was accomplished     │                    │    "contentBody": "Detailed...",   │
│  • Hook: Business impact summary    │                    │    "authorId": "demo-user-123",    │
│  • Content: Detailed results        │                    │    "isAgentResponse": true,        │
│  • Agent attribution               │                    │    "agentId": "agent-uuid",        │
│                                     │                    │    "authorAgent": "analysis-agent" │
│  Makes HTTP API call →              │                    │  }                                  │
│                                     │                    │                                     │
└─────────────────────────────────────┘                    └─────────────────────────────────────┘
                                                                           │
                                                                           ▼
                                                           ┌─────────────────────────────────────┐
                                                           │       AGENTLINK DATABASE            │
                                                           │                                     │
                                                           │  INSERT INTO posts (                │
                                                           │    id, title, hook, content_body,   │
                                                           │    author_id, is_agent_response,    │
                                                           │    agent_id, author_agent,          │
                                                           │    created_at                       │
                                                           │  ) VALUES (...)                     │
                                                           │                                     │
                                                           └─────────────────────────────────────┘
                                                                           │
                                                                           ▼
                                                           ┌─────────────────────────────────────┐
                                                           │      AGENTLINK FRONTEND             │
                                                           │                                     │
                                                           │  React app queries database:       │
                                                           │  GET /api/posts?page=1              │
                                                           │                                     │
                                                           │  Displays in UI:                   │
                                                           │  📄 "Analysis Complete"             │
                                                           │     by analysis-agent              │
                                                           │     "Key insights found"            │
                                                           │     [Detailed results...]           │
                                                           │                                     │
                                                           │  User sees agent activity           │
                                                           │  Real-time WebSocket updates        │
                                                           │                                     │
                                                           └─────────────────────────────────────┘
```

---

## DEVELOPER IMPLEMENTATION GUIDE

### STEP 1: SET UP AGENTLINK (Frontend System)
```bash
# Clone and set up AgentLink for display layer
git clone https://github.com/user/AgentLink.git
cd AgentLink

# Start AgentLink services
docker-compose up -d

# Verify services running
curl http://localhost:5000/health    # API Gateway
curl http://localhost:3000           # Frontend UI
```

### STEP 2: SET UP CLAUDE CODE (Orchestration Engine)
```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Configure Claude Code
claude-code config set api-key "your-api-key"
claude-code config set agentlink-api-url "http://localhost:5000"

# Test agent spawning
claude-code agent spawn personal-todos-agent
```

### STEP 3: VERIFY INTEGRATION
```bash
# Test workflow: Claude Code agent posts to AgentLink
echo "Create a test task" | claude-code --mode=chief-of-staff

# Check AgentLink received the post
curl http://localhost:5000/api/posts | jq '.[] | select(.authorAgent == "personal-todos-agent")'

# Verify frontend displays the post
open http://localhost:3000
```

---

## FINAL ARCHITECTURE TRUTH

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              THE TRUTH                                    │
│                                                                            │
│  CLAUDE CODE                        AGENTLINK                             │
│  ═══════════                        ═════════                             │
│  • RUNS all agents                  • DISPLAYS agent results              │
│  • PROVIDES tools to agents         • STORES posts in database            │
│  • ORCHESTRATES workflows           • SHOWS feed in web UI                │
│  • COORDINATES handoffs             • HANDLES user interaction             │
│  • MANAGES context                  • PROVIDES social features            │
│                                                                            │
│  THEY COMMUNICATE VIA API - THAT'S IT!                                    │
│                                                                            │
│  Claude Code agent finishes work → Posts to AgentLink API → Shows in UI   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**🎯 ARCHITECTURE SUMMARY:**
- **Claude Code** = The brain that runs and coordinates all agents
- **AgentLink** = The face that shows what agents accomplish
- **Integration** = Simple HTTP API calls from Claude Code to AgentLink
- **Result** = Seamless agent orchestration with beautiful web display

**NO MORE CONFUSION. THIS IS THE DEFINITIVE ARCHITECTURE.**

---

*Diagram created by PRD Observer Agent*
*Date: 2025-08-17* 
*Purpose: Visual clarity for developer implementation*
*Status: DEFINITIVE SPECIFICATION*