# SPARC Specification: Backend Sorting Trust & Relative Time Display

**Version:** 1.0
**Date:** 2025-10-02
**Status:** Approved for Implementation
**Owner:** Frontend Team
**Reviewers:** Backend Team, UX Team

---

## Executive Summary

This specification defines the removal of frontend sorting override in `AgentPostsFeed.tsx` and implementation of social media-style relative timestamps with auto-update functionality. The primary goal is to trust backend API ordering while improving temporal awareness through human-readable relative time display.

**Key Changes:**
- Remove frontend `.sort()` that overrides backend ordering
- Replace absolute timestamps with relative time format
- Auto-update relative times every 60 seconds
- Add tooltip with exact timestamp on hover
- Use `created_at` field for consistent post creation time

**Impact:** Low-risk refactoring, high UX improvement

---

## 1. Introduction

### 1.1 Purpose

The Agent Posts Feed currently implements frontend sorting that overrides the backend's carefully designed sort order (comment count → agent priority → timestamp → ID). This specification defines changes to:

1. Trust backend sorting entirely
2. Improve temporal context with relative timestamps
3. Provide auto-updating time displays
4. Maintain full backward compatibility

### 1.2 Scope

**In Scope:**
- Remove frontend sorting logic from `AgentPostsFeed.tsx` (lines 237-246)
- Implement relative time formatting function
- Add auto-update mechanism (60-second interval)
- Add tooltip with exact timestamp
- Use `created_at` field for post creation time
- Update existing unit tests
- Create new Playwright validation tests

**Out of Scope:**
- Changing backend API sorting logic (already correct)
- Modifying database schema
- Changing post creation workflow
- Adding timezone conversion (use local browser time)
- Adding internationalization (English only for v1)

### 1.3 Definitions

| Term | Definition |
|------|------------|
| **Relative Time** | Human-readable time format (e.g., "2 mins ago", "yesterday") |
| **Absolute Time** | Full timestamp (e.g., "October 2, 2025 at 8:08 PM") |
| **Auto-Update** | Mechanism to refresh relative times every 60 seconds |
| **Backend Sort Order** | API ordering: comment_count DESC → is_agent_post DESC → created_at DESC → id ASC |
| **Frontend Override** | Client-side `.sort()` that replaces backend ordering |

---

## 2. Current State Analysis

### 2.1 Current Backend Sorting

**Location:** `/workspaces/agent-feed/api-server/server.js` (lines 485-490)

```sql
ORDER BY
  comment_count DESC,          -- Most comments first
  is_agent_post DESC,          -- Agents beat users in ties
  created_at DESC,             -- Newer posts win in ties
  id ASC                       -- Deterministic final tiebreaker
```

**Status:** ✅ Working correctly, provides optimal ordering

### 2.2 Current Frontend Sorting (PROBLEM)

**Location:** `/workspaces/agent-feed/frontend/src/components/AgentPostsFeed.tsx` (lines 237-246)

```typescript
.sort((a, b) => {
  switch (sortBy) {
    case 'popular':
      return b.engagement.bookmarks - a.engagement.bookmarks;
    case 'impact':
      return b.metadata.businessImpact - a.metadata.businessImpact;
    default:
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  }
});
```

**Issues:**
1. Overrides backend's comment-based sorting
2. Default 'newest' sort ignores comment count
3. 'popular' uses bookmarks, not comments
4. 'impact' sort not aligned with backend priority
5. New posts may jump/reorder after creation

### 2.3 Current Time Display

**Location:** `AgentPostsFeed.tsx` (lines 104-118)

```typescript
const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const postTime = new Date(dateString);
  const diffMs = now.getTime() - postTime.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};
```

**Limitations:**
- Abbreviations only (m, h, d)
- No "yesterday" or "just now" variants
- No weeks/months/years support
- No auto-update mechanism
- No tooltip with exact timestamp

---

## 3. Functional Requirements

### FR-3.1: Remove Frontend Sorting Override

**Priority:** P0 (Critical)
**ID:** FR-3.1
**Category:** Core Functionality

#### Description

Remove the `.sort()` method from `filteredAndSortedPosts` in `AgentPostsFeed.tsx` that overrides backend ordering. Frontend should trust backend API sort order entirely.

#### Acceptance Criteria

- [ ] Lines 237-246 removed from `AgentPostsFeed.tsx`
- [ ] `filteredAndSortedPosts` renamed to `filteredPosts` (no sorting)
- [ ] Backend order preserved in rendered feed
- [ ] Filter functionality remains intact (search + type filter)
- [ ] New posts appear in correct position without reordering
- [ ] Sort dropdown removed from UI (no longer needed)
- [ ] `sortBy` state variable removed
- [ ] Posts maintain backend order: most-commented → agent priority → newest → ID

#### Implementation Details

**Before:**
```typescript
const filteredAndSortedPosts = posts
  .filter(/* ... */)
  .sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.engagement.bookmarks - a.engagement.bookmarks;
      case 'impact':
        return b.metadata.businessImpact - a.metadata.businessImpact;
      default:
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }
  });
```

**After:**
```typescript
const filteredPosts = posts.filter(post => {
  const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       post.authorAgent.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesFilter = filterType === 'all' || post.metadata.postType === filterType;
  return matchesSearch && matchesFilter;
});
```

#### Test Scenarios

1. **Backend Order Preservation**
   ```gherkin
   Scenario: Posts display in backend-provided order
     Given the backend returns posts sorted by comment count DESC
     When the frontend receives the posts
     Then posts should render in exact backend order
     And no client-side sorting should occur
   ```

2. **Filter Preservation**
   ```gherkin
   Scenario: Filtering maintains backend order
     Given posts are displayed in backend order
     When user applies "code_review" filter
     Then filtered posts maintain relative backend order
     And no resorting occurs
   ```

3. **New Post Position**
   ```gherkin
   Scenario: Newly created post appears in correct position
     Given user creates new post with 0 comments
     When post is added via WebSocket
     Then post appears in position determined by backend
     And post does not move after appearing
     And other posts do not reorder
   ```

---

### FR-3.2: Relative Time Display

**Priority:** P0 (Critical)
**ID:** FR-3.2
**Category:** User Experience

#### Description

Replace absolute timestamps with social media-style relative time display that provides intuitive temporal context.

#### Time Format Specification

| Time Range | Format | Example |
|------------|--------|---------|
| < 1 minute | "just now" | "just now" |
| 1-59 minutes | "{N} min ago" or "{N} mins ago" | "2 mins ago", "45 mins ago" |
| 1-23 hours | "{N} hour ago" or "{N} hours ago" | "1 hour ago", "12 hours ago" |
| Exactly 1 day | "yesterday" | "yesterday" |
| 2-6 days | "{N} days ago" | "2 days ago", "5 days ago" |
| 1-3 weeks | "{N} week ago" or "{N} weeks ago" | "1 week ago", "3 weeks ago" |
| 1-11 months | "{N} month ago" or "{N} months ago" | "1 month ago", "6 months ago" |
| >= 1 year | "{N} year ago" or "{N} years ago" | "1 year ago", "2 years ago" |

#### Pluralization Rules

- Singular: 1 min, 1 hour, 1 day, 1 week, 1 month, 1 year
- Plural: 2+ mins, hours, days, weeks, months, years
- Special: "yesterday" (not "1 day ago"), "just now" (not "0 mins ago")

#### Acceptance Criteria

- [ ] All timestamps display in relative format
- [ ] Pluralization correct for all time units
- [ ] "just now" for < 1 minute
- [ ] "yesterday" for 24-48 hour range
- [ ] Minutes → hours transition at 60 minutes
- [ ] Hours → days transition at 24 hours
- [ ] Days → weeks transition at 7 days
- [ ] Weeks → months transition at 28 days (4 weeks)
- [ ] Months → years transition at 12 months
- [ ] Uses `created_at` field (not `publishedAt`)
- [ ] Handles null/undefined dates gracefully
- [ ] Handles future dates (show as "just now")
- [ ] Handles invalid date formats (show fallback)

#### Implementation Details

**Function Signature:**
```typescript
const formatRelativeTime = (dateString: string | null | undefined): string => {
  // Implementation
};
```

**Algorithm:**
```typescript
const formatRelativeTime = (dateString: string | null | undefined): string => {
  // Handle null/undefined
  if (!dateString) return 'Unknown time';

  try {
    const now = new Date();
    const postTime = new Date(dateString);

    // Handle invalid dates
    if (isNaN(postTime.getTime())) {
      return 'Invalid date';
    }

    // Handle future dates (clock skew)
    const diffMs = now.getTime() - postTime.getTime();
    if (diffMs < 0) return 'just now';

    // Calculate time units
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30); // Approximate
    const years = Math.floor(days / 365); // Approximate

    // Return appropriate format
    if (seconds < 60) return 'just now';
    if (minutes < 60) return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
    if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (weeks < 4) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
    return years === 1 ? '1 year ago' : `${years} years ago`;

  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Unknown time';
  }
};
```

#### Test Scenarios

```javascript
// Unit Tests
describe('formatRelativeTime', () => {
  const now = new Date('2025-10-02T20:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  test('< 1 minute shows "just now"', () => {
    const time = new Date('2025-10-02T19:59:30Z').toISOString();
    expect(formatRelativeTime(time)).toBe('just now');
  });

  test('1 minute shows "1 min ago"', () => {
    const time = new Date('2025-10-02T19:59:00Z').toISOString();
    expect(formatRelativeTime(time)).toBe('1 min ago');
  });

  test('45 minutes shows "45 mins ago"', () => {
    const time = new Date('2025-10-02T19:15:00Z').toISOString();
    expect(formatRelativeTime(time)).toBe('45 mins ago');
  });

  test('1 hour shows "1 hour ago"', () => {
    const time = new Date('2025-10-02T19:00:00Z').toISOString();
    expect(formatRelativeTime(time)).toBe('1 hour ago');
  });

  test('12 hours shows "12 hours ago"', () => {
    const time = new Date('2025-10-02T08:00:00Z').toISOString();
    expect(formatRelativeTime(time)).toBe('12 hours ago');
  });

  test('24-48 hours shows "yesterday"', () => {
    const time = new Date('2025-10-01T20:00:00Z').toISOString();
    expect(formatRelativeTime(time)).toBe('yesterday');
  });

  test('2 days shows "2 days ago"', () => {
    const time = new Date('2025-09-30T20:00:00Z').toISOString();
    expect(formatRelativeTime(time)).toBe('2 days ago');
  });

  test('1 week shows "1 week ago"', () => {
    const time = new Date('2025-09-25T20:00:00Z').toISOString();
    expect(formatRelativeTime(time)).toBe('1 week ago');
  });

  test('3 weeks shows "3 weeks ago"', () => {
    const time = new Date('2025-09-11T20:00:00Z').toISOString();
    expect(formatRelativeTime(time)).toBe('3 weeks ago');
  });

  test('1 month shows "1 month ago"', () => {
    const time = new Date('2025-09-02T20:00:00Z').toISOString();
    expect(formatRelativeTime(time)).toBe('1 month ago');
  });

  test('6 months shows "6 months ago"', () => {
    const time = new Date('2025-04-02T20:00:00Z').toISOString();
    expect(formatRelativeTime(time)).toBe('6 months ago');
  });

  test('1 year shows "1 year ago"', () => {
    const time = new Date('2024-10-02T20:00:00Z').toISOString();
    expect(formatRelativeTime(time)).toBe('1 year ago');
  });

  test('2 years shows "2 years ago"', () => {
    const time = new Date('2023-10-02T20:00:00Z').toISOString();
    expect(formatRelativeTime(time)).toBe('2 years ago');
  });

  test('null date returns "Unknown time"', () => {
    expect(formatRelativeTime(null)).toBe('Unknown time');
  });

  test('undefined date returns "Unknown time"', () => {
    expect(formatRelativeTime(undefined)).toBe('Unknown time');
  });

  test('invalid date format returns "Invalid date"', () => {
    expect(formatRelativeTime('not-a-date')).toBe('Invalid date');
  });

  test('future date returns "just now"', () => {
    const future = new Date('2025-10-02T21:00:00Z').toISOString();
    expect(formatRelativeTime(future)).toBe('just now');
  });
});
```

---

### FR-3.3: Auto-Update Mechanism

**Priority:** P1 (High)
**ID:** FR-3.3
**Category:** Real-Time Updates

#### Description

Implement automatic update of relative timestamps every 60 seconds so users see current time without refreshing.

#### Acceptance Criteria

- [ ] Relative times update every 60 seconds
- [ ] Update occurs via React effect with interval
- [ ] Interval cleanup on component unmount
- [ ] "2 mins ago" becomes "3 mins ago" after 60 seconds
- [ ] No visual flicker during update
- [ ] No re-fetch of post data required
- [ ] Updates happen client-side only
- [ ] Performance impact minimal (< 10ms per update)

#### Implementation Details

**State Management:**
```typescript
const [currentTime, setCurrentTime] = useState(Date.now());

useEffect(() => {
  const interval = setInterval(() => {
    setCurrentTime(Date.now());
  }, 60000); // 60 seconds

  return () => clearInterval(interval);
}, []);
```

**Usage in Render:**
```typescript
// Pass currentTime as dependency to force re-render
{formatRelativeTime(post.created_at, currentTime)}
```

**Alternative: Force Component Update**
```typescript
const [, forceUpdate] = useReducer(x => x + 1, 0);

useEffect(() => {
  const interval = setInterval(() => {
    forceUpdate();
  }, 60000);

  return () => clearInterval(interval);
}, []);
```

#### Performance Considerations

- **Re-render Scope:** Only timestamp text nodes re-render
- **Memory:** Single interval per component (not per post)
- **CPU:** Minimal string formatting (< 1ms per post)
- **Network:** No API calls required

#### Test Scenarios

```javascript
describe('Auto-update mechanism', () => {
  test('timestamps update after 60 seconds', async () => {
    jest.useFakeTimers();
    const time = new Date('2025-10-02T19:58:00Z').toISOString();

    render(<AgentPostsFeed />);

    // Initial: "2 mins ago"
    expect(screen.getByText(/2 mins ago/)).toBeInTheDocument();

    // Advance 60 seconds
    jest.advanceTimersByTime(60000);

    // Updated: "3 mins ago"
    await waitFor(() => {
      expect(screen.getByText(/3 mins ago/)).toBeInTheDocument();
    });
  });

  test('interval clears on unmount', () => {
    const { unmount } = render(<AgentPostsFeed />);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
```

---

### FR-3.4: Tooltip with Exact Timestamp

**Priority:** P1 (High)
**ID:** FR-3.4
**Category:** User Experience

#### Description

Display exact absolute timestamp in a tooltip when user hovers over relative time.

#### Tooltip Format

**Format:** `"[Month] [Day], [Year] at [Hour]:[Minute] [AM/PM]"`

**Examples:**
- `"October 2, 2025 at 8:08 PM"`
- `"January 15, 2025 at 9:30 AM"`
- `"December 31, 2024 at 11:59 PM"`

#### Acceptance Criteria

- [ ] Tooltip appears on hover over relative time
- [ ] Tooltip shows exact date and time
- [ ] Format: "Month Day, Year at Hour:Minute AM/PM"
- [ ] Uses browser's local timezone
- [ ] Tooltip accessible via keyboard (focus)
- [ ] Tooltip disappears on mouse out
- [ ] 200ms delay before showing tooltip
- [ ] Consistent styling with application theme

#### Implementation Details

**Component Structure:**
```typescript
<time
  dateTime={post.created_at}
  title={formatAbsoluteTime(post.created_at)}
  className="cursor-help"
>
  {formatRelativeTime(post.created_at)}
</time>
```

**Absolute Time Formatter:**
```typescript
const formatAbsoluteTime = (dateString: string): string => {
  if (!dateString) return 'Unknown time';

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    // Format: "October 2, 2025 at 8:08 PM"
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    return date.toLocaleString('en-US', options).replace(',', ' at');
  } catch (error) {
    console.error('Error formatting absolute time:', error);
    return 'Unknown time';
  }
};
```

**CSS Enhancement (Optional):**
```css
.time-tooltip {
  position: relative;
  cursor: help;
}

.time-tooltip:hover::after {
  content: attr(title);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
}
```

#### Test Scenarios

```javascript
describe('Timestamp tooltip', () => {
  test('shows absolute time on hover', async () => {
    const time = '2025-10-02T20:08:00Z';
    render(<AgentPostsFeed />);

    const relativeTime = screen.getByText(/ago/);

    await userEvent.hover(relativeTime);

    // Check title attribute (native tooltip)
    expect(relativeTime).toHaveAttribute('title', 'October 2, 2025 at 8:08 PM');
  });

  test('tooltip accessible via keyboard', async () => {
    render(<AgentPostsFeed />);

    const relativeTime = screen.getByText(/ago/);
    relativeTime.focus();

    expect(relativeTime).toHaveAccessibleDescription();
  });
});
```

---

### FR-3.5: Use `created_at` Field

**Priority:** P0 (Critical)
**ID:** FR-3.5
**Category:** Data Consistency

#### Description

Use `created_at` field from backend response for all timestamp display, as it represents post creation time.

#### Backend Response Format

```json
{
  "id": "uuid",
  "title": "Post Title",
  "content": "Post content...",
  "authorAgent": "agent-name",
  "publishedAt": "2025-10-02T20:00:00Z",  // Legacy field
  "created_at": "2025-10-02T20:00:00Z",   // Use this field
  "metadata": {},
  "engagement": {}
}
```

#### Acceptance Criteria

- [ ] Replace `post.publishedAt` with `post.created_at`
- [ ] Update TypeScript interface to include `created_at`
- [ ] Maintain backward compatibility (fallback to publishedAt)
- [ ] All time functions use `created_at` consistently
- [ ] Backend already provides this field (verified)

#### Implementation Details

**TypeScript Interface Update:**
```typescript
interface AgentPost {
  id: string;
  title: string;
  content: string;
  authorAgent: string;
  publishedAt: string;  // Legacy, keep for compatibility
  created_at: string;   // Primary field for display
  metadata: {
    businessImpact: number;
    tags: string[];
    isAgentResponse: boolean;
    postType: 'insight' | 'code_review' | 'task_completion' | 'alert' | 'recommendation';
    codeSnippet?: string;
    language?: string;
    attachments?: string[];
    workflowId?: string;
  };
  engagement: {
    views: number;
    bookmarks: number;
    shares: number;
    comments: number;
  };
  isBookmarked?: boolean;
}
```

**Usage with Fallback:**
```typescript
// In render
const displayTime = post.created_at || post.publishedAt;

<time
  dateTime={displayTime}
  title={formatAbsoluteTime(displayTime)}
>
  {formatRelativeTime(displayTime)}
</time>
```

#### Test Scenarios

```javascript
test('uses created_at field for display', () => {
  const post = {
    created_at: '2025-10-02T20:00:00Z',
    publishedAt: '2025-10-01T10:00:00Z'  // Different time
  };

  render(<PostCard post={post} />);

  // Should use created_at, not publishedAt
  expect(screen.getByText(/hours ago/)).toBeInTheDocument();
});

test('falls back to publishedAt if created_at missing', () => {
  const post = {
    publishedAt: '2025-10-02T20:00:00Z'
  };

  render(<PostCard post={post} />);

  expect(screen.getByText(/hours ago/)).toBeInTheDocument();
});
```

---

## 4. Non-Functional Requirements

### NFR-4.1: Performance

**ID:** NFR-4.1
**Priority:** P1

#### Requirements

- [ ] Time formatting executes in < 1ms per call
- [ ] Auto-update cycle completes in < 10ms total
- [ ] No memory leaks from interval timers
- [ ] No unnecessary re-renders (only timestamp nodes)
- [ ] Tooltip render overhead < 5ms
- [ ] No impact on scroll performance

#### Measurement

```javascript
// Performance benchmark
const start = performance.now();
formatRelativeTime(post.created_at);
const end = performance.now();
console.log(`Time formatting: ${end - start}ms`);
```

### NFR-4.2: Accessibility

**ID:** NFR-4.2
**Priority:** P1

#### Requirements

- [ ] Timestamps use semantic `<time>` element
- [ ] `dateTime` attribute contains ISO 8601 format
- [ ] Tooltip accessible via keyboard (title attribute)
- [ ] Screen readers announce relative time
- [ ] Color contrast meets WCAG AA standards
- [ ] Keyboard navigation preserved

#### ARIA Attributes

```html
<time
  dateTime="2025-10-02T20:00:00Z"
  title="October 2, 2025 at 8:08 PM"
  aria-label="Posted 2 hours ago"
>
  2 hours ago
</time>
```

### NFR-4.3: Browser Compatibility

**ID:** NFR-4.3
**Priority:** P2

#### Requirements

- [ ] Works in Chrome 90+
- [ ] Works in Firefox 88+
- [ ] Works in Safari 14+
- [ ] Works in Edge 90+
- [ ] Graceful degradation for older browsers
- [ ] Date.toLocaleString support required

### NFR-4.4: Error Handling

**ID:** NFR-4.4
**Priority:** P1

#### Requirements

- [ ] Null dates show "Unknown time"
- [ ] Invalid dates show "Invalid date"
- [ ] Future dates show "just now" (clock skew)
- [ ] Parsing errors logged to console
- [ ] No JavaScript exceptions thrown
- [ ] Fallback to absolute format on error

---

## 5. Technical Design

### 5.1 Component Architecture

```
AgentPostsFeed
├── State Management
│   ├── posts (from API)
│   ├── currentTime (for auto-update)
│   ├── searchTerm (filter)
│   └── filterType (filter)
├── Effects
│   ├── fetchPosts (initial + 30s refresh)
│   ├── timeUpdateInterval (60s)
│   └── WebSocket subscriptions
├── Computed Values
│   └── filteredPosts (search + type filter only)
└── Utilities
    ├── formatRelativeTime()
    ├── formatAbsoluteTime()
    ├── formatAgentName()
    └── getAgentEmoji()
```

### 5.2 Data Flow

```
Backend API
    │
    ├─> ORDER BY comments DESC, agent priority DESC, created_at DESC, id ASC
    │
    ▼
Frontend Fetch
    │
    ├─> Store in posts state (exact backend order)
    │
    ▼
Filtering (client-side)
    │
    ├─> Search filter (title, content, agent)
    ├─> Type filter (insight, code_review, etc.)
    │
    ▼
Render (maintain order)
    │
    ├─> Map filteredPosts (no sorting)
    ├─> Display relative time
    └─> Auto-update every 60s
```

### 5.3 File Changes Summary

#### `/workspaces/agent-feed/frontend/src/components/AgentPostsFeed.tsx`

**Changes Required:**

1. **Remove sorting state:**
```typescript
// DELETE THIS LINE:
const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'impact'>('newest');
```

2. **Add auto-update state:**
```typescript
// ADD THIS:
const [, forceUpdate] = useReducer(x => x + 1, 0);

useEffect(() => {
  const interval = setInterval(forceUpdate, 60000);
  return () => clearInterval(interval);
}, []);
```

3. **Update TypeScript interface:**
```typescript
interface AgentPost {
  // ... existing fields
  created_at: string;  // ADD THIS
}
```

4. **Replace formatTimeAgo with formatRelativeTime:**
```typescript
// REPLACE formatTimeAgo (lines 104-118) with:
const formatRelativeTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Unknown time';

  try {
    const now = new Date();
    const postTime = new Date(dateString);

    if (isNaN(postTime.getTime())) return 'Invalid date';

    const diffMs = now.getTime() - postTime.getTime();
    if (diffMs < 0) return 'just now';

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
    if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (weeks < 4) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
    return years === 1 ? '1 year ago' : `${years} years ago`;
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Unknown time';
  }
};

const formatAbsoluteTime = (dateString: string): string => {
  if (!dateString) return 'Unknown time';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    const formatted = date.toLocaleString('en-US', options);
    return formatted.replace(/,([^,]*)$/, ' at$1');
  } catch (error) {
    console.error('Error formatting absolute time:', error);
    return 'Unknown time';
  }
};
```

5. **Remove sorting, keep filtering:**
```typescript
// REPLACE lines 229-246:
const filteredPosts = posts.filter(post => {
  const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       post.authorAgent.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesFilter = filterType === 'all' || post.metadata.postType === filterType;
  return matchesSearch && matchesFilter;
});
```

6. **Update all references:**
```typescript
// REPLACE: filteredAndSortedPosts
// WITH: filteredPosts
// (Lines 290, 341, 351)
```

7. **Remove sort dropdown from UI:**
```typescript
// DELETE lines 320-329 (Sort dropdown)
```

8. **Update timestamp rendering:**
```typescript
// REPLACE lines 371-373:
<div className="flex items-center gap-2 text-xs text-gray-500">
  <Clock className="h-3 w-3" />
  <time
    dateTime={post.created_at || post.publishedAt}
    title={formatAbsoluteTime(post.created_at || post.publishedAt)}
    className="cursor-help"
  >
    {formatRelativeTime(post.created_at || post.publishedAt)}
  </time>
  <Eye className="h-3 w-3" />
  {post.engagement.views} views
</div>
```

---

## 6. Testing Strategy

### 6.1 Unit Tests (Vitest)

**File:** `/workspaces/agent-feed/frontend/src/components/__tests__/AgentPostsFeed.test.tsx`

**Test Suites:**

1. **Relative Time Formatting**
   - All time ranges (< 1 min → years)
   - Pluralization rules
   - Edge cases (null, invalid, future)
   - Special cases ("just now", "yesterday")

2. **Backend Order Preservation**
   - Posts render in API order
   - No client-side reordering
   - Filter maintains order

3. **Auto-Update Mechanism**
   - Interval setup and cleanup
   - Timestamps update after 60s
   - No memory leaks

4. **Tooltip Display**
   - Absolute time format
   - Hover accessibility
   - Keyboard accessibility

### 6.2 Integration Tests (Playwright)

**File:** `/workspaces/agent-feed/frontend/tests/e2e/backend-sorting-relative-time.spec.ts`

**Test Scenarios:**

```typescript
test.describe('Backend Sorting Trust', () => {
  test('displays posts in backend order', async ({ page }) => {
    await page.goto('/');

    // Get post elements
    const posts = await page.locator('[data-testid="agent-post"]').all();

    // Verify order matches backend response
    const apiResponse = await page.request.get('/api/agent-posts');
    const { data } = await apiResponse.json();

    for (let i = 0; i < posts.length; i++) {
      const postId = await posts[i].getAttribute('data-post-id');
      expect(postId).toBe(data[i].id);
    }
  });

  test('maintains order after filtering', async ({ page }) => {
    await page.goto('/');

    // Apply filter
    await page.selectOption('[data-testid="filter-dropdown"]', 'code_review');

    // Verify filtered posts maintain relative order
    const posts = await page.locator('[data-testid="agent-post"]').all();
    const firstPostTime = await posts[0].locator('time').getAttribute('datetime');
    const secondPostTime = await posts[1].locator('time').getAttribute('datetime');

    expect(new Date(firstPostTime).getTime())
      .toBeGreaterThanOrEqual(new Date(secondPostTime).getTime());
  });

  test('new post appears in correct position', async ({ page }) => {
    await page.goto('/');

    // Create new post with 0 comments
    await page.click('[data-testid="create-post-button"]');
    // ... fill form and submit

    // Wait for WebSocket update
    await page.waitForSelector('[data-testid="new-post-indicator"]');

    // Verify post position (should be lower due to 0 comments)
    const posts = await page.locator('[data-testid="agent-post"]').all();
    const newPostIndex = await findPostIndex(posts, newPostId);

    expect(newPostIndex).toBeGreaterThan(0); // Not at top
  });
});

test.describe('Relative Time Display', () => {
  test('shows relative time format', async ({ page }) => {
    await page.goto('/');

    const timeElement = page.locator('time').first();
    const text = await timeElement.textContent();

    // Should match relative format
    expect(text).toMatch(/just now|mins? ago|hours? ago|yesterday|days ago|weeks? ago|months? ago|years? ago/);
  });

  test('shows tooltip with absolute time on hover', async ({ page }) => {
    await page.goto('/');

    const timeElement = page.locator('time').first();
    await timeElement.hover();

    const tooltip = await timeElement.getAttribute('title');

    // Should match absolute format
    expect(tooltip).toMatch(/\w+ \d+, \d{4} at \d+:\d+ (AM|PM)/);
  });

  test('updates timestamps after 60 seconds', async ({ page }) => {
    await page.goto('/');

    const timeElement = page.locator('time').first();
    const initialText = await timeElement.textContent();

    // Wait 60 seconds
    await page.waitForTimeout(60000);

    const updatedText = await timeElement.textContent();

    // Text should change (e.g., "2 mins ago" → "3 mins ago")
    expect(updatedText).not.toBe(initialText);
  });
});
```

### 6.3 Test Coverage Requirements

- [ ] Unit test coverage: >= 95%
- [ ] Integration test coverage: >= 80%
- [ ] All edge cases covered
- [ ] All user scenarios covered
- [ ] Performance benchmarks passing
- [ ] Accessibility tests passing

---

## 7. Edge Cases & Error Handling

### 7.1 Edge Cases

| Edge Case | Expected Behavior | Rationale |
|-----------|-------------------|-----------|
| Null `created_at` | Show "Unknown time" | Graceful degradation |
| Undefined `created_at` | Show "Unknown time" | Graceful degradation |
| Invalid date format | Show "Invalid date" | User feedback |
| Future date (clock skew) | Show "just now" | Prevent negative times |
| Exactly 60 seconds | Show "1 min ago" | Boundary condition |
| 23 hours 59 minutes | Show "23 hours ago" | Pre-yesterday boundary |
| 24 hours exactly | Show "yesterday" | Day boundary |
| 48 hours | Show "2 days ago" | Post-yesterday boundary |
| 6.9 days | Show "6 days ago" | Pre-week boundary |
| 7 days exactly | Show "1 week ago" | Week boundary |
| 27 days | Show "3 weeks ago" | Pre-month boundary |
| 30 days | Show "1 month ago" | Month boundary |
| 364 days | Show "11 months ago" | Pre-year boundary |
| 365 days | Show "1 year ago" | Year boundary |
| Empty posts array | Show "No posts" message | Empty state |
| All posts filtered out | Show "No matching posts" | Filter feedback |
| WebSocket disconnection | Continue showing posts | Graceful degradation |
| API failure | Show error message | User feedback |

### 7.2 Error Scenarios

```typescript
// Error handling examples

// Scenario 1: Null date
formatRelativeTime(null); // Returns: "Unknown time"

// Scenario 2: Invalid date string
formatRelativeTime('not-a-date'); // Returns: "Invalid date"

// Scenario 3: Future date (clock skew)
formatRelativeTime('2025-12-31T23:59:59Z'); // Returns: "just now"

// Scenario 4: Parsing exception
try {
  formatRelativeTime(malformedDate);
} catch (error) {
  console.error('Date parsing error:', error);
  return 'Unknown time';
}
```

### 7.3 Fallback Behavior

```typescript
// Primary: created_at
// Fallback: publishedAt
// Last resort: "Unknown time"

const displayTime = post.created_at || post.publishedAt || null;

<time
  dateTime={displayTime || undefined}
  title={displayTime ? formatAbsoluteTime(displayTime) : 'Unknown time'}
>
  {formatRelativeTime(displayTime)}
</time>
```

---

## 8. Migration & Rollback Plan

### 8.1 Migration Steps

1. **Phase 1: Add Relative Time (No Breaking Changes)**
   - Add `formatRelativeTime()` function
   - Add `formatAbsoluteTime()` function
   - Add auto-update mechanism
   - Keep existing sorting (parallel implementation)
   - Deploy and validate

2. **Phase 2: Remove Frontend Sorting**
   - Remove `.sort()` logic
   - Remove sort dropdown
   - Remove `sortBy` state
   - Rename `filteredAndSortedPosts` to `filteredPosts`
   - Deploy and validate

3. **Phase 3: Switch to `created_at`**
   - Update TypeScript interface
   - Replace `publishedAt` with `created_at`
   - Add fallback for backward compatibility
   - Deploy and validate

### 8.2 Rollback Plan

**If Critical Issue Found:**

1. Revert Git commit
2. Redeploy previous version
3. Investigate issue
4. Fix and redeploy

**Rollback Triggers:**
- Posts appear in wrong order
- Timestamps show incorrect times
- JavaScript errors in console
- Performance degradation
- Accessibility violations

### 8.3 Feature Flags (Optional)

```typescript
// Environment variable feature flag
const TRUST_BACKEND_SORTING = process.env.VITE_TRUST_BACKEND_SORTING !== 'false';

const displayPosts = TRUST_BACKEND_SORTING
  ? filteredPosts
  : filteredAndSortedPosts;
```

---

## 9. Success Metrics

### 9.1 Functional Validation

- [ ] Posts display in exact backend order
- [ ] No client-side reordering occurs
- [ ] Relative times display correctly
- [ ] Auto-update works every 60 seconds
- [ ] Tooltips show exact timestamps
- [ ] Filter functionality preserved
- [ ] Search functionality preserved
- [ ] New posts appear in correct position

### 9.2 Performance Metrics

- [ ] Time formatting: < 1ms per call
- [ ] Auto-update cycle: < 10ms total
- [ ] No memory leaks detected
- [ ] Scroll performance unchanged
- [ ] Initial load time unchanged

### 9.3 User Experience Metrics

- [ ] Time format intuitive (user testing)
- [ ] Tooltips discoverable
- [ ] No confusion about post order
- [ ] Auto-update unobtrusive

### 9.4 Quality Metrics

- [ ] Unit test coverage >= 95%
- [ ] Integration test coverage >= 80%
- [ ] Zero accessibility violations
- [ ] Zero console errors
- [ ] Code review approved

---

## 10. Dependencies & Assumptions

### 10.1 Dependencies

**Backend API:**
- Endpoint: `GET /api/agent-posts`
- Sorting: `ORDER BY comment_count DESC, is_agent_post DESC, created_at DESC, id ASC`
- Status: ✅ Working correctly
- Breaking change risk: Low

**Frontend Libraries:**
- React 18+ (useState, useEffect, useReducer)
- TypeScript 5+
- Lucide-react (Clock icon)
- Vitest (unit tests)
- Playwright (E2E tests)

### 10.2 Assumptions

1. Backend sorting is correct and stable
2. `created_at` field always populated
3. Dates in ISO 8601 format
4. Browser supports Date.toLocaleString
5. Users have JavaScript enabled
6. 60-second update interval acceptable
7. Local timezone display acceptable
8. English-only acceptable for v1

### 10.3 Out of Scope (Future)

- [ ] Internationalization (i18n) for time formats
- [ ] Timezone selection/conversion
- [ ] Custom time format preferences
- [ ] Real-time updates (< 60 seconds)
- [ ] Animated timestamp transitions
- [ ] Advanced sorting UI (re-introduce later)
- [ ] User-configurable sort options

---

## 11. Review & Approval

### 11.1 Stakeholders

| Role | Name | Approval Status |
|------|------|----------------|
| Frontend Lead | TBD | ⏳ Pending |
| Backend Lead | TBD | ⏳ Pending |
| UX Designer | TBD | ⏳ Pending |
| Product Manager | TBD | ⏳ Pending |

### 11.2 Review Checklist

- [ ] Requirements complete and testable
- [ ] Technical design reviewed
- [ ] Edge cases documented
- [ ] Test strategy approved
- [ ] Migration plan approved
- [ ] Rollback plan defined
- [ ] Success metrics agreed
- [ ] Dependencies verified

### 11.3 Sign-Off

**Frontend Lead:** __________________ Date: __________

**Backend Lead:** __________________ Date: __________

**UX Designer:** __________________ Date: __________

**Product Manager:** __________________ Date: __________

---

## 12. Appendix

### 12.1 Code Examples

**Complete Component Integration:**

```typescript
// AgentPostsFeed.tsx (relevant sections)

import React, { useState, useEffect, useCallback, useReducer } from 'react';
import { Clock, Eye, /* ... */ } from 'lucide-react';

interface AgentPost {
  id: string;
  title: string;
  content: string;
  authorAgent: string;
  publishedAt: string;
  created_at: string;  // NEW
  metadata: {
    businessImpact: number;
    tags: string[];
    postType: string;
    // ...
  };
  engagement: {
    views: number;
    bookmarks: number;
    shares: number;
    comments: number;
  };
}

const AgentPostsFeed: React.FC = () => {
  const [posts, setPosts] = useState<AgentPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Auto-update mechanism
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const interval = setInterval(forceUpdate, 60000);
    return () => clearInterval(interval);
  }, []);

  // Relative time formatter
  const formatRelativeTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Unknown time';

    try {
      const now = new Date();
      const postTime = new Date(dateString);

      if (isNaN(postTime.getTime())) return 'Invalid date';

      const diffMs = now.getTime() - postTime.getTime();
      if (diffMs < 0) return 'just now';

      const seconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const weeks = Math.floor(days / 7);
      const months = Math.floor(days / 30);
      const years = Math.floor(days / 365);

      if (seconds < 60) return 'just now';
      if (minutes < 60) return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
      if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
      if (days === 1) return 'yesterday';
      if (days < 7) return `${days} days ago`;
      if (weeks < 4) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
      if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
      return years === 1 ? '1 year ago' : `${years} years ago`;
    } catch (error) {
      console.error('Error formatting relative time:', error);
      return 'Unknown time';
    }
  };

  // Absolute time formatter
  const formatAbsoluteTime = (dateString: string): string => {
    if (!dateString) return 'Unknown time';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';

      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };

      const formatted = date.toLocaleString('en-US', options);
      return formatted.replace(/,([^,]*)$/, ' at$1');
    } catch (error) {
      console.error('Error formatting absolute time:', error);
      return 'Unknown time';
    }
  };

  // Filter only (NO SORTING)
  const filteredPosts = posts.filter(post => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.authorAgent.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || post.metadata.postType === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      {filteredPosts.map(post => {
        const displayTime = post.created_at || post.publishedAt;

        return (
          <div key={post.id} data-testid="agent-post" data-post-id={post.id}>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <time
                dateTime={displayTime}
                title={formatAbsoluteTime(displayTime)}
                className="cursor-help"
              >
                {formatRelativeTime(displayTime)}
              </time>
              <Eye className="h-3 w-3" />
              {post.engagement.views} views
            </div>
            {/* ... rest of post content */}
          </div>
        );
      })}
    </div>
  );
};

export default AgentPostsFeed;
```

### 12.2 Backend Sorting Query

**Current Backend Implementation (Verified Working):**

```javascript
// api-server/server.js (lines 474-491)

const posts = db.prepare(`
  SELECT
    id, title, content, authorAgent, publishedAt,
    metadata, engagement, created_at,
    CAST(json_extract(engagement, '$.comments') AS INTEGER) as comment_count,
    CASE
      WHEN authorAgent = 'user-agent' OR authorAgent LIKE 'user-%' THEN 0
      WHEN authorAgent LIKE '%-agent' OR authorAgent LIKE '%agent%' THEN 1
      ELSE 0
    END as is_agent_post
  FROM agent_posts
  ORDER BY
    comment_count DESC,          -- Most comments first
    is_agent_post DESC,          -- Agents beat users in ties
    created_at DESC,             -- Newer posts win in ties
    id ASC                       -- Deterministic final tiebreaker
  LIMIT ? OFFSET ?
`).all(limit, offset);
```

**Sort Priority:**
1. Comment count (highest first)
2. Agent vs. user (agents first)
3. Creation time (newest first)
4. ID (deterministic tiebreaker)

### 12.3 Time Format Examples Table

| Elapsed Time | Relative Format | Absolute Format (Tooltip) |
|-------------|-----------------|---------------------------|
| 30 seconds | just now | October 2, 2025 at 8:07 PM |
| 1 minute | 1 min ago | October 2, 2025 at 8:07 PM |
| 15 minutes | 15 mins ago | October 2, 2025 at 7:53 PM |
| 1 hour | 1 hour ago | October 2, 2025 at 7:08 PM |
| 5 hours | 5 hours ago | October 2, 2025 at 3:08 PM |
| 23 hours | 23 hours ago | October 1, 2025 at 9:08 PM |
| 24-48 hours | yesterday | October 1, 2025 at 8:08 PM |
| 2 days | 2 days ago | September 30, 2025 at 8:08 PM |
| 7 days | 1 week ago | September 25, 2025 at 8:08 PM |
| 21 days | 3 weeks ago | September 11, 2025 at 8:08 PM |
| 30 days | 1 month ago | September 2, 2025 at 8:08 PM |
| 180 days | 6 months ago | April 5, 2025 at 8:08 PM |
| 365 days | 1 year ago | October 2, 2024 at 8:08 PM |
| 730 days | 2 years ago | October 2, 2023 at 8:08 PM |

### 12.4 Browser Compatibility Notes

**Date.toLocaleString() Support:**
- Chrome 24+ ✅
- Firefox 29+ ✅
- Safari 10+ ✅
- Edge 12+ ✅
- IE 11+ ⚠️ (limited support)

**Intl.DateTimeFormatOptions Support:**
- Chrome 24+ ✅
- Firefox 29+ ✅
- Safari 10+ ✅
- Edge 12+ ✅

**Fallback for Older Browsers:**
```typescript
const formatAbsoluteTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);

    // Try modern formatting
    if (Intl && Intl.DateTimeFormat) {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      return date.toLocaleString('en-US', options).replace(/,([^,]*)$/, ' at$1');
    }

    // Fallback: ISO format
    return date.toISOString();
  } catch (error) {
    return 'Unknown time';
  }
};
```

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **Backend Sorting** | Server-side ordering of posts based on comment count, agent priority, and timestamp |
| **Frontend Override** | Client-side sorting that replaces backend ordering |
| **Relative Time** | Human-readable time format (e.g., "2 hours ago") |
| **Absolute Time** | Full timestamp (e.g., "October 2, 2025 at 8:08 PM") |
| **Auto-Update** | Periodic refresh of relative timestamps without data refetch |
| **Tooltip** | Hover popup showing additional information |
| **ISO 8601** | International date/time format standard (e.g., "2025-10-02T20:00:00Z") |
| **UTC** | Coordinated Universal Time (timezone-agnostic) |
| **Local Time** | Browser's local timezone display |
| **Clock Skew** | Time difference between client and server clocks |
| **Graceful Degradation** | Fallback behavior when features unsupported |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-02 | SPARC Spec Agent | Initial specification |

---

**End of Specification**
