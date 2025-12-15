# User Name Display Validation E2E Tests

## Overview

Comprehensive Playwright E2E tests that validate user and agent name display across the entire application.

## Test Coverage

### 1. User Display Name Tests (3 tests)
- ✅ Verify "Woz" displays in user profile area
- ✅ Verify "Woz" displays in user posts
- ✅ Verify "Woz" displays in user comments

### 2. Agent Name Tests (3 tests)
- ✅ Verify "Λvi" displays for Avi agent posts
- ✅ Verify "Get-to-Know-You" for agent posts
- ✅ Verify agent names in comments they create

### 3. No Fallback Tests (3 tests)
- ✅ Verify no "User" fallback anywhere
- ✅ Verify no "demo-user-123" visible to user
- ✅ Verify no forbidden fallback names in feed

### 4. Comment Thread Tests (3 tests)
- ✅ Create new comment as user → verify "Woz" shows
- ✅ Verify existing comments show correct names
- ✅ Screenshot comment thread with all names

### 5. Cross-Component Consistency (2 tests)
- ✅ Verify consistent user name across all components
- ✅ Verify consistent agent names across all components

**Total: 14 comprehensive tests**

## Running Tests

### Run All Tests
```bash
cd frontend
npx playwright test src/tests/e2e/user-name-display-validation.spec.ts
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test src/tests/e2e/user-name-display-validation.spec.ts --headed
```

### Run Specific Test Suite
```bash
# User display name tests only
npx playwright test src/tests/e2e/user-name-display-validation.spec.ts -g "User Display Name"

# Agent name tests only
npx playwright test src/tests/e2e/user-name-display-validation.spec.ts -g "Agent Name Tests"

# No fallback tests only
npx playwright test src/tests/e2e/user-name-display-validation.spec.ts -g "No Fallback"
```

### Run with Debug Mode
```bash
npx playwright test src/tests/e2e/user-name-display-validation.spec.ts --debug
```

## Screenshots

All test screenshots are saved to: `/docs/screenshots/user-name-fix/`

### Screenshot Manifest

1. `01-user-profile-woz.png` - User profile showing "Woz"
2. `02-user-post-woz.png` - User post with "Woz" displayed
3. `03-user-comment-woz.png` - User comment with "Woz"
4. `04-agent-avi-post.png` - Avi agent post with "Λvi"
5. `05-agent-gtk-post.png` - Get-to-Know-You agent post
6. `06-agent-comment-*.png` - Agent comments with proper names
7. `07-no-user-fallback.png` - Full page without "User" fallback
8. `08-no-user-id-visible.png` - No "demo-user-123" visible
9. `09-full-feed-validation.png` - Complete feed validation
10. `10-new-comment-woz.png` - Newly created comment shows "Woz"
11. `11-existing-comments-post-*.png` - Existing comments with names
12. `12-comment-thread-all-names.png` - Full comment thread
13. `13-name-consistency-check.png` - Cross-component consistency
14. `14-agent-name-consistency.png` - Agent name consistency

## Expected Behavior

### ✅ Correct Display
- User posts/comments show "Woz"
- Avi agent shows "Λvi"
- Get-to-Know-You agent shows full name
- All names are consistent across components

### ❌ Forbidden Display
- "User" as standalone fallback
- "demo-user-123" visible to end users
- "Anonymous" or "Unknown User"
- Any internal IDs or technical identifiers

## Test Architecture

### Key Components Tested
- `RealSocialMediaFeed` - Main feed component
- `CommentThread` - Threaded comment system
- `UserDisplayName` - User name display component
- Post cards and comment sections
- User profile areas

### Name Mapping System
```typescript
const AGENT_DISPLAY_NAMES = {
  'lambda-vi': 'Λvi',
  'get-to-know-you-agent': 'Get-to-Know-You',
  'system': 'System Guide'
};

const USER_DISPLAY_NAME = 'Woz';
```

## Troubleshooting

### Tests Failing?

1. **Check Database**: Ensure production database has posts with correct user/agent data
   ```bash
   # Check user display name
   sqlite3 database.db "SELECT display_name FROM users WHERE user_id='demo-user-123';"
   ```

2. **Check API Response**: Verify API returns correct names
   ```bash
   curl http://localhost:3001/api/posts | jq '.data[0].authorAgent'
   ```

3. **Check Frontend Mapping**: Verify `getAgentDisplayName()` function in RealSocialMediaFeed.tsx

4. **Server Running**: Ensure both frontend and backend are running
   ```bash
   # Terminal 1 (Backend)
   cd api-server && npm start

   # Terminal 2 (Frontend)
   cd frontend && npm run dev
   ```

### Common Issues

**Issue**: No posts found
- **Solution**: Seed database with test posts

**Issue**: "Woz" not appearing
- **Solution**: Check user display name in database and UserDisplayName component

**Issue**: Agent names showing as IDs
- **Solution**: Verify AGENT_DISPLAY_NAMES mapping in RealSocialMediaFeed.tsx

## Integration with CI/CD

Add to GitHub Actions workflow:
```yaml
- name: Run User Name Display Validation Tests
  run: |
    cd frontend
    npx playwright test src/tests/e2e/user-name-display-validation.spec.ts --reporter=html

- name: Upload Screenshots
  uses: actions/upload-artifact@v3
  with:
    name: user-name-validation-screenshots
    path: docs/screenshots/user-name-fix/
```

## Success Criteria

All 14 tests must pass with:
- ✅ "Woz" displayed consistently for user
- ✅ Agent names displayed correctly (Λvi, Get-to-Know-You, etc.)
- ✅ No fallback names visible
- ✅ 14 screenshots captured successfully

## Related Files

- Test File: `/frontend/src/tests/e2e/user-name-display-validation.spec.ts`
- Component: `/frontend/src/components/RealSocialMediaFeed.tsx`
- Component: `/frontend/src/components/UserDisplayName.tsx`
- Screenshots: `/docs/screenshots/user-name-fix/`
- Database: `/database.db` (users table, display_name column)

## Contact

For questions or issues with these tests, check:
1. Test output logs
2. Screenshot artifacts
3. Database user records
4. Component rendering logic
