# SPARC Specification: Multi-State Comment Processing Pills

## 1. Introduction

### 1.1 Purpose
Implement visual processing state indicators for user comments that match the existing post processing states, providing clear feedback on AI response generation progress.

### 1.2 Scope
- State machine for comment processing lifecycle
- WebSocket event mapping for state transitions
- Visual styling specifications for each state
- Backend emission points in orchestrator
- Frontend state management refactor (Set to Map)

### 1.3 Definitions
- **Comment Processing State**: Visual indicator showing AI processing status for a user comment
- **Processing Pill**: Small badge/pill UI component displaying current state with icon and text

---

## 2. State Machine

### 2.1 State Diagram

```
[User Submits Comment]
        |
        v
   +---------+
   | WAITING |  (Yellow - Queued)
   +---------+
        |
        v
   +----------+
   | ANALYZED |  (Blue - AI Received)
   +----------+
        |
        v
   +------------+
   | RESPONDING |  (Purple - Generating)
   +------------+
        |
        v
   +----------+
   | COMPLETE |  (Green - Done)
   +----------+
        |
        v
   [Remove Pill]
```

### 2.2 State Definitions

| State | Value | Description | Duration |
|-------|-------|-------------|----------|
| Waiting | `'waiting'` | Comment submitted and queued for processing | 0-5s |
| Analyzed | `'analyzed'` | AI has received and analyzed the comment | 1-3s |
| Responding | `'responding'` | AI is generating a response | 5-30s |
| Complete | `'complete'` | Response posted successfully | 2s then remove |

### 2.3 TypeScript Type Definition

```typescript
// Existing type in CommentThread.tsx line 5
export type CommentProcessingState = 'waiting' | 'analyzed' | 'responding' | 'complete' | null;
```

---

## 3. WebSocket Events

### 3.1 Event Name
```
comment:state
```

### 3.2 Event Payload Structure

```typescript
interface CommentStateEvent {
  commentId: string;    // UUID of the comment being processed
  postId: string;       // Parent post ID for room broadcasting
  state: CommentProcessingState;
  timestamp: number;    // Unix timestamp in milliseconds
}
```

### 3.3 Backend Emission Points

Located in `/workspaces/agent-feed/api-server/services/websocket-service.js`:

```javascript
// Existing method: emitCommentState() at line 245
websocketService.emitCommentState({
  commentId: 'comment-uuid',
  postId: 'post-uuid',
  state: 'waiting' | 'analyzed' | 'responding' | 'complete',
  timestamp: Date.now()
});
```

### 3.4 Orchestrator Integration Points

File: `/workspaces/agent-feed/api-server/avi/orchestrator.js`

**Emission Points Required:**

1. **WAITING** - After comment is queued
   ```javascript
   // After work-queue-repository.addToQueue() call
   websocketService.emitCommentState({
     commentId: comment.id,
     postId: comment.post_id,
     state: 'waiting'
   });
   ```

2. **ANALYZED** - When agent receives the comment
   ```javascript
   // At start of processComment() or handleUserComment()
   websocketService.emitCommentState({
     commentId: ticket.metadata.comment_id,
     postId: ticket.post_id,
     state: 'analyzed'
   });
   ```

3. **RESPONDING** - When AI starts generating response
   ```javascript
   // Before calling Claude API / generating response
   websocketService.emitCommentState({
     commentId: ticket.metadata.comment_id,
     postId: ticket.post_id,
     state: 'responding'
   });
   ```

4. **COMPLETE** - After response is posted
   ```javascript
   // After comment response is saved to database
   websocketService.emitCommentState({
     commentId: ticket.metadata.comment_id,
     postId: ticket.post_id,
     state: 'complete'
   });
   ```

---

## 4. Visual Styling Specification

### 4.1 Color Palette

| State | Background | Border | Text | Icon Color |
|-------|------------|--------|------|------------|
| Waiting | `bg-yellow-100` / `bg-yellow-900` | `border-yellow-200` / `border-yellow-800` | `text-yellow-700` / `text-yellow-300` | `text-yellow-600` / `text-yellow-400` |
| Analyzed | `bg-blue-100` / `bg-blue-900` | `border-blue-200` / `border-blue-800` | `text-blue-700` / `text-blue-300` | `text-blue-600` / `text-blue-400` |
| Responding | `bg-purple-100` / `bg-purple-900` | `border-purple-200` / `border-purple-800` | `text-purple-700` / `text-purple-300` | `text-purple-600` / `text-purple-400` |
| Complete | `bg-green-100` / `bg-green-900` | `border-green-200` / `border-green-800` | `text-green-700` / `text-green-300` | `text-green-600` / `text-green-400` |

### 4.2 Icons (Lucide React)

| State | Icon | Animation |
|-------|------|-----------|
| Waiting | `Clock` | None |
| Analyzed | `Search` or `Brain` | None |
| Responding | `Loader2` | `animate-spin` |
| Complete | `CheckCircle` | None (auto-dismiss) |

### 4.3 Display Text

| State | Label Text |
|-------|------------|
| Waiting | "Queued..." |
| Analyzed | "Analyzing..." |
| Responding | "Responding..." |
| Complete | "Done!" |

### 4.4 Component Styling

```tsx
// Base pill container
className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-md border"

// State-specific example (Responding state)
className={cn(
  "flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-md border",
  "bg-purple-100 dark:bg-purple-900",
  "border-purple-200 dark:border-purple-800"
)}
```

---

## 5. Frontend State Management

### 5.1 Current Implementation (to be replaced)

File: `/workspaces/agent-feed/frontend/src/components/CommentThread.tsx`

```typescript
// Current: Simple Set tracking processing state
processingComments?: Set<string>;
```

### 5.2 Required Refactor

```typescript
// New: Map tracking specific states per comment
type CommentProcessingMap = Map<string, CommentProcessingState>;

interface CommentThreadProps {
  // ... existing props
  processingComments?: CommentProcessingMap;
  onProcessingChange?: (commentId: string, state: CommentProcessingState) => void;
}
```

### 5.3 Parent Component (RealSocialMediaFeed.tsx)

```typescript
// State declaration
const [commentProcessingStates, setCommentProcessingStates] =
  useState<Map<string, CommentProcessingState>>(new Map());

// WebSocket event handler
useEffect(() => {
  socket.on('comment:state', (event: CommentStateEvent) => {
    setCommentProcessingStates(prev => {
      const next = new Map(prev);
      if (event.state === 'complete') {
        // Remove after brief delay to show completion
        setTimeout(() => {
          setCommentProcessingStates(p => {
            const updated = new Map(p);
            updated.delete(event.commentId);
            return updated;
          });
        }, 2000);
      }
      next.set(event.commentId, event.state);
      return next;
    });
  });

  return () => {
    socket.off('comment:state');
  };
}, [socket]);
```

### 5.4 CommentItem Component Update

```tsx
// Updated props
interface CommentItemProps {
  // ... existing props
  processingState?: CommentProcessingState;
}

// Pill rendering logic
const getProcessingPillConfig = (state: CommentProcessingState) => {
  switch (state) {
    case 'waiting':
      return {
        icon: Clock,
        text: 'Queued...',
        colors: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800',
        textColor: 'text-yellow-700 dark:text-yellow-300',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        animate: false
      };
    case 'analyzed':
      return {
        icon: Search,
        text: 'Analyzing...',
        colors: 'bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-800',
        textColor: 'text-blue-700 dark:text-blue-300',
        iconColor: 'text-blue-600 dark:text-blue-400',
        animate: false
      };
    case 'responding':
      return {
        icon: Loader2,
        text: 'Responding...',
        colors: 'bg-purple-100 dark:bg-purple-900 border-purple-200 dark:border-purple-800',
        textColor: 'text-purple-700 dark:text-purple-300',
        iconColor: 'text-purple-600 dark:text-purple-400',
        animate: true
      };
    case 'complete':
      return {
        icon: CheckCircle,
        text: 'Done!',
        colors: 'bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800',
        textColor: 'text-green-700 dark:text-green-300',
        iconColor: 'text-green-600 dark:text-green-400',
        animate: false
      };
    default:
      return null;
  }
};
```

---

## 6. Integration Points

### 6.1 Files to Modify

| File | Changes Required |
|------|------------------|
| `api-server/avi/orchestrator.js` | Add `emitCommentState()` calls at 4 processing points |
| `api-server/worker/agent-worker.js` | Add state emissions during comment processing |
| `frontend/src/components/CommentThread.tsx` | Refactor `processingComments` Set to Map, update pill rendering |
| `frontend/src/components/RealSocialMediaFeed.tsx` | Add `comment:state` WebSocket listener, manage Map state |
| `frontend/src/services/api.ts` | Ensure WebSocket subscription includes `comment:state` event |

### 6.2 Existing Infrastructure

- WebSocket service already has `emitCommentState()` method (line 245)
- CommentThread already has `CommentProcessingState` type defined (line 5)
- Visual pill structure exists (lines 229-238) but only handles single "Posting reply..." state

---

## 7. Acceptance Criteria

### 7.1 Functional Requirements

- [ ] FR-001: Comment submission triggers `waiting` state pill (yellow)
- [ ] FR-002: Agent analysis triggers `analyzed` state pill (blue)
- [ ] FR-003: Response generation triggers `responding` state pill (purple, animated)
- [ ] FR-004: Response completion triggers `complete` state pill (green)
- [ ] FR-005: Complete state auto-dismisses after 2 seconds
- [ ] FR-006: State transitions are smooth and sequential
- [ ] FR-007: Multiple comments can show different states simultaneously

### 7.2 Non-Functional Requirements

- [ ] NFR-001: State updates via WebSocket with <100ms latency
- [ ] NFR-002: No UI flickering during state transitions
- [ ] NFR-003: Dark mode support for all state colors
- [ ] NFR-004: Accessible color contrast ratios (WCAG 2.1 AA)

### 7.3 Test Scenarios

```gherkin
Feature: Multi-State Comment Processing Pills

Scenario: Full processing lifecycle
  Given I am viewing a post with comments
  When I submit a comment that triggers AI response
  Then I should see a yellow "Queued..." pill
  And the pill should change to blue "Analyzing..."
  And the pill should change to purple "Responding..."
  And the pill should change to green "Done!"
  And the pill should disappear after 2 seconds

Scenario: Multiple comments processing
  Given I have submitted two comments on different posts
  When both are being processed
  Then I should see independent state pills for each comment
  And each should progress through states independently
```

---

## 8. Migration Path

### 8.1 Backward Compatibility

The refactor from `Set<string>` to `Map<string, CommentProcessingState>` requires:

1. Update all components passing `processingComments` prop
2. Change `.has(id)` checks to `.has(id)` (Map also has `.has()`)
3. Replace `Set.add(id)` with `Map.set(id, state)`
4. Replace `Set.delete(id)` with `Map.delete(id)`

### 8.2 Rollback Plan

If issues arise, revert to Set-based implementation with single "processing" state by:
- Converting Map back to Set in state management
- Using `has()` check only for pill display
- Removing multi-state styling logic

---

## 9. Dependencies

- Lucide React icons: `Clock`, `Search`, `Loader2`, `CheckCircle`
- Socket.IO client for WebSocket events
- Existing WebSocket service (`emitCommentState`)
- Tailwind CSS for styling

---

## 10. Estimation

| Task | Effort |
|------|--------|
| Backend orchestrator emissions | 2 hours |
| Frontend Map refactor | 2 hours |
| Pill component styling | 1 hour |
| WebSocket listener setup | 1 hour |
| Testing & validation | 2 hours |
| **Total** | **8 hours** |

---

## Document Info

- **Created**: 2025-11-19
- **Author**: SPARC Specification Agent
- **Version**: 1.0.0
- **Status**: Draft - Pending Review
