# Master-Detail Layout TDD Test Plan

**Project**: Agent Feed
**Feature**: Master-Detail Agents Layout
**Methodology**: London School TDD (Test-Driven Development)
**Status**: All Tests Written (RED) - Implementation Pending

---

## Executive Summary

This document outlines a comprehensive Test-Driven Development (TDD) test suite for the master-detail agents layout. Following the London School TDD methodology, all tests have been written BEFORE implementation, using test doubles (mocks/stubs) for dependencies. All tests are currently **RED** (failing) and will guide the implementation process.

---

## Test Files Created

### 1. Unit Tests

#### `/frontend/src/tests/unit/agent-list-sidebar.test.tsx`
**Component Under Test**: `AgentListSidebar`
**Test Count**: 60+ test cases
**Coverage Areas**:
- Basic rendering and display
- Agent selection and highlighting
- Click interaction handlers
- Search and filtering
- Empty and loading states
- Keyboard navigation (arrow keys)
- Accessibility (ARIA labels, roles)
- Performance optimization
- Virtualization for large lists

**Key Test Scenarios**:
```typescript
✓ should render all agents in the list
✓ should highlight the selected agent
✓ should call onSelectAgent when clicking an agent
✓ should filter agents by name (case-insensitive)
✓ should show empty state when no agents are provided
✓ should show loading indicator when loading is true
✓ should select next agent on arrow down key
✓ should have proper ARIA labels on agent items
✓ should use virtualization for long lists
```

---

#### `/frontend/src/tests/unit/master-detail-layout.test.tsx`
**Component Under Test**: `IsolatedRealAgentManager` (Master-Detail Mode)
**Test Count**: 70+ test cases
**Coverage Areas**:
- Master-detail layout structure
- Default agent selection (first agent)
- Detail panel updates on selection
- URL synchronization
- Search across sidebar
- WebSocket real-time updates
- Button visibility rules
- Loading and error states
- Cleanup on unmount
- Responsive behavior
- Accessibility

**Key Test Scenarios**:
```typescript
✓ should render sidebar + detail panel layout
✓ should select first agent by default when no agent in URL
✓ should update detail panel when agent is selected from sidebar
✓ should update URL when agent is selected
✓ should filter agents in sidebar based on search term
✓ should setup WebSocket listener on mount
✓ should NOT render Home/Details/Trash buttons in master-detail mode
✓ should show loading indicator while fetching agents
✓ should call destroy on API service when unmounting
✓ should have proper landmark roles (navigation, main)
```

---

#### `/frontend/src/tests/unit/working-agent-profile-embedded.test.tsx`
**Component Under Test**: `WorkingAgentProfile` (Embedded Mode)
**Test Count**: 55+ test cases
**Coverage Areas**:
- Agent data rendering
- Tab navigation (Overview, Pages, Activities, Performance, Capabilities)
- No back button in embedded mode
- Missing data handling
- Tab content display
- Loading states
- Error handling
- Accessibility
- Performance

**Key Test Scenarios**:
```typescript
✓ should display agent name from display_name field
✓ should NOT display back button in embedded mode
✓ should render all tab buttons (5 tabs)
✓ should show Overview tab as active by default
✓ should switch to Pages tab when clicked
✓ should display all agent capabilities
✓ should show error state when agent not found
✓ should show loading skeleton initially
✓ should have proper heading hierarchy
✓ should render quickly with complete agent data
```

---

### 2. End-to-End Tests

#### `/frontend/tests/e2e/master-detail-agents.spec.ts`
**Test Environment**: Playwright
**Test Count**: 50+ test cases
**Coverage Areas**:
- Initial layout load
- Agent selection interaction
- Search functionality
- URL navigation and deep linking
- Browser back/forward buttons
- Button visibility
- Responsive design (desktop/mobile)
- Visual regression (screenshots)
- Error handling
- Performance metrics
- Accessibility
- Console error monitoring

**Key Test Scenarios**:
```typescript
✓ should display master-detail layout on load
✓ should auto-select first agent
✓ should update detail panel when clicking different agent
✓ should filter agents when searching
✓ should navigate to specific agent via URL
✓ should handle browser back button
✓ should NOT show Home/Details/Trash buttons
✓ should adapt layout for mobile viewport
✓ should match master-detail layout screenshot
✓ should load layout within acceptable time (<5s)
✓ should not log console errors during normal operation
```

---

## Test Coverage Summary

### By Component

| Component | Unit Tests | E2E Tests | Total Coverage |
|-----------|-----------|-----------|----------------|
| AgentListSidebar | 60+ | N/A | Comprehensive |
| IsolatedRealAgentManager | 70+ | 50+ | Complete |
| WorkingAgentProfile | 55+ | Included in integration | Complete |
| **Total** | **185+** | **50+** | **235+ tests** |

### By Feature Area

| Feature | Test Coverage | Status |
|---------|--------------|--------|
| Layout Structure | ✅ Complete | RED |
| Agent Selection | ✅ Complete | RED |
| Search/Filter | ✅ Complete | RED |
| URL Sync | ✅ Complete | RED |
| WebSocket Updates | ✅ Complete | RED |
| Keyboard Navigation | ✅ Complete | RED |
| Accessibility | ✅ Complete | RED |
| Responsive Design | ✅ Complete | RED |
| Error Handling | ✅ Complete | RED |
| Performance | ✅ Complete | RED |

---

## Test Methodology: London School TDD

### Principles Applied

1. **Test Doubles**: All external dependencies are mocked
   - API Service: `vi.mock('../../services/apiServiceIsolated')`
   - Child Components: Mocked for isolation
   - Router: `MemoryRouter` for URL testing

2. **Test Structure**: Arrange-Act-Assert
   ```typescript
   // Arrange
   renderWithRouter(<Component />);

   // Act
   fireEvent.click(element);

   // Assert
   expect(result).toBe(expected);
   ```

3. **Test Independence**: Each test is isolated
   - `beforeEach()` resets all mocks
   - No shared state between tests
   - Tests can run in any order

4. **Behavior Focus**: Tests verify behavior, not implementation
   - Tests what users see/do
   - Not how code is structured internally

---

## Expected Test Results (Current State)

### Unit Tests - Vitest

```bash
npm run test:unit

Expected Output:
❌ FAIL src/tests/unit/agent-list-sidebar.test.tsx
  ● AgentListSidebar - TDD Unit Tests
    ✗ should render the sidebar container
    ✗ should render all agents in the list
    ... (60+ failures)

❌ FAIL src/tests/unit/master-detail-layout.test.tsx
  ● IsolatedRealAgentManager - Master-Detail Mode
    ✗ should render sidebar and detail panel in split layout
    ✗ should select first agent by default
    ... (70+ failures)

❌ FAIL src/tests/unit/working-agent-profile-embedded.test.tsx
  ● WorkingAgentProfile - Embedded Mode
    ✗ should render the component without errors
    ✗ should NOT display back button
    ... (55+ failures)

Test Suites: 3 failed, 3 total
Tests:       185+ failed, 185+ total
```

### E2E Tests - Playwright

```bash
npx playwright test tests/e2e/master-detail-agents.spec.ts

Expected Output:
❌ FAIL tests/e2e/master-detail-agents.spec.ts
  ● Master-Detail Agents Layout - E2E
    ✗ should display master-detail layout on load
    ✗ should show sidebar with agent list
    ... (50+ failures)

Test Suites: 1 failed, 1 total
Tests:       50+ failed, 50+ total
```

---

## Running the Tests

### Prerequisites

```bash
cd /workspaces/agent-feed/frontend
npm install
```

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npx vitest src/tests/unit/agent-list-sidebar.test.tsx

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### E2E Tests

```bash
# Install Playwright browsers
npx playwright install

# Run all E2E tests
npx playwright test

# Run specific test
npx playwright test tests/e2e/master-detail-agents.spec.ts

# Run with UI
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

---

## Implementation Roadmap

### Phase 1: AgentListSidebar Component

**File**: `/frontend/src/components/AgentListSidebar.tsx`

**Required Props**:
```typescript
interface AgentListSidebarProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  loading?: boolean;
}
```

**Implementation Checklist**:
- [ ] Render agent list with avatars
- [ ] Implement selection highlighting
- [ ] Add click handlers
- [ ] Build search input with clear button
- [ ] Create empty state component
- [ ] Create loading skeleton
- [ ] Add keyboard navigation (ArrowUp/ArrowDown)
- [ ] Implement virtualization for 100+ agents
- [ ] Add ARIA attributes (role="listbox", role="option")
- [ ] Test and verify all 60+ tests pass

---

### Phase 2: Master-Detail Layout

**File**: `/frontend/src/components/IsolatedRealAgentManager.tsx` (update)

**Implementation Checklist**:
- [ ] Restructure to flex layout (sidebar + detail)
- [ ] Integrate AgentListSidebar component
- [ ] Auto-select first agent on mount
- [ ] Sync selectedAgentId with URL params
- [ ] Update detail panel on selection
- [ ] Remove Home/Details/Trash buttons
- [ ] Keep Refresh button
- [ ] Handle search filtering
- [ ] Maintain WebSocket listeners
- [ ] Add responsive breakpoints
- [ ] Add mobile sidebar toggle
- [ ] Test and verify all 70+ tests pass

---

### Phase 3: Embedded Agent Profile

**File**: `/frontend/src/components/WorkingAgentProfile.tsx` (update)

**Implementation Checklist**:
- [ ] Remove back button (embedded mode)
- [ ] Fetch agent data from URL param
- [ ] Render all 5 tabs
- [ ] Implement tab switching
- [ ] Display agent info in Overview
- [ ] Load RealDynamicPagesTab in Pages tab
- [ ] Show empty states for Activities/Performance
- [ ] Display capabilities as cards
- [ ] Handle loading states
- [ ] Handle error states (404, 500)
- [ ] Add proper ARIA labels
- [ ] Test and verify all 55+ tests pass

---

### Phase 4: E2E Validation

**After implementation**:
- [ ] Run full E2E test suite
- [ ] Verify all 50+ E2E tests pass
- [ ] Capture screenshots for visual regression
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test mobile responsive layout
- [ ] Validate accessibility with screen reader
- [ ] Performance testing (load time <5s, switch time <500ms)
- [ ] Console error monitoring

---

## Success Criteria

### All Tests GREEN ✅

```bash
✓ Unit Tests: 185+ passed
✓ E2E Tests: 50+ passed
✓ Total: 235+ passed
✓ Coverage: >80% across all files
✓ Performance: Layout loads <5s, agent switch <500ms
✓ Accessibility: ARIA compliant, keyboard navigable
✓ No console errors
```

---

## Test Maintenance Guidelines

### Adding New Tests

1. Follow existing test structure
2. Use descriptive test names: `should <expected behavior> when <condition>`
3. Keep tests independent (no shared state)
4. Mock all external dependencies
5. Test behavior, not implementation

### Updating Tests

1. Run tests after any component changes
2. Update test doubles if API contracts change
3. Add new tests for new features
4. Remove obsolete tests
5. Keep coverage above 80%

### Test Debugging

```bash
# Run single test
npx vitest -t "should render the sidebar container"

# Debug mode
npx vitest --inspect-brk

# Show full error stack
npx vitest --reporter=verbose
```

---

## Dependencies and Mocks

### Test Libraries

- **Vitest**: Unit test runner
- **React Testing Library**: Component testing
- **Playwright**: E2E testing
- **@testing-library/jest-dom**: DOM matchers

### Mocked Services

```typescript
// API Service
vi.mock('../../services/apiServiceIsolated', () => ({
  createApiService: vi.fn(() => ({
    getAgents: vi.fn().mockResolvedValue({ /* mock data */ }),
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn()
  }))
}));

// Router
vi.mock('../../components/RouteWrapper', () => ({
  useRoute: () => ({
    routeKey: 'test-route',
    registerCleanup: vi.fn()
  })
}));
```

---

## Test Data

### Mock Agent

```typescript
const mockAgent: Agent = {
  id: 'agent-1',
  slug: 'code-assistant',
  name: 'Code Assistant',
  display_name: 'Code Assistant',
  description: 'Helps with coding tasks',
  avatar_color: '#3B82F6',
  capabilities: ['coding', 'debugging'],
  status: 'active',
  // ... full Agent interface
};
```

### Mock API Responses

```typescript
// Success response
{
  success: true,
  agents: [mockAgent1, mockAgent2],
  totalAgents: 2
}

// Error response
{
  success: false,
  error: 'Failed to load agents'
}
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:unit

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npx playwright install
      - run: npx playwright test
```

---

## Accessibility Compliance

### WCAG 2.1 Level AA

- ✅ Keyboard navigation (Tab, Arrow keys)
- ✅ ARIA landmarks (navigation, main)
- ✅ ARIA roles (listbox, option, tab, tabpanel)
- ✅ Focus indicators
- ✅ Screen reader announcements
- ✅ Color contrast ratios
- ✅ Semantic HTML

---

## Performance Benchmarks

| Metric | Target | Test Coverage |
|--------|--------|---------------|
| Initial Layout Load | <5s | ✅ E2E test |
| Agent Selection Switch | <500ms | ✅ E2E test |
| Search Filter | <100ms | ✅ Unit test |
| Large List Render (100 agents) | <100ms | ✅ Unit test |
| Virtualization | Render only visible | ✅ Unit test |

---

## Visual Regression Testing

### Screenshots Captured

1. `master-detail-layout.png` - Full layout
2. `agent-sidebar.png` - Sidebar component
3. `agent-detail-panel.png` - Detail panel
4. `agent-selected-state.png` - Selected agent highlight
5. `master-detail-mobile.png` - Mobile responsive layout

### Comparison Tools

- Playwright built-in screenshot comparison
- Manual review for first implementation
- Automated comparison in CI/CD pipeline

---

## Known Limitations

1. **Component Not Yet Created**: `AgentListSidebar` is a new component
2. **Mock Implementation**: Tests include placeholder mock component
3. **Visual Tests**: Screenshot comparison requires baseline images
4. **Real API**: E2E tests require running backend server

---

## Next Steps

1. ✅ **Complete**: TDD test suite written
2. 🔄 **In Progress**: Implementation phase
3. ⏳ **Pending**: Run tests and verify all pass
4. ⏳ **Pending**: Visual regression baseline
5. ⏳ **Pending**: CI/CD integration

---

## Appendix

### Test File Locations

```
/workspaces/agent-feed/frontend/
├── src/tests/unit/
│   ├── agent-list-sidebar.test.tsx (NEW)
│   ├── master-detail-layout.test.tsx (NEW)
│   └── working-agent-profile-embedded.test.tsx (NEW)
└── tests/e2e/
    └── master-detail-agents.spec.ts (NEW)
```

### Component File Locations

```
/workspaces/agent-feed/frontend/src/components/
├── AgentListSidebar.tsx (TO BE CREATED)
├── IsolatedRealAgentManager.tsx (TO BE UPDATED)
└── WorkingAgentProfile.tsx (TO BE UPDATED)
```

---

## Contact & Support

For questions about this test plan:
- Review test files for implementation details
- Check inline test comments for specific behavior expectations
- Run tests with `--verbose` flag for detailed output

---

**Document Version**: 1.0
**Last Updated**: 2025-01-30
**Status**: Test Suite Complete - Ready for Implementation
**Total Test Count**: 235+ tests
**Current State**: All RED (Expected - TDD Methodology)
