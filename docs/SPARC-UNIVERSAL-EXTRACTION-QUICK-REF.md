# Universal Extraction System - Quick Reference

**Full Specification:** [SPARC-UNIVERSAL-EXTRACTION-SPEC.md](./SPARC-UNIVERSAL-EXTRACTION-SPEC.md)

---

## Problem Summary

Current worker searches only hardcoded paths and patterns, failing for 90% of real agents.

**Current Failures:**
- Only searches `/intelligence/`, `/summaries/`, root
- Only matches `lambda-vi-briefing-*.md`
- Only extracts `## Executive Brief`

**Real Agents Use:**
- Directories: `/outputs/`, `/strategic-analysis/`, `/intelligence_archive/`, `/analysis/`
- Files: `agent-feed-post-*.md`, `*-intelligence-*.md`, `*-strategic-brief.md`
- Sections: `**Executive Brief:**`, `## Executive Brief (Λvi Immediate)`, `## EXECUTIVE SUMMARY`

---

## Solution Architecture

### 3-Phase Extraction Process

```
1. DIRECTORY DISCOVERY
   ↓ Recursively find all subdirectories
   ↓ Prioritize: outputs, strategic-analysis, intelligence, summaries

2. FILE PATTERN MATCHING
   ↓ Try patterns in priority order
   ↓ Priority: agent-feed-post-*.md → lambda-vi-briefing-*.md → *-intelligence-*.md

3. SECTION EXTRACTION
   ↓ Try section patterns in order
   ↓ Priority: ## Executive Brief → **Executive Brief:** → ## EXECUTIVE SUMMARY

4. FALLBACK STRATEGY
   ↓ Fallback to first 500 chars of any .md file
   ↓ Ultimate fallback: "No intelligence content found"
```

### Performance Targets

| Metric | Target |
|--------|--------|
| Latency (p95) | < 200ms |
| Memory Usage | < 50MB |
| Success Rate | > 95% |
| Coverage | Any directory structure |

---

## API Quick Reference

### Main API

```typescript
async function extractIntelligence(
  agentId: string,
  workspaceBasePath: string = '/prod/agent_workspace',
  options: ExtractionOptions = {}
): Promise<ExtractionResult>

interface ExtractionResult {
  content: string;              // Extracted intelligence
  success: boolean;             // Extraction succeeded
  source: string | null;        // Source file path
  sectionType: string | null;   // Section pattern matched
  fallbackLevel: number;        // 0 = no fallback, 6 = last resort
  durationMs: number;           // Extraction time
  metadata: {
    directoriesSearched: number;
    filesExamined: number;
    patternsAttempted: number;
    extractionMethod: string;
  };
}
```

### Configuration

```javascript
const EXTRACTION_CONFIG = {
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
    ]
  },
  sectionPatterns: [
    /## Executive Brief(?:\s+\(Λvi Immediate\))?\n\n([\s\S]*?)(?=\n## |$)/i,
    /\*\*Executive Brief:\*\*\s*\n([\s\S]*?)(?=\n(?:\*\*|##)|$)/i,
    /## EXECUTIVE SUMMARY\n\n([\s\S]*?)(?=\n## |$)/i
  ]
};
```

---

## Fallback Chain

```
Level 0: Priority dirs + Priority patterns + Priority sections ✅ IDEAL
Level 1: Priority dirs + Priority patterns + Fallback sections
Level 2: Priority dirs + Fallback patterns + Priority sections
Level 3: All dirs + Priority patterns + Priority sections
Level 4: All dirs + Fallback patterns + Priority sections
Level 5: All dirs + Any .md + First 500 chars                  ⚠️ DEGRADED
Level 6: No content found                                       ❌ FAILURE
```

---

## Integration with AgentWorker

### Current Code (agent-worker.js:270-292)

```javascript
async extractIntelligence(agentId, messages) {
  const frontmatter = await this.readAgentFrontmatter(agentId);

  if (frontmatter.posts_as_self === true) {
    const workspaceDir = path.join('/workspaces/agent-feed/prod/agent_workspace', agentId);

    // OLD: Limited extraction
    const workspaceIntelligence = await this.extractFromWorkspaceFiles(workspaceDir);
    if (workspaceIntelligence) {
      return workspaceIntelligence;
    }
  }

  return this.extractFromTextMessages(messages) || 'No summary available';
}
```

### New Code (with universal extraction)

```javascript
async extractIntelligence(agentId, messages) {
  const frontmatter = await this.readAgentFrontmatter(agentId);

  if (frontmatter.posts_as_self === true) {
    // NEW: Universal extraction
    const result = await universalExtraction.extractIntelligence(
      agentId,
      '/workspaces/agent-feed/prod/agent_workspace',
      { verbose: true }
    );

    if (result.success) {
      console.log(`✅ Extracted from ${result.source} (fallback level: ${result.fallbackLevel})`);
      return result.content;
    }
  }

  return this.extractFromTextMessages(messages) || 'No summary available';
}
```

---

## Testing Matrix

| Workspace | Structure | Expected Result |
|-----------|-----------|-----------------|
| link-logger-agent | /outputs/agent-feed-post-*.md | ✅ SUCCESS (level 0) |
| meeting-next-steps-agent | /extraction/lambda-vi-briefing-*.md | ✅ SUCCESS (level 0) |
| generic-agent | /analysis/*.md | ✅ SUCCESS (level 2-4) |
| empty-agent | (no files) | ⚠️ FALLBACK (level 6) |

---

## Key Features

### 1. Recursive Directory Discovery
- Searches ALL subdirectories (not just hardcoded)
- Excludes system dirs (.git, node_modules)
- Prioritizes known intelligence directories

### 2. Multi-Pattern Matching
- Tries 8+ file patterns in priority order
- Selects most recent file when multiple matches
- Graceful fallback to generic .md files

### 3. Flexible Section Extraction
- Tries 8+ section patterns
- Handles format variations:
  - `## Executive Brief`
  - `**Executive Brief:**`
  - `## EXECUTIVE SUMMARY`
  - `## Executive Brief (Λvi Immediate)`

### 4. Comprehensive Logging
```
[INFO] Discovering directories in /workspace/link-logger-agent
[INFO] Found 3 directories: outputs, strategic-analysis, intelligence_archive
[DEBUG] Trying pattern: agent-feed-post-*.md
[INFO] ✅ Found file: outputs/agent-feed-post-agentdb.md
[DEBUG] Trying section pattern: ## Executive Brief
[INFO] ✅ Extracted 247 chars from **Executive Brief:** section
```

### 5. Performance Optimized
- Early exit on first match
- Lazy directory traversal
- Stream-based file reading
- < 200ms for typical workspaces

---

## Next Steps

1. **Pseudocode Phase:** Detailed algorithm design
2. **TDD Implementation:** Test-first development
3. **Integration:** Replace current extractFromWorkspaceFiles()
4. **Validation:** Test with all agent workspaces
5. **Monitoring:** Track success rates and fallback usage

---

## File Locations

- **Specification:** `/workspaces/agent-feed/docs/SPARC-UNIVERSAL-EXTRACTION-SPEC.md`
- **Current Worker:** `/workspaces/agent-feed/api-server/worker/agent-worker.js`
- **Target Method:** `extractFromWorkspaceFiles()` (lines 164-228)
- **Integration Point:** `extractIntelligence()` (lines 270-292)

---

## Success Metrics

**Before (Current System):**
- Coverage: ~10% of agent workspaces
- Hardcoded paths: 3
- File patterns: 1
- Section patterns: 2
- Debugging: Minimal logging

**After (Universal System):**
- Coverage: >95% of agent workspaces
- Dynamic discovery: Unlimited depth
- File patterns: 8+ with fallback
- Section patterns: 8+ with fallback
- Debugging: Comprehensive logging at all stages

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-24
