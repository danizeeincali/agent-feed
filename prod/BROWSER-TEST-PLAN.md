# Browser Testing Plan - Markdown Rendering

**Date**: October 31, 2025
**Feature**: Markdown rendering in comments with auto-detection fallback
**Prerequisites**: Frontend (:5173) and Backend (:3001) must be running

---

## Prerequisites Verification

### Before Starting Browser Tests

1. **Services Running** ✅
   ```bash
   # Frontend check
   curl -s http://localhost:5173 > /dev/null && echo "✅ Frontend running"

   # Backend check
   curl -s http://localhost:3001/api/health > /dev/null && echo "✅ Backend running"
   ```

2. **Database State** ✅
   - 122 comments with `content_type='markdown'`
   - 29 comments with `content_type='text'`
   - Verified via: `sqlite3 database.db "SELECT content_type, COUNT(*) FROM comments GROUP BY content_type;"`

3. **Code Deployment** ✅
   - CommentThread.tsx updated with auto-detection logic
   - hasMarkdown function present in contentParser.tsx
   - All TypeScript compiled (or errors documented)

---

## Test Scenarios

### Scenario 1: Old Avi Comments with Markdown (Critical Path)

**Objective**: Verify that existing Avi comments with markdown formatting render correctly after database migration.

**Steps**:
1. Open browser to http://localhost:5173
2. Wait for feed to load completely
3. Scroll to find a post with comments
4. Click "Comments" button to expand comment section
5. Locate an Avi comment (look for Bot icon and "avi" name)
6. Identify comment with visible markdown syntax in preview

**Expected Results**:
- ✅ Bold text (e.g., "**Temperature:**") renders as bold HTML (`<strong>` tag)
- ✅ NO raw markdown symbols visible (no `**` in displayed text)
- ✅ Italic text renders with `<em>` tags
- ✅ Code blocks render with `<code>` tags
- ✅ Lists render as proper `<ul>`/`<li>` elements
- ✅ Comment is readable and properly formatted

**How to Verify**:
- Right-click on bold text → "Inspect Element"
- Verify DOM shows `<strong>` tag, not plain text with `**`
- Take screenshot: `screenshot-1-old-avi-markdown.png`

**Success Criteria**: No raw markdown syntax visible, all formatting applied correctly.

---

### Scenario 2: Auto-Detection with Wrong content_type (Fallback Safety Net)

**Objective**: Verify auto-detection fallback works when database has incorrect content_type.

**Context**: Some comments might have `content_type='text'` but contain markdown syntax. Auto-detection should catch these.

**Steps**:
1. Open browser DevTools Console (F12)
2. Navigate to a post with Avi comments
3. Expand comments section
4. Look for console logs: `[CommentThread] Auto-detected markdown in agent comment: <comment-id>`

**Expected Results**:
- ✅ Console logs show auto-detection triggered
- ✅ Comment renders as markdown despite wrong content_type in DB
- ✅ No errors in console
- ✅ Rendering is identical to comments with correct content_type

**How to Verify**:
- Check console for log message
- Inspect DOM to verify `<strong>`, `<em>`, `<code>` tags present
- Compare visually with known-good markdown comment

**Success Criteria**: Auto-detection catches wrong content_type and renders markdown correctly.

---

### Scenario 3: Plain Text Comments (No False Positives)

**Objective**: Verify plain text comments without markdown syntax render correctly without markdown processing.

**Steps**:
1. Find a user comment (not agent) or plain text comment
2. Verify content has NO markdown syntax (no `**`, `*`, `#`, etc.)
3. Inspect the rendered comment

**Expected Results**:
- ✅ Text displays exactly as entered
- ✅ NO `<strong>`, `<em>`, or other markdown HTML tags
- ✅ Whitespace preserved (if applicable)
- ✅ No markdown processing overhead

**How to Verify**:
- Inspect DOM - should see plain `<p>` or `<span>` with text
- No markdown HTML elements
- Take screenshot: `screenshot-3-plain-text.png`

**Success Criteria**: Plain text remains plain, no false markdown detection.

---

### Scenario 4: New Agent Response (Real-Time Testing)

**Objective**: Verify new agent responses with markdown render correctly via WebSocket updates.

**Steps**:
1. Open browser to http://localhost:5173
2. Open DevTools Console (F12) and Network tab
3. Navigate to a post and add a comment
4. Wait for Avi agent response (triggered automatically or manually)
5. Watch for WebSocket message in Network tab
6. Observe comment appearing in real-time

**Expected Results**:
- ✅ New comment appears without page refresh
- ✅ Markdown renders immediately upon arrival
- ✅ No flicker or re-render issues
- ✅ Console shows WebSocket events
- ✅ Comment formatting matches database content_type

**How to Verify**:
- Watch Network tab for WebSocket frames
- Check console for real-time update logs
- Verify markdown renders immediately
- Take screenshot: `screenshot-4-realtime-markdown.png`

**Success Criteria**: Real-time comments render markdown correctly on first display.

---

### Scenario 5: Complex Markdown (Code Blocks, Lists, etc.)

**Objective**: Verify all markdown elements render correctly, not just bold/italic.

**Steps**:
1. Find or create an Avi comment with complex markdown:
   ```markdown
   **Bold text** and *italic text*

   - List item 1
   - List item 2

   `inline code`

   ```javascript
   const x = 1;
   ```

   > Blockquote
   ```

2. Verify each element renders correctly

**Expected Results**:
- ✅ Bold: `<strong>` tags
- ✅ Italic: `<em>` tags
- ✅ Lists: `<ul>` and `<li>` tags
- ✅ Inline code: `<code>` tags
- ✅ Code blocks: `<pre><code>` tags with syntax highlighting
- ✅ Blockquotes: `<blockquote>` tags

**How to Verify**:
- Inspect each element in DevTools
- Verify HTML structure matches markdown intent
- Take screenshot: `screenshot-5-complex-markdown.png`

**Success Criteria**: All markdown syntax types render correctly.

---

### Scenario 6: Performance Check (No Degradation)

**Objective**: Verify markdown rendering doesn't impact performance.

**Steps**:
1. Open browser to http://localhost:5173
2. Open DevTools Performance tab
3. Navigate to a post with 10+ comments
4. Expand comments section
5. Record performance profile
6. Check for:
   - Render time
   - JavaScript execution time
   - No excessive re-renders

**Expected Results**:
- ✅ Comments render within 100ms
- ✅ No jank or stuttering
- ✅ No excessive React re-renders
- ✅ `useMemo` optimization working (check React DevTools Profiler)

**How to Verify**:
- Use Chrome DevTools Performance tab
- Record interaction, analyze flame graph
- Check React DevTools Profiler for unnecessary renders
- Document findings

**Success Criteria**: No performance degradation compared to plain text rendering.

---

### Scenario 7: Regression - WebSocket Updates Still Work

**Objective**: Verify real-time features still work after markdown changes.

**Steps**:
1. Open browser tab #1 to http://localhost:5173
2. Open browser tab #2 to same URL
3. In tab #1, post a comment on a post
4. Watch tab #2 for real-time update

**Expected Results**:
- ✅ Comment appears in tab #2 without refresh
- ✅ Toast notification appears
- ✅ Comment count updates
- ✅ Markdown renders correctly in real-time update

**How to Verify**:
- Open two browser tabs side-by-side
- Monitor WebSocket connections in both tabs
- Verify synchronization works
- Take screenshot: `screenshot-7-websocket-sync.png`

**Success Criteria**: Real-time updates work correctly with markdown rendering.

---

## Console Log Verification

### Expected Console Logs

When auto-detection triggers (comment with wrong content_type but markdown syntax):
```
[CommentThread] Auto-detected markdown in agent comment: comment-1234567890
```

When comment has explicit markdown content_type:
```
(No log expected - primary detection path)
```

When WebSocket receives new comment:
```
[CommentSystem] 📨 Real-time comment received: comment-xyz from avi
[CommentSystem] 📊 Previous comment count: 5
[CommentSystem] ✅ Added comment, new count: 6
```

### Console Errors to Watch For

❌ **Should NOT see**:
- `TypeError: Cannot read property 'type' of undefined`
- `ReferenceError: hasMarkdown is not defined`
- `Warning: Each child in a list should have a unique "key" prop`
- `Failed to parse markdown`
- `WebSocket connection failed`

---

## DevTools Inspection Checklist

### For Each Comment Type

1. **HTML Structure**
   - [ ] Correct semantic HTML tags
   - [ ] No raw markdown symbols in text nodes
   - [ ] Proper nesting of elements

2. **CSS Styling**
   - [ ] Bold text is actually bold (font-weight check)
   - [ ] Code blocks have monospace font
   - [ ] Lists have proper indentation
   - [ ] Colors and styling match design

3. **React DevTools**
   - [ ] Component props show correct values
   - [ ] `shouldRenderMarkdown` computed correctly
   - [ ] No unnecessary re-renders
   - [ ] State updates properly

4. **Network Tab**
   - [ ] WebSocket connection established
   - [ ] Messages sent/received correctly
   - [ ] No failed API requests
   - [ ] Comments load efficiently

---

## Screenshot Checklist

Capture these screenshots for documentation:

- [ ] `screenshot-1-old-avi-markdown.png` - Old Avi comment with markdown
- [ ] `screenshot-2-auto-detection-console.png` - Console showing auto-detection
- [ ] `screenshot-3-plain-text.png` - Plain text comment (no markdown)
- [ ] `screenshot-4-realtime-markdown.png` - New comment arriving via WebSocket
- [ ] `screenshot-5-complex-markdown.png` - Complex markdown with multiple elements
- [ ] `screenshot-6-devtools-inspection.png` - DevTools showing HTML structure
- [ ] `screenshot-7-websocket-sync.png` - Two tabs showing real-time sync

---

## Issue Documentation Template

If you find issues during testing, document them as follows:

```markdown
### Issue #X: [Brief Title]

**Severity**: Critical / High / Medium / Low
**Location**: [Component/File name]
**Browser**: [Chrome/Firefox/Safari + version]

**Description**:
[What went wrong]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Screenshots**:
[Attach screenshot]

**Console Errors**:
[Paste any console errors]

**Environment**:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Database: SQLite with 122 markdown comments
```

---

## Success Criteria Summary

For this feature to be approved for production:

- ✅ All 7 test scenarios pass
- ✅ No console errors during testing
- ✅ Screenshots captured and reviewed
- ✅ Performance is acceptable (< 100ms render time)
- ✅ Real-time features still work
- ✅ No regressions in existing functionality
- ✅ Auto-detection fallback works correctly
- ✅ Plain text comments unaffected

---

## Next Steps After Browser Testing

1. **Document Results**
   - Update validation report with findings
   - Attach all screenshots
   - Note any issues found

2. **Run E2E Tests** (if available)
   ```bash
   cd /workspaces/agent-feed/frontend
   npm run test:e2e
   ```

3. **Performance Benchmark**
   - Compare markdown vs plain text render times
   - Document in performance report

4. **Final Sign-Off**
   - Review all test results
   - Approve for production deployment
   - Or document blockers requiring fixes

---

**Test Plan Created**: October 31, 2025 20:25 UTC
**Estimated Test Duration**: 30-45 minutes
**Tester**: QA Validation Agent or Manual Tester
**Status**: READY FOR EXECUTION
