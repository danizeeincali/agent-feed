# Failure Analysis Report

**Execution ID:** exec_1755704675455_6uzof8yg8
**Generated:** 2025-08-20T15:44:36.523Z
**Failed Tests:** 5

## Summary

This report provides detailed analysis of test failures to help identify patterns and root causes.

## Failed Tests Overview

| Test ID | Status | Duration | Error Type |
|---------|--------|----------|------------|
| large-suite-fail-0 | failed | 11ms | Runtime Error |
| large-suite-fail-1 | failed | 10ms | Runtime Error |
| large-suite-fail-2 | failed | 9ms | Runtime Error |
| large-suite-fail-3 | failed | 10ms | Runtime Error |
| large-suite-fail-4 | failed | 10ms | Runtime Error |

## Error Pattern Analysis

### Runtime Error (5 tests)

**Affected Tests:**
- large-suite-fail-0
- large-suite-fail-1
- large-suite-fail-2
- large-suite-fail-3
- large-suite-fail-4

**Sample Error:**
```
Mock test large-suite-fail-0 failed intentionally
```

**Recommended Actions:**
- Review application logs
- Check for unhandled exceptions
- Verify environment setup

