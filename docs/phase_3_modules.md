# Phase 3: Modular Architecture Design

## Architecture Overview

This document outlines the modular architecture for the enhanced @ mention system. The design emphasizes separation of concerns, testability, and reusability across all posting components (PostCreator, QuickPost, Comments).

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    UI Layer (React Components)                  │
├─────────────────────────────────────────────────────────────────┤
│  PostCreator  │  QuickPost  │  Comments  │  PostCreatorModal   │
│               │             │            │                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MentionInput Component                     │   │
│  │  - Dropdown rendering                                   │   │
│  │  - Keyboard navigation                                  │   │
│  │  - Text insertion                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                     Hook Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  useMentions  │  │ useMentions  │  │    useAgentCache      │ │
│  │     Hook      │  │    Search    │  │                       │ │
│  └───────────────┘  └──────────────┘  └───────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                   Service Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  MentionService                             ││
│  │  - Agent search & filtering                                 ││ 
│  │  - Smart suggestions                                        ││
│  │  - Usage analytics                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   AgentService                              ││
│  │  - API communication                                        ││
│  │  - Authentication                                           ││
│  │  - Error handling                                           ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                    Utility Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ AgentCache  │  │ AgentMatcher │  │    TextProcessor        │ │
│  │   Utility   │  │   Utility    │  │                         │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     Data Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     Agents API                              ││
│  │  GET /api/v1/agents                                         ││
│  │  GET /api/v1/agents/search                                  ││  
│  │  PATCH /api/v1/agents/:id/usage                             ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Module Specifications

### 1. MentionService (Core Service)

**File:** `/src/services/MentionService.ts`

**Responsibilities:**
- Centralized agent search and filtering
- Smart suggestion generation
- Usage analytics and learning
- Cross-component state coordination

```typescript
interface MentionServiceConfig {
  apiEndpoint: string;
  cacheTimeout: number;
  maxSuggestions: number;
  searchDebounce: number;
  enableAnalytics: boolean;
}

interface SearchContext {
  userId?: string;
  postContent?: string;
  mentionType: 'post' | 'comment' | 'quick-post';
  includeSuggestions: boolean;
}

export class MentionService {
  private static instance: MentionService;
  private agentService: AgentService;
  private cache: AgentCache;
  private matcher: AgentMatcher;
  private analytics: MentionAnalytics;

  // Public API
  public async searchMentions(
    query: string, 
    context: SearchContext
  ): Promise<MentionSuggestion[]>

  public getQuickMentions(type: MentionType): MentionSuggestion[]

  public async getSmartSuggestions(
    content: string,
    context: SearchContext
  ): Promise<MentionSuggestion[]>

  public trackMentionUsage(
    agentId: string, 
    context: SearchContext
  ): void

  public invalidateCache(): void

  // Configuration
  public configure(config: Partial<MentionServiceConfig>): void
}
```

### 2. AgentService (API Layer)

**File:** `/src/services/AgentService.ts`

**Responsibilities:**
- HTTP API communication
- Authentication handling
- Request/response transformation
- Error handling and retries

```typescript
interface AgentSearchParams {
  query?: string;
  limit?: number;
  includeInactive?: boolean;
  userId?: string;
}

interface AgentApiResponse {
  success: boolean;
  data: Agent[];
  pagination?: {
    total: number;
    hasMore: boolean;
  };
  error?: string;
}

export class AgentService {
  private httpClient: HttpClient;
  private authService: AuthService;

  constructor(baseURL: string, authService: AuthService)

  // Core API methods
  public async getAllAgents(): Promise<Agent[]>
  
  public async searchAgents(params: AgentSearchParams): Promise<Agent[]>
  
  public async getAgent(id: string): Promise<Agent | null>
  
  public async updateAgentUsage(id: string): Promise<void>

  // Health and monitoring  
  public async getAgentStatus(id: string): Promise<AgentStatus>
  
  public isHealthy(): boolean

  // Error recovery
  private async retryRequest<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T>
}
```

### 3. useMentions Hook (State Management)

**File:** `/src/hooks/useMentions.ts`

**Responsibilities:**
- Component-level state management
- Debounced search coordination
- Dropdown state management
- Event handling abstraction

```typescript
interface MentionHookConfig {
  debounceMs?: number;
  maxSuggestions?: number;
  mentionContext: 'post' | 'comment' | 'quick-post';
  autoSuggest?: boolean;
  postContent?: string;
}

interface MentionHookState {
  isActive: boolean;
  query: string;
  suggestions: MentionSuggestion[];
  selectedIndex: number;
  loading: boolean;
  error?: string;
}

export function useMentions(config: MentionHookConfig) {
  const [state, setState] = useState<MentionHookState>({
    isActive: false,
    query: '',
    suggestions: [],
    selectedIndex: 0,
    loading: false
  });

  // Core functionality
  const startMention = useCallback((query: string) => { ... });
  const updateQuery = useCallback((query: string) => { ... });
  const selectSuggestion = useCallback((index: number) => { ... });
  const closeMentions = useCallback(() => { ... });

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => { ... });

  // Auto-suggestions
  const getSmartSuggestions = useCallback(async () => { ... });

  return {
    // State
    ...state,
    
    // Actions
    startMention,
    updateQuery,
    selectSuggestion,
    closeMentions,
    
    // Event handlers
    handleKeyDown,
    getSmartSuggestions,

    // Utils
    isValidQuery: (query: string) => boolean,
    formatMention: (suggestion: MentionSuggestion) => string
  };
}
```

### 4. useMentionSearch Hook (Search Specialization)

**File:** `/src/hooks/useMentionSearch.ts`

**Responsibilities:**
- Optimized search operations
- Request deduplication
- Cache management
- Performance monitoring

```typescript
interface SearchHookConfig {
  onResults: (results: MentionSuggestion[]) => void;
  onError: (error: Error) => void;
  debounceMs: number;
  mentionContext: MentionType;
}

export function useMentionSearch(config: SearchHookConfig) {
  const [isSearching, setIsSearching] = useState(false);
  const abortController = useRef<AbortController>();
  
  const search = useCallback(async (query: string) => {
    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    setIsSearching(true);

    try {
      const results = await MentionService.getInstance()
        .searchMentions(query, {
          mentionType: config.mentionContext,
          signal: abortController.current.signal
        });

      config.onResults(results);
    } catch (error) {
      if (!abortController.current?.signal.aborted) {
        config.onError(error as Error);
      }
    } finally {
      setIsSearching(false);
    }
  }, [config]);

  const debouncedSearch = useDeferredValue(search);

  return {
    search: debouncedSearch,
    isSearching,
    cancelSearch: () => abortController.current?.abort()
  };
}
```

### 5. useAgentCache Hook (Caching Layer)

**File:** `/src/hooks/useAgentCache.ts`

**Responsibilities:**
- Client-side cache management
- Cache invalidation strategies  
- Offline functionality
- Memory optimization

```typescript
interface CacheHookConfig {
  cacheKey: string;
  ttl: number; // Time to live in milliseconds
  maxEntries: number;
  persistToStorage: boolean;
}

export function useAgentCache(config: CacheHookConfig) {
  const cache = useRef(new Map<string, CacheEntry>());
  
  const get = useCallback(<T>(key: string): T | null => {
    const entry = cache.current.get(key);
    
    if (!entry || isExpired(entry)) {
      cache.current.delete(key);
      return null;
    }

    return entry.data as T;
  }, []);

  const set = useCallback(<T>(key: string, data: T) => {
    // Implement LRU eviction if needed
    if (cache.current.size >= config.maxEntries) {
      const oldestKey = findOldestEntry(cache.current);
      cache.current.delete(oldestKey);
    }

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl
    };

    cache.current.set(key, entry);

    // Persist to localStorage if configured
    if (config.persistToStorage) {
      persistToStorage(key, entry);
    }
  }, [config]);

  const clear = useCallback(() => {
    cache.current.clear();
    if (config.persistToStorage) {
      clearStorageCache(config.cacheKey);
    }
  }, [config]);

  const cleanup = useCallback(() => {
    const now = Date.now();
    for (const [key, entry] of cache.current.entries()) {
      if (isExpired(entry, now)) {
        cache.current.delete(key);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { get, set, clear, cleanup };
}
```

### 6. AgentCache Utility (Storage Layer)

**File:** `/src/utils/AgentCache.ts`

**Responsibilities:**
- Multi-tier caching (memory, session, local)
- Cache persistence and hydration
- Cache size management
- TTL and expiration handling

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

type CacheTier = 'memory' | 'session' | 'local';

export class AgentCache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly maxMemoryEntries = 100;
  private readonly sessionKey = 'agentCache_session';
  private readonly localKey = 'agentCache_persistent';

  // Retrieval with tier fallback
  public get<T>(key: string): T | null {
    // Try memory first
    const memoryEntry = this.getFromMemory<T>(key);
    if (memoryEntry) return memoryEntry;

    // Try session storage
    const sessionEntry = this.getFromSession<T>(key);
    if (sessionEntry) {
      this.setInMemory(key, sessionEntry);
      return sessionEntry;
    }

    // Try local storage for frequent items
    const localEntry = this.getFromLocal<T>(key);
    if (localEntry) {
      this.setInMemory(key, localEntry);
      return localEntry;
    }

    return null;
  }

  // Storage with tier promotion
  public set<T>(key: string, data: T, ttl: number = 300000) {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccessed: Date.now()
    };

    this.setInMemory(key, entry);
    this.setInSession(key, entry);
    
    // Store frequently accessed items in local storage
    if (entry.accessCount > 5) {
      this.setInLocal(key, entry);
    }
  }

  // Cache management
  public clear(tier?: CacheTier) {
    if (!tier || tier === 'memory') {
      this.memoryCache.clear();
    }
    if (!tier || tier === 'session') {
      sessionStorage.removeItem(this.sessionKey);
    }
    if (!tier || tier === 'local') {
      localStorage.removeItem(this.localKey);
    }
  }

  public cleanup() {
    this.cleanupMemory();
    this.cleanupSession();
    this.cleanupLocal();
  }

  // Private implementation methods
  private getFromMemory<T>(key: string): T | null { ... }
  private setInMemory<T>(key: string, entry: CacheEntry<T>) { ... }
  private getFromSession<T>(key: string): T | null { ... }
  private setInSession<T>(key: string, entry: CacheEntry<T>) { ... }
  private getFromLocal<T>(key: string): T | null { ... }
  private setInLocal<T>(key: string, entry: CacheEntry<T>) { ... }
  
  private cleanupMemory() { ... }
  private cleanupSession() { ... }
  private cleanupLocal() { ... }
  
  private evictLRU() { ... }
}
```

### 7. AgentMatcher Utility (Search Logic)

**File:** `/src/utils/AgentMatcher.ts`

**Responsibilities:**
- Fuzzy search algorithms
- Relevance scoring
- Result ranking
- Performance optimization

```typescript
interface MatchResult {
  agent: Agent;
  score: number;
  matchType: 'exact' | 'starts_with' | 'contains' | 'fuzzy';
  matchedFields: string[];
}

interface MatchConfig {
  fuzzyThreshold: number;
  boostRecentUsage: boolean;
  weightByUsageCount: boolean;
  prioritizeExactMatches: boolean;
}

export class AgentMatcher {
  private config: MatchConfig;
  private recentUsageCache = new Map<string, Date>();

  constructor(config: MatchConfig) {
    this.config = config;
  }

  // Primary search method
  public searchAgents(
    query: string, 
    agents: Agent[], 
    maxResults: number = 10
  ): MatchResult[] {
    if (!query.trim()) {
      return this.getDefaultResults(agents, maxResults);
    }

    const results: MatchResult[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    for (const agent of agents) {
      const matchResult = this.matchAgent(normalizedQuery, agent);
      if (matchResult && matchResult.score > 0) {
        results.push(matchResult);
      }
    }

    return this.rankResults(results).slice(0, maxResults);
  }

  // Smart suggestions based on context
  public getSuggestions(
    context: string,
    agents: Agent[],
    maxResults: number = 5
  ): Agent[] {
    const keywords = this.extractKeywords(context);
    const scored: Array<{ agent: Agent; score: number }> = [];

    for (const agent of agents) {
      let score = 0;
      
      // Match capabilities to context keywords
      for (const keyword of keywords) {
        for (const capability of agent.capabilities) {
          if (capability.toLowerCase().includes(keyword)) {
            score += 10;
          }
        }
        if (agent.description.toLowerCase().includes(keyword)) {
          score += 5;
        }
      }

      if (score > 0) {
        scored.push({ agent, score });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .map(item => item.agent)
      .slice(0, maxResults);
  }

  // Individual agent matching
  private matchAgent(query: string, agent: Agent): MatchResult | null {
    let score = 0;
    let matchType: MatchResult['matchType'] = 'fuzzy';
    const matchedFields: string[] = [];

    // Exact name match (highest priority)
    if (agent.name.toLowerCase() === query) {
      score += 100;
      matchType = 'exact';
      matchedFields.push('name');
    }
    // Starts with match
    else if (agent.name.toLowerCase().startsWith(query)) {
      score += 80;
      matchType = 'starts_with';
      matchedFields.push('name');
    }
    // Contains match
    else if (agent.name.toLowerCase().includes(query)) {
      score += 60;
      matchType = 'contains';
      matchedFields.push('name');
    }

    // Display name matching
    const displayNameLower = agent.displayName.toLowerCase();
    if (displayNameLower.includes(query)) {
      score += 40;
      matchedFields.push('displayName');
    }

    // Description matching
    if (agent.description.toLowerCase().includes(query)) {
      score += 20;
      matchedFields.push('description');
    }

    // Capability matching
    for (const capability of agent.capabilities) {
      if (capability.toLowerCase().includes(query)) {
        score += 30;
        matchedFields.push('capabilities');
        break; // Only count once
      }
    }

    // Fuzzy matching for typos
    if (score === 0) {
      const fuzzyScore = this.calculateFuzzyScore(query, agent.name);
      if (fuzzyScore > this.config.fuzzyThreshold) {
        score = fuzzyScore;
        matchType = 'fuzzy';
        matchedFields.push('name');
      }
    }

    if (score === 0) return null;

    // Apply usage-based boosts
    score = this.applyUsageBoosts(score, agent);

    return {
      agent,
      score,
      matchType,
      matchedFields
    };
  }

  // Relevance ranking
  private rankResults(results: MatchResult[]): MatchResult[] {
    return results.sort((a, b) => {
      // Primary: match score
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      // Secondary: exact matches first
      const matchTypeOrder = { 'exact': 4, 'starts_with': 3, 'contains': 2, 'fuzzy': 1 };
      const aOrder = matchTypeOrder[a.matchType];
      const bOrder = matchTypeOrder[b.matchType];
      if (aOrder !== bOrder) {
        return bOrder - aOrder;
      }

      // Tertiary: recent usage
      const aLastUsed = a.agent.lastUsed?.getTime() || 0;
      const bLastUsed = b.agent.lastUsed?.getTime() || 0;
      if (aLastUsed !== bLastUsed) {
        return bLastUsed - aLastUsed;
      }

      // Quaternary: usage count
      return b.agent.usage_count - a.agent.usage_count;
    });
  }

  // Usage-based scoring adjustments
  private applyUsageBoosts(baseScore: number, agent: Agent): number {
    let boostedScore = baseScore;

    // Recent usage boost
    if (this.config.boostRecentUsage && agent.lastUsed) {
      const daysSince = (Date.now() - agent.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        boostedScore += 15 * (7 - daysSince) / 7;
      }
    }

    // High usage boost
    if (this.config.weightByUsageCount && agent.usage_count > 10) {
      boostedScore += Math.min(10, Math.log10(agent.usage_count) * 3);
    }

    return boostedScore;
  }

  // Fuzzy matching algorithm (simplified Levenshtein)
  private calculateFuzzyScore(query: string, target: string): number {
    const maxLength = Math.max(query.length, target.length);
    const distance = this.levenshteinDistance(query, target.toLowerCase());
    return Math.max(0, ((maxLength - distance) / maxLength) * 50);
  }

  // Levenshtein distance calculation
  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + substitutionCost, // substitution
        );
      }
    }

    return matrix[b.length][a.length];
  }

  // Extract keywords from context
  private extractKeywords(context: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    return context.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 10); // Limit for performance
  }

  // Default results for empty query
  private getDefaultResults(agents: Agent[], maxResults: number): MatchResult[] {
    return agents
      .filter(agent => agent.status === 'active')
      .sort((a, b) => {
        // Sort by recent usage, then usage count
        const aLastUsed = a.lastUsed?.getTime() || 0;
        const bLastUsed = b.lastUsed?.getTime() || 0;
        
        if (aLastUsed !== bLastUsed) {
          return bLastUsed - aLastUsed;
        }
        
        return b.usage_count - a.usage_count;
      })
      .slice(0, maxResults)
      .map(agent => ({
        agent,
        score: 50, // Base score for defaults
        matchType: 'exact' as const,
        matchedFields: ['default']
      }));
  }
}
```

### 8. TextProcessor Utility (Text Manipulation)

**File:** `/src/utils/TextProcessor.ts`

**Responsibilities:**
- Mention detection and parsing
- Text insertion and manipulation
- Cursor position management
- Mention formatting

```typescript
interface MentionPosition {
  startIndex: number;
  endIndex: number;
  query: string;
}

interface TextUpdate {
  text: string;
  cursorPosition: number;
  insertedMention?: {
    agent: MentionSuggestion;
    startIndex: number;
    endIndex: number;
  };
}

export class TextProcessor {
  // Mention detection
  public static detectMention(
    text: string, 
    cursorPosition: number
  ): MentionPosition | null {
    // Find @ symbol before cursor
    let atIndex = -1;
    for (let i = cursorPosition - 1; i >= 0; i--) {
      if (text[i] === '@') {
        atIndex = i;
        break;
      }
      if (text[i] === ' ' || text[i] === '\n') {
        break; // Hit whitespace, no mention
      }
    }

    if (atIndex === -1) return null;

    // Extract query from @ to cursor
    const query = text.substring(atIndex + 1, cursorPosition);
    
    // Validate query (no spaces/newlines)
    if (query.includes(' ') || query.includes('\n')) {
      return null;
    }

    return {
      startIndex: atIndex,
      endIndex: cursorPosition,
      query
    };
  }

  // Mention insertion
  public static insertMention(
    text: string,
    mention: MentionSuggestion,
    mentionPosition: MentionPosition
  ): TextUpdate {
    const mentionText = `@${mention.name}`;
    
    const beforeMention = text.substring(0, mentionPosition.startIndex);
    const afterMention = text.substring(mentionPosition.endIndex);
    
    const newText = beforeMention + mentionText + ' ' + afterMention;
    const newCursorPosition = mentionPosition.startIndex + mentionText.length + 1;

    return {
      text: newText,
      cursorPosition: newCursorPosition,
      insertedMention: {
        agent: mention,
        startIndex: mentionPosition.startIndex,
        endIndex: mentionPosition.startIndex + mentionText.length
      }
    };
  }

  // Extract all mentions from text
  public static extractMentions(text: string): Array<{
    name: string;
    startIndex: number;
    endIndex: number;
  }> {
    const mentions = [];
    const mentionRegex = /@([a-z0-9-]+)/g;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push({
        name: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    return mentions;
  }

  // Validate mention format
  public static isValidMention(mention: string): boolean {
    return /^@[a-z0-9-]+$/.test(mention);
  }

  // Format mention for display
  public static formatMention(
    mention: MentionSuggestion, 
    includeAt: boolean = true
  ): string {
    const prefix = includeAt ? '@' : '';
    return `${prefix}${mention.name}`;
  }
}
```

## Component Integration Points

### PostCreator Integration

```typescript
// In PostCreator component
const {
  isActive,
  suggestions,
  selectedIndex,
  loading,
  startMention,
  updateQuery,
  selectSuggestion,
  closeMentions,
  handleKeyDown
} = useMentions({
  mentionContext: 'post',
  postContent: content,
  maxSuggestions: 6,
  autoSuggest: true
});

// Use with MentionInput
<MentionInput
  value={content}
  onChange={setContent}
  onMentionSelect={selectSuggestion}
  mentionContext="post"
  // MentionInput handles the useMentions hook internally
/>
```

### QuickPost Integration

```typescript
// In QuickPost component  
const { searchMentions, getQuickMentions } = useMentionSearch({
  mentionContext: 'quick-post',
  onResults: setSuggestions,
  onError: setError,
  debounceMs: 200 // Faster for quick posts
});

// Auto-detect mentions in content
useEffect(() => {
  const mentions = TextProcessor.extractMentions(content);
  setSelectedAgents(mentions.map(m => m.name));
}, [content]);
```

### Comments Integration

```typescript
// In Comment components
const mentionService = useMemo(
  () => new MentionService({
    mentionContext: 'comment',
    maxSuggestions: 4, // Smaller for comments
    enableAnalytics: true
  }), 
  []
);
```

## Performance Considerations

### Bundle Size Optimization
- Tree-shaking friendly exports
- Dynamic imports for heavy utilities
- Separate chunks for different mention contexts

### Memory Management
- WeakMap for component references
- Automatic cache cleanup
- Bounded result sets

### Network Optimization
- Request deduplication
- Background prefetching
- Intelligent retry logic

## Error Handling Strategy

### Graceful Degradation
```typescript
// Error boundary for mention components
class MentionErrorBoundary extends Component {
  state = { hasError: false, fallbackData: [] };

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      fallbackData: MentionService.getOfflineFallback()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    MentionService.logError('MENTION_COMPONENT_ERROR', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <MentionInput 
        suggestions={this.state.fallbackData}
        offline={true}
        {...this.props}
      />;
    }

    return this.props.children;
  }
}
```

## Testing Strategy

### Unit Tests
- Individual utility functions
- Hook behavior isolation
- Service method testing
- Cache functionality

### Integration Tests
- Component + hook combinations
- API integration scenarios  
- Cross-browser compatibility
- Performance benchmarks

### E2E Tests
- User workflow scenarios
- Error recovery testing
- Accessibility validation
- Mobile responsiveness

---

*This modular architecture provides a scalable foundation for the @ mention system while maintaining clean separation of concerns and testability.*