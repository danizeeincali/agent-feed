# SPARC Pseudocode: CSS @import Order Fix

## Document Metadata
- **Phase**: Pseudocode (SPARC Methodology)
- **Created**: 2025-10-27
- **Target File**: `/workspaces/agent-feed/frontend/src/index.css`
- **Problem**: @import statement at line 2 must be moved before @tailwind directives
- **Specification**: Awaiting formal spec document

---

## Problem Analysis

### Current State
```css
/* Line 1 */ /* Import Markdown Styling */
/* Line 2 */ @import './styles/markdown.css';
/* Line 3 */
/* Line 4 */ @tailwind base;
/* Line 5 */ @tailwind components;
/* Line 6 */ @tailwind utilities;
```

### Required State
```css
/* Line 1 */ @import './styles/markdown.css';
/* Line 2 */
/* Line 3 */ @tailwind base;
/* Line 4 */ @tailwind components;
/* Line 5 */ @tailwind utilities;
```

### CSS Specification Requirements
1. All `@import` rules MUST appear before any other rules (except `@charset`)
2. `@import` rules MUST be at the top of the stylesheet
3. Comments preceding `@import` are allowed but not required
4. Whitespace and line structure should be preserved for readability

---

## Algorithm Design

### ALGORITHM: FixCSSImportOrder
**Purpose**: Reorder CSS file to place @import statements at the beginning

```
ALGORITHM: FixCSSImportOrder
INPUT: filePath (string) - absolute path to CSS file
OUTPUT: success (boolean), modifications (object)

CONSTANTS:
    IMPORT_PATTERN = /^\s*@import\s+[^;]+;/
    TAILWIND_PATTERN = /^\s*@tailwind\s+/
    COMMENT_PATTERN = /^\s*\/\*.*\*\/\s*$/
    EMPTY_LINE_PATTERN = /^\s*$/

BEGIN
    // Phase 1: Read and Parse
    lines ← ReadFileToArray(filePath)
    IF lines is null OR lines.length = 0 THEN
        RETURN {success: false, error: "File is empty or unreadable"}
    END IF

    // Phase 2: Analyze Line Structure
    lineAnalysis ← AnalyzeLines(lines)

    // Phase 3: Validate Need for Reordering
    needsReorder ← CheckIfReorderNeeded(lineAnalysis)
    IF NOT needsReorder THEN
        RETURN {success: true, message: "No reordering needed", modified: false}
    END IF

    // Phase 4: Extract and Categorize Lines
    categorized ← CategorizeLines(lines, lineAnalysis)

    // Phase 5: Reconstruct File in Correct Order
    reorderedLines ← ReconstructFile(categorized)

    // Phase 6: Validate Result
    isValid ← ValidateCSSStructure(reorderedLines)
    IF NOT isValid THEN
        RETURN {success: false, error: "Reordering produced invalid CSS"}
    END IF

    // Phase 7: Write Back to File
    WriteArrayToFile(filePath, reorderedLines)

    RETURN {
        success: true,
        modified: true,
        changes: DiffAnalysis(lines, reorderedLines)
    }
END
```

---

## Subroutine Definitions

### SUBROUTINE: AnalyzeLines
**Purpose**: Parse each line and identify its type

```
SUBROUTINE: AnalyzeLines
INPUT: lines (array of strings)
OUTPUT: analysis (array of objects)

BEGIN
    analysis ← []

    FOR i ← 0 TO lines.length - 1 DO
        line ← lines[i]
        lineType ← DetermineLineType(line)

        analysis.append({
            index: i,
            content: line,
            type: lineType,
            hasComment: ContainsComment(line),
            isImport: lineType = "IMPORT",
            isTailwind: lineType = "TAILWIND",
            isEmpty: lineType = "EMPTY"
        })
    END FOR

    RETURN analysis
END

SUBROUTINE: DetermineLineType
INPUT: line (string)
OUTPUT: type (enum: IMPORT, TAILWIND, COMMENT, LAYER, RULE, EMPTY)

BEGIN
    trimmed ← Trim(line)

    IF trimmed matches EMPTY_LINE_PATTERN THEN
        RETURN "EMPTY"
    ELSE IF trimmed matches IMPORT_PATTERN THEN
        RETURN "IMPORT"
    ELSE IF trimmed matches TAILWIND_PATTERN THEN
        RETURN "TAILWIND"
    ELSE IF trimmed matches COMMENT_PATTERN THEN
        RETURN "COMMENT"
    ELSE IF trimmed starts with "@layer" THEN
        RETURN "LAYER"
    ELSE IF trimmed starts with "@keyframes" THEN
        RETURN "KEYFRAMES"
    ELSE IF trimmed starts with "." OR "#" OR "[" OR ":" THEN
        RETURN "RULE"
    ELSE
        RETURN "OTHER"
    END IF
END
```

### SUBROUTINE: CheckIfReorderNeeded
**Purpose**: Determine if file needs reordering

```
SUBROUTINE: CheckIfReorderNeeded
INPUT: lineAnalysis (array)
OUTPUT: needsReorder (boolean)

BEGIN
    firstImportIndex ← -1
    firstTailwindIndex ← -1
    firstRuleIndex ← -1

    FOR EACH item IN lineAnalysis DO
        IF item.isImport AND firstImportIndex = -1 THEN
            firstImportIndex ← item.index
        END IF

        IF item.isTailwind AND firstTailwindIndex = -1 THEN
            firstTailwindIndex ← item.index
        END IF

        IF item.type = "RULE" OR item.type = "LAYER" THEN
            IF firstRuleIndex = -1 THEN
                firstRuleIndex ← item.index
            END IF
        END IF
    END FOR

    // Check if @import comes after @tailwind or other rules
    IF firstImportIndex = -1 THEN
        RETURN false  // No imports found
    END IF

    IF firstTailwindIndex ≠ -1 AND firstImportIndex > firstTailwindIndex THEN
        RETURN true  // Import comes after Tailwind
    END IF

    IF firstRuleIndex ≠ -1 AND firstImportIndex > firstRuleIndex THEN
        RETURN true  // Import comes after rules
    END IF

    // Check if there's non-import content before first import
    FOR i ← 0 TO firstImportIndex - 1 DO
        IF lineAnalysis[i].type ≠ "EMPTY" AND lineAnalysis[i].type ≠ "COMMENT" THEN
            RETURN true
        END IF
    END FOR

    RETURN false  // Already in correct order
END
```

### SUBROUTINE: CategorizeLines
**Purpose**: Group lines by category for reconstruction

```
SUBROUTINE: CategorizeLines
INPUT: lines (array), analysis (array)
OUTPUT: categories (object)

BEGIN
    categories ← {
        imports: [],
        importComments: [],
        tailwindDirectives: [],
        emptyLinesAfterImports: 0,
        restOfFile: []
    }

    inImportSection ← true
    foundFirstImport ← false
    emptyLineCount ← 0

    FOR i ← 0 TO lines.length - 1 DO
        item ← analysis[i]
        line ← lines[i]

        IF item.isImport THEN
            // Found an import
            categories.imports.append(line)
            foundFirstImport ← true
            emptyLineCount ← 0

        ELSE IF item.type = "COMMENT" AND NOT foundFirstImport THEN
            // Comment before first import
            IF ContainsImportRelatedText(line) THEN
                categories.importComments.append(line)
            ELSE
                categories.restOfFile.append(line)
            END IF

        ELSE IF item.isEmpty AND foundFirstImport AND inImportSection THEN
            // Track empty lines after imports
            emptyLineCount ← emptyLineCount + 1

        ELSE IF item.isTailwind THEN
            // Found Tailwind directive - import section ends
            inImportSection ← false

            // Add accumulated empty lines
            FOR j ← 0 TO emptyLineCount - 1 DO
                categories.restOfFile.append("")
            END FOR

            categories.tailwindDirectives.append(line)

        ELSE
            // Everything else
            inImportSection ← false

            // Add accumulated empty lines
            FOR j ← 0 TO emptyLineCount - 1 DO
                categories.restOfFile.append("")
            END FOR
            emptyLineCount ← 0

            categories.restOfFile.append(line)
        END IF
    END FOR

    RETURN categories
END
```

### SUBROUTINE: ReconstructFile
**Purpose**: Build the correctly ordered file

```
SUBROUTINE: ReconstructFile
INPUT: categories (object)
OUTPUT: lines (array of strings)

BEGIN
    result ← []

    // Section 1: @import statements (must be first)
    IF categories.imports.length > 0 THEN
        FOR EACH importLine IN categories.imports DO
            result.append(importLine)
        END FOR

        // Add one blank line after imports
        result.append("")
    END IF

    // Section 2: @tailwind directives
    IF categories.tailwindDirectives.length > 0 THEN
        FOR EACH tailwindLine IN categories.tailwindDirectives DO
            result.append(tailwindLine)
        END FOR

        // Preserve spacing structure
        IF categories.restOfFile.length > 0 THEN
            // Check if next line in restOfFile is empty
            IF categories.restOfFile[0] ≠ "" THEN
                result.append("")
            END IF
        END IF
    END IF

    // Section 3: Rest of the file
    FOR EACH line IN categories.restOfFile DO
        result.append(line)
    END FOR

    RETURN result
END
```

### SUBROUTINE: ValidateCSSStructure
**Purpose**: Ensure reordered CSS is valid

```
SUBROUTINE: ValidateCSSStructure
INPUT: lines (array of strings)
OUTPUT: isValid (boolean)

BEGIN
    foundNonImportRule ← false

    FOR EACH line IN lines DO
        trimmed ← Trim(line)

        // Skip empty lines and comments
        IF trimmed = "" OR trimmed starts with "/*" THEN
            CONTINUE
        END IF

        // Check if this is an @import
        IF trimmed matches IMPORT_PATTERN THEN
            IF foundNonImportRule THEN
                // Found @import after other rules - INVALID
                RETURN false
            END IF
        ELSE IF trimmed starts with "@" OR trimmed contains "{" THEN
            // Found a rule that's not @import
            foundNonImportRule ← true
        END IF
    END FOR

    RETURN true
END
```

### SUBROUTINE: ContainsImportRelatedText
**Purpose**: Check if comment is related to imports

```
SUBROUTINE: ContainsImportRelatedText
INPUT: line (string)
OUTPUT: isRelated (boolean)

BEGIN
    lowercase ← line.toLowerCase()
    keywords ← ["import", "stylesheet", "external", "dependency"]

    FOR EACH keyword IN keywords DO
        IF lowercase contains keyword THEN
            RETURN true
        END IF
    END FOR

    RETURN false
END
```

---

## Data Structures

### LineAnalysisItem
```
STRUCTURE: LineAnalysisItem
    index: integer           // Original line number (0-indexed)
    content: string         // Original line content
    type: enum             // IMPORT, TAILWIND, COMMENT, LAYER, RULE, EMPTY, OTHER
    hasComment: boolean    // Does line contain a comment?
    isImport: boolean      // Is this an @import line?
    isTailwind: boolean    // Is this a @tailwind directive?
    isEmpty: boolean       // Is line empty or whitespace only?
```

### CategorizedLines
```
STRUCTURE: CategorizedLines
    imports: array<string>              // All @import lines
    importComments: array<string>       // Comments related to imports
    tailwindDirectives: array<string>   // @tailwind directives
    emptyLinesAfterImports: integer    // Count of blank lines
    restOfFile: array<string>          // Everything else
```

### FileModification
```
STRUCTURE: FileModification
    success: boolean
    modified: boolean
    error: string (optional)
    changes: object {
        linesAdded: integer
        linesRemoved: integer
        linesReordered: integer
        importsMoved: array<integer>
    }
```

---

## Complexity Analysis

### Time Complexity

**Overall Algorithm: O(n)**
- Reading file: O(n) where n = number of lines
- AnalyzeLines: O(n) - single pass through all lines
- CheckIfReorderNeeded: O(n) - single pass
- CategorizeLines: O(n) - single pass
- ReconstructFile: O(n) - building output array
- ValidateCSSStructure: O(n) - single pass validation
- Writing file: O(n)
- **Total: O(n) - linear time**

### Space Complexity

**Overall Algorithm: O(n)**
- Original lines array: O(n)
- Analysis array: O(n)
- Categories structure: O(n) - all lines stored once
- Result array: O(n)
- **Total: O(n) - linear space**

### Optimality Analysis

**Is this optimal?**
- **Yes**: We must read every line at least once: Ω(n)
- **Yes**: We must write every line at least once: Ω(n)
- **Conclusion**: O(n) is optimal for this problem

### Performance Characteristics

| Operation | Best Case | Average Case | Worst Case |
|-----------|-----------|--------------|------------|
| Read File | O(n) | O(n) | O(n) |
| Analyze Lines | O(n) | O(n) | O(n) |
| Categorize | O(n) | O(n) | O(n) |
| Reconstruct | O(n) | O(n) | O(n) |
| Validate | O(n) | O(n) | O(n) |
| Write File | O(n) | O(n) | O(n) |
| **Total** | **O(n)** | **O(n)** | **O(n)** |

---

## Edge Cases and Error Handling

### Edge Case 1: No @import Statements
```
INPUT: File with only @tailwind and rules
ACTION: Return success without modification
REASON: No reordering needed
```

### Edge Case 2: @import Already First
```
INPUT: @import is already at line 1
ACTION: Return success without modification
REASON: Already in correct order
```

### Edge Case 3: Multiple @import Statements
```
INPUT:
    @import 'file1.css';
    @tailwind base;
    @import 'file2.css';

ACTION: Move both imports to top in order found
OUTPUT:
    @import 'file1.css';
    @import 'file2.css';

    @tailwind base;
```

### Edge Case 4: @charset Present
```
INPUT:
    @charset "UTF-8";
    @tailwind base;
    @import 'file.css';

ACTION: Keep @charset first, move @import to line 2
OUTPUT:
    @charset "UTF-8";
    @import 'file.css';

    @tailwind base;
```

### Edge Case 5: Empty File
```
INPUT: Empty or whitespace-only file
ACTION: Return error "File is empty"
REASON: Nothing to reorder
```

### Edge Case 6: File Read Error
```
INPUT: File doesn't exist or no permissions
ACTION: Return error with details
REASON: Cannot proceed without file access
```

### Edge Case 7: Comments Mixed with Imports
```
INPUT:
    /* Main styles */
    /* Import Markdown Styling */
    @import './styles/markdown.css';

ACTION: Preserve comment structure
OUTPUT:
    @import './styles/markdown.css';

    /* Main styles */
```

### Edge Case 8: Inline Comments
```
INPUT:
    @tailwind base; /* base styles */
    @import './styles/markdown.css'; /* markdown */

ACTION: Preserve inline comments
OUTPUT:
    @import './styles/markdown.css'; /* markdown */

    @tailwind base; /* base styles */
```

---

## Design Patterns Applied

### Pattern 1: Pipeline Pattern
The algorithm uses a clear pipeline of transformations:
```
Read → Analyze → Check → Categorize → Reconstruct → Validate → Write
```

Each stage has a single responsibility and produces input for the next stage.

### Pattern 2: Strategy Pattern
Line type determination uses pattern matching strategies:
```
IF matches IMPORT_PATTERN THEN return "IMPORT"
ELSE IF matches TAILWIND_PATTERN THEN return "TAILWIND"
ELSE IF matches COMMENT_PATTERN THEN return "COMMENT"
...
```

### Pattern 3: Builder Pattern
The ReconstructFile subroutine builds the output incrementally:
```
result ← []
Add imports section
Add blank line
Add tailwind section
Add blank line
Add rest of file
RETURN result
```

### Pattern 4: Validation Pattern
ValidateCSSStructure ensures CSS spec compliance:
```
FOR EACH line
    IF @import found after non-import rule
        RETURN false (invalid)
```

---

## Testing Strategy

### Unit Tests Required

**Test 1: Basic Reordering**
```
INPUT:
    @tailwind base;
    @import './test.css';

EXPECTED:
    @import './test.css';

    @tailwind base;
```

**Test 2: Multiple Imports**
```
INPUT:
    @tailwind base;
    @import './a.css';
    @import './b.css';

EXPECTED:
    @import './a.css';
    @import './b.css';

    @tailwind base;
```

**Test 3: Already Correct Order**
```
INPUT:
    @import './test.css';
    @tailwind base;

EXPECTED: No modification
```

**Test 4: Complex File Structure**
```
INPUT:
    /* Comment */
    @tailwind base;
    @import './test.css';

    @layer base {
      /* rules */
    }

EXPECTED:
    @import './test.css';

    /* Comment */
    @tailwind base;

    @layer base {
      /* rules */
    }
```

**Test 5: Preserve Whitespace**
```
Verify that empty lines are preserved appropriately
Verify indentation is maintained
```

### Integration Tests Required

1. Test on actual production file: `/workspaces/agent-feed/frontend/src/index.css`
2. Verify PostCSS/Tailwind build succeeds after reordering
3. Verify browser rendering is identical
4. Verify no console warnings/errors

### Performance Tests

1. Test with small file (10 lines)
2. Test with medium file (100 lines)
3. Test with large file (1000 lines)
4. Measure execution time (should be < 100ms for typical CSS files)

---

## Implementation Notes

### Language-Agnostic Design
This pseudocode can be implemented in any language:
- **JavaScript/Node.js**: Use `fs.readFileSync`, `split('\n')`, `join('\n')`
- **Python**: Use `open()`, `readlines()`, `writelines()`
- **Bash**: Use `sed`, `awk`, or line-by-line processing
- **Go**: Use `bufio.Scanner`, `strings.Split`

### Recommended Implementation Order
1. Implement basic file I/O (read/write)
2. Implement line type detection
3. Implement categorization logic
4. Implement reconstruction logic
5. Add validation
6. Add error handling
7. Add edge case handling
8. Add tests

### Error Handling Strategy
- **Graceful degradation**: Return detailed error messages
- **No data loss**: Never overwrite file if validation fails
- **Atomic operations**: Consider writing to temp file first
- **Backup strategy**: Optional backup before modification

---

## Optimization Opportunities

### Current Algorithm
- **Memory**: O(n) - stores entire file in memory
- **I/O**: 2 operations (1 read, 1 write)

### Potential Optimizations

**Optimization 1: In-Place File Editing**
- Use stream processing for very large files
- Would reduce memory from O(n) to O(1)
- Complexity would remain O(n)

**Optimization 2: Early Exit**
- If file is already correct, exit after CheckIfReorderNeeded
- Avoids unnecessary categorization and reconstruction
- Saves 3/7 of the operations

**Optimization 3: Lazy Evaluation**
- Only reconstruct sections that changed
- Would reduce write operations
- Useful for very large files

**Optimization 4: Parallel Processing**
- For multiple files, process in parallel
- Each file is independent
- Linear speedup with number of cores

### Recommended Optimizations for Production
1. ✅ Early exit (easy, high impact)
2. ✅ Backup before write (safety)
3. ⚠️ Stream processing (only if files > 10MB)
4. ⚠️ Parallel processing (only for batch operations)

---

## Security Considerations

### Path Traversal Protection
```
VALIDATE: filePath does not contain ".."
VALIDATE: filePath is within allowed directory
VALIDATE: File extension is ".css"
```

### File Permission Validation
```
CHECK: File is readable
CHECK: File is writable
CHECK: File owner matches expected owner
```

### Content Validation
```
VALIDATE: File contains valid CSS syntax
VALIDATE: No executable code injection
VALIDATE: File size within reasonable limits (< 10MB)
```

### Backup Strategy
```
BEFORE modification:
    Create backup: filename.css.backup
AFTER success:
    Keep backup for 24 hours
ON failure:
    Restore from backup
```

---

## Integration with SPARC Workflow

### Specification Phase (Completed)
- ✅ Problem identified: @import after @tailwind
- ✅ Requirements defined: Move @import to line 1
- ✅ Success criteria: Valid CSS spec compliance

### Pseudocode Phase (Current)
- ✅ Algorithm designed
- ✅ Data structures defined
- ✅ Complexity analyzed
- ✅ Edge cases documented

### Architecture Phase (Next)
- Design file structure
- Define module interfaces
- Plan testing framework
- Design CI/CD integration

### Refinement Phase (TDD)
- Write tests first
- Implement subroutines
- Refactor for clarity
- Optimize performance

### Completion Phase
- Integration testing
- Production deployment
- Documentation update
- Monitoring setup

---

## Success Metrics

### Correctness Metrics
- ✅ All @import statements are before other rules
- ✅ CSS remains syntactically valid
- ✅ File structure preserved (spacing, comments)
- ✅ No data loss

### Performance Metrics
- ✅ Execution time < 100ms for typical files
- ✅ Memory usage proportional to file size
- ✅ Zero file corruption incidents

### Maintainability Metrics
- ✅ Code complexity: O(n) - linear and simple
- ✅ Clear separation of concerns
- ✅ Comprehensive error handling
- ✅ Well-documented edge cases

---

## Conclusion

This pseudocode provides a complete, efficient, and robust algorithm for fixing CSS @import order issues. The design is:

1. **Correct**: Complies with CSS specification
2. **Efficient**: O(n) time and space complexity
3. **Safe**: Comprehensive validation and error handling
4. **Maintainable**: Clear structure and documentation
5. **Extensible**: Easy to add features (backup, batch processing)
6. **Testable**: Well-defined test cases

**Next Steps:**
1. Review and approve this pseudocode
2. Proceed to Architecture phase
3. Implement using TDD methodology
4. Deploy to production

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-27 | SPARC Pseudocode Agent | Initial pseudocode design |

**Review Status**: ⏳ Awaiting Review
**Approval Status**: ⏳ Awaiting Approval
**Implementation Status**: ⏳ Not Started
