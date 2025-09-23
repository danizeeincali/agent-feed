# Failure Analysis Report

**Execution ID:** exec_1755703143953_4ds897hzn
**Generated:** 2025-08-20T15:19:04.060Z
**Failed Tests:** 3

## Summary

This report provides detailed analysis of test failures to help identify patterns and root causes.

## Failed Tests Overview

| Test ID | Status | Duration | Error Type |
|---------|--------|----------|------------|
| pm-report-test-fail-0 | failed | 10ms | Runtime Error |
| pm-report-test-fail-1 | failed | 10ms | Runtime Error |
| pm-report-test-fail-2 | failed | 10ms | Runtime Error |

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

