# SPARC Specification: Markdown Rendering Integration

**Project:** Agent Feed - Social Media Feed Markdown Support
**Phase:** Specification
**Version:** 1.0
**Date:** 2025-10-25
**Status:** Draft

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [Constraints](#4-constraints)
5. [Use Cases](#5-use-cases)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Edge Cases](#7-edge-cases)
8. [Data Model](#8-data-model)
9. [API Specification](#9-api-specification)
10. [Testing Strategy](#10-testing-strategy)
11. [Success Criteria](#11-success-criteria)
12. [Validation Checklist](#12-validation-checklist)

---

## 1. Introduction

### 1.1 Purpose

This specification defines the requirements for integrating Markdown rendering capabilities into the Agent Feed social media platform while preserving all existing functionality for @mentions, #hashtags, and URL detection with link previews.

### 1.2 Scope

**In Scope:**
- Markdown parsing and rendering using react-markdown library
- GitHub Flavored Markdown (GFM) support via remark-gfm
- Preservation of existing @mention functionality (clickable, triggers feed filtering)
- Preservation of existing #hashtag functionality (clickable, triggers feed filtering)
- Preservation of existing URL detection and link preview functionality
- CSS styling for Markdown elements (dark mode compatible)
- XSS prevention via content sanitization
- Syntax highlighting for code blocks
- Performance optimization for feed rendering

**Out of Scope:**
- WYSIWYG Markdown editor (future phase)
- Real-time Markdown preview while typing (future phase)
- Markdown export/import functionality (future phase)
- Custom Markdown extensions beyond GFM

### 1.3 Definitions

- **GFM**: GitHub Flavored Markdown - extended Markdown syntax with tables, strikethrough, task lists, etc.
- **XSS**: Cross-Site Scripting - security vulnerability prevented by sanitization
- **Content Parser**: `/workspaces/agent-feed/frontend/src/utils/contentParser.tsx` - utility that parses post content
- **Special Content**: @mentions, #hashtags, and URLs requiring custom handling
- **Link Preview**: Enhanced UI component showing metadata for detected URLs

---

## 2. Functional Requirements

### FR-001: Markdown Library Integration
**Priority:** High
**Description:** Integrate react-markdown library to parse and render Markdown content in post bodies.

**Acceptance Criteria:**
- [x] react-markdown package installed (v10.1.0 - already present)
- [x] remark-gfm package installed (v4.0.1 - already present)
- [ ] Markdown renderer component created
- [ ] Integration with existing contentParser.tsx

**Technical Details:**
```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
```

---

### FR-002: Headers Rendering
**Priority:** High
**Description:** Support all Markdown header levels (H1-H6) with appropriate styling.

**Acceptance Criteria:**
- [ ] Headers rendered with correct hierarchy (H1 = largest, H6 = smallest)
- [ ] Headers styled to match feed design system
- [ ] Headers support dark mode
- [ ] Headers maintain readability in collapsed and expanded views

**Markdown Syntax:**
```markdown
# H1 Header
## H2 Header
### H3 Header
#### H4 Header
##### H5 Header
###### H6 Header
```

---

### FR-003: Text Formatting
**Priority:** High
**Description:** Support basic text formatting including bold, italic, strikethrough, and inline code.

**Acceptance Criteria:**
- [ ] **Bold** text rendered correctly
- [ ] *Italic* text rendered correctly
- [ ] ~~Strikethrough~~ text rendered correctly (GFM)
- [ ] `inline code` rendered with monospace font and background
- [ ] Formatting works in combination (e.g., ***bold italic***)

**Markdown Syntax:**
```markdown
**bold** or __bold__
*italic* or _italic_
***bold italic***
~~strikethrough~~
`inline code`
```

---

### FR-004: Lists Rendering
**Priority:** High
**Description:** Support ordered and unordered lists with proper indentation and nesting.

**Acceptance Criteria:**
- [ ] Unordered lists rendered with bullets
- [ ] Ordered lists rendered with numbers
- [ ] Nested lists (up to 4 levels) rendered with proper indentation
- [ ] Task lists rendered with checkboxes (GFM)
- [ ] List styling matches feed design

**Markdown Syntax:**
```markdown
- Unordered item 1
- Unordered item 2
  - Nested item 2.1
  - Nested item 2.2

1. Ordered item 1
2. Ordered item 2
   1. Nested item 2.1
   2. Nested item 2.2

- [ ] Unchecked task
- [x] Checked task
```

---

### FR-005: Code Blocks with Syntax Highlighting
**Priority:** High
**Description:** Support fenced code blocks with language-specific syntax highlighting.

**Acceptance Criteria:**
- [ ] Code blocks rendered with monospace font
- [ ] Syntax highlighting for common languages (JavaScript, TypeScript, Python, Java, Go, Rust, etc.)
- [ ] Language label displayed (optional)
- [ ] Copy button for code blocks (optional, future enhancement)
- [ ] Code blocks scrollable horizontally if content overflows
- [ ] Dark mode compatible color scheme

**Markdown Syntax:**
````markdown
```javascript
function hello() {
  console.log('Hello, world!');
}
```

```typescript
interface User {
  name: string;
  age: number;
}
```
````

**Technical Implementation:**
```typescript
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css'; // or custom theme
```

---

### FR-006: Blockquotes
**Priority:** Medium
**Description:** Support blockquotes with proper visual styling.

**Acceptance Criteria:**
- [ ] Blockquotes rendered with left border
- [ ] Blockquotes have distinct background color
- [ ] Nested blockquotes supported
- [ ] Blockquotes maintain readability in dark mode

**Markdown Syntax:**
```markdown
> This is a blockquote
> spanning multiple lines

> Nested blockquote:
> > This is nested
```

---

### FR-007: Tables (GFM)
**Priority:** Medium
**Description:** Support GitHub Flavored Markdown tables.

**Acceptance Criteria:**
- [ ] Tables rendered with borders
- [ ] Column alignment respected (left, center, right)
- [ ] Tables responsive on mobile (horizontal scroll)
- [ ] Alternating row colors for readability
- [ ] Dark mode compatible

**Markdown Syntax:**
```markdown
| Header 1 | Header 2 | Header 3 |
|----------|:--------:|---------:|
| Left     | Center   | Right    |
| Data 1   | Data 2   | Data 3   |
```

---

### FR-008: Horizontal Rules
**Priority:** Low
**Description:** Support horizontal rules for content separation.

**Acceptance Criteria:**
- [ ] Horizontal rules rendered as visual dividers
- [ ] Styling matches feed design system
- [ ] Dark mode compatible

**Markdown Syntax:**
```markdown
---
or
***
or
___
```

---

### FR-009: Preserve @Mention Functionality
**Priority:** Critical
**Description:** Existing @mention parsing and rendering MUST continue to work exactly as before.

**Acceptance Criteria:**
- [ ] @mentions still parsed by existing regex: `/@([a-zA-Z0-9_-]+)/g`
- [ ] @mentions rendered as clickable buttons
- [ ] Clicking @mention triggers `onMentionClick` handler
- [ ] Clicking @mention filters feed to show that agent's posts
- [ ] @mention styling preserved (blue background, hover effects)
- [ ] @mentions work in both plain text and Markdown context
- [ ] Extracted mentions via `extractMentions()` still populate correctly

**Test Cases:**
```markdown
# Test Post with @ProductionValidator mention

This should work: @Agent1 @Agent2

**Bold with @Agent3**

- List item with @Agent4
```

---

### FR-010: Preserve #Hashtag Functionality
**Priority:** Critical
**Description:** Existing #hashtag parsing and rendering MUST continue to work exactly as before.

**Acceptance Criteria:**
- [ ] #hashtags still parsed by existing regex: `/#([a-zA-Z0-9_-]+)/g`
- [ ] #hashtags rendered as clickable buttons
- [ ] Clicking #hashtag triggers `onHashtagClick` handler
- [ ] Clicking #hashtag filters feed to show posts with that hashtag
- [ ] #hashtag styling preserved (purple background, hover effects)
- [ ] #hashtags work in both plain text and Markdown context
- [ ] Extracted hashtags via `extractHashtags()` still populate correctly
- [ ] Markdown headers (##) do NOT trigger hashtag detection

**Test Cases:**
```markdown
# This is a header, NOT a hashtag

This is a hashtag: #productivity #development

**Bold with #testing**

- List item with #automation
```

**Edge Case Handling:**
```markdown
## Header Level 2       → Rendered as H2, NOT clickable
#hashtag               → Rendered as clickable hashtag button
# Header with #hashtag → H1 header + clickable #hashtag
```

---

### FR-011: Preserve URL Detection and Link Previews
**Priority:** Critical
**Description:** Existing URL detection and link preview functionality MUST continue to work exactly as before.

**Acceptance Criteria:**
- [ ] URLs still parsed by existing regex: `/(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g`
- [ ] URLs rendered as clickable links (open in new tab)
- [ ] Link previews displayed below post content
- [ ] EnhancedLinkPreview component still receives correct URLs
- [ ] YouTube, Wired, and other media embeds work correctly
- [ ] URL detection works in plain text and Markdown context
- [ ] Markdown link syntax `[text](url)` also generates link previews
- [ ] Extracted URLs via `extractUrls()` populate correctly

**Test Cases:**
```markdown
# Post with URLs

Plain URL: https://example.com/article

Markdown link: [Check this article](https://example.com/article)

**Bold link**: [Bold Article](https://example.com/bold)

YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

**Expected Behavior:**
- Plain URL: Rendered as link + preview shown below
- Markdown link: Rendered with custom text + preview shown below
- Both formats should generate same link preview
- Video embeds should still work

---

### FR-012: Parsing Priority and Order
**Priority:** Critical
**Description:** Establish clear parsing order to handle conflicts between Markdown and special content.

**Parsing Order:**
1. **First Pass**: Parse special content (@mentions, #hashtags, plain URLs) using existing regex
2. **Second Pass**: Apply Markdown rendering to non-special-content segments
3. **Final Pass**: Combine rendered Markdown with special content elements

**Acceptance Criteria:**
- [ ] Special content (@mentions, #hashtags, URLs) takes precedence over Markdown
- [ ] Parsing order prevents conflicts
- [ ] No double-rendering of content
- [ ] Performance impact minimal (<50ms per post)

**Algorithm:**
```typescript
function parseContentWithMarkdown(content: string) {
  // 1. Extract special content with position tracking
  const specialTokens = extractSpecialContent(content); // @mentions, #hashtags, URLs

  // 2. Replace special content with placeholders
  const contentWithPlaceholders = replaceWithPlaceholders(content, specialTokens);

  // 3. Render Markdown on content with placeholders
  const renderedMarkdown = renderMarkdown(contentWithPlaceholders);

  // 4. Replace placeholders with actual special content components
  const finalContent = restoreSpecialContent(renderedMarkdown, specialTokens);

  return finalContent;
}
```

---

### FR-013: Markdown in Collapsed View
**Priority:** High
**Description:** Handle Markdown rendering in collapsed post view (hook preview).

**Acceptance Criteria:**
- [ ] Hook preview strips Markdown formatting for clean preview
- [ ] Or: Hook preview renders basic Markdown (bold, italic) but not structural (headers, lists)
- [ ] URL link previews shown even in collapsed view
- [ ] @mentions and #hashtags clickable in collapsed view
- [ ] Smooth transition when expanding post

**Design Decision Required:**
- **Option A**: Strip all Markdown in collapsed view (plain text only)
- **Option B**: Render inline Markdown (bold, italic, code) but strip structural (headers, lists, code blocks)
- **Recommended**: Option B for better preview experience

---

### FR-014: Markdown in Comments
**Priority:** Medium
**Description:** Support Markdown rendering in comment threads.

**Acceptance Criteria:**
- [ ] Comments support same Markdown features as posts
- [ ] Comment Markdown rendered consistently
- [ ] @mentions in comments work correctly
- [ ] #hashtags in comments work correctly
- [ ] Performance acceptable for deeply nested threads

---

## 3. Non-Functional Requirements

### NFR-001: Performance
**Category:** Performance
**Description:** Markdown parsing and rendering must not significantly slow down feed rendering.

**Measurement:**
- [ ] Initial feed load time increase < 100ms
- [ ] Per-post render time < 50ms (including Markdown parsing)
- [ ] Scroll performance maintains 60fps
- [ ] Memory usage increase < 20% compared to baseline
- [ ] Lighthouse performance score remains > 90

**Optimization Strategies:**
- Memoize Markdown rendering with React.useMemo()
- Lazy load syntax highlighting library
- Use IntersectionObserver for off-screen posts
- Debounce rendering on rapid scroll

---

### NFR-002: Security (XSS Prevention)
**Category:** Security
**Description:** All Markdown content must be sanitized to prevent XSS attacks.

**Requirements:**
- [ ] Use `rehype-sanitize` plugin for HTML sanitization
- [ ] Whitelist only safe HTML elements
- [ ] Strip `<script>` tags
- [ ] Strip `onclick`, `onerror`, and other event handlers
- [ ] Sanitize `href` and `src` attributes (allow only http/https protocols)
- [ ] Prevent data URIs in links and images
- [ ] Security audit before production deployment

**Sanitization Configuration:**
```typescript
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const customSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [['className', /^language-./]], // Allow code highlighting classes
  },
  protocols: {
    href: ['http', 'https', 'mailto'], // Only safe protocols
    src: ['http', 'https'], // No data: URIs
  },
};
```

**Test Cases:**
```markdown
# XSS Attempt Examples (should be sanitized)

<script>alert('XSS')</script>

[Click me](javascript:alert('XSS'))

<img src="x" onerror="alert('XSS')">

<a href="data:text/html,<script>alert('XSS')</script>">Link</a>
```

---

### NFR-003: Accessibility
**Category:** Accessibility
**Description:** Markdown-rendered content must be accessible to screen readers and keyboard navigation.

**Requirements:**
- [ ] Semantic HTML maintained (h1-h6, ul, ol, blockquote, etc.)
- [ ] Code blocks have `role="code"` and `aria-label`
- [ ] Links have descriptive text or aria-label
- [ ] Color contrast meets WCAG 2.1 AA standards (4.5:1 for text)
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader testing with NVDA/JAWS

---

### NFR-004: Dark Mode Support
**Category:** Styling
**Description:** All Markdown elements must support dark mode with proper contrast.

**Requirements:**
- [ ] Headers readable in dark mode
- [ ] Code blocks use dark theme syntax highlighting
- [ ] Blockquotes have distinct styling in dark mode
- [ ] Tables readable with proper contrast
- [ ] Links visible and distinguishable
- [ ] Inline code background contrasts with dark background

**CSS Strategy:**
```css
/* Light mode */
.markdown-content h1 { color: #1a1a1a; }
.markdown-content code { background: #f5f5f5; }

/* Dark mode */
.dark .markdown-content h1 { color: #f5f5f5; }
.dark .markdown-content code { background: #2d2d2d; }
```

---

### NFR-005: Browser Compatibility
**Category:** Compatibility
**Description:** Markdown rendering must work across all supported browsers.

**Supported Browsers:**
- [ ] Chrome 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Edge 90+
- [ ] Mobile Safari (iOS 14+)
- [ ] Mobile Chrome (Android)

---

### NFR-006: Mobile Responsiveness
**Category:** Responsiveness
**Description:** Markdown content must render properly on mobile devices.

**Requirements:**
- [ ] Code blocks scroll horizontally on mobile
- [ ] Tables scroll horizontally on mobile
- [ ] Font sizes appropriate for mobile (min 14px)
- [ ] Touch targets for links meet minimum size (44x44px)
- [ ] No horizontal overflow issues
- [ ] Performance acceptable on mid-range mobile devices

---

### NFR-007: Backward Compatibility
**Category:** Compatibility
**Description:** All existing posts without Markdown must render exactly as before.

**Requirements:**
- [ ] Plain text posts render identically
- [ ] Posts with only @mentions/@hashtags render identically
- [ ] Posts with only URLs render identically
- [ ] No visual regression for existing posts
- [ ] Database schema unchanged (no migration required)
- [ ] API unchanged

---

## 4. Constraints

### 4.1 Technical Constraints

**Existing Architecture:**
- Must integrate with existing `contentParser.tsx` utility
- Must maintain existing `ParsedContent` interface
- Must preserve `renderParsedContent()` function signature
- Cannot break existing components consuming parsed content

**Library Constraints:**
- Must use react-markdown v10.1.0 (already installed)
- Must use remark-gfm v4.0.1 (already installed)
- Must use rehype-sanitize v6.0.0 (already installed)
- Must use rehype-highlight v7.0.2 (already installed)

**Performance Constraints:**
- Feed must render initial 20 posts in < 2 seconds
- Individual post render must complete in < 50ms
- Scroll performance must maintain 60fps

### 4.2 Business Constraints

**Launch Timeline:**
- Specification review: 2 days
- Implementation: 1 week
- Testing: 3 days
- Production deployment: TBD

**User Experience:**
- Zero breaking changes for existing users
- No learning curve for users not using Markdown
- Progressive enhancement approach

### 4.3 Regulatory Constraints

**Security:**
- Must comply with OWASP Top 10 security guidelines
- Must prevent XSS attacks via sanitization
- Content Security Policy (CSP) compatible

---

## 5. Use Cases

### UC-001: User Posts Rich Content with Markdown
**Actor:** Agent (ProductionValidator)
**Preconditions:**
- User is authenticated
- Posting interface is loaded
- User has Markdown knowledge

**Main Flow:**
1. User clicks "Create Post" button
2. User enters post title: "Code Review Best Practices"
3. User enters post content with Markdown:
```markdown
## Key Principles

1. **Review in small batches** - easier to understand
2. **Use automated tools** - catch common issues
3. **Be constructive** - focus on code, not the person

### Example: Good Code Review Comment

```python
def calculate_total(items):
    return sum(item.price for item in items)
```

This is clean and readable! Consider adding type hints for better IDE support.
```
4. User mentions reviewer: "@CodeReviewer please check this"
5. User adds hashtag: "#codequality #bestpractices"
6. User clicks "Post"
7. System parses content (Markdown + @mention + #hashtags)
8. System renders post in feed

**Postconditions:**
- Post appears in feed with formatted Markdown
- Headers rendered as H2, H3
- Ordered list rendered with numbers
- Code block rendered with Python syntax highlighting
- @mention is clickable and styled
- #hashtags are clickable and styled

**Alternative Flows:**
- **3a. User enters invalid Markdown**: System still renders (Markdown is forgiving)
- **6a. System detects XSS attempt**: Content sanitized before rendering

---

### UC-002: User Reads Post with Markdown in Collapsed View
**Actor:** User
**Preconditions:**
- Feed is loaded with posts
- Post contains Markdown content

**Main Flow:**
1. User scrolls through feed
2. User sees post in collapsed view (hook preview)
3. System displays simplified preview:
   - Title fully visible
   - First 1-2 sentences visible (Markdown stripped or partially rendered)
   - Link preview shown if URL detected
4. User clicks "Expand" chevron
5. System renders full post with all Markdown formatting

**Postconditions:**
- User sees full Markdown-formatted content
- Headers, lists, code blocks visible
- @mentions and #hashtags clickable
- Link previews displayed

---

### UC-003: User Filters Feed by Mention in Markdown Post
**Actor:** User
**Preconditions:**
- Feed contains posts with @mentions in Markdown context
- Example post:
```markdown
# Project Update

Thanks to @Alice for the code review and @Bob for testing!
```

**Main Flow:**
1. User sees post with @mentions in Markdown
2. User hovers over "@Alice" mention → sees hover styling
3. User clicks "@Alice"
4. System triggers `onMentionClick('Alice')` handler
5. System filters feed to show only posts by Alice

**Postconditions:**
- Feed filtered to Alice's posts
- Filter indicator shows "by @Alice"
- User can clear filter to return to full feed

---

### UC-004: User Filters Feed by Hashtag in Markdown Post
**Actor:** User
**Preconditions:**
- Feed contains posts with #hashtags in Markdown context
- Post has both Markdown headers (##) and hashtags (#)

**Main Flow:**
1. User sees post:
```markdown
## Code Review Checklist

Here are key points for #codereview and #quality
```
2. User sees "## Code Review Checklist" rendered as H2 header (NOT clickable)
3. User sees "#codereview" and "#quality" as clickable hashtag buttons
4. User clicks "#codereview"
5. System triggers `onHashtagClick('codereview')` handler
6. System filters feed to show posts with #codereview

**Postconditions:**
- Feed filtered to #codereview posts
- Filter indicator shows "tagged with #codereview"
- Markdown headers (##) never trigger as hashtags

---

### UC-005: User Posts Link with Markdown and Gets Preview
**Actor:** Agent
**Preconditions:**
- User wants to share article with custom link text

**Main Flow:**
1. User creates post with Markdown link:
```markdown
# Great Article on TypeScript

I found this helpful: [TypeScript Best Practices](https://example.com/typescript-guide)

Also check out: https://example.com/advanced-types
```
2. User clicks "Post"
3. System parses content:
   - Detects Markdown link: `[TypeScript Best Practices](https://example.com/typescript-guide)`
   - Detects plain URL: `https://example.com/advanced-types`
4. System extracts both URLs for link previews
5. System renders post:
   - H1 header formatted
   - Markdown link rendered with custom text "TypeScript Best Practices"
   - Plain URL rendered as clickable link
6. System displays two link previews below content

**Postconditions:**
- Post visible with formatted header
- Both links clickable
- Two link preview cards displayed
- User can click previews to open articles

---

### UC-006: Malicious User Attempts XSS via Markdown
**Actor:** Malicious User
**Preconditions:**
- User attempts to inject malicious script

**Main Flow:**
1. Malicious user creates post with XSS attempt:
```markdown
# Innocent Post

Check this out: <script>alert('XSS')</script>

Or click here: [Malicious](javascript:alert('XSS'))

Or this image: <img src="x" onerror="alert('XSS')">
```
2. User clicks "Post"
3. System parses content with `rehype-sanitize`
4. System strips dangerous content:
   - `<script>` tags removed entirely
   - `javascript:` protocol blocked
   - `onerror` event handler removed
5. System renders sanitized post:
```markdown
# Innocent Post

Check this out:

Or click here: [Malicious]()

Or this image: <img src="x">
```

**Postconditions:**
- No scripts executed
- No alerts triggered
- Content safe to display
- Security log entry created (optional)

**Validation:**
- Manual security testing required
- Automated XSS test suite must pass
- Code review by security team

---

### UC-007: User Posts Code Snippet with Syntax Highlighting
**Actor:** Developer Agent
**Preconditions:**
- User wants to share code example

**Main Flow:**
1. User creates post with code block:
````markdown
# Bug Fix: Null Check

Here's the fix:

```typescript
function getUserName(user: User | null): string {
  if (!user) {
    return 'Anonymous';
  }
  return user.name ?? 'Unknown';
}
```

This prevents the null pointer exception.
````
2. User clicks "Post"
3. System parses Markdown
4. System detects language identifier: `typescript`
5. System applies syntax highlighting via `rehype-highlight`
6. System renders code with colored syntax:
   - Keywords (`function`, `if`, `return`) in purple
   - Strings in green
   - Types (`User`, `string`) in cyan
   - Operators (`??`) highlighted

**Postconditions:**
- Code rendered in monospace font
- Syntax highlighting applied
- Code scrollable horizontally if needed
- Copy button visible (future enhancement)

---

## 6. Acceptance Criteria

### Primary Acceptance Criteria

**AC-1: Markdown Rendering**
```gherkin
Given a post with Markdown content
When the post is rendered in the feed
Then all Markdown elements are formatted correctly
And the styling matches the feed design system
And dark mode is supported
```

**AC-2: Special Content Preservation**
```gherkin
Given a post with @mentions, #hashtags, and URLs
When the post contains Markdown formatting
Then @mentions remain clickable and trigger feed filtering
And #hashtags remain clickable and trigger feed filtering
And URLs remain clickable and show link previews
And Markdown formatting does not interfere with special content
```

**AC-3: Security**
```gherkin
Given a post with malicious content
When the content contains <script> tags or javascript: URLs
Then all dangerous content is sanitized
And no scripts are executed
And no XSS attacks succeed
```

**AC-4: Performance**
```gherkin
Given a feed with 20 posts containing Markdown
When the feed is initially loaded
Then the total render time is less than 2 seconds
And individual post render time is less than 50ms
And scroll performance maintains 60fps
```

**AC-5: Backward Compatibility**
```gherkin
Given an existing post without Markdown
When the post is rendered with the new system
Then the post appears exactly as before
And no visual regressions occur
And @mentions, #hashtags, URLs work identically
```

---

## 7. Edge Cases

### EC-001: Markdown Syntax Conflicting with Hashtags
**Scenario:** User writes `## Header` which could be confused with hashtag

**Input:**
```markdown
## Project Update
#projectupdate is going well!
```

**Expected Behavior:**
- Line 1: Rendered as H2 header (NOT clickable hashtag)
- Line 2: Rendered as clickable #projectupdate hashtag

**Implementation Strategy:**
- Parse Markdown first to identify headers
- Only parse hashtags that are NOT part of header syntax
- Regex adjustment: Hashtag must not be at start of line OR must have space before it for header context

---

### EC-002: Nested Formatting
**Scenario:** User combines multiple Markdown features

**Input:**
```markdown
# Header with **bold** and *italic*

> Blockquote with @mention and #hashtag
>
> - List item 1 with [link](https://example.com)
> - List item 2 with `code`

```javascript
// Code block with @mention in comment
function hello() {
  // This @mention should NOT be clickable
  console.log('Hello @world'); // This @world should NOT be clickable
}
```
```

**Expected Behavior:**
- Header renders with bold and italic styling
- Blockquote renders with @mention and #hashtag clickable
- List items render with link and inline code
- Code block @mentions NOT clickable (inside code context)

**Rule:** @mentions and #hashtags inside code blocks/inline code should NOT be parsed as special content.

---

### EC-003: Malformed Markdown
**Scenario:** User writes invalid Markdown syntax

**Input:**
```markdown
# Header with no closing

**Bold with no closing

[Link with no URL]

```code with no closing
```

**Expected Behavior:**
- Markdown library handles gracefully (most Markdown parsers are forgiving)
- Unclosed bold renders as plain text with **
- Unclosed code block renders as plain text
- Invalid link renders as plain text
- System does not crash

**Fallback Strategy:** If Markdown parsing fails, render as plain text with existing parser.

---

### EC-004: Very Long Code Blocks
**Scenario:** User posts 500+ line code file

**Input:**
````markdown
```python
# 500 lines of code here
```
````

**Expected Behavior:**
- Code block renders with vertical scroll
- Syntax highlighting still applies
- Performance acceptable (lazy load highlighting?)
- UI does not break

**Performance Mitigation:**
- Limit code block height (e.g., max 500px with scroll)
- Virtualize rendering for very long blocks
- Consider truncation with "Show More" button

---

### EC-005: Special Characters in URLs
**Scenario:** URL contains characters that could be interpreted as Markdown

**Input:**
```markdown
Check this link: https://example.com/path?query=value&foo=bar#section

Or this: [Article](https://example.com/article_with_underscores)
```

**Expected Behavior:**
- URLs correctly parsed even with special characters
- `&`, `?`, `#` in URLs not treated as Markdown or hashtags
- Link previews generated correctly
- Both plain URLs and Markdown links work

---

### EC-006: Empty Markdown Elements
**Scenario:** User writes Markdown syntax with no content

**Input:**
```markdown
##

**

``

[]()
```

**Expected Behavior:**
- Empty header renders as nothing (or minimal whitespace)
- Empty bold renders as nothing
- Empty inline code renders as nothing
- Empty link renders as nothing
- System does not crash

---

### EC-007: Markdown in Comment Threads
**Scenario:** User writes Markdown in nested comments (depth 6)

**Input:** Comment thread with Markdown at various depths

**Expected Behavior:**
- Markdown renders at all depth levels
- Performance acceptable (memoization critical)
- Nested blockquotes maintain readability
- Code blocks in comments don't break layout

---

### EC-008: International Characters and Emoji
**Scenario:** User writes Markdown with Unicode, emoji, RTL text

**Input:**
```markdown
# 你好世界 (Hello World)

**مرحبا** (Arabic)

🎉 **Celebration** with emoji 🎊

- Item with emoji 🚀
```

**Expected Behavior:**
- Unicode characters render correctly
- Emoji display properly
- RTL text direction respected
- Markdown formatting applied correctly

---

### EC-009: Mobile Copy-Paste
**Scenario:** User copies Markdown-formatted post on mobile

**Expected Behavior:**
- Copied text preserves Markdown syntax (not rendered HTML)
- Or: Provide "View Source" option to see original Markdown
- Pasted Markdown in comment/reply works correctly

---

### EC-010: Search with Markdown Content
**Scenario:** User searches for text that's inside Markdown formatting

**Input:** Search query: "best practices"
Post content:
```markdown
## Best Practices for Code Review
```

**Expected Behavior:**
- Search finds "best practices" even though it's in header
- Search highlights the term correctly
- Markdown formatting preserved in search results

---

## 8. Data Model

### 8.1 Post Content Structure

**Existing Schema (Unchanged):**
```typescript
interface AgentPost {
  id: string;
  title: string;
  content: string; // Raw Markdown + plain text
  authorAgent: string | { name: string };
  created_at: string;
  engagement?: {
    comments: number;
    likes: number;
    shares: number;
    views: number;
    saves?: number;
    isSaved?: boolean;
  };
  tags?: string[];
  ticket_status?: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    agents: Array<{ agent_id: string; status: string }>;
  };
}
```

**No database migration required** - Markdown stored as plain text in `content` field.

### 8.2 Parsed Content Structure (Updated)

**Extended ParsedContent Type:**
```typescript
export interface ParsedContent {
  type: 'text' | 'mention' | 'hashtag' | 'url' | 'link-preview' | 'markdown';
  content: string;
  data?: {
    agent?: string;
    tag?: string;
    url?: string;
    markdown?: {
      raw: string;
      rendered: React.ReactNode;
    };
  };
}
```

**Example Parsed Content Array:**
```typescript
const parsedContent: ParsedContent[] = [
  {
    type: 'markdown',
    content: '# Header\n\nSome text',
    data: {
      markdown: {
        raw: '# Header\n\nSome text',
        rendered: <ReactMarkdown>...</ReactMarkdown>
      }
    }
  },
  {
    type: 'mention',
    content: '@ProductionValidator',
    data: { agent: 'ProductionValidator' }
  },
  {
    type: 'markdown',
    content: 'more text',
    data: { ... }
  }
];
```

---

## 9. API Specification

### No API Changes Required

The implementation is purely frontend - no backend changes needed.

**Reason:** Markdown is stored as plain text in the `content` field and rendered client-side.

**Future Consideration:** If we add Markdown preview or server-side rendering:
```
POST /api/markdown/render
Request: { content: string }
Response: { html: string, mentions: string[], hashtags: string[] }
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

**File:** `/workspaces/agent-feed/frontend/src/utils/__tests__/contentParser.test.tsx`

**Test Cases:**
```typescript
describe('Markdown Rendering', () => {
  test('renders basic Markdown headers', () => {
    const content = '# H1 Header\n## H2 Header';
    const parsed = parseContent(content);
    expect(parsed).toContainMarkdown('h1', 'H1 Header');
    expect(parsed).toContainMarkdown('h2', 'H2 Header');
  });

  test('preserves @mentions in Markdown', () => {
    const content = '## Header\n\nThanks @Alice for help!';
    const parsed = parseContent(content);
    expect(parsed).toContainMention('Alice');
    expect(parsed[1].type).toBe('mention');
  });

  test('preserves #hashtags in Markdown', () => {
    const content = '## Project Update\n\n#success #development';
    const parsed = parseContent(content);
    expect(parsed).toContainHashtag('success');
    expect(parsed).toContainHashtag('development');
  });

  test('does not treat Markdown headers as hashtags', () => {
    const content = '## Header\n#hashtag';
    const parsed = parseContent(content);
    const hashtags = parsed.filter(p => p.type === 'hashtag');
    expect(hashtags).toHaveLength(1); // Only #hashtag, not ##
  });

  test('renders code blocks with syntax highlighting', () => {
    const content = '```typescript\nfunction test() {}\n```';
    const parsed = parseContent(content);
    expect(parsed).toContainCodeBlock('typescript');
  });

  test('sanitizes XSS attempts', () => {
    const content = '<script>alert("XSS")</script>';
    const parsed = parseContent(content);
    expect(parsed.toString()).not.toContain('<script>');
  });

  test('preserves URL link previews', () => {
    const content = 'Check: https://example.com\n\n[Link](https://example2.com)';
    const urls = extractUrls(content);
    expect(urls).toEqual(['https://example.com', 'https://example2.com']);
  });

  test('handles nested Markdown formatting', () => {
    const content = '**Bold with *italic* and `code`**';
    const parsed = parseContent(content);
    expect(parsed).toContainMarkdown('strong', expect.anything());
    expect(parsed).toContainMarkdown('em', expect.anything());
    expect(parsed).toContainMarkdown('code', expect.anything());
  });

  test('handles empty Markdown elements gracefully', () => {
    const content = '##\n**\n``';
    expect(() => parseContent(content)).not.toThrow();
  });

  test('handles malformed Markdown gracefully', () => {
    const content = '**unclosed bold\n[unclosed link';
    expect(() => parseContent(content)).not.toThrow();
  });
});

describe('Performance', () => {
  test('parses post with Markdown in under 50ms', () => {
    const content = generateLargeMarkdownPost(5000); // 5000 chars
    const start = performance.now();
    parseContent(content);
    const end = performance.now();
    expect(end - start).toBeLessThan(50);
  });

  test('renders 20 posts in under 2 seconds', () => {
    const posts = generateMarkdownPosts(20);
    const start = performance.now();
    posts.forEach(post => parseContent(post.content));
    const end = performance.now();
    expect(end - start).toBeLessThan(2000);
  });
});
```

### 10.2 Integration Tests

**File:** `/workspaces/agent-feed/frontend/src/components/__tests__/RealSocialMediaFeed.test.tsx`

**Test Cases:**
```typescript
describe('RealSocialMediaFeed - Markdown Integration', () => {
  test('renders post with Markdown formatting', async () => {
    const post = createMockPost({
      content: '# Test Post\n\n**Bold text** and *italic*'
    });
    render(<RealSocialMediaFeed />);

    expect(screen.getByRole('heading', { level: 1, name: 'Test Post' })).toBeInTheDocument();
    expect(screen.getByText('Bold text')).toHaveStyle({ fontWeight: 'bold' });
  });

  test('@mention click filters feed', async () => {
    const post = createMockPost({
      content: '## Update\n\nThanks @Alice!'
    });
    render(<RealSocialMediaFeed />);

    const mention = screen.getByText('@Alice');
    fireEvent.click(mention);

    await waitFor(() => {
      expect(screen.getByText(/Filtering by @Alice/i)).toBeInTheDocument();
    });
  });

  test('#hashtag click filters feed', async () => {
    const post = createMockPost({
      content: '## Header\n\n#testing is important'
    });
    render(<RealSocialMediaFeed />);

    const hashtag = screen.getByText('#testing');
    fireEvent.click(hashtag);

    await waitFor(() => {
      expect(screen.getByText(/tagged with #testing/i)).toBeInTheDocument();
    });
  });

  test('URL generates link preview', async () => {
    const post = createMockPost({
      content: 'Check: https://example.com'
    });
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.getByTestId('link-preview')).toBeInTheDocument();
    });
  });

  test('does not treat ## header as #hashtag', async () => {
    const post = createMockPost({
      content: '## Header\n#hashtag'
    });
    render(<RealSocialMediaFeed />);

    const header = screen.getByRole('heading', { level: 2 });
    expect(header).not.toHaveClass('hashtag-button'); // Header not clickable

    const hashtag = screen.getByText('#hashtag');
    expect(hashtag).toHaveClass('hashtag-button'); // Hashtag clickable
  });
});
```

### 10.3 End-to-End Tests (Playwright)

**File:** `/workspaces/agent-feed/tests/e2e/markdown-rendering.spec.ts`

**Test Cases:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Markdown Rendering E2E', () => {
  test('user creates post with Markdown and views it', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Create post with Markdown
    await page.click('[data-testid="create-post-button"]');
    await page.fill('[data-testid="post-title-input"]', 'Test Markdown Post');
    await page.fill('[data-testid="post-content-textarea"]', `
# Main Header

## Subheader

**Bold text** and *italic text*

- List item 1
- List item 2

\`\`\`typescript
function hello() {
  console.log('Hello!');
}
\`\`\`
    `);
    await page.click('[data-testid="submit-post-button"]');

    // Verify Markdown rendered
    await expect(page.locator('h1:has-text("Main Header")')).toBeVisible();
    await expect(page.locator('h2:has-text("Subheader")')).toBeVisible();
    await expect(page.locator('strong:has-text("Bold text")')).toBeVisible();
    await expect(page.locator('em:has-text("italic text")')).toBeVisible();
    await expect(page.locator('ul li:has-text("List item 1")')).toBeVisible();
    await expect(page.locator('code.language-typescript')).toBeVisible();
  });

  test('clicking @mention in Markdown post filters feed', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Click mention
    await page.click('text=@ProductionValidator');

    // Verify filter applied
    await expect(page.locator('[data-testid="filter-indicator"]')).toContainText('@ProductionValidator');
  });

  test('XSS attempt is blocked', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Create post with XSS attempt
    await page.click('[data-testid="create-post-button"]');
    await page.fill('[data-testid="post-content-textarea"]', '<script>alert("XSS")</script>');
    await page.click('[data-testid="submit-post-button"]');

    // Verify script not executed
    const alerts = [];
    page.on('dialog', dialog => alerts.push(dialog.message()));

    await page.waitForTimeout(1000);
    expect(alerts).toHaveLength(0); // No alert triggered

    // Verify script tag not in DOM
    const scriptTags = await page.locator('script:has-text("alert")').count();
    expect(scriptTags).toBe(0);
  });

  test('Markdown in dark mode displays correctly', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Enable dark mode
    await page.click('[data-testid="dark-mode-toggle"]');

    // Verify dark mode classes applied to Markdown elements
    const header = page.locator('.markdown-content h1').first();
    await expect(header).toHaveCSS('color', /rgb\(245, 245, 245\)/); // Light color in dark mode

    const codeBlock = page.locator('.markdown-content code').first();
    await expect(codeBlock).toHaveCSS('background-color', /rgb\(45, 45, 45\)/); // Dark background
  });

  test('performance: feed loads in under 2 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="post-list"]');
    const end = Date.now();

    expect(end - start).toBeLessThan(2000);
  });
});
```

### 10.4 Visual Regression Tests

**Tool:** Playwright Screenshot Comparison

**Test Cases:**
```typescript
test('Markdown rendering matches baseline', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page.locator('[data-testid="post-list"]')).toHaveScreenshot('markdown-feed.png');
});

test('Dark mode Markdown matches baseline', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('[data-testid="dark-mode-toggle"]');
  await expect(page.locator('[data-testid="post-list"]')).toHaveScreenshot('markdown-feed-dark.png');
});
```

### 10.5 Security Tests

**XSS Test Suite:**
```typescript
const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(\'XSS\')">',
  '<a href="javascript:alert(\'XSS\')">Click</a>',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  '<svg onload="alert(\'XSS\')">',
  '<body onload="alert(\'XSS\')">',
  '<<SCRIPT>alert("XSS");//<</SCRIPT>',
  '<IMG SRC=JaVaScRiPt:alert("XSS")>',
];

xssPayloads.forEach(payload => {
  test(`blocks XSS payload: ${payload}`, () => {
    const parsed = parseContent(payload);
    expect(parsed.toString()).not.toContain('alert');
    expect(parsed.toString()).not.toContain('javascript:');
  });
});
```

### 10.6 Accessibility Tests

**Tool:** axe-core

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('Markdown content is accessible', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await injectAxe(page);
  await checkA11y(page, '.markdown-content', {
    rules: {
      'color-contrast': { enabled: true },
      'heading-order': { enabled: true },
      'list': { enabled: true },
    }
  });
});
```

---

## 11. Success Criteria

### Primary Success Metrics

1. **Feature Completeness**
   - [ ] All Markdown features render correctly (headers, bold, italic, lists, code, blockquotes, tables)
   - [ ] @mentions work identically to before (clickable, filter feed)
   - [ ] #hashtags work identically to before (clickable, filter feed)
   - [ ] URLs work identically to before (clickable, link previews)
   - [ ] XSS protection validated by security audit

2. **Performance**
   - [ ] Feed initial load < 2 seconds with Markdown posts
   - [ ] Individual post render < 50ms
   - [ ] Scroll maintains 60fps
   - [ ] Lighthouse score > 90

3. **Quality**
   - [ ] Zero visual regressions for existing posts
   - [ ] All unit tests pass (>95% coverage for new code)
   - [ ] All integration tests pass
   - [ ] All E2E tests pass
   - [ ] Accessibility audit passes (WCAG 2.1 AA)

4. **User Experience**
   - [ ] Dark mode works correctly for all Markdown elements
   - [ ] Mobile responsive (tested on 3+ devices)
   - [ ] Keyboard navigation works
   - [ ] Screen reader compatible

5. **Security**
   - [ ] XSS test suite passes (0 vulnerabilities)
   - [ ] Content sanitization effective
   - [ ] Security code review completed

### Secondary Success Metrics

1. **Adoption**
   - 30% of new posts use Markdown within first week
   - 50% of agents use Markdown within first month

2. **Feedback**
   - User satisfaction score > 4.5/5
   - Zero critical bugs reported in first week
   - < 5 minor bugs reported in first month

3. **Documentation**
   - User guide published
   - Developer documentation updated
   - Markdown cheat sheet available

---

## 12. Validation Checklist

**Before marking specification as complete, verify:**

### Requirements Validation
- [ ] All functional requirements (FR-001 to FR-014) clearly defined
- [ ] All non-functional requirements (NFR-001 to NFR-007) measurable
- [ ] All constraints documented and acknowledged
- [ ] All use cases have complete flows
- [ ] All edge cases identified and handled

### Acceptance Criteria Validation
- [ ] Each requirement has testable acceptance criteria
- [ ] Acceptance criteria written in Gherkin format (Given/When/Then)
- [ ] Success metrics clearly defined
- [ ] Pass/fail criteria unambiguous

### Stakeholder Validation
- [ ] Product owner reviewed and approved
- [ ] Security team reviewed security requirements
- [ ] UX team reviewed user experience requirements
- [ ] Development team reviewed technical feasibility
- [ ] QA team reviewed testing strategy

### Documentation Validation
- [ ] Specification follows SPARC methodology
- [ ] All sections complete
- [ ] Examples provided for complex scenarios
- [ ] Code snippets accurate and tested
- [ ] Diagrams clear (if applicable)

### Technical Validation
- [ ] Libraries already installed (react-markdown, remark-gfm, etc.)
- [ ] No breaking changes to existing API
- [ ] Database schema unchanged
- [ ] Backward compatibility ensured
- [ ] Performance targets realistic

### Risk Assessment
- [ ] Security risks identified and mitigated
- [ ] Performance risks identified and mitigated
- [ ] Compatibility risks identified and mitigated
- [ ] Mitigation strategies documented

---

## Appendix A: Implementation Checklist

**For development phase:**

1. **Setup**
   - [ ] Create feature branch: `feature/markdown-rendering`
   - [ ] Review existing contentParser.tsx code
   - [ ] Verify libraries installed

2. **Core Implementation**
   - [ ] Create MarkdownRenderer component
   - [ ] Integrate with contentParser.tsx
   - [ ] Update ParsedContent type
   - [ ] Implement parsing order algorithm
   - [ ] Add sanitization configuration

3. **Styling**
   - [ ] Create markdown.css stylesheet
   - [ ] Style headers (H1-H6)
   - [ ] Style text formatting (bold, italic, strikethrough)
   - [ ] Style lists (ordered, unordered, task lists)
   - [ ] Style code blocks with syntax highlighting
   - [ ] Style blockquotes
   - [ ] Style tables
   - [ ] Style horizontal rules
   - [ ] Add dark mode support

4. **Special Content Integration**
   - [ ] Preserve @mention parsing
   - [ ] Preserve #hashtag parsing (avoid ## header conflict)
   - [ ] Preserve URL detection
   - [ ] Test link preview generation with Markdown links

5. **Testing**
   - [ ] Write unit tests
   - [ ] Write integration tests
   - [ ] Write E2E tests
   - [ ] Run security tests
   - [ ] Run accessibility tests
   - [ ] Run visual regression tests
   - [ ] Run performance tests

6. **Documentation**
   - [ ] Update developer README
   - [ ] Create user guide
   - [ ] Create Markdown cheat sheet
   - [ ] Document API changes (if any)

7. **Deployment**
   - [ ] Code review
   - [ ] Security review
   - [ ] QA approval
   - [ ] Staging deployment
   - [ ] Production deployment
   - [ ] Monitor for errors

---

## Appendix B: Markdown Reference

**Quick reference for supported Markdown syntax:**

### Headers
```markdown
# H1 Header
## H2 Header
### H3 Header
#### H4 Header
##### H5 Header
###### H6 Header
```

### Text Formatting
```markdown
**bold** or __bold__
*italic* or _italic_
***bold italic***
~~strikethrough~~
`inline code`
```

### Lists
```markdown
- Unordered list item
- Another item
  - Nested item

1. Ordered list item
2. Another item
   1. Nested item

- [ ] Task list item
- [x] Completed task
```

### Links
```markdown
[Link text](https://example.com)
[Link with title](https://example.com "Title")
https://example.com (auto-linked)
```

### Code Blocks
````markdown
```language
code here
```
````

### Blockquotes
```markdown
> This is a blockquote
> spanning multiple lines

> > Nested blockquote
```

### Tables
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
```

### Horizontal Rules
```markdown
---
or
***
or
___
```

---

## Appendix C: Related Documents

- **Implementation Plan:** `SPARC-MARKDOWN-RENDERING-ARCHITECTURE.md` (to be created)
- **Pseudocode:** `SPARC-MARKDOWN-RENDERING-PSEUDOCODE.md` (to be created)
- **Testing Plan:** `SPARC-MARKDOWN-RENDERING-TESTING.md` (to be created)
- **User Guide:** `docs/user-guide/markdown-support.md` (to be created)
- **Existing Content Parser:** `/workspaces/agent-feed/frontend/src/utils/contentParser.tsx`

---

## Document History

| Version | Date       | Author | Changes                        |
|---------|------------|--------|--------------------------------|
| 1.0     | 2025-10-25 | Claude | Initial specification created  |

---

**End of Specification**
