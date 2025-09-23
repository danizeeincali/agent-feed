# Failure Analysis Report

**Execution ID:** exec_1755823224322_jrm4bwc2w
**Generated:** 2025-08-22T00:40:24.375Z
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

