# Post/Comment Ticket Status Indicator - Implementation Plan

**Date**: October 23, 2025
**Objective**: Add visual indicators to posts/comments showing ticket processing status
**Status**: Plan - Awaiting User Approval

---

## 🎯 OBJECTIVES

Add clear visual indicators on each post and comment that show:
1. **Has pending tickets** - URL detected, waiting for processing
2. **Being processed** - Agent currently working on it
3. **Processed** - Agent completed and commented
4. **Failed** - Processing failed
5. **No tickets** - Regular post, no agent processing needed

---

## 🎨 VISUAL DESIGN

### Status Badge Design
Each post/comment will display a small badge/indicator:

```
┌─────────────────────────────────────────────────────┐
│ 🔗 Check this: https://linkedin.com/...            │
│ by user-agent • 2 min ago                          │
│                                                     │
│ [🟡 Waiting for link-logger]  ← INDICATOR         │
│                                                     │
│ Content of the post goes here...                   │
└─────────────────────────────────────────────────────┘
```

### Status Types & Colors

| Status | Icon | Color | Text | Meaning |
|--------|------|-------|------|---------|
| **Pending** | 🟡 | Yellow/Amber | "Waiting for link-logger" | Ticket created, not started |
| **Processing** | 🔄 | Blue | "link-logger analyzing..." | Worker currently processing |
| **Completed** | ✅ | Green | "Analyzed by link-logger" | Agent finished, comment posted |
| **Failed** | ❌ | Red | "Analysis failed" | Processing error |
| **No Tickets** | - | - | - | No indicator shown |

---

## 📊 DATA MODEL

### Add Ticket Count to Posts

**Option 1: Real-time Query** (Simpler, no schema change)
```sql
SELECT
  p.*,
  COUNT(wqt.id) as pending_tickets,
  SUM(CASE WHEN wqt.status = 'in_progress' THEN 1 ELSE 0 END) as processing_tickets,
  SUM(CASE WHEN wqt.status = 'completed' THEN 1 ELSE 0 END) as completed_tickets,
  SUM(CASE WHEN wqt.status = 'failed' THEN 1 ELSE 0 END) as failed_tickets
FROM agent_posts p
LEFT JOIN work_queue_tickets wqt ON wqt.post_id = p.id
GROUP BY p.id
```

**Option 2: Cached Fields** (Faster, requires schema change)
```sql
ALTER TABLE agent_posts ADD COLUMN ticket_status TEXT DEFAULT 'none';
-- Values: 'none', 'pending', 'processing', 'completed', 'failed'

ALTER TABLE agent_posts ADD COLUMN active_agents TEXT DEFAULT '[]';
-- JSON array: ["link-logger-agent", "follow-up-agent"]
```

**Recommendation**: Start with Option 1 (real-time query) for accuracy, optimize later if needed.

---

## 🏗️ ARCHITECTURE

### Backend Changes

#### 1. New API Endpoint: GET /api/agent-posts/:postId/tickets
```javascript
// Returns ticket status for a specific post
GET /api/agent-posts/:postId/tickets

Response:
{
  "post_id": "post-123",
  "tickets": [
    {
      "id": "ticket-456",
      "agent_id": "link-logger-agent",
      "status": "in_progress",
      "priority": "P2",
      "created_at": "2025-10-23T23:16:17Z",
      "updated_at": "2025-10-23T23:16:20Z"
    }
  ],
  "summary": {
    "total": 1,
    "pending": 0,
    "processing": 1,
    "completed": 0,
    "failed": 0
  }
}
```

#### 2. Enhanced GET /api/v1/agent-posts Endpoint
```javascript
// Add ticket info to each post
GET /api/v1/agent-posts

Response:
{
  "success": true,
  "data": [
    {
      "id": "post-123",
      "title": "Check this link",
      "content": "https://linkedin.com/...",
      "author": "user",
      // NEW: Ticket status
      "ticketStatus": {
        "total": 1,
        "pending": 0,
        "processing": 1,
        "completed": 0,
        "failed": 0,
        "agents": ["link-logger-agent"]
      }
    }
  ]
}
```

#### 3. WebSocket Event: Ticket Status Update
```javascript
// Real-time updates when ticket status changes
socket.emit('ticket:status:update', {
  post_id: 'post-123',
  ticket_id: 'ticket-456',
  status: 'completed',
  agent_id: 'link-logger-agent'
});
```

### Frontend Changes

#### 1. New Component: `TicketStatusBadge.jsx`
```jsx
<TicketStatusBadge
  status="processing"
  agents={["link-logger-agent"]}
  count={1}
/>

// Renders:
// 🔄 link-logger analyzing... (1 active)
```

#### 2. Update `PostCard` Component
```jsx
<PostCard post={post}>
  {/* Existing post content */}

  {/* NEW: Ticket status indicator */}
  {post.ticketStatus?.total > 0 && (
    <TicketStatusBadge
      status={getOverallStatus(post.ticketStatus)}
      agents={post.ticketStatus.agents}
      count={post.ticketStatus.total}
    />
  )}
</PostCard>
```

#### 3. Real-time Updates via WebSocket
```javascript
// Listen for ticket status changes
socket.on('ticket:status:update', (data) => {
  // Update post in state
  updatePostTicketStatus(data.post_id, data);

  // Show toast notification
  toast.success(`${data.agent_id} finished analyzing!`);
});
```

---

## 📝 IMPLEMENTATION STEPS

### Phase 1: Backend API (30 min)

**Step 1.1: Create Ticket Status Query Helper**
```javascript
// File: /api-server/services/ticket-status-service.js

export async function getPostTicketStatus(postId, db) {
  const tickets = db.prepare(`
    SELECT id, agent_id, status, priority, created_at, updated_at
    FROM work_queue_tickets
    WHERE post_id = ?
    ORDER BY created_at DESC
  `).all(postId);

  return {
    post_id: postId,
    tickets: tickets,
    summary: {
      total: tickets.length,
      pending: tickets.filter(t => t.status === 'pending').length,
      processing: tickets.filter(t => t.status === 'in_progress').length,
      completed: tickets.filter(t => t.status === 'completed').length,
      failed: tickets.filter(t => t.status === 'failed').length
    }
  };
}
```

**Step 1.2: Add New API Endpoint**
```javascript
// File: /api-server/server.js

app.get('/api/agent-posts/:postId/tickets', async (req, res) => {
  try {
    const { postId } = req.params;
    const status = await getPostTicketStatus(postId, db);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Step 1.3: Enhance GET /api/v1/agent-posts**
```javascript
// Add ticket status to each post
const posts = db.prepare('SELECT * FROM agent_posts ORDER BY created_at DESC').all();

const postsWithTickets = posts.map(post => {
  const ticketStatus = getPostTicketStatus(post.id, db);
  return {
    ...post,
    ticketStatus: ticketStatus.summary.total > 0 ? ticketStatus.summary : null
  };
});

res.json({ success: true, data: postsWithTickets });
```

**Step 1.4: Add WebSocket Event**
```javascript
// File: /api-server/worker/agent-worker.js

async execute() {
  try {
    // ... existing code ...

    // After ticket completes, emit event
    io.emit('ticket:status:update', {
      post_id: ticket.post_id,
      ticket_id: ticket.id,
      status: 'completed',
      agent_id: ticket.agent_id
    });

  } catch (error) {
    // On failure, emit error event
    io.emit('ticket:status:update', {
      post_id: ticket.post_id,
      ticket_id: ticket.id,
      status: 'failed',
      agent_id: ticket.agent_id
    });
  }
}
```

### Phase 2: Frontend Components (45 min)

**Step 2.1: Create TicketStatusBadge Component**
```jsx
// File: /frontend/src/components/TicketStatusBadge.jsx

import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-amber-500 bg-amber-50 border-amber-200',
    text: 'Waiting for'
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-500 bg-blue-50 border-blue-200',
    text: 'analyzing...',
    animate: 'animate-spin'
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-500 bg-green-50 border-green-200',
    text: 'Analyzed by'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-500 bg-red-50 border-red-200',
    text: 'Analysis failed'
  }
};

export function TicketStatusBadge({ status, agents, count }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${config.color}`}>
      <Icon className={`w-4 h-4 ${config.animate || ''}`} />
      <span>
        {config.text} <strong>{agents[0]}</strong>
        {count > 1 && <span className="text-xs ml-1">+{count - 1} more</span>}
      </span>
    </div>
  );
}
```

**Step 2.2: Update PostCard Component**
```jsx
// File: /frontend/src/components/PostCard.jsx

import { TicketStatusBadge } from './TicketStatusBadge';

function getOverallStatus(ticketStatus) {
  if (ticketStatus.failed > 0) return 'failed';
  if (ticketStatus.processing > 0) return 'processing';
  if (ticketStatus.pending > 0) return 'pending';
  if (ticketStatus.completed > 0) return 'completed';
  return null;
}

export function PostCard({ post }) {
  const overallStatus = post.ticketStatus ? getOverallStatus(post.ticketStatus) : null;

  return (
    <div className="post-card">
      <div className="post-header">
        <span className="author">{post.author}</span>
        <span className="timestamp">{formatTime(post.created_at)}</span>
      </div>

      {/* NEW: Ticket Status Badge */}
      {overallStatus && (
        <div className="ticket-status-container mt-2">
          <TicketStatusBadge
            status={overallStatus}
            agents={post.ticketStatus.agents || []}
            count={post.ticketStatus.total}
          />
        </div>
      )}

      <div className="post-content">
        {post.content}
      </div>
    </div>
  );
}
```

**Step 2.3: Add WebSocket Listener**
```jsx
// File: /frontend/src/hooks/useTicketUpdates.js

import { useEffect } from 'react';
import { socket } from '../services/socket';
import { useQueryClient } from '@tanstack/react-query';

export function useTicketUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    socket.on('ticket:status:update', (data) => {
      // Invalidate posts query to refetch with new status
      queryClient.invalidateQueries(['posts']);

      // Show notification
      if (data.status === 'completed') {
        toast.success(`${data.agent_id} finished analyzing!`);
      } else if (data.status === 'failed') {
        toast.error(`${data.agent_id} analysis failed`);
      }
    });

    return () => {
      socket.off('ticket:status:update');
    };
  }, [queryClient]);
}
```

**Step 2.4: Use Hook in Main Component**
```jsx
// File: /frontend/src/pages/AgentFeed.jsx

import { useTicketUpdates } from '../hooks/useTicketUpdates';

export function AgentFeed() {
  useTicketUpdates(); // Enable real-time ticket updates

  return (
    <div className="agent-feed">
      {/* Existing feed code */}
    </div>
  );
}
```

### Phase 3: Testing (30 min)

**Test 1: Manual UI Test**
1. Create post with LinkedIn URL
2. Verify "🟡 Waiting for link-logger" appears
3. Start orchestrator
4. Verify changes to "🔄 link-logger analyzing..."
5. Wait for completion
6. Verify changes to "✅ Analyzed by link-logger"

**Test 2: API Test**
```bash
# Get ticket status for a post
curl http://localhost:3001/api/agent-posts/post-123/tickets

# Verify response structure
```

**Test 3: WebSocket Test**
```javascript
// In browser console
socket.on('ticket:status:update', console.log);
// Create post with URL
// Watch for status updates
```

**Test 4: Multiple Agents**
1. Create post that triggers multiple agents
2. Verify badge shows "link-logger +2 more"
3. Click to see all agent statuses

---

## 🎨 ENHANCED FEATURES (Optional)

### Feature 1: Clickable Badge with Tooltip
```jsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>
      <TicketStatusBadge {...props} />
    </TooltipTrigger>
    <TooltipContent>
      <div className="space-y-1">
        <p><strong>Ticket Status Details</strong></p>
        <p>🟡 Pending: 0</p>
        <p>🔄 Processing: 1 (link-logger-agent)</p>
        <p>✅ Completed: 0</p>
        <p>❌ Failed: 0</p>
      </div>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Feature 2: Progress Bar
```jsx
{status === 'processing' && (
  <div className="progress-container">
    <div className="progress-bar animate-pulse">
      <div className="progress-fill" style={{ width: '60%' }} />
    </div>
    <span className="text-xs">Analyzing...</span>
  </div>
)}
```

### Feature 3: Expandable Ticket List
```jsx
<Collapsible>
  <CollapsibleTrigger>
    <TicketStatusBadge {...props} />
  </CollapsibleTrigger>
  <CollapsibleContent>
    <div className="ticket-list">
      {tickets.map(ticket => (
        <TicketItem key={ticket.id} ticket={ticket} />
      ))}
    </div>
  </CollapsibleContent>
</Collapsible>
```

---

## 📊 PERFORMANCE CONSIDERATIONS

### Database Query Optimization
```sql
-- Add index for fast post_id lookups
CREATE INDEX IF NOT EXISTS idx_work_queue_post_id_status
ON work_queue_tickets(post_id, status);

-- Query will use this index for O(log n) lookups
```

### Caching Strategy
```javascript
// Cache ticket status for 5 seconds
const cache = new Map();

function getPostTicketStatusCached(postId) {
  const cacheKey = `ticket_status_${postId}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 5000) {
    return cached.data;
  }

  const data = getPostTicketStatus(postId, db);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

### Real-time Updates Only
```javascript
// Instead of polling, rely on WebSocket events
// Only fetch on initial load, then update via events
```

---

## 🚀 DEPLOYMENT PLAN

### Step 1: Database (if using Option 2)
```bash
# Apply migration
sqlite3 database.db < migrations/007-add-ticket-status-fields.sql
```

### Step 2: Backend
```bash
# Deploy ticket-status-service.js
# Deploy updated server.js with new endpoints
# Deploy updated agent-worker.js with WebSocket events
```

### Step 3: Frontend
```bash
# Deploy TicketStatusBadge component
# Deploy updated PostCard component
# Deploy useTicketUpdates hook
```

### Step 4: Verification
```bash
# Restart server
# Test with real post
# Verify indicators appear
# Verify real-time updates work
```

---

## 📋 FILES TO CREATE/MODIFY

### Backend (4 files)
1. `/api-server/services/ticket-status-service.js` (NEW)
2. `/api-server/server.js` (MODIFY - add endpoint)
3. `/api-server/worker/agent-worker.js` (MODIFY - add WebSocket emit)
4. `/api-server/db/migrations/007-ticket-status-index.sql` (NEW - optional)

### Frontend (5 files)
1. `/frontend/src/components/TicketStatusBadge.jsx` (NEW)
2. `/frontend/src/components/PostCard.jsx` (MODIFY)
3. `/frontend/src/hooks/useTicketUpdates.js` (NEW)
4. `/frontend/src/pages/AgentFeed.jsx` (MODIFY)
5. `/frontend/src/services/socket.js` (VERIFY exists)

### Documentation (1 file)
1. `/docs/POST-TICKET-STATUS-INDICATOR-PLAN.md` (THIS FILE)

---

## ⏱️ TIME ESTIMATES

| Phase | Task | Time |
|-------|------|------|
| **Phase 1** | Backend API | 30 min |
| **Phase 2** | Frontend Components | 45 min |
| **Phase 3** | Testing | 30 min |
| **Total** | **End-to-End** | **~2 hours** |

---

## ✅ SUCCESS CRITERIA

- [ ] Pending tickets show yellow "Waiting for..." badge
- [ ] Processing tickets show blue "analyzing..." badge with spinner
- [ ] Completed tickets show green "Analyzed by..." badge
- [ ] Failed tickets show red "Analysis failed" badge
- [ ] Posts without tickets show no badge
- [ ] Real-time updates work (badge changes without refresh)
- [ ] Multiple agents shown correctly ("+2 more" text)
- [ ] No performance degradation (fast queries with index)
- [ ] Mobile responsive design
- [ ] Accessible (screen reader compatible)

---

## 🎯 USER EXPERIENCE

### Before Implementation
```
┌─────────────────────────────────┐
│ Check this link!                │
│ https://linkedin.com/...        │
│                                 │
│ by user • 2 min ago             │
└─────────────────────────────────┘

❓ User doesn't know if agent is processing
❓ User doesn't know if it failed
❓ User has to wait and wonder
```

### After Implementation
```
┌─────────────────────────────────┐
│ Check this link!                │
│ https://linkedin.com/...        │
│                                 │
│ 🔄 link-logger analyzing...     │ ← CLEAR STATUS
│                                 │
│ by user • 2 min ago             │
└─────────────────────────────────┘

✅ User knows agent is working
✅ User gets real-time updates
✅ User sees when it completes
```

---

## 🔧 FUTURE ENHANCEMENTS

1. **Estimated Time Remaining**
   - "🔄 link-logger analyzing... (30s remaining)"

2. **Click for Details**
   - Click badge to see full ticket info
   - Show error messages if failed

3. **Agent Avatar**
   - Show agent icon next to status
   - Multiple agent avatars for multiple tickets

4. **Progress Percentage**
   - "🔄 link-logger analyzing... 65%"

5. **Retry Button**
   - For failed tickets: "❌ Analysis failed [Retry]"

---

## 📊 CONCLUSION

This plan provides clear visibility into agent processing status with:
- ✅ Real-time visual indicators
- ✅ Minimal performance impact
- ✅ Clean user experience
- ✅ Extensible architecture

**Estimated Implementation Time**: 2 hours
**Estimated Testing Time**: 30 minutes
**Total Time**: 2.5 hours

---

**Status**: ⏸️ **PLAN READY - AWAITING USER APPROVAL**

Ready to implement once approved!
