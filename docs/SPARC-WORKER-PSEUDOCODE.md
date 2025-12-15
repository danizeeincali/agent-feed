# SPARC Worker Content Extraction - Pseudocode Specification

## Overview

This document specifies the algorithmic design for extracting agent output from either text messages OR workspace files in the agent-feed worker system.

---

## 1. Agent Metadata Extraction

### ALGORITHM: readAgentFrontmatter
**PURPOSE**: Extract agent configuration and posting preferences from agent definition file

```
ALGORITHM: readAgentFrontmatter
INPUT: agentId (string) - identifier for the agent (e.g., "link-logger-agent")
OUTPUT: agentMetadata (object) or null

CONSTANTS:
    AGENTS_BASE_PATH = "/prod/.claude/agents/"
    FRONTMATTER_DELIMITER = "---"

BEGIN
    // Step 1: Construct file path
    agentFilePath ← AGENTS_BASE_PATH + agentId + ".md"

    // Step 2: Check file existence
    IF NOT fileExists(agentFilePath) THEN
        LOG warning("Agent file not found", {agentId: agentId, path: agentFilePath})
        RETURN null
    END IF

    // Step 3: Read file contents
    TRY
        fileContents ← readFile(agentFilePath)
    CATCH FileReadError AS error
        LOG error("Failed to read agent file", {agentId: agentId, error: error})
        RETURN null
    END TRY

    // Step 4: Parse frontmatter
    frontmatter ← extractFrontmatter(fileContents)

    IF frontmatter is null THEN
        LOG warning("No frontmatter found in agent file", {agentId: agentId})
        RETURN {
            agentId: agentId,
            postsAsSelf: false,
            displayName: agentId
        }
    END IF

    // Step 5: Extract metadata fields
    metadata ← {
        agentId: agentId,
        postsAsSelf: frontmatter.posts_as_self OR false,
        displayName: frontmatter.display_name OR agentId,
        description: frontmatter.description OR "",
        outputPatterns: frontmatter.output_patterns OR [],
        workspaceDir: frontmatter.workspace_dir OR null
    }

    LOG debug("Agent metadata extracted", metadata)
    RETURN metadata
END


SUBROUTINE: extractFrontmatter
INPUT: fileContents (string)
OUTPUT: frontmatterData (object) or null

BEGIN
    // Step 1: Check for frontmatter delimiters
    IF NOT fileContents.startsWith(FRONTMATTER_DELIMITER) THEN
        RETURN null
    END IF

    // Step 2: Extract frontmatter block
    lines ← splitLines(fileContents)
    frontmatterLines ← []
    inFrontmatter ← false
    delimiterCount ← 0

    FOR EACH line IN lines DO
        IF line.trim() = FRONTMATTER_DELIMITER THEN
            delimiterCount ← delimiterCount + 1

            IF delimiterCount = 1 THEN
                inFrontmatter ← true
                CONTINUE
            ELSE IF delimiterCount = 2 THEN
                BREAK // End of frontmatter
            END IF
        END IF

        IF inFrontmatter THEN
            frontmatterLines.append(line)
        END IF
    END FOR

    // Step 3: Parse YAML
    IF frontmatterLines.length = 0 THEN
        RETURN null
    END IF

    yamlContent ← join(frontmatterLines, "\n")

    TRY
        parsedData ← parseYAML(yamlContent)
        RETURN parsedData
    CATCH YAMLParseError AS error
        LOG error("Failed to parse frontmatter YAML", {error: error})
        RETURN null
    END TRY
END
```

**COMPLEXITY ANALYSIS:**
- Time: O(n) where n = file size
- Space: O(n) for file contents storage

---

## 2. Workspace File Content Extraction

### ALGORITHM: extractFromWorkspaceFiles
**PURPOSE**: Extract intelligence from agent workspace files (briefings, summaries)

```
ALGORITHM: extractFromWorkspaceFiles
INPUT:
    agentId (string) - identifier for the agent
    workspaceDir (string) - path to agent workspace
OUTPUT: extractedContent (string) or null

CONSTANTS:
    BRIEFING_PATTERN = "lambda-vi-briefing-*.md"
    SUMMARY_DIR = "summaries"
    EXECUTIVE_BRIEF_MARKER = "## Executive Brief"
    MAX_FILE_SIZE = 1048576 // 1MB in bytes

DATA STRUCTURES:
    FileMatch:
        path: string
        modifiedTime: timestamp
        priority: integer

BEGIN
    // Step 1: Validate workspace directory
    IF workspaceDir is null OR workspaceDir = "" THEN
        LOG debug("No workspace directory specified", {agentId: agentId})
        RETURN null
    END IF

    IF NOT directoryExists(workspaceDir) THEN
        LOG warning("Workspace directory not found", {
            agentId: agentId,
            workspaceDir: workspaceDir
        })
        RETURN null
    END IF

    // Step 2: Find candidate files
    candidateFiles ← findCandidateFiles(workspaceDir, agentId)

    IF candidateFiles.length = 0 THEN
        LOG debug("No candidate files found in workspace", {
            agentId: agentId,
            workspaceDir: workspaceDir
        })
        RETURN null
    END IF

    // Step 3: Sort files by priority and recency
    sortedFiles ← sortFilesByPriority(candidateFiles)

    // Step 4: Extract content from best candidate
    FOR EACH file IN sortedFiles DO
        content ← extractContentFromFile(file)

        IF content is not null AND content.length > 0 THEN
            LOG info("Extracted content from workspace file", {
                agentId: agentId,
                filePath: file.path,
                contentLength: content.length
            })
            RETURN content
        END IF
    END FOR

    LOG debug("No extractable content found in workspace files", {
        agentId: agentId
    })
    RETURN null
END


SUBROUTINE: findCandidateFiles
INPUT: workspaceDir (string), agentId (string)
OUTPUT: candidateFiles (array of FileMatch)

BEGIN
    candidates ← []

    // Pattern 1: Lambda VI Briefing files
    briefingFiles ← glob(workspaceDir + "/" + BRIEFING_PATTERN)
    FOR EACH file IN briefingFiles DO
        candidates.append({
            path: file,
            modifiedTime: getFileModifiedTime(file),
            priority: 1 // Highest priority
        })
    END FOR

    // Pattern 2: Summary directory files
    summaryDir ← workspaceDir + "/" + SUMMARY_DIR
    IF directoryExists(summaryDir) THEN
        summaryFiles ← glob(summaryDir + "/*.md")
        FOR EACH file IN summaryFiles DO
            candidates.append({
                path: file,
                modifiedTime: getFileModifiedTime(file),
                priority: 2 // Medium priority
            })
        END FOR
    END IF

    // Pattern 3: Agent-specific output files
    agentOutputPattern ← agentId + "-output-*.md"
    outputFiles ← glob(workspaceDir + "/" + agentOutputPattern)
    FOR EACH file IN outputFiles DO
        candidates.append({
            path: file,
            modifiedTime: getFileModifiedTime(file),
            priority: 3 // Lower priority
        })
    END FOR

    RETURN candidates
END


SUBROUTINE: sortFilesByPriority
INPUT: files (array of FileMatch)
OUTPUT: sortedFiles (array of FileMatch)

BEGIN
    // Sort by priority (ascending), then by modifiedTime (descending)
    sortedFiles ← sort(files, COMPARATOR: (a, b) =>
        IF a.priority != b.priority THEN
            RETURN a.priority - b.priority
        ELSE
            RETURN b.modifiedTime - a.modifiedTime
        END IF
    )

    RETURN sortedFiles
END


SUBROUTINE: extractContentFromFile
INPUT: file (FileMatch)
OUTPUT: content (string) or null

BEGIN
    // Step 1: Check file size
    fileSize ← getFileSize(file.path)
    IF fileSize > MAX_FILE_SIZE THEN
        LOG warning("File too large to process", {
            path: file.path,
            size: fileSize
        })
        RETURN null
    END IF

    // Step 2: Read file
    TRY
        fileContents ← readFile(file.path)
    CATCH FileReadError AS error
        LOG error("Failed to read file", {path: file.path, error: error})
        RETURN null
    END TRY

    // Step 3: Extract relevant sections
    extractedContent ← extractExecutiveBrief(fileContents)

    IF extractedContent is null OR extractedContent.trim().length = 0 THEN
        // Fallback: use entire file content (with size limit)
        extractedContent ← truncateContent(fileContents, 2000)
    END IF

    RETURN extractedContent
END


SUBROUTINE: extractExecutiveBrief
INPUT: fileContents (string)
OUTPUT: briefContent (string) or null

BEGIN
    // Find Executive Brief section
    lines ← splitLines(fileContents)
    inBriefSection ← false
    briefLines ← []

    FOR EACH line IN lines DO
        // Check for section start
        IF line.trim().startsWith(EXECUTIVE_BRIEF_MARKER) THEN
            inBriefSection ← true
            CONTINUE
        END IF

        // Check for next section (ends brief)
        IF inBriefSection AND line.trim().startsWith("##") THEN
            BREAK
        END IF

        // Collect brief content
        IF inBriefSection THEN
            briefLines.append(line)
        END IF
    END FOR

    IF briefLines.length = 0 THEN
        RETURN null
    END IF

    briefContent ← join(briefLines, "\n").trim()
    RETURN briefContent
END


SUBROUTINE: truncateContent
INPUT: content (string), maxLength (integer)
OUTPUT: truncated (string)

BEGIN
    IF content.length <= maxLength THEN
        RETURN content
    END IF

    truncated ← content.substring(0, maxLength)

    // Try to break at last sentence
    lastPeriod ← truncated.lastIndexOf(".")
    IF lastPeriod > maxLength * 0.8 THEN
        truncated ← truncated.substring(0, lastPeriod + 1)
    ELSE
        truncated ← truncated + "..."
    END IF

    RETURN truncated
END
```

**COMPLEXITY ANALYSIS:**
- Time: O(f * n) where f = number of files, n = average file size
- Space: O(n) for largest file content

**EDGE CASES:**
1. Workspace directory does not exist
2. No matching files found
3. File exists but is empty
4. File exceeds size limit
5. Multiple briefing files (use most recent)
6. Malformed markdown structure

---

## 3. Text Message Content Extraction

### ALGORITHM: extractFromTextMessages
**PURPOSE**: Extract intelligence from SDK message stream (existing fallback method)

```
ALGORITHM: extractFromTextMessages
INPUT: messages (array of Message objects)
OUTPUT: textContent (string)

DATA STRUCTURES:
    Message:
        type: string ("text", "tool_use", "tool_result", etc.)
        role: string ("user", "assistant")
        content: string or array

CONSTANTS:
    MIN_CONTENT_LENGTH = 10
    MAX_MESSAGE_LENGTH = 5000

BEGIN
    // Step 1: Validate input
    IF messages is null OR messages.length = 0 THEN
        LOG debug("No messages provided for extraction")
        RETURN ""
    END IF

    // Step 2: Filter assistant messages
    assistantMessages ← filterAssistantMessages(messages)

    IF assistantMessages.length = 0 THEN
        LOG debug("No assistant messages found")
        RETURN ""
    END IF

    // Step 3: Extract text content
    textParts ← []

    FOR EACH message IN assistantMessages DO
        extractedText ← extractTextFromMessage(message)

        IF extractedText is not null AND extractedText.length >= MIN_CONTENT_LENGTH THEN
            textParts.append(extractedText)
        END IF
    END FOR

    // Step 4: Combine and clean
    IF textParts.length = 0 THEN
        RETURN ""
    END IF

    combinedText ← join(textParts, "\n\n")
    cleanedText ← cleanTextContent(combinedText)
    truncatedText ← truncateContent(cleanedText, MAX_MESSAGE_LENGTH)

    LOG debug("Extracted text from messages", {
        messageCount: assistantMessages.length,
        textLength: truncatedText.length
    })

    RETURN truncatedText
END


SUBROUTINE: filterAssistantMessages
INPUT: messages (array of Message)
OUTPUT: assistantMessages (array of Message)

BEGIN
    assistantMessages ← []

    FOR EACH message IN messages DO
        IF message.role = "assistant" THEN
            assistantMessages.append(message)
        END IF
    END FOR

    RETURN assistantMessages
END


SUBROUTINE: extractTextFromMessage
INPUT: message (Message)
OUTPUT: text (string) or null

BEGIN
    // Handle different content structures
    IF message.content is string THEN
        RETURN message.content
    END IF

    IF message.content is array THEN
        textBlocks ← []

        FOR EACH block IN message.content DO
            IF block.type = "text" THEN
                textBlocks.append(block.text)
            END IF
        END FOR

        IF textBlocks.length > 0 THEN
            RETURN join(textBlocks, " ")
        END IF
    END IF

    RETURN null
END


SUBROUTINE: cleanTextContent
INPUT: text (string)
OUTPUT: cleaned (string)

BEGIN
    // Remove excessive whitespace
    cleaned ← replaceMultipleSpaces(text, " ")

    // Remove multiple newlines (keep max 2)
    cleaned ← replaceMultipleNewlines(cleaned, "\n\n")

    // Trim leading/trailing whitespace
    cleaned ← trim(cleaned)

    RETURN cleaned
END
```

**COMPLEXITY ANALYSIS:**
- Time: O(m * c) where m = number of messages, c = average content size
- Space: O(m * c) for combined text storage

---

## 4. Unified Intelligence Extraction

### ALGORITHM: extractIntelligence
**PURPOSE**: Main orchestration algorithm for extracting agent output using multiple strategies

```
ALGORITHM: extractIntelligence
INPUT:
    sdkResult (object) - agent execution result from SDK
    ticket (object) - ticket data with metadata
OUTPUT: intelligence (object)

DATA STRUCTURES:
    Intelligence:
        content: string
        source: string ("workspace", "messages", "fallback")
        agentId: string
        extractedAt: timestamp
        metadata: object

CONSTANTS:
    DEFAULT_FALLBACK = "No summary available - agent completed successfully"
    EXTRACTION_TIMEOUT = 5000 // 5 seconds in milliseconds

BEGIN
    startTime ← getCurrentTime()

    // Step 1: Extract agent ID from ticket
    agentId ← ticket.agentId OR "unknown-agent"

    LOG info("Starting intelligence extraction", {
        agentId: agentId,
        ticketId: ticket.id,
        hasMessages: sdkResult.messages != null
    })

    // Step 2: Get agent metadata
    agentMetadata ← readAgentFrontmatter(agentId)

    // Step 3: Decision tree for extraction strategy
    extractedContent ← null
    extractionSource ← null

    // Strategy 1: Workspace files (if posts_as_self is true)
    IF agentMetadata is not null AND agentMetadata.postsAsSelf = true THEN
        LOG debug("Attempting workspace file extraction", {agentId: agentId})

        workspaceDir ← agentMetadata.workspaceDir OR ("/workspaces/agent-feed/" + agentId)
        extractedContent ← extractFromWorkspaceFiles(agentId, workspaceDir)

        IF extractedContent is not null THEN
            extractionSource ← "workspace"
            LOG info("Successfully extracted from workspace files", {
                agentId: agentId,
                contentLength: extractedContent.length
            })
        END IF
    END IF

    // Strategy 2: Text messages (fallback or primary for non-posting agents)
    IF extractedContent is null THEN
        LOG debug("Attempting message extraction", {agentId: agentId})

        IF sdkResult.messages is not null THEN
            extractedContent ← extractFromTextMessages(sdkResult.messages)

            IF extractedContent.length > 0 THEN
                extractionSource ← "messages"
                LOG info("Successfully extracted from messages", {
                    agentId: agentId,
                    contentLength: extractedContent.length
                })
            END IF
        ELSE
            LOG warning("No messages available for extraction", {agentId: agentId})
        END IF
    END IF

    // Strategy 3: Default fallback
    IF extractedContent is null OR extractedContent.trim().length = 0 THEN
        LOG warning("No content extracted, using fallback", {agentId: agentId})
        extractedContent ← DEFAULT_FALLBACK
        extractionSource ← "fallback"
    END IF

    // Step 4: Build intelligence object
    endTime ← getCurrentTime()
    extractionDuration ← endTime - startTime

    intelligence ← {
        content: extractedContent,
        source: extractionSource,
        agentId: agentId,
        extractedAt: endTime,
        metadata: {
            duration: extractionDuration,
            postsAsSelf: agentMetadata?.postsAsSelf OR false,
            displayName: agentMetadata?.displayName OR agentId,
            ticketId: ticket.id,
            postId: ticket.postId OR null
        }
    }

    LOG info("Intelligence extraction complete", {
        agentId: agentId,
        source: extractionSource,
        duration: extractionDuration,
        contentLength: extractedContent.length
    })

    RETURN intelligence
END
```

**COMPLEXITY ANALYSIS:**
- Time: O(f * n + m * c) where:
  - f = number of workspace files
  - n = average file size
  - m = number of messages
  - c = average message content size
- Space: O(max(n, m * c)) for largest content storage

**DECISION TREE:**
```
START
  |
  ├─> Read agent frontmatter
  |     ├─> Success: Get metadata
  |     └─> Failure: Use defaults (postsAsSelf = false)
  |
  ├─> Check postsAsSelf flag
  |     |
  |     ├─> TRUE: Try workspace extraction
  |     |     ├─> Files found: Extract content
  |     |     |     ├─> Success: RETURN workspace content
  |     |     |     └─> Failure: Continue to messages
  |     |     └─> No files: Continue to messages
  |     |
  |     └─> FALSE: Skip workspace extraction
  |
  ├─> Try message extraction
  |     ├─> Messages exist: Extract text
  |     |     ├─> Text found: RETURN message content
  |     |     └─> No text: Continue to fallback
  |     └─> No messages: Continue to fallback
  |
  └─> Use default fallback
        └─> RETURN "No summary available"
```

---

## 5. Example Execution Flows

### Example 1: Link Logger Agent (Workspace-Based)

```
EXECUTION FLOW: Link Logger Agent

INPUT:
    agentId: "link-logger-agent"
    ticket: {id: 123, agentId: "link-logger-agent", postId: 456}
    sdkResult: {messages: [...], status: "completed"}

STEP 1: readAgentFrontmatter("link-logger-agent")
    → Read /prod/.claude/agents/link-logger-agent.md
    → Parse frontmatter:
        posts_as_self: true
        workspace_dir: "/workspaces/agent-feed/link-logger-agent"
    → RETURN {postsAsSelf: true, workspaceDir: "/workspaces/agent-feed/link-logger-agent"}

STEP 2: Check postsAsSelf
    → TRUE: Proceed to workspace extraction

STEP 3: extractFromWorkspaceFiles("link-logger-agent", "/workspaces/agent-feed/link-logger-agent")
    → Find files:
        - lambda-vi-briefing-20251024-143022.md (priority: 1, modified: 2025-10-24T14:30:22Z)
    → Read lambda-vi-briefing-20251024-143022.md
    → Extract "## Executive Brief" section
    → RETURN "Successfully processed GitHub issue #456 and created comment with analysis..."

STEP 4: Build intelligence object
    → content: "Successfully processed GitHub issue #456..."
    → source: "workspace"
    → RETURN intelligence

OUTPUT:
{
    content: "Successfully processed GitHub issue #456 and created comment with analysis...",
    source: "workspace",
    agentId: "link-logger-agent",
    extractedAt: 1729776622000,
    metadata: {
        duration: 45,
        postsAsSelf: true,
        displayName: "Link Logger Agent",
        ticketId: 123,
        postId: 456
    }
}
```

### Example 2: Text-Based Agent (Message Extraction)

```
EXECUTION FLOW: Generic Analysis Agent

INPUT:
    agentId: "code-reviewer-agent"
    ticket: {id: 124, agentId: "code-reviewer-agent", postId: null}
    sdkResult: {
        messages: [
            {role: "user", content: "Review this code"},
            {role: "assistant", content: [
                {type: "text", text: "I've reviewed the code and found 3 issues..."},
                {type: "tool_use", name: "read_file", input: {...}}
            ]},
            {role: "assistant", content: "Summary: The code is well-structured but needs..."}
        ],
        status: "completed"
    }

STEP 1: readAgentFrontmatter("code-reviewer-agent")
    → Read /prod/.claude/agents/code-reviewer-agent.md
    → Parse frontmatter:
        posts_as_self: false
    → RETURN {postsAsSelf: false}

STEP 2: Check postsAsSelf
    → FALSE: Skip workspace extraction

STEP 3: extractFromTextMessages(sdkResult.messages)
    → Filter assistant messages: 2 messages found
    → Extract text blocks:
        - "I've reviewed the code and found 3 issues..."
        - "Summary: The code is well-structured but needs..."
    → Combine and clean
    → RETURN "I've reviewed the code and found 3 issues...\n\nSummary: The code is well-structured but needs..."

STEP 4: Build intelligence object
    → content: "I've reviewed the code and found 3 issues..."
    → source: "messages"
    → RETURN intelligence

OUTPUT:
{
    content: "I've reviewed the code and found 3 issues...\n\nSummary: The code is well-structured but needs...",
    source: "messages",
    agentId: "code-reviewer-agent",
    extractedAt: 1729776700000,
    metadata: {
        duration: 12,
        postsAsSelf: false,
        displayName: "code-reviewer-agent",
        ticketId: 124,
        postId: null
    }
}
```

### Example 3: Fallback Scenario

```
EXECUTION FLOW: Agent with No Extractable Content

INPUT:
    agentId: "test-agent"
    ticket: {id: 125, agentId: "test-agent"}
    sdkResult: {messages: [], status: "completed"}

STEP 1: readAgentFrontmatter("test-agent")
    → File not found
    → RETURN null

STEP 2: Check postsAsSelf
    → agentMetadata is null, assume false
    → Skip workspace extraction

STEP 3: extractFromTextMessages([])
    → No messages
    → RETURN ""

STEP 4: Use fallback
    → content: "No summary available - agent completed successfully"
    → source: "fallback"

OUTPUT:
{
    content: "No summary available - agent completed successfully",
    source: "fallback",
    agentId: "test-agent",
    extractedAt: 1729776800000,
    metadata: {
        duration: 5,
        postsAsSelf: false,
        displayName: "test-agent",
        ticketId: 125,
        postId: null
    }
}
```

---

## 6. Error Handling Strategy

### Error Categories and Recovery

```
ERROR HANDLING MATRIX:

1. File System Errors
   - File not found
     → Action: Log warning, try next strategy
     → Recovery: Continue to fallback

   - Permission denied
     → Action: Log error, skip workspace extraction
     → Recovery: Use message extraction

   - File too large
     → Action: Log warning, skip file
     → Recovery: Try next file or fallback

2. Parse Errors
   - Invalid YAML frontmatter
     → Action: Log error, use default metadata
     → Recovery: Continue with postsAsSelf = false

   - Malformed markdown
     → Action: Use raw content with truncation
     → Recovery: Extract what's readable

3. Content Errors
   - Empty content
     → Action: Try next strategy
     → Recovery: Use fallback message

   - Missing expected sections
     → Action: Use entire file content
     → Recovery: Truncate if too long

4. Timeout Errors
   - Extraction takes too long
     → Action: Abort current strategy
     → Recovery: Use faster fallback method
```

### Error Handling Pseudocode

```
ALGORITHM: safeExtractIntelligence
INPUT: sdkResult, ticket
OUTPUT: intelligence or error object

BEGIN
    TRY
        intelligence ← extractIntelligence(sdkResult, ticket)
        RETURN intelligence

    CATCH FileSystemError AS error
        LOG error("File system error during extraction", {
            agentId: ticket.agentId,
            error: error.message
        })
        // Attempt message-only extraction
        TRY
            textContent ← extractFromTextMessages(sdkResult.messages)
            RETURN buildFallbackIntelligence(ticket, textContent, "messages")
        CATCH ANY AS fallbackError
            RETURN buildFallbackIntelligence(ticket, DEFAULT_FALLBACK, "error")
        END TRY

    CATCH ParseError AS error
        LOG error("Parse error during extraction", {
            agentId: ticket.agentId,
            error: error.message
        })
        RETURN buildFallbackIntelligence(ticket, DEFAULT_FALLBACK, "error")

    CATCH TimeoutError AS error
        LOG error("Extraction timeout", {
            agentId: ticket.agentId,
            timeout: EXTRACTION_TIMEOUT
        })
        RETURN buildFallbackIntelligence(ticket, "Extraction timed out", "error")

    CATCH ANY AS error
        LOG error("Unexpected error during extraction", {
            agentId: ticket.agentId,
            error: error
        })
        RETURN buildFallbackIntelligence(ticket, DEFAULT_FALLBACK, "error")
    END TRY
END


SUBROUTINE: buildFallbackIntelligence
INPUT: ticket, content, source
OUTPUT: intelligence

BEGIN
    RETURN {
        content: content,
        source: source,
        agentId: ticket.agentId,
        extractedAt: getCurrentTime(),
        metadata: {
            duration: 0,
            postsAsSelf: false,
            displayName: ticket.agentId,
            ticketId: ticket.id,
            postId: ticket.postId OR null,
            error: true
        }
    }
END
```

---

## 7. Performance Considerations

### Optimization Strategies

```
PERFORMANCE OPTIMIZATIONS:

1. File System Operations
   - Cache agent frontmatter for repeated calls
   - Implement file size checks before reading
   - Use streaming for large files
   - Limit concurrent file operations

2. Content Processing
   - Early termination when content found
   - Lazy evaluation of strategies
   - Content truncation at read time
   - Avoid redundant parsing

3. Caching Strategy
   CACHE STRUCTURE:
       agentMetadataCache: Map<agentId, {metadata, timestamp}>
       TTL: 300 seconds (5 minutes)

   CACHE ALGORITHM:
   BEGIN
       cacheKey ← agentId
       cached ← agentMetadataCache.get(cacheKey)

       IF cached AND (getCurrentTime() - cached.timestamp) < TTL THEN
           RETURN cached.metadata
       END IF

       metadata ← readAgentFrontmatter(agentId)
       agentMetadataCache.set(cacheKey, {
           metadata: metadata,
           timestamp: getCurrentTime()
       })

       RETURN metadata
   END

4. Resource Limits
   - Maximum file size: 1MB
   - Maximum message count: 1000
   - Maximum content length: 5000 chars
   - Extraction timeout: 5 seconds
```

---

## 8. Testing Scenarios

### Test Cases

```
TEST SUITE: Content Extraction

TEST 1: Workspace File Extraction - Success
    GIVEN: Agent with posts_as_self: true
    AND: Valid briefing file exists
    WHEN: extractIntelligence is called
    THEN: Content extracted from workspace file
    AND: source = "workspace"

TEST 2: Workspace File Extraction - No Files
    GIVEN: Agent with posts_as_self: true
    AND: No workspace files exist
    WHEN: extractIntelligence is called
    THEN: Falls back to message extraction
    AND: source = "messages"

TEST 3: Message Extraction - Multiple Messages
    GIVEN: Agent with posts_as_self: false
    AND: Multiple assistant messages with text
    WHEN: extractIntelligence is called
    THEN: All text combined and returned
    AND: source = "messages"

TEST 4: Fallback - No Content Available
    GIVEN: Agent with no frontmatter
    AND: No messages available
    WHEN: extractIntelligence is called
    THEN: Default fallback message returned
    AND: source = "fallback"

TEST 5: Error Handling - File Read Error
    GIVEN: Agent with posts_as_self: true
    AND: File exists but cannot be read (permissions)
    WHEN: extractIntelligence is called
    THEN: Error logged
    AND: Falls back to message extraction

TEST 6: Content Truncation
    GIVEN: Very large workspace file (2MB)
    WHEN: extractContentFromFile is called
    THEN: File skipped due to size limit
    AND: Next file tried or fallback used

TEST 7: Executive Brief Extraction
    GIVEN: Briefing file with "## Executive Brief" section
    WHEN: extractExecutiveBrief is called
    THEN: Only executive brief section returned
    AND: Other sections excluded

TEST 8: Multiple File Priority
    GIVEN: Multiple candidate files in workspace
    WHEN: sortFilesByPriority is called
    THEN: Briefing files prioritized first
    AND: Most recent file selected within same priority
```

---

## 9. Implementation Notes

### Language-Agnostic Considerations

1. **File I/O**: Implementation must handle platform-specific path separators
2. **YAML Parsing**: Use standard library or well-tested parser
3. **Glob Patterns**: Ensure glob implementation supports `*` wildcards
4. **Timestamp Handling**: Use UTC timestamps for consistency
5. **Error Types**: Map to language-specific exception types

### Integration Points

```
INTEGRATION REQUIREMENTS:

1. Agent Worker Integration
   - Call extractIntelligence after SDK execution
   - Pass sdkResult and ticket objects
   - Use returned intelligence for comment creation

2. Database Integration
   - Store extraction metadata in tickets table
   - Log extraction source for analytics
   - Track extraction duration for performance monitoring

3. Logging Integration
   - Structured logging with context
   - Log levels: debug, info, warning, error
   - Include agentId, ticketId in all logs

4. Monitoring Integration
   - Track extraction success rate by source
   - Monitor extraction duration
   - Alert on repeated fallback usage
```

---

## 10. Summary

This pseudocode specification provides a complete algorithmic design for extracting agent output using a multi-strategy approach:

1. **Primary Strategy**: Workspace files for agents with `posts_as_self: true`
2. **Fallback Strategy**: Text message extraction from SDK output
3. **Safety Net**: Default fallback message

The design prioritizes:
- Flexibility (supports multiple content sources)
- Reliability (comprehensive error handling)
- Performance (early termination, caching, resource limits)
- Maintainability (modular subroutines, clear decision trees)

**Key Algorithms:**
- `readAgentFrontmatter`: O(n) time, O(n) space
- `extractFromWorkspaceFiles`: O(f*n) time, O(n) space
- `extractFromTextMessages`: O(m*c) time, O(m*c) space
- `extractIntelligence`: O(f*n + m*c) time, O(max(n, m*c)) space

**Implementation Readiness:**
This specification is ready for implementation in any language (JavaScript, TypeScript, Python, etc.) with standard file I/O, YAML parsing, and glob pattern libraries.
