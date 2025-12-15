# E2E Visual Validation: Onboarding Bridge Removal

## Overview

This test suite provides comprehensive visual validation that the onboarding bridge has been successfully removed from the application UI.

## Test Files

- **Main Test Suite**: `onboarding-removed-validation.spec.ts`
- **Screenshots Directory**: `/workspaces/agent-feed/docs/screenshots/onboarding-fix/`

## Test Coverage

### Core Tests (5)

1. **Test 1: Page loads without onboarding bridge**
   - Validates absence of "Welcome", "Meet our agents", and "Priority 2" content
   - Screenshot: `bridge-no-onboarding.png`

2. **Test 2: Bridge shows Priority 3+ content only**
   - Verifies Hemingway Bridge displays only engaging content (Priority 3+)
   - Screenshot: `engaging-content.png`

3. **Test 3: No "Priority 2" indicator visible**
   - Comprehensive check for any Priority 2 references
   - Screenshot: `no-priority-2.png`

4. **Test 4: Bridge persists after refresh**
   - Ensures consistent behavior after page reload
   - Screenshot: `after-refresh.png`

5. **Test 5: Full page validation**
   - Complete end-to-end validation with comprehensive screenshot
   - Screenshot: `full-page-validated.png`

### Edge Case Tests (2)

6. **API Response Validation**
   - Verifies backend returns no Priority 2 content

7. **Onboarding Routes Disabled**
   - Confirms onboarding API endpoints are disabled

## Running the Tests

### Prerequisites

1. Start the backend server:
   ```bash
   cd /workspaces/agent-feed/api-server
   npm start
   ```

2. Start the frontend development server:
   ```bash
   cd /workspaces/agent-feed/frontend
   npm run dev
   ```

### Execute Tests

```bash
# Run all onboarding validation tests
cd /workspaces/agent-feed/frontend
npx playwright test src/tests/e2e/onboarding-removed-validation.spec.ts

# Run with UI mode for debugging
npx playwright test src/tests/e2e/onboarding-removed-validation.spec.ts --ui

# Run specific test
npx playwright test src/tests/e2e/onboarding-removed-validation.spec.ts -g "Page loads without onboarding"

# Generate HTML report
npx playwright test src/tests/e2e/onboarding-removed-validation.spec.ts --reporter=html
```

## Expected Results

### Success Criteria

All tests should **PASS** with the following outcomes:

- ✅ No onboarding content visible in UI
- ✅ No "Priority 2" text or indicators anywhere
- ✅ Bridge displays only Priority 3+ content (if present)
- ✅ Consistent behavior after page refresh
- ✅ 5 screenshots captured successfully
- ✅ API returns no Priority 2 posts
- ✅ Onboarding endpoints disabled or empty

### Screenshots Location

All screenshots are saved to:
```
/workspaces/agent-feed/docs/screenshots/onboarding-fix/
├── bridge-no-onboarding.png
├── engaging-content.png
├── no-priority-2.png
├── after-refresh.png
└── full-page-validated.png
```

## Test Implementation Details

### Key Validation Functions

```typescript
// Check for any onboarding content
hasOnboardingContent(page: Page): Promise<boolean>

// Get bridge content priority level
getBridgePriority(page: Page): Promise<number | null>

// Wait for feed to fully load
waitForFeedLoad(page: Page): Promise<void>
```

### Validation Checklist

Each test validates:

- [ ] Text content (no onboarding phrases)
- [ ] CSS classes (no priority-2 classes)
- [ ] Data attributes (no data-priority="2")
- [ ] Bridge content (Priority 3+ only)
- [ ] Console errors (no onboarding-related errors)
- [ ] API responses (no Priority 2 posts)

## Troubleshooting

### Tests Fail: Onboarding Content Still Present

1. Check backend database for Priority 2 posts:
   ```bash
   sqlite3 /workspaces/agent-feed/database.db "SELECT * FROM posts WHERE priority = 2;"
   ```

2. Verify onboarding routes are commented out:
   ```bash
   grep -r "onboarding" /workspaces/agent-feed/api-server/routes/
   ```

3. Clear browser cache and reload

### Screenshots Not Generated

1. Ensure screenshots directory exists:
   ```bash
   mkdir -p /workspaces/agent-feed/docs/screenshots/onboarding-fix
   ```

2. Check Playwright permissions:
   ```bash
   chmod 755 /workspaces/agent-feed/docs/screenshots/onboarding-fix
   ```

### Bridge Not Displaying

This is acceptable if:
- No Priority 3+ content is available in the database
- Bridge component correctly filters content
- Test logs show: "ℹ No bridge present (acceptable state)"

## Continuous Integration

Add to CI pipeline:

```yaml
# .github/workflows/e2e-tests.yml
- name: Run Onboarding Removal Validation
  run: |
    npm install
    npx playwright install --with-deps
    npx playwright test src/tests/e2e/onboarding-removed-validation.spec.ts

- name: Upload Screenshots
  uses: actions/upload-artifact@v3
  with:
    name: onboarding-validation-screenshots
    path: docs/screenshots/onboarding-fix/
```

## Success Metrics

✅ **100% Pass Rate** on all 7 tests
✅ **5 Screenshots** captured and saved
✅ **Zero** Priority 2 indicators found
✅ **Zero** onboarding content detected
✅ **Consistent** behavior across page refreshes

## Maintenance

Update tests when:
- Bridge component logic changes
- Priority system is modified
- New onboarding features are added (should remain disabled)
- API endpoints change

## Related Documentation

- [Production Readiness Plan](/workspaces/agent-feed/docs/PRODUCTION-READINESS-PLAN.md)
- [Hemingway Bridge System](/workspaces/agent-feed/docs/HEMINGWAY-BRIDGE-SYSTEM.md)
- [E2E Testing Guide](/workspaces/agent-feed/frontend/src/tests/README.md)

---

**Last Updated**: 2025-11-04
**Test Version**: 1.0.0
**Status**: ✅ Ready for Execution
