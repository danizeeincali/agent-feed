# SPARC Specification: Dynamic UI Integration System

**Date**: October 4, 2025
**Methodology**: SPARC + TDD + Claude-Flow Swarm + Playwright E2E
**Status**: Ready for Implementation

---

## Problem Statement

The Dynamic UI System is complete (validation, templates, catalog APIs), but integration with the agent ecosystem is incomplete:

1. **Data-Structure Coupling**: Pages mix UI structure and data, preventing independent updates
2. **Page-Builder Awareness**: Page-builder-agent unaware of new validation/template system
3. **Coordination Gap**: Avi (CLAUDE.md) lacks page building routing logic
4. **Agent Integration**: Agents like personal-todos need data APIs and binding support

**Impact**: Agents cannot safely build/update pages without affecting user data. Templates and validation system are unused.

---

## Desired State

**Three-Layer Integration Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Agent Coordination (Avi)                           │
│ - Detects page building needs                               │
│ - Routes to page-builder-agent with context                 │
│ - Tracks progress and notifies users                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Page Building (Page-Builder-Agent)                 │
│ - Uses validated templates from Dynamic UI System           │
│ - Creates pages with data bindings (no embedded data)       │
│ - Validates all components with Zod schemas                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Data Layer (Agent Data APIs)                       │
│ - Each agent provides /api/agents/:agentId/data endpoint    │
│ - Pages reference data via bindings: {{data.variable}}      │
│ - Data updates without page rebuilds                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

### Quantitative Metrics
- ✅ All existing pages migrated to data binding system
- ✅ Page-builder-agent uses templates for 80%+ of pages
- ✅ 100% of components validated with Zod before rendering
- ✅ Avi routes 100% of page requests to page-builder-agent
- ✅ Personal-todos-agent has working data API + dashboard
- ✅ 40+ unit tests passing (data binding, API, validation)
- ✅ 15+ integration tests passing (end-to-end workflows)
- ✅ 10+ E2E tests with Playwright screenshots
- ✅ Zero errors in production validation

### Qualitative Metrics
- ✅ Pages update structure without affecting user data
- ✅ Agents update data without rebuilding pages
- ✅ Clear separation of concerns (structure vs data vs coordination)
- ✅ Agents can self-request pages via Avi
- ✅ Real-time data rendering without page rebuilds

---

## Implementation Phases

### Phase 1: Data Binding Foundation (Week 1, Days 1-2)

**Goal**: Establish clean separation between page structure and page data

**Deliverables**:
1. **Data Binding Resolver** (Frontend)
   - Create `DynamicPageWithData.tsx` component
   - Implement `{{data.variable}}` syntax parser
   - Add data fetching from agent data APIs
   - Handle binding resolution errors gracefully

2. **Page Schema Extension** (Backend)
   - Add `dataSource` field to page specification schema
   - Update page storage to support data source links
   - Modify DynamicPageRenderer to accept resolved data

3. **Agent Data API Template** (Backend)
   - Create `/api-server/routes/agents/README.md` with API guidelines
   - Define standard data response format
   - Add error handling patterns

4. **Unit Tests** (15 tests)
   - Data binding parser tests
   - Binding resolution with nested objects
   - Error handling for missing variables
   - Data fetching and caching tests

**Files Created/Modified**:
- `/frontend/src/components/DynamicPageWithData.tsx` (new)
- `/frontend/src/utils/dataBindingResolver.ts` (new)
- `/frontend/src/schemas/pageSchemas.ts` (modified - add dataSource)
- `/api-server/routes/agents/README.md` (new)
- `/frontend/src/tests/unit/data-binding.test.ts` (new - 15 tests)

---

### Phase 2: Page-Builder Integration (Week 1, Days 2-3)

**Goal**: Update page-builder-agent to use Dynamic UI System

**Deliverables**:
1. **Page-Builder Instructions Update**
   - Update `/prod/.claude/agents/page-builder-agent.md`
   - Add Dynamic UI System integration section
   - Document Zod validation workflow
   - Add template API usage examples
   - Document data binding creation

2. **Template Usage Protocol**
   - Add "check template first" workflow
   - Document when to use custom vs template
   - Add variable-to-binding mapping logic

3. **Component Discovery Integration**
   - Reference catalog API for component discovery
   - Document Zod schema validation process
   - Add ValidationError handling

4. **Integration Tests** (10 tests)
   - Page creation with template API
   - Data binding generation
   - Component validation with Zod
   - Template variable mapping

**Files Modified**:
- `/workspaces/agent-feed/prod/.claude/agents/page-builder-agent.md` (modified)
- `/frontend/src/tests/integration/page-builder-integration.test.ts` (new - 10 tests)

---

### Phase 3: Avi Coordination Protocol (Week 1, Days 3-4)

**Goal**: Enable Avi to automatically route page building requests

**Deliverables**:
1. **CLAUDE.md Updates**
   - Add page building detection rules
   - Document routing protocol to page-builder-agent
   - Add proactive page suggestion logic
   - Document coordination flow examples

2. **Routing Trigger Definitions**
   - Define keyword/phrase triggers
   - Add data volume thresholds
   - Document user frustration signals

3. **Coordination Workflow**
   - Document Avi → Page-Builder delegation
   - Add progress tracking requirements
   - Define notification protocol

4. **Unit Tests** (8 tests)
   - Trigger phrase detection
   - Routing decision logic
   - Context assembly for page-builder
   - Progress tracking

**Files Modified**:
- `/workspaces/agent-feed/prod/.claude/CLAUDE.md` (modified)
- `/frontend/src/tests/unit/avi-coordination.test.ts` (new - 8 tests)

---

### Phase 4: Personal-Todos Implementation (Week 1, Days 4-5)

**Goal**: Implement reference example with full integration

**Deliverables**:
1. **Data API Implementation**
   - Create `/api-server/routes/agents/personal-todos-agent.js`
   - Implement `/api/agents/personal-todos-agent/data` endpoint
   - Add task data aggregation logic
   - Implement error handling

2. **Dashboard Creation**
   - Use todoManager template
   - Create page with data bindings
   - Link to data API
   - Store in database

3. **Agent Instructions Update**
   - Update personal-todos-agent.md
   - Document data API usage
   - Add page request workflow

4. **Integration Tests** (7 tests)
   - Data API returns correct structure
   - Dashboard page has data bindings
   - Bindings resolve to live data
   - Page updates without affecting tasks
   - Task updates reflect in dashboard

**Files Created/Modified**:
- `/api-server/routes/agents/personal-todos-agent.js` (new)
- `/prod/agent_workspace/personal-todos-agent/tasks.json` (sample data)
- `/workspaces/agent-feed/prod/.claude/agents/personal-todos-agent.md` (modified)
- `/frontend/src/tests/integration/personal-todos-integration.test.ts` (new - 7 tests)

---

### Phase 5: E2E Testing & Validation (Week 1, Day 5-6)

**Goal**: Validate complete system with real browser tests

**Deliverables**:
1. **E2E Test Suite** (10+ tests with screenshots)
   - Test 1: Page creation via Avi coordination
   - Test 2: Data binding resolution in browser
   - Test 3: Personal-todos dashboard rendering
   - Test 4: Live data updates without page rebuild
   - Test 5: Template instantiation workflow
   - Test 6: Component validation errors display
   - Test 7: Multiple agent data APIs
   - Test 8: Page structure update without data loss
   - Test 9: Data update without page rebuild
   - Test 10: Full Avi → Page-Builder → Agent workflow

2. **Screenshot Validation**
   - Capture before/after for each test
   - Validate UI rendering correctness
   - Verify error message display

3. **Performance Validation**
   - Measure data binding resolution time
   - Test with 100+ data points
   - Validate caching effectiveness

**Files Created**:
- `/frontend/tests/e2e/integration/dynamic-ui-integration.spec.ts` (new - 10+ tests)
- `/frontend/tests/e2e/integration/personal-todos-dashboard.spec.ts` (new)
- `/frontend/tests/e2e/integration/avi-coordination.spec.ts` (new)

---

## Technical Architecture

### Current Architecture (Problem)
```
Agent → Create Page JSON → Embed Data in Components → Store → Render
                              ↑ PROBLEM: Data embedded
```

### Target Architecture (Solution)
```
Agent Request → Avi Coordination → Page-Builder Agent
                                        ↓
                            Use Template + Create Bindings
                                        ↓
                            Store Page Spec (structure only)
                                        ↓
Frontend: Fetch Page Spec → Fetch Data → Resolve Bindings → Render
```

### Data Binding Flow
```
1. Page Spec with Bindings:
{
  "dataSource": "/api/agents/personal-todos-agent/data",
  "layout": [
    {
      "type": "stat",
      "config": {
        "label": "Total Tasks",
        "value": "{{data.totalTasks}}"  ← Binding
      }
    }
  ]
}

2. Frontend Resolution:
- Fetch page spec
- Parse dataSource field
- Fetch data from dataSource API
- Replace {{data.totalTasks}} with actual value (e.g., "42")
- Render component with resolved value

3. Data Update:
- Agent updates tasks.json
- Data API returns new value
- Frontend re-fetches data
- Bindings re-resolve automatically
- No page rebuild needed
```

---

## Testing Strategy

### Unit Tests (40+ tests)
**Phase 1 - Data Binding** (15 tests):
- Parse `{{data.variable}}` syntax
- Resolve nested bindings `{{data.user.name}}`
- Handle missing variables gracefully
- Validate data source URLs
- Test caching mechanisms

**Phase 3 - Avi Coordination** (8 tests):
- Detect trigger phrases
- Route to correct agent
- Assemble context correctly
- Track progress states

**Phase 4 - Agent Data APIs** (7 tests):
- API returns correct structure
- Error handling for missing data
- Data aggregation logic
- Cache invalidation

**General** (10+ tests):
- Schema validation
- Error handling
- Edge cases

### Integration Tests (15+ tests)
**Phase 2 - Page-Builder** (10 tests):
- Template API integration
- Component validation flow
- Data binding creation
- Full page creation workflow

**Phase 4 - Personal-Todos** (7 tests):
- End-to-end data flow
- Page-data separation
- Live updates without rebuild

### E2E Tests (10+ tests with Playwright)
**Full System Validation**:
- User requests page via Avi
- Avi routes to page-builder
- Page-builder creates with template
- Dashboard renders with live data
- Data updates reflect immediately
- Structure updates preserve data

**Screenshot Validation**:
- Before/after comparisons
- Error message display
- Responsive rendering

---

## Risk Mitigation

### Risk 1: Breaking Existing Pages
**Mitigation**:
- Implement backward compatibility layer
- Pages without `dataSource` use embedded data (legacy mode)
- Gradual migration with validation

**Validation**:
- Test all existing pages render correctly
- Add legacy mode detection tests

### Risk 2: Data Binding Performance
**Mitigation**:
- Implement caching for data API responses
- Use React Query or SWR for optimized fetching
- Add loading states

**Validation**:
- Performance tests with 100+ bindings
- Measure resolution time < 50ms

### Risk 3: Agent Adoption Complexity
**Mitigation**:
- Provide clear examples (personal-todos)
- Document patterns extensively
- Create templates for common cases

**Validation**:
- Documentation completeness review
- Example coverage of 80%+ use cases

### Risk 4: Coordination Complexity
**Mitigation**:
- Start with simple trigger phrases
- Add complexity incrementally
- Clear error messages

**Validation**:
- Test coordination with multiple agents
- Validate error handling

---

## Dependencies

### NPM Packages (Already Installed)
- `zod` - Runtime validation ✅
- `react-query` or `swr` - Data fetching (optional, for optimization)
- `playwright` - E2E testing ✅

### Existing Systems (Working)
- Dynamic UI System (validation, templates, catalog) ✅
- Page storage and rendering ✅
- Agent feed posting ✅

### New Requirements
- Agent data APIs (each agent implements)
- Data binding resolver (frontend)
- Coordination protocol (Avi)

---

## Verification Checklist

### Phase 1: Data Binding
- [ ] Data binding parser correctly extracts variables
- [ ] Bindings resolve with real data from APIs
- [ ] Missing variables handled gracefully
- [ ] 15/15 unit tests passing
- [ ] No console errors

### Phase 2: Page-Builder
- [ ] Page-builder-agent.md updated with Dynamic UI integration
- [ ] Template API used in page creation
- [ ] Zod validation applied to all components
- [ ] Data bindings created instead of embedded data
- [ ] 10/10 integration tests passing

### Phase 3: Avi Coordination
- [ ] CLAUDE.md updated with routing rules
- [ ] Trigger phrases detected correctly
- [ ] Routing to page-builder works
- [ ] Progress tracked and user notified
- [ ] 8/8 unit tests passing

### Phase 4: Personal-Todos
- [ ] Data API implemented at `/api/agents/personal-todos-agent/data`
- [ ] Dashboard created with todoManager template
- [ ] Data bindings resolve to live task data
- [ ] Task updates reflect without page rebuild
- [ ] 7/7 integration tests passing

### Phase 5: E2E Validation
- [ ] 10/10 E2E tests passing
- [ ] Screenshots captured for all tests
- [ ] No console errors in browser
- [ ] Performance metrics within targets
- [ ] 100% real functionality (no mocks)

---

## Timeline

| Phase | Duration | Dependencies | Agent Type |
|-------|----------|--------------|------------|
| Phase 1 | 8-10 hours | None | Backend-dev, Coder |
| Phase 2 | 4-6 hours | Phase 1 | Researcher, Coder |
| Phase 3 | 3-4 hours | Phase 2 | Researcher, Coder |
| Phase 4 | 6-8 hours | Phase 1, 2, 3 | Backend-dev, Coder |
| Phase 5 | 4-6 hours | All phases | Tester, Production-validator |
| **Total** | **25-34 hours** | Sequential | Swarm of 4-5 agents |

**Concurrent Execution**: Use Claude-Flow Swarm to run 4 agents in parallel (researcher, backend-dev, coder, tester) to reduce total time to ~12-16 hours.

---

## Success Definition

The Dynamic UI Integration is successful when:

1. **All 65+ tests pass** (40 unit + 15 integration + 10 E2E)
2. **Personal-todos dashboard works** with live data updates
3. **Avi routes requests** to page-builder-agent correctly
4. **Page-builder uses templates** for all new pages
5. **Data bindings resolve** in real-time without page rebuilds
6. **Zero console errors** in production validation
7. **100% real functionality** - no mocks, stubs, or simulations
8. **Screenshots validate** correct rendering and error handling

---

**Status**: Ready for Implementation with Claude-Flow Swarm
**Methodology**: SPARC + TDD + Concurrent Agent Execution + Playwright E2E
**Validation**: 100% Real Functionality Required
