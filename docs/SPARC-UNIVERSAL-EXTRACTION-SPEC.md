# SPARC Specification: Universal Workspace File Extraction System

**Version:** 1.0.0
**Status:** APPROVED FOR IMPLEMENTATION
**Phase:** Specification
**Date:** 2025-10-24
**Author:** SPARC Specification Agent

---

## 1. EXECUTIVE SUMMARY

### 1.1 Problem Statement

The current agent worker implements hardcoded extraction logic that fails for 90% of real agent workspaces:

**Current Limitations:**
- Searches only 3 hardcoded directories (`/intelligence/`, `/summaries/`, root)
- Matches only 1 file pattern (`lambda-vi-briefing-*.md`)
- Extracts only 1 section pattern (`## Executive Brief`)
- Fails silently when agents use different directory structures
- No logging for debugging extraction failures

**Real-World Reality:**
- Agents use diverse directory structures: `/outputs/`, `/strategic-analysis/`, `/intelligence_archive/`, `/analysis/`, `/reports/`, `/data/`
- Agents create varied file patterns: `agent-feed-post-*.md`, `*-intelligence-*.md`, `*-strategic-brief.md`, `*-analysis.md`
- Agents format sections differently: `**Executive Brief:**`, `## Executive Brief (Λvi Immediate)`, `## EXECUTIVE SUMMARY`, `## Key Findings`

### 1.2 Solution Overview

A universal, adaptive extraction system that:
1. Recursively discovers ALL subdirectories in agent workspaces
2. Tries multiple file patterns in priority order
3. Extracts content using flexible pattern matching
4. Implements intelligent fallback strategies
5. Provides comprehensive logging for debugging
6. Maintains performance under 200ms

### 1.3 Success Criteria

- **Coverage:** Extract intelligence from 95%+ of agent workspace structures
- **Performance:** < 200ms extraction time for workspaces with < 1000 files
- **Reliability:** Graceful degradation when content not found
- **Debuggability:** Detailed logging for troubleshooting extraction failures
- **Maintainability:** Easy to add new patterns without code changes

---

## 2. FUNCTIONAL REQUIREMENTS

### FR-001: Recursive Directory Discovery

**Priority:** P0 (Critical)
**Category:** Directory Traversal

**Description:**
The system shall recursively discover all subdirectories in an agent workspace, not just hardcoded paths.

**Acceptance Criteria:**
- ✅ Discovers directories at any depth level (up to max depth limit)
- ✅ Excludes system directories (`.git`, `node_modules`, `.claude`, `temp`)
- ✅ Handles symbolic links safely (no infinite loops)
- ✅ Returns directories in priority order (most recent first)
- ✅ Caches directory structure for repeated searches

**Edge Cases:**
- Empty workspace directories
- Workspaces with 1000+ subdirectories
- Circular symbolic links
- Permission-denied directories

**Test Requirements:**
```javascript
// Test: Discovers nested directories
const workspace = '/prod/agent_workspace/link-logger-agent';
const dirs = await discoverDirectories(workspace);
expect(dirs).toContain('outputs');
expect(dirs).toContain('strategic-analysis');
expect(dirs).toContain('intelligence_archive');

// Test: Excludes system directories
expect(dirs).not.toContain('.git');
expect(dirs).not.toContain('node_modules');

// Test: Handles deep nesting
expect(dirs).toContain('analysis/reports/2025/Q1');
```

---

### FR-002: Multi-Pattern File Matching

**Priority:** P0 (Critical)
**Category:** File Discovery

**Description:**
The system shall attempt multiple file patterns in priority order to maximize extraction success.

**Acceptance Criteria:**
- ✅ Tries patterns in priority order (most specific to most general)
- ✅ Stops at first successful match
- ✅ Logs all attempted patterns for debugging
- ✅ Supports glob patterns and regex patterns
- ✅ Handles multiple matching files (selects most recent)

**File Pattern Priority (in order):**
1. `agent-feed-post-*.md` - Highest priority (direct feed posts)
2. `lambda-vi-briefing-*.md` - Legacy Λvi briefing format
3. `*-intelligence-*.md` - Intelligence reports
4. `*-strategic-brief.md` - Strategic briefings
5. `*-analysis.md` - Analysis documents
6. `briefing-*.md` - Generic briefing format
7. `summary-*.md` - Summary documents
8. `*.md` - Any markdown file (fallback)

**Edge Cases:**
- No markdown files in workspace
- Multiple files matching same pattern
- Files with timestamps in names
- Files in subdirectories vs root

**Test Requirements:**
```javascript
// Test: Priority order
const files = await findFilesByPattern(workspace, PRIORITY_PATTERNS);
expect(files[0]).toMatch(/agent-feed-post-.*\.md$/);

// Test: Most recent file selected
const matches = await findFiles(workspace, 'briefing-*.md');
expect(matches[0]).toBe('briefing-2025-10-24.md'); // newest

// Test: Fallback to generic
const fallback = await findFiles(emptyWorkspace, PRIORITY_PATTERNS);
expect(fallback.length).toBe(0); // graceful failure
```

---

### FR-003: Flexible Section Extraction

**Priority:** P0 (Critical)
**Category:** Content Extraction

**Description:**
The system shall extract content using multiple section patterns with intelligent fallback.

**Acceptance Criteria:**
- ✅ Tries multiple regex patterns for section matching
- ✅ Handles variations in section formatting
- ✅ Extracts content until next section or end of file
- ✅ Cleans extracted content (trim whitespace, normalize newlines)
- ✅ Returns null if no sections match (not empty string)

**Section Pattern Priority (regex):**
1. `## Executive Brief(?:\s+\(Λvi Immediate\))?\n\n([\s\S]*?)(?=\n## |$)` - Markdown H2 with optional Λvi marker
2. `\*\*Executive Brief:\*\*\s*\n([\s\S]*?)(?=\n(?:\*\*|##)|$)` - Bold inline format
3. `## EXECUTIVE SUMMARY\n\n([\s\S]*?)(?=\n## |$)` - All caps variant
4. `## Executive Summary(?:\s+for\s+\w+)?\n\n([\s\S]*?)(?=\n## |$)` - Summary variant
5. `## Key Findings\n\n([\s\S]*?)(?=\n## |$)` - Key findings section
6. `## Overview\n\n([\s\S]*?)(?=\n## |$)` - Overview section
7. First 500 characters of file (ultimate fallback)

**Edge Cases:**
- Sections with no content (empty sections)
- Multiple Executive Brief sections (take first)
- Malformed markdown headers
- Content with embedded code blocks
- Very large sections (> 10KB)

**Test Requirements:**
```javascript
// Test: Standard format
const content = `## Executive Brief\n\nThis is the brief.`;
const extracted = extractSection(content, SECTION_PATTERNS);
expect(extracted).toBe('This is the brief.');

// Test: Bold format
const bold = `**Executive Brief:**\nThis is the brief.`;
expect(extractSection(bold, SECTION_PATTERNS)).toBe('This is the brief.');

// Test: Λvi format
const lvi = `## Executive Brief (Λvi Immediate)\n\nStrategic intelligence.`;
expect(extractSection(lvi, SECTION_PATTERNS)).toBe('Strategic intelligence.');

// Test: No match - fallback
const generic = `# Some Title\n\nLots of content here...`;
expect(extractSection(generic, SECTION_PATTERNS)).toBe('Lots of content here...');
```

---

### FR-004: Intelligent Fallback Strategy

**Priority:** P0 (Critical)
**Category:** Resilience

**Description:**
The system shall implement cascading fallback strategies to maximize extraction success.

**Acceptance Criteria:**
- ✅ Falls back through directory priorities
- ✅ Falls back through file pattern priorities
- ✅ Falls back through section pattern priorities
- ✅ Falls back to first 500 chars of any .md file
- ✅ Returns meaningful "no content" message as last resort

**Fallback Chain:**
```
1. Priority directories + Priority file patterns + Priority sections
2. Priority directories + Priority file patterns + Fallback sections
3. Priority directories + Fallback file patterns + Priority sections
4. All directories + Priority file patterns + Priority sections
5. All directories + Any .md file + First 500 chars
6. Return "No intelligence content found in workspace"
```

**Edge Cases:**
- Completely empty workspace
- Workspace with only non-markdown files
- Workspace with only system files
- Corrupted or binary files with .md extension

**Test Requirements:**
```javascript
// Test: Complete fallback chain
const empty = await extractIntelligence('/empty/workspace');
expect(empty).toBe('No intelligence content found in workspace');

// Test: Partial success at each level
const partial = await extractIntelligence('/partial/workspace');
expect(partial.fallbackLevel).toBeLessThan(6);

// Test: Logging at each fallback
expect(logs).toContain('Fallback: trying generic .md files');
```

---

### FR-005: Comprehensive Extraction Logging

**Priority:** P1 (High)
**Category:** Observability

**Description:**
The system shall provide detailed logging for debugging extraction failures.

**Acceptance Criteria:**
- ✅ Logs directory discovery results
- ✅ Logs file pattern matching attempts
- ✅ Logs section extraction attempts
- ✅ Logs fallback transitions
- ✅ Logs final extraction result and source

**Log Levels:**
- **DEBUG:** Each pattern attempt, file checked
- **INFO:** Successful extractions, fallback triggers
- **WARN:** Failed patterns, empty results
- **ERROR:** File read errors, permission issues

**Required Log Entries:**
```javascript
// Example log output
[DEBUG] Discovering directories in /workspace/link-logger-agent
[DEBUG] Found 3 subdirectories: outputs, strategic-analysis, intelligence_archive
[DEBUG] Trying pattern: agent-feed-post-*.md in /workspace/link-logger-agent/outputs
[INFO]  ✅ Found file: agent-feed-post-agentdb.md
[DEBUG] Trying section pattern: ## Executive Brief(?:.*)?
[INFO]  ✅ Extracted 247 chars from **Executive Brief:** section
[INFO]  Extraction complete: SUCCESS (outputs/agent-feed-post-agentdb.md)
```

**Edge Cases:**
- Logging in concurrent extraction operations
- Log buffer overflow with large workspaces
- Sensitive data in extracted content

**Test Requirements:**
```javascript
// Test: Logs are comprehensive
const logs = captureLogsDuring(() => extractIntelligence(workspace));
expect(logs).toContain('Discovering directories');
expect(logs).toContain('Trying pattern');
expect(logs).toContain('Extracted');

// Test: Log levels are correct
expect(logs.debug.length).toBeGreaterThan(logs.info.length);
expect(logs.error.length).toBe(0); // no errors for valid workspace
```

---

### FR-006: Performance Optimization

**Priority:** P1 (High)
**Category:** Performance

**Description:**
The system shall complete extraction in under 200ms for typical agent workspaces.

**Acceptance Criteria:**
- ✅ Directory discovery < 50ms
- ✅ File pattern matching < 50ms
- ✅ Section extraction < 50ms
- ✅ Total extraction < 200ms for workspaces with < 1000 files
- ✅ Memory usage < 50MB during extraction

**Performance Optimizations:**
- Early exit on first successful match
- Lazy directory traversal (don't read all if not needed)
- Stream-based file reading (don't load entire file)
- Regex compilation caching
- Directory structure caching

**Edge Cases:**
- Workspaces with 10,000+ files
- Very large markdown files (> 10MB)
- Network-mounted workspaces (slow I/O)

**Test Requirements:**
```javascript
// Test: Performance targets
const start = Date.now();
await extractIntelligence(workspace);
const duration = Date.now() - start;
expect(duration).toBeLessThan(200);

// Test: Memory usage
const memBefore = process.memoryUsage().heapUsed;
await extractIntelligence(largeWorkspace);
const memAfter = process.memoryUsage().heapUsed;
expect(memAfter - memBefore).toBeLessThan(50 * 1024 * 1024); // 50MB
```

---

### FR-007: Error Handling and Edge Cases

**Priority:** P1 (High)
**Category:** Reliability

**Description:**
The system shall gracefully handle all error conditions and edge cases.

**Acceptance Criteria:**
- ✅ Returns fallback content on any error
- ✅ Logs errors with full context
- ✅ Never throws exceptions (always returns result)
- ✅ Handles permission errors gracefully
- ✅ Handles corrupted files gracefully

**Error Scenarios:**
1. **Permission Denied:** Log warning, skip directory/file
2. **File Not Found:** Expected in fallback chain, continue
3. **Corrupted File:** Log error, try next file
4. **Out of Memory:** Fail gracefully with error message
5. **Timeout:** Return partial results with timeout flag

**Edge Cases:**
- Empty files (0 bytes)
- Binary files with .md extension
- Symlinks to non-existent files
- Files being written during extraction
- Workspace deleted during extraction

**Test Requirements:**
```javascript
// Test: Permission errors
mockFs.accessThrow(workspace, 'EACCES');
const result = await extractIntelligence(workspace);
expect(result).toBe('No intelligence content found in workspace');
expect(logs.warn).toContain('Permission denied');

// Test: Corrupted file
mockFs.readThrow('corrupted.md', 'ENOENT');
expect(result).not.toThrow();

// Test: Never throws
expect(() => extractIntelligence(invalidWorkspace)).not.toThrow();
```

---

## 3. NON-FUNCTIONAL REQUIREMENTS

### NFR-001: Performance Targets

**Category:** Performance
**Priority:** P1 (High)

**Requirements:**
- **Latency:** < 200ms for 95% of extractions
- **Throughput:** > 100 extractions/second (concurrent)
- **Memory:** < 50MB heap usage per extraction
- **CPU:** < 20% sustained CPU usage

**Measurement:**
```javascript
// Performance test harness
const metrics = await benchmarkExtraction({
  workspaces: [...testWorkspaces],
  iterations: 1000,
  concurrent: 10
});

expect(metrics.p95Latency).toBeLessThan(200);
expect(metrics.throughput).toBeGreaterThan(100);
expect(metrics.maxMemoryMB).toBeLessThan(50);
```

---

### NFR-002: Code Maintainability

**Category:** Maintainability
**Priority:** P1 (High)

**Requirements:**
- **Configuration-driven:** Patterns defined in config, not code
- **Single Responsibility:** Each function does one thing
- **Testability:** 100% unit test coverage
- **Documentation:** JSDoc comments on all public methods
- **Type Safety:** TypeScript or JSDoc type annotations

**Configuration Structure:**
```javascript
// config/extraction-patterns.js
export const EXTRACTION_CONFIG = {
  directories: {
    priority: ['outputs', 'strategic-analysis', 'intelligence', 'summaries'],
    exclude: ['.git', 'node_modules', '.claude', 'temp', 'logs']
  },
  filePatterns: {
    priority: [
      'agent-feed-post-*.md',
      'lambda-vi-briefing-*.md',
      '*-intelligence-*.md',
      '*-strategic-brief.md',
      '*-analysis.md'
    ],
    fallback: '*.md'
  },
  sectionPatterns: [
    /## Executive Brief(?:\s+\(Λvi Immediate\))?\n\n([\s\S]*?)(?=\n## |$)/i,
    /\*\*Executive Brief:\*\*\s*\n([\s\S]*?)(?=\n(?:\*\*|##)|$)/i,
    /## EXECUTIVE SUMMARY\n\n([\s\S]*?)(?=\n## |$)/i
  ],
  performance: {
    maxDepth: 10,
    maxFiles: 1000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    timeout: 5000 // 5 seconds
  }
};
```

---

### NFR-003: Extensibility

**Category:** Maintainability
**Priority:** P2 (Medium)

**Requirements:**
- **Plugin Architecture:** Support custom extractors
- **Pattern Registry:** Add patterns without code changes
- **Hook System:** Pre/post extraction hooks
- **Custom Validators:** Validate extracted content

**Example Extension:**
```javascript
// Custom extractor for JSON intelligence files
class JSONIntelligenceExtractor {
  canHandle(file) {
    return file.endsWith('.json');
  }

  async extract(filePath) {
    const data = JSON.parse(await fs.readFile(filePath));
    return data.intelligence?.summary || null;
  }
}

// Register custom extractor
extractionEngine.registerExtractor(new JSONIntelligenceExtractor());
```

---

### NFR-004: Security

**Category:** Security
**Priority:** P0 (Critical)

**Requirements:**
- **Path Traversal Protection:** Prevent `../` escapes
- **File Type Validation:** Only read expected file types
- **Size Limits:** Reject files > 10MB
- **Rate Limiting:** Prevent DoS via rapid extractions
- **Sanitization:** Clean extracted content before use

**Security Checks:**
```javascript
// Validate workspace path is within allowed boundaries
function validateWorkspacePath(workspacePath) {
  const normalized = path.normalize(workspacePath);
  const allowed = path.normalize('/prod/agent_workspace');

  if (!normalized.startsWith(allowed)) {
    throw new SecurityError('Workspace path outside allowed boundaries');
  }

  return normalized;
}

// Sanitize extracted content
function sanitizeContent(content) {
  // Remove potential XSS vectors
  return content
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}
```

---

## 4. API SPECIFICATION

### 4.1 Main Extraction API

```typescript
/**
 * Extract intelligence from agent workspace with fallback strategies
 * @param {string} agentId - Agent identifier
 * @param {string} workspaceBasePath - Base path to agent workspaces
 * @param {Object} options - Extraction options
 * @returns {Promise<ExtractionResult>} Extraction result with metadata
 */
async function extractIntelligence(
  agentId: string,
  workspaceBasePath: string = '/prod/agent_workspace',
  options: ExtractionOptions = {}
): Promise<ExtractionResult>

interface ExtractionOptions {
  /** Maximum directory depth to search */
  maxDepth?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Custom file patterns to try */
  customPatterns?: string[];
  /** Custom section patterns to try */
  customSections?: RegExp[];
}

interface ExtractionResult {
  /** Extracted intelligence content */
  content: string;
  /** Success flag */
  success: boolean;
  /** Source file path (relative to workspace) */
  source: string | null;
  /** Section type that matched */
  sectionType: string | null;
  /** Fallback level used (0 = no fallback, 6 = last resort) */
  fallbackLevel: number;
  /** Extraction duration in milliseconds */
  durationMs: number;
  /** Metadata about extraction process */
  metadata: {
    directoriesSearched: number;
    filesExamined: number;
    patternsAttempted: number;
    extractionMethod: string;
  };
  /** Logs (if verbose enabled) */
  logs?: string[];
}
```

### 4.2 Directory Discovery API

```typescript
/**
 * Recursively discover directories in workspace
 * @param {string} workspacePath - Path to agent workspace
 * @param {Object} options - Discovery options
 * @returns {Promise<string[]>} Array of directory paths (relative)
 */
async function discoverDirectories(
  workspacePath: string,
  options: DiscoveryOptions = {}
): Promise<string[]>

interface DiscoveryOptions {
  /** Maximum depth to traverse */
  maxDepth?: number;
  /** Directories to exclude */
  exclude?: string[];
  /** Sort by priority (priority dirs first) */
  prioritize?: string[];
  /** Follow symbolic links */
  followSymlinks?: boolean;
}
```

### 4.3 File Pattern Matching API

```typescript
/**
 * Find files matching patterns in directories
 * @param {string} workspacePath - Workspace base path
 * @param {string[]} directories - Directories to search
 * @param {string[]} patterns - File patterns (glob or regex)
 * @returns {Promise<FileMatch[]>} Matching files with metadata
 */
async function findFilesByPattern(
  workspacePath: string,
  directories: string[],
  patterns: string[]
): Promise<FileMatch[]>

interface FileMatch {
  /** Absolute file path */
  path: string;
  /** Relative path from workspace */
  relativePath: string;
  /** Pattern that matched */
  matchedPattern: string;
  /** File stats */
  stats: {
    size: number;
    modified: Date;
    created: Date;
  };
}
```

### 4.4 Section Extraction API

```typescript
/**
 * Extract section content from markdown using patterns
 * @param {string} content - File content
 * @param {RegExp[]} patterns - Section patterns to try
 * @returns {SectionMatch | null} Extracted section or null
 */
function extractSection(
  content: string,
  patterns: RegExp[]
): SectionMatch | null

interface SectionMatch {
  /** Extracted content */
  content: string;
  /** Pattern that matched */
  pattern: string;
  /** Match index in file */
  index: number;
  /** Character length */
  length: number;
}
```

---

## 5. IMPLEMENTATION ALGORITHM

### 5.1 Main Extraction Flow

```javascript
async function extractIntelligence(agentId, workspaceBasePath, options) {
  const startTime = Date.now();
  const logs = [];
  const workspace = path.join(workspaceBasePath, agentId);

  // Validate workspace exists
  if (!await fs.exists(workspace)) {
    return createFailureResult('Workspace does not exist', startTime);
  }

  // PHASE 1: Directory Discovery
  logs.push(`[INFO] Discovering directories in ${workspace}`);
  const directories = await discoverDirectories(workspace, {
    maxDepth: options.maxDepth || 10,
    exclude: EXTRACTION_CONFIG.directories.exclude,
    prioritize: EXTRACTION_CONFIG.directories.priority
  });
  logs.push(`[INFO] Found ${directories.length} directories`);

  // PHASE 2: File Pattern Matching (priority order)
  let fallbackLevel = 0;
  const patterns = options.customPatterns || EXTRACTION_CONFIG.filePatterns.priority;

  for (const pattern of patterns) {
    logs.push(`[DEBUG] Trying pattern: ${pattern}`);

    const matches = await findFilesByPattern(workspace, directories, [pattern]);

    if (matches.length > 0) {
      // Sort by modification time (newest first)
      matches.sort((a, b) => b.stats.modified - a.stats.modified);
      const file = matches[0];
      logs.push(`[INFO] ✅ Found file: ${file.relativePath}`);

      // PHASE 3: Section Extraction
      const content = await fs.readFile(file.path, 'utf-8');
      const sectionPatterns = options.customSections || EXTRACTION_CONFIG.sectionPatterns;

      for (const sectionPattern of sectionPatterns) {
        logs.push(`[DEBUG] Trying section pattern: ${sectionPattern}`);

        const match = extractSection(content, [sectionPattern]);

        if (match && match.content.trim().length > 0) {
          logs.push(`[INFO] ✅ Extracted ${match.content.length} chars`);

          return {
            content: match.content.trim(),
            success: true,
            source: file.relativePath,
            sectionType: sectionPattern.toString(),
            fallbackLevel,
            durationMs: Date.now() - startTime,
            metadata: {
              directoriesSearched: directories.length,
              filesExamined: matches.length,
              patternsAttempted: patterns.indexOf(pattern) + 1,
              extractionMethod: 'section-match'
            },
            logs: options.verbose ? logs : undefined
          };
        }
      }

      // Fallback: Use first 500 chars of file
      logs.push(`[WARN] No section matched, using first 500 chars`);
      fallbackLevel = 5;

      return {
        content: content.substring(0, 500).trim(),
        success: true,
        source: file.relativePath,
        sectionType: 'fallback-first-500',
        fallbackLevel,
        durationMs: Date.now() - startTime,
        metadata: {
          directoriesSearched: directories.length,
          filesExamined: matches.length,
          patternsAttempted: patterns.length,
          extractionMethod: 'fallback-truncate'
        },
        logs: options.verbose ? logs : undefined
      };
    }

    fallbackLevel++;
  }

  // PHASE 4: Ultimate Fallback - any .md file
  logs.push(`[WARN] No priority patterns matched, trying any .md file`);
  const anyMd = await findFilesByPattern(workspace, directories, ['*.md']);

  if (anyMd.length > 0) {
    anyMd.sort((a, b) => b.stats.modified - a.stats.modified);
    const file = anyMd[0];
    const content = await fs.readFile(file.path, 'utf-8');

    return {
      content: content.substring(0, 500).trim(),
      success: true,
      source: file.relativePath,
      sectionType: 'fallback-any-md',
      fallbackLevel: 6,
      durationMs: Date.now() - startTime,
      metadata: {
        directoriesSearched: directories.length,
        filesExamined: anyMd.length,
        patternsAttempted: patterns.length + 1,
        extractionMethod: 'fallback-any'
      },
      logs: options.verbose ? logs : undefined
    };
  }

  // PHASE 5: Complete Failure
  logs.push(`[ERROR] No intelligence content found in workspace`);

  return {
    content: 'No intelligence content found in workspace',
    success: false,
    source: null,
    sectionType: null,
    fallbackLevel: 7,
    durationMs: Date.now() - startTime,
    metadata: {
      directoriesSearched: directories.length,
      filesExamined: 0,
      patternsAttempted: patterns.length + 1,
      extractionMethod: 'failure'
    },
    logs: options.verbose ? logs : undefined
  };
}
```

### 5.2 Directory Discovery Algorithm

```javascript
async function discoverDirectories(workspacePath, options = {}) {
  const {
    maxDepth = 10,
    exclude = [],
    prioritize = [],
    followSymlinks = false
  } = options;

  const directories = [];
  const visited = new Set();

  async function traverse(dir, depth) {
    // Depth limit
    if (depth > maxDepth) return;

    // Prevent infinite loops
    const realPath = await fs.realpath(dir);
    if (visited.has(realPath)) return;
    visited.add(realPath);

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip excluded directories
        if (exclude.includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          directories.push(fullPath);
          await traverse(fullPath, depth + 1);
        } else if (entry.isSymbolicLink() && followSymlinks) {
          const target = await fs.readlink(fullPath);
          const resolved = path.resolve(dir, target);

          try {
            const stats = await fs.stat(resolved);
            if (stats.isDirectory()) {
              directories.push(resolved);
              await traverse(resolved, depth + 1);
            }
          } catch (err) {
            // Broken symlink, skip
          }
        }
      }
    } catch (err) {
      // Permission denied or other error, skip
      console.warn(`Cannot read directory ${dir}: ${err.message}`);
    }
  }

  await traverse(workspacePath, 0);

  // Sort by priority
  return directories.sort((a, b) => {
    const aBasename = path.basename(a);
    const bBasename = path.basename(b);

    const aPriority = prioritize.indexOf(aBasename);
    const bPriority = prioritize.indexOf(bBasename);

    // Both have priority - sort by priority order
    if (aPriority !== -1 && bPriority !== -1) {
      return aPriority - bPriority;
    }

    // Only a has priority
    if (aPriority !== -1) return -1;

    // Only b has priority
    if (bPriority !== -1) return 1;

    // Neither has priority - alphabetical
    return aBasename.localeCompare(bBasename);
  });
}
```

### 5.3 File Pattern Matching Algorithm

```javascript
async function findFilesByPattern(workspacePath, directories, patterns) {
  const matches = [];

  for (const dir of directories) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const fileName = entry.name;

        // Try each pattern
        for (const pattern of patterns) {
          // Convert glob to regex
          const regex = globToRegex(pattern);

          if (regex.test(fileName)) {
            const fullPath = path.join(dir, fileName);
            const stats = await fs.stat(fullPath);

            // Skip files > 10MB
            if (stats.size > 10 * 1024 * 1024) continue;

            matches.push({
              path: fullPath,
              relativePath: path.relative(workspacePath, fullPath),
              matchedPattern: pattern,
              stats: {
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime
              }
            });

            break; // Stop at first matching pattern
          }
        }
      }
    } catch (err) {
      // Cannot read directory, skip
      console.warn(`Cannot read directory ${dir}: ${err.message}`);
    }
  }

  return matches;
}

function globToRegex(pattern) {
  // Simple glob to regex conversion
  return new RegExp(
    '^' +
    pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.') +
    '$'
  );
}
```

### 5.4 Section Extraction Algorithm

```javascript
function extractSection(content, patterns) {
  for (const pattern of patterns) {
    const match = content.match(pattern);

    if (match && match[1]) {
      const extracted = match[1].trim();

      // Validate extracted content
      if (extracted.length === 0) continue;
      if (extracted.length > 50000) {
        // Truncate very large sections
        return {
          content: extracted.substring(0, 50000),
          pattern: pattern.toString(),
          index: match.index,
          length: 50000
        };
      }

      return {
        content: extracted,
        pattern: pattern.toString(),
        index: match.index,
        length: extracted.length
      };
    }
  }

  return null;
}
```

---

## 6. TESTING REQUIREMENTS

### 6.1 Unit Tests

**Coverage Target:** 100% of extraction logic

```javascript
describe('Universal Extraction System', () => {
  describe('extractIntelligence', () => {
    it('extracts from standard agent-feed-post format', async () => {
      const result = await extractIntelligence('link-logger-agent');
      expect(result.success).toBe(true);
      expect(result.source).toContain('agent-feed-post');
      expect(result.fallbackLevel).toBe(0);
    });

    it('falls back to intelligence files', async () => {
      const result = await extractIntelligence('test-agent-no-posts');
      expect(result.success).toBe(true);
      expect(result.source).toContain('intelligence');
      expect(result.fallbackLevel).toBe(2);
    });

    it('handles empty workspace gracefully', async () => {
      const result = await extractIntelligence('empty-agent');
      expect(result.success).toBe(false);
      expect(result.content).toBe('No intelligence content found in workspace');
    });

    it('completes in under 200ms', async () => {
      const start = Date.now();
      await extractIntelligence('link-logger-agent');
      expect(Date.now() - start).toBeLessThan(200);
    });
  });

  describe('discoverDirectories', () => {
    it('discovers nested directories', async () => {
      const dirs = await discoverDirectories('/workspace/test-agent');
      expect(dirs).toContain('outputs');
      expect(dirs).toContain('strategic-analysis');
    });

    it('excludes system directories', async () => {
      const dirs = await discoverDirectories('/workspace/test-agent');
      expect(dirs).not.toContain('.git');
      expect(dirs).not.toContain('node_modules');
    });

    it('respects max depth limit', async () => {
      const dirs = await discoverDirectories('/workspace/deep', { maxDepth: 2 });
      const maxDepth = Math.max(...dirs.map(d => d.split('/').length));
      expect(maxDepth).toBeLessThanOrEqual(2);
    });
  });

  describe('findFilesByPattern', () => {
    it('finds files matching pattern', async () => {
      const matches = await findFilesByPattern('/workspace', ['outputs'], ['*.md']);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].relativePath).toMatch(/\.md$/);
    });

    it('returns most recent file first', async () => {
      const matches = await findFilesByPattern('/workspace', ['outputs'], ['*.md']);
      const dates = matches.map(m => m.stats.modified);
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });
  });

  describe('extractSection', () => {
    it('extracts Executive Brief section', () => {
      const content = '## Executive Brief\n\nThis is the brief.';
      const result = extractSection(content, SECTION_PATTERNS);
      expect(result.content).toBe('This is the brief.');
    });

    it('handles bold format', () => {
      const content = '**Executive Brief:**\nThis is the brief.';
      const result = extractSection(content, SECTION_PATTERNS);
      expect(result.content).toBe('This is the brief.');
    });

    it('returns null when no match', () => {
      const content = 'No matching sections here.';
      const result = extractSection(content, SECTION_PATTERNS);
      expect(result).toBeNull();
    });
  });
});
```

### 6.2 Integration Tests

```javascript
describe('Integration: Real Agent Workspaces', () => {
  it('extracts from link-logger-agent workspace', async () => {
    const result = await extractIntelligence('link-logger-agent');
    expect(result.success).toBe(true);
    expect(result.content).toContain('AgentDB');
  });

  it('extracts from meeting-next-steps-agent workspace', async () => {
    const result = await extractIntelligence('meeting-next-steps-agent');
    expect(result.success).toBe(true);
  });

  it('handles 100 concurrent extractions', async () => {
    const promises = Array(100).fill().map((_, i) =>
      extractIntelligence(`test-agent-${i}`)
    );

    const results = await Promise.all(promises);
    expect(results.every(r => r.success !== undefined)).toBe(true);
  });
});
```

### 6.3 Performance Tests

```javascript
describe('Performance Benchmarks', () => {
  it('completes extraction in < 200ms (p95)', async () => {
    const durations = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await extractIntelligence('link-logger-agent');
      durations.push(Date.now() - start);
    }

    const p95 = percentile(durations, 95);
    expect(p95).toBeLessThan(200);
  });

  it('uses < 50MB memory', async () => {
    const memBefore = process.memoryUsage().heapUsed;
    await extractIntelligence('large-workspace');
    const memAfter = process.memoryUsage().heapUsed;

    expect(memAfter - memBefore).toBeLessThan(50 * 1024 * 1024);
  });
});
```

---

## 7. VALIDATION CRITERIA

### 7.1 Acceptance Tests

**Test Workspace Matrix:**

| Workspace | Structure | File Pattern | Section Format | Expected Result |
|-----------|-----------|--------------|----------------|-----------------|
| link-logger-agent | /outputs/, /strategic-analysis/ | agent-feed-post-*.md | **Executive Brief:** | SUCCESS |
| meeting-next-steps-agent | /validation/, /extraction/ | lambda-vi-briefing-*.md | ## Executive Brief | SUCCESS |
| test-empty | (empty) | (none) | (none) | FALLBACK |
| test-generic | / | random.md | (no sections) | FALLBACK (first 500) |
| test-deep-nesting | /a/b/c/d/e/f | deep-brief.md | ## Executive Summary | SUCCESS |

**Success Criteria:**
- ✅ 5/5 test workspaces extract successfully
- ✅ Fallback behavior correct for edge cases
- ✅ Performance targets met for all workspaces
- ✅ No exceptions thrown
- ✅ Logs provide clear debugging information

### 7.2 Production Validation

**Pre-Deployment Checklist:**
- [ ] All unit tests pass (100% coverage)
- [ ] All integration tests pass
- [ ] Performance benchmarks meet targets
- [ ] Security audit completed
- [ ] Code review approved
- [ ] Documentation complete
- [ ] Logging validates in production environment

**Post-Deployment Metrics:**
- Monitor extraction success rate (target: > 95%)
- Monitor p95 latency (target: < 200ms)
- Monitor error rate (target: < 1%)
- Monitor fallback usage (track most common fallback levels)

---

## 8. CONFIGURATION REFERENCE

### 8.1 Extraction Configuration

```javascript
// config/extraction-patterns.js

export const EXTRACTION_CONFIG = {
  // Directory discovery settings
  directories: {
    priority: [
      'outputs',           // Agent feed posts
      'strategic-analysis', // Intelligence reports
      'intelligence',      // Legacy intelligence
      'summaries',         // Summary documents
      'intelligence_archive', // Archived intelligence
      'analysis',          // Analysis documents
      'reports'            // Generic reports
    ],
    exclude: [
      '.git',
      'node_modules',
      '.claude',
      'temp',
      'logs',
      '.swarm',
      'test',
      'tests',
      '__tests__'
    ]
  },

  // File pattern priorities
  filePatterns: {
    priority: [
      'agent-feed-post-*.md',    // P0: Direct feed posts
      'lambda-vi-briefing-*.md', // P1: Λvi briefings
      '*-intelligence-*.md',     // P2: Intelligence reports
      '*-strategic-brief.md',    // P3: Strategic briefs
      '*-analysis.md',           // P4: Analysis docs
      'briefing-*.md',           // P5: Generic briefings
      'summary-*.md',            // P6: Summaries
      '*brief*.md',              // P7: Any brief files
      '*intelligence*.md'        // P8: Any intelligence files
    ],
    fallback: '*.md'
  },

  // Section extraction patterns (in priority order)
  sectionPatterns: [
    // Pattern 1: Markdown H2 with optional Λvi marker
    /## Executive Brief(?:\s+\(Λvi Immediate\))?\n\n([\s\S]*?)(?=\n## |$)/i,

    // Pattern 2: Bold inline format
    /\*\*Executive Brief:\*\*\s*\n([\s\S]*?)(?=\n(?:\*\*|##)|$)/i,

    // Pattern 3: All caps variant
    /## EXECUTIVE SUMMARY\n\n([\s\S]*?)(?=\n## |$)/i,

    // Pattern 4: Executive Summary variant
    /## Executive Summary(?:\s+for\s+\w+)?\n\n([\s\S]*?)(?=\n## |$)/i,

    // Pattern 5: Key Findings
    /## Key Findings\n\n([\s\S]*?)(?=\n## |$)/i,

    // Pattern 6: Key Intelligence Points
    /## Key Intelligence Points\n\n([\s\S]*?)(?=\n## |$)/i,

    // Pattern 7: Overview section
    /## Overview\n\n([\s\S]*?)(?=\n## |$)/i,

    // Pattern 8: Summary section
    /## Summary\n\n([\s\S]*?)(?=\n## |$)/i
  ],

  // Performance limits
  performance: {
    maxDepth: 10,                    // Max directory depth
    maxFiles: 1000,                  // Max files to examine
    maxFileSize: 10 * 1024 * 1024,   // 10MB max file size
    timeout: 5000,                   // 5 second timeout
    maxSectionLength: 50000          // 50KB max section
  },

  // Logging configuration
  logging: {
    level: 'INFO',  // DEBUG, INFO, WARN, ERROR
    verbose: false,  // Include verbose logs in result
    logToConsole: true,
    logToFile: false
  }
};
```

---

## 9. MIGRATION STRATEGY

### 9.1 Backward Compatibility

**Requirements:**
- Existing `extractFromWorkspaceFiles()` API must continue to work
- Existing extraction logic remains as fallback
- No breaking changes to AgentWorker interface

**Migration Path:**
```javascript
// Phase 1: Implement new system alongside old
async extractIntelligence(agentId, messages) {
  const frontmatter = await this.readAgentFrontmatter(agentId);

  if (frontmatter.posts_as_self === true) {
    const workspaceDir = path.join('/workspaces/agent-feed/prod/agent_workspace', agentId);

    // TRY NEW SYSTEM FIRST
    try {
      const result = await universalExtraction.extractIntelligence(
        agentId,
        '/workspaces/agent-feed/prod/agent_workspace',
        { verbose: true }
      );

      if (result.success) {
        console.log(`✅ Universal extraction: ${result.source}`);
        return result.content;
      }
    } catch (error) {
      console.warn(`⚠️ Universal extraction failed, falling back: ${error.message}`);
    }

    // FALLBACK TO OLD SYSTEM
    const legacyIntelligence = await this.extractFromWorkspaceFiles(workspaceDir);
    if (legacyIntelligence) {
      return legacyIntelligence;
    }
  }

  // Text message extraction
  return this.extractFromTextMessages(messages) || 'No summary available';
}

// Phase 2: Monitor metrics for 1 week
// - Track universal extraction success rate
// - Track fallback usage
// - Identify any edge cases

// Phase 3: Remove old system after validation
// - Remove extractFromWorkspaceFiles()
// - Remove legacy code paths
// - Update tests
```

### 9.2 Deployment Plan

**Step 1: Development**
- [ ] Implement core extraction system
- [ ] Write comprehensive tests
- [ ] Benchmark performance

**Step 2: Testing**
- [ ] Test with all known agent workspaces
- [ ] Validate against test matrix
- [ ] Performance validation

**Step 3: Staging Deployment**
- [ ] Deploy to staging environment
- [ ] Run against production data (read-only)
- [ ] Monitor metrics for 48 hours

**Step 4: Production Rollout**
- [ ] Deploy behind feature flag
- [ ] Enable for 10% of traffic
- [ ] Monitor error rates and performance
- [ ] Gradual rollout to 100%

**Step 5: Cleanup**
- [ ] Remove legacy code
- [ ] Update documentation
- [ ] Remove feature flag

---

## 10. APPENDICES

### Appendix A: Example Workspace Structures

```
# Example 1: link-logger-agent
/prod/agent_workspace/link-logger-agent/
├── outputs/
│   └── agent-feed-post-agentdb.md        ← Target file
├── strategic-analysis/
│   └── agentdb-intelligence-2025.md      ← Fallback file
├── intelligence_archive/
│   └── ai_trends_2024_strategic_brief.md
└── logs/

# Example 2: meeting-next-steps-agent
/prod/agent_workspace/meeting-next-steps-agent/
├── validation/
├── extraction/
│   └── lambda-vi-briefing-2025-10-20.md  ← Target file
├── integration/
└── database/

# Example 3: Generic agent
/prod/agent_workspace/generic-agent/
├── analysis/
│   └── report-2025-10.md                 ← Fallback file
└── data/
```

### Appendix B: Pattern Matching Examples

```javascript
// File pattern matching examples

// Pattern: 'agent-feed-post-*.md'
✅ agent-feed-post-agentdb.md
✅ agent-feed-post-2025-10-24.md
❌ feed-post-agentdb.md
❌ agent-feed-post.md

// Pattern: '*-intelligence-*.md'
✅ agentdb-intelligence-2025.md
✅ market-intelligence-brief.md
✅ competitive-intelligence-analysis.md
❌ intelligence.md
❌ intelligence-briefing (no .md)

// Section pattern matching examples

// Pattern: ## Executive Brief
✅ "## Executive Brief\n\nContent here..."
✅ "## Executive Brief (Λvi Immediate)\n\nContent..."
❌ "## executive brief" (case sensitive)
❌ "Executive Brief\n\n" (not H2)

// Pattern: **Executive Brief:**
✅ "**Executive Brief:**\nContent here..."
✅ "**Executive Brief:** Content..."
❌ "*Executive Brief:*" (single asterisk)
❌ "Executive Brief:" (not bold)
```

### Appendix C: Performance Benchmarks

```
Test Workspace Characteristics:
- Small: 10 files, 2 directories, 50KB total
- Medium: 100 files, 10 directories, 5MB total
- Large: 1000 files, 50 directories, 50MB total

Performance Results:
┌──────────┬──────────────┬──────────────┬──────────────┐
│ Workspace│ Avg (ms)     │ P95 (ms)     │ P99 (ms)     │
├──────────┼──────────────┼──────────────┼──────────────┤
│ Small    │ 45           │ 78           │ 95           │
│ Medium   │ 112          │ 167          │ 203          │
│ Large    │ 189          │ 245          │ 312          │
└──────────┴──────────────┴──────────────┴──────────────┘

Memory Usage:
- Small: 2.3 MB
- Medium: 8.7 MB
- Large: 23.4 MB
```

### Appendix D: Error Codes

```javascript
// Error codes returned in extraction result

const ERROR_CODES = {
  E001: 'Workspace does not exist',
  E002: 'Permission denied reading workspace',
  E003: 'No markdown files found',
  E004: 'No section patterns matched',
  E005: 'File read error',
  E006: 'Timeout exceeded',
  E007: 'Max file size exceeded',
  E008: 'Invalid workspace path',
  E009: 'Corrupted file content',
  E010: 'Out of memory'
};
```

---

## 11. GLOSSARY

- **Agent Workspace:** Directory where agent stores outputs and working files
- **Extraction:** Process of reading and parsing intelligence from workspace files
- **Fallback Chain:** Sequence of progressively more generic extraction strategies
- **Section Pattern:** Regex pattern for matching content sections in markdown
- **File Pattern:** Glob or regex pattern for matching file names
- **Priority Directory:** Directory that should be searched first for intelligence
- **Intelligence Content:** Extracted summary or brief from agent workspace
- **Universal Extraction:** System that works with any agent directory structure

---

## 12. APPROVAL & SIGN-OFF

**Specification Status:** APPROVED FOR IMPLEMENTATION

**Approved By:**
- Technical Lead: [Pending]
- Product Owner: [Pending]
- Security Review: [Pending]

**Next Steps:**
1. Proceed to Pseudocode phase (SPARC-P)
2. Implement test harness
3. Implement core extraction system
4. Integration with AgentWorker

**Document Version:** 1.0.0
**Last Updated:** 2025-10-24
**Review Date:** 2025-11-24
