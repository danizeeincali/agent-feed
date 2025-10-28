# SPARC Pseudocode Specification: Λvi System Identity

## Document Metadata
- **Phase**: Pseudocode (SPARC Methodology)
- **Component**: Λvi System Identity Implementation
- **Version**: 1.0.0
- **Date**: 2025-10-27
- **Token Budget**: System config < 500 tokens, Total < 2000 tokens

---

## 1. System Identity Configuration Structure

### DATA STRUCTURE: SystemIdentityConfig

```
STRUCTURE SystemIdentityConfig:
    agentId: string
    displayName: string
    description: string
    capabilities: Array<string>
    icon: string
    color: string
    type: string
    isSystemAgent: boolean
    tokenSize: integer
END STRUCTURE

CONSTANT AVI_SYSTEM_CONFIG: SystemIdentityConfig = {
    agentId: "avi",
    displayName: "Λvi (Amplifying Virtual Intelligence)",
    description: "System-level AI coordinator and orchestrator",
    capabilities: [
        "multi-agent-orchestration",
        "system-coordination",
        "lightweight-processing",
        "memory-management",
        "task-delegation"
    ],
    icon: "🤖",
    color: "#7C3AED",
    type: "system",
    isSystemAgent: true,
    tokenSize: 450
}

CONSTANT MAX_SYSTEM_TOKEN_SIZE = 500
CONSTANT CACHE_TTL_SECONDS = 300
```

---

## 2. Algorithm: readAgentFrontmatter()

### Purpose
Read agent metadata with special handling for system identity 'avi'

### Input
- `agentId` (string): Identifier of the agent to read

### Output
- `AgentFrontmatter` object or `SystemIdentityConfig` object
- `error` object if operation fails

### Complexity Analysis
- Time Complexity: O(1) for system agents, O(n) for file-based agents where n = file size
- Space Complexity: O(1) for system agents, O(m) for file agents where m = frontmatter size

### Pseudocode

```
ALGORITHM: readAgentFrontmatter
INPUT: agentId (string)
OUTPUT: frontmatter (object) or error

BEGIN
    // Step 1: Input validation
    IF agentId is null OR agentId is empty THEN
        RETURN error("Invalid agentId: cannot be null or empty")
    END IF

    // Step 2: Normalize agentId
    normalizedId ← Trim(ToLowerCase(agentId))

    // Step 3: Check cache first (performance optimization)
    cachedResult ← CheckCache("agent_frontmatter", normalizedId)
    IF cachedResult exists AND NOT IsExpired(cachedResult) THEN
        LogPerformance("Cache hit for agent: " + normalizedId)
        RETURN cachedResult.data
    END IF

    // Step 4: System identity check (CRITICAL DECISION POINT)
    IF normalizedId === "avi" THEN
        // Step 4a: Return lightweight system config
        systemConfig ← GetSystemIdentityConfig()

        // Step 4b: Validate token size
        tokenCount ← EstimateTokenCount(systemConfig)
        IF tokenCount > MAX_SYSTEM_TOKEN_SIZE THEN
            LogWarning("System config exceeds token budget: " + tokenCount)
        END IF

        // Step 4c: Cache the result
        CacheSet("agent_frontmatter", normalizedId, systemConfig, CACHE_TTL_SECONDS)

        // Step 4d: Log system access
        LogSystemAccess("avi", "readAgentFrontmatter", GetTimestamp())

        RETURN systemConfig
    END IF

    // Step 5: Regular agent processing (existing behavior)
    TRY
        // Step 5a: Construct file path
        agentFilePath ← BuildAgentFilePath(normalizedId)

        // Step 5b: Check file existence
        IF NOT FileExists(agentFilePath) THEN
            RETURN error("Agent file not found: " + agentFilePath)
        END IF

        // Step 5c: Read file content
        fileContent ← ReadFile(agentFilePath)

        // Step 5d: Parse frontmatter
        frontmatter ← ParseMarkdownFrontmatter(fileContent)

        // Step 5e: Validate frontmatter structure
        validationResult ← ValidateAgentFrontmatter(frontmatter)
        IF NOT validationResult.isValid THEN
            RETURN error("Invalid frontmatter: " + validationResult.errors)
        END IF

        // Step 5f: Enhance with metadata
        frontmatter.isSystemAgent ← false
        frontmatter.loadedFrom ← agentFilePath
        frontmatter.loadedAt ← GetTimestamp()

        // Step 5g: Cache the result
        CacheSet("agent_frontmatter", normalizedId, frontmatter, CACHE_TTL_SECONDS)

        RETURN frontmatter

    CATCH FileReadError AS e
        LogError("File read error for agent " + normalizedId + ": " + e.message)
        RETURN error("Failed to read agent file: " + e.message)

    CATCH ParseError AS e
        LogError("Parse error for agent " + normalizedId + ": " + e.message)
        RETURN error("Failed to parse frontmatter: " + e.message)

    CATCH UnexpectedError AS e
        LogError("Unexpected error for agent " + normalizedId + ": " + e.message)
        RETURN error("Unexpected error: " + e.message)
    END TRY
END

// Helper subroutines
SUBROUTINE: BuildAgentFilePath
INPUT: agentId (string)
OUTPUT: filePath (string)
BEGIN
    baseDir ← GetEnvironmentVariable("AGENTS_DIR") OR "/default/agents"
    RETURN baseDir + "/" + agentId + ".md"
END

SUBROUTINE: ParseMarkdownFrontmatter
INPUT: content (string)
OUTPUT: frontmatter (object)
BEGIN
    // Extract YAML frontmatter between --- delimiters
    pattern ← REGEX("^---\n(.*?)\n---", MULTILINE | DOTALL)
    match ← pattern.Match(content)

    IF match is null THEN
        RETURN error("No frontmatter found")
    END IF

    yamlContent ← match.groups[1]
    frontmatter ← ParseYAML(yamlContent)

    RETURN frontmatter
END
```

---

## 3. Algorithm: getSystemIdentityConfig()

### Purpose
Load and return system identity configuration with validation

### Input
None (loads from constants or configuration file)

### Output
- `SystemIdentityConfig` object

### Complexity Analysis
- Time Complexity: O(1) - constant time lookup
- Space Complexity: O(1) - fixed size structure

### Pseudocode

```
ALGORITHM: getSystemIdentityConfig
INPUT: none
OUTPUT: systemConfig (SystemIdentityConfig)

BEGIN
    // Step 1: Load base configuration (from CLAUDE.md or constants)
    baseConfig ← AVI_SYSTEM_CONFIG

    // Step 2: Check for environment overrides
    envOverrides ← LoadEnvironmentOverrides("AVI_SYSTEM_CONFIG")
    IF envOverrides exists THEN
        baseConfig ← MergeConfigs(baseConfig, envOverrides)
        LogInfo("Applied environment overrides to system config")
    END IF

    // Step 3: Validate configuration structure
    validationResult ← ValidateSystemIdentity(baseConfig)
    IF NOT validationResult.isValid THEN
        LogCritical("System identity config is invalid: " + validationResult.errors)
        THROW SystemConfigurationError("Invalid system identity configuration")
    END IF

    // Step 4: Apply runtime enhancements
    baseConfig.version ← GetSystemVersion()
    baseConfig.uptime ← GetSystemUptime()
    baseConfig.lastAccessed ← GetTimestamp()

    // Step 5: Token size validation
    tokenCount ← EstimateTokenCount(baseConfig)
    IF tokenCount > MAX_SYSTEM_TOKEN_SIZE THEN
        LogWarning("System config exceeds token budget: " + tokenCount + "/" + MAX_SYSTEM_TOKEN_SIZE)

        // Step 5a: Apply token optimization
        baseConfig ← OptimizeSystemConfig(baseConfig, MAX_SYSTEM_TOKEN_SIZE)

        // Step 5b: Re-validate after optimization
        newTokenCount ← EstimateTokenCount(baseConfig)
        LogInfo("Config optimized: " + tokenCount + " → " + newTokenCount + " tokens")
    END IF

    // Step 6: Mark as immutable (prevent runtime modification)
    FreezeObject(baseConfig)

    RETURN baseConfig
END

SUBROUTINE: LoadEnvironmentOverrides
INPUT: configKey (string)
OUTPUT: overrides (object) or null
BEGIN
    envValue ← GetEnvironmentVariable(configKey)

    IF envValue is null OR envValue is empty THEN
        RETURN null
    END IF

    TRY
        overrides ← ParseJSON(envValue)
        RETURN overrides
    CATCH ParseError
        LogWarning("Failed to parse environment override: " + configKey)
        RETURN null
    END TRY
END

SUBROUTINE: MergeConfigs
INPUT: baseConfig (object), overrides (object)
OUTPUT: mergedConfig (object)
BEGIN
    mergedConfig ← DeepClone(baseConfig)

    FOR EACH key IN overrides.keys DO
        IF key IN mergedConfig THEN
            IF TypeOf(overrides[key]) === TypeOf(mergedConfig[key]) THEN
                mergedConfig[key] ← overrides[key]
            ELSE
                LogWarning("Type mismatch for override key: " + key)
            END IF
        END IF
    END FOR

    RETURN mergedConfig
END
```

---

## 4. Algorithm: validateSystemIdentity()

### Purpose
Ensure system identity configuration meets all requirements

### Input
- `config` (SystemIdentityConfig): Configuration to validate

### Output
- `ValidationResult` object with isValid boolean and errors array

### Complexity Analysis
- Time Complexity: O(n) where n = number of validation rules
- Space Complexity: O(m) where m = number of errors found

### Pseudocode

```
ALGORITHM: validateSystemIdentity
INPUT: config (SystemIdentityConfig)
OUTPUT: validationResult (ValidationResult)

STRUCTURE ValidationResult:
    isValid: boolean
    errors: Array<string>
    warnings: Array<string>
END STRUCTURE

BEGIN
    errors ← EmptyArray()
    warnings ← EmptyArray()

    // Step 1: Required field validation
    requiredFields ← ["agentId", "displayName", "description", "capabilities", "type", "isSystemAgent"]

    FOR EACH field IN requiredFields DO
        IF field NOT IN config OR config[field] is null THEN
            errors.append("Missing required field: " + field)
        END IF
    END FOR

    // Step 2: agentId validation
    IF config.agentId exists THEN
        IF config.agentId !== "avi" THEN
            errors.append("System identity must have agentId 'avi', got: " + config.agentId)
        END IF

        IF Length(config.agentId) < 2 OR Length(config.agentId) > 50 THEN
            errors.append("agentId length must be between 2 and 50 characters")
        END IF

        IF NOT IsAlphanumeric(config.agentId) THEN
            errors.append("agentId must contain only alphanumeric characters")
        END IF
    END IF

    // Step 3: displayName validation
    IF config.displayName exists THEN
        IF NOT Contains(config.displayName, "Λvi") THEN
            warnings.append("displayName should contain 'Λvi' for consistency")
        END IF

        IF Length(config.displayName) > 100 THEN
            errors.append("displayName too long (max 100 characters)")
        END IF
    END IF

    // Step 4: description validation
    IF config.description exists THEN
        descLength ← Length(config.description)

        IF descLength < 10 THEN
            errors.append("description too short (min 10 characters)")
        END IF

        IF descLength > 500 THEN
            warnings.append("description is long and may impact token count")
        END IF
    END IF

    // Step 5: capabilities validation
    IF config.capabilities exists THEN
        IF NOT IsArray(config.capabilities) THEN
            errors.append("capabilities must be an array")
        ELSE
            IF Length(config.capabilities) === 0 THEN
                warnings.append("capabilities array is empty")
            END IF

            FOR EACH capability IN config.capabilities DO
                IF NOT IsString(capability) THEN
                    errors.append("capability must be a string: " + capability)
                END IF

                IF Length(capability) > 100 THEN
                    errors.append("capability string too long: " + capability)
                END IF
            END FOR
        END IF
    END IF

    // Step 6: type validation
    validTypes ← ["system", "user", "agent"]
    IF config.type exists THEN
        IF config.type NOT IN validTypes THEN
            errors.append("Invalid type: " + config.type + ". Must be one of: " + Join(validTypes, ", "))
        END IF

        IF config.type !== "system" THEN
            errors.append("System identity must have type 'system', got: " + config.type)
        END IF
    END IF

    // Step 7: isSystemAgent validation
    IF config.isSystemAgent exists THEN
        IF NOT IsBoolean(config.isSystemAgent) THEN
            errors.append("isSystemAgent must be a boolean")
        END IF

        IF config.isSystemAgent !== true THEN
            errors.append("System identity must have isSystemAgent set to true")
        END IF
    END IF

    // Step 8: Token size validation
    IF config.tokenSize exists THEN
        IF NOT IsInteger(config.tokenSize) OR config.tokenSize < 0 THEN
            errors.append("tokenSize must be a positive integer")
        END IF

        IF config.tokenSize > MAX_SYSTEM_TOKEN_SIZE THEN
            warnings.append("tokenSize exceeds budget: " + config.tokenSize + "/" + MAX_SYSTEM_TOKEN_SIZE)
        END IF
    END IF

    // Step 9: Color validation (optional)
    IF config.color exists THEN
        IF NOT IsValidHexColor(config.color) THEN
            warnings.append("Invalid color format: " + config.color)
        END IF
    END IF

    // Step 10: Icon validation (optional)
    IF config.icon exists THEN
        IF Length(config.icon) > 10 THEN
            warnings.append("Icon string seems too long: " + config.icon)
        END IF
    END IF

    // Step 11: Build result
    isValid ← (Length(errors) === 0)

    RETURN {
        isValid: isValid,
        errors: errors,
        warnings: warnings,
        validatedAt: GetTimestamp()
    }
END

SUBROUTINE: IsAlphanumeric
INPUT: str (string)
OUTPUT: result (boolean)
BEGIN
    pattern ← REGEX("^[a-zA-Z0-9]+$")
    RETURN pattern.Matches(str)
END

SUBROUTINE: IsValidHexColor
INPUT: color (string)
OUTPUT: result (boolean)
BEGIN
    pattern ← REGEX("^#[0-9A-Fa-f]{6}$")
    RETURN pattern.Matches(color)
END
```

---

## 5. Algorithm: processURL()

### Purpose
Process URLs with lightweight handling for system identity

### Input
- `url` (string): URL to process
- `agentId` (string): Agent identifier for context

### Output
- `ProcessedURL` object with metadata

### Complexity Analysis
- Time Complexity: O(1) for system agents, O(n) for regular processing
- Space Complexity: O(1) for system agents, O(k) for URL metadata

### Pseudocode

```
ALGORITHM: processURL
INPUT: url (string), agentId (string)
OUTPUT: processedURL (object) or error

STRUCTURE ProcessedURL:
    originalURL: string
    normalizedURL: string
    protocol: string
    domain: string
    path: string
    isSystemProcessing: boolean
    processingTime: integer
    agentId: string
END STRUCTURE

BEGIN
    // Step 1: Input validation
    IF url is null OR url is empty THEN
        RETURN error("Invalid URL: cannot be null or empty")
    END IF

    IF agentId is null OR agentId is empty THEN
        RETURN error("Invalid agentId: cannot be null or empty")
    END IF

    startTime ← GetTimestamp()
    normalizedAgentId ← Trim(ToLowerCase(agentId))

    // Step 2: System identity lightweight processing (CRITICAL DECISION POINT)
    IF normalizedAgentId === "avi" THEN
        // Step 2a: Lightweight URL validation only
        IF NOT IsValidURLFormat(url) THEN
            RETURN error("Invalid URL format: " + url)
        END IF

        // Step 2b: Extract basic components (no deep processing)
        urlComponents ← ParseURLComponents(url)

        // Step 2c: Build lightweight response
        processedURL ← {
            originalURL: url,
            normalizedURL: NormalizeURL(url),
            protocol: urlComponents.protocol,
            domain: urlComponents.domain,
            path: urlComponents.path,
            isSystemProcessing: true,
            processingTime: GetTimestamp() - startTime,
            agentId: "avi",
            tokenOptimized: true
        }

        // Step 2d: Log lightweight processing
        LogSystemAccess("avi", "processURL_lightweight", url)

        RETURN processedURL
    END IF

    // Step 3: Regular agent processing (full processing)
    TRY
        // Step 3a: Validate URL format
        IF NOT IsValidURLFormat(url) THEN
            RETURN error("Invalid URL format: " + url)
        END IF

        // Step 3b: Parse URL components
        urlComponents ← ParseURLComponents(url)

        // Step 3c: Fetch metadata (if applicable)
        metadata ← FetchURLMetadata(url)

        // Step 3d: Analyze content type
        contentType ← DetectContentType(url)

        // Step 3e: Security validation
        securityCheck ← ValidateURLSecurity(url)
        IF NOT securityCheck.isSecure THEN
            LogWarning("URL security concern: " + securityCheck.reason)
        END IF

        // Step 3f: Build full response
        processedURL ← {
            originalURL: url,
            normalizedURL: NormalizeURL(url),
            protocol: urlComponents.protocol,
            domain: urlComponents.domain,
            path: urlComponents.path,
            queryParams: urlComponents.queryParams,
            metadata: metadata,
            contentType: contentType,
            securityCheck: securityCheck,
            isSystemProcessing: false,
            processingTime: GetTimestamp() - startTime,
            agentId: normalizedAgentId
        }

        RETURN processedURL

    CATCH NetworkError AS e
        LogError("Network error processing URL: " + e.message)
        RETURN error("Failed to process URL: " + e.message)

    CATCH ValidationError AS e
        LogError("Validation error for URL: " + e.message)
        RETURN error("Invalid URL: " + e.message)

    CATCH UnexpectedError AS e
        LogError("Unexpected error processing URL: " + e.message)
        RETURN error("Unexpected error: " + e.message)
    END TRY
END

SUBROUTINE: IsValidURLFormat
INPUT: url (string)
OUTPUT: result (boolean)
BEGIN
    // RFC 3986 URL validation pattern
    pattern ← REGEX("^(https?):\/\/([\w\-\.]+)(:\d+)?(\/[^\s]*)?$")
    RETURN pattern.Matches(url)
END

SUBROUTINE: ParseURLComponents
INPUT: url (string)
OUTPUT: components (object)
BEGIN
    // Use native URL parser or manual parsing
    urlObject ← URLParse(url)

    RETURN {
        protocol: urlObject.protocol,
        domain: urlObject.hostname,
        port: urlObject.port,
        path: urlObject.pathname,
        queryParams: urlObject.searchParams,
        hash: urlObject.hash
    }
END

SUBROUTINE: NormalizeURL
INPUT: url (string)
OUTPUT: normalizedURL (string)
BEGIN
    // Remove trailing slashes, lowercase domain, sort query params
    normalized ← Trim(url)
    normalized ← RemoveTrailingSlash(normalized)
    normalized ← LowercaseDomain(normalized)
    normalized ← SortQueryParameters(normalized)

    RETURN normalized
END
```

---

## 6. Algorithm: invokeAgent()

### Purpose
Invoke agent with special handling for system identity

### Input
- `agentId` (string): Agent to invoke
- `task` (string): Task description
- `options` (object): Additional options

### Output
- `InvocationResult` object

### Complexity Analysis
- Time Complexity: O(1) for system delegation, O(n) for regular invocation
- Space Complexity: O(1) for system agents, O(k) for task context

### Pseudocode

```
ALGORITHM: invokeAgent
INPUT: agentId (string), task (string), options (object)
OUTPUT: invocationResult (InvocationResult)

STRUCTURE InvocationResult:
    success: boolean
    agentId: string
    taskId: string
    result: any
    executionTime: integer
    isSystemInvocation: boolean
    delegatedTo: Array<string>
END STRUCTURE

BEGIN
    // Step 1: Input validation
    IF agentId is null OR agentId is empty THEN
        RETURN error("Invalid agentId: cannot be null or empty")
    END IF

    IF task is null OR task is empty THEN
        RETURN error("Invalid task: cannot be null or empty")
    END IF

    startTime ← GetTimestamp()
    normalizedAgentId ← Trim(ToLowerCase(agentId))
    taskId ← GenerateTaskId()

    // Step 2: Load agent configuration
    agentConfig ← readAgentFrontmatter(normalizedAgentId)
    IF agentConfig is error THEN
        RETURN error("Failed to load agent: " + agentConfig.message)
    END IF

    // Step 3: System identity delegation (CRITICAL DECISION POINT)
    IF normalizedAgentId === "avi" THEN
        // Step 3a: System agent delegates to specialized agents
        LogSystemAccess("avi", "invokeAgent_delegate", task)

        // Step 3b: Analyze task to determine delegation strategy
        taskAnalysis ← AnalyzeTask(task)
        requiredAgents ← DetermineRequiredAgents(taskAnalysis)

        // Step 3c: Create delegation plan
        delegationPlan ← {
            taskId: taskId,
            originalTask: task,
            subTasks: [],
            targetAgents: requiredAgents,
            coordinationStrategy: "parallel"
        }

        // Step 3d: Break down task into sub-tasks
        FOR EACH agent IN requiredAgents DO
            subTask ← CreateSubTask(task, agent, taskAnalysis)
            delegationPlan.subTasks.append(subTask)
        END FOR

        // Step 3e: Execute delegation (lightweight coordination)
        delegationResult ← ExecuteDelegation(delegationPlan)

        // Step 3f: Build system invocation result
        RETURN {
            success: true,
            agentId: "avi",
            taskId: taskId,
            result: delegationResult,
            executionTime: GetTimestamp() - startTime,
            isSystemInvocation: true,
            delegatedTo: requiredAgents,
            coordinationStrategy: "system-delegation"
        }
    END IF

    // Step 4: Regular agent invocation
    TRY
        // Step 4a: Validate agent capabilities
        IF NOT CanHandleTask(agentConfig, task) THEN
            LogWarning("Agent may not have required capabilities: " + agentId)
        END IF

        // Step 4b: Prepare execution context
        executionContext ← {
            agentId: normalizedAgentId,
            agentConfig: agentConfig,
            task: task,
            taskId: taskId,
            options: options,
            startTime: startTime,
            environment: GetExecutionEnvironment()
        }

        // Step 4c: Execute agent task
        result ← ExecuteAgentTask(executionContext)

        // Step 4d: Validate result
        IF result is null THEN
            RETURN error("Agent execution returned no result")
        END IF

        // Step 4e: Build invocation result
        RETURN {
            success: true,
            agentId: normalizedAgentId,
            taskId: taskId,
            result: result,
            executionTime: GetTimestamp() - startTime,
            isSystemInvocation: false,
            delegatedTo: []
        }

    CATCH ExecutionError AS e
        LogError("Agent execution failed: " + e.message)
        RETURN {
            success: false,
            agentId: normalizedAgentId,
            taskId: taskId,
            error: e.message,
            executionTime: GetTimestamp() - startTime,
            isSystemInvocation: false
        }

    CATCH UnexpectedError AS e
        LogCritical("Unexpected error during invocation: " + e.message)
        RETURN {
            success: false,
            agentId: normalizedAgentId,
            taskId: taskId,
            error: "Unexpected error: " + e.message,
            executionTime: GetTimestamp() - startTime,
            isSystemInvocation: false
        }
    END TRY
END

SUBROUTINE: AnalyzeTask
INPUT: task (string)
OUTPUT: analysis (object)
BEGIN
    // Natural language processing to determine task type
    keywords ← ExtractKeywords(task)
    taskType ← ClassifyTaskType(keywords)
    complexity ← EstimateComplexity(task)
    requiredCapabilities ← InferRequiredCapabilities(keywords, taskType)

    RETURN {
        taskType: taskType,
        complexity: complexity,
        keywords: keywords,
        requiredCapabilities: requiredCapabilities
    }
END

SUBROUTINE: DetermineRequiredAgents
INPUT: taskAnalysis (object)
OUTPUT: agents (Array<string>)
BEGIN
    agents ← EmptyArray()

    // Map capabilities to agent types
    FOR EACH capability IN taskAnalysis.requiredCapabilities DO
        matchingAgents ← FindAgentsByCapability(capability)
        agents ← Union(agents, matchingAgents)
    END FOR

    // Ensure at least one agent
    IF Length(agents) === 0 THEN
        agents.append("coder")  // Default fallback agent
    END IF

    RETURN agents
END

SUBROUTINE: CreateSubTask
INPUT: mainTask (string), targetAgent (string), analysis (object)
OUTPUT: subTask (object)
BEGIN
    // Extract relevant portion of task for specific agent
    agentCapabilities ← GetAgentCapabilities(targetAgent)
    relevantKeywords ← Filter(analysis.keywords, agentCapabilities)

    subTaskDescription ← GenerateSubTaskDescription(mainTask, relevantKeywords)

    RETURN {
        id: GenerateTaskId(),
        description: subTaskDescription,
        targetAgent: targetAgent,
        parentTaskId: analysis.taskId,
        priority: CalculateSubTaskPriority(analysis.complexity),
        estimatedTime: EstimateExecutionTime(subTaskDescription, targetAgent)
    }
END

SUBROUTINE: ExecuteDelegation
INPUT: delegationPlan (object)
OUTPUT: result (object)
BEGIN
    results ← EmptyArray()

    // Execute sub-tasks in parallel or sequential based on strategy
    IF delegationPlan.coordinationStrategy === "parallel" THEN
        results ← ExecuteParallel(delegationPlan.subTasks)
    ELSE
        results ← ExecuteSequential(delegationPlan.subTasks)
    END IF

    // Aggregate results
    aggregatedResult ← AggregateResults(results)

    RETURN {
        taskId: delegationPlan.taskId,
        subTaskResults: results,
        aggregatedResult: aggregatedResult,
        completedAt: GetTimestamp()
    }
END
```

---

## 7. Token Optimization Strategies

### ALGORITHM: OptimizeSystemConfig

```
ALGORITHM: OptimizeSystemConfig
INPUT: config (SystemIdentityConfig), maxTokens (integer)
OUTPUT: optimizedConfig (SystemIdentityConfig)

BEGIN
    currentTokens ← EstimateTokenCount(config)

    IF currentTokens <= maxTokens THEN
        RETURN config  // Already within budget
    END IF

    optimizedConfig ← DeepClone(config)

    // Step 1: Truncate description (lowest priority)
    IF currentTokens > maxTokens THEN
        originalDesc ← optimizedConfig.description
        optimizedConfig.description ← TruncateToTokenLimit(originalDesc, 200)
        currentTokens ← EstimateTokenCount(optimizedConfig)
    END IF

    // Step 2: Reduce capabilities list (medium priority)
    IF currentTokens > maxTokens THEN
        topCapabilities ← GetTopPriorityCapabilities(optimizedConfig.capabilities, 5)
        optimizedConfig.capabilities ← topCapabilities
        currentTokens ← EstimateTokenCount(optimizedConfig)
    END IF

    // Step 3: Shorten displayName (if desperate)
    IF currentTokens > maxTokens THEN
        optimizedConfig.displayName ← "Λvi System"
        currentTokens ← EstimateTokenCount(optimizedConfig)
    END IF

    // Step 4: Remove optional fields
    IF currentTokens > maxTokens THEN
        DELETE optimizedConfig.icon
        DELETE optimizedConfig.color
        currentTokens ← EstimateTokenCount(optimizedConfig)
    END IF

    // Final check
    IF currentTokens > maxTokens THEN
        LogCritical("Unable to optimize config below token limit")
    END IF

    RETURN optimizedConfig
END

SUBROUTINE: EstimateTokenCount
INPUT: data (object)
OUTPUT: tokenCount (integer)
BEGIN
    jsonString ← JSONStringify(data)

    // Rough estimation: 1 token ≈ 4 characters for JSON
    charCount ← Length(jsonString)
    estimatedTokens ← Ceiling(charCount / 4)

    RETURN estimatedTokens
END

SUBROUTINE: TruncateToTokenLimit
INPUT: text (string), maxTokens (integer)
OUTPUT: truncated (string)
BEGIN
    maxChars ← maxTokens * 4  // Approximate character limit

    IF Length(text) <= maxChars THEN
        RETURN text
    END IF

    truncated ← Substring(text, 0, maxChars - 3) + "..."
    RETURN truncated
END
```

---

## 8. Error Handling Patterns

### Standard Error Structure

```
STRUCTURE AgentError:
    code: string
    message: string
    agentId: string
    timestamp: integer
    context: object
    recoverable: boolean
END STRUCTURE

ERROR_CODES = {
    "AGENT_NOT_FOUND": "AGT001",
    "INVALID_AGENT_ID": "AGT002",
    "SYSTEM_CONFIG_ERROR": "SYS001",
    "TOKEN_LIMIT_EXCEEDED": "TKN001",
    "VALIDATION_FAILED": "VAL001",
    "FILE_READ_ERROR": "FILE001",
    "PARSE_ERROR": "PRS001",
    "EXECUTION_ERROR": "EXE001"
}
```

### Error Handling Subroutine

```
SUBROUTINE: HandleAgentError
INPUT: error (object), context (object)
OUTPUT: formattedError (AgentError)

BEGIN
    errorCode ← DetermineErrorCode(error)

    formattedError ← {
        code: errorCode,
        message: error.message,
        agentId: context.agentId OR "unknown",
        timestamp: GetTimestamp(),
        context: context,
        recoverable: IsRecoverableError(errorCode),
        stackTrace: error.stack
    }

    // Log based on severity
    IF formattedError.recoverable THEN
        LogWarning("Recoverable error: " + formattedError.code)
    ELSE
        LogError("Critical error: " + formattedError.code)
    END IF

    // Attempt recovery if possible
    IF formattedError.recoverable THEN
        TRY
            RecoverFromError(formattedError)
        CATCH RecoveryError
            LogError("Recovery failed: " + RecoveryError.message)
        END TRY
    END IF

    RETURN formattedError
END
```

---

## 9. Test Data Structures

### Test Case: System Identity Load

```
TEST_CASE: SystemIdentityLoadTest
GIVEN: agentId = "avi"
WHEN: readAgentFrontmatter("avi") is called
THEN:
    - Result should be SystemIdentityConfig
    - Result.agentId should equal "avi"
    - Result.displayName should contain "Λvi"
    - Result.isSystemAgent should be true
    - Result.type should be "system"
    - EstimateTokenCount(Result) should be < 500
    - Execution time should be < 10ms
END TEST_CASE
```

### Test Case: Regular Agent Load

```
TEST_CASE: RegularAgentLoadTest
GIVEN: agentId = "researcher"
WHEN: readAgentFrontmatter("researcher") is called
THEN:
    - Result should be AgentFrontmatter
    - Result.agentId should equal "researcher"
    - Result.isSystemAgent should be false
    - Result.loadedFrom should be a valid file path
    - File should exist at Result.loadedFrom
    - Execution time should be < 100ms
END TEST_CASE
```

### Test Case: Invalid Agent ID

```
TEST_CASE: InvalidAgentIdTest
GIVEN: agentId = ""
WHEN: readAgentFrontmatter("") is called
THEN:
    - Result should be an error
    - Error.message should contain "Invalid agentId"
    - Error.code should be "AGT002"
END TEST_CASE
```

### Test Case: Token Optimization

```
TEST_CASE: TokenOptimizationTest
GIVEN:
    config = SystemIdentityConfig with large description (800 tokens)
    maxTokens = 500
WHEN: OptimizeSystemConfig(config, maxTokens) is called
THEN:
    - Result.tokenSize should be <= 500
    - Result.agentId should still equal "avi"
    - Result.displayName should still contain "Λvi"
    - Required fields should not be removed
    - Execution time should be < 50ms
END TEST_CASE
```

### Test Case: System URL Processing

```
TEST_CASE: SystemURLProcessingTest
GIVEN:
    url = "https://example.com/api/data"
    agentId = "avi"
WHEN: processURL(url, agentId) is called
THEN:
    - Result.isSystemProcessing should be true
    - Result.tokenOptimized should be true
    - Result should not contain heavy metadata
    - Result.processingTime should be < 20ms
    - Result.agentId should equal "avi"
END TEST_CASE
```

### Test Case: System Agent Delegation

```
TEST_CASE: SystemAgentDelegationTest
GIVEN:
    agentId = "avi"
    task = "Build a REST API with authentication"
WHEN: invokeAgent(agentId, task, {}) is called
THEN:
    - Result.isSystemInvocation should be true
    - Result.delegatedTo should contain ["backend-dev", "coder"]
    - Result.coordinationStrategy should be "system-delegation"
    - SubTasks should be created for each delegated agent
    - Execution should be parallel
END TEST_CASE
```

---

## 10. Performance Benchmarks

### Expected Performance Metrics

```
BENCHMARK: SystemIdentityPerformance

Operation: readAgentFrontmatter("avi")
Expected: < 10ms (cache miss), < 1ms (cache hit)
Token Size: < 500 tokens
Memory: < 1MB

Operation: readAgentFrontmatter("researcher")
Expected: < 100ms (cache miss), < 5ms (cache hit)
Token Size: Variable based on agent
Memory: < 5MB

Operation: getSystemIdentityConfig()
Expected: < 5ms
Token Size: < 500 tokens
Memory: < 1MB

Operation: validateSystemIdentity(config)
Expected: < 20ms
Token Size: N/A
Memory: < 1MB

Operation: processURL(url, "avi")
Expected: < 20ms
Token Size: < 200 tokens
Memory: < 1MB

Operation: invokeAgent("avi", task, {})
Expected: < 50ms (coordination only)
Token Size: < 300 tokens
Memory: < 2MB
```

---

## 11. Integration Points

### File System Integration

```
INTEGRATION: FileSystemAdapter

Interface: IFileSystemAdapter
Methods:
    - ReadFile(path: string): Promise<string>
    - FileExists(path: string): boolean
    - WriteFile(path: string, content: string): Promise<void>

System Identity Behavior:
    - ReadFile: NOT called for "avi" (returns config from memory)
    - FileExists: Returns true for "avi" (virtual file)
    - WriteFile: Throws error for "avi" (immutable system config)
```

### Cache Integration

```
INTEGRATION: CacheAdapter

Interface: ICacheAdapter
Methods:
    - Get(key: string): Promise<any>
    - Set(key: string, value: any, ttl: number): Promise<void>
    - Delete(key: string): Promise<void>
    - Clear(): Promise<void>

System Identity Behavior:
    - Cache key format: "agent_frontmatter:avi"
    - TTL: 300 seconds (5 minutes)
    - Invalidation: Manual or on config change
```

### Logging Integration

```
INTEGRATION: LoggingAdapter

Interface: ILoggingAdapter
Methods:
    - LogInfo(message: string, context: object): void
    - LogWarning(message: string, context: object): void
    - LogError(message: string, context: object): void
    - LogCritical(message: string, context: object): void
    - LogSystemAccess(agentId: string, operation: string, data: any): void

System Identity Behavior:
    - All "avi" operations logged with LogSystemAccess
    - Token budget warnings logged with LogWarning
    - Validation failures logged with LogError
```

---

## 12. Backward Compatibility

### Compatibility Matrix

```
COMPATIBILITY: BackwardCompatibility

Existing Behavior: readAgentFrontmatter(agentId)
    - For non-"avi" agents: NO CHANGE
    - Returns: AgentFrontmatter from file
    - Performance: NO IMPACT
    - API: UNCHANGED

New Behavior: readAgentFrontmatter("avi")
    - Returns: SystemIdentityConfig from memory
    - Performance: IMPROVED (no file I/O)
    - API: COMPATIBLE (same interface)

Migration Required: NONE
Breaking Changes: NONE

Fallback Strategy:
    IF system config fails to load THEN
        Load from default agent file (avi.md) if exists
        OR return minimal fallback config
    END IF
```

---

## 13. Complexity Summary

### Overall Algorithm Complexities

| Algorithm | Time Complexity | Space Complexity | Token Cost |
|-----------|----------------|------------------|------------|
| readAgentFrontmatter("avi") | O(1) | O(1) | < 500 |
| readAgentFrontmatter(other) | O(n) | O(m) | Variable |
| getSystemIdentityConfig() | O(1) | O(1) | < 500 |
| validateSystemIdentity() | O(k) | O(e) | N/A |
| processURL("avi", url) | O(1) | O(1) | < 200 |
| processURL(other, url) | O(n) | O(k) | Variable |
| invokeAgent("avi", task) | O(1) | O(1) | < 300 |
| invokeAgent(other, task) | O(n) | O(k) | Variable |

**Legend:**
- n = file size or processing complexity
- m = frontmatter size
- k = number of validation rules
- e = number of errors
- k = URL metadata size

---

## 14. Implementation Checklist

### Phase 1: Core System Identity
- [ ] Implement SystemIdentityConfig structure
- [ ] Create AVI_SYSTEM_CONFIG constant
- [ ] Implement getSystemIdentityConfig()
- [ ] Add token counting utility
- [ ] Implement token optimization
- [ ] Add unit tests for system config

### Phase 2: Agent Loading
- [ ] Modify readAgentFrontmatter() with system identity check
- [ ] Add cache integration
- [ ] Implement fallback mechanisms
- [ ] Add error handling
- [ ] Test cache hit/miss scenarios
- [ ] Performance benchmarking

### Phase 3: Validation
- [ ] Implement validateSystemIdentity()
- [ ] Add all validation rules
- [ ] Test edge cases
- [ ] Document validation errors
- [ ] Create validation test suite

### Phase 4: URL Processing
- [ ] Implement processURL() with lightweight path
- [ ] Add URL parsing utilities
- [ ] Implement security validation
- [ ] Test system vs regular processing
- [ ] Performance optimization

### Phase 5: Agent Invocation
- [ ] Implement invokeAgent() with delegation
- [ ] Add task analysis utilities
- [ ] Implement delegation execution
- [ ] Test parallel coordination
- [ ] Integration testing

### Phase 6: Integration & Testing
- [ ] Integration with existing codebase
- [ ] End-to-end testing
- [ ] Performance benchmarking
- [ ] Documentation updates
- [ ] Code review and refinement

---

## 15. Future Enhancements

### Potential Optimizations
1. Implement persistent cache for system config
2. Add distributed system identity for multi-instance deployments
3. Dynamic capability discovery based on task patterns
4. Machine learning for optimal agent delegation
5. Real-time performance monitoring and auto-optimization

### Extensibility Points
1. Plugin system for custom system identities
2. External configuration sources (database, API)
3. Multi-language support for system descriptions
4. Custom validation rules via configuration
5. Webhook integration for system events

---

**End of Pseudocode Specification**

This document provides complete algorithmic logic for implementing Λvi system identity. All algorithms are language-agnostic and ready for implementation in any programming language.

**Token Budget Compliance**: System identity operations consistently stay under 500-token target, ensuring optimal performance and resource utilization.
