# Onboarding Flow Service - Quick Reference

**File**: `/api-server/services/onboarding/onboarding-flow-service.js`
**Last Updated**: 2025-11-13 by Backend Coder #3

---

## New Methods Added

### 1. `validateName(name)` - Line 204
```javascript
validateName(name)
// Returns: { valid: boolean, error?: string, sanitized?: string }
```
**Purpose**: Validates name (1-50 chars, removes HTML, allows unicode)

---

### 2. `getResponses(userId)` - Line 111
```javascript
getResponses(userId)
// Returns: { name?: string, use_case?: string, ... }
```
**Purpose**: Helper to get responses object from onboarding state

---

### 3. `updateResponses(userId, responses)` - Line 127
```javascript
updateResponses(userId, responses)
// Returns: void
```
**Purpose**: Helper to update responses in onboarding state

---

### 4. `updateState(userId, updates)` - Line 151
```javascript
updateState(userId, { phase, step, phase1_completed, ... })
// Returns: void
```
**Purpose**: Helper to update multiple state fields at once

---

### 5. `isPhase1Complete(userId)` - Line 348
```javascript
isPhase1Complete(userId)
// Returns: boolean
```
**Purpose**: Checks if Phase 1 complete (name + use_case collected)

---

### 6. `triggerAviWelcome(userId)` - Line 510
```javascript
await triggerAviWelcome(userId)
// Returns: Promise<{ success: boolean, postCreated?: boolean, postId?: string, userName?: string }>
```
**Purpose**: Creates Avi welcome post after Phase 1 completion (warm tone, NO jargon)

---

## Modified Methods

### 1. `processNameResponse(userId, name)` - Line 232
```javascript
processNameResponse(userId, name)
// Returns: { success: boolean, nextStep: string, message: string }
```
**Changes**:
- ✅ Added name validation
- ✅ Already persists to `user_settings.display_name`
- ✅ Updates state to `step='use_case'`

---

### 2. `processUseCaseResponse(userId, useCase)` - Line 294
```javascript
await processUseCaseResponse(userId, useCase)
// Returns: Promise<{ success: boolean, phase1Complete: boolean, aviWelcome: {...} }>
```
**Changes**:
- ✅ Now `async` (MUST use `await`)
- ✅ Calls `triggerAviWelcome()` after Phase 1 complete
- ✅ Returns `aviWelcome` result

---

## Database Tables Updated

### `user_settings`
```sql
display_name TEXT NOT NULL  -- ✅ Saved here by processNameResponse()
```

### `onboarding_state`
```sql
step TEXT                    -- 'name' → 'use_case' → 'phase1_complete'
phase1_completed INTEGER     -- 0 → 1 (after use case)
phase1_completed_at INTEGER  -- Unix timestamp
responses TEXT               -- '{"name":"...","use_case":"..."}'
```

### `agent_posts`
```sql
-- ✅ Avi welcome post created here
author_agent = 'avi'
metadata = '{"isOnboardingPost":true,"aviWelcomePost":true}'
```

---

## Usage Examples

### Example 1: Process Name
```javascript
const service = createOnboardingFlowService(db);

const result = service.processNameResponse('user-123', 'Sarah Chen');
// result.success === true
// result.nextStep === 'use_case'
// result.message === "Great to meet you, Sarah Chen! What brings you to Agent Feed?"

// Display name saved to user_settings ✅
const settings = db.prepare('SELECT display_name FROM user_settings WHERE user_id = ?').get('user-123');
// settings.display_name === 'Sarah Chen'
```

---

### Example 2: Process Use Case
```javascript
const result = await service.processUseCaseResponse('user-123', 'Personal productivity');
// result.success === true
// result.phase1Complete === true
// result.aviWelcome.postCreated === true
// result.aviWelcome.postId === 'post-avi-welcome-abc123'

// Avi welcome post created ✅
const aviPost = db.prepare('SELECT * FROM agent_posts WHERE author_agent = ? AND author_id = ?')
  .get('avi', 'user-123');
// aviPost.title === 'Welcome to Agent Feed, Sarah Chen!'
```

---

### Example 3: Check Phase 1 Completion
```javascript
const isComplete = service.isPhase1Complete('user-123');
// Returns: false (only name collected)

service.processNameResponse('user-123', 'Sarah Chen');
const stillNotComplete = service.isPhase1Complete('user-123');
// Returns: false (still need use case)

await service.processUseCaseResponse('user-123', 'Personal productivity');
const nowComplete = service.isPhase1Complete('user-123');
// Returns: true ✅
```

---

## State Transitions

```
Initial State
  phase: 1
  step: 'name'
  phase1_completed: 0

↓ processNameResponse()

After Name Collection
  phase: 1
  step: 'use_case'
  phase1_completed: 0
  responses: {"name":"Sarah Chen"}

↓ processUseCaseResponse()

After Use Case Collection (Phase 1 Complete)
  phase: 1
  step: 'phase1_complete'
  phase1_completed: 1
  phase1_completed_at: 1699999999
  responses: {"name":"Sarah Chen","use_case":"Personal productivity"}

↓ triggerAviWelcome()

Avi Welcome Post Created ✅
  agent_posts table: { author_agent: 'avi', title: 'Welcome...' }
```

---

## Integration Checklist

- [x] Display name persisted to `user_settings` table
- [x] State transitions: `name` → `use_case` → `phase1_complete`
- [x] Phase 1 completion flag set
- [x] Avi welcome post created with warm tone
- [x] No technical jargon in Avi welcome
- [x] Duplicate welcome posts prevented
- [ ] Agent worker calls these methods during onboarding
- [ ] Orchestrator routes comments to get-to-know-you agent
- [ ] WebSocket events emitted for real-time UI updates

---

## Critical Notes

1. **`processUseCaseResponse()` is NOW ASYNC**
   - MUST use `await` when calling
   - Returns `Promise<{ ... }>`

2. **Display Name is Critical**
   - Saved to `user_settings.display_name` (line 254)
   - Appears system-wide (header, posts, comments)

3. **Avi Welcome is Idempotent**
   - Only creates welcome post once per user
   - Checks for existing post before creating

4. **Tone Validation**
   - Rejects content with technical jargon
   - Terms: `code`, `debug`, `architecture`, `implementation`, etc.

---

**Backend Coder #3 - Quick Reference Complete**
