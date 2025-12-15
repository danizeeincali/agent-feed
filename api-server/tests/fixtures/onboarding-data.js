/**
 * Test fixtures for onboarding improvements
 * Used across integration, E2E, and Playwright tests
 */

module.exports = {
  // Sample onboarding responses
  onboardingResponses: {
    withName: {
      userName: 'Orko',
      interests: ['AI', 'software development', 'music'],
      goals: 'Learn about agent systems and build cool projects'
    },
    withDifferentName: {
      userName: 'Alice',
      interests: ['machine learning', 'data science'],
      goals: 'Understand neural networks'
    },
    withoutName: {
      userName: '',
      interests: ['coding'],
      goals: 'General learning'
    }
  },

  // Expected database states after onboarding
  expectedDatabaseStates: {
    afterNameSet: {
      user_settings: {
        display_name: 'Orko',
        onboarding_completed: true,
        onboarding_completed_at: expect.any(Date)
      },
      user_metadata: {
        interests: ['AI', 'software development', 'music'],
        goals: 'Learn about agent systems and build cool projects'
      }
    },
    afterDifferentName: {
      user_settings: {
        display_name: 'Alice',
        onboarding_completed: true,
        onboarding_completed_at: expect.any(Date)
      }
    },
    withoutNameSet: {
      user_settings: {
        display_name: null,
        onboarding_completed: true,
        onboarding_completed_at: expect.any(Date)
      }
    }
  },

  // Expected post structures for onboarding questions
  expectedPostStructures: {
    nameQuestion: {
      postType: 'onboarding',
      isComment: false,
      hasParentPost: false,
      content: expect.stringContaining("What's your name"),
      metadata: {
        onboardingStep: 'name',
        questionType: 'initial'
      }
    },
    interestsQuestion: {
      postType: 'onboarding',
      isComment: false,
      hasParentPost: false,
      content: expect.stringContaining('interests'),
      metadata: {
        onboardingStep: 'interests',
        questionType: 'follow-up'
      }
    },
    goalsQuestion: {
      postType: 'onboarding',
      isComment: false,
      hasParentPost: false,
      content: expect.stringContaining('goals'),
      metadata: {
        onboardingStep: 'goals',
        questionType: 'follow-up'
      }
    }
  },

  // Timeout configuration expectations
  timeoutConfigs: {
    default: {
      maxTimeout: 240000, // 240 seconds in milliseconds
      gracePeriodPercentage: 0.8,
      gracePeriodTimeout: 192000, // 80% of 240s = 192s
      planningModeActivatesAt: 192000
    },
    extended: {
      maxTimeout: 300000, // 5 minutes
      gracePeriodPercentage: 0.8,
      gracePeriodTimeout: 240000
    }
  },

  // UI element selectors for Playwright
  uiSelectors: {
    displayName: {
      header: '[data-testid="user-display-name-header"]',
      postAuthor: '[data-testid="post-author-name"]',
      commentAuthor: '[data-testid="comment-author-name"]',
      profileDropdown: '[data-testid="profile-dropdown-name"]',
      welcomeMessage: '[data-testid="welcome-message-name"]'
    },
    onboarding: {
      nameInput: '[data-testid="onboarding-name-input"]',
      interestsInput: '[data-testid="onboarding-interests-input"]',
      goalsInput: '[data-testid="onboarding-goals-input"]',
      submitButton: '[data-testid="onboarding-submit"]',
      postContainer: '[data-testid="onboarding-post"]',
      questionPost: '[data-testid="onboarding-question-post"]'
    },
    posts: {
      container: '[data-testid="post-container"]',
      authorName: '[data-testid="post-author"]',
      timestamp: '[data-testid="post-timestamp"]',
      content: '[data-testid="post-content"]'
    }
  },

  // Expected UI states
  expectedUIStates: {
    afterOnboardingWithName: {
      headerName: 'Orko',
      noIntegrationTestUser: true,
      postsCount: 3, // Three separate posts for onboarding questions
      commentsCount: 0 // No comments, all should be posts
    },
    duringOnboarding: {
      progressVisible: true,
      currentStep: expect.any(Number),
      totalSteps: 3
    }
  },

  // Mock API responses
  mockAPIResponses: {
    saveNameSuccess: {
      status: 200,
      body: {
        success: true,
        user_settings: {
          display_name: 'Orko',
          updated_at: new Date().toISOString()
        }
      }
    },
    saveNameError: {
      status: 500,
      body: {
        success: false,
        error: 'Failed to save display name'
      }
    },
    getOnboardingPosts: {
      status: 200,
      body: {
        posts: [
          {
            id: 1,
            content: "What's your name?",
            post_type: 'onboarding',
            parent_post_id: null,
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            content: "What are your interests?",
            post_type: 'onboarding',
            parent_post_id: null,
            created_at: new Date().toISOString()
          },
          {
            id: 3,
            content: "What are your goals?",
            post_type: 'onboarding',
            parent_post_id: null,
            created_at: new Date().toISOString()
          }
        ]
      }
    }
  },

  // Test scenarios for timeout testing
  timeoutScenarios: {
    quickResponse: {
      duration: 50000, // 50s - well within timeout
      shouldTriggerGracePeriod: false,
      shouldTriggerPlanningMode: false,
      shouldTimeout: false
    },
    approachingGracePeriod: {
      duration: 180000, // 180s - approaching grace period
      shouldTriggerGracePeriod: false,
      shouldTriggerPlanningMode: false,
      shouldTimeout: false
    },
    inGracePeriod: {
      duration: 200000, // 200s - in grace period
      shouldTriggerGracePeriod: true,
      shouldTriggerPlanningMode: true,
      shouldTimeout: false
    },
    exceedsTimeout: {
      duration: 250000, // 250s - exceeds timeout
      shouldTriggerGracePeriod: true,
      shouldTriggerPlanningMode: true,
      shouldTimeout: true
    }
  }
};
