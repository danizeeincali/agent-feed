# Failure Analysis Report

**Execution ID:** exec_1755815692899_uubf23tvv
**Generated:** 2025-08-21T22:34:52.955Z
**Failed Tests:** 2

## Summary

This report provides detailed analysis of test failures to help identify patterns and root causes.

## Failed Tests Overview

| Test ID | Status | Duration | Error Type |
|---------|--------|----------|------------|
| execution-test-fail-0 | failed | 10ms | Runtime Error |
| execution-test-fail-1 | failed | 10ms | Runtime Error |

## Error Pattern Analysis

### Runtime Error (2 tests)

**Affected Tests:**
- execution-test-fail-0
- execution-test-fail-1

**Sample Error:**
```
Mock test execution-test-fail-0 failed intentionally
```

**Recommended Actions:**
- Review application logs
- Check for unhandled exceptions
- Verify environment setup

