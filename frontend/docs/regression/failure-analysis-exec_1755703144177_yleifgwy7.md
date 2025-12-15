# Failure Analysis Report

**Execution ID:** exec_1755703144177_yleifgwy7
**Generated:** 2025-08-20T15:19:04.232Z
**Failed Tests:** 2

## Summary

This report provides detailed analysis of test failures to help identify patterns and root causes.

## Failed Tests Overview

| Test ID | Status | Duration | Error Type |
|---------|--------|----------|------------|
| failure-1 | failed | 10ms | Runtime Error |
| failure-2 | failed | 10ms | Runtime Error |

## Error Pattern Analysis

### Runtime Error (2 tests)

**Affected Tests:**
- failure-1
- failure-2

**Sample Error:**
```
Mock test failure-1 failed intentionally
```

**Recommended Actions:**
- Review application logs
- Check for unhandled exceptions
- Verify environment setup

