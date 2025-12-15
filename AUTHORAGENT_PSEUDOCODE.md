# AuthorAgent Type Fix - Pseudocode Specification

## Problem Statement

**Current State:**
- Backend returns: `authorAgent: { id: 1, name: "Alice", ... }` (Object)
- TypeScript expects: `authorAgent: string` (String)
- Result: Type mismatch causing rendering errors

**Target State:**
- Backend returns: `authorAgent: "Alice"` (String)
- Frontend safely handles: Both string and object during migration
- All references consistently use string type

---

## 1. Backend Transformation Algorithm

### ALGORITHM: NormalizeAuthorAgent
**PURPOSE:** Convert all authorAgent references from object to string
**LOCATION:** `/workspaces/agent-feed/api-server/server.js`

```
INPUT: mockAgentPosts (array of post objects)
OUTPUT: mockAgentPosts with normalized authorAgent fields

BEGIN
    FOR EACH post IN mockAgentPosts DO
        // Validate current authorAgent state
        IF post.authorAgent IS NULL THEN
            Log.warning("Post ID " + post.id + " has null authorAgent")
            post.authorAgent ← "Unknown"
            CONTINUE
        END IF

        IF TypeOf(post.authorAgent) IS "object" THEN
            // Extract name from object
            IF post.authorAgent.name EXISTS AND post.authorAgent.name IS NOT EMPTY THEN
                agentName ← post.authorAgent.name
            ELSE IF post.authorAgent.id EXISTS THEN
                // Fallback: lookup by ID
                agentName ← LookupAgentNameById(post.authorAgent.id)
            ELSE
                // Ultimate fallback
                agentName ← "Unknown"
            END IF

            // Replace object with string
            post.authorAgent ← agentName

            Log.info("Normalized post " + post.id + " authorAgent to: " + agentName)
        ELSE IF TypeOf(post.authorAgent) IS "string" THEN
            // Already normalized, validate not empty
            IF post.authorAgent IS EMPTY THEN
                post.authorAgent ← "Unknown"
                Log.warning("Post ID " + post.id + " has empty authorAgent")
            END IF
        ELSE
            // Invalid type
            Log.error("Post ID " + post.id + " has invalid authorAgent type: " + TypeOf(post.authorAgent))
            post.authorAgent ← "Unknown"
        END IF
    END FOR

    RETURN mockAgentPosts
END

SUBROUTINE: LookupAgentNameById
INPUT: agentId (integer)
OUTPUT: agentName (string)

BEGIN
    FOR EACH agent IN mockAgents DO
        IF agent.id EQUALS agentId THEN
            RETURN agent.name
        END IF
    END FOR

    // Not found
    RETURN "Unknown"
END
```

### Time Complexity: O(n) where n = number of posts
### Space Complexity: O(1) in-place modification

---

## 2. Frontend Defensive Extraction Algorithm

### ALGORITHM: SafeAuthorAgentExtraction
**PURPOSE:** Safely extract agent name from string or object
**LOCATION:** `/workspaces/agent-feed/frontend/src/pages/RealSocialMediaFeed.tsx`

```
ALGORITHM: GetAuthorAgentName
INPUT: authorAgent (string | object | null | undefined)
OUTPUT: agentName (string)

BEGIN
    // Handle null/undefined
    IF authorAgent IS NULL OR authorAgent IS UNDEFINED THEN
        Log.debug("Null or undefined authorAgent, using fallback")
        RETURN "A"  // Fallback default
    END IF

    // Handle string (expected format)
    IF TypeOf(authorAgent) IS "string" THEN
        IF authorAgent.trim() IS NOT EMPTY THEN
            RETURN authorAgent.trim()
        ELSE
            Log.warning("Empty string authorAgent, using fallback")
            RETURN "A"
        END IF
    END IF

    // Handle object (legacy format - migration support)
    IF TypeOf(authorAgent) IS "object" THEN
        // Try name property
        IF authorAgent.name EXISTS THEN
            IF TypeOf(authorAgent.name) IS "string" AND authorAgent.name IS NOT EMPTY THEN
                Log.debug("Extracted name from object: " + authorAgent.name)
                RETURN authorAgent.name.trim()
            END IF
        END IF

        // Try username property (alternative)
        IF authorAgent.username EXISTS THEN
            IF TypeOf(authorAgent.username) IS "string" AND authorAgent.username IS NOT EMPTY THEN
                Log.debug("Extracted username from object: " + authorAgent.username)
                RETURN authorAgent.username.trim()
            END IF
        END IF

        // Try displayName property (alternative)
        IF authorAgent.displayName EXISTS THEN
            IF TypeOf(authorAgent.displayName) IS "string" AND authorAgent.displayName IS NOT EMPTY THEN
                Log.debug("Extracted displayName from object: " + authorAgent.displayName)
                RETURN authorAgent.displayName.trim()
            END IF
        END IF

        Log.warning("Object authorAgent has no valid name property, using fallback")
        RETURN "A"
    END IF

    // Unknown type
    Log.error("Invalid authorAgent type: " + TypeOf(authorAgent) + ", using fallback")
    RETURN "A"
END
```

### Time Complexity: O(1) - constant property lookups
### Space Complexity: O(1) - string operations

---

## 3. Avatar Initial Generation Algorithm

### ALGORITHM: GetAvatarInitial
**PURPOSE:** Generate single-character avatar from agent name
**LOCATION:** `/workspaces/agent-feed/frontend/src/pages/RealSocialMediaFeed.tsx`

```
INPUT: authorAgent (string | object | null | undefined)
OUTPUT: initial (string, single uppercase character)

BEGIN
    // Get safe name using extraction algorithm
    agentName ← GetAuthorAgentName(authorAgent)

    // Validate name is not empty
    IF agentName IS NULL OR agentName.length IS 0 THEN
        RETURN "A"  // Default fallback
    END IF

    // Remove leading/trailing whitespace
    trimmedName ← agentName.trim()

    IF trimmedName.length IS 0 THEN
        RETURN "A"  // Whitespace-only fallback
    END IF

    // Extract first character
    firstChar ← trimmedName.charAt(0)

    // Convert to uppercase
    initial ← firstChar.toUpperCase()

    // Validate is alphabetic (optional enhancement)
    IF NOT IsAlphabetic(initial) THEN
        RETURN "A"  // Non-alphabetic fallback
    END IF

    RETURN initial
END

SUBROUTINE: IsAlphabetic
INPUT: char (string, single character)
OUTPUT: isAlpha (boolean)

BEGIN
    RETURN char MATCHES REGEX /[A-Z]/i
END
```

### Time Complexity: O(1) - string operations
### Space Complexity: O(1) - single character

---

## 4. Error Handling Strategy

### PATTERN: Defensive Programming with Graceful Degradation

```
STRATEGY: MultiLayerValidation

LAYER 1: Backend Normalization
    - Ensure all data sent is correct type
    - Validate before response
    - Log inconsistencies

LAYER 2: Frontend Type Guards
    - Check type at runtime
    - Support both formats during migration
    - Never throw errors, always fallback

LAYER 3: UI Fallbacks
    - Default avatar initial: "A"
    - Default name: "Unknown" or "A"
    - Never show undefined/null in UI

ERROR RECOVERY PATHS:

PATH 1: Null/Undefined AuthorAgent
    Backend → Set to "Unknown"
    Frontend → Return "A"
    UI → Show "A" avatar, "Unknown" name

PATH 2: Empty String AuthorAgent
    Backend → Set to "Unknown"
    Frontend → Return "A"
    UI → Show "A" avatar, "Unknown" name

PATH 3: Object AuthorAgent (Legacy)
    Backend → Should not occur after migration
    Frontend → Extract .name property
    UI → Show extracted name or "A" fallback

PATH 4: Invalid Type
    Backend → Convert to "Unknown"
    Frontend → Return "A"
    UI → Show "A" avatar, "Unknown" name
    Log → Error with details for debugging
```

---

## 5. Migration Path Algorithm

### ALGORITHM: PhaseTransitionStrategy
**PURPOSE:** Support both formats during migration without breaking changes

```
PHASE 1: Backend Preparation (Day 0)
BEGIN
    // Add validation function
    FUNCTION ValidateAuthorAgent(post):
        IF TypeOf(post.authorAgent) IS NOT "string" THEN
            Log.warning("Post " + post.id + " has non-string authorAgent")
            RETURN false
        END IF
        RETURN true
    END FUNCTION

    // Run validation on current data
    FOR EACH post IN mockAgentPosts DO
        IF NOT ValidateAuthorAgent(post) THEN
            validationErrors.append(post.id)
        END IF
    END FOR

    Log.info("Validation complete: " + validationErrors.length + " issues found")
    RETURN validationErrors
END

PHASE 2: Frontend Defensive Update (Day 0-1)
BEGIN
    // Deploy GetAuthorAgentName function
    // Update all authorAgent references to use function
    // Test with current backend (object format)
    // Verify fallback handling works

    CHANGE: post.authorAgent → GetAuthorAgentName(post.authorAgent)
    VERIFY: UI renders correctly
    VERIFY: No console errors
    VERIFY: Avatar initials display
END

PHASE 3: Backend Normalization (Day 1)
BEGIN
    // Apply NormalizeAuthorAgent algorithm
    // Transform all mockAgentPosts
    // Verify API responses

    mockAgentPosts ← NormalizeAuthorAgent(mockAgentPosts)

    FOR EACH post IN mockAgentPosts DO
        Assert(TypeOf(post.authorAgent) IS "string")
        Assert(post.authorAgent IS NOT EMPTY)
    END FOR

    Log.info("All posts normalized to string authorAgent")
END

PHASE 4: Verification (Day 1-2)
BEGIN
    // Frontend should now receive strings
    // Defensive code should pass through strings
    // Object handling code should be unused

    MONITOR: GetAuthorAgentName log outputs
    VERIFY: No object extraction logs
    VERIFY: All string pass-through logs
    CONFIRM: UI rendering correctly
END

PHASE 5: Cleanup (Day 3+)
BEGIN
    // OPTIONAL: Remove object handling from frontend
    // Only if 100% confident backend is stable

    SIMPLIFY GetAuthorAgentName to:
        FUNCTION GetAuthorAgentName(authorAgent):
            IF authorAgent IS STRING AND NOT EMPTY THEN
                RETURN authorAgent
            ELSE
                RETURN "A"
            END IF
        END FUNCTION

    // Keep logging for monitoring
END
```

---

## 6. Validation Steps Algorithm

### ALGORITHM: ComprehensiveValidation
**PURPOSE:** Ensure migration correctness at each step

```
VALIDATION SUITE:

TEST 1: Backend Data Integrity
BEGIN
    FOR EACH post IN mockAgentPosts DO
        // Type check
        Assert(TypeOf(post.authorAgent) IS "string",
               "Post " + post.id + " authorAgent must be string")

        // Non-empty check
        Assert(post.authorAgent.length > 0,
               "Post " + post.id + " authorAgent must not be empty")

        // Valid agent check
        agentExists ← false
        FOR EACH agent IN mockAgents DO
            IF agent.name EQUALS post.authorAgent THEN
                agentExists ← true
                BREAK
            END IF
        END FOR

        Assert(agentExists OR post.authorAgent EQUALS "Unknown",
               "Post " + post.id + " authorAgent must reference valid agent")
    END FOR

    Log.success("All posts have valid string authorAgent")
END

TEST 2: Frontend Extraction Correctness
BEGIN
    testCases ← [
        {input: "Alice", expected: "Alice"},
        {input: {name: "Bob"}, expected: "Bob"},
        {input: null, expected: "A"},
        {input: undefined, expected: "A"},
        {input: "", expected: "A"},
        {input: {id: 1}, expected: "A"},
        {input: 123, expected: "A"}
    ]

    FOR EACH testCase IN testCases DO
        result ← GetAuthorAgentName(testCase.input)
        Assert(result EQUALS testCase.expected,
               "Input " + testCase.input + " should return " + testCase.expected)
    END FOR

    Log.success("All extraction test cases pass")
END

TEST 3: Avatar Initial Correctness
BEGIN
    testCases ← [
        {input: "Alice", expected: "A"},
        {input: "Bob", expected: "B"},
        {input: {name: "Charlie"}, expected: "C"},
        {input: null, expected: "A"},
        {input: "", expected: "A"},
        {input: "  ", expected: "A"},
        {input: "1Alice", expected: "A"}  // Non-alphabetic handling
    ]

    FOR EACH testCase IN testCases DO
        result ← GetAvatarInitial(testCase.input)
        Assert(result EQUALS testCase.expected,
               "Input " + testCase.input + " should return initial " + testCase.expected)
    END FOR

    Log.success("All avatar initial test cases pass")
END

TEST 4: End-to-End Rendering
BEGIN
    // Load mock data
    posts ← FetchAgentPosts()

    FOR EACH post IN posts DO
        // Verify extraction
        agentName ← GetAuthorAgentName(post.authorAgent)
        Assert(agentName IS NOT NULL, "Agent name must not be null")
        Assert(agentName.length > 0, "Agent name must not be empty")

        // Verify avatar
        initial ← GetAvatarInitial(post.authorAgent)
        Assert(initial.length EQUALS 1, "Initial must be single character")
        Assert(initial MATCHES /[A-Z]/, "Initial must be uppercase letter")

        // Verify no console errors during render
        component ← RenderPostCard(post)
        Assert(component.hasErrors EQUALS false, "Post card must render without errors")
    END FOR

    Log.success("All posts render correctly end-to-end")
END

TEST 5: TypeScript Type Safety
BEGIN
    // Compile-time checks
    VERIFY: Post interface defines authorAgent as string
    VERIFY: No TypeScript errors in RealSocialMediaFeed.tsx
    VERIFY: No 'any' types used for authorAgent

    // Runtime type checks
    FOR EACH post IN mockAgentPosts DO
        VERIFY: typeof post.authorAgent === 'string'
    END FOR

    Log.success("TypeScript types are correct and consistent")
END
```

---

## 7. Rollback Strategy

### ALGORITHM: SafeRollback
**PURPOSE:** Revert changes if issues detected

```
IF Migration encounters critical errors THEN
    BEGIN Rollback
        STEP 1: Revert Backend
            // Restore object format
            FOR EACH post IN mockAgentPosts DO
                agentName ← post.authorAgent
                agentObject ← FindAgentByName(agentName)

                IF agentObject EXISTS THEN
                    post.authorAgent ← agentObject
                ELSE
                    post.authorAgent ← {id: 0, name: agentName}
                END IF
            END FOR

        STEP 2: Frontend Remains Defensive
            // GetAuthorAgentName handles both formats
            // No changes needed - already compatible

        STEP 3: Verify System Stability
            // Check all posts render
            // Check no TypeScript errors
            // Check API responses valid

        STEP 4: Log Rollback Event
            Log.error("AuthorAgent migration rolled back due to: " + errorReason)
            Alert.notify(developmentTeam, rollbackDetails)
    END Rollback
END IF
```

---

## Summary

**Execution Order:**
1. Implement backend NormalizeAuthorAgent (server.js)
2. Implement frontend GetAuthorAgentName (RealSocialMediaFeed.tsx)
3. Run validation suite
4. Deploy frontend first (defensive, handles both)
5. Deploy backend second (normalization)
6. Monitor for 24-48 hours
7. Optional cleanup if stable

**Key Principles:**
- Never break existing functionality
- Always provide fallbacks
- Support both formats during transition
- Validate at every layer
- Log for debugging and monitoring

**Success Criteria:**
- Zero TypeScript errors
- All posts render with correct agent names
- All avatars show correct initials
- No console warnings or errors
- 100% test coverage passing
