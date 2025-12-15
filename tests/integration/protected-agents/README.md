# Protected Agents Integration Tests

Comprehensive test suite for validating meta-agent and meta-update-agent protected configuration capabilities.

## Quick Start

```bash
# Run all tests
npm run test -- tests/integration/protected-agents/meta-agents-protected-config.test.ts

# Or use the test runner script
./tests/integration/protected-agents/run-meta-agents-tests.sh

# Watch mode
./tests/integration/protected-agents/run-meta-agents-tests.sh --watch

# With coverage
./tests/integration/protected-agents/run-meta-agents-tests.sh --coverage
```

## Test Files

### Main Test Suite
**File**: `meta-agents-protected-config.test.ts`
- 31 comprehensive integration tests
- Real file system operations (no mocks)
- SHA-256 checksum validation
- File permission verification
- Template validation for all 4 agent types

### Test Utilities
**File**: `meta-agents-test-utils.ts`
- ChecksumUtil: SHA-256 checksum computation and verification
- TestAgentFactory: Agent config generation with templates
- FileSystemUtil: File operations and permission management
- ProtectedConfigValidator: Config validation and field counting
- TestCleanup: Automated test artifact cleanup

### Test Runner
**File**: `run-meta-agents-tests.sh`
- Dependency checking
- Environment setup
- Test execution with options
- Results reporting
- Automated cleanup

### Test Results
**File**: `TEST-RESULTS-REPORT.md`
- Detailed test results and analysis
- Coverage breakdown by test category
- Production readiness assessment
- Recommendations and next steps

## Test Coverage

### 1. Meta-Agent Protected Config Creation (8 tests)
- System agent creation with valid protected config
- User-facing agent with correct protection levels
- Infrastructure agent with high resource limits
- Protected config source in agent frontmatter
- All 31+ protected fields validation
- Directory permissions (555)
- File permissions (444)
- Permission persistence across reads

### 2. Meta-Update-Agent Protected Config Updates (7 tests)
- Protected field routing to protected config
- SHA-256 checksum recomputation
- Permission maintenance after updates
- User-editable field routing to markdown
- Protected config isolation from user fields
- Backup creation before modifications
- Rollback on validation failure

### 3. Field Classification (4 tests)
- Protected fields identification (31+ fields)
- User-editable fields identification (28+ fields)
- isProtectedField helper validation
- isUserEditableField helper validation

### 4. SHA-256 Checksum Computation (6 tests)
- Identical checksums for same config
- Different checksums for different configs
- Checksum format with sha256: prefix
- Checksum extraction from prefix
- Valid checksum verification
- Tampered config detection

### 5. IntegrityChecker Integration (2 tests)
- IntegrityChecker verification of valid configs
- Integrity violation detection

### 6. Template Validation (4 tests)
- System agent template validation
- User-facing agent template validation
- Infrastructure agent template validation
- QA agent template validation

## Test Results Summary

**Status**: ✅ ALL TESTS PASSED
**Total Tests**: 31 passing
**Pass Rate**: 100%
**Execution Time**: ~2.3 seconds

## Key Features Validated

### ✅ Real File System Operations
- Actual file creation, reading, writing, deletion
- Real permission checks with fs.stat()
- No mocks or simulations

### ✅ Cryptographic Integrity
- Real SHA-256 hashing with Node.js crypto
- Deterministic serialization
- Tamper detection working

### ✅ File Permission Management
- Directory: 555 (r-xr-xr-x)
- Files: 444 (r--r--r--)
- OS-level protection verified

### ✅ Field Classification
- 31+ protected fields (system-controlled)
- 28+ user-editable fields (user-customizable)
- Correct routing to appropriate files

### ✅ Template System
- System: 100/hour, 512MB, 60% CPU
- User-Facing: 5/hour, 256MB, 30% CPU
- Infrastructure: 200/hour, 1GB, 80% CPU
- QA: 50/hour, 512MB, 50% CPU

## Architecture References

- **Field Classification**: `/workspaces/agent-feed/src/config/schemas/field-classification.ts`
- **Integrity Checker**: `/workspaces/agent-feed/src/config/validators/integrity-checker.ts`
- **Protected Configs**: `/workspaces/agent-feed/prod/.claude/agents/.system/`
- **Agent Definitions**: `/workspaces/agent-feed/prod/.claude/agents/`

## Agent Type Templates

### System Agent
- **Use Case**: Meta-agents, production validators, system operations
- **Rate Limit**: 100/hour
- **Resources**: 512MB memory, 60% CPU, 300s execution
- **Posting**: Never auto-posts

### User-Facing Agent
- **Use Case**: Task managers, coordinators, interactive agents
- **Rate Limit**: 5/hour
- **Resources**: 256MB memory, 30% CPU, 180s execution
- **Posting**: Auto-posts substantial outcomes

### Infrastructure Agent
- **Use Case**: Monitoring, logging, backup agents
- **Rate Limit**: 200/hour
- **Resources**: 1GB memory, 80% CPU, 600s execution
- **Posting**: Never auto-posts

### QA Agent
- **Use Case**: Testing, validation, verification agents
- **Rate Limit**: 50/hour
- **Resources**: 512MB memory, 50% CPU, 300s execution
- **Posting**: Posts on failure

## Production Readiness

✅ **Meta-Agent** - Ready for production deployment
✅ **Meta-Update-Agent** - Ready for production deployment
✅ **Protected Config System** - Fully validated
✅ **Integrity Verification** - Working correctly
✅ **File Protection** - OS-level security confirmed

## Next Steps

1. **Integration Testing**: Test in production environment
2. **End-to-End Testing**: Full agent lifecycle (create → update → delete)
3. **Performance Testing**: Checksum computation at scale
4. **Security Audit**: Cross-platform permission enforcement
5. **Documentation**: Update agent creation guides

## Related Documentation

- [SPARC Protected Agent Fields Architecture](../../../docs/SPARC-PROTECTED-AGENT-FIELDS-ARCHITECTURE.md)
- [SPARC Protected Agent Fields Spec](../../../docs/SPARC-PROTECTED-AGENT-FIELDS-SPEC.md)
- [Protected Agents Code Review](../../../docs/PROTECTED-AGENTS-CODE-REVIEW.md)
- [Protected Agents Test Suite](../../tests/PROTECTED-AGENTS-TEST-SUITE.md)

---

**Last Updated**: 2025-10-17
**Test Suite Version**: 1.0.0
**Maintained By**: SPARC Tester Agent
