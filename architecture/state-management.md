# @ Mention System - State Management Architecture

## State Management Philosophy

The @ mention system uses a hybrid state management approach combining:
- **React Context** for system-wide configuration and shared state
- **useReducer** for complex component state management
- **Custom hooks** for business logic encapsulation
- **Local storage** for persistence
- **WebSocket subscriptions** for real-time updates

## Global State Architecture

### MentionContext Provider
```typescript
interface MentionGlobalState {
  // Configuration
  config: MentionConfig;
  
  // Global caches
  agentCache: Map<string, AgentDetails>;
  userCache: Map<string, UserDetails>;
  searchCache: LRUCache<string, MentionSuggestion[]>;
  
  // Real-time data
  agentStatusMap: Map<string, AgentStatus>;
  onlineAgents: Set<string>;
  
  // User preferences
  recentMentions: RecentMention[];
  favoriteAgents: string[];
  defaultFilters: FilterOptions;
}

const MentionContext = createContext<{
  state: MentionGlobalState;
  dispatch: Dispatch<MentionGlobalAction>;
  api: MentionAPI;
}>({} as any);

// Provider component
export const MentionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(mentionGlobalReducer, initialState);
  const api = useMentionAPI(dispatch);
  
  useEffect(() => {
    // Initialize WebSocket connections
    const wsManager = new MentionWebSocketManager(api.wsUrl);
    wsManager.subscribe((update) => dispatch(update));
    
    // Load persisted state
    loadPersistedState().then((persisted) => {
      dispatch({ type: 'HYDRATE_STATE', payload: persisted });
    });
    
    return () => wsManager.disconnect();
  }, []);
  
  return (
    <MentionContext.Provider value={{ state, dispatch, api }}>
      {children}
    </MentionContext.Provider>
  );
};
```

## Component-Level State Management

### MentionInput State
```typescript
interface MentionInputState {
  // Input state
  text: string;
  cursorPosition: number;
  selection: TextSelection;
  
  // Search state
  currentQuery: string;
  isSearching: boolean;
  searchResults: MentionSuggestion[];
  
  // UI state
  isDropdownOpen: boolean;
  selectedSuggestionIndex: number;
  dropdownPosition: DropdownPosition;
  
  // Filter state
  activeFilters: FilterType[];
  groupBy: GroupByType;
  sortBy: SortByType;
  
  // Error state
  error: MentionError | null;
  retryCount: number;
}

type MentionInputAction =
  | { type: 'SET_TEXT'; payload: string }
  | { type: 'SET_CURSOR_POSITION'; payload: number }
  | { type: 'TRIGGER_SEARCH'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: MentionSuggestion[] }
  | { type: 'OPEN_DROPDOWN'; payload: DropdownPosition }
  | { type: 'CLOSE_DROPDOWN' }
  | { type: 'SELECT_SUGGESTION'; payload: number }
  | { type: 'SET_FILTERS'; payload: FilterType[] }
  | { type: 'SET_ERROR'; payload: MentionError }
  | { type: 'CLEAR_ERROR' };

const mentionInputReducer = (state: MentionInputState, action: MentionInputAction): MentionInputState => {
  switch (action.type) {
    case 'SET_TEXT':
      return {
        ...state,
        text: action.payload,
        currentQuery: extractMentionQuery(action.payload, state.cursorPosition)
      };
      
    case 'TRIGGER_SEARCH':
      return {
        ...state,
        currentQuery: action.payload,
        isSearching: true,
        error: null
      };
      
    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        searchResults: action.payload,
        isSearching: false,
        isDropdownOpen: action.payload.length > 0
      };
      
    case 'SELECT_SUGGESTION':
      return {
        ...state,
        selectedSuggestionIndex: action.payload
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isSearching: false,
        retryCount: state.retryCount + 1
      };
      
    default:
      return state;
  }
};
```

## Custom Hooks Architecture

### useMentionInput Hook
```typescript
export const useMentionInput = (
  initialText: string = '',
  options: MentionInputOptions = {}
) => {
  const { state: globalState, dispatch: globalDispatch, api } = useMentionContext();
  const [state, dispatch] = useReducer(mentionInputReducer, {
    text: initialText,
    cursorPosition: 0,
    selection: { start: 0, end: 0 },
    currentQuery: '',
    isSearching: false,
    searchResults: [],
    isDropdownOpen: false,
    selectedSuggestionIndex: -1,
    dropdownPosition: { x: 0, y: 0 },
    activeFilters: options.defaultFilters || [],
    groupBy: options.defaultGroupBy || 'type',
    sortBy: options.defaultSortBy || 'relevance',
    error: null,
    retryCount: 0
  });
  
  // Debounced search effect
  useEffect(() => {
    if (state.currentQuery.length < 2) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
      return;
    }
    
    const searchTimeout = setTimeout(async () => {
      dispatch({ type: 'TRIGGER_SEARCH', payload: state.currentQuery });
      
      try {
        const results = await api.searchMentions(state.currentQuery, {
          filters: state.activeFilters,
          groupBy: state.groupBy,
          sortBy: state.sortBy,
          maxResults: options.maxResults || 10
        });
        
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: new MentionError('Search failed', error) 
        });
      }
    }, 300);
    
    return () => clearTimeout(searchTimeout);
  }, [state.currentQuery, state.activeFilters, state.groupBy, state.sortBy]);
  
  // Keyboard navigation handlers
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!state.isDropdownOpen) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        dispatch({ 
          type: 'SELECT_SUGGESTION', 
          payload: Math.min(state.selectedSuggestionIndex + 1, state.searchResults.length - 1)
        });
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        dispatch({ 
          type: 'SELECT_SUGGESTION', 
          payload: Math.max(state.selectedSuggestionIndex - 1, 0)
        });
        break;
        
      case 'Enter':
        event.preventDefault();
        if (state.selectedSuggestionIndex >= 0) {
          selectMention(state.searchResults[state.selectedSuggestionIndex]);
        }
        break;
        
      case 'Escape':
        dispatch({ type: 'CLOSE_DROPDOWN' });
        break;
    }
  }, [state.isDropdownOpen, state.selectedSuggestionIndex, state.searchResults]);
  
  const selectMention = useCallback((mention: MentionSuggestion) => {
    const newText = insertMention(state.text, state.cursorPosition, mention);
    dispatch({ type: 'SET_TEXT', payload: newText });
    dispatch({ type: 'CLOSE_DROPDOWN' });
    
    // Update global recent mentions
    globalDispatch({ 
      type: 'ADD_RECENT_MENTION', 
      payload: { ...mention, usedAt: new Date() }
    });
  }, [state.text, state.cursorPosition]);
  
  return {
    state,
    actions: {
      setText: (text: string) => dispatch({ type: 'SET_TEXT', payload: text }),
      setCursorPosition: (pos: number) => dispatch({ type: 'SET_CURSOR_POSITION', payload: pos }),
      setFilters: (filters: FilterType[]) => dispatch({ type: 'SET_FILTERS', payload: filters }),
      selectMention,
      handleKeyDown
    }
  };
};
```

### useMentionSearch Hook
```typescript
export const useMentionSearch = () => {
  const { state, api } = useMentionContext();
  
  const searchWithCache = useCallback(async (
    query: string, 
    options: SearchOptions
  ): Promise<MentionSuggestion[]> => {
    const cacheKey = `${query}:${JSON.stringify(options)}`;
    
    // Check cache first
    if (state.searchCache.has(cacheKey)) {
      return state.searchCache.get(cacheKey)!;
    }
    
    // Perform search
    const results = await api.searchMentions(query, options);
    
    // Update cache
    state.searchCache.set(cacheKey, results);
    
    return results;
  }, [state.searchCache, api]);
  
  return { searchWithCache };
};
```

## State Persistence Strategy

### Local Storage Integration
```typescript
interface PersistedMentionState {
  recentMentions: RecentMention[];
  favoriteAgents: string[];
  defaultFilters: FilterOptions;
  searchHistory: string[];
  userPreferences: UserPreferences;
}

class MentionStateManager {
  private readonly STORAGE_KEY = 'mention-system-state';
  private readonly VERSION = '1.0';
  
  async saveState(state: Partial<MentionGlobalState>): Promise<void> {
    const persistedState: PersistedMentionState = {
      recentMentions: state.recentMentions || [],
      favoriteAgents: state.favoriteAgents || [],
      defaultFilters: state.defaultFilters || {},
      searchHistory: this.getSearchHistory(state),
      userPreferences: state.config?.userPreferences || {}
    };
    
    const serialized = JSON.stringify({
      version: this.VERSION,
      timestamp: Date.now(),
      data: persistedState
    });
    
    localStorage.setItem(this.STORAGE_KEY, serialized);
  }
  
  async loadState(): Promise<Partial<MentionGlobalState>> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return {};
      
      const parsed = JSON.parse(stored);
      if (parsed.version !== this.VERSION) {
        // Handle version migration
        return this.migrateState(parsed);
      }
      
      return this.hydrateState(parsed.data);
    } catch (error) {
      console.warn('Failed to load mention state:', error);
      return {};
    }
  }
  
  private hydrateState(data: PersistedMentionState): Partial<MentionGlobalState> {
    return {
      recentMentions: data.recentMentions,
      favoriteAgents: data.favoriteAgents,
      defaultFilters: data.defaultFilters,
      config: {
        ...defaultConfig,
        userPreferences: data.userPreferences
      }
    };
  }
}
```

## Real-time State Synchronization

### WebSocket State Updates
```typescript
class MentionStateSync {
  constructor(
    private dispatch: Dispatch<MentionGlobalAction>,
    private wsManager: MentionWebSocketManager
  ) {
    this.setupSubscriptions();
  }
  
  private setupSubscriptions() {
    this.wsManager.on('agent_status_update', (update) => {
      this.dispatch({
        type: 'UPDATE_AGENT_STATUS',
        payload: {
          agentId: update.agentId,
          status: update.status,
          lastSeen: update.lastSeen
        }
      });
    });
    
    this.wsManager.on('agent_capabilities_changed', (update) => {
      this.dispatch({
        type: 'UPDATE_AGENT_CAPABILITIES',
        payload: {
          agentId: update.agentId,
          capabilities: update.capabilities
        }
      });
    });
    
    this.wsManager.on('new_agent_available', (agent) => {
      this.dispatch({
        type: 'ADD_AGENT',
        payload: agent
      });
    });
  }
}
```

## Performance Optimizations

### State Update Batching
```typescript
// Batch multiple state updates to prevent excessive re-renders
const useBatchedDispatch = () => {
  const { dispatch } = useMentionContext();
  const batchedUpdates = useRef<MentionGlobalAction[]>([]);
  
  const batchDispatch = useCallback((action: MentionGlobalAction) => {
    batchedUpdates.current.push(action);
    
    // Flush batched updates on next tick
    queueMicrotask(() => {
      if (batchedUpdates.current.length > 0) {
        dispatch({
          type: 'BATCH_UPDATE',
          payload: batchedUpdates.current
        });
        batchedUpdates.current = [];
      }
    });
  }, [dispatch]);
  
  return batchDispatch;
};
```

### Memory Management
```typescript
// Cleanup stale state and prevent memory leaks
const useMentionCleanup = () => {
  const { state, dispatch } = useMentionContext();
  
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Remove old search cache entries
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutes
      
      dispatch({
        type: 'CLEANUP_CACHE',
        payload: { maxAge, timestamp: now }
      });
      
      // Limit recent mentions to last 50
      if (state.recentMentions.length > 50) {
        dispatch({
          type: 'TRIM_RECENT_MENTIONS',
          payload: 50
        });
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(cleanupInterval);
  }, [state.recentMentions.length]);
};
```

This state management architecture provides a robust, performant, and maintainable foundation for the @ mention system while integrating seamlessly with the existing AgentLink platform.