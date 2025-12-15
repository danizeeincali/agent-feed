# Claude Code SDK Integration - Documentation Index

**Project:** Replace TaskTypeDetector with Claude Code SDK
**Version:** 1.0.0
**Status:** Ready for Implementation
**Date:** 2025-10-14

---

## Overview

This documentation set provides a comprehensive SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) specification for replacing the broken TaskTypeDetector/FileOperationExecutor regex-based system with proper Claude Code SDK integration.

**Problem:** Current system uses regex to parse natural language, resulting in broken behavior (creates folders named "you", files named "with").

**Solution:** Replace regex with Claude Code SDK, allowing Claude to interpret natural language and execute real file operations.

---

## Documentation Structure

### 📋 Core Specifications

#### 1. Full Specification (61KB)
**File:** `SPARC-ClaudeCode-Integration-Spec.md`

**Contents:**
- Complete requirements specification
- Functional requirements (FR-001 to FR-005)
- Non-functional requirements (performance, reliability, observability)
- Architecture design
- Data flow diagrams (text-based)
- Security boundaries
- Error handling strategy
- Integration points
- Testing strategy (unit, integration, E2E)
- Implementation plan (6 phases)
- Validation checklist
- Rollback strategy
- Dependencies
- Success metrics

**Audience:** Technical leads, architects, senior engineers

**When to read:** Before starting implementation, during design review

---

#### 2. Executive Summary (9.7KB)
**File:** `SPARC-ClaudeCode-Integration-Summary.md`

**Contents:**
- Problem statement
- Proposed solution
- Architecture change summary
- Key benefits
- Integration points
- Security model
- Implementation timeline
- Risk assessment
- Success criteria
- Recommendation

**Audience:** Product managers, tech leads, stakeholders

**When to read:** For approval, high-level understanding, decision-making

---

### 🎨 Architecture & Design

#### 3. Architecture Diagrams (61KB)
**File:** `SPARC-ClaudeCode-Architecture-Diagrams.md`

**Contents:**
- 10 detailed ASCII diagrams:
  1. System Context
  2. Component Architecture
  3. Data Flow - Simple Request
  4. Data Flow - Complex Request
  5. Comparison - Old vs New
  6. Security Boundaries
  7. Error Handling Flow
  8. Monitoring & Observability
  9. Deployment Strategy
  10. Integration Testing Strategy

**Audience:** Engineers, architects, QA engineers

**When to read:** During implementation, for visual understanding of system

---

### 🚀 Developer Guide

#### 4. Quick Reference (This Document)
**File:** `SPARC-ClaudeCode-Quick-Reference.md`

**Contents:**
- TL;DR summary
- The one-line change
- Code structure template
- Critical implementation rules (DO/DON'T)
- Testing checklist
- Common pitfalls
- Debugging tips
- Quick test commands
- Integration points
- Security reminders
- Performance targets
- Rollback plan

**Audience:** Engineers implementing the solution

**When to read:** During active development, for quick reference

---

## Reading Paths

### Path 1: Executive → Implementation
**For:** Engineers assigned to implement

1. Start: Executive Summary (understand the "why")
2. Then: Quick Reference (understand the "what")
3. Then: Architecture Diagrams (understand the "how")
4. Finally: Full Specification (reference for details)

**Time:** 30 minutes to start coding

---

### Path 2: Approval → Deep Dive
**For:** Technical leads approving the design

1. Start: Executive Summary (decision criteria)
2. Then: Full Specification (requirements, security, testing)
3. Then: Architecture Diagrams (validate design)
4. Optional: Quick Reference (implementation feasibility)

**Time:** 1-2 hours for thorough review

---

### Path 3: Quick Understanding
**For:** Stakeholders needing overview

1. Read: Executive Summary only

**Time:** 10 minutes

---

### Path 4: Implementation Ready
**For:** Engineers ready to code

1. Start: Quick Reference (coding guide)
2. Reference: Architecture Diagrams (when stuck)
3. Reference: Full Specification (for edge cases)

**Time:** Start coding immediately, reference as needed

---

## Key Takeaways

### For Engineers
- **One line change** in WorkerSpawner
- **New class:** ClaudeCodeWorker (follows existing pattern)
- **No regex parsing** - pass content directly to Claude
- **Security built-in** - SDK handles workspace boundaries
- **Testing required** - unit, integration, regression tests

### For Tech Leads
- **Low risk** - single integration point, fast rollback
- **High benefit** - fixes broken functionality, enables complex operations
- **Ready to implement** - all dependencies available
- **Gradual rollout** - 10% → 50% → 100%
- **Comprehensive testing** - unit, integration, security, performance

### For Product Managers
- **Fixes broken feature** - no more "you" folders and "with" files
- **Enables new capabilities** - multi-step operations work automatically
- **User-facing improvement** - requests work as expected
- **Low disruption** - gradual rollout minimizes risk
- **Measurable success** - clear metrics (success rate, performance)

---

## File Locations

All documentation in: `/workspaces/agent-feed/api-server/docs/`

```
docs/
├── SPARC-ClaudeCode-Index.md                    ← You are here
├── SPARC-ClaudeCode-Integration-Spec.md         ← Full specification
├── SPARC-ClaudeCode-Integration-Summary.md      ← Executive summary
├── SPARC-ClaudeCode-Architecture-Diagrams.md    ← Visual diagrams
└── SPARC-ClaudeCode-Quick-Reference.md          ← Developer guide
```

---

## Implementation Files

Files to create/modify:

```
src/
├── worker/
│   └── claude-code-worker.ts                    ← NEW (create this)
│
├── adapters/
│   └── worker-spawner.adapter.ts                ← MODIFY (1 line change)
│
└── services/
    └── ClaudeCodeSDKManager.js                  ← NO CHANGES (existing)

tests/
├── worker/
│   ├── claude-code-worker.test.ts               ← NEW (unit tests)
│   ├── claude-code-worker.integration.test.ts   ← NEW (integration tests)
│   └── claude-code-worker.regression.test.ts    ← NEW (regression tests)
```

---

## Decision Points

### Approval Required
- [ ] Technical Lead approval (architecture, implementation plan)
- [ ] Security Team approval (permissionMode: bypassPermissions)
- [ ] Product Team review (feature changes, user impact)

### Go/No-Go Criteria
- [ ] All tests passing (unit, integration, regression)
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Rollback plan validated

---

## Timeline

| Phase | Duration | Key Milestone |
|-------|----------|---------------|
| Phase 1: Core Worker | 1-2 days | ClaudeCodeWorker implemented |
| Phase 2: Integration | 0.5 days | WorkerSpawner updated |
| Phase 3: Configuration | 0.5 days | Workspace configured |
| Phase 4: Error Handling | 1 day | Error handling complete |
| Phase 5: Testing | 2 days | All tests passing |
| Phase 6: Migration | 1 day | Deployed to production |

**Total:** 5-6 days

---

## Success Metrics

### Functional
- ✅ Zero regex-based parsing
- ✅ Zero "you" folders or "with" files created
- ✅ Simple requests work 100%
- ✅ Complex multi-step requests work 100%
- ✅ All operations confined to workspace

### Performance
- ✅ Simple operations < 5 seconds
- ✅ Complex operations < 15 seconds
- ✅ Timeout rate < 2%
- ✅ Success rate > 90%

### Security
- ✅ Zero workspace boundary violations
- ✅ Zero path traversal successes
- ✅ Zero sensitive file operations
- ✅ All operations logged

---

## Risk Assessment

**Overall Risk Level:** LOW

**Factors:**
- ✅ Single integration point (ClaudeCodeSDKManager exists)
- ✅ One line change in WorkerSpawner
- ✅ Fast rollback capability (< 5 minutes)
- ✅ Comprehensive testing strategy
- ✅ SDK handles security automatically
- ✅ Gradual rollout (10% → 50% → 100%)

**Mitigation:**
- Gradual rollout minimizes exposure
- Real-time monitoring catches issues early
- Instant rollback available
- Comprehensive test coverage prevents bugs

---

## Dependencies Status

### External Dependencies
- [x] @anthropic-ai/claude-code (installed)
- [x] Node.js fs/promises (built-in)
- [x] Node.js path (built-in)

### Internal Dependencies
- [x] ClaudeCodeSDKManager (existing, ready)
- [x] WorkTicket types (existing, ready)
- [x] WorkerResult types (existing, ready)
- [x] work_queue database table (existing, ready)
- [x] SSE broadcast system (existing, ready)

### Infrastructure Dependencies
- [x] PostgreSQL database (ready)
- [x] File system access (ready)
- [x] Anthropic API (ready)
- [x] SSE server (ready)

**Status:** All dependencies ready. No blockers.

---

## Next Steps

### For Approval
1. Review Executive Summary
2. Review Full Specification (security section)
3. Approve or request changes
4. Set implementation timeline

### For Implementation
1. Create ClaudeCodeWorker class
2. Write unit tests
3. Update WorkerSpawner
4. Write integration tests
5. Run security tests
6. Deploy to 10% traffic

### For Monitoring
1. Set up dashboards (success rate, duration, errors)
2. Configure alerts (error rate > 15%, timeout rate > 5%)
3. Monitor SSE ticker (tool activity visible)
4. Track metrics daily during rollout

---

## Contact & Support

### Questions About Specification
- Review Full Specification
- Check Architecture Diagrams
- Consult Quick Reference

### Implementation Questions
- Start with Quick Reference
- Reference Architecture Diagrams
- Consult Full Specification for edge cases

### Approval Questions
- Start with Executive Summary
- Review Security section in Full Specification
- Review Risk Assessment in this document

---

## Document Versions

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-14 | SPARC Agent | Initial comprehensive specification |

---

## Related Documentation

### Existing System Documentation
- WorkerSpawner: `/workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts`
- UnifiedAgentWorker: `/workspaces/agent-feed/src/worker/unified-agent-worker.ts`
- TaskTypeDetector (deprecated): `/workspaces/agent-feed/src/worker/task-type-detector.ts`
- FileOperationExecutor (deprecated): `/workspaces/agent-feed/src/worker/file-operation-executor.ts`

### Claude SDK Documentation
- ClaudeCodeSDKManager: `/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js`
- Claude Code Routes: `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js`

### Type Definitions
- WorkTicket: `/workspaces/agent-feed/src/types/work-ticket.ts`
- WorkerResult: `/workspaces/agent-feed/src/types/worker.ts`
- DatabaseManager: `/workspaces/agent-feed/src/types/database-manager.ts`

---

## Glossary

| Term | Definition |
|------|------------|
| **WorkTicket** | Unit of work from work_queue table containing user post |
| **WorkerResult** | Execution result returned by worker |
| **TaskTypeDetector** | Legacy regex-based system (deprecated, broken) |
| **FileOperationExecutor** | Legacy manual file ops system (deprecated) |
| **ClaudeCodeWorker** | New worker using Claude Code SDK |
| **ClaudeCodeSDKManager** | Manager for Claude SDK instance |
| **Workspace** | Isolated directory: /workspaces/agent-feed/prod/agent_workspace/ |
| **SSE** | Server-Sent Events (real-time updates to frontend) |
| **Ticker** | Frontend component displaying tool activity |
| **SPARC** | Specification, Pseudocode, Architecture, Refinement, Completion |

---

## Quick Links

| Need | Document | Section |
|------|----------|---------|
| Understand problem | Executive Summary | Problem Statement |
| See architecture | Architecture Diagrams | Diagram 2 |
| See data flow | Architecture Diagrams | Diagram 3, 4 |
| Start coding | Quick Reference | Basic Structure |
| Test strategy | Full Specification | Section 7 |
| Security info | Full Specification | Section 4 |
| Error handling | Architecture Diagrams | Diagram 7 |
| Deployment plan | Architecture Diagrams | Diagram 9 |

---

**Status:** Documentation Complete - Ready for Implementation

**Recommendation:** Proceed with approval process, then begin Phase 1 implementation.

