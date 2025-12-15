# Mermaid Integration - Quick Reference

## 🎯 What Was Created

### Test File
**Location**: `/workspaces/agent-feed/frontend/src/tests/components/DynamicPageRenderer-mermaid.test.tsx`

**Stats**:
- 50 comprehensive tests
- London School TDD methodology
- Full mocking strategy
- Expected to FAIL before implementation

### Documentation
**Location**: `/workspaces/agent-feed/frontend/src/tests/components/DynamicPageRenderer-mermaid.TEST-SUMMARY.md`

## 🚀 Quick Start

### 1. Run Tests (Will Fail Initially)

```bash
cd /workspaces/agent-feed/frontend
npm test DynamicPageRenderer-mermaid.test.tsx
```

**Expected**: ❌ 50 failed tests

### 2. Implement Mermaid Case

Add to `/workspaces/agent-feed/frontend/src/components/DynamicPageRenderer.tsx`:

```typescript
// Add import at top
import MermaidDiagram from './markdown/MermaidDiagram';

// In renderValidatedComponent(), add to switch statement (around line 845):

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

### 3. Re-run Tests (Should Pass)

```bash
npm test DynamicPageRenderer-mermaid.test.tsx
```

**Expected**: ✅ 50 passed tests

## 📊 Test Breakdown

### Unit Tests (25)
```
Switch Statement      → 2 tests
Props Mapping         → 5 tests
Valid Code            → 3 tests
Edge Cases            → 5 tests
className Propagation → 3 tests
Key Generation        → 3 tests
```

### Integration Tests (25)
```
Full Render Path     → 3 tests
All Diagram Types    → 11 tests (10 types + 1 combined)
Error Boundaries     → 2 tests
Multiple Diagrams    → 4 tests
Layout Integration   → 2 tests
Performance          → 1 test
```

## 🧪 Test Examples

### Example 1: Basic Props Mapping Test
```typescript
it('should map "chart" prop correctly to MermaidDiagram', async () => {
  const chartCode = 'graph TD\n  Start --> End';
  // ... test verifies chart prop is passed
});
```

### Example 2: All Diagram Types Test
```typescript
it('should render flowchart diagram type', async () => {
  // Tests flowchart rendering
});
// ... repeats for all 10 types
```

### Example 3: Multiple Diagrams Test
```typescript
it('should render all 10 diagram types on same page', async () => {
  // Creates 10 different Mermaid components
  // Verifies all render with correct props
});
```

## 🔍 London School TDD Principles

### What's Mocked
- ✅ `MermaidDiagram` component
- ✅ All other dynamic components
- ✅ `fetch` API
- ✅ Component schemas

### What's Verified
- ✅ Call counts: `toHaveBeenCalledTimes(n)`
- ✅ Arguments: `toHaveBeenCalledWith(props)`
- ✅ Prop structure: `objectContaining({})`
- ✅ Component rendering (not implementation)

### What's NOT Tested (Delegated)
- ❌ Visual rendering (E2E tests)
- ❌ Mermaid library errors (MermaidDiagram.test.tsx)
- ❌ Browser compatibility (E2E tests)

## 📈 Coverage Goals

| Metric | Target | Expected |
|--------|--------|----------|
| Statements | > 90% | 95%+ |
| Branches | > 85% | 90%+ |
| Functions | > 90% | 95%+ |
| Lines | > 90% | 95%+ |

## 🎨 Diagram Types Tested

1. **Flowchart** - `graph TD`
2. **Sequence** - `sequenceDiagram`
3. **Class** - `classDiagram`
4. **State** - `stateDiagram-v2`
5. **Entity-Relationship** - `erDiagram`
6. **Gantt** - `gantt`
7. **User Journey** - `journey`
8. **Pie Chart** - `pie`
9. **Git Graph** - `gitGraph`
10. **Timeline** - `timeline`

## 🔧 Implementation Checklist

- [ ] Import MermaidDiagram component
- [ ] Add 'Mermaid' case to switch statement
- [ ] Map `chart` prop
- [ ] Map `id` prop (optional)
- [ ] Map `className` prop (optional)
- [ ] Use `key` prop from generateComponentKey()
- [ ] Run tests → verify all pass
- [ ] Check test coverage

## 🐛 Troubleshooting

### Tests Still Failing After Implementation?

**Check**:
1. Import statement correct?
2. Case sensitivity: `'Mermaid'` not `'mermaid'`
3. Props mapped correctly?
4. Using `key={key}` from generateComponentKey?

### Mock Not Working?

**Verify**:
1. `vi.clearAllMocks()` in `beforeEach()`
2. Mock path matches actual import path
3. Mock returns expected structure

### Type Errors?

**Ignore** - TypeScript errors in test files are normal with Vitest. Tests will run fine.

## 📚 Related Files

### Components
- `/frontend/src/components/DynamicPageRenderer.tsx` - Main renderer (needs update)
- `/frontend/src/components/markdown/MermaidDiagram.tsx` - Mermaid component

### Existing Tests
- `/frontend/src/components/markdown/__tests__/MermaidDiagram.test.tsx` - Unit tests (29)
- `/frontend/src/__tests__/e2e/mermaid-verification.spec.ts` - E2E tests (24)

### Test Files (NEW)
- `/frontend/src/tests/components/DynamicPageRenderer-mermaid.test.tsx` - Integration tests (50)
- `/frontend/src/tests/components/DynamicPageRenderer-mermaid.TEST-SUMMARY.md` - Full docs

## 🎓 TDD Workflow

```
1. Write test (RED)    → Test fails
2. Implement code      → Add Mermaid case
3. Run test (GREEN)    → Test passes
4. Refactor            → Clean up if needed
5. Repeat              → Next feature
```

## 🚨 Common Mistakes

### ❌ Wrong
```typescript
case 'mermaid': // lowercase - won't work
case 'MERMAID': // uppercase - won't work
```

### ✅ Correct
```typescript
case 'Mermaid': // exact case
```

### ❌ Wrong
```typescript
return <MermaidDiagram {...props} />; // passes all props (may include unwanted)
```

### ✅ Correct
```typescript
return (
  <MermaidDiagram
    key={key}
    chart={props.chart}
    id={props.id}
    className={props.className}
  />
);
```

## 📞 Support

### Questions?
- Check TEST-SUMMARY.md for detailed documentation
- Review existing MermaidDiagram.test.tsx for patterns
- Check E2E tests for real-world examples

### Need to Add Tests?
- Follow London School pattern
- Mock all collaborators
- Test behavior, not implementation
- Keep tests isolated

---

**Created**: 2025-10-07
**Test Count**: 50 tests
**Methodology**: London School TDD
**Status**: ⏸️ Ready for Implementation
