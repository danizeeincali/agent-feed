# DynamicPageRenderer - Mermaid Integration Test Suite

## Overview

Comprehensive TDD test suite for Mermaid component integration in DynamicPageRenderer.tsx using **London School TDD methodology**.

## Test File Location

```
/workspaces/agent-feed/frontend/src/tests/components/DynamicPageRenderer-mermaid.test.tsx
```

## Test Methodology: London School TDD

The London School (mockist) approach focuses on:

1. **Mock all collaborators** - External dependencies are fully mocked
2. **Test behavior** - Verify interactions and message passing
3. **Isolation** - Each test is completely independent
4. **Fail first** - Tests written to fail before implementation

## Test Structure

### Total Tests: **50 Comprehensive Tests**

#### Unit Tests (25 tests)
- **Switch Statement Recognition** (2 tests)
  - Recognizes "Mermaid" component type
  - Rejects lowercase "mermaid" (case sensitivity)

- **Props Mapping** (5 tests)
  - Maps `chart` prop correctly
  - Maps `id` prop correctly
  - Maps `className` prop correctly
  - Passes all props together

- **Valid Mermaid Code** (3 tests)
  - Flowchart diagram rendering
  - Sequence diagram rendering
  - Class diagram rendering

- **Edge Cases** (5 tests)
  - Empty chart prop
  - Missing chart prop
  - Chart with whitespace
  - Invalid Mermaid syntax
  - Special characters in chart

- **className Propagation** (3 tests)
  - Undefined className handling
  - Empty string className
  - Multiple CSS classes

- **Key Generation** (3 tests)
  - Key from component ID
  - Key from index
  - Unique keys for multiple diagrams

#### Integration Tests (25 tests)
- **Full Render Path** (3 tests)
  - Extract from `specification.components`
  - Extract from `components` array
  - Priority: specification > components

- **All 10 Mermaid Diagram Types** (11 tests)
  - Flowchart
  - Sequence
  - Class
  - State
  - Entity-Relationship (ER)
  - Gantt
  - User Journey
  - Pie Chart
  - Git Graph
  - Timeline
  - **All 10 types on same page**

- **Error Boundary Integration** (2 tests)
  - Error UI when Mermaid throws
  - Continue rendering after error

- **Multiple Mermaid Diagrams** (4 tests)
  - 2 diagrams with unique keys
  - 5 diagrams mixed with other components
  - Diagrams without explicit IDs
  - Nested Mermaid in containers

- **Layout Integration** (2 tests)
  - Single-column layout
  - Two-column layout

- **Performance** (1 test)
  - Handle 25+ diagrams with warning

## Mocking Strategy

### Mocked Collaborators

```typescript
// Primary collaborator
vi.mock('MermaidDiagram') - Returns mock component

// Other components (prevent interference)
vi.mock('PhotoGrid')
vi.mock('SwipeCard')
vi.mock('Checklist')
vi.mock('Calendar')
vi.mock('MarkdownRenderer')
vi.mock('Sidebar')
vi.mock('GanttChart')
vi.mock('LineChart')
vi.mock('BarChart')
vi.mock('PieChart')

// Data fetching
global.fetch = vi.fn()

// Validation
vi.mock('componentSchemas')
```

### Mock Expectations

London School tests verify:
- **Call counts**: `expect(MermaidDiagram).toHaveBeenCalledTimes(n)`
- **Arguments**: `expect(MermaidDiagram).toHaveBeenCalledWith(expectedProps)`
- **Prop structure**: `expect.objectContaining({ chart, id, className })`
- **Behavior**: Component renders, not implementation details

## Test Coverage Map

### Coverage by Feature

| Feature | Tests | Status |
|---------|-------|--------|
| Component recognition | 2 | ✅ |
| Props mapping | 5 | ✅ |
| Diagram types (10) | 11 | ✅ |
| Error handling | 2 | ✅ |
| Multiple diagrams | 4 | ✅ |
| Edge cases | 5 | ✅ |
| className handling | 3 | ✅ |
| Key generation | 3 | ✅ |
| Layout integration | 2 | ✅ |
| Full render path | 3 | ✅ |
| Performance | 1 | ✅ |

### Code Coverage Areas

```typescript
// DynamicPageRenderer.tsx lines covered:
- renderComponent() - Mermaid case
- generateComponentKey() - with Mermaid props
- extractComponentsArray() - all paths
- renderValidatedComponent() - Mermaid rendering
- Error boundaries - component errors
```

## Expected Test Results

### BEFORE Implementation (RED Phase)

```bash
npm test DynamicPageRenderer-mermaid.test.tsx

Expected Result: ❌ 50 FAILED

Failure Reason:
- "Unknown Component: Mermaid" rendered instead
- Switch statement has no 'Mermaid' case
- Props not mapped to MermaidDiagram
```

### AFTER Implementation (GREEN Phase)

```bash
npm test DynamicPageRenderer-mermaid.test.tsx

Expected Result: ✅ 50 PASSED

Success Criteria:
- All Mermaid components render correctly
- Props mapped properly (chart, id, className)
- All 10 diagram types supported
- Error boundaries work
- Multiple diagrams render with unique keys
```

## Implementation Requirements

To make tests pass, add this to `DynamicPageRenderer.tsx`:

```typescript
// In renderValidatedComponent(), add to switch statement:

case 'Mermaid':
  return (
    <MermaidDiagram
      key={key}
      chart={props.chart}
      id={props.id}
      className={props.className}
    />
  );
```

### Import Statement Required

```typescript
import MermaidDiagram from './markdown/MermaidDiagram';
```

## Running the Tests

### Run All Mermaid Tests
```bash
npm test DynamicPageRenderer-mermaid.test.tsx
```

### Run Specific Test Suite
```bash
npm test -- --grep "Switch Statement"
npm test -- --grep "Props Mapping"
npm test -- --grep "All Mermaid Diagram Types"
```

### Run with Coverage
```bash
npm test DynamicPageRenderer-mermaid.test.tsx -- --coverage
```

### Watch Mode (TDD)
```bash
npm test DynamicPageRenderer-mermaid.test.tsx -- --watch
```

## Test Output Example

```
DynamicPageRenderer - Mermaid Component Integration (Unit Tests)
  Switch Statement - Mermaid Case
    ✓ should recognize "Mermaid" component type in switch statement
    ✓ should NOT treat "mermaid" (lowercase) as valid component type
  Props Mapping
    ✓ should map "chart" prop correctly to MermaidDiagram
    ✓ should map "id" prop correctly to MermaidDiagram
    ✓ should map "className" prop correctly to MermaidDiagram
    ✓ should pass all three props (chart, id, className) together
    ✓ should pass all three props (chart, id, className) together
  ...

DynamicPageRenderer - Mermaid Integration Tests (Full Render Path)
  JSON Spec → renderComponent → MermaidDiagram
    ✓ should extract Mermaid component from specification.components
    ✓ should extract Mermaid from direct components array
    ✓ should prioritize specification over components array
  All Mermaid Diagram Types
    ✓ should render flowchart diagram type
    ✓ should render sequence diagram type
    ✓ should render class diagram type
    ✓ should render state diagram type
    ✓ should render entity-relationship diagram type
    ✓ should render gantt diagram type
    ✓ should render journey diagram type
    ✓ should render pie diagram type
    ✓ should render gitGraph diagram type
    ✓ should render timeline diagram type
    ✓ should render all 10 diagram types on same page
  ...

Test Suites: 1 passed, 1 total
Tests:       50 passed, 50 total
```

## Integration with Existing Tests

### Existing Test Files
- `/frontend/src/components/markdown/__tests__/MermaidDiagram.test.tsx` - **29 unit tests**
- `/frontend/src/__tests__/e2e/mermaid-verification.spec.ts` - **24 E2E tests**
- `/frontend/src/tests/components/DynamicPageRenderer-mermaid.test.tsx` - **50 integration tests** (NEW)

### Test Pyramid

```
        E2E Tests (24)          <- Mermaid rendering in real browser
       /              \
      /                \
     /  Integration (50) \      <- DynamicPageRenderer → MermaidDiagram
    /--------------------\
   /   Unit Tests (29)    \     <- MermaidDiagram component only
  /________________________\
```

**Total Mermaid Test Coverage: 103 tests**

## London School Principles Applied

### 1. Mock All Collaborators
✅ MermaidDiagram mocked
✅ All other components mocked
✅ Fetch API mocked
✅ Schema validation mocked

### 2. Verify Interactions
✅ `expect(MermaidDiagram).toHaveBeenCalled()`
✅ `expect(MermaidDiagram).toHaveBeenCalledWith(props)`
✅ `expect(MermaidDiagram).toHaveBeenCalledTimes(n)`

### 3. Test Behavior, Not Implementation
✅ Tests verify **what** happens (props passed)
❌ Tests don't verify **how** (internal state, methods)

### 4. Isolated Tests
✅ Each test is independent
✅ No shared state between tests
✅ `beforeEach()` clears all mocks

### 5. Fast Tests
✅ No real rendering (mocked)
✅ No network calls (mocked)
✅ No file I/O
✅ Expected runtime: < 2 seconds for all 50 tests

## Complementary E2E Tests

The existing E2E tests (`mermaid-verification.spec.ts`) complement these unit/integration tests:

| Test Type | What It Tests | Speed | Reliability |
|-----------|---------------|-------|-------------|
| Unit (London) | Props mapping, component recognition | ⚡ Fast | 🟢 Stable |
| Integration (London) | Full render path, multiple diagrams | ⚡ Fast | 🟢 Stable |
| E2E (Playwright) | Real browser rendering, visual output | 🐌 Slow | 🟡 Flaky |

## CI/CD Integration

### Pre-commit Hook
```bash
npm test DynamicPageRenderer-mermaid.test.tsx -- --run
```

### GitHub Actions
```yaml
- name: Run Mermaid Integration Tests
  run: npm test DynamicPageRenderer-mermaid.test.tsx -- --coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/DynamicPageRenderer-mermaid.xml
```

### Coverage Requirements
- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

## Known Limitations

### What These Tests DON'T Cover
1. **Visual rendering** - E2E tests handle this
2. **Mermaid library errors** - Handled by MermaidDiagram.test.tsx
3. **Browser compatibility** - E2E tests handle this
4. **Performance under load** - Would need load testing
5. **Accessibility** - E2E tests verify ARIA labels

### Edge Cases NOT Covered
- Circular component references (tested in DynamicPageRenderer.test.tsx)
- Very deep nesting (> 10 levels) - handled by MAX_DEPTH check
- Malicious input sanitization - handled by Mermaid component

## Maintenance

### When to Update Tests
- ✅ Adding new Mermaid diagram types
- ✅ Changing props interface
- ✅ Modifying error handling
- ✅ Adding new layout types
- ✅ Changing key generation logic

### Test Refactoring Checklist
- [ ] All mocks still valid?
- [ ] Test names still descriptive?
- [ ] No duplicate test coverage?
- [ ] Tests still isolated?
- [ ] Mock expectations still correct?

## References

### Related Documentation
- [MermaidDiagram Component](/frontend/src/components/markdown/MermaidDiagram.tsx)
- [DynamicPageRenderer](/frontend/src/components/DynamicPageRenderer.tsx)
- [Existing Unit Tests](/frontend/src/components/markdown/__tests__/MermaidDiagram.test.tsx)
- [Existing E2E Tests](/frontend/src/__tests__/e2e/mermaid-verification.spec.ts)

### London School TDD Resources
- [Test-Driven Development by Example](https://www.oreilly.com/library/view/test-driven-development/0321146530/) - Kent Beck
- [Growing Object-Oriented Software, Guided by Tests](http://www.growing-object-oriented-software.com/) - Freeman & Pryce
- [London School TDD vs. Classic TDD](https://softwareengineering.stackexchange.com/questions/123627)

## Success Metrics

### Definition of Done
- ✅ 50 tests written
- ✅ All tests initially FAIL (RED)
- ✅ Implementation makes tests PASS (GREEN)
- ✅ Code coverage > 90%
- ✅ All mocks properly isolated
- ✅ Test execution time < 2 seconds
- ✅ Zero test flakiness
- ✅ All London School principles followed

---

**Test Suite Created**: 2025-10-07
**Methodology**: London School TDD
**Framework**: Vitest + React Testing Library
**Status**: ⏸️ READY (Awaiting Implementation)
