# Pseudocode Design: Search Input Repositioning

**Date**: 2025-10-04
**SPARC Phase**: Pseudocode
**Implementation Strategy**: 3 Concurrent Agents (TDD Approach)

---

## Component 1: Layout Restructure + Unit Tests (Agent 1)

### Task 1.1: Remove Search Toggle State and Button

**File**: `frontend/src/components/SocialMediaFeed.tsx`

```pseudocode
FUNCTION remove_search_toggle_state():
  // Line 100: Remove showSearch state
  LOCATE line 100: const [showSearch, setShowSearch] = useState(false);
  DELETE this line

  // Lines 570-578: Remove search toggle button
  LOCATE lines 570-578 (search toggle button block)
  DELETE entire button block:
    <button
      onClick={() => setShowSearch(!showSearch)}
      className={`p-2 rounded-lg transition-colors ${...}`}
      title="Search posts"
    >
      <Search className="h-4 w-4" />
    </button>

  VERIFY:
    - No references to `showSearch` remain
    - No references to `setShowSearch` remain
    - Search toggle button removed

  RETURN success
```

### Task 1.2: Restructure Header into Two Rows

**File**: `frontend/src/components/SocialMediaFeed.tsx`
**Lines**: 520-602

```pseudocode
FUNCTION restructure_header_layout():
  // Current structure (lines 520-602):
  // <div className="bg-white rounded-lg border p-4 mb-6">
  //   <div className="flex items-center justify-between">
  //     ... (single row with everything)
  //   </div>
  // </div>

  REPLACE lines 520-602 WITH new structure:

  <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
    {/* Row 1: Title/Description + Refresh Button */}
    <div className="flex items-center justify-between mb-4">
      {/* Left: Title and Description */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Agent Feed</h2>
        <p className="text-sm text-gray-500">
          Real-time updates from your Claude Code agents
        </p>
      </div>

      {/* Right: Refresh Button */}
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        title="Refresh feed"
      >
        <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>

    {/* Row 2: Search Input + Filter Controls */}
    <div className="flex items-center justify-between gap-4">
      {/* Left: Search Input (60-70% width) */}
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

      {/* Right: Filter/Sort Controls + Status Indicators */}
      <div className="flex items-center space-x-2">
        {/* Filter Dropdown */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Posts</option>
          <option value="high-impact">High Impact</option>
          <option value="recent">Recent</option>
          <option value="strategic">Strategic</option>
          <option value="productivity">Productivity</option>
        </select>

        {/* Sort Dropdown */}
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [newSortBy, newSortOrder] = e.target.value.split('-') as ['published_at' | 'title' | 'author', 'ASC' | 'DESC'];
            setSortBy(newSortBy);
            setSortOrder(newSortOrder);
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="published_at-DESC">Newest First</option>
          <option value="published_at-ASC">Oldest First</option>
          <option value="title-ASC">Title A-Z</option>
          <option value="title-DESC">Title Z-A</option>
          <option value="author-ASC">Author A-Z</option>
        </select>

        {/* Connection Status & Live Activity */}
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
            connectionStatus.connected
              ? 'bg-green-100 text-green-700'
              : connectionStatus.fallback
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {connectionStatus.connected ? (
              <><Database className="h-3 w-3" /> Database</>
            ) : connectionStatus.fallback ? (
              <><AlertCircle className="h-3 w-3" /> Fallback</>
            ) : (
              <><WifiOff className="h-3 w-3" /> Offline</>
            )}
          </div>
          <LiveActivityIndicator />
        </div>
      </div>
    </div>
  </div>

  VERIFY:
    - Row 1 contains: title/description (left) + refresh button (right)
    - Row 2 contains: search input (left) + filter/sort/status (right)
    - mb-4 spacing between rows
    - gap-4 spacing in Row 2
    - All class names correct
    - All event handlers preserved

  RETURN success
```

### Task 1.3: Remove Separate Search Container

**File**: `frontend/src/components/SocialMediaFeed.tsx`
**Lines**: 604-621

```pseudocode
FUNCTION remove_separate_search_container():
  // Lines 604-621: Conditional search container
  LOCATE lines 604-621:
    {/* Search Bar */}
    {showSearch && (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="relative">
          ... search input ...
        </div>
      </div>
    )}

  DELETE entire block (lines 604-621)

  VERIFY:
    - No separate search container remains
    - Search input now integrated in header Row 2
    - No conditional rendering of search

  RETURN success
```

### Task 1.4: Create Unit Tests

**File**: `frontend/src/tests/components/SocialMediaFeed.test.tsx` (new)

```pseudocode
IMPORT React, { render, screen, fireEvent, waitFor } from '@testing-library/react'
IMPORT SocialMediaFeed from '@/components/SocialMediaFeed'
IMPORT { WebSocketProvider } from '@/context/WebSocketContext'

FUNCTION MockWebSocketProvider({ children }):
  RETURN mock context with default values

DESCRIBE "SocialMediaFeed - Search Input Layout":

  TEST "should render search input without toggle button":
    // Arrange
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    // Act
    FIND search_input = screen.getByPlaceholderText(/search posts/i)
    TRY_FIND search_toggle = screen.queryByTitle(/search posts/i) // button

    // Assert
    ASSERT search_input IS_VISIBLE
    ASSERT search_toggle IS_NULL (button should not exist)


  TEST "should render search input always visible on mount":
    // Arrange
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    // Act
    WAIT for component to mount
    FIND search_input = screen.getByPlaceholderText(/search posts/i)

    // Assert
    ASSERT search_input IS_VISIBLE
    ASSERT search_input IS_ENABLED


  TEST "should have Row 1 with title and refresh button":
    // Arrange
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    // Act
    FIND title = screen.getByText(/agent feed/i)
    FIND refresh_button = screen.getByTitle(/refresh feed/i)

    GET title_parent = title.closest('div')
    GET refresh_parent = refresh_button.closest('button').parentElement
    GET common_parent = title_parent.parentElement

    // Assert
    ASSERT title EXISTS
    ASSERT refresh_button EXISTS
    ASSERT common_parent CONTAINS title_parent
    ASSERT common_parent CONTAINS refresh_parent
    // They should be in same flex container (Row 1)


  TEST "should have Row 2 with search input and filter controls":
    // Arrange
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    // Act
    FIND search_input = screen.getByPlaceholderText(/search posts/i)
    FIND filter_dropdown = screen.getByDisplayValue(/all posts/i)

    GET search_container = search_input.closest('div.relative')
    GET filter_container = filter_dropdown.closest('select')

    // Assert
    ASSERT search_container EXISTS
    ASSERT filter_container EXISTS
    // Both should be in same row


  TEST "should render filter dropdown in Row 2":
    // Arrange
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    // Act
    FIND filter_dropdown = screen.getByDisplayValue(/all posts/i)

    // Assert
    ASSERT filter_dropdown IS_VISIBLE
    ASSERT filter_dropdown.tagName EQUALS 'SELECT'


  TEST "should render sort dropdown in Row 2":
    // Arrange
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    // Act
    FIND sort_dropdown = screen.getByDisplayValue(/newest first/i)

    // Assert
    ASSERT sort_dropdown IS_VISIBLE
    ASSERT sort_dropdown.tagName EQUALS 'SELECT'


  TEST "should have correct placeholder text in search input":
    // Arrange
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    // Act
    FIND search_input = screen.getByPlaceholderText(/search posts by title, content, or author/i)

    // Assert
    ASSERT search_input EXISTS
    ASSERT search_input.placeholder CONTAINS 'Search posts'

EXPECTED RESULTS:
  - 7 unit tests created
  - All 7 tests passing
  - No existing tests broken
  - Coverage for all layout changes
```

---

## Component 2: Integration Tests (Agent 2)

### Task 2.1: Create Integration Test Suite

**File**: `frontend/src/tests/integration/search-input-layout.test.tsx` (new)

```pseudocode
IMPORT React, render, screen, fireEvent, waitFor, act from '@testing-library/react'
IMPORT userEvent from '@testing-library/user-event'
IMPORT SocialMediaFeed from '@/components/SocialMediaFeed'
IMPORT { WebSocketProvider } from '@/context/WebSocketContext'
IMPORT { apiService } from '@/services/api'

MOCK apiService.searchPosts
MOCK apiService.getPosts

DESCRIBE "Search Input Layout Integration Tests":

  TEST "should render search input on mount without user interaction":
    // Arrange
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    // Act - No interaction needed
    WAIT for initial render

    // Assert
    search_input = screen.getByPlaceholderText(/search posts/i)
    ASSERT search_input IS_IN_DOCUMENT
    ASSERT search_input IS_VISIBLE
    ASSERT search_input.value EQUALS ''


  TEST "should trigger debounced search when typing":
    // Arrange
    MOCK apiService.searchPosts TO_RETURN { posts: [], total: 0 }
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    user = userEvent.setup()
    search_input = screen.getByPlaceholderText(/search posts/i)

    // Act
    AWAIT user.type(search_input, 'test query')

    // Wait for debounce (300ms)
    AWAIT waitFor(() => {
      EXPECT(apiService.searchPosts).toHaveBeenCalledWith('test query')
    }, { timeout: 1000 })

    // Assert
    ASSERT apiService.searchPosts WAS_CALLED
    ASSERT search_input.value EQUALS 'test query'


  TEST "should allow filter dropdown to work alongside search":
    // Arrange
    MOCK apiService.getPosts TO_RETURN { posts: [], hasMore: false }
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    search_input = screen.getByPlaceholderText(/search posts/i)
    filter_dropdown = screen.getByDisplayValue(/all posts/i)

    // Act - Type in search
    fireEvent.change(search_input, { target: { value: 'test' } })

    // Change filter
    fireEvent.change(filter_dropdown, { target: { value: 'high-impact' } })

    // Assert
    ASSERT search_input.value EQUALS 'test'
    ASSERT filter_dropdown.value EQUALS 'high-impact'
    // Both should work independently


  TEST "should allow sort dropdown to work alongside search":
    // Arrange
    MOCK apiService.getPosts TO_RETURN { posts: [], hasMore: false }
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    search_input = screen.getByPlaceholderText(/search posts/i)
    sort_dropdown = screen.getByDisplayValue(/newest first/i)

    // Act - Type in search
    fireEvent.change(search_input, { target: { value: 'test' } })

    // Change sort
    fireEvent.change(sort_dropdown, { target: { value: 'title-ASC' } })

    // Assert
    ASSERT search_input.value EQUALS 'test'
    ASSERT sort_dropdown.value EQUALS 'title-ASC'


  TEST "should combine search and filter in API call":
    // Arrange
    MOCK apiService.searchPosts TO_RETURN { posts: [], total: 0 }
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    user = userEvent.setup()
    search_input = screen.getByPlaceholderText(/search posts/i)
    filter_dropdown = screen.getByDisplayValue(/all posts/i)

    // Act
    fireEvent.change(filter_dropdown, { target: { value: 'high-impact' } })
    AWAIT user.type(search_input, 'important')

    // Wait for debounced search
    AWAIT waitFor(() => {
      EXPECT(apiService.searchPosts).toHaveBeenCalled()
    }, { timeout: 1000 })

    // Assert - Both search and filter should be applied
    ASSERT apiService.searchPosts WAS_CALLED
    // Check if filter is applied in the background fetch


  TEST "should maintain stable layout during search operations":
    // Arrange
    MOCK apiService.searchPosts TO_RETURN_DELAYED { posts: [], total: 0 }, 500ms
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    user = userEvent.setup()
    search_input = screen.getByPlaceholderText(/search posts/i)

    // Capture initial position
    initial_bounds = search_input.getBoundingClientRect()

    // Act - Type and wait for search
    AWAIT user.type(search_input, 'test')
    WAIT 100ms

    // Capture position during search
    during_bounds = search_input.getBoundingClientRect()

    // Assert - Position should not shift
    ASSERT during_bounds.top EQUALS initial_bounds.top
    ASSERT during_bounds.left EQUALS initial_bounds.left


  TEST "should display loading indicator in search input during search":
    // Arrange
    MOCK apiService.searchPosts TO_RETURN_DELAYED { posts: [], total: 0 }, 1000ms
    RENDER <WebSocketProvider><SocialMediaFeed /></WebSocketProvider>

    user = userEvent.setup()
    search_input = screen.getByPlaceholderText(/search posts/i)

    // Act
    AWAIT user.type(search_input, 'loading test')

    // Wait briefly for debounce to trigger
    WAIT 400ms

    // Assert - Loading spinner should appear
    loading_spinner = screen.getByTitle(/loading/i) OR screen.getByRole('status')
    ASSERT loading_spinner EXISTS OR (
      // Check for RefreshCw icon with animate-spin class
      FIND all_refresh_icons
      SOME icon HAS class 'animate-spin'
    )

EXPECTED RESULTS:
  - 7 integration tests created
  - All 7 tests passing
  - Real component interaction tested
  - Search, filter, and sort work together
  - Duration: < 10 seconds
```

---

## Component 3: E2E Tests with Screenshots (Agent 3)

### Task 3.1: Create E2E Test Suite

**File**: `frontend/tests/e2e/core-features/search-input-layout.spec.ts` (new)

```pseudocode
IMPORT Playwright test, expect, Page, fs, path

CONSTANTS:
  FRONTEND_URL = 'http://localhost:5173'
  VIEWPORTS = {
    desktop: {width: 1920, height: 1080},
    tablet: {width: 768, height: 1024},
    mobile: {width: 375, height: 667}
  }

GLOBAL test_results = {
  layout_tests: {},
  element_positions: [],
  screenshots: [],
  issues: [],
  overall_status: 'FAIL'
}

FUNCTION navigate_to_feed(page):
  NAVIGATE to FRONTEND_URL
  WAIT for networkidle
  WAIT 2000ms for app initialization

  // Feed should be visible by default (main page)
  WAIT for page.locator('h2:has-text("Agent Feed")') to be visible

  RETURN success

FUNCTION measure_element_positions(page, viewport_name):
  // Measure Row 1 elements
  title = page.locator('h2:has-text("Agent Feed")')
  refresh_button = page.locator('button[title*="Refresh"]')

  GET title_bounds = EVALUATE(title, el => el.getBoundingClientRect())
  GET refresh_bounds = EVALUATE(refresh_button, el => el.getBoundingClientRect())

  // Measure Row 2 elements
  search_input = page.locator('input[placeholder*="Search posts"]')
  filter_dropdown = page.locator('select').first()

  GET search_bounds = EVALUATE(search_input, el => el.getBoundingClientRect())
  GET filter_bounds = EVALUATE(filter_dropdown, el => el.getBoundingClientRect())

  // Calculate alignment
  row1_top = title_bounds.top
  row2_top = search_bounds.top

  vertical_spacing = row2_top - (title_bounds.bottom)

  CREATE measurement = {
    viewport: viewport_name,
    row1: {
      title_left: title_bounds.left,
      refresh_right: refresh_bounds.right,
      height: title_bounds.height
    },
    row2: {
      search_left: search_bounds.left,
      search_width: search_bounds.width,
      filter_right: filter_bounds.right,
      height: search_bounds.height
    },
    vertical_spacing: vertical_spacing,
    elements_aligned: {
      row1_horizontal: Math.abs(title_bounds.top - refresh_bounds.top) < 5,
      row2_horizontal: Math.abs(search_bounds.top - filter_bounds.top) < 5
    }
  }

  LOG measurement details
  ADD measurement TO test_results.element_positions

  RETURN measurement

FUNCTION capture_screenshot(page, name):
  CREATE screenshot_dir = 'test-results/search-input-layout-screenshots'
  ENSURE directory exists

  CREATE screenshot_path = screenshot_dir + '/' + name + '.png'
  CAPTURE page.screenshot({path: screenshot_path, fullPage: false})

  ADD screenshot_path TO test_results.screenshots
  LOG screenshot captured

  RETURN screenshot_path

DESCRIBE "Search Input Layout E2E Tests":

  BEFORE_EACH(page):
    // No need to navigate, will be done in each test

  TEST "Desktop (1920x1080) - Search input visible and positioned correctly":
    SET timeout = 90000ms

    TRY:
      LOG 'Testing desktop layout...'

      // Arrange
      SET viewport to 1920x1080
      WAIT 1000ms

      // Act
      CALL navigate_to_feed(page)

      // Verify search input is visible without interaction
      search_input = page.locator('input[placeholder*="Search posts"]')
      WAIT for search_input to be visible (timeout: 5000ms)

      // Verify no search toggle button exists
      search_toggle = page.locator('button[title="Search posts"]')
      toggle_count = AWAIT search_toggle.count()

      // Capture screenshot
      CALL capture_screenshot(page, '1-search-layout-desktop')

      // Measure positions
      measurement = CALL measure_element_positions(page, 'desktop')

      // Assert
      IF search_input IS_VISIBLE AND toggle_count EQUALS 0 AND measurement.elements_aligned.row2_horizontal:
        test_results.layout_tests.desktop = 'PASS'
      ELSE:
        IF NOT search_input IS_VISIBLE:
          ADD ISSUE: "Desktop: Search input not visible on load"
        IF toggle_count > 0:
          ADD ISSUE: "Desktop: Search toggle button still exists"
        IF NOT measurement.elements_aligned.row2_horizontal:
          ADD ISSUE: "Desktop: Row 2 elements not horizontally aligned"
        test_results.layout_tests.desktop = 'FAIL'

    CATCH error:
      ADD ISSUE: "Desktop test failed: " + error
      CAPTURE screenshot(page, '1-desktop-error')
      test_results.layout_tests.desktop = 'FAIL'


  TEST "Mobile (375x667) - Search input visible and responsive":
    SET timeout = 90000ms

    TRY:
      LOG 'Testing mobile layout...'

      // Arrange
      SET viewport to 375x667
      WAIT 1000ms

      // Act
      CALL navigate_to_feed(page)

      // Verify search input
      search_input = page.locator('input[placeholder*="Search posts"]')
      WAIT for search_input to be visible

      // Capture screenshot
      CALL capture_screenshot(page, '2-search-layout-mobile')

      // Measure positions
      measurement = CALL measure_element_positions(page, 'mobile')

      // Assert - On mobile, elements might stack
      IF search_input IS_VISIBLE:
        test_results.layout_tests.mobile = 'PASS'
      ELSE:
        ADD ISSUE: "Mobile: Search input not visible"
        test_results.layout_tests.mobile = 'FAIL'

    CATCH error:
      ADD ISSUE: "Mobile test failed: " + error
      CAPTURE screenshot(page, '2-mobile-error')
      test_results.layout_tests.mobile = 'FAIL'


  TEST "Tablet (768x1024) - Search input visible and positioned correctly":
    SET timeout = 90000ms

    TRY:
      LOG 'Testing tablet layout...'

      // Arrange
      SET viewport to 768x1024
      WAIT 1000ms

      // Act
      CALL navigate_to_feed(page)

      // Verify search input
      search_input = page.locator('input[placeholder*="Search posts"]')
      WAIT for search_input to be visible

      // Capture screenshot
      CALL capture_screenshot(page, '3-search-layout-tablet')

      // Measure positions
      measurement = CALL measure_element_positions(page, 'tablet')

      // Assert
      IF search_input IS_VISIBLE AND measurement.elements_aligned.row2_horizontal:
        test_results.layout_tests.tablet = 'PASS'
      ELSE:
        ADD ISSUE: "Tablet: Layout issues detected"
        test_results.layout_tests.tablet = 'FAIL'

    CATCH error:
      ADD ISSUE: "Tablet test failed: " + error
      CAPTURE screenshot(page, '3-tablet-error')
      test_results.layout_tests.tablet = 'FAIL'


  TEST "Search input accepts text and shows results":
    SET timeout = 90000ms

    TRY:
      LOG 'Testing search functionality...'

      // Arrange
      SET viewport to desktop
      CALL navigate_to_feed(page)

      search_input = page.locator('input[placeholder*="Search posts"]')
      WAIT for search_input to be visible

      // Act - Type in search
      CLICK search_input
      TYPE 'test search query'

      // Wait for debounce
      WAIT 500ms

      // Capture screenshot
      CALL capture_screenshot(page, '4-search-with-text')

      // Assert
      input_value = AWAIT search_input.inputValue()
      IF input_value EQUALS 'test search query':
        test_results.layout_tests.search_input_works = 'PASS'
      ELSE:
        ADD ISSUE: "Search input does not accept text correctly"
        test_results.layout_tests.search_input_works = 'FAIL'

    CATCH error:
      ADD ISSUE: "Search input test failed: " + error
      test_results.layout_tests.search_input_works = 'FAIL'


  TEST "Filter controls are inline with search input":
    SET timeout = 90000ms

    TRY:
      LOG 'Testing filter inline positioning...'

      // Arrange
      SET viewport to desktop
      CALL navigate_to_feed(page)

      search_input = page.locator('input[placeholder*="Search posts"]')
      filter_dropdown = page.locator('select').first()

      WAIT for search_input to be visible
      WAIT for filter_dropdown to be visible

      // Get positions
      search_bounds = AWAIT search_input.boundingBox()
      filter_bounds = AWAIT filter_dropdown.boundingBox()

      // Capture screenshot
      CALL capture_screenshot(page, '5-filter-inline-with-search')

      // Assert - They should be on approximately the same horizontal line
      vertical_diff = Math.abs(search_bounds.y - filter_bounds.y)

      IF vertical_diff < 20: // Allow small difference for alignment
        test_results.layout_tests.filter_inline = 'PASS'
      ELSE:
        ADD ISSUE: "Filter not inline with search (vertical diff: " + vertical_diff + "px)"
        test_results.layout_tests.filter_inline = 'FAIL'

    CATCH error:
      ADD ISSUE: "Filter inline test failed: " + error
      test_results.layout_tests.filter_inline = 'FAIL'


  TEST "No horizontal scroll on any viewport":
    SET timeout = 120000ms

    TRY:
      LOG 'Testing horizontal scroll...'

      has_scroll_issue = FALSE

      FOR EACH viewport IN VIEWPORTS:
        LOG 'Testing ' + viewport.name

        SET viewport size
        WAIT 1000ms

        CALL navigate_to_feed(page)

        // Check for horizontal scroll
        has_horizontal_scroll = EVALUATE page:
          RETURN document.documentElement.scrollWidth > document.documentElement.clientWidth

        IF has_horizontal_scroll:
          scroll_width = GET document.documentElement.scrollWidth
          client_width = GET document.documentElement.clientWidth
          ADD ISSUE: viewport.name + ": Horizontal scroll detected"
          has_scroll_issue = TRUE
        ELSE:
          LOG viewport.name + ': No horizontal scroll ✓'

      IF has_scroll_issue:
        test_results.layout_tests.no_horizontal_scroll = 'FAIL'
      ELSE:
        test_results.layout_tests.no_horizontal_scroll = 'PASS'

    CATCH error:
      ADD ISSUE: "Horizontal scroll test failed: " + error
      test_results.layout_tests.no_horizontal_scroll = 'FAIL'


  TEST "Refresh button remains in Row 1":
    SET timeout = 90000ms

    TRY:
      LOG 'Testing refresh button position...'

      // Arrange
      SET viewport to desktop
      CALL navigate_to_feed(page)

      title = page.locator('h2:has-text("Agent Feed")')
      refresh_button = page.locator('button[title*="Refresh"]')
      search_input = page.locator('input[placeholder*="Search posts"]')

      WAIT for all elements to be visible

      // Get positions
      title_bounds = AWAIT title.boundingBox()
      refresh_bounds = AWAIT refresh_button.boundingBox()
      search_bounds = AWAIT search_input.boundingBox()

      // Capture screenshot
      CALL capture_screenshot(page, '6-refresh-button-row1')

      // Assert
      // Refresh should be on same line as title (Row 1)
      // Search should be below title (Row 2)

      refresh_on_row1 = Math.abs(title_bounds.y - refresh_bounds.y) < 20
      search_below_title = search_bounds.y > (title_bounds.y + title_bounds.height)

      IF refresh_on_row1 AND search_below_title:
        test_results.layout_tests.refresh_in_row1 = 'PASS'
      ELSE:
        ADD ISSUE: "Refresh button not in Row 1 or search not in Row 2"
        test_results.layout_tests.refresh_in_row1 = 'FAIL'

    CATCH error:
      ADD ISSUE: "Refresh button position test failed: " + error
      test_results.layout_tests.refresh_in_row1 = 'FAIL'


  AFTER_ALL:
    // Generate reports
    DETERMINE overall_status:
      IF all layout_tests PASS:
        test_results.overall_status = 'PASS'
      ELSE:
        test_results.overall_status = 'FAIL'

    WRITE JSON report to 'test-results/search-input-layout-report.json'
    WRITE Markdown report to 'test-results/search-input-layout-report.md'

    LOG test summary
    LOG element positions
    LOG screenshots captured
    LOG issues found
    LOG overall status

EXPECTED RESULTS:
  - 8 E2E tests created
  - All tests passing
  - Search visible on all viewports
  - No search toggle button exists
  - Filter controls inline with search
  - Refresh button in Row 1
  - No horizontal scroll
  - 6+ screenshots captured
  - JSON and Markdown reports generated
```

---

## Validation Checklist

### Agent 1 Success Criteria
- [ ] Line 100: `showSearch` state removed
- [ ] Lines 570-578: Search toggle button removed
- [ ] Lines 520-602: Header restructured into 2 rows
- [ ] Lines 604-621: Separate search container removed
- [ ] 7 unit tests created and passing
- [ ] No existing tests broken

### Agent 2 Success Criteria
- [ ] 7 integration tests created and passing
- [ ] Search input visible on mount
- [ ] Search + filter work together
- [ ] Layout stable during operations
- [ ] Test duration < 10 seconds

### Agent 3 Success Criteria
- [ ] 8 E2E tests created
- [ ] Screenshots on 3 viewports (desktop, tablet, mobile)
- [ ] Element position measurements validated
- [ ] No horizontal scroll detected
- [ ] Search visible without interaction
- [ ] JSON and Markdown reports generated

### Overall Success Criteria
- [ ] All 22 tests passing (7 unit + 7 integration + 8 E2E)
- [ ] Search input always visible
- [ ] No search toggle button
- [ ] Filter/sort inline with search
- [ ] Refresh in Row 1, Search in Row 2
- [ ] No layout shift or CLS issues
- [ ] Visual validation complete with screenshots
- [ ] No regressions in existing functionality
- [ ] 100% real functionality (no mocks for final validation)

---

**SPARC Phase**: Pseudocode ✅
**Next Phase**: Implementation (3 Concurrent Agents)
**Ready for**: Agent Launch
