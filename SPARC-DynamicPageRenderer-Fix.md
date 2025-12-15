# SPARC Specification: DynamicPageRenderer Component Fix

**Project**: Agent Feed - Dynamic Page Rendering System
**Component**: DynamicPageRenderer.tsx
**Version**: 1.0
**Date**: 2025-10-06
**Status**: Specification Phase

---

## S - SPECIFICATION

### 1.1 Problem Statement

The DynamicPageRenderer component successfully fetches page data from the API but fails to render the components array. The component has complete rendering infrastructure (`renderComponent()` and `renderValidatedComponent()` functions) but the `renderPageContent()` function does not properly utilize them to render the 18 components in `pageData.components`.

**Current Behavior**:
- API returns: `{success: true, page: {id, title, layout: "sidebar", components: [...]}}`
- Component fetches data successfully
- Component has rendering functions defined
- BUT: Components array is never rendered to the screen

**Root Cause**:
The `renderPageContent()` function (lines 580-687) has complex fallback logic but the primary rendering path for `pageData.components` is incomplete or buggy.

### 1.2 Functional Requirements

#### FR-001: Component Array Rendering
**Priority**: Critical
**Description**: Render all components from `pageData.components` array
**Acceptance Criteria**:
- All 18 components in the array are rendered in order
- Each component uses its defined `type`, `props`, and `children`
- Components render in a vertical stack with appropriate spacing
- Nested children components render recursively

#### FR-002: Layout Support
**Priority**: High
**Description**: Support different layout types for component organization
**Acceptance Criteria**:
- "sidebar" layout renders components with a sidebar structure
- "single-column" layout renders components in a vertical stack
- "two-column" layout renders components in a 2-column grid
- Default layout falls back to single-column

#### FR-003: Nested Component Rendering
**Priority**: High
**Description**: Support recursive rendering of nested component children
**Acceptance Criteria**:
- Components with `children` array render child components
- Nesting depth is unlimited (recursive rendering)
- Child components maintain parent-child relationship visually
- Container components (Card, Grid, Stack, Container) properly wrap children

#### FR-004: Validation Integration
**Priority**: High
**Description**: Maintain existing Zod schema validation
**Acceptance Criteria**:
- All components validate props against ComponentSchemas
- Validation errors display using ValidationError component
- Invalid components show error UI but don't break page rendering
- Validation happens before component rendering

#### FR-005: State Management
**Priority**: Medium
**Description**: Handle loading, error, and success states properly
**Acceptance Criteria**:
- Loading state shows spinner while fetching data
- Error state shows error message with retry option
- Success state renders all components
- Empty state shows helpful message when no components exist

#### FR-006: Advanced Component Support
**Priority**: High
**Description**: Ensure all 7 advanced components render correctly
**Acceptance Criteria**:
- PhotoGrid renders with images, columns, lightbox support
- SwipeCard renders with swipe functionality
- Checklist renders with interactive checkboxes
- Calendar renders with date picker and events
- Markdown renders formatted content
- Sidebar renders navigation with collapsible sections
- GanttChart renders project timeline

#### FR-007: Standard Component Support
**Priority**: High
**Description**: Ensure all existing components continue working
**Acceptance Criteria**:
- All 20+ existing components render (header, stat, todoList, Card, Grid, etc.)
- Props are passed correctly to each component
- Styling is consistent across components
- Components are responsive

### 1.3 Non-Functional Requirements

#### NFR-001: Performance
**Category**: Performance
**Description**: Component rendering should be fast and efficient
**Measurement**:
- Initial render < 100ms for pages with 20 components
- Re-render < 50ms when data updates
- No memory leaks from component unmounting

#### NFR-002: Error Resilience
**Category**: Reliability
**Description**: Single component failures should not break entire page
**Measurement**:
- Failed component shows error UI
- Other components continue rendering
- Console logs all errors for debugging

#### NFR-003: Type Safety
**Category**: Code Quality
**Description**: Full TypeScript type coverage
**Measurement**:
- No `any` types in new code
- All props properly typed
- Compile-time type checking

#### NFR-004: Accessibility
**Category**: Accessibility
**Description**: WCAG 2.1 AA compliance
**Measurement**:
- Semantic HTML elements
- Proper ARIA labels
- Keyboard navigation support

### 1.4 Data Model

#### Component Configuration Structure
```typescript
interface ComponentConfig {
  type: string;                    // Component type (e.g., "PhotoGrid", "Card")
  props?: Record<string, any>;     // Component-specific props
  children?: ComponentConfig[];    // Nested child components
}

interface DynamicPageData {
  id: string;
  agentId?: string;
  title: string;
  version?: string | number;
  layout?: "sidebar" | "single-column" | "two-column" | any[];  // Layout type
  components?: ComponentConfig[];   // Array of 18+ components
  specification?: string | any;     // Alternative format (JSON string or object)
  metadata?: {
    description?: string;
    tags?: string[];
    icon?: string;
  };
  status?: "draft" | "published" | "archived";
  createdAt?: string;
  updatedAt?: string;
}
```

#### API Response Structure
```typescript
interface APIResponse {
  success: boolean;
  page: DynamicPageData;
  error?: string;
}
```

### 1.5 Use Cases

#### UC-001: Render Page with 18 Components
**Actor**: End User
**Preconditions**:
- User navigates to `/agents/:agentId/pages/:pageId`
- Page data exists in database with 18 components
- API is responsive

**Main Flow**:
1. User navigates to dynamic page URL
2. System fetches page data from API
3. System displays loading spinner
4. API returns page data with 18 components
5. System validates each component's props
6. System renders all 18 components in order
7. User sees fully rendered page

**Postconditions**:
- All 18 components are visible
- Page is interactive
- No console errors

**Alternative Flow 1 - Component Validation Error**:
5a. System detects invalid props on component #5
5b. System renders error UI for component #5
5c. System continues rendering remaining 13 components
5d. User sees 17 working components + 1 error component

#### UC-002: Nested Component Rendering
**Actor**: End User
**Preconditions**:
- Page has Card component with nested Grid and Button children
- All components have valid configurations

**Main Flow**:
1. System renders Card component
2. System detects Card has children array
3. System recursively calls renderComponent() for each child
4. System renders Grid inside Card
5. System renders Button inside Grid
6. User sees properly nested component structure

**Postconditions**:
- Visual hierarchy matches component tree
- Styling is preserved at all nesting levels

#### UC-003: Handle Empty Components Array
**Actor**: End User
**Preconditions**:
- Page exists but has empty components array
- API returns successfully

**Main Flow**:
1. User navigates to page
2. System fetches page data
3. System detects components array is empty
4. System renders empty state message
5. User sees "No components configured" message

**Postconditions**:
- Helpful message displayed
- No errors in console

### 1.6 Edge Cases

1. **Missing Components Array**: Page data has no `components` field
2. **Null Components**: `pageData.components = null`
3. **Invalid Component Type**: Component type doesn't match any registered component
4. **Circular Children**: Component has itself as a child (infinite recursion)
5. **Malformed Props**: Props are string instead of object
6. **Large Components Array**: 100+ components in array
7. **Mixed Formats**: Some components in `specification`, others in `components`
8. **React Key Conflicts**: Multiple components with same type/props generate same key

### 1.7 Constraints

**Technical Constraints**:
- Must maintain backward compatibility with existing pages
- Must work with current API response format
- Cannot modify ComponentSchemas or component implementations
- Must use existing validation infrastructure

**Business Constraints**:
- Changes must not break existing published pages
- Must support migration path from old layout format
- Must complete in single development iteration

**Regulatory Constraints**:
- Must not expose sensitive data in error messages
- Must maintain accessibility standards

### 1.8 Success Metrics

**Quantitative Metrics**:
- 100% of components in array render successfully
- 0 runtime errors for valid page data
- < 100ms render time for 20-component pages
- 95%+ code coverage for new rendering logic

**Qualitative Metrics**:
- Visual hierarchy matches component tree
- Developer can add new page without debugging renderer
- Error messages are clear and actionable

---

## P - PSEUDOCODE

### 2.1 High-Level Algorithm

```
FUNCTION DynamicPageRenderer():
  1. FETCH page data from API
  2. IF loading THEN show spinner
  3. IF error THEN show error state
  4. IF success THEN:
     a. Extract components array from pageData
     b. Validate layout type
     c. Apply layout wrapper
     d. Render each component with validation
  5. Display metadata footer
END FUNCTION
```

### 2.2 Component Rendering Flow

```
FUNCTION renderPageContent(pageData):
  // Step 1: Extract components array
  components = extractComponentsArray(pageData)

  // Step 2: Validate components exist
  IF components is null OR empty:
    RETURN renderEmptyState()
  END IF

  // Step 3: Determine layout type
  layoutType = pageData.layout OR "single-column"

  // Step 4: Apply layout wrapper
  layoutWrapper = getLayoutWrapper(layoutType)

  // Step 5: Render all components with error boundaries
  renderedComponents = []
  FOR EACH component IN components:
    TRY:
      validatedComponent = renderComponent(component)
      renderedComponents.push(validatedComponent)
    CATCH error:
      errorUI = renderComponentError(component, error)
      renderedComponents.push(errorUI)
      logError(error)
    END TRY
  END FOR

  // Step 6: Wrap in layout and return
  RETURN layoutWrapper(renderedComponents)
END FUNCTION
```

### 2.3 Extract Components Array

```
FUNCTION extractComponentsArray(pageData):
  // Priority 1: Check specification field (new format)
  IF pageData.specification EXISTS:
    TRY:
      spec = parseSpecification(pageData.specification)
      IF spec.components EXISTS AND is array:
        RETURN spec.components
      END IF
    CATCH parseError:
      logWarning("Failed to parse specification", parseError)
    END TRY
  END IF

  // Priority 2: Check direct components array
  IF pageData.components EXISTS AND is array:
    RETURN pageData.components
  END IF

  // Priority 3: Check legacy layout format
  IF pageData.layout EXISTS AND is array:
    RETURN convertLayoutToComponents(pageData.layout)
  END IF

  // No components found
  RETURN null
END FUNCTION
```

### 2.4 Layout Wrapper Selection

```
FUNCTION getLayoutWrapper(layoutType):
  SWITCH layoutType:
    CASE "sidebar":
      RETURN (components) => {
        sidebarComponents = filterComponentsByType(components, "Sidebar")
        contentComponents = filterComponentsExcluding(components, "Sidebar")

        RETURN (
          <div className="flex gap-6">
            <aside className="w-64">{sidebarComponents}</aside>
            <main className="flex-1 space-y-6">{contentComponents}</main>
          </div>
        )
      }

    CASE "two-column":
      RETURN (components) => {
        RETURN (
          <div className="grid grid-cols-2 gap-6">
            {components}
          </div>
        )
      }

    CASE "single-column":
    DEFAULT:
      RETURN (components) => {
        RETURN (
          <div className="space-y-6">
            {components}
          </div>
        )
      }
  END SWITCH
END FUNCTION
```

### 2.5 Render Single Component

```
FUNCTION renderComponent(config, index):
  // Step 1: Extract configuration
  type = config.type
  props = config.props OR {}
  children = config.children OR []

  // Step 2: Validate with Zod schema
  schema = ComponentSchemas[type]
  IF schema EXISTS:
    TRY:
      validatedProps = schema.parse(props)
    CATCH zodError:
      RETURN <ValidationError componentType={type} errors={zodError} />
    END TRY
  ELSE:
    validatedProps = props
  END IF

  // Step 3: Generate stable key
  key = generateComponentKey(type, index, validatedProps)

  // Step 4: Render with validated props and children
  RETURN renderValidatedComponent(type, validatedProps, children, key)
END FUNCTION
```

### 2.6 Recursive Children Rendering

```
FUNCTION renderValidatedComponent(type, props, children, key):
  // Step 1: Render nested children recursively
  renderedChildren = []
  IF children.length > 0:
    FOR EACH (child, childIndex) IN children:
      renderedChild = renderComponent(child, childIndex)
      renderedChildren.push(renderedChild)
    END FOR
  END IF

  // Step 2: Match component type and render
  SWITCH type:
    CASE "Card":
      RETURN (
        <div key={key} className="bg-white rounded-lg border p-4">
          {props.title AND <h3>{props.title}</h3>}
          {props.description AND <p>{props.description}</p>}
          {renderedChildren}  // Recursively rendered children
        </div>
      )

    CASE "Grid":
      gridCols = props.cols OR 2
      RETURN (
        <div key={key} className={`grid grid-cols-${gridCols} gap-4`}>
          {renderedChildren}
        </div>
      )

    CASE "PhotoGrid":
      RETURN <PhotoGrid key={key} {...props} />

    CASE "Sidebar":
      RETURN <Sidebar key={key} {...props} />

    // ... all other component types

    DEFAULT:
      RETURN (
        <div key={key} className="p-2 border rounded">
          <div className="text-xs text-gray-500">Unknown: {type}</div>
          {renderedChildren}
        </div>
      )
  END SWITCH
END FUNCTION
```

### 2.7 Error Handling

```
FUNCTION renderComponentError(component, error):
  RETURN (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-2 text-red-800">
        <AlertCircle />
        <span className="font-medium">Component Error</span>
      </div>
      <div className="text-sm text-red-700 mt-2">
        Type: {component.type}
        Error: {error.message}
      </div>
      <details className="mt-2">
        <summary className="text-xs cursor-pointer">View Details</summary>
        <pre className="text-xs mt-2">{JSON.stringify(component, null, 2)}</pre>
      </details>
    </div>
  )
END FUNCTION
```

### 2.8 Empty State Handling

```
FUNCTION renderEmptyState():
  RETURN (
    <div className="bg-white rounded-lg border p-12 text-center">
      <Eye className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No Components Configured
      </h3>
      <p className="text-gray-500 mb-4">
        This page doesn't have any components yet.
      </p>
      <Button onClick={navigateToEdit}>
        Add Components
      </Button>
    </div>
  )
END FUNCTION
```

### 2.9 Key Generation

```
FUNCTION generateComponentKey(type, index, props):
  // Strategy: Use index as primary key, add type for readability
  // Note: Don't use Math.random() - causes re-renders

  IF props.id EXISTS:
    RETURN `${type}-${props.id}`
  ELSE IF props.key EXISTS:
    RETURN props.key
  ELSE:
    RETURN `${type}-${index}`
  END IF
END FUNCTION
```

---

## A - ARCHITECTURE

### 3.1 Component Structure

```
DynamicPageRenderer (Root Component)
├── State Management
│   ├── pageData: DynamicPageData | null
│   ├── loading: boolean
│   ├── error: string | null
│   └── activeTab (for tabs component): number
│
├── Data Fetching Layer
│   └── useEffect → fetchPageData()
│       └── GET /api/agent-pages/agents/:agentId/pages/:pageId
│
├── Rendering Pipeline
│   ├── renderPageContent() [MAIN ENTRY]
│   │   ├── extractComponentsArray()
│   │   ├── getLayoutWrapper()
│   │   └── Map over components → renderComponent()
│   │
│   ├── renderComponent() [VALIDATION LAYER]
│   │   ├── Extract config (type, props, children)
│   │   ├── Zod schema validation
│   │   └── renderValidatedComponent()
│   │
│   └── renderValidatedComponent() [UI LAYER]
│       ├── Recursive children rendering
│       ├── Component type matching (switch/case)
│       └── Return JSX element
│
├── Error Boundaries
│   ├── Network error state
│   ├── Validation error display (ValidationError)
│   └── Component render error fallback
│
└── UI Layers
    ├── Header (title, status, version)
    ├── Content Area (layout wrapper + components)
    └── Footer (metadata, tags, timestamps)
```

### 3.2 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. USER NAVIGATION                                       │
│    /agents/:agentId/pages/:pageId                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. COMPONENT MOUNT                                       │
│    useEffect() → fetchPageData()                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. API REQUEST                                           │
│    GET /api/agent-pages/agents/123/pages/456           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. API RESPONSE                                          │
│    {success: true, page: {components: [18 items]}}      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. STATE UPDATE                                          │
│    setPageData(data.page)                               │
│    setLoading(false)                                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 6. RE-RENDER                                             │
│    renderPageContent() called                           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 7. COMPONENT EXTRACTION                                  │
│    extractComponentsArray(pageData)                     │
│    → Returns array of 18 ComponentConfig objects        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 8. LAYOUT DETERMINATION                                  │
│    layoutType = pageData.layout || "single-column"      │
│    layoutWrapper = getLayoutWrapper(layoutType)         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 9. COMPONENT ITERATION (Loop 18 times)                  │
│    components.map((config, index) => {                  │
│      renderComponent(config, index)                     │
│    })                                                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 10. PER-COMPONENT VALIDATION                             │
│     ComponentSchemas[type].parse(props)                 │
│     If validation fails → ValidationError component     │
│     If validation succeeds → continue                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 11. COMPONENT RENDERING                                  │
│     renderValidatedComponent(type, props, children)     │
│     - Handle nested children recursively                │
│     - Return JSX element                                │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 12. LAYOUT WRAPPING                                      │
│     layoutWrapper(renderedComponents)                   │
│     - Apply sidebar/grid/column structure               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 13. FINAL RENDER                                         │
│     DOM displays all 18 components                      │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Component Dependencies

```
DynamicPageRenderer.tsx
├── React Dependencies
│   ├── React (useState, useEffect)
│   ├── react-router-dom (useParams, useNavigate)
│   └── lucide-react (icons)
│
├── Schema Validation
│   ├── zod (ZodError)
│   └── ../schemas/componentSchemas (ComponentSchemas)
│
├── Advanced Components
│   ├── ./dynamic-page/PhotoGrid
│   ├── ./dynamic-page/SwipeCard
│   ├── ./dynamic-page/Checklist
│   ├── ./dynamic-page/Calendar
│   ├── ./dynamic-page/MarkdownRenderer
│   ├── ./dynamic-page/Sidebar
│   └── ./dynamic-page/GanttChart
│
└── Error Components
    └── ./ValidationError
```

### 3.4 File Structure Changes

```
frontend/src/components/
├── DynamicPageRenderer.tsx (MODIFY)
│   ├── Add: extractComponentsArray()
│   ├── Add: getLayoutWrapper()
│   ├── Add: generateComponentKey()
│   ├── Add: renderComponentError()
│   ├── Add: renderEmptyState()
│   ├── Modify: renderPageContent() - fix component rendering
│   └── Modify: renderValidatedComponent() - remove Math.random() keys
│
├── DynamicPageRenderer.test.tsx (NEW)
│   └── Unit tests for rendering logic
│
└── dynamic-page/
    └── (no changes needed)
```

### 3.5 State Machine

```
┌──────────┐
│ INITIAL  │
│ (mount)  │
└────┬─────┘
     │
     ├── componentDidMount
     ▼
┌──────────┐
│ LOADING  │ loading: true, pageData: null
└────┬─────┘
     │
     ├── API success
     ▼
┌──────────┐
│ SUCCESS  │ loading: false, pageData: {...}, error: null
└────┬─────┘
     │
     ├── Render components
     ▼
┌──────────────────┐
│ RENDERING        │
│ - Extract array  │
│ - Validate props │
│ - Build UI tree  │
└──────────────────┘
     │
     ├── All succeed
     ▼
┌──────────────────┐
│ DISPLAYED        │ All 18 components visible
└──────────────────┘

Alternative flows:

LOADING ─── API error ──▶ ERROR (loading: false, error: string)
SUCCESS ─── Empty array ─▶ EMPTY_STATE
RENDERING ─ Validation fail ─▶ PARTIAL_ERROR (some components render)
```

### 3.6 Performance Optimization Strategy

1. **Memoization**:
   - Memoize `renderComponent` to prevent re-renders
   - Use `React.memo()` for ValidationError component
   - Cache layout wrapper functions

2. **Lazy Loading**:
   - Dynamically import advanced components (PhotoGrid, GanttChart)
   - Load only components used on page

3. **Virtual Scrolling** (future):
   - For pages with 100+ components
   - Use react-window or react-virtualized

4. **Key Optimization**:
   - Replace `Math.random()` with stable index-based keys
   - Prevents unnecessary re-renders

---

## R - REFINEMENT

### 4.1 Edge Case Handling

#### Edge Case 1: Missing Components Array
**Scenario**: `pageData.components` is undefined
**Solution**:
```typescript
const extractComponentsArray = (pageData: DynamicPageData): ComponentConfig[] | null => {
  if (!pageData) return null;

  // Try multiple sources
  const sources = [
    () => parseSpecification(pageData.specification),
    () => pageData.components,
    () => convertLayoutToComponents(pageData.layout)
  ];

  for (const source of sources) {
    try {
      const components = source();
      if (Array.isArray(components) && components.length > 0) {
        return components;
      }
    } catch (e) {
      continue; // Try next source
    }
  }

  return null; // No valid components found
};
```

#### Edge Case 2: Circular Children Reference
**Scenario**: Component A has child B, B has child A (infinite loop)
**Solution**:
```typescript
const renderComponent = (
  config: ComponentConfig,
  index: number,
  depth = 0,
  visited = new Set<string>()
): React.ReactNode => {
  // Prevent infinite recursion
  const MAX_DEPTH = 10;
  if (depth > MAX_DEPTH) {
    console.warn('Max component nesting depth exceeded');
    return null;
  }

  // Detect circular references
  const componentId = `${config.type}-${index}`;
  if (visited.has(componentId)) {
    console.warn('Circular component reference detected');
    return null;
  }

  const newVisited = new Set(visited);
  newVisited.add(componentId);

  // Continue rendering...
};
```

#### Edge Case 3: Invalid Component Type
**Scenario**: Component type is "NonExistentComponent"
**Solution**: Already handled by default case in switch statement
```typescript
default:
  return (
    <div key={key} className="p-2 border border-dashed border-yellow-300 rounded bg-yellow-50">
      <div className="text-xs font-medium text-yellow-800">
        Unknown Component: {type}
      </div>
      <div className="text-xs text-yellow-600 mt-1">
        This component type is not registered. Contact support.
      </div>
      {children.map(child => renderComponent(child))}
    </div>
  );
```

#### Edge Case 4: Malformed Props
**Scenario**: `props` is a string instead of object
**Solution**:
```typescript
const renderComponent = (config: ComponentConfig, index: number): React.ReactNode => {
  let props = config.props || {};

  // Sanitize props
  if (typeof props !== 'object' || Array.isArray(props)) {
    console.warn(`Invalid props for component ${config.type}:`, props);
    props = {}; // Fallback to empty object
  }

  // Continue with validation...
};
```

#### Edge Case 5: Large Components Array (100+ items)
**Scenario**: Page has 200 components, causing slow render
**Solution**: Implement virtualization (future enhancement)
```typescript
// For now: Add warning
if (components.length > 50) {
  console.warn(
    `Page has ${components.length} components. ` +
    'Consider splitting into multiple pages for better performance.'
  );
}

// Future: Use react-window
// import { FixedSizeList } from 'react-window';
```

#### Edge Case 6: React Key Conflicts
**Scenario**: Multiple components generate same key
**Solution**:
```typescript
const generateComponentKey = (
  type: string,
  index: number,
  props: any
): string => {
  // Priority 1: Explicit key prop
  if (props.key) return props.key;

  // Priority 2: ID prop
  if (props.id) return `${type}-${props.id}`;

  // Priority 3: Fallback to index + stable hash
  const propsHash = JSON.stringify(props).substring(0, 8);
  return `${type}-${index}-${propsHash}`;
};
```

### 4.2 Error Recovery Strategies

#### Strategy 1: Graceful Degradation
When a component fails to render, show error UI but continue rendering siblings:
```typescript
const renderPageContent = () => {
  const components = extractComponentsArray(pageData);

  return (
    <div className="space-y-6">
      {components.map((config, index) => {
        try {
          return renderComponent(config, index);
        } catch (error) {
          console.error(`Failed to render component ${index}:`, error);
          return <ComponentErrorBoundary key={index} error={error} config={config} />;
        }
      })}
    </div>
  );
};
```

#### Strategy 2: Validation Fallback
When Zod validation fails, try rendering with original props:
```typescript
const renderComponent = (config: ComponentConfig, index: number): React.ReactNode => {
  const { type, props = {}, children = [] } = config;
  const schema = ComponentSchemas[type];

  let validatedProps = props;
  let validationError = null;

  if (schema) {
    try {
      validatedProps = schema.parse(props);
    } catch (error) {
      validationError = error;
      // Try rendering with original props as fallback
      console.warn(`Validation failed for ${type}, attempting fallback render`);
    }
  }

  if (validationError) {
    return <ValidationError componentType={type} errors={validationError} />;
  }

  return renderValidatedComponent(type, validatedProps, children, index);
};
```

#### Strategy 3: Network Retry
For API failures, provide retry mechanism:
```typescript
const [retryCount, setRetryCount] = useState(0);

const fetchPageData = async () => {
  try {
    // ... fetch logic
  } catch (err) {
    if (retryCount < 3) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        fetchPageData();
      }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
    } else {
      setError('Failed to load page after 3 attempts');
    }
  }
};
```

### 4.3 Validation Strategy

#### Level 1: Schema Validation (Strict)
Use Zod schemas for known component types:
```typescript
if (ComponentSchemas[type]) {
  const validatedProps = ComponentSchemas[type].parse(props);
  // Throws if invalid
}
```

#### Level 2: Runtime Validation (Permissive)
For unknown components, basic type checking:
```typescript
if (!config.type || typeof config.type !== 'string') {
  throw new Error('Component must have a string type');
}

if (config.props && typeof config.props !== 'object') {
  console.warn('Props should be an object, got:', typeof config.props);
  config.props = {};
}
```

#### Level 3: Content Validation (Security)
Sanitize user-provided content:
```typescript
// For Markdown component
if (type === 'Markdown' && !props.sanitize === false) {
  props.content = sanitizeHtml(props.content);
}

// For URL props
if (props.href && !isValidUrl(props.href)) {
  console.warn('Invalid URL detected:', props.href);
  delete props.href;
}
```

### 4.4 Layout Refinement

#### Sidebar Layout Implementation
```typescript
const renderSidebarLayout = (components: React.ReactNode[]): React.ReactNode => {
  // Find Sidebar component(s)
  const sidebarIndex = components.findIndex(
    c => c?.props?.className?.includes('sidebar') ||
         c?.type?.displayName === 'Sidebar'
  );

  if (sidebarIndex === -1) {
    // No sidebar found, fallback to single column
    return <div className="space-y-6">{components}</div>;
  }

  const sidebar = components[sidebarIndex];
  const content = components.filter((_, i) => i !== sidebarIndex);

  return (
    <div className="flex gap-6">
      <aside className="w-64 flex-shrink-0">{sidebar}</aside>
      <main className="flex-1 space-y-6">{content}</main>
    </div>
  );
};
```

#### Responsive Grid Layout
```typescript
const renderTwoColumnLayout = (components: React.ReactNode[]): React.ReactNode => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {components}
    </div>
  );
};
```

### 4.5 Performance Optimizations

#### Optimization 1: Memoized Component Rendering
```typescript
const renderComponent = useMemo(
  () => (config: ComponentConfig, index: number) => {
    // ... rendering logic
  },
  [pageData] // Only re-create when page data changes
);
```

#### Optimization 2: Lazy Component Loading
```typescript
const PhotoGrid = lazy(() => import('./dynamic-page/PhotoGrid'));
const GanttChart = lazy(() => import('./dynamic-page/GanttChart'));

// In render:
<Suspense fallback={<ComponentLoadingSpinner />}>
  <PhotoGrid {...props} />
</Suspense>
```

#### Optimization 3: Batch State Updates
```typescript
// Instead of multiple setState calls
setLoading(false);
setPageData(data.page);
setError(null);

// Use single update
setState({
  loading: false,
  pageData: data.page,
  error: null
});
```

### 4.6 Accessibility Enhancements

#### Semantic HTML
```typescript
// Use semantic tags instead of divs
case 'header':
  return <header key={key}>...</header>;

case 'nav':
  return <nav key={key} aria-label={props.ariaLabel}>...</nav>;

case 'article':
  return <article key={key}>...</article>;
```

#### ARIA Labels
```typescript
<div
  role="region"
  aria-label={`Component: ${type}`}
  aria-describedby={`${key}-description`}
>
  {/* Component content */}
</div>
```

#### Keyboard Navigation
```typescript
// For interactive components
<div
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // Handle interaction
    }
  }}
>
  {/* Content */}
</div>
```

---

## C - COMPLETION

### 5.1 Test Scenarios

#### Test Scenario 1: Basic Component Rendering
**Given**: Page with 18 standard components (Card, Button, Grid, etc.)
**When**: User navigates to page
**Then**:
- All 18 components render in order
- Each component displays correct props
- No console errors
- Page loads in < 2 seconds

**Test Data**:
```json
{
  "success": true,
  "page": {
    "id": "test-page-1",
    "title": "Test Page",
    "components": [
      {"type": "header", "props": {"title": "Welcome", "level": 1}},
      {"type": "Card", "props": {"title": "Card 1"}},
      {"type": "Grid", "props": {"cols": 2}, "children": [
        {"type": "Button", "props": {"children": "Click me"}},
        {"type": "Badge", "props": {"children": "New"}}
      ]},
      // ... 15 more components
    ]
  }
}
```

#### Test Scenario 2: Nested Components
**Given**: Card with Grid child containing 4 Buttons
**When**: Page renders
**Then**:
- Card renders with correct styling
- Grid renders inside Card
- All 4 Buttons render inside Grid
- Visual hierarchy is correct

**Test Data**:
```json
{
  "type": "Card",
  "props": {"title": "Actions"},
  "children": [
    {
      "type": "Grid",
      "props": {"cols": 2},
      "children": [
        {"type": "Button", "props": {"children": "Save"}},
        {"type": "Button", "props": {"children": "Delete"}},
        {"type": "Button", "props": {"children": "Cancel"}},
        {"type": "Button", "props": {"children": "Share"}}
      ]
    }
  ]
}
```

#### Test Scenario 3: Advanced Components
**Given**: Page with all 7 advanced components
**When**: Page renders
**Then**:
- PhotoGrid shows images in grid
- SwipeCard is interactive
- Checklist has checkboxes
- Calendar displays dates
- Markdown renders formatted text
- Sidebar shows navigation
- GanttChart displays timeline

#### Test Scenario 4: Validation Errors
**Given**: Component with invalid props (missing required field)
**When**: Page renders
**Then**:
- ValidationError component displays
- Error shows which field is invalid
- Other components continue rendering
- Console logs validation error

**Test Data**:
```json
{
  "type": "header",
  "props": {"level": 1} // Missing required "title" field
}
```

#### Test Scenario 5: Empty Components Array
**Given**: Page with empty components array
**When**: Page renders
**Then**:
- Empty state message displays
- "Add Components" button visible
- No errors in console
- Footer still renders

#### Test Scenario 6: API Error
**Given**: API returns 500 error
**When**: User navigates to page
**Then**:
- Error state displays
- Error message is user-friendly
- Retry button available (future)
- Back button works

#### Test Scenario 7: Sidebar Layout
**Given**: Page with layout: "sidebar" and Sidebar component
**When**: Page renders
**Then**:
- Sidebar appears on left (or right based on position prop)
- Content area is next to sidebar
- Layout is responsive
- Sidebar width is 256px (w-64)

#### Test Scenario 8: Large Components Array
**Given**: Page with 100 components
**When**: Page renders
**Then**:
- All components render eventually
- Page doesn't freeze during render
- Console warning about performance
- Scroll works smoothly

#### Test Scenario 9: Unknown Component Type
**Given**: Component with type "FutureComponent"
**When**: Page renders
**Then**:
- Unknown component placeholder displays
- Shows component type name
- Children still render if present
- No crash or error boundary trigger

#### Test Scenario 10: Mixed Data Sources
**Given**: Page with components in both `specification` and `components` fields
**When**: Page renders
**Then**:
- Components from `specification` take priority
- Fallback to `components` if spec is invalid
- All components render once (no duplicates)

### 5.2 Acceptance Criteria Checklist

**Functional Requirements**:
- [ ] FR-001: All components in array render in order
- [ ] FR-002: Sidebar, two-column, and single-column layouts work
- [ ] FR-003: Nested children render recursively (tested to 5 levels deep)
- [ ] FR-004: Zod validation runs on all components with schemas
- [ ] FR-005: Loading, error, and success states display correctly
- [ ] FR-006: All 7 advanced components render and function
- [ ] FR-007: All 20+ standard components render correctly

**Non-Functional Requirements**:
- [ ] NFR-001: Page with 20 components renders in < 100ms
- [ ] NFR-002: Single component error doesn't break page
- [ ] NFR-003: No TypeScript `any` types in new code
- [ ] NFR-004: Semantic HTML and ARIA labels present

**Edge Cases**:
- [ ] Missing components array shows empty state
- [ ] Circular children references prevented
- [ ] Invalid component types show placeholder
- [ ] Malformed props sanitized
- [ ] Large arrays (100+ components) render without freeze
- [ ] React key conflicts resolved
- [ ] Null/undefined props handled gracefully

**Code Quality**:
- [ ] No `Math.random()` used for React keys
- [ ] All functions have TypeScript types
- [ ] Error messages are clear and actionable
- [ ] Console warnings for developer issues only
- [ ] No memory leaks on unmount

### 5.3 Testing Strategy

#### Unit Tests
```typescript
// DynamicPageRenderer.test.tsx

describe('extractComponentsArray', () => {
  it('should extract from specification field', () => {
    const pageData = {
      specification: JSON.stringify({
        components: [{ type: 'Card' }]
      })
    };
    expect(extractComponentsArray(pageData)).toHaveLength(1);
  });

  it('should fallback to components field', () => {
    const pageData = {
      components: [{ type: 'Card' }]
    };
    expect(extractComponentsArray(pageData)).toHaveLength(1);
  });

  it('should return null for empty page', () => {
    expect(extractComponentsArray({})).toBeNull();
  });
});

describe('renderComponent', () => {
  it('should validate props with Zod schema', () => {
    const config = {
      type: 'header',
      props: { title: 'Test', level: 1 }
    };
    const result = renderComponent(config, 0);
    expect(result).toBeTruthy();
  });

  it('should show validation error for invalid props', () => {
    const config = {
      type: 'header',
      props: { level: 1 } // Missing required title
    };
    const result = renderComponent(config, 0);
    expect(result.type).toBe(ValidationError);
  });

  it('should render children recursively', () => {
    const config = {
      type: 'Card',
      props: { title: 'Parent' },
      children: [
        { type: 'Button', props: { children: 'Child' } }
      ]
    };
    const result = renderComponent(config, 0);
    // Assert nested structure
  });
});

describe('getLayoutWrapper', () => {
  it('should return sidebar layout for "sidebar" type', () => {
    const wrapper = getLayoutWrapper('sidebar');
    expect(wrapper).toBeDefined();
  });

  it('should return single column for unknown layout', () => {
    const wrapper = getLayoutWrapper('unknown');
    expect(wrapper).toBeDefined();
  });
});
```

#### Integration Tests
```typescript
describe('DynamicPageRenderer Integration', () => {
  it('should render full page with 18 components', async () => {
    mockFetch({
      success: true,
      page: mockPageWith18Components
    });

    const { container } = render(<DynamicPageRenderer />);

    await waitFor(() => {
      expect(screen.queryByText('Loading')).not.toBeInTheDocument();
    });

    expect(container.querySelectorAll('[role="region"]')).toHaveLength(18);
  });

  it('should handle API error gracefully', async () => {
    mockFetch({ success: false, error: 'Not found' });

    render(<DynamicPageRenderer />);

    await waitFor(() => {
      expect(screen.getByText(/Error Loading Page/i)).toBeInTheDocument();
    });
  });
});
```

#### E2E Tests (Playwright/Cypress)
```typescript
test('renders dynamic page with all component types', async ({ page }) => {
  await page.goto('/agents/test-agent/pages/test-page');

  // Wait for page load
  await page.waitForSelector('[data-testid="page-content"]');

  // Verify all components present
  await expect(page.locator('[data-component-type="header"]')).toBeVisible();
  await expect(page.locator('[data-component-type="PhotoGrid"]')).toBeVisible();
  await expect(page.locator('[data-component-type="GanttChart"]')).toBeVisible();

  // Verify interactive components work
  await page.click('[data-component-type="Button"]');
  await page.check('[data-component-type="Checklist"] input[type="checkbox"]');

  // Verify no console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  expect(consoleErrors).toHaveLength(0);
});
```

### 5.4 Success Criteria

**Quantitative Metrics**:
- ✅ 100% of components in test data render (18/18)
- ✅ 0 runtime errors for valid page data
- ✅ < 100ms render time for 20-component page (measured with React Profiler)
- ✅ 95% code coverage for new rendering functions
- ✅ 0 accessibility violations (tested with axe-core)

**Qualitative Metrics**:
- ✅ Visual hierarchy matches component tree structure
- ✅ Error messages are clear: "Component 'header' is missing required field 'title'"
- ✅ Developer can create new page without debugging renderer
- ✅ Code is self-documenting with clear function names
- ✅ No regressions in existing pages

### 5.5 Deployment Checklist

**Pre-Deployment**:
- [ ] All unit tests pass (run `npm test`)
- [ ] All integration tests pass
- [ ] TypeScript compiles with no errors (`npm run type-check`)
- [ ] ESLint passes with no errors (`npm run lint`)
- [ ] Code review completed and approved
- [ ] Test with production-like data (18+ components)
- [ ] Performance profiling completed
- [ ] Accessibility audit completed

**Deployment**:
- [ ] Merge to main branch
- [ ] Deploy to staging environment
- [ ] Smoke test on staging (verify 3 different pages load)
- [ ] Monitor error logs for 1 hour
- [ ] Deploy to production
- [ ] Monitor production metrics

**Post-Deployment**:
- [ ] Verify 5 existing pages still render correctly
- [ ] Monitor error rate (should be < 0.1%)
- [ ] Monitor page load time (should be < 2s p95)
- [ ] Collect user feedback
- [ ] Document any issues in backlog

### 5.6 Rollback Plan

**Trigger Conditions**:
- Error rate > 5% for DynamicPageRenderer
- Page load time > 5 seconds
- Critical component not rendering
- Accessibility regression

**Rollback Steps**:
1. Revert to previous Git commit
2. Deploy previous version to production
3. Verify previous version works
4. Create incident report
5. Fix issues in development
6. Re-test before next deployment

### 5.7 Documentation Deliverables

1. **Code Comments**: JSDoc for all new functions
2. **README Update**: Add section on component rendering
3. **Developer Guide**: How to add new component types
4. **Architecture Diagram**: Updated data flow diagram
5. **API Contract**: Document expected page data structure
6. **Troubleshooting Guide**: Common errors and solutions

---

## Implementation Checklist

### Phase 1: Core Rendering (Day 1)
- [ ] Implement `extractComponentsArray()` function
- [ ] Fix `renderPageContent()` to call renderComponent for each item
- [ ] Replace `Math.random()` keys with `generateComponentKey()`
- [ ] Test with 18-component page

### Phase 2: Layout Support (Day 2)
- [ ] Implement `getLayoutWrapper()` function
- [ ] Add sidebar layout rendering
- [ ] Add two-column layout rendering
- [ ] Test all layout types

### Phase 3: Error Handling (Day 2)
- [ ] Add `renderComponentError()` function
- [ ] Add `renderEmptyState()` function
- [ ] Implement try-catch in component loop
- [ ] Test validation error scenarios

### Phase 4: Edge Cases (Day 3)
- [ ] Add circular reference detection
- [ ] Add max depth limit
- [ ] Handle malformed props
- [ ] Test with 100+ components

### Phase 5: Testing (Day 3-4)
- [ ] Write unit tests for all new functions
- [ ] Write integration tests for rendering pipeline
- [ ] Write E2E test for full page render
- [ ] Achieve 95% code coverage

### Phase 6: Polish (Day 4)
- [ ] Add performance optimizations (memoization)
- [ ] Improve accessibility (ARIA labels)
- [ ] Update documentation
- [ ] Code review and refinement

---

## Appendix

### A. Example Component Data

```json
{
  "success": true,
  "page": {
    "id": "example-page-001",
    "agentId": "agent-123",
    "title": "Personal Dashboard",
    "version": "1.0",
    "layout": "sidebar",
    "status": "published",
    "components": [
      {
        "type": "Sidebar",
        "props": {
          "items": [
            {"id": "home", "label": "Home", "icon": "🏠"},
            {"id": "profile", "label": "Profile", "icon": "👤"}
          ],
          "position": "left",
          "collapsible": true
        }
      },
      {
        "type": "header",
        "props": {
          "title": "Welcome Back!",
          "level": 1,
          "subtitle": "Here's your daily overview"
        }
      },
      {
        "type": "Grid",
        "props": {"cols": 3},
        "children": [
          {
            "type": "stat",
            "props": {
              "label": "Total Tasks",
              "value": 42,
              "change": 12,
              "icon": "✅"
            }
          },
          {
            "type": "stat",
            "props": {
              "label": "Completed",
              "value": 38,
              "change": 5
            }
          },
          {
            "type": "stat",
            "props": {
              "label": "Pending",
              "value": 4,
              "change": -2
            }
          }
        ]
      },
      {
        "type": "Card",
        "props": {"title": "Recent Activity"},
        "children": [
          {
            "type": "timeline",
            "props": {
              "events": [
                {
                  "id": 1,
                  "title": "Completed project",
                  "date": "2025-10-06",
                  "description": "Finished the SPARC specification"
                }
              ]
            }
          }
        ]
      },
      {
        "type": "PhotoGrid",
        "props": {
          "images": [
            {"url": "https://picsum.photos/400/300", "alt": "Photo 1"},
            {"url": "https://picsum.photos/400/301", "alt": "Photo 2"},
            {"url": "https://picsum.photos/400/302", "alt": "Photo 3"}
          ],
          "columns": 3,
          "enableLightbox": true
        }
      },
      {
        "type": "Checklist",
        "props": {
          "items": [
            {"id": 1, "text": "Review code", "checked": true},
            {"id": 2, "text": "Write tests", "checked": false},
            {"id": 3, "text": "Deploy", "checked": false}
          ],
          "allowEdit": true
        }
      },
      {
        "type": "Calendar",
        "props": {
          "mode": "single",
          "events": [
            {
              "id": 1,
              "date": "2025-10-07",
              "title": "Team meeting",
              "color": "blue"
            }
          ]
        }
      },
      {
        "type": "Markdown",
        "props": {
          "content": "# Notes\n\n- Point 1\n- Point 2\n\n**Important**: Remember to test!"
        }
      },
      {
        "type": "GanttChart",
        "props": {
          "tasks": [
            {
              "id": 1,
              "name": "Planning",
              "startDate": "2025-10-01",
              "endDate": "2025-10-05",
              "progress": 100
            },
            {
              "id": 2,
              "name": "Development",
              "startDate": "2025-10-06",
              "endDate": "2025-10-15",
              "progress": 30
            }
          ],
          "viewMode": "week"
        }
      }
    ],
    "metadata": {
      "description": "Personal productivity dashboard",
      "tags": ["dashboard", "personal", "productivity"],
      "icon": "📊"
    },
    "createdAt": "2025-09-28T10:00:00Z",
    "updatedAt": "2025-10-06T15:30:00Z"
  }
}
```

### B. Component Type Reference

| Component Type | Props Required | Children Support | Zod Schema |
|---------------|----------------|------------------|------------|
| header | title, level | No | ✅ |
| stat | label, value | No | ✅ |
| todoList | - | No | ✅ |
| dataTable | - | No | ✅ |
| list | items | No | ✅ |
| form | fields | No | ✅ |
| tabs | tabs | No | ✅ |
| timeline | events | No | ✅ |
| Card | title | Yes | ✅ |
| Grid | cols | Yes | ✅ |
| Badge | children | No | ✅ |
| Metric | value, label | No | ✅ |
| ProfileHeader | name | No | ✅ |
| CapabilityList | title, capabilities | No | ✅ |
| Button | children | No | ✅ |
| Container | - | Yes | No |
| Stack | direction | Yes | No |
| DataCard | title, value | No | No |
| Progress | value | No | No |
| PhotoGrid | images | No | ✅ |
| SwipeCard | cards | No | ✅ |
| Checklist | items | No | ✅ |
| Calendar | mode | No | ✅ |
| Markdown | content | No | ✅ |
| Sidebar | items | No | ✅ |
| GanttChart | tasks | No | ✅ |

### C. Error Codes

| Code | Description | User Message | Developer Action |
|------|-------------|--------------|------------------|
| RENDER_001 | Components array not found | "This page has no content" | Check pageData structure |
| RENDER_002 | Invalid component type | "Unknown component type" | Verify component registry |
| RENDER_003 | Validation failed | "Component configuration error" | Check props against schema |
| RENDER_004 | Circular reference | "Component structure error" | Review children relationships |
| RENDER_005 | Max depth exceeded | "Component nesting too deep" | Simplify component tree |
| RENDER_006 | Malformed props | "Invalid component data" | Check props format |

---

**End of Specification**
