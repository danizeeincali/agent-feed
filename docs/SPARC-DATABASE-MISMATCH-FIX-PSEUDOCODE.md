# SPARC Pseudocode: Database Selector Pattern for Work Queue Repository

## Overview

This document provides algorithmic pseudocode for implementing the database selector pattern for the work queue repository. The server currently hardcodes PostgreSQL work queue repository but should use the same dynamic selection pattern as other repositories.

## Problem Statement

**Current State**:
- Line 26 in `server.js` hardcodes: `import workQueueRepository from './repositories/postgres/work-queue.repository.js'`
- Other repositories use `dbSelector` pattern (line 1625 in server.js)
- Both SQLite and PostgreSQL have work queue implementations
- Orchestrator calls `getAllPendingTickets()` expecting unified interface

**Goal**: Implement dynamic repository selection based on `USE_POSTGRES` environment variable

---

## 1. Database Selector Algorithm

### ALGORITHM: SelectWorkQueueRepository

```
ALGORITHM: SelectWorkQueueRepository
INPUT: None (reads environment variables)
OUTPUT: workQueueRepository instance (SQLite or PostgreSQL)

GLOBAL CONSTANTS:
    USE_POSTGRES = process.env.USE_POSTGRES
    DATABASE_PATH = '/workspaces/agent-feed/database.db'

BEGIN
    // Read environment configuration
    usePostgres ← GetEnvironmentVariable('USE_POSTGRES')

    // Log selection for debugging
    IF usePostgres == 'true' THEN
        LOG('📊 Work Queue Mode: PostgreSQL')

        // Import PostgreSQL repository
        postgresRepo ← ImportModule('./repositories/postgres/work-queue.repository.js')

        // Verify PostgreSQL connection is available
        IF NOT PostgresManager.isConnected() THEN
            LOG('⚠️ PostgreSQL not connected, falling back to SQLite')
            RETURN CreateSQLiteWorkQueueRepository()
        END IF

        RETURN postgresRepo
    ELSE
        LOG('📊 Work Queue Mode: SQLite')

        // Import SQLite repository
        sqliteDb ← OpenDatabase(DATABASE_PATH)
        workQueueRepo ← NEW WorkQueueRepository(sqliteDb)

        RETURN workQueueRepo
    END IF
END

COMPLEXITY ANALYSIS:
    Time: O(1) - Simple conditional check
    Space: O(1) - Single repository instance
```

---

## 2. Repository Interface Specification

### Standard Interface Contract

Both SQLite and PostgreSQL repositories MUST implement this interface:

```
INTERFACE: IWorkQueueRepository

METHODS:
    // Create Operations
    createTicket(ticket: Ticket) → Promise<Ticket>
    createTicketsBulk(tickets: Array<Ticket>) → Promise<Array<Ticket>>

    // Read Operations
    getAllPendingTickets(options: QueryOptions) → Promise<Array<Ticket>>
    getTicketById(ticketId: ID) → Promise<Ticket|null>
    getNextTicket(userId: ID?) → Promise<Ticket|null>
    getTicketsByUser(userId: ID, options: QueryOptions) → Promise<Array<Ticket>>
    getTicketsByAgent(agentName: string, options: QueryOptions) → Promise<Array<Ticket>>
    getTicketsByPost(postId: ID) → Promise<Array<Ticket>>

    // Update Operations
    updateTicketStatus(ticketId: ID, status: Status) → Promise<Ticket>
    assignTicket(ticketId: ID, workerId: ID) → Promise<Ticket>
    startProcessing(ticketId: ID) → Promise<Ticket>
    completeTicket(ticketId: ID, result: Object) → Promise<Ticket>
    failTicket(ticketId: ID, error: string) → Promise<Ticket>
    retryTicket(ticketId: ID) → Promise<Ticket>

    // Monitoring Operations
    getQueueStats() → Promise<QueueStats>
    getPendingCount(userId: ID?) → Promise<number>
    getStuckTickets(timeoutMinutes: number) → Promise<Array<Ticket>>
    resetStuckTickets(timeoutMinutes: number) → Promise<number>
    cleanupOldTickets(olderThanDays: number) → Promise<number>

TYPE Ticket:
    id: ID (integer in Postgres, TEXT in SQLite)
    user_id: string
    post_id: string
    post_content: string
    post_author: string?
    post_metadata: JSONB (Postgres) | TEXT (SQLite)
    assigned_agent: string?
    priority: integer (Postgres) | TEXT enum (SQLite: P0-P3)
    status: enum('pending', 'assigned', 'processing', 'completed', 'failed')
    worker_id: string?
    retry_count: integer (default 0)
    result: JSONB (Postgres) | TEXT (SQLite)
    error_message: string?
    created_at: timestamp (Postgres) | INTEGER (SQLite)
    assigned_at: timestamp?
    started_at: timestamp?
    completed_at: timestamp?
    updated_at: timestamp (Postgres only)

TYPE QueryOptions:
    status: Status? (default 'pending')
    limit: integer (default 100)
    offset: integer (default 0)

TYPE QueueStats:
    pending_count: integer
    assigned_count: integer
    processing_count: integer
    completed_count: integer
    failed_count: integer
    total_count: integer
    avg_processing_time_seconds: integer?
    latest_ticket_time: timestamp?
```

---

## 3. Critical Method: getAllPendingTickets

This method is called by the orchestrator to retrieve work. Must be identical in both implementations.

```
ALGORITHM: GetAllPendingTickets
INPUT: options {status: string, limit: integer, offset: integer}
OUTPUT: Array<Ticket> ordered by priority and creation time

PARAMETERS (with defaults):
    status = 'pending'
    limit = 100
    offset = 0

BEGIN
    LOG('🔍 [WorkQueueRepository] getAllPendingTickets query:', options)

    IF DatabaseMode == 'PostgreSQL' THEN
        query ← "
            SELECT * FROM work_queue
            WHERE status = $1
            ORDER BY priority DESC, created_at ASC
            LIMIT $2 OFFSET $3
        "

        tickets ← ExecuteQuery(query, [status, limit, offset])
    ELSE // SQLite mode
        query ← "
            SELECT * FROM work_queue_tickets
            WHERE status = ?
            ORDER BY priority ASC, created_at ASC
            LIMIT ? OFFSET ?
        "

        tickets ← ExecutePreparedStatement(query, [status, limit, offset])

        // Deserialize JSON fields
        FOR EACH ticket IN tickets DO
            IF ticket.metadata != null THEN
                ticket.metadata ← JSON.parse(ticket.metadata)
            END IF

            IF ticket.result != null THEN
                ticket.result ← JSON.parse(ticket.result)
            END IF
        END FOR
    END IF

    LOG('📊 Query result:', tickets.length, 'tickets found')

    IF tickets.length > 0 THEN
        LOG('   First ticket: ID=', tickets[0].id,
            'status=', tickets[0].status,
            'priority=', tickets[0].priority)
    END IF

    RETURN tickets
END

COMPLEXITY ANALYSIS:
    Time: O(log n) - Database index scan on status + sort
          + O(k) for JSON parsing where k = result size
    Space: O(limit) - Result set bounded by limit parameter

NOTE: Priority ordering differs between databases
    - PostgreSQL: priority DESC (higher number = higher priority)
    - SQLite: priority ASC (P0 > P1 > P2 > P3 alphabetically)
```

---

## 4. SQLite Adaptation Algorithm

### Schema Mapping: PostgreSQL → SQLite

```
MAPPING: PostgresToSQLiteSchema

PostgreSQL work_queue → SQLite work_queue_tickets

FIELD MAPPINGS:
    id: SERIAL → TEXT (UUID v4)
    user_id: VARCHAR → TEXT
    post_id: VARCHAR → TEXT
    post_content: TEXT → TEXT
    post_author: VARCHAR → TEXT (nullable)
    post_metadata: JSONB → TEXT (JSON string)
    assigned_agent: VARCHAR → TEXT (nullable)
    priority: INTEGER → TEXT CHECK(priority IN ('P0','P1','P2','P3'))
    status: VARCHAR → TEXT CHECK(status IN ('pending','in_progress','completed','failed'))
    worker_id: VARCHAR → TEXT (nullable)
    retry_count: INTEGER → INTEGER DEFAULT 0
    result: JSONB → TEXT (JSON string)
    error_message: TEXT → last_error TEXT
    created_at: TIMESTAMP → INTEGER (Unix milliseconds)
    assigned_at: TIMESTAMP → INTEGER (nullable)
    started_at: TIMESTAMP → INTEGER (nullable)
    completed_at: TIMESTAMP → INTEGER (nullable)
    updated_at: TIMESTAMP → NOT PRESENT (removed)
```

### ALGORITHM: CreateTicket (SQLite Implementation)

```
ALGORITHM: CreateTicketSQLite
INPUT: ticketData {user_id, post_id, post_content, post_metadata, assigned_agent, priority}
OUTPUT: Created Ticket object

BEGIN
    // Generate unique ID
    ticketId ← GenerateUUID()
    currentTime ← GetCurrentTimestamp() // Unix milliseconds

    // Convert metadata to JSON string
    metadataJson ← JSON.stringify(ticketData.post_metadata || {})

    // Prepare SQL statement
    query ← "
        INSERT INTO work_queue_tickets (
            id, user_id, agent_id, content, url, priority, status,
            retry_count, metadata, post_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "

    // Execute with parameterized values
    ExecutePreparedStatement(query, [
        ticketId,
        ticketData.user_id || 'anonymous',
        ticketData.assigned_agent || null,
        ticketData.post_content,
        null, // url not used in this context
        ticketData.priority || 'P2',
        'pending',
        0, // retry_count
        metadataJson,
        ticketData.post_id || null,
        currentTime
    ])

    // Retrieve and return created ticket
    createdTicket ← GetTicketById(ticketId)
    RETURN createdTicket
END

COMPLEXITY ANALYSIS:
    Time: O(1) - Single insert operation
    Space: O(m) where m = size of metadata JSON
```

### ALGORITHM: CreateTicket (PostgreSQL Implementation)

```
ALGORITHM: CreateTicketPostgres
INPUT: ticketData {user_id, post_id, post_content, post_metadata, assigned_agent, priority}
OUTPUT: Created Ticket object

BEGIN
    // Prepare SQL with RETURNING clause
    query ← "
        INSERT INTO work_queue (
            user_id, post_id, post_content, post_author,
            post_metadata, assigned_agent, priority,
            status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, 'pending', NOW(), NOW())
        RETURNING *
    "

    // Execute with parameterized values
    result ← ExecuteQuery(query, [
        ticketData.user_id || 'anonymous',
        ticketData.post_id,
        ticketData.post_content,
        ticketData.post_author || null,
        JSON.stringify(ticketData.post_metadata || {}), // Cast to JSONB
        ticketData.assigned_agent || null,
        ticketData.priority || 0
    ])

    // PostgreSQL returns the created row directly
    RETURN result.rows[0]
END

COMPLEXITY ANALYSIS:
    Time: O(1) - Single insert with RETURNING
    Space: O(m) where m = size of metadata JSONB
```

---

## 5. Orchestrator Integration

### ALGORITHM: OrchestratorProcessWorkQueue

```
ALGORITHM: ProcessWorkQueue
INPUT: None
OUTPUT: None (side effect: spawns workers)

INSTANCE VARIABLES:
    maxWorkers: integer (default 5)
    activeWorkers: Map<workerId, Worker>
    workQueueRepo: IWorkQueueRepository

BEGIN
    // Check capacity
    activeCount ← activeWorkers.size

    IF activeCount >= maxWorkers THEN
        RETURN // At capacity, skip this cycle
    END IF

    // Calculate available slots
    availableSlots ← maxWorkers - activeCount

    // Fetch pending tickets using unified interface
    tickets ← AWAIT workQueueRepo.getAllPendingTickets({
        status: 'pending',
        limit: availableSlots
    })

    IF tickets.length == 0 THEN
        RETURN // No work to do
    END IF

    LOG('📋 Found', tickets.length, 'pending tickets, spawning workers...')

    // Spawn workers for each ticket
    FOR EACH ticket IN tickets DO
        AWAIT SpawnWorker(ticket)
    END FOR
END

ALGORITHM: SpawnWorker
INPUT: ticket (Ticket object)
OUTPUT: None (side effect: spawns async worker)

BEGIN
    // Generate unique worker ID
    workerId ← 'worker-' + CurrentTimestamp() + '-' + RandomString()

    // Check if this is a comment ticket
    isComment ← (ticket.post_metadata != null AND
                 ticket.post_metadata.type == 'comment')

    IF isComment THEN
        // Route to comment processing pipeline
        AWAIT ProcessCommentTicket(ticket, workerId)
        RETURN
    END IF

    // Mark ticket as in_progress
    AWAIT workQueueRepo.updateTicketStatus(
        ticket.id.toString(),
        'in_progress'
    )

    // Create worker instance
    worker ← NEW AgentWorker({
        workerId: workerId,
        ticketId: ticket.id.toString(),
        agentId: ticket.agent_id,
        workQueueRepo: workQueueRepo,
        websocketService: websocketService
    })

    // Track worker
    activeWorkers.set(workerId, worker)
    workersSpawned ← workersSpawned + 1

    // Execute asynchronously with promise handling
    worker.execute()
        .then(ASYNC FUNCTION(result)
            LOG('✅ Worker', workerId, 'completed successfully')
            ticketsProcessed ← ticketsProcessed + 1

            // Mark ticket as completed
            AWAIT workQueueRepo.completeTicket(
                ticket.id.toString(),
                {
                    result: result.response,
                    tokens_used: result.tokensUsed || 0
                }
            )
        )
        .catch(ASYNC FUNCTION(error)
            LOG('❌ Worker', workerId, 'failed:', error)

            // Mark ticket as failed (with retry logic)
            AWAIT workQueueRepo.failTicket(
                ticket.id.toString(),
                error.message
            )
        )
        .finally(FUNCTION()
            // Clean up worker
            activeWorkers.delete(workerId)
            LOG('🗑️ Worker', workerId, 'destroyed')
        )

    // Update context size estimate
    contextSize ← contextSize + 2000
END

COMPLEXITY ANALYSIS:
    ProcessWorkQueue Time: O(n * W) where n = tickets.length, W = worker spawn time
    ProcessWorkQueue Space: O(n) for worker instances

    Note: Workers run asynchronously, actual processing is parallel
```

---

## 6. Comment Detection and Routing

### ALGORITHM: DetectCommentTicket

```
ALGORITHM: DetectCommentTicket
INPUT: ticket (Ticket object)
OUTPUT: boolean (true if comment, false if post)

BEGIN
    // Check if post_metadata exists
    IF ticket.post_metadata == null THEN
        RETURN false
    END IF

    // Check if type field indicates comment
    IF ticket.post_metadata.type == 'comment' THEN
        RETURN true
    END IF

    // Additional check: presence of parent_post_id or parent_comment_id
    IF ticket.post_metadata.parent_post_id != null OR
       ticket.post_metadata.parent_comment_id != null THEN
        RETURN true
    END IF

    RETURN false
END

COMPLEXITY ANALYSIS:
    Time: O(1) - Simple field access
    Space: O(1) - No additional memory
```

### ALGORITHM: ProcessCommentTicket

```
ALGORITHM: ProcessCommentTicket
INPUT: ticket (Ticket), workerId (string)
OUTPUT: None (side effect: creates reply comment)

BEGIN
    LOG('💬 Processing comment ticket:', ticket.id)

    // Extract comment metadata
    metadata ← ticket.post_metadata || {}
    commentId ← ticket.post_id
    parentPostId ← metadata.parent_post_id
    parentCommentId ← metadata.parent_comment_id
    content ← ticket.post_content

    // Mark ticket as in_progress
    AWAIT workQueueRepo.updateTicketStatus(
        ticket.id.toString(),
        'in_progress'
    )

    // Load parent post context for agent
    parentPost ← null
    TRY
        dbSelector ← ImportModule('./config/database-selector.js')
        parentPost ← AWAIT dbSelector.getPostById(parentPostId)
    CATCH error
        LOG('⚠️ Failed to load parent post:', error)
    END TRY

    // Route comment to appropriate agent
    agent ← RouteCommentToAgent(content, metadata)
    LOG('🎯 Routing comment to agent:', agent)

    // Build agent prompt with context
    prompt ← BuildCommentPrompt({
        comment: content,
        parentPost: parentPost,
        metadata: metadata
    })

    // Create worker to generate reply
    worker ← NEW AgentWorker({
        workerId: workerId,
        ticketId: ticket.id.toString(),
        agentId: agent,
        prompt: prompt,
        workQueueRepo: workQueueRepo
    })

    // Execute worker with comment-specific handling
    result ← AWAIT worker.execute()

    // Create reply comment
    replyComment ← AWAIT dbSelector.createComment({
        post_id: parentPostId,
        parent_id: commentId, // Reply to the comment
        author_agent: agent,
        content: result.response
    })

    // Mark ticket as completed
    AWAIT workQueueRepo.completeTicket(
        ticket.id.toString(),
        {
            reply_comment_id: replyComment.id,
            agent: agent,
            tokens_used: result.tokensUsed || 0
        }
    )

    LOG('✅ Comment reply created:', replyComment.id)
END

ALGORITHM: RouteCommentToAgent
INPUT: content (string), metadata (object)
OUTPUT: agentName (string)

BEGIN
    // Check for explicit agent mention
    mentionedAgents ← metadata.mentioned_agents || []

    IF mentionedAgents.length > 0 THEN
        RETURN mentionedAgents[0] // Route to first mentioned agent
    END IF

    // Content-based routing
    contentLower ← content.toLowerCase()

    IF Contains(contentLower, '@dev') OR Contains(contentLower, 'code') THEN
        RETURN 'developer-agent'
    ELSE IF Contains(contentLower, '@support') OR Contains(contentLower, 'help') THEN
        RETURN 'support-agent'
    ELSE IF Contains(contentLower, '@review') THEN
        RETURN 'review-agent'
    ELSE
        // Default agent
        RETURN 'general-assistant-agent'
    END IF
END

COMPLEXITY ANALYSIS:
    ProcessCommentTicket Time: O(W + D + C) where:
        W = worker execution time
        D = database query time
        C = comment creation time

    RouteCommentToAgent Time: O(m + n) where:
        m = content length (string search)
        n = number of mentioned agents

    Space: O(p) where p = parent post size
```

---

## 7. Error Handling and Retry Logic

### ALGORITHM: FailTicketWithRetry

```
ALGORITHM: FailTicket
INPUT: ticketId (ID), errorMessage (string), shouldRetry (boolean = true)
OUTPUT: Updated Ticket object

CONSTANTS:
    MAX_RETRIES = 3

BEGIN
    // Get current ticket state
    ticket ← AWAIT GetTicketById(ticketId)

    IF ticket == null THEN
        THROW Error('Ticket not found:', ticketId)
    END IF

    // Increment retry count
    newRetryCount ← (ticket.retry_count || 0) + 1

    LOG('❌ Ticket', ticketId, 'failed (attempt', newRetryCount, '/', MAX_RETRIES, '):', errorMessage)

    IF DatabaseMode == 'PostgreSQL' THEN
        // PostgreSQL implementation
        query ← "
            UPDATE work_queue
            SET status = 'failed',
                error_message = $1,
                retry_count = retry_count + 1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING *
        "

        result ← AWAIT ExecuteQuery(query, [errorMessage, ticketId])
        updatedTicket ← result.rows[0]

    ELSE // SQLite implementation
        IF newRetryCount < MAX_RETRIES THEN
            // Retry: set back to pending
            query ← "
                UPDATE work_queue_tickets
                SET status = 'pending',
                    retry_count = ?,
                    last_error = ?
                WHERE id = ?
            "

            ExecutePreparedStatement(query, [newRetryCount, errorMessage, ticketId])
            LOG('🔄 Ticket', ticketId, 'reset to pending for retry')
        ELSE
            // Max retries: mark as permanently failed
            query ← "
                UPDATE work_queue_tickets
                SET status = 'failed',
                    retry_count = ?,
                    last_error = ?,
                    completed_at = ?
                WHERE id = ?
            "

            ExecutePreparedStatement(query, [newRetryCount, errorMessage, CurrentTimestamp(), ticketId])
            LOG('⛔ Ticket', ticketId, 'permanently failed after', MAX_RETRIES, 'attempts')
        END IF

        updatedTicket ← AWAIT GetTicketById(ticketId)
    END IF

    // If should retry and under max retries (PostgreSQL path)
    IF shouldRetry AND updatedTicket.retry_count < MAX_RETRIES THEN
        RETURN AWAIT RetryTicket(ticketId)
    END IF

    RETURN updatedTicket
END

ALGORITHM: RetryTicket
INPUT: ticketId (ID)
OUTPUT: Updated Ticket object

BEGIN
    IF DatabaseMode == 'PostgreSQL' THEN
        query ← "
            UPDATE work_queue
            SET status = 'pending',
                worker_id = NULL,
                assigned_at = NULL,
                started_at = NULL,
                error_message = NULL,
                updated_at = NOW()
            WHERE id = $1 AND status = 'failed'
            RETURNING *
        "

        result ← AWAIT ExecuteQuery(query, [ticketId])

        IF result.rows.length == 0 THEN
            THROW Error('Ticket not found or not in failed state:', ticketId)
        END IF

        RETURN result.rows[0]
    ELSE // SQLite already handles retry in failTicket
        // This is called from PostgreSQL path only
        THROW Error('RetryTicket should not be called directly in SQLite mode')
    END IF
END

COMPLEXITY ANALYSIS:
    FailTicket Time: O(1) - Single update query
    FailTicket Space: O(1) - Fixed memory for ticket object

    RetryTicket Time: O(1) - Single update query
    RetryTicket Space: O(1) - Fixed memory
```

---

## 8. Database Availability and Fallback

### ALGORITHM: InitializeWithFallback

```
ALGORITHM: InitializeDatabaseSelector
INPUT: None
OUTPUT: Configured database selector instance

BEGIN
    usePostgres ← GetEnvironmentVariable('USE_POSTGRES') == 'true'
    sqliteDb ← null
    workQueueRepo ← null

    IF usePostgres THEN
        LOG('🔌 Attempting PostgreSQL connection...')

        TRY
            // Connect to PostgreSQL
            AWAIT PostgresManager.connect()
            isHealthy ← AWAIT PostgresManager.healthCheck()

            IF NOT isHealthy THEN
                LOG('❌ PostgreSQL health check failed')
                LOG('⚠️ Falling back to SQLite mode')
                usePostgres ← false
            ELSE
                LOG('✅ PostgreSQL connection established')
                workQueueRepo ← ImportModule('./repositories/postgres/work-queue.repository.js')
            END IF

        CATCH error
            LOG('❌ PostgreSQL connection error:', error.message)
            LOG('⚠️ Falling back to SQLite mode')
            usePostgres ← false
        END TRY
    END IF

    IF NOT usePostgres THEN
        // Connect to SQLite as fallback
        sqliteDb ← OpenDatabase('/workspaces/agent-feed/database.db')
        workQueueRepo ← NEW WorkQueueRepository(sqliteDb)
        LOG('✅ SQLite work queue initialized')
    END IF

    RETURN {
        workQueueRepo: workQueueRepo,
        usePostgres: usePostgres
    }
END

COMPLEXITY ANALYSIS:
    Time: O(C) where C = database connection time
    Space: O(1) - Single repository instance
```

---

## 9. Integration with DatabaseSelector Class

### ALGORITHM: AddWorkQueueToSelector

```
ALGORITHM: ExtendDatabaseSelector
INPUT: DatabaseSelector class instance
OUTPUT: Modified class with work queue support

BEGIN
    CLASS DatabaseSelector
        INSTANCE VARIABLES:
            usePostgres: boolean
            sqliteDb: Database
            workQueueRepo: IWorkQueueRepository

        METHOD initialize()
            // ... existing initialization code ...

            // Initialize work queue repository
            IF this.usePostgres THEN
                this.workQueueRepo ← ImportModule('./repositories/postgres/work-queue.repository.js')
            ELSE
                // Create SQLite repository
                WorkQueueRepoClass ← ImportModule('./repositories/work-queue-repository.js')
                this.workQueueRepo ← NEW WorkQueueRepoClass(this.sqliteDb)
            END IF

            LOG('✅ Work queue repository initialized:', this.usePostgres ? 'PostgreSQL' : 'SQLite')
        END METHOD

        METHOD getAllPendingTickets(options)
            RETURN AWAIT this.workQueueRepo.getAllPendingTickets(options)
        END METHOD

        METHOD createTicket(ticketData)
            RETURN AWAIT this.workQueueRepo.createTicket(ticketData)
        END METHOD

        METHOD getTicketById(ticketId)
            RETURN AWAIT this.workQueueRepo.getTicketById(ticketId)
        END METHOD

        METHOD updateTicketStatus(ticketId, status)
            RETURN AWAIT this.workQueueRepo.updateTicketStatus(ticketId, status)
        END METHOD

        METHOD completeTicket(ticketId, result)
            RETURN AWAIT this.workQueueRepo.completeTicket(ticketId, result)
        END METHOD

        METHOD failTicket(ticketId, error)
            RETURN AWAIT this.workQueueRepo.failTicket(ticketId, error)
        END METHOD

        METHOD getQueueStats()
            RETURN AWAIT this.workQueueRepo.getQueueStats()
        END METHOD
    END CLASS
END

USAGE PATTERN:
    // In server.js
    dbSelector ← ImportModule('./config/database-selector.js')
    AWAIT dbSelector.initialize()

    // Access work queue through selector
    tickets ← AWAIT dbSelector.getAllPendingTickets({ limit: 10 })

    // Pass to orchestrator
    orchestrator ← NEW AviOrchestrator(config, dbSelector, websocketService)
```

---

## 10. Prepared Statement Differences

### SQLite vs PostgreSQL Syntax

```
COMPARISON: PreparedStatementSyntax

SQLITE SYNTAX:
    // Positional parameters with ? placeholders
    stmt = db.prepare("SELECT * FROM tickets WHERE id = ? AND status = ?")
    result = stmt.get(ticketId, 'pending')

    // Named parameters not used in this codebase

POSTGRESQL SYNTAX:
    // Numbered parameters with $n placeholders
    query = "SELECT * FROM tickets WHERE id = $1 AND status = $2"
    result = await pool.query(query, [ticketId, 'pending'])

    // Type casting for JSON
    query = "INSERT INTO tickets (metadata) VALUES ($1::jsonb)"
    result = await pool.query(query, [JSON.stringify(data)])

KEY DIFFERENCES:
    1. Placeholder syntax: ? vs $n
    2. JSON handling: TEXT vs JSONB with ::jsonb cast
    3. Timestamps: INTEGER milliseconds vs TIMESTAMP NOW()
    4. Return values: .get()/.all() vs result.rows[]
    5. Async: Synchronous vs Promise-based
```

### ALGORITHM: ConvertSQLSyntax

```
ALGORITHM: AdaptQuerySyntax
INPUT: postgresQuery (string), values (array)
OUTPUT: {sqliteQuery: string, convertedValues: array}

BEGIN
    IF DatabaseMode == 'PostgreSQL' THEN
        RETURN {query: postgresQuery, values: values}
    END IF

    // Convert PostgreSQL to SQLite syntax
    sqliteQuery ← postgresQuery

    // Replace $n with ?
    FOR i ← 1 TO CountParameters(postgresQuery) DO
        sqliteQuery ← Replace(sqliteQuery, '$' + i, '?')
    END FOR

    // Remove ::jsonb casts
    sqliteQuery ← Replace(sqliteQuery, '::jsonb', '')

    // Replace NOW() with current timestamp
    IF Contains(sqliteQuery, 'NOW()') THEN
        sqliteQuery ← Replace(sqliteQuery, 'NOW()', '?')
        values.push(CurrentTimestamp())
    END IF

    // Replace RETURNING * with separate SELECT
    IF Contains(sqliteQuery, 'RETURNING *') THEN
        sqliteQuery ← Replace(sqliteQuery, 'RETURNING *', '')
        // Note: Caller must do separate SELECT after INSERT
    END IF

    RETURN {query: sqliteQuery, values: values}
END

EXAMPLE USAGE:
    // PostgreSQL query
    pgQuery = "INSERT INTO work_queue (metadata, created_at) VALUES ($1::jsonb, NOW()) RETURNING *"
    pgValues = [JSON.stringify({type: 'comment'})]

    // Convert to SQLite
    result = AdaptQuerySyntax(pgQuery, pgValues)
    // result.query: "INSERT INTO work_queue (metadata, created_at) VALUES (?, ?)"
    // result.values: [JSON.stringify({type: 'comment'}), CurrentTimestamp()]
```

---

## 11. Complete Workflow Example

### End-to-End Comment Processing

```
WORKFLOW: CommentToReplyPipeline

SCENARIO: User comments on a post, agent automatically replies

STEP 1: Comment Creation
    User creates comment:
        POST /api/posts/{postId}/comments
        Body: {
            content: "@dev Can you explain how authentication works?",
            author: "user123"
        }

    Server creates comment:
        comment ← dbSelector.createComment({
            post_id: postId,
            author: 'user123',
            content: '...',
            mentioned_users: ['@dev']
        })

STEP 2: Ticket Creation
    Hook triggers after comment creation:
        ticket ← dbSelector.createTicket({
            post_id: comment.id,
            post_content: comment.content,
            post_metadata: {
                type: 'comment',
                parent_post_id: postId,
                parent_comment_id: null,
                mentioned_agents: ['developer-agent']
            },
            assigned_agent: 'developer-agent',
            priority: 1 (PostgreSQL) or 'P1' (SQLite),
            user_id: 'user123'
        })

    Ticket stored in:
        PostgreSQL: work_queue table
        SQLite: work_queue_tickets table

STEP 3: Orchestrator Polling
    Every 5 seconds, orchestrator runs:
        tickets ← AWAIT dbSelector.getAllPendingTickets({limit: 5})

        // Returns: [{
        //   id: 'ticket-123',
        //   post_id: 'comment-456',
        //   post_content: '@dev Can you explain...',
        //   post_metadata: {type: 'comment', ...},
        //   status: 'pending',
        //   ...
        // }]

STEP 4: Comment Detection
    FOR EACH ticket IN tickets DO
        isComment ← DetectCommentTicket(ticket)
        // Returns true because ticket.post_metadata.type == 'comment'

        IF isComment THEN
            AWAIT ProcessCommentTicket(ticket, workerId)
        END IF
    END FOR

STEP 5: Agent Routing
    agent ← RouteCommentToAgent(
        ticket.post_content,
        ticket.post_metadata
    )

    // Returns: 'developer-agent' (from mentioned_agents)

STEP 6: Context Loading
    parentPost ← AWAIT dbSelector.getPostById(
        ticket.post_metadata.parent_post_id
    )

    // Load original post for context

STEP 7: Agent Execution
    worker ← NEW AgentWorker({
        agentId: 'developer-agent',
        ticketId: ticket.id,
        prompt: BuildCommentPrompt({
            comment: ticket.post_content,
            parentPost: parentPost,
            metadata: ticket.post_metadata
        })
    })

    result ← AWAIT worker.execute()

    // Result: {
    //   response: "Authentication in our system uses JWT tokens...",
    //   tokensUsed: 1500
    // }

STEP 8: Reply Creation
    replyComment ← AWAIT dbSelector.createComment({
        post_id: parentPost.id,
        parent_id: ticket.post_id, // Reply to comment
        author_agent: 'developer-agent',
        content: result.response
    })

STEP 9: Ticket Completion
    AWAIT dbSelector.completeTicket(ticket.id, {
        reply_comment_id: replyComment.id,
        agent: 'developer-agent',
        tokens_used: result.tokensUsed
    })

    Ticket status: 'completed'
    Result stored in result field (JSON)

STEP 10: WebSocket Notification (Optional)
    websocketService.broadcast('comment:reply', {
        postId: parentPost.id,
        commentId: ticket.post_id,
        replyId: replyComment.id,
        agent: 'developer-agent'
    })

    User receives real-time notification of reply

TIMING:
    Comment created at t=0s
    Ticket created at t=0.1s
    Orchestrator polls at t=5s (next cycle)
    Agent processing starts at t=5.1s
    Reply created at t=8s (assuming 3s processing)
    Total latency: ~8 seconds

ERROR HANDLING:
    IF agent execution fails at Step 7:
        AWAIT dbSelector.failTicket(ticket.id, error.message)

        IF retry_count < 3:
            Ticket reset to 'pending'
            Orchestrator will retry in next cycle
        ELSE:
            Ticket marked 'failed' permanently
            Alert sent to admin
```

---

## 12. Complexity Analysis Summary

### Overall System Complexity

```
OPERATION COMPLEXITIES:

Database Selection:
    Time: O(1) - Environment variable check
    Space: O(1) - Single repository instance

Ticket Creation:
    Time: O(1) - Single INSERT operation
    Space: O(m) where m = metadata size

Get Pending Tickets:
    Time: O(log n + k) where:
        n = total tickets in database
        k = limit parameter (result set size)
    Space: O(k) - Result set
    Note: Uses index on (status, priority, created_at)

Process Work Queue:
    Time: O(k * W) where:
        k = number of tickets
        W = worker spawn overhead (~100ms)
    Space: O(k) - Worker instances
    Note: Workers run asynchronously in parallel

Worker Execution:
    Time: O(A) where A = agent processing time (1-30 seconds)
    Space: O(C) where C = context size
    Note: Dominated by LLM inference time

Comment Processing:
    Time: O(D + A + I) where:
        D = database query for parent post
        A = agent execution
        I = comment insertion
    Space: O(P + R) where:
        P = parent post size
        R = reply content size

Ticket Completion:
    Time: O(1) - Single UPDATE operation
    Space: O(r) where r = result size

Fail with Retry:
    Time: O(1) - Single UPDATE operation
    Space: O(1) - Fixed

JSON Serialization (SQLite):
    Time: O(s) where s = JSON string size
    Space: O(s) - Parsed object

SCALABILITY:
    Bottleneck: Agent execution time (A)
    Throughput: maxWorkers / averageProcessingTime
    Example: 5 workers / 10s average = 0.5 tickets/second = 1800 tickets/hour

    Database query overhead is negligible compared to agent processing
```

---

## 13. Design Patterns Used

### Repository Pattern
- Abstracts database operations behind interface
- Allows swapping SQLite ↔ PostgreSQL without changing business logic

### Adapter Pattern
- SQLite repository adapts to PostgreSQL interface
- Database selector adapts environment configuration to repository selection

### Strategy Pattern
- Different retry strategies for SQLite vs PostgreSQL
- Different JSON handling strategies

### Facade Pattern
- DatabaseSelector provides unified API for all database operations
- Hides complexity of dual-database support

### Observer Pattern (implied)
- WebSocket notifications after ticket completion
- Real-time updates to connected clients

---

## 14. Testing Considerations

### Unit Tests Required

```
TEST SUITE: WorkQueueRepository

TEST: CreateTicket_PostgreSQL
    GIVEN: PostgreSQL mode enabled
    WHEN: createTicket() called with valid data
    THEN: Ticket inserted into work_queue table
    AND: RETURNING clause returns created ticket
    AND: post_metadata stored as JSONB

TEST: CreateTicket_SQLite
    GIVEN: SQLite mode enabled
    WHEN: createTicket() called with valid data
    THEN: Ticket inserted into work_queue_tickets table
    AND: UUID generated for id field
    AND: metadata stored as JSON string
    AND: Separate SELECT retrieves created ticket

TEST: GetAllPendingTickets_BothDatabases
    GIVEN: 10 tickets with mixed priorities in database
    WHEN: getAllPendingTickets({limit: 5}) called
    THEN: Returns exactly 5 tickets
    AND: All have status='pending'
    AND: Ordered by priority (high to low)
    AND: Then ordered by created_at (old to new)

TEST: DatabaseFallback
    GIVEN: USE_POSTGRES=true but PostgreSQL unavailable
    WHEN: DatabaseSelector.initialize() called
    THEN: Logs fallback message
    AND: SQLite repository initialized
    AND: usePostgres flag set to false

TEST: FailTicketWithRetry_SQLite
    GIVEN: Ticket with retry_count=1 in SQLite
    WHEN: failTicket() called
    THEN: retry_count incremented to 2
    AND: status reset to 'pending' (retry)
    AND: last_error field updated

TEST: FailTicketPermanent_SQLite
    GIVEN: Ticket with retry_count=3 in SQLite
    WHEN: failTicket() called
    THEN: status set to 'failed'
    AND: retry_count incremented to 4
    AND: completed_at timestamp set

TEST: CommentDetection
    GIVEN: Ticket with post_metadata.type='comment'
    WHEN: DetectCommentTicket() called
    THEN: Returns true

    GIVEN: Ticket with post_metadata.type='post'
    WHEN: DetectCommentTicket() called
    THEN: Returns false

TEST: AgentRouting
    GIVEN: Comment content="@dev How does this work?"
    WHEN: RouteCommentToAgent() called
    THEN: Returns 'developer-agent'

    GIVEN: No mentioned agents, generic question
    WHEN: RouteCommentToAgent() called
    THEN: Returns 'general-assistant-agent'
```

---

## 15. Implementation Checklist

```
IMPLEMENTATION STEPS:

Phase 1: Repository Interface
  ☐ Create IWorkQueueRepository interface definition
  ☐ Verify PostgreSQL repository implements all methods
  ☐ Add getAllPendingTickets() to SQLite repository
  ☐ Ensure both return identical data structures

Phase 2: Database Selector Integration
  ☐ Add workQueueRepo property to DatabaseSelector class
  ☐ Initialize work queue repo in constructor
  ☐ Add delegation methods (getAllPendingTickets, createTicket, etc.)
  ☐ Export work queue methods from dbSelector singleton

Phase 3: Server.js Refactoring
  ☐ Remove hardcoded import: repositories/postgres/work-queue.repository.js
  ☐ Change to: import { dbSelector } from './config/database-selector.js'
  ☐ Update orchestrator initialization to use dbSelector
  ☐ Verify all work queue calls go through dbSelector

Phase 4: Orchestrator Updates
  ☐ Accept dbSelector as constructor parameter
  ☐ Use dbSelector.getAllPendingTickets() instead of direct repo
  ☐ Update all ticket operations to use dbSelector
  ☐ Test with both SQLite and PostgreSQL modes

Phase 5: Testing
  ☐ Unit tests for both repositories
  ☐ Integration tests for orchestrator
  ☐ Test database fallback mechanism
  ☐ Test comment detection and routing
  ☐ Performance benchmarks

Phase 6: Deployment
  ☐ Update environment variable documentation
  ☐ Test in staging with PostgreSQL
  ☐ Test in staging with SQLite fallback
  ☐ Monitor logs for database mode selection
  ☐ Deploy to production
```

---

## Conclusion

This pseudocode provides a complete algorithmic specification for implementing the database selector pattern for the work queue repository. The key design principles are:

1. **Unified Interface**: Both SQLite and PostgreSQL repositories implement identical methods
2. **Transparent Selection**: DatabaseSelector automatically chooses based on environment
3. **Graceful Fallback**: Falls back to SQLite if PostgreSQL unavailable
4. **Zero Business Logic Changes**: Orchestrator and workers unchanged
5. **Type Safety**: Clear data structures and contracts

The implementation maintains consistency with existing patterns in the codebase while adding robust error handling and retry logic for production reliability.
