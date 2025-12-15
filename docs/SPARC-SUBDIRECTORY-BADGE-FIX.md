# SPARC Specification: Subdirectory Intelligence Search & Badge Real-time Updates

**Version:** 1.0
**Date:** 2025-10-24
**Phase:** Specification
**Priority:** Critical
**Estimated Effort:** 4-6 hours

---

## Executive Summary

This specification addresses two critical production defects affecting the proactive agent system:

1. **Worker Intelligence Search Failure**: Agent worker cannot locate intelligence files stored in subdirectories, resulting in "No summary available" despite files existing in `/intelligence/` subdirectory
2. **Badge Update Failure**: Frontend not responding to WebSocket `ticket:status:update` events, preventing real-time status updates and breaking the refresh button

Both issues are **currently breaking user experience** and require immediate resolution.

---

## Problem Analysis

### Issue 1: Worker Intelligence Search in Subdirectories

#### Current Behavior

**File Location:**
```
/workspaces/agent-feed/prod/agent_workspace/link-logger-agent/intelligence/lambda-vi-briefing-agentdb.md
```

**Worker Search Pattern:**
```javascript
// agent-worker.js lines 164-228 (AFTER recent fix attempt)
async extractFromWorkspaceFiles(workspaceDir) {
  const priorityPaths = [
    path.join(workspaceDir, 'intelligence'),
    path.join(workspaceDir, 'summaries'),
    workspaceDir  // Root as fallback
  ];

  // Searches in priority order
  for (const searchPath of priorityPaths) {
    const files = await fs.readdir(searchPath);
    const briefingFiles = files.filter(f =>
      f.startsWith('lambda-vi-briefing-') && f.endsWith('.md')
    );
    // ... extraction logic
  }
}
```

**Evidence of Implementation:**
- System modification notes show recent fix was attempted
- Priority-based search implemented with `/intelligence/`, `/summaries/`, root
- Files are being created correctly in `/intelligence/` subdirectory
- Pattern matching looks correct (`lambda-vi-briefing-*.md`)

#### Root Cause Analysis

**Likely Issues:**

1. **Race Condition**: Worker may be executing before files are fully written
2. **Path Resolution**: Workspace directory path may not be resolved correctly
3. **Permission Issues**: Worker process may not have read access to subdirectories
4. **Async Timing**: File system operations may not be awaited properly
5. **Error Swallowing**: Try-catch blocks may be silently failing without logging

#### Success Criteria

- [ ] Worker finds intelligence files in `/intelligence/` subdirectory
- [ ] Worker finds intelligence files in `/summaries/` subdirectory
- [ ] Worker falls back to root directory if subdirectories don't exist
- [ ] Search completes in <100ms (no performance regression)
- [ ] Detailed logging shows which directory was searched and result
- [ ] Unit tests cover all search paths and failure scenarios

---

### Issue 2: Badge Real-time Updates & Refresh Button

#### Current Behavior

**Backend (Working Correctly):**
```javascript
// api-server/services/websocket-service.js
emitTicketStatusUpdate(event) {
  this.io.emit('ticket:status:update', event);
  this.io.to(`post:${event.post_id}`).emit('ticket:status:update', event);
  this.io.to(`agent:${event.agent_id}`).emit('ticket:status:update', event);

  console.log(`Emitted ticket:status:update - Ticket: ${event.ticket_id}, Status: ${event.status}`);
}
```

**Logs Confirm Events Are Emitted:**
```
Emitted ticket:status:update - Ticket: 3d648723..., Status: processing ✅
Emitted ticket:status:update - Ticket: 3d648723..., Status: completed ✅
```

**Frontend (Partially Working):**
```javascript
// frontend/src/hooks/useTicketUpdates.js (Lines 173-174)
socket.on('ticket:status:update', handleTicketUpdate);

// Handler invalidates React Query cache (Lines 74-79)
queryClient.invalidateQueries({ queryKey: ['posts'] });
```

**Recent Fix Attempt:**
```typescript
// frontend/src/components/RealSocialMediaFeed.tsx (Lines 379-411)
useEffect(() => {
  const handleTicketStatusUpdate = (data: any) => {
    console.log('🎫 Ticket status update:', data);

    // Update posts to trigger badge re-render
    setPosts(current =>
      current.map(post => {
        if (post.id === data.post_id) {
          return {
            ...post,
            _ticketUpdate: Date.now()  // Force re-render trigger
          };
        }
        return post;
      })
    );

    // Refetch on completion
    if (data.status === 'completed' || data.status === 'failed') {
      setTimeout(() => {
        loadPosts(page, false);
      }, 500);
    }
  };

  apiService.on('ticket:status:update', handleTicketStatusUpdate);
  // ...
}, [page]);
```

**Refresh Button (Recently Fixed):**
```typescript
// frontend/src/components/RealSocialMediaFeed.tsx (Lines 467-484)
const handleRefresh = async () => {
  setRefreshing(true);

  try {
    console.log('🔄 Refreshing feed...');
    setPage(0);
    await loadPosts(0);
    console.log('✅ Feed refreshed successfully');
  } catch (error) {
    console.error('❌ Refresh failed:', error);
  } finally {
    setRefreshing(false);
  }
};
```

#### Root Cause Analysis

**Architectural Issues:**

1. **Dual Event System Confusion**:
   - `useTicketUpdates` hook listens on `socket` (Socket.IO)
   - `RealSocialMediaFeed` listens on `apiService` (EventEmitter pattern)
   - Events emitted on Socket.IO but NOT bridged to apiService EventEmitter
   - **This is the primary bug**: Events arrive but wrong listener location

2. **State Update Issues**:
   - Adding `_ticketUpdate` timestamp doesn't update `ticket_status` field
   - Badge component reads `post.ticket_status` which is never updated
   - Force re-render without data update = no visual change

3. **Data Flow Broken**:
   ```
   Backend WebSocket → Socket.IO → useTicketUpdates → React Query Cache
                                 ↗ (missing bridge)
                                apiService EventEmitter → RealSocialMediaFeed
   ```

4. **Refresh Button Fixed But Incomplete**:
   - Refresh button now works (recent fix confirmed)
   - But doesn't trigger if event system is broken
   - Manual refresh works, automatic refresh doesn't

#### Success Criteria

- [ ] Badge updates in real-time when ticket status changes
- [ ] Refresh button triggers feed reload without page refresh
- [ ] Events flow correctly: WebSocket → useTicketUpdates → Badge Update
- [ ] `post.ticket_status` field updated optimistically on events
- [ ] Console logs show event received and badge re-rendered
- [ ] No duplicate event handlers registered
- [ ] Unit tests verify event flow and state updates

---

## Functional Requirements

### FR-1: Recursive Intelligence File Search

**ID**: FR-1.1
**Priority**: High
**Description**: Worker must search for intelligence files in subdirectories with priority ordering

**Acceptance Criteria**:
- Worker searches `/intelligence/` subdirectory first
- Worker searches `/summaries/` subdirectory second
- Worker searches workspace root as fallback
- Worker stops searching after first match found
- Worker logs which directory was searched and result
- Search handles directory not found gracefully
- Search handles permission errors gracefully

**Test Scenarios**:
```gherkin
Scenario: Intelligence file in /intelligence/ subdirectory
  Given a workspace at /prod/agent_workspace/link-logger-agent/
  And a file at intelligence/lambda-vi-briefing-agentdb.md
  When worker calls extractFromWorkspaceFiles()
  Then worker should find file in /intelligence/
  And worker should extract Executive Brief section
  And worker should log "Found intelligence in intelligence/"
  And worker should NOT search /summaries/ or root

Scenario: Intelligence file in /summaries/ subdirectory
  Given a workspace at /prod/agent_workspace/link-logger-agent/
  And NO files in /intelligence/
  And a file at summaries/summary.md
  When worker calls extractFromWorkspaceFiles()
  Then worker should skip /intelligence/
  And worker should find file in /summaries/
  And worker should extract Executive Brief section
  And worker should log "Found intelligence in summaries/"

Scenario: Intelligence file in root directory
  Given a workspace at /prod/agent_workspace/link-logger-agent/
  And NO files in /intelligence/ or /summaries/
  And a file at lambda-vi-briefing-root.md
  When worker calls extractFromWorkspaceFiles()
  Then worker should skip /intelligence/ and /summaries/
  And worker should find file in root
  And worker should extract Executive Brief section
  And worker should log "Found intelligence in workspace root"

Scenario: No intelligence files found
  Given a workspace at /prod/agent_workspace/link-logger-agent/
  And NO lambda-vi-briefing-*.md files anywhere
  When worker calls extractFromWorkspaceFiles()
  Then worker should search all three directories
  And worker should return null
  And worker should log "No intelligence files found"

Scenario: Directory permission denied
  Given a workspace at /prod/agent_workspace/link-logger-agent/
  And /intelligence/ directory has no read permission
  When worker calls extractFromWorkspaceFiles()
  Then worker should log "Cannot access /intelligence/"
  And worker should continue to /summaries/
  And worker should NOT throw error
```

---

### FR-2: Real-time Badge Status Updates

**ID**: FR-2.1
**Priority**: Critical
**Description**: Frontend must update ticket status badges in real-time when WebSocket events received

**Acceptance Criteria**:
- Frontend receives `ticket:status:update` events from Socket.IO
- Events update `post.ticket_status` field in state
- Badge component re-renders with new status
- Updates occur without page refresh
- Updates occur without manual refresh button click
- Event handler registered only once per component mount
- Event handler cleaned up on component unmount

**Test Scenarios**:
```gherkin
Feature: Real-time Badge Updates

Scenario: Ticket status changes from pending to processing
  Given a post with id "abc-123" is displayed
  And post has ticket_status: { pending: 1, processing: 0, completed: 0, failed: 0 }
  And badge shows "Waiting for link-logger-agent"
  When WebSocket emits ticket:status:update with:
    | post_id    | ticket_id | status     | agent_id          |
    | abc-123    | xyz-789   | processing | link-logger-agent |
  Then post state should update to ticket_status: { pending: 0, processing: 1, completed: 0, failed: 0 }
  And badge should show "link-logger-agent analyzing..."
  And badge should have spinning loader icon
  And no page refresh should occur

Scenario: Ticket status changes from processing to completed
  Given a post with id "abc-123" is displayed
  And post has ticket_status: { pending: 0, processing: 1, completed: 0, failed: 0 }
  And badge shows "link-logger-agent analyzing..."
  When WebSocket emits ticket:status:update with:
    | post_id    | ticket_id | status    | agent_id          |
    | abc-123    | xyz-789   | completed | link-logger-agent |
  Then post state should update to ticket_status: { pending: 0, processing: 0, completed: 1, failed: 0 }
  And badge should show "Analyzed by link-logger-agent"
  And badge should have green checkmark icon
  And feed should refresh to show agent comment (500ms delay)

Scenario: Multiple tickets on same post
  Given a post with id "abc-123" is displayed
  And post has 2 tickets: [pending, processing]
  When WebSocket emits ticket:status:update for first ticket:
    | status    | agent_id    |
    | completed | agent-one   |
  Then post should update first ticket only
  And badge should show both statuses
  And second ticket should remain processing

Scenario: Event received for post not on screen
  Given feed shows posts ["abc-123", "def-456"]
  When WebSocket emits ticket:status:update for post "xyz-999"
  Then no state update should occur
  And no errors should be logged
  And event should be silently ignored
```

---

### FR-3: Manual Refresh Button

**ID**: FR-3.1
**Priority**: Medium (Already Fixed)
**Description**: Refresh button must reload feed data without page refresh

**Status**: ✅ FIXED (verified in codebase)

**Acceptance Criteria**:
- Clicking refresh button sets `refreshing` state to true
- Button shows spinning icon while refreshing
- Feed data reloads from API
- Page counter resets to 0
- Refreshing state set to false when complete
- Button disabled while refreshing

**Implementation Confirmed**:
```typescript
// Lines 467-484 in RealSocialMediaFeed.tsx
const handleRefresh = async () => {
  setRefreshing(true);
  try {
    setPage(0);
    await loadPosts(0);
  } catch (error) {
    console.error('❌ Refresh failed:', error);
  } finally {
    setRefreshing(false);
  }
};
```

---

## Non-Functional Requirements

### NFR-1: Performance

**ID**: NFR-1.1
**Category**: Performance
**Description**: Intelligence file search must complete within acceptable time limits

**Requirements**:
- File search completes in <100ms for single directory
- File search completes in <250ms for all directories
- No blocking of main worker thread
- Async operations properly awaited

**Measurement**: Add performance logging around `extractFromWorkspaceFiles()`

---

### NFR-2: Reliability

**ID**: NFR-2.1
**Category**: Reliability
**Description**: System must handle errors gracefully without crashing

**Requirements**:
- Directory not found: Continue to next directory
- Permission denied: Log warning, continue to next directory
- File read error: Log error, continue to next file
- WebSocket disconnect: Auto-reconnect with exponential backoff
- Event handler errors: Log but don't crash component

---

### NFR-3: Observability

**ID**: NFR-3.1
**Category**: Observability
**Description**: System must provide detailed logging for debugging

**Requirements**:
- Log which directories are searched
- Log which files are found
- Log which directory produced result
- Log WebSocket events received
- Log state updates triggered
- Log errors with full stack trace

**Logging Format**:
```javascript
// Worker logging
console.log(`🔍 Searching for intelligence in ${searchPath}`);
console.log(`✅ Found ${briefingFiles.length} briefing files in ${searchPath}`);
console.log(`📄 Extracting from: ${briefingPath}`);
console.log(`❌ Failed to access ${searchPath}: ${error.message}`);

// Frontend logging
console.log(`🎫 Ticket status update received:`, { post_id, ticket_id, status });
console.log(`🔄 Updating post ${post_id} ticket status`);
console.log(`✅ Badge re-rendered for post ${post_id}`);
```

---

## API Contracts

### WebSocket Event: `ticket:status:update`

**Direction**: Backend → Frontend
**Transport**: Socket.IO
**Event Name**: `ticket:status:update`

**Payload Schema**:
```typescript
interface TicketStatusUpdate {
  post_id: string;        // UUID of post
  ticket_id: string;      // UUID of ticket
  status: 'pending' | 'processing' | 'completed' | 'failed';
  agent_id: string;       // Agent identifier
  timestamp: string;      // ISO 8601 timestamp
  error?: string;         // Optional error message (only for 'failed')
}
```

**Example Payloads**:
```json
// Processing started
{
  "post_id": "abc-123-def-456",
  "ticket_id": "xyz-789-uvw-012",
  "status": "processing",
  "agent_id": "link-logger-agent",
  "timestamp": "2025-10-24T18:00:00.000Z"
}

// Processing completed
{
  "post_id": "abc-123-def-456",
  "ticket_id": "xyz-789-uvw-012",
  "status": "completed",
  "agent_id": "link-logger-agent",
  "timestamp": "2025-10-24T18:01:30.000Z"
}

// Processing failed
{
  "post_id": "abc-123-def-456",
  "ticket_id": "xyz-789-uvw-012",
  "status": "failed",
  "agent_id": "link-logger-agent",
  "timestamp": "2025-10-24T18:01:30.000Z",
  "error": "Failed to fetch URL: Network timeout"
}
```

**Consumer Requirements**:
- Frontend MUST listen on Socket.IO client instance (not apiService)
- Frontend MUST update `ticket_status` field in post state
- Frontend MUST trigger React Query cache invalidation
- Frontend MUST handle missing post_id gracefully (log warning, don't crash)

---

### Worker Method: `extractFromWorkspaceFiles()`

**Signature**:
```typescript
async extractFromWorkspaceFiles(
  workspaceDir: string
): Promise<string | null>
```

**Parameters**:
- `workspaceDir`: Absolute path to agent workspace directory
  - Example: `/workspaces/agent-feed/prod/agent_workspace/link-logger-agent`

**Return Value**:
- `string`: Extracted intelligence content (Executive Brief section)
- `null`: No intelligence files found

**Search Priority**:
1. `${workspaceDir}/intelligence/lambda-vi-briefing-*.md`
2. `${workspaceDir}/summaries/*.md`
3. `${workspaceDir}/lambda-vi-briefing-*.md`

**Error Handling**:
- Directory not found: Continue to next directory (don't throw)
- Permission denied: Log warning, continue to next directory
- File read error: Log error, continue to next file
- All directories fail: Return `null`

**Performance**:
- Stop searching after first match found
- Use async/await for all file system operations
- Don't block main thread

---

## Data Model Updates

### Post State Extension

**Current Schema**:
```typescript
interface AgentPost {
  id: string;
  title: string;
  content: string;
  authorAgent: string;
  created_at: string;
  ticket_status?: TicketStatusSummary;
  // ... other fields
}
```

**Required Addition**:
```typescript
interface AgentPost {
  // ... existing fields
  ticket_status?: TicketStatusSummary;
  _ticketUpdate?: number;  // Internal: Last update timestamp
}

interface TicketStatusSummary {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  agents: string[];  // List of agent IDs involved
}
```

**Update Logic**:
```typescript
// On ticket:status:update event
const updatedPost = {
  ...post,
  ticket_status: computeNewTicketStatus(post.ticket_status, eventData),
  _ticketUpdate: Date.now()
};

function computeNewTicketStatus(
  current: TicketStatusSummary,
  event: TicketStatusUpdate
): TicketStatusSummary {
  // Decrement old status count
  // Increment new status count
  // Add agent to agents list if not present
  // Return updated summary
}
```

---

## Implementation Plan

### Phase 1: Worker Intelligence Search Fix (2-3 hours)

**Tasks**:

1. **Add Enhanced Logging** (30 min)
   - Log entry to `extractFromWorkspaceFiles()`
   - Log each directory search attempt
   - Log file discovery and extraction result
   - Log final return value

2. **Add Error Diagnostics** (30 min)
   - Log directory existence checks
   - Log permission errors with full context
   - Log file read errors with file paths
   - Add timing metrics

3. **Review & Test Async Logic** (1 hour)
   - Verify all `await` keywords present
   - Check error handling doesn't swallow exceptions
   - Test race conditions with immediate file reads
   - Add retry logic if file not immediately available

4. **Add Unit Tests** (1 hour)
   - Test file in `/intelligence/`
   - Test file in `/summaries/`
   - Test file in root
   - Test no files found
   - Test directory permission denied
   - Test file read error

**Deliverables**:
- Updated `agent-worker.js` with enhanced logging
- 6 new unit tests
- Performance benchmarks documented

---

### Phase 2: Badge Real-time Updates Fix (2-3 hours)

**Tasks**:

1. **Fix Event Bridging** (1 hour)
   - Remove `apiService.on()` listener in `RealSocialMediaFeed.tsx`
   - Move badge update logic to `useTicketUpdates` hook
   - Pass callback from component to hook
   - Test event flow: Socket.IO → Hook → Component

2. **Implement State Update Logic** (1 hour)
   - Create `computeNewTicketStatus()` helper function
   - Update `ticket_status` field on events
   - Trigger React Query invalidation
   - Test optimistic updates vs. API refetch

3. **Add Real-time Badge Component** (30 min)
   - Ensure `TicketStatusBadge` reads from `post.ticket_status`
   - Add `key` prop with `_ticketUpdate` to force re-render
   - Verify animations work correctly

4. **Add Integration Tests** (30 min)
   - Test event received → state updated
   - Test badge re-renders
   - Test multiple tickets on same post
   - Test event for post not on screen

**Deliverables**:
- Updated `useTicketUpdates.js` with state update callback
- Updated `RealSocialMediaFeed.tsx` with proper event handling
- 4 new integration tests
- Manual test procedure documented

---

## Test Requirements

### Unit Tests

**File**: `/workspaces/agent-feed/api-server/tests/unit/agent-worker-subdirectory-search.test.js`

**Test Cases**:
1. `should find briefing file in /intelligence/ subdirectory`
2. `should find briefing file in /summaries/ subdirectory`
3. `should find briefing file in root directory as fallback`
4. `should return null when no files found`
5. `should handle directory not found gracefully`
6. `should handle permission denied gracefully`
7. `should stop searching after first match`
8. `should log search attempts and results`

---

### Integration Tests

**File**: `/workspaces/agent-feed/api-server/tests/integration/ticket-status-badge-updates.test.js`

**Test Cases**:
1. `should update badge when ticket status changes to processing`
2. `should update badge when ticket status changes to completed`
3. `should update badge when ticket status changes to failed`
4. `should handle multiple tickets on same post`
5. `should ignore events for posts not in feed`
6. `should trigger feed refresh on completion`
7. `should not duplicate event handlers on re-render`
8. `should clean up event handlers on unmount`

---

### End-to-End Tests

**File**: `/workspaces/agent-feed/tests/e2e/badge-real-time-updates.spec.ts`

**Test Scenarios**:
1. Create post with URL → Wait for ticket creation → Verify badge shows "pending"
2. Wait for processing → Verify badge updates to "processing" with animation
3. Wait for completion → Verify badge updates to "completed" with green checkmark
4. Verify agent comment appears in feed
5. Test manual refresh button updates badge state
6. Test page refresh preserves ticket status

---

## Edge Cases & Error Handling

### Worker Intelligence Search

**Edge Case**: Multiple briefing files in same directory
- **Solution**: Sort by filename descending (most recent first), take first

**Edge Case**: File created while search in progress
- **Solution**: Search completes with files available at start time

**Edge Case**: Malformed file (no Executive Brief section)
- **Solution**: Log warning, continue to next file

**Edge Case**: Empty Executive Brief section
- **Solution**: Treat as "no content found", continue to next file

**Edge Case**: Workspace directory doesn't exist
- **Solution**: Log error, return null, let caller handle fallback

---

### Badge Real-time Updates

**Edge Case**: Event received before post loaded
- **Solution**: Store event in temporary buffer, apply when post loads

**Edge Case**: Multiple status changes in rapid succession
- **Solution**: Use debouncing (100ms) to batch updates

**Edge Case**: WebSocket disconnects during processing
- **Solution**: Auto-reconnect, refresh feed on reconnection

**Edge Case**: Ticket status goes backward (completed → processing)
- **Solution**: Allow state transitions, log warning for diagnostics

**Edge Case**: Multiple tabs open (same user, same feed)
- **Solution**: All tabs update independently (Socket.IO broadcasts to all)

---

## Success Metrics

### Worker Intelligence Search

**Metrics to Track**:
- Search success rate: >99%
- Average search time: <100ms
- Directory hit rate: 80% in `/intelligence/`, 15% in `/summaries/`, 5% in root
- Error rate: <1%

**Acceptance Threshold**:
- All briefing files found in subdirectories
- No "No summary available" messages when files exist
- Search logs show correct directory traversal

---

### Badge Real-time Updates

**Metrics to Track**:
- Event delivery rate: >99%
- Update latency: <200ms from event emission to badge update
- False positive rate (incorrect status): 0%
- False negative rate (missed update): <1%

**Acceptance Threshold**:
- Badge updates within 200ms of status change
- No page refresh required for updates
- Refresh button works without errors

---

## Security Considerations

### File System Access

**Concern**: Worker reads from arbitrary workspace directories

**Mitigation**:
- Validate `workspaceDir` is within `/prod/agent_workspace/`
- Use path normalization to prevent directory traversal
- Restrict file types to `.md` only
- Limit file size to prevent memory exhaustion (<10MB)

**Implementation**:
```javascript
function validateWorkspacePath(workspaceDir) {
  const normalized = path.normalize(workspaceDir);
  const allowed = path.normalize('/workspaces/agent-feed/prod/agent_workspace');

  if (!normalized.startsWith(allowed)) {
    throw new Error('Invalid workspace path: Outside allowed directory');
  }

  return normalized;
}
```

---

### WebSocket Event Security

**Concern**: Malicious or malformed events could crash frontend

**Mitigation**:
- Validate event schema with Zod or similar
- Sanitize all string fields (agent_id, post_id, etc.)
- Rate-limit event processing (max 10/second per post)
- Timeout protection for slow updates

**Implementation**:
```typescript
import { z } from 'zod';

const TicketStatusUpdateSchema = z.object({
  post_id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  agent_id: z.string().max(100),
  timestamp: z.string().datetime(),
  error: z.string().max(500).optional()
});

function handleTicketUpdate(data: unknown) {
  const validated = TicketStatusUpdateSchema.safeParse(data);

  if (!validated.success) {
    console.warn('Invalid ticket update event:', validated.error);
    return;
  }

  // Process validated.data
}
```

---

## Dependencies

### Technical Dependencies

- **Node.js**: v18+ (for `fs.promises`)
- **Socket.IO Client**: v4.6.0+ (already in `package.json`)
- **React**: v18+ (for `useEffect` with dependency arrays)
- **React Query**: v4+ (for cache invalidation)

### External Dependencies

- File system must allow read access to workspace directories
- WebSocket connection must be established before events emitted
- Backend must emit events in correct order (pending → processing → completed)

---

## Rollback Plan

### If Worker Fix Fails

**Rollback Strategy**:
1. Revert changes to `agent-worker.js`
2. Fall back to text message extraction only
3. Disable `posts_as_self: true` agents temporarily
4. Notify users of degraded intelligence quality

**Rollback Trigger**:
- Search time exceeds 1 second
- Error rate exceeds 10%
- Worker crashes in production

---

### If Badge Fix Fails

**Rollback Strategy**:
1. Remove WebSocket event handler from `RealSocialMediaFeed.tsx`
2. Fall back to polling API every 5 seconds
3. Disable real-time badge updates
4. Keep manual refresh button functional

**Rollback Trigger**:
- Event handler causes React errors
- Badge updates cause infinite re-render loop
- WebSocket connection becomes unstable

---

## Documentation Updates Required

### Developer Documentation

- **File**: `docs/AGENT-WORKER-ARCHITECTURE.md`
  - Document subdirectory search priority
  - Add flowchart of intelligence extraction

- **File**: `docs/WEBSOCKET-INTEGRATION.md`
  - Update event flow diagram
  - Document state update logic

### User Documentation

- **File**: `README.md`
  - Add note about real-time badge updates
  - Document refresh button behavior

### API Documentation

- **File**: `api-server/docs/WEBSOCKET-EVENTS.md`
  - Add `ticket:status:update` event specification
  - Add payload schema and examples

---

## Validation Checklist

### Pre-Implementation

- [ ] Specification reviewed by technical lead
- [ ] Edge cases documented
- [ ] Error handling strategy approved
- [ ] Test plan reviewed
- [ ] Rollback plan documented

### Post-Implementation

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual test scenarios verified
- [ ] Performance benchmarks within threshold
- [ ] Logging demonstrates correct behavior
- [ ] Documentation updated
- [ ] Code reviewed and approved
- [ ] Deployed to staging environment
- [ ] Smoke tests passed in staging
- [ ] Production deployment approved

---

## Open Questions

1. **Q**: Should we add retry logic if file not immediately available?
   - **A**: TBD - requires performance testing

2. **Q**: Should badge updates be throttled/debounced?
   - **A**: TBD - test with high-frequency events

3. **Q**: Should we cache intelligence files to avoid repeated reads?
   - **A**: TBD - measure actual performance impact

4. **Q**: Should WebSocket connection failures trigger fallback to polling?
   - **A**: TBD - define acceptable downtime threshold

---

## References

### Related Documents

- `PRODUCTION-VALIDATION-REPORT.md` - Identified these issues
- `AVI-PERSISTENT-SESSION-SPECIFICATION.md` - Agent architecture context
- `WEBSOCKET-INTEGRATION-REPORT.md` - Original WebSocket implementation

### Code References

- `/workspaces/agent-feed/api-server/worker/agent-worker.js` (lines 164-228)
- `/workspaces/agent-feed/frontend/src/hooks/useTicketUpdates.js`
- `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`
- `/workspaces/agent-feed/frontend/src/components/TicketStatusBadge.jsx`
- `/workspaces/agent-feed/api-server/services/websocket-service.js`

### Test Files

- `/workspaces/agent-feed/api-server/tests/integration/websocket-events.test.js`
- `/workspaces/agent-feed/frontend/src/hooks/__tests__/useTicketUpdates.test.js`
- `/workspaces/agent-feed/tests/e2e/ticket-status-indicator.spec.ts`

---

## Approval

**Specification Author**: Claude (SPARC Specification Agent)
**Date**: 2025-10-24
**Status**: READY FOR REVIEW

**Approvals Required**:
- [ ] Technical Lead
- [ ] Frontend Engineer
- [ ] Backend Engineer
- [ ] QA Engineer

**Next Phase**: Architecture Design → Pseudocode → Implementation

---

## Appendix A: Current vs. Desired State

### Worker Intelligence Search

**Current State**:
```
✅ Backend emits events
✅ Files created in /intelligence/
✅ Priority search implemented
❌ Worker still reports "No summary available"
❌ Unclear which directory is actually searched
❌ No diagnostic logging
```

**Desired State**:
```
✅ Worker finds files in /intelligence/
✅ Worker finds files in /summaries/
✅ Worker falls back to root
✅ Detailed search logs available
✅ Error handling doesn't swallow failures
✅ Performance within SLA (<100ms)
```

---

### Badge Real-time Updates

**Current State**:
```
✅ Backend emits ticket:status:update
✅ useTicketUpdates hook listens to Socket.IO
✅ Refresh button works (recently fixed)
❌ Badge doesn't update in real-time
❌ Event bridging to component broken
❌ ticket_status field not updated
```

**Desired State**:
```
✅ Badge updates within 200ms of event
✅ No page refresh required
✅ ticket_status field updated optimistically
✅ Feed refetches on completion
✅ Multiple tickets handled correctly
✅ Event flow fully traced in logs
```

---

## Appendix B: Test Data

### Worker Test Fixtures

**Directory Structure**:
```
/tmp/test-workspace/
├── intelligence/
│   ├── lambda-vi-briefing-agentdb.md
│   └── lambda-vi-briefing-test.md
├── summaries/
│   └── summary-2024-10-24.md
└── lambda-vi-briefing-root.md
```

**File Content Template**:
```markdown
# Lambda-VI Briefing: AgentDB

## Executive Brief

This is a comprehensive analysis of the AgentDB platform...

[Full intelligence content here]

## Technical Details

...
```

---

### Badge Test Events

**Test Event Sequence**:
```json
// T+0ms: Ticket created
{
  "post_id": "test-post-123",
  "ticket_id": "test-ticket-456",
  "status": "pending",
  "agent_id": "test-agent",
  "timestamp": "2025-10-24T18:00:00.000Z"
}

// T+2000ms: Processing started
{
  "post_id": "test-post-123",
  "ticket_id": "test-ticket-456",
  "status": "processing",
  "agent_id": "test-agent",
  "timestamp": "2025-10-24T18:00:02.000Z"
}

// T+45000ms: Processing completed
{
  "post_id": "test-post-123",
  "ticket_id": "test-ticket-456",
  "status": "completed",
  "agent_id": "test-agent",
  "timestamp": "2025-10-24T18:00:47.000Z"
}
```

---

**End of Specification**
