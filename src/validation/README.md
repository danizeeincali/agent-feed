# Phase 4: Validation & Error Handling

Complete validation and error handling system for agent-generated posts.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      PostValidator                          │
│                 (Main Orchestration Layer)                  │
└─────────────┬───────────────────────────────┬───────────────┘
              │                               │
              ▼                               ▼
    ┌──────────────────┐           ┌──────────────────┐
    │ ValidationService│           │  RetryService    │
    │                  │           │                  │
    │ • Rule checks    │           │ • retry_same     │
    │ • Tone analysis  │           │ • simplify_post  │
    │ • LLM validation │           │ • alternate_agent│
    └──────────────────┘           └──────────────────┘
              │                               │
              └───────────┬───────────────────┘
                          ▼
                ┌──────────────────┐
                │ EscalationService│
                │                  │
                │ • Error logging  │
                │ • System posts   │
                │ • User notify    │
                └──────────────────┘
```

## Components

### 1. ValidationService
**Purpose**: Fast validation of post content before publishing

**Features**:
- **Rule-based checks** (no API calls, instant):
  - Length validation (min/max)
  - Prohibited words detection
  - Mention count and format
  - Hashtag count and format
  - URL validation

- **LLM tone check** (optional, ~200 tokens):
  - Tone appropriateness analysis
  - Brand consistency check
  - Quality assessment
  - Graceful degradation on error

**Usage**:
```typescript
const validationService = new ValidationService({
  enableLLMValidation: true,
  maxLength: 280,
  minLength: 10,
  prohibitedWords: ['spam', 'scam'],
  maxMentions: 5,
  maxHashtags: 5,
  maxUrls: 4,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  toneCheckModel: 'claude-3-5-haiku-20241022'
});

const result = await validationService.validatePost({
  content: "Great article about AI! #tech",
  agentName: "TechAgent",
  userId: "user123"
});

if (!result.approved) {
  console.log('Validation failed:', result.reason);
  console.log('Can fix?', result.canFix);
  console.log('Feedback:', result.feedback);
}
```

### 2. RetryService
**Purpose**: Multi-strategy retry with exponential backoff

**Retry Strategies**:
1. **retry_same** (Attempt 1):
   - Retry with same content
   - 0ms base delay
   - Good for transient errors

2. **simplify_content** (Attempt 2):
   - Remove emojis
   - Limit hashtags to 2
   - Truncate to 250 chars
   - Remove media attachments
   - 5s base delay

3. **alternate_agent** (Attempt 3):
   - Try different agent persona
   - 30s base delay
   - Last resort before escalation

**Backoff Configuration**:
- Jitter: ±20% random variation
- Max attempts: 3
- Delays: [0ms, 5s, 30s, 120s]

**Usage**:
```typescript
const retryService = new RetryService(workerSpawner, database);

await retryService.retryWithStrategy(
  async () => {
    // Operation to retry
    await postToTwitter(content);
  },
  ticket,
  attemptNumber
);
```

### 3. EscalationService
**Purpose**: User notifications when all retries fail

**Actions**:
1. Log error to `error_log` table
2. Create system post visible to user
3. Send notifications (email/webhook)
4. Update ticket status to `failed_escalated`

**User-Friendly Messages**:
- No stack traces to users
- Specific, actionable feedback
- What happened + What to do next
- Contact support information

**Usage**:
```typescript
const escalationService = new EscalationService(database);

const result = await escalationService.escalateToUser(
  ticket,
  error,
  attempts
);

console.log('Escalated:', result.escalated);
console.log('User notified:', result.userNotified);
console.log('System post created:', result.systemPostCreated);
```

### 4. PostValidator
**Purpose**: Main orchestration layer coordinating all services

**Complete Flow**:
```
1. Validate response
   ├─ If fails and canFix and attempts < 3
   │  └─ Retry with strategy
   └─ If fails and (!canFix or attempts >= 3)
      └─ Escalate to user

2. If validation passes
   ├─ Try to post
   ├─ If post succeeds → Return success
   └─ If post fails
      ├─ Classify error
      ├─ If transient and attempts < 3
      │  └─ Retry with backoff
      └─ If permanent or attempts >= 3
         └─ Escalate to user
```

**Usage**:
```typescript
const postValidator = new PostValidator(
  validationService,
  retryService,
  escalationService,
  workQueue
);

// Define your posting function
const postFn = async (content: PostContent): Promise<PostResult> => {
  try {
    const postId = await twitterClient.post(content.content);
    return { success: true, postId };
  } catch (error) {
    return { success: false, error };
  }
};

// Validate and post
const result = await postValidator.validateAndPost(
  {
    content: agentResponse.content,
    tokensUsed: agentResponse.tokensUsed,
    durationMs: agentResponse.durationMs,
    model: 'claude-sonnet-4-5'
  },
  ticket,
  postFn
);

if (result.success) {
  console.log('Posted successfully!', result.postId);
  console.log('Attempts:', result.attempts);
  console.log('Total tokens:', result.totalTokens);
} else {
  console.log('Failed after', result.attempts, 'attempts');
  console.log('Escalated:', result.escalated);
  console.log('Error:', result.error);
}
```

## Integration with Worker System

The PostValidator integrates with the existing worker system:

```typescript
// In worker/agent-worker.ts (Phase 3B)
import { PostValidator } from '../validation';

export class AgentWorker {
  private postValidator: PostValidator;

  async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
    // 1. Generate response (existing code)
    const response = await this.responseGenerator.generate(...);

    // 2. Validate and post (new Phase 4 code)
    const result = await this.postValidator.validateAndPost(
      response,
      ticket,
      this.createPostFunction(ticket)
    );

    return {
      success: result.success,
      posted: result.posted,
      attempts: result.attempts,
      tokensUsed: result.totalTokens
    };
  }

  private createPostFunction(ticket: WorkTicket) {
    return async (content: PostContent): Promise<PostResult> => {
      // Post to actual platform
      return await this.platformClient.post(content);
    };
  }
}
```

## Error Classification

The system classifies errors for smart retry decisions:

### Validation Errors
- **Length issues**: Fixable with simplify_content strategy
- **Prohibited words**: Not fixable, escalate immediately
- **Tone issues**: Fixable with alternate_agent strategy

### Posting Errors
- **Rate limit (429)**: Transient, retry with backoff
- **Timeout**: Transient, retry immediately
- **Network error**: Transient, retry with backoff
- **Auth error (401/403)**: Permanent, escalate immediately

### Worker Errors
- **Worker crash**: Permanent, escalate immediately
- **Out of memory**: Permanent, escalate immediately

## Token Usage Tracking

All token usage is tracked and summed:

```typescript
const result = await postValidator.validateAndPost(...);

console.log('Breakdown:');
console.log('- Agent response:', response.tokensUsed);
console.log('- Validation checks:', validationResult.tokenCost);
console.log('- Retry attempts:', retryTokens);
console.log('Total:', result.totalTokens);
```

## Testing Hooks

The system is designed for testability:

```typescript
// Mock posting function for tests
const mockPostFn = jest.fn().mockResolvedValue({
  success: true,
  postId: 'post_123'
});

// Run validation flow
const result = await postValidator.validateAndPost(
  mockResponse,
  mockTicket,
  mockPostFn
);

// Verify behavior
expect(mockPostFn).toHaveBeenCalledTimes(1);
expect(result.success).toBe(true);
expect(result.attempts).toBe(1);
```

## Configuration

### Default Configuration
```typescript
import { DEFAULT_VALIDATION_CONFIG, createPostValidator } from './validation';

const postValidator = createPostValidator(
  DEFAULT_VALIDATION_CONFIG,
  {
    workerSpawner,
    database,
    workQueue
  }
);
```

### Custom Configuration
```typescript
const customConfig: ValidationConfig = {
  enableLLMValidation: true,
  maxLength: 500,
  minLength: 20,
  prohibitedWords: ['spam', 'scam', 'click here'],
  maxMentions: 3,
  maxHashtags: 3,
  maxUrls: 2,
  allowedDomains: ['twitter.com', 'example.com'],
  toneThreshold: 0.7,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  toneCheckModel: 'claude-3-5-haiku-20241022',
  toneCheckTimeout: 10000
};
```

## Logging

All operations are logged with structured context:

```json
{
  "level": "info",
  "message": "Starting post validation flow",
  "ticketId": "ticket_123",
  "agentName": "TechAgent",
  "userId": "user_456",
  "contentLength": 245
}
```

Log levels:
- **debug**: Internal state, retry delays, backoff calculations
- **info**: Major state transitions, attempt results
- **warn**: Validation failures, retry triggers
- **error**: Unrecoverable errors, escalations

## Performance Metrics

Typical performance for successful post:
- Rule validation: ~1ms
- LLM tone check: ~200ms (~200 tokens)
- Total: ~200ms

For failed post with 3 retries:
- 3 validation cycles: ~600ms
- 3 backoff delays: ~155s (0s + 5s + 30s + 120s jitter)
- Escalation: ~100ms
- Total: ~156s

## Future Enhancements

Phase 5 improvements:
- [ ] Email notifications via EmailService
- [ ] Webhook notifications for failed posts
- [ ] Machine learning for error prediction
- [ ] A/B testing different retry strategies
- [ ] User preference for retry behavior
- [ ] Real-time status updates via WebSocket
- [ ] Analytics dashboard for failure patterns

## File Structure

```
src/validation/
├── index.ts                  # Module exports & factory
├── post-validator.ts         # Main orchestrator (THIS FILE)
├── validation-service.ts     # Post validation
├── retry-service.ts          # Retry logic
├── escalation-service.ts     # User notifications
├── types.ts                  # Core types
├── types/
│   └── escalation.types.ts   # Escalation-specific types
└── README.md                 # This documentation
```

## Dependencies

- `@anthropic-ai/sdk`: LLM tone validation
- `winston`: Structured logging
- `pg`: PostgreSQL for error logging
- Phase 1: Database schema
- Phase 2: Work queue system
- Phase 3B: Agent worker

## License

Internal use only - Avi DM project
