# Pseudocode: RealSocialMediaFeed Search Input Repositioning

## Overview
This document provides detailed pseudocode for implementing search input in the **correct production component** (RealSocialMediaFeed.tsx) that is actually used by the application.

**Critical**: Target component is `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`

---

## Component 1: Agent 1 - Layout Restructure + Search Implementation + Unit Tests

### Task
1. Add search state and functionality to RealSocialMediaFeed.tsx
2. Restructure header layout to include search input in Row 2
3. Integrate search with existing filter state
4. Create unit tests for new layout structure

### Pseudocode

#### Step 1: Add Search State (After line 82)

```typescript
// File: /workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx
// Location: After line 82 (after userId state)

// Add Search icon import to line 2
import { RefreshCw, MessageCircle, AlertCircle, ChevronDown, ChevronUp, User, Bookmark, Trash2, Plus, Edit3, Search } from 'lucide-react';

// Add search state after userId state (line 82)
const [search, setSearch] = useState({
  query: '',
  loading: false,
  results: [] as AgentPost[],
  hasResults: false
});
const [isSearching, setIsSearching] = useState(false);
```

#### Step 2: Add Debounced Search Effect (After search state)

```typescript
// Add after search state declaration
useEffect(() => {
  const timer = setTimeout(() => {
    if (search.query.trim()) {
      performSearch(search.query);
    } else {
      // Empty query - reset to filtered posts
      setIsSearching(false);
      setSearch(prev => ({ ...prev, results: [], hasResults: false }));
      loadPosts(0, false);
    }
  }, 300); // 300ms debounce

  return () => clearTimeout(timer);
}, [search.query, currentFilter]);
```

#### Step 3: Add Search API Function (Before loadPosts function)

```typescript
// Add before loadPosts function (around line 94)
const performSearch = async (query: string) => {
  console.log('🔍 Performing search:', query);

  setSearch(prev => ({ ...prev, loading: true }));
  setIsSearching(true);

  try {
    // Call search API with current filter
    const response = await apiService.searchPosts(query, {
      limit,
      offset: 0,
      filter: currentFilter.type,
      agent: currentFilter.agent,
      hashtag: currentFilter.hashtag,
      agents: currentFilter.agents,
      hashtags: currentFilter.hashtags
    });

    if (response.success && response.data) {
      const searchResults = response.data.posts || [];
      setPosts(searchResults);
      setTotal(response.data.total || 0);
      setPage(0); // Reset to first page

      setSearch(prev => ({
        ...prev,
        loading: false,
        results: searchResults,
        hasResults: searchResults.length > 0
      }));
    }
  } catch (err) {
    console.error('❌ Search failed:', err);
    setSearch(prev => ({ ...prev, loading: false }));
    setError('Search failed. Please try again.');
  }
};
```

#### Step 4: Restructure Header Layout (Lines 598-631)

```typescript
// File: /workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx
// Lines 598-640: REPLACE entire header section

return (
  <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Main Feed - Left Column */}
    <div className={`lg:col-span-2 ${className}`} data-testid="real-social-media-feed">

      {/* RESTRUCTURED HEADER WITH SEARCH */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        {/* Row 1: Title/Description + Refresh Button */}
        <div className="flex items-center justify-between mb-4">
          {/* Left: Title and Description */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Agent Feed</h2>
            <p className="text-sm text-gray-500">Real-time posts from production agents</p>
          </div>

          {/* Right: Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Row 2: Search Input Only (FilterPanel stays separate below) */}
        <div className="flex items-center gap-4">
          {/* Search Input (Full width in this row) */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts by title, content, or author..."
              value={search.query}
              onChange={(e) => setSearch(prev => ({ ...prev, query: e.target.value }))}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              data-testid="search-input"
            />
            {search.loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              </div>
            )}
          </div>
        </div>

        {/* Search Results Info */}
        {isSearching && search.query && (
          <div className="mt-3 text-sm text-gray-600" data-testid="search-results-info">
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

      {/* FilterPanel - Keep as separate component below header */}
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

      {/* EnhancedPostingInterface - stays the same */}
      <EnhancedPostingInterface
        onPostCreated={handlePostCreated}
        className="mt-4"
      />

      {/* REST OF COMPONENT UNCHANGED */}
      ...
    </div>
  </div>
);
```

#### Step 5: Create Unit Tests

```typescript
// File: /workspaces/agent-feed/frontend/src/tests/components/RealSocialMediaFeed.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RealSocialMediaFeed from '@/components/RealSocialMediaFeed';

// Mock API service
vi.mock('@/services/api', () => ({
  apiService: {
    getAgentPosts: vi.fn(),
    searchPosts: vi.fn(),
    getFilterData: vi.fn(),
    getFilterStats: vi.fn(),
    // ... other mocks
  },
}));

describe('RealSocialMediaFeed - Search Input Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup mock responses
  });

  it('should render search input always visible on mount', async () => {
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading real post data/i)).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search posts by title, content, or author/i);
    expect(searchInput).toBeVisible();
    expect(searchInput).toHaveValue('');
  });

  it('should have Row 1 with title and refresh button', async () => {
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      const title = screen.getByText(/Agent Feed/i);
      const refreshButton = screen.getByTitle(/refresh feed/i);

      expect(title).toBeInTheDocument();
      expect(refreshButton).toBeInTheDocument();
    });
  });

  it('should have Row 2 with search input', async () => {
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toBeVisible();
    });
  });

  it('should render FilterPanel below header', async () => {
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      // FilterPanel should exist below the search input
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeInTheDocument();
      // FilterPanel renders its own content - verify it's present
    });
  });

  it('should have correct placeholder text', async () => {
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search posts by title, content, or author/i);
      expect(searchInput).toHaveAttribute('placeholder', 'Search posts by title, content, or author...');
    });
  });
});
```

---

## Component 2: Agent 2 - Integration Tests

### Task
Create integration tests for search functionality + filter interaction in RealSocialMediaFeed

### Pseudocode

```typescript
// File: /workspaces/agent-feed/frontend/src/tests/integration/real-search-input-layout.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import RealSocialMediaFeed from '@/components/RealSocialMediaFeed';

vi.mock('@/services/api', () => ({
  apiService: {
    getAgentPosts: vi.fn(),
    searchPosts: vi.fn(),
    getFilterData: vi.fn(),
    getFilterStats: vi.fn(),
    // ... other mocks
  }
}));

describe('RealSocialMediaFeed - Search Integration Tests', () => {
  let mockApiService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { apiService } = await import('@/services/api');
    mockApiService = apiService;

    // Setup default mock responses
    mockApiService.getAgentPosts.mockResolvedValue({
      success: true,
      data: [/* mock posts */],
      total: 2,
    });

    mockApiService.getFilterData.mockResolvedValue({
      agents: ['Agent1', 'Agent2'],
      hashtags: ['test', 'production']
    });

    mockApiService.getFilterStats.mockResolvedValue({
      totalPosts: 2,
      savedPosts: 0,
      myPosts: 0
    });

    mockApiService.searchPosts.mockResolvedValue({
      success: true,
      data: {
        posts: [/* search results */],
        total: 1
      }
    });
  });

  it('should trigger debounced search when typing', async () => {
    const user = userEvent.setup();

    mockApiService.searchPosts.mockResolvedValue({
      success: true,
      data: {
        posts: [{ id: 'search-1', title: 'Result' }],
        total: 1
      }
    });

    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading real post data/i)).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search posts/i);
    await user.type(searchInput, 'test query');

    await waitFor(() => {
      expect(mockApiService.searchPosts).toHaveBeenCalled();
    }, { timeout: 1500 });

    expect(searchInput).toHaveValue('test query');
  });

  it('should combine search and filter in API call', async () => {
    const user = userEvent.setup();

    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search posts/i);
    await user.type(searchInput, 'important');

    await waitFor(() => {
      expect(mockApiService.searchPosts).toHaveBeenCalledWith(
        'important',
        expect.objectContaining({
          limit: 20,
          offset: 0
        })
      );
    }, { timeout: 1500 });
  });

  it('should display loading indicator during search', async () => {
    const user = userEvent.setup();

    mockApiService.searchPosts.mockImplementation(
      () => new Promise(resolve =>
        setTimeout(() => resolve({
          success: true,
          data: { posts: [], total: 0 }
        }), 500)
      )
    );

    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search posts/i);
    await user.type(searchInput, 'loading test');

    await waitFor(() => {
      const spinners = document.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    }, { timeout: 1000 });
  });

  it('should maintain layout stability during search', async () => {
    const user = userEvent.setup();

    const { container } = render(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search posts/i);
    const initialBounds = searchInput.getBoundingClientRect();

    await user.type(searchInput, 'test');

    await new Promise(resolve => setTimeout(resolve, 100));

    const duringBounds = searchInput.getBoundingClientRect();
    expect(duringBounds.top).toBe(initialBounds.top);
    expect(duringBounds.left).toBe(initialBounds.left);
  });

  it('should display search results info', async () => {
    const user = userEvent.setup();

    mockApiService.searchPosts.mockResolvedValue({
      success: true,
      data: {
        posts: [{ id: '1' }, { id: '2' }],
        total: 2
      }
    });

    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search posts/i);
    await user.type(searchInput, 'test');

    await waitFor(() => {
      expect(screen.getByText(/Found 2 posts matching/i)).toBeInTheDocument();
    }, { timeout: 1500 });
  });

  it('should reset to all posts when search is cleared', async () => {
    const user = userEvent.setup();

    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search posts/i);

    // Type search
    await user.type(searchInput, 'test');
    await waitFor(() => {
      expect(mockApiService.searchPosts).toHaveBeenCalled();
    }, { timeout: 1000 });

    // Clear search
    await user.clear(searchInput);

    await waitFor(() => {
      expect(mockApiService.getAgentPosts).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});
```

---

## Component 3: Agent 3 - E2E Tests with Screenshots

### Task
Create Playwright E2E tests with screenshots validating search UI/UX in production

### Pseudocode

```typescript
// File: /workspaces/agent-feed/frontend/tests/e2e/core-features/real-search-input-layout.spec.ts

import { test, expect } from '@playwright/test';

test.describe('RealSocialMediaFeed - Search Input Layout E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Wait for feed to load
    await page.waitForSelector('[data-testid="real-social-media-feed"]', { timeout: 10000 });
  });

  test('Desktop: Search input visible and positioned correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Wait for search input
    const searchInput = page.locator('input[placeholder*="Search posts"]');
    await expect(searchInput).toBeVisible();

    // Verify it's in the header
    const header = page.locator('.bg-white.rounded-lg.border').first();
    await expect(header).toContainText('Agent Feed');

    // Take screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/real-search-desktop.png',
      fullPage: false
    });

    // Verify position measurements
    const searchBox = await searchInput.boundingBox();
    expect(searchBox).toBeTruthy();
    expect(searchBox!.y).toBeGreaterThan(50); // Below title
  });

  test('Mobile: Search input visible and responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const searchInput = page.locator('input[placeholder*="Search posts"]');
    await expect(searchInput).toBeVisible();

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/real-search-mobile.png',
      fullPage: false
    });

    // Verify no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('Tablet: Search input visible and positioned correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    const searchInput = page.locator('input[placeholder*="Search posts"]');
    await expect(searchInput).toBeVisible();

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/real-search-tablet.png',
      fullPage: false
    });
  });

  test('Search accepts text and displays loading', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts"]');

    await searchInput.fill('test query');
    await expect(searchInput).toHaveValue('test query');

    // Check for loading spinner (may appear briefly)
    await page.waitForTimeout(200);

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/real-search-typing.png',
      fullPage: false
    });
  });

  test('Search displays results info', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts"]');

    await searchInput.fill('test');

    // Wait for search results info to appear
    await page.waitForSelector('[data-testid="search-results-info"]', { timeout: 2000 });

    const resultsInfo = page.locator('[data-testid="search-results-info"]');
    await expect(resultsInfo).toBeVisible();

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/real-search-results-info.png',
      fullPage: false
    });
  });

  test('Refresh button remains in Row 1', async ({ page }) => {
    const refreshButton = page.locator('button[title="Refresh feed"]');
    await expect(refreshButton).toBeVisible();

    const title = page.locator('h2:has-text("Agent Feed")');
    await expect(title).toBeVisible();

    // Both should be in same row (similar Y position)
    const titleBox = await title.boundingBox();
    const refreshBox = await refreshButton.boundingBox();

    expect(titleBox).toBeTruthy();
    expect(refreshBox).toBeTruthy();

    // Y positions should be close (within 30px)
    expect(Math.abs(titleBox!.y - refreshBox!.y)).toBeLessThan(30);

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/real-search-row1.png',
      fullPage: false
    });
  });

  test('Element position measurements validated', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    const title = page.locator('h2:has-text("Agent Feed")');
    const refresh = page.locator('button[title="Refresh feed"]');
    const search = page.locator('input[placeholder*="Search posts"]');

    const titleBox = await title.boundingBox();
    const refreshBox = await refresh.boundingBox();
    const searchBox = await search.boundingBox();

    expect(titleBox).toBeTruthy();
    expect(refreshBox).toBeTruthy();
    expect(searchBox).toBeTruthy();

    // Title and refresh in Row 1 (similar Y)
    expect(Math.abs(titleBox!.y - refreshBox!.y)).toBeLessThan(30);

    // Search in Row 2 (lower Y than title)
    expect(searchBox!.y).toBeGreaterThan(titleBox!.y + 30);

    // Document measurements
    const measurements = {
      title: titleBox,
      refresh: refreshBox,
      search: searchBox,
      timestamp: new Date().toISOString()
    };

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/real-search-measurements.png',
      fullPage: false
    });

    console.log('✅ Measurements:', JSON.stringify(measurements, null, 2));
  });

  test('No horizontal scroll on any viewport', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);

      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width);

      await page.screenshot({
        path: `/workspaces/agent-feed/frontend/tests/e2e/screenshots/real-search-no-scroll-${viewport.name}.png`,
        fullPage: false
      });
    }
  });
});
```

---

## Component Integration Strategy

### Agent Coordination
1. **Agent 1** modifies RealSocialMediaFeed.tsx and creates unit tests
2. **Agent 2** creates integration tests (runs concurrently with Agent 1)
3. **Agent 3** creates E2E tests with screenshots (runs concurrently with Agent 1 & 2)
4. **Validation** runs after all agents complete

### File Checklist
- ✅ `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx` - Modified with search
- ✅ `/workspaces/agent-feed/frontend/src/tests/components/RealSocialMediaFeed.test.tsx` - Unit tests
- ✅ `/workspaces/agent-feed/frontend/src/tests/integration/real-search-input-layout.test.tsx` - Integration tests
- ✅ `/workspaces/agent-feed/frontend/tests/e2e/core-features/real-search-input-layout.spec.ts` - E2E tests
- ✅ Screenshots in `/workspaces/agent-feed/frontend/tests/e2e/screenshots/`

### Success Validation
1. All unit tests pass (7+ tests)
2. All integration tests pass (7+ tests)
3. All E2E tests pass (8+ tests)
4. Screenshots captured (9+ images)
5. Visual verification at http://localhost:5173 shows search input
6. No console errors
7. Search functionality works in production
