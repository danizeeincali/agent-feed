# Failure Analysis Report

**Execution ID:** exec_1755703169257_cihx4fgfx
**Generated:** 2025-08-20T15:19:29.446Z
**Failed Tests:** 3

## Summary

This report provides detailed analysis of test failures to help identify patterns and root causes.

## Failed Tests Overview

| Test ID | Status | Duration | Error Type |
|---------|--------|----------|------------|
| normal-tests-fail-0 | failed | 12ms | Runtime Error |
| normal-tests-fail-1 | failed | 10ms | Runtime Error |
| performance-tests-fail-0 | failed | 10ms | Runtime Error |

## Error Pattern Analysis

### Runtime Error (3 tests)

**Affected Tests:**
- normal-tests-fail-0
- normal-tests-fail-1
- performance-tests-fail-0

**Sample Error:**
```
Mock test normal-tests-fail-0 failed intentionally
```

**Recommended Actions:**
- Review application logs
- Check for unhandled exceptions
- Verify environment setup

