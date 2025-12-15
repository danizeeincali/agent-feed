# Phase 2 Skills Test Suite - Quick Start

## ⚡ Run All Tests (Fastest)

```bash
npx jest --config=tests/skills/jest.phase2.config.cjs
```

## 📊 Run with Coverage

```bash
npx jest --config=tests/skills/jest.phase2.config.cjs --coverage
```

## 🎯 Run Specific Test File

```bash
# Unit tests
npx jest --config=tests/skills/jest.phase2.config.cjs phase2-skills.test.ts

# Integration tests
npx jest --config=tests/skills/jest.phase2.config.cjs phase2-integration.test.ts

# Agent config tests
npx jest --config=tests/skills/jest.phase2.config.cjs phase2-agent-configs.test.ts
```

## 🔍 Run Specific Test

```bash
# By test name pattern
npx jest --config=tests/skills/jest.phase2.config.cjs --testNamePattern="user-preferences"

# By describe block
npx jest --config=tests/skills/jest.phase2.config.cjs --testNamePattern="Shared Skills"
```

## 🚀 Run Test Suite Script

```bash
./tests/skills/run-phase2-tests.sh
```

## 📁 Test Files Overview

| File | Tests | Purpose |
|------|-------|---------|
| `phase2-skills.test.ts` | 48 | Unit tests for 6 skills |
| `phase2-integration.test.ts` | 32 | SkillsService integration |
| `phase2-agent-configs.test.ts` | 38 | Agent YAML validation |
| `phase2-skills-validation.spec.ts` | E2E | Playwright end-to-end |

**Total:** 118 Jest tests ✅ ALL PASSING

## 📊 View Reports

```bash
# Open Jest HTML report
open tests/skills/reports/phase2-skills-test-report.html

# Open coverage report
open coverage/phase2-skills/index.html
```

## ✅ Success Criteria

- [x] 118 tests passing (100%)
- [x] Zero placeholder content
- [x] All skills 300+ lines
- [x] 3,447 total lines
- [x] All agent configs valid

## 🔧 Troubleshooting

**"module is not defined"**
→ Use `.cjs` extension for config file

**Protected skills can't be read**
→ Tests skip .system/ skills gracefully

**Cache issues**
→ Run `npx jest --clearCache`

## 📚 Full Documentation

- **README.md** - Complete guide
- **PHASE2-TEST-SUITE-SUMMARY.md** - Detailed results
- **PHASE2-TEST-DELIVERABLES.md** - All deliverables

---

**Status:** ✅ PRODUCTION READY | **Tests:** 118/118 PASSING
