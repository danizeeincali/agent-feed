# SPARC Specification: Activities API Endpoint Implementation

## Project Context
Implementation of a complete Activities API system that tracks REAL system activities without any mock data. The system must integrate with existing WebSocket infrastructure for real-time updates and capture authentic system operations.

## Current State Analysis

### Existing Implementation
- **Backend**: Partial Activities API endpoint at line 2625 in `simple-backend.js`
- **Frontend**: Complete `RealActivityFeed.tsx` component expecting real activity data
- **Database**: Multiple activity tables in various schemas (development/production)
- **WebSocket**: Existing infrastructure for real-time broadcasting

### Critical Requirements
- **NO MOCK DATA**: User explicitly requires 100% real functionality
- **Real-time Updates**: WebSocket broadcasting for live activity feed
- **Production Ready**: Complete system activity tracking implementation

## 1. FUNCTIONAL REQUIREMENTS

### FR-1.1: Activities Data Management
**Priority**: HIGH
**Description**: System shall track and store real activities from system operations

**Acceptance Criteria**:
- Activities are captured from actual system events (no simulation)
- Each activity has unique ID, type, description, timestamp, and metadata
- Activities are persisted to database immediately upon occurrence
- Activities include agent operations, post management, database operations, and system health events

### FR-1.2: Activities API Endpoint
**Priority**: HIGH
**Description**: RESTful API endpoint for retrieving activities data

**Acceptance Criteria**:
- GET /api/activities endpoint returns paginated activity list
- Supports query parameters: limit, offset, type filter, agent filter
- Returns structured JSON with activity data and pagination metadata
- Handles database connection failures gracefully

### FR-1.3: Real-time Activity Broadcasting
**Priority**: HIGH
**Description**: WebSocket integration for live activity updates

**Acceptance Criteria**:
- New activities broadcast immediately to connected WebSocket clients
- Activity events use consistent message format
- WebSocket connections handle reconnection gracefully
- Activity updates trigger frontend refresh without page reload

### FR-1.4: Activity Types and Classification
**Priority**: MEDIUM
**Description**: Comprehensive activity type system for proper categorization

**Acceptance Criteria**:
- Agent lifecycle events (created, terminated, spawned)
- Post management events (created, updated, deleted)
- Database operations (migrations, validations)
- System health and performance metrics
- API request/response tracking
- Error and warning events

## 2. NON-FUNCTIONAL REQUIREMENTS

### NFR-2.1: Performance
- Activities API response time: <200ms for 95% of requests
- Real-time broadcast latency: <50ms from event to WebSocket
- Database queries optimized with proper indexing
- Handle 1000+ concurrent WebSocket connections

### NFR-2.2: Reliability
- 99.9% uptime for activity tracking
- No activity loss during system operations
- Graceful degradation if WebSocket fails
- Database transaction integrity for activity logging

### NFR-2.3: Scalability
- Support 10,000+ activities per day
- Efficient pagination for large activity datasets
- Database partitioning for historical data
- Memory-efficient real-time broadcasting

### NFR-2.4: Security
- Activity data sanitization to prevent XSS
- Rate limiting on activities API endpoint
- WebSocket connection authentication
- Audit logging for activity access

## 3. DATABASE SCHEMA SPECIFICATION

### 3.1: Activities Table Structure
```sql
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    agent_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    metadata JSONB DEFAULT '{}',
    source_ip INET,
    user_agent TEXT,
    session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_agent ON activities(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_composite ON activities(type, timestamp DESC, status);

-- Partial index for recent activities
CREATE INDEX IF NOT EXISTS idx_activities_recent
ON activities(timestamp DESC)
WHERE timestamp > NOW() - INTERVAL '30 days';
```

### 3.2: Activity Types Enumeration
```sql
-- Activity type validation
ALTER TABLE activities ADD CONSTRAINT chk_activity_types
CHECK (type IN (
    'agent_created', 'agent_terminated', 'agent_spawned', 'agent_updated',
    'post_created', 'post_updated', 'post_deleted', 'post_published',
    'database_migration', 'database_validation', 'database_backup',
    'system_startup', 'system_shutdown', 'system_health_check',
    'api_request', 'api_response', 'api_error',
    'websocket_connect', 'websocket_disconnect',
    'performance_metric', 'memory_usage', 'cpu_usage',
    'error_occurred', 'warning_issued', 'info_logged'
));

-- Status validation
ALTER TABLE activities ADD CONSTRAINT chk_activity_status
CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled'));
```

## 4. REAL ACTIVITY EVENT SOURCES

### 4.1: Agent Lifecycle Events
**Source**: Agent management system
**Events**:
- Agent creation/spawning from Claude-Flow swarms
- Agent termination and cleanup
- Agent configuration updates
- Agent performance metric updates

**Implementation**:
```javascript
// Activity tracking in agent operations
async function trackAgentActivity(type, agentId, description, metadata = {}) {
    await databaseService.createActivity({
        type,
        description,
        agent_id: agentId,
        metadata: {
            ...metadata,
            source: 'agent_system',
            timestamp: new Date().toISOString()
        }
    });

    // Real-time broadcast
    broadcastActivity({
        type,
        description,
        agent_id: agentId,
        metadata
    });
}
```

### 4.2: Post Management Events
**Source**: Post creation and management system
**Events**:
- New post creation
- Post updates and modifications
- Post deletion
- Comment activities

### 4.3: Database Operations
**Source**: Database service and migrations
**Events**:
- Schema migrations
- Data validations
- Backup operations
- Connection events

### 4.4: System Health and Performance
**Source**: System monitoring and health checks
**Events**:
- System startup/shutdown
- Health check results
- Performance metrics
- Resource usage statistics

### 4.5: API and WebSocket Operations
**Source**: HTTP and WebSocket handlers
**Events**:
- API request processing
- WebSocket connections
- Authentication events
- Error occurrences

## 5. API ENDPOINT SPECIFICATION

### 5.1: GET /api/activities
**Description**: Retrieve paginated list of system activities

**Query Parameters**:
```typescript
interface ActivitiesQuery {
    limit?: number;        // Default: 50, Max: 200
    offset?: number;       // Default: 0
    type?: string;         // Activity type filter
    agent_id?: string;     // Agent filter
    status?: string;       // Status filter
    from?: string;         // ISO timestamp
    to?: string;           // ISO timestamp
}
```

**Response Format**:
```typescript
interface ActivitiesResponse {
    success: boolean;
    data: Activity[];
    timestamp: string;
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    metadata?: {
        filters_applied: object;
        query_time_ms: number;
    };
}

interface Activity {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    agent_id?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}
```

### 5.2: Error Handling
```typescript
interface ErrorResponse {
    success: false;
    error: string;
    message: string;
    timestamp: string;
    code?: number;
    details?: any;
}
```

## 6. WEBSOCKET INTEGRATION SPECIFICATION

### 6.1: Real-time Activity Broadcasting
**WebSocket Event**: `activity_created`
**Payload**:
```typescript
interface ActivityWebSocketMessage {
    type: 'activity_created';
    data: Activity;
    timestamp: string;
    source: 'activities_system';
}
```

### 6.2: WebSocket Connection Management
**Connection Path**: `ws://localhost:PORT/ws`
**Authentication**: Session-based or token-based
**Heartbeat**: 30-second ping/pong

### 6.3: Broadcasting Implementation
```javascript
function broadcastActivity(activity) {
    const message = JSON.stringify({
        type: 'activity_created',
        data: activity,
        timestamp: new Date().toISOString(),
        source: 'activities_system'
    });

    // Broadcast to all connected WebSocket clients
    broadcastToAllWebSockets(message);
}
```

## 7. INTEGRATION POINTS

### 7.1: Database Service Integration
- Extend `DatabaseService.js` with `createActivity()` method
- Implement `getActivities()` with proper pagination
- Add activity filtering and search capabilities

### 7.2: WebSocket Integration
- Leverage existing WebSocket infrastructure in `simple-backend.js`
- Add activity broadcasting to existing broadcast functions
- Ensure connection management handles activity events

### 7.3: Frontend Integration
- `RealActivityFeed.tsx` expects activities via `apiService.getActivities()`
- Real-time updates via `apiService.on('activity_created')`
- Error handling and loading states already implemented

## 8. IMPLEMENTATION PHASES

### Phase 1: Database Schema and Service (IMMEDIATE)
- Create activities table with proper schema
- Implement DatabaseService.createActivity() method
- Add proper indexing for performance

### Phase 2: Activity Tracking Integration (IMMEDIATE)
- Integrate activity tracking into agent operations
- Add activity tracking to post management
- Implement system operation activity tracking

### Phase 3: API Endpoint Implementation (IMMEDIATE)
- Complete /api/activities endpoint implementation
- Add proper pagination and filtering
- Implement error handling and validation

### Phase 4: Real-time Broadcasting (IMMEDIATE)
- Integrate activity broadcasting with WebSocket system
- Test real-time updates in frontend
- Ensure connection stability and error recovery

## 9. TESTING REQUIREMENTS

### 9.1: Integration Tests
- Activity creation from real system operations
- API endpoint response validation
- WebSocket real-time update verification
- Database performance under load

### 9.2: End-to-End Tests
- Complete activity lifecycle from creation to display
- Frontend real-time update functionality
- Error handling and recovery scenarios

## 10. SUCCESS CRITERIA

- [ ] Activities are captured from REAL system operations (no mock data)
- [ ] /api/activities endpoint returns properly formatted data
- [ ] Real-time WebSocket updates work in RealActivityFeed component
- [ ] Database queries perform efficiently with proper indexing
- [ ] System can handle 100+ concurrent users viewing activity feed
- [ ] Activity data persists correctly across system restarts
- [ ] Error handling provides meaningful feedback to users
- [ ] No performance degradation in existing system operations

## 11. CONSTRAINTS AND LIMITATIONS

### Technical Constraints
- Must use existing SQLite/PostgreSQL database system
- Must integrate with existing WebSocket infrastructure
- No additional external dependencies for core functionality
- Must maintain backward compatibility with existing APIs

### Business Constraints
- Zero tolerance for mock or simulated data
- Must be production-ready implementation
- Should not impact existing system performance
- Must provide immediate value to users

## 12. MONITORING AND OBSERVABILITY

### 12.1: Activity Metrics
- Activity creation rate (activities per minute/hour)
- API endpoint response times and error rates
- WebSocket connection count and stability
- Database query performance metrics

### 12.2: Health Monitoring
- Activity table growth rate and storage requirements
- Real-time broadcasting latency measurements
- Frontend update success/failure rates
- System resource usage during high activity periods

---

**This specification ensures 100% real functionality with no mock data, complete WebSocket integration, and production-ready system activity tracking.**