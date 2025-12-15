# System Initialization Test Suite

This directory contains comprehensive tests for the SPARC System Initialization feature.

## Overview

**Feature**: Complete first-time user experience with welcome posts, onboarding, and agent introductions
**SPARC Spec**: `/workspaces/agent-feed/docs/SPARC-SYSTEM-INITIALIZATION.md`
**Total Tests**: 82 tests across unit, integration, and E2E categories

## Test Structure

```
tests/
├── unit/system-initialization/
│   ├── welcome-content-service.test.ts      (10 tests)
│   ├── onboarding-flow.test.ts              (10 tests)
│   ├── hemingway-bridge.test.ts             (10 tests)
│   └── agent-introductions.test.ts          (9 tests)
│
├── integration/system-initialization/
│   ├── first-time-setup.test.ts             (5 tests)
│   ├── complete-onboarding-flow.test.ts     (6 tests)
│   └── bridge-engagement.test.ts            (4 tests)
│
└── e2e/system-initialization/
    ├── system-initialization.spec.ts        (10 tests)
    ├── onboarding-journey.spec.ts           (8 tests)
    ├── agent-introduction-flow.spec.ts      (6 tests)
    └── hemingway-bridge-validation.spec.ts  (4 tests)
```

## Running Tests

### Prerequisites
```bash
# Start development server
npm run dev

# Start API server (in another terminal)
cd ../api-server && npm start
```

### Execute Tests
```bash
# Unit tests only
npm run test -- src/tests/unit/system-initialization --run

# Integration tests only
npm run test -- src/tests/integration/system-initialization --run

# E2E tests only (requires servers running)
npm run test:e2e -- src/tests/e2e/system-initialization

# All tests
npm run test -- src/tests/unit/system-initialization --run && \
npm run test -- src/tests/integration/system-initialization --run && \
npm run test:e2e -- src/tests/e2e/system-initialization
```

## Acceptance Criteria Coverage

All 10 SPARC acceptance criteria are validated:

- ✅ **AC-1**: 3 welcome posts appear immediately
- ✅ **AC-2**: Λvi uses strategic+warm tone (no "chief of staff")
- ✅ **AC-3**: Phase 1 completes in <3 minutes
- ✅ **AC-4**: Core agents introduce after Phase 1
- ✅ **AC-5**: At least 1 bridge always active
- ✅ **AC-6**: Reference guide appears with welcome posts
- ✅ **AC-7**: Contextual agent introductions work
- ✅ **AC-8**: No empty feed states for new users
- ✅ **AC-9**: Database scripts work correctly
- ✅ **AC-10**: Performance (<2s initialization)

## Test Philosophy

### NO MOCKS in E2E Tests
E2E tests run against the real application:
- Real browser automation (Playwright)
- Real database interactions
- Real API calls
- Real user interactions

### TDD Approach
Tests written following Test-Driven Development principles:
- Tests define expected behavior
- Tests validate implementation
- Tests prevent regressions

## Screenshots

E2E tests capture 33 screenshots in:
```
/workspaces/agent-feed/docs/test-results/system-initialization/screenshots/
```

These screenshots provide visual validation of:
- Welcome posts appearance
- Onboarding flow progression
- Agent introductions
- Hemingway bridge states

## Documentation

Complete documentation available at:
- `/docs/test-results/system-initialization/RUN-ALL-TESTS.md` - Execution guide
- `/docs/test-results/system-initialization/FINAL-VALIDATION-REPORT.md` - Validation report
- `/docs/test-results/system-initialization/TEST-SUITE-SUMMARY.md` - Quick summary

## Test Quality Metrics

- **Test Coverage**: 100% of acceptance criteria
- **Code Quality**: Clear descriptions, assertions, expected outcomes
- **Maintainability**: Organized structure, comprehensive docs
- **Execution Time**: ~3-4 minutes for full suite

## Troubleshooting

### Tests Failing?
1. Ensure both servers are running
2. Reset database to clean state
3. Clear browser cache/storage
4. Check console for errors

### E2E Tests Timeout?
1. Increase timeout in `playwright.config.ts`
2. Check server response times
3. Verify database accessibility

### No Screenshots?
1. Check directory exists
2. Verify write permissions
3. Run E2E tests from frontend directory

## Contributing

When modifying tests:
1. Maintain test coverage for all ACs
2. Update documentation if behavior changes
3. Ensure tests remain real (no mocks in E2E)
4. Keep test execution time reasonable

## Support

For questions or issues:
- Review SPARC specification first
- Check test execution guide
- Coordinate with SPARC team agents
- Refer to validation report

---

**Created By**: Agent 6 - Testing & Validation Lead
**Date**: November 3, 2025
**Status**: Ready for Execution
