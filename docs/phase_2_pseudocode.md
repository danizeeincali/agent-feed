# Phase 2: @ Mention System Pseudocode Algorithms

## Overview

This document defines the core algorithms and data flow for the enhanced @ mention autocomplete system. Each algorithm is designed to be modular, testable, and performant while maintaining compatibility with existing components.

## Core Data Structures

```typescript
interface Agent {
  id: string;              // UUID
  name: string;            // kebab-case identifier  
  displayName: string;     // Human readable name
  description: string;     // Agent capabilities description
  avatarColor: string;     // Hex color code
  capabilities: string[];  // List of specializations
  status: AgentStatus;     // Current availability
  lastUsed?: Date;         // User's last interaction
  responseTime?: number;   // Average response time in ms
  usage_count: number;     // Total uses by current user
}

interface AgentSearchQuery {
  query: string;           // Search term
  limit: number;           // Max results
  includeInactive: boolean; // Include non-active agents
  contextTags?: string[];  // Post content tags for suggestions
  userId?: string;         // For personalization
}

interface SearchResult {
  agents: Agent[];         // Matched agents
  suggestions: Agent[];    // Smart recommendations  
  hasMore: boolean;        // Pagination flag
  total: number;           // Total available matches
}

interface MentionState {
  isActive: boolean;       // Dropdown is open
  query: string;           // Current search term
  position: CursorPosition; // @ symbol location
  selectedIndex: number;   // Keyboard navigation
  results: SearchResult;   // Current search results
  loading: boolean;        // API call in progress
}
```

## Algorithm 1: Agent Search & Matching

```pseudocode
ALGORITHM: searchAgents(query: string, context: SearchContext) -> SearchResult

INPUT:
  query: string (user typed after @)
  context: SearchContext {
    userId: string,
    postContent: string,
    recentAgents: Agent[],
    activeOnly: boolean = true
  }

OUTPUT:
  SearchResult with ranked agents

BEGIN
  // Step 1: Check cache first
  cacheKey = generateCacheKey(query, context)
  cachedResult = agentCache.get(cacheKey)
  IF cachedResult AND not expired(cachedResult)
    RETURN cachedResult.data
  END IF

  // Step 2: Fetch agents from API or cache
  allAgents = await fetchAgentsWithFallback(context.userId)
  
  // Step 3: Filter by status if needed
  availableAgents = allAgents.filter(agent => 
    context.activeOnly ? agent.status === 'active' : true
  )

  // Step 4: Perform fuzzy matching
  matchedAgents = []
  FOR each agent IN availableAgents
    score = calculateMatchScore(query, agent)
    IF score > MINIMUM_MATCH_THRESHOLD
      matchedAgents.push({ agent, score })
    END IF
  END FOR

  // Step 5: Sort by relevance
  rankedAgents = matchedAgents
    .sort(compareAgentRelevance)
    .map(item => item.agent)
    .slice(0, MAX_RESULTS)

  // Step 6: Generate smart suggestions
  suggestions = generateSmartSuggestions(
    context.postContent, 
    context.recentAgents,
    allAgents
  )

  // Step 7: Build result
  result = {
    agents: rankedAgents,
    suggestions: suggestions.slice(0, MAX_SUGGESTIONS),
    hasMore: matchedAgents.length > MAX_RESULTS,
    total: matchedAgents.length
  }

  // Step 8: Cache result
  agentCache.set(cacheKey, result, CACHE_TTL)
  
  RETURN result
END

// Helper: Calculate match score for fuzzy search
FUNCTION calculateMatchScore(query: string, agent: Agent) -> number
  score = 0
  normalizedQuery = query.toLowerCase().trim()
  
  // Exact name match (highest priority)
  IF agent.name.toLowerCase() === normalizedQuery
    score += 100
  ELSE IF agent.name.toLowerCase().startsWith(normalizedQuery)
    score += 80
  ELSE IF agent.name.toLowerCase().includes(normalizedQuery)
    score += 60
  END IF

  // Display name matching
  IF agent.displayName.toLowerCase().includes(normalizedQuery)
    score += 40
  END IF

  // Description keyword matching
  IF agent.description.toLowerCase().includes(normalizedQuery)
    score += 20
  END IF

  // Capability matching
  FOR each capability IN agent.capabilities
    IF capability.toLowerCase().includes(normalizedQuery)
      score += 30
      BREAK
    END IF
  END FOR

  // Recent usage boost
  IF agent.lastUsed AND daysSince(agent.lastUsed) < 7
    score += 15
  END IF

  // High usage boost
  IF agent.usage_count > 10
    score += 10
  END IF

  RETURN score
END

// Helper: Compare agents for relevance sorting
FUNCTION compareAgentRelevance(a: ScoredAgent, b: ScoredAgent) -> number
  // Primary sort: match score
  IF a.score !== b.score
    RETURN b.score - a.score
  END IF

  // Secondary sort: recent usage
  IF a.agent.lastUsed AND b.agent.lastUsed
    RETURN b.agent.lastUsed.getTime() - a.agent.lastUsed.getTime()
  END IF

  // Tertiary sort: usage count
  RETURN b.agent.usage_count - a.agent.usage_count
END
```

## Algorithm 2: Smart Agent Suggestions

```pseudocode
ALGORITHM: generateSmartSuggestions(
  postContent: string,
  recentAgents: Agent[],
  allAgents: Agent[]
) -> Agent[]

INPUT:
  postContent: string (current post text)
  recentAgents: Agent[] (user's recently used agents)
  allAgents: Agent[] (all available agents)

OUTPUT:
  Agent[] (recommended agents based on context)

BEGIN
  suggestions = []
  
  // Step 1: Extract keywords from post content
  keywords = extractKeywords(postContent)
  
  // Step 2: Score agents based on content relevance
  contentScores = new Map()
  FOR each agent IN allAgents
    score = 0
    FOR each keyword IN keywords
      FOR each capability IN agent.capabilities
        IF capability.includes(keyword)
          score += 10
        END IF
      END FOR
      IF agent.description.includes(keyword)
        score += 5
      END IF
    END FOR
    IF score > 0
      contentScores.set(agent.id, score)
    END IF
  END FOR

  // Step 3: Add recent agents (if not already suggested by content)
  FOR each agent IN recentAgents.slice(0, 3)
    IF not contentScores.has(agent.id)
      contentScores.set(agent.id, 15) // Base score for recent usage
    END IF
  END FOR

  // Step 4: Sort and return top suggestions
  sortedSuggestions = Array.from(contentScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => findAgentById(entry[0], allAgents))
    .filter(agent => agent !== null)
    .slice(0, 5)

  RETURN sortedSuggestions
END

// Helper: Extract relevant keywords from post content
FUNCTION extractKeywords(content: string) -> string[]
  // Remove common words and extract meaningful terms
  stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
  
  words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 AND not stopWords.includes(word))
  
  // Extract technical terms and important keywords
  keywords = []
  techTerms = ['code', 'bug', 'deploy', 'test', 'security', 'performance', 'analysis', 'report', 'meeting', 'strategy']
  
  FOR each word IN words
    IF techTerms.includes(word)
      keywords.push(word)
    END IF
  END FOR

  // Add hashtags as high-priority keywords
  hashtags = content.match(/#\w+/g)
  IF hashtags
    FOR each tag IN hashtags
      keywords.push(tag.substring(1))
    END FOR
  END IF

  RETURN keywords.slice(0, 10) // Limit to most relevant
END
```

## Algorithm 3: Autocomplete State Management

```pseudocode
ALGORITHM: MentionAutocomplete State Machine

STATES:
  - IDLE: No @ detected
  - SEARCHING: @ detected, building query
  - LOADING: API call in progress
  - SHOWING_RESULTS: Dropdown visible with results
  - SELECTING: User navigating with keyboard

TRANSITIONS:

ON_INPUT_CHANGE(newValue: string, cursorPosition: number)
  mentionInfo = detectMentionQuery(newValue, cursorPosition)
  
  IF mentionInfo === null
    setState(IDLE)
    hideDropdown()
    clearResults()
  ELSE IF mentionInfo.query !== currentQuery
    setState(SEARCHING)
    updateQuery(mentionInfo.query)
    debounceSearch(mentionInfo.query, SEARCH_DELAY)
  END IF
END

ON_SEARCH_START()
  setState(LOADING)
  showLoadingIndicator()
END

ON_SEARCH_COMPLETE(results: SearchResult)
  setState(SHOWING_RESULTS)
  hideLoadingIndicator()
  displayResults(results)
  resetSelection()
END

ON_SEARCH_ERROR(error: Error)
  setState(IDLE)
  hideDropdown()
  showErrorMessage(error)
END

ON_ARROW_DOWN()
  IF state === SHOWING_RESULTS
    setState(SELECTING)
    moveSelectionDown()
  END IF
END

ON_ARROW_UP()
  IF state === SHOWING_RESULTS
    setState(SELECTING) 
    moveSelectionUp()
  END IF
END

ON_ENTER_KEY()
  IF state === SELECTING OR state === SHOWING_RESULTS
    selectedAgent = getSelectedAgent()
    insertMention(selectedAgent)
    setState(IDLE)
    hideDropdown()
  END IF
END

ON_ESCAPE_KEY()
  setState(IDLE)
  hideDropdown()
  clearResults()
END

ON_CLICK_OUTSIDE()
  setState(IDLE)
  hideDropdown()
END

ON_AGENT_CLICK(agent: Agent)
  insertMention(agent)
  setState(IDLE)
  hideDropdown()
END

// Helper: Detect @ mention in text
FUNCTION detectMentionQuery(text: string, cursor: number) -> MentionInfo | null
  // Find @ symbol before cursor
  atIndex = -1
  FOR i = cursor - 1 DOWN TO 0
    IF text[i] === '@'
      atIndex = i
      BREAK
    ELSE IF text[i] === ' ' OR text[i] === '\n'
      BREAK // Hit whitespace, no mention
    END IF
  END FOR

  IF atIndex === -1
    RETURN null
  END IF

  // Extract query from @ to cursor
  query = text.substring(atIndex + 1, cursor)
  
  // Validate query (no spaces)
  IF query.includes(' ') OR query.includes('\n')
    RETURN null
  END IF

  RETURN {
    startIndex: atIndex,
    query: query,
    position: calculateDropdownPosition(atIndex)
  }
END
```

## Algorithm 4: Mention Insertion & Text Manipulation

```pseudocode
ALGORITHM: insertMention(
  agent: Agent,
  currentText: string,
  mentionPosition: MentionInfo,
  cursorPosition: number
) -> TextUpdate

INPUT:
  agent: Agent to insert
  currentText: string current textarea value
  mentionPosition: MentionInfo @ location and query
  cursorPosition: number current cursor

OUTPUT:
  TextUpdate with new text and cursor position

BEGIN
  // Step 1: Build mention text
  mentionText = '@' + agent.name

  // Step 2: Calculate text segments
  beforeMention = currentText.substring(0, mentionPosition.startIndex)
  afterMention = currentText.substring(cursorPosition)

  // Step 3: Construct new text
  newText = beforeMention + mentionText + ' ' + afterMention
  
  // Step 4: Calculate new cursor position
  newCursorPos = mentionPosition.startIndex + mentionText.length + 1

  // Step 5: Track mention for analytics
  trackMentionUsage(agent.id, mentionPosition.query)

  RETURN {
    text: newText,
    cursorPosition: newCursorPos,
    insertedMention: {
      agent: agent,
      startIndex: mentionPosition.startIndex,
      endIndex: mentionPosition.startIndex + mentionText.length
    }
  }
END

// Helper: Track mention usage for learning
FUNCTION trackMentionUsage(agentId: string, searchQuery: string)
  analytics.track('mention_selected', {
    agentId: agentId,
    searchQuery: searchQuery,
    timestamp: new Date(),
    userId: getCurrentUserId()
  })
  
  // Update agent usage statistics
  updateAgentUsage(agentId)
END
```

## Algorithm 5: Performance Optimization

```pseudocode
ALGORITHM: Agent Caching Strategy

// Multi-tier caching system
CACHE_TIERS:
  1. Memory Cache (instant access)
  2. Session Storage (page refresh persistence)
  3. Local Storage (cross-session persistence)

// Cache management
FUNCTION manageAgentCache()
  // Tier 1: In-memory cache for active session
  memoryCache = new Map() // Query -> Results
  memoryCacheSize = 0
  MAX_MEMORY_CACHE_SIZE = 50

  // Tier 2: Session storage for page refreshes
  sessionKey = 'agentCache_' + sessionId
  sessionCache = JSON.parse(sessionStorage.getItem(sessionKey) || '{}')

  // Tier 3: Local storage for frequent agents
  localKey = 'agentCache_frequent'
  frequentAgents = JSON.parse(localStorage.getItem(localKey) || '[]')

  // Cache retrieval with fallback
  FUNCTION getCachedAgents(query: string) -> CacheResult | null
    // Check memory first
    memoryResult = memoryCache.get(query)
    IF memoryResult AND not isExpired(memoryResult)
      RETURN memoryResult
    END IF

    // Check session storage
    sessionResult = sessionCache[query]
    IF sessionResult AND not isExpired(sessionResult)
      // Promote to memory cache
      memoryCache.set(query, sessionResult)
      RETURN sessionResult
    END IF

    // Check frequent agents for empty query
    IF query === '' AND frequentAgents.length > 0
      RETURN { agents: frequentAgents, fromCache: true }
    END IF

    RETURN null
  END FUNCTION

  // Cache storage
  FUNCTION setCachedAgents(query: string, result: SearchResult)
    timestamp = Date.now()
    cacheEntry = { 
      data: result, 
      timestamp: timestamp,
      ttl: CACHE_TTL 
    }

    // Store in memory
    memoryCache.set(query, cacheEntry)
    memoryCacheSize++

    // Evict oldest if over limit
    IF memoryCacheSize > MAX_MEMORY_CACHE_SIZE
      oldestKey = findOldestCacheKey(memoryCache)
      memoryCache.delete(oldestKey)
      memoryCacheSize--
    END IF

    // Store in session for page refresh
    sessionCache[query] = cacheEntry
    sessionStorage.setItem(sessionKey, JSON.stringify(sessionCache))

    // Update frequent agents if empty query
    IF query === '' AND result.agents.length > 0
      updateFrequentAgents(result.agents)
    END IF
  END FUNCTION

  // Cleanup expired entries
  FUNCTION cleanupCache()
    currentTime = Date.now()
    
    // Clean memory cache
    FOR each [key, entry] IN memoryCache.entries()
      IF isExpired(entry, currentTime)
        memoryCache.delete(key)
        memoryCacheSize--
      END IF
    END FOR

    // Clean session cache
    FOR each key IN Object.keys(sessionCache)
      IF isExpired(sessionCache[key], currentTime)
        DELETE sessionCache[key]
      END IF
    END FOR
    sessionStorage.setItem(sessionKey, JSON.stringify(sessionCache))
  END FUNCTION

END FUNCTION

// Helper: Update frequently used agents
FUNCTION updateFrequentAgents(agents: Agent[])
  // Combine with existing frequent agents
  combined = [...frequentAgents, ...agents]
  
  // Sort by usage count and recency
  sorted = combined.sort((a, b) => {
    usageScore_a = a.usage_count + (a.lastUsed ? daysSince(a.lastUsed) * -1 : -100)
    usageScore_b = b.usage_count + (b.lastUsed ? daysSince(b.lastUsed) * -1 : -100)
    RETURN usageScore_b - usageScore_a
  })

  // Keep top 20 unique agents
  unique = removeDuplicates(sorted, agent => agent.id)
  frequentAgents = unique.slice(0, 20)
  
  localStorage.setItem(localKey, JSON.stringify(frequentAgents))
END FUNCTION
```

## Algorithm 6: Error Handling & Fallback

```pseudocode
ALGORITHM: Robust Error Handling

// Error types and recovery strategies
ERROR_TYPES:
  - NETWORK_ERROR: API unavailable
  - TIMEOUT_ERROR: API too slow  
  - AUTH_ERROR: User unauthorized
  - RATE_LIMIT: Too many requests
  - PARSE_ERROR: Invalid API response

FUNCTION handleSearchError(error: Error, context: SearchContext) -> SearchResult
  errorType = classifyError(error)
  
  SWITCH errorType
    CASE NETWORK_ERROR:
      // Try cached data first
      cachedResult = getCachedFallback(context.query)
      IF cachedResult
        RETURN cachedResult
      END IF
      // Fall back to offline agent list
      RETURN getOfflineFallback()

    CASE TIMEOUT_ERROR:
      // Cancel ongoing request and use cache
      cancelPendingRequest()
      cachedResult = getCachedFallback(context.query)
      RETURN cachedResult OR getOfflineFallback()

    CASE AUTH_ERROR:
      // Redirect to login
      redirectToLogin()
      RETURN { agents: [], suggestions: [], hasMore: false, total: 0 }

    CASE RATE_LIMIT:
      // Back off exponentially
      scheduleRetry(context, calculateBackoffDelay())
      RETURN getCachedFallback(context.query) OR getOfflineFallback()

    CASE PARSE_ERROR:
      // Log error and use cache
      logError('API_PARSE_ERROR', error, context)
      RETURN getCachedFallback(context.query) OR getOfflineFallback()

    DEFAULT:
      // Unknown error, use safest fallback
      logError('UNKNOWN_MENTION_ERROR', error, context)
      RETURN getOfflineFallback()
  END SWITCH
END FUNCTION

// Offline fallback with basic functionality
FUNCTION getOfflineFallback() -> SearchResult
  // Use hardcoded essential agents as last resort
  essentialAgents = [
    { id: '1', name: 'chief-of-staff', displayName: 'Chief of Staff', ... },
    { id: '2', name: 'code-reviewer', displayName: 'Code Reviewer', ... },
    { id: '3', name: 'bug-hunter', displayName: 'Bug Hunter', ... }
  ]

  RETURN {
    agents: essentialAgents,
    suggestions: [],
    hasMore: false,
    total: essentialAgents.length,
    offline: true
  }
END FUNCTION
```

## TDD Test Anchors

```typescript
// Test cases to implement during development

describe('Agent Search Algorithm', () => {
  it('should return exact matches first')
  it('should handle fuzzy matching correctly') 
  it('should prioritize recent agents')
  it('should respect agent status filters')
  it('should generate relevant suggestions')
  it('should handle empty queries gracefully')
  it('should limit results appropriately')
})

describe('Mention State Management', () => {
  it('should detect @ mentions correctly')
  it('should handle cursor position changes')
  it('should manage dropdown visibility')
  it('should handle keyboard navigation')
  it('should insert mentions properly')
})

describe('Caching System', () => {
  it('should cache search results')
  it('should expire cache entries')
  it('should fallback through cache tiers')
  it('should handle cache size limits')
})

describe('Error Handling', () => {
  it('should handle network errors gracefully')
  it('should provide offline fallbacks')
  it('should retry with exponential backoff')
  it('should log errors appropriately')
})
```

---

*These algorithms provide the foundation for implementing the @ mention system with proper error handling, caching, and user experience considerations.*