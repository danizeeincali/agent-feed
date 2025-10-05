# Format Preservation Fix - Auto-Registration Middleware

## Problem Fixed

The auto-registration middleware was transforming page formats during storage:
- **Before**: `specification` field → transformed to `content_value` with markdown/text type
- **Issue**: Original page-builder format was lost
- **Impact**: Schema mismatch when page-builder-agent created pages

## Solution Implemented

Updated middleware to **preserve original page format** without transformation:

### Changes Made

#### 1. Renamed Function: `transformPageData` → `preparePageData`

**Old behavior (transformPageData):**
```javascript
// ❌ Transformed specification to markdown/text
if (pageData.specification !== undefined) {
  contentType = 'application/json';  // Then normalized to 'markdown'
  contentValue = pageData.specification;  // Direct assignment
}
```

**New behavior (preparePageData):**
```javascript
// ✅ Preserves specification as JSON
if (pageData.specification !== undefined) {
  contentType = 'json';  // Store as JSON type
  contentValue = typeof pageData.specification === 'string'
    ? pageData.specification
    : JSON.stringify(pageData.specification);
}
```

#### 2. Updated Database INSERT Logic

```javascript
// Auto-register with INSERT OR REPLACE
// Prepare page data for insertion, preserving original format
// Supports both formats:
// 1. Page-builder format: {specification, ...}
// 2. Database format: {content_type, content_value, ...}
const insertData = preparePageData(pageData);
```

### Format Handling

| Input Format | Storage Strategy | Result |
|-------------|------------------|--------|
| `{specification: "..."}` | Store as `content_type: "json"` | ✅ Preserved |
| `{content_value: "...", content_type: "markdown"}` | Store as-is | ✅ Preserved |
| `{custom: "data"}` | Serialize to JSON | ✅ Fallback |

## Test Coverage

### Unit Tests (19 tests)
`/api-server/tests/middleware/prepare-page-data.test.js`

- ✅ Specification format preservation
- ✅ Content_value format preservation
- ✅ Metadata handling
- ✅ Format validation
- ✅ Edge cases

### Integration Tests (7 tests)

**Auto-Registration Tests:**
`/api-server/tests/integration/auto-register-pages-integration.test.js`
- ✅ Auto-register with specification format
- ✅ Preserve content_value format
- ✅ Handle both formats separately

**Format Preservation Tests:**
`/api-server/tests/integration/format-preservation.test.js`
- ✅ Preserve page-builder specification exactly
- ✅ No unwanted transformation
- ✅ Preserve metadata
- ✅ API layer transformation capability

### Test Results

```
Test Files  3 passed (3)
Tests       26 passed (26)
Duration    14.00s
```

## Verification

Run validation script:
```bash
node api-server/tests/integration/validate-format-preservation.js
```

**Output:**
- ✅ Pages with specification stored as `content_type="json"`
- ✅ Original specification preserved in `content_value`
- ✅ No unwanted transformation to markdown/text
- ✅ API layer can handle transformation on read

## API Layer Compatibility

The middleware now stores pages in their original format. API endpoints can transform on read:

```javascript
// Database stores original format
const page = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);

// API can provide both formats
const response = {
  id: page.id,
  specification: JSON.parse(page.content_value),  // Original format
  content_type: page.content_type,                // "json"
  content_value: page.content_value               // Raw JSON string
};
```

## Files Modified

1. `/api-server/middleware/auto-register-pages.js`
   - Renamed `transformPageData()` → `preparePageData()`
   - Updated format handling logic
   - Preserved metadata handling

2. `/api-server/tests/integration/auto-register-pages-integration.test.js`
   - Updated tests for new behavior
   - Added format verification assertions

## Files Created

1. `/api-server/tests/middleware/prepare-page-data.test.js`
   - 19 unit tests for preparePageData function

2. `/api-server/tests/integration/format-preservation.test.js`
   - 4 comprehensive integration tests

3. `/api-server/tests/integration/validate-format-preservation.js`
   - Validation script for manual verification

## Summary

✅ **Problem Solved**: Auto-registration now preserves original page format
✅ **No Schema Mismatch**: Pages stored exactly as page-builder-agent creates them
✅ **API Flexibility**: Transformation happens at read time, not write time
✅ **Full Test Coverage**: 26 tests verify correct behavior
✅ **Real Database Testing**: All tests use actual file system and database
