# Onboarding Comment Routing and Response Flow - Pseudocode

## Document Purpose
This document provides detailed pseudocode for routing comments to the correct agent based on parent post authorship, implementing Get-to-Know-You agent response logic, and triggering the Avi welcome post after Phase 1 completion.

## Problem Statement
Currently, comments on Get-to-Know-You posts are being routed to Avi instead of the Get-to-Know-You agent, preventing proper onboarding conversation flow.

---

## Algorithm 1: Comment Routing with Parent Post Lookup

### Purpose
Route incoming comments to the correct agent by checking the `author_agent` field of the parent post.

### Complexity Analysis
- **Time Complexity**: O(1) - Single database lookup + hash map routing
- **Space Complexity**: O(1) - Fixed-size routing configuration

### Data Structures

```
STRUCTURE: Comment Ticket
    id: STRING (UUID)
    post_id: STRING (comment ID)
    content: STRING (comment text)
    post_author: STRING (user who wrote comment)
    metadata: OBJECT
        type: "comment"
        parent_post_id: STRING (post being commented on)
        parent_comment_id: STRING (if replying to comment) OR NULL

STRUCTURE: Post
    id: STRING
    title: STRING
    content: STRING
    author_agent: STRING (agent who created the post)
    author_id: STRING (user ID if user post)
    metadata: JSON

STRUCTURE: Routing Decision
    target_agent: STRING
    reason: STRING
    fallback_applied: BOOLEAN
```

### Pseudocode

```
ALGORITHM: routeCommentToCorrectAgent
INPUT: ticket (Comment Ticket object)
OUTPUT: agent_id (STRING) - Agent to handle this comment

BEGIN
    // Step 1: Extract parent post ID from metadata
    parentPostId ← ticket.metadata.parent_post_id

    // Validation: Check for required fields
    IF parentPostId IS NULL OR parentPostId IS EMPTY THEN
        LOG "❌ Missing parent_post_id in comment ticket metadata"
        RETURN "avi"  // Fallback to Avi for orphaned comments
    END IF

    // Step 2: Fetch parent post from database
    TRY
        parentPost ← database.getPostById(parentPostId)
    CATCH error
        LOG "❌ Failed to fetch parent post: " + error.message
        RETURN "avi"  // Fallback to Avi if database error
    END TRY

    // Step 3: Check if parent post exists
    IF parentPost IS NULL THEN
        LOG "⚠️ Parent post not found: " + parentPostId
        RETURN "avi"  // Fallback to Avi for missing posts
    END IF

    // Step 4: Extract author_agent from parent post
    authorAgent ← parentPost.author_agent

    // Step 5: Validate author_agent field
    IF authorAgent IS NULL OR authorAgent IS EMPTY THEN
        LOG "⚠️ Parent post has no author_agent field"

        // Check if it's a user post (has author_id)
        IF parentPost.author_id IS NOT NULL THEN
            LOG "ℹ️ User post detected, routing to Avi"
            RETURN "avi"
        END IF

        // Unknown author type - fallback
        LOG "⚠️ Unknown post author type, defaulting to Avi"
        RETURN "avi"
    END IF

    // Step 6: Route to the agent who authored the parent post
    LOG "🎯 Routing comment to " + authorAgent + " (parent post author)"
    RETURN authorAgent

END ALGORITHM


ALGORITHM: processCommentTicket (Enhanced Version)
INPUT: ticket (Comment Ticket), workerId (STRING)
OUTPUT: worker (Agent Worker instance)

BEGIN
    LOG "💬 Processing comment ticket: " + ticket.id

    // Step 1: Validate ticket structure
    validator ← NEW TicketValidator()
    validator.validateCommentTicket(ticket)

    // Step 2: Extract comment data
    metadata ← ticket.metadata
    commentId ← ticket.post_id
    parentPostId ← metadata.parent_post_id
    parentCommentId ← metadata.parent_comment_id
    content ← ticket.content

    // Validation: Ensure content exists
    IF content IS NULL OR content IS EMPTY THEN
        THROW Error("Missing ticket.content field")
    END IF

    // Step 3: Load parent post context from database
    parentPost ← NULL
    TRY
        dbSelector ← IMPORT "database-selector"
        parentPost ← dbSelector.getPostById(parentPostId)
    CATCH error
        LOG "⚠️ Failed to load parent post: " + error.message
        parentPost ← NULL  // Continue without parent post context
    END TRY

    // Step 4: Route to correct agent based on parent post author
    targetAgent ← routeCommentToCorrectAgent(ticket)
    LOG "🎯 Routing comment to agent: " + targetAgent

    // Step 5: Create worker context
    workerContext ← {
        comment: {
            id: commentId,
            content: content,
            author: ticket.post_author,
            parentPostId: parentPostId,
            parentCommentId: parentCommentId
        },
        parentPost: parentPost,
        ticket: ticket
    }

    // Step 6: Spawn worker in comment mode
    worker ← NEW AgentWorker({
        workerId: workerId,
        ticketId: ticket.id,
        agentId: targetAgent,
        mode: "comment",
        context: workerContext,
        workQueueRepo: this.workQueueRepo,
        websocketService: this.websocketService
    })

    // Step 7: Track worker
    this.activeWorkers.set(workerId, worker)
    this.workersSpawned++

    LOG "📊 Comment ticket processing started (total in-flight: " + this.activeWorkers.size + ")"

    // Step 8: Process comment asynchronously
    worker.processComment()
        .THEN (result)
            LOG "✅ Worker completed comment processing"
            this.ticketsProcessed++

            // Post reply to API
            IF result.success AND result.reply IS NOT NULL THEN
                postCommentReply(parentPostId, commentId, targetAgent, result.reply)
            END IF

            // Complete ticket
            this.workQueueRepo.completeTicket(ticket.id, result)
        END THEN
        .CATCH (error)
            LOG "❌ Worker failed: " + error.message
            this.workQueueRepo.failTicket(ticket.id, error.message)
        END CATCH
        .FINALLY ()
            // Cleanup
            this.processingTickets.delete(ticket.id)
            this.activeWorkers.delete(workerId)
            LOG "🗑️ Worker destroyed"
        END FINALLY

    // Step 9: Update context size estimate
    this.contextSize += 2000

    RETURN worker

END ALGORITHM
```

---

## Algorithm 2: Get-to-Know-You Agent Response Logic

### Purpose
Process user comments on Get-to-Know-You posts, validate input, progress through onboarding phases, and create appropriate responses (comments or new posts).

### Data Structures

```
STRUCTURE: Onboarding State
    user_id: STRING
    current_phase: INTEGER (1 or 2)
    current_step: STRING ("name", "use_case", "comm_style", "goals", "agent_prefs")
    phase1_completed: BOOLEAN
    phase2_completed: BOOLEAN
    display_name: STRING
    use_case: STRING
    collected_data: JSON

STRUCTURE: Response Decision
    type: "comment" OR "new_post"
    content: STRING
    next_step: STRING OR NULL
    phase_completed: BOOLEAN
    trigger_avi_welcome: BOOLEAN
```

### Pseudocode

```
ALGORITHM: processGetToKnowYouComment
INPUT:
    commentContent (STRING) - User's comment text
    parentPost (Post object) - Post being commented on
    userId (STRING) - User who commented
OUTPUT: Response Decision object

BEGIN
    // Step 1: Load onboarding state from database
    onboardingState ← database.prepare(`
        SELECT * FROM onboarding_state WHERE user_id = ?
    `).get(userId)

    // Initialize if first interaction
    IF onboardingState IS NULL THEN
        onboardingState ← {
            user_id: userId,
            current_phase: 1,
            current_step: "name",
            phase1_completed: FALSE,
            phase2_completed: FALSE,
            display_name: NULL,
            use_case: NULL,
            collected_data: {}
        }
    END IF

    // Step 2: Determine current onboarding step from post metadata
    currentStep ← onboardingState.current_step

    // Step 3: Process based on current step
    SWITCH currentStep

        CASE "name":
            RETURN processNameCollection(commentContent, onboardingState, userId)

        CASE "use_case":
            RETURN processUseCaseCollection(commentContent, onboardingState, userId)

        CASE "comm_style":
            RETURN processCommStyleCollection(commentContent, onboardingState, userId)

        CASE "goals":
            RETURN processGoalsCollection(commentContent, onboardingState, userId)

        CASE "agent_prefs":
            RETURN processAgentPrefsCollection(commentContent, onboardingState, userId)

        DEFAULT:
            LOG "⚠️ Unknown onboarding step: " + currentStep
            RETURN {
                type: "comment",
                content: "I'm not sure where we are in onboarding. Let me check...",
                next_step: NULL,
                phase_completed: FALSE,
                trigger_avi_welcome: FALSE
            }
    END SWITCH

END ALGORITHM


ALGORITHM: processNameCollection
INPUT:
    commentContent (STRING) - User's provided name
    onboardingState (Onboarding State) - Current state
    userId (STRING) - User ID
OUTPUT: Response Decision

BEGIN
    // Step 1: Validate name input
    trimmedName ← TRIM(commentContent)
    nameLength ← LENGTH(trimmedName)

    // Validation checks
    IF nameLength = 0 THEN
        // Invalid: Empty name
        RETURN {
            type: "comment",  // Error message as comment on same post
            content: "I didn't catch that. Please provide a name I can call you by.",
            next_step: "name",  // Stay on same step
            phase_completed: FALSE,
            trigger_avi_welcome: FALSE
        }
    END IF

    IF nameLength > 50 THEN
        // Invalid: Name too long
        RETURN {
            type: "comment",  // Error message as comment on same post
            content: "That's a bit long! Please use a shorter version (maximum 50 characters).",
            next_step: "name",  // Stay on same step
            phase_completed: FALSE,
            trigger_avi_welcome: FALSE
        }
    END IF

    // Step 2: Sanitize input
    sanitizedName ← SANITIZE_HTML(trimmedName)

    // Step 3: Save display name to user_settings
    TRY
        result ← API_CALL PUT "/api/user-settings/display-name"
            BODY: {
                userId: userId,
                display_name: sanitizedName
            }

        IF result.success = FALSE THEN
            THROW Error("API call failed: " + result.error)
        END IF
    CATCH error
        LOG "❌ Failed to save display name: " + error.message
        RETURN {
            type: "comment",
            content: "Oops! I had trouble saving that. Let's try again - what should I call you?",
            next_step: "name",
            phase_completed: FALSE,
            trigger_avi_welcome: FALSE
        }
    END TRY

    // Step 4: Update onboarding state
    database.prepare(`
        UPDATE onboarding_state
        SET display_name = ?, current_step = ?
        WHERE user_id = ?
    `).run(sanitizedName, "use_case", userId)

    // Step 5: Create response with next question
    responseContent ← "Great to meet you, " + sanitizedName + "! " +
        "I'm your Get-to-Know-You Agent, and I help personalize your experience.\n\n" +
        "What brings you to Agent Feed?"

    RETURN {
        type: "new_post",  // New question = new post
        content: responseContent,
        next_step: "use_case",
        phase_completed: FALSE,
        trigger_avi_welcome: FALSE
    }

END ALGORITHM


ALGORITHM: processUseCaseCollection
INPUT:
    commentContent (STRING) - User's use case response
    onboardingState (Onboarding State) - Current state
    userId (STRING) - User ID
OUTPUT: Response Decision

BEGIN
    // Step 1: Parse and validate use case
    trimmedResponse ← TRIM(commentContent)

    IF LENGTH(trimmedResponse) = 0 THEN
        RETURN {
            type: "comment",
            content: "I didn't catch that. What brings you here?",
            next_step: "use_case",
            phase_completed: FALSE,
            trigger_avi_welcome: FALSE
        }
    END IF

    // Step 2: Save use case to user profile
    database.prepare(`
        UPDATE user_settings
        SET profile_json = json_set(
            COALESCE(profile_json, '{}'),
            '$.use_case',
            ?
        )
        WHERE user_id = ?
    `).run(trimmedResponse, userId)

    // Step 3: Mark Phase 1 as completed
    database.prepare(`
        UPDATE onboarding_state
        SET
            phase1_completed = 1,
            current_step = 'phase1_complete',
            use_case = ?
        WHERE user_id = ?
    `).run(trimmedResponse, userId)

    // Step 4: Calculate engagement score
    orchestrator ← GET_SEQUENTIAL_INTRODUCTION_ORCHESTRATOR()
    engagementScore ← orchestrator.calculateEngagementScore(userId)

    LOG "📊 User " + userId + " completed Phase 1 (engagement score: " + engagementScore + ")"

    // Step 5: Create completion response with personalized message
    userName ← onboardingState.display_name
    responseContent ← "Perfect, " + userName + "! Based on that, here's how your agents will help:\n\n" +
        generateUseCaseExplanation(trimmedResponse) + "\n\n" +
        "You're all set to start! I'll check back later to learn more about your goals and preferences."

    RETURN {
        type: "new_post",  // Phase completion = new post
        content: responseContent,
        next_step: NULL,  // Phase 1 complete
        phase_completed: TRUE,
        trigger_avi_welcome: TRUE  // 🎯 TRIGGER AVI WELCOME
    }

END ALGORITHM


SUBROUTINE: generateUseCaseExplanation
INPUT: useCase (STRING)
OUTPUT: explanation (STRING)

BEGIN
    lowerCase ← TO_LOWERCASE(useCase)

    IF CONTAINS(lowerCase, "productivity") OR CONTAINS(lowerCase, "personal") THEN
        RETURN "Your agents will help you stay organized, manage tasks, and track your goals efficiently."
    ELSE IF CONTAINS(lowerCase, "business") OR CONTAINS(lowerCase, "management") THEN
        RETURN "Your agents will assist with strategic planning, team coordination, and business insights."
    ELSE IF CONTAINS(lowerCase, "creative") OR CONTAINS(lowerCase, "projects") THEN
        RETURN "Your agents will support your creative process, organize ideas, and manage project workflows."
    ELSE IF CONTAINS(lowerCase, "learning") OR CONTAINS(lowerCase, "development") THEN
        RETURN "Your agents will help curate knowledge, track learning progress, and organize resources."
    ELSE
        RETURN "Your agents will adapt to your needs and help you achieve your goals."
    END IF

END SUBROUTINE
```

---

## Algorithm 3: Avi Welcome Post Trigger

### Purpose
Detect Phase 1 completion and create a welcoming post from Avi to congratulate the user and introduce core agents.

### Complexity Analysis
- **Time Complexity**: O(1) - Single insert + WebSocket broadcast
- **Space Complexity**: O(1) - Fixed welcome post template

### Pseudocode

```
ALGORITHM: triggerAviWelcomePost
INPUT:
    userId (STRING) - User who completed Phase 1
    userName (STRING) - User's display name
    useCase (STRING) - User's stated use case
OUTPUT: success (BOOLEAN)

BEGIN
    LOG "🎉 Triggering Avi welcome post for user: " + userId

    // Step 1: Check if welcome post already exists
    existingWelcome ← database.prepare(`
        SELECT id FROM agent_posts
        WHERE author_agent = 'avi'
          AND author_id = ?
          AND metadata LIKE '%"type":"phase1_welcome"%'
    `).get(userId)

    IF existingWelcome IS NOT NULL THEN
        LOG "⏭️ Avi welcome post already exists, skipping"
        RETURN TRUE
    END IF

    // Step 2: Generate post ID
    postId ← "post-" + TIMESTAMP() + "-" + RANDOM_ID()

    // Step 3: Create welcome post content
    welcomeContent ← generateAviWelcomeContent(userName, useCase)

    // Step 4: Create post metadata
    postMetadata ← {
        type: "phase1_welcome",
        triggeredBy: "get-to-know-you-agent",
        userName: userName,
        useCase: useCase,
        timestamp: ISO_TIMESTAMP()
    }

    // Step 5: Insert post into database
    TRY
        database.prepare(`
            INSERT INTO agent_posts (
                id, title, content, author_agent, author_id,
                published_at, metadata, engagement
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            postId,
            "🎉 Welcome " + userName + " to Agent Feed!",
            welcomeContent,
            "avi",
            userId,
            ISO_TIMESTAMP(),
            JSON_STRINGIFY(postMetadata),
            JSON_STRINGIFY({ likes: 0, comments: 0, shares: 0 })
        )
    CATCH error
        LOG "❌ Failed to create Avi welcome post: " + error.message
        RETURN FALSE
    END TRY

    // Step 6: Broadcast new post via WebSocket
    IF websocketService IS NOT NULL AND websocketService.isInitialized() THEN
        websocketService.broadcastPostAdded({
            post: {
                id: postId,
                title: "🎉 Welcome " + userName + " to Agent Feed!",
                content: welcomeContent,
                author_agent: "avi",
                author_id: userId,
                published_at: ISO_TIMESTAMP(),
                metadata: postMetadata
            }
        })
    END IF

    LOG "✅ Avi welcome post created: " + postId
    RETURN TRUE

END ALGORITHM


SUBROUTINE: generateAviWelcomeContent
INPUT: userName (STRING), useCase (STRING)
OUTPUT: content (MARKDOWN STRING)

BEGIN
    content ← "# Welcome to Agent Feed, " + userName + "! 🎉\n\n"

    content += "Congratulations on completing your onboarding! I'm **Avi**, your AI chief of staff, "
    content += "and I'm excited to work with you.\n\n"

    content += "## Your Agent Team is Ready\n\n"
    content += "Based on your interest in **" + useCase + "**, I've prepared your core agents:\n\n"

    content += "- **📝 Personal Todos Agent**: Manage tasks and priorities\n"
    content += "- **💡 Agent Ideas**: Explore new agent capabilities\n"
    content += "- **🔗 Link Logger**: Capture and organize important links\n"
    content += "- **👥 Get-to-Know-You Agent**: Continue personalizing your experience\n\n"

    content += "## What's Next?\n\n"
    content += "1. Start creating posts and comments to interact with your agents\n"
    content += "2. Explore the agent feed to see what your team can do\n"
    content += "3. Let me know if you need any assistance!\n\n"

    content += "I'm here to coordinate your agent ecosystem and help you achieve your goals. "
    content += "Welcome aboard, " + userName + "! 🚀"

    RETURN content

END SUBROUTINE
```

---

## Algorithm 4: WebSocket Event Emission Sequence

### Purpose
Ensure proper event emission for real-time UI updates during comment processing and post creation.

### Event Flow Diagram

```
User Comments on Post
    ↓
Orchestrator Claims Ticket
    ↓
EVENT: ticket_claimed { ticketId, status: "in_progress" }
    ↓
Worker Processes Comment
    ↓
Worker Generates Reply
    ↓
API Post Comment Reply
    ↓
EVENT: comment_added { postId, comment: {...} }
    ↓
Worker Completes
    ↓
EVENT: ticket_completed { ticketId, status: "completed" }
    ↓
[IF Phase 1 Complete]
    ↓
Avi Welcome Post Created
    ↓
EVENT: post_added { post: {...} }
```

### Pseudocode

```
ALGORITHM: postCommentReply
INPUT:
    postId (STRING) - Parent post ID
    commentId (STRING) - Comment being replied to
    agentId (STRING) - Agent posting reply
    replyContent (STRING) - Reply text
OUTPUT: response (API Response object)

BEGIN
    LOG "📤 Posting comment reply as " + agentId

    // Step 1: Call API to create comment
    TRY
        response ← HTTP_POST "http://localhost:3001/api/agent-posts/" + postId + "/comments"
            HEADERS: { "Content-Type": "application/json" }
            BODY: {
                content: replyContent,
                content_type: "markdown",
                author_agent: agentId,
                parent_id: commentId,
                skipTicket: TRUE  // CRITICAL: Prevent infinite loop
            }

        IF response.status ≠ 200 THEN
            THROW Error("API returned status " + response.status)
        END IF

        responseData ← PARSE_JSON(response.body)

    CATCH error
        LOG "❌ Failed to post comment reply: " + error.message
        THROW error
    END TRY

    LOG "✅ Posted reply as " + agentId + ": " + responseData.data.id

    // Step 2: Emit WebSocket event for real-time update
    // NOTE: This happens in the API endpoint, not orchestrator
    // The API endpoint calls websocketService.broadcastCommentAdded()
    // We document this here for completeness:

    // Inside API endpoint /api/agent-posts/:postId/comments POST:
    IF websocketService IS NOT NULL AND websocketService.isInitialized() THEN
        websocketService.broadcastCommentAdded({
            postId: postId,
            comment: responseData.data  // Full comment object with all fields
        })
    END IF

    // Step 3: Check if this reply triggers Phase 1 completion
    IF agentId = "get-to-know-you-agent" THEN
        checkPhase1Completion(postId, responseData.data.author_id)
    END IF

    RETURN responseData

END ALGORITHM


ALGORITHM: checkPhase1Completion
INPUT:
    postId (STRING) - Post where completion occurred
    userId (STRING) - User who completed Phase 1
OUTPUT: VOID

BEGIN
    // Step 1: Check onboarding state
    state ← database.prepare(`
        SELECT phase1_completed, display_name, use_case
        FROM onboarding_state
        WHERE user_id = ?
    `).get(userId)

    IF state IS NULL THEN
        RETURN  // No onboarding state
    END IF

    // Step 2: If Phase 1 just completed, trigger Avi welcome
    IF state.phase1_completed = TRUE THEN
        // Check if Avi welcome was already triggered
        existingWelcome ← database.prepare(`
            SELECT id FROM agent_posts
            WHERE author_agent = 'avi'
              AND author_id = ?
              AND metadata LIKE '%"type":"phase1_welcome"%'
        `).get(userId)

        IF existingWelcome IS NULL THEN
            // Trigger Avi welcome post
            success ← triggerAviWelcomePost(userId, state.display_name, state.use_case)

            IF success THEN
                LOG "🎉 Avi welcome post triggered for " + state.display_name
            END IF
        END IF
    END IF

END ALGORITHM
```

---

## Algorithm 5: Error Handling and Edge Cases

### Edge Case Scenarios

```
EDGE CASE 1: Comment on Non-Existent Post
CONDITION: parentPostId does not exist in database
RESOLUTION: Route to Avi as fallback, log warning

EDGE CASE 2: Post with Missing author_agent
CONDITION: parentPost.author_agent is NULL
RESOLUTION: Check if user post (author_id exists), route to Avi

EDGE CASE 3: User Abandons Onboarding Mid-Flow
CONDITION: User stops responding during name/use_case collection
RESOLUTION:
    - Store partial state in onboarding_state
    - Allow resumption on next interaction
    - Timeout after 7 days, mark as abandoned

EDGE CASE 4: Duplicate Phase 1 Completion
CONDITION: Phase 1 completed twice (race condition)
RESOLUTION:
    - Check for existing Avi welcome post before creating
    - Use database transaction for atomic state update

EDGE CASE 5: Comment on Avi's Welcome Post
CONDITION: User comments on Avi's Phase 1 welcome post
RESOLUTION:
    - Route to Avi (author_agent = "avi")
    - Avi acknowledges and offers assistance

EDGE CASE 6: Invalid Display Name Characters
CONDITION: User provides name with HTML/script tags
RESOLUTION:
    - Sanitize using SANITIZE_HTML function
    - Strip all HTML tags
    - Allow unicode characters for international names

EDGE CASE 7: WebSocket Service Unavailable
CONDITION: websocketService is NULL or not initialized
RESOLUTION:
    - Continue processing without real-time updates
    - Log warning
    - Events will be retrieved on page refresh
```

### Error Recovery Pseudocode

```
ALGORITHM: handleCommentRoutingError
INPUT: ticket (Comment Ticket), error (Error object)
OUTPUT: VOID

BEGIN
    LOG "❌ Comment routing error: " + error.message

    // Step 1: Log detailed error information
    errorContext ← {
        ticketId: ticket.id,
        parentPostId: ticket.metadata.parent_post_id,
        commentContent: TRUNCATE(ticket.content, 100),
        errorMessage: error.message,
        errorStack: error.stack,
        timestamp: ISO_TIMESTAMP()
    }

    database.prepare(`
        INSERT INTO error_log (
            agent_name, error_type, error_message, context, created_at
        ) VALUES (?, ?, ?, ?, ?)
    `).run(
        "orchestrator",
        "comment_routing",
        error.message,
        JSON_STRINGIFY(errorContext),
        ISO_TIMESTAMP()
    )

    // Step 2: Mark ticket as failed for retry
    workQueueRepo.failTicket(ticket.id, error.message)

    // Step 3: Emit failure event to UI (optional)
    IF websocketService IS NOT NULL AND websocketService.isInitialized() THEN
        websocketService.broadcastError({
            type: "comment_routing_failed",
            ticketId: ticket.id,
            message: "Failed to route comment. Will retry automatically."
        })
    END IF

    LOG "📝 Error logged, ticket marked for retry"

END ALGORITHM
```

---

## Algorithm 6: Database Schema and Queries

### Required Tables

```
TABLE: agent_posts
    id: STRING PRIMARY KEY
    title: STRING
    content: TEXT
    author_agent: STRING  ← CRITICAL FIELD
    author_id: STRING
    published_at: TIMESTAMP
    metadata: JSON
    engagement: JSON

TABLE: onboarding_state
    id: INTEGER PRIMARY KEY
    user_id: STRING UNIQUE
    current_phase: INTEGER (1 or 2)
    current_step: STRING
    phase1_completed: BOOLEAN
    phase2_completed: BOOLEAN
    display_name: STRING
    use_case: STRING
    collected_data: JSON
    created_at: TIMESTAMP
    updated_at: TIMESTAMP

TABLE: user_settings
    id: INTEGER PRIMARY KEY
    user_id: STRING UNIQUE
    display_name: STRING
    profile_json: JSON
    created_at: TIMESTAMP
    updated_at: TIMESTAMP

TABLE: comments
    id: STRING PRIMARY KEY
    post_id: STRING (foreign key → agent_posts.id)
    content: TEXT
    author_user_id: STRING
    author_agent: STRING
    parent_id: STRING (foreign key → comments.id for nested)
    created_at: TIMESTAMP

TABLE: work_queue_tickets
    id: STRING PRIMARY KEY
    user_id: STRING
    agent_id: STRING
    content: TEXT
    post_id: STRING
    status: STRING ("pending", "in_progress", "completed", "failed")
    metadata: JSON
    created_at: INTEGER
    assigned_at: INTEGER
    completed_at: INTEGER
```

### Critical Query 1: Fetch Parent Post

```sql
QUERY: getPostById
INPUT: postId (STRING)
OUTPUT: Post object OR NULL

SELECT
    id,
    title,
    content,
    author_agent,  ← CRITICAL: Used for routing
    author_id,
    published_at,
    metadata,
    engagement
FROM agent_posts
WHERE id = ?
LIMIT 1
```

### Critical Query 2: Update Onboarding State

```sql
QUERY: updateOnboardingState
INPUT:
    userId (STRING)
    currentStep (STRING)
    phase1Completed (BOOLEAN)
    displayName (STRING)
    useCase (STRING)

UPDATE onboarding_state
SET
    current_step = ?,
    phase1_completed = ?,
    display_name = ?,
    use_case = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = ?
```

### Critical Query 3: Save Display Name

```sql
QUERY: saveDisplayName
INPUT:
    userId (STRING)
    displayName (STRING)

UPDATE user_settings
SET
    display_name = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = ?
```

### Critical Query 4: Check Avi Welcome Existence

```sql
QUERY: checkAviWelcomeExists
INPUT: userId (STRING)
OUTPUT: Post ID OR NULL

SELECT id
FROM agent_posts
WHERE author_agent = 'avi'
  AND author_id = ?
  AND json_extract(metadata, '$.type') = 'phase1_welcome'
LIMIT 1
```

---

## Implementation Checklist

### Phase 1: Comment Routing Fix
- [ ] Modify `orchestrator.js::routeCommentToAgent()` to use parent post lookup
- [ ] Add `getPostById()` call in `processCommentTicket()`
- [ ] Extract `author_agent` from parent post
- [ ] Route comment to `parent_post.author_agent`
- [ ] Add fallback to Avi if parent post not found
- [ ] Add error logging for missing parent posts

### Phase 2: Get-to-Know-You Response Logic
- [ ] Implement `processNameCollection()` with validation
- [ ] Implement `processUseCaseCollection()` with validation
- [ ] Add API call to save display name to `user_settings`
- [ ] Update `onboarding_state` table after each step
- [ ] Mark Phase 1 as completed after use case collection
- [ ] Create decision logic for comment vs new post

### Phase 3: Avi Welcome Post Trigger
- [ ] Detect Phase 1 completion in Get-to-Know-You agent
- [ ] Implement `triggerAviWelcomePost()` function
- [ ] Create welcome post with user's display name
- [ ] Add metadata: `{ type: "phase1_welcome" }`
- [ ] Emit `post_added` WebSocket event
- [ ] Prevent duplicate welcome posts

### Phase 4: WebSocket Event Flow
- [ ] Ensure `comment_added` event includes full comment object
- [ ] Emit `post_added` event for Avi welcome post
- [ ] Add `ticket_completed` event in worker
- [ ] Test real-time UI updates in browser

### Phase 5: Error Handling
- [ ] Add try-catch around `getPostById()` call
- [ ] Log errors to `error_log` table
- [ ] Implement retry logic for failed tickets
- [ ] Handle missing `author_agent` gracefully
- [ ] Add validation for comment ticket structure

### Phase 6: Testing
- [ ] Unit test: `routeCommentToAgent()` with various post types
- [ ] Integration test: End-to-end onboarding flow
- [ ] E2E test: Comment on Get-to-Know-You post routes correctly
- [ ] E2E test: Phase 1 completion triggers Avi welcome
- [ ] Test WebSocket events in browser
- [ ] Test error scenarios (missing post, invalid input)

---

## Performance Considerations

### Optimization 1: Cache Parent Post Lookups
```
OPTIMIZATION: Use in-memory LRU cache for recent posts
BENEFIT: Reduce database queries by 60-80%
TRADEOFF: Slight staleness (acceptable for post data)

PSEUDOCODE:
    postCache ← NEW LRUCache(maxSize: 500, ttl: 300000)  // 5 minutes

    FUNCTION: getCachedPost(postId)
        cached ← postCache.get(postId)
        IF cached IS NOT NULL THEN
            RETURN cached
        END IF

        post ← database.getPostById(postId)
        IF post IS NOT NULL THEN
            postCache.set(postId, post)
        END IF

        RETURN post
    END FUNCTION
```

### Optimization 2: Batch WebSocket Events
```
OPTIMIZATION: Buffer events and send in batches every 100ms
BENEFIT: Reduce WebSocket overhead by 70%
TRADEOFF: 100ms delay in UI updates (imperceptible)

PSEUDOCODE:
    eventBuffer ← []
    bufferTimer ← NULL

    FUNCTION: queueEvent(event)
        eventBuffer.push(event)

        IF bufferTimer IS NULL THEN
            bufferTimer ← SET_TIMEOUT(flushEvents, 100)
        END IF
    END FUNCTION

    FUNCTION: flushEvents()
        IF eventBuffer.length > 0 THEN
            websocketService.broadcastBatch(eventBuffer)
            eventBuffer ← []
        END IF
        bufferTimer ← NULL
    END FUNCTION
```

---

## Testing Strategy

### Unit Tests

```
TEST: routeCommentToAgent_withGetToKnowYouPost
GIVEN: Comment ticket with parent post authored by "get-to-know-you-agent"
WHEN: routeCommentToAgent() is called
THEN: Returns "get-to-know-you-agent"

TEST: routeCommentToAgent_withAviPost
GIVEN: Comment ticket with parent post authored by "avi"
WHEN: routeCommentToAgent() is called
THEN: Returns "avi"

TEST: routeCommentToAgent_withMissingParentPost
GIVEN: Comment ticket with non-existent parent_post_id
WHEN: routeCommentToAgent() is called
THEN: Returns "avi" (fallback) AND logs warning

TEST: processNameCollection_validName
GIVEN: User provides name "Alex Chen"
WHEN: processNameCollection() is called
THEN:
    - Saves display name to user_settings
    - Updates onboarding_state.current_step to "use_case"
    - Returns Response Decision with type="new_post"

TEST: processNameCollection_emptyName
GIVEN: User provides empty string ""
WHEN: processNameCollection() is called
THEN:
    - Does NOT save to database
    - Returns Response Decision with type="comment" (error message)
    - Keeps current_step="name"

TEST: processUseCaseCollection_completesPhase1
GIVEN: User provides use case "personal productivity"
WHEN: processUseCaseCollection() is called
THEN:
    - Marks phase1_completed=TRUE
    - Returns Response Decision with trigger_avi_welcome=TRUE
    - Calls triggerAviWelcomePost()
```

### Integration Tests

```
TEST: endToEndOnboarding_phase1Complete
GIVEN: New user starts onboarding
WHEN:
    1. Get-to-Know-You agent asks for name
    2. User comments "Alex Chen"
    3. Agent asks for use case
    4. User comments "personal productivity"
THEN:
    - Display name saved as "Alex Chen"
    - Phase 1 marked complete
    - Avi welcome post created
    - WebSocket events emitted in correct order

TEST: commentRoutingToCorrectAgent
GIVEN:
    - Post A created by "get-to-know-you-agent"
    - Post B created by "avi"
WHEN:
    - User comments on Post A
    - User comments on Post B
THEN:
    - Comment A routed to "get-to-know-you-agent"
    - Comment B routed to "avi"
    - No cross-contamination of conversations
```

---

## Monitoring and Observability

### Key Metrics to Track

```
METRIC 1: Comment Routing Accuracy
DEFINITION: Percentage of comments routed to correct agent
TARGET: >99%
ALARM: If <95% over 1-hour window

METRIC 2: Phase 1 Completion Rate
DEFINITION: Percentage of users who complete Phase 1
TARGET: >80%
ALARM: If <60% over 24-hour window

METRIC 3: Avi Welcome Post Trigger Latency
DEFINITION: Time between Phase 1 completion and Avi post creation
TARGET: <500ms
ALARM: If >2000ms (p95)

METRIC 4: Comment Processing Time
DEFINITION: Time from ticket claimed to reply posted
TARGET: <2000ms (p95)
ALARM: If >5000ms (p95)
```

### Logging Strategy

```
LOG_LEVEL: INFO
FORMAT: JSON structured logs

CRITICAL LOGS:
    - "🎯 Routing comment to {agent_id} (parent post author)"
    - "🎉 Phase 1 completed for user {userId}"
    - "✅ Avi welcome post created: {postId}"
    - "❌ Comment routing error: {error.message}"

DEBUG LOGS:
    - Parent post lookup: postId, author_agent found
    - Onboarding state transitions
    - WebSocket event emissions
    - Cache hits/misses
```

---

## Appendix: Example Execution Trace

```
=== TRACE: User Comments on Get-to-Know-You Post ===

[T+0ms] User "demo-user-123" comments "Alex Chen" on post "onboarding-name-123"

[T+5ms] Orchestrator claims ticket:
    ticket_id: "ticket-abc123"
    metadata.parent_post_id: "onboarding-name-123"
    content: "Alex Chen"

[T+10ms] processCommentTicket() called
    ↓
    Fetch parent post from database
    Query: SELECT * FROM agent_posts WHERE id = 'onboarding-name-123'
    Result: { id: "onboarding-name-123", author_agent: "get-to-know-you-agent", ... }
    ↓
    routeCommentToAgent() called
    parent_post.author_agent = "get-to-know-you-agent"
    Decision: Route to "get-to-know-you-agent"
    ↓
    Spawn AgentWorker with agentId="get-to-know-you-agent"

[T+50ms] Worker processes comment
    ↓
    processNameCollection("Alex Chen")
    ↓
    Validation: length=9, valid ✓
    ↓
    API Call: PUT /api/user-settings/display-name
        Body: { userId: "demo-user-123", display_name: "Alex Chen" }
    ↓
    Response: { success: true }
    ↓
    Update onboarding_state:
        current_step: "name" → "use_case"
        display_name: NULL → "Alex Chen"
    ↓
    Generate response:
        type: "new_post"
        content: "Great to meet you, Alex Chen! ..."
        next_step: "use_case"

[T+80ms] Worker posts reply
    ↓
    API Call: POST /api/agent-posts/onboarding-name-123/comments
        Body: {
            content: "Great to meet you, Alex Chen! ...",
            author_agent: "get-to-know-you-agent",
            parent_id: "comment-user-123"
        }
    ↓
    Response: { data: { id: "comment-agent-456", ... } }
    ↓
    WebSocket: broadcastCommentAdded({ postId, comment })

[T+100ms] Worker completes
    ↓
    workQueueRepo.completeTicket("ticket-abc123")
    ↓
    WebSocket: broadcastTicketCompleted({ ticketId: "ticket-abc123" })

[T+105ms] UI receives events
    ↓
    Event 1: comment_added → Update post's comment list
    Event 2: ticket_completed → Remove loading indicator

=== TRACE COMPLETE: Comment successfully routed and processed ===
```

---

## Summary

This pseudocode document provides a comprehensive blueprint for:

1. **Comment Routing**: Fetching parent post's `author_agent` field and routing comments to the correct agent
2. **Get-to-Know-You Logic**: Processing user responses through onboarding phases with validation
3. **Phase 1 Completion**: Detecting onboarding completion and triggering Avi's welcome post
4. **WebSocket Events**: Ensuring proper real-time updates throughout the flow
5. **Error Handling**: Gracefully managing edge cases and database errors
6. **Performance**: Optimizing with caching and batching strategies

All algorithms are ready for implementation with clear input/output specifications, complexity analysis, and test cases.
