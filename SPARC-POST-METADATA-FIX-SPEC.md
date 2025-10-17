# SPARC Specification: Post-to-Ticket Metadata Fix

**Date**: 2025-10-16
**Issue**: Post-originated tickets fail to post outcome comments
**Methodology**: SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)

---

## S - Specification

### Problem Statement
When users create posts (not comments), the worker successfully executes the task and creates files, but fails to post outcome comments with error: "Cannot determine reply target: missing parent_post_id"

### Root Cause
The post-to-ticket creation logic is missing required metadata fields that the WorkContextExtractor needs to determine where to post outcome comments.

### Requirements

#### Functional Requirements
1. **FR1**: Post-originated tickets MUST include `type: 'post'` in metadata
2. **FR2**: Post-originated tickets MUST include `parent_post_id` (set to post's own ID)
3. **FR3**: Post-originated tickets MUST include `parent_post_title`
4. **FR4**: Post-originated tickets MUST include `parent_post_content`
5. **FR5**: Outcome comments MUST be posted as top-level comments on the originating post
6. **FR6**: Comment-originated tickets MUST continue to work (regression requirement)

#### Non-Functional Requirements
1. **NFR1**: Changes must be backward compatible with existing tickets
2. **NFR2**: No database schema changes required
3. **NFR3**: Performance impact must be negligible (metadata is already being created)
4. **NFR4**: Error handling must remain non-fatal for outcome posting failures

### Success Criteria
- ✅ Post creates work ticket with complete metadata
- ✅ Worker executes and creates files
- ✅ Outcome comment posted on the post
- ✅ Comment-to-ticket still works (regression)
- ✅ No new errors in logs
- ✅ skipTicket still prevents infinite loops

---

## P - Pseudocode

### Current Implementation (Broken)
```
FUNCTION createPost(userId, postData):
  // Create post in database
  createdPost = dbSelector.createPost(userId, postData)

  // Create work ticket
  ticket = workQueueRepository.createTicket({
    user_id: userId,
    post_id: createdPost.id,
    post_content: createdPost.content,
    post_author: createdPost.author_agent,
    post_metadata: {
      title: createdPost.title,           // ✅ Present
      tags: createdPost.tags,             // ✅ Present
      ...businessMetadata                 // ✅ Present
      // ❌ MISSING: type
      // ❌ MISSING: parent_post_id
      // ❌ MISSING: parent_post_title
      // ❌ MISSING: parent_post_content
    }
  })

  RETURN createdPost, ticket
END FUNCTION
```

### Fixed Implementation
```
FUNCTION createPost(userId, postData):
  // Create post in database
  createdPost = dbSelector.createPost(userId, postData)

  // Create work ticket with COMPLETE metadata
  ticket = workQueueRepository.createTicket({
    user_id: userId,
    post_id: createdPost.id,
    post_content: createdPost.content,
    post_author: createdPost.author_agent,
    post_metadata: {
      // OUTCOME POSTING METADATA (NEW)
      type: 'post',                          // ✅ ADD: Identifies origin type
      parent_post_id: createdPost.id,        // ✅ ADD: Post replies to itself
      parent_post_title: createdPost.title,  // ✅ ADD: Context for formatter
      parent_post_content: createdPost.content, // ✅ ADD: Full context

      // EXISTING METADATA (UNCHANGED)
      title: createdPost.title,
      tags: createdPost.tags || [],
      ...businessMetadata
    },
    assigned_agent: null,
    priority: 5
  })

  RETURN createdPost, ticket
END FUNCTION
```

### WorkContextExtractor Flow (Unchanged - Already Correct)
```
FUNCTION extractParentPostId(metadata, ticket, originType):
  IF originType == 'autonomous':
    RETURN null
  END IF

  // Priority 1: Explicit parent_post_id in metadata
  IF metadata.parent_post_id EXISTS:
    RETURN metadata.parent_post_id  // ✅ Will work after fix
  END IF

  // Priority 2: Fallback to feedItemId
  IF ticket.payload.feedItemId EXISTS:
    RETURN parseInt(feedItemId)
  END IF

  // Priority 3: No parent found - ERROR
  LOG WARNING "No parent_post_id found"
  RETURN null  // ❌ Current behavior for posts
END FUNCTION
```

---

## A - Architecture

### System Components

#### Modified Components
1. **server.js** (`/api-server/server.js`)
   - Location: Lines 853-857 (post_metadata creation)
   - Change: Add 4 metadata fields
   - Impact: LOW (additive only, no logic changes)

#### Unchanged Components (Working Correctly)
1. **WorkContextExtractor** (`/src/utils/work-context-extractor.ts`)
   - Logic is correct, just needs proper input data
   - No changes required

2. **ClaudeCodeWorker** (`/src/worker/claude-code-worker.ts`)
   - Outcome posting logic is correct
   - No changes required

3. **AgentFeedAPIClient** (`/src/utils/agent-feed-api-client.ts`)
   - API client is working correctly
   - No changes required

### Data Flow

#### Before Fix (Broken)
```
User Creates Post
  ↓
server.js: Create post in DB
  ↓
server.js: Create work ticket with INCOMPLETE metadata
  ↓
Orchestrator: Pick up ticket
  ↓
ClaudeCodeWorker: Execute task, create files ✅
  ↓
ClaudeCodeWorker: Call postOutcomeIfWorthy()
  ↓
WorkContextExtractor: extractParentPostId()
  ↓
WorkContextExtractor: parent_post_id NOT FOUND ❌
  ↓
ERROR: "Cannot determine reply target: missing parent_post_id" ❌
  ↓
No outcome comment posted ❌
```

#### After Fix (Working)
```
User Creates Post
  ↓
server.js: Create post in DB
  ↓
server.js: Create work ticket with COMPLETE metadata ✅
  ↓
Orchestrator: Pick up ticket
  ↓
ClaudeCodeWorker: Execute task, create files ✅
  ↓
ClaudeCodeWorker: Call postOutcomeIfWorthy()
  ↓
WorkContextExtractor: extractParentPostId()
  ↓
WorkContextExtractor: parent_post_id FOUND (metadata.parent_post_id) ✅
  ↓
OutcomeFormatter: Format comment reply ✅
  ↓
AgentFeedAPIClient: POST comment with skipTicket=true ✅
  ↓
Outcome comment posted on post ✅
```

### Metadata Structure

#### Post Metadata (After Fix)
```json
{
  "type": "post",
  "parent_post_id": "prod-post-ae43fc43-eb66-4562-96ea-1fc5b9e76bce",
  "parent_post_title": "I want to know what files...",
  "parent_post_content": "I want to know what files are in you root workspace directory...",
  "title": "I want to know what files...",
  "tags": [],
  "postType": "quick",
  "wordCount": 43,
  "readingTime": 1,
  "businessImpact": 5,
  "isAgentResponse": false
}
```

#### Comment Metadata (Existing - No Changes)
```json
{
  "type": "comment",
  "parent_post_id": "1",
  "parent_post_title": "Test Post",
  "parent_post_content": "...",
  "parent_comment_id": null,
  "mentioned_users": [],
  "depth": 0
}
```

---

## R - Refinement

### Edge Cases

#### Edge Case 1: Post with No Title
**Scenario**: User creates post without title
**Handling**: Use content preview as title (existing behavior)
**Impact**: No change needed

#### Edge Case 2: Very Long Post Content
**Scenario**: Post content exceeds reasonable length for metadata
**Handling**: Store full content (JSONB has no practical limit)
**Impact**: No change needed, but could truncate if needed

#### Edge Case 3: Legacy Tickets Without Metadata
**Scenario**: Old tickets in DB don't have new metadata fields
**Handling**: WorkContextExtractor already handles missing metadata gracefully
**Impact**: No breaking changes

#### Edge Case 4: Post ID Format Changes
**Scenario**: Post ID format changes from UUID to numeric
**Handling**: Metadata stores whatever ID format is used
**Impact**: No change needed

### Performance Considerations

#### Memory Impact
- Adding 4 string fields to JSONB metadata
- Negligible impact (<1KB per ticket)
- JSONB is already being created and stored

#### Database Impact
- No schema changes required
- No indexes affected
- JSONB field is flexible

#### API Impact
- No additional API calls
- No change to request/response size
- Same number of database operations

### Security Considerations

#### Data Exposure
- No sensitive data in metadata
- All fields are already exposed via API
- No new security risks

#### Injection Risks
- All data comes from database (already sanitized)
- No user input directly in metadata
- JSONB automatically escapes values

---

## C - Completion Checklist

### Implementation Steps
1. ✅ Create SPARC specification (this document)
2. ⏳ Modify server.js to add metadata fields
3. ⏳ Test with new post creation
4. ⏳ Verify outcome comment posted
5. ⏳ Run regression tests for comments
6. ⏳ Validate UI shows outcome comment
7. ⏳ Create comprehensive validation report

### Testing Strategy

#### Unit Tests
- ❌ Not applicable (no new functions created)
- Existing tests continue to pass

#### Integration Tests
1. **Test 1**: Create post, verify ticket has metadata
2. **Test 2**: Execute ticket, verify outcome comment posted
3. **Test 3**: Create comment, verify still works (regression)
4. **Test 4**: Verify skipTicket prevents infinite loop

#### End-to-End Tests
1. **Test E2E-1**: User creates post via API
2. **Test E2E-2**: Worker executes and creates file
3. **Test E2E-3**: Outcome comment appears in UI
4. **Test E2E-4**: No errors in logs
5. **Test E2E-5**: Comment-to-ticket still works

### Validation Criteria

#### Functional Validation
- ✅ Post metadata includes all required fields
- ✅ WorkContextExtractor finds parent_post_id
- ✅ Outcome comment posted successfully
- ✅ Comment appears on correct post
- ✅ skipTicket=true prevents cascade

#### Non-Functional Validation
- ✅ No performance degradation
- ✅ No new errors in logs
- ✅ Backward compatible with old tickets
- ✅ No database migrations needed

### Rollback Plan
If issues arise:
1. Revert server.js changes (remove 4 metadata fields)
2. Restart server
3. Outcome posting for posts will fail (current behavior)
4. No data loss or corruption possible

---

## Code Changes

### File: /api-server/server.js

**Location**: Lines 853-857

**Before**:
```javascript
post_metadata: {
  title: createdPost.title,
  tags: createdPost.tags || [],
  ...metadata
}
```

**After**:
```javascript
post_metadata: {
  // Outcome posting metadata (for WorkContextExtractor)
  type: 'post',
  parent_post_id: createdPost.id,
  parent_post_title: createdPost.title,
  parent_post_content: createdPost.content,

  // Existing metadata
  title: createdPost.title,
  tags: createdPost.tags || [],
  ...metadata
}
```

**Lines Changed**: 4 lines added (total change: +4 lines)

---

## Risk Assessment

**Overall Risk**: LOW ✅

### Risk Factors

| Risk Factor | Level | Mitigation |
|------------|-------|------------|
| Breaking Changes | NONE | Additive only, no deletions |
| Performance Impact | NONE | Negligible metadata size increase |
| Data Loss | NONE | No schema changes, JSONB flexible |
| Regression | LOW | Comment-to-ticket unchanged |
| Security | NONE | No new attack vectors |

### Confidence Level
**95% Confident** - Simple additive change to existing working pattern

---

## Success Metrics

### Before Fix
- Post-to-ticket outcome posting: **0%** ❌
- Comment-to-ticket outcome posting: **100%** ✅

### After Fix (Expected)
- Post-to-ticket outcome posting: **100%** ✅
- Comment-to-ticket outcome posting: **100%** ✅

### Measurement Method
1. Create 5 test posts with different content
2. Verify all 5 create tickets with metadata
3. Verify all 5 post outcome comments
4. Create 5 test comments for regression
5. Verify all 5 post outcome comments

---

## Documentation Updates Needed

### Files to Update
1. ✅ OUTCOME-POSTING-POST-REPLY-BUG-INVESTIGATION.md (already created)
2. ✅ SPARC-POST-METADATA-FIX-SPEC.md (this document)
3. ⏳ AGENT-OUTCOME-POSTING-VALIDATION-COMPLETE.md (update after testing)
4. ⏳ README.md (if needed - document post-to-ticket metadata structure)

---

## Conclusion

This is a **straightforward fix** with:
- ✅ Clear root cause identified
- ✅ Simple solution (add 4 metadata fields)
- ✅ Low risk (additive change only)
- ✅ High confidence (95%+)
- ✅ Easy to test and validate
- ✅ Easy to rollback if needed

**Ready for Implementation** ✅
