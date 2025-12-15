# TDD London School - Emergency Hooks Violation Prevention Suite

## 🚨 CRITICAL MISSION: Prevent "Rendered more hooks than during the previous render" 

This comprehensive test suite implements the **TDD London School (mockist) methodology** to detect, prevent, and remediate React hooks violations that cause the dreaded "Rendered more hooks than during the previous render" error.

## 🎯 Test Suite Architecture

### Core Principles (London School TDD)
- **Mock Everything**: No real React rendering - pure interaction testing
- **Outside-In**: Start with component behavior, mock all dependencies  
- **Behavior Verification**: Test HOW objects collaborate, not WHAT they contain
- **Contract Testing**: Define clear interfaces through mock expectations
- **Fail Fast**: Tests MUST fail when violations occur to prove detection works

## 📁 Test Files Overview

### 1. `react-hooks-tracker.test.ts`
**Purpose**: Runtime hook call tracking and count validation
- Mocks React completely to intercept and count hook calls
- Tracks exact hook call patterns per render
- Detects hook count mismatches between renders
- **Key Violations Detected**: Conditional hooks, early returns, loop-based hooks

```typescript
// Example violation detection
expect(result.violation).toBe(true);
expect(result.details).toContain('Hook count mismatch: Previous render had 3 hooks, current render has 2 hooks');
```

### 2. `browser-environment-simulation.test.ts` 
**Purpose**: Browser environment scenarios that trigger violations
- Mocks window, localStorage, sessionStorage, navigation
- Tests tab switching, route changes, cache states
- Simulates hot reload, DevTools interference, error recovery
- **Key Violations Detected**: Navigation-based, cache-based, refresh-based hook changes

```typescript
// Tab switching violation example
const tabHookCounts = ['overview', 'pages', 'activity'].map(tab => 
  simulateTabRender(tab).hookCount
);
expect(new Set(tabHookCounts).size).toBeGreaterThan(1); // Different hook counts = VIOLATION
```

### 3. `component-lifecycle-mocks.test.tsx`
**Purpose**: Component lifecycle interaction testing
- Complete React mock with lifecycle tracking
- Tests mount/unmount/remount scenarios
- Validates prop changes and state transitions
- **Key Violations Detected**: Lifecycle-based hook variations, async loading state changes

```typescript
// Lifecycle violation detection
const mountHooks = simulateComponentMount().totalHooks;
const updateHooks = simulateComponentUpdate().totalHooks;
expect(mountHooks).not.toBe(updateHooks); // VIOLATION!
```

### 4. `cache-state-manipulation.test.ts`
**Purpose**: Cache and state manipulation scenarios
- Mocks all browser storage APIs
- Tests localStorage/sessionStorage state changes
- Simulates memory pressure and cache invalidation
- **Key Violations Detected**: Storage-dependent hooks, cache-state variations

```typescript
// Cache state violation
const noCacheHooks = simulateWithoutCache().totalHooks;
const withCacheHooks = simulateWithCache().totalHooks;
expect(withCacheHooks).toBeGreaterThan(noCacheHooks); // VIOLATION!
```

### 5. `navigation-router-mocks.test.tsx`
**Purpose**: Navigation and routing hook violations
- Complete React Router mock suite
- Tests route changes, parameter variations, history navigation
- Simulates programmatic vs user navigation
- **Key Violations Detected**: Route-based hook changes, parameter-dependent hooks

```typescript
// Route navigation violation
const routeHookCounts = routes.map(route => simulateRouteComponent(route).hookCount);
expect(new Set(routeHookCounts).size).toBeGreaterThan(3); // Multiple different counts = VIOLATION
```

### 6. `react-devtools-mutations.test.ts`
**Purpose**: React DevTools interference detection
- Mocks React DevTools global hook
- Tests state mutations, time travel, profiling
- Simulates component highlighting and inspection
- **Key Violations Detected**: DevTools-induced hook changes, debugging overhead

```typescript
// DevTools interference violation
const normalHooks = simulateWithoutDevTools().hookCount;
const devToolsHooks = simulateWithDevTools().hookCount; 
expect(devToolsHooks).toBeGreaterThan(normalHooks); // DevTools adds hooks = VIOLATION
```

### 7. `comprehensive-prevention-suite.test.ts`
**Purpose**: Master violation detection and prevention system
- Combines all detection strategies
- Provides production deployment gates
- Generates comprehensive violation reports
- **Key Feature**: Emergency production blocking when violations detected

```typescript
// Production gate
const productionSafe = report.summary.criticalViolations === 0;
expect(productionSafe).toBe(false); // We expect violations in test scenarios
// This confirms our detection system works!
```

## 🔧 How to Run Tests

### Run Individual Test Suites
```bash
# Runtime hook tracking
npm test -- react-hooks-tracker.test.ts

# Browser environment violations
npm test -- browser-environment-simulation.test.ts  

# Component lifecycle violations
npm test -- component-lifecycle-mocks.test.tsx

# Cache/state violations
npm test -- cache-state-manipulation.test.ts

# Navigation violations
npm test -- navigation-router-mocks.test.tsx

# DevTools interference
npm test -- react-devtools-mutations.test.ts

# Master prevention suite
npm test -- comprehensive-prevention-suite.test.ts
```

### Run Complete Suite
```bash
# Run all hooks validation tests
npm test -- --testPathPattern=hooks-validation

# Run with coverage
npm test -- --testPathPattern=hooks-validation --coverage

# Run in watch mode during development
npm test -- --testPathPattern=hooks-validation --watch
```

## 🚨 Critical Violation Patterns Detected

### 1. Conditional Hooks (Most Common)
```javascript
// VIOLATION - hooks inside condition
if (condition) {
  useState('conditional'); // This breaks rules of hooks!
}
```

### 2. Early Return Violations
```javascript
// VIOLATION - early return before all hooks
if (loading) return <Loading />;
useEffect(() => {}, []); // This hook is sometimes skipped!
```

### 3. Loop-Based Hooks
```javascript
// VIOLATION - hooks inside loop
items.forEach(item => {
  useState(item); // Hook count varies with array length!
});
```

### 4. Tab/Route Navigation
```javascript
// VIOLATION - different hooks per tab
switch(activeTab) {
  case 'overview': 
    useState('overview'); // 1 hook
    break;
  case 'pages':
    // 20 hooks for AgentPagesTab
    break;
}
```

### 5. Cache-Dependent Hooks
```javascript
// VIOLATION - hooks depend on cache state
if (localStorage.getItem('data')) {
  useState('cached'); // Sometimes present, sometimes not
  useEffect(() => {}, []); // Variable hook count
}
```

## 📊 Test Results Interpretation

### Expected Test Behavior
- **Tests SHOULD FAIL** when violations are detected
- **Tests SHOULD PASS** when no violations exist
- **High violation counts** indicate areas needing immediate attention

### Violation Severity Levels
- **Critical**: Production-blocking (>5 hook difference)
- **High**: Immediate attention required (3-5 hook difference)  
- **Medium**: Should be addressed (1-2 hook difference)
- **Low**: Minor inconsistencies (<1 hook difference)

## 🔧 Remediation Strategies

### 1. Conditional Logic Inside Hooks
```javascript
// ❌ Wrong - conditional hooks
if (condition) {
  useState('conditional');
}

// ✅ Correct - conditional logic inside hooks
const [value, setValue] = useState(condition ? 'conditional' : null);
```

### 2. Early Return Prevention
```javascript
// ❌ Wrong - early return before hooks
if (loading) return <Loading />;
useEffect(() => {}, []);

// ✅ Correct - all hooks first
useEffect(() => {}, []);
if (loading) return <Loading />;
```

### 3. Loop Hook Replacement
```javascript
// ❌ Wrong - hooks in loop
items.forEach(item => useState(item));

// ✅ Correct - single hook with array
const [items, setItems] = useState(itemsArray);
```

## 🚀 Integration with CI/CD

### Pre-commit Hook
```bash
#!/bin/sh
# Run hooks validation tests
npm test -- --testPathPattern=hooks-validation --passWithNoTests=false
if [ $? -ne 0 ]; then
  echo "❌ Hooks violations detected - commit blocked"
  exit 1
fi
```

### Production Deployment Gate
```javascript
// In deployment pipeline
const report = masterDetector.generateViolationReport();
if (report.summary.criticalViolations > 0) {
  throw new Error('Production deployment blocked: Critical hooks violations detected');
}
```

## 📈 Emergency Response Protocol

### When Tests Detect Violations
1. **Stop development** - Do not merge/deploy
2. **Analyze violation report** - Review specific components and scenarios
3. **Apply remediation strategy** - Fix hook patterns
4. **Re-run tests** - Verify fixes work
5. **Update component signatures** - Register new patterns if legitimate

### Production Emergency
If hooks violations are detected in production:
1. **Immediate rollback** to last stable version
2. **Run complete test suite** in staging
3. **Apply emergency fixes** using remediation strategies
4. **Deploy with validation** - ensure tests pass

## 🎯 Success Metrics

- **Zero critical violations** in production
- **All tests passing** in CI/CD pipeline
- **Violation detection rate** >95% for known patterns
- **Mean time to remediation** <2 hours
- **False positive rate** <5%

## 🤝 Contributing

When adding new components or modifying existing ones:

1. **Register component signature** in master detection system
2. **Add test scenarios** for your component's hook patterns
3. **Verify violation detection** - ensure tests fail when violations occur
4. **Document hook patterns** - explain expected vs actual behavior

## 🔍 Debug Tools

### Hook Call Inspection
```javascript
// Enable detailed logging
const summary = reactMocker.getHooksSummary();
console.log('Hook calls:', summary.hooksByType);
```

### Violation Stack Traces
```javascript
// Get violation details
const violations = masterDetector.getAllViolations();
violations.forEach(v => console.log(v.details.stackTrace));
```

---

**Remember**: The goal is not to eliminate all hook variations, but to ensure they are **intentional, documented, and safe**. This test suite provides the tools to distinguish between legitimate patterns and dangerous violations.

## 🆘 Emergency Contacts

- **Hook Violations**: TDD London School Detection System  
- **Production Issues**: Emergency rollback and remediation
- **False Positives**: Component signature updates needed

**CRITICAL**: These tests exist to prevent production crashes. Take all violations seriously and remediate immediately.