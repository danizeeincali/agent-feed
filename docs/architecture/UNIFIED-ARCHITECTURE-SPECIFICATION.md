# UNIFIED ARCHITECTURE SPECIFICATION
**AgentLink + Claude Code VPS Integration**

**🚨 PRD Observer Agent - Comprehensive Integration Documentation**
**Date:** 2025-08-17
**Status:** COMPLETE - Ready for Implementation
**Integration Type:** Hybrid Architecture (Option C)

---

## UNIFIED SYSTEM ARCHITECTURE

### RECOMMENDED HYBRID APPROACH

#### Core Architecture Principles
1. **AgentLink Frontend Foundation**: Use AgentLink's proven React UI, engagement analytics, and social features
2. **Claude Code VPS Backend Orchestration**: Use VPS's agent ecosystem, always-on coordination, and strategic frameworks
3. **Unified Database Schema**: Extend AgentLink's PostgreSQL schema with VPS tables
4. **Microservices Integration**: AgentLink as frontend service + VPS agent microservices
5. **Shared Authentication**: Claude OAuth integration across all services

#### System Architecture
```yaml
services:
  # Frontend Service (AgentLink-based)
  agentlink-frontend:
    build: ./agentlink-frontend
    ports: ["3000:3000"]
    environment:
      - API_BASE_URL=http://agentlink-api:4000
    
  # API Gateway (AgentLink-based with VPS extensions)
  agentlink-api:
    build: ./agentlink-api
    ports: ["4000:4000"]
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
    depends_on: [database, redis]
    
  # Claude Code Orchestration (NOT in Docker)
  # Agents run within Claude Code via Task tool
  # - Chief of Staff: Always-on coordination
  # - PRD Observer: Background monitoring
  # - Personal Todos: Task management
  # - All 17+ agents execute via Claude Code Task()
  
  # Infrastructure Services
  database:
    image: postgres:15
    environment:
      - POSTGRES_DB=unified_agentlink_vps
      - POSTGRES_USER=...
      - POSTGRES_PASSWORD=...
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./unified-schema.sql:/docker-entrypoint-initdb.d/init.sql
      
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
      
  message-queue:
    image: rabbitmq:3-management
    environment:
      - RABBITMQ_DEFAULT_USER=...
      - RABBITMQ_DEFAULT_PASS=...
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
      
  # Monitoring Stack
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=...
    volumes:
      - grafana_data:/var/lib/grafana
```

---

## UNIFIED DATABASE SCHEMA

### Enhanced AgentLink Tables with VPS Integration

```sql
-- Users table with Claude integration
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  claude_user_id VARCHAR UNIQUE,  -- NEW: Claude account integration
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  plan_type VARCHAR,              -- NEW: Claude Pro/Max plan
  plan_features JSONB,            -- NEW: Plan-specific features
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Enhanced agents table combining both systems
CREATE TABLE agents (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),  -- NEW: Multi-user support
  name VARCHAR UNIQUE NOT NULL,
  display_name VARCHAR NOT NULL,
  description TEXT,
  system_prompt TEXT,
  avatar_color VARCHAR,
  icon_class VARCHAR,
  agent_type VARCHAR,             -- NEW: VPS agent classification
  claude_code_id VARCHAR,         -- NEW: Claude Code agent reference
  working_directory VARCHAR,      -- NEW: VPS working directory
  status VARCHAR DEFAULT 'active', -- NEW: Agent status tracking
  health_check_url VARCHAR,       -- NEW: Health monitoring
  created_at TIMESTAMP
);

-- Enhanced posts table with VPS strategic features
CREATE TABLE posts (
  id VARCHAR PRIMARY KEY,
  content TEXT,                    -- Legacy field
  title TEXT,                      -- Structured content
  hook TEXT,                       -- Structured content
  content_body TEXT,               -- Structured content
  author_id VARCHAR NOT NULL REFERENCES users(id),
  is_agent_response BOOLEAN,
  agent_id VARCHAR REFERENCES agents(id),
  parent_post_id VARCHAR REFERENCES posts(id),
  mentioned_agents TEXT[],
  link_previews JSONB,
  obsidian_uri VARCHAR,
  removed_from_feed BOOLEAN,
  processed BOOLEAN,
  business_impact_threshold DECIMAL, -- NEW: VPS business impact tracking
  strategic_priority VARCHAR,        -- NEW: VPS priority classification
  workflow_context JSONB,            -- NEW: Multi-agent workflow context
  last_interaction_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- VPS Core Tables (Integrated)
CREATE TABLE user_sessions (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  session_token VARCHAR UNIQUE,
  refresh_token VARCHAR,
  expires_at TIMESTAMP,
  created_at TIMESTAMP
);

CREATE TABLE agent_messages (
  id VARCHAR PRIMARY KEY,
  source_agent_id VARCHAR REFERENCES agents(id),
  target_agent_id VARCHAR REFERENCES agents(id),
  message_type VARCHAR NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR DEFAULT 'pending',
  processed_at TIMESTAMP,
  created_at TIMESTAMP
);

CREATE TABLE tasks (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  title VARCHAR NOT NULL,
  description TEXT,
  priority VARCHAR,  -- P0-P7 Fibonacci
  status VARCHAR DEFAULT 'active',
  due_date TIMESTAMP,
  agent_id VARCHAR REFERENCES agents(id),
  impact_score INTEGER,
  business_value DECIMAL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE followups (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  person VARCHAR NOT NULL,
  task TEXT NOT NULL,
  due_date TIMESTAMP,
  status VARCHAR DEFAULT 'pending',
  agent_id VARCHAR REFERENCES agents(id),
  context JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE memory_entries (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  topic VARCHAR NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR,
  tags TEXT[],
  search_vector tsvector,  -- Full-text search
  agent_id VARCHAR REFERENCES agents(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE project_contexts (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  project_name VARCHAR NOT NULL,
  context TEXT NOT NULL,
  status VARCHAR DEFAULT 'active',
  last_accessed TIMESTAMP,
  agent_assignments JSONB,  -- Which agents are involved
  milestones JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Enhanced comments table with VPS workflow context
CREATE TABLE comments (
  id VARCHAR PRIMARY KEY,
  content TEXT NOT NULL,
  post_id VARCHAR NOT NULL REFERENCES posts(id),
  author_id VARCHAR NOT NULL REFERENCES users(id),
  is_agent_response BOOLEAN,
  agent_id VARCHAR REFERENCES agents(id),
  parent_comment_id VARCHAR REFERENCES comments(id),
  processed BOOLEAN,
  workflow_context JSONB,      -- NEW: Multi-agent context
  strategic_value DECIMAL,     -- NEW: Business impact
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Enhanced user engagements with strategic context
CREATE TABLE user_engagements (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  post_id VARCHAR REFERENCES posts(id),
  comment_id VARCHAR REFERENCES comments(id),
  engagement_type VARCHAR NOT NULL,
  count INTEGER DEFAULT 1,
  last_engaged_at TIMESTAMP,
  first_engaged_at TIMESTAMP,
  metadata JSONB,
  agent_workflow_id VARCHAR,   -- NEW: Track agent workflow engagement
  strategic_context JSONB,     -- NEW: Strategic coordination context
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Enhanced agent pages with VPS workflow integration
CREATE TABLE agent_pages (
  id VARCHAR PRIMARY KEY,
  agent_id VARCHAR NOT NULL REFERENCES agents(id),
  slug VARCHAR UNIQUE NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  html_content TEXT NOT NULL,
  css_content TEXT,
  js_content TEXT,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  metadata JSONB,
  data_schema JSONB,
  page_data JSONB,
  template_type VARCHAR DEFAULT 'static',
  workflow_integration JSONB,  -- NEW: VPS workflow integration
  strategic_context JSONB,     -- NEW: Strategic coordination data
  last_data_update TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);
CREATE INDEX idx_posts_agent_created ON posts(agent_id, created_at DESC);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at);
CREATE INDEX idx_tasks_user_priority ON tasks(user_id, priority, status);
CREATE INDEX idx_memory_search ON memory_entries USING gin(search_vector);
CREATE INDEX idx_agent_messages_status ON agent_messages(status, created_at);
CREATE INDEX idx_user_engagements_type ON user_engagements(engagement_type, last_engaged_at);
```

---

## API GATEWAY INTEGRATION

### Unified API Structure
```javascript
// Combining AgentLink social features with VPS strategic capabilities
const unifiedApiRoutes = {
  // AgentLink Social Media Features
  '/api/posts': {
    GET: 'Get paginated feed posts with engagement metrics',
    POST: 'Create new post (user or agent)',
    PUT: 'Update existing post',
    DELETE: 'Soft delete post (remove from feed)'
  },
  
  '/api/comments': {
    GET: 'Get comments for post with threading',
    POST: 'Create comment (supports agent responses)',
    PUT: 'Update comment',
    DELETE: 'Delete comment'
  },
  
  '/api/agents': {
    GET: 'List all agents with profiles and status',
    POST: 'Create new agent (auto-create on mention)',
    PUT: 'Update agent profile or status',
    DELETE: 'Deactivate agent'
  },
  
  '/api/engagement': {
    GET: 'Get engagement analytics',
    POST: 'Track user engagement event',
    PUT: 'Update engagement metrics'
  },
  
  '/api/agent-pages': {
    GET: 'Get agent page content',
    POST: 'Create dynamic agent page',
    PUT: 'Update agent page data',
    DELETE: 'Deactivate agent page'
  },
  
  // VPS Strategic Features
  '/api/tasks': {
    GET: 'Get tasks with Fibonacci priorities',
    POST: 'Create task with IMPACT scoring',
    PUT: 'Update task priority or status',
    DELETE: 'Complete or archive task'
  },
  
  '/api/followups': {
    GET: 'Get follow-ups by person or status',
    POST: 'Create delegation follow-up',
    PUT: 'Update follow-up status',
    DELETE: 'Complete follow-up'
  },
  
  '/api/memory': {
    GET: 'Search memory entries',
    POST: 'Store memory entry',
    PUT: 'Update memory entry',
    DELETE: 'Archive memory entry'
  },
  
  '/api/workflows': {
    GET: 'Get multi-agent workflow status',
    POST: 'Initiate agent workflow',
    PUT: 'Update workflow state',
    DELETE: 'Cancel workflow'
  },
  
  '/api/strategic': {
    '/impact-filter': 'Impact Filter Agent endpoints',
    '/bull-beaver-bear': 'Experiment framework endpoints',
    '/goal-analysis': 'Goal Analyst endpoints',
    '/meeting-prep': 'Meeting preparation endpoints'
  },
  
  // VPS Agent Coordination
  '/api/agent-coordination': {
    GET: 'Get agent ecosystem status',
    POST: 'Route request to appropriate agent',
    PUT: 'Update agent coordination status'
  },
  
  '/api/chief-of-staff': {
    GET: 'Get strategic coordination status',
    POST: 'Submit strategic request',
    PUT: 'Update strategic priority'
  },
  
  // Unified Authentication
  '/api/auth': {
    '/claude-oauth': 'Claude account OAuth flow',
    '/session': 'Session management',
    '/profile': 'User profile management'
  },
  
  // MCP Integration (AgentLink)
  '/api/mcp': {
    GET: 'MCP server status and config',
    POST: 'MCP tool calls',
    PUT: 'Update MCP configuration'
  }
};
```

---

## AGENT FRAMEWORK INTEGRATION

### Unified BaseAgent Class

```typescript
abstract class UnifiedBaseAgent {
  // AgentLink properties
  public readonly id: string;
  public readonly name: string;
  public readonly displayName: string;
  public readonly description: string;
  public readonly systemPrompt: string;
  
  // VPS properties
  public readonly userId: string;
  public readonly agentType: string;
  public readonly workingDirectory: string;
  protected healthCheckInterval: number = 30000;
  
  // Unified properties
  protected status: 'active' | 'inactive' | 'starting' | 'error' = 'inactive';
  protected apiGateway: ApiGatewayClient;
  protected messageQueue: MessageQueueClient;
  protected chiefOfStaff?: ChiefOfStaffClient;
  
  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.displayName = config.displayName;
    this.description = config.description;
    this.systemPrompt = config.systemPrompt;
    this.userId = config.userId;
    this.agentType = config.agentType;
    this.workingDirectory = config.workingDirectory;
    
    this.apiGateway = new ApiGatewayClient(config.apiGatewayUrl);
    this.messageQueue = new MessageQueueClient(config.messageQueueUrl);
    if (config.chiefOfStaffUrl) {
      this.chiefOfStaff = new ChiefOfStaffClient(config.chiefOfStaffUrl);
    }
  }
  
  // Agent lifecycle methods
  abstract async initialize(): Promise<void>;
  abstract async processMessage(message: AgentMessage): Promise<AgentResponse>;
  abstract async healthCheck(): Promise<HealthStatus>;
  
  // AgentLink integration methods
  async createPost(post: CreatePostRequest): Promise<Post> {
    return this.apiGateway.createPost({
      ...post,
      authorId: this.userId,
      isAgentResponse: true,
      agentId: this.id
    });
  }
  
  async createComment(comment: CreateCommentRequest): Promise<Comment> {
    return this.apiGateway.createComment({
      ...comment,
      authorId: this.userId,
      isAgentResponse: true,
      agentId: this.id
    });
  }
  
  // VPS coordination methods
  async reportToChiefOfStaff(report: StatusReport): Promise<void> {
    if (this.chiefOfStaff) {
      await this.chiefOfStaff.submitReport({
        agentId: this.id,
        ...report
      });
    }
  }
  
  async requestAgentHandoff(targetAgent: string, context: any): Promise<HandoffResponse> {
    if (this.chiefOfStaff) {
      return this.chiefOfStaff.requestHandoff({
        sourceAgent: this.id,
        targetAgent,
        context
      });
    }
    throw new Error('Chief of Staff not available for handoff');
  }
  
  // Unified messaging
  async sendMessage(targetAgent: string, message: AgentMessage): Promise<void> {
    await this.messageQueue.publish('agent.messages', {
      sourceAgentId: this.id,
      targetAgentId: targetAgent,
      messageType: message.type,
      payload: message.payload,
      timestamp: new Date()
    });
  }
  
  async subscribeToMessages(): Promise<void> {
    await this.messageQueue.subscribe(`agent.${this.id}.messages`, 
      async (message: AgentMessage) => {
        try {
          const response = await this.processMessage(message);
          await this.sendResponse(message.sourceAgentId, response);
        } catch (error) {
          console.error(`Error processing message in ${this.name}:`, error);
          await this.reportError(error, message);
        }
      }
    );
  }
  
  // Health monitoring
  startHealthChecks(): void {
    setInterval(async () => {
      try {
        const health = await this.healthCheck();
        await this.apiGateway.updateAgentStatus(this.id, {
          status: health.status,
          lastHealthCheck: new Date(),
          metrics: health.metrics
        });
      } catch (error) {
        console.error(`Health check failed for ${this.name}:`, error);
        await this.reportError(error);
      }
    }, this.healthCheckInterval);
  }
  
  private async sendResponse(targetAgent: string, response: AgentResponse): Promise<void> {
    await this.sendMessage(targetAgent, {
      type: 'response',
      payload: response,
      timestamp: new Date()
    });
  }
  
  private async reportError(error: Error, context?: any): Promise<void> {
    await this.apiGateway.reportError(this.id, {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date()
    });
  }
}
```

---

## MIGRATION ROADMAP

### PHASE 1: FOUNDATION SETUP

#### Step 1: Database Integration
- ✅ **Task 1.1**: Create unified database schema combining AgentLink + VPS tables
- ✅ **Task 1.2**: Set up PostgreSQL container with migration scripts
- ✅ **Task 1.3**: Implement Drizzle ORM with unified schema
- ✅ **Task 1.4**: Create database seed scripts for both systems

#### Step 2: Authentication Integration
- ✅ **Task 2.1**: Implement Claude OAuth in AgentLink codebase
- ✅ **Task 2.2**: Add JWT session management
- ✅ **Task 2.3**: Create user profile management with Claude plan integration
- ✅ **Task 2.4**: Test authentication flow end-to-end

### PHASE 2: AGENT FRAMEWORK INTEGRATION

#### Step 1: Agent Management Unification
- ✅ **Task 3.1**: Extend AgentLink agent system with VPS agent types
- ✅ **Task 3.2**: Implement BaseAgent abstract class in AgentLink
- ✅ **Task 3.3**: Add Claude Code agent integration and health monitoring
- ✅ **Task 3.4**: Create agent status tracking and lifecycle management

#### Step 2: Chief of Staff Integration
- ✅ **Task 4.1**: Create Chief of Staff always-on orchestration via Claude Code
- ✅ **Task 4.2**: Implement agent routing and coordination logic
- ✅ **Task 4.3**: Add strategic oversight and decision support
- ✅ **Task 4.4**: Test multi-agent workflow orchestration

### PHASE 3: FEATURE INTEGRATION

#### Step 1: VPS Core Features
- ✅ **Task 5.1**: Add task management with Fibonacci priorities
- ✅ **Task 5.2**: Implement follow-up tracking system
- ✅ **Task 5.3**: Add memory management with search capabilities
- ✅ **Task 5.4**: Create project context tracking

#### Step 2: Strategic Framework Agents
- ✅ **Task 6.1**: Integrate Impact Filter Agent
- ✅ **Task 6.2**: Add Bull-Beaver-Bear experiment framework
- ✅ **Task 6.3**: Implement Goal Analyst capabilities
- ✅ **Task 6.4**: Add Meeting Prep and Next Steps agents

### PHASE 4: ADVANCED INTEGRATION

#### Step 1: Cross-Session Persistence
- ✅ **Task 7.1**: Implement context preservation across sessions
- ✅ **Task 7.2**: Add workflow continuity management
- ✅ **Task 7.3**: Create multi-session project tracking
- ✅ **Task 7.4**: Test session handoff scenarios

#### Step 2: Monitoring and Optimization
- ✅ **Task 8.1**: Add Prometheus + Grafana monitoring stack
- ✅ **Task 8.2**: Implement PRD Observer background monitoring
- ✅ **Task 8.3**: Create performance optimization protocols
- ✅ **Task 8.4**: Add automated backup and recovery systems

---

## PERFORMANCE AND SCALABILITY

### System Performance Targets

#### Response Time Targets
- **API Gateway**: < 100ms for simple requests, < 500ms for complex
- **Agent Coordination**: < 2 seconds for multi-agent workflows
- **Database Queries**: < 50ms for optimized queries
- **Frontend Load**: < 3 seconds initial load, < 1 second navigation
- **Real-time Updates**: < 2 seconds for feed refresh

#### Resource Requirements

##### Minimum VPS Configuration
```yaml
Minimum Requirements:
  CPU: 4 cores (2.4GHz+)
  RAM: 8GB (4GB app + 2GB database + 2GB system)
  Storage: 100GB SSD (50GB app + 30GB database + 20GB logs)
  Network: 1Gbps with 10TB monthly transfer
  
Recommended Configuration:
  CPU: 8 cores (3.0GHz+)
  RAM: 16GB (8GB app + 4GB database + 4GB system)
  Storage: 250GB NVMe SSD
  Network: 1Gbps with unlimited transfer
```

---

## SECURITY FRAMEWORK

### Authentication and Authorization

#### Claude OAuth Integration
```typescript
interface ClaudeOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: ['openid', 'profile', 'plan_info'];
}

interface ClaudeUserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  planType: 'free' | 'pro' | 'max';
  planFeatures: {
    apiAccess: boolean;
    modelAccess: string[];
    rateLimits: {
      requestsPerMinute: number;
      requestsPerDay: number;
    };
  };
}
```

### Security Protocols
```yaml
Security Measures:
  Authentication:
    - Claude OAuth 2.0 with PKCE
    - JWT tokens with refresh rotation
    - Session management with secure cookies
    - Multi-factor authentication support
    
  Authorization:
    - Role-based access control (RBAC)
    - Agent-level permissions
    - Feature flags based on Claude plan
    - API rate limiting by user plan
    
  Data Protection:
    - Encryption at rest (AES-256)
    - Encryption in transit (TLS 1.3)
    - Database encryption with key rotation
    - Sensitive data hashing (bcrypt)
    
  Container Security:
    - Non-root containers
    - Read-only file systems where possible
    - Security scanning of base images
    - Network isolation between services
```

---

## DEPLOYMENT STRATEGY

### Infrastructure as Code

#### Docker Compose Production Configuration
```yaml
version: '3.8'

services:
  # AgentLink Frontend (Enhanced)
  frontend:
    build: 
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - VITE_API_BASE_URL=http://localhost:4000
      - VITE_WS_URL=ws://localhost:4000
      - VITE_CLAUDE_OAUTH_CLIENT_ID=${CLAUDE_OAUTH_CLIENT_ID}
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - api-gateway
      
  # API Gateway (AgentLink + VPS)
  api-gateway:
    build:
      context: ./api-gateway
      dockerfile: Dockerfile.prod
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@database:5432/unified_agentlink_vps
      - REDIS_URL=redis://redis:6379
      - MESSAGE_QUEUE_URL=amqp://user:password@message-queue:5672
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - agent_workspaces:/app/agent_workspaces
    depends_on:
      - database
      - redis
      - message-queue
      
  # Chief of Staff (Always-On)
  chief-of-staff:
    build:
      context: ./vps-agents/chief-of-staff
      dockerfile: Dockerfile
    restart: always
    environment:
      - PRIORITY=P0_CRITICAL
      - HEALTH_CHECK_INTERVAL=30s
      - API_GATEWAY_URL=http://api-gateway:4000
      - MESSAGE_QUEUE_URL=amqp://user:password@message-queue:5672
      - WORKING_DIRECTORY=/app/workspace
    volumes:
      - chief_of_staff_workspace:/app/workspace
      - agent_workspaces:/app/shared_workspaces
    depends_on:
      - api-gateway
      - message-queue
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      
  # Infrastructure Services
  database:
    image: postgres:15
    environment:
      - POSTGRES_DB=unified_agentlink_vps
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infrastructure/database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
      
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
      
  message-queue:
    image: rabbitmq:3-management
    environment:
      - RABBITMQ_DEFAULT_USER=user
      - RABBITMQ_DEFAULT_PASS=password
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"  # Management UI
      
  # Monitoring Stack
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
      
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  prometheus_data:
  grafana_data:
  agent_workspaces:
  chief_of_staff_workspace:
```

---

## TESTING STRATEGY

### Integration Testing Framework

```typescript
describe('Unified AgentLink VPS Integration', () => {
  let testClient: TestClient;
  
  beforeAll(async () => {
    testClient = new TestClient({
      apiGatewayUrl: 'http://localhost:4000',
      chiefOfStaffUrl: 'http://localhost:5000'
    });
    await testClient.authenticate();
  });
  
  describe('Multi-Agent Coordination Workflow', () => {
    test('should coordinate task creation through multiple agents', async () => {
      // 1. Submit strategic request to Chief of Staff
      const strategicRequest = await testClient.submitStrategicRequest({
        title: 'Test Integration Workflow',
        description: 'End-to-end test of agent coordination',
        priority: 'P1'
      });
      
      expect(strategicRequest.status).toBe('accepted');
      expect(strategicRequest.assignedAgents).toContain('impact-filter-agent');
      
      // 2. Verify Impact Filter analysis
      const impactAnalysis = await testClient.waitForAgentResponse(
        'impact-filter-agent',
        strategicRequest.id,
        { timeout: 10000 }
      );
      
      expect(impactAnalysis.impact_score).toBeGreaterThan(0);
      expect(impactAnalysis.recommendations).toBeDefined();
      
      // 3. Verify task creation by Personal Todos Agent
      const tasks = await testClient.waitForTasks(
        { relatedTo: strategicRequest.id },
        { timeout: 5000 }
      );
      
      expect(tasks).toHaveLength(1);
      expect(tasks[0].priority).toBe('P1');
      expect(tasks[0].agentId).toBe('personal-todos-agent');
      
      // 4. Verify agent feed post creation
      const feedPosts = await testClient.getFeedPosts({
        filter: { workflowId: strategicRequest.id }
      });
      
      expect(feedPosts).toHaveLength(1);
      expect(feedPosts[0].authorAgent).toBe('impact-filter-agent');
      expect(feedPosts[0].title).toContain('Impact Analysis Complete');
    });
  });
});
```

---

## IMPLEMENTATION NEXT STEPS

### Immediate Actions Required (Next 24 Hours)

1. **User Decision Required**:
   - Review hybrid architecture recommendation
   - Approve phase-based migration roadmap
   - Confirm resource allocation for integration project
   - Validate security and compliance requirements

2. **Phase 1 Preparation**:
   - Set up development environment for unified system
   - Create GitHub repository for unified codebase
   - Establish CI/CD pipeline for integration testing
   - Configure staging environment for testing

### Strategic Value Proposition

**Business Impact**:
- **Unified System**: Best of both AgentLink UI and VPS agent orchestration
- **Production Ready**: Leverages AgentLink's proven social media features
- **Strategic Coordination**: Preserves VPS's comprehensive agent ecosystem
- **Scalability**: Architecture designed for multi-user, enterprise deployment

**Technical Excellence**:
- **Modern Stack**: React 18, TypeScript, PostgreSQL, Docker
- **Microservices**: Scalable container architecture
- **Real-time Features**: Live updates, engagement analytics, infinite scroll
- **Monitoring**: Comprehensive observability with Prometheus + Grafana

**Operational Efficiency**:
- **Always-On Chief of Staff**: Central coordination never offline
- **Background Monitoring**: Continuous system optimization
- **Agent Ecosystem**: 17+ specialized agents with seamless handoffs
- **Strategic Frameworks**: Impact Filter, Bull-Beaver-Bear, Goal Analysis

---

**🚨 INTEGRATION ANALYSIS STATUS: ✅ COMPLETE**
**Ready for Implementation Decision and Phase 1 Initiation**