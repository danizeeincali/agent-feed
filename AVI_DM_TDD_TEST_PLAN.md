# Avi DM Real Claude Code Integration - TDD Test Plan

## Overview

This document outlines the comprehensive TDD test suite for validating the real Claude Code integration in Avi DM. These tests follow **London School TDD** principles and are designed to **FAIL** with the current mock implementation and **PASS** only when real integration is complete.

## Test Files Created

### 1. Frontend Unit Tests
**File**: `/workspaces/agent-feed/frontend/src/tests/unit/AviDMRealIntegration.test.tsx`

**Purpose**: Test React component integration with real API

**Key Tests**:
- ✅ API call function exists and uses correct endpoint
- ✅ Error handling for network failures
- ✅ Chat history updates correctly
- ✅ Loading states during API calls
- ❌ **ANTI-MOCK**: Detects setTimeout delays
- ❌ **ANTI-MOCK**: Detects template responses
- ❌ **ANTI-MOCK**: Detects deterministic behavior

**Run Command**:
```bash
cd frontend
npm run test src/tests/unit/AviDMRealIntegration.test.tsx
```

---

### 2. Frontend Integration Tests
**File**: `/workspaces/agent-feed/frontend/src/tests/integration/AviDMClaudeCode.test.tsx`

**Purpose**: Test real API communication end-to-end

**Key Tests**:
- ✅ Successful API calls to `/api/claude-code/streaming-chat`
- ✅ CLAUDE.md system context is included
- ✅ Multi-turn conversation context maintained
- ✅ Response parsing for various formats (markdown, code, text)
- ✅ Error recovery and user feedback
- ❌ **ANTI-MOCK**: Verifies Λvi identity (not generic Claude)
- ❌ **ANTI-MOCK**: Detects non-varying responses
- ❌ **ANTI-MOCK**: Detects artificial delays

**Run Command**:
```bash
cd frontend
npm run test src/tests/integration/AviDMClaudeCode.test.tsx
```

**Prerequisites**:
- Backend API server must be running
- Set `VITE_API_URL=http://localhost:3001` (or your API URL)

---

### 3. Backend Validation Tests
**File**: `/workspaces/agent-feed/api-server/tests/avi-dm-real-validation.test.js`

**Purpose**: Validate backend uses real Claude Code SDK

**Key Tests**:
- ✅ `/api/claude-code/streaming-chat` endpoint responds
- ✅ CLAUDE.md is readable in `/prod` directory
- ✅ Tool usage detection (Read, Bash tools)
- ✅ ClaudeCodeSDKManager is used (not mocks)
- ✅ Concurrent request handling
- ✅ Security testing (XSS, injection prevention)
- ❌ **ANTI-MOCK**: Response quality verification
- ❌ **ANTI-MOCK**: Tool usage metadata present

**Run Command**:
```bash
cd api-server
npm run test tests/avi-dm-real-validation.test.js
```

**Prerequisites**:
- API server running on port 3001
- Real Claude Code SDK configured
- CLAUDE.md exists at `/workspaces/agent-feed/prod/CLAUDE.md`

---

### 4. NLD (No-Lies Detection) Tests
**File**: `/workspaces/agent-feed/api-server/tests/avi-dm-nld-verification.test.js`

**Purpose**: Comprehensive mock detection and anti-regression

**Key Tests**:
- ❌ **CRITICAL**: Detects "Thanks for your message" template
- ❌ **CRITICAL**: Detects exactly 1000ms setTimeout delays
- ❌ **CRITICAL**: Detects identical responses for same input
- ❌ **CRITICAL**: Detects short template responses (<50 chars)
- ❌ **CRITICAL**: Verifies response variation
- ❌ **CRITICAL**: Verifies Λvi identity consistency
- ❌ **CRITICAL**: Detects deterministic behavior

**Run Command**:
```bash
cd api-server
npm run test tests/avi-dm-nld-verification.test.js
```

**Note**: These tests are **designed to fail** with mock implementation!

---

## Test Execution Strategy

### Phase 1: RED (All Tests Fail)
**Current State**: Mock implementation is active

```bash
# Run all tests - expect failures
cd api-server
npm run test tests/avi-dm-*.test.js

cd ../frontend
npm run test src/tests/unit/AviDMRealIntegration.test.tsx
npm run test src/tests/integration/AviDMClaudeCode.test.tsx
```

**Expected Results**:
- ❌ NLD tests fail (detecting mock patterns)
- ❌ Validation tests fail (no real Claude responses)
- ⚠️ Unit tests may partially pass (mocked fetch)
- ❌ Integration tests fail (mock responses detected)

---

### Phase 2: GREEN (Implement Real Integration)

**Implementation Steps**:

1. **Configure ClaudeCodeSDKManager**:
   ```javascript
   // api-server/server.js or equivalent
   import { ClaudeCodeSDKManager } from '@anthropic-ai/sdk';

   const claudeSDK = new ClaudeCodeSDKManager({
     apiKey: process.env.ANTHROPIC_API_KEY
   });
   ```

2. **Update /api/claude-code/streaming-chat endpoint**:
   ```javascript
   app.post('/api/claude-code/streaming-chat', async (req, res) => {
     const { message, history } = req.body;

     // Load CLAUDE.md as system context
     const systemContext = fs.readFileSync(
       path.join(__dirname, '..', 'prod', 'CLAUDE.md'),
       'utf-8'
     );

     // Real Claude Code API call
     const response = await claudeSDK.chat({
       systemPrompt: systemContext,
       messages: [...history, { role: 'user', content: message }]
     });

     res.json({
       response: response.content,
       toolsUsed: response.toolsUsed || [],
       metadata: {
         tokensUsed: response.usage?.total_tokens,
         modelUsed: response.model
       }
     });
   });
   ```

3. **Remove Mock Implementations**:
   - Delete setTimeout delays
   - Remove template response logic
   - Remove hardcoded responses

4. **Run Tests Again**:
   ```bash
   cd api-server
   npm run test tests/avi-dm-*.test.js
   ```

**Expected Results**:
- ✅ NLD tests pass (no mock patterns detected)
- ✅ Validation tests pass (real Claude responses)
- ✅ Unit tests pass (real API integration)
- ✅ Integration tests pass (Λvi identity verified)

---

### Phase 3: REFACTOR (Optimize)

**After All Tests Pass**:

1. **Performance Optimization**:
   - Implement response streaming
   - Add caching for system context
   - Optimize token usage

2. **Error Handling**:
   - Add retry logic
   - Implement graceful degradation
   - Add detailed error messages

3. **Monitoring**:
   - Add logging for tool usage
   - Track token consumption
   - Monitor response times

---

## Mock Detection Patterns

The tests specifically detect these mock patterns:

### Pattern 1: Template Responses
```javascript
// MOCK PATTERN (FAIL):
response = `Thanks for your message. I received: ${userMessage}`;

// REAL PATTERN (PASS):
response = await claudeSDK.chat({ message: userMessage });
```

### Pattern 2: setTimeout Delays
```javascript
// MOCK PATTERN (FAIL):
setTimeout(() => sendResponse(), 1000);

// REAL PATTERN (PASS):
const response = await claudeSDK.chat(); // Natural latency
```

### Pattern 3: Deterministic Responses
```javascript
// MOCK PATTERN (FAIL):
if (message.includes('hello')) return 'Hi there!';

// REAL PATTERN (PASS):
return await claudeSDK.chat({ message }); // Varies naturally
```

### Pattern 4: No Tool Usage
```javascript
// MOCK PATTERN (FAIL):
return { response: 'I read the file', toolsUsed: [] };

// REAL PATTERN (PASS):
return {
  response: actualContent,
  toolsUsed: ['Read', 'Bash'] // Real SDK reports this
};
```

---

## Success Criteria

### All Tests Must Pass:
- ✅ 100% unit test coverage
- ✅ All integration tests green
- ✅ All validation tests green
- ✅ All NLD tests green (no mock patterns)

### Response Quality:
- ✅ Responses reference Λvi identity (not "Claude")
- ✅ Responses vary across runs
- ✅ Tool usage is detected and reported
- ✅ CLAUDE.md context is applied
- ✅ Multi-turn conversations maintain context

### Performance:
- ✅ Response time < 10 seconds
- ✅ No artificial delays
- ✅ Natural latency variation

---

## Troubleshooting

### Tests Still Failing After Implementation?

1. **Check CLAUDE.md Path**:
   ```bash
   ls -la /workspaces/agent-feed/prod/CLAUDE.md
   ```

2. **Verify API Key**:
   ```bash
   echo $ANTHROPIC_API_KEY | head -c 10
   ```

3. **Test Endpoint Manually**:
   ```bash
   curl -X POST http://localhost:3001/api/claude-code/streaming-chat \
     -H "Content-Type: application/json" \
     -d '{"message":"Hello","history":[]}'
   ```

4. **Check Backend Logs**:
   ```bash
   # Look for tool usage, errors, or mock indicators
   tail -f api-server/logs/server.log
   ```

5. **Isolate Failing Test**:
   ```bash
   npm run test -- -t "should NOT return template responses"
   ```

---

## Continuous Integration

### CI Pipeline (GitHub Actions):

```yaml
# .github/workflows/avi-dm-tests.yml
name: Avi DM TDD Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: |
          cd api-server && npm install
          cd ../frontend && npm install

      - name: Start API server
        run: cd api-server && npm start &
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Run backend tests
        run: cd api-server && npm run test tests/avi-dm-*.test.js

      - name: Run frontend tests
        run: cd frontend && npm test

      - name: Check for mock patterns
        run: cd api-server && npm run test tests/avi-dm-nld-verification.test.js
```

---

## Next Steps

1. **Run RED Phase**: Execute all tests, confirm they fail
2. **Implement Real Integration**: Follow Phase 2 steps
3. **Run GREEN Phase**: Verify all tests pass
4. **Refactor**: Optimize and clean up code
5. **Deploy**: Push to production with confidence

---

## Test Coverage Goals

| Test Category | Target Coverage |
|--------------|----------------|
| Unit Tests | 100% |
| Integration Tests | 90% |
| Validation Tests | 100% |
| NLD Tests | 100% |

**Overall Target**: >95% test coverage for Avi DM Claude Code integration

---

## Contact

For questions or issues with tests:
- Review test comments in each file
- Check `/workspaces/agent-feed/prod/CLAUDE.md` for Avi identity context
- Verify ClaudeCodeSDKManager documentation

---

**Remember**: These tests are your safety net. They should fail with mocks and pass with real integration. Trust the tests!
