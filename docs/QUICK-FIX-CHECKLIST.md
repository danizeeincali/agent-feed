# Quick Fix Checklist - Post Order Validation Issues

**Date**: 2025-11-05
**Source**: Agent 3 E2E Validation

---

## TL;DR

API server is running on **port 3001** (not 3000) with endpoint **/api/agent-posts** (not /api/posts).
Posts exist but are in **reverse order**.

---

## Critical Fixes Required

### 1. Update Frontend API Configuration
**Priority**: HIGH
**Impact**: Frontend cannot fetch posts with current config

**Files to Update**:
```bash
# Find and update API endpoint references
grep -r "localhost:3000" frontend/src/
grep -r "/api/posts" frontend/src/
```

**Change**:
```javascript
// FROM:
const API_URL = 'http://localhost:3000/api/posts'

// TO:
const API_URL = 'http://localhost:3001/api/agent-posts'
```

**Response Format**:
```json
{
  "success": true,
  "data": [ /* array of posts */ ]
}
```

### 2. Update E2E Test Configuration
**Priority**: HIGH
**Impact**: Tests using wrong endpoint

**Files to Update**:
```bash
frontend/src/tests/e2e/global-setup.ts
frontend/playwright.config.ts
```

**Change**:
```typescript
// Update base URL and API endpoint
const API_URL = 'http://localhost:3001/api/agent-posts'
```

### 3. Fix Post Order
**Priority**: MEDIUM
**Impact**: Posts display in wrong sequence

**Current Order** (wrong):
1. 📚 How Agent Feed Works
2. Hi! Let's Get Started
3. Welcome to Agent Feed!

**Expected Order** (correct):
1. Welcome to Agent Feed!
2. Hi! Let's Get Started
3. 📚 How Agent Feed Works

**Solution Options**:

#### Option A: Add Priority Column (RECOMMENDED)
```sql
-- Add priority column to agent_posts table
ALTER TABLE agent_posts ADD COLUMN priority INTEGER DEFAULT 0;

-- Update priorities
UPDATE agent_posts
SET priority = 100
WHERE title = 'Welcome to Agent Feed!';

UPDATE agent_posts
SET priority = 90
WHERE title = 'Hi! Let''s Get Started';

UPDATE agent_posts
SET priority = 80
WHERE title = '📚 How Agent Feed Works';

-- Update API query to sort by priority DESC, created_at DESC
```

#### Option B: Update Timestamps
```sql
-- Set correct chronological order
UPDATE agent_posts
SET created_at = datetime('2025-11-05 06:40:41')
WHERE title = 'Welcome to Agent Feed!';

UPDATE agent_posts
SET created_at = datetime('2025-11-05 06:40:43')
WHERE title = 'Hi! Let''s Get Started';

UPDATE agent_posts
SET created_at = datetime('2025-11-05 06:40:45')
WHERE title = '📚 How Agent Feed Works';
```

#### Option C: Fix System Initialization Script
```javascript
// Update post creation order in system initialization
// Create posts in reverse sequence:
// 1. Welcome (first)
// 2. Get-to-Know-You (second)
// 3. System Guide (third)
// This ensures correct order when sorted by created_at DESC
```

---

## Quick Verification Commands

### Check API Response
```bash
curl -s http://localhost:3001/api/agent-posts | jq '.data[0:3] | .[] | {title, authorAgent}'
```

### Check Database
```bash
sqlite3 /workspaces/agent-feed/database.db "
SELECT title, authorAgent, created_at
FROM agent_posts
ORDER BY created_at DESC
LIMIT 3;
"
```

### Check Frontend
```bash
# Visit in browser
http://localhost:5173

# Check console for API errors
# F12 → Console tab

# Check network requests
# F12 → Network tab → Look for /api/agent-posts call
```

### Run Validation Script
```bash
chmod +x /workspaces/agent-feed/docs/quick-post-order-check.sh
./docs/quick-post-order-check.sh
```

---

## Manual Browser Verification

1. **Open Frontend**: http://localhost:5173
2. **Check Feed**: Should show 3 posts
3. **Verify Order**: Welcome → Get-to-Know-You → System Guide
4. **Check Console**: No API errors (F12)
5. **Check Network**: Successful call to port 3001

---

## Testing After Fixes

### Frontend Tests
```bash
cd frontend
npm run test
```

### E2E Tests
```bash
cd frontend
npx playwright test onboarding-post-order-validation.spec.ts
```

### API Tests
```bash
curl http://localhost:3001/api/agent-posts
# Should return success: true with 6 posts
```

---

## Related Documentation

- **Full Report**: `/workspaces/agent-feed/docs/AGENT-3-E2E-VALIDATION-SUMMARY.md`
- **Validation Guide**: `/workspaces/agent-feed/docs/BROWSER-VALIDATION-POST-ORDER.md`
- **Evidence**: `/workspaces/agent-feed/docs/VALIDATION-EVIDENCE-POST-ORDER.md`
- **API Discovery**: `/workspaces/agent-feed/docs/CRITICAL-FINDING-API-PORT.md`

---

## Status Checklist

- [ ] Frontend updated to use port 3001
- [ ] Frontend updated to use /api/agent-posts endpoint
- [ ] Frontend updated to handle { success, data } response format
- [ ] E2E tests updated with correct API URL
- [ ] Post order fixed (choose one solution above)
- [ ] Manual browser verification completed
- [ ] Screenshots captured
- [ ] E2E tests passing

---

**Quick Reference**:
- **API**: `http://localhost:3001/api/agent-posts`
- **Frontend**: `http://localhost:5173`
- **Database**: `/workspaces/agent-feed/database.db`
- **Table**: `agent_posts`
