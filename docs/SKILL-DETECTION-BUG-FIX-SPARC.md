# Skill Detection Bug Fix - SPARC Specification

**Date**: October 31, 2025 03:10 UTC
**Severity**: HIGH - Comment replies returning wrong content
**Affected**: Comment threading with conversation context
**Status**: 🔴 **BROKEN → 🟢 FIXING**

---

## S - SPECIFICATION

### Problem Statement

**Bug**: When replying to comments in a thread, avi responds with skill system information instead of answering the actual question.

**Example**:
```
Post: "what is 55+96"
Comment 1 (avi): "151" ✅ Correct
Comment 2 (user): "divide by 2" (replying to 151)
Comment 3 (avi): "Looking at the analysis of our skills system..." ❌ WRONG - should be "75.5"
```

**Root Cause**: Skill detection system analyzing ENTIRE prompt (including instructions) instead of just user content

**Evidence**:
```
📝 User query extracted: "━

Please provide a helpful, concise response to this comment.

IMPORTANT: You have the FULL convers..."

✅ Detected skill: Project Memory & Context (score: 27%, keywords: context, history, previous)
```

The instruction text "IMPORTANT: You have the FULL conversation history" contains keywords:
- "context" → triggers Project Memory & Context skill
- "history" → triggers Project Memory & Context skill
- "previous" → triggers Project Memory & Context skill

This causes avi to respond with skill system template instead of the actual math answer.

### Impact Assessment

**What's Working**:
- ✅ Conversation chain loading (2 messages loaded correctly)
- ✅ Context building (full thread available)
- ✅ Comment creation and posting
- ✅ Ticket processing

**What's Broken**:
- ❌ Skill detection triggering on instruction keywords
- ❌ Wrong skill template being used for response
- ❌ User gets irrelevant answer
- ❌ Makes avi appear broken/confused

### Requirements

**Functional Requirements**:
1. Skill detection should ONLY analyze user message content, not instructions
2. Instruction keywords should be ignored by skill detector
3. Comment replies should use conversation context for answers
4. Skill system should not override comment reply logic
5. Math operations in threaded replies should work correctly

**Non-Functional Requirements**:
1. No performance degradation from fix
2. Backward compatible with existing posts
3. All existing skills should still work correctly
4. Token budget should remain under limits
5. 100% test coverage for skill detection logic

### Success Criteria

**Immediate**:
- [ ] "divide by 2" comment replies with "75.5"
- [ ] No skill system messages in comment replies
- [ ] Conversation context properly used
- [ ] All skill detection tests passing

**Long-term**:
- [ ] 20+ unit tests for skill detection (all passing)
- [ ] 10+ integration tests for comment threading
- [ ] 5+ Playwright E2E scenarios
- [ ] Zero false skill detections
- [ ] Regression suite clean

---

## P - PSEUDOCODE

### Main Fix: Separate User Content from Instructions

```javascript
// File: /api-server/worker/agent-worker.js or skill detector

FUNCTION extractUserContentOnly(fullPrompt):
  // Find the actual user message section
  // Ignore instruction sections

  IF prompt contains "CURRENT MESSAGE" marker:
    // Extract only the section between markers
    startMarker = "CURRENT MESSAGE\n━━━"
    endMarker = "\n━━━"

    userSection = extractBetweenMarkers(prompt, startMarker, endMarker)
    RETURN userSection

  ELSE IF prompt contains conversation chain:
    // Get the last message in the chain (current user message)
    messages = parseConversationChain(prompt)
    RETURN messages.last().content

  ELSE:
    // Fallback to current extraction logic
    RETURN extractViaCurrentMethod(prompt)

FUNCTION detectSkills(fullPrompt):
  // Extract ONLY user content, not instructions
  userContent = extractUserContentOnly(fullPrompt)

  // Run skill detection on user content ONLY
  skills = analyzeForSkills(userContent)

  // Filter out false positives from instruction keywords
  validSkills = skills.filter(skill => {
    // Don't trigger on meta-keywords
    IF skill.triggeredBy.includes("context", "history", "previous"):
      IF !userContent.toLowerCase().includes(skill.name.toLowerCase()):
        RETURN false  // False positive from instructions

    RETURN true
  })

  RETURN validSkills
```

### Improved Skill Detection Logic

```javascript
// File: /api-server/worker/skill-detector.js (NEW or refactored)

CLASS SkillDetector:

  FUNCTION detectRelevantSkills(userQuery, systemPrompt):
    // userQuery = ONLY the user's actual message
    // systemPrompt = full prompt with instructions

    // Always load critical skills
    alwaysLoad = ["Strategic Coordination", "Task Management"]

    // Detect additional skills from USER QUERY ONLY
    detected = []

    FOR EACH skill IN availableSkills:
      score = calculateSkillRelevance(userQuery, skill)

      IF score > THRESHOLD:
        detected.push({
          skill: skill,
          score: score,
          triggeredBy: getMatchingKeywords(userQuery, skill)
        })

    // Combine always-load + detected
    finalSkills = alwaysLoad + detected

    RETURN finalSkills

  FUNCTION calculateSkillRelevance(userQuery, skill):
    // Calculate relevance score based on:
    // 1. Keyword matches in USER QUERY (not full prompt)
    // 2. Semantic similarity
    // 3. Previous usage patterns

    score = 0
    queryLower = userQuery.toLowerCase()

    FOR EACH keyword IN skill.keywords:
      IF queryLower.includes(keyword):
        score += keyword.weight

    // Normalize to 0-100%
    RETURN (score / maxScore) * 100
```

### Comment Prompt Building Fix

```javascript
// File: /api-server/worker/agent-worker.js

FUNCTION buildCommentPrompt(comment, parentPost, conversationChain):
  // Build prompt sections separately
  sections = {
    post: buildPostSection(parentPost),
    thread: buildThreadSection(conversationChain),
    current: buildCurrentMessageSection(comment),
    instructions: buildInstructionsSection(conversationChain.length > 0)
  }

  // Combine sections with clear markers
  prompt = sections.post + sections.thread + sections.current + sections.instructions

  // RETURN structure that allows extracting user content:
  // - Full prompt for agent
  // - User content for skill detection
  RETURN {
    fullPrompt: prompt,
    userContent: comment.content,  // ✅ Only the user's message
    conversationChain: conversationChain
  }

FUNCTION invokeAgent(promptData):
  // Use userContent for skill detection
  skills = detectSkills(promptData.userContent)  // ✅ Not full prompt

  // Use fullPrompt for agent invocation
  response = claudeSDK.query(promptData.fullPrompt, skills)

  RETURN response
```

---

## A - ARCHITECTURE

### Files to Modify

**1. Primary Fix**:
- `/api-server/worker/agent-worker.js` (buildCommentPrompt, invokeAgent)
  - Separate user content extraction
  - Pass user content to skill detector

**2. Skill Detection Refactor**:
- `/api-server/worker/skill-detector.js` (NEW or refactor existing)
  - Extract user content parsing
  - Implement keyword filtering
  - Add false positive detection

**3. Skill Loading System**:
- Search for current skill loading implementation
- Update to accept separated user content
- Add validation to prevent instruction keyword triggers

**4. Tests** (NEW):
- `/api-server/tests/unit/skill-detector.test.js` (20+ tests)
- `/api-server/tests/unit/comment-prompt-builder.test.js` (15+ tests)
- `/api-server/tests/integration/threaded-comment-reply.test.js` (10+ tests)
- `/api-server/tests/e2e/comment-threading.test.js` (5+ tests)
- `/frontend/tests/e2e/integration/threaded-replies.spec.ts` (5+ scenarios)

### System Flow (After Fix)

```
1. User Posts Comment: "divide by 2"
   (replying to avi's "151")
   ↓
2. Ticket Created
   ticket = {
     content: "divide by 2",
     metadata: { parent_comment_id: "3197d584..." }
   }
   ↓
3. Load Conversation Chain
   chain = [
     { author: "avi", content: "151" },
     { author: "user", content: "divide by 2" }
   ]
   ↓
4. Build Prompt with Sections
   promptData = {
     fullPrompt: "POST\n151\n\nTHREAD\n...\nCURRENT\ndivide by 2\n\nINSTRUCTIONS\n...",
     userContent: "divide by 2",  ✅ ONLY user message
     conversationChain: [...]
   }
   ↓
5. Detect Skills (using userContent ONLY)
   skills = detectSkills("divide by 2")  ✅ No instruction keywords
   // Result: No skills detected (just math)
   ↓
6. Invoke Agent
   response = claudeSDK.query(fullPrompt, skills)
   // Agent sees full context, but skills don't interfere
   ↓
7. Agent Analyzes
   "User said 'divide by 2', previous message was '151'"
   "151 / 2 = 75.5"
   ↓
8. Post Reply
   content: "75.5"  ✅ CORRECT
```

### Error Prevention

```
BEFORE FIX:
skillDetector.detect("...IMPORTANT: You have the FULL conversation history...")
→ Detects: "Project Memory & Context" (keywords: history, context)
→ Response: Skill system template ❌

AFTER FIX:
skillDetector.detect("divide by 2")  ✅ Only user content
→ Detects: No skills (just math)
→ Response: "75.5" ✅
```

---

## R - REFINEMENT (TDD Approach)

### Test Suite Structure

**Unit Tests: Skill Detector** (20 tests)

```javascript
describe('SkillDetector', () => {
  describe('extractUserContent', () => {
    test('should extract user message from comment prompt', () => {
      const prompt = `
        ORIGINAL POST
        what is 55+96

        CONVERSATION THREAD
        1. avi: 151

        CURRENT MESSAGE
        divide by 2

        IMPORTANT: You have the FULL conversation history
      `;

      const userContent = skillDetector.extractUserContent(prompt);
      expect(userContent).toBe('divide by 2');
      expect(userContent).not.toContain('IMPORTANT');
      expect(userContent).not.toContain('conversation');
    });

    test('should not include instruction keywords', () => {
      const userContent = skillDetector.extractUserContent(fullPrompt);
      expect(userContent.toLowerCase()).not.toContain('important');
      expect(userContent.toLowerCase()).not.toContain('please provide');
    });
  });

  describe('detectSkills - false positive prevention', () => {
    test('should NOT detect skills from instruction keywords', () => {
      const userContent = 'divide by 2';  // No skill keywords
      const skills = skillDetector.detect(userContent);

      expect(skills).not.toContainEqual(
        expect.objectContaining({ name: 'Project Memory & Context' })
      );
    });

    test('should detect skills when user ACTUALLY asks about them', () => {
      const userContent = 'show me project context and history';
      const skills = skillDetector.detect(userContent);

      expect(skills).toContainEqual(
        expect.objectContaining({ name: 'Project Memory & Context' })
      );
    });

    test('should handle math operations without skill detection', () => {
      const mathQueries = ['divide by 2', '151 / 2', 'what is half of 151'];

      mathQueries.forEach(query => {
        const skills = skillDetector.detect(query);
        expect(skills.length).toBe(0); // No skills needed for simple math
      });
    });
  });

  describe('keyword filtering', () => {
    test('should filter instruction meta-keywords', () => {
      const metaKeywords = ['context', 'history', 'previous', 'conversation'];
      const userContent = 'simple math question';

      // Even if these appear in full prompt, they shouldn't trigger
      const skills = skillDetector.detect(userContent);
      expect(skills.every(s => !metaKeywords.includes(s.triggeredBy))).toBe(true);
    });
  });
});
```

**Unit Tests: Comment Prompt Builder** (15 tests)

```javascript
describe('CommentPromptBuilder', () => {
  test('should separate user content from instructions', () => {
    const comment = { content: 'divide by 2' };
    const chain = [{ author: 'avi', content: '151' }];

    const promptData = buildCommentPrompt(comment, null, chain);

    expect(promptData.fullPrompt).toContain('IMPORTANT');
    expect(promptData.userContent).toBe('divide by 2');
    expect(promptData.userContent).not.toContain('IMPORTANT');
  });

  test('should preserve conversation context in full prompt', () => {
    const promptData = buildCommentPrompt(comment, post, chain);

    expect(promptData.fullPrompt).toContain('151');
    expect(promptData.fullPrompt).toContain('CONVERSATION THREAD');
    expect(promptData.conversationChain).toHaveLength(1);
  });
});
```

**Integration Tests: Threaded Replies** (10 tests)

```javascript
describe('Threaded Comment Reply Integration', () => {
  test('should reply correctly to math question in thread', async () => {
    // Create post
    const post = await createPost('what is 55+96');

    // Avi replies with 151
    await processPostTicket(post);
    const aviComment = await getLatestComment(post.id);
    expect(aviComment.content).toBe('151');

    // User replies "divide by 2"
    const userComment = await createComment(post.id, 'divide by 2', aviComment.id);

    // Process comment ticket
    await processCommentTicket(userComment);

    // Verify avi's reply
    const aviReply = await getLatestComment(post.id);
    expect(aviReply.content).toMatch(/75\.5|seventy-five point five/i);
    expect(aviReply.content).not.toContain('skills system');
    expect(aviReply.content).not.toContain('Strategic Coordination');
  });

  test('should not trigger skill detection on instruction keywords', async () => {
    const comment = await createThreadedComment('divide by 2');
    const ticket = await getTicket(comment.id);

    // Mock skill detector to track what it receives
    const skillDetectorSpy = jest.spyOn(skillDetector, 'detect');

    await processCommentTicket(ticket);

    expect(skillDetectorSpy).toHaveBeenCalledWith('divide by 2');
    expect(skillDetectorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('IMPORTANT')
    );
  });
});
```

**E2E Tests (Playwright)** (5 scenarios)

```typescript
test('should answer threaded math questions correctly', async ({ page }) => {
  // Navigate to post "what is 55+96"
  await page.goto('/');
  await page.fill('[data-testid="post-input"]', 'what is 55+96');
  await page.click('[data-testid="submit-post"]');

  // Wait for avi's reply "151"
  await expect(page.locator('text=151')).toBeVisible({ timeout: 30000 });

  // Reply to avi's comment
  await page.locator('text=151').locator('button:has-text("Reply")').click();
  await page.fill('[data-testid="comment-input"]', 'divide by 2');
  await page.click('button[type="submit"]');

  // Wait for avi's correct answer
  await expect(page.locator('text=75.5')).toBeVisible({ timeout: 30000 });

  // Should NOT see skill system message
  await expect(page.locator('text=Strategic Coordination')).not.toBeVisible();
  await expect(page.locator('text=skills system')).not.toBeVisible();

  // Screenshot for validation
  await page.screenshot({ path: 'screenshots/threaded-math-reply.png' });
});
```

---

## C - COMPLETION

### Deployment Steps

**1. Pre-Deployment Testing**:
```bash
# Run all skill detection tests
npm test -- tests/unit/skill-detector.test.js
npm test -- tests/unit/comment-prompt-builder.test.js

# Run integration tests
npm test -- tests/integration/threaded-comment-reply.test.js

# Expected:
✓ 20 skill detector tests
✓ 15 prompt builder tests
✓ 10 integration tests
```

**2. Deploy Fix**:
```bash
# Apply code changes
- Refactor agent-worker.js (buildCommentPrompt, invokeAgent)
- Create/update skill-detector.js
- Update skill loading system

# Restart backend
pm2 reload backend

# Verify deployment
curl http://localhost:3001/api/streaming-monitoring/health
```

**3. Test Real Scenario**:
```bash
# Navigate to post "what is 55+96"
# Post comment: "divide by 2"
# Wait for avi's reply
# Expected: "75.5" (not skill system message)

# Check logs
tail -f /tmp/backend-*.log | grep "divide by 2"
```

**4. Validation**:
```sql
-- Check comment created
SELECT content, author FROM comments
WHERE post_id = 'post-1761879326561'
ORDER BY created_at DESC LIMIT 3;

-- Expected:
-- "75.5" (avi) ✅
-- "divide by 2" (user)
-- "151" (avi)
```

### Rollback Plan

```bash
# If issues occur:
git revert <commit-hash>
pm2 reload backend

# Mark new tickets as failed
sqlite3 database.db "UPDATE work_queue_tickets
  SET status = 'failed'
  WHERE created_at > 1761879000000;"
```

---

## Natural Language Debugging (NLD)

### Debugging Narrative

**Step 1: User Report**
> "divide by 2" comment gets skill system response instead of "75.5"

**Step 2: Log Analysis**
```
🔗 Built conversation chain: 2 messages (depth: 2)
✅ Detected skill: Project Memory & Context (score: 27%, keywords: context, history, previous)
```

**Step 3: Root Cause**
> Skill detector seeing instruction keywords ("context", "history") instead of user content ("divide by 2")

**Step 4: Trace Execution**
```
buildCommentPrompt() → "...IMPORTANT: You have the FULL conversation history..."
detectSkills(fullPrompt) → Analyzes instructions ❌
Detects: "Project Memory & Context"
Response: Skill template ❌
```

**Step 5: Solution**
> Extract user content separately, only analyze that for skills

**Step 6: Validation**
> Test with "divide by 2" → No skills detected → Correct answer "75.5"

---

## Risk Assessment

**Risk 1: Breaking Existing Skill Detection**
- **Likelihood**: Medium
- **Impact**: High
- **Mitigation**: Comprehensive regression tests, gradual rollout

**Risk 2: Missing Legitimate Skill Triggers**
- **Likelihood**: Low
- **Impact**: Medium
- **Mitigation**: Test both false positives AND true positives

**Risk 3: Performance Degradation**
- **Likelihood**: Low
- **Impact**: Low
- **Mitigation**: User content extraction is O(1), minimal overhead

**Risk 4: Breaking Comment Threading**
- **Likelihood**: Very Low
- **Impact**: High
- **Mitigation**: Integration tests cover full threading flow

---

## Success Metrics

### Immediate (< 5 minutes)
- ✅ "divide by 2" comment replies with "75.5"
- ✅ No skill system messages
- ✅ Backend restarted successfully

### Short-term (< 1 hour)
- ✅ All unit tests passing (35+)
- ✅ All integration tests passing (10+)
- ✅ Playwright scenarios working (5+)
- ✅ Real scenario validated

### Long-term (< 24 hours)
- ✅ 50+ threaded comments processed correctly
- ✅ Zero false skill detections
- ✅ All regression tests clean
- ✅ User satisfaction confirmed

---

**SPARC Status**: 📝 SPECIFICATION COMPLETE
**Next Phase**: Concurrent agent deployment
**Estimated Time**: 45-60 minutes
**Confidence Level**: 🟢 HIGH (well-isolated bug with clear fix)
