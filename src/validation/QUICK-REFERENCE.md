# Phase 4: PostValidator Quick Reference

## 🚀 Quick Start

```typescript
import { createPostValidator, DEFAULT_VALIDATION_CONFIG } from './validation';

// 1. Create PostValidator
const postValidator = createPostValidator(
  DEFAULT_VALIDATION_CONFIG,
  { workerSpawner, database, workQueue }
);

// 2. Define post function
const postFn = async (content) => {
  const postId = await twitterClient.post(content.content);
  return { success: true, postId };
};

// 3. Validate and post
const result = await postValidator.validateAndPost(
  agentResponse,
  workTicket,
  postFn
);
```

## 📊 Result Object

```typescript
interface PostValidationResult {
  success: boolean;        // Did everything work?
  posted: boolean;         // Was post actually published?
  attempts: number;        // How many tries? (1-3)
  escalated: boolean;      // Did we notify the user?
  postId?: string;         // Post ID if successful
  error?: Error;           // Final error if failed
  totalTokens: number;     // All LLM tokens used
  totalDurationMs: number; // Total time elapsed
}
```

## 🔄 Retry Strategies

| Attempt | Strategy | Delay | Actions |
|---------|----------|-------|---------|
| 1 | `retry_same` | 0ms | Retry with same content |
| 2 | `simplify_content` | 5s ± jitter | Remove emojis, limit hashtags |
| 3 | `alternate_agent` | 30s ± jitter | Try different agent persona |
| 4+ | Escalate | - | Notify user, create system post |

## 🎯 Error Classifications

### Validation Errors
- ✅ **Length issues** → Fixable → Retry with simplify
- ✅ **Hashtag excess** → Fixable → Retry with simplify
- ❌ **Prohibited words** → Not fixable → Escalate immediately
- ✅ **Tone issues** → Fixable → Retry with alternate agent

### Posting Errors
- ✅ **429 Rate Limit** → Transient → Retry with backoff
- ✅ **408 Timeout** → Transient → Retry immediately
- ✅ **500 Server Error** → Transient → Retry with backoff
- ✅ **Network Error** → Transient → Retry with backoff
- ❌ **401 Unauthorized** → Permanent → Escalate
- ❌ **403 Forbidden** → Permanent → Escalate

### Worker Errors
- ❌ **All worker errors** → Permanent → Escalate immediately

## 🧪 Testing Examples

### Success Case
```typescript
const mockPostFn = jest.fn().mockResolvedValue({
  success: true,
  postId: 'post_123'
});

const result = await postValidator.validateAndPost(
  validResponse,
  ticket,
  mockPostFn
);

expect(result.success).toBe(true);
expect(result.attempts).toBe(1);
expect(mockPostFn).toHaveBeenCalledTimes(1);
```

### Retry Case
```typescript
let attempts = 0;
const mockPostFn = jest.fn().mockImplementation(async () => {
  attempts++;
  if (attempts < 3) {
    return { success: false, error: new Error('Timeout') };
  }
  return { success: true, postId: 'post_123' };
});

const result = await postValidator.validateAndPost(
  validResponse,
  ticket,
  mockPostFn
);

expect(result.success).toBe(true);
expect(result.attempts).toBe(3);
```

### Escalation Case
```typescript
const mockPostFn = jest.fn().mockResolvedValue({
  success: false,
  error: new Error('401 Unauthorized')
});

const result = await postValidator.validateAndPost(
  validResponse,
  ticket,
  mockPostFn
);

expect(result.success).toBe(false);
expect(result.escalated).toBe(true);
```

## ⚙️ Configuration

### Minimal (No LLM)
```typescript
const config: ValidationConfig = {
  enableLLMValidation: false,
  maxLength: 280,
  minLength: 10,
  prohibitedWords: [],
  maxMentions: 5,
  maxHashtags: 5,
  maxUrls: 4,
  allowedDomains: [],
  toneThreshold: 0.6
};
```

### Full (With LLM)
```typescript
const config: ValidationConfig = {
  enableLLMValidation: true,
  maxLength: 280,
  minLength: 10,
  prohibitedWords: ['spam', 'scam'],
  maxMentions: 5,
  maxHashtags: 5,
  maxUrls: 4,
  allowedDomains: ['twitter.com'],
  toneThreshold: 0.7,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  toneCheckModel: 'claude-3-5-haiku-20241022',
  toneCheckTimeout: 10000
};
```

## 📈 Performance Metrics

### Best Case (Success on attempt 1)
- **Time**: ~300ms
- **Tokens**: ~200 (LLM validation)
- **API Calls**: 2 (validation + post)

### Average Case (Success on attempt 2)
- **Time**: ~5.6s (includes 5s backoff)
- **Tokens**: ~400 (2x validation)
- **API Calls**: 4 (2x validation + 2x post)

### Worst Case (Escalation after 3 attempts)
- **Time**: ~156s (includes all backoffs)
- **Tokens**: ~600 (3x validation)
- **API Calls**: 7 (3x validation + 3x post + escalation)

## 🔍 Debugging

### Enable Debug Logging
```typescript
import { logger } from './utils/logger';
logger.level = 'debug';
```

### Key Log Messages
```typescript
// Starting flow
"Starting post validation flow"

// Each attempt
"Validation attempt" { attempt: N }

// Validation results
"Validation passed" or "Validation failed"

// Post attempts
"Attempting to post"

// Retry triggers
"Handling validation failure with retry"
"Handling post error"

// Escalation
"Escalating ticket to user"

// Final result
"Post published successfully" or "All retry attempts exhausted"
```

## 🚨 Common Issues

### Issue: All attempts fail immediately
**Cause**: Permanent error (auth, prohibited words)
**Solution**: Check validation config and API credentials

### Issue: Timeouts on every attempt
**Cause**: Network issues or slow API
**Solution**: Increase timeouts, check network connectivity

### Issue: High token usage
**Cause**: LLM validation enabled on every attempt
**Solution**: Disable LLM validation or reduce attempts

### Issue: Escalation not working
**Cause**: Database/notification service misconfigured
**Solution**: Check EscalationService dependencies

## 📁 File Locations

```
src/validation/
├── post-validator.ts       # Main orchestrator
├── validation-service.ts   # Post validation
├── retry-service.ts        # Retry logic
├── escalation-service.ts   # User notifications
├── index.ts                # Exports
├── types.ts                # Type definitions
├── README.md               # Full documentation
├── FLOW-DIAGRAM.md         # Visual flow charts
├── QUICK-REFERENCE.md      # This file
└── examples/
    └── complete-flow-example.ts
```

## 🔗 Integration Points

### Phase 1: Database Schema
- `error_log` table for error tracking
- `work_queue` table for ticket status
- `agent_responses` table for response storage

### Phase 2: Work Queue
- `IWorkQueue.assignTicket()` - Assign to worker
- `IWorkQueue.getQueueStats()` - Queue metrics

### Phase 3B: Agent Worker
- `AgentWorker.executeTicket()` - Calls PostValidator
- `ResponseGenerator.generate()` - Creates content

### Phase 5: Future Integrations
- Email notifications via EmailService
- Webhook notifications
- Real-time updates via WebSocket

## 📞 Support

### Questions?
1. Check `README.md` for detailed documentation
2. Review `FLOW-DIAGRAM.md` for visual flow
3. Run `complete-flow-example.ts` for working examples
4. Check logs with `logger.level = 'debug'`

### Contributing
- Follow existing code style
- Add tests for new features
- Update documentation
- Use structured logging

## 🎓 Key Concepts

### Never Throws
PostValidator never throws unhandled exceptions. Always returns a result object.

### Dependency Injection
All dependencies injected via constructor for testability.

### Progressive Enhancement
Retry strategies increase in sophistication with each attempt.

### Graceful Degradation
LLM validation failures don't break the flow (returns permissive default).

### Complete Tracking
All tokens, attempts, duration tracked and returned.

### User-Friendly Errors
Errors shown to users are clear, actionable, no stack traces.

---

**Quick Links:**
- [Full Documentation](./README.md)
- [Flow Diagrams](./FLOW-DIAGRAM.md)
- [Examples](./examples/complete-flow-example.ts)
- [Implementation Summary](../../PHASE-4-POSTVALIDATOR-IMPLEMENTATION.md)
