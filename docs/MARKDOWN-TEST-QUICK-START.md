# Markdown Rendering E2E Tests - Quick Start Guide

## TL;DR - Run Tests Now

```bash
# Navigate to frontend
cd /workspaces/agent-feed/frontend

# Ensure servers are running
curl http://localhost:5173  # Frontend should respond
curl http://localhost:3001/api/health  # Backend should respond

# Create screenshot directory
mkdir -p test-results/markdown-rendering-screenshots

# Run the tests
npx playwright test tests/e2e/markdown-rendering.spec.ts --headed

# View results
cat test-results/e2e-results.json | jq .
```

---

## Test File Location

```
/workspaces/agent-feed/frontend/tests/e2e/markdown-rendering.spec.ts
```

**Size**: 18,615 bytes
**Tests**: 6 comprehensive E2E tests
**Screenshots**: 3 visual validations

---

## What the Tests Do

### Test 1: Avi Comments Display Markdown ✅
- Creates Avi comment with **bold**, lists, code
- Verifies `<strong>`, `<ul>`, `<code>` elements present
- Screenshot: `markdown-rendering-avi-comment.png`

### Test 2: Old Comments Auto-Detect ✅
- Creates comment with `content_type='text'` BUT markdown syntax
- Verifies auto-detection renders markdown anyway
- Screenshot: `markdown-old-comment.png`

### Test 3: Plain Text Preserved ✅
- Creates plain text comment
- Verifies NO markdown elements
- No false-positive detection

### Test 4: Auto-Detection for New Comments ✅
- Creates comment with wrong content_type
- Verifies markdown renders via auto-detection
- Screenshot: `markdown-auto-detection.png`

### Test 5: Complex Markdown ✅
- Tests ALL markdown types (headings, lists, code, quotes, links)
- Verifies at least 5/8 types render
- Comprehensive validation

### Test 6: Screenshot Verification ✅
- Confirms all screenshots captured
- Validation checkpoint

---

## How to Run

### Option 1: Run All Tests (Headless)
```bash
cd /workspaces/agent-feed/frontend
npx playwright test tests/e2e/markdown-rendering.spec.ts
```

### Option 2: Run with Browser Visible
```bash
npx playwright test tests/e2e/markdown-rendering.spec.ts --headed
```

### Option 3: Debug Mode (Interactive)
```bash
npx playwright test tests/e2e/markdown-rendering.spec.ts --debug
```

### Option 4: Run Specific Test
```bash
npx playwright test -g "displays markdown formatting in Avi comments"
```

---

## Expected Output

```
Running 6 tests using 1 worker

✓  1 displays markdown formatting in Avi comments (15s)
✓  2 old Avi comments with markdown render correctly (12s)
✓  3 plain text comments remain unformatted (8s)
✓  4 markdown auto-detection works for new comments (10s)
✓  5 complex markdown with multiple features renders correctly (13s)
✓  6 all screenshots captured successfully (1s)

6 passed (59s)
```

---

## Screenshots Created

After tests run, check:
```bash
ls -lh test-results/

# Expected files:
# - markdown-rendering-avi-comment.png
# - markdown-old-comment.png
# - markdown-auto-detection.png
```

---

## Troubleshooting

### Issue: "No tests found"
**Solution**: Tests may be in wrong directory for playwright config.

**Fix**:
```bash
# Move to expected directory
mkdir -p tests/e2e/validation
mv tests/e2e/markdown-rendering.spec.ts tests/e2e/validation/

# Or run with full path
npx playwright test --grep markdown-rendering
```

### Issue: "Cannot connect to http://localhost:5173"
**Solution**: Start frontend server.

**Fix**:
```bash
cd /workspaces/agent-feed/frontend
npm run dev
```

### Issue: "Cannot connect to http://localhost:3001"
**Solution**: Start backend server.

**Fix**:
```bash
cd /workspaces/agent-feed/api-server
node server.js
```

### Issue: "WebSocket connection failed"
**Solution**: Ensure WebSocket server is running.

**Check**:
```bash
# Backend should log WebSocket connections
tail -f /workspaces/agent-feed/api-server/logs/server.log
```

---

## What Each Test Validates

| Test | Validates | Evidence |
|------|-----------|----------|
| Test 1 | Markdown renders in Avi comments | `<strong>`, `<ul>`, `<code>` in DOM |
| Test 2 | Auto-detection for wrong content_type | Bold elements despite `content_type='text'` |
| Test 3 | Plain text preserved | Zero markdown elements |
| Test 4 | New comment auto-detection | Markdown renders despite wrong type |
| Test 5 | All markdown types | 5+ element types present |
| Test 6 | Screenshots captured | 3 PNG files exist |

---

## Real vs Mock

### This Test Suite: 100% REAL ✅
- ✅ Real backend API calls
- ✅ Real database operations
- ✅ Real WebSocket events
- ✅ Real browser rendering
- ✅ Real visual screenshots

### No Mocks Used ❌
- ❌ No mocked API responses
- ❌ No mocked WebSocket
- ❌ No mocked components
- ❌ No test fixtures
- ❌ No stubs

---

## Test Scenarios

### Scenario 1: Avi Posts Weather Update
1. Avi agent creates comment with markdown
2. Comment has `content_type='markdown'`
3. Frontend receives via WebSocket
4. Renders with **bold**, lists, code
5. ✅ Validated by Test 1

### Scenario 2: Old Comment from Database
1. Database has comment with `content_type='text'`
2. But content is `**Temperature:** 56°F` (markdown!)
3. Frontend receives comment
4. Auto-detects markdown syntax
5. Renders as HTML despite wrong type
6. ✅ Validated by Test 2

### Scenario 3: User Posts Plain Text
1. User creates comment: "This is plain text"
2. No markdown syntax present
3. Frontend receives comment
4. Renders as plain `<p>` tag
5. No markdown processing
6. ✅ Validated by Test 3

---

## Success Criteria

### All Tests Pass ✅
- [ ] Test 1: Avi markdown renders
- [ ] Test 2: Auto-detection works
- [ ] Test 3: Plain text preserved
- [ ] Test 4: New comment auto-detect
- [ ] Test 5: Complex markdown works
- [ ] Test 6: Screenshots captured

### Visual Validation ✅
- [ ] Screenshots show formatted markdown
- [ ] Bold text visually bold
- [ ] Lists properly formatted
- [ ] Code blocks highlighted
- [ ] No raw `**` or ` ``` ` visible

### Performance ✅
- [ ] Tests complete in < 90 seconds
- [ ] No timeouts
- [ ] WebSocket connection stable
- [ ] Browser renders smoothly

---

## Integration Points

### Backend API
```javascript
POST /api/agent-posts/{postId}/comments
{
  content: "**Bold** text",
  content_type: "text" | "markdown",
  userId: "test-user",
  authorAgent: "avi" | null
}
```

### Frontend WebSocket
```javascript
socket.on('comment:created', (comment) => {
  // Real-time update
  // Auto-detection applies here
})
```

### Frontend Component
```typescript
// CommentThread.tsx
const shouldRenderMarkdown = useMemo(() => {
  if (comment.contentType === 'markdown') return true;
  if (comment.author.type === 'agent' && hasMarkdown(content)) return true;
  if (hasMarkdown(content)) return true;
  return false;
}, [comment])
```

---

## Time Estimates

| Test | Expected Duration |
|------|-------------------|
| Test 1 | ~15 seconds |
| Test 2 | ~12 seconds |
| Test 3 | ~8 seconds |
| Test 4 | ~10 seconds |
| Test 5 | ~13 seconds |
| Test 6 | ~1 second |
| **Total** | **~60 seconds** |

---

## Next Actions

1. **Run Tests**
   ```bash
   cd /workspaces/agent-feed/frontend
   npx playwright test tests/e2e/markdown-rendering.spec.ts
   ```

2. **Review Screenshots**
   ```bash
   open test-results/markdown-rendering-avi-comment.png
   open test-results/markdown-old-comment.png
   open test-results/markdown-auto-detection.png
   ```

3. **Check Results**
   ```bash
   cat test-results/e2e-results.json | jq '.suites[] | select(.file | contains("markdown"))'
   ```

4. **Document Findings**
   - Copy screenshots to documentation
   - Update validation report
   - Create PR with evidence

---

## Support

**Test File**: `/workspaces/agent-feed/frontend/tests/e2e/markdown-rendering.spec.ts`
**Documentation**: `/workspaces/agent-feed/docs/E2E-MARKDOWN-RENDERING-TEST-REPORT.md`
**SPARC Spec**: `/workspaces/agent-feed/docs/SPARC-MARKDOWN-RENDERING-FIX-SPEC.md`

---

**Ready to run!** 🚀
