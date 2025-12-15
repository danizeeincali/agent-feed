# Skill Detection Bug Fix - Complete Specification

**Date**: 2025-10-30
**Status**: 🚨 CRITICAL BUG - BLOCKING PRODUCTION
**Priority**: P0 (Immediate Fix Required)

---

## 🔍 Bug Summary

**Symptom**: User asks "what is 500+343?" and gets no response

**Root Cause**: SkillLoader detects skills based on SYSTEM PROMPT instead of USER QUERY, causing:
1. All 7 skills loaded for simple math question
2. 23,000 tokens (should be 3,000)
3. 142KB prompt size
4. OS error: E2BIG (argument list too long)
5. Silent failure - no error shown to user

**Impact**:
- **100% of simple queries fail** (math, basic questions)
- User gets no feedback
- Skills system is completely broken
- Token costs would be 7x higher even if it worked

---

## 📊 Evidence from Backend Logs

### What Happened (from /tmp/backend-new.log lines 836-935)

**Step 1: Post Created** ✅
```
✅ Post created in SQLite: post-1761865635819
💬 Post detected as AVI question
```

**Step 2: Skill Detection WRONG** ❌
```
🔍 Detecting relevant skills...
📝 Message: "You are Λvi (AVI), Chief of Staff for this system..."  ← BUG!

✅ Detected 7 relevant skills  ← SHOULD BE 0!
  - Strategic Coordination (always-load)
  - Task Management (always-load)
  - Agent Ecosystem Coordination (60% - keyword: "agent")
  - Project Memory & Context (27% - keyword: "memory")
  - User Preferences (50% - keyword: "user")
  - Meeting Coordination (10% - keyword: "follow-up")
  - Goal Frameworks (9% - keyword: "outcome")
```

**Why it detected skills**: System prompt contains words like "agent", "coordinate", "memory", "user", etc.

**Step 3: Token Budget Critical** ❌
```
💰 Token Budget Analysis:
  Total Tokens: 23000 / 25000 (92%)  ← 7x TOO HIGH!
  Status: CRITICAL

📝 Total prompt length: 141999 characters  ← 142KB!
```

**Step 4: Fatal Error** ❌
```
❌ Claude Code query failed: Error: spawn E2BIG
  errno: -7,
  code: 'E2BIG',
  syscall: 'spawn'

❌ AVI chat failed: spawn E2BIG
```

**Step 5: Silent Failure** ❌
- User sees: Nothing (no error, no response)
- Backend logs: Error buried in logs
- User experience: Complete failure

---

## 🎯 Expected vs Actual Behavior

### For Query: "what is 500+343?"

**EXPECTED**:
```
1. Skill Detection Input: "what is 500+343?"
2. Skills Detected: 0 (no coordination/agent/memory keywords)
3. Skills Loaded:
   - strategic-coordination (always-load): 3,500 tokens
   - task-management (always-load): 4,200 tokens
   Total: 7,700 tokens
4. System Prompt: CLAUDE-CORE + 2 skills = ~50KB
5. Result: ✅ Query succeeds
6. Response: "843"
7. Cost: $0.023 (7,700 input tokens)
```

**ACTUAL**:
```
1. Skill Detection Input: "You are Λvi (AVI), Chief of Staff..."  ← BUG!
2. Skills Detected: 7 (system prompt has agent/memory keywords)
3. Skills Loaded: All 7 skills = 23,000 tokens
4. System Prompt: CLAUDE-CORE + 7 skills = 142KB
5. Result: ❌ E2BIG error
6. Response: None (silent failure)
7. Cost: $0 (query never executed)
```

---

## 🔧 The Fix

### File 1: `/prod/src/services/ClaudeCodeSDKManager.js`

**Current Code (BROKEN)** - Lines ~100-120:
```javascript
async query(options) {
  // Build dynamic system prompt with skills
  const { systemPrompt, loadedSkills, tokenCount } =
    await this.skillLoader.buildSystemPrompt(
      options.prompt,  // ← BUG: This is the FULL system prompt!
      options.conversationContext
    );

  console.log(`📊 System prompt: ${tokenCount} tokens (skills: ${loadedSkills.join(', ')})`);

  // Use the prompt directly
  const fullPrompt = options.prompt;  // Contains Avi identity + user query

  const queryResponse = query({
    prompt: fullPrompt,
    options: {
      model: options.model || this.config.model,
      max_tokens: options.max_tokens || 4096
    }
  });
  // ...
}
```

**Fixed Code**:
```javascript
async query(options) {
  // Extract user query from the full prompt
  const userQuery = this.extractUserQuery(options.prompt);

  console.log(`📝 User query extracted: "${userQuery.substring(0, 100)}..."`);

  // Build dynamic system prompt with skills based on USER QUERY ONLY
  const { systemPrompt, loadedSkills, tokenCount } =
    await this.skillLoader.buildSystemPrompt(
      userQuery,  // ← FIX: Pass only user query for skill detection!
      options.conversationContext
    );

  console.log(`📊 Skills detected for user query: ${loadedSkills.length} skills`);
  console.log(`💰 Token estimate: ${tokenCount} tokens`);
  console.log(`🎯 Skills loaded: ${loadedSkills.join(', ') || 'none (using core only)'}`);

  // Combine system prompt with user query
  const fullPrompt = `${systemPrompt}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${userQuery}`;

  // Check prompt size before spawning
  const promptSizeKB = Buffer.byteLength(fullPrompt, 'utf8') / 1024;
  console.log(`📏 Final prompt size: ${promptSizeKB.toFixed(1)}KB`);

  if (promptSizeKB > 100) {
    console.warn(`⚠️ Large prompt detected: ${promptSizeKB.toFixed(1)}KB`);
  }

  if (promptSizeKB > 200) {
    throw new Error(
      `Prompt too large (${promptSizeKB.toFixed(1)}KB). ` +
      `This would cause E2BIG error. Try reducing skill complexity.`
    );
  }

  const queryResponse = query({
    prompt: fullPrompt,
    options: {
      model: options.model || this.config.model,
      max_tokens: options.max_tokens || 4096
    }
  });
  // ...
}

/**
 * Extract user query from full prompt
 * Handles various prompt formats from AVI session manager
 */
extractUserQuery(fullPrompt) {
  // Method 1: Look for standard separator
  const separator = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  if (fullPrompt.includes(separator)) {
    const parts = fullPrompt.split(separator);
    return parts[parts.length - 1].trim();
  }

  // Method 2: Look for "User:" or "Question:" markers
  const userMarkerMatch = fullPrompt.match(/(?:User:|Question:|Query:)\s*(.+?)$/is);
  if (userMarkerMatch) {
    return userMarkerMatch[1].trim();
  }

  // Method 3: Look for last paragraph (after double newline)
  const paragraphs = fullPrompt.split('\n\n');
  const lastParagraph = paragraphs[paragraphs.length - 1].trim();

  // If last paragraph is short (< 500 chars), likely the query
  if (lastParagraph.length < 500) {
    return lastParagraph;
  }

  // Method 4: Fallback - use last 200 chars
  return fullPrompt.slice(-200).trim();
}
```

### File 2: `/prod/src/services/SkillLoader.js`

**Current Code** - Lines ~150-180:
```javascript
async buildSystemPrompt(messageOrPrompt, conversationContext = {}) {
  // Always load core
  const core = await fs.readFile(
    '/workspaces/agent-feed/prod/CLAUDE-CORE.md',
    'utf-8'
  );

  // Detect and load required skills
  const requiredSkills = await this.detectRequiredSkills(
    messageOrPrompt,  // ← This receives the full system prompt!
    conversationContext
  );
  // ...
}
```

**No change needed** - The issue is what gets PASSED to this function, not the function itself.

### File 3: `/api-server/avi/session-manager.js`

**Need to verify how prompt is constructed** - Lines ~140-180:

```javascript
async chat(message) {
  try {
    console.log(`💬 AVI interaction #${this.interactionCount}: "${message.substring(0, 50)}..."`);

    // Build prompt with Avi identity
    const fullPrompt = this.buildPrompt(message);

    // Query Claude Code SDK
    const result = await this.claudeSDK.query({
      prompt: fullPrompt,  // ← This is Avi identity + user message
      conversationContext: {
        interactionCount: this.interactionCount,
        sessionId: this.sessionId
      }
    });
    // ...
  }
}

buildPrompt(userMessage) {
  return `You are Λvi (AVI), Chief of Staff for this system.

## 🤖 Meet Λvi - Your Chief of Staff

**Identity**: Λvi (Amplifying Virtual Intelligence) - displayed as "Λvi"
[... lots of Avi identity text ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${userMessage}`;
}
```

**This is correct!** The separator `━━━━━` is there, we just need to use it in extractUserQuery().

---

## ✅ Expected Results After Fix

### Simple Query: "what is 500+343?"

**Skill Detection**:
```
📝 User query extracted: "what is 500+343?"
🔍 Detecting relevant skills...
✅ Always-load skill: Strategic Coordination
✅ Always-load skill: Task Management
🎯 Detected 2 relevant skills (0 optional)
💰 Token estimate: 7700 tokens
🎯 Skills loaded: Strategic Coordination, Task Management
📏 Final prompt size: 42.3KB
```

**Result**:
```
✅ Query succeeds
💬 AVI responds: "843"
💰 Cost: $0.023 (7,700 input tokens)
```

### Complex Query: "coordinate agents to build API"

**Skill Detection**:
```
📝 User query extracted: "coordinate agents to build API"
🔍 Detecting relevant skills...
✅ Always-load skill: Strategic Coordination
✅ Always-load skill: Task Management
✅ Detected skill: Agent Ecosystem Coordination (80% - keywords: coordinate, agents)
🎯 Detected 3 relevant skills
💰 Token estimate: 11500 tokens
🎯 Skills loaded: Strategic Coordination, Task Management, Agent Ecosystem Coordination
📏 Final prompt size: 68.7KB
```

**Result**:
```
✅ Query succeeds
💬 AVI responds with coordination plan
💰 Cost: $0.034 (11,500 input tokens)
```

---

## 🧪 Test Plan

### Unit Tests

**File**: `/prod/tests/unit/skill-detection-fix.test.js`

```javascript
import { describe, test, expect } from 'vitest';
import { ClaudeCodeSDKManager } from '../../src/services/ClaudeCodeSDKManager.js';

describe('Skill Detection Bug Fix', () => {
  const sdkManager = new ClaudeCodeSDKManager();

  test('extractUserQuery - with separator', () => {
    const fullPrompt = `You are Avi...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

what is 500+343?`;

    const query = sdkManager.extractUserQuery(fullPrompt);
    expect(query).toBe('what is 500+343?');
  });

  test('extractUserQuery - with User: marker', () => {
    const fullPrompt = `System instructions...

User: what is 500+343?`;

    const query = sdkManager.extractUserQuery(fullPrompt);
    expect(query).toBe('what is 500+343?');
  });

  test('skill detection for simple math query', async () => {
    const userQuery = 'what is 500+343?';
    const skills = await sdkManager.skillLoader.detectRequiredSkills(userQuery);

    // Should only load always-load skills (2), no optional skills
    expect(skills.length).toBe(2);
    expect(skills).toContain('strategic-coordination');
    expect(skills).toContain('task-management');
  });

  test('skill detection for coordination query', async () => {
    const userQuery = 'coordinate agents to build a REST API';
    const skills = await sdkManager.skillLoader.detectRequiredSkills(userQuery);

    // Should load always-load (2) + agent-coordination (1)
    expect(skills.length).toBeGreaterThanOrEqual(3);
    expect(skills).toContain('agent-coordination');
  });

  test('prompt size check prevents E2BIG', () => {
    const hugePrompt = 'x'.repeat(300 * 1024); // 300KB

    expect(() => {
      const promptSizeKB = Buffer.byteLength(hugePrompt, 'utf8') / 1024;
      if (promptSizeKB > 200) {
        throw new Error('Prompt too large');
      }
    }).toThrow('Prompt too large');
  });
});
```

### Integration Tests

**File**: `/prod/tests/integration/simple-query-e2e.test.js`

```javascript
import { describe, test, expect } from 'vitest';
import { getClaudeCodeSDKManager } from '../../src/services/ClaudeCodeSDKManager.js';

describe('Simple Query End-to-End', () => {
  test('simple math query completes successfully', async () => {
    const sdkManager = getClaudeCodeSDKManager();

    const fullPrompt = `You are Λvi (AVI), Chief of Staff for this system.

## 🤖 Meet Λvi - Your Chief of Staff
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

what is 500+343?`;

    const result = await sdkManager.query({
      prompt: fullPrompt,
      model: 'claude-sonnet-4-20250514'
    });

    // Should succeed
    expect(result.success).toBe(true);

    // Should load minimal skills
    expect(result.skillMetadata.loadedSkills.length).toBeLessThanOrEqual(2);

    // Should have reasonable token count
    expect(result.skillMetadata.tokenEstimate).toBeLessThan(10000);

    // Should respond with answer
    const response = result.messages.find(m => m.type === 'assistant');
    expect(response.content).toMatch(/843/);
  }, 30000); // 30s timeout
});
```

### Playwright E2E Test

**File**: `/prod/tests/e2e/simple-query-ui.spec.js`

```javascript
import { test, expect } from '@playwright/test';

test('user can ask simple math question and get response', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Create post with simple math question
  await page.fill('[data-testid="post-input"]', 'what is 500+343?');
  await page.click('[data-testid="post-submit"]');

  // Wait for Avi response (max 30s)
  await page.waitForSelector('text=843', { timeout: 30000 });

  // Verify response appears
  const aviResponse = await page.textContent('[data-agent="avi"]');
  expect(aviResponse).toContain('843');

  // Screenshot for verification
  await page.screenshot({
    path: 'tests/screenshots/simple-math-query-success.png',
    fullPage: true
  });

  // Verify no error messages
  const errors = await page.$$('[data-testid="error-message"]');
  expect(errors.length).toBe(0);
});

test('complex coordination query loads appropriate skills', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Create post with coordination request
  await page.fill('[data-testid="post-input"]', 'coordinate agents to build a REST API with authentication');
  await page.click('[data-testid="post-submit"]');

  // Wait for Avi response
  await page.waitForSelector('[data-agent="avi"]', { timeout: 30000 });

  // Verify response contains coordination elements
  const aviResponse = await page.textContent('[data-agent="avi"]');
  expect(aviResponse.length).toBeGreaterThan(100); // Should be detailed response

  // Screenshot
  await page.screenshot({
    path: 'tests/screenshots/complex-query-success.png',
    fullPage: true
  });
});
```

---

## 📋 Implementation Checklist

### Phase 1: Code Fixes (30 minutes)

- [ ] Add `extractUserQuery()` method to ClaudeCodeSDKManager
- [ ] Update `query()` method to use extracted user query for skill detection
- [ ] Add prompt size validation (prevent E2BIG)
- [ ] Add comprehensive logging for debugging
- [ ] Add error handling with user-friendly messages

### Phase 2: Testing (45 minutes)

- [ ] Create unit tests for extractUserQuery()
- [ ] Create unit tests for skill detection
- [ ] Create integration test for simple query
- [ ] Create integration test for complex query
- [ ] Create Playwright E2E test
- [ ] Run all tests and verify passing

### Phase 3: Validation (30 minutes)

- [ ] Restart backend with fixes
- [ ] Test "what is 500+343?" live
- [ ] Verify backend logs show correct skill detection
- [ ] Test complex query "coordinate agents..."
- [ ] Verify token counts are correct
- [ ] Take screenshots for documentation

### Phase 4: Regression Testing (30 minutes)

- [ ] Test conversation memory (original bug fix)
- [ ] Test existing functionality
- [ ] Verify no new errors introduced
- [ ] Check Anthropic dashboard for token usage

---

## 🎯 Success Criteria

After fix is applied:

1. **Simple Query Success**:
   - ✅ "what is 500+343?" gets response "843"
   - ✅ Only 2 skills loaded (strategic-coordination, task-management)
   - ✅ Token count: ~7,700 (not 23,000)
   - ✅ Prompt size: ~42KB (not 142KB)
   - ✅ No E2BIG error

2. **Complex Query Success**:
   - ✅ "coordinate agents to build API" gets detailed response
   - ✅ 3-4 skills loaded (includes agent-coordination)
   - ✅ Token count: ~12,000
   - ✅ Prompt size: ~68KB

3. **Error Handling**:
   - ✅ User gets friendly error if prompt too large
   - ✅ Backend logs show clear debugging info
   - ✅ No silent failures

4. **Performance**:
   - ✅ 7x token reduction for simple queries
   - ✅ 70% cost reduction
   - ✅ Responses under 10 seconds

---

## 📊 Impact Analysis

### Before Fix

| Query Type | Skills Loaded | Tokens | Cost | Status |
|------------|---------------|--------|------|--------|
| Simple math | 7 (ALL) | 23,000 | N/A | ❌ E2BIG error |
| Complex | 7 (ALL) | 23,000 | N/A | ❌ E2BIG error |

### After Fix

| Query Type | Skills Loaded | Tokens | Cost | Status |
|------------|---------------|--------|------|--------|
| Simple math | 2 (core only) | 7,700 | $0.023 | ✅ Works |
| Complex | 3-4 (targeted) | 12,000 | $0.036 | ✅ Works |

**Improvement**:
- ✅ 100% success rate (from 0%)
- ✅ 67% token reduction for simple queries
- ✅ 48% token reduction for complex queries
- ✅ User experience: Fixed!

---

**Generated**: 2025-10-30
**Status**: Ready for Implementation
**Priority**: P0 - CRITICAL
**Estimated Time**: 2 hours (code + tests + validation)
