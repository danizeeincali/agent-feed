# Phase 4: Validation & Error Handling - Detailed Pseudocode

**Document Version:** 1.0
**Date:** 2025-10-12
**Status:** Pseudocode Design Phase
**SPARC Phase:** Pseudocode (P)

---

## Table of Contents

1. [Overview](#overview)
2. [ValidationService Pseudocode](#validationservice-pseudocode)
3. [RetryService Pseudocode](#retryservice-pseudocode)
4. [EscalationService Pseudocode](#escalationservice-pseudocode)
5. [PostValidator Pseudocode](#postvalidator-pseudocode)
6. [Data Structures](#data-structures)
7. [Configuration Constants](#configuration-constants)
8. [Integration Points](#integration-points)
9. [Error Handling Patterns](#error-handling-patterns)
10. [Complexity Analysis](#complexity-analysis)

---

## Overview

Phase 4 implements comprehensive validation and error handling for the AVI DM system. This layer ensures that agent-generated content meets quality standards, handles failures gracefully, and escalates issues appropriately.

### Architecture Pattern

```
┌─────────────────────────────────────────────┐
│ AgentWorker (Phase 3)                       │
│  └─> executeTicket() generates response     │
└──────────────────┬──────────────────────────┘
                   │ response
                   ↓
┌─────────────────────────────────────────────┐
│ PostValidator (Phase 4 - Main Entry)        │
│  └─> validateAndPost()                      │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
┌────────────────┐   ┌──────────────────┐
│ValidationService│   │RetryService      │
│  └─> validate  │   │  └─> retry       │
└────────┬───────┘   └───────┬──────────┘
         │                   │
         │ escalate          │
         └───────┬───────────┘
                 ↓
        ┌──────────────────┐
        │EscalationService │
        │  └─> alert user  │
        └──────────────────┘
```

### Key Design Principles

1. **Fail Fast**: Validate quickly using rule-based checks first
2. **Progressive Enhancement**: Only use LLM checks when rules pass
3. **Graceful Degradation**: Multiple retry strategies before escalation
4. **Audit Trail**: Log all validation failures and retries
5. **User Transparency**: Clear error messages and escalation notifications

---

## ValidationService Pseudocode

**File**: `/src/validation/validation-service.ts`

### Data Structures

```typescript
INTERFACE PostDraft:
    content: string
    agentName: string
    userId: string
    feedItemId: string
    metadata: object

INTERFACE ValidationResult:
    approved: boolean
    canRetry: boolean
    reason: string
    severity: 'minor' | 'moderate' | 'critical'
    suggestions: string[]
    checks: object

INTERFACE RuleCheckResult:
    passed: boolean
    ruleName: string
    message: string
    severity: 'minor' | 'moderate' | 'critical'

INTERFACE ToneCheckResult:
    passed: boolean
    severity: 'minor' | 'moderate' | 'critical'
    reason: string
    suggestion: string
    confidence: number
```

### 1. Main Validation Entry Point

```
ALGORITHM: validatePost
INPUT: post (PostDraft)
OUTPUT: Promise<ValidationResult>

DEPENDENCIES:
    - logger (Winston)
    - config (validation rules from posting_rules)
    - anthropic (Claude API client)

BEGIN
    // Initialize result object
    result ← {
        approved: true,
        canRetry: true,
        reason: '',
        severity: 'minor',
        suggestions: [],
        checks: {}
    }

    // Start timer for metrics
    startTime ← getCurrentTime()

    TRY
        // Log validation start
        logger.info('Starting post validation', {
            agentName: post.agentName,
            feedItemId: post.feedItemId,
            contentLength: post.content.length
        })

        // PHASE 1: Rule-based checks (no LLM, ~0ms)
        // These are fast and deterministic

        lengthCheck ← checkLength(post)
        result.checks.length ← lengthCheck

        IF NOT lengthCheck.passed THEN
            result.approved ← false
            result.canRetry ← true
            result.reason ← lengthCheck.message
            result.severity ← lengthCheck.severity
            result.suggestions.append('Adjust content length')

            // Log and return early - no need for further checks
            logger.warn('Length validation failed', {
                agentName: post.agentName,
                length: post.content.length,
                reason: lengthCheck.message
            })

            RETURN result
        END IF

        prohibitedCheck ← checkProhibitedWords(post)
        result.checks.prohibitedWords ← prohibitedCheck

        IF NOT prohibitedCheck.passed THEN
            result.approved ← false
            result.canRetry ← true
            result.reason ← prohibitedCheck.message
            result.severity ← prohibitedCheck.severity
            result.suggestions.append('Remove prohibited words and regenerate')

            logger.warn('Prohibited words detected', {
                agentName: post.agentName,
                reason: prohibitedCheck.message
            })

            RETURN result
        END IF

        mentionsCheck ← checkMentions(post)
        result.checks.mentions ← mentionsCheck

        IF NOT mentionsCheck.passed THEN
            result.approved ← false
            result.canRetry ← true
            result.reason ← mentionsCheck.message
            result.severity ← mentionsCheck.severity
            result.suggestions.append('Fix mention formatting')

            logger.warn('Mentions validation failed', {
                agentName: post.agentName,
                reason: mentionsCheck.message
            })

            RETURN result
        END IF

        hashtagsCheck ← checkHashtags(post)
        result.checks.hashtags ← hashtagsCheck

        IF NOT hashtagsCheck.passed THEN
            result.approved ← false
            result.canRetry ← true
            result.reason ← hashtagsCheck.message
            result.severity ← hashtagsCheck.severity
            result.suggestions.append('Adjust hashtag count')

            logger.warn('Hashtags validation failed', {
                agentName: post.agentName,
                reason: hashtagsCheck.message
            })

            RETURN result
        END IF

        // PHASE 2: LLM-based checks (uses tokens, ~200-500 tokens, ~1-2s)
        // Only run if all rule-based checks passed

        logger.debug('Rule checks passed, running LLM tone check')

        toneCheck ← AWAIT checkToneWithLLM(post, post.agentName)
        result.checks.tone ← toneCheck

        IF NOT toneCheck.passed THEN
            result.approved ← false
            result.canRetry ← toneCheck.severity !== 'critical'
            result.reason ← toneCheck.reason
            result.severity ← toneCheck.severity
            result.suggestions.append(toneCheck.suggestion)

            logger.warn('Tone validation failed', {
                agentName: post.agentName,
                reason: toneCheck.reason,
                confidence: toneCheck.confidence
            })

            RETURN result
        END IF

        // All checks passed
        duration ← getCurrentTime() - startTime

        logger.info('Post validation successful', {
            agentName: post.agentName,
            duration: duration,
            checks: Object.keys(result.checks).length
        })

        RETURN result

    CATCH error
        // Handle unexpected validation errors
        logger.error('Validation error occurred', {
            error: error.message,
            stack: error.stack,
            agentName: post.agentName
        })

        // Return a safe default - allow retry
        RETURN {
            approved: false,
            canRetry: true,
            reason: 'Validation system error: ' + error.message,
            severity: 'critical',
            suggestions: ['Contact system administrator'],
            checks: result.checks
        }
    END TRY
END
```

### 2. Length Check

```
ALGORITHM: checkLength
INPUT: post (PostDraft)
OUTPUT: RuleCheckResult

DEPENDENCIES:
    - config.posting_rules.max_length
    - config.posting_rules.min_length (default: 50)

BEGIN
    // Get posting rules for this agent
    maxLength ← getPostingRule(post.agentName, 'max_length') OR 280
    minLength ← getPostingRule(post.agentName, 'min_length') OR 50

    contentLength ← post.content.length

    // Check minimum length
    IF contentLength < minLength THEN
        RETURN {
            passed: false,
            ruleName: 'min_length',
            message: `Content too short: ${contentLength} chars (min: ${minLength})`,
            severity: 'moderate'
        }
    END IF

    // Check maximum length
    IF contentLength > maxLength THEN
        RETURN {
            passed: false,
            ruleName: 'max_length',
            message: `Content too long: ${contentLength} chars (max: ${maxLength})`,
            severity: 'moderate'
        }
    END IF

    // Success
    RETURN {
        passed: true,
        ruleName: 'length',
        message: `Length valid: ${contentLength} chars`,
        severity: 'minor'
    }
END
```

### 3. Prohibited Words Check

```
ALGORITHM: checkProhibitedWords
INPUT: post (PostDraft)
OUTPUT: RuleCheckResult

DEPENDENCIES:
    - config.safety_constraints.content_filters
    - PROHIBITED_WORDS_MAP (hash table for O(1) lookup)

BEGIN
    // Load prohibited words for this agent
    prohibitedWords ← getProhibitedWords(post.agentName)

    IF prohibitedWords.length === 0 THEN
        // No restrictions for this agent
        RETURN {
            passed: true,
            ruleName: 'prohibited_words',
            message: 'No prohibited words configured',
            severity: 'minor'
        }
    END IF

    // Convert content to lowercase for case-insensitive matching
    contentLower ← post.content.toLowerCase()

    // Track found violations
    foundWords ← []

    // Check each prohibited word
    FOR EACH word IN prohibitedWords DO
        wordLower ← word.toLowerCase()

        // Use word boundary matching to avoid false positives
        // E.g., "spam" should not match "spammer"
        pattern ← `\\b${escapeRegex(wordLower)}\\b`
        regex ← new RegExp(pattern, 'i')

        IF regex.test(post.content) THEN
            foundWords.append(word)
        END IF
    END FOR

    // Check if violations found
    IF foundWords.length > 0 THEN
        RETURN {
            passed: false,
            ruleName: 'prohibited_words',
            message: `Prohibited words detected: ${foundWords.join(', ')}`,
            severity: 'critical'
        }
    END IF

    // Success
    RETURN {
        passed: true,
        ruleName: 'prohibited_words',
        message: 'No prohibited words found',
        severity: 'minor'
    }
END

SUBROUTINE: escapeRegex
INPUT: str (string)
OUTPUT: string

BEGIN
    // Escape special regex characters
    RETURN str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
END
```

### 4. Mentions Check

```
ALGORITHM: checkMentions
INPUT: post (PostDraft)
OUTPUT: RuleCheckResult

DEPENDENCIES:
    - config.safety_constraints.max_mentions_per_post
    - MENTION_REGEX (/@[a-zA-Z0-9_]+/)

BEGIN
    // Get max mentions limit
    maxMentions ← getMaxMentions(post.agentName) OR 3

    // Extract all mentions using regex
    // Pattern matches @username format
    mentionRegex ← /@[a-zA-Z0-9_]+/g
    mentions ← post.content.matchAll(mentionRegex)
    mentionArray ← Array.from(mentions)

    mentionCount ← mentionArray.length

    // Check if exceeds limit
    IF mentionCount > maxMentions THEN
        RETURN {
            passed: false,
            ruleName: 'max_mentions',
            message: `Too many mentions: ${mentionCount} (max: ${maxMentions})`,
            severity: 'moderate'
        }
    END IF

    // Validate mention format
    invalidMentions ← []

    FOR EACH mention IN mentionArray DO
        username ← mention[0].substring(1) // Remove @ symbol

        // Check username validity
        // Must be 1-15 characters, alphanumeric + underscore
        IF username.length < 1 OR username.length > 15 THEN
            invalidMentions.append(mention[0])
        ELSE IF NOT /^[a-zA-Z0-9_]+$/.test(username) THEN
            invalidMentions.append(mention[0])
        END IF
    END FOR

    IF invalidMentions.length > 0 THEN
        RETURN {
            passed: false,
            ruleName: 'mention_format',
            message: `Invalid mention format: ${invalidMentions.join(', ')}`,
            severity: 'moderate'
        }
    END IF

    // Success
    RETURN {
        passed: true,
        ruleName: 'mentions',
        message: `Valid mentions: ${mentionCount}`,
        severity: 'minor'
    }
END
```

### 5. Hashtags Check

```
ALGORITHM: checkHashtags
INPUT: post (PostDraft)
OUTPUT: RuleCheckResult

DEPENDENCIES:
    - config.posting_rules.max_hashtags (default: 5)
    - config.posting_rules.required_hashtags
    - HASHTAG_REGEX (/#[a-zA-Z0-9_]+/)

BEGIN
    // Extract all hashtags
    hashtagRegex ← /#[a-zA-Z0-9_]+/g
    hashtags ← post.content.matchAll(hashtagRegex)
    hashtagArray ← Array.from(hashtags)

    hashtagCount ← hashtagArray.length
    maxHashtags ← getMaxHashtags(post.agentName) OR 5

    // Check maximum count
    IF hashtagCount > maxHashtags THEN
        RETURN {
            passed: false,
            ruleName: 'max_hashtags',
            message: `Too many hashtags: ${hashtagCount} (max: ${maxHashtags})`,
            severity: 'moderate'
        }
    END IF

    // Check required hashtags
    requiredHashtags ← getRequiredHashtags(post.agentName)

    IF requiredHashtags.length > 0 THEN
        contentLower ← post.content.toLowerCase()
        missingRequired ← []

        FOR EACH required IN requiredHashtags DO
            requiredLower ← required.toLowerCase()

            // Check if required hashtag is present (case-insensitive)
            IF NOT contentLower.includes(requiredLower) THEN
                missingRequired.append(required)
            END IF
        END FOR

        IF missingRequired.length > 0 THEN
            RETURN {
                passed: false,
                ruleName: 'required_hashtags',
                message: `Missing required hashtags: ${missingRequired.join(', ')}`,
                severity: 'moderate'
            }
        END IF
    END IF

    // Success
    RETURN {
        passed: true,
        ruleName: 'hashtags',
        message: `Valid hashtags: ${hashtagCount}`,
        severity: 'minor'
    }
END
```

### 6. Tone Check with LLM

```
ALGORITHM: checkToneWithLLM
INPUT: post (PostDraft), agentName (string)
OUTPUT: Promise<ToneCheckResult>

DEPENDENCIES:
    - anthropic (Claude API client)
    - agentContext (agent personality and style)
    - config.validation.tone_check_model (default: 'claude-sonnet-4-5-20250929')

BEGIN
    TRY
        // Load agent context for tone comparison
        agentContext ← AWAIT loadAgentContext(post.userId, agentName)

        // Build validation prompt
        systemPrompt ← buildToneCheckSystemPrompt()
        userPrompt ← buildToneCheckUserPrompt(post, agentContext)

        // Call Claude API for tone analysis
        startTime ← getCurrentTime()

        response ← AWAIT anthropic.messages.create({
            model: config.validation.tone_check_model OR 'claude-sonnet-4-5-20250929',
            max_tokens: 500,
            temperature: 0.3, // Lower temperature for consistent evaluation
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: userPrompt
                }
            ]
        })

        duration ← getCurrentTime() - startTime

        // Parse response
        responseText ← response.content[0].text

        // Expected format: JSON with { passed, severity, reason, suggestion, confidence }
        toneResult ← parseJSON(responseText)

        // Validate response structure
        IF NOT isValidToneCheckResult(toneResult) THEN
            // Fallback to permissive default
            logger.warn('Invalid tone check response format', {
                response: responseText
            })

            RETURN {
                passed: true,
                severity: 'minor',
                reason: 'Unable to validate tone - assuming valid',
                suggestion: '',
                confidence: 0.5
            }
        END IF

        // Log result
        logger.debug('Tone check completed', {
            agentName: agentName,
            passed: toneResult.passed,
            duration: duration,
            tokensUsed: response.usage.total_tokens
        })

        RETURN toneResult

    CATCH error
        // Handle API errors gracefully
        logger.error('Tone check failed', {
            error: error.message,
            agentName: agentName
        })

        // Permissive default on error
        RETURN {
            passed: true,
            severity: 'minor',
            reason: 'Tone check unavailable',
            suggestion: '',
            confidence: 0.0
        }
    END TRY
END

SUBROUTINE: buildToneCheckSystemPrompt
OUTPUT: string

BEGIN
    RETURN `You are a content quality validator. Your job is to verify that a social media post matches the expected agent personality and tone.

Analyze the post and return ONLY valid JSON in this format:
{
  "passed": boolean,
  "severity": "minor" | "moderate" | "critical",
  "reason": "Brief explanation",
  "suggestion": "How to fix if failed",
  "confidence": 0.0 to 1.0
}

Evaluation criteria:
- Does the tone match the agent's personality?
- Is the content appropriate for the platform?
- Are there any obvious quality issues?
- Does it maintain brand consistency?

Return "passed": true unless there's a clear issue.`
END

SUBROUTINE: buildToneCheckUserPrompt
INPUT: post (PostDraft), agentContext (AgentContext)
OUTPUT: string

BEGIN
    prompt ← `Validate this post:

Agent: ${post.agentName}
Expected Personality: ${agentContext.personality}
Expected Tone: ${agentContext.response_style.tone}

Post Content:
"${post.content}"

Return JSON validation result.`

    RETURN prompt
END

SUBROUTINE: isValidToneCheckResult
INPUT: result (any)
OUTPUT: boolean

BEGIN
    // Validate structure
    IF result is null OR typeof result !== 'object' THEN
        RETURN false
    END IF

    // Check required fields
    requiredFields ← ['passed', 'severity', 'reason', 'suggestion', 'confidence']

    FOR EACH field IN requiredFields DO
        IF NOT result.hasOwnProperty(field) THEN
            RETURN false
        END IF
    END FOR

    // Validate types
    IF typeof result.passed !== 'boolean' THEN
        RETURN false
    END IF

    validSeverities ← ['minor', 'moderate', 'critical']
    IF NOT validSeverities.includes(result.severity) THEN
        RETURN false
    END IF

    IF typeof result.confidence !== 'number' THEN
        RETURN false
    END IF

    IF result.confidence < 0 OR result.confidence > 1 THEN
        RETURN false
    END IF

    RETURN true
END
```

---

## RetryService Pseudocode

**File**: `/src/validation/retry-service.ts`

### Data Structures

```typescript
INTERFACE RetryStrategy:
    name: 'retry_same' | 'simplify_content' | 'alternate_agent'
    maxAttempts: number
    backoffMs: number[]

INTERFACE RetryContext:
    ticket: WorkTicket
    originalResponse: string
    attempt: number
    previousErrors: string[]
    strategy: RetryStrategy
```

### 1. Main Retry Entry Point

```
ALGORITHM: retryWithStrategy
INPUT: operation (async function), ticket (WorkTicket), attempt (number)
OUTPUT: Promise<void>

DEPENDENCIES:
    - logger (Winston)
    - config.retry (retry configuration)
    - ValidationService
    - EscalationService

CONSTANTS:
    MAX_ATTEMPTS = 3
    RETRY_STRATEGIES = ['retry_same', 'simplify_content', 'alternate_agent']
    BACKOFF_MS = [5000, 30000, 120000] // 5s, 30s, 2min

BEGIN
    // Validate attempt number
    IF attempt < 1 OR attempt > MAX_ATTEMPTS THEN
        logger.error('Invalid retry attempt', {
            attempt: attempt,
            ticketId: ticket.id
        })
        THROW new Error('Invalid retry attempt number')
    END IF

    // Log retry attempt
    logger.info('Starting retry attempt', {
        attempt: attempt,
        strategy: RETRY_STRATEGIES[attempt - 1],
        ticketId: ticket.id,
        agentName: ticket.agentName
    })

    // Select strategy based on attempt
    strategy ← RETRY_STRATEGIES[attempt - 1]

    TRY
        // Apply backoff delay
        IF attempt > 1 THEN
            backoffDelay ← BACKOFF_MS[attempt - 2]
            logger.debug('Applying backoff delay', {
                delay: backoffDelay,
                attempt: attempt
            })

            AWAIT sleep(backoffDelay)
        END IF

        // Execute retry based on strategy
        CASE strategy OF
            'retry_same':
                // Simple retry with same parameters
                logger.debug('Retry strategy: retry_same')
                AWAIT operation()

            'simplify_content':
                // Simplify and retry
                logger.debug('Retry strategy: simplify_content')

                // Modify ticket payload to request simpler response
                ticket.payload.simplified ← true
                ticket.payload.maxLength ← Math.floor(ticket.payload.maxLength * 0.7)

                AWAIT operation()

            'alternate_agent':
                // Try different agent
                logger.debug('Retry strategy: alternate_agent')

                alternateAgent ← AWAIT selectAlternateAgent(ticket)

                IF alternateAgent === null THEN
                    logger.warn('No alternate agent available', {
                        originalAgent: ticket.agentName
                    })
                    THROW new Error('No alternate agent available')
                END IF

                ticket.agentName ← alternateAgent

                logger.info('Switching to alternate agent', {
                    originalAgent: ticket.agentName,
                    newAgent: alternateAgent
                })

                AWAIT operation()
        END CASE

        // Success - log and return
        logger.info('Retry successful', {
            attempt: attempt,
            strategy: strategy,
            ticketId: ticket.id
        })

        RETURN

    CATCH error
        // Retry failed
        logger.error('Retry attempt failed', {
            attempt: attempt,
            strategy: strategy,
            error: error.message,
            ticketId: ticket.id
        })

        // Store error for audit trail
        AWAIT logRetryError(ticket, attempt, strategy, error)

        // Check if we should try again
        IF attempt < MAX_ATTEMPTS THEN
            // Recursive retry
            logger.info('Attempting next retry', {
                nextAttempt: attempt + 1,
                ticketId: ticket.id
            })

            RETURN AWAIT retryWithStrategy(operation, ticket, attempt + 1)
        ELSE
            // All retries exhausted - escalate
            logger.error('All retry attempts exhausted', {
                attempts: attempt,
                ticketId: ticket.id
            })

            AWAIT escalateToUser(ticket, error, attempt)
            THROW error
        END IF
    END TRY
END
```

### 2. Apply Backoff

```
ALGORITHM: applyBackoff
INPUT: attempt (number)
OUTPUT: Promise<void>

DEPENDENCIES:
    - sleep utility function

CONSTANTS:
    BASE_DELAY_MS = 5000 // 5 seconds
    MAX_DELAY_MS = 300000 // 5 minutes
    BACKOFF_MULTIPLIER = 6

BEGIN
    // Calculate exponential backoff with attempt
    // Attempt 1: 5s, Attempt 2: 30s, Attempt 3: 120s (2min)

    IF attempt <= 0 THEN
        RETURN // No delay for first attempt
    END IF

    // Use predefined delays for predictability
    delays ← [0, 5000, 30000, 120000]

    IF attempt >= delays.length THEN
        delayMs ← MAX_DELAY_MS
    ELSE
        delayMs ← delays[attempt]
    END IF

    logger.debug('Applying exponential backoff', {
        attempt: attempt,
        delayMs: delayMs
    })

    AWAIT sleep(delayMs)
END

SUBROUTINE: sleep
INPUT: ms (number)
OUTPUT: Promise<void>

BEGIN
    RETURN new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
END
```

### 3. Simplify Content

```
ALGORITHM: simplifyContent
INPUT: content (string)
OUTPUT: PostContent

DEPENDENCIES:
    - logger

BEGIN
    logger.debug('Simplifying content', {
        originalLength: content.length
    })

    simplified ← content

    // Step 1: Remove emojis
    emojiRegex ← /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu
    simplified ← simplified.replace(emojiRegex, '')

    // Step 2: Remove extra whitespace
    simplified ← simplified.replace(/\s+/g, ' ').trim()

    // Step 3: Remove special formatting characters
    simplified ← simplified.replace(/[*_~`]/g, '')

    // Step 4: Limit hashtags to 2
    hashtagRegex ← /#[a-zA-Z0-9_]+/g
    hashtags ← simplified.matchAll(hashtagRegex)
    hashtagArray ← Array.from(hashtags)

    IF hashtagArray.length > 2 THEN
        // Keep only first 2 hashtags
        keptHashtags ← hashtagArray.slice(0, 2).map(m => m[0])

        // Remove all hashtags
        simplified ← simplified.replace(hashtagRegex, '')

        // Append kept hashtags at end
        simplified ← simplified.trim() + ' ' + keptHashtags.join(' ')
    END IF

    // Step 5: Truncate if still too long (70% of max)
    maxSimplifiedLength ← 200 // Conservative length for retry

    IF simplified.length > maxSimplifiedLength THEN
        // Find last complete word before limit
        truncated ← simplified.substring(0, maxSimplifiedLength)
        lastSpace ← truncated.lastIndexOf(' ')

        IF lastSpace > maxSimplifiedLength * 0.8 THEN
            // Use last space to keep word boundary
            simplified ← truncated.substring(0, lastSpace) + '...'
        ELSE
            // Hard truncate
            simplified ← truncated + '...'
        END IF
    END IF

    logger.debug('Content simplified', {
        originalLength: content.length,
        simplifiedLength: simplified.length
    })

    RETURN {
        text: simplified,
        simplified: true,
        originalLength: content.length
    }
END
```

### 4. Select Alternate Agent

```
ALGORITHM: selectAlternateAgent
INPUT: ticket (WorkTicket)
OUTPUT: Promise<string | null>

DEPENDENCIES:
    - db (DatabaseManager)
    - logger

BEGIN
    logger.debug('Selecting alternate agent', {
        originalAgent: ticket.agentName,
        userId: ticket.userId
    })

    TRY
        // Query available agents for this user
        query ← `
            SELECT uac.agent_template, uac.custom_name
            FROM user_agent_customizations uac
            JOIN system_agent_templates sat
                ON sat.name = uac.agent_template
            WHERE uac.user_id = $1
                AND uac.enabled = true
                AND uac.agent_template != $2
            ORDER BY RANDOM()
            LIMIT 1
        `

        result ← AWAIT db.query(query, [ticket.userId, ticket.agentName])

        IF result.rows.length === 0 THEN
            // No alternate agent available
            logger.warn('No alternate agent found', {
                userId: ticket.userId,
                originalAgent: ticket.agentName
            })

            RETURN null
        END IF

        alternateAgent ← result.rows[0].agent_template

        logger.info('Alternate agent selected', {
            originalAgent: ticket.agentName,
            alternateAgent: alternateAgent
        })

        RETURN alternateAgent

    CATCH error
        logger.error('Failed to select alternate agent', {
            error: error.message,
            userId: ticket.userId
        })

        RETURN null
    END TRY
END
```

### 5. Log Retry Error

```
ALGORITHM: logRetryError
INPUT: ticket (WorkTicket), attempt (number), strategy (string), error (Error)
OUTPUT: Promise<void>

DEPENDENCIES:
    - db (DatabaseManager)
    - logger

BEGIN
    TRY
        // Insert error log entry
        query ← `
            INSERT INTO error_log (
                agent_name, error_type, error_message,
                context, retry_count, resolved, created_at
            ) VALUES ($1, $2, $3, $4, $5, false, NOW())
        `

        context ← {
            ticketId: ticket.id,
            userId: ticket.userId,
            feedItemId: ticket.payload.feedItemId,
            strategy: strategy,
            attempt: attempt
        }

        AWAIT db.query(query, [
            ticket.agentName,
            'retry_failure',
            error.message,
            JSON.stringify(context),
            attempt
        ])

        logger.debug('Retry error logged', {
            ticketId: ticket.id,
            attempt: attempt
        })

    CATCH dbError
        // Don't fail the retry process if logging fails
        logger.error('Failed to log retry error', {
            error: dbError.message,
            originalError: error.message
        })
    END TRY
END
```

---

## EscalationService Pseudocode

**File**: `/src/validation/escalation-service.ts`

### Data Structures

```typescript
INTERFACE EscalationAlert:
    ticketId: string
    userId: string
    agentName: string
    errorType: string
    errorMessage: string
    attempts: number
    timestamp: Date
    savedDraft?: string
    context: object

INTERFACE SystemPost:
    type: 'error_alert' | 'warning' | 'info'
    userId: string
    message: string
    metadata: object
    createdAt: Date
```

### 1. Escalate to User

```
ALGORITHM: escalateToUser
INPUT: ticket (WorkTicket), error (Error), attempts (number)
OUTPUT: Promise<void>

DEPENDENCIES:
    - logger (Winston)
    - db (DatabaseManager)
    - notificationService (email/push notifications)

BEGIN
    logger.warn('Escalating issue to user', {
        ticketId: ticket.id,
        userId: ticket.userId,
        agentName: ticket.agentName,
        attempts: attempts
    })

    TRY
        // Create escalation alert object
        alert ← {
            ticketId: ticket.id,
            userId: ticket.userId,
            agentName: ticket.agentName,
            errorType: error.name,
            errorMessage: error.message,
            attempts: attempts,
            timestamp: new Date(),
            context: {
                feedItemId: ticket.payload.feedItemId,
                retryStrategies: ['retry_same', 'simplify_content', 'alternate_agent']
            }
        }

        // Store saved draft if available
        IF ticket.payload.lastAttemptContent THEN
            alert.savedDraft ← ticket.payload.lastAttemptContent
        END IF

        // STEP 1: Create system post (visible in UI)
        AWAIT createSystemPost(alert)

        // STEP 2: Log error to database
        AWAIT logError(error, {
            ticketId: ticket.id,
            userId: ticket.userId,
            agentName: ticket.agentName,
            escalated: true
        })

        // STEP 3: Send user notification
        AWAIT sendNotification(
            ticket.userId,
            `Agent ${ticket.agentName} failed to respond after ${attempts} attempts`
        )

        // STEP 4: Update ticket status
        AWAIT updateTicketStatus(ticket.id, 'failed_escalated')

        logger.info('Escalation completed', {
            ticketId: ticket.id,
            userId: ticket.userId
        })

    CATCH escalationError
        // Critical - escalation itself failed
        logger.error('Escalation process failed', {
            error: escalationError.message,
            originalError: error.message,
            ticketId: ticket.id
        })

        // Last resort: try to log to database at least
        TRY
            AWAIT db.query(`
                INSERT INTO error_log (
                    agent_name, error_type, error_message,
                    context, retry_count, resolved
                ) VALUES ($1, 'escalation_failure', $2, $3, $4, false)
            `, [
                ticket.agentName,
                'Escalation failed: ' + escalationError.message,
                JSON.stringify({ ticketId: ticket.id, originalError: error.message }),
                attempts
            ])
        CATCH finalError
            // Absolutely nothing we can do - log to stderr
            console.error('CRITICAL: Complete escalation failure', {
                ticketId: ticket.id,
                errors: [error.message, escalationError.message, finalError.message]
            })
        END TRY
    END TRY
END
```

### 2. Create System Post

```
ALGORITHM: createSystemPost
INPUT: alert (EscalationAlert)
OUTPUT: Promise<void>

DEPENDENCIES:
    - db (DatabaseManager)
    - logger

BEGIN
    logger.debug('Creating system post', {
        userId: alert.userId,
        ticketId: alert.ticketId
    })

    TRY
        // Build user-friendly message
        message ← buildEscalationMessage(alert)

        // Insert system post into database
        query ← `
            INSERT INTO posts (
                user_id, agent_name, content, post_type,
                metadata, created_at, visibility
            ) VALUES ($1, 'system', $2, 'error_alert', $3, NOW(), 'private')
            RETURNING id
        `

        metadata ← {
            errorType: alert.errorType,
            ticketId: alert.ticketId,
            agentName: alert.agentName,
            attempts: alert.attempts,
            timestamp: alert.timestamp.toISOString(),
            escalated: true
        }

        // Add saved draft if available
        IF alert.savedDraft THEN
            metadata.savedDraft ← alert.savedDraft
        END IF

        result ← AWAIT db.query(query, [
            alert.userId,
            message,
            JSON.stringify(metadata)
        ])

        postId ← result.rows[0].id

        logger.info('System post created', {
            postId: postId,
            userId: alert.userId,
            ticketId: alert.ticketId
        })

    CATCH error
        logger.error('Failed to create system post', {
            error: error.message,
            alert: alert
        })

        THROW error
    END TRY
END

SUBROUTINE: buildEscalationMessage
INPUT: alert (EscalationAlert)
OUTPUT: string

BEGIN
    message ← `⚠️ Action Required: Agent Response Failed

Agent: ${alert.agentName}
Error: ${alert.errorMessage}
Attempts: ${alert.attempts}
Time: ${alert.timestamp.toLocaleString()}

Your agent was unable to respond to a feed item after multiple retry attempts.
`

    IF alert.savedDraft THEN
        message += `

Last attempted response:
"${alert.savedDraft}"

You can manually review and post this if appropriate.`
    END IF

    message += `

What happened:
1. Retry with same parameters - Failed
2. Retry with simplified content - Failed
3. Retry with alternate agent - Failed

This feed item has been marked as failed and will not be retried automatically.`

    RETURN message
END
```

### 3. Log Error

```
ALGORITHM: logError
INPUT: error (Error), context (object)
OUTPUT: Promise<void>

DEPENDENCIES:
    - db (DatabaseManager)
    - logger (Winston)

BEGIN
    TRY
        // Determine error type
        errorType ← determineErrorType(error)

        // Extract stack trace (first 5 lines for brevity)
        stackTrace ← error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : ''

        // Insert into error_log table
        query ← `
            INSERT INTO error_log (
                agent_name, error_type, error_message,
                context, retry_count, resolved, created_at
            ) VALUES ($1, $2, $3, $4, $5, false, NOW())
            RETURNING id
        `

        contextWithStack ← {
            ...context,
            stackTrace: stackTrace,
            errorName: error.name
        }

        result ← AWAIT db.query(query, [
            context.agentName OR 'system',
            errorType,
            error.message,
            JSON.stringify(contextWithStack),
            context.attempts OR 0
        ])

        errorId ← result.rows[0].id

        // Log to Winston as well
        logger.error('Error logged to database', {
            errorId: errorId,
            errorType: errorType,
            message: error.message,
            context: context
        })

    CATCH dbError
        // If database logging fails, at least log to Winston
        logger.error('Failed to log error to database', {
            dbError: dbError.message,
            originalError: error.message,
            context: context
        })
    END TRY
END

SUBROUTINE: determineErrorType
INPUT: error (Error)
OUTPUT: string

BEGIN
    // Map error types to categories
    errorTypeMap ← {
        'ValidationError': 'validation_failure',
        'RateLimitError': 'rate_limit_exceeded',
        'APIError': 'api_failure',
        'DatabaseError': 'database_failure',
        'TimeoutError': 'timeout',
        'NetworkError': 'network_failure'
    }

    // Check error name
    IF errorTypeMap.hasOwnProperty(error.name) THEN
        RETURN errorTypeMap[error.name]
    END IF

    // Check error message for keywords
    messageLower ← error.message.toLowerCase()

    IF messageLower.includes('timeout') THEN
        RETURN 'timeout'
    ELSE IF messageLower.includes('network') OR messageLower.includes('connection') THEN
        RETURN 'network_failure'
    ELSE IF messageLower.includes('validation') THEN
        RETURN 'validation_failure'
    ELSE IF messageLower.includes('rate limit') THEN
        RETURN 'rate_limit_exceeded'
    ELSE
        RETURN 'unknown_error'
    END IF
END
```

### 4. Send Notification

```
ALGORITHM: sendNotification
INPUT: userId (string), message (string)
OUTPUT: Promise<void>

DEPENDENCIES:
    - db (DatabaseManager)
    - notificationService (email/push service)
    - logger

BEGIN
    logger.debug('Sending notification to user', {
        userId: userId,
        messageLength: message.length
    })

    TRY
        // STEP 1: Get user notification preferences
        prefsQuery ← `
            SELECT email, notification_preferences
            FROM users
            WHERE id = $1
        `

        userResult ← AWAIT db.query(prefsQuery, [userId])

        IF userResult.rows.length === 0 THEN
            logger.warn('User not found for notification', {
                userId: userId
            })
            RETURN
        END IF

        user ← userResult.rows[0]
        prefs ← user.notification_preferences OR {}

        // STEP 2: Check if user wants escalation notifications
        IF prefs.errorAlerts === false THEN
            logger.debug('User has disabled error alert notifications', {
                userId: userId
            })
            RETURN
        END IF

        // STEP 3: Create notification record
        notifQuery ← `
            INSERT INTO notifications (
                user_id, type, message, read, created_at
            ) VALUES ($1, 'error_alert', $2, false, NOW())
            RETURNING id
        `

        notifResult ← AWAIT db.query(notifQuery, [userId, message])
        notificationId ← notifResult.rows[0].id

        // STEP 4: Send email if email notifications enabled
        IF prefs.emailNotifications === true AND user.email THEN
            TRY
                AWAIT notificationService.sendEmail({
                    to: user.email,
                    subject: 'Agent Error Alert',
                    body: message,
                    priority: 'high'
                })

                logger.info('Email notification sent', {
                    userId: userId,
                    notificationId: notificationId
                })
            CATCH emailError
                logger.warn('Failed to send email notification', {
                    error: emailError.message,
                    userId: userId
                })
                // Don't fail - notification still stored in DB
            END TRY
        END IF

        // STEP 5: Send push notification if enabled
        IF prefs.pushNotifications === true THEN
            TRY
                AWAIT notificationService.sendPush({
                    userId: userId,
                    title: 'Agent Error Alert',
                    body: message,
                    priority: 'high'
                })

                logger.info('Push notification sent', {
                    userId: userId,
                    notificationId: notificationId
                })
            CATCH pushError
                logger.warn('Failed to send push notification', {
                    error: pushError.message,
                    userId: userId
                })
                // Don't fail
            END TRY
        END IF

    CATCH error
        logger.error('Notification failed', {
            error: error.message,
            userId: userId
        })
        // Don't throw - notification is not critical
    END TRY
END
```

### 5. Update Ticket Status

```
ALGORITHM: updateTicketStatus
INPUT: ticketId (string), status (string)
OUTPUT: Promise<void>

DEPENDENCIES:
    - db (DatabaseManager)
    - logger

BEGIN
    TRY
        query ← `
            UPDATE work_queue
            SET status = $1,
                updated_at = NOW()
            WHERE id = $2
        `

        AWAIT db.query(query, [status, ticketId])

        logger.debug('Ticket status updated', {
            ticketId: ticketId,
            status: status
        })

    CATCH error
        logger.error('Failed to update ticket status', {
            error: error.message,
            ticketId: ticketId,
            status: status
        })

        THROW error
    END TRY
END
```

---

## PostValidator Pseudocode

**File**: `/src/validation/post-validator.ts`

### Main Orchestration Class

```
ALGORITHM: validateAndPost
INPUT: response (GeneratedResponse), ticket (WorkTicket)
OUTPUT: Promise<void>

DEPENDENCIES:
    - validationService (ValidationService)
    - retryService (RetryService)
    - escalationService (EscalationService)
    - platformAPI (posting API)
    - logger (Winston)

BEGIN
    logger.info('Starting post validation and submission', {
        ticketId: ticket.id,
        agentName: ticket.agentName,
        contentLength: response.content.length
    })

    TRY
        // STEP 1: Validate response content
        postDraft ← {
            content: response.content,
            agentName: ticket.agentName,
            userId: ticket.userId,
            feedItemId: ticket.payload.feedItemId,
            metadata: response.metadata
        }

        validationResult ← AWAIT validationService.validatePost(postDraft)

        // STEP 2: Handle validation result
        IF validationResult.approved THEN
            // Validation passed - proceed to post
            logger.info('Validation passed, posting content', {
                ticketId: ticket.id
            })

            AWAIT platformAPI.post({
                content: response.content,
                agentName: ticket.agentName,
                inReplyTo: ticket.payload.feedItemId,
                userId: ticket.userId
            })

            // Success - update ticket and metrics
            AWAIT completeTicket(ticket, response)

            logger.info('Post published successfully', {
                ticketId: ticket.id,
                agentName: ticket.agentName
            })

            RETURN

        ELSE
            // Validation failed
            logger.warn('Validation failed', {
                ticketId: ticket.id,
                reason: validationResult.reason,
                canRetry: validationResult.canRetry
            })

            AWAIT handleValidationFailure(validationResult, ticket, response)
        END IF

    CATCH error
        logger.error('Post validation/submission failed', {
            error: error.message,
            ticketId: ticket.id
        })

        // Attempt retry
        AWAIT handlePostError(error, ticket, response)
    END TRY
END
```

### Handle Validation Failure

```
ALGORITHM: handleValidationFailure
INPUT: result (ValidationResult), ticket (WorkTicket), response (GeneratedResponse)
OUTPUT: Promise<void>

DEPENDENCIES:
    - retryService
    - escalationService
    - logger

BEGIN
    logger.info('Handling validation failure', {
        ticketId: ticket.id,
        reason: result.reason,
        severity: result.severity,
        canRetry: result.canRetry
    })

    // Check if retry is possible
    IF NOT result.canRetry OR result.severity === 'critical' THEN
        // Cannot retry - escalate immediately
        logger.warn('Validation failure cannot be retried', {
            ticketId: ticket.id,
            severity: result.severity
        })

        error ← new Error('Validation failed: ' + result.reason)
        AWAIT escalationService.escalateToUser(ticket, error, 1)

        RETURN
    END IF

    // Store validation failure context
    ticket.payload.lastAttemptContent ← response.content
    ticket.payload.validationErrors ← result.checks

    // Attempt retry with suggestions
    IF result.suggestions.length > 0 THEN
        // Add suggestions to ticket context for next attempt
        ticket.payload.validationSuggestions ← result.suggestions

        logger.debug('Added validation suggestions to ticket', {
            ticketId: ticket.id,
            suggestions: result.suggestions
        })
    END IF

    // Execute retry
    AWAIT executeRetry(ticket, 1)
END
```

### Execute Retry

```
ALGORITHM: executeRetry
INPUT: ticket (WorkTicket), attempt (number)
OUTPUT: Promise<void>

DEPENDENCIES:
    - retryService
    - agentWorker
    - validationService
    - logger

BEGIN
    logger.info('Executing retry', {
        ticketId: ticket.id,
        attempt: attempt
    })

    // Define retry operation
    retryOperation ← ASYNC FUNCTION() BEGIN
        // Re-execute agent worker
        newResponse ← AWAIT agentWorker.executeTicket(ticket)

        IF newResponse.success THEN
            // Validate new response
            postDraft ← {
                content: newResponse.output.responseContent,
                agentName: ticket.agentName,
                userId: ticket.userId,
                feedItemId: ticket.payload.feedItemId,
                metadata: {}
            }

            validationResult ← AWAIT validationService.validatePost(postDraft)

            IF validationResult.approved THEN
                // Success - post it
                AWAIT platformAPI.post({
                    content: newResponse.output.responseContent,
                    agentName: ticket.agentName,
                    inReplyTo: ticket.payload.feedItemId,
                    userId: ticket.userId
                })

                RETURN
            ELSE
                // Still failing validation
                THROW new Error('Validation failed after retry: ' + validationResult.reason)
            END IF
        ELSE
            // Worker execution failed
            THROW newResponse.error
        END IF
    END

    // Execute with retry service
    TRY
        AWAIT retryService.retryWithStrategy(retryOperation, ticket, attempt)

        logger.info('Retry successful', {
            ticketId: ticket.id,
            attempt: attempt
        })

    CATCH retryError
        logger.error('Retry failed', {
            ticketId: ticket.id,
            attempt: attempt,
            error: retryError.message
        })

        // This will be caught by retryService and escalated if needed
        THROW retryError
    END TRY
END
```

### Handle Post Error

```
ALGORITHM: handlePostError
INPUT: error (Error), ticket (WorkTicket), response (GeneratedResponse)
OUTPUT: Promise<void>

DEPENDENCIES:
    - retryService
    - escalationService
    - logger

BEGIN
    logger.error('Handling post error', {
        ticketId: ticket.id,
        error: error.message
    })

    // Categorize error
    errorCategory ← categorizeError(error)

    CASE errorCategory OF
        'rate_limit':
            // Rate limit - retry with backoff
            logger.warn('Rate limit hit, will retry', {
                ticketId: ticket.id
            })

            AWAIT retryService.retryWithStrategy(
                () => platformAPI.post({
                    content: response.content,
                    agentName: ticket.agentName,
                    inReplyTo: ticket.payload.feedItemId,
                    userId: ticket.userId
                }),
                ticket,
                1
            )

        'network':
            // Network error - retry
            logger.warn('Network error, will retry', {
                ticketId: ticket.id
            })

            AWAIT executeRetry(ticket, 1)

        'authentication':
            // Auth error - escalate immediately (can't be retried)
            logger.error('Authentication error, escalating', {
                ticketId: ticket.id
            })

            AWAIT escalationService.escalateToUser(ticket, error, 0)

        'validation':
            // Validation error - already handled above
            AWAIT executeRetry(ticket, 1)

        default:
            // Unknown error - attempt retry once, then escalate
            logger.error('Unknown error type', {
                ticketId: ticket.id,
                error: error.message
            })

            TRY
                AWAIT executeRetry(ticket, 1)
            CATCH retryError
                AWAIT escalationService.escalateToUser(ticket, retryError, 1)
            END TRY
    END CASE
END

SUBROUTINE: categorizeError
INPUT: error (Error)
OUTPUT: string

BEGIN
    errorMessage ← error.message.toLowerCase()

    // Check error type and message
    IF error.name === 'RateLimitError' OR errorMessage.includes('rate limit') THEN
        RETURN 'rate_limit'
    ELSE IF error.name === 'NetworkError' OR errorMessage.includes('network') OR errorMessage.includes('timeout') THEN
        RETURN 'network'
    ELSE IF error.name === 'AuthenticationError' OR errorMessage.includes('auth') OR errorMessage.includes('unauthorized') THEN
        RETURN 'authentication'
    ELSE IF error.name === 'ValidationError' OR errorMessage.includes('validation') THEN
        RETURN 'validation'
    ELSE
        RETURN 'unknown'
    END IF
END
```

### Complete Ticket

```
ALGORITHM: completeTicket
INPUT: ticket (WorkTicket), response (GeneratedResponse)
OUTPUT: Promise<void>

DEPENDENCIES:
    - db (DatabaseManager)
    - logger

BEGIN
    TRY
        // Update ticket status to completed
        ticketQuery ← `
            UPDATE work_queue
            SET status = 'completed',
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
        `

        AWAIT db.query(ticketQuery, [ticket.id])

        // Update metrics
        metricsQuery ← `
            UPDATE avi_state
            SET tickets_processed = tickets_processed + 1,
                last_success_at = NOW()
            WHERE id = 1
        `

        AWAIT db.query(metricsQuery)

        logger.info('Ticket completed successfully', {
            ticketId: ticket.id,
            agentName: ticket.agentName,
            tokensUsed: response.tokensUsed,
            duration: response.durationMs
        })

    CATCH error
        logger.error('Failed to mark ticket as completed', {
            error: error.message,
            ticketId: ticket.id
        })

        // Don't throw - the post was successful even if DB update failed
    END TRY
END
```

---

## Data Structures

### Comprehensive Type Definitions

```typescript
// Validation Types
TYPE ValidationResult = {
    approved: boolean
    canRetry: boolean
    reason: string
    severity: 'minor' | 'moderate' | 'critical'
    suggestions: string[]
    checks: {
        length?: RuleCheckResult
        prohibitedWords?: RuleCheckResult
        mentions?: RuleCheckResult
        hashtags?: RuleCheckResult
        tone?: ToneCheckResult
    }
}

TYPE RuleCheckResult = {
    passed: boolean
    ruleName: string
    message: string
    severity: 'minor' | 'moderate' | 'critical'
}

TYPE ToneCheckResult = {
    passed: boolean
    severity: 'minor' | 'moderate' | 'critical'
    reason: string
    suggestion: string
    confidence: number // 0.0 to 1.0
}

// Post Types
TYPE PostDraft = {
    content: string
    agentName: string
    userId: string
    feedItemId: string
    metadata: {
        tokensUsed?: number
        durationMs?: number
        model?: string
        simplified?: boolean
    }
}

TYPE PostContent = {
    text: string
    simplified: boolean
    originalLength: number
}

// Retry Types
TYPE RetryStrategy = {
    name: 'retry_same' | 'simplify_content' | 'alternate_agent'
    maxAttempts: number
    backoffMs: number[]
}

TYPE RetryContext = {
    ticket: WorkTicket
    originalResponse: string
    attempt: number
    previousErrors: string[]
    strategy: RetryStrategy
}

// Escalation Types
TYPE EscalationAlert = {
    ticketId: string
    userId: string
    agentName: string
    errorType: string
    errorMessage: string
    attempts: number
    timestamp: Date
    savedDraft?: string
    context: {
        feedItemId: string
        retryStrategies: string[]
        stackTrace?: string
    }
}

TYPE SystemPost = {
    id: string
    userId: string
    type: 'error_alert' | 'warning' | 'info'
    message: string
    metadata: object
    read: boolean
    createdAt: Date
}

// Configuration Types
TYPE ValidationConfig = {
    tone_check_model: string
    tone_check_timeout_ms: number
    enable_llm_validation: boolean
    max_validation_retries: number
}

TYPE RetryConfig = {
    max_attempts: number
    strategies: RetryStrategy[]
    backoff_multiplier: number
    max_backoff_ms: number
}
```

---

## Configuration Constants

### Validation Configuration

```typescript
CONSTANTS ValidationConfig:
    // Rule-based validation
    DEFAULT_MIN_LENGTH = 50
    DEFAULT_MAX_LENGTH = 280
    MAX_MENTIONS_PER_POST = 3
    MAX_HASHTAGS_PER_POST = 5

    // LLM validation
    TONE_CHECK_MODEL = 'claude-sonnet-4-5-20250929'
    TONE_CHECK_MAX_TOKENS = 500
    TONE_CHECK_TEMPERATURE = 0.3
    TONE_CHECK_TIMEOUT_MS = 5000

    // Feature flags
    ENABLE_LLM_VALIDATION = true
    ENABLE_MENTION_VALIDATION = true
    ENABLE_HASHTAG_VALIDATION = true
```

### Retry Configuration

```typescript
CONSTANTS RetryConfig:
    MAX_ATTEMPTS = 3

    STRATEGIES = [
        {
            name: 'retry_same',
            maxAttempts: 1,
            backoffMs: [0]
        },
        {
            name: 'simplify_content',
            maxAttempts: 1,
            backoffMs: [5000]
        },
        {
            name: 'alternate_agent',
            maxAttempts: 1,
            backoffMs: [30000]
        }
    ]

    BACKOFF_MS = [0, 5000, 30000, 120000]
    MAX_BACKOFF_MS = 300000 // 5 minutes
    BACKOFF_MULTIPLIER = 6
```

### Escalation Configuration

```typescript
CONSTANTS EscalationConfig:
    ENABLE_EMAIL_NOTIFICATIONS = true
    ENABLE_PUSH_NOTIFICATIONS = true
    ENABLE_SYSTEM_POSTS = true

    NOTIFICATION_PRIORITY = 'high'
    SYSTEM_POST_VISIBILITY = 'private'

    ERROR_LOG_RETENTION_DAYS = 90
    RESOLVED_ERROR_RETENTION_DAYS = 30
```

---

## Integration Points

### 1. AgentWorker Integration

**Location**: `/src/worker/agent-worker.ts`

```typescript
// In executeTicket method, after response generation:

MODIFICATION POINT:
  // Old code:
  return {
    success: true,
    output: { responseId },
    tokensUsed: response.tokensUsed,
    duration
  }

  // New code:
  // Validate and post using Phase 4 validator
  AWAIT postValidator.validateAndPost(response, ticket)

  return {
    success: true,
    output: { responseId },
    tokensUsed: response.tokensUsed,
    duration
  }
```

### 2. Orchestrator Integration

**Location**: `/src/avi/orchestrator.ts`

```typescript
// In worker completion handler:

MODIFICATION POINT:
  private async onWorkerComplete(workerId: string, result: WorkerResult) {
    // Old code handles success/failure

    // New code: errors are already escalated by PostValidator
    // Just update metrics
    IF result.success THEN
      this.metrics.successfulPosts++
    ELSE
      this.metrics.failedPosts++
    END IF
  }
```

### 3. Database Schema

**Required Tables**:

```sql
-- Already exists from Phase 1
TABLE error_log (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(50),
    error_type VARCHAR(50),
    error_message TEXT,
    context JSONB,
    retry_count INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- New table for system posts
TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    agent_name VARCHAR(50),
    content TEXT NOT NULL,
    post_type VARCHAR(20) DEFAULT 'normal',
    metadata JSONB,
    visibility VARCHAR(20) DEFAULT 'public',
    created_at TIMESTAMP DEFAULT NOW()
);

-- New table for notifications
TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Configuration File

**Location**: `/src/config/validation.config.ts`

```typescript
export const validationConfig = {
    rules: {
        minLength: process.env.MIN_POST_LENGTH || 50,
        maxLength: process.env.MAX_POST_LENGTH || 280,
        maxMentions: process.env.MAX_MENTIONS || 3,
        maxHashtags: process.env.MAX_HASHTAGS || 5
    },
    llm: {
        model: process.env.TONE_CHECK_MODEL || 'claude-sonnet-4-5-20250929',
        maxTokens: 500,
        temperature: 0.3,
        timeout: 5000,
        enabled: process.env.ENABLE_LLM_VALIDATION !== 'false'
    },
    retry: {
        maxAttempts: 3,
        backoffMs: [0, 5000, 30000, 120000],
        strategies: ['retry_same', 'simplify_content', 'alternate_agent']
    },
    escalation: {
        enableEmail: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false',
        enablePush: process.env.ENABLE_PUSH_NOTIFICATIONS !== 'false',
        enableSystemPosts: true
    }
}
```

### 5. Dependency Injection

**Factory Pattern**:

```typescript
// In orchestrator-factory.ts or similar

FUNCTION createPostValidator(
    db: DatabaseManager,
    anthropic: Anthropic,
    platformAPI: PlatformAPI,
    config: ValidationConfig
): PostValidator {

    const validationService = new ValidationService(
        anthropic,
        config,
        logger
    )

    const retryService = new RetryService(
        db,
        config.retry,
        logger
    )

    const escalationService = new EscalationService(
        db,
        notificationService,
        logger
    )

    return new PostValidator(
        validationService,
        retryService,
        escalationService,
        platformAPI,
        logger
    )
}
```

---

## Error Handling Patterns

### Pattern 1: Progressive Validation

```
PATTERN: Validate progressively, fail fast

STEPS:
1. Run cheap rule-based checks first (length, prohibited words)
2. If rule checks fail, return immediately - no expensive LLM call
3. Only run LLM tone check if all rules pass
4. Log all validation steps for debugging
```

### Pattern 2: Graceful LLM Failure

```
PATTERN: Never fail validation due to LLM errors

IMPLEMENTATION:
IF LLM tone check fails due to error THEN
    Log error
    Assume tone is valid (permissive default)
    Continue with post
END IF

RATIONALE:
- LLM unavailability should not block posting
- Rule-based checks are still enforced
- System remains operational during API outages
```

### Pattern 3: Retry with Context

```
PATTERN: Each retry knows about previous attempts

IMPLEMENTATION:
Store in ticket.payload:
- lastAttemptContent: string
- validationErrors: object
- validationSuggestions: string[]
- attempt: number

This allows:
- Agents to learn from previous failures
- Better error messages
- Smarter retry strategies
```

### Pattern 4: Escalation as Last Resort

```
PATTERN: Escalate only after all retries exhausted

DECISION TREE:
Validation failed
├─ severity: minor → retry_same
├─ severity: moderate → simplify_content
└─ severity: critical → escalate immediately

Retry 1 failed
└─ Try retry_same

Retry 2 failed
└─ Try simplify_content

Retry 3 failed
└─ Try alternate_agent

All retries failed
└─ Escalate to user
```

### Pattern 5: Audit Trail

```
PATTERN: Log everything for debugging

WHAT TO LOG:
- Validation start/end with duration
- Each validation check result
- Retry attempts with strategy
- Error details with stack traces
- Escalation events
- User notifications sent

WHERE TO LOG:
- Winston logger (application logs)
- error_log table (persistent audit)
- System posts (user visibility)
```

---

## Complexity Analysis

### ValidationService

**validatePost()**
- **Time Complexity**: O(n) where n = content length
  - Length check: O(1)
  - Prohibited words: O(p × n) where p = prohibited word count
  - Mentions: O(m) where m = mention count (typically < 5)
  - Hashtags: O(h) where h = hashtag count (typically < 10)
  - Tone check: O(1) API call (async, ~1-2s)
  - Total: O(n) dominated by content scanning

- **Space Complexity**: O(n)
  - ValidationResult object: O(1)
  - Checks map: O(1)
  - Temporary arrays for matches: O(m + h)
  - Total: O(n) for content storage

**checkLength()**
- **Time**: O(1) - simple length comparison
- **Space**: O(1)

**checkProhibitedWords()**
- **Time**: O(p × n) where p = word count, n = content length
- **Space**: O(p) for found words array
- **Optimization**: Use hash set for O(1) word lookup → O(n)

**checkMentions()**
- **Time**: O(n + m) where m = mention count
- **Space**: O(m)

**checkHashtags()**
- **Time**: O(n + h) where h = hashtag count
- **Space**: O(h)

**checkToneWithLLM()**
- **Time**: O(1) async call (wall-clock time: ~1-2s)
- **Token Cost**: ~200-500 tokens (prompt + response)
- **Space**: O(1)

### RetryService

**retryWithStrategy()**
- **Time Complexity**: O(r × w) where:
  - r = retry attempts (max 3)
  - w = worker execution time
  - Recursive calls: max 3 levels
  - Total: O(3 × w) = O(w)

- **Space Complexity**: O(r) for call stack
  - Max recursion depth: 3
  - Space: O(1) per call
  - Total: O(3) = O(1)

**simplifyContent()**
- **Time**: O(n) where n = content length
  - Regex replacements: O(n)
  - Hashtag manipulation: O(h)
  - Truncation: O(1)
  - Total: O(n)

- **Space**: O(n) for simplified content

**selectAlternateAgent()**
- **Time**: O(1) - single database query with limit 1
- **Space**: O(1)

### EscalationService

**escalateToUser()**
- **Time Complexity**: O(1)
  - Database inserts: O(1) per insert
  - Notification sends: O(1) async calls
  - Total steps: constant (5 steps)
  - Total: O(1)

- **Space Complexity**: O(n) where n = error message length
  - EscalationAlert object: O(n)
  - System post content: O(n)

**createSystemPost()**
- **Time**: O(1) - single database insert
- **Space**: O(n) for message content

**sendNotification()**
- **Time**: O(1) - two async API calls (email + push)
- **Space**: O(1)

### PostValidator

**validateAndPost()**
- **Time Complexity**: O(v + p) where:
  - v = validation time (~1-2s with LLM)
  - p = platform API post time (~0.5-1s)
  - Retry overhead: O(r × (v + p)) worst case
  - Total: O(1) best case, O(3 × (v + p)) worst case

- **Space Complexity**: O(n) where n = response content length

### Overall System Performance

**Best Case** (validation passes immediately):
- Validation: ~50ms (rule checks only)
- Posting: ~500ms (platform API)
- Total: ~550ms

**Normal Case** (validation with tone check):
- Rule checks: ~50ms
- Tone check: ~1500ms
- Posting: ~500ms
- Total: ~2050ms (~2s)

**Worst Case** (3 retries + escalation):
- Attempt 1: ~2s (validation + post attempt)
- Backoff: 5s
- Attempt 2: ~2s (simplified content)
- Backoff: 30s
- Attempt 3: ~2s (alternate agent)
- Escalation: ~1s (database + notifications)
- Total: ~42s

**Token Usage**:
- Rule checks: 0 tokens
- Tone check: ~200-500 tokens per validation
- Worst case: 3 × 500 = 1500 tokens for validation alone
- This is in addition to ~3000-5000 tokens for response generation

---

## Summary

This pseudocode document provides complete implementation details for Phase 4: Validation & Error Handling. It covers:

1. **ValidationService**: Progressive validation with rule-based + LLM checks
2. **RetryService**: Three-tier retry strategy with exponential backoff
3. **EscalationService**: User notifications and system posts for failures
4. **PostValidator**: Main orchestration class coordinating all services

The design prioritizes:
- **Performance**: Rule checks first, LLM only when needed
- **Reliability**: Multiple retry strategies before escalation
- **Transparency**: Comprehensive logging and user notifications
- **Robustness**: Graceful degradation when services unavailable

Ready for implementation in TypeScript with clear integration points into existing Phase 2 (Orchestrator) and Phase 3 (Agent Workers) infrastructure.

---

**Next Steps**:
1. Review pseudocode with team
2. Create TypeScript interfaces
3. Implement services in order: ValidationService → RetryService → EscalationService → PostValidator
4. Write unit tests for each algorithm
5. Integration testing with Phase 3 AgentWorker
6. End-to-end testing with real feed items
