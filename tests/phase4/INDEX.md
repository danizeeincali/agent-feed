# Phase 4 Test Suite - File Index

Quick reference for navigating the Phase 4 test suite.

---

## Directory Structure

```
tests/phase4/
├── INDEX.md                              (This file - navigation guide)
├── TEST-SUMMARY.md                       (Quick start guide)
├── unit/                                 (Unit tests - isolated components)
│   ├── validation-service.test.ts       (Rule-based + LLM validation)
│   ├── retry-service.test.ts            (Multi-strategy retry logic)
│   └── escalation-service.test.ts       (Error logging + notifications)
└── integration/                          (Integration tests - component orchestration)
    └── post-validator.test.ts           (Complete validation flow)
```

---

## Test Files Overview

### 📄 TEST-SUMMARY.md
**Purpose:** Quick start guide
**Contents:**
- Running tests
- Mock strategies
- Test data examples
- Performance benchmarks

**Read this first!**

---

### 📄 unit/validation-service.test.ts
**Lines:** ~1,100
**Component:** ValidationService
**Tests:** Rule-based and LLM validation

#### Test Categories
- ✅ Happy path (valid posts)
- ✅ Length validation (min/max)
- ✅ Prohibited words (case-insensitive, word boundaries)
- ✅ Mentions (@user format, count limits)
- ✅ Hashtags (#tag format, count limits)
- ✅ URLs (domain validation)
- ✅ LLM tone checking (appropriate/inappropriate)
- ✅ Edge cases (unicode, XSS, empty strings)
- ✅ Error handling (API failures, malformed JSON)
- ✅ Performance (< 100ms without LLM)

#### Key Test Blocks
```typescript
describe('ValidationService - Unit Tests (London School TDD)', () => {
  describe('Contract: validate() - Happy Path', () => {...});
  describe('Contract: validateRules() - Length Check', () => {...});
  describe('Contract: validateRules() - Prohibited Words', () => {...});
  describe('Contract: validateRules() - Mentions', () => {...});
  describe('Contract: validateRules() - Hashtags', () => {...});
  describe('Contract: validateRules() - URLs', () => {...});
  describe('Contract: validateTone() - LLM Checks', () => {...});
  describe('Edge Cases', () => {...});
  describe('Performance', () => {...});
});
```

#### Mock Dependencies
- `mockLLMService` (Anthropic API)
- `mockLogger` (Winston)

#### Run This Test
```bash
npm test -- tests/phase4/unit/validation-service.test.ts
```

---

### 📄 unit/retry-service.test.ts
**Lines:** ~850
**Component:** RetryService
**Tests:** Multi-strategy retry with exponential backoff

#### Test Categories
- ✅ Strategy selection (retry_same, simplify_post, different_agent)
- ✅ Exponential backoff (5s, 30s, 120s)
- ✅ Prompt simplification (remove emojis, truncate)
- ✅ Agent switching logic
- ✅ Metadata tracking (error history, agent history)
- ✅ Error handling (WorkQueue errors, service failures)
- ✅ Collaboration patterns

#### Key Test Blocks
```typescript
describe('RetryService - Unit Tests (London School TDD)', () => {
  describe('Contract: retry() - Strategy Selection', () => {...});
  describe('Contract: getRetryDelay() - Exponential Backoff', () => {...});
  describe('Contract: canRetry()', () => {...});
  describe('Strategy: retry_same', () => {...});
  describe('Strategy: simplify_post', () => {...});
  describe('Strategy: different_agent', () => {...});
  describe('Metadata Tracking', () => {...});
  describe('Error Handling', () => {...});
  describe('Collaboration Patterns', () => {...});
});
```

#### Mock Dependencies
- `mockWorkQueue` (Ticket updates)
- `mockWorkerSpawner` (Agent selection)
- `mockLogger` (Winston)

#### Special Features
- Uses `jest.useFakeTimers()` for backoff testing
- Tests timing without real delays

#### Run This Test
```bash
npm test -- tests/phase4/unit/retry-service.test.ts
```

---

### 📄 unit/escalation-service.test.ts
**Lines:** ~900
**Component:** EscalationService
**Tests:** Error logging, notifications, system posts

#### Test Categories
- ✅ Complete escalation flow
- ✅ System post creation
- ✅ Error logging to database
- ✅ User notifications (email, webhook)
- ✅ Error type classification (validation, timeout, API, worker, unknown)
- ✅ Message formatting
- ✅ Notification preferences
- ✅ Collaboration patterns
- ✅ Edge cases (missing data, long errors)

#### Key Test Blocks
```typescript
describe('EscalationService - Unit Tests (London School TDD)', () => {
  describe('Contract: escalate() - Complete Flow', () => {...});
  describe('Contract: createSystemPost()', () => {...});
  describe('Contract: logError()', () => {...});
  describe('Contract: notifyUser()', () => {...});
  describe('Error Type Classification', () => {...});
  describe('Message Formatting', () => {...});
  describe('Collaboration Patterns', () => {...});
  describe('Edge Cases', () => {...});
});
```

#### Mock Dependencies
- `mockAviDatabase` (Posts, errors, tickets)
- `mockEmailService` (Email sending)
- `mockWebhookService` (Webhook delivery)
- `mockLogger` (Winston)

#### Run This Test
```bash
npm test -- tests/phase4/unit/escalation-service.test.ts
```

---

### 📄 integration/post-validator.test.ts
**Lines:** ~1,250
**Component:** PostValidator (orchestrator)
**Tests:** Complete validation → retry → escalation flow

#### Test Categories
- ✅ Successful validation (approve → save → complete)
- ✅ Validation failure → retry logic
- ✅ Max retries → escalation
- ✅ Critical errors (immediate escalation)
- ✅ Error handling (service failures)
- ✅ State transitions (processing → completed/pending/failed)
- ✅ Metrics and logging

#### Key Test Blocks
```typescript
describe('PostValidator - Integration Tests (London School TDD)', () => {
  describe('Flow: Successful Validation', () => {...});
  describe('Flow: Validation Failure → Retry', () => {...});
  describe('Flow: Max Retries → Escalation', () => {...});
  describe('Error Handling', () => {...});
  describe('State Transitions', () => {...});
  describe('Metrics and Logging', () => {...});
});
```

#### Mock Dependencies
- `mockValidationService`
- `mockRetryService`
- `mockEscalationService`
- `mockAviDatabase`
- `mockHealthMonitor`
- `mockLogger`

#### Flow Examples

**Success Flow:**
```
Validation → Approved → Save to DB → Update Ticket (completed) → Record Metrics
```

**Retry Flow:**
```
Validation → Failed (canFix=true) → Retry Service → Schedule Retry → Log Attempt
```

**Escalation Flow:**
```
Validation → Failed → Max Retries → Escalate → System Post → Log Error → Update Ticket (failed)
```

#### Run This Test
```bash
npm test -- tests/phase4/integration/post-validator.test.ts
```

---

## Running All Tests

### All Phase 4 Tests
```bash
npm test -- tests/phase4
```

### Only Unit Tests
```bash
npm test -- tests/phase4/unit
```

### Only Integration Tests
```bash
npm test -- tests/phase4/integration
```

### Watch Mode (TDD)
```bash
npm run test:watch -- tests/phase4
```

### Coverage Report
```bash
npm run test:coverage -- tests/phase4
```

---

## Test Patterns Used

### 1. London School TDD
- Mock all dependencies
- Test behavior through interactions
- Verify with `toHaveBeenCalled()`

### 2. Arrange-Act-Assert
```typescript
// Arrange
mockService.method.mockResolvedValue(result);

// Act
const output = await service.operation();

// Assert
expect(output).toBe(expected);
expect(mockService.method).toHaveBeenCalledWith(args);
```

### 3. No Real External Calls
- No database operations
- No API calls
- No network requests
- No file system I/O

### 4. Fast Execution
- All tests complete in < 5 seconds
- Use fake timers for delays
- Mock everything for speed

---

## Mock Data Patterns

### Valid Post
```typescript
{
  content: 'Valid post content #testing @user',
  userId: 'user-456',
  agentId: 'agent-789',
}
```

### Work Ticket
```typescript
{
  id: 'ticket-123',
  userId: 'user-456',
  agentId: 'agent-789',
  status: 'processing',
  retryCount: 0,
  metadata: {},
}
```

### Validation Result
```typescript
{
  success: true,
  approved: true,
  canFix: false,
  reason: 'Validation passed',
  feedback: '',
  retrying: false,
  escalated: false,
  metadata: {},
}
```

---

## Test Development Workflow

### 1. Red Phase (Write Failing Test)
```bash
npm run test:watch -- tests/phase4/unit/validation-service.test.ts
```

### 2. Green Phase (Implement to Pass)
```typescript
// Implement in src/validation/validation-service.ts
```

### 3. Refactor Phase (Improve Code)
```typescript
// Refactor while tests still pass
```

### 4. Repeat
Continue until all tests pass!

---

## Common Test Commands

```bash
# Run all tests
npm test

# Run Phase 4 tests only
npm test -- tests/phase4

# Run specific test file
npm test -- tests/phase4/unit/validation-service.test.ts

# Watch mode (TDD)
npm run test:watch -- tests/phase4

# Coverage report
npm run test:coverage -- tests/phase4

# Update snapshots (if any)
npm test -- -u

# Run tests matching pattern
npm test -- -t "should approve valid post"

# Verbose output
npm test -- --verbose

# Run in band (sequential, for debugging)
npm test -- --runInBand
```

---

## Troubleshooting

### Test Not Found
```bash
# Check file path
ls -la tests/phase4/unit/validation-service.test.ts

# Check jest.config.cjs
cat jest.config.cjs
```

### Import Errors
```typescript
// Use @jest/globals for Jest types
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
```

### Mock Not Working
```typescript
// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Tests Slow
```typescript
// Use fake timers for delays
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});
```

---

## Documentation Links

- **PHASE-4-TEST-SUITE.md** - Comprehensive test documentation
- **PHASE-4-SPECIFICATION.md** - Requirements (127 tests specified)
- **PHASE-4-ARCHITECTURE-DESIGN.md** - Component design
- **PHASE-4-PSEUDOCODE.md** - Implementation algorithms

---

## Quick Reference

| What | Where |
|------|-------|
| **Start here** | TEST-SUMMARY.md |
| **Full docs** | PHASE-4-TEST-SUITE.md |
| **Validation tests** | unit/validation-service.test.ts |
| **Retry tests** | unit/retry-service.test.ts |
| **Escalation tests** | unit/escalation-service.test.ts |
| **Integration tests** | integration/post-validator.test.ts |
| **Run all tests** | `npm test -- tests/phase4` |
| **Watch mode** | `npm run test:watch -- tests/phase4` |
| **Coverage** | `npm run test:coverage -- tests/phase4` |

---

**Happy Testing! 🧪**
