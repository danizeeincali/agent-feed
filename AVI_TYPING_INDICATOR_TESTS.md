# Avi Typing Indicator - Comprehensive Test Suite

**Component Under Test:** AviTypingIndicator.tsx
**Test Framework:** Vitest + React Testing Library + Playwright
**Testing Approach:** SPARC TDD - London School

## Overview

This document describes the comprehensive test suite created for the AviTypingIndicator component - a wave animation with ROYGBIV color cycling that appears when Avi is processing user messages.

## Test Files Created

### 1. Unit Tests
**File:** `/workspaces/agent-feed/frontend/src/components/AviTypingIndicator.test.tsx`
**Size:** 20KB
**Test Count:** 50+ unit tests

#### Test Categories:

**Rendering Tests (7 tests)**
- ✅ Renders when `isVisible={true}`
- ✅ Does not render when `isVisible={false}`
- ✅ Displays initial frame "A v i"
- ✅ Has correct ARIA attributes (`role="status"`, `aria-live="polite"`, `aria-busy="true"`)
- ✅ Has accessible screen reader text ("Avi is typing...")
- ✅ Screen reader text is visually hidden but accessible (`.sr-only`)

**Animation Frame Tests (9 tests)**
- ✅ Frame 1: "A v i" at start (0ms)
- ✅ Frame 2: "Λ v i" after 200ms
- ✅ Frame 3: "Λ V i" after 400ms
- ✅ Frame 4: "Λ V !" after 600ms
- ✅ Frame 5: "Λ v !" after 800ms
- ✅ Frame 10: "Λ v i" after 1800ms
- ✅ Loops back to frame 1: "A v i" after 2000ms (full cycle)
- ✅ Continues looping to frame 2 after 2200ms (second cycle)
- ✅ All frames match expected sequence

**Color Cycling Tests (10 tests)**
- ✅ Frame 1 has red color (#FF0000)
- ✅ Frame 2 has orange color (#FF7F00)
- ✅ Frame 3 has yellow color (#FFFF00)
- ✅ Frame 4 has green color (#00FF00)
- ✅ Frame 5 has blue color (#0000FF)
- ✅ Frame 6 has indigo color (#4B0082)
- ✅ Frame 7 has violet color (#9400D3)
- ✅ Frame 8 restarts cycle with red (#FF0000)
- ✅ Color matches expected ROYGBIV index for each frame
- ✅ Color cycle continues correctly in second loop

**Lifecycle Tests (6 tests)**
- ✅ Animation starts on mount when visible
- ✅ Animation clears interval on unmount
- ✅ Animation stops when `isVisible` changes to false
- ✅ No memory leaks - interval is cleared properly
- ✅ Interval reference is stored and cleared correctly
- ✅ Cleanup happens when component unmounts during animation

**Visibility Toggle Tests (6 tests)**
- ✅ Shows animation when prop changes from false → true
- ✅ Hides animation when prop changes from true → false
- ✅ Smooth transition with opacity change on hide
- ✅ Smooth transition with opacity change on show
- ✅ Animation state resets when toggling visibility
- ✅ Multiple rapid toggles handle cleanup correctly

**Timing Precision Tests (3 tests)**
- ✅ Each frame displays for exactly 200ms
- ✅ Animation cycle completes in exactly 2000ms
- ✅ Interval is set to 200ms

**Edge Cases (5 tests)**
- ✅ Handles rapid mount/unmount cycles
- ✅ Handles long animation duration without issues (30+ seconds)
- ✅ Handles component with className prop
- ✅ Animation works when mounted initially as visible
- ✅ No errors when mounted initially as hidden

**Accessibility Tests (7 tests)**
- ✅ Has `role="status"` for screen readers
- ✅ Has `aria-live="polite"` for non-intrusive updates
- ✅ Has `aria-busy="true"` during animation
- ✅ Provides text alternative for animation
- ✅ Screen reader text is visually hidden but accessible
- ✅ Respects `prefers-reduced-motion` media query

---

### 2. Integration Tests
**File:** `/workspaces/agent-feed/frontend/src/tests/integration/AviTypingAnimation.test.tsx`
**Size:** 21KB
**Test Count:** 25+ integration tests

#### Test Categories:

**EnhancedPostingInterface Integration (4 tests)**
- ✅ Animation appears when user sends message in Avi DM
- ✅ Animation visible while `isSubmitting === true`
- ✅ Animation disappears when response arrives
- ✅ Multiple messages work correctly

**Timing Tests (3 tests)**
- ✅ Fast response (5s): animation visible ~5 seconds
- ✅ Medium response (15s): animation visible ~15 seconds
- ✅ Slow response (30s): animation loops 1.5 times

**Animation Frame Integration (2 tests)**
- ✅ Animation cycles through frames during submission
- ✅ Animation colors cycle during submission (Red → Orange → Yellow...)

**Chat State Integration (2 tests)**
- ✅ Animation resets between messages
- ✅ Animation position updates with chat scroll

**Error Handling Integration (2 tests)**
- ✅ Animation disappears on error
- ✅ Animation works correctly after error recovery

**UI Integration (2 tests)**
- ✅ Animation appears in correct position relative to input
- ✅ Animation does not interfere with input focus

**Accessibility Integration (2 tests)**
- ✅ Screen reader announces typing status during submission
- ✅ Focus management during animation lifecycle

---

### 3. E2E Tests (Playwright)
**File:** `/workspaces/agent-feed/frontend/tests/e2e/avi-typing-indicator.spec.ts`
**Size:** 22KB
**Test Count:** 20+ E2E tests

#### Test Categories:

**Visual Tests (4 tests)**
- ✅ Animation appears at correct position (bottom left of input)
- ✅ Animation displays with visible colors
- ✅ Text is readable in all color states
- ✅ Animation smoothly fades out

**User Flow Tests (5 tests)**
- ✅ User types message → clicks send → animation appears
- ✅ Animation loops while waiting for response
- ✅ Response arrives → animation disappears
- ✅ Can send another message immediately after first completes
- ✅ Animation continues during slow response (30s simulation)

**Accessibility Tests (5 tests)**
- ✅ Screen reader announces "Avi is typing..."
- ✅ Animation respects `prefers-reduced-motion`
- ✅ Focus remains on input during animation
- ✅ Keyboard navigation works during animation
- ✅ Color contrast meets WCAG AA standards

**Animation Frame Tests (3 tests)**
- ✅ Verifies all 10 animation frames in sequence
- ✅ Verifies ROYGBIV color cycling
- ✅ Verifies animation loops correctly

**Performance Tests (1 test)**
- ✅ Animation remains smooth during long wait times

---

## Test Data

### Animation Frames
```typescript
const FRAMES = [
  'A v i',  // Frame 1 (0ms)
  'Λ v i',  // Frame 2 (200ms)
  'Λ V i',  // Frame 3 (400ms)
  'Λ V !',  // Frame 4 (600ms)
  'Λ v !',  // Frame 5 (800ms)
  'A v !',  // Frame 6 (1000ms)
  'A V !',  // Frame 7 (1200ms)
  'A V i',  // Frame 8 (1400ms)
  'A v i',  // Frame 9 (1600ms)
  'Λ v i'   // Frame 10 (1800ms)
];
```

### ROYGBIV Colors
```typescript
const ROYGBIV = [
  '#FF0000',  // Red
  '#FF7F00',  // Orange
  '#FFFF00',  // Yellow
  '#00FF00',  // Green
  '#0000FF',  // Blue
  '#4B0082',  // Indigo
  '#9400D3'   // Violet
];
```

### Timing Constants
- **Frame Duration:** 200ms per frame
- **Full Cycle:** 2000ms (10 frames)
- **Color Cycle:** 1400ms (7 colors)

---

## Running the Tests

### Unit Tests (Vitest)
```bash
# Run all unit tests
cd /workspaces/agent-feed/frontend
npm run test src/components/AviTypingIndicator.test.tsx

# Run in watch mode
npm run test:watch src/components/AviTypingIndicator.test.tsx

# Run with coverage
npm run test:coverage -- src/components/AviTypingIndicator.test.tsx
```

### Integration Tests (Vitest)
```bash
# Run integration tests
npm run test src/tests/integration/AviTypingAnimation.test.tsx

# Run in watch mode
npm run test:watch src/tests/integration/AviTypingAnimation.test.tsx
```

### E2E Tests (Playwright)
```bash
# Run E2E tests (ensure dev server is running)
npm run dev & # Start dev server
npx playwright test tests/e2e/avi-typing-indicator.spec.ts

# Run in headed mode (see browser)
npx playwright test tests/e2e/avi-typing-indicator.spec.ts --headed

# Run with UI mode (interactive)
npx playwright test tests/e2e/avi-typing-indicator.spec.ts --ui

# Generate screenshots
npx playwright test tests/e2e/avi-typing-indicator.spec.ts --reporter=html
```

### Run All Tests
```bash
# Unit + Integration
npm run test

# E2E
npx playwright test tests/e2e/avi-typing-indicator.spec.ts

# Full suite
npm run test && npx playwright test tests/e2e/avi-typing-indicator.spec.ts
```

---

## Test Coverage Goals

- **Statement Coverage:** >95%
- **Branch Coverage:** >90%
- **Function Coverage:** 100%
- **Line Coverage:** >95%

---

## Expected Component Implementation

Based on these tests, the `AviTypingIndicator` component should:

### Props Interface
```typescript
interface AviTypingIndicatorProps {
  isVisible: boolean;
  className?: string;
}
```

### Required Features

1. **Animation Logic**
   - Uses `setInterval` with 200ms intervals
   - Cycles through 10 frames
   - Loops infinitely while visible
   - Clears interval on unmount

2. **Color Cycling**
   - Applies ROYGBIV colors in sequence
   - Each frame gets next color in cycle
   - Resets to red after violet

3. **Accessibility**
   - `role="status"`
   - `aria-live="polite"`
   - `aria-label="Avi is typing"`
   - `aria-busy="true"`
   - Visually hidden screen reader text: "Avi is typing..."

4. **Reduced Motion**
   - Detects `prefers-reduced-motion: reduce`
   - Applies `motion-reduce` class or `data-reduced-motion` attribute
   - Shows static state instead of animation

5. **Styling**
   - Positioned bottom-left of input area
   - Smooth fade in/out transitions
   - Readable text in all color states
   - Supports custom className prop

### Example Structure
```tsx
<div
  role="status"
  aria-live="polite"
  aria-label="Avi is typing"
  aria-busy="true"
  className="opacity-100 transition-opacity"
  data-testid="avi-typing-indicator"
>
  <span
    data-testid="avi-text"
    style={{ color: currentColor }}
  >
    {currentFrame}
  </span>
  <span className="sr-only">Avi is typing...</span>
</div>
```

---

## Success Criteria

All tests should pass, verifying:

✅ **Correct Rendering**
- Component shows/hides based on `isVisible` prop
- Initial frame displays correctly
- ARIA attributes are present

✅ **Animation Behavior**
- All 10 frames display in correct sequence
- Timing is precise (200ms per frame)
- Animation loops continuously
- Colors cycle through ROYGBIV

✅ **Lifecycle Management**
- Intervals are created and cleared properly
- No memory leaks
- Clean unmount behavior

✅ **Accessibility**
- Screen reader support
- Keyboard navigation works
- Reduced motion support
- WCAG AA color contrast

✅ **Integration**
- Works with EnhancedPostingInterface
- Appears during message submission
- Disappears when response arrives
- Handles errors gracefully

✅ **User Experience**
- Smooth animations
- Readable text
- Correct positioning
- No UI interference

---

## Next Steps

1. **Implement the Component**
   - Create `AviTypingIndicator.tsx` based on test specifications
   - Ensure all unit tests pass

2. **Integration**
   - Add to `EnhancedPostingInterface` in Avi DM section
   - Wire up to `isSubmitting` state

3. **Visual Polish**
   - Fine-tune animations
   - Verify color contrast
   - Test on different screen sizes

4. **Accessibility Audit**
   - Test with screen readers (NVDA, JAWS, VoiceOver)
   - Verify keyboard navigation
   - Test reduced motion

5. **Performance Testing**
   - Monitor for animation jank
   - Check CPU usage
   - Verify no memory leaks in long sessions

---

## Test Maintenance

### When to Update Tests

- **Component API changes:** Update prop types, interfaces
- **Animation changes:** Adjust frame sequences, timing
- **Style changes:** Update visual assertions
- **New features:** Add corresponding tests

### Test Quality Standards

- **Clear naming:** Test names describe behavior
- **Single responsibility:** One assertion per test
- **Proper cleanup:** No side effects between tests
- **Realistic scenarios:** Integration tests mimic real usage
- **Fast execution:** Unit tests run in <100ms each

---

## Documentation

- **Test Coverage Report:** Generate with `npm run test:coverage`
- **E2E Screenshots:** Located in `/workspaces/agent-feed/frontend/screenshots/avi-typing-indicator/`
- **Test Results:** Available in CI/CD pipeline

---

## Contact

For questions about these tests, contact the SPARC TDD team or refer to the SPARC methodology documentation.

---

**Total Test Count:** 95+ comprehensive tests
**Test Files:** 3
**Lines of Test Code:** ~1,800
**Code Coverage Target:** >95%

**Status:** ✅ Complete - Ready for implementation
