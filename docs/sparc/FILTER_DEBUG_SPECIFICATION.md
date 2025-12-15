# SPARC Filter Debug Specification

## Problem Analysis

### Critical Issues Identified

1. **Advanced Filter Returns No Results**
   - Multi-select filter with agents/hashtags returns empty results
   - Filter combinations not working correctly
   - API call parameters may be malformed

2. **Unable to Return to "All Posts"**
   - Clear filter button not resetting state properly
   - Filter state persistence issues
   - Component state synchronization problems

### Current Architecture Issues

#### FilterPanel Component (Line 132-160)
```typescript
const applyMultiSelectFilter = () => {
  // Issues found:
  // 1. Missing userId in filter object
  // 2. Incomplete filter structure for API
  // 3. No proper state reset mechanism
  const filterToApply = {
    type: 'multi-select',
    agents: tempFilter.agents || [],
    hashtags: tempFilter.hashtags || [],
    combinationMode: tempFilter.combinationMode || 'AND',
    savedPostsEnabled: tempFilter.savedPostsEnabled || false,
    myPostsEnabled: tempFilter.myPostsEnabled || false
    // MISSING: userId field required by API
  };
}
```

#### API Service Filter Mapping (Line 386-397)
```typescript
case 'multi-select':
  if ((filter.agents && filter.agents.length > 0) || (filter.hashtags && filter.hashtags.length > 0)) {
    params.set('filter', 'multi-select');
    if (filter.agents && filter.agents.length > 0) {
      params.set('agents', filter.agents.join(','));
    }
    if (filter.hashtags && filter.hashtags.length > 0) {
      params.set('hashtags', filter.hashtags.join(','));
    }
    params.set('mode', filter.combinationMode || 'AND');
    // ISSUE: Not handling savedPostsEnabled and myPostsEnabled flags
  }
```

### Root Cause Analysis

1. **Incomplete Multi-Select Filter Implementation**
   - savedPostsEnabled and myPostsEnabled not passed to API
   - userId missing from filter context
   - Filter parameters not correctly mapped to backend expectations

2. **State Management Issues**
   - Clear filter not resetting all component states
   - Temporary filter state not properly synchronized
   - Component re-render issues

3. **API Integration Problems**
   - Backend expects different parameter structure than frontend sends
   - Missing error handling for malformed requests
   - No fallback mechanism for failed filters

### Expected User Workflow

1. User clicks "Advanced Filter"
2. Selects multiple agents/hashtags
3. Toggles saved posts/my posts
4. Clicks "Apply Filter" → **FAILS: Returns no results**
5. User tries to clear filter → **FAILS: Cannot return to all posts**

### Success Criteria

1. **Multi-Select Filter Must Work**
   - Filter by multiple agents AND/OR hashtags
   - Include saved posts and my posts toggles
   - Return correct filtered results

2. **Clear Filter Must Work**
   - Reset to "All Posts" state
   - Clear all temporary selections
   - Refresh post list correctly

3. **Real Browser Validation Required**
   - No mocks or simulations
   - Test actual API calls
   - Verify database queries execute correctly

## Technical Implementation Requirements

### Frontend Fixes Needed

1. **FilterPanel.tsx - applyMultiSelectFilter**
   - Add missing userId to filter object
   - Ensure all filter flags are included
   - Add error handling and validation

2. **API Service - getFilteredPosts**
   - Handle savedPostsEnabled and myPostsEnabled parameters
   - Fix parameter mapping for backend
   - Add comprehensive error handling

3. **State Management**
   - Fix clear filter functionality
   - Ensure proper state synchronization
   - Add loading states during filter operations

### Backend Verification Needed

1. **Multi-Select Endpoint**
   - Verify /api/v1/agent-posts handles multi-select filters
   - Check database query generation
   - Ensure saved posts and my posts queries work

2. **Parameter Handling**
   - Verify backend accepts frontend parameter format
   - Check user_id handling for saved/my posts
   - Validate combination mode logic (AND/OR)

### Testing Strategy

1. **Real Browser Tests**
   - Playwright tests with real database
   - API integration tests
   - User workflow simulation

2. **Database Query Validation**
   - Verify SQL generation for multi-select
   - Test saved posts queries
   - Validate combination logic

3. **Error Scenario Testing**
   - Empty results handling
   - Invalid filter parameters
   - Network failure recovery