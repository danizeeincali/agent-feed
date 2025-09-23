# SPARC Implementation Examples: Unified Tailwind CSS

## Document Purpose
This document provides practical implementation examples for the unified Tailwind CSS design system specified in `SPARC_UNIFIED_TAILWIND_DESIGN_SPECIFICATION.md`.

## Page Layout Examples

### 1. Main Page Layout
```jsx
// Main page with purple gradient background and responsive grid
function MainPage() {
  return (
    <div className="page-container">
      <div className="content-container">
        {/* Page Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Agent Feed Dashboard
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
            Manage and monitor your intelligent agents with real-time insights
          </p>
        </header>

        {/* Content Grid */}
        <div className="grid-responsive">
          <AgentCard agent={agent1} />
          <AgentCard agent={agent2} />
          <AgentCard agent={agent3} />
          {/* ... more cards */}
        </div>
      </div>
    </div>
  );
}
```

### 2. Agents Page Implementation
```jsx
// Updated Agents page using new design system
function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  return (
    <div className="page-container">
      <div className="content-container">
        {/* Header with search */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Production Agents
            </h1>
            <p className="text-white/80">
              {agents.length} agents discovered from /prod/.claude/agents/
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <SearchInput placeholder="Search agents..." />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid-responsive">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Agents Grid */}
        {!loading && (
          <div className="grid-responsive">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

## Component Examples

### 1. Enhanced Agent Card
```jsx
function AgentCard({ agent }) {
  return (
    <div className="card-brand group">
      {/* Header with title and status */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-neutral-800 line-clamp-2 group-hover:text-brand-purple-700 transition-colors">
          {agent.name}
        </h3>
        <StatusBadge status={agent.status} />
      </div>

      {/* Priority indicator */}
      {agent.priority && (
        <div className="flex items-center mb-3">
          <PriorityBadge priority={agent.priority} />
          <span className="text-sm text-neutral-500 ml-2">
            Priority Level
          </span>
        </div>
      )}

      {/* Description */}
      <p className="text-neutral-600 text-sm mb-4 line-clamp-3">
        {agent.description || 'No description available'}
      </p>

      {/* Footer with metadata */}
      <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
        <span className="text-xs text-neutral-500">
          Type: {agent.type === 'user_facing' ? 'User-Facing' : 'System'}
        </span>
        <button className="btn-outline text-xs py-1 px-3">
          View Details
        </button>
      </div>
    </div>
  );
}
```

### 2. Status Badge Component
```jsx
function StatusBadge({ status }) {
  const statusConfig = {
    active: {
      className: 'badge-success',
      icon: '●',
      label: 'Active'
    },
    idle: {
      className: 'badge-warning',
      icon: '◐',
      label: 'Idle'
    },
    error: {
      className: 'badge-error',
      icon: '●',
      label: 'Error'
    },
    offline: {
      className: 'badge bg-neutral-100 text-neutral-600',
      icon: '○',
      label: 'Offline'
    }
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.offline;

  return (
    <span className={`${config.className} animate-fade-in`}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  );
}
```

### 3. Priority Badge Component
```jsx
function PriorityBadge({ priority }) {
  const priorityConfig = {
    P0: 'bg-semantic-error-500 text-white',
    P1: 'bg-semantic-warning-500 text-white',
    P2: 'bg-semantic-info-500 text-white',
    P3: 'bg-neutral-400 text-white'
  };

  const className = priorityConfig[priority] || priorityConfig.P3;

  return (
    <span className={`badge ${className} font-bold text-xs`}>
      {priority}
    </span>
  );
}
```

### 4. Search Input Component
```jsx
function SearchInput({ placeholder, value, onChange, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:bg-white/20 focus:border-white/40 focus:ring-4 focus:ring-white/20 focus:outline-none transition-all duration-200 backdrop-blur-sm"
      />
    </div>
  );
}
```

### 5. Loading Skeleton Card
```jsx
function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      {/* Header skeleton */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="h-6 bg-neutral-200 rounded-lg w-3/4 mb-2"></div>
          <div className="h-4 bg-neutral-200 rounded-lg w-1/2"></div>
        </div>
        <div className="h-6 bg-neutral-200 rounded-full w-16"></div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-neutral-200 rounded-lg w-full"></div>
        <div className="h-4 bg-neutral-200 rounded-lg w-5/6"></div>
        <div className="h-4 bg-neutral-200 rounded-lg w-4/6"></div>
      </div>

      {/* Footer skeleton */}
      <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
        <div className="h-4 bg-neutral-200 rounded-lg w-20"></div>
        <div className="h-8 bg-neutral-200 rounded-lg w-24"></div>
      </div>
    </div>
  );
}
```

## Layout Patterns

### 1. Responsive Navigation
```jsx
function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-glass border-b border-white/20 sticky top-0 z-50">
      <div className="content-container py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-brand-purple-500 font-bold text-xl">A</span>
            </div>
            <span className="text-xl font-bold text-white">AgentLink</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink href="/" active>Dashboard</NavLink>
            <NavLink href="/agents">Agents</NavLink>
            <NavLink href="/analytics">Analytics</NavLink>
            <NavLink href="/settings">Settings</NavLink>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-white/20 animate-fade-in-down">
            <div className="space-y-2">
              <MobileNavLink href="/" active>Dashboard</MobileNavLink>
              <MobileNavLink href="/agents">Agents</MobileNavLink>
              <MobileNavLink href="/analytics">Analytics</MobileNavLink>
              <MobileNavLink href="/settings">Settings</MobileNavLink>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, children, active = false }) {
  return (
    <a
      href={href}
      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-white/20 text-white'
          : 'text-white/80 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </a>
  );
}

function MobileNavLink({ href, children, active = false }) {
  return (
    <a
      href={href}
      className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-white/20 text-white'
          : 'text-white/80 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </a>
  );
}
```

### 2. Error States
```jsx
function ErrorState({ error, onRetry }) {
  return (
    <div className="content-container">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-semantic-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-semantic-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">
          Something went wrong
        </h3>

        <p className="text-white/80 mb-6">
          {error?.message || 'An unexpected error occurred while loading the agents.'}
        </p>

        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="btn-primary w-full"
          >
            Try Again
          </button>

          <button
            onClick={() => window.location.reload()}
            className="btn-secondary w-full"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Empty States
```jsx
function EmptyState({ title, description, action }) {
  return (
    <div className="content-container">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">
          {title || 'No agents found'}
        </h3>

        <p className="text-white/80 mb-6">
          {description || 'Make sure agents are configured in /prod/.claude/agents/'}
        </p>

        {action && (
          <button className="btn-primary">
            {action}
          </button>
        )}
      </div>
    </div>
  );
}
```

## Form Components

### 1. Form Input with Validation
```jsx
function FormInput({
  label,
  type = "text",
  value,
  onChange,
  error,
  required = false,
  placeholder,
  ...props
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-semantic-error-500 ml-1">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 focus:ring-4 focus:ring-opacity-20 focus:outline-none ${
          error
            ? 'border-semantic-error-300 focus:border-semantic-error-500 focus:ring-semantic-error-500'
            : 'border-neutral-300 focus:border-brand-purple-500 focus:ring-brand-purple-500'
        }`}
        {...props}
      />

      {error && (
        <p className="text-sm text-semantic-error-600 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
```

### 2. Filter Component
```jsx
function AgentFilters({ filters, onChange }) {
  return (
    <div className="bg-glass rounded-xl p-6 mb-8">
      <h3 className="text-lg font-semibold text-white mb-4">Filters</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:bg-white/20 focus:border-white/40 focus:ring-4 focus:ring-white/20 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="idle">Idle</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Priority
          </label>
          <select
            value={filters.priority}
            onChange={(e) => onChange({ ...filters, priority: e.target.value })}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:bg-white/20 focus:border-white/40 focus:ring-4 focus:ring-white/20 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="P0">P0 - Critical</option>
            <option value="P1">P1 - High</option>
            <option value="P2">P2 - Medium</option>
            <option value="P3">P3 - Low</option>
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Type
          </label>
          <select
            value={filters.type}
            onChange={(e) => onChange({ ...filters, type: e.target.value })}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:bg-white/20 focus:border-white/40 focus:ring-4 focus:ring-white/20 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="user_facing">User-Facing</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>
    </div>
  );
}
```

## Accessibility Examples

### 1. Focus Management
```jsx
function AccessibleModal({ isOpen, onClose, title, children }) {
  const modalRef = useRef(null);
  const firstFocusableRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      firstFocusableRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl shadow-strong max-w-md w-full mx-4 p-6 animate-scale-in"
      >
        <div className="flex justify-between items-start mb-4">
          <h2
            id="modal-title"
            className="text-xl font-semibold text-neutral-800"
          >
            {title}
          </h2>

          <button
            ref={firstFocusableRef}
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 focus:ring-2 focus:ring-brand-purple-500 focus:ring-opacity-20 focus:outline-none rounded"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
```

### 2. Screen Reader Support
```jsx
function AccessibleStatusIndicator({ status, count }) {
  return (
    <div className="flex items-center space-x-2">
      <span
        className={`w-3 h-3 rounded-full ${
          status === 'active' ? 'bg-semantic-success-500' : 'bg-semantic-warning-500'
        }`}
        aria-hidden="true"
      />

      <span className="text-sm font-medium text-neutral-700">
        {count} {status} agent{count !== 1 ? 's' : ''}
      </span>

      <span className="sr-only">
        There {count === 1 ? 'is' : 'are'} {count} {status} agent{count !== 1 ? 's' : ''} currently running
      </span>
    </div>
  );
}
```

## Performance Optimization Examples

### 1. Lazy Loading Images
```jsx
function OptimizedAgentImage({ src, alt, className }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-neutral-200 animate-pulse rounded-lg" />
      )}

      {error ? (
        <div className="absolute inset-0 bg-neutral-100 flex items-center justify-center rounded-lg">
          <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
```

These examples demonstrate practical implementation of the unified Tailwind CSS design system, providing developers with ready-to-use patterns that maintain consistency, accessibility, and performance across the application.