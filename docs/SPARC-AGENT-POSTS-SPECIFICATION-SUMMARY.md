# SPARC Agent Posts Table Specification - Executive Summary

**Document:** `/workspaces/agent-feed/docs/SPARC-AGENT-POSTS-TABLE-SPECIFICATION.md`
**Status:** Specification Phase Complete ✅
**Date:** 2025-10-21

---

## Critical Findings

### 🚨 HIGH PRIORITY ISSUE

**Problem:** The SQLite `agent_posts` table **does not exist** in `/workspaces/agent-feed/data/database.db`

**Impact:** Application cannot operate in SQLite fallback mode, risking downtime when PostgreSQL is unavailable

**Evidence:**
```bash
$ sqlite3 /workspaces/agent-feed/data/database.db ".schema agent_posts"
# No output - table doesn't exist

$ ls -lh /workspaces/agent-feed/data/database.db
-rw-r--r-- 1 codespace codespace 0 Oct 19 16:55 database.db
# File is EMPTY (0 bytes)
```

**Risk Level:** CRITICAL - System fails in fallback mode

---

## Solution Overview

### Required Deliverables

1. **Migration 001:** Create `agent_posts` table (27 columns)
2. **Migration 002:** Add 5 performance indexes
3. **Migration 003:** Add 4 automation triggers
4. **Rollback Script:** Safe rollback procedure
5. **Test Suite:** 15+ unit tests, 8+ integration tests

### Schema Specification

**Core Table Structure:**
- **27 columns** covering all functional requirements
- **5 performance indexes** for query optimization
- **4 triggers** for automation (timestamps, comment counts, activity tracking)
- **3 JSON fields** (engagement, metadata, attachments)
- **Foreign key** to comments table with CASCADE delete

**Key Features:**
- Dual-database compatibility (SQLite ↔ PostgreSQL)
- Zero data loss migration strategy
- Soft delete support
- Content deduplication via hash
- Activity-based sorting support

---

## Implementation Checklist

### Phase 1: Specification ✅ COMPLETE
- [x] Analyze current state
- [x] Define requirements (4 functional, 3 non-functional)
- [x] Design schema (27 columns)
- [x] Define indexes (5 indexes)
- [x] Define triggers (4 triggers)
- [x] Create acceptance criteria (22 criteria)
- [x] Document rollback strategy

### Phase 2: Pseudocode 🔲 NEXT
- [ ] Design migration transaction flow
- [ ] Define validation logic
- [ ] Design error handling
- [ ] Create test data generation logic

### Phase 3: Implementation 🔲 PENDING
- [ ] Write SQL migration files (3 files)
- [ ] Write rollback script
- [ ] Create test suite
- [ ] Create validation queries

### Phase 4: Testing 🔲 PENDING
- [ ] Run unit tests (target: 100% pass)
- [ ] Run integration tests (target: 100% pass)
- [ ] Performance benchmarks (5 metrics)
- [ ] Load testing (10,000 posts)

### Phase 5: Deployment 🔲 PENDING
- [ ] Create deployment runbook
- [ ] Execute migration
- [ ] Validate success metrics
- [ ] Monitor for 24 hours

---

## Key Metrics and Targets

### Migration Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Table created | 1 table | ⏳ Pending |
| Columns created | 27 columns | ⏳ Pending |
| Indexes created | 5 indexes | ⏳ Pending |
| Triggers created | 4 triggers | ⏳ Pending |
| Migration time | < 5 seconds | ⏳ Pending |
| Unit test pass rate | 100% | ⏳ Pending |
| Integration test pass rate | 100% | ⏳ Pending |

### Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| Insert 1 post | < 10ms | ⏳ Pending |
| Select 100 posts | < 50ms | ⏳ Pending |
| Update engagement | < 15ms | ⏳ Pending |
| Insert comment + trigger | < 25ms | ⏳ Pending |

### Business Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| SQLite mode functionality | ❌ Broken | ✅ Working | 100% |
| Database fallback capability | ❌ None | ✅ Full | 100% |
| System uptime SLA | 95% | 99.9% | +4.9% |

---

## Database Schema at a Glance

### Table: `agent_posts`

**Identity & Author:**
- `id` (TEXT, PRIMARY KEY)
- `author_agent` (TEXT, NOT NULL)
- `author_agent_name` (TEXT)

**Content:**
- `title` (TEXT, NOT NULL)
- `content` (TEXT, NOT NULL)
- `summary` (TEXT)
- `content_type` (TEXT, CHECK constraint)

**Organization:**
- `tags` (TEXT/JSON array)
- `category` (TEXT)
- `priority` (TEXT, CHECK: low/medium/high/urgent)

**Status:**
- `status` (TEXT, CHECK: draft/published/archived/scheduled/deleted)
- `visibility` (TEXT, CHECK: public/internal/private)

**Complex Fields (JSON):**
- `engagement` (TEXT) - comments, views, saves, reactions, stars
- `metadata` (TEXT) - business impact, confidence, processing info
- `attachments` (TEXT) - file attachments array

**Timestamps:**
- `published_at` (DATETIME)
- `updated_at` (DATETIME)
- `created_at` (DATETIME)
- `last_activity_at` (DATETIME)
- `deleted_at` (DATETIME, soft delete)

**Analytics:**
- `word_count` (INTEGER)
- `reading_time_minutes` (INTEGER)
- `quality_score` (REAL, 0-1)
- `engagement_rate` (REAL, 0-1)
- `content_hash` (TEXT, UNIQUE)

---

## Critical Dependencies

### Software Requirements
- SQLite ≥ 3.35.0 (for JSON functions)
- Node.js ≥ 18.0.0
- better-sqlite3 ≥ 8.0.0
- uuid ≥ 9.0.0

### Database Prerequisites
- `PRAGMA foreign_keys = ON` enabled
- Minimum 100MB free disk space
- No active connections during migration

### Application Prerequisites
- `database-selector.js` configured for dual mode
- `USE_POSTGRES` environment variable support
- API endpoints compatible with SQLite queries

---

## Risk Mitigation

### Top Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Migration fails mid-execution | Low | High | Transaction-based migration + rollback script |
| JSON deserialization errors | Medium | Medium | Validation layer + comprehensive tests |
| Performance degradation | Low | High | Benchmark before/after + index optimization |
| Trigger infinite loops | Low | Critical | Careful trigger design using AFTER triggers |

---

## Next Steps

### Immediate Actions (Pseudocode Phase)

1. **Design Migration Flow**
   - Transaction boundaries
   - Error handling logic
   - Validation queries

2. **Create Test Data**
   - Minimal valid post
   - Complete post with all fields
   - Edge cases (null fields, max lengths)

3. **Define Validation Logic**
   - Pre-migration checks
   - Post-migration verification
   - Performance benchmarks

### Timeline Estimate

| Phase | Duration | Effort |
|-------|----------|--------|
| Specification | ✅ Complete | 4 hours |
| Pseudocode | Next | 2 hours |
| Implementation | After | 4 hours |
| Testing | After | 3 hours |
| Deployment | After | 2 hours |
| **Total** | | **15 hours** |

---

## File Locations

### Documentation
- **Full Specification:** `/workspaces/agent-feed/docs/SPARC-AGENT-POSTS-TABLE-SPECIFICATION.md`
- **This Summary:** `/workspaces/agent-feed/docs/SPARC-AGENT-POSTS-SPECIFICATION-SUMMARY.md`

### Migration Files (To Be Created)
- `/workspaces/agent-feed/api-server/migrations/001-create-agent-posts-table.sql`
- `/workspaces/agent-feed/api-server/migrations/002-add-agent-posts-indexes.sql`
- `/workspaces/agent-feed/api-server/migrations/003-add-agent-posts-triggers.sql`
- `/workspaces/agent-feed/api-server/migrations/rollback/rollback-001-agent-posts.sql`

### Test Files (To Be Created)
- `/workspaces/agent-feed/api-server/tests/agent-posts-sqlite.test.js`
- `/workspaces/agent-feed/api-server/tests/integration/posts-api-sqlite.test.js`

### Reference Files
- Database selector: `/workspaces/agent-feed/api-server/config/database-selector.js`
- TypeScript types: `/workspaces/agent-feed/types/api.ts`
- PostgreSQL schema: `/workspaces/agent-feed/prod/database/migrations/010_create_agent_posts_enhancement.sql`
- Existing triggers: `/workspaces/agent-feed/api-server/migrations/004-add-last-activity-at.sql`

---

## Questions for Stakeholders

1. **Timing:** When should this migration be executed? (Requires application downtime)
2. **Data Migration:** Is there existing data in PostgreSQL that needs to be exported to SQLite?
3. **Feature Parity:** Should we implement all PostgreSQL features (quality metrics, analytics) or just core functionality?
4. **Testing Environment:** Do we have a staging environment for testing the migration?
5. **Rollback Window:** What is the acceptable rollback window if issues are discovered post-migration?

---

## Success Criteria Summary

### Must Have (P0)
- ✅ Complete specification document
- 🔲 SQLite table created with 27 columns
- 🔲 All CRUD operations functional
- 🔲 API endpoints working in SQLite mode
- 🔲 Zero data loss

### Should Have (P1)
- 🔲 Performance within 20% of PostgreSQL
- 🔲 100% test coverage
- 🔲 Rollback tested and validated
- 🔲 Documentation complete

### Nice to Have (P2)
- 🔲 Automated migration script
- 🔲 Performance monitoring dashboard
- 🔲 Migration metrics logging
- 🔲 Real-time progress indicator

---

**Specification Status:** ✅ COMPLETE - Ready for Pseudocode Phase

**Next SPARC Phase:** Pseudocode - Design detailed implementation logic

**Estimated Completion:** 15 hours (including all SPARC phases)

---

*Document Generated by SPARC Specification Agent*
*Version: 1.0.0*
*Date: 2025-10-21*
