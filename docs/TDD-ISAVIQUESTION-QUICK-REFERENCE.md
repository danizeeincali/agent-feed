# Quick Reference: isAviQuestion() TDD Test Suite

## Test File Location
```
/workspaces/agent-feed/tests/unit/isAviQuestion.test.js
```

## Run Tests
```bash
npx jest tests/unit/isAviQuestion.test.js --config jest.config.cjs --verbose --no-coverage
```

## Current Status (Pre-Fix)
- ✅ **31 tests passing** - Existing functionality works
- ❌ **8 tests failing** - Bug confirmed

## The Bug
**File:** `api-server/server.js` lines 276-279

```javascript
// ❌ REMOVE THIS:
if (content.includes('?')) {
  return true;
}
```

## Fix
Just **delete lines 276-279**. That's it!

## Expected Result After Fix
```
Test Suites: 1 passed, 1 total
Tests:       39 passed, 39 total
```

## Test Categories
1. ✅ AVI mentions (8 tests) - `avi`, `AVI`, `λvi`, etc.
2. ❌ Non-AVI questions (7 tests) - Generic "?" questions
3. ✅ URL content (4 tests) - Links with `?` excluded
4. ✅ Word boundaries (4 tests) - "aviation", "navigate"
5. ✅ Empty/null (3 tests) - Edge cases
6. ✅ Commands (5 tests) - "status", "help", "what"
7. ✅/❌ Real-world (7 tests) - Mixed scenarios

## Key Test Cases

### Should Return TRUE ✅
```javascript
"avi, what is the weather?"    // Explicit mention
"AVI can you help?"            // Case insensitive
"λvi status update"            // Lambda character
"status"                       // Command pattern
"what is going on"             // Command pattern
```

### Should Return FALSE ❌
```javascript
"What is the weather?"         // No AVI mention
"Really??"                     // No AVI mention
"Is this working?"             // No AVI mention
"???"                          // No AVI mention
"https://example.com?x=1"      // URL (already works)
```

## Failing Tests (8 total)
All expect `false` but get `true`:
1. `"What is the weather?"`
2. `"Really??"`
3. `"Where are you? What time is it?"`
4. `"Is this even working?"`
5. `"???"`
6. `"Can you help me with this task?"`
7. `"How do I fix this bug?"`
8. `"Is the build complete?"`

## Full Documentation
See: `/workspaces/agent-feed/docs/TDD-ISAVIQUESTION-TEST-DELIVERY.md`
