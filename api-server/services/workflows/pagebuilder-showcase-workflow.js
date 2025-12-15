/**
 * Page Builder Showcase Workflow Service
 * Interactive workflow that guides users through Page Builder capabilities
 * Demonstrates features through hands-on examples
 */

import { nanoid } from 'nanoid';

export class PageBuilderShowcaseWorkflow {
  constructor(database, pageService) {
    if (!database) {
      throw new Error('Database instance is required for PageBuilderShowcaseWorkflow');
    }
    if (!pageService) {
      throw new Error('PageService is required for PageBuilderShowcaseWorkflow');
    }

    this.db = database;
    this.pageService = pageService;
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
        WHERE user_id = ? AND workflow_id = 'pagebuilder_showcase'
      `);

      this.upsertProgressStmt = this.db.prepare(`
        INSERT INTO workflow_progress (id, user_id, workflow_id, workflow_state, updated_at)
        VALUES (?, ?, 'pagebuilder_showcase', ?, unixepoch())
        ON CONFLICT(user_id, workflow_id)
        DO UPDATE SET workflow_state = ?, updated_at = unixepoch()
      `);

      console.log('✅ PageBuilderShowcaseWorkflow prepared statements initialized');
    } catch (error) {
      console.error('❌ Error initializing PageBuilderShowcaseWorkflow statements:', error);
      // Table might not exist yet, that's okay
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
   * Start Page Builder showcase workflow
   * @param {string} userId - User ID
   * @returns {Object} Workflow start result
   */
  async startShowcase(userId) {
    try {
      console.log(`🎨 Starting Page Builder showcase for user: ${userId}`);

      this.ensureWorkflowTable();

      // Initialize workflow state
      const state = {
        step: 1,
        totalSteps: 5,
        stepsCompleted: [],
        examplePagesCreated: [],
        startedAt: Math.floor(Date.now() / 1000)
      };

      // Save state
      const id = nanoid();
      this.upsertProgressStmt.run(id, userId, JSON.stringify(state), JSON.stringify(state));

      // Create welcome message
      const welcomeMessage = this.generateWelcomeMessage();

      // Create first example page
      const examplePage = await this.createExamplePage(userId, 'welcome');

      return {
        success: true,
        step: 1,
        totalSteps: 5,
        message: welcomeMessage,
        examplePageId: examplePage.id,
        nextAction: 'View the welcome page to continue'
      };
    } catch (error) {
      console.error('❌ Error starting showcase:', error);
      throw error;
    }
  }

  /**
   * Generate welcome message for showcase
   * @private
   */
  generateWelcomeMessage() {
    return `# Welcome to the Page Builder Showcase! 🎨

I'm excited to show you what you can build with the Page Builder agent!

Over the next few steps, I'll guide you through:
1. **Dashboard Pages** - Visualize your data with charts and metrics
2. **Documentation Pages** - Create beautiful, formatted documentation
3. **Profile Pages** - Build custom profiles for agents or projects
4. **Custom Layouts** - Design unique layouts with drag-and-drop components
5. **Your First Page** - Create your own custom page

Let's start with a simple dashboard example. Click on the page I just created for you! 👇`;
  }

  /**
   * Create an example page
   * @param {string} userId - User ID
   * @param {string} pageType - Type of example page
   * @returns {Promise<Object>} Created page
   */
  async createExamplePage(userId, pageType) {
    const examples = {
      welcome: {
        title: 'My First Dashboard',
        components: [
          {
            type: 'header',
            content: 'Welcome to Your Dashboard!',
            level: 1
          },
          {
            type: 'metric-card',
            label: 'Posts Created',
            value: '12',
            trend: '+3 this week'
          },
          {
            type: 'metric-card',
            label: 'Agents Met',
            value: '5',
            trend: '+2 today'
          },
          {
            type: 'text',
            content: 'This is an example of what you can build with Page Builder. Pretty cool, right?'
          }
        ]
      },
      documentation: {
        title: 'Documentation Example',
        components: [
          {
            type: 'header',
            content: 'Getting Started Guide',
            level: 1
          },
          {
            type: 'text',
            content: 'This is how you create beautiful documentation pages.'
          },
          {
            type: 'code-block',
            language: 'javascript',
            content: 'console.log("Hello from Page Builder!");'
          },
          {
            type: 'callout',
            variant: 'info',
            content: 'Pro tip: Use code blocks to share snippets!'
          }
        ]
      },
      profile: {
        title: 'Agent Profile Example',
        components: [
          {
            type: 'avatar',
            name: 'Personal Todos Agent',
            imageUrl: null
          },
          {
            type: 'header',
            content: 'Personal Todos Agent',
            level: 2
          },
          {
            type: 'badge-list',
            badges: ['Productivity', 'Organization', 'IMPACT Scoring']
          },
          {
            type: 'text',
            content: 'This agent helps you manage tasks with smart prioritization.'
          }
        ]
      },
      custom_layout: {
        title: 'Custom Layout Example',
        components: [
          {
            type: 'grid',
            columns: 2,
            items: [
              { type: 'text', content: 'Left column content' },
              { type: 'text', content: 'Right column content' }
            ]
          },
          {
            type: 'divider'
          },
          {
            type: 'sidebar-layout',
            sidebar: { type: 'text', content: 'Sidebar content' },
            main: { type: 'text', content: 'Main content area' }
          }
        ]
      }
    };

    const pageConfig = examples[pageType];

    // Use page service to create page
    // This is a simplified version - would integrate with actual page service
    const page = {
      id: nanoid(),
      userId,
      title: pageConfig.title,
      components: pageConfig.components,
      created_at: Math.floor(Date.now() / 1000)
    };

    console.log(`✅ Created example page: ${pageConfig.title}`);

    return page;
  }

  /**
   * Progress to next step in workflow
   * @param {string} userId - User ID
   * @param {number} currentStep - Current step number
   * @returns {Object} Next step result
   */
  async progressToNextStep(userId, currentStep) {
    try {
      const state = this.getWorkflowState(userId);

      if (!state) {
        return {
          success: false,
          error: 'Workflow not started'
        };
      }

      const parsedState = JSON.parse(state.workflow_state);
      const nextStep = currentStep + 1;

      if (nextStep > parsedState.totalSteps) {
        return this.completeShowcase(userId);
      }

      // Update state
      parsedState.step = nextStep;
      parsedState.stepsCompleted.push(currentStep);

      const id = nanoid();
      this.upsertProgressStmt.run(
        id,
        userId,
        JSON.stringify(parsedState),
        JSON.stringify(parsedState)
      );

      // Generate content for next step
      const stepContent = this.generateStepContent(nextStep);

      // Create example page for this step
      let examplePage = null;
      if (stepContent.exampleType) {
        examplePage = await this.createExamplePage(userId, stepContent.exampleType);
      }

      return {
        success: true,
        step: nextStep,
        totalSteps: parsedState.totalSteps,
        message: stepContent.message,
        examplePageId: examplePage?.id,
        nextAction: stepContent.nextAction
      };
    } catch (error) {
      console.error('❌ Error progressing to next step:', error);
      throw error;
    }
  }

  /**
   * Generate content for a specific step
   * @private
   */
  generateStepContent(step) {
    const steps = {
      1: {
        message: 'Step 1: Dashboard Pages',
        exampleType: 'welcome',
        nextAction: 'View the example dashboard'
      },
      2: {
        message: 'Step 2: Documentation Pages - Create formatted docs with code blocks and callouts',
        exampleType: 'documentation',
        nextAction: 'Check out the documentation example'
      },
      3: {
        message: 'Step 3: Profile Pages - Build custom agent or project profiles',
        exampleType: 'profile',
        nextAction: 'View the profile example'
      },
      4: {
        message: 'Step 4: Custom Layouts - Design with grids and sidebars',
        exampleType: 'custom_layout',
        nextAction: 'See the layout examples'
      },
      5: {
        message: 'Step 5: Create Your Own! - Now it\'s your turn to build something',
        exampleType: null,
        nextAction: 'Start creating your own page'
      }
    };

    return steps[step] || steps[1];
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
   * Complete showcase workflow
   * @param {string} userId - User ID
   * @returns {Object} Completion result
   */
  async completeShowcase(userId) {
    try {
      const state = this.getWorkflowState(userId);

      if (!state) {
        return {
          success: false,
          error: 'Workflow not found'
        };
      }

      const parsedState = JSON.parse(state.workflow_state);
      parsedState.completed = true;
      parsedState.completedAt = Math.floor(Date.now() / 1000);

      // Update with completion
      this.db.prepare(`
        UPDATE workflow_progress
        SET workflow_state = ?, completed_at = ?, updated_at = unixepoch()
        WHERE user_id = ? AND workflow_id = 'pagebuilder_showcase'
      `).run(JSON.stringify(parsedState), parsedState.completedAt, userId);

      const completionMessage = `# Congratulations! 🎉

You've completed the Page Builder showcase!

You now know how to:
✅ Create dashboard pages with metrics
✅ Build documentation with formatting
✅ Design profile pages
✅ Use custom layouts

**What's next?**
Try creating your own page! Just mention @page-builder-agent and describe what you want to build.

Need ideas? Try:
- A personal dashboard for your productivity
- A documentation page for a project
- A profile page for your favorite agent`;

      return {
        success: true,
        completed: true,
        message: completionMessage,
        duration: parsedState.completedAt - parsedState.startedAt,
        pagesCreated: parsedState.examplePagesCreated.length
      };
    } catch (error) {
      console.error('❌ Error completing showcase:', error);
      throw error;
    }
  }

  /**
   * Get showcase progress
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
        examplePagesCreated: parsedState.examplePagesCreated?.length || 0
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
   * Reset showcase for user (for testing)
   * @param {string} userId - User ID
   * @returns {Object} Reset result
   */
  resetShowcase(userId) {
    try {
      this.db.prepare(`
        DELETE FROM workflow_progress
        WHERE user_id = ? AND workflow_id = 'pagebuilder_showcase'
      `).run(userId);

      return {
        success: true,
        message: 'Showcase reset successfully'
      };
    } catch (error) {
      console.error('❌ Error resetting showcase:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @param {Object} pageService - Page service instance
 * @returns {PageBuilderShowcaseWorkflow} Service instance
 */
export function createPageBuilderShowcaseWorkflow(db, pageService) {
  return new PageBuilderShowcaseWorkflow(db, pageService);
}

export default PageBuilderShowcaseWorkflow;
