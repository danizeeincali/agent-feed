# SPARC Specification: RealSocialMediaFeed Search Input Repositioning

## Problem Statement

The `RealSocialMediaFeed.tsx` component (the actual production component used by App.tsx) has **no search functionality at all**. Previous implementation work was done on the wrong component (`SocialMediaFeed.tsx`), which is not used in production.

### Current State
- **File**: `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`
- **Layout**: Lines 598-631 show header with title/description + refresh button, followed by FilterPanel component
- **Search**: No search input exists in this component
- **Problem**: Users cannot search posts in the production feed

### Desired State
- Add search input positioned **inline with filters** in Row 2
- **Row 1**: Title/Description + Refresh button (already exists)
- **Row 2**: Search input (left, 60-70% width) + existing filter controls (right)
- Search should be always visible (no toggle)
- Maintain existing FilterPanel functionality
- Add debounced search API integration

## Context

### Component Discovery
1. App.tsx imports: `import SocialMediaFeed from './components/RealSocialMediaFeed';`
2. RealSocialMediaFeed.tsx is the **production component**
3. SocialMediaFeed.tsx was modified by agents but is NOT used in production
4. This explains why changes weren't visible after page refresh

### Current Layout Structure (RealSocialMediaFeed.tsx)
```tsx
// Lines 598-631
<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className={`lg:col-span-2 ${className}`}>
    {/* Header - Row 1 */}
    <div className="flex justify-between items-center">
      <div>
        <h2>Agent Feed</h2>
        <p>Real-time posts from production agents</p>
      </div>
      <button onClick={handleRefresh}>Refresh</button>
    </div>

    {/* FilterPanel - separate component */}
    <FilterPanel
      currentFilter={currentFilter}
      availableAgents={filterData.agents}
      availableHashtags={filterData.hashtags}
      onFilterChange={handleFilterChange}
      postCount={total}
      onSuggestionsRequest={handleSuggestionsRequest}
      suggestionsLoading={suggestionsLoading}
      savedPostsCount={filterStats?.savedPosts || 0}
      myPostsCount={filterStats?.myPosts || 0}
      userId={userId}
    />

    {/* EnhancedPostingInterface */}
    <EnhancedPostingInterface />
  </div>
</div>
```

### Required Changes

#### 1. Add Search State
```tsx
const [search, setSearch] = useState({
  query: '',
  loading: false,
  results: [] as AgentPost[],
  hasResults: false
});
const [isSearching, setIsSearching] = useState(false);
```

#### 2. Add Debounced Search Effect
```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    if (search.query.trim()) {
      performSearch(search.query);
    } else {
      setIsSearching(false);
      loadPosts(0, false); // Reset to all posts
    }
  }, 300);

  return () => clearTimeout(timer);
}, [search.query]);
```

#### 3. Add Search API Function
```tsx
const performSearch = async (query: string) => {
  setSearch(prev => ({ ...prev, loading: true }));
  setIsSearching(true);

  try {
    const response = await apiService.searchPosts(query, {
      limit,
      offset: 0,
      filter: currentFilter.type
    });

    if (response.success && response.data) {
      setPosts(response.data.posts || []);
      setTotal(response.data.total || 0);
      setSearch(prev => ({
        ...prev,
        loading: false,
        results: response.data.posts || [],
        hasResults: (response.data.posts || []).length > 0
      }));
    }
  } catch (err) {
    console.error('Search failed:', err);
    setSearch(prev => ({ ...prev, loading: false }));
  }
};
```

#### 4. Restructure Layout (Lines 598-640)
```tsx
<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className={`lg:col-span-2 ${className}`}>
    {/* Header Container */}
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Row 1: Title/Description + Refresh */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Feed</h2>
          <p className="text-gray-600 mt-1">Real-time posts from production agents</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Row 2: Search Input + Filter Controls Integration */}
      <div className="flex items-center gap-4">
        {/* Search Input (Left, 60-70% width) */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search posts by title, content, or author..."
            value={search.query}
            onChange={(e) => setSearch(prev => ({ ...prev, query: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {search.loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
            </div>
          )}
        </div>

        {/* Note: FilterPanel will be moved inline here or converted to inline controls */}
      </div>

      {/* Search Results Info */}
      {isSearching && search.query && (
        <div className="mt-2 text-sm text-gray-600">
          {search.loading ? (
            'Searching...'
          ) : search.hasResults ? (
            `Found ${search.results.length} posts matching "${search.query}"`
          ) : (
            `No posts found matching "${search.query}"`
          )}
        </div>
      )}
    </div>

    {/* FilterPanel - May need to be refactored to inline controls */}
    <FilterPanel ... />

    {/* EnhancedPostingInterface */}
    <EnhancedPostingInterface />
  </div>
</div>
```

## Success Criteria

### Layout Criteria
- ✅ Row 1 contains title/description and refresh button
- ✅ Row 2 contains search input (left, 60-70% width) and filter controls (right)
- ✅ Search input always visible (no toggle)
- ✅ FilterPanel integration or inline replacement

### Functionality Criteria
- ✅ Search input accepts text input
- ✅ Debounced search (300ms) triggers API call
- ✅ Search integrates with existing filter state
- ✅ Loading indicator displays during search
- ✅ Search results replace posts list
- ✅ Empty search query resets to all posts

### UX Criteria
- ✅ No layout shifts during search
- ✅ Responsive across all viewports (desktop, tablet, mobile)
- ✅ Search + filter work together (combined query)
- ✅ Clear visual feedback (loading, results count)

### Testing Criteria
- ✅ Unit tests validate RealSocialMediaFeed layout structure
- ✅ Integration tests validate search + filter behavior
- ✅ E2E tests validate UI/UX with Playwright screenshots
- ✅ 100% real functionality (no mocks in final validation)
- ✅ All tests pass on production component (RealSocialMediaFeed.tsx)

## Implementation Notes

### Critical Difference from Previous Work
- **Target Component**: RealSocialMediaFeed.tsx (NOT SocialMediaFeed.tsx)
- **Verification**: Must test against http://localhost:5173 to see changes
- **Layout Difference**: RealSocialMediaFeed uses FilterPanel component + 3-column grid layout
- **Search Integration**: Must work with existing FilterPanel or refactor FilterPanel to inline controls

### FilterPanel Consideration
The existing FilterPanel component may need to be:
1. **Option A**: Kept as-is and positioned differently
2. **Option B**: Refactored to inline controls in Row 2 alongside search
3. **Option C**: Condensed to dropdown controls that fit in Row 2

Recommend investigating FilterPanel component structure before final decision.

## Timeline
- **Specification**: SPARC spec document (this file)
- **Pseudocode**: Detailed implementation design for 3 agents
- **Agent 1**: Layout restructure + search implementation + unit tests
- **Agent 2**: Integration tests for search + filter interaction
- **Agent 3**: E2E tests with Playwright screenshots
- **Validation**: All tests passing, screenshots captured, production verification

## Files Affected
- `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx` (primary target)
- New test files for RealSocialMediaFeed component
- May need to investigate/modify FilterPanel.tsx

## API Integration
- `apiService.searchPosts(query, options)` - Already exists
- Combined with existing filter state: `currentFilter.type`
- Maintains existing pagination and filter logic
