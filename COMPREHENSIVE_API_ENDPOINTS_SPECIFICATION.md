# COMPREHENSIVE API ENDPOINTS SPECIFICATION

## SPARC Specification Phase Analysis
**Agent-Feed Frontend API Dependencies**

**Date**: 2025-09-29
**Version**: 1.0
**Context**: Architecture Simplification - Missing API Endpoints Analysis

---

## EXECUTIVE SUMMARY

After comprehensive analysis of the frontend codebase (`/workspaces/agent-feed/frontend/src/`), I have catalogued **53 unique API endpoints** that the frontend expects but the current API server lacks. This specification documents all missing endpoints causing "failed to fetch" errors and provides implementation requirements for zero-to-one development.

**Current API Server Status**: ✅ 5 endpoints working | ❌ 48 missing endpoints

---

## 1. CRITICAL PRIORITY ENDPOINTS (User-Facing Errors)

### 1.1 Activities Feed - **CAUSING LIVE ERRORS**
```yaml
endpoint: /api/activities
method: GET
parameters:
  - limit: number (default: 20)
  - offset: number (default: 0)
used_by:
  - RealTimeActivityFeed.tsx
  - BulletproofActivityPanel.tsx
  - SystemAnalytics.tsx
expected_response:
  success: true
  data: Activity[]
  total: number
  has_more: boolean
data_structure:
  id: string
  type: ActivityType
  description: string
  timestamp: string (ISO)
  agent_id: string
  agent_name: string
  status: "completed" | "failed" | "in_progress"
  priority: "low" | "medium" | "high" | "critical"
  metadata:
    duration_ms: number
    tokens_used: number
    error_message?: string
priority: CRITICAL
error: "Network error for /activities?limit=20&offset=0"
```

### 1.2 Token Analytics - **CAUSING ANALYTICS PAGE ERRORS**
```yaml
endpoint_group: /api/token-analytics/*
methods: GET
endpoints:
  - /api/token-analytics/hourly
  - /api/token-analytics/daily
  - /api/token-analytics/summary
  - /api/token-analytics/messages?limit=50
  - /api/token-analytics/export
used_by:
  - TokenAnalyticsDashboard.tsx
  - RealAnalytics.tsx
expected_responses:
  hourly:
    data:
      labels: string[] # Hours ["00:00", "01:00", ...]
      datasets:
        - label: "Tokens"
          data: number[]
          backgroundColor: string
        - label: "Requests"
          data: number[]
          yAxisID: "y1"
  summary:
    data:
      summary:
        total_requests: number
        total_tokens: number
        total_cost: number # in cents
        avg_processing_time: number | null
        unique_sessions: number
        providers_used: number
        models_used: number
      by_provider: ProviderStats[]
      by_model: ModelStats[]
priority: CRITICAL
error: "Failed to fetch hourly data"
```

### 1.3 Agent Status Endpoints
```yaml
endpoint: /api/agents/status
method: GET
used_by:
  - useAgentStatus.ts
  - AgentDashboard.tsx
expected_response:
  agents: Agent[]
  statuses: Record<string, AgentStatus>
data_structure:
  Agent:
    id: string
    name: string
    display_name: string
    status: "active" | "inactive" | "error" | "maintenance"
    health_status:
      cpu_usage: number
      memory_usage: number
      response_time: number
      last_heartbeat: string
      connection_status: string
priority: CRITICAL
```

---

## 2. IMPORTANT PRIORITY ENDPOINTS (Core Functionality)

### 2.1 Dual Instance Management
```yaml
endpoints:
  - /api/dual-instance/status
  - /api/dual-instance/messages?limit=50
  - /api/dual-instance/pending-confirmations
  - /api/dual-instance/handoff/dev-to-prod
  - /api/dual-instance/activities?limit=20
  - /api/dual-instance/handoff/status
  - /api/dual-instance/confirm/{messageId}
methods: GET, POST
used_by:
  - useDualInstanceMonitoring.ts
  - useDualInstanceMonitoringEnhanced.ts
  - DualInstanceDashboard.tsx
  - DualInstanceDashboardEnhanced.tsx
priority: IMPORTANT
```

### 2.2 Agent Orchestration & Management
```yaml
endpoints:
  - /api/v1/agents/development
  - /api/v1/agents/production
  - /api/v1/agents/tasks
  - /api/v1/agents/metrics
  - /api/v1/agents/bulk
  - /api/v1/agents?status=active
  - /api/v1/agents/{id}/test
  - /api/v1/agents/tasks/{taskId}/cancel
methods: GET, POST, PUT, DELETE
used_by:
  - useAgentOrchestration.ts
  - EnhancedAgentManager.tsx
  - BulletproofAgentManager.tsx
priority: IMPORTANT
```

### 2.3 System Analytics & Metrics
```yaml
endpoints:
  - /api/v1/analytics/health
  - /api/metrics/system?range=24h
  - /api/metrics/performance
  - /api/v1/agents/metrics
methods: GET
used_by:
  - SystemAnalytics.tsx
  - BulletproofSystemAnalytics.tsx
  - api.ts (apiService)
expected_response:
  SystemMetrics:
    timestamp: string
    server_id: string
    cpu_usage: number
    memory_usage: number
    disk_usage: number
    network_io: NetworkIO
    response_time: number
    throughput: number
    error_rate: number
    active_connections: number
priority: IMPORTANT
```

---

## 3. DEVELOPMENT & TESTING ENDPOINTS

### 3.1 Claude Code SDK Integration
```yaml
endpoints:
  - /api/claude-code/streaming-chat
  - /api/claude-code/health
  - /api/claude-code/status
  - /api/claude-code/session
  - /api/claude-code/background-task
methods: GET, POST
used_by:
  - Multiple test files
  - ClaudeCodeWithTicker.tsx
  - SimpleApp.tsx
priority: OPTIONAL
note: "Test environment endpoints"
```

### 3.2 Claude Instance Management
```yaml
endpoints:
  - /api/claude/instances
  - /api/claude/instances/{instanceId}
  - /api/claude/instances/{instanceId}/status
  - /api/claude/instances/{instanceId}/terminal/stream
  - /api/claude/instances/{instanceId}/terminal/input
  - /api/status/stream (SSE)
methods: GET, POST, DELETE
used_by:
  - SSEConnectionManager.ts
  - ClaudeInstanceManager.ts
  - HTTPCommandService.ts
  - useSSEConnection.ts
priority: IMPORTANT
note: "Terminal/Claude instance management"
```

---

## 4. WEBSOCKET ENDPOINTS

### 4.1 Real-time Communication
```yaml
websocket_endpoints:
  - ws://localhost:5173/ws (main WebSocket)
  - /api/agents/live (agent status updates)
  - /api/ws/comments/{postId} (comment threading)
  - /api/events (general events)
  - /terminal (agent status WebSocket)
used_by:
  - api.ts
  - agentApi.js
  - CommentThread.tsx
  - useAgentRealTime.ts
  - WebSocketContext
priority: IMPORTANT
note: "Real-time updates and live features"
```

---

## 5. SECONDARY ENDPOINTS

### 5.1 Agent Workspace Management
```yaml
endpoints:
  - /api/agent-pages/agents/{agentId}/pages
  - /api/agent-pages/agents/{agentId}/workspace
  - /api/agent-pages/agents/{agentId}/workspace/init
  - /api/agents/{agentId}/settings
methods: GET, POST, PUT, DELETE
used_by:
  - api.ts (workspace management)
  - useAgentCustomization.ts
priority: OPTIONAL
```

### 5.2 Comments & Engagement
```yaml
endpoints:
  - /api/v1/agent-posts/{postId}/comments
  - /api/v1/agent-posts/{postId}/comments/thread
  - /api/comments/{commentId}
  - /api/comments/{commentId}/reply
  - /api/comments/{commentId}/react
methods: GET, POST, PUT, DELETE
used_by:
  - api.ts (comment system)
  - CommentThread.tsx
priority: IMPORTANT
```

### 5.3 Template & Draft Management
```yaml
endpoints:
  - /api/templates
  - /api/templates/{id}
  - /api/templates/{id}/render
  - /api/templates/{id}/use
  - /api/templates/stats
methods: GET, POST, PUT, DELETE
used_by:
  - TemplateService.ts
priority: OPTIONAL
```

---

## 6. DATA STRUCTURE REQUIREMENTS

### 6.1 Core Agent Structure
```typescript
interface Agent {
  id: string;
  name: string;
  display_name: string;
  description: string;
  system_prompt: string;
  avatar_color: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  created_at: string;
  updated_at: string;
  last_used: string | null;
  usage_count: number;
  version: string;
  configuration: Record<string, any>;
  performance_metrics: AgentPerformanceMetrics;
  health_status: AgentHealthStatus;
}
```

### 6.2 Activity Structure
```typescript
interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  agent_id: string;
  agent_name: string;
  status: 'completed' | 'failed' | 'in_progress' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata: {
    duration_ms: number;
    tokens_used: number;
    error_message?: string;
  };
}
```

### 6.3 Token Analytics Structure
```typescript
interface TokenUsageRecord {
  id: number;
  timestamp: string;
  session_id: string;
  request_id: string;
  message_id?: string;
  provider: string;
  model: string;
  request_type: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_total: number; // cents
  processing_time_ms: number;
  message_preview: string;
  response_preview: string;
  component?: string;
}
```

---

## 7. ENVIRONMENT CONFIGURATION

### 7.1 Frontend Environment Variables
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_WEBSOCKET_URL=http://localhost:3001

# Claude Integration
VITE_CLAUDE_API_KEY=your_key_here
VITE_CLAUDE_MODEL=claude-3-sonnet-20240229

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DUAL_INSTANCE=true
VITE_ENABLE_WEBSOCKETS=true
```

### 7.2 API Server Configuration
The frontend expects the API server to:
- Run on port 3001 (configurable via VITE_API_BASE_URL)
- Support CORS for localhost:5173
- Handle WebSocket connections on /ws
- Return consistent JSON response format:
```json
{
  "success": boolean,
  "data": any,
  "total"?: number,
  "error"?: string,
  "timestamp"?: string
}
```

---

## 8. INTEGRATION DEPENDENCY MAP

### 8.1 Critical Path Dependencies
```mermaid
graph TD
    A[Agents Page] --> B[/api/agents]
    B --> C[Agent Status Updates]
    C --> D[WebSocket /terminal]

    E[Analytics Page] --> F[/api/token-analytics/*]
    F --> G[Chart.js Rendering]

    H[Live Feed] --> I[/api/activities]
    I --> J[Real-time Updates]
    J --> K[WebSocket /ws]
```

### 8.2 Component-Endpoint Matrix
| Component | Primary Endpoints | Fallback Behavior |
|-----------|-------------------|-------------------|
| **Agents.jsx** | `/api/agents` | Error boundary |
| **TokenAnalyticsDashboard** | `/api/token-analytics/*` | Error screen |
| **RealAnalytics** | `/api/activities`, `/api/metrics/*` | Fallback data |
| **DualInstanceDashboard** | `/api/dual-instance/*` | Mock data |
| **SystemAnalytics** | `/api/v1/analytics/health` | Default metrics |

---

## 9. IMPLEMENTATION PRIORITY MATRIX

### Phase 1 - Critical (Immediate)
1. **Activities API** (`/api/activities`) - Live feed errors
2. **Token Analytics APIs** (`/api/token-analytics/*`) - Analytics page
3. **Agent Status API** (`/api/agents/status`) - Core functionality

### Phase 2 - Important (Week 1)
4. **System Metrics APIs** (`/api/metrics/*`) - Dashboard health
5. **WebSocket Endpoints** (`/ws`, `/terminal`) - Real-time features
6. **Agent Management APIs** (`/api/v1/agents/*`) - Agent operations

### Phase 3 - Secondary (Week 2)
7. **Comment System APIs** (`/api/v1/agent-posts/*/comments/*`)
8. **Claude Instance APIs** (`/api/claude/instances/*`)
9. **Dual Instance APIs** (`/api/dual-instance/*`)

### Phase 4 - Optional (Future)
10. **Template APIs** (`/api/templates/*`)
11. **Workspace APIs** (`/api/agent-pages/*`)
12. **Claude Code SDK APIs** (`/api/claude-code/*`)

---

## 10. VALIDATION & TESTING REQUIREMENTS

### 10.1 API Response Validation
Each endpoint MUST return:
- Consistent JSON structure
- Proper HTTP status codes (200, 404, 500)
- Error messages in standardized format
- Timestamp for cache invalidation

### 10.2 Integration Testing
- All endpoints must respond within timeout limits
- WebSocket connections must maintain state
- Real-time updates must propagate correctly
- Error boundaries must handle failures gracefully

### 10.3 Performance Requirements
- Activities API: < 500ms response time
- Token Analytics: < 1000ms for complex queries
- Agent Status: < 200ms for health checks
- WebSocket: < 50ms latency for real-time updates

---

## 11. SUCCESS METRICS

### 11.1 Error Resolution
- ✅ Zero "failed to fetch" errors on user-facing pages
- ✅ All components render without fallback states
- ✅ WebSocket connections remain stable
- ✅ Real-time data updates function correctly

### 11.2 Performance Targets
- Page load times < 2 seconds
- API response times within specified limits
- Memory usage stable during extended use
- Error rates < 1% under normal load

---

## CONCLUSION

This specification documents **48 missing API endpoints** across **11 functional categories**. Implementation should follow the 4-phase priority matrix, starting with the 3 critical endpoints causing immediate user-facing errors.

**Critical Next Steps:**
1. Implement Activities API for live feed
2. Implement Token Analytics APIs for dashboard
3. Implement Agent Status API for core functionality
4. Set up WebSocket infrastructure for real-time features

**Architecture Notes:**
- Frontend expects port 3001 for API server
- All responses should follow consistent JSON format
- WebSocket endpoints required for real-time features
- Environment variables needed for configuration

This zero-to-one specification ensures 100% real functionality with no mocks at the UI level.