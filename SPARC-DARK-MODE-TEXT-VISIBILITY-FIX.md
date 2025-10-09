# SPARC: Dark Mode Text Visibility Fix - AVI DM Chat Interface

## **S - Specification (Natural Language Design)**

### Problem Statement
The AVI DM (Direct Message) chat interface has critical text visibility issues in dark mode where reply text becomes unreadable due to insufficient contrast between text and background colors.

### User Requirements
- **Requirement 1**: All text in the chat interface must be clearly readable in dark mode
- **Requirement 2**: Text contrast must meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- **Requirement 3**: No text should inherit incorrect colors that reduce visibility
- **Requirement 4**: Code blocks must have proper syntax highlighting with sufficient contrast
- **Requirement 5**: All emotional tone indicators must be visible in dark mode

### Affected Components
- **File**: `/workspaces/agent-feed/frontend/src/components/avi-integration/AviChatInterface.tsx`
- **Lines**: 234-449 (message rendering section)

### Specific Issues Identified

#### Issue 1: Code Block Text Color (Line 240)
```tsx
// CURRENT (BROKEN)
<div className="bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono text-sm">
  {part}
</div>

// ISSUE: No text color specified - relies on inheritance which may fail
```

#### Issue 2: Plain Message Content (Line 248)
```tsx
// CURRENT (BROKEN)
<div className="whitespace-pre-wrap">{content}</div>

// ISSUE: No explicit text color - inherits from parent which may not cascade properly
```

#### Issue 3: Emotional Tone Colors (Lines 252-261)
```tsx
// CURRENT (BROKEN)
case 'encouraging': return 'text-green-600';
case 'empathetic': return 'text-purple-600';
case 'confident': return 'text-blue-600';

// ISSUE: 600-series colors are too dark on dark backgrounds
```

#### Issue 4: Message Content Wrapper (Lines 384-389)
```tsx
// CURRENT (POTENTIALLY BROKEN)
className={cn(
  'text-sm',
  message.isLocal
    ? 'text-white'
    : 'text-gray-900 dark:text-white'
)}

// ISSUE: Should use dark:text-gray-100 for better consistency
```

### Success Criteria
1. ✅ All text visible in both light and dark modes
2. ✅ WCAG AA contrast ratio compliance verified
3. ✅ No visual regressions in existing functionality
4. ✅ TDD tests pass with 100% coverage for contrast issues
5. ✅ Playwright screenshot tests confirm visual correctness
6. ✅ Real browser validation (no mocks/simulations)

---

## **P - Pseudocode**

### Algorithm: Fix Dark Mode Text Visibility

```plaintext
FUNCTION fixDarkModeTextVisibility():

  // Step 1: Update formatMessageContent function
  FUNCTION formatMessageContent(content: string, hasCodeBlocks: boolean):
    IF hasCodeBlocks:
      RETURN (
        <div className="space-y-2">
          FOR EACH part IN content.split('```'):
            IF index is odd (code block):
              // ADD explicit text colors for dark mode
              <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded font-mono text-sm overflow-x-auto">
                {part}
              </div>
            ELSE:
              // ADD explicit text colors for regular text
              <div className="text-gray-900 dark:text-gray-100">
                {part}
              </div>
        </div>
      )
    ELSE:
      // ADD explicit text colors to plain content wrapper
      RETURN <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{content}</div>
  END FUNCTION

  // Step 2: Update getEmotionalToneColor function
  FUNCTION getEmotionalToneColor(tone: AviEmotionalTone):
    SWITCH tone:
      CASE 'encouraging':
        RETURN 'text-green-600 dark:text-green-400'  // Lighter for dark mode
      CASE 'empathetic':
        RETURN 'text-purple-600 dark:text-purple-400'
      CASE 'confident':
        RETURN 'text-blue-600 dark:text-blue-400'
      CASE 'curious':
        RETURN 'text-yellow-600 dark:text-yellow-400'
      CASE 'patient':
        RETURN 'text-indigo-600 dark:text-indigo-400'
      DEFAULT:
        RETURN 'text-gray-600 dark:text-gray-400'
  END FUNCTION

  // Step 3: Update message content wrapper
  UPDATE line 384-389:
    className={cn(
      'text-sm',
      message.isLocal
        ? 'text-white'  // Keep white for user messages on blue background
        : 'text-gray-900 dark:text-gray-100'  // Ensure gray-100 for dark mode
    )}

  // Step 4: Add explicit text colors to metadata sections
  UPDATE line 397-403:
    <div className={cn(
      'flex items-center space-x-2',
      message.isLocal
        ? 'text-blue-100'
        : 'text-gray-500 dark:text-gray-400'  // Already correct
    )}>

  // Step 5: Update message indicators
  UPDATE lines 426-435:
    // Change from text-gray-400 to dual-mode colors
    <Code className="w-3 h-3 text-gray-400 dark:text-gray-500" />
    <Link className="w-3 h-3 text-gray-400 dark:text-gray-500" />
    <ImageIcon className="w-3 h-3 text-gray-400 dark:text-gray-500" />

END FUNCTION
```

### Testing Algorithm

```plaintext
FUNCTION testDarkModeContrast():

  // TDD Test 1: Code block text visibility
  TEST "code blocks have sufficient contrast in dark mode":
    RENDER AviChatInterface with dark mode enabled
    SEND message with code blocks
    VERIFY code block text has contrast ratio >= 4.5:1
    VERIFY code block background is dark:bg-gray-800
    VERIFY code block text is dark:text-gray-100
  END TEST

  // TDD Test 2: Plain message text visibility
  TEST "plain messages have sufficient contrast in dark mode":
    RENDER AviChatInterface with dark mode enabled
    SEND plain text message
    VERIFY message text has contrast ratio >= 4.5:1
    VERIFY text color is dark:text-gray-100
  END TEST

  // TDD Test 3: Emotional tone indicators
  TEST "emotional tone colors are visible in dark mode":
    FOR EACH tone IN ['encouraging', 'empathetic', 'confident', 'curious', 'patient']:
      RENDER message with tone
      ENABLE dark mode
      VERIFY tone indicator has contrast ratio >= 4.5:1
      VERIFY color uses 400-series in dark mode
    END FOR
  END TEST

  // Playwright Test 1: Visual regression
  TEST "screenshot comparison shows no regressions":
    NAVIGATE to AVI DM chat interface
    ENABLE dark mode
    SEND multiple message types (plain, code, emotional)
    CAPTURE screenshot
    COMPARE with baseline
    VERIFY no visual differences
  END TEST

  // Playwright Test 2: Real browser validation
  TEST "real browser shows all text clearly":
    LAUNCH Chrome in dark mode
    NAVIGATE to AVI DM
    VERIFY all messages are readable
    CAPTURE screenshots for documentation
    VERIFY no console errors
  END TEST

  // Regression Test: Existing functionality
  TEST "light mode still works correctly":
    RENDER AviChatInterface with light mode
    VERIFY all existing tests pass
    VERIFY no visual regressions
  END TEST

END FUNCTION
```

---

## **A - Architecture**

### Component Structure
```
AviChatInterface (Root Component)
├── Header Section (Lines 270-317)
│   ├── Title & Connection Status
│   └── Settings Controls
├── Personality Panel (Lines 319-352)
│   └── Mode Selector Grid
├── Messages Container (Lines 354-448)
│   ├── Message Bubble (Lines 360-445)
│   │   ├── Avatar (Lines 367-373)
│   │   ├── Content Wrapper (Lines 375-382)
│   │   │   ├── formatMessageContent() (Lines 234-249)
│   │   │   │   ├── Code Blocks (Line 240) ⚠️ FIX NEEDED
│   │   │   │   └── Plain Text (Line 248) ⚠️ FIX NEEDED
│   │   │   └── Message Text (Lines 384-394)
│   │   ├── Metadata Section (Lines 396-423)
│   │   │   ├── Timestamp (Line 404)
│   │   │   └── Emotional Tone (Lines 406-413) ⚠️ FIX NEEDED
│   │   └── Indicators (Lines 425-437) ⚠️ FIX NEEDED
│   └── Typing Indicator
└── Input Section
```

### Color System Architecture

#### Current Color Variables (from index.css)
```css
.dark {
  --background: 222.2 84% 4.9%;      /* #0a0f1e - Very dark blue */
  --foreground: 210 40% 98%;          /* #f8fafc - Near white */
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
}
```

#### Tailwind Color Mappings
```
Light Mode:
  - text-gray-900 → #111827 (very dark, high contrast on white)
  - text-gray-600 → #4b5563 (medium, readable on white)
  - text-gray-500 → #6b7280 (lighter, for metadata)
  - bg-gray-100 → #f3f4f6 (light background)

Dark Mode:
  - dark:text-gray-100 → #f3f4f6 (very light, high contrast on dark)
  - dark:text-gray-400 → #9ca3af (medium-light, readable on dark)
  - dark:text-green-400 → #4ade80 (visible on dark)
  - dark:bg-gray-800 → #1f2937 (dark background)
```

### Data Flow for Text Rendering
```
Message Object → AviChatMessage → Message Bubble Component
    ↓
    ├─→ formatMessageContent(content, hasCodeBlocks)
    │       ↓
    │       ├─→ IF hasCodeBlocks: Split by ``` and apply code styling
    │       └─→ ELSE: Return plain text wrapper
    ↓
    └─→ Apply text color classes based on:
            - message.isLocal (user vs assistant)
            - Dark mode state (from theme context)
            - Message type (code, plain, error)
```

### Testing Architecture

```
Test Pyramid:
├── Unit Tests (Jest + RTL)
│   ├── formatMessageContent() function
│   ├── getEmotionalToneColor() function
│   └── Message rendering with various props
├── Integration Tests (Jest + RTL)
│   ├── Dark mode toggle behavior
│   ├── Message type switching
│   └── Accessibility compliance
└── E2E Tests (Playwright)
    ├── Visual regression screenshots
    ├── Real browser validation
    └── Cross-browser compatibility
```

---

## **R - Refinement**

### Implementation Plan

#### Phase 1: Fix Core Text Rendering (Priority: CRITICAL)
1. Update `formatMessageContent` function (Lines 234-249)
   - Add explicit text colors to code blocks
   - Add explicit text colors to plain text wrapper
   - Ensure proper cascade of colors

2. Update `getEmotionalToneColor` function (Lines 252-261)
   - Add dark mode variants for all colors
   - Use 400-series colors for dark mode
   - Maintain 600-series for light mode

#### Phase 2: Fix Message Bubble Colors (Priority: HIGH)
1. Update message content wrapper (Lines 384-389)
   - Change `dark:text-white` to `dark:text-gray-100`
   - Ensure consistency across all message types

2. Update message indicators (Lines 426-435)
   - Add dark mode variants to icon colors

#### Phase 3: TDD Test Implementation (Priority: HIGH)
1. Create test file: `AviChatInterface.dark-mode-contrast.test.tsx`
2. Implement contrast ratio tests
3. Implement accessibility tests
4. Run tests and verify 100% pass rate

#### Phase 4: Playwright Validation (Priority: HIGH)
1. Create test file: `avi-chat-dark-mode.spec.ts`
2. Implement screenshot tests
3. Implement real browser validation
4. Capture before/after screenshots

#### Phase 5: Regression Testing (Priority: CRITICAL)
1. Run all existing AVI DM tests
2. Verify no functionality breaks
3. Test light mode still works
4. Test all personality modes

### Edge Cases to Handle

1. **Mixed Content Messages**: Messages with both code and plain text
2. **Long Code Blocks**: Ensure horizontal scroll works with proper text color
3. **Nested Formatting**: Code within emotional tone indicators
4. **Dynamic Theme Switching**: Ensure colors update immediately when theme changes
5. **High Contrast Mode**: Support OS-level high contrast settings

### Performance Considerations

1. **No Additional Re-renders**: Color changes are CSS-only, no state updates needed
2. **Memoization**: `formatMessageContent` and `getEmotionalToneColor` already use `useCallback`
3. **CSS Optimization**: Use Tailwind's built-in dark mode (no runtime overhead)

### Accessibility Requirements

1. **WCAG AA Compliance**: All text must meet 4.5:1 contrast ratio
2. **Screen Reader Support**: Ensure color changes don't affect semantic HTML
3. **Keyboard Navigation**: No impact on keyboard accessibility
4. **Focus Indicators**: Ensure focus states remain visible

---

## **C - Code Implementation**

See implementation section below for actual code changes.

---

## Implementation Checklist

- [ ] Update `formatMessageContent` function
- [ ] Update `getEmotionalToneColor` function
- [ ] Update message content wrapper
- [ ] Update message indicators
- [ ] Write TDD tests
- [ ] Run Playwright tests
- [ ] Capture screenshots
- [ ] Run regression tests
- [ ] Validate in real browser
- [ ] Generate validation report

---

## Validation Requirements

### Test Coverage Requirements
- ✅ Unit test coverage: 100% for modified functions
- ✅ Integration test coverage: All message rendering paths
- ✅ E2E test coverage: All user interaction scenarios

### Screenshot Requirements
- ✅ Before/after comparison in dark mode
- ✅ Light mode verification (no regression)
- ✅ All personality modes in dark mode
- ✅ Code blocks in dark mode
- ✅ Emotional tone indicators in dark mode

### Real Browser Validation
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (if available)
- ✅ No console errors
- ✅ No visual artifacts
- ✅ Smooth theme transitions
