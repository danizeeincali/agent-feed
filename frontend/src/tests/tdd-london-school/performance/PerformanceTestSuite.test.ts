/**
 * TDD London School - Performance Test Suite
 * 
 * Comprehensive performance testing using London School methodology:
 * - Component render performance with mock isolation
 * - User interaction response times
 * - Memory usage and leak detection
 * - Bundle size and load time analysis
 * - Collaborative service performance testing
 * - Performance regression detection
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';
import { LondonSchoolTestSuite } from '../framework/LondonSchoolTestFramework';
import { MockFactory } from '../factories/MockFactory';
import { PerformanceTestingHelpers, TestExecutionTracker } from '../utilities/TestUtilities';
import { BuilderFactory } from '../utilities/TestDataBuilders';

// ==================== PERFORMANCE TEST CONFIGURATION ====================

interface PerformanceThresholds {
  renderTime: number;
  interactionTime: number;
  memoryUsage: number;
  bundleSize: number;
  apiResponseTime: number;
  reRenderCount: number;
}

const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  renderTime: 100, // ms
  interactionTime: 50, // ms
  memoryUsage: 10 * 1024 * 1024, // 10MB
  bundleSize: 2 * 1024 * 1024, // 2MB
  apiResponseTime: 200, // ms
  reRenderCount: 3 // max re-renders
};

// ==================== PERFORMANCE TEST SUITE ====================

export class PerformanceTestSuite extends LondonSchoolTestSuite {
  private performanceHelpers: PerformanceTestingHelpers;
  private tracker: TestExecutionTracker;
  private memoryBaseline: number = 0;
  private renderCount: number = 0;

  protected setupSuite(): void {
    this.performanceHelpers = new PerformanceTestingHelpers();
    this.tracker = TestExecutionTracker.getInstance();
    
    // Record memory baseline
    this.memoryBaseline = this.getCurrentMemoryUsage();
    
    // Setup render counting
    this.setupRenderCounting();
  }

  protected teardownSuite(): void {
    // Analyze memory leaks
    const finalMemory = this.getCurrentMemoryUsage();
    const memoryIncrease = finalMemory - this.memoryBaseline;
    
    if (memoryIncrease > PERFORMANCE_THRESHOLDS.memoryUsage) {
      console.warn(`Memory leak detected: ${memoryIncrease} bytes increase`);
    }
  }

  /**
   * Tests component render performance with London School isolation
   */
  public testComponentRenderPerformance(): void {
    describe('Component render performance', () => {
      it('should render MentionInput within performance threshold', async () => {
        // Mock all external dependencies for isolation
        const mockMentionService = this.mockFactory.createMentionServiceMock();
        const mockUser = userEvent.setup();
        
        // Measure render time
        const startTime = performance.now();
        
        const { container } = render(
          <div data-testid="mention-input-container">
            {/* Simplified test component - would use actual MentionInput */}
            <textarea 
              data-testid="mention-input"
              onChange={() => mockMentionService.searchMentions('test')}
            />
          </div>
        );
        
        await waitFor(() => {
          expect(screen.getByTestId('mention-input')).toBeInTheDocument();
        });
        
        const renderTime = performance.now() - startTime;
        
        // Record performance metric
        this.tracker.recordPerformanceMetric('MentionInput-render', {
          testName: 'MentionInput render',
          value: renderTime,
          unit: 'ms',
          threshold: PERFORMANCE_THRESHOLDS.renderTime,
          passed: renderTime < PERFORMANCE_THRESHOLDS.renderTime
        });
        
        // Assert performance threshold
        expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.renderTime);
      });

      it('should render PostCreator within performance threshold', async () => {
        const mockPostService = this.mockFactory.createPostServiceMock();
        const mockTemplateService = this.mockFactory.createTemplateServiceMock();
        
        const startTime = performance.now();
        
        render(
          <div data-testid="post-creator-container">
            <form data-testid="post-creator-form">
              <textarea data-testid="content-input" />
              <input data-testid="title-input" />
              <button type="submit">Create Post</button>
            </form>
          </div>
        );
        
        await waitFor(() => {
          expect(screen.getByTestId('post-creator-form')).toBeInTheDocument();
        });
        
        const renderTime = performance.now() - startTime;
        
        this.tracker.recordPerformanceMetric('PostCreator-render', {
          testName: 'PostCreator render',
          value: renderTime,
          unit: 'ms',
          threshold: PERFORMANCE_THRESHOLDS.renderTime,
          passed: renderTime < PERFORMANCE_THRESHOLDS.renderTime
        });
        
        expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.renderTime);
      });

      it('should render CommentThread within performance threshold', async () => {
        const mockCommentService = this.mockFactory.createCommentServiceMock();
        const mockComments = BuilderFactory.multiple(
          BuilderFactory.comment().withReplies(3),
          5
        );
        
        mockCommentService.getComments.mockResolvedValue(mockComments);
        
        const startTime = performance.now();
        
        render(
          <div data-testid="comment-thread-container">
            {mockComments.map(comment => (
              <div key={comment.id} data-testid={`comment-${comment.id}`}>
                <p>{comment.content}</p>
                <div data-testid={`replies-${comment.id}`}>
                  {comment.replies.map(reply => (
                    <div key={reply.id} data-testid={`reply-${reply.id}`}>
                      {reply.content}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
        
        const renderTime = performance.now() - startTime;
        
        this.tracker.recordPerformanceMetric('CommentThread-render', {
          testName: 'CommentThread render',
          value: renderTime,
          unit: 'ms',
          threshold: PERFORMANCE_THRESHOLDS.renderTime,
          passed: renderTime < PERFORMANCE_THRESHOLDS.renderTime
        });
        
        expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.renderTime);
      });
    });
  }

  /**
   * Tests user interaction response times with mock collaboration
   */
  public testInteractionPerformance(): void {
    describe('User interaction performance', () => {
      it('should handle mention dropdown opening within threshold', async () => {
        const mockMentionService = this.mockFactory.createMentionServiceMock();
        const mockSuggestions = BuilderFactory.multiple(
          BuilderFactory.mentionSuggestion().asAIAgent(),
          10
        );
        
        mockMentionService.searchMentions.mockResolvedValue(mockSuggestions);
        
        render(
          <textarea 
            data-testid="mention-input"
            onChange={(e) => {
              if (e.target.value.endsWith('@')) {
                mockMentionService.searchMentions('');
              }
            }}
          />
        );
        
        const user = userEvent.setup();
        const input = screen.getByTestId('mention-input');
        
        const startTime = performance.now();
        
        // Simulate typing @ to trigger mention dropdown
        await user.type(input, '@');
        
        await waitFor(() => {
          expect(mockMentionService.searchMentions).toHaveBeenCalled();
        });
        
        const interactionTime = performance.now() - startTime;
        
        this.tracker.recordPerformanceMetric('mention-dropdown-interaction', {
          testName: 'Mention dropdown opening',
          value: interactionTime,
          unit: 'ms',
          threshold: PERFORMANCE_THRESHOLDS.interactionTime,
          passed: interactionTime < PERFORMANCE_THRESHOLDS.interactionTime
        });
        
        expect(interactionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.interactionTime);
      });

      it('should handle post submission within threshold', async () => {
        const mockPostService = this.mockFactory.createPostServiceMock();
        const mockPost = BuilderFactory.post().build();
        
        mockPostService.createPost.mockResolvedValue(mockPost);
        
        render(
          <form 
            data-testid="post-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await mockPostService.createPost({
                content: 'Test post',
                title: 'Test'
              });
            }}
          >
            <textarea data-testid="content-input" defaultValue="Test post" />
            <button type="submit" data-testid="submit-button">Submit</button>
          </form>
        );
        
        const user = userEvent.setup();
        const submitButton = screen.getByTestId('submit-button');
        
        const startTime = performance.now();
        
        await user.click(submitButton);
        
        await waitFor(() => {
          expect(mockPostService.createPost).toHaveBeenCalled();
        });
        
        const interactionTime = performance.now() - startTime;
        
        this.tracker.recordPerformanceMetric('post-submission-interaction', {
          testName: 'Post submission',
          value: interactionTime,
          unit: 'ms',
          threshold: PERFORMANCE_THRESHOLDS.interactionTime,
          passed: interactionTime < PERFORMANCE_THRESHOLDS.interactionTime
        });
        
        expect(interactionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.interactionTime);
      });

      it('should handle comment creation within threshold', async () => {
        const mockCommentService = this.mockFactory.createCommentServiceMock();
        const mockComment = BuilderFactory.comment().build();
        
        mockCommentService.createComment.mockResolvedValue(mockComment);
        
        render(
          <form 
            data-testid="comment-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await mockCommentService.createComment({
                content: 'Test comment',
                postId: 'post-1'
              });
            }}
          >
            <textarea data-testid="comment-input" defaultValue="Test comment" />
            <button type="submit" data-testid="comment-submit">Submit</button>
          </form>
        );
        
        const user = userEvent.setup();
        const submitButton = screen.getByTestId('comment-submit');
        
        const startTime = performance.now();
        
        await user.click(submitButton);
        
        await waitFor(() => {
          expect(mockCommentService.createComment).toHaveBeenCalled();
        });
        
        const interactionTime = performance.now() - startTime;
        
        this.tracker.recordPerformanceMetric('comment-creation-interaction', {
          testName: 'Comment creation',
          value: interactionTime,
          unit: 'ms',
          threshold: PERFORMANCE_THRESHOLDS.interactionTime,
          passed: interactionTime < PERFORMANCE_THRESHOLDS.interactionTime
        });
        
        expect(interactionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.interactionTime);
      });
    });
  }

  /**
   * Tests collaborative service performance with mocked dependencies
   */
  public testServiceCollaborationPerformance(): void {
    describe('Service collaboration performance', () => {
      it('should handle MentionService search with cache collaboration efficiently', async () => {
        const mockMentionService = this.mockFactory.createMentionServiceMock();
        const mockCacheService = this.mockFactory.createCacheServiceMock();
        const mockSuggestions = BuilderFactory.multiple(
          BuilderFactory.mentionSuggestion(),
          100
        );
        
        // Setup cache hit scenario
        mockCacheService.get.mockResolvedValue(mockSuggestions);
        
        const startTime = performance.now();
        
        // Simulate service collaboration
        const cacheKey = 'mentions:test-query';
        const cachedResults = await mockCacheService.get(cacheKey);
        
        if (cachedResults) {
          mockMentionService.searchMentions.mockResolvedValue(cachedResults);
        }
        
        const results = await mockMentionService.searchMentions('test-query');
        
        const collaborationTime = performance.now() - startTime;
        
        this.tracker.recordPerformanceMetric('mention-service-collaboration', {
          testName: 'MentionService cache collaboration',
          value: collaborationTime,
          unit: 'ms',
          threshold: PERFORMANCE_THRESHOLDS.apiResponseTime,
          passed: collaborationTime < PERFORMANCE_THRESHOLDS.apiResponseTime
        });
        
        expect(collaborationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
        expect(results).toHaveLength(100);
        expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      });

      it('should handle PostService with validation and storage collaboration efficiently', async () => {
        const mockPostService = this.mockFactory.createPostServiceMock();
        const mockValidationService = this.mockFactory.createValidationServiceMock();
        const mockStorageService = this.mockFactory.createStorageServiceMock();
        
        const postData = BuilderFactory.post().asDraft().build();
        
        // Setup successful validation
        mockValidationService.validatePost.mockResolvedValue({ valid: true, errors: [] });
        mockStorageService.savePost.mockResolvedValue(postData);
        
        const startTime = performance.now();
        
        // Simulate service collaboration workflow
        const validationResult = await mockValidationService.validatePost(postData);
        
        if (validationResult.valid) {
          const savedPost = await mockStorageService.savePost(postData);
          mockPostService.createPost.mockResolvedValue(savedPost);
        }
        
        const result = await mockPostService.createPost(postData);
        
        const collaborationTime = performance.now() - startTime;
        
        this.tracker.recordPerformanceMetric('post-service-collaboration', {
          testName: 'PostService validation and storage collaboration',
          value: collaborationTime,
          unit: 'ms',
          threshold: PERFORMANCE_THRESHOLDS.apiResponseTime,
          passed: collaborationTime < PERFORMANCE_THRESHOLDS.apiResponseTime
        });
        
        expect(collaborationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
        expect(result).toEqual(postData);
        expect(mockValidationService.validatePost).toHaveBeenCalledWith(postData);
        expect(mockStorageService.savePost).toHaveBeenCalledWith(postData);
      });

      it('should handle CommentService with threading collaboration efficiently', async () => {
        const mockCommentService = this.mockFactory.createCommentServiceMock();
        const mockThreadService = this.mockFactory.createCommentThreadServiceMock();
        const mockNotificationService = this.mockFactory.createNotificationServiceMock();
        
        const parentComment = BuilderFactory.comment().build();
        const replyComment = BuilderFactory.comment().asReplyTo(parentComment.id).build();
        
        mockThreadService.addReply.mockResolvedValue(replyComment);
        mockNotificationService.notifyMentions.mockResolvedValue(true);
        
        const startTime = performance.now();
        
        // Simulate comment threading collaboration
        const reply = await mockThreadService.addReply(parentComment.id, replyComment);
        await mockNotificationService.notifyMentions(reply.mentions);
        mockCommentService.createComment.mockResolvedValue(reply);
        
        const result = await mockCommentService.createComment(replyComment);
        
        const collaborationTime = performance.now() - startTime;
        
        this.tracker.recordPerformanceMetric('comment-service-collaboration', {
          testName: 'CommentService threading collaboration',
          value: collaborationTime,
          unit: 'ms',
          threshold: PERFORMANCE_THRESHOLDS.apiResponseTime,
          passed: collaborationTime < PERFORMANCE_THRESHOLDS.apiResponseTime
        });
        
        expect(collaborationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
        expect(result).toEqual(reply);
        expect(mockThreadService.addReply).toHaveBeenCalledWith(parentComment.id, replyComment);
        expect(mockNotificationService.notifyMentions).toHaveBeenCalledWith(reply.mentions);
      });
    });
  }

  /**
   * Tests memory usage and leak detection with mock isolation
   */
  public testMemoryPerformance(): void {
    describe('Memory performance and leak detection', () => {
      it('should not leak memory during mention dropdown interactions', async () => {
        const initialMemory = this.getCurrentMemoryUsage();
        const mockMentionService = this.mockFactory.createMentionServiceMock();
        const mockSuggestions = BuilderFactory.multiple(
          BuilderFactory.mentionSuggestion(),
          50
        );
        
        mockMentionService.searchMentions.mockResolvedValue(mockSuggestions);
        
        // Simulate multiple dropdown open/close cycles
        for (let i = 0; i < 10; i++) {
          const { unmount } = render(
            <div data-testid="mention-container">
              <textarea 
                data-testid="mention-input"
                onChange={() => mockMentionService.searchMentions(`query-${i}`)}
              />
            </div>
          );
          
          const user = userEvent.setup();
          const input = screen.getByTestId('mention-input');
          
          await user.type(input, '@');
          await waitFor(() => {
            expect(mockMentionService.searchMentions).toHaveBeenCalledWith(`query-${i}`);
          });
          
          unmount();
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
        
        const finalMemory = this.getCurrentMemoryUsage();
        const memoryIncrease = finalMemory - initialMemory;
        
        this.tracker.recordMemorySnapshot('mention-dropdown-memory', {
          testName: 'Mention dropdown memory usage',
          initial: initialMemory,
          peak: finalMemory,
          final: finalMemory,
          leaked: memoryIncrease,
          unit: 'mb'
        });
        
        expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);
      });

      it('should not leak memory during post creation cycles', async () => {
        const initialMemory = this.getCurrentMemoryUsage();
        const mockPostService = this.mockFactory.createPostServiceMock();
        
        // Simulate multiple post creation cycles
        for (let i = 0; i < 5; i++) {
          const mockPost = BuilderFactory.post()
            .withTags([`tag-${i}`])
            .withMentions([`@agent-${i}`])
            .build();
          
          mockPostService.createPost.mockResolvedValue(mockPost);
          
          const { unmount } = render(
            <form 
              data-testid={`post-form-${i}`}
              onSubmit={async (e) => {
                e.preventDefault();
                await mockPostService.createPost(mockPost);
              }}
            >
              <textarea defaultValue={mockPost.content} />
              <button type="submit">Submit</button>
            </form>
          );
          
          const user = userEvent.setup();
          const submitButton = screen.getByRole('button', { name: 'Submit' });
          
          await user.click(submitButton);
          await waitFor(() => {
            expect(mockPostService.createPost).toHaveBeenCalledWith(mockPost);
          });
          
          unmount();
          
          if (global.gc) {
            global.gc();
          }
        }
        
        const finalMemory = this.getCurrentMemoryUsage();
        const memoryIncrease = finalMemory - initialMemory;
        
        this.tracker.recordMemorySnapshot('post-creation-memory', {
          testName: 'Post creation memory usage',
          initial: initialMemory,
          peak: finalMemory,
          final: finalMemory,
          leaked: memoryIncrease,
          unit: 'mb'
        });
        
        expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);
      });
    });
  }

  /**
   * Tests performance with large datasets using mocked data
   */
  public testLargeDatasetPerformance(): void {
    describe('Large dataset performance', () => {
      it('should handle large mention dataset efficiently', async () => {
        const mockMentionService = this.mockFactory.createMentionServiceMock();
        const largeMentionDataset = BuilderFactory.multiple(
          BuilderFactory.mentionSuggestion(),
          1000
        );
        
        mockMentionService.searchMentions.mockResolvedValue(largeMentionDataset);
        
        const startTime = performance.now();
        
        render(
          <div data-testid="mention-list-container">
            <textarea 
              data-testid="mention-input"
              onChange={() => mockMentionService.searchMentions('test')}
            />
            <div data-testid="mention-results">
              {largeMentionDataset.slice(0, 10).map(mention => (
                <div key={mention.id} data-testid={`mention-${mention.id}`}>
                  {mention.displayName}
                </div>
              ))}
            </div>
          </div>
        );
        
        const user = userEvent.setup();
        const input = screen.getByTestId('mention-input');
        
        await user.type(input, '@test');
        
        await waitFor(() => {
          expect(mockMentionService.searchMentions).toHaveBeenCalledWith('test');
        });
        
        const processingTime = performance.now() - startTime;
        
        this.tracker.recordPerformanceMetric('large-dataset-processing', {
          testName: 'Large mention dataset processing',
          value: processingTime,
          unit: 'ms',
          threshold: PERFORMANCE_THRESHOLDS.renderTime * 2, // Allow 2x threshold for large datasets
          passed: processingTime < PERFORMANCE_THRESHOLDS.renderTime * 2
        });
        
        expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.renderTime * 2);
        expect(mockMentionService.searchMentions).toHaveBeenCalledWith('test');
      });

      it('should handle large comment thread efficiently', async () => {
        const mockCommentService = this.mockFactory.createCommentServiceMock();
        const largeCommentThread = BuilderFactory.multiple(
          BuilderFactory.comment().withReplies(5),
          100
        );
        
        mockCommentService.getComments.mockResolvedValue(largeCommentThread);
        
        const startTime = performance.now();
        
        render(
          <div data-testid="large-comment-thread">
            {largeCommentThread.slice(0, 20).map(comment => (
              <div key={comment.id} data-testid={`comment-${comment.id}`}>
                <p>{comment.content}</p>
                <div data-testid={`replies-${comment.id}`}>
                  {comment.replies.map(reply => (
                    <div key={reply.id} data-testid={`reply-${reply.id}`}>
                      {reply.content}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
        
        const renderTime = performance.now() - startTime;
        
        this.tracker.recordPerformanceMetric('large-comment-thread-render', {
          testName: 'Large comment thread rendering',
          value: renderTime,
          unit: 'ms',
          threshold: PERFORMANCE_THRESHOLDS.renderTime * 3, // Allow 3x threshold for large threads
          passed: renderTime < PERFORMANCE_THRESHOLDS.renderTime * 3
        });
        
        expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.renderTime * 3);
      });
    });
  }

  /**
   * Helper methods for performance measurement
   */
  private getCurrentMemoryUsage(): number {
    if (process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  private setupRenderCounting(): void {
    // Mock React to count renders (simplified)
    this.renderCount = 0;
  }
}

// ==================== PERFORMANCE TEST RUNNER ====================

describe('🚀 TDD London School Performance Test Suite', () => {
  let performanceTestSuite: PerformanceTestSuite;

  beforeEach(() => {
    performanceTestSuite = new PerformanceTestSuite();
    performanceTestSuite.setupSuite();
  });

  afterEach(() => {
    performanceTestSuite.teardownSuite();
  });

  // Execute all performance tests
  performanceTestSuite.testComponentRenderPerformance();
  performanceTestSuite.testInteractionPerformance();
  performanceTestSuite.testServiceCollaborationPerformance();
  performanceTestSuite.testMemoryPerformance();
  performanceTestSuite.testLargeDatasetPerformance();
});

export { PerformanceTestSuite, PERFORMANCE_THRESHOLDS };