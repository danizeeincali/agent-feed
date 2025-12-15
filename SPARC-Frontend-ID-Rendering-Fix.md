# SPARC Specification: Frontend ID Rendering Fix

## Executive Summary

**Problem**: The DynamicPageRenderer component does not render the `id` prop as an HTML `id` attribute on most components, breaking anchor link navigation. While the page-builder-agent generates correct JSON with matching anchor hrefs and component IDs, and backend validation passes, the frontend fails to render these IDs on DOM elements.

**Impact**:
- Anchor links in Sidebar navigation don't work (clicking `#section-name` doesn't scroll)
- Users cannot deep-link to specific sections of dynamic pages
- Browser's native anchor scrolling behavior is disabled
- Accessibility features relying on IDs are broken

**Scope**: Fix all 38+ component types in DynamicPageRenderer.tsx to consistently render `id` attributes on their root DOM elements.

---

## 1. SPECIFICATION

### 1.1 Requirements

#### 1.1.1 Functional Requirements

**FR1: ID Attribute Rendering**
- **FR1.1**: All components MUST render their `id` prop as an HTML `id` attribute on their root DOM element
- **FR1.2**: ID rendering MUST be consistent across all component types (header, Card, Container, etc.)
- **FR1.3**: Components without an `id` prop MUST NOT render an empty or undefined `id` attribute
- **FR1.4**: ID values MUST be sanitized to ensure valid HTML5 ID format

**FR2: Schema Updates**
- **FR2.1**: All component schemas (frontend and backend) MUST include an optional `id` field
- **FR2.2**: ID validation MUST enforce valid HTML5 ID constraints:
  - Only alphanumeric, hyphen, underscore, colon, and period characters
  - Must start with a letter
  - Must be unique within the page (validated at page level, not component level)
  - No whitespace allowed

**FR3: Anchor Link Support**
- **FR3.1**: Sidebar component's anchor link handling MUST work with rendered IDs
- **FR3.2**: Smooth scrolling behavior MUST be preserved
- **FR3.3**: Browser's native anchor navigation MUST work (URL hash changes)

**FR4: Backward Compatibility**
- **FR4.1**: Components without `id` props MUST render normally (no breaking changes)
- **FR4.2**: Existing pages without IDs MUST continue to function
- **FR4.3**: The `key` prop generation logic MUST remain unchanged

#### 1.1.2 Non-Functional Requirements

**NFR1: Performance**
- **NFR1.1**: ID rendering MUST NOT add measurable overhead (< 1ms per component)
- **NFR1.2**: No additional re-renders should be triggered by ID changes
- **NFR1.3**: ID sanitization MUST use memoized functions for large component trees

**NFR2: Accessibility**
- **NFR2.1**: IDs MUST be unique within the page for ARIA compatibility
- **NFR2.2**: Screen readers MUST be able to navigate using rendered IDs
- **NFR2.3**: Focus management MUST work with ID-based anchors

**NFR3: Developer Experience**
- **NFR3.1**: TypeScript types MUST reflect the optional `id` prop
- **NFR3.2**: Component schemas MUST be synchronized between frontend and backend
- **NFR3.3**: Validation errors MUST clearly indicate ID-related issues

### 1.2 Component Types Requiring Updates

#### 1.2.1 Primary Components (High Priority)
These components are most commonly used as section headers/containers and MUST support IDs:

1. **header** - Section headers (h1-h6 tags)
2. **Card** - Content containers
3. **Container** - Layout containers
4. **Grid** - Layout grids
5. **Stack** - Flex containers
6. **DataCard** - Metric containers
7. **ProfileHeader** - Profile sections

#### 1.2.2 Interactive Components (Medium Priority)
These may be referenced by IDs for interactivity:

8. **todoList** - Task lists
9. **dataTable** - Data tables
10. **form** - Forms
11. **tabs** - Tab containers
12. **Checklist** - Interactive checklists
13. **Calendar** - Date pickers
14. **PhotoGrid** - Image galleries
15. **SwipeCard** - Card sliders
16. **GanttChart** - Project timelines

#### 1.2.3 Display Components (Low Priority)
Less common for anchor targets but should still support IDs:

17. **stat** - Statistics
18. **list** - Lists
19. **timeline** - Timelines
20. **Badge** - Labels
21. **Metric** - Metrics
22. **CapabilityList** - Capability lists
23. **Button** - Buttons (rare as anchor targets)
24. **Progress** - Progress bars
25. **Markdown** - Markdown content

#### 1.2.4 Navigation Components (Special Handling)
Already have ID support or special requirements:

26. **Sidebar** - Already supports IDs via item.id (no change needed)

### 1.3 Edge Cases

**EC1: Duplicate IDs**
- **Problem**: Multiple components with same ID on one page
- **Solution**: Backend validation MUST detect and reject duplicate IDs
- **Frontend Behavior**: Render warning in development mode

**EC2: Invalid ID Characters**
- **Problem**: IDs with spaces, special characters, or starting with numbers
- **Solution**: Sanitize IDs using HTML5 validation rules
- **Fallback**: Prefix with "component-" if ID starts with number

**EC3: Nested Components with IDs**
- **Problem**: Parent and child both have IDs
- **Solution**: Both should render their IDs (allowed in HTML5)
- **Note**: Ensure uniqueness validation catches nested duplicates

**EC4: Dynamic ID Updates**
- **Problem**: ID changes after component mounts
- **Solution**: React will handle DOM updates automatically
- **Caveat**: Anchor links may break if ID changes while page is active

**EC5: Components Without Root Elements**
- **Problem**: Fragments or multi-root components
- **Solution**: Wrap in a `<div>` if ID is present, otherwise use fragment
- **Example**: Badge components may need wrapper divs

### 1.4 Success Criteria

**SC1**: All anchor links in Sidebar navigate to correct sections with smooth scrolling
**SC2**: Browser's native hash navigation (e.g., `/page#section-name`) works correctly
**SC3**: All component types consistently render IDs when provided
**SC4**: No breaking changes to existing pages without IDs
**SC5**: All tests pass (unit, integration, E2E)
**SC6**: TypeScript compilation succeeds with no new errors
**SC7**: Backend validation rejects invalid or duplicate IDs

---

## 2. PSEUDOCODE

### 2.1 ID Sanitization Utility

```typescript
/**
 * Sanitizes an ID to ensure HTML5 compliance
 *
 * Rules:
 * - Must start with a letter (a-z, A-Z)
 * - Can contain letters, digits, hyphens, underscores, colons, periods
 * - No whitespace
 * - If invalid, prefix with "component-"
 */
function sanitizeId(id: string | undefined): string | undefined {
  if (!id) return undefined;

  // Remove whitespace
  let sanitized = id.trim().replace(/\s+/g, '-');

  // Replace invalid characters with hyphens
  sanitized = sanitized.replace(/[^a-zA-Z0-9\-_:.]/g, '-');

  // Ensure starts with a letter
  if (!/^[a-zA-Z]/.test(sanitized)) {
    sanitized = `component-${sanitized}`;
  }

  // Remove consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  return sanitized || undefined;
}
```

### 2.2 ID Rendering Pattern

```typescript
/**
 * Generic pattern for rendering components with ID support
 *
 * BEFORE:
 * <div className="...">
 *
 * AFTER:
 * <div id={sanitizeId(props.id)} className="...">
 */

// Example 1: header component
case 'header':
  const HeaderTag = `h${props.level || 1}` as keyof JSX.IntrinsicElements;
  return (
    <HeaderTag
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS
      className={`font-bold text-gray-900 mb-4 ${...}`}
    >
      {props.title}
    </HeaderTag>
  );

// Example 2: Card component
case 'Card':
  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ALREADY EXISTS - ENSURE SANITIZED
      className={`bg-white rounded-lg border border-gray-200 p-4 ${props.className || ''}`}
    >
      {props.title && <h3 className="text-lg font-semibold mb-2">{props.title}</h3>}
      {renderedChildren}
    </div>
  );

// Example 3: Container component
case 'Container':
  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS
      className={`mx-auto px-4 ${sizeClasses[props.size || 'md']} ${props.className || ''}`}
    >
      {renderedChildren}
    </div>
  );

// Example 4: Component without root element (needs wrapper when ID present)
case 'Badge':
  const badgeContent = (
    <span
      key={key}
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${...}`}
    >
      {props.children}
    </span>
  );

  // If ID is present, wrap in div for proper ID attachment
  if (props.id) {
    return (
      <div id={sanitizeId(props.id)} style={{ display: 'inline-block' }}>
        {badgeContent}
      </div>
    );
  }

  return badgeContent;
```

### 2.3 Schema Update Pattern

```typescript
// BEFORE (frontend/src/schemas/componentSchemas.ts)
export const HeaderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  level: z.number().min(1).max(6).optional().default(1),
  subtitle: z.string().optional()
})

// AFTER
export const HeaderSchema = z.object({
  id: z.string()
    .regex(/^[a-zA-Z][a-zA-Z0-9\-_:.]*$/, "ID must start with a letter and contain only valid characters")
    .optional(),
  title: z.string().min(1, "Title is required"),
  level: z.number().min(1).max(6).optional().default(1),
  subtitle: z.string().optional()
})
```

### 2.4 Backend Validation Algorithm

```javascript
/**
 * Validates that all IDs in a component tree are unique
 * Called in api-server/routes/validate-components.js
 */
function validateUniqueIds(components, path = 'root') {
  const seenIds = new Set();
  const duplicates = [];

  function traverse(component, currentPath) {
    const { type, props = {}, children = [] } = component;

    // Check if component has an ID
    if (props.id) {
      if (seenIds.has(props.id)) {
        duplicates.push({
          id: props.id,
          path: currentPath,
          message: `Duplicate ID "${props.id}" found at ${currentPath}`
        });
      } else {
        seenIds.add(props.id);
      }
    }

    // Recursively check children
    if (Array.isArray(children)) {
      children.forEach((child, index) => {
        traverse(child, `${currentPath}.children[${index}]`);
      });
    }
  }

  components.forEach((component, index) => {
    traverse(component, `components[${index}]`);
  });

  return {
    valid: duplicates.length === 0,
    duplicates
  };
}
```

---

## 3. ARCHITECTURE

### 3.1 Affected Files

#### 3.1.1 Frontend Files (Primary Changes)

```
frontend/src/
├── components/
│   ├── DynamicPageRenderer.tsx           *** MAJOR UPDATE (38 components)
│   └── dynamic-page/
│       └── Sidebar.tsx                   *** NO CHANGE (already works)
├── schemas/
│   └── componentSchemas.ts               *** UPDATE (add id field to all schemas)
└── utils/
    └── sanitizeId.ts                     *** NEW FILE (ID sanitization utility)
```

#### 3.1.2 Backend Files (Schema Sync + Validation)

```
api-server/
├── routes/
│   ├── validate-components.js            *** UPDATE (add unique ID validation)
│   └── agent-pages.js                    *** UPDATE (add ID uniqueness check)
└── middleware/
    └── validation-rules.js               *** UPDATE (add ID validation rules)
```

#### 3.1.3 Test Files

```
frontend/src/components/
└── __tests__/
    ├── DynamicPageRenderer.test.tsx      *** UPDATE (add ID rendering tests)
    └── sanitizeId.test.ts                *** NEW FILE

api-server/tests/routes/
├── validate-components.test.js           *** UPDATE (add ID validation tests)
└── agent-pages.test.js                   *** UPDATE (add ID uniqueness tests)
```

### 3.2 Component Modification Strategy

#### 3.2.1 Systematic Approach

**Phase 1: Infrastructure (30 minutes)**
1. Create `sanitizeId()` utility function
2. Add unit tests for `sanitizeId()`
3. Update TypeScript types for component props

**Phase 2: Schema Updates (45 minutes)**
4. Update all frontend schemas with `id` field
5. Update all backend schemas with `id` field
6. Add ID validation regex
7. Test schema validation

**Phase 3: Component Updates (2-3 hours)**
8. Update components in priority order:
   - **Tier 1** (20 min): header, Card, Container, Grid, Stack (5 components)
   - **Tier 2** (40 min): DataCard, ProfileHeader, todoList, dataTable, form, tabs (6 components)
   - **Tier 3** (60 min): Checklist, Calendar, PhotoGrid, SwipeCard, GanttChart (5 components)
   - **Tier 4** (40 min): stat, list, timeline, Badge, Metric, etc. (remaining components)

**Phase 4: Backend Validation (45 minutes)**
9. Add `validateUniqueIds()` function
10. Integrate into component validation endpoint
11. Add validation tests

**Phase 5: Integration Testing (1 hour)**
12. Test anchor navigation with sample pages
13. Test backward compatibility
14. Test edge cases (duplicates, invalid IDs, etc.)
15. Run full test suite

#### 3.2.2 Component Update Checklist

For each component type, follow this checklist:

- [ ] Add `id={sanitizeId(props.id)}` to root element
- [ ] If component has no single root element, add wrapper div when ID present
- [ ] Verify ID attribute renders in DOM (browser DevTools)
- [ ] Test anchor link navigation to component
- [ ] Add unit test for ID rendering
- [ ] Add unit test for component without ID (backward compat)
- [ ] Update component documentation

### 3.3 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PAGE CREATION (page-builder-agent)                      │
│                                                             │
│   Agent generates JSON:                                    │
│   {                                                         │
│     "type": "header",                                       │
│     "props": {                                              │
│       "id": "overview-section",   ← ID generated           │
│       "title": "Overview"                                   │
│     }                                                       │
│   }                                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. BACKEND VALIDATION (api-server)                         │
│                                                             │
│   POST /api/agent-pages/agents/:agentId/pages              │
│   ├─ Validate component schemas (Zod)                      │
│   ├─ Validate ID format (regex)                            │
│   ├─ Validate ID uniqueness (new)                          │
│   └─ Store in database if valid                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. DATABASE STORAGE                                         │
│                                                             │
│   agent_pages table:                                        │
│   - specification (JSON with components array)              │
│   - IDs preserved in component props                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. FRONTEND RENDERING (DynamicPageRenderer)                │
│                                                             │
│   renderValidatedComponent():                              │
│   ├─ Extract props.id                                       │
│   ├─ Sanitize ID (ensure HTML5 compliance)                 │
│   ├─ Render: <h1 id="overview-section">Overview</h1>       │
│   └─ ID is now in DOM                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. SIDEBAR NAVIGATION (anchor links work)                  │
│                                                             │
│   Sidebar renders:                                          │
│   <a href="#overview-section">Overview</a>                 │
│                                                             │
│   Click triggers:                                           │
│   document.getElementById('overview-section')               │
│     .scrollIntoView({ behavior: 'smooth' })                 │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Backward Compatibility Strategy

**Principle**: All changes must be non-breaking for existing pages.

**Strategy**:
1. **Optional IDs**: `id` prop is always optional in schemas
2. **Graceful Degradation**: Components without IDs render exactly as before
3. **No Required Changes**: Existing pages don't need updates to function
4. **Progressive Enhancement**: New pages can opt-in to anchor navigation

**Verification**:
```typescript
// Test case: Component without ID should render without id attribute
const component = { type: 'header', props: { title: 'Test' } };
const rendered = renderComponent(component, 0);
// Assert: rendered HTML does NOT have id attribute
expect(rendered.props.id).toBeUndefined();

// Test case: Component with ID should render with id attribute
const componentWithId = { type: 'header', props: { title: 'Test', id: 'test-header' } };
const renderedWithId = renderComponent(componentWithId, 0);
// Assert: rendered HTML HAS id attribute
expect(renderedWithId.props.id).toBe('test-header');
```

### 3.5 Performance Considerations

**Concern 1: ID Sanitization Overhead**
- **Impact**: `sanitizeId()` called on every component render
- **Solution**: Memoize sanitized IDs using `useMemo()` if needed
- **Measurement**: Profile component render time before/after

**Concern 2: Large Component Trees**
- **Impact**: Pages with 100+ components may see cumulative overhead
- **Solution**: Batch sanitization during initial render, cache results
- **Measurement**: Test with 200-component page, measure total render time

**Concern 3: Re-renders from ID Changes**
- **Impact**: Dynamic ID updates trigger component re-renders
- **Solution**: IDs should be static after initial render (enforce in validation)
- **Measurement**: Monitor re-render count with React DevTools Profiler

**Performance Budget**:
- ID sanitization: < 0.1ms per component
- Total overhead for 100-component page: < 10ms
- No increase in re-render frequency
- No memory leaks from cached IDs

---

## 4. REFINEMENT (Implementation Code)

### 4.1 Utility Function

**File: `/workspaces/agent-feed/frontend/src/utils/sanitizeId.ts`**

```typescript
/**
 * Sanitizes an ID to ensure HTML5 compliance
 *
 * HTML5 ID Requirements:
 * - Must start with a letter (a-z, A-Z)
 * - Can contain: letters, digits, hyphens, underscores, colons, periods
 * - No whitespace
 * - Must be unique within the document (validated elsewhere)
 *
 * @param id - The ID string to sanitize
 * @returns Sanitized ID or undefined if input is empty
 *
 * @example
 * sanitizeId('my section')        // 'my-section'
 * sanitizeId('123-header')        // 'component-123-header'
 * sanitizeId('valid-id')          // 'valid-id'
 * sanitizeId('invalid@#$id')      // 'invalid-id'
 */
export function sanitizeId(id: string | undefined | null): string | undefined {
  // Return undefined for null, undefined, or empty strings
  if (!id || typeof id !== 'string') {
    return undefined;
  }

  // Step 1: Trim and replace whitespace with hyphens
  let sanitized = id.trim().replace(/\s+/g, '-');

  // Step 2: Replace invalid characters with hyphens
  // Valid: a-z, A-Z, 0-9, hyphen, underscore, colon, period
  sanitized = sanitized.replace(/[^a-zA-Z0-9\-_:.]/g, '-');

  // Step 3: Ensure starts with a letter (HTML5 requirement)
  if (!/^[a-zA-Z]/.test(sanitized)) {
    sanitized = `component-${sanitized}`;
  }

  // Step 4: Remove consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');

  // Step 5: Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  // Return undefined if sanitization results in empty string
  return sanitized || undefined;
}

/**
 * Validates if an ID is already in HTML5-compliant format
 *
 * @param id - The ID to validate
 * @returns true if ID is valid, false otherwise
 */
export function isValidHtmlId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Must start with letter, contain only valid chars
  return /^[a-zA-Z][a-zA-Z0-9\-_:.]*$/.test(id);
}
```

**Unit Tests: `/workspaces/agent-feed/frontend/src/utils/__tests__/sanitizeId.test.ts`**

```typescript
import { sanitizeId, isValidHtmlId } from '../sanitizeId';

describe('sanitizeId', () => {
  describe('valid inputs', () => {
    it('should return valid IDs unchanged', () => {
      expect(sanitizeId('valid-id')).toBe('valid-id');
      expect(sanitizeId('header-section')).toBe('header-section');
      expect(sanitizeId('component_123')).toBe('component_123');
      expect(sanitizeId('id:with:colons')).toBe('id:with:colons');
      expect(sanitizeId('id.with.periods')).toBe('id.with.periods');
    });
  });

  describe('sanitization', () => {
    it('should replace whitespace with hyphens', () => {
      expect(sanitizeId('my section')).toBe('my-section');
      expect(sanitizeId('multiple   spaces')).toBe('multiple-spaces');
      expect(sanitizeId('tab\tseparated')).toBe('tab-separated');
    });

    it('should remove invalid characters', () => {
      expect(sanitizeId('invalid@id')).toBe('invalid-id');
      expect(sanitizeId('test#with$symbols')).toBe('test-with-symbols');
      expect(sanitizeId('hello!world')).toBe('hello-world');
    });

    it('should prefix IDs starting with numbers', () => {
      expect(sanitizeId('123-header')).toBe('component-123-header');
      expect(sanitizeId('1st-place')).toBe('component-1st-place');
    });

    it('should remove consecutive hyphens', () => {
      expect(sanitizeId('multiple---hyphens')).toBe('multiple-hyphens');
      expect(sanitizeId('a--b--c')).toBe('a-b-c');
    });

    it('should trim leading/trailing hyphens', () => {
      expect(sanitizeId('-leading')).toBe('component-leading');
      expect(sanitizeId('trailing-')).toBe('trailing');
      expect(sanitizeId('-both-')).toBe('component-both');
    });
  });

  describe('edge cases', () => {
    it('should return undefined for null/undefined', () => {
      expect(sanitizeId(null)).toBeUndefined();
      expect(sanitizeId(undefined)).toBeUndefined();
    });

    it('should return undefined for empty strings', () => {
      expect(sanitizeId('')).toBeUndefined();
      expect(sanitizeId('   ')).toBeUndefined();
    });

    it('should handle strings with only invalid characters', () => {
      expect(sanitizeId('###')).toBe('component-');
      expect(sanitizeId('@@@')).toBe('component-');
    });

    it('should handle very long IDs', () => {
      const longId = 'a'.repeat(1000);
      expect(sanitizeId(longId)).toBe(longId);
    });
  });
});

describe('isValidHtmlId', () => {
  it('should validate correct IDs', () => {
    expect(isValidHtmlId('valid-id')).toBe(true);
    expect(isValidHtmlId('header123')).toBe(true);
    expect(isValidHtmlId('my_section')).toBe(true);
  });

  it('should reject invalid IDs', () => {
    expect(isValidHtmlId('123-invalid')).toBe(false);
    expect(isValidHtmlId('invalid id')).toBe(false);
    expect(isValidHtmlId('invalid@id')).toBe(false);
    expect(isValidHtmlId('')).toBe(false);
    expect(isValidHtmlId(null as any)).toBe(false);
  });
});
```

### 4.2 Schema Updates

**File: `/workspaces/agent-feed/frontend/src/schemas/componentSchemas.ts`**

Add the `id` field to all component schemas. Here's the pattern:

```typescript
import { z } from 'zod'

// Shared ID validation schema
const IdSchema = z.string()
  .regex(
    /^[a-zA-Z][a-zA-Z0-9\-_:.]*$/,
    "ID must start with a letter and contain only letters, numbers, hyphens, underscores, colons, or periods"
  )
  .optional();

// Update ALL schemas with id field
export const HeaderSchema = z.object({
  id: IdSchema,  // ADD THIS LINE
  title: z.string().min(1, "Title is required"),
  level: z.number().min(1).max(6).optional().default(1),
  subtitle: z.string().optional()
})

export const CardSchema = z.object({
  id: IdSchema,  // ADD THIS LINE
  title: z.string().optional(),
  description: z.string().optional(),
  className: z.string().optional()
})

export const ContainerSchema = z.object({
  id: IdSchema,  // ADD THIS LINE
  size: z.enum(['sm', 'md', 'lg', 'xl', 'full']).optional(),
  className: z.string().optional()
})

// ... repeat for ALL 38 component schemas
```

**Full list of schemas to update:**

1. HeaderSchema ✓
2. StatSchema
3. TodoListSchema
4. DataTableSchema
5. ListSchema
6. FormSchema
7. TabsSchema
8. TimelineSchema
9. CardSchema ✓
10. GridSchema
11. BadgeSchema
12. MetricSchema
13. ProfileHeaderSchema
14. CapabilityListSchema
15. ButtonSchema
16. ChecklistSchema
17. CalendarSchema
18. PhotoGridSchema
19. MarkdownSchema
20. SidebarSchema (may already have ID support via items)
21. SwipeCardSchema
22. GanttChartSchema
23. DataCardSchema
24. ProgressSchema
25. StackSchema
26. ContainerSchema ✓

### 4.3 DynamicPageRenderer Updates

**File: `/workspaces/agent-feed/frontend/src/components/DynamicPageRenderer.tsx`**

**Import the utility:**

```typescript
// Add to imports at top of file
import { sanitizeId } from '../utils/sanitizeId';
```

**Update each component case:**

```typescript
// Line 287-301: header component
case 'header':
  const HeaderTag = `h${props.level || 1}` as keyof JSX.IntrinsicElements;
  return (
    <HeaderTag
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className={`font-bold text-gray-900 mb-4 ${
        props.level === 1 ? 'text-3xl' :
        props.level === 2 ? 'text-2xl' :
        props.level === 3 ? 'text-xl' :
        props.level === 4 ? 'text-lg' :
        props.level === 5 ? 'text-base' :
        'text-sm'
      }`}
    >
      {props.title}
      {props.subtitle && <span className="block text-sm font-normal text-gray-600 mt-1">{props.subtitle}</span>}
    </HeaderTag>
  );

// Line 303-347: todoList component
case 'todoList':
  const demoTodos = [
    { id: 1, title: "Example todo item 1", completed: false, priority: "high" },
    { id: 2, title: "Example todo item 2", completed: true, priority: "medium" },
    { id: 3, title: "Example todo item 3", completed: false, priority: "low" }
  ];

  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      {/* rest of component */}
    </div>
  );

// Line 349-377: dataTable component
case 'dataTable':
  const demoData = [
    { id: 1, name: "Sample Item 1", status: "Active", value: 100 },
    { id: 2, name: "Sample Item 2", status: "Pending", value: 250 },
    { id: 3, name: "Sample Item 3", status: "Completed", value: 500 }
  ];

  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
    >
      {/* rest of component */}
    </div>
  );

// Line 379-396: stat component
case 'stat':
  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      {/* rest of component */}
    </div>
  );

// Line 398-413: list component
case 'list':
  const demoItems = props.items || ["Sample item 1", "Sample item 2", "Sample item 3"];
  const ListTag = props.ordered ? 'ol' : 'ul';

  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      {/* rest of component */}
    </div>
  );

// Line 415-438: form component
case 'form':
  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      {/* rest of component */}
    </div>
  );

// Line 440-466: tabs component
case 'tabs':
  const [activeTab, setActiveTab] = React.useState(0);
  const tabs = props.tabs || [
    { label: "Tab 1", content: "Content 1" },
    { label: "Tab 2", content: "Content 2" }
  ];

  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className="bg-white rounded-lg border border-gray-200"
    >
      {/* rest of component */}
    </div>
  );

// Line 468-493: timeline component
case 'timeline':
  const demoEvents = props.events || [
    { id: 1, title: "Event 1", date: "2025-09-28", description: "First event" },
    { id: 2, title: "Event 2", date: "2025-09-29", description: "Second event" },
    { id: 3, title: "Event 3", date: "2025-09-30", description: "Third event" }
  ];

  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      {/* rest of component */}
    </div>
  );

// Line 495-506: Card component (ALREADY HAS ID - ENSURE SANITIZED)
case 'Card':
  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // CHANGE FROM props.id TO sanitizeId(props.id)
      className={`bg-white rounded-lg border border-gray-200 p-4 ${props.className || ''}`}
    >
      {props.title && <h3 className="text-lg font-semibold mb-2">{props.title}</h3>}
      {props.description && <p className="text-gray-600 mb-4">{props.description}</p>}
      {renderedChildren}
    </div>
  );

// Line 508-514: Grid component
case 'Grid':
  const gridCols = props.cols || 2;
  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className={`grid grid-cols-${gridCols} gap-4 ${props.className || ''}`}
    >
      {renderedChildren}
    </div>
  );

// Line 516-527: Badge component (SPECIAL CASE - needs wrapper)
case 'Badge':
  const variants = {
    default: 'bg-blue-100 text-blue-800',
    destructive: 'bg-red-100 text-red-800',
    secondary: 'bg-gray-100 text-gray-800',
    outline: 'bg-transparent border border-gray-300 text-gray-700'
  };

  const badgeContent = (
    <span
      key={key}
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variants[props.variant as keyof typeof variants] || variants.default}`}
    >
      {props.children}
    </span>
  );

  // If ID present, wrap in div for proper ID attachment
  if (props.id) {
    return (
      <span id={sanitizeId(props.id)} style={{ display: 'inline-block' }}>
        {badgeContent}
      </span>
    );
  }

  return badgeContent;

// Line 529-536: Metric component
case 'Metric':
  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className="text-center"
    >
      {/* rest of component */}
    </div>
  );

// Line 538-561: ProfileHeader component
case 'ProfileHeader':
  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className="bg-white rounded-lg border border-gray-200 p-6 mb-6"
    >
      {/* rest of component */}
    </div>
  );

// Line 563-576: CapabilityList component
case 'CapabilityList':
  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className="bg-white rounded-lg border border-gray-200 p-4"
    >
      {/* rest of component */}
    </div>
  );

// Line 578-589: Button component
case 'Button':
  const buttonVariants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700'
  };
  return (
    <button
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className={`inline-flex items-center px-4 py-2 rounded-md font-medium ${buttonVariants[props.variant as keyof typeof buttonVariants] || buttonVariants.default} ${props.className || ''}`}
    >
      {props.children}
    </button>
  );

// Line 591-603: Container component
case 'Container':
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full'
  };
  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className={`mx-auto px-4 ${sizeClasses[props.size as keyof typeof sizeClasses || 'md']} ${props.className || ''}`}
    >
      {renderedChildren}
    </div>
  );

// Line 605-612: Stack component
case 'Stack':
  const direction = props.direction === 'horizontal' ? 'flex-row' : 'flex-col';
  const spacing = props.spacing || 4;
  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className={`flex ${direction} gap-${spacing} ${props.className || ''}`}
    >
      {renderedChildren}
    </div>
  );

// Line 614-629: DataCard component
case 'DataCard':
  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className={`bg-white rounded-lg border border-gray-200 p-6 ${props.className || ''}`}
    >
      {/* rest of component */}
    </div>
  );

// Line 631-660: Progress component
case 'Progress':
  const progressValue = Math.min(props.max || 100, Math.max(0, props.value || 0));
  const progressMax = props.max || 100;
  const percentage = (progressValue / progressMax) * 100;
  const progressVariants = {
    default: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600'
  };
  return (
    <div
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE
      className={`w-full ${props.className || ''}`}
    >
      {/* rest of component */}
    </div>
  );

// Line 662-672: PhotoGrid component (uses dedicated component)
case 'PhotoGrid':
  return (
    <PhotoGrid
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE (PhotoGrid component must also accept id prop)
      images={props.images || []}
      columns={props.columns}
      enableLightbox={props.enableLightbox}
      aspectRatio={props.aspectRatio}
      className={props.className}
    />
  );

// Line 674-684: SwipeCard component (uses dedicated component)
case 'SwipeCard':
  return (
    <SwipeCard
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE (SwipeCard component must also accept id prop)
      cards={props.cards || []}
      onSwipeLeft={props.onSwipeLeft}
      onSwipeRight={props.onSwipeRight}
      showControls={props.showControls}
      className={props.className}
    />
  );

// Line 686-695: Checklist component (uses dedicated component)
case 'Checklist':
  return (
    <Checklist
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE (Checklist component must also accept id prop)
      items={props.items || []}
      allowEdit={props.allowEdit}
      onChange={props.onChange}
      className={props.className}
    />
  );

// Line 697-706: Calendar component (uses dedicated component)
case 'Calendar':
  return (
    <Calendar
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE (Calendar component must also accept id prop)
      mode={props.mode}
      selectedDate={props.selectedDate}
      events={props.events}
      className={props.className}
    />
  );

// Line 708-715: Markdown component (uses dedicated component)
case 'Markdown':
  return (
    <MarkdownRenderer
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE (MarkdownRenderer component must also accept id prop)
      content={props.content || ''}
      className={props.className}
    />
  );

// Line 717-728: Sidebar component (NO CHANGE - already handles IDs)
case 'Sidebar':
  return (
    <Sidebar
      key={key}
      // Note: Sidebar uses items[].id for anchor links, not a root id prop
      items={props.items || []}
      activeItem={props.activeItem}
      position={props.position}
      collapsible={props.collapsible}
      defaultCollapsed={props.defaultCollapsed}
      className={props.className}
    />
  );

// Line 730-738: GanttChart component (uses dedicated component)
case 'GanttChart':
  return (
    <GanttChart
      key={key}
      id={sanitizeId(props.id)}  // ADD THIS LINE (GanttChart component must also accept id prop)
      tasks={props.tasks || []}
      viewMode={props.viewMode}
      className={props.className}
    />
  );
```

### 4.4 Dedicated Component Updates

For components that use dedicated component files (PhotoGrid, SwipeCard, etc.), update their interfaces to accept `id` prop:

**Example: PhotoGrid Component**

```typescript
// frontend/src/components/dynamic-page/PhotoGrid.tsx

export interface PhotoGridProps {
  id?: string;  // ADD THIS LINE
  images: Array<{ url: string; alt?: string; caption?: string }>;
  columns?: number;
  enableLightbox?: boolean;
  aspectRatio?: 'square' | '4:3' | '16:9' | 'auto';
  className?: string;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({
  id,  // ADD THIS
  images,
  columns = 3,
  enableLightbox = true,
  aspectRatio = 'auto',
  className = ''
}) => {
  // ... existing code

  return (
    <div
      id={id}  // ADD THIS LINE
      className={cn('photo-grid', className)}
    >
      {/* rest of component */}
    </div>
  );
};
```

**Repeat for:**
- SwipeCard.tsx
- Checklist.tsx
- Calendar.tsx
- MarkdownRenderer.tsx
- GanttChart.tsx

### 4.5 Backend Validation Updates

**File: `/workspaces/agent-feed/api-server/routes/validate-components.js`**

```javascript
// Add to imports
import { z } from 'zod';

// Add ID validation schema (line ~7)
const IdSchema = z.string()
  .regex(
    /^[a-zA-Z][a-zA-Z0-9\-_:.]*$/,
    "ID must start with a letter and contain only letters, numbers, hyphens, underscores, colons, or periods"
  )
  .optional();

// Update ALL component schemas to include id field (lines ~16-212)
const ComponentSchemas = {
  header: z.object({
    id: IdSchema,  // ADD THIS LINE
    title: z.string().min(1, "Title is required"),
    level: z.number().min(1).max(6).optional().default(1),
    subtitle: z.string().optional()
  }),

  // ... repeat for all schemas
};

// Add unique ID validation function (after ComponentSchemas definition)
/**
 * Validates that all IDs in a component tree are unique
 * @param {Array} components - Array of components to validate
 * @returns {Object} - { valid: boolean, duplicates: Array }
 */
function validateUniqueIds(components) {
  const seenIds = new Map(); // Map<id, path>
  const duplicates = [];

  function traverse(component, path) {
    const { type, props = {}, children = [] } = component;

    // Check if component has an ID
    if (props.id) {
      if (seenIds.has(props.id)) {
        duplicates.push({
          id: props.id,
          paths: [seenIds.get(props.id), path],
          message: `Duplicate ID "${props.id}" found at ${path} and ${seenIds.get(props.id)}`
        });
      } else {
        seenIds.set(props.id, path);
      }
    }

    // Recursively check children
    if (Array.isArray(children)) {
      children.forEach((child, index) => {
        if (child && typeof child === 'object') {
          traverse(child, `${path}.children[${index}]`);
        }
      });
    }
  }

  components.forEach((component, index) => {
    if (component && typeof component === 'object') {
      traverse(component, `components[${index}]`);
    }
  });

  return {
    valid: duplicates.length === 0,
    duplicates
  };
}

// Update the POST route to include unique ID validation (line ~302)
router.post('/', (req, res) => {
  const { components } = req.body;
  const errors = [];

  // ... existing validation code

  // Validate each component
  components.forEach((component, index) => {
    validateComponent(component, `components[${index}]`);
  });

  // ADD THIS SECTION: Validate unique IDs
  const idValidation = validateUniqueIds(components);
  if (!idValidation.valid) {
    errors.push({
      path: 'components',
      type: 'uniqueness',
      message: 'Duplicate IDs found',
      duplicates: idValidation.duplicates
    });
  }

  // Return validation results
  res.json({
    valid: errors.length === 0,
    errors,
    componentCount: components.length,
    timestamp: new Date().toISOString()
  });
});
```

**File: `/workspaces/agent-feed/api-server/routes/agent-pages.js`**

Add the same unique ID validation to the page creation/update endpoints:

```javascript
// Around line where pages are created/updated
router.post('/agents/:agentId/pages', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { title, specification, layout, components, metadata } = req.body;

    // Extract components array for validation
    let componentsToValidate = components;
    if (!componentsToValidate && specification) {
      const spec = typeof specification === 'string'
        ? JSON.parse(specification)
        : specification;
      componentsToValidate = spec.components;
    }

    // Validate unique IDs if components exist
    if (componentsToValidate && Array.isArray(componentsToValidate)) {
      const idValidation = validateUniqueIds(componentsToValidate);
      if (!idValidation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Duplicate IDs found in components',
          duplicates: idValidation.duplicates
        });
      }
    }

    // ... rest of page creation logic
  } catch (error) {
    // ... error handling
  }
});
```

---

## 5. COMPLETION

### 5.1 Testing Strategy

#### 5.1.1 Unit Tests

**Test Suite 1: sanitizeId Utility**
- [ ] Valid IDs return unchanged
- [ ] Whitespace replaced with hyphens
- [ ] Invalid characters removed
- [ ] IDs starting with numbers get prefixed
- [ ] Consecutive hyphens collapsed
- [ ] Null/undefined returns undefined
- [ ] Empty strings return undefined

**Test Suite 2: Component ID Rendering**

For EACH component type (38 tests):
- [ ] Component with ID renders id attribute
- [ ] Component without ID renders without id attribute
- [ ] ID is sanitized before rendering
- [ ] Component still functions with ID present

Example test structure:

```typescript
describe('DynamicPageRenderer - ID Rendering', () => {
  describe('header component', () => {
    it('should render id attribute when provided', () => {
      const component = {
        type: 'header',
        props: {
          title: 'Test Header',
          id: 'test-header'
        }
      };

      const { container } = render(<DynamicPageRenderer pageData={{ components: [component] }} />);
      const header = container.querySelector('#test-header');

      expect(header).toBeTruthy();
      expect(header.tagName).toBe('H1');
      expect(header.textContent).toContain('Test Header');
    });

    it('should not render id attribute when not provided', () => {
      const component = {
        type: 'header',
        props: {
          title: 'Test Header'
        }
      };

      const { container } = render(<DynamicPageRenderer pageData={{ components: [component] }} />);
      const header = container.querySelector('h1');

      expect(header).toBeTruthy();
      expect(header.id).toBe('');
    });

    it('should sanitize invalid IDs', () => {
      const component = {
        type: 'header',
        props: {
          title: 'Test Header',
          id: 'invalid id with spaces'
        }
      };

      const { container } = render(<DynamicPageRenderer pageData={{ components: [component] }} />);
      const header = container.querySelector('#invalid-id-with-spaces');

      expect(header).toBeTruthy();
    });
  });

  // Repeat for all 38 component types
});
```

**Test Suite 3: Backend Validation**
- [ ] Duplicate ID detection works
- [ ] Invalid ID format rejected
- [ ] Nested component IDs validated
- [ ] Empty components array passes
- [ ] Components without IDs pass

#### 5.1.2 Integration Tests

**Test 1: Anchor Navigation**
```typescript
describe('Anchor Navigation', () => {
  it('should scroll to section when anchor link clicked', async () => {
    const pageData = {
      components: [
        {
          type: 'Sidebar',
          props: {
            items: [
              { id: 'nav-1', label: 'Overview', href: '#overview' },
              { id: 'nav-2', label: 'Details', href: '#details' }
            ]
          }
        },
        {
          type: 'header',
          props: { id: 'overview', title: 'Overview', level: 2 }
        },
        {
          type: 'header',
          props: { id: 'details', title: 'Details', level: 2 }
        }
      ]
    };

    const { getByText } = render(<DynamicPageRenderer pageData={pageData} />);

    // Mock scrollIntoView
    const scrollIntoViewMock = jest.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    // Click anchor link
    const link = getByText('Details');
    fireEvent.click(link);

    // Verify scrollIntoView called on correct element
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start'
    });
  });
});
```

**Test 2: Browser Hash Navigation**
```typescript
describe('Browser Hash Navigation', () => {
  it('should scroll to section on page load with hash', () => {
    window.location.hash = '#overview';

    const pageData = {
      components: [
        { type: 'header', props: { id: 'overview', title: 'Overview' } }
      ]
    };

    render(<DynamicPageRenderer pageData={pageData} />);

    // Verify browser scrolled to element
    const overviewHeader = document.getElementById('overview');
    expect(overviewHeader).toBeTruthy();
    // Additional verification that scroll occurred
  });
});
```

**Test 3: Backward Compatibility**
```typescript
describe('Backward Compatibility', () => {
  it('should render pages without IDs correctly', () => {
    const legacyPageData = {
      components: [
        { type: 'header', props: { title: 'Legacy Header' } },
        { type: 'Card', props: { title: 'Legacy Card' } }
      ]
    };

    const { container } = render(<DynamicPageRenderer pageData={legacyPageData} />);

    expect(container.querySelector('h1')).toBeTruthy();
    expect(container.querySelector('.bg-white')).toBeTruthy();
    // Verify no id attributes present
    expect(container.querySelector('[id]')).toBeFalsy();
  });
});
```

#### 5.1.3 End-to-End Tests

**E2E Test 1: Full Page Creation Flow**
1. Create page via page-builder-agent with IDs
2. Verify backend validation passes
3. Retrieve page from API
4. Render page in DynamicPageRenderer
5. Verify all IDs present in DOM
6. Click sidebar anchor links
7. Verify smooth scrolling occurs

**E2E Test 2: Duplicate ID Prevention**
1. Attempt to create page with duplicate IDs
2. Verify backend returns 400 error
3. Verify error message lists duplicate IDs
4. Fix duplicates and retry
5. Verify page creation succeeds

**E2E Test 3: Invalid ID Sanitization**
1. Create page with invalid IDs (spaces, special chars)
2. Verify backend accepts after sanitization
3. Render page
4. Verify sanitized IDs in DOM

### 5.2 Deployment Steps

#### Phase 1: Pre-Deployment (Development)

1. **Code Implementation** (3-4 hours)
   - [ ] Create `sanitizeId()` utility function
   - [ ] Write unit tests for `sanitizeId()`
   - [ ] Update all frontend component schemas
   - [ ] Update all backend component schemas
   - [ ] Update all 38 component cases in DynamicPageRenderer
   - [ ] Update dedicated component files (PhotoGrid, etc.)
   - [ ] Add backend unique ID validation
   - [ ] Run all unit tests

2. **Integration Testing** (1 hour)
   - [ ] Test anchor navigation with sample pages
   - [ ] Test backward compatibility
   - [ ] Test edge cases (duplicates, invalid IDs)
   - [ ] Manual QA in development environment

3. **Code Review** (30 minutes)
   - [ ] Review all changed files
   - [ ] Verify TypeScript types are correct
   - [ ] Check for any missed components
   - [ ] Validate test coverage > 90%

#### Phase 2: Staging Deployment

4. **Deploy to Staging** (15 minutes)
   - [ ] Merge PR to staging branch
   - [ ] Deploy backend changes
   - [ ] Deploy frontend changes
   - [ ] Run smoke tests

5. **Staging Validation** (30 minutes)
   - [ ] Create test page with IDs
   - [ ] Verify anchor navigation works
   - [ ] Test with existing pages (backward compat)
   - [ ] Performance testing (100+ component page)
   - [ ] Cross-browser testing (Chrome, Firefox, Safari)

#### Phase 3: Production Deployment

6. **Production Deployment** (30 minutes)
   - [ ] Create deployment checklist
   - [ ] Schedule maintenance window (if needed)
   - [ ] Deploy backend first (backward compatible)
   - [ ] Wait 10 minutes, monitor for errors
   - [ ] Deploy frontend
   - [ ] Monitor error logs

7. **Post-Deployment Verification** (15 minutes)
   - [ ] Test production page with IDs
   - [ ] Verify existing pages still work
   - [ ] Check performance metrics
   - [ ] Monitor error rates

8. **Documentation** (30 minutes)
   - [ ] Update component documentation with ID prop
   - [ ] Update page-builder-agent instructions
   - [ ] Update developer guide
   - [ ] Announce feature to team

### 5.3 Verification Checklist

#### Functional Verification

- [ ] **V1**: All 38 component types render IDs when provided
- [ ] **V2**: Components without IDs render without id attributes
- [ ] **V3**: Sidebar anchor links scroll to correct sections
- [ ] **V4**: Browser hash navigation (e.g., `/page#section`) works
- [ ] **V5**: Smooth scrolling animation works
- [ ] **V6**: IDs are unique within each page (validated by backend)
- [ ] **V7**: Invalid IDs are sanitized to HTML5-compliant format
- [ ] **V8**: Duplicate IDs are rejected with clear error messages

#### Non-Functional Verification

- [ ] **V9**: No performance degradation (< 10ms overhead for 100 components)
- [ ] **V10**: No memory leaks from ID caching
- [ ] **V11**: TypeScript compilation succeeds with no errors
- [ ] **V12**: All unit tests pass (100% for ID rendering)
- [ ] **V13**: All integration tests pass
- [ ] **V14**: Test coverage > 90% for changed code
- [ ] **V15**: No ESLint warnings in changed files

#### Compatibility Verification

- [ ] **V16**: Existing pages without IDs still render correctly
- [ ] **V17**: Existing pages without IDs have same performance
- [ ] **V18**: No breaking changes to component APIs
- [ ] **V19**: Backend validation is backward compatible
- [ ] **V20**: Frontend schemas match backend schemas

#### Accessibility Verification

- [ ] **V21**: IDs are unique for ARIA compliance
- [ ] **V22**: Screen readers can navigate using IDs
- [ ] **V23**: Keyboard navigation works with anchor links
- [ ] **V24**: Focus management works with ID-based navigation

#### Browser Compatibility

- [ ] **V25**: Chrome (latest 2 versions)
- [ ] **V26**: Firefox (latest 2 versions)
- [ ] **V27**: Safari (latest 2 versions)
- [ ] **V28**: Edge (latest 2 versions)
- [ ] **V29**: Mobile Safari (iOS 15+)
- [ ] **V30**: Mobile Chrome (Android)

### 5.4 Rollback Plan

If critical issues are discovered post-deployment:

**Rollback Triggers:**
- Anchor navigation completely broken
- Existing pages fail to render
- Performance degradation > 50ms for typical pages
- Critical accessibility issues
- Database corruption or data loss

**Rollback Steps:**

1. **Immediate Rollback (5 minutes)**
   - [ ] Revert frontend deployment to previous version
   - [ ] Verify existing pages render correctly
   - [ ] Monitor error rates

2. **Optional Backend Rollback (if needed)**
   - [ ] Revert backend validation changes
   - [ ] Note: Backend changes are backward compatible, rollback only if critical

3. **Post-Rollback**
   - [ ] Investigate root cause
   - [ ] Fix issue in development
   - [ ] Re-test thoroughly
   - [ ] Redeploy with fix

### 5.5 Success Metrics

**Immediate Metrics (Day 1)**
- Zero errors related to ID rendering
- 100% of anchor links functional
- No performance regressions
- No user-reported issues

**Short-term Metrics (Week 1)**
- 50+ new pages created with anchor navigation
- Zero duplicate ID validation failures (after initial learning curve)
- Positive user feedback on anchor navigation feature
- No backward compatibility issues reported

**Long-term Metrics (Month 1)**
- Anchor navigation used in 80%+ of new pages
- Improved page navigation engagement (measured by scroll events)
- Reduced support tickets for "can't navigate to section" issues
- Documentation and examples widely adopted

---

## 6. APPENDICES

### Appendix A: Complete Component Type Inventory

| # | Component Type | Root Element | Priority | ID Support |
|---|----------------|--------------|----------|------------|
| 1 | header | h1-h6 | High | Add |
| 2 | Card | div | High | Sanitize existing |
| 3 | Container | div | High | Add |
| 4 | Grid | div | High | Add |
| 5 | Stack | div | High | Add |
| 6 | DataCard | div | High | Add |
| 7 | ProfileHeader | div | High | Add |
| 8 | todoList | div | Medium | Add |
| 9 | dataTable | div | Medium | Add |
| 10 | form | div | Medium | Add |
| 11 | tabs | div | Medium | Add |
| 12 | Checklist | div (dedicated) | Medium | Add to component |
| 13 | Calendar | div (dedicated) | Medium | Add to component |
| 14 | PhotoGrid | div (dedicated) | Medium | Add to component |
| 15 | SwipeCard | div (dedicated) | Medium | Add to component |
| 16 | GanttChart | div (dedicated) | Medium | Add to component |
| 17 | stat | div | Low | Add |
| 18 | list | div | Low | Add |
| 19 | timeline | div | Low | Add |
| 20 | Badge | span (needs wrapper) | Low | Add with wrapper |
| 21 | Metric | div | Low | Add |
| 22 | CapabilityList | div | Low | Add |
| 23 | Button | button | Low | Add |
| 24 | Progress | div | Low | Add |
| 25 | Markdown | div (dedicated) | Low | Add to component |
| 26 | Sidebar | aside (dedicated) | Special | No change needed |

### Appendix B: HTML5 ID Requirements

**Valid Characters:**
- Letters: a-z, A-Z
- Digits: 0-9
- Special: hyphen (-), underscore (_), colon (:), period (.)

**Rules:**
- Must start with a letter
- Must be at least 1 character long
- No whitespace allowed
- Case-sensitive
- Must be unique within document

**Examples:**
- ✅ `header-section`
- ✅ `section_1`
- ✅ `nav:main`
- ✅ `item.1`
- ❌ `123-section` (starts with number)
- ❌ `my section` (contains space)
- ❌ `section@home` (invalid character)

### Appendix C: Performance Benchmarks

**Target Performance:**
- ID sanitization: < 0.1ms per component
- Component render with ID: < 1ms overhead
- 100-component page: < 10ms total ID overhead
- 1000-component page: < 100ms total ID overhead

**Measurement Tools:**
- React DevTools Profiler
- Chrome Performance tab
- Custom performance marks:
  ```typescript
  performance.mark('id-sanitize-start');
  sanitizeId(props.id);
  performance.mark('id-sanitize-end');
  performance.measure('id-sanitize', 'id-sanitize-start', 'id-sanitize-end');
  ```

### Appendix D: Related Documentation

**Internal Docs:**
- Component Schema Reference: `/frontend/src/schemas/componentSchemas.ts`
- DynamicPageRenderer Documentation: `/frontend/src/components/DynamicPageRenderer.tsx` (comments)
- Backend Validation Guide: `/api-server/routes/validate-components.js`

**External References:**
- [HTML5 ID Attribute Spec](https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute)
- [MDN: HTML id attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/id)
- [Zod Documentation](https://zod.dev/)
- [React Router Hash Links](https://reactrouter.com/en/main/components/hash-link)

---

## Document Metadata

**Version:** 1.0
**Created:** 2025-10-07
**Author:** Claude (Sonnet 4.5)
**Status:** Ready for Implementation
**Estimated Implementation Time:** 6-8 hours
**Priority:** High (Blocks anchor navigation feature)

**Change Log:**
- 2025-10-07: Initial specification created

**Reviewers:**
- [ ] Frontend Lead
- [ ] Backend Lead
- [ ] QA Lead
- [ ] Product Manager

**Approval:**
- [ ] Approved for implementation
- [ ] Resources allocated
- [ ] Timeline confirmed

---

## Quick Start for Implementation Agents

**Step 1**: Read Sections 1-2 (Specification & Pseudocode)
**Step 2**: Create `sanitizeId()` utility and tests (Section 4.1)
**Step 3**: Update schemas (Section 4.2)
**Step 4**: Update DynamicPageRenderer (Section 4.3) - work in batches of 10 components
**Step 5**: Update dedicated components (Section 4.4)
**Step 6**: Add backend validation (Section 4.5)
**Step 7**: Run tests (Section 5.1)
**Step 8**: Deploy following checklist (Section 5.2)

**Questions?** Refer to Section 1.3 (Edge Cases) and Appendices A-D.
