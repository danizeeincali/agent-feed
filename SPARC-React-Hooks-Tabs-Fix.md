# SPARC Specification: React Hooks Violation Fix - Tabs Component

## Document Metadata
- **Project**: Agent Feed Frontend
- **Component**: DynamicPageRenderer.tsx
- **Issue**: React Hooks Rules Violation (useState called inside switch statement)
- **Severity**: Critical - Causes runtime errors
- **Date**: 2025-10-07
- **Version**: 1.0

---

## S - Specification

### 1.1 Problem Statement

**Current Issue:**
```typescript
// Line 444-445 in DynamicPageRenderer.tsx
case 'tabs':
  const [activeTab, setActiveTab] = React.useState(0); // ❌ VIOLATION
```

**Error Message:**
```
"Rendered more hooks than during the previous render"
```

**Root Cause:**
React's Rules of Hooks mandate that hooks must be called at the top level of a functional component, not inside:
- Conditionals (if/else)
- Loops (for/while/map)
- Switch statements
- Nested functions

The `useState` call on line 445 is inside a switch case block within the `renderValidatedComponent` function, violating this fundamental rule.

### 1.2 Functional Requirements

**FR-1: Hook Compliance**
- All React hooks MUST be called at the top level of the component
- Hook calls MUST occur in the same order on every render
- Hook calls MUST NOT be conditional or dynamic

**FR-2: Tabs Functionality Preservation**
- Active tab state management must continue to work
- Tab switching via click handlers must be preserved
- Visual indication of active tab must remain
- Tab content display must update correctly

**FR-3: Multiple Tabs Support**
- Each tabs component instance must have isolated state
- Multiple tabs components can coexist on the same page
- Tab state must not leak between different tabs components

**FR-4: State Persistence**
- Tab state should persist during component re-renders
- Tab state should reset when component unmounts
- No state should persist between different page loads

**FR-5: Performance Requirements**
- No performance degradation compared to current implementation
- Tab switching must be instant (< 50ms)
- Component rendering must not cause additional re-renders

### 1.3 Non-Functional Requirements

**NFR-1: Code Quality**
- Solution must follow React best practices
- Code must be maintainable and readable
- No hacky workarounds or anti-patterns

**NFR-2: Type Safety**
- Full TypeScript type safety must be maintained
- No use of `any` types for state management

**NFR-3: Backward Compatibility**
- Existing tab configurations must continue to work
- Props interface must remain unchanged
- No breaking changes to component API

**NFR-4: Testing**
- Solution must be verifiable through manual testing
- No regression in existing functionality

### 1.4 Constraints

**Technical Constraints:**
- Must work within existing React 18+ architecture
- Cannot modify external dependencies
- Must maintain current component structure
- File size constraints: Keep component under 1000 lines

**Business Constraints:**
- Zero downtime deployment required
- Must work with existing page data format
- No database schema changes allowed

### 1.5 Edge Cases

**EC-1: No Tabs Defined**
```typescript
props.tabs === undefined || props.tabs.length === 0
```
Expected: Display placeholder or empty state

**EC-2: Single Tab**
```typescript
props.tabs.length === 1
```
Expected: Display single tab, no switching needed

**EC-3: Many Tabs**
```typescript
props.tabs.length > 10
```
Expected: All tabs render, may need scrolling

**EC-4: Invalid Tab Content**
```typescript
tabs[activeTab] === undefined
```
Expected: Graceful fallback to empty content

**EC-5: Dynamic Tabs Addition/Removal**
```typescript
props.tabs changes after initial render
```
Expected: State resets, first tab becomes active

**EC-6: Multiple Tabs Components on Same Page**
```typescript
componentsArray = [
  { type: 'tabs', props: { id: 'tabs-1' } },
  { type: 'tabs', props: { id: 'tabs-2' } }
]
```
Expected: Each maintains independent state

### 1.6 Acceptance Criteria

- [ ] No React warnings about hooks in console
- [ ] No runtime errors during rendering
- [ ] Tab switching works correctly
- [ ] Multiple tabs components work independently
- [ ] Active tab visual state updates correctly
- [ ] Tab content displays correctly
- [ ] No performance degradation
- [ ] TypeScript compilation succeeds
- [ ] Code passes linting rules
- [ ] Stable component keys maintained

---

## P - Pseudocode

### 2.1 Solution Algorithm

```
ALGORITHM: Extract Tabs to Separate Component

FUNCTION TabsComponent(props):
  INPUT: { tabs, id, className }

  // Step 1: Initialize state at top level (hooks compliance)
  activeTabIndex = useState(0)

  // Step 2: Validate and normalize tabs data
  IF tabs is undefined OR tabs is not array:
    tabs = DEFAULT_TABS
  END IF

  // Step 3: Bounds check for active tab
  IF activeTabIndex >= tabs.length:
    activeTabIndex = 0
  END IF

  // Step 4: Create tab click handler
  FUNCTION handleTabClick(index):
    IF index >= 0 AND index < tabs.length:
      SET activeTabIndex to index
    END IF
  END FUNCTION

  // Step 5: Render tab headers
  tabHeaders = FOR EACH tab, index IN tabs:
    RENDER button(
      key: index,
      onClick: handleTabClick(index),
      className: IF index == activeTabIndex THEN "active" ELSE "inactive",
      content: tab.label
    )
  END FOR

  // Step 6: Render active tab content
  activeContent = tabs[activeTabIndex]?.content OR "No content"

  // Step 7: Return complete tabs UI
  RETURN div(
    className: "tabs-container",
    children: [tabHeaders, activeContent]
  )
END FUNCTION


MODIFICATION: Update renderValidatedComponent

FUNCTION renderValidatedComponent(type, props, ...):

  SWITCH type:
    CASE 'tabs':
      // Instead of calling useState here (VIOLATION)
      // Return a component that handles state internally
      RETURN <TabsComponent {...props} key={key} />

    CASE 'other-component':
      // ... other cases
  END SWITCH

END FUNCTION
```

### 2.2 State Management Strategy

```
STATE ISOLATION PATTERN:

1. Each tabs component instance gets its own state
   - State is encapsulated in TabsComponent
   - No global state pollution
   - React handles state isolation automatically

2. State lifecycle:
   - INITIALIZE: When component mounts, state = 0
   - UPDATE: When user clicks tab, state = clicked index
   - PERSIST: During re-renders (same mount)
   - DESTROY: When component unmounts

3. Key generation for component identity:
   - Use stable keys from generateComponentKey()
   - Ensures React doesn't recreate state unnecessarily
   - Prevents state reset on parent re-renders
```

### 2.3 Component Reconciliation

```
RECONCILIATION STRATEGY:

FUNCTION generateStableKey(type, index, props):
  // Priority 1: Explicit key prop
  IF props.key exists:
    RETURN props.key

  // Priority 2: ID prop
  IF props.id exists:
    RETURN type + "-" + props.id

  // Priority 3: Index-based (fallback)
  RETURN type + "-" + index
END FUNCTION

This ensures:
- Same component instance across re-renders
- State preservation during parent updates
- No unnecessary unmount/remount cycles
```

---

## A - Architecture

### 3.1 Component Structure

```
DynamicPageRenderer (Parent)
│
├─ renderValidatedComponent() (Orchestrator)
│  │
│  ├─ case 'header': → Inline JSX
│  ├─ case 'todoList': → Inline JSX
│  ├─ case 'tabs': → <TabsComponent /> ✅ NEW
│  ├─ case 'timeline': → Inline JSX
│  └─ ... other cases
│
└─ TabsComponent (Child) ✅ NEW
   │
   ├─ useState(activeTab) → Hook at top level
   ├─ Tab header rendering
   ├─ Tab content rendering
   └─ Event handlers
```

### 3.2 Data Flow

```
┌─────────────────────────────────────────┐
│  DynamicPageRenderer                    │
│  - Fetches page data                    │
│  - Extracts components array            │
└─────────────┬───────────────────────────┘
              │
              │ componentsArray
              ↓
┌─────────────────────────────────────────┐
│  renderComponent()                      │
│  - Validates component config           │
│  - Generates stable keys                │
└─────────────┬───────────────────────────┘
              │
              │ config
              ↓
┌─────────────────────────────────────────┐
│  renderValidatedComponent()             │
│  - Switch on component type             │
│  - Routes to appropriate renderer       │
└─────────────┬───────────────────────────┘
              │
              │ case 'tabs'
              ↓
┌─────────────────────────────────────────┐
│  <TabsComponent />                      │
│  - useState at top level ✅             │
│  - Manages active tab state             │
│  - Renders tab UI                       │
│  - Handles tab clicks                   │
└─────────────────────────────────────────┘
```

### 3.3 State Management Architecture

```
COMPONENT INSTANCE ISOLATION:

Page Component
├─ TabsComponent #1 (id: "user-profile-tabs")
│  └─ State: { activeTab: 2 }
│
├─ TabsComponent #2 (id: "settings-tabs")
│  └─ State: { activeTab: 0 }
│
└─ TabsComponent #3 (id: "dashboard-tabs")
   └─ State: { activeTab: 1 }

Each instance maintains its own state via React's
component instance mechanism. No central store needed.
```

### 3.4 File Organization

```
/frontend/src/components/
│
├── DynamicPageRenderer.tsx (Main file)
│   ├── Interface definitions
│   ├── Main component
│   ├── renderComponent()
│   ├── renderValidatedComponent()
│   └── TabsComponent ✅ NEW (embedded)
│
└── dynamic-page/
    ├── PhotoGrid.tsx
    ├── SwipeCard.tsx
    ├── Checklist.tsx
    └── ... (other specialized components)

DECISION: Embed TabsComponent in same file
RATIONALE:
- Small component (~50 lines)
- Tightly coupled to DynamicPageRenderer
- No reuse outside this context
- Reduces file sprawl

ALTERNATIVE: Extract to dynamic-page/Tabs.tsx
WHEN: If component exceeds 100 lines or needs reuse
```

### 3.5 Type Definitions

```typescript
// Props interface for TabsComponent
interface TabsComponentProps {
  id?: string;
  tabs?: Array<{
    label: string;
    content: React.ReactNode;
  }>;
  className?: string;
  defaultActiveTab?: number;
}

// Internal state type
type TabState = number; // index of active tab

// Event handler type
type TabClickHandler = (index: number) => void;
```

---

## R - Refinement

### 4.1 Complete Implementation

```typescript
/**
 * TabsComponent - Standalone tabs component with proper hook usage
 *
 * This component is extracted from the switch statement to comply with
 * React's Rules of Hooks. Each instance maintains its own active tab state.
 *
 * @param props - Component props including tabs array and styling
 * @returns Rendered tabs component with headers and content
 */
interface TabsComponentProps {
  id?: string;
  tabs?: Array<{
    label: string;
    content: React.ReactNode;
  }>;
  className?: string;
  defaultActiveTab?: number;
}

const TabsComponent: React.FC<TabsComponentProps> = ({
  id,
  tabs = [
    { label: "Tab 1", content: "Content 1" },
    { label: "Tab 2", content: "Content 2" }
  ],
  className = '',
  defaultActiveTab = 0
}) => {
  // ✅ Hook called at top level - complies with Rules of Hooks
  const [activeTab, setActiveTab] = React.useState<number>(defaultActiveTab);

  // Bounds check: Reset to 0 if active tab index is out of range
  React.useEffect(() => {
    if (activeTab >= tabs.length) {
      setActiveTab(0);
    }
  }, [tabs.length, activeTab]);

  // Handler for tab clicks with bounds checking
  const handleTabClick = (index: number) => {
    if (index >= 0 && index < tabs.length) {
      setActiveTab(index);
    }
  };

  // Safely get active tab content with fallback
  const activeContent = tabs[activeTab]?.content || (
    <div className="text-gray-500 text-sm">No content available</div>
  );

  return (
    <div
      id={id}
      className={`bg-white rounded-lg border border-gray-200 ${className}`}
    >
      {/* Tab Headers */}
      <div className="flex border-b">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => handleTabClick(idx)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === idx
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-selected={activeTab === idx}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6" role="tabpanel">
        {activeContent}
      </div>
    </div>
  );
};
```

### 4.2 Modified renderValidatedComponent Function

```typescript
/**
 * Renders a validated component with proper children handling
 *
 * MODIFIED: Tabs case now returns TabsComponent instead of inline JSX with hooks
 */
const renderValidatedComponent = (
  type: string,
  props: any,
  children: ComponentConfig[],
  index: number,
  depth: number = 0,
  visited: Set<string> = new Set()
): React.ReactNode => {
  const key = generateComponentKey(type, index, props);

  // Recursively render children
  const renderedChildren = children.map((child, childIndex) =>
    renderComponent(child, childIndex, depth + 1, visited)
  );

  // Component rendering logic
  switch (type) {
    // ... other cases remain unchanged ...

    case 'tabs':
      // ✅ FIXED: Return component instead of inline JSX with hooks
      return (
        <TabsComponent
          key={key}
          id={props.id}
          tabs={props.tabs}
          className={props.className}
          defaultActiveTab={props.defaultActiveTab}
        />
      );

    // ... other cases remain unchanged ...
  }
};
```

### 4.3 File Location for Component

**Option A: Embedded in DynamicPageRenderer.tsx (Recommended)**
```typescript
// Add before the main DynamicPageRenderer component (around line 50)

// ============================================
// Tabs Component - Extracted for Hooks Compliance
// ============================================

interface TabsComponentProps {
  // ... interface definition
}

const TabsComponent: React.FC<TabsComponentProps> = (props) => {
  // ... component implementation
};

// ============================================
// Main Dynamic Page Renderer
// ============================================

const DynamicPageRenderer: React.FC = () => {
  // ... existing code
};
```

**Option B: Separate File (If component grows)**
```typescript
// /frontend/src/components/dynamic-page/Tabs.tsx

import React from 'react';

export interface TabsComponentProps {
  // ... interface
}

export const TabsComponent: React.FC<TabsComponentProps> = (props) => {
  // ... implementation
};

// Then import in DynamicPageRenderer.tsx:
import { TabsComponent } from './dynamic-page/Tabs';
```

### 4.4 Complete Code Changes

**File: /workspaces/agent-feed/frontend/src/components/DynamicPageRenderer.tsx**

**CHANGE 1: Add TabsComponent after imports (line 50)**
```typescript
// Add after line 49 (after DynamicPageData interface)

/**
 * TabsComponent - Standalone tabs component with proper hook usage
 * Extracted from switch statement to comply with React's Rules of Hooks
 */
interface TabsComponentProps {
  id?: string;
  tabs?: Array<{
    label: string;
    content: React.ReactNode;
  }>;
  className?: string;
  defaultActiveTab?: number;
}

const TabsComponent: React.FC<TabsComponentProps> = ({
  id,
  tabs = [
    { label: "Tab 1", content: "Content 1" },
    { label: "Tab 2", content: "Content 2" }
  ],
  className = '',
  defaultActiveTab = 0
}) => {
  const [activeTab, setActiveTab] = React.useState<number>(defaultActiveTab);

  React.useEffect(() => {
    if (activeTab >= tabs.length) {
      setActiveTab(0);
    }
  }, [tabs.length, activeTab]);

  const handleTabClick = (index: number) => {
    if (index >= 0 && index < tabs.length) {
      setActiveTab(index);
    }
  };

  const activeContent = tabs[activeTab]?.content || (
    <div className="text-gray-500 text-sm">No content available</div>
  );

  return (
    <div
      id={id}
      className={`bg-white rounded-lg border border-gray-200 ${className}`}
    >
      <div className="flex border-b">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => handleTabClick(idx)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === idx
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-selected={activeTab === idx}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-6" role="tabpanel">
        {activeContent}
      </div>
    </div>
  );
};
```

**CHANGE 2: Replace lines 444-470 in renderValidatedComponent**
```typescript
// BEFORE (lines 444-470):
case 'tabs':
  const [activeTab, setActiveTab] = React.useState(0);
  const tabs = props.tabs || [
    { label: "Tab 1", content: "Content 1" },
    { label: "Tab 2", content: "Content 2" }
  ];

  return (
    <div key={key} id={props.id} className="bg-white rounded-lg border border-gray-200">
      <div className="flex border-b">
        {tabs.map((tab: any, idx: number) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === idx
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-6">{tabs[activeTab]?.content}</div>
    </div>
  );

// AFTER (replacement):
case 'tabs':
  return (
    <TabsComponent
      key={key}
      id={props.id}
      tabs={props.tabs}
      className={props.className}
      defaultActiveTab={props.defaultActiveTab}
    />
  );
```

### 4.5 Edge Cases Handling

```typescript
// Edge Case 1: Empty or undefined tabs array
tabs = tabs || DEFAULT_TABS; // Handled in props default value

// Edge Case 2: Active tab out of bounds after tabs change
useEffect(() => {
  if (activeTab >= tabs.length) {
    setActiveTab(0);
  }
}, [tabs.length, activeTab]);

// Edge Case 3: Invalid tab content
const activeContent = tabs[activeTab]?.content || <EmptyState />;

// Edge Case 4: Negative index clicked
const handleTabClick = (index: number) => {
  if (index >= 0 && index < tabs.length) { // Bounds check
    setActiveTab(index);
  }
};

// Edge Case 5: Multiple instances isolation
// Automatically handled by React's component instance mechanism
// Each <TabsComponent /> gets its own state closure
```

### 4.6 Accessibility Improvements

```typescript
// Add ARIA attributes for screen readers
<button
  role="tab"
  aria-selected={activeTab === idx}
  aria-controls={`tabpanel-${id}-${idx}`}
  id={`tab-${id}-${idx}`}
  // ... other props
>
  {tab.label}
</button>

<div
  role="tabpanel"
  id={`tabpanel-${id}-${activeTab}`}
  aria-labelledby={`tab-${id}-${activeTab}`}
  className="p-6"
>
  {activeContent}
</div>
```

---

## C - Completion

### 5.1 Testing Strategy

#### 5.1.1 Manual Testing Checklist

**Test 1: Basic Functionality**
```
Steps:
1. Navigate to a page with tabs component
2. Click on different tabs
3. Verify active tab changes
4. Verify content updates correctly
5. Verify visual styling updates (border, color)

Expected Results:
✓ Tabs switch smoothly
✓ Content updates immediately
✓ Active tab shows blue border
✓ Inactive tabs show gray text
✓ No console errors
```

**Test 2: Multiple Tabs Components**
```
Steps:
1. Create a page with 2+ tabs components
2. Switch tabs in first component
3. Switch tabs in second component
4. Verify states are independent

Expected Results:
✓ Each component maintains its own state
✓ Switching one doesn't affect others
✓ No state leakage between instances
```

**Test 3: Edge Cases**
```
Test 3a: Empty tabs array
- Create component with tabs: []
- Expected: Shows default tabs

Test 3b: Single tab
- Create component with 1 tab
- Expected: Shows single tab, no errors

Test 3c: Many tabs (10+)
- Create component with 15 tabs
- Expected: All render, may scroll horizontally

Test 3d: Invalid content
- Create tab with content: null
- Expected: Shows fallback message
```

**Test 4: Console Verification**
```
Open browser console and verify:
✓ No "Rendered more hooks" errors
✓ No "Cannot read property" errors
✓ No React warnings about hooks
✓ No key prop warnings
```

**Test 5: Performance Testing**
```
1. Create page with 5 tabs components
2. Monitor React DevTools Profiler
3. Switch tabs rapidly

Expected Results:
✓ Tab switches < 50ms
✓ No unnecessary re-renders of parent
✓ Only active component re-renders
```

#### 5.1.2 Verification Commands

```bash
# Step 1: Check TypeScript compilation
cd /workspaces/agent-feed/frontend
npm run build

# Expected: No TypeScript errors
# Look for: "Compiled successfully"

# Step 2: Run linter
npm run lint

# Expected: No linting errors related to hooks

# Step 3: Start dev server
npm run dev

# Expected: Server starts without errors

# Step 4: Browser console check
# Open http://localhost:5173
# Open DevTools Console
# Look for: No errors or warnings
```

#### 5.1.3 Test Data

**Sample Page Configuration for Testing**
```json
{
  "title": "Tabs Test Page",
  "components": [
    {
      "type": "tabs",
      "props": {
        "id": "test-tabs-1",
        "tabs": [
          {
            "label": "Overview",
            "content": "Overview content here"
          },
          {
            "label": "Details",
            "content": "Details content here"
          },
          {
            "label": "Settings",
            "content": "Settings content here"
          }
        ]
      }
    },
    {
      "type": "header",
      "props": {
        "level": 2,
        "title": "Second Tabs Component"
      }
    },
    {
      "type": "tabs",
      "props": {
        "id": "test-tabs-2",
        "tabs": [
          {
            "label": "Tab A",
            "content": "Content A"
          },
          {
            "label": "Tab B",
            "content": "Content B"
          }
        ]
      }
    }
  ]
}
```

### 5.2 Deployment Checklist

- [ ] Code changes reviewed
- [ ] TypeScript compilation successful
- [ ] No console errors during testing
- [ ] Manual testing completed
- [ ] Multiple tabs components tested
- [ ] Edge cases verified
- [ ] Performance checked (no degradation)
- [ ] Accessibility features verified
- [ ] Git commit created
- [ ] Code pushed to repository

### 5.3 Rollback Plan

**If issues are detected after deployment:**

```typescript
// Quick rollback: Revert to inline implementation with TODO
case 'tabs':
  // TODO: Fix hooks violation
  // Temporary inline implementation
  const tabsData = props.tabs || DEFAULT_TABS;
  const [activeTab, setActiveTab] = React.useState(0); // Known violation

  return (
    // ... original implementation
  );
```

**Better approach:**
```bash
# Git revert the changes
git revert <commit-hash>
git push origin main

# Then investigate and re-implement fix
```

### 5.4 Success Metrics

**Immediate Metrics (Post-Deployment):**
- Zero React hook warnings in console ✅
- Zero runtime errors related to tabs ✅
- Tab switching functionality preserved ✅

**Short-term Metrics (1 week):**
- No user-reported issues with tabs
- No increase in error logs
- Performance metrics unchanged

**Long-term Metrics (1 month):**
- Code maintainability improved
- Easier to add new tab features
- Developer onboarding easier (no confusing hook violations)

### 5.5 Documentation Updates

**Update Required:**
```markdown
# Component Documentation

## Tabs Component

### Usage
The tabs component has been refactored to comply with React's Rules of Hooks.
Each tabs instance maintains independent state.

### Props
- `id` (string, optional): Unique identifier for the tabs
- `tabs` (array, optional): Array of tab objects with label and content
- `className` (string, optional): Additional CSS classes
- `defaultActiveTab` (number, optional): Index of initially active tab

### Example
{
  "type": "tabs",
  "props": {
    "id": "my-tabs",
    "tabs": [
      { "label": "Tab 1", "content": "Content 1" },
      { "label": "Tab 2", "content": "Content 2" }
    ]
  }
}

### Technical Notes
- Uses internal useState for active tab management
- Automatically resets active tab if tabs array changes
- Fully accessible with ARIA attributes
```

### 5.6 Post-Implementation Review

**Questions to Answer After Deployment:**

1. Are there any console warnings? ❓
2. Does tab switching feel responsive? ❓
3. Can multiple tabs components coexist? ❓
4. Is the code easier to understand? ❓
5. Did TypeScript catch any issues? ❓
6. Are there any performance regressions? ❓

**Review Meeting Agenda:**
- Demo the fix in action
- Show before/after console output
- Discuss lessons learned about React hooks
- Identify similar violations in codebase
- Plan preventive measures (linting rules, etc.)

---

## Appendix

### A.1 React Rules of Hooks Reference

**The Rules:**
1. Only call hooks at the top level
   - ❌ Don't call hooks inside loops, conditions, or nested functions
   - ✅ Call them at the top level of your function component

2. Only call hooks from React functions
   - ✅ Call hooks from React function components
   - ✅ Call hooks from custom hooks
   - ❌ Don't call hooks from regular JavaScript functions

**Why These Rules Exist:**
React relies on the order of hook calls to maintain state correctly between renders. If hooks are called conditionally, the order can change, causing state to be associated with the wrong hook.

### A.2 Alternative Solutions Considered

**Alternative 1: Use useReducer**
```typescript
// More complex, no clear benefit for this use case
const [state, dispatch] = useReducer(tabReducer, { activeTab: 0 });
```
❌ Rejected: Overkill for simple tab state

**Alternative 2: Lift State to Parent**
```typescript
// Parent manages all tabs state
const [tabStates, setTabStates] = useState<Record<string, number>>({});
```
❌ Rejected: Couples child to parent, less reusable

**Alternative 3: Use Class Component**
```typescript
class TabsComponent extends React.Component {
  state = { activeTab: 0 };
  // ...
}
```
❌ Rejected: Moving away from class components

**Alternative 4: Selected Solution - Extract to Function Component**
✅ **Selected**: Simple, follows React best practices, maintains encapsulation

### A.3 Related Issues to Investigate

**Potential Similar Violations:**
Search codebase for other switch cases with hooks:
```bash
grep -n "case.*:" DynamicPageRenderer.tsx | grep -A5 "useState\|useEffect"
```

**Preventive Measures:**
1. Add ESLint rule: `react-hooks/rules-of-hooks`
2. Code review checklist: "No hooks in switch statements"
3. Developer training on React hooks rules

### A.4 References

- [React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)
- [ESLint Plugin React Hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)

---

## Document Approval

**Author:** Claude (SPARC Specification Agent)
**Date:** 2025-10-07
**Version:** 1.0

**Reviewers:**
- [ ] Frontend Lead
- [ ] React Specialist
- [ ] QA Engineer

**Status:** ✅ Ready for Implementation
