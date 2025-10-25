# SPARC Pseudocode: Subdirectory Search & Badge Updates

## Overview

This document contains algorithmic pseudocode for two critical fixes:
1. Recursive workspace file search for intelligence briefings
2. WebSocket-driven ticket status updates with badge synchronization

## Fix 1: Recursive Workspace File Search

### Problem Statement
The current file search algorithm only checks the top-level workspace directory for intelligence briefing files. When briefings are stored in subdirectories (intelligence/, summaries/), they are not found, leading to missing context in AVI responses.

### Algorithm Design

#### Main Algorithm: findIntelligenceFilesRecursive

```
ALGORITHM: findIntelligenceFilesRecursive
INPUT: workspaceDir (string) - absolute path to workspace root
OUTPUT: briefingContent (string) or null

CONSTANTS:
    PRIORITY_PATHS = [
        "intelligence",
        "summaries",
        "."
    ]
    BRIEFING_PREFIX = "lambda-vi-briefing-"
    BRIEFING_SECTION = "## Executive Brief"

BEGIN
    // Phase 1: Define search priority order
    searchPaths ← []
    FOR EACH relativePath IN PRIORITY_PATHS DO
        absolutePath ← joinPath(workspaceDir, relativePath)
        searchPaths.append(absolutePath)
    END FOR

    // Phase 2: Search each path in priority order
    FOR EACH searchPath IN searchPaths DO
        result ← searchPathForBriefing(searchPath)
        IF result IS NOT null THEN
            RETURN result
        END IF
    END FOR

    // Phase 3: No briefing found
    RETURN null
END

SUBROUTINE: searchPathForBriefing
INPUT: directoryPath (string)
OUTPUT: briefingContent (string) or null

BEGIN
    // Validate path exists
    IF NOT directoryExists(directoryPath) THEN
        RETURN null
    END IF

    // Read directory contents
    TRY
        allFiles ← readDirectory(directoryPath)
    CATCH error
        logWarning("Cannot read directory: " + directoryPath)
        RETURN null
    END TRY

    // Filter for briefing files
    briefingFiles ← []
    FOR EACH file IN allFiles DO
        IF file.name.startsWith(BRIEFING_PREFIX) AND file.isFile THEN
            briefingFiles.append(file)
        END IF
    END FOR

    // Check if any briefings found
    IF briefingFiles.isEmpty() THEN
        RETURN null
    END IF

    // Sort by modification time (newest first)
    briefingFiles.sortBy(modificationTime, DESCENDING)
    mostRecentFile ← briefingFiles[0]

    // Read and extract content
    fullPath ← joinPath(directoryPath, mostRecentFile.name)
    content ← extractBriefingSection(fullPath)

    RETURN content
END

SUBROUTINE: extractBriefingSection
INPUT: filePath (string)
OUTPUT: briefSection (string) or null

BEGIN
    // Read file contents
    TRY
        content ← readFile(filePath)
    CATCH error
        logError("Cannot read file: " + filePath)
        RETURN null
    END TRY

    // Find executive brief section
    lines ← content.split("\n")
    inBriefSection ← false
    briefLines ← []

    FOR EACH line IN lines DO
        // Check for section start
        IF line.startsWith(BRIEFING_SECTION) THEN
            inBriefSection ← true
            briefLines.append(line)
            CONTINUE
        END IF

        // Check for next section (stops extraction)
        IF inBriefSection AND line.startsWith("##") THEN
            BREAK
        END IF

        // Collect section content
        IF inBriefSection THEN
            briefLines.append(line)
        END IF
    END FOR

    // Return extracted section
    IF briefLines.isEmpty() THEN
        RETURN null
    END IF

    RETURN briefLines.join("\n").trim()
END
```

### Complexity Analysis

**Time Complexity:**
- Directory traversal: O(p) where p = number of priority paths (constant: 3)
- File listing per directory: O(n) where n = files in directory
- Sorting briefing files: O(k log k) where k = number of briefing files
- File reading: O(m) where m = file size
- Section extraction: O(m) where m = file size
- Total: O(p * (n + k log k + m)) ≈ O(n + m) in practice

**Space Complexity:**
- Path array: O(p) = O(1)
- File list: O(n)
- Briefing file list: O(k)
- File content: O(m)
- Total: O(n + m)

### Edge Cases Handled

1. **Missing directories**: Skip non-existent paths, continue search
2. **Empty directories**: Return null if no briefing files found
3. **Multiple briefings**: Select most recently modified
4. **Missing section**: Return null if "Executive Brief" not found
5. **Permission errors**: Catch and log, continue search
6. **Malformed files**: Handle parsing errors gracefully

---

## Fix 2: WebSocket Ticket Status Updates

### Problem Statement
Ticket status badges do not update in real-time when ticket status changes. The frontend receives WebSocket events but fails to trigger component re-renders, causing stale UI state.

### Algorithm Design

#### Main Algorithm: setupTicketStatusListener

```
ALGORITHM: setupTicketStatusListener
INPUT: none
OUTPUT: none (side effects: event listener registration)

EVENT HANDLERS:
    - ticket:status:update
    - ticket:created
    - ticket:completed

BEGIN
    // Register WebSocket event listener
    websocketService.on('ticket:status:update', handleTicketStatusUpdate)
    websocketService.on('ticket:created', handleTicketCreated)
    websocketService.on('ticket:completed', handleTicketCompleted)

    // Log listener registration
    logInfo("Ticket status listeners registered")
END

SUBROUTINE: handleTicketStatusUpdate
INPUT: eventData (object)
    - ticket_id (string)
    - post_id (string)
    - status (string)
    - timestamp (number)
OUTPUT: none (side effects: state updates)

BEGIN
    // Extract event data
    ticketId ← eventData.ticket_id
    postId ← eventData.post_id
    newStatus ← eventData.status
    timestamp ← eventData.timestamp

    // Validate event data
    IF ticketId IS null OR postId IS null OR newStatus IS null THEN
        logWarning("Invalid ticket status update event", eventData)
        RETURN
    END IF

    // Phase 1: Update tickets state
    updateTicketsState(ticketId, newStatus, timestamp)

    // Phase 2: Trigger post re-render
    triggerPostUpdate(postId, timestamp)

    // Phase 3: Log update
    logInfo("Ticket status updated", {
        ticketId: ticketId,
        postId: postId,
        status: newStatus
    })
END

SUBROUTINE: updateTicketsState
INPUT: ticketId (string), newStatus (string), timestamp (number)
OUTPUT: none (side effects: state mutation)

BEGIN
    // Update tickets using React state updater
    setTickets(currentTickets => BEGIN
        updatedTickets ← []

        FOR EACH ticket IN currentTickets DO
            IF ticket.id EQUALS ticketId THEN
                // Update matching ticket
                updatedTicket ← {
                    ...ticket,
                    status: newStatus,
                    updatedAt: timestamp
                }
                updatedTickets.append(updatedTicket)
            ELSE
                // Keep other tickets unchanged
                updatedTickets.append(ticket)
            END IF
        END FOR

        RETURN updatedTickets
    END)
END

SUBROUTINE: triggerPostUpdate
INPUT: postId (string), timestamp (number)
OUTPUT: none (side effects: state mutation)

BEGIN
    // Force post component re-render by updating posts state
    setPosts(currentPosts => BEGIN
        updatedPosts ← []

        FOR EACH post IN currentPosts DO
            IF post.id EQUALS postId THEN
                // Add re-render trigger
                updatedPost ← {
                    ...post,
                    _ticketUpdate: timestamp,
                    _forceRender: generateUniqueId()
                }
                updatedPosts.append(updatedPost)
            ELSE
                // Keep other posts unchanged
                updatedPosts.append(post)
            END IF
        END FOR

        RETURN updatedPosts
    END)
END

SUBROUTINE: handleTicketCreated
INPUT: eventData (object)
    - ticket (object)
    - post_id (string)
OUTPUT: none (side effects: state updates)

BEGIN
    newTicket ← eventData.ticket
    postId ← eventData.post_id

    // Add new ticket to state
    setTickets(currentTickets => BEGIN
        RETURN [...currentTickets, newTicket]
    END)

    // Trigger post re-render
    triggerPostUpdate(postId, Date.now())

    logInfo("New ticket created", {ticketId: newTicket.id})
END

SUBROUTINE: handleTicketCompleted
INPUT: eventData (object)
    - ticket_id (string)
    - post_id (string)
    - result (object)
OUTPUT: none (side effects: state updates)

BEGIN
    ticketId ← eventData.ticket_id
    postId ← eventData.post_id

    // Update ticket with completion data
    setTickets(currentTickets => BEGIN
        RETURN currentTickets.map(ticket => BEGIN
            IF ticket.id EQUALS ticketId THEN
                RETURN {
                    ...ticket,
                    status: "completed",
                    result: eventData.result,
                    completedAt: Date.now()
                }
            ELSE
                RETURN ticket
            END IF
        END)
    END)

    // Trigger post re-render
    triggerPostUpdate(postId, Date.now())

    logInfo("Ticket completed", {ticketId: ticketId})
END
```

#### Secondary Algorithm: handleRefresh

```
ALGORITHM: handleRefresh
INPUT: none
OUTPUT: none (side effects: UI refresh)

CONSTANTS:
    REFRESH_TIMEOUT = 5000 milliseconds
    ERROR_DISPLAY_DURATION = 3000 milliseconds

BEGIN
    // Phase 1: Set loading state
    setIsRefreshing(true)
    setRefreshError(null)

    TRY
        // Phase 2: Fetch fresh data in parallel
        [postsPromise, ticketsPromise] ← createParallelRequests([
            apiService.fetchPosts(),
            apiService.fetchTickets()
        ])

        // Wait for both requests with timeout
        results ← Promise.race([
            Promise.all([postsPromise, ticketsPromise]),
            createTimeout(REFRESH_TIMEOUT)
        ])

        IF results IS timeout THEN
            THROW TimeoutError("Refresh timed out")
        END IF

        [newPosts, newTickets] ← results

        // Phase 3: Validate data
        IF newPosts IS null OR newTickets IS null THEN
            THROW ValidationError("Invalid data received")
        END IF

        // Phase 4: Update state
        setPosts(newPosts)
        setTickets(newTickets)

        // Phase 5: Show success feedback
        showSuccessToast("Feed refreshed successfully")
        logInfo("Manual refresh completed", {
            postsCount: newPosts.length,
            ticketsCount: newTickets.length
        })

    CATCH error
        // Phase 6: Error handling
        errorMessage ← formatErrorMessage(error)
        setRefreshError(errorMessage)
        showErrorToast(errorMessage, ERROR_DISPLAY_DURATION)
        logError("Refresh failed", error)

    FINALLY
        // Phase 7: Clear loading state
        setIsRefreshing(false)
    END TRY
END

SUBROUTINE: createParallelRequests
INPUT: requests (array of Promises)
OUTPUT: array of Promises

BEGIN
    // Execute requests in parallel
    promises ← []
    FOR EACH request IN requests DO
        promise ← executeWithRetry(request, MAX_RETRIES = 2)
        promises.append(promise)
    END FOR

    RETURN promises
END

SUBROUTINE: executeWithRetry
INPUT: request (Promise), maxRetries (number)
OUTPUT: Promise result

BEGIN
    attempts ← 0

    WHILE attempts < maxRetries DO
        TRY
            result ← AWAIT request()
            RETURN result
        CATCH error
            attempts ← attempts + 1
            IF attempts >= maxRetries THEN
                THROW error
            END IF

            // Exponential backoff
            delay ← 100 * (2 ^ attempts)
            AWAIT sleep(delay)
        END TRY
    END WHILE
END
```

### Data Structure: WebSocket Event Queue

```
DATA STRUCTURE: EventQueue

Type: Priority Queue with deduplication
Purpose: Handle rapid WebSocket events without UI thrashing

Structure:
    queue: PriorityQueue<Event>
    processing: boolean
    pendingUpdates: Map<postId, latestTimestamp>

Operations:
    - enqueue(event): O(log n)
    - dequeue(): O(log n)
    - deduplicate(): O(1) using Map
    - flush(): O(k) where k = unique events

ALGORITHM: enqueueEvent
INPUT: event (object)
OUTPUT: none

BEGIN
    eventKey ← event.post_id + ":" + event.ticket_id

    // Check if newer event already queued
    IF pendingUpdates.has(eventKey) THEN
        existingTimestamp ← pendingUpdates.get(eventKey)
        IF event.timestamp <= existingTimestamp THEN
            // Discard older event
            RETURN
        END IF
    END IF

    // Update pending map
    pendingUpdates.set(eventKey, event.timestamp)

    // Add to queue
    queue.enqueue(event, priority = event.timestamp)

    // Start processing if not already running
    IF NOT processing THEN
        processQueue()
    END IF
END

ALGORITHM: processQueue
INPUT: none
OUTPUT: none

BEGIN
    processing ← true

    WHILE NOT queue.isEmpty() DO
        event ← queue.dequeue()

        // Apply event
        handleTicketStatusUpdate(event)

        // Remove from pending
        eventKey ← event.post_id + ":" + event.ticket_id
        pendingUpdates.delete(eventKey)

        // Throttle updates (max 10 per second)
        AWAIT sleep(100)
    END WHILE

    processing ← false
END
```

### Complexity Analysis

**Time Complexity:**
- Event listener registration: O(1)
- Ticket state update: O(n) where n = number of tickets
- Post state update: O(m) where m = number of posts
- Event queue operations: O(log k) where k = queued events
- Refresh operation: O(n + m)

**Space Complexity:**
- Event listeners: O(1)
- Tickets state: O(n)
- Posts state: O(m)
- Event queue: O(k)
- Pending updates map: O(k)
- Total: O(n + m + k)

### Edge Cases Handled

1. **Rapid events**: Queue and deduplicate to prevent UI thrashing
2. **Stale events**: Compare timestamps, discard outdated updates
3. **Missing data**: Validate event payload before processing
4. **Network errors**: Retry with exponential backoff
5. **Timeout**: Cancel requests exceeding threshold
6. **Race conditions**: Use functional state updates to avoid stale closures

### Performance Optimizations

1. **Debouncing**: Throttle updates to max 10/second
2. **Deduplication**: Skip redundant events using Map lookup
3. **Immutability**: Use spread operators for efficient React reconciliation
4. **Selective updates**: Only mutate affected tickets/posts
5. **Parallel fetching**: Load posts and tickets simultaneously

---

## Integration Pattern

### Combined Flow

```
ALGORITHM: initializeTicketStatusSystem
INPUT: none
OUTPUT: none

BEGIN
    // Phase 1: Setup WebSocket listeners
    setupTicketStatusListener()

    // Phase 2: Initial data load
    handleRefresh()

    // Phase 3: Setup periodic refresh (fallback)
    setInterval(handleRefresh, 30000) // Every 30 seconds

    // Phase 4: Setup cleanup
    onComponentUnmount(() => BEGIN
        websocketService.removeAllListeners()
        clearInterval(refreshInterval)
    END)
END
```

### State Synchronization Pattern

```
PATTERN: Optimistic UI with WebSocket Reconciliation

ALGORITHM: synchronizeState
INPUT: localState (object), serverEvent (object)
OUTPUT: reconciledState (object)

BEGIN
    // Check if local state is newer (optimistic update)
    IF localState.updatedAt > serverEvent.timestamp THEN
        // Keep optimistic update, log conflict
        logWarning("Server state older than local", {
            local: localState.updatedAt,
            server: serverEvent.timestamp
        })
        RETURN localState
    END IF

    // Server state is authoritative
    RETURN {
        ...localState,
        ...serverEvent.data,
        updatedAt: serverEvent.timestamp,
        _synced: true
    }
END
```

---

## Testing Considerations

### Test Scenarios

1. **File Search Tests**
   - Briefing in top-level directory
   - Briefing in intelligence/ subdirectory
   - Briefing in summaries/ subdirectory
   - Multiple briefings (select newest)
   - Missing directories
   - Empty directories
   - Permission errors

2. **WebSocket Tests**
   - Single status update
   - Rapid multiple updates
   - Out-of-order events
   - Duplicate events
   - Invalid event data
   - Network disconnection/reconnection
   - Concurrent refresh during update

3. **Integration Tests**
   - File search → context included in response
   - WebSocket update → badge changes
   - Manual refresh → latest data loaded
   - Error recovery → system remains stable

### Mock Data Structures

```
MOCK: SampleTicketStatusEvent
{
    ticket_id: "ticket_123",
    post_id: "post_456",
    status: "processing",
    timestamp: 1729785600000,
    metadata: {
        agent_id: "agent_001",
        progress: 50
    }
}

MOCK: SampleBriefingFile
Content:
    # Lambda VI Intelligence Briefing

    ## Executive Brief

    Current system status: operational
    Active tickets: 5
    Pending reviews: 2

    ## Detailed Analysis
    ...
```

---

## Deployment Checklist

1. Verify recursive file search works in all environments
2. Test WebSocket connection stability
3. Validate event deduplication logic
4. Confirm state synchronization accuracy
5. Monitor performance metrics (update latency)
6. Check error logging and alerting
7. Validate backward compatibility

---

## Appendix: Design Patterns Used

1. **Observer Pattern**: WebSocket event listeners
2. **Strategy Pattern**: Priority-based directory search
3. **Queue Pattern**: Event processing with deduplication
4. **Retry Pattern**: Network request resilience
5. **Functional State Updates**: Immutable React state management
