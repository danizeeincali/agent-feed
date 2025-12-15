# SPARC Specification: Agent Routing Decision Tree

**Version**: 1.0.0
**Date**: 2025-11-07
**Phase**: Specification
**Status**: Draft for Review

---

## Executive Summary

This specification defines an intelligent agent routing system for Λvi (Chief of Staff) to determine when to use `agent-ideas-agent` vs `agent-architect-agent` vs direct agent creation, based on keyword triggers, intent classification, and workflow patterns. The routing system optimizes token usage while maintaining high-quality agent creation.

**Problem Statement**: Currently unclear when to route agent creation requests through specialized agents vs. creating directly, leading to inefficient token usage and inconsistent agent quality.

**Solution**: Implement a decision tree with keyword triggers, intent classification, and workflow protocols to route agent requests optimally.

---

## 1. System Context Analysis

### Current Agent Ecosystem

**Location**: `/workspaces/agent-feed/prod/.claude/agents/`

**Agents Analyzed**:

1. **agent-ideas-agent** (Tier 1, Public)
   - **Purpose**: Capture and analyze ideas for new agents
   - **Token Budget**: ~10K tokens
   - **Capabilities**: Feasibility assessment, gap analysis, prioritization
   - **When to Use**: Brainstorming, ecosystem planning, idea evaluation
   - **Output**: JSON idea database, feasibility reports

2. **agent-architect-agent** (Tier 2, Protected)
   - **Purpose**: Create new agents from scratch
   - **Token Budget**: ~5K tokens
   - **Capabilities**: Agent design, configuration, skill integration
   - **When to Use**: Concrete agent creation with clear requirements
   - **Output**: Complete .md agent files

3. **system-architect-agent** (Tier 2, Protected)
   - **Purpose**: System-wide architecture and infrastructure
   - **Token Budget**: ~8K tokens
   - **Capabilities**: Database schema, architectural patterns, migrations
   - **When to Use**: System-level decisions affecting multiple components
   - **Output**: Architecture Decision Records (ADRs), migration plans

### Current Routing Gaps

**Gap 1**: No clear criteria for routing to agent-ideas-agent
- Users unsure when to brainstorm vs. create directly
- Token waste when ideas phase skipped for unclear requirements

**Gap 2**: No handoff protocol between agents
- agent-ideas-agent output not automatically fed to agent-architect-agent
- Manual copy-paste of requirements between phases

**Gap 3**: No distinction between agent creation vs. system architecture
- Requests sometimes go to wrong specialist
- Token waste from incorrect initial routing

**Gap 4**: No validation of readiness for creation
- agent-architect-agent sometimes receives incomplete specs
- Leads to back-and-forth and quality issues

---

## 2. Requirements Specification

### 2.1 Functional Requirements

**FR-1: Intent Classification**
- **MUST** classify user intent into categories: Brainstorm, Create, Modify, Architect
- **MUST** analyze keywords and request structure
- **MUST** handle ambiguous requests with clarifying questions
- **MUST** support multi-intent requests (e.g., "brainstorm and create")

**FR-2: Routing Decision Tree**
- **MUST** route based on intent, clarity, and scope
- **MUST** select optimal agent(s) for request
- **MUST** support parallel routing (multiple agents)
- **MUST** support sequential routing (pipeline)

**FR-3: Keyword Trigger System**
- **MUST** detect trigger keywords for each routing path
- **MUST** weight keywords by confidence level
- **MUST** handle keyword conflicts
- **MUST** support natural language variations

**FR-4: Handoff Protocol**
- **MUST** automatically transfer context between agents
- **MUST** format outputs for downstream consumption
- **MUST** validate completeness before handoff
- **MUST** log handoff events for monitoring

**FR-5: Validation and Quality Gates**
- **MUST** validate requirements completeness before creation
- **MUST** check for existing similar agents
- **MUST** enforce naming conventions
- **MUST** verify skill availability

### 2.2 Non-Functional Requirements

**NFR-1: Token Efficiency**
- Routing decision overhead < 500 tokens
- Avoid loading unnecessary agent instructions
- Prefer direct creation for simple cases

**NFR-2: User Experience**
- Routing decision visible to user (transparency)
- Clear explanations for routing choices
- Clarifying questions when ambiguous

**NFR-3: Accuracy**
- 95%+ correct initial routing
- < 5% re-routing required
- 90%+ user satisfaction with routing

**NFR-4: Maintainability**
- Configuration-driven keyword rules
- Easy to add new agents to routing
- Clear documentation of decision logic

---

## 3. Intent Classification System

### 3.1 Intent Categories

```typescript
type UserIntent =
  | 'BRAINSTORM'          // Explore ideas, gap analysis
  | 'CREATE_AGENT'        // Build new agent with clear spec
  | 'MODIFY_AGENT'        // Update existing agent
  | 'SYSTEM_ARCHITECTURE' // System-wide decisions
  | 'EVALUATE_FEASIBILITY'// Assess idea viability
  | 'UNCLEAR';            // Needs clarification

interface IntentClassification {
  primaryIntent: UserIntent;
  secondaryIntents: UserIntent[];
  confidence: number;        // 0.0 - 1.0
  triggers: KeywordTrigger[];
  clarificationNeeded: boolean;
  suggestedQuestions?: string[];
}
```

### 3.2 Keyword Trigger System

**Tier 1: High Confidence (0.9+)**

| Keyword/Phrase | Intent | Agent |
|----------------|--------|-------|
| "brainstorm agent ideas" | BRAINSTORM | agent-ideas-agent |
| "create new agent" | CREATE_AGENT | agent-architect-agent |
| "update agent X" | MODIFY_AGENT | agent-maintenance-agent |
| "system architecture" | SYSTEM_ARCHITECTURE | system-architect-agent |
| "database schema" | SYSTEM_ARCHITECTURE | system-architect-agent |

**Tier 2: Medium Confidence (0.7-0.89)**

| Keyword/Phrase | Intent | Agent |
|----------------|--------|-------|
| "what agents should we build" | BRAINSTORM | agent-ideas-agent |
| "agent for X task" | CREATE_AGENT | agent-architect-agent |
| "gap in agent ecosystem" | BRAINSTORM | agent-ideas-agent |
| "migration plan" | SYSTEM_ARCHITECTURE | system-architect-agent |
| "feasibility of X agent" | EVALUATE_FEASIBILITY | agent-ideas-agent |

**Tier 3: Low Confidence (0.5-0.69)**

| Keyword/Phrase | Intent | Clarification Needed |
|----------------|--------|----------------------|
| "new agent" | CREATE_AGENT | Yes - what type? |
| "idea for agent" | BRAINSTORM | Yes - explore or create? |
| "agent problem" | MODIFY_AGENT | Yes - what problem? |
| "system change" | SYSTEM_ARCHITECTURE | Yes - what kind? |

### 3.3 Contextual Modifiers

**Increase BRAINSTORM confidence if**:
- User mentions "multiple options"
- Request includes "pros and cons"
- Mentions "not sure which approach"
- Includes "explore possibilities"

**Increase CREATE_AGENT confidence if**:
- Clear agent name provided
- Specific capabilities listed
- Tools/skills mentioned
- Example use cases included

**Increase SYSTEM_ARCHITECTURE confidence if**:
- Affects multiple components
- Database changes mentioned
- Performance/scaling discussed
- Migration/deployment involved

---

## 4. Routing Decision Tree

### 4.1 Decision Flow

```
User Request
     │
     ▼
[Intent Classification]
     │
     ├─→ UNCLEAR ────────────────────────────────┐
     │                                            │
     ├─→ BRAINSTORM ──────→ agent-ideas-agent    │
     │                            │               │
     │                            ▼               │
     │                   [Feasibility Complete]   │
     │                            │               │
     │                            ├─→ High Priority → agent-architect-agent
     │                            └─→ Low Priority → Store for later
     │
     ├─→ CREATE_AGENT
     │        │
     │        ├─→ Requirements Clear? ──YES──→ agent-architect-agent
     │        │                         │
     │        └─→ NO ──────────────────┐│
     │                                  ││
     ├─→ MODIFY_AGENT ──────→ agent-maintenance-agent
     │
     ├─→ SYSTEM_ARCHITECTURE ──→ system-architect-agent
     │
     └─→ EVALUATE_FEASIBILITY ──→ agent-ideas-agent
                │
                ▼
          [Ask Clarifying Questions] ←──────────┘
```

### 4.2 Routing Rules

**Rule 1: Direct Creation**
```
IF intent == CREATE_AGENT
AND confidence > 0.85
AND requirements_clear == true
AND no_similar_agent_exists == true
THEN route_to(agent-architect-agent)
```

**Rule 2: Brainstorm First**
```
IF intent == BRAINSTORM
OR (intent == CREATE_AGENT AND confidence < 0.7)
OR requirements_clear == false
THEN route_to(agent-ideas-agent)
```

**Rule 3: System-Level Decision**
```
IF intent == SYSTEM_ARCHITECTURE
OR affects_multiple_components == true
OR database_schema_change == true
THEN route_to(system-architect-agent)
```

**Rule 4: Modification**
```
IF intent == MODIFY_AGENT
AND agent_exists == true
THEN route_to(agent-maintenance-agent)
```

**Rule 5: Feasibility Check**
```
IF intent == EVALUATE_FEASIBILITY
OR user_uncertain == true
THEN route_to(agent-ideas-agent)
```

**Rule 6: Clarification Needed**
```
IF confidence < 0.6
OR intent == UNCLEAR
THEN ask_clarifying_questions()
```

### 4.3 Multi-Agent Workflows

**Workflow 1: Brainstorm → Create**
```
1. agent-ideas-agent generates feasibility report
2. User reviews and approves high-priority idea
3. agent-architect-agent creates agent using feasibility spec
4. agent-maintenance-agent registers new agent
```

**Workflow 2: Architecture → Create**
```
1. system-architect-agent designs system components
2. Identifies agent requirements from architecture
3. agent-architect-agent creates supporting agents
4. Integration testing and deployment
```

**Workflow 3: Evaluate → Modify**
```
1. agent-ideas-agent assesses improvement opportunity
2. Recommends modifications to existing agent
3. agent-maintenance-agent implements changes
4. Testing and validation
```

---

## 5. Agent Selection Criteria

### 5.1 agent-ideas-agent Selection

**Use When**:
- Exploring multiple agent possibilities
- Unclear on what agent is needed
- Gap analysis of agent ecosystem required
- Prioritization of multiple ideas needed
- Feasibility assessment required

**Requirements Check**:
- [ ] User wants multiple options
- [ ] Requirements not fully defined
- [ ] Ecosystem fit analysis needed
- [ ] Business case evaluation needed

**Output Expected**:
- JSON idea database
- Feasibility rankings
- Priority recommendations
- Implementation roadmap

### 5.2 agent-architect-agent Selection

**Use When**:
- Clear agent requirements defined
- Ready to create production agent
- Specific capabilities identified
- Skills and tools determined

**Requirements Check**:
- [ ] Agent name decided
- [ ] Purpose/responsibilities clear
- [ ] Tools/skills identified
- [ ] Coordination patterns defined
- [ ] Success criteria established

**Output Expected**:
- Complete agent .md file
- Frontmatter configuration
- Skills integration
- Coordination protocols

### 5.3 system-architect-agent Selection

**Use When**:
- System-wide architecture decisions
- Database schema changes
- Major refactoring required
- Cross-component infrastructure

**Requirements Check**:
- [ ] Affects multiple components
- [ ] Infrastructure change needed
- [ ] Migration strategy required
- [ ] System-level impact

**Output Expected**:
- Architecture Decision Records (ADRs)
- Migration plans
- Impact analysis
- Implementation phases

---

## 6. Handoff Protocol Design

### 6.1 agent-ideas-agent → agent-architect-agent

**Trigger**: User approves high-priority idea from feasibility report

**Handoff Data Structure**:
```json
{
  "handoffType": "IDEA_TO_CREATION",
  "sourceAgent": "agent-ideas-agent",
  "targetAgent": "agent-architect-agent",
  "timestamp": "2025-11-07T10:00:00Z",

  "approvedIdea": {
    "ideaId": "AI-PROD-2025-001",
    "title": "Testing Automation Agent",
    "priority": "high",
    "feasibilityScore": 8.5
  },

  "requirements": {
    "purpose": "Automate E2E testing workflows",
    "capabilities": ["test generation", "coverage analysis", "CI/CD integration"],
    "tools": ["read", "write", "bash", "test_runner"],
    "skills": ["test-patterns", "automation-frameworks"]
  },

  "constraints": {
    "tokenBudget": 5000,
    "coordinatesWith": ["cicd-engineer", "coder"],
    "productionCompliance": true
  },

  "context": {
    "userNeed": "Reduce manual testing burden",
    "ecosystemGap": "No dedicated testing automation",
    "businessImpact": "30% time savings for development team"
  }
}
```

**Validation Rules**:
- All required fields must be present
- Feasibility score must be > 6.0
- No existing similar agent
- Skills must be available or creatable

### 6.2 system-architect-agent → agent-architect-agent

**Trigger**: Architecture decision creates need for new agents

**Handoff Data Structure**:
```json
{
  "handoffType": "ARCHITECTURE_TO_AGENT",
  "sourceAgent": "system-architect-agent",
  "targetAgent": "agent-architect-agent",
  "timestamp": "2025-11-07T10:00:00Z",

  "architectureDecision": {
    "adrId": "ADR-015",
    "title": "Distributed Caching Layer",
    "requiresAgents": true
  },

  "agentRequirements": [
    {
      "name": "cache-manager-agent",
      "purpose": "Manage Redis cache operations",
      "integration": "cache-invalidation-system",
      "priority": "critical"
    }
  ],

  "systemContext": {
    "affectedComponents": ["skill-loader", "agent-loader"],
    "performanceGoals": "10x faster skill loading",
    "constraints": ["redis-availability", "cache-coherence"]
  }
}
```

### 6.3 Handoff Validation

**Pre-Handoff Checklist**:
- [ ] Source agent completed its phase
- [ ] All required data present
- [ ] Target agent available
- [ ] Dependencies resolved
- [ ] User approval obtained (if required)

**Post-Handoff Verification**:
- [ ] Target agent acknowledged handoff
- [ ] Context successfully transferred
- [ ] Work initiated by target agent
- [ ] Progress tracked and reported

---

## 7. Clarifying Questions System

### 7.1 When to Ask Questions

**Scenario 1: Ambiguous Intent**
- Confidence < 0.6
- Multiple intents detected
- Conflicting keywords

**Scenario 2: Incomplete Requirements**
- CREATE_AGENT intent but missing key details
- No agent name provided
- Capabilities unclear

**Scenario 3: Scope Uncertainty**
- Could be agent-level or system-level
- Unclear if new agent or modify existing
- Multiple possible approaches

### 7.2 Question Templates

**Template 1: Intent Clarification**
```
I'm not sure if you want to:
1. 🔍 Brainstorm and explore agent ideas (agent-ideas-agent)
2. 🛠️ Create a specific agent you have in mind (agent-architect-agent)
3. ⚙️ Make system-wide changes (system-architect-agent)

Could you clarify which one matches your goal?
```

**Template 2: Requirements Gathering**
```
To create this agent, I need a few more details:

1. **Agent Name**: What should we call it?
2. **Primary Purpose**: What is its main responsibility?
3. **Key Capabilities**: What should it be able to do? (3-5 capabilities)
4. **Tools Needed**: read/write/bash/etc.?
5. **Coordinates With**: Which other agents will it work with?

Once you provide these, I'll route to agent-architect-agent for creation.
```

**Template 3: Scope Clarification**
```
This request could be interpreted as:

**Option A**: New agent for X (agent-level)
→ Routes to: agent-architect-agent
→ Output: Single agent .md file

**Option B**: System-wide infrastructure for X (system-level)
→ Routes to: system-architect-agent
→ Output: Architecture decision + multiple components

Which approach fits your need better?
```

---

## 8. Routing Decision API

### 8.1 Request Schema

```typescript
interface RoutingRequest {
  userRequest: string;
  context?: {
    conversationHistory?: Message[];
    currentAgents?: string[];
    recentWork?: WorkContext[];
  };
  preferences?: {
    preferDirect?: boolean;
    requestExplanation?: boolean;
  };
}
```

### 8.2 Response Schema

```typescript
interface RoutingDecision {
  primaryRoute: {
    agent: string;
    confidence: number;
    reasoning: string;
  };

  alternativeRoutes?: Array<{
    agent: string;
    confidence: number;
    reasoning: string;
  }>;

  workflow?: {
    type: 'sequential' | 'parallel';
    steps: WorkflowStep[];
  };

  clarificationNeeded?: {
    questions: string[];
    context: string;
  };

  validation: {
    requirementsComplete: boolean;
    similarAgentExists: boolean;
    skillsAvailable: boolean;
  };
}

interface WorkflowStep {
  sequence: number;
  agent: string;
  action: string;
  input: any;
  output: string;
  handoffTo?: string;
}
```

### 8.3 Example Routing Decisions

**Example 1: Direct Creation**
```json
{
  "primaryRoute": {
    "agent": "agent-architect-agent",
    "confidence": 0.95,
    "reasoning": "Clear requirements provided: agent name, purpose, capabilities, and tools defined. Ready for immediate creation."
  },
  "validation": {
    "requirementsComplete": true,
    "similarAgentExists": false,
    "skillsAvailable": true
  }
}
```

**Example 2: Brainstorm First**
```json
{
  "primaryRoute": {
    "agent": "agent-ideas-agent",
    "confidence": 0.85,
    "reasoning": "Request indicates exploration needed. Multiple possibilities mentioned. Feasibility assessment will help prioritize."
  },
  "workflow": {
    "type": "sequential",
    "steps": [
      {
        "sequence": 1,
        "agent": "agent-ideas-agent",
        "action": "feasibility_analysis",
        "output": "idea_database",
        "handoffTo": "agent-architect-agent"
      },
      {
        "sequence": 2,
        "agent": "agent-architect-agent",
        "action": "create_agent",
        "input": "approved_idea_spec"
      }
    ]
  }
}
```

**Example 3: Clarification Needed**
```json
{
  "clarificationNeeded": {
    "questions": [
      "What specific capabilities should this agent have?",
      "Which existing agents should it coordinate with?",
      "Is this a user-facing or system agent?"
    ],
    "context": "Request is ambiguous between creating a new agent vs. modifying existing functionality. More details needed to route correctly."
  }
}
```

---

## 9. Integration Points

### 9.1 Λvi Integration

**File**: Λvi system instructions (production CLAUDE.md)

**New Responsibilities**:
- Analyze user requests for agent routing
- Apply decision tree before delegating
- Validate handoffs between agents
- Track routing decisions and outcomes

**Token Budget Impact**:
- Routing logic: ~300 tokens
- Decision explanation: ~200 tokens
- Total overhead: ~500 tokens per request

### 9.2 Agent Discovery Integration

**Current**: Manual agent selection by Λvi

**Enhanced**: Automated routing with decision tree

**Benefits**:
- Reduced token usage (avoid loading wrong agent)
- Faster time to action
- Improved first-time-right rate

---

## 10. Metrics and Monitoring

### 10.1 Key Metrics

**Routing Accuracy**:
- `routing_correct_first_time` - Percentage of correct initial routes
- `routing_reroutes_required` - Count of re-routing needed
- `clarification_rate` - Percentage requiring clarifying questions

**Workflow Efficiency**:
- `brainstorm_to_creation_time` - Time from idea to agent creation
- `handoff_success_rate` - Successful handoffs between agents
- `workflow_completion_rate` - End-to-end workflow success

**Quality Metrics**:
- `agent_creation_quality_score` - Quality of created agents
- `requirements_completeness` - Spec completeness before creation
- `user_satisfaction_routing` - User satisfaction with routing decisions

### 10.2 Dashboard

**Routing Analytics Dashboard**:
- Intent distribution pie chart
- Routing accuracy over time
- Agent utilization heatmap
- Workflow success funnel

---

## 11. Testing Strategy

### 11.1 Unit Tests

**Test**: Intent classification accuracy
**Input**: Sample user requests
**Expected**: Correct intent with confidence > 0.8

**Test**: Keyword trigger detection
**Input**: Requests with known triggers
**Expected**: Correct agent selection

**Test**: Clarification logic
**Input**: Ambiguous requests
**Expected**: Appropriate questions generated

### 11.2 Integration Tests

**Test**: End-to-end brainstorm → create workflow
**Steps**:
1. Submit brainstorm request
2. Verify agent-ideas-agent engaged
3. Approve idea
4. Verify handoff to agent-architect-agent
5. Verify agent created

**Test**: Multi-agent coordination
**Input**: System architecture request
**Expected**: Correct routing to system-architect-agent, then fan-out to specialists

### 11.3 User Acceptance Tests

**Scenario 1**: User with clear requirements
**Expected**: Direct route to agent-architect-agent

**Scenario 2**: User exploring options
**Expected**: Route to agent-ideas-agent

**Scenario 3**: User with vague request
**Expected**: Clarifying questions before routing

---

## 12. Rollout Plan

### Phase 1: Prototype (Week 1)
- [ ] Implement intent classification
- [ ] Build keyword trigger system
- [ ] Create decision tree logic
- [ ] Unit testing

### Phase 2: Integration (Week 2)
- [ ] Integrate with Λvi
- [ ] Implement handoff protocols
- [ ] Add clarification system
- [ ] Integration testing

### Phase 3: Beta (Week 3)
- [ ] Deploy to staging
- [ ] User testing with selected users
- [ ] Collect feedback
- [ ] Refine routing rules

### Phase 4: Production (Week 4)
- [ ] Full rollout
- [ ] Monitor metrics
- [ ] Optimize based on data
- [ ] Document best practices

---

## 13. Success Criteria

**Quantitative**:
- 95%+ correct routing first time
- < 5% re-routing required
- < 10% clarification rate
- 90%+ handoff success rate
- 30%+ token savings vs. manual routing

**Qualitative**:
- Users report clarity in routing decisions
- Reduced confusion about which agent to use
- Faster agent creation workflows
- Higher quality agent specifications

---

## 14. Open Questions

1. **Should routing be fully automatic or user-confirmable?**
   - Auto: Faster, risk of wrong route
   - Confirm: Slower, user has final say

2. **How to handle routing conflicts?**
   - Multiple agents with equal confidence
   - Sequential vs. parallel execution

3. **Should clarifying questions block or suggest?**
   - Block: Must answer to proceed
   - Suggest: Provide defaults, allow override

4. **How to version routing rules?**
   - Static config file
   - Machine learning model
   - Hybrid approach

---

## 15. References

- **Agent Ideas Agent**: `/prod/.claude/agents/agent-ideas-agent.md`
- **Agent Architect Agent**: `/prod/.claude/agents/agent-architect-agent.md`
- **System Architect Agent**: `/prod/.claude/agents/system-architect-agent.md`
- **Λvi Instructions**: `/prod/CLAUDE.md`

---

## Document Metadata

**Author**: SPARC Specification Agent
**Reviewers**: System Architect, Λvi Coordination Team, Product Owner
**Approval Status**: Pending Review
**Next Phase**: Pseudocode Design
**Related Documents**:
- `grace-period-handler-spec.md` (companion spec)
- `pseudocode.md` (next phase)
