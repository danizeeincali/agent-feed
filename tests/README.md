# Λvi System Identity Test Suite

Comprehensive Test-Driven Development (TDD) test suite for the Λvi system identity implementation.

## Overview

This test suite validates the Λvi (Lambda vi) system identity feature, ensuring that the avi agent is recognized as a system identity without requiring file loading, maintaining minimal token usage, and providing seamless integration with the existing codebase.

## Test Structure

```
tests/
├── unit/                           # Unit tests
│   └── avi-system-identity.test.js
├── integration/                    # Integration tests (real backend)
│   └── avi-system-identity-integration.test.js
├── validation/                     # Token usage validation
│   └── avi-token-usage.test.js
├── helpers/                        # Test utilities
│   ├── test-db-setup.js           # Database setup helpers
│   └── token-counter.js           # Token counting utilities
└── README.md                       # This file
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test tests/unit/avi-system-identity.test.js
npm test tests/integration/avi-system-identity-integration.test.js
npm test tests/validation/avi-token-usage.test.js
```

## Critical Requirements

1. **NO MOCKS**: All tests use real systems
2. **Performance**: Tests must be fast
3. **Coverage**: Minimum 90% code coverage

See full documentation above for complete details.
