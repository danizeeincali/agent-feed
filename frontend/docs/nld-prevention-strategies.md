# NLD Prevention Strategies: React Hooks Error Prevention

## Core Prevention Framework

### Strategy 1: Hook Declaration Patterns

#### Golden Rule: "Hooks First, Logic Second"
```typescript
const Component = () => {
  // PHASE 1: ALL HOOKS - Always executed, consistent count
  const [state1] = useState();
  const [state2] = useState();
  const [state3] = useState();
  const effect1 = useEffect(() => {}, []);
  const callback1 = useCallback(() => {}, []);

  // PHASE 2: ALL LOGIC - Can be conditional, but never contains hooks
  if (condition) {
    return <EarlyReturn />;
  }

  return <NormalRender />;
};
```

#### Anti-Pattern Detection Template
```typescript
// VIOLATION PATTERNS TO DETECT
const antiPatterns = {
  postConditionalHook: /if\s*\([^)]+\)\s*return[^;]*;\s*const\s*\[[^\]]+\]\s*=\s*use/g,
  postReturnHook: /return[^;]*;\s*const\s*\[[^\]]+\]\s*=\s*use/g,
  loopHook: /\.map\s*\([^)]*=>\s*{[^}]*use[A-Z]/g,
  conditionalHook: /if\s*\([^)]+\)\s*{[^}]*use[A-Z]/g
};
```

### Strategy 2: Component Architecture Patterns

#### Pattern A: Conditional Content with Consistent Hooks
```typescript
const SafeComponent = () => {
  // ALL hooks always executed - consistent count
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Conditional CONTENT, not conditional RENDERING
  const content = useMemo(() => {
    if (loading) return <Loading />;
    if (error) return <Error message={error} />;
    return <Data content={data} />;
  }, [loading, error, data]);

  return (
    <div className="container">
      {content}
    </div>
  );
};
```

#### Pattern B: Early Return with Hook Hoisting
```typescript
const SafeEarlyReturn = ({ condition }) => {
  // ALL hooks declared first - even if not used in early return
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const effect = useEffect(() => {
    // Effect logic here
  }, []);

  // Early return AFTER all hooks
  if (condition) {
    return <SimpleComponent />;
  }

  return <ComplexComponent state={state} loading={loading} />;
};
```

### Strategy 3: Development-Time Detection

#### Hook Order Validator
```typescript
// Development hook validator
const useHookCountValidator = (componentName: string) => {
  if (process.env.NODE_ENV !== 'development') return;

  const renderCountRef = useRef(0);
  const hookCountRef = useRef(0);
  const expectedHooksRef = useRef<number | null>(null);

  renderCountRef.current++;
  hookCountRef.current++;

  useLayoutEffect(() => {
    if (expectedHooksRef.current === null) {
      expectedHooksRef.current = hookCountRef.current;
    } else if (hookCountRef.current !== expectedHooksRef.current) {
      console.error(
        `🚨 Hook count mismatch in ${componentName}:`,
        `Expected: ${expectedHooksRef.current}, Got: ${hookCountRef.current}`,
        `Render: ${renderCountRef.current}`
      );
    }

    // Reset for next render
    hookCountRef.current = 0;
  });
};

// Usage in components
const MyComponent = () => {
  useHookCountValidator('MyComponent');

  // Your hooks here...
  const [state] = useState();
  // ... more hooks
};
```

#### ESLint Custom Rule
```javascript
// .eslintrc.js custom rule for hook placement
module.exports = {
  rules: {
    'custom-hooks-placement': {
      create(context) {
        let hasEarlyReturn = false;
        let hookAfterReturn = false;

        return {
          ReturnStatement(node) {
            if (node.parent.type === 'BlockStatement' &&
                node.parent.parent.type === 'FunctionDeclaration') {
              hasEarlyReturn = true;
            }
          },
          CallExpression(node) {
            if (node.callee.name && node.callee.name.startsWith('use')) {
              if (hasEarlyReturn) {
                context.report({
                  node,
                  message: 'Hook called after early return - move to top of function'
                });
              }
            }
          }
        };
      }
    }
  }
};
```

### Strategy 4: Testing Strategies

#### Hook Count Testing
```typescript
import { renderHook, act } from '@testing-library/react-hooks';

describe('Hook Count Consistency', () => {
  test('component maintains consistent hook count across renders', () => {
    const Component = ({ condition }) => {
      const [state1] = useState(1);
      const [state2] = useState(2);

      if (condition) return <div>Early</div>;

      const [state3] = useState(3); // This would cause violation
      return <div>Normal</div>;
    };

    const { rerender } = render(<Component condition={true} />);

    // Should not throw "more hooks" error
    expect(() => {
      rerender(<Component condition={false} />);
    }).not.toThrow(/more hooks/);
  });

  test('hook order remains consistent', () => {
    const hookOrder = [];

    const useTestHook = (name) => {
      hookOrder.push(name);
      return useState(name);
    };

    const Component = ({ skipSecond }) => {
      useTestHook('first');
      if (!skipSecond) useTestHook('second'); // VIOLATION - should fail test
      useTestHook('third');
    };

    render(<Component skipSecond={false} />);
    const firstOrder = [...hookOrder];

    hookOrder.length = 0;
    render(<Component skipSecond={true} />);

    // Hook order should be consistent (this test should catch violations)
    expect(hookOrder).toEqual(firstOrder.slice(0, -1));
  });
});
```

#### State Transition Testing
```typescript
describe('State Transition Hook Safety', () => {
  test('loading state transitions maintain hook count', async () => {
    const { rerender } = render(<FeedComponent loading={true} />);

    // Simulate loading completion
    await act(async () => {
      rerender(<FeedComponent loading={false} />);
    });

    // Should not cause hook violations
    expect(screen.getByTestId('feed-content')).toBeInTheDocument();
  });
});
```

### Strategy 5: Automated Monitoring

#### Runtime Hook Monitor
```typescript
const hookMonitor = {
  enabled: process.env.NODE_ENV === 'development',
  components: new Map(),

  track(componentName: string, hookCount: number) {
    if (!this.enabled) return;

    const existing = this.components.get(componentName);
    if (existing && existing !== hookCount) {
      console.error(`Hook count changed in ${componentName}: ${existing} → ${hookCount}`);
    } else {
      this.components.set(componentName, hookCount);
    }
  },

  wrap(Component: React.FC, name: string) {
    if (!this.enabled) return Component;

    return (props) => {
      let hookCount = 0;
      const originalUseState = React.useState;

      React.useState = (...args) => {
        hookCount++;
        return originalUseState(...args);
      };

      try {
        const result = Component(props);
        this.track(name, hookCount);
        return result;
      } finally {
        React.useState = originalUseState;
      }
    };
  }
};

// Usage
export default hookMonitor.wrap(MyComponent, 'MyComponent');
```

### Strategy 6: Build-Time Analysis

#### Webpack Plugin for Hook Analysis
```javascript
class HookAnalysisPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('HookAnalysisPlugin', (compilation) => {
      compilation.hooks.seal.tap('HookAnalysisPlugin', () => {
        // Analyze components for hook violations
        compilation.modules.forEach(module => {
          if (module.resource && module.resource.endsWith('.tsx')) {
            this.analyzeComponent(module._source._value);
          }
        });
      });
    });
  }

  analyzeComponent(source) {
    const violations = detectHookViolations(source);
    if (violations.length > 0) {
      console.warn('Hook violations found:', violations);
    }
  }
}
```

## Implementation Roadmap

### Phase 1: Immediate Fixes (Critical)
- [ ] Fix RealSocialMediaFeed.tsx hook placement
- [ ] Add development hook count validation
- [ ] Implement basic ESLint rules

### Phase 2: Enhanced Detection (1-2 weeks)
- [ ] Custom ESLint rules for hook placement
- [ ] Automated testing for hook consistency
- [ ] Runtime hook monitoring in development

### Phase 3: Systematic Prevention (1 month)
- [ ] Build-time static analysis
- [ ] Component architecture guidelines
- [ ] Developer training on hook patterns

### Phase 4: Advanced Monitoring (Ongoing)
- [ ] Real-time violation detection
- [ ] Performance impact analysis
- [ ] Continuous pattern learning

## Success Metrics

1. **Zero Hook Violations**: No "more hooks" errors in production
2. **Developer Productivity**: Reduced debugging time for hook issues
3. **Code Quality**: Consistent component architecture patterns
4. **Prevention Coverage**: 100% of components follow safe patterns

This prevention framework transforms reactive debugging into proactive pattern enforcement, creating a robust foundation for React component development.