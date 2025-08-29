# SSE Endpoint Consistency TDD Test Suite

## Overview

This comprehensive Test-Driven Development (TDD) test suite validates URL consistency between frontend SSE connections and backend endpoints. The tests are designed to **FAIL initially** with the current implementation (demonstrating URL mismatches) and **PASS after fixing** the URL consistency issues.

## 🚨 Current URL Mismatch Issues

### The Problem
- **Frontend hooks** construct URLs like: `/api/claude/instances/{id}/terminal/stream`
- **Backend serves** URLs like: `/api/v1/claude/instances/{id}/terminal/stream`
- **Result**: 404 errors, failed SSE connections, poor user experience

### Affected Files
```
frontend/src/hooks/useSSEConnectionSingleton.ts     (Lines 27, 63)
frontend/src/hooks/useStableSSEConnection.ts        (Lines 45, 89)
frontend/src/hooks/useAdvancedSSEConnection.ts      (Line 307)
frontend/src/hooks/useHTTPSSE.ts                    (Lines 15, 20, 25, 80)
```

## 📋 Test Suite Components

### 1. Core Test Files

| Test File | Purpose | Expected Initial Result |
|-----------|---------|------------------------|
| `sse-url-mismatch.test.ts` | Validates SSE connection URLs match backend endpoints | ❌ **FAIL** (URLs don't match) |
| `api-versioning-consistency.test.ts` | Tests API versioning consistency across all endpoints | ❌ **FAIL** (Inconsistent versioning) |
| `connection-establishment.test.ts` | Tests SSE connection success after instance creation | ❌ **FAIL** (Connections fail due to URL mismatch) |
| `graceful-error-handling.test.ts` | Tests graceful handling of SSE connection failures | ❌ **FAIL** (Poor error handling) |
| `url-construction-patterns.test.ts` | Tests consistent URL construction patterns | ❌ **FAIL** (Inconsistent patterns) |

### 2. Supporting Infrastructure

| File | Purpose |
|------|---------|
| `mocks/EventSourceMock.ts` | Comprehensive EventSource mocking for SSE testing |
| `fixtures/endpointPatterns.ts` | URL pattern definitions and test cases |
| `utils/testHelpers.ts` | Testing utilities and validation helpers |
| `jest.config.js` | Jest configuration optimized for SSE testing |
| `jest.setup.js` | Global test environment setup |

## 🎯 Test Design Philosophy

### TDD Approach: Fail First, Then Pass

1. **FAILING TESTS** (Current State):
   - Demonstrate exact URL mismatch issues
   - Document specific files/lines that need fixes
   - Show impact of inconsistent API versioning
   - Validate error handling deficiencies

2. **PASSING TESTS** (After Fix):
   - Show correct URL construction patterns
   - Demonstrate proper error handling
   - Validate standardized API versioning
   - Confirm successful SSE connections

## 🚀 Quick Start

### Install Dependencies
```bash
cd /workspaces/agent-feed/tests/unit/sse-endpoint-consistency
npm install
```

### Run All Tests
```bash
# Run complete test suite
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Run Specific Test Categories

```bash
# Tests that SHOULD FAIL (current implementation issues)
npm run test:current-fails

# Tests that SHOULD PASS (correct implementations)
npm run test:after-fix

# Run comprehensive test validation
./run-tests.sh
```

## 📊 Test Results Interpretation

### Expected Initial Results (Before Fix)

```
❌ FAIL: Terminal stream URLs mismatch between frontend and backend
❌ FAIL: API versioning should be consistent across all endpoints  
❌ FAIL: SSE connection establishment should succeed after instance creation
❌ FAIL: Frontend should handle SSE connection failures gracefully
❌ FAIL: URL construction should follow consistent patterns
```

### Expected Results After Fix

```
✅ PASS: Terminal stream URLs match backend endpoints
✅ PASS: API versioning is consistent across all endpoints
✅ PASS: SSE connection establishment succeeds after instance creation
✅ PASS: Frontend handles SSE connection failures gracefully  
✅ PASS: URL construction follows consistent patterns
```

## 🔧 The Fix

### Required Changes

Replace all instances of `/api/claude/` with `/api/v1/claude/` in frontend hooks:

#### Before (Current - Broken)
```typescript
const url = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
```

#### After (Fixed)  
```typescript
const url = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
```

### Specific File Changes

1. **useSSEConnectionSingleton.ts**
   ```diff
   - const url = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
   + const url = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
   
   - const response = await fetch(`${baseUrl}/api/claude/instances/${instanceId}/terminal/input`
   + const response = await fetch(`${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/input`
   ```

2. **useStableSSEConnection.ts**
   ```diff  
   - `${url}/api/claude/instances/${instanceId}/terminal/stream`
   + `${url}/api/v1/claude/instances/${instanceId}/terminal/stream`
   ```

3. **useAdvancedSSEConnection.ts**
   ```diff
   - const url = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
   + const url = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
   ```

4. **useHTTPSSE.ts**
   ```diff
   - endpoint = `/api/claude/instances/${inputInstanceId}/terminal/input`;
   + endpoint = `/api/v1/claude/instances/${inputInstanceId}/terminal/input`;
   
   - endpoint = '/api/claude/instances';
   + endpoint = '/api/v1/claude/instances';
   ```

## 📈 Test Coverage

The test suite covers:

- **URL Pattern Validation**: All SSE endpoint patterns
- **API Versioning**: Consistency across hooks and endpoints
- **Connection Establishment**: Complete SSE connection flow
- **Error Handling**: Graceful failure and recovery scenarios
- **Performance Impact**: URL mismatch performance degradation
- **Cross-Environment**: URL construction across different environments

## 🛠️ Advanced Usage

### Running Individual Test Suites

```bash
# Test specific URL mismatch scenarios
npx jest sse-url-mismatch.test.ts

# Test API versioning only
npx jest api-versioning-consistency.test.ts

# Test connection establishment flow
npx jest connection-establishment.test.ts

# Test error handling
npx jest graceful-error-handling.test.ts

# Test URL construction patterns
npx jest url-construction-patterns.test.ts
```

### Debug Mode

```bash
# Run in debug mode
npm run test:debug

# Verbose output
npm run test:verbose

# With console output restored
NODE_ENV=debug npm test
```

### Custom Test Patterns

```bash
# Run only failing tests
npx jest --testNamePattern="SHOULD FAIL"

# Run only passing tests  
npx jest --testNamePattern="SHOULD PASS"

# Run specific pattern
npx jest --testNamePattern="URL.*mismatch"
```

## 📋 Validation Checklist

### Before Running Tests
- [ ] Backend server is running on expected port
- [ ] All frontend hook files exist in expected locations
- [ ] Jest and testing dependencies are installed

### Test Execution
- [ ] Run `./run-tests.sh` for comprehensive validation
- [ ] Verify failing tests identify specific URL mismatches
- [ ] Check passing tests show correct patterns
- [ ] Review generated coverage reports

### After Fix Implementation  
- [ ] Apply URL changes to all identified hook files
- [ ] Re-run test suite to validate fixes
- [ ] Ensure all "SHOULD FAIL" tests now pass
- [ ] Verify SSE connections work in actual application

## 🎯 Success Criteria

### Tests Successfully Demonstrate:
1. **Exact URL mismatches** between frontend and backend
2. **Specific files and line numbers** requiring fixes
3. **Impact assessment** of URL inconsistencies
4. **Clear fix validation** after URL corrections

### After Fix Implementation:
1. **All URL patterns consistent** (`/api/v1/` prefix)
2. **SSE connections successful** in all hooks
3. **Error handling improved** with URL validation
4. **Test suite passes completely**

## 📚 Additional Resources

### Related Files
- Backend SSE endpoints: `src/api/server.ts` (Lines 296-427)
- Frontend components using SSE: `frontend/src/components/AdvancedSSETerminal.tsx`
- Hook implementations: `frontend/src/hooks/use*SSE*.ts`

### Documentation
- [EventSource API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [Jest Testing Framework](https://jestjs.io/)
- [Test-Driven Development Best Practices](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

---

## 🚨 Important Notes

1. **These tests WILL FAIL initially** - this is expected and demonstrates the URL mismatch issues
2. **After applying the fixes**, the same tests should PASS
3. **The test suite is comprehensive** - it covers all aspects of SSE URL consistency
4. **Results are actionable** - exact files and lines are identified for fixes

**Ready to run? Execute `./run-tests.sh` to see the complete validation in action!**