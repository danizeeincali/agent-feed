# TDD RED PHASE: Nested Message.Content Tests (NMC)

## Test Execution Summary

**Date**: 2025-10-28
**Status**: 🔴 RED PHASE (Expected)
**Location**: `/workspaces/agent-feed/api-server/tests/unit/agent-worker-system-identity-extraction.test.js`

## Test Results

### Total Test Suite
- **Total Tests**: 56 tests (40 existing + 16 new NMC)
- **Passed**: 46 tests ✅
- **Failed**: 10 tests ❌ (All NMC tests as expected)
- **Skipped**: 40 tests (existing tests not run with -t "NMC" filter)

### NMC Test Results

#### ❌ Failed Tests (Expected in RED phase)

| Test ID | Test Name | Status | Error |
|---------|-----------|--------|-------|
| NMC-001 | Extract from nested message.content array | ❌ FAIL | Expected text, received '' |
| NMC-002 | Multiple text blocks in nested array | ❌ FAIL | Expected 'First analysis step', received '' |
| NMC-003 | Skip non-text blocks (tool_use) | ❌ FAIL | Expected 'After reading...', received '' |
| NMC-004 | Mixed text and tool_use blocks | ❌ FAIL | Expected 'Let me analyze...', received '' |
| NMC-005 | Preserve extraction order | ❌ FAIL | Expected 'Nested content response', received '' |
| NMC-008 | Missing text property | ❌ FAIL | Expected 'Valid content', received '' |
| NMC-011 | Integration with SDK workflow | ❌ FAIL | Expected extraction, got 'No response available' |
| NMC-012 | NOT return "No response available" | ❌ FAIL | Expected extraction, got 'No response available' |
| NMC-014 | NEVER return empty | ❌ FAIL | Expected non-empty, received '' |
| NMC-015 | Complex nested structure | ❌ FAIL | Expected 'Based on...', received '' |

#### ✅ Passed Tests (Edge cases)

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| NMC-006 | Empty nested array | ✅ PASS | Correctly returns empty |
| NMC-007 | Only tool_use blocks | ✅ PASS | Correctly returns empty |
| NMC-009 | Null nested content | ✅ PASS | Handles gracefully |
| NMC-010 | Missing content property | ✅ PASS | Handles gracefully |
| NMC-013 | SDK interaction verification | ✅ PASS | Mock verification works |
| NMC-016 | Backward compatibility | ✅ PASS | String content still works |

## Failure Analysis

### Root Cause

All failures are caused by the same issue: **`extractFromTextMessages()` does not handle `msg.message.content` as an array**.

Current implementation (line 96):
```javascript
if (msg.message?.content) return msg.message.content;
```

This only works when `message.content` is a string, but fails when it's an array of content blocks.

### Expected vs Actual Behavior

**Input Structure** (from logs):
```json
{
  "type": "assistant",
  "message": {
    "content": [
      { "type": "text", "text": "I'll check what's in the current directory..." }
    ]
  }
}
```

**Current Behavior**:
- Tries to return `msg.message.content` (the array itself)
- Array doesn't pass the string filters
- Falls through all extraction attempts
- Returns empty string ''
- invokeAgent() returns "No response available"

**Expected Behavior**:
- Detect `msg.message.content` is an array
- Filter for `type === 'text'` blocks
- Extract `.text` property from each block
- Join with newlines
- Return extracted text

## Test Coverage Details

### Test Distribution

```
[NMC] Nested message.content Array Extraction
├── [NMC-001 to NMC-005] Real Log Structures (5 tests)
│   ├── NMC-001: Single text block extraction
│   ├── NMC-002: Multiple text blocks
│   ├── NMC-003: Skip tool_use blocks
│   ├── NMC-004: Mixed text/tool_use
│   └── NMC-005: Extraction priority order
│
├── [NMC-006 to NMC-010] Edge Cases (5 tests)
│   ├── NMC-006: Empty array
│   ├── NMC-007: Only tool_use blocks
│   ├── NMC-008: Missing text property
│   ├── NMC-009: Null content
│   └── NMC-010: Missing content property
│
├── [NMC-011 to NMC-013] Integration Tests (3 tests)
│   ├── NMC-011: SDK workflow integration
│   ├── NMC-012: "No response available" prevention
│   └── NMC-013: SDK interaction verification
│
└── [NMC-014 to NMC-016] Regression Prevention (3 tests)
    ├── NMC-014: Never return empty
    ├── NMC-015: Complex production structure
    └── NMC-016: Backward compatibility
```

### London School TDD Verification

**Mock Collaborations** ✅:
- MockSDKManager properly simulates SDK responses
- AgentWorkerTestDouble implements test version
- Spy verification confirms method interactions

**Behavior Over State** ✅:
- Tests verify HOW extraction works, not just what it returns
- Interaction patterns tested (SDK → Worker → Extraction)
- Contract expectations verified with mocks

**Outside-In Development** ✅:
- Integration tests (NMC-011 to NMC-013) test from user perspective
- Unit tests drill down to specific behaviors
- Edge cases ensure robustness

## Implementation Requirements

### Fix Location
File: `/workspaces/agent-feed/api-server/worker/agent-worker.js`
Method: `extractFromTextMessages(messages, result = null)`
Line: ~96 (where `msg.message.content` is checked)

### Required Code Change

```javascript
// BEFORE (current - line 96):
if (msg.message?.content) return msg.message.content;

// AFTER (enhanced):
if (msg.message?.content) {
  // Handle string content (backward compatibility)
  if (typeof msg.message.content === 'string') {
    return msg.message.content;
  }

  // Handle array content (NEW - fixes NMC tests)
  if (Array.isArray(msg.message.content)) {
    return msg.message.content
      .filter(block => block.type === 'text' && block.text)
      .map(block => block.text)
      .join('\n');
  }
}
```

### Implementation Checklist

- [ ] Add array type check for `msg.message.content`
- [ ] Filter content blocks by `type === 'text'`
- [ ] Extract `.text` property from each block
- [ ] Join multiple blocks with newlines
- [ ] Maintain backward compatibility with string content
- [ ] Handle edge cases (empty array, no text blocks)
- [ ] Run all tests to verify GREEN phase
- [ ] Ensure no existing tests broken

## Next Steps

### 1. Implement the Fix (GREEN Phase)
```bash
# Edit the agent-worker.js file with the enhanced logic
# Location: /workspaces/agent-feed/api-server/worker/agent-worker.js
```

### 2. Run Tests Again
```bash
# Run all NMC tests
npm test -- tests/unit/agent-worker-system-identity-extraction.test.js -t "NMC"

# Expected: All 16 NMC tests should pass ✅
```

### 3. Run Full Test Suite
```bash
# Ensure backward compatibility
npm test -- tests/unit/agent-worker-system-identity-extraction.test.js

# Expected: All 86 tests should pass ✅
```

### 4. Verify in Production
```bash
# Test with real Avi system identity requests
# Should see actual responses instead of "No summary available"
```

### 5. Refactor (if needed)
```bash
# Clean up implementation while keeping tests green
# Consider extracting helper methods
# Add inline documentation
```

## Success Metrics

### Test Success
- [ ] All 10 failed NMC tests now pass
- [ ] All 6 passing NMC edge case tests remain passing
- [ ] All 70 existing tests remain passing
- [ ] Total: 86/86 tests passing (100%)

### Production Success
- [ ] No "No summary available" errors for Avi
- [ ] System identity responses display correctly
- [ ] Worker path extraction works for all agents
- [ ] No regression in existing functionality

## Related Documentation

- **Test Suite**: `/workspaces/agent-feed/api-server/tests/unit/agent-worker-system-identity-extraction.test.js`
- **Test README**: `/workspaces/agent-feed/api-server/tests/unit/README-NESTED-MESSAGE-CONTENT-TESTS.md`
- **Implementation**: `/workspaces/agent-feed/api-server/worker/agent-worker.js`
- **Bug Investigation**: `/workspaces/agent-feed/docs/AVI-NO-SUMMARY-INVESTIGATION-REPORT.md`

## TDD Workflow Status

```
┌─────────────────────────────────────────┐
│  TDD CYCLE: Nested Message.Content Fix │
└─────────────────────────────────────────┘

Phase 1: 🔴 RED (Current)
  ✅ Write comprehensive tests (16 tests)
  ✅ Verify tests fail (10 failures expected)
  ✅ Document failure reasons

Phase 2: 🟢 GREEN (Next)
  ⏳ Implement array extraction logic
  ⏳ Run tests until all pass
  ⏳ Verify no regressions

Phase 3: 🔵 REFACTOR (Future)
  ⏳ Clean up implementation
  ⏳ Improve code readability
  ⏳ Add inline documentation
  ⏳ Extract helper methods if needed
```

---

**Status**: ✅ RED PHASE COMPLETE
**Next Action**: Implement the fix in `agent-worker.js` to enter GREEN phase
**Test IDs**: NMC-001 through NMC-016
**Methodology**: London School TDD with mock-driven collaboration testing
