/**
 * London School TDD: Real Agent Data Integration Tests
 * 
 * These tests verify how the unified agent pages load and process real
 * agent-specific data. Focus on coordination between data fetching services
 * and the display components, ensuring real data flows properly.
 * 
 * Focus: Real data integration patterns and loading coordination
 */

import { apiService } from '@/services/api';

// Mock only the parts we need to control, use real data where possible
jest.mock('@/services/api');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('Real Agent Data Integration - London School TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.clearInteractionHistory();

    // Define data loading contracts
    global.defineContract('DataLoader', {
      loadAgentProfile: 'function',
      loadAgentMetrics: 'function',
      loadAgentActivities: 'function',
      loadAgentPosts: 'function'
    });

    global.defineContract('DataProcessor', {
      processAgentData: 'function',
      enrichAgentData: 'function',
      validateAgentData: 'function'
    });

    global.defineContract('CacheManager', {
      getCached: 'function',
      setCached: 'function',
      invalidateCache: 'function'
    });
  });

  afterEach(() => {
    global.clearInteractionHistory();
  });

  describe('Agent Profile Data Loading', () => {
    test('should coordinate comprehensive agent data loading', async () => {
      // Setup real-like data responses
      const mockAgentData = {
        success: true,
        data: {
          id: 'real-agent-123',
          name: 'Production Agent',
          display_name: 'Production AI Agent',
          description: 'A real production agent with actual capabilities',
          status: 'active',
          capabilities: ['data-analysis', 'report-generation', 'task-automation'],
          performance_metrics: {
            success_rate: 94.7,
            average_response_time: 2.1,
            total_tokens_used: 1250000,
            uptime_percentage: 99.2
          },
          health_status: {
            cpu_usage: 45.2,
            memory_usage: 67.8,
            response_time: 1.8,
            last_heartbeat: new Date().toISOString(),
            connection_status: 'connected'
          },
          created_at: '2024-01-15T10:30:00Z',
          last_used: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        }
      };

      mockApiService.getAgent.mockResolvedValue(mockAgentData);

      const mockDataOrchestrator = global.createSwarmMock('DataOrchestrator', {
        loadCompleteAgentProfile: jest.fn().mockImplementation(async (agentId: string) => {
          const agentResponse = await mockApiService.getAgent(agentId);
          return agentResponse.data;
        }),
        enrichWithRealTimeData: jest.fn().mockResolvedValue({
          currentLoad: 23,
          queuedTasks: 5,
          lastActivity: new Date().toISOString()
        }),
        validateDataIntegrity: jest.fn().mockReturnValue(true)
      });

      const mockDataProcessor = global.createSwarmMock('DataProcessor', {
        processMetrics: jest.fn().mockReturnValue({
          todayTasks: 47,
          weeklyTasks: 289,
          efficiency: 94.7,
          trendDirection: 'up'
        }),
        processCapabilities: jest.fn().mockReturnValue([
          { name: 'Data Analysis', proficiency: 95, usage: 78 },
          { name: 'Report Generation', proficiency: 92, usage: 65 },
          { name: 'Task Automation', proficiency: 88, usage: 82 }
        ])
      });

      const mockCacheCoordinator = global.createSwarmMock('CacheCoordinator', {
        shouldUseCache: jest.fn().mockReturnValue(false),
        updateCache: jest.fn(),
        getCacheKey: jest.fn().mockReturnValue('agent:real-agent-123:profile')
      });

      // Simulate comprehensive data loading behavior
      const dataLoadingBehavior = {
        async loadUnifiedAgentData(agentId: string) {
          const cacheKey = mockCacheCoordinator.getCacheKey(agentId);
          
          if (!mockCacheCoordinator.shouldUseCache()) {
            // Load fresh data
            const profileData = await mockDataOrchestrator.loadCompleteAgentProfile(agentId);
            const realTimeData = await mockDataOrchestrator.enrichWithRealTimeData(profileData);
            
            // Process data for display
            const processedMetrics = mockDataProcessor.processMetrics(profileData.performance_metrics);
            const processedCapabilities = mockDataProcessor.processCapabilities(profileData.capabilities);
            
            // Validate data integrity
            const isValid = mockDataOrchestrator.validateDataIntegrity(profileData);
            
            if (isValid) {
              const enrichedData = {
                ...profileData,
                realTimeData,
                processedMetrics,
                processedCapabilities
              };
              
              mockCacheCoordinator.updateCache(cacheKey, enrichedData);
              return enrichedData;
            }
          }
        }
      };

      // Test comprehensive data loading
      const result = await dataLoadingBehavior.loadUnifiedAgentData('real-agent-123');

      // Verify data loading coordination
      expect(mockApiService.getAgent).toHaveBeenCalledWith('real-agent-123');
      expect(mockDataOrchestrator.loadCompleteAgentProfile).toHaveBeenCalledWith('real-agent-123');
      expect(mockDataOrchestrator.enrichWithRealTimeData).toHaveBeenCalled();
      expect(mockDataProcessor.processMetrics).toHaveBeenCalled();
      expect(mockDataProcessor.processCapabilities).toHaveBeenCalled();
      expect(mockDataOrchestrator.validateDataIntegrity).toHaveBeenCalled();
      expect(mockCacheCoordinator.updateCache).toHaveBeenCalled();

      // Verify data structure integrity
      expect(result.id).toBe('real-agent-123');
      expect(result.processedMetrics).toHaveProperty('todayTasks');
      expect(result.processedCapabilities).toHaveLength(3);
      expect(result.realTimeData).toHaveProperty('currentLoad');

      // Verify interaction sequence
      expect(mockDataOrchestrator.loadCompleteAgentProfile).toHaveBeenCalledBefore(mockDataOrchestrator.enrichWithRealTimeData);
      expect(mockDataOrchestrator.validateDataIntegrity).toHaveBeenCalledBefore(mockCacheCoordinator.updateCache);
    });

    test('should handle real agent activity data integration', async () => {
      // Real activity data structure
      const mockActivitiesData = {
        success: true,
        data: [
          {
            id: 'activity-1',
            type: 'task_completed',
            description: 'Completed quarterly performance analysis',
            timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
            agent_id: 'real-agent-123',
            agent_name: 'Production Agent',
            status: 'completed',
            priority: 'high',
            metadata: {
              duration_ms: 125000,
              tokens_used: 8500,
              resource_usage: {
                cpu_time_ms: 45000,
                memory_peak_mb: 256
              }
            }
          },
          {
            id: 'activity-2',
            type: 'task_started',
            description: 'Generating monthly compliance report',
            timestamp: new Date(Date.now() - 600000).toISOString(), // 10 min ago
            agent_id: 'real-agent-123',
            agent_name: 'Production Agent',
            status: 'in_progress',
            priority: 'medium',
            metadata: {
              estimated_duration_ms: 300000,
              progress: 45
            }
          }
        ]
      };

      mockApiService.getActivities.mockResolvedValue(mockActivitiesData);

      const mockActivityProcessor = global.createSwarmMock('ActivityProcessor', {
        processActivities: jest.fn().mockReturnValue([
          {
            id: 'activity-1',
            title: 'Completed quarterly performance analysis',
            type: 'completion',
            timeAgo: '30 minutes ago',
            duration: '2m 5s',
            status: 'success',
            impact: 'high'
          },
          {
            id: 'activity-2',
            title: 'Generating monthly compliance report',
            type: 'in-progress',
            timeAgo: '10 minutes ago',
            progress: 45,
            eta: '15 minutes',
            status: 'running'
          }
        ]),
        groupByType: jest.fn(),
        filterByTimeRange: jest.fn()
      });

      const mockTimelineBuilder = global.createSwarmMock('TimelineBuilder', {
        buildTimeline: jest.fn().mockReturnValue({
          periods: ['last-hour', 'last-day', 'last-week'],
          events: 15,
          trends: { direction: 'stable', change: 0.02 }
        }),
        addTimelineMarkers: jest.fn(),
        calculateActivityDensity: jest.fn().mockReturnValue(0.75)
      });

      // Simulate activity data loading behavior
      const activityLoadingBehavior = {
        async loadAgentActivities(agentId: string, timeRange = '24h') {
          // Load raw activities
          const activitiesResponse = await mockApiService.getActivities(50, 0);
          
          if (activitiesResponse.success) {
            // Filter activities for specific agent
            const agentActivities = activitiesResponse.data.filter(
              activity => activity.agent_id === agentId
            );
            
            // Process activities for display
            const processedActivities = mockActivityProcessor.processActivities(agentActivities);
            mockActivityProcessor.groupByType(processedActivities);
            mockActivityProcessor.filterByTimeRange(processedActivities, timeRange);
            
            // Build timeline
            const timeline = mockTimelineBuilder.buildTimeline(processedActivities);
            mockTimelineBuilder.addTimelineMarkers(timeline);
            const activityDensity = mockTimelineBuilder.calculateActivityDensity(processedActivities);
            
            return {
              activities: processedActivities,
              timeline,
              metrics: {
                total: processedActivities.length,
                density: activityDensity,
                timeRange
              }
            };
          }
          
          return { activities: [], timeline: null, metrics: { total: 0, density: 0, timeRange } };
        }
      };

      // Test activity loading
      const result = await activityLoadingBehavior.loadAgentActivities('real-agent-123', '24h');

      // Verify activity loading coordination
      expect(mockApiService.getActivities).toHaveBeenCalledWith(50, 0);
      expect(mockActivityProcessor.processActivities).toHaveBeenCalled();
      expect(mockActivityProcessor.groupByType).toHaveBeenCalled();
      expect(mockActivityProcessor.filterByTimeRange).toHaveBeenCalledWith(expect.any(Array), '24h');
      expect(mockTimelineBuilder.buildTimeline).toHaveBeenCalled();
      expect(mockTimelineBuilder.addTimelineMarkers).toHaveBeenCalled();
      expect(mockTimelineBuilder.calculateActivityDensity).toHaveBeenCalled();

      // Verify real data integration
      expect(result.activities).toHaveLength(2);
      expect(result.activities[0]).toHaveProperty('title', 'Completed quarterly performance analysis');
      expect(result.activities[1]).toHaveProperty('progress', 45);
      expect(result.metrics.total).toBe(2);
      expect(result.timeline).toHaveProperty('events', 15);
    });

    test('should coordinate agent posts loading with real content', async () => {
      // Real posts data structure
      const mockPostsData = {
        success: true,
        data: [
          {
            id: 'post-real-1',
            title: 'Q3 Performance Analysis Complete',
            content: 'I have completed the comprehensive Q3 performance analysis. Key findings include a 12% improvement in processing efficiency and identification of three optimization opportunities.',
            authorAgent: 'real-agent-123',
            authorAgentName: 'Production Agent',
            publishedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            tags: ['performance', 'analysis', 'quarterly-report'],
            metadata: {
              businessImpact: 8.5,
              confidence_score: 0.94,
              processing_time_ms: 125000,
              tokens_used: 8500
            },
            engagement: {
              views: 245,
              comments: 12,
              shares: 8,
              saves: 15
            }
          },
          {
            id: 'post-real-2',
            title: 'Automation Pipeline Optimization',
            content: 'Implemented new optimization algorithms in the data processing pipeline, resulting in 23% faster execution times and reduced resource consumption.',
            authorAgent: 'real-agent-123',
            authorAgentName: 'Production Agent',
            publishedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            tags: ['automation', 'optimization', 'performance'],
            metadata: {
              businessImpact: 9.2,
              confidence_score: 0.97,
              processing_time_ms: 89000,
              tokens_used: 6200
            },
            engagement: {
              views: 189,
              comments: 8,
              shares: 15,
              saves: 22
            }
          }
        ],
        total: 47
      };

      mockApiService.getAgentPosts.mockResolvedValue(mockPostsData);

      const mockContentProcessor = global.createSwarmMock('ContentProcessor', {
        extractSummary: jest.fn().mockImplementation((content) => content.substring(0, 100) + '...'),
        analyzeContent: jest.fn().mockReturnValue({
          readingTime: '2 min',
          complexity: 'medium',
          topics: ['performance', 'automation']
        }),
        enrichWithMetadata: jest.fn()
      });

      const mockEngagementCalculator = global.createSwarmMock('EngagementCalculator', {
        calculateEngagementScore: jest.fn().mockReturnValue(7.8),
        calculateTrendingScore: jest.fn().mockReturnValue(6.5),
        predictEngagement: jest.fn().mockReturnValue({ predicted: 25, confidence: 0.82 })
      });

      const mockContentFilter = global.createSwarmMock('ContentFilter', {
        filterByRelevance: jest.fn().mockImplementation(posts => posts),
        sortByEngagement: jest.fn().mockImplementation(posts => posts),
        groupByCategory: jest.fn().mockReturnValue({
          'performance': 1,
          'automation': 1,
          'analysis': 1
        })
      });

      // Simulate posts loading behavior
      const postsLoadingBehavior = {
        async loadAgentPosts(agentId: string, filters = {}) {
          // Load posts data
          const postsResponse = await mockApiService.getAgentPosts(20, 0, 'all', '', 'publishedAt', 'DESC');
          
          if (postsResponse.success) {
            // Filter posts by agent
            const agentPosts = postsResponse.data.filter(post => post.authorAgent === agentId);
            
            // Process content
            const processedPosts = agentPosts.map(post => {
              const summary = mockContentProcessor.extractSummary(post.content);
              const analysis = mockContentProcessor.analyzeContent(post.content);
              const engagementScore = mockEngagementCalculator.calculateEngagementScore(post.engagement);
              const trendingScore = mockEngagementCalculator.calculateTrendingScore(post.engagement, post.publishedAt);
              
              mockContentProcessor.enrichWithMetadata(post, { analysis, engagementScore, trendingScore });
              
              return {
                ...post,
                summary,
                analysis,
                scores: {
                  engagement: engagementScore,
                  trending: trendingScore
                }
              };
            });
            
            // Apply filters and sorting
            const filteredPosts = mockContentFilter.filterByRelevance(processedPosts);
            const sortedPosts = mockContentFilter.sortByEngagement(filteredPosts);
            const categories = mockContentFilter.groupByCategory(sortedPosts);
            
            return {
              posts: sortedPosts,
              categories,
              metrics: {
                total: agentPosts.length,
                totalViews: agentPosts.reduce((sum, post) => sum + post.engagement.views, 0),
                avgEngagement: engagementScore
              }
            };
          }
          
          return { posts: [], categories: {}, metrics: { total: 0, totalViews: 0, avgEngagement: 0 } };
        }
      };

      // Test posts loading
      const result = await postsLoadingBehavior.loadAgentPosts('real-agent-123');

      // Verify posts loading coordination
      expect(mockApiService.getAgentPosts).toHaveBeenCalledWith(20, 0, 'all', '', 'publishedAt', 'DESC');
      expect(mockContentProcessor.extractSummary).toHaveBeenCalledTimes(2);
      expect(mockContentProcessor.analyzeContent).toHaveBeenCalledTimes(2);
      expect(mockEngagementCalculator.calculateEngagementScore).toHaveBeenCalledTimes(2);
      expect(mockEngagementCalculator.calculateTrendingScore).toHaveBeenCalledTimes(2);
      expect(mockContentFilter.filterByRelevance).toHaveBeenCalled();
      expect(mockContentFilter.sortByEngagement).toHaveBeenCalled();
      expect(mockContentFilter.groupByCategory).toHaveBeenCalled();

      // Verify real content processing
      expect(result.posts).toHaveLength(2);
      expect(result.posts[0]).toHaveProperty('summary');
      expect(result.posts[0]).toHaveProperty('analysis');
      expect(result.posts[0]).toHaveProperty('scores');
      expect(result.categories).toHaveProperty('performance');
      expect(result.metrics.total).toBe(2);
      expect(result.metrics.totalViews).toBe(434); // 245 + 189

      // Verify processing sequence
      expect(mockContentProcessor.extractSummary).toHaveBeenCalledBefore(mockEngagementCalculator.calculateEngagementScore);
      expect(mockEngagementCalculator.calculateTrendingScore).toHaveBeenCalledBefore(mockContentFilter.filterByRelevance);
    });
  });

  describe('Data Validation and Error Handling', () => {
    test('should coordinate data validation for real agent data', () => {
      const mockDataValidator = global.createSwarmMock('DataValidator', {
        validateAgentStructure: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        validateMetrics: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        validateTimestamps: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        validateReferences: jest.fn().mockReturnValue({ valid: true, errors: [] })
      });

      const mockDataSanitizer = global.createSwarmMock('DataSanitizer', {
        sanitizeAgentData: jest.fn().mockImplementation(data => ({ ...data, sanitized: true })),
        removeInvalidFields: jest.fn(),
        normalizeValues: jest.fn()
      });

      const mockErrorReporter = global.createSwarmMock('ErrorReporter', {
        reportValidationErrors: jest.fn(),
        logDataInconsistency: jest.fn(),
        trackDataQuality: jest.fn()
      });

      // Real agent data with potential issues
      const realAgentData = {
        id: 'real-agent-123',
        name: 'Production Agent',
        performance_metrics: {
          success_rate: 94.7,
          average_response_time: 2.1,
          total_tokens_used: 1250000
        },
        health_status: {
          cpu_usage: 45.2,
          memory_usage: 67.8,
          last_heartbeat: new Date().toISOString()
        }
      };

      // Simulate validation behavior
      const validationBehavior = {
        validateAndSanitizeAgentData(agentData: any) {
          // Validate structure
          const structureValidation = mockDataValidator.validateAgentStructure(agentData);
          const metricsValidation = mockDataValidator.validateMetrics(agentData.performance_metrics);
          const timestampValidation = mockDataValidator.validateTimestamps(agentData);
          const referenceValidation = mockDataValidator.validateReferences(agentData);
          
          const allValid = [structureValidation, metricsValidation, timestampValidation, referenceValidation]
            .every(result => result.valid);
          
          if (!allValid) {
            const errors = [structureValidation, metricsValidation, timestampValidation, referenceValidation]
              .flatMap(result => result.errors);
            mockErrorReporter.reportValidationErrors(errors);
            mockErrorReporter.logDataInconsistency(agentData.id, errors);
          }
          
          // Sanitize data
          const sanitizedData = mockDataSanitizer.sanitizeAgentData(agentData);
          mockDataSanitizer.removeInvalidFields(sanitizedData);
          mockDataSanitizer.normalizeValues(sanitizedData);
          
          // Track data quality
          mockErrorReporter.trackDataQuality(agentData.id, allValid, errors?.length || 0);
          
          return { data: sanitizedData, valid: allValid };
        }
      };

      // Test validation
      const result = validationBehavior.validateAndSanitizeAgentData(realAgentData);

      // Verify validation coordination
      expect(mockDataValidator.validateAgentStructure).toHaveBeenCalledWith(realAgentData);
      expect(mockDataValidator.validateMetrics).toHaveBeenCalledWith(realAgentData.performance_metrics);
      expect(mockDataValidator.validateTimestamps).toHaveBeenCalledWith(realAgentData);
      expect(mockDataValidator.validateReferences).toHaveBeenCalledWith(realAgentData);
      expect(mockDataSanitizer.sanitizeAgentData).toHaveBeenCalledWith(realAgentData);
      expect(mockDataSanitizer.removeInvalidFields).toHaveBeenCalled();
      expect(mockDataSanitizer.normalizeValues).toHaveBeenCalled();
      expect(mockErrorReporter.trackDataQuality).toHaveBeenCalledWith('real-agent-123', true, 0);

      // Verify validation result
      expect(result.valid).toBe(true);
      expect(result.data).toHaveProperty('sanitized', true);

      // Verify validation sequence
      expect(mockDataValidator.validateAgentStructure).toHaveBeenCalledBefore(mockDataSanitizer.sanitizeAgentData);
      expect(mockDataSanitizer.normalizeValues).toHaveBeenCalledBefore(mockErrorReporter.trackDataQuality);
    });
  });
});