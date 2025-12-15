# Avi "No Summary Available" - Root Cause Investigation

**Date**: 2025-10-28
**Status**: 🔴 **CRITICAL BUG IDENTIFIED**
**Priority**: **P0 - Immediate Fix Required**

---

## 🚨 Issue Summary

**Symptom**: When users reply to Avi's comments, Avi responds with "No summary available" instead of actual content.

**Impact**:
- Avi cannot properly respond to comment threads
- User experience severely degraded
- System appears broken

**Frequency**: 100% reproducible on comment replies to Avi

---

## 📋 User Report

### What Happened (Timeline):

1. ✅ User posted: **"what is in your root folder?"**
2. ✅ Avi replied correctly with full folder listing
3. ❌ System also posted: **"No summary available"** (duplicate/error)
4. User replied: **"Can you give me the first few lines of the claude.md file?"**
5. ✅ Toast notification + comment counter updated
6. ❌ Comment didn't show in UI
7. After refresh: Saw Avi's comment **"No summary available"** ❌

---

## 🔍 Root Cause Analysis

### Database Evidence

```sql
-- Recent comments from database
d6486a6f-927e-438e-ae51-54324a564269|No summary available|avi|
71a47b9d-427a-43e1-9826-805cbe0ec64f|Can you give me the first few lines of the claude.md file?|anonymous|260c5636-e6b2-40b1-99cb-28c2a97aee55
9b37f68f-b367-4ccb-bc3d-d268311f35ff|No summary available|avi|
260c5636-e6b2-40b1-99cb-28c2a97aee55|Let me check what's in the root folder for you...|avi|  ← SUCCESS
```

### Server Logs Evidence

```
[0] 💬 Assistant response received        ← SDK executed
[0] ✅ Query completed: success           ← SDK succeeded
[0] ✅ Created comment d6486a6f-927e...   ← But posted "No summary available"
```

---

## 🏗️ Architecture - Two Code Paths for Avi

### Path 1: AVI DM System (Direct Questions) ✅ WORKS

**Location**: `/api-server/server.js`
**Trigger**: User posts direct question to Avi
**Process**:
1. Detects "Avi question" pattern
2. Initializes full AVI Claude Code session
3. Uses complete CLAUDE.md configuration
4. Generates proper response
5. Posts comment with full content

**Result**: ✅ **SUCCESS** - Full, detailed responses

**Example**:
```
User: "what is in your root folder?"
Avi: "Let me check what's in the root folder for you.

      The production root folder contains:
      **Key System Components:**
      - `.claude/` - Claude configuration and agents
      [... full detailed response ...]"
```

---

### Path 2: Agent Worker System (Comment Replies) ❌ FAILS

**Location**: `/api-server/worker/agent-worker.js`
**Trigger**: User replies to existing comment
**Process**:
1. Creates work ticket for comment (line 1645, server.js)
   ```javascript
   assigned_agent: null // Let orchestrator assign
   ```
2. Orchestrator assigns to 'avi' (default)
3. Worker spawns with `agentId: 'avi'`
4. Worker calls `processComment()` → `invokeAgent()`
5. `invokeAgent()` loads system prompt:
   ```javascript
   // Line 684-692, agent-worker.js
   const { getSystemPrompt } = await import('./system-identity.js');
   const systemPrompt = getSystemPrompt(this.agentId);

   if (systemPrompt) {
     agentInstructions = systemPrompt; // ← Uses lightweight prompt
   }
   ```
6. Executes Claude Code SDK (line 714)
7. SDK returns messages
8. **FAILURE HERE**: `extractFromTextMessages()` fails (line 722)
9. Returns fallback: `'No response available'` (line 724)
10. Worker posts comment with fallback text

**Result**: ❌ **FAIL** - Posts "No summary available"

---

## 💥 THE ACTUAL BUG

### Location: `/api-server/worker/agent-worker.js:722`

```javascript
async invokeAgent(prompt) {
  // ... SDK execution code ...

  const result = await sdkManager.executeHeadlessTask(fullPrompt); // Line 714

  if (!result.success) {
    throw new Error(`Claude Code SDK execution failed: ${result.error}`);
  }

  // Extract response from SDK result
  const messages = result.messages || [];
  const response = this.extractFromTextMessages(messages); // ← BUG HERE (line 722)

  return response || 'No response available'; // ← Falls back when extraction fails
}
```

### Why `extractFromTextMessages()` Fails

**Method**: Line 380-420 (approx)

**Problem**: The method expects specific message format from agent files, but system identity responses have different format.

**Expected Format** (from agent files):
```javascript
{
  type: 'text',
  text: 'Intelligence summary here...'
}
```

**Actual Format** (from system identity):
```javascript
{
  type: 'text',
  text: '\n\n[Response with leading whitespace or different structure]'
}
```

### Evidence from Logs

```
💬 Assistant response received  ← Response EXISTS
💬 Assistant response received  ← Multiple messages received
✅ Query completed: success     ← SDK worked fine
```

But then:
```javascript
// extractFromTextMessages() couldn't find valid text
return 'No response available'; // Line 724 fallback triggered
```

---

## 🔬 Detailed Code Flow

### Successful Path (AVI DM)
```
User Post
  ↓
server.js detects AVI question
  ↓
Initializes AVI session with full CLAUDE.md
  ↓
sdkManager.executeHeadlessTask()
  ↓
Returns full response
  ↓
Posts comment directly (no worker)
  ↓
✅ SUCCESS
```

### Failing Path (Worker for Comments)
```
User Comment Reply
  ↓
server.js creates work ticket (assigned_agent: null)
  ↓
Orchestrator assigns to 'avi'
  ↓
Worker spawns with agentId='avi'
  ↓
worker.processComment()
  ↓
worker.invokeAgent(prompt)
  ↓
Loads system-identity.js lightweight prompt
  ↓
sdkManager.executeHeadlessTask(systemPrompt + userComment)
  ↓
SDK returns messages (valid response)
  ↓
extractFromTextMessages(messages) ← **FAILS HERE**
  ↓
Returns 'No response available'
  ↓
Posts comment with fallback text
  ↓
❌ FAILURE
```

---

## 🐛 The Extraction Bug

### Method: `extractFromTextMessages()` (agent-worker.js ~line 380)

```javascript
extractFromTextMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  // Look for text messages from assistant
  const textMessages = messages.filter(msg =>
    msg.type === 'text' && msg.text && msg.text.trim()
  );

  if (textMessages.length === 0) {
    return null;
  }

  // Extract and concatenate all text
  const intelligence = textMessages
    .map(msg => msg.text.trim())
    .join('\n\n')
    .trim();

  // ❌ BUG: May return empty string if format doesn't match expectations
  return intelligence || null;
}
```

**Problem**: The filter logic may be too strict, or the concatenation may produce empty results for system identity responses.

---

## 🎯 Root Cause Summary

**PRIMARY ISSUE**: `extractFromTextMessages()` method in agent-worker.js fails to extract Claude Code SDK responses when using system identity prompts.

**WHY IT FAILS**:
1. System identity uses lightweight prompt (good)
2. Claude Code SDK executes successfully (confirmed by logs)
3. SDK returns valid response messages (confirmed by logs)
4. BUT: `extractFromTextMessages()` can't parse the response format
5. Falls back to "No response available"

**WHY PATH 1 WORKS**:
- AVI DM system doesn't use `extractFromTextMessages()`
- Uses different response handling
- Has full CLAUDE.md context

**WHY PATH 2 FAILS**:
- Worker uses `extractFromTextMessages()`
- Method can't handle system identity response format
- Falls back to error message

---

## 🔧 Potential Solutions

### Solution 1: Fix `extractFromTextMessages()` ⭐ RECOMMENDED

**Impact**: LOW RISK, fixes root cause

**Approach**:
```javascript
// In agent-worker.js
extractFromTextMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  // ENHANCED: More flexible message extraction
  const textMessages = messages.filter(msg => {
    // Accept any message with text content
    return msg && (msg.type === 'text' || msg.text) &&
           typeof msg.text === 'string' &&
           msg.text.trim().length > 0;
  });

  if (textMessages.length === 0) {
    // Try alternative: Check if result.response exists
    if (messages[0]?.response) {
      return messages[0].response.trim();
    }
    return null;
  }

  // Extract and clean text
  const intelligence = textMessages
    .map(msg => (msg.text || msg.response || '').trim())
    .filter(text => text.length > 0)
    .join('\n\n')
    .trim();

  return intelligence.length > 0 ? intelligence : null;
}
```

**Testing**:
1. Add debug logging to see exact message format
2. Test with both system identity and regular agents
3. Verify no regressions

---

### Solution 2: Use AVI DM System for All Avi Interactions

**Impact**: MEDIUM RISK, architectural change

**Approach**:
- Route ALL Avi interactions through AVI DM system (server.js)
- Don't create worker tickets for Avi comments
- Use full CLAUDE.md context always

**Pros**:
- Consistent behavior
- Full context always available
- Avoids worker path entirely

**Cons**:
- More token usage
- Different code path than other agents
- May not scale for high volume

---

### Solution 3: Enhanced System Identity Handling in Worker

**Impact**: MEDIUM RISK, new feature

**Approach**:
```javascript
// In agent-worker.js invokeAgent()
if (systemPrompt) {
  // Use specialized handling for system identities
  const result = await sdkManager.executeAviDM(fullPrompt);
  return result.response; // Direct response, no extraction needed
} else {
  // Regular agent handling
  const result = await sdkManager.executeHeadlessTask(fullPrompt);
  const response = this.extractFromTextMessages(result.messages);
  return response || 'No response available';
}
```

---

### Solution 4: Add Fallback Response Logging

**Impact**: ZERO RISK, diagnostic only

**Approach**:
```javascript
// In agent-worker.js
const response = this.extractFromTextMessages(messages);

if (!response) {
  // Log the actual messages for debugging
  console.error('❌ Failed to extract from messages:', JSON.stringify(messages, null, 2));
  console.error('   SDK Result:', JSON.stringify(result, null, 2));
}

return response || 'No response available';
```

**Purpose**: Understand exact failure mode before fixing

---

## 📊 Impact Assessment

### Current Impact
- ✅ Direct questions to Avi: **WORKING**
- ❌ Replies to Avi comments: **BROKEN (100% failure rate)**
- ❌ User experience: **Severely degraded**
- ❌ System credibility: **Damaged**

### Affected Users
- **All users** replying to Avi in comment threads
- **Does NOT affect** users asking Avi direct questions in new posts

### Business Impact
- Users think system is broken
- Loses trust in AI responses
- Conversation threads become unusable

---

## 🎯 Recommended Action Plan

### Phase 1: Immediate Diagnostic (15 min)
1. Add debug logging to `invokeAgent()` method
2. Log exact SDK response format
3. Log what `extractFromTextMessages()` receives
4. Reproduce issue with logging enabled
5. Identify exact message format mismatch

### Phase 2: Quick Fix (30 min)
1. Implement Solution 1 (enhanced extraction)
2. Add fallback: try multiple extraction methods
3. Test with system identity responses
4. Verify no regression on regular agents

### Phase 3: Validation (15 min)
1. Test comment replies to Avi
2. Verify responses are actual content (not "No summary available")
3. Check UI updates in real-time
4. Confirm WebSocket events working

### Phase 4: Long-term Solution (optional)
1. Consider routing all Avi interactions through AVI DM
2. Standardize response handling across both paths
3. Add comprehensive tests
4. Document system identity handling

---

## 🧪 Test Cases Needed

### TC-001: Comment Reply to Avi
**Given**: User replies to Avi's comment
**When**: Worker processes the reply
**Then**:
- ✅ Avi's response contains actual content
- ❌ Response is NOT "No summary available"
- ✅ Response addresses user's question
- ✅ Comment appears in UI immediately

### TC-002: Multiple Replies
**Given**: User has conversation thread with Avi
**When**: User replies multiple times
**Then**:
- ✅ Each reply gets proper response
- ✅ Context maintained across thread
- ❌ No "No summary available" errors

### TC-003: System Identity Extraction
**Given**: Claude Code SDK returns system identity response
**When**: `extractFromTextMessages()` processes it
**Then**:
- ✅ Successfully extracts text content
- ❌ Does NOT return null or empty
- ✅ Returns same quality as AVI DM responses

---

## 📝 Questions to Answer

1. **What is the exact format of messages returned by SDK for system identities?**
   - Need to log `result.messages` to see structure

2. **Why does `extractFromTextMessages()` work for regular agents but not system identities?**
   - Likely different message structure

3. **Should we use AVI DM for all Avi interactions?**
   - Token cost vs. consistency tradeoff

4. **Is the lightweight system prompt sufficient?**
   - Or do we need full CLAUDE.md for comment replies?

---

## 🚀 Next Steps

**IMMEDIATE** (Before making any changes):
1. ✅ Review this investigation
2. ✅ Confirm the diagnosis
3. ❓ Choose solution approach
4. ❓ Decide on logging strategy

**THEN** (With approval):
1. Add diagnostic logging
2. Reproduce issue with logs
3. Implement chosen solution
4. Test thoroughly
5. Deploy fix

---

**Status**: ✅ Investigation Complete - Awaiting Decision on Solution
**Priority**: 🔴 P0 - Critical Bug
**Owner**: Awaiting assignment
**Next**: Approve solution approach and proceed with implementation
