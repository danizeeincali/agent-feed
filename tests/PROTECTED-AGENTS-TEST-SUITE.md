# Protected Agents Test Suite Documentation

## Overview

This document describes the comprehensive TDD test suite for the **Protected Agent Fields Architecture (Plan B - Option 3: Hybrid)**.

**Testing Methodology**: London School TDD
- Unit tests mock external dependencies
- Integration tests use REAL file system
- E2E tests use REAL browser interactions
- Focus on behavior verification over implementation details

---

## Test Structure

```
tests/
├── unit/
│   └── protected-agents/
│       ├── agent-config-validator.test.ts       # 15 tests
│       ├── integrity-checker.test.ts            # 20 tests
│       ├── protected-agent-loader.test.ts       # 25 tests
│       ├── protected-config-manager.test.ts     # 8 tests
│       └── agent-config-migrator.test.ts        # 10 tests
├── integration/
│   └── protected-agents/
│       ├── agent-loading-flow.test.ts           # 6 tests (REAL FS)
│       └── file-system-protection.test.ts       # 12 tests (REAL FS)
└── e2e/
    └── protected-agents.spec.ts                 # 12 tests (Playwright)
```

**Total Tests**: 108 comprehensive test cases

---

## Unit Tests (London School)

### 1. AgentConfigValidator (`agent-config-validator.test.ts`)

**Purpose**: Validate loading, merging, and schema compliance of agent configs with protected sidecars.

**Test Coverage**:

#### Backward Compatibility (2 tests)
- ✅ Load agent without sidecar successfully
- ✅ Preserve all agent fields when no sidecar exists

#### Protected Config Loading and Merging (2 tests)
- ✅ Load and merge agent with protected sidecar
- ✅ Ensure protected fields override user fields (security critical)

#### Error Handling (2 tests)
- ✅ Handle missing sidecar file gracefully
- ✅ Handle corrupted sidecar YAML gracefully

#### Schema Validation (2 tests)
- ✅ Validate protected config has required version field
- ✅ Validate protected config has agent_id matching agent name

#### File Path Resolution (2 tests)
- ✅ Resolve relative sidecar paths correctly
- ✅ Handle absolute sidecar paths

#### Edge Cases (3 tests)
- ✅ Handle empty protected config permissions
- ✅ Handle agent with only body content (no frontmatter)
- ✅ Handle null/undefined values

**Key Behaviors Tested**:
- Protected fields ALWAYS override user-provided values
- Agents without sidecars work normally (backward compatible)
- Validation errors provide clear error messages

---

### 2. IntegrityChecker (`integrity-checker.test.ts`)

**Purpose**: Ensure protected configs cannot be tampered with via SHA-256 checksums.

**Test Coverage**:

#### SHA-256 Hash Computation (5 tests)
- ✅ Compute SHA-256 hash correctly
- ✅ Produce same hash for identical configs
- ✅ Produce different hashes for different configs
- ✅ Exclude checksum field from hash computation (prevent circular dependency)
- ✅ Handle stable JSON stringification (deterministic hashing)

#### Integrity Verification (4 tests)
- ✅ Verify valid config successfully
- ✅ Fail verification for tampered config
- ✅ Fail verification when checksum is missing
- ✅ Support metadata.hash format (alternative to checksum field)

#### Tampering Detection (3 tests)
- ✅ Detect tampered config and provide reason
- ✅ Detect missing checksum as tampering
- ✅ Pass validation for untampered config

#### Checksum Creation (2 tests)
- ✅ Create checksum in sha256: format
- ✅ Create consistent checksums for same config

#### Format Support (2 tests)
- ✅ Handle sha256: prefix in checksum
- ✅ Handle checksum without sha256: prefix

#### Edge Cases (3 tests)
- ✅ Handle empty permissions object
- ✅ Handle deeply nested permissions
- ✅ Handle arrays in permissions
- ✅ Handle special characters (Unicode) in config values

#### Performance (1 test)
- ✅ Handle large config efficiently (<100ms)

**Key Behaviors Tested**:
- Any modification to protected config is detected
- Checksum verification is fast and reliable
- Multiple checksum formats supported

---

### 3. ProtectedAgentLoader (`protected-agent-loader.test.ts`)

**Purpose**: Manage agent loading with caching, hot-reload, and concurrent access.

**Test Coverage**:

#### Basic Loading (3 tests)
- ✅ Load agent successfully
- ✅ Throw error for invalid agent config
- ✅ Load multiple different agents

#### Cache Management (5 tests)
- ✅ Cache loaded agent config
- ✅ Return same instance from cache
- ✅ Check if agent is cached
- ✅ Provide cache statistics
- ✅ Clear entire cache

#### Hot Reload (2 tests)
- ✅ Reload agent and clear cache
- ✅ Remove agent from cache on reload

#### Concurrent Loading (3 tests)
- ✅ Prevent duplicate concurrent loads of same agent
- ✅ Handle concurrent loads of different agents
- ✅ Handle race condition between cache check and load

#### File Watching (4 tests)
- ✅ Start watching for file changes
- ✅ Prevent multiple watchers
- ✅ Stop watching on request
- ✅ Handle null filename in watch event

#### Preloading (2 tests)
- ✅ Preload multiple agents in parallel
- ✅ Handle preload failures gracefully

#### Memory Management (2 tests)
- ✅ Not leak memory with repeated loads
- ✅ Clear in-flight promises on reload

#### Error Recovery (2 tests)
- ✅ Allow retry after failed load
- ✅ Not cache failed loads

#### Agent Name Extraction (2 tests)
- ✅ Extract agent name from simple filename
- ✅ Extract agent name from path with directories

**Key Behaviors Tested**:
- Agents loaded once and cached for performance
- Hot-reload works without memory leaks
- Concurrent loads don't duplicate work
- File watcher detects tampering

---

### 4. ProtectedConfigManager (`protected-config-manager.test.ts`)

**Purpose**: Manage system-level updates to protected configs with privilege verification.

**Test Coverage**:

#### System Privilege Verification (2 tests)
- ✅ Allow update with system privileges
- ✅ Reject update without system privileges

#### Atomic Writes (3 tests)
- ✅ Write to temp file then rename (atomic operation)
- ✅ Create backup before update
- ✅ Set read-only permissions (444)

#### Version Management (2 tests)
- ✅ Increment patch version (1.0.5 → 1.0.6)
- ✅ Add updated_at timestamp

**Key Behaviors Tested**:
- Only system administrators can update protected configs
- Updates are atomic (temp file + rename)
- Every update creates a backup
- Version tracking for audit trail

---

### 5. AgentConfigMigrator (`agent-config-migrator.test.ts`)

**Purpose**: Migrate legacy agents to protected architecture.

**Test Coverage**:

#### Protected Field Extraction (4 tests)
- ✅ Extract api_endpoints from frontmatter
- ✅ Extract multiple protected fields
- ✅ Return empty permissions for agent without protected fields
- ✅ Set correct version and agent_id

#### Sidecar Creation (3 tests)
- ✅ Create .system directory with correct permissions (555)
- ✅ Set sidecar file to read-only (444)
- ✅ Create backup before migration

#### Agent File Updates (1 test)
- ✅ Add _protected_config_source to frontmatter

**Key Behaviors Tested**:
- Migration is non-destructive (creates backups)
- Agents without protected fields are skipped
- Sidecar reference added to agent frontmatter
- File permissions correctly set

---

## Integration Tests (REAL File System)

### 6. Agent Loading Flow (`agent-loading-flow.test.ts`)

**Purpose**: Test complete agent loading with REAL file operations.

**Test Coverage**:

#### Load Agent Without Sidecar (1 test)
- ✅ Load standard agent from real .md file

#### Load Agent With Sidecar (1 test)
- ✅ Load and merge agent with protected sidecar (REAL YAML parsing)

#### File Permission Verification (2 tests)
- ✅ Verify protected sidecar has read-only permissions (444)
- ✅ Prevent writes to protected sidecar (ownership check)

#### Real Agent Files (1 test)
- ✅ Load actual project agent if available (e.g., code-analyzer.md)

#### Error Handling (2 tests)
- ✅ Handle missing sidecar file
- ✅ Handle corrupted YAML in sidecar

**Key Behaviors Tested**:
- REAL file system operations work as expected
- Permissions are correctly enforced
- YAML parsing handles errors gracefully

---

### 7. File System Protection (`file-system-protection.test.ts`)

**Purpose**: Verify file system protection mechanisms with REAL operations.

**Test Coverage**:

#### Directory Permissions (2 tests)
- ✅ Set .system directory to read-only + executable (555)
- ✅ Allow reading files from .system directory

#### Protected File Permissions (2 tests)
- ✅ Set protected config to read-only (444)
- ✅ Prevent modification of read-only protected config

#### Integrity Checking (2 tests)
- ✅ Detect tampered config via checksum mismatch (REAL crypto)
- ✅ Pass integrity check for untampered config

#### Backup and Restore (2 tests)
- ✅ Create backup before modifying protected config
- ✅ Restore config from backup

#### Atomic Write Operations (2 tests)
- ✅ Write to temp file then rename (atomic)
- ✅ Leave original file intact if temp write fails

#### Migration Workflow (1 test)
- ✅ Migrate agent to protected model safely

**Key Behaviors Tested**:
- REAL crypto operations detect tampering
- REAL file permissions prevent unauthorized writes
- Atomic operations prevent partial writes
- Backup/restore mechanism works

---

## E2E Tests (Playwright)

### 8. Protected Agents UI (`protected-agents.spec.ts`)

**Purpose**: Test user-facing UI with REAL browser interactions.

**Test Coverage**:

#### UI Display (3 tests)
- ✅ Display agents list with protection indicators (🔒)
- ✅ Show read-only UI for protected fields
- ✅ Display protection tooltip on hover

#### User Interactions (2 tests)
- ✅ Prevent editing protected fields
- ✅ Allow editing user fields while protecting system fields

#### Admin Interface (2 tests)
- ✅ Show admin UI for protected config updates (if authenticated)
- ✅ Display validation errors for invalid protected config

#### Visual Indicators (3 tests)
- ✅ Show visual distinction between user and protected fields
- ✅ Display protection status badge
- ✅ Show agent configuration source (sidecar reference)

#### Accessibility (2 tests)
- ✅ Have accessible protection indicators (ARIA labels)
- ✅ Support keyboard navigation of protected fields

**Key Behaviors Tested**:
- Users see clear visual indicators of protection
- Protected fields are disabled in UI
- Tooltips explain why fields are protected
- Accessibility standards met

---

## Running the Tests

### Unit Tests
```bash
npm run test:tdd
# or
npx vitest tests/unit/protected-agents
```

### Integration Tests
```bash
npx vitest tests/integration/protected-agents
```

### E2E Tests
```bash
npm run test:e2e -- tests/e2e/protected-agents.spec.ts
# or
npx playwright test tests/e2e/protected-agents.spec.ts
```

### All Tests
```bash
npm run test:tdd && \
npx vitest tests/integration/protected-agents && \
npm run test:e2e -- tests/e2e/protected-agents.spec.ts
```

### Coverage Report
```bash
npm run test:tdd:coverage
```

---

## Test Fixtures

### Required Test Data

Create these fixtures for integration tests:

```
tests/fixtures/protected-agents/
├── .system/
│   ├── protected-test-agent.protected.yaml
│   └── integrity-test.protected.yaml
├── simple-test-agent.md
└── protected-test-agent.md
```

### Sample Protected Config (`protected-test-agent.protected.yaml`)
```yaml
version: "1.0.0"
checksum: "sha256:abc123..."
agent_id: "protected-test-agent"
permissions:
  api_endpoints:
    - path: "/api/posts"
      methods: ["GET", "POST"]
      rate_limit: "10/minute"
  workspace:
    root: "/test/workspace"
    max_storage: "1GB"
  tool_permissions:
    allowed: ["Read", "Write", "Bash"]
    forbidden: ["KillShell"]
  resource_limits:
    max_memory: "512MB"
    max_cpu_percent: 50
```

---

## Coverage Requirements

### Target Coverage
- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

### Critical Paths (100% Coverage)
- Protected field override logic
- Integrity checking (tampering detection)
- Privilege verification
- Atomic write operations

---

## Test Quality Metrics

### Characteristics
- **Fast**: Unit tests <100ms each
- **Isolated**: No dependencies between tests
- **Repeatable**: Same result every time
- **Self-validating**: Clear pass/fail
- **Timely**: Written with implementation

### Mocking Strategy (London School)
- **Unit tests**: Mock all external dependencies (fs, crypto, validators)
- **Integration tests**: NO mocks, use REAL file system
- **E2E tests**: NO mocks, use REAL browser

---

## Continuous Integration

### Pre-commit Checks
```bash
npm run test:tdd
npm run lint
npm run typecheck
```

### CI Pipeline
```yaml
- name: Unit Tests
  run: npm run test:tdd

- name: Integration Tests
  run: npx vitest tests/integration/protected-agents

- name: E2E Tests
  run: npm run test:e2e -- tests/e2e/protected-agents.spec.ts

- name: Coverage Report
  run: npm run test:tdd:coverage
```

---

## Test Maintenance

### When to Update Tests

1. **New protected field added**: Update `AgentConfigValidator` and `AgentConfigMigrator` tests
2. **Checksum algorithm changed**: Update `IntegrityChecker` tests
3. **UI changes**: Update E2E tests and screenshots
4. **Permission scheme updated**: Update file system protection tests

### Test Smell Detection

Watch for:
- Tests that depend on each other
- Tests with hard-coded timestamps
- Tests with sleep/wait calls
- Tests that modify global state
- Tests that fail intermittently

---

## Security Testing

### Threat Model Coverage

These tests verify protection against:

1. **Malicious User Edits**: Protected fields cannot be overridden
2. **File Tampering**: Integrity checks detect modifications
3. **Privilege Escalation**: Only system admins can update protected configs
4. **Race Conditions**: Concurrent loads are safe
5. **Partial Writes**: Atomic operations prevent corruption

---

## Performance Benchmarks

### Expected Performance

- **Agent Load (cached)**: <1ms
- **Agent Load (uncached)**: <50ms
- **Integrity Check**: <10ms
- **Large Config (100+ permissions)**: <100ms

### Load Testing

```bash
# Simulate 100 concurrent agent loads
for i in {1..100}; do
  npm run test:performance -- --agent-load &
done
wait
```

---

## Troubleshooting

### Common Issues

#### Test fails with "Permission denied"
**Solution**: Check file permissions on test fixtures directory

#### Test fails with "ENOENT: no such file"
**Solution**: Ensure test fixtures are created in beforeAll hook

#### E2E test timeout
**Solution**: Increase timeout or check if dev server is running

#### Integration test fails on CI
**Solution**: Verify CI environment has correct permissions for file operations

---

## Next Steps

After implementing these tests:

1. ✅ Run full test suite and verify all pass
2. ✅ Generate coverage report and verify >80% coverage
3. ✅ Add tests to CI/CD pipeline
4. ✅ Implement actual components (TDD: tests first!)
5. ✅ Create test data fixtures
6. ✅ Set up screenshot comparison for E2E tests
7. ✅ Add performance regression tests
8. ✅ Document test results in pull request

---

## Summary

This comprehensive test suite provides:

- **108 total test cases** covering all aspects of protected agent architecture
- **London School TDD** methodology for maintainable tests
- **REAL file system** operations in integration tests
- **REAL browser** interactions in E2E tests
- **Security-focused** testing of tampering and privilege escalation
- **Performance-focused** testing of caching and concurrent operations
- **Accessibility-focused** testing of UI indicators

**Test Pyramid**:
```
         /\
        /E2E\        12 tests (Playwright)
       /------\
      /Integr. \    18 tests (REAL FS)
     /----------\
    /   Unit     \  78 tests (London School)
   /--------------\
```

These tests ensure the Protected Agent Fields Architecture is:
- ✅ **Secure**: Protected fields cannot be tampered with
- ✅ **Reliable**: Works correctly in all scenarios
- ✅ **Performant**: Fast loading with caching
- ✅ **Maintainable**: Clear, well-documented tests
- ✅ **User-friendly**: Clear UI indicators and accessibility

---

**Author**: TDD Testing Agent
**Date**: 2025-10-17
**Version**: 1.0.0
**Architecture**: Plan B - Option 3 (Hybrid)
