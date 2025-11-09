# SPARC Specification: Grace Period Post Integration

**Document Version:** 1.0
**Date:** 2025-11-07
**Status:** Active Development
**Author:** System Architect

---

## 1. SPECIFICATION

### 1.1 System Context

The grace period feature currently triggers at 80% of query timeout and logs choices to console. This specification defines the integration with the agent feed posting system to present grace period prompts as interactive posts that users can respond to via comments.

**Current State:**
- Grace period triggers at 80% timeout threshold
- Generates TodoWrite plans with completed/pending steps
- Persists state to `grace_period_states` table
- Presents 4 choices: Continue, Pause, Simplify, Cancel
- Logs to console only (no UI integration)

**Desired State:**
- Grace period creates agent post with TodoWrite plan
- User responds by commenting on the post with choice
- Comment handler detects grace period response
- State updates with user choice
- Execution resumes/pauses/terminates based on choice

### 1.2 Requirements

#### R1: Post Creation on Grace Period Trigger
- **MUST** create agent post when grace period triggers
- **MUST** include TodoWrite plan visualization in post content
- **MUST** display 4 choice options clearly
- **MUST** include stateId in post metadata for tracking
- **MUST** link post to ticket/worker context

#### R2: Comment Detection and Choice Extraction
- **MUST** detect comments on grace period posts
- **MUST** extract user choice from comment content
- **MUST** validate choice is one of: continue, pause, simplify, cancel
- **MUST** handle case-insensitive choice detection
- **MUST** support multiple comment formats (e.g., "Continue", "I choose continue", "[continue]")

#### R3: State Update Flow
- **MUST** update `grace_period_states.user_choice` when choice detected
- **MUST** record `user_choice_at` timestamp
- **MUST** trigger appropriate action based on choice:
  - **Continue**: Extend timeout by 120s, resume execution
  - **Pause**: Save state, halt execution gracefully
  - **Simplify**: Reduce scope, complete essential tasks only
  - **Cancel**: Terminate execution, return partial results
- **MUST** prevent duplicate choice processing

#### R4: Error Handling and Edge Cases
- **MUST** handle invalid choices gracefully (inform user)
- **MUST** handle expired grace period states (no-op or inform)
- **MUST** handle missing stateId in post metadata
- **MUST** handle concurrent choice submissions (first wins)
- **MUST** provide user feedback on choice processing

### 1.3 Constraints

#### C1: No Mocks (Except Claude SDK)
- **MUST** use real Better-SQLite3 database
- **MUST** use real post creation via database-selector
- **MUST** use real comment handling
- **MUST** mock only Claude SDK (`sdkManager.executeHeadlessTask`)

#### C2: Existing Architecture
- **MUST** integrate with existing `GracePeriodHandler` class
- **MUST** use existing `grace_period_states` table schema
- **MUST** integrate with existing comment API endpoints
- **MUST** use existing database-selector abstraction

#### C3: Data Consistency
- **MUST** maintain referential integrity (foreign keys)
- **MUST** handle concurrent access safely
- **MUST** prevent race conditions on choice updates
- **MUST** ensure idempotent operations

### 1.4 Success Criteria

#### SC1: Post Creation
- Grace period triggers and creates post with ID
- Post contains formatted TodoWrite plan
- Post metadata contains `stateId` and `gracePeriod: true`
- Post is visible in feed immediately

#### SC2: Comment Handling
- User comments with choice text (e.g., "continue")
- Comment handler extracts choice correctly
- Database updates with choice and timestamp
- User receives confirmation comment/notification

#### SC3: State Updates
- `grace_period_states` table reflects user choice
- Appropriate action triggered based on choice
- Execution state transitions correctly
- No duplicate processing occurs

#### SC4: End-to-End Flow
- Grace period triggers → Post created → User comments → Choice recorded → Action executed
- Test completes without errors
- Database state is consistent
- Logs show complete trace of operations

---

## 2. PSEUDOCODE

### 2.1 Grace Period Post Creation Algorithm

```pseudocode
FUNCTION createGracePeriodPost(gracePeriodContext, plan, stateId):
  INPUT:
    - gracePeriodContext: { stateId, workerId, ticketId, query, timeoutMs, startTime }
    - plan: Array of TodoWrite steps { content, status, activeForm }
    - stateId: Unique identifier for grace period state

  OUTPUT:
    - postId: ID of created post

  ALGORITHM:
    1. Calculate progress metrics
       elapsed = (currentTime - gracePeriodContext.startTime) / 1000
       remaining = (gracePeriodContext.timeoutMs - (currentTime - gracePeriodContext.startTime)) / 1000
       percentComplete = (elapsed / (gracePeriodContext.timeoutMs / 1000)) * 100

    2. Format TodoWrite plan as markdown
       planMarkdown = "## Current Progress\n\n"
       FOR EACH step IN plan:
         emoji = step.status == 'completed' ? '✅' : '⏳'
         planMarkdown += `${emoji} ${step.content}\n`
       END FOR

    3. Build post content
       content = """
       ⏳ **Grace Period Triggered**

       This task is taking longer than expected. I've made progress but need your guidance to continue.

       ${planMarkdown}

       ## Time Status
       - ⏱️ Elapsed: ${elapsed}s
       - ⏰ Remaining: ${remaining}s
       - 📊 Progress: ${percentComplete}%

       ## What would you like me to do?

       Reply with one of these options:
       - **Continue** - Keep working (+120s extension)
       - **Pause** - Save progress and let me review
       - **Simplify** - Complete essential parts only
       - **Cancel** - Stop now and show what's completed
       """

    4. Create post metadata
       metadata = {
         gracePeriod: true,
         stateId: stateId,
         workerId: gracePeriodContext.workerId,
         ticketId: gracePeriodContext.ticketId,
         choices: ['continue', 'pause', 'simplify', 'cancel'],
         triggeredAt: currentTime
       }

    5. Insert post into database
       postData = {
         id: `grace-period-${stateId}`,
         author_agent: 'system',
         title: '⏳ Grace Period - Task Progress Update',
         content: content,
         metadata: metadata,
         tags: ['grace-period', 'system-notification']
       }

       post = database.createPost('system', postData)

    6. Return post ID
       RETURN post.id
END FUNCTION
```

### 2.2 Comment Detection and Choice Extraction Logic

```pseudocode
FUNCTION handleCommentOnPost(postId, commentData):
  INPUT:
    - postId: ID of post being commented on
    - commentData: { content, author, author_user_id }

  OUTPUT:
    - processedChoice: { success, choice, action } or null

  ALGORITHM:
    1. Retrieve post from database
       post = database.getPostById(postId)
       IF post == null OR post.metadata.gracePeriod != true:
         RETURN null  // Not a grace period post
       END IF

    2. Extract stateId from post metadata
       stateId = post.metadata.stateId
       IF stateId == null:
         LOG ERROR: "Grace period post missing stateId"
         RETURN null
       END IF

    3. Check if choice already recorded
       state = database.query("SELECT user_choice FROM grace_period_states WHERE id = ?", stateId)
       IF state.user_choice != null:
         RETURN { success: false, error: "Choice already recorded", choice: state.user_choice }
       END IF

    4. Extract choice from comment content
       content = commentData.content.toLowerCase().trim()
       choice = extractChoice(content)  // See extractChoice pseudocode below

       IF choice == null:
         RETURN { success: false, error: "Invalid choice. Please reply with: continue, pause, simplify, or cancel" }
       END IF

    5. Record choice in database
       database.execute("UPDATE grace_period_states SET user_choice = ?, user_choice_at = CURRENT_TIMESTAMP WHERE id = ?", [choice, stateId])

    6. Get action for choice
       action = getActionForChoice(choice)  // See action mapping below

    7. Create confirmation comment
       confirmationText = `✅ Choice recorded: **${choice}**\n\n${action.message}`
       database.createComment('system', {
         post_id: postId,
         parent_id: commentData.id,
         author_agent: 'system',
         content: confirmationText
       })

    8. Return processed choice
       RETURN { success: true, choice: choice, action: action.action }
END FUNCTION

FUNCTION extractChoice(commentContent):
  INPUT: commentContent (string, lowercase)
  OUTPUT: choice (string) or null

  ALGORITHM:
    // Pattern matching for choice extraction
    validChoices = ['continue', 'pause', 'simplify', 'cancel']

    FOR EACH choice IN validChoices:
      // Match exact word or common variations
      patterns = [
        `^${choice}$`,                    // Exact: "continue"
        `^i choose ${choice}$`,           // "I choose continue"
        `^\\[${choice}\\]$`,              // "[continue]"
        `^choice: ${choice}$`,            // "choice: continue"
        `\\b${choice}\\b`                 // Word boundary match
      ]

      FOR EACH pattern IN patterns:
        IF commentContent MATCHES pattern:
          RETURN choice
        END IF
      END FOR
    END FOR

    RETURN null  // No valid choice found
END FUNCTION
```

### 2.3 State Update Flow

```pseudocode
FUNCTION getActionForChoice(choice):
  INPUT: choice (string)
  OUTPUT: { action, message, extensionMs? }

  ALGORITHM:
    actionMap = {
      'continue': {
        action: 'extend_timeout',
        extensionMs: 120000,
        message: 'Extending timeout by 120 seconds. Execution will continue.'
      },
      'pause': {
        action: 'save_state',
        message: 'State saved. You can resume this task later using the state ID.'
      },
      'simplify': {
        action: 'reduce_scope',
        message: 'Reducing scope to essential tasks only. Skipping optional features.'
      },
      'cancel': {
        action: 'terminate',
        message: 'Terminating execution. Partial results will be returned.'
      }
    }

    RETURN actionMap[choice]
END FUNCTION

FUNCTION executeGracePeriodAction(stateId, choice):
  INPUT:
    - stateId: Grace period state identifier
    - choice: User's choice

  OUTPUT:
    - executionResult: Result of action execution

  ALGORITHM:
    1. Retrieve saved state
       state = database.query("SELECT * FROM grace_period_states WHERE id = ?", stateId)
       IF state == null:
         RETURN { error: "State not found" }
       END IF

    2. Get action details
       action = getActionForChoice(choice)

    3. Execute action based on choice
       SWITCH action.action:
         CASE 'extend_timeout':
           // Resume execution with extended timeout
           newTimeoutMs = state.timeoutMs + action.extensionMs
           resumeExecution(state.worker_id, state.ticket_id, newTimeoutMs)
           RETURN { success: true, action: 'resumed', newTimeout: newTimeoutMs }

         CASE 'save_state':
           // State already saved, just confirm
           RETURN { success: true, action: 'paused', stateId: stateId }

         CASE 'reduce_scope':
           // Filter plan to essential tasks only
           essentialPlan = filterEssentialTasks(state.plan)
           resumeExecutionWithPlan(state.worker_id, state.ticket_id, essentialPlan)
           RETURN { success: true, action: 'simplified', plan: essentialPlan }

         CASE 'terminate':
           // Terminate worker and return partial results
           terminateWorker(state.worker_id)
           RETURN { success: true, action: 'terminated', partialResults: state.partial_results }
       END SWITCH
END FUNCTION
```

### 2.4 Error Handling and Edge Cases

```pseudocode
FUNCTION handleGracePeriodErrors():

  // Edge Case 1: Duplicate choice submission
  IF user submits second comment with different choice:
    RESPOND: "Choice already recorded as '${existingChoice}'. Cannot change after submission."
    RETURN without updating database

  // Edge Case 2: Invalid choice format
  IF comment does not match any valid choice:
    RESPOND: "Invalid choice. Please reply with exactly one of: continue, pause, simplify, cancel"
    RETURN without updating database

  // Edge Case 3: Expired grace period state
  IF state.expires_at < currentTime:
    RESPOND: "This grace period has expired. The task has already completed or timed out."
    RETURN without processing

  // Edge Case 4: Missing stateId in post
  IF post.metadata.stateId == null:
    LOG ERROR: "Grace period post missing stateId"
    RESPOND: "System error: Unable to process choice. Please contact support."
    RETURN without updating

  // Edge Case 5: Concurrent choice submissions (race condition)
  USE database transaction with row-level locking:
    BEGIN TRANSACTION
    SELECT user_choice FROM grace_period_states WHERE id = ? FOR UPDATE
    IF user_choice != null:
      ROLLBACK
      RESPOND: "Choice already recorded"
    ELSE:
      UPDATE grace_period_states SET user_choice = ?, user_choice_at = NOW() WHERE id = ?
      COMMIT
    END IF

  // Edge Case 6: Comment on wrong post type
  IF post.metadata.gracePeriod != true:
    RETURN null  // Ignore comment, not a grace period post
END FUNCTION
```

---

## 3. ARCHITECTURE

### 3.1 Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    Grace Period Post Integration                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ worker-protection.js │  ← Query execution with protection
└──────────┬───────────┘
           │
           │ 1. Grace period triggers at 80% timeout
           ↓
┌──────────────────────────┐
│ GracePeriodHandler       │  ← Monitors execution, generates plan
│ - startMonitoring()      │
│ - shouldTrigger()        │
│ - captureExecutionState()│
│ - generateTodoWritePlan()│
│ - persistState()         │
└──────────┬───────────────┘
           │
           │ 2. Create grace period post
           ↓
┌──────────────────────────┐
│ createGracePeriodPost()  │  ← NEW: Creates agent post
│ (in grace-period-handler │
│  or server.js)           │
└──────────┬───────────────┘
           │
           │ 3. Insert post via database-selector
           ↓
┌──────────────────────────┐
│ database-selector.js     │  ← Database abstraction layer
│ - createPost()           │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ SQLite: agent_posts      │  ← Post storage
│ - id                     │
│ - authorAgent: 'system'  │
│ - content: plan + choices│
│ - metadata: {            │
│     gracePeriod: true,   │
│     stateId: "gps-...",  │
│     choices: [...]       │
│   }                      │
└──────────────────────────┘

┌──────────────────────────┐
│ User views post in feed  │
│ and submits comment      │
└──────────┬───────────────┘
           │
           │ 4. Comment posted
           ↓
┌──────────────────────────┐
│ POST /api/agent-posts/   │  ← Comment API endpoint
│ :postId/comments         │     (server.js line 1630)
└──────────┬───────────────┘
           │
           │ 5. Check if grace period post
           ↓
┌──────────────────────────┐
│ handleGracePeriodChoice()│  ← NEW: Comment handler
│ (in server.js or new     │
│  route handler)          │
└──────────┬───────────────┘
           │
           │ 6. Extract choice, update state
           ↓
┌──────────────────────────┐
│ GracePeriodHandler       │
│ - recordUserChoice()     │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ SQLite:                  │  ← State storage
│ grace_period_states      │
│ - user_choice            │
│ - user_choice_at         │
└──────────┬───────────────┘
           │
           │ 7. Execute action
           ↓
┌──────────────────────────┐
│ executeGracePeriodAction │  ← NEW: Action executor
│ - extend_timeout         │
│ - save_state             │
│ - reduce_scope           │
│ - terminate              │
└──────────────────────────┘
```

### 3.2 Comment Handler Integration

**Location:** `server.js` (lines 1630-1700, existing comment endpoint)

**Modification:**

```javascript
// Existing endpoint (server.js:1630)
app.post('/api/agent-posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, author_agent, user_id } = req.body;

    // Validation (existing code)
    if (!content || !postId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // NEW: Check if this is a grace period post
    const post = await dbSelector.getPostById(postId);
    if (post && post.metadata) {
      const metadata = typeof post.metadata === 'string'
        ? JSON.parse(post.metadata)
        : post.metadata;

      if (metadata.gracePeriod === true && metadata.stateId) {
        // Handle grace period choice
        const choiceResult = await handleGracePeriodChoice(
          metadata.stateId,
          content,
          postId,
          { author_agent, user_id }
        );

        if (choiceResult) {
          // Choice processed, create confirmation comment
          const confirmComment = await dbSelector.createComment('system', {
            post_id: postId,
            author_agent: 'system',
            content: choiceResult.confirmationMessage
          });

          return res.status(201).json({
            comment: confirmComment,
            gracePeriodChoice: choiceResult
          });
        }
      }
    }

    // Standard comment handling (existing code)
    const comment = await dbSelector.createComment(user_id || 'anonymous', {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      post_id: postId,
      author: author_agent,
      author_agent,
      author_user_id: user_id || 'anonymous',
      content
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});
```

### 3.3 Data Flow Diagram (ASCII Art)

```
┌─────────────┐
│   Worker    │  Query exceeds 80% timeout
│ Protection  │
└──────┬──────┘
       │
       │ shouldTrigger() == true
       ↓
┌──────────────────────────────────────────────┐
│        Grace Period Handler                  │
│  1. captureExecutionState()                  │
│  2. generateTodoWritePlan()                  │
│  3. presentUserChoices()                     │
│  4. persistState() → grace_period_states     │
│  5. NEW: createGracePeriodPost()             │
└──────┬───────────────────────────────────────┘
       │
       │ createPost()
       ↓
┌──────────────────────────────────────────────┐
│        Database Selector                     │
│  INSERT INTO agent_posts (                   │
│    id: 'grace-period-gps-...',               │
│    authorAgent: 'system',                    │
│    content: <formatted plan + choices>,      │
│    metadata: { gracePeriod: true, stateId }  │
│  )                                           │
└──────┬───────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────┐
│         SQLite Database                      │
│  ┌──────────────────┐ ┌───────────────────┐ │
│  │  agent_posts     │ │ grace_period_     │ │
│  │  - id            │ │ states            │ │
│  │  - content       │ │ - id (stateId)    │ │
│  │  - metadata ─────┼─┼─→ - worker_id     │ │
│  │    {gracePeriod, │ │   - ticket_id     │ │
│  │     stateId}     │ │   - plan          │ │
│  └──────────────────┘ │   - user_choice   │ │
│                       │   - user_choice_at│ │
│                       └───────────────────┘ │
└──────┬───────────────────────────────────────┘
       │
       │ User views feed
       ↓
┌──────────────────────────────────────────────┐
│            Frontend / User                   │
│  1. Sees grace period post with choices      │
│  2. Submits comment: "continue"              │
└──────┬───────────────────────────────────────┘
       │
       │ POST /api/agent-posts/:postId/comments
       ↓
┌──────────────────────────────────────────────┐
│      Comment API Endpoint (server.js)        │
│  1. getPostById(postId)                      │
│  2. Check metadata.gracePeriod == true       │
│  3. Extract metadata.stateId                 │
│  4. Call handleGracePeriodChoice()           │
└──────┬───────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────┐
│    handleGracePeriodChoice() [NEW]           │
│  1. Validate choice from comment content     │
│  2. Check if choice already recorded         │
│  3. UPDATE grace_period_states               │
│     SET user_choice = 'continue',            │
│         user_choice_at = NOW()               │
│  4. Create confirmation comment              │
│  5. Execute action (extend timeout, etc.)    │
└──────┬───────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────┐
│         Action Executor                      │
│  CASE 'continue':                            │
│    - Extend timeout by 120s                  │
│    - Resume worker execution                 │
│  CASE 'pause':                               │
│    - State already saved                     │
│    - Halt worker gracefully                  │
│  CASE 'simplify':                            │
│    - Filter plan to essentials              │
│    - Resume with reduced scope               │
│  CASE 'cancel':                              │
│    - Terminate worker                        │
│    - Return partial results                  │
└──────────────────────────────────────────────┘
```

### 3.4 Database Schema Interaction

**Existing Tables:**

1. **`grace_period_states`** (migration 017)
   - Stores execution state when grace period triggers
   - Tracks user choice and timing
   - Foreign key to `work_queue.ticket_id`

2. **`agent_posts`**
   - Stores all agent posts (existing)
   - New grace period posts will use:
     - `authorAgent: 'system'`
     - `metadata: { gracePeriod: true, stateId: '...' }`

3. **`comments`**
   - Stores user comments on posts (existing)
   - Grace period comments will be parsed for choice

**Schema Relationships:**

```sql
┌─────────────────────────────────────────────────┐
│ grace_period_states                             │
│ ─────────────────────────────────────────────── │
│ id TEXT PRIMARY KEY (e.g., 'gps-1730...-a1b2') │ ←─┐
│ worker_id TEXT NOT NULL                         │   │
│ ticket_id TEXT NOT NULL (FK to work_queue)      │   │
│ query TEXT NOT NULL                             │   │
│ partial_results TEXT (JSON)                     │   │
│ execution_state TEXT NOT NULL (JSON)            │   │
│ plan TEXT (JSON - TodoWrite plan)               │   │
│ user_choice TEXT ('continue'|'pause'|...)       │   │ Referenced by
│ user_choice_at DATETIME                         │   │ metadata.stateId
│ created_at DATETIME DEFAULT CURRENT_TIMESTAMP   │   │
│ expires_at DATETIME NOT NULL                    │   │
│ resumed BOOLEAN DEFAULT 0                       │   │
│ resumed_at DATETIME                             │   │
└─────────────────────────────────────────────────┘   │
                                                      │
┌─────────────────────────────────────────────────┐   │
│ agent_posts                                     │   │
│ ─────────────────────────────────────────────── │   │
│ id TEXT PRIMARY KEY                             │   │
│ authorAgent TEXT ('system' for grace periods)   │   │
│ content TEXT (formatted plan + choices)         │   │
│ title TEXT                                      │   │
│ publishedAt DATETIME                            │   │
│ metadata TEXT (JSON) ──────────────────────────────┘
│   {                                             │
│     gracePeriod: true,                          │
│     stateId: 'gps-...',  ← Links to grace_period_states.id
│     workerId: '...',                            │
│     ticketId: '...',                            │
│     choices: ['continue', 'pause', ...]         │
│   }                                             │
│ engagement TEXT (JSON)                          │
└─────────────────────────────────────────────────┘
         │
         │ Referenced by post_id
         ↓
┌─────────────────────────────────────────────────┐
│ comments                                        │
│ ─────────────────────────────────────────────── │
│ id TEXT PRIMARY KEY                             │
│ post_id TEXT (FK to agent_posts)                │
│ parent_id TEXT                                  │
│ author TEXT                                     │
│ author_agent TEXT                               │
│ author_user_id TEXT                             │
│ content TEXT (contains user choice)             │
│ content_type TEXT                               │
│ created_at DATETIME                             │
└─────────────────────────────────────────────────┘
```

---

## 4. REFINEMENT

### 4.1 TDD Approach

**Test-First Development Workflow:**

1. **Write failing tests** for each component
2. **Implement minimal code** to make tests pass
3. **Refactor** for clarity and maintainability
4. **Repeat** for each feature

**Test Categories:**

1. **Unit Tests** - Individual functions (pure logic)
2. **Integration Tests** - Database + handlers working together
3. **E2E Tests** - Full flow from post creation to choice execution

### 4.2 Test Cases

#### TC-GPPI-001: Grace Period Post Creation

**Test:** `should create agent post when grace period triggers`

```javascript
describe('TC-GPPI-001: Grace Period Post Creation', () => {
  it('should create post with TodoWrite plan and choices', async () => {
    // Setup
    const context = createGracePeriodContext();
    const plan = generateSamplePlan();

    // Execute
    const postId = await createGracePeriodPost(context, plan, context.stateId);

    // Assert
    const post = await db.getPostById(postId);
    expect(post).toBeTruthy();
    expect(post.authorAgent).toBe('system');
    expect(post.content).toContain('Grace Period Triggered');
    expect(post.content).toContain('Continue');
    expect(post.content).toContain('Pause');

    const metadata = JSON.parse(post.metadata);
    expect(metadata.gracePeriod).toBe(true);
    expect(metadata.stateId).toBe(context.stateId);
    expect(metadata.choices).toEqual(['continue', 'pause', 'simplify', 'cancel']);
  });

  it('should format TodoWrite plan correctly in post content', async () => {
    const plan = [
      { content: 'Step 1', status: 'completed', activeForm: 'Completing step 1' },
      { content: 'Step 2', status: 'pending', activeForm: 'Completing step 2' }
    ];

    const postId = await createGracePeriodPost(context, plan, stateId);
    const post = await db.getPostById(postId);

    expect(post.content).toContain('✅ Step 1');  // Completed
    expect(post.content).toContain('⏳ Step 2');  // Pending
  });
});
```

#### TC-GPPI-002: Comment Choice Detection

**Test:** `should extract valid choice from comment content`

```javascript
describe('TC-GPPI-002: Comment Choice Detection', () => {
  it('should detect exact choice words', () => {
    const testCases = [
      { input: 'continue', expected: 'continue' },
      { input: 'Continue', expected: 'continue' },
      { input: 'CONTINUE', expected: 'continue' },
      { input: 'pause', expected: 'pause' },
      { input: 'simplify', expected: 'simplify' },
      { input: 'cancel', expected: 'cancel' }
    ];

    for (const { input, expected } of testCases) {
      const choice = extractChoice(input);
      expect(choice).toBe(expected);
    }
  });

  it('should detect choice in natural language', () => {
    const testCases = [
      { input: 'I choose continue', expected: 'continue' },
      { input: 'Please pause this', expected: 'pause' },
      { input: 'Let\'s simplify', expected: 'simplify' },
      { input: 'I want to cancel', expected: 'cancel' }
    ];

    for (const { input, expected } of testCases) {
      const choice = extractChoice(input);
      expect(choice).toBe(expected);
    }
  });

  it('should return null for invalid choices', () => {
    const invalidInputs = [
      'hello world',
      'something else',
      'maybe later',
      'not a valid choice'
    ];

    for (const input of invalidInputs) {
      const choice = extractChoice(input);
      expect(choice).toBeNull();
    }
  });
});
```

#### TC-GPPI-003: State Update on Choice

**Test:** `should update grace_period_states with user choice`

```javascript
describe('TC-GPPI-003: State Update on Choice', () => {
  it('should record user choice in database', async () => {
    // Setup: Create grace period state
    const stateId = await createGracePeriodState();

    // Execute: User comments with choice
    await handleGracePeriodChoice(stateId, 'continue', postId, {
      author_agent: 'user-1',
      user_id: 'user-1'
    });

    // Assert: Database updated
    const state = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
    expect(state.user_choice).toBe('continue');
    expect(state.user_choice_at).toBeTruthy();
  });

  it('should prevent duplicate choice updates', async () => {
    const stateId = await createGracePeriodState();

    // First choice
    await handleGracePeriodChoice(stateId, 'continue', postId, { user_id: 'user-1' });

    // Second choice (should fail)
    const result = await handleGracePeriodChoice(stateId, 'pause', postId, { user_id: 'user-1' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('already recorded');

    // Verify first choice still in database
    const state = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
    expect(state.user_choice).toBe('continue');  // Not changed to 'pause'
  });
});
```

#### TC-GPPI-004: End-to-End Flow

**Test:** `should complete full flow from trigger to choice execution`

```javascript
describe('TC-GPPI-004: End-to-End Grace Period Flow', () => {
  it('should handle complete grace period lifecycle', async () => {
    // Phase 1: Grace period triggers
    const mockSdk = createMockSdkManager({
      delayMs: 5000,  // Trigger grace period at 80% of 5000ms = 4000ms
      messages: generateLongRunningMessages()
    });

    const result = await executeProtectedQuery('complex task', {
      workerId: 'worker-1',
      ticketId: 'ticket-1',
      sdkManager: mockSdk,
      timeoutOverride: 5000
    });

    expect(result.gracePeriodTriggered).toBe(true);
    expect(result.gracePeriodStateId).toBeTruthy();

    const stateId = result.gracePeriodStateId;

    // Phase 2: Verify post created
    const posts = await db.getAllPosts();
    const gracePeriodPost = posts.find(p => {
      const metadata = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata;
      return metadata.gracePeriod === true && metadata.stateId === stateId;
    });

    expect(gracePeriodPost).toBeTruthy();
    expect(gracePeriodPost.content).toContain('Grace Period Triggered');

    // Phase 3: User submits choice via comment
    const comment = await db.createComment('user-1', {
      post_id: gracePeriodPost.id,
      author_agent: 'user-1',
      content: 'continue'
    });

    // Simulate comment handler processing
    await handleGracePeriodChoice(stateId, comment.content, gracePeriodPost.id, {
      author_agent: 'user-1',
      user_id: 'user-1'
    });

    // Phase 4: Verify choice recorded
    const state = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
    expect(state.user_choice).toBe('continue');
    expect(state.user_choice_at).toBeTruthy();

    // Phase 5: Verify confirmation comment created
    const comments = await db.getCommentsByPostId(gracePeriodPost.id);
    const confirmationComment = comments.find(c => c.author_agent === 'system');
    expect(confirmationComment).toBeTruthy();
    expect(confirmationComment.content).toContain('Choice recorded: **continue**');
  });
});
```

### 4.3 Mock Strategy

**Only Mock Claude SDK:**

```javascript
function createMockSdkManager(options = {}) {
  const {
    delayMs = 1000,
    messages = [],
    shouldError = false,
    errorType = null
  } = options;

  return {
    async *executeHeadlessTask(query) {
      const startTime = Date.now();

      for (const message of messages) {
        // Simulate realistic timing
        const elapsed = Date.now() - startTime;
        if (elapsed < delayMs) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        yield message;

        // Simulate errors if requested
        if (shouldError && Math.random() > 0.8) {
          throw new Error(errorType || 'SDK_ERROR');
        }
      }

      // Final result message
      yield {
        type: 'result',
        success: true
      };
    }
  };
}
```

**All Other Components Use Real Implementations:**
- Real Better-SQLite3 database (in-memory for tests)
- Real `GracePeriodHandler` class
- Real `database-selector` methods
- Real post/comment creation logic

### 4.4 Test Organization

```
tests/
├── integration/
│   ├── grace-period-post-creation.test.js
│   ├── grace-period-comment-handling.test.js
│   └── grace-period-e2e-flow.test.js
├── unit/
│   ├── extract-choice.test.js
│   ├── format-grace-period-content.test.js
│   └── get-action-for-choice.test.js
└── fixtures/
    ├── grace-period-contexts.js
    ├── sample-plans.js
    └── mock-sdk.js
```

---

## 5. COMPLETION

### 5.1 Validation Checklist

#### VC-1: Post Creation Validation

- [ ] Grace period triggers and creates post
- [ ] Post ID follows naming convention: `grace-period-${stateId}`
- [ ] Post `authorAgent` is `'system'`
- [ ] Post content includes formatted TodoWrite plan
- [ ] Post content includes all 4 choice options
- [ ] Post content includes progress metrics (elapsed, remaining, %)
- [ ] Post metadata contains:
  - [ ] `gracePeriod: true`
  - [ ] `stateId: <valid-state-id>`
  - [ ] `workerId: <worker-id>`
  - [ ] `ticketId: <ticket-id>`
  - [ ] `choices: ['continue', 'pause', 'simplify', 'cancel']`
- [ ] Post is visible in feed immediately
- [ ] Post timestamp matches trigger time

#### VC-2: Comment Handling Validation

- [ ] Comment API detects grace period posts
- [ ] Choice extraction works for:
  - [ ] Exact matches: "continue", "pause", etc.
  - [ ] Case variations: "Continue", "PAUSE", etc.
  - [ ] Natural language: "I choose continue", etc.
  - [ ] Bracketed format: "[continue]", etc.
- [ ] Invalid choices rejected with helpful error
- [ ] Choice recorded in `grace_period_states` table
- [ ] Timestamp `user_choice_at` set correctly
- [ ] Duplicate choices prevented (first wins)
- [ ] Confirmation comment created by system
- [ ] Confirmation comment references original comment

#### VC-3: State Update Validation

- [ ] Database transaction prevents race conditions
- [ ] Only one choice can be recorded per state
- [ ] Choice persists across database restarts
- [ ] State expiration honored (no updates to expired states)
- [ ] Foreign key constraints maintained
- [ ] Indexes used for efficient lookups

#### VC-4: Action Execution Validation

- [ ] **Continue**: Timeout extended by 120s
- [ ] **Continue**: Worker execution resumes
- [ ] **Pause**: State remains saved
- [ ] **Pause**: Worker halts gracefully
- [ ] **Simplify**: Plan filtered to essentials
- [ ] **Simplify**: Worker resumes with reduced scope
- [ ] **Cancel**: Worker terminates immediately
- [ ] **Cancel**: Partial results returned

### 5.2 E2E Test Scenarios

#### E2E-001: Happy Path - User Chooses Continue

```
Given:
  - Complex query executing
  - Grace period triggers at 80% timeout
  - Post created successfully

When:
  - User views grace period post
  - User comments: "continue"

Then:
  - Comment handler extracts "continue"
  - Database updates: user_choice = 'continue'
  - Confirmation comment posted
  - Timeout extended by 120s
  - Worker execution resumes
  - Query completes successfully
```

#### E2E-002: User Chooses Pause

```
Given:
  - Grace period triggered
  - Post created with state ID

When:
  - User comments: "pause"

Then:
  - Choice recorded in database
  - Worker halts gracefully
  - Partial results saved
  - State marked as paused
  - User can resume later via state ID
```

#### E2E-003: Invalid Choice Handling

```
Given:
  - Grace period post exists

When:
  - User comments: "maybe later"

Then:
  - extractChoice() returns null
  - Error message posted as comment
  - Message explains valid choices
  - No database update occurs
  - User can try again with valid choice
```

#### E2E-004: Concurrent Choice Submissions

```
Given:
  - Grace period post exists
  - Two users comment simultaneously

When:
  - User A comments: "continue" at T+0ms
  - User B comments: "cancel" at T+5ms

Then:
  - Database transaction ensures atomicity
  - First choice (User A's "continue") wins
  - User B receives "already recorded" error
  - Only one choice in database
  - Appropriate action (continue) executes
```

#### E2E-005: Expired State Handling

```
Given:
  - Grace period state created 25 hours ago
  - State TTL is 24 hours

When:
  - User comments with choice

Then:
  - State detected as expired
  - Error message: "grace period has expired"
  - No database update
  - No action execution
```

### 5.3 Performance Expectations

#### PE-1: Post Creation Latency
- **Target**: < 100ms from trigger to post insertion
- **Measurement**: Time between `shouldTrigger()` returning true and post appearing in database
- **Acceptable**: 100-200ms
- **Critical**: > 500ms

#### PE-2: Comment Processing Latency
- **Target**: < 50ms from comment submission to choice recorded
- **Measurement**: Time between POST /comments and database UPDATE complete
- **Acceptable**: 50-100ms
- **Critical**: > 200ms

#### PE-3: Database Query Performance
- **Indexes Required**:
  - `idx_grace_period_states_stateId` (already exists via PRIMARY KEY)
  - `idx_agent_posts_metadata` (consider adding for gracePeriod lookups)
- **Query Performance**:
  - State lookup by ID: < 1ms
  - Post lookup by ID: < 1ms
  - Choice update: < 5ms (with transaction)

#### PE-4: Concurrent Access
- **Expected Throughput**: 10-50 grace period triggers per minute
- **Expected Concurrent Comments**: 1-5 per grace period post
- **Database Lock Contention**: Minimal (row-level locking)

### 5.4 Monitoring and Logging

**Log Events to Track:**

1. **Grace Period Triggered**
   ```
   🕐 Grace period triggered: stateId=gps-..., workerId=worker-1, ticketId=ticket-1
   ```

2. **Post Created**
   ```
   📝 Grace period post created: postId=grace-period-gps-..., stateId=gps-...
   ```

3. **Choice Detected**
   ```
   ✅ Grace period choice detected: choice=continue, stateId=gps-..., userId=user-1
   ```

4. **Choice Recorded**
   ```
   💾 Grace period choice recorded: choice=continue, stateId=gps-..., timestamp=2025-11-07T...
   ```

5. **Action Executed**
   ```
   ⚡ Grace period action executed: action=extend_timeout, newTimeout=120000ms
   ```

6. **Errors**
   ```
   ❌ Grace period error: Invalid choice 'maybe' from user-1
   ⚠️ Grace period error: State gps-... expired at 2025-11-06T...
   🚫 Grace period error: Choice already recorded as 'continue'
   ```

### 5.5 Acceptance Criteria Summary

**Feature Complete When:**

1. ✅ Grace period triggers at 80% timeout
2. ✅ Post created with formatted plan and choices
3. ✅ Post metadata includes stateId and gracePeriod flag
4. ✅ User can comment on post with choice
5. ✅ Comment handler detects and extracts choice
6. ✅ Database updates with user choice
7. ✅ Duplicate choices prevented
8. ✅ Confirmation comment posted
9. ✅ Appropriate action executes based on choice
10. ✅ All tests pass (unit + integration + E2E)
11. ✅ Performance metrics met
12. ✅ Logging and monitoring in place

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Post Creation (Priority: HIGH)

**Tasks:**
1. Implement `createGracePeriodPost()` function
2. Add post creation to `GracePeriodHandler` or `worker-protection.js`
3. Write unit tests for post content formatting
4. Write integration test for post creation
5. Verify post appears in feed

**Deliverable:** Grace period posts created automatically on trigger

### Phase 2: Comment Detection (Priority: HIGH)

**Tasks:**
1. Implement `extractChoice()` function with pattern matching
2. Add grace period detection to comment endpoint
3. Write unit tests for choice extraction (all formats)
4. Write integration test for comment handling
5. Test invalid choice rejection

**Deliverable:** Comments parsed and choices extracted

### Phase 3: State Updates (Priority: HIGH)

**Tasks:**
1. Implement `handleGracePeriodChoice()` function
2. Add database transaction for choice recording
3. Implement duplicate choice prevention
4. Write integration tests for state updates
5. Test race condition handling

**Deliverable:** User choices recorded in database

### Phase 4: Action Execution (Priority: MEDIUM)

**Tasks:**
1. Implement `executeGracePeriodAction()` function
2. Add action handlers for each choice type
3. Implement timeout extension logic
4. Implement scope reduction logic
5. Write tests for each action type

**Deliverable:** Actions execute based on user choice

### Phase 5: Confirmation & Feedback (Priority: MEDIUM)

**Tasks:**
1. Implement confirmation comment creation
2. Add error messages for invalid/duplicate choices
3. Write tests for feedback mechanisms
4. Test user experience flow

**Deliverable:** Users receive clear feedback on choices

### Phase 6: E2E Testing (Priority: HIGH)

**Tasks:**
1. Write E2E test: happy path (continue)
2. Write E2E test: pause flow
3. Write E2E test: invalid choice handling
4. Write E2E test: concurrent submissions
5. Write E2E test: expired state handling

**Deliverable:** Complete E2E test coverage

### Phase 7: Performance & Monitoring (Priority: LOW)

**Tasks:**
1. Add performance logging
2. Measure post creation latency
3. Measure comment processing latency
4. Add monitoring dashboards
5. Optimize slow queries (if any)

**Deliverable:** Performance metrics tracked and optimized

---

## 7. APPENDIX

### A. Reference Implementation Snippets

#### A.1 Post Content Template

```javascript
function buildGracePeriodPostContent(plan, progress) {
  const planMarkdown = plan.map(step => {
    const emoji = step.status === 'completed' ? '✅' : '⏳';
    return `${emoji} ${step.content}`;
  }).join('\n');

  return `
⏳ **Grace Period Triggered**

This task is taking longer than expected. I've made progress but need your guidance to continue.

## Current Progress

${planMarkdown}

## Time Status
- ⏱️ Elapsed: ${progress.elapsed}s
- ⏰ Remaining: ${progress.remaining}s
- 📊 Progress: ${progress.percentComplete}%

## What would you like me to do?

Reply with one of these options:

**Continue** - Keep working (+120s extension)
**Pause** - Save progress and let me review
**Simplify** - Complete essential parts only
**Cancel** - Stop now and show what's completed

---
*Grace Period State ID: \`${progress.stateId}\`*
`.trim();
}
```

#### A.2 Choice Extraction Regex Patterns

```javascript
const CHOICE_PATTERNS = {
  continue: [
    /^continue$/i,
    /^i\s+choose\s+continue$/i,
    /^\[continue\]$/i,
    /^choice:\s*continue$/i,
    /\bcontinue\b/i
  ],
  pause: [
    /^pause$/i,
    /^i\s+choose\s+pause$/i,
    /^\[pause\]$/i,
    /^choice:\s*pause$/i,
    /\bpause\b/i
  ],
  simplify: [
    /^simplify$/i,
    /^i\s+choose\s+simplify$/i,
    /^\[simplify\]$/i,
    /^choice:\s*simplify$/i,
    /\bsimplify\b/i
  ],
  cancel: [
    /^cancel$/i,
    /^i\s+choose\s+cancel$/i,
    /^\[cancel\]$/i,
    /^choice:\s*cancel$/i,
    /\bcancel\b/i
  ]
};

function extractChoice(commentContent) {
  const content = commentContent.toLowerCase().trim();

  for (const [choice, patterns] of Object.entries(CHOICE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return choice;
      }
    }
  }

  return null;
}
```

### B. Database Migration Notes

**No new migrations required** - Uses existing tables:
- `grace_period_states` (migration 017)
- `agent_posts` (existing)
- `comments` (existing)

**Potential Optimization:**

```sql
-- Add index for faster grace period post lookups
-- (Consider if queries become slow)
CREATE INDEX IF NOT EXISTS idx_agent_posts_metadata_grace_period
  ON agent_posts(
    json_extract(metadata, '$.gracePeriod')
  )
  WHERE json_extract(metadata, '$.gracePeriod') = 1;
```

### C. Error Codes and Messages

| Code | Message | User Action |
|------|---------|-------------|
| GP001 | Invalid choice. Please reply with: continue, pause, simplify, or cancel | Submit valid choice |
| GP002 | Choice already recorded as '{choice}'. Cannot change after submission. | Review existing choice |
| GP003 | This grace period has expired. The task has already completed or timed out. | No action needed |
| GP004 | System error: Unable to process choice. Please contact support. | Contact support |
| GP005 | State not found for grace period post. | Report issue |

### D. Future Enhancements

1. **UI Integration**
   - Button-based choice selection (instead of comments)
   - Real-time progress updates during grace period
   - Visual countdown timer

2. **Advanced Features**
   - Custom timeout extensions (user specifies duration)
   - Partial execution preview (show what will complete if simplified)
   - Grace period history per user

3. **Analytics**
   - Track most common user choices
   - Measure average timeout extension effectiveness
   - Identify tasks that frequently trigger grace periods

4. **Notifications**
   - Email/push notifications when grace period triggers
   - Reminders if choice not submitted within N minutes
   - Summary of paused tasks

---

**End of SPARC Specification**

**Next Steps:**
1. Review specification with team
2. Approve implementation approach
3. Begin Phase 1: Post Creation
4. Follow TDD workflow strictly
5. Iterate based on test results
