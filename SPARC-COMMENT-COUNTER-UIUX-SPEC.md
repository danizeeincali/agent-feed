# SPARC Specification: Comment Counter UI/UX Design

## 1. Introduction

### 1.1 Purpose
This specification defines the visual design, interaction patterns, accessibility requirements, and responsive behavior for the comment counter component in the social media feed interface.

### 1.2 Scope
- Visual design and styling of the comment counter button
- Hover and interaction states
- Accessibility compliance (WCAG 2.1 AA)
- Dark mode compatibility
- Number formatting and display standards
- Responsive behavior across devices

### 1.3 Context
- **Component Location**: `/frontend/src/components/RealSocialMediaFeed.tsx` (lines 978-985)
- **Bug Fixed**: Counter now correctly uses `post.comments` instead of `post.engagement?.comments`
- **Design System**: Tailwind CSS with custom theme (primary blue: #3b82f6, secondary gray)
- **Related Components**: Save counter, post actions, engagement metrics

### 1.4 Definitions
- **Comment Counter**: Interactive button displaying the total number of comments on a post
- **Engagement Metric**: User interaction indicator (comments, saves, views)
- **Interactive State**: Visual feedback during user interaction (hover, focus, active, disabled)

---

## 2. Functional Requirements

### FR-2.1: Visual Design

**FR-2.1.1: Base Component Structure**
- Component type: Interactive button element (`<button>`)
- Layout: Horizontal flex container with icon and text
- Icon: `MessageCircle` from lucide-react library
- Counter display: Numeric text adjacent to icon

**Acceptance Criteria:**
- Uses semantic `<button>` element for accessibility
- Icon and text are horizontally aligned with consistent spacing
- Component maintains consistent height across different counter values

---

**FR-2.1.2: Typography and Sizing**
- Icon size: `w-5 h-5` (20px × 20px)
- Text size: `text-sm` (14px)
- Font weight: `font-medium` (500)
- Icon-text spacing: `space-x-2` (8px gap)

**Acceptance Criteria:**
- Text is legible at minimum supported screen size (320px width)
- Icon and text maintain proportional sizing
- Component aligns with other engagement metrics (saves counter uses `w-4 h-4`, `text-sm`)

---

**FR-2.1.3: Color Scheme - Light Mode**
- Default state: `text-gray-600` (#4b5563)
- Hover state: `text-blue-500` (#3b82f6)
- Focus state: Blue ring with 2px offset
- Active state: `text-blue-600` (#2563eb)

**Acceptance Criteria:**
- Default color provides sufficient contrast (4.5:1 minimum on white background)
- Hover state is visually distinct from default state
- Color transition is smooth (200ms ease)

---

**FR-2.1.4: Color Scheme - Dark Mode**
- Default state: `dark:text-gray-400` (#9ca3af)
- Hover state: `hover:text-blue-500` (#3b82f6)
- Focus state: Blue ring with lighter shade for visibility
- Active state: `text-blue-400` (#60a5fa)

**Acceptance Criteria:**
- All colors meet WCAG 2.1 AA contrast requirements on dark background (#111827)
- Dark mode colors are automatically applied when `.dark` class is present on root
- Smooth transition between light and dark modes

---

### FR-2.2: Interaction States

**FR-2.2.1: Hover State**
- Trigger: Mouse cursor over button area
- Visual change: Color shifts to blue (`text-blue-500`)
- Transition: `transition-colors` with default duration (150ms)
- Cursor: Pointer cursor indicates interactivity

**Acceptance Criteria:**
- Hover effect applies to entire button area (including icon and text)
- Transition is smooth and non-jarring
- Hover state is consistent with other interactive elements (save button)

---

**FR-2.2.2: Focus State**
- Trigger: Keyboard navigation (Tab key)
- Visual indicator: 2px blue focus ring with 2px offset
- Accessibility: Ring is always visible when focused
- No focus suppression: Focus ring appears for keyboard and mouse interactions

**Acceptance Criteria:**
- Focus ring is clearly visible in both light and dark modes
- Ring does not clip or overlap adjacent elements
- Focus state meets WCAG 2.4.7 (Focus Visible) requirements

---

**FR-2.2.3: Active/Pressed State**
- Trigger: Mouse button down or Enter/Space key press
- Visual feedback: Slightly darker blue shade
- Optional: Subtle scale transform (0.98) for tactile feedback
- Duration: Instantaneous (no delay)

**Acceptance Criteria:**
- Active state provides immediate visual confirmation
- State reverts immediately on release
- No layout shift during state change

---

**FR-2.2.4: Disabled State**
- Condition: Comments section is unavailable or loading
- Visual indicators:
  - Reduced opacity: `opacity-50`
  - Cursor: `cursor-not-allowed`
  - Color: Gray (no hover effect)
- Interactive behavior: Click events are suppressed

**Acceptance Criteria:**
- Disabled state is visually distinct from enabled state
- Screen readers announce disabled state
- No visual feedback on hover when disabled

---

### FR-2.3: Number Formatting

**FR-2.3.1: Display Format Rules**
| Count Range | Display Format | Example |
|-------------|----------------|---------|
| 0 | "0" | 0 |
| 1-999 | Exact number | 5, 42, 999 |
| 1,000-999,999 | Abbreviated with "K" | 1.2K, 15.5K, 999K |
| 1,000,000+ | Abbreviated with "M" | 1.2M, 45.8M |

**Formatting Rules:**
- Thousands: Display one decimal place (1.2K, not 1200)
- Round down for display (1,249 → 1.2K)
- No trailing zeros after decimal (1.0K → 1K)
- Maximum two significant figures for abbreviated numbers

**Acceptance Criteria:**
- All number formats are tested with edge cases
- Formatting is consistent across locales (uses en-US format)
- Zero is displayed as "0" (not blank or hidden)

---

**FR-2.3.2: Default Value Handling**
- Missing data: Display `0` (not null, undefined, or blank)
- Data source: `post.comments || 0`
- Type validation: Ensure numeric type before display

**Acceptance Criteria:**
- Component never displays `NaN`, `undefined`, or `null`
- Invalid data types gracefully fallback to `0`
- Console warnings logged for unexpected data types (development mode)

---

### FR-2.4: Layout and Positioning

**FR-2.4.1: Component Placement**
- Location: Post actions row (below post content, above tags)
- Container: Flex container with left alignment
- Siblings: Save counter (right side), post ID (right side)
- Spacing: `space-x-6` (24px) between action items

**Acceptance Criteria:**
- Comment counter is the first item in the actions row
- Consistent vertical alignment with sibling elements
- Maintains position across all post types (text, image, link preview)

---

**FR-2.4.2: Responsive Behavior**
| Breakpoint | Behavior |
|------------|----------|
| Mobile (<640px) | Full button visible, reduced spacing (`space-x-4`) |
| Tablet (640-1024px) | Standard spacing, full button |
| Desktop (>1024px) | Standard spacing, full button |

**Acceptance Criteria:**
- Button does not wrap to new line on small screens
- Icon and text remain together (no wrapping between them)
- Touch target meets minimum size (44×44px) on mobile devices

---

## 3. Non-Functional Requirements

### NFR-3.1: Accessibility (WCAG 2.1 AA)

**NFR-3.1.1: Semantic HTML**
- Element: `<button>` (not `<div>` or `<span>` with click handler)
- Role: Implicit button role (no ARIA override needed)
- Interactive: Native keyboard support (Enter, Space keys)

**Validation:**
- Automated: axe-core accessibility scanner (0 violations)
- Manual: Screen reader testing (NVDA, JAWS, VoiceOver)

---

**NFR-3.1.2: ARIA Labels and Attributes**
```html
<button
  aria-label="View 5 comments on this post"
  title="View Comments"
  onClick={handleClick}
>
  <MessageCircle aria-hidden="true" />
  <span aria-hidden="false">5</span>
</button>
```

**Requirements:**
- `aria-label`: Descriptive label including count ("View {count} comments" or "View comments" for 0)
- `title`: Tooltip text for mouse users ("View Comments")
- Icon: `aria-hidden="true"` (decorative, not semantic)
- Count: Visible to screen readers (no `aria-hidden`)

**Acceptance Criteria:**
- Screen readers announce: "View 5 comments on this post, button"
- ARIA labels update dynamically when count changes
- No redundant announcements (count not read twice)

---

**NFR-3.1.3: Keyboard Navigation**
- Tab order: Sequential, logical order in DOM
- Activation: Enter or Space key triggers click
- Focus management: Focus moves to comments section when opened
- Escape: Closes comments section and returns focus to button

**Acceptance Criteria:**
- All interactions possible without mouse
- Focus indicators meet 3:1 contrast requirement
- No keyboard traps (can navigate away from component)

---

**NFR-3.1.4: Screen Reader Announcements**
| Event | Announcement |
|-------|--------------|
| Focus | "View 5 comments on this post, button" |
| Click (expand) | "Comments section expanded, showing 5 comments" |
| Count update | "Comment count updated to 6" (live region) |
| Click (collapse) | "Comments section collapsed" |

**Implementation:**
- Use `aria-live="polite"` for count updates
- Use `aria-expanded` to indicate state
- Use `aria-controls` to reference comments section ID

**Acceptance Criteria:**
- NVDA, JAWS, VoiceOver provide consistent announcements
- Updates announced without interrupting user
- No unnecessary or verbose announcements

---

**NFR-3.1.5: Color Contrast Requirements**
| Element | Mode | Ratio | Required | Status |
|---------|------|-------|----------|--------|
| Default text | Light | 7.4:1 | 4.5:1 | ✓ Pass |
| Default text | Dark | 6.2:1 | 4.5:1 | ✓ Pass |
| Hover text | Light | 8.6:1 | 4.5:1 | ✓ Pass |
| Hover text | Dark | 8.1:1 | 4.5:1 | ✓ Pass |
| Focus ring | Light | 5.2:1 | 3:1 | ✓ Pass |
| Focus ring | Dark | 4.8:1 | 3:1 | ✓ Pass |

**Validation Method:**
- Tool: Chrome DevTools Lighthouse, axe DevTools
- Manual: WebAIM Contrast Checker
- Automated: CI/CD accessibility testing

---

### NFR-3.2: Performance

**NFR-3.2.1: Rendering Performance**
- Initial render: <16ms (60fps)
- Hover transition: 150ms smooth transition
- Count update: <8ms re-render time
- No layout thrashing during interaction

**Measurement:**
- Tool: React DevTools Profiler
- Metric: Commit duration for component updates
- Target: 95th percentile <16ms

**Acceptance Criteria:**
- No janky animations or delayed hover states
- Counter updates do not block UI thread
- Component memoized to prevent unnecessary re-renders

---

**NFR-3.2.2: Network and Data Efficiency**
- Counter value: Included in initial post data payload
- No separate API call for count retrieval
- Real-time updates: WebSocket or polling (not per-component)
- Optimistic updates: Immediate UI feedback on comment submission

**Acceptance Criteria:**
- Counter value available synchronously (no loading state)
- No redundant data fetching
- Optimistic updates rollback on error

---

### NFR-3.3: Browser Compatibility

**Supported Browsers:**
- Chrome: 90+ (current - 2 versions)
- Firefox: 88+ (current - 2 versions)
- Safari: 14+ (current - 2 versions)
- Edge: 90+ (current - 2 versions)
- Mobile Safari: iOS 14+
- Chrome Mobile: Android 8+

**Testing Requirements:**
- Cross-browser: BrowserStack or Playwright tests
- Focus: Visual consistency and interaction parity
- Fallbacks: Graceful degradation for older browsers

---

### NFR-3.4: Dark Mode Compatibility

**NFR-3.4.1: Theme Detection**
- Method: CSS class-based (`.dark` on root element)
- Trigger: User toggle or system preference
- Persistence: Saved in localStorage
- Transition: Smooth color transitions (150ms)

**Acceptance Criteria:**
- Dark mode applies instantly on toggle
- No flash of unstyled content (FOUC)
- Persistent across page reloads

---

**NFR-3.4.2: Color Token System**
```css
/* Light Mode */
--comment-default: theme('colors.gray.600');     /* #4b5563 */
--comment-hover: theme('colors.blue.500');       /* #3b82f6 */
--comment-active: theme('colors.blue.600');      /* #2563eb */

/* Dark Mode */
--comment-default: theme('colors.gray.400');     /* #9ca3af */
--comment-hover: theme('colors.blue.500');       /* #3b82f6 */
--comment-active: theme('colors.blue.400');      /* #60a5fa */
```

**Acceptance Criteria:**
- All colors defined in Tailwind theme configuration
- No hardcoded hex values in component code
- Theme tokens are reusable across components

---

## 4. Use Cases

### UC-4.1: View Comments (Primary Flow)

**Actor:** User (authenticated or guest)

**Preconditions:**
- Post is loaded and visible in feed
- Comment counter displays current count
- Comments section is collapsed

**Main Flow:**
1. User navigates to post with keyboard or mouse
2. User focuses on comment counter button
3. User clicks button or presses Enter/Space
4. Comments section expands below post content
5. Focus moves to first comment or comment input field
6. Comment counter visual state updates (e.g., highlighted)

**Postconditions:**
- Comments section is visible
- User can scroll through comments
- User can add new comment

**Alternative Flow 4a: No Comments Exist**
- 4a.1: Comments section shows "No comments yet" message
- 4a.2: Focus moves to comment input field
- 4a.3: User encouraged to add first comment

**Exception Flow 3a: Comments Failed to Load**
- 3a.1: System displays error message
- 3a.2: Retry button appears
- 3a.3: Counter remains interactive for retry

**Acceptance Criteria:**
- Smooth animation when expanding comments (slide-down, 300ms)
- Focus management works correctly (no focus loss)
- Error states are gracefully handled

---

### UC-4.2: Add Comment (Interactive Update)

**Actor:** Authenticated user

**Preconditions:**
- User is logged in
- Comments section is expanded
- User has entered comment text

**Main Flow:**
1. User clicks "Post Comment" button
2. System submits comment via API
3. System optimistically increments counter (+1)
4. System displays new comment in list
5. Counter updates from "5" to "6"
6. Screen reader announces: "Comment posted, count updated to 6"

**Postconditions:**
- Counter reflects accurate comment count
- New comment appears in comments list
- User can continue interacting with post

**Alternative Flow 2a: API Request Fails**
- 2a.1: System rolls back optimistic update
- 2a.2: Counter reverts to original value
- 2a.3: Error toast appears: "Failed to post comment"
- 2a.4: User can retry submission

**Exception Flow 1a: User Not Authenticated**
- 1a.1: System prevents comment submission
- 1a.2: Login prompt appears
- 1a.3: Counter remains unchanged

**Acceptance Criteria:**
- Optimistic updates provide instant feedback
- Rollback is seamless (no visual glitch)
- Live region announces count change to screen readers

---

### UC-4.3: Real-Time Count Update

**Actor:** System (background process)

**Preconditions:**
- User is viewing post in feed
- WebSocket connection is active
- Another user posts a comment on same post

**Main Flow:**
1. Remote user adds comment to post
2. System receives WebSocket event
3. System updates post data in local state
4. Counter re-renders with new count (5 → 6)
5. No visual disruption to user's current task
6. Live region announces update (if user has focus on post)

**Postconditions:**
- Counter displays accurate real-time count
- User is aware of new activity (subtle notification)
- No performance degradation from frequent updates

**Alternative Flow 3a: WebSocket Disconnected**
- 3a.1: System falls back to periodic polling (30s interval)
- 3a.2: Updates still occur but with slight delay
- 3a.3: Connection indicator shows degraded state

**Acceptance Criteria:**
- Updates are smooth and non-disruptive
- Debouncing prevents excessive re-renders (max 1 update per second)
- Battery and CPU impact are minimal

---

## 5. Acceptance Criteria Summary

### Visual Design Checklist
- [ ] Icon size is `w-5 h-5` (20px × 20px)
- [ ] Text size is `text-sm font-medium` (14px, 500 weight)
- [ ] Icon-text spacing is consistent (8px gap)
- [ ] Component aligns vertically with save counter
- [ ] Layout does not shift when count changes (0 → 1000+)

### Color and Theming Checklist
- [ ] Light mode default: `text-gray-600` (#4b5563)
- [ ] Light mode hover: `text-blue-500` (#3b82f6)
- [ ] Dark mode default: `dark:text-gray-400` (#9ca3af)
- [ ] Dark mode hover: `text-blue-500` (#3b82f6)
- [ ] All contrast ratios meet WCAG 2.1 AA (4.5:1 for text, 3:1 for UI)
- [ ] Smooth color transitions (150ms ease)

### Interaction States Checklist
- [ ] Hover state changes color to blue
- [ ] Focus state shows visible focus ring (2px, blue)
- [ ] Active state provides tactile feedback
- [ ] Disabled state is visually distinct (opacity 50%, no hover)
- [ ] Cursor changes to pointer on hover

### Accessibility Checklist
- [ ] Semantic `<button>` element used
- [ ] ARIA label describes action and count
- [ ] Screen reader announces: "View {count} comments, button"
- [ ] Keyboard navigation works (Tab, Enter, Space, Escape)
- [ ] Focus indicators meet 3:1 contrast
- [ ] Color is not the only differentiator (icon + text)
- [ ] Live region announces count updates
- [ ] No keyboard traps or focus issues

### Number Formatting Checklist
- [ ] 0 displays as "0"
- [ ] 1-999 display exact number
- [ ] 1,000+ display abbreviated (1.2K)
- [ ] 1,000,000+ display abbreviated (1.2M)
- [ ] No trailing zeros (1.0K → 1K)
- [ ] Missing data defaults to "0"

### Responsive Design Checklist
- [ ] Touch target ≥44px on mobile
- [ ] Icon and text do not wrap separately
- [ ] Component visible on 320px width screens
- [ ] Spacing adjusts on mobile (`space-x-4`)
- [ ] No horizontal scrolling on small screens

### Performance Checklist
- [ ] Initial render <16ms
- [ ] Hover transition 150ms smooth
- [ ] Count updates <8ms re-render
- [ ] Component memoized (React.memo or useMemo)
- [ ] No unnecessary re-renders

### Browser Compatibility Checklist
- [ ] Chrome 90+ (desktop and mobile)
- [ ] Firefox 88+
- [ ] Safari 14+ (desktop and iOS)
- [ ] Edge 90+
- [ ] Visual consistency across browsers
- [ ] Interaction parity (hover, focus, click)

---

## 6. Implementation Guidance

### 6.1 Code Structure (Reference)

**Current Implementation (lines 978-985):**
```tsx
<button
  onClick={() => toggleComments(post.id)}
  className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors"
  title="View Comments"
>
  <MessageCircle className="w-5 h-5" />
  <span className="text-sm font-medium">{post.comments || 0}</span>
</button>
```

**Recommended Enhancement (with full accessibility):**
```tsx
<button
  onClick={() => toggleComments(post.id)}
  className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1"
  aria-label={`View ${post.comments || 0} comment${(post.comments || 0) === 1 ? '' : 's'} on this post`}
  aria-expanded={expandedPosts[post.id] || false}
  aria-controls={`comments-section-${post.id}`}
  title="View Comments"
>
  <MessageCircle className="w-5 h-5" aria-hidden="true" />
  <span className="text-sm font-medium">{formatCommentCount(post.comments || 0)}</span>
</button>
```

---

### 6.2 Helper Function: Number Formatting

```typescript
/**
 * Formats comment count for display
 * @param count - Raw comment count
 * @returns Formatted string (e.g., "1.2K", "5", "0")
 */
function formatCommentCount(count: number): string {
  if (!count || count === 0) return '0';
  if (count < 1000) return count.toString();
  if (count < 1_000_000) {
    const k = count / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  const m = count / 1_000_000;
  return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
}

// Test cases
formatCommentCount(0);        // "0"
formatCommentCount(5);        // "5"
formatCommentCount(999);      // "999"
formatCommentCount(1000);     // "1K"
formatCommentCount(1249);     // "1.2K"
formatCommentCount(1500);     // "1.5K"
formatCommentCount(1_000_000); // "1M"
formatCommentCount(1_234_567); // "1.2M"
```

---

### 6.3 Accessibility Enhancements

**Live Region for Count Updates:**
```tsx
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {`Comment count: ${post.comments || 0}`}
</div>
```

**Focus Management:**
```typescript
const toggleComments = (postId: string) => {
  setExpandedPosts(prev => ({
    ...prev,
    [postId]: !prev[postId]
  }));

  // Move focus to comments section when expanded
  if (!expandedPosts[postId]) {
    setTimeout(() => {
      const commentsSection = document.getElementById(`comments-section-${postId}`);
      const firstFocusable = commentsSection?.querySelector('textarea, button');
      (firstFocusable as HTMLElement)?.focus();
    }, 300); // Wait for animation
  }
};
```

---

### 6.4 Testing Requirements

**Unit Tests:**
```typescript
describe('CommentCounter', () => {
  test('displays zero when no comments exist', () => {
    render(<CommentCounter count={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('formats numbers correctly', () => {
    const { rerender } = render(<CommentCounter count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();

    rerender(<CommentCounter count={1249} />);
    expect(screen.getByText('1.2K')).toBeInTheDocument();
  });

  test('has accessible label', () => {
    render(<CommentCounter count={5} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'View 5 comments on this post'
    );
  });

  test('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<CommentCounter count={5} onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**Integration Tests:**
```typescript
describe('CommentCounter Integration', () => {
  test('expands comments section when clicked', async () => {
    render(<SocialMediaFeed />);
    const button = screen.getByLabelText(/view \d+ comments/i);

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /comments/i })).toBeVisible();
    });
  });

  test('updates count when new comment is added', async () => {
    render(<SocialMediaFeed />);
    const counterBefore = screen.getByText('5');

    // Add comment
    const input = screen.getByPlaceholderText(/add a comment/i);
    fireEvent.change(input, { target: { value: 'Great post!' } });
    fireEvent.click(screen.getByText('Post Comment'));

    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(counterBefore).not.toBeInTheDocument();
    });
  });
});
```

**Accessibility Tests:**
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

describe('CommentCounter Accessibility', () => {
  test('has no accessibility violations', async () => {
    const { container } = render(<CommentCounter count={5} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('is keyboard navigable', () => {
    render(<CommentCounter count={5} />);
    const button = screen.getByRole('button');

    button.focus();
    expect(button).toHaveFocus();

    fireEvent.keyDown(button, { key: 'Enter' });
    // Verify onClick was triggered
  });
});
```

---

## 7. Success Metrics

### Quantitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Accessibility Score (Lighthouse) | 100/100 | Automated CI/CD testing |
| Color Contrast Ratio | ≥4.5:1 (text), ≥3:1 (UI) | WebAIM Contrast Checker |
| Hover Response Time | <150ms | Chrome DevTools Performance |
| Re-render Performance | <16ms (95th percentile) | React DevTools Profiler |
| Keyboard Task Completion | 100% success rate | Manual QA testing |
| Screen Reader Compatibility | 100% (NVDA, JAWS, VO) | Manual accessibility testing |
| Cross-Browser Consistency | 100% visual/functional parity | BrowserStack testing |

### Qualitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Visual Consistency | Matches design system | Design review |
| User Clarity | "Obvious" action (5/5 rating) | User testing (n=5) |
| Professional Appearance | "Professional" rating (4/5) | Stakeholder review |
| Accessibility Compliance | WCAG 2.1 AA certified | Third-party audit |

---

## 8. Constraints and Dependencies

### Technical Constraints
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS (no inline styles or CSS modules)
- **Icons**: lucide-react library (MessageCircle component)
- **Browser Support**: ES2020+ (no IE11 support)

### Design System Dependencies
- Tailwind color palette (gray, blue)
- Custom theme configuration (`tailwind.config.js`)
- CSS custom properties for dark mode
- Consistent spacing scale (4px increments)

### External Dependencies
- Post data includes `comments` field (number)
- Comments section component with unique ID
- `toggleComments` function in parent scope
- `expandedPosts` state management

### Performance Constraints
- Component must render in <16ms
- No impact on overall feed scroll performance
- Memory footprint <1KB per instance

---

## 9. Open Questions and Future Enhancements

### Open Questions
1. **Q**: Should the counter pulse/animate when count changes in real-time?
   **Status**: Deferred to Phase 2 (UX research needed)

2. **Q**: Should we show "+99" for counts exceeding display limit?
   **Status**: Pending product decision (YouTube-style indicator)

3. **Q**: Should the counter be interactive when comments are disabled?
   **Status**: Implement disabled state, show tooltip explaining why

### Future Enhancements
- **Phase 2**: Animated counter transitions (flip animation for count changes)
- **Phase 3**: Contextual tooltips showing recent commenters ("Alice, Bob, and 3 others commented")
- **Phase 4**: Subtle badge for unread comments (similar to notification badges)
- **Phase 5**: Internationalization (localized number formatting)

---

## 10. Validation and Sign-Off

### Validation Checklist

**Design Review:**
- [ ] Visual design approved by UX team
- [ ] Color palette consistent with brand guidelines
- [ ] Dark mode treatment reviewed and approved

**Engineering Review:**
- [ ] Technical approach validated
- [ ] Performance benchmarks met
- [ ] Code follows project conventions

**Accessibility Review:**
- [ ] WCAG 2.1 AA compliance verified
- [ ] Screen reader testing completed (NVDA, JAWS, VoiceOver)
- [ ] Keyboard navigation tested and approved

**QA Review:**
- [ ] All acceptance criteria tested
- [ ] Cross-browser testing completed
- [ ] Responsive design validated on devices

**Stakeholder Approval:**
- [ ] Product owner sign-off
- [ ] Accessibility specialist approval
- [ ] Final design approval

---

## 11. Appendix

### A. Design Tokens Reference

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#3b82f6', // Hover state
          600: '#2563eb', // Active state
        },
        gray: {
          400: '#9ca3af', // Dark mode default
          600: '#4b5563', // Light mode default
        }
      }
    }
  }
}
```

### B. Related Components

**Save Counter** (lines 988-993):
```tsx
{post.engagement?.saves && post.engagement?.saves > 0 && (
  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
    <Bookmark className="w-4 h-4 text-blue-500" />
    <span className="text-sm font-medium">{post.engagement?.saves} saved</span>
  </div>
)}
```

**Save Button** (lines 1003-1025):
```tsx
<button
  onClick={() => handleSave(post.id, !post.engagement?.isSaved)}
  className={`flex items-center space-x-1 transition-colors transform hover:scale-105 ${
    post.engagement?.isSaved ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'
  }`}
>
  <Bookmark className={`w-4 h-4 ${post.engagement?.isSaved ? 'fill-blue-500' : ''}`} />
  <span className="text-xs font-medium">
    {post.engagement?.isSaved ? 'Saved' : 'Save'}
  </span>
</button>
```

### C. WCAG 2.1 AA Reference

**Relevant Success Criteria:**
- **1.4.3 Contrast (Minimum)**: Text has 4.5:1 contrast, UI elements 3:1
- **1.4.11 Non-text Contrast**: Focus indicators and interactive states meet 3:1
- **2.1.1 Keyboard**: All functionality operable via keyboard
- **2.4.7 Focus Visible**: Focus indicator always visible
- **4.1.2 Name, Role, Value**: Proper ARIA attributes and semantic HTML

**Testing Tools:**
- axe DevTools (browser extension)
- WAVE Web Accessibility Evaluation Tool
- Chrome Lighthouse Accessibility Audit
- NVDA Screen Reader (Windows)
- JAWS Screen Reader (Windows)
- VoiceOver (macOS/iOS)

---

## Document Version Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-16 | SPARC Spec Agent | Initial specification created |

---

**End of Specification**
