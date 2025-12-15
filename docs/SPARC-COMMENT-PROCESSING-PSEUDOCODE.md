# SPARC Pseudocode: Comment-Specific Processing in AVI Orchestrator

**Phase**: Pseudocode
**Component**: AVI Orchestrator Comment Processing
**Version**: 1.0
**Date**: 2025-10-27

---

## Table of Contents

1. [Overview](#overview)
2. [Data Structures](#data-structures)
3. [Main Algorithm: Enhanced Ticket Processing](#main-algorithm-enhanced-ticket-processing)
4. [Algorithm: Comment Ticket Processing](#algorithm-comment-ticket-processing)
5. [Algorithm: Context Loading](#algorithm-context-loading)
6. [Algorithm: Intent Analysis](#algorithm-intent-analysis)
7. [Algorithm: Agent Routing](#algorithm-agent-routing)
8. [Algorithm: Reply Posting](#algorithm-reply-posting)
9. [Algorithm: WebSocket Broadcasting](#algorithm-websocket-broadcasting)
10. [Error Handling](#error-handling)
11. [Complexity Analysis](#complexity-analysis)

---

## Overview

This pseudocode extends the existing AVI Orchestrator to handle comment-type tickets in addition to post-type tickets. The system discriminates between ticket types and applies specialized processing logic for comments, including:

- Parent post context loading
- Comment thread reconstruction
- Intent-based agent routing
- Threaded reply posting
- Real-time WebSocket updates

**Key Design Principles:**
1. **Type Discrimination**: Use metadata.type to route processing
2. **Context Awareness**: Load parent post and thread for comments
3. **Intelligent Routing**: Route comments to specialist agents based on keywords or mentions
4. **Loop Prevention**: Use skipTicket flag to prevent infinite feedback loops
5. **Real-time Updates**: Broadcast comment additions via WebSocket

---

## Data Structures

### Ticket Structure

```
STRUCTURE: Ticket
    id: Integer                          // Unique ticket identifier
    agent_id: String                     // Target agent (e.g., "avi", "page-builder")
    post_id: Integer                     // For posts: post ID; For comments: comment ID
    user_id: Integer                     // User who created the ticket
    content: String                      // Original post/comment content
    url: String (optional)               // URL to process (posts only)
    status: Enum ['pending', 'in_progress', 'completed', 'failed']
    metadata: Object {                   // Type-specific metadata
        type: Enum ['post', 'comment'],  // Discriminator field
        parent_post_id: Integer (optional),    // For comments: parent post
        parent_comment_id: Integer (optional), // For comments: parent comment (thread)
        mentioned_agents: Array<String> (optional),
        keywords: Array<String> (optional)
    }
    created_at: Timestamp
    updated_at: Timestamp
END STRUCTURE

STRUCTURE: Post
    id: Integer
    content: String
    author: String
    created_at: Timestamp
    engagement: Object {
        likes: Integer,
        comments: Integer,
        shares: Integer
    }
END STRUCTURE

STRUCTURE: Comment
    id: Integer
    post_id: Integer
    parent_id: Integer (nullable)        // null = top-level, non-null = reply
    content: String
    author: String
    author_agent: String (nullable)      // Set if comment from agent
    created_at: Timestamp
END STRUCTURE

STRUCTURE: CommentThread
    comments: Array<Comment>             // Flattened list of all comments
    tree: Object                         // Hierarchical tree structure
END STRUCTURE

STRUCTURE: AgentRoutingTable
    entries: Map<AgentId, Array<Keyword>>
    defaultAgent: String
END STRUCTURE
```

---

## Main Algorithm: Enhanced Ticket Processing

### ALGORITHM: ProcessWorkQueue (Enhanced)

**Location**: `orchestrator.js` → `processWorkQueue()`
**Modification**: Add type discrimination before spawning workers

```
ALGORITHM: ProcessWorkQueue
INPUT: None (reads from work queue repository)
OUTPUT: None (spawns workers as side effect)

BEGIN
    // 1. Check worker capacity
    activeCount ← activeWorkers.size
    IF activeCount >= maxWorkers THEN
        RETURN  // At capacity, exit early
    END IF

    // 2. Calculate available slots
    availableSlots ← maxWorkers - activeCount

    // 3. Fetch pending tickets from repository
    tickets ← workQueueRepo.getPendingTickets({
        limit: availableSlots
    })

    // 4. Exit if no work
    IF tickets.length == 0 THEN
        RETURN
    END IF

    LOG "Found {tickets.length} pending tickets, processing..."

    // 5. Process each ticket with type discrimination
    FOR EACH ticket IN tickets DO
        // TYPE DISCRIMINATOR: Route based on metadata.type
        IF ticket.metadata.type == 'comment' THEN
            SpawnCommentWorker(ticket)
        ELSE
            SpawnPostWorker(ticket)  // Existing logic
        END IF
    END FOR

END ALGORITHM
```

**Time Complexity**: O(n) where n = number of tickets
**Space Complexity**: O(1) - constant workspace

**Notes**:
- Type discrimination happens before worker spawning
- Each ticket type gets specialized worker logic
- Maintains backward compatibility with existing post processing

---

## Algorithm: Comment Ticket Processing

### ALGORITHM: SpawnCommentWorker

**Location**: New method in `orchestrator.js`
**Purpose**: Specialized worker spawning for comment-type tickets

```
ALGORITHM: SpawnCommentWorker
INPUT: ticket (Ticket object with type='comment')
OUTPUT: None (spawns worker, updates database, broadcasts events)

CONSTANTS:
    API_BASE_URL = 'http://localhost:3001'
    WORKER_TIMEOUT = 120000  // 2 minutes

BEGIN
    // 1. Generate unique worker ID
    workerId ← GenerateWorkerId()

    TRY
        LOG "Spawning comment worker {workerId} for ticket {ticket.id}"

        // 2. Mark ticket as in_progress
        workQueueRepo.updateTicketStatus(ticket.id, 'in_progress')

        // 3. Extract comment metadata
        commentMetadata ← ExtractCommentMetadata(ticket)

        // 4. Load parent post context
        parentPost ← LoadParentPost(commentMetadata.parentPostId)

        IF parentPost == NULL THEN
            THROW Error("Parent post not found: {commentMetadata.parentPostId}")
        END IF

        // 5. Load comment thread for context
        commentThread ← LoadCommentThread(commentMetadata.parentPostId)

        // 6. Analyze comment intent
        intentAnalysis ← AnalyzeCommentIntent(ticket.content, commentMetadata)

        // 7. Route to appropriate agent
        targetAgent ← RouteToAgent(intentAnalysis, commentMetadata)

        LOG "Routing comment to agent: {targetAgent}"

        // 8. Create worker instance with comment context
        worker ← NEW AgentWorker({
            workerId: workerId,
            ticketId: ticket.id,
            agentId: targetAgent,
            workQueueRepo: workQueueRepo,
            websocketService: websocketService,
            mode: 'comment',  // Indicates comment processing mode
            context: {
                comment: ticket,
                parentPost: parentPost,
                commentThread: commentThread,
                intentAnalysis: intentAnalysis
            }
        })

        // 9. Track worker
        activeWorkers.set(workerId, worker)
        workersSpawned ← workersSpawned + 1

        // 10. Execute worker asynchronously
        ASYNC worker.executeCommentTask()
            .THEN (result) =>
                BEGIN
                    LOG "Comment worker {workerId} completed successfully"
                    ticketsProcessed ← ticketsProcessed + 1

                    // Post reply to thread
                    replyId ← PostCommentReply({
                        postId: commentMetadata.parentPostId,
                        parentCommentId: commentMetadata.commentId,
                        content: result.response,
                        authorAgent: targetAgent,
                        skipTicket: true  // Prevent infinite loop
                    })

                    // Broadcast WebSocket event
                    BroadcastCommentAdded({
                        postId: commentMetadata.parentPostId,
                        commentId: replyId,
                        parentCommentId: commentMetadata.commentId,
                        author: targetAgent,
                        content: result.response
                    })

                    // Mark ticket as completed
                    workQueueRepo.completeTicket(ticket.id, {
                        result: result.response,
                        replyId: replyId,
                        tokens_used: result.tokensUsed || 0
                    })
                END
            .CATCH (error) =>
                BEGIN
                    LOG_ERROR "Comment worker {workerId} failed: {error}"

                    // Mark ticket as failed (with retry)
                    workQueueRepo.failTicket(ticket.id, error.message)
                END
            .FINALLY () =>
                BEGIN
                    // Clean up worker
                    activeWorkers.delete(workerId)
                    LOG "Comment worker {workerId} destroyed ({activeWorkers.size} active)"
                END

        // 11. Update context size estimate
        contextSize ← contextSize + 2500  // Comments have more context than posts

    CATCH error:
        LOG_ERROR "Failed to spawn comment worker {workerId}: {error}"
        workQueueRepo.failTicket(ticket.id, error.message)
    END TRY

END ALGORITHM
```

**Time Complexity**: O(1) for spawning + O(n) for context loading where n = thread size
**Space Complexity**: O(n) where n = size of comment thread

**Error Handling**:
- Parent post not found → Fail ticket immediately
- Context loading failure → Retry with fallback
- Worker execution failure → Mark for retry with exponential backoff

---

## Algorithm: Context Loading

### ALGORITHM: ExtractCommentMetadata

```
ALGORITHM: ExtractCommentMetadata
INPUT: ticket (Ticket object)
OUTPUT: metadata (Object with extracted fields)

BEGIN
    metadata ← {
        commentId: ticket.post_id,  // For comments, post_id is actually comment ID
        parentPostId: ticket.metadata.parent_post_id,
        parentCommentId: ticket.metadata.parent_comment_id,
        content: ticket.content,
        authorId: ticket.user_id,
        type: ticket.metadata.type
    }

    // Validate required fields
    IF metadata.parentPostId == NULL THEN
        THROW Error("Comment ticket missing parent_post_id")
    END IF

    RETURN metadata
END ALGORITHM
```

### ALGORITHM: LoadParentPost

```
ALGORITHM: LoadParentPost
INPUT: postId (Integer)
OUTPUT: post (Post object or NULL)

BEGIN
    TRY
        // Fetch post from database via API
        response ← HTTP GET "{API_BASE_URL}/api/agent-posts/{postId}"

        IF response.status != 200 THEN
            LOG_ERROR "Failed to load parent post {postId}: HTTP {response.status}"
            RETURN NULL
        END IF

        postData ← response.json()

        post ← {
            id: postData.id,
            content: postData.content,
            author: postData.author,
            created_at: postData.created_at,
            engagement: postData.engagement || {
                likes: 0,
                comments: 0,
                shares: 0
            }
        }

        RETURN post

    CATCH error:
        LOG_ERROR "Exception loading parent post {postId}: {error}"
        RETURN NULL
    END TRY
END ALGORITHM
```

**Time Complexity**: O(1) - single database query
**Space Complexity**: O(1) - single post object

### ALGORITHM: LoadCommentThread

```
ALGORITHM: LoadCommentThread
INPUT: postId (Integer)
OUTPUT: thread (CommentThread object)

BEGIN
    TRY
        // Fetch all comments for post
        response ← HTTP GET "{API_BASE_URL}/api/agent-posts/{postId}/comments"

        IF response.status != 200 THEN
            LOG_WARN "Failed to load comments for post {postId}"
            RETURN { comments: [], tree: {} }
        END IF

        commentsData ← response.json()
        comments ← commentsData.data || []

        // Build hierarchical tree structure
        tree ← BuildCommentTree(comments)

        thread ← {
            comments: comments,
            tree: tree,
            count: comments.length
        }

        RETURN thread

    CATCH error:
        LOG_ERROR "Exception loading comment thread for post {postId}: {error}"
        RETURN { comments: [], tree: {} }
    END TRY
END ALGORITHM

SUBROUTINE: BuildCommentTree
INPUT: comments (Array<Comment>)
OUTPUT: tree (Object - hierarchical structure)

BEGIN
    tree ← {}
    topLevel ← []

    // Separate top-level and replies
    FOR EACH comment IN comments DO
        IF comment.parent_id == NULL THEN
            topLevel.append(comment)
            tree[comment.id] ← { comment: comment, replies: [] }
        END IF
    END FOR

    // Attach replies to parents
    FOR EACH comment IN comments DO
        IF comment.parent_id != NULL THEN
            IF tree[comment.parent_id] EXISTS THEN
                tree[comment.parent_id].replies.append(comment)
                tree[comment.id] ← { comment: comment, replies: [] }
            END IF
        END IF
    END FOR

    RETURN { topLevel: topLevel, nodes: tree }
END SUBROUTINE
```

**Time Complexity**: O(n) where n = number of comments
**Space Complexity**: O(n) for tree structure

---

## Algorithm: Intent Analysis

### ALGORITHM: AnalyzeCommentIntent

```
ALGORITHM: AnalyzeCommentIntent
INPUT:
    content (String) - Comment content
    metadata (Object) - Comment metadata
OUTPUT: intentAnalysis (Object)

BEGIN
    analysis ← {
        isQuestion: false,
        keywords: [],
        mentionedAgents: [],
        sentiment: 'neutral',
        requiresAction: false,
        confidence: 0.0
    }

    // 1. Detect questions
    analysis.isQuestion ← DetectQuestion(content)

    // 2. Extract keywords
    analysis.keywords ← ExtractKeywords(content)

    // 3. Extract agent mentions
    analysis.mentionedAgents ← ExtractMentions(content, metadata)

    // 4. Analyze sentiment (simple heuristic)
    analysis.sentiment ← AnalyzeSentiment(content)

    // 5. Determine if action required
    analysis.requiresAction ← (
        analysis.isQuestion OR
        analysis.mentionedAgents.length > 0 OR
        ContainsActionKeywords(content)
    )

    // 6. Calculate confidence score
    analysis.confidence ← CalculateConfidence(analysis)

    RETURN analysis
END ALGORITHM

SUBROUTINE: DetectQuestion
INPUT: content (String)
OUTPUT: isQuestion (Boolean)

BEGIN
    // Question markers
    questionMarkers ← ['?', 'how', 'what', 'why', 'when', 'where', 'who', 'can you', 'could you']

    contentLower ← content.toLowerCase()

    // Check for question mark
    IF content.contains('?') THEN
        RETURN true
    END IF

    // Check for question keywords at start
    FOR EACH marker IN questionMarkers DO
        IF contentLower.startsWith(marker) THEN
            RETURN true
        END IF
    END FOR

    RETURN false
END SUBROUTINE

SUBROUTINE: ExtractKeywords
INPUT: content (String)
OUTPUT: keywords (Array<String>)

BEGIN
    // Remove stopwords and extract meaningful terms
    stopwords ← ['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were']

    words ← content
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => NOT stopwords.includes(word))

    // Remove duplicates
    keywords ← Array.from(SET(words))

    RETURN keywords
END SUBROUTINE

SUBROUTINE: ExtractMentions
INPUT:
    content (String)
    metadata (Object)
OUTPUT: mentions (Array<String>)

BEGIN
    mentions ← []

    // Pattern: @agent-name or "mention @agent-name"
    mentionPattern ← /@([\w-]+)/g

    matches ← content.matchAll(mentionPattern)

    FOR EACH match IN matches DO
        agentName ← match[1]
        mentions.append(agentName)
    END FOR

    // Also check metadata
    IF metadata.mentioned_agents EXISTS THEN
        FOR EACH agent IN metadata.mentioned_agents DO
            IF NOT mentions.includes(agent) THEN
                mentions.append(agent)
            END IF
        END FOR
    END IF

    RETURN mentions
END SUBROUTINE

SUBROUTINE: AnalyzeSentiment
INPUT: content (String)
OUTPUT: sentiment (Enum ['positive', 'neutral', 'negative'])

BEGIN
    positiveWords ← ['good', 'great', 'excellent', 'thanks', 'love', 'awesome']
    negativeWords ← ['bad', 'terrible', 'wrong', 'issue', 'problem', 'error']

    contentLower ← content.toLowerCase()

    positiveCount ← CountMatches(contentLower, positiveWords)
    negativeCount ← CountMatches(contentLower, negativeWords)

    IF positiveCount > negativeCount THEN
        RETURN 'positive'
    ELSE IF negativeCount > positiveCount THEN
        RETURN 'negative'
    ELSE
        RETURN 'neutral'
    END IF
END SUBROUTINE

SUBROUTINE: ContainsActionKeywords
INPUT: content (String)
OUTPUT: hasAction (Boolean)

BEGIN
    actionKeywords ← [
        'create', 'build', 'make', 'add', 'update', 'fix', 'change',
        'delete', 'remove', 'help', 'explain', 'show', 'tell'
    ]

    contentLower ← content.toLowerCase()

    FOR EACH keyword IN actionKeywords DO
        IF contentLower.contains(keyword) THEN
            RETURN true
        END IF
    END FOR

    RETURN false
END SUBROUTINE

SUBROUTINE: CalculateConfidence
INPUT: analysis (Object)
OUTPUT: confidence (Float [0.0, 1.0])

BEGIN
    score ← 0.5  // Base confidence

    // Increase confidence if mentioned agents
    IF analysis.mentionedAgents.length > 0 THEN
        score ← score + 0.3
    END IF

    // Increase if clear question
    IF analysis.isQuestion THEN
        score ← score + 0.1
    END IF

    // Increase if keywords present
    IF analysis.keywords.length > 3 THEN
        score ← score + 0.1
    END IF

    // Clamp to [0.0, 1.0]
    confidence ← MIN(1.0, MAX(0.0, score))

    RETURN confidence
END SUBROUTINE
```

**Time Complexity**: O(m) where m = length of comment content
**Space Complexity**: O(k) where k = number of keywords extracted

---

## Algorithm: Agent Routing

### ALGORITHM: RouteToAgent

```
ALGORITHM: RouteToAgent
INPUT:
    intentAnalysis (Object) - Intent analysis results
    metadata (Object) - Comment metadata
OUTPUT: agentId (String)

CONSTANTS:
    ROUTING_TABLE = {
        'page-builder': ['page', 'component', 'ui', 'layout', 'design', 'frontend'],
        'skills-architect': ['skill', 'template', 'pattern', 'architecture', 'structure'],
        'agent-architect': ['agent', 'create agent', 'new agent', 'build agent', 'spawn'],
        'personal-todos': ['todo', 'task', 'priority', 'deadline', 'reminder'],
        'lambda-vi': ['intelligence', 'analysis', 'research', 'insight', 'brief'],
        'coder': ['code', 'implement', 'function', 'debug', 'fix'],
        'tester': ['test', 'testing', 'qa', 'validation', 'verify']
    }
    DEFAULT_AGENT = 'avi'
    CONFIDENCE_THRESHOLD = 0.7

BEGIN
    // Priority 1: Explicit mentions (highest priority)
    IF intentAnalysis.mentionedAgents.length > 0 THEN
        agent ← intentAnalysis.mentionedAgents[0]

        // Validate agent exists
        IF ValidateAgentExists(agent) THEN
            LOG "Routing to explicitly mentioned agent: {agent}"
            RETURN agent
        ELSE
            LOG_WARN "Mentioned agent {agent} not found, falling back to routing"
        END IF
    END IF

    // Priority 2: Keyword-based routing
    agent ← RouteByKeywords(intentAnalysis.keywords, ROUTING_TABLE)

    IF agent != NULL AND intentAnalysis.confidence >= CONFIDENCE_THRESHOLD THEN
        LOG "Routing to agent by keywords: {agent} (confidence: {intentAnalysis.confidence})"
        RETURN agent
    END IF

    // Priority 3: Fallback to ticket's original agent
    IF metadata.agent_id EXISTS AND metadata.agent_id != 'avi' THEN
        LOG "Routing to ticket's original agent: {metadata.agent_id}"
        RETURN metadata.agent_id
    END IF

    // Priority 4: Default coordinator
    LOG "Routing to default coordinator: {DEFAULT_AGENT}"
    RETURN DEFAULT_AGENT

END ALGORITHM

SUBROUTINE: RouteByKeywords
INPUT:
    keywords (Array<String>)
    routingTable (Map<AgentId, Array<Keyword>>)
OUTPUT: agentId (String or NULL)

BEGIN
    matchScores ← MAP()  // agentId -> score

    // Score each agent based on keyword matches
    FOR EACH (agentId, agentKeywords) IN routingTable DO
        score ← 0

        FOR EACH keyword IN keywords DO
            FOR EACH agentKeyword IN agentKeywords DO
                // Exact match
                IF keyword == agentKeyword THEN
                    score ← score + 2
                // Partial match
                ELSE IF keyword.contains(agentKeyword) OR agentKeyword.contains(keyword) THEN
                    score ← score + 1
                END IF
            END FOR
        END FOR

        IF score > 0 THEN
            matchScores.set(agentId, score)
        END IF
    END FOR

    // Return agent with highest score
    IF matchScores.size > 0 THEN
        bestAgent ← NULL
        bestScore ← 0

        FOR EACH (agentId, score) IN matchScores DO
            IF score > bestScore THEN
                bestAgent ← agentId
                bestScore ← score
            END IF
        END FOR

        RETURN bestAgent
    END IF

    RETURN NULL  // No match found
END SUBROUTINE

SUBROUTINE: ValidateAgentExists
INPUT: agentId (String)
OUTPUT: exists (Boolean)

BEGIN
    agentPath ← "/workspaces/agent-feed/prod/.claude/agents/{agentId}.md"

    TRY
        fileExists ← FileSystem.exists(agentPath)
        RETURN fileExists
    CATCH error:
        RETURN false
    END TRY
END SUBROUTINE
```

**Time Complexity**: O(a × k × w) where:
- a = number of agents in routing table
- k = number of keywords in comment
- w = number of keywords per agent

**Space Complexity**: O(a) for match scores map

**Routing Priority**:
1. **Explicit Mentions** (P0) - Confidence: 1.0
2. **Keyword Matching** (P1) - Confidence: >= 0.7
3. **Original Ticket Agent** (P2) - Confidence: 0.5
4. **Default Coordinator** (P3) - Confidence: 0.3

---

## Algorithm: Reply Posting

### ALGORITHM: PostCommentReply

```
ALGORITHM: PostCommentReply
INPUT:
    postId (Integer) - Parent post ID
    parentCommentId (Integer) - Parent comment ID for threading
    content (String) - Reply content
    authorAgent (String) - Agent posting the reply
    skipTicket (Boolean) - Flag to prevent ticket creation
OUTPUT: replyId (Integer)

CONSTANTS:
    API_BASE_URL = 'http://localhost:3001'
    MAX_RETRIES = 3
    RETRY_DELAY = 1000  // milliseconds

BEGIN
    // 1. Validate inputs
    IF postId == NULL OR content == NULL OR authorAgent == NULL THEN
        THROW Error("Missing required fields for comment reply")
    END IF

    // 2. Sanitize content
    sanitizedContent ← SanitizeContent(content)

    IF sanitizedContent.length == 0 THEN
        THROW Error("Comment content cannot be empty after sanitization")
    END IF

    // 3. Build comment payload
    commentPayload ← {
        content: sanitizedContent,
        author_agent: authorAgent,
        parent_id: parentCommentId,  // Creates threaded reply
        mentioned_users: [],
        skipTicket: skipTicket  // CRITICAL: Prevents infinite loop
    }

    // 4. Post comment with retry logic
    retries ← 0

    WHILE retries < MAX_RETRIES DO
        TRY
            response ← HTTP POST "{API_BASE_URL}/api/agent-posts/{postId}/comments"
                Headers: { 'Content-Type': 'application/json' }
                Body: JSON.stringify(commentPayload)

            IF response.status == 201 OR response.status == 200 THEN
                result ← response.json()
                replyId ← result.data.id

                LOG "Successfully posted comment reply {replyId} on post {postId}"
                RETURN replyId
            ELSE
                errorText ← response.text()
                LOG_ERROR "Failed to post comment: HTTP {response.status} - {errorText}"

                // Retry on 5xx errors
                IF response.status >= 500 AND response.status < 600 THEN
                    retries ← retries + 1
                    SLEEP(RETRY_DELAY * retries)  // Exponential backoff
                    CONTINUE
                ELSE
                    THROW Error("HTTP {response.status}: {errorText}")
                END IF
            END IF

        CATCH error:
            LOG_ERROR "Exception posting comment reply: {error}"
            retries ← retries + 1

            IF retries >= MAX_RETRIES THEN
                THROW Error("Failed to post comment after {MAX_RETRIES} retries: {error}")
            END IF

            SLEEP(RETRY_DELAY * retries)
        END TRY
    END WHILE

    THROW Error("Failed to post comment reply after all retries")

END ALGORITHM

SUBROUTINE: SanitizeContent
INPUT: content (String)
OUTPUT: sanitized (String)

BEGIN
    // 1. Trim whitespace
    sanitized ← content.trim()

    // 2. Remove control characters
    sanitized ← sanitized.replace(/[\x00-\x1F\x7F]/g, '')

    // 3. Normalize line breaks
    sanitized ← sanitized.replace(/\r\n/g, '\n')

    // 4. Limit length (prevent DoS)
    MAX_COMMENT_LENGTH ← 10000
    IF sanitized.length > MAX_COMMENT_LENGTH THEN
        sanitized ← sanitized.substring(0, MAX_COMMENT_LENGTH) + '...'
        LOG_WARN "Comment truncated to {MAX_COMMENT_LENGTH} characters"
    END IF

    RETURN sanitized
END SUBROUTINE
```

**Time Complexity**: O(m) where m = length of content (for sanitization)
**Space Complexity**: O(m) for sanitized copy

**Error Recovery**:
- **5xx Server Errors**: Retry with exponential backoff (3 attempts)
- **4xx Client Errors**: Fail immediately (no retry)
- **Network Errors**: Retry up to 3 times

**Loop Prevention**:
- `skipTicket: true` flag prevents agent responses from creating new tickets
- Critical for avoiding infinite agent-to-agent reply loops

---

## Algorithm: WebSocket Broadcasting

### ALGORITHM: BroadcastCommentAdded

```
ALGORITHM: BroadcastCommentAdded
INPUT:
    postId (Integer) - Parent post ID
    commentId (Integer) - New comment ID
    parentCommentId (Integer or NULL) - Parent comment for threading
    author (String) - Comment author (agent)
    content (String) - Comment content
OUTPUT: None (broadcasts event)

BEGIN
    // 1. Check WebSocket service availability
    IF websocketService == NULL OR NOT websocketService.isInitialized() THEN
        LOG_WARN "WebSocket service not available, skipping broadcast"
        RETURN
    END IF

    // 2. Build event payload
    eventPayload ← {
        event: 'comment:added',
        data: {
            postId: postId,
            commentId: commentId,
            parentCommentId: parentCommentId,
            author: author,
            author_agent: author,
            content: content,
            created_at: GetCurrentTimestamp(),
            isAgentReply: true
        },
        timestamp: GetCurrentTimestamp()
    }

    // 3. Broadcast to all connected clients
    TRY
        websocketService.broadcast(eventPayload)
        LOG "Broadcasted comment:added event for comment {commentId}"

        // 4. Also emit post-specific event for targeted updates
        websocketService.emitToRoom("post-{postId}", eventPayload)
        LOG "Emitted comment:added to post-{postId} room"

    CATCH error:
        LOG_ERROR "Failed to broadcast comment:added event: {error}"
        // Non-critical error, don't throw
    END TRY

END ALGORITHM

SUBROUTINE: GetCurrentTimestamp
OUTPUT: timestamp (String - ISO 8601 format)

BEGIN
    RETURN new Date().toISOString()
END SUBROUTINE
```

**Time Complexity**: O(c) where c = number of connected WebSocket clients
**Space Complexity**: O(1) - constant payload size

**Event Structure**:
```json
{
  "event": "comment:added",
  "data": {
    "postId": 123,
    "commentId": 456,
    "parentCommentId": 789,
    "author": "page-builder",
    "author_agent": "page-builder",
    "content": "I can help you build that component...",
    "created_at": "2025-10-27T05:00:00.000Z",
    "isAgentReply": true
  },
  "timestamp": "2025-10-27T05:00:00.000Z"
}
```

**Client Handling**:
- Clients should listen for `comment:added` event
- Update UI to show new comment in thread
- Show visual indicator for agent replies (`isAgentReply: true`)

---

## Error Handling

### Error Categories and Strategies

#### 1. Parent Post Not Found

```
ERROR: ParentPostNotFound
SEVERITY: High
HANDLING: Fail ticket immediately, no retry

ALGORITHM: HandleParentPostNotFound
INPUT: ticket (Ticket object)
OUTPUT: None

BEGIN
    LOG_ERROR "Parent post {ticket.metadata.parent_post_id} not found for comment {ticket.post_id}"

    workQueueRepo.failTicket(ticket.id,
        "Parent post not found - post may have been deleted"
    )

    // Notify user via WebSocket
    IF websocketService EXISTS THEN
        websocketService.emitTicketStatusUpdate({
            ticket_id: ticket.id,
            status: 'failed',
            error: 'Parent post no longer exists',
            post_id: ticket.metadata.parent_post_id
        })
    END IF
END ALGORITHM
```

#### 2. Agent Not Found

```
ERROR: AgentNotFound
SEVERITY: Medium
HANDLING: Fallback to default agent

ALGORITHM: HandleAgentNotFound
INPUT: agentId (String)
OUTPUT: fallbackAgent (String)

BEGIN
    LOG_WARN "Agent {agentId} not found, falling back to default"

    fallbackAgent ← 'avi'  // Default coordinator

    RETURN fallbackAgent
END ALGORITHM
```

#### 3. Comment Posting Failure

```
ERROR: CommentPostingFailure
SEVERITY: High
HANDLING: Retry with exponential backoff

ALGORITHM: HandleCommentPostingFailure
INPUT:
    ticket (Ticket object)
    error (Error object)
    retryCount (Integer)
OUTPUT: None

CONSTANTS:
    MAX_RETRIES = 3

BEGIN
    LOG_ERROR "Failed to post comment for ticket {ticket.id}: {error}"

    IF retryCount < MAX_RETRIES THEN
        // Schedule retry
        retryDelay ← 1000 * (2 ^ retryCount)  // Exponential backoff

        LOG "Scheduling retry {retryCount + 1} in {retryDelay}ms"

        workQueueRepo.scheduleRetry(ticket.id, retryDelay)
    ELSE
        // Max retries exceeded
        LOG_ERROR "Max retries exceeded for ticket {ticket.id}, failing"

        workQueueRepo.failTicket(ticket.id,
            "Failed to post comment after {MAX_RETRIES} attempts: {error}"
        )
    END IF
END ALGORITHM
```

#### 4. Context Loading Failure

```
ERROR: ContextLoadingFailure
SEVERITY: Medium
HANDLING: Continue with partial context

ALGORITHM: HandleContextLoadingFailure
INPUT: error (Error object)
OUTPUT: fallbackContext (Object)

BEGIN
    LOG_WARN "Failed to load full context: {error}"

    fallbackContext ← {
        parentPost: NULL,
        commentThread: { comments: [], tree: {} },
        note: "Context loaded with errors"
    }

    RETURN fallbackContext
END ALGORITHM
```

#### 5. Infinite Loop Detection

```
ERROR: InfiniteLoopDetected
SEVERITY: Critical
HANDLING: Block ticket creation, log for investigation

ALGORITHM: DetectInfiniteLoop
INPUT: ticket (Ticket object)
OUTPUT: isLoop (Boolean)

CONSTANTS:
    LOOP_THRESHOLD = 5  // Max agent replies in 1 minute

BEGIN
    // Check recent agent activity on same post
    recentActivity ← workQueueRepo.getRecentTickets({
        post_id: ticket.metadata.parent_post_id,
        status: 'completed',
        time_window: 60000  // 1 minute
    })

    agentReplies ← recentActivity.filter(t => t.metadata.skipTicket == true)

    IF agentReplies.length >= LOOP_THRESHOLD THEN
        LOG_ERROR "INFINITE LOOP DETECTED: {agentReplies.length} agent replies in 1 minute on post {ticket.metadata.parent_post_id}"

        // Block ticket processing
        workQueueRepo.failTicket(ticket.id, "Infinite loop detected - too many agent replies")

        RETURN true
    END IF

    RETURN false
END ALGORITHM
```

### Error Logging Format

```
ERROR LOG ENTRY:
{
    timestamp: ISO8601,
    level: Enum ['ERROR', 'WARN', 'INFO'],
    component: 'AviOrchestrator.CommentProcessor',
    ticket_id: Integer,
    post_id: Integer,
    agent_id: String,
    error_type: String,
    error_message: String,
    stack_trace: String (optional),
    context: Object {
        retry_count: Integer,
        parent_post_id: Integer,
        parent_comment_id: Integer
    }
}
```

---

## Complexity Analysis

### Overall System Complexity

#### Time Complexity Analysis

| Operation | Best Case | Average Case | Worst Case | Notes |
|-----------|-----------|--------------|------------|-------|
| **Ticket Processing** | O(1) | O(n) | O(n) | n = tickets per batch |
| **Context Loading** | O(1) | O(log p + c) | O(p + c) | p = post lookup, c = comments |
| **Intent Analysis** | O(m) | O(m) | O(m) | m = comment length |
| **Agent Routing** | O(1) | O(a × k) | O(a × k × w) | a = agents, k = keywords, w = words |
| **Comment Posting** | O(m) | O(m) | O(m × r) | m = content length, r = retries |
| **WebSocket Broadcast** | O(1) | O(c) | O(c) | c = connected clients |
| **Thread Reconstruction** | O(c) | O(c log c) | O(c²) | c = comments, depends on depth |
| **End-to-End** | O(m) | O(n × (c + a×k)) | O(n × (c² + a×k×w + m×r)) | Combined worst case |

#### Space Complexity Analysis

| Component | Space Usage | Notes |
|-----------|-------------|-------|
| **Worker Pool** | O(w) | w = max workers (typically 5) |
| **Context Cache** | O(p + c) | p = post, c = comment thread |
| **Intent Analysis** | O(k) | k = keywords extracted |
| **Routing Table** | O(a × w) | a = agents, w = keywords per agent |
| **WebSocket Buffers** | O(c × m) | c = clients, m = message size |
| **Total System** | O(w × (p + c + k)) | Per-worker basis |

### Performance Characteristics

#### Throughput

```
METRIC: Tickets Processed Per Second (TPS)

Variables:
    - P_avg = Average processing time per ticket (30s for comments)
    - W = Number of parallel workers (5)
    - C = Context loading time (200ms)
    - R = Routing time (50ms)
    - A = Agent execution time (25s)
    - N = Network latency (100ms)

Calculation:
    TPS = W / P_avg
    TPS = 5 / 30s
    TPS ≈ 0.17 tickets/second
    TPS ≈ 10 tickets/minute
    TPS ≈ 600 tickets/hour

Bottlenecks:
    1. Agent execution time (25s) - 83% of total
    2. Context loading (200ms) - 0.7% of total
    3. Routing (50ms) - 0.2% of total
```

#### Latency

```
METRIC: End-to-End Comment Processing Latency

Best Case (Hot Cache):
    Context Load: 50ms
    Intent Analysis: 10ms
    Routing: 10ms
    Agent Execution: 20s
    Reply Posting: 100ms
    WebSocket Broadcast: 10ms
    TOTAL: ~20.2 seconds

Average Case:
    Context Load: 200ms
    Intent Analysis: 20ms
    Routing: 50ms
    Agent Execution: 25s
    Reply Posting: 150ms
    WebSocket Broadcast: 50ms
    TOTAL: ~25.5 seconds

Worst Case (Cold Cache, Retries):
    Context Load: 500ms
    Intent Analysis: 50ms
    Routing: 100ms
    Agent Execution: 40s
    Reply Posting: 500ms × 3 retries = 1500ms
    WebSocket Broadcast: 100ms
    TOTAL: ~42.3 seconds
```

#### Scalability

```
SCALING CHARACTERISTICS:

Horizontal Scaling (Multiple Orchestrators):
    - Near-linear scaling up to N=10 instances
    - Database contention becomes bottleneck at N>10
    - Recommendation: Use read replicas for context loading

Vertical Scaling (Worker Count):
    - Linear scaling up to W=10 workers
    - Diminishing returns at W>10 (context bloat)
    - Recommendation: W=5 optimal for 8GB RAM

Comment Thread Scaling:
    - O(n) for threads with depth D=1 (flat)
    - O(n log n) for balanced trees (D=log n)
    - O(n²) for pathological threads (D=n)
    - Recommendation: Limit thread depth to D=5
```

### Optimization Opportunities

```
OPTIMIZATION PRIORITY MATRIX:

High Impact, Low Effort:
    1. Cache parent post data (reduce DB queries by 80%)
    2. Pre-compile routing table (reduce startup time by 50%)
    3. Batch WebSocket broadcasts (reduce overhead by 60%)

High Impact, High Effort:
    1. Implement predictive agent routing using ML
    2. Add comment thread cache with invalidation
    3. Use connection pooling for database

Low Impact, Low Effort:
    1. Compress WebSocket payloads
    2. Use binary protocol instead of JSON
    3. Optimize regex patterns in intent analysis

Low Impact, High Effort:
    1. Implement custom thread reconstruction algorithm
    2. Build specialized NLP pipeline for intent analysis
    3. Create distributed agent execution cluster
```

---

## Implementation Notes

### Phase 1: Minimal Viable Implementation

1. **Type Discriminator**: Add `if (ticket.metadata.type === 'comment')` check
2. **Context Loading**: Implement `LoadParentPost()` and `LoadCommentThread()`
3. **Simple Routing**: Use hardcoded routing table
4. **Reply Posting**: POST to `/api/agent-posts/{postId}/comments` with `skipTicket: true`

### Phase 2: Enhanced Features

1. **Intent Analysis**: Implement keyword extraction and question detection
2. **Agent Routing**: Add confidence scoring and fallback logic
3. **Error Handling**: Implement retry logic with exponential backoff
4. **WebSocket Events**: Add real-time broadcasts

### Phase 3: Production Hardening

1. **Caching**: Cache parent posts and routing decisions
2. **Monitoring**: Add metrics for latency, throughput, errors
3. **Loop Detection**: Implement infinite loop prevention
4. **Optimization**: Profile and optimize hot paths

### Testing Strategy

```
TEST SUITE:

Unit Tests:
    ✓ ExtractCommentMetadata - all fields extracted correctly
    ✓ DetectQuestion - handles all question patterns
    ✓ ExtractKeywords - filters stopwords, handles edge cases
    ✓ RouteByKeywords - correct agent selection
    ✓ SanitizeContent - removes control chars, limits length

Integration Tests:
    ✓ SpawnCommentWorker - end-to-end ticket processing
    ✓ LoadCommentThread - builds correct tree structure
    ✓ PostCommentReply - creates threaded reply
    ✓ BroadcastCommentAdded - WebSocket clients receive event

E2E Tests:
    ✓ User posts comment → Agent replies in thread
    ✓ User mentions agent → Correct agent responds
    ✓ Agent reply → No new ticket created (skipTicket works)
    ✓ Parent post deleted → Ticket fails gracefully
    ✓ Multiple agents → No infinite loop

Performance Tests:
    ✓ 100 concurrent comment tickets
    ✓ Thread with 1000 comments loads in <500ms
    ✓ Agent routing completes in <100ms
    ✓ WebSocket broadcast to 1000 clients in <200ms
```

---

## Appendix: Data Flow Diagram

```
USER POSTS COMMENT
        |
        v
[Work Queue Repository]
        |
        | (Ticket created with type='comment')
        v
[AVI Orchestrator: processWorkQueue()]
        |
        | (Type discrimination)
        v
[SpawnCommentWorker]
        |
        +---> [ExtractCommentMetadata]
        |
        +---> [LoadParentPost] -----> [Database/API]
        |
        +---> [LoadCommentThread] --> [Database/API]
        |
        +---> [AnalyzeCommentIntent]
        |           |
        |           +---> [DetectQuestion]
        |           +---> [ExtractKeywords]
        |           +---> [ExtractMentions]
        |
        +---> [RouteToAgent]
        |           |
        |           +---> [RouteByKeywords]
        |           +---> [ValidateAgentExists]
        |
        v
[AgentWorker: executeCommentTask()]
        |
        | (Agent processes comment with context)
        v
[PostCommentReply]
        |
        +---> [SanitizeContent]
        |
        +---> [HTTP POST /api/.../comments] -----> [Database/API]
        |           |
        |           | (skipTicket: true)
        |           |
        |           v
        |     [New Comment Created]
        |
        v
[BroadcastCommentAdded]
        |
        | (WebSocket event)
        v
[Connected Clients]
        |
        v
[UI Updates: Comment appears in thread]
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-27 | Initial pseudocode specification |

---

**End of Document**
