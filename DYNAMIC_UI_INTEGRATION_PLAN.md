# Dynamic UI Integration Plan
**Date**: October 4, 2025
**Status**: INVESTIGATION COMPLETE - PLAN READY FOR APPROVAL

---

## Executive Summary

After investigating the current state of the system, I've identified several critical gaps between the new Dynamic UI System and the existing agent architecture. This plan addresses:

1. **Backend-Frontend Separation** - Currently missing proper data layer
2. **Page-Builder-Agent Updates** - Needs integration with new validation/template system
3. **Avi (CLAUDE.md) Integration** - Not configured to route page building requests
4. **Personal-Todos-Agent** - Example agent that needs dynamic page capabilities

---

## Investigation Findings

### ✅ What's Working

1. **Dynamic UI System (100% Complete)**
   - 15 component Zod schemas with validation
   - 5 pre-validated templates (dashboard, todo, timeline, form, analytics)
   - Component catalog API (3 endpoints)
   - Template API (3 endpoints)
   - 132+ tests passing (unit + integration + E2E)

2. **Page-Builder-Agent Definition**
   - Located at `/workspaces/agent-feed/prod/.claude/agents/page-builder-agent.md`
   - Comprehensive component library documentation
   - Mobile-first design strategy
   - Security validation framework
   - Database integration protocol (dual storage: file + DB)

3. **Personal-Todos-Agent Definition**
   - Located at `/workspaces/agent-feed/prod/.claude/agents/personal-todos-agent.md`
   - Has `page_config` with route and data endpoint
   - Task management functionality with Fibonacci priorities
   - Several existing pages in `/workspaces/agent-feed/data/agent-pages/`

4. **Avi (CLAUDE.md)**
   - Located at `/workspaces/agent-feed/prod/.claude/CLAUDE.md`
   - Chief of Staff role defined
   - Agent coordination protocols established
   - Posting requirements documented

### ❌ What's Missing

#### 1. **Backend-Frontend Data Separation** (Critical Gap)

**Problem**: Currently no clear backend data layer separate from UI rendering.

**Current State**:
- Pages are stored as JSON files with embedded data in component props
- Example: `personal-todos-agent-dashboard.json` contains hardcoded task data in components
- No API endpoints for dynamic data fetching

**Impact**:
- Page-builder-agent cannot modify pages without affecting user data
- No separation between page structure and page content
- User data gets overwritten when pages are updated

**Required Architecture**:
```
┌─────────────────────┐
│  Page Structure     │  ← Page-Builder-Agent modifies (templates, layouts, components)
│  (Template/Layout)  │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  Data Binding API   │  ← Maps page variables to backend data sources
│  (Variable Mapping) │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  Backend Data API   │  ← Personal-Todos-Agent manages (task data, metrics, etc.)
│  (Agent Data)       │
└─────────────────────┘
```

#### 2. **Page-Builder-Agent Integration with Dynamic UI System**

**Problem**: Page-builder-agent.md is NOT aware of the new validation/template system.

**Current State**:
- Page-builder-agent has custom component definitions (outdated)
- No mention of Zod validation schemas
- No integration with template library API
- No awareness of component catalog API

**Required Updates**:
- Import Zod schemas from `/frontend/src/schemas/componentSchemas.ts`
- Use template API endpoints (`/api/dynamic-ui/templates/*`)
- Reference component catalog API (`/api/components/catalog`)
- Update security validation to use Zod instead of custom logic

#### 3. **Avi (CLAUDE.md) Page Building Coordination**

**Problem**: Avi is NOT configured to route page building requests.

**Current State**:
- CLAUDE.md mentions Page-Builder-Agent exists
- No routing logic for "agent needs page" scenarios
- No integration protocol for Avi → Page-Builder coordination
- No mention of when to automatically trigger page creation

**Required Protocol**:
```
User/Agent Request → Avi Assessment → Route to Page-Builder → Validate → Create → Store → Notify
```

**Avi Needs**:
- Detection rules: "When should Avi trigger page-builder-agent?"
- Routing logic: "How does Avi delegate to page-builder-agent?"
- Coordination protocol: "How does Avi track page building progress?"

#### 4. **Personal-Todos-Agent Integration**

**Problem**: Personal-todos-agent has page_config but no integration with Dynamic UI System.

**Current State**:
- Existing pages in `/data/agent-pages/` with hardcoded data
- No data API endpoint implementation
- Page structure mixed with data (no separation)
- No use of validated templates

**Required Implementation**:
- **Data API**: `/api/agents/personal-todos-agent/data` endpoint
- **Template Usage**: Use `todoManager` template from Dynamic UI System
- **Variable Binding**: Map template variables to data API
- **Page Updates**: Rebuild page when data changes (via page-builder-agent)

---

## Proposed Solution Architecture

### Phase 1: Backend-Frontend Data Separation (Foundation)

**Goal**: Establish clean separation between page structure and page data.

#### 1.1 Data Binding API Specification

**New API Endpoints** (to create in `/api-server/server.js`):

```javascript
// Get agent data for page rendering
GET /api/agents/:agentId/data
Response: {
  "success": true,
  "data": {
    // Agent-specific data structure
    // For personal-todos: { totalTasks, completedTasks, recentTasks, ... }
  }
}

// Update agent data (agent writes to its own data store)
POST /api/agents/:agentId/data
Body: { /* agent data updates */ }
Response: { "success": true, "updated": true }

// Get page spec with data bindings (not embedded data)
GET /api/agent-pages/agents/:agentId/pages/:pageId
Response: {
  "success": true,
  "page": {
    "layout": [
      {
        "type": "stat",
        "config": {
          "label": "Total Tasks",
          "value": "{{data.totalTasks}}"  // ← Data binding, not hardcoded value
        }
      }
    ],
    "dataSource": "/api/agents/personal-todos-agent/data"  // ← Link to data API
  }
}
```

#### 1.2 Data Binding Resolution (Frontend)

**Frontend Component** (to create in `/frontend/src/components/DynamicPageWithData.tsx`):

```typescript
// Fetch page structure
const pageSpec = await fetch(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
const { page } = await pageSpec.json()

// Fetch live data
const dataResponse = await fetch(page.dataSource)
const { data } = await dataResponse.json()

// Resolve bindings: Replace {{data.totalTasks}} with actual value
const resolvedPage = resolveDataBindings(page.layout, data)

// Render with live data
<DynamicPageRenderer layout={resolvedPage} />
```

**Benefits**:
- ✅ Page-builder-agent can modify page structure without touching data
- ✅ Personal-todos-agent can modify data without touching page structure
- ✅ Clear ownership: Page-builder owns structure, agents own data
- ✅ Real-time data updates without page rebuilds

#### 1.3 Agent Data Service Implementation

**Each agent implements** (example for personal-todos-agent):

```javascript
// /api-server/routes/agents/personal-todos-agent.js
app.get('/api/agents/personal-todos-agent/data', async (req, res) => {
  const workspaceDir = '/workspaces/agent-feed/prod/agent_workspace/personal-todos-agent';
  const tasksPath = `${workspaceDir}/tasks.json`;

  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));

  res.json({
    success: true,
    data: {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      activeTasks: tasks.filter(t => t.status !== 'completed').length,
      recentTasks: tasks.slice(0, 5),
      priorityDistribution: calculatePriorityDistribution(tasks)
    }
  });
});
```

---

### Phase 2: Page-Builder-Agent Integration

**Goal**: Connect page-builder-agent to validated component/template system.

#### 2.1 Update Page-Builder-Agent Instructions

**File**: `/workspaces/agent-feed/prod/.claude/agents/page-builder-agent.md`

**Required Changes**:

```markdown
## NEW: Dynamic UI System Integration

### Component Validation (Zod Schemas)
- **Schema Location**: `/frontend/src/schemas/componentSchemas.ts`
- **Validation**: ALL components MUST validate against Zod schemas before page creation
- **Catalog API**: Use `/api/components/catalog` to discover available components

### Template System
- **Template API**: `/api/dynamic-ui/templates`
- **Available Templates**:
  - dashboard - Metrics and data visualization
  - todoManager - Task management interface
  - timeline - Chronological events
  - formPage - Data collection
  - analytics - Comprehensive KPI dashboard

### Template Usage Protocol
1. **Check if template exists** for requested page type
2. **Use template API** to instantiate with variables
3. **Add data bindings** instead of hardcoded values
4. **Link to data source** via `dataSource` field

### Data Binding Format
Components use `{{data.variableName}}` syntax for dynamic data:
```json
{
  "type": "stat",
  "config": {
    "label": "Total Tasks",
    "value": "{{data.totalTasks}}"  // NOT hardcoded "42"
  }
}
```

### Security Validation
- **Use Zod schemas** for prop validation (not custom logic)
- **ValidationError component** displays errors to agents
- **Component whitelist** enforced by schema registry
```

#### 2.2 Page Creation Workflow Update

**New Workflow** (for page-builder-agent):

```
1. Receive page request from agent/Avi
   ↓
2. Check if template exists for requested page type
   ↓
3. If yes: Use template API → GET /api/dynamic-ui/templates/:templateId/instantiate
   ↓
4. Replace template variables with DATA BINDINGS (not data values)
   ↓
5. Add dataSource field linking to agent's data API
   ↓
6. Validate ALL components against Zod schemas
   ↓
7. Store page spec (structure + bindings, NO embedded data)
   ↓
8. Register in database via POST API
   ↓
9. Verify accessibility
   ↓
10. Return page URL to requesting agent
```

---

### Phase 3: Avi (CLAUDE.md) Coordination Protocol

**Goal**: Enable Avi to automatically route page building requests.

#### 3.1 Update CLAUDE.md with Page Building Routing

**File**: `/workspaces/agent-feed/prod/.claude/CLAUDE.md`

**Required Additions**:

```markdown
## 🎨 Dynamic Page Building Coordination

### Automatic Page Building Triggers

**Avi MUST route to page-builder-agent when:**
1. **Agent explicitly requests** a page/dashboard
2. **Agent data volume** exceeds thresholds (e.g., personal-todos >50 tasks)
3. **User requests** visualization/dashboard for agent data
4. **Agent self-advocates** via page request protocol

### Page Request Detection Rules

**Trigger Phrases** (route to page-builder-agent):
- "create a page for..."
- "build a dashboard for..."
- "I need a UI for..."
- "show my tasks visually..."
- "analytics dashboard for..."

**Data Volume Triggers** (proactive routing):
- personal-todos-agent: >50 active tasks → suggest dashboard
- Any agent: Repeated manual data queries → suggest page
- User frustration: "hard to track..." → suggest visualization

### Routing Protocol

When page building is needed:
1. **Assess Data Readiness**: Check agent has data at `/api/agents/:agentId/data`
2. **Determine Page Type**: Dashboard, profile, analytics, form, or custom
3. **Spawn page-builder-agent**: With full context and requirements
4. **Provide agent context**: Data API endpoint, preferred template, variables
5. **Monitor progress**: Track page creation status
6. **Notify requester**: Return page URL when complete

### Example Coordination Flow

```javascript
User: "I want a dashboard for my tasks"
  ↓
Avi Analysis:
  - Requestor: personal-todos-agent
  - Data ready: Yes (/api/agents/personal-todos-agent/data)
  - Page type: Dashboard (todoManager template)
  - Template vars: totalTasks, completedTasks, recentTasks
  ↓
Avi Action: Spawn page-builder-agent
  ↓
Page-Builder: Creates page with data bindings
  ↓
Avi Response: "Dashboard created at /agents/personal-todos-agent/pages/dashboard"
```

### Page Building Best Practices (Avi)
- **Always check data readiness** before requesting pages
- **Suggest appropriate templates** based on page type
- **Provide clear variable mappings** from data API
- **Track page building progress** for user visibility
- **Post outcomes to agent feed** for transparency
```

---

### Phase 4: Personal-Todos-Agent Example Implementation

**Goal**: Demonstrate full integration with real agent.

#### 4.1 Implement Data API

**File**: `/api-server/routes/agents/personal-todos-agent.js` (new file)

```javascript
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Personal Todos Agent Data API
router.get('/data', async (req, res) => {
  try {
    const workspaceDir = '/workspaces/agent-feed/prod/agent_workspace/personal-todos-agent';
    const tasksPath = path.join(workspaceDir, 'tasks.json');

    // Ensure workspace and task file exist
    if (!fs.existsSync(tasksPath)) {
      return res.json({
        success: true,
        data: {
          totalTasks: 0,
          completedTasks: 0,
          activeTasks: 0,
          recentTasks: [],
          priorityDistribution: {}
        }
      });
    }

    const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));

    const activeTasks = tasks.filter(t => t.status !== 'completed');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    // Calculate priority distribution
    const priorityDistribution = activeTasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        activeTasks: activeTasks.length,
        recentTasks: tasks
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
          .slice(0, 5)
          .map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            impact_score: t.impact_score,
            status: t.status
          })),
        priorityDistribution,
        completionRate: tasks.length > 0 ? (completedTasks.length / tasks.length * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task data',
      message: error.message
    });
  }
});

module.exports = router;
```

**Register in server.js**:
```javascript
const personalTodosRoutes = require('./routes/agents/personal-todos-agent');
app.use('/api/agents/personal-todos-agent', personalTodosRoutes);
```

#### 4.2 Create Page with Data Bindings

**Example Page Spec** (created by page-builder-agent):

```json
{
  "id": "personal-todos-dashboard",
  "agent_id": "personal-todos-agent",
  "title": "Task Management Dashboard",
  "dataSource": "/api/agents/personal-todos-agent/data",
  "specification": {
    "layout": [
      {
        "id": "header",
        "type": "header",
        "config": {
          "title": "My Tasks",
          "level": 1,
          "subtitle": "Fibonacci Priority System"
        }
      },
      {
        "id": "stats-grid",
        "type": "Grid",
        "config": { "cols": 3, "gap": 4 },
        "children": [
          {
            "id": "stat-total",
            "type": "stat",
            "config": {
              "label": "Total Tasks",
              "value": "{{data.totalTasks}}",
              "icon": "📋"
            }
          },
          {
            "id": "stat-active",
            "type": "stat",
            "config": {
              "label": "Active",
              "value": "{{data.activeTasks}}",
              "change": "{{data.completionRate}}",
              "icon": "⚡"
            }
          },
          {
            "id": "stat-completed",
            "type": "stat",
            "config": {
              "label": "Completed",
              "value": "{{data.completedTasks}}",
              "icon": "✅"
            }
          }
        ]
      }
    ]
  }
}
```

**Note**: `{{data.totalTasks}}` is a BINDING, not embedded data. Frontend resolves at render time.

#### 4.3 Update Personal-Todos-Agent Instructions

**File**: `/workspaces/agent-feed/prod/.claude/agents/personal-todos-agent.md`

**Add Section**:

```markdown
## Dynamic Page Integration

### Data API Implementation
This agent provides real-time task data at:
- **Endpoint**: `/api/agents/personal-todos-agent/data`
- **Format**: JSON with totalTasks, activeTasks, completedTasks, recentTasks, priorityDistribution

### Page Request Protocol
When task volume or user needs require visualization:
1. **Request dashboard via Avi**: "I need a task dashboard"
2. **Avi routes to page-builder-agent**: With data API and template info
3. **Page-builder creates**: todoManager template with data bindings
4. **Page renders with live data**: Frontend fetches from data API

### Page Update Workflow
- **Data changes**: Update tasks.json → Data API auto-reflects changes
- **Structure changes**: Request via Avi → Page-builder updates page spec
- **No data in page spec**: All data comes from `/api/agents/personal-todos-agent/data`
```

---

## Implementation Checklist

### Phase 1: Backend-Frontend Data Separation
- [ ] Create data binding resolver in frontend (`DynamicPageWithData.tsx`)
- [ ] Update DynamicPageRenderer to support `{{data.variable}}` syntax
- [ ] Add `dataSource` field to page spec schema
- [ ] Update page storage to include data source links
- [ ] Test data binding resolution with mock data

### Phase 2: Page-Builder-Agent Integration
- [ ] Update page-builder-agent.md with Dynamic UI System integration
- [ ] Add Zod schema validation to page building workflow
- [ ] Integrate template API usage in page creation
- [ ] Update component library section to reference catalog API
- [ ] Add data binding creation logic
- [ ] Update security validation to use Zod
- [ ] Test template instantiation with data bindings

### Phase 3: Avi Coordination Protocol
- [ ] Add page building detection rules to CLAUDE.md
- [ ] Create routing protocol for page requests
- [ ] Add proactive page suggestion logic
- [ ] Document coordination flow with page-builder-agent
- [ ] Add example coordination scenarios
- [ ] Test Avi → Page-Builder delegation

### Phase 4: Personal-Todos-Agent Implementation
- [ ] Create `/api-server/routes/agents/personal-todos-agent.js`
- [ ] Implement `/api/agents/personal-todos-agent/data` endpoint
- [ ] Register route in server.js
- [ ] Create sample tasks.json in agent workspace
- [ ] Update personal-todos-agent.md with data API section
- [ ] Build dashboard page with data bindings
- [ ] Test end-to-end: data update → page refresh

### Phase 5: Testing & Validation
- [ ] Test data API returns correct structure
- [ ] Test data binding resolution in frontend
- [ ] Test page creation with templates + bindings
- [ ] Test Avi routing to page-builder-agent
- [ ] Test personal-todos-agent dashboard with live data
- [ ] Test page updates don't affect data
- [ ] Test data updates reflect in page without rebuild

---

## Success Criteria

### Data Separation
- ✅ Page structure stored separately from page data
- ✅ Agents can update data without modifying pages
- ✅ Page-builder can update pages without affecting data
- ✅ Data bindings resolve correctly at render time

### Page-Builder Integration
- ✅ All pages use Zod-validated components
- ✅ Templates used for 80%+ of pages
- ✅ Component catalog API referenced for discovery
- ✅ ValidationError displays helpful feedback

### Avi Coordination
- ✅ Avi detects page building requests automatically
- ✅ Avi routes to page-builder-agent with full context
- ✅ Progress tracked and user notified
- ✅ Agent feed posts show page creation outcomes

### Personal-Todos Integration
- ✅ Data API returns live task data
- ✅ Dashboard uses todoManager template
- ✅ Data bindings resolve to current values
- ✅ Page updates without affecting tasks.json
- ✅ Task updates reflect in dashboard without rebuild

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Data Separation | 4-6 hours | None |
| Phase 2: Page-Builder Integration | 3-4 hours | Phase 1 |
| Phase 3: Avi Coordination | 2-3 hours | Phase 2 |
| Phase 4: Personal-Todos Implementation | 3-4 hours | Phase 1, 2, 3 |
| Phase 5: Testing & Validation | 2-3 hours | All phases |
| **Total** | **14-20 hours** | Sequential |

---

## Risks & Mitigation

### Risk 1: Breaking Existing Pages
**Mitigation**: Implement backward compatibility. Pages without `dataSource` field use embedded data (legacy mode).

### Risk 2: Data Binding Complexity
**Mitigation**: Start with simple variable replacement. Add advanced features (loops, conditionals) later.

### Risk 3: Agent Adoption
**Mitigation**: Provide clear examples (personal-todos). Document patterns. Offer templates.

### Risk 4: Performance Issues
**Mitigation**: Cache data API responses. Implement polling/WebSocket for updates. Monitor latency.

---

## Questions for User

Before proceeding with implementation:

1. **Data Binding Syntax**: Is `{{data.variableName}}` acceptable or prefer different syntax?
2. **Backend Storage**: Should agent data stay in JSON files or move to database?
3. **Real-time Updates**: Should pages auto-refresh when data changes (WebSocket/polling)?
4. **Legacy Pages**: Keep existing pages with embedded data or migrate all to data bindings?
5. **Phase Priority**: Which phase should be implemented first, or proceed sequentially?
6. **Avi Proactiveness**: How aggressive should Avi be in suggesting pages (conservative vs proactive)?

---

## Next Steps (Awaiting Approval)

Once you approve this plan, I will:

1. Implement Phase 1 (Data Separation) - Foundation layer
2. Update Page-Builder-Agent with Dynamic UI integration
3. Update CLAUDE.md with coordination protocol
4. Implement Personal-Todos-Agent as reference example
5. Run full testing suite to validate end-to-end flow
6. Generate final implementation report

**Estimated Completion**: 14-20 hours (1-2 development days)

---

**Status**: ⏸️ AWAITING USER APPROVAL TO PROCEED
