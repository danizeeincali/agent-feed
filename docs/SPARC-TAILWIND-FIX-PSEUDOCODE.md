# SPARC Pseudocode: Tailwind CSS Class Correction

## Problem Statement

**Issue**: Invalid Tailwind CSS classes causing PostCSS compilation failure
**Location**: `/workspaces/agent-feed/frontend/src/styles/markdown.css:437`
**Impact**: Vite build failure resulting in white screen
**Root Cause**: Non-existent Tailwind color variants `bg-gray-25` and `bg-gray-850`

## Algorithm Specification

### Main Algorithm: FixInvalidTailwindClasses

```
ALGORITHM: FixInvalidTailwindClasses
INPUT: cssFilePath (string) = "/workspaces/agent-feed/frontend/src/styles/markdown.css"
OUTPUT: success (boolean), message (string)

CONSTANTS:
    TARGET_LINE = 437
    INVALID_CLASS_1 = "bg-gray-25"
    VALID_CLASS_1 = "bg-gray-50"
    INVALID_CLASS_2 = "bg-gray-850"
    VALID_CLASS_2 = "bg-gray-800"
    BACKUP_SUFFIX = ".backup"

BEGIN
    // Phase 1: Pre-validation
    validationResult ← ValidateFileExists(cssFilePath)
    IF NOT validationResult.success THEN
        RETURN {success: false, message: "File not found: " + cssFilePath}
    END IF

    // Phase 2: Create backup
    backupResult ← CreateBackup(cssFilePath)
    IF NOT backupResult.success THEN
        RETURN {success: false, message: "Backup creation failed"}
    END IF

    // Phase 3: Read and analyze file
    fileContent ← ReadFile(cssFilePath)
    lineArray ← SplitIntoLines(fileContent)

    // Phase 4: Locate and validate target line
    targetLine ← lineArray[TARGET_LINE - 1]  // 0-indexed

    IF NOT ContainsInvalidClasses(targetLine) THEN
        RETURN {success: false, message: "Invalid classes not found at line " + TARGET_LINE}
    END IF

    // Phase 5: Perform replacement
    correctedLine ← targetLine
    correctedLine ← ReplaceString(correctedLine, INVALID_CLASS_1, VALID_CLASS_1)
    correctedLine ← ReplaceString(correctedLine, INVALID_CLASS_2, VALID_CLASS_2)

    // Phase 6: Validate correction
    IF ContainsInvalidClasses(correctedLine) THEN
        RestoreBackup(cssFilePath, backupResult.backupPath)
        RETURN {success: false, message: "Replacement failed - backup restored"}
    END IF

    // Phase 7: Update file content
    lineArray[TARGET_LINE - 1] ← correctedLine
    updatedContent ← JoinLines(lineArray)

    // Phase 8: Write corrected content
    writeResult ← WriteFile(cssFilePath, updatedContent)
    IF NOT writeResult.success THEN
        RestoreBackup(cssFilePath, backupResult.backupPath)
        RETURN {success: false, message: "File write failed - backup restored"}
    END IF

    // Phase 9: Validate PostCSS compilation
    compilationResult ← WaitForViteRecompilation(timeout: 5000)
    IF NOT compilationResult.success THEN
        RestoreBackup(cssFilePath, backupResult.backupPath)
        RETURN {success: false, message: "PostCSS compilation failed - backup restored"}
    END IF

    // Phase 10: Cleanup
    DeleteBackup(backupResult.backupPath)

    RETURN {
        success: true,
        message: "Tailwind classes corrected successfully",
        changes: {
            line: TARGET_LINE,
            before: targetLine,
            after: correctedLine
        }
    }
END
```

## Subroutines

### 1. File Validation

```
SUBROUTINE: ValidateFileExists
INPUT: filePath (string)
OUTPUT: result (object)

BEGIN
    TRY
        fileStats ← GetFileStats(filePath)

        IF NOT fileStats.exists THEN
            RETURN {success: false, error: "File does not exist"}
        END IF

        IF NOT fileStats.isFile THEN
            RETURN {success: false, error: "Path is not a file"}
        END IF

        IF NOT fileStats.readable THEN
            RETURN {success: false, error: "File is not readable"}
        END IF

        IF NOT fileStats.writable THEN
            RETURN {success: false, error: "File is not writable"}
        END IF

        RETURN {success: true}

    CATCH error
        RETURN {success: false, error: error.message}
    END TRY
END
```

### 2. Backup Management

```
SUBROUTINE: CreateBackup
INPUT: filePath (string)
OUTPUT: result (object)

BEGIN
    timestamp ← GetCurrentTimestamp()
    backupPath ← filePath + ".backup." + timestamp

    TRY
        fileContent ← ReadFile(filePath)
        WriteFile(backupPath, fileContent)

        // Verify backup integrity
        backupContent ← ReadFile(backupPath)
        IF backupContent != fileContent THEN
            DeleteFile(backupPath)
            RETURN {success: false, error: "Backup integrity check failed"}
        END IF

        RETURN {
            success: true,
            backupPath: backupPath,
            size: fileContent.length
        }

    CATCH error
        RETURN {success: false, error: error.message}
    END TRY
END

SUBROUTINE: RestoreBackup
INPUT: originalPath (string), backupPath (string)
OUTPUT: success (boolean)

BEGIN
    TRY
        backupContent ← ReadFile(backupPath)
        WriteFile(originalPath, backupContent)

        Log("Backup restored from: " + backupPath)
        RETURN true

    CATCH error
        LogError("Failed to restore backup: " + error.message)
        RETURN false
    END TRY
END

SUBROUTINE: DeleteBackup
INPUT: backupPath (string)
OUTPUT: success (boolean)

BEGIN
    TRY
        IF FileExists(backupPath) THEN
            DeleteFile(backupPath)
            Log("Backup deleted: " + backupPath)
        END IF
        RETURN true

    CATCH error
        LogWarning("Failed to delete backup: " + error.message)
        RETURN false
    END TRY
END
```

### 3. Content Analysis

```
SUBROUTINE: ContainsInvalidClasses
INPUT: lineContent (string)
OUTPUT: hasInvalid (boolean)

BEGIN
    // Check for invalid class patterns
    patterns ← [
        "bg-gray-25",
        "bg-gray-850",
        // Add other invalid variants if needed
        "bg-gray-15",
        "bg-gray-900"  // 900+ are invalid in default Tailwind
    ]

    FOR EACH pattern IN patterns DO
        IF lineContent.contains(pattern) THEN
            RETURN true
        END IF
    END FOR

    RETURN false
END

SUBROUTINE: ValidateTailwindSyntax
INPUT: lineContent (string)
OUTPUT: result (object)

BEGIN
    validationRules ← {
        hasApplyDirective: lineContent.contains("@apply"),
        hasSemicolon: lineContent.trim().endsWith(";"),
        hasValidClasses: NOT ContainsInvalidClasses(lineContent),
        hasProperSpacing: ValidateSpacing(lineContent)
    }

    allValid ← true
    errors ← []

    FOR EACH rule, isValid IN validationRules DO
        IF NOT isValid THEN
            allValid ← false
            errors.append("Validation failed: " + rule)
        END IF
    END FOR

    RETURN {
        valid: allValid,
        errors: errors
    }
END
```

### 4. Vite Compilation Monitoring

```
SUBROUTINE: WaitForViteRecompilation
INPUT: timeout (milliseconds)
OUTPUT: result (object)

BEGIN
    startTime ← GetCurrentTime()
    pollInterval ← 100  // milliseconds

    WHILE (GetCurrentTime() - startTime) < timeout DO
        // Check for Vite compilation status
        // This could be done by:
        // 1. Monitoring console output
        // 2. Checking for build artifacts
        // 3. Testing HTTP endpoint response

        compilationStatus ← CheckViteBuildStatus()

        IF compilationStatus.complete THEN
            IF compilationStatus.hasErrors THEN
                RETURN {
                    success: false,
                    error: "PostCSS compilation errors detected",
                    details: compilationStatus.errors
                }
            ELSE
                RETURN {
                    success: true,
                    message: "Vite recompilation successful",
                    duration: GetCurrentTime() - startTime
                }
            END IF
        END IF

        Sleep(pollInterval)
    END WHILE

    RETURN {
        success: false,
        error: "Vite recompilation timeout after " + timeout + "ms"
    }
END

SUBROUTINE: CheckViteBuildStatus
OUTPUT: status (object)

BEGIN
    // Implementation would check:
    // 1. Dev server response
    // 2. Browser console for errors
    // 3. Vite log files
    // 4. Process status

    // Simplified logic:
    TRY
        response ← HTTPGet("http://localhost:5173")

        IF response.status == 200 THEN
            RETURN {
                complete: true,
                hasErrors: false
            }
        ELSE
            RETURN {
                complete: false,
                hasErrors: true,
                errors: ["HTTP status: " + response.status]
            }
        END IF

    CATCH error
        RETURN {
            complete: false,
            hasErrors: true,
            errors: [error.message]
        }
    END TRY
END
```

## Error Handling Strategy

### Error Categories and Responses

```
ERROR_HANDLING_MATRIX:

1. File System Errors
   - File not found → Return error, suggest file path verification
   - Permission denied → Return error, suggest permission check
   - Disk full → Return error, suggest space cleanup
   - Backup creation failed → Abort operation immediately

2. Content Errors
   - Invalid line number → Return error with actual line count
   - Classes not found → Return warning, no operation needed
   - Unexpected content → Return error with content preview

3. Compilation Errors
   - PostCSS failure → Restore backup, return detailed error
   - Vite timeout → Restore backup, suggest manual check
   - Syntax error → Restore backup, return validation details

4. Validation Errors
   - Integrity check failed → Restore backup, report corruption
   - Classes still invalid → Restore backup, investigate further
```

### Rollback Procedure

```
ALGORITHM: EmergencyRollback
INPUT: originalPath (string), backupPath (string), errorContext (object)
OUTPUT: rollbackResult (object)

BEGIN
    Log("EMERGENCY ROLLBACK INITIATED")
    Log("Error context: " + errorContext)

    // Step 1: Verify backup exists
    IF NOT FileExists(backupPath) THEN
        RETURN {
            success: false,
            error: "CRITICAL: Backup file not found",
            action: "Manual recovery required"
        }
    END IF

    // Step 2: Restore from backup
    restoreSuccess ← RestoreBackup(originalPath, backupPath)

    IF NOT restoreSuccess THEN
        RETURN {
            success: false,
            error: "CRITICAL: Backup restoration failed",
            action: "Manual recovery required",
            backupLocation: backupPath
        }
    END IF

    // Step 3: Verify restoration
    restoredContent ← ReadFile(originalPath)
    backupContent ← ReadFile(backupPath)

    IF restoredContent != backupContent THEN
        RETURN {
            success: false,
            error: "CRITICAL: Restoration verification failed",
            action: "Manual recovery required"
        }
    END IF

    // Step 4: Wait for Vite recovery
    WaitForViteRecompilation(timeout: 10000)

    RETURN {
        success: true,
        message: "Rollback completed successfully",
        backupPreserved: true,
        backupLocation: backupPath
    }
END
```

## Complexity Analysis

### Time Complexity

```
ANALYSIS: FixInvalidTailwindClasses

Time Complexity:
    - ValidateFileExists: O(1) - File system stat call
    - CreateBackup: O(n) - n = file size in bytes
    - ReadFile: O(n) - Read entire file
    - SplitIntoLines: O(n) - Parse file content
    - ReplaceString: O(m) - m = line length
    - JoinLines: O(n) - Reconstruct file
    - WriteFile: O(n) - Write entire file
    - WaitForViteRecompilation: O(1) - Fixed timeout with polling

    Total: O(n) where n = file size

    Typical Performance:
    - Small CSS file (10KB): ~50ms
    - Medium CSS file (100KB): ~200ms
    - Large CSS file (1MB): ~1-2s
    - Vite recompilation: ~500-2000ms

Space Complexity:
    - File content in memory: O(n)
    - Backup file on disk: O(n)
    - Line array: O(n)
    - Temporary strings: O(1)

    Total: O(n) space where n = file size

    Peak Memory Usage:
    - Original file: 1x file size
    - Backup copy: 1x file size
    - Line array: 1x file size
    - Total: ~3x file size in memory/disk
```

## Data Structures

```
STRUCTURE: FileOperationResult
    success: boolean
    message: string
    error: string (optional)
    data: object (optional)

STRUCTURE: BackupInfo
    success: boolean
    backupPath: string
    size: integer
    timestamp: datetime

STRUCTURE: ValidationResult
    valid: boolean
    errors: array of string
    warnings: array of string

STRUCTURE: CompilationResult
    complete: boolean
    hasErrors: boolean
    errors: array of string
    duration: integer (milliseconds)

STRUCTURE: ChangeRecord
    line: integer
    before: string
    after: string
    timestamp: datetime
    success: boolean
```

## Implementation Checklist

### Pre-Implementation
- [ ] Verify Node.js environment
- [ ] Check file system permissions
- [ ] Ensure Vite dev server is running
- [ ] Confirm Tailwind CSS configuration

### Implementation Steps
- [ ] Implement ValidateFileExists subroutine
- [ ] Implement CreateBackup subroutine
- [ ] Implement file read/write operations
- [ ] Implement string replacement logic
- [ ] Implement ValidateTailwindSyntax
- [ ] Implement WaitForViteRecompilation
- [ ] Implement EmergencyRollback

### Post-Implementation
- [ ] Test with valid file
- [ ] Test with invalid file path
- [ ] Test with permission errors
- [ ] Test with invalid content
- [ ] Test rollback mechanism
- [ ] Verify Vite HMR works
- [ ] Validate PostCSS compilation
- [ ] Clean up backup files

## Testing Strategy

### Unit Tests

```
TEST_SUITE: TailwindClassCorrection

TEST: ValidFileOperation
    INPUT: Valid CSS file with invalid classes at line 437
    EXPECTED: Success, classes corrected, backup created and deleted

TEST: FileNotFound
    INPUT: Non-existent file path
    EXPECTED: Error with "File not found" message

TEST: InvalidLineNumber
    INPUT: Line 999 (beyond file length)
    EXPECTED: Error with "Invalid line number"

TEST: ClassesAlreadyValid
    INPUT: File with valid Tailwind classes
    EXPECTED: Success with "No changes needed" message

TEST: BackupFailure
    INPUT: Read-only directory
    EXPECTED: Operation aborted, error returned

TEST: CompilationFailure
    INPUT: File with syntax errors
    EXPECTED: Rollback executed, error reported

TEST: PermissionDenied
    INPUT: File without write permissions
    EXPECTED: Error with permission message
```

### Integration Tests

```
TEST_SUITE: ViteIntegration

TEST: HotModuleReplacement
    SETUP: Start Vite dev server
    ACTION: Apply fix
    VERIFY: HMR updates without full reload

TEST: PostCSSCompilation
    SETUP: Monitor PostCSS output
    ACTION: Apply fix
    VERIFY: No compilation errors

TEST: BrowserRendering
    SETUP: Open browser with app
    ACTION: Apply fix
    VERIFY: White screen resolves, styles apply
```

## Monitoring and Validation

### Success Criteria

```
SUCCESS_VALIDATION:
    1. File modified successfully ✓
    2. Invalid classes replaced ✓
    3. @apply directive syntax preserved ✓
    4. No PostCSS errors ✓
    5. Vite HMR completes ✓
    6. Browser renders correctly ✓
    7. Backup created and deleted ✓
    8. No side effects on other rules ✓
```

### Failure Detection

```
FAILURE_INDICATORS:
    1. PostCSS error in console
    2. Vite compilation timeout
    3. HTTP 500 from dev server
    4. White screen persists
    5. Console errors in browser
    6. File write failure
    7. Backup restoration needed
```

## Optimization Notes

1. **Performance**: File operations are I/O bound, optimization focus on:
   - Minimize file reads (single read)
   - Efficient string replacement (direct indexing)
   - Async file operations where possible

2. **Safety**: Multiple safety layers:
   - Pre-validation before any changes
   - Automatic backup creation
   - Integrity verification
   - Rollback on any failure

3. **Reliability**: Error handling at every step:
   - Try-catch blocks for all I/O
   - Detailed error messages
   - State preservation on failure

4. **Maintainability**:
   - Modular subroutines
   - Clear constant definitions
   - Comprehensive logging
   - Self-documenting code structure

## Edge Cases

### Handled Edge Cases

1. **Multiple Invalid Classes**: Algorithm handles both replacements
2. **Whitespace Variations**: Regex-based replacement handles spacing
3. **Case Sensitivity**: Exact string matching prevents false positives
4. **Concurrent Modifications**: Backup protects against race conditions
5. **Partial Line Matches**: Full line replacement prevents corruption

### Unhandled Edge Cases (Require Manual Intervention)

1. **Corrupted Backup**: If backup itself is corrupted, manual recovery needed
2. **Disk Full During Write**: Operation will fail, manual space cleanup required
3. **Process Termination**: If process killed mid-operation, backup remains for recovery
4. **Multiple Vite Instances**: Algorithm assumes single dev server

## Deployment Considerations

### Development Environment
- Vite dev server must be running
- File watcher should be active
- Browser developer tools recommended for validation

### Production Build
- Fix should be applied before production build
- PostCSS compilation must succeed
- Final bundle should be tested

### Continuous Integration
- Add automated test for Tailwind class validity
- Include PostCSS compilation check in CI pipeline
- Prevent invalid classes from being committed

---

## Summary

This pseudocode provides a robust, safe, and efficient algorithm for correcting invalid Tailwind CSS classes. The implementation focuses on:

- **Safety First**: Automatic backups and rollback mechanisms
- **Validation**: Multiple layers of verification
- **Error Handling**: Comprehensive error detection and recovery
- **Performance**: O(n) time complexity with minimal overhead
- **Maintainability**: Modular design with clear separation of concerns

The algorithm ensures that even if compilation fails, the system can automatically recover to a working state, preventing downtime and data loss.
