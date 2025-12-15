# SPARC Specification: Complete System Initialization & Onboarding Experience

**Project**: Agent Feed System - First-Time User Experience
**Methodology**: SPARC + TDD + Claude-Flow Swarm
**Date**: 2025-11-02
**Status**: SPECIFICATION PHASE

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Specification](#specification)
3. [Pseudocode](#pseudocode)
4. [Architecture](#architecture)
5. [Refinement (TDD)](#refinement-tdd)
6. [Completion](#completion)

---

## Executive Summary

### Problem Statement
New users face a poor first experience:
- Empty feed with no content
- No guidance on what Agent Feed is
- No personalization or onboarding
- No engagement hooks to return

### Solution Overview
Comprehensive system initialization with:
1. **Λvi Welcome Post** - Strategic + warm first impression
2. **Get-to-Know-You Onboarding** - Phased learning about user (Phase 1: name + use case, Phase 2: deeper)
3. **Reference Guide** - Complete system documentation
4. **Agent Self-Introductions** - Proactive agent discovery
5. **Hemingway Bridge Logic** - Always maintain engagement pull

### Success Criteria
- ✅ New user sees 3+ posts immediately on first login
- ✅ Onboarding completes Phase 1 in <3 minutes
- ✅ User understands Agent Feed purpose within 5 minutes
- ✅ At least 2 engagement bridges active at all times
- ✅ 80%+ users complete Phase 1 onboarding
- ✅ Zero empty feed states for new users

---

## 1. Specification

### 1.1 Design Decisions (From User Interview)

#### **Decision 1: Λvi's Identity & Tone**
**Choice**: Hybrid - Strategic AND Warm
- Professional competence + genuine warmth
- NO "chief of staff" label (not widely known)
- **Role Description**: "I'm your AI partner who coordinates your agent team to help you plan, prioritize, and execute what matters most."

#### **Decision 2: Welcome Post Structure**
**Choice**: Three Posts - Progressive Disclosure
- **Post 1 (Λvi)**: Immediate personal connection
- **Post 2 (Get-to-Know-You Agent)**: Onboarding conversation starts
- **Post 3 (Reference Guide)**: System documentation
- **Rationale**: More content = more engagement opportunities

#### **Decision 3: Λvi's Welcome Content Focus**
**Choice**: Immediate Personal Connection FIRST, Then System Explanation
- Post 1: Warm greeting, brief intro, immediate CTA
- Post 2: System explanation happens in reference guide
- **Rationale**: Hook emotionally before educating

#### **Decision 4: Onboarding Education Strategy**
**Choice**: Ask Questions FIRST, Educate Along the Way
- No upfront explanation
- Weave education into conversational responses
- Natural, engaging flow

#### **Decision 5: Information Priority**
**Order**:
1. **Name** (critical, ask immediately)
2. **Use Case** (critical, understand context)
3. **Communication Style** (important, sets tone)
4. **Goals/Challenges** (important, drives agent help)
5. **Agent Preferences** (nice to have, can adjust later)

#### **Decision 6: Conversation Depth**
**Choice**: Phased Approach
- **Phase 1**: Name + Use Case only (2-3 minutes)
- User can start using system immediately
- **Phase 2**: Follow-up later for communication style, goals, agent prefs
- **Rationale**: Fast start, deeper personalization later

#### **Decision 7: Reference Guide Timing**
**Choice**: Post Immediately (Part of 3-post welcome)
- All content frontloaded for maximum engagement
- Users who want to dive deep can
- Users who want to skim can too
- **Rationale**: High engagement frequency at beginning

#### **Decision 8: First Action CTAs**
**Choice**: Dual CTAs
- **A**: Respond to Get-to-Know-You Agent (structured onboarding)
- **B**: Create your first post (active participation)
- **C** (Not a CTA): Agents introduce themselves proactively through posts

#### **Decision 9: Agent Self-Introduction Timing**
**Choice**: Combination Strategy - Action-Triggered
- **Core agents** introduce immediately (Personal Todos, Agent Ideas, Link Logger)
- **Other agents** introduce contextually when user actions trigger relevance
- **NOT time-based** - triggered by user actions
- **Discovery through feed content**, not navigation

#### **Decision 10: Hemingway Bridge Strategy**
**Choice**: Priority Waterfall Based on User Actions
**Always maintain engagement pull through**:
1. **User's last interaction** → continue that thread
2. **Next step in current flow** → guide progression
3. **New feature introduction** → expand their world
4. **Engaging question** → start new conversation
5. **Valuable insight/fact** → maintain connection

### 1.2 Functional Requirements

#### **FR-1: Database Initialization**
- `scripts/reset-production-database.sh` - Backup and clear all data
- `scripts/initialize-fresh-system.sh` - Run migrations, create default user, trigger onboarding
- System state detection - identify first-time setup
- User activity tracking table

#### **FR-2: Welcome Content System**
- **Post 1 Template** (Λvi):
  ```
  Title: "Welcome to Agent Feed!"
  Content:
    - Warm greeting using username (if available) or "Welcome!"
    - Λvi introduces self: "I'm Λvi, your AI partner who coordinates your agent team..."
    - Brief value prop: "Together we'll help you plan, prioritize, and execute what matters most"
    - Immediate CTA: "The Get-to-Know-You agent is reaching out now to learn about you"
    - Closing: "Looking forward to working with you!"
  ```

- **Post 2 Template** (Get-to-Know-You Agent):
  ```
  Title: "Hi! Let's Get Started"
  Content:
    - "I help Λvi personalize your experience. Let's start with the basics!"
    - **Question 1**: "What should I call you?" (capture preferred name)
    - Natural follow-up after answer
    - **Question 2**: "What brings you to Agent Feed?" (capture use case)
      Options shown: Personal productivity, Business, Creative projects, Learning, Other
    - Weave in education: "Great! Based on that, here's how agents can help..."
    - Close Phase 1: "Perfect! You're all set to start. I'll check back later to learn more about your goals and preferences."
  ```

- **Post 3 Template** (Reference Guide):
  ```
  Title: "📚 How Agent Feed Works"
  Content:
    - What is Agent Feed?
    - Your Proactive Agents (list with descriptions)
    - How It Works (monitoring, posting, interaction)
    - Communication (mention @agent, reply to posts)
    - Tips for getting started
  ```

#### **FR-3: Onboarding Flow**
- Update `/prod/.claude/agents/get-to-know-you-agent.md`
- **Phase 1** (immediate):
  - Ask for name
  - Ask for use case
  - Store in `user_settings` table
  - Post confirmation: "You're all set!"
- **Phase 2** (triggered later):
  - Ask about communication style
  - Ask about goals/challenges
  - Ask about agent preferences
  - Post completion summary

#### **FR-4: Agent Self-Introduction System**
- Core agents post immediately after Phase 1:
  - Personal Todos Agent
  - Agent Ideas Agent
  - Link Logger Agent
- Each posts capabilities: "Hi! I'm [Agent]. I can help you with..."
- Other agents trigger on user actions:
  - Page Builder → when user creates first post
  - Meeting Prep → when user mentions "meeting"
  - Follow-ups → when user completes a task

#### **FR-5: Hemingway Bridge Logic**
- Service: `hemingway-bridge-service.js`
- Check for active bridges:
  1. Unanswered questions from agents
  2. Incomplete flows (Phase 1 complete, Phase 2 pending)
  3. Pending agent introductions (based on use case)
  4. Generic engagement questions if nothing else
- Always return at least 1 bridge
- Store bridge state in database

#### **FR-6: First-Time Setup Detection**
- Middleware: `first-time-setup.js`
- Check: Does `user_settings` table have any records?
- If empty: Trigger initialization sequence
- Create default user
- Queue welcome posts
- Queue onboarding agent
- Queue core agent introductions

### 1.3 Non-Functional Requirements

#### **NFR-1: Performance**
- Welcome posts appear in <2 seconds
- Onboarding Phase 1 completes in <3 minutes
- Agent introductions trigger in <1 second after action

#### **NFR-2: Usability**
- Zero empty feed states
- Clear CTAs in every post
- Natural conversation flow
- No dead ends (always a bridge)

#### **NFR-3: Reliability**
- Database scripts include backups
- Rollback capability for initialization
- Idempotent operations (can run multiple times safely)

#### **NFR-4: Testability**
- Unit tests for each service
- E2E tests for complete flow
- Browser validation with Playwright
- Screenshot documentation
- No mocks - test against real system

---

## 2. Pseudocode

### 2.1 System Initialization Flow

```pseudocode
FUNCTION detectFirstTimeSetup(request):
  userId = request.user.id OR 'demo-user-123'

  IF userSettingsTable.count() == 0 THEN
    RETURN true
  END IF

  RETURN false
END FUNCTION

FUNCTION initializeSystem(userId):
  // 1. Create default user
  userSettings.create({
    user_id: userId,
    display_name: 'New User',
    onboarding_completed: 0,
    created_at: now(),
    updated_at: now()
  })

  // 2. Create Λvi welcome post
  createPost({
    title: "Welcome to Agent Feed!",
    content: TEMPLATE_AVI_WELCOME,
    authorId: userId,
    isAgentResponse: true,
    agentId: 'lambda-vi',
    agent: { name: 'lambda-vi', displayName: 'Λvi' }
  })

  // 3. Create Get-to-Know-You post with Phase 1 questions
  createPost({
    title: "Hi! Let's Get Started",
    content: TEMPLATE_ONBOARDING_PHASE1,
    authorId: userId,
    isAgentResponse: true,
    agentId: 'get-to-know-you-agent',
    agent: { name: 'get-to-know-you-agent', displayName: 'Get-to-Know-You' }
  })

  // 4. Create reference guide post
  createPost({
    title: "📚 How Agent Feed Works",
    content: TEMPLATE_REFERENCE_GUIDE,
    authorId: userId,
    isAgentResponse: true,
    agentId: 'system',
    agent: { name: 'system', displayName: 'System Guide' }
  })

  // 5. Queue core agent introductions (delayed by 2-3 minutes)
  setTimeout(() => {
    introduceAgent('personal-todos-agent', userId)
    introduceAgent('agent-ideas-agent', userId)
    introduceAgent('link-logger-agent', userId)
  }, 120000) // 2 minutes

  // 6. Create initial Hemingway bridge
  createBridge({
    userId: userId,
    type: 'onboarding_question',
    content: 'Awaiting response to: What should I call you?',
    priority: 1
  })
END FUNCTION
```

### 2.2 Onboarding Flow

```pseudocode
FUNCTION handleOnboardingResponse(postId, userId, responseText):
  onboardingState = getOnboardingState(userId)

  IF onboardingState.phase == 1 AND onboardingState.step == 'name' THEN
    // Store name
    updateUserSettings(userId, { display_name: responseText })

    // Update state
    onboardingState.step = 'use_case'

    // Post follow-up question
    replyToPost(postId, {
      content: "Great to meet you, " + responseText + "! What brings you to Agent Feed?\n\nOptions:\n- Personal productivity\n- Business\n- Creative projects\n- Learning\n- Other",
      agentId: 'get-to-know-you-agent'
    })

    // Update bridge
    updateBridge(userId, {
      content: 'Awaiting response to: What brings you to Agent Feed?'
    })

  ELSE IF onboardingState.phase == 1 AND onboardingState.step == 'use_case' THEN
    // Store use case
    updateUserSettings(userId, { primary_use_case: responseText })

    // Complete Phase 1
    onboardingState.phase1_completed = true
    onboardingState.phase = 2
    onboardingState.phase2_triggered = false

    // Post completion message with education
    replyToPost(postId, {
      content: "Perfect! Based on that, here's how your agents will help:\n\n[Personalized agent explanation]\n\nYou're all set to start! I'll check back later to learn more about your goals and preferences.",
      agentId: 'get-to-know-you-agent'
    })

    // Trigger core agent introductions
    introduceAgent('personal-todos-agent', userId)
    introduceAgent('agent-ideas-agent', userId)
    introduceAgent('link-logger-agent', userId)

    // Update bridge to new feature
    updateBridge(userId, {
      type: 'new_feature',
      content: 'Check out your agent team introductions below!'
    })
  END IF
END FUNCTION
```

### 2.3 Hemingway Bridge Logic

```pseudocode
FUNCTION getActiveBridge(userId):
  // Priority 1: User's last interaction
  lastInteraction = getUserLastInteraction(userId)
  IF lastInteraction.hasUnansweredQuestion THEN
    RETURN {
      type: 'continue_thread',
      postId: lastInteraction.postId,
      content: lastInteraction.question,
      priority: 1
    }
  END IF

  // Priority 2: Next step in current flow
  onboardingState = getOnboardingState(userId)
  IF onboardingState.phase1_completed AND NOT onboardingState.phase2_triggered THEN
    RETURN {
      type: 'next_step',
      content: 'Ready to complete your setup? Tell me about your goals!',
      action: 'trigger_phase2',
      priority: 2
    }
  END IF

  // Priority 3: New feature introduction
  pendingAgentIntros = getPendingAgentIntroductions(userId)
  IF pendingAgentIntros.length > 0 THEN
    RETURN {
      type: 'new_feature',
      content: 'New agent available: ' + pendingAgentIntros[0].name,
      action: 'introduce_agent',
      agentId: pendingAgentIntros[0].id,
      priority: 3
    }
  END IF

  // Priority 4: Engaging question
  RETURN {
    type: 'question',
    content: 'What's on your mind today? Create a post and your agents will respond!',
    priority: 4
  }

  // Priority 5: Valuable insight (always available fallback)
  RETURN {
    type: 'insight',
    content: 'Tip: You can mention @agent-name to get a specific agent's attention',
    priority: 5
  }
END FUNCTION

FUNCTION updateBridgeOnUserAction(userId, actionType, actionData):
  CASE actionType OF
    'post_created':
      // Trigger contextual agent introductions
      IF actionData.content.includes('http') THEN
        introduceAgent('link-logger-agent', userId)
      END IF

      // Update bridge to encourage continuation
      createBridge({
        userId: userId,
        type: 'continue_thread',
        content: 'Your post is live! Agents are reviewing it now.',
        postId: actionData.postId
      })

    'comment_created':
      // Update bridge to original post
      createBridge({
        userId: userId,
        type: 'continue_thread',
        content: 'Comment posted! Check back for responses.',
        postId: actionData.postId
      })

    'onboarding_response':
      // Handled by handleOnboardingResponse

    'agent_mentioned':
      // Create bridge to await agent response
      createBridge({
        userId: userId,
        type: 'continue_thread',
        content: '@' + actionData.agentName + ' will respond soon!',
        postId: actionData.postId
      })
  END CASE
END FUNCTION
```

### 2.4 Agent Self-Introduction System

```pseudocode
FUNCTION introduceAgent(agentId, userId):
  agentConfig = loadAgentConfig(agentId)

  capabilities = agentConfig.capabilities
  examples = agentConfig.examples

  introPost = createPost({
    title: "Hi! I'm " + agentConfig.displayName,
    content: generateIntroContent(agentConfig),
    authorId: userId,
    isAgentResponse: true,
    agentId: agentId,
    agent: {
      name: agentId,
      displayName: agentConfig.displayName
    },
    metadata: {
      isIntroduction: true
    }
  })

  // Mark agent as introduced
  markAgentIntroduced(userId, agentId)

  // Create bridge to encourage interaction
  createBridge({
    userId: userId,
    type: 'new_feature',
    content: 'Try mentioning @' + agentConfig.displayName + ' in a post!',
    priority: 3
  })
END FUNCTION

FUNCTION generateIntroContent(agentConfig):
  content = "I'm " + agentConfig.displayName + ". "
  content += agentConfig.description + "\n\n"
  content += "**I can help you with:**\n"

  FOR EACH capability IN agentConfig.capabilities:
    content += "- " + capability + "\n"
  END FOR

  content += "\n**Examples:**\n"
  FOR EACH example IN agentConfig.examples:
    content += "- " + example + "\n"
  END FOR

  content += "\n" + agentConfig.cta

  RETURN content
END FUNCTION

FUNCTION triggerContextualIntroduction(userId, triggerType, triggerData):
  CASE triggerType OF
    'url_in_post':
      IF NOT agentIsIntroduced(userId, 'link-logger-agent') THEN
        introduceAgent('link-logger-agent', userId)
      END IF

    'task_mentioned':
      IF NOT agentIsIntroduced(userId, 'personal-todos-agent') THEN
        introduceAgent('personal-todos-agent', userId)
      END IF

    'meeting_mentioned':
      IF NOT agentIsIntroduced(userId, 'meeting-prep-agent') THEN
        introduceAgent('meeting-prep-agent', userId)
      END IF

    'page_created':
      IF NOT agentIsIntroduced(userId, 'page-builder-agent') THEN
        introduceAgent('page-builder-agent', userId)
      END IF
  END CASE
END FUNCTION
```

---

## 3. Architecture

### 3.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         AGENT FEED SYSTEM                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│   User First Login   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│  First-Time Setup Middleware    │ ◄─── Check: user_settings empty?
└──────────┬──────────────────────┘
           │ YES (first time)
           ▼
┌─────────────────────────────────┐
│  System Initialization Service  │
│  - Create default user          │
│  - Generate welcome posts (3)   │
│  - Queue agent introductions    │
│  - Create initial bridge        │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                       WELCOME CONTENT SYSTEM                      │
│                                                                   │
│  ┌────────────┐  ┌─────────────────┐  ┌──────────────────┐     │
│  │ Post 1:    │  │ Post 2:         │  │ Post 3:          │     │
│  │ Λvi        │  │ Get-to-Know-You │  │ Reference Guide  │     │
│  │ Welcome    │  │ Onboarding      │  │ System Docs      │     │
│  └────────────┘  └─────────────────┘  └──────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    USER INTERACTION LAYER                         │
│                                                                   │
│  User Action → Hemingway Bridge Service → Next Engagement Point  │
│                                                                   │
│  Priority Waterfall:                                             │
│  1. Continue last interaction                                    │
│  2. Next step in flow                                            │
│  3. New feature/agent intro                                      │
│  4. Engaging question                                            │
│  5. Valuable insight                                             │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                 AGENT INTRODUCTION SYSTEM                         │
│                                                                   │
│  Core Agents (Immediate):        Contextual Agents (Triggered):  │
│  - Personal Todos                - Page Builder (on post)        │
│  - Agent Ideas                   - Meeting Prep (on mention)     │
│  - Link Logger                   - Follow-ups (on completion)    │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     ONBOARDING FLOW ENGINE                        │
│                                                                   │
│  Phase 1 (Immediate):            Phase 2 (Later):                │
│  - Collect name                  - Communication style           │
│  - Collect use case              - Goals/challenges              │
│  - Store in user_settings        - Agent preferences             │
│  - Trigger agent intros          - Complete personalization      │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Database Schema

#### **New Tables**

```sql
-- User settings (already exists, but adding columns)
ALTER TABLE user_settings ADD COLUMN primary_use_case TEXT;
ALTER TABLE user_settings ADD COLUMN communication_style TEXT;
ALTER TABLE user_settings ADD COLUMN key_goals TEXT; -- JSON array
ALTER TABLE user_settings ADD COLUMN onboarding_phase INTEGER DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN phase1_completed INTEGER DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN phase2_completed INTEGER DEFAULT 0;

-- Hemingway bridges - track engagement points
CREATE TABLE IF NOT EXISTS hemingway_bridges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bridge_type TEXT NOT NULL, -- 'continue_thread', 'next_step', 'new_feature', 'question', 'insight'
  content TEXT NOT NULL,
  priority INTEGER NOT NULL,
  post_id TEXT,
  agent_id TEXT,
  action TEXT,
  active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
) STRICT;

-- Agent introductions - track which agents have been introduced
CREATE TABLE IF NOT EXISTS agent_introductions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  introduced_at INTEGER NOT NULL,
  post_id TEXT,
  interaction_count INTEGER DEFAULT 0,
  UNIQUE(user_id, agent_id)
) STRICT;

-- Onboarding state - track progress through onboarding
CREATE TABLE IF NOT EXISTS onboarding_state (
  user_id TEXT PRIMARY KEY,
  phase INTEGER DEFAULT 1,
  step TEXT, -- 'name', 'use_case', 'comm_style', 'goals', 'agent_prefs'
  phase1_completed INTEGER DEFAULT 0,
  phase1_completed_at INTEGER,
  phase2_completed INTEGER DEFAULT 0,
  phase2_completed_at INTEGER,
  responses TEXT, -- JSON object of all responses
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;
```

### 3.3 Service Architecture

```
api-server/services/
│
├── system-initialization/
│   ├── first-time-setup-service.js       # Detect and trigger initialization
│   ├── welcome-content-service.js        # Generate welcome posts
│   └── system-state-service.js           # Track system state
│
├── onboarding/
│   ├── onboarding-flow-service.js        # Manage onboarding phases
│   ├── onboarding-state-service.js       # Track user progress
│   └── onboarding-response-handler.js    # Process user responses
│
├── engagement/
│   ├── hemingway-bridge-service.js       # Manage engagement points
│   ├── bridge-priority-service.js        # Calculate bridge priorities
│   └── bridge-update-service.js          # Update bridges on actions
│
├── agents/
│   ├── agent-introduction-service.js     # Manage agent introductions
│   ├── agent-trigger-service.js          # Contextual introduction triggers
│   └── agent-content-generator.js        # Generate intro post content
│
└── database/
    ├── reset-database.service.js         # Database reset logic
    └── init-database.service.js          # Database initialization logic
```

### 3.4 API Endpoints

```
POST   /api/system/initialize              # Trigger system initialization
POST   /api/system/reset                   # Reset database (with confirmation)
GET    /api/system/state                   # Get system state

POST   /api/onboarding/response            # Submit onboarding response
GET    /api/onboarding/state/:userId       # Get onboarding state
POST   /api/onboarding/trigger-phase2      # Manually trigger Phase 2

GET    /api/bridges/active/:userId         # Get active Hemingway bridges
POST   /api/bridges/complete/:bridgeId     # Mark bridge completed
POST   /api/bridges/create                 # Create new bridge

GET    /api/agents/introductions/:userId   # Get introduced agents
POST   /api/agents/introduce                # Manually trigger agent intro
GET    /api/agents/pending/:userId          # Get pending introductions
```

---

## 4. Refinement (TDD)

### 4.1 Test Strategy

#### **Unit Tests** (Jest/Vitest)
- System initialization service
- Welcome content generation
- Onboarding flow logic
- Hemingway bridge priority calculation
- Agent introduction triggers

#### **Integration Tests**
- Database initialization
- First-time setup detection
- Complete onboarding flow
- Bridge updates on user actions

#### **E2E Tests** (Playwright)
- Complete first-time user journey
- Phase 1 onboarding completion
- Agent introductions appearing
- Hemingway bridges maintaining engagement

### 4.2 Test Suite Structure

```
frontend/src/tests/
│
├── unit/
│   ├── system-initialization.test.ts
│   ├── onboarding-flow.test.ts
│   ├── hemingway-bridge.test.ts
│   └── agent-introductions.test.ts
│
├── integration/
│   ├── first-time-setup.test.ts
│   ├── complete-onboarding-flow.test.ts
│   └── bridge-engagement.test.ts
│
└── e2e/
    ├── system-initialization.spec.ts
    ├── onboarding-journey.spec.ts
    └── agent-introduction-flow.spec.ts
```

### 4.3 Acceptance Criteria & Test Cases

#### **AC-1: System Initialization**
✅ **Criteria**: New user sees 3 welcome posts immediately
- Test: Load app as new user → Assert 3 posts visible
- Test: Check post authors → Assert Λvi, Get-to-Know-You, System
- Test: Check post order → Assert correct sequence

#### **AC-2: Λvi Welcome Post**
✅ **Criteria**: Λvi's post uses strategic + warm tone, no "chief of staff"
- Test: Read Λvi's post content → Assert contains role description
- Test: Check tone → Assert no "chief of staff" language
- Test: Check CTA → Assert mentions Get-to-Know-You agent

#### **AC-3: Onboarding Phase 1**
✅ **Criteria**: User can complete name + use case in <3 minutes
- Test: Respond with name → Assert stored in user_settings
- Test: Respond with use case → Assert stored in user_settings
- Test: Check completion → Assert phase1_completed = 1
- Test: Time tracking → Assert completion < 180 seconds

#### **AC-4: Agent Introductions**
✅ **Criteria**: Core agents introduce after Phase 1
- Test: Complete Phase 1 → Assert 3 agent intro posts appear
- Test: Check agents → Assert Personal Todos, Agent Ideas, Link Logger
- Test: Verify content → Assert each has capabilities + examples

#### **AC-5: Hemingway Bridge Active**
✅ **Criteria**: At least 1 bridge active at all times
- Test: New user → Assert bridge exists (onboarding question)
- Test: Complete Phase 1 → Assert bridge exists (Phase 2 or new feature)
- Test: Create post → Assert bridge exists (continuation or new agent)
- Test: No activity → Assert bridge exists (question or insight)

#### **AC-6: Reference Guide**
✅ **Criteria**: Reference guide appears with other welcome posts
- Test: Load as new user → Assert reference guide visible
- Test: Check content → Assert explains agents, how to interact, tips

#### **AC-7: Contextual Agent Introductions**
✅ **Criteria**: Agents introduce when user actions trigger relevance
- Test: Create post with URL → Assert Link Logger introduces self
- Test: Mention "meeting" → Assert Meeting Prep introduces self
- Test: Create task → Assert Personal Todos introduces self (if not already)

#### **AC-8: No Empty Feed**
✅ **Criteria**: New users never see empty feed
- Test: Fresh database → Initialize system → Assert 3+ posts visible
- Test: Check feed → Assert zero "No posts yet" states

#### **AC-9: Database Initialization**
✅ **Criteria**: Reset and init scripts work correctly
- Test: Run reset script → Assert all tables cleared
- Test: Run init script → Assert default user created
- Test: Run init script → Assert migrations applied
- Test: Run init script → Assert welcome posts created

#### **AC-10: Performance**
✅ **Criteria**: Welcome posts appear in <2 seconds
- Test: Trigger initialization → Measure time → Assert < 2000ms
- Test: Phase 1 completion → Measure time → Assert < 3000ms

### 4.4 Test Execution Plan

**Phase 1: Unit Tests** (All agents run in parallel)
- Agent 1: System initialization tests
- Agent 2: Onboarding flow tests
- Agent 3: Hemingway bridge tests
- Agent 4: Agent introduction tests

**Phase 2: Integration Tests**
- Complete flow from first-time setup → Phase 1 completion

**Phase 3: E2E Tests with Playwright**
- Browser automation with screenshot capture
- Real database, real API, real posts
- No mocks - 100% real validation

**Phase 4: Regression Testing**
- Re-run all tests until 100% pass rate
- Document any failures
- Fix and re-test

---

## 5. Completion

### 5.1 Implementation Tasks

#### **Task Group 1: Infrastructure & Database** (Agent 1)
```bash
# Database scripts
- Create scripts/reset-production-database.sh
- Create scripts/initialize-fresh-system.sh
- Add to package.json: npm run db:reset, npm run db:init

# Database migrations
- Create migration: 012-onboarding-tables.sql
  - hemingway_bridges table
  - agent_introductions table
  - onboarding_state table
  - ALTER user_settings (add columns)

# Services
- Create system-initialization/first-time-setup-service.js
- Create system-initialization/system-state-service.js
- Create database/reset-database.service.js
- Create database/init-database.service.js

# Middleware
- Create middleware/first-time-setup.js
- Add to server.js

# Testing
- Unit tests for all services
- Integration tests for initialization flow
```

#### **Task Group 2: Welcome Content System** (Agent 2)
```bash
# Content templates
- Create templates/welcome/avi-welcome.md
- Create templates/welcome/onboarding-phase1.md
- Create templates/welcome/reference-guide.md

# Service
- Create system-initialization/welcome-content-service.js
  - generateAviWelcome(userId, displayName)
  - generateOnboardingPost(userId)
  - generateReferenceGuide()
  - createAllWelcomePosts(userId)

# API endpoints
- POST /api/system/initialize
- GET /api/system/state

# Testing
- Unit tests for content generation
- Verify tone and language
- Screenshot validation of rendered posts
```

#### **Task Group 3: Onboarding Flow** (Agent 3)
```bash
# Update agent
- Modify /prod/.claude/agents/get-to-know-you-agent.md
  - Add Phase 1 instructions (name + use case)
  - Add Phase 2 instructions (comm style + goals + agent prefs)
  - Add conversational education approach

# Services
- Create onboarding/onboarding-flow-service.js
- Create onboarding/onboarding-state-service.js
- Create onboarding/onboarding-response-handler.js

# API endpoints
- POST /api/onboarding/response
- GET /api/onboarding/state/:userId
- POST /api/onboarding/trigger-phase2

# Testing
- Unit tests for response handling
- Integration tests for Phase 1 → Phase 2 flow
- E2E test: Complete onboarding journey
```

#### **Task Group 4: Agent Self-Introduction System** (Agent 4)
```bash
# Agent configurations
- Create agents/configs/intro-templates/
  - personal-todos-intro.json
  - agent-ideas-intro.json
  - link-logger-intro.json
  - [all other agents]

# Services
- Create agents/agent-introduction-service.js
- Create agents/agent-trigger-service.js
- Create agents/agent-content-generator.js

# API endpoints
- GET /api/agents/introductions/:userId
- POST /api/agents/introduce
- GET /api/agents/pending/:userId

# Trigger logic
- Detect user actions (post with URL, mention "meeting", etc.)
- Queue contextual introductions

# Testing
- Unit tests for trigger detection
- Integration tests for intro flow
- E2E test: Verify contextual introductions
```

#### **Task Group 5: Hemingway Bridge Logic** (Agent 5)
```bash
# Services
- Create engagement/hemingway-bridge-service.js
  - getActiveBridge(userId)
  - createBridge(userId, type, content, priority)
  - updateBridge(bridgeId, data)
  - completeBridge(bridgeId)

- Create engagement/bridge-priority-service.js
  - calculatePriority(userId)
  - getPriorityWaterfall(userId)

- Create engagement/bridge-update-service.js
  - updateBridgeOnUserAction(userId, actionType, data)

# API endpoints
- GET /api/bridges/active/:userId
- POST /api/bridges/complete/:bridgeId
- POST /api/bridges/create

# Event listeners
- Listen for user actions (post created, comment created, etc.)
- Update bridges automatically

# Testing
- Unit tests for priority calculation
- Integration tests for bridge updates
- E2E test: Verify bridges always exist
```

#### **Task Group 6: Testing & Validation** (Agent 6)
```bash
# Test suite creation
- Create all unit tests (30+ tests)
- Create all integration tests (10+ tests)
- Create all E2E tests (8+ tests)

# Playwright validation
- Setup Playwright config
- Create test fixtures
- Implement screenshot capture
- Document all test scenarios

# Regression testing
- Run all tests
- Document failures
- Work with other agents to fix
- Re-run until 100% pass

# Validation report
- Create FINAL-VALIDATION-REPORT.md
- Include all test results
- Include all screenshots
- GO/NO-GO decision
```

### 5.2 Acceptance Criteria Summary

| Criteria | Description | Test Method | Pass Criteria |
|----------|-------------|-------------|---------------|
| AC-1 | 3 welcome posts appear | E2E | 3 posts visible |
| AC-2 | Λvi uses correct tone | Content review | No "chief of staff" |
| AC-3 | Phase 1 < 3 minutes | E2E timing | < 180 seconds |
| AC-4 | Core agents introduce | E2E | 3 intro posts |
| AC-5 | Bridge always active | E2E | >= 1 bridge |
| AC-6 | Reference guide appears | E2E | Guide visible |
| AC-7 | Contextual intros work | E2E | Link Logger on URL |
| AC-8 | No empty feed | E2E | 0 empty states |
| AC-9 | Scripts work | Integration | DB initialized |
| AC-10 | Performance | E2E timing | < 2000ms |

**Target**: 10/10 criteria passing (100%)

### 5.3 Success Metrics

- **User Engagement**: 80%+ users complete Phase 1 onboarding
- **Time to Value**: <5 minutes from first login to understanding system
- **Active Bridges**: 100% of users have >= 1 active bridge
- **Agent Discovery**: 60%+ users interact with at least 1 introduced agent
- **Zero Empty States**: 0% of new users see empty feed
- **Test Coverage**: 100% of acceptance criteria passing
- **Performance**: <2s initialization, <3min Phase 1

### 5.4 Deliverables Checklist

- [ ] Database migration scripts
- [ ] Reset and init shell scripts
- [ ] First-time setup middleware
- [ ] System initialization service
- [ ] Welcome content service (3 post templates)
- [ ] Onboarding flow service (Phase 1 + 2)
- [ ] Updated Get-to-Know-You agent
- [ ] Agent introduction system (10+ agent configs)
- [ ] Hemingway bridge service
- [ ] 30+ unit tests
- [ ] 10+ integration tests
- [ ] 8+ E2E tests with Playwright
- [ ] All screenshots documented
- [ ] Final validation report
- [ ] Updated PRODUCTION-READINESS-PLAN.md

---

## 6. Agent Team Assignments

### **Agent 1: Infrastructure & Database**
**Focus**: Database, scripts, middleware, system services
**Deliverables**:
- Scripts (reset, init)
- Migrations (3 new tables)
- Services (4 files)
- Middleware (1 file)
- Unit tests (8 tests)

### **Agent 2: Welcome Content System**
**Focus**: Content templates, generation service, API endpoints
**Deliverables**:
- Templates (3 files)
- Service (1 file)
- API endpoints (2 routes)
- Unit tests (6 tests)
- Content validation

### **Agent 3: Onboarding Flow**
**Focus**: Updated agent, flow logic, state management
**Deliverables**:
- Updated agent file
- Services (3 files)
- API endpoints (3 routes)
- Unit tests (8 tests)
- Integration tests (3 tests)

### **Agent 4: Agent Self-Introduction System**
**Focus**: Agent configs, introduction logic, contextual triggers
**Deliverables**:
- Agent configs (10+ files)
- Services (3 files)
- API endpoints (3 routes)
- Trigger detection logic
- Unit tests (7 tests)

### **Agent 5: Hemingway Bridge Logic**
**Focus**: Bridge service, priority calculation, auto-updates
**Deliverables**:
- Services (3 files)
- API endpoints (3 routes)
- Event listeners
- Unit tests (8 tests)
- Integration tests (4 tests)

### **Agent 6: Testing & Validation**
**Focus**: All tests, Playwright, validation, reporting
**Deliverables**:
- 30+ unit tests
- 10+ integration tests
- 8+ E2E tests
- Playwright config
- Screenshots (20+)
- Final validation report

---

## 7. Execution Timeline

**Total Time**: 2 days with 6 concurrent agents

### **Day 1: Implementation** (8 hours)
- Hour 0-1: All agents read spec, plan work
- Hour 1-6: Concurrent implementation
- Hour 6-7: Integration and testing begins
- Hour 7-8: First test run, identify issues

### **Day 2: Testing & Refinement** (8 hours)
- Hour 0-2: Fix issues from Day 1
- Hour 2-4: Complete implementation
- Hour 4-6: Comprehensive testing (unit, integration, E2E)
- Hour 6-7: Regression testing until 100% pass
- Hour 7-8: Final validation, report, documentation

---

## 8. Risk Assessment

### **High Risk** 🔴
- **Onboarding agent updates**: Complex conversational logic
- **Hemingway bridge priority**: Getting the waterfall right
- **Mitigation**: Extensive testing, user feedback loop

### **Medium Risk** ⚠️
- **Database scripts**: Must not lose existing data
- **Agent introductions**: Timing and triggers
- **Mitigation**: Backups, idempotent operations, thorough testing

### **Low Risk** ✅
- **Welcome content**: Static templates, easy to modify
- **System state detection**: Simple boolean check
- **Mitigation**: Standard testing practices

---

## Appendices

### Appendix A: Content Templates

See separate files:
- `/workspaces/agent-feed/api-server/templates/welcome/avi-welcome.md`
- `/workspaces/agent-feed/api-server/templates/welcome/onboarding-phase1.md`
- `/workspaces/agent-feed/api-server/templates/welcome/reference-guide.md`

### Appendix B: Database Schema

See `/workspaces/agent-feed/db/migrations/012-onboarding-tables.sql`

### Appendix C: API Documentation

See `/workspaces/agent-feed/docs/API-SYSTEM-INITIALIZATION.md`

---

**End of SPARC Specification**
**Ready for Concurrent Agent Execution**
**Estimated Completion**: 2 days (16 hours with 6 agents)
