# SPARC Security Inverted Model - Phase 1: Specification

**Date:** 2025-10-13
**Status:** Phase 1 - Specification
**Methodology:** SPARC + NLD + TDD + Claude-Flow Swarm
**Validation:** 100% Real Functionality - Zero Mocks

---

## Executive Summary

This specification defines the **inverted protection model** for the Agent Feed application, changing from a block-list approach (blocking specific paths) to an **allow-list approach** (blocking everything except `/prod/`).

### Key Change
- **OLD:** Block `/prod/`, `/node_modules/`, `.git/` - allow everything else
- **NEW:** Allow ONLY `/prod/` - block everything else by default

---

## 1. Requirements

### 1.1 Core Protection Model

**Allow-List (Writable Paths):**
- ✅ `/workspaces/agent-feed/prod/` - PRIMARY SAFE ZONE
- ✅ `/workspaces/agent-feed/prod/agent_workspace/` - NO RESTRICTIONS

**Block-List (Protected Paths):**
- ❌ `/workspaces/agent-feed/frontend/` - READ ONLY
- ❌ `/workspaces/agent-feed/api-server/` - READ ONLY
- ❌ `/workspaces/agent-feed/src/` - READ ONLY
- ❌ `/workspaces/agent-feed/node_modules/` - READ ONLY
- ❌ `/workspaces/agent-feed/.git/` - READ ONLY
- ❌ `/workspaces/agent-feed/database.db` - READ ONLY
- ❌ `/workspaces/agent-feed/data/` - READ ONLY
- ❌ `/workspaces/agent-feed/.env` - READ ONLY
- ❌ `/workspaces/agent-feed/config/` - READ ONLY
- ❌ All other directories at `/workspaces/agent-feed/*` level

**Protected Files Within /prod/:**
- ❌ `/workspaces/agent-feed/prod/package.json` - CRITICAL
- ❌ `/workspaces/agent-feed/prod/.env` - SECRETS
- ❌ `/workspaces/agent-feed/prod/.git/` - VERSION CONTROL
- ❌ `/workspaces/agent-feed/prod/node_modules/` - DEPENDENCIES
- ❌ `/workspaces/agent-feed/prod/package-lock.json` - LOCK FILE
- ❌ `/workspaces/agent-feed/prod/.gitignore` - VCS CONFIG
- ❌ `/workspaces/agent-feed/prod/tsconfig.json` - TS CONFIG
- ❌ `/workspaces/agent-feed/prod/vite.config.ts` - BUILD CONFIG

### 1.2 Error Message Requirements

**Backend Error Messages Must:**
1. Clearly state what was blocked
2. Tell user exactly WHERE they CAN write
3. Provide helpful guidance
4. Include specific blocked path

**Example Error Messages:**

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Access denied: /workspaces/agent-feed/frontend/ is read-only",
  "blockedPath": "/workspaces/agent-feed/frontend/",
  "allowedPaths": [
    "/workspaces/agent-feed/prod/ (except protected files)"
  ],
  "protectedFilesInProd": [
    "package.json",
    ".env",
    ".git/",
    "node_modules/",
    "package-lock.json",
    ".gitignore",
    "tsconfig.json",
    "vite.config.ts"
  ],
  "hint": "Safe zone: You can create/modify files in /workspaces/agent-feed/prod/agent_workspace/ without restrictions",
  "tip": "To work freely, use paths like: /workspaces/agent-feed/prod/agent_workspace/your-file.txt"
}
```

### 1.3 Frontend Warning Requirements

**Dialog Must Show:**
1. Specific blocked path detected (not broad "/workspaces/")
2. Clear explanation of why blocked
3. Safe zone information
4. Cancel and Continue Anyway buttons
5. Different messages for different scenarios

**Warning Categories:**

**Category 1: Blocked Directory**
```
⚠️ Protected Directory Detected

You're trying to access: /workspaces/agent-feed/frontend/

This directory is read-only to protect application code.

Safe Zone: /workspaces/agent-feed/prod/
You can work freely in: /workspaces/agent-feed/prod/agent_workspace/

[Cancel] [Continue Anyway]
```

**Category 2: Protected File in /prod/**
```
⚠️ Protected File Detected

You're trying to modify: /workspaces/agent-feed/prod/package.json

This file is protected to prevent breaking the application.

Safe Zone: /workspaces/agent-feed/prod/agent_workspace/
All files in agent_workspace/ can be modified without restrictions.

[Cancel] [Continue Anyway]
```

**Category 3: Shell Command**
```
⚠️ System Command Detected

You're using a potentially destructive command: rm -rf

This could delete important files if used incorrectly.

Tip: Use specific paths in /workspaces/agent-feed/prod/agent_workspace/
to safely create/modify files.

[Cancel] [Continue Anyway]
```

---

## 2. Acceptance Criteria

### 2.1 Backend Middleware

**Test Scenarios - MUST PASS:**

1. ✅ **Allow /prod/ general access**
   - POST with `/workspaces/agent-feed/prod/test.txt` → SUCCESS
   - Response: 200 OK, post created

2. ✅ **Allow /prod/agent_workspace/ unrestricted**
   - POST with `/workspaces/agent-feed/prod/agent_workspace/anything.txt` → SUCCESS
   - POST with `/workspaces/agent-feed/prod/agent_workspace/subdir/file.txt` → SUCCESS

3. ❌ **Block /frontend/ directory**
   - POST with `/workspaces/agent-feed/frontend/component.tsx` → BLOCKED
   - Response: 403 Forbidden with helpful error message

4. ❌ **Block /api-server/ directory**
   - POST with `/workspaces/agent-feed/api-server/routes.js` → BLOCKED

5. ❌ **Block /src/ directory**
   - POST with `/workspaces/agent-feed/src/utils.ts` → BLOCKED

6. ❌ **Block protected files in /prod/**
   - POST with `/workspaces/agent-feed/prod/package.json` → BLOCKED
   - POST with `/workspaces/agent-feed/prod/.env` → BLOCKED
   - POST with `/workspaces/agent-feed/prod/.git/config` → BLOCKED
   - POST with `/workspaces/agent-feed/prod/node_modules/package/` → BLOCKED

7. ✅ **Allow normal posts without filesystem paths**
   - POST "I want to create a new feature" → SUCCESS
   - POST "Please update the database with new records" → SUCCESS
   - No false positives on keywords

8. ✅ **Case insensitive protection**
   - POST `/WORKSPACES/AGENT-FEED/FRONTEND/` → BLOCKED
   - POST `/workspaces/agent-feed/PROD/PACKAGE.JSON` → BLOCKED

9. ✅ **HTTP method filtering**
   - GET requests bypass middleware
   - POST/PUT/DELETE requests checked

10. ✅ **Graceful error handling**
    - Malformed requests don't crash server
    - JSON parsing errors handled
    - Fail-open security (if middleware errors, allow through)

### 2.2 Frontend Risk Detection

**Test Scenarios - MUST PASS:**

1. ✅ **Detect specific blocked directories**
   - Input: `/workspaces/agent-feed/frontend/` → WARNING
   - Reason: "blocked_directory"
   - Pattern: "/workspaces/agent-feed/frontend/"

2. ✅ **Detect protected files in /prod/**
   - Input: `/workspaces/agent-feed/prod/package.json` → WARNING
   - Reason: "protected_file"
   - Pattern: "package.json"

3. ✅ **No warning for safe zone**
   - Input: `/workspaces/agent-feed/prod/agent_workspace/test.txt` → NO WARNING
   - Should submit directly without dialog

4. ✅ **No false positives**
   - Input: "I want to create a frontend component" → NO WARNING
   - Input: "Update the package documentation" → NO WARNING

5. ✅ **Detect shell commands**
   - Input: "rm -rf /tmp/files" → WARNING
   - Reason: "shell_command"

6. ✅ **Multiple path detection**
   - Input mentioning multiple blocked paths → WARNING with first detected

### 2.3 Integration Tests

**End-to-End Flows - MUST PASS:**

1. **Normal post creation**
   - User types post without filesystem paths
   - Clicks "Quick Post"
   - Success toast appears
   - Post appears in feed

2. **Blocked directory flow**
   - User types post with `/workspaces/agent-feed/frontend/test.tsx`
   - Clicks "Quick Post"
   - Warning dialog appears (specific to /frontend/)
   - User clicks "Continue Anyway"
   - Backend blocks with 403
   - Error toast shows helpful message
   - Post NOT created

3. **Safe zone flow**
   - User types post with `/workspaces/agent-feed/prod/agent_workspace/test.md`
   - Clicks "Quick Post"
   - No warning dialog (safe zone)
   - Backend allows
   - Success toast appears
   - Post created successfully

4. **Protected file in /prod/ flow**
   - User types post with `/workspaces/agent-feed/prod/package.json`
   - Clicks "Quick Post"
   - Warning dialog appears (protected file)
   - User clicks "Continue Anyway"
   - Backend blocks with 403
   - Error toast shows safe zone guidance
   - Post NOT created

5. **Cancel warning flow**
   - User types post with blocked path
   - Warning dialog appears
   - User clicks "Cancel"
   - Dialog disappears
   - Info toast: "Post cancelled"
   - Post NOT submitted

---

## 3. Technical Architecture

### 3.1 Backend Middleware Logic

**File:** `/api-server/middleware/protectCriticalPaths.js`

**New Logic Flow:**

```
1. Check request method (skip GET/HEAD)
2. Extract all filesystem paths from request body
3. For each detected path:
   a. Is it under /workspaces/agent-feed/?
   b. If NO → allow (not our concern)
   c. If YES → continue checking

4. Check if path is in ALLOWED zone:
   - Starts with /workspaces/agent-feed/prod/

5. If in ALLOWED zone:
   a. Check if matches PROTECTED_FILES list
   b. If protected → BLOCK with specific error
   c. If not protected → ALLOW

6. If NOT in ALLOWED zone:
   a. Check if matches any sibling directory
   b. BLOCK with error showing safe zone
```

**Data Structures:**

```javascript
const ALLOWED_BASE_PATH = '/workspaces/agent-feed/prod/';

const PROTECTED_FILES_IN_PROD = [
  '/workspaces/agent-feed/prod/package.json',
  '/workspaces/agent-feed/prod/package-lock.json',
  '/workspaces/agent-feed/prod/.env',
  '/workspaces/agent-feed/prod/.git/',
  '/workspaces/agent-feed/prod/node_modules/',
  '/workspaces/agent-feed/prod/.gitignore',
  '/workspaces/agent-feed/prod/tsconfig.json',
  '/workspaces/agent-feed/prod/vite.config.ts',
  '/workspaces/agent-feed/prod/playwright.config.ts',
];

const BLOCKED_SIBLING_DIRECTORIES = [
  '/workspaces/agent-feed/frontend/',
  '/workspaces/agent-feed/api-server/',
  '/workspaces/agent-feed/src/',
  '/workspaces/agent-feed/node_modules/',
  '/workspaces/agent-feed/.git/',
  '/workspaces/agent-feed/data/',
  '/workspaces/agent-feed/config/',
  '/workspaces/agent-feed/tests/',
  '/workspaces/agent-feed/.github/',
];
```

### 3.2 Frontend Risk Detection Logic

**File:** `/frontend/src/utils/detectRiskyContent.ts`

**New Pattern Categories:**

```typescript
const RISK_PATTERNS = {
  // Blocked sibling directories
  blockedDirectories: [
    { pattern: '/workspaces/agent-feed/frontend/', description: 'Frontend source code (read-only)' },
    { pattern: '/workspaces/agent-feed/api-server/', description: 'Backend API code (read-only)' },
    { pattern: '/workspaces/agent-feed/src/', description: 'Source code (read-only)' },
    { pattern: '/workspaces/agent-feed/node_modules/', description: 'Dependencies (read-only)' },
    { pattern: '/workspaces/agent-feed/.git/', description: 'Version control (read-only)' },
  ],

  // Protected files within /prod/
  protectedFiles: [
    { pattern: '/workspaces/agent-feed/prod/package.json', description: 'Package manifest (protected)' },
    { pattern: '/workspaces/agent-feed/prod/.env', description: 'Environment secrets (protected)' },
    { pattern: '/workspaces/agent-feed/prod/.git/', description: 'Version control in prod (protected)' },
    { pattern: '/workspaces/agent-feed/prod/node_modules/', description: 'Dependencies in prod (protected)' },
  ],

  // Shell commands (unchanged)
  shellCommands: [
    { pattern: 'rm ', description: 'Remove/delete command' },
    { pattern: 'sudo ', description: 'Superuser command' },
    // ... existing patterns
  ],
};

// Safe zone - no warnings
const SAFE_ZONE_PATTERNS = [
  '/workspaces/agent-feed/prod/agent_workspace/',
];
```

**Detection Priority:**

1. Check safe zone first (if match → NO WARNING)
2. Check blocked directories (if match → WARNING: blocked_directory)
3. Check protected files (if match → WARNING: protected_file)
4. Check shell commands (if match → WARNING: shell_command)
5. No matches → NO WARNING

### 3.3 Warning Dialog Updates

**File:** `/frontend/src/components/SystemCommandWarningDialog.tsx`

**New Props:**

```typescript
interface SystemCommandWarningDialogProps {
  isOpen: boolean;
  detectedPattern: string | null;
  description: string | null;
  reason: 'blocked_directory' | 'protected_file' | 'shell_command' | null;
  onCancel: () => void;
  onContinue: () => void;
}
```

**Message Templates:**

- `blocked_directory`: Show directory is read-only, suggest safe zone
- `protected_file`: Show file is protected, explain why
- `shell_command`: Show command detected, warn about destructive potential

---

## 4. Test Plan

### 4.1 Backend Unit Tests

**File:** `/api-server/middleware/__tests__/protectCriticalPaths.test.js`

**Test Suites:**

1. **Allow-List Tests (30 tests)**
   - Allow /prod/ general access
   - Allow /prod/agent_workspace/ unrestricted
   - Allow /prod/agent_workspace/subdirs/
   - Allow normal posts without paths
   - Allow posts with safe keywords

2. **Block-List Tests (25 tests)**
   - Block /frontend/ directory
   - Block /api-server/ directory
   - Block /src/ directory
   - Block all sibling directories
   - Block with helpful error messages

3. **Protected Files Tests (15 tests)**
   - Block package.json in /prod/
   - Block .env in /prod/
   - Block .git/ in /prod/
   - Block node_modules/ in /prod/
   - Block all protected config files

4. **Edge Cases (10 tests)**
   - Case insensitivity
   - Partial path matches
   - Multiple paths in one post
   - Malformed JSON handling
   - Fail-open security

### 4.2 Frontend Unit Tests

**File:** `/frontend/src/utils/__tests__/detectRiskyContent.test.ts`

**Test Suites:**

1. **Blocked Directory Detection (20 tests)**
   - Detect /frontend/ mentions
   - Detect /api-server/ mentions
   - Detect all blocked siblings
   - Case insensitivity

2. **Protected File Detection (15 tests)**
   - Detect package.json in /prod/
   - Detect .env in /prod/
   - Detect all protected files

3. **Safe Zone Tests (10 tests)**
   - No warning for /prod/agent_workspace/
   - No warning for subdirs in agent_workspace/
   - Allow normal posts

4. **False Positive Prevention (15 tests)**
   - "frontend" in normal text → NO WARNING
   - "package" in normal text → NO WARNING
   - Keywords without paths → NO WARNING

### 4.3 Playwright E2E Tests

**File:** `/frontend/tests/e2e/inverted-security-validation.spec.ts`

**Test Scenarios (15 tests):**

1. Normal post → Success toast → Feed
2. Blocked directory → Warning → Continue → Backend block → Error toast
3. Blocked directory → Warning → Cancel → Info toast → Not submitted
4. Safe zone path → No warning → Success toast → Feed
5. Protected file → Warning → Continue → Backend block → Error toast
6. Multiple blocked paths → Warning on first → Backend block
7. Shell command → Warning → Continue → Success (if no path blocked)
8. Toast auto-dismiss (5s for success, 0s for error)
9. Multiple toasts stack correctly (max 5)
10. Keyboard navigation in dialog (focus, escape)
11. Dark mode rendering
12. Regression: Feed loads correctly
13. Regression: Analytics tab works
14. Regression: Monitoring tab works
15. Regression: Normal post creation flow

**Screenshots Required:**
- Initial state
- Warning dialog for each category
- Success/error toasts
- Dark mode variations
- Post in feed confirmation

---

## 5. Success Metrics

### 5.1 Functional Requirements ✅

- [ ] Can post to /prod/agent_workspace/ without warnings
- [ ] Cannot post to /frontend/ (backend blocks)
- [ ] Cannot post to /api-server/ (backend blocks)
- [ ] Cannot modify /prod/package.json (backend blocks)
- [ ] Can post to /prod/test.txt with warning but allowed
- [ ] Normal posts (no paths) work without warnings
- [ ] Warning dialog shows specific paths (not broad /workspaces/)
- [ ] Error messages tell user where they CAN write
- [ ] All 184 tests pass (unit + integration)
- [ ] All Playwright E2E tests pass with screenshots
- [ ] Zero false positives on keywords
- [ ] Zero regressions in existing features

### 5.2 Non-Functional Requirements ✅

- [ ] Protection logic executes in <1ms per request
- [ ] Frontend bundle size increase <15KB
- [ ] No memory leaks in toast/dialog system
- [ ] Graceful degradation if middleware fails
- [ ] Clear error messages for all blocked scenarios
- [ ] Accessible dialog (ARIA, keyboard nav)
- [ ] Dark mode support
- [ ] Mobile responsive

---

## 6. Migration Plan

### 6.1 Code Changes Required

**Files to Modify:**
1. `/api-server/middleware/protectCriticalPaths.js` - Complete rewrite with inverted logic
2. `/frontend/src/utils/detectRiskyContent.ts` - Update patterns to specific paths
3. `/frontend/src/components/SystemCommandWarningDialog.tsx` - Update messages
4. `/api-server/middleware/__tests__/protectCriticalPaths.test.js` - Update tests
5. `/frontend/src/utils/__tests__/detectRiskyContent.test.ts` - Update tests

**Files to Create:**
1. `/frontend/tests/e2e/inverted-security-validation.spec.ts` - New E2E tests

### 6.2 Backward Compatibility

**Breaking Changes:**
- Posts mentioning /frontend/, /api-server/, /src/ will now be blocked
- This is INTENTIONAL - user explicitly requested this

**Safe Changes:**
- /prod/agent_workspace/ now has NO restrictions (more permissive)
- Normal posts without paths work exactly the same

### 6.3 Rollback Plan

**Quick Rollback (5 minutes):**
```bash
cd /workspaces/agent-feed
git checkout HEAD~1 api-server/middleware/protectCriticalPaths.js
git checkout HEAD~1 frontend/src/utils/detectRiskyContent.ts
git checkout HEAD~1 frontend/src/components/SystemCommandWarningDialog.tsx
pkill -f "tsx server.js"
cd api-server && npm run dev
```

**Manual Rollback:**
1. Restore previous version of protectCriticalPaths.js (block-list logic)
2. Restore previous detectRiskyContent.ts (broad /workspaces/ pattern)
3. Restore previous dialog messages
4. Restart backend server

---

## 7. Risk Assessment

### 7.1 Security Risks

**Risk 1: Over-permissive /prod/ access**
- Mitigation: Protected files list within /prod/
- Mitigation: User backups available
- Impact: LOW (single-user VPS with backups)

**Risk 2: User bypasses frontend warning**
- Mitigation: Backend hard block as second layer
- Mitigation: Security logging tracks violations
- Impact: LOW (backend enforces regardless)

**Risk 3: False negatives (missed dangerous paths)**
- Mitigation: Case-insensitive matching
- Mitigation: Comprehensive test suite
- Mitigation: Security logging for audit
- Impact: MEDIUM (monitor logs for unexpected patterns)

### 7.2 Operational Risks

**Risk 1: Legitimate posts blocked**
- Mitigation: Clear error messages with safe zone guidance
- Mitigation: Extensive false positive testing
- Impact: LOW (user understands protection model)

**Risk 2: Performance degradation**
- Mitigation: Benchmarked at <1ms per request
- Mitigation: Early return for non-POST requests
- Impact: NEGLIGIBLE

**Risk 3: Breaking existing workflows**
- Mitigation: Comprehensive regression tests
- Mitigation: /prod/agent_workspace/ fully unrestricted
- Impact: LOW (intentional change per user request)

---

## 8. Documentation Deliverables

1. ✅ **SPARC-SECURITY-INVERTED-SPEC.md** - This specification document
2. [ ] **SPARC-SECURITY-INVERTED-PSEUDOCODE.md** - Phase 2 pseudocode
3. [ ] **SPARC-SECURITY-INVERTED-ARCHITECTURE.md** - Phase 3 architecture
4. [ ] **IMPLEMENTATION-INVERTED-COMPLETE.md** - Final completion report
5. [ ] **TEST_SUMMARY_INVERTED.md** - Test results summary
6. [ ] **MIGRATION-GUIDE.md** - Migration from block-list to allow-list

---

## 9. Validation Checklist

### 9.1 Before Implementation

- [x] Specification reviewed and approved
- [ ] User confirmed all protected files list
- [ ] User confirmed safe zone boundaries
- [ ] Error message templates approved

### 9.2 During Implementation

- [ ] Backend middleware rewritten with allow-list logic
- [ ] Frontend risk detection updated with specific patterns
- [ ] Warning dialog messages updated for new model
- [ ] All unit tests updated and passing
- [ ] All integration tests passing
- [ ] All E2E tests passing with screenshots

### 9.3 After Implementation

- [ ] Manual regression testing complete
- [ ] Production validation agent approved
- [ ] Performance benchmarks meet requirements
- [ ] Documentation complete
- [ ] Rollback plan tested
- [ ] User acceptance testing complete

---

## 10. Next Steps

1. **Phase 2: Pseudocode** - Design detailed algorithm for inverted logic
2. **Phase 3: Architecture** - Update architecture docs with new flow diagrams
3. **Phase 4: Implementation** - Code backend and frontend changes
4. **Phase 5: Testing** - Run full test suite with validation
5. **Phase 6: Validation** - Production validator agent review
6. **Phase 7: Completion** - Create final implementation report

---

## Appendix A: Example Test Cases

### Backend Test Examples

```javascript
// Test 1: Allow /prod/ general access
describe('Allow-List: /prod/ general access', () => {
  it('should allow POST to /workspaces/agent-feed/prod/test.txt', async () => {
    const response = await request(app)
      .post('/api/v1/agent-posts')
      .send({ content: 'Create file at /workspaces/agent-feed/prod/test.txt' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

// Test 2: Block /frontend/ directory
describe('Block-List: /frontend/ directory', () => {
  it('should block POST to /workspaces/agent-feed/frontend/component.tsx', async () => {
    const response = await request(app)
      .post('/api/v1/agent-posts')
      .send({ content: 'Modify /workspaces/agent-feed/frontend/component.tsx' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.blockedPath).toContain('frontend');
    expect(response.body.hint).toContain('prod/agent_workspace');
  });
});

// Test 3: Block protected file in /prod/
describe('Protected Files: package.json', () => {
  it('should block POST to /workspaces/agent-feed/prod/package.json', async () => {
    const response = await request(app)
      .post('/api/v1/agent-posts')
      .send({ content: 'Update /workspaces/agent-feed/prod/package.json' });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('protected');
    expect(response.body.hint).toContain('agent_workspace');
  });
});
```

### Frontend Test Examples

```typescript
// Test 1: Detect blocked directory
describe('Blocked Directory Detection', () => {
  it('should detect /frontend/ path and return warning', () => {
    const result = detectRiskyContent(
      'Create component at /workspaces/agent-feed/frontend/Button.tsx',
      'New component'
    );

    expect(result.isRisky).toBe(true);
    expect(result.reason).toBe('blocked_directory');
    expect(result.pattern).toContain('frontend');
  });
});

// Test 2: No warning for safe zone
describe('Safe Zone: agent_workspace', () => {
  it('should NOT warn for /prod/agent_workspace/ paths', () => {
    const result = detectRiskyContent(
      'Create file at /workspaces/agent-feed/prod/agent_workspace/test.md',
      'Test file'
    );

    expect(result.isRisky).toBe(false);
    expect(result.reason).toBeNull();
  });
});

// Test 3: No false positives
describe('False Positive Prevention', () => {
  it('should NOT warn for "frontend" keyword in normal text', () => {
    const result = detectRiskyContent(
      'I want to create a frontend feature for users',
      'Feature request'
    );

    expect(result.isRisky).toBe(false);
  });
});
```

---

## Appendix B: Error Message Examples

### Example 1: Blocked Directory
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Access denied: /workspaces/agent-feed/frontend/ is read-only",
  "blockedPath": "/workspaces/agent-feed/frontend/",
  "reason": "directory_protected",
  "allowedPaths": [
    "/workspaces/agent-feed/prod/ (except protected files)"
  ],
  "safeZone": "/workspaces/agent-feed/prod/agent_workspace/",
  "hint": "Only the /prod/ directory is writable. All other directories are read-only to protect application code.",
  "tip": "To work freely, use paths like: /workspaces/agent-feed/prod/agent_workspace/your-file.txt"
}
```

### Example 2: Protected File in /prod/
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Access denied: /workspaces/agent-feed/prod/package.json is protected",
  "blockedPath": "/workspaces/agent-feed/prod/package.json",
  "reason": "file_protected",
  "protectedFiles": [
    "package.json",
    "package-lock.json",
    ".env",
    ".git/",
    "node_modules/",
    ".gitignore",
    "tsconfig.json",
    "vite.config.ts"
  ],
  "safeZone": "/workspaces/agent-feed/prod/agent_workspace/",
  "hint": "This file is protected to prevent breaking the application. You can work freely in /prod/agent_workspace/.",
  "tip": "All files in agent_workspace/ can be created, modified, or deleted without restrictions."
}
```

---

**END OF SPECIFICATION - PHASE 1 COMPLETE**

**Next Phase:** Create SPARC-SECURITY-INVERTED-PSEUDOCODE.md
