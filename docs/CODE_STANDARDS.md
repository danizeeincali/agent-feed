# AVI Code Standards - Core Principle

## ABSOLUTE RULE: Never Break to Build

**We never break one thing to test or build another.**

### Standard Requirements

1. **Preservation of Existing Functionality**
   - All existing features must continue working during development
   - No temporary disabling of features to test new features
   - No breaking changes without explicit user approval

2. **Exceptions (Rare)**
   - Only when absolutely technically impossible to proceed otherwise
   - Must be documented with clear justification
   - Must have fix plan before breaking anything
   - **MUST be fixed before code reaches user**

3. **Testing Requirements**
   - Both old and new features must pass tests
   - Regression testing required for all changes
   - No deployment until all features verified working

4. **Fix-Before-Deploy Protocol**
   If an existing feature was broken during development:
   - Document what was broken and why
   - Fix the broken feature BEFORE user deployment
   - Test both features work together
   - Verify no other regressions introduced

### Enforcement

- All agents building code must follow this standard
- Code reviews must verify compliance
- Deployment checklist must include regression verification
- Violations require immediate remediation

### Example: AVI Orchestrator Case

**WRONG** ❌:
- Disable AVI Orchestrator to test tier filtering
- Deploy tier filtering while orchestrator broken
- User loses orchestrator functionality

**CORRECT** ✅:
- Investigate orchestrator crash root cause
- Fix orchestrator SQLite compatibility
- Test tier filtering works
- Test orchestrator works
- Deploy both working together

### Pre-Task Checklist

Before starting any building task, ask:

1. **"Will this work affect existing features?"**
2. **If YES: "What features might break?"**
3. **For each: "How will we ensure they keep working?"**
4. **"What's the testing plan?"**
5. **"What's the rollback plan?"**

### Post-Task Checklist

After completing any building task:

1. **Run regression tests**
2. **Verify no features disabled in .env**
3. **Check for broken functionality**
4. **Test both new and old features**
5. **Create fix plan if anything broken**
6. **Block deployment until all features work**

### Automation

This standard is enforced automatically through:
- Pre-commit hooks
- Pre-push hooks
- Daily automated checks
- Weekly audits
- Self-healing systems
- Agent feed alerts

### Violation Response

If you detect a violation:
- **STOP immediately**
- Create fix plan
- Fix broken feature
- Test everything works
- Only then proceed with deployment
