# SPARC Specification: Worker Content Extraction Enhancement

**Document Version:** 1.0
**Date:** 2025-10-24
**Status:** SPECIFICATION PHASE
**SPARC Phase:** Specification
**Author:** Specification Agent

---

## Executive Summary

The AgentWorker currently extracts content only from Claude assistant text messages, causing it to fail for agents like `link-logger-agent` that save their intelligence to workspace files instead of returning text. This specification defines a comprehensive solution to enable workspace file extraction with full backward compatibility.

### Success Criteria
- link-logger-agent posts rich intelligence summaries (not "No summary available")
- All existing agents continue working unchanged
- 100% test coverage with real files (no mocks)
- Performance: File reading <50ms
- Screenshots prove UI shows correct content

---

## 1. Problem Analysis

### 1.1 Current Behavior

**Location:** `/workspaces/agent-feed/api-server/worker/agent-worker.js`

**Lines 156-184:** The `processURL()` method extracts content using this logic:

```javascript
// Extract intelligence from SDK response
const messages = result.messages || [];
const assistantMessages = messages.filter(m => m.type === 'assistant');

// Combine all assistant responses into summary
const summary = assistantMessages
  .map(msg => {
    if (typeof msg === 'string') return msg;
    if (msg.text) return msg.text;
    if (msg.content) {
      if (typeof msg.content === 'string') return msg.content;
      if (Array.isArray(msg.content)) {
        return msg.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');
      }
    }
    if (msg.message?.content) return msg.message.content;
    return '';
  })
  .filter(text => typeof text === 'string' && text.trim())
  .join('\n\n');
```

**Problem:** This only checks assistant messages, ignoring workspace files.

### 1.2 link-logger-agent Behavior

**Agent Configuration:**
`/workspaces/agent-feed/prod/.claude/agents/link-logger-agent.md`

**Key Frontmatter:**
```yaml
name: link-logger-agent
posts_as_self: true
```

**Working Directory:**
`/workspaces/agent-feed/prod/agent_workspace/link-logger-agent/`

**File Patterns Generated:**
- `lambda-vi-briefing-*.md` - Executive briefings (35 lines)
- `summaries/*.md` - Progressive summaries (100-200 lines)
- `intelligence/*.md` - Detailed analysis (125 lines)
- `competitive-intel/*.md` - Competitive intelligence
- `strategic-analysis/*.md` - Strategic assessments

**Example Intelligence File:**
`/workspaces/agent-feed/prod/agent_workspace/link-logger-agent/intelligence/agentdb-competitive-intelligence.md`
- 125 lines of comprehensive competitive analysis
- Structured sections: Executive Summary, Key Findings, Recommendations
- Strategic value: 9/10
- Time sensitivity: High

### 1.3 Failure Scenario

**Current Flow:**
1. User posts URL → Ticket created with `post_id`
2. AgentWorker spawned → `processURL()` executes
3. link-logger-agent creates intelligence files in workspace
4. Worker extracts from assistant messages → Empty
5. Fallback to "No summary available" (line 224)
6. Comment posted with useless content

**Expected Flow:**
1. User posts URL → Ticket created with `post_id`
2. AgentWorker spawned → `processURL()` executes
3. link-logger-agent creates intelligence files in workspace
4. Worker detects `posts_as_self: true` flag
5. Worker searches workspace for intelligence files
6. Worker extracts rich intelligence content
7. Comment posted with comprehensive analysis

---

## 2. Functional Requirements

### FR-001: Agent Frontmatter Detection
**Priority:** P0 (Critical)
**Description:** Worker must detect `posts_as_self` flag from agent frontmatter.

**Acceptance Criteria:**
- AC-001.1: Read agent frontmatter from `/workspaces/agent-feed/prod/.claude/agents/{agent-name}.md`
- AC-001.2: Parse YAML frontmatter and extract `posts_as_self` flag
- AC-001.3: Handle missing frontmatter gracefully (default: `false`)
- AC-001.4: Handle malformed frontmatter without crashing
- AC-001.5: Cache frontmatter reading per agent (performance optimization)

**Input:**
```typescript
agentId: string // e.g., "link-logger-agent"
```

**Output:**
```typescript
{
  posts_as_self: boolean,
  name: string,
  tier: number,
  // ... other frontmatter fields
}
```

**Error Scenarios:**
- File not found → Return default `{ posts_as_self: false }`
- Invalid YAML → Log warning, return default
- Missing `posts_as_self` → Return default

---

### FR-002: Workspace File Pattern Detection
**Priority:** P0 (Critical)
**Description:** Worker must search agent workspace for intelligence output files.

**Acceptance Criteria:**
- AC-002.1: Search workspace directory: `/prod/agent_workspace/{agent-name}/`
- AC-002.2: Check file patterns in priority order (see FR-003)
- AC-002.3: Stop at first pattern match (performance optimization)
- AC-002.4: Handle non-existent workspace directory gracefully
- AC-002.5: Ignore empty files (0 bytes)

**Workspace Structure:**
```
/prod/agent_workspace/{agent-name}/
├── lambda-vi-briefing-*.md          # Priority 1 (executive briefings)
├── summaries/*.md                   # Priority 2 (progressive summaries)
├── intelligence/*.md                # Priority 3 (detailed analysis)
├── competitive-intel/*.md           # Priority 4
├── strategic-analysis/*.md          # Priority 5
└── analysis/*.md                    # Priority 6
```

**Performance Requirements:**
- File system operations: <30ms total
- Use `fs.readdir()` with `recursive: true` for subdirectory scanning
- Limit search depth to 2 levels (agent workspace + 1 subdirectory)

---

### FR-003: File Pattern Priority System
**Priority:** P0 (Critical)
**Description:** Worker must prioritize file patterns by strategic value.

**Acceptance Criteria:**
- AC-003.1: Implement pattern priority hierarchy
- AC-003.2: Select most recent file within highest priority pattern
- AC-003.3: Use file modification time for recency sorting
- AC-003.4: Support glob-style pattern matching

**Priority Hierarchy:**
```javascript
const FILE_PATTERNS = [
  // Priority 1: Executive briefings for chief of staff
  {
    priority: 1,
    pattern: 'lambda-vi-briefing-*.md',
    glob: 'lambda-vi-briefing-*.md',
    description: 'Executive briefings for Λvi chief of staff',
    maxAge: 3600000 // 1 hour
  },

  // Priority 2: Progressive summaries
  {
    priority: 2,
    pattern: 'summaries/*.md',
    glob: 'summaries/*.md',
    description: 'Progressive summarization outputs',
    maxAge: 7200000 // 2 hours
  },

  // Priority 3: Detailed intelligence analysis
  {
    priority: 3,
    pattern: 'intelligence/*.md',
    glob: 'intelligence/*.md',
    description: 'Detailed intelligence analysis',
    maxAge: 7200000 // 2 hours
  },

  // Priority 4: Competitive intelligence
  {
    priority: 4,
    pattern: 'competitive-intel/*.md',
    glob: 'competitive-intel/*.md',
    description: 'Competitive intelligence reports',
    maxAge: 7200000 // 2 hours
  },

  // Priority 5: Strategic analysis
  {
    priority: 5,
    pattern: 'strategic-analysis/*.md',
    glob: 'strategic-analysis/*.md',
    description: 'Strategic analysis reports',
    maxAge: 7200000 // 2 hours
  },

  // Priority 6: General analysis
  {
    priority: 6,
    pattern: 'analysis/*.md',
    glob: 'analysis/*.md',
    description: 'General analysis outputs',
    maxAge: 7200000 // 2 hours
  }
];
```

**File Selection Logic:**
```javascript
// Pseudocode
for each pattern in FILE_PATTERNS (ordered by priority):
  files = glob(`/prod/agent_workspace/{agent-name}/${pattern.glob}`)
  if files.length > 0:
    mostRecentFile = files.sortBy(modificationTime).last()
    if (now - mostRecentFile.mtime) < pattern.maxAge:
      return mostRecentFile
    else:
      log("File too old, skipping pattern", pattern)

return null // No valid files found
```

**Recency Rules:**
- Files older than `maxAge` are ignored (stale content)
- Most recent file within pattern selected
- Timestamp comparison uses file `mtime` (modification time)

---

### FR-004: Intelligence Content Extraction
**Priority:** P0 (Critical)
**Description:** Worker must extract and format intelligence content from files.

**Acceptance Criteria:**
- AC-004.1: Read file content using UTF-8 encoding
- AC-004.2: Preserve markdown formatting
- AC-004.3: Extract first 5000 characters (API comment length limit)
- AC-004.4: Add truncation notice if content exceeds limit
- AC-004.5: Strip YAML frontmatter from extracted content
- AC-004.6: Preserve section headers and bullet points

**Content Processing:**
```javascript
// Pseudocode
function extractIntelligence(filePath) {
  const rawContent = readFile(filePath, 'utf-8');

  // Strip YAML frontmatter (--- ... ---)
  const content = stripFrontmatter(rawContent);

  // Check length
  if (content.length <= 5000) {
    return content;
  }

  // Truncate at last paragraph boundary
  const truncated = content.substring(0, 4900);
  const lastNewline = truncated.lastIndexOf('\n\n');

  if (lastNewline > 4000) {
    return truncated.substring(0, lastNewline) +
      '\n\n---\n*[Content truncated for length. Full analysis available in workspace.]*';
  }

  return truncated +
    '\n\n---\n*[Content truncated for length. Full analysis available in workspace.]*';
}
```

**Character Limit Rationale:**
- Database `comments.content` field: TEXT (unlimited)
- UI rendering performance: 5000 chars = ~1 page
- User experience: Long comments require scroll

---

### FR-005: Fallback to Text Extraction
**Priority:** P0 (Critical)
**Description:** Worker must fall back to text-based extraction if no files found.

**Acceptance Criteria:**
- AC-005.1: Maintain existing text extraction logic (lines 156-184)
- AC-005.2: Only use text extraction when file extraction returns null
- AC-005.3: Support all existing agent types unchanged
- AC-005.4: Log fallback event for debugging

**Execution Flow:**
```javascript
// Pseudocode
async function extractContent(sdkResult, agentId) {
  // Step 1: Check if agent uses workspace files
  const frontmatter = await readAgentFrontmatter(agentId);

  if (frontmatter.posts_as_self === true) {
    // Step 2: Try workspace file extraction
    const workspaceContent = await extractFromWorkspace(agentId);

    if (workspaceContent !== null) {
      console.log(`Extracted intelligence from workspace for ${agentId}`);
      return workspaceContent;
    }

    console.log(`No workspace files found for ${agentId}, falling back to text`);
  }

  // Step 3: Fallback to existing text extraction
  const textContent = extractFromMessages(sdkResult.messages);

  if (textContent.trim()) {
    return textContent;
  }

  // Step 4: Ultimate fallback
  return 'No summary available';
}
```

**Backward Compatibility Guarantee:**
- Existing agents (without `posts_as_self: true`) → No behavior change
- Text-based agents → Existing logic preserved
- Mixed agents (files + text) → Files preferred, text fallback

---

### FR-006: skipTicket Flag Preservation
**Priority:** P1 (High)
**Description:** Worker must continue setting `skipTicket: true` to prevent infinite loops.

**Acceptance Criteria:**
- AC-006.1: Set `skipTicket: true` on all comments (already implemented, line 237)
- AC-006.2: Test coverage verifies flag is set
- AC-006.3: Document rationale in code comments

**Current Implementation (lines 231-238):**
```javascript
const comment = {
  content: content,
  author: ticket.agent_id,        // Backward compatibility
  author_agent: ticket.agent_id,  // Primary field for agent identification
  parent_id: null,
  mentioned_users: [],
  skipTicket: true  // Prevent infinite loop - don't create ticket for agent response
};
```

**Rationale:**
- Agent comments should NOT trigger new tickets
- Prevents infinite loop: post → ticket → comment → ticket → comment...
- Already implemented and tested (test IT-AWE-002)

---

## 3. Non-Functional Requirements

### NFR-001: Performance
**Priority:** P0 (Critical)

**Requirements:**
- **File Reading:** <50ms per file operation
- **Frontmatter Parsing:** <10ms per agent
- **Pattern Matching:** <30ms per workspace scan
- **Total Overhead:** <100ms added to worker execution

**Measurement:**
```javascript
// Add performance logging
const perfStart = performance.now();
const content = await extractFromWorkspace(agentId);
const perfEnd = performance.now();

if (perfEnd - perfStart > 50) {
  console.warn(`Slow file extraction: ${perfEnd - perfStart}ms for ${agentId}`);
}
```

**Optimization Strategies:**
- Cache agent frontmatter in memory (TTL: 5 minutes)
- Use `fs.promises` for async file operations
- Limit workspace scan to 2 directory levels
- Stop at first pattern match (avoid scanning all patterns)

---

### NFR-002: Reliability
**Priority:** P0 (Critical)

**Requirements:**
- **Error Handling:** All file operations must handle errors gracefully
- **Fallback Strategy:** Always fall back to text extraction on failure
- **No Crashes:** Worker must never crash due to file system errors
- **Logging:** All errors logged with context

**Error Scenarios:**
| Error | Handling Strategy |
|-------|------------------|
| Frontmatter file not found | Return default `{ posts_as_self: false }` |
| Workspace directory missing | Skip file extraction, use text fallback |
| File read permission denied | Log warning, skip file, use text fallback |
| File contains invalid UTF-8 | Try alternate encodings, skip if fails |
| File system timeout | Skip file extraction after 100ms timeout |
| Empty file found | Ignore file, continue pattern search |
| Corrupted markdown | Extract what's readable, log warning |

**Example Error Handling:**
```javascript
async function extractFromWorkspace(agentId) {
  try {
    const workspaceDir = `/prod/agent_workspace/${agentId}`;

    // Check directory exists
    try {
      await fs.access(workspaceDir);
    } catch (err) {
      console.log(`Workspace not found for ${agentId}: ${workspaceDir}`);
      return null; // Trigger text fallback
    }

    // Search for files
    const file = await findMostRecentIntelligenceFile(workspaceDir);

    if (!file) {
      console.log(`No intelligence files found for ${agentId}`);
      return null;
    }

    // Read file content
    const content = await fs.readFile(file.path, 'utf-8');

    if (!content.trim()) {
      console.log(`Empty file found: ${file.path}`);
      return null;
    }

    return content;

  } catch (err) {
    console.error(`File extraction error for ${agentId}:`, err);
    return null; // Fallback to text extraction
  }
}
```

---

### NFR-003: Compatibility
**Priority:** P0 (Critical)

**Requirements:**
- **100% Backward Compatibility:** All existing agents work unchanged
- **Zero Breaking Changes:** No modifications to public APIs
- **Text-Based Agents:** Continue using message extraction
- **Mixed Agents:** Support both file and text extraction

**Compatibility Matrix:**
| Agent Type | `posts_as_self` | Extraction Method | Test Case |
|------------|----------------|-------------------|-----------|
| Text-only | `false` or missing | Messages (existing) | UT-WCE-001 |
| File-only | `true` | Workspace files (new) | UT-WCE-002 |
| Mixed (files + text) | `true` | Files preferred, text fallback | UT-WCE-003 |
| Legacy (no frontmatter) | N/A | Messages (existing) | UT-WCE-004 |

**Test Coverage Requirements:**
- Test ALL agent types in matrix
- Test file extraction with real files (NO MOCKS)
- Test text extraction preservation
- Test fallback behavior
- Test error scenarios

---

### NFR-004: Testability
**Priority:** P0 (Critical)

**Requirements:**
- **100% Test Coverage:** All code paths covered
- **Real Files:** Use actual workspace files in tests (NO MOCKS)
- **Integration Tests:** End-to-end flow with database
- **Unit Tests:** Individual function testing
- **E2E Tests:** UI validation with screenshots

**Test Levels:**

**1. Unit Tests** (`/api-server/tests/unit/worker-content-extraction.test.js`):
```javascript
describe('Worker Content Extraction', () => {
  describe('UT-WCE-001: Frontmatter Detection', () => {
    test('should detect posts_as_self: true', async () => {
      const frontmatter = await readAgentFrontmatter('link-logger-agent');
      expect(frontmatter.posts_as_self).toBe(true);
    });

    test('should handle missing frontmatter', async () => {
      const frontmatter = await readAgentFrontmatter('non-existent-agent');
      expect(frontmatter.posts_as_self).toBe(false);
    });
  });

  describe('UT-WCE-002: File Pattern Matching', () => {
    test('should find lambda-vi-briefing files', async () => {
      const file = await findIntelligenceFile('link-logger-agent', 'lambda-vi-briefing-*.md');
      expect(file).not.toBeNull();
      expect(file.path).toContain('lambda-vi-briefing-');
    });

    test('should prefer most recent file', async () => {
      const file = await findIntelligenceFile('link-logger-agent', 'summaries/*.md');
      // Verify it's the newest file
    });
  });

  describe('UT-WCE-003: Content Extraction', () => {
    test('should extract from real workspace file', async () => {
      const content = await extractFromWorkspace('link-logger-agent');
      expect(content).not.toBeNull();
      expect(content).toContain('Strategic Intelligence');
      expect(content.length).toBeGreaterThan(100);
    });

    test('should truncate long content', async () => {
      const content = await extractIntelligence('/path/to/long-file.md');
      expect(content.length).toBeLessThanOrEqual(5100); // 5000 + truncation notice
      expect(content).toContain('[Content truncated]');
    });
  });

  describe('UT-WCE-004: Fallback Behavior', () => {
    test('should fallback to text when no files found', async () => {
      const content = await extractContent(sdkResult, 'text-based-agent');
      expect(content).toContain('assistant message text');
    });
  });
});
```

**2. Integration Tests** (`/api-server/tests/integration/worker-content-extraction-e2e.test.js`):
```javascript
describe('IT-WCE: Worker Content Extraction E2E', () => {
  test('IT-WCE-001: link-logger-agent posts real intelligence', async () => {
    // Create post with URL
    const post = await createPost({ content: 'Check this: https://example.com' });

    // Create ticket
    const ticket = await createTicket({ post_id: post.id, agent_id: 'link-logger-agent' });

    // Execute worker
    const worker = new AgentWorker({ ticketId: ticket.id });
    const result = await worker.execute();

    // Verify comment contains workspace content
    const comment = await getComment(result.commentId);
    expect(comment.content).toContain('Strategic Intelligence');
    expect(comment.content).not.toBe('No summary available');
  });

  test('IT-WCE-002: Text-based agent still works', async () => {
    // Test existing agent behavior preserved
  });
});
```

**3. E2E Tests** (`/tests/e2e/worker-content-extraction.spec.ts`):
```typescript
test('E2E-WCE-001: UI shows rich intelligence content', async ({ page }) => {
  // Create post with URL
  await createPostWithURL(page, 'https://example.com');

  // Wait for worker to process
  await page.waitForSelector('[data-testid="agent-comment"]', { timeout: 30000 });

  // Verify comment contains rich content
  const commentText = await page.textContent('[data-testid="comment-content"]');
  expect(commentText).toContain('Strategic Intelligence');
  expect(commentText).not.toBe('No summary available');

  // Screenshot for validation
  await page.screenshot({ path: 'screenshots/rich-intelligence-content.png' });
});
```

---

### NFR-005: Security
**Priority:** P1 (High)

**Requirements:**
- **Path Traversal Prevention:** Sanitize all file paths
- **Directory Restrictions:** Only read from `/prod/agent_workspace/{agent-name}/`
- **No Arbitrary File Access:** Validate agent workspace directory
- **Content Sanitization:** Strip executable content from markdown

**Security Measures:**
```javascript
function sanitizeWorkspacePath(agentId) {
  // Prevent path traversal attacks
  const sanitizedAgentId = path.basename(agentId); // Strip ../ attempts

  const workspaceDir = path.join('/workspaces/agent-feed/prod/agent_workspace', sanitizedAgentId);

  // Verify path is within workspace
  const resolvedPath = path.resolve(workspaceDir);
  const workspaceRoot = path.resolve('/workspaces/agent-feed/prod/agent_workspace');

  if (!resolvedPath.startsWith(workspaceRoot)) {
    throw new Error('Invalid workspace path');
  }

  return workspaceDir;
}
```

**Content Sanitization:**
- Strip `<script>` tags from markdown
- Escape HTML entities in extracted content
- Remove executable file references (`.sh`, `.exe`, etc.)

---

## 4. API Contracts

### 4.1 extractFromWorkspace()

**Function Signature:**
```typescript
async function extractFromWorkspace(agentId: string): Promise<string | null>
```

**Parameters:**
- `agentId` (string): Agent identifier (e.g., "link-logger-agent")

**Returns:**
- `string`: Extracted intelligence content (max 5000 chars)
- `null`: No workspace files found or extraction failed

**Behavior:**
1. Construct workspace path: `/prod/agent_workspace/{agentId}/`
2. Verify directory exists
3. Search file patterns in priority order
4. Select most recent file within highest priority pattern
5. Read and extract content
6. Truncate if needed
7. Return content or null

**Error Handling:**
- Directory not found → Return null
- No matching files → Return null
- File read error → Log error, return null
- Invalid content → Return null

**Example Usage:**
```javascript
const content = await extractFromWorkspace('link-logger-agent');

if (content !== null) {
  console.log('Extracted from workspace:', content.substring(0, 100));
} else {
  console.log('No workspace content found, falling back to text');
}
```

---

### 4.2 readAgentFrontmatter()

**Function Signature:**
```typescript
async function readAgentFrontmatter(agentId: string): Promise<AgentFrontmatter>
```

**Type Definitions:**
```typescript
interface AgentFrontmatter {
  name: string;
  posts_as_self: boolean;
  tier?: number;
  visibility?: string;
  proactive?: boolean;
  // ... other frontmatter fields
}
```

**Parameters:**
- `agentId` (string): Agent identifier

**Returns:**
- `AgentFrontmatter`: Parsed frontmatter object
  - Default `posts_as_self: false` if missing

**Behavior:**
1. Construct path: `/prod/.claude/agents/{agentId}.md`
2. Read file content
3. Extract YAML frontmatter (between `---` markers)
4. Parse YAML to object
5. Return parsed frontmatter

**Caching Strategy:**
```javascript
const frontmatterCache = new Map(); // { agentId: { frontmatter, timestamp } }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function readAgentFrontmatter(agentId) {
  const cached = frontmatterCache.get(agentId);

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.frontmatter;
  }

  const frontmatter = await parseAgentFrontmatter(agentId);
  frontmatterCache.set(agentId, { frontmatter, timestamp: Date.now() });

  return frontmatter;
}
```

---

### 4.3 findIntelligenceFile()

**Function Signature:**
```typescript
async function findIntelligenceFile(
  workspaceDir: string,
  patterns: FilePattern[]
): Promise<FileMatch | null>
```

**Type Definitions:**
```typescript
interface FilePattern {
  priority: number;
  glob: string;
  description: string;
  maxAge: number; // milliseconds
}

interface FileMatch {
  path: string;
  mtime: Date;
  size: number;
  pattern: FilePattern;
}
```

**Parameters:**
- `workspaceDir` (string): Full path to agent workspace
- `patterns` (FilePattern[]): Ordered list of file patterns to search

**Returns:**
- `FileMatch`: First matching file in highest priority pattern
- `null`: No matching files found

**Behavior:**
1. Iterate patterns in priority order
2. For each pattern, glob match in workspace directory
3. Filter files by `maxAge` (ignore stale files)
4. Sort matches by modification time (most recent first)
5. Return first match
6. If no matches, continue to next pattern
7. Return null if no patterns match

**Example Usage:**
```javascript
const file = await findIntelligenceFile(
  '/prod/agent_workspace/link-logger-agent',
  FILE_PATTERNS
);

if (file) {
  console.log('Found intelligence file:', file.path);
  const content = await fs.readFile(file.path, 'utf-8');
}
```

---

### 4.4 Modified processURL()

**Current Signature:**
```typescript
async processURL(ticket: Ticket): Promise<IntelligenceResult>
```

**Modified Behavior:**
```javascript
async processURL(ticket) {
  const url = ticket.url;
  const agentId = ticket.agent_id;

  // Load agent instructions (existing)
  const agentInstructions = await fs.readFile(agentInstructionsPath, 'utf-8');

  // Execute Claude Code SDK (existing)
  const result = await sdkManager.executeHeadlessTask(prompt);

  if (!result.success) {
    throw new Error(`Claude Code SDK execution failed: ${result.error}`);
  }

  // NEW: Try workspace file extraction first
  let summary = null;

  const frontmatter = await readAgentFrontmatter(agentId);

  if (frontmatter.posts_as_self === true) {
    summary = await extractFromWorkspace(agentId);

    if (summary) {
      console.log(`✅ Extracted intelligence from workspace for ${agentId}`);
    } else {
      console.log(`⚠️ No workspace files found for ${agentId}, falling back to text`);
    }
  }

  // EXISTING: Fallback to text extraction
  if (!summary) {
    summary = extractFromMessages(result.messages);
  }

  // EXISTING: Calculate tokens
  const tokensUsed = calculateTokenUsage(result.messages);

  return {
    title: `Intelligence: ${url}`,
    summary: summary || 'No summary available',
    tokensUsed: tokensUsed,
    completedAt: Date.now()
  };
}
```

---

## 5. File Patterns Reference

### 5.1 Standard Intelligence Files

**link-logger-agent Workspace Structure:**
```
/prod/agent_workspace/link-logger-agent/
├── lambda-vi-briefing-*.md          # Executive briefings
│   ├── lambda-vi-briefing-agentdb-20241024.md (35 lines)
│   └── lambda-vi-briefing-2024-10-23.md
│
├── summaries/
│   ├── agentdb-progressive-summary.md (100-200 lines)
│   ├── lambda-vi-strategic-brief.md
│   └── agent-feed-post-draft.md
│
├── intelligence/
│   ├── agentdb-competitive-intelligence.md (125 lines)
│   └── agentdb-agent-feed-post.md
│
├── competitive-intel/
│   ├── competitor-analysis-*.md
│   └── market-positioning-*.md
│
└── strategic-analysis/
    ├── business-impact-assessment.md
    └── opportunity-analysis.md
```

### 5.2 File Content Formats

**Lambda VI Briefing Format:**
```markdown
# Λvi Strategic Intelligence Briefing: [Topic]
**Priority:** HIGH (8/10 Strategic Value)
**Date:** 2024-10-24
**Intelligence Type:** Competitive Technology Analysis

## Executive Summary for Chief of Staff
[2-3 sentence strategic overview]

## Strategic Impact Assessment
- **Competitive Threat Level:** MODERATE-HIGH
- **Business Impact:** 8/10
- **Market Timing:** Critical

## Key Strategic Implications
1. [Implication 1]
2. [Implication 2]

## Recommended Immediate Actions
- [Action 1]
- [Action 2]
```

**Progressive Summary Format:**
```markdown
# [Topic] - Progressive Summary

## Quick Assessment (30 seconds)
[Strategic value, content type, priority]

## Key Intelligence Points (2 minutes)
- [Point 1]
- [Point 2]
- [Point 3]

## Detailed Analysis (5 minutes)
[Comprehensive analysis 200-500 words]

## Strategic Implications
[Business impact, competitive analysis]
```

**Intelligence Report Format:**
```markdown
# [Topic] Competitive Intelligence Analysis
**Date:** 2025-01-24
**Analyst:** Λvi (Strategic Intelligence)
**Classification:** COMPETITIVE ALERT - Category 1

## EXECUTIVE SUMMARY
[Strategic overview]

## KEY FINDINGS
### Technical Architecture
[Technical details]

### Business Model
[Business analysis]

## COMPETITIVE THREAT ASSESSMENT
[Threat analysis]

## STRATEGIC RECOMMENDATIONS
[Recommended actions]
```

---

## 6. Error Handling Strategy

### 6.1 Error Classification

| Error Code | Severity | Description | Handling |
|-----------|----------|-------------|----------|
| ERR-WCE-001 | WARNING | Frontmatter file not found | Return default frontmatter |
| ERR-WCE-002 | WARNING | Invalid YAML frontmatter | Log warning, return default |
| ERR-WCE-003 | WARNING | Workspace directory missing | Skip file extraction |
| ERR-WCE-004 | WARNING | No matching files found | Fall back to text extraction |
| ERR-WCE-005 | WARNING | File read permission denied | Skip file, try next pattern |
| ERR-WCE-006 | ERROR | File system timeout | Skip file extraction |
| ERR-WCE-007 | WARNING | Empty file found | Ignore, continue search |
| ERR-WCE-008 | WARNING | Corrupted file content | Extract partial content |

### 6.2 Error Recovery Flow

```javascript
async function extractWithErrorHandling(agentId) {
  const errors = [];

  try {
    // Step 1: Frontmatter detection
    const frontmatter = await readAgentFrontmatter(agentId);

    if (!frontmatter.posts_as_self) {
      return null; // Not file-based agent
    }

    // Step 2: Workspace file search
    const file = await findIntelligenceFile(agentId);

    if (!file) {
      errors.push({ code: 'ERR-WCE-004', message: 'No matching files' });
      return null;
    }

    // Step 3: Content extraction
    const content = await extractContent(file.path);

    if (!content || !content.trim()) {
      errors.push({ code: 'ERR-WCE-007', message: 'Empty file' });
      return null;
    }

    return content;

  } catch (err) {
    console.error(`Workspace extraction error for ${agentId}:`, err);
    errors.push({ code: 'ERR-WCE-006', message: err.message });
    return null;
  } finally {
    // Log all errors for debugging
    if (errors.length > 0) {
      console.log(`Workspace extraction errors for ${agentId}:`, errors);
    }
  }
}
```

### 6.3 Logging Strategy

**Log Levels:**
- **INFO:** Successful extraction
- **WARNING:** Fallback to text extraction
- **ERROR:** File system errors

**Example Logs:**
```javascript
// Success
console.log(`✅ [${agentId}] Extracted 1,234 chars from ${filePath}`);

// Fallback
console.warn(`⚠️ [${agentId}] No workspace files found, using text extraction`);

// Error
console.error(`❌ [${agentId}] File read error: ${err.message}`);
```

---

## 7. Test Plan

### 7.1 Test Strategy

**Test Pyramid:**
```
       E2E Tests (10%)
      /            \
    Integration Tests (30%)
   /                       \
Unit Tests (60%)
```

**Coverage Requirements:**
- **Line Coverage:** 100%
- **Branch Coverage:** 100%
- **Function Coverage:** 100%

**Real File Requirements:**
- NO MOCKS for file system operations
- Use actual workspace files from `/prod/agent_workspace/link-logger-agent/`
- Create test fixtures for different file patterns
- Test with real agent frontmatter files

### 7.2 Unit Tests

**Test Suite:** `/api-server/tests/unit/worker-content-extraction.test.js`

**Test Cases:**

```javascript
describe('Worker Content Extraction Unit Tests', () => {

  describe('UT-WCE-001: Frontmatter Detection', () => {
    test('should detect posts_as_self: true for link-logger-agent', async () => {
      const frontmatter = await readAgentFrontmatter('link-logger-agent');
      expect(frontmatter.posts_as_self).toBe(true);
      expect(frontmatter.name).toBe('link-logger-agent');
    });

    test('should return default for missing frontmatter', async () => {
      const frontmatter = await readAgentFrontmatter('non-existent-agent');
      expect(frontmatter.posts_as_self).toBe(false);
    });

    test('should cache frontmatter for performance', async () => {
      const start1 = Date.now();
      await readAgentFrontmatter('link-logger-agent');
      const duration1 = Date.now() - start1;

      const start2 = Date.now();
      await readAgentFrontmatter('link-logger-agent');
      const duration2 = Date.now() - start2;

      expect(duration2).toBeLessThan(duration1 * 0.1); // 10x faster from cache
    });

    test('should handle malformed YAML gracefully', async () => {
      // Test with corrupted frontmatter file
      const frontmatter = await readAgentFrontmatter('malformed-agent');
      expect(frontmatter.posts_as_self).toBe(false); // Default fallback
    });
  });

  describe('UT-WCE-002: File Pattern Matching', () => {
    test('should find lambda-vi-briefing files (Priority 1)', async () => {
      const file = await findIntelligenceFile(
        '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent',
        FILE_PATTERNS
      );

      expect(file).not.toBeNull();
      expect(file.path).toContain('lambda-vi-briefing-');
      expect(file.pattern.priority).toBe(1);
    });

    test('should prefer most recent file within pattern', async () => {
      const file = await findIntelligenceFile(
        '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent',
        [{ priority: 1, glob: 'summaries/*.md', maxAge: 7200000 }]
      );

      // Verify it's the most recent file
      const allFiles = await glob('summaries/*.md');
      const sortedFiles = allFiles.sort((a, b) => b.mtime - a.mtime);

      expect(file.path).toBe(sortedFiles[0].path);
    });

    test('should skip files older than maxAge', async () => {
      // Create old file (more than 1 hour old)
      const oldFile = '/tmp/old-file.md';
      await fs.writeFile(oldFile, 'old content');
      await fs.utimes(oldFile, new Date('2024-01-01'), new Date('2024-01-01'));

      const file = await findIntelligenceFile('/tmp', [
        { priority: 1, glob: 'old-file.md', maxAge: 3600000 }
      ]);

      expect(file).toBeNull(); // File too old
    });

    test('should respect priority hierarchy', async () => {
      // Test with workspace containing multiple pattern matches
      const file = await findIntelligenceFile(
        '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent',
        FILE_PATTERNS
      );

      // Should return Priority 1 file even if Priority 2 is more recent
      expect(file.pattern.priority).toBe(1);
    });
  });

  describe('UT-WCE-003: Content Extraction', () => {
    test('should extract full content from real workspace file', async () => {
      const content = await extractFromWorkspace('link-logger-agent');

      expect(content).not.toBeNull();
      expect(content).toContain('Strategic Intelligence');
      expect(content.length).toBeGreaterThan(100);
      expect(content.length).toBeLessThanOrEqual(5100);
    });

    test('should strip YAML frontmatter from content', async () => {
      const rawContent = `---
name: test
---
# Content`;

      const stripped = stripFrontmatter(rawContent);
      expect(stripped).not.toContain('---');
      expect(stripped).toContain('# Content');
    });

    test('should truncate long content at paragraph boundary', async () => {
      const longContent = 'a'.repeat(6000) + '\n\n' + 'b'.repeat(100);
      const truncated = truncateContent(longContent, 5000);

      expect(truncated.length).toBeLessThan(5100);
      expect(truncated).toContain('[Content truncated]');
      expect(truncated).not.toContain('b'.repeat(100)); // Truncated section
    });

    test('should preserve markdown formatting', async () => {
      const markdown = `# Header\n\n## Subheader\n\n- Bullet 1\n- Bullet 2`;
      const extracted = extractContent(markdown);

      expect(extracted).toContain('# Header');
      expect(extracted).toContain('## Subheader');
      expect(extracted).toContain('- Bullet 1');
    });

    test('should handle empty files gracefully', async () => {
      const content = await extractContent('');
      expect(content).toBeNull();
    });
  });

  describe('UT-WCE-004: Fallback Behavior', () => {
    test('should fallback to text when posts_as_self is false', async () => {
      const sdkResult = {
        messages: [
          { type: 'assistant', content: 'Text-based agent response' }
        ]
      };

      const content = await extractContentWithFallback(sdkResult, 'text-agent');
      expect(content).toBe('Text-based agent response');
    });

    test('should fallback to text when workspace extraction fails', async () => {
      const sdkResult = {
        messages: [
          { type: 'assistant', content: 'Fallback text' }
        ]
      };

      const content = await extractContentWithFallback(sdkResult, 'file-agent-no-files');
      expect(content).toBe('Fallback text');
    });

    test('should use "No summary available" as ultimate fallback', async () => {
      const sdkResult = { messages: [] };
      const content = await extractContentWithFallback(sdkResult, 'empty-agent');
      expect(content).toBe('No summary available');
    });
  });

  describe('UT-WCE-005: Performance Tests', () => {
    test('should complete file extraction in <50ms', async () => {
      const start = performance.now();
      await extractFromWorkspace('link-logger-agent');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    test('should cache frontmatter reading', async () => {
      // First call (uncached)
      const start1 = Date.now();
      await readAgentFrontmatter('link-logger-agent');
      const duration1 = Date.now() - start1;

      // Second call (cached)
      const start2 = Date.now();
      await readAgentFrontmatter('link-logger-agent');
      const duration2 = Date.now() - start2;

      expect(duration2).toBeLessThan(10); // <10ms from cache
    });
  });

  describe('UT-WCE-006: Error Handling', () => {
    test('should handle missing workspace directory', async () => {
      const content = await extractFromWorkspace('non-existent-agent');
      expect(content).toBeNull();
    });

    test('should handle file read permission errors', async () => {
      // Create file with no read permission
      const restrictedFile = '/tmp/restricted.md';
      await fs.writeFile(restrictedFile, 'content');
      await fs.chmod(restrictedFile, 0o000);

      const content = await extractFromWorkspace('restricted-agent');
      expect(content).toBeNull();
    });

    test('should handle corrupted file content', async () => {
      // Test with binary file or invalid UTF-8
      const content = await extractContent('/path/to/binary.bin');
      expect(content).toBeNull();
    });
  });

  describe('UT-WCE-007: Security Tests', () => {
    test('should prevent path traversal attacks', async () => {
      await expect(
        extractFromWorkspace('../../../etc/passwd')
      ).rejects.toThrow('Invalid workspace path');
    });

    test('should restrict to workspace directory', async () => {
      const workspaceDir = sanitizeWorkspacePath('link-logger-agent');
      expect(workspaceDir).toContain('/prod/agent_workspace/link-logger-agent');
      expect(workspaceDir).not.toContain('..');
    });
  });
});
```

### 7.3 Integration Tests

**Test Suite:** `/api-server/tests/integration/worker-content-extraction-e2e.test.js`

**Test Cases:**

```javascript
describe('Worker Content Extraction Integration Tests', () => {
  let db;
  let workQueueRepo;

  beforeAll(async () => {
    // Initialize test database
    db = new Database('/tmp/test-worker-content.db');
    workQueueRepo = new WorkQueueRepository(db);
  });

  describe('IT-WCE-001: Full E2E Flow with link-logger-agent', () => {
    test('should extract workspace content and create rich comment', async () => {
      // Create post
      const post = await createPost({
        content: 'Check this article: https://example.com/ai-trends',
        author_id: 'user-123'
      });

      // Create ticket
      const ticket = await createTicket({
        agent_id: 'link-logger-agent',
        url: 'https://example.com/ai-trends',
        post_id: post.id
      });

      // Execute worker
      const worker = new AgentWorker({
        ticketId: ticket.id,
        agentId: 'link-logger-agent',
        workQueueRepo: workQueueRepo
      });

      // Mock Claude SDK (but use REAL file extraction)
      worker.processURL = async (ticket) => {
        // Execute real Claude Code SDK
        const sdkResult = await executeClaudeSDK(ticket);

        // This will use REAL workspace file extraction
        const content = await extractContentWithFallback(sdkResult, ticket.agent_id);

        return {
          title: `Intelligence: ${ticket.url}`,
          summary: content,
          tokensUsed: 1500,
          completedAt: Date.now()
        };
      };

      const result = await worker.execute();

      // Verify result
      expect(result.success).toBe(true);
      expect(result.commentId).toBeTruthy();

      // Verify comment in database
      const comment = await db.prepare('SELECT * FROM comments WHERE id = ?')
        .get(result.commentId);

      expect(comment.content).toContain('Strategic Intelligence');
      expect(comment.content).not.toBe('No summary available');
      expect(comment.content.length).toBeGreaterThan(500);
      expect(comment.author_agent).toBe('link-logger-agent');
    });
  });

  describe('IT-WCE-002: Backward Compatibility Tests', () => {
    test('should work with existing text-based agents', async () => {
      // Test that text extraction still works
    });

    test('should fallback to text when workspace empty', async () => {
      // Test fallback behavior
    });
  });

  describe('IT-WCE-003: Multiple Agents Concurrently', () => {
    test('should handle multiple workers with different agents', async () => {
      // Test concurrent execution
    });
  });
});
```

### 7.4 E2E Tests

**Test Suite:** `/tests/e2e/worker-content-extraction.spec.ts`

**Test Cases:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('E2E: Worker Content Extraction UI Validation', () => {

  test('E2E-WCE-001: Rich intelligence content displays in UI', async ({ page }) => {
    // Navigate to agent feed
    await page.goto('http://localhost:5173');

    // Wait for feed to load
    await page.waitForSelector('[data-testid="agent-feed"]');

    // Create post with URL
    await page.fill('[data-testid="post-input"]',
      'Interesting article: https://example.com/ai-trends');
    await page.click('[data-testid="submit-post"]');

    // Wait for post to appear
    await page.waitForSelector('[data-testid="post-card"]');

    // Wait for agent to process (up to 30 seconds)
    await page.waitForSelector('[data-testid="agent-comment"]', {
      timeout: 30000
    });

    // Verify comment content
    const commentText = await page.textContent('[data-testid="comment-content"]');
    expect(commentText).toContain('Strategic Intelligence');
    expect(commentText).toContain('Competitive Analysis');
    expect(commentText).not.toBe('No summary available');

    // Verify comment length
    expect(commentText.length).toBeGreaterThan(500);

    // Screenshot for validation
    await page.screenshot({
      path: 'tests/screenshots/rich-intelligence-comment.png',
      fullPage: true
    });
  });

  test('E2E-WCE-002: Verify no "No summary available" messages', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Check all existing comments
    const comments = await page.$$('[data-testid="comment-content"]');

    for (const comment of comments) {
      const text = await comment.textContent();
      const authorAgent = await comment.getAttribute('data-author-agent');

      if (authorAgent === 'link-logger-agent') {
        expect(text).not.toBe('No summary available');
        expect(text.length).toBeGreaterThan(100);
      }
    }
  });

  test('E2E-WCE-003: Verify text-based agents still work', async ({ page }) => {
    // Test existing agent behavior preserved
  });
});
```

### 7.5 Test Data Requirements

**Real Workspace Files:**
- Use actual files from `/prod/agent_workspace/link-logger-agent/`
- DO NOT mock file system operations
- Create test fixtures for different scenarios:

```bash
# Test fixtures directory structure
/tests/fixtures/agent-workspaces/
├── link-logger-agent/
│   ├── lambda-vi-briefing-test-1.md      # Fresh file (<1 hour old)
│   ├── lambda-vi-briefing-test-2.md      # Old file (>2 hours old)
│   ├── summaries/
│   │   ├── test-summary-1.md
│   │   └── test-summary-2.md
│   └── intelligence/
│       └── test-intelligence.md
│
├── text-based-agent/
│   └── (empty - no workspace files)
│
└── mixed-agent/
    ├── summaries/
    │   └── mixed-summary.md
    └── (Claude also returns text)
```

---

## 8. Success Metrics

### 8.1 Functional Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| link-logger-agent content extraction success rate | 100% | Integration tests |
| Backward compatibility preserved | 100% | Regression tests |
| Fallback success rate | 100% | Unit tests |
| File pattern matching accuracy | 100% | Unit tests |

### 8.2 Performance Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| File extraction time | <50ms | Performance tests |
| Frontmatter parsing time | <10ms | Unit tests |
| Pattern matching time | <30ms | Unit tests |
| Total overhead added | <100ms | Integration tests |
| Cache hit rate | >80% | Production monitoring |

### 8.3 Quality Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Test coverage (line) | 100% | vitest coverage report |
| Test coverage (branch) | 100% | vitest coverage report |
| Test coverage (function) | 100% | vitest coverage report |
| Tests using real files | 100% | Code review |
| E2E tests with screenshots | 3+ | Playwright test count |

### 8.4 User Experience Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| "No summary available" rate for link-logger | 0% | Production monitoring |
| Average comment length for link-logger | >500 chars | Database query |
| User satisfaction with agent responses | >90% | User feedback |
| Comment readability score | >60 (Flesch) | Content analysis |

---

## 9. Implementation Roadmap

### Phase 1: Core Implementation (Week 1)

**Deliverables:**
- `extractFromWorkspace()` function
- `readAgentFrontmatter()` function
- `findIntelligenceFile()` function
- Modified `processURL()` method
- Unit tests (60% of test suite)

**Success Criteria:**
- All unit tests passing
- 100% line coverage
- Performance targets met

---

### Phase 2: Integration Testing (Week 1-2)

**Deliverables:**
- Integration test suite
- E2E test suite with Playwright
- Screenshot validation
- Performance benchmarks

**Success Criteria:**
- All integration tests passing
- E2E tests with screenshots
- Real workspace files used (no mocks)

---

### Phase 3: Production Validation (Week 2)

**Deliverables:**
- Production deployment
- Monitoring dashboard
- Error tracking
- Performance metrics

**Success Criteria:**
- link-logger-agent posts rich content
- Zero "No summary available" for link-logger
- No regressions in existing agents
- Performance within targets

---

## 10. Risk Assessment

### 10.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| File system performance issues | MEDIUM | HIGH | Caching, async operations, timeouts |
| Workspace files not created | LOW | HIGH | Fallback to text extraction |
| Pattern matching misses files | LOW | MEDIUM | Comprehensive test coverage |
| Path traversal security issues | LOW | CRITICAL | Path sanitization, validation |
| Backward compatibility broken | LOW | CRITICAL | Extensive regression testing |

### 10.2 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Increased worker execution time | MEDIUM | LOW | Performance monitoring, optimization |
| Disk space exhaustion | LOW | MEDIUM | Workspace cleanup policies |
| File permission issues | LOW | MEDIUM | Proper file permissions, error handling |
| Cache memory growth | MEDIUM | LOW | TTL-based cache invalidation |

### 10.3 User Experience Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Stale content displayed | LOW | MEDIUM | maxAge checks, timestamp validation |
| Truncated content loses context | MEDIUM | LOW | Smart truncation at paragraph boundaries |
| Long comments hurt readability | MEDIUM | LOW | 5000 char limit with truncation notice |

---

## 11. Acceptance Criteria Summary

### Must Have (P0)

- [ ] **AC-FR-001:** Worker detects `posts_as_self` flag from agent frontmatter
- [ ] **AC-FR-002:** Worker searches workspace for intelligence files
- [ ] **AC-FR-003:** Worker uses file pattern priority system
- [ ] **AC-FR-004:** Worker extracts and formats intelligence content
- [ ] **AC-FR-005:** Worker falls back to text extraction when no files found
- [ ] **AC-FR-006:** Worker sets `skipTicket: true` on all comments
- [ ] **AC-NFR-001:** File reading completes in <50ms
- [ ] **AC-NFR-002:** All file operations handle errors gracefully
- [ ] **AC-NFR-003:** 100% backward compatibility preserved
- [ ] **AC-NFR-004:** 100% test coverage with real files

### Should Have (P1)

- [ ] **AC-P1-001:** Frontmatter caching for performance
- [ ] **AC-P1-002:** Workspace cleanup policies
- [ ] **AC-P1-003:** Production monitoring dashboard
- [ ] **AC-P1-004:** Error tracking and alerting

### Nice to Have (P2)

- [ ] **AC-P2-001:** Content quality scoring
- [ ] **AC-P2-002:** Intelligent truncation (preserve key sections)
- [ ] **AC-P2-003:** Multi-file aggregation
- [ ] **AC-P2-004:** User preferences for content length

---

## 12. Open Questions

### Technical Questions

1. **Q:** Should we support multiple file formats (JSON, TXT, HTML)?
   **A:** (TBD) Start with markdown only, evaluate need in Phase 3

2. **Q:** Should we aggregate content from multiple files?
   **A:** (TBD) Single file only for MVP, multi-file in future

3. **Q:** What happens if workspace contains thousands of files?
   **A:** (TBD) Implement directory depth limit (2 levels) and file count limit (100 files per pattern)

4. **Q:** Should we support custom file patterns per agent?
   **A:** (TBD) Fixed patterns for MVP, agent-specific patterns in future

### Product Questions

1. **Q:** Should users be able to configure content length preferences?
   **A:** (TBD) Fixed 5000 char limit for MVP, user preferences later

2. **Q:** Should we show metadata (file path, timestamp) in comment?
   **A:** (TBD) No metadata for MVP, evaluate based on user feedback

3. **Q:** How do we handle multiple versions of same intelligence?
   **A:** (TBD) Most recent file only, history feature in future

---

## 13. Dependencies

### Internal Dependencies
- **AgentWorker** (`/api-server/worker/agent-worker.js`)
- **WorkQueueRepository** (`/api-server/repositories/work-queue-repository.js`)
- **Claude Code SDK Manager** (`/prod/src/services/ClaudeCodeSDKManager.js`)
- **Agent Frontmatter** (`/prod/.claude/agents/*.md`)
- **Agent Workspace** (`/prod/agent_workspace/{agent-name}/`)

### External Dependencies
- **Node.js** >= 18 (for `fs.promises`, native fetch)
- **better-sqlite3** (database operations)
- **vitest** (testing framework)
- **playwright** (E2E testing)

---

## 14. Documentation Requirements

### Code Documentation
- JSDoc comments for all public functions
- Inline comments for complex logic
- README updates for new features

### User Documentation
- Agent developer guide: How to use workspace file extraction
- Troubleshooting guide: Common issues and solutions
- Performance tuning guide: Optimization strategies

### API Documentation
- Function signatures and return types
- Error codes and handling
- Usage examples

---

## 15. Appendix

### A. Example Intelligence File

**File:** `/prod/agent_workspace/link-logger-agent/lambda-vi-briefing-agentdb-20241024.md`

```markdown
# Λvi Strategic Intelligence Briefing: AgentDB
**Priority:** HIGH (8/10 Strategic Value)
**Date:** 2024-10-24
**Intelligence Type:** Competitive Technology Analysis
**Time Sensitivity:** High - Emerging Infrastructure Threat

## Executive Summary for Chief of Staff
Reuven Cohen has launched AgentDB, a specialized vector database claiming
150x-12,500x performance improvements over traditional solutions for AI agent
memory systems. This represents a significant competitive development that could
impact our agent infrastructure strategy and market positioning.

## Strategic Impact Assessment
- **Competitive Threat Level:** MODERATE-HIGH
- **Business Impact:** 8/10 - Could affect our infrastructure competitiveness
- **Market Timing:** Critical - Early infrastructure decisions shape ecosystem
- **Response Urgency:** 30-day technical evaluation recommended

## Key Strategic Implications
1. **Performance Gap Risk:** Our current memory systems may lag behind these benchmarks
2. **Market Positioning:** Early adopters could gain significant advantages
3. **Architecture Decision:** Embedded vs. distributed approach considerations
4. **Competitive Response:** Need to accelerate our own optimization initiatives

## Recommended Immediate Actions
- Deploy AgentDB in test environment for performance validation
- Benchmark against current Λvi coordination infrastructure
- Assess architectural implications for our agent ecosystem
- Monitor adoption rates and developer community feedback

## Strategic Coordination Required
This intelligence requires cross-functional coordination with:
- Infrastructure planning team
- Competitive strategy assessment
- Technology evaluation resources
- Market positioning strategy

**Λvi Decision Point:** Should we prioritize competitive response, potential
integration, or differentiation strategy?
```

**Expected Comment Output:**
```markdown
# Λvi Strategic Intelligence Briefing: AgentDB
**Priority:** HIGH (8/10 Strategic Value)
**Date:** 2024-10-24
**Intelligence Type:** Competitive Technology Analysis
**Time Sensitivity:** High - Emerging Infrastructure Threat

[... full content ...]

---
*Intelligence captured by link-logger-agent from workspace file*
```

---

### B. File Pattern Examples

**Pattern 1: Lambda VI Briefing**
```
lambda-vi-briefing-agentdb-20241024.md
lambda-vi-briefing-ai-trends-20241023.md
lambda-vi-briefing-market-analysis-20241022.md
```

**Pattern 2: Summaries**
```
summaries/agentdb-progressive-summary.md
summaries/ai-trends-detailed-analysis.md
summaries/market-research-synthesis.md
```

**Pattern 3: Intelligence**
```
intelligence/agentdb-competitive-intelligence.md
intelligence/competitor-analysis-openai.md
intelligence/market-opportunity-assessment.md
```

---

### C. Error Code Reference

| Code | Severity | Description | User Impact |
|------|----------|-------------|-------------|
| ERR-WCE-001 | WARNING | Frontmatter file not found | None (fallback works) |
| ERR-WCE-002 | WARNING | Invalid YAML frontmatter | None (default used) |
| ERR-WCE-003 | WARNING | Workspace directory missing | None (text fallback) |
| ERR-WCE-004 | WARNING | No matching files found | None (text fallback) |
| ERR-WCE-005 | WARNING | File read permission denied | None (skip file) |
| ERR-WCE-006 | ERROR | File system timeout | Possible degraded performance |
| ERR-WCE-007 | WARNING | Empty file found | None (continue search) |
| ERR-WCE-008 | WARNING | Corrupted file content | Partial content extracted |

---

## 16. Sign-Off

This specification defines a comprehensive solution for worker content extraction
enhancement. All requirements are testable, measurable, and achievable within
the proposed timeline.

**Next Phase:** Pseudocode & Architecture Design

**Review Required From:**
- [ ] Technical Lead
- [ ] Product Owner
- [ ] QA Lead
- [ ] Security Team

---

**Document End**
