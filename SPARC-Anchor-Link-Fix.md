# SPARC Specification: Anchor Link Navigation Fix

## Executive Summary

**Problem**: Pages created by page-builder-agent use anchor links (`href="#section"`) in sidebar navigation that don't function because no matching IDs exist on content elements, React Router doesn't handle anchor scrolling, and validation fails to catch these issues.

**Solution**: Implement comprehensive anchor link validation, automatic ID generation, and React Router-compatible scroll handling to ensure functional sidebar navigation.

**Impact**: All dynamically created pages will have working internal navigation, improving user experience and system reliability.

---

## 1. SPECIFICATION PHASE

### 1.1 Functional Requirements

#### FR-1: Anchor Link Target Validation
- **FR-1.1**: System SHALL validate that every anchor link (`href="#target"`) has a corresponding element with matching `id="target"`
- **FR-1.2**: Validation SHALL occur before page rendering
- **FR-1.3**: Validation SHALL return detailed error messages specifying missing targets
- **FR-1.4**: Validation SHALL support both sidebar links and inline content links
- **Priority**: Critical
- **Acceptance Criteria**:
  - Given a page with anchor link `href="#section1"`
  - When validation runs
  - Then it must find an element with `id="section1"` or report an error

#### FR-2: Automatic ID Generation
- **FR-2.1**: System SHALL automatically generate IDs for headings and major sections
- **FR-2.2**: Generated IDs SHALL be URL-safe (lowercase, hyphenated, alphanumeric)
- **FR-2.3**: System SHALL handle duplicate ID prevention with numeric suffixes
- **FR-2.4**: System SHALL preserve manually specified IDs over auto-generated ones
- **Priority**: High
- **Acceptance Criteria**:
  - Given heading "User Authentication System"
  - When ID auto-generation runs
  - Then ID should be "user-authentication-system"
  - Given duplicate "Introduction" headings
  - Then IDs should be "introduction", "introduction-2", "introduction-3"

#### FR-3: React Router Scroll Handling
- **FR-3.1**: System SHALL implement smooth scrolling to anchor targets
- **FR-3.2**: System SHALL work within React Router single-page application context
- **FR-3.3**: System SHALL handle initial page load with hash fragments
- **FR-3.4**: System SHALL update browser URL hash without full page reload
- **FR-3.5**: System SHALL scroll with offset for fixed headers
- **Priority**: High
- **Acceptance Criteria**:
  - Given user clicks anchor link
  - When navigation occurs
  - Then page scrolls smoothly to target element
  - And URL updates to include hash
  - And scroll position accounts for fixed header height

#### FR-4: Sidebar Navigation Enhancement
- **FR-4.1**: Sidebar SHALL support three link types:
  - Anchor links: `#section` (internal navigation)
  - Relative routes: `/page` (React Router navigation)
  - External URLs: `https://...` (new tab)
- **FR-4.2**: System SHALL automatically determine link type from href format
- **FR-4.3**: Active link highlighting SHALL update during scroll
- **FR-4.4**: Sidebar SHALL remain visible during scroll (sticky positioning)
- **Priority**: Medium
- **Acceptance Criteria**:
  - Given mixed link types in sidebar
  - When rendered
  - Then each uses appropriate handler (scroll/route/external)

#### FR-5: Validation Error Reporting
- **FR-5.1**: System SHALL return structured validation errors
- **FR-5.2**: Errors SHALL include:
  - Error type (missing-anchor-target)
  - Anchor link href
  - Location in page structure
  - Suggested fixes
- **FR-5.3**: Validation SHALL not fail silently
- **FR-5.4**: Errors SHALL be logged for debugging
- **Priority**: High
- **Acceptance Criteria**:
  - Given page with broken anchor links
  - When validation runs
  - Then returns JSON array of error objects
  - And logs errors to console
  - And provides actionable fix suggestions

### 1.2 Non-Functional Requirements

#### NFR-1: Performance
- **NFR-1.1**: Anchor navigation SHALL complete within 500ms
- **NFR-1.2**: Validation SHALL complete within 100ms for typical pages
- **NFR-1.3**: Scroll animation SHALL maintain 60fps
- **Measurement**: Performance.now() timing, Chrome DevTools profiling
- **Priority**: Medium

#### NFR-2: Compatibility
- **NFR-2.1**: SHALL work in Chrome, Firefox, Safari, Edge (latest 2 versions)
- **NFR-2.2**: SHALL work with React Router v6+
- **NFR-2.3**: SHALL support both hash router and browser router
- **NFR-2.4**: SHALL maintain accessibility standards (WCAG 2.1 AA)
- **Priority**: High

#### NFR-3: Maintainability
- **NFR-3.1**: Code SHALL be modular with single-responsibility functions
- **NFR-3.2**: Functions SHALL have JSDoc documentation
- **NFR-3.3**: Validation logic SHALL be separate from rendering logic
- **NFR-3.4**: Configuration SHALL be centralized (scroll offset, animation duration)
- **Priority**: Medium

#### NFR-4: Accessibility
- **NFR-4.1**: Anchor navigation SHALL update focus management
- **NFR-4.2**: Skip links SHALL be provided for keyboard users
- **NFR-4.3**: ARIA attributes SHALL indicate current section
- **NFR-4.4**: Reduced motion preference SHALL disable smooth scrolling
- **Priority**: High

### 1.3 Constraints

**Technical Constraints**:
- Must work with existing React component architecture
- Cannot modify page-builder-agent prompt significantly
- Must maintain backward compatibility with existing pages
- Must work with SQLite database schema

**Business Constraints**:
- Implementation within 1 sprint (2 weeks)
- No external dependencies allowed
- Must not break existing functionality

**Regulatory Constraints**:
- WCAG 2.1 AA compliance required
- Browser standard compliance required

### 1.4 Use Cases

#### UC-1: User Navigates via Sidebar
**Actor**: End User
**Preconditions**: Page with sidebar loaded
**Flow**:
1. User clicks sidebar link "Section 2"
2. System identifies anchor link `#section-2`
3. System finds element with `id="section-2"`
4. System smoothly scrolls to element
5. System updates URL to `page#section-2`
6. System updates active link highlight

**Postconditions**: User sees target section, URL updated
**Exceptions**:
- E1: Target not found → Log error, fallback to top
- E2: Multiple targets → Use first match, log warning

#### UC-2: Page Builder Creates Page with Anchors
**Actor**: Page Builder Agent
**Preconditions**: Agent generates page JSON
**Flow**:
1. Agent creates sidebar with anchor links
2. Agent creates content sections
3. System validates page structure
4. System identifies missing IDs
5. System auto-generates IDs for sections
6. System maps anchor links to IDs
7. System saves validated page

**Postconditions**: Page with functional anchors saved
**Exceptions**:
- E1: Validation fails → Return errors to agent
- E2: No headings found → Use section indices

#### UC-3: User Loads Page with Hash Fragment
**Actor**: End User
**Preconditions**: User opens URL with `#section-3`
**Flow**:
1. React Router loads page component
2. Component detects hash in URL
3. Component waits for content render
4. Component scrolls to target element
5. Component highlights active section

**Postconditions**: Page scrolled to correct section
**Exceptions**:
- E1: Target not found → Scroll to top, show message
- E2: Content not ready → Retry after timeout

#### UC-4: Developer Debugs Broken Anchor
**Actor**: Developer
**Preconditions**: User reports broken navigation
**Flow**:
1. Developer opens page in browser
2. System logs validation warnings to console
3. Developer sees missing anchor targets
4. Developer runs validation endpoint
5. Developer receives structured error list
6. Developer fixes page JSON or regenerates

**Postconditions**: Issue identified and resolved

### 1.5 Acceptance Criteria (BDD Format)

```gherkin
Feature: Anchor Link Navigation

  Scenario: Valid anchor link navigation
    Given a page with sidebar item href="#introduction"
    And content has element with id="introduction"
    When user clicks the sidebar link
    Then page should scroll to the element smoothly
    And URL should update to include "#introduction"
    And sidebar link should show active state

  Scenario: Missing anchor target validation
    Given a page with sidebar item href="#missing-section"
    And no content element has id="missing-section"
    When validation runs
    Then validation should return error
    And error should specify missing target "missing-section"
    And error should suggest available targets

  Scenario: Automatic ID generation
    Given content with heading "User Guide"
    And no explicit id attribute
    When page processes
    Then heading should have id="user-guide"
    And anchor link href="#user-guide" should work

  Scenario: Duplicate ID prevention
    Given two headings both titled "Overview"
    When ID generation runs
    Then first should have id="overview"
    And second should have id="overview-2"

  Scenario: Initial page load with hash
    Given URL is "/page#section-2"
    When page loads
    Then page should scroll to id="section-2" after render
    And active section should be highlighted

  Scenario: Mixed link types in sidebar
    Given sidebar with links:
      | href                  | type     |
      | #section-1            | anchor   |
      | /other-page           | route    |
      | https://example.com   | external |
    When rendered
    Then anchor links use scroll handler
    And route links use React Router
    And external links open in new tab

  Scenario: Accessibility - keyboard navigation
    Given user navigating with keyboard
    When user tabs through sidebar links
    Then each link should be focusable
    And pressing Enter should navigate
    And focus should move to target element

  Scenario: Reduced motion preference
    Given user has prefers-reduced-motion enabled
    When user clicks anchor link
    Then page should scroll instantly (no animation)
    And target should still be reached

  Scenario: Validation error reporting
    Given page with 3 broken anchor links
    When validation endpoint called
    Then response should contain 3 error objects
    And each should specify the broken link
    And each should suggest fixes
    And HTTP status should be 400
```

### 1.6 Data Model Specification

#### Page Structure Schema
```json
{
  "id": "string (UUID)",
  "title": "string",
  "description": "string",
  "author": "string",
  "createdAt": "ISO 8601 timestamp",
  "layout": {
    "sidebar": {
      "position": "left | right",
      "items": [
        {
          "type": "link",
          "label": "string",
          "href": "string (#anchor | /route | https://...)",
          "icon": "string (optional)"
        },
        {
          "type": "section",
          "label": "string",
          "items": ["nested items"]
        }
      ]
    },
    "content": [
      {
        "type": "heading | text | code | table | chart",
        "id": "string (optional, auto-generated if missing)",
        "content": "varies by type",
        "metadata": {}
      }
    ]
  }
}
```

#### Validation Error Schema
```json
{
  "isValid": false,
  "errors": [
    {
      "type": "missing-anchor-target",
      "severity": "error | warning",
      "message": "Anchor link '#section-2' has no matching target element",
      "location": {
        "path": "layout.sidebar.items[1].href",
        "line": null
      },
      "anchor": "#section-2",
      "suggestions": [
        "Add id=\"section-2\" to a content element",
        "Change href to match existing ID",
        "Available IDs: #introduction, #overview, #conclusion"
      ]
    }
  ],
  "warnings": [
    {
      "type": "duplicate-id",
      "message": "Duplicate ID 'overview' found, using 'overview-2' for second occurrence",
      "location": "layout.content[4]"
    }
  ]
}
```

### 1.7 API Specification

#### Validate Page Anchors
```yaml
POST /api/agent-pages/validate-anchors
Content-Type: application/json

Request Body:
{
  "pageId": "uuid (optional)",
  "layout": { /* page layout object */ }
}

Response 200 (Valid):
{
  "isValid": true,
  "anchors": [
    {
      "href": "#introduction",
      "targetId": "introduction",
      "targetType": "heading",
      "exists": true
    }
  ]
}

Response 400 (Invalid):
{
  "isValid": false,
  "errors": [ /* error objects */ ],
  "warnings": [ /* warning objects */ ]
}
```

#### Get Anchor Map
```yaml
GET /api/agent-pages/:id/anchor-map

Response 200:
{
  "pageId": "uuid",
  "anchorMap": {
    "#introduction": "content-0",
    "#features": "content-3",
    "#conclusion": "content-8"
  },
  "availableAnchors": ["#introduction", "#features", "#conclusion"],
  "sidebarAnchors": ["#introduction", "#features", "#conclusion", "#missing"]
}
```

---

## 2. PSEUDOCODE PHASE

### 2.1 Core Algorithm: Anchor Link Validation

```pseudocode
FUNCTION validateAnchors(pageLayout)
  INPUT: pageLayout (object with sidebar and content)
  OUTPUT: ValidationResult (isValid, errors, warnings)

  // Initialize validation state
  errors = []
  warnings = []
  anchorMap = new Map()

  // Step 1: Extract all anchor links from sidebar
  sidebarAnchors = extractAnchorsFromSidebar(pageLayout.sidebar)

  // Step 2: Build ID map from content elements
  contentIds = extractIdsFromContent(pageLayout.content)

  // Step 3: Auto-generate missing IDs
  autoGeneratedIds = generateMissingIds(pageLayout.content, contentIds)
  MERGE contentIds WITH autoGeneratedIds

  // Step 4: Validate each anchor has a target
  FOR EACH anchor IN sidebarAnchors DO
    targetId = anchor.substring(1) // Remove '#' prefix

    IF NOT contentIds.has(targetId) THEN
      error = {
        type: "missing-anchor-target",
        severity: "error",
        anchor: anchor,
        message: "Anchor link '" + anchor + "' has no matching target",
        suggestions: generateSuggestions(targetId, contentIds)
      }
      errors.push(error)
    ELSE
      anchorMap.set(anchor, contentIds.get(targetId))
    END IF
  END FOR

  // Step 5: Check for duplicate IDs
  duplicates = findDuplicateIds(contentIds)
  FOR EACH duplicate IN duplicates DO
    warning = {
      type: "duplicate-id",
      severity: "warning",
      message: "Duplicate ID found: " + duplicate.id
    }
    warnings.push(warning)
  END FOR

  // Step 6: Return validation result
  RETURN {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings,
    anchorMap: anchorMap,
    availableIds: Array.from(contentIds.keys())
  }
END FUNCTION

FUNCTION extractAnchorsFromSidebar(sidebar)
  INPUT: sidebar (object or array)
  OUTPUT: Array of anchor strings

  anchors = []

  IF sidebar IS NULL OR UNDEFINED THEN
    RETURN anchors
  END IF

  items = sidebar.items OR sidebar

  FOR EACH item IN items DO
    IF item.type === "link" AND item.href STARTS WITH "#" THEN
      anchors.push(item.href)
    END IF

    // Recursively process nested items
    IF item.items IS ARRAY THEN
      nestedAnchors = extractAnchorsFromSidebar(item.items)
      anchors = anchors.concat(nestedAnchors)
    END IF
  END FOR

  RETURN anchors
END FUNCTION

FUNCTION extractIdsFromContent(content)
  INPUT: content (array of content blocks)
  OUTPUT: Map of id -> element reference

  idMap = new Map()

  FOR index = 0 TO content.length - 1 DO
    element = content[index]

    // Check for explicit ID
    IF element.id IS DEFINED AND element.id !== "" THEN
      IF idMap.has(element.id) THEN
        // Duplicate ID found - rename with suffix
        newId = element.id + "-" + (index + 1)
        idMap.set(newId, element)
      ELSE
        idMap.set(element.id, element)
      END IF
    END IF
  END FOR

  RETURN idMap
END FUNCTION

FUNCTION generateMissingIds(content, existingIds)
  INPUT: content (array), existingIds (Map)
  OUTPUT: Map of auto-generated ids

  generatedIds = new Map()
  usedIds = new Set(existingIds.keys())

  FOR index = 0 TO content.length - 1 DO
    element = content[index]

    // Skip if already has ID
    IF element.id IS DEFINED AND element.id !== "" THEN
      CONTINUE
    END IF

    // Generate ID based on element type
    proposedId = NULL

    IF element.type === "heading" THEN
      proposedId = slugify(element.content)
    ELSE IF element.type === "section" AND element.title THEN
      proposedId = slugify(element.title)
    ELSE
      proposedId = element.type + "-" + index
    END IF

    // Ensure uniqueness
    finalId = proposedId
    counter = 2
    WHILE usedIds.has(finalId) DO
      finalId = proposedId + "-" + counter
      counter = counter + 1
    END WHILE

    // Mark as generated and add to element
    element.id = finalId
    generatedIds.set(finalId, element)
    usedIds.add(finalId)
  END FOR

  RETURN generatedIds
END FUNCTION

FUNCTION slugify(text)
  INPUT: text (string)
  OUTPUT: URL-safe slug (string)

  slug = text.toLowerCase()
  slug = slug.replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
  slug = slug.replace(/^-+|-+$/g, "")      // Remove leading/trailing hyphens
  slug = slug.substring(0, 50)             // Limit length

  IF slug === "" THEN
    slug = "section"
  END IF

  RETURN slug
END FUNCTION

FUNCTION generateSuggestions(targetId, availableIds)
  INPUT: targetId (string), availableIds (Map)
  OUTPUT: Array of suggestion strings

  suggestions = []

  // Suggest adding ID
  suggestions.push("Add id=\"" + targetId + "\" to a content element")

  // Find similar IDs using Levenshtein distance
  similarIds = []
  FOR EACH availableId IN availableIds.keys() DO
    distance = levenshteinDistance(targetId, availableId)
    IF distance <= 3 THEN
      similarIds.push(availableId)
    END IF
  END FOR

  IF similarIds.length > 0 THEN
    suggestions.push("Did you mean: " + similarIds.join(", "))
  END IF

  // List all available IDs
  allIds = Array.from(availableIds.keys()).slice(0, 10)
  suggestions.push("Available IDs: " + allIds.join(", "))

  RETURN suggestions
END FUNCTION
```

### 2.2 Scroll Handling Algorithm

```pseudocode
FUNCTION handleAnchorClick(event, href)
  INPUT: event (DOM event), href (string starting with #)
  OUTPUT: void (performs scroll action)

  // Prevent default link behavior
  event.preventDefault()

  // Extract target ID
  targetId = href.substring(1) // Remove '#'

  // Find target element
  targetElement = document.getElementById(targetId)

  IF targetElement IS NULL THEN
    console.error("Anchor target not found: " + href)
    // Fallback: scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" })
    RETURN
  END IF

  // Calculate scroll position
  headerOffset = getFixedHeaderHeight()
  elementPosition = targetElement.getBoundingClientRect().top
  scrollPosition = window.pageYOffset + elementPosition - headerOffset

  // Check reduced motion preference
  prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  behavior = prefersReducedMotion ? "auto" : "smooth"

  // Perform scroll
  window.scrollTo({
    top: scrollPosition,
    behavior: behavior
  })

  // Update URL without navigation
  history.pushState(NULL, "", href)

  // Update focus for accessibility
  targetElement.setAttribute("tabindex", "-1")
  targetElement.focus()

  // Update active link highlight
  updateActiveSidebarLink(href)
END FUNCTION

FUNCTION handleInitialHashScroll()
  INPUT: none (reads from window.location.hash)
  OUTPUT: void

  hash = window.location.hash

  IF hash === "" THEN
    RETURN
  END IF

  // Wait for content to render
  WAIT_FOR contentRendered OR timeout(1000ms)

  targetId = hash.substring(1)
  targetElement = document.getElementById(targetId)

  IF targetElement THEN
    // Scroll to target
    headerOffset = getFixedHeaderHeight()
    elementPosition = targetElement.getBoundingClientRect().top
    scrollPosition = window.pageYOffset + elementPosition - headerOffset

    window.scrollTo({
      top: scrollPosition,
      behavior: "auto" // Instant on initial load
    })

    // Update active state
    updateActiveSidebarLink(hash)
  ELSE
    console.warn("Initial hash target not found: " + hash)
  END IF
END FUNCTION

FUNCTION updateActiveSidebarLink(activeHref)
  INPUT: activeHref (string)
  OUTPUT: void

  // Remove all active classes
  allLinks = document.querySelectorAll(".sidebar-link")
  FOR EACH link IN allLinks DO
    link.classList.remove("active")
  END FOR

  // Add active class to matching link
  activeLink = document.querySelector('.sidebar-link[href="' + activeHref + '"]')
  IF activeLink THEN
    activeLink.classList.add("active")
  END IF
END FUNCTION

FUNCTION getFixedHeaderHeight()
  INPUT: none
  OUTPUT: number (pixels)

  header = document.querySelector("header.fixed, nav.fixed")

  IF header THEN
    RETURN header.offsetHeight + 16 // 16px padding
  ELSE
    RETURN 80 // Default offset
  END IF
END FUNCTION
```

### 2.3 Component Integration Algorithm

```pseudocode
FUNCTION DynamicPage.componentDidMount()
  // Handle initial hash navigation
  handleInitialHashScroll()

  // Add scroll listener for active link highlighting
  window.addEventListener("scroll", handleScrollForActiveHighlight)
END FUNCTION

FUNCTION DynamicPage.componentWillUnmount()
  // Cleanup
  window.removeEventListener("scroll", handleScrollForActiveHighlight)
END FUNCTION

FUNCTION renderSidebarLink(item)
  INPUT: item (sidebar item object)
  OUTPUT: React element

  href = item.href

  // Determine link type
  IF href STARTS WITH "#" THEN
    // Anchor link - use custom handler
    RETURN (
      <a
        href={href}
        className="sidebar-link"
        onClick={(e) => handleAnchorClick(e, href)}
      >
        {item.label}
      </a>
    )
  ELSE IF href STARTS WITH "/" THEN
    // Internal route - use React Router
    RETURN (
      <Link
        to={href}
        className="sidebar-link"
      >
        {item.label}
      </Link>
    )
  ELSE IF href STARTS WITH "http" THEN
    // External link - open in new tab
    RETURN (
      <a
        href={href}
        className="sidebar-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {item.label}
        <ExternalLinkIcon />
      </a>
    )
  ELSE
    // Invalid href - log warning
    console.warn("Invalid sidebar href: " + href)
    RETURN (
      <span className="sidebar-link disabled">
        {item.label}
      </span>
    )
  END IF
END FUNCTION

FUNCTION renderContentBlock(block, index)
  INPUT: block (content object), index (number)
  OUTPUT: React element

  // Ensure block has ID
  IF NOT block.id THEN
    block.id = generateId(block, index)
  END IF

  // Render based on type
  SWITCH block.type
    CASE "heading":
      level = block.level OR 2
      RETURN <Heading id={block.id} level={level}>{block.content}</Heading>

    CASE "text":
      RETURN <Text id={block.id}>{block.content}</Text>

    CASE "code":
      RETURN <CodeBlock id={block.id} language={block.language}>{block.code}</CodeBlock>

    CASE "table":
      RETURN <Table id={block.id} data={block.data} />

    CASE "chart":
      RETURN <Chart id={block.id} config={block.config} />

    DEFAULT:
      console.warn("Unknown block type: " + block.type)
      RETURN <div id={block.id}>{JSON.stringify(block)}</div>
  END SWITCH
END FUNCTION
```

---

## 3. ARCHITECTURE PHASE

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           DynamicPage Component                       │  │
│  │  ┌─────────────────┐    ┌──────────────────────┐    │  │
│  │  │  Sidebar        │    │  Content Area        │    │  │
│  │  │  Component      │    │  Component           │    │  │
│  │  │                 │    │                      │    │  │
│  │  │  ┌───────────┐  │    │  ┌────────────────┐ │    │  │
│  │  │  │ Link Items│  │    │  │ Content Block  │ │    │  │
│  │  │  │ (#anchor) │──┼────┼─>│ id="anchor"    │ │    │  │
│  │  │  └───────────┘  │    │  └────────────────┘ │    │  │
│  │  │                 │    │                      │    │  │
│  │  └─────────────────┘    └──────────────────────┘    │  │
│  │             │                      │                 │  │
│  │             └──────────┬───────────┘                 │  │
│  └────────────────────────┼──────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │       useAnchorNavigation Hook                        │  │
│  │  - handleAnchorClick()                                │  │
│  │  - handleInitialHash()                                │  │
│  │  - updateActiveLink()                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ API Calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend API Server                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │       Agent Pages Routes                              │  │
│  │                                                        │  │
│  │  POST /api/agent-pages/validate-anchors               │  │
│  │  GET  /api/agent-pages/:id/anchor-map                 │  │
│  │  GET  /api/agent-pages/:id                            │  │
│  │  POST /api/agent-pages                                │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │       Validation Service                              │  │
│  │                                                        │  │
│  │  validateAnchors(layout)                              │  │
│  │  extractAnchors(sidebar)                              │  │
│  │  generateIds(content)                                 │  │
│  │  buildAnchorMap(layout)                               │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │       Page Repository                                 │  │
│  │                                                        │  │
│  │  getPageById(id)                                      │  │
│  │  savePage(page)                                       │  │
│  │  updatePage(id, page)                                 │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   SQLite Database                            │
│                                                               │
│  agent_pages table:                                          │
│  - id (PRIMARY KEY)                                          │
│  - title, description, author                                │
│  - layout (JSON)                                             │
│  - created_at, updated_at                                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Component Architecture

#### Frontend Components

```
frontend/src/components/
├── DynamicPage/
│   ├── DynamicPage.jsx              # Main page container
│   ├── DynamicPageSidebar.jsx       # Sidebar with navigation
│   ├── DynamicPageContent.jsx       # Content area
│   └── styles/
│       └── DynamicPage.css
│
├── ContentBlocks/
│   ├── HeadingBlock.jsx             # Heading with auto-ID
│   ├── TextBlock.jsx
│   ├── CodeBlock.jsx
│   ├── TableBlock.jsx
│   └── ChartBlock.jsx
│
└── hooks/
    ├── useAnchorNavigation.js       # Anchor navigation logic
    ├── useScrollSpy.js              # Active section tracking
    └── usePageValidation.js         # Client-side validation

frontend/src/utils/
├── anchorValidation.js              # Validation utilities
├── idGeneration.js                  # ID generation utilities
└── scrollUtils.js                   # Scroll utilities
```

#### Backend Services

```
api-server/
├── routes/
│   └── agent-pages.js               # Extended with validation endpoints
│
├── services/
│   ├── anchorValidationService.js   # Core validation logic
│   ├── idGenerationService.js       # ID generation service
│   └── pageProcessingService.js     # Page preprocessing
│
└── middleware/
    └── validatePageMiddleware.js    # Validation middleware
```

### 3.3 Data Flow Diagrams

#### Page Creation Flow

```
┌───────────────┐
│ Page Builder  │
│    Agent      │
└───────┬───────┘
        │ Generates page JSON
        ▼
┌───────────────────┐
│ POST /agent-pages │
└───────┬───────────┘
        │
        ▼
┌──────────────────────────┐
│ Validation Middleware    │
│ - Extract anchors        │
│ - Extract IDs            │
│ - Auto-generate IDs      │
│ - Validate anchor targets│
└───────┬──────────────────┘
        │
        ├─ Valid ──────────┐
        │                  ▼
        │          ┌───────────────┐
        │          │ Save to DB    │
        │          │ Return 201    │
        │          └───────────────┘
        │
        └─ Invalid ────────┐
                          ▼
                  ┌───────────────┐
                  │ Return 400    │
                  │ with errors   │
                  └───────────────┘
```

#### Page Rendering Flow

```
┌──────────────┐
│ User visits  │
│ /page/:slug  │
└──────┬───────┘
       │
       ▼
┌─────────────────┐
│ React Router    │
│ loads component │
└──────┬──────────┘
       │
       ▼
┌──────────────────────┐
│ GET /agent-pages/:id │
└──────┬───────────────┘
       │
       ▼
┌────────────────────────┐
│ Render DynamicPage     │
│ - Sidebar with anchors │
│ - Content with IDs     │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│ useAnchorNavigation    │
│ - Setup click handlers │
│ - Handle initial hash  │
│ - Setup scroll spy     │
└────────────────────────┘
```

#### Anchor Navigation Flow

```
┌───────────────┐
│ User clicks   │
│ sidebar link  │
│ (#section-2)  │
└───────┬───────┘
        │
        ▼
┌───────────────────────┐
│ handleAnchorClick()   │
│ - preventDefault()    │
└───────┬───────────────┘
        │
        ▼
┌───────────────────────────┐
│ Find target element       │
│ getElementById("section-2")│
└───────┬───────────────────┘
        │
        ├─ Found ───────────┐
        │                   ▼
        │           ┌───────────────────┐
        │           │ Calculate position│
        │           │ - Element offset  │
        │           │ - Header height   │
        │           └───────┬───────────┘
        │                   │
        │                   ▼
        │           ┌───────────────────┐
        │           │ Smooth scroll     │
        │           └───────┬───────────┘
        │                   │
        │                   ▼
        │           ┌───────────────────┐
        │           │ Update URL hash   │
        │           │ Update focus      │
        │           │ Update active link│
        │           └───────────────────┘
        │
        └─ Not Found ──────┐
                          ▼
                  ┌───────────────┐
                  │ Log error     │
                  │ Scroll to top │
                  └───────────────┘
```

### 3.4 Module Interfaces

#### Validation Service Interface

```javascript
/**
 * Anchor Validation Service
 * @module services/anchorValidationService
 */

/**
 * Validates anchor links in page layout
 * @param {Object} layout - Page layout object
 * @returns {ValidationResult}
 */
export function validateAnchors(layout)

/**
 * Extracts all anchor links from sidebar
 * @param {Object|Array} sidebar - Sidebar configuration
 * @returns {string[]} Array of anchor hrefs
 */
export function extractAnchorsFromSidebar(sidebar)

/**
 * Extracts all IDs from content blocks
 * @param {Array} content - Content blocks array
 * @returns {Map<string, Object>} Map of ID to element
 */
export function extractIdsFromContent(content)

/**
 * Auto-generates IDs for content blocks
 * @param {Array} content - Content blocks array
 * @param {Set} existingIds - Set of existing IDs
 * @returns {Map<string, Object>} Map of generated IDs
 */
export function generateMissingIds(content, existingIds)

/**
 * Builds anchor-to-element map
 * @param {Object} layout - Page layout
 * @returns {Map<string, string>} Map of anchor to element ID
 */
export function buildAnchorMap(layout)
```

#### Navigation Hook Interface

```javascript
/**
 * Anchor Navigation Hook
 * @module hooks/useAnchorNavigation
 */

/**
 * Provides anchor navigation functionality
 * @param {Object} options - Configuration options
 * @param {number} options.headerOffset - Fixed header height offset
 * @param {string} options.activeClass - CSS class for active links
 * @returns {Object} Navigation functions
 */
export function useAnchorNavigation(options)

// Returns:
// {
//   handleAnchorClick: (event, href) => void,
//   activeAnchor: string,
//   scrollToAnchor: (anchor) => void
// }
```

#### Scroll Spy Hook Interface

```javascript
/**
 * Scroll Spy Hook
 * @module hooks/useScrollSpy
 */

/**
 * Tracks which section is currently visible
 * @param {string[]} anchors - Array of anchor IDs
 * @param {Object} options - Configuration options
 * @returns {string} Currently active anchor
 */
export function useScrollSpy(anchors, options)
```

### 3.5 Configuration Schema

```javascript
// config/anchorNavigation.js
export const ANCHOR_NAVIGATION_CONFIG = {
  // Scroll behavior
  scroll: {
    behavior: "smooth",          // "smooth" | "auto"
    headerOffset: 80,             // Pixels to offset for fixed header
    duration: 500,                // Animation duration (ms)
    easing: "easeInOutCubic"     // Easing function
  },

  // Validation
  validation: {
    enabled: true,
    strictMode: false,            // Fail on warnings
    autoFix: true,                // Auto-generate missing IDs
    logErrors: true               // Console log errors
  },

  // ID Generation
  idGeneration: {
    maxLength: 50,                // Max slug length
    prefix: "",                   // ID prefix
    separator: "-",               // Word separator
    lowercase: true,              // Force lowercase
    unique: true                  // Ensure uniqueness
  },

  // Scroll Spy
  scrollSpy: {
    enabled: true,
    threshold: 0.5,               // Intersection ratio
    rootMargin: "-80px 0px 0px 0px", // Account for header
    updateUrl: true               // Update URL hash on scroll
  },

  // Accessibility
  a11y: {
    respectReducedMotion: true,   // Honor prefers-reduced-motion
    manageFocus: true,            // Move focus on navigation
    announceNavigation: true      // Screen reader announcements
  }
};
```

---

## 4. REFINEMENT PHASE

### 4.1 Implementation Details

#### 4.1.1 Validation Service Implementation

**File**: `/workspaces/agent-feed/api-server/services/anchorValidationService.js`

```javascript
/**
 * Anchor Validation Service
 * Validates anchor links and generates IDs for page content
 */

const { slugify, levenshteinDistance } = require('../utils/stringUtils');

/**
 * Main validation function
 */
function validateAnchors(layout) {
  const errors = [];
  const warnings = [];
  const anchorMap = new Map();

  if (!layout || typeof layout !== 'object') {
    return {
      isValid: false,
      errors: [{ type: 'invalid-layout', message: 'Layout is required and must be an object' }],
      warnings: []
    };
  }

  // Step 1: Extract anchors from sidebar
  const sidebarAnchors = extractAnchorsFromSidebar(layout.sidebar);

  // Step 2: Extract and generate IDs
  const contentIds = extractIdsFromContent(layout.content || []);
  const generatedIds = generateMissingIds(layout.content || [], contentIds);
  const allIds = new Map([...contentIds, ...generatedIds]);

  // Step 3: Validate each anchor
  for (const anchor of sidebarAnchors) {
    const targetId = anchor.substring(1); // Remove '#'

    if (!allIds.has(targetId)) {
      errors.push({
        type: 'missing-anchor-target',
        severity: 'error',
        anchor,
        message: `Anchor link '${anchor}' has no matching target element`,
        suggestions: generateSuggestions(targetId, allIds)
      });
    } else {
      anchorMap.set(anchor, targetId);
    }
  }

  // Step 4: Check for duplicates
  const duplicates = findDuplicateIds(layout.content || []);
  for (const dup of duplicates) {
    warnings.push({
      type: 'duplicate-id',
      severity: 'warning',
      message: `Duplicate ID '${dup.id}' found at indices ${dup.indices.join(', ')}`,
      id: dup.id
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    anchorMap: Object.fromEntries(anchorMap),
    availableIds: Array.from(allIds.keys()),
    stats: {
      totalAnchors: sidebarAnchors.length,
      validAnchors: anchorMap.size,
      invalidAnchors: errors.length,
      autoGeneratedIds: generatedIds.size
    }
  };
}

/**
 * Extract anchor links from sidebar recursively
 */
function extractAnchorsFromSidebar(sidebar) {
  const anchors = [];

  if (!sidebar) return anchors;

  const items = Array.isArray(sidebar) ? sidebar : (sidebar.items || []);

  for (const item of items) {
    if (item.type === 'link' && item.href && item.href.startsWith('#')) {
      anchors.push(item.href);
    }

    // Recurse into nested items
    if (Array.isArray(item.items)) {
      anchors.push(...extractAnchorsFromSidebar(item.items));
    }
  }

  return [...new Set(anchors)]; // Remove duplicates
}

/**
 * Extract explicit IDs from content blocks
 */
function extractIdsFromContent(content) {
  const idMap = new Map();

  if (!Array.isArray(content)) return idMap;

  for (let i = 0; i < content.length; i++) {
    const block = content[i];
    if (block.id && typeof block.id === 'string' && block.id.trim()) {
      idMap.set(block.id, { block, index: i });
    }
  }

  return idMap;
}

/**
 * Generate IDs for blocks that don't have them
 */
function generateMissingIds(content, existingIds) {
  const generatedIds = new Map();
  const usedIds = new Set(existingIds.keys());

  if (!Array.isArray(content)) return generatedIds;

  for (let i = 0; i < content.length; i++) {
    const block = content[i];

    // Skip if already has ID
    if (block.id) continue;

    // Generate ID based on block type and content
    let proposedId = generateIdForBlock(block, i);

    // Ensure uniqueness
    let finalId = proposedId;
    let counter = 2;
    while (usedIds.has(finalId)) {
      finalId = `${proposedId}-${counter}`;
      counter++;
    }

    // Assign ID to block (mutates original)
    block.id = finalId;
    generatedIds.set(finalId, { block, index: i });
    usedIds.add(finalId);
  }

  return generatedIds;
}

/**
 * Generate ID for a specific block
 */
function generateIdForBlock(block, index) {
  if (!block || !block.type) {
    return `section-${index}`;
  }

  switch (block.type) {
    case 'heading':
      return block.content ? slugify(block.content) : `heading-${index}`;

    case 'section':
      return block.title ? slugify(block.title) : `section-${index}`;

    case 'text':
      // Use first few words of text
      if (block.content && typeof block.content === 'string') {
        const words = block.content.split(/\s+/).slice(0, 5).join(' ');
        return slugify(words) || `text-${index}`;
      }
      return `text-${index}`;

    case 'code':
      return block.title ? slugify(block.title) : `code-${index}`;

    case 'table':
      return block.title ? slugify(block.title) : `table-${index}`;

    case 'chart':
      return block.title ? slugify(block.title) : `chart-${index}`;

    default:
      return `${block.type}-${index}`;
  }
}

/**
 * Find duplicate IDs in content
 */
function findDuplicateIds(content) {
  const idCounts = new Map();
  const duplicates = [];

  if (!Array.isArray(content)) return duplicates;

  for (let i = 0; i < content.length; i++) {
    const block = content[i];
    if (block.id) {
      if (!idCounts.has(block.id)) {
        idCounts.set(block.id, [i]);
      } else {
        idCounts.get(block.id).push(i);
      }
    }
  }

  for (const [id, indices] of idCounts) {
    if (indices.length > 1) {
      duplicates.push({ id, indices });
    }
  }

  return duplicates;
}

/**
 * Generate helpful suggestions for missing anchor target
 */
function generateSuggestions(targetId, availableIds) {
  const suggestions = [];

  // Suggest adding ID
  suggestions.push(`Add id="${targetId}" to a content block`);

  // Find similar IDs
  const similar = [];
  for (const availableId of availableIds.keys()) {
    const distance = levenshteinDistance(targetId, availableId);
    if (distance <= 3) {
      similar.push(availableId);
    }
  }

  if (similar.length > 0) {
    suggestions.push(`Did you mean: ${similar.slice(0, 3).map(id => `#${id}`).join(', ')}`);
  }

  // List available IDs
  const allIds = Array.from(availableIds.keys()).slice(0, 10);
  if (allIds.length > 0) {
    suggestions.push(`Available IDs: ${allIds.map(id => `#${id}`).join(', ')}`);
  }

  return suggestions;
}

/**
 * Build complete anchor-to-ID mapping
 */
function buildAnchorMap(layout) {
  const validation = validateAnchors(layout);
  return validation.anchorMap;
}

module.exports = {
  validateAnchors,
  extractAnchorsFromSidebar,
  extractIdsFromContent,
  generateMissingIds,
  buildAnchorMap
};
```

#### 4.1.2 String Utilities

**File**: `/workspaces/agent-feed/api-server/utils/stringUtils.js`

```javascript
/**
 * String utility functions
 */

/**
 * Convert text to URL-safe slug
 */
function slugify(text, maxLength = 50) {
  if (!text || typeof text !== 'string') return '';

  let slug = text
    .toLowerCase()
    .trim()
    // Replace accented characters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace non-alphanumeric with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-');

  // Limit length
  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength).replace(/-[^-]*$/, '');
  }

  return slug || 'section';
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Deletion
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return matrix[len1][len2];
}

module.exports = {
  slugify,
  levenshteinDistance
};
```

#### 4.1.3 API Routes Extension

**File**: `/workspaces/agent-feed/api-server/routes/agent-pages.js`

Add these endpoints:

```javascript
const { validateAnchors, buildAnchorMap } = require('../services/anchorValidationService');

/**
 * POST /api/agent-pages/validate-anchors
 * Validate anchor links in page layout
 */
router.post('/validate-anchors', (req, res) => {
  try {
    const { pageId, layout } = req.body;

    if (!layout) {
      return res.status(400).json({
        error: 'Layout is required',
        message: 'Request body must include "layout" object'
      });
    }

    const result = validateAnchors(layout);

    if (result.isValid) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/agent-pages/:id/anchor-map
 * Get anchor-to-ID mapping for a page
 */
router.get('/:id/anchor-map', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch page from database
    const page = await db.get(
      'SELECT * FROM agent_pages WHERE id = ?',
      [id]
    );

    if (!page) {
      return res.status(404).json({
        error: 'Page not found',
        id
      });
    }

    const layout = JSON.parse(page.layout);
    const anchorMap = buildAnchorMap(layout);
    const validation = validateAnchors(layout);

    res.json({
      pageId: id,
      anchorMap,
      availableAnchors: validation.availableIds.map(id => `#${id}`),
      sidebarAnchors: extractAnchorsFromSidebar(layout.sidebar),
      isValid: validation.isValid,
      errors: validation.errors
    });
  } catch (error) {
    console.error('Error fetching anchor map:', error);
    res.status(500).json({
      error: 'Failed to fetch anchor map',
      message: error.message
    });
  }
});

/**
 * Middleware: Validate anchors before saving page
 */
function validatePageMiddleware(req, res, next) {
  const { layout } = req.body;

  if (!layout) {
    return next(); // Skip validation if no layout
  }

  const result = validateAnchors(layout);

  // Auto-fix: IDs are generated, so update layout
  req.body.layout = layout;

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('Page validation warnings:', result.warnings);
  }

  // Fail on errors (optional - can be disabled)
  if (!result.isValid && process.env.STRICT_VALIDATION === 'true') {
    return res.status(400).json({
      error: 'Page validation failed',
      ...result
    });
  }

  // Attach validation result to request
  req.validation = result;
  next();
}

// Apply middleware to POST and PUT routes
router.post('/', validatePageMiddleware, async (req, res) => {
  // Existing create logic...
});

router.put('/:id', validatePageMiddleware, async (req, res) => {
  // Existing update logic...
});
```

#### 4.1.4 React Hook Implementation

**File**: `/workspaces/agent-feed/frontend/src/hooks/useAnchorNavigation.js`

```javascript
import { useEffect, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Custom hook for anchor link navigation
 */
export function useAnchorNavigation(options = {}) {
  const {
    headerOffset = 80,
    behavior = 'smooth',
    updateUrl = true,
    manageFocus = true
  } = options;

  const location = useLocation();
  const navigate = useNavigate();
  const [activeAnchor, setActiveAnchor] = useState('');

  /**
   * Handle anchor link click
   */
  const handleAnchorClick = useCallback((event, href) => {
    event.preventDefault();

    if (!href || !href.startsWith('#')) {
      console.warn('Invalid anchor href:', href);
      return;
    }

    const targetId = href.substring(1);
    scrollToAnchor(targetId);
  }, [headerOffset, behavior, updateUrl, manageFocus]);

  /**
   * Scroll to anchor target
   */
  const scrollToAnchor = useCallback((targetId) => {
    const targetElement = document.getElementById(targetId);

    if (!targetElement) {
      console.error(`Anchor target not found: #${targetId}`);
      return;
    }

    // Calculate scroll position
    const elementPosition = targetElement.getBoundingClientRect().top;
    const offsetPosition = window.pageYOffset + elementPosition - headerOffset;

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollBehavior = prefersReducedMotion ? 'auto' : behavior;

    // Perform scroll
    window.scrollTo({
      top: offsetPosition,
      behavior: scrollBehavior
    });

    // Update URL
    if (updateUrl) {
      const newUrl = `${location.pathname}#${targetId}`;
      window.history.pushState(null, '', newUrl);
    }

    // Manage focus for accessibility
    if (manageFocus) {
      targetElement.setAttribute('tabindex', '-1');
      targetElement.focus({ preventScroll: true });

      // Remove tabindex after focus
      setTimeout(() => {
        targetElement.removeAttribute('tabindex');
      }, 1000);
    }

    setActiveAnchor(`#${targetId}`);
  }, [headerOffset, behavior, updateUrl, manageFocus, location.pathname]);

  /**
   * Handle initial hash on page load
   */
  useEffect(() => {
    const hash = location.hash;

    if (hash) {
      // Wait for content to render
      const timer = setTimeout(() => {
        const targetId = hash.substring(1);
        scrollToAnchor(targetId);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [location.hash, scrollToAnchor]);

  return {
    handleAnchorClick,
    scrollToAnchor,
    activeAnchor
  };
}
```

#### 4.1.5 Scroll Spy Hook

**File**: `/workspaces/agent-feed/frontend/src/hooks/useScrollSpy.js`

```javascript
import { useState, useEffect } from 'react';

/**
 * Track which section is currently visible
 */
export function useScrollSpy(anchors, options = {}) {
  const {
    offset = 100,
    throttle = 100
  } = options;

  const [activeAnchor, setActiveAnchor] = useState('');

  useEffect(() => {
    if (!anchors || anchors.length === 0) return;

    let timeoutId = null;

    const handleScroll = () => {
      // Throttle scroll events
      if (timeoutId) return;

      timeoutId = setTimeout(() => {
        const scrollPosition = window.scrollY + offset;

        // Find the section currently in view
        let currentAnchor = '';

        for (const anchor of anchors) {
          const targetId = anchor.startsWith('#') ? anchor.substring(1) : anchor;
          const element = document.getElementById(targetId);

          if (element) {
            const elementTop = element.offsetTop;
            const elementBottom = elementTop + element.offsetHeight;

            if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
              currentAnchor = `#${targetId}`;
              break;
            }
          }
        }

        // If no section matches, use the last passed section
        if (!currentAnchor) {
          for (let i = anchors.length - 1; i >= 0; i--) {
            const anchor = anchors[i];
            const targetId = anchor.startsWith('#') ? anchor.substring(1) : anchor;
            const element = document.getElementById(targetId);

            if (element && scrollPosition >= element.offsetTop) {
              currentAnchor = `#${targetId}`;
              break;
            }
          }
        }

        if (currentAnchor !== activeAnchor) {
          setActiveAnchor(currentAnchor);
        }

        timeoutId = null;
      }, throttle);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [anchors, offset, throttle, activeAnchor]);

  return activeAnchor;
}
```

#### 4.1.6 Updated DynamicPage Component

**File**: `/workspaces/agent-feed/frontend/src/components/DynamicPage/DynamicPage.jsx`

```javascript
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAnchorNavigation } from '../../hooks/useAnchorNavigation';
import { useScrollSpy } from '../../hooks/useScrollSpy';
import DynamicPageSidebar from './DynamicPageSidebar';
import DynamicPageContent from './DynamicPageContent';
import './styles/DynamicPage.css';

export default function DynamicPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract anchors from sidebar
  const anchors = page?.layout?.sidebar?.items
    ?.filter(item => item.href?.startsWith('#'))
    .map(item => item.href) || [];

  // Setup anchor navigation
  const { handleAnchorClick, activeAnchor } = useAnchorNavigation({
    headerOffset: 80,
    behavior: 'smooth'
  });

  // Track active section
  const scrollSpyAnchor = useScrollSpy(anchors, { offset: 100 });
  const currentActive = activeAnchor || scrollSpyAnchor;

  // Fetch page data
  useEffect(() => {
    async function fetchPage() {
      try {
        setLoading(true);
        const response = await fetch(`/api/agent-pages/by-slug/${slug}`);

        if (!response.ok) {
          throw new Error('Page not found');
        }

        const data = await response.json();
        setPage(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [slug]);

  if (loading) {
    return <div className="dynamic-page-loading">Loading...</div>;
  }

  if (error) {
    return <div className="dynamic-page-error">Error: {error}</div>;
  }

  if (!page) {
    return <div className="dynamic-page-error">Page not found</div>;
  }

  return (
    <div className="dynamic-page">
      <DynamicPageSidebar
        items={page.layout.sidebar?.items || []}
        onAnchorClick={handleAnchorClick}
        activeAnchor={currentActive}
      />

      <DynamicPageContent
        blocks={page.layout.content || []}
      />
    </div>
  );
}
```

#### 4.1.7 Sidebar Component

**File**: `/workspaces/agent-feed/frontend/src/components/DynamicPage/DynamicPageSidebar.jsx`

```javascript
import React from 'react';
import { Link } from 'react-router-dom';

export default function DynamicPageSidebar({ items, onAnchorClick, activeAnchor }) {
  const renderLink = (item, index) => {
    const { href, label, icon } = item;
    const isActive = href === activeAnchor;
    const className = `sidebar-link ${isActive ? 'active' : ''}`;

    // Anchor link
    if (href?.startsWith('#')) {
      return (
        <a
          key={index}
          href={href}
          className={className}
          onClick={(e) => onAnchorClick(e, href)}
        >
          {icon && <span className="sidebar-icon">{icon}</span>}
          {label}
        </a>
      );
    }

    // Internal route
    if (href?.startsWith('/')) {
      return (
        <Link
          key={index}
          to={href}
          className={className}
        >
          {icon && <span className="sidebar-icon">{icon}</span>}
          {label}
        </Link>
      );
    }

    // External link
    if (href?.startsWith('http')) {
      return (
        <a
          key={index}
          href={href}
          className={className}
          target="_blank"
          rel="noopener noreferrer"
        >
          {icon && <span className="sidebar-icon">{icon}</span>}
          {label}
          <span className="external-icon">↗</span>
        </a>
      );
    }

    // Invalid link
    return (
      <span key={index} className="sidebar-link disabled">
        {label}
      </span>
    );
  };

  const renderItem = (item, index) => {
    if (item.type === 'section') {
      return (
        <div key={index} className="sidebar-section">
          <div className="sidebar-section-label">{item.label}</div>
          {item.items?.map(renderItem)}
        </div>
      );
    }

    return renderLink(item, index);
  };

  return (
    <aside className="dynamic-page-sidebar">
      <nav className="sidebar-nav">
        {items.map(renderItem)}
      </nav>
    </aside>
  );
}
```

### 4.2 Error Handling Strategy

#### 4.2.1 Validation Errors

```javascript
// Graceful degradation
try {
  const result = validateAnchors(layout);
  if (!result.isValid) {
    // Log errors but don't fail
    console.error('Anchor validation failed:', result.errors);
    // Continue with partial functionality
  }
} catch (error) {
  console.error('Validation exception:', error);
  // Fall back to basic rendering
}
```

#### 4.2.2 Navigation Errors

```javascript
function handleAnchorClick(event, href) {
  event.preventDefault();

  try {
    const targetId = href.substring(1);
    const element = document.getElementById(targetId);

    if (!element) {
      // Fallback: scroll to top
      console.error(`Target not found: ${href}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Optionally show user notification
      showNotification('Section not found', 'error');
      return;
    }

    // Normal scroll
    scrollToElement(element);
  } catch (error) {
    console.error('Navigation error:', error);
    // Fail silently to avoid breaking page
  }
}
```

### 4.3 Performance Optimizations

#### 4.3.1 Memoization

```javascript
import { useMemo } from 'react';

function DynamicPage() {
  // Memoize anchor extraction
  const anchors = useMemo(() => {
    return page?.layout?.sidebar?.items
      ?.filter(item => item.href?.startsWith('#'))
      .map(item => item.href) || [];
  }, [page?.layout?.sidebar?.items]);

  // Memoize ID map
  const idMap = useMemo(() => {
    const map = new Map();
    page?.layout?.content?.forEach(block => {
      if (block.id) map.set(block.id, block);
    });
    return map;
  }, [page?.layout?.content]);
}
```

#### 4.3.2 Scroll Throttling

```javascript
function useScrollSpy(anchors, options) {
  useEffect(() => {
    let rafId = null;
    let lastScrollY = 0;

    const handleScroll = () => {
      const scrollY = window.scrollY;

      // Skip if scroll hasn't changed much
      if (Math.abs(scrollY - lastScrollY) < 10) return;

      lastScrollY = scrollY;

      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        updateActiveSection(scrollY);
        rafId = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [anchors]);
}
```

### 4.4 Testing Strategy

#### 4.4.1 Unit Tests

```javascript
// anchorValidationService.test.js
describe('Anchor Validation Service', () => {
  describe('validateAnchors', () => {
    test('should validate page with matching anchors', () => {
      const layout = {
        sidebar: {
          items: [
            { type: 'link', href: '#intro', label: 'Introduction' }
          ]
        },
        content: [
          { type: 'heading', id: 'intro', content: 'Introduction' }
        ]
      };

      const result = validateAnchors(layout);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing anchor targets', () => {
      const layout = {
        sidebar: {
          items: [
            { type: 'link', href: '#missing', label: 'Missing' }
          ]
        },
        content: []
      };

      const result = validateAnchors(layout);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('missing-anchor-target');
    });

    test('should auto-generate IDs for headings', () => {
      const layout = {
        sidebar: { items: [] },
        content: [
          { type: 'heading', content: 'User Guide' }
        ]
      };

      const result = validateAnchors(layout);

      expect(layout.content[0].id).toBe('user-guide');
    });
  });

  describe('slugify', () => {
    test('should convert text to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('User Authentication System')).toBe('user-authentication-system');
      expect(slugify('API v2.0')).toBe('api-v2-0');
    });

    test('should handle special characters', () => {
      expect(slugify('Café & Restaurant')).toBe('cafe-restaurant');
      expect(slugify('100% Working!')).toBe('100-working');
    });
  });
});
```

#### 4.4.2 Integration Tests

```javascript
// dynamicPage.integration.test.js
describe('Dynamic Page Navigation', () => {
  test('should navigate to section on anchor click', async () => {
    render(<DynamicPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    // Click anchor link
    const link = screen.getByRole('link', { name: 'Section 2' });
    fireEvent.click(link);

    // Verify scroll occurred
    await waitFor(() => {
      const section = screen.getByTestId('section-2');
      expect(section).toBeInViewport();
    });

    // Verify URL updated
    expect(window.location.hash).toBe('#section-2');
  });

  test('should handle initial hash on page load', async () => {
    // Set initial hash
    window.location.hash = '#section-3';

    render(<DynamicPage />);

    // Verify scrolled to section
    await waitFor(() => {
      const section = screen.getByTestId('section-3');
      expect(section).toBeInViewport();
    });
  });
});
```

---

## 5. COMPLETION PHASE

### 5.1 Verification Checklist

#### Functional Requirements

- [ ] **FR-1**: Anchor link validation working
  - [ ] Validates sidebar anchors against content IDs
  - [ ] Returns structured error messages
  - [ ] Supports nested sidebar items

- [ ] **FR-2**: Automatic ID generation working
  - [ ] Generates IDs for headings
  - [ ] Handles duplicate prevention
  - [ ] Preserves manual IDs

- [ ] **FR-3**: React Router scroll handling working
  - [ ] Smooth scrolling to targets
  - [ ] Works on initial page load with hash
  - [ ] Updates URL without reload
  - [ ] Accounts for fixed header offset

- [ ] **FR-4**: Sidebar navigation enhanced
  - [ ] Supports anchor, route, and external links
  - [ ] Auto-determines link type
  - [ ] Active link highlighting works
  - [ ] Sticky positioning maintained

- [ ] **FR-5**: Validation error reporting working
  - [ ] Returns structured errors
  - [ ] Includes all required fields
  - [ ] Doesn't fail silently
  - [ ] Logs to console

#### Non-Functional Requirements

- [ ] **NFR-1**: Performance acceptable
  - [ ] Anchor navigation < 500ms
  - [ ] Validation < 100ms
  - [ ] 60fps scroll animation

- [ ] **NFR-2**: Cross-browser compatible
  - [ ] Works in Chrome
  - [ ] Works in Firefox
  - [ ] Works in Safari
  - [ ] Works in Edge

- [ ] **NFR-3**: Code maintainability
  - [ ] Functions are modular
  - [ ] JSDoc documentation complete
  - [ ] Validation separated from rendering
  - [ ] Configuration centralized

- [ ] **NFR-4**: Accessibility compliant
  - [ ] Focus management working
  - [ ] Skip links provided
  - [ ] ARIA attributes correct
  - [ ] Reduced motion respected

### 5.2 Testing Plan

#### Unit Tests
```bash
# Run unit tests
npm test -- anchorValidationService.test.js
npm test -- stringUtils.test.js
npm test -- useAnchorNavigation.test.js
npm test -- useScrollSpy.test.js
```

#### Integration Tests
```bash
# Run integration tests
npm test -- dynamicPage.integration.test.js
npm test -- api.integration.test.js
```

#### Manual Testing Checklist

1. **Create Test Page**
   - [ ] Use page-builder-agent to create page with 5+ sections
   - [ ] Verify sidebar has anchor links
   - [ ] Verify content has matching IDs

2. **Test Navigation**
   - [ ] Click each sidebar link
   - [ ] Verify smooth scroll to target
   - [ ] Verify URL hash updates
   - [ ] Verify active link highlights

3. **Test Initial Load**
   - [ ] Open URL with hash (e.g., /page#section-3)
   - [ ] Verify page scrolls to correct section
   - [ ] Verify active link is highlighted

4. **Test Validation**
   - [ ] Create page with missing anchor target
   - [ ] Verify validation catches error
   - [ ] Verify error message is helpful
   - [ ] Verify suggestions provided

5. **Test Edge Cases**
   - [ ] Page with no sidebar
   - [ ] Page with empty content
   - [ ] Anchor link to non-existent ID
   - [ ] Duplicate IDs
   - [ ] Very long heading text
   - [ ] Special characters in headings

6. **Test Accessibility**
   - [ ] Navigate with keyboard only
   - [ ] Verify focus moves to target
   - [ ] Test with screen reader
   - [ ] Test with reduced motion enabled

### 5.3 Deployment Steps

1. **Backend Deployment**
   ```bash
   # 1. Add new service files
   cd /workspaces/agent-feed/api-server

   # 2. Create services directory if needed
   mkdir -p services utils

   # 3. Add validation service
   # (Copy anchorValidationService.js)

   # 4. Add string utils
   # (Copy stringUtils.js)

   # 5. Update routes
   # (Update agent-pages.js)

   # 6. Test API endpoints
   npm test

   # 7. Restart server
   npm run dev
   ```

2. **Frontend Deployment**
   ```bash
   # 1. Add hooks
   cd /workspaces/agent-feed/frontend/src
   mkdir -p hooks

   # 2. Add useAnchorNavigation hook
   # (Copy useAnchorNavigation.js)

   # 3. Add useScrollSpy hook
   # (Copy useScrollSpy.js)

   # 4. Update DynamicPage component
   # (Update DynamicPage.jsx)

   # 5. Update Sidebar component
   # (Update DynamicPageSidebar.jsx)

   # 6. Test components
   npm test

   # 7. Build and deploy
   npm run build
   ```

3. **Database Migration**
   ```sql
   -- No schema changes required
   -- Existing JSON storage works as-is
   ```

4. **Configuration**
   ```javascript
   // Add to .env
   STRICT_VALIDATION=false  # Set to true for strict mode
   ```

### 5.4 Rollback Plan

If issues are found post-deployment:

1. **Immediate Rollback**
   ```bash
   # Revert backend changes
   git revert <commit-hash>

   # Revert frontend changes
   git revert <commit-hash>

   # Redeploy
   npm run deploy
   ```

2. **Partial Rollback**
   - Disable validation middleware
   - Fall back to basic anchor links (no scroll handling)
   - Keep ID generation but disable validation

3. **Feature Flag**
   ```javascript
   const ANCHOR_NAVIGATION_ENABLED = process.env.ENABLE_ANCHOR_NAV === 'true';

   if (ANCHOR_NAVIGATION_ENABLED) {
     // Use new navigation
   } else {
     // Use old navigation
   }
   ```

### 5.5 Monitoring and Metrics

#### Key Metrics to Track

1. **Validation Metrics**
   - Number of pages validated
   - Validation failure rate
   - Auto-generated ID count
   - Average validation time

2. **Navigation Metrics**
   - Anchor click rate
   - Navigation success rate
   - Average scroll time
   - Browser compatibility issues

3. **Error Metrics**
   - Missing anchor target errors
   - Duplicate ID warnings
   - Navigation failures
   - Client-side errors

#### Logging

```javascript
// Backend logging
logger.info('Anchor validation', {
  pageId,
  isValid: result.isValid,
  errorCount: result.errors.length,
  autoGeneratedIds: result.stats.autoGeneratedIds
});

// Frontend logging
console.log('Anchor navigation', {
  anchor: href,
  found: !!targetElement,
  scrollTime: performance.now() - startTime
});
```

### 5.6 Documentation Updates

1. **Update API Documentation**
   - Add validation endpoint docs
   - Add anchor-map endpoint docs
   - Update page creation examples

2. **Update Component Documentation**
   - Document useAnchorNavigation hook
   - Document useScrollSpy hook
   - Add usage examples

3. **Update README**
   - Add anchor navigation section
   - Add troubleshooting guide
   - Add configuration options

### 5.7 Success Criteria

The implementation is considered successful when:

1. **All pages have functional navigation**
   - 100% of sidebar anchor links work
   - 0 missing anchor target errors in production

2. **User experience is smooth**
   - < 500ms navigation time
   - 60fps scroll animation
   - No broken links

3. **System is maintainable**
   - Code coverage > 80%
   - All functions documented
   - No technical debt introduced

4. **Accessibility standards met**
   - WCAG 2.1 AA compliance
   - Keyboard navigation works
   - Screen reader compatible

5. **Zero regressions**
   - All existing pages still work
   - No performance degradation
   - No new bugs introduced

---

## 6. APPENDICES

### 6.1 Example Page JSON

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Getting Started Guide",
  "description": "A comprehensive guide to getting started",
  "author": "page-builder-agent",
  "slug": "getting-started-guide",
  "createdAt": "2025-10-06T10:00:00Z",
  "layout": {
    "sidebar": {
      "position": "left",
      "items": [
        {
          "type": "link",
          "label": "Introduction",
          "href": "#introduction"
        },
        {
          "type": "link",
          "label": "Installation",
          "href": "#installation"
        },
        {
          "type": "section",
          "label": "Features",
          "items": [
            {
              "type": "link",
              "label": "Authentication",
              "href": "#authentication"
            },
            {
              "type": "link",
              "label": "API Access",
              "href": "#api-access"
            }
          ]
        },
        {
          "type": "link",
          "label": "Conclusion",
          "href": "#conclusion"
        }
      ]
    },
    "content": [
      {
        "type": "heading",
        "id": "introduction",
        "level": 1,
        "content": "Introduction"
      },
      {
        "type": "text",
        "content": "Welcome to the getting started guide..."
      },
      {
        "type": "heading",
        "id": "installation",
        "level": 2,
        "content": "Installation"
      },
      {
        "type": "code",
        "language": "bash",
        "code": "npm install my-package"
      },
      {
        "type": "heading",
        "id": "authentication",
        "level": 2,
        "content": "Authentication"
      },
      {
        "type": "text",
        "content": "To authenticate users..."
      },
      {
        "type": "heading",
        "id": "api-access",
        "level": 2,
        "content": "API Access"
      },
      {
        "type": "text",
        "content": "Access the API using..."
      },
      {
        "type": "heading",
        "id": "conclusion",
        "level": 2,
        "content": "Conclusion"
      },
      {
        "type": "text",
        "content": "You're now ready to start..."
      }
    ]
  }
}
```

### 6.2 CSS Styles

```css
/* DynamicPage.css */

.dynamic-page {
  display: flex;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.dynamic-page-sidebar {
  flex: 0 0 250px;
  position: sticky;
  top: 80px;
  height: fit-content;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  color: #4b5563;
  text-decoration: none;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.sidebar-link:hover {
  background-color: #f3f4f6;
  color: #1f2937;
}

.sidebar-link.active {
  background-color: #3b82f6;
  color: white;
  font-weight: 500;
}

.sidebar-link.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sidebar-section {
  margin: 1rem 0;
}

.sidebar-section-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.5rem 1rem;
}

.external-icon {
  margin-left: auto;
  font-size: 0.875rem;
}

.dynamic-page-content {
  flex: 1;
  min-width: 0;
}

/* Smooth scroll */
html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .dynamic-page {
    flex-direction: column;
  }

  .dynamic-page-sidebar {
    position: static;
    max-height: none;
  }
}
```

### 6.3 Configuration File

```javascript
// config/anchorNavigation.config.js

module.exports = {
  // Scroll Configuration
  scroll: {
    behavior: 'smooth',
    headerOffset: 80,
    duration: 500,
    easing: 'easeInOutCubic'
  },

  // Validation Configuration
  validation: {
    enabled: true,
    strictMode: false,
    autoFix: true,
    logErrors: true,
    logWarnings: true
  },

  // ID Generation Configuration
  idGeneration: {
    maxLength: 50,
    prefix: '',
    separator: '-',
    lowercase: true,
    unique: true,
    fallback: 'section'
  },

  // Scroll Spy Configuration
  scrollSpy: {
    enabled: true,
    threshold: 0.5,
    rootMargin: '-80px 0px 0px 0px',
    updateUrl: true,
    throttle: 100
  },

  // Accessibility Configuration
  a11y: {
    respectReducedMotion: true,
    manageFocus: true,
    announceNavigation: false,
    skipLinks: true
  }
};
```

### 6.4 Glossary

- **Anchor Link**: A hyperlink that navigates to a specific section within the same page, using a hash fragment (e.g., `#section-1`)
- **Hash Fragment**: The portion of a URL after the `#` symbol
- **Scroll Spy**: A technique that tracks which section is currently visible in the viewport
- **Slugify**: Converting text into a URL-safe string (lowercase, hyphenated, alphanumeric)
- **Levenshtein Distance**: A measure of similarity between two strings
- **React Router**: A routing library for React applications
- **SPA**: Single Page Application
- **Reduced Motion**: A user preference to minimize animation and movement

### 6.5 References

- [MDN - Scroll Behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Router Documentation](https://reactrouter.com/)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

---

## Document Control

- **Version**: 1.0
- **Created**: 2025-10-06
- **Last Updated**: 2025-10-06
- **Status**: Final
- **Approved By**: Pending
- **Next Review**: After implementation

---

**End of SPARC Specification**
