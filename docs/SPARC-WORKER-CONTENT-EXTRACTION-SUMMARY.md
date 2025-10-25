# Worker Content Extraction Enhancement - Quick Summary

**Full Specification:** `/workspaces/agent-feed/docs/SPARC-WORKER-CONTENT-EXTRACTION.md`
**Status:** SPECIFICATION PHASE COMPLETE
**Date:** 2025-10-24

---

## Problem Statement

The agent-worker.js currently only extracts content from Claude assistant text messages. This fails for agents like link-logger-agent that save their intelligence to workspace files instead of returning text.

**Current Behavior:**
- Worker extracts from assistant messages → Empty
- Falls back to "No summary available"
- User sees useless comment

**Expected Behavior:**
- Worker detects `posts_as_self: true` flag
- Worker searches workspace for intelligence files
- Worker extracts rich intelligence content
- User sees comprehensive analysis

---

## Solution Overview

### 1. Agent Frontmatter Detection (FR-001)
Read agent frontmatter to detect `posts_as_self: true` flag.

```yaml
# /prod/.claude/agents/link-logger-agent.md
---
name: link-logger-agent
posts_as_self: true
---
```

### 2. Workspace File Search (FR-002, FR-003)
Search agent workspace for intelligence files using priority patterns:

```
Priority 1: lambda-vi-briefing-*.md          # Executive briefings
Priority 2: summaries/*.md                   # Progressive summaries
Priority 3: intelligence/*.md                # Detailed analysis
Priority 4: competitive-intel/*.md           # Competitive intel
Priority 5: strategic-analysis/*.md          # Strategic reports
Priority 6: analysis/*.md                    # General analysis
```

### 3. Content Extraction (FR-004)
- Read most recent file from highest priority pattern
- Strip YAML frontmatter
- Truncate to 5000 chars (smart truncation at paragraph boundary)
- Preserve markdown formatting

### 4. Fallback Strategy (FR-005)
```javascript
// Execution flow
if (frontmatter.posts_as_self === true) {
  content = extractFromWorkspace(agentId);
  if (content !== null) return content;
}

// Fallback to existing text extraction
content = extractFromMessages(messages);
return content || 'No summary available';
```

---

## Key Requirements

### Functional Requirements
- **FR-001:** Frontmatter detection with `posts_as_self` flag
- **FR-002:** Workspace file pattern detection
- **FR-003:** File pattern priority system (6 levels)
- **FR-004:** Intelligence content extraction (max 5000 chars)
- **FR-005:** Fallback to text extraction
- **FR-006:** `skipTicket: true` preservation (already implemented)

### Non-Functional Requirements
- **NFR-001:** Performance - File reading <50ms
- **NFR-002:** Reliability - Handle all errors gracefully
- **NFR-003:** Compatibility - 100% backward compatible
- **NFR-004:** Testability - 100% coverage with real files (NO MOCKS)
- **NFR-005:** Security - Path traversal prevention

---

## File Patterns Reference

### link-logger-agent Workspace Structure
```
/prod/agent_workspace/link-logger-agent/
├── lambda-vi-briefing-*.md          # 35 lines, executive briefings
├── summaries/*.md                   # 100-200 lines, progressive summaries
├── intelligence/*.md                # 125 lines, detailed analysis
├── competitive-intel/*.md           # Competitive intelligence
└── strategic-analysis/*.md          # Strategic assessments
```

### Example File Content
**File:** `lambda-vi-briefing-agentdb-20241024.md` (35 lines)
```markdown
# Λvi Strategic Intelligence Briefing: AgentDB
**Priority:** HIGH (8/10 Strategic Value)
**Date:** 2024-10-24

## Executive Summary for Chief of Staff
Reuven Cohen has launched AgentDB, a specialized vector database...

## Strategic Impact Assessment
- **Competitive Threat Level:** MODERATE-HIGH
- **Business Impact:** 8/10

## Key Strategic Implications
1. Performance Gap Risk
2. Market Positioning
3. Architecture Decision

## Recommended Immediate Actions
- Deploy AgentDB in test environment
- Benchmark against current infrastructure
```

---

## API Contracts

### extractFromWorkspace()
```typescript
async function extractFromWorkspace(agentId: string): Promise<string | null>
```
- **Returns:** Extracted content (max 5000 chars) or null
- **Behavior:** Search workspace, read file, extract content
- **Performance:** <50ms

### readAgentFrontmatter()
```typescript
async function readAgentFrontmatter(agentId: string): Promise<AgentFrontmatter>
```
- **Returns:** Parsed frontmatter with `posts_as_self` flag
- **Caching:** 5-minute TTL
- **Performance:** <10ms (cached)

### findIntelligenceFile()
```typescript
async function findIntelligenceFile(
  workspaceDir: string,
  patterns: FilePattern[]
): Promise<FileMatch | null>
```
- **Returns:** Most recent file in highest priority pattern
- **Performance:** <30ms

---

## Test Strategy

### Test Pyramid
```
       E2E Tests (10%) - UI validation, screenshots
      /            \
    Integration Tests (30%) - Real database, real files
   /                       \
Unit Tests (60%) - Function-level, real files
```

### Key Test Cases

**Unit Tests (UT-WCE):**
- UT-WCE-001: Frontmatter detection for link-logger-agent
- UT-WCE-002: File pattern matching (Priority 1-6)
- UT-WCE-003: Content extraction from real workspace files
- UT-WCE-004: Fallback to text extraction
- UT-WCE-005: Performance (<50ms)
- UT-WCE-006: Error handling (missing files, permissions)
- UT-WCE-007: Security (path traversal prevention)

**Integration Tests (IT-WCE):**
- IT-WCE-001: Full E2E flow with link-logger-agent
- IT-WCE-002: Backward compatibility with text-based agents
- IT-WCE-003: Concurrent workers processing different agents

**E2E Tests (E2E-WCE):**
- E2E-WCE-001: Rich intelligence content displays in UI
- E2E-WCE-002: Verify no "No summary available" messages
- E2E-WCE-003: Text-based agents still work unchanged

### Test Data Requirements
- **CRITICAL:** Use REAL workspace files (NO MOCKS)
- Test fixtures: `/tests/fixtures/agent-workspaces/`
- Real files: `/prod/agent_workspace/link-logger-agent/`

---

## Success Metrics

### Functional Metrics
- link-logger-agent content extraction: **100%** success rate
- Backward compatibility: **100%** preserved
- Fallback success rate: **100%**

### Performance Metrics
- File extraction time: **<50ms**
- Frontmatter parsing: **<10ms**
- Total overhead: **<100ms**
- Cache hit rate: **>80%**

### Quality Metrics
- Test coverage: **100%** (line, branch, function)
- Tests using real files: **100%**
- E2E tests with screenshots: **3+**

### User Experience Metrics
- "No summary available" for link-logger: **0%**
- Average comment length: **>500 chars**
- User satisfaction: **>90%**

---

## Implementation Roadmap

### Phase 1: Core Implementation (Week 1)
- [ ] `extractFromWorkspace()` function
- [ ] `readAgentFrontmatter()` function
- [ ] `findIntelligenceFile()` function
- [ ] Modified `processURL()` method
- [ ] Unit tests (60% coverage)

### Phase 2: Integration Testing (Week 1-2)
- [ ] Integration test suite
- [ ] E2E test suite with Playwright
- [ ] Screenshot validation
- [ ] Performance benchmarks

### Phase 3: Production Validation (Week 2)
- [ ] Production deployment
- [ ] Monitoring dashboard
- [ ] Error tracking
- [ ] Performance metrics validation

---

## Risk Assessment

### High Priority Risks
| Risk | Mitigation |
|------|------------|
| File system performance issues | Caching, async operations, timeouts |
| Backward compatibility broken | Extensive regression testing |
| Path traversal security | Path sanitization, validation |

### Medium Priority Risks
| Risk | Mitigation |
|------|------------|
| Workspace files not created | Fallback to text extraction |
| Increased worker execution time | Performance monitoring |
| Stale content displayed | maxAge checks, timestamp validation |

---

## Key Files

### Implementation Files
- `/api-server/worker/agent-worker.js` - Main worker (lines 126-207)
- `/prod/.claude/agents/link-logger-agent.md` - Agent frontmatter
- `/prod/agent_workspace/link-logger-agent/` - Workspace directory

### Test Files
- `/api-server/tests/unit/worker-content-extraction.test.js` (NEW)
- `/api-server/tests/integration/worker-content-extraction-e2e.test.js` (NEW)
- `/tests/e2e/worker-content-extraction.spec.ts` (NEW)
- `/api-server/tests/integration/agent-worker-e2e.test.js` (EXISTING)

### Documentation Files
- `/workspaces/agent-feed/docs/SPARC-WORKER-CONTENT-EXTRACTION.md` (THIS SPEC)
- `/workspaces/agent-feed/docs/SPARC-WORKER-CONTENT-EXTRACTION-SUMMARY.md` (THIS FILE)

---

## Example Usage

### Before (Current)
```javascript
// Worker extracts from assistant messages
const summary = assistantMessages
  .map(msg => msg.content)
  .join('\n\n');

// Result: Empty string
// Fallback: "No summary available"
```

### After (Enhanced)
```javascript
// Worker checks frontmatter
const frontmatter = await readAgentFrontmatter('link-logger-agent');

if (frontmatter.posts_as_self === true) {
  // Extract from workspace
  const content = await extractFromWorkspace('link-logger-agent');
  if (content) {
    return content; // Rich intelligence content!
  }
}

// Fallback to text extraction
const summary = extractFromMessages(messages);
return summary || 'No summary available';
```

---

## Next Steps

1. **Review Specification:** Technical lead, product owner, QA lead
2. **Architecture Design:** Create system architecture diagrams
3. **Pseudocode:** Write detailed pseudocode for all functions
4. **Implementation:** TDD approach with tests-first
5. **Integration Testing:** Real database, real files
6. **E2E Validation:** UI testing with screenshots
7. **Production Deployment:** Monitor and validate

---

## Questions?

See full specification for:
- Detailed API contracts
- Error handling strategies
- Complete test cases
- Security considerations
- Performance optimization
- Open questions and dependencies

**Full Spec Location:** `/workspaces/agent-feed/docs/SPARC-WORKER-CONTENT-EXTRACTION.md`
