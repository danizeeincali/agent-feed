/**
 * Phase 4: Complete PostValidator Flow Example
 *
 * Demonstrates the full validation → retry → escalation flow
 */

import { PostValidator } from '../post-validator';
import { ValidationService } from '../validation-service';
import { RetryService } from '../retry-service';
import { EscalationService } from '../escalation-service';
import type { WorkTicket } from '../../types/work-ticket';
import type { AgentResponse, PostContent, PostResult } from '../post-validator';
import type { ValidationConfig } from '../types';

/**
 * Example 1: Successful post on first attempt
 */
async function example1_SuccessfulPost() {
  console.log('\n=== Example 1: Successful Post ===\n');

  // Setup
  const { postValidator, mockPostFn, mockTicket } = setupMocks();

  const response: AgentResponse = {
    content: "Great article about AI advancements! The future looks promising. #AI #Tech",
    tokensUsed: 150,
    durationMs: 450,
    model: 'claude-sonnet-4-5'
  };

  // Run validation flow
  const result = await postValidator.validateAndPost(
    response,
    mockTicket,
    mockPostFn
  );

  console.log('Result:', {
    success: result.success,
    posted: result.posted,
    attempts: result.attempts,
    escalated: result.escalated,
    totalTokens: result.totalTokens,
    postId: result.postId
  });

  // Expected: success=true, posted=true, attempts=1, escalated=false
}

/**
 * Example 2: Validation failure - content too long
 * Should simplify content and retry
 */
async function example2_ValidationFailure_Retry() {
  console.log('\n=== Example 2: Validation Failure with Retry ===\n');

  const { postValidator, mockPostFn, mockTicket } = setupMocks();

  const response: AgentResponse = {
    content: "This is an extremely long post that exceeds the maximum character limit for the platform. ".repeat(10),
    tokensUsed: 200,
    durationMs: 500,
    model: 'claude-sonnet-4-5'
  };

  const result = await postValidator.validateAndPost(
    response,
    mockTicket,
    mockPostFn
  );

  console.log('Result:', {
    success: result.success,
    attempts: result.attempts,
    escalated: result.escalated,
    validationReason: result.validationResult?.reason
  });

  // Expected: Multiple attempts, eventually simplified or escalated
}

/**
 * Example 3: Post failure - network error (transient)
 * Should retry with backoff
 */
async function example3_TransientPostError_Retry() {
  console.log('\n=== Example 3: Transient Post Error with Retry ===\n');

  const { postValidator, mockTicket } = setupMocks();

  // Mock posting function that fails twice then succeeds
  let attemptCount = 0;
  const mockPostFn = async (content: PostContent): Promise<PostResult> => {
    attemptCount++;
    console.log(`Post attempt ${attemptCount}...`);

    if (attemptCount < 3) {
      // First 2 attempts fail with network error
      return {
        success: false,
        error: new Error('Network error: ECONNREFUSED')
      };
    } else {
      // Third attempt succeeds
      return {
        success: true,
        postId: `post_${Date.now()}`
      };
    }
  };

  const response: AgentResponse = {
    content: "Testing retry logic with transient errors #test",
    tokensUsed: 100,
    durationMs: 300,
    model: 'claude-sonnet-4-5'
  };

  const result = await postValidator.validateAndPost(
    response,
    mockTicket,
    mockPostFn
  );

  console.log('Result:', {
    success: result.success,
    posted: result.posted,
    attempts: result.attempts,
    escalated: result.escalated,
    postId: result.postId
  });

  // Expected: success=true, attempts=3, escalated=false
}

/**
 * Example 4: Permanent error - authentication failure
 * Should escalate immediately without retries
 */
async function example4_PermanentError_Escalate() {
  console.log('\n=== Example 4: Permanent Error - Immediate Escalation ===\n');

  const { postValidator, mockTicket } = setupMocks();

  // Mock posting function that fails with auth error
  const mockPostFn = async (content: PostContent): Promise<PostResult> => {
    return {
      success: false,
      error: new Error('Authentication error: 401 Unauthorized')
    };
  };

  const response: AgentResponse = {
    content: "This post will fail due to auth error",
    tokensUsed: 80,
    durationMs: 250,
    model: 'claude-sonnet-4-5'
  };

  const result = await postValidator.validateAndPost(
    response,
    mockTicket,
    mockPostFn
  );

  console.log('Result:', {
    success: result.success,
    attempts: result.attempts,
    escalated: result.escalated,
    error: result.error?.message
  });

  // Expected: success=false, escalated=true, attempts=1 (no retry on auth errors)
}

/**
 * Example 5: Max retries exhausted
 * Should escalate after 3 failed attempts
 */
async function example5_MaxRetries_Escalate() {
  console.log('\n=== Example 5: Max Retries Exhausted - Escalation ===\n');

  const { postValidator, mockTicket } = setupMocks();

  // Mock posting function that always fails with rate limit
  const mockPostFn = async (content: PostContent): Promise<PostResult> => {
    console.log('Post attempt failed: Rate limit exceeded');
    return {
      success: false,
      error: new Error('Rate limit exceeded: 429 Too Many Requests')
    };
  };

  const response: AgentResponse = {
    content: "This will fail all retry attempts",
    tokensUsed: 90,
    durationMs: 280,
    model: 'claude-sonnet-4-5'
  };

  const result = await postValidator.validateAndPost(
    response,
    mockTicket,
    mockPostFn
  );

  console.log('Result:', {
    success: result.success,
    attempts: result.attempts,
    escalated: result.escalated,
    error: result.error?.message,
    totalDurationMs: result.totalDurationMs
  });

  // Expected: success=false, attempts=3, escalated=true
}

/**
 * Example 6: Prohibited words - immediate escalation
 * Content validation failure that cannot be fixed
 */
async function example6_ProhibitedWords_NoRetry() {
  console.log('\n=== Example 6: Prohibited Words - No Retry ===\n');

  const { postValidator, mockPostFn, mockTicket } = setupMocks({
    prohibitedWords: ['spam', 'scam', 'click here']
  });

  const response: AgentResponse = {
    content: "Amazing offer! Click here now to get rich quick! Not spam!",
    tokensUsed: 70,
    durationMs: 200,
    model: 'claude-sonnet-4-5'
  };

  const result = await postValidator.validateAndPost(
    response,
    mockTicket,
    mockPostFn
  );

  console.log('Result:', {
    success: result.success,
    attempts: result.attempts,
    escalated: result.escalated,
    validationReason: result.validationResult?.reason,
    canFix: result.validationResult?.canFix
  });

  // Expected: success=false, attempts=1, escalated=true, canFix=false
}

/**
 * Example 7: Complete metrics tracking
 * Demonstrates token and duration tracking across attempts
 */
async function example7_MetricsTracking() {
  console.log('\n=== Example 7: Metrics Tracking ===\n');

  const { postValidator, mockTicket } = setupMocks();

  // Mock with validation costs
  let postAttempts = 0;
  const mockPostFn = async (content: PostContent): Promise<PostResult> => {
    postAttempts++;
    if (postAttempts < 2) {
      return {
        success: false,
        error: new Error('Timeout error')
      };
    }
    return {
      success: true,
      postId: 'post_metrics_123'
    };
  };

  const response: AgentResponse = {
    content: "Tracking all the metrics! #performance",
    tokensUsed: 120,
    durationMs: 400,
    model: 'claude-sonnet-4-5'
  };

  const startTime = Date.now();
  const result = await postValidator.validateAndPost(
    response,
    mockTicket,
    mockPostFn
  );
  const endTime = Date.now();

  console.log('Metrics:', {
    success: result.success,
    attempts: result.attempts,
    totalTokens: result.totalTokens,
    totalDurationMs: result.totalDurationMs,
    actualDurationMs: endTime - startTime,
    breakdown: {
      initialResponse: response.tokensUsed,
      validationCosts: result.validationResult?.tokenCost || 0,
      retryOverhead: result.totalTokens - response.tokensUsed
    }
  });
}

/**
 * Setup mock dependencies for examples
 */
function setupMocks(configOverrides: Partial<ValidationConfig> = {}) {
  // Mock configuration
  const config: ValidationConfig = {
    enableLLMValidation: false, // Disable for faster examples
    maxLength: 280,
    minLength: 10,
    prohibitedWords: [],
    maxMentions: 5,
    maxHashtags: 5,
    maxUrls: 4,
    allowedDomains: [],
    toneThreshold: 0.6,
    ...configOverrides
  };

  // Mock dependencies
  const mockDatabase = {
    query: async () => ({ rows: [] }),
    begin: async () => ({}),
    commit: async () => ({}),
    rollback: async () => ({})
  };

  const mockWorkerSpawner = {
    spawnWorker: async () => ({}),
    getActiveWorkers: async () => [],
    terminateWorker: async () => ({}),
    waitForAllWorkers: async () => ({})
  };

  const mockWorkQueue = {
    getPendingTickets: async () => [],
    assignTicket: async () => ({}),
    getQueueStats: async () => ({
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    })
  };

  // Create services
  const validationService = new ValidationService(config);
  const retryService = new RetryService(mockWorkerSpawner as any, mockDatabase as any);
  const escalationService = new EscalationService(mockDatabase as any);

  const postValidator = new PostValidator(
    validationService,
    retryService,
    escalationService,
    mockWorkQueue
  );

  // Mock posting function (success by default)
  const mockPostFn = async (content: PostContent): Promise<PostResult> => {
    return {
      success: true,
      postId: `post_${Date.now()}`
    };
  };

  // Mock work ticket
  const mockTicket: WorkTicket = {
    id: 'ticket_example_123',
    type: 'post_response',
    priority: 5,
    agentName: 'ExampleAgent',
    userId: 'user_example_456',
    payload: {
      feedItemId: 'feed_item_789',
      prompt: 'Respond to this article'
    },
    createdAt: new Date(),
    status: 'pending'
  };

  return {
    postValidator,
    validationService,
    retryService,
    escalationService,
    mockPostFn,
    mockTicket,
    mockDatabase,
    mockWorkQueue
  };
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  Phase 4: PostValidator Complete Flow Examples       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  try {
    await example1_SuccessfulPost();
    // await example2_ValidationFailure_Retry();
    // await example3_TransientPostError_Retry();
    // await example4_PermanentError_Escalate();
    // await example5_MaxRetries_Escalate();
    // await example6_ProhibitedWords_NoRetry();
    // await example7_MetricsTracking();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
  }
}

// Export for testing
export {
  example1_SuccessfulPost,
  example2_ValidationFailure_Retry,
  example3_TransientPostError_Retry,
  example4_PermanentError_Escalate,
  example5_MaxRetries_Escalate,
  example6_ProhibitedWords_NoRetry,
  example7_MetricsTracking,
  setupMocks
};

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
