/**
 * Agent Builder Tutorial Workflow Service
 * Interactive workflow that teaches users how to build custom agents
 * Guides through agent creation, configuration, and deployment
 */

import { nanoid } from 'nanoid';

export class AgentBuilderTutorialWorkflow {
  constructor(database, agentLoaderService) {
    if (!database) {
      throw new Error('Database instance is required for AgentBuilderTutorialWorkflow');
    }

    this.db = database;
    this.agentLoader = agentLoaderService;
    this.initializeStatements();
  }

  /**
   * Initialize prepared statements for performance
   */
  initializeStatements() {
    try {
      // Track workflow progress
      this.getProgressStmt = this.db.prepare(`
        SELECT workflow_state
        FROM workflow_progress
        WHERE user_id = ? AND workflow_id = 'agent_builder_tutorial'
      `);

      this.upsertProgressStmt = this.db.prepare(`
        INSERT INTO workflow_progress (id, user_id, workflow_id, workflow_state, updated_at)
        VALUES (?, ?, 'agent_builder_tutorial', ?, unixepoch())
        ON CONFLICT(user_id, workflow_id)
        DO UPDATE SET workflow_state = ?, updated_at = unixepoch()
      `);

      console.log('✅ AgentBuilderTutorialWorkflow prepared statements initialized');
    } catch (error) {
      console.error('❌ Error initializing AgentBuilderTutorialWorkflow statements:', error);
      // Table might not exist yet
    }
  }

  /**
   * Ensure workflow_progress table exists
   */
  ensureWorkflowTable() {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS workflow_progress (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          workflow_id TEXT NOT NULL,
          workflow_state TEXT NOT NULL DEFAULT '{}',
          started_at INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
          completed_at INTEGER,
          FOREIGN KEY (user_id) REFERENCES user_settings(user_id) ON DELETE CASCADE,
          UNIQUE(user_id, workflow_id)
        ) STRICT;
      `);
      console.log('✅ workflow_progress table ensured');
      this.initializeStatements();
    } catch (error) {
      console.error('❌ Error creating workflow_progress table:', error);
    }
  }

  /**
   * Start Agent Builder tutorial workflow
   * @param {string} userId - User ID
   * @returns {Object} Workflow start result
   */
  async startTutorial(userId) {
    try {
      console.log(`🛠️  Starting Agent Builder tutorial for user: ${userId}`);

      this.ensureWorkflowTable();

      // Initialize workflow state
      const state = {
        step: 1,
        totalSteps: 6,
        stepsCompleted: [],
        agentsCreated: [],
        conceptsLearned: [],
        startedAt: Math.floor(Date.now() / 1000)
      };

      // Save state
      const id = nanoid();
      this.upsertProgressStmt.run(id, userId, JSON.stringify(state), JSON.stringify(state));

      // Create welcome message
      const welcomeMessage = this.generateWelcomeMessage();

      return {
        success: true,
        step: 1,
        totalSteps: 6,
        message: welcomeMessage,
        nextAction: 'Continue to learn about agent anatomy'
      };
    } catch (error) {
      console.error('❌ Error starting tutorial:', error);
      throw error;
    }
  }

  /**
   * Generate welcome message for tutorial
   * @private
   */
  generateWelcomeMessage() {
    return `# Welcome to Agent Builder! 🛠️

Ready to create your own custom agents? This tutorial will teach you everything you need to know!

**What you'll learn:**
1. **Agent Anatomy** - Understand the core components of an agent
2. **Prompts & Personas** - Craft effective agent personalities
3. **Capabilities** - Define what your agent can do
4. **Triggers** - Set up when your agent activates
5. **Testing** - Try out your agent before deploying
6. **Deployment** - Launch your custom agent!

By the end, you'll have created your very own custom agent tailored to your needs.

Let's get started! 🚀`;
  }

  /**
   * Get tutorial content for a specific step
   * @param {number} step - Step number
   * @returns {Object} Step content
   */
  getTutorialStep(step) {
    const steps = {
      1: {
        title: 'Step 1: Agent Anatomy 🔬',
        content: `# Understanding Agent Components

Every agent has 4 core components:

## 1. **Identity**
- \`agentId\`: Unique identifier (e.g., "my-custom-agent")
- \`displayName\`: User-friendly name (e.g., "My Custom Agent")
- \`description\`: What your agent does

## 2. **Prompt/Persona**
- The "personality" of your agent
- Instructions for how it should behave
- Examples of responses

## 3. **Capabilities**
- What actions your agent can perform
- What data it can access
- What integrations it has

## 4. **Triggers**
- When your agent activates
- Keywords it listens for
- Contextual conditions

**Example Agent Structure:**
\`\`\`json
{
  "agentId": "productivity-coach",
  "displayName": "Productivity Coach",
  "description": "Helps you stay focused and productive",
  "prompt": "You are a supportive productivity coach...",
  "capabilities": ["task_analysis", "time_tracking"],
  "triggers": ["productivity", "focus", "time management"]
}
\`\`\`

Ready for the next step?`,
        quiz: null,
        nextAction: 'Continue to Prompts & Personas'
      },

      2: {
        title: 'Step 2: Prompts & Personas 🎭',
        content: `# Crafting Agent Personalities

The prompt is your agent's "brain" - it defines how your agent thinks and responds.

## Good Prompt Principles:

### 1. **Clear Identity**
"You are a [role] who [purpose]"

### 2. **Behavioral Guidelines**
- How formal/casual to be
- Tone and style
- Response format

### 3. **Context Awareness**
- What information to use
- When to ask clarifying questions
- How to handle ambiguity

### 4. **Examples**
Show, don't just tell. Include example interactions.

## Example Prompts:

**Casual Coach:**
\`\`\`
You are a friendly productivity coach who helps users optimize their workflow.
Be encouraging, use emojis occasionally, and always ask follow-up questions
to understand their specific needs. Keep responses concise and actionable.
\`\`\`

**Formal Analyst:**
\`\`\`
You are a professional data analyst who provides detailed, evidence-based insights.
Maintain a formal tone, cite specific metrics when available, and structure
responses with clear sections (Summary, Analysis, Recommendations).
\`\`\`

**Pro Tip:** Test different prompts to find the right personality for your use case!

Ready to define capabilities?`,
        quiz: {
          question: 'What makes a good agent prompt?',
          options: [
            'Just telling it what to do',
            'Clear identity + behavioral guidelines + examples',
            'Making it as long as possible',
            'Copying another agent\'s prompt'
          ],
          correctAnswer: 1
        },
        nextAction: 'Continue to Capabilities'
      },

      3: {
        title: 'Step 3: Defining Capabilities 💪',
        content: `# What Can Your Agent Do?

Capabilities are the specific actions and skills your agent possesses.

## Types of Capabilities:

### 1. **Data Access**
- Read from databases
- Query external APIs
- Access user preferences

### 2. **Actions**
- Create posts/comments
- Update settings
- Send notifications
- Trigger workflows

### 3. **Analysis**
- Process text/data
- Generate insights
- Make recommendations
- Detect patterns

### 4. **Integrations**
- Third-party services
- Other agents
- External tools

## Example Capability Definitions:

\`\`\`json
{
  "capabilities": [
    {
      "id": "analyze_productivity",
      "description": "Analyzes user's task completion patterns",
      "permissions": ["read_posts", "read_user_activity"],
      "parameters": ["time_range", "metric_type"]
    },
    {
      "id": "suggest_priorities",
      "description": "Recommends task prioritization",
      "permissions": ["read_tasks", "create_comments"],
      "parameters": ["task_list", "deadline_urgency"]
    }
  ]
}
\`\`\`

**Remember:** Start with core capabilities. You can always add more later!

Next: Setting up triggers`,
        quiz: null,
        nextAction: 'Continue to Triggers'
      },

      4: {
        title: 'Step 4: Setting Up Triggers 🎯',
        content: `# When Should Your Agent Activate?

Triggers determine when your agent springs into action.

## Trigger Types:

### 1. **Keyword Triggers**
Agent activates when specific words appear
\`\`\`json
{
  "keywordTriggers": ["productivity", "focus", "time management"]
}
\`\`\`

### 2. **Contextual Triggers**
Based on user activity or patterns
\`\`\`json
{
  "contextualTriggers": {
    "postCount": { "operator": ">=", "value": 3 },
    "timeOfDay": "morning",
    "userMood": "stressed"
  }
}
\`\`\`

### 3. **Scheduled Triggers**
Run at specific times
\`\`\`json
{
  "scheduledTriggers": {
    "daily": "09:00",
    "weekly": "Monday"
  }
}
\`\`\`

### 4. **Manual Triggers**
User explicitly mentions the agent
\`\`\`json
{
  "manualTriggers": {
    "mention": "@productivity-coach",
    "command": "/coach"
  }
}
\`\`\`

## Best Practices:

✅ Start with manual triggers for testing
✅ Add keyword triggers for relevant topics
✅ Use contextual triggers sparingly (avoid spam)
✅ Combine multiple trigger types for flexibility

**Example Combined Triggers:**
\`\`\`json
{
  "triggers": {
    "keywords": ["focus", "productivity"],
    "manual": "@productivity-coach",
    "contextual": {
      "lowProductivityDetected": true,
      "userRequestedHelp": true
    }
  }
}
\`\`\`

Ready to test your agent?`,
        quiz: {
          question: 'Which trigger type is best for initial testing?',
          options: [
            'Scheduled triggers',
            'Manual triggers (@mention)',
            'Keyword triggers',
            'Contextual triggers'
          ],
          correctAnswer: 1
        },
        nextAction: 'Continue to Testing'
      },

      5: {
        title: 'Step 5: Testing Your Agent 🧪',
        content: `# Test Before You Deploy!

Testing ensures your agent works as expected.

## Testing Checklist:

### 1. **Response Quality**
- [ ] Agent responds to triggers correctly
- [ ] Responses are helpful and on-brand
- [ ] Tone matches your intended persona
- [ ] Examples work as expected

### 2. **Error Handling**
- [ ] Handles unclear requests gracefully
- [ ] Asks for clarification when needed
- [ ] Doesn't crash on edge cases
- [ ] Provides helpful error messages

### 3. **Performance**
- [ ] Responds in reasonable time
- [ ] Doesn't spam users
- [ ] Triggers activate appropriately
- [ ] Doesn't conflict with other agents

### 4. **User Experience**
- [ ] Easy to understand
- [ ] Provides value
- [ ] Not overwhelming
- [ ] Clear call-to-actions

## Testing Modes:

**Sandbox Mode** (Recommended)
- Test safely without affecting production
- Try different scenarios
- Iterate quickly

**Beta Testing**
- Limited rollout to select users
- Gather real feedback
- Refine based on usage

**A/B Testing**
- Test different prompts/behaviors
- Compare effectiveness
- Data-driven improvements

## Common Issues & Fixes:

| Issue | Solution |
|-------|----------|
| Agent doesn't trigger | Check trigger configuration |
| Responses too long | Simplify prompt, add length limit |
| Wrong tone | Revise persona in prompt |
| Triggers too often | Tighten trigger conditions |

Once testing looks good, you're ready to deploy! 🚀`,
        quiz: null,
        nextAction: 'Continue to Deployment'
      },

      6: {
        title: 'Step 6: Deploying Your Agent 🚀',
        content: `# Launch Your Custom Agent!

You've built and tested your agent - now it's time to go live!

## Deployment Steps:

### 1. **Finalize Configuration**
\`\`\`json
{
  "agentId": "my-custom-agent",
  "displayName": "My Custom Agent",
  "version": "1.0.0",
  "status": "active",
  "visibility": "private" // or "public"
}
\`\`\`

### 2. **Set Permissions**
- Who can use this agent?
- What data can it access?
- What actions can it perform?

### 3. **Create Introduction**
Your agent needs to introduce itself to users:
\`\`\`json
{
  "introMessage": "Hi! I'm [Agent Name]. I help you [purpose].",
  "capabilities": ["What I can do"],
  "examples": ["Try me with..."]
}
\`\`\`

### 4. **Monitor Performance**
After deployment, track:
- Usage frequency
- User satisfaction
- Error rates
- Performance metrics

### 5. **Iterate & Improve**
- Gather user feedback
- Refine prompts
- Add new capabilities
- Fix issues

## Publishing Options:

**Private** (Just for you)
- Test with real data
- Refine based on your usage
- Keep it personal

**Shared** (With team/friends)
- Limited distribution
- Controlled feedback
- Beta testing phase

**Public** (Everyone)
- Available in agent marketplace
- Help the community
- Get broader feedback

## Next Steps After Deployment:

1. **Monitor** first 48 hours closely
2. **Collect** user feedback actively
3. **Iterate** based on real usage
4. **Scale** if successful
5. **Build** more agents!

## Congratulations! 🎉

You've completed the Agent Builder tutorial!

You now know how to:
✅ Design agent architecture
✅ Write effective prompts
✅ Define capabilities
✅ Set up triggers
✅ Test thoroughly
✅ Deploy with confidence

**Ready to build?**
Create your first custom agent and bring your ideas to life!`,
        quiz: null,
        nextAction: 'Complete tutorial'
      }
    };

    return steps[step] || steps[1];
  }

  /**
   * Progress to next step
   * @param {string} userId - User ID
   * @param {number} currentStep - Current step
   * @param {Object} stepData - Data from completed step
   * @returns {Promise<Object>} Next step result
   */
  async progressToNextStep(userId, currentStep, stepData = {}) {
    try {
      const state = this.getWorkflowState(userId);

      if (!state) {
        return {
          success: false,
          error: 'Tutorial not started'
        };
      }

      const parsedState = JSON.parse(state.workflow_state);
      const nextStep = currentStep + 1;

      // Update state
      parsedState.step = nextStep;
      parsedState.stepsCompleted.push(currentStep);

      // Track concepts learned
      if (stepData.conceptLearned) {
        parsedState.conceptsLearned.push(stepData.conceptLearned);
      }

      // Check if completed
      if (nextStep > parsedState.totalSteps) {
        return this.completeTutorial(userId);
      }

      // Save state
      const id = nanoid();
      this.upsertProgressStmt.run(
        id,
        userId,
        JSON.stringify(parsedState),
        JSON.stringify(parsedState)
      );

      // Get next step content
      const stepContent = this.getTutorialStep(nextStep);

      return {
        success: true,
        step: nextStep,
        totalSteps: parsedState.totalSteps,
        ...stepContent
      };
    } catch (error) {
      console.error('❌ Error progressing to next step:', error);
      throw error;
    }
  }

  /**
   * Get workflow state
   * @param {string} userId - User ID
   * @returns {Object|null} Workflow state
   */
  getWorkflowState(userId) {
    try {
      return this.getProgressStmt.get(userId);
    } catch (error) {
      console.error('❌ Error getting workflow state:', error);
      return null;
    }
  }

  /**
   * Complete tutorial
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Completion result
   */
  async completeTutorial(userId) {
    try {
      const state = this.getWorkflowState(userId);

      if (!state) {
        return {
          success: false,
          error: 'Tutorial not found'
        };
      }

      const parsedState = JSON.parse(state.workflow_state);
      parsedState.completed = true;
      parsedState.completedAt = Math.floor(Date.now() / 1000);

      // Update with completion
      this.db.prepare(`
        UPDATE workflow_progress
        SET workflow_state = ?, completed_at = ?, updated_at = unixepoch()
        WHERE user_id = ? AND workflow_id = 'agent_builder_tutorial'
      `).run(JSON.stringify(parsedState), parsedState.completedAt, userId);

      return {
        success: true,
        completed: true,
        message: 'Tutorial completed! You\'re ready to build custom agents! 🎉',
        duration: parsedState.completedAt - parsedState.startedAt,
        conceptsLearned: parsedState.conceptsLearned.length,
        certificate: this.generateCertificate(userId, parsedState)
      };
    } catch (error) {
      console.error('❌ Error completing tutorial:', error);
      throw error;
    }
  }

  /**
   * Generate completion certificate
   * @private
   */
  generateCertificate(userId, state) {
    return {
      userId,
      tutorial: 'Agent Builder',
      completedAt: state.completedAt,
      duration: state.completedAt - state.startedAt,
      stepsCompleted: state.stepsCompleted.length,
      conceptsLearned: state.conceptsLearned.length,
      certificateId: nanoid()
    };
  }

  /**
   * Get tutorial progress
   * @param {string} userId - User ID
   * @returns {Object} Progress information
   */
  getProgress(userId) {
    try {
      const state = this.getWorkflowState(userId);

      if (!state) {
        return {
          started: false,
          progress: 0
        };
      }

      const parsedState = JSON.parse(state.workflow_state);

      return {
        started: true,
        step: parsedState.step,
        totalSteps: parsedState.totalSteps,
        progress: (parsedState.stepsCompleted.length / parsedState.totalSteps) * 100,
        completed: parsedState.completed || false,
        conceptsLearned: parsedState.conceptsLearned?.length || 0
      };
    } catch (error) {
      console.error('❌ Error getting progress:', error);
      return {
        started: false,
        progress: 0,
        error: error.message
      };
    }
  }

  /**
   * Reset tutorial (for retaking)
   * @param {string} userId - User ID
   * @returns {Object} Reset result
   */
  resetTutorial(userId) {
    try {
      this.db.prepare(`
        DELETE FROM workflow_progress
        WHERE user_id = ? AND workflow_id = 'agent_builder_tutorial'
      `).run(userId);

      return {
        success: true,
        message: 'Tutorial reset successfully'
      };
    } catch (error) {
      console.error('❌ Error resetting tutorial:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @param {Object} agentLoaderService - Agent loader service instance
 * @returns {AgentBuilderTutorialWorkflow} Service instance
 */
export function createAgentBuilderTutorialWorkflow(db, agentLoaderService) {
  return new AgentBuilderTutorialWorkflow(db, agentLoaderService);
}

export default AgentBuilderTutorialWorkflow;
