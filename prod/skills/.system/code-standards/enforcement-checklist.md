# Pre-Deployment Enforcement Checklist

## Code Standards Compliance

- [ ] No features disabled in .env
- [ ] All regression tests pass
- [ ] No broken functionality in codebase
- [ ] New features tested alongside old features
- [ ] Rollback plan documented

## Feature Verification

- [ ] All existing features work
- [ ] All new features work
- [ ] Features work together (integration)
- [ ] No console errors
- [ ] No network errors

## Testing Requirements

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Regression tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Visual regression tests pass (if applicable)

## Documentation

- [ ] Changes documented
- [ ] Fix plan created (if features were broken)
- [ ] Rollback procedure documented
- [ ] User impact assessed

## Sign-off

- [ ] Developer confirms standards followed
- [ ] Reviewer confirms no violations
- [ ] User approves deployment (if required)

## Automated Checks

These are verified automatically:
- ✅ .env feature flags
- ✅ Regression test status
- ✅ Agent skill compliance
- ✅ Code standards violations
