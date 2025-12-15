---
name: Component Library
description: React component patterns, hooks, composition strategies, and performance optimization for building reusable UI components
version: "1.0.0"
category: shared
_protected: false
_allowed_agents: ["page-builder-agent", "page-verification-agent", "coder-agent"]
_last_updated: "2025-10-18"
---

# Component Library Skill

## Purpose

Provides comprehensive React component development patterns including composition strategies, hooks patterns, performance optimization, error handling, and modern React best practices for building maintainable, reusable component libraries.

## When to Use This Skill

- Building reusable React components
- Implementing component composition patterns
- Creating custom hooks
- Optimizing component performance
- Handling component errors gracefully
- Managing component state effectively
- Implementing accessibility in React components

## Core Patterns

### 1. Component Composition Patterns

**Container/Presentation Pattern**:
```typescript
// Presentation Component (Dumb/Stateless)
interface UserCardProps {
  name: string;
  email: string;
  avatar: string;
  onEdit: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  name,
  email,
  avatar,
  onEdit
}) => (
  <div className="user-card">
    <img src={avatar} alt={`${name}'s avatar`} />
    <h3>{name}</h3>
    <p>{email}</p>
    <button onClick={onEdit}>Edit</button>
  </div>
);

// Container Component (Smart/Stateful)
export const UserCardContainer: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: user, isLoading } = useUser(userId);
  const { mutate: updateUser } = useUpdateUser();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) return <Skeleton />;
  if (!user) return <ErrorState message="User not found" />;

  return (
    <>
      <UserCard
        name={user.name}
        email={user.email}
        avatar={user.avatar}
        onEdit={() => setIsEditing(true)}
      />
      {isEditing && (
        <UserEditModal
          user={user}
          onSave={(data) => {
            updateUser(data);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </>
  );
};
```

**Compound Components Pattern**:
```typescript
// Context for shared state
interface AccordionContextValue {
  expandedItems: Set<string>;
  toggleItem: (id: string) => void;
  allowMultiple: boolean;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

const useAccordionContext = () => {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within Accordion');
  }
  return context;
};

// Root component
export const Accordion: React.FC<{
  children: ReactNode;
  allowMultiple?: boolean;
  defaultExpanded?: string[];
}> = ({ children, allowMultiple = false, defaultExpanded = [] }) => {
  const [expandedItems, setExpandedItems] = useState(
    new Set(defaultExpanded)
  );

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(id);
      }
      return next;
    });
  };

  return (
    <AccordionContext.Provider value={{ expandedItems, toggleItem, allowMultiple }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
};

// Child components
Accordion.Item = ({ id, children }: { id: string; children: ReactNode }) => {
  const { expandedItems } = useAccordionContext();
  const isExpanded = expandedItems.has(id);

  return (
    <div className="accordion-item" data-expanded={isExpanded}>
      {children}
    </div>
  );
};

Accordion.Trigger = ({ id, children }: { id: string; children: ReactNode }) => {
  const { toggleItem, expandedItems } = useAccordionContext();
  const isExpanded = expandedItems.has(id);

  return (
    <button
      className="accordion-trigger"
      onClick={() => toggleItem(id)}
      aria-expanded={isExpanded}
    >
      {children}
      <ChevronIcon direction={isExpanded ? 'up' : 'down'} />
    </button>
  );
};

Accordion.Content = ({ id, children }: { id: string; children: ReactNode }) => {
  const { expandedItems } = useAccordionContext();
  const isExpanded = expandedItems.has(id);

  return (
    <div
      className="accordion-content"
      hidden={!isExpanded}
      role="region"
    >
      {children}
    </div>
  );
};

// Usage
<Accordion allowMultiple>
  <Accordion.Item id="item-1">
    <Accordion.Trigger id="item-1">
      <h3>Item 1</h3>
    </Accordion.Trigger>
    <Accordion.Content id="item-1">
      <p>Content for item 1</p>
    </Accordion.Content>
  </Accordion.Item>
  <Accordion.Item id="item-2">
    <Accordion.Trigger id="item-2">
      <h3>Item 2</h3>
    </Accordion.Trigger>
    <Accordion.Content id="item-2">
      <p>Content for item 2</p>
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

**Render Props Pattern**:
```typescript
interface DataFetcherProps<T> {
  url: string;
  children: (data: {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
  }) => ReactNode;
}

export function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return <>{children({ data, loading, error, refetch: fetchData })}</>;
}

// Usage
<DataFetcher<User[]> url="/api/users">
  {({ data, loading, error, refetch }) => {
    if (loading) return <Spinner />;
    if (error) return <ErrorMessage error={error} onRetry={refetch} />;
    if (!data) return <EmptyState />;

    return (
      <ul>
        {data.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    );
  }}
</DataFetcher>
```

**Higher-Order Components (HOC)**:
```typescript
// HOC for authentication
function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return (props: P) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }

    return <Component {...props} user={user} />;
  };
}

// HOC for loading states
function withLoading<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & { isLoading?: boolean }> {
  return ({ isLoading, ...props }: P & { isLoading?: boolean }) => {
    if (isLoading) {
      return <Spinner />;
    }

    return <Component {...(props as P)} />;
  };
}

// Usage
const ProtectedPage = withAuth(withLoading(DashboardPage));
```

### 2. Custom Hooks Patterns

**Data Fetching Hook**:
```typescript
interface UseQueryOptions<T> {
  url: string;
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useQuery<T>({
  url,
  enabled = true,
  refetchInterval,
  onSuccess,
  onError
}: UseQueryOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');

      const result = await response.json();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [url, enabled, onSuccess, onError]);

  useEffect(() => {
    fetchData();

    if (refetchInterval) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refetchInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}

// Usage
const { data, loading, error, refetch } = useQuery<User[]>({
  url: '/api/users',
  refetchInterval: 30000,
  onSuccess: (data) => console.log('Fetched:', data.length, 'users')
});
```

**Form Management Hook**:
```typescript
interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => void | Promise<void>;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (name: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleBlur = (name: keyof T) => {
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Validate single field
    if (validate) {
      const fieldErrors = validate(values);
      if (fieldErrors[name]) {
        setErrors((prev) => ({ ...prev, [name]: fieldErrors[name] }));
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    );
    setTouched(allTouched);

    // Validate all fields
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) {
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await onSubmit(values);
      setValues(initialValues);
      setTouched({});
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue: handleChange,
    setFieldError: (name: keyof T, error: string) =>
      setErrors((prev) => ({ ...prev, [name]: error }))
  };
}

// Usage
const form = useForm({
  initialValues: { email: '', password: '' },
  validate: (values) => {
    const errors: any = {};
    if (!values.email) errors.email = 'Email is required';
    if (!values.password) errors.password = 'Password is required';
    return errors;
  },
  onSubmit: async (values) => {
    await login(values);
  }
});
```

**Local Storage Hook**:
```typescript
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Get initial value from localStorage or use default
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));

      // Dispatch event for cross-tab synchronization
      window.dispatchEvent(
        new CustomEvent('local-storage', {
          detail: { key, value: valueToStore }
        })
      );
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  // Remove item from localStorage
  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  };

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      if ('key' in e && e.key === key) {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : initialValue;
          setStoredValue(newValue);
        } catch (error) {
          console.error('Error parsing storage event:', error);
        }
      } else if ('detail' in e && e.detail.key === key) {
        setStoredValue(e.detail.value);
      }
    };

    window.addEventListener('storage', handleStorageChange as EventListener);
    window.addEventListener('local-storage', handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange as EventListener);
      window.removeEventListener('local-storage', handleStorageChange as EventListener);
    };
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// Usage
const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light');
```

**Debounce Hook**:
```typescript
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage with search
const SearchComponent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm) {
      searchAPI(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  );
};
```

**Intersection Observer Hook**:
```typescript
export function useIntersectionObserver(
  ref: RefObject<Element>,
  options?: IntersectionObserverInit
): IntersectionObserverEntry | null {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setEntry(entry);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return entry;
}

// Usage for lazy loading
const LazyImage = ({ src, alt }: { src: string; alt: string }) => {
  const ref = useRef<HTMLImageElement>(null);
  const entry = useIntersectionObserver(ref, { threshold: 0.1 });

  return (
    <img
      ref={ref}
      src={entry?.isIntersecting ? src : undefined}
      alt={alt}
      loading="lazy"
    />
  );
};
```

### 3. Performance Optimization Patterns

**Memoization with useMemo**:
```typescript
const ExpensiveComponent = ({ items, filter }: Props) => {
  // Expensive computation only runs when dependencies change
  const filteredItems = useMemo(() => {
    return items
      .filter(item => item.name.includes(filter))
      .sort((a, b) => a.priority - b.priority);
  }, [items, filter]);

  return (
    <ul>
      {filteredItems.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
};
```

**Callback Memoization with useCallback**:
```typescript
const ParentComponent = () => {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Item[]>([]);

  // Callback is memoized, won't cause child re-renders
  const handleItemClick = useCallback((id: string) => {
    console.log('Clicked item:', id);
    // If we need to use state, use functional updates
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, clicked: true } : item
    ));
  }, []);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <ItemList items={items} onItemClick={handleItemClick} />
    </div>
  );
};

// Child component only re-renders when items change
const ItemList = memo(({ items, onItemClick }: Props) => {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => onItemClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});
```

**Component Memoization with React.memo**:
```typescript
// Simple memo
const ExpensiveChild = memo(({ data }: { data: Data }) => {
  return <div>{/* Complex rendering */}</div>;
});

// Memo with custom comparison
const OptimizedChild = memo(
  ({ user }: { user: User }) => {
    return <div>{user.name}</div>;
  },
  (prevProps, nextProps) => {
    // Only re-render if user id changes
    return prevProps.user.id === nextProps.user.id;
  }
);
```

**Code Splitting with React.lazy**:
```typescript
// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
const AdminPanel = lazy(() => import('./AdminPanel'));

const App = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/heavy" element={<HeavyComponent />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Suspense>
  );
};

// Preload on hover for better UX
const NavigationLink = ({ to, children }: Props) => {
  const handleMouseEnter = () => {
    // Preload the component
    if (to === '/heavy') {
      import('./HeavyComponent');
    }
  };

  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
};
```

**Virtual Lists for Large Datasets**:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualList = ({ items }: { items: Item[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Estimated row height
    overscan: 5 // Render extra items for smooth scrolling
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 4. Error Boundary Pattern

```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);

    // Log to error reporting service
    logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error!)
          : this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary
  fallback={(error) => <ErrorPage error={error} />}
  onError={(error) => logToMonitoring(error)}
>
  <App />
</ErrorBoundary>
```

## Best Practices

### For Component Design:
1. **Single Responsibility**: Each component should do one thing well
2. **Prop Drilling Avoidance**: Use context for deeply nested props
3. **Type Safety**: Use TypeScript for prop validation
4. **Accessibility**: Build accessible components from the start
5. **Composability**: Design components to work together

### For Hooks:
1. **Rules of Hooks**: Always call hooks at top level
2. **Dependency Arrays**: List all dependencies correctly
3. **Custom Hook Naming**: Start with "use" prefix
4. **Hook Composition**: Build complex hooks from simpler ones
5. **Cleanup Functions**: Return cleanup from useEffect

### For Performance:
1. **Profile First**: Don't optimize without measuring
2. **Memo Judiciously**: Only memoize expensive computations
3. **Code Split**: Lazy load heavy components and routes
4. **List Keys**: Use stable, unique keys for lists
5. **Avoid Inline Functions**: In performance-critical renders

### For State Management:
1. **Local State First**: Don't reach for global state too quickly
2. **Lift State Up**: Share state at lowest common ancestor
3. **Derived State**: Calculate from existing state when possible
4. **Immutable Updates**: Never mutate state directly
5. **Controlled Components**: Prefer controlled over uncontrolled

## Integration with Other Skills

- **design-system**: Implement components following design tokens
- **testing-patterns**: Test components thoroughly
- **accessibility-standards**: Build accessible components
- **code-standards**: Follow React best practices

## Success Metrics

- **Reusability**: 80%+ of UI built from shared components
- **Performance**: <100ms render times for components
- **Bundle Size**: Code splitting reduces initial load <200KB
- **Type Safety**: 100% TypeScript coverage
- **Accessibility**: All components WCAG 2.1 AA compliant
- **Test Coverage**: >85% component test coverage

## References

- [react-patterns.md](react-patterns.md) - Complete React pattern catalog
- [hooks-cookbook.md](hooks-cookbook.md) - Custom hooks recipes
- [performance-guide.md](performance-guide.md) - React performance optimization
- [composition-examples.md](composition-examples.md) - Component composition patterns
- [typescript-react.md](typescript-react.md) - TypeScript with React best practices

---

**Remember**: Great components are reusable, composable, accessible, and performant. Build with composition in mind, optimize when measured, test thoroughly, and always consider the developer experience of using your components.
