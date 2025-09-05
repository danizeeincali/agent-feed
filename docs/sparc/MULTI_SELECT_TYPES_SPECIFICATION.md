# Enhanced Type Definitions for Multi-Select Filtering

## Core Interface Definitions

### Enhanced FilterOptions Interface

```typescript
// Enhanced multi-select filter options
export interface MultiSelectFilterOptions {
  type: 'multi-select';
  agents: FilterItem[];
  hashtags: FilterItem[];
  logic: FilterLogic;
  metadata: FilterMetadata;
}

// Individual filter item with validation
export interface FilterItem {
  id: string;
  value: string;
  displayName: string;
  isCustom: boolean;
  source: 'predefined' | 'user-input' | 'recent';
  addedAt: Date;
  validated: boolean;
}

// Filter logic configuration
export interface FilterLogic {
  agentOperator: 'OR' | 'AND';
  hashtagOperator: 'OR' | 'AND'; 
  crossFilterOperator: 'AND' | 'OR';
  caseSensitive: boolean;
  exactMatch: boolean;
}

// Filter metadata and tracking
export interface FilterMetadata {
  sessionId: string;
  appliedAt: Date;
  resultCount?: number;
  executionTime?: number;
  cacheKey?: string;
}

// Backward compatible union type
export type FilterOptions = LegacyFilterOptions | MultiSelectFilterOptions;

// Legacy filter options (unchanged)
interface LegacyFilterOptions {
  type: 'all' | 'agent' | 'hashtag' | 'saved' | 'myposts';
  value?: string;
  agent?: string;
  hashtag?: string;
}
```

### UI Component State Interfaces

```typescript
// Filter panel state management
export interface FilterPanelState {
  activeFilters: MultiSelectFilterOptions;
  ui: FilterUIState;
  data: FilterDataState;
  validation: FilterValidationState;
}

// UI interaction state  
export interface FilterUIState {
  isAgentDropdownOpen: boolean;
  isHashtagDropdownOpen: boolean;
  activeInputType: 'agents' | 'hashtags' | null;
  focusedChipIndex: number;
  searchText: string;
  suggestions: FilterSuggestion[];
  loading: boolean;
  error?: string;
}

// Filter data and caching state
export interface FilterDataState {
  availableAgents: string[];
  availableHashtags: string[];
  recentFilters: FilterItem[];
  suggestionCache: Map<string, FilterSuggestion[]>;
  lastUpdated: Date;
  dataSource: 'api' | 'cache' | 'fallback';
}

// Filter validation state
export interface FilterValidationState {
  isValid: boolean;
  errors: FilterError[];
  warnings: FilterWarning[];
  pendingValidation: FilterItem[];
}

// Type-ahead suggestion structure
export interface FilterSuggestion {
  id: string;
  value: string;
  displayName: string;
  matchScore: number;
  highlightIndices: number[];
  category: 'exact' | 'partial' | 'fuzzy';
  metadata?: {
    postCount?: number;
    lastUsed?: Date;
    frequency?: number;
  };
}
```

### API Request/Response Types

```typescript
// Enhanced filter request
export interface MultiFilterRequest {
  filters: {
    agents?: string[];
    hashtags?: string[];
    logic?: FilterLogic;
  };
  pagination: {
    limit: number;
    offset: number;
  };
  sorting: {
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
  };
  options?: {
    includeCounts?: boolean;
    includeMetadata?: boolean;
    cacheKey?: string;
  };
}

// Enhanced filter response
export interface MultiFilterResponse extends ApiResponse<AgentPost[]> {
  total: number;
  appliedFilters: AppliedFilterSummary;
  performance: FilterPerformanceMetrics;
  suggestions?: FilterSuggestion[];
}

// Applied filter summary
export interface AppliedFilterSummary {
  agents: FilterItem[];
  hashtags: FilterItem[];
  logic: FilterLogic;
  resultBreakdown: {
    totalResults: number;
    agentResults: Map<string, number>;
    hashtagResults: Map<string, number>;
    intersectionResults: number;
  };
}

// Performance tracking
export interface FilterPerformanceMetrics {
  queryExecutionTime: number;
  cacheHitRate: number;
  databaseQueries: number;
  indexUsage: string[];
  optimizationSuggestions?: string[];
}
```

### Validation and Error Types

```typescript
// Filter validation errors
export interface FilterError {
  type: 'validation' | 'api' | 'performance' | 'authorization';
  code: string;
  message: string;
  field: string;
  value: string;
  suggestions: string[];
  severity: 'error' | 'warning' | 'info';
}

// Filter warnings (non-blocking)
export interface FilterWarning {
  type: 'performance' | 'data' | 'user-experience';
  message: string;
  details: string;
  actionable: boolean;
  dismissible: boolean;
}

// Validation result
export interface FilterValidationResult {
  isValid: boolean;
  errors: FilterError[];
  warnings: FilterWarning[];
  normalizedFilters: MultiSelectFilterOptions;
  validationTime: number;
}
```

## Component Prop Interfaces

### Enhanced FilterPanel Props

```typescript
export interface EnhancedFilterPanelProps {
  // Filter state
  currentFilter: FilterOptions;
  onFilterChange: (filter: FilterOptions) => void;
  
  // Data sources
  availableAgents: string[];
  availableHashtags: string[];
  onLoadFilterOptions: (type: 'agents' | 'hashtags', search?: string) => Promise<FilterSuggestion[]>;
  
  // UI configuration
  maxSelections?: {
    agents?: number;
    hashtags?: number;
  };
  placeholder?: {
    agents?: string;
    hashtags?: string;
  };
  
  // Display options
  showResultCount?: boolean;
  showFilterLogic?: boolean;
  showPerformanceMetrics?: boolean;
  
  // Event handlers
  onValidationError?: (error: FilterError) => void;
  onPerformanceWarning?: (metrics: FilterPerformanceMetrics) => void;
  
  // Accessibility
  ariaLabel?: string;
  testId?: string;
  
  // Styling
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  compact?: boolean;
}
```

### Multi-Select Input Props

```typescript
export interface MultiSelectInputProps<T = FilterItem> {
  // Data
  items: T[];
  selectedItems: T[];
  suggestions: FilterSuggestion[];
  
  // Selection management
  onItemAdd: (item: T) => void;
  onItemRemove: (item: T) => void;
  onCustomItemAdd: (value: string) => void;
  
  // Search and filtering
  searchText: string;
  onSearchChange: (text: string) => void;
  onSearchSubmit: (text: string) => void;
  
  // UI state
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error?: string;
  
  // Configuration
  allowCustomItems?: boolean;
  minSearchLength?: number;
  maxItems?: number;
  placeholder?: string;
  
  // Keyboard navigation
  focusedIndex: number;
  onFocusChange: (index: number) => void;
  
  // Accessibility
  ariaLabel: string;
  ariaDescribedBy?: string;
  
  // Styling
  className?: string;
  chipClassName?: string;
  dropdownClassName?: string;
}
```

## Utility Types and Helpers

### Filter Transformation Types

```typescript
// Convert between legacy and multi-select formats
export type FilterConverter = {
  toMultiSelect: (legacy: LegacyFilterOptions) => MultiSelectFilterOptions;
  toLegacy: (multiSelect: MultiSelectFilterOptions) => LegacyFilterOptions[];
  normalize: (filter: FilterOptions) => MultiSelectFilterOptions;
};

// Filter serialization for URL/storage
export type FilterSerializer = {
  serialize: (filter: MultiSelectFilterOptions) => string;
  deserialize: (serialized: string) => MultiSelectFilterOptions;
  toURLParams: (filter: MultiSelectFilterOptions) => URLSearchParams;
  fromURLParams: (params: URLSearchParams) => MultiSelectFilterOptions;
};

// Filter comparison utilities
export type FilterComparator = {
  equals: (a: MultiSelectFilterOptions, b: MultiSelectFilterOptions) => boolean;
  diff: (a: MultiSelectFilterOptions, b: MultiSelectFilterOptions) => FilterDiff;
  merge: (base: MultiSelectFilterOptions, changes: Partial<MultiSelectFilterOptions>) => MultiSelectFilterOptions;
};

export interface FilterDiff {
  added: {
    agents: FilterItem[];
    hashtags: FilterItem[];
  };
  removed: {
    agents: FilterItem[];
    hashtags: FilterItem[];
  };
  modified: {
    logic?: Partial<FilterLogic>;
    metadata?: Partial<FilterMetadata>;
  };
}
```

### Type Guards and Validators

```typescript
// Type guards
export const isMultiSelectFilter = (filter: FilterOptions): filter is MultiSelectFilterOptions => {
  return filter.type === 'multi-select';
};

export const isLegacyFilter = (filter: FilterOptions): filter is LegacyFilterOptions => {
  return filter.type !== 'multi-select';
};

export const isValidFilterItem = (item: any): item is FilterItem => {
  return (
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.value === 'string' &&
    typeof item.displayName === 'string' &&
    typeof item.isCustom === 'boolean'
  );
};

// Validation functions
export const validateFilterOptions = (filter: MultiSelectFilterOptions): FilterValidationResult => {
  const errors: FilterError[] = [];
  const warnings: FilterWarning[] = [];
  
  // Validate agent count
  if (filter.agents.length > 20) {
    errors.push({
      type: 'validation',
      code: 'MAX_AGENTS_EXCEEDED',
      message: 'Maximum 20 agents allowed',
      field: 'agents',
      value: filter.agents.length.toString(),
      suggestions: ['Remove some agents', 'Use more specific filters'],
      severity: 'error'
    });
  }
  
  // Validate hashtag count
  if (filter.hashtags.length > 20) {
    errors.push({
      type: 'validation', 
      code: 'MAX_HASHTAGS_EXCEEDED',
      message: 'Maximum 20 hashtags allowed',
      field: 'hashtags',
      value: filter.hashtags.length.toString(),
      suggestions: ['Remove some hashtags', 'Use more general tags'],
      severity: 'error'
    });
  }
  
  // Performance warnings
  if (filter.agents.length + filter.hashtags.length > 10) {
    warnings.push({
      type: 'performance',
      message: 'Large number of filters may impact performance',
      details: `${filter.agents.length + filter.hashtags.length} total filters active`,
      actionable: true,
      dismissible: true
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    normalizedFilters: filter,
    validationTime: Date.now()
  };
};
```

## React Hook Types

### Filter Management Hook

```typescript
export interface UseMultiSelectFilterResult {
  // Current state
  filters: MultiSelectFilterOptions;
  ui: FilterUIState;
  validation: FilterValidationResult;
  
  // Filter management
  addAgent: (agent: string) => void;
  removeAgent: (agentId: string) => void;
  addHashtag: (hashtag: string) => void;
  removeHashtag: (hashtagId: string) => void;
  clearAll: () => void;
  
  // Search functionality
  searchSuggestions: (query: string, type: 'agents' | 'hashtags') => Promise<FilterSuggestion[]>;
  
  // UI state management
  setActiveInput: (type: 'agents' | 'hashtags' | null) => void;
  setSearchText: (text: string) => void;
  
  // Validation
  validate: () => FilterValidationResult;
  
  // Persistence
  saveToSession: () => void;
  loadFromSession: () => void;
  saveToURL: () => void;
  loadFromURL: () => void;
}

export interface UseMultiSelectFilterOptions {
  initialFilters?: MultiSelectFilterOptions;
  maxAgents?: number;
  maxHashtags?: number;
  debounceMs?: number;
  persistToSession?: boolean;
  persistToURL?: boolean;
  onValidationError?: (errors: FilterError[]) => void;
  onPerformanceWarning?: (warning: FilterWarning) => void;
}
```

### API Integration Hook

```typescript
export interface UseFilterAPIResult {
  // Data
  posts: AgentPost[];
  total: number;
  loading: boolean;
  error: string | null;
  
  // Filter application
  applyFilters: (filters: MultiSelectFilterOptions) => Promise<void>;
  refreshResults: () => Promise<void>;
  
  // Performance tracking
  performance: FilterPerformanceMetrics | null;
  
  // Caching
  clearCache: () => void;
  cacheStatus: 'fresh' | 'stale' | 'missing';
}

export interface UseFilterAPIOptions {
  autoApply?: boolean;
  debounceMs?: number;
  cacheTimeout?: number;
  retryAttempts?: number;
  onError?: (error: Error) => void;
  onPerformanceWarning?: (metrics: FilterPerformanceMetrics) => void;
}
```

This comprehensive type specification provides the foundation for implementing type-safe multi-select filtering with full IDE support and compile-time validation.