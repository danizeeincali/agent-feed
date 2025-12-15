# SPARC Specification: Avi "No Summary Available" Fix

**Document Version**: 1.0.0
**Date**: 2025-10-28
**Status**: READY FOR IMPLEMENTATION
**Methodology**: SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)
**Priority**: P0 - CRITICAL

---

## Executive Summary

This document provides a complete SPARC specification for fixing the critical bug where Avi responds with "No summary available" instead of actual content when replying to comments. The bug has a 100% failure rate on comment replies, significantly degrading user experience.

**Fix Scope**: Single method enhancement in `/api-server/worker/agent-worker.js`
**Estimated Time**: 45 minutes
**Risk Level**: LOW
**Test Coverage Required**: 90%+

---

# PHASE 1: SPECIFICATION

## 1.1 Problem Statement

### Current Behavior (Broken)
When users reply to Avi's comments, the system:
1. Successfully invokes Claude Code SDK
2. Receives valid response from SDK
3. **FAILS** to extract text from SDK response
4. Posts fallback message: "No summary available"
5. User sees generic error message instead of helpful content

### Expected Behavior (Fixed)
When users reply to Avi's comments, the system:
1. Successfully invokes Claude Code SDK
2. Receives valid response from SDK
3. **SUCCESSFULLY** extracts text from SDK response
4. Posts actual AI-generated content
5. User sees helpful, contextual response

### Root Cause
**File**: `/api-server/worker/agent-worker.js`
**Line**: 417
**Method**: `extractFromTextMessages(messages)`

**Issue**: The extraction method only filters for `type === 'assistant'`, but system identity responses from Claude Code SDK may have:
- `type === 'text'` (not 'assistant')
- Different message structure
- Direct response in result object (not in messages array)

## 1.2 Impact Analysis

### Current Impact
| Metric | Status | Details |
|--------|--------|---------|
| **Direct Questions to Avi** | ✅ WORKING | Uses AVI DM system (server.js), different code path |
| **Comment Replies to Avi** | ❌ BROKEN | 100% failure rate via Agent Worker system |
| **User Confidence** | ❌ DAMAGED | System appears broken, AI unresponsive |
| **Business Impact** | 🔴 CRITICAL | Conversation threads unusable |

### Affected Code Paths
1. **AVI DM System (server.js)** - ✅ NOT AFFECTED
   - Direct questions work fine
   - Uses different response handling
   - Full CLAUDE.md context

2. **Agent Worker System (agent-worker.js)** - ❌ BROKEN
   - Comment replies fail
   - Uses `extractFromTextMessages()`
   - Lightweight system prompt (good design)
   - Extraction logic inadequate

## 1.3 Requirements

### Functional Requirements

**FR-1: Multi-Format Message Extraction**
- MUST extract text from `type='assistant'` messages (existing)
- MUST extract text from `type='text'` messages (NEW - system identities)
- MUST extract text from direct result.response (NEW - fallback)
- MUST handle multiple content formats (text, content, message)

**FR-2: Backward Compatibility**
- MUST NOT break existing agent responses
- MUST maintain current behavior for regular agents
- MUST preserve existing message format handling

**FR-3: Graceful Degradation**
- MUST try multiple extraction methods in order
- MUST fall back to next method if current fails
- MUST return empty string only if all methods fail
- MUST log extraction failures for debugging

**FR-4: System Identity Support**
- MUST work with lightweight system prompts
- MUST handle system identity response formats
- MUST maintain token optimization benefits

### Non-Functional Requirements

**NFR-1: Performance**
- Extraction time MUST NOT increase by more than 5ms
- No additional SDK calls required
- Single-pass message processing

**NFR-2: Reliability**
- 99.9% success rate for valid SDK responses
- No false negatives (missing valid content)
- No false positives (extracting system messages)

**NFR-3: Maintainability**
- Clear code comments explaining each extraction method
- Structured fallback logic
- Easy to add new formats in future

**NFR-4: Observability**
- Log extraction method used (debug level)
- Log failures with message structure
- Track extraction success/failure metrics

### Acceptance Criteria

**AC-1: Comment Reply Success**
```gherkin
GIVEN user replies to Avi's comment
WHEN Agent Worker processes the reply
THEN Avi's response contains actual content
AND response is NOT "No summary available"
AND response addresses user's question
AND comment appears in UI immediately
```

**AC-2: Multiple Format Support**
```gherkin
GIVEN SDK returns response in format [assistant|text|direct]
WHEN extractFromTextMessages() processes it
THEN text is successfully extracted
AND response quality equals AVI DM responses
```

**AC-3: Backward Compatibility**
```gherkin
GIVEN existing agent uses current message format
WHEN extractFromTextMessages() processes it
THEN extraction succeeds as before
AND no regressions occur
```

**AC-4: Graceful Fallback**
```gherkin
GIVEN SDK returns unexpected message format
WHEN extraction methods 1-3 fail
THEN method 4-5 fallbacks are attempted
AND appropriate error logged if all fail
```

## 1.4 Edge Cases & Constraints

### Edge Cases to Handle

**EC-1: Empty Messages Array**
```javascript
messages = []
// Should: Check result.response, return empty string
```

**EC-2: Messages with No Text**
```javascript
messages = [{ type: 'system', status: 'success' }]
// Should: Return empty string, log warning
```

**EC-3: Multiple Message Types**
```javascript
messages = [
  { type: 'user', text: 'Question' },
  { type: 'text', text: 'Answer' }
]
// Should: Extract 'Answer', ignore 'Question'
```

**EC-4: Whitespace-Only Text**
```javascript
messages = [{ type: 'text', text: '   \n\n   ' }]
// Should: Return empty string after trim
```

**EC-5: Mixed Valid and Invalid Messages**
```javascript
messages = [
  { type: 'assistant', text: 'Valid response' },
  { type: 'text', text: null }
]
// Should: Extract 'Valid response', skip null
```

### Constraints

**C-1: Token Optimization**
- Must NOT increase token usage
- Lightweight system prompts remain lightweight
- No additional SDK calls

**C-2: Response Time**
- Extraction must complete in < 10ms
- No synchronous file operations
- No network calls during extraction

**C-3: Memory Usage**
- No message duplication
- Efficient string concatenation
- No memory leaks

---

# PHASE 2: PSEUDOCODE

## 2.1 Algorithm Design

### High-Level Algorithm

```
FUNCTION extractFromTextMessages(messages, result = null):
  // Validate input
  IF messages is null OR messages is not array:
    RETURN checkDirectResponse(result)

  IF messages is empty:
    RETURN checkDirectResponse(result)

  // Try extraction methods in order of likelihood
  extractedText = tryAssistantMessages(messages)
  IF extractedText is not empty:
    RETURN extractedText

  extractedText = tryTextMessages(messages)
  IF extractedText is not empty:
    RETURN extractedText

  extractedText = tryRoleBasedMessages(messages)
  IF extractedText is not empty:
    RETURN extractedText

  extractedText = tryAllMessages(messages)
  IF extractedText is not empty:
    RETURN extractedText

  // Final fallback
  RETURN checkDirectResponse(result)
END FUNCTION
```

### Detailed Extraction Methods

#### Method 1: Assistant Messages (Existing)
```
FUNCTION tryAssistantMessages(messages):
  assistantMessages = FILTER messages WHERE type === 'assistant'

  IF assistantMessages is empty:
    RETURN empty string

  texts = []
  FOR EACH message IN assistantMessages:
    text = extractTextFromMessage(message)
    IF text is not empty:
      ADD text TO texts

  RETURN JOIN texts WITH '\n\n' AND TRIM
END FUNCTION
```

#### Method 2: Text Messages (NEW - System Identities)
```
FUNCTION tryTextMessages(messages):
  textMessages = FILTER messages WHERE type === 'text' OR message has text property

  IF textMessages is empty:
    RETURN empty string

  texts = []
  FOR EACH message IN textMessages:
    text = extractTextFromMessage(message)
    IF text is not empty:
      ADD text TO texts

  RETURN JOIN texts WITH '\n\n' AND TRIM
END FUNCTION
```

#### Method 3: Role-Based Messages (NEW - Alternative Format)
```
FUNCTION tryRoleBasedMessages(messages):
  roleMessages = FILTER messages WHERE role === 'assistant'

  IF roleMessages is empty:
    RETURN empty string

  texts = []
  FOR EACH message IN roleMessages:
    text = extractTextFromMessage(message)
    IF text is not empty:
      ADD text TO texts

  RETURN JOIN texts WITH '\n\n' AND TRIM
END FUNCTION
```

#### Method 4: All Messages (NEW - Last Resort)
```
FUNCTION tryAllMessages(messages):
  texts = []
  FOR EACH message IN messages:
    // Skip user messages
    IF message.type === 'user' OR message.role === 'user':
      CONTINUE

    text = extractTextFromMessage(message)
    IF text is not empty:
      ADD text TO texts

  RETURN JOIN texts WITH '\n\n' AND TRIM
END FUNCTION
```

#### Method 5: Direct Response (NEW - Final Fallback)
```
FUNCTION checkDirectResponse(result):
  IF result is null:
    RETURN empty string

  IF result.response exists AND is string:
    RETURN TRIM result.response

  RETURN empty string
END FUNCTION
```

### Helper Function: Extract Text from Message
```
FUNCTION extractTextFromMessage(message):
  // Handle string messages
  IF message is string:
    RETURN message

  // Try direct text property
  IF message.text exists AND is string:
    RETURN message.text

  // Try content property (various formats)
  IF message.content exists:
    IF content is string:
      RETURN content

    IF content is array:
      textBlocks = FILTER content WHERE type === 'text'
      texts = MAP textBlocks TO text property
      RETURN JOIN texts WITH '\n'

  // Try nested message.content
  IF message.message.content exists:
    RETURN message.message.content

  RETURN empty string
END FUNCTION
```

## 2.2 Complexity Analysis

**Time Complexity**: O(n * m)
- n = number of messages (typically 1-5)
- m = average text length (typically < 1000 chars)
- Worst case: 5 methods * 5 messages * 1000 chars = 25,000 operations
- Actual: Usually first method succeeds = 5 messages * 1000 chars = 5,000 operations

**Space Complexity**: O(n)
- Filtered arrays: O(n) for each method
- Extracted texts: O(n) strings
- Final concatenation: O(n) total text length
- No recursive calls or large allocations

**Performance**: < 10ms for typical cases

## 2.3 Data Flow

### Input Data Structures
```javascript
// Format 1: Assistant messages (existing)
messages = [
  {
    type: 'assistant',
    text: 'Response text',
    content: 'Alternative format'
  }
]

// Format 2: Text messages (system identities)
messages = [
  {
    type: 'text',
    text: 'System identity response'
  }
]

// Format 3: Role-based messages
messages = [
  {
    role: 'assistant',
    content: [
      { type: 'text', text: 'Block 1' },
      { type: 'text', text: 'Block 2' }
    ]
  }
]

// Format 4: Direct response
result = {
  success: true,
  response: 'Direct response text',
  messages: []
}
```

### Output Data Structure
```javascript
// Success case
extractedText = "Multi-line response\n\nWith paragraphs"

// Failure case
extractedText = ""
```

---

# PHASE 3: ARCHITECTURE

## 3.1 Component Architecture

### Current Architecture
```
┌─────────────────────────────────────────────────────┐
│                    Client Browser                    │
│  (User replies to Avi comment)                      │
└────────────────────┬────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────┐
│                   API Server                         │
│  POST /api/posts/:postId/comments                   │
│  - Creates work ticket                              │
│  - assigned_agent: null                             │
└────────────────────┬────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────┐
│              Work Orchestrator                       │
│  - Assigns to 'avi' (default)                       │
│  - Creates AgentWorker                              │
└────────────────────┬────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────┐
│               AgentWorker                           │
│  processComment()                                   │
│    ├─> invokeAgent(prompt)                         │
│    │     ├─> getSystemPrompt('avi')                │
│    │     ├─> sdkManager.executeHeadlessTask()      │
│    │     └─> extractFromTextMessages() ← BUG HERE │
│    └─> createComment(response)                     │
└─────────────────────────────────────────────────────┘
```

### Fixed Architecture
```
┌─────────────────────────────────────────────────────┐
│               AgentWorker (FIXED)                   │
│  processComment()                                   │
│    ├─> invokeAgent(prompt)                         │
│    │     ├─> getSystemPrompt('avi')                │
│    │     ├─> sdkManager.executeHeadlessTask()      │
│    │     └─> extractFromTextMessages(msgs, result) │
│    │           ├─> tryAssistantMessages()          │
│    │           ├─> tryTextMessages() ← NEW         │
│    │           ├─> tryRoleBasedMessages() ← NEW    │
│    │           ├─> tryAllMessages() ← NEW          │
│    │           └─> checkDirectResponse() ← NEW     │
│    └─> createComment(actualResponse) ✅            │
└─────────────────────────────────────────────────────┘
```

## 3.2 Method Signature Changes

### Before
```javascript
/**
 * Extract intelligence from text messages
 * @param {Array} messages - SDK response messages
 * @returns {string} Extracted intelligence
 */
extractFromTextMessages(messages) {
  // Only handles assistant messages
}
```

### After
```javascript
/**
 * Extract intelligence from text messages with multi-format support
 * @param {Array} messages - SDK response messages
 * @param {Object} result - Full SDK result object (optional)
 * @returns {string} Extracted intelligence
 */
extractFromTextMessages(messages, result = null) {
  // Handles multiple message formats + direct response
}
```

### Caller Changes
```javascript
// Before
const messages = result.messages || [];
const response = this.extractFromTextMessages(messages);

// After
const messages = result.messages || [];
const response = this.extractFromTextMessages(messages, result);
```

## 3.3 Integration Points

### Upstream Dependencies
1. **Claude Code SDK Manager**
   - `executeHeadlessTask(prompt)` → returns `{ success, messages, response }`
   - NO CHANGES REQUIRED

2. **System Identity Module**
   - `getSystemPrompt(agentId)` → returns lightweight prompt
   - NO CHANGES REQUIRED

### Downstream Dependencies
1. **Comment Creation**
   - Receives extracted text
   - NO CHANGES REQUIRED

2. **WebSocket Broadcasting**
   - Sends comment to clients
   - NO CHANGES REQUIRED

### Modified Components
1. **agent-worker.js**
   - `extractFromTextMessages()` - ENHANCED
   - `invokeAgent()` - UPDATED (pass full result)
   - `processURL()` - UPDATED (pass full result)

## 3.4 Error Handling Strategy

### Error Categories

**E-1: Empty Messages**
```javascript
if (!messages || messages.length === 0) {
  console.debug('ℹ️ No messages array, checking direct response');
  return checkDirectResponse(result);
}
```

**E-2: Invalid Message Format**
```javascript
if (!extractedText || extractedText.trim() === '') {
  console.warn('⚠️ Extraction method failed, trying next');
  // Continue to next method
}
```

**E-3: All Methods Failed**
```javascript
if (finalText === '') {
  console.error('❌ Failed to extract from all methods');
  console.error('   Message types:', messages.map(m => m.type));
  console.error('   Result keys:', Object.keys(result || {}));
  // Return empty string (caller handles fallback)
}
```

**E-4: SDK Failure (Already Handled)**
```javascript
if (!result.success) {
  throw new Error(`Claude Code SDK execution failed: ${result.error}`);
}
```

## 3.5 Testing Architecture

### Test Layers

**Layer 1: Unit Tests**
- Test each extraction method independently
- Test edge cases (empty, null, malformed)
- Test message format variations
- Target: 95% code coverage

**Layer 2: Integration Tests**
- Test full invokeAgent() flow
- Test with real SDK responses (mocked)
- Test system identity responses
- Target: 90% path coverage

**Layer 3: Manual Tests**
- Test comment replies in browser
- Test direct questions (regression)
- Test UI updates
- Target: 100% user flow coverage

### Test Data Sets

**Dataset 1: Assistant Messages (Existing)**
```javascript
[
  { type: 'assistant', text: 'Response' },
  { type: 'assistant', content: 'Response' },
  { type: 'assistant', content: [{ type: 'text', text: 'Block' }] }
]
```

**Dataset 2: Text Messages (System Identities)**
```javascript
[
  { type: 'text', text: 'System response' },
  { type: 'text', text: '  Whitespace response  ' },
  { text: 'No type property' }
]
```

**Dataset 3: Role-Based Messages**
```javascript
[
  { role: 'assistant', content: 'Response' },
  { role: 'assistant', message: { content: 'Nested' } }
]
```

**Dataset 4: Direct Response**
```javascript
{
  success: true,
  response: 'Direct response',
  messages: []
}
```

**Dataset 5: Mixed/Edge Cases**
```javascript
[
  { type: 'user', text: 'Should be ignored' },
  { type: 'text', text: null },
  { type: 'assistant', text: '   ' },
  { type: 'text', text: 'Valid response' }
]
```

---

# PHASE 4: REFINEMENT (TDD Plan)

## 4.1 Test-Driven Development Strategy

### TDD Cycle
```
RED → GREEN → REFACTOR → REPEAT
```

### Test Suite Structure
```
tests/unit/agent-worker-extraction.test.js
  ├─ describe('extractFromTextMessages - Method 1: Assistant')
  │    ├─ it('extracts from assistant type messages')
  │    ├─ it('handles text property')
  │    ├─ it('handles content property (string)')
  │    ├─ it('handles content property (array)')
  │    └─ it('handles nested message.content')
  │
  ├─ describe('extractFromTextMessages - Method 2: Text')
  │    ├─ it('extracts from text type messages')
  │    ├─ it('extracts from messages with text property')
  │    └─ it('trims whitespace correctly')
  │
  ├─ describe('extractFromTextMessages - Method 3: Role-Based')
  │    ├─ it('extracts from role=assistant messages')
  │    └─ it('handles content variations')
  │
  ├─ describe('extractFromTextMessages - Method 4: All Messages')
  │    ├─ it('extracts from any message with text')
  │    ├─ it('ignores user messages')
  │    └─ it('handles mixed message types')
  │
  ├─ describe('extractFromTextMessages - Method 5: Direct Response')
  │    ├─ it('extracts from result.response')
  │    ├─ it('handles null result')
  │    └─ it('handles missing response property')
  │
  ├─ describe('extractFromTextMessages - Edge Cases')
  │    ├─ it('handles null messages')
  │    ├─ it('handles empty array')
  │    ├─ it('handles whitespace-only text')
  │    ├─ it('handles multiple valid messages')
  │    └─ it('handles all invalid messages')
  │
  └─ describe('extractFromTextMessages - Integration')
       ├─ it('tries methods in correct order')
       ├─ it('stops at first successful method')
       ├─ it('falls through all methods if needed')
       └─ it('returns empty string if all fail')
```

## 4.2 Test Implementation Order

### Phase 1: Existing Behavior (5 tests)
**Goal**: Ensure backward compatibility
```javascript
✓ Extract from assistant messages (existing)
✓ Handle text property (existing)
✓ Handle content string (existing)
✓ Handle content array (existing)
✓ Handle nested content (existing)
```

### Phase 2: System Identity Support (5 tests)
**Goal**: Support new message format
```javascript
✓ Extract from text type messages
✓ Extract from messages with text property
✓ Trim whitespace correctly
✓ Ignore empty text messages
✓ Handle multiple text messages
```

### Phase 3: Alternative Formats (5 tests)
**Goal**: Handle edge cases
```javascript
✓ Extract from role-based messages
✓ Extract from direct response
✓ Handle null result gracefully
✓ Ignore user messages
✓ Handle mixed message types
```

### Phase 4: Error Cases (5 tests)
**Goal**: Graceful degradation
```javascript
✓ Handle null messages
✓ Handle empty array
✓ Handle whitespace-only text
✓ Handle all invalid messages
✓ Return empty string appropriately
```

### Phase 5: Integration (5 tests)
**Goal**: End-to-end correctness
```javascript
✓ Try methods in correct order
✓ Stop at first success
✓ Fall through to last method
✓ Work with real SDK response formats
✓ Maintain performance under 10ms
```

## 4.3 Test Examples

### Test 1: Assistant Messages (Existing - Should Pass)
```javascript
describe('Method 1: Assistant Messages', () => {
  it('should extract text from assistant type messages', () => {
    const worker = new AgentWorker({ agentId: 'test-agent' });
    const messages = [
      { type: 'assistant', text: 'Test response' }
    ];

    const result = worker.extractFromTextMessages(messages);

    expect(result).toBe('Test response');
  });
});
```

### Test 2: Text Messages (NEW - Should Fail Before Fix)
```javascript
describe('Method 2: Text Messages', () => {
  it('should extract text from text type messages', () => {
    const worker = new AgentWorker({ agentId: 'avi' });
    const messages = [
      { type: 'text', text: 'System identity response' }
    ];

    const result = worker.extractFromTextMessages(messages);

    expect(result).toBe('System identity response');
  });
});
```

### Test 3: Direct Response (NEW - Should Fail Before Fix)
```javascript
describe('Method 5: Direct Response', () => {
  it('should extract from result.response when messages empty', () => {
    const worker = new AgentWorker({ agentId: 'avi' });
    const messages = [];
    const sdkResult = { response: 'Direct response text' };

    const result = worker.extractFromTextMessages(messages, sdkResult);

    expect(result).toBe('Direct response text');
  });
});
```

### Test 4: Fallback Chain (NEW - Integration Test)
```javascript
describe('Integration: Fallback Chain', () => {
  it('should try methods in order until success', () => {
    const worker = new AgentWorker({ agentId: 'avi' });

    // No assistant messages, but has text message
    const messages = [
      { type: 'user', text: 'Question' },
      { type: 'text', text: 'Answer' }
    ];

    const result = worker.extractFromTextMessages(messages);

    // Should skip method 1 (no assistant)
    // Should succeed on method 2 (text message)
    expect(result).toBe('Answer');
  });
});
```

### Test 5: All Methods Fail (Edge Case)
```javascript
describe('Edge Case: All Methods Fail', () => {
  it('should return empty string when all methods fail', () => {
    const worker = new AgentWorker({ agentId: 'test' });

    const messages = [
      { type: 'system', status: 'ok' },
      { type: 'user', text: 'Question' }
    ];
    const sdkResult = { success: true };

    const result = worker.extractFromTextMessages(messages, sdkResult);

    expect(result).toBe('');
  });
});
```

## 4.4 Coverage Goals

| Metric | Target | Measurement |
|--------|--------|-------------|
| Line Coverage | 95% | Lines executed |
| Branch Coverage | 90% | All if/else paths |
| Function Coverage | 100% | All methods tested |
| Path Coverage | 85% | All code paths |

---

# PHASE 5: COMPLETION

## 5.1 Implementation Checklist

### Code Implementation
- [ ] Update `extractFromTextMessages()` signature to accept `result` parameter
- [ ] Implement Method 1: Assistant messages (enhance existing)
- [ ] Implement Method 2: Text messages (NEW)
- [ ] Implement Method 3: Role-based messages (NEW)
- [ ] Implement Method 4: All messages fallback (NEW)
- [ ] Implement Method 5: Direct response fallback (NEW)
- [ ] Add helper function `extractTextFromMessage()`
- [ ] Update `invokeAgent()` to pass full result
- [ ] Update `processURL()` to pass full result
- [ ] Add appropriate logging (debug, warn, error)

### Testing
- [ ] Write 25 unit tests (5 per phase)
- [ ] All tests pass (green)
- [ ] Coverage meets targets (95% line, 90% branch)
- [ ] Manual test: Comment reply to Avi
- [ ] Manual test: Direct question to Avi (regression)
- [ ] Manual test: Regular agent (regression)
- [ ] Performance test: Extraction < 10ms

### Documentation
- [ ] Update method JSDoc comments
- [ ] Add inline comments for each extraction method
- [ ] Document fallback logic
- [ ] Update API documentation (if applicable)

### Deployment
- [ ] Code review approval
- [ ] Merge to main branch
- [ ] Deploy to production
- [ ] Monitor error logs (24 hours)
- [ ] Verify user complaints resolved

## 5.2 Success Metrics

### Before Fix (Baseline)
```
Comment Reply Success Rate: 0%
User Complaints: High
Average Response Quality: "No summary available"
Avi Engagement Rate: Low
```

### After Fix (Target)
```
Comment Reply Success Rate: 99.9%
User Complaints: None
Average Response Quality: Equivalent to AVI DM
Avi Engagement Rate: Normal
```

### Monitoring Queries
```sql
-- Check for "No summary available" in recent comments
SELECT COUNT(*) as failed_responses
FROM comments
WHERE author_agent = 'avi'
  AND content = 'No summary available'
  AND created_at > NOW() - INTERVAL '24 hours';
-- Target: 0

-- Check Avi comment success rate
SELECT
  COUNT(*) as total_responses,
  SUM(CASE WHEN content != 'No summary available' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN content != 'No summary available' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM comments
WHERE author_agent = 'avi'
  AND created_at > NOW() - INTERVAL '24 hours';
-- Target: 99.9%+ success rate
```

## 5.3 Rollback Plan

### Rollback Triggers
1. Success rate drops below 95%
2. Existing agents break (regression)
3. Performance degrades > 50ms
4. New error patterns emerge

### Rollback Steps
```bash
# 1. Revert Git commit
git revert HEAD
git push origin main

# 2. Restart services
pm2 restart api-server

# 3. Verify rollback
curl https://api.example.com/health

# 4. Monitor logs
tail -f /var/log/api-server/error.log | grep "extractFromTextMessages"
```

### Rollback Time: < 5 minutes

## 5.4 Post-Deployment Validation

### Validation Checklist (First Hour)
- [ ] No errors in logs related to extraction
- [ ] Comment reply to Avi succeeds with actual content
- [ ] Direct question to Avi still works (regression check)
- [ ] Regular agents still work (regression check)
- [ ] WebSocket events still broadcast
- [ ] UI updates in real-time
- [ ] Performance metrics normal

### Validation Checklist (First 24 Hours)
- [ ] Zero "No summary available" comments from Avi
- [ ] User complaints resolved
- [ ] No new error patterns
- [ ] Success rate > 99%
- [ ] Average response time < baseline + 10ms

---

# APPENDIX A: Code Reference

## Current Code (Broken)
```javascript
// File: /api-server/worker/agent-worker.js
// Lines: 412-439

extractFromTextMessages(messages) {
  if (!messages || messages.length === 0) {
    return '';
  }

  const assistantMessages = messages.filter(m => m.type === 'assistant');

  const intelligence = assistantMessages
    .map(msg => {
      if (typeof msg === 'string') return msg;
      if (msg.text) return msg.text;
      if (msg.content) {
        if (typeof msg.content === 'string') return msg.content;
        if (Array.isArray(msg.content)) {
          return msg.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n');
        }
      }
      if (msg.message?.content) return msg.message.content;
      return '';
    })
    .filter(text => typeof text === 'string' && text.trim())
    .join('\n\n');

  return intelligence;
}
```

## Caller Code (Current)
```javascript
// File: /api-server/worker/agent-worker.js
// Lines: 714-724

const result = await sdkManager.executeHeadlessTask(fullPrompt);

if (!result.success) {
  throw new Error(`Claude Code SDK execution failed: ${result.error}`);
}

// Extract response from SDK result
const messages = result.messages || [];
const response = this.extractFromTextMessages(messages);

return response || 'No response available';
```

---

# APPENDIX B: Implementation Code (Solution)

## Enhanced Extraction Method
```javascript
/**
 * Extract intelligence from text messages with multi-format support
 * Tries multiple extraction methods in order of likelihood
 *
 * @param {Array} messages - SDK response messages
 * @param {Object} result - Full SDK result object (optional, for fallback)
 * @returns {string} Extracted intelligence or empty string
 */
extractFromTextMessages(messages, result = null) {
  // Validate input
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.debug('ℹ️ No messages array, checking direct response');
    if (result?.response && typeof result.response === 'string') {
      return result.response.trim();
    }
    return '';
  }

  // Method 1: Try assistant messages (existing logic - most common)
  const assistantMessages = messages.filter(m => m.type === 'assistant');
  if (assistantMessages.length > 0) {
    const intelligence = assistantMessages
      .map(msg => this._extractTextFromMessage(msg))
      .filter(text => text && text.trim())
      .join('\n\n')
      .trim();

    if (intelligence) {
      console.debug('✅ Extracted via Method 1 (assistant messages)');
      return intelligence;
    }
  }

  // Method 2: Try text messages (NEW - for system identities)
  const textMessages = messages.filter(m =>
    m.type === 'text' || (m.text && typeof m.text === 'string')
  );
  if (textMessages.length > 0) {
    const intelligence = textMessages
      .map(msg => this._extractTextFromMessage(msg))
      .filter(text => text && text.trim())
      .join('\n\n')
      .trim();

    if (intelligence) {
      console.debug('✅ Extracted via Method 2 (text messages)');
      return intelligence;
    }
  }

  // Method 3: Try role-based messages (alternative SDK format)
  const roleMessages = messages.filter(m => m.role === 'assistant');
  if (roleMessages.length > 0) {
    const intelligence = roleMessages
      .map(msg => this._extractTextFromMessage(msg))
      .filter(text => text && text.trim())
      .join('\n\n')
      .trim();

    if (intelligence) {
      console.debug('✅ Extracted via Method 3 (role-based messages)');
      return intelligence;
    }
  }

  // Method 4: Try all messages (excluding user messages)
  const allMessages = messages.filter(m =>
    m.type !== 'user' && m.role !== 'user'
  );
  if (allMessages.length > 0) {
    const intelligence = allMessages
      .map(msg => this._extractTextFromMessage(msg))
      .filter(text => text && text.trim())
      .join('\n\n')
      .trim();

    if (intelligence) {
      console.debug('⚠️ Extracted via Method 4 (all messages fallback)');
      return intelligence;
    }
  }

  // Method 5: Final fallback - direct response property
  if (result?.response && typeof result.response === 'string') {
    const intelligence = result.response.trim();
    if (intelligence) {
      console.debug('⚠️ Extracted via Method 5 (direct response fallback)');
      return intelligence;
    }
  }

  // All methods failed
  console.error('❌ Failed to extract text from all methods');
  console.error('   Message types:', messages.map(m => m.type || m.role || 'unknown'));
  console.error('   Has result.response:', !!result?.response);
  return '';
}

/**
 * Helper: Extract text from a single message (various formats)
 * @private
 * @param {Object|string} msg - Message object or string
 * @returns {string} Extracted text or empty string
 */
_extractTextFromMessage(msg) {
  // Handle string messages
  if (typeof msg === 'string') {
    return msg;
  }

  // Handle null/undefined
  if (!msg || typeof msg !== 'object') {
    return '';
  }

  // Try direct text property
  if (msg.text && typeof msg.text === 'string') {
    return msg.text;
  }

  // Try content property (various formats)
  if (msg.content) {
    // Content as string
    if (typeof msg.content === 'string') {
      return msg.content;
    }

    // Content as array of blocks
    if (Array.isArray(msg.content)) {
      return msg.content
        .filter(block => block && block.type === 'text')
        .map(block => block.text || '')
        .join('\n');
    }
  }

  // Try nested message.content
  if (msg.message?.content && typeof msg.message.content === 'string') {
    return msg.message.content;
  }

  return '';
}
```

## Updated Caller (invokeAgent)
```javascript
async invokeAgent(prompt) {
  // ... existing code ...

  const result = await sdkManager.executeHeadlessTask(fullPrompt);

  if (!result.success) {
    throw new Error(`Claude Code SDK execution failed: ${result.error}`);
  }

  // Extract response from SDK result (ENHANCED - pass full result)
  const messages = result.messages || [];
  const response = this.extractFromTextMessages(messages, result);

  if (!response || response === '') {
    console.warn('⚠️ No response extracted, returning fallback message');
  }

  return response || 'No response available';
}
```

---

# APPENDIX C: Verification Scripts

## Manual Test Script
```bash
#!/bin/bash
# test-avi-fix.sh

echo "Testing Avi Comment Reply Fix"
echo "=============================="

# 1. Get recent Avi comments
echo -e "\n1. Recent Avi comments:"
psql -d agent_feed -c "SELECT id, LEFT(content, 50) as content_preview, created_at FROM comments WHERE author_agent = 'avi' ORDER BY created_at DESC LIMIT 5;"

# 2. Check for failures
echo -e "\n2. Failed responses (should be 0):"
psql -d agent_feed -c "SELECT COUNT(*) as failures FROM comments WHERE author_agent = 'avi' AND content = 'No summary available' AND created_at > NOW() - INTERVAL '1 hour';"

# 3. Success rate
echo -e "\n3. Success rate (should be > 99%):"
psql -d agent_feed -c "SELECT ROUND(100.0 * SUM(CASE WHEN content != 'No summary available' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate FROM comments WHERE author_agent = 'avi' AND created_at > NOW() - INTERVAL '1 hour';"

echo -e "\n✅ Test complete"
```

## Automated Integration Test
```javascript
// test-avi-integration.js
import { AgentWorker } from '../api-server/worker/agent-worker.js';

async function testAviExtraction() {
  console.log('Testing Avi Message Extraction...\n');

  const worker = new AgentWorker({ agentId: 'avi' });
  let passed = 0;
  let failed = 0;

  // Test 1: Assistant message
  const test1 = worker.extractFromTextMessages([
    { type: 'assistant', text: 'Response 1' }
  ]);
  if (test1 === 'Response 1') {
    console.log('✅ Test 1 passed: Assistant message');
    passed++;
  } else {
    console.log('❌ Test 1 failed:', test1);
    failed++;
  }

  // Test 2: Text message (system identity)
  const test2 = worker.extractFromTextMessages([
    { type: 'text', text: 'Response 2' }
  ]);
  if (test2 === 'Response 2') {
    console.log('✅ Test 2 passed: Text message');
    passed++;
  } else {
    console.log('❌ Test 2 failed:', test2);
    failed++;
  }

  // Test 3: Direct response
  const test3 = worker.extractFromTextMessages([], { response: 'Response 3' });
  if (test3 === 'Response 3') {
    console.log('✅ Test 3 passed: Direct response');
    passed++;
  } else {
    console.log('❌ Test 3 failed:', test3);
    failed++;
  }

  // Test 4: Empty (should return empty string)
  const test4 = worker.extractFromTextMessages([]);
  if (test4 === '') {
    console.log('✅ Test 4 passed: Empty messages');
    passed++;
  } else {
    console.log('❌ Test 4 failed:', test4);
    failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

testAviExtraction();
```

---

# APPENDIX D: Risk Assessment

## Risk Matrix

| Risk | Likelihood | Impact | Severity | Mitigation |
|------|-----------|--------|----------|------------|
| Breaking existing agents | LOW | HIGH | MEDIUM | Comprehensive testing, fallback logic |
| Performance degradation | LOW | MEDIUM | LOW | Complexity analysis, performance tests |
| Incomplete extraction | MEDIUM | HIGH | MEDIUM | 5 fallback methods, extensive logging |
| Deployment issues | LOW | LOW | LOW | Standard deployment, easy rollback |
| Regression in AVI DM | VERY LOW | MEDIUM | LOW | No changes to AVI DM code path |

## Risk Mitigation Strategies

### R-1: Breaking Existing Agents
**Mitigation**:
- Keep Method 1 (assistant messages) identical to existing logic
- Add new methods only as fallbacks
- Test all agent types (not just Avi)
- Monitor error logs for 24 hours post-deployment

### R-2: Performance Degradation
**Mitigation**:
- Optimize method order (most likely first)
- Short-circuit on first success
- Avoid expensive operations (regex, file I/O)
- Performance benchmark tests

### R-3: Incomplete Extraction
**Mitigation**:
- 5 different extraction methods
- Comprehensive fallback chain
- Detailed error logging
- Manual testing with real data

### R-4: Deployment Issues
**Mitigation**:
- Single file change
- No database migrations
- No config changes
- Easy rollback (< 5 minutes)

---

# SUMMARY

## What We're Fixing
Avi responds with "No summary available" when replying to comments because `extractFromTextMessages()` only handles `type='assistant'` messages, but system identity responses have `type='text'`.

## How We're Fixing It
Enhance `extractFromTextMessages()` to try 5 different extraction methods:
1. Assistant messages (existing)
2. Text messages (NEW - system identities)
3. Role-based messages (NEW - alternative format)
4. All messages (NEW - fallback)
5. Direct response (NEW - final fallback)

## Why It's Safe
- Only enhances existing logic (doesn't break anything)
- Multiple fallback methods (more resilient)
- Single file change (easy to rollback)
- Comprehensive testing (25 unit tests, manual tests)
- Low risk, high impact fix

## Success Criteria
- ✅ Comment replies to Avi work (actual content, not "No summary available")
- ✅ Direct questions to Avi still work (no regression)
- ✅ Regular agents still work (no regression)
- ✅ 99.9%+ success rate
- ✅ No new errors

## Timeline
- Implementation: 30 minutes
- Testing: 15 minutes
- Total: 45 minutes

---

**Status**: ✅ SPECIFICATION COMPLETE - READY FOR IMPLEMENTATION
**Next Phase**: Begin TDD implementation with Phase 1 tests
**Approval**: Awaiting sign-off to proceed
