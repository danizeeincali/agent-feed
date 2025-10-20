# SPARC Pseudocode: Agent Tier Classification Algorithm

**Date**: October 19, 2025
**Methodology**: SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)
**Phase**: PSEUDOCODE
**Version**: 1.0.0
**Status**: Ready for Architecture Phase
**Specification**: [SPARC-AGENT-TIER-SYSTEM-SPEC.md](/workspaces/agent-feed/docs/SPARC-AGENT-TIER-SYSTEM-SPEC.md)

---

## Table of Contents

1. [Algorithm Overview](#1-algorithm-overview)
2. [Data Structures](#2-data-structures)
3. [Frontmatter Parser](#3-frontmatter-parser)
4. [Tier Classification Logic](#4-tier-classification-logic)
5. [Default Value Assignment](#5-default-value-assignment)
6. [Validation Logic](#6-validation-logic)
7. [Icon Loading Strategy](#7-icon-loading-strategy)
8. [Error Handling](#8-error-handling)
9. [Test Cases](#9-test-cases)
10. [Complexity Analysis](#10-complexity-analysis)

---

## 1. Algorithm Overview

### 1.1 High-Level Flow

```
ALGORITHM: AgentTierSystem
INPUT: agentDirectory (string path)
OUTPUT: agents (array of Agent objects)

BEGIN
    // Phase 1: Discovery
    agentFiles ← DiscoverAgentFiles(agentDirectory)

    // Phase 2: Processing
    agents ← []
    FOR EACH filePath IN agentFiles DO
        agent ← ProcessAgentFile(filePath)
        IF agent is valid THEN
            agents.append(agent)
        END IF
    END FOR

    // Phase 3: Statistics
    stats ← CalculateStatistics(agents)

    RETURN {
        agents: agents,
        stats: stats
    }
END
```

### 1.2 Component Interaction

```
┌─────────────────┐
│ Agent Files     │
│ (Markdown)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Frontmatter     │◄─── YAML Parser
│ Parser          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Tier            │◄─── Classification Rules
│ Classifier      │◄─── T1/T2 Agent Lists
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Default Value   │◄─── Default Mappings
│ Assigner        │◄─── Emoji Maps
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validator       │◄─── Schema Rules
│                 │◄─── Constraint Checks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agent Object    │
│ (Complete)      │
└─────────────────┘
```

---

## 2. Data Structures

### 2.1 TypeScript Interfaces

```typescript
/**
 * Agent Tier Enumeration
 */
ENUM AgentTier:
    USER_FACING = 1
    SYSTEM = 2
END ENUM

/**
 * Agent Visibility Enumeration
 */
ENUM AgentVisibility:
    PUBLIC = "public"
    PROTECTED = "protected"
END ENUM

/**
 * Icon Type Enumeration
 */
ENUM IconType:
    SVG = "svg"
    EMOJI = "emoji"
END ENUM

/**
 * Agent Status Enumeration
 */
ENUM AgentStatus:
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
END ENUM

/**
 * Complete Agent Structure
 */
STRUCTURE Agent:
    // Core fields (existing)
    id: string
    slug: string
    name: string
    description: string
    tools: array of strings
    color: string
    avatar_url: optional string
    status: AgentStatus
    model: "haiku" | "sonnet" | "opus"
    proactive: boolean
    priority: string  // P0-P7
    usage: string
    content: string
    hash: string
    filePath: string
    lastModified: timestamp

    // Tier system fields (new)
    tier: AgentTier  // REQUIRED
    visibility: AgentVisibility  // REQUIRED
    icon: optional string
    icon_type: optional IconType
    icon_emoji: optional string
    posts_as_self: boolean  // REQUIRED
    show_in_default_feed: boolean  // REQUIRED
END STRUCTURE

/**
 * Frontmatter Data Structure
 */
STRUCTURE Frontmatter:
    name: string
    description: string
    tier: optional integer
    visibility: optional string
    icon: optional string
    icon_type: optional string
    icon_emoji: optional string
    posts_as_self: optional boolean
    show_in_default_feed: optional boolean
    tools: array of strings
    color: string
    model: string
    proactive: boolean
    priority: string
    usage: string
END STRUCTURE

/**
 * Validation Result Structure
 */
STRUCTURE ValidationResult:
    isValid: boolean
    errors: array of ValidationError
    warnings: array of ValidationWarning
END STRUCTURE

/**
 * Validation Error Structure
 */
STRUCTURE ValidationError:
    field: string
    message: string
    code: string
    severity: "error" | "warning"
END STRUCTURE

/**
 * Agent Statistics Structure
 */
STRUCTURE AgentStats:
    total: integer
    tier1: integer
    tier2: integer
    active: integer
    inactive: integer
    protected: integer
    by_tier: map of AgentTier to TierStats
END STRUCTURE

STRUCTURE TierStats:
    count: integer
    active: integer
    inactive: integer
    protected: integer
END STRUCTURE
```

### 2.2 Constant Definitions

```typescript
/**
 * Tier 1 Agent Registry
 */
CONSTANT T1_AGENTS = SET {
    "personal-todos-agent",
    "meeting-prep-agent",
    "meeting-next-steps-agent",
    "follow-ups-agent",
    "get-to-know-you-agent",
    "link-logger-agent",
    "agent-ideas-agent",
    "agent-feedback-agent"
}

/**
 * Tier 2 Agent Registry
 */
CONSTANT T2_AGENTS = SET {
    "meta-agent",
    "meta-update-agent",
    "skills-architect-agent",
    "skills-maintenance-agent",
    "agent-architect-agent",
    "agent-maintenance-agent",
    "learning-optimizer-agent",
    "system-architect-agent",
    "page-builder-agent",
    "page-verification-agent",
    "dynamic-page-testing-agent"
}

/**
 * Emoji Mappings for Icons
 */
CONSTANT EMOJI_MAP = MAP {
    // T1 Agent Emojis
    "personal-todos-agent": "📋",
    "meeting-prep-agent": "📅",
    "meeting-next-steps-agent": "✅",
    "follow-ups-agent": "🔔",
    "get-to-know-you-agent": "👋",
    "link-logger-agent": "🔗",
    "agent-ideas-agent": "💡",
    "agent-feedback-agent": "💬",

    // T2 Agent Emojis
    "meta-agent": "⚙️",
    "meta-update-agent": "🔄",
    "skills-architect-agent": "🎨",
    "skills-maintenance-agent": "🔧",
    "agent-architect-agent": "🏗️",
    "agent-maintenance-agent": "🛠️",
    "learning-optimizer-agent": "🧠",
    "system-architect-agent": "🏛️",
    "page-builder-agent": "📄",
    "page-verification-agent": "✓",
    "dynamic-page-testing-agent": "🧪",

    // Default fallback
    "default": "🤖"
}

/**
 * Default Values
 */
CONSTANT DEFAULTS = {
    tier: 1,  // Default to user-facing for backward compatibility
    visibility: "public",
    icon_type: "emoji",
    posts_as_self: true,
    show_in_default_feed: true
}

/**
 * Validation Constraints
 */
CONSTANT VALIDATION_RULES = {
    tier: {
        required: true,
        type: "integer",
        allowedValues: [1, 2]
    },
    visibility: {
        required: true,
        type: "string",
        allowedValues: ["public", "protected"]
    },
    icon_type: {
        required: false,
        type: "string",
        allowedValues: ["svg", "emoji"]
    },
    posts_as_self: {
        required: true,
        type: "boolean"
    },
    show_in_default_feed: {
        required: true,
        type: "boolean"
    }
}
```

---

## 3. Frontmatter Parser

### 3.1 Main Parsing Algorithm

```
ALGORITHM: ProcessAgentFile
INPUT: filePath (string)
OUTPUT: agent (Agent object) or null

BEGIN
    // Phase 1: Read file
    TRY
        fileContent ← ReadFile(filePath)
    CATCH FileNotFoundError
        LogError("File not found: " + filePath)
        RETURN null
    CATCH PermissionError
        LogError("Permission denied: " + filePath)
        RETURN null
    END TRY

    // Phase 2: Extract frontmatter
    frontmatterData ← ExtractFrontmatter(fileContent)
    IF frontmatterData is null THEN
        LogError("Invalid frontmatter in: " + filePath)
        RETURN null
    END IF

    // Phase 3: Classify tier
    tier ← ClassifyTier(frontmatterData)

    // Phase 4: Assign defaults
    completeData ← AssignDefaults(frontmatterData, tier)

    // Phase 5: Validate
    validationResult ← ValidateAgentData(completeData)
    IF NOT validationResult.isValid THEN
        LogErrors(validationResult.errors)
        RETURN null
    END IF

    // Phase 6: Build agent object
    agent ← BuildAgentObject(completeData, fileContent, filePath)

    RETURN agent
END
```

### 3.2 Frontmatter Extraction

```
ALGORITHM: ExtractFrontmatter
INPUT: fileContent (string)
OUTPUT: frontmatter (Frontmatter object) or null

BEGIN
    // Match YAML frontmatter between --- delimiters
    pattern ← "^---\n(.*?)\n---"
    match ← RegexMatch(fileContent, pattern, DOTALL)

    IF match is null THEN
        RETURN null
    END IF

    yamlContent ← match.group(1)

    // Parse YAML
    TRY
        frontmatter ← ParseYAML(yamlContent)
    CATCH YAMLError as e
        LogError("YAML parsing failed: " + e.message)
        RETURN null
    END TRY

    RETURN frontmatter
END
```

### 3.3 YAML Parsing with Error Recovery

```
ALGORITHM: ParseYAML
INPUT: yamlString (string)
OUTPUT: data (object) or throws YAMLError

BEGIN
    // Attempt to parse YAML
    TRY
        data ← YAMLParser.parse(yamlString)
        RETURN data
    CATCH SyntaxError as e
        // Attempt recovery for common errors
        recoveredString ← AttemptYAMLRecovery(yamlString, e)

        IF recoveredString is not null THEN
            TRY
                data ← YAMLParser.parse(recoveredString)
                LogWarning("YAML recovered from syntax error")
                RETURN data
            CATCH error
                THROW YAMLError("Unrecoverable YAML syntax: " + e.message)
            END TRY
        ELSE
            THROW YAMLError("YAML syntax error: " + e.message)
        END IF
    END TRY
END

/**
 * Common YAML recovery patterns
 */
ALGORITHM: AttemptYAMLRecovery
INPUT: yamlString (string), error (SyntaxError)
OUTPUT: recoveredString (string) or null

BEGIN
    // Common issue 1: Unquoted special characters
    IF error.message CONTAINS "special character" THEN
        recoveredString ← QuoteSpecialCharacters(yamlString)
        RETURN recoveredString
    END IF

    // Common issue 2: Inconsistent indentation
    IF error.message CONTAINS "indentation" THEN
        recoveredString ← FixIndentation(yamlString)
        RETURN recoveredString
    END IF

    // Common issue 3: Missing quotes around URLs
    IF error.message CONTAINS "url" OR error.message CONTAINS "path" THEN
        recoveredString ← QuoteURLsAndPaths(yamlString)
        RETURN recoveredString
    END IF

    // No recovery possible
    RETURN null
END
```

---

## 4. Tier Classification Logic

### 4.1 Main Classification Algorithm

```
ALGORITHM: ClassifyTier
INPUT: frontmatter (Frontmatter object)
OUTPUT: tier (integer: 1 or 2)

BEGIN
    agentName ← frontmatter.name

    // Priority 1: Explicit tier field in frontmatter
    IF frontmatter.tier is defined THEN
        tier ← frontmatter.tier

        // Validate tier value
        IF tier NOT IN [1, 2] THEN
            LogWarning("Invalid tier value: " + tier + " for " + agentName)
            tier ← DetermineDefaultTier(agentName)
        END IF

        RETURN tier
    END IF

    // Priority 2: Determine from agent name registry
    tier ← DetermineDefaultTier(agentName)

    RETURN tier
END
```

### 4.2 Default Tier Determination

```
ALGORITHM: DetermineDefaultTier
INPUT: agentName (string)
OUTPUT: tier (integer: 1 or 2)

BEGIN
    // Check T1 registry first (user-facing)
    IF agentName IN T1_AGENTS THEN
        RETURN 1
    END IF

    // Check T2 registry (system agents)
    IF agentName IN T2_AGENTS THEN
        RETURN 2
    END IF

    // Pattern matching for unknown agents
    tier ← ClassifyByPattern(agentName)

    IF tier is not null THEN
        RETURN tier
    END IF

    // Default to T1 for backward compatibility
    LogWarning("Unknown agent, defaulting to T1: " + agentName)
    RETURN 1
END
```

### 4.3 Pattern-Based Classification

```
ALGORITHM: ClassifyByPattern
INPUT: agentName (string)
OUTPUT: tier (integer: 1, 2, or null)

BEGIN
    // System agent patterns (T2)
    systemPatterns ← [
        "meta-.*",           // meta-agent, meta-update-agent
        ".*-architect",      // skills-architect, agent-architect
        ".*-maintenance",    // skills-maintenance, agent-maintenance
        "system-.*",         // system-architect
        ".*-optimizer",      // learning-optimizer
        "page-builder.*",    // page-builder-agent
        ".*-verification",   // page-verification-agent
        ".*-testing-agent"   // dynamic-page-testing-agent
    ]

    FOR EACH pattern IN systemPatterns DO
        IF agentName MATCHES pattern THEN
            RETURN 2
        END IF
    END FOR

    // User-facing patterns (T1)
    userPatterns ← [
        "personal-.*",       // personal-todos-agent
        "meeting-.*",        // meeting-prep, meeting-next-steps
        ".*-logger",         // link-logger
        "get-to-know-.*",    // get-to-know-you
        ".*-ideas",          // agent-ideas
        ".*-feedback"        // agent-feedback
    ]

    FOR EACH pattern IN userPatterns DO
        IF agentName MATCHES pattern THEN
            RETURN 1
        END IF
    END FOR

    // No pattern match
    RETURN null
END
```

### 4.4 Tier Assignment Decision Tree

```
┌─────────────────────────┐
│ frontmatter.tier exists?│
└───────┬─────────────────┘
        │
    ┌───┴───┐
   YES      NO
    │        │
    ▼        ▼
┌───────┐  ┌──────────────────┐
│Use    │  │Check T1 Registry │
│Value  │  └────────┬─────────┘
└───┬───┘           │
    │          ┌────┴────┐
    │         YES       NO
    │          │         │
    │          ▼         ▼
    │      ┌──────┐  ┌──────────────────┐
    │      │Tier 1│  │Check T2 Registry │
    │      └──────┘  └────────┬─────────┘
    │                         │
    │                    ┌────┴────┐
    │                   YES       NO
    │                    │         │
    │                    ▼         ▼
    │                ┌──────┐  ┌─────────────────┐
    │                │Tier 2│  │Pattern Matching │
    │                └──────┘  └────────┬────────┘
    │                                   │
    │                              ┌────┴────┐
    │                            MATCH     NO MATCH
    │                              │          │
    ▼                              ▼          ▼
┌──────────────┐              ┌──────┐   ┌─────────────┐
│Validate Tier │              │Use   │   │Default to 1 │
│(1 or 2 only) │              │Match │   │(Backward    │
└──────┬───────┘              └──────┘   │Compatible)  │
       │                                  └─────────────┘
   ┌───┴────┐
  VALID   INVALID
   │         │
   ▼         ▼
┌──────┐  ┌────────────────┐
│Return│  │DetermineDefault│
│Tier  │  │Tier(agentName) │
└──────┘  └────────────────┘
```

---

## 5. Default Value Assignment

### 5.1 Complete Default Assignment

```
ALGORITHM: AssignDefaults
INPUT: frontmatter (Frontmatter object), tier (integer)
OUTPUT: completeData (Frontmatter object)

BEGIN
    completeData ← COPY frontmatter
    agentName ← frontmatter.name

    // Assign tier
    IF completeData.tier is undefined THEN
        completeData.tier ← tier
    END IF

    // Assign visibility based on tier
    IF completeData.visibility is undefined THEN
        completeData.visibility ← GetDefaultVisibility(tier)
    END IF

    // Assign icon path
    IF completeData.icon is undefined THEN
        completeData.icon ← GetDefaultIconPath(agentName)
    END IF

    // Assign icon type
    IF completeData.icon_type is undefined THEN
        completeData.icon_type ← DetectIconType(completeData.icon)
    END IF

    // Assign icon emoji
    IF completeData.icon_emoji is undefined THEN
        completeData.icon_emoji ← GetDefaultEmoji(agentName)
    END IF

    // Assign posts_as_self based on tier
    IF completeData.posts_as_self is undefined THEN
        completeData.posts_as_self ← GetDefaultPostsAsSelf(tier)
    END IF

    // Assign show_in_default_feed based on tier
    IF completeData.show_in_default_feed is undefined THEN
        completeData.show_in_default_feed ← GetDefaultShowInFeed(tier)
    END IF

    // Apply tier-specific defaults
    ApplyTierSpecificDefaults(completeData, tier)

    RETURN completeData
END
```

### 5.2 Tier-Specific Default Rules

```
ALGORITHM: GetDefaultVisibility
INPUT: tier (integer)
OUTPUT: visibility (string)

BEGIN
    IF tier = 1 THEN
        RETURN "public"
    ELSE IF tier = 2 THEN
        RETURN "protected"
    ELSE
        RETURN "public"  // Fallback
    END IF
END

ALGORITHM: GetDefaultPostsAsSelf
INPUT: tier (integer)
OUTPUT: postsAsSelf (boolean)

BEGIN
    IF tier = 1 THEN
        RETURN true   // User-facing agents post as themselves
    ELSE IF tier = 2 THEN
        RETURN false  // System agents don't post (Avi posts outcomes)
    ELSE
        RETURN true   // Fallback
    END IF
END

ALGORITHM: GetDefaultShowInFeed
INPUT: tier (integer)
OUTPUT: showInFeed (boolean)

BEGIN
    IF tier = 1 THEN
        RETURN true   // Show T1 agents by default
    ELSE IF tier = 2 THEN
        RETURN false  // Hide T2 agents by default
    ELSE
        RETURN true   // Fallback
    END IF
END
```

### 5.3 Icon Default Assignment

```
ALGORITHM: GetDefaultIconPath
INPUT: agentName (string)
OUTPUT: iconPath (string) or null

BEGIN
    // Construct expected SVG path
    iconPath ← "/icons/agents/" + agentName + ".svg"

    // Check if file exists (optional validation)
    IF FileExists(iconPath) THEN
        RETURN iconPath
    ELSE
        // Return path anyway - frontend will handle fallback
        RETURN iconPath
    END IF
END

ALGORITHM: DetectIconType
INPUT: iconPath (string or null)
OUTPUT: iconType (string)

BEGIN
    IF iconPath is null THEN
        RETURN "emoji"
    END IF

    IF iconPath ENDS WITH ".svg" THEN
        RETURN "svg"
    ELSE IF iconPath ENDS WITH ".png" THEN
        RETURN "svg"  // Treat images as SVG type
    ELSE IF iconPath ENDS WITH ".jpg" OR iconPath ENDS WITH ".jpeg" THEN
        RETURN "svg"  // Treat images as SVG type
    ELSE
        RETURN "emoji"
    END IF
END

ALGORITHM: GetDefaultEmoji
INPUT: agentName (string)
OUTPUT: emoji (string)

BEGIN
    // Check emoji map
    IF agentName IN EMOJI_MAP THEN
        RETURN EMOJI_MAP[agentName]
    END IF

    // Pattern matching for emoji selection
    FOR EACH key IN EMOJI_MAP.keys() DO
        IF agentName CONTAINS key THEN
            RETURN EMOJI_MAP[key]
        END IF
    END FOR

    // Default fallback
    RETURN EMOJI_MAP["default"]  // 🤖
END
```

### 5.4 Tier-Specific Default Application

```
ALGORITHM: ApplyTierSpecificDefaults
INPUT: completeData (Frontmatter object), tier (integer)
OUTPUT: void (modifies completeData in place)

BEGIN
    IF tier = 2 THEN
        // System agents should not post to feed
        IF completeData.posts_as_self = true THEN
            LogWarning("T2 agent with posts_as_self=true: " + completeData.name)
            completeData.posts_as_self ← false
        END IF

        // System agents should not show in default feed
        IF completeData.show_in_default_feed = true THEN
            LogWarning("T2 agent with show_in_default_feed=true: " + completeData.name)
            completeData.show_in_default_feed ← false
        END IF

        // System agents should be protected
        IF completeData.visibility = "public" THEN
            LogWarning("T2 agent with public visibility: " + completeData.name)
            completeData.visibility ← "protected"
        END IF
    END IF

    IF tier = 1 THEN
        // User-facing agents should be public by default
        IF completeData.visibility is undefined THEN
            completeData.visibility ← "public"
        END IF
    END IF
END
```

---

## 6. Validation Logic

### 6.1 Main Validation Algorithm

```
ALGORITHM: ValidateAgentData
INPUT: data (Frontmatter object)
OUTPUT: result (ValidationResult)

BEGIN
    errors ← []
    warnings ← []

    // Validate required fields
    errors.concat(ValidateRequiredFields(data))

    // Validate field types
    errors.concat(ValidateFieldTypes(data))

    // Validate field values
    errors.concat(ValidateFieldValues(data))

    // Validate tier consistency
    warnings.concat(ValidateTierConsistency(data))

    // Validate icon configuration
    warnings.concat(ValidateIconConfiguration(data))

    RETURN {
        isValid: errors.length = 0,
        errors: errors,
        warnings: warnings
    }
END
```

### 6.2 Required Field Validation

```
ALGORITHM: ValidateRequiredFields
INPUT: data (Frontmatter object)
OUTPUT: errors (array of ValidationError)

BEGIN
    errors ← []
    requiredFields ← ["name", "description", "tier", "visibility",
                      "posts_as_self", "show_in_default_feed"]

    FOR EACH field IN requiredFields DO
        IF data[field] is undefined OR data[field] is null THEN
            errors.append({
                field: field,
                message: "Required field '" + field + "' is missing",
                code: "REQUIRED_FIELD_MISSING",
                severity: "error"
            })
        END IF
    END FOR

    RETURN errors
END
```

### 6.3 Field Type Validation

```
ALGORITHM: ValidateFieldTypes
INPUT: data (Frontmatter object)
OUTPUT: errors (array of ValidationError)

BEGIN
    errors ← []

    // Validate tier type
    IF data.tier is defined AND typeof(data.tier) ≠ "integer" THEN
        errors.append({
            field: "tier",
            message: "Field 'tier' must be an integer, got: " + typeof(data.tier),
            code: "INVALID_TYPE",
            severity: "error"
        })
    END IF

    // Validate visibility type
    IF data.visibility is defined AND typeof(data.visibility) ≠ "string" THEN
        errors.append({
            field: "visibility",
            message: "Field 'visibility' must be a string",
            code: "INVALID_TYPE",
            severity: "error"
        })
    END IF

    // Validate boolean fields
    booleanFields ← ["posts_as_self", "show_in_default_feed", "proactive"]
    FOR EACH field IN booleanFields DO
        IF data[field] is defined AND typeof(data[field]) ≠ "boolean" THEN
            errors.append({
                field: field,
                message: "Field '" + field + "' must be a boolean",
                code: "INVALID_TYPE",
                severity: "error"
            })
        END IF
    END FOR

    RETURN errors
END
```

### 6.4 Field Value Validation

```
ALGORITHM: ValidateFieldValues
INPUT: data (Frontmatter object)
OUTPUT: errors (array of ValidationError)

BEGIN
    errors ← []

    // Validate tier value
    IF data.tier is defined AND data.tier NOT IN [1, 2] THEN
        errors.append({
            field: "tier",
            message: "Tier must be 1 or 2, got: " + data.tier,
            code: "INVALID_VALUE",
            severity: "error"
        })
    END IF

    // Validate visibility value
    IF data.visibility is defined AND
       data.visibility NOT IN ["public", "protected"] THEN
        errors.append({
            field: "visibility",
            message: "Visibility must be 'public' or 'protected', got: " + data.visibility,
            code: "INVALID_VALUE",
            severity: "error"
        })
    END IF

    // Validate icon_type value
    IF data.icon_type is defined AND
       data.icon_type NOT IN ["svg", "emoji"] THEN
        errors.append({
            field: "icon_type",
            message: "Icon type must be 'svg' or 'emoji', got: " + data.icon_type,
            code: "INVALID_VALUE",
            severity: "error"
        })
    END IF

    RETURN errors
END
```

### 6.5 Tier Consistency Validation

```
ALGORITHM: ValidateTierConsistency
INPUT: data (Frontmatter object)
OUTPUT: warnings (array of ValidationError)

BEGIN
    warnings ← []

    IF data.tier = 2 THEN
        // T2 agents should not post as themselves
        IF data.posts_as_self = true THEN
            warnings.append({
                field: "posts_as_self",
                message: "T2 agent should have posts_as_self=false (Avi posts outcomes)",
                code: "TIER_INCONSISTENCY",
                severity: "warning"
            })
        END IF

        // T2 agents should not show in default feed
        IF data.show_in_default_feed = true THEN
            warnings.append({
                field: "show_in_default_feed",
                message: "T2 agent should have show_in_default_feed=false",
                code: "TIER_INCONSISTENCY",
                severity: "warning"
            })
        END IF

        // T2 agents should be protected
        IF data.visibility = "public" THEN
            warnings.append({
                field: "visibility",
                message: "T2 agent should have visibility='protected'",
                code: "TIER_INCONSISTENCY",
                severity: "warning"
            })
        END IF
    END IF

    RETURN warnings
END
```

### 6.6 Icon Configuration Validation

```
ALGORITHM: ValidateIconConfiguration
INPUT: data (Frontmatter object)
OUTPUT: warnings (array of ValidationError)

BEGIN
    warnings ← []

    // Check icon path validity
    IF data.icon is defined AND data.icon_type = "svg" THEN
        IF NOT data.icon MATCHES "^/icons/agents/.*\.(svg|png|jpg|jpeg)$" THEN
            warnings.append({
                field: "icon",
                message: "Icon path should be in /icons/agents/ directory",
                code: "ICON_PATH_WARNING",
                severity: "warning"
            })
        END IF
    END IF

    // Ensure emoji fallback exists
    IF data.icon_emoji is undefined OR data.icon_emoji = "" THEN
        warnings.append({
            field: "icon_emoji",
            message: "No emoji fallback provided for icon",
            code: "MISSING_EMOJI_FALLBACK",
            severity: "warning"
        })
    END IF

    // Validate emoji format
    IF data.icon_emoji is defined THEN
        IF NOT IsValidEmoji(data.icon_emoji) THEN
            warnings.append({
                field: "icon_emoji",
                message: "Invalid emoji character: " + data.icon_emoji,
                code: "INVALID_EMOJI",
                severity: "warning"
            })
        END IF
    END IF

    RETURN warnings
END

/**
 * Check if string is valid emoji
 */
ALGORITHM: IsValidEmoji
INPUT: text (string)
OUTPUT: isValid (boolean)

BEGIN
    // Regex pattern for Unicode emoji
    emojiPattern ← "^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]$"

    RETURN text MATCHES emojiPattern
END
```

---

## 7. Icon Loading Strategy

### 7.1 Icon Resolution Algorithm

```
ALGORITHM: ResolveAgentIcon
INPUT: agent (Agent object)
OUTPUT: iconComponent (React component or string)

BEGIN
    // Priority 1: SVG icon
    IF agent.icon is defined AND agent.icon_type = "svg" THEN
        iconUrl ← agent.icon

        // Attempt to load SVG
        TRY
            svgComponent ← LoadSVGIcon(iconUrl)
            RETURN svgComponent
        CATCH LoadError
            LogWarning("Failed to load SVG: " + iconUrl)
            // Fall through to emoji
        END TRY
    END IF

    // Priority 2: Emoji fallback
    IF agent.icon_emoji is defined AND agent.icon_emoji ≠ "" THEN
        RETURN EmojiComponent(agent.icon_emoji)
    END IF

    // Priority 3: Generated initials
    initials ← GenerateInitials(agent.name)
    backgroundColor ← agent.color OR "#6366f1"
    RETURN InitialsComponent(initials, backgroundColor)
END
```

### 7.2 SVG Loading with Fallback

```
ALGORITHM: LoadSVGIcon
INPUT: iconUrl (string)
OUTPUT: svgComponent (component) or throws LoadError

BEGIN
    // Validate URL format
    IF NOT IsValidIconPath(iconUrl) THEN
        THROW LoadError("Invalid icon path: " + iconUrl)
    END IF

    // Attempt to fetch SVG
    TRY
        response ← HTTP.GET(iconUrl)

        IF response.status = 200 THEN
            svgContent ← response.body

            // Validate SVG content
            IF IsValidSVG(svgContent) THEN
                RETURN CreateSVGComponent(svgContent)
            ELSE
                THROW LoadError("Invalid SVG content")
            END IF
        ELSE
            THROW LoadError("HTTP " + response.status)
        END IF
    CATCH NetworkError as e
        THROW LoadError("Network error: " + e.message)
    END TRY
END

/**
 * Validate icon path format
 */
ALGORITHM: IsValidIconPath
INPUT: path (string)
OUTPUT: isValid (boolean)

BEGIN
    // Must be absolute path in /icons/agents/
    pattern ← "^/icons/agents/[a-z0-9-]+\.(svg|png|jpg|jpeg)$"

    RETURN path MATCHES pattern
END

/**
 * Validate SVG content
 */
ALGORITHM: IsValidSVG
INPUT: content (string)
OUTPUT: isValid (boolean)

BEGIN
    // Must start with <svg> tag
    IF NOT content STARTS WITH "<svg" THEN
        RETURN false
    END IF

    // Must end with </svg> tag
    IF NOT content ENDS WITH "</svg>" THEN
        RETURN false
    END IF

    // Must have viewBox attribute (recommended)
    IF NOT content CONTAINS "viewBox" THEN
        LogWarning("SVG missing viewBox attribute")
    END IF

    RETURN true
END
```

### 7.3 Initials Generation

```
ALGORITHM: GenerateInitials
INPUT: agentName (string)
OUTPUT: initials (string)

BEGIN
    // Remove '-agent' suffix if present
    cleanName ← agentName REPLACE "-agent" WITH ""

    // Split by hyphens
    words ← cleanName SPLIT "-"

    IF words.length = 0 THEN
        RETURN "A"  // Fallback
    END IF

    IF words.length = 1 THEN
        // Single word: take first character
        RETURN UPPERCASE(words[0][0])
    ELSE
        // Multiple words: take first character of first two words
        initials ← UPPERCASE(words[0][0]) + UPPERCASE(words[1][0])
        RETURN initials
    END IF
END

/**
 * Examples:
 * "personal-todos-agent" → "PT"
 * "meta-agent" → "M"
 * "get-to-know-you-agent" → "GT"
 * "avi" → "A"
 */
```

---

## 8. Error Handling

### 8.1 Error Classification

```
ENUM ErrorSeverity:
    FATAL = "fatal"        // Cannot continue processing
    ERROR = "error"        // Agent invalid, skip
    WARNING = "warning"    // Agent valid, but issues exist
    INFO = "info"          // Informational only
END ENUM

STRUCTURE Error:
    severity: ErrorSeverity
    code: string
    message: string
    field: optional string
    context: optional object
    timestamp: timestamp
END STRUCTURE
```

### 8.2 Error Handling Strategy

```
ALGORITHM: ProcessAgentFileWithErrorHandling
INPUT: filePath (string)
OUTPUT: agent (Agent object) or null

BEGIN
    errorContext ← {
        file: filePath,
        phase: null,
        errors: []
    }

    TRY
        // Phase 1: File reading
        errorContext.phase ← "FILE_READ"
        fileContent ← ReadFile(filePath)

        // Phase 2: Frontmatter extraction
        errorContext.phase ← "FRONTMATTER_PARSE"
        frontmatter ← ExtractFrontmatter(fileContent)
        IF frontmatter is null THEN
            THROW Error({
                severity: ERROR,
                code: "INVALID_FRONTMATTER",
                message: "Failed to parse frontmatter"
            })
        END IF

        // Phase 3: Tier classification
        errorContext.phase ← "TIER_CLASSIFICATION"
        tier ← ClassifyTier(frontmatter)

        // Phase 4: Default assignment
        errorContext.phase ← "DEFAULT_ASSIGNMENT"
        completeData ← AssignDefaults(frontmatter, tier)

        // Phase 5: Validation
        errorContext.phase ← "VALIDATION"
        validationResult ← ValidateAgentData(completeData)

        IF NOT validationResult.isValid THEN
            // Log all errors
            FOR EACH error IN validationResult.errors DO
                LogError(error)
                errorContext.errors.append(error)
            END FOR

            THROW Error({
                severity: ERROR,
                code: "VALIDATION_FAILED",
                message: "Agent validation failed",
                context: errorContext
            })
        END IF

        // Log warnings (non-fatal)
        FOR EACH warning IN validationResult.warnings DO
            LogWarning(warning)
        END FOR

        // Phase 6: Build agent
        errorContext.phase ← "BUILD_AGENT"
        agent ← BuildAgentObject(completeData, fileContent, filePath)

        RETURN agent

    CATCH FileNotFoundError as e
        LogError({
            severity: FATAL,
            code: "FILE_NOT_FOUND",
            message: "Agent file not found: " + filePath,
            context: errorContext
        })
        RETURN null

    CATCH YAMLError as e
        LogError({
            severity: ERROR,
            code: "YAML_PARSE_ERROR",
            message: "YAML parsing failed: " + e.message,
            context: errorContext
        })
        RETURN null

    CATCH ValidationError as e
        LogError({
            severity: ERROR,
            code: "VALIDATION_ERROR",
            message: e.message,
            context: errorContext
        })
        RETURN null

    CATCH UnexpectedError as e
        LogError({
            severity: FATAL,
            code: "UNEXPECTED_ERROR",
            message: "Unexpected error: " + e.message,
            context: errorContext
        })
        RETURN null
    END TRY
END
```

### 8.3 Error Recovery Strategies

```
ALGORITHM: RecoverFromError
INPUT: error (Error), context (object)
OUTPUT: recovered (boolean)

BEGIN
    MATCH error.code:
        CASE "INVALID_FRONTMATTER":
            // Attempt YAML recovery
            IF AttemptYAMLRecovery(context.yamlContent) is not null THEN
                RETURN true
            END IF
            RETURN false

        CASE "INVALID_TIER":
            // Use default tier determination
            tier ← DetermineDefaultTier(context.agentName)
            context.tier ← tier
            RETURN true

        CASE "MISSING_ICON":
            // Use emoji fallback
            emoji ← GetDefaultEmoji(context.agentName)
            context.icon_emoji ← emoji
            RETURN true

        CASE "INVALID_VISIBILITY":
            // Use tier-based default
            visibility ← GetDefaultVisibility(context.tier)
            context.visibility ← visibility
            RETURN true

        DEFAULT:
            RETURN false
    END MATCH
END
```

---

## 9. Test Cases

### 9.1 Valid Agent Cases

```
TEST CASE: ValidT1Agent
INPUT:
    frontmatter = {
        name: "personal-todos-agent",
        description: "Task management",
        tier: 1,
        visibility: "public",
        icon: "/icons/agents/personal-todos-agent.svg",
        icon_type: "svg",
        icon_emoji: "📋",
        posts_as_self: true,
        show_in_default_feed: true,
        tools: ["Read", "Write"],
        color: "#059669",
        model: "sonnet"
    }

EXPECTED OUTPUT:
    agent = {
        tier: 1,
        visibility: "public",
        icon: "/icons/agents/personal-todos-agent.svg",
        icon_type: "svg",
        icon_emoji: "📋",
        posts_as_self: true,
        show_in_default_feed: true,
        // ... other fields
    }

VALIDATION:
    - agent.tier = 1
    - agent.visibility = "public"
    - agent.posts_as_self = true
    - agent.show_in_default_feed = true
    - validationResult.isValid = true
    - validationResult.errors.length = 0

TEST CASE: ValidT2Agent
INPUT:
    frontmatter = {
        name: "meta-agent",
        description: "Agent generator",
        tier: 2,
        visibility: "protected",
        icon: "/icons/agents/meta-agent.svg",
        icon_type: "svg",
        icon_emoji: "⚙️",
        posts_as_self: false,
        show_in_default_feed: false,
        tools: ["Bash", "Read"],
        color: "#374151",
        model: "sonnet"
    }

EXPECTED OUTPUT:
    agent.tier = 2
    agent.visibility = "protected"
    agent.posts_as_self = false
    agent.show_in_default_feed = false

VALIDATION:
    - All tier 2 constraints satisfied
    - No warnings generated
```

### 9.2 Missing Field Cases

```
TEST CASE: MissingTierField
INPUT:
    frontmatter = {
        name: "personal-todos-agent",
        description: "Task management",
        // tier field missing
        tools: ["Read"],
        model: "sonnet"
    }

EXPECTED BEHAVIOR:
    - ClassifyTier returns 1 (from T1_AGENTS registry)
    - AssignDefaults sets tier = 1
    - Default values assigned based on tier 1
    - Agent created successfully

VALIDATION:
    - agent.tier = 1
    - agent.visibility = "public"
    - agent.posts_as_self = true
    - agent.show_in_default_feed = true
    - agent.icon_emoji = "📋"

TEST CASE: UnknownAgentName
INPUT:
    frontmatter = {
        name: "unknown-custom-agent",
        description: "Custom agent",
        // tier field missing
        tools: ["Read"],
        model: "sonnet"
    }

EXPECTED BEHAVIOR:
    - ClassifyTier returns 1 (default for unknown)
    - Warning logged: "Unknown agent, defaulting to T1"
    - Default values assigned

VALIDATION:
    - agent.tier = 1
    - agent.icon_emoji = "🤖" (default)
    - Warning logged
```

### 9.3 Invalid Value Cases

```
TEST CASE: InvalidTierValue
INPUT:
    frontmatter = {
        name: "test-agent",
        tier: 3,  // Invalid
        description: "Test"
    }

EXPECTED BEHAVIOR:
    - ValidateFieldValues detects error
    - Error: "Tier must be 1 or 2, got: 3"
    - Agent creation fails
    - RETURN null

VALIDATION:
    - validationResult.isValid = false
    - validationResult.errors[0].code = "INVALID_VALUE"
    - validationResult.errors[0].field = "tier"

TEST CASE: InvalidVisibility
INPUT:
    frontmatter = {
        name: "test-agent",
        tier: 1,
        visibility: "private",  // Invalid
        description: "Test"
    }

EXPECTED BEHAVIOR:
    - Validation error detected
    - Error: "Visibility must be 'public' or 'protected', got: 'private'"
    - Agent creation fails

VALIDATION:
    - validationResult.isValid = false
    - Error code = "INVALID_VALUE"
```

### 9.4 Tier Inconsistency Cases

```
TEST CASE: T2AgentWithPostsAsSelf
INPUT:
    frontmatter = {
        name: "meta-agent",
        tier: 2,
        posts_as_self: true,  // Inconsistent with T2
        description: "Test"
    }

EXPECTED BEHAVIOR:
    - ApplyTierSpecificDefaults corrects value
    - posts_as_self set to false
    - Warning logged: "T2 agent with posts_as_self=true"

VALIDATION:
    - agent.tier = 2
    - agent.posts_as_self = false (auto-corrected)
    - validationResult.warnings.length > 0
    - Warning code = "TIER_INCONSISTENCY"

TEST CASE: T2AgentPublic
INPUT:
    frontmatter = {
        name: "meta-agent",
        tier: 2,
        visibility: "public",  // Inconsistent
        description: "Test"
    }

EXPECTED BEHAVIOR:
    - Auto-corrected to "protected"
    - Warning logged

VALIDATION:
    - agent.visibility = "protected" (auto-corrected)
    - Warning generated
```

### 9.5 Icon Loading Cases

```
TEST CASE: ValidSVGIcon
INPUT:
    agent = {
        name: "personal-todos-agent",
        icon: "/icons/agents/personal-todos-agent.svg",
        icon_type: "svg",
        icon_emoji: "📋"
    }

EXPECTED BEHAVIOR:
    - ResolveAgentIcon attempts to load SVG
    - If successful, returns SVG component
    - If fails, falls back to emoji

VALIDATION:
    - SVG loaded OR emoji displayed
    - No errors thrown
    - Graceful degradation

TEST CASE: MissingIconFile
INPUT:
    agent = {
        name: "test-agent",
        icon: "/icons/agents/nonexistent.svg",
        icon_type: "svg",
        icon_emoji: "🤖"
    }

EXPECTED BEHAVIOR:
    - SVG load fails
    - Falls back to emoji "🤖"
    - Warning logged

VALIDATION:
    - Emoji displayed
    - No fatal errors
    - Warning: "Failed to load SVG"

TEST CASE: NoIconProvided
INPUT:
    agent = {
        name: "test-agent",
        icon: null,
        icon_emoji: null
    }

EXPECTED BEHAVIOR:
    - Falls back to initials generation
    - GenerateInitials("test-agent") returns "T"
    - Displays "T" in colored circle

VALIDATION:
    - Initials component displayed
    - Background color from agent.color
```

### 9.6 Malformed YAML Cases

```
TEST CASE: InvalidYAMLSyntax
INPUT:
    yamlContent = """
    name: test-agent
    description: Test
    tier: 1
    visibility public  # Missing colon
    """

EXPECTED BEHAVIOR:
    - ParseYAML throws YAMLError
    - AttemptYAMLRecovery attempts fix
    - If unrecoverable, agent creation fails

VALIDATION:
    - Error logged
    - RETURN null
    - Error code = "YAML_PARSE_ERROR"

TEST CASE: SpecialCharactersInDescription
INPUT:
    yamlContent = """
    name: test-agent
    description: Agent with special chars: @#$%
    tier: 1
    """

EXPECTED BEHAVIOR:
    - ParseYAML handles special characters
    - Agent created successfully
    - Description preserved

VALIDATION:
    - agent.description = "Agent with special chars: @#$%"
    - No errors
```

---

## 10. Complexity Analysis

### 10.1 Time Complexity

```
ALGORITHM: ProcessAgentFile
COMPLEXITY ANALYSIS:

Phase 1: ReadFile
    - Time: O(n) where n = file size
    - Space: O(n) for file content

Phase 2: ExtractFrontmatter
    - Regex match: O(m) where m = frontmatter size
    - YAML parse: O(m) for parsing
    - Time: O(m)
    - Space: O(m)

Phase 3: ClassifyTier
    - T1/T2 registry lookup: O(1) with Set/Map
    - Pattern matching: O(p) where p = number of patterns
    - Time: O(1) average case, O(p) worst case
    - Space: O(1)

Phase 4: AssignDefaults
    - Field assignment: O(f) where f = number of fields
    - Emoji lookup: O(1) with Map
    - Time: O(f) ≈ O(1) (constant number of fields)
    - Space: O(1)

Phase 5: ValidateAgentData
    - Required fields: O(r) where r = required fields
    - Type validation: O(f)
    - Value validation: O(f)
    - Consistency checks: O(c) where c = constraints
    - Time: O(f + c) ≈ O(1)
    - Space: O(e) where e = number of errors

Phase 6: BuildAgentObject
    - Object construction: O(f)
    - Hash computation: O(n) for content hash
    - Time: O(n)
    - Space: O(n)

TOTAL TIME COMPLEXITY: O(n) dominated by file reading and hashing
TOTAL SPACE COMPLEXITY: O(n) for file content and agent object
```

### 10.2 Space Complexity

```
ALGORITHM: ProcessAllAgents
INPUT: agentDirectory (string)
OUTPUT: agents (array of Agent objects)

SPACE ANALYSIS:

File Discovery:
    - agentFiles array: O(a) where a = number of agents

Agent Processing:
    - Per agent: O(n) where n = average file size
    - All agents: O(a * n)

Statistics:
    - stats object: O(1) constant size

TOTAL SPACE: O(a * n)

For current system:
    - a = 19 agents
    - n ≈ 10KB average file size
    - Total: ~190KB in memory

Scalability:
    - Linear growth with agent count
    - Manageable up to 1000+ agents
```

### 10.3 Performance Optimizations

```
OPTIMIZATION 1: Caching
ALGORITHM: ProcessAgentsWithCache
    - Cache parsed frontmatter by file hash
    - Skip parsing if hash unchanged
    - Time savings: O(n) → O(1) for unchanged files

OPTIMIZATION 2: Lazy Icon Loading
ALGORITHM: LazyIconResolution
    - Don't resolve icons during initial load
    - Load icons on-demand when displayed
    - Memory savings: ~50% reduction

OPTIMIZATION 3: Parallel Processing
ALGORITHM: ParallelAgentProcessing
    - Process agents in parallel threads
    - Time: O(n) → O(n/p) where p = number of cores
    - Scalability: 4x speedup on quad-core

OPTIMIZATION 4: Indexed Registries
DATA STRUCTURE: T1_AGENTS, T2_AGENTS as Set
    - O(1) lookup vs O(n) array search
    - Critical for classification performance
```

### 10.4 Scalability Analysis

```
CURRENT SYSTEM (19 agents):
    - Load time: <50ms
    - Memory: ~200KB
    - CPU: Minimal

PROJECTED (100 agents):
    - Load time: ~250ms (linear scale)
    - Memory: ~1MB
    - CPU: Negligible

PROJECTED (1000 agents):
    - Load time: ~2.5s without optimization
    - Load time: ~800ms with caching
    - Load time: ~600ms with parallel processing
    - Memory: ~10MB
    - Recommendation: Implement caching and pagination

BOTTLENECKS:
    1. File I/O (disk read): Mitigate with caching
    2. YAML parsing: Optimize with faster parser
    3. Validation: Parallelize validation checks

OPTIMIZATION PRIORITIES:
    1. HIGH: Implement file hash caching
    2. MEDIUM: Parallelize agent processing
    3. LOW: Lazy icon loading (UI optimization)
```

---

## 11. Implementation Notes

### 11.1 Technology Stack Recommendations

```
BACKEND (Node.js):
    - YAML Parser: js-yaml (fast, reliable)
    - File System: fs/promises (async I/O)
    - Validation: joi or zod (schema validation)
    - Caching: lru-cache (in-memory cache)

FRONTEND (React/TypeScript):
    - Icon Loading: React.lazy for SVG components
    - State Management: React Context or Zustand
    - Local Storage: localStorage API
    - Type Safety: TypeScript interfaces

TESTING:
    - Unit Tests: Jest
    - Integration Tests: Supertest
    - E2E Tests: Playwright
    - Coverage Target: 90%+
```

### 11.2 Migration Strategy

```
PHASE 1: Backend Foundation
    - Implement frontmatter parser
    - Implement tier classifier
    - Implement default assigner
    - Implement validator
    - Unit test coverage: 95%+

PHASE 2: Agent Frontmatter Updates
    - Update T1 agents (8 files)
    - Update T2 agents (11 files)
    - Validate all agent files
    - Integration test coverage: 90%+

PHASE 3: API Implementation
    - Implement GET /api/agents?tier=X
    - Implement protection logic
    - Implement stats endpoint
    - API test coverage: 95%+

PHASE 4: Frontend Components
    - Build tier badge component
    - Build tier toggle component
    - Build icon component
    - Component test coverage: 90%+

PHASE 5: Integration & Testing
    - End-to-end testing
    - Performance testing
    - User acceptance testing
    - Bug fixing and refinement
```

### 11.3 Performance Benchmarks

```
BENCHMARK TARGETS:

Agent File Processing:
    - Single agent: <5ms
    - 19 agents: <50ms
    - 100 agents: <250ms

API Response Time:
    - GET /api/agents?tier=1: <100ms
    - GET /api/agents?tier=all: <150ms
    - GET /api/agents/stats: <50ms

Frontend Render:
    - Agent list (8 items): <50ms
    - Agent list (19 items): <100ms
    - Icon loading: <200ms per icon

Memory Usage:
    - Backend: <10MB for 100 agents
    - Frontend: <5MB state management
    - Icon cache: <20MB for all SVGs
```

---

## 12. Deliverables Summary

### 12.1 Algorithm Deliverables

1. **Frontmatter Parser** ✓
   - YAML extraction
   - Error recovery
   - Type validation

2. **Tier Classifier** ✓
   - Registry-based classification
   - Pattern-based fallback
   - Default tier determination

3. **Default Assigner** ✓
   - Tier-specific defaults
   - Icon path generation
   - Emoji fallback mapping

4. **Validator** ✓
   - Required field validation
   - Type validation
   - Value validation
   - Tier consistency checks

5. **Error Handler** ✓
   - Comprehensive error classification
   - Recovery strategies
   - Logging and reporting

### 12.2 Data Structure Deliverables

1. **TypeScript Interfaces** ✓
   - Agent structure
   - Frontmatter structure
   - Validation result structure
   - Statistics structure

2. **Constants** ✓
   - T1/T2 agent registries
   - Emoji mappings
   - Default values
   - Validation rules

### 12.3 Test Case Deliverables

1. **Valid Cases** ✓
   - T1 agent processing
   - T2 agent processing

2. **Edge Cases** ✓
   - Missing tier field
   - Unknown agent names
   - Invalid values
   - Tier inconsistencies

3. **Error Cases** ✓
   - Malformed YAML
   - Missing files
   - Invalid types

### 12.4 Analysis Deliverables

1. **Complexity Analysis** ✓
   - Time complexity: O(n)
   - Space complexity: O(a * n)

2. **Performance Benchmarks** ✓
   - Processing targets
   - API response targets
   - Memory limits

3. **Scalability Analysis** ✓
   - Current system (19 agents)
   - Projected (100 agents)
   - Projected (1000 agents)

---

## Document Control

**Version History**:
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-19 | SPARC Pseudocode Agent | Initial pseudocode design |

**Approvals Required**:
- [ ] Technical Lead Review
- [ ] Architecture Review
- [ ] Security Review

**Next Phase**: Architecture Design
**Target**: Ready for implementation by Architecture phase

---

**END OF PSEUDOCODE DOCUMENT**
