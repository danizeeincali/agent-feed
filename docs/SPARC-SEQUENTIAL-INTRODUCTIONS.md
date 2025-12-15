# SPARC Specification: Sequential Agent Introduction System

**Status**: 🔄 SPECIFICATION PHASE
**Date**: 2025-11-06
**Author**: SPARC Specification Writer Agent
**Working Directory**: `/workspaces/agent-feed/docs/`

---

## Table of Contents

1. [S - Specification](#s---specification)
2. [P - Pseudocode](#p---pseudocode)
3. [A - Architecture](#a---architecture)
4. [R - Refinement](#r---refinement)
5. [C - Completion](#c---completion)

---

## S - Specification

### 1.1 Objective

Implement a sequential agent introduction system that progressively introduces agents based on user engagement patterns, context triggers, and natural workflow progression. The system ensures users aren't overwhelmed with agents at once, instead discovering capabilities organically through conversation and interaction.

### 1.2 Problem Statement

**Current State:**
- Core agents (Personal Todos, Agent Ideas, Link Logger) are introduced immediately after Phase 1 onboarding
- Users don't discover specialized agents (PageBuilder, Agent Builder, Meeting Prep) organically
- No engagement-based trigger system for introducing advanced capabilities
- Missing progressive revelation of platform capabilities

**Desired State:**
- Agents introduced sequentially based on user engagement milestones
- Context-aware triggers detect when specialized agents would be valuable
- Natural discovery flow that educates users about capabilities over time
- Reduced cognitive load during initial onboarding
- Higher engagement with introduced agents (users actually use them)

### 1.3 User Stories

**US-1: As a new user**, I want agents introduced one at a time so I can learn each agent's capabilities without feeling overwhelmed.

**US-2: As an engaged user**, I want specialized agents introduced when I need them (e.g., PageBuilder when creating rich content) so discoveries feel timely and relevant.

**US-3: As a power user**, I want to be introduced to Agent Builder after demonstrating understanding of basic agent capabilities, so I can create custom agents.

**US-4: As a returning user**, I want the system to remember which agents I've met so I don't get redundant introductions.

**US-5: As Λvi**, I want to orchestrate agent introductions strategically so users develop skills progressively and discover capabilities naturally.

### 1.4 Functional Requirements

#### FR-1: Sequential Introduction Orchestrator
- **FR-1.1**: Track user engagement metrics (posts created, agent interactions, comments, time on platform)
- **FR-1.2**: Calculate "readiness score" for each un-introduced agent based on engagement patterns
- **FR-1.3**: Introduce maximum of 1 agent per interaction session (prevent spam)
- **FR-1.4**: Maintain introduction queue with priority ordering
- **FR-1.5**: Respect minimum wait time between introductions (24-48 hours)

#### FR-2: Engagement Detection Service
- **FR-2.1**: Monitor user posts for context keywords (e.g., "page", "dashboard", "agent idea")
- **FR-2.2**: Track interaction frequency with existing agents
- **FR-2.3**: Detect workflow patterns (e.g., user repeatedly creates similar posts → suggest automation agent)
- **FR-2.4**: Measure agent response quality engagement (user replies to agent posts)
- **FR-2.5**: Calculate engagement milestones (5 posts, 10 interactions, 7 days active)

#### FR-3: Conversational Introduction Generator
- **FR-3.1**: Generate contextual introduction posts that reference user's recent activity
- **FR-3.2**: Include agent capabilities relevant to detected user needs
- **FR-3.3**: Provide 2-3 specific examples based on user's use case
- **FR-3.4**: Include clear call-to-action (CTA) for first interaction
- **FR-3.5**: Educational tone: explain WHY this agent would be valuable NOW

#### FR-4: PageBuilder Showcase Workflow
- **FR-4.1**: Triggered when user creates 3+ posts OR mentions "page", "dashboard", "layout"
- **FR-4.2**: Introduction includes visual example of PageBuilder capabilities
- **FR-4.3**: Offer to create first page based on user's content
- **FR-4.4**: Demonstrate page templates (profile, dashboard, documentation)
- **FR-4.5**: Track PageBuilder adoption (did user create a page?)

#### FR-5: Agent Builder Tutorial Workflow
- **FR-5.1**: Triggered after user has 5+ meaningful agent interactions
- **FR-5.2**: Requires 2+ core agents introduced (Personal Todos, Agent Ideas, Link Logger)
- **FR-5.3**: Introduction emphasizes customization and automation potential
- **FR-5.4**: Provide template for first agent based on user's workflow patterns
- **FR-5.5**: Guide through agent creation process with step-by-step prompts

#### FR-6: Introduction State Management
- **FR-6.1**: Persist introduction queue state across sessions
- **FR-6.2**: Track introduction timestamp and user response
- **FR-6.3**: Mark introductions as "successful" (user interacted) or "ignored" (no response after 7 days)
- **FR-6.4**: Re-surface ignored agent introductions after engagement milestone
- **FR-6.5**: Provide Λvi with introduction analytics dashboard

### 1.5 Non-Functional Requirements

#### NFR-1: Performance
- **NFR-1.1**: Engagement detection overhead <50ms per post/comment
- **NFR-1.2**: Readiness score calculation <100ms for all un-introduced agents
- **NFR-1.3**: Introduction generation <500ms (including LLM call for personalization)
- **NFR-1.4**: Database queries use indexed lookups (no full table scans)

#### NFR-2: User Experience
- **NFR-2.1**: Maximum 1 agent introduction per 24-hour period
- **NFR-2.2**: Introductions feel conversational, not robotic
- **NFR-2.3**: Clear value proposition within first 2 sentences
- **NFR-2.4**: Examples are specific to user's demonstrated interests
- **NFR-2.5**: No interruption of active conversations (wait for natural pause)

#### NFR-3: Reliability
- **NFR-3.1**: Graceful degradation if engagement detection fails
- **NFR-3.2**: Fallback to time-based introductions if context detection unavailable
- **NFR-3.3**: Duplicate introduction prevention (check existing introductions)
- **NFR-3.4**: Transaction safety for state updates

#### NFR-4: Extensibility
- **NFR-4.1**: Pluggable trigger system (easy to add new trigger conditions)
- **NFR-4.2**: Configurable introduction templates per agent
- **NFR-4.3**: Λvi can override introduction schedule (manual trigger)
- **NFR-4.4**: A/B testing framework for introduction strategies

### 1.6 Acceptance Criteria

**AC-1: Core Agent Introduction Sequence**
```
GIVEN a user completes Phase 1 onboarding
WHEN 24 hours elapse
THEN Personal Todos agent introduces itself
AND no other agents introduce for another 24 hours
```

**AC-2: Context-Triggered Introduction**
```
GIVEN a user has Personal Todos agent introduced
WHEN user creates post mentioning "page" or "dashboard"
AND PageBuilder hasn't been introduced
AND 24 hours since last introduction
THEN PageBuilder introduces itself with contextual message
```

**AC-3: Engagement-Based Introduction**
```
GIVEN a user has 5+ meaningful interactions with agents
WHEN user has been active for 3+ days
AND Agent Builder hasn't been introduced
THEN Agent Builder introduces itself with tutorial offer
```

**AC-4: Introduction Rate Limiting**
```
GIVEN an agent introduction occurred <24 hours ago
WHEN another agent's trigger conditions are met
THEN defer that introduction to next eligible time window
AND add to priority queue
```

**AC-5: Ignored Introduction Re-Surface**
```
GIVEN an agent introduced 7 days ago
WHEN user has not interacted with that agent
AND user reaches new engagement milestone
THEN re-introduce agent with different approach/context
```

### 1.7 Integration Points

- **Existing Services:**
  - `AgentIntroductionService` - Foundation for introduction tracking (extend for sequential logic)
  - `OnboardingFlowService` - Phase 1/2 completion triggers core agent intros
  - `HemingwayBridgeService` - Manage engagement bridges between introductions
  - `BridgePriorityService` - Calculate when introduction bridge has priority

- **Database Tables:**
  - `agent_introductions` - Track which agents introduced (existing)
  - `hemingway_bridges` - Queue next agent introduction as engagement bridge
  - `onboarding_state` - Trigger based on phase completion
  - `agent_posts` - Analyze for context keywords
  - `comments` - Track user-agent interaction quality

- **Frontend Components:**
  - `PostCard.tsx` - Display agent introduction posts
  - `RealSocialMediaFeed.tsx` - Render introduction posts in feed
  - Agent configuration files (`intro-templates/*.json`) - Define trigger rules

---

## P - Pseudocode

### 2.1 Sequential Introduction Orchestrator

```pseudocode
class SequentialIntroductionOrchestrator:

  constructor(database, agentIntroService, bridgeService):
    this.db = database
    this.introService = agentIntroService
    this.bridgeService = bridgeService
    this.MIN_WAIT_HOURS = 24
    this.MAX_INTROS_PER_SESSION = 1

  /**
   * Main orchestration logic - called on user events
   * (post creation, comment, login, etc.)
   */
  function checkAndScheduleIntroductions(userId, eventContext):
    // Step 1: Check if we can introduce an agent now
    if not canIntroduceNow(userId):
      return { canIntroduce: false, reason: "rate_limited" }

    // Step 2: Get pending agents (not yet introduced)
    pendingAgents = getPendingAgents(userId)

    if pendingAgents.isEmpty():
      return { canIntroduce: false, reason: "all_introduced" }

    // Step 3: Calculate readiness scores
    scoredAgents = []
    for agent in pendingAgents:
      score = calculateReadinessScore(userId, agent, eventContext)
      scoredAgents.push({ agent, score })

    // Step 4: Sort by priority (highest score first)
    scoredAgents.sort((a, b) => b.score - a.score)

    // Step 5: Get top candidate
    topCandidate = scoredAgents[0]

    // Step 6: Check minimum readiness threshold
    if topCandidate.score < 0.5:
      // Not ready yet - create engagement bridge instead
      createEngagementBridge(userId, topCandidate.agent)
      return { canIntroduce: false, reason: "below_threshold" }

    // Step 7: Introduce the agent!
    return introduceAgent(userId, topCandidate.agent, eventContext)

  /**
   * Check if we can introduce an agent now (rate limiting)
   */
  function canIntroduceNow(userId):
    lastIntro = getLastIntroduction(userId)

    if not lastIntro:
      return true  // No previous intro, can introduce

    hoursSinceLastIntro = (now() - lastIntro.timestamp) / 3600

    return hoursSinceLastIntro >= this.MIN_WAIT_HOURS

  /**
   * Get agents that haven't been introduced yet
   */
  function getPendingAgents(userId):
    // Get all agent configs
    allAgents = loadAgentConfigs("intro-templates/*.json")

    // Get introduced agents
    introducedIds = this.introService.getIntroducedAgents(userId)
      .map(intro => intro.agent_id)

    // Filter out introduced agents
    pending = allAgents.filter(agent =>
      not introducedIds.includes(agent.agentId)
    )

    return pending

  /**
   * Calculate readiness score (0.0 - 1.0) for introducing an agent
   */
  function calculateReadinessScore(userId, agentConfig, eventContext):
    score = 0.0
    weights = {
      engagement: 0.3,
      context: 0.4,
      prerequisites: 0.2,
      timing: 0.1
    }

    // Factor 1: Engagement milestone (30% weight)
    engagementScore = calculateEngagementScore(userId, agentConfig)
    score += engagementScore * weights.engagement

    // Factor 2: Context match (40% weight)
    contextScore = calculateContextScore(eventContext, agentConfig)
    score += contextScore * weights.context

    // Factor 3: Prerequisites met (20% weight)
    prereqScore = calculatePrerequisiteScore(userId, agentConfig)
    score += prereqScore * weights.prerequisites

    // Factor 4: Optimal timing (10% weight)
    timingScore = calculateTimingScore(userId, agentConfig)
    score += timingScore * weights.timing

    return score

  /**
   * Create engagement bridge to warm up for agent introduction
   */
  function createEngagementBridge(userId, agentConfig):
    // Create a bridge that hints at the upcoming agent
    bridgeContent = generateTeaseContent(agentConfig)

    this.bridgeService.createBridge({
      userId: userId,
      type: "new_feature",
      content: bridgeContent,
      priority: 3,
      agentId: null,  // Not introduced yet
      action: "prepare_introduction",
      metadata: { pendingAgent: agentConfig.agentId }
    })
```

### 2.2 Engagement Detection Service

```pseudocode
class EngagementDetectionService:

  constructor(database):
    this.db = database

  /**
   * Calculate engagement score for an agent
   * Returns 0.0 - 1.0 based on user activity patterns
   */
  function calculateEngagementScore(userId, agentConfig):
    metrics = getUserEngagementMetrics(userId)

    score = 0.0

    // Metric 1: Post count milestone
    if agentConfig.triggerRules.minPosts:
      postScore = min(metrics.totalPosts / agentConfig.triggerRules.minPosts, 1.0)
      score += postScore * 0.25

    // Metric 2: Interaction count milestone
    if agentConfig.triggerRules.minInteractions:
      interactionScore = min(
        metrics.totalInteractions / agentConfig.triggerRules.minInteractions,
        1.0
      )
      score += interactionScore * 0.25

    // Metric 3: Days active
    if agentConfig.triggerRules.minDaysActive:
      daysScore = min(
        metrics.daysActive / agentConfig.triggerRules.minDaysActive,
        1.0
      )
      score += daysScore * 0.2

    // Metric 4: Agent interaction quality
    qualityScore = calculateInteractionQuality(userId)
    score += qualityScore * 0.3

    return score

  /**
   * Calculate context match score
   * Returns 0.0 - 1.0 based on recent user activity
   */
  function calculateContextScore(eventContext, agentConfig):
    if not agentConfig.triggerRules.contextual:
      return 0.5  // Neutral score if no context rules

    keywords = agentConfig.triggerRules.contextual
    score = 0.0

    // Check recent posts for keyword matches
    recentPosts = getRecentPosts(eventContext.userId, limit=5)

    for post in recentPosts:
      matches = countKeywordMatches(post.content, keywords)
      if matches > 0:
        score += 0.2 * matches  // Each match adds 0.2

    // Check current event context
    if eventContext.type == "post_created":
      currentMatches = countKeywordMatches(
        eventContext.content,
        keywords
      )
      if currentMatches > 0:
        score += 0.5  // Strong signal from immediate context

    return min(score, 1.0)  // Cap at 1.0

  /**
   * Calculate prerequisite score
   * Returns 0.0 if prerequisites not met, 1.0 if all met
   */
  function calculatePrerequisiteScore(userId, agentConfig):
    if not agentConfig.prerequisites:
      return 1.0  // No prerequisites

    introducedAgents = getIntroducedAgentIds(userId)
    requiredAgents = agentConfig.prerequisites.agents || []

    metCount = 0
    for requiredAgent in requiredAgents:
      if introducedAgents.includes(requiredAgent):
        metCount += 1

    if metCount == requiredAgents.length:
      return 1.0  // All prerequisites met
    else:
      return 0.0  // Block until all met

  /**
   * Get user engagement metrics
   */
  function getUserEngagementMetrics(userId):
    // Query database for metrics
    totalPosts = countPosts(userId)
    totalComments = countComments(userId)
    totalInteractions = countAgentInteractions(userId)
    daysActive = calculateDaysActive(userId)

    return {
      totalPosts,
      totalComments,
      totalInteractions,
      daysActive,
      lastActivityTime: getLastActivityTime(userId)
    }

  /**
   * Calculate interaction quality (do users engage with agent responses?)
   */
  function calculateInteractionQuality(userId):
    agentPosts = getAgentPostsForUser(userId, limit=10)

    if agentPosts.isEmpty():
      return 0.5  // Neutral if no history

    engagedCount = 0
    for post in agentPosts:
      userComments = getCommentsFromUser(post.id, userId)
      if userComments.length > 0:
        engagedCount += 1

    return engagedCount / agentPosts.length
```

### 2.3 Conversational Introduction Generator

```pseudocode
class ConversationalIntroductionGenerator:

  constructor(database, llmClient):
    this.db = database
    this.llm = llmClient

  /**
   * Generate personalized introduction for an agent
   */
  function generateIntroduction(userId, agentConfig, eventContext):
    // Step 1: Load user context
    userContext = buildUserContext(userId, eventContext)

    // Step 2: Load introduction template
    template = loadTemplate(agentConfig.agentId)

    // Step 3: Generate personalized content
    intro = personalizeIntroduction(template, userContext, agentConfig)

    // Step 4: Create post
    post = createIntroductionPost(userId, agentConfig, intro)

    return {
      success: true,
      postId: post.id,
      agentId: agentConfig.agentId,
      content: intro
    }

  /**
   * Build user context for personalization
   */
  function buildUserContext(userId, eventContext):
    // Get user's name and use case
    onboardingState = getOnboardingState(userId)
    userName = onboardingState.responses.name || "there"
    useCase = onboardingState.responses.use_case || "general"

    // Get recent activity
    recentPosts = getRecentPosts(userId, limit=3)
    recentTopics = extractTopics(recentPosts)

    // Get interaction patterns
    engagementMetrics = getUserEngagementMetrics(userId)

    return {
      userName,
      useCase,
      recentTopics,
      engagementMetrics,
      currentEvent: eventContext
    }

  /**
   * Personalize introduction using LLM
   */
  function personalizeIntroduction(template, userContext, agentConfig):
    prompt = buildPersonalizationPrompt(template, userContext, agentConfig)

    response = this.llm.generate(prompt, {
      maxTokens: 500,
      temperature: 0.7,
      systemPrompt: "You are introducing an AI agent to a user. Be warm, concise, and specific about how this agent helps with their demonstrated needs."
    })

    return response.content

  /**
   * Build LLM prompt for personalization
   */
  function buildPersonalizationPrompt(template, userContext, agentConfig):
    return """
    TASK: Create a personalized introduction for ${agentConfig.displayName}

    USER CONTEXT:
    - Name: ${userContext.userName}
    - Use case: ${userContext.useCase}
    - Recent topics: ${userContext.recentTopics.join(", ")}
    - Current trigger: ${userContext.currentEvent.type}

    AGENT INFO:
    - Name: ${agentConfig.displayName}
    - Description: ${agentConfig.description}
    - Capabilities: ${agentConfig.capabilities.join("\n- ")}

    TEMPLATE:
    ${template.content}

    REQUIREMENTS:
    1. Reference user's recent activity in first sentence
    2. Explain WHY this agent is valuable for their use case
    3. Include 2-3 specific examples relevant to their topics
    4. Clear call-to-action at the end
    5. Warm, conversational tone
    6. Max 300 words

    OUTPUT: Introduction post content (markdown)
    """
```

### 2.4 PageBuilder Showcase Workflow

```pseudocode
class PageBuilderShowcaseWorkflow:

  constructor(orchestrator, introGenerator):
    this.orchestrator = orchestrator
    this.introGenerator = introGenerator

  /**
   * Trigger PageBuilder introduction workflow
   */
  function trigger(userId, eventContext):
    // Check trigger conditions
    if not meetsPageBuilderTrigger(userId, eventContext):
      return { triggered: false }

    // Generate showcase introduction
    intro = generatePageBuilderShowcase(userId, eventContext)

    // Create introduction post with visual examples
    post = createShowcasePost(userId, intro)

    // Mark as introduced
    this.orchestrator.markIntroduced(userId, "page-builder-agent", post.id)

    // Create follow-up bridge for template selection
    createTemplateBridge(userId)

    return { triggered: true, postId: post.id }

  /**
   * Check if PageBuilder trigger conditions are met
   */
  function meetsPageBuilderTrigger(userId, eventContext):
    // Condition 1: User created 3+ posts
    postCount = countPosts(userId)
    if postCount >= 3:
      return true

    // Condition 2: User mentioned page-related keywords
    keywords = ["page", "dashboard", "layout", "template", "design"]
    if eventContext.type == "post_created":
      matches = countKeywordMatches(eventContext.content, keywords)
      if matches > 0:
        return true

    // Condition 3: User engaged with link-sharing (PageBuilder can showcase)
    linkPosts = getPostsWithLinks(userId)
    if linkPosts.length >= 2:
      return true

    return false

  /**
   * Generate PageBuilder showcase content
   */
  function generatePageBuilderShowcase(userId, eventContext):
    userContext = buildUserContext(userId, eventContext)

    // Analyze user's content type for relevant templates
    suggestedTemplates = analyzeSuggestedTemplates(userContext)

    content = """
    Hi ${userContext.userName}! I'm the PageBuilder agent.

    I noticed you've been creating ${userContext.contentPattern} -
    I can help you turn that into rich, interactive pages!

    **What I can build for you:**
    ${suggestedTemplates.map(t => `- ${t.name}: ${t.description}`).join("\n")}

    **Visual Example:**
    Here's a ${suggestedTemplates[0].name} I can create based on your content:
    [Embedded preview/screenshot]

    **Try it:**
    Just say "@page-builder-agent create a ${suggestedTemplates[0].name}"
    and I'll build your first page in seconds!

    Want to see more templates? Ask me "show page templates"
    """

    return content

  /**
   * Analyze user's content to suggest relevant templates
   */
  function analyzeSuggestedTemplates(userContext):
    templates = []

    if userContext.useCase == "business":
      templates.push({
        name: "Dashboard",
        description: "Track metrics and KPIs visually"
      })

    if userContext.recentTopics.includes("documentation"):
      templates.push({
        name: "Docs Page",
        description: "Organize documentation with TOC"
      })

    if userContext.engagementMetrics.totalPosts > 5:
      templates.push({
        name: "Profile Page",
        description: "Showcase your work and projects"
      })

    return templates
```

### 2.5 Agent Builder Tutorial Workflow

```pseudocode
class AgentBuilderTutorialWorkflow:

  constructor(orchestrator, introGenerator):
    this.orchestrator = orchestrator
    this.introGenerator = introGenerator

  /**
   * Trigger Agent Builder tutorial workflow
   */
  function trigger(userId, eventContext):
    // Check trigger conditions
    if not meetsAgentBuilderTrigger(userId):
      return { triggered: false }

    // Analyze user's workflow patterns
    automationOpportunities = detectAutomationOpportunities(userId)

    // Generate tutorial introduction
    intro = generateAgentBuilderTutorial(userId, automationOpportunities)

    // Create introduction post
    post = createTutorialPost(userId, intro)

    // Mark as introduced
    this.orchestrator.markIntroduced(userId, "agent-builder-agent", post.id)

    // Create follow-up bridge for first agent creation
    createFirstAgentBridge(userId, automationOpportunities[0])

    return { triggered: true, postId: post.id }

  /**
   * Check if Agent Builder trigger conditions are met
   */
  function meetsAgentBuilderTrigger(userId):
    // Prerequisite 1: User has interacted with 2+ core agents
    introducedAgents = getIntroducedAgentIds(userId)
    coreAgents = ["personal-todos-agent", "agent-ideas-agent", "link-logger-agent"]
    introducedCoreCount = coreAgents.filter(a =>
      introducedAgents.includes(a)
    ).length

    if introducedCoreCount < 2:
      return false  // Need more core agent experience

    // Prerequisite 2: User has 5+ meaningful agent interactions
    interactions = countAgentInteractions(userId)
    if interactions < 5:
      return false

    // Prerequisite 3: User has been active for 3+ days
    daysActive = calculateDaysActive(userId)
    if daysActive < 3:
      return false

    return true

  /**
   * Detect automation opportunities from user patterns
   */
  function detectAutomationOpportunities(userId):
    opportunities = []

    // Analyze repeated post patterns
    posts = getAllPosts(userId)
    patterns = detectPatterns(posts)

    for pattern in patterns:
      if pattern.frequency >= 3:  // Repeated 3+ times
        opportunities.push({
          type: "recurring_task",
          description: pattern.description,
          suggestedAgent: generateAgentSuggestion(pattern)
        })

    // Analyze workflow gaps
    gaps = detectWorkflowGaps(userId)
    for gap in gaps:
      opportunities.push({
        type: "workflow_gap",
        description: gap.description,
        suggestedAgent: generateAgentSuggestion(gap)
      })

    return opportunities

  /**
   * Generate Agent Builder tutorial content
   */
  function generateAgentBuilderTutorial(userId, opportunities):
    userContext = buildUserContext(userId, null)

    content = """
    Hi ${userContext.userName}! Ready to create your own agents?

    I'm the Agent Builder, and I help you automate your unique workflows.

    **I noticed some patterns in your activity:**
    ${opportunities.map((o, i) => `${i+1}. ${o.description}`).join("\n")}

    **Let's create your first custom agent!**

    Based on pattern #1, here's a starter template:

    \`\`\`json
    {
      "name": "${opportunities[0].suggestedAgent.name}",
      "purpose": "${opportunities[0].suggestedAgent.purpose}",
      "triggers": ${JSON.stringify(opportunities[0].suggestedAgent.triggers)}
    }
    \`\`\`

    **Try it:**
    Say "@agent-builder-agent help me create ${opportunities[0].suggestedAgent.name}"
    and I'll guide you through step-by-step!

    You can also ask "show me agent examples" to see what's possible.
    """

    return content
```

---

## A - Architecture

### 3.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Sequential Introduction System                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                v                   v                   v
┌───────────────────────┐ ┌────────────────────┐ ┌──────────────────────┐
│  Event Triggers        │ │  Core Services     │ │  Workflow Handlers   │
├───────────────────────┤ ├────────────────────┤ ├──────────────────────┤
│ • Post Created        │ │ • Orchestrator     │ │ • PageBuilder        │
│ • Comment Added       │ │ • Detection Service│ │ • Agent Builder      │
│ • User Login          │ │ • Intro Generator  │ │ • Meeting Prep       │
│ • Phase Completion    │ │ • State Manager    │ │ • Custom Workflows   │
│ • Milestone Reached   │ │                    │ │                      │
└───────────────────────┘ └────────────────────┘ └──────────────────────┘
                │                   │                   │
                └───────────────────┼───────────────────┘
                                    │
                                    v
┌─────────────────────────────────────────────────────────────────────────┐
│                        Introduction Decision Engine                      │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Calculate Readiness Scores (engagement, context, prereqs, timing)   │
│  2. Rank Pending Agents by Priority                                     │
│  3. Check Rate Limits (24h minimum, 1 per session)                      │
│  4. Select Top Candidate (score >= 0.5 threshold)                       │
│  5. Generate Personalized Introduction                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                v                   v                   v
┌───────────────────────┐ ┌────────────────────┐ ┌──────────────────────┐
│  Database Layer        │ │  LLM Integration   │ │  Frontend Display    │
├───────────────────────┤ ├────────────────────┤ ├──────────────────────┤
│ • agent_introductions │ │ • Personalization  │ │ • PostCard           │
│ • hemingway_bridges   │ │ • Context Analysis │ │ • Feed Rendering     │
│ • onboarding_state    │ │ • Content Gen      │ │ • Agent Icons        │
│ • agent_posts         │ │                    │ │ • CTA Buttons        │
│ • engagement_metrics  │ │                    │ │                      │
└───────────────────────┘ └────────────────────┘ └──────────────────────┘
```

### 3.2 Data Flow Diagram

```
USER EVENT (Post Created)
        │
        v
┌────────────────────────────────────────────┐
│  Event Handler                              │
│  - Capture event context                   │
│  - Extract keywords, user state            │
└────────────────────────────────────────────┘
        │
        v
┌────────────────────────────────────────────┐
│  Sequential Introduction Orchestrator       │
│  1. Check canIntroduceNow() → Rate limit   │
│  2. getPendingAgents() → Not introduced    │
│  3. calculateReadinessScore() → All agents │
│  4. Sort by score → Priority queue         │
│  5. Select top candidate → Score >= 0.5    │
└────────────────────────────────────────────┘
        │
        ├─────────────[Score >= 0.5]──────────────────>┐
        │                                               │
        └─────────────[Score < 0.5]─────┐              │
                                        │              │
                                        v              v
                        ┌──────────────────────┐  ┌──────────────────────┐
                        │  Create Bridge       │  │  Introduce Agent     │
                        │  - Tease content     │  │  1. Generate intro   │
                        │  - Priority: 3       │  │  2. Create post      │
                        │  - Defer intro       │  │  3. Mark introduced  │
                        └──────────────────────┘  │  4. Create CTA bridge│
                                                  └──────────────────────┘
                                                            │
                                                            v
                                                  ┌──────────────────────┐
                                                  │  Database Update     │
                                                  │  - agent_introductions│
                                                  │  - hemingway_bridges │
                                                  └──────────────────────┘
                                                            │
                                                            v
                                                  ┌──────────────────────┐
                                                  │  WebSocket Broadcast │
                                                  │  - New post to client│
                                                  │  - Realtime update   │
                                                  └──────────────────────┘
                                                            │
                                                            v
                                                  ┌──────────────────────┐
                                                  │  User Sees Intro     │
                                                  │  - Feed updates      │
                                                  │  - CTA displayed     │
                                                  └──────────────────────┘
```

### 3.3 Database Schema Extensions

```sql
-- Extend agent_introductions table with sequential metadata
ALTER TABLE agent_introductions ADD COLUMN readiness_score REAL DEFAULT 0.0;
ALTER TABLE agent_introductions ADD COLUMN introduction_attempt INTEGER DEFAULT 1;
ALTER TABLE agent_introductions ADD COLUMN ignored BOOLEAN DEFAULT 0;
ALTER TABLE agent_introductions ADD COLUMN first_interaction_at INTEGER;

-- New table: engagement_metrics
CREATE TABLE IF NOT EXISTS engagement_metrics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  metric_date INTEGER NOT NULL,  -- Unix timestamp (day)
  total_posts INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  agent_interactions INTEGER DEFAULT 0,
  quality_score REAL DEFAULT 0.0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_engagement_metrics_user ON engagement_metrics(user_id);
CREATE INDEX idx_engagement_metrics_date ON engagement_metrics(metric_date);

-- New table: introduction_queue
CREATE TABLE IF NOT EXISTS introduction_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  readiness_score REAL NOT NULL,
  context_trigger TEXT,  -- JSON: { type, keywords, event_id }
  scheduled_for INTEGER,  -- Unix timestamp
  created_at INTEGER NOT NULL,
  status TEXT CHECK(status IN ('pending', 'ready', 'introduced', 'deferred')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_intro_queue_user ON introduction_queue(user_id);
CREATE INDEX idx_intro_queue_status ON introduction_queue(status);
CREATE INDEX idx_intro_queue_scheduled ON introduction_queue(scheduled_for);

-- New table: workflow_patterns
CREATE TABLE IF NOT EXISTS workflow_patterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pattern_type TEXT NOT NULL,  -- 'recurring_task', 'workflow_gap', 'content_type'
  description TEXT NOT NULL,
  frequency INTEGER DEFAULT 1,
  last_detected INTEGER NOT NULL,
  suggested_agent_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_workflow_patterns_user ON workflow_patterns(user_id);
```

### 3.4 Service Architecture

```
api-server/
└── services/
    └── sequential-introductions/
        ├── orchestrator.service.js
        │   ├── SequentialIntroductionOrchestrator class
        │   ├── checkAndScheduleIntroductions()
        │   ├── canIntroduceNow()
        │   ├── calculateReadinessScore()
        │   └── introduceAgent()
        │
        ├── engagement-detection.service.js
        │   ├── EngagementDetectionService class
        │   ├── calculateEngagementScore()
        │   ├── calculateContextScore()
        │   ├── calculatePrerequisiteScore()
        │   ├── getUserEngagementMetrics()
        │   └── calculateInteractionQuality()
        │
        ├── introduction-generator.service.js
        │   ├── ConversationalIntroductionGenerator class
        │   ├── generateIntroduction()
        │   ├── personalizeIntroduction()
        │   └── buildUserContext()
        │
        ├── workflows/
        │   ├── pagebuilder-showcase.workflow.js
        │   │   ├── PageBuilderShowcaseWorkflow class
        │   │   ├── trigger()
        │   │   ├── meetsPageBuilderTrigger()
        │   │   └── generatePageBuilderShowcase()
        │   │
        │   └── agent-builder-tutorial.workflow.js
        │       ├── AgentBuilderTutorialWorkflow class
        │       ├── trigger()
        │       ├── meetsAgentBuilderTrigger()
        │       └── detectAutomationOpportunities()
        │
        └── state-manager.service.js
            ├── IntroductionStateManager class
            ├── updateEngagementMetrics()
            ├── queueIntroduction()
            └── recordInteraction()
```

### 3.5 Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Existing Codebase Integration Points                       │
└─────────────────────────────────────────────────────────────┘

1. OnboardingFlowService (api-server/services/onboarding/)
   └─> processUseCaseResponse()
       └─> NEW: orchestrator.checkAndScheduleIntroductions(userId, {
             type: "phase1_complete"
           })

2. AgentIntroductionService (api-server/services/agents/)
   └─> EXTEND: introduceAgent()
       └─> NEW: Add sequential logic before introducing

3. HemingwayBridgeService (api-server/services/engagement/)
   └─> ensureBridgeExists()
       └─> NEW: Check if pending intro should become bridge

4. Post Creation Handler (api-server/routes/posts.js)
   └─> POST /api/posts
       └─> NEW: orchestrator.checkAndScheduleIntroductions(userId, {
             type: "post_created",
             content: post.content
           })

5. Comment Handler (api-server/routes/comments.js)
   └─> POST /api/posts/:id/comments
       └─> NEW: Track agent interaction quality

6. WebSocket Events (api-server/services/websocket-service.js)
   └─> Broadcast introduction posts in real-time
```

---

## R - Refinement

### 4.1 Edge Case Handling

**EC-1: User Creates Multiple Posts Rapidly**
- Problem: Could trigger multiple intros in quick succession
- Solution: Check `canIntroduceNow()` before every intro attempt
- Validation: Unit test with 5 posts created in 1 minute

**EC-2: Agent Introduction Post is Immediately Deleted**
- Problem: Introduction record exists but post gone
- Solution: Track post_id validity, allow re-introduction if post deleted
- Validation: Check post exists before marking successful intro

**EC-3: Two Agents Have Equal Readiness Scores**
- Problem: Tie-breaking logic needed
- Solution: Secondary sort by `introducedAfterPhase` (earlier phase = higher priority), then alphabetical
- Validation: Test with two 0.8-score agents

**EC-4: User Never Interacts with Introduced Agent**
- Problem: Agent "ignored", should we re-introduce?
- Solution: After 7 days, mark as "ignored", resurface with different approach when next milestone hit
- Validation: Check ignored flag, generate alternate intro

**EC-5: User Already Knows About Agent (External Knowledge)**
- Problem: Introduction feels redundant
- Solution: Detection not possible - user can dismiss intro, won't re-introduce
- Validation: Add "dismiss" action to intro posts

**EC-6: Database Query Fails During Readiness Calculation**
- Problem: Could block entire orchestration
- Solution: Graceful degradation - return 0.0 score, log error, continue
- Validation: Mock database failure in tests

**EC-7: LLM Personalization Fails**
- Problem: Introduction generation timeout or error
- Solution: Fallback to template-based intro (no personalization)
- Validation: Test with LLM timeout simulation

**EC-8: Phase 1 Not Completed Yet**
- Problem: Core agents shouldn't introduce until Phase 1 done
- Solution: Check `phase1_completed = 1` in readiness calculation
- Validation: Block all non-system intros until Phase 1

### 4.2 Performance Optimizations

**OPT-1: Readiness Calculation Caching**
```javascript
// Cache readiness scores for 1 hour
const scoreCacheKey = `readiness:${userId}:${agentId}`;
let score = cache.get(scoreCacheKey);
if (!score) {
  score = calculateReadinessScore(userId, agentConfig, eventContext);
  cache.set(scoreCacheKey, score, TTL_1_HOUR);
}
```

**OPT-2: Lazy Queue Population**
```javascript
// Only calculate scores for top 5 candidates (not all pending agents)
const topCandidates = pendingAgents
  .sort((a, b) => a.priority - b.priority)
  .slice(0, 5);
```

**OPT-3: Batch Metric Updates**
```javascript
// Update engagement metrics every 5 minutes (not on every event)
if (now() - lastMetricUpdate > 300000) {
  batchUpdateEngagementMetrics(userId);
}
```

**OPT-4: Indexed Database Queries**
```sql
-- Ensure all queries use indexes
CREATE INDEX idx_agent_intros_user_agent ON agent_introductions(user_id, agent_id);
CREATE INDEX idx_posts_user_created ON agent_posts(author, created_at);
CREATE INDEX idx_comments_user_created ON comments(author, created_at);
```

**OPT-5: Async Introduction Generation**
```javascript
// Don't block event handler on intro generation
async function introduceAgent(userId, agentConfig, eventContext) {
  // Queue for background processing
  await queueIntroductionJob(userId, agentConfig, eventContext);
  return { queued: true };
}
```

### 4.3 Testing Strategy

**Unit Tests (60+ tests)**
- SequentialIntroductionOrchestrator
  - canIntroduceNow() with various time gaps
  - calculateReadinessScore() with all 4 factors
  - getPendingAgents() filtering logic
  - Rate limiting enforcement

- EngagementDetectionService
  - calculateEngagementScore() with milestones
  - calculateContextScore() with keyword matching
  - calculatePrerequisiteScore() with dependencies
  - getUserEngagementMetrics() query accuracy

- ConversationalIntroductionGenerator
  - buildUserContext() data aggregation
  - personalizeIntroduction() LLM prompt formatting
  - Fallback to template on LLM failure

- Workflow Handlers
  - PageBuilderShowcaseWorkflow trigger conditions
  - AgentBuilderTutorialWorkflow prerequisite checks
  - detectAutomationOpportunities() pattern detection

**Integration Tests (20+ tests)**
- End-to-end introduction flow
  - User completes Phase 1 → Core agent introduces
  - User creates 3 posts → PageBuilder triggers
  - User has 5 interactions → Agent Builder triggers

- Database integration
  - State persistence across sessions
  - Queue management (add, remove, update)
  - Metric aggregation queries

- WebSocket integration
  - Real-time post broadcast
  - Client receives introduction

**Performance Tests (10+ tests)**
- Readiness calculation <100ms (100 agents)
- Engagement metric query <50ms
- Introduction generation <500ms (including LLM)
- Concurrent user load (10 users, 50 events)

### 4.4 Monitoring & Observability

**Metrics to Track:**
1. Introduction success rate (user interacts within 7 days)
2. Average readiness score at introduction time
3. Time from trigger to introduction (latency)
4. Agent-specific adoption rates
5. Re-introduction frequency (ignored agents)
6. User progression through introduction tiers

**Logging Strategy:**
```javascript
// Structured logging for debugging
logger.info("Introduction scheduled", {
  userId,
  agentId: agentConfig.agentId,
  readinessScore: score,
  trigger: eventContext.type,
  scheduledFor: timestamp
});

logger.info("Introduction completed", {
  userId,
  agentId: agentConfig.agentId,
  postId: post.id,
  generationTimeMs: duration
});

logger.warn("Introduction ignored", {
  userId,
  agentId: agentConfig.agentId,
  daysSinceIntro: 7,
  willResurface: true
});
```

**Dashboard Metrics:**
- Introduction Queue Size (per user)
- Average Readiness Scores (per agent)
- Introduction Success Rate (7-day interaction)
- Ignored Agent Count
- Time Between Introductions (distribution)

---

## C - Completion

### 5.1 Implementation Checklist

**Phase 1: Core Services (Week 1)**
- [ ] Create `SequentialIntroductionOrchestrator` class
- [ ] Implement `canIntroduceNow()` rate limiting
- [ ] Implement `calculateReadinessScore()` with 4 factors
- [ ] Implement `getPendingAgents()` filtering
- [ ] Create database schema extensions
- [ ] Write unit tests for orchestrator (20+ tests)

**Phase 2: Detection & Metrics (Week 1-2)**
- [ ] Create `EngagementDetectionService` class
- [ ] Implement `calculateEngagementScore()`
- [ ] Implement `calculateContextScore()` with keyword matching
- [ ] Implement `calculatePrerequisiteScore()`
- [ ] Create `engagement_metrics` table
- [ ] Create batch metric update job
- [ ] Write unit tests for detection (15+ tests)

**Phase 3: Content Generation (Week 2)**
- [ ] Create `ConversationalIntroductionGenerator` class
- [ ] Implement `buildUserContext()` aggregation
- [ ] Implement `personalizeIntroduction()` with LLM
- [ ] Create fallback template system
- [ ] Write unit tests for generator (10+ tests)

**Phase 4: Workflow Handlers (Week 2-3)**
- [ ] Create `PageBuilderShowcaseWorkflow` class
- [ ] Implement PageBuilder trigger detection
- [ ] Generate PageBuilder showcase content
- [ ] Create `AgentBuilderTutorialWorkflow` class
- [ ] Implement Agent Builder prerequisite checks
- [ ] Implement `detectAutomationOpportunities()`
- [ ] Write unit tests for workflows (15+ tests)

**Phase 5: Integration (Week 3)**
- [ ] Integrate with `OnboardingFlowService`
- [ ] Hook into post creation handler
- [ ] Hook into comment handler for interaction tracking
- [ ] Extend `AgentIntroductionService` with sequential logic
- [ ] Update `HemingwayBridgeService` for intro bridges
- [ ] Write integration tests (20+ tests)

**Phase 6: Testing & Refinement (Week 4)**
- [ ] Performance testing (latency, throughput)
- [ ] Load testing (concurrent users)
- [ ] Edge case validation (all EC-1 through EC-8)
- [ ] LLM fallback testing
- [ ] Database failure resilience testing
- [ ] End-to-end user journey testing

**Phase 7: Documentation & Deployment (Week 4)**
- [ ] API documentation (JSDoc for all methods)
- [ ] Integration guide for future developers
- [ ] Configuration guide (trigger rules, thresholds)
- [ ] Monitoring dashboard setup
- [ ] Production deployment checklist
- [ ] Rollback plan

### 5.2 Acceptance Criteria

**AC-1: Core Agent Introduction Sequence**
```gherkin
Feature: Core Agent Sequential Introduction

Scenario: Personal Todos agent introduces after Phase 1
  Given a user completes Phase 1 onboarding
  When 24 hours elapse
  Then Personal Todos agent creates introduction post
  And no other agents introduce for another 24 hours

Scenario: Agent Ideas agent introduces after Personal Todos
  Given Personal Todos introduced 24+ hours ago
  When user creates 2nd post OR interacts with Personal Todos
  Then Agent Ideas agent creates introduction post

Scenario: Link Logger agent introduces third
  Given Agent Ideas introduced 24+ hours ago
  When user has 3+ posts OR shares a link
  Then Link Logger agent creates introduction post
```

**AC-2: Context-Triggered Introduction**
```gherkin
Feature: Context-Aware Agent Introduction

Scenario: PageBuilder triggered by keyword
  Given user has Personal Todos agent introduced
  And PageBuilder not yet introduced
  When user creates post containing "dashboard" or "page"
  And 24 hours since last introduction
  Then PageBuilder agent creates contextual introduction
  And introduction references user's post

Scenario: Meeting Prep triggered by calendar mention
  Given user has 2+ core agents introduced
  When user creates post mentioning "meeting" or "calendar"
  Then Meeting Prep agent creates introduction
  And introduction offers to help with upcoming meeting
```

**AC-3: Engagement-Based Introduction**
```gherkin
Feature: Engagement Milestone Introduction

Scenario: Agent Builder after 5 interactions
  Given user has 2+ core agents introduced
  And user has 5+ meaningful agent interactions
  And user has been active for 3+ days
  When Agent Builder readiness score >= 0.5
  Then Agent Builder agent creates tutorial introduction
  And introduction includes detected workflow patterns
  And introduction offers to create first custom agent
```

**AC-4: Rate Limiting Enforcement**
```gherkin
Feature: Introduction Rate Limiting

Scenario: Maximum 1 introduction per 24 hours
  Given Personal Todos introduced 12 hours ago
  When PageBuilder trigger conditions met
  Then PageBuilder introduction is DEFERRED
  And PageBuilder added to introduction queue
  And PageBuilder introduces 12 hours later (24h from last intro)

Scenario: No introduction spam on rapid posts
  Given user creates 5 posts in 10 minutes
  And each post matches different agent triggers
  Then only 1 agent introduction occurs
  And other agents queue for later introduction
```

**AC-5: Ignored Introduction Re-Surface**
```gherkin
Feature: Re-introduce Ignored Agents

Scenario: Agent ignored for 7 days
  Given Personal Todos introduced 7 days ago
  And user has NOT interacted with Personal Todos
  When user reaches new engagement milestone (e.g., 5 posts)
  Then Personal Todos re-introduces with different approach
  And introduction references recent user activity

Scenario: Agent adopted - no re-introduction
  Given Personal Todos introduced 7 days ago
  And user HAS interacted with Personal Todos
  Then Personal Todos does NOT re-introduce
  And introduction marked as successful
```

### 5.3 Success Metrics

**Quantitative Metrics:**
1. **Introduction Success Rate**: ≥60% of introductions result in user interaction within 7 days
2. **Agent Adoption Rate**: ≥70% of introduced agents used at least once
3. **Time to First Interaction**: Average <48 hours from introduction to first use
4. **Re-introduction Rate**: <20% of agents require re-introduction
5. **User Satisfaction**: Survey score ≥4.0/5.0 on introduction experience

**Performance Metrics:**
1. **Readiness Calculation Latency**: <100ms for all pending agents
2. **Introduction Generation Latency**: <500ms (including LLM)
3. **Database Query Performance**: <50ms for engagement metrics
4. **Event Handler Overhead**: <10ms added to post/comment creation

**Qualitative Metrics:**
1. **Discoverability**: Users report discovering agents "at the right time"
2. **Overwhelm Prevention**: Users don't feel bombarded by agents
3. **Educational Value**: Users understand WHY each agent was introduced
4. **Personalization Quality**: Introductions feel relevant and contextual

### 5.4 Rollout Plan

**Phase 1: Alpha Testing (Week 5)**
- Deploy to 10 internal test users
- Monitor introduction queue behavior
- Collect feedback on introduction timing and content
- Iterate on readiness scoring weights

**Phase 2: Beta Testing (Week 6-7)**
- Deploy to 100 beta users (new signups only)
- A/B test: Sequential intros vs. immediate intro (control group)
- Measure success rates and adoption metrics
- Refine LLM prompts based on feedback

**Phase 3: Gradual Rollout (Week 8-10)**
- 25% of new users (Week 8)
- 50% of new users (Week 9)
- 100% of new users (Week 10)
- Monitor production metrics continuously
- Keep fallback to immediate intros available

**Phase 4: Existing User Migration (Week 11-12)**
- Analyze existing users' agent introduction history
- Introduce un-introduced agents sequentially (backfill)
- Respect 48-hour gap for existing users (less aggressive)

### 5.5 Documentation Deliverables

**For Developers:**
1. **Integration Guide** (`docs/SEQUENTIAL-INTRODUCTIONS-INTEGRATION.md`)
   - How to add new agent introduction workflow
   - Trigger rule configuration
   - Customizing readiness score weights

2. **API Reference** (`docs/SEQUENTIAL-INTRODUCTIONS-API.md`)
   - Method signatures for all services
   - Database schema documentation
   - Event payload formats

3. **Testing Guide** (`docs/SEQUENTIAL-INTRODUCTIONS-TESTING.md`)
   - Unit test examples
   - Integration test scenarios
   - Performance testing procedures

**For Product/Design:**
1. **Introduction Content Guidelines** (`docs/INTRODUCTION-CONTENT-GUIDE.md`)
   - Template structure
   - Personalization best practices
   - CTA design patterns

2. **Metrics Dashboard** (`docs/SEQUENTIAL-INTRODUCTIONS-METRICS.md`)
   - Key metrics definitions
   - Dashboard setup instructions
   - Alert thresholds

**For Users:**
1. **Feature Announcement** (in-app post by Λvi)
   - "Introducing Sequential Agent Discovery"
   - Benefits explanation
   - What to expect

### 5.6 Risks & Mitigations

**Risk 1: LLM Personalization Latency**
- Impact: Introduction generation takes >1s, poor UX
- Probability: Medium
- Mitigation: 500ms timeout, fallback to template-based intro
- Monitoring: Track LLM response times, alert if p95 >500ms

**Risk 2: Introduction Fatigue**
- Impact: Users ignore all introductions, low adoption
- Probability: Low (with 24h rate limiting)
- Mitigation: A/B test different wait times (24h vs. 48h)
- Monitoring: Track ignored introduction rate, adjust thresholds

**Risk 3: Context Detection False Positives**
- Impact: Agents introduced at irrelevant times
- Probability: Medium
- Mitigation: Require context score ≥0.3 + other factors (not context alone)
- Monitoring: User feedback on intro relevance

**Risk 4: Database Performance Degradation**
- Impact: Readiness calculation slows down event handling
- Probability: Low (with proper indexing)
- Mitigation: Async calculation, caching, query optimization
- Monitoring: Database query latency alerts

**Risk 5: Agent Introduction Queue Overflow**
- Impact: Users accumulate too many pending intros
- Probability: Low
- Mitigation: Cap queue at 5 agents, prioritize by readiness
- Monitoring: Track queue sizes per user

### 5.7 Future Enhancements

**v2.0 Features:**
1. **Multi-Agent Introductions**: Introduce complementary agents together (e.g., Meeting Prep + Meeting Next Steps)
2. **User-Requested Introductions**: "Show me all available agents" → user-initiated discovery
3. **Introduction Previews**: Λvi mentions upcoming agent in conversation before formal intro
4. **Seasonal/Event-Based Intros**: Introduce agents based on calendar events (e.g., Tax Agent in April)

**v3.0 Features:**
1. **ML-Based Readiness Prediction**: Train model on historical intro success data
2. **Collaborative Filtering**: "Users like you also found Agent X helpful"
3. **Introduction A/B Testing Framework**: Automatically test different intro strategies
4. **Cross-Platform Sync**: Introduction state persists across mobile/web/API

---

## Files to Create

### Service Files
1. `/workspaces/agent-feed/api-server/services/sequential-introductions/orchestrator.service.js`
2. `/workspaces/agent-feed/api-server/services/sequential-introductions/engagement-detection.service.js`
3. `/workspaces/agent-feed/api-server/services/sequential-introductions/introduction-generator.service.js`
4. `/workspaces/agent-feed/api-server/services/sequential-introductions/state-manager.service.js`

### Workflow Files
5. `/workspaces/agent-feed/api-server/services/sequential-introductions/workflows/pagebuilder-showcase.workflow.js`
6. `/workspaces/agent-feed/api-server/services/sequential-introductions/workflows/agent-builder-tutorial.workflow.js`

### Database Migration
7. `/workspaces/agent-feed/api-server/migrations/add-sequential-introduction-tables.sql`

### Test Files
8. `/workspaces/agent-feed/api-server/tests/services/sequential-introductions/orchestrator.service.test.js`
9. `/workspaces/agent-feed/api-server/tests/services/sequential-introductions/engagement-detection.service.test.js`
10. `/workspaces/agent-feed/api-server/tests/services/sequential-introductions/introduction-generator.service.test.js`
11. `/workspaces/agent-feed/api-server/tests/integration/sequential-introductions-e2e.test.js`

### Documentation Files
12. `/workspaces/agent-feed/docs/SEQUENTIAL-INTRODUCTIONS-INTEGRATION-GUIDE.md`
13. `/workspaces/agent-feed/docs/SEQUENTIAL-INTRODUCTIONS-API-REFERENCE.md`
14. `/workspaces/agent-feed/docs/INTRODUCTION-CONTENT-GUIDELINES.md`

### Configuration Files
15. `/workspaces/agent-feed/api-server/config/sequential-introductions.config.js`

---

## Store in Swarm Memory

**Key**: `sequential-intro/sparc-spec`

**Value**: Complete SPARC specification for Sequential Agent Introduction System including:
- Specification with 5 functional requirements and 4 non-functional requirements
- Pseudocode for 5 core services and 2 workflow handlers
- Architecture diagrams for system, data flow, and database schema
- Refinement covering 8 edge cases, 5 performance optimizations, and comprehensive testing strategy
- Completion checklist with 7 implementation phases, 5 acceptance criteria, and success metrics

**Implementation Estimate**: 4 weeks (1 developer)

**Dependencies**:
- Existing `AgentIntroductionService`
- Existing `OnboardingFlowService`
- Existing `HemingwayBridgeService`
- LLM integration for personalization

---

**Status**: ✅ SPECIFICATION COMPLETE
**Next Phase**: Implementation (orchestrator.service.js)
**Estimated Completion**: 4 weeks from start date
