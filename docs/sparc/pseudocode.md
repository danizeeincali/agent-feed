# SPARC Pseudocode: Grace Period Handler & Agent Routing

**Version**: 1.0.0
**Date**: 2025-11-07
**Phase**: Pseudocode
**Status**: Draft for Review

---

## Part 1: Grace Period Handler Pseudocode

### 1.1 Grace Period Monitor

```pseudocode
FUNCTION executeProtectedQueryWithGracePeriod(query, options):
    // Extract options
    workerId = options.workerId
    ticketId = options.ticketId
    sdkManager = options.sdkManager
    timeoutMs = getTimeoutForComplexity(query)

    // Calculate grace period threshold
    gracePeriodMs = timeoutMs * 0.8
    remainingMs = timeoutMs - gracePeriodMs

    // Initialize state tracking
    state = {
        messagesCollected: [],
        chunkCount: 0,
        responseSize: 0,
        currentPhase: "initializing",
        startTime: NOW(),
        gracePeriodTriggered: false
    }

    // Create promises
    gracePeriodPromise = createGracePeriodPromise(gracePeriodMs, state, workerId, ticketId, remainingMs)
    timeoutPromise = createTimeoutPromise(timeoutMs)
    executePromise = createExecutePromise(query, sdkManager, state)

    // Race all promises
    TRY:
        result = AWAIT Promise.race([
            executePromise,
            timeoutPromise,
            gracePeriodPromise  // Non-blocking, runs in parallel
        ])

        RETURN {
            success: true,
            messages: state.messagesCollected,
            chunkCount: state.chunkCount,
            responseSize: state.responseSize,
            gracePeriodUsed: state.gracePeriodTriggered
        }

    CATCH error:
        IF error.type == "QUERY_TIMEOUT":
            RETURN buildTimeoutResponse(state)
        ELSE IF error.type == "GRACE_PERIOD_ACTION":
            RETURN handleGracePeriodAction(error.action, state)
        ELSE:
            RETURN buildErrorResponse(error, state)
    END TRY
END FUNCTION

FUNCTION createGracePeriodPromise(gracePeriodMs, state, workerId, ticketId, remainingMs):
    RETURN NEW Promise((resolve) => {
        setTimeout(() => {
            IF NOT state.gracePeriodTriggered:
                state.gracePeriodTriggered = true

                // Generate progress analysis
                todos = generateTodoWriteFromState(state)

                // Present user choices
                userChoice = AWAIT presentUserChoices(
                    workerId,
                    ticketId,
                    remainingMs,
                    todos,
                    state
                )

                // Handle user decision
                IF userChoice.action == "continue":
                    extendTimeout(timeoutMs + 120000)  // +2 minutes
                    LOG("User chose to continue, extending timeout")

                ELSE IF userChoice.action == "pause":
                    stateId = AWAIT saveWorkerState(state, workerId, ticketId)
                    THROW {
                        type: "GRACE_PERIOD_ACTION",
                        action: "pause",
                        stateId: stateId
                    }

                ELSE IF userChoice.action == "simplify":
                    reducedScope = calculateReducedScope(state, remainingMs)
                    applyReducedScope(state, reducedScope)
                    LOG("User chose to simplify, reducing scope")
                END IF
            END IF

            resolve()
        }, gracePeriodMs)
    })
END FUNCTION
```

### 1.2 TodoWrite Generation from State

```pseudocode
FUNCTION generateTodoWriteFromState(state):
    todos = []

    // Analyze messages to extract phases
    phases = extractPhasesFromMessages(state.messagesCollected)

    FOR EACH phase IN phases:
        todo = {
            id: generateId(),
            content: phase.description,
            activeForm: phase.activeDescription,
            status: determinePhaseStatus(phase, state.currentPhase),
            priority: phase.priority,
            estimatedTime: phase.actualTime OR phase.estimatedTime
        }

        todos.append(todo)
    END FOR

    // Add pending phases if known
    pendingPhases = estimatePendingPhases(state)
    FOR EACH phase IN pendingPhases:
        todo = {
            id: generateId(),
            content: phase.description,
            activeForm: phase.activeDescription,
            status: "pending",
            priority: phase.priority,
            estimatedTime: phase.estimatedTime
        }

        todos.append(todo)
    END FOR

    RETURN todos
END FUNCTION

FUNCTION extractPhasesFromMessages(messages):
    phases = []
    currentPhase = null

    FOR EACH message IN messages:
        IF message.type == "assistant":
            // Look for phase indicators in content
            IF message.content CONTAINS "analyzing":
                IF currentPhase:
                    phases.append(currentPhase)
                currentPhase = {
                    description: "Analyze requirements",
                    activeDescription: "Analyzing requirements",
                    priority: "high",
                    startTime: message.timestamp
                }
            ELSE IF message.content CONTAINS "designing":
                IF currentPhase:
                    currentPhase.endTime = message.timestamp
                    phases.append(currentPhase)
                currentPhase = {
                    description: "Design architecture",
                    activeDescription: "Designing architecture",
                    priority: "high",
                    startTime: message.timestamp
                }
            ELSE IF message.content CONTAINS "implementing":
                IF currentPhase:
                    currentPhase.endTime = message.timestamp
                    phases.append(currentPhase)
                currentPhase = {
                    description: "Implement features",
                    activeDescription: "Implementing features",
                    priority: "high",
                    startTime: message.timestamp
                }
            END IF
        END IF
    END FOR

    // Add current phase
    IF currentPhase:
        phases.append(currentPhase)

    RETURN phases
END FUNCTION

FUNCTION determinePhaseStatus(phase, currentPhase):
    IF phase.endTime EXISTS:
        RETURN "completed"
    ELSE IF phase.description == currentPhase:
        RETURN "in_progress"
    ELSE:
        RETURN "pending"
    END IF
END FUNCTION
```

### 1.3 User Choice Presentation

```pseudocode
FUNCTION presentUserChoices(workerId, ticketId, remainingMs, todos, state):
    // Build progress summary
    completedCount = COUNT(todos WHERE status == "completed")
    totalCount = LENGTH(todos)
    elapsedMs = NOW() - state.startTime

    // Format message
    message = buildGracePeriodMessage(
        todos,
        completedCount,
        totalCount,
        elapsedMs,
        remainingMs
    )

    // Create user choice request
    choiceRequest = {
        type: "USER_CHOICE_REQUIRED",
        message: message,
        timeRemaining: remainingMs,
        options: [
            {
                action: "continue",
                label: "🚀 Continue",
                description: "Extend time by 2 minutes",
                icon: "🚀",
                consequence: "Total time: ~" + formatTime(elapsedMs + 120000)
            },
            {
                action: "pause",
                label: "⏸️ Pause",
                description: "Save progress and stop gracefully",
                icon: "⏸️",
                consequence: "Resume anytime with saved state"
            },
            {
                action: "simplify",
                label: "✂️ Simplify",
                description: "Complete high-priority items only",
                icon: "✂️",
                consequence: "Finishes in " + formatTime(remainingMs)
            }
        ],
        defaultAction: "continue",
        defaultAfterMs: remainingMs
    }

    // Send to user and wait for response
    response = AWAIT sendUserChoiceRequest(workerId, choiceRequest)

    // Handle timeout (no response)
    IF response == TIMEOUT:
        LOG("No user response, defaulting to 'continue'")
        RETURN { action: "continue", timestamp: NOW() }
    END IF

    RETURN response
END FUNCTION

FUNCTION buildGracePeriodMessage(todos, completedCount, totalCount, elapsedMs, remainingMs):
    message = "⏳ **This task is taking longer than expected**\n\n"
    message += "**Progress So Far:**\n"

    FOR EACH todo IN todos:
        IF todo.status == "completed":
            message += "✅ " + todo.content + " (" + formatTime(todo.estimatedTime) + ")\n"
        ELSE IF todo.status == "in_progress":
            message += "🔄 " + todo.content + " (in progress - " + formatTime(todo.estimatedTime) + ")\n"
        ELSE:
            message += "⏸️ " + todo.content + " (pending)\n"
        END IF
    END FOR

    message += "\n**Time Status:**\n"
    message += "- Elapsed: " + formatTime(elapsedMs) + " (80%)\n"
    message += "- Remaining: " + formatTime(remainingMs) + "\n"
    message += "- Estimated to complete: " + estimateCompletion(todos) + "\n\n"

    message += "**What would you like to do?**\n\n"
    message += "[Options rendered by UI]\n\n"
    message += "*If no response in " + formatTime(remainingMs) + ", will automatically Continue.*"

    RETURN message
END FUNCTION
```

### 1.4 State Persistence

```pseudocode
FUNCTION saveWorkerState(state, workerId, ticketId):
    stateId = generateStateId(workerId, NOW())

    persistedState = {
        stateId: stateId,
        workerId: workerId,
        ticketId: ticketId,
        agentName: state.agentName,
        timestamp: NOW(),
        expiresAt: NOW() + 86400000,  // 24 hours

        execution: {
            query: state.originalQuery,
            complexity: state.complexity,
            elapsedMs: NOW() - state.startTime,
            timeoutMs: state.timeoutMs
        },

        progress: {
            messagesCollected: state.messagesCollected,
            chunkCount: state.chunkCount,
            responseSize: state.responseSize,
            currentPhase: state.currentPhase,
            completedSteps: extractCompletedSteps(state),
            pendingSteps: extractPendingSteps(state)
        },

        todos: state.todos,

        resumption: {
            canResume: true,
            resumeFrom: state.currentPhase,
            contextSnapshot: buildContextSnapshot(state)
        }
    }

    // Save to filesystem
    filePath = "/prod/agent_workspace/suspended-sessions/" + stateId + ".json"

    TRY:
        AWAIT writeFile(filePath, JSON.stringify(persistedState, null, 2))
        LOG("State saved successfully: " + stateId)
        RETURN stateId

    CATCH error:
        LOG("Failed to save state: " + error)
        // Retry once
        TRY:
            AWAIT writeFile(filePath, JSON.stringify(persistedState, null, 2))
            RETURN stateId
        CATCH retryError:
            THROW new Error("STATE_SAVE_FAILED")
        END TRY
    END TRY
END FUNCTION

FUNCTION resumeWorkerState(stateId):
    filePath = "/prod/agent_workspace/suspended-sessions/" + stateId + ".json"

    TRY:
        content = AWAIT readFile(filePath)
        state = JSON.parse(content)

        // Check expiration
        IF NOW() > state.expiresAt:
            THROW new Error("RESUME_STATE_EXPIRED")
        END IF

        // Validate state integrity
        IF NOT validateStateIntegrity(state):
            THROW new Error("RESUME_STATE_CORRUPTED")
        END IF

        RETURN state

    CATCH error:
        LOG("Failed to resume state: " + error)
        THROW error
    END TRY
END FUNCTION
```

---

## Part 2: Agent Routing Pseudocode

### 2.1 Intent Classification

```pseudocode
FUNCTION classifyUserIntent(userRequest, context):
    // Tokenize and normalize request
    tokens = tokenize(userRequest.toLowerCase())

    // Initialize intent scores
    intentScores = {
        BRAINSTORM: 0.0,
        CREATE_AGENT: 0.0,
        MODIFY_AGENT: 0.0,
        SYSTEM_ARCHITECTURE: 0.0,
        EVALUATE_FEASIBILITY: 0.0,
        UNCLEAR: 0.0
    }

    // Tier 1 keyword matching (high confidence)
    tier1Matches = matchKeywords(tokens, TIER_1_KEYWORDS)
    FOR EACH match IN tier1Matches:
        intentScores[match.intent] += match.weight * 0.9
    END FOR

    // Tier 2 keyword matching (medium confidence)
    tier2Matches = matchKeywords(tokens, TIER_2_KEYWORDS)
    FOR EACH match IN tier2Matches:
        intentScores[match.intent] += match.weight * 0.7
    END FOR

    // Tier 3 keyword matching (low confidence)
    tier3Matches = matchKeywords(tokens, TIER_3_KEYWORDS)
    FOR EACH match IN tier3Matches:
        intentScores[match.intent] += match.weight * 0.5
    END FOR

    // Apply contextual modifiers
    intentScores = applyContextualModifiers(intentScores, userRequest, context)

    // Normalize scores
    totalScore = SUM(intentScores.values)
    IF totalScore > 0:
        FOR EACH intent, score IN intentScores:
            intentScores[intent] = score / totalScore
        END FOR
    ELSE:
        intentScores.UNCLEAR = 1.0
    END IF

    // Determine primary and secondary intents
    sortedIntents = SORT(intentScores BY score DESC)
    primaryIntent = sortedIntents[0]
    secondaryIntents = FILTER(sortedIntents[1:] WHERE score > 0.3)

    // Build classification result
    classification = {
        primaryIntent: primaryIntent.intent,
        confidence: primaryIntent.score,
        secondaryIntents: MAP(secondaryIntents, intent => intent.intent),
        triggers: tier1Matches + tier2Matches + tier3Matches,
        clarificationNeeded: primaryIntent.score < 0.6
    }

    IF classification.clarificationNeeded:
        classification.suggestedQuestions = generateClarifyingQuestions(
            primaryIntent,
            secondaryIntents,
            userRequest
        )
    END IF

    RETURN classification
END FUNCTION

FUNCTION matchKeywords(tokens, keywordRules):
    matches = []

    FOR EACH rule IN keywordRules:
        IF rule.pattern MATCHES_IN tokens:
            matches.append({
                intent: rule.intent,
                keyword: rule.keyword,
                weight: rule.weight,
                confidence: rule.confidence
            })
        END IF
    END FOR

    RETURN matches
END FUNCTION

FUNCTION applyContextualModifiers(intentScores, userRequest, context):
    // Check for exploration signals (boost BRAINSTORM)
    IF userRequest CONTAINS ["multiple options", "pros and cons", "not sure"]:
        intentScores.BRAINSTORM *= 1.3
    END IF

    // Check for clarity signals (boost CREATE_AGENT)
    IF userRequest CONTAINS ["specific", "exactly", "must have"]:
        intentScores.CREATE_AGENT *= 1.2
    END IF

    // Check for agent name (strong CREATE_AGENT signal)
    IF detectAgentName(userRequest):
        intentScores.CREATE_AGENT *= 1.5
    END IF

    // Check for system-level keywords (boost SYSTEM_ARCHITECTURE)
    IF userRequest CONTAINS ["database", "schema", "migration", "infrastructure"]:
        intentScores.SYSTEM_ARCHITECTURE *= 1.4
    END IF

    // Check for existing agent mention (boost MODIFY_AGENT)
    IF context.currentAgents AND mentionsExistingAgent(userRequest, context.currentAgents):
        intentScores.MODIFY_AGENT *= 1.6
    END IF

    RETURN intentScores
END FUNCTION
```

### 2.2 Routing Decision Tree

```pseudocode
FUNCTION routeAgentRequest(userRequest, context):
    // Step 1: Classify intent
    classification = classifyUserIntent(userRequest, context)

    // Step 2: Check for clarification need
    IF classification.clarificationNeeded:
        RETURN {
            route: null,
            clarificationNeeded: true,
            questions: classification.suggestedQuestions,
            context: "Ambiguous request - need more details"
        }
    END IF

    // Step 3: Apply routing rules
    intent = classification.primaryIntent
    confidence = classification.confidence

    IF intent == "BRAINSTORM":
        RETURN routeToBrainstorm(userRequest, classification, context)

    ELSE IF intent == "CREATE_AGENT":
        RETURN routeToCreate(userRequest, classification, context)

    ELSE IF intent == "MODIFY_AGENT":
        RETURN routeToModify(userRequest, classification, context)

    ELSE IF intent == "SYSTEM_ARCHITECTURE":
        RETURN routeToArchitecture(userRequest, classification, context)

    ELSE IF intent == "EVALUATE_FEASIBILITY":
        RETURN routeToFeasibility(userRequest, classification, context)

    ELSE:
        RETURN {
            route: null,
            clarificationNeeded: true,
            questions: [
                "Could you clarify what you'd like to do?",
                "Are you looking to create a new agent, modify an existing one, or explore possibilities?"
            ]
        }
    END IF
END FUNCTION

FUNCTION routeToCreate(userRequest, classification, context):
    // Check requirements completeness
    requirements = extractRequirements(userRequest)

    IF NOT requirementsComplete(requirements):
        // Route to ideas agent first for planning
        RETURN {
            primaryRoute: {
                agent: "agent-ideas-agent",
                confidence: 0.9,
                reasoning: "Requirements incomplete. Ideas agent will help define specifications."
            },
            workflow: {
                type: "sequential",
                steps: [
                    {
                        sequence: 1,
                        agent: "agent-ideas-agent",
                        action: "define_requirements",
                        handoffTo: "agent-architect-agent"
                    },
                    {
                        sequence: 2,
                        agent: "agent-architect-agent",
                        action: "create_agent",
                        input: "requirements_from_ideas_agent"
                    }
                ]
            }
        }
    END IF

    // Check for similar agent
    similarAgent = findSimilarAgent(requirements, context.currentAgents)
    IF similarAgent:
        RETURN {
            clarificationNeeded: true,
            questions: [
                "I found a similar agent: " + similarAgent.name,
                "Would you like to:",
                "1. Modify the existing agent",
                "2. Create a new specialized variant",
                "3. Proceed with new agent anyway"
            ],
            suggestedRoute: "agent-maintenance-agent"
        }
    END IF

    // Check skill availability
    requiredSkills = requirements.skills OR []
    missingSkills = findMissingSkills(requiredSkills)

    IF missingSkills.length > 0:
        RETURN {
            primaryRoute: {
                agent: "agent-architect-agent",
                confidence: 0.85,
                reasoning: "Will create agent. Note: Skills need to be created first."
            },
            prerequisites: [
                {
                    agent: "skills-architect-agent",
                    action: "create_skills",
                    skills: missingSkills
                }
            ]
        }
    END IF

    // All checks passed - direct creation
    RETURN {
        primaryRoute: {
            agent: "agent-architect-agent",
            confidence: 0.95,
            reasoning: "Requirements complete, no conflicts, skills available. Ready for immediate creation."
        },
        validation: {
            requirementsComplete: true,
            similarAgentExists: false,
            skillsAvailable: true
        }
    }
END FUNCTION

FUNCTION routeToBrainstorm(userRequest, classification, context):
    RETURN {
        primaryRoute: {
            agent: "agent-ideas-agent",
            confidence: classification.confidence,
            reasoning: "Request indicates exploration and brainstorming needed."
        },
        workflow: {
            type: "sequential",
            steps: [
                {
                    sequence: 1,
                    agent: "agent-ideas-agent",
                    action: "brainstorm_and_evaluate",
                    output: "feasibility_report"
                },
                {
                    sequence: 2,
                    agent: "USER_REVIEW",
                    action: "approve_ideas",
                    note: "User reviews feasibility report and selects ideas"
                },
                {
                    sequence: 3,
                    agent: "agent-architect-agent",
                    action: "create_from_approved_ideas",
                    condition: "if_user_approves"
                }
            ]
        }
    }
END FUNCTION

FUNCTION routeToArchitecture(userRequest, classification, context):
    // Determine scope
    affectsMultipleComponents = checkMultipleComponents(userRequest)
    requiresDatabaseChange = checkDatabaseMention(userRequest)

    IF affectsMultipleComponents OR requiresDatabaseChange:
        RETURN {
            primaryRoute: {
                agent: "system-architect-agent",
                confidence: 0.95,
                reasoning: "System-wide changes require architectural planning."
            },
            workflow: {
                type: "sequential",
                steps: [
                    {
                        sequence: 1,
                        agent: "system-architect-agent",
                        action: "create_architecture_decision",
                        output: "ADR_and_implementation_plan"
                    },
                    {
                        sequence: 2,
                        agent: "CONDITIONAL_ROUTING",
                        condition: "if_agents_needed",
                        possibleRoutes: ["agent-architect-agent", "agent-maintenance-agent"]
                    }
                ]
            }
        }
    ELSE:
        // Single-component change, might be agent-level
        RETURN {
            clarificationNeeded: true,
            questions: [
                "Is this a system-wide architectural change, or specific to one agent?",
                "- System-wide → system-architect-agent",
                "- Single agent → agent-architect-agent or agent-maintenance-agent"
            ]
        }
    END IF
END FUNCTION
```

### 2.3 Handoff Protocol

```pseudocode
FUNCTION executeHandoff(sourceAgent, targetAgent, handoffData):
    // Validate handoff data
    IF NOT validateHandoffData(handoffData, targetAgent):
        THROW new Error("INVALID_HANDOFF_DATA")
    END IF

    // Log handoff event
    LOG({
        event: "AGENT_HANDOFF",
        from: sourceAgent,
        to: targetAgent,
        timestamp: NOW(),
        dataSize: sizeof(handoffData)
    })

    // Create handoff package
    handoffPackage = {
        handoffType: determineHandoffType(sourceAgent, targetAgent),
        sourceAgent: sourceAgent,
        targetAgent: targetAgent,
        timestamp: NOW(),
        data: handoffData,
        validation: {
            dataComplete: true,
            schemaVersion: "1.0.0"
        }
    }

    // Acknowledge handoff
    acknowledgment = AWAIT targetAgent.receiveHandoff(handoffPackage)

    IF NOT acknowledgment.success:
        THROW new Error("HANDOFF_REJECTED: " + acknowledgment.reason)
    END IF

    // Mark handoff complete
    markHandoffComplete(sourceAgent, targetAgent, handoffPackage.id)

    RETURN {
        success: true,
        handoffId: handoffPackage.id,
        targetAgentReady: true
    }
END FUNCTION

FUNCTION validateHandoffData(data, targetAgent):
    requiredFields = getRequiredFieldsForAgent(targetAgent)

    FOR EACH field IN requiredFields:
        IF NOT data.hasOwnProperty(field):
            LOG("Missing required field for " + targetAgent + ": " + field)
            RETURN false
        END IF
    END FOR

    // Type validation
    IF NOT matchesSchema(data, targetAgent):
        LOG("Data does not match schema for " + targetAgent)
        RETURN false
    END IF

    RETURN true
END FUNCTION

FUNCTION getRequiredFieldsForAgent(agentName):
    IF agentName == "agent-architect-agent":
        RETURN [
            "agentName",
            "purpose",
            "capabilities",
            "tools",
            "coordinatesWith"
        ]
    ELSE IF agentName == "system-architect-agent":
        RETURN [
            "architectureDecision",
            "systemContext",
            "impactAnalysis"
        ]
    ELSE:
        RETURN []
    END IF
END FUNCTION
```

### 2.4 Clarifying Questions Generation

```pseudocode
FUNCTION generateClarifyingQuestions(primaryIntent, secondaryIntents, userRequest):
    questions = []

    IF primaryIntent.intent == "UNCLEAR":
        questions.append("I'm not sure what you'd like to do. Could you clarify if you want to:")
        questions.append("1. 🔍 Explore and brainstorm agent ideas")
        questions.append("2. 🛠️ Create a specific agent")
        questions.append("3. ⚙️ Make system-wide architectural changes")
        questions.append("4. 📝 Modify an existing agent")

    ELSE IF primaryIntent.intent == "CREATE_AGENT" AND primaryIntent.confidence < 0.7:
        questions.append("To create this agent, I need a few more details:")
        questions.append("1. **Agent Name**: What should we call it?")
        questions.append("2. **Primary Purpose**: What is its main responsibility?")
        questions.append("3. **Key Capabilities**: What should it be able to do?")
        questions.append("4. **Coordinates With**: Which other agents will it work with?")

    ELSE IF LENGTH(secondaryIntents) > 0:
        questions.append("Your request could be interpreted in multiple ways:")

        FOR EACH intent IN [primaryIntent] + secondaryIntents:
            IF intent.intent == "BRAINSTORM":
                questions.append("- Brainstorm agent ideas (agent-ideas-agent)")
            ELSE IF intent.intent == "CREATE_AGENT":
                questions.append("- Create a specific agent (agent-architect-agent)")
            ELSE IF intent.intent == "SYSTEM_ARCHITECTURE":
                questions.append("- System-wide architecture (system-architect-agent)")
            END IF
        END FOR

        questions.append("\nWhich interpretation matches your goal?")
    END IF

    // Add context-specific questions
    IF NOT detectAgentName(userRequest):
        questions.append("💡 Tip: Providing an agent name helps me route your request correctly.")
    END IF

    IF NOT detectCapabilities(userRequest):
        questions.append("💡 Tip: Describing what the agent should do helps ensure quality.")
    END IF

    RETURN questions
END FUNCTION
```

---

## Algorithm Complexity Analysis

### Grace Period Handler

**Time Complexity**:
- Grace period detection: O(1) - single timer
- TodoWrite generation: O(n) - where n = number of messages
- State persistence: O(m) - where m = state size
- User choice handling: O(1) - single interaction

**Space Complexity**:
- State storage: O(m) - proportional to execution state
- Persisted files: O(1) - one file per session

**Performance**: Grace period overhead < 10ms, state save < 500ms

### Agent Routing

**Time Complexity**:
- Intent classification: O(n * k) - where n = request tokens, k = keyword rules
- Routing decision: O(1) - rule lookup
- Handoff validation: O(f) - where f = number of required fields

**Space Complexity**:
- Keyword rules: O(r) - where r = number of rules
- Classification result: O(1) - fixed structure

**Performance**: Routing overhead < 500 tokens, decision latency < 100ms

---

## Document Metadata

**Author**: SPARC Specification Agent
**Phase**: Pseudocode
**Next Phase**: Architecture (detailed design)
**Related Documents**:
- `grace-period-handler-spec.md`
- `agent-routing-spec.md`
