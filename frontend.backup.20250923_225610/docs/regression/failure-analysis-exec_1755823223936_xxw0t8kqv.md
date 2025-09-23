# Failure Analysis Report

**Execution ID:** exec_1755823223936_xxw0t8kqv
**Generated:** 2025-08-22T00:40:24.042Z
**Failed Tests:** 3

## Summary

This report provides detailed analysis of test failures to help identify patterns and root causes.

## Failed Tests Overview

| Test ID | Status | Duration | Error Type |
|---------|--------|----------|------------|
| pm-report-test-fail-0 | failed | 10ms | Runtime Error |
| pm-report-test-fail-1 | failed | 10ms | Runtime Error |
| pm-report-test-fail-2 | failed | 12ms | Runtime Error |

## Error Pattern Analysis

### Runtime Error (3 tests)

**Affected Tests:**
- pm-report-test-fail-0
- pm-report-test-fail-1
- pm-report-test-fail-2

**Sample Error:**
```
Mock test pm-report-test-fail-0 failed intentionally
```

**Recommended Actions:**
- Review application logs
- Check for unhandled exceptions
- Verify environment setup

