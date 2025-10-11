# AVI Phase 3 - SPARC Pseudocode

**Date**: October 10, 2025
**Phase**: P - Pseudocode (Algorithm Design)

---

## Component 1: FeedParser

### Purpose
Parse RSS/Atom/JSON feeds into standardized FeedItem objects

### Algorithm: parseRSS(xmlContent)
```
FUNCTION parseRSS(xmlContent: string) -> FeedItem[]
  TRY
    xml = parseXML(xmlContent)
    channel = xml.rss.channel

    items = []
    FOR EACH item IN channel.item
      feedItem = {
        guid: item.guid || item.link || generateGuid(item),
        title: sanitizeText(item.title),
        content: sanitizeHtml(item.description || item.content),
        contentSnippet: truncate(stripHtml(content), 500),
        author: item.author || item['dc:creator'] || channel.title,
        link: item.link,
        publishedAt: parseDate(item.pubDate || item.date)
      }
      items.push(feedItem)
    END FOR

    RETURN items
  CATCH error
    THROW FeedParseError('Failed to parse RSS', error)
  END TRY
END FUNCTION
```

### Algorithm: parseAtom(xmlContent)
```
FUNCTION parseAtom(xmlContent: string) -> FeedItem[]
  TRY
    xml = parseXML(xmlContent)
    feed = xml.feed

    items = []
    FOR EACH entry IN feed.entry
      feedItem = {
        guid: entry.id || entry.link?.href || generateGuid(entry),
        title: sanitizeText(entry.title),
        content: sanitizeHtml(entry.content || entry.summary),
        contentSnippet: truncate(stripHtml(content), 500),
        author: entry.author?.name || feed.title,
        link: entry.link?.href,
        publishedAt: parseDate(entry.published || entry.updated)
      }
      items.push(feedItem)
    END FOR

    RETURN items
  CATCH error
    THROW FeedParseError('Failed to parse Atom', error)
  END TRY
END FUNCTION
```

---

## Component 2: FeedMonitor

### Purpose
Poll feeds, detect new items, create work tickets

### Algorithm: pollAllActiveFeeds()
```
FUNCTION pollAllActiveFeeds() -> PollResults
  startTime = now()
  results = {
    feedsChecked: 0,
    itemsFound: 0,
    itemsNew: 0,
    ticketsCreated: 0,
    errors: []
  }

  TRY
    // Get feeds due for polling
    feeds = database.query(`
      SELECT * FROM feeds_due_for_fetch
      LIMIT 100
    `)

    FOR EACH feed IN feeds
      TRY
        feedResult = pollSingleFeed(feed.id)
        results.feedsChecked++
        results.itemsFound += feedResult.itemsFound
        results.itemsNew += feedResult.itemsNew
        results.ticketsCreated += feedResult.ticketsCreated
      CATCH error
        results.errors.push({
          feedId: feed.id,
          error: error.message
        })
        updateFeedError(feed.id, error)
      END TRY
    END FOR

    duration = now() - startTime
    logPollResults(results, duration)

    RETURN results
  CATCH error
    logError('Feed polling failed', error)
    THROW error
  END TRY
END FUNCTION
```

### Algorithm: pollSingleFeed(feedId)
```
FUNCTION pollSingleFeed(feedId: UUID) -> FeedResult
  TRY
    // 1. Get feed config
    feed = database.query(`
      SELECT * FROM user_feeds WHERE id = $1
    `, [feedId])

    IF NOT feed THEN
      THROW Error('Feed not found')
    END IF

    // 2. Fetch feed content
    response = httpClient.get(feed.feed_url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'AVI-Agent-Feed/1.0',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml'
      }
    })

    // 3. Parse feed
    items = feedParser.parse(response.body, feed.feed_type)

    // 4. Get last position
    position = database.query(`
      SELECT * FROM feed_positions WHERE feed_id = $1
    `, [feedId])

    // 5. Filter new items
    newItems = []
    FOR EACH item IN items
      isNew = checkIfNew(item, position)
      IF isNew THEN
        newItems.push(item)
      END IF
    END FOR

    // 6. Store new items
    storedItems = []
    FOR EACH item IN newItems
      stored = database.query(`
        INSERT INTO feed_items (feed_id, item_guid, title, content, ...)
        VALUES ($1, $2, $3, $4, ...)
        ON CONFLICT (feed_id, item_guid) DO NOTHING
        RETURNING *
      `, [...])

      IF stored THEN
        storedItems.push(stored)
      END IF
    END FOR

    // 7. Create work tickets
    ticketsCreated = 0
    IF feed.automation_enabled THEN
      FOR EACH item IN storedItems
        ticket = workQueue.createTicket({
          type: 'post_response',
          priority: calculatePriority(feed, item),
          agentName: feed.agent_name,
          userId: feed.user_id,
          payload: {
            feedId: feed.id,
            feedItemId: item.id,
            itemGuid: item.item_guid
          }
        })
        ticketsCreated++
      END FOR
    END IF

    // 8. Update feed position
    IF storedItems.length > 0 THEN
      lastItem = storedItems[0]
      database.query(`
        UPDATE feed_positions
        SET last_item_guid = $1,
            last_item_id = $2,
            last_published_at = $3,
            items_processed = items_processed + $4,
            updated_at = NOW()
        WHERE feed_id = $5
      `, [lastItem.item_guid, lastItem.id, lastItem.published_at,
          storedItems.length, feedId])
    END IF

    // 9. Update feed last_fetched
    database.query(`
      UPDATE user_feeds
      SET last_fetched_at = NOW(),
          error_count = 0,
          last_error = NULL
      WHERE id = $1
    `, [feedId])

    // 10. Log fetch
    database.query(`
      INSERT INTO feed_fetch_logs (feed_id, status, items_found, items_new, ...)
      VALUES ($1, 'success', $2, $3, ...)
    `, [feedId, items.length, storedItems.length, ...])

    RETURN {
      itemsFound: items.length,
      itemsNew: storedItems.length,
      ticketsCreated: ticketsCreated
    }

  CATCH error
    logError('Feed poll failed', { feedId, error })

    // Log failure
    database.query(`
      INSERT INTO feed_fetch_logs (feed_id, status, error_message)
      VALUES ($1, 'error', $2)
    `, [feedId, error.message])

    // Update feed error count
    database.query(`
      UPDATE user_feeds
      SET error_count = error_count + 1,
          last_error = $1
      WHERE id = $2
    `, [error.message, feedId])

    THROW error
  END TRY
END FUNCTION
```

---

## Component 3: AgentWorker

### Purpose
Execute work tickets and generate responses

### Algorithm: executeTicket(ticket)
```
FUNCTION executeTicket(ticket: WorkTicket) -> WorkerResult
  startTime = now()

  TRY
    // 1. Load agent context (from Phase 1)
    context = composeAgentContext(
      ticket.userId,
      ticket.agentName,
      database
    )

    // 2. Load feed item
    feedItem = database.query(`
      SELECT fi.*, uf.feed_name, uf.feed_url
      FROM feed_items fi
      JOIN user_feeds uf ON uf.id = fi.feed_id
      WHERE fi.id = $1
    `, [ticket.payload.feedItemId])

    IF NOT feedItem THEN
      THROW Error('Feed item not found')
    END IF

    // 3. Generate response
    response = responseGenerator.generate(context, feedItem, {
      maxLength: context.posting_rules.max_length,
      minLength: context.posting_rules.min_length || 50,
      temperature: context.response_style.temperature || 0.7
    })

    // 4. Validate response
    validation = validateResponse(response, context, feedItem)

    IF NOT validation.valid THEN
      THROW Error('Response validation failed: ' + validation.errors.join(', '))
    END IF

    // 5. Store response
    agentResponse = database.query(`
      INSERT INTO agent_responses (
        work_ticket_id, feed_item_id, agent_name, user_id,
        response_content, response_metadata, tokens_used,
        generation_time_ms, validation_results, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'validated')
      RETURNING *
    `, [ticket.id, feedItem.id, ticket.agentName, ticket.userId,
        response.content, response.metadata, response.tokensUsed,
        response.durationMs, validation, ...])

    // 6. Update memories
    memoryUpdater.update(
      ticket.agentName,
      ticket.userId,
      {
        interaction: {
          post: feedItem.title,
          response: response.content,
          context: 'feed_response'
        },
        importance: calculateImportance(feedItem, response),
        topic: extractTopic(feedItem)
      }
    )

    // 7. Mark feed item as processed
    database.query(`
      UPDATE feed_items
      SET processed = TRUE,
          processing_status = 'completed'
      WHERE id = $1
    `, [feedItem.id])

    duration = now() - startTime

    RETURN {
      success: true,
      responseId: agentResponse.id,
      tokensUsed: response.tokensUsed,
      durationMs: duration
    }

  CATCH error
    duration = now() - startTime

    logError('Worker execution failed', { ticket, error })

    // Store failed response
    database.query(`
      INSERT INTO agent_responses (
        work_ticket_id, feed_item_id, agent_name, user_id,
        response_content, error_message, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'failed')
    `, [ticket.id, ticket.payload.feedItemId, ticket.agentName,
        ticket.userId, '', error.message])

    RETURN {
      success: false,
      error: error.message,
      durationMs: duration
    }
  END TRY
END FUNCTION
```

---

## Component 4: ResponseGenerator

### Purpose
Generate AI responses using Claude API

### Algorithm: generate(context, feedItem, options)
```
FUNCTION generate(context, feedItem, options) -> Response
  TRY
    // 1. Build prompt
    prompt = buildPrompt(context, feedItem)

    // 2. Call Claude API
    startTime = now()

    apiResponse = anthropic.messages.create({
      model: context.model || 'claude-sonnet-4-5-20250929',
      max_tokens: options.maxLength || 1000,
      temperature: options.temperature || 0.7,
      system: buildSystemPrompt(context),
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    durationMs = now() - startTime

    // 3. Extract response
    responseContent = apiResponse.content[0].text

    // 4. Post-process
    responseContent = trimWhitespace(responseContent)
    responseContent = removeQuotes(responseContent) // If wrapped in quotes

    RETURN {
      content: responseContent,
      tokensUsed: apiResponse.usage.input_tokens + apiResponse.usage.output_tokens,
      durationMs: durationMs,
      metadata: {
        model: apiResponse.model,
        stopReason: apiResponse.stop_reason,
        temperature: options.temperature
      }
    }

  CATCH error
    IF error.type === 'rate_limit_error' THEN
      THROW RateLimitError('Claude API rate limit exceeded', error)
    ELSE IF error.type === 'overloaded_error' THEN
      THROW OverloadedError('Claude API overloaded', error)
    ELSE
      THROW Error('Response generation failed: ' + error.message)
    END IF
  END TRY
END FUNCTION
```

### Algorithm: buildPrompt(context, feedItem)
```
FUNCTION buildPrompt(context, feedItem) -> string
  prompt = `
You are responding to this post from ${feedItem.feed_name}:

Title: ${feedItem.title}
Content: ${feedItem.content}
Author: ${feedItem.author}
Published: ${feedItem.published_at}

Generate a response that:
1. Follows your personality: ${context.personality}
2. Respects posting rules:
   - Max length: ${context.posting_rules.max_length} characters
   - Min length: ${context.posting_rules.min_length || 50} characters
3. Uses this response style: ${JSON.stringify(context.response_style)}

Recent memories:
${formatMemories(context.memories)}

Generate ONLY the response text, no explanations.
`

  RETURN prompt
END FUNCTION
```

---

## Component 5: MemoryUpdater

### Algorithm: update(agentName, userId, interaction)
```
FUNCTION update(agentName, userId, interaction) -> void
  TRY
    // 1. Extract learning from interaction
    learning = extractLearning(interaction)

    // 2. Calculate importance
    importance = calculateImportance(interaction)

    // 3. Store memory
    database.query(`
      INSERT INTO agent_memories (
        user_id, agent_name, content, metadata,
        importance, topic, context
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [userId, agentName, learning, interaction.metadata,
        importance, interaction.topic, interaction.context])

    // 4. Prune old memories if needed
    memoryCount = database.query(`
      SELECT COUNT(*) FROM agent_memories
      WHERE user_id = $1 AND agent_name = $2
    `, [userId, agentName])

    IF memoryCount > MAX_MEMORIES_PER_AGENT THEN
      pruneOldMemories(agentName, userId)
    END IF

  CATCH error
    logError('Memory update failed', { agentName, userId, error })
    // Don't fail worker if memory update fails
  END TRY
END FUNCTION
```

---

## Integration: Orchestrator Enhancement

### Algorithm: Enhanced Main Loop
```
FUNCTION orchestratorMainLoop() -> void
  WHILE status === 'running'
    TRY
      // Phase 3 Addition: Poll feeds every iteration
      IF shouldPollFeeds() THEN
        feedMonitor.pollAllActiveFeeds()
      END IF

      // Existing Phase 2: Process work queue
      processTickets()

      // Existing Phase 2: Health check
      IF shouldCheckHealth() THEN
        healthMonitor.checkHealth()
      END IF

      // Wait before next iteration
      await sleep(config.checkInterval)

    CATCH error
      logError('Orchestrator loop error', error)
      state.lastError = error.message
    END TRY
  END WHILE
END FUNCTION

FUNCTION shouldPollFeeds() -> boolean
  // Poll every 60 seconds (feeds have their own intervals)
  RETURN (now() - lastFeedPollTime) >= 60000
END FUNCTION
```

---

## Error Handling Strategy

### Feed Fetch Errors
```
IF httpError.statusCode === 404 THEN
  pauseFeed(feedId, 'Feed not found (404)')
ELSE IF httpError.statusCode === 429 THEN
  backoffFeed(feedId, calculateBackoff(errorCount))
ELSE IF httpError.type === 'TIMEOUT' THEN
  retry with exponential backoff
ELSE
  incrementErrorCount(feedId)
  IF errorCount > 5 THEN
    pauseFeed(feedId, 'Too many errors')
  END IF
END IF
```

### Claude API Errors
```
IF error.type === 'rate_limit_error' THEN
  wait for error.retry_after seconds
  retry request
ELSE IF error.type === 'overloaded_error' THEN
  exponential backoff
  retry up to 3 times
ELSE
  log error
  fail ticket
  alert monitoring
END IF
```

---

## Performance Optimizations

### Batch Operations
```
// Instead of individual inserts
FOR EACH item IN newItems
  INSERT item
END FOR

// Use bulk insert
INSERT INTO feed_items (...)
VALUES (item1), (item2), (item3), ...
```

### Concurrent Feed Polling
```
// Parallel processing with Promise.all
feedPromises = feeds.map(feed => pollSingleFeed(feed.id))
results = await Promise.all(feedPromises)
```

### Database Connection Pooling
```
// Reuse connections
pool = createPool({ max: 20, min: 5 })
connection = await pool.connect()
// Use connection
connection.release()
```

---

**Next**: Architecture phase - Design component structure and TDD tests
