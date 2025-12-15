# Pseudocode Design: Avi Typing Indicator Container Full-Width Fix

**Date**: 2025-10-03
**SPARC Phase**: Pseudocode
**Implementation Strategy**: 3 Concurrent Agents (TDD Approach)

---

## Component 1: CSS Fix + Unit Tests (Agent 1)

### Task 1.1: Fix Container CSS Class

**File**: `frontend/src/components/EnhancedPostingInterface.tsx`
**Line**: 377

```pseudocode
FUNCTION fix_typing_indicator_container_width():
  LOCATE line 377 in EnhancedPostingInterface.tsx

  FIND:
    msg.sender === 'typing'
      ? 'bg-white text-gray-900 border border-gray-200 max-w-xs'

  REPLACE WITH:
    msg.sender === 'typing'
      ? 'bg-white text-gray-900 border border-gray-200 max-w-full'

  VERIFY:
    - Line contains 'max-w-full' instead of 'max-w-xs'
    - All other classes remain unchanged
    - No syntax errors introduced

  RETURN success
```

### Task 1.2: Create Unit Tests

**File**: `frontend/src/tests/components/EnhancedPostingInterface.test.tsx` (new or append)

```pseudocode
DESCRIBE "Typing Indicator Container Width":

  TEST "typing indicator message should have max-w-full class":
    // Arrange
    RENDER EnhancedPostingInterface component
    SWITCH to 'avi' tab

    // Act - Trigger typing indicator
    SIMULATE user input in message field
    TRIGGER typing state (mock chat history with typing message)

    // Assert
    FIND typing indicator message container
    GET className from container element
    ASSERT className CONTAINS 'max-w-full'
    ASSERT className DOES_NOT_CONTAIN 'max-w-xs'


  TEST "typing indicator message should NOT have max-w-xs class":
    // Arrange
    RENDER EnhancedPostingInterface component
    SWITCH to 'avi' tab

    // Act
    TRIGGER typing state

    // Assert
    FIND typing indicator message container
    GET className from container element
    ASSERT className DOES_NOT_CONTAIN 'max-w-xs'


  TEST "typing indicator and response messages should have matching width classes":
    // Arrange
    RENDER EnhancedPostingInterface component
    SWITCH to 'avi' tab

    // Act
    ADD typing message to chat history
    ADD avi response message to chat history

    // Assert
    FIND typing indicator container
    FIND avi response container

    GET typing_width_class = extract width class from typing container
    GET response_width_class = extract width class from response container

    ASSERT typing_width_class EQUALS response_width_class
    ASSERT typing_width_class EQUALS 'max-w-full'


  TEST "user messages should retain max-w-xs while typing indicator uses max-w-full":
    // Arrange
    RENDER EnhancedPostingInterface component
    SWITCH to 'avi' tab

    // Act
    ADD user message to chat history
    ADD typing message to chat history

    // Assert
    FIND user message container
    FIND typing indicator container

    GET user_width_class = extract width class from user container
    GET typing_width_class = extract width class from typing container

    ASSERT user_width_class EQUALS 'max-w-xs'
    ASSERT typing_width_class EQUALS 'max-w-full'


  TEST "container background and border should span full width":
    // Arrange
    RENDER EnhancedPostingInterface component
    SWITCH to 'avi' tab

    // Act
    TRIGGER typing state

    // Assert
    FIND typing indicator container
    GET computed_styles = getComputedStyle(container)

    ASSERT computed_styles.backgroundColor IS_DEFINED
    ASSERT computed_styles.borderWidth IS_DEFINED
    // Width validation will be done in integration/E2E tests
    // as jsdom doesn't compute actual layout widths

EXPECTED RESULTS:
  - 5 unit tests created
  - All 5 tests passing
  - No existing tests broken
  - Coverage for all container width scenarios
```

---

## Component 2: Integration Tests (Agent 2)

### Task 2.1: Create Integration Test Suite

**File**: `frontend/src/tests/integration/avi-typing-container-width.test.tsx` (new)

```pseudocode
IMPORT React, useState, useEffect, act, render, screen, waitFor, fireEvent
IMPORT EnhancedPostingInterface
IMPORT mock utilities for chat state

DESCRIBE "Avi Typing Indicator Container Width Integration":

  TEST "typing indicator container spans full available chat width":
    // Arrange
    RENDER EnhancedPostingInterface in container with known width
    SET container width = 600px
    SWITCH to 'avi' tab

    // Act
    TRIGGER typing indicator display
    WAIT for typing indicator to render

    // Assert
    FIND typing indicator container element
    FIND chat box container element

    GET typing_container_width = container.offsetWidth
    GET chat_box_width = chat_container.offsetWidth

    // Allow small margin for padding/border
    CALCULATE width_difference = abs(typing_container_width - chat_box_width)

    ASSERT width_difference < 50 (accounting for padding)
    ASSERT typing_container_width > 500 (significantly wider than max-w-xs 320px)


  TEST "no layout shift when response replaces typing indicator":
    // Arrange
    RENDER EnhancedPostingInterface
    SWITCH to 'avi' tab

    // Act - Show typing indicator
    TRIGGER typing indicator
    WAIT for render

    GET typing_container_bounds = typing_container.getBoundingClientRect()
    CAPTURE typing_container_width = typing_container_bounds.width

    // Replace typing indicator with response
    REPLACE typing message WITH avi response message
    WAIT for render

    GET response_container_bounds = response_container.getBoundingClientRect()
    CAPTURE response_container_width = response_container_bounds.width

    // Assert
    CALCULATE width_shift = abs(typing_container_width - response_container_width)
    ASSERT width_shift < 10 (minimal or no layout shift)


  TEST "multiple typing indicators maintain consistent full width":
    // Arrange
    RENDER EnhancedPostingInterface
    SWITCH to 'avi' tab

    // Act - Show typing indicator multiple times
    FOR i = 1 TO 3:
      TRIGGER typing indicator
      WAIT for render
      CAPTURE container_widths[i] = typing_container.offsetWidth
      CLEAR typing indicator

    // Assert
    FOR EACH width IN container_widths:
      ASSERT width > 500 (full width behavior)
      ASSERT width EQUALS container_widths[0] (consistent)


  TEST "typing indicator container width responds to viewport changes":
    // Arrange
    RENDER EnhancedPostingInterface in resizable container
    SWITCH to 'avi' tab

    // Act - Test multiple viewport sizes
    VIEWPORTS = [
      {width: 1920, height: 1080, name: 'desktop'},
      {width: 768, height: 1024, name: 'tablet'},
      {width: 375, height: 667, name: 'mobile'}
    ]

    FOR EACH viewport IN VIEWPORTS:
      RESIZE container to viewport.width
      TRIGGER typing indicator
      WAIT for render

      GET container_width = typing_container.offsetWidth
      GET available_width = chat_container.offsetWidth

      ASSERT container_width / available_width > 0.9 (at least 90% width)


  TEST "typing indicator with long activity text uses full container width":
    // Arrange
    RENDER EnhancedPostingInterface
    SWITCH to 'avi' tab

    // Act
    CREATE typing message WITH long_activity_text = "Reading package.json, analyzing dependencies, checking for updates, validating configuration..."
    TRIGGER typing indicator with long_activity_text
    WAIT for render

    // Assert
    FIND typing indicator container
    FIND activity text span inside container

    GET container_width = container.offsetWidth
    GET activity_span_width = activity_span.offsetWidth

    ASSERT container_width > 500 (full width)
    ASSERT activity_span_width < container_width (text fits or truncates within)

    // Verify no overflow
    GET computed_overflow = getComputedStyle(activity_span).overflow
    ASSERT computed_overflow EQUALS 'hidden'


  TEST "typing indicator container matches response container styling":
    // Arrange
    RENDER EnhancedPostingInterface
    SWITCH to 'avi' tab

    // Act
    ADD typing message to history
    ADD avi response message to history
    WAIT for render

    // Assert
    FIND typing_container
    FIND response_container

    GET typing_styles = getComputedStyle(typing_container)
    GET response_styles = getComputedStyle(response_container)

    ASSERT typing_styles.backgroundColor EQUALS response_styles.backgroundColor
    ASSERT typing_styles.borderWidth EQUALS response_styles.borderWidth
    ASSERT typing_styles.borderColor EQUALS response_styles.borderColor
    ASSERT typing_styles.borderRadius EQUALS response_styles.borderRadius
    // Max width behavior validated by other tests

EXPECTED RESULTS:
  - 6 integration tests created
  - All 6 tests passing
  - Real DOM measurements (not mocked)
  - Container width validated in realistic chat context
  - Duration: < 5 seconds
```

---

## Component 3: E2E Tests with Screenshots (Agent 3)

### Task 3.1: Create E2E Test Suite

**File**: `frontend/tests/e2e/core-features/avi-typing-container-width.spec.ts` (new)

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
  viewport_tests: {},
  width_measurements: [],
  screenshots: [],
  issues: [],
  overall_status: 'FAIL'
}

FUNCTION navigate_to_avi_chat(page):
  WAIT for page load (networkidle)
  WAIT 2000ms for app initialization

  FIND avi_tab = page.locator('[role="tab"]').filter({hasText: 'Avi DM'})
    OR page.getByText('Avi DM')

  WAIT for avi_tab to be visible (timeout: 15000ms)
  CLICK avi_tab
  WAIT 2000ms for tab content to load

  RETURN success

FUNCTION trigger_typing_indicator(page):
  FIND input = page.locator('form input, form textarea').first()
  WAIT for input to be visible (timeout: 15000ms)

  FILL input WITH 'test message for typing indicator'
  PRESS Enter

  FIND typing_indicator = page.locator('.avi-wave-text-inline').first()
  WAIT for typing_indicator to be visible (timeout: 10000ms)
  WAIT 1000ms for indicator to stabilize

  RETURN typing_indicator

FUNCTION measure_container_width(page, viewport_name):
  FIND typing_message_container = page.locator('.avi-wave-text-inline')
    .locator('xpath=ancestor::div[contains(@class, "p-3")]')
    .first()

  FIND chat_container = page.locator('div.space-y-3').first()

  GET container_width = EVALUATE(typing_message_container, el => el.offsetWidth)
  GET chat_width = EVALUATE(chat_container, el => el.offsetWidth)

  CALCULATE difference = abs(container_width - chat_width)
  CALCULATE percentage = (container_width / chat_width) * 100

  CREATE measurement = {
    viewport: viewport_name,
    typing_container_width: container_width,
    chat_width: chat_width,
    difference: difference,
    percentage: percentage,
    pass: difference < 50  // Allow small margin for padding
  }

  LOG measurement details
  ADD measurement TO test_results.width_measurements

  RETURN measurement

FUNCTION capture_screenshot(page, name):
  CREATE screenshot_dir = 'test-results/avi-typing-container-screenshots'
  ENSURE directory exists

  CREATE screenshot_path = screenshot_dir + '/' + name + '.png'
  CAPTURE page.screenshot({path: screenshot_path, fullPage: false})

  ADD screenshot_path TO test_results.screenshots
  LOG screenshot captured

  RETURN screenshot_path

DESCRIBE "Avi Typing Indicator Container Width E2E":

  BEFORE_EACH(page):
    NAVIGATE to FRONTEND_URL

  TEST "Desktop (1920x1080) - Full width typing container":
    SET timeout = 90000ms

    TRY:
      LOG 'Testing desktop viewport...'

      // Arrange
      SET viewport to 1920x1080
      WAIT 1000ms

      // Act
      CALL navigate_to_avi_chat(page)
      CALL trigger_typing_indicator(page)

      // Capture screenshot
      CALL capture_screenshot(page, '1-typing-container-desktop')

      // Measure width
      measurement = CALL measure_container_width(page, 'desktop')

      // Assert
      IF measurement.pass:
        test_results.viewport_tests.desktop = 'PASS'
      ELSE:
        ADD ISSUE: "Desktop: Container width differs from chat width"
        test_results.viewport_tests.desktop = 'FAIL'

    CATCH error:
      ADD ISSUE: "Desktop test failed: " + error
      CAPTURE screenshot(page, '1-desktop-error')
      test_results.viewport_tests.desktop = 'FAIL'


  TEST "Mobile (375x667) - Full width typing container":
    SET timeout = 90000ms

    TRY:
      LOG 'Testing mobile viewport...'

      // Arrange
      SET viewport to 375x667
      WAIT 1000ms

      // Act
      CALL navigate_to_avi_chat(page)
      CALL trigger_typing_indicator(page)

      // Capture screenshot
      CALL capture_screenshot(page, '2-typing-container-mobile')

      // Measure width
      measurement = CALL measure_container_width(page, 'mobile')

      // Assert
      IF measurement.pass:
        test_results.viewport_tests.mobile = 'PASS'
      ELSE:
        ADD ISSUE: "Mobile: Container width differs from chat width"
        test_results.viewport_tests.mobile = 'FAIL'

    CATCH error:
      ADD ISSUE: "Mobile test failed: " + error
      CAPTURE screenshot(page, '2-mobile-error')
      test_results.viewport_tests.mobile = 'FAIL'


  TEST "Tablet (768x1024) - Full width typing container":
    SET timeout = 90000ms

    TRY:
      LOG 'Testing tablet viewport...'

      // Arrange
      SET viewport to 768x1024
      WAIT 1000ms

      // Act
      CALL navigate_to_avi_chat(page)
      CALL trigger_typing_indicator(page)

      // Capture screenshot
      CALL capture_screenshot(page, '3-typing-container-tablet')

      // Measure width
      measurement = CALL measure_container_width(page, 'tablet')

      // Assert
      IF measurement.pass:
        test_results.viewport_tests.tablet = 'PASS'
      ELSE:
        ADD ISSUE: "Tablet: Container width differs from chat width"
        test_results.viewport_tests.tablet = 'FAIL'

    CATCH error:
      ADD ISSUE: "Tablet test failed: " + error
      CAPTURE screenshot(page, '3-tablet-error')
      test_results.viewport_tests.tablet = 'FAIL'


  TEST "No layout shift - Typing to Response transition":
    SET timeout = 90000ms

    TRY:
      LOG 'Testing layout shift...'

      // Arrange
      SET viewport to desktop
      CALL navigate_to_avi_chat(page)

      // Act - Capture typing indicator width
      CALL trigger_typing_indicator(page)
      typing_bounds = GET typing_container.getBoundingClientRect()
      typing_width = typing_bounds.width

      CAPTURE screenshot(page, '4-before-response')

      // Wait for response (or mock response)
      WAIT for response message OR timeout 15000ms

      // If response appears, measure its width
      IF response_message exists:
        response_bounds = GET response_container.getBoundingClientRect()
        response_width = response_bounds.width

        CAPTURE screenshot(page, '4-after-response')

        // Assert minimal layout shift
        width_shift = abs(typing_width - response_width)

        IF width_shift < 20:
          test_results.layout_shift = 'PASS'
          LOG 'No layout shift detected'
        ELSE:
          ADD ISSUE: "Layout shift detected: " + width_shift + "px"
          test_results.layout_shift = 'FAIL'
      ELSE:
        // If no response, at least verify typing was full width
        ASSERT typing_width > 500
        test_results.layout_shift = 'PASS (typing only)'

    CATCH error:
      ADD ISSUE: "Layout shift test failed: " + error
      test_results.layout_shift = 'FAIL'


  TEST "No horizontal scroll on any viewport":
    SET timeout = 120000ms

    TRY:
      LOG 'Testing horizontal scroll...'

      has_scroll_issue = FALSE

      FOR EACH viewport IN VIEWPORTS:
        LOG 'Testing ' + viewport.name

        SET viewport size
        WAIT 1000ms

        CALL navigate_to_avi_chat(page)
        CALL trigger_typing_indicator(page)

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
        test_results.no_horizontal_scroll = 'FAIL'
      ELSE:
        test_results.no_horizontal_scroll = 'PASS'

    CATCH error:
      ADD ISSUE: "Horizontal scroll test failed: " + error
      test_results.no_horizontal_scroll = 'FAIL'


  AFTER_ALL:
    // Generate reports
    DETERMINE overall_status:
      IF all viewport tests PASS AND layout_shift PASS AND no_horizontal_scroll PASS:
        test_results.overall_status = 'PASS'
      ELSE:
        test_results.overall_status = 'FAIL'

    WRITE JSON report to 'test-results/avi-typing-container-report.json'
    WRITE Markdown report to 'test-results/avi-typing-container-report.md'

    LOG test summary
    LOG width measurements
    LOG screenshots captured
    LOG issues found
    LOG overall status

EXPECTED RESULTS:
  - 5 E2E tests created
  - Desktop: ~100% width (difference < 50px)
  - Mobile: ~100% width (difference < 50px)
  - Tablet: ~100% width (difference < 50px)
  - Layout shift < 20px
  - No horizontal scroll on any viewport
  - 5+ screenshots captured
  - JSON and Markdown reports generated
```

---

## Validation Checklist

### Agent 1 Success Criteria
- [ ] Line 377 changed from `max-w-xs` to `max-w-full`
- [ ] 5 unit tests created and passing
- [ ] No existing tests broken
- [ ] No console errors

### Agent 2 Success Criteria
- [ ] 6 integration tests created and passing
- [ ] Container width validated in real DOM
- [ ] Layout shift validated
- [ ] Viewport responsiveness tested
- [ ] Test duration < 10 seconds

### Agent 3 Success Criteria
- [ ] 5 E2E tests created
- [ ] Width measurements on 3 viewports (desktop, tablet, mobile)
- [ ] All measurements show ~100% width (difference < 50px)
- [ ] 5+ screenshots captured
- [ ] JSON and Markdown reports generated
- [ ] No horizontal scroll detected

### Overall Success Criteria
- [ ] All 16 tests passing (5 unit + 6 integration + 5 E2E)
- [ ] Container spans full width on all viewports
- [ ] No layout shift observed
- [ ] Visual validation complete with screenshots
- [ ] No regressions in existing functionality
- [ ] 100% real functionality (no mocks for final validation)

---

**SPARC Phase**: Pseudocode ✅
**Next Phase**: Implementation (3 Concurrent Agents)
**Ready for**: Agent Launch
