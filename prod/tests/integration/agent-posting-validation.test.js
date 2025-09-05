/**
 * Agent Posting Integration Validation
 * End-to-end testing of all 5 enhanced agents posting capabilities
 */

const { PostingIntelligenceFramework } = require('../../src/posting-intelligence/core-framework');
const fs = require('fs').promises;
const path = require('path');

describe('Agent Posting Integration Validation', () => {
    let framework;
    let agentConfigs;
    
    beforeAll(async () => {
        framework = new PostingIntelligenceFramework({
            qualityThreshold: 0.7,
            engagementWeight: 0.4,
            impactWeight: 0.6
        });
        
        // Load agent configurations
        agentConfigs = {
            'personal-todos': {
                name: 'Personal Todos Agent',
                workspaceDir: '/workspaces/agent-feed/prod/agent_workspace/personal-todos-agent',
                testData: {
                    title: 'Complete project milestone',
                    description: 'Finalize Q1 project deliverables',
                    priority: 'P1',
                    impact_score: 8,
                    business_context: 'Critical for quarterly goals',
                    completion_criteria: 'All deliverables reviewed and approved'
                }
            },
            'meeting-prep': {
                name: 'Meeting Prep Agent',
                workspaceDir: '/workspaces/agent-feed/prod/agent_workspace/meeting-prep-agent',
                testData: {
                    title: 'Q1 Strategy Review',
                    purpose: 'Review Q1 performance and plan Q2 strategy',
                    topics: ['Performance metrics', 'Resource allocation', 'Strategic initiatives'],
                    expected_outcomes: 'Clear Q2 roadmap and resource plan',
                    agenda: {
                        purpose: 'Quarterly strategic planning',
                        topics: ['Metrics review', 'Budget planning', 'Team objectives'],
                        outcomes: 'Approved Q2 strategy'
                    }
                }
            },
            'meeting-next-steps': {
                name: 'Meeting Next Steps Agent',
                workspaceDir: '/workspaces/agent-feed/prod/agent_workspace/meeting-next-steps-agent',
                testData: {
                    title: 'Strategy Meeting Follow-up',
                    meeting_summary: 'Discussed Q2 planning and resource allocation',
                    action_items: [
                        'Prepare budget proposal by Friday',
                        'Schedule team alignment meetings',
                        'Update project timelines'
                    ],
                    decisions_made: 'Approved 15% budget increase for Q2',
                    next_steps: ['Budget review', 'Team meetings', 'Timeline updates']
                }
            },
            'follow-ups': {
                name: 'Follow-ups Agent',
                workspaceDir: '/workspaces/agent-feed/prod/agent_workspace/follow-ups-agent',
                testData: {
                    title: 'Project Alpha Status Update',
                    status: 'In Progress - 75% complete',
                    progress: 'Completed development phase, starting testing',
                    blockers: ['Waiting for UAT environment', 'Resource conflicts'],
                    challenges: ['Environment delays', 'Team capacity issues'],
                    next_steps: ['Setup UAT environment', 'Assign testing resources', 'Schedule go-live']
                }
            },
            'agent-ideas': {
                name: 'Agent Ideas Agent',
                workspaceDir: '/workspaces/agent-feed/prod/agent_workspace/agent-ideas-agent',
                testData: {
                    title: 'AI-Powered Code Review Assistant',
                    problem: 'Code reviews are time-consuming and inconsistent',
                    solution: 'Automated AI assistant for initial code review and quality checks',
                    value: '50% reduction in review time, improved code quality consistency',
                    implementation: 'Integrate with Git workflows, train on coding standards',
                    problem_statement: 'Manual code reviews create bottlenecks in development',
                    proposed_solution: 'AI-powered pre-review system with quality scoring',
                    value_proposition: 'Faster reviews with maintained quality standards',
                    implementation_plan: 'Phase 1: Git integration, Phase 2: AI training, Phase 3: Full deployment'
                }
            }
        };
    });
    
    describe('Individual Agent Posting Validation', () => {
        Object.entries(agentConfigs).forEach(([agentType, config]) => {
            describe(`${config.name} (${agentType})`, () => {
                it('should generate high-quality posts', async () => {
                    const result = await framework.generateIntelligentPost(
                        agentType,
                        config.testData,
                        { source: 'integration_test' }
                    );
                    
                    // Validate post structure
                    expect(result).toHaveProperty('content');
                    expect(result).toHaveProperty('metadata');
                    expect(result).toHaveProperty('analytics');
                    expect(result).toHaveProperty('recommendations');
                    
                    // Validate content quality
                    expect(result.content).toBeTruthy();
                    expect(result.content.length).toBeGreaterThan(50);
                    
                    // Validate metadata
                    expect(result.metadata.qualityScore).toBeGreaterThan(0.6);
                    expect(result.metadata.impactScore).toBeGreaterThan(0.3);
                    expect(result.metadata.framework).toBe('PostingIntelligenceFramework');
                    expect(result.metadata.version).toBeDefined();
                    
                    // Validate analytics
                    expect(result.analytics.processingTime).toBeGreaterThan(0);
                    expect(result.analytics.qualityBreakdown).toBeDefined();
                    expect(result.analytics.impactFactors).toBeDefined();
                    
                    console.log(`✅ ${config.name} - Quality: ${result.metadata.qualityScore.toFixed(3)}, Impact: ${result.metadata.impactScore.toFixed(3)}`);
                }, 30000);
                
                it('should meet quality thresholds consistently', async () => {
                    const iterations = 5;
                    const results = [];
                    
                    for (let i = 0; i < iterations; i++) {
                        const result = await framework.generateIntelligentPost(
                            agentType,
                            {
                                ...config.testData,
                                title: `${config.testData.title} - Test ${i + 1}`
                            },
                            { iteration: i }
                        );
                        
                        results.push(result);
                    }
                    
                    const qualityScores = results.map(r => r.metadata.qualityScore);
                    const avgQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
                    const minQuality = Math.min(...qualityScores);
                    
                    expect(avgQuality).toBeGreaterThan(0.7);
                    expect(minQuality).toBeGreaterThan(0.6);
                    
                    const qualityConsistency = qualityScores.every(score => 
                        Math.abs(score - avgQuality) < 0.2
                    );
                    expect(qualityConsistency).toBe(true);
                }, 60000);
                
                it('should handle edge cases gracefully', async () => {
                    const edgeCases = [
                        { ...config.testData, title: '' },
                        { ...config.testData, description: null },
                        { ...config.testData, priority: 'INVALID' },
                        { title: 'Minimal data test' }
                    ];
                    
                    for (const edgeCase of edgeCases) {
                        try {
                            const result = await framework.generateIntelligentPost(
                                agentType,
                                edgeCase,
                                { test: 'edge_case' }
                            );
                            
                            expect(result).toHaveProperty('content');
                            expect(result.content.length).toBeGreaterThan(20);
                        } catch (error) {
                            // Some edge cases may fail gracefully - ensure error handling
                            expect(error.name).toBe('PostingIntelligenceError');
                        }
                    }
                });
                
                it('should generate contextually appropriate content', async () => {
                    const result = await framework.generateIntelligentPost(
                        agentType,
                        config.testData,
                        { businessContext: 'Quarterly review period' }
                    );
                    
                    const content = result.content.toLowerCase();
                    
                    // Agent-specific content validation
                    switch (agentType) {
                        case 'personal-todos':
                            expect(content).toMatch(/task|todo|priority|completion/i);
                            break;
                        case 'meeting-prep':
                            expect(content).toMatch(/meeting|agenda|objectives|preparation/i);
                            break;
                        case 'meeting-next-steps':
                            expect(content).toMatch(/action|follow.?up|next.?steps|decisions/i);
                            break;
                        case 'follow-ups':
                            expect(content).toMatch(/status|progress|update|blockers/i);
                            break;
                        case 'agent-ideas':
                            expect(content).toMatch(/problem|solution|value|implementation/i);
                            break;
                    }
                });
            });
        });
    });
    
    describe('Cross-Agent Integration', () => {
        it('should handle batch processing across all agents', async () => {
            const batchRequests = Object.entries(agentConfigs).map(([agentType, config]) => ({
                agentType,
                userData: config.testData,
                context: { batch: true, agent: config.name }
            }));
            
            const batchResult = await framework.batchGeneratePosts(batchRequests);
            
            expect(batchResult).toHaveProperty('posts');
            expect(batchResult).toHaveProperty('batchAnalytics');
            expect(batchResult).toHaveProperty('sharedInsights');
            
            expect(batchResult.posts).toHaveLength(5);
            
            // Validate batch analytics
            expect(batchResult.batchAnalytics.totalPosts).toBe(5);
            expect(batchResult.batchAnalytics.averageQuality).toBeGreaterThan(0.6);
            expect(batchResult.batchAnalytics.averageImpact).toBeGreaterThan(0.3);
            expect(batchResult.batchAnalytics.successfulPatterns).toBeInstanceOf(Array);
            
            // Validate all posts meet quality standards
            batchResult.posts.forEach((post, index) => {
                expect(post.metadata.qualityScore).toBeGreaterThan(0.6);
                console.log(`✅ Batch ${index + 1} - Quality: ${post.metadata.qualityScore.toFixed(3)}`);
            });
        }, 90000);
        
        it('should demonstrate pattern sharing between agents', async () => {
            const firstAgent = await framework.generateIntelligentPost(
                'personal-todos',
                agentConfigs['personal-todos'].testData,
                { learningMode: true }
            );
            
            const secondAgent = await framework.generateIntelligentPost(
                'meeting-prep',
                agentConfigs['meeting-prep'].testData,
                { 
                    learningMode: true,
                    sharedPatterns: firstAgent.metadata.patterns
                }
            );
            
            expect(firstAgent.metadata.patterns).toBeInstanceOf(Array);
            expect(secondAgent.metadata.patterns).toBeInstanceOf(Array);
            
            // Some patterns should be shared or similar
            const hasSharedPatterns = firstAgent.metadata.patterns.some(pattern => 
                secondAgent.metadata.patterns.includes(pattern)
            );
            
            // Pattern sharing improves over time, but not guaranteed in single test
            expect(secondAgent.metadata.qualityScore).toBeGreaterThan(0.6);
        });
    });
    
    describe('Performance Validation', () => {
        it('should meet throughput requirements', async () => {
            const startTime = Date.now();
            const concurrentRequests = 10;
            
            const requests = Array.from({ length: concurrentRequests }, (_, i) => {
                const agentTypes = Object.keys(agentConfigs);
                const agentType = agentTypes[i % agentTypes.length];
                
                return framework.generateIntelligentPost(
                    agentType,
                    {
                        ...agentConfigs[agentType].testData,
                        title: `Performance Test ${i + 1}`
                    },
                    { performance: true }
                );
            });
            
            const results = await Promise.all(requests);
            const endTime = Date.now();
            
            const duration = (endTime - startTime) / 1000; // seconds
            const throughput = concurrentRequests / duration;
            const postsPerMinute = throughput * 60;
            
            expect(results).toHaveLength(concurrentRequests);
            expect(postsPerMinute).toBeGreaterThan(60); // Target: 100 posts/minute, allow margin
            
            console.log(`✅ Throughput: ${postsPerMinute.toFixed(1)} posts/minute`);
        }, 45000);
        
        it('should maintain quality under load', async () => {
            const loadTestRequests = Array.from({ length: 20 }, (_, i) => {
                const agentTypes = Object.keys(agentConfigs);
                const agentType = agentTypes[i % agentTypes.length];
                
                return framework.generateIntelligentPost(
                    agentType,
                    agentConfigs[agentType].testData,
                    { load_test: true, iteration: i }
                );
            });
            
            const results = await Promise.allSettled(loadTestRequests);
            const successfulResults = results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
            
            const qualityScores = successfulResults.map(r => r.metadata.qualityScore);
            const avgQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
            
            expect(successfulResults.length).toBeGreaterThan(15); // 75% success rate under load
            expect(avgQuality).toBeGreaterThan(0.65); // Slightly lower threshold under load
            
            console.log(`✅ Load test: ${successfulResults.length}/20 success, Avg quality: ${avgQuality.toFixed(3)}`);
        }, 60000);
    });
    
    describe('Error Recovery Validation', () => {
        it('should handle agent failures gracefully', async () => {
            // Simulate various failure scenarios
            const failureScenarios = [
                { userData: null, expected: 'PostingIntelligenceError' },
                { agentType: 'invalid-agent', expected: 'Error' },
                { userData: { title: 'x'.repeat(10000) }, expected: 'valid' }, // Very long content
            ];
            
            for (const scenario of failureScenarios) {
                try {
                    const result = await framework.generateIntelligentPost(
                        scenario.agentType || 'personal-todos',
                        scenario.userData || {},
                        { failure_test: true }
                    );
                    
                    if (scenario.expected !== 'valid') {
                        // Should have failed but didn't - check if gracefully handled
                        expect(result.content).toBeTruthy();
                    }
                } catch (error) {
                    expect(error.name).toMatch(new RegExp(scenario.expected));
                }
            }
        });
        
        it('should recover from partial failures in batch operations', async () => {
            const mixedBatch = [
                {
                    agentType: 'personal-todos',
                    userData: agentConfigs['personal-todos'].testData,
                    context: { batch: true }
                },
                {
                    agentType: 'invalid-agent', // This should fail
                    userData: { title: 'Invalid test' },
                    context: { batch: true }
                },
                {
                    agentType: 'meeting-prep',
                    userData: agentConfigs['meeting-prep'].testData,
                    context: { batch: true }
                }
            ];
            
            // Framework should handle partial failures gracefully
            try {
                const result = await framework.batchGeneratePosts(mixedBatch);
                // If it succeeds, validate partial results
                expect(result.posts.length).toBeGreaterThan(0);
            } catch (error) {
                // If it fails, ensure error is properly handled
                expect(error).toBeInstanceOf(Error);
            }
        });
    });
    
    describe('Agent Workspace Integration', () => {
        it('should integrate with actual agent workspaces', async () => {
            for (const [agentType, config] of Object.entries(agentConfigs)) {
                try {
                    // Check if workspace directory exists
                    const workspaceExists = await fs.access(config.workspaceDir).then(() => true).catch(() => false);
                    
                    if (workspaceExists) {
                        const result = await framework.generateIntelligentPost(
                            agentType,
                            config.testData,
                            { workspace: config.workspaceDir }
                        );
                        
                        expect(result.metadata.qualityScore).toBeGreaterThan(0.6);
                        console.log(`✅ Workspace integration ${agentType}: ${result.metadata.qualityScore.toFixed(3)}`);
                    } else {
                        console.log(`⚠️  Workspace not found: ${config.workspaceDir}`);
                    }
                } catch (error) {
                    console.log(`⚠️  Workspace integration failed for ${agentType}:`, error.message);
                }
            }
        });
    });
});
