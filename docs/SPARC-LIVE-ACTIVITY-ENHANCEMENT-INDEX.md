# Enhanced Live Activity System - Documentation Index

## 📋 Overview

This documentation suite provides a complete SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) implementation plan for the **Enhanced Live Activity System** - a real-time telemetry capture, processing, and visualization system for Claude Code SDK activity.

**Created**: 2025-10-25
**Version**: 1.0.0
**Status**: Architecture Phase Complete

---

## 📚 Document Suite

### 1. **Specification** (REQUIRED READING)
**File**: [`SPARC-LIVE-ACTIVITY-ENHANCEMENT-SPEC.md`](./SPARC-LIVE-ACTIVITY-ENHANCEMENT-SPEC.md)
**Lines**: 2,052
**Size**: 76KB

**Purpose**: Complete requirements specification and system design.

**Contents**:
- Business requirements and objectives
- Functional specifications
- User stories and acceptance criteria
- System constraints and assumptions
- Success metrics and KPIs

**Read this if**: You need to understand WHAT we're building and WHY.

---

### 2. **Architecture** (THIS DOCUMENT)
**File**: [`SPARC-LIVE-ACTIVITY-ENHANCEMENT-ARCHITECTURE.md`](./SPARC-LIVE-ACTIVITY-ENHANCEMENT-ARCHITECTURE.md)
**Lines**: 2,604
**Size**: 128KB

**Purpose**: Comprehensive system architecture and design.

**Contents**:
1. System Overview (high-level diagrams)
2. Component Architecture (6 layers)
3. Data Models (database schemas, TypeScript interfaces)
4. Data Flow Architecture (capture → persistence → display)
5. Integration Points (existing system modifications)
6. API Design (REST endpoints, SSE streaming)
7. Frontend Architecture (React components, state management)
8. Performance Architecture (optimization strategies)
9. Security Architecture (sanitization, auth, rate limiting)
10. Deployment Architecture (Docker, scaling)

**Read this if**: You need to understand HOW the system is designed and structured.

---

### 3. **Pseudocode** (IMPLEMENTATION GUIDE)
**File**: [`SPARC-LIVE-ACTIVITY-ENHANCEMENT-PSEUDOCODE.md`](./SPARC-LIVE-ACTIVITY-ENHANCEMENT-PSEUDOCODE.md)
**Lines**: 2,832
**Size**: 73KB

**Purpose**: Detailed implementation pseudocode for all components.

**Contents**:
- TelemetryService implementation
- Event capture and processing
- Database operations (migrations, writes, queries)
- API endpoints (SSE streaming, REST APIs)
- Frontend components (React, Zustand store)
- Performance optimizations
- Security implementations
- Testing strategies

**Read this if**: You're ready to start coding and need step-by-step implementation guidance.

---

### 4. **Quick Reference** (CHEAT SHEET)
**File**: [`SPARC-LIVE-ACTIVITY-ENHANCEMENT-QUICK-REF.md`](./SPARC-LIVE-ACTIVITY-ENHANCEMENT-QUICK-REF.md)
**Lines**: 405
**Size**: 11KB

**Purpose**: Quick lookup guide for developers.

**Contents**:
- Architecture component summary
- Database schema reference
- API endpoint quick reference
- Event flow diagram
- Performance targets
- Security features
- File structure
- Implementation phases
- Quick start commands
- Troubleshooting guide

**Read this if**: You need a quick reference while implementing or debugging.

---

## 🎯 Recommended Reading Order

### For Project Managers / Stakeholders
1. **Specification** (Sections 1-3, 9)
   - Understand objectives and success metrics
2. **Quick Reference** (Overview section)
   - Get high-level understanding

### For Architects / Tech Leads
1. **Specification** (Full document)
   - Understand requirements completely
2. **Architecture** (Sections 1-2, 5, 10)
   - System design and integration points
3. **Quick Reference** (All sections)
   - Quick lookup during reviews

### For Backend Developers
1. **Architecture** (Sections 2, 3, 4, 5, 8, 9)
   - Component design, data models, performance
2. **Pseudocode** (Sections 1-4, 8-9)
   - Implementation details for services
3. **Quick Reference** (Database, API, Security sections)
   - Quick lookup during coding

### For Frontend Developers
1. **Architecture** (Sections 7, 8)
   - Frontend architecture and optimization
2. **Pseudocode** (Sections 5-6)
   - React components and state management
3. **Quick Reference** (Event flow, API endpoints)
   - Quick lookup during coding

### For DevOps Engineers
1. **Architecture** (Section 10)
   - Deployment and monitoring
2. **Pseudocode** (Section 7)
   - Migration scripts and database setup
3. **Quick Reference** (Monitoring, Troubleshooting)
   - Operations guide

### For QA Engineers
1. **Specification** (Sections 4-7)
   - Functional requirements and test scenarios
2. **Pseudocode** (Section 10)
   - Testing strategies and E2E tests
3. **Quick Reference** (Quick start commands)
   - Testing setup

---

## 🏗️ System Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│              ENHANCED LIVE ACTIVITY SYSTEM                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. EVENT CAPTURE LAYER                                     │
│     - ClaudeCodeSDKManager integration                      │
│     - Real-time tool execution detection                    │
│     - Event validation & sanitization                       │
│                                                              │
│  2. EVENT PROCESSING LAYER                                  │
│     - TelemetryService (event enrichment)                   │
│     - EventEnricher (add context)                           │
│     - MetricsAggregator (running stats)                     │
│     - Event batching (50 events or 500ms)                   │
│                                                              │
│  3. BROADCASTING LAYER (SSE)                                │
│     - Server-Sent Events streaming                          │
│     - Client filtering (priority, tools, session)           │
│     - Connection pooling (max 1000)                         │
│     - <50ms latency target                                  │
│                                                              │
│  4. PERSISTENCE LAYER                                       │
│     - SQLite database (WAL mode)                            │
│     - 4 tables: events, agents, tools, sessions            │
│     - Batch writes (<10ms latency)                          │
│     - Optimized indexes                                     │
│                                                              │
│  5. API LAYER                                               │
│     - REST endpoints (events, sessions, metrics)            │
│     - SSE streaming endpoint                                │
│     - API key authentication                                │
│     - Rate limiting (100 req/15min)                         │
│                                                              │
│  6. FRONTEND LAYER                                          │
│     - React components (LiveActivityFeed, etc.)             │
│     - Zustand state management                              │
│     - Virtual scrolling (performance)                       │
│     - Real-time updates via SSE                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Key Metrics & Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Events per Hour** | 10,000+ | TBD | 🔴 Not Implemented |
| **Concurrent Sessions** | 100+ | TBD | 🔴 Not Implemented |
| **SSE Broadcast Latency** | <50ms | TBD | 🔴 Not Implemented |
| **DB Write Latency** | <10ms | TBD | 🔴 Not Implemented |
| **Query Response Time** | <100ms | TBD | 🔴 Not Implemented |
| **Frontend FPS** | 30 | TBD | 🔴 Not Implemented |

---

## 🗂️ File Structure

### Database (New)
```
/workspaces/agent-feed/api-server/db/migrations/
└── 009-telemetry-tables.sql                (2,604 lines in Architecture doc)
```

### Backend Services (New)
```
/workspaces/agent-feed/src/services/
├── TelemetryService.js                     (Core service)
├── EventEnricher.js                        (Context enrichment)
├── MetricsAggregator.js                    (Running statistics)
└── TelemetryWriter.js                      (Batch database writes)
```

### Backend Services (Modified)
```
/workspaces/agent-feed/src/services/
└── ClaudeCodeSDKManager.js                 (Add telemetry capture)

/workspaces/agent-feed/api-server/
└── server.js                               (Add SSE endpoint)

/workspaces/agent-feed/src/api/routes/
└── claude-code-sdk.js                      (Enhance broadcasting)
```

### Frontend Components (New)
```
/workspaces/agent-feed/frontend/src/
├── components/
│   ├── LiveActivityFeed.jsx
│   ├── ActivityEventItem.jsx
│   ├── SessionMetricsPanel.jsx
│   ├── ToolUsageChart.jsx
│   └── VirtualScroll.jsx
├── hooks/
│   └── useActivityStream.js
└── stores/
    └── activityStore.js
```

---

## 🚀 Implementation Phases

### ✅ Phase 0: Architecture (COMPLETE)
- [x] Specification document
- [x] Architecture document
- [x] Pseudocode document
- [x] Quick reference guide

### 🔵 Phase 1: Foundation (Week 1)
- [ ] Create database migration (009-telemetry-tables.sql)
- [ ] Implement TelemetryService.js
- [ ] Implement TelemetryWriter.js
- [ ] Add telemetry capture to ClaudeCodeSDKManager
- [ ] Write unit tests for services

### 🔵 Phase 2: API Layer (Week 2)
- [ ] Add SSE endpoint (/api/activity/stream)
- [ ] Implement activity events endpoint
- [ ] Implement session details endpoint
- [ ] Implement metrics endpoint
- [ ] Write API integration tests

### 🔵 Phase 3: Frontend (Week 3)
- [ ] Create activityStore (Zustand)
- [ ] Implement useActivityStream hook
- [ ] Build LiveActivityFeed component
- [ ] Build SessionMetricsPanel component
- [ ] Write frontend component tests

### 🔵 Phase 4: Optimization (Week 4)
- [ ] Add virtual scrolling
- [ ] Optimize database indexes
- [ ] Implement event batching
- [ ] Add connection pooling
- [ ] Performance testing

### 🔵 Phase 5: Security & Production (Week 5)
- [ ] Add data sanitization
- [ ] Implement rate limiting
- [ ] Add API key authentication
- [ ] Write E2E tests
- [ ] Production deployment

---

## 🔗 Integration Points

### Existing Systems
1. **ClaudeCodeSDKManager** (`/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js`)
   - Add telemetry capture in `queryClaudeCode()` message loop
   - Minimal changes, high impact

2. **Server SSE System** (`/workspaces/agent-feed/api-server/server.js`)
   - Enhance existing `broadcastToSSE()` function
   - Add new `/api/activity/stream` endpoint
   - Leverage existing SSE infrastructure

3. **Database System** (`/workspaces/agent-feed/api-server/database.js`)
   - Add new migration (009)
   - Use existing DatabaseManager
   - Maintain 3-tier protection model

4. **Frontend SSE Hook** (`/workspaces/agent-feed/frontend/src/hooks/useHTTPSSE.jsx`)
   - Reuse existing SSE connection logic
   - Add new `useActivityStream()` wrapper

---

## 📈 Success Criteria

### Technical Success
- ✅ All 4 database tables created and indexed
- ✅ Event capture rate: 10,000+ events/hour
- ✅ SSE broadcast latency: <50ms
- ✅ Database write latency: <10ms
- ✅ Frontend FPS: 30+ (with 100+ events)
- ✅ 0 data loss during high load

### Functional Success
- ✅ Real-time event streaming to frontend
- ✅ Historical event query (pagination)
- ✅ Session detail view with metrics
- ✅ Tool usage analytics
- ✅ Agent execution tracking

### Security Success
- ✅ All prompts sanitized (200 char max)
- ✅ All file paths sanitized
- ✅ API keys redacted from events
- ✅ Rate limiting enforced
- ✅ API key authentication working

### User Experience Success
- ✅ Activity feed updates in real-time
- ✅ No UI lag with 100+ events
- ✅ Session history accessible
- ✅ Metrics visualizations clear
- ✅ Error states handled gracefully

---

## 🛠️ Development Tools

### Database
```bash
# Run migration
node api-server/scripts/run-migration-009.js

# Query events
sqlite3 data/agent-feed.db "SELECT * FROM activity_events LIMIT 10;"

# Check schema
sqlite3 data/agent-feed.db ".schema activity_events"
```

### API Testing
```bash
# Test SSE stream
curl -N http://localhost:3001/api/activity/stream

# Query events
curl http://localhost:3001/api/activity/events?limit=10

# Get session details
curl http://localhost:3001/api/activity/sessions/session_xyz

# Health check
curl http://localhost:3001/api/activity/health
```

### Frontend
```javascript
// Test activity stream in browser console
const eventSource = new EventSource('http://localhost:3001/api/activity/stream?priority=high');
eventSource.onmessage = (e) => console.log('Event:', JSON.parse(e.data));
```

---

## 🐛 Troubleshooting

### Common Issues

**SSE Not Connecting**
- Check CORS configuration in `server.js`
- Verify endpoint is running: `curl http://localhost:3001/api/activity/stream`
- Check browser network tab for errors

**Events Not Persisting**
- Verify migration ran: `sqlite3 data/agent-feed.db ".tables"`
- Check TelemetryWriter queue size
- Review server logs for database errors

**High Latency**
- Monitor event queue size: `GET /api/activity/health`
- Check database performance: `PRAGMA optimize;`
- Review batch size configuration

**Memory Issues**
- Limit event history (max 100 in store)
- Enable virtual scrolling in `<LiveActivityFeed />`
- Clear old sessions: `DELETE FROM session_metrics WHERE end_time < datetime('now', '-7 days');`

---

## 📞 Support & Resources

### Documentation
- **Full Specification**: `SPARC-LIVE-ACTIVITY-ENHANCEMENT-SPEC.md`
- **Architecture Details**: `SPARC-LIVE-ACTIVITY-ENHANCEMENT-ARCHITECTURE.md`
- **Implementation Guide**: `SPARC-LIVE-ACTIVITY-ENHANCEMENT-PSEUDOCODE.md`
- **Quick Reference**: `SPARC-LIVE-ACTIVITY-ENHANCEMENT-QUICK-REF.md`

### Related Systems
- **Existing SSE Implementation**: `/workspaces/agent-feed/frontend/src/hooks/useHTTPSSE.jsx`
- **Database Manager**: `/workspaces/agent-feed/api-server/database.js`
- **ClaudeCodeSDKManager**: `/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js`
- **Token Analytics**: `/workspaces/agent-feed/src/services/TokenAnalyticsWriter.js`

### External References
- **Server-Sent Events**: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- **SQLite WAL Mode**: https://www.sqlite.org/wal.html
- **React Window**: https://react-window.vercel.app/
- **Zustand**: https://zustand-demo.pmnd.rs/

---

## 📝 Change Log

### Version 1.0.0 (2025-10-25)
- ✅ Initial architecture documentation complete
- ✅ Specification document created
- ✅ Pseudocode implementation guide created
- ✅ Quick reference guide created
- ⏳ Implementation pending

---

## 🎯 Next Steps

1. **Review & Approve**
   - [ ] Architecture review by tech lead
   - [ ] Security review by security team
   - [ ] Performance targets validated
   - [ ] Stakeholder approval

2. **Begin Implementation**
   - [ ] Create feature branch: `feature/live-activity-enhancement`
   - [ ] Run database migration (009)
   - [ ] Implement TelemetryService
   - [ ] Write unit tests

3. **Iterative Development**
   - [ ] Phase 1: Foundation (Week 1)
   - [ ] Phase 2: API Layer (Week 2)
   - [ ] Phase 3: Frontend (Week 3)
   - [ ] Phase 4: Optimization (Week 4)
   - [ ] Phase 5: Production (Week 5)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-25
**Status**: Architecture Complete, Ready for Implementation
**Maintainer**: Development Team
