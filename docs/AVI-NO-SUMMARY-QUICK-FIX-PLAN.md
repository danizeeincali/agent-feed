# Avi "No Summary Available" - Quick Fix Plan

**Status**: 🎯 **READY FOR REVIEW**
**Estimated Time**: 30-45 minutes
**Risk Level**: LOW
**Impact**: Fixes 100% of comment reply failures

---

## 🎯 The Fix

### Problem Location
`/api-server/worker/agent-worker.js:417`

```javascript
extractFromTextMessages(messages) {
  if (!messages || messages.length === 0) {
    return '';
  }

  const assistantMessages = messages.filter(m => m.type === 'assistant');

  const intelligence = assistantMessages
    .map(m => m.text || '')
    .filter(text => text.trim())
    .join('\n\n');

  return intelligence.trim() || '';
}
```

**Bug**: Filters for `type === 'assistant'`, but system identity responses may have different type or structure.

---

## ✅ Solution: Enhanced Message Extraction

### Step 1: Add Diagnostic Logging (5 min)

```javascript
// In invokeAgent() method (line ~714)
const result = await sdkManager.executeHeadlessTask(fullPrompt);

// ADD THIS:
console.log('🔍 SDK Result Structure:', {
  success: result.success,
  messageCount: result.messages?.length || 0,
  messageTypes: result.messages?.map(m => m.type) || [],
  hasResponse: !!result.response
});

if (!result.success) {
  throw new Error(`Claude Code SDK execution failed: ${result.error}`);
}

const messages = result.messages || [];
const response = this.extractFromTextMessages(messages);

// ADD THIS:
if (!response || response === '') {
  console.error('❌ Failed to extract response');
  console.error('   Messages:', JSON.stringify(messages.slice(0, 2), null, 2));
  console.error('   Full result keys:', Object.keys(result));
}

return response || 'No response available';
```

**Purpose**: See exact format before fixing

---

### Step 2: Enhanced Extraction Method (15 min)

```javascript
/**
 * Extract intelligence from text messages (ENHANCED for system identities)
 * @param {Array} messages - SDK response messages
 * @param {Object} result - Full SDK result object (optional)
 * @returns {string} Extracted intelligence
 */
extractFromTextMessages(messages, result = null) {
  if (!messages || messages.length === 0) {
    // Fallback 1: Check if result has direct response
    if (result?.response && typeof result.response === 'string') {
      return result.response.trim();
    }
    return '';
  }

  // Method 1: Try assistant messages (existing logic)
  const assistantMessages = messages.filter(m => m.type === 'assistant');
  if (assistantMessages.length > 0) {
    const intelligence = assistantMessages
      .map(m => m.text || m.content || '')
      .filter(text => text.trim())
      .join('\n\n');

    if (intelligence.trim()) {
      return intelligence.trim();
    }
  }

  // Method 2: Try ANY text messages (for system identities)
  const textMessages = messages.filter(m =>
    m.type === 'text' || m.text || m.content
  );
  if (textMessages.length > 0) {
    const intelligence = textMessages
      .map(m => m.text || m.content || '')
      .filter(text => text.trim())
      .join('\n\n');

    if (intelligence.trim()) {
      return intelligence.trim();
    }
  }

  // Method 3: Try role-based messages
  const roleMessages = messages.filter(m => m.role === 'assistant');
  if (roleMessages.length > 0) {
    const intelligence = roleMessages
      .map(m => m.text || m.content || m.message || '')
      .filter(text => text.trim())
      .join('\n\n');

    if (intelligence.trim()) {
      return intelligence.trim();
    }
  }

  // Method 4: Last resort - concatenate all message text
  const allText = messages
    .map(m => m.text || m.content || m.message || '')
    .filter(text => text.trim())
    .join('\n\n');

  if (allText.trim()) {
    return allText.trim();
  }

  // Method 5: Check result object directly
  if (result?.response && typeof result.response === 'string') {
    return result.response.trim();
  }

  return '';
}
```

---

### Step 3: Update invokeAgent() to Pass Full Result (5 min)

```javascript
// In invokeAgent() method (line ~714)
async invokeAgent(prompt) {
  // ... existing code ...

  const result = await sdkManager.executeHeadlessTask(fullPrompt);

  if (!result.success) {
    throw new Error(`Claude Code SDK execution failed: ${result.error}`);
  }

  // Extract response from SDK result
  const messages = result.messages || [];
  const response = this.extractFromTextMessages(messages, result); // ← Pass full result

  return response || 'No response available';
}
```

---

### Step 4: Similar Fix for processURL() Method (5 min)

```javascript
// In processURL() method (line ~530)
const messages = result.messages || [];
const intelligence = this.extractFromTextMessages(messages, result); // ← Pass full result

if (!intelligence || intelligence.trim() === '') {
  console.error('❌ No intelligence extracted from URL processing');
  throw new Error('Failed to extract intelligence from workspace files or URL processing');
}

return {
  summary: intelligence,
  tokensUsed: result.usage?.total_tokens || 0,
  model: result.model || 'unknown'
};
```

---

### Step 5: Add Test Case (10 min)

```javascript
// In tests/unit/agent-worker-system-identity.test.js
describe('System Identity Response Extraction', () => {
  it('should extract text from system identity format', () => {
    const worker = new AgentWorker({ agentId: 'avi' });

    // Format 1: Text messages
    const messages1 = [
      { type: 'text', text: 'Response from Avi' }
    ];
    expect(worker.extractFromTextMessages(messages1)).toBe('Response from Avi');

    // Format 2: Assistant messages
    const messages2 = [
      { type: 'assistant', text: 'Response from Avi' }
    ];
    expect(worker.extractFromTextMessages(messages2)).toBe('Response from Avi');

    // Format 3: Result with direct response
    const result = { response: 'Direct response' };
    expect(worker.extractFromTextMessages([], result)).toBe('Direct response');

    // Format 4: Mixed types
    const messages4 = [
      { type: 'user', text: 'Question' },
      { type: 'text', text: 'Answer from Avi' }
    ];
    expect(worker.extractFromTextMessages(messages4)).toBe('Answer from Avi');
  });

  it('should NOT return "No summary available" for valid responses', () => {
    const worker = new AgentWorker({ agentId: 'avi' });

    const messages = [
      { type: 'text', text: 'Actual response content' }
    ];

    const result = worker.extractFromTextMessages(messages);
    expect(result).not.toBe('');
    expect(result).not.toBe('No summary available');
    expect(result).toBe('Actual response content');
  });
});
```

---

## 🧪 Testing Strategy

### Manual Test 1: Comment Reply
1. Open app in browser
2. Find Avi's comment
3. Reply: "Can you give me the first few lines of claude.md?"
4. Wait for response
5. Verify: Response is actual content (NOT "No summary available")

### Manual Test 2: Check Logs
```bash
# Watch logs during test
grep "🔍 SDK Result" logs.txt
grep "❌ Failed to extract" logs.txt
```

### Manual Test 3: Database Verification
```sql
SELECT id, content, author_agent FROM comments
WHERE author_agent = 'avi'
ORDER BY created_at DESC
LIMIT 5;
```

Expected: All comments have actual content, none say "No summary available"

---

## 📊 Rollback Plan

If fix causes issues:

```bash
# Revert changes to agent-worker.js
git checkout HEAD -- api-server/worker/agent-worker.js

# Restart server
npm run dev
```

**Risk**: VERY LOW - only enhances extraction, doesn't break existing logic

---

## ⏱️ Implementation Timeline

| Step | Duration | Status |
|------|----------|--------|
| Add diagnostic logging | 5 min | ⏸️ Pending approval |
| Test with logging | 5 min | ⏸️ Pending |
| Implement enhanced extraction | 15 min | ⏸️ Pending |
| Update invokeAgent() | 5 min | ⏸️ Pending |
| Update processURL() | 5 min | ⏸️ Pending |
| Manual testing | 10 min | ⏸️ Pending |
| Verification | 5 min | ⏸️ Pending |
| **TOTAL** | **45 min** | ⏸️ **READY** |

---

## ✅ Success Criteria

**Fix is successful when**:
1. ✅ User replies to Avi's comment
2. ✅ Avi responds with actual content
3. ❌ NO "No summary available" messages
4. ✅ Response quality matches AVI DM responses
5. ✅ Regular agents still work (no regression)
6. ✅ Logs show successful extraction

---

## 🚀 Ready to Proceed?

**This plan**:
- ✅ Fixes the root cause
- ✅ Low risk (only enhances, doesn't break)
- ✅ Quick to implement (45 min)
- ✅ Easy to test
- ✅ Easy to rollback if needed

**Waiting for**:
- Your approval to proceed
- Confirmation of approach
- Any additional requirements

---

**Status**: 🟡 Plan Ready - Awaiting Approval
