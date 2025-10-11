# AVI Phase 3 - SPARC Specification

**Date**: October 10, 2025
**Phase**: 3 - Worker Implementation & Feed Integration
**Methodology**: SPARC + TDD (London School) + Real PostgreSQL

---

## S - SPECIFICATION

### Executive Summary

Phase 3 implements the **actual agent workers** that generate intelligent responses to feed posts and the **feed monitoring system** that discovers new content from RSS/Atom feeds.

### What Exists (From Phase 1 & 2)

✅ **Database Schema**:
- `system_agent_templates` - Agent configurations
- `user_agent_customizations` - User-specific personalities
- `agent_memories` - Agent learning/memory
- `agent_workspaces` - Agent context
- `work_queue` - Work ticket management
- `avi_state` - Orchestrator state

✅ **Core Components**:
- AviOrchestrator - Main loop (Phase 2)
- WorkerSpawner - Skeleton (Phase 2)
- StateManager - State persistence (Phase 2)
- HealthMonitor - Context monitoring (Phase 2)
- WorkTicketQueue - Priority queue (Phase 2)
- composeAgentContext() - Context loader (Phase 1)

✅ **API Infrastructure**:
- `/api/avi/*` - Orchestrator control (Phase 2)
- Authentication middleware
- PostgreSQL connection pool

### What's Missing (Phase 3 Requirements)

❌ **Feed Infrastructure**:
- No `user_feeds` table
- No `feed_items` table
- No `feed_positions` table
- No RSS/Atom parser
- No feed polling service

❌ **Worker Implementation**:
- WorkerSpawner is just a skeleton
- No Claude API integration
- No response generation logic
- No memory update logic
- No post validation

❌ **Integration**:
- Orchestrator doesn't call feed monitor
- Workers don't execute real tasks
- No end-to-end flow

---

## Requirements Breakdown

### Functional Requirements

#### FR1: Feed Monitoring
**Must be able to**:
1. Add RSS/Atom/JSON feeds to database per user
2. Poll feeds at configurable intervals (5-60 min)
3. Detect new posts since last check
4. Store feed items in database
5. Track feed position (last processed item)
6. Create work tickets for new posts
7. Handle feed errors gracefully (404, timeout, parse errors)

#### FR2: Agent Worker Execution
**Must be able to**:
1. Get work ticket from queue
2. Load agent context (template + customization + memories)
3. Load post content from feed item
4. Generate response using Claude API
5. Validate response (length, safety, relevance)
6. Submit response to target platform
7. Update agent memories with new learning
8. Mark ticket as completed/failed
9. Track execution metrics (tokens, duration)

#### FR3: Post Management
**Must be able to**:
1. Prioritize posts by user tier (VIP > premium > free)
2. Rate limit agents (max posts per hour)
3. Expire old tickets (posts older than 24h)
4. Retry failed tickets (with exponential backoff)
5. Assign agents to posts (based on topic/rules)

#### FR4: Quality Control
**Must be able to**:
1. Validate post length (min/max)
2. Check safety constraints (no spam, harmful content)
3. Verify response relevance to original post
4. Ensure personality consistency
5. Prevent duplicate responses

### Non-Functional Requirements

#### NFR1: Performance
- Feed polling: < 5s per feed
- Worker spawn: < 100ms
- Response generation: < 10s
- Database queries: < 50ms
- Queue operations: < 10ms

#### NFR2: Reliability
- 99% uptime for orchestrator
- Graceful degradation on Claude API errors
- Feed fetch retries (3 attempts)
- Worker timeout handling (30s max)

#### NFR3: Scalability
- Support 100+ feeds per user
- Handle 1000+ feed items per poll
- Process 50 concurrent workers
- Queue 10,000+ tickets

#### NFR4: Security
- Validate feed URLs (no localhost, private IPs)
- Sanitize feed content (XSS prevention)
- Rate limit API calls to Claude
- Encrypt sensitive data in database

---

## Database Schema (New Tables)

### user_feeds

```sql
CREATE TABLE user_feeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  agent_name VARCHAR(100) NOT NULL,
  feed_url TEXT NOT NULL,
  feed_type VARCHAR(20) NOT NULL DEFAULT 'rss', -- rss, atom, json
  feed_name VARCHAR(255),
  fetch_interval_minutes INTEGER DEFAULT 15,
  last_fetched_at TIMESTAMPTZ,
  last_error TEXT,
  status VARCHAR(20) DEFAULT 'active', -- active, paused, error
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feed_url),
  FOREIGN KEY (agent_name) REFERENCES system_agent_templates(name)
);

CREATE INDEX idx_user_feeds_user_id ON user_feeds(user_id);
CREATE INDEX idx_user_feeds_status ON user_feeds(status);
CREATE INDEX idx_user_feeds_next_fetch ON user_feeds(last_fetched_at);
```

### feed_items

```sql
CREATE TABLE feed_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feed_id UUID NOT NULL REFERENCES user_feeds(id) ON DELETE CASCADE,
  item_guid VARCHAR(500) NOT NULL,
  title TEXT,
  content TEXT,
  author VARCHAR(255),
  link TEXT,
  published_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feed_id, item_guid)
);

CREATE INDEX idx_feed_items_feed_id ON feed_items(feed_id);
CREATE INDEX idx_feed_items_processed ON feed_items(processed);
CREATE INDEX idx_feed_items_published_at ON feed_items(published_at DESC);
```

### feed_positions

```sql
CREATE TABLE feed_positions (
  feed_id UUID PRIMARY KEY REFERENCES user_feeds(id) ON DELETE CASCADE,
  last_item_guid VARCHAR(500),
  last_published_at TIMESTAMPTZ,
  items_processed INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### agent_responses

```sql
CREATE TABLE agent_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_ticket_id UUID,
  feed_item_id UUID REFERENCES feed_items(id),
  agent_name VARCHAR(100) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  response_content TEXT NOT NULL,
  response_metadata JSONB DEFAULT '{}',
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  status VARCHAR(20) DEFAULT 'pending', -- pending, posted, failed
  posted_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (agent_name) REFERENCES system_agent_templates(name)
);

CREATE INDEX idx_agent_responses_agent_name ON agent_responses(agent_name);
CREATE INDEX idx_agent_responses_status ON agent_responses(status);
CREATE INDEX idx_agent_responses_feed_item_id ON agent_responses(feed_item_id);
```

---

## Component Architecture

### 1. FeedMonitor

**Responsibility**: Poll feeds and create work tickets

**Methods**:
- `pollFeeds(userId)` - Check all active feeds for user
- `fetchFeed(feedId)` - Fetch single feed
- `parseFeed(content, type)` - Parse RSS/Atom/JSON
- `detectNewItems(feedId, items)` - Find new items since last poll
- `createTickets(items)` - Create work queue tickets
- `updatePosition(feedId, lastItem)` - Update feed position

**Dependencies**:
- Database (user_feeds, feed_items, feed_positions)
- WorkTicketQueue (ticket creation)
- HTTP client (feed fetching)

### 2. FeedParser

**Responsibility**: Parse different feed formats

**Methods**:
- `parseRSS(xml)` - Parse RSS 2.0
- `parseAtom(xml)` - Parse Atom 1.0
- `parseJSON(json)` - Parse JSON Feed
- `extractItem(node)` - Extract item fields
- `sanitizeContent(html)` - Clean HTML

**Dependencies**:
- XML parser (fast-xml-parser)
- HTML sanitizer (DOMPurify or similar)

### 3. AgentWorker

**Responsibility**: Execute work tickets and generate responses

**Methods**:
- `executeTicket(ticket)` - Main execution flow
- `loadContext(userId, agentName)` - Load agent context
- `loadFeedItem(itemId)` - Get post content
- `generateResponse(context, post)` - Call Claude API
- `validateResponse(response)` - Quality checks
- `postResponse(response, platform)` - Submit to platform
- `updateMemories(interaction)` - Learn from interaction

**Dependencies**:
- composeAgentContext() (Phase 1)
- Claude API (@anthropic-ai/sdk)
- Database (feed_items, agent_responses, agent_memories)

### 4. ResponseGenerator

**Responsibility**: Generate responses using Claude API

**Methods**:
- `generate(context, post, rules)` - Generate response
- `buildPrompt(context, post)` - Create Claude prompt
- `validateLength(response, min, max)` - Check length
- `checkSafety(response)` - Safety validation
- `checkRelevance(response, post)` - Relevance check

**Dependencies**:
- Anthropic SDK
- Safety validator
- Token counter

### 5. MemoryUpdater

**Responsibility**: Update agent memories after interactions

**Methods**:
- `updateMemory(agentName, userId, interaction)` - Add memory
- `extractLearning(response, feedback)` - Extract insights
- `prioritizeMemories(memories)` - Rank by importance
- `pruneOldMemories(agentName, userId)` - Remove stale memories

**Dependencies**:
- Database (agent_memories)

---

## Data Flow

### Feed Monitoring Flow

```
Orchestrator Timer (every 5 min)
  → FeedMonitor.pollFeeds(allUsers)
    → For each user:
      → Get active feeds
      → For each feed:
        → FeedMonitor.fetchFeed(feedId)
        → HTTP GET feed URL
        → FeedParser.parse(content, type)
        → FeedMonitor.detectNewItems(items)
        → FeedMonitor.createTickets(newItems)
        → WorkQueue.createTicket(each item)
        → FeedPositions.update(lastItem)
```

### Worker Execution Flow

```
Orchestrator Loop
  → WorkQueue.getPendingTickets()
  → For each ticket:
    → WorkerSpawner.spawn(ticket)
      → AgentWorker.executeTicket(ticket)
        → AgentWorker.loadContext(userId, agentName)
        → AgentWorker.loadFeedItem(itemId)
        → ResponseGenerator.generate(context, post)
          → Build prompt with personality + rules
          → Call Claude API
          → Validate response
        → AgentWorker.postResponse(response)
        → MemoryUpdater.updateMemory(interaction)
        → WorkQueue.completeTicket(ticketId)
```

---

## Testing Strategy

### Unit Tests (London School TDD)

**FeedMonitor Tests**:
- ✅ Should poll active feeds only
- ✅ Should handle feed fetch errors
- ✅ Should parse RSS/Atom/JSON correctly
- ✅ Should detect new items since last poll
- ✅ Should create work tickets for new items
- ✅ Should update feed positions

**AgentWorker Tests**:
- ✅ Should load agent context from database
- ✅ Should call Claude API with correct prompt
- ✅ Should validate response length/safety
- ✅ Should update memories after interaction
- ✅ Should handle API errors gracefully
- ✅ Should mark tickets complete/failed

**ResponseGenerator Tests**:
- ✅ Should build prompts with personality
- ✅ Should enforce posting rules
- ✅ Should validate response quality
- ✅ Should track token usage
- ✅ Should handle rate limits

### Integration Tests (Real PostgreSQL + Real APIs)

**Feed Integration Tests**:
- ✅ Should fetch real RSS feed
- ✅ Should store items in database
- ✅ Should create work tickets
- ✅ Should track feed position
- ✅ Should handle feed updates

**Worker Integration Tests**:
- ✅ Should execute full ticket flow
- ✅ Should call real Claude API
- ✅ Should store response in database
- ✅ Should update real memories
- ✅ Should complete ticket

**End-to-End Tests**:
- ✅ Should monitor feed → create ticket → execute worker → post response
- ✅ Should handle multiple feeds concurrently
- ✅ Should respect rate limits
- ✅ Should gracefully degrade on errors

### UI/UX Tests (Playwright)

- ✅ Feed management UI loads
- ✅ Can add/edit/delete feeds
- ✅ Feed items display correctly
- ✅ Agent activity shows in dashboard
- ✅ No visual regressions

---

## Success Criteria

### Phase 3A Complete When:
- [x] Feed tables created in database
- [ ] FeedMonitor implemented and tested
- [ ] FeedParser handles RSS/Atom/JSON
- [ ] Feed polling creates real work tickets
- [ ] 20+ unit tests passing
- [ ] 5+ integration tests passing (real feeds)

### Phase 3B Complete When:
- [ ] AgentWorker executes real tickets
- [ ] Claude API integration working
- [ ] Responses generated and validated
- [ ] Memories updated after interactions
- [ ] 25+ unit tests passing
- [ ] 8+ integration tests passing (real API)

### Phase 3C Complete When:
- [ ] Priority queue working
- [ ] Rate limiting enforced
- [ ] Quality validation working
- [ ] Retry logic implemented
- [ ] 15+ unit tests passing
- [ ] 5+ integration tests passing

### Phase 3D Complete When:
- [ ] End-to-end flow working (feed → ticket → worker → response)
- [ ] UI displays feed activity
- [ ] All tests passing (80+ total)
- [ ] No mocks in integration tests
- [ ] Production-ready deployment

---

## Risks & Mitigations

### Risk 1: Claude API Rate Limits
**Mitigation**: Implement token bucket algorithm, queue requests, exponential backoff

### Risk 2: Feed Parsing Complexity
**Mitigation**: Use battle-tested library (fast-xml-parser), extensive test coverage

### Risk 3: Memory Growth
**Mitigation**: Prune old memories, limit memories per agent, efficient indexes

### Risk 4: Worker Failures
**Mitigation**: Retry logic, error logging, graceful degradation, health monitoring

---

## Timeline Estimate

- **Phase 3A** (Feed Monitoring): 2-3 days
- **Phase 3B** (Agent Workers): 3-4 days
- **Phase 3C** (Post Management): 2-3 days
- **Phase 3D** (Integration & Testing): 2-3 days

**Total**: 9-13 days

---

**Next Step**: Create database schema migration and begin Phase 3A implementation with TDD.
