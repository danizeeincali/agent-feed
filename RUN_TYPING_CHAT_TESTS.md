# Running Avi Typing Chat Integration Tests

Quick reference for executing the TDD test suite for typing indicator chat integration.

## Quick Start

```bash
cd /workspaces/agent-feed/frontend

# Run all typing chat integration tests
npm run test -- --grep "AviTyping|AviChatFlow|avi-typing-in-chat"
```

## Individual Test Suites

### 1. Unit Tests (17 tests)
```bash
# Run unit tests only
npm run test:unit src/tests/unit/AviTypingChatIntegration.test.tsx

# Watch mode
npm run test:unit -- --watch src/tests/unit/AviTypingChatIntegration.test.tsx

# With coverage
npm run test:unit -- --coverage src/tests/unit/AviTypingChatIntegration.test.tsx
```

### 2. Integration Tests (15 tests)
```bash
# Run integration tests only
npm run test:integration src/tests/integration/AviChatFlow.test.tsx

# Watch mode
npm run test:integration -- --watch src/tests/integration/AviChatFlow.test.tsx

# With coverage
npm run test:integration -- --coverage src/tests/integration/AviChatFlow.test.tsx
```

### 3. E2E Tests (16 tests)
```bash
# Run E2E tests
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts

# Run with UI (headed mode)
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts --headed

# Debug mode
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts --debug

# Specific test
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts -g "typing indicator should look like Avi message"
```

## TDD Workflow

### Red Phase (Expected)
```bash
# Run unit tests - should fail
npm run test:unit src/tests/unit/AviTypingChatIntegration.test.tsx
# Expected: ❌ Multiple failures - feature not implemented
```

### Green Phase (Implement)
```bash
# Run tests in watch mode while implementing
npm run test:unit -- --watch src/tests/unit/AviTypingChatIntegration.test.tsx

# When unit tests pass, run integration
npm run test:integration -- --watch src/tests/integration/AviChatFlow.test.tsx

# Finally, run E2E
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts --headed
```

### Refactor Phase
```bash
# Run all tests together
npm run test && npx playwright test tests/e2e/avi-typing-in-chat.spec.ts
```

## Test Categories

### State Management Tests
```bash
npm run test:unit -- -t "chatHistory State"
```

### Rendering Tests
```bash
npm run test:unit -- -t "Message Rendering"
```

### Animation Tests
```bash
npm run test:unit -- -t "Animation Properties"
```

### Error Handling Tests
```bash
npm run test:unit -- -t "Error Handling"
npm run test:integration -- -t "Error Cases"
```

### Flow Tests
```bash
npm run test:integration -- -t "Full Chat Flow"
```

### Scroll Tests
```bash
npm run test:integration -- -t "Scroll Behavior"
```

### Visual Tests (E2E)
```bash
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts -g "Visual Integration"
```

### Edge Case Tests
```bash
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts -g "Edge Cases"
```

## Debugging Failed Tests

### Unit/Integration Tests
```bash
# Run specific test with verbose output
npm run test:unit -- -t "should add typing indicator" --verbose

# Run with debug logging
DEBUG=* npm run test:unit src/tests/unit/AviTypingChatIntegration.test.tsx

# Generate coverage report
npm run test:unit -- --coverage --coverageReporters=html
# Open: coverage/index.html
```

### E2E Tests
```bash
# Run with trace
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts --trace on

# Show trace viewer
npx playwright show-trace trace.zip

# Run specific browser
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts --project=chromium

# Slow motion (for visual debugging)
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts --headed --slow-mo=1000
```

## CI/CD Integration

### GitHub Actions (example)
```yaml
- name: Run Typing Chat Tests
  run: |
    cd frontend
    npm run test:unit src/tests/unit/AviTypingChatIntegration.test.tsx
    npm run test:integration src/tests/integration/AviChatFlow.test.tsx
    npx playwright test tests/e2e/avi-typing-in-chat.spec.ts
```

### Pre-commit Hook
```bash
# .husky/pre-commit
cd frontend && npm run test:unit src/tests/unit/AviTypingChatIntegration.test.tsx
```

## Expected Test Results

### Initial Run (Before Implementation)
```
Unit Tests:       0 passed, 17 failed, 17 total
Integration:      0 passed, 15 failed, 15 total
E2E:             0 passed, 16 failed, 16 total
Total:           0 passed, 48 failed, 48 total ❌
```

### After Implementation
```
Unit Tests:       17 passed, 0 failed, 17 total ✅
Integration:      15 passed, 0 failed, 15 total ✅
E2E:             16 passed, 0 failed, 16 total ✅
Total:           48 passed, 0 failed, 48 total ✅
```

## Performance Benchmarks

### Unit Tests
- Target: <5 seconds total
- Average per test: <300ms

### Integration Tests
- Target: <15 seconds total
- Average per test: <1 second

### E2E Tests
- Target: <3 minutes total
- Average per test: <10 seconds

## Common Issues

### Issue: Tests timeout
```bash
# Increase timeout for slow tests
npm run test:unit -- --testTimeout=10000
```

### Issue: E2E tests flaky
```bash
# Run with retries
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts --retries=2
```

### Issue: Cannot find test files
```bash
# Verify file paths
ls -la frontend/src/tests/unit/AviTypingChatIntegration.test.tsx
ls -la frontend/src/tests/integration/AviChatFlow.test.tsx
ls -la frontend/tests/e2e/avi-typing-in-chat.spec.ts
```

## Test Reports

### Generate HTML Report
```bash
# Unit/Integration
npm run test:unit -- --coverage --coverageReporters=html
open coverage/index.html

# E2E
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts --reporter=html
npx playwright show-report
```

### Generate JSON Report
```bash
# For CI/CD parsing
npm run test:unit -- --json --outputFile=test-results.json
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts --reporter=json
```

## File Paths Reference

```
Unit Tests:        /workspaces/agent-feed/frontend/src/tests/unit/AviTypingChatIntegration.test.tsx
Integration Tests: /workspaces/agent-feed/frontend/src/tests/integration/AviChatFlow.test.tsx
E2E Tests:         /workspaces/agent-feed/frontend/tests/e2e/avi-typing-in-chat.spec.ts
Documentation:     /workspaces/agent-feed/AVI_TYPING_CHAT_INTEGRATION_TESTS.md
This File:         /workspaces/agent-feed/RUN_TYPING_CHAT_TESTS.md
```

---

**Quick Command Summary**

```bash
# Run everything
cd frontend && npm run test && cd .. && cd frontend && npx playwright test tests/e2e/avi-typing-in-chat.spec.ts

# TDD workflow
npm run test:unit -- --watch src/tests/unit/AviTypingChatIntegration.test.tsx

# Debug E2E
npx playwright test tests/e2e/avi-typing-in-chat.spec.ts --debug --headed
```
