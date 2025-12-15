# Dynamic Component Library - Agent Integration Guide
**Version:** 1.0.0
**Last Updated:** September 30, 2025
**System:** Agent-Driven Dynamic Page Builder

---

## 📚 Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Component Registry](#component-registry)
4. [Component Specifications](#component-specifications)
5. [Layout Structure](#layout-structure)
6. [Data Integration (Phase 2)](#data-integration)
7. [Examples](#examples)
8. [Best Practices](#best-practices)

---

## Overview

### What is the Dynamic Component System?
A component-driven page rendering system that allows agents to programmatically create rich user interfaces without writing React code. Agents define page layouts via API using JSON configuration, and the system renders them as interactive UI components.

### Key Features
- ✅ **15+ Pre-built Components** - Headers, forms, tables, charts, timelines, and more
- ✅ **JSON-Based Configuration** - No coding required, just JSON configs
- ✅ **MVP-First Approach** - Components work with demo data, extensible for real data
- ✅ **Zero Backend Lock-in** - Components render standalone or with data sources
- ✅ **Real-time Rendering** - Changes to layout JSON reflect immediately in UI

---

## Getting Started

### Creating Your First Dynamic Page

**Step 1: Define Your Page Layout**
```json
{
  "id": "my-dashboard-v1",
  "agentId": "my-agent",
  "title": "My Dashboard",
  "version": "1.0.0",
  "layout": [
    {
      "id": "header-1",
      "type": "header",
      "config": {
        "title": "Welcome to My Dashboard",
        "level": 1
      }
    },
    {
      "id": "stat-1",
      "type": "stat",
      "config": {
        "label": "Total Users",
        "value": 1234,
        "change": 12.5,
        "icon": "👥"
      }
    }
  ],
  "components": ["header", "stat"],
  "metadata": {
    "description": "My custom dashboard",
    "tags": ["dashboard", "analytics"]
  }
}
```

**Step 2: Save via API**
```bash
POST /api/agent-pages/agents/{agentId}/pages
Content-Type: application/json

{
  "id": "my-dashboard-v1",
  "title": "My Dashboard",
  "layout": [...],
  "components": ["header", "stat"],
  "metadata": {...}
}
```

**Step 3: View in Browser**
Navigate to: `http://localhost:5173/agents/{agentId}/pages/my-dashboard-v1`

---

## Component Registry

### Available Components (15 Total)

| Component | Purpose | Demo Data | Status |
|-----------|---------|-----------|--------|
| `header` | Page/section titles | N/A | ✅ Ready |
| `todoList` | Task lists with checkboxes | 3 demo todos | ✅ Ready |
| `dataTable` | Sortable/filterable tables | 3 demo rows | ✅ Ready |
| `stat` | Metric cards with trends | N/A | ✅ Ready |
| `list` | Ordered/unordered lists | 3 demo items | ✅ Ready |
| `form` | Input forms | N/A | ✅ Ready |
| `tabs` | Tabbed interfaces | 2 demo tabs | ✅ Ready |
| `timeline` | Event timelines | 3 demo events | ✅ Ready |
| `Card` | Container cards | N/A | ✅ Ready |
| `Grid` | Layout grids | N/A | ✅ Ready |
| `Badge` | Status badges | N/A | ✅ Ready |
| `Metric` | Simple metrics | N/A | ✅ Ready |
| `ProfileHeader` | Profile displays | N/A | ✅ Ready |
| `CapabilityList` | Capability lists | N/A | ✅ Ready |
| `Button` | Action buttons | N/A | ✅ Ready |

---

## Component Specifications

### 1. header
**Purpose:** Display page or section titles with configurable heading levels.

**Config Properties:**
```typescript
{
  title: string;         // Required: Title text
  level: number;         // Required: 1-6 (h1-h6)
  subtitle?: string;     // Optional: Subtitle text
}
```

**Example:**
```json
{
  "id": "page-header",
  "type": "header",
  "config": {
    "title": "Analytics Dashboard",
    "level": 1,
    "subtitle": "Real-time insights and metrics"
  }
}
```

**Rendered Output:**
```html
<h1 class="text-3xl font-bold text-gray-900 mb-4">
  Analytics Dashboard
  <span class="block text-sm font-normal text-gray-600 mt-1">
    Real-time insights and metrics
  </span>
</h1>
```

---

### 2. todoList
**Purpose:** Display task lists with checkboxes, priority badges, and filters.

**Config Properties:**
```typescript
{
  showCompleted?: boolean;   // Show completed items
  sortBy?: string;           // Sort order: 'priority', 'date', 'default'
  filterTags?: string[];     // Filter by tags
}
```

**Demo Data:** Displays 3 placeholder todos with different priorities.

**Example:**
```json
{
  "id": "tasks",
  "type": "todoList",
  "config": {
    "showCompleted": false,
    "sortBy": "priority",
    "filterTags": ["urgent", "today"]
  }
}
```

**Rendered Output:**
- Task list with checkboxes
- Priority badges (high=red, medium=yellow, low=green)
- Filter tags displayed at bottom

---

### 3. dataTable
**Purpose:** Display tabular data with sortable columns.

**Config Properties:**
```typescript
{
  columns?: string[];     // Column names (default: Name, Status, Value)
  sortable?: boolean;     // Enable sorting
  filterable?: boolean;   // Enable filtering
}
```

**Demo Data:** Shows 3 sample rows with Name, Status, Value columns.

**Example:**
```json
{
  "id": "users-table",
  "type": "dataTable",
  "config": {
    "sortable": true,
    "filterable": false
  }
}
```

**Rendered Output:**
- Professional table with header row
- 3 demo rows with sample data
- Sortable column headers (if enabled)

---

### 4. stat
**Purpose:** Display key metrics with trend indicators and optional icons.

**Config Properties:**
```typescript
{
  label: string;          // Required: Metric label
  value: string|number;   // Required: Metric value
  change?: number;        // Optional: Percentage change (+/-)
  icon?: string;          // Optional: Emoji or icon
  description?: string;   // Optional: Additional context
}
```

**Example:**
```json
{
  "id": "active-users",
  "type": "stat",
  "config": {
    "label": "Active Users",
    "value": 1234,
    "change": 12.5,
    "icon": "👥",
    "description": "Last 30 days"
  }
}
```

**Rendered Output:**
- Large value display (3xl font)
- Trend indicator with color (green=up, red=down)
- Optional icon on the right
- Description text below

---

### 5. list
**Purpose:** Display ordered or unordered lists with optional icons.

**Config Properties:**
```typescript
{
  items?: string[];      // List items (default: 3 demo items)
  ordered?: boolean;     // true=numbered, false=bullets
  icon?: string;         // Optional: Icon before each item
}
```

**Example:**
```json
{
  "id": "features",
  "type": "list",
  "config": {
    "items": ["Real-time updates", "Advanced analytics", "Custom dashboards"],
    "ordered": false,
    "icon": "✓"
  }
}
```

**Rendered Output:**
- Bullet or numbered list
- Optional icon before each item
- Clean spacing and typography

---

### 6. form
**Purpose:** Display input forms with multiple field types.

**Config Properties:**
```typescript
{
  fields: Array<{
    label: string;
    type: string;          // 'text', 'email', 'password', 'number', etc.
    placeholder?: string;
    required?: boolean;
  }>;
  submitLabel?: string;    // Button text (default: 'Submit')
}
```

**Example:**
```json
{
  "id": "contact-form",
  "type": "form",
  "config": {
    "fields": [
      {
        "label": "Name",
        "type": "text",
        "placeholder": "Enter your name",
        "required": true
      },
      {
        "label": "Email",
        "type": "email",
        "placeholder": "you@example.com",
        "required": true
      }
    ],
    "submitLabel": "Send Message"
  }
}
```

**Rendered Output:**
- Form with labeled input fields
- Submit button at bottom
- Validation indicators

---

### 7. tabs
**Purpose:** Create tabbed interfaces for organizing content.

**Config Properties:**
```typescript
{
  tabs: Array<{
    label: string;
    content: string;
  }>;
}
```

**Demo Data:** Shows 2 demo tabs if not provided.

**Example:**
```json
{
  "id": "dashboard-tabs",
  "type": "tabs",
  "config": {
    "tabs": [
      { "label": "Overview", "content": "Dashboard overview content" },
      { "label": "Details", "content": "Detailed analytics" },
      { "label": "Settings", "content": "Configuration options" }
    ]
  }
}
```

**Rendered Output:**
- Horizontal tab buttons
- Active tab highlighted with blue underline
- Content area below tabs

---

### 8. timeline
**Purpose:** Display chronological events or milestones.

**Config Properties:**
```typescript
{
  events?: Array<{
    id: number;
    title: string;
    date: string;
    description: string;
  }>;
  orientation?: 'vertical' | 'horizontal';  // Default: vertical
}
```

**Demo Data:** Shows 3 demo events if not provided.

**Example:**
```json
{
  "id": "project-timeline",
  "type": "timeline",
  "config": {
    "events": [
      {
        "id": 1,
        "title": "Project Started",
        "date": "2025-09-01",
        "description": "Initial kickoff meeting"
      },
      {
        "id": 2,
        "title": "MVP Released",
        "date": "2025-09-15",
        "description": "First version shipped to users"
      }
    ]
  }
}
```

**Rendered Output:**
- Vertical timeline with connecting line
- Event dots with titles, dates, descriptions
- Clean spacing between events

---

### 9. Card
**Purpose:** Container component for grouping content.

**Config Properties:**
```typescript
{
  title?: string;
  description?: string;
  className?: string;    // Additional CSS classes
}
```

**Example:**
```json
{
  "id": "info-card",
  "type": "Card",
  "config": {
    "title": "Important Information",
    "description": "This is a card container for organizing content",
    "className": "shadow-lg"
  }
}
```

---

### 10. Grid
**Purpose:** Layout component for responsive grids.

**Config Properties:**
```typescript
{
  cols?: number;    // Number of columns (default: 1)
  gap?: number;     // Gap size (default: 4)
}
```

**Example:**
```json
{
  "id": "stats-grid",
  "type": "Grid",
  "config": {
    "cols": 3,
    "gap": 6
  }
}
```

---

## Layout Structure

### Page Layout Format
```json
{
  "id": "page-id",
  "agentId": "agent-id",
  "title": "Page Title",
  "version": "1.0.0",
  "layout": [
    // Array of component definitions
  ],
  "components": [
    // Array of component type names used
  ],
  "metadata": {
    "description": "Page description",
    "tags": ["tag1", "tag2"],
    "icon": "📊"
  },
  "createdAt": "2025-09-30T00:00:00.000Z",
  "updatedAt": "2025-09-30T00:00:00.000Z"
}
```

### Component Definition Structure
```json
{
  "id": "unique-component-id",
  "type": "componentType",
  "config": {
    // Component-specific properties
  },
  "dataSource": {  // Optional, Phase 2
    "endpoint": "/api/data/todos",
    "method": "GET",
    "refreshInterval": 5000
  }
}
```

---

## Data Integration (Phase 2)

### Adding Data Sources to Components
**Coming Soon:** Components can fetch real data from API endpoints.

**Example with dataSource:**
```json
{
  "id": "live-todos",
  "type": "todoList",
  "config": {
    "showCompleted": false,
    "sortBy": "priority"
  },
  "dataSource": {
    "endpoint": "/api/agents/my-agent/todos",
    "method": "GET",
    "refreshInterval": 10000,
    "headers": {
      "Authorization": "Bearer token"
    }
  }
}
```

**How It Works:**
1. Component requests data from specified endpoint
2. Shows loading spinner while fetching
3. Renders fetched data instead of demo data
4. Auto-refreshes if `refreshInterval` is set
5. Falls back to demo data if fetch fails

---

## Examples

### Example 1: Simple Dashboard
```json
{
  "id": "simple-dashboard",
  "agentId": "analytics-agent",
  "title": "Analytics Dashboard",
  "version": "1.0.0",
  "layout": [
    {
      "id": "header-1",
      "type": "header",
      "config": {
        "title": "Analytics Overview",
        "level": 1,
        "subtitle": "Real-time metrics and insights"
      }
    },
    {
      "id": "stat-1",
      "type": "stat",
      "config": {
        "label": "Total Users",
        "value": 5432,
        "change": 12.5,
        "icon": "👥"
      }
    },
    {
      "id": "stat-2",
      "type": "stat",
      "config": {
        "label": "Revenue",
        "value": "$125K",
        "change": -3.2,
        "icon": "💰"
      }
    },
    {
      "id": "table-1",
      "type": "dataTable",
      "config": {
        "sortable": true
      }
    }
  ],
  "components": ["header", "stat", "dataTable"],
  "metadata": {
    "description": "Main analytics dashboard",
    "tags": ["analytics", "dashboard"]
  }
}
```

### Example 2: Todo Management Page
```json
{
  "id": "todo-manager",
  "agentId": "productivity-agent",
  "title": "Task Manager",
  "version": "1.0.0",
  "layout": [
    {
      "id": "header-1",
      "type": "header",
      "config": {
        "title": "My Tasks",
        "level": 1
      }
    },
    {
      "id": "tabs-1",
      "type": "tabs",
      "config": {
        "tabs": [
          { "label": "All Tasks", "content": "todoList-1" },
          { "label": "Completed", "content": "todoList-2" }
        ]
      }
    },
    {
      "id": "todoList-1",
      "type": "todoList",
      "config": {
        "showCompleted": false,
        "sortBy": "priority"
      }
    }
  ],
  "components": ["header", "tabs", "todoList"],
  "metadata": {
    "description": "Manage your daily tasks",
    "tags": ["productivity", "todos"]
  }
}
```

### Example 3: Project Timeline
```json
{
  "id": "project-timeline-page",
  "agentId": "project-agent",
  "title": "Project Timeline",
  "version": "1.0.0",
  "layout": [
    {
      "id": "header-1",
      "type": "header",
      "config": {
        "title": "Project Milestones",
        "level": 1
      }
    },
    {
      "id": "timeline-1",
      "type": "timeline",
      "config": {
        "events": [
          { "id": 1, "title": "Kickoff", "date": "2025-09-01", "description": "Project started" },
          { "id": 2, "title": "Alpha", "date": "2025-09-15", "description": "First release" },
          { "id": 3, "title": "Beta", "date": "2025-09-30", "description": "Public beta" }
        ]
      }
    }
  ],
  "components": ["header", "timeline"],
  "metadata": {
    "description": "Track project progress",
    "tags": ["project", "timeline"]
  }
}
```

---

## Best Practices

### 1. Component Naming
- Use descriptive IDs: `user-stats`, `todo-list-main`, `project-timeline-2025`
- Follow convention: `{component-type}-{purpose}-{number}`

### 2. Layout Organization
- Start with a header component
- Group related components together
- Use Grid for responsive layouts
- Use Card for visual grouping

### 3. Performance
- Limit components per page to 10-15 for optimal performance
- Use tabs to organize large amounts of content
- Consider pagination for large data sets

### 4. Accessibility
- Use proper heading levels (h1 → h2 → h3)
- Provide descriptive labels for forms
- Include alt text for icons (coming soon)

### 5. Version Management
- Increment version on breaking changes
- Use semantic versioning: major.minor.patch
- Keep old versions for rollback capability

---

## API Reference

### Create Page
```bash
POST /api/agent-pages/agents/{agentId}/pages
Content-Type: application/json

{
  "id": "page-id",
  "title": "Page Title",
  "layout": [...],
  "components": [...],
  "metadata": {...}
}
```

### Get Page
```bash
GET /api/agent-pages/agents/{agentId}/pages/{pageId}
```

### Update Page
```bash
PUT /api/agent-pages/agents/{agentId}/pages/{pageId}
Content-Type: application/json

{
  "title": "Updated Title",
  "layout": [...],
  "version": "1.1.0"
}
```

### Delete Page
```bash
DELETE /api/agent-pages/agents/{agentId}/pages/{pageId}
```

### List Pages
```bash
GET /api/agent-pages/agents/{agentId}/pages
```

---

## Troubleshooting

### Page Not Rendering
1. Check that `layout` array is not empty
2. Verify component `type` names are correct
3. Ensure all required config properties are provided
4. Check browser console for errors

### Components Not Displaying
1. Verify component type is in supported list
2. Check that `config` object has required properties
3. Ensure component ID is unique within page

### Demo Data Not Showing
1. Demo data only shows for specific components (todoList, dataTable, timeline, list, tabs)
2. Check that component has valid demo data in implementation
3. Verify no API errors preventing component render

---

## Support & Feedback

**Documentation:** `/COMPONENT_LIBRARY_DOCUMENTATION.md`
**Specification:** `/DYNAMIC_COMPONENT_SYSTEM_SPEC.md`
**Test Suite:** `/frontend/src/tests/unit/dynamic-component-rendering.test.ts`

For issues or feature requests, contact the development team.

---

**Last Updated:** September 30, 2025
**Version:** 1.0.0
**Status:** ✅ Production Ready