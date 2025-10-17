# SPARC: Agent Outcome Posting - TDD Test Strategy

**Version:** 1.0
**Date:** 2025-10-14
**Phase:** Test-Driven Development Design
**Status:** Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Testing Philosophy](#testing-philosophy)
3. [Test Architecture](#test-architecture)
4. [Unit Test Specifications](#unit-test-specifications)
5. [Integration Test Specifications](#integration-test-specifications)
6. [End-to-End Test Specifications](#end-to-end-test-specifications)
7. [Regression Test Specifications](#regression-test-specifications)
8. [Critical Scenarios: Infinite Loop Prevention](#critical-scenarios-infinite-loop-prevention)
9. [Test Data and Fixtures](#test-data-and-fixtures)
10. [Idempotency Test Specifications](#idempotency-test-specifications)
11. [Error Scenario Test Specifications](#error-scenario-test-specifications)
12. [Acceptance Criteria Per Test](#acceptance-criteria-per-test)
13. [Test Execution Strategy](#test-execution-strategy)
14. [Coverage Requirements](#coverage-requirements)

---

## Executive Summary

### Purpose

Define comprehensive TDD test strategy for Agent Outcome Posting feature that ensures:
- **Correctness**: Outcomes posted to correct posts/comments
- **Reliability**: No duplicate posts or infinite loops
- **Idempotency**: Safe retry behavior
- **Robustness**: Graceful error handling
- **Performance**: Acceptable latency overhead

### Key Testing Principles

1. **Real Database Operations**: Tests use actual PostgreSQL database (no mocks for DB)
2. **Real API Calls**: Tests make actual HTTP requests to API endpoints
3. **Isolated Test Data**: Each test creates and cleans up its own data
4. **Deterministic Results**: Tests produce consistent results across runs
5. **Critical Path Coverage**: Infinite loop prevention must be tested exhaustively

### Testing Strategy

```
Test Pyramid:
         /\
        /E2E\         <- 5 tests (full system flows)
       /------\
      /Integr.\      <- 15 tests (component integration)
     /----------\
    /   Unit     \   <- 40 tests (individual functions)
   /--------------\
```

**Total Tests**: ~60 tests across 3 layers

---

## Testing Philosophy

### Test-Driven Development Approach

1. **Write Test First**: Define expected behavior before implementation
2. **Red-Green-Refactor**: Fail → Pass → Improve
3. **Test Real Behavior**: Integration tests use real database and API
4. **Test Edge Cases**: Cover error paths, boundaries, and race conditions
5. **Document with Tests**: Tests serve as executable specifications

### Real vs Mocked Components

| Component | Testing Approach | Rationale |
|-----------|-----------------|-----------|
| Database (PostgreSQL) | **REAL** | Must verify actual data persistence |
| API Endpoints | **REAL** | Must verify actual HTTP behavior |
| Claude Code SDK | **MOCKED** | External service, expensive, unpredictable |
| File System | **MOCKED** | Tests should not modify real files |
| Logger | **MOCKED** | Don't pollute logs during tests |
| Time/Dates | **MOCKED** | Enable deterministic timing tests |

### Test Isolation Strategy

**Setup/Teardown Pattern**:
```typescript
beforeEach(async () => {
  // 1. Create isolated test database schema
  await createTestSchema();

  // 2. Create test user and posts
  testUser = await createTestUser();
  testPost = await createTestPost(testUser.id);

  // 3. Initialize worker with test config
  worker = new ClaudeCodeWorker(db, testConfig);
});

afterEach(async () => {
  // 1. Delete all test data (cascading deletes)
  await deleteTestUser(testUser.id);

  // 2. Reset database state
  await rollbackTestSchema();
});
```

---

## Test Architecture

### Test Directory Structure

```
/workspaces/agent-feed/
├── src/
│   ├── utils/
│   │   ├── __tests__/
│   │   │   ├── agent-feed-api-client.test.ts
│   │   │   ├── outcome-detector.test.ts
│   │   │   ├── outcome-formatter.test.ts
│   │   │   └── work-context-extractor.test.ts
│   │   ├── agent-feed-api-client.ts
│   │   ├── outcome-detector.ts
│   │   ├── outcome-formatter.ts
│   │   └── work-context-extractor.ts
│   └── worker/
│       ├── __tests__/
│       │   ├── claude-code-worker.unit.test.ts
│       │   └── claude-code-worker.integration.test.ts
│       └── claude-code-worker.ts
└── tests/
    ├── integration/
    │   ├── comment-to-reply-flow.test.ts
    │   ├── post-to-reply-flow.test.ts
    │   ├── autonomous-to-post-flow.test.ts
    │   └── infinite-loop-prevention.test.ts
    ├── e2e/
    │   ├── full-user-journey.test.ts
    │   └── error-recovery.test.ts
    ├── fixtures/
    │   ├── test-users.ts
    │   ├── test-posts.ts
    │   ├── test-comments.ts
    │   ├── test-tickets.ts
    │   └── mock-claude-responses.ts
    └── helpers/
        ├── database-helpers.ts
        ├── api-helpers.ts
        └── assertion-helpers.ts
```

### Test Configuration

**File: `tests/test-config.ts`**

```typescript
export const TEST_CONFIG = {
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'agent_feed_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
  },

  api: {
    baseUrl: process.env.TEST_API_URL || 'http://localhost:3001/api',
    timeout: 5000,
  },

  worker: {
    enableOutcomePosting: true,
    postingRetryAttempts: 3,
    postingRetryDelay: 100, // Fast retries for tests
    minToolsForPosting: 1,
    requireSuccessForPosting: true,
    postFailedOutcomes: false,
  },

  timeout: {
    unit: 5000,      // 5 seconds
    integration: 15000, // 15 seconds
    e2e: 30000,      // 30 seconds
  },
};
```

---

## Unit Test Specifications

### 1. OutcomeDetector Unit Tests

**File: `src/utils/__tests__/outcome-detector.test.ts`**

#### Test Suite 1.1: isPostWorthy() - File Modifications

**TEST-OD-001: Should detect file modifications as post-worthy**
```typescript
describe('OutcomeDetector.isPostWorthy()', () => {
  describe('File Modifications', () => {
    it('TEST-OD-001: should return true when Write tool used', () => {
      // Arrange
      const result = createWorkerResult({
        success: true,
        toolsUsed: ['Write'],
        content: 'Created new file',
        duration: 2000,
        tokensUsed: 500,
      });
      const ticket = createWorkTicket({ type: 'post_response' });

      // Act
      const isPostWorthy = detector.isPostWorthy(result, ticket);

      // Assert
      expect(isPostWorthy).toBe(true);
    });

    it('TEST-OD-002: should return true when Edit tool used', () => {
      const result = createWorkerResult({
        success: true,
        toolsUsed: ['Read', 'Edit'],
        content: 'Modified file successfully',
        duration: 3000,
        tokensUsed: 600,
      });

      expect(detector.isPostWorthy(result, ticket)).toBe(true);
    });

    it('TEST-OD-003: should return true for multiple file operations', () => {
      const result = createWorkerResult({
        success: true,
        toolsUsed: ['Read', 'Edit', 'Write'],
        content: 'Created and modified files',
        duration: 5000,
        tokensUsed: 1200,
      });

      expect(detector.isPostWorthy(result, ticket)).toBe(true);
    });
  });
});
```

**Acceptance Criteria**:
- ✓ Write tool usage triggers post-worthy classification
- ✓ Edit tool usage triggers post-worthy classification
- ✓ Multiple file operations trigger post-worthy classification

#### Test Suite 1.2: isPostWorthy() - Routine Operations (Filtering)

**TEST-OD-004 through TEST-OD-008**

```typescript
describe('Routine Operations (Filter Out)', () => {
  it('TEST-OD-004: should return false for Read-only operations', () => {
    const result = createWorkerResult({
      success: true,
      toolsUsed: ['Read'],
      content: 'File contents: hello world',
      duration: 500,
      tokensUsed: 200,
    });

    expect(detector.isPostWorthy(result, ticket)).toBe(false);
  });

  it('TEST-OD-005: should return false for Glob-only operations', () => {
    const result = createWorkerResult({
      success: true,
      toolsUsed: ['Glob'],
      content: 'Found 5 files',
      duration: 300,
      tokensUsed: 150,
    });

    expect(detector.isPostWorthy(result, ticket)).toBe(false);
  });

  it('TEST-OD-006: should return false for short-duration tasks', () => {
    const result = createWorkerResult({
      success: true,
      toolsUsed: ['Read'],
      content: 'Quick lookup',
      duration: 500, // Below threshold
      tokensUsed: 100,
    });

    expect(detector.isPostWorthy(result, ticket)).toBe(false);
  });

  it('TEST-OD-007: should return false for minimal content', () => {
    const result = createWorkerResult({
      success: true,
      toolsUsed: ['Read'],
      content: 'OK', // Too short
      duration: 2000,
      tokensUsed: 50,
    });

    expect(detector.isPostWorthy(result, ticket)).toBe(false);
  });

  it('TEST-OD-008: should return false for failed tasks (default config)', () => {
    const result = createWorkerResult({
      success: false,
      error: new Error('Task failed'),
      toolsUsed: ['Read', 'Write'],
      content: '',
      duration: 3000,
      tokensUsed: 400,
    });

    expect(detector.isPostWorthy(result, ticket)).toBe(false);
  });
});
```

**Acceptance Criteria**:
- ✓ Single Read operations filtered out
- ✓ Glob-only operations filtered out
- ✓ Short-duration tasks filtered out
- ✓ Minimal content tasks filtered out
- ✓ Failed tasks filtered out by default

#### Test Suite 1.3: isPostWorthy() - Substantive Analysis

**TEST-OD-009 through TEST-OD-011**

```typescript
describe('Substantive Analysis', () => {
  it('TEST-OD-009: should return true for analysis with substantial content', () => {
    const result = createWorkerResult({
      success: true,
      toolsUsed: ['Read', 'Grep'],
      content: 'A'.repeat(300), // Substantial findings
      duration: 5000,
      tokensUsed: 800,
    });

    expect(detector.isPostWorthy(result, ticket)).toBe(true);
  });

  it('TEST-OD-010: should return true for complex multi-tool tasks', () => {
    const result = createWorkerResult({
      success: true,
      toolsUsed: ['Read', 'Grep', 'Glob', 'WebFetch'],
      content: 'Complex analysis complete',
      duration: 10000,
      tokensUsed: 2000,
    });

    expect(detector.isPostWorthy(result, ticket)).toBe(true);
  });

  it('TEST-OD-011: should return true for Bash commands with output', () => {
    const result = createWorkerResult({
      success: true,
      toolsUsed: ['Bash'],
      content: 'Command executed successfully with output',
      duration: 3000,
      tokensUsed: 600,
    });

    expect(detector.isPostWorthy(result, ticket)).toBe(true);
  });
});
```

**Acceptance Criteria**:
- ✓ Analysis with substantial content triggers posting
- ✓ Complex multi-tool tasks trigger posting
- ✓ Bash execution with output triggers posting

#### Test Suite 1.4: extractMetadata()

**TEST-OD-012 through TEST-OD-015**

```typescript
describe('extractMetadata()', () => {
  it('TEST-OD-012: should extract all metadata fields', () => {
    const result = createWorkerResult({
      success: true,
      toolsUsed: ['Read', 'Edit'],
      content: 'Task completed successfully',
      duration: 4200,
      tokensUsed: 648,
    });

    const metadata = detector.extractMetadata(result);

    expect(metadata).toMatchObject({
      summary: expect.any(String),
      details: expect.any(String),
      filesModified: expect.any(Array),
      toolsUsed: ['Read', 'Edit'],
      duration: 4200,
      tokensUsed: 648,
      success: true,
    });
    expect(metadata.summary.length).toBeGreaterThan(0);
  });

  it('TEST-OD-013: should extract files from content', () => {
    const result = createWorkerResult({
      success: true,
      toolsUsed: ['Edit'],
      content: 'Modified workspace_content.md and added new_file.ts',
      duration: 3000,
      tokensUsed: 500,
    });

    const metadata = detector.extractMetadata(result);

    expect(metadata.filesModified).toContain('workspace_content.md');
    expect(metadata.filesModified).toContain('new_file.ts');
  });

  it('TEST-OD-014: should handle errors in metadata', () => {
    const result = createWorkerResult({
      success: false,
      error: new Error('File not found'),
      toolsUsed: ['Read'],
      content: '',
      duration: 1000,
      tokensUsed: 100,
    });

    const metadata = detector.extractMetadata(result);

    expect(metadata.success).toBe(false);
    expect(metadata.error).toBe('File not found');
  });

  it('TEST-OD-015: should generate summary from content', () => {
    const result = createWorkerResult({
      success: true,
      toolsUsed: ['Edit'],
      content: 'I edited the file to add the new function. The changes include...',
      duration: 2000,
      tokensUsed: 400,
    });

    const metadata = detector.extractMetadata(result);

    expect(metadata.summary).toContain('edited');
    expect(metadata.summary.length).toBeLessThan(200); // Concise summary
  });
});
```

**Acceptance Criteria**:
- ✓ All metadata fields extracted correctly
- ✓ File names parsed from content
- ✓ Errors included in metadata
- ✓ Summary generated from content

**Total OutcomeDetector Tests**: 15 tests

---

### 2. WorkContextExtractor Unit Tests

**File: `src/utils/__tests__/work-context-extractor.test.ts`**

#### Test Suite 2.1: extractContext() - Comment Origin

**TEST-WCE-001 through TEST-WCE-004**

```typescript
describe('WorkContextExtractor.extractContext()', () => {
  describe('Comment Origin', () => {
    it('TEST-WCE-001: should extract context from comment ticket', () => {
      const ticket = createWorkTicket({
        id: 'ticket-123',
        userId: 'user-456',
        agentName: 'avi',
        payload: {
          content: 'Please add Dani to the file',
          metadata: {
            type: 'comment',
            parent_post_id: 42,
            parent_comment_id: null,
            depth: 0,
          },
        },
      });

      const context = extractor.extractContext(ticket);

      expect(context).toMatchObject({
        ticketId: 'ticket-123',
        originType: 'comment',
        parentPostId: 42,
        parentCommentId: null,
        userRequest: 'Please add Dani to the file',
        conversationDepth: 0,
        agentName: 'avi',
      });
    });

    it('TEST-WCE-002: should extract nested comment context', () => {
      const ticket = createWorkTicket({
        payload: {
          content: 'Follow-up request',
          metadata: {
            type: 'comment',
            parent_post_id: 42,
            parent_comment_id: 125,
            depth: 1,
          },
        },
      });

      const context = extractor.extractContext(ticket);

      expect(context.parentCommentId).toBe(125);
      expect(context.conversationDepth).toBe(1);
    });

    it('TEST-WCE-003: should handle deeply nested comments', () => {
      const ticket = createWorkTicket({
        payload: {
          metadata: {
            type: 'comment',
            parent_post_id: 42,
            parent_comment_id: 150,
            depth: 3,
          },
        },
      });

      const context = extractor.extractContext(ticket);

      expect(context.conversationDepth).toBe(3);
    });

    it('TEST-WCE-004: should extract user request from various payload structures', () => {
      // Test priority 1: direct content
      const ticket1 = createWorkTicket({
        payload: { content: 'Direct content' },
      });
      expect(extractor.extractContext(ticket1).userRequest).toBe('Direct content');

      // Test priority 2: post.content
      const ticket2 = createWorkTicket({
        payload: { post: { content: 'Post content' } },
      });
      expect(extractor.extractContext(ticket2).userRequest).toBe('Post content');

      // Test priority 3: feedItem.content
      const ticket3 = createWorkTicket({
        payload: { feedItem: { content: 'Feed item content' } },
      });
      expect(extractor.extractContext(ticket3).userRequest).toBe('Feed item content');
    });
  });
});
```

#### Test Suite 2.2: extractContext() - Post Origin

**TEST-WCE-005 through TEST-WCE-006**

```typescript
describe('Post Origin', () => {
  it('TEST-WCE-005: should extract context from post ticket', () => {
    const ticket = createWorkTicket({
      payload: {
        content: 'Analyze the codebase',
        metadata: {
          type: 'post',
          parent_post_id: 50,
          title: 'Analysis Request',
        },
      },
    });

    const context = extractor.extractContext(ticket);

    expect(context.originType).toBe('post');
    expect(context.parentPostId).toBe(50);
    expect(context.parentCommentId).toBeNull();
  });

  it('TEST-WCE-006: should handle post metadata without type field', () => {
    const ticket = createWorkTicket({
      payload: {
        feedItemId: '50',
        content: 'Request',
        metadata: {
          title: 'Post Title', // Has title, likely a post
        },
      },
    });

    const context = extractor.extractContext(ticket);

    // Should infer type from presence of title
    expect(context.originType).toBe('autonomous'); // Default when unclear
  });
});
```

#### Test Suite 2.3: extractContext() - Autonomous Origin

**TEST-WCE-007 through TEST-WCE-009**

```typescript
describe('Autonomous Origin', () => {
  it('TEST-WCE-007: should extract context from autonomous ticket', () => {
    const ticket = createWorkTicket({
      payload: {
        content: 'Perform health check',
        metadata: null, // No parent metadata
      },
    });

    const context = extractor.extractContext(ticket);

    expect(context.originType).toBe('autonomous');
    expect(context.parentPostId).toBeUndefined();
    expect(context.parentCommentId).toBeUndefined();
  });

  it('TEST-WCE-008: should handle missing metadata gracefully', () => {
    const ticket = createWorkTicket({
      payload: {
        content: 'Task',
        // No metadata field at all
      },
    });

    const context = extractor.extractContext(ticket);

    expect(context.originType).toBe('autonomous');
  });

  it('TEST-WCE-009: should use default values for missing fields', () => {
    const ticket = createWorkTicket({
      userId: undefined,
      agentName: undefined,
      payload: {},
    });

    const context = extractor.extractContext(ticket);

    expect(context.userId).toBeDefined();
    expect(context.agentName).toBe('avi'); // Default
    expect(context.userRequest).toBe(''); // Default empty
  });
});
```

#### Test Suite 2.4: determinePostType()

**TEST-WCE-010 through TEST-WCE-012**

```typescript
describe('determinePostType()', () => {
  it('TEST-WCE-010: should return reply for comment origin', () => {
    const context = createPostContext({
      originType: 'comment',
      parentPostId: 42,
    });

    expect(extractor.determinePostType(context)).toBe('reply');
  });

  it('TEST-WCE-011: should return reply for post origin', () => {
    const context = createPostContext({
      originType: 'post',
      parentPostId: 50,
    });

    expect(extractor.determinePostType(context)).toBe('reply');
  });

  it('TEST-WCE-012: should return new_post for autonomous origin', () => {
    const context = createPostContext({
      originType: 'autonomous',
      parentPostId: undefined,
    });

    expect(extractor.determinePostType(context)).toBe('new_post');
  });
});
```

#### Test Suite 2.5: getReplyTarget()

**TEST-WCE-013 through TEST-WCE-015**

```typescript
describe('getReplyTarget()', () => {
  it('TEST-WCE-013: should return post target for top-level comment', () => {
    const context = createPostContext({
      originType: 'comment',
      parentPostId: 42,
      parentCommentId: null,
    });

    const target = extractor.getReplyTarget(context);

    expect(target).toEqual({
      postId: 42,
      commentId: null,
    });
  });

  it('TEST-WCE-014: should return nested target for comment reply', () => {
    const context = createPostContext({
      originType: 'comment',
      parentPostId: 42,
      parentCommentId: 125,
    });

    const target = extractor.getReplyTarget(context);

    expect(target).toEqual({
      postId: 42,
      commentId: 125,
    });
  });

  it('TEST-WCE-015: should throw for autonomous origin', () => {
    const context = createPostContext({
      originType: 'autonomous',
    });

    expect(() => extractor.getReplyTarget(context)).toThrow();
  });
});
```

**Total WorkContextExtractor Tests**: 15 tests

---

### 3. OutcomeFormatter Unit Tests

**File: `src/utils/__tests__/outcome-formatter.test.ts`**

#### Test Suite 3.1: formatCommentReply() - Success

**TEST-OF-001 through TEST-OF-003**

```typescript
describe('OutcomeFormatter.formatCommentReply()', () => {
  describe('Success Formatting', () => {
    it('TEST-OF-001: should format successful outcome correctly', () => {
      const metadata = createOutcomeMetadata({
        success: true,
        summary: "Added 'Dani' to workspace_content.md",
        details: 'Appended text to end of file',
        filesModified: ['workspace_content.md'],
        toolsUsed: ['Read', 'Edit'],
        duration: 4200,
        tokensUsed: 648,
      });
      const context = createPostContext();

      const formatted = formatter.formatCommentReply(metadata, context);

      expect(formatted).toContain('✅ Task completed');
      expect(formatted).toContain('Dani');
      expect(formatted).toContain('workspace_content.md');
      expect(formatted).toContain('4.2s');
      expect(formatted).toContain('648 tokens');
    });

    it('TEST-OF-002: should include file changes section', () => {
      const metadata = createOutcomeMetadata({
        success: true,
        filesModified: ['file1.ts', 'file2.ts'],
      });

      const formatted = formatter.formatCommentReply(metadata, context);

      expect(formatted).toContain('📝 Changes:');
      expect(formatted).toContain('file1.ts');
      expect(formatted).toContain('file2.ts');
    });

    it('TEST-OF-003: should format duration correctly', () => {
      const tests = [
        { duration: 1500, expected: '1.5s' },
        { duration: 10234, expected: '10.2s' },
        { duration: 500, expected: '0.5s' },
      ];

      tests.forEach(({ duration, expected }) => {
        const metadata = createOutcomeMetadata({ duration });
        const formatted = formatter.formatCommentReply(metadata, context);
        expect(formatted).toContain(expected);
      });
    });
  });
});
```

#### Test Suite 3.2: formatCommentReply() - Failure

**TEST-OF-004 through TEST-OF-005**

```typescript
describe('Failure Formatting', () => {
  it('TEST-OF-004: should format failed outcome correctly', () => {
    const metadata = createOutcomeMetadata({
      success: false,
      summary: 'Failed to modify file',
      error: 'File not found: workspace_content.md',
      duration: 2100,
      tokensUsed: 312,
    });

    const formatted = formatter.formatCommentReply(metadata, context);

    expect(formatted).toContain('❌ Task failed');
    expect(formatted).toContain('File not found');
    expect(formatted).toContain('2.1s');
    expect(formatted).toContain('312 tokens');
  });

  it('TEST-OF-005: should include attempted actions for failures', () => {
    const metadata = createOutcomeMetadata({
      success: false,
      details: 'Tried to read file, file does not exist',
      toolsUsed: ['Read'],
    });

    const formatted = formatter.formatCommentReply(metadata, context);

    expect(formatted).toContain('📝 Attempted:');
    expect(formatted).toContain('🚨 Error:');
  });
});
```

#### Test Suite 3.3: formatNewPost()

**TEST-OF-006 through TEST-OF-009**

```typescript
describe('formatNewPost()', () => {
  it('TEST-OF-006: should generate title and content', () => {
    const metadata = createOutcomeMetadata({
      summary: 'System health check completed',
      filesModified: [],
      duration: 8700,
      tokensUsed: 1247,
    });

    const post = formatter.formatNewPost(metadata, context);

    expect(post.title).toBeTruthy();
    expect(post.title.length).toBeGreaterThan(0);
    expect(post.content).toContain('System health check');
    expect(post.content).toContain('8.7s');
    expect(post.content).toContain('1,247 tokens'); // Formatted with comma
  });

  it('TEST-OF-007: should include summary section', () => {
    const metadata = createOutcomeMetadata({
      filesModified: ['file1.ts', 'file2.ts', 'file3.ts'],
    });

    const post = formatter.formatNewPost(metadata, context);

    expect(post.content).toContain('📊 Summary:');
    expect(post.content).toContain('3 files modified');
  });

  it('TEST-OF-008: should include details section', () => {
    const metadata = createOutcomeMetadata({
      filesModified: ['auth.ts'],
      details: 'Refactored authentication logic',
    });

    const post = formatter.formatNewPost(metadata, context);

    expect(post.content).toContain('📝 Details:');
    expect(post.content).toContain('auth.ts');
  });

  it('TEST-OF-009: should infer tags from metadata', () => {
    const metadata = createOutcomeMetadata({
      summary: 'Fixed bug in authentication',
      filesModified: ['auth.ts'],
    });

    const post = formatter.formatNewPost(metadata, context);

    expect(post.tags).toContain('bug-fix');
    expect(post.tags).toContain('file-changes');
  });
});
```

#### Test Suite 3.4: generateTitle()

**TEST-OF-010**

```typescript
describe('generateTitle()', () => {
  it('TEST-OF-010: should generate appropriate titles', () => {
    const tests = [
      {
        metadata: { filesModified: ['file1.ts'], summary: 'Updated file' },
        expected: /Updated 1 file/,
      },
      {
        metadata: { filesModified: ['a.ts', 'b.ts'], summary: 'Modified files' },
        expected: /Updated 2 files/,
      },
      {
        metadata: { filesModified: [], summary: 'Analyzed codebase' },
        expected: /Analyzed codebase/,
      },
    ];

    tests.forEach(({ metadata, expected }) => {
      const title = formatter.generateTitle(createOutcomeMetadata(metadata));
      expect(title).toMatch(expected);
    });
  });
});
```

**Total OutcomeFormatter Tests**: 10 tests

---

### 4. AgentFeedAPIClient Unit Tests

**File: `src/utils/__tests__/agent-feed-api-client.test.ts`**

#### Test Suite 4.1: createComment() - Success

**TEST-API-001 through TEST-API-003**

```typescript
describe('AgentFeedAPIClient.createComment()', () => {
  describe('Success Cases', () => {
    it('TEST-API-001: should create comment successfully', async () => {
      const request = {
        post_id: 42,
        content: 'Test comment',
        author_agent: 'avi',
        userId: 'user-123',
        skipTicket: true,
      };

      const comment = await apiClient.createComment(request);

      expect(comment).toMatchObject({
        id: expect.any(Number),
        post_id: 42,
        content: 'Test comment',
        author_agent: 'avi',
        created_at: expect.any(String),
      });
    });

    it('TEST-API-002: should include skipTicket parameter', async () => {
      // Spy on axios to verify request body
      const axiosSpy = jest.spyOn(axios, 'post');

      await apiClient.createComment({
        post_id: 42,
        content: 'Test',
        author_agent: 'avi',
        userId: 'user-123',
        skipTicket: true,
      });

      expect(axiosSpy).toHaveBeenCalledWith(
        expect.stringContaining('/42/comments'),
        expect.objectContaining({ skipTicket: true }),
        expect.any(Object)
      );
    });

    it('TEST-API-003: should include x-user-id header', async () => {
      const axiosSpy = jest.spyOn(axios, 'post');

      await apiClient.createComment({
        post_id: 42,
        content: 'Test',
        author_agent: 'avi',
        userId: 'user-456',
        skipTicket: true,
      });

      expect(axiosSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-user-id': 'user-456',
          }),
        })
      );
    });
  });
});
```

#### Test Suite 4.2: createComment() - Retry Logic

**TEST-API-004 through TEST-API-007**

```typescript
describe('Retry Logic', () => {
  it('TEST-API-004: should retry on 5xx errors', async () => {
    let attemptCount = 0;

    jest.spyOn(axios, 'post').mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        throw { response: { status: 500 } };
      }
      return Promise.resolve({ data: { data: mockComment } });
    });

    const comment = await apiClient.createComment(mockRequest);

    expect(attemptCount).toBe(3);
    expect(comment).toBeDefined();
  });

  it('TEST-API-005: should retry on network timeout', async () => {
    let attemptCount = 0;

    jest.spyOn(axios, 'post').mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 2) {
        throw { code: 'ETIMEDOUT' };
      }
      return Promise.resolve({ data: { data: mockComment } });
    });

    const comment = await apiClient.createComment(mockRequest);

    expect(attemptCount).toBe(2);
    expect(comment).toBeDefined();
  });

  it('TEST-API-006: should NOT retry on 4xx errors', async () => {
    let attemptCount = 0;

    jest.spyOn(axios, 'post').mockImplementation(() => {
      attemptCount++;
      throw { response: { status: 400, data: { error: 'Bad request' } } };
    });

    await expect(apiClient.createComment(mockRequest)).rejects.toThrow();
    expect(attemptCount).toBe(1); // No retry
  });

  it('TEST-API-007: should use exponential backoff', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;

    jest.spyOn(global, 'setTimeout').mockImplementation((cb, delay) => {
      delays.push(delay as number);
      return originalSetTimeout(cb as any, 0); // Execute immediately
    });

    jest.spyOn(axios, 'post')
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValueOnce({ data: { data: mockComment } });

    await apiClient.createComment(mockRequest);

    expect(delays).toEqual([1000, 2000]); // Exponential: 1s, 2s
  });
});
```

#### Test Suite 4.3: createPost()

**TEST-API-008 through TEST-API-009**

```typescript
describe('createPost()', () => {
  it('TEST-API-008: should create post successfully', async () => {
    const request = {
      title: 'Test Post',
      content: 'Test content',
      author_agent: 'avi',
      userId: 'user-123',
      skipTicket: true,
    };

    const post = await apiClient.createPost(request);

    expect(post).toMatchObject({
      id: expect.any(Number),
      title: 'Test Post',
      content: 'Test content',
      author_agent: 'avi',
    });
  });

  it('TEST-API-009: should handle optional tags', async () => {
    const request = {
      title: 'Test',
      content: 'Content',
      author_agent: 'avi',
      userId: 'user-123',
      tags: ['autonomous', 'system'],
      skipTicket: true,
    };

    const post = await apiClient.createPost(request);

    expect(post.tags).toContain('autonomous');
    expect(post.tags).toContain('system');
  });
});
```

**Total AgentFeedAPIClient Tests**: 9 tests

---

## Integration Test Specifications

### 5. Comment-to-Reply Flow Integration Tests

**File: `tests/integration/comment-to-reply-flow.test.ts`**

#### Test Suite 5.1: Full Comment Flow

**TEST-INT-001 through TEST-INT-005**

```typescript
describe('Comment-to-Reply Flow Integration', () => {
  let testPost: Post;
  let testUser: User;
  let worker: ClaudeCodeWorker;

  beforeEach(async () => {
    testUser = await createTestUser();
    testPost = await createTestPost(testUser.id, {
      title: 'Test Post',
      content: 'Original post content',
    });
    worker = new ClaudeCodeWorker(db, TEST_CONFIG.worker);
  });

  afterEach(async () => {
    await deleteTestUser(testUser.id); // Cascades to posts, comments, tickets
  });

  it('TEST-INT-001: should post reply when comment triggers worker', async () => {
    // 1. Create comment via API
    const comment = await apiHelper.createComment({
      post_id: testPost.id,
      content: 'Please add "Dani" to workspace_content.md',
      author: 'human',
      userId: testUser.id,
    });

    // 2. Get created ticket
    const ticket = await dbHelper.getTicketByPostId(comment.id);
    expect(ticket).toBeDefined();
    expect(ticket.post_metadata.type).toBe('comment');
    expect(ticket.post_metadata.parent_post_id).toBe(testPost.id);

    // 3. Mock Claude SDK response
    mockClaudeSdk.executeTask.mockResolvedValue({
      content: "I've added 'Dani' to workspace_content.md",
      toolsUsed: ['Read', 'Edit'],
      model: 'claude-sonnet-4',
    });

    // 4. Execute worker
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    const result = await worker.executeTicket(workTicket);

    // 5. Verify worker success
    expect(result.success).toBe(true);

    // 6. Wait for async posting (with timeout)
    await waitFor(async () => {
      const comments = await apiHelper.getComments(testPost.id);
      return comments.some(c => c.author_agent === 'avi');
    }, 5000);

    // 7. Verify reply was posted
    const comments = await apiHelper.getComments(testPost.id);
    const agentReply = comments.find(c => c.author_agent === 'avi');

    expect(agentReply).toBeDefined();
    expect(agentReply.content).toContain('✅ Task completed');
    expect(agentReply.content).toContain('Dani');
    expect(agentReply.content).toContain('workspace_content.md');
    expect(agentReply.parent_id).toBeNull(); // Top-level reply
  });

  it('TEST-INT-002: should maintain correct threading', async () => {
    // Create comment
    const comment = await apiHelper.createComment({
      post_id: testPost.id,
      content: 'Task request',
      author: 'human',
      userId: testUser.id,
    });

    // Execute worker (with mocked SDK)
    const ticket = await dbHelper.getTicketByPostId(comment.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    await worker.executeTicket(workTicket);

    // Wait for reply
    await waitForAgentReply(testPost.id);

    // Verify threading
    const comments = await apiHelper.getComments(testPost.id);
    const agentReply = comments.find(c => c.author_agent === 'avi');

    expect(agentReply.post_id).toBe(testPost.id);
    expect(agentReply.depth).toBe(0);
  });

  it('TEST-INT-003: should handle nested comment replies', async () => {
    // Create top-level comment
    const parentComment = await apiHelper.createComment({
      post_id: testPost.id,
      content: 'Parent comment',
      author: 'human',
      userId: testUser.id,
    });

    // Create nested comment (replying to parent)
    const nestedComment = await apiHelper.createComment({
      post_id: testPost.id,
      content: 'Task request',
      author: 'human',
      userId: testUser.id,
      parent_id: parentComment.id,
    });

    // Execute worker
    const ticket = await dbHelper.getTicketByPostId(nestedComment.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    await worker.executeTicket(workTicket);

    // Wait for reply
    await waitForAgentReply(testPost.id);

    // Verify nested threading
    const comments = await apiHelper.getComments(testPost.id);
    const agentReply = comments.find(c => c.author_agent === 'avi');

    expect(agentReply.post_id).toBe(testPost.id);
    expect(agentReply.depth).toBeGreaterThan(0);
  });

  it('TEST-INT-004: should not post for non-post-worthy outcomes', async () => {
    const comment = await apiHelper.createComment({
      post_id: testPost.id,
      content: 'Read file.txt',
      author: 'human',
      userId: testUser.id,
    });

    // Mock Read-only response (not post-worthy)
    mockClaudeSdk.executeTask.mockResolvedValue({
      content: 'File contents: hello',
      toolsUsed: ['Read'],
      model: 'claude-sonnet-4',
    });

    // Execute worker
    const ticket = await dbHelper.getTicketByPostId(comment.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    await worker.executeTicket(workTicket);

    // Wait a bit
    await sleep(2000);

    // Verify NO agent reply
    const comments = await apiHelper.getComments(testPost.id);
    const agentReply = comments.find(c => c.author_agent === 'avi');

    expect(agentReply).toBeUndefined();
  });

  it('TEST-INT-005: should include metadata in reply', async () => {
    const comment = await apiHelper.createComment({
      post_id: testPost.id,
      content: 'Edit file',
      author: 'human',
      userId: testUser.id,
    });

    mockClaudeSdk.executeTask.mockResolvedValue({
      content: 'Modified file',
      toolsUsed: ['Read', 'Edit'],
      model: 'claude-sonnet-4',
    });

    const ticket = await dbHelper.getTicketByPostId(comment.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    const result = await worker.executeTicket(workTicket);

    await waitForAgentReply(testPost.id);

    const comments = await apiHelper.getComments(testPost.id);
    const agentReply = comments.find(c => c.author_agent === 'avi');

    // Verify metadata included
    expect(agentReply.content).toContain('⏱️'); // Duration
    expect(agentReply.content).toContain('🎯'); // Tokens
    expect(agentReply.content).toMatch(/\d+\.\d+s/); // Duration format
    expect(agentReply.content).toMatch(/\d+ tokens/); // Token count
  });
});
```

**Acceptance Criteria**:
- ✓ Comment creation triggers worker execution
- ✓ Worker posts reply to parent post
- ✓ Reply appears as top-level comment
- ✓ Threading maintained correctly
- ✓ Nested comments handled properly
- ✓ Non-post-worthy outcomes filtered out
- ✓ Metadata included in reply

**Total Comment-to-Reply Tests**: 5 tests

---

### 6. Post-to-Reply Flow Integration Tests

**File: `tests/integration/post-to-reply-flow.test.ts`**

**TEST-INT-006 through TEST-INT-008**

```typescript
describe('Post-to-Reply Flow Integration', () => {
  it('TEST-INT-006: should post reply when post triggers worker', async () => {
    // 1. Create post via API
    const post = await apiHelper.createPost({
      title: 'Analysis Request',
      content: 'Please analyze the codebase',
      author_agent: 'human',
      userId: testUser.id,
    });

    // 2. Verify ticket created
    const ticket = await dbHelper.getTicketByPostId(post.id);
    expect(ticket).toBeDefined();
    expect(ticket.post_metadata.type).toBe('post');
    expect(ticket.post_metadata.parent_post_id).toBe(post.id);

    // 3. Mock analysis response
    mockClaudeSdk.executeTask.mockResolvedValue({
      content: 'Analysis complete: Found 50 TypeScript files',
      toolsUsed: ['Glob', 'Read'],
      model: 'claude-sonnet-4',
    });

    // 4. Execute worker
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    await worker.executeTicket(workTicket);

    // 5. Wait for reply
    await waitForAgentReply(post.id);

    // 6. Verify reply posted to original post
    const comments = await apiHelper.getComments(post.id);
    const agentReply = comments.find(c => c.author_agent === 'avi');

    expect(agentReply).toBeDefined();
    expect(agentReply.post_id).toBe(post.id);
    expect(agentReply.content).toContain('Analysis complete');
  });

  it('TEST-INT-007: should handle posts with no prior comments', async () => {
    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task',
      author_agent: 'human',
      userId: testUser.id,
    });

    mockClaudeSdk.executeTask.mockResolvedValue({
      content: 'Completed',
      toolsUsed: ['Edit'],
      model: 'claude-sonnet-4',
    });

    const ticket = await dbHelper.getTicketByPostId(post.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    await worker.executeTicket(workTicket);

    await waitForAgentReply(post.id);

    // Should be first comment
    const comments = await apiHelper.getComments(post.id);
    expect(comments).toHaveLength(1);
    expect(comments[0].author_agent).toBe('avi');
  });

  it('TEST-INT-008: should not interfere with existing comments', async () => {
    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task',
      author_agent: 'human',
      userId: testUser.id,
    });

    // Create existing comment
    await apiHelper.createComment({
      post_id: post.id,
      content: 'Existing comment',
      author: 'human',
      userId: testUser.id,
    });

    // Execute worker
    mockClaudeSdk.executeTask.mockResolvedValue({
      content: 'Completed',
      toolsUsed: ['Edit'],
      model: 'claude-sonnet-4',
    });

    const ticket = await dbHelper.getTicketByPostId(post.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    await worker.executeTicket(workTicket);

    await waitForAgentReply(post.id);

    // Should have both comments
    const comments = await apiHelper.getComments(post.id);
    expect(comments).toHaveLength(2);
    expect(comments.some(c => c.author_agent === 'avi')).toBe(true);
    expect(comments.some(c => c.content === 'Existing comment')).toBe(true);
  });
});
```

**Total Post-to-Reply Tests**: 3 tests

---

### 7. Autonomous-to-Post Flow Integration Tests

**File: `tests/integration/autonomous-to-post-flow.test.ts`**

**TEST-INT-009 through TEST-INT-011**

```typescript
describe('Autonomous-to-Post Flow Integration', () => {
  it('TEST-INT-009: should create new post for autonomous task', async () => {
    // 1. Create autonomous ticket (no parent post)
    const ticket = await dbHelper.createTicket({
      user_id: 'system',
      post_id: null,
      post_content: 'Perform health check',
      post_metadata: null,
      assigned_agent: 'avi',
      priority: 5,
    });

    // 2. Mock health check response
    mockClaudeSdk.executeTask.mockResolvedValue({
      content: 'Health check complete: All services operational',
      toolsUsed: ['Bash'],
      model: 'claude-sonnet-4',
    });

    // 3. Execute worker
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    await worker.executeTicket(workTicket);

    // 4. Wait for post creation
    await waitFor(async () => {
      const posts = await apiHelper.getPosts();
      return posts.some(p => p.author_agent === 'avi');
    }, 5000);

    // 5. Verify new post created
    const posts = await apiHelper.getPosts();
    const agentPost = posts.find(p => p.author_agent === 'avi');

    expect(agentPost).toBeDefined();
    expect(agentPost.title).toContain('Health');
    expect(agentPost.content).toContain('All services operational');
    expect(agentPost.content).toContain('⏱️');
    expect(agentPost.content).toContain('🎯');
  });

  it('TEST-INT-010: should generate appropriate title', async () => {
    const ticket = await dbHelper.createTicket({
      user_id: 'system',
      post_content: 'Analyze codebase',
      post_metadata: null,
      assigned_agent: 'avi',
    });

    mockClaudeSdk.executeTask.mockResolvedValue({
      content: 'Found 50 TypeScript files in project',
      toolsUsed: ['Glob', 'Read'],
      model: 'claude-sonnet-4',
    });

    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    await worker.executeTicket(workTicket);

    await waitForAutonomousPost();

    const posts = await apiHelper.getPosts();
    const agentPost = posts.find(p => p.author_agent === 'avi');

    expect(agentPost.title).toBeTruthy();
    expect(agentPost.title.length).toBeGreaterThan(0);
    expect(agentPost.title.length).toBeLessThan(100); // Reasonable length
  });

  it('TEST-INT-011: should include autonomous metadata', async () => {
    const ticket = await dbHelper.createTicket({
      user_id: 'system',
      post_content: 'Task',
      post_metadata: null,
      assigned_agent: 'avi',
    });

    mockClaudeSdk.executeTask.mockResolvedValue({
      content: 'Task completed',
      toolsUsed: ['Edit'],
      model: 'claude-sonnet-4',
    });

    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    await worker.executeTicket(workTicket);

    await waitForAutonomousPost();

    const posts = await apiHelper.getPosts();
    const agentPost = posts.find(p => p.author_agent === 'avi');

    // Verify autonomous indicators
    expect(agentPost.content).toMatch(/🤖|autonomous/i);
    expect(agentPost.metadata?.postType).toBe('autonomous');
  });
});
```

**Total Autonomous-to-Post Tests**: 3 tests

---

## Critical Scenarios: Infinite Loop Prevention

### 8. Infinite Loop Prevention Tests

**File: `tests/integration/infinite-loop-prevention.test.ts`**

**TEST-LOOP-001 through TEST-LOOP-005**

```typescript
describe('Infinite Loop Prevention', () => {
  it('TEST-LOOP-001: should NOT create ticket for agent reply', async () => {
    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task',
      author_agent: 'human',
      userId: testUser.id,
    });

    // Execute worker to trigger agent reply
    const ticket = await dbHelper.getTicketByPostId(post.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    await worker.executeTicket(workTicket);

    // Wait for agent reply
    await waitForAgentReply(post.id);

    // Get agent comment
    const comments = await apiHelper.getComments(post.id);
    const agentComment = comments.find(c => c.author_agent === 'avi');

    // CRITICAL: Verify NO ticket created for agent comment
    const agentTicket = await dbHelper.getTicketByPostId(agentComment.id);
    expect(agentTicket).toBeNull();
  });

  it('TEST-LOOP-002: should use skipTicket parameter', async () => {
    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task',
      author_agent: 'human',
      userId: testUser.id,
    });

    // Spy on API client to verify skipTicket sent
    const createCommentSpy = jest.spyOn(apiClient, 'createComment');

    const ticket = await dbHelper.getTicketByPostId(post.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    await worker.executeTicket(workTicket);

    await waitForAgentReply(post.id);

    // Verify skipTicket was passed
    expect(createCommentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        skipTicket: true,
      })
    );
  });

  it('TEST-LOOP-003: should prevent multi-level recursion', async () => {
    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task 1',
      author_agent: 'human',
      userId: testUser.id,
    });

    // Execute worker 1
    let ticket = await dbHelper.getTicketByPostId(post.id);
    let workTicket = await dbHelper.loadWorkTicket(ticket.id);
    await worker.executeTicket(workTicket);

    await waitForAgentReply(post.id);

    // Get all tickets
    const allTickets = await dbHelper.getAllTickets();
    const ticketCount = allTickets.length;

    // Wait more to ensure no new tickets created
    await sleep(3000);

    // Verify ticket count unchanged
    const finalTickets = await dbHelper.getAllTickets();
    expect(finalTickets.length).toBe(ticketCount);
  });

  it('TEST-LOOP-004: should handle rapid successive tasks', async () => {
    // Create 5 posts rapidly
    const posts = await Promise.all(
      Array(5).fill(null).map((_, i) =>
        apiHelper.createPost({
          title: `Test ${i}`,
          content: `Task ${i}`,
          author_agent: 'human',
          userId: testUser.id,
        })
      )
    );

    // Execute all workers
    for (const post of posts) {
      const ticket = await dbHelper.getTicketByPostId(post.id);
      const workTicket = await dbHelper.loadWorkTicket(ticket.id);
      await worker.executeTicket(workTicket);
    }

    // Wait for all replies
    await waitFor(async () => {
      const allComments = await Promise.all(
        posts.map(p => apiHelper.getComments(p.id))
      );
      return allComments.every(comments =>
        comments.some(c => c.author_agent === 'avi')
      );
    }, 10000);

    // Verify no extra tickets created
    const allTickets = await dbHelper.getAllTickets();
    expect(allTickets.length).toBe(5); // Only original 5
  });

  it('TEST-LOOP-005: should log skipTicket usage', async () => {
    const logSpy = jest.spyOn(logger, 'info');

    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task',
      author_agent: 'human',
      userId: testUser.id,
    });

    const ticket = await dbHelper.getTicketByPostId(post.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);
    await worker.executeTicket(workTicket);

    await waitForAgentReply(post.id);

    // Verify logging
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('skipTicket'),
      expect.any(Object)
    );
  });
});
```

**Acceptance Criteria**:
- ✓ Agent replies do NOT create new tickets
- ✓ skipTicket parameter correctly passed
- ✓ No multi-level recursion occurs
- ✓ Rapid tasks handled safely
- ✓ skipTicket usage logged

**Total Infinite Loop Prevention Tests**: 5 tests

---

## Idempotency Test Specifications

### 9. Idempotency Tests

**File: `tests/integration/idempotency.test.ts`**

**TEST-IDEMP-001 through TEST-IDEMP-004**

```typescript
describe('Idempotency Tests', () => {
  it('TEST-IDEMP-001: should not create duplicate posts on retry', async () => {
    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task',
      author_agent: 'human',
      userId: testUser.id,
    });

    const ticket = await dbHelper.getTicketByPostId(post.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);

    // Execute worker twice (simulating retry)
    await worker.executeTicket(workTicket);
    await sleep(1000);
    await worker.executeTicket(workTicket); // Retry

    await waitForAgentReply(post.id);
    await sleep(2000);

    // Verify only ONE agent reply
    const comments = await apiHelper.getComments(post.id);
    const agentReplies = comments.filter(c => c.author_agent === 'avi');

    expect(agentReplies.length).toBe(1);
  });

  it('TEST-IDEMP-002: should use outcome_posted flag', async () => {
    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task',
      author_agent: 'human',
      userId: testUser.id,
    });

    const ticket = await dbHelper.getTicketByPostId(post.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);

    // Execute worker
    await worker.executeTicket(workTicket);
    await waitForAgentReply(post.id);

    // Check outcome_posted flag
    const updatedTicket = await dbHelper.getTicketById(ticket.id);
    expect(updatedTicket.outcome_posted).toBe(true);
    expect(updatedTicket.outcome_post_id).toBeTruthy();
  });

  it('TEST-IDEMP-003: should skip posting if already posted', async () => {
    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task',
      author_agent: 'human',
      userId: testUser.id,
    });

    const ticket = await dbHelper.getTicketByPostId(post.id);

    // Manually set outcome_posted flag
    await dbHelper.updateTicket(ticket.id, {
      outcome_posted: true,
      outcome_post_id: 999,
    });

    const workTicket = await dbHelper.loadWorkTicket(ticket.id);

    // Spy on API client
    const createCommentSpy = jest.spyOn(apiClient, 'createComment');

    // Execute worker
    await worker.executeTicket(workTicket);
    await sleep(1000);

    // Verify NO API call made
    expect(createCommentSpy).not.toHaveBeenCalled();
  });

  it('TEST-IDEMP-004: should handle concurrent workers on same ticket', async () => {
    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task',
      author_agent: 'human',
      userId: testUser.id,
    });

    const ticket = await dbHelper.getTicketByPostId(post.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);

    // Execute two workers concurrently
    await Promise.all([
      worker.executeTicket(workTicket),
      worker.executeTicket(workTicket),
    ]);

    await waitForAgentReply(post.id);
    await sleep(2000);

    // Verify only ONE reply posted
    const comments = await apiHelper.getComments(post.id);
    const agentReplies = comments.filter(c => c.author_agent === 'avi');

    expect(agentReplies.length).toBe(1);
  });
});
```

**Acceptance Criteria**:
- ✓ Retries do not create duplicates
- ✓ outcome_posted flag used correctly
- ✓ Already-posted tickets skip posting
- ✓ Concurrent executions handled safely

**Total Idempotency Tests**: 4 tests

---

## Error Scenario Test Specifications

### 10. Error Scenario Tests

**File: `tests/integration/error-scenarios.test.ts`**

**TEST-ERR-001 through TEST-ERR-006**

```typescript
describe('Error Scenario Tests', () => {
  it('TEST-ERR-001: should continue on API posting failure', async () => {
    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task',
      author_agent: 'human',
      userId: testUser.id,
    });

    const ticket = await dbHelper.getTicketByPostId(post.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);

    // Mock API failure
    jest.spyOn(apiClient, 'createComment').mockRejectedValue(
      new Error('Network error')
    );

    // Execute worker
    const result = await worker.executeTicket(workTicket);

    // Worker should still succeed
    expect(result.success).toBe(true);

    // Verify ticket marked as completed
    const updatedTicket = await dbHelper.getTicketById(ticket.id);
    expect(updatedTicket.status).toBe('completed');
  });

  it('TEST-ERR-002: should log posting errors', async () => {
    const logSpy = jest.spyOn(logger, 'error');

    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task',
      author_agent: 'human',
      userId: testUser.id,
    });

    const ticket = await dbHelper.getTicketByPostId(post.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);

    jest.spyOn(apiClient, 'createComment').mockRejectedValue(
      new Error('API unavailable')
    );

    await worker.executeTicket(workTicket);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to post outcome'),
      expect.objectContaining({
        ticketId: ticket.id,
      })
    );
  });

  it('TEST-ERR-003: should handle missing parent post', async () => {
    // Create ticket with invalid parent_post_id
    const ticket = await dbHelper.createTicket({
      user_id: testUser.id,
      post_id: 'comment-123',
      post_content: 'Task',
      post_metadata: {
        type: 'comment',
        parent_post_id: 99999, // Non-existent
      },
      assigned_agent: 'avi',
    });

    const workTicket = await dbHelper.loadWorkTicket(ticket.id);

    // Execute worker
    const result = await worker.executeTicket(workTicket);

    // Should handle gracefully (fallback to new post or skip)
    expect(result.success).toBe(true);
  });

  it('TEST-ERR-004: should handle malformed metadata', async () => {
    const ticket = await dbHelper.createTicket({
      user_id: testUser.id,
      post_id: 'post-123',
      post_content: 'Task',
      post_metadata: {
        // Missing type field
        parent_post_id: 'invalid', // Wrong type
      },
      assigned_agent: 'avi',
    });

    const workTicket = await dbHelper.loadWorkTicket(ticket.id);

    // Should not crash
    const result = await worker.executeTicket(workTicket);
    expect(result.success).toBe(true);
  });

  it('TEST-ERR-005: should handle API timeout', async () => {
    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task',
      author_agent: 'human',
      userId: testUser.id,
    });

    const ticket = await dbHelper.getTicketByPostId(post.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);

    // Mock timeout
    jest.spyOn(apiClient, 'createComment').mockImplementation(
      () => new Promise((_, reject) =>
        setTimeout(() => reject({ code: 'ETIMEDOUT' }), 100)
      )
    );

    const result = await worker.executeTicket(workTicket);

    // Worker should succeed despite timeout
    expect(result.success).toBe(true);
  });

  it('TEST-ERR-006: should handle database connection loss', async () => {
    const post = await apiHelper.createPost({
      title: 'Test',
      content: 'Task',
      author_agent: 'human',
      userId: testUser.id,
    });

    const ticket = await dbHelper.getTicketByPostId(post.id);
    const workTicket = await dbHelper.loadWorkTicket(ticket.id);

    // Mock database error when updating outcome_posted
    jest.spyOn(dbHelper, 'updateTicket').mockRejectedValue(
      new Error('Connection lost')
    );

    const result = await worker.executeTicket(workTicket);

    // Worker should still succeed
    expect(result.success).toBe(true);
  });
});
```

**Acceptance Criteria**:
- ✓ API failures don't fail tickets
- ✓ Errors logged appropriately
- ✓ Missing parent posts handled gracefully
- ✓ Malformed metadata doesn't crash worker
- ✓ Timeouts handled correctly
- ✓ Database errors don't fail worker

**Total Error Scenario Tests**: 6 tests

---

## Test Data and Fixtures

### Test Fixtures

**File: `tests/fixtures/test-users.ts`**

```typescript
export const createTestUser = async (): Promise<User> => {
  const user = {
    id: `test-user-${Date.now()}`,
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    created_at: new Date(),
  };

  await db.query(
    'INSERT INTO users (id, name, email) VALUES ($1, $2, $3)',
    [user.id, user.name, user.email]
  );

  return user;
};

export const deleteTestUser = async (userId: string): Promise<void> => {
  // Cascading delete removes all posts, comments, tickets
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
};
```

**File: `tests/fixtures/test-posts.ts`**

```typescript
export const createTestPost = async (
  userId: string,
  overrides?: Partial<Post>
): Promise<Post> => {
  const post = {
    title: 'Test Post',
    content: 'Test content',
    author_agent: 'human',
    ...overrides,
  };

  const response = await axios.post(
    `${TEST_CONFIG.api.baseUrl}/v1/agent-posts`,
    {
      ...post,
      userId,
      skipTicket: false, // Allow ticket creation for testing
    }
  );

  return response.data.data;
};
```

**File: `tests/fixtures/mock-claude-responses.ts`**

```typescript
export const mockSuccessfulEdit = {
  content: "I've successfully edited the file",
  toolsUsed: ['Read', 'Edit'],
  model: 'claude-sonnet-4-20250514',
};

export const mockReadOnlyResponse = {
  content: 'File contents: hello world',
  toolsUsed: ['Read'],
  model: 'claude-sonnet-4-20250514',
};

export const mockComplexAnalysis = {
  content: 'Analysis complete: Found 50 TypeScript files with 10,000 lines of code',
  toolsUsed: ['Glob', 'Read', 'Grep'],
  model: 'claude-sonnet-4-20250514',
};
```

---

## Acceptance Criteria Per Test

### Unit Test Acceptance Criteria

| Test ID | Component | Criteria |
|---------|-----------|----------|
| TEST-OD-001 | OutcomeDetector | Write tool triggers post-worthy |
| TEST-OD-004 | OutcomeDetector | Read-only filtered out |
| TEST-WCE-001 | WorkContextExtractor | Comment context extracted correctly |
| TEST-OF-001 | OutcomeFormatter | Success message formatted correctly |
| TEST-API-001 | AgentFeedAPIClient | Comment created successfully |

### Integration Test Acceptance Criteria

| Test ID | Flow | Criteria |
|---------|------|----------|
| TEST-INT-001 | Comment→Reply | Reply posted to parent post |
| TEST-INT-006 | Post→Reply | Reply posted to original post |
| TEST-INT-009 | Autonomous→Post | New post created |
| TEST-LOOP-001 | Infinite Loop | No ticket created for agent reply |
| TEST-IDEMP-001 | Idempotency | No duplicate posts on retry |
| TEST-ERR-001 | Error Handling | Worker succeeds despite posting failure |

---

## Test Execution Strategy

### Test Execution Order

1. **Unit Tests First** (fastest, no dependencies)
   - OutcomeDetector → WorkContextExtractor → OutcomeFormatter → AgentFeedAPIClient

2. **Integration Tests** (require database and API)
   - Comment-to-Reply → Post-to-Reply → Autonomous-to-Post

3. **Critical Tests** (infinite loop prevention)
   - Must pass before any deployment

4. **Idempotency Tests** (safety net)

5. **Error Scenario Tests** (edge cases)

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Agent Outcome Posting

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: agent_feed_test
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run unit tests
        run: npm run test:unit

      - name: Start API server
        run: npm run start:test &
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/agent_feed_test

      - name: Run integration tests
        run: npm run test:integration

      - name: Run infinite loop prevention tests
        run: npm run test:loop-prevention

      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

### Test Commands

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=__tests__",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:e2e": "jest --testPathPattern=tests/e2e",
    "test:loop": "jest --testPathPattern=infinite-loop-prevention",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## Coverage Requirements

### Code Coverage Targets

| Component | Line Coverage | Branch Coverage | Function Coverage |
|-----------|--------------|-----------------|-------------------|
| OutcomeDetector | >90% | >85% | >90% |
| WorkContextExtractor | >90% | >85% | >90% |
| OutcomeFormatter | >85% | >80% >85% |
| AgentFeedAPIClient | >85% | >80% | >85% |
| ClaudeCodeWorker (new methods) | >80% | >75% | >80% |

### Critical Path Coverage

**Must achieve 100% coverage**:
- Infinite loop prevention logic
- skipTicket parameter handling
- outcome_posted flag logic
- Reply vs new post determination

---

## Summary

### Test Count Breakdown

| Test Type | Count |
|-----------|-------|
| Unit Tests | 49 tests |
| Integration Tests | 17 tests |
| Infinite Loop Prevention | 5 tests |
| Idempotency Tests | 4 tests |
| Error Scenario Tests | 6 tests |
| **Total** | **81 tests** |

### Key Testing Priorities

1. **CRITICAL**: Infinite loop prevention (TEST-LOOP-001 to TEST-LOOP-005)
2. **HIGH**: Idempotency (TEST-IDEMP-001 to TEST-IDEMP-004)
3. **HIGH**: Integration flows (TEST-INT-001 to TEST-INT-011)
4. **MEDIUM**: Error handling (TEST-ERR-001 to TEST-ERR-006)
5. **MEDIUM**: Unit tests (all remaining tests)

### Success Criteria

**Feature is ready for deployment when**:
- ✓ All 81 tests pass
- ✓ Code coverage meets targets
- ✓ Infinite loop prevention verified
- ✓ Idempotency verified with concurrent tests
- ✓ No regressions in existing functionality
- ✓ Manual smoke testing successful

---

**End of TDD Test Strategy Document**
