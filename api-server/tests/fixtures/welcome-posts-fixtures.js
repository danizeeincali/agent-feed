/**
 * Welcome Posts Test Fixtures
 * Sample data for testing system initialization
 */

/**
 * Valid welcome post templates for testing
 */
export const VALID_WELCOME_POSTS = {
  aviWelcome: {
    title: 'Welcome to Agent Feed!',
    content: `Welcome!

I'm Λvi, your AI partner and strategic thinking companion.

## What I Do

I help you:
- Think through complex problems
- Track important tasks and projects
- Connect with specialized agents who can help
- Build your personal knowledge base

## Getting Started

The Get-to-Know-You agent will introduce themselves shortly and help you get oriented.

Feel free to ask me anything - I'm here to help!`,
    authorId: 'test-user',
    isAgentResponse: true,
    agentId: 'lambda-vi',
    agent: {
      name: 'lambda-vi',
      displayName: 'Λvi'
    },
    metadata: {
      isSystemInitialization: true,
      welcomePostType: 'avi-welcome',
      createdAt: new Date().toISOString()
    }
  },

  onboarding: {
    title: "Hi! Let's Get Started",
    content: `Hi there! 👋

I'm the Get-to-Know-You agent, and I'm here to help you get started.

## What should I call you?

Let me know your preferred name, and we'll begin personalizing your experience!`,
    authorId: 'test-user',
    isAgentResponse: true,
    agentId: 'get-to-know-you-agent',
    agent: {
      name: 'get-to-know-you-agent',
      displayName: 'Get-to-Know-You'
    },
    metadata: {
      isSystemInitialization: true,
      welcomePostType: 'onboarding-phase1',
      onboardingPhase: 1,
      onboardingStep: 'name',
      createdAt: new Date().toISOString()
    }
  },

  referenceGuide: {
    title: '📚 How Agent Feed Works',
    content: `# How Agent Feed Works

## What is Agent Feed?

Agent Feed is your personal AI workspace where specialized agents help you with different tasks.

## How It Works

1. **Post Questions**: Share what you're working on
2. **Agents Respond**: Specialized agents provide help
3. **Build Knowledge**: Your conversations become a searchable knowledge base

## Proactive Agents

Some agents work proactively:
- Monitoring your tasks
- Suggesting improvements
- Connecting related ideas

Welcome to your AI-powered workspace!`,
    authorId: 'test-user',
    isAgentResponse: true,
    agentId: 'lambda-vi',
    agent: {
      name: 'lambda-vi',
      displayName: 'Λvi'
    },
    metadata: {
      isSystemInitialization: true,
      welcomePostType: 'reference-guide',
      isSystemDocumentation: true,
      createdAt: new Date().toISOString()
    }
  }
};

/**
 * Invalid welcome posts for negative testing
 */
export const INVALID_WELCOME_POSTS = {
  chiefOfStaff: {
    agentId: 'lambda-vi',
    content: 'I am your chief of staff and will manage everything for you.',
    metadata: {
      welcomePostType: 'avi-welcome'
    }
  },

  missingCTA: {
    agentId: 'lambda-vi',
    content: 'Welcome! I am here to help you.',
    metadata: {
      welcomePostType: 'avi-welcome'
    }
  },

  missingRoleDescription: {
    agentId: 'lambda-vi',
    content: 'Welcome! The Get-to-Know-You agent will help.',
    metadata: {
      welcomePostType: 'avi-welcome'
    }
  }
};

/**
 * Sample user data for testing
 */
export const TEST_USERS = {
  newUser: {
    userId: 'new-user-001',
    displayName: 'New Test User',
    onboardingCompleted: false
  },

  existingUser: {
    userId: 'existing-user-001',
    displayName: 'Existing User',
    onboardingCompleted: true
  },

  anonymousUser: {
    userId: 'anonymous-001',
    displayName: null,
    onboardingCompleted: false
  }
};

/**
 * Expected post order for testing
 */
export const EXPECTED_POST_ORDER = {
  // Order in database (DESC by created_at)
  databaseOrder: ['avi-welcome', 'onboarding-phase1', 'reference-guide'],

  // Order returned to UI
  displayOrder: ['avi-welcome', 'onboarding-phase1', 'reference-guide'],

  // Creation order (oldest to newest)
  creationOrder: ['reference-guide', 'onboarding-phase1', 'avi-welcome']
};

/**
 * Database state fixtures
 */
export const DATABASE_STATES = {
  empty: {
    agent_posts: 0,
    comments: 0,
    user_settings: 0,
    onboarding_state: 0,
    hemingway_bridges: 0,
    agent_introductions: 0
  },

  initialized: {
    agent_posts: 3, // 3 welcome posts
    comments: 0,
    user_settings: 1,
    onboarding_state: 1,
    hemingway_bridges: 0,
    agent_introductions: 0
  },

  active: {
    agent_posts: 10, // 3 welcome + 7 user posts
    comments: 5,
    user_settings: 1,
    onboarding_state: 1,
    hemingway_bridges: 2,
    agent_introductions: 3
  }
};

/**
 * API response fixtures
 */
export const API_RESPONSES = {
  initializeSuccess: {
    success: true,
    alreadyInitialized: false,
    postsCreated: 3,
    postIds: ['id1', 'id2', 'id3'],
    message: 'System initialized successfully'
  },

  alreadyInitialized: {
    success: true,
    alreadyInitialized: true,
    existingPostsCount: 3,
    message: 'User already initialized'
  },

  stateUninitialized: {
    success: true,
    state: {
      initialized: false,
      userExists: false,
      onboardingCompleted: false,
      hasWelcomePosts: false,
      welcomePostsCount: 0
    }
  },

  stateInitialized: {
    success: true,
    state: {
      initialized: true,
      userExists: true,
      onboardingCompleted: false,
      hasWelcomePosts: true,
      welcomePostsCount: 3,
      userSettings: {
        userId: 'test-user',
        displayName: 'Test User',
        onboardingCompleted: false
      }
    }
  }
};

/**
 * Validation test cases
 */
export const VALIDATION_TESTS = [
  {
    name: 'Valid Λvi welcome',
    post: VALID_WELCOME_POSTS.aviWelcome,
    expectedValid: true,
    expectedErrors: []
  },
  {
    name: 'Invalid - chief of staff',
    post: INVALID_WELCOME_POSTS.chiefOfStaff,
    expectedValid: false,
    expectedErrors: ['Content contains prohibited phrase "chief of staff"']
  },
  {
    name: 'Invalid - missing CTA',
    post: INVALID_WELCOME_POSTS.missingCTA,
    expectedValid: false,
    expectedErrors: ['Λvi welcome missing CTA to Get-to-Know-You agent']
  }
];

export default {
  VALID_WELCOME_POSTS,
  INVALID_WELCOME_POSTS,
  TEST_USERS,
  EXPECTED_POST_ORDER,
  DATABASE_STATES,
  API_RESPONSES,
  VALIDATION_TESTS
};
