# SPARC Specification: Grace Period Handler Implementation

**Version**: 1.0.0
**Date**: 2025-11-07
**Phase**: Specification
**Status**: Draft for Review

---

## Executive Summary

This specification defines a grace period handler that triggers at 80% of the timeout threshold (192s for 240s limit) to proactively offer users control options before automatic termination. The handler integrates with the existing worker protection system while providing TodoWrite progress visualization and user choice UI (Continue/Pause/Simplify).

**Problem Statement**: Workers currently timeout abruptly at 240s with no user warning or control, leading to lost work and poor user experience.

**Solution**: Implement a grace period handler that triggers at 192s (80%) to give users 48 seconds to decide how to proceed.

---

## 1. System Context Analysis

### Current Timeout System Architecture

**File**: `/workspaces/agent-feed/api-server/worker/worker-protection.js`

**Current Flow**:
```
Query Start → Timeout Set → Work Executes → {Success OR Timeout}
                                                     ↓
                                              Terminate + Error Message
```

**Current Limitations**:
- No user warning before timeout
- No option to extend or pause
- Lost work with no recovery option
- Abrupt termination creates poor UX
- No visibility into progress before timeout

### Grace Period Configuration

**File**: `/workspaces/agent-feed/api-server/config/streaming-protection.js`

**Existing Config**:
```javascript
gracePeriod: {
  triggerAtPercentage: 0.8,           // 80% of timeout
  enablePlanningMode: true,            // Enable planning messaging
  minStepsInPlan: 5,                  // Minimum steps in plan
  maxStepsInPlan: 10,                 // Maximum steps in plan
  messageTemplate: '⏳ This is taking longer than expected...'
}
```

**Gap Analysis**:
- Configuration exists but NOT IMPLEMENTED
- No handler to trigger at 80%
- No user choice UI defined
- No state persistence mechanism
- No TodoWrite integration

---

## 2. Requirements Specification

### 2.1 Functional Requirements

**FR-1: Grace Period Detection**
- **MUST** trigger at 80% of timeout threshold (192s for 240s)
- **MUST** calculate percentage dynamically based on complexity
- **MUST** only trigger once per execution
- **MUST** not interfere with normal completion

**FR-2: Progress Visibility (TodoWrite Integration)**
- **MUST** generate TodoWrite list showing current progress
- **MUST** mark completed steps as "completed"
- **MUST** mark current step as "in_progress"
- **MUST** mark pending steps as "pending"
- **MUST** include estimated time remaining

**FR-3: User Choice UI**
- **MUST** present three options: Continue / Pause / Simplify
- **MUST** explain consequences of each option
- **MUST** provide clear call-to-action
- **MUST** timeout to default action after 48 seconds

**FR-4: State Persistence**
- **MUST** save current work state to workspace
- **MUST** persist TodoWrite list
- **MUST** save partial results
- **MUST** enable session resumption

**FR-5: Action Handling**
- **Continue**: Extend timeout by 120s (to 360s total)
- **Pause**: Save state and graceful shutdown
- **Simplify**: Reduce scope and complete within remaining time

### 2.2 Non-Functional Requirements

**NFR-1: Performance**
- Grace period check overhead < 10ms
- State save operation < 500ms
- UI presentation < 100ms

**NFR-2: Reliability**
- 100% trigger accuracy at 80% threshold
- Zero false positives
- Graceful degradation if save fails

**NFR-3: Usability**
- User choice UI must be clear and actionable
- Progress visualization must be accurate
- Default action after 48s must be safe

**NFR-4: Maintainability**
- Reuse existing protection infrastructure
- Minimal code changes to worker-protection.js
- Configuration-driven behavior

---

## 3. Architecture Design

### 3.1 Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  executeProtectedQuery                   │
│                  (worker-protection.js)                  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ├─→ Existing Timeout Logic
                      │
                      └─→ NEW: Grace Period Monitor
                            │
                            ├─→ 80% Detection
                            │
                            ├─→ Progress Analyzer
                            │     └─→ TodoWrite Generator
                            │
                            ├─→ User Choice Handler
                            │     ├─→ Continue Handler
                            │     ├─→ Pause Handler
                            │     └─→ Simplify Handler
                            │
                            └─→ State Persistence Service
                                  └─→ Session Resume Manager
```

### 3.2 Data Flow Diagram

```
[Query Start] → [Set Timeout] → [Begin Execution]
                                        │
                                   [80% Check]
                                        │
                              ┌─────────┴─────────┐
                              │                   │
                         [< 80%]              [≥ 80%]
                              │                   │
                        [Continue]         [Grace Period]
                              │                   │
                              │            [Generate TodoWrite]
                              │                   │
                              │            [Present Choices]
                              │                   │
                              │         ┌─────────┼─────────┐
                              │         │         │         │
                              │    [Continue] [Pause] [Simplify]
                              │         │         │         │
                              │    [+120s]   [Save]   [Reduce]
                              │         │         │         │
                              └─────────┴─────────┴─────────┘
                                        │
                                 [Complete/Timeout]
```

### 3.3 File Structure

```
/api-server/
├── worker/
│   ├── worker-protection.js         # MODIFY: Add grace period monitor
│   ├── grace-period-handler.js      # NEW: Grace period logic
│   ├── state-persistence.js         # NEW: State save/restore
│   └── loop-detector.js             # EXISTING: No changes
├── config/
│   └── streaming-protection.js      # EXISTING: Config already present
├── services/
│   ├── worker-health-monitor.js     # EXISTING: Minor integration
│   └── todowrite-service.js         # NEW: Generate TodoWrite from state
└── types/
    └── grace-period.d.ts            # NEW: TypeScript definitions
```

---

## 4. API Contracts

### 4.1 Grace Period Event

```typescript
interface GracePeriodEvent {
  type: 'GRACE_PERIOD_TRIGGERED';
  timestamp: number;
  timeoutMs: number;
  elapsedMs: number;
  remainingMs: number;
  workerId: string;
  ticketId: string;
  currentState: WorkerState;
}

interface WorkerState {
  messagesCollected: Message[];
  chunkCount: number;
  responseSize: number;
  currentPhase: string;
  estimatedCompletion: number;
  todos: TodoItem[];
}

interface TodoItem {
  id: string;
  content: string;
  activeForm: string;
  status: 'completed' | 'in_progress' | 'pending';
  priority: 'high' | 'medium' | 'low';
  estimatedTime?: number;
}
```

### 4.2 User Choice Request

```typescript
interface UserChoiceRequest {
  type: 'USER_CHOICE_REQUIRED';
  message: string;
  timeRemaining: number;
  options: UserOption[];
  defaultAction: 'continue' | 'pause' | 'simplify';
  defaultAfterMs: number;
}

interface UserOption {
  action: 'continue' | 'pause' | 'simplify';
  label: string;
  description: string;
  icon: string;
  consequence: string;
}
```

### 4.3 User Choice Response

```typescript
interface UserChoiceResponse {
  action: 'continue' | 'pause' | 'simplify';
  timestamp: number;
  workerId: string;
}

// Action Handlers
interface ContinueAction {
  extendTimeoutBy: number;  // +120000ms (2 minutes)
  newTimeoutMs: number;     // 360000ms total
}

interface PauseAction {
  saveState: true;
  savedStateId: string;
  resumeUrl: string;
  expiresAt: number;
}

interface SimplifyAction {
  reduceScopeTo: number;    // percentage of original scope
  priorityOnly: boolean;
  estimatedCompletionMs: number;
}
```

### 4.4 State Persistence Schema

```typescript
interface PersistedState {
  stateId: string;
  workerId: string;
  ticketId: string;
  agentName: string;
  timestamp: number;
  expiresAt: number;

  execution: {
    query: string;
    complexity: 'simple' | 'complex' | 'default';
    elapsedMs: number;
    timeoutMs: number;
  };

  progress: {
    messagesCollected: Message[];
    chunkCount: number;
    responseSize: number;
    currentPhase: string;
    completedSteps: string[];
    pendingSteps: string[];
  };

  todos: TodoItem[];

  resumption: {
    canResume: boolean;
    resumeFrom: string;
    contextSnapshot: any;
  };
}
```

---

## 5. User Experience Design

### 5.1 Grace Period Message Template

```markdown
⏳ **This task is taking longer than expected**

**Progress So Far:**
✅ Analyzed requirements (2 min)
✅ Designed architecture (1.5 min)
🔄 Implementing features (in progress - 1.2 min)
⏸️ Writing tests (pending)
⏸️ Documentation (pending)

**Time Status:**
- Elapsed: 3 min 12 sec (80%)
- Remaining: 48 seconds
- Estimated to complete: 2 more minutes needed

**What would you like to do?**

🚀 **Continue** - Extend time by 2 minutes (recommended)
   → Completes all 5 steps with quality
   → Total time: ~5 minutes

⏸️ **Pause** - Save progress and stop gracefully
   → Resume anytime with saved state
   → No work lost

✂️ **Simplify** - Complete high-priority items only
   → Finishes in 48 seconds
   → Skips tests and docs (can add later)

*If no response in 48 seconds, will automatically Continue.*
```

### 5.2 TodoWrite Progress Format

```javascript
{
  "todos": [
    {
      "id": "1",
      "content": "Analyze requirements",
      "activeForm": "Analyzing requirements",
      "status": "completed",
      "priority": "high",
      "estimatedTime": 120000  // 2 minutes (actual)
    },
    {
      "id": "2",
      "content": "Design architecture",
      "activeForm": "Designing architecture",
      "status": "completed",
      "priority": "high",
      "estimatedTime": 90000  // 1.5 minutes (actual)
    },
    {
      "id": "3",
      "content": "Implement features",
      "activeForm": "Implementing features",
      "status": "in_progress",
      "priority": "high",
      "estimatedTime": 120000  // 2 minutes (estimated)
    },
    {
      "id": "4",
      "content": "Write tests",
      "activeForm": "Writing tests",
      "status": "pending",
      "priority": "medium",
      "estimatedTime": 60000  // 1 minute (estimated)
    },
    {
      "id": "5",
      "content": "Create documentation",
      "activeForm": "Creating documentation",
      "status": "pending",
      "priority": "low",
      "estimatedTime": 30000  // 30 seconds (estimated)
    }
  ]
}
```

---

## 6. Integration Points

### 6.1 Worker Protection Integration

**File**: `/workspaces/agent-feed/api-server/worker/worker-protection.js`

**Modification Points**:

```javascript
// EXISTING: Line 72-77
const timeoutPromise = new Promise((_, reject) => {
  timeoutId = setTimeout(() => {
    timedOut = true;
    reject(new Error('QUERY_TIMEOUT'));
  }, timeoutMs);
});

// NEW: Add grace period monitor
const gracePeriodMs = timeoutMs * 0.8;
let gracePeriodTriggered = false;

const gracePeriodPromise = new Promise((resolve) => {
  setTimeout(async () => {
    if (!gracePeriodTriggered) {
      gracePeriodTriggered = true;
      await handleGracePeriod({
        workerId,
        ticketId,
        timeoutMs,
        elapsedMs: gracePeriodMs,
        remainingMs: timeoutMs - gracePeriodMs,
        messages,
        chunkCount,
        responseSize
      });
    }
    resolve();
  }, gracePeriodMs);
});

// EXISTING: Line 160
await Promise.race([executePromise, timeoutPromise]);

// MODIFIED: Add grace period to race
await Promise.race([
  executePromise,
  timeoutPromise,
  gracePeriodPromise  // Non-blocking, runs in parallel
]);
```

### 6.2 Health Monitor Integration

**File**: `/workspaces/agent-feed/api-server/services/worker-health-monitor.js`

**New Method**:
```javascript
recordGracePeriod(workerId, decision) {
  // Track grace period usage and decisions
}
```

---

## 7. State Persistence Strategy

### 7.1 Storage Location

**Directory**: `/workspaces/agent-feed/prod/agent_workspace/suspended-sessions/`

**File Naming**: `{workerId}-{timestamp}.json`

**Example**: `worker-abc123-1699392000000.json`

### 7.2 Save Operation

```javascript
async function saveWorkerState(state: PersistedState): Promise<string> {
  const stateId = generateStateId(state.workerId, state.timestamp);
  const filePath = `/prod/agent_workspace/suspended-sessions/${stateId}.json`;

  await fs.writeFile(filePath, JSON.stringify(state, null, 2));

  return stateId;
}
```

### 7.3 Resume Operation

```javascript
async function resumeWorkerState(stateId: string): Promise<PersistedState> {
  const filePath = `/prod/agent_workspace/suspended-sessions/${stateId}.json`;

  const content = await fs.readFile(filePath, 'utf-8');
  const state = JSON.parse(content);

  // Validate expiration
  if (Date.now() > state.expiresAt) {
    throw new Error('RESUME_STATE_EXPIRED');
  }

  return state;
}
```

### 7.4 Expiration Policy

- **Default TTL**: 24 hours
- **Cleanup**: Run daily at 2 AM UTC
- **User Notification**: Email if state about to expire (22 hours)

---

## 8. Error Handling

### 8.1 Grace Period Trigger Failures

**Scenario**: Grace period check fails to trigger at 80%

**Mitigation**:
- Fallback to existing timeout behavior
- Log error for monitoring
- No impact on user experience

### 8.2 State Save Failures

**Scenario**: State persistence fails during Pause action

**Mitigation**:
- Retry save operation once
- If fails, default to Continue action
- Notify user of save failure
- Complete execution normally

### 8.3 User Choice Timeout

**Scenario**: No user response within 48 seconds

**Mitigation**:
- Default to "Continue" action
- Extend timeout by 120s
- Log default action taken
- No user intervention required

### 8.4 Resume Failures

**Scenario**: State cannot be restored during resume

**Mitigation**:
- Display error message to user
- Offer option to restart from beginning
- Preserve original state file for debugging
- Log resume failure with context

---

## 9. Testing Strategy

### 9.1 Unit Tests

**File**: `/tests/unit/grace-period-handler.test.js`

**Test Cases**:
1. Grace period triggers at exactly 80% of timeout
2. TodoWrite generated correctly from worker state
3. User choice options presented with correct data
4. Continue action extends timeout by 120s
5. Pause action saves state successfully
6. Simplify action reduces scope correctly
7. Default action triggers after 48s timeout

### 9.2 Integration Tests

**File**: `/tests/integration/grace-period-e2e.test.js`

**Test Scenarios**:
1. End-to-end grace period flow with user interaction
2. State persistence and resumption
3. Integration with existing worker protection
4. Multiple grace periods (extended timeout scenarios)
5. Concurrent worker grace periods

### 9.3 Performance Tests

**Metrics**:
- Grace period check latency < 10ms
- State save operation < 500ms
- UI presentation < 100ms
- Memory overhead < 5MB per worker

---

## 10. Metrics and Monitoring

### 10.1 Key Metrics

**Operational Metrics**:
- `grace_period_triggers_total` - Total grace periods triggered
- `grace_period_user_choices` - Breakdown by action (continue/pause/simplify)
- `grace_period_defaults` - Count of default actions (no user response)
- `state_save_success_rate` - Percentage of successful saves
- `state_resume_success_rate` - Percentage of successful resumes

**Performance Metrics**:
- `grace_period_check_latency_ms` - Grace period check duration
- `state_save_duration_ms` - State save operation duration
- `todowrite_generation_ms` - TodoWrite generation time

**User Experience Metrics**:
- `user_response_time_ms` - Time to user choice
- `continue_action_completion_rate` - Success rate of extended executions
- `pause_resume_success_rate` - Successfully resumed sessions

### 10.2 Alerting Rules

**Alert**: Grace period trigger failures > 5%
**Severity**: Warning
**Action**: Review worker protection logic

**Alert**: State save failures > 10%
**Severity**: Critical
**Action**: Check disk space and permissions

**Alert**: User choice default rate > 80%
**Severity**: Info
**Action**: Review grace period messaging

---

## 11. Rollout Plan

### Phase 1: Implementation (Week 1)
- [ ] Create `grace-period-handler.js`
- [ ] Create `state-persistence.js`
- [ ] Create `todowrite-service.js`
- [ ] Write unit tests
- [ ] Update `worker-protection.js`

### Phase 2: Testing (Week 2)
- [ ] Integration testing
- [ ] Performance validation
- [ ] User acceptance testing
- [ ] Documentation updates

### Phase 3: Beta Deployment (Week 3)
- [ ] Deploy to staging environment
- [ ] Monitor metrics
- [ ] Collect user feedback
- [ ] Bug fixes and optimizations

### Phase 4: Production Rollout (Week 4)
- [ ] Feature flag rollout (10% → 50% → 100%)
- [ ] Continuous monitoring
- [ ] Incident response readiness
- [ ] Success metrics review

---

## 12. Success Criteria

**Quantitative**:
- 95%+ grace period trigger accuracy
- < 5% state save failures
- < 100ms UI presentation latency
- 80%+ user choice engagement (not default)
- 90%+ successful resume rate

**Qualitative**:
- Users report improved control over long tasks
- Reduced frustration from abrupt timeouts
- Positive feedback on progress visibility
- Increased trust in system reliability

---

## 13. Dependencies and Assumptions

### Dependencies
- Existing worker protection system (stable)
- TodoWrite system (implemented)
- Worker health monitor (active)
- Agent workspace (available)

### Assumptions
- Users have 48 seconds to respond (reasonable)
- 120s extension is sufficient for most cases
- State persistence to disk is acceptable latency
- 24-hour resume window meets user needs

---

## 14. Open Questions

1. **Should grace period trigger multiple times?**
   - Current spec: Once per execution
   - Alternative: Every 80% of each extension
   - **Decision Required**: Product team input needed

2. **Should state include full message history?**
   - Current spec: Yes (for complete resume)
   - Alternative: Summary only (smaller files)
   - **Decision Required**: Storage vs. fidelity trade-off

3. **Should Simplify action be AI-driven?**
   - Current spec: Predefined scope reduction
   - Alternative: AI determines what to skip
   - **Decision Required**: Complexity vs. intelligence

4. **Should users be notified of expiring paused states?**
   - Current spec: Email at 22 hours
   - Alternative: No notification
   - **Decision Required**: User experience vs. infrastructure

---

## 15. References

- **Worker Protection**: `/api-server/worker/worker-protection.js`
- **Streaming Config**: `/api-server/config/streaming-protection.js`
- **Health Monitor**: `/api-server/services/worker-health-monitor.js`
- **Loop Detector**: `/api-server/worker/loop-detector.js`

---

## Document Metadata

**Author**: SPARC Specification Agent
**Reviewers**: System Architect, Product Owner, Engineering Lead
**Approval Status**: Pending Review
**Next Phase**: Pseudocode Design
**Related Documents**:
- `agent-routing-spec.md` (companion spec)
- `pseudocode.md` (next phase)
