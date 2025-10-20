# PSEUDOCODE: Agent Tier System Filtering

**Date**: October 19, 2025
**Methodology**: SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)
**Phase**: PSEUDOCODE
**Version**: 1.0.0
**Status**: Ready for Implementation

---

## Table of Contents

1. [Algorithm Overview](#1-algorithm-overview)
2. [Data Structures](#2-data-structures)
3. [API Query Parameter Parsing](#3-api-query-parameter-parsing)
4. [Database Filtering Logic](#4-database-filtering-logic)
5. [Response Metadata Enrichment](#5-response-metadata-enrichment)
6. [Frontend State Management](#6-frontend-state-management)
7. [Filter Toggle Component](#7-filter-toggle-component)
8. [Filter Application Flow](#8-filter-application-flow)
9. [Performance Optimization](#9-performance-optimization)
10. [Backward Compatibility](#10-backward-compatibility)
11. [Test Cases](#11-test-cases)

---

## 1. Algorithm Overview

### 1.1 End-to-End Filter Flow

```
ALGORITHM: AgentTierFilteringFlow
INPUT: HTTP Request with optional tier parameter
OUTPUT: Filtered agent list with metadata

BEGIN
    // Step 1: Parse Request Parameters
    tierParam ← ParseTierParameter(request.query.tier)
    includeSystem ← ParseBoolean(request.query.include_system)
    userId ← request.query.userId OR "anonymous"

    // Step 2: Validate Parameters
    IF NOT ValidateTierParameter(tierParam) THEN
        RETURN ErrorResponse(400, "Invalid tier parameter")
    END IF

    // Step 3: Apply Backward Compatibility
    effectiveTier ← ResolveEffectiveTier(tierParam, includeSystem)

    // Step 4: Database Query with Filtering
    allAgents ← LoadAllAgentsFromFileSystem(userId)
    filteredAgents ← ApplyTierFilter(allAgents, effectiveTier)

    // Step 5: Calculate Metadata
    metadata ← CalculateFilterMetadata(allAgents, filteredAgents, effectiveTier)

    // Step 6: Build Response
    response ← BuildSuccessResponse(filteredAgents, metadata)

    // Step 7: Add Deprecation Warnings
    IF includeSystem IS PROVIDED AND tierParam IS NULL THEN
        response.metadata.warning ← "include_system is deprecated"
    END IF

    RETURN response
END


COMPLEXITY ANALYSIS:
    Time Complexity:
        - Parameter parsing: O(1)
        - File system load: O(n) where n = total agents
        - Tier filtering: O(n)
        - Metadata calculation: O(n)
        - Total: O(n)

    Space Complexity:
        - All agents array: O(n)
        - Filtered agents array: O(m) where m ≤ n
        - Metadata object: O(1)
        - Total: O(n)

    Performance Target: < 50ms for tier=1 (8 agents)
```

---

## 2. Data Structures

### 2.1 Request/Response Interfaces

```
DATA STRUCTURE: AgentFilterRequest
    tier: "1" | "2" | "all"           // Tier filter parameter
    include_system: boolean           // Legacy parameter
    userId: string                     // User identifier

DATA STRUCTURE: Agent
    id: string                         // UUID from agent name
    slug: string                       // Filename without extension
    name: string                       // Display name
    description: string                // Agent description
    tier: 1 | 2                        // Agent tier classification
    visibility: "public" | "protected" // Visibility status
    icon: string OR null              // Path to SVG icon
    icon_type: "svg" | "emoji"        // Icon format
    icon_emoji: string                // Emoji fallback
    posts_as_self: boolean            // Whether agent posts to feed
    show_in_default_feed: boolean     // Show in default view
    tools: array<string>              // Array of tool names
    color: string                      // Hex color code
    status: "active" | "inactive"     // Agent status
    model: "haiku" | "sonnet" | "opus" // Claude model
    priority: string                   // P0-P7
    filePath: string                   // Absolute file path
    lastModified: string              // ISO 8601 timestamp
    hash: string                       // SHA-256 content hash

DATA STRUCTURE: FilterMetadata
    tier: "1" | "2" | "all"           // Applied tier filter
    tier_counts: {
        tier1: integer                 // Count of Tier 1 agents
        tier2: integer                 // Count of Tier 2 agents
        total: integer                 // Total agent count
    }
    filtered_count: integer            // Number of agents returned
    timestamp: string                  // ISO 8601 timestamp
    source: "PostgreSQL" | "SQLite"   // Database source
    warning: string OR null           // Deprecation warnings

DATA STRUCTURE: AgentListResponse
    success: boolean
    data: array<Agent>
    total: integer
    metadata: FilterMetadata

DATA STRUCTURE: ErrorResponse
    success: boolean = false
    error: string                      // Error type
    message: string                    // Human-readable message
    code: string                       // Machine-readable code
    validValues: array<string> OR null // Valid parameter values
```

### 2.2 Constants and Enums

```
CONSTANTS:
    VALID_TIERS ← ["1", "2", "all"]
    DEFAULT_TIER ← "1"
    DEFAULT_USER_ID ← "anonymous"
    TIER_1_AGENTS_PATH ← "/prod/.claude/agents/"
    TIER_2_AGENTS_PATH ← "/prod/.claude/agents/.system/"

    // Error codes
    ERROR_INVALID_TIER ← "INVALID_TIER"
    ERROR_DATABASE ← "DATABASE_ERROR"
    ERROR_FILE_NOT_FOUND ← "FILE_NOT_FOUND"

ENUM: AgentTier
    USER_FACING = 1
    SYSTEM = 2

ENUM: TierFilterOption
    TIER_1 = "1"
    TIER_2 = "2"
    ALL = "all"
```

---

## 3. API Query Parameter Parsing

### 3.1 Parameter Parsing Algorithm

```
ALGORITHM: ParseRequestParameters
INPUT: request (HTTP Request object)
OUTPUT: ParsedParameters object

BEGIN
    // Extract tier parameter
    tierParam ← request.query.tier

    // Default to "1" if not provided
    IF tierParam IS NULL OR tierParam IS UNDEFINED THEN
        tierParam ← DEFAULT_TIER
    END IF

    // Normalize to lowercase string
    tierParam ← ToString(tierParam).toLowerCase()

    // Extract legacy parameter
    includeSystemParam ← request.query.include_system
    includeSystem ← ParseBoolean(includeSystemParam)

    // Extract user ID
    userId ← request.query.userId OR DEFAULT_USER_ID

    RETURN {
        tier: tierParam,
        includeSystem: includeSystem,
        userId: userId
    }
END


SUBROUTINE: ParseBoolean
INPUT: value (any type)
OUTPUT: boolean

BEGIN
    IF value IS NULL OR value IS UNDEFINED THEN
        RETURN false
    END IF

    // String comparison
    IF TypeOf(value) IS "string" THEN
        RETURN value.toLowerCase() === "true"
    END IF

    // Boolean conversion
    RETURN Boolean(value)
END
```

### 3.2 Parameter Validation

```
ALGORITHM: ValidateTierParameter
INPUT: tierParam (string)
OUTPUT: boolean (valid or invalid)

BEGIN
    // Check if tier is in valid values
    IF tierParam NOT IN VALID_TIERS THEN
        RETURN false
    END IF

    RETURN true
END


ALGORITHM: BuildValidationErrorResponse
INPUT: tierParam (string)
OUTPUT: ErrorResponse object

BEGIN
    message ← "Tier must be '1', '2', or 'all'. Received: '" + tierParam + "'"

    RETURN {
        success: false,
        error: "Invalid tier parameter",
        message: message,
        code: ERROR_INVALID_TIER,
        validValues: VALID_TIERS
    }
END
```

### 3.3 Backward Compatibility Resolution

```
ALGORITHM: ResolveEffectiveTier
INPUT: tierParam (string | null), includeSystem (boolean)
OUTPUT: effectiveTier (string)

BEGIN
    // Tier parameter takes precedence
    IF tierParam IS NOT NULL THEN
        RETURN tierParam
    END IF

    // Legacy parameter fallback
    IF includeSystem IS true THEN
        RETURN "all"
    ELSE
        RETURN "1"
    END IF
END


COMPLEXITY:
    Time: O(1) - Constant time checks
    Space: O(1) - No additional memory
```

---

## 4. Database Filtering Logic

### 4.1 Tier Classification from File Path

```
ALGORITHM: DetermineAgentTier
INPUT: filePath (string) - Absolute path to agent file
OUTPUT: tier (1 | 2)

BEGIN
    // Normalize path separators
    normalizedPath ← NormalizePath(filePath)

    // Check if file is in .system/ directory
    IF normalizedPath CONTAINS "/.system/" THEN
        RETURN 2  // Tier 2: System agent
    END IF

    RETURN 1  // Tier 1: User-facing agent
END


SUBROUTINE: NormalizePath
INPUT: filePath (string)
OUTPUT: normalizedPath (string)

BEGIN
    // Replace Windows backslashes with forward slashes
    normalized ← filePath.replace(/\\/g, "/")

    RETURN normalized
END


COMPLEXITY:
    Time: O(m) where m = path length
    Space: O(1) - In-place string operations
```

### 4.2 Load All Agents from File System

```
ALGORITHM: LoadAllAgentsFromFileSystem
INPUT: userId (string)
OUTPUT: agents (array<Agent>)

BEGIN
    // Get all agent file paths
    tier1Files ← ListFilesInDirectory(TIER_1_AGENTS_PATH, "*.md")
    tier2Files ← ListFilesInDirectory(TIER_2_AGENTS_PATH, "*.md")

    allFilePaths ← Concatenate(tier1Files, tier2Files)

    // Parse all agent files in parallel
    agents ← []

    FOR EACH filePath IN allFilePaths DO
        agent ← ReadAndParseAgentFile(filePath, userId)

        // Add tier classification
        agent.tier ← DetermineAgentTier(filePath)

        agents.append(agent)
    END FOR

    RETURN agents
END


SUBROUTINE: ListFilesInDirectory
INPUT: directoryPath (string), pattern (string)
OUTPUT: filePaths (array<string>)

BEGIN
    filePaths ← []

    TRY
        files ← FileSystem.readDirectory(directoryPath)

        FOR EACH file IN files DO
            IF file MATCHES pattern THEN
                absolutePath ← Path.join(directoryPath, file)
                filePaths.append(absolutePath)
            END IF
        END FOR
    CATCH error
        // Directory doesn't exist or is empty
        LogWarning("Directory not found: " + directoryPath)
    END TRY

    RETURN filePaths
END


SUBROUTINE: ReadAndParseAgentFile
INPUT: filePath (string), userId (string)
OUTPUT: agent (Agent object)

BEGIN
    // Read file content
    content ← FileSystem.readFile(filePath, "utf-8")

    // Parse frontmatter and markdown
    parsed ← ParseMarkdownWithFrontmatter(content)
    frontmatter ← parsed.frontmatter
    markdown ← parsed.content

    // Extract agent properties
    agent ← {
        id: GenerateUUIDFromName(frontmatter.name),
        slug: Path.basename(filePath, ".md"),
        name: frontmatter.name,
        description: frontmatter.description OR "",
        tools: frontmatter.tools OR [],
        color: frontmatter.color OR "#6366f1",
        status: frontmatter.status OR "active",
        model: frontmatter.model OR "sonnet",
        proactive: frontmatter.proactive OR false,
        priority: frontmatter.priority OR "P2",
        usage: frontmatter.usage OR "",

        // Tier system fields (with defaults)
        tier: frontmatter.tier OR 1,
        visibility: frontmatter.visibility OR "public",
        icon: frontmatter.icon OR null,
        icon_type: frontmatter.icon_type OR DetectIconType(frontmatter.icon),
        icon_emoji: frontmatter.icon_emoji OR GenerateDefaultEmoji(frontmatter.name),
        posts_as_self: frontmatter.posts_as_self !== false,
        show_in_default_feed: frontmatter.show_in_default_feed !== false,

        // Metadata
        content: markdown,
        hash: SHA256(content),
        filePath: filePath,
        lastModified: FileSystem.getModifiedTime(filePath).toISOString()
    }

    RETURN agent
END


COMPLEXITY:
    Time: O(n * k) where n = number of files, k = average file size
    Space: O(n * k) for storing all agent data

    Optimization Opportunities:
        - Parallel file reading (Promise.all)
        - Caching parsed agents
        - Lazy loading for large agent counts
```

### 4.3 Apply Tier Filter

```
ALGORITHM: ApplyTierFilter
INPUT: agents (array<Agent>), tier (string)
OUTPUT: filteredAgents (array<Agent>)

BEGIN
    SWITCH tier
        CASE "1":
            filteredAgents ← FilterByTier(agents, 1)
        CASE "2":
            filteredAgents ← FilterByTier(agents, 2)
        CASE "all":
            filteredAgents ← agents
        DEFAULT:
            THROW Error("Invalid tier: " + tier)
    END SWITCH

    // Sort by name for consistent ordering
    filteredAgents.sort((a, b) => CompareStrings(a.name, b.name))

    RETURN filteredAgents
END


SUBROUTINE: FilterByTier
INPUT: agents (array<Agent>), targetTier (integer)
OUTPUT: filtered (array<Agent>)

BEGIN
    filtered ← []

    FOR EACH agent IN agents DO
        IF agent.tier === targetTier THEN
            filtered.append(agent)
        END IF
    END FOR

    RETURN filtered
END


SUBROUTINE: CompareStrings
INPUT: a (string), b (string)
OUTPUT: comparison (integer: -1, 0, or 1)

BEGIN
    // Case-insensitive comparison
    aLower ← a.toLowerCase()
    bLower ← b.toLowerCase()

    IF aLower < bLower THEN
        RETURN -1
    ELSE IF aLower > bLower THEN
        RETURN 1
    ELSE
        RETURN 0
    END IF
END


COMPLEXITY:
    Time: O(n) for filtering + O(n log n) for sorting = O(n log n)
    Space: O(m) where m = filtered agent count

    Index Optimization (Future PostgreSQL):
        CREATE INDEX idx_agents_tier ON agents(tier)
        SELECT * FROM agents WHERE tier = 1 ORDER BY name
        Query Time: O(log n) with B-tree index
```

### 4.4 Database Query Pseudocode (Future PostgreSQL)

```
ALGORITHM: GetAgentsByTierFromDatabase
INPUT: tier (string), userId (string)
OUTPUT: agents (array<Agent>)

BEGIN
    // Build SQL query with parameterized tier filter
    query ← ""
    params ← []

    IF tier === "1" THEN
        query ← "SELECT * FROM agents WHERE tier = $1 ORDER BY name ASC"
        params ← [1]
    ELSE IF tier === "2" THEN
        query ← "SELECT * FROM agents WHERE tier = $1 ORDER BY name ASC"
        params ← [2]
    ELSE IF tier === "all" THEN
        query ← "SELECT * FROM agents ORDER BY name ASC"
        params ← []
    END IF

    // Execute query
    result ← Database.execute(query, params)

    // Map database rows to Agent objects
    agents ← result.rows.map(row => MapRowToAgent(row))

    RETURN agents
END


SUBROUTINE: MapRowToAgent
INPUT: row (database row object)
OUTPUT: agent (Agent object)

BEGIN
    agent ← {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        tier: row.tier,
        visibility: row.visibility,
        icon: row.icon,
        icon_type: row.icon_type,
        icon_emoji: row.icon_emoji,
        posts_as_self: row.posts_as_self,
        show_in_default_feed: row.show_in_default_feed,
        tools: JSON.parse(row.tools),
        color: row.color,
        status: row.status,
        model: row.model,
        priority: row.priority,
        content: row.content,
        hash: row.hash,
        filePath: row.file_path,
        lastModified: row.last_modified
    }

    RETURN agent
END


SQL QUERY OPTIMIZATION:
    // Composite index for tier + name sorting
    CREATE INDEX idx_agents_tier_name ON agents(tier, name)

    // Partial index for tier 1 only (most common query)
    CREATE INDEX idx_agents_tier1 ON agents(tier) WHERE tier = 1

    // Statistics for query planner
    ANALYZE agents

    Expected Performance:
        - tier=1: < 10ms (index scan on 8 rows)
        - tier=2: < 15ms (index scan on 11 rows)
        - tier=all: < 20ms (sequential scan on 19 rows)
```

---

## 5. Response Metadata Enrichment

### 5.1 Calculate Filter Metadata

```
ALGORITHM: CalculateFilterMetadata
INPUT: allAgents (array<Agent>), filteredAgents (array<Agent>), tier (string)
OUTPUT: metadata (FilterMetadata object)

BEGIN
    // Count agents by tier
    tier1Count ← CountAgentsByTier(allAgents, 1)
    tier2Count ← CountAgentsByTier(allAgents, 2)
    totalCount ← allAgents.length

    // Determine database source
    source ← DetectDatabaseSource()

    // Build metadata object
    metadata ← {
        tier: tier,
        tier_counts: {
            tier1: tier1Count,
            tier2: tier2Count,
            total: totalCount
        },
        filtered_count: filteredAgents.length,
        timestamp: GetCurrentTimestamp(),
        source: source,
        warning: null
    }

    RETURN metadata
END


SUBROUTINE: CountAgentsByTier
INPUT: agents (array<Agent>), targetTier (integer)
OUTPUT: count (integer)

BEGIN
    count ← 0

    FOR EACH agent IN agents DO
        IF agent.tier === targetTier THEN
            count ← count + 1
        END IF
    END FOR

    RETURN count
END


SUBROUTINE: DetectDatabaseSource
OUTPUT: source (string)

BEGIN
    // Check environment variable or configuration
    IF Environment.USE_POSTGRES IS true THEN
        RETURN "PostgreSQL"
    ELSE
        RETURN "SQLite"
    END IF
END


SUBROUTINE: GetCurrentTimestamp
OUTPUT: timestamp (string in ISO 8601 format)

BEGIN
    now ← new Date()
    RETURN now.toISOString()
END


COMPLEXITY:
    Time: O(n) for counting tiers
    Space: O(1) - Fixed metadata structure

    Optimization:
        Cache tier counts and invalidate on agent changes
        Store counts in database for O(1) lookup
```

### 5.2 Build Success Response

```
ALGORITHM: BuildSuccessResponse
INPUT: agents (array<Agent>), metadata (FilterMetadata)
OUTPUT: response (AgentListResponse object)

BEGIN
    response ← {
        success: true,
        data: agents,
        total: agents.length,
        metadata: metadata
    }

    RETURN response
END


ALGORITHM: BuildErrorResponse
INPUT: statusCode (integer), errorType (string), message (string), code (string)
OUTPUT: response (ErrorResponse object)

BEGIN
    response ← {
        success: false,
        error: errorType,
        message: message,
        code: code,
        validValues: null
    }

    // Add valid values for validation errors
    IF code === ERROR_INVALID_TIER THEN
        response.validValues ← VALID_TIERS
    END IF

    RETURN response
END
```

---

## 6. Frontend State Management

### 6.1 localStorage Persistence

```
ALGORITHM: InitializeFilterState
OUTPUT: filterState (object)

BEGIN
    // Storage key for tier preference
    STORAGE_KEY ← "agentTierFilter"

    // Read from localStorage
    savedState ← localStorage.getItem(STORAGE_KEY)

    // Parse saved state
    IF savedState IS NOT NULL THEN
        TRY
            parsed ← JSON.parse(savedState)

            // Validate saved state
            IF ValidateFilterState(parsed) THEN
                RETURN parsed
            END IF
        CATCH error
            LogWarning("Invalid saved filter state, using defaults")
        END TRY
    END IF

    // Return default state
    defaultState ← {
        showTier1: true,
        showTier2: false,
        currentTier: "1"
    }

    // Persist default state
    PersistFilterState(defaultState)

    RETURN defaultState
END


SUBROUTINE: ValidateFilterState
INPUT: state (object)
OUTPUT: valid (boolean)

BEGIN
    // Check required properties
    IF state.showTier1 IS NOT boolean THEN
        RETURN false
    END IF

    IF state.showTier2 IS NOT boolean THEN
        RETURN false
    END IF

    IF state.currentTier NOT IN ["1", "2", "all"] THEN
        RETURN false
    END IF

    RETURN true
END


SUBROUTINE: PersistFilterState
INPUT: state (object)

BEGIN
    STORAGE_KEY ← "agentTierFilter"
    serialized ← JSON.stringify(state)
    localStorage.setItem(STORAGE_KEY, serialized)
END


SUBROUTINE: ClearFilterState

BEGIN
    STORAGE_KEY ← "agentTierFilter"
    localStorage.removeItem(STORAGE_KEY)
END


COMPLEXITY:
    Time: O(1) - localStorage operations are constant time
    Space: O(1) - Fixed state object size
```

### 6.2 React State Management

```
ALGORITHM: UseAgentTierFilter (React Hook)
OUTPUT: { currentTier, toggleTier, resetFilter }

BEGIN
    // Initialize state from localStorage
    [filterState, setFilterState] ← useState(() => {
        RETURN InitializeFilterState()
    })

    // Update localStorage when state changes
    useEffect(() => {
        PersistFilterState(filterState)
    }, [filterState])

    // Toggle tier filter
    FUNCTION toggleTier(tier: "1" | "2" | "all") BEGINS
        newState ← {
            showTier1: tier === "1" OR tier === "all",
            showTier2: tier === "2" OR tier === "all",
            currentTier: tier
        }

        setFilterState(newState)
    END FUNCTION

    // Reset to default state
    FUNCTION resetFilter() BEGINS
        defaultState ← {
            showTier1: true,
            showTier2: false,
            currentTier: "1"
        }

        setFilterState(defaultState)
    END FUNCTION

    RETURN {
        currentTier: filterState.currentTier,
        showTier1: filterState.showTier1,
        showTier2: filterState.showTier2,
        toggleTier: toggleTier,
        resetFilter: resetFilter
    }
END
```

### 6.3 API Client Integration

```
ALGORITHM: FetchAgentsWithTierFilter
INPUT: tier (string), userId (string)
OUTPUT: Promise<AgentListResponse>

BEGIN
    // Build API URL with query parameters
    baseUrl ← "/api/agents"
    params ← new URLSearchParams()

    // Add tier parameter
    params.append("tier", tier)

    // Add user ID if provided
    IF userId IS NOT NULL THEN
        params.append("userId", userId)
    END IF

    url ← baseUrl + "?" + params.toString()

    // Make HTTP request
    TRY
        response ← await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        })

        // Parse JSON response
        data ← await response.json()

        // Handle error responses
        IF NOT response.ok THEN
            THROW new Error(data.message OR "Failed to fetch agents")
        END IF

        RETURN data
    CATCH error
        LogError("API request failed", error)
        THROW error
    END TRY
END


COMPLEXITY:
    Time: O(1) for request initiation, O(n) for response parsing
    Space: O(n) for storing response data
```

---

## 7. Filter Toggle Component

### 7.1 Component Interface

```
INTERFACE: AgentTierToggleProps
    currentTier: "1" | "2" | "all"
    onTierChange: (tier: "1" | "2" | "all") => void
    tierCounts: {
        tier1: integer
        tier2: integer
    }
    disabled: boolean = false
    className: string = ""
```

### 7.2 Toggle Component Logic

```
ALGORITHM: AgentTierToggle (React Component)
INPUT: props (AgentTierToggleProps)
OUTPUT: JSX Element

BEGIN
    // Destructure props
    { currentTier, onTierChange, tierCounts, disabled, className } ← props

    // Handle tier button click
    FUNCTION handleTierClick(tier: "1" | "2" | "all") BEGINS
        IF disabled THEN
            RETURN
        END IF

        // Optimistic UI update
        onTierChange(tier)
    END FUNCTION

    // Determine active state for each button
    isTier1Active ← currentTier === "1"
    isTier2Active ← currentTier === "2"
    isAllActive ← currentTier === "all"

    // Render button group
    RENDER
        <div className={`tier-toggle-group ${className}`}>
            <!-- Tier 1 Button -->
            <button
                onClick={() => handleTierClick("1")}
                disabled={disabled}
                className={isTier1Active ? "active" : ""}
                aria-pressed={isTier1Active}
                aria-label="Show Tier 1 agents only"
            >
                User-Facing ({tierCounts.tier1})
            </button>

            <!-- Tier 2 Button -->
            <button
                onClick={() => handleTierClick("2")}
                disabled={disabled}
                className={isTier2Active ? "active" : ""}
                aria-pressed={isTier2Active}
                aria-label="Show Tier 2 agents only"
            >
                System ({tierCounts.tier2})
            </button>

            <!-- All Button -->
            <button
                onClick={() => handleTierClick("all")}
                disabled={disabled}
                className={isAllActive ? "active" : ""}
                aria-pressed={isAllActive}
                aria-label="Show all agents"
            >
                All ({tierCounts.tier1 + tierCounts.tier2})
            </button>
        </div>
    END RENDER
END
```

### 7.3 Accessibility (ARIA) Support

```
ALGORITHM: AddAccessibilityAttributes
INPUT: buttonElement (DOM element), isActive (boolean), label (string)

BEGIN
    // ARIA attributes
    buttonElement.setAttribute("role", "button")
    buttonElement.setAttribute("aria-pressed", ToString(isActive))
    buttonElement.setAttribute("aria-label", label)
    buttonElement.setAttribute("tabindex", "0")

    // Keyboard navigation
    buttonElement.addEventListener("keydown", (event) => {
        IF event.key === "Enter" OR event.key === " " THEN
            event.preventDefault()
            buttonElement.click()
        END IF
    })
END


ACCESSIBILITY CHECKLIST:
    - [x] ARIA role="button" for semantic meaning
    - [x] aria-pressed for toggle state
    - [x] aria-label for screen readers
    - [x] Keyboard navigation (Enter/Space)
    - [x] Focus indicators (CSS :focus-visible)
    - [x] Color contrast ratio ≥ 4.5:1
    - [x] Disabled state visually distinct
```

---

## 8. Filter Application Flow

### 8.1 Complete User Interaction Flow

```
ALGORITHM: HandleTierToggleClick
INPUT: selectedTier ("1" | "2" | "all")
OUTPUT: Updated agent list in UI

BEGIN
    // Step 1: Update local state immediately (optimistic UI)
    setIsLoading(true)
    setCurrentTier(selectedTier)

    // Step 2: Update localStorage
    PersistFilterState({
        currentTier: selectedTier,
        showTier1: selectedTier === "1" OR selectedTier === "all",
        showTier2: selectedTier === "2" OR selectedTier === "all"
    })

    // Step 3: Trigger API request
    TRY
        response ← await FetchAgentsWithTierFilter(selectedTier, userId)

        // Step 4: Validate response
        IF response.success !== true THEN
            THROW new Error(response.error OR "Unknown error")
        END IF

        // Step 5: Update agent list state
        setAgents(response.data)

        // Step 6: Update metadata state
        setMetadata(response.metadata)

        // Step 7: Update toggle with counts
        setTierCounts({
            tier1: response.metadata.tier_counts.tier1,
            tier2: response.metadata.tier_counts.tier2
        })

    CATCH error
        // Step 8: Handle error
        LogError("Failed to filter agents", error)
        ShowErrorNotification("Failed to load agents: " + error.message)

        // Revert to previous state
        setCurrentTier(previousTier)

    FINALLY
        setIsLoading(false)
    END TRY
END


SEQUENCE DIAGRAM:
    User                  Component           localStorage        API Server
     |                       |                     |                  |
     |--Click Toggle-------->|                     |                  |
     |                       |--Update State------>|                  |
     |                       |--Persist----------->|                  |
     |                       |--API Request------------------------>  |
     |                       |                     |                  |
     |                       |<--Response---------------------------  |
     |                       |--Update UI--------->|                  |
     |<--Visual Update-------|                     |                  |


TIME COMPLEXITY:
    User interaction: O(1)
    State update: O(1)
    localStorage write: O(1)
    API request: O(1) to initiate
    API processing: O(n) where n = total agents
    Response parsing: O(m) where m = filtered agents
    UI update: O(m) for rendering

    Total: O(n + m) ≈ O(n)
```

### 8.2 Debounced Filter Toggle

```
ALGORITHM: DebouncedTierToggle
INPUT: selectedTier (string), delay (integer in milliseconds)
OUTPUT: Debounced API call

BEGIN
    // Cancel previous pending calls
    IF timeoutId IS NOT NULL THEN
        clearTimeout(timeoutId)
    END IF

    // Update UI immediately
    setCurrentTier(selectedTier)

    // Schedule API call after delay
    timeoutId ← setTimeout(() => {
        FetchAgentsWithTierFilter(selectedTier, userId)
            .then(response => UpdateAgentList(response))
            .catch(error => HandleError(error))
    }, delay)
END


DEBOUNCE PARAMETERS:
    Delay: 150ms (balance between responsiveness and API calls)
    Max Wait: 500ms (prevent indefinite delay)
    Leading: true (immediate visual feedback)
    Trailing: true (ensure final state is applied)
```

---

## 9. Performance Optimization

### 9.1 Response Caching

```
ALGORITHM: CachedGetAgents
INPUT: tier (string), userId (string)
OUTPUT: Promise<AgentListResponse>

BEGIN
    // Generate cache key
    cacheKey ← "agents:tier:" + tier + ":user:" + userId

    // Check cache
    cached ← Cache.get(cacheKey)

    IF cached IS NOT NULL THEN
        // Cache hit
        LogDebug("Cache hit for key: " + cacheKey)
        RETURN cached
    END IF

    // Cache miss - fetch from source
    LogDebug("Cache miss for key: " + cacheKey)
    agents ← await LoadAllAgentsFromFileSystem(userId)
    filteredAgents ← ApplyTierFilter(agents, tier)
    metadata ← CalculateFilterMetadata(agents, filteredAgents, tier)

    response ← BuildSuccessResponse(filteredAgents, metadata)

    // Store in cache with TTL
    Cache.set(cacheKey, response, {
        ttl: 300,  // 5 minutes
        tags: ["agents", "tier:" + tier]
    })

    RETURN response
END


SUBROUTINE: InvalidateAgentCache

BEGIN
    // Invalidate all agent-related cache entries
    Cache.deleteByTag("agents")

    LogInfo("Agent cache invalidated")
END


CACHE STRATEGY:
    Type: LRU (Least Recently Used)
    Max Size: 100 entries
    TTL: 300 seconds (5 minutes)
    Eviction: LRU when size exceeded
    Invalidation: On agent file modification

    Cache Hit Ratio Target: > 80%
    Cache Memory Limit: 50MB
```

### 9.2 Optimistic UI Updates

```
ALGORITHM: OptimisticTierToggle
INPUT: newTier (string)
OUTPUT: Immediate UI update

BEGIN
    // Step 1: Store current state for rollback
    previousAgents ← currentAgents
    previousTier ← currentTier

    // Step 2: Predict filtered agents (client-side filter)
    predictedAgents ← ClientSideFilterAgents(previousAgents, newTier)

    // Step 3: Update UI immediately
    setCurrentTier(newTier)
    setAgents(predictedAgents)
    setIsLoading(true)

    // Step 4: Make API request in background
    FetchAgentsWithTierFilter(newTier, userId)
        .then(response => {
            // Step 5: Replace predicted data with server data
            setAgents(response.data)
            setMetadata(response.metadata)
        })
        .catch(error => {
            // Step 6: Rollback on error
            setCurrentTier(previousTier)
            setAgents(previousAgents)
            ShowErrorNotification(error.message)
        })
        .finally(() => {
            setIsLoading(false)
        })
END


SUBROUTINE: ClientSideFilterAgents
INPUT: agents (array<Agent>), tier (string)
OUTPUT: filtered (array<Agent>)

BEGIN
    // Filter agents on client side for instant feedback
    SWITCH tier
        CASE "1":
            RETURN agents.filter(a => a.tier === 1)
        CASE "2":
            RETURN agents.filter(a => a.tier === 2)
        CASE "all":
            RETURN agents
    END SWITCH
END


PERFORMANCE BENEFITS:
    Perceived latency: 0ms (instant visual feedback)
    Actual latency: API response time (hidden from user)
    User satisfaction: Significantly improved

    Trade-offs:
        - Client maintains full agent list in memory
        - Rollback needed on error (rare)
        - Slight complexity increase
```

### 9.3 Background Prefetching

```
ALGORITHM: PrefetchTierData
INPUT: currentTier (string)

BEGIN
    // Prefetch likely next tier in background
    IF currentTier === "1" THEN
        // User on Tier 1, prefetch Tier 2
        nextTier ← "2"
    ELSE IF currentTier === "2" THEN
        // User on Tier 2, prefetch All
        nextTier ← "all"
    ELSE
        // User on All, prefetch Tier 1 (most common)
        nextTier ← "1"
    END IF

    // Prefetch after a delay (low priority)
    setTimeout(() => {
        // Check if not already cached
        cacheKey ← "agents:tier:" + nextTier + ":user:" + userId

        IF NOT Cache.has(cacheKey) THEN
            // Prefetch in background (don't update UI)
            FetchAgentsWithTierFilter(nextTier, userId)
                .then(response => {
                    LogDebug("Prefetched tier " + nextTier)
                })
                .catch(error => {
                    // Silent failure for prefetch
                    LogDebug("Prefetch failed for tier " + nextTier)
                })
        END IF
    }, 2000)  // Wait 2 seconds before prefetching
END


PREFETCH STRATEGY:
    Trigger: After user views current tier for 2 seconds
    Priority: Low (background, doesn't block)
    Failure: Silent (doesn't affect UX)
    Cache: Uses same cache as regular requests

    Expected Benefit:
        - Instant tier switches after prefetch
        - Improved perceived performance
        - Minimal resource overhead
```

### 9.4 Query Performance Optimization

```
ALGORITHM: OptimizedDatabaseQuery (Future)
INPUT: tier (string)
OUTPUT: SQL query with optimal execution plan

BEGIN
    // Use prepared statements for query plan caching
    SWITCH tier
        CASE "1":
            query ← PREPARE tier1_query AS
                SELECT * FROM agents
                WHERE tier = $1
                ORDER BY name
                LIMIT 100

            EXECUTE tier1_query(1)

        CASE "2":
            query ← PREPARE tier2_query AS
                SELECT * FROM agents
                WHERE tier = $1
                ORDER BY name
                LIMIT 100

            EXECUTE tier2_query(2)

        CASE "all":
            query ← PREPARE all_query AS
                SELECT * FROM agents
                ORDER BY name
                LIMIT 100

            EXECUTE all_query
    END SWITCH

    RETURN queryResult
END


DATABASE OPTIMIZATION:
    Indexes:
        - PRIMARY KEY (id)
        - INDEX idx_agents_tier (tier)
        - INDEX idx_agents_tier_name (tier, name)
        - INDEX idx_agents_name (name)

    Query Plan:
        tier=1: Index Scan on idx_agents_tier_name
                Cost: 0.15..8.17 rows=8
        tier=2: Index Scan on idx_agents_tier_name
                Cost: 0.15..11.22 rows=11
        tier=all: Index Scan on idx_agents_name
                  Cost: 0.15..19.25 rows=19

    Expected Performance:
        - tier=1: 5-10ms (8 rows)
        - tier=2: 8-15ms (11 rows)
        - tier=all: 15-25ms (19 rows)
```

---

## 10. Backward Compatibility

### 10.1 Legacy Parameter Support

```
ALGORITHM: HandleLegacyIncludeSystemParameter
INPUT: request (HTTP Request)
OUTPUT: effectiveTier (string), deprecationWarning (string | null)

BEGIN
    tierParam ← request.query.tier
    includeSystem ← request.query.include_system

    deprecationWarning ← null

    // Tier parameter takes precedence
    IF tierParam IS NOT NULL THEN
        effectiveTier ← tierParam

        // Warn if both parameters provided
        IF includeSystem IS NOT NULL THEN
            deprecationWarning ← "Both 'tier' and 'include_system' provided. " +
                                 "Using 'tier' parameter. 'include_system' is deprecated."
        END IF

    ELSE IF includeSystem IS NOT NULL THEN
        // Legacy parameter
        IF includeSystem === true OR includeSystem === "true" THEN
            effectiveTier ← "all"
        ELSE
            effectiveTier ← "1"
        END IF

        deprecationWarning ← "Parameter 'include_system' is deprecated. " +
                             "Use 'tier=all' instead for future requests."
    ELSE
        // No parameters - default behavior
        effectiveTier ← DEFAULT_TIER
    END IF

    RETURN {
        tier: effectiveTier,
        warning: deprecationWarning
    }
END


COMPATIBILITY MATRIX:
    | tier | include_system | Result   | Warning |
    |------|---------------|----------|---------|
    | null | null          | "1"      | none    |
    | null | true          | "all"    | deprecated param |
    | null | false         | "1"      | deprecated param |
    | "1"  | null          | "1"      | none    |
    | "2"  | null          | "2"      | none    |
    | "all"| null          | "all"    | none    |
    | "1"  | true          | "1"      | both params |
    | "2"  | false         | "2"      | both params |
```

### 10.2 API Version Detection

```
ALGORITHM: DetectAPIVersion
INPUT: request (HTTP Request)
OUTPUT: version (string)

BEGIN
    // Check explicit API version header
    versionHeader ← request.headers["X-API-Version"]

    IF versionHeader IS NOT NULL THEN
        RETURN versionHeader
    END IF

    // Check URL path version
    urlPath ← request.url

    IF urlPath STARTS WITH "/api/v2/" THEN
        RETURN "2.0"
    ELSE IF urlPath STARTS WITH "/api/v1/" THEN
        RETURN "1.0"
    END IF

    // Default to latest version
    RETURN "2.0"
END


ALGORITHM: ApplyVersionSpecificBehavior
INPUT: version (string), request (HTTP Request)
OUTPUT: modifiedRequest (HTTP Request)

BEGIN
    SWITCH version
        CASE "1.0":
            // Version 1.0: Only include_system parameter
            // Convert to tier parameter internally
            IF request.query.include_system === true THEN
                request.query.tier ← "all"
            ELSE
                request.query.tier ← "1"
            END IF

        CASE "2.0":
            // Version 2.0: tier parameter preferred
            // No modification needed

        DEFAULT:
            // Latest version behavior
    END SWITCH

    RETURN request
END
```

---

## 11. Test Cases

### 11.1 Unit Test Cases

```
TEST SUITE: AgentTierFilteringUnitTests

TEST: ParseTierParameter_DefaultsToOne
    INPUT: request with no tier parameter
    EXPECTED: tierParam = "1"

    REQUEST ← { query: {} }
    result ← ParseRequestParameters(REQUEST)

    ASSERT result.tier === "1"

TEST: ParseTierParameter_AcceptsTierOne
    INPUT: request with tier=1
    EXPECTED: tierParam = "1"

    REQUEST ← { query: { tier: "1" } }
    result ← ParseRequestParameters(REQUEST)

    ASSERT result.tier === "1"

TEST: ParseTierParameter_AcceptsTierTwo
    INPUT: request with tier=2
    EXPECTED: tierParam = "2"

    REQUEST ← { query: { tier: "2" } }
    result ← ParseRequestParameters(REQUEST)

    ASSERT result.tier === "2"

TEST: ParseTierParameter_AcceptsAll
    INPUT: request with tier=all
    EXPECTED: tierParam = "all"

    REQUEST ← { query: { tier: "all" } }
    result ← ParseRequestParameters(REQUEST)

    ASSERT result.tier === "all"

TEST: ValidateTierParameter_RejectsInvalidValue
    INPUT: tier = "invalid"
    EXPECTED: validation fails

    result ← ValidateTierParameter("invalid")

    ASSERT result === false

TEST: DetermineAgentTier_ReturnsOneForNormalAgent
    INPUT: filePath = "/agents/personal-todos-agent.md"
    EXPECTED: tier = 1

    tier ← DetermineAgentTier("/agents/personal-todos-agent.md")

    ASSERT tier === 1

TEST: DetermineAgentTier_ReturnsTwoForSystemAgent
    INPUT: filePath = "/agents/.system/meta-agent.md"
    EXPECTED: tier = 2

    tier ← DetermineAgentTier("/agents/.system/meta-agent.md")

    ASSERT tier === 2

TEST: ApplyTierFilter_FiltersTierOne
    INPUT: agents array with mixed tiers, filter = "1"
    EXPECTED: only tier 1 agents returned

    agents ← [
        { name: "agent1", tier: 1 },
        { name: "agent2", tier: 2 },
        { name: "agent3", tier: 1 }
    ]

    filtered ← ApplyTierFilter(agents, "1")

    ASSERT filtered.length === 2
    ASSERT ALL agent IN filtered HAVE agent.tier === 1

TEST: ApplyTierFilter_FiltersTierTwo
    INPUT: agents array with mixed tiers, filter = "2"
    EXPECTED: only tier 2 agents returned

    agents ← [
        { name: "agent1", tier: 1 },
        { name: "agent2", tier: 2 },
        { name: "agent3", tier: 1 }
    ]

    filtered ← ApplyTierFilter(agents, "2")

    ASSERT filtered.length === 1
    ASSERT ALL agent IN filtered HAVE agent.tier === 2

TEST: CalculateFilterMetadata_CountsCorrectly
    INPUT: 8 tier 1 agents, 11 tier 2 agents
    EXPECTED: correct counts in metadata

    allAgents ← CreateMockAgents(tier1Count: 8, tier2Count: 11)
    filteredAgents ← allAgents.filter(a => a.tier === 1)

    metadata ← CalculateFilterMetadata(allAgents, filteredAgents, "1")

    ASSERT metadata.tier_counts.tier1 === 8
    ASSERT metadata.tier_counts.tier2 === 11
    ASSERT metadata.tier_counts.total === 19
    ASSERT metadata.filtered_count === 8

TEST: ResolveEffectiveTier_PrefersTierParameter
    INPUT: tier = "2", includeSystem = true
    EXPECTED: tier = "2" (tier param wins)

    result ← ResolveEffectiveTier("2", true)

    ASSERT result === "2"

TEST: ResolveEffectiveTier_FallsBackToIncludeSystem
    INPUT: tier = null, includeSystem = true
    EXPECTED: tier = "all"

    result ← ResolveEffectiveTier(null, true)

    ASSERT result === "all"
```

### 11.2 Integration Test Cases

```
TEST SUITE: AgentTierFilteringIntegrationTests

TEST: GET_Agents_DefaultsToTierOne
    REQUEST: GET /api/agents
    EXPECTED: only tier 1 agents, metadata shows tier="1"

    response ← await fetch("/api/agents")
    data ← await response.json()

    ASSERT response.status === 200
    ASSERT data.success === true
    ASSERT data.metadata.tier === "1"
    ASSERT ALL agent IN data.data HAVE agent.tier === 1

TEST: GET_Agents_FiltersByTierTwo
    REQUEST: GET /api/agents?tier=2
    EXPECTED: only tier 2 agents, metadata shows tier="2"

    response ← await fetch("/api/agents?tier=2")
    data ← await response.json()

    ASSERT response.status === 200
    ASSERT data.success === true
    ASSERT data.metadata.tier === "2"
    ASSERT ALL agent IN data.data HAVE agent.tier === 2

TEST: GET_Agents_ReturnsAllWithTierAll
    REQUEST: GET /api/agents?tier=all
    EXPECTED: all agents returned, correct counts

    response ← await fetch("/api/agents?tier=all")
    data ← await response.json()

    ASSERT response.status === 200
    ASSERT data.success === true
    ASSERT data.metadata.tier === "all"
    ASSERT data.total === data.metadata.tier_counts.total

TEST: GET_Agents_RejectsInvalidTier
    REQUEST: GET /api/agents?tier=invalid
    EXPECTED: 400 error with validation message

    response ← await fetch("/api/agents?tier=invalid")
    data ← await response.json()

    ASSERT response.status === 400
    ASSERT data.success === false
    ASSERT data.code === "INVALID_TIER"
    ASSERT data.validValues CONTAINS "1"
    ASSERT data.validValues CONTAINS "2"
    ASSERT data.validValues CONTAINS "all"

TEST: GET_Agents_SupportsLegacyIncludeSystem
    REQUEST: GET /api/agents?include_system=true
    EXPECTED: all agents, deprecation warning

    response ← await fetch("/api/agents?include_system=true")
    data ← await response.json()

    ASSERT response.status === 200
    ASSERT data.success === true
    ASSERT data.metadata.tier === "all"
    ASSERT data.metadata.warning CONTAINS "deprecated"

TEST: GET_Agents_PerformanceUnder50ms
    REQUEST: GET /api/agents?tier=1
    EXPECTED: response time < 50ms

    startTime ← performance.now()
    response ← await fetch("/api/agents?tier=1")
    endTime ← performance.now()

    duration ← endTime - startTime

    ASSERT response.status === 200
    ASSERT duration < 50  // milliseconds
```

### 11.3 E2E Test Cases

```
TEST SUITE: AgentTierFilteringE2ETests

TEST: UserSeesOnlyTier1AgentsByDefault
    SCENARIO: User opens agent manager page
    EXPECTED: Only 8 tier 1 agents visible, toggle shows "Show System"

    GIVEN user navigates to "/agents"
    WHEN page loads
    THEN agent cards count should be 8
    AND toggle button should show "Show System Agents (11)"
    AND all visible agents should have tier badge "User-Facing"

TEST: UserTogglesSystemAgentsOn
    SCENARIO: User clicks "Show System Agents" toggle
    EXPECTED: All 19 agents visible, toggle shows "Hide System"

    GIVEN user is on agent manager page
    AND only tier 1 agents are visible
    WHEN user clicks "Show System Agents (11)" button
    THEN agent cards count should be 19
    AND toggle button should show "Hide System Agents (11)"
    AND tier 2 agents should have "System" badge
    AND tier 2 agents should have reduced opacity

TEST: FilterPreferencePersistsAcrossReloads
    SCENARIO: User toggles system agents, reloads page
    EXPECTED: Preference persists from localStorage

    GIVEN user is on agent manager page
    WHEN user clicks "Show System Agents (11)" button
    AND waits for agents to load
    AND user refreshes page
    THEN all 19 agents should still be visible
    AND toggle should still show "Hide System Agents"

TEST: TierBadgesDisplayCorrectly
    SCENARIO: User views agents with system agents visible
    EXPECTED: Correct tier badges on all agents

    GIVEN user has system agents visible
    WHEN user views agent list
    THEN tier 1 agents should have blue "User-Facing" badge
    AND tier 2 agents should have gray "System" badge
    AND badge icons should be visible

TEST: SystemAgentsAreReadOnly
    SCENARIO: User attempts to edit system agent
    EXPECTED: Edit button disabled or hidden

    GIVEN user has system agents visible
    WHEN user hovers over tier 2 agent
    THEN edit button should be disabled
    AND tooltip should show "System agents are protected"

TEST: ToggleRespondsToKeyboard
    SCENARIO: User navigates with keyboard
    EXPECTED: Toggle works with Enter/Space keys

    GIVEN user has focused toggle button
    WHEN user presses Enter key
    THEN tier filter should toggle
    AND agents should update
    AND focus should remain on toggle

TEST: ErrorHandlingShowsUserFriendlyMessage
    SCENARIO: API request fails
    EXPECTED: Error notification displayed, previous state maintained

    GIVEN user clicks toggle
    AND API returns 500 error
    WHEN error occurs
    THEN error notification should appear
    AND previous agent list should remain visible
    AND toggle should revert to previous state
```

### 11.4 Performance Test Cases

```
TEST SUITE: AgentTierFilteringPerformanceTests

TEST: CacheHitRateAbove80Percent
    SCENARIO: Multiple requests for same tier
    EXPECTED: Cache hit rate > 80%

    REPEAT 10 times:
        response ← fetch("/api/agents?tier=1")

    cacheHitRate ← CalculateCacheHitRate()

    ASSERT cacheHitRate > 0.80

TEST: APIResponseTimeUnder50ms_Tier1
    SCENARIO: Request tier 1 agents
    EXPECTED: Response time < 50ms (p95)

    responseTimes ← []

    REPEAT 100 times:
        startTime ← performance.now()
        await fetch("/api/agents?tier=1")
        endTime ← performance.now()
        responseTimes.push(endTime - startTime)

    p95 ← CalculatePercentile(responseTimes, 95)

    ASSERT p95 < 50

TEST: UIRenderTimeUnder50ms
    SCENARIO: Filter toggle with 8 agents
    EXPECTED: UI update < 50ms

    startTime ← performance.now()
    user clicks toggle
    await waitForAgentsToRender()
    endTime ← performance.now()

    renderTime ← endTime - startTime

    ASSERT renderTime < 50

TEST: ConcurrentRequests_NoRaceConditions
    SCENARIO: Multiple simultaneous tier changes
    EXPECTED: No race conditions, final state correct

    CONCURRENT:
        request1 ← fetch("/api/agents?tier=1")
        request2 ← fetch("/api/agents?tier=2")
        request3 ← fetch("/api/agents?tier=all")

    AWAIT all requests

    // Final state should match last user action
    ASSERT no data corruption
    ASSERT correct tier displayed

TEST: MemoryUsageUnder50MB
    SCENARIO: Load all agents multiple times
    EXPECTED: Memory usage < 50MB

    initialMemory ← process.memoryUsage().heapUsed

    REPEAT 10 times:
        await fetch("/api/agents?tier=all")

    finalMemory ← process.memoryUsage().heapUsed
    memoryIncrease ← finalMemory - initialMemory

    ASSERT memoryIncrease < 50 * 1024 * 1024  // 50MB
```

### 11.5 Edge Case Test Cases

```
TEST SUITE: AgentTierFilteringEdgeCaseTests

TEST: NoAgentsExist
    SCENARIO: System has no agents
    EXPECTED: Empty state message displayed

    GIVEN all agent files are deleted
    WHEN user loads agent manager
    THEN empty state message should appear
    AND message should say "No agents available"

TEST: AllAgentsAreTier2
    SCENARIO: Only system agents exist
    EXPECTED: Empty state when tier=1, agents visible when tier=2

    GIVEN only tier 2 agents exist
    WHEN user requests tier=1
    THEN empty state should appear
    WHEN user toggles to tier=2
    THEN agents should be visible

TEST: MalformedTierParameter
    SCENARIO: tier=NULL, tier=undefined, tier=NaN
    EXPECTED: Default to tier=1

    TEST tier=null → defaults to "1"
    TEST tier=undefined → defaults to "1"
    TEST tier=NaN → validation error

TEST: VeryLongAgentList_1000Agents
    SCENARIO: 1000 agents in system
    EXPECTED: Pagination or virtual scrolling, no performance degradation

    GIVEN 1000 agent files exist
    WHEN user loads agent manager
    THEN response time should be < 100ms
    AND UI should remain responsive

TEST: ConcurrentToggleClicks
    SCENARIO: User rapidly clicks toggle
    EXPECTED: Only last click is processed, no race conditions

    GIVEN user rapidly clicks toggle 10 times
    WHEN all clicks are processed
    THEN final state matches last click
    AND only one API request is pending

TEST: LocalStorageQuotaExceeded
    SCENARIO: localStorage is full
    EXPECTED: Graceful degradation, use in-memory state

    GIVEN localStorage is at quota limit
    WHEN user toggles filter
    THEN preference should be stored in memory
    AND warning should be logged
    AND functionality should still work

TEST: NetworkOffline
    SCENARIO: User loses internet connection
    EXPECTED: Cached data used, offline message shown

    GIVEN user has previously loaded agents
    AND cache is populated
    WHEN network goes offline
    AND user toggles filter
    THEN cached data should be used
    AND offline indicator should appear
```

---

## Complexity Summary

### Overall System Complexity

```
COMPONENT COMPLEXITY ANALYSIS:

1. API Request Parsing
   Time: O(1)
   Space: O(1)

2. Parameter Validation
   Time: O(1)
   Space: O(1)

3. File System Loading
   Time: O(n * k) where n = file count, k = avg file size
   Space: O(n * k)

4. Tier Filtering
   Time: O(n)
   Space: O(m) where m = filtered count

5. Metadata Calculation
   Time: O(n)
   Space: O(1)

6. Response Building
   Time: O(1)
   Space: O(m)

7. Frontend State Management
   Time: O(1) for updates
   Space: O(m) for agent storage

8. UI Rendering
   Time: O(m) for React reconciliation
   Space: O(m) for virtual DOM

TOTAL COMPLEXITY:
   Time: O(n * k + n log n) ≈ O(n * k) dominated by file I/O
   Space: O(n * k) for storing all agent data

OPTIMIZATION STRATEGIES:
   1. Cache parsed agents (reduce file I/O)
   2. Use database instead of files (faster queries)
   3. Implement pagination (reduce m)
   4. Add indexes for O(log n) lookups
   5. Use virtual scrolling in UI (constant rendering)

TARGET PERFORMANCE:
   - API response: < 50ms (tier=1, 8 agents)
   - UI render: < 50ms (React update)
   - Total perceived latency: < 100ms
```

---

## Implementation Checklist

### Backend Implementation

- [ ] Add `tier` parameter parsing to `/api/agents` endpoint
- [ ] Implement `ValidateTierParameter()` function
- [ ] Implement `ResolveEffectiveTier()` for backward compatibility
- [ ] Update `DetermineAgentTier()` based on file path
- [ ] Implement `ApplyTierFilter()` function
- [ ] Implement `CalculateFilterMetadata()` function
- [ ] Add deprecation warning for `include_system` parameter
- [ ] Write unit tests for all backend functions
- [ ] Write integration tests for API endpoint

### Frontend Implementation

- [ ] Create `useAgentTierFilter()` React hook
- [ ] Implement `InitializeFilterState()` with localStorage
- [ ] Create `AgentTierToggle` component
- [ ] Add ARIA attributes for accessibility
- [ ] Implement `FetchAgentsWithTierFilter()` API client
- [ ] Add optimistic UI updates
- [ ] Implement error handling with rollback
- [ ] Add loading states
- [ ] Write unit tests for components
- [ ] Write E2E tests for user flows

### Performance Optimization

- [ ] Implement response caching with 5-minute TTL
- [ ] Add cache invalidation on agent file changes
- [ ] Implement debounced toggle (150ms delay)
- [ ] Add background prefetching for likely next tier
- [ ] Optimize database queries with indexes (future)
- [ ] Add performance monitoring
- [ ] Write performance benchmarks

### Testing & Validation

- [ ] Run all unit tests (target: 90% coverage)
- [ ] Run all integration tests
- [ ] Run all E2E tests
- [ ] Run performance benchmarks
- [ ] Test backward compatibility with legacy clients
- [ ] Test edge cases (no agents, all tier 2, etc.)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Cross-browser testing

### Documentation

- [ ] Update API documentation with tier parameter
- [ ] Document backward compatibility strategy
- [ ] Create migration guide for frontend developers
- [ ] Document performance characteristics
- [ ] Add inline code comments
- [ ] Update OpenAPI specification

---

## Appendix: Helper Functions

### String Utilities

```
FUNCTION: ToString
INPUT: value (any type)
OUTPUT: string

BEGIN
    IF value IS NULL THEN
        RETURN "null"
    END IF

    IF value IS UNDEFINED THEN
        RETURN "undefined"
    END IF

    RETURN String(value)
END


FUNCTION: SHA256
INPUT: content (string)
OUTPUT: hash (string)

BEGIN
    // Use crypto library
    hash ← crypto.createHash('sha256')
    hash.update(content)
    RETURN hash.digest('hex')
END
```

### Array Utilities

```
FUNCTION: Concatenate
INPUT: array1 (array), array2 (array)
OUTPUT: combined (array)

BEGIN
    RETURN [...array1, ...array2]
END


FUNCTION: CalculatePercentile
INPUT: values (array<number>), percentile (number 0-100)
OUTPUT: value at percentile

BEGIN
    sorted ← values.sort((a, b) => a - b)
    index ← Math.ceil((percentile / 100) * sorted.length) - 1
    RETURN sorted[index]
END
```

### Logging Utilities

```
FUNCTION: LogDebug
INPUT: message (string), data (object)

BEGIN
    IF Environment.LOG_LEVEL === "debug" THEN
        console.log("[DEBUG]", message, data)
    END IF
END


FUNCTION: LogWarning
INPUT: message (string), data (object)

BEGIN
    console.warn("[WARNING]", message, data)
END


FUNCTION: LogError
INPUT: message (string), error (Error)

BEGIN
    console.error("[ERROR]", message, {
        message: error.message,
        stack: error.stack
    })
END
```

---

**END OF PSEUDOCODE DOCUMENT**

**Next Phase**: Architecture Design & Database Schema
**Implementation Timeline**: 2-3 weeks for full-stack delivery
**Review Status**: Ready for technical review and approval
