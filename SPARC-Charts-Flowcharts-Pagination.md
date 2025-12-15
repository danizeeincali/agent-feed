# SPARC Specification: Chart Components, Mermaid Flowcharts, and Enhanced Pagination

**Project**: Agent Feed Frontend Enhancement
**Date**: 2025-10-07
**Version**: 1.0
**Status**: Ready for Implementation
**Author**: SPARC Specification Agent
**Estimated Implementation Time**: 18-24 hours

---

## Table of Contents

1. [Specification Phase](#1-specification-phase)
2. [Pseudocode Phase](#2-pseudocode-phase)
3. [Architecture Phase](#3-architecture-phase)
4. [Refinement Phase](#4-refinement-phase)
5. [Completion Phase](#5-completion-phase)

---

# 1. Specification Phase

## 1.1 Executive Summary

This specification defines the implementation of three major features for the Agent Feed dynamic page builder system:

1. **Chart Components Integration** - Register existing LineChart, BarChart, and PieChart components into the DynamicPageRenderer
2. **Mermaid Flowchart Support** - Add flowchart rendering capabilities to MarkdownRenderer
3. **Enhanced Pagination/Tabs** - Improve tab component for better paginated content UX

These features will enable the page-builder-agent to create rich, interactive data visualizations, process diagrams, and well-organized content layouts.

## 1.2 Functional Requirements

### FR-001: LineChart Component Registration
**Priority**: HIGH
**Description**: LineChart must be registered in DynamicPageRenderer and componentSchemas
**Acceptance Criteria**:
- LineChart component can be rendered via DynamicPageRenderer
- Zod schema validates LineChart props
- Page-builder-agent can create LineChart components in JSON specifications
- Chart displays time-series data with multiple datasets
- Supports gradient fill, trend indicators, and grid lines

### FR-002: BarChart Component Registration
**Priority**: HIGH
**Description**: BarChart must be registered in DynamicPageRenderer and componentSchemas
**Acceptance Criteria**:
- BarChart component can be rendered via DynamicPageRenderer
- Zod schema validates BarChart props
- Supports both vertical and horizontal orientations
- Displays value labels when enabled
- Renders color-coded bars with legend

### FR-003: PieChart Component Registration
**Priority**: HIGH
**Description**: PieChart must be registered in DynamicPageRenderer and componentSchemas
**Acceptance Criteria**:
- PieChart component can be rendered via DynamicPageRenderer
- Zod schema validates PieChart props
- Supports donut mode
- Displays percentage labels for slices > 5%
- Shows total value and summary statistics

### FR-004: Chart Data Transformation
**Priority**: HIGH
**Description**: System must transform simple data arrays into ChartDataPoint format
**Acceptance Criteria**:
- Accepts simplified data format from page-builder-agent
- Converts to ChartDataPoint[] with proper typing
- Handles missing or malformed data gracefully
- Provides default config values

### FR-005: Mermaid Flowchart Rendering
**Priority**: HIGH
**Description**: MarkdownRenderer must detect and render mermaid code blocks as flowcharts
**Acceptance Criteria**:
- Detects code blocks with language identifier "mermaid"
- Renders flowchart diagrams inline
- Supports all mermaid diagram types (flowchart, sequence, gantt, class, state, etc.)
- Falls back gracefully if mermaid syntax is invalid
- Applies consistent styling with dark/light mode support

### FR-006: Mermaid Error Handling
**Priority**: MEDIUM
**Description**: Invalid mermaid syntax should not break page rendering
**Acceptance Criteria**:
- Catches mermaid parsing errors
- Displays error message to user
- Shows original mermaid source code for debugging
- Allows page to continue rendering other components

### FR-007: Enhanced Tab Component
**Priority**: MEDIUM
**Description**: Improve existing tabs component with enhanced UX features
**Acceptance Criteria**:
- Supports keyboard navigation (Arrow keys, Home, End)
- Provides tab content lazy loading option
- Adds tab icons support
- Includes tab badges (notification counts)
- Supports disabled tabs
- Maintains URL hash for deep linking

### FR-008: Tab State Persistence
**Priority**: MEDIUM
**Description**: Tab state should persist across page reloads when configured
**Acceptance Criteria**:
- Saves active tab to localStorage (optional)
- Restores active tab on page load
- Falls back to default tab if saved tab is invalid
- URL hash takes precedence over localStorage

### FR-009: Paginated Content Component
**Priority**: MEDIUM
**Description**: Create new Pagination component for DynamicPageRenderer
**Acceptance Criteria**:
- Displays configurable items per page
- Shows page numbers with ellipsis for large page counts
- Includes prev/next buttons
- Supports jump to page input
- Displays total items count
- Maintains scroll position on page change

### FR-010: Chart Responsiveness
**Priority**: HIGH
**Description**: All charts must be responsive and mobile-friendly
**Acceptance Criteria**:
- Charts scale proportionally on different screen sizes
- SVG viewBox maintains aspect ratio
- Labels remain readable on mobile devices
- Touch interactions work on mobile (tooltips, etc.)

### FR-011: Chart Accessibility
**Priority**: MEDIUM
**Description**: Charts must be accessible to screen readers and keyboard users
**Acceptance Criteria**:
- Proper ARIA labels for chart elements
- Data table alternative provided via aria-describedby
- Keyboard navigation for interactive elements
- Color contrast meets WCAG 2.1 AA standards
- Tooltips work with keyboard focus

### FR-012: Chart Data Export
**Priority**: LOW
**Description**: Users should be able to export chart data
**Acceptance Criteria**:
- Export to CSV format
- Export to JSON format
- Export chart as PNG image (optional)
- Download button integrated into chart UI

## 1.3 Non-Functional Requirements

### NFR-001: Performance - Chart Rendering
**Requirement**: Chart components must render within 200ms for datasets up to 1000 points
**Measurement**: Performance.now() timing in development console
**Validation**: Performance profiling with React DevTools

### NFR-002: Performance - Mermaid Rendering
**Requirement**: Mermaid diagrams must render within 500ms for diagrams up to 100 nodes
**Measurement**: Browser performance API
**Validation**: Load testing with complex diagrams

### NFR-003: Performance - Tab Switching
**Requirement**: Tab switches must be instant (<50ms perceived latency)
**Measurement**: User perception testing + performance metrics
**Validation**: Manual testing and React Profiler

### NFR-004: Bundle Size - Mermaid Library
**Requirement**: Mermaid library should not increase bundle size by more than 500KB (gzipped)
**Measurement**: Webpack bundle analyzer
**Validation**: Build size comparison before/after
**Mitigation**: Dynamic import for mermaid (code splitting)

### NFR-005: Accessibility - WCAG 2.1 AA Compliance
**Requirement**: All new components must meet WCAG 2.1 Level AA standards
**Measurement**: axe DevTools accessibility scan
**Validation**: Manual keyboard navigation testing

### NFR-006: Browser Compatibility
**Requirement**: Support modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
**Measurement**: Cross-browser testing
**Validation**: BrowserStack automated tests

### NFR-007: Mobile Responsiveness
**Requirement**: Charts and tabs must be fully functional on mobile devices (iOS 14+, Android 10+)
**Measurement**: Mobile device testing
**Validation**: Responsive design testing tools

### NFR-008: Security - XSS Prevention
**Requirement**: All user-provided content must be sanitized (especially mermaid diagrams)
**Measurement**: Security audit with OWASP ZAP
**Validation**: Penetration testing

### NFR-009: Memory Management
**Requirement**: No memory leaks when rendering/unmounting charts repeatedly
**Measurement**: Chrome DevTools Memory Profiler
**Validation**: Stress testing with component mount/unmount cycles

### NFR-010: Error Recovery
**Requirement**: Component errors must not crash entire page
**Measurement**: Error boundary testing
**Validation**: Inject intentional errors and verify graceful degradation

## 1.4 Edge Cases and Error Scenarios

### EC-001: Empty Chart Data
**Scenario**: Chart component receives empty data array
**Expected Behavior**: Display "No data available" message with chart title
**Implementation**: Check data.length === 0 before rendering

### EC-002: Malformed Chart Data
**Scenario**: Chart data has invalid structure (missing required fields)
**Expected Behavior**: Zod validation fails, display ValidationError component
**Implementation**: Schema validation with detailed error messages

### EC-003: Extremely Large Dataset
**Scenario**: Chart receives 10,000+ data points
**Expected Behavior**: Display warning, recommend data aggregation, limit rendering
**Implementation**: Max data point limit with console warning

### EC-004: Invalid Mermaid Syntax
**Scenario**: Mermaid code block contains syntax errors
**Expected Behavior**: Show error message + original source code
**Implementation**: try/catch around mermaid.render() with fallback UI

### EC-005: Mermaid Library Load Failure
**Scenario**: Mermaid library fails to load (network error, CDN down)
**Expected Behavior**: Display code block with syntax highlighting instead
**Implementation**: Lazy load with error handling, fallback to rehype-highlight

### EC-006: Tab Content Missing
**Scenario**: Tab component has label but no content
**Expected Behavior**: Display empty state message in tab panel
**Implementation**: Check for content existence, show placeholder

### EC-007: All Tabs Disabled
**Scenario**: All tabs in a tab set are disabled
**Expected Behavior**: Display warning, no tabs are clickable
**Implementation**: Validation to require at least one enabled tab

### EC-008: Tab Deep Link to Non-Existent Tab
**Scenario**: URL hash points to tab that doesn't exist
**Expected Behavior**: Activate first available tab, show console warning
**Implementation**: Hash validation with fallback to default tab

### EC-009: Chart Color Array Shorter Than Data
**Scenario**: 10 data points but only 3 colors provided
**Expected Behavior**: Cycle through colors using modulo operator
**Implementation**: `color = colors[index % colors.length]`

### EC-010: Negative or Zero Chart Values
**Scenario**: Chart data contains negative values (for PieChart)
**Expected Behavior**: Display validation error, PieChart requires positive values
**Implementation**: Schema validation with min(0) for PieChart

### EC-011: Chart Rendering in Hidden Container
**Scenario**: Chart component mounts while parent is display:none
**Expected Behavior**: Defer rendering until container is visible
**Implementation**: IntersectionObserver to detect visibility

### EC-012: Pagination with Zero Items
**Scenario**: Pagination component receives empty items array
**Expected Behavior**: Display "No items to display" message
**Implementation**: Early return with empty state UI

### EC-013: Pagination Page Number Out of Range
**Scenario**: User navigates to page 999 when only 10 pages exist
**Expected Behavior**: Redirect to last valid page
**Implementation**: Math.min(requestedPage, totalPages)

### EC-014: Concurrent Tab Switches
**Scenario**: User rapidly clicks multiple tabs
**Expected Behavior**: Only final tab becomes active, no race conditions
**Implementation**: Debounce or use React's automatic batching

### EC-015: Mermaid Diagram Exceeds Viewport
**Scenario**: Very large/wide mermaid diagram
**Expected Behavior**: Scrollable container with zoom controls
**Implementation**: Overflow auto, optional zoom feature

## 1.5 API Contracts

### 1.5.1 LineChart Component Props

```typescript
interface LineChartProps {
  /** Chart data points */
  data: ChartDataPoint[];

  /** Chart configuration */
  config: ChartConfig;

  /** Chart height in pixels (default: 300) */
  height?: number;

  /** Show trend indicator (default: false) */
  showTrend?: boolean;

  /** Enable gradient fill under line (default: false) */
  gradient?: boolean;

  /** Additional CSS classes */
  className?: string;
}

interface ChartDataPoint {
  /** Display label for data point */
  label?: string;

  /** Numeric value */
  value: number;

  /** ISO 8601 timestamp (optional) */
  timestamp?: string;
}

interface ChartConfig {
  /** Chart title */
  title: string;

  /** X-axis label */
  xAxis: string;

  /** Y-axis label */
  yAxis: string;

  /** Color palette for chart elements */
  colors: string[];

  /** Display grid lines (default: true) */
  showGrid?: boolean;

  /** Display legend (default: true) */
  showLegend?: boolean;
}
```

### 1.5.2 BarChart Component Props

```typescript
interface BarChartProps {
  /** Chart data points */
  data: ChartDataPoint[];

  /** Chart configuration */
  config: ChartConfig;

  /** Chart height in pixels (default: 300) */
  height?: number;

  /** Display value labels on bars (default: false) */
  showValues?: boolean;

  /** Horizontal orientation (default: false) */
  horizontal?: boolean;

  /** Additional CSS classes */
  className?: string;
}
```

### 1.5.3 PieChart Component Props

```typescript
interface PieChartProps {
  /** Chart data points */
  data: ChartDataPoint[];

  /** Chart configuration */
  config: ChartConfig;

  /** Chart height in pixels (default: 300) */
  height?: number;

  /** Render as donut chart (default: false) */
  donut?: boolean;

  /** Display total value (default: false) */
  showTotal?: boolean;

  /** Additional CSS classes */
  className?: string;
}
```

### 1.5.4 Mermaid Component (Internal)

```typescript
interface MermaidRendererProps {
  /** Mermaid diagram source code */
  source: string;

  /** Unique identifier for diagram */
  id: string;

  /** Theme: 'default', 'dark', 'forest', 'neutral' */
  theme?: 'default' | 'dark' | 'forest' | 'neutral';

  /** Additional CSS classes */
  className?: string;
}
```

### 1.5.5 Enhanced Tabs Component Props

```typescript
interface EnhancedTabsProps {
  /** Tab definitions */
  tabs: TabDefinition[];

  /** Default active tab (index or ID) */
  defaultTab?: string | number;

  /** Enable URL hash sync (default: false) */
  syncWithUrl?: boolean;

  /** Enable localStorage persistence (default: false) */
  persistState?: boolean;

  /** Lazy load tab content (default: false) */
  lazyLoad?: boolean;

  /** Callback when tab changes */
  onTabChange?: (tabId: string) => void;

  /** Additional CSS classes */
  className?: string;
}

interface TabDefinition {
  /** Unique tab identifier */
  id: string;

  /** Tab label text */
  label: string;

  /** Tab content (string or component config) */
  content: string | ComponentConfig[];

  /** Optional icon (emoji or icon name) */
  icon?: string;

  /** Badge text (e.g., notification count) */
  badge?: string | number;

  /** Disable tab (default: false) */
  disabled?: boolean;
}
```

### 1.5.6 Pagination Component Props

```typescript
interface PaginationProps {
  /** Total number of items */
  totalItems: number;

  /** Items per page (default: 10) */
  itemsPerPage?: number;

  /** Current page (1-indexed) */
  currentPage: number;

  /** Callback when page changes */
  onPageChange: (page: number) => void;

  /** Show jump-to-page input (default: false) */
  showJumpTo?: boolean;

  /** Show items per page selector (default: false) */
  showPageSize?: boolean;

  /** Maximum page buttons to show (default: 7) */
  maxButtons?: number;

  /** Additional CSS classes */
  className?: string;
}
```

## 1.6 Data Flow Diagrams

### 1.6.1 Chart Component Data Flow

```
┌─────────────────────┐
│ Page-Builder Agent  │
│ (Creates JSON spec) │
└──────────┬──────────┘
           │
           │ JSON specification
           ▼
┌─────────────────────┐
│ DynamicPageRenderer │
│  - Parses JSON      │
│  - Validates schema │
└──────────┬──────────┘
           │
           │ Validated props
           ▼
┌─────────────────────┐
│ Chart Component     │
│  - LineChart        │
│  - BarChart         │
│  - PieChart         │
└──────────┬──────────┘
           │
           │ Render
           ▼
┌─────────────────────┐
│ SVG Chart Rendered  │
│ in Browser          │
└─────────────────────┘
```

### 1.6.2 Mermaid Rendering Flow

```
┌──────────────────────┐
│ Markdown Content     │
│ (with mermaid blocks)│
└──────────┬───────────┘
           │
           │ Parse markdown
           ▼
┌──────────────────────┐
│ MarkdownRenderer     │
│  - React-markdown    │
│  - Custom components │
└──────────┬───────────┘
           │
           │ Detect mermaid block
           ▼
┌──────────────────────┐
│ MermaidWrapper       │
│  - Lazy load library │
│  - Error handling    │
└──────────┬───────────┘
           │
           │ Render diagram
           ▼
┌──────────────────────┐
│ Mermaid.js           │
│  - Parse syntax      │
│  - Generate SVG      │
└──────────┬───────────┘
           │
           │ Insert into DOM
           ▼
┌──────────────────────┐
│ SVG Diagram Rendered │
└──────────────────────┘
```

### 1.6.3 Enhanced Tabs State Flow

```
┌──────────────────────┐
│ User Interaction     │
│  - Click tab         │
│  - Keyboard nav      │
│  - Deep link         │
└──────────┬───────────┘
           │
           │ Event
           ▼
┌──────────────────────┐
│ TabsComponent        │
│  - Update state      │
│  - Validate tab      │
└──────────┬───────────┘
           │
           ├─────────────────────┐
           │                     │
           │ Persist             │ Update URL
           ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│ localStorage     │   │ window.location  │
│ (if enabled)     │   │ hash (if enabled)│
└──────────────────┘   └──────────────────┘
           │
           │ Render active tab
           ▼
┌──────────────────────┐
│ TabContent Component │
│  - Lazy load (opt)   │
│  - Render content    │
└──────────────────────┘
```

---

# 2. Pseudocode Phase

## 2.1 Chart Data Transformation Algorithm

```pseudocode
FUNCTION transformChartData(rawData, componentType):
  // Handle various input formats
  IF rawData is NULL or EMPTY:
    RETURN empty array

  // Already in correct format
  IF rawData is ChartDataPoint[]:
    RETURN rawData

  // Simple array of numbers
  IF rawData is number[]:
    transformedData = []
    FOR EACH value, index IN rawData:
      transformedData.push({
        label: "Item " + (index + 1),
        value: value,
        timestamp: null
      })
    RETURN transformedData

  // Array of objects with various key names
  IF rawData is object[]:
    transformedData = []
    FOR EACH item IN rawData:
      // Try common key names
      value = item.value OR item.y OR item.amount OR item.count
      label = item.label OR item.name OR item.x OR item.category

      IF value is NULL:
        THROW ValidationError("Missing value field")

      transformedData.push({
        label: label OR "Unknown",
        value: parseFloat(value),
        timestamp: item.timestamp OR item.date OR null
      })
    RETURN transformedData

  THROW ValidationError("Unsupported data format")

FUNCTION generateDefaultConfig(componentType):
  baseConfig = {
    title: "Chart",
    xAxis: "X Axis",
    yAxis: "Y Axis",
    colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
    showGrid: true,
    showLegend: true
  }

  IF componentType === "LineChart":
    baseConfig.title = "Line Chart"
  ELSE IF componentType === "BarChart":
    baseConfig.title = "Bar Chart"
  ELSE IF componentType === "PieChart":
    baseConfig.title = "Pie Chart"

  RETURN baseConfig

FUNCTION validateChartData(data, componentType):
  // Common validations
  IF data.length === 0:
    RETURN { valid: false, error: "Data array is empty" }

  IF data.length > 1000:
    CONSOLE.warn("Large dataset detected. Consider aggregation.")

  // PieChart-specific validation
  IF componentType === "PieChart":
    FOR EACH point IN data:
      IF point.value < 0:
        RETURN { valid: false, error: "PieChart requires non-negative values" }

  RETURN { valid: true }
```

## 2.2 Mermaid Rendering Pipeline

```pseudocode
GLOBAL mermaidLoadPromise = null
GLOBAL mermaidLoaded = false

ASYNC FUNCTION loadMermaidLibrary():
  IF mermaidLoaded:
    RETURN true

  IF mermaidLoadPromise is NOT NULL:
    RETURN AWAIT mermaidLoadPromise

  mermaidLoadPromise = new Promise(async (resolve, reject) => {
    TRY:
      // Dynamic import for code splitting
      mermaid = AWAIT import('mermaid')

      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'strict',  // Prevent XSS
        fontFamily: 'ui-sans-serif, system-ui',
        logLevel: 'error'
      })

      mermaidLoaded = true
      resolve(true)
    CATCH error:
      CONSOLE.error("Failed to load mermaid:", error)
      reject(error)
  })

  RETURN AWAIT mermaidLoadPromise

ASYNC FUNCTION renderMermaidDiagram(source, elementId, theme):
  TRY:
    // Load library if not already loaded
    success = AWAIT loadMermaidLibrary()
    IF NOT success:
      THROW Error("Mermaid library not available")

    // Update theme if different
    IF theme !== currentTheme:
      mermaid.initialize({ theme: theme })

    // Render diagram
    result = AWAIT mermaid.render(elementId, source)

    RETURN {
      success: true,
      svg: result.svg,
      error: null
    }
  CATCH error:
    CONSOLE.error("Mermaid render error:", error)

    RETURN {
      success: false,
      svg: null,
      error: error.message,
      source: source  // Return original for fallback display
    }

COMPONENT MermaidWrapper({ source, id, theme }):
  STATE renderResult = null
  STATE isLoading = true

  ON_MOUNT:
    ASYNC:
      result = AWAIT renderMermaidDiagram(source, id, theme)
      SET renderResult = result
      SET isLoading = false

  IF isLoading:
    RENDER <LoadingSpinner />

  IF renderResult.success:
    RENDER <div dangerouslySetInnerHTML={{ __html: renderResult.svg }} />
  ELSE:
    RENDER <MermaidErrorFallback
      error={renderResult.error}
      source={renderResult.source}
    />

FUNCTION detectMermaidBlocks(markdownCode):
  // This runs during markdown parsing
  IF markdownCode.language === 'mermaid':
    uniqueId = "mermaid-" + generateRandomId()

    RETURN <MermaidWrapper
      source={markdownCode.value}
      id={uniqueId}
      theme={getCurrentTheme()}
    />
  ELSE:
    // Use default code highlighting
    RETURN <DefaultCodeBlock code={markdownCode} />
```

## 2.3 Tab State Management Logic

```pseudocode
COMPONENT EnhancedTabs({ tabs, defaultTab, syncWithUrl, persistState, lazyLoad }):
  // Determine initial active tab
  FUNCTION getInitialTab():
    // Priority 1: URL hash
    IF syncWithUrl AND window.location.hash:
      hashTabId = window.location.hash.substring(1)
      matchingTab = tabs.find(t => t.id === hashTabId)
      IF matchingTab AND NOT matchingTab.disabled:
        RETURN hashTabId

    // Priority 2: localStorage
    IF persistState:
      savedTabId = localStorage.getItem('activeTab-' + componentId)
      matchingTab = tabs.find(t => t.id === savedTabId)
      IF matchingTab AND NOT matchingTab.disabled:
        RETURN savedTabId

    // Priority 3: defaultTab prop
    IF defaultTab:
      matchingTab = tabs.find(t => t.id === defaultTab)
      IF matchingTab AND NOT matchingTab.disabled:
        RETURN defaultTab

    // Priority 4: First enabled tab
    firstEnabledTab = tabs.find(t => NOT t.disabled)
    IF firstEnabledTab:
      RETURN firstEnabledTab.id

    // Fallback: first tab (even if disabled)
    RETURN tabs[0].id

  STATE activeTab = getInitialTab()
  STATE loadedTabs = lazyLoad ? [activeTab] : tabs.map(t => t.id)

  FUNCTION handleTabChange(newTabId):
    // Validate tab exists and is enabled
    targetTab = tabs.find(t => t.id === newTabId)
    IF NOT targetTab OR targetTab.disabled:
      CONSOLE.warn("Cannot activate disabled or non-existent tab:", newTabId)
      RETURN

    // Update state
    SET activeTab = newTabId

    // Add to loaded tabs if lazy loading
    IF lazyLoad AND NOT loadedTabs.includes(newTabId):
      SET loadedTabs = [...loadedTabs, newTabId]

    // Persist to URL
    IF syncWithUrl:
      window.location.hash = newTabId

    // Persist to localStorage
    IF persistState:
      localStorage.setItem('activeTab-' + componentId, newTabId)

    // Callback
    IF onTabChange:
      onTabChange(newTabId)

  FUNCTION handleKeyboardNav(event, currentTabIndex):
    IF event.key === 'ArrowRight':
      nextTab = findNextEnabledTab(currentTabIndex, +1)
      IF nextTab:
        handleTabChange(nextTab.id)
        focusTab(nextTab.id)

    ELSE IF event.key === 'ArrowLeft':
      prevTab = findNextEnabledTab(currentTabIndex, -1)
      IF prevTab:
        handleTabChange(prevTab.id)
        focusTab(prevTab.id)

    ELSE IF event.key === 'Home':
      firstTab = tabs.find(t => NOT t.disabled)
      IF firstTab:
        handleTabChange(firstTab.id)
        focusTab(firstTab.id)

    ELSE IF event.key === 'End':
      lastTab = tabs.reverse().find(t => NOT t.disabled)
      IF lastTab:
        handleTabChange(lastTab.id)
        focusTab(lastTab.id)

  FUNCTION findNextEnabledTab(currentIndex, direction):
    nextIndex = currentIndex + direction

    WHILE nextIndex >= 0 AND nextIndex < tabs.length:
      IF NOT tabs[nextIndex].disabled:
        RETURN tabs[nextIndex]
      nextIndex = nextIndex + direction

    RETURN null

  RENDER:
    <div className="tabs-container">
      <div role="tablist" className="tabs-list">
        FOR EACH tab, index IN tabs:
          isActive = tab.id === activeTab

          <button
            role="tab"
            id={"tab-" + tab.id}
            aria-selected={isActive}
            aria-controls={"panel-" + tab.id}
            disabled={tab.disabled}
            onClick={() => handleTabChange(tab.id)}
            onKeyDown={(e) => handleKeyboardNav(e, index)}
            className={isActive ? "active" : ""}
          >
            {tab.icon && <span className="icon">{tab.icon}</span>}
            {tab.label}
            {tab.badge && <span className="badge">{tab.badge}</span>}
          </button>
      </div>

      <div className="tabs-panels">
        FOR EACH tab IN tabs:
          isActive = tab.id === activeTab
          shouldRender = isActive OR loadedTabs.includes(tab.id)

          IF shouldRender:
            <div
              role="tabpanel"
              id={"panel-" + tab.id}
              aria-labelledby={"tab-" + tab.id}
              hidden={NOT isActive}
            >
              {renderTabContent(tab.content)}
            </div>
      </div>
    </div>
```

## 2.4 Pagination Algorithm

```pseudocode
COMPONENT Pagination({ totalItems, itemsPerPage, currentPage, onPageChange, maxButtons }):
  totalPages = Math.ceil(totalItems / itemsPerPage)

  FUNCTION generatePageNumbers():
    IF totalPages <= maxButtons:
      // Show all pages
      RETURN [1, 2, 3, ..., totalPages]

    // Calculate visible page range
    sideButtons = Math.floor((maxButtons - 3) / 2)  // -3 for first, last, ellipsis

    IF currentPage <= sideButtons + 2:
      // Near start: [1, 2, 3, 4, 5, ..., last]
      RETURN [1...maxButtons-2, '...', totalPages]

    ELSE IF currentPage >= totalPages - sideButtons - 1:
      // Near end: [1, ..., 96, 97, 98, 99, 100]
      RETURN [1, '...', (totalPages - maxButtons + 3)...totalPages]

    ELSE:
      // Middle: [1, ..., 48, 49, 50, ..., 100]
      startPage = currentPage - sideButtons
      endPage = currentPage + sideButtons
      RETURN [1, '...', startPage...endPage, '...', totalPages]

  FUNCTION handlePageChange(newPage):
    // Validate page number
    validPage = Math.max(1, Math.min(newPage, totalPages))

    IF validPage !== currentPage:
      onPageChange(validPage)

      // Scroll to top of content
      scrollToTop({ behavior: 'smooth' })

  pageNumbers = generatePageNumbers()

  RENDER:
    <nav aria-label="Pagination">
      <div className="pagination-info">
        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
      </div>

      <ul className="pagination-buttons">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          Previous
        </button>

        FOR EACH pageNum IN pageNumbers:
          IF pageNum === '...':
            <span className="ellipsis">…</span>
          ELSE:
            <button
              onClick={() => handlePageChange(pageNum)}
              aria-current={pageNum === currentPage ? 'page' : undefined}
              className={pageNum === currentPage ? 'active' : ''}
            >
              {pageNum}
            </button>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          Next
        </button>
      </ul>

      {showJumpTo &&
        <input
          type="number"
          min={1}
          max={totalPages}
          placeholder="Jump to page"
          onKeyDown={(e) => {
            IF e.key === 'Enter':
              handlePageChange(parseInt(e.target.value))
          }}
        />
      }
    </nav>
```

---

# 3. Architecture Phase

## 3.1 Component Hierarchy

```
src/
├── components/
│   ├── charts/
│   │   ├── LineChart.tsx              (✅ Existing - needs registration)
│   │   ├── BarChart.tsx               (✅ Existing - needs registration)
│   │   ├── PieChart.tsx               (✅ Existing - needs registration)
│   │   ├── index.ts                   (✅ Existing - export utilities)
│   │   └── ChartWrapper.tsx           (🆕 New - unified wrapper)
│   │
│   ├── dynamic-page/
│   │   ├── MarkdownRenderer.tsx       (⚙️ Modify - add mermaid support)
│   │   ├── MermaidWrapper.tsx         (🆕 New - mermaid integration)
│   │   ├── GanttChart.tsx             (✅ Existing - reference impl)
│   │   └── ...other components
│   │
│   ├── ui/
│   │   ├── tabs.tsx                   (⚙️ Modify - enhance features)
│   │   ├── pagination.tsx             (🆕 New - pagination component)
│   │   └── ...other UI components
│   │
│   ├── DynamicPageRenderer.tsx        (⚙️ Modify - register charts)
│   └── ValidationError.tsx            (✅ Existing - reuse)
│
├── schemas/
│   └── componentSchemas.ts            (⚙️ Modify - add chart schemas)
│
├── types/
│   ├── analytics.ts                   (✅ Existing - ChartDataPoint)
│   └── components.ts                  (⚙️ Modify - add new types)
│
├── lib/
│   └── utils.ts                       (✅ Existing - cn utility)
│
└── hooks/
    ├── useMermaid.ts                  (🆕 New - mermaid hook)
    ├── useTabState.ts                 (🆕 New - tab persistence hook)
    └── usePagination.ts               (🆕 New - pagination logic hook)
```

## 3.2 File Structure and Responsibilities

### 3.2.1 Chart Components (Minimal Changes)

**File**: `src/components/charts/LineChart.tsx`
**Status**: ✅ Existing - No changes needed
**Responsibility**: Render line chart with SVG

**File**: `src/components/charts/BarChart.tsx`
**Status**: ✅ Existing - No changes needed
**Responsibility**: Render bar chart (vertical/horizontal)

**File**: `src/components/charts/PieChart.tsx`
**Status**: ✅ Existing - No changes needed
**Responsibility**: Render pie/donut chart

**File**: `src/components/charts/ChartWrapper.tsx` (NEW)
**Status**: 🆕 New file
**Responsibility**:
- Simplify chart integration for page builder
- Transform data formats
- Handle empty states
- Provide default configurations
- Export/download functionality

```typescript
// ChartWrapper.tsx - Unified interface for all charts
interface ChartWrapperProps {
  type: 'line' | 'bar' | 'pie';
  data: any[];  // Accept flexible formats
  config?: Partial<ChartConfig>;
  height?: number;
  className?: string;
  // Chart-specific options
  options?: {
    gradient?: boolean;      // LineChart
    showTrend?: boolean;     // LineChart
    horizontal?: boolean;    // BarChart
    showValues?: boolean;    // BarChart
    donut?: boolean;         // PieChart
    showTotal?: boolean;     // PieChart
  };
}
```

### 3.2.2 Mermaid Integration

**File**: `src/components/dynamic-page/MermaidWrapper.tsx` (NEW)
**Status**: 🆕 New file
**Responsibility**:
- Lazy load mermaid library
- Render mermaid diagrams
- Error handling and fallback
- Theme management

**File**: `src/components/dynamic-page/MarkdownRenderer.tsx`
**Status**: ⚙️ Modify existing
**Changes**:
- Add mermaid code block detection
- Integrate MermaidWrapper component
- Update custom component renderers

**File**: `src/hooks/useMermaid.ts` (NEW)
**Status**: 🆕 New file
**Responsibility**:
- Manage mermaid library loading state
- Provide render function
- Cache rendered diagrams
- Theme synchronization

### 3.2.3 Enhanced Tabs

**File**: `src/components/ui/tabs.tsx`
**Status**: ⚙️ Modify existing
**Changes**:
- Add keyboard navigation
- Add URL hash synchronization
- Add localStorage persistence
- Add lazy loading support
- Add badge/icon support

**File**: `src/hooks/useTabState.ts` (NEW)
**Status**: 🆕 New file
**Responsibility**:
- Manage tab state persistence
- URL hash synchronization
- localStorage integration

### 3.2.4 Pagination Component

**File**: `src/components/ui/pagination.tsx` (NEW)
**Status**: 🆕 New file
**Responsibility**:
- Render pagination controls
- Calculate page ranges
- Handle page navigation
- Accessibility features

**File**: `src/hooks/usePagination.ts` (NEW)
**Status**: 🆕 New file
**Responsibility**:
- Pagination logic
- Page calculation
- State management

## 3.3 Dependencies Between Components

### Dependency Graph

```
DynamicPageRenderer
├── (imports) LineChart
├── (imports) BarChart
├── (imports) PieChart
├── (imports) ChartWrapper (new)
├── (imports) MarkdownRenderer (modified)
│   └── (imports) MermaidWrapper (new)
│       └── (imports) useMermaid hook (new)
├── (imports) Tabs (modified)
│   └── (imports) useTabState hook (new)
└── (imports) Pagination (new)
    └── (imports) usePagination hook (new)

componentSchemas.ts
├── (defines) LineChartSchema (new)
├── (defines) BarChartSchema (new)
├── (defines) PieChartSchema (new)
├── (defines) ChartWrapperSchema (new)
├── (defines) MarkdownSchema (modified)
├── (defines) TabsSchema (modified)
└── (defines) PaginationSchema (new)
```

### External Dependencies (New)

```json
{
  "dependencies": {
    "mermaid": "^10.6.0"
  }
}
```

All other dependencies already exist:
- `chart.js` (✅ installed)
- `react-chartjs-2` (✅ installed)
- `react-markdown` (✅ installed)
- `remark-gfm` (✅ installed)
- `rehype-highlight` (✅ installed)

## 3.4 Integration Points with DynamicPageRenderer

### 3.4.1 Current DynamicPageRenderer Structure

```typescript
// Existing pattern from GanttChart
case 'GanttChart':
  return (
    <GanttChart
      key={key}
      tasks={props.tasks || []}
      viewMode={props.viewMode}
      className={props.className}
    />
  );
```

### 3.4.2 New Chart Component Cases

```typescript
// Add to DynamicPageRenderer.tsx renderValidatedComponent()

case 'LineChart':
  return (
    <LineChart
      key={key}
      data={props.data || []}
      config={props.config || generateDefaultConfig('LineChart')}
      height={props.height}
      showTrend={props.showTrend}
      gradient={props.gradient}
      className={props.className}
    />
  );

case 'BarChart':
  return (
    <BarChart
      key={key}
      data={props.data || []}
      config={props.config || generateDefaultConfig('BarChart')}
      height={props.height}
      showValues={props.showValues}
      horizontal={props.horizontal}
      className={props.className}
    />
  );

case 'PieChart':
  return (
    <PieChart
      key={key}
      data={props.data || []}
      config={props.config || generateDefaultConfig('PieChart')}
      height={props.height}
      donut={props.donut}
      showTotal={props.showTotal}
      className={props.className}
    />
  );

case 'ChartWrapper':
  return (
    <ChartWrapper
      key={key}
      type={props.type}
      data={props.data || []}
      config={props.config}
      height={props.height}
      options={props.options}
      className={props.className}
    />
  );

case 'Pagination':
  return (
    <Pagination
      key={key}
      totalItems={props.totalItems || 0}
      itemsPerPage={props.itemsPerPage}
      currentPage={props.currentPage || 1}
      onPageChange={props.onPageChange}
      showJumpTo={props.showJumpTo}
      showPageSize={props.showPageSize}
      maxButtons={props.maxButtons}
      className={props.className}
    />
  );

// Markdown case already exists, but gets enhanced mermaid support
case 'Markdown':
  return (
    <MarkdownRenderer
      key={key}
      content={props.content || ''}
      className={props.className}
    />
  );
```

### 3.4.3 Import Statements to Add

```typescript
// Add to top of DynamicPageRenderer.tsx
import LineChart from './charts/LineChart';
import BarChart from './charts/BarChart';
import PieChart from './charts/PieChart';
import ChartWrapper from './charts/ChartWrapper';
import Pagination from './ui/pagination';
// MarkdownRenderer already imported
// Tabs already imported
```

---

# 4. Refinement Phase

## 4.1 TypeScript Interfaces

### 4.1.1 Chart Types (New File: `src/types/charts.ts`)

```typescript
/**
 * Simplified data format accepted by page builder
 */
export interface SimplifiedChartData {
  labels?: string[];
  values: number[];
  timestamps?: string[];
}

/**
 * Chart configuration with defaults
 */
export interface ChartConfiguration {
  title?: string;
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
}

/**
 * Chart wrapper component props
 */
export interface ChartWrapperProps {
  type: 'line' | 'bar' | 'pie';
  data: ChartDataPoint[] | SimplifiedChartData | any[];
  config?: ChartConfiguration;
  height?: number;
  className?: string;
  options?: ChartOptions;
}

/**
 * Chart-specific options
 */
export interface ChartOptions {
  // LineChart options
  gradient?: boolean;
  showTrend?: boolean;

  // BarChart options
  horizontal?: boolean;
  showValues?: boolean;

  // PieChart options
  donut?: boolean;
  showTotal?: boolean;
}

/**
 * Chart data transformation result
 */
export interface ChartDataTransformResult {
  data: ChartDataPoint[];
  config: ChartConfig;
  warnings: string[];
}
```

### 4.1.2 Mermaid Types (New File: `src/types/mermaid.ts`)

```typescript
/**
 * Mermaid render result
 */
export interface MermaidRenderResult {
  success: boolean;
  svg: string | null;
  error: string | null;
  source?: string;
}

/**
 * Mermaid theme options
 */
export type MermaidTheme = 'default' | 'dark' | 'forest' | 'neutral';

/**
 * Mermaid configuration
 */
export interface MermaidConfig {
  theme: MermaidTheme;
  startOnLoad: boolean;
  securityLevel: 'strict' | 'loose';
  fontFamily: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
}

/**
 * Mermaid hook return type
 */
export interface UseMermaidReturn {
  renderDiagram: (source: string, id: string) => Promise<MermaidRenderResult>;
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
}
```

### 4.1.3 Enhanced Tab Types (Add to `src/types/components.ts`)

```typescript
/**
 * Tab definition with enhanced features
 */
export interface TabDefinition {
  id: string;
  label: string;
  content: string | ComponentConfig[];
  icon?: string;
  badge?: string | number;
  disabled?: boolean;
}

/**
 * Enhanced tabs component props
 */
export interface EnhancedTabsProps {
  tabs: TabDefinition[];
  defaultTab?: string;
  syncWithUrl?: boolean;
  persistState?: boolean;
  lazyLoad?: boolean;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

/**
 * Tab state hook return type
 */
export interface UseTabStateReturn {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  loadedTabs: string[];
}
```

### 4.1.4 Pagination Types (New File: `src/types/pagination.ts`)

```typescript
/**
 * Pagination component props
 */
export interface PaginationProps {
  totalItems: number;
  itemsPerPage?: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  showJumpTo?: boolean;
  showPageSize?: boolean;
  maxButtons?: number;
  className?: string;
}

/**
 * Pagination hook return type
 */
export interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  pageNumbers: (number | '...')[];
  canGoNext: boolean;
  canGoPrevious: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setItemsPerPage: (count: number) => void;
}

/**
 * Pagination state
 */
export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}
```

## 4.2 Zod Schemas

### 4.2.1 Chart Schemas (Add to `src/schemas/componentSchemas.ts`)

```typescript
import { z } from 'zod';

// Chart data point schema
export const ChartDataPointSchema = z.object({
  label: z.string().optional(),
  value: z.number(),
  timestamp: z.string().datetime().optional(),
});

// Chart config schema
export const ChartConfigSchema = z.object({
  title: z.string().default('Chart'),
  xAxis: z.string().default('X Axis'),
  yAxis: z.string().default('Y Axis'),
  colors: z.array(z.string()).default([
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'
  ]),
  showGrid: z.boolean().default(true),
  showLegend: z.boolean().default(true),
});

// Simplified data format (alternative)
export const SimplifiedChartDataSchema = z.object({
  labels: z.array(z.string()).optional(),
  values: z.array(z.number()).min(1, "At least one value required"),
  timestamps: z.array(z.string().datetime()).optional(),
});

// LineChart schema
export const LineChartSchema = z.object({
  data: z.union([
    z.array(ChartDataPointSchema),
    SimplifiedChartDataSchema,
    z.array(z.number())  // Simple number array
  ]).transform((val) => {
    // Transform to ChartDataPoint[] if needed
    if (Array.isArray(val) && typeof val[0] === 'number') {
      return val.map((v, i) => ({
        label: `Point ${i + 1}`,
        value: v
      }));
    }
    return val;
  }),
  config: ChartConfigSchema.optional(),
  height: z.number().min(100).max(1000).default(300),
  showTrend: z.boolean().default(false),
  gradient: z.boolean().default(false),
  className: z.string().optional(),
});

// BarChart schema
export const BarChartSchema = z.object({
  data: z.union([
    z.array(ChartDataPointSchema),
    SimplifiedChartDataSchema,
    z.array(z.number())
  ]).transform((val) => {
    if (Array.isArray(val) && typeof val[0] === 'number') {
      return val.map((v, i) => ({
        label: `Bar ${i + 1}`,
        value: v
      }));
    }
    return val;
  }),
  config: ChartConfigSchema.optional(),
  height: z.number().min(100).max(1000).default(300),
  showValues: z.boolean().default(false),
  horizontal: z.boolean().default(false),
  className: z.string().optional(),
});

// PieChart schema
export const PieChartSchema = z.object({
  data: z.union([
    z.array(ChartDataPointSchema),
    SimplifiedChartDataSchema,
    z.array(z.number())
  ])
    .transform((val) => {
      if (Array.isArray(val) && typeof val[0] === 'number') {
        return val.map((v, i) => ({
          label: `Slice ${i + 1}`,
          value: v
        }));
      }
      return val;
    })
    .refine(
      (data) => {
        // PieChart requires non-negative values
        const points = Array.isArray(data) ? data : data.values;
        return points.every((p: any) => {
          const value = typeof p === 'number' ? p : p.value;
          return value >= 0;
        });
      },
      {
        message: "PieChart requires non-negative values"
      }
    ),
  config: ChartConfigSchema.optional(),
  height: z.number().min(100).max(1000).default(300),
  donut: z.boolean().default(false),
  showTotal: z.boolean().default(false),
  className: z.string().optional(),
});

// ChartWrapper schema (unified interface)
export const ChartWrapperSchema = z.object({
  type: z.enum(['line', 'bar', 'pie']),
  data: z.union([
    z.array(ChartDataPointSchema),
    SimplifiedChartDataSchema,
    z.array(z.number())
  ]),
  config: ChartConfigSchema.optional(),
  height: z.number().min(100).max(1000).default(300),
  options: z.object({
    gradient: z.boolean().optional(),
    showTrend: z.boolean().optional(),
    horizontal: z.boolean().optional(),
    showValues: z.boolean().optional(),
    donut: z.boolean().optional(),
    showTotal: z.boolean().optional(),
  }).optional(),
  className: z.string().optional(),
});
```

### 4.2.2 Enhanced Tabs Schema (Modify existing in `componentSchemas.ts`)

```typescript
// Enhanced TabsSchema (replaces existing)
export const EnhancedTabsSchema = z.object({
  tabs: z.array(z.object({
    id: z.string().min(1, "Tab ID is required"),
    label: z.string().min(1, "Tab label is required"),
    content: z.string(),  // Can be JSON stringified components
    icon: z.string().optional(),
    badge: z.union([z.string(), z.number()]).optional(),
    disabled: z.boolean().default(false),
  })).min(1, "At least one tab required"),
  defaultTab: z.string().optional(),
  syncWithUrl: z.boolean().default(false),
  persistState: z.boolean().default(false),
  lazyLoad: z.boolean().default(false),
  className: z.string().optional(),
});
```

### 4.2.3 Pagination Schema (Add to `componentSchemas.ts`)

```typescript
export const PaginationSchema = z.object({
  totalItems: z.number().min(0, "Total items must be non-negative"),
  itemsPerPage: z.number().min(1).max(100).default(10),
  currentPage: z.number().min(1).default(1),
  showJumpTo: z.boolean().default(false),
  showPageSize: z.boolean().default(false),
  maxButtons: z.number().min(3).max(15).default(7),
  className: z.string().optional(),
});
```

### 4.2.4 Update ComponentSchemas Registry

```typescript
// Add to ComponentSchemas export
export const ComponentSchemas = {
  // ... existing schemas ...

  // Chart components
  LineChart: LineChartSchema,
  BarChart: BarChartSchema,
  PieChart: PieChartSchema,
  ChartWrapper: ChartWrapperSchema,

  // Enhanced tabs
  tabs: EnhancedTabsSchema,  // Replace existing TabsSchema

  // Pagination
  Pagination: PaginationSchema,

  // ... rest of schemas
};
```

## 4.3 Error Handling Strategies

### 4.3.1 Chart Error Handling

```typescript
// ChartWrapper error boundary
function ChartErrorBoundary({ children, fallback }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-2 text-red-800 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Chart Error</span>
          </div>
          <p className="text-sm text-red-700 mb-3">{error.message}</p>
          <button
            onClick={resetErrorBoundary}
            className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Chart data validation errors
function validateAndTransformChartData(data: any, componentType: string) {
  try {
    // Zod schema validation
    const schema = getSchemaForType(componentType);
    const validated = schema.parse({ data });

    return {
      success: true,
      data: validated.data,
      warnings: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Friendly error messages
      const messages = error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      );

      return {
        success: false,
        error: messages.join(', '),
        data: null,
      };
    }

    throw error;  // Re-throw unexpected errors
  }
}
```

### 4.3.2 Mermaid Error Handling

```typescript
// Graceful degradation for mermaid failures
async function renderMermaidWithFallback(source: string, id: string) {
  try {
    // Attempt to load and render mermaid
    const result = await renderMermaidDiagram(source, id);

    if (result.success) {
      return {
        type: 'mermaid',
        content: result.svg,
      };
    } else {
      // Mermaid syntax error
      console.warn('Mermaid syntax error:', result.error);
      return {
        type: 'fallback',
        content: source,
        error: result.error,
      };
    }
  } catch (error) {
    // Library load failure
    console.error('Mermaid library error:', error);
    return {
      type: 'code',
      content: source,
      language: 'mermaid',
    };
  }
}

// Fallback component
function MermaidErrorFallback({ error, source }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center gap-2 text-yellow-800 mb-2">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-medium">Mermaid Diagram Error</span>
      </div>
      <p className="text-sm text-yellow-700 mb-3">{error}</p>
      <details className="text-sm">
        <summary className="cursor-pointer text-yellow-600 hover:text-yellow-700">
          View Source
        </summary>
        <pre className="mt-2 bg-yellow-100 p-3 rounded overflow-x-auto">
          <code>{source}</code>
        </pre>
      </details>
    </div>
  );
}
```

### 4.3.3 Tab State Error Handling

```typescript
// Safe tab restoration with fallback
function getInitialTabWithFallback(tabs: TabDefinition[], options: TabOptions) {
  try {
    // Try URL hash
    if (options.syncWithUrl && window.location.hash) {
      const hashTabId = window.location.hash.substring(1);
      const tab = tabs.find(t => t.id === hashTabId && !t.disabled);
      if (tab) return tab.id;
    }

    // Try localStorage
    if (options.persistState) {
      const saved = localStorage.getItem(options.storageKey);
      if (saved) {
        const tab = tabs.find(t => t.id === saved && !t.disabled);
        if (tab) return tab.id;
      }
    }
  } catch (error) {
    // localStorage might be blocked, URL parsing might fail
    console.warn('Tab state restoration failed:', error);
  }

  // Fallback: first enabled tab
  const firstEnabled = tabs.find(t => !t.disabled);
  return firstEnabled?.id || tabs[0]?.id;
}
```

### 4.3.4 Pagination Error Handling

```typescript
// Safe page number calculation
function getSafePage(requestedPage: number, totalPages: number): number {
  if (!Number.isInteger(requestedPage) || requestedPage < 1) {
    console.warn(`Invalid page number: ${requestedPage}, using page 1`);
    return 1;
  }

  if (requestedPage > totalPages) {
    console.warn(`Page ${requestedPage} exceeds total pages ${totalPages}`);
    return Math.max(1, totalPages);
  }

  return requestedPage;
}

// Handle division by zero
function calculateTotalPages(totalItems: number, itemsPerPage: number): number {
  if (itemsPerPage <= 0) {
    console.error('itemsPerPage must be positive, defaulting to 10');
    itemsPerPage = 10;
  }

  if (totalItems < 0) {
    console.error('totalItems cannot be negative, using 0');
    totalItems = 0;
  }

  return Math.max(1, Math.ceil(totalItems / itemsPerPage));
}
```

---

# 5. Completion Phase

## 5.1 Testing Strategy

### 5.1.1 Unit Tests

#### Chart Components Tests (`src/components/charts/__tests__/`)

```typescript
// LineChart.test.tsx
describe('LineChart', () => {
  it('renders with valid data', () => {
    const data = [
      { label: 'Jan', value: 10 },
      { label: 'Feb', value: 20 },
    ];
    const config = {
      title: 'Test Chart',
      xAxis: 'Month',
      yAxis: 'Value',
      colors: ['#3b82f6'],
    };

    render(<LineChart data={data} config={config} />);

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('displays "No data available" for empty data', () => {
    const config = { title: 'Empty Chart' };

    render(<LineChart data={[]} config={config} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('shows trend indicator when enabled', () => {
    const data = [
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
    ];

    render(<LineChart data={data} config={{}} showTrend={true} />);

    expect(screen.getByText(/Trending up/i)).toBeInTheDocument();
  });

  it('applies gradient when enabled', () => {
    const data = [{ label: 'A', value: 10 }];
    const { container } = render(
      <LineChart data={data} config={{}} gradient={true} />
    );

    const gradient = container.querySelector('linearGradient');
    expect(gradient).toBeInTheDocument();
  });
});

// Similar tests for BarChart and PieChart
```

#### Mermaid Tests (`src/components/dynamic-page/__tests__/`)

```typescript
// MermaidWrapper.test.tsx
describe('MermaidWrapper', () => {
  it('renders loading state initially', () => {
    render(<MermaidWrapper source="graph TD; A-->B;" id="test-1" />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders diagram on successful load', async () => {
    const mockRender = jest.fn().mockResolvedValue({
      svg: '<svg>diagram</svg>',
    });

    jest.spyOn(mermaid, 'render').mockImplementation(mockRender);

    render(<MermaidWrapper source="graph TD; A-->B;" id="test-2" />);

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-diagram')).toBeInTheDocument();
    });
  });

  it('shows error fallback on invalid syntax', async () => {
    const mockRender = jest.fn().mockRejectedValue(
      new Error('Parse error')
    );

    jest.spyOn(mermaid, 'render').mockImplementation(mockRender);

    render(<MermaidWrapper source="invalid syntax" id="test-3" />);

    await waitFor(() => {
      expect(screen.getByText(/Mermaid Diagram Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Parse error/i)).toBeInTheDocument();
    });
  });
});
```

#### Enhanced Tabs Tests (`src/components/ui/__tests__/`)

```typescript
// tabs.test.tsx
describe('EnhancedTabs', () => {
  const mockTabs = [
    { id: 'tab1', label: 'Tab 1', content: 'Content 1' },
    { id: 'tab2', label: 'Tab 2', content: 'Content 2', badge: '5' },
    { id: 'tab3', label: 'Tab 3', content: 'Content 3', disabled: true },
  ];

  it('renders all tab labels', () => {
    render(<EnhancedTabs tabs={mockTabs} />);

    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
  });

  it('activates first tab by default', () => {
    render(<EnhancedTabs tabs={mockTabs} />);

    expect(screen.getByText('Content 1')).toBeVisible();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('switches tabs on click', () => {
    render(<EnhancedTabs tabs={mockTabs} />);

    fireEvent.click(screen.getByText('Tab 2'));

    expect(screen.getByText('Content 2')).toBeVisible();
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
  });

  it('shows badge when provided', () => {
    render(<EnhancedTabs tabs={mockTabs} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('disables tab clicks when disabled', () => {
    render(<EnhancedTabs tabs={mockTabs} />);

    const tab3Button = screen.getByText('Tab 3').closest('button');
    expect(tab3Button).toBeDisabled();
  });

  it('navigates with arrow keys', () => {
    render(<EnhancedTabs tabs={mockTabs} />);

    const tab1 = screen.getByText('Tab 1').closest('button');
    tab1?.focus();

    fireEvent.keyDown(tab1!, { key: 'ArrowRight' });

    expect(screen.getByText('Content 2')).toBeVisible();
  });

  it('syncs with URL hash when enabled', () => {
    window.location.hash = '#tab2';

    render(<EnhancedTabs tabs={mockTabs} syncWithUrl={true} />);

    expect(screen.getByText('Content 2')).toBeVisible();
  });

  it('persists to localStorage when enabled', () => {
    const { rerender } = render(
      <EnhancedTabs tabs={mockTabs} persistState={true} />
    );

    fireEvent.click(screen.getByText('Tab 2'));

    const savedTab = localStorage.getItem('activeTab-default');
    expect(savedTab).toBe('tab2');
  });
});
```

#### Pagination Tests (`src/components/ui/__tests__/`)

```typescript
// pagination.test.tsx
describe('Pagination', () => {
  const mockOnPageChange = jest.fn();

  it('renders correct page numbers', () => {
    render(
      <Pagination
        totalItems={100}
        itemsPerPage={10}
        currentPage={1}
        onPageChange={mockOnPageChange}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(
      <Pagination
        totalItems={100}
        itemsPerPage={10}
        currentPage={1}
        onPageChange={mockOnPageChange}
      />
    );

    const prevButton = screen.getByLabelText('Previous page');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <Pagination
        totalItems={100}
        itemsPerPage={10}
        currentPage={10}
        onPageChange={mockOnPageChange}
      />
    );

    const nextButton = screen.getByLabelText('Next page');
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange when page clicked', () => {
    render(
      <Pagination
        totalItems={100}
        itemsPerPage={10}
        currentPage={1}
        onPageChange={mockOnPageChange}
      />
    );

    fireEvent.click(screen.getByText('5'));

    expect(mockOnPageChange).toHaveBeenCalledWith(5);
  });

  it('shows ellipsis for large page counts', () => {
    render(
      <Pagination
        totalItems={1000}
        itemsPerPage={10}
        currentPage={50}
        onPageChange={mockOnPageChange}
        maxButtons={7}
      />
    );

    const ellipses = screen.getAllByText('…');
    expect(ellipses.length).toBeGreaterThan(0);
  });
});
```

### 5.1.2 Integration Tests

```typescript
// DynamicPageRenderer integration tests
describe('DynamicPageRenderer - Chart Integration', () => {
  it('renders LineChart from JSON specification', async () => {
    const pageData = {
      id: 'test-page',
      title: 'Chart Test',
      components: [
        {
          type: 'LineChart',
          props: {
            data: [
              { label: 'A', value: 10 },
              { label: 'B', value: 20 },
            ],
            config: {
              title: 'Test Line Chart',
            },
          },
        },
      ],
    };

    mockFetch('/api/agent-pages/...', { success: true, page: pageData });

    render(<DynamicPageRenderer />);

    await waitFor(() => {
      expect(screen.getByText('Test Line Chart')).toBeInTheDocument();
    });
  });

  it('validates chart props with schema', async () => {
    const pageData = {
      id: 'test-page',
      title: 'Invalid Chart',
      components: [
        {
          type: 'PieChart',
          props: {
            data: [
              { label: 'A', value: -10 },  // Invalid: negative value
            ],
          },
        },
      ],
    };

    mockFetch('/api/agent-pages/...', { success: true, page: pageData });

    render(<DynamicPageRenderer />);

    await waitFor(() => {
      expect(screen.getByText(/PieChart requires non-negative values/i))
        .toBeInTheDocument();
    });
  });
});

describe('DynamicPageRenderer - Mermaid Integration', () => {
  it('renders Markdown with mermaid diagrams', async () => {
    const pageData = {
      id: 'test-page',
      title: 'Mermaid Test',
      components: [
        {
          type: 'Markdown',
          props: {
            content: '# Flowchart\n\n```mermaid\ngraph TD;\n  A-->B;\n```',
          },
        },
      ],
    };

    mockFetch('/api/agent-pages/...', { success: true, page: pageData });

    render(<DynamicPageRenderer />);

    await waitFor(() => {
      expect(screen.getByText('Flowchart')).toBeInTheDocument();
      expect(screen.getByTestId('mermaid-diagram')).toBeInTheDocument();
    });
  });
});
```

### 5.1.3 End-to-End Tests (Playwright/Cypress)

```typescript
// e2e/charts.spec.ts
describe('Chart Components E2E', () => {
  it('renders interactive chart and shows tooltips', () => {
    cy.visit('/agents/test-agent/pages/chart-showcase');

    // Wait for chart to render
    cy.get('svg').should('be.visible');

    // Hover over data point
    cy.get('circle[data-tooltip]').first().trigger('mouseover');

    // Tooltip should appear
    cy.contains('Point 1: 10').should('be.visible');
  });

  it('exports chart data as CSV', () => {
    cy.visit('/agents/test-agent/pages/chart-showcase');

    cy.contains('Export CSV').click();

    cy.readFile('cypress/downloads/chart-data.csv').should('exist');
  });
});

// e2e/tabs.spec.ts
describe('Enhanced Tabs E2E', () => {
  it('persists active tab on page reload', () => {
    cy.visit('/agents/test-agent/pages/tabbed-content');

    cy.contains('Tab 2').click();

    cy.reload();

    // Tab 2 should still be active
    cy.contains('Tab 2 Content').should('be.visible');
  });

  it('updates URL hash when tab changes', () => {
    cy.visit('/agents/test-agent/pages/tabbed-content');

    cy.contains('Tab 3').click();

    cy.location('hash').should('equal', '#tab3');
  });
});

// e2e/pagination.spec.ts
describe('Pagination E2E', () => {
  it('navigates through pages', () => {
    cy.visit('/agents/test-agent/pages/paginated-list');

    cy.contains('Page 1 Content').should('be.visible');

    cy.contains('Next').click();

    cy.contains('Page 2 Content').should('be.visible');
    cy.contains('Page 1 Content').should('not.exist');
  });

  it('jumps to specific page', () => {
    cy.visit('/agents/test-agent/pages/paginated-list');

    cy.get('input[placeholder="Jump to page"]').type('5{enter}');

    cy.contains('Page 5 Content').should('be.visible');
  });
});
```

## 5.2 Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing (100% coverage for new code)
- [ ] All integration tests passing
- [ ] E2E tests passing on staging environment
- [ ] No console errors in development build
- [ ] No console errors in production build
- [ ] Accessibility audit passed (axe DevTools)
- [ ] Performance audit passed (Lighthouse score > 90)
- [ ] Bundle size increase < 500KB (gzipped)
- [ ] Code review completed and approved
- [ ] Documentation updated (README, component docs)
- [ ] Migration guide created (for breaking changes)

### Dependencies

- [ ] Install mermaid: `npm install mermaid`
- [ ] Verify all existing dependencies are up to date
- [ ] Check for peer dependency warnings
- [ ] Update package-lock.json

### Code Changes

- [ ] Add LineChart, BarChart, PieChart imports to DynamicPageRenderer
- [ ] Add chart component cases to renderValidatedComponent()
- [ ] Create ChartWrapper.tsx
- [ ] Create MermaidWrapper.tsx
- [ ] Modify MarkdownRenderer.tsx to support mermaid
- [ ] Enhance tabs.tsx with new features
- [ ] Create pagination.tsx
- [ ] Create useMermaid.ts hook
- [ ] Create useTabState.ts hook
- [ ] Create usePagination.ts hook
- [ ] Add chart schemas to componentSchemas.ts
- [ ] Update ComponentSchemas registry
- [ ] Add TypeScript types to types/ directory

### Database/Schema Changes

- [ ] No database migrations required (frontend-only changes)

### Configuration

- [ ] Add mermaid configuration to app initialization
- [ ] Configure code splitting for mermaid (webpack/vite)
- [ ] Update .gitignore if needed
- [ ] Update .eslintrc if needed

### Documentation

- [ ] Update component showcase page with chart examples
- [ ] Update component showcase page with mermaid examples
- [ ] Update component showcase page with enhanced tabs
- [ ] Update component showcase page with pagination
- [ ] Create usage guide for page-builder-agent
- [ ] Update API documentation
- [ ] Add JSDoc comments to all new functions

### Testing

- [ ] Run full test suite: `npm test`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (latest)
- [ ] Test on Edge (latest)
- [ ] Test on mobile devices (iOS, Android)
- [ ] Test with screen reader (NVDA/JAWS)
- [ ] Test keyboard navigation
- [ ] Test with reduced motion preference
- [ ] Test with high contrast mode

### Performance

- [ ] Verify chart rendering performance (< 200ms for 1000 points)
- [ ] Verify mermaid rendering performance (< 500ms for 100 nodes)
- [ ] Verify tab switching latency (< 50ms)
- [ ] Check for memory leaks (mount/unmount cycles)
- [ ] Measure bundle size impact
- [ ] Test with slow 3G network throttling

### Security

- [ ] XSS vulnerability scan (OWASP ZAP)
- [ ] Verify mermaid securityLevel is 'strict'
- [ ] Verify all user input is sanitized
- [ ] Check for exposed secrets/API keys
- [ ] Verify CORS configuration

### Rollback Plan

- [ ] Tag current production version: `git tag v1.0.0-pre-charts`
- [ ] Document rollback procedure
- [ ] Prepare rollback script if needed
- [ ] Identify feature flags to disable new features quickly

## 5.3 Verification Steps

### Post-Deployment Verification

#### Step 1: Verify Chart Components

```bash
# Navigate to component showcase page
Open: https://your-domain.com/agents/component-showcase/pages/showcase

# Verify LineChart
1. Scroll to "Charts" section
2. Check LineChart renders with data
3. Hover over data points to see tooltips
4. Verify gradient fill option works
5. Verify trend indicator displays correctly

# Verify BarChart
1. Check BarChart renders (vertical)
2. Toggle horizontal orientation
3. Verify value labels display
4. Verify legend displays correctly

# Verify PieChart
1. Check PieChart renders with slices
2. Toggle donut mode
3. Verify percentage labels on slices > 5%
4. Verify total value displays
5. Check summary statistics
```

#### Step 2: Verify Mermaid Integration

```bash
# Create test page with mermaid diagram
1. Create new page via page-builder-agent
2. Add Markdown component with mermaid code block:
   ```markdown
   # Workflow

   ```mermaid
   graph TD;
     A[Start] --> B{Decision};
     B -->|Yes| C[Action 1];
     B -->|No| D[Action 2];
     C --> E[End];
     D --> E;
   ```
   ```

3. Verify diagram renders correctly
4. Test with invalid mermaid syntax - should show error fallback
5. Verify diagram is responsive on mobile
6. Test different mermaid diagram types (sequence, gantt, class)
```

#### Step 3: Verify Enhanced Tabs

```bash
# Create test page with enhanced tabs
1. Create page with tabs component
2. Add icon to tab (emoji or icon name)
3. Add badge to tab (number)
4. Disable one tab
5. Enable URL hash sync
6. Enable localStorage persistence

# Test functionality
1. Click tabs - content should switch instantly
2. Use arrow keys to navigate tabs
3. Press Home/End keys
4. Reload page - active tab should persist
5. Change URL hash - tab should activate
6. Verify disabled tab is not clickable
```

#### Step 4: Verify Pagination

```bash
# Create test page with paginated content
1. Create page with 100 items
2. Set itemsPerPage to 10
3. Enable jump-to-page
4. Enable page size selector

# Test functionality
1. Navigate to page 2 - content should update
2. Click Previous/Next buttons
3. Jump to page 50 using input
4. Change items per page
5. Verify page numbers display with ellipsis
6. Verify "Showing X to Y of Z items" text
```

#### Step 5: Schema Validation

```bash
# Test with page-builder-agent
1. Ask agent to create LineChart with valid data
2. Ask agent to create LineChart with invalid data (negative values for PieChart)
3. Verify validation errors display correctly
4. Verify ValidationError component shows helpful messages
```

#### Step 6: Accessibility Verification

```bash
# Screen reader testing
1. Enable NVDA or JAWS
2. Navigate to chart components
3. Verify chart titles are announced
4. Verify data table alternative is accessible
5. Tab through interactive elements
6. Verify ARIA labels are present

# Keyboard navigation
1. Tab to chart component
2. Arrow keys should navigate data points
3. Enter/Space should activate interactive elements
4. Escape should dismiss modals/tooltips

# Color contrast
1. Run axe DevTools
2. Verify all text meets WCAG 2.1 AA
3. Check chart colors have sufficient contrast
```

#### Step 7: Performance Verification

```bash
# Chrome DevTools Performance
1. Record performance profile
2. Load page with 5 charts
3. Verify rendering time < 1 second total
4. Check for long tasks (> 50ms)
5. Verify no memory leaks on tab switches

# Lighthouse Audit
1. Run Lighthouse in Chrome DevTools
2. Performance score should be > 90
3. Accessibility score should be 100
4. Best Practices score should be > 90
```

#### Step 8: Cross-Browser Testing

```bash
# Test on each browser
1. Chrome (latest): All features work
2. Firefox (latest): All features work
3. Safari (latest): All features work (especially SVG rendering)
4. Edge (latest): All features work

# Mobile devices
1. iOS Safari: Touch interactions work
2. Android Chrome: Touch interactions work
3. Charts are responsive
4. Tabs are usable on mobile
```

### Monitoring Post-Deployment

```bash
# Set up monitoring
1. Check error logging service (Sentry, Rollbar)
2. Monitor console errors in production
3. Set up performance monitoring (New Relic, DataDog)
4. Track user analytics (chart interactions, tab usage)

# Key metrics to watch
- Chart render time (p95 < 200ms)
- Mermaid render time (p95 < 500ms)
- Tab switch time (p95 < 50ms)
- Error rate (< 0.1%)
- Page load time (p95 < 3s)
```

### Rollback Triggers

Rollback if any of these occur within first 24 hours:

- [ ] Error rate > 1%
- [ ] Page load time increased > 30%
- [ ] Chart render failures > 5%
- [ ] Mermaid library load failures > 10%
- [ ] Critical accessibility issues reported
- [ ] Production crashes or unrecoverable errors
- [ ] User complaints > 10% of active users

### Success Criteria

Deployment is successful when:

- [ ] All charts render correctly across browsers
- [ ] Mermaid diagrams display without errors
- [ ] Tabs are functional and persist state
- [ ] Pagination works smoothly
- [ ] No performance degradation
- [ ] Accessibility score remains 100
- [ ] Error rate < 0.1%
- [ ] Positive user feedback
- [ ] Page-builder-agent can create all components successfully

---

## Appendix A: Example JSON Specifications

### A.1 LineChart Example

```json
{
  "type": "LineChart",
  "props": {
    "data": [
      { "label": "Jan", "value": 65, "timestamp": "2025-01-01T00:00:00Z" },
      { "label": "Feb", "value": 78, "timestamp": "2025-02-01T00:00:00Z" },
      { "label": "Mar", "value": 90, "timestamp": "2025-03-01T00:00:00Z" },
      { "label": "Apr", "value": 81, "timestamp": "2025-04-01T00:00:00Z" },
      { "label": "May", "value": 95, "timestamp": "2025-05-01T00:00:00Z" }
    ],
    "config": {
      "title": "Monthly Revenue Growth",
      "xAxis": "Month",
      "yAxis": "Revenue ($K)",
      "colors": ["#3b82f6"],
      "showGrid": true,
      "showLegend": true
    },
    "height": 300,
    "showTrend": true,
    "gradient": true
  }
}
```

### A.2 BarChart Example

```json
{
  "type": "BarChart",
  "props": {
    "data": [
      { "label": "Product A", "value": 120 },
      { "label": "Product B", "value": 90 },
      { "label": "Product C", "value": 150 },
      { "label": "Product D", "value": 80 }
    ],
    "config": {
      "title": "Product Sales Comparison",
      "xAxis": "Products",
      "yAxis": "Units Sold",
      "colors": ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
      "showGrid": true,
      "showLegend": true
    },
    "height": 300,
    "showValues": true,
    "horizontal": false
  }
}
```

### A.3 PieChart Example

```json
{
  "type": "PieChart",
  "props": {
    "data": [
      { "label": "Desktop", "value": 45 },
      { "label": "Mobile", "value": 35 },
      { "label": "Tablet", "value": 15 },
      { "label": "Other", "value": 5 }
    ],
    "config": {
      "title": "Traffic by Device Type",
      "colors": ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
      "showLegend": true
    },
    "height": 300,
    "donut": true,
    "showTotal": true
  }
}
```

### A.4 Markdown with Mermaid Example

```json
{
  "type": "Markdown",
  "props": {
    "content": "# Deployment Workflow\n\nOur automated deployment process:\n\n```mermaid\ngraph TD;\n  A[Code Commit] -->|Push| B[GitHub];\n  B -->|Webhook| C[CI/CD Pipeline];\n  C -->|Tests Pass| D[Build Docker Image];\n  C -->|Tests Fail| E[Notify Developer];\n  D --> F[Deploy to Staging];\n  F -->|Manual Approval| G[Deploy to Production];\n  F -->|Issues Found| E;\n  G --> H[Monitor Metrics];\n  H -->|Alert on Issues| I[Rollback];\n```\n\n## Stages\n\n1. **Code Commit**: Developer pushes code to repository\n2. **CI/CD**: Automated tests and builds\n3. **Staging**: Test in production-like environment\n4. **Production**: Live deployment with monitoring"
  }
}
```

### A.5 Enhanced Tabs Example

```json
{
  "type": "tabs",
  "props": {
    "tabs": [
      {
        "id": "overview",
        "label": "Overview",
        "icon": "📊",
        "content": "# System Overview\n\nWelcome to the dashboard..."
      },
      {
        "id": "analytics",
        "label": "Analytics",
        "icon": "📈",
        "badge": "12",
        "content": "# Analytics Dashboard\n\nNew insights available!"
      },
      {
        "id": "settings",
        "label": "Settings",
        "icon": "⚙️",
        "content": "# Settings\n\nConfigure your preferences..."
      },
      {
        "id": "admin",
        "label": "Admin",
        "icon": "🔒",
        "disabled": true,
        "content": "# Admin Panel\n\nRestricted access"
      }
    ],
    "defaultTab": "overview",
    "syncWithUrl": true,
    "persistState": true,
    "lazyLoad": true
  }
}
```

### A.6 Pagination Example

```json
{
  "type": "Pagination",
  "props": {
    "totalItems": 250,
    "itemsPerPage": 25,
    "currentPage": 1,
    "showJumpTo": true,
    "showPageSize": true,
    "maxButtons": 7
  }
}
```

---

## Appendix B: Implementation Priority

### Phase 1: Chart Components (High Priority) - 6-8 hours

1. Create chart schemas in componentSchemas.ts (1 hour)
2. Add chart imports to DynamicPageRenderer.tsx (0.5 hours)
3. Add chart cases to renderValidatedComponent() (1 hour)
4. Create ChartWrapper.tsx for simplified API (2 hours)
5. Write unit tests for chart integration (1.5 hours)
6. Update component showcase page (1 hour)

### Phase 2: Mermaid Support (Medium Priority) - 4-6 hours

1. Install mermaid package (0.25 hours)
2. Create useMermaid.ts hook (1.5 hours)
3. Create MermaidWrapper.tsx component (2 hours)
4. Modify MarkdownRenderer.tsx (1 hour)
5. Write unit tests (1 hour)
6. Add mermaid examples to showcase (0.25 hours)

### Phase 3: Enhanced Tabs (Medium Priority) - 4-6 hours

1. Create useTabState.ts hook (1.5 hours)
2. Enhance tabs.tsx component (2 hours)
3. Update TabsSchema (0.5 hours)
4. Write unit tests (1.5 hours)
5. Add enhanced tabs to showcase (0.5 hours)

### Phase 4: Pagination (Low Priority) - 4-6 hours

1. Create usePagination.ts hook (1.5 hours)
2. Create pagination.tsx component (2 hours)
3. Create PaginationSchema (0.5 hours)
4. Add to DynamicPageRenderer (0.5 hours)
5. Write unit tests (1 hour)
6. Add to showcase (0.5 hours)

**Total Estimated Time**: 18-26 hours

---

## Appendix C: References

### Documentation

- Chart.js Documentation: https://www.chartjs.org/docs/latest/
- Mermaid.js Documentation: https://mermaid.js.org/
- React Markdown: https://github.com/remarkjs/react-markdown
- Zod Validation: https://zod.dev/
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/

### Existing Code References

- GanttChart implementation: `/frontend/src/components/dynamic-page/GanttChart.tsx`
- MarkdownRenderer: `/frontend/src/components/dynamic-page/MarkdownRenderer.tsx`
- ComponentSchemas: `/frontend/src/schemas/componentSchemas.ts`
- DynamicPageRenderer: `/frontend/src/components/DynamicPageRenderer.tsx`
- Tabs component: `/frontend/src/components/ui/tabs.tsx`

### Related Files

- Investigation Report: `/workspaces/agent-feed/INVESTIGATION-CHARTS-FLOWCHARTS-PAGINATION.md`
- Package.json: `/workspaces/agent-feed/frontend/package.json`

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-07 | SPARC Specification Agent | Initial comprehensive specification |

---

**End of Specification Document**

This document is ready for implementation by a development team. All requirements, edge cases, APIs, architecture, and testing strategies have been defined following the SPARC methodology.
