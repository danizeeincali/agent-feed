# API Transformation Quick Reference

## What Changed

The API now automatically transforms page data from database format to frontend-ready format.

## Before Transformation (Database Format)

```json
{
  "id": "dashboard-123",
  "agent_id": "personal-todos-agent",
  "title": "My Dashboard",
  "content_type": "json",
  "content_value": "{\"layout\":\"grid\",\"components\":[{\"type\":\"Card\"}]}",
  "status": "published"
}
```

## After Transformation (Frontend Format)

```json
{
  "id": "dashboard-123",
  "agent_id": "personal-todos-agent",
  "title": "My Dashboard",
  "content_type": "json",
  "content_value": "{\"layout\":\"grid\",\"components\":[{\"type\":\"Card\"}]}",
  "status": "published",
  "layout": "grid",
  "components": [
    {
      "type": "Card"
    }
  ]
}
```

## Key Points

1. **Original fields preserved** - All database fields remain unchanged
2. **New fields added** - `layout`, `components`, `responsive` extracted from JSON
3. **Automatic** - Happens on every GET request
4. **Backward compatible** - Works with old and new page formats
5. **Error safe** - Invalid JSON won't break the API

## API Endpoints Affected

### GET Single Page
```bash
GET /api/agent-pages/agents/:agentId/pages/:pageId
```
✅ Returns transformed page

### GET All Pages
```bash
GET /api/agent-pages/agents/:agentId/pages
```
✅ Returns array of transformed pages

## Example Usage

```javascript
// Fetch a page
const response = await fetch('/api/agent-pages/agents/my-agent/pages/page-123');
const data = await response.json();

// Frontend can now use:
console.log(data.page.layout);      // "grid"
console.log(data.page.components);  // [{type: "Card"}]

// Instead of parsing:
const content = JSON.parse(data.page.content_value);
console.log(content.layout);        // Old way - not needed anymore
```

## Transformation Logic

```javascript
function transformPageForFrontend(page) {
  // 1. Only process JSON/component content types
  if (page.content_type === 'json' || page.content_type === 'component') {
    
    // 2. Parse content_value JSON
    const parsed = JSON.parse(page.content_value);
    
    // 3. Extract special fields
    page.layout = parsed.layout;
    page.components = parsed.components;
    page.responsive = parsed.responsive;
    
    // 4. Merge other fields (if not conflicting)
  }
  
  return page;
}
```

## Files Modified

- `/workspaces/agent-feed/api-server/routes/agent-pages.js`
  - Added `transformPageForFrontend()` function (lines 23-82)
  - Applied to single page endpoint (line 245)
  - Applied to list endpoint (line 189)

## Test Coverage

- **Unit Tests**: 12 tests covering all transformation scenarios
- **E2E Tests**: 6 tests covering real API workflows
- **Live Tests**: Validated with production database

**Total**: 18 tests, 100% pass rate

## Support

All page content types supported:
- ✅ `json` - Fully transformed
- ✅ `component` - Fully transformed
- ✅ `text` - Passed through unchanged
- ✅ `markdown` - Passed through unchanged
