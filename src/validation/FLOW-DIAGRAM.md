# Phase 4: PostValidator Flow Diagram

## Complete Validation → Retry → Escalation Flow

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                  PostValidator.validateAndPost()          ┃
┃                     Main Entry Point                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                             ▼
        ┌────────────────────────────────────────┐
        │  Update Ticket Status: 'processing'    │
        └────────────────┬───────────────────────┘
                         ▼
        ┌─────────────────────────────────────────────────┐
        │        START ATTEMPT LOOP (max 3 attempts)      │
        │              attempts = 0                        │
        └────────────────┬────────────────────────────────┘
                         ▼
        ╔════════════════════════════════════════════════╗
        ║           ATTEMPT N (N = 1, 2, 3)              ║
        ╚════════════════════════════════════════════════╝
                         ▼
        ┌────────────────────────────────────────┐
        │  Step 1: Validate Response             │
        │  ───────────────────────────           │
        │  • Call ValidationService.validatePost │
        │  • Check rules (length, hashtags, etc) │
        │  • Optional LLM tone check             │
        │  • Track token cost                    │
        └────────────────┬───────────────────────┘
                         ▼
           ┌─────────────────────────┐
           │  Validation Approved?   │
           └──────┬──────────────┬───┘
                  │              │
              YES │              │ NO
                  │              ▼
                  │    ┌──────────────────────┐
                  │    │  Check: canFix?      │
                  │    └──────┬───────────┬───┘
                  │           │           │
                  │       YES │           │ NO or
                  │           │           │ Max Attempts
                  │           ▼           ▼
                  │    ┌──────────┐  ┌──────────────┐
                  │    │  Retry   │  │  ESCALATE    │
                  │    │  Logic   │  │  (goto Step 5)│
                  │    └────┬─────┘  └──────────────┘
                  │         │
                  │         ▼
                  │    ┌─────────────────────────────┐
                  │    │  handleValidationFailure()  │
                  │    │  • Log error                │
                  │    │  • Apply backoff            │
                  │    │  • Continue to next attempt │
                  │    └─────────────────────────────┘
                  │         │
                  │         └───────────┐
                  │                     │
                  ▼                     │
        ┌────────────────────────────────────────┐
        │  Step 2: Validation Passed - Try Post  │
        │  ────────────────────────────────────  │
        │  • Build PostContent                   │
        │  • Call postFn(content)                │
        └────────────────┬───────────────────────┘
                         ▼
           ┌─────────────────────────┐
           │  Post Successful?       │
           └──────┬──────────────┬───┘
                  │              │
              YES │              │ NO
                  │              ▼
                  │    ┌──────────────────────────────┐
                  │    │  Step 3: Classify Error      │
                  │    │  ──────────────────────────  │
                  │    │  • Validation error?         │
                  │    │  • Network error (transient)?│
                  │    │  • Auth error (permanent)?   │
                  │    │  • Rate limit (transient)?   │
                  │    └────────────┬─────────────────┘
                  │                 ▼
                  │    ┌───────────────────────────┐
                  │    │  Error Transient & canFix │
                  │    │  AND attempts < 3?        │
                  │    └────────┬──────────────┬───┘
                  │             │              │
                  │         YES │              │ NO
                  │             ▼              ▼
                  │    ┌────────────────┐  ┌─────────────┐
                  │    │ handlePostError│  │  ESCALATE   │
                  │    │ • Log error    │  │ (goto Step 5)│
                  │    │ • Apply backoff│  └─────────────┘
                  │    │ • Next attempt │
                  │    └────────────────┘
                  │             │
                  │             └────────────┐
                  │                          │
                  ▼                          │
        ┌─────────────────────────────────────────────┐
        │  Step 4: SUCCESS!                           │
        │  ───────────────                            │
        │  • Update ticket status: 'completed'        │
        │  • Return PostValidationResult              │
        │    - success: true                          │
        │    - posted: true                           │
        │    - attempts: N                            │
        │    - postId: string                         │
        │    - totalTokens: sum                       │
        └─────────────────────────────────────────────┘
                         │
                         │
                         └────────> END (Success)


        ╔═══════════════════════════════════════════════╗
        ║       Step 5: ESCALATION FLOW                 ║
        ║  (Reached when all retries exhausted          ║
        ║   or permanent error encountered)             ║
        ╚═══════════════════════════════════════════════╝
                         ▼
        ┌─────────────────────────────────────────────┐
        │  escalateTicket()                           │
        │  ────────────────                           │
        │  • Call EscalationService.escalateToUser    │
        │    - Log error to error_log table           │
        │    - Create system post for user            │
        │    - Send notifications                     │
        │    - Update ticket status: 'failed'         │
        └────────────────┬────────────────────────────┘
                         ▼
        ┌─────────────────────────────────────────────┐
        │  Return PostValidationResult                │
        │  ───────────────────────────                │
        │    - success: false                         │
        │    - posted: false                          │
        │    - attempts: N                            │
        │    - escalated: true                        │
        │    - error: Error                           │
        │    - validationResult: ValidationResult     │
        │    - totalTokens: sum                       │
        │    - totalDurationMs: total                 │
        └─────────────────────────────────────────────┘
                         │
                         │
                         └────────> END (Failure)
```

## Retry Strategy Progression

```
Attempt 1: retry_same
┌─────────────────────────────────┐
│  Strategy: Retry with same      │
│  Delay: 0ms (immediate)         │
│  Rationale: Transient errors    │
│  Success Rate: ~60%             │
└─────────────────────────────────┘
         │ (if fails)
         ▼
Attempt 2: simplify_content
┌─────────────────────────────────┐
│  Strategy: Simplify content     │
│  Actions:                       │
│  • Remove emojis                │
│  • Limit hashtags to 2          │
│  • Truncate to 250 chars        │
│  • Remove media attachments     │
│  Delay: 5s + jitter (±20%)      │
│  Success Rate: ~30%             │
└─────────────────────────────────┘
         │ (if fails)
         ▼
Attempt 3: alternate_agent
┌─────────────────────────────────┐
│  Strategy: Try different agent  │
│  Actions:                       │
│  • Select alternate agent       │
│  • Use different personality    │
│  • Generate new content         │
│  Delay: 30s + jitter (±20%)     │
│  Success Rate: ~10%             │
└─────────────────────────────────┘
         │ (if fails)
         ▼
    ESCALATE TO USER
┌─────────────────────────────────┐
│  All retry attempts exhausted   │
│  • Log comprehensive error      │
│  • Notify user                  │
│  • Create system post           │
│  • Mark ticket as failed        │
└─────────────────────────────────┘
```

## Error Classification Decision Tree

```
         Error Occurs
              │
              ▼
    ┌──────────────────┐
    │  Error Type?     │
    └────┬─────────────┘
         │
         ├─── Validation Error
         │         │
         │         ▼
         │    ┌──────────────────────┐
         │    │  Check severity       │
         │    └────┬─────────────────┘
         │         │
         │         ├─ Length issue → Fixable → Retry with simplify
         │         ├─ Hashtag issue → Fixable → Retry with simplify
         │         ├─ Prohibited words → NOT fixable → Escalate
         │         └─ Tone issue → Fixable → Retry with alternate agent
         │
         ├─── Posting Error
         │         │
         │         ▼
         │    ┌──────────────────────┐
         │    │  HTTP Status Code     │
         │    └────┬─────────────────┘
         │         │
         │         ├─ 429 (Rate Limit) → Transient → Retry with backoff
         │         ├─ 408 (Timeout) → Transient → Retry immediately
         │         ├─ 500 (Server Error) → Transient → Retry with backoff
         │         ├─ 401 (Unauthorized) → Permanent → Escalate
         │         ├─ 403 (Forbidden) → Permanent → Escalate
         │         └─ Network Error → Transient → Retry with backoff
         │
         ├─── Worker Error
         │         │
         │         └─ All worker errors → Permanent → Escalate
         │
         └─── Unknown Error
                   │
                   └─ Assume transient → Retry (safer default)
```

## State Transitions

```
Work Ticket Status Flow:

pending ──────> processing ──────> completed  ✓
   │                │
   │                ├──────> failed  ✗
   │                │
   │                └──────> failed_escalated  ✗✗
   │
   └────────────────> (never transitions directly)

Legend:
  ✓  Success path (post published)
  ✗  Failure path (max retries, no escalation yet)
  ✗✗ Escalation path (user notified)
```

## Token Usage Flow

```
┌─────────────────────────────────┐
│  Agent Response Generation      │
│  Tokens: ~150-300               │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  Validation (Attempt 1)         │
│  Rule checks: 0 tokens          │
│  LLM tone check: ~200 tokens    │
└───────────────┬─────────────────┘
                │
                ├─ Success → Post → END
                │
                └─ Failure → Retry
                             │
                             ▼
┌─────────────────────────────────┐
│  Validation (Attempt 2)         │
│  Rule checks: 0 tokens          │
│  LLM tone check: ~200 tokens    │
└───────────────┬─────────────────┘
                │
                ├─ Success → Post → END
                │
                └─ Failure → Retry
                             │
                             ▼
┌─────────────────────────────────┐
│  Validation (Attempt 3)         │
│  Rule checks: 0 tokens          │
│  LLM tone check: ~200 tokens    │
└───────────────┬─────────────────┘
                │
                ├─ Success → Post → END
                │
                └─ Failure → Escalate → END

Total Tokens (worst case):
  = Initial response (200)
  + Validation attempt 1 (200)
  + Validation attempt 2 (200)
  + Validation attempt 3 (200)
  = 800 tokens maximum
```

## Timing Diagram

```
Time →

Attempt 1 (Immediate):
├─ Validate (200ms)
├─ Post (100ms)
└─ Total: 300ms

   ↓ (if fails)
   └─ Backoff: 0ms

Attempt 2 (After 5s):
├─ Backoff delay (5s ± 1s jitter)
├─ Validate (200ms)
├─ Post (100ms)
└─ Total: ~5.3s

   ↓ (if fails)
   └─ Backoff: 30s ± 6s

Attempt 3 (After 30s):
├─ Backoff delay (30s ± 6s jitter)
├─ Validate (200ms)
├─ Post (100ms)
└─ Total: ~30.3s

   ↓ (if fails)
   └─ Escalate (100ms)

Total time (worst case): ~36s
Total time (best case): 300ms
Average time (2 attempts): ~5.6s
```

## Integration with Agent Worker

```
┌──────────────────────────────────────┐
│        AgentWorker                   │
│                                      │
│  executeTicket(ticket)               │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│  1. Load Context                     │
│     (Phase 1: compose-agent-context) │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│  2. Generate Response                │
│     (Phase 3B: ResponseGenerator)    │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│  3. Validate and Post                │
│     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    │
│     ┃  PostValidator            ┃    │
│     ┃  • Validate response      ┃    │
│     ┃  • Retry with strategies  ┃    │
│     ┃  • Escalate on failure    ┃    │
│     ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│  4. Update Memory                    │
│     (Phase 3B: MemoryUpdater)        │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│  5. Return WorkerResult              │
│     • success                        │
│     • posted                         │
│     • attempts                       │
│     • tokensUsed                     │
└──────────────────────────────────────┘
```

---

**Legend:**
- `┌─┐` : Process box
- `╔═╗` : Important/emphasized process
- `▼` : Flow direction
- `├─` : Decision branch
- `→` : Timeline/sequence
