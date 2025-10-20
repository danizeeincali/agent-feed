# Code Standards Violation Examples

## ❌ VIOLATION #1: Disabling Features to Test

**Scenario**: Testing tier filtering system

**WRONG**:
```bash
# Disable orchestrator to avoid errors
AVI_ORCHESTRATOR_ENABLED=false

# Test tier filtering
npm run dev
```

**WHY WRONG**:
- Breaks orchestrator for user
- Violates "never break one thing to build another"
- User loses functionality

**CORRECT**:
```bash
# Investigate orchestrator error
# Fix orchestrator stub repositories
# Keep orchestrator enabled
AVI_ORCHESTRATOR_ENABLED=true

# Test both tier filtering AND orchestrator work
npm run dev
```

---

## ❌ VIOLATION #2: Committing Broken Code

**Scenario**: Feature partially implemented

**WRONG**:
```bash
git add .
git commit -m "WIP: tier filtering (orchestrator broken)"
git push
```

**WHY WRONG**:
- Pushes broken code to repository
- Other developers get broken build
- CI/CD fails

**CORRECT**:
```bash
# Fix orchestrator first
# Test everything works
# Then commit
git add .
git commit -m "feat: tier filtering + orchestrator fix"
git push
```

---

## ❌ VIOLATION #3: Skipping Regression Tests

**Scenario**: New feature added

**WRONG**:
```bash
# Only test new feature
npm run test:unit

# Skip regression
git push
```

**WHY WRONG**:
- Unknown if old features still work
- Risk breaking production

**CORRECT**:
```bash
# Test new feature
npm run test:unit

# Test old features still work
npm run test:regression

# Test integration
npm run test:integration

# Then deploy
git push
```

---

## ❌ VIOLATION #4: No Rollback Plan

**Scenario**: Risky deployment

**WRONG**:
```bash
# Deploy without plan
docker build -t app:latest .
docker push app:latest
kubectl rollout restart deployment/app
```

**WHY WRONG**:
- If deployment breaks, no quick recovery
- User experiences downtime

**CORRECT**:
```bash
# Document rollback
echo "docker tag app:latest app:rollback-$(date +%s)" > rollback.sh
echo "kubectl rollout undo deployment/app" >> rollback.sh

# Deploy
docker build -t app:latest .
docker push app:latest
kubectl rollout restart deployment/app

# Monitor and be ready to rollback
```

---

## ❌ VIOLATION #5: Ignoring Pre-Commit Hooks

**Scenario**: Hook blocks commit

**WRONG**:
```bash
# Bypass hook
git commit --no-verify -m "quick fix"
```

**WHY WRONG**:
- Hook is there to catch violations
- Bypassing defeats purpose
- Risk pushing bad code

**CORRECT**:
```bash
# Fix the issue hook detected
# Let hook verify
git commit -m "proper fix"
```

---

## ✅ CORRECT EXAMPLE: AVI Orchestrator Fix

**Situation**: Orchestrator crashing with missing repository functions

**Process**:
1. **Investigate**: Found stub repositories incomplete
2. **Fix**: Added all 7 missing methods
3. **Test**: Verified orchestrator starts without crashes
4. **Re-enable**: Set AVI_ORCHESTRATOR_ENABLED=true
5. **Verify**: Tested tier filtering AND orchestrator together
6. **Deploy**: Both features working

**Result**: ✅ No broken functionality, user gets both features

---

## ✅ CORRECT EXAMPLE: Feature Flag Pattern

**Situation**: Large feature under development

**Process**:
```javascript
// config.js
const FEATURES = {
  NEW_DASHBOARD: process.env.FEATURE_NEW_DASHBOARD === 'true',
  // Other features
};

// component.js
{FEATURES.NEW_DASHBOARD ? <NewDashboard /> : <OldDashboard />}
```

**Benefits**:
- Old feature still works
- New feature can be tested
- Easy to toggle
- No breaking changes

---

## Pattern Recognition

Common violation patterns:
- `ENABLED=false` in .env
- `--no-verify` in git commands
- "WIP" or "broken" in commit messages
- Skipping test suites
- No rollback documentation
- Commented-out features
- TODO comments about broken features
