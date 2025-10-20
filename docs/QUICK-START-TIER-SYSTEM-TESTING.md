# Quick Start: Tier System Testing

**Status**: Phase 1 Complete ✅
**Last Updated**: 2025-10-19

---

## Run All Tests

```bash
# Run all tier system unit tests
npm test -- tests/unit/tier-classification.test.js tests/unit/protection-validation.test.js

# Run with coverage
npm test -- tests/unit/tier-classification.test.js tests/unit/protection-validation.test.js --coverage --collectCoverageFrom='api-server/services/*.service.js'

# Run in watch mode
npm test -- tests/unit/tier-classification.test.js tests/unit/protection-validation.test.js --watch
```

---

## Test Results Summary

```
✅ Test Suites: 2 passed, 2 total
✅ Tests:       48 passed, 48 total
✅ Time:        ~1.8 seconds
✅ Coverage:    89.1% statements, 94.23% branches
```

---

## File Locations

### Service Files
```
/workspaces/agent-feed/api-server/services/
├── tier-classification.service.js     (100% coverage)
└── protection-validation.service.js   (82% coverage)
```

### Test Files
```
/workspaces/agent-feed/tests/unit/
├── tier-classification.test.js        (27 tests)
└── protection-validation.test.js      (21 tests)
```

### Documentation
```
/workspaces/agent-feed/docs/
├── ARCHITECTURE-TESTING-INTEGRATION.md       (Complete architecture)
├── TDD-IMPLEMENTATION-PHASE-1-SUMMARY.md    (Implementation summary)
├── PHASE-1-TEST-COVERAGE-REPORT.md          (Coverage analysis)
└── QUICK-START-TIER-SYSTEM-TESTING.md       (This file)
```

---

## Service Usage Examples

### Tier Classification

```javascript
const TierService = require('./api-server/services/tier-classification.service.js');

// Determine tier from file path
const tier = TierService.DetermineAgentTier('/agents/.system/meta-agent.md');
// → 2

// Classify from frontmatter
const tier2 = TierService.ClassifyTier({ name: 'personal-todos-agent' });
// → 1

// Validate agent data
const result = TierService.ValidateAgentData({
  name: 'test-agent',
  tier: 1
});
// → { isValid: true, errors: [], warnings: [] }

// Get registries
const registry = TierService.GetTierRegistry();
// → { tier1: [...8 agents], tier2: [...11 agents] }
```

### Protection Validation

```javascript
const ProtectionService = require('./api-server/services/protection-validation.service.js');

// Check protection status
const protection = ProtectionService.DetermineProtectionStatus(
  { slug: 'meta-agent', tier: 2, visibility: 'protected' },
  { isAdmin: false }
);
// → {
//     isProtected: true,
//     protectionReason: 'TIER2_PROTECTED',
//     canEdit: false,
//     canDelete: false
//   }

// Check if user can modify
const canModify = ProtectionService.CanUserModifyAgent(agent, user);
// → true/false

// Get badge configuration
const badgeConfig = ProtectionService.GetProtectionBadgeConfig(protection);
// → { text: 'Protected', color: '#F59E0B', icon: 'ShieldAlert' }

// Get protected agent registry
const registry = ProtectionService.GetProtectedAgentRegistry();
// → {
//     phase42Specialists: [...6 agents],
//     metaCoordination: [...2 agents],
//     allProtected: [...8 agents]
//   }
```

---

## Test Examples

### Running Specific Test Groups

```bash
# Run only tier classification tests
npm test -- tests/unit/tier-classification.test.js

# Run only protection validation tests
npm test -- tests/unit/protection-validation.test.js

# Run tests matching pattern
npm test -- --testNamePattern="DetermineAgentTier"

# Run with verbose output
npm test -- tests/unit/tier-classification.test.js --verbose
```

---

## Coverage Thresholds

```json
{
  "tier-classification.service.js": {
    "statements": 100,
    "branches": 100,
    "functions": 100,
    "lines": 100
  },
  "protection-validation.service.js": {
    "statements": 82.53,
    "branches": 86.36,
    "functions": 83.33,
    "lines": 82.53
  },
  "overall": {
    "statements": 89.1,
    "branches": 94.23,
    "functions": 92.3,
    "lines": 89.0
  }
}
```

---

## Agent Registries

### Tier 1 Agents (8)
```
personal-todos-agent
meeting-prep-agent
meeting-next-steps-agent
follow-ups-agent
get-to-know-you-agent
link-logger-agent
agent-ideas-agent
agent-feedback-agent
```

### Tier 2 Agents (11)
```
meta-agent
meta-update-agent
skills-architect-agent
skills-maintenance-agent
agent-architect-agent
agent-maintenance-agent
learning-optimizer-agent
system-architect-agent
page-builder-agent
page-verification-agent
dynamic-page-testing-agent
```

### Protected Agents (8)
```
Phase 4.2 Specialists (6):
  - skills-architect-agent
  - agent-architect-agent
  - skills-maintenance-agent
  - agent-maintenance-agent
  - learning-optimizer-agent
  - system-architect-agent

Meta Coordination (2):
  - meta-agent
  - meta-update-agent
```

---

## Next Steps

### Phase 2: Icon Loading & Filtering (Pending)
- Create icon loading service
- Implement filtering utilities
- Add 25 more unit tests
- Target: 73 total tests

### Phase 3: Integration Tests (Pending)
- API endpoint testing
- Database integration
- 30 integration tests
- Target: 90% API coverage

### Phase 4: E2E Tests (Pending)
- Playwright testing
- Visual regression
- 10 E2E scenarios
- Screenshot validation

---

## Troubleshooting

### Tests Failing?

```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests with full error output
npm test -- tests/unit/tier-classification.test.js --verbose --no-coverage

# Check Node version (requires 20.x)
node --version
```

### Coverage Not Showing?

```bash
# Ensure you're using the correct coverage paths
npm test -- tests/unit/*.test.js \
  --coverage \
  --collectCoverageFrom='api-server/services/*.service.js' \
  --coverageDirectory='./tests/coverage'
```

### Module Not Found?

```bash
# Verify service files exist
ls -la api-server/services/tier-classification.service.js
ls -la api-server/services/protection-validation.service.js

# Verify test files exist
ls -la tests/unit/tier-classification.test.js
ls -la tests/unit/protection-validation.test.js
```

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Total Tests | 48 |
| Test Pass Rate | 100% |
| Test Execution Time | 1.8s |
| Statement Coverage | 89.1% |
| Branch Coverage | 94.23% |
| Function Coverage | 92.3% |
| Services Implemented | 2 |
| Functions Exported | 12 |
| Lines of Test Code | 679 |
| Lines of Service Code | 555 |

---

**Document Status**: Active
**Maintained By**: System Architect
**Last Test Run**: 2025-10-19 (All Passing ✅)
