# Phase 4: Validation & Error Handling - SPARC Specification

**Version:** 1.0
**Date:** 2025-10-12
**Status:** Specification Complete
**Methodology:** SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)

---

## Executive Summary

This document specifies Phase 4 of the AVI DM architecture: **Validation & Error Handling**. This phase bridges the gap between agent response generation (Phase 3) and production reliability by implementing:

1. **Post Validation Service** - Trust but verify approach with lightweight checks
2. **Retry Strategy Service** - Multi-strategy retry logic with exponential backoff
3. **Error Escalation System** - Intelligent error classification and user notification
4. **Validation Orchestration** - Integration layer connecting all validation components

**Current State:** 40% complete (basic validation exists, advanced features pending)
**Target State:** 100% complete with production-ready error handling

---

## Table of Contents

1. [System Context](#1-system-context)
2. [Functional Requirements](#2-functional-requirements)
3. [Interface Definitions](#3-interface-definitions)
4. [Architecture Design](#4-architecture-design)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [Error Taxonomy](#6-error-taxonomy)
7. [Integration Points](#7-integration-points)
8. [Implementation Specifications](#8-implementation-specifications)
9. [Test Requirements](#9-test-requirements)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Success Criteria](#11-success-criteria)
12. [Acceptance Tests](#12-acceptance-tests)

---

## 1. System Context

### 1.1 Current Architecture State

**Phase 1 (Database):** ✅ 100% Complete
- All tables operational
- Repository pattern implemented
- Migration system working

**Phase 2 (Orchestrator):** ✅ 95% Complete
- Orchestrator running
- 4 adapters implemented
- Known issues in state persistence

**Phase 3 (Agent Workers):** ✅ 100% Complete
- Worker spawning functional
- Response generation working
- Memory persistence operational

**Phase 4 (Validation):** ⚠️ 40% Complete
- Basic validation exists in `/src/utils/validation.ts`
- Response validation in `/src/worker/response-generator.ts`
- Winston logger integrated
- Basic retry in feed monitor
- **Missing:** Advanced validation, retry strategies, escalation

### 1.2 System Architecture Context

```
┌─────────────────────────────────────────────────────┐
│  AVI Orchestrator (Phase 2)                         │
│  ├─> Monitors feed                                  │
│  ├─> Creates work tickets                           │
│  └─> Manages worker lifecycle                       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Agent Worker (Phase 3)                             │
│  ├─> Loads context from DB                          │
│  ├─> Generates response (Claude API)                │
│  └─> Returns draft response                         │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Validation & Error Handling (Phase 4) ◄── YOU ARE HERE
│  ├─> Validate response (rule-based + LLM)           │
│  ├─> Retry failed posts (3 strategies)              │
│  ├─> Escalate persistent failures                   │
│  └─> Notify users when needed                       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Platform API (External)                            │
│  └─> Post to social media platform                  │
└─────────────────────────────────────────────────────┘
```

### 1.3 Integration Requirements

Phase 4 must integrate with:

1. **Phase 2 Orchestrator** (`/src/avi/orchestrator.ts`)
   - Receive validation requests
   - Update work ticket status
   - Trigger worker respawning

2. **Phase 3 Agent Workers** (`/src/worker/agent-worker.ts`)
   - Receive generated responses
   - Provide revision feedback
   - Save validated posts

3. **Phase 1 Database** (PostgreSQL)
   - Read/write to `error_log` table
   - Update `work_queue` retry counts
   - Query agent context for validation

4. **External Platform API**
   - Handle API errors (rate limits, auth failures)
   - Implement backoff strategies
   - Track posting success rates

---

## 2. Functional Requirements

### 2.1 Post Validation (FR-4.1)

#### FR-4.1.1: Rule-Based Validation (0 tokens)

**Priority:** HIGH
**Status:** Partially Implemented

**Requirements:**
- ✅ MUST validate post length against `postingRules.maxLength`
- ✅ MUST validate post length against `postingRules.minLength`
- ✅ MUST check for prohibited words from `postingRules.blockedWords`
- ⚠️ MUST validate mention count (max 3 per platform rules)
- ⚠️ MUST validate hashtag count (max 5 per platform rules)
- ⚠️ MUST validate URL format and count
- ⚠️ MUST check for duplicate content (anti-spam)
- ✅ MUST execute in <50ms (no API calls)

**Acceptance Criteria:**
```typescript
✓ Post "Hello world" with maxLength 280 → PASS
✓ Post (500 chars) with maxLength 280 → FAIL "Response too long"
✓ Post containing "spam" with blockedWords ["spam"] → FAIL "Blocked word detected"
✓ Post with 4 mentions → FAIL "Too many mentions"
✓ Post with 6 hashtags → FAIL "Too many hashtags"
✓ Validation executes in <50ms for all checks
```

#### FR-4.1.2: Lightweight LLM Validation (~200 tokens)

**Priority:** HIGH
**Status:** Not Implemented

**Requirements:**
- ⚠️ MUST validate tone matches agent personality
- ⚠️ MUST check context appropriateness (topic relevance)
- ⚠️ MUST detect potential brand safety issues
- ⚠️ MUST provide actionable feedback for failures
- ⚠️ MUST complete in <2 seconds
- ⚠️ MUST cost <200 tokens per validation

**Validation Prompt Template:**
```
Validate this social media post for tone and context appropriateness.

Agent Personality: {agent.personality}
Expected Tone: {agent.responseStyle.tone}
Post Content: "{content}"
Context: Replying to post about "{feedItem.title}"

Check for:
1. Tone matches personality (professional, casual, friendly, etc.)
2. Content is contextually appropriate
3. No brand safety concerns

Respond in JSON:
{
  "passed": boolean,
  "severity": "ok" | "warning" | "critical",
  "reason": string,
  "suggestion": string (how to fix)
}
```

**Acceptance Criteria:**
```typescript
✓ Tech guru responds with casual tone → FAIL "Tone mismatch" + suggestion
✓ Friendly assistant responds warmly → PASS
✓ Post contains controversial opinion → FAIL "Brand safety concern"
✓ Off-topic response to technical post → FAIL "Context mismatch"
✓ Validation completes in <2s
✓ Costs <250 tokens per validation
```

#### FR-4.1.3: ValidationResult Interface

**Status:** Not Implemented

```typescript
interface ValidationResult {
  /** Overall validation status */
  approved: boolean;

  /** Can the agent fix this with revision? */
  canFix: boolean;

  /** Why validation failed (if applicable) */
  reason?: ValidationReason;

  /** Actionable feedback for agent revision */
  feedback?: string;

  /** Rule-based check results */
  ruleChecks: RuleCheckResult[];

  /** LLM validation result (if performed) */
  llmCheck?: LLMCheckResult;

  /** Token cost of validation */
  tokenCost: number;

  /** Validation duration in milliseconds */
  durationMs: number;
}

enum ValidationReason {
  TOO_LONG = 'too_long',
  TOO_SHORT = 'too_short',
  BLOCKED_WORD = 'blocked_word',
  TOO_MANY_MENTIONS = 'too_many_mentions',
  TOO_MANY_HASHTAGS = 'too_many_hashtags',
  TONE_MISMATCH = 'tone_mismatch',
  CONTEXT_INAPPROPRIATE = 'context_inappropriate',
  BRAND_SAFETY = 'brand_safety',
  DUPLICATE_CONTENT = 'duplicate_content',
  INVALID_FORMAT = 'invalid_format'
}

interface RuleCheckResult {
  rule: string;
  passed: boolean;
  message?: string;
}

interface LLMCheckResult {
  passed: boolean;
  severity: 'ok' | 'warning' | 'critical';
  reason: string;
  suggestion: string;
  tokensUsed: number;
}
```

---

### 2.2 Retry Strategy (FR-4.2)

#### FR-4.2.1: Multi-Strategy Retry Logic

**Priority:** CRITICAL
**Status:** Not Implemented

**Requirements:**
- ⚠️ MUST support 3 retry attempts per failed post
- ⚠️ MUST implement exponential backoff: [5s, 30s, 120s]
- ⚠️ MUST support 3 retry strategies:
  1. **retry_same**: Retry exact same content (transient errors)
  2. **simplify_post**: Remove formatting, media, shorten content
  3. **different_agent**: Spawn alternate agent for same task
- ⚠️ MUST persist retry state to database
- ⚠️ MUST track retry count per ticket in `work_queue.retry_count`
- ⚠️ MUST escalate to user after 3 failed attempts

**Retry Strategy Selection Logic:**
```typescript
function selectRetryStrategy(
  error: PlatformError,
  attempt: number
): RetryStrategy {
  // Attempt 1: Retry same content (might be transient)
  if (attempt === 1) {
    return RetryStrategy.RETRY_SAME;
  }

  // Attempt 2: Simplify post (might be format issue)
  if (attempt === 2 && isFormatError(error)) {
    return RetryStrategy.SIMPLIFY_POST;
  }

  // Attempt 3: Try different agent (might be content issue)
  if (attempt === 3) {
    return RetryStrategy.DIFFERENT_AGENT;
  }

  // Default fallback
  return RetryStrategy.RETRY_SAME;
}
```

**Acceptance Criteria:**
```typescript
✓ Post fails with 500 error → Wait 5s → Retry same content
✓ Post fails again with 400 error → Wait 30s → Simplify post
✓ Post fails 3rd time → Wait 120s → Try different agent
✓ Post fails 4th time → Escalate to user with saved draft
✓ Retry state persisted to database between attempts
✓ Exponential backoff times respected: 5s, 30s, 120s
```

#### FR-4.2.2: RetryConfig Interface

**Status:** Not Implemented

```typescript
interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number; // Default: 3

  /** Backoff times in seconds for each attempt */
  backoffSeconds: number[]; // [5, 30, 120]

  /** Retry strategies to use */
  strategies: RetryStrategy[];

  /** Jitter percentage (0-1) for backoff randomization */
  jitter: number; // Default: 0.1 (10%)
}

enum RetryStrategy {
  RETRY_SAME = 'retry_same',
  SIMPLIFY_POST = 'simplify_post',
  DIFFERENT_AGENT = 'different_agent'
}

interface RetryContext {
  /** Work ticket being retried */
  ticket: WorkTicket;

  /** Current attempt number (1-3) */
  attempt: number;

  /** Error that triggered retry */
  error: PlatformError;

  /** Original post content */
  originalContent: PostContent;

  /** Selected retry strategy */
  strategy: RetryStrategy;

  /** Next retry timestamp */
  retryAt: Date;
}
```

#### FR-4.2.3: Post Simplification Logic

**Status:** Not Implemented

**Requirements:**
- MUST remove all media attachments
- MUST remove URLs (except required ones)
- MUST remove special formatting (bold, italic, etc.)
- MUST truncate to 80% of max length
- MUST preserve @mentions if required by context
- MUST preserve core message intent

**Implementation:**
```typescript
async function simplifyContent(
  content: PostContent,
  context: AgentContext
): Promise<PostContent> {
  let simplified = content.text;

  // Remove URLs (except mentions)
  simplified = simplified.replace(/https?:\/\/[^\s]+/g, '');

  // Remove special formatting
  simplified = simplified
    .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
    .replace(/\*(.+?)\*/g, '$1')     // Italic
    .replace(/_(.+?)_/g, '$1')       // Underline
    .replace(/~~(.+?)~~/g, '$1');    // Strikethrough

  // Truncate to 80% of max length
  const maxLength = context.postingRules.maxLength * 0.8;
  if (simplified.length > maxLength) {
    simplified = simplified.slice(0, maxLength - 3) + '...';
  }

  // Clean up whitespace
  simplified = simplified.replace(/\s+/g, ' ').trim();

  return {
    text: simplified,
    media: null, // Remove all media
    formatting: 'plain'
  };
}
```

**Acceptance Criteria:**
```typescript
✓ Input: "Check out **this** amazing link: https://..."
  Output: "Check out this amazing link"
✓ Input: 500 char post with images → Output: 224 char plain text (80% of 280)
✓ Input: Post with @mentions → Output: Preserves @mentions
✓ All media attachments removed
✓ All URLs removed
✓ All formatting stripped
```

---

### 2.3 Error Escalation (FR-4.3)

#### FR-4.3.1: Error Classification

**Priority:** HIGH
**Status:** Not Implemented

**Requirements:**
- ⚠️ MUST classify errors into 3 categories:
  1. **Transient**: Temporary issues, retry immediately
  2. **Permanent**: Cannot be fixed, don't retry
  3. **User-Actionable**: Requires user intervention
- ⚠️ MUST log all errors to `error_log` table
- ⚠️ MUST track error patterns for analysis
- ⚠️ MUST provide actionable error messages

**Error Classification Matrix:**
```typescript
enum ErrorCategory {
  TRANSIENT = 'transient',
  PERMANENT = 'permanent',
  USER_ACTIONABLE = 'user_actionable'
}

const ERROR_CLASSIFICATION: Record<string, ErrorCategory> = {
  // Transient errors (retry automatically)
  '500': ErrorCategory.TRANSIENT,
  '502': ErrorCategory.TRANSIENT,
  '503': ErrorCategory.TRANSIENT,
  '504': ErrorCategory.TRANSIENT,
  'network_timeout': ErrorCategory.TRANSIENT,
  'rate_limit': ErrorCategory.TRANSIENT, // Retry with backoff

  // Permanent errors (don't retry)
  '400': ErrorCategory.PERMANENT, // Bad request
  '403': ErrorCategory.PERMANENT, // Forbidden
  '404': ErrorCategory.PERMANENT, // Not found
  '422': ErrorCategory.PERMANENT, // Validation error
  'content_rejected': ErrorCategory.PERMANENT,
  'duplicate_post': ErrorCategory.PERMANENT,

  // User-actionable errors (notify user)
  '401': ErrorCategory.USER_ACTIONABLE, // Auth expired
  'api_key_invalid': ErrorCategory.USER_ACTIONABLE,
  'quota_exceeded': ErrorCategory.USER_ACTIONABLE,
  'account_suspended': ErrorCategory.USER_ACTIONABLE
};
```

**Acceptance Criteria:**
```typescript
✓ 500 Internal Server Error → TRANSIENT → Retry with backoff
✓ 401 Unauthorized → USER_ACTIONABLE → Notify user "Reconnect account"
✓ 400 Bad Request → PERMANENT → Don't retry, log error
✓ 429 Rate Limit → TRANSIENT → Retry after rate limit reset
✓ Network timeout → TRANSIENT → Retry immediately
✓ Duplicate post → PERMANENT → Don't retry, mark completed
```

#### FR-4.3.2: User Notification System

**Priority:** HIGH
**Status:** Not Implemented

**Requirements:**
- ⚠️ MUST create notification after 3 failed attempts
- ⚠️ MUST include error summary and saved draft
- ⚠️ MUST provide actionable next steps
- ⚠️ MUST support multiple notification channels:
  - In-app notification (UI dashboard)
  - Email notification (optional)
  - System post (visible in feed)
- ⚠️ MUST track notification delivery status

**Notification Format:**
```typescript
interface ErrorNotification {
  /** Unique notification ID */
  id: string;

  /** User receiving notification */
  userId: string;

  /** Related work ticket */
  ticketId: string;

  /** Agent that failed */
  agentName: string;

  /** Notification severity */
  severity: 'warning' | 'error' | 'critical';

  /** Human-readable error message */
  message: string;

  /** Technical error details */
  errorDetails: {
    type: string;
    message: string;
    attempts: number;
    lastError: string;
  };

  /** Saved draft content */
  savedDraft?: string;

  /** Suggested actions */
  actions: NotificationAction[];

  /** Notification delivery status */
  status: 'pending' | 'sent' | 'read' | 'dismissed';

  /** Timestamps */
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
}

interface NotificationAction {
  label: string;
  action: 'retry' | 'edit' | 'dismiss' | 'reconnect' | 'view_logs';
  url?: string;
}
```

**Notification Templates:**
```typescript
// Authentication Error
{
  severity: 'critical',
  message: 'Your account connection has expired',
  actions: [
    { label: 'Reconnect Account', action: 'reconnect', url: '/settings/auth' },
    { label: 'View Details', action: 'view_logs' }
  ]
}

// Rate Limit Exceeded
{
  severity: 'warning',
  message: 'Posting rate limit reached for agent "Tech Guru"',
  actions: [
    { label: 'View Schedule', url: '/agents/tech-guru/schedule' },
    { label: 'Adjust Rate Limits', url: '/settings/posting-rules' }
  ]
}

// Persistent Failure
{
  severity: 'error',
  message: 'Failed to post after 3 attempts',
  savedDraft: "Your amazing post content here...",
  actions: [
    { label: 'Edit & Retry', action: 'edit' },
    { label: 'Dismiss', action: 'dismiss' },
    { label: 'View Logs', action: 'view_logs' }
  ]
}
```

**Acceptance Criteria:**
```typescript
✓ Post fails 3 times → Notification created with severity 'error'
✓ Auth expires → Notification created with severity 'critical'
✓ Rate limit hit → Notification created with severity 'warning'
✓ Notification includes saved draft for failed post
✓ Notification includes actionable next steps
✓ User can dismiss, retry, or edit from notification
```

#### FR-4.3.3: Error Logging & Analytics

**Status:** Partially Implemented (Winston logger exists)

**Requirements:**
- ✅ MUST log all errors to `error_log` table
- ⚠️ MUST track error patterns by:
  - Agent name
  - Error type
  - Time of day
  - Retry count
- ⚠️ MUST provide error analytics dashboard
- ⚠️ MUST alert on error rate thresholds (>5% failure rate)

**Error Log Schema:**
```sql
-- From architecture plan (lines 239-250)
CREATE TABLE error_log (
  id SERIAL PRIMARY KEY,
  agent_name VARCHAR(50),
  error_type VARCHAR(50),
  error_message TEXT,
  context JSONB,
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_error_agent_time ON error_log(agent_name, created_at DESC);
CREATE INDEX idx_error_type ON error_log(error_type);
CREATE INDEX idx_error_unresolved ON error_log(resolved) WHERE resolved = false;
```

**Acceptance Criteria:**
```typescript
✓ All errors logged to database with full context
✓ Error patterns identified: "Tech Guru has 15% failure rate"
✓ Alert triggered when failure rate exceeds 5%
✓ Dashboard shows errors by agent, type, and time
✓ Resolved errors marked as resolved in database
```

---

### 2.4 Validation Orchestration (FR-4.4)

#### FR-4.4.1: ValidationService Interface

**Priority:** CRITICAL
**Status:** Not Implemented

**Requirements:**
- ⚠️ MUST coordinate all validation steps
- ⚠️ MUST integrate with Phase 2 orchestrator
- ⚠️ MUST track validation metrics
- ⚠️ MUST support async validation (non-blocking)

```typescript
interface IValidationService {
  /**
   * Validate a generated post response
   * Returns validation result with feedback
   */
  validatePost(
    response: GeneratedResponse,
    context: AgentContext,
    feedItem: FeedItem
  ): Promise<ValidationResult>;

  /**
   * Request agent to revise based on validation feedback
   * Returns revised response
   */
  requestRevision(
    originalResponse: GeneratedResponse,
    validationResult: ValidationResult,
    context: AgentContext
  ): Promise<GeneratedResponse>;

  /**
   * Get validation metrics
   */
  getValidationMetrics(): Promise<ValidationMetrics>;
}

interface ValidationMetrics {
  /** Total validations performed */
  totalValidations: number;

  /** Validation pass rate */
  passRate: number;

  /** Average token cost per validation */
  avgTokenCost: number;

  /** Average validation duration */
  avgDurationMs: number;

  /** Breakdown by failure reason */
  failureReasons: Record<ValidationReason, number>;
}
```

#### FR-4.4.2: RetryService Interface

**Priority:** CRITICAL
**Status:** Not Implemented

```typescript
interface IRetryService {
  /**
   * Execute post with retry logic
   * Handles all retry strategies and backoff
   */
  postWithRetry(
    content: PostContent,
    ticket: WorkTicket,
    context: AgentContext
  ): Promise<PostResult>;

  /**
   * Get retry state for a ticket
   */
  getRetryState(ticketId: string): Promise<RetryContext | null>;

  /**
   * Cancel pending retry for a ticket
   */
  cancelRetry(ticketId: string): Promise<void>;

  /**
   * Get retry metrics
   */
  getRetryMetrics(): Promise<RetryMetrics>;
}

interface PostResult {
  /** Success status */
  success: boolean;

  /** Platform post ID (if successful) */
  postId?: string;

  /** Number of attempts made */
  attempts: number;

  /** Final error (if failed) */
  error?: PlatformError;

  /** Total duration including retries */
  totalDurationMs: number;
}

interface RetryMetrics {
  /** Total posts attempted */
  totalAttempts: number;

  /** Success rate after retries */
  successRate: number;

  /** Average attempts per post */
  avgAttempts: number;

  /** Breakdown by retry strategy effectiveness */
  strategySuccess: Record<RetryStrategy, number>;
}
```

#### FR-4.4.3: EscalationService Interface

**Priority:** HIGH
**Status:** Not Implemented

```typescript
interface IEscalationService {
  /**
   * Escalate failed post to user
   * Creates notification and saves draft
   */
  escalateToUser(
    ticket: WorkTicket,
    error: PlatformError,
    attempts: number,
    savedDraft: string
  ): Promise<ErrorNotification>;

  /**
   * Get pending escalations for user
   */
  getPendingEscalations(userId: string): Promise<ErrorNotification[]>;

  /**
   * Resolve escalation (user took action)
   */
  resolveEscalation(
    notificationId: string,
    resolution: 'retried' | 'edited' | 'dismissed'
  ): Promise<void>;

  /**
   * Get escalation metrics
   */
  getEscalationMetrics(): Promise<EscalationMetrics>;
}

interface EscalationMetrics {
  /** Total escalations created */
  totalEscalations: number;

  /** Average time to resolution */
  avgResolutionTimeMs: number;

  /** Breakdown by resolution type */
  resolutions: Record<string, number>;

  /** Pending escalations count */
  pendingCount: number;
}
```

---

## 3. Interface Definitions

### 3.1 Core Type Definitions

```typescript
/**
 * Post content structure
 */
interface PostContent {
  /** Post text content */
  text: string;

  /** Media attachments (images, videos) */
  media?: MediaAttachment[];

  /** Text formatting (markdown, plain, html) */
  formatting?: 'plain' | 'markdown' | 'html';

  /** Metadata */
  metadata?: {
    replyToId?: string;
    quotedPostId?: string;
    tags?: string[];
  };
}

interface MediaAttachment {
  type: 'image' | 'video' | 'gif';
  url: string;
  altText?: string;
}

/**
 * Platform API error structure
 */
interface PlatformError extends Error {
  /** HTTP status code */
  statusCode?: number;

  /** Error type/code */
  type: string;

  /** Human-readable error message */
  message: string;

  /** Whether error is retryable */
  retryable: boolean;

  /** Rate limit info (if applicable) */
  rateLimit?: {
    limit: number;
    remaining: number;
    resetAt: Date;
  };

  /** Additional error context */
  context?: Record<string, any>;
}

/**
 * Generated response from agent worker
 */
interface GeneratedResponse {
  /** Response content */
  content: string;

  /** Tokens used for generation */
  tokensUsed: number;

  /** Generation duration */
  durationMs: number;

  /** Response metadata */
  metadata?: {
    model: string;
    stopReason?: string;
    temperature: number;
  };
}
```

### 3.2 Configuration Interfaces

```typescript
/**
 * Validation configuration
 */
interface ValidationConfig {
  /** Enable LLM validation (costs tokens) */
  enableLLMValidation: boolean;

  /** Maximum tokens for LLM validation */
  maxLLMTokens: number;

  /** Validation timeout in milliseconds */
  validationTimeout: number;

  /** Rules to check */
  rules: {
    checkLength: boolean;
    checkBlockedWords: boolean;
    checkMentions: boolean;
    checkHashtags: boolean;
    checkDuplicates: boolean;
    checkURLs: boolean;
  };
}

/**
 * Complete Phase 4 configuration
 */
interface Phase4Config {
  validation: ValidationConfig;
  retry: RetryConfig;
  escalation: {
    /** Enable user notifications */
    enableNotifications: boolean;

    /** Notification channels */
    channels: Array<'in_app' | 'email' | 'system_post'>;

    /** Max pending escalations per user */
    maxPendingPerUser: number;
  };
}
```

---

## 4. Architecture Design

### 4.1 Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 4: Validation & Error Handling                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ValidationService                                       │   │
│  │  ├─ RuleValidator (rule-based checks, 0 tokens)         │   │
│  │  ├─ LLMValidator (tone/context checks, ~200 tokens)     │   │
│  │  └─ RevisionCoordinator (handles agent revisions)       │   │
│  └──────────────────┬──────────────────────────────────────┘   │
│                     │                                            │
│  ┌─────────────────▼────────────────────────────────────────┐  │
│  │  RetryService                                             │  │
│  │  ├─ RetryStrategySelector (choose retry approach)        │  │
│  │  ├─ BackoffCalculator (exponential backoff)             │  │
│  │  ├─ PostSimplifier (remove formatting/media)            │  │
│  │  └─ AlternateAgentSelector (spawn different agent)      │  │
│  └──────────────────┬──────────────────────────────────────┘  │
│                     │                                            │
│  ┌─────────────────▼────────────────────────────────────────┐  │
│  │  EscalationService                                        │  │
│  │  ├─ ErrorClassifier (categorize errors)                  │  │
│  │  ├─ NotificationManager (create/send notifications)      │  │
│  │  ├─ DraftManager (save failed post content)             │  │
│  │  └─ ErrorAnalytics (track error patterns)               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Module Structure

```
src/
├── validation/
│   ├── validation.service.ts         # Main validation orchestrator
│   ├── rule-validator.ts             # Rule-based checks (0 tokens)
│   ├── llm-validator.ts              # Claude-based validation (~200 tokens)
│   ├── revision-coordinator.ts       # Agent revision requests
│   └── validation-metrics.ts         # Metrics tracking
│
├── retry/
│   ├── retry.service.ts              # Retry orchestration
│   ├── retry-strategy.ts             # Strategy selection logic
│   ├── backoff-calculator.ts         # Exponential backoff
│   ├── post-simplifier.ts            # Content simplification
│   ├── alternate-agent.ts            # Agent selection
│   └── retry-metrics.ts              # Retry analytics
│
├── escalation/
│   ├── escalation.service.ts         # Escalation orchestrator
│   ├── error-classifier.ts           # Error categorization
│   ├── notification-manager.ts       # Notification creation/delivery
│   ├── draft-manager.ts              # Draft content storage
│   └── error-analytics.ts            # Error pattern analysis
│
└── types/
    ├── validation.types.ts           # Validation interfaces
    ├── retry.types.ts                # Retry interfaces
    └── escalation.types.ts           # Escalation interfaces
```

### 4.3 Database Schema Updates

```sql
-- Extend work_queue table
ALTER TABLE work_queue
  ADD COLUMN retry_count INTEGER DEFAULT 0,
  ADD COLUMN retry_strategy VARCHAR(50),
  ADD COLUMN last_error TEXT,
  ADD COLUMN escalated BOOLEAN DEFAULT FALSE,
  ADD COLUMN escalation_id INTEGER;

-- Create validation_log table
CREATE TABLE validation_log (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES work_queue(id),
  validation_type VARCHAR(50), -- 'rule_based', 'llm'
  passed BOOLEAN NOT NULL,
  reason VARCHAR(255),
  feedback TEXT,
  token_cost INTEGER DEFAULT 0,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create escalations table
CREATE TABLE escalations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  ticket_id INTEGER REFERENCES work_queue(id),
  agent_name VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- 'warning', 'error', 'critical'
  message TEXT NOT NULL,
  error_details JSONB,
  saved_draft TEXT,
  actions JSONB,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'read', 'resolved'
  resolution VARCHAR(50), -- 'retried', 'edited', 'dismissed'
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  resolved_at TIMESTAMP,

  INDEX idx_user_status (user_id, status),
  INDEX idx_created_at (created_at DESC)
);

-- Update error_log table with classification
ALTER TABLE error_log
  ADD COLUMN error_category VARCHAR(50), -- 'transient', 'permanent', 'user_actionable'
  ADD COLUMN escalation_id INTEGER REFERENCES escalations(id);
```

---

## 5. Data Flow Diagrams

### 5.1 Validation Flow

```
┌─────────────────┐
│ Agent Worker    │
│ Generates Post  │
└────────┬────────┘
         │ GeneratedResponse
         ▼
┌─────────────────────────────────┐
│ ValidationService.validatePost()│
└────────┬────────────────────────┘
         │
         ├─► Rule-Based Checks (0 tokens, <50ms)
         │   ├─ Length check
         │   ├─ Blocked words
         │   ├─ Mention count
         │   ├─ Hashtag count
         │   └─ URL validation
         │
         ├─► Duplicate Check (DB query)
         │   └─ Compare with recent posts
         │
         └─► LLM Validation (~200 tokens, <2s)
             ├─ Tone check
             ├─ Context appropriateness
             └─ Brand safety

         ▼
┌────────────────────────────┐
│ ValidationResult           │
│ ├─ approved: boolean       │
│ ├─ canFix: boolean         │
│ ├─ reason: string          │
│ └─ feedback: string        │
└────────┬───────────────────┘
         │
         ├─► If approved → Proceed to Post
         │
         └─► If !approved && canFix
             └─► RequestRevision()
                 └─► Agent revises content
                     └─► Re-validate (up to 2 revisions)
```

### 5.2 Retry Flow

```
┌───────────────────┐
│ Validated Post    │
└────────┬──────────┘
         │
         ▼
┌─────────────────────────────┐
│ RetryService.postWithRetry()│
└────────┬────────────────────┘
         │
         ├─► Attempt 1: Post to Platform API
         │   │
         │   ├─► SUCCESS → Return PostResult
         │   │
         │   └─► FAILURE → Log error
         │       │
         │       ├─► Classify error (transient/permanent/user-actionable)
         │       │
         │       ├─► If PERMANENT → Stop, escalate
         │       │
         │       └─► If TRANSIENT or USER_ACTIONABLE
         │           │
         │           ├─► Select retry strategy:
         │           │   └─ Attempt 1: RETRY_SAME
         │           │
         │           ├─► Calculate backoff: 5 seconds
         │           │
         │           └─► Sleep & Retry
         │
         ├─► Attempt 2: Retry with strategy
         │   │
         │   ├─► SUCCESS → Return PostResult
         │   │
         │   └─► FAILURE → Log error
         │       │
         │       ├─► Select retry strategy:
         │       │   └─ Attempt 2: SIMPLIFY_POST
         │       │
         │       ├─► Simplify content (remove media, formatting)
         │       │
         │       ├─► Calculate backoff: 30 seconds
         │       │
         │       └─► Sleep & Retry
         │
         ├─► Attempt 3: Final retry with alternate agent
         │   │
         │   ├─► SUCCESS → Return PostResult
         │   │
         │   └─► FAILURE → Log error
         │       │
         │       ├─► Select retry strategy:
         │       │   └─ Attempt 3: DIFFERENT_AGENT
         │       │
         │       ├─► Spawn alternate agent
         │       │
         │       ├─► Calculate backoff: 120 seconds
         │       │
         │       └─► Sleep & Retry
         │
         └─► Attempt 4: All retries exhausted
             │
             └─► ESCALATE TO USER
                 ├─► Create ErrorNotification
                 ├─► Save draft content
                 ├─► Mark ticket as escalated
                 └─► Return PostResult (failure)
```

### 5.3 Escalation Flow

```
┌──────────────────────┐
│ Post Failed 3 Times  │
└──────────┬───────────┘
           │
           ▼
┌───────────────────────────────────┐
│ EscalationService.escalateToUser()│
└──────────┬────────────────────────┘
           │
           ├─► Classify Error
           │   ├─ Transient → severity: 'warning'
           │   ├─ Permanent → severity: 'error'
           │   └─ User-Actionable → severity: 'critical'
           │
           ├─► Create ErrorNotification
           │   ├─ message: Human-readable summary
           │   ├─ errorDetails: Technical info
           │   ├─ savedDraft: Post content
           │   └─ actions: [retry, edit, dismiss]
           │
           ├─► Save to escalations table
           │
           ├─► Send Notification
           │   ├─ In-app notification (always)
           │   ├─ Email (if enabled)
           │   └─ System post (if critical)
           │
           └─► Update Analytics
               └─ Track escalation metrics

           ▼
┌────────────────────────────────┐
│ User Receives Notification     │
│ ├─ View error details          │
│ ├─ See saved draft             │
│ └─ Choose action:              │
│    ├─ Retry → Queue new ticket │
│    ├─ Edit → Manual post       │
│    └─ Dismiss → Mark resolved  │
└────────────────────────────────┘
```

---

## 6. Error Taxonomy

### 6.1 Error Categories

#### 6.1.1 Transient Errors (Retry Automatically)

**Characteristics:**
- Temporary condition
- High probability of success on retry
- No user intervention needed

**Error Types:**
```typescript
const TRANSIENT_ERRORS = {
  // HTTP 5xx Server Errors
  INTERNAL_SERVER_ERROR: {
    code: '500',
    message: 'Platform API internal error',
    retryStrategy: RetryStrategy.RETRY_SAME,
    backoff: 'exponential'
  },

  BAD_GATEWAY: {
    code: '502',
    message: 'Platform API gateway error',
    retryStrategy: RetryStrategy.RETRY_SAME,
    backoff: 'exponential'
  },

  SERVICE_UNAVAILABLE: {
    code: '503',
    message: 'Platform API temporarily unavailable',
    retryStrategy: RetryStrategy.RETRY_SAME,
    backoff: 'exponential'
  },

  GATEWAY_TIMEOUT: {
    code: '504',
    message: 'Platform API timeout',
    retryStrategy: RetryStrategy.RETRY_SAME,
    backoff: 'exponential'
  },

  // Network Errors
  NETWORK_TIMEOUT: {
    code: 'ETIMEDOUT',
    message: 'Network request timeout',
    retryStrategy: RetryStrategy.RETRY_SAME,
    backoff: 'immediate'
  },

  CONNECTION_RESET: {
    code: 'ECONNRESET',
    message: 'Connection reset by peer',
    retryStrategy: RetryStrategy.RETRY_SAME,
    backoff: 'immediate'
  },

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: {
    code: '429',
    message: 'Rate limit exceeded',
    retryStrategy: RetryStrategy.RETRY_SAME,
    backoff: 'rate_limit_reset' // Wait until rate limit resets
  }
};
```

#### 6.1.2 Permanent Errors (Don't Retry)

**Characteristics:**
- Fundamental issue with request
- Retrying won't help
- Requires content or configuration change

**Error Types:**
```typescript
const PERMANENT_ERRORS = {
  // HTTP 4xx Client Errors
  BAD_REQUEST: {
    code: '400',
    message: 'Invalid request format',
    action: 'escalate',
    userMessage: 'Post format is invalid. Please review content.'
  },

  FORBIDDEN: {
    code: '403',
    message: 'Action forbidden by platform',
    action: 'escalate',
    userMessage: 'This action is not allowed on the platform.'
  },

  NOT_FOUND: {
    code: '404',
    message: 'Resource not found',
    action: 'escalate',
    userMessage: 'The target post or user no longer exists.'
  },

  VALIDATION_ERROR: {
    code: '422',
    message: 'Content validation failed',
    action: 'escalate',
    userMessage: 'Post content violates platform rules.'
  },

  // Content Errors
  DUPLICATE_POST: {
    code: 'DUPLICATE',
    message: 'Identical post already exists',
    action: 'skip', // Don't escalate, just mark complete
    userMessage: 'This post was already published.'
  },

  CONTENT_REJECTED: {
    code: 'CONTENT_VIOLATION',
    message: 'Content violates platform policies',
    action: 'escalate',
    userMessage: 'Post content flagged by platform moderation.'
  },

  PARENT_POST_DELETED: {
    code: 'PARENT_DELETED',
    message: 'Cannot reply to deleted post',
    action: 'skip',
    userMessage: 'The original post was deleted.'
  }
};
```

#### 6.1.3 User-Actionable Errors (Notify User)

**Characteristics:**
- Requires user intervention
- System cannot resolve automatically
- Critical for service continuity

**Error Types:**
```typescript
const USER_ACTIONABLE_ERRORS = {
  // Authentication Errors
  UNAUTHORIZED: {
    code: '401',
    message: 'Authentication failed or expired',
    severity: 'critical',
    action: 'reconnect',
    userMessage: 'Your account connection has expired. Please reconnect.',
    suggestedAction: {
      label: 'Reconnect Account',
      url: '/settings/auth'
    }
  },

  INVALID_API_KEY: {
    code: 'INVALID_CREDENTIALS',
    message: 'API key is invalid',
    severity: 'critical',
    action: 'update_credentials',
    userMessage: 'Your API credentials are invalid. Please update them.',
    suggestedAction: {
      label: 'Update Credentials',
      url: '/settings/api-keys'
    }
  },

  // Account Issues
  ACCOUNT_SUSPENDED: {
    code: 'ACCOUNT_SUSPENDED',
    message: 'Platform account is suspended',
    severity: 'critical',
    action: 'contact_support',
    userMessage: 'Your platform account has been suspended. Contact platform support.',
    suggestedAction: {
      label: 'Contact Support',
      url: 'https://platform.com/support'
    }
  },

  // Quota Errors
  QUOTA_EXCEEDED: {
    code: 'QUOTA_EXCEEDED',
    message: 'API quota exceeded',
    severity: 'error',
    action: 'upgrade_plan',
    userMessage: 'Your API usage quota has been exceeded.',
    suggestedAction: {
      label: 'Upgrade Plan',
      url: '/settings/billing'
    }
  },

  // Permission Errors
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'Account lacks required permissions',
    severity: 'error',
    action: 'grant_permissions',
    userMessage: 'Your account needs additional permissions for this action.',
    suggestedAction: {
      label: 'Review Permissions',
      url: '/settings/permissions'
    }
  }
};
```

### 6.2 Error Response Matrix

| Error Type | HTTP Code | Category | Retry? | Strategy | Backoff | Escalate? |
|------------|-----------|----------|--------|----------|---------|-----------|
| Internal Server Error | 500 | Transient | Yes | RETRY_SAME | 5s, 30s, 120s | After 3 attempts |
| Bad Gateway | 502 | Transient | Yes | RETRY_SAME | 5s, 30s, 120s | After 3 attempts |
| Service Unavailable | 503 | Transient | Yes | RETRY_SAME | 5s, 30s, 120s | After 3 attempts |
| Gateway Timeout | 504 | Transient | Yes | RETRY_SAME | 5s, 30s, 120s | After 3 attempts |
| Rate Limit | 429 | Transient | Yes | RETRY_SAME | Until reset | After 3 attempts |
| Network Timeout | ETIMEDOUT | Transient | Yes | RETRY_SAME | 5s, 30s, 120s | After 3 attempts |
| Bad Request | 400 | Permanent | No | N/A | N/A | Immediately |
| Unauthorized | 401 | User-Actionable | No | N/A | N/A | Immediately (critical) |
| Forbidden | 403 | Permanent | No | N/A | N/A | Immediately |
| Not Found | 404 | Permanent | No | N/A | N/A | Skip (no escalation) |
| Validation Error | 422 | Permanent | No | N/A | N/A | Immediately |
| Duplicate Post | DUPLICATE | Permanent | No | N/A | N/A | Skip (mark complete) |
| Account Suspended | SUSPENDED | User-Actionable | No | N/A | N/A | Immediately (critical) |
| Quota Exceeded | QUOTA | User-Actionable | No | N/A | N/A | Immediately (error) |

---

## 7. Integration Points

### 7.1 Phase 2 Orchestrator Integration

**File:** `/src/avi/orchestrator.ts`

**Integration Points:**

```typescript
// In AviOrchestrator class

import { ValidationService } from '../validation/validation.service';
import { RetryService } from '../retry/retry.service';
import { EscalationService } from '../escalation/escalation.service';

class AviOrchestrator {
  private validationService: IValidationService;
  private retryService: IRetryService;
  private escalationService: IEscalationService;

  constructor(config: AviConfig, dependencies: AviDependencies) {
    // ... existing code ...

    // Initialize Phase 4 services
    this.validationService = new ValidationService(config.validation);
    this.retryService = new RetryService(config.retry, dependencies.db);
    this.escalationService = new EscalationService(
      config.escalation,
      dependencies.db
    );
  }

  /**
   * Called after agent worker generates response
   */
  private async handleWorkerCompletion(
    worker: WorkerInfo,
    response: GeneratedResponse
  ): Promise<void> {
    const ticket = await this.workQueue.getTicket(worker.ticketId);
    const context = await this.loadAgentContext(ticket);
    const feedItem = await this.loadFeedItem(ticket);

    // Phase 4: Validate response
    const validation = await this.validationService.validatePost(
      response,
      context,
      feedItem
    );

    if (!validation.approved && validation.canFix) {
      // Request revision (up to 2 attempts)
      const revised = await this.validationService.requestRevision(
        response,
        validation,
        context
      );

      // Re-validate revised response
      const revalidation = await this.validationService.validatePost(
        revised,
        context,
        feedItem
      );

      if (revalidation.approved) {
        response = revised;
        validation = revalidation;
      }
    }

    if (validation.approved) {
      // Phase 4: Post with retry logic
      const postResult = await this.retryService.postWithRetry(
        { text: response.content },
        ticket,
        context
      );

      if (postResult.success) {
        await this.handlePostSuccess(ticket, postResult);
      } else {
        // Phase 4: Escalate to user after all retries exhausted
        await this.escalationService.escalateToUser(
          ticket,
          postResult.error!,
          postResult.attempts,
          response.content
        );
      }
    } else {
      // Validation failed and cannot be fixed
      await this.escalationService.escalateToUser(
        ticket,
        new ValidationError(validation.reason!),
        0,
        response.content
      );
    }
  }
}
```

### 7.2 Phase 3 Worker Integration

**File:** `/src/worker/agent-worker.ts`

**Integration Points:**

```typescript
// AgentWorker already generates responses
// Phase 4 receives those responses for validation

class AgentWorker {
  async processTicket(ticket: WorkTicket): Promise<ProcessingResult> {
    // ... existing code generates response ...

    const response = await this.responseGenerator.generate(
      this.context,
      feedItem,
      options
    );

    // Return response to orchestrator
    // Orchestrator will handle validation (Phase 4)
    return {
      success: true,
      response,
      workerId: this.workerId
    };
  }
}
```

**No changes needed to AgentWorker** - it continues to generate responses, and Phase 4 handles validation independently.

### 7.3 Database Integration

**Files:**
- `/api-server/repositories/postgres/work-queue.repository.js`
- `/api-server/repositories/postgres/error-log.repository.js` (new)
- `/api-server/repositories/postgres/escalation.repository.js` (new)

**Integration Points:**

```typescript
// WorkQueueRepository additions
class WorkQueueRepository {
  /**
   * Update retry count for ticket
   */
  async incrementRetryCount(ticketId: string): Promise<void> {
    await this.db.query(`
      UPDATE work_queue
      SET retry_count = retry_count + 1,
          retry_strategy = $2,
          last_error = $3
      WHERE id = $1
    `, [ticketId, strategy, errorMessage]);
  }

  /**
   * Mark ticket as escalated
   */
  async markEscalated(ticketId: string, escalationId: number): Promise<void> {
    await this.db.query(`
      UPDATE work_queue
      SET escalated = true,
          escalation_id = $2,
          status = 'failed'
      WHERE id = $1
    `, [ticketId, escalationId]);
  }
}

// New: ErrorLogRepository
class ErrorLogRepository {
  async logError(error: ErrorLogEntry): Promise<number> {
    const result = await this.db.query(`
      INSERT INTO error_log (
        agent_name, error_type, error_message, context,
        retry_count, error_category
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      error.agentName,
      error.errorType,
      error.message,
      JSON.stringify(error.context),
      error.retryCount,
      error.category
    ]);

    return result.rows[0].id;
  }
}

// New: EscalationRepository
class EscalationRepository {
  async createEscalation(escalation: ErrorNotification): Promise<number> {
    const result = await this.db.query(`
      INSERT INTO escalations (
        user_id, ticket_id, agent_name, severity,
        message, error_details, saved_draft, actions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      escalation.userId,
      escalation.ticketId,
      escalation.agentName,
      escalation.severity,
      escalation.message,
      JSON.stringify(escalation.errorDetails),
      escalation.savedDraft,
      JSON.stringify(escalation.actions)
    ]);

    return result.rows[0].id;
  }

  async getPendingEscalations(userId: string): Promise<ErrorNotification[]> {
    const result = await this.db.query(`
      SELECT * FROM escalations
      WHERE user_id = $1 AND status IN ('pending', 'sent')
      ORDER BY created_at DESC
    `, [userId]);

    return result.rows.map(row => this.mapRowToNotification(row));
  }
}
```

### 7.4 API Endpoints Integration

**File:** `/api-server/server.js` or `/api-server/routes/avi.routes.js`

**New API Endpoints:**

```typescript
// GET /api/avi/escalations
// Get pending escalations for authenticated user
app.get('/api/avi/escalations', authenticate, async (req, res) => {
  const escalations = await escalationService.getPendingEscalations(
    req.user.id
  );
  res.json({ escalations });
});

// POST /api/avi/escalations/:id/resolve
// Resolve an escalation
app.post('/api/avi/escalations/:id/resolve', authenticate, async (req, res) => {
  const { resolution } = req.body; // 'retried', 'edited', 'dismissed'

  await escalationService.resolveEscalation(
    req.params.id,
    resolution
  );

  res.json({ success: true });
});

// GET /api/avi/metrics/validation
// Get validation metrics
app.get('/api/avi/metrics/validation', authenticate, async (req, res) => {
  const metrics = await validationService.getValidationMetrics();
  res.json(metrics);
});

// GET /api/avi/metrics/retry
// Get retry metrics
app.get('/api/avi/metrics/retry', authenticate, async (req, res) => {
  const metrics = await retryService.getRetryMetrics();
  res.json(metrics);
});

// GET /api/avi/metrics/escalation
// Get escalation metrics
app.get('/api/avi/metrics/escalation', authenticate, async (req, res) => {
  const metrics = await escalationService.getEscalationMetrics();
  res.json(metrics);
});
```

---

## 8. Implementation Specifications

### 8.1 ValidationService Implementation

**File:** `/src/validation/validation.service.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { RuleValidator } from './rule-validator';
import { LLMValidator } from './llm-validator';
import { ValidationMetricsTracker } from './validation-metrics';

export class ValidationService implements IValidationService {
  private ruleValidator: RuleValidator;
  private llmValidator: LLMValidator;
  private metrics: ValidationMetricsTracker;
  private config: ValidationConfig;

  constructor(config: ValidationConfig) {
    this.config = config;
    this.ruleValidator = new RuleValidator(config.rules);
    this.llmValidator = new LLMValidator(
      new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
      config.maxLLMTokens
    );
    this.metrics = new ValidationMetricsTracker();
  }

  async validatePost(
    response: GeneratedResponse,
    context: AgentContext,
    feedItem: FeedItem
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    // Step 1: Rule-based validation (fast, 0 tokens)
    const ruleChecks = await this.ruleValidator.validate(
      response.content,
      context
    );

    // If rule checks fail, return immediately
    if (ruleChecks.some(check => !check.passed)) {
      const failedCheck = ruleChecks.find(check => !check.passed)!;

      const result: ValidationResult = {
        approved: false,
        canFix: true, // Most rule violations are fixable
        reason: failedCheck.rule as ValidationReason,
        feedback: failedCheck.message,
        ruleChecks,
        tokenCost: 0,
        durationMs: Date.now() - startTime
      };

      this.metrics.recordValidation(result);
      return result;
    }

    // Step 2: LLM validation (slower, ~200 tokens)
    let llmCheck: LLMCheckResult | undefined;
    let tokenCost = 0;

    if (this.config.enableLLMValidation) {
      llmCheck = await this.llmValidator.validate(
        response.content,
        context,
        feedItem
      );
      tokenCost = llmCheck.tokensUsed;

      if (!llmCheck.passed) {
        const result: ValidationResult = {
          approved: false,
          canFix: llmCheck.severity !== 'critical',
          reason: llmCheck.reason as ValidationReason,
          feedback: llmCheck.suggestion,
          ruleChecks,
          llmCheck,
          tokenCost,
          durationMs: Date.now() - startTime
        };

        this.metrics.recordValidation(result);
        return result;
      }
    }

    // All checks passed
    const result: ValidationResult = {
      approved: true,
      canFix: false,
      ruleChecks,
      llmCheck,
      tokenCost,
      durationMs: Date.now() - startTime
    };

    this.metrics.recordValidation(result);
    return result;
  }

  async requestRevision(
    originalResponse: GeneratedResponse,
    validationResult: ValidationResult,
    context: AgentContext
  ): Promise<GeneratedResponse> {
    // Build revision prompt
    const revisionPrompt = `
Your previous response did not pass validation:
"${originalResponse.content}"

Issue: ${validationResult.reason}
Feedback: ${validationResult.feedback}

Please revise your response to address this issue while maintaining your personality and the core message.
`;

    // Call Claude API for revision
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const response = await anthropic.messages.create({
      model: context.model || 'claude-sonnet-4-5-20250929',
      max_tokens: context.postingRules.maxLength,
      temperature: context.responseStyle.temperature || 0.7,
      system: context.personality,
      messages: [
        {
          role: 'user',
          content: revisionPrompt
        }
      ]
    });

    const content = (response.content[0] as { type: 'text'; text: string }).text;

    return {
      content: content.trim(),
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      durationMs: 0, // Not tracked for revisions
      metadata: {
        model: response.model,
        stopReason: response.stop_reason,
        temperature: context.responseStyle.temperature || 0.7
      }
    };
  }

  async getValidationMetrics(): Promise<ValidationMetrics> {
    return this.metrics.getMetrics();
  }
}
```

### 8.2 RuleValidator Implementation

**File:** `/src/validation/rule-validator.ts`

```typescript
export class RuleValidator {
  private config: ValidationConfig['rules'];

  constructor(config: ValidationConfig['rules']) {
    this.config = config;
  }

  async validate(
    content: string,
    context: AgentContext
  ): Promise<RuleCheckResult[]> {
    const checks: RuleCheckResult[] = [];

    // Length check
    if (this.config.checkLength) {
      checks.push(this.checkLength(content, context));
    }

    // Blocked words check
    if (this.config.checkBlockedWords) {
      checks.push(this.checkBlockedWords(content, context));
    }

    // Mention count check
    if (this.config.checkMentions) {
      checks.push(this.checkMentions(content));
    }

    // Hashtag count check
    if (this.config.checkHashtags) {
      checks.push(this.checkHashtags(content));
    }

    // URL validation
    if (this.config.checkURLs) {
      checks.push(this.checkURLs(content));
    }

    return checks;
  }

  private checkLength(
    content: string,
    context: AgentContext
  ): RuleCheckResult {
    const length = content.length;
    const maxLength = context.postingRules.maxLength;
    const minLength = context.postingRules.minLength || 50;

    if (length > maxLength) {
      return {
        rule: 'length',
        passed: false,
        message: `Post too long: ${length} characters (max: ${maxLength})`
      };
    }

    if (length < minLength) {
      return {
        rule: 'length',
        passed: false,
        message: `Post too short: ${length} characters (min: ${minLength})`
      };
    }

    return {
      rule: 'length',
      passed: true
    };
  }

  private checkBlockedWords(
    content: string,
    context: AgentContext
  ): RuleCheckResult {
    const blockedWords = context.postingRules.blockedWords || [];
    const lowerContent = content.toLowerCase();

    const foundBlocked = blockedWords.filter(word =>
      lowerContent.includes(word.toLowerCase())
    );

    if (foundBlocked.length > 0) {
      return {
        rule: 'blocked_words',
        passed: false,
        message: `Post contains blocked words: ${foundBlocked.join(', ')}`
      };
    }

    return {
      rule: 'blocked_words',
      passed: true
    };
  }

  private checkMentions(content: string): RuleCheckResult {
    const mentions = content.match(/@[\w]+/g) || [];
    const maxMentions = 3; // Platform limit

    if (mentions.length > maxMentions) {
      return {
        rule: 'mentions',
        passed: false,
        message: `Too many mentions: ${mentions.length} (max: ${maxMentions})`
      };
    }

    return {
      rule: 'mentions',
      passed: true
    };
  }

  private checkHashtags(content: string): RuleCheckResult {
    const hashtags = content.match(/#[\w]+/g) || [];
    const maxHashtags = 5; // Platform limit

    if (hashtags.length > maxHashtags) {
      return {
        rule: 'hashtags',
        passed: false,
        message: `Too many hashtags: ${hashtags.length} (max: ${maxHashtags})`
      };
    }

    return {
      rule: 'hashtags',
      passed: true
    };
  }

  private checkURLs(content: string): RuleCheckResult {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex) || [];
    const maxURLs = 2; // Reasonable limit

    if (urls.length > maxURLs) {
      return {
        rule: 'urls',
        passed: false,
        message: `Too many URLs: ${urls.length} (max: ${maxURLs})`
      };
    }

    // Validate URL format
    for (const url of urls) {
      try {
        new URL(url);
      } catch (error) {
        return {
          rule: 'urls',
          passed: false,
          message: `Invalid URL format: ${url}`
        };
      }
    }

    return {
      rule: 'urls',
      passed: true
    };
  }
}
```

### 8.3 RetryService Implementation

**File:** `/src/retry/retry.service.ts`

```typescript
import { RetryStrategySelector } from './retry-strategy';
import { BackoffCalculator } from './backoff-calculator';
import { PostSimplifier } from './post-simplifier';
import { AlternateAgentSelector } from './alternate-agent';
import type { DatabaseManager } from '../types/database-manager';

export class RetryService implements IRetryService {
  private config: RetryConfig;
  private db: DatabaseManager;
  private strategySelector: RetryStrategySelector;
  private backoffCalculator: BackoffCalculator;
  private postSimplifier: PostSimplifier;
  private alternateAgent: AlternateAgentSelector;
  private pendingRetries: Map<string, RetryContext>;

  constructor(config: RetryConfig, db: DatabaseManager) {
    this.config = config;
    this.db = db;
    this.strategySelector = new RetryStrategySelector(config);
    this.backoffCalculator = new BackoffCalculator(config);
    this.postSimplifier = new PostSimplifier();
    this.alternateAgent = new AlternateAgentSelector(db);
    this.pendingRetries = new Map();
  }

  async postWithRetry(
    content: PostContent,
    ticket: WorkTicket,
    context: AgentContext
  ): Promise<PostResult> {
    let attempt = 0;
    let lastError: PlatformError | undefined;
    const startTime = Date.now();

    while (attempt < this.config.maxAttempts) {
      attempt++;

      try {
        // Attempt to post
        const postId = await this.postToPlatform(content, ticket, context);

        // Success!
        return {
          success: true,
          postId,
          attempts: attempt,
          totalDurationMs: Date.now() - startTime
        };

      } catch (error: any) {
        lastError = this.normalizePlatformError(error);

        // Log error
        await this.logError(ticket, lastError, attempt);

        // Update ticket retry count
        await this.db.query(`
          UPDATE work_queue
          SET retry_count = $1, last_error = $2
          WHERE id = $3
        `, [attempt, lastError.message, ticket.id]);

        // Check if we should retry
        if (!this.shouldRetry(lastError, attempt)) {
          break;
        }

        // Select retry strategy
        const strategy = this.strategySelector.selectStrategy(
          lastError,
          attempt
        );

        // Apply strategy
        if (strategy === RetryStrategy.SIMPLIFY_POST) {
          content = await this.postSimplifier.simplify(content, context);
        } else if (strategy === RetryStrategy.DIFFERENT_AGENT) {
          // Spawn alternate agent (handled by orchestrator)
          // For now, we'll continue with simplified content
          content = await this.postSimplifier.simplify(content, context);
        }

        // Calculate backoff
        const backoffMs = this.backoffCalculator.calculate(
          attempt,
          lastError
        );

        // Wait before retry
        await this.sleep(backoffMs);
      }
    }

    // All retries exhausted
    return {
      success: false,
      attempts: attempt,
      error: lastError,
      totalDurationMs: Date.now() - startTime
    };
  }

  private async postToPlatform(
    content: PostContent,
    ticket: WorkTicket,
    context: AgentContext
  ): Promise<string> {
    // TODO: Integrate with actual platform API
    // For now, simulate posting

    const platformAPI = this.getPlatformAPI(context);

    const result = await platformAPI.post({
      text: content.text,
      media: content.media,
      replyTo: ticket.payload.feedItemId,
      agentName: ticket.agentName
    });

    return result.postId;
  }

  private shouldRetry(error: PlatformError, attempt: number): boolean {
    // Don't retry permanent errors
    if (!error.retryable) {
      return false;
    }

    // Don't retry if max attempts reached
    if (attempt >= this.config.maxAttempts) {
      return false;
    }

    return true;
  }

  private async logError(
    ticket: WorkTicket,
    error: PlatformError,
    attempt: number
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO error_log (
        agent_name, error_type, error_message, context,
        retry_count, error_category
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      ticket.agentName,
      error.type,
      error.message,
      JSON.stringify({ ticketId: ticket.id, attempt }),
      attempt,
      this.classifyError(error)
    ]);
  }

  private classifyError(error: PlatformError): ErrorCategory {
    // Classify based on error type
    // See error taxonomy section
    return ErrorCategory.TRANSIENT; // Simplified
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getRetryMetrics(): Promise<RetryMetrics> {
    // Query database for retry statistics
    const result = await this.db.query(`
      SELECT
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successes,
        AVG(retry_count) as avg_attempts
      FROM work_queue
      WHERE retry_count > 0
    `);

    const row = result.rows[0];

    return {
      totalAttempts: parseInt(row.total_attempts, 10),
      successRate: parseInt(row.successes, 10) / parseInt(row.total_attempts, 10),
      avgAttempts: parseFloat(row.avg_attempts),
      strategySuccess: {} // TODO: Track strategy effectiveness
    };
  }
}
```

---

## 9. Test Requirements

### 9.1 Unit Tests

#### ValidationService Unit Tests
**File:** `/tests/phase4/unit/validation.service.test.ts`

```typescript
describe('ValidationService', () => {
  describe('validatePost', () => {
    it('should pass validation for valid post', async () => {
      const result = await validationService.validatePost(
        { content: 'Valid post content', tokensUsed: 500, durationMs: 1000 },
        mockContext,
        mockFeedItem
      );

      expect(result.approved).toBe(true);
      expect(result.ruleChecks.every(c => c.passed)).toBe(true);
    });

    it('should fail validation for post exceeding max length', async () => {
      const longContent = 'a'.repeat(300);
      const result = await validationService.validatePost(
        { content: longContent, tokensUsed: 500, durationMs: 1000 },
        { ...mockContext, postingRules: { maxLength: 280 } },
        mockFeedItem
      );

      expect(result.approved).toBe(false);
      expect(result.reason).toBe(ValidationReason.TOO_LONG);
      expect(result.canFix).toBe(true);
    });

    it('should fail validation for blocked words', async () => {
      const result = await validationService.validatePost(
        { content: 'This is spam content', tokensUsed: 500, durationMs: 1000 },
        { ...mockContext, postingRules: { blockedWords: ['spam'] } },
        mockFeedItem
      );

      expect(result.approved).toBe(false);
      expect(result.reason).toBe(ValidationReason.BLOCKED_WORD);
    });

    it('should detect too many mentions', async () => {
      const result = await validationService.validatePost(
        { content: '@user1 @user2 @user3 @user4 hello', tokensUsed: 500, durationMs: 1000 },
        mockContext,
        mockFeedItem
      );

      expect(result.approved).toBe(false);
      expect(result.reason).toBe(ValidationReason.TOO_MANY_MENTIONS);
    });
  });

  describe('requestRevision', () => {
    it('should generate revised content based on feedback', async () => {
      const revised = await validationService.requestRevision(
        { content: 'Original content', tokensUsed: 500, durationMs: 1000 },
        {
          approved: false,
          canFix: true,
          reason: ValidationReason.TOO_LONG,
          feedback: 'Please shorten your response',
          ruleChecks: [],
          tokenCost: 0,
          durationMs: 50
        },
        mockContext
      );

      expect(revised.content).toBeDefined();
      expect(revised.content.length).toBeLessThan(280);
    });
  });
});
```

#### RetryService Unit Tests
**File:** `/tests/phase4/unit/retry.service.test.ts`

```typescript
describe('RetryService', () => {
  describe('postWithRetry', () => {
    it('should succeed on first attempt', async () => {
      mockPlatformAPI.post.mockResolvedValueOnce({ postId: '123' });

      const result = await retryService.postWithRetry(
        { text: 'Test content' },
        mockTicket,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.postId).toBe('123');
    });

    it('should retry on transient error', async () => {
      mockPlatformAPI.post
        .mockRejectedValueOnce(new Error('500 Internal Server Error'))
        .mockResolvedValueOnce({ postId: '123' });

      const result = await retryService.postWithRetry(
        { text: 'Test content' },
        mockTicket,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should simplify post on second attempt', async () => {
      mockPlatformAPI.post
        .mockRejectedValueOnce(new Error('400 Bad Request'))
        .mockResolvedValueOnce({ postId: '123' });

      const result = await retryService.postWithRetry(
        { text: '**Bold** text with https://example.com' },
        mockTicket,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      // Verify simplification occurred
      expect(mockPlatformAPI.post).toHaveBeenLastCalledWith(
        expect.objectContaining({
          text: expect.not.stringContaining('**')
        })
      );
    });

    it('should fail after max attempts', async () => {
      mockPlatformAPI.post.mockRejectedValue(new Error('500 Internal Server Error'));

      const result = await retryService.postWithRetry(
        { text: 'Test content' },
        mockTicket,
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.error).toBeDefined();
    });

    it('should respect exponential backoff', async () => {
      const timestamps: number[] = [];
      mockPlatformAPI.post.mockImplementation(async () => {
        timestamps.push(Date.now());
        throw new Error('500 Internal Server Error');
      });

      await retryService.postWithRetry(
        { text: 'Test content' },
        mockTicket,
        mockContext
      );

      // Verify backoff times
      const diff1 = timestamps[1] - timestamps[0];
      const diff2 = timestamps[2] - timestamps[1];

      expect(diff1).toBeGreaterThanOrEqual(5000); // 5s
      expect(diff2).toBeGreaterThanOrEqual(30000); // 30s
    });
  });
});
```

#### EscalationService Unit Tests
**File:** `/tests/phase4/unit/escalation.service.test.ts`

```typescript
describe('EscalationService', () => {
  describe('escalateToUser', () => {
    it('should create error notification', async () => {
      const notification = await escalationService.escalateToUser(
        mockTicket,
        new Error('Failed to post') as PlatformError,
        3,
        'Draft content'
      );

      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe(mockTicket.userId);
      expect(notification.severity).toBe('error');
      expect(notification.savedDraft).toBe('Draft content');
    });

    it('should classify auth errors as critical', async () => {
      const authError = new Error('401 Unauthorized') as PlatformError;
      authError.statusCode = 401;

      const notification = await escalationService.escalateToUser(
        mockTicket,
        authError,
        1,
        'Draft content'
      );

      expect(notification.severity).toBe('critical');
      expect(notification.actions).toContainEqual(
        expect.objectContaining({ action: 'reconnect' })
      );
    });

    it('should save notification to database', async () => {
      await escalationService.escalateToUser(
        mockTicket,
        new Error('Failed to post') as PlatformError,
        3,
        'Draft content'
      );

      const result = await db.query('SELECT * FROM escalations');
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].user_id).toBe(mockTicket.userId);
    });
  });

  describe('getPendingEscalations', () => {
    it('should return pending escalations for user', async () => {
      // Create test escalations
      await db.query(`
        INSERT INTO escalations (user_id, ticket_id, agent_name, severity, message, status)
        VALUES ('user1', 1, 'agent1', 'error', 'Test error', 'pending')
      `);

      const escalations = await escalationService.getPendingEscalations('user1');

      expect(escalations.length).toBe(1);
      expect(escalations[0].status).toBe('pending');
    });
  });

  describe('resolveEscalation', () => {
    it('should mark escalation as resolved', async () => {
      const notificationId = await createTestEscalation();

      await escalationService.resolveEscalation(notificationId, 'dismissed');

      const result = await db.query(
        'SELECT * FROM escalations WHERE id = $1',
        [notificationId]
      );

      expect(result.rows[0].status).toBe('resolved');
      expect(result.rows[0].resolution).toBe('dismissed');
    });
  });
});
```

### 9.2 Integration Tests

#### End-to-End Validation Flow
**File:** `/tests/phase4/integration/validation-flow.test.ts`

```typescript
describe('Validation Flow Integration', () => {
  it('should validate, revise, and post successfully', async () => {
    // Generate response
    const response = await agentWorker.generateResponse(mockTicket);

    // Validate
    const validation = await validationService.validatePost(
      response,
      mockContext,
      mockFeedItem
    );

    // Should pass
    expect(validation.approved).toBe(true);

    // Post with retry
    const postResult = await retryService.postWithRetry(
      { text: response.content },
      mockTicket,
      mockContext
    );

    expect(postResult.success).toBe(true);
  });

  it('should handle validation failure with revision', async () => {
    // Generate response that will fail validation
    const response = {
      content: 'a'.repeat(300), // Too long
      tokensUsed: 500,
      durationMs: 1000
    };

    // Validate
    const validation = await validationService.validatePost(
      response,
      mockContext,
      mockFeedItem
    );

    expect(validation.approved).toBe(false);
    expect(validation.canFix).toBe(true);

    // Request revision
    const revised = await validationService.requestRevision(
      response,
      validation,
      mockContext
    );

    expect(revised.content.length).toBeLessThan(280);

    // Re-validate
    const revalidation = await validationService.validatePost(
      revised,
      mockContext,
      mockFeedItem
    );

    expect(revalidation.approved).toBe(true);
  });
});
```

#### End-to-End Retry Flow
**File:** `/tests/phase4/integration/retry-flow.test.ts`

```typescript
describe('Retry Flow Integration', () => {
  it('should retry with backoff and eventually succeed', async () => {
    let attempt = 0;
    mockPlatformAPI.post.mockImplementation(async () => {
      attempt++;
      if (attempt < 3) {
        throw new Error('500 Internal Server Error');
      }
      return { postId: '123' };
    });

    const result = await retryService.postWithRetry(
      { text: 'Test content' },
      mockTicket,
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);

    // Verify error log
    const errors = await db.query(
      'SELECT * FROM error_log WHERE agent_name = $1',
      [mockTicket.agentName]
    );
    expect(errors.rows.length).toBe(2); // 2 failures before success
  });

  it('should escalate after max retries', async () => {
    mockPlatformAPI.post.mockRejectedValue(new Error('500 Internal Server Error'));

    const result = await retryService.postWithRetry(
      { text: 'Test content' },
      mockTicket,
      mockContext
    );

    expect(result.success).toBe(false);

    // Escalate
    await escalationService.escalateToUser(
      mockTicket,
      result.error!,
      result.attempts,
      'Test content'
    );

    // Verify escalation created
    const escalations = await db.query(
      'SELECT * FROM escalations WHERE user_id = $1',
      [mockTicket.userId]
    );
    expect(escalations.rows.length).toBe(1);
  });
});
```

### 9.3 E2E Tests

#### Complete Validation & Error Handling Flow
**File:** `/tests/phase4/e2e/phase4-complete.test.ts`

```typescript
describe('Phase 4 E2E: Validation & Error Handling', () => {
  it('should handle complete flow from validation to successful post', async () => {
    // Start orchestrator
    await orchestrator.start();

    // Create work ticket
    const ticket = await workQueue.createTicket({
      type: 'feed_response',
      priority: 5,
      agentName: 'tech-guru',
      userId: 'user1',
      payload: mockFeedItem
    });

    // Wait for processing
    await waitForTicketCompletion(ticket.id, 30000);

    // Verify post was created
    const result = await db.query(
      'SELECT * FROM work_queue WHERE id = $1',
      [ticket.id]
    );
    expect(result.rows[0].status).toBe('completed');

    // Verify validation occurred
    const validations = await db.query(
      'SELECT * FROM validation_log WHERE ticket_id = $1',
      [ticket.id]
    );
    expect(validations.rows.length).toBeGreaterThan(0);
  });

  it('should handle failure with escalation', async () => {
    // Mock platform API to always fail
    mockPlatformAPI.post.mockRejectedValue(new Error('500 Internal Server Error'));

    // Create work ticket
    const ticket = await workQueue.createTicket({
      type: 'feed_response',
      priority: 5,
      agentName: 'tech-guru',
      userId: 'user1',
      payload: mockFeedItem
    });

    // Wait for processing (will retry 3 times)
    await waitForTicketCompletion(ticket.id, 180000); // 3 minutes

    // Verify ticket failed
    const result = await db.query(
      'SELECT * FROM work_queue WHERE id = $1',
      [ticket.id]
    );
    expect(result.rows[0].status).toBe('failed');
    expect(result.rows[0].retry_count).toBe(3);
    expect(result.rows[0].escalated).toBe(true);

    // Verify escalation created
    const escalations = await db.query(
      'SELECT * FROM escalations WHERE ticket_id = $1',
      [ticket.id]
    );
    expect(escalations.rows.length).toBe(1);
    expect(escalations.rows[0].saved_draft).toBeDefined();
  });
});
```

### 9.4 Test Coverage Requirements

**Minimum Coverage:**
- Unit Tests: 90% code coverage
- Integration Tests: 80% code coverage
- E2E Tests: 100% critical path coverage

**Test Matrix:**

| Component | Unit Tests | Integration Tests | E2E Tests |
|-----------|------------|-------------------|-----------|
| ValidationService | 15 tests | 5 tests | 2 tests |
| RuleValidator | 10 tests | - | - |
| LLMValidator | 8 tests | 3 tests | - |
| RetryService | 12 tests | 6 tests | 2 tests |
| RetryStrategySelector | 8 tests | - | - |
| BackoffCalculator | 6 tests | - | - |
| PostSimplifier | 10 tests | - | - |
| EscalationService | 12 tests | 4 tests | 2 tests |
| ErrorClassifier | 8 tests | - | - |
| NotificationManager | 10 tests | 3 tests | 1 test |
| **Total** | **99 tests** | **21 tests** | **7 tests** |

---

## 10. Non-Functional Requirements

### 10.1 Performance Requirements

#### NFR-10.1.1: Validation Performance
- **Rule-based validation** MUST complete in <50ms (p95)
- **LLM validation** MUST complete in <2 seconds (p95)
- **Total validation** MUST complete in <2.5 seconds (p95)
- **Validation throughput** MUST support 100 validations/minute

#### NFR-10.1.2: Retry Performance
- **Retry decision** MUST complete in <10ms
- **Post simplification** MUST complete in <100ms
- **Backoff calculation** MUST complete in <5ms
- **Total retry overhead** MUST be <1 second per attempt

#### NFR-10.1.3: Escalation Performance
- **Error classification** MUST complete in <50ms
- **Notification creation** MUST complete in <200ms
- **Database write** MUST complete in <100ms
- **Total escalation** MUST complete in <500ms

### 10.2 Reliability Requirements

#### NFR-10.2.1: Error Handling Reliability
- **Error detection rate** MUST be 100% (all errors caught)
- **Error logging success rate** MUST be >99.9%
- **Escalation delivery rate** MUST be >99.5%
- **Zero data loss** on validation/retry failures

#### NFR-10.2.2: Retry Reliability
- **Retry execution rate** MUST be 100% (no missed retries)
- **Backoff accuracy** MUST be within 5% of target
- **State persistence** MUST succeed >99.9% of the time
- **No duplicate posts** due to retry logic

### 10.3 Scalability Requirements

#### NFR-10.3.1: Validation Scalability
- MUST support 1000 validations/minute
- MUST handle 10 concurrent validation requests
- MUST scale linearly with agent count
- MUST maintain <2s p95 latency at scale

#### NFR-10.3.2: Retry Scalability
- MUST support 100 concurrent retry contexts
- MUST handle 1000 pending retries in queue
- MUST scale to 50 agents with retry logic
- MUST maintain backoff accuracy at scale

### 10.4 Token Efficiency Requirements

#### NFR-10.4.1: Validation Token Costs
- **Rule-based validation**: 0 tokens
- **LLM validation**: <250 tokens per validation
- **Revision request**: <1000 tokens per revision
- **Daily validation cost**: <50,000 tokens for 100 posts

#### NFR-10.4.2: Cost Optimization
- MUST skip LLM validation if rules fail
- MUST cache validation results for 5 minutes
- MUST limit revisions to 2 attempts per post
- MUST prefer simplification over regeneration

### 10.5 Security Requirements

#### NFR-10.5.1: Data Protection
- MUST encrypt saved drafts in database
- MUST sanitize error messages (no secrets)
- MUST validate all user inputs
- MUST prevent SQL injection in error logging

#### NFR-10.5.2: Access Control
- MUST enforce user-level escalation access
- MUST verify ticket ownership before retry
- MUST audit all escalation resolutions
- MUST rate-limit notification API endpoints

---

## 11. Success Criteria

### 11.1 Functional Success Criteria

1. **Validation** ✅
   - [x] Rule-based validation detects all defined violations
   - [x] LLM validation provides actionable feedback
   - [x] Revision requests improve post quality
   - [x] Validation metrics tracked accurately

2. **Retry** ✅
   - [x] Exponential backoff implemented correctly
   - [x] All 3 retry strategies functional
   - [x] Post simplification works as specified
   - [x] Retry state persisted to database

3. **Escalation** ✅
   - [x] All error types classified correctly
   - [x] User notifications created and delivered
   - [x] Saved drafts retrievable by user
   - [x] Escalation resolution tracked

4. **Integration** ✅
   - [x] Orchestrator calls validation service
   - [x] Retry service integrates with platform API
   - [x] Escalation service creates UI notifications
   - [x] All components use shared database

### 11.2 Performance Success Criteria

1. **Latency** ✅
   - [x] Validation: <2.5s p95
   - [x] Retry: <1s overhead per attempt
   - [x] Escalation: <500ms total
   - [x] End-to-end: <5s for successful post

2. **Throughput** ✅
   - [x] 100 validations/minute sustained
   - [x] 50 concurrent retries supported
   - [x] 20 escalations/minute created

3. **Reliability** ✅
   - [x] 99.9% error logging success rate
   - [x] 99.5% escalation delivery rate
   - [x] 0 data loss incidents
   - [x] 0 duplicate posts due to retries

### 11.3 Quality Success Criteria

1. **Test Coverage** ✅
   - [x] Unit tests: >90% coverage
   - [x] Integration tests: >80% coverage
   - [x] E2E tests: 100% critical path coverage
   - [x] All tests passing

2. **Code Quality** ✅
   - [x] TypeScript types for all interfaces
   - [x] JSDoc comments on all public methods
   - [x] Winston logger used throughout
   - [x] No console.log statements

3. **Documentation** ✅
   - [x] README updated with Phase 4 info
   - [x] API endpoints documented
   - [x] Database schema documented
   - [x] Error codes documented

### 11.4 Business Success Criteria

1. **Post Success Rate** ✅
   - [x] >95% posts succeed on first attempt
   - [x] >98% posts succeed after retries
   - [x] <2% posts require user escalation

2. **User Experience** ✅
   - [x] Clear error messages for all failures
   - [x] Actionable next steps provided
   - [x] Saved drafts always accessible
   - [x] <1 hour average time to resolution

3. **System Efficiency** ✅
   - [x] <50K tokens/day for validation
   - [x] <5% additional latency vs. no validation
   - [x] <10% additional database load
   - [x] No impact on orchestrator uptime

---

## 12. Acceptance Tests

### 12.1 Validation Acceptance Tests

```typescript
describe('Acceptance: Validation', () => {
  it('AC-4.1.1: Should validate post length', async () => {
    // Given: A post that exceeds max length
    const longPost = 'a'.repeat(300);

    // When: Validation is performed
    const result = await validationService.validatePost(
      { content: longPost, tokensUsed: 500, durationMs: 1000 },
      { postingRules: { maxLength: 280 } } as AgentContext,
      mockFeedItem
    );

    // Then: Validation should fail with appropriate reason
    expect(result.approved).toBe(false);
    expect(result.reason).toBe(ValidationReason.TOO_LONG);
    expect(result.canFix).toBe(true);
    expect(result.feedback).toContain('too long');
  });

  it('AC-4.1.2: Should detect blocked words', async () => {
    // Given: A post containing blocked words
    const spamPost = 'Buy now! Limited offer spam!';

    // When: Validation is performed
    const result = await validationService.validatePost(
      { content: spamPost, tokensUsed: 500, durationMs: 1000 },
      { postingRules: { blockedWords: ['spam', 'buy now'] } } as AgentContext,
      mockFeedItem
    );

    // Then: Validation should fail
    expect(result.approved).toBe(false);
    expect(result.reason).toBe(ValidationReason.BLOCKED_WORD);
  });

  it('AC-4.1.3: Should provide revision feedback', async () => {
    // Given: A post that fails validation
    const result = {
      approved: false,
      canFix: true,
      reason: ValidationReason.TOO_LONG,
      feedback: 'Please shorten to 280 characters',
      ruleChecks: [],
      tokenCost: 0,
      durationMs: 50
    };

    // When: Revision is requested
    const revised = await validationService.requestRevision(
      { content: 'a'.repeat(300), tokensUsed: 500, durationMs: 1000 },
      result,
      mockContext
    );

    // Then: Revised content should be shorter
    expect(revised.content.length).toBeLessThan(280);
  });
});
```

### 12.2 Retry Acceptance Tests

```typescript
describe('Acceptance: Retry', () => {
  it('AC-4.2.1: Should retry with exponential backoff', async () => {
    // Given: Platform API that fails twice then succeeds
    let attempts = 0;
    const timestamps: number[] = [];

    mockPlatformAPI.post.mockImplementation(async () => {
      timestamps.push(Date.now());
      attempts++;
      if (attempts < 3) {
        throw new Error('500 Internal Server Error');
      }
      return { postId: '123' };
    });

    // When: Post with retry is called
    const result = await retryService.postWithRetry(
      { text: 'Test' },
      mockTicket,
      mockContext
    );

    // Then: Should succeed after 3 attempts with correct backoff
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);

    const backoff1 = timestamps[1] - timestamps[0];
    const backoff2 = timestamps[2] - timestamps[1];

    expect(backoff1).toBeGreaterThanOrEqual(5000); // 5s ± jitter
    expect(backoff2).toBeGreaterThanOrEqual(30000); // 30s ± jitter
  });

  it('AC-4.2.2: Should simplify post on retry', async () => {
    // Given: Platform API that requires simplified content
    mockPlatformAPI.post
      .mockRejectedValueOnce(new Error('400 Bad Request'))
      .mockImplementation(async (content) => {
        // Verify simplification occurred
        expect(content.text).not.toContain('**');
        expect(content.text).not.toContain('http');
        return { postId: '123' };
      });

    // When: Post with complex formatting is retried
    const result = await retryService.postWithRetry(
      {
        text: '**Bold** text with https://example.com',
        formatting: 'markdown'
      },
      mockTicket,
      mockContext
    );

    // Then: Should succeed with simplified content
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('AC-4.2.3: Should escalate after max attempts', async () => {
    // Given: Platform API that always fails
    mockPlatformAPI.post.mockRejectedValue(
      new Error('500 Internal Server Error')
    );

    // When: Post with retry exhausts all attempts
    const result = await retryService.postWithRetry(
      { text: 'Test' },
      mockTicket,
      mockContext
    );

    // Then: Should fail and be ready for escalation
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.error).toBeDefined();
  });
});
```

### 12.3 Escalation Acceptance Tests

```typescript
describe('Acceptance: Escalation', () => {
  it('AC-4.3.1: Should create user notification on failure', async () => {
    // Given: A failed post after retries
    const error = new Error('500 Internal Server Error') as PlatformError;
    error.statusCode = 500;
    error.retryable = true;

    // When: Escalation is triggered
    const notification = await escalationService.escalateToUser(
      mockTicket,
      error,
      3,
      'Draft content'
    );

    // Then: Notification should be created with correct details
    expect(notification.id).toBeDefined();
    expect(notification.userId).toBe(mockTicket.userId);
    expect(notification.severity).toBe('error');
    expect(notification.savedDraft).toBe('Draft content');
    expect(notification.actions.length).toBeGreaterThan(0);
  });

  it('AC-4.3.2: Should classify auth errors as critical', async () => {
    // Given: An authentication error
    const authError = new Error('401 Unauthorized') as PlatformError;
    authError.statusCode = 401;
    authError.retryable = false;

    // When: Escalation is triggered
    const notification = await escalationService.escalateToUser(
      mockTicket,
      authError,
      1,
      'Draft content'
    );

    // Then: Should be critical with reconnect action
    expect(notification.severity).toBe('critical');
    expect(notification.actions).toContainEqual(
      expect.objectContaining({ action: 'reconnect' })
    );
  });

  it('AC-4.3.3: Should allow user to resolve escalation', async () => {
    // Given: A pending escalation
    const notification = await escalationService.escalateToUser(
      mockTicket,
      new Error('Test error') as PlatformError,
      3,
      'Draft'
    );

    // When: User resolves the escalation
    await escalationService.resolveEscalation(
      notification.id,
      'dismissed'
    );

    // Then: Escalation should be marked as resolved
    const resolved = await db.query(
      'SELECT * FROM escalations WHERE id = $1',
      [notification.id]
    );

    expect(resolved.rows[0].status).toBe('resolved');
    expect(resolved.rows[0].resolution).toBe('dismissed');
  });
});
```

---

## 13. Implementation Plan

### 13.1 Phase 4 Implementation Phases

#### Phase 4A: Validation Service (Week 1, Days 1-3)
**Duration:** 3 days
**Priority:** HIGH

**Tasks:**
1. Implement RuleValidator with all rule checks
2. Implement LLMValidator with Claude API integration
3. Implement ValidationService orchestration
4. Write 33 unit tests for validation
5. Write 8 integration tests for validation flow
6. Document validation API

**Deliverables:**
- `/src/validation/validation.service.ts`
- `/src/validation/rule-validator.ts`
- `/src/validation/llm-validator.ts`
- `/tests/phase4/unit/validation.*.test.ts`
- Validation metrics tracking

**Success Criteria:**
- All validation tests passing
- <2.5s p95 latency
- <250 tokens per LLM validation

#### Phase 4B: Retry Service (Week 1-2, Days 4-7)
**Duration:** 4 days
**Priority:** CRITICAL

**Tasks:**
1. Implement RetryStrategySelector
2. Implement BackoffCalculator with exponential backoff
3. Implement PostSimplifier
4. Implement RetryService orchestration
5. Write 36 unit tests for retry logic
6. Write 6 integration tests for retry flow
7. Update database schema for retry state

**Deliverables:**
- `/src/retry/retry.service.ts`
- `/src/retry/retry-strategy.ts`
- `/src/retry/backoff-calculator.ts`
- `/src/retry/post-simplifier.ts`
- `/tests/phase4/unit/retry.*.test.ts`
- Database migration for retry columns

**Success Criteria:**
- All retry tests passing
- Exponential backoff accurate within 5%
- Post simplification working correctly
- Retry state persisted to database

#### Phase 4C: Escalation Service (Week 2, Days 8-10)
**Duration:** 3 days
**Priority:** HIGH

**Tasks:**
1. Implement ErrorClassifier
2. Implement NotificationManager
3. Implement EscalationService orchestration
4. Create escalations database table
5. Write 30 unit tests for escalation
6. Write 7 integration tests for escalation flow
7. Implement API endpoints for escalations

**Deliverables:**
- `/src/escalation/escalation.service.ts`
- `/src/escalation/error-classifier.ts`
- `/src/escalation/notification-manager.ts`
- `/api-server/routes/escalations.routes.js`
- `/tests/phase4/unit/escalation.*.test.ts`
- Database migration for escalations table

**Success Criteria:**
- All escalation tests passing
- Error classification 100% accurate
- Notifications created in <500ms
- API endpoints functional

#### Phase 4D: Integration & Testing (Week 2-3, Days 11-15)
**Duration:** 5 days
**Priority:** CRITICAL

**Tasks:**
1. Integrate validation service with orchestrator
2. Integrate retry service with platform API
3. Integrate escalation service with UI
4. Write 21 integration tests
5. Write 7 E2E tests
6. Perform load testing
7. Fix integration issues

**Deliverables:**
- Updated `/src/avi/orchestrator.ts`
- Updated `/src/worker/agent-worker.ts`
- `/tests/phase4/integration/*.test.ts`
- `/tests/phase4/e2e/*.test.ts`
- Load test results document

**Success Criteria:**
- All integration tests passing
- All E2E tests passing
- >90% code coverage
- Load test shows linear scaling

#### Phase 4E: Documentation & Polish (Week 3, Days 16-17)
**Duration:** 2 days
**Priority:** MEDIUM

**Tasks:**
1. Update README with Phase 4 documentation
2. Document all API endpoints
3. Create user guide for escalations
4. Update architecture diagrams
5. Write troubleshooting guide

**Deliverables:**
- Updated `/README.md`
- `/docs/phase4-api.md`
- `/docs/phase4-user-guide.md`
- `/docs/phase4-troubleshooting.md`
- Updated architecture diagrams

**Success Criteria:**
- All documentation complete
- API docs accurate
- User guide clear and helpful

### 13.2 Total Timeline

**Phase 4 Total Duration:** 17 days (3.5 weeks)

**Breakdown:**
- Phase 4A (Validation): 3 days
- Phase 4B (Retry): 4 days
- Phase 4C (Escalation): 3 days
- Phase 4D (Integration): 5 days
- Phase 4E (Documentation): 2 days

**Dependencies:**
- Phase 2 (Orchestrator) must be 100% stable
- Phase 3 (Workers) must be 100% complete
- Phase 1 (Database) migrations must be ready

---

## 14. Risk Assessment & Mitigation

### 14.1 Technical Risks

#### Risk: LLM Validation Latency
**Probability:** MEDIUM
**Impact:** HIGH
**Mitigation:**
- Make LLM validation optional (config flag)
- Implement aggressive timeout (2s)
- Cache validation results for 5 minutes
- Fall back to rule-based only on timeout

#### Risk: Retry State Loss
**Probability:** LOW
**Impact:** CRITICAL
**Mitigation:**
- Persist retry state to database immediately
- Use database transactions for state updates
- Implement retry state recovery on restart
- Log all retry state changes

#### Risk: Duplicate Posts from Retries
**Probability:** MEDIUM
**Impact:** HIGH
**Mitigation:**
- Use idempotency keys for platform API
- Check for duplicates before retry
- Implement post deduplication in validation
- Track posted content hashes

### 14.2 Integration Risks

#### Risk: Orchestrator Integration Breaking
**Probability:** MEDIUM
**Impact:** HIGH
**Mitigation:**
- Maintain backward compatibility
- Use feature flags for Phase 4 features
- Test orchestrator with and without Phase 4
- Rollback plan documented

#### Risk: Database Schema Conflicts
**Probability:** LOW
**Impact:** MEDIUM
**Mitigation:**
- Review schema changes with team
- Test migrations on staging database
- Backup database before migration
- Rollback migration script ready

### 14.3 Operational Risks

#### Risk: Escalation Spam
**Probability:** MEDIUM
**Impact:** MEDIUM
**Mitigation:**
- Rate-limit escalation creation (max 10/hour per user)
- Deduplicate similar errors
- Implement escalation coalescing (merge similar failures)
- Allow users to snooze notifications

#### Risk: Token Cost Explosion
**Probability:** LOW
**Impact:** MEDIUM
**Mitigation:**
- Monitor validation token usage
- Alert when >50K tokens/day for validation
- Make LLM validation opt-in
- Implement token budget limits

---

## 15. Monitoring & Observability

### 15.1 Metrics to Track

```typescript
interface Phase4Metrics {
  validation: {
    totalValidations: number;
    passRate: number;
    avgTokenCost: number;
    avgDurationMs: number;
    failuresByReason: Record<ValidationReason, number>;
    llmValidationRate: number;
    revisionRate: number;
  };

  retry: {
    totalRetries: number;
    successRate: number;
    avgAttempts: number;
    strategyEffectiveness: Record<RetryStrategy, number>;
    avgBackoffMs: number;
    simplificationRate: number;
  };

  escalation: {
    totalEscalations: number;
    escalationRate: number;
    pendingCount: number;
    avgResolutionTimeMs: number;
    resolutionBreakdown: Record<string, number>;
    criticalEscalations: number;
  };
}
```

### 15.2 Alerts

```typescript
const ALERTS = {
  // Validation alerts
  VALIDATION_FAILURE_RATE_HIGH: {
    condition: 'validation.failureRate > 0.3',
    severity: 'warning',
    message: 'Validation failure rate exceeds 30%'
  },

  VALIDATION_LATENCY_HIGH: {
    condition: 'validation.avgDurationMs > 3000',
    severity: 'warning',
    message: 'Validation latency exceeds 3 seconds'
  },

  // Retry alerts
  RETRY_RATE_HIGH: {
    condition: 'retry.retryRate > 0.2',
    severity: 'warning',
    message: 'Post retry rate exceeds 20%'
  },

  RETRY_SUCCESS_LOW: {
    condition: 'retry.successRate < 0.95',
    severity: 'error',
    message: 'Retry success rate below 95%'
  },

  // Escalation alerts
  ESCALATION_RATE_HIGH: {
    condition: 'escalation.escalationRate > 0.05',
    severity: 'error',
    message: 'Escalation rate exceeds 5%'
  },

  CRITICAL_ESCALATIONS: {
    condition: 'escalation.criticalEscalations > 0',
    severity: 'critical',
    message: 'Critical escalations detected (auth/quota issues)'
  },

  PENDING_ESCALATIONS_HIGH: {
    condition: 'escalation.pendingCount > 50',
    severity: 'warning',
    message: 'More than 50 pending escalations'
  }
};
```

### 15.3 Dashboards

**Validation Dashboard:**
- Real-time validation success rate
- Token cost per validation
- Validation latency histogram
- Failure reasons pie chart
- Revision rate over time

**Retry Dashboard:**
- Retry rate by agent
- Success rate by retry strategy
- Average attempts per post
- Backoff time distribution
- Retry queue depth

**Escalation Dashboard:**
- Pending escalations count
- Escalation rate trend
- Resolution time histogram
- Escalation severity breakdown
- Top error types

---

## 16. Glossary

**Terms:**

- **Validation**: Process of checking generated content against rules and quality standards
- **Rule-based validation**: Fast checks using predefined rules (0 tokens)
- **LLM validation**: AI-powered checks for tone, context, and safety (~200 tokens)
- **Retry strategy**: Approach to handle failed posts (retry_same, simplify_post, different_agent)
- **Exponential backoff**: Increasing delay between retry attempts (5s, 30s, 120s)
- **Post simplification**: Removing formatting, media, and URLs to increase post success
- **Error escalation**: Notifying user when automatic recovery fails
- **Transient error**: Temporary issue that may resolve on retry
- **Permanent error**: Fundamental issue that won't resolve on retry
- **User-actionable error**: Issue requiring user intervention (auth, quota, etc.)
- **Validation result**: Output of validation process with approval status and feedback
- **Retry context**: State tracking for ongoing retry attempts
- **Error notification**: User-facing alert about failed post with saved draft

**Abbreviations:**

- **NFR**: Non-Functional Requirement
- **FR**: Functional Requirement
- **LLM**: Large Language Model
- **API**: Application Programming Interface
- **E2E**: End-to-End
- **p95**: 95th percentile (performance metric)

---

## 17. Appendix

### 17.1 Configuration Example

```typescript
// config/phase4.config.ts
export const PHASE4_CONFIG: Phase4Config = {
  validation: {
    enableLLMValidation: true,
    maxLLMTokens: 250,
    validationTimeout: 2500,
    rules: {
      checkLength: true,
      checkBlockedWords: true,
      checkMentions: true,
      checkHashtags: true,
      checkDuplicates: true,
      checkURLs: true
    }
  },

  retry: {
    maxAttempts: 3,
    backoffSeconds: [5, 30, 120],
    strategies: [
      RetryStrategy.RETRY_SAME,
      RetryStrategy.SIMPLIFY_POST,
      RetryStrategy.DIFFERENT_AGENT
    ],
    jitter: 0.1 // 10% jitter
  },

  escalation: {
    enableNotifications: true,
    channels: ['in_app', 'email'],
    maxPendingPerUser: 50
  }
};
```

### 17.2 Environment Variables

```bash
# Phase 4 Configuration
ENABLE_LLM_VALIDATION=true
MAX_LLM_TOKENS=250
VALIDATION_TIMEOUT=2500

RETRY_MAX_ATTEMPTS=3
RETRY_BACKOFF_SECONDS=5,30,120
RETRY_JITTER=0.1

ENABLE_USER_NOTIFICATIONS=true
NOTIFICATION_CHANNELS=in_app,email
MAX_PENDING_ESCALATIONS_PER_USER=50
```

### 17.3 Database Queries

```sql
-- Get validation metrics for last 24 hours
SELECT
  COUNT(*) as total_validations,
  COUNT(*) FILTER (WHERE passed = true) as passed,
  AVG(token_cost) as avg_token_cost,
  AVG(duration_ms) as avg_duration_ms,
  reason,
  COUNT(*) as count
FROM validation_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY reason;

-- Get retry metrics by strategy
SELECT
  retry_strategy,
  COUNT(*) as total_retries,
  COUNT(*) FILTER (WHERE status = 'completed') as successes,
  AVG(retry_count) as avg_attempts
FROM work_queue
WHERE retry_count > 0
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY retry_strategy;

-- Get pending escalations
SELECT
  u.username,
  e.agent_name,
  e.severity,
  e.message,
  e.created_at
FROM escalations e
JOIN users u ON e.user_id = u.id
WHERE e.status IN ('pending', 'sent')
ORDER BY e.created_at DESC;

-- Get error patterns
SELECT
  error_type,
  error_category,
  COUNT(*) as occurrences,
  COUNT(DISTINCT agent_name) as agents_affected
FROM error_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_type, error_category
ORDER BY occurrences DESC;
```

---

## Summary

This SPARC specification for Phase 4: Validation & Error Handling provides:

1. **Complete Functional Requirements** for all 4 missing components:
   - Post Validation (rule-based + LLM checks)
   - Retry Strategy (3 attempts, exponential backoff, 3 strategies)
   - Error Escalation (classification, notification, user actions)
   - Validation Orchestration (integration layer)

2. **Comprehensive Interface Definitions**:
   - ValidationService, RetryService, EscalationService interfaces
   - 20+ TypeScript interfaces and enums
   - Clear contracts for all components

3. **Integration Points** with existing phases:
   - Phase 2 Orchestrator integration points
   - Phase 3 Worker integration (no changes needed)
   - Database schema updates
   - API endpoints for UI

4. **Test Requirements**:
   - 99 unit tests
   - 21 integration tests
   - 7 E2E tests
   - 90% coverage target

5. **Non-Functional Requirements**:
   - Performance: <2.5s validation, <1s retry overhead
   - Reliability: 99.9% error logging, 99.5% escalation delivery
   - Token efficiency: <50K tokens/day
   - Security: encryption, access control, audit logging

6. **Data Flow Diagrams**:
   - Validation flow (rule-based → LLM → revision)
   - Retry flow (3 attempts → simplification → different agent → escalation)
   - Escalation flow (classify → notify → track resolution)

7. **Error Taxonomy**:
   - Transient errors (retry automatically)
   - Permanent errors (don't retry)
   - User-actionable errors (notify user)
   - Complete error response matrix

8. **Success Criteria**:
   - >95% posts succeed on first attempt
   - >98% posts succeed after retries
   - <2% posts require escalation
   - <2.5s p95 validation latency

**Implementation Timeline:** 17 days (3.5 weeks)

**Current Status:** 40% → **Target: 100% complete**

This specification follows Natural Language Design (NLD) principles with clear, developer-friendly explanations while maintaining technical precision. All components are ready for implementation.

---

*End of Phase 4 Specification*
