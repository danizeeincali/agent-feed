# NLD Pattern Analysis: React Hooks Rule Violations

## Executive Summary

**Pattern Detected**: "Rendered more hooks than during the previous render" in Feed component
**Root Cause**: Conditional hook placement after early returns and component state changes
**Severity**: Critical - Breaks component rendering completely
**Frequency**: Occurs during interface state transitions, particularly Feed → Claude Code interface

## Detailed Analysis

### 1. Hook Count Patterns Identified

#### Primary Violation: RealSocialMediaFeed.tsx Lines 562-566
```typescript
// PROBLEMATIC PATTERN - Hooks placed after conditional renders
if (loading) {
  // Early return occurs here - BYPASSES hooks below
  return <LoadingSpinner />
}

// These hooks are conditionally rendered based on loading state - VIOLATION
const [claudeMessage, setClaudeMessage] = useState('');
const [claudeMessages, setClaudeMessages] = useState<Array<{...}>>([]);
const [claudeLoading, setClaudeLoading] = useState(false);
const [showClaudeCode, setShowClaudeCode] = useState(false);
```

#### Hook Call Sequence Analysis
```
Normal render: 20 primary hooks + 4 Claude hooks = 24 hooks
Loading state: 20 primary hooks + 0 Claude hooks (bypassed) = 20 hooks
Result: Hook count mismatch → "more hooks than previous render" error
```

### 2. Component Lifecycle Hook Mapping

#### Safe Hook Pattern (First 20 hooks - Lines 53-71)
✅ **CORRECT PLACEMENT** - Always executed
```typescript
const [posts, setPosts] = useState<AgentPost[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
// ... 17 more hooks - all properly placed
```

#### Problematic Hook Pattern (Lines 562-566)
❌ **INCORRECT PLACEMENT** - Conditionally executed
```typescript
// These hooks are placed AFTER early return conditions
const [claudeMessage, setClaudeMessage] = useState('');
const [claudeMessages, setClaudeMessages] = useState<Array<{...}>>([]);
const [claudeLoading, setClaudeLoading] = useState(false);
const [showClaudeCode, setShowClaudeCode] = useState(false);
```

### 3. Error Frequency Patterns

**Trigger Conditions**:
1. Component mounts in loading state (loading=true)
2. Early return executed, bypassing Claude Code hooks
3. Loading completes, component re-renders with all hooks
4. Hook count changes from 20 → 24 causing React error

**User Actions Leading to Error**:
- Page refresh while data is loading
- Navigation back to Feed after interface restoration
- Network delays causing extended loading states

### 4. Prevention Strategies

#### Immediate Fix: Move Hooks to Top
```typescript
const RealSocialMediaFeed: React.FC<RealSocialMediaFeedProps> = ({ className = '' }) => {
  // PRIMARY STATE - Always executed first
  const [posts, setPosts] = useState<AgentPost[]>([]);
  const [loading, setLoading] = useState(true);
  // ... other core hooks

  // CLAUDE CODE STATE - Move to top to ensure consistent execution
  const [claudeMessage, setClaudeMessage] = useState('');
  const [claudeMessages, setClaudeMessages] = useState<Array<{...}>>([]);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [showClaudeCode, setShowClaudeCode] = useState(false);

  // ALL CONDITIONAL LOGIC AFTER ALL HOOKS
  if (loading) {
    return <LoadingSpinner />
  }
  // ... rest of component
}
```

#### Advanced Prevention: Hook Order Validation
```typescript
// Development-only hook order validator
const useHookOrderValidator = (componentName: string) => {
  if (process.env.NODE_ENV === 'development') {
    const hookCountRef = useRef(0);
    const expectedCountRef = useRef<number | null>(null);

    hookCountRef.current++;

    useEffect(() => {
      if (expectedCountRef.current === null) {
        expectedCountRef.current = hookCountRef.current;
      } else if (hookCountRef.current !== expectedCountRef.current) {
        console.error(`Hook count mismatch in ${componentName}: expected ${expectedCountRef.current}, got ${hookCountRef.current}`);
      }
      hookCountRef.current = 0; // Reset for next render
    });
  }
};
```

### 5. Common Hook Violation Patterns in Codebase

#### Pattern 1: Post-Conditional Hook Declaration (Critical)
```typescript
// Found in: RealSocialMediaFeed.tsx
if (condition) return <Component />;
const [state] = useState(); // VIOLATION - conditionally executed
```

#### Pattern 2: Loop-Based Hook Generation (Not found in current codebase)
```typescript
// Example of potential violation
items.map(() => {
  const [state] = useState(); // VIOLATION - variable hook count
})
```

#### Pattern 3: Nested Function Hook Calls (Not found in current codebase)
```typescript
// Example of potential violation
const handleClick = () => {
  const [state] = useState(); // VIOLATION - not in component body
}
```

### 6. NLD Prevention Database

#### Rule Violations Detected
1. **File**: `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`
   - **Lines**: 562-566
   - **Type**: Post-conditional hook declaration
   - **Severity**: Critical
   - **Fix**: Move hooks to lines 53-71 area

#### Prevention Patterns
```typescript
// RULE 1: All hooks must be declared at the top of the component
const Component = () => {
  // ✅ ALL HOOKS HERE - ALWAYS EXECUTED
  const [state1] = useState();
  const [state2] = useState();

  // ✅ ALL CONDITIONAL LOGIC AFTER HOOKS
  if (condition) return <Early />;

  return <Normal />;
}

// RULE 2: Use useMemo for conditional content, not conditional components
const Component = () => {
  const [loading] = useState();

  const content = useMemo(() => {
    if (loading) return <Loading />;
    return <Content />;
  }, [loading]);

  return content;
}
```

### 7. Automated Detection Strategy

#### ESLint Rule Configuration
```json
{
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

#### Custom Hook Violation Detector
```typescript
const detectHookViolations = (componentCode: string) => {
  const patterns = [
    /if\s*\([^)]+\)\s*return[^;]*;\s*const\s*\[[^\]]+\]\s*=\s*use/g,
    /return[^;]*;\s*const\s*\[[^\]]+\]\s*=\s*use/g
  ];

  return patterns.some(pattern => pattern.test(componentCode));
};
```

## Recommended Actions

### Immediate (Critical)
1. **Move Claude Code hooks to top of RealSocialMediaFeed component**
2. **Add hook order validation in development**
3. **Test interface restoration scenarios**

### Short-term (High Priority)
1. **Implement automated hook violation detection**
2. **Add comprehensive component tests for state transitions**
3. **Create hook placement guidelines for developers**

### Long-term (Strategic)
1. **Integrate NLD pattern analysis into CI/CD pipeline**
2. **Develop real-time hook violation monitoring**
3. **Create component architecture patterns that prevent violations**

## Conclusion

The "rendered more hooks than during the previous render" error is a textbook example of React Hooks Rules violations. The specific issue in RealSocialMediaFeed.tsx demonstrates how easily this pattern can be introduced when adding features to existing components.

The NLD analysis reveals this is a systemic risk that can be prevented through:
- Consistent hook placement patterns
- Automated violation detection
- Component architecture guidelines
- Developer education on Hooks Rules

This pattern analysis provides the foundation for preventing similar issues across the entire codebase and serves as a template for detecting other React anti-patterns.