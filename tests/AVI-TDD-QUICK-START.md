# Λvi System Identity - TDD Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies (30 seconds)
```bash
cd /workspaces/agent-feed
npm install better-sqlite3 jest --save-dev
```

### 2. Run Tests (30 seconds)
```bash
cd tests
chmod +x run-tests.sh
./run-tests.sh all
```

**Expected**: All tests FAIL (because implementation doesn't exist yet)

### 3. Understand Requirements (2 minutes)

Read the test files to understand what needs to be implemented:
- `tests/unit/avi-system-identity.test.js` - Core logic
- `tests/integration/avi-system-identity-integration.test.js` - Backend integration
- `tests/validation/avi-token-usage.test.js` - Performance requirements

### 4. Implement Features (TDD Cycle)

Make tests pass one at a time:

#### Step 1: Add System Identity Check
```javascript
// In agent loading logic
function loadAgent(agentId) {
  if (agentId === 'avi') {
    return {
      agentId: 'avi',
      displayName: 'Λvi (Amplifying Virtual Intelligence)',
      isSystemIdentity: true,
      description: 'AI system coordinator and amplification agent',
      capabilities: ['coordination', 'amplification', 'system-level-operations']
    };
  }
  // ... rest of file loading logic
}
```

#### Step 2: Run Tests Again
```bash
./run-tests.sh unit
```

Watch some tests turn green!

#### Step 3: Continue Until All Pass
Repeat: Write code → Run tests → Fix failures → Repeat

### 5. Verify Success
```bash
./run-tests.sh coverage
```

Check: `coverage/index.html`

---

## 📊 Test Suite Overview

- **Unit Tests**: 50+ tests for core logic
- **Integration Tests**: 30+ tests with real database
- **Validation Tests**: 25+ tests for token usage
- **Total**: 105+ tests covering all requirements

## 🎯 Success Criteria

- ✅ All tests passing
- ✅ Coverage > 90%
- ✅ Token usage < 100 tokens
- ✅ Loading time < 1ms
- ✅ No breaking changes

## 🔧 Common Commands

```bash
./run-tests.sh all         # Run all tests
./run-tests.sh unit        # Unit tests only
./run-tests.sh integration # Integration tests
./run-tests.sh validation  # Token validation
./run-tests.sh coverage    # With coverage
./run-tests.sh watch       # Watch mode
./run-tests.sh clean       # Cleanup
```

## 📚 More Information

- Full documentation: `tests/README.md`
- Complete summary: `tests/TEST-SUMMARY.md`
- Detailed guide: `tests/AVI-SYSTEM-IDENTITY-TDD-COMPLETE.md`

---

**That's it!** Start implementing and watch the tests guide you to success.
