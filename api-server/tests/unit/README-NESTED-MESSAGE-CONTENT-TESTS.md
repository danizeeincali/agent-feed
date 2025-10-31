# Nested Message.Content Array Extraction Tests (NMC)

## Overview

This document describes the TDD test suite for fixing the nested `message.content` extraction bug that causes "No summary available" errors in Avi's system identity responses.

## Problem Statement

### Real Log Structure

Claude SDK returns responses in this nested structure:

```json
{
  "type": "assistant",
  "message": {
    "model": "claude-sonnet-4-20250514",
    "content": [
      {
        "type": "text",
        "text": "I'll check what's in the current directory..."
      }
    ]
  }
}
```

### Current Bug

The `extractFromTextMessages()` method in `agent-worker.js` currently checks:
- `msg.text` (direct property)
- `msg.content` (direct string or array)
- `msg.message.content` (nested string)

**But it DOES NOT handle**: `msg.message.content` as an **array of content blocks**.

This causes extraction failures and results in "No summary available" errors.

## Test Structure

### Test Suite 8: [NMC] Nested message.content Array Extraction

Location: `/workspaces/agent-feed/api-server/tests/unit/agent-worker-system-identity-extraction.test.js`

### Test Cases (16 Total)

#### Group 1: Real Log Structures (NMC-001 to NMC-005)

| Test ID | Description | Expected Behavior |
|---------|-------------|-------------------|
| NMC-001 | Extract from nested message.content array with text blocks | Successfully extract text from nested array |
| NMC-002 | Handle multiple text blocks in nested array | Join multiple blocks with newlines |
| NMC-003 | Skip non-text blocks (tool_use) in nested array | Filter out tool_use, extract only text blocks |
| NMC-004 | Handle mixed text and tool_use blocks | Extract all text blocks, ignore tool_use |
| NMC-005 | Preserve extraction order preference | Prefer direct text > nested arrays |

#### Group 2: Edge Cases (NMC-006 to NMC-010)

| Test ID | Description | Expected Behavior |
|---------|-------------|-------------------|
| NMC-006 | Handle empty nested message.content array | Return empty, don't crash |
| NMC-007 | Handle nested array with only tool_use blocks | Return empty (no text to extract) |
| NMC-008 | Handle missing text property in content blocks | Skip invalid blocks, extract valid ones |
| NMC-009 | Handle null nested message.content | Return empty, don't crash |
| NMC-010 | Handle nested message without content property | Return empty, don't crash |

#### Group 3: Integration Tests (NMC-011 to NMC-013)

| Test ID | Description | Expected Behavior |
|---------|-------------|-------------------|
| NMC-011 | Extract nested content in real SDK workflow | Full integration with invokeAgent() |
| NMC-012 | NOT return "No response available" | Successfully extract from nested structure |
| NMC-013 | Verify SDK interaction preserves structure | Mock verification of collaboration |

#### Group 4: Regression Prevention (NMC-014 to NMC-016)

| Test ID | Description | Expected Behavior |
|---------|-------------|-------------------|
| NMC-014 | NEVER return empty for valid nested content | Regression test for "No summary available" |
| NMC-015 | Extract from complex real production structure | Full metadata preservation |
| NMC-016 | Maintain backward compatibility | Don't break existing string content extraction |

## Extraction Priority Order

The extraction method should follow this priority:

1. **Direct properties** (highest priority)
   - `msg.text`
   - `msg.content` (if string)
   - `msg.content` (if array) → filter text blocks

2. **Nested message.content** (NEW - being fixed)
   - `msg.message.content` (if string)
   - `msg.message.content` (if array) → filter text blocks ✅ **NEW**

3. **Role-based fallback**
   - `role === 'assistant'`

4. **Result object fallback** (lowest priority)
   - `result.response`

## Implementation Requirements

### Required Changes to `extractFromTextMessages()`

```javascript
// Current implementation checks msg.message.content (line 96)
if (msg.message?.content) return msg.message.content;

// Should be enhanced to:
if (msg.message?.content) {
  // Handle string content (existing)
  if (typeof msg.message.content === 'string') {
    return msg.message.content;
  }

  // Handle array content (NEW)
  if (Array.isArray(msg.message.content)) {
    return msg.message.content
      .filter(block => block.type === 'text' && block.text)
      .map(block => block.text)
      .join('\n');
  }
}
```

## London School TDD Methodology

### Mock Strategy

- **MockSDKManager**: Mock SDK interactions
- **AgentWorkerTestDouble**: Test double with enhanced extraction
- **Spy verification**: Verify method collaborations

### Behavior Verification Focus

Tests verify:
- **HOW objects collaborate** (SDK → Worker → Extraction)
- **Interface contracts** (message structure expectations)
- **Interaction sequences** (call order, parameters)
- **Collaboration patterns** (mock expectations)

### Contract Definition

The extraction method establishes contracts:
- Input: `messages` array, optional `result` object
- Output: Extracted text string or empty string
- Collaborators: SDK Manager, invokeAgent method
- Side effects: None (pure extraction)

## Running Tests

### Run All Tests
```bash
npm test -- api-server/tests/unit/agent-worker-system-identity-extraction.test.js
```

### Run Only NMC Tests
```bash
npm test -- api-server/tests/unit/agent-worker-system-identity-extraction.test.js -t "NMC"
```

### Run Specific Test
```bash
npm test -- api-server/tests/unit/agent-worker-system-identity-extraction.test.js -t "NMC-001"
```

### Watch Mode
```bash
npm test -- --watch api-server/tests/unit/agent-worker-system-identity-extraction.test.js
```

## Expected Test Status

### Current Phase: RED (Tests Fail)

All NMC tests should **FAIL** because the implementation doesn't yet handle nested `message.content` arrays.

Example failure:
```
❌ [NMC-001] should extract from nested message.content array with text blocks
   Expected: "I'll check what's in the current directory..."
   Received: ""
```

### Next Phase: GREEN (Implement Fix)

After implementing the array handling in `extractFromTextMessages()`, all tests should pass.

### Final Phase: REFACTOR

Clean up implementation while keeping tests green.

## Integration with Existing Tests

### Total Test Count

- **Original tests**: 70 tests
- **NMC tests**: 16 tests
- **Total**: 86 tests

### Coverage Areas

| Area | Original | NMC | Total |
|------|----------|-----|-------|
| System identity formats | ✅ | ✅ | Full |
| Regular agent formats | ✅ | ✅ | Full |
| Nested structures | ⚠️ | ✅ | **Fixed** |
| Edge cases | ✅ | ✅ | Enhanced |
| Integration tests | ✅ | ✅ | Enhanced |
| Regression prevention | ✅ | ✅ | Enhanced |

## Success Criteria

### Test Success Criteria

1. ✅ All 16 NMC tests written
2. ⏳ All NMC tests fail (RED phase)
3. ⏳ Implement extraction logic
4. ⏳ All NMC tests pass (GREEN phase)
5. ⏳ No existing tests broken (backward compatibility)
6. ⏳ Test coverage > 95%

### Implementation Success Criteria

1. Extract from nested `message.content` arrays
2. Filter text blocks from content arrays
3. Skip tool_use and other non-text blocks
4. Handle edge cases (null, empty, missing)
5. Maintain backward compatibility
6. No "No summary available" errors

## Related Files

- **Test file**: `/workspaces/agent-feed/api-server/tests/unit/agent-worker-system-identity-extraction.test.js`
- **Implementation**: `/workspaces/agent-feed/api-server/worker/agent-worker.js`
- **Bug report**: `/workspaces/agent-feed/docs/AVI-NO-SUMMARY-INVESTIGATION-REPORT.md`

## References

### Production Logs

Real examples from logs showing the nested structure:
```json
{
  "type": "assistant",
  "message": {
    "id": "msg_01234567890",
    "type": "message",
    "role": "assistant",
    "model": "claude-sonnet-4-20250514",
    "content": [
      {
        "type": "text",
        "text": "Based on the repository structure and the logs, I can see that..."
      }
    ],
    "stop_reason": "end_turn",
    "usage": {
      "input_tokens": 1000,
      "output_tokens": 500
    }
  }
}
```

### London School Principles Applied

1. **Mock-First**: Define collaborators through mocks
2. **Behavior Over State**: Test interactions, not just values
3. **Outside-In**: Start with acceptance tests (invokeAgent)
4. **Contract Evolution**: Adapt interfaces based on tests
5. **Collaboration Focus**: Verify SDK → Worker → Extraction flow

---

**TDD Status**: 🔴 RED PHASE (Tests written, implementation pending)

**Next Steps**:
1. Run tests to verify they fail
2. Implement nested array extraction in `extractFromTextMessages()`
3. Verify all tests pass (GREEN phase)
4. Refactor if needed while keeping tests green
