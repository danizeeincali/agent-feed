# Failure Analysis Report

**Execution ID:** exec_1755757797424_i32sczghd
**Generated:** 2025-08-21T06:29:57.618Z
**Failed Tests:** 3

## Summary

This report provides detailed analysis of test failures to help identify patterns and root causes.

## Failed Tests Overview

| Test ID | Status | Duration | Error Type |
|---------|--------|----------|------------|
| normal-tests-fail-0 | failed | 10ms | Runtime Error |
| normal-tests-fail-1 | failed | 11ms | Runtime Error |
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

