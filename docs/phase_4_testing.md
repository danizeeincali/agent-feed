# Phase 4: Testing Strategy & Implementation Plan

## Testing Overview

This document outlines the comprehensive testing strategy for the @ mention system implementation. The strategy follows Test-Driven Development (TDD) principles with London School approach, emphasizing mock-driven development and proper isolation of concerns.

## Testing Pyramid Structure

```
                    ┌─────────────────┐
                    │   E2E Tests     │ ← 10%
                    │   (Playwright)  │
                ┌───┴─────────────────┴───┐
                │  Integration Tests      │ ← 20%
                │    (Jest + RTL)         │
            ┌───┴─────────────────────────┴───┐
            │      Unit Tests                 │ ← 70%
            │  (Jest + Testing Library)       │
        └───────────────────────────────────────┘
```

## Test Categories

### 1. Unit Tests (70% Coverage Focus)

**Responsibilities:**
- Individual function behavior
- Component logic isolation  
- Hook functionality
- Utility function correctness
- Error handling paths

**Tools:**
- Jest as test runner
- @testing-library/react for React components
- @testing-library/jest-dom for assertions
- MSW (Mock Service Worker) for API mocking

### 2. Integration Tests (20% Coverage Focus)

**Responsibilities:**
- Component + hook interactions
- Service layer integration
- API communication flows
- Cache behavior across tiers
- Cross-component state sharing

### 3. E2E Tests (10% Coverage Focus)

**Responsibilities:**
- Complete user workflows
- Browser compatibility
- Performance validation
- Accessibility compliance
- Mobile responsiveness

## TDD Implementation Plan

### Phase 4A: Service Layer Tests (Week 1)

#### MentionService Tests

```typescript
// tests/services/MentionService.test.ts
describe('MentionService', () => {
  let mentionService: MentionService;
  let mockAgentService: jest.Mocked<AgentService>;
  let mockCache: jest.Mocked<AgentCache>;

  beforeEach(() => {
    mockAgentService = createMockAgentService();
    mockCache = createMockCache();
    mentionService = new MentionService({
      agentService: mockAgentService,
      cache: mockCache
    });
  });

  describe('searchMentions', () => {
    it('should return cached results when available', async () => {
      // Given
      const query = 'test';
      const cachedResults = [createMockAgent()];
      mockCache.get.mockReturnValue(cachedResults);

      // When
      const results = await mentionService.searchMentions(query, {
        mentionType: 'post'
      });

      // Then
      expect(results).toEqual(cachedResults);
      expect(mockAgentService.searchAgents).not.toHaveBeenCalled();
    });

    it('should fetch from API when cache miss', async () => {
      // Given
      const query = 'test';
      const apiResults = [createMockAgent()];
      mockCache.get.mockReturnValue(null);
      mockAgentService.searchAgents.mockResolvedValue(apiResults);

      // When
      const results = await mentionService.searchMentions(query, {
        mentionType: 'post'
      });

      // Then
      expect(mockAgentService.searchAgents).toHaveBeenCalledWith({
        query,
        limit: expect.any(Number)
      });
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        apiResults,
        expect.any(Number)
      );
    });

    it('should handle API errors gracefully', async () => {
      // Given
      mockCache.get.mockReturnValue(null);
      mockAgentService.searchAgents.mockRejectedValue(
        new Error('API Error')
      );

      // When
      const results = await mentionService.searchMentions('test', {
        mentionType: 'post'
      });

      // Then
      expect(results).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching agent suggestions')
      );
    });

    it('should generate smart suggestions based on context', async () => {
      // Given
      const postContent = 'We need code review for the new API';
      const mockAgents = [
        createMockAgent({ id: '1', capabilities: ['code-review'] }),
        createMockAgent({ id: '2', capabilities: ['testing'] })
      ];
      mockAgentService.getAllAgents.mockResolvedValue(mockAgents);

      // When
      const suggestions = await mentionService.getSmartSuggestions(
        postContent, 
        { mentionType: 'post' }
      );

      // Then
      expect(suggestions).toContainEqual(
        expect.objectContaining({ id: '1' })
      );
    });

    it('should prioritize recently used agents', async () => {
      // Given
      const recentAgent = createMockAgent({
        id: '1',
        lastUsed: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      });
      const oldAgent = createMockAgent({
        id: '2', 
        lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) // 1 week ago
      });
      mockAgentService.searchAgents.mockResolvedValue([oldAgent, recentAgent]);

      // When
      const results = await mentionService.searchMentions('test', {
        mentionType: 'post'
      });

      // Then
      expect(results[0]).toEqual(recentAgent);
    });
  });

  describe('getQuickMentions', () => {
    it('should return context-specific agents for post type', () => {
      // When
      const mentions = mentionService.getQuickMentions('post');

      // Then
      expect(mentions).toHaveLength(5);
      expect(mentions[0]).toHaveProperty('displayName');
      expect(mentions[0]).toHaveProperty('name');
    });

    it('should return different agents for comment type', () => {
      // When
      const postMentions = mentionService.getQuickMentions('post');
      const commentMentions = mentionService.getQuickMentions('comment');

      // Then
      expect(postMentions).not.toEqual(commentMentions);
    });
  });

  describe('trackMentionUsage', () => {
    it('should update agent usage statistics', async () => {
      // Given
      const agentId = 'test-agent-id';

      // When
      await mentionService.trackMentionUsage(agentId, {
        mentionType: 'post'
      });

      // Then
      expect(mockAgentService.updateAgentUsage).toHaveBeenCalledWith(agentId);
    });
  });
});
```

#### AgentService Tests

```typescript
// tests/services/AgentService.test.ts
describe('AgentService', () => {
  let agentService: AgentService;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    agentService = new AgentService('http://localhost:3001', mockHttpClient);
  });

  describe('searchAgents', () => {
    it('should make correct API call with search parameters', async () => {
      // Given
      const params = { query: 'test', limit: 10 };
      const mockResponse = {
        success: true,
        data: [createMockAgent()]
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      // When
      await agentService.searchAgents(params);

      // Then
      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/agents', {
        params: {
          q: 'test',
          limit: 10,
          include_inactive: false
        }
      });
    });

    it('should handle network errors with retry', async () => {
      // Given
      const networkError = new Error('Network Error');
      mockHttpClient.get
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({ success: true, data: [] });

      // When
      const result = await agentService.searchAgents({ query: 'test' });

      // Then
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual([]);
    });

    it('should respect rate limiting', async () => {
      // Given
      const rateLimitError = { status: 429 };
      mockHttpClient.get.mockRejectedValue(rateLimitError);

      // When & Then
      await expect(
        agentService.searchAgents({ query: 'test' })
      ).rejects.toThrow('Rate limited');
    });
  });

  describe('health monitoring', () => {
    it('should track API health status', () => {
      // Given - Fresh service instance
      expect(agentService.isHealthy()).toBe(true);

      // When - Simulate failed requests
      mockHttpClient.get.mockRejectedValue(new Error('Server Error'));
      
      // Trigger multiple failures to affect health
      for (let i = 0; i < 5; i++) {
        agentService.searchAgents({ query: 'test' }).catch(() => {});
      }

      // Then - Health should be affected
      expect(agentService.isHealthy()).toBe(false);
    });
  });
});
```

### Phase 4B: Utility Tests (Week 1)

#### AgentMatcher Tests

```typescript
// tests/utils/AgentMatcher.test.ts
describe('AgentMatcher', () => {
  let matcher: AgentMatcher;
  let mockAgents: Agent[];

  beforeEach(() => {
    matcher = new AgentMatcher({
      fuzzyThreshold: 0.3,
      boostRecentUsage: true,
      weightByUsageCount: true,
      prioritizeExactMatches: true
    });

    mockAgents = [
      createMockAgent({
        id: '1',
        name: 'code-reviewer',
        displayName: 'Code Reviewer',
        description: 'Reviews code for quality and security'
      }),
      createMockAgent({
        id: '2', 
        name: 'bug-hunter',
        displayName: 'Bug Hunter',
        description: 'Finds and tracks bugs'
      }),
      createMockAgent({
        id: '3',
        name: 'chief-of-staff',
        displayName: 'Chief of Staff', 
        description: 'Strategic coordination'
      })
    ];
  });

  describe('searchAgents', () => {
    it('should return exact matches first', () => {
      // When
      const results = matcher.searchAgents('code-reviewer', mockAgents);

      // Then
      expect(results[0].agent.name).toBe('code-reviewer');
      expect(results[0].matchType).toBe('exact');
      expect(results[0].score).toBeGreaterThan(90);
    });

    it('should handle fuzzy matching for typos', () => {
      // When
      const results = matcher.searchAgents('cod-reviewer', mockAgents); // typo

      // Then
      expect(results).toHaveLength(1);
      expect(results[0].agent.name).toBe('code-reviewer');
      expect(results[0].matchType).toBe('fuzzy');
    });

    it('should match on display name and description', () => {
      // When
      const results = matcher.searchAgents('chief', mockAgents);

      // Then
      expect(results[0].agent.displayName).toContain('Chief');
      expect(results[0].matchedFields).toContain('displayName');
    });

    it('should boost recently used agents', () => {
      // Given
      const recentAgent = { 
        ...mockAgents[1], 
        lastUsed: new Date(Date.now() - 1000 * 60 * 60) 
      };
      const testAgents = [mockAgents[0], recentAgent, mockAgents[2]];

      // When
      const results = matcher.searchAgents('bug', testAgents);

      // Then
      expect(results[0].score).toBeGreaterThan(60); // boosted score
    });

    it('should limit results to maxResults parameter', () => {
      // When
      const results = matcher.searchAgents('', mockAgents, 2);

      // Then
      expect(results).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      // When  
      const results = matcher.searchAgents('nonexistent', mockAgents);

      // Then
      expect(results).toHaveLength(0);
    });
  });

  describe('getSuggestions', () => {
    it('should suggest agents based on content keywords', () => {
      // Given
      const content = 'We need to review the new code changes';

      // When
      const suggestions = matcher.getSuggestions(content, mockAgents);

      // Then
      expect(suggestions[0].name).toBe('code-reviewer');
    });

    it('should match capabilities to context', () => {
      // Given
      const agentWithCapabilities = {
        ...mockAgents[0],
        capabilities: ['javascript', 'typescript', 'react']
      };
      const content = 'JavaScript bug in React component';

      // When
      const suggestions = matcher.getSuggestions(
        content, 
        [agentWithCapabilities]
      );

      // Then
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].id).toBe(agentWithCapabilities.id);
    });
  });
});
```

#### TextProcessor Tests

```typescript
// tests/utils/TextProcessor.test.ts
describe('TextProcessor', () => {
  describe('detectMention', () => {
    it('should detect mention at cursor position', () => {
      // Given
      const text = 'Hello @code';
      const cursor = 11; // After 'code'

      // When
      const mention = TextProcessor.detectMention(text, cursor);

      // Then
      expect(mention).toEqual({
        startIndex: 6,
        endIndex: 11,
        query: 'code'
      });
    });

    it('should return null when no @ before cursor', () => {
      // Given
      const text = 'Hello world';
      const cursor = 11;

      // When
      const mention = TextProcessor.detectMention(text, cursor);

      // Then
      expect(mention).toBeNull();
    });

    it('should handle @ at start of text', () => {
      // Given
      const text = '@chief';
      const cursor = 6;

      // When
      const mention = TextProcessor.detectMention(text, cursor);

      // Then
      expect(mention).toEqual({
        startIndex: 0,
        endIndex: 6,
        query: 'chief'
      });
    });

    it('should not detect mention with spaces', () => {
      // Given
      const text = 'Hello @ chief';
      const cursor = 13;

      // When
      const mention = TextProcessor.detectMention(text, cursor);

      // Then
      expect(mention).toBeNull();
    });
  });

  describe('insertMention', () => {
    it('should insert mention and update cursor position', () => {
      // Given
      const text = 'Hello @cod';
      const mention = createMockMentionSuggestion({ name: 'code-reviewer' });
      const position = { startIndex: 6, endIndex: 10, query: 'cod' };

      // When
      const result = TextProcessor.insertMention(text, mention, position);

      // Then
      expect(result.text).toBe('Hello @code-reviewer ');
      expect(result.cursorPosition).toBe(21); // After mention + space
      expect(result.insertedMention).toEqual({
        agent: mention,
        startIndex: 6,
        endIndex: 19
      });
    });

    it('should handle insertion in middle of text', () => {
      // Given
      const text = 'Ask @bug to check this issue';
      const mention = createMockMentionSuggestion({ name: 'bug-hunter' });
      const position = { startIndex: 4, endIndex: 8, query: 'bug' };

      // When
      const result = TextProcessor.insertMention(text, mention, position);

      // Then
      expect(result.text).toBe('Ask @bug-hunter  to check this issue');
    });
  });

  describe('extractMentions', () => {
    it('should extract all valid mentions from text', () => {
      // Given
      const text = 'Hey @code-reviewer and @bug-hunter, check this';

      // When
      const mentions = TextProcessor.extractMentions(text);

      // Then
      expect(mentions).toHaveLength(2);
      expect(mentions[0]).toEqual({
        name: 'code-reviewer',
        startIndex: 4,
        endIndex: 18
      });
      expect(mentions[1]).toEqual({
        name: 'bug-hunter', 
        startIndex: 23,
        endIndex: 34
      });
    });

    it('should ignore invalid mention formats', () => {
      // Given
      const text = 'Email me@example.com and @123invalid but @valid-agent is ok';

      // When
      const mentions = TextProcessor.extractMentions(text);

      // Then
      expect(mentions).toHaveLength(1);
      expect(mentions[0].name).toBe('valid-agent');
    });
  });

  describe('isValidMention', () => {
    it('should validate correct mention format', () => {
      expect(TextProcessor.isValidMention('@code-reviewer')).toBe(true);
      expect(TextProcessor.isValidMention('@123')).toBe(false);
      expect(TextProcessor.isValidMention('@')).toBe(false);
      expect(TextProcessor.isValidMention('code-reviewer')).toBe(false);
    });
  });
});
```

### Phase 4C: Hook Tests (Week 2)

#### useMentions Hook Tests

```typescript
// tests/hooks/useMentions.test.tsx
describe('useMentions', () => {
  const renderHook = (config: Partial<MentionHookConfig> = {}) => {
    const defaultConfig = {
      mentionContext: 'post' as const,
      debounceMs: 0, // Disable debounce for tests
      maxSuggestions: 5,
      autoSuggest: true
    };
    
    return renderHookWithProviders(() => 
      useMentions({ ...defaultConfig, ...config })
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock MentionService
    jest.spyOn(MentionService.prototype, 'searchMentions')
      .mockResolvedValue([createMockMentionSuggestion()]);
  });

  it('should initialize with default state', () => {
    // When
    const { result } = renderHook();

    // Then
    expect(result.current.isActive).toBe(false);
    expect(result.current.query).toBe('');
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.selectedIndex).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it('should activate mention mode when startMention called', async () => {
    // Given
    const { result } = renderHook();

    // When
    act(() => {
      result.current.startMention('test');
    });

    // Then
    expect(result.current.isActive).toBe(true);
    expect(result.current.query).toBe('test');
    expect(result.current.loading).toBe(true);

    // Wait for async search
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should update suggestions when query changes', async () => {
    // Given  
    const mockSuggestions = [createMockMentionSuggestion()];
    jest.spyOn(MentionService.prototype, 'searchMentions')
      .mockResolvedValue(mockSuggestions);

    const { result } = renderHook();

    // When
    act(() => {
      result.current.startMention('code');
    });

    // Then
    await waitFor(() => {
      expect(result.current.suggestions).toEqual(mockSuggestions);
    });
  });

  it('should handle keyboard navigation', () => {
    // Given
    const { result } = renderHook();
    act(() => {
      result.current.startMention('test');
    });

    // When - Arrow down
    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    act(() => {
      result.current.handleKeyDown(downEvent);
    });

    // Then
    expect(result.current.selectedIndex).toBe(1);

    // When - Arrow up
    const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    act(() => {
      result.current.handleKeyDown(upEvent);
    });

    // Then
    expect(result.current.selectedIndex).toBe(0);
  });

  it('should close mentions on Escape key', () => {
    // Given
    const { result } = renderHook();
    act(() => {
      result.current.startMention('test');
    });

    // When
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    act(() => {
      result.current.handleKeyDown(escapeEvent);
    });

    // Then
    expect(result.current.isActive).toBe(false);
    expect(result.current.query).toBe('');
  });

  it('should get smart suggestions based on context', async () => {
    // Given
    const mockSuggestions = [createMockMentionSuggestion()];
    jest.spyOn(MentionService.prototype, 'getSmartSuggestions')
      .mockResolvedValue(mockSuggestions);

    const { result } = renderHook({
      postContent: 'Need code review'
    });

    // When
    await act(async () => {
      await result.current.getSmartSuggestions();
    });

    // Then
    expect(MentionService.prototype.getSmartSuggestions)
      .toHaveBeenCalledWith('Need code review', {
        mentionType: 'post'
      });
  });
});
```

#### useAgentCache Hook Tests

```typescript
// tests/hooks/useAgentCache.test.tsx
describe('useAgentCache', () => {
  const renderCacheHook = (config: Partial<CacheHookConfig> = {}) => {
    const defaultConfig = {
      cacheKey: 'test-cache',
      ttl: 60000, // 1 minute
      maxEntries: 10,
      persistToStorage: false
    };
    
    return renderHookWithProviders(() => 
      useAgentCache({ ...defaultConfig, ...config })
    );
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should cache and retrieve data', () => {
    // Given
    const { result } = renderCacheHook();
    const testData = { id: '1', name: 'test-agent' };

    // When
    act(() => {
      result.current.set('test-key', testData);
    });

    const retrieved = result.current.get('test-key');

    // Then
    expect(retrieved).toEqual(testData);
  });

  it('should return null for expired entries', () => {
    // Given
    const { result } = renderCacheHook({ ttl: 100 }); // 100ms TTL
    const testData = { id: '1', name: 'test-agent' };

    // When
    act(() => {
      result.current.set('test-key', testData);
    });

    // Fast-forward time beyond TTL
    jest.advanceTimersByTime(200);

    const retrieved = result.current.get('test-key');

    // Then
    expect(retrieved).toBeNull();
  });

  it('should enforce max entries limit', () => {
    // Given
    const { result } = renderCacheHook({ maxEntries: 2 });

    // When
    act(() => {
      result.current.set('key1', 'data1');
      result.current.set('key2', 'data2'); 
      result.current.set('key3', 'data3'); // Should evict key1
    });

    // Then
    expect(result.current.get('key1')).toBeNull();
    expect(result.current.get('key2')).toBe('data2');
    expect(result.current.get('key3')).toBe('data3');
  });

  it('should persist to storage when configured', () => {
    // Given
    const { result } = renderCacheHook({ persistToStorage: true });
    const testData = { id: '1', name: 'test-agent' };

    // When
    act(() => {
      result.current.set('test-key', testData);
    });

    // Then
    const stored = localStorage.getItem('test-cache_test-key');
    expect(JSON.parse(stored!).data).toEqual(testData);
  });

  it('should cleanup on unmount', () => {
    // Given
    const { result, unmount } = renderCacheHook({ ttl: 100 });
    
    act(() => {
      result.current.set('key1', 'data1');
    });

    // Fast-forward to expire
    jest.advanceTimersByTime(200);

    // When
    unmount();

    // Then - Should not cause memory leaks
    expect(() => result.current.get('key1')).not.toThrow();
  });
});
```

### Phase 4D: Component Tests (Week 2)

#### MentionInput Component Tests

```typescript  
// tests/components/MentionInput.test.tsx
describe('MentionInput', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    mentionContext: 'post' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock MentionService
    jest.spyOn(MentionService, 'getQuickMentions')
      .mockReturnValue([createMockMentionSuggestion()]);
    jest.spyOn(MentionService, 'searchMentions')
      .mockResolvedValue([createMockMentionSuggestion()]);
  });

  it('should render textarea with correct props', () => {
    // When
    render(<MentionInput {...defaultProps} placeholder="Type here" />);

    // Then
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('placeholder', 'Type here');
  });

  it('should show dropdown on @ character', async () => {
    // Given
    const onChange = jest.fn();
    render(<MentionInput {...defaultProps} onChange={onChange} />);
    
    const textarea = screen.getByRole('textbox');

    // When
    await user.type(textarea, '@');

    // Then
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  it('should filter suggestions based on query', async () => {
    // Given
    const mockSuggestions = [
      createMockMentionSuggestion({ name: 'code-reviewer' }),
      createMockMentionSuggestion({ name: 'bug-hunter' })
    ];
    jest.spyOn(MentionService, 'searchMentions')
      .mockResolvedValue(mockSuggestions);

    render(<MentionInput {...defaultProps} />);
    const textarea = screen.getByRole('textbox');

    // When
    await user.type(textarea, '@code');

    // Then
    await waitFor(() => {
      expect(MentionService.searchMentions)
        .toHaveBeenCalledWith('code', { maxSuggestions: 6 });
    });
  });

  it('should handle keyboard navigation in dropdown', async () => {
    // Given
    render(<MentionInput {...defaultProps} />);
    const textarea = screen.getByRole('textbox');

    await user.type(textarea, '@');
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // When - Arrow down
    await user.keyboard('{ArrowDown}');

    // Then
    const options = screen.getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('should insert mention on Enter key', async () => {
    // Given
    const onChange = jest.fn();
    const onMentionSelect = jest.fn();
    
    render(
      <MentionInput 
        {...defaultProps}
        onChange={onChange}
        onMentionSelect={onMentionSelect}
      />
    );
    
    const textarea = screen.getByRole('textbox');

    // When
    await user.type(textarea, '@code');
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    
    await user.keyboard('{Enter}');

    // Then
    expect(onChange).toHaveBeenCalledWith(
      expect.stringMatching(/@[\w-]+\s/)
    );
    expect(onMentionSelect).toHaveBeenCalled();
  });

  it('should close dropdown on Escape', async () => {
    // Given
    render(<MentionInput {...defaultProps} />);
    const textarea = screen.getByRole('textbox');

    await user.type(textarea, '@');
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // When
    await user.keyboard('{Escape}');

    // Then
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('should handle click outside to close', async () => {
    // Given
    render(
      <div>
        <MentionInput {...defaultProps} />
        <button>Outside</button>
      </div>
    );
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '@');
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // When
    await user.click(screen.getByRole('button', { name: 'Outside' }));

    // Then
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('should show loading state during search', async () => {
    // Given
    let resolveSearch: (value: any) => void;
    const searchPromise = new Promise(resolve => {
      resolveSearch = resolve;
    });
    
    jest.spyOn(MentionService, 'searchMentions')
      .mockReturnValue(searchPromise);

    render(<MentionInput {...defaultProps} />);
    const textarea = screen.getByRole('textbox');

    // When
    await user.type(textarea, '@test');

    // Then
    await waitFor(() => {
      expect(screen.getByText('Loading agents...')).toBeInTheDocument();
    });

    // Cleanup
    resolveSearch([]);
  });

  it('should handle no results gracefully', async () => {
    // Given
    jest.spyOn(MentionService, 'searchMentions')
      .mockResolvedValue([]);

    render(<MentionInput {...defaultProps} />);
    const textarea = screen.getByRole('textbox');

    // When
    await user.type(textarea, '@nonexistent');

    // Then
    await waitFor(() => {
      expect(screen.getByText(/No agents found/)).toBeInTheDocument();
    });
  });
});
```

### Phase 4E: Integration Tests (Week 3)

#### PostCreator Integration Tests

```typescript
// tests/integration/PostCreator.integration.test.tsx
describe('PostCreator Integration', () => {
  const mockApiServer = setupServer(
    rest.get('/api/v1/agents', (req, res, ctx) => {
      return res(ctx.json({
        success: true,
        data: [createMockAgent()]
      }));
    }),
    
    rest.post('/api/v1/agent-posts', (req, res, ctx) => {
      return res(ctx.json({
        success: true,
        data: { id: '123', ...req.body }
      }));
    })
  );

  beforeAll(() => mockApiServer.listen());
  afterEach(() => mockApiServer.resetHandlers());
  afterAll(() => mockApiServer.close());

  it('should complete full mention workflow', async () => {
    // Given
    const onPostCreated = jest.fn();
    render(<PostCreator onPostCreated={onPostCreated} />);

    // When - Fill form with mentions
    const titleInput = screen.getByLabelText(/title/i);
    const contentInput = screen.getByLabelText(/content/i);

    await user.type(titleInput, 'Code Review Request');
    await user.type(contentInput, 'Please review @code-reviewer this PR');

    // Trigger mention dropdown
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // Select mention
    await user.keyboard('{Enter}');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /publish post/i });
    await user.click(submitButton);

    // Then
    await waitFor(() => {
      expect(onPostCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '123',
          title: 'Code Review Request'
        })
      );
    });
  });

  it('should handle API errors gracefully', async () => {
    // Given
    mockApiServer.use(
      rest.get('/api/v1/agents', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    render(<PostCreator />);

    // When
    const contentInput = screen.getByLabelText(/content/i);
    await user.type(contentInput, '@test');

    // Then
    await waitFor(() => {
      // Should show fallback agents or empty state
      expect(screen.queryByText('Loading agents...')).not.toBeInTheDocument();
    });
  });

  it('should persist draft with mentions', async () => {
    // Given
    const { rerender } = render(<PostCreator />);

    // When - Type content with mention
    const titleInput = screen.getByLabelText(/title/i);
    const contentInput = screen.getByLabelText(/content/i);
    
    await user.type(titleInput, 'Draft Title');
    await user.type(contentInput, 'Ask @bug-hunter about this issue');

    // Complete the mention
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    await user.keyboard('{Enter}');

    // Wait for auto-save
    await waitFor(() => {
      expect(screen.getByText(/draft saved/i)).toBeInTheDocument();
    });

    // Simulate page refresh
    rerender(<PostCreator />);

    // Then - Draft should be restored
    await waitFor(() => {
      expect(screen.getByDisplayValue('Draft Title')).toBeInTheDocument();
      expect(screen.getByText(/ask @bug-hunter/i)).toBeInTheDocument();
    });
  });
});
```

#### QuickPost Integration Tests

```typescript
// tests/integration/QuickPost.integration.test.tsx
describe('QuickPost Integration', () => {
  it('should auto-detect mentions and submit', async () => {
    // Given
    const onPostCreated = jest.fn();
    render(<QuickPostSection onPostCreated={onPostCreated} />);

    // When
    const contentInput = screen.getByPlaceholderText(/quick update/i);
    await user.type(contentInput, 'Hey @chief-of-staff, the project is done!');

    const submitButton = screen.getByRole('button', { name: /quick post/i });
    await user.click(submitButton);

    // Then
    await waitFor(() => {
      expect(onPostCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            agentMentions: ['chief-of-staff']
          })
        })
      );
    });
  });

  it('should handle hashtags and mentions together', async () => {
    // Given  
    render(<QuickPostSection />);

    // When
    const contentInput = screen.getByPlaceholderText(/quick update/i);
    await user.type(contentInput, '#urgent @bug-hunter found critical issue');

    // Then
    await waitFor(() => {
      // Should auto-detect both tags and mentions
      expect(screen.getByText('#urgent')).toHaveClass('bg-blue-100');
      // Agent button should be active  
      const agentButtons = screen.getAllByText(/bug.*hunter/i);
      expect(agentButtons[0]).toHaveClass('bg-purple-100');
    });
  });
});
```

### Phase 4F: E2E Tests (Week 3)

#### Playwright E2E Tests

```typescript
// e2e/mention-system.spec.ts
import { test, expect } from '@playwright/test';

test.describe('@ Mention System E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Setup authentication if needed
  });

  test('should complete full mention workflow in PostCreator', async ({ page }) => {
    // Navigate to post creation
    await page.click('[data-testid="create-post-button"]');
    
    // Fill form
    await page.fill('[data-testid="post-title"]', 'Code Review Request');
    
    // Start typing mention
    const contentField = page.locator('[data-testid="post-content"]');
    await contentField.fill('Please review ');
    await contentField.type('@code');
    
    // Wait for dropdown
    await expect(page.locator('[data-testid="mention-dropdown"]')).toBeVisible();
    
    // Verify suggestions appear
    await expect(page.locator('[data-testid="mention-option"]').first()).toBeVisible();
    
    // Select first suggestion with keyboard
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // Verify mention was inserted
    await expect(contentField).toHaveValue('Please review @code-reviewer ');
    
    // Submit post
    await page.click('[data-testid="submit-post"]');
    
    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('should handle mobile touch interactions', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');
    
    // Navigate to quick post
    await page.click('[data-testid="quick-post-tab"]');
    
    // Type on mobile
    const contentField = page.locator('[data-testid="quick-post-content"]');
    await contentField.tap();
    await contentField.fill('@bu');
    
    // Tap suggestion
    await expect(page.locator('[data-testid="mention-dropdown"]')).toBeVisible();
    await page.locator('[data-testid="mention-option"]').first().tap();
    
    // Verify insertion
    await expect(contentField).toHaveValue('@bug-hunter ');
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    // Block agents API  
    await context.route('**/api/v1/agents**', route => {
      route.fulfill({ status: 500 });
    });
    
    // Try to use mentions
    await page.click('[data-testid="create-post-button"]');
    const contentField = page.locator('[data-testid="post-content"]');
    await contentField.fill('@test');
    
    // Should show error state but not crash
    await expect(page.locator('[data-testid="mention-error"]')).toBeVisible();
    await expect(contentField).toBeEditable();
  });

  test('should persist draft across page refreshes', async ({ page }) => {
    // Create draft
    await page.click('[data-testid="create-post-button"]');
    await page.fill('[data-testid="post-title"]', 'My Draft');
    await page.fill('[data-testid="post-content"]', 'Content with @bug-hunter mention');
    
    // Wait for auto-save
    await expect(page.locator('[data-testid="draft-saved"]')).toBeVisible();
    
    // Refresh page  
    await page.reload();
    
    // Verify draft restored
    await page.click('[data-testid="create-post-button"]');
    await expect(page.locator('[data-testid="post-title"]')).toHaveValue('My Draft');
    await expect(page.locator('[data-testid="post-content"]')).toHaveValue('Content with @bug-hunter mention');
  });

  test('should meet accessibility requirements', async ({ page }) => {
    await page.click('[data-testid="create-post-button"]');
    const contentField = page.locator('[data-testid="post-content"]');
    
    // Start mention
    await contentField.fill('@test');
    
    // Check ARIA attributes
    const dropdown = page.locator('[data-testid="mention-dropdown"]');
    await expect(dropdown).toHaveAttribute('role', 'listbox');
    
    const options = page.locator('[data-testid="mention-option"]');
    await expect(options.first()).toHaveAttribute('role', 'option');
    
    // Test keyboard navigation
    await page.keyboard.press('ArrowDown');
    await expect(options.first()).toHaveAttribute('aria-selected', 'true');
    
    // Test screen reader announcements
    await page.keyboard.press('Enter');
    // Verify content was inserted and announced
  });

  test('should perform well with large agent lists', async ({ page }) => {
    // Mock large agent dataset
    await page.route('**/api/v1/agents', route => {
      const agents = Array.from({ length: 1000 }, (_, i) => ({
        id: `agent-${i}`,
        name: `agent-${i}`,
        displayName: `Agent ${i}`,
        description: `Test agent ${i}`
      }));
      
      route.fulfill({
        json: { success: true, data: agents }
      });
    });
    
    await page.click('[data-testid="create-post-button"]');
    const contentField = page.locator('[data-testid="post-content"]');
    
    // Measure search performance
    const start = Date.now();
    await contentField.fill('@agent');
    
    await expect(page.locator('[data-testid="mention-dropdown"]')).toBeVisible();
    const end = Date.now();
    
    // Should respond within reasonable time
    expect(end - start).toBeLessThan(1000);
    
    // Should limit results
    const options = page.locator('[data-testid="mention-option"]');
    await expect(options).toHaveCount(6); // Max suggestions
  });
});
```

## Performance Testing

### Load Testing with Artillery

```yaml
# load-test.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120  
      arrivalRate: 50
      name: "Mention search load"

scenarios:
  - name: "Agent search"
    weight: 80
    flow:
      - get:
          url: "/api/v1/agents?q={{ $randomString() }}"
          
  - name: "Heavy mention usage"
    weight: 20
    flow:
      - post:
          url: "/api/v1/agent-posts"
          json:
            title: "Test post"
            content: "Mentioning @{{ $randomString() }}"
            authorAgent: "user-agent"
```

### Lighthouse CI Integration

```yaml
# .github/workflows/performance.yml
name: Performance Tests
on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        
      - name: Build app
        run: npm run build
        
      - name: Start server
        run: npm start &
        
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

## Test Coverage Requirements

### Minimum Coverage Thresholds
```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 85, 
        "lines": 85,
        "statements": 85
      },
      "./src/services/": {
        "branches": 90,
        "functions": 95,
        "lines": 95,
        "statements": 95
      },
      "./src/hooks/": {
        "branches": 85,
        "functions": 90,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

### Quality Gates
- All tests must pass before merge
- Coverage thresholds must be met
- E2E tests must pass on Chrome, Firefox, Safari
- Performance budgets must not be exceeded
- Accessibility tests must pass

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Mention System Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v1

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npx playwright install
      - run: npm run build
      - run: npm run test:e2e

  accessibility:
    runs-on: ubuntu-latest  
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - run: npm run test:a11y
```

## Implementation Timeline

### Week 1: Foundation
- Day 1-2: Service layer tests (MentionService, AgentService)
- Day 3-4: Utility tests (AgentMatcher, TextProcessor, Cache)
- Day 5: Service implementations guided by TDD

### Week 2: Components & Hooks
- Day 1-2: Hook tests (useMentions, useAgentCache, useMentionSearch)
- Day 3-4: Component tests (MentionInput enhancements)
- Day 5: Integration between hooks and components

### Week 3: Integration & E2E
- Day 1-2: Component integration tests
- Day 3-4: E2E test scenarios
- Day 5: Performance and accessibility validation

### Week 4: Polish & Deployment
- Day 1-2: Bug fixes based on test results
- Day 3-4: Performance optimization
- Day 5: Production deployment with monitoring

---

*This testing strategy ensures comprehensive coverage while maintaining development velocity through Test-Driven Development practices.*