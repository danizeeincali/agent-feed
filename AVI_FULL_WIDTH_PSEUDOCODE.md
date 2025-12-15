# Full-Width Avi Activity Indicator - Pseudocode Design

## Component 1: AviTypingIndicator Layout Fix

### Location: `/workspaces/agent-feed/frontend/src/components/AviTypingIndicator.tsx` (lines 89-104)

```typescript
/**
 * Modify inline rendering to use full width
 * CHANGE: display from inline-flex to flex, add width: 100%
 */
FUNCTION renderInlineIndicator()
  IF inline:
    RETURN (
      <span className={`avi-wave-text-inline ${className}`}
            style={{
              display: 'flex',           // ← CHANGED from 'inline-flex'
              width: '100%',             // ← NEW: Full width
              alignItems: 'center',
              gap: '0.25rem',
              ...style
            }}>

        // Animation frame (unchanged)
        <span style={{
          color: currentColor,
          fontWeight: 600,
          fontSize: '1rem',
          fontFamily: 'monospace',
          letterSpacing: '0.1em',
          minWidth: '3ch'
        }}>
          {currentFrame}
        </span>

        // Activity text (unchanged)
        {activityText && activityText.trim() && (
          <span style={{
            color: '#D1D5DB',
            fontWeight: 400,
            fontSize: '0.85rem',
            marginLeft: '0.5rem',
            whiteSpace: 'nowrap',      // Prevent wrapping
            overflow: 'hidden',         // Hide overflow
            textOverflow: 'ellipsis'   // Show ... for long text
          }}>
            - {truncateActivity(activityText)}
          </span>
        )}
      </span>
    )
END FUNCTION
```

## Component 2: Message Container Verification

### Location: `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`

```typescript
/**
 * Verify message container doesn't constrain indicator width
 * Check: Message wrapper should allow child to expand
 */
FUNCTION renderTypingIndicator(indicator)
  // Locate where typing indicator is rendered
  // Ensure parent container has no max-width constraint

  RETURN (
    <div className="message-container"
         style={{
           width: '100%',              // Ensure full width available
           maxWidth: '100%',           // No constraint
           padding: '0.5rem 1rem',     // Consistent padding
           boxSizing: 'border-box'     // Include padding in width
         }}>
      {indicator.content}              // AviTypingIndicator rendered here
    </div>
  )
END FUNCTION
```

## Component 3: Unit Tests

### Location: `/workspaces/agent-feed/frontend/src/tests/components/AviTypingIndicator.test.tsx` (NEW TESTS)

```typescript
DESCRIBE 'AviTypingIndicator - Full Width Layout'

  TEST 'should render with display flex in inline mode':
    component = render(
      <AviTypingIndicator
        isVisible={true}
        inline={true}
        activityText="Test activity"
      />
    )

    indicator = component.getByText(/Av/)
    parentSpan = indicator.closest('span')

    // Verify display is flex (not inline-flex)
    EXPECT parentSpan.style.display === 'flex'

  TEST 'should render with 100% width in inline mode':
    component = render(
      <AviTypingIndicator
        isVisible={true}
        inline={true}
        activityText="Test activity"
      />
    )

    indicator = component.getByText(/Av/)
    parentSpan = indicator.closest('span')

    // Verify full width
    EXPECT parentSpan.style.width === '100%'

  TEST 'should maintain alignment with flex layout':
    component = render(
      <AviTypingIndicator
        isVisible={true}
        inline={true}
        activityText="Test activity"
      />
    )

    indicator = component.getByText(/Av/)
    parentSpan = indicator.closest('span')

    // Verify alignment
    EXPECT parentSpan.style.alignItems === 'center'

  TEST 'should not wrap activity text':
    longActivity = 'This is a very long activity message that should not wrap to next line'

    component = render(
      <AviTypingIndicator
        isVisible={true}
        inline={true}
        activityText={longActivity}
      />
    )

    activitySpan = component.getByText(/This is a very long/)

    // Verify no-wrap styles
    EXPECT activitySpan.style.whiteSpace === 'nowrap'
    EXPECT activitySpan.style.overflow === 'hidden'
    EXPECT activitySpan.style.textOverflow === 'ellipsis'

  TEST 'should truncate at 80 characters with ellipsis':
    longActivity = 'A'.repeat(100)

    component = render(
      <AviTypingIndicator
        isVisible={true}
        inline={true}
        activityText={longActivity}
      />
    )

    activityText = component.container.textContent

    // Should be truncated to 80 + '...' (3 chars) = 83 chars max
    EXPECT activityText.length <= 90  // Account for animation + separator
    EXPECT activityText.includes('...')

END DESCRIBE
```

## Component 4: Integration Tests

### Location: `/workspaces/agent-feed/frontend/src/tests/integration/avi-full-width.test.tsx` (NEW FILE)

```typescript
DESCRIBE 'Avi Activity Indicator - Full Width Integration'

  TEST 'should span full width in message list':
    // Render EnhancedPostingInterface with typing indicator
    component = render(<EnhancedPostingInterface />)

    // Trigger typing indicator
    component.setIsSubmitting(true)
    component.setCurrentActivity('Read(package.json)')

    // Wait for indicator to appear
    await waitFor(() => {
      indicator = component.getByText(/Av/)
      EXPECT indicator TO_BE_VISIBLE
    })

    // Get parent container
    indicatorElement = component.getByText(/Av/).closest('span')
    messageContainer = indicatorElement.closest('.message-container')

    // Calculate widths
    indicatorWidth = indicatorElement.offsetWidth
    containerWidth = messageContainer.offsetWidth

    // Indicator should be close to container width (within 20px for padding)
    widthDifference = Math.abs(indicatorWidth - containerWidth)
    EXPECT widthDifference < 50  // Allow for padding/margin

  TEST 'should not overflow container':
    component = render(<EnhancedPostingInterface />)

    component.setIsSubmitting(true)
    component.setCurrentActivity('A'.repeat(200))  // Very long text

    await waitFor(() => {
      indicator = component.getByText(/Av/)
      EXPECT indicator TO_BE_VISIBLE
    })

    indicatorElement = component.getByText(/Av/).closest('span')
    messageContainer = indicatorElement.closest('.message-container')

    // Indicator should not exceed container
    EXPECT indicatorElement.offsetWidth <= messageContainer.offsetWidth

  TEST 'should update activity text without layout shift':
    component = render(<EnhancedPostingInterface />)

    component.setIsSubmitting(true)
    component.setCurrentActivity('Short')

    await waitFor(() => {
      indicator = component.getByText(/Av/)
      EXPECT indicator TO_BE_VISIBLE
    })

    indicatorElement = component.getByText(/Av/).closest('span')
    initialWidth = indicatorElement.offsetWidth

    // Update to longer text
    component.setCurrentActivity('Much longer activity message here')

    await waitFor(() => {
      updatedText = component.getByText(/Much longer/)
      EXPECT updatedText TO_BE_VISIBLE
    })

    updatedWidth = indicatorElement.offsetWidth

    // Width should remain the same (100% of container)
    EXPECT initialWidth === updatedWidth

END DESCRIBE
```

## Component 5: E2E Playwright Tests with Screenshots

### Location: `/workspaces/agent-feed/frontend/tests/e2e/core-features/avi-full-width.spec.ts` (NEW FILE)

```typescript
DESCRIBE 'Avi Activity Indicator - Full Width E2E'

  TEST 'should display full-width indicator with before/after comparison':

    STEP 1: Navigate to feed
      GOTO 'http://localhost:5174/feed'
      WAIT_FOR page loaded

    STEP 2: Open Avi DM tab
      CLICK 'Avi DM' tab
      WAIT_FOR input field visible

    STEP 3: Capture BEFORE screenshot (if old version exists)
      // This step only works if comparing versions
      // Skip if first implementation

    STEP 4: Send message to trigger typing indicator
      TYPE 'read package.json'
      CLICK 'Send' button

      WAIT_FOR typing indicator visible
      WAIT 500ms  // Let animation settle

    STEP 5: Capture full-width indicator screenshot
      SCREENSHOT 'avi-full-width-1-desktop.png' {
        fullPage: false,
        clip: {
          selector: '.typing-indicator-container'  // Or appropriate selector
        }
      }

      // Verify indicator is visible
      indicator = page.locator('text=/Av.*-/')
      EXPECT indicator TO_BE_VISIBLE

    STEP 6: Measure indicator width vs container width
      indicatorWidth = await indicator.evaluate(el => el.offsetWidth)

      container = page.locator('.message-container').last()
      containerWidth = await container.evaluate(el => el.offsetWidth)

      // Indicator should be close to full width (within 50px for padding)
      widthDifference = Math.abs(indicatorWidth - containerWidth)
      EXPECT widthDifference < 50

      console.log(`Indicator width: ${indicatorWidth}px`)
      console.log(`Container width: ${containerWidth}px`)
      console.log(`Difference: ${widthDifference}px`)

    STEP 7: Test on mobile viewport
      page.setViewportSize({ width: 375, height: 667 })  // iPhone SE
      WAIT 500ms

      SCREENSHOT 'avi-full-width-2-mobile.png'

      // Re-measure on mobile
      indicatorWidthMobile = await indicator.evaluate(el => el.offsetWidth)
      containerWidthMobile = await container.evaluate(el => el.offsetWidth)

      widthDifferenceMobile = Math.abs(indicatorWidthMobile - containerWidthMobile)
      EXPECT widthDifferenceMobile < 30  // Tighter on mobile

    STEP 8: Test on tablet viewport
      page.setViewportSize({ width: 768, height: 1024 })  // iPad
      WAIT 500ms

      SCREENSHOT 'avi-full-width-3-tablet.png'

    STEP 9: Verify long activity text handling
      // Send another message with longer activity
      TYPE 'use Read to check the package.json file and tell me all dependencies'
      CLICK 'Send'

      WAIT_FOR text matching /Read\(package\.json/

      SCREENSHOT 'avi-full-width-4-long-text.png'

      // Verify text is truncated with ellipsis
      activityText = await page.locator('span:has-text("- ")').textContent()
      EXPECT activityText.length <= 85  // 80 chars + "- " + "..."

    STEP 10: Verify no horizontal scroll
      // Check page doesn't have horizontal scrollbar
      hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      EXPECT hasHorizontalScroll === false

    STEP 11: Verify no console errors
      errors = getConsoleErrors()
      EXPECT errors.length === 0

      IF errors.length > 0:
        console.error('Console errors found:', errors)
        FAIL test

END DESCRIBE
```

## Component 6: Visual Regression Comparison

### Location: `/workspaces/agent-feed/frontend/tests/visual/compare-widths.js` (NEW SCRIPT)

```javascript
/**
 * Visual regression script to compare before/after widths
 */
ASYNC FUNCTION compareIndicatorWidths()

  STEP 1: Load before screenshot (if exists)
    beforeImage = await loadImage('avi-full-width-before.png')
    IF NOT beforeImage:
      console.log('No before image - skipping comparison')
      RETURN

  STEP 2: Load after screenshot
    afterImage = await loadImage('avi-full-width-1-desktop.png')

  STEP 3: Compare dimensions
    beforeWidth = beforeImage.width
    afterWidth = afterImage.width

    console.log('Width comparison:')
    console.log(`  Before: ${beforeWidth}px`)
    console.log(`  After: ${afterWidth}px`)
    console.log(`  Increase: ${afterWidth - beforeWidth}px`)

  STEP 4: Visual diff
    diff = pixelmatch(beforeImage.data, afterImage.data, null,
                      beforeWidth, beforeImage.height)

    diffPercentage = (diff / (beforeWidth * beforeImage.height)) * 100

    console.log(`  Pixel difference: ${diffPercentage.toFixed(2)}%`)

  STEP 5: Verify improvement
    // After should be wider (unless already full-width)
    IF afterWidth > beforeWidth:
      console.log('✅ Indicator is now wider')
    ELSE IF afterWidth === beforeWidth:
      console.log('⚠️ Width unchanged (may already be full-width)')
    ELSE:
      console.log('❌ Indicator is narrower - regression!')

END FUNCTION
```

## Component 7: Rollback Safety Check

### Location: Inline validation during implementation

```typescript
/**
 * Before committing changes, verify no layout breaks
 */
FUNCTION validateLayoutSafety()

  checks = [
    {
      name: 'Indicator renders',
      test: () => component.getByText(/Av/) !== null
    },
    {
      name: 'Activity text visible',
      test: () => component.getByText(/- /) !== null
    },
    {
      name: 'No horizontal overflow',
      test: () => !hasHorizontalScroll()
    },
    {
      name: 'Animation continues',
      test: async () => {
        frame1 = component.getByText(/Av/).textContent
        await wait(200)
        frame2 = component.getByText(/Av/).textContent
        return frame1 !== frame2  // Animation changed
      }
    },
    {
      name: 'Other messages unaffected',
      test: () => {
        messages = component.getAllByRole('article')
        return messages.length > 0  // Messages still render
      }
    }
  ]

  failedChecks = []
  FOR EACH check IN checks:
    TRY:
      result = await check.test()
      IF NOT result:
        failedChecks.push(check.name)
    CATCH error:
      failedChecks.push(`${check.name}: ${error.message}`)

  IF failedChecks.length > 0:
    console.error('❌ Layout validation failed:')
    failedChecks.forEach(f => console.error(`  - ${f}`))
    RETURN false

  console.log('✅ All layout safety checks passed')
  RETURN true

END FUNCTION
```

## Summary of Changes

### Files to Modify
1. **AviTypingIndicator.tsx** (lines 89-104):
   - Change `display: 'inline-flex'` → `display: 'flex'`
   - Add `width: '100%'`
   - Add `whiteSpace: 'nowrap'`, `overflow: 'hidden'`, `textOverflow: 'ellipsis'` to activity text span

### New Test Files
1. **AviTypingIndicator.test.tsx** - Add 5 new unit tests
2. **avi-full-width.test.tsx** - Add 3 integration tests
3. **avi-full-width.spec.ts** - Add 1 E2E test with 4 screenshots
4. **compare-widths.js** - Visual regression comparison

### Total Tests: 9 new tests
- Unit: 5 tests
- Integration: 3 tests
- E2E: 1 comprehensive test with visual validation
