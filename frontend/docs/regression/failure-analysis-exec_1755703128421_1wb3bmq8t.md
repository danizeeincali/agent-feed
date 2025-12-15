# Failure Analysis Report

**Execution ID:** exec_1755703128421_1wb3bmq8t
**Generated:** 2025-08-20T15:18:49.450Z
**Failed Tests:** 5

## Summary

This report provides detailed analysis of test failures to help identify patterns and root causes.

## Failed Tests Overview

| Test ID | Status | Duration | Error Type |
|---------|--------|----------|------------|
| large-suite-fail-0 | failed | 10ms | Runtime Error |
| large-suite-fail-1 | failed | 10ms | Runtime Error |
| large-suite-fail-2 | failed | 10ms | Runtime Error |
| large-suite-fail-3 | failed | 11ms | Runtime Error |
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

