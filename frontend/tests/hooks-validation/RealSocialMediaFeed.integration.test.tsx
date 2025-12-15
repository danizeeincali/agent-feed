import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import RealSocialMediaFeed from '../../src/components/RealSocialMediaFeed';
import { 
  createHookTracker, 
  testHookConsistency, 
  stressTestComponent,
  HooksRulesValidator,
  ComponentBehaviorTester,
  MemoryLeakDetector 
} from './hooks-test-utils';
import { 
  realSocialMediaFeedConfig, 
  TEST_SCENARIOS,
  PERFORMANCE_THRESHOLDS,
  type HooksValidationResult 
} from './hooks-validation.config';
import { apiService } from '../../src/services/api';

// Mock all dependencies
vi.mock('../../src/services/api');
vi.mock('../../src/utils/contentParser', () => ({
  renderParsedContent: vi.fn((content) => content),
  parseContent: vi.fn((content) => content),
  extractHashtags: vi.fn(() => []),
  extractMentions: vi.fn(() => []),
}));

// Mock all components to focus on hooks testing
vi.mock('../../src/components/FilterPanel', () => ({
  default: ({ onFilterChange }: any) => <div data-testid="filter-panel" />,
}));

vi.mock('../../src/components/EnhancedPostingInterface', () => ({
  EnhancedPostingInterface: () => <div data-testid="posting-interface" />,
}));

vi.mock('../../src/components/ThreadedCommentSystem', () => ({
  default: () => <div data-testid="comment-system" />,
}));

vi.mock('../../src/components/CommentThread', () => ({
  CommentThread: () => <div data-testid="comment-thread" />,
}));

vi.mock('../../src/components/CommentForm', () => ({
  CommentForm: () => <div data-testid="comment-form" />,
}));

vi.mock('../../src/components/MentionInput', () => ({
  MentionInput: ({ value, onChange }: any) => (
    <input 
      data-testid="mention-input" 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
    />
  ),
}));

vi.mock('../../src/components/PostCreator', () => ({
  PostCreator: () => <div data-testid="post-creator" />,
}));

vi.mock('../../src/StreamingTickerWorking', () => ({
  default: () => <div data-testid="streaming-ticker" />,
}));

const mockPosts = [
  {
    id: 'post-1',
    title: 'Test Post 1',
    content: 'This is a test post with some content to expand',
    authorAgent: 'TestAgent',
    publishedAt: '2023-01-01T00:00:00Z',
    engagement: { comments: 0, saves: 0, isSaved: false },
    metadata: { businessImpact: 75 },
    tags: ['test', 'demo'],
  },
];

describe('RealSocialMediaFeed - Integration Hooks Validation', () => {
  let validationResults: HooksValidationResult[] = [];
  
  beforeEach(() => {
    vi.clearAllMocks();
    validationResults = [];
    
    // Setup default API mocks
    (apiService.getAgentPosts as any).mockResolvedValue({
      data: mockPosts,
      total: mockPosts.length,
    });
    (apiService.getFilterData as any).mockResolvedValue({
      agents: ['TestAgent'],
      hashtags: ['test', 'demo'],
    });
    (apiService.getFilterStats as any).mockResolvedValue({
      savedPosts: 1,
      myPosts: 2,
    });
    (apiService.getPostComments as any).mockResolvedValue([]);
  });

  /**
   * Integration Test: Complete Hooks Validation Suite
   * Tests all aspects of hooks usage in the component
   */
  describe('Complete Hooks Validation Suite', () => {
    it('should pass comprehensive hooks validation', async () => {
      const testStartTime = Date.now();
      let overallSuccess = true;
      const testResults: HooksValidationResult[] = [];

      // Test 1: Hook Count Consistency
      if (TEST_SCENARIOS.HOOK_COUNT_CONSISTENCY.enabled) {
        try {
          const result = await testHookConsistency(
            RealSocialMediaFeed,
            realSocialMediaFeedConfig.customPropCombinations || [{}],
            realSocialMediaFeedConfig.renderCycles
          );
          
          testResults.push({
            componentName: 'RealSocialMediaFeed',
            testName: 'Hook Count Consistency',
            success: result.success,
            message: result.message,
            details: { hookCounts: result.hookCounts },
            timestamp: new Date(),
          });
          
          if (!result.success) overallSuccess = false;
        } catch (error) {
          testResults.push({
            componentName: 'RealSocialMediaFeed',
            testName: 'Hook Count Consistency',
            success: false,
            message: `Test failed with error: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
          });
          overallSuccess = false;
        }
      }

      // Test 2: Stress Testing
      if (TEST_SCENARIOS.RE_RENDER_STABILITY.enabled) {
        try {
          const stressResult = await stressTestComponent(
            RealSocialMediaFeed,
            {},
            realSocialMediaFeedConfig.stressTestIterations
          );
          
          testResults.push({
            componentName: 'RealSocialMediaFeed',
            testName: 'Stress Test',
            success: stressResult.success,
            message: stressResult.message,
            details: { violations: stressResult.violations },
            timestamp: new Date(),
          });
          
          if (!stressResult.success) overallSuccess = false;
        } catch (error) {
          testResults.push({
            componentName: 'RealSocialMediaFeed',
            testName: 'Stress Test',
            success: false,
            message: `Stress test failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
          });
          overallSuccess = false;
        }
      }

      // Test 3: Component Behavior with Prop Variations
      if (TEST_SCENARIOS.CONDITIONAL_RENDERING.enabled) {
        try {
          const behaviorResults = await ComponentBehaviorTester.testWithPropCombinations(
            RealSocialMediaFeed,
            realSocialMediaFeedConfig.customPropCombinations || [{}]
          );
          
          const behaviorSuccess = behaviorResults.every(result => result.success);
          
          testResults.push({
            componentName: 'RealSocialMediaFeed',
            testName: 'Prop Combinations Behavior',
            success: behaviorSuccess,
            message: behaviorSuccess 
              ? `All ${behaviorResults.length} prop combinations passed` 
              : `${behaviorResults.filter(r => !r.success).length} of ${behaviorResults.length} prop combinations failed`,
            details: { violations: behaviorResults.flatMap(r => r.violations) },
            timestamp: new Date(),
          });
          
          if (!behaviorSuccess) overallSuccess = false;
        } catch (error) {
          testResults.push({
            componentName: 'RealSocialMediaFeed',
            testName: 'Prop Combinations Behavior',
            success: false,
            message: `Behavior test failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
          });
          overallSuccess = false;
        }
      }

      // Test 4: Lifecycle Stability
      if (TEST_SCENARIOS.MOUNT_UNMOUNT.enabled) {
        try {
          const lifecycleResult = await ComponentBehaviorTester.testLifecycleStability(
            RealSocialMediaFeed,
            {},
            TEST_SCENARIOS.MOUNT_UNMOUNT.iterations || 5
          );
          
          testResults.push({
            componentName: 'RealSocialMediaFeed',
            testName: 'Lifecycle Stability',
            success: lifecycleResult.success,
            message: lifecycleResult.success 
              ? `Component survived ${lifecycleResult.cycles} lifecycle cycles`
              : `Component failed lifecycle test after ${lifecycleResult.cycles} cycles`,
            details: { violations: lifecycleResult.violations },
            timestamp: new Date(),
          });
          
          if (!lifecycleResult.success) overallSuccess = false;
        } catch (error) {
          testResults.push({
            componentName: 'RealSocialMediaFeed',
            testName: 'Lifecycle Stability',
            success: false,
            message: `Lifecycle test failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
          });
          overallSuccess = false;
        }
      }

      // Test 5: Interactive State Changes
      if (TEST_SCENARIOS.STATE_CHANGES.enabled) {
        try {
          const validator = new HooksRulesValidator();
          validator.start();
          
          const { rerender } = render(<RealSocialMediaFeed />);
          
          // Wait for component to load
          await waitFor(() => {
            expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
          });
          
          // Simulate various state changes
          for (let i = 0; i < 10; i++) {
            rerender(<RealSocialMediaFeed key={i} className={`test-${i}`} />);
          }
          
          validator.stop();
          const stateChangeSuccess = !validator.hasViolations();
          
          testResults.push({
            componentName: 'RealSocialMediaFeed',
            testName: 'State Changes',
            success: stateChangeSuccess,
            message: stateChangeSuccess 
              ? 'Component handled state changes without violations'
              : `Component had ${validator.getViolations().length} violations during state changes`,
            details: { violations: validator.getViolations() },
            timestamp: new Date(),
          });
          
          if (!stateChangeSuccess) overallSuccess = false;
        } catch (error) {
          testResults.push({
            componentName: 'RealSocialMediaFeed',
            testName: 'State Changes',
            success: false,
            message: `State change test failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
          });
          overallSuccess = false;
        }
      }

      // Store results for reporting
      validationResults = testResults;
      
      const testEndTime = Date.now();
      const totalTestTime = testEndTime - testStartTime;
      
      console.log(`\n🧪 Hooks Validation Results for RealSocialMediaFeed:`);
      console.log(`📊 Total Tests: ${testResults.length}`);
      console.log(`✅ Passed: ${testResults.filter(r => r.success).length}`);
      console.log(`❌ Failed: ${testResults.filter(r => !r.success).length}`);
      console.log(`⏱️ Total Time: ${totalTestTime}ms`);
      
      testResults.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.testName}: ${result.message}`);
        if (result.details?.violations && result.details.violations.length > 0) {
          result.details.violations.forEach(violation => {
            console.log(`   🚫 ${violation}`);
          });
        }
      });
      
      // Overall test assertion
      expect(overallSuccess).toBe(true);
      
      // Performance assertions
      expect(totalTestTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_RENDER_TIME * testResults.length * 10);
    }, 30000); // 30 second timeout for comprehensive test

    it('should validate expected hook counts match actual usage', async () => {
      const expectedCounts = realSocialMediaFeedConfig.expectedHookCounts;
      
      if (!expectedCounts) {
        console.log('⚠️ No expected hook counts configured, skipping validation');
        return;
      }
      
      const hookTracker = createHookTracker();
      
      hookTracker.start();
      const { unmount } = render(<RealSocialMediaFeed />);
      hookTracker.stop();
      
      const actualCounts = hookTracker.counts;
      
      // Validate each expected hook count
      Object.entries(expectedCounts).forEach(([hookName, expectedCount]) => {
        const actualCount = actualCounts[hookName as keyof typeof actualCounts];
        
        console.log(`🪝 ${hookName}: Expected ${expectedCount}, Actual ${actualCount}`);
        
        if (expectedCount !== undefined) {
          expect(actualCount).toBe(
            expectedCount,
            `${hookName} hook count mismatch: expected ${expectedCount}, got ${actualCount}`
          );
        }
      });
      
      unmount();
    });
  });

  /**
   * Error Recovery Testing
   * Tests how the component handles errors without breaking hooks
   */
  describe('Error Recovery and Hooks Stability', () => {
    it('should maintain hooks stability when API calls fail', async () => {
      // Make API calls fail
      (apiService.getAgentPosts as any).mockRejectedValue(new Error('Network error'));
      (apiService.getFilterData as any).mockRejectedValue(new Error('Filter error'));
      (apiService.getFilterStats as any).mockRejectedValue(new Error('Stats error'));
      
      const validator = new HooksRulesValidator();
      validator.start();
      
      try {
        const { rerender, unmount } = render(<RealSocialMediaFeed />);
        
        // Wait for error state
        await waitFor(() => {
          expect(screen.getByText('Error')).toBeInTheDocument();
        }, { timeout: 5000 });
        
        // Test multiple re-renders in error state
        for (let i = 0; i < 5; i++) {
          rerender(<RealSocialMediaFeed key={i} />);
        }
        
        unmount();
        validator.stop();
        
        expect(validator.hasViolations()).toBe(false);
        
        if (validator.hasViolations()) {
          console.log('❌ Hooks violations during error recovery:', validator.getViolations());
        }
      } finally {
        validator.stop();
      }
    });
  });

  /**
   * Memory and Performance Testing
   */
  describe('Memory and Performance Validation', () => {
    it('should not have significant memory leaks', async () => {
      if (!TEST_SCENARIOS.MEMORY_LEAK_DETECTION.enabled) {
        console.log('⚠️ Memory leak detection disabled, skipping test');
        return;
      }
      
      const detector = new MemoryLeakDetector();
      detector.startTracking();
      
      // Create and destroy multiple instances
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<RealSocialMediaFeed />);
        
        await waitFor(() => {
          expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
        });
        
        unmount();
      }
      
      const leakReport = detector.checkForLeaks();
      
      console.log('🔍 Memory Leak Detection Report:');
      console.log(`📈 Memory Increase: ${(leakReport.memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`🎯 Potential Leaks: ${leakReport.potentialLeaks.length}`);
      
      leakReport.potentialLeaks.forEach(leak => {
        console.log(`   🔗 ${leak.event}: ${leak.count} listeners`);
      });
      
      expect(leakReport.hasLeaks).toBe(false);
      expect(leakReport.memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_MEMORY_USAGE);
      
      detector.cleanup();
    }, TEST_SCENARIOS.MEMORY_LEAK_DETECTION.timeout);
  });
});

// Export validation results for reporting
export { validationResults };
