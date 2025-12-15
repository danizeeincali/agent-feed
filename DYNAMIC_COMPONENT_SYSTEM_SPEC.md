# Dynamic Component System - Technical Specification
**Date:** September 30, 2025
**System:** Agent-Driven Dynamic Page Builder with Data Separation

---

## System Architecture

### Overview
A component-driven dynamic page rendering system where agents programmatically define UI layouts via API, components render with mock/demo data initially, and the system is extensible to connect to real data sources.

### Key Principles
1. **UI Definition Separation:** Agent defines layout structure, not implementation
2. **Component Registry:** Reusable UI components with standardized props
3. **Data Layer (Phase 2):** Components can optionally fetch data from agent-specific endpoints
4. **MVP-First:** Start with working UI, add data integration later
5. **Zero Backend Lock-in:** Components work standalone or with data sources

---

## Current State Analysis

### ✅ What's Working
- API endpoints for dynamic pages (`/api/agent-pages/agents/:agentId/pages`)
- Layout structure with `type` + `config` format
- Component registry exists (`renderComponent` function with 7 types)
- TypeScript interfaces aligned with API

### ❌ What's Broken
- `renderPageContent()` displays JSON instead of rendering components
- `renderComponent()` never gets called
- Missing component types: `header`, `todoList`
- No data fetching layer

### 🎯 Success Criteria
- Agent-defined layouts render as actual UI components
- Components display with demo/placeholder data
- System extensible for real data integration
- 8-10 component types available
- 100% test coverage with real rendering

---

## API Structure

### Page Layout Format
```json
{
  "success": true,
  "page": {
    "id": "personal-todos-dashboard-v3",
    "agentId": "personal-todos-agent",
    "title": "Personal Todos Dashboard",
    "version": "3.0.0",
    "layout": [
      {
        "id": "header-1",
        "type": "header",
        "config": {
          "title": "My Personal Todos",
          "level": 1
        }
      },
      {
        "id": "list-1",
        "type": "todoList",
        "config": {
          "showCompleted": false,
          "sortBy": "priority",
          "filterTags": []
        }
      }
    ],
    "components": ["header", "todoList"],
    "metadata": {
      "description": "Manage your personal tasks",
      "tags": ["productivity", "todos"],
      "icon": "✓"
    },
    "createdAt": "2025-09-28T10:00:00.000Z",
    "updatedAt": "2025-09-30T10:00:00.000Z"
  }
}
```

---

## Component Registry Design

### Component Interface
```typescript
interface ComponentConfig {
  type: string;           // Component type identifier
  props: Record<string, any>;  // Component-specific configuration
  children?: ComponentConfig[];  // Nested components
}

interface DataSource {
  endpoint: string;       // API endpoint for data
  method: 'GET' | 'POST'; // HTTP method
  refreshInterval?: number; // Auto-refresh in ms (optional)
  transform?: string;     // Transform function name (optional)
}

interface ComponentDefinition {
  id: string;             // Unique instance ID
  type: string;           // Component type
  config: Record<string, any>;  // Props
  dataSource?: DataSource;      // Optional data source
}
```

### Phase 1 Components (MVP)
Required for immediate functionality:

1. **header** - Section headers/titles
   - Props: `title` (string), `level` (1-6), `subtitle?` (string)
   - Example: `{ type: "header", config: { title: "Dashboard", level: 1 } }`

2. **todoList** - Task list with checkboxes
   - Props: `showCompleted` (bool), `sortBy` (string), `filterTags` (array)
   - Example: `{ type: "todoList", config: { showCompleted: false } }`
   - Demo data: Shows 3-5 placeholder todos

3. **dataTable** - Sortable/filterable table
   - Props: `columns` (array), `sortable` (bool), `filterable` (bool)
   - Demo data: Shows sample rows

4. **stat** - Metric display (improved version of existing `Metric`)
   - Props: `value` (string/number), `label` (string), `change?` (number), `icon?` (string)
   - Example: `{ type: "stat", config: { value: 42, label: "Active Tasks", change: +5 } }`

5. **list** - Generic list with custom items
   - Props: `items` (array), `ordered` (bool), `icon?` (string)
   - Demo data: Shows sample items

6. **form** - Input fields with validation
   - Props: `fields` (array), `submitLabel` (string), `onSubmit` (action)
   - Demo: Non-functional form for display

7. **tabs** - Tabbed interface
   - Props: `tabs` (array of {label, content})
   - Example: Multiple content sections

8. **timeline** - Event timeline
   - Props: `events` (array), `orientation` ('vertical'|'horizontal')
   - Demo data: Shows sample events

### Existing Components (Keep)
- ✅ `Card` - Container with optional header
- ✅ `Grid` - Layout grid
- ✅ `Badge` - Status badges
- ✅ `Metric` - Simple metric (will be superseded by `stat`)
- ✅ `ProfileHeader` - Profile display
- ✅ `CapabilityList` - Capability display
- ✅ `Button` - Clickable actions

---

## Implementation Plan

### Task 1: Fix Core Rendering
**File:** `DynamicPageRenderer.tsx` (lines 190-221)

**Current (BROKEN):**
```typescript
{pageData.layout.map((component: any, index: number) => (
  <div key={index}>
    <span>{component.type}</span>
    <pre>{JSON.stringify(component.config, null, 2)}</pre>
  </div>
))}
```

**Fixed:**
```typescript
{pageData.layout.map((layoutItem: any) =>
  renderComponent({
    type: layoutItem.type,
    props: layoutItem.config || {},
    children: []
  })
)}
```

### Task 2: Add Missing Components
**File:** `DynamicPageRenderer.tsx` (lines 81-182, switch statement)

Add 8 new component cases:
1. `header` - H1-H6 tags with styling
2. `todoList` - Task list with demo data
3. `dataTable` - Table with demo rows
4. `stat` - Metric card with optional trend
5. `list` - Ordered/unordered list
6. `form` - Input fields (display only)
7. `tabs` - Tabbed interface
8. `timeline` - Event timeline

### Task 3: Create useComponentData Hook (Phase 2 - Optional)
**File:** `hooks/useComponentData.ts` (NEW)

```typescript
export const useComponentData = (dataSource?: DataSource) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!dataSource) return;

    setLoading(true);
    fetch(dataSource.endpoint, { method: dataSource.method })
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));

    if (dataSource.refreshInterval) {
      const interval = setInterval(() => {
        fetch(dataSource.endpoint, { method: dataSource.method })
          .then(res => res.json())
          .then(setData)
          .catch(setError);
      }, dataSource.refreshInterval);

      return () => clearInterval(interval);
    }
  }, [dataSource]);

  return { data, loading, error };
};
```

### Task 4: Update Components to Use Data (Phase 2 - Optional)
Example for `todoList`:
```typescript
case 'todoList':
  const { data: todos, loading } = useComponentData(config.dataSource);

  const displayTodos = todos || [
    { id: 1, title: "Sample Todo 1", completed: false },
    { id: 2, title: "Sample Todo 2", completed: true },
    { id: 3, title: "Sample Todo 3", completed: false }
  ];

  return (
    <div className="bg-white rounded-lg border p-6">
      {loading ? <LoadingSpinner /> : (
        displayTodos.map(todo => (
          <TodoItem key={todo.id} {...todo} />
        ))
      )}
    </div>
  );
```

---

## Testing Strategy

### Unit Tests (Vitest)
**File:** `src/tests/unit/dynamic-component-rendering.test.ts`

Test coverage:
1. **Rendering Tests (8 tests)**
   - Each component type renders without error
   - Props are correctly applied

2. **Layout Integration (4 tests)**
   - renderPageContent calls renderComponent
   - Multiple components render in sequence
   - Unknown component types show fallback

3. **Data Layer (4 tests - Phase 2)**
   - useComponentData fetches from endpoint
   - Loading states display correctly
   - Demo data shows when no dataSource

4. **Error Handling (3 tests)**
   - Invalid component types handled gracefully
   - Missing props don't crash
   - Network errors show error state

**Total:** 19 unit tests

### E2E Tests (Playwright)
**File:** `tests/e2e/dynamic-component-rendering.spec.ts`

Test scenarios:
1. **Page loads and renders components** (not JSON)
2. **Header component displays title**
3. **TodoList shows placeholder items**
4. **DataTable shows demo rows**
5. **All components render without console errors**
6. **Screenshots of rendered page**
7. **Component interactions work** (if applicable)

**Total:** 7 E2E tests

---

## Concurrent Swarm Deployment

### Agent 1: Renderer (Fix Core)
**Task:** Fix `renderPageContent()` to call `renderComponent()`
**Files:** `DynamicPageRenderer.tsx` (lines 190-221)
**Duration:** 15 min
**Output:** renderPageContent correctly maps layout to components

### Agent 2: ComponentLibrary (Add Components)
**Task:** Add 8 missing component types to switch statement
**Files:** `DynamicPageRenderer.tsx` (lines 81-182)
**Duration:** 45 min
**Output:** All component types implemented with demo data

### Agent 3: DataLayer (Optional Hook)
**Task:** Create useComponentData hook for future data integration
**Files:** `hooks/useComponentData.ts` (NEW)
**Duration:** 20 min
**Output:** Reusable data fetching hook

### Agent 4: Tester
**Task:** Create comprehensive test suite (19 unit + 7 E2E)
**Files:**
- `src/tests/unit/dynamic-component-rendering.test.ts`
- `tests/e2e/dynamic-component-rendering.spec.ts`
**Duration:** 30 min
**Output:** Full test coverage with 100% pass rate

**Total Duration:** ~1.5 hours (concurrent execution: 45 min)

---

## Success Metrics

### Functional Requirements
- ✅ Pages render actual UI components (not JSON)
- ✅ All 15+ component types work (7 existing + 8 new)
- ✅ Demo/placeholder data displays correctly
- ✅ System extensible for real data integration
- ✅ No console errors during rendering

### Quality Requirements
- ✅ 100% test pass rate (19 unit + 7 E2E = 26 tests)
- ✅ Zero mock data in tests (tests hit real API)
- ✅ TypeScript type safety (no `any` in public APIs)
- ✅ Performance: Page renders in <500ms
- ✅ Accessibility: Semantic HTML, ARIA labels

### Documentation
- ✅ Component registry documented
- ✅ Example configs for each component
- ✅ Agent integration guide
- ✅ Data source integration examples

---

## Future Enhancements (Post-MVP)

### Phase 2: Real Data Integration
- Create generic data API: `/api/agents/:agentId/data/:collection`
- Add CRUD operations for agent data
- Update components to use real data
- Add optimistic updates

### Phase 3: Actions & Interactivity
- Add `actions` config to components
- Handle form submissions
- Implement drag-drop for kanban/lists
- Add real-time updates via WebSocket

### Phase 4: Advanced Components
- Rich text editor
- Code block with syntax highlighting
- File upload
- Image gallery
- Map/location display
- Chat interface
- Calendar/scheduler
- Kanban board

---

## Risk Mitigation

### Risk 1: Components Don't Render
**Mitigation:** Unit test each component type individually before integration

### Risk 2: Performance Issues
**Mitigation:** Use React.memo for expensive components, lazy load heavy components

### Risk 3: Type Safety
**Mitigation:** Define strict TypeScript interfaces for all component props

### Risk 4: Breaking Changes
**Mitigation:** Keep existing components working, add new types separately

---

**Specification Complete - Ready for Implementation**
**Next Step:** Deploy concurrent swarm (4 agents) for parallel development