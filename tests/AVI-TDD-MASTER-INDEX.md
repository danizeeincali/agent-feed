# Λvi System Identity - TDD Test Suite Master Index

## 🎯 Quick Navigation

### Start Here 👇
- **New to the project?** → [Quick Start Guide](AVI-TDD-QUICK-START.md)
- **Want full details?** → [Complete Guide](AVI-SYSTEM-IDENTITY-TDD-COMPLETE.md)
- **Need test docs?** → [README](README.md)
- **Check progress?** → [Files Verification](AVI-TDD-FILES-VERIFICATION.md)

---

## 📁 Core Test Files

### Unit Tests (50+ tests)
**Purpose**: Test core system identity logic without external dependencies

**File**: [`/tests/unit/avi-system-identity.test.js`](unit/avi-system-identity.test.js)

**Test Coverage**:
- ✅ TC-001: System identity recognition (`agentId === 'avi'`)
- ✅ TC-002: No file loading attempt for avi
- ✅ TC-003: Lightweight frontmatter returned
- ✅ TC-004: Display name "Λvi (Amplifying Virtual Intelligence)"
- ✅ TC-005: Token usage < 500 tokens
- ✅ TC-006: Regular agents still load from files
- ✅ TC-009: Frontend rendering compatibility
- ✅ Edge cases and error handling
- ✅ Performance requirements (< 1ms)

**Run Command**: `npm test tests/unit/avi-system-identity.test.js`

---

### Integration Tests (30+ tests)
**Purpose**: Test complete integration with REAL database, file system, and workers

**File**: [`/tests/integration/avi-system-identity-integration.test.js`](integration/avi-system-identity-integration.test.js)

**Test Coverage**:
- ✅ TC-002: No file loading for avi (real file system)
- ✅ TC-006: Regular agents still load files
- ✅ TC-007: Existing avi posts continue working
- ✅ TC-008: Database compatibility (SQLite)
- ✅ TC-010: End-to-end ticket processing
- ✅ Real file system integration
- ✅ Performance and scalability
- ✅ Data integrity and consistency

**⚠️ IMPORTANT**: Uses 100% REAL backend (NO MOCKS)
- Real SQLite database
- Actual file system
- Real worker threads

**Run Command**: `npm test tests/integration/avi-system-identity-integration.test.js`

---

### Validation Tests (25+ tests)
**Purpose**: Validate token usage and performance requirements

**File**: [`/tests/validation/avi-token-usage.test.js`](validation/avi-token-usage.test.js)

**Test Coverage**:
- ✅ TC-005: Token usage under 500 token budget
- ✅ Token usage breakdown by field
- ✅ Efficiency comparisons (95%+ savings vs file loading)
- ✅ Real-world usage patterns
- ✅ Token optimization validation
- ✅ Performance impact measurement
- ✅ Token budget compliance

**Run Command**: `npm test tests/validation/avi-token-usage.test.js`

---

## 🛠️ Helper Utilities

### Database Setup Helper
**File**: [`/tests/helpers/test-db-setup.js`](helpers/test-db-setup.js)

**Features**:
- Fresh SQLite database creation
- Schema initialization
- Test data seeding
- Cleanup utilities
- Statistics reporting

**Usage**:
```javascript
const { createTestDatabase } = require('./helpers/test-db-setup');

const dbHelper = createTestDatabase('my-test');
await dbHelper.initialize();
dbHelper.seedTestData();
// ... run tests ...
await dbHelper.cleanup();
```

---

### Token Counter Utility
**File**: [`/tests/helpers/token-counter.js`](helpers/token-counter.js)

**Features**:
- Token estimation algorithms
- Budget validation
- Comparison tools
- Performance profiling
- Batch measurement

**Usage**:
```javascript
const { calculateObjectTokens } = require('./helpers/token-counter');

const tokens = calculateObjectTokens(frontmatter);
console.log(`Token count: ${tokens}`);
```

---

## ⚙️ Configuration

### Jest Configuration
**File**: [`/tests/jest.config.js`](jest.config.js)

**Settings**:
- Test patterns
- Coverage thresholds (80%+)
- Timeout: 30s for integration tests
- Reporter configuration
- Coverage directory

---

### Test Setup
**File**: [`/tests/setup.js`](setup.js)

**Features**:
- Global constants
- Custom matchers (`toBeAviAgent`, `toBeWithinTokenBudget`)
- Performance helpers
- Environment configuration

---

## 🚀 Execution

### Test Runner Script
**File**: [`/tests/run-tests.sh`](run-tests.sh)

**Commands**:
```bash
./run-tests.sh all         # Run all tests
./run-tests.sh unit        # Unit tests only
./run-tests.sh integration # Integration tests
./run-tests.sh validation  # Validation tests
./run-tests.sh coverage    # With coverage report
./run-tests.sh watch       # Watch mode
./run-tests.sh quick       # Quick test (no verbose)
./run-tests.sh clean       # Clean artifacts
./run-tests.sh stats       # Show statistics
./run-tests.sh file <path> # Run specific test
./run-tests.sh help        # Show help
```

**Examples**:
```bash
# Run all tests
./run-tests.sh

# Run unit tests only
./run-tests.sh unit

# Run with coverage
./run-tests.sh coverage

# Watch mode for TDD
./run-tests.sh watch
```

---

## 📚 Documentation

### 1. Quick Start Guide
**File**: [AVI-TDD-QUICK-START.md](AVI-TDD-QUICK-START.md)

**For**: Developers who want to start immediately
**Content**: 5-minute setup and run guide

---

### 2. Complete Guide
**File**: [AVI-SYSTEM-IDENTITY-TDD-COMPLETE.md](AVI-SYSTEM-IDENTITY-TDD-COMPLETE.md)

**For**: Comprehensive understanding of entire test suite
**Content**: 
- What was created
- Test coverage matrix
- Key features
- How to use
- Performance targets
- File summary

---

### 3. Test README
**File**: [README.md](README.md)

**For**: General test suite documentation
**Content**:
- Test structure
- Test categories
- Running tests
- Requirements
- Troubleshooting

---

### 4. Test Summary
**File**: [TEST-SUMMARY.md](TEST-SUMMARY.md)

**For**: Detailed summary of test implementation
**Content**:
- Test files overview
- Coverage by test case
- Key principles
- Test statistics
- Success metrics

---

### 5. Files Verification
**File**: [AVI-TDD-FILES-VERIFICATION.md](AVI-TDD-FILES-VERIFICATION.md)

**For**: Verify all files created successfully
**Content**: Checklist of all 15 files with status

---

### 6. This File (Master Index)
**File**: [AVI-TDD-MASTER-INDEX.md](AVI-TDD-MASTER-INDEX.md)

**For**: Central navigation hub
**Content**: Links to all test files and documentation

---

## 🎯 Test Coverage Matrix

| Test Case | Description | Files Covering It |
|-----------|-------------|-------------------|
| **TC-001** | System identity recognition | Unit Tests |
| **TC-002** | No file loading for avi | Unit + Integration |
| **TC-003** | Lightweight frontmatter | Unit Tests |
| **TC-004** | Display name verification | Unit + Validation |
| **TC-005** | Token usage < 500 tokens | Unit + Validation |
| **TC-006** | Regular agents load files | Unit + Integration |
| **TC-007** | Existing avi posts work | Integration |
| **TC-008** | Database compatibility | Integration |
| **TC-009** | Frontend rendering | Unit Tests |
| **TC-010** | End-to-end processing | Integration |

**Total**: 105+ test cases

---

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| **Total Files** | 15 |
| **Test Files** | 3 |
| **Helper Files** | 2 |
| **Config Files** | 2 |
| **Script Files** | 1 |
| **Documentation** | 6 |
| **Total Tests** | 105+ |
| **Lines of Code** | ~3,650 |
| **Coverage Target** | 90%+ |
| **Execution Time** | < 10s |

---

## 🚦 Getting Started (3 Steps)

### 1. Install Dependencies
```bash
cd /workspaces/agent-feed
npm install better-sqlite3 jest --save-dev
```

### 2. Run Tests
```bash
cd tests
./run-tests.sh all
```

**Expected**: All tests FAIL (implementation doesn't exist yet)

### 3. Implement Features
Follow TDD cycle: Red → Green → Refactor

---

## ✅ Verification Checklist

### Files Created
- [x] Unit tests: `unit/avi-system-identity.test.js`
- [x] Integration tests: `integration/avi-system-identity-integration.test.js`
- [x] Validation tests: `validation/avi-token-usage.test.js`
- [x] Database helper: `helpers/test-db-setup.js`
- [x] Token counter: `helpers/token-counter.js`
- [x] Jest config: `jest.config.js`
- [x] Test setup: `setup.js`
- [x] Test runner: `run-tests.sh` (executable)
- [x] Documentation: 6 markdown files

### Test Coverage
- [x] TC-001: System identity recognition
- [x] TC-002: No file loading
- [x] TC-003: Lightweight frontmatter
- [x] TC-004: Display name
- [x] TC-005: Token usage
- [x] TC-006: Regular agents
- [x] TC-007: Existing posts
- [x] TC-008: Database
- [x] TC-009: Frontend
- [x] TC-010: End-to-end

### Quality Requirements
- [x] 100% real backend (NO MOCKS)
- [x] Fast execution (< 10s)
- [x] Comprehensive coverage (105+ tests)
- [x] Clear documentation
- [x] TDD approach (tests first)

---

## 🎓 TDD Workflow

```
1. Read Test → Understand requirement
2. Run Test → Watch it FAIL (Red)
3. Write Code → Make it PASS (Green)
4. Refactor → Improve code
5. Repeat → Next test
```

---

## 📞 Support

### Need Help?
1. Check [Quick Start Guide](AVI-TDD-QUICK-START.md)
2. Review [Complete Guide](AVI-SYSTEM-IDENTITY-TDD-COMPLETE.md)
3. Read [README](README.md)
4. Check [Files Verification](AVI-TDD-FILES-VERIFICATION.md)

### Troubleshooting?
See [README - Troubleshooting Section](README.md#troubleshooting)

---

## 🎉 Summary

✅ **Complete TDD test suite** for Λvi system identity
✅ **105+ test cases** covering all critical paths
✅ **100% real backend** (NO MOCKS)
✅ **Comprehensive documentation** (6 guides)
✅ **Ready for implementation** - tests written FIRST

**Start implementing and let the tests guide you to success!**

---

**Created**: 2025-10-27
**Status**: ✅ Complete
**Approach**: Test-Driven Development (TDD)
**Principle**: NO MOCKS - 100% Real Backend Testing
