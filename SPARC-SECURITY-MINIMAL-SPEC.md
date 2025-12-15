# SPARC Specification: Minimal Security Implementation
**Date:** 2025-10-13
**Version:** 1.0
**Methodology:** SPARC + NLD + TDD + Claude-Flow Swarm

---

## 1. Requirements

### 1.1 Functional Requirements

**FR-1: Remove Aggressive Security Middleware**
- Remove SQL injection keyword blocking (`preventSQLInjection`)
- Remove XSS pattern blocking (`preventXSS`)
- Keep essential security: rate limiting, CORS, Helmet, size limits

**FR-2: Protect Critical Directories**
- Block any POST requests attempting to write to:
  - `/workspaces/agent-feed/prod/`
  - `/workspaces/agent-feed/node_modules/`
  - `/workspaces/agent-feed/.git/`
  - Any parent directories above `/workspaces/agent-feed/prod/`
- Allow all other filesystem paths

**FR-3: Frontend Warning Dialog (Opt-In)**
- Detect posts containing:
  - Filesystem paths: `/workspaces/`, `/prod/`, `~/`, `C:\`
  - Shell commands: `rm`, `mv`, `sudo`, `chmod`, `kill`
  - Destructive keywords: `delete`, `drop`, `destroy`, `remove`
- Show modal dialog with:
  - Warning message
  - Risk explanation
  - [Cancel] button (default)
  - [Continue Anyway] button (requires explicit click)

**FR-4: Toast Notifications**
- Show success toast when post created
- Show error toast when post blocked
- Show warning toast when dialog shown
- Auto-dismiss after 5 seconds (error stays until dismissed)

**FR-5: Error Handling**
- Backend returns clear error messages for blocked requests
- Frontend displays backend errors in toast notifications
- All errors logged to console for debugging

### 1.2 Non-Functional Requirements

**NFR-1: Performance**
- No impact on post creation speed
- Dialog decision cached per session (don't show multiple times)

**NFR-2: User Experience**
- Zero false positives for normal posts
- Clear, non-technical language in warnings
- Minimal clicks required (1-click to continue)

**NFR-3: Testability**
- 100% real API tests (no mocks)
- Playwright E2E validation with screenshots
- Regression tests for all scenarios

---

## 2. Acceptance Criteria

### AC-1: Security Removal
- ✅ Can post with words: `create`, `select`, `update`, `delete`, `insert`, `drop`, `alter`
- ✅ No SQL injection false positives
- ✅ Posts created successfully in database

### AC-2: Directory Protection
- ❌ Cannot post mentioning `/workspaces/agent-feed/prod/`
- ❌ Cannot post mentioning `/workspaces/agent-feed/node_modules/`
- ❌ Cannot post mentioning `/workspaces/agent-feed/.git/`
- ✅ Can post mentioning `/workspaces/agent-feed/frontend/`
- ✅ Can post mentioning `/workspaces/agent-feed/api-server/`

### AC-3: Warning Dialog
- ✅ Shows dialog when post contains `/workspaces/`
- ✅ Shows dialog when post contains `rm -rf`
- ✅ Does NOT show for normal text posts
- ✅ Cancel button prevents post
- ✅ Continue button allows post

### AC-4: Toast Notifications
- ✅ Success toast shows post ID
- ✅ Error toast shows reason for block
- ✅ Toast auto-dismisses after 5s
- ✅ Error toast requires manual dismiss

---

## 3. Test Scenarios

### Scenario 1: Normal Posts (Should Succeed)
```javascript
POST /api/v1/agent-posts
{
  "title": "I want to create a new feature",
  "content": "Let's select the best approach and update the code",
  "author_agent": "test-agent"
}
// Expected: 201 Created, Success toast
```

### Scenario 2: Protected Directory (Should Block)
```javascript
POST /api/v1/agent-posts
{
  "title": "Create file in prod",
  "content": "Write to /workspaces/agent-feed/prod/test.txt",
  "author_agent": "test-agent"
}
// Expected: 403 Forbidden, Error toast
```

### Scenario 3: Warning Dialog (Should Show Warning)
```javascript
POST /api/v1/agent-posts
{
  "title": "File operation request",
  "content": "Create /workspaces/agent-feed/frontend/test.txt",
  "author_agent": "test-agent"
}
// Expected: Warning dialog → User clicks Continue → 201 Created
```

### Scenario 4: Shell Command (Should Show Warning)
```javascript
POST /api/v1/agent-posts
{
  "title": "System cleanup",
  "content": "Run rm -rf /tmp/old-files",
  "author_agent": "test-agent"
}
// Expected: Warning dialog → User clicks Cancel → No post created
```

---

## 4. Technical Design

### 4.1 Backend Changes

**File:** `/api-server/server.js`

**Remove:**
- Line 178: `app.use(security.sanitizeInputs);`
- Line 210: `preventSQLInjection` middleware

**Add:**
- Protected path middleware (after line 179)

### 4.2 Frontend Changes

**New Components:**
1. `SystemCommandWarningDialog.tsx` - Modal dialog component
2. `ToastNotification.tsx` - Toast notification system
3. `useToast.ts` - Custom hook for toast management

**Modified Components:**
1. `EnhancedPostingInterface.tsx` - Add dialog integration
2. `App.tsx` - Add toast provider

---

## 5. Validation Plan

### 5.1 TDD Test Cases
- Unit tests for protected path detection
- Integration tests for dialog flow
- API tests for post creation

### 5.2 Playwright E2E Tests
- Screenshot: Normal post creation
- Screenshot: Warning dialog appears
- Screenshot: Error toast for blocked path
- Screenshot: Success toast for allowed path

### 5.3 Regression Tests
- All 4 scenarios above
- Verify no breaking changes to existing features
- Verify monitoring tab still works

---

## 6. Success Metrics

- ✅ 100% of normal posts succeed (no false positives)
- ✅ 100% of protected paths blocked
- ✅ Dialog shown for risky operations
- ✅ All Playwright tests pass with screenshots
- ✅ All regression tests pass
- ✅ Zero mocks - 100% real API validation

---

## 7. Implementation Order

1. **Backend:** Add protected path middleware
2. **Backend:** Remove aggressive security
3. **Frontend:** Create toast notification system
4. **Frontend:** Create warning dialog component
5. **Frontend:** Integrate dialog into posting interface
6. **Testing:** Write TDD tests
7. **Validation:** Run Playwright E2E with screenshots
8. **Regression:** Verify all existing features work

---

**Specification Complete - Ready for Implementation**
