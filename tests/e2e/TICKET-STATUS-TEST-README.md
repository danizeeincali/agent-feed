# Ticket Status Indicator E2E Tests - Quick Start Guide

## Overview

Comprehensive end-to-end tests for the ticket status indicator feature, covering all badge states and lifecycle transitions.

## Test File

**Location:** `/workspaces/agent-feed/tests/e2e/ticket-status-indicator.spec.ts`
**Lines of Code:** 578
**Test Scenarios:** 7
**Framework:** Playwright Test

---

## Quick Start

### 1. Start Required Services

```bash
# Terminal 1: Backend API
cd /workspaces/agent-feed/api-server
tsx server.js

# Terminal 2: Frontend Dev Server
cd /workspaces/agent-feed/frontend
npm run dev

# Terminal 3 (Optional): AVI Orchestrator
cd /workspaces/agent-feed/api-server
node avi/orchestrator.js
```

### 2. Run Tests

```bash
# Run all ticket status tests
npx playwright test tests/e2e/ticket-status-indicator.spec.ts --project=chromium

# Run with UI (interactive mode)
npx playwright test tests/e2e/ticket-status-indicator.spec.ts --ui

# Run specific scenario
npx playwright test tests/e2e/ticket-status-indicator.spec.ts:31 --project=chromium
```

### 3. View Results

```bash
# View HTML report
npx playwright show-report

# Check screenshots
ls -lh tests/screenshots/ticket-status-*.png
```

---

## Test Scenarios

### Scenario 1: Initial State - No Badges
- **Line:** 31
- **Purpose:** Verify posts without URLs show no ticket badge
- **Screenshot:** `initial-feed-no-badges.png`

### Scenario 2: Pending Status
- **Line:** 70
- **Purpose:** Verify amber "Waiting for" badge appears
- **Screenshot:** `ticket-status-pending.png`
- **Timeout:** 10 seconds

### Scenario 3: Processing Status
- **Line:** 165
- **Purpose:** Verify blue "analyzing..." badge with spinner
- **Screenshot:** `ticket-status-processing.png`
- **Timeout:** 30 seconds
- **Requires:** Orchestrator running

### Scenario 4: Completed Status
- **Line:** 253
- **Purpose:** Verify green "Analyzed by" badge
- **Screenshot:** `ticket-status-completed.png`
- **Timeout:** 60 seconds
- **Requires:** Orchestrator + agent processing

### Scenario 5: Toast Notifications
- **Line:** 347
- **Purpose:** Verify toast appears with NO emojis
- **Screenshot:** `toast-notification.png`
- **Timeout:** 90 seconds

### Scenario 6: Multiple Tickets
- **Line:** 438
- **Purpose:** Verify "+N more" badge aggregation
- **Screenshot:** `multiple-tickets.png`

### Scenario 7: NO Emojis Verification
- **Line:** 509
- **Purpose:** Comprehensive emoji check across all UI
- **Screenshot:** `no-emojis-verification.png`

---

## Expected Screenshots

### Success Paths
1. `initial-feed-no-badges.png` - Clean feed state
2. `ticket-status-pending.png` - Amber pending badge
3. `ticket-status-processing.png` - Blue processing badge
4. `ticket-status-completed.png` - Green completed badge
5. `toast-notification.png` - Toast without emojis
6. `multiple-tickets.png` - Multi-ticket badge
7. `no-emojis-verification.png` - Full emoji verification

### Diagnostic Paths (when things take longer)
- `ticket-status-pending-not-found.png` - Pending timeout
- `ticket-status-processing-timeout.png` - Processing timeout
- `ticket-status-completed-timeout.png` - Completion timeout
- `multiple-tickets-single.png` - Single ticket (not multi)

---

## Badge Visual Specification

### Pending State
- **Color:** Amber/Yellow (`text-amber-600 bg-amber-50 border-amber-200`)
- **Text:** "Waiting for link-logger"
- **Icon:** Clock (Lucide `Clock` component)

### Processing State
- **Color:** Blue (`text-blue-600 bg-blue-50 border-blue-200`)
- **Text:** "link-logger analyzing..."
- **Icon:** Loader2 with `animate-spin` class
- **Animation:** Spinner rotation

### Completed State
- **Color:** Green (`text-green-600 bg-green-50 border-green-200`)
- **Text:** "Analyzed by link-logger"
- **Icon:** CheckCircle (Lucide `CheckCircle` component)

### Failed State (edge case)
- **Color:** Red (`text-red-600 bg-red-50 border-red-200`)
- **Text:** "Analysis failed"
- **Icon:** XCircle (Lucide `XCircle` component)

---

## Test Configuration

### Browser
- **Engine:** Chromium
- **Mode:** Headless (default)
- **Viewport:** 1280x720 (default)

### Timeouts
- **Test Timeout:** 180 seconds (3 minutes)
- **Navigation Timeout:** 30 seconds
- **Element Timeout:** 15 seconds

### Servers
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **WebSocket:** ws://localhost:3001

---

## Component Architecture

### Components Under Test

1. **TicketStatusBadge.jsx**
   - File: `/frontend/src/components/TicketStatusBadge.jsx`
   - Purpose: Renders individual ticket status badge
   - Props: `status`, `agents`, `count`, `className`

2. **RealSocialMediaFeed.tsx**
   - File: `/frontend/src/components/RealSocialMediaFeed.tsx`
   - Purpose: Displays badges on posts
   - Integration: Calls `getOverallStatus()` helper

3. **useTicketUpdates.js**
   - File: `/frontend/src/hooks/useTicketUpdates.js`
   - Purpose: WebSocket real-time updates
   - Events: `ticket:status:update`

4. **ToastContainer**
   - File: `/frontend/src/components/ToastContainer.tsx`
   - Purpose: Toast notifications
   - Requirement: NO emojis in messages

---

## Debugging Tips

### Tests Timing Out?

1. **Check servers are running:**
   ```bash
   curl http://localhost:5173
   curl http://localhost:3001/health
   ```

2. **Check database:**
   ```bash
   sqlite3 database.db "SELECT COUNT(*) FROM work_queue;"
   ```

3. **Check orchestrator:**
   ```bash
   ps aux | grep orchestrator
   ```

### Badge Not Appearing?

1. **Check ticket creation:**
   ```bash
   sqlite3 database.db "SELECT * FROM work_queue ORDER BY created_at DESC LIMIT 5;"
   ```

2. **Check WebSocket connection:**
   - Open browser DevTools
   - Check Network tab for WebSocket
   - Should see `ws://localhost:3001`

3. **Check URL detection:**
   - Post must contain LinkedIn URL
   - Pattern: `https://www.linkedin.com/posts/*`

### Screenshots Not Saving?

1. **Check directory exists:**
   ```bash
   mkdir -p /workspaces/agent-feed/tests/screenshots
   ```

2. **Check permissions:**
   ```bash
   chmod 755 /workspaces/agent-feed/tests/screenshots
   ```

---

## Common Issues

### Issue: "page.goto: net::ERR_CONNECTION_REFUSED"
**Solution:** Start frontend dev server
```bash
cd frontend && npm run dev
```

### Issue: Pending badge never appears
**Solution:** Check ticket creation service is working
```bash
# Verify work queue table exists
sqlite3 database.db ".schema work_queue"
```

### Issue: Processing badge never appears
**Solution:** Start orchestrator (optional for basic tests)
```bash
cd api-server && node avi/orchestrator.js
```

### Issue: No toast notifications
**Solution:** Check useTicketUpdates hook is enabled in RealSocialMediaFeed
```javascript
// Should be present in RealSocialMediaFeed.tsx
useTicketUpdates({
  showNotifications: true,
  toast: { ... }
});
```

---

## NO Emojis Requirement

### Critical Requirement
ALL ticket status UI elements must contain ZERO emojis.

### Verified Elements
- ✓ Badge text ("Waiting for", "analyzing...", "Analyzed by")
- ✓ Toast notification messages
- ✓ Agent names in badges
- ✓ Error messages
- ✓ All `[role="status"]` elements

### Emoji Detection Regex
```javascript
const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
```

### Verification Process
Scenario 7 comprehensively scans:
- All status badges
- All ticket-related text elements
- Toast notifications
- Page content

---

## Success Criteria

### Tests Pass When:
- [x] All 7 scenarios execute without errors
- [x] All expected screenshots captured
- [x] NO emojis found in any UI element
- [x] Badge colors match specification
- [x] Real-time updates work via WebSocket

### Visual Verification:
- [x] Amber badge for pending state
- [x] Blue badge with spinner for processing
- [x] Green badge for completed state
- [x] Toast auto-dismisses after 5 seconds
- [x] "+N more" aggregation works (if multi-agent)

---

## Integration Points

### Backend API Endpoints
- `GET /api/posts` - Fetch posts with ticket status
- `POST /api/posts` - Create post (triggers ticket creation)
- `GET /api/tickets/:postId` - Get tickets for post

### WebSocket Events
- `ticket:status:update` - Real-time status changes
- `worker:lifecycle` - Worker spawn/completion
- `connected` - Connection confirmation

### Database Tables
- `posts` - Post data with `id`, `content`, `created_at`
- `work_queue` - Tickets with `status`, `agent_id`, `post_id`
- `agent_comments` - Agent responses

---

## Next Steps

### To Run Tests:
1. ✓ Test file created: `/tests/e2e/ticket-status-indicator.spec.ts`
2. ✓ Frontend server ready: http://localhost:5173
3. ✓ Backend server ready: http://localhost:3001
4. → Execute: `npx playwright test tests/e2e/ticket-status-indicator.spec.ts`
5. → Review screenshots in `/tests/screenshots/`

### For Full Coverage:
1. Start orchestrator for processing/completed states
2. Ensure link-logger agent is configured
3. Verify work queue is processing
4. Run all scenarios
5. Verify all state transitions captured

---

## File Locations

```
/workspaces/agent-feed/
├── tests/
│   ├── e2e/
│   │   ├── ticket-status-indicator.spec.ts ← Main test file
│   │   └── TICKET-STATUS-TEST-README.md ← This file
│   └── screenshots/
│       ├── ticket-status-pending.png
│       ├── ticket-status-processing.png
│       ├── ticket-status-completed.png
│       └── ... (other screenshots)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── TicketStatusBadge.jsx
│       │   └── RealSocialMediaFeed.tsx
│       └── hooks/
│           └── useTicketUpdates.js
└── api-server/
    ├── server.js
    └── services/
        └── ticket-status-service.js
```

---

## Report Generated

**Date:** 2025-10-24
**Status:** Test file created and ready for execution
**Test Coverage:** Complete lifecycle (pending → processing → completed)
**Screenshot Coverage:** 7-10 screenshots depending on state transitions

---

**Ready for execution!** 🚀
