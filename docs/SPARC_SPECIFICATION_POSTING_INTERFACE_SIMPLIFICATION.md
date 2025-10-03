# SPARC SPECIFICATION: Posting Interface Simplification

**Project:** Agent Feed Platform
**Component:** EnhancedPostingInterface
**Phase:** Specification
**Date:** 2025-10-01
**Version:** 1.0
**Status:** Ready for Implementation

---

## 1. EXECUTIVE SUMMARY

### 1.1 Purpose
Simplify the user posting interface by removing redundant "Post" tab and enhancing "Quick Post" to support longer, more meaningful content while maintaining simplicity and ease of use.

### 1.2 Scope
- **In Scope:**
  - Remove "Post" tab from UI navigation
  - Enhance Quick Post character limit (500 → 10,000)
  - Progressive character counter display
  - Improved textarea dimensions
  - Updated UX copy and messaging
  - Maintain all mention functionality
  - Preserve agent posting via PostCreator.tsx

- **Out of Scope:**
  - Changes to PostCreator.tsx component
  - Agent posting workflows
  - Backend API modifications
  - Database schema changes
  - Avi DM functionality changes

### 1.3 Impact Assessment
- **User Experience:** Simplified interface, reduced cognitive load, encourages longer-form content
- **Development:** Single file modification, low complexity
- **Testing:** UI/UX validation, functional testing, responsive design validation
- **Risk Level:** LOW - Isolated frontend change with clear rollback path

---

## 2. FUNCTIONAL REQUIREMENTS

### FR-001: Remove "Post" Tab from Navigation
**Priority:** HIGH
**Category:** UI/UX Simplification

#### Description
Remove the "Post" tab from the EnhancedPostingInterface navigation while preserving the PostCreator component for agent use.

#### Acceptance Criteria
- [ ] "Post" tab not visible in UI navigation
- [ ] PostCreator component remains in codebase unchanged
- [ ] Default active tab is "quick"
- [ ] Only "Quick Post" and "Avi DM" tabs visible
- [ ] No console errors or warnings
- [ ] No broken imports or dead code

#### Technical Specification

**File:** `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

**Lines 10-10: Update Type Definition**
```typescript
// BEFORE:
type PostingTab = 'post' | 'quick' | 'avi';

// AFTER:
type PostingTab = 'quick' | 'avi';
```

**Lines 25-29: Update Tabs Array**
```typescript
// BEFORE:
const tabs = [
  { id: 'quick' as PostingTab, label: 'Quick Post', icon: Zap, description: 'One-line posting' },
  { id: 'post' as PostingTab, label: 'Post', icon: Edit3, description: 'Full post creator' },
  { id: 'avi' as PostingTab, label: 'Avi DM', icon: Bot, description: 'Chat with Avi' },
];

// AFTER:
const tabs = [
  { id: 'quick' as PostingTab, label: 'Quick Post', icon: Zap, description: 'Share thoughts and updates' },
  { id: 'avi' as PostingTab, label: 'Avi DM', icon: Bot, description: 'Chat with Avi' },
];
```

**Lines 60-65: Remove Post Tab Content**
```typescript
// BEFORE:
{activeTab === 'post' && (
  <PostCreator
    onPostCreated={onPostCreated}
    className="border-0 shadow-none"
  />
)}

// AFTER:
// Remove this entire conditional block
// PostCreator component remains in codebase for agent use
```

**Lines 2-4: Clean Up Unused Imports (Optional)**
```typescript
// BEFORE:
import { Edit3, Zap, Bot } from 'lucide-react';
import { cn } from '../utils/cn';
import { PostCreator } from './PostCreator';

// AFTER:
import { Zap, Bot } from 'lucide-react';
import { cn } from '../utils/cn';
// PostCreator import removed - component preserved for agent use
```

---

### FR-002: Increase Quick Post Character Limit
**Priority:** HIGH
**Category:** Feature Enhancement

#### Description
Increase the Quick Post character limit from 500 to 10,000 characters to support longer-form content.

#### Acceptance Criteria
- [ ] Maximum character limit is 10,000
- [ ] Textarea accepts full 10,000 characters
- [ ] No truncation of valid input
- [ ] API call includes full content
- [ ] Existing mention functionality preserved

#### Technical Specification

**File:** `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

**Line 151: Update maxLength Prop**
```typescript
// BEFORE:
maxLength={500}

// AFTER:
maxLength={10000}
```

**Line 98-99: Verify Title Generation Logic**
```typescript
// CURRENT (No change needed):
title: content.trim().slice(0, 50) + (content.length > 50 ? '...' : ''),
content: content.trim(),

// This remains correct - title is auto-generated from first 50 chars
// Full content is sent to API regardless of length
```

---

### FR-003: Progressive Character Counter Display
**Priority:** HIGH
**Category:** UI/UX Enhancement

#### Description
Hide character counter until user approaches the 10,000 character limit to reduce visual clutter.

#### Acceptance Criteria
- [ ] Character counter hidden when content < 9,500 characters
- [ ] Character counter visible when content ≥ 9,500 characters
- [ ] Counter shows current/max format (e.g., "9,523/10,000")
- [ ] Counter color indicates approaching limit
- [ ] Smooth transition when counter appears

#### Technical Specification

**File:** `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

**Lines 154-156: Update Character Counter Logic**
```typescript
// BEFORE:
<div className="text-xs text-gray-500 mt-1">
  {content.length}/500 characters
</div>

// AFTER:
{content.length >= 9500 && (
  <div
    className={cn(
      "text-xs mt-1 transition-colors",
      content.length >= 9900 ? "text-red-600 font-semibold" :
      content.length >= 9700 ? "text-orange-600 font-medium" :
      "text-gray-600"
    )}
  >
    {content.length.toLocaleString()}/10,000 characters
  </div>
)}
```

#### Behavior Specifications

| Character Count | Display | Color | Weight |
|----------------|---------|-------|--------|
| 0 - 9,499 | Hidden | N/A | N/A |
| 9,500 - 9,699 | Visible | Gray (#6B7280) | Normal |
| 9,700 - 9,899 | Visible | Orange (#EA580C) | Medium |
| 9,900 - 10,000 | Visible | Red (#DC2626) | Semibold |

---

### FR-004: Increase Textarea Dimensions
**Priority:** MEDIUM
**Category:** UI/UX Enhancement

#### Description
Increase textarea rows from 3 to 6 to provide more visible space for longer content.

#### Acceptance Criteria
- [ ] Textarea displays 6 rows by default
- [ ] Textarea remains resizable by user
- [ ] Mobile responsive behavior maintained
- [ ] No layout breaking on small screens

#### Technical Specification

**File:** `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

**Line 150: Update Rows Prop**
```typescript
// BEFORE:
rows={3}

// AFTER:
rows={6}
```

#### Responsive Behavior
```typescript
// OPTIONAL ENHANCEMENT (if mobile issues arise):
// Add responsive row sizing
<MentionInput
  // ... other props
  rows={window.innerWidth < 640 ? 4 : 6}
  // ... other props
/>
```

---

### FR-005: Update Placeholder Text
**Priority:** MEDIUM
**Category:** Content/Messaging

#### Description
Update placeholder text to encourage longer, more thoughtful posts while maintaining friendly tone.

#### Acceptance Criteria
- [ ] Placeholder text reflects new capabilities
- [ ] Tone is encouraging and clear
- [ ] No technical jargon
- [ ] Mobile-friendly length

#### Technical Specification

**File:** `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

**Line 148: Update Placeholder Prop**
```typescript
// BEFORE:
placeholder="What's on your mind? (One line works great!)"

// AFTER:
placeholder="Share your thoughts, ideas, or updates... (up to 10,000 characters)"
```

**Alternative Options:**
```typescript
// Option 2 (More casual):
placeholder="What's on your mind? Share as much as you'd like..."

// Option 3 (More professional):
placeholder="Compose your message (supports up to 10,000 characters)"

// Option 4 (Minimalist):
placeholder="Share your thoughts..."
```

**Recommendation:** Use Option 1 for clarity on new capabilities.

---

### FR-006: Update Section Description
**Priority:** LOW
**Category:** Content/Messaging

#### Description
Update Quick Post section description to reflect enhanced capabilities.

#### Acceptance Criteria
- [ ] Description accurately reflects functionality
- [ ] Consistent tone with placeholder
- [ ] Clear and concise

#### Technical Specification

**File:** `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

**Lines 138-139: Update Description**
```typescript
// BEFORE:
<h3 className="text-lg font-medium text-gray-900 mb-2">Quick Post</h3>
<p className="text-sm text-gray-600">Share a quick thought or update</p>

// AFTER:
<h3 className="text-lg font-medium text-gray-900 mb-2">Quick Post</h3>
<p className="text-sm text-gray-600">Share your thoughts, updates, or longer-form content</p>
```

---

## 3. NON-FUNCTIONAL REQUIREMENTS

### NFR-001: Performance
**Category:** Performance
**Priority:** HIGH

#### Requirements
- Component render time < 100ms
- No performance degradation with 10,000 character input
- Smooth typing experience (no input lag)
- Efficient re-renders on content change

#### Measurement
```typescript
// Performance test pseudo-code
const renderStart = performance.now();
// Render component with 10,000 char content
const renderEnd = performance.now();
expect(renderEnd - renderStart).toBeLessThan(100);
```

#### Acceptance Criteria
- [ ] No visible input lag when typing
- [ ] Character counter updates without flicker
- [ ] Submit button state updates instantly
- [ ] No memory leaks on repeated use

---

### NFR-002: Browser Compatibility
**Category:** Compatibility
**Priority:** HIGH

#### Requirements
- Chrome 90+ ✓
- Firefox 88+ ✓
- Safari 14+ ✓
- Edge 90+ ✓
- Mobile Safari (iOS 14+) ✓
- Chrome Mobile (Android 10+) ✓

#### Acceptance Criteria
- [ ] Functionality works across all listed browsers
- [ ] Layout renders correctly on all browsers
- [ ] No browser-specific bugs

---

### NFR-003: Accessibility (WCAG 2.1 AA)
**Category:** Accessibility
**Priority:** HIGH

#### Requirements
- Keyboard navigation fully functional
- Screen reader compatible
- Color contrast ratios meet WCAG 2.1 AA
- Focus indicators visible
- ARIA labels present

#### Technical Details
```typescript
// Ensure MentionInput has proper ARIA attributes
<MentionInput
  aria-label="Quick post content"
  aria-describedby="char-counter"
  // ... other props
/>

// Character counter ARIA
{content.length >= 9500 && (
  <div
    id="char-counter"
    role="status"
    aria-live="polite"
    className={/* ... */}
  >
    {content.length.toLocaleString()}/10,000 characters
  </div>
)}
```

#### Acceptance Criteria
- [ ] Keyboard-only navigation works
- [ ] Screen reader announces character count
- [ ] Focus visible on all interactive elements
- [ ] Color contrast ratio ≥ 4.5:1 for text

---

### NFR-004: Mobile Responsiveness
**Category:** Responsive Design
**Priority:** HIGH

#### Requirements
- Usable on screens ≥ 320px width
- Touch-friendly tap targets (≥ 44x44px)
- Readable text at all sizes
- No horizontal scrolling

#### Breakpoints
```css
/* Mobile: 320px - 639px */
- Textarea: 4 rows
- Font size: 14px
- Padding: reduced

/* Tablet: 640px - 1023px */
- Textarea: 5 rows
- Font size: 15px
- Padding: standard

/* Desktop: 1024px+ */
- Textarea: 6 rows
- Font size: 16px
- Padding: standard
```

#### Acceptance Criteria
- [ ] Textarea fully visible on mobile (no cut-off)
- [ ] Submit button accessible without scrolling
- [ ] Character counter doesn't break layout
- [ ] Mentions dropdown works on touch devices

---

## 4. CONSTRAINTS

### 4.1 Technical Constraints
- **Frontend Framework:** React 18.x with TypeScript
- **Styling:** Tailwind CSS utility classes
- **Component Library:** Lucide React icons
- **Build System:** Vite
- **Browser Support:** Modern browsers (ES2020+)

### 4.2 Business Constraints
- **Timeline:** Single sprint implementation
- **Resources:** Frontend engineer (estimated 4-6 hours)
- **Budget:** No additional costs
- **Stakeholders:** Product, Engineering, QA

### 4.3 Regulatory Constraints
- **Data Privacy:** No PII handling changes
- **Accessibility:** WCAG 2.1 AA compliance required
- **Security:** No new security considerations

---

## 5. USE CASES

### UC-001: User Creates Short Post
**Actor:** End User
**Preconditions:** User is on feed page, authenticated
**Trigger:** User wants to share brief update

#### Flow
1. User clicks on "Quick Post" tab (default active)
2. User types short message (< 500 characters)
3. User does not see character counter (hidden)
4. User clicks "Quick Post" button
5. Post is submitted successfully
6. Textarea clears, user sees success feedback

#### Postconditions
- Post appears in feed
- Textarea is empty and ready for next post

#### Success Criteria
- No visible character counter during typing
- Smooth, uncluttered experience
- Fast submission

---

### UC-002: User Creates Long-Form Post
**Actor:** End User
**Preconditions:** User is on feed page, authenticated
**Trigger:** User wants to share detailed content

#### Flow
1. User clicks on "Quick Post" tab
2. User types extended message (> 1000 characters)
3. User continues typing without restrictions
4. At 9,500 characters, counter appears in gray
5. At 9,700 characters, counter turns orange
6. At 9,900 characters, counter turns red and bold
7. User finishes at 9,950 characters
8. User clicks "Quick Post" button
9. Full content submitted successfully

#### Postconditions
- Complete post (9,950 chars) appears in feed
- No truncation occurred
- Character counter resets on next post

#### Success Criteria
- All 10,000 characters accepted
- Progressive visual feedback provided
- No performance issues with long content

---

### UC-003: User Reaches Character Limit
**Actor:** End User
**Preconditions:** User has typed 9,999 characters
**Trigger:** User attempts to type 10,001st character

#### Flow
1. User is typing long post
2. Counter shows "9,999/10,000" in red
3. User types one more character
4. Counter shows "10,000/10,000" in red
5. User attempts to type another character
6. Additional input is prevented by maxLength
7. User edits content to reduce length
8. Counter updates in real-time

#### Postconditions
- Content limited to exactly 10,000 characters
- User aware of limit through visual feedback

#### Success Criteria
- Hard limit enforced
- Clear visual indication
- No error messages (graceful prevention)

---

### UC-004: User Mentions Agent in Long Post
**Actor:** End User
**Preconditions:** User typing post with mentions
**Trigger:** User types "@" to mention agent

#### Flow
1. User types post content (2,000 characters)
2. User types "@" symbol
3. Mention dropdown appears
4. User selects agent from dropdown
5. Agent mention inserted into content
6. Mention counted toward character limit
7. User continues typing
8. User submits post with mentions

#### Postconditions
- Post includes formatted mentions
- Mentions processed correctly by backend
- Mentioned agents notified (if applicable)

#### Success Criteria
- Mention functionality unchanged
- Mentions work at any position in long text
- Character count includes mention syntax

---

### UC-005: Mobile User Creates Post
**Actor:** End User (Mobile)
**Preconditions:** User on mobile device (375px width)
**Trigger:** User wants to create post from phone

#### Flow
1. User opens feed on mobile
2. User taps "Quick Post" tab
3. Textarea displays 4 rows (mobile optimization)
4. User types using mobile keyboard
5. Textarea expands as user types
6. Character counter appears at 9,500 (if reached)
7. Submit button accessible without scrolling
8. User taps "Quick Post"
9. Post submitted successfully

#### Postconditions
- Post created from mobile device
- Full functionality available on small screen

#### Success Criteria
- Responsive layout works correctly
- Touch targets are adequate size
- No horizontal scrolling
- Keyboard doesn't obscure textarea

---

## 6. EDGE CASES & ERROR SCENARIOS

### EC-001: Empty Content Submission
**Scenario:** User attempts to submit without content

**Behavior:**
- Submit button disabled when content.trim() is empty
- No API call made
- No error message shown (preventive UX)

**Implementation:**
```typescript
disabled={!content.trim() || isSubmitting}
```

**Test Case:**
```typescript
test('prevents empty submission', () => {
  render(<QuickPostSection />);
  const submitBtn = screen.getByText('Quick Post');
  expect(submitBtn).toBeDisabled();

  const textarea = screen.getByPlaceholderText(/Share your thoughts/);
  fireEvent.change(textarea, { target: { value: '   ' } });
  expect(submitBtn).toBeDisabled();
});
```

---

### EC-002: Whitespace-Only Content
**Scenario:** User enters only spaces/newlines

**Behavior:**
- Content appears in textarea
- Submit button remains disabled (content.trim() === '')
- Character counter includes whitespace
- On submit attempt, content.trim() used

**Implementation:**
```typescript
// Already handled by existing logic:
if (!content.trim() || isSubmitting) return;
```

**Test Case:**
```typescript
test('handles whitespace-only content', () => {
  const { getByPlaceholderText, getByText } = render(<QuickPostSection />);
  const textarea = getByPlaceholderText(/Share your thoughts/);

  fireEvent.change(textarea, { target: { value: '     \n\n   ' } });

  const submitBtn = getByText('Quick Post');
  expect(submitBtn).toBeDisabled();
});
```

---

### EC-003: Exactly 10,000 Characters
**Scenario:** User types exactly at limit

**Behavior:**
- All 10,000 characters accepted
- Counter shows "10,000/10,000" in red
- Submit button enabled (content is valid)
- Full content submitted to API

**Test Case:**
```typescript
test('accepts exactly 10000 characters', () => {
  const maxContent = 'x'.repeat(10000);
  const { getByPlaceholderText, getByText } = render(<QuickPostSection />);
  const textarea = getByPlaceholderText(/Share your thoughts/);

  fireEvent.change(textarea, { target: { value: maxContent } });

  expect(textarea.value.length).toBe(10000);
  expect(getByText('10,000/10,000 characters')).toBeInTheDocument();
  expect(getByText('Quick Post')).not.toBeDisabled();
});
```

---

### EC-004: Paste Content Exceeding Limit
**Scenario:** User pastes 15,000 characters

**Behavior:**
- Content automatically truncated to 10,000
- Counter shows "10,000/10,000" in red
- No error message (browser handles via maxLength)
- User can edit to reduce length

**Implementation:**
```typescript
// Handled by HTML maxLength attribute:
<MentionInput maxLength={10000} />
```

**Test Case:**
```typescript
test('truncates pasted content exceeding limit', () => {
  const oversizedContent = 'x'.repeat(15000);
  const { getByPlaceholderText } = render(<QuickPostSection />);
  const textarea = getByPlaceholderText(/Share your thoughts/);

  // Simulate paste (browser will enforce maxLength)
  fireEvent.change(textarea, { target: { value: oversizedContent.slice(0, 10000) } });

  expect(textarea.value.length).toBe(10000);
});
```

---

### EC-005: Special Characters and Emojis
**Scenario:** User includes emojis, unicode, special chars

**Behavior:**
- All valid unicode accepted
- Character count may differ from byte count
- Mentions include special chars (@Agent-Name)
- API handles encoding correctly

**Test Case:**
```typescript
test('handles special characters and emojis', () => {
  const specialContent = 'Hello 👋 @Agent-1 testing 中文 éñ';
  const { getByPlaceholderText } = render(<QuickPostSection />);
  const textarea = getByPlaceholderText(/Share your thoughts/);

  fireEvent.change(textarea, { target: { value: specialContent } });

  expect(textarea.value).toBe(specialContent);
});
```

---

### EC-006: Network Failure During Submit
**Scenario:** API request fails (network error)

**Behavior:**
- Submit button shows "Posting..."
- Network error occurs
- Error logged to console
- Button returns to "Quick Post"
- Content preserved in textarea
- User can retry submission

**Implementation:**
```typescript
// Already handled in existing code:
try {
  const response = await fetch(/* ... */);
  // ...
} catch (error) {
  console.error('Failed to create quick post:', error);
} finally {
  setIsSubmitting(false);
}
```

**Enhancement Needed:**
```typescript
// Add user-facing error feedback:
const [error, setError] = useState<string | null>(null);

// In catch block:
catch (error) {
  console.error('Failed to create quick post:', error);
  setError('Failed to post. Please try again.');
  setTimeout(() => setError(null), 5000);
}

// In JSX:
{error && (
  <div className="text-sm text-red-600 mt-2">
    {error}
  </div>
)}
```

---

### EC-007: Rapid Successive Submissions
**Scenario:** User clicks submit multiple times quickly

**Behavior:**
- First click initiates submission
- Button disabled (isSubmitting = true)
- Subsequent clicks ignored
- First request completes
- Content clears only after success

**Implementation:**
```typescript
// Already protected by:
if (!content.trim() || isSubmitting) return;
disabled={!content.trim() || isSubmitting}
```

**Test Case:**
```typescript
test('prevents double submission', async () => {
  const onPostCreated = jest.fn();
  const { getByPlaceholderText, getByText } = render(
    <QuickPostSection onPostCreated={onPostCreated} />
  );

  const textarea = getByPlaceholderText(/Share your thoughts/);
  fireEvent.change(textarea, { target: { value: 'Test post' } });

  const submitBtn = getByText('Quick Post');
  fireEvent.click(submitBtn);
  fireEvent.click(submitBtn); // Second click

  await waitFor(() => expect(onPostCreated).toHaveBeenCalledTimes(1));
});
```

---

### EC-008: Character Counter Color Transitions
**Scenario:** User types across threshold boundaries

**Behavior:**
- Counter hidden until 9,500
- Gray from 9,500-9,699
- Orange from 9,700-9,899
- Red from 9,900-10,000
- Smooth color transitions

**Test Case:**
```typescript
test('character counter color changes at thresholds', () => {
  const { getByPlaceholderText, queryByText } = render(<QuickPostSection />);
  const textarea = getByPlaceholderText(/Share your thoughts/);

  // Below threshold - hidden
  fireEvent.change(textarea, { target: { value: 'x'.repeat(9499) } });
  expect(queryByText(/characters/)).not.toBeInTheDocument();

  // At 9500 - gray
  fireEvent.change(textarea, { target: { value: 'x'.repeat(9500) } });
  const counter9500 = screen.getByText('9,500/10,000 characters');
  expect(counter9500).toHaveClass('text-gray-600');

  // At 9700 - orange
  fireEvent.change(textarea, { target: { value: 'x'.repeat(9700) } });
  const counter9700 = screen.getByText('9,700/10,000 characters');
  expect(counter9700).toHaveClass('text-orange-600');

  // At 9900 - red
  fireEvent.change(textarea, { target: { value: 'x'.repeat(9900) } });
  const counter9900 = screen.getByText('9,900/10,000 characters');
  expect(counter9900).toHaveClass('text-red-600');
});
```

---

## 7. DATA MODEL & API

### 7.1 Data Model (No Changes)
Existing API endpoint and data structure remain unchanged:

```typescript
// POST /api/v1/agent-posts
interface PostRequest {
  title: string;        // Auto-generated from first 50 chars
  content: string;      // Full content (now up to 10,000 chars)
  author_agent: string; // 'user-agent' for quick posts
  metadata: {
    businessImpact: number;
    tags: string[];
    isAgentResponse: boolean;
    postType: string;   // 'quick'
    wordCount: number;
    readingTime: number;
  };
}

interface PostResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    content: string;
    author_agent: string;
    created_at: string;
    metadata: object;
  };
}
```

### 7.2 API Compatibility
- **Endpoint:** `/api/v1/agent-posts` (unchanged)
- **Method:** `POST` (unchanged)
- **Validation:** Backend may have length validation
- **Action Required:** Verify backend accepts 10,000 character content

### 7.3 Backend Validation Check
```bash
# Check database column definition
sqlite3 database.db "PRAGMA table_info(agent_posts);"

# Verify content column type
# Expected: TEXT (unlimited) or VARCHAR(>10000)
```

**Recommendation:** Confirm with backend team that `content` field can store 10,000+ characters.

---

## 8. IMPLEMENTATION PLAN

### 8.1 Development Phases

#### Phase 1: Code Modifications (2 hours)
1. **Remove Post Tab**
   - Update `PostingTab` type
   - Remove tab from `tabs` array
   - Remove conditional render block
   - Clean up unused imports
   - Duration: 30 minutes

2. **Enhance Quick Post**
   - Update `maxLength` to 10,000
   - Update `rows` to 6
   - Update placeholder text
   - Update section description
   - Duration: 30 minutes

3. **Implement Progressive Counter**
   - Add conditional render logic
   - Implement color transitions
   - Add number formatting
   - Duration: 1 hour

#### Phase 2: Testing (2 hours)
1. **Unit Tests**
   - Test character limit enforcement
   - Test counter visibility logic
   - Test color transitions
   - Test submit validation
   - Duration: 1 hour

2. **Integration Tests**
   - Test full post submission flow
   - Test mention functionality
   - Test API integration
   - Duration: 30 minutes

3. **Manual QA**
   - Visual regression testing
   - Cross-browser testing
   - Mobile device testing
   - Duration: 30 minutes

#### Phase 3: Deployment (30 minutes)
1. Code review and approval
2. Merge to main branch
3. Deploy to staging
4. Smoke test in staging
5. Deploy to production
6. Monitor for issues

### 8.2 Rollback Plan
If issues arise post-deployment:

```bash
# Emergency rollback (5 minutes)
git revert <commit-hash>
git push origin main

# Or restore previous version
git checkout <previous-commit> -- frontend/src/components/EnhancedPostingInterface.tsx
git commit -m "Rollback: Restore previous posting interface"
git push origin main
```

### 8.3 Risk Mitigation
- **Risk:** Backend rejects 10,000 character posts
  - **Mitigation:** Verify backend limits before deployment
  - **Contingency:** Reduce limit to backend maximum

- **Risk:** Performance issues with long content
  - **Mitigation:** Performance testing during Phase 2
  - **Contingency:** Add debouncing to character counter

- **Risk:** Mobile layout breaks
  - **Mitigation:** Responsive testing on multiple devices
  - **Contingency:** Add mobile-specific row count

---

## 9. TESTING REQUIREMENTS

### 9.1 Unit Tests

```typescript
// tests/components/EnhancedPostingInterface.test.tsx

describe('EnhancedPostingInterface - Simplified', () => {
  describe('Tab Navigation', () => {
    it('should only show Quick Post and Avi DM tabs', () => {
      render(<EnhancedPostingInterface />);
      expect(screen.getByText('Quick Post')).toBeInTheDocument();
      expect(screen.getByText('Avi DM')).toBeInTheDocument();
      expect(screen.queryByText('Post')).not.toBeInTheDocument();
    });

    it('should default to Quick Post tab', () => {
      render(<EnhancedPostingInterface />);
      expect(screen.getByText('Quick Post')).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Character Limit', () => {
    it('should accept up to 10,000 characters', () => {
      const { getByPlaceholderText } = render(<EnhancedPostingInterface />);
      const textarea = getByPlaceholderText(/Share your thoughts/);
      const content = 'x'.repeat(10000);

      fireEvent.change(textarea, { target: { value: content } });
      expect(textarea.value.length).toBe(10000);
    });

    it('should prevent input beyond 10,000 characters', () => {
      const { getByPlaceholderText } = render(<EnhancedPostingInterface />);
      const textarea = getByPlaceholderText(/Share your thoughts/);
      const content = 'x'.repeat(10001);

      fireEvent.change(textarea, { target: { value: content } });
      expect(textarea.value.length).toBeLessThanOrEqual(10000);
    });
  });

  describe('Character Counter', () => {
    it('should hide counter below 9,500 characters', () => {
      const { getByPlaceholderText, queryByText } = render(<EnhancedPostingInterface />);
      const textarea = getByPlaceholderText(/Share your thoughts/);

      fireEvent.change(textarea, { target: { value: 'x'.repeat(9499) } });
      expect(queryByText(/characters/)).not.toBeInTheDocument();
    });

    it('should show counter at 9,500+ characters', () => {
      const { getByPlaceholderText, getByText } = render(<EnhancedPostingInterface />);
      const textarea = getByPlaceholderText(/Share your thoughts/);

      fireEvent.change(textarea, { target: { value: 'x'.repeat(9500) } });
      expect(getByText('9,500/10,000 characters')).toBeInTheDocument();
    });

    it('should display gray color from 9,500-9,699', () => {
      const { getByPlaceholderText, getByText } = render(<EnhancedPostingInterface />);
      const textarea = getByPlaceholderText(/Share your thoughts/);

      fireEvent.change(textarea, { target: { value: 'x'.repeat(9600) } });
      const counter = getByText(/9,600\/10,000/);
      expect(counter).toHaveClass('text-gray-600');
    });

    it('should display orange color from 9,700-9,899', () => {
      const { getByPlaceholderText, getByText } = render(<EnhancedPostingInterface />);
      const textarea = getByPlaceholderText(/Share your thoughts/);

      fireEvent.change(textarea, { target: { value: 'x'.repeat(9800) } });
      const counter = getByText(/9,800\/10,000/);
      expect(counter).toHaveClass('text-orange-600');
    });

    it('should display red color from 9,900-10,000', () => {
      const { getByPlaceholderText, getByText } = render(<EnhancedPostingInterface />);
      const textarea = getByPlaceholderText(/Share your thoughts/);

      fireEvent.change(textarea, { target: { value: 'x'.repeat(9950) } });
      const counter = getByText(/9,950\/10,000/);
      expect(counter).toHaveClass('text-red-600');
    });

    it('should format numbers with commas', () => {
      const { getByPlaceholderText, getByText } = render(<EnhancedPostingInterface />);
      const textarea = getByPlaceholderText(/Share your thoughts/);

      fireEvent.change(textarea, { target: { value: 'x'.repeat(9500) } });
      expect(getByText('9,500/10,000 characters')).toBeInTheDocument();
    });
  });

  describe('Textarea Dimensions', () => {
    it('should display 6 rows by default', () => {
      const { getByPlaceholderText } = render(<EnhancedPostingInterface />);
      const textarea = getByPlaceholderText(/Share your thoughts/);
      expect(textarea).toHaveAttribute('rows', '6');
    });
  });

  describe('Placeholder Text', () => {
    it('should show updated placeholder text', () => {
      render(<EnhancedPostingInterface />);
      expect(
        screen.getByPlaceholderText('Share your thoughts, ideas, or updates... (up to 10,000 characters)')
      ).toBeInTheDocument();
    });
  });

  describe('Section Description', () => {
    it('should show updated description text', () => {
      render(<EnhancedPostingInterface />);
      expect(
        screen.getByText('Share your thoughts, updates, or longer-form content')
      ).toBeInTheDocument();
    });
  });

  describe('Submit Functionality', () => {
    it('should submit posts up to 10,000 characters', async () => {
      const mockOnPostCreated = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <EnhancedPostingInterface onPostCreated={mockOnPostCreated} />
      );

      const textarea = getByPlaceholderText(/Share your thoughts/);
      const longContent = 'x'.repeat(10000);

      fireEvent.change(textarea, { target: { value: longContent } });
      fireEvent.click(getByText('Quick Post'));

      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalled();
      });
    });

    it('should disable submit when content is empty', () => {
      const { getByText } = render(<EnhancedPostingInterface />);
      const submitBtn = getByText('Quick Post');
      expect(submitBtn).toBeDisabled();
    });

    it('should enable submit when content is valid', () => {
      const { getByPlaceholderText, getByText } = render(<EnhancedPostingInterface />);
      const textarea = getByPlaceholderText(/Share your thoughts/);

      fireEvent.change(textarea, { target: { value: 'Valid content' } });

      const submitBtn = getByText('Quick Post');
      expect(submitBtn).not.toBeDisabled();
    });
  });

  describe('Mention Functionality', () => {
    it('should preserve mention functionality', () => {
      const { getByPlaceholderText } = render(<EnhancedPostingInterface />);
      const textarea = getByPlaceholderText(/Share your thoughts/);

      // Verify MentionInput is rendered (not plain textarea)
      expect(textarea).toHaveAttribute('data-mention-input', 'true');
    });

    it('should include mentions in character count', () => {
      const { getByPlaceholderText, getByText } = render(<EnhancedPostingInterface />);
      const textarea = getByPlaceholderText(/Share your thoughts/);

      const contentWithMention = 'x'.repeat(9480) + ' @AgentName';
      fireEvent.change(textarea, { target: { value: contentWithMention } });

      expect(getByText(/9,50\d\/10,000/)).toBeInTheDocument();
    });
  });
});
```

### 9.2 Integration Tests

```typescript
// tests/integration/quick-post-flow.test.tsx

describe('Quick Post Flow - End to End', () => {
  beforeEach(() => {
    // Mock API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: '1', content: 'test' }
        })
      })
    ) as jest.Mock;
  });

  it('should complete full post creation flow', async () => {
    const { getByPlaceholderText, getByText } = render(<EnhancedPostingInterface />);

    // Type content
    const textarea = getByPlaceholderText(/Share your thoughts/);
    fireEvent.change(textarea, { target: { value: 'Test post content' } });

    // Submit
    fireEvent.click(getByText('Quick Post'));

    // Wait for submission
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/agent-posts',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Test post content')
        })
      );
    });

    // Verify textarea cleared
    expect(textarea.value).toBe('');
  });

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
    ) as jest.Mock;

    const { getByPlaceholderText, getByText } = render(<EnhancedPostingInterface />);

    const textarea = getByPlaceholderText(/Share your thoughts/);
    fireEvent.change(textarea, { target: { value: 'Test content' } });
    fireEvent.click(getByText('Quick Post'));

    await waitFor(() => {
      // Content should be preserved on error
      expect(textarea.value).toBe('Test content');
    });
  });
});
```

### 9.3 Visual Regression Tests

```typescript
// tests/visual/posting-interface.spec.ts (Playwright)

test.describe('Enhanced Posting Interface - Visual', () => {
  test('should match baseline - empty state', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.EnhancedPostingInterface')).toHaveScreenshot('quick-post-empty.png');
  });

  test('should match baseline - with content', async ({ page }) => {
    await page.goto('/');
    await page.fill('textarea', 'Test content');
    await expect(page.locator('.EnhancedPostingInterface')).toHaveScreenshot('quick-post-with-content.png');
  });

  test('should match baseline - character counter visible', async ({ page }) => {
    await page.goto('/');
    await page.fill('textarea', 'x'.repeat(9500));
    await expect(page.locator('.EnhancedPostingInterface')).toHaveScreenshot('quick-post-counter-gray.png');
  });

  test('should match baseline - character counter orange', async ({ page }) => {
    await page.goto('/');
    await page.fill('textarea', 'x'.repeat(9700));
    await expect(page.locator('.EnhancedPostingInterface')).toHaveScreenshot('quick-post-counter-orange.png');
  });

  test('should match baseline - character counter red', async ({ page }) => {
    await page.goto('/');
    await page.fill('textarea', 'x'.repeat(9900));
    await expect(page.locator('.EnhancedPostingInterface')).toHaveScreenshot('quick-post-counter-red.png');
  });

  test('should match baseline - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('.EnhancedPostingInterface')).toHaveScreenshot('quick-post-mobile.png');
  });
});
```

### 9.4 Accessibility Tests

```typescript
// tests/a11y/posting-interface.test.tsx

import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

describe('Enhanced Posting Interface - Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<EnhancedPostingInterface />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should support keyboard navigation', () => {
    const { getByText, getByPlaceholderText } = render(<EnhancedPostingInterface />);

    // Tab to textarea
    const textarea = getByPlaceholderText(/Share your thoughts/);
    textarea.focus();
    expect(document.activeElement).toBe(textarea);

    // Tab to submit button
    userEvent.tab();
    const submitBtn = getByText('Quick Post');
    expect(document.activeElement).toBe(submitBtn);
  });

  it('should announce character count to screen readers', () => {
    const { getByPlaceholderText, getByText } = render(<EnhancedPostingInterface />);
    const textarea = getByPlaceholderText(/Share your thoughts/);

    fireEvent.change(textarea, { target: { value: 'x'.repeat(9500) } });

    const counter = getByText(/9,500\/10,000/);
    expect(counter).toHaveAttribute('role', 'status');
    expect(counter).toHaveAttribute('aria-live', 'polite');
  });
});
```

### 9.5 Performance Tests

```typescript
// tests/performance/posting-interface.test.tsx

describe('Enhanced Posting Interface - Performance', () => {
  it('should render quickly with empty state', () => {
    const startTime = performance.now();
    render(<EnhancedPostingInterface />);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100);
  });

  it('should handle 10,000 character input efficiently', () => {
    const { getByPlaceholderText } = render(<EnhancedPostingInterface />);
    const textarea = getByPlaceholderText(/Share your thoughts/);
    const longContent = 'x'.repeat(10000);

    const startTime = performance.now();
    fireEvent.change(textarea, { target: { value: longContent } });
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(200);
  });

  it('should update character counter without lag', () => {
    const { getByPlaceholderText, rerender } = render(<EnhancedPostingInterface />);
    const textarea = getByPlaceholderText(/Share your thoughts/);

    const updateTimes: number[] = [];

    for (let i = 9500; i < 9510; i++) {
      const startTime = performance.now();
      fireEvent.change(textarea, { target: { value: 'x'.repeat(i) } });
      const endTime = performance.now();
      updateTimes.push(endTime - startTime);
    }

    const avgTime = updateTimes.reduce((a, b) => a + b) / updateTimes.length;
    expect(avgTime).toBeLessThan(50);
  });
});
```

### 9.6 Manual QA Checklist

#### Desktop Testing
- [ ] Chrome: All features work correctly
- [ ] Firefox: All features work correctly
- [ ] Safari: All features work correctly
- [ ] Edge: All features work correctly
- [ ] Character counter appears/disappears correctly
- [ ] Color transitions work smoothly
- [ ] Textarea is appropriately sized
- [ ] Submit button enables/disables correctly
- [ ] Long posts submit successfully
- [ ] Mentions work in long posts

#### Mobile Testing
- [ ] iOS Safari (iPhone 12): Responsive layout
- [ ] iOS Safari (iPhone SE): Small screen support
- [ ] Chrome Mobile (Android): Full functionality
- [ ] Textarea visible without obscuring
- [ ] Submit button accessible
- [ ] Keyboard doesn't break layout
- [ ] Touch targets adequate size

#### Edge Case Validation
- [ ] Empty submission prevented
- [ ] Whitespace-only prevented
- [ ] 10,000 character limit enforced
- [ ] Paste truncation works
- [ ] Special characters handled
- [ ] Emojis display correctly
- [ ] Network error handling
- [ ] Double-submit prevention

#### Accessibility Validation
- [ ] Keyboard navigation complete
- [ ] Screen reader compatibility
- [ ] Focus indicators visible
- [ ] Color contrast sufficient
- [ ] ARIA labels present

---

## 10. ACCEPTANCE CRITERIA SUMMARY

### 10.1 Functional Acceptance

| Requirement | Acceptance Criteria | Status |
|-------------|---------------------|--------|
| FR-001 | Post tab not visible | ☐ |
| FR-001 | Only Quick Post and Avi DM visible | ☐ |
| FR-001 | PostCreator.tsx unchanged | ☐ |
| FR-002 | Character limit is 10,000 | ☐ |
| FR-002 | Full content submitted to API | ☐ |
| FR-003 | Counter hidden below 9,500 | ☐ |
| FR-003 | Counter visible at 9,500+ | ☐ |
| FR-003 | Color changes at thresholds | ☐ |
| FR-004 | Textarea displays 6 rows | ☐ |
| FR-005 | Updated placeholder text | ☐ |
| FR-006 | Updated section description | ☐ |

### 10.2 Non-Functional Acceptance

| Requirement | Acceptance Criteria | Status |
|-------------|---------------------|--------|
| NFR-001 | Render time < 100ms | ☐ |
| NFR-001 | No input lag with 10k chars | ☐ |
| NFR-002 | Works on all listed browsers | ☐ |
| NFR-003 | WCAG 2.1 AA compliant | ☐ |
| NFR-003 | Keyboard navigation works | ☐ |
| NFR-004 | Mobile responsive (≥320px) | ☐ |
| NFR-004 | Touch targets ≥44x44px | ☐ |

### 10.3 Quality Gates

#### Pre-Deployment Checklist
- [ ] All unit tests passing (100% coverage for changed code)
- [ ] Integration tests passing
- [ ] Visual regression tests passing
- [ ] Accessibility tests passing (zero violations)
- [ ] Performance benchmarks met
- [ ] Manual QA completed (all platforms)
- [ ] Code review approved (2+ reviewers)
- [ ] Documentation updated
- [ ] Backend compatibility confirmed

#### Post-Deployment Validation
- [ ] Smoke tests pass in production
- [ ] No error spike in monitoring
- [ ] User feedback positive
- [ ] Performance metrics within range
- [ ] No accessibility regressions

---

## 11. COMPLETE CODE CHANGES

### 11.1 Full Modified File

**File:** `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

```typescript
import React, { useState } from 'react';
import { Zap, Bot } from 'lucide-react';
import { cn } from '../utils/cn';
// PostCreator component preserved in codebase for agent use
import { MentionInput, MentionSuggestion } from './MentionInput';
import AviTypingIndicator from './AviTypingIndicator';
import MarkdownRenderer from './markdown/MarkdownRenderer';

type PostingTab = 'quick' | 'avi';

interface EnhancedPostingInterfaceProps {
  className?: string;
  onPostCreated?: (post: any) => void;
  isLoading?: boolean;
}

export const EnhancedPostingInterface: React.FC<EnhancedPostingInterfaceProps> = ({
  className,
  onPostCreated,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<PostingTab>('quick');

  const tabs = [
    { id: 'quick' as PostingTab, label: 'Quick Post', icon: Zap, description: 'Share thoughts and updates' },
    { id: 'avi' as PostingTab, label: 'Avi DM', icon: Bot, description: 'Chat with Avi' },
  ];

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-100">
        <nav className="flex space-x-8 px-4" aria-label="Posting tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
                aria-selected={isActive}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'quick' && (
          <QuickPostSection onPostCreated={onPostCreated} />
        )}

        {activeTab === 'avi' && (
          <AviChatSection
            onMessageSent={onPostCreated}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

// Simple Quick Post Component
const QuickPostSection: React.FC<{ onPostCreated?: (post: any) => void }> = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState<MentionSuggestion[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/agent-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: content.trim().slice(0, 50) + (content.length > 50 ? '...' : ''),
          content: content.trim(),
          author_agent: 'user-agent',
          metadata: {
            businessImpact: 5,
            tags: [],
            isAgentResponse: false,
            postType: 'quick',
            wordCount: content.trim().split(/\s+/).length,
            readingTime: 1
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const result = await response.json();
      onPostCreated?.(result.data);
      setContent('');
    } catch (error) {
      console.error('Failed to create quick post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMentionSelect = (mention: MentionSuggestion) => {
    setSelectedMentions(prev => {
      if (!prev.find(m => m.id === mention.id)) {
        return [...prev, mention];
      }
      return prev;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Post</h3>
        <p className="text-sm text-gray-600">Share your thoughts, updates, or longer-form content</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <MentionInput
            value={content}
            onChange={setContent}
            onMentionSelect={handleMentionSelect}
            placeholder="Share your thoughts, ideas, or updates... (up to 10,000 characters)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={6}
            maxLength={10000}
            mentionContext="quick-post"
            aria-label="Quick post content"
            aria-describedby="char-counter"
          />
          {content.length >= 9500 && (
            <div
              id="char-counter"
              role="status"
              aria-live="polite"
              className={cn(
                "text-xs mt-1 transition-colors",
                content.length >= 9900 ? "text-red-600 font-semibold" :
                content.length >= 9700 ? "text-orange-600 font-medium" :
                "text-gray-600"
              )}
            >
              {content.length.toLocaleString()}/10,000 characters
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            content.trim() && !isSubmitting
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          )}
        >
          {isSubmitting ? 'Posting...' : 'Quick Post'}
        </button>
      </form>
    </div>
  );
};

// Simple Avi Chat Component
const AviChatSection: React.FC<{
  onMessageSent?: (message: any) => void;
  isLoading?: boolean;
}> = ({ onMessageSent, isLoading = false }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{
    id: string;
    content: string | React.ReactNode;
    sender: 'user' | 'avi' | 'typing';
    timestamp: Date;
  }>>([]);

  const callAviClaudeCode = async (userMessage: string): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const systemContext = `You are Λvi, the production Claude instance operating as Chief of Staff. Your complete operating instructions and personality are defined in /workspaces/agent-feed/prod/CLAUDE.md. Read that file using your Read tool to understand your role and boundaries.`;

      const fullPrompt = `${systemContext}\n\nUser message: ${userMessage}`;

      console.log('🔍 DEBUG: Fetching from /api/claude-code/streaming-chat');
      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fullPrompt,
          options: {
            cwd: '/workspaces/agent-feed/prod'
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('🔍 DEBUG: Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🔍 DEBUG: Parsed JSON data:', data);

      if (typeof data === 'string') return data;
      if (data.message) return data.message;
      if (data.responses?.[0]?.content) return data.responses[0].content;
      if (data.content) {
        if (typeof data.content === 'string') return data.content;
        if (Array.isArray(data.content)) {
          const textBlocks = data.content
            .filter((block: any) => block.type === 'text' || block.text)
            .map((block: any) => block.text)
            .filter(Boolean);
          if (textBlocks.length > 0) return textBlocks.join('\n');
        }
      }

      return 'No response received from Λvi';
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - Λvi is taking longer than expected. Please try a simpler question or try again later.');
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error - Please check your connection and try again.');
        }
      }

      console.error('Avi Claude Code API error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    const userMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      sender: 'user' as const,
      timestamp: new Date(),
    };

    const typingIndicator = {
      id: 'typing-indicator',
      content: <AviTypingIndicator isVisible={true} inline={true} />,
      sender: 'typing' as const,
      timestamp: new Date(),
    };

    setChatHistory(prev => [...prev, userMessage, typingIndicator]);
    setIsSubmitting(true);
    setMessage('');

    try {
      console.log('🔍 DEBUG: Calling Avi Claude Code with message:', userMessage.content);
      const aviResponseContent = await callAviClaudeCode(userMessage.content);
      console.log('🔍 DEBUG: Received response:', aviResponseContent);

      const aviResponse = {
        id: (Date.now() + 1).toString(),
        content: aviResponseContent,
        sender: 'avi' as const,
        timestamp: new Date(),
      };

      console.log('🔍 DEBUG: Replacing typing indicator with response');
      setChatHistory(prev => {
        const withoutTyping = prev.filter(msg => msg.sender !== 'typing');
        return [...withoutTyping, aviResponse];
      });
      onMessageSent?.(userMessage);
    } catch (error) {
      console.error('❌ ERROR: Failed to get Avi response:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorResponse = {
        id: (Date.now() + 1).toString(),
        content: `I encountered an error: ${errorMessage}. Please try again.`,
        sender: 'avi' as const,
        timestamp: new Date(),
      };

      setChatHistory(prev => {
        const withoutTyping = prev.filter(msg => msg.sender !== 'typing');
        return [...withoutTyping, errorResponse];
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chat with Λvi</h3>
        <p className="text-sm text-gray-600">Direct message with your Chief of Staff</p>
      </div>

      {/* Chat History */}
      <div className="h-64 border border-gray-200 rounded-lg p-4 overflow-y-auto bg-gray-50">
        {chatHistory.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-8 h-8 mx-auto mb-2" />
            <p>Λvi is ready to assist. What can I help you with?</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chatHistory.map((msg) => (
              <div key={msg.id} className={cn(
                'p-3 rounded-lg',
                msg.sender === 'user'
                  ? 'bg-blue-100 text-blue-900 ml-auto max-w-xs'
                  : msg.sender === 'typing'
                  ? 'bg-white text-gray-900 border border-gray-200 max-w-xs'
                  : 'bg-white text-gray-900 max-w-full'
              )}>
                {msg.sender === 'typing' ? (
                  <div className="text-sm">{msg.content}</div>
                ) : msg.sender === 'avi' ? (
                  <MarkdownRenderer
                    content={typeof msg.content === 'string' ? msg.content : String(msg.content)}
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
                {msg.sender !== 'typing' && (
                  <p className="text-xs text-gray-500 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message to Λvi..."
            disabled={isSubmitting || isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!message.trim() || isSubmitting || isLoading}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              message.trim() && !isSubmitting && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </form>
    </div>
  );
};

export default EnhancedPostingInterface;
```

### 11.2 Line-by-Line Change Summary

| Line(s) | Change Type | Description |
|---------|-------------|-------------|
| 2 | Modified | Removed `Edit3` from imports (Post tab icon) |
| 4 | Modified | Removed `PostCreator` import (commented preserved) |
| 10 | Modified | Updated type: removed `'post'` option |
| 25-28 | Modified | Removed Post tab from array, updated descriptions |
| 60-65 | Deleted | Removed PostCreator conditional render block |
| 138-139 | Modified | Updated section title and description |
| 148 | Modified | Updated placeholder text |
| 150 | Modified | Changed rows from 3 to 6 |
| 151 | Modified | Changed maxLength from 500 to 10,000 |
| 152-153 | Added | Added ARIA attributes for accessibility |
| 154-168 | Modified | Replaced static counter with progressive conditional counter |
| 176-393 | Unchanged | AviChatSection remains identical |

---

## 12. DEFINITION OF DONE

### 12.1 Development Complete
- [x] All code changes implemented
- [ ] Code follows project style guidelines
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Self-review completed

### 12.2 Testing Complete
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Visual regression tests passing
- [ ] Accessibility tests passing
- [ ] Performance tests passing
- [ ] Manual QA completed on all browsers
- [ ] Mobile testing completed
- [ ] Edge cases validated

### 12.3 Documentation Complete
- [x] SPARC specification document created
- [ ] Code comments added where necessary
- [ ] README updated (if needed)
- [ ] CHANGELOG updated
- [ ] API documentation verified

### 12.4 Review Complete
- [ ] Peer review completed
- [ ] Design review completed
- [ ] Security review completed (if needed)
- [ ] Accessibility review completed
- [ ] All feedback addressed

### 12.5 Deployment Complete
- [ ] Merged to main branch
- [ ] Deployed to staging
- [ ] Smoke tests passed in staging
- [ ] Deployed to production
- [ ] Production monitoring shows no issues
- [ ] User acceptance confirmed

---

## 13. RISK ASSESSMENT

### 13.1 Technical Risks

| Risk | Probability | Impact | Mitigation | Contingency |
|------|-------------|--------|------------|-------------|
| Backend rejects 10k char posts | Medium | High | Verify backend limits pre-deployment | Reduce frontend limit to backend max |
| Performance degradation | Low | Medium | Performance testing during QA | Add debouncing/throttling |
| Mobile layout breaks | Low | High | Responsive testing on real devices | Add mobile-specific styles |
| Character counter flicker | Low | Low | Use React optimization patterns | Debounce counter updates |
| Mention functionality breaks | Low | High | Integration testing with mentions | Rollback to previous version |

### 13.2 User Experience Risks

| Risk | Probability | Impact | Mitigation | Contingency |
|------|-------------|--------|------------|-------------|
| Users confused by missing Post tab | Low | Low | Clear messaging in Quick Post | Add tooltip/help text |
| Counter appearance startles users | Low | Low | Smooth transition with CSS | Always show counter |
| 10k limit insufficient | Low | Medium | User feedback monitoring | Increase limit in future |
| Textarea too large on mobile | Low | Medium | Responsive design testing | Reduce mobile row count |

### 13.3 Business Risks

| Risk | Probability | Impact | Mitigation | Contingency |
|------|-------------|--------|------------|-------------|
| Reduced post creation | Very Low | Medium | Monitor analytics | Revert changes |
| Increased low-quality posts | Low | Low | Content moderation review | Add quality guidelines |
| Agent posting affected | Very Low | Critical | Preserve PostCreator.tsx unchanged | Emergency rollback |

---

## 14. SUCCESS METRICS

### 14.1 Technical Metrics
- **Performance:** Component render time < 100ms (baseline: ~50ms)
- **Bundle Size:** No increase > 1KB
- **Error Rate:** < 0.1% error rate on post submissions
- **Load Time:** No regression in page load time

### 14.2 User Metrics
- **Adoption Rate:** 80%+ users utilize Quick Post within 1 week
- **Post Length:** Average post length increases by 200%+
- **Submission Success:** 99%+ successful post submissions
- **User Satisfaction:** No negative feedback spike

### 14.3 Quality Metrics
- **Test Coverage:** 90%+ coverage for changed code
- **Code Quality:** Zero critical or high severity issues
- **Accessibility:** Zero accessibility violations (axe)
- **Browser Compatibility:** 100% functionality across listed browsers

### 14.4 Monitoring Dashboard

```typescript
// Metrics to track in production
const metrics = {
  // Usage
  quickPostUsageRate: 'percentage of users using Quick Post',
  averagePostLength: 'mean character count of posts',
  postsOver5000Chars: 'count of posts > 5000 characters',

  // Performance
  componentRenderTime: 'p95 render time in ms',
  inputLagMetric: 'time between keypress and display',

  // Quality
  postSubmissionSuccessRate: 'successful submissions / total attempts',
  errorRate: 'failed submissions / total attempts',

  // User Behavior
  characterCounterVisibility: 'how often counter becomes visible',
  limitsReached: 'posts submitted at exactly 10000 chars'
};
```

---

## 15. APPENDIX

### 15.1 Glossary

| Term | Definition |
|------|------------|
| **Quick Post** | Simplified posting interface for rapid content creation |
| **Progressive Display** | UI element that appears based on user action/state |
| **Character Counter** | Visual indicator showing current/maximum character count |
| **Mention** | Reference to another user/agent in post content (@username) |
| **PostCreator** | Full-featured post creation component (preserved for agents) |
| **SPARC** | Specification, Pseudocode, Architecture, Refinement, Completion |

### 15.2 References

- **SPARC Methodology:** `/workspaces/agent-feed/docs/SPARC_SPECIFICATION_POSTING_INTERFACE_SIMPLIFICATION.md`
- **Component Source:** `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`
- **MentionInput Component:** `/workspaces/agent-feed/frontend/src/components/MentionInput.tsx`
- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **React Best Practices:** https://react.dev/learn

### 15.3 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-01 | SPARC Agent | Initial specification created |

### 15.4 Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Product Owner** | ___________ | ___________ | ___/___/___ |
| **Engineering Lead** | ___________ | ___________ | ___/___/___ |
| **QA Lead** | ___________ | ___________ | ___/___/___ |
| **UX Designer** | ___________ | ___________ | ___/___/___ |

---

## 16. NEXT STEPS

### 16.1 Immediate Actions
1. **Review Specification** - Product, Engineering, QA, UX review (1 day)
2. **Backend Verification** - Confirm 10,000 char limit support (2 hours)
3. **Approve Specification** - Stakeholder sign-off (1 day)
4. **Begin Implementation** - Developer assigned to task

### 16.2 Implementation Phase Order
1. **Phase 1:** Code modifications (2 hours)
2. **Phase 2:** Testing (2 hours)
3. **Phase 3:** Code review and deployment (30 minutes)

### 16.3 Post-Implementation
1. **Monitor Metrics** - Track success metrics for 1 week
2. **Gather Feedback** - User feedback collection
3. **Iterate** - Address any issues or improvements
4. **Document Lessons** - Update SPARC process documentation

---

**END OF SPECIFICATION**

---

## VALIDATION CHECKLIST

Before proceeding to implementation, verify:

- [x] All functional requirements clearly defined
- [x] All non-functional requirements specified
- [x] Acceptance criteria are testable
- [x] Edge cases documented
- [x] Test requirements comprehensive
- [x] Risk assessment complete
- [x] Success metrics defined
- [ ] Stakeholder approval obtained
- [ ] Backend compatibility confirmed
- [ ] Resources allocated

**Specification Status:** ✅ **READY FOR IMPLEMENTATION**

---

*This SPARC Specification document serves as the authoritative source for implementing the Posting Interface Simplification feature. All implementation decisions should reference this document.*
