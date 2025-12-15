# Avi DM Real Claude Code Integration - Test Checklist

## 📝 Pre-Implementation Checklist

Before implementing real integration, verify these are ready:

- [ ] CLAUDE.md exists in `/prod` directory
- [ ] CLAUDE.md contains Λvi identity and personality
- [ ] ANTHROPIC_API_KEY environment variable is set
- [ ] ClaudeCodeSDKManager package is installed
- [ ] API server structure supports real SDK integration
- [ ] Frontend is configured to call `/api/claude-code/streaming-chat`

## 🔴 RED Phase - Tests Should FAIL

Run tests and verify they fail as expected:

### Backend Validation Tests (`avi-dm-real-validation.test.js`)

- [ ] ❌ Should respond to /api/claude-code/streaming-chat
- [ ] ❌ Should return real Claude output (not mock)
- [ ] ❌ Should use ClaudeCodeSDKManager (not mock)
- [ ] ❌ Should NOT use setTimeout for artificial delays
- [ ] ❌ CLAUDE.md should be readable in /prod directory
- [ ] ❌ Should load CLAUDE.md as system context
- [ ] ❌ Should detect Read tool usage in responses
- [ ] ❌ Should detect Bash tool usage for commands
- [ ] ❌ Should report tool usage metadata

**Status**: All should be ❌ FAILING with mock implementation

### NLD Tests (`avi-dm-nld-verification.test.js`)

- [ ] ❌ Should NOT return template: "Thanks for your message"
- [ ] ❌ Should NOT use setTimeout delays (exactly 1000ms)
- [ ] ❌ Should NOT return identical responses for same input
- [ ] ❌ Should NOT return short template-like responses
- [ ] ❌ Should NOT echo user input verbatim
- [ ] ❌ Should generate different responses for similar questions
- [ ] ❌ Should consistently identify as Λvi (not Claude)
- [ ] ❌ Should NOT return canned responses for calculations
- [ ] ❌ Should show evidence of tool usage

**Status**: All should be ❌ FAILING with mock implementation

### Frontend Unit Tests (`AviDMRealIntegration.test.tsx`)

- [ ] ⚠️ Should call /api/claude-code/streaming-chat endpoint
- [ ] ⚠️ Should include chat history in API request
- [ ] ⚠️ Should handle network errors gracefully
- [ ] ❌ Should NOT use setTimeout for artificial delays
- [ ] ⚠️ Should show loading state during API call
- [ ] ❌ Should NOT return template responses
- [ ] ❌ Should have varying responses for same input

**Status**: Mixed - some pass with mocked fetch, critical ones fail

### Frontend Integration Tests (`AviDMClaudeCode.test.tsx`)

- [ ] ❌ Should successfully call /api/claude-code/streaming-chat
- [ ] ❌ Should return real Claude response (not mock)
- [ ] ❌ Should include CLAUDE.md system context in responses
- [ ] ❌ Should maintain conversation context across messages
- [ ] ❌ Should respond with Λvi personality (not generic Claude)
- [ ] ❌ Should NOT have artificial 1000ms delay

**Status**: All should be ❌ FAILING (requires real API)

---

## 🔧 Implementation Steps

After confirming RED phase, implement these:

### Step 1: Backend Integration

- [ ] Install ClaudeCodeSDKManager
  ```bash
  cd api-server
  npm install @anthropic-ai/sdk
  ```

- [ ] Configure SDK in server.js:
  ```javascript
  import { ClaudeCodeSDKManager } from '@anthropic-ai/sdk';
  const claudeSDK = new ClaudeCodeSDKManager({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  ```

- [ ] Update `/api/claude-code/streaming-chat` endpoint:
  - [ ] Load CLAUDE.md from `/prod` directory
  - [ ] Pass CLAUDE.md as system prompt
  - [ ] Include conversation history
  - [ ] Call real Claude SDK
  - [ ] Return response with metadata
  - [ ] Include tool usage information

- [ ] Remove mock implementations:
  - [ ] Delete setTimeout delays
  - [ ] Remove template response logic
  - [ ] Remove hardcoded "Thanks for your message" response

### Step 2: Frontend Integration

- [ ] Verify API endpoint is `/api/claude-code/streaming-chat`
- [ ] Ensure chat history is sent with each request
- [ ] Handle loading states properly
- [ ] Display error messages to user
- [ ] Parse tool usage metadata (if available)

### Step 3: System Context

- [ ] Verify CLAUDE.md path is correct
- [ ] Test CLAUDE.md is readable by backend
- [ ] Confirm Λvi identity is in CLAUDE.md
- [ ] Verify system context is loaded before each request

---

## 🟢 GREEN Phase - Tests Should PASS

After implementation, run tests again and verify they pass:

### Backend Validation Tests

- [ ] ✅ Should respond to /api/claude-code/streaming-chat
- [ ] ✅ Should return real Claude output (not mock)
- [ ] ✅ Should use ClaudeCodeSDKManager (not mock)
- [ ] ✅ Should NOT use setTimeout for artificial delays
- [ ] ✅ CLAUDE.md should be readable in /prod directory
- [ ] ✅ Should load CLAUDE.md as system context
- [ ] ✅ Should detect Read tool usage in responses
- [ ] ✅ Should detect Bash tool usage for commands
- [ ] ✅ Should report tool usage metadata

**Status**: All should be ✅ PASSING with real integration

### NLD Tests

- [ ] ✅ Should NOT return template: "Thanks for your message"
- [ ] ✅ Should NOT use setTimeout delays (exactly 1000ms)
- [ ] ✅ Should NOT return identical responses for same input
- [ ] ✅ Should NOT return short template-like responses
- [ ] ✅ Should NOT echo user input verbatim
- [ ] ✅ Should generate different responses for similar questions
- [ ] ✅ Should consistently identify as Λvi (not Claude)
- [ ] ✅ Should NOT return canned responses for calculations
- [ ] ✅ Should show evidence of tool usage

**Status**: All should be ✅ PASSING (no mock patterns detected)

### Frontend Unit Tests

- [ ] ✅ Should call /api/claude-code/streaming-chat endpoint
- [ ] ✅ Should include chat history in API request
- [ ] ✅ Should handle network errors gracefully
- [ ] ✅ Should NOT use setTimeout for artificial delays
- [ ] ✅ Should show loading state during API call
- [ ] ✅ Should NOT return template responses
- [ ] ✅ Should have varying responses for same input

**Status**: All should be ✅ PASSING

### Frontend Integration Tests

- [ ] ✅ Should successfully call /api/claude-code/streaming-chat
- [ ] ✅ Should return real Claude response (not mock)
- [ ] ✅ Should include CLAUDE.md system context in responses
- [ ] ✅ Should maintain conversation context across messages
- [ ] ✅ Should respond with Λvi personality (not generic Claude)
- [ ] ✅ Should NOT have artificial 1000ms delay

**Status**: All should be ✅ PASSING

---

## 🎯 Critical Success Criteria

Before marking complete, verify:

### Response Quality
- [ ] Responses reference Λvi identity (not "I am Claude")
- [ ] Responses vary across multiple runs
- [ ] Responses are >50 characters for complex questions
- [ ] Responses demonstrate understanding of context

### Technical Integration
- [ ] Tool usage is detected (Read, Bash, etc.)
- [ ] CLAUDE.md context is applied to responses
- [ ] Multi-turn conversations maintain context
- [ ] Error handling works (network failures, timeouts)

### Performance
- [ ] Response time is <10 seconds
- [ ] No artificial setTimeout delays
- [ ] Natural latency variation (not exactly 1000ms)
- [ ] Concurrent requests are handled

### Security
- [ ] Malicious input is sanitized
- [ ] No system information leaks in errors
- [ ] API key is not exposed
- [ ] CLAUDE.md is read securely

---

## 📊 Test Results Summary

### Current Status (Before Implementation)

```
Total Tests: ~80
Passing: ~15 (mocked fetch only)
Failing: ~65 (expected with mock)
Status: 🔴 RED PHASE
```

### Target Status (After Implementation)

```
Total Tests: ~80
Passing: ~80
Failing: 0
Status: 🟢 GREEN PHASE
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All tests pass (100% green)
- [ ] No mock patterns detected
- [ ] Λvi identity verified in responses
- [ ] CLAUDE.md deployed to production `/prod` directory
- [ ] ANTHROPIC_API_KEY set in production environment
- [ ] Error handling tested
- [ ] Performance benchmarks met
- [ ] Security tests passed
- [ ] CI/CD pipeline includes these tests
- [ ] Monitoring configured for Claude API usage

---

## 🔄 Continuous Verification

Set up automated testing:

- [ ] Add tests to CI/CD pipeline
- [ ] Configure pre-commit hooks to run critical tests
- [ ] Set up monitoring alerts for:
  - Response time degradation
  - Error rate increase
  - Claude API failures
  - Tool usage anomalies

---

## 📞 Support

If tests are not behaving as expected:

1. **Check test file comments** - Each test has detailed documentation
2. **Review AVI_DM_TDD_TEST_PLAN.md** - Complete implementation guide
3. **Check AVI_DM_TEST_QUICK_START.md** - Quick debugging tips
4. **Verify CLAUDE.md** - Ensure Λvi identity is properly defined
5. **Test endpoint manually** - Use curl to verify API responses

---

## ✅ Sign-Off

Implementation is complete when:

- [ ] All checkboxes in GREEN Phase are ✅
- [ ] All Critical Success Criteria are met
- [ ] Deployment Checklist is complete
- [ ] Manual testing confirms Λvi identity
- [ ] Team lead approval obtained

**Sign-off**: ___________________  Date: __________

---

**Remember**: RED → GREEN → REFACTOR. Tests guide the way!
