# Avi DM TDD Tests - Quick Start Guide

## 🚀 Run All Tests (One Command)

```bash
./run-avi-dm-tests.sh
```

## 📋 Individual Test Commands

### Backend Tests

```bash
# Real validation tests
cd api-server
npm run test tests/avi-dm-real-validation.test.js

# Mock detection tests (NLD)
npm run test tests/avi-dm-nld-verification.test.js
```

### Frontend Tests

```bash
# Unit tests
cd frontend
npm run test src/tests/unit/AviDMRealIntegration.test.tsx

# Integration tests (requires API server running)
npm run test src/tests/integration/AviDMClaudeCode.test.tsx
```

## 🎯 Expected Results

### RED Phase (Current Mock Implementation)

| Test Suite | Expected Result | Why |
|------------|----------------|-----|
| Unit Tests | ⚠️ Partial Pass | Uses mocked fetch |
| Integration Tests | ❌ Fail | Detects mock responses |
| Validation Tests | ❌ Fail | No real Claude output |
| NLD Tests | ❌ Fail | Detects mock patterns |

### GREEN Phase (Real Integration)

| Test Suite | Expected Result | Why |
|------------|----------------|-----|
| Unit Tests | ✅ Pass | Real API integration |
| Integration Tests | ✅ Pass | Real Claude responses |
| Validation Tests | ✅ Pass | Real Claude Code SDK |
| NLD Tests | ✅ Pass | No mock patterns |

## 🔍 Key Mock Detection Patterns

The tests will **FAIL** if they detect:

1. **Template Response**: `"Thanks for your message. I received: ..."`
2. **setTimeout Delay**: Exactly 1000ms response time
3. **Deterministic**: Same input always gives same output
4. **Short Responses**: <50 characters for complex questions
5. **No Tool Usage**: Missing `toolsUsed` metadata
6. **Wrong Identity**: "I am Claude" instead of "Λvi"

## ✅ Success Indicators

Tests will **PASS** when:

1. ✅ Responses vary for same input
2. ✅ Response time varies naturally (not exactly 1000ms)
3. ✅ Responses >50 characters for complex questions
4. ✅ Tool usage metadata present (`Read`, `Bash`, etc.)
5. ✅ Λvi identity maintained (not generic Claude)
6. ✅ CLAUDE.md context applied
7. ✅ No template responses

## 🧪 Test Individual Patterns

### Test for Template Responses
```bash
cd api-server
npm run test -- -t "should NOT return template responses"
```

### Test for setTimeout Delays
```bash
npm run test -- -t "should NOT use setTimeout"
```

### Test for Λvi Identity
```bash
npm run test -- -t "should respond with Λvi personality"
```

### Test Tool Usage
```bash
npm run test -- -t "should detect Read tool usage"
```

## 🛠️ Debugging Failed Tests

### 1. Check API Endpoint Manually
```bash
curl -X POST http://localhost:3001/api/claude-code/streaming-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Who are you?",
    "history": []
  }' | jq
```

**Expected Mock Response** (will make tests fail):
```json
{
  "response": "Thanks for your message. I received: Who are you?"
}
```

**Expected Real Response** (will make tests pass):
```json
{
  "response": "I'm Λvi, your personal AI assistant...",
  "toolsUsed": ["Read"],
  "metadata": {
    "tokensUsed": 245,
    "modelUsed": "claude-sonnet-4-5"
  }
}
```

### 2. Check CLAUDE.md Exists
```bash
cat /workspaces/agent-feed/prod/CLAUDE.md | head -20
```

Should contain Λvi identity information.

### 3. Verify API Key
```bash
echo $ANTHROPIC_API_KEY | head -c 10
```

### 4. Check Backend Logs
```bash
cd api-server
tail -f logs/server.log
# or
node server.js  # Watch console output
```

Look for:
- ❌ `setTimeout` calls (mock indicator)
- ❌ Template string returns (mock indicator)
- ✅ Claude SDK initialization
- ✅ Tool usage logs

## 📊 Test Coverage

Run with coverage:

```bash
# Backend
cd api-server
npm run test -- --coverage tests/avi-dm-*.test.js

# Frontend
cd frontend
npm run test -- --coverage src/tests/unit/AviDMRealIntegration.test.tsx
```

Target: >95% coverage

## 🐛 Common Issues

### "Cannot find module 'supertest'"
```bash
cd api-server
npm install --save-dev supertest
```

### "Cannot find module '@testing-library/react'"
```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/user-event
```

### "API server not running"
```bash
cd api-server
npm start
# In another terminal, run tests
```

### Tests timeout
Increase timeout in test file:
```javascript
it('should respond', async () => {
  // test code
}, 30000); // 30 second timeout
```

## 📖 Full Documentation

For complete details, see:
- **AVI_DM_TDD_TEST_PLAN.md** - Comprehensive test plan
- Test file comments - Inline documentation
- `/workspaces/agent-feed/prod/CLAUDE.md` - Avi identity context

## 🎓 TDD Workflow

```
1. RED:   Run tests → See them fail with mock
          ./run-avi-dm-tests.sh

2. GREEN: Implement real Claude Code integration
          - Configure ClaudeCodeSDKManager
          - Remove mock implementations
          - Load CLAUDE.md as system context

3. GREEN: Run tests → See them pass
          ./run-avi-dm-tests.sh

4. REFACTOR: Optimize code while keeping tests green
```

## 🏆 Definition of Done

All checkboxes must be ✅:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All validation tests pass
- [ ] All NLD tests pass (no mock patterns detected)
- [ ] Responses reference Λvi identity
- [ ] Tool usage is detected and reported
- [ ] CLAUDE.md context is applied
- [ ] Multi-turn conversations maintain context
- [ ] No artificial delays (setTimeout)
- [ ] Response quality meets expectations

## 🚨 Critical Tests

These tests MUST pass before deployment:

```bash
# Test 1: No mock templates
npm run test -- -t "should NOT return template"

# Test 2: No setTimeout delays
npm run test -- -t "should NOT use setTimeout"

# Test 3: Λvi identity
npm run test -- -t "should respond with Λvi personality"

# Test 4: Real Claude output
npm run test -- -t "should return real Claude output"
```

All 4 must be green ✅ before merging to main.

---

**Remember**: Tests are red (failing) with mocks, green (passing) with real integration!
