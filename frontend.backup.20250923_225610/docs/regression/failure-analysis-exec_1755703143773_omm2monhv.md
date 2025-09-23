# Failure Analysis Report

**Execution ID:** exec_1755703143773_omm2monhv
**Generated:** 2025-08-20T15:19:03.875Z
**Failed Tests:** 1

## Summary

This report provides detailed analysis of test failures to help identify patterns and root causes.

## Failed Tests Overview

| Test ID | Status | Duration | Error Type |
|---------|--------|----------|------------|
| slow-test | failed | 101ms | Timeout |

## Error Pattern Analysis

### Timeout (1 tests)

**Affected Tests:**
- slow-test

**Sample Error:**
```
Test timeout
```

**Recommended Actions:**
- Increase test timeout values
- Optimize slow operations
- Check for infinite loops or blocking operations

