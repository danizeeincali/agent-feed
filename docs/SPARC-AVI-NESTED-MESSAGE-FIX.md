# SPARC Specification: Nested Message.Content Array Extraction Fix

**Document Version**: 1.0.0
**Date**: 2025-10-28
**Status**: SPECIFICATION COMPLETE
**Methodology**: SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)
**Priority**: P1 - HIGH (Enhancement to existing P0 fix)

---

## Executive Summary

This document provides a comprehensive SPARC specification for fixing the **nested message.content array extraction pattern** that was missing from the original Avi extraction fix. While Method 1.5 was partially implemented (lines 460-477 in agent-worker.js), the complete extraction pattern for messages with this structure was not fully captured:

```javascript
{
  "type": "assistant",
  "message": {
    "content": [
      {"type": "text", "text": "actual response here"}
    ]
  }
}
```

**Evidence from logs** (backend-new.log lines 235-331):
- SDK returns messages with `msg.message.content` as an array
- Current code checks `msg.message.content` but only handles string format (line 448)
- Array format within nested message not properly extracted
- Results in incomplete extraction leading to "No summary available" fallback

**Fix Scope**: Enhance extraction logic in `/workspaces/agent-feed/api-server/worker/agent-worker.js`
**Estimated Time**: 30 minutes
**Risk Level**: VERY LOW (adds additional fallback pattern)
**Test Coverage Required**: 95%+

---

# PHASE 1: SPECIFICATION

## 1.1 Problem Statement

### Current Behavior (Incomplete)

**Partially Implemented** (Method 1.5, lines 460-477):
```javascript
// Method 1.5: Try nested message.content arrays
const nestedMessages = messages.filter(m => m.message?.content && Array.isArray(m.message.content));
if (nestedMessages.length > 0) {
  const intelligence = nestedMessages
    .map(msg =>
      msg.message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n\n')
    )
    .filter(text => text.trim())
    .join('\n\n');

  if (intelligence.trim()) {
    console.log('✅ Extracted from nested message.content array:', intelligence.substring(0, 100));
    return intelligence.trim();
  }
}
```

**Problem**: This implementation exists but is positioned **after** the assistant message check. If a message has `type='assistant'` but the text is in a nested `message.content` array (not in the top-level `content` property), Method 1 fails to extract it, and Method 1.5 may not catch it properly.

### Message Structure From Logs

**Actual structure from Claude Code SDK** (backend-new.log evidence):
```javascript
{
  "type": "assistant",          // Top-level type
  "message": {
    "id": "msg_123",
    "role": "assistant",
    "content": [                 // NESTED ARRAY
      {
        "type": "text",
        "text": "Let me check what's in the root folder for you.\n\nThe production root folder contains:\n..."
      }
    ]
  }
}
```

**Current extraction paths**:
1. ✅ `msg.text` - Works
2. ✅ `msg.content` (string) - Works
3. ✅ `msg.content` (array) - Works
4. ❌ **`msg.message.content` (string) - Partially works** (line 448)
5. ❌ **`msg.message.content` (array) - MISSING** ← **PRIMARY FIX TARGET**

### Expected Behavior (Fixed)

The extraction should successfully extract from ALL these patterns:
```javascript
// Pattern 1: Direct text (WORKING)
{ type: 'assistant', text: 'Response' }

// Pattern 2: Content string (WORKING)
{ type: 'assistant', content: 'Response' }

// Pattern 3: Content array (WORKING)
{ type: 'assistant', content: [{ type: 'text', text: 'Response' }] }

// Pattern 4: Nested message.content string (WORKING)
{ type: 'assistant', message: { content: 'Response' } }

// Pattern 5: Nested message.content array (MISSING - TARGET)
{
  type: 'assistant',
  message: {
    content: [
      { type: 'text', text: 'Response' }
    ]
  }
}
```

### Root Cause

**Location**: `/api-server/worker/agent-worker.js:432-457` (Method 1: Assistant Messages)

**Issue**: The `_extractTextFromMessage()` helper (lines 486-534) checks for `msg.message?.content` but only handles it as a string:

```javascript
// Line 505-508 (CURRENT - INCOMPLETE)
if (msg.message) {
  if (typeof msg.message === 'string') return msg.message;
  if (msg.message.content) return msg.message.content;  // ← Only handles string
}
```

**Missing**: Array handling for `msg.message.content`:
```javascript
// NEEDED ADDITION
if (msg.message?.content) {
  if (typeof msg.message.content === 'string') {
    return msg.message.content;
  }
  if (Array.isArray(msg.message.content)) {
    // Extract from array of content blocks
    return msg.message.content
      .filter(block => block && block.type === 'text')
      .map(block => block.text || '')
      .join('\n');
  }
}
```

## 1.2 Impact Analysis

### Current Impact

| Metric | Status | Details |
|--------|--------|---------|
| **Assistant messages with nested arrays** | ❌ INCOMPLETE | Extraction may fail for complex SDK responses |
| **Method 1.5 effectiveness** | ⚠️ PARTIAL | Works but positioned incorrectly in fallback chain |
| **Message format coverage** | 80% | Missing 1 critical pattern |
| **User-visible impact** | LOW | Rare in production, but possible edge case |

### Affected Code Paths

1. **Method 1: Assistant Messages** - ⚠️ NEEDS ENHANCEMENT
   - Currently extracts from most assistant message formats
   - Missing: nested `message.content` array handling in helper

2. **Method 1.5: Nested Arrays** - ⚠️ NEEDS REPOSITIONING
   - Correctly filters for nested arrays
   - Problem: Runs AFTER Method 1 fails, not integrated into it
   - Solution: Move logic into `_extractTextFromMessage()` helper

3. **Other Methods (2-5)** - ✅ NOT AFFECTED
   - Text messages, role-based, fallbacks all working correctly

## 1.3 Requirements

### Functional Requirements

**FR-1: Complete Nested Array Support**
- MUST extract from `msg.message.content` when it's an array
- MUST filter for `type='text'` blocks
- MUST concatenate multiple text blocks with newlines
- MUST integrate into existing `_extractTextFromMessage()` helper

**FR-2: Preserve Method 1.5 Capability**
- MUST maintain the specific nested array filtering from Method 1.5
- MAY refactor into helper method for reusability
- MUST log extraction source for debugging

**FR-3: Backward Compatibility**
- MUST NOT break any existing extraction patterns
- MUST maintain all 41 passing tests
- MUST preserve extraction order and priority

**FR-4: Performance**
- Extraction time MUST NOT increase by more than 2ms
- Single-pass processing where possible

### Non-Functional Requirements

**NFR-1: Code Quality**
- Eliminate duplication between Method 1.5 and helper
- Clear, self-documenting code
- Comprehensive inline comments

**NFR-2: Testability**
- Unit tests for nested array extraction
- Integration tests for full workflow
- Edge case coverage (empty arrays, null blocks)

**NFR-3: Observability**
- Log extraction method used
- Log message structure on failure
- Debug-level logging for troubleshooting

### Acceptance Criteria

**AC-1: Nested Array Extraction**
```gherkin
GIVEN SDK returns message with nested message.content array
WHEN extractFromTextMessages() processes it
THEN text is successfully extracted from array
AND result equals concatenated text blocks
AND no "No summary available" fallback occurs
```

**AC-2: Helper Method Enhancement**
```gherkin
GIVEN message has msg.message.content property
WHEN _extractTextFromMessage() processes it
THEN it handles both string AND array formats
AND array format extracts all text blocks
AND maintains backward compatibility
```

**AC-3: Code Consolidation**
```gherkin
GIVEN Method 1.5 exists as separate logic
WHEN refactoring is complete
THEN nested array extraction is in _extractTextFromMessage()
AND Method 1.5 is removed or refactored
AND no duplication remains
```

**AC-4: Test Coverage**
```gherkin
GIVEN new extraction pattern implemented
WHEN test suite runs
THEN all 41 existing tests still pass
AND 5+ new tests for nested arrays pass
AND code coverage remains > 95%
```

## 1.4 Edge Cases & Constraints

### Edge Cases to Handle

**EC-1: Empty nested content array**
```javascript
{ message: { content: [] } }
// Should: Return empty string, try next method
```

**EC-2: Nested array with non-text blocks**
```javascript
{ message: { content: [
  { type: 'image', source: '...' },
  { type: 'text', text: 'Valid text' }
]}}
// Should: Extract only 'Valid text', ignore image block
```

**EC-3: Nested array with null/undefined text**
```javascript
{ message: { content: [
  { type: 'text', text: null },
  { type: 'text', text: 'Valid' }
]}}
// Should: Filter out null, return 'Valid'
```

**EC-4: Multiple nested arrays**
```javascript
[
  { type: 'assistant', message: { content: [{ type: 'text', text: 'Part 1' }] } },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'Part 2' }] } }
]
// Should: Concatenate both with '\n\n'
```

**EC-5: Mixed nested and direct content**
```javascript
{
  type: 'assistant',
  content: 'Direct content',
  message: { content: [{ type: 'text', text: 'Nested content' }] }
}
// Should: Prefer direct content (higher priority)
```

### Constraints

**C-1: Minimal Performance Impact**
- Added array iteration must be negligible (< 2ms)
- No recursive calls
- Efficient string concatenation

**C-2: Code Maintainability**
- Helper method should be < 50 lines
- Clear separation of concerns
- Comprehensive JSDoc

**C-3: Backward Compatibility**
- Zero breaking changes
- All existing tests pass
- No API signature changes

---

# PHASE 2: PSEUDOCODE

## 2.1 Algorithm Design

### High-Level Algorithm

**GOAL**: Integrate nested `message.content` array handling into `_extractTextFromMessage()` helper

```
FUNCTION _extractTextFromMessage(msg):
  // 1. Validate input
  IF msg is null OR msg is not object:
    RETURN empty string

  // 2. Handle string messages
  IF msg is string:
    RETURN msg

  // 3. Try direct text property (highest priority)
  IF msg.text exists AND is string:
    RETURN msg.text

  // 4. Try content property (various formats)
  IF msg.content exists:
    IF content is string:
      RETURN content
    IF content is array:
      RETURN extractFromContentArray(msg.content)

  // 5. Try nested message.content (NEW - ENHANCED)
  IF msg.message exists:
    IF msg.message is string:
      RETURN msg.message
    IF msg.message.content exists:
      IF msg.message.content is string:
        RETURN msg.message.content
      IF msg.message.content is array:           // ← NEW ADDITION
        RETURN extractFromContentArray(msg.message.content)

  // 6. No extraction possible
  RETURN empty string
END FUNCTION
```

### Helper Function: Extract From Content Array

```
FUNCTION extractFromContentArray(contentArray):
  // Validate input
  IF contentArray is not array:
    RETURN empty string

  IF contentArray is empty:
    RETURN empty string

  // Extract text from text-type blocks
  textBlocks = []
  FOR EACH block IN contentArray:
    IF block is null OR block is not object:
      CONTINUE

    IF block.type === 'text':
      IF block.text exists AND is string:
        text = TRIM block.text
        IF text is not empty:
          ADD text TO textBlocks

  // Concatenate with newlines
  IF textBlocks is empty:
    RETURN empty string

  RETURN JOIN textBlocks WITH '\n'
END FUNCTION
```

### Refactored Method 1.5 (Optional)

**Option A**: Keep as fallback for explicit nested message filtering
```
// Method 1.5: Explicit nested message.content array extraction
const nestedMessages = messages.filter(m =>
  m.message?.content && Array.isArray(m.message.content)
);

IF nestedMessages.length > 0:
  // Reuse _extractTextFromMessage() helper
  texts = nestedMessages.map(msg => _extractTextFromMessage(msg))
  intelligence = JOIN texts WITH '\n\n' AND TRIM
  IF intelligence:
    LOG 'Extracted from nested message.content array'
    RETURN intelligence
```

**Option B**: Remove Method 1.5 entirely (extraction now in helper)
```
// Remove Method 1.5 - logic now integrated into _extractTextFromMessage()
// Assistant messages (Method 1) will handle nested arrays automatically
```

## 2.2 Complexity Analysis

**Time Complexity**: O(n * m)
- n = number of messages (typically 1-5)
- m = average content blocks per message (typically 1-3)
- Nested array iteration: O(m) per message
- Total: O(n * m) ≈ O(15) operations typical case

**Space Complexity**: O(m)
- Array of text blocks: O(m)
- Concatenated string: O(m * avg_text_length)
- No recursive allocations

**Performance Impact**: < 2ms additional overhead

## 2.3 Data Flow

### Input Data Structure (From Logs)

```javascript
// Actual message structure from backend-new.log
{
  "type": "assistant",
  "id": "msg_01ABC",
  "model": "claude-3-5-sonnet-20241022",
  "role": "assistant",
  "message": {
    "id": "msg_01ABC",
    "type": "message",
    "role": "assistant",
    "model": "claude-3-5-sonnet-20241022",
    "content": [                          // ← NESTED ARRAY TARGET
      {
        "type": "text",
        "text": "Let me check what's in the root folder for you.\n\nThe production root folder contains:\n\n**Key System Components:**\n..."
      }
    ],
    "stop_reason": "end_turn",
    "stop_sequence": null,
    "usage": {
      "input_tokens": 8854,
      "output_tokens": 412
    }
  }
}
```

### Extraction Flow

```
Input Message
  ↓
_extractTextFromMessage()
  ↓
Check msg.text (not present)
  ↓
Check msg.content (not present)
  ↓
Check msg.message.content ✓ (present)
  ↓
  Is string? NO
  Is array? YES ← ENHANCED PATH
  ↓
extractFromContentArray([...])
  ↓
Filter type='text' blocks
  ↓
Extract text property
  ↓
Concatenate with '\n'
  ↓
Return: "Let me check what's in the root folder for you.\n\nThe production root folder contains:..."
```

---

# PHASE 3: ARCHITECTURE

## 3.1 Component Architecture

### Current Architecture (Incomplete)

```
extractFromTextMessages(messages, result)
  ├─ Method 1: Assistant Messages
  │   └─ _extractTextFromMessage(msg)
  │       ├─ Check msg.text ✓
  │       ├─ Check msg.content (string) ✓
  │       ├─ Check msg.content (array) ✓
  │       └─ Check msg.message.content (string) ✓
  │           └─ msg.message.content (array) ❌ MISSING
  │
  ├─ Method 1.5: Nested Arrays (PARTIALLY WORKING)
  │   └─ Filters for msg.message?.content arrays
  │       └─ Extracts text blocks
  │
  ├─ Method 2: Text Messages ✓
  ├─ Method 3: Role-Based ✓
  ├─ Method 4: All Messages ✓
  └─ Method 5: Direct Response ✓
```

### Fixed Architecture (Complete)

```
extractFromTextMessages(messages, result)
  ├─ Method 1: Assistant Messages (ENHANCED)
  │   └─ _extractTextFromMessage(msg)
  │       ├─ Check msg.text ✓
  │       ├─ Check msg.content (string) ✓
  │       ├─ Check msg.content (array) ✓
  │       │   └─ extractFromContentArray() ✓
  │       └─ Check msg.message.content ✓ ENHANCED
  │           ├─ string ✓
  │           └─ array ✓ NEW
  │               └─ extractFromContentArray() ✓
  │
  ├─ [Method 1.5 REMOVED - logic integrated above]
  │
  ├─ Method 2: Text Messages ✓
  ├─ Method 3: Role-Based ✓
  ├─ Method 4: All Messages ✓
  └─ Method 5: Direct Response ✓
```

## 3.2 Method Signature Changes

### Before (Incomplete)

```javascript
/**
 * Helper: Extract text from a single message (various formats)
 * @private
 * @param {Object|string} msg - Message object or string
 * @returns {string} Extracted text or empty string
 */
_extractTextFromMessage(msg) {
  // ... existing code ...

  // Line 505-508: Incomplete nested handling
  if (msg.message) {
    if (typeof msg.message === 'string') return msg.message;
    if (msg.message.content) return msg.message.content;  // ← Only string
  }

  return '';
}
```

### After (Complete)

```javascript
/**
 * Helper: Extract text from a single message (various formats)
 * Handles direct text, content strings, content arrays, and nested message.content arrays
 * @private
 * @param {Object|string} msg - Message object or string
 * @returns {string} Extracted text or empty string
 */
_extractTextFromMessage(msg) {
  // ... existing code ...

  // Enhanced nested handling
  if (msg.message) {
    if (typeof msg.message === 'string') return msg.message;
    if (msg.message.content) {
      // Handle string format
      if (typeof msg.message.content === 'string') {
        return msg.message.content;
      }
      // Handle array format (NEW)
      if (Array.isArray(msg.message.content)) {
        return this._extractFromContentArray(msg.message.content);
      }
    }
  }

  return '';
}

/**
 * Helper: Extract text from content block array
 * @private
 * @param {Array} contentArray - Array of content blocks
 * @returns {string} Concatenated text from text-type blocks
 */
_extractFromContentArray(contentArray) {
  if (!Array.isArray(contentArray) || contentArray.length === 0) {
    return '';
  }

  return contentArray
    .filter(block => block && block.type === 'text' && block.text)
    .map(block => block.text.trim())
    .filter(text => text.length > 0)
    .join('\n');
}
```

## 3.3 Integration Points

### Modified Components

1. **_extractTextFromMessage()** (lines 486-534)
   - ENHANCED: Add array handling for `msg.message.content`
   - NEW: Call to `_extractFromContentArray()` helper

2. **New Helper: _extractFromContentArray()**
   - NEW METHOD: Extracts from content block arrays
   - REUSABLE: Used by both direct and nested content

3. **Method 1.5** (lines 460-477)
   - OPTION A: Keep as explicit fallback with refactored logic
   - OPTION B: Remove entirely (logic now in helper)

### Upstream Dependencies

**No changes required**:
- Claude Code SDK Manager
- System Identity Module
- invokeAgent() caller

### Downstream Dependencies

**No changes required**:
- Comment creation
- WebSocket broadcasting
- Database insertion

## 3.4 Error Handling Strategy

### Error Categories

**E-1: Invalid Content Array**
```javascript
if (!Array.isArray(contentArray)) {
  console.debug('ℹ️ Content is not an array, skipping');
  return '';
}
```

**E-2: Empty Content Array**
```javascript
if (contentArray.length === 0) {
  console.debug('ℹ️ Content array is empty');
  return '';
}
```

**E-3: Malformed Content Blocks**
```javascript
.filter(block => {
  if (!block || typeof block !== 'object') return false;
  if (block.type !== 'text') return false;
  if (!block.text || typeof block.text !== 'string') return false;
  return true;
})
```

**E-4: All Blocks Filtered Out**
```javascript
const textBlocks = contentArray.filter(...);
if (textBlocks.length === 0) {
  console.debug('⚠️ No text blocks found in content array');
  return '';
}
```

## 3.5 Testing Architecture

### Test Layers

**Layer 1: Unit Tests** (5 new tests)
- Test `_extractFromContentArray()` independently
- Test nested array extraction in `_extractTextFromMessage()`
- Test edge cases (empty, null, malformed)

**Layer 2: Integration Tests** (3 new tests)
- Test full extraction with nested arrays
- Test backward compatibility with existing formats
- Test extraction order (prefer direct over nested)

**Layer 3: Regression Tests** (maintain 41 existing)
- All existing tests must pass
- No changes to existing behavior

### Test Data Sets

**Dataset 1: Nested message.content arrays**
```javascript
[
  // Simple nested array
  {
    type: 'assistant',
    message: { content: [{ type: 'text', text: 'Response' }] }
  },

  // Multiple text blocks
  {
    type: 'assistant',
    message: { content: [
      { type: 'text', text: 'Part 1' },
      { type: 'text', text: 'Part 2' }
    ]}
  },

  // Mixed content types
  {
    type: 'assistant',
    message: { content: [
      { type: 'image', source: '...' },
      { type: 'text', text: 'Text content' }
    ]}
  },

  // Real-world structure from logs
  {
    type: 'assistant',
    message: {
      id: 'msg_01ABC',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Let me check what\'s in the root folder...'
        }
      ],
      usage: { input_tokens: 8854, output_tokens: 412 }
    }
  }
]
```

---

# PHASE 4: REFINEMENT (TDD Plan)

## 4.1 Test-Driven Development Strategy

### TDD Cycle for Nested Arrays

```
1. RED: Write test for _extractFromContentArray()
   └─ Test fails (method doesn't exist)

2. GREEN: Implement _extractFromContentArray()
   └─ Test passes

3. REFACTOR: Optimize and clean up
   └─ Test still passes

4. RED: Write test for nested message.content array
   └─ Test fails (not handled in _extractTextFromMessage)

5. GREEN: Add array handling to _extractTextFromMessage()
   └─ Test passes

6. REFACTOR: Consolidate Method 1.5 logic
   └─ All tests pass

7. REGRESSION: Run all 41 existing tests
   └─ All tests pass (backward compatibility verified)
```

## 4.2 Test Implementation Order

### Phase 1: Helper Method Tests (5 tests)

**Test 1: Extract from simple content array**
```javascript
it('should extract text from content array', () => {
  const worker = new AgentWorker({ agentId: 'test' });
  const contentArray = [
    { type: 'text', text: 'Block 1' },
    { type: 'text', text: 'Block 2' }
  ];

  const result = worker._extractFromContentArray(contentArray);

  expect(result).toBe('Block 1\nBlock 2');
});
```

**Test 2: Filter non-text blocks**
```javascript
it('should filter out non-text content blocks', () => {
  const worker = new AgentWorker({ agentId: 'test' });
  const contentArray = [
    { type: 'image', source: 'image.png' },
    { type: 'text', text: 'Text content' },
    { type: 'tool_use', id: 'tool_123' }
  ];

  const result = worker._extractFromContentArray(contentArray);

  expect(result).toBe('Text content');
});
```

**Test 3: Handle empty content array**
```javascript
it('should return empty string for empty content array', () => {
  const worker = new AgentWorker({ agentId: 'test' });

  const result = worker._extractFromContentArray([]);

  expect(result).toBe('');
});
```

**Test 4: Handle null/undefined blocks**
```javascript
it('should skip null/undefined blocks in content array', () => {
  const worker = new AgentWorker({ agentId: 'test' });
  const contentArray = [
    null,
    { type: 'text', text: 'Valid' },
    undefined,
    { type: 'text', text: null }
  ];

  const result = worker._extractFromContentArray(contentArray);

  expect(result).toBe('Valid');
});
```

**Test 5: Trim whitespace from blocks**
```javascript
it('should trim whitespace from text blocks', () => {
  const worker = new AgentWorker({ agentId: 'test' });
  const contentArray = [
    { type: 'text', text: '  Block 1  ' },
    { type: 'text', text: '\nBlock 2\n' }
  ];

  const result = worker._extractFromContentArray(contentArray);

  expect(result).toBe('Block 1\nBlock 2');
});
```

### Phase 2: Nested Array Integration Tests (3 tests)

**Test 6: Extract from nested message.content array**
```javascript
it('should extract from nested message.content array', () => {
  const worker = new AgentWorker({ agentId: 'avi' });
  const messages = [
    {
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'Nested response' }
        ]
      }
    }
  ];

  const result = worker.extractFromTextMessages(messages);

  expect(result).toBe('Nested response');
  expect(result).not.toBe('');
  expect(result).not.toBe('No summary available');
});
```

**Test 7: Real-world nested structure from logs**
```javascript
it('should extract from real-world SDK nested structure', () => {
  const worker = new AgentWorker({ agentId: 'avi' });
  const messages = [
    {
      type: 'assistant',
      id: 'msg_01ABC',
      model: 'claude-3-5-sonnet-20241022',
      role: 'assistant',
      message: {
        id: 'msg_01ABC',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Let me check what\'s in the root folder for you.\n\nThe production root folder contains:\n\n**Key System Components:**'
          }
        ],
        stop_reason: 'end_turn',
        usage: { input_tokens: 8854, output_tokens: 412 }
      }
    }
  ];

  const result = worker.extractFromTextMessages(messages);

  expect(result).toContain('Let me check');
  expect(result).toContain('production root folder');
  expect(result).not.toBe('No summary available');
});
```

**Test 8: Prefer direct content over nested**
```javascript
it('should prefer direct content over nested message.content', () => {
  const worker = new AgentWorker({ agentId: 'test' });
  const messages = [
    {
      type: 'assistant',
      content: 'Direct content',  // Should be extracted first
      message: {
        content: [
          { type: 'text', text: 'Nested content' }  // Should be ignored
        ]
      }
    }
  ];

  const result = worker.extractFromTextMessages(messages);

  expect(result).toBe('Direct content');
});
```

### Phase 3: Edge Case Tests (3 tests)

**Test 9: Mixed nested arrays and direct content**
```javascript
it('should handle mixed nested arrays and direct content', () => {
  const worker = new AgentWorker({ agentId: 'test' });
  const messages = [
    { type: 'assistant', text: 'Message 1' },
    {
      type: 'assistant',
      message: {
        content: [{ type: 'text', text: 'Message 2' }]
      }
    }
  ];

  const result = worker.extractFromTextMessages(messages);

  expect(result).toContain('Message 1');
  expect(result).toContain('Message 2');
});
```

**Test 10: Empty nested content array**
```javascript
it('should handle empty nested content array gracefully', () => {
  const worker = new AgentWorker({ agentId: 'test' });
  const messages = [
    {
      type: 'assistant',
      message: { content: [] }  // Empty array
    },
    {
      type: 'assistant',
      text: 'Fallback text'
    }
  ];

  const result = worker.extractFromTextMessages(messages);

  expect(result).toBe('Fallback text');
});
```

**Test 11: Nested array with only non-text blocks**
```javascript
it('should skip nested arrays with no text blocks', () => {
  const worker = new AgentWorker({ agentId: 'test' });
  const messages = [
    {
      type: 'assistant',
      message: {
        content: [
          { type: 'image', source: 'img.png' },
          { type: 'tool_use', id: 'tool_1' }
        ]
      }
    }
  ];

  const result = worker.extractFromTextMessages(messages);

  // Should return empty string since no text blocks found
  expect(result).toBe('');
});
```

### Phase 4: Regression Tests (maintain 41 existing)

**All existing tests MUST pass**:
- ✅ System Identity Response Extraction (12 tests)
- ✅ Mixed Message Format Handling (5 tests)
- ✅ Edge Case Handling (7 tests)
- ✅ Backward Compatibility (3 tests)
- ✅ Integration Tests (6 tests)
- ✅ Regression Prevention (4 tests)
- ✅ London School Verification (3 tests)
- ✅ Coverage Summary (2 tests)

**Target**: 52 total tests (41 existing + 11 new)

## 4.3 Coverage Goals

| Metric | Current | Target | Change |
|--------|---------|--------|--------|
| Line Coverage | 95% | 97% | +2% |
| Branch Coverage | 90% | 92% | +2% |
| Function Coverage | 100% | 100% | 0% |
| Test Count | 42 | 53 | +11 |

---

# PHASE 5: COMPLETION

## 5.1 Implementation Checklist

### Code Implementation
- [ ] Create `_extractFromContentArray()` helper method
- [ ] Enhance `_extractTextFromMessage()` to call helper for arrays
- [ ] Add array handling for `msg.message.content`
- [ ] Update JSDoc comments with array format examples
- [ ] Add debug logging for nested array extraction
- [ ] Refactor or remove Method 1.5 (avoid duplication)

### Testing
- [ ] Write 5 helper method unit tests
- [ ] Write 3 nested array integration tests
- [ ] Write 3 edge case tests
- [ ] Run all 41 existing tests (verify no regressions)
- [ ] Achieve 97%+ line coverage
- [ ] Achieve 92%+ branch coverage

### Documentation
- [ ] Update method JSDoc with nested array examples
- [ ] Add inline comments explaining array extraction
- [ ] Document the content block structure
- [ ] Update SPARC completion report

### Validation
- [ ] Manual test: Comment reply to Avi with complex response
- [ ] Verify extraction from logs (nested structure)
- [ ] Check performance (< 2ms overhead)
- [ ] Verify no "No summary available" for valid nested arrays

## 5.2 Success Metrics

### Before Fix (Baseline)
```
Nested Array Extraction: INCOMPLETE (Method 1.5 only)
Code Duplication: YES (Method 1.5 duplicates logic)
Coverage: Edge cases not tested
Test Count: 42 tests
```

### After Fix (Target)
```
Nested Array Extraction: COMPLETE (integrated into helper)
Code Duplication: NO (single helper method)
Coverage: All edge cases tested
Test Count: 53 tests (42 existing + 11 new)
```

### Validation Queries

```sql
-- Check for nested array messages in recent logs
SELECT COUNT(*) as nested_array_messages
FROM system_logs
WHERE message LIKE '%message.content%'
  AND message LIKE '%array%'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Verify no extraction failures for nested arrays
SELECT COUNT(*) as extraction_failures
FROM comments
WHERE author_agent = 'avi'
  AND content = 'No summary available'
  AND created_at > NOW() - INTERVAL '24 hours';
-- Target: 0
```

## 5.3 Rollback Plan

### Rollback Triggers
1. Any existing test fails
2. New tests reveal fundamental issue
3. Performance degrades > 5ms

### Rollback Steps
```bash
# 1. Revert Git commit
git revert HEAD
git push origin main

# 2. Restart API server
pm2 restart api-server

# 3. Verify rollback
npm test -- agent-worker-system-identity-extraction.test.js
```

**Rollback Time**: < 3 minutes

## 5.4 Post-Implementation Validation

### Validation Checklist (First Hour)
- [ ] All 53 tests pass (42 existing + 11 new)
- [ ] Code coverage > 97%
- [ ] No duplication between Method 1.5 and helper
- [ ] Performance baseline maintained (< 2ms overhead)
- [ ] Nested array messages extract successfully

### Validation Checklist (First 24 Hours)
- [ ] Zero "No summary available" for valid SDK responses
- [ ] Logs show nested array extraction working
- [ ] No new error patterns
- [ ] Success rate > 99.9%

---

# APPENDIX A: Code Reference (Current State)

## Current Implementation (Incomplete)

### _extractTextFromMessage() - Lines 486-534

```javascript
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

  // Try nested message.content (INCOMPLETE)
  if (msg.message) {
    if (typeof msg.message === 'string') return msg.message;
    if (msg.message.content) return msg.message.content;  // ← Only handles string
  }

  return '';
}
```

### Method 1.5 - Lines 460-477 (Duplicates Logic)

```javascript
// Method 1.5: Try nested message.content arrays
const nestedMessages = messages.filter(m => m.message?.content && Array.isArray(m.message.content));
if (nestedMessages.length > 0) {
  const intelligence = nestedMessages
    .map(msg =>
      msg.message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n\n')
    )
    .filter(text => text.trim())
    .join('\n\n');

  if (intelligence.trim()) {
    console.log('✅ Extracted from nested message.content array:', intelligence.substring(0, 100));
    return intelligence.trim();
  }
}
```

---

# APPENDIX B: Implementation Code (Solution)

## Enhanced Helper Methods

```javascript
/**
 * Helper: Extract text from a single message (various formats)
 * Handles direct text, content strings, content arrays, and nested message.content arrays
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

  // Try direct text property (highest priority)
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
      return this._extractFromContentArray(msg.content);
    }
  }

  // Try nested message.content (ENHANCED - now handles arrays)
  if (msg.message) {
    // Message as string
    if (typeof msg.message === 'string') {
      return msg.message;
    }

    // Message.content exists
    if (msg.message.content) {
      // Content as string
      if (typeof msg.message.content === 'string') {
        return msg.message.content;
      }

      // Content as array (NEW - handles nested arrays)
      if (Array.isArray(msg.message.content)) {
        const extracted = this._extractFromContentArray(msg.message.content);
        if (extracted) {
          console.debug('✅ Extracted from nested message.content array');
        }
        return extracted;
      }
    }
  }

  return '';
}

/**
 * Helper: Extract text from content block array
 * Filters for text-type blocks and concatenates their text
 * @private
 * @param {Array} contentArray - Array of content blocks
 * @returns {string} Concatenated text from text-type blocks
 */
_extractFromContentArray(contentArray) {
  // Validate input
  if (!Array.isArray(contentArray)) {
    console.debug('ℹ️ Content is not an array');
    return '';
  }

  if (contentArray.length === 0) {
    console.debug('ℹ️ Content array is empty');
    return '';
  }

  // Extract text from text-type blocks
  const textBlocks = contentArray
    .filter(block => {
      // Skip null/undefined blocks
      if (!block || typeof block !== 'object') {
        return false;
      }
      // Only include text-type blocks
      if (block.type !== 'text') {
        return false;
      }
      // Must have text property
      if (!block.text || typeof block.text !== 'string') {
        return false;
      }
      // Skip empty text
      if (block.text.trim().length === 0) {
        return false;
      }
      return true;
    })
    .map(block => block.text.trim());

  if (textBlocks.length === 0) {
    console.debug('⚠️ No text blocks found in content array');
    return '';
  }

  // Concatenate with newlines
  return textBlocks.join('\n');
}
```

## Refactored Method 1.5 (Option B: Remove Duplication)

```javascript
// Method 1.5: REMOVED - logic now integrated into _extractTextFromMessage()
// The helper method now handles nested message.content arrays automatically
// No separate filtering needed - all assistant messages are checked
```

---

# APPENDIX C: Test Examples

## Test Suite File Location

**New Test File**: `/workspaces/agent-feed/api-server/tests/unit/agent-worker-nested-arrays.test.js`

**Run Tests**:
```bash
cd /workspaces/agent-feed/api-server
npm test -- agent-worker-nested-arrays.test.js
```

## Sample Tests

### Test 1: Extract from nested array
```javascript
describe('Nested message.content Array Extraction', () => {
  let worker;

  beforeEach(() => {
    worker = new AgentWorker({ agentId: 'avi' });
  });

  it('should extract from nested message.content array', () => {
    const messages = [
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Part 1' },
            { type: 'text', text: 'Part 2' }
          ]
        }
      }
    ];

    const result = worker.extractFromTextMessages(messages);

    expect(result).toBe('Part 1\nPart 2');
    expect(result).not.toBe('');
    expect(result).not.toBe('No summary available');
  });

  it('should extract from real-world SDK nested structure', () => {
    const messages = [
      {
        type: 'assistant',
        id: 'msg_01ABC',
        model: 'claude-3-5-sonnet-20241022',
        role: 'assistant',
        message: {
          id: 'msg_01ABC',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Let me check what\'s in the root folder for you.\n\nThe production root folder contains:'
            }
          ],
          stop_reason: 'end_turn',
          usage: { input_tokens: 8854, output_tokens: 412 }
        }
      }
    ];

    const result = worker.extractFromTextMessages(messages);

    expect(result).toContain('root folder');
    expect(result).not.toBe('No summary available');
  });
});
```

---

# SUMMARY

## What We're Fixing

The `_extractTextFromMessage()` helper checks for `msg.message.content` but only handles it as a string (line 448). When the SDK returns messages with **nested `message.content` as an array** (the format shown in logs), the extraction fails.

## How We're Fixing It

1. **Create `_extractFromContentArray()` helper** - Reusable method to extract from content block arrays
2. **Enhance `_extractTextFromMessage()`** - Add array handling for `msg.message.content`
3. **Consolidate Method 1.5** - Remove duplication by integrating logic into helper

## Why It's Safe

- Adds missing extraction pattern without breaking existing ones
- All 41 existing tests will still pass (backward compatible)
- Low complexity (simple array iteration)
- Performance impact < 2ms
- Clear separation of concerns with helper method

## Success Criteria

- ✅ Extracts from nested `message.content` arrays
- ✅ All 53 tests pass (41 existing + 11 new)
- ✅ No code duplication between Method 1.5 and helper
- ✅ Coverage > 97%
- ✅ No performance degradation

## Timeline

- Implementation: 20 minutes
- Testing: 10 minutes
- Total: 30 minutes

---

**Status**: ✅ SPECIFICATION COMPLETE - READY FOR IMPLEMENTATION
**Next Phase**: Begin TDD implementation with helper method tests
**Approval**: Awaiting sign-off to proceed
**Related**: This completes the fix started in SPARC-AVI-FIX-SPECIFICATION.md
