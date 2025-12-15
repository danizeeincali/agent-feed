# SPARC Specification: Processing Pills & Display Name Fixes

**Document Version:** 1.0.0
**Date:** 2025-11-19
**Status:** Approved for Implementation
**Methodology:** SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)

---

## Executive Summary

This document specifies fixes for two critical UX issues:

1. **Processing Pills Not Showing for Top-Level Comments**: Users don't see "Processing comment..." feedback when submitting top-level comments via "Add Comment" button
2. **Display Name Shows "user" Instead of Actual Name**: After onboarding name collection, the system displays "user" instead of the saved name (e.g., "John Connor")

**Impact**: Both issues affect user trust and perceived system responsiveness.

**Root Causes Identified**:
- Issue 1: Top-level comment submission uses global `processingComments.size > 0` check; button cannot access specific `tempCommentId`
- Issue 2: Name saved to `onboarding_state.responses` JSON but NOT to `user_settings.display_name` where `AuthorDisplayName` component queries

---

## S - SPECIFICATION

### 1.1 Functional Requirements

#### FR-1: Processing Pill Display for Top-Level Comments

**ID**: FR-1.1
**Priority**: High
**Description**: When a user clicks "Add Comment" on a post, the system SHALL display a processing indicator until the comment is successfully created or fails.

**Acceptance Criteria**:
- ✅ AC-1.1.1: Processing pill appears immediately when "Add Comment" button is clicked
- ✅ AC-1.1.2: Processing pill displays "Adding Comment..." text with animated spinner
- ✅ AC-1.1.3: "Add Comment" button is disabled and shows spinner during processing
- ✅ AC-1.1.4: Processing pill remains visible until API response received (success or failure)
- ✅ AC-1.1.5: Processing pill disappears after successful comment creation
- ✅ AC-1.1.6: Processing pill disappears on error, user sees error alert
- ✅ AC-1.1.7: Multiple rapid clicks do not create duplicate processing pills

**Current Behavior**:
```typescript
// Lines 703, 1457, 1460, 1476-1481 in RealSocialMediaFeed.tsx
const tempCommentId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
setProcessingComments(prev => new Set(prev).add(tempCommentId));

// Button check (line 1457)
disabled={processingComments.size > 0}

// Pill display (line 1476)
{processingComments.size > 0 && (
  <div>Processing comment...</div>
)}
```

**Problem**: `tempCommentId` is scoped to `handleAddComment` function; button and pill cannot check for specific comment ID, only global set size.

---

#### FR-2: Display Name Persistence After Onboarding

**ID**: FR-2.1
**Priority**: Critical
**Description**: After user completes onboarding name collection, their chosen name SHALL display consistently across all UI components (header, posts, comments, author labels).

**Acceptance Criteria**:
- ✅ AC-2.1.1: Name entered in onboarding Phase 1 is saved to `user_settings.display_name`
- ✅ AC-2.1.2: `AuthorDisplayName` component retrieves name from `user_settings` table
- ✅ AC-2.1.3: Name displays immediately after onboarding completion (no page refresh required)
- ✅ AC-2.1.4: Name persists across page refreshes and browser sessions
- ✅ AC-2.1.5: Fallback to "User" only when `user_settings.display_name` is NULL or empty
- ✅ AC-2.1.6: Name sanitization prevents XSS attacks (HTML entity escaping)
- ✅ AC-2.1.7: Name validation enforces 1-50 character limit

**Current Behavior**:
```javascript
// onboarding-flow-service.js (lines 256-258)
responses.name = validatedName;
// ❌ Only saves to onboarding_state.responses JSON

// onboarding-flow-service.js (lines 261-263) - ALREADY FIXED
this.userSettingsService.setDisplayName(userId, validatedName);
// ✅ This line exists but may not be working correctly
```

**Problem**: Despite fix in line 262, name may not be persisting correctly to `user_settings` table, or cache invalidation is not triggering UI update.

---

### 1.2 Non-Functional Requirements

#### NFR-1: Performance

**ID**: NFR-1.1
**Requirement**: Processing pill state transitions SHALL complete within 50ms
**Measurement**: Chrome DevTools Performance profiler, React DevTools Profiler
**Target**: <50ms for setState operations

**ID**: NFR-1.2
**Requirement**: Display name retrieval SHALL cache results for 60 seconds
**Measurement**: Network tab shows no redundant API calls within cache TTL
**Target**: Max 1 API call per userId per 60 seconds

#### NFR-2: User Experience

**ID**: NFR-2.1
**Requirement**: Processing feedback SHALL be visible within 100ms of user action
**Measurement**: Perceived latency measurement (click to visual feedback)
**Target**: <100ms (perceivable as "instant")

**ID**: NFR-2.2
**Requirement**: Display name update SHALL be visible without page refresh
**Measurement**: Manual testing - name appears after onboarding without F5
**Target**: 100% success rate

#### NFR-3: Reliability

**ID**: NFR-3.1
**Requirement**: Processing pill state SHALL be resilient to race conditions
**Measurement**: Rapid-click testing (10 clicks/second)
**Target**: Zero duplicate comments created

**ID**: NFR-3.2
**Requirement**: Display name fallback SHALL never crash the UI
**Measurement**: Error boundary testing, null/undefined user scenarios
**Target**: Zero runtime errors, graceful fallback to "User"

---

### 1.3 Edge Cases

#### EC-1: Processing Pill Edge Cases

**EC-1.1**: User clicks "Add Comment" multiple times rapidly
**Expected**: First click disables button, subsequent clicks ignored, single processing pill shown

**EC-1.2**: API request takes >30 seconds (network timeout)
**Expected**: Processing pill remains visible until timeout, error alert shown, pill removed

**EC-1.3**: API returns 500 error
**Expected**: Processing pill removed, error alert shown, comment form remains open for retry

**EC-1.4**: User submits comment, then immediately navigates to different page
**Expected**: Processing state cleanup on component unmount, no memory leak

**EC-1.5**: Two users simultaneously comment on same post
**Expected**: Each user sees their own processing pill, no cross-contamination

---

#### EC-2: Display Name Edge Cases

**EC-2.1**: User enters name with special characters (e.g., "O'Brien", "José")
**Expected**: Name saved correctly, displayed with special characters intact

**EC-2.2**: User enters name with HTML/JavaScript (e.g., "<script>alert('xss')</script>")
**Expected**: Name sanitized (HTML entities escaped), XSS attack prevented

**EC-2.3**: User enters 51-character name
**Expected**: Validation error shown, name not saved, user prompted to shorten

**EC-2.4**: User enters empty string or whitespace-only name
**Expected**: Validation error shown, name not saved, user prompted for valid name

**EC-2.5**: Database write fails during name save
**Expected**: Error logged, user shown error message, onboarding paused (does not proceed to Phase 2)

**EC-2.6**: User completes onboarding but `user_settings` table doesn't exist (migration failed)
**Expected**: Graceful fallback to "User", error logged for admin investigation

**EC-2.7**: Concurrent onboarding sessions (user opens two tabs)
**Expected**: Last write wins, both tabs sync to final saved name via cache invalidation

---

### 1.4 Success Metrics

#### SM-1: Processing Pill Success Metrics

- **SM-1.1**: 100% of top-level comment submissions show processing pill
- **SM-1.2**: Processing pill visible time: 200ms - 3000ms (typical API response time)
- **SM-1.3**: Zero duplicate comments created from rapid clicking
- **SM-1.4**: User satisfaction survey: "I knew my comment was being processed" >90% agree

#### SM-2: Display Name Success Metrics

- **SM-2.1**: 100% of onboarding completions result in name displayed (not "User")
- **SM-2.2**: Zero XSS vulnerabilities from name input (security audit)
- **SM-2.3**: 100% cache hit rate for repeated name lookups within 60 seconds
- **SM-2.4**: User satisfaction survey: "My name displays correctly" >95% agree

---

## P - PSEUDOCODE

### 2.1 Fix 1: Processing Pills for Top-Level Comments

#### Algorithm: Per-Post Processing State Management

```
DEFINE STATE:
  processingComments: Map<postId, tempCommentId>
    // Map from postId to temporary comment ID for that post
    // Allows checking if specific post has processing comment

FUNCTION handleAddComment(postId, content):
  // Step 1: Generate unique temporary ID
  tempCommentId = generateTempId(postId)

  // Step 2: Add to processing state for THIS POST
  setProcessingComments(prev => {
    newMap = new Map(prev)
    newMap.set(postId, tempCommentId)
    return newMap
  })

  // Step 3: Disable button for this post (check map)
  buttonDisabled = processingComments.has(postId)

  // Step 4: Make API request
  TRY:
    result = await apiService.createComment(postId, content)

    // Step 5: Success - remove from processing state
    setProcessingComments(prev => {
      newMap = new Map(prev)
      newMap.delete(postId)
      return newMap
    })

    // Step 6: Refresh comments, hide form
    await loadComments(postId, forceRefresh=true)
    setShowCommentForm(prev => ({ ...prev, [postId]: false }))

  CATCH error:
    // Step 7: Error - remove from processing state
    setProcessingComments(prev => {
      newMap = new Map(prev)
      newMap.delete(postId)
      return newMap
    })

    // Step 8: Show error to user
    alert("Failed to post comment. Please try again.")
  END TRY

FUNCTION renderProcessingPill(postId):
  IF processingComments.has(postId):
    RETURN (
      <div className="processing-pill">
        <Spinner />
        <span>Adding Comment...</span>
      </div>
    )
  ELSE:
    RETURN null
  END IF

FUNCTION isCommentButtonDisabled(postId):
  RETURN processingComments.has(postId)
```

---

#### Algorithm: Reply Comment Processing (Already Working)

```
// This is how CommentThread.tsx already handles reply processing
// We need to align top-level comments with this pattern

DEFINE STATE:
  processingComments: Set<commentId>

FUNCTION handleReply(parentCommentId, content):
  tempCommentId = generateTempId(parentCommentId)

  // Add specific comment ID to set
  setProcessingComments(prev => new Set(prev).add(tempCommentId))

  // Pass processingComments set to child component
  <CommentItem processingComments={processingComments} />

  // Check if THIS specific reply is processing
  isThisReplyProcessing = processingComments.has(tempCommentId)

  // ... rest of logic same as top-level comments
```

**Key Insight**: Reply comments work because `CommentItem` receives `processingComments` as prop and can check if its specific `tempCommentId` is in the set. Top-level comments need similar architecture.

---

### 2.2 Fix 2: Display Name Persistence

#### Algorithm: Save Name to user_settings During Onboarding

```
FUNCTION processNameResponse(userId, name):
  // Step 1: Validate name
  validation = validateName(name)
  IF NOT validation.valid:
    RETURN { success: false, error: validation.error }
  END IF

  validatedName = validation.sanitized

  // Step 2: Get current onboarding state
  state = getOnboardingState(userId)
  responses = state.responses OR {}

  // Step 3: Save to onboarding_state.responses (existing behavior)
  responses.name = validatedName

  // Step 4: CRITICAL - Save to user_settings.display_name
  TRY:
    userSettingsService.setDisplayName(userId, validatedName)

    LOG_SUCCESS("Display name persisted to user_settings: " + validatedName)

  CATCH error:
    // Non-blocking error - log but continue onboarding
    LOG_ERROR("Failed to persist display name to user_settings: " + error)
    LOG_WARNING("Name will save to onboarding_state only")

    // TODO: Implement retry mechanism or background sync
  END TRY

  // Step 5: Update onboarding state to next step
  updateOnboardingState(userId, {
    phase: 1,
    step: "use_case",
    responses: responses
  })

  // Step 6: Return success response
  RETURN {
    success: true,
    nextStep: "use_case",
    message: "Great to meet you, " + validatedName + "!"
  }
```

---

#### Algorithm: Name Validation & Sanitization

```
FUNCTION validateName(name):
  // Step 1: Check for null/undefined
  IF name IS NULL OR name IS UNDEFINED:
    RETURN { valid: false, error: "Name is required" }
  END IF

  // Step 2: Trim whitespace
  trimmed = name.trim()

  // Step 3: Check length constraints
  IF trimmed.length = 0:
    RETURN { valid: false, error: "Name cannot be empty" }
  END IF

  IF trimmed.length > 50:
    RETURN { valid: false, error: "Name must be 50 characters or less" }
  END IF

  // Step 4: Sanitize HTML entities (XSS prevention)
  sanitized = trimmed
    .replace(/&/g, "&amp;")     // Escape ampersands first
    .replace(/</g, "&lt;")      // Escape less-than
    .replace(/>/g, "&gt;")      // Escape greater-than
    .replace(/"/g, "&quot;")    // Escape double quotes
    .replace(/'/g, "&#x27;")    // Escape single quotes
    .replace(/\//g, "&#x2F;")   // Escape forward slashes

  // Step 5: Return sanitized result
  RETURN { valid: true, sanitized: sanitized }
```

---

#### Algorithm: Display Name Retrieval with Caching

```
DEFINE CACHE:
  userSettingsCache: Map<userId, { settings, timestamp }>
  CACHE_TTL = 60000 // 60 seconds

FUNCTION useUserSettings(userId):
  // Step 1: Check cache first
  cached = userSettingsCache.get(userId)
  IF cached AND (currentTime - cached.timestamp < CACHE_TTL):
    LOG("Using cached settings for " + userId)
    RETURN cached.settings.display_name OR "User"
  END IF

  // Step 2: Fetch from API
  setLoading(true)

  TRY:
    result = await apiService.getUserSettings(userId)

    IF result.success AND result.data:
      // Step 3: Update cache
      userSettingsCache.set(userId, {
        settings: result.data,
        timestamp: currentTime
      })

      displayName = result.data.display_name OR "User"

      LOG("Settings loaded: " + displayName)
      RETURN displayName

    ELSE:
      // No settings found - use fallback
      LOG("No settings found for " + userId)
      RETURN "User"
    END IF

  CATCH error:
    // API error - use fallback
    LOG_ERROR("Error fetching settings: " + error)
    RETURN "User"

  FINALLY:
    setLoading(false)
  END TRY

FUNCTION clearUserSettingsCache(userId):
  IF userId IS PROVIDED:
    userSettingsCache.delete(userId)
  ELSE:
    userSettingsCache.clear()
  END IF
```

---

#### Algorithm: Cache Invalidation After Name Save

```
FUNCTION handleOnboardingNameSubmit(userId, name):
  // Step 1: Submit name to API
  result = await apiService.submitOnboardingResponse(userId, name, "name")

  IF result.success:
    // Step 2: Invalidate user settings cache
    clearUserSettingsCache(userId)

    // Step 3: Force refresh of AuthorDisplayName components
    // (This happens automatically via useEffect when cache is cleared)

    // Step 4: Update local state optimistically
    setUserDisplayName(name)

    LOG("Onboarding name submitted, cache invalidated")
  ELSE:
    LOG_ERROR("Onboarding name submission failed: " + result.error)
  END IF

  RETURN result
```

---

## A - ARCHITECTURE

### 3.1 Component Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FIX 1: PROCESSING PILLS FLOW                    │
└─────────────────────────────────────────────────────────────────────┘

User Action: Click "Add Comment"
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ RealSocialMediaFeed.tsx                                             │
│                                                                       │
│ handleAddComment(postId, content)                                   │
│   1. tempCommentId = generateTempId(postId)                         │
│   2. processingComments.set(postId, tempCommentId) ◄─ Map instead   │
│   3. apiService.createComment(postId, content)      of Set          │
│      └─ POST /api/posts/:postId/comments                            │
│                                                                       │
│ Button Render:                                                       │
│   disabled={processingComments.has(postId)} ◄─ Per-post check      │
│                                                                       │
│ Processing Pill Render:                                              │
│   {processingComments.has(postId) && ( ◄─ Per-post check           │
│     <div>Adding Comment...</div>                                     │
│   )}                                                                 │
└─────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ API Response (Success)                                               │
│                                                                       │
│   1. processingComments.delete(postId)                              │
│   2. loadComments(postId, forceRefresh=true)                        │
│   3. setShowCommentForm({ ...prev, [postId]: false })               │
└─────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ API Response (Error)                                                 │
│                                                                       │
│   1. processingComments.delete(postId)                              │
│   2. alert("Failed to post comment")                                │
│   3. Form remains open for retry                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

```
┌─────────────────────────────────────────────────────────────────────┐
│                   FIX 2: DISPLAY NAME FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

User Action: Submit name in onboarding
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Frontend: EnhancedPostingInterface.tsx                              │
│                                                                       │
│ handleOnboardingSubmit(name)                                         │
│   └─ POST /api/onboarding/response                                 │
│        body: { userId, responseText: name, responseType: "name" }   │
└─────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Backend: routes/onboarding/index.js                                 │
│                                                                       │
│ POST /api/onboarding/response                                       │
│   └─ onboardingResponseHandler.processResponse(userId, name)       │
└─────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Backend: services/onboarding/onboarding-flow-service.js            │
│                                                                       │
│ processNameResponse(userId, name)                                   │
│   1. validation = validateName(name)                                │
│   2. responses.name = validatedName                                 │
│   3. ✅ userSettingsService.setDisplayName(userId, validatedName)  │
│   4. updateOnboardingState(userId, { step: "use_case" })           │
└─────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Backend: services/user-settings-service.js                          │
│                                                                       │
│ setDisplayName(userId, displayName)                                 │
│   └─ updateUserSettings(userId, { display_name: displayName })     │
│        │                                                             │
│        ▼                                                             │
│   UPDATE user_settings                                              │
│   SET display_name = ?                                              │
│   WHERE user_id = ?                                                 │
│                                                                       │
│   IF NO ROWS UPDATED:                                               │
│     INSERT INTO user_settings (user_id, display_name)               │
│     VALUES (?, ?)                                                   │
└─────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Frontend: Cache Invalidation                                        │
│                                                                       │
│ clearUserSettingsCache(userId)                                      │
│   └─ Triggers useUserSettings() re-fetch                           │
└─────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Frontend: components/AuthorDisplayName.tsx                          │
│                                                                       │
│ useUserSettings(userId)                                             │
│   1. Check cache (expired)                                           │
│   2. GET /api/user-settings/:userId                                 │
│   3. displayName = result.data.display_name OR "User"               │
│   4. Update cache                                                    │
│   5. Render: <span>{displayName}</span>                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 3.2 State Management Architecture

#### Current State (Problematic)

```typescript
// RealSocialMediaFeed.tsx - Current Implementation
const [processingComments, setProcessingComments] = useState<Set<string>>(new Set());

// Problem: tempCommentId is local scope only
const handleAddComment = async (postId, content) => {
  const tempCommentId = `temp-${Date.now()}-${Math.random()}`;
  setProcessingComments(prev => new Set(prev).add(tempCommentId));
  // ❌ Button cannot check tempCommentId - it's not accessible in render scope
};

// Render: Global check doesn't work for per-post buttons
<button disabled={processingComments.size > 0}>
  Add Comment
</button>
```

#### Proposed State (Fixed)

```typescript
// RealSocialMediaFeed.tsx - Proposed Implementation
const [processingComments, setProcessingComments] = useState<Map<string, string>>(new Map());
// Map<postId, tempCommentId> allows per-post checking

const handleAddComment = async (postId: string, content: string) => {
  const tempCommentId = `temp-${postId}-${Date.now()}`;

  // Store mapping: postId → tempCommentId
  setProcessingComments(prev => {
    const next = new Map(prev);
    next.set(postId, tempCommentId);
    return next;
  });

  try {
    await apiService.createComment(postId, content);
    // Success: remove from map
    setProcessingComments(prev => {
      const next = new Map(prev);
      next.delete(postId);
      return next;
    });
  } catch (error) {
    // Error: remove from map
    setProcessingComments(prev => {
      const next = new Map(prev);
      next.delete(postId);
      return next;
    });
  }
};

// Render: Per-post check works
<button disabled={processingComments.has(postId)}>
  {processingComments.has(postId) ? 'Adding Comment...' : 'Add Comment'}
</button>

// Processing pill: Per-post check works
{processingComments.has(postId) && (
  <div className="processing-pill">Processing comment...</div>
)}
```

---

### 3.3 Database Schema

#### user_settings Table

```sql
CREATE TABLE user_settings (
  -- Primary Key
  user_id TEXT PRIMARY KEY,

  -- Display Name (REQUIRED after onboarding)
  display_name TEXT NOT NULL,

  -- Display Name Style (optional categorization)
  display_name_style TEXT CHECK(
    display_name_style IS NULL OR
    display_name_style IN ('first_only', 'full_name', 'nickname', 'professional')
  ),

  -- Onboarding State
  onboarding_completed INTEGER NOT NULL DEFAULT 0 CHECK(onboarding_completed IN (0, 1)),
  onboarding_completed_at INTEGER,  -- Unix timestamp

  -- Profile Data (JSON string)
  profile_json TEXT,

  -- Timestamps (Unix epoch in seconds)
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

-- Index for fast onboarding status lookups
CREATE INDEX idx_user_settings_onboarding
  ON user_settings(onboarding_completed);

-- Trigger: Auto-update updated_at timestamp
CREATE TRIGGER update_user_settings_timestamp
AFTER UPDATE ON user_settings
FOR EACH ROW
BEGIN
  UPDATE user_settings
  SET updated_at = unixepoch()
  WHERE user_id = NEW.user_id;
END;
```

#### onboarding_state Table

```sql
CREATE TABLE onboarding_state (
  user_id TEXT PRIMARY KEY,
  phase INTEGER NOT NULL DEFAULT 1,
  step TEXT NOT NULL DEFAULT 'name',
  phase1_completed INTEGER NOT NULL DEFAULT 0,
  phase1_completed_at INTEGER,
  phase2_completed INTEGER NOT NULL DEFAULT 0,
  phase2_completed_at INTEGER,
  responses TEXT, -- JSON string: { name: "John Connor", use_case: "..." }
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

**Critical Requirement**: Name MUST be saved to BOTH tables:
- `onboarding_state.responses` (JSON) - Historical record of onboarding responses
- `user_settings.display_name` (TEXT) - Authoritative source for display name system-wide

---

### 3.4 API Endpoints

#### Existing Endpoints (Used by Fixes)

```
POST /api/onboarding/response
  Request:
    {
      "userId": "demo-user-123",
      "responseText": "John Connor",
      "responseType": "name"
    }
  Response:
    {
      "success": true,
      "nextStep": "use_case",
      "phase": 1,
      "message": "Great to meet you, John Connor!"
    }

GET /api/user-settings/:userId
  Response:
    {
      "success": true,
      "data": {
        "user_id": "demo-user-123",
        "display_name": "John Connor",
        "display_name_style": "full_name",
        "onboarding_completed": 1,
        "profile_json": {},
        "created_at": 1700000000,
        "updated_at": 1700000000
      }
    }

POST /api/posts/:postId/comments
  Request:
    {
      "content": "This is my comment",
      "parentId": null,
      "author": "demo-user-123",
      "author_user_id": "demo-user-123",
      "mentionedUsers": []
    }
  Response:
    {
      "success": true,
      "comment": {
        "id": "comment-uuid",
        "content": "This is my comment",
        "author": "demo-user-123",
        "createdAt": "2025-11-19T12:34:56Z"
      }
    }
```

---

## R - REFINEMENT (TDD Approach)

### 4.1 Test-Driven Development Strategy

#### Red-Green-Refactor Cycle

**Phase 1: Red (Write Failing Tests)**
1. Write unit tests for processing pill state management
2. Write integration tests for display name persistence
3. Write E2E tests for full user flows
4. Run tests → All fail (expected)

**Phase 2: Green (Make Tests Pass)**
1. Implement minimal code to pass unit tests
2. Implement integration fixes
3. Verify E2E tests pass
4. Run full test suite → All pass

**Phase 3: Refactor (Optimize)**
1. Extract reusable functions
2. Improve code readability
3. Optimize performance
4. Add error handling edge cases
5. Run tests → Still pass

---

### 4.2 Unit Tests

#### Test Suite 1: Processing Pills State Management

**File**: `frontend/src/components/__tests__/RealSocialMediaFeed.processingPills.test.tsx`

```typescript
describe('RealSocialMediaFeed - Processing Pills', () => {
  describe('Top-Level Comment Processing', () => {
    test('should show processing pill when Add Comment clicked', async () => {
      const { getByTestId, getByText } = render(<RealSocialMediaFeed />);

      // Click "Add Comment" button
      const addButton = getByText('Add Comment');
      fireEvent.click(addButton);

      // Processing pill should appear
      expect(getByText('Adding Comment...')).toBeInTheDocument();

      // Button should be disabled
      expect(addButton).toBeDisabled();
    });

    test('should hide processing pill after successful comment creation', async () => {
      mockApiService.createComment.mockResolvedValueOnce({
        success: true,
        comment: { id: 'new-comment-123' }
      });

      const { getByText, queryByText } = render(<RealSocialMediaFeed />);

      fireEvent.click(getByText('Add Comment'));

      // Wait for API call to complete
      await waitFor(() => {
        expect(queryByText('Adding Comment...')).not.toBeInTheDocument();
      });
    });

    test('should hide processing pill after error', async () => {
      mockApiService.createComment.mockRejectedValueOnce(new Error('API Error'));

      const { getByText, queryByText } = render(<RealSocialMediaFeed />);

      fireEvent.click(getByText('Add Comment'));

      // Wait for error handling
      await waitFor(() => {
        expect(queryByText('Adding Comment...')).not.toBeInTheDocument();
      });
    });

    test('should prevent duplicate comments from rapid clicking', async () => {
      const { getByText } = render(<RealSocialMediaFeed />);
      const addButton = getByText('Add Comment');

      // Rapid fire 5 clicks
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      fireEvent.click(addButton);

      // API should be called only once
      await waitFor(() => {
        expect(mockApiService.createComment).toHaveBeenCalledTimes(1);
      });
    });

    test('should handle multiple posts independently', async () => {
      const { getAllByText } = render(<RealSocialMediaFeed posts={[post1, post2]} />);

      const addButtons = getAllByText('Add Comment');

      // Click button on first post
      fireEvent.click(addButtons[0]);

      // First post should show processing, second should not
      expect(addButtons[0]).toBeDisabled();
      expect(addButtons[1]).not.toBeDisabled();
    });
  });

  describe('Map-based Processing State', () => {
    test('processingComments Map stores postId -> tempCommentId', () => {
      const postId = 'post-123';
      const tempCommentId = `temp-${postId}-${Date.now()}`;

      const map = new Map();
      map.set(postId, tempCommentId);

      expect(map.has(postId)).toBe(true);
      expect(map.get(postId)).toBe(tempCommentId);
    });

    test('deleting from Map removes processing state', () => {
      const map = new Map([['post-123', 'temp-123']]);

      map.delete('post-123');

      expect(map.has('post-123')).toBe(false);
    });
  });
});
```

---

#### Test Suite 2: Display Name Persistence

**File**: `api-server/tests/integration/onboarding-display-name.test.js`

```javascript
describe('Onboarding - Display Name Persistence', () => {
  let db;
  let onboardingFlowService;
  let userSettingsService;

  beforeEach(() => {
    db = createTestDatabase();
    onboardingFlowService = createOnboardingFlowService(db);
    userSettingsService = createUserSettingsService(db);
  });

  test('should save name to user_settings.display_name', async () => {
    const userId = 'test-user-123';
    const name = 'John Connor';

    // Submit name in onboarding
    const result = onboardingFlowService.processNameResponse(userId, name);

    expect(result.success).toBe(true);

    // Verify name saved to user_settings
    const settings = userSettingsService.getUserSettings(userId);
    expect(settings).toBeDefined();
    expect(settings.display_name).toBe('John Connor');
  });

  test('should sanitize HTML in name before saving', async () => {
    const userId = 'test-user-123';
    const maliciousName = '<script>alert("xss")</script>';

    const result = onboardingFlowService.processNameResponse(userId, maliciousName);

    expect(result.success).toBe(true);

    // Verify name is sanitized
    const settings = userSettingsService.getUserSettings(userId);
    expect(settings.display_name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    expect(settings.display_name).not.toContain('<script>');
  });

  test('should reject empty name', async () => {
    const userId = 'test-user-123';
    const emptyName = '   ';

    const result = onboardingFlowService.processNameResponse(userId, emptyName);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Name cannot be empty');
  });

  test('should reject name over 50 characters', async () => {
    const userId = 'test-user-123';
    const longName = 'a'.repeat(51);

    const result = onboardingFlowService.processNameResponse(userId, longName);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Name must be 50 characters or less');
  });

  test('should create user_settings row if not exists', async () => {
    const userId = 'new-user-456';
    const name = 'Sarah Connor';

    // Verify no settings exist
    const beforeSettings = userSettingsService.getUserSettings(userId);
    expect(beforeSettings).toBeNull();

    // Submit name
    const result = onboardingFlowService.processNameResponse(userId, name);
    expect(result.success).toBe(true);

    // Verify settings created
    const afterSettings = userSettingsService.getUserSettings(userId);
    expect(afterSettings).toBeDefined();
    expect(afterSettings.display_name).toBe('Sarah Connor');
  });

  test('should update existing user_settings row', async () => {
    const userId = 'test-user-123';

    // Create initial settings
    userSettingsService.updateUserSettings(userId, { display_name: 'Old Name' });

    // Update via onboarding
    const result = onboardingFlowService.processNameResponse(userId, 'New Name');
    expect(result.success).toBe(true);

    // Verify updated
    const settings = userSettingsService.getUserSettings(userId);
    expect(settings.display_name).toBe('New Name');
  });
});
```

---

#### Test Suite 3: Display Name Retrieval & Caching

**File**: `frontend/src/hooks/__tests__/useUserSettings.test.tsx`

```typescript
describe('useUserSettings Hook', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearUserSettingsCache();
    jest.clearAllMocks();
  });

  test('should fetch display name from API', async () => {
    mockApiService.getUserSettings.mockResolvedValueOnce({
      success: true,
      data: { user_id: 'user-123', display_name: 'John Connor' }
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useUserSettings('user-123')
    );

    await waitForNextUpdate();

    expect(result.current.displayName).toBe('John Connor');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should use cached value on second call', async () => {
    mockApiService.getUserSettings.mockResolvedValueOnce({
      success: true,
      data: { user_id: 'user-123', display_name: 'John Connor' }
    });

    // First call
    const { result: result1, waitForNextUpdate: wait1 } = renderHook(() =>
      useUserSettings('user-123')
    );
    await wait1();

    // Second call (should use cache)
    const { result: result2, waitForNextUpdate: wait2 } = renderHook(() =>
      useUserSettings('user-123')
    );
    await wait2();

    // API called only once
    expect(mockApiService.getUserSettings).toHaveBeenCalledTimes(1);

    // Both return same result
    expect(result1.current.displayName).toBe('John Connor');
    expect(result2.current.displayName).toBe('John Connor');
  });

  test('should fallback to "User" when API returns no data', async () => {
    mockApiService.getUserSettings.mockResolvedValueOnce({
      success: false,
      data: null
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useUserSettings('user-123')
    );

    await waitForNextUpdate();

    expect(result.current.displayName).toBe('User');
  });

  test('should fallback to "User" when API throws error', async () => {
    mockApiService.getUserSettings.mockRejectedValueOnce(new Error('API Error'));

    const { result, waitForNextUpdate } = renderHook(() =>
      useUserSettings('user-123')
    );

    await waitForNextUpdate();

    expect(result.current.displayName).toBe('User');
    expect(result.current.error).toBeDefined();
  });

  test('refresh() should invalidate cache and re-fetch', async () => {
    mockApiService.getUserSettings
      .mockResolvedValueOnce({
        success: true,
        data: { user_id: 'user-123', display_name: 'John Connor' }
      })
      .mockResolvedValueOnce({
        success: true,
        data: { user_id: 'user-123', display_name: 'John Connor Updated' }
      });

    const { result, waitForNextUpdate } = renderHook(() =>
      useUserSettings('user-123')
    );

    await waitForNextUpdate();
    expect(result.current.displayName).toBe('John Connor');

    // Call refresh
    act(() => {
      result.current.refresh();
    });

    await waitForNextUpdate();
    expect(result.current.displayName).toBe('John Connor Updated');

    // API called twice (initial + refresh)
    expect(mockApiService.getUserSettings).toHaveBeenCalledTimes(2);
  });
});
```

---

### 4.3 Integration Tests

#### Test Suite 4: End-to-End Onboarding to Display

**File**: `tests/integration/onboarding-to-display-e2e.test.js`

```javascript
describe('Onboarding to Display Name E2E', () => {
  let server;
  let db;

  beforeAll(async () => {
    server = await startTestServer();
    db = getTestDatabase();
  });

  afterAll(async () => {
    await stopTestServer(server);
  });

  test('full flow: onboarding name submission -> display name shows', async () => {
    const userId = 'e2e-user-123';
    const userName = 'Kyle Reese';

    // Step 1: Submit name via onboarding API
    const onboardingResponse = await request(server)
      .post('/api/onboarding/response')
      .send({
        userId,
        responseText: userName,
        responseType: 'name'
      });

    expect(onboardingResponse.status).toBe(200);
    expect(onboardingResponse.body.success).toBe(true);
    expect(onboardingResponse.body.nextStep).toBe('use_case');

    // Step 2: Verify name saved to onboarding_state
    const onboardingState = db.prepare(
      'SELECT * FROM onboarding_state WHERE user_id = ?'
    ).get(userId);

    expect(onboardingState).toBeDefined();
    const responses = JSON.parse(onboardingState.responses);
    expect(responses.name).toBe('Kyle Reese');

    // Step 3: Verify name saved to user_settings
    const userSettings = db.prepare(
      'SELECT * FROM user_settings WHERE user_id = ?'
    ).get(userId);

    expect(userSettings).toBeDefined();
    expect(userSettings.display_name).toBe('Kyle Reese');

    // Step 4: Fetch via user settings API
    const settingsResponse = await request(server)
      .get(`/api/user-settings/${userId}`);

    expect(settingsResponse.status).toBe(200);
    expect(settingsResponse.body.success).toBe(true);
    expect(settingsResponse.body.data.display_name).toBe('Kyle Reese');

    // Step 5: Verify AuthorDisplayName would render correctly
    // (This is tested in Playwright E2E tests)
  });
});
```

---

### 4.4 E2E Tests (Playwright)

#### Test Suite 5: Processing Pill Visual Feedback

**File**: `tests/playwright/processing-pill-top-level.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Processing Pill - Top-Level Comments', () => {
  test('should show processing pill when submitting top-level comment', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-item"]');

    // Click "Add Comment" button on first post
    await page.click('button:has-text("Add Comment")');

    // Fill comment form
    await page.fill('[data-testid="comment-input"]', 'Test comment');

    // Submit comment
    await page.click('button:has-text("Add Comment")');

    // Processing pill should appear
    const processingPill = page.locator('text=Adding Comment...');
    await expect(processingPill).toBeVisible({ timeout: 500 });

    // Spinner should be visible
    const spinner = page.locator('[data-testid="processing-spinner"]');
    await expect(spinner).toBeVisible();

    // Button should be disabled
    const addButton = page.locator('button:has-text("Add Comment")');
    await expect(addButton).toBeDisabled();

    // Processing pill should disappear after API response
    await expect(processingPill).not.toBeVisible({ timeout: 5000 });

    // Comment should appear in thread
    await expect(page.locator('text=Test comment')).toBeVisible();
  });

  test('should handle rapid clicking without duplicates', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="post-item"]');

    const addButton = page.locator('button:has-text("Add Comment")').first();

    // Rapid fire 5 clicks
    await addButton.click();
    await addButton.click();
    await addButton.click();
    await addButton.click();
    await addButton.click();

    // Only one comment should be created
    await page.waitForTimeout(3000); // Wait for all potential API calls

    const comments = page.locator('[data-testid="comment-item"]');
    const count = await comments.count();

    expect(count).toBe(1);
  });
});
```

---

#### Test Suite 6: Display Name Visual Verification

**File**: `tests/playwright/display-name-onboarding.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Display Name - Onboarding to UI', () => {
  test('should show user name after onboarding completion', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Assume onboarding modal appears for new user
    await page.waitForSelector('[data-testid="onboarding-modal"]');

    // Enter name
    const nameInput = page.locator('input[placeholder*="name"]');
    await nameInput.fill('John Connor');

    // Submit name
    await page.click('button:has-text("Continue")');

    // Wait for onboarding to process
    await page.waitForTimeout(1000);

    // Verify name appears in header (or wherever AuthorDisplayName is used)
    const displayName = page.locator('[data-testid="user-display-name"]');
    await expect(displayName).toHaveText('John Connor', { timeout: 5000 });

    // Verify NOT showing "User" fallback
    await expect(page.locator('text=User')).not.toBeVisible();
  });

  test('should persist name across page refresh', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Complete onboarding (assume helper function)
    await completeOnboarding(page, 'Sarah Connor');

    // Verify name shows
    await expect(page.locator('[data-testid="user-display-name"]')).toHaveText('Sarah Connor');

    // Refresh page
    await page.reload();

    // Name should still show (not "User")
    await expect(page.locator('[data-testid="user-display-name"]')).toHaveText('Sarah Connor');
  });

  test('should show name in comment author display', async ({ page }) => {
    await page.goto('http://localhost:5173');

    await completeOnboarding(page, 'Kyle Reese');

    // Create a comment
    await page.click('button:has-text("Add Comment")');
    await page.fill('[data-testid="comment-input"]', 'Test comment');
    await page.click('button:has-text("Submit")');

    // Wait for comment to appear
    await page.waitForSelector('text=Test comment');

    // Verify author name shows as "Kyle Reese" not "User"
    const authorName = page.locator('[data-testid="comment-author"]').first();
    await expect(authorName).toHaveText('Kyle Reese');
  });
});
```

---

## C - COMPLETION (Integration & Testing Plan)

### 5.1 Implementation Checklist

#### Phase 1: Processing Pills Fix

- [ ] **Task 1.1**: Change `processingComments` state from `Set<string>` to `Map<string, string>`
  - File: `frontend/src/components/RealSocialMediaFeed.tsx`
  - Line: ~58 (state declaration)
  - Code:
    ```typescript
    const [processingComments, setProcessingComments] = useState<Map<string, string>>(new Map());
    ```

- [ ] **Task 1.2**: Update `handleAddComment` to use Map instead of Set
  - File: `frontend/src/components/RealSocialMediaFeed.tsx`
  - Lines: ~697-750
  - Changes:
    - Line 703: `prev => { const next = new Map(prev); next.set(postId, tempCommentId); return next; }`
    - Line 737: `prev => { const next = new Map(prev); next.delete(postId); return next; }`
    - Line 750: Same as line 737

- [ ] **Task 1.3**: Update button disabled check
  - File: `frontend/src/components/RealSocialMediaFeed.tsx`
  - Line: ~1457
  - Change: `disabled={processingComments.has(post.id)}`

- [ ] **Task 1.4**: Update button text conditional
  - File: `frontend/src/components/RealSocialMediaFeed.tsx`
  - Lines: ~1460-1467
  - Change: `{processingComments.has(post.id) ? (...) : (...)}`

- [ ] **Task 1.5**: Update processing pill conditional
  - File: `frontend/src/components/RealSocialMediaFeed.tsx`
  - Line: ~1476
  - Change: `{processingComments.has(post.id) && (...)}`

---

#### Phase 2: Display Name Fix (Verification)

- [ ] **Task 2.1**: Verify `setDisplayName` is called in `processNameResponse`
  - File: `api-server/services/onboarding/onboarding-flow-service.js`
  - Line: ~262
  - Code: `this.userSettingsService.setDisplayName(userId, validatedName);`
  - Status: ✅ Already implemented (verify it's working)

- [ ] **Task 2.2**: Add logging to confirm display name save
  - File: `api-server/services/onboarding/onboarding-flow-service.js`
  - Line: ~263 (after setDisplayName call)
  - Add:
    ```javascript
    console.log(`[DISPLAY_NAME_DEBUG] Saved display name: "${validatedName}" for user: ${userId}`);
    ```

- [ ] **Task 2.3**: Verify `getUserSettings` returns correct display name
  - File: `api-server/services/user-settings-service.js`
  - Line: ~69-86
  - Add logging:
    ```javascript
    const settings = this.getSettingsStmt.get(userId);
    console.log(`[DISPLAY_NAME_DEBUG] Retrieved settings:`, settings);
    ```

- [ ] **Task 2.4**: Add cache invalidation after onboarding submission
  - File: `frontend/src/components/EnhancedPostingInterface.tsx`
  - After successful onboarding response:
    ```typescript
    import { clearUserSettingsCache } from '../hooks/useUserSettings';

    // After onboarding success
    clearUserSettingsCache(userId);
    ```

- [ ] **Task 2.5**: Force AuthorDisplayName re-render after cache clear
  - File: `frontend/src/hooks/useUserSettings.ts`
  - Verify `useEffect` triggers on cache clear (already implemented)

---

#### Phase 3: Unit Tests

- [ ] **Task 3.1**: Write unit tests for Map-based processing state
  - File: `frontend/src/components/__tests__/RealSocialMediaFeed.processingPills.test.tsx`
  - Tests: 6 tests as specified in section 4.2

- [ ] **Task 3.2**: Write unit tests for display name persistence
  - File: `api-server/tests/integration/onboarding-display-name.test.js`
  - Tests: 6 tests as specified in section 4.2

- [ ] **Task 3.3**: Write unit tests for useUserSettings hook
  - File: `frontend/src/hooks/__tests__/useUserSettings.test.tsx`
  - Tests: 6 tests as specified in section 4.2

---

#### Phase 4: Integration Tests

- [ ] **Task 4.1**: Write E2E integration test (onboarding → display)
  - File: `tests/integration/onboarding-to-display-e2e.test.js`
  - Test: Full flow as specified in section 4.3

---

#### Phase 5: E2E Tests (Playwright)

- [ ] **Task 5.1**: Write Playwright test for processing pill
  - File: `tests/playwright/processing-pill-top-level.spec.ts`
  - Tests: 2 tests as specified in section 4.4

- [ ] **Task 5.2**: Write Playwright test for display name
  - File: `tests/playwright/display-name-onboarding.spec.ts`
  - Tests: 3 tests as specified in section 4.4

---

#### Phase 6: Manual Testing

- [ ] **Task 6.1**: Manual test - Processing pill appears on top-level comment
  - Steps:
    1. Start dev server
    2. Open browser
    3. Click "Add Comment" on any post
    4. Verify processing pill appears
    5. Verify button disabled
    6. Wait for comment to appear
    7. Verify processing pill disappears

- [ ] **Task 6.2**: Manual test - Rapid clicking prevention
  - Steps:
    1. Click "Add Comment" 10 times rapidly
    2. Verify only 1 comment created
    3. Verify no duplicate pills

- [ ] **Task 6.3**: Manual test - Display name after onboarding
  - Steps:
    1. Clear database (fresh user)
    2. Complete onboarding with name "Test User"
    3. Verify header shows "Test User" not "User"
    4. Create a comment
    5. Verify comment author shows "Test User"
    6. Refresh page
    7. Verify name still shows "Test User"

- [ ] **Task 6.4**: Manual test - XSS prevention
  - Steps:
    1. Enter name: `<script>alert('xss')</script>`
    2. Complete onboarding
    3. Verify name displayed as escaped HTML entities
    4. Verify no JavaScript execution

---

### 5.2 Testing Strategy

#### 5.2.1 Test Pyramid

```
       ┌──────────────────┐
       │   E2E Tests (5)  │  ← Playwright (Browser automation)
       │  Visual feedback │
       └──────────────────┘
             ▲
             │
      ┌──────────────────────┐
      │ Integration Tests (2)│  ← API + DB + Service layer
      │   Full flow tests    │
      └──────────────────────┘
             ▲
             │
   ┌───────────────────────────┐
   │   Unit Tests (18)         │  ← Component + Service + Hook
   │ Fast, isolated, focused   │
   └───────────────────────────┘
```

**Total Test Count**: 25 automated tests + 4 manual test scenarios

---

#### 5.2.2 Test Execution Order

**Step 1: Unit Tests** (Run first, fastest feedback)
```bash
# Frontend unit tests
npm run test -- RealSocialMediaFeed.processingPills.test.tsx
npm run test -- useUserSettings.test.tsx

# Backend unit tests
npm test -- onboarding-display-name.test.js
```

**Step 2: Integration Tests** (Run after unit tests pass)
```bash
npm test -- onboarding-to-display-e2e.test.js
```

**Step 3: E2E Tests** (Run after integration tests pass)
```bash
npx playwright test processing-pill-top-level.spec.ts
npx playwright test display-name-onboarding.spec.ts
```

**Step 4: Manual Testing** (Run after all automated tests pass)
- Follow manual test checklist (Task 6.1-6.4)

---

### 5.3 Rollback Plan

If fixes cause regressions:

#### Rollback Step 1: Revert Processing Pills Fix

```bash
# Revert file to previous commit
git checkout HEAD~1 -- frontend/src/components/RealSocialMediaFeed.tsx

# Or manually revert:
# - Change Map<string, string> back to Set<string>
# - Change map.has(postId) back to set.size > 0
# - Change map.set/delete back to set.add/delete
```

#### Rollback Step 2: Revert Display Name Fix

```bash
# If display name fix causes issues, comment out line 262:
# File: api-server/services/onboarding/onboarding-flow-service.js
# Line: 262
# Comment: // this.userSettingsService.setDisplayName(userId, validatedName);
```

---

### 5.4 Deployment Plan

#### Pre-Deployment Checklist

- [ ] All 25 automated tests pass
- [ ] All 4 manual tests pass
- [ ] Code review approved by 1+ team members
- [ ] Performance profiling shows no regressions (<50ms state updates)
- [ ] Security audit confirms XSS prevention works
- [ ] Database migration verified (user_settings table exists)

#### Deployment Steps

1. **Stage 1: Backend Deployment**
   - Deploy `onboarding-flow-service.js` changes
   - Verify display name saves to `user_settings` via logs
   - Monitor error rates (should be 0%)

2. **Stage 2: Frontend Deployment**
   - Deploy `RealSocialMediaFeed.tsx` changes
   - Deploy `useUserSettings.ts` cache invalidation
   - Monitor processing pill render times (<100ms)

3. **Stage 3: Smoke Testing**
   - Test onboarding flow end-to-end in production
   - Test comment creation with processing pill
   - Verify no console errors

4. **Stage 4: User Acceptance**
   - Monitor user feedback for 24 hours
   - Track metrics:
     - Processing pill display rate: >99%
     - Display name accuracy: >99%
     - Duplicate comment rate: <0.1%

---

### 5.5 Success Criteria

#### Definition of Done

- ✅ All 25 automated tests pass
- ✅ All 4 manual tests pass
- ✅ Code coverage >80% for modified files
- ✅ No new ESLint warnings
- ✅ No TypeScript errors
- ✅ Performance metrics met (section 1.2)
- ✅ Security audit passed (XSS prevention)
- ✅ Documentation updated (this spec)
- ✅ User acceptance testing passed

#### Acceptance Criteria Summary

**Processing Pills**:
- Users see "Adding Comment..." pill immediately when clicking "Add Comment"
- Pill disappears after successful comment creation (2-3 seconds typical)
- Rapid clicking does not create duplicate comments
- Multiple posts can be commented on independently

**Display Name**:
- Name entered in onboarding displays in header, posts, and comments
- Name persists across page refreshes and browser sessions
- XSS attacks prevented via HTML entity escaping
- Fallback to "User" only when display_name is NULL

---

## 6. Appendix

### 6.1 Glossary

- **Processing Pill**: Visual indicator showing that an asynchronous operation (e.g., API request) is in progress
- **Top-Level Comment**: A comment directly on a post (not a reply to another comment)
- **Temp Comment ID**: Temporary unique identifier for a comment being created, used to track processing state
- **Display Name**: User's preferred name shown throughout the UI (e.g., "John Connor" instead of "user-123")
- **Onboarding State**: Database record tracking user's progress through onboarding phases
- **User Settings**: Database record storing user preferences including display name
- **Cache TTL**: Time-To-Live, how long cached data is considered valid (60 seconds for user settings)
- **XSS**: Cross-Site Scripting, security vulnerability where malicious scripts are injected into trusted websites

---

### 6.2 Related Documents

- `/docs/ONBOARDING-FLOW-SPEC.md` - Complete onboarding system specification
- `/docs/SPARC-USERNAME-COLLECTION.md` - Original username collection spec
- `/api-server/db/migrations/010-user-settings.sql` - User settings table migration
- `/tests/README-ONBOARDING-TESTS.md` - Onboarding test suite documentation

---

### 6.3 Change Log

| Version | Date       | Author | Changes                                      |
|---------|------------|--------|----------------------------------------------|
| 1.0.0   | 2025-11-19 | Claude | Initial SPARC specification                  |

---

**End of Specification Document**

*Generated using SPARC methodology for Agent Feed project*
