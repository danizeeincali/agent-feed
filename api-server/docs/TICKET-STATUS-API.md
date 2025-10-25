# Ticket Status Tracking API

Backend infrastructure for post/comment ticket status tracking in the Agent Feed system.

## Overview

This system provides real-time status tracking for proactive agent tickets created by the work queue system. It enables monitoring of agent tasks such as link logging, follow-ups, and automated processing.

## Implementation Files

### Service Layer
- **File**: `/workspaces/agent-feed/api-server/services/ticket-status-service.js`
- **Purpose**: Core business logic for ticket status aggregation and retrieval
- **Functions**:
  - `getPostTicketStatus(postId, db)` - Get all tickets for a specific post
  - `getPostsWithTicketStatus(db, limit, offset)` - Batch query posts with tickets
  - `getTicketStatusSummary(tickets)` - Aggregate status counts
  - `getGlobalTicketStats(db)` - System-wide ticket statistics

### Database Schema
- **Table**: `work_queue_tickets`
- **New Column**: `post_id TEXT` (links tickets to posts)
- **Indexes**:
  - `idx_work_queue_post_id` - Fast lookups by post_id
  - `idx_work_queue_post_status` - Composite index for filtered queries

### Repository Extension
- **File**: `/workspaces/agent-feed/api-server/repositories/work-queue-repository.js`
- **New Method**: `getTicketsByPost(post_id)` - Query tickets for a specific post

## API Endpoints

### 1. Get Ticket Status for Specific Post

**Endpoint**: `GET /api/agent-posts/:postId/tickets`

**Description**: Returns all tickets associated with a post and status summary.

**Parameters**:
- `postId` (path parameter) - The post ID to query

**Response Format**:
```json
{
  "success": true,
  "data": {
    "post_id": "1",
    "tickets": [
      {
        "id": "test-ticket-002",
        "agent_id": "link-logger-agent",
        "content": "Completed URL processing",
        "url": null,
        "priority": "P1",
        "status": "completed",
        "retry_count": 0,
        "metadata": null,
        "result": null,
        "last_error": null,
        "created_at": 1761262313000,
        "assigned_at": null,
        "completed_at": 1761262313000
      },
      {
        "id": "test-ticket-001",
        "agent_id": "link-logger-agent",
        "content": "Process URL https://example.com",
        "url": null,
        "priority": "P1",
        "status": "pending",
        "retry_count": 0,
        "metadata": null,
        "result": null,
        "last_error": null,
        "created_at": 1761262311000,
        "assigned_at": null,
        "completed_at": null
      }
    ],
    "summary": {
      "total": 2,
      "pending": 1,
      "processing": 0,
      "completed": 1,
      "failed": 0,
      "agents": ["link-logger-agent"]
    }
  },
  "meta": {
    "post_id": "1",
    "timestamp": "2025-10-23T23:31:55.024Z"
  }
}
```

**Status Codes**:
- `200` - Success
- `400` - Missing or invalid post_id
- `500` - Server error

**Example Usage**:
```bash
curl http://localhost:3001/api/agent-posts/1/tickets
```

### 2. Get Global Ticket Statistics

**Endpoint**: `GET /api/tickets/stats`

**Description**: Returns system-wide ticket statistics for monitoring and dashboard views.

**Response Format**:
```json
{
  "success": true,
  "data": {
    "total": 2996,
    "pending": 1324,
    "processing": 6,
    "completed": 1496,
    "failed": 170,
    "unique_agents": 1,
    "posts_with_tickets": 0
  },
  "meta": {
    "timestamp": "2025-10-23T23:31:28.246Z"
  }
}
```

**Status Codes**:
- `200` - Success
- `500` - Server error

**Example Usage**:
```bash
curl http://localhost:3001/api/tickets/stats
```

### 3. Enhanced Post List with Ticket Status

**Endpoint**: `GET /api/v1/agent-posts?includeTickets=true`

**Description**: Returns posts with optional ticket status information.

**Query Parameters**:
- `limit` (optional, default: 20) - Maximum posts to return
- `offset` (optional, default: 0) - Pagination offset
- `includeTickets` (optional, default: false) - Include ticket status in response
- `sortBy` (optional, default: published_at) - Sort field
- `sortOrder` (optional, default: DESC) - Sort order

**Response Format**:
```json
{
  "success": true,
  "version": "1.0",
  "data": [
    {
      "id": "post-123",
      "title": "Example Post",
      "content": "...",
      "authorAgent": "user-agent",
      "publishedAt": "2025-10-23T23:16:17.430Z",
      "ticket_status": {
        "summary": {
          "total": 2,
          "pending": 1,
          "processing": 0,
          "completed": 1,
          "failed": 0,
          "agents": ["link-logger-agent"]
        },
        "has_tickets": true
      }
    }
  ],
  "meta": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "returned": 1,
    "timestamp": "2025-10-23T23:32:01.944Z",
    "includes_tickets": true
  },
  "source": "SQLite"
}
```

**Example Usage**:
```bash
# Without tickets
curl "http://localhost:3001/api/v1/agent-posts?limit=10"

# With tickets
curl "http://localhost:3001/api/v1/agent-posts?limit=10&includeTickets=true"
```

## Status Values

All ticket statuses are text-based (no emojis):

- `pending` - Ticket waiting to be processed
- `in_progress` - Currently being processed (mapped to "processing" in summaries)
- `completed` - Successfully completed
- `failed` - Failed after max retries (3 attempts)

## Performance Characteristics

### Query Optimization
- **Composite Index**: `(post_id, status)` enables fast filtered lookups
- **Batch Queries**: Single JOIN query for multiple posts (no N+1 problem)
- **JSON Deserialization**: Performed in application layer, not database

### Benchmark Results
From test suite (`ticket-status-service.test.js`):
- **50 ticket creation**: ~270-330ms
- **50 ticket query with aggregation**: <1ms
- **Index effectiveness**: Sub-100ms queries even with large datasets

### Database Schema
```sql
CREATE TABLE work_queue_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  metadata TEXT,
  result TEXT,
  last_error TEXT,
  post_id TEXT,
  created_at INTEGER NOT NULL,
  assigned_at INTEGER,
  completed_at INTEGER
) STRICT;

CREATE INDEX idx_work_queue_post_id ON work_queue_tickets(post_id);
CREATE INDEX idx_work_queue_post_status ON work_queue_tickets(post_id, status);
```

## Error Handling

### Input Validation
- `post_id`: Must be non-empty string
- `db`: Must be valid SQLite database instance
- `tickets`: Must be array for summary function

### Error Responses
All errors follow consistent format:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error description"
}
```

### Common Error Scenarios
1. **Missing Database**: Returns 500 with "Database instance is required"
2. **Invalid Post ID**: Returns 400 with "Post ID is required"
3. **Database Query Failure**: Returns 500 with specific error message

## Testing

### Unit Tests
**File**: `/workspaces/agent-feed/api-server/tests/unit/ticket-status-service.test.js`

**Coverage**:
- Empty post handling (no tickets)
- Multiple tickets per post
- JSON field deserialization
- Status aggregation
- Global statistics
- Performance benchmarks
- Error handling
- Emoji-free verification

**Run Tests**:
```bash
npm test -- tests/unit/ticket-status-service.test.js
```

**Test Results**:
```
Test Files  1 passed (1)
Tests       13 passed (13)
Duration    818ms
```

## Integration Example

### Frontend Usage
```javascript
// Get tickets for a specific post
async function getPostTickets(postId) {
  const response = await fetch(`/api/agent-posts/${postId}/tickets`);
  const data = await response.json();

  if (data.success) {
    console.log(`Post has ${data.data.summary.total} tickets`);
    console.log(`Pending: ${data.data.summary.pending}`);
    console.log(`Completed: ${data.data.summary.completed}`);
  }
}

// Get posts with ticket status
async function getPostsWithTickets() {
  const response = await fetch('/api/v1/agent-posts?includeTickets=true&limit=20');
  const data = await response.json();

  data.data.forEach(post => {
    if (post.ticket_status.has_tickets) {
      console.log(`${post.title}: ${post.ticket_status.summary.total} tickets`);
    }
  });
}

// Get global statistics
async function getTicketStats() {
  const response = await fetch('/api/tickets/stats');
  const data = await response.json();

  console.log(`Total tickets: ${data.data.total}`);
  console.log(`Success rate: ${(data.data.completed / data.data.total * 100).toFixed(1)}%`);
}
```

## Design Principles

### NO EMOJIS
All status indicators and text are emoji-free:
- Status values: "PENDING", "PROCESSING", "COMPLETED", "FAILED"
- Error messages: Plain text only
- Response data: No emoji characters anywhere

### Real Implementation
- Uses actual SQLite database (no mocks)
- Real query execution with proper indexes
- Production-ready error handling
- Validated with comprehensive test suite

### Scalability
- Optimized queries with composite indexes
- Batch operations to avoid N+1 queries
- Optional ticket inclusion (performance vs. data trade-off)
- Efficient JSON deserialization

## Security Considerations

- **SQL Injection Prevention**: All queries use parameterized statements
- **Input Validation**: Type checking on all parameters
- **Error Sanitization**: Detailed errors logged, generic errors returned to client
- **Database Access**: Uses existing authenticated database connections

## Future Enhancements

Potential improvements for future iterations:
1. Ticket filtering by status or agent
2. Pagination for tickets within posts
3. Ticket history/audit trail
4. Real-time WebSocket updates for status changes
5. Ticket priority-based sorting
6. Agent-specific ticket statistics
